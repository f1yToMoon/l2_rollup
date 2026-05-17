"""
Minimal TON client using TonCenter REST API.

For production, consider using pytoniq or tonsdk for full wallet management.
This module focuses on reading contract state and sending pre-built messages.
"""

import hashlib
import os
from typing import Optional

import httpx

TONCENTER_BASE_URL = os.getenv("TONCENTER_BASE_URL", "https://testnet.toncenter.com/api/v2")
TONCENTER_API_KEY = os.getenv("TONCENTER_API_KEY", "")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    if TONCENTER_API_KEY:
        h["X-API-Key"] = TONCENTER_API_KEY
    return h


async def get_contract_state() -> dict:
    """Fetch basic contract info (balance, code hash, data)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{TONCENTER_BASE_URL}/getAddressInformation",
            params={"address": CONTRACT_ADDRESS},
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json().get("result", {})


async def run_get_method(method: str, stack: list = None) -> Optional[list]:
    """Call a getter on the deployed contract."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{TONCENTER_BASE_URL}/runGetMethod",
            params={
                "address": CONTRACT_ADDRESS,
                "method": method,
                "stack": stack or [],
            },
            headers=_headers(),
        )
        if resp.status_code != 200:
            return None
        data = resp.json().get("result", {})
        return data.get("stack", [])


async def get_on_chain_state_root() -> Optional[str]:
    """Read the current stateRoot from the on-chain contract."""
    stack = await run_get_method("getStateRoot")
    if stack and stack[0][0] == "num":
        value = int(stack[0][1], 16)
        return format(value, "064x")
    return None


async def get_on_chain_batch_index() -> int:
    stack = await run_get_method("getBatchIndex")
    if stack and stack[0][0] == "num":
        return int(stack[0][1], 16)
    return 0


async def get_on_chain_deposit(address: str) -> int:
    """Read on-chain deposit balance for a given address."""
    stack = await run_get_method("getDeposit", [["tvm.Slice", address]])
    if stack and stack[0][0] == "num":
        return int(stack[0][1], 16)
    return 0


async def send_settle_batch(
    batch_index: int,
    new_state_root: str,
    total_deposits: int,
    withdrawals: dict[str, int],
    operator_boc: str,
) -> Optional[str]:
    """
    Broadcast a SettleBatch transaction.

    In production, build the Cell/BOC from the operator's wallet and sign it.
    operator_boc: base64-encoded signed BOC ready to broadcast.

    Returns the transaction hash if successful, else None.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TONCENTER_BASE_URL}/sendBoc",
            json={"boc": operator_boc},
            headers=_headers(),
        )
        if resp.status_code == 200:
            return resp.json().get("result", {}).get("hash")
        return None
