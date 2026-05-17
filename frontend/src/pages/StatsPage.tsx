import { useStats } from "../hooks/useApi";
import { formatTon } from "../utils/format";

export function StatsPage() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) return <div style={styles.loading}>Loading stats...</div>;
  if (!stats) return null;

  const compressionPercent =
    stats.total_on_chain_settlements > 0
      ? Math.round((1 - 1 / stats.compression_ratio) * 100)
      : 0;

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Rollup Statistics</h2>
      <p style={styles.sub}>
        Demonstrating the L2 scaling effect: many off-chain transactions
        compressed into few on-chain settlements.
      </p>

      {/* Main scaling metric */}
      <div style={styles.hero}>
        <div style={styles.heroNumber}>{stats.compression_ratio.toFixed(1)}x</div>
        <div style={styles.heroLabel}>Compression Ratio</div>
        <div style={styles.heroSub}>
          {stats.total_off_chain_tx} off-chain tx / {stats.total_on_chain_settlements} on-chain settlements
        </div>
      </div>

      {/* Stats grid */}
      <div style={styles.grid}>
        <StatCard label="Off-Chain Transactions" value={String(stats.total_off_chain_tx)} color="#2196f3" />
        <StatCard label="On-Chain Settlements" value={String(stats.total_on_chain_settlements)} color="#4caf50" />
        <StatCard label="Pending (unsettled)" value={String(stats.pending_tx_count)} color="#ff9800" />
        <StatCard label="Gas Saved" value={formatTon(stats.estimated_gas_saved_nanotons)} color="#9c27b0" />
        <StatCard label="Total Volume" value={formatTon(stats.total_volume_nanotons)} color="#f44336" />
        <StatCard label="% Gas Saved" value={`~${compressionPercent}%`} color="#00bcd4" />
      </div>

      <div style={styles.explanation}>
        <h3 style={styles.expTitle}>How this compares to L1</h3>
        <p style={styles.expText}>
          On TON L1, each of the {stats.total_off_chain_tx} transactions would cost ~0.01 TON
          in gas fees. With Mini Rollup, only {stats.total_on_chain_settlements} on-chain
          transactions were needed — saving approximately{" "}
          <strong>{formatTon(stats.estimated_gas_saved_nanotons)}</strong> in gas.
        </p>
        <p style={styles.expText}>
          This is the fundamental value proposition of Optimistic Rollups like Arbitrum and
          Optimism on Ethereum — batch execution with on-chain settlement.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "16px 16px 80px" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  sub: { fontSize: 14, color: "var(--tg-theme-hint-color, #888)", marginBottom: 20, lineHeight: 1.5 },
  loading: { textAlign: "center", padding: "48px 0", color: "var(--tg-theme-hint-color, #888)" },
  hero: {
    background: "var(--tg-theme-button-color, #2196f3)",
    color: "var(--tg-theme-button-text-color, #fff)",
    borderRadius: 20,
    padding: "24px 16px",
    textAlign: "center",
    marginBottom: 20,
  },
  heroNumber: { fontSize: 56, fontWeight: 800, lineHeight: 1 },
  heroLabel: { fontSize: 16, fontWeight: 600, marginTop: 4 },
  heroSub: { fontSize: 13, opacity: 0.8, marginTop: 6 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    background: "var(--tg-theme-secondary-bg-color, #f5f5f5)",
    borderRadius: 14,
    padding: "16px 12px",
    textAlign: "center",
  },
  statValue: { fontSize: 24, fontWeight: 700, lineHeight: 1.2 },
  statLabel: { fontSize: 12, color: "var(--tg-theme-hint-color, #888)", marginTop: 4 },
  explanation: {
    background: "var(--tg-theme-secondary-bg-color, #f5f5f5)",
    borderRadius: 14,
    padding: 16,
  },
  expTitle: { fontSize: 15, fontWeight: 700, marginBottom: 8 },
  expText: { fontSize: 13, lineHeight: 1.6, color: "var(--tg-theme-text-color, #000)", marginBottom: 8 },
};
