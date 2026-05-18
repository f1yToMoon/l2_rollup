"""Local Ed25519 key management for off-chain transfer signing."""
import hashlib
import json
import os
from pathlib import Path

import nacl.encoding
import nacl.signing

from config import WALLET_FILE


def load_or_create_keypair() -> tuple[str, str]:
    """Load existing keypair or generate new one. Returns (address_key, public_key_hex, private_key_hex)."""
    if os.path.exists(WALLET_FILE):
        with open(WALLET_FILE) as f:
            data = json.load(f)
        return data['public_key'], data['private_key']

    signing_key = nacl.signing.SigningKey.generate()
    verify_key = signing_key.verify_key

    pub_hex = verify_key.encode(encoder=nacl.encoding.HexEncoder).decode()
    priv_hex = signing_key.encode(encoder=nacl.encoding.HexEncoder).decode()

    with open(WALLET_FILE, 'w') as f:
        json.dump({'public_key': pub_hex, 'private_key': priv_hex}, f)

    return pub_hex, priv_hex


def sign_transfer(private_key_hex: str, sender: str, receiver: str, amount: int, nonce: int) -> str:
    payload = json.dumps(
        {'sender': sender, 'receiver': receiver, 'amount': amount, 'nonce': nonce},
        separators=(',', ':'),
        sort_keys=True,
    )
    msg = hashlib.sha256(payload.encode()).digest()
    signing_key = nacl.signing.SigningKey(bytes.fromhex(private_key_hex), encoder=nacl.encoding.RawEncoder)
    signed = signing_key.sign(msg)
    return signed.signature.hex()


def sign_withdraw(private_key_hex: str, address: str, amount: int) -> str:
    payload = json.dumps(
        {'address': address, 'amount': amount},
        separators=(',', ':'),
        sort_keys=True,
    )
    msg = hashlib.sha256(payload.encode()).digest()
    signing_key = nacl.signing.SigningKey(bytes.fromhex(private_key_hex), encoder=nacl.encoding.RawEncoder)
    signed = signing_key.sign(msg)
    return signed.signature.hex()
