import { useNavigate } from "react-router-dom";
import { useTonAddress } from "@tonconnect/ui-react";
import { WalletButton } from "../components/WalletButton";
import { BalanceCard } from "../components/BalanceCard";
import { TxList } from "../components/TxList";
import { useBalance, useHistory } from "../hooks/useApi";
import { useTelegram } from "../hooks/useTelegram";
import { shortAddress } from "../utils/format";

export function HomePage() {
  const navigate = useNavigate();
  const address = useTonAddress();
  const { data: balance } = useBalance(address);
  const { data: history } = useHistory(address, 5);
  const { tgUser } = useTelegram();

  return (
    <div style={styles.page}>
      {/* Profile header */}
      <div style={styles.header}>
        {tgUser?.photoUrl && (
          <img src={tgUser.photoUrl} alt="avatar" style={styles.avatar} />
        )}
        <div>
          <div style={styles.username}>
            {tgUser?.username ? `@${tgUser.username}` : "Mini Rollup"}
          </div>
          {address && (
            <div style={styles.addressText}>{shortAddress(address)}</div>
          )}
        </div>
      </div>

      <WalletButton />

      {address ? (
        <>
          {/* Balances */}
          <div style={styles.balances}>
            <BalanceCard
              label="Off-Chain Balance"
              nanotons={balance?.off_chain_balance ?? 0}
              sublabel="Available for instant transfers"
            />
          </div>

          {/* Action buttons */}
          <div style={styles.actions}>
            <ActionBtn label="Deposit" icon="⬇️" onClick={() => navigate("/deposit")} />
            <ActionBtn label="Transfer" icon="➡️" onClick={() => navigate("/transfer")} />
            <ActionBtn label="Withdraw" icon="⬆️" onClick={() => navigate("/withdraw")} />
          </div>

          {/* Recent transactions */}
          <Section title="Recent Transactions">
            <TxList transactions={history ?? []} currentAddress={address} />
          </Section>
        </>
      ) : (
        <div style={styles.connect}>
          <p style={styles.connectText}>
            Connect your TON wallet to start using the Mini Rollup
          </p>
          <p style={styles.connectSub}>
            Instant off-chain payments · On-chain settlement · Verifiable state
          </p>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button style={styles.actionBtn} onClick={onClick}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={styles.actionLabel}>{label}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "16px 16px 80px" },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    objectFit: "cover",
  },
  username: {
    fontSize: 16,
    fontWeight: 600,
  },
  addressText: {
    fontSize: 12,
    color: "var(--tg-theme-hint-color, #888)",
    fontFamily: "monospace",
  },
  balances: { marginTop: 16 },
  actions: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "16px 8px",
    background: "var(--tg-theme-secondary-bg-color, #f0f0f0)",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--tg-theme-text-color, #000)",
  },
  connect: {
    marginTop: 48,
    textAlign: "center",
    padding: "0 24px",
  },
  connectText: {
    fontSize: 16,
    fontWeight: 500,
    marginBottom: 8,
  },
  connectSub: {
    fontSize: 13,
    color: "var(--tg-theme-hint-color, #888)",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--tg-theme-hint-color, #888)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 8,
  },
};
