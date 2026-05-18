#!/usr/bin/env python3
"""Mini Rollup CLI — TON Keeper testnet interface."""
import asyncio
import subprocess
import sys
import os
import time

# Add parent backend dir to path so config.py can find .env
sys.path.insert(0, os.path.dirname(__file__))

import questionary
from rich.console import Console
from rich.panel import Panel

from api import ApiClient
from ton_connect import TonKeeperConnector
from wallet import load_or_create_keypair, sign_transfer, sign_withdraw
from display import (
    show_balance, show_history, show_batches, show_stats,
    print_error, print_success, print_info, console
)

api = ApiClient()
connector = TonKeeperConnector()


async def ensure_backend() -> bool:
    if await api.health():
        return True

    print_info('Backend not running. Starting...')
    backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
    proc = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'],
        cwd=os.path.abspath(backend_dir),
        env={**os.environ, 'PYTHONPATH': os.path.abspath(backend_dir)},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    for _ in range(20):
        await asyncio.sleep(0.5)
        if await api.health():
            print_success('Backend started.')
            return True

    print_error('Failed to start backend.')
    return False


async def cmd_connect():
    ok = await connector.connect()
    if ok:
        addr = connector.address
        pub_key, _ = load_or_create_keypair()
        try:
            await api.register_user(addr, pub_key)
            print_success(f'Registered with rollup. Public key: {pub_key[:16]}...')
        except Exception as e:
            print_info(f'Register note: {e}')


async def cmd_balance():
    addr = connector.address
    if not addr:
        print_error('No wallet connected.')
        return
    try:
        data, onchain = await asyncio.gather(
            api.get_balance(addr),
            api.get_onchain_balance(addr),
        )
        show_balance(data, onchain)
    except Exception as e:
        print_error(str(e))


async def cmd_deposit():
    addr = connector.address
    if not addr:
        print_error('Connect wallet first.')
        return

    amount_str = await questionary.text(
        'Deposit amount (TON):',
        validate=lambda v: True if _valid_float(v) and float(v) > 0 else 'Enter a positive number'
    ).ask_async()

    if not amount_str:
        return

    amount_ton = float(amount_str)
    print_info(f'Sending {amount_ton} TON deposit to contract via TON Keeper...')

    tx_hash = await connector.send_deposit(amount_ton)
    if tx_hash:
        print_success(f'Transaction sent! Hash: {tx_hash[:32]}...')
        try:
            amount_nano = int(amount_ton * 1e9)
            result, onchain = await asyncio.gather(
                api.confirm_deposit(addr, amount_nano, tx_hash),
                api.get_onchain_balance(addr),
            )
            new_bal = result.get('new_off_chain_balance', 0) / 1e9
            print_success(f'Off-chain balance credited: {new_bal:.4f} TON')
            if onchain is not None:
                print_info(f'On-chain (Tonkeeper) balance now: {onchain:.4f} TON')
        except Exception as e:
            print_error(f'Failed to confirm deposit with backend: {e}')


async def cmd_transfer():
    addr = connector.address
    if not addr:
        print_error('Connect wallet first.')
        return

    receiver = await questionary.text(
        'Receiver address:',
        validate=lambda v: True if v.strip() else 'Required'
    ).ask_async()
    if not receiver:
        return
    receiver = receiver.strip()

    amount_str = await questionary.text(
        'Amount (TON):',
        validate=lambda v: True if _valid_float(v) and float(v) > 0 else 'Positive number required'
    ).ask_async()
    if not amount_str:
        return

    amount_nano = int(float(amount_str) * 1e9)

    try:
        balance_data = await api.get_balance(addr)
        nonce = balance_data.get('nonce', 0)
        bal = balance_data.get('off_chain_balance', 0)
        if bal < amount_nano:
            print_error(f'Insufficient balance: {bal / 1e9:.4f} TON available')
            return
    except Exception as e:
        print_error(f'Failed to fetch balance: {e}')
        return

    _, priv_key = load_or_create_keypair()
    sig = sign_transfer(priv_key, addr, receiver, amount_nano, nonce)

    try:
        result = await api.transfer(addr, receiver, amount_nano, nonce, sig)
        new_bal = result.get('sender_balance', 0) / 1e9
        print_success(f'Transfer complete! New balance: {new_bal:.4f} TON')
    except Exception as e:
        print_error(str(e))


async def cmd_withdraw():
    addr = connector.address
    if not addr:
        print_error('Connect wallet first.')
        return

    mode = await questionary.select(
        'Withdrawal type:',
        choices=[
            questionary.Choice('Off-chain withdrawal (queued in next batch)', value='offchain'),
            questionary.Choice('On-chain direct withdrawal (after dispute window)', value='onchain'),
            questionary.Choice('← Back', value='back'),
        ]
    ).ask_async()

    if not mode or mode == 'back':
        return

    amount_str = await questionary.text(
        'Amount (TON):',
        validate=lambda v: True if _valid_float(v) and float(v) > 0 else 'Positive number required'
    ).ask_async()
    if not amount_str:
        return
    amount_ton = float(amount_str)
    amount_nano = int(amount_ton * 1e9)

    if mode == 'offchain':
        _, priv_key = load_or_create_keypair()
        sig = sign_withdraw(priv_key, addr, amount_nano)
        try:
            result = await api.withdraw(addr, amount_nano, sig)
            print_success(f'Withdrawal queued. ID: {result.get("withdrawal_id")}')
            print_info('Will be processed in next settlement batch.')
        except Exception as e:
            print_error(str(e))

    elif mode == 'onchain':
        print_info(f'Sending on-chain withdrawal of {amount_ton} TON via TON Keeper...')
        tx_hash = await connector.send_on_chain_withdraw(amount_ton)
        if tx_hash:
            print_success(f'On-chain withdrawal sent! Hash: {tx_hash[:32]}...')


async def cmd_history():
    addr = connector.address
    if not addr:
        print_error('Connect wallet first.')
        return
    try:
        txs = await api.get_history(addr)
        show_history(txs, addr)
    except Exception as e:
        print_error(str(e))


async def cmd_batches():
    try:
        batches = await api.list_batches()
        show_batches(batches)
    except Exception as e:
        print_error(str(e))


async def cmd_stats():
    try:
        stats = await api.get_stats()
        show_stats(stats)
    except Exception as e:
        print_error(str(e))


async def cmd_settle():
    confirm = await questionary.confirm('Settle pending transactions into a batch?').ask_async()
    if not confirm:
        return
    try:
        result = await api.settle()
        print_success(
            f"Batch #{result.get('batch_id')} settled: "
            f"{result.get('tx_count')} txs, "
            f"state root: {str(result.get('state_root', ''))[:16]}..."
        )
    except Exception as e:
        print_error(str(e))


async def cmd_disconnect():
    if not connector.connected:
        print_info('No wallet set.')
        return
    confirm = await questionary.confirm('Remove saved wallet address?').ask_async()
    if confirm:
        await connector.disconnect()
        print_success('Wallet removed.')


def _valid_float(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False


def _build_menu(connected: bool) -> list:
    choices = []

    if not connected:
        choices.append(questionary.Choice('Connect TON Keeper wallet', value='connect'))
    else:
        addr = connector.address or ''
        choices.append(questionary.Choice(
            f'[connected] {addr[:12]}...{addr[-6:]}', value='noop'
        ))
        choices.append(questionary.Choice('Check balance', value='balance'))
        choices.append(questionary.Choice('Deposit TON', value='deposit'))
        choices.append(questionary.Choice('Transfer (off-chain)', value='transfer'))
        choices.append(questionary.Choice('Withdraw', value='withdraw'))
        choices.append(questionary.Choice('Transaction history', value='history'))

    choices.append(questionary.Choice('View batches', value='batches'))
    choices.append(questionary.Choice('Statistics', value='stats'))
    choices.append(questionary.Choice('Settle batch (operator)', value='settle'))

    if connected:
        choices.append(questionary.Choice('Disconnect wallet', value='disconnect'))

    choices.append(questionary.Choice('Exit', value='exit'))
    return choices


async def main():
    console.print(Panel.fit(
        '[bold cyan]Mini Rollup CLI[/bold cyan]\n[white]TON L2 rollup — testnet[/white]',
        border_style='cyan'
    ))

    if not await ensure_backend():
        sys.exit(1)

    restored = await connector.restore()
    if restored:
        print_success(f'Wallet loaded: {connector.address}')

    while True:
        connected = connector.connected
        choices = _build_menu(connected)

        action = await questionary.select(
            '',
            choices=choices,
            use_shortcuts=False,
            use_jk_keys=True,
        ).ask_async()

        if action is None or action == 'exit':
            console.print('[white]Bye.[/white]')
            break
        elif action == 'noop':
            continue
        elif action == 'connect':
            await cmd_connect()
        elif action == 'balance':
            await cmd_balance()
        elif action == 'deposit':
            await cmd_deposit()
        elif action == 'transfer':
            await cmd_transfer()
        elif action == 'withdraw':
            await cmd_withdraw()
        elif action == 'history':
            await cmd_history()
        elif action == 'batches':
            await cmd_batches()
        elif action == 'stats':
            await cmd_stats()
        elif action == 'settle':
            await cmd_settle()
        elif action == 'disconnect':
            await cmd_disconnect()

        console.print()  # blank line between actions


if __name__ == '__main__':
    asyncio.run(main())
