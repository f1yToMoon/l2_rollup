"""Tonkeeper wallet — manual address entry + ton:// deep links for transactions."""
import asyncio
import base64
import hashlib
import json
import time
import urllib.parse
from pathlib import Path

import httpx
import questionary
from pytoniq_core import begin_cell

from config import CONTRACT_ADDRESS, TONCENTER_BASE_URL
from display import show_qr, print_info, print_error, print_success, console

_DEPOSIT_OPCODE = 0xbf3f447e
_WITHDRAW_OPCODE = 0x2e7c6a5b

_ADDR_FILE = Path.home() / '.mini_rollup_address.json'


def _build_deposit_boc() -> str:
    cell = begin_cell().store_uint(_DEPOSIT_OPCODE, 32).end_cell()
    return base64.urlsafe_b64encode(cell.to_boc()).decode()


def _build_withdraw_boc(amount_nanotons: int) -> str:
    cell = begin_cell().store_uint(_WITHDRAW_OPCODE, 32).store_coins(amount_nanotons).end_cell()
    return base64.urlsafe_b64encode(cell.to_boc()).decode()


def _tonkeeper_link(address: str, amount_nanotons: int, payload_b64url: str) -> str:
    # Use ton:// URI — more reliable across Tonkeeper versions than https deep link
    return f'ton://transfer/{address}?amount={amount_nanotons}&bin={payload_b64url}'


class TonKeeperConnector:
    def __init__(self):
        self._address: str | None = None

    @property
    def address(self) -> str | None:
        return self._address

    @property
    def connected(self) -> bool:
        return self._address is not None

    async def restore(self) -> bool:
        try:
            if _ADDR_FILE.exists():
                data = json.loads(_ADDR_FILE.read_text())
                addr = data.get('address', '')
                if addr:
                    self._address = addr
                    return True
        except Exception:
            pass
        return False

    async def connect(self) -> bool:
        if self._address:
            print_info(f'Already connected: {self._address}')
            return True

        console.print('[cyan]Paste your Tonkeeper testnet wallet address.[/cyan]')
        console.print('[white]In Tonkeeper: tap your address at top to copy (EQ..., UQ..., or 0Q... all valid).[/white]')
        console.print('[white]Make sure Tonkeeper is in Testnet mode: Settings → Dev Tools → Testnet.[/white]\n')

        addr = await questionary.text(
            'Wallet address:',
            validate=lambda v: (
                True if len(v.strip()) >= 48
                else 'Too short — paste the full TON address'
            )
        ).ask_async()

        if not addr:
            return False

        self._address = addr.strip()
        _ADDR_FILE.write_text(json.dumps({'address': self._address}))
        print_success(f'Wallet set: {self._address}')
        return True

    async def disconnect(self):
        self._address = None
        if _ADDR_FILE.exists():
            _ADDR_FILE.unlink()

    async def _get_onchain_balance(self, address: str) -> int | None:
        """Return balance in nanotons from TonCenter, or None on error."""
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(f'{TONCENTER_BASE_URL}/getAddressBalance',
                                params={'address': address})
                data = r.json()
                if data.get('ok'):
                    return int(data['result'])
        except Exception:
            pass
        return None

    async def _wait_for_tx(self, address: str, balance_before: int, timeout: int = 90) -> str | None:
        """Poll TonCenter until balance decreases (tx confirmed) or timeout."""
        console.print('[yellow]Waiting for transaction on-chain (up to 90s)...[/yellow]')
        deadline = time.time() + timeout
        while time.time() < deadline:
            await asyncio.sleep(4)
            bal = await self._get_onchain_balance(address)
            if bal is not None and bal < balance_before:
                return f'onchain_{int(time.time())}_{hashlib.sha256(address.encode()).hexdigest()[:12]}'
            console.print('[white]  Still waiting...[/white]')
        return None

    async def _send_tx(self, link: str, title: str) -> str | None:
        https_link = link.replace('ton://transfer/', 'https://app.tonkeeper.com/transfer/', 1)
        console.print(f'\n[cyan]Open ONE of these on your phone:[/cyan]')
        console.print(f'[bold yellow]ton://  → {link}[/bold yellow]')
        console.print(f'[bold yellow]https:// → {https_link}[/bold yellow]\n')
        show_qr(link, title=title)
        console.print('[white]Scan QR or copy link → open on phone → approve in Tonkeeper.[/white]\n')

        confirmed = await questionary.confirm(
            'Sent the transaction in Tonkeeper?'
        ).ask_async()

        if not confirmed:
            return None

        return f'manual_{int(time.time())}_{hashlib.sha256(link.encode()).hexdigest()[:12]}'

    async def send_deposit(self, amount_ton: float) -> str | None:
        if not CONTRACT_ADDRESS or CONTRACT_ADDRESS.startswith('EQA_placeholder'):
            print_error('CONTRACT_ADDRESS not set. Deploy the contract first.')
            return None

        amount_nanotons = int(amount_ton * 1e9)
        gas = 10_000_000  # 0.01 TON
        payload = _build_deposit_boc()
        link = _tonkeeper_link(CONTRACT_ADDRESS, amount_nanotons + gas, payload)

        https_link = link.replace('ton://transfer/', 'https://app.tonkeeper.com/transfer/', 1)
        console.print(f'\n[cyan]Open ONE of these on your phone:[/cyan]')
        console.print(f'[bold yellow]ton://  → {link}[/bold yellow]')
        console.print(f'[bold yellow]https:// → {https_link}[/bold yellow]\n')
        show_qr(link, title=f'Deposit {amount_ton} TON to rollup')
        console.print('[white]Scan QR or copy link → open on phone → approve in Tonkeeper.[/white]\n')

        balance_before = await self._get_onchain_balance(self._address)

        confirmed = await questionary.confirm(
            'Sent the transaction in Tonkeeper?'
        ).ask_async()
        if not confirmed:
            return None

        if balance_before is not None:
            tx_hash = await self._wait_for_tx(self._address, balance_before)
            if tx_hash:
                print_success('Transaction confirmed on-chain!')
                return tx_hash
            else:
                print_error('TX not detected on-chain within 90s.')
                skip = await questionary.confirm(
                    'Credit off-chain balance anyway?'
                ).ask_async()
                if not skip:
                    return None
        else:
            print_info('Could not check on-chain (TonCenter unavailable). Crediting anyway.')

        return f'manual_{int(time.time())}_{hashlib.sha256(link.encode()).hexdigest()[:12]}'

    async def send_on_chain_withdraw(self, amount_ton: float) -> str | None:
        if not CONTRACT_ADDRESS or CONTRACT_ADDRESS.startswith('EQA_placeholder'):
            print_error('CONTRACT_ADDRESS not set.')
            return None

        amount_nanotons = int(amount_ton * 1e9)
        payload = _build_withdraw_boc(amount_nanotons)
        link = _tonkeeper_link(CONTRACT_ADDRESS, 10_000_000, payload)
        return await self._send_tx(link, f'Withdraw {amount_ton} TON from rollup')
