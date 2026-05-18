"""Terminal display utilities: QR codes, tables, formatting."""
import io

import qrcode
from rich.console import Console
from rich.table import Table
from rich import box

console = Console()


def show_qr(url: str, title: str = "Scan with TON Keeper"):
    qr = qrcode.QRCode(version=None, box_size=1, border=1)
    qr.add_data(url)
    qr.make(fit=True)

    buf = io.StringIO()
    qr.print_ascii(out=buf, invert=True)
    buf.seek(0)
    qr_str = buf.read()

    console.print(f'\n[bold cyan]{title}[/bold cyan]')
    console.print(qr_str)
    console.print(f'[white]URL: {url[:80]}...[/white]' if len(url) > 80 else f'[white]URL: {url}[/white]')


def show_balance(data: dict, onchain_ton: float | None = None):
    balance_ton = data.get('off_chain_balance', 0) / 1e9
    nonce = data.get('nonce', 0)
    addr = data.get('address', '')
    console.print(f'\n[bold]Address:[/bold] [cyan]{addr}[/cyan]')
    if onchain_ton is not None:
        console.print(f'[bold]On-chain  (Tonkeeper):[/bold] [yellow]{onchain_ton:.4f} TON[/yellow]')
    else:
        console.print(f'[bold]On-chain  (Tonkeeper):[/bold] [white]unavailable[/white]')
    console.print(f'[bold]Off-chain (rollup):   [/bold] [green]{balance_ton:.4f} TON[/green]')
    console.print(f'[bold]Nonce:[/bold] {nonce}')


def show_history(txs: list, my_address: str):
    if not txs:
        console.print('[yellow]No transactions found.[/yellow]')
        return

    t = Table(title='Transaction History', box=box.SIMPLE)
    t.add_column('ID', style='white')
    t.add_column('Type', style='bold')
    t.add_column('From/To', style='cyan')
    t.add_column('Amount (TON)', style='green')
    t.add_column('Batch', style='white')

    for tx in txs:
        is_send = tx['sender'] == my_address
        tx_type = '[red]SEND[/red]' if is_send else '[green]RECV[/green]'
        other = tx['receiver'] if is_send else tx['sender']
        amount = f"{tx['amount'] / 1e9:.4f}"
        batch = str(tx.get('batch_id') or '-')
        t.add_row(str(tx['id']), tx_type, other[:20] + '...', amount, batch)

    console.print(t)


def show_batches(batches: list):
    if not batches:
        console.print('[yellow]No batches yet.[/yellow]')
        return

    t = Table(title='Settlement Batches', box=box.SIMPLE)
    t.add_column('ID', style='white')
    t.add_column('TXs', style='bold')
    t.add_column('Volume (TON)', style='green')
    t.add_column('State Root', style='white')

    for b in batches[:10]:
        vol = f"{b['total_volume'] / 1e9:.4f}"
        root = b['state_root'][:16] + '...'
        t.add_row(str(b['id']), str(b['tx_count']), vol, root)

    console.print(t)


def show_stats(stats: dict):
    t = Table(title='Rollup Statistics', box=box.SIMPLE)
    t.add_column('Metric')
    t.add_column('Value', style='green')

    t.add_row('Off-chain transactions', str(stats.get('total_off_chain_tx', 0)))
    t.add_row('On-chain settlements', str(stats.get('total_on_chain_settlements', 0)))
    t.add_row('Compression ratio', f"{stats.get('compression_ratio', 0):.1f}x")
    t.add_row('Pending transactions', str(stats.get('pending_tx_count', 0)))
    total_vol = stats.get('total_volume_nanotons', 0) / 1e9
    t.add_row('Total volume', f'{total_vol:.4f} TON')
    saved = stats.get('estimated_gas_saved_nanotons', 0) / 1e9
    t.add_row('Estimated gas saved', f'{saved:.4f} TON')

    console.print(t)


def print_error(msg: str):
    console.print(f'[bold red]Error:[/bold red] {msg}')


def print_success(msg: str):
    console.print(f'[bold green]✓[/bold green] {msg}')


def print_info(msg: str):
    console.print(f'[bold blue]>[/bold blue] {msg}')
