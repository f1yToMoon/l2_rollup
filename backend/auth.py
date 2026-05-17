import hashlib
import json

import nacl.encoding
import nacl.exceptions
import nacl.signing


def build_transfer_message(sender: str, receiver: str, amount: int, nonce: int) -> bytes:
    """Canonical message that the sender must sign for an off-chain transfer."""
    payload = json.dumps(
        {"sender": sender, "receiver": receiver, "amount": amount, "nonce": nonce},
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).digest()


def build_withdraw_message(address: str, amount: int) -> bytes:
    """Canonical message signed for a withdrawal request."""
    payload = json.dumps(
        {"address": address, "amount": amount},
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).digest()


def verify_signature(public_key_hex: str, message: bytes, signature_hex: str) -> bool:
    """
    Verify an Ed25519 signature.

    public_key_hex: 64-char hex string (32 bytes)
    message: raw bytes that were signed
    signature_hex: 128-char hex string (64 bytes)
    """
    try:
        verify_key = nacl.signing.VerifyKey(
            bytes.fromhex(public_key_hex), encoder=nacl.encoding.RawEncoder
        )
        verify_key.verify(message, bytes.fromhex(signature_hex))
        return True
    except (nacl.exceptions.BadSignatureError, ValueError):
        return False
