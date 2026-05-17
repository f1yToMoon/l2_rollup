import hashlib
import json
import time
from typing import Optional

from sqlalchemy import text

from database import get_db


async def get_user(address: str) -> Optional[dict]:
    async with get_db() as db:
        row = await db.execute(text("SELECT * FROM users WHERE address = :a"), {"a": address})
        result = row.fetchone()
        return dict(result._mapping) if result else None


async def get_or_create_user(address: str, public_key: str = "", telegram_id: int = None,
                              username: str = None, avatar_url: str = None) -> dict:
    user = await get_user(address)
    if user:
        return user

    async with get_db() as db:
        await db.execute(text("""
            INSERT OR IGNORE INTO users
                (address, public_key, telegram_id, username, avatar_url,
                 off_chain_balance, nonce, created_at)
            VALUES
                (:addr, :pk, :tg, :uname, :avatar, 0, 0, :ts)
        """), {
            "addr": address,
            "pk": public_key,
            "tg": telegram_id,
            "uname": username,
            "avatar": avatar_url,
            "ts": int(time.time()),
        })
    return await get_user(address)


async def get_balance(address: str) -> int:
    user = await get_user(address)
    return user["off_chain_balance"] if user else 0


async def get_nonce(address: str) -> int:
    user = await get_user(address)
    return user["nonce"] if user else 0


async def apply_transfer(sender: str, receiver: str, amount: int,
                          nonce: int, signature: str) -> dict:
    """Atomically update both balances and record the transaction."""
    async with get_db() as db:
        # Re-fetch inside transaction for consistency
        row = await db.execute(text("SELECT off_chain_balance, nonce FROM users WHERE address = :a"),
                                {"a": sender})
        sender_row = row.fetchone()
        if not sender_row:
            raise ValueError("Sender not found")

        if sender_row.off_chain_balance < amount:
            raise ValueError("Insufficient off-chain balance")

        if sender_row.nonce != nonce:
            raise ValueError(f"Invalid nonce: expected {sender_row.nonce}, got {nonce}")

        # Ensure receiver exists
        await db.execute(text("""
            INSERT OR IGNORE INTO users (address, off_chain_balance, nonce, created_at)
            VALUES (:a, 0, 0, :ts)
        """), {"a": receiver, "ts": int(time.time())})

        await db.execute(text("""
            UPDATE users SET off_chain_balance = off_chain_balance - :amount, nonce = nonce + 1
            WHERE address = :addr
        """), {"amount": amount, "addr": sender})

        await db.execute(text("""
            UPDATE users SET off_chain_balance = off_chain_balance + :amount
            WHERE address = :addr
        """), {"amount": amount, "addr": receiver})

        result = await db.execute(text("""
            INSERT INTO transactions (sender, receiver, amount, timestamp, signature, nonce)
            VALUES (:s, :r, :a, :t, :sig, :n)
        """), {
            "s": sender, "r": receiver, "a": amount,
            "t": int(time.time()), "sig": signature, "n": nonce,
        })
        tx_id = result.lastrowid

        s_row = await db.execute(text("SELECT off_chain_balance FROM users WHERE address = :a"),
                                  {"a": sender})
        r_row = await db.execute(text("SELECT off_chain_balance FROM users WHERE address = :a"),
                                  {"a": receiver})
        sender_balance = s_row.fetchone().off_chain_balance
        receiver_balance = r_row.fetchone().off_chain_balance

    return {
        "id": tx_id,
        "sender": sender,
        "receiver": receiver,
        "amount": amount,
        "timestamp": int(time.time()),
        "sender_balance": sender_balance,
        "receiver_balance": receiver_balance,
    }


async def confirm_deposit(address: str, amount: int, tx_hash: str) -> int:
    """Credit a confirmed on-chain deposit to the user's off-chain balance."""
    await get_or_create_user(address)
    async with get_db() as db:
        await db.execute(text("""
            UPDATE users SET off_chain_balance = off_chain_balance + :amount
            WHERE address = :addr
        """), {"amount": amount, "addr": address})

        row = await db.execute(text("SELECT off_chain_balance FROM users WHERE address = :a"),
                                {"a": address})
        return row.fetchone().off_chain_balance


async def add_withdrawal_request(address: str, amount: int) -> int:
    async with get_db() as db:
        # Deduct from off-chain balance immediately
        await db.execute(text("""
            UPDATE users SET off_chain_balance = off_chain_balance - :amount
            WHERE address = :addr
        """), {"amount": amount, "addr": address})

        result = await db.execute(text("""
            INSERT INTO withdrawals (address, amount, created_at)
            VALUES (:addr, :amount, :ts)
        """), {"addr": address, "amount": amount, "ts": int(time.time())})
        return result.lastrowid


async def get_all_balances() -> dict[str, int]:
    async with get_db() as db:
        rows = await db.execute(text("""
            SELECT address, off_chain_balance FROM users WHERE off_chain_balance > 0
        """))
        return {row.address: row.off_chain_balance for row in rows.fetchall()}


def compute_state_root(balances: dict[str, int]) -> str:
    """Deterministic SHA-256 of sorted balances JSON (mirrors frontend verify.ts)."""
    sorted_balances = dict(sorted(balances.items()))
    data = json.dumps(sorted_balances, separators=(",", ":"))
    return hashlib.sha256(data.encode()).hexdigest()


async def get_pending_transactions() -> list[dict]:
    async with get_db() as db:
        rows = await db.execute(text("""
            SELECT id, sender, receiver, amount, timestamp, batch_id, signature
            FROM transactions WHERE batch_id IS NULL
            ORDER BY id
        """))
        return [dict(r._mapping) for r in rows.fetchall()]


async def get_pending_withdrawals() -> list[dict]:
    async with get_db() as db:
        rows = await db.execute(text("""
            SELECT id, address, amount FROM withdrawals WHERE batch_id IS NULL
        """))
        return [dict(r._mapping) for r in rows.fetchall()]


async def get_transaction_history(address: str, limit: int = 50) -> list[dict]:
    async with get_db() as db:
        rows = await db.execute(text("""
            SELECT id, sender, receiver, amount, timestamp, batch_id
            FROM transactions
            WHERE sender = :addr OR receiver = :addr
            ORDER BY timestamp DESC
            LIMIT :limit
        """), {"addr": address, "limit": limit})
        return [dict(r._mapping) for r in rows.fetchall()]
