import { formatTon } from "../utils/format";

interface Props {
  label: string;
  nanotons: number;
  sublabel?: string;
}

export function BalanceCard({ label, nanotons, sublabel }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.amount}>{formatTon(nanotons, 4)}</div>
      {sublabel && <div style={styles.sub}>{sublabel}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "var(--tg-theme-secondary-bg-color, #f0f0f0)",
    borderRadius: 16,
    padding: "20px 24px",
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    color: "var(--tg-theme-hint-color, #888)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  amount: {
    fontSize: 32,
    fontWeight: 700,
    color: "var(--tg-theme-text-color, #000)",
  },
  sub: {
    fontSize: 12,
    color: "var(--tg-theme-hint-color, #888)",
    marginTop: 6,
  },
};
