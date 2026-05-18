import httpx
from config import BACKEND_URL, OPERATOR_API_KEY, TONCENTER_BASE_URL


class ApiClient:
    def __init__(self):
        self._base = BACKEND_URL

    async def get_balance(self, address: str) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.get(f'{self._base}/api/balance/{address}')
            r.raise_for_status()
            return r.json()

    async def get_history(self, address: str, limit: int = 20) -> list:
        async with httpx.AsyncClient() as c:
            r = await c.get(f'{self._base}/api/history/{address}', params={'limit': limit})
            r.raise_for_status()
            return r.json()

    async def register_user(self, address: str, public_key: str) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.post(f'{self._base}/api/users/register', json={
                'address': address,
                'public_key': public_key,
            })
            r.raise_for_status()
            return r.json()

    async def confirm_deposit(self, address: str, amount: int, tx_hash: str) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.post(f'{self._base}/api/deposit/confirm', json={
                'address': address,
                'amount': amount,
                'tx_hash': tx_hash,
            })
            r.raise_for_status()
            return r.json()

    async def transfer(self, sender: str, receiver: str, amount: int,
                       nonce: int, signature: str) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.post(f'{self._base}/api/transfer', json={
                'sender': sender,
                'receiver': receiver,
                'amount': amount,
                'nonce': nonce,
                'signature': signature,
            })
            r.raise_for_status()
            return r.json()

    async def withdraw(self, address: str, amount: int, signature: str) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.post(f'{self._base}/api/withdraw/request', json={
                'address': address,
                'amount': amount,
                'signature': signature,
            })
            r.raise_for_status()
            return r.json()

    async def list_batches(self) -> list:
        async with httpx.AsyncClient() as c:
            r = await c.get(f'{self._base}/api/batches')
            r.raise_for_status()
            return r.json()

    async def get_stats(self) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.get(f'{self._base}/api/stats')
            r.raise_for_status()
            return r.json()

    async def settle(self) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.post(f'{self._base}/api/settle', json={'operator_key': OPERATOR_API_KEY})
            r.raise_for_status()
            return r.json()

    async def get_onchain_balance(self, address: str) -> float | None:
        """Fetch real TON balance from TonCenter. Returns TON float or None on error."""
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(
                    f'{TONCENTER_BASE_URL}/getAddressBalance',
                    params={'address': address}
                )
                data = r.json()
                if data.get('ok'):
                    return int(data['result']) / 1e9
        except Exception:
            pass
        return None

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3) as c:
                r = await c.get(f'{self._base}/health')
                return r.status_code == 200
        except Exception:
            return False
