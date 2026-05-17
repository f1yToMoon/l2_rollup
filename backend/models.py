from typing import Optional
from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    address: str
    public_key: str  # hex-encoded Ed25519 public key
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    address: str
    telegram_id: Optional[int]
    username: Optional[str]
    avatar_url: Optional[str]
    off_chain_balance: int
    nonce: int


class DepositConfirm(BaseModel):
    address: str
    amount: int  # in nanotons
    tx_hash: str  # on-chain transaction hash


class TransferRequest(BaseModel):
    sender: str
    receiver: str
    amount: int = Field(gt=0, description="Amount in nanotons")
    nonce: int
    signature: str  # hex-encoded Ed25519 signature


class TransferResponse(BaseModel):
    id: int
    sender: str
    receiver: str
    amount: int
    timestamp: int
    sender_balance: int
    receiver_balance: int


class WithdrawRequest(BaseModel):
    address: str
    amount: int = Field(gt=0, description="Amount in nanotons")
    signature: str  # signs: address + ":" + amount


class WithdrawResponse(BaseModel):
    withdrawal_id: int
    address: str
    amount: int
    message: str


class TxRecord(BaseModel):
    id: int
    sender: str
    receiver: str
    amount: int
    timestamp: int
    batch_id: Optional[int]


class BatchRecord(BaseModel):
    id: int
    state_root: str
    tx_count: int
    total_volume: int
    settled_at: Optional[int]
    tx_hash: Optional[str]


class BatchDetail(BaseModel):
    batch: BatchRecord
    transactions: list[TxRecord]
    balances: dict[str, int]  # address -> balance snapshot


class VerifyResult(BaseModel):
    batch_id: int
    stored_state_root: str
    computed_state_root: str
    match: bool
    balances: dict[str, int]


class SettleRequest(BaseModel):
    operator_key: str  # simple auth for demo; use JWT in production


class Stats(BaseModel):
    total_off_chain_tx: int
    total_on_chain_settlements: int
    compression_ratio: float  # off-chain / on-chain
    total_volume_nanotons: int
    estimated_gas_saved_nanotons: int
    pending_tx_count: int
