# Mini Rollup — Off-Chain Payment Batch with On-Chain Settlement

A simplified L2 rollup implementation on the **TON blockchain** as a Telegram Mini App.

Demonstrates the core principles of Optimistic Rollups:
- **Off-chain execution** — instant, gas-free transfers between users
- **Batching** — many off-chain transactions → one on-chain settlement
- **On-chain settlement** — state root published to TON smart contract
- **Verification** — any user can verify the state root locally
- **Dispute** — users can challenge incorrect settlements

## Architecture

```
Telegram Mini App (React)
        │
        ├── TON Connect ──────────────► TON Blockchain
        │   (Deposit, Withdraw)          (MiniRollup contract)
        │                                      ▲
        └── Backend API (FastAPI) ─────────────┘
            (off-chain transfers,         (SettleBatch message)
             state management,
             batch settlement)
```

## Project Structure

```
mini-rollup/
├── contracts/          # Tact smart contract (Blueprint project)
├── backend/            # Python FastAPI sequencer
├── frontend/           # React + TypeScript Telegram Mini App
├── docs/               # Architecture docs, demo script
└── docker-compose.yml  # One-command local setup
```

---

## Quick Start (Docker)

```bash
# 1. Clone repo
git clone <repo_url> && cd mini-rollup

# 2. Copy env template
cp backend/.env.example .env
# Edit .env — add your CONTRACT_ADDRESS and TONCENTER_API_KEY

# 3. Start everything
docker compose up --build

# Backend:  http://localhost:8000
# Frontend: http://localhost:5173
# API docs: http://localhost:8000/docs
```

---

## Manual Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| Python | 3.11+ |
| npm | 9+ |

---

### Step 1 — Smart Contract

```bash
cd contracts

# Install dependencies
npm install

# Build contract (generates TypeScript wrapper from Tact source)
npx blueprint build

# Run tests
npx blueprint test

# Deploy to TON Testnet
# (requires Tonkeeper wallet in testnet mode)
npx blueprint run deploy --testnet
```

After deployment, note the contract address printed in the console.

> **Testnet TON**: Get free testnet TON from [@testgiver_ton_bot](https://t.me/testgiver_ton_bot)

---

### Step 2 — Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env:
#   CONTRACT_ADDRESS=<your deployed contract address>
#   OPERATOR_MNEMONIC=<24-word mnemonic of operator wallet>
#   TONCENTER_API_KEY=<from https://toncenter.com>
#   OPERATOR_API_KEY=<choose any secret string>

# Start server
uvicorn main:app --reload --port 8000
```

API documentation: http://localhost:8000/docs

#### Run backend tests

```bash
cd backend
pytest tests/ -v
```

---

### Step 3 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cat > .env << EOF
VITE_API_URL=http://localhost:8000
VITE_CONTRACT_ADDRESS=<your deployed contract address>
VITE_MANIFEST_URL=http://localhost:5173/tonconnect-manifest.json
EOF

# Start dev server
npm run dev
```

---

### Step 4 — Telegram Bot + Mini App

```bash
# 1. Create bot via @BotFather
#    /newbot → choose name → get token

# 2. Expose local frontend via ngrok (for development)
npx ngrok http 5173
# → Get URL like: https://abc123.ngrok.io

# 3. Register Mini App in BotFather:
#    /newapp → select your bot → enter ngrok URL

# 4. Update tonconnect-manifest.json with your domain
```

---

### Step 5 — Settle Batches (Operator)

The operator endpoint creates on-chain settlements:

```bash
# Manually trigger settlement
curl -X POST http://localhost:8000/api/settle \
  -H "Content-Type: application/json" \
  -d '{"operator_key": "your-OPERATOR_API_KEY"}'
```

---

## User Flow

1. **Connect wallet** — open TMA → TON Connect
2. **Deposit** — send TON to rollup contract (on-chain)
3. **Transfer** — send TON to anyone instantly (off-chain, free)
4. **Accumulate** — 10–50 transfers happen off-chain
5. **Settle** — operator batches all transfers into 1 on-chain tx
6. **Verify** — user checks: client-recomputed state root == on-chain root
7. **Withdraw** — request withdrawal → included in next settlement batch

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register user + public key |
| POST | `/api/deposit/confirm` | Credit deposit after on-chain confirmation |
| GET | `/api/balance/{address}` | Off-chain balance + nonce |
| GET | `/api/history/{address}` | Transaction history |
| POST | `/api/transfer` | Off-chain transfer (signed) |
| POST | `/api/withdraw/request` | Queue withdrawal |
| GET | `/api/batches` | All settlement batches |
| GET | `/api/batch/{id}` | Batch details + transactions |
| GET | `/api/verify/{id}` | Data for client-side state root verification |
| POST | `/api/settle` | Operator: form + settle batch |
| GET | `/api/stats` | Compression ratio + gas savings |

---

## Smart Contract

Written in **Tact 1.x** (TON smart contract language).

### Messages

| Message | Sender | Description |
|---------|--------|-------------|
| `Deposit` | Any user | Deposit TON into rollup |
| `SettleBatch` | Operator | Settle a batch + process withdrawals |
| `Dispute` | Any user | Challenge incorrect settlement |
| `ResolveDispute` | Operator | Resolve active dispute |
| `Withdraw` | Any user | Direct withdrawal (after dispute window) |

### Getters

```typescript
getDeposit(addr: Address): Int
getStateRoot(): Int
getBatchIndex(): Int
isDisputed(): Bool
getDisputeDeadline(): Int
getContractBalance(): Int
```

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Smart Contract | Tact 1.x |
| Contract Testing | Jest + @ton/sandbox |
| Contract Deploy | Blueprint |
| Backend | Python 3.11 + FastAPI |
| Database | SQLite + aiosqlite |
| Signatures | Ed25519 (PyNaCl / tweetnacl) |
| Frontend | React 18 + TypeScript + Vite |
| Wallet | @tonconnect/ui-react 2.x |
| TON SDK | @ton/core + @ton/ton |
| Telegram SDK | @telegram-apps/sdk-react 2.x |
| State Management | @tanstack/react-query |

---

## Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel / Netlify / GitHub Pages
```

### Backend (Railway / Render)

```bash
# Set environment variables in Railway/Render dashboard
# Deploy from GitHub
```

Update `VITE_API_URL` in the frontend `.env` to point to your hosted backend.

---

## Comparison with Real Rollups

| Feature | This Project | Real Optimistic Rollup |
|---------|-------------|----------------------|
| State root | SHA-256 of JSON balances | Merkle Patricia Tree |
| Fraud proof | Simple dispute flag | Full bisection game |
| Challenge period | 1 hour (demo) | 7 days |
| Sequencer | Centralized (one operator) | Decentralized |
| Throughput | ~50 tx/batch | Thousands/batch |

---

## License

MIT
