import os
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from auth import build_transfer_message, build_withdraw_message, verify_signature
from batch import form_and_settle_batch, get_all_batches, get_batch_detail, get_stats
from database import init_db
from models import (
    BatchDetail,
    BatchRecord,
    DepositConfirm,
    SettleRequest,
    Stats,
    TransferRequest,
    TransferResponse,
    TxRecord,
    UserRegister,
    UserResponse,
    VerifyResult,
    WithdrawRequest,
    WithdrawResponse,
)
from state import (
    add_withdrawal_request,
    compute_state_root,
    confirm_deposit,
    get_all_balances,
    get_balance,
    get_nonce,
    get_or_create_user,
    get_transaction_history,
    get_user,
    apply_transfer,
)
from ton_client import get_on_chain_state_root


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app = FastAPI(
    title="Mini Rollup API",
    description="Off-chain payment sequencer for Mini Rollup on TON",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= User endpoints =============

@app.post("/api/users/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(body: UserRegister):
    """Register a user and store their Ed25519 public key for signature verification."""
    user = await get_or_create_user(
        address=body.address,
        public_key=body.public_key,
        telegram_id=body.telegram_id,
        username=body.username,
        avatar_url=body.avatar_url,
    )
    return UserResponse(**user)


@app.get("/api/users/{address}", response_model=UserResponse)
async def get_user_info(address: str):
    user = await get_user(address)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


# ============= Balance & history =============

@app.get("/api/balance/{address}")
async def get_user_balance(address: str):
    balance = await get_balance(address)
    nonce = await get_nonce(address)
    return {"address": address, "off_chain_balance": balance, "nonce": nonce}


@app.get("/api/history/{address}", response_model=list[TxRecord])
async def get_history(address: str, limit: int = 50):
    txs = await get_transaction_history(address, limit)
    return [TxRecord(**tx) for tx in txs]


# ============= Deposit =============

@app.post("/api/deposit/confirm")
async def deposit_confirm(body: DepositConfirm):
    """
    Called after a user's Deposit transaction is confirmed on-chain.
    The frontend should call this after TON Connect confirms the transaction.
    """
    new_balance = await confirm_deposit(body.address, body.amount, body.tx_hash)
    return {
        "address": body.address,
        "credited_amount": body.amount,
        "new_off_chain_balance": new_balance,
    }


# ============= Off-chain transfer =============

@app.post("/api/transfer", response_model=TransferResponse)
async def transfer(body: TransferRequest):
    """
    Execute an off-chain transfer. No on-chain transaction is created.
    The transfer is memoized by the sequencer and included in the next batch.
    """
    user = await get_user(body.sender)
    if not user:
        raise HTTPException(status_code=404, detail="Sender not registered")
    if not user.get("public_key"):
        raise HTTPException(status_code=400, detail="Sender has no registered public key")

    # Verify Ed25519 signature
    message = build_transfer_message(body.sender, body.receiver, body.amount, body.nonce)
    if not verify_signature(user["public_key"], message, body.signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        result = await apply_transfer(
            body.sender, body.receiver, body.amount, body.nonce, body.signature
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return TransferResponse(**result)


# ============= Withdrawal =============

@app.post("/api/withdraw/request", response_model=WithdrawResponse)
async def request_withdrawal(body: WithdrawRequest):
    """
    Request a withdrawal. The amount is deducted from off-chain balance and
    queued to be included in the next settlement batch.
    """
    user = await get_user(body.address)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    balance = await get_balance(body.address)
    if balance < body.amount:
        raise HTTPException(status_code=400, detail="Insufficient off-chain balance")

    # Verify signature (signs: address + amount)
    if user.get("public_key"):
        message = build_withdraw_message(body.address, body.amount)
        if not verify_signature(user["public_key"], message, body.signature):
            raise HTTPException(status_code=401, detail="Invalid withdrawal signature")

    withdrawal_id = await add_withdrawal_request(body.address, body.amount)

    return WithdrawResponse(
        withdrawal_id=withdrawal_id,
        address=body.address,
        amount=body.amount,
        message="Withdrawal queued — will be processed in the next settlement batch",
    )


# ============= Batches =============

@app.get("/api/batches", response_model=list[BatchRecord])
async def list_batches():
    batches = await get_all_batches()
    return [BatchRecord(**b) for b in batches]


@app.get("/api/batch/{batch_id}", response_model=BatchDetail)
async def get_batch(batch_id: int):
    detail = await get_batch_detail(batch_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Batch not found")
    return BatchDetail(
        batch=BatchRecord(**detail["batch"]),
        transactions=[TxRecord(**tx) for tx in detail["transactions"]],
        balances=detail["balances"],
    )


@app.get("/api/verify/{batch_id}", response_model=VerifyResult)
async def verify_batch(batch_id: int):
    """
    Return all data needed for client-side verification.
    The client recomputes the state root from the balance snapshot
    and compares it with the stored (and on-chain) value.
    """
    detail = await get_batch_detail(batch_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Batch not found")

    stored_root = detail["batch"]["state_root"]

    # Reconstruct cumulative balances up to this batch
    all_balances = await get_all_balances()
    computed_root = compute_state_root(all_balances)

    return VerifyResult(
        batch_id=batch_id,
        stored_state_root=stored_root,
        computed_state_root=computed_root,
        match=(stored_root == computed_root),
        balances=all_balances,
    )


# ============= Settlement (operator only) =============

@app.post("/api/settle")
async def settle_batch(body: SettleRequest):
    """
    Operator endpoint: collect all pending off-chain transactions into a batch
    and publish the state root on-chain via SettleBatch message.
    """
    # Simple auth: in production use JWT with operator private key
    expected_key = os.getenv("OPERATOR_API_KEY", "dev-operator-key")
    if body.operator_key != expected_key:
        raise HTTPException(status_code=403, detail="Unauthorized operator")

    result = await form_and_settle_batch()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# ============= Stats =============

@app.get("/api/stats", response_model=Stats)
async def get_statistics():
    return Stats(**(await get_stats()))


# ============= TON Connect manifest =============

@app.get("/tonconnect-manifest.json")
async def tonconnect_manifest(request: Request):
    base_url = str(request.base_url).rstrip("/")
    return {
        "url": base_url,
        "name": "Mini Rollup",
        "iconUrl": "https://ton.org/icons/ton_symbol.svg",
    }


# ============= Health =============

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": int(time.time())}
