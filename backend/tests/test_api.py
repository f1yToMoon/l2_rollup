"""
Backend API tests.

Run with:
    cd backend
    pytest tests/ -v
"""

import hashlib
import json
import time

import nacl.signing
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Override DB for tests
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_mini_rollup.db"

from main import app

client = TestClient(app)


def make_keypair():
    """Generate a fresh Ed25519 keypair for testing."""
    signing_key = nacl.signing.SigningKey.generate()
    verify_key = signing_key.verify_key
    return (
        signing_key.encode().hex(),  # private key hex
        verify_key.encode().hex(),   # public key hex
    )


def sign_transfer(private_hex: str, sender: str, receiver: str, amount: int, nonce: int) -> str:
    from auth import build_transfer_message
    msg = build_transfer_message(sender, receiver, amount, nonce)
    sk = nacl.signing.SigningKey(bytes.fromhex(private_hex))
    sig = sk.sign(msg)
    return sig.signature.hex()


def sign_withdraw(private_hex: str, address: str, amount: int) -> str:
    from auth import build_withdraw_message
    msg = build_withdraw_message(address, amount)
    sk = nacl.signing.SigningKey(bytes.fromhex(private_hex))
    sig = sk.sign(msg)
    return sig.signature.hex()


ALICE_ADDR = "EQAlice000000000000000000000000000000000000000"
BOB_ADDR = "EQBob0000000000000000000000000000000000000000"


@pytest.fixture(autouse=True)
def setup_db():
    """Initialize database before each test."""
    import asyncio
    from database import init_db
    asyncio.get_event_loop().run_until_complete(init_db())
    yield
    # Cleanup
    if os.path.exists("test_mini_rollup.db"):
        os.remove("test_mini_rollup.db")


def test_register_user():
    _, pub = make_keypair()
    resp = client.post("/api/users/register", json={
        "address": ALICE_ADDR,
        "public_key": pub,
        "telegram_id": 123456,
        "username": "alice",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["address"] == ALICE_ADDR
    assert data["off_chain_balance"] == 0


def test_deposit_confirm():
    """After on-chain deposit, off-chain balance should be credited."""
    _, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE_ADDR, "public_key": pub})

    resp = client.post("/api/deposit/confirm", json={
        "address": ALICE_ADDR,
        "amount": 10_000_000_000,  # 10 TON
        "tx_hash": "abc123",
    })
    assert resp.status_code == 200
    assert resp.json()["new_off_chain_balance"] == 10_000_000_000


def test_get_balance():
    _, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE_ADDR, "public_key": pub})
    client.post("/api/deposit/confirm", json={
        "address": ALICE_ADDR, "amount": 5_000_000_000, "tx_hash": "tx1"
    })

    resp = client.get(f"/api/balance/{ALICE_ADDR}")
    assert resp.status_code == 200
    assert resp.json()["off_chain_balance"] == 5_000_000_000


def test_transfer_success():
    """Off-chain transfer: sender balance decreases, receiver increases."""
    priv, pub = make_keypair()
    _, bob_pub = make_keypair()

    client.post("/api/users/register", json={"address": ALICE_ADDR, "public_key": pub})
    client.post("/api/users/register", json={"address": BOB_ADDR, "public_key": bob_pub})
    client.post("/api/deposit/confirm", json={
        "address": ALICE_ADDR, "amount": 10_000_000_000, "tx_hash": "tx1"
    })

    amount = 3_000_000_000
    sig = sign_transfer(priv, ALICE_ADDR, BOB_ADDR, amount, 0)

    resp = client.post("/api/transfer", json={
        "sender": ALICE_ADDR,
        "receiver": BOB_ADDR,
        "amount": amount,
        "nonce": 0,
        "signature": sig,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["sender_balance"] == 7_000_000_000
    assert data["receiver_balance"] == 3_000_000_000


def test_transfer_insufficient_balance():
    """Transfer exceeding balance should return 400."""
    priv, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE_ADDR, "public_key": pub})
    client.post("/api/deposit/confirm", json={
        "address": ALICE_ADDR, "amount": 1_000_000_000, "tx_hash": "tx1"
    })

    sig = sign_transfer(priv, ALICE_ADDR, BOB_ADDR, 5_000_000_000, 0)
    resp = client.post("/api/transfer", json={
        "sender": ALICE_ADDR,
        "receiver": BOB_ADDR,
        "amount": 5_000_000_000,
        "nonce": 0,
        "signature": sig,
    })
    assert resp.status_code == 400


def test_transfer_invalid_signature():
    """Wrong signature should return 401."""
    _, pub = make_keypair()
    wrong_priv, _ = make_keypair()  # different key

    client.post("/api/users/register", json={"address": ALICE_ADDR, "public_key": pub})
    client.post("/api/deposit/confirm", json={
        "address": ALICE_ADDR, "amount": 10_000_000_000, "tx_hash": "tx1"
    })

    # Sign with wrong key
    sig = sign_transfer(wrong_priv, ALICE_ADDR, BOB_ADDR, 1_000_000_000, 0)
    resp = client.post("/api/transfer", json={
        "sender": ALICE_ADDR,
        "receiver": BOB_ADDR,
        "amount": 1_000_000_000,
        "nonce": 0,
        "signature": sig,
    })
    assert resp.status_code == 401


def test_settle_batch():
    """Settlement should group pending txs into a batch with computed state root."""
    priv, pub = make_keypair()
    _, bob_pub = make_keypair()

    client.post("/api/users/register", json={"address": ALICE_ADDR, "public_key": pub})
    client.post("/api/users/register", json={"address": BOB_ADDR, "public_key": bob_pub})
    client.post("/api/deposit/confirm", json={
        "address": ALICE_ADDR, "amount": 10_000_000_000, "tx_hash": "tx1"
    })

    sig = sign_transfer(priv, ALICE_ADDR, BOB_ADDR, 2_000_000_000, 0)
    client.post("/api/transfer", json={
        "sender": ALICE_ADDR, "receiver": BOB_ADDR,
        "amount": 2_000_000_000, "nonce": 0, "signature": sig,
    })

    import os
    os.environ["OPERATOR_API_KEY"] = "test-key"

    resp = client.post("/api/settle", json={"operator_key": "test-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["tx_count"] == 1
    assert "state_root" in data
    assert len(data["state_root"]) == 64  # SHA-256 hex


def test_verify_batch():
    """Verify endpoint should return matching state roots after settlement."""
    priv, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE_ADDR, "public_key": pub})
    client.post("/api/deposit/confirm", json={
        "address": ALICE_ADDR, "amount": 5_000_000_000, "tx_hash": "tx1"
    })

    os.environ["OPERATOR_API_KEY"] = "test-key"
    settle_resp = client.post("/api/settle", json={"operator_key": "test-key"})
    batch_id = settle_resp.json()["batch_id"]

    resp = client.get(f"/api/verify/{batch_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["match"] is True


def test_state_root_determinism():
    """SHA-256 of sorted balances JSON must be deterministic."""
    from state import compute_state_root

    balances = {"EQB": 3_000_000_000, "EQA": 7_000_000_000, "EQC": 500_000_000}
    root1 = compute_state_root(balances)
    root2 = compute_state_root({"EQC": 500_000_000, "EQA": 7_000_000_000, "EQB": 3_000_000_000})
    assert root1 == root2
    assert len(root1) == 64


def test_withdraw_request():
    priv, pub = make_keypair()
    client.post("/api/users/register", json={"address": ALICE_ADDR, "public_key": pub})
    client.post("/api/deposit/confirm", json={
        "address": ALICE_ADDR, "amount": 10_000_000_000, "tx_hash": "tx1"
    })

    sig = sign_withdraw(priv, ALICE_ADDR, 4_000_000_000)
    resp = client.post("/api/withdraw/request", json={
        "address": ALICE_ADDR,
        "amount": 4_000_000_000,
        "signature": sig,
    })
    assert resp.status_code == 200

    # Balance should be immediately reduced
    balance_resp = client.get(f"/api/balance/{ALICE_ADDR}")
    assert balance_resp.json()["off_chain_balance"] == 6_000_000_000
