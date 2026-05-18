import os
import socket
import ipaddress
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).parent.parent / 'backend' / '.env'
load_dotenv(_env_path)

# Known VPN/virtual interface prefixes to skip
_SKIP_PREFIXES = ('100.', '25.', '172.')  # amn0/Hamachi/Docker ranges
_PREFER_PREFIXES = ('192.168.', '10.')    # typical LAN ranges


def _get_lan_ip() -> str:
    """Return WiFi LAN IP so mobile can reach backend on same network.

    With VPN active, routing to 8.8.8.8 returns VPN IP, not WiFi IP.
    Strategy: prefer 192.168.x.x / 10.x.x.x private IPs, skip VPN/Docker ranges.
    Override: set LAN_IP env var to hardcode (most reliable with VPN).
    """
    env_override = os.getenv('LAN_IP', '').strip()
    if env_override:
        return env_override

    # Collect all non-loopback IPv4 addresses
    candidates: list[str] = []
    try:
        import subprocess
        result = subprocess.run(
            ['ip', '-4', 'addr', 'show'],
            capture_output=True, text=True, timeout=3
        )
        for line in result.stdout.splitlines():
            line = line.strip()
            if line.startswith('inet '):
                ip = line.split()[1].split('/')[0]
                if ip != '127.0.0.1':
                    candidates.append(ip)
    except Exception:
        pass

    # Prefer LAN ranges (WiFi), skip VPN/Docker
    for ip in candidates:
        if any(ip.startswith(p) for p in _PREFER_PREFIXES):
            return ip

    # Fallback: routing trick (may return VPN IP with VPN active)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        if ip != '127.0.0.1':
            return ip
    except Exception:
        pass

    return candidates[0] if candidates else '127.0.0.1'


BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS', '')
TONCENTER_BASE_URL = os.getenv('TONCENTER_BASE_URL', 'https://testnet.toncenter.com/api/v2')
OPERATOR_API_KEY = os.getenv('OPERATOR_API_KEY', 'dev-operator-key')

_lan_ip = _get_lan_ip()
# Manifest must be reachable from mobile device — use LAN IP, not localhost
MANIFEST_URL = os.getenv('MANIFEST_URL', f'http://{_lan_ip}:8000/tonconnect-manifest.json')
LAN_IP = _lan_ip

SESSION_FILE = Path.home() / '.mini_rollup_tc_session.json'
WALLET_FILE = Path.home() / '.mini_rollup_wallet.json'
