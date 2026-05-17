# Mini Rollup — Architecture

## Overview

```
┌──────────────────────────────────────────────────────────┐
│                   Telegram Mini App                        │
│                   (React + TypeScript)                     │
│                                                            │
│  HomePage  DepositPage  TransferPage  WithdrawPage         │
│  BatchesPage  StatsPage                                    │
│                                                            │
│  ┌─────────────────┐  ┌────────────────────────────────┐  │
│  │  hooks/useApi   │  │     hooks/useContract          │  │
│  │  (React Query)  │  │  (TON Connect + @ton/core)     │  │
│  └────────┬────────┘  └──────────────┬─────────────────┘  │
└───────────┼───────────────────────────┼────────────────────┘
            │                           │
            ▼                           ▼
   ┌─────────────────┐         ┌─────────────────┐
   │  Backend API     │         │  TON Blockchain  │
   │  FastAPI/Python  │────────►│  MiniRollup.tact │
   │                  │◄────────│  (Testnet)       │
   └─────────────────┘         └─────────────────┘
            │
   ┌────────▼────────┐
   │  SQLite Database │
   │  (aiosqlite)     │
   └─────────────────┘
```

## Layer Descriptions

### 1. Frontend (Telegram Mini App)

**Technology:** React 18 + TypeScript + Vite  
**State management:** @tanstack/react-query  
**TON wallet:** @tonconnect/ui-react  
**Telegram SDK:** @telegram-apps/sdk-react  
**Signing:** tweetnacl (Ed25519)

Key responsibilities:
- Connect user's TON wallet via TON Connect
- Sign off-chain transfers with locally generated Ed25519 keypair
- Send deposits/withdrawals as TON Connect transactions
- Display off-chain balance and transaction history
- Client-side state root verification (verify.ts)

### 2. Backend (Sequencer / API)

**Technology:** Python 3.11 + FastAPI + SQLite  
**Role:** Centralized sequencer (simplified vs real L2)

Key responsibilities:
- Accept signed off-chain transfers
- Verify Ed25519 signatures using stored public keys
- Update off-chain balances atomically
- Form settlement batches from pending transactions
- Publish state root to on-chain contract
- Provide data for client-side verification

### 3. Smart Contract (On-Chain Settlement)

**Technology:** Tact 1.x → TON blockchain  
**Deployment:** TON Testnet

Key responsibilities:
- Accept deposits and track per-user on-chain balances
- Verify SettleBatch from operator (sequential batch index)
- Process withdrawals (send TON to users)
- Store state root (SHA-256 of off-chain balances)
- Handle disputes within the dispute window
- Allow direct withdrawals after dispute window

## Data Flow

### Deposit Flow

```
User ─[Deposit msg + TON]─► Contract
                              └─ deposits[user] += value

Frontend ─[POST /api/deposit/confirm]─► Backend
                                         └─ off_chain_balance[user] += amount
```

### Off-Chain Transfer Flow

```
User A ─[POST /api/transfer + Ed25519 sig]─► Backend
                                              ├─ verify signature
                                              ├─ off_chain_balance[A] -= amount
                                              ├─ off_chain_balance[B] += amount
                                              └─ record tx (batch_id=NULL)
```

No on-chain transaction! Instantaneous and free.

### Settlement Flow

```
Operator ─[POST /api/settle]─► Backend
                                ├─ collect pending txs (batch_id=NULL)
                                ├─ compute new_state_root = sha256(json(balances))
                                ├─ build SettleBatch message
                                │
                                └─[SettleBatch msg]─► Contract
                                                       ├─ verify operator
                                                       ├─ verify batch_index = current+1
                                                       ├─ process withdrawals
                                                       └─ update stateRoot
```

### Verification Flow

```
User ─[GET /api/verify/{batch_id}]─► Backend
                                      └─ returns: balances snapshot + stored_state_root

User (local) ─ computeStateRootAsync(balances)
             └─ compare with stored_state_root
             └─ ✅ match OR ❌ mismatch → raise Dispute
```

## Database Schema

```sql
users (
  address TEXT PRIMARY KEY,
  telegram_id INTEGER,
  username TEXT,
  avatar_url TEXT,
  public_key TEXT,          -- Ed25519 public key (hex)
  off_chain_balance INTEGER DEFAULT 0,
  nonce INTEGER DEFAULT 0,
  created_at INTEGER
)

transactions (
  id INTEGER PRIMARY KEY,
  sender TEXT,
  receiver TEXT,
  amount INTEGER,           -- in nanotons
  timestamp INTEGER,
  batch_id INTEGER,         -- NULL until settled
  signature TEXT,           -- Ed25519 hex
  nonce INTEGER
)

batches (
  id INTEGER PRIMARY KEY,
  state_root TEXT,          -- SHA-256 hex (64 chars)
  tx_count INTEGER,
  total_volume INTEGER,
  settled_at INTEGER,
  tx_hash TEXT              -- on-chain transaction hash
)

withdrawals (
  id INTEGER PRIMARY KEY,
  address TEXT,
  amount INTEGER,
  batch_id INTEGER,         -- NULL until processed
  created_at INTEGER
)
```

## Security Model

### Off-chain transfer security

Each transfer is signed with the user's Ed25519 private key (stored in localStorage).
The backend verifies the signature against the stored public key.

**Nonce replay protection:** Each user has a monotonically increasing nonce.
The backend rejects any transfer with a nonce ≠ current expected nonce.

### On-chain security

The TON contract enforces:
1. Only the operator can call `SettleBatch`
2. Batch index must be sequential (prevents gaps or replays)
3. Total withdrawals cannot exceed contract balance
4. Dispute window: 1 hour after each settlement

### Simplified vs Production

This is a **course demo**. Production L2s add:
- Merkle Patricia Trees for state roots (verifiable with Merkle proofs)
- Full bisection fraud proof games
- Decentralized sequencers with BFT consensus
- Forced transaction inclusion (censorship resistance)
- Exit games for emergency fund recovery
