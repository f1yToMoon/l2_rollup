import time

from sqlalchemy import text

from database import get_db
from state import (
    compute_state_root,
    get_all_balances,
    get_pending_transactions,
    get_pending_withdrawals,
)
from ton_client import get_on_chain_batch_index


async def form_and_settle_batch() -> dict:
    """
    Collect pending off-chain transactions, compute state root, and trigger
    on-chain settlement via SettleBatch message.

    Returns a summary dict with batch details.
    """
    pending_txs = await get_pending_transactions()
    pending_withdrawals = await get_pending_withdrawals()

    if not pending_txs and not pending_withdrawals:
        return {"error": "No pending transactions or withdrawals to settle"}

    # Current off-chain balances after all pending transfers
    balances = await get_all_balances()
    new_state_root = compute_state_root(balances)

    total_volume = sum(tx["amount"] for tx in pending_txs)
    total_deposits_remaining = sum(balances.values())
    withdrawals_map = {w["address"]: w["amount"] for w in pending_withdrawals}

    current_batch_index = await get_on_chain_batch_index()
    next_batch_index = current_batch_index + 1

    # --- In production: build Cell BOC and sign with operator wallet ---
    # settle_boc = build_settle_batch_boc(next_batch_index, new_state_root,
    #                                      total_deposits_remaining, withdrawals_map)
    # tx_hash = await send_settle_batch(next_batch_index, new_state_root,
    #                                    total_deposits_remaining, withdrawals_map, settle_boc)
    # For demo, we record it locally and mark as settled without real on-chain tx
    tx_hash = f"demo_tx_{int(time.time())}"

    async with get_db() as db:
        # Create batch record
        result = await db.execute(text("""
            INSERT INTO batches (state_root, tx_count, total_volume, settled_at, tx_hash)
            VALUES (:sr, :tc, :tv, :sa, :th)
        """), {
            "sr": new_state_root,
            "tc": len(pending_txs),
            "tv": total_volume,
            "sa": int(time.time()),
            "th": tx_hash,
        })
        batch_id = result.lastrowid

        # Tag all pending transactions with this batch_id
        if pending_txs:
            tx_ids = [tx["id"] for tx in pending_txs]
            placeholders = ",".join(f":id{i}" for i in range(len(tx_ids)))
            params = {f"id{i}": tid for i, tid in enumerate(tx_ids)}
            params["batch_id"] = batch_id
            await db.execute(text(f"""
                UPDATE transactions SET batch_id = :batch_id
                WHERE id IN ({placeholders})
            """), params)

        # Tag pending withdrawals
        if pending_withdrawals:
            w_ids = [w["id"] for w in pending_withdrawals]
            placeholders = ",".join(f":id{i}" for i in range(len(w_ids)))
            params = {f"id{i}": wid for i, wid in enumerate(w_ids)}
            params["batch_id"] = batch_id
            await db.execute(text(f"""
                UPDATE withdrawals SET batch_id = :batch_id
                WHERE id IN ({placeholders})
            """), params)

    return {
        "batch_id": batch_id,
        "batch_index": next_batch_index,
        "state_root": new_state_root,
        "tx_count": len(pending_txs),
        "withdrawal_count": len(pending_withdrawals),
        "total_volume": total_volume,
        "tx_hash": tx_hash,
    }


async def get_batch_detail(batch_id: int) -> dict:
    async with get_db() as db:
        batch_row = await db.execute(
            text("SELECT * FROM batches WHERE id = :id"), {"id": batch_id}
        )
        batch = batch_row.fetchone()
        if not batch:
            return {}

        tx_rows = await db.execute(
            text("SELECT * FROM transactions WHERE batch_id = :id ORDER BY timestamp"),
            {"id": batch_id},
        )
        transactions = [dict(r._mapping) for r in tx_rows.fetchall()]

    # Reconstruct balance snapshot from transactions in this batch
    balances: dict[str, int] = {}
    for tx in transactions:
        balances[tx["sender"]] = balances.get(tx["sender"], 0) - tx["amount"]
        balances[tx["receiver"]] = balances.get(tx["receiver"], 0) + tx["amount"]

    return {
        "batch": dict(batch._mapping),
        "transactions": transactions,
        "balances": balances,
    }


async def get_all_batches() -> list[dict]:
    async with get_db() as db:
        rows = await db.execute(
            text("SELECT * FROM batches ORDER BY id DESC")
        )
        return [dict(r._mapping) for r in rows.fetchall()]


async def get_stats() -> dict:
    async with get_db() as db:
        tx_count_row = await db.execute(text("SELECT COUNT(*) as c FROM transactions"))
        tx_count = tx_count_row.fetchone().c

        batch_count_row = await db.execute(text("SELECT COUNT(*) as c FROM batches"))
        batch_count = batch_count_row.fetchone().c

        pending_row = await db.execute(
            text("SELECT COUNT(*) as c FROM transactions WHERE batch_id IS NULL")
        )
        pending_count = pending_row.fetchone().c

        volume_row = await db.execute(text("SELECT COALESCE(SUM(amount), 0) as v FROM transactions"))
        total_volume = volume_row.fetchone().v

    # Estimate: each on-chain tx costs ~0.01 TON; each off-chain tx costs 0 TON
    # Without rollup: all txs would be on-chain = tx_count * 0.01 TON
    on_chain_gas_per_tx = 10_000_000  # 0.01 TON in nanotons
    estimated_saved = max(0, tx_count - batch_count) * on_chain_gas_per_tx

    ratio = (tx_count / batch_count) if batch_count > 0 else 0.0

    return {
        "total_off_chain_tx": tx_count,
        "total_on_chain_settlements": batch_count,
        "compression_ratio": round(ratio, 2),
        "total_volume_nanotons": total_volume,
        "estimated_gas_saved_nanotons": estimated_saved,
        "pending_tx_count": pending_count,
    }
