import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTonAddress } from "@tonconnect/ui-react";
import { useContract } from "../hooks/useContract";
import { useConfirmDeposit } from "../hooks/useApi";
import { tonToNano } from "../utils/format";

export function DepositPage() {
  const navigate = useNavigate();
  const address = useTonAddress();
  const { sendDeposit } = useContract();
  const confirmDeposit = useConfirmDeposit();

  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDeposit = async () => {
    if (!address) return;
    const tons = parseFloat(amount);
    if (isNaN(tons) || tons <= 0) {
      setErrorMsg("Enter a valid amount");
      return;
    }

    setStatus("pending");
    setErrorMsg("");

    try {
      // 1. Send on-chain Deposit message via TON Connect
      const boc = await sendDeposit(tons);

      // 2. Confirm with backend (backend credits off-chain balance)
      await confirmDeposit.mutateAsync({
        address,
        amount: tonToNano(tons),
        tx_hash: boc,
      });

      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? "Transaction failed");
    }
  };

  return (
    <div style={styles.page}>
      <button style={styles.back} onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 style={styles.title}>Deposit TON</h2>
      <p style={styles.sub}>
        Send TON to the rollup contract. Your off-chain balance will be credited
        after on-chain confirmation.
      </p>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Amount (TON)</label>
        <input
          style={styles.input}
          type="number"
          min="0.01"
          step="0.1"
          placeholder="e.g. 5.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={status === "pending"}
        />
      </div>

      {errorMsg && <div style={styles.error}>{errorMsg}</div>}

      {status === "success" ? (
        <div style={styles.success}>
          ✅ Deposit confirmed! Your off-chain balance has been updated.
          <button style={styles.doneBtn} onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      ) : (
        <button
          style={styles.btn}
          onClick={handleDeposit}
          disabled={!address || status === "pending" || !amount}
        >
          {status === "pending" ? "Processing..." : "Deposit via TON Connect"}
        </button>
      )}

      {!address && (
        <p style={styles.hint}>Connect your wallet first</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "16px 16px 80px" },
  back: {
    background: "none",
    border: "none",
    color: "var(--tg-theme-link-color, #2196f3)",
    fontSize: 16,
    cursor: "pointer",
    paddingLeft: 0,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  sub: { fontSize: 14, color: "var(--tg-theme-hint-color, #888)", marginBottom: 24, lineHeight: 1.5 },
  inputGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 18,
    border: "1px solid var(--tg-theme-secondary-bg-color, #e0e0e0)",
    borderRadius: 12,
    background: "var(--tg-theme-secondary-bg-color, #f5f5f5)",
    color: "var(--tg-theme-text-color, #000)",
    outline: "none",
  },
  btn: {
    width: "100%",
    padding: "14px 0",
    background: "var(--tg-theme-button-color, #2196f3)",
    color: "var(--tg-theme-button-text-color, #fff)",
    border: "none",
    borderRadius: 14,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    opacity: 1,
  },
  error: { color: "#e53935", fontSize: 13, marginBottom: 12 },
  success: {
    background: "#e8f5e9",
    color: "#2e7d32",
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
    fontSize: 14,
  },
  doneBtn: {
    marginTop: 12,
    padding: "10px 24px",
    background: "#43a047",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    cursor: "pointer",
  },
  hint: { textAlign: "center", color: "var(--tg-theme-hint-color, #888)", fontSize: 13, marginTop: 12 },
};
