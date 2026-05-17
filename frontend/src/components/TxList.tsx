import type { TxRecord } from "../types";
import { formatTon, shortAddress, formatRelative } from "../utils/format";

interface Props {
  transactions: TxRecord[];
  currentAddress?: string;
}

export function TxList({ transactions, currentAddress }: Props) {
  if (!transactions.length) {
    return (
      <div style={styles.empty}>No transactions yet</div>
    );
  }

  return (
    <div style={styles.list}>
      {transactions.map((tx) => {
        const isSender = tx.sender === currentAddress;
        const sign = isSender ? "-" : "+";
        const color = isSender ? "#e53935" : "#43a047";
        const counterparty = isSender ? tx.receiver : tx.sender;

        return (
          <div key={tx.id} style={styles.item}>
            <div style={styles.left}>
              <div style={styles.addr}>
                {isSender ? "To" : "From"}: {shortAddress(counterparty)}
              </div>
              <div style={styles.time}>{formatRelative(tx.timestamp)}</div>
              {tx.batch_id && (
                <div style={styles.batch}>Batch #{tx.batch_id}</div>
              )}
            </div>
            <div style={{ ...styles.amount, color }}>
              {sign}{formatTon(tx.amount, 4)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "var(--tg-theme-bg-color, #fff)",
    borderRadius: 12,
    marginBottom: 4,
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  addr: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--tg-theme-text-color, #000)",
  },
  time: {
    fontSize: 12,
    color: "var(--tg-theme-hint-color, #888)",
  },
  batch: {
    fontSize: 11,
    color: "var(--tg-theme-link-color, #2196f3)",
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: 600,
  },
  empty: {
    textAlign: "center",
    color: "var(--tg-theme-hint-color, #888)",
    padding: "32px 0",
    fontSize: 14,
  },
};
