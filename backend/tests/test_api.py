"""
Backend API tests.

Run with:
    cd backend
    pytest tests/ -v
"""

import asyncio
import os
import sys

# Set test DB BEFORE any app imports so database.py picks it up
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_mini_rollup.db"
os.environ["OPERATOR_API_KEY"] = "test-key"

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import nacl.signing
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Import after env vars are set
from database import init_db, engine, AsyncSessionLocal
from main import app

client = TestClient(app)


# ============= Helpers =============

def make_keypair():
    sk = nacl.signing.SigningKey.generate()
    return sk.encode().hex(), sk.verify_key.encode().hex()


def sign_transfer(private_hex: str, sender: str, receiver: str, amount: int, nonce: int) -> str:
    from auth import build_transfer_message
    msg = build_transfer_message(sender, receiver, amount, nonce)
    sk = nacl.signing.SigningKey(bytes.fromhex(private_hex))
    return sk.sign(msg).signature.hex()


def sign_withdraw(private_hex: str, address: str, amount: int) -> str:
    from auth import build_withdraw_message
    msg = build_withdraw_message(address, amount)
    sk = nacl.signing.SigningKey(bytes.fromhex(private_hex))
    return sk.sign(msg).signature.hex()


ALICE = "EQAlice000000000000000000000000000000000000000"
BOB   = "EQBob0000000000000000000000000000000000000000"


# ============= Fixtures =============

@pytest.fixture(autouse=True)
def clean_db():
    """Initialize and wipe all tables before each test."""
    async def _reset():
        await init_db()
        async with AsyncSessionLocal() as s:
            for tbl in ("withdrawals", "transactions", "batches", "users"):
                await s.execute(text(f"DELETE FROM {tbl}"))
            await s.commit()

    asyncio.get_event_loop().run_until_complete(_reset())
    yield
    # Remove test DB file after each test
    if os.path.exists("test_mini_rollup.db"):
        os.remove("test_mini_rollup.db")


# ============= Tests =============

def test_register_user():
    _, pub = make_keypair()
    resp = client.post("/api/users/register", json={
        "address": ALICE, "public_key": pub, "telegram_id": 123456, "username": "alice",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["address"] == ALICE
    assert data["off_chain_balance"] == 0


def test_deposit_confirm():
    _, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE, "public_key": pub})
    resp = client.post("/api/deposit/confirm", json={
        "address": ALICE, "amount": 10_000_000_000, "tx_hash": "abc123",
    })
    assert resp.status_code == 200
    assert resp.json()["new_off_chain_balance"] == 10_000_000_000


def test_get_balance():
    _, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE, "public_key": pub})
    client.post("/api/deposit/confirm", json={"address": ALICE, "amount": 5_000_000_000, "tx_hash": "tx1"})
    resp = client.get(f"/api/balance/{ALICE}")
    assert resp.status_code == 200
    assert resp.json()["off_chain_balance"] == 5_000_000_000


def test_transfer_success():
    priv, pub = make_keypair()
    _, bob_pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE, "public_key": pub})
    client.post("/api/users/register", json={"address": BOB, "public_key": bob_pub})
    client.post("/api/deposit/confirm", json={"address": ALICE, "amount": 10_000_000_000, "tx_hash": "tx1"})

    amount = 3_000_000_000
    sig = sign_transfer(priv, ALICE, BOB, amount, 0)
    resp = client.post("/api/transfer", json={
        "sender": ALICE, "receiver": BOB, "amount": amount, "nonce": 0, "signature": sig,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["sender_balance"] == 7_000_000_000
    assert data["receiver_balance"] == 3_000_000_000


def test_transfer_insufficient_balance():
    priv, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE, "public_key": pub})
    client.post("/api/deposit/confirm", json={"address": ALICE, "amount": 1_000_000_000, "tx_hash": "tx1"})

    sig = sign_transfer(priv, ALICE, BOB, 5_000_000_000, 0)
    resp = client.post("/api/transfer", json={
        "sender": ALICE, "receiver": BOB, "amount": 5_000_000_000, "nonce": 0, "signature": sig,
    })
    assert resp.status_code == 400


def test_transfer_invalid_signature():
    _, pub = make_keypair()
    wrong_priv, _ = make_keypair()
    client.post("/api/users/register", json={"address": ALICE, "public_key": pub})
    client.post("/api/deposit/confirm", json={"address": ALICE, "amount": 10_000_000_000, "tx_hash": "tx1"})

    sig = sign_transfer(wrong_priv, ALICE, BOB, 1_000_000_000, 0)
    resp = client.post("/api/transfer", json={
        "sender": ALICE, "receiver": BOB, "amount": 1_000_000_000, "nonce": 0, "signature": sig,
    })
    assert resp.status_code == 401


def test_settle_batch():
    priv, pub = make_keypair()
    _, bob_pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE, "public_key": pub})
    client.post("/api/users/register", json={"address": BOB, "public_key": bob_pub})
    client.post("/api/deposit/confirm", json={"address": ALICE, "amount": 10_000_000_000, "tx_hash": "tx1"})

    sig = sign_transfer(priv, ALICE, BOB, 2_000_000_000, 0)
    client.post("/api/transfer", json={
        "sender": ALICE, "receiver": BOB, "amount": 2_000_000_000, "nonce": 0, "signature": sig,
    })

    resp = client.post("/api/settle", json={"operator_key": "test-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["tx_count"] == 1
    assert len(data["state_root"]) == 64


def test_verify_batch():
    priv, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE, "public_key": pub})
    client.post("/api/deposit/confirm", json={"address": ALICE, "amount": 5_000_000_000, "tx_hash": "tx1"})

    # Need at least one pending tx or withdrawal to settle
    sig = sign_transfer(priv, ALICE, BOB, 1_000_000_000, 0)
    client.post("/api/transfer", json={
        "sender": ALICE, "receiver": BOB, "amount": 1_000_000_000, "nonce": 0, "signature": sig,
    })

    settle_resp = client.post("/api/settle", json={"operator_key": "test-key"})
    batch_id = settle_resp.json()["batch_id"]

    resp = client.get(f"/api/verify/{batch_id}")
    assert resp.status_code == 200
    assert resp.json()["match"] is True


def test_state_root_determinism():
    from state import compute_state_root
    balances = {"EQB": 3_000_000_000, "EQA": 7_000_000_000, "EQC": 500_000_000}
    r1 = compute_state_root(balances)
    r2 = compute_state_root({"EQC": 500_000_000, "EQA": 7_000_000_000, "EQB": 3_000_000_000})
    assert r1 == r2
    assert len(r1) == 64


def test_withdraw_request():
    priv, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE, "public_key": pub})
    client.post("/api/deposit/confirm", json={"address": ALICE, "amount": 10_000_000_000, "tx_hash": "tx1"})

    sig = sign_withdraw(priv, ALICE, 4_000_000_000)
    resp = client.post("/api/withdraw/request", json={
        "address": ALICE, "amount": 4_000_000_000, "signature": sig,
    })
    assert resp.status_code == 200

    balance_resp = client.get(f"/api/balance/{ALICE}")
    assert balance_resp.json()["off_chain_balance"] == 6_000_000_000
