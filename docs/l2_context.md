# Layer 2 Context — For Presentation

## Why L2?

### The Scalability Trilemma (Vitalik Buterin)

A blockchain can only achieve **two of three** at a time:

```
        Security
           △
          / \
         /   \
        /     \
       /  ???  \
      /─────────\
Decentralization ─────── Scalability
```

- **Ethereum L1** = Security + Decentralization (sacrifices scalability: 12–15 TPS)
- **Centralized DB** = Security + Scalability (sacrifices decentralization)
- **L2 Rollups** = all three, by separating execution from consensus

---

## How Rollups Work

```
User Transaction
      │
      ▼
Sequencer (off-chain)
      │ batch of 1000 txs
      ▼
L1 Smart Contract ──► stores state root
                  ──► verifies batch proof
```

**Key insight:** Execution is cheap (off-chain), verification is what's expensive (on-chain).
By publishing only a **commitment** (state root) + proof, we get L1 security with L2 speed.

---

## Two Types of Rollups

### Optimistic Rollup (Arbitrum, Optimism, Base)

- **Assumption:** Transactions are valid by default (optimistic)
- **Security:** 7-day challenge window — anyone can submit a fraud proof
- **Finality:** ~1 week (limited by challenge period)
- **Proof:** Bisection fraud proof (interactive)
- **Current TPS:** 40–2000+ TPS

### ZK Rollup (zkSync, Polygon zkEVM, Starknet)

- **Assumption:** Every batch includes a validity proof
- **Security:** Cryptographically proven — can't be incorrect
- **Finality:** Minutes (once proof verified on L1)
- **Proof:** ZK-SNARK or ZK-STARK (non-interactive)
- **Current TPS:** 2000+ TPS

### Our Project

We implement a **simplified Optimistic Rollup** because:
1. ZK proofs require complex cryptography (zkSNARKs/zkSTARKs)
2. Optimistic rollup logic is clearer for educational purposes
3. The dispute/challenge mechanism illustrates trust without cryptographic proofs

---

## State Root

The state root is the key data structure that links L2 to L1.

### Real rollup: Merkle Patricia Tree

```
       root_hash
      /          \
   hash(AB)    hash(CD)
   /     \      /    \
h(A)   h(B)  h(C)  h(D)
 |      |      |     |
[A]    [B]    [C]   [D]
```

Allows **Merkle proofs**: prove that balance[Alice] = X using O(log n) hashes,
without revealing all other balances.

### Our project: SHA-256 of JSON

```python
state_root = sha256(json.dumps(sorted(all_balances)))
# → "a3f2c1e4b8d9..."
```

Simpler, but can't generate individual balance proofs (must reveal all balances).
Sufficient for course demonstration.

---

## Data Availability

**The fundamental question:** If the sequencer goes offline, can users recover their funds?

Real rollups post all transaction data to L1 (calldata) — so anyone can reconstruct state.
EIP-4844 (Proto-Danksharding) on Ethereum further reduces this cost via "blobs".

Our project: `GET /api/batch/{id}` — all transaction data is publicly accessible.
This is a **trusted data availability** model (centralized backend).

---

## Gas Savings Calculation

For Ethereum Arbitrum (as reference):
- L1 ETH transfer: ~21,000 gas ≈ $0.50–$5
- Arbitrum transfer: ~50,000 gas on L2 ≈ $0.001–$0.01
- Batch of 1000 txs: share L1 calldata cost of ~1 transaction

For our TON demonstration:
- TON L1 transfer: ~0.01 TON ≈ $0.05
- Mini Rollup off-chain transfer: $0.00
- 23 off-chain txs → 1 on-chain settlement = 22x savings on this batch

---

## TON vs Ethereum L2

TON has a different architecture than Ethereum:
- TON has native sharding (similar to L2 but at L1)
- TON's actor model allows async message passing
- TON's TVM is different from EVM

However, the **rollup principles** are identical:
1. Off-chain execution
2. On-chain commitment (state root)
3. Challenge mechanism
4. Data availability

Our project demonstrates these principles on TON using Tact smart contracts.

---

## Real-World Impact

| Protocol | TVL (2024) | Daily TPS | L1 Savings |
|----------|-----------|-----------|-----------|
| Arbitrum One | $3B+ | 2000+ | 90-95% |
| Optimism | $1B+ | 400+ | 85-90% |
| Base (Coinbase) | $1B+ | 300+ | 85-90% |
| zkSync Era | $500M+ | 1000+ | 97%+ |

Total L2 TVL: **$10B+** (2024)

This demonstrates that rollups are not academic — they're the primary scaling solution
for Ethereum and increasingly relevant for other chains including TON.
