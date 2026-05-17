import type { BatchRecord } from "../types";
import { formatTon, formatRelative, shortAddress } from "../utils/format";

interface Props {
  batch: BatchRecord;
  onVerify?: (batchId: number) => void;
  verifyResult?: { match: boolean } | null;
}

export function BatchCard({ batch, onVerify, verifyResult }: Props) {
  const isSettled = !!batch.settled_at;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.batchId}>Batch #{batch.id}</span>
        <span style={isSettled ? styles.settled : styles.pending}>
          {isSettled ? "Settled" : "Pending"}
        </span>
      </div>

      <div style={styles.info}>
        <Row label="Transactions" value={String(batch.tx_count)} />
        <Row label="Volume" value={formatTon(batch.total_volume)} />
        {batch.settled_at && (
          <Row label="Settled" value={formatRelative(batch.settled_at)} />
        )}
        <Row
          label="State Root"
          value={`${batch.state_root.slice(0, 16)}...`}
        />
        {batch.tx_hash && (
          <Row label="TX Hash" value={shortAddress(batch.tx_hash, 8)} />
        )}
      </div>

      {isSettled && onVerify && (
        <button style={styles.verifyBtn} onClick={() => onVerify(batch.id)}>
          Verify State Root
        </button>
      )}

      {verifyResult !== null && verifyResult !== undefined && (
        <div style={verifyResult.match ? styles.ok : styles.mismatch}>
          {verifyResult.match
            ? "✅ Verified — state root matches"
            : "❌ Mismatch — consider raising a dispute"}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 13, color: "var(--tg-theme-hint-color, #888)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "var(--tg-theme-secondary-bg-color, #f5f5f5)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  batchId: {
    fontSize: 16,
    fontWeight: 700,
  },
  settled: {
    fontSize: 12,
    color: "#43a047",
    background: "#e8f5e9",
    padding: "2px 8px",
    borderRadius: 8,
  },
  pending: {
    fontSize: 12,
    color: "#f57c00",
    background: "#fff3e0",
    padding: "2px 8px",
    borderRadius: 8,
  },
  info: {
    marginBottom: 12,
  },
  verifyBtn: {
    width: "100%",
    padding: "10px 0",
    background: "var(--tg-theme-button-color, #2196f3)",
    color: "var(--tg-theme-button-text-color, #fff)",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  ok: {
    marginTop: 8,
    padding: "8px 12px",
    background: "#e8f5e9",
    color: "#2e7d32",
    borderRadius: 8,
    fontSize: 13,
    textAlign: "center",
  },
  mismatch: {
    marginTop: 8,
    padding: "8px 12px",
    background: "#ffebee",
    color: "#c62828",
    borderRadius: 8,
    fontSize: 13,
    textAlign: "center",
  },
};
