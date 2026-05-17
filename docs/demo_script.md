# Demo Script — Mini Rollup

## Setup (before demo)

1. Deploy contract to TON Testnet
2. Start backend: `uvicorn main:app --reload --port 8000`
3. Start frontend: `npm run dev`
4. Open ngrok: `npx ngrok http 5173`
5. Set ngrok URL in BotFather Mini App settings
6. Have 2 Tonkeeper accounts ready (Alice and Bob) with testnet TON

---

## Demo Flow (~10 minutes)

### Part 1 — The Problem (2 min)

> "Ethereum L1 processes 12–15 transactions per second. Each costs $0.50–$10 in gas.
> For a payments app, this is unusable. Layer 2 rollups solve this."

> "We built a simplified rollup on TON to demonstrate the core principle:
> off-chain execution with on-chain settlement."

---

### Part 2 — Deposit (1 min)

**[Alice's phone]**

1. Open Telegram → start bot → open Mini App
2. Connect wallet (Tonkeeper) → TON Connect popup
3. Navigate to **Deposit** page
4. Enter 5 TON → tap "Deposit via TON Connect"
5. Confirm in Tonkeeper

> "Alice just locked 5 TON in the rollup contract on TON Testnet.
> Watch the URL — no page reload, the balance updates instantly."

**Show:** Off-chain balance → 5.000 TON

---

### Part 3 — Off-Chain Transfers (3 min)

**[Alice's phone]**

1. Go to **Transfer** page
2. Enter Bob's address, 1.5 TON
3. Tap "Send Off-Chain Transfer"
4. ✅ Instantaneous! No wallet popup, no gas fee

> "This transfer happened in milliseconds. No on-chain transaction was created.
> Alice's keypair signed the transfer, the backend verified the signature and
> updated the off-chain state."

**Repeat 3–4 more times** (Alice→Bob, Bob→Alice, etc.)

> "We just did 5 transfers. Without rollup, that's 5 on-chain transactions.
> With rollup — zero on-chain transactions so far."

---

### Part 4 — Settlement (2 min)

> "The operator now compresses all these off-chain transfers into a single on-chain transaction."

```bash
# In terminal
curl -X POST http://localhost:8000/api/settle \
  -H "Content-Type: application/json" \
  -d '{"operator_key": "dev-operator-key"}'
```

**Show API response:** `tx_count: 5, state_root: "abc123..."`

> "5 off-chain transactions → 1 on-chain SettleBatch message.
> The contract stores the new state root — a SHA-256 hash of everyone's balances."

Go to **Batches** page → show Batch #1 with 5 transactions.

---

### Part 5 — Verification (1 min)

**[On BatchesPage]**

1. Tap **Verify State Root** on Batch #1
2. Show result: ✅ Verified

> "Alice just independently verified the settlement.
> The frontend downloaded the balance data, recomputed the SHA-256 hash,
> and compared it with the on-chain state root. They match."

> "This is the data availability principle — anyone can verify the operator
> didn't cheat, without trusting the backend."

---

### Part 6 — Stats (1 min)

Navigate to **Stats** page:

> "We made 5 off-chain transfers but only 1 on-chain settlement.
> That's a 5x compression ratio.
>
> In real L2s like Arbitrum, batches contain thousands of transactions.
> Compression ratios of 100x–1000x are common.
>
> Each L1 transaction costs ~0.01 TON. We saved ~0.04 TON just in this demo."

---

### Part 7 — Dispute (optional, 1 min)

> "What if the operator posts incorrect state? Users can dispute."

1. Go to Batches page
2. If state root mismatches → "❌ Mismatch" badge appears
3. User calls Dispute message (within 1-hour window)
4. Contract marks `disputed = true`, operator must resolve

> "In real Optimistic Rollups like Arbitrum, this triggers a 7-day fraud proof
> game where the specific incorrect step is pinpointed. We simplified it to a flag."

---

## Key Talking Points

| Concept | Demo Evidence |
|---------|--------------|
| Off-chain execution | Transfers happen with no Tonkeeper popup |
| Sequencer | Backend API = our centralized operator |
| Batching | 5 transfers → 1 settlement tx |
| State root | SHA-256 stored on-chain, verified by client |
| Data availability | GET /api/verify/{id} — all data publicly accessible |
| Fraud proof | Dispute button → contract disputed=true |
| Gas savings | Stats page: estimated_gas_saved |
| Scaling trilemma | L1 = security, L2 = scalability, backend = some trust |

---

## Analogy to Arbitrum/Optimism

> "What we built is functionally identical to Optimistic Rollup fundamentals:
>
> - Our backend = Arbitrum's sequencer
> - Our SettleBatch = Arbitrum's batch submission to Ethereum
> - Our state root = Arbitrum's state commitment
> - Our Dispute = Arbitrum's fraud proof challenge
> - Our 1-hour window = Arbitrum's 7-day challenge period
>
> The difference is scale: Arbitrum handles 1000+ TPS with cryptographic fraud proofs.
> We demonstrated the same principle with a 5-transaction batch on TON Testnet."
