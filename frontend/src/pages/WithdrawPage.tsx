import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTonAddress } from "@tonconnect/ui-react";
import nacl from "tweetnacl";
import { useRequestWithdrawal, useBalance } from "../hooks/useApi";
import { tonToNano, formatTon } from "../utils/format";

function signWithdraw(address: string, amount: number): string {
  const storageKey = `keypair_${address}`;
  const stored = localStorage.getItem(storageKey);
  if (!stored) return "no-key";
  const kp = JSON.parse(stored);
  const payload = JSON.stringify({ address, amount });
  const enc = new TextEncoder().encode(payload);
  const signedMsg = nacl.sign(enc, Uint8Array.from(kp.secretKey));
  return Array.from(signedMsg.slice(0, 64)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function WithdrawPage() {
  const navigate = useNavigate();
  const address = useTonAddress();
  const { data: balance } = useBalance(address);
  const withdrawMut = useRequestWithdrawal();

  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleWithdraw = async () => {
    if (!address) return;
    const tons = parseFloat(amount);
    if (isNaN(tons) || tons <= 0) { setErrorMsg("Invalid amount"); return; }

    const nanoAmount = tonToNano(tons);
    const signature = signWithdraw(address, nanoAmount);

    setStatus("pending");
    setErrorMsg("");

    try {
      await withdrawMut.mutateAsync({ address, amount: nanoAmount, signature });
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.response?.data?.detail ?? e?.message ?? "Request failed");
    }
  };

  return (
    <div style={styles.page}>
      <button style={styles.back} onClick={() => navigate(-1)}>← Back</button>
      <h2 style={styles.title}>Withdraw</h2>
      <p style={styles.sub}>
        Request a withdrawal. Funds will be included in the next settlement batch
        and sent to your on-chain wallet.
      </p>

      {balance && (
        <div style={styles.balanceHint}>
          Off-chain balance: {formatTon(balance.off_chain_balance)}
        </div>
      )}

      <div style={styles.infoBox}>
        <strong>How withdrawals work:</strong>
        <ol style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.8 }}>
          <li>You request a withdrawal amount</li>
          <li>The operator includes it in the next SettleBatch</li>
          <li>The on-chain contract sends TON to your wallet</li>
        </ol>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Amount (TON)</label>
        <input
          style={styles.input}
          type="number"
          min="0.01"
          step="0.1"
          placeholder="e.g. 2.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={status === "pending"}
        />
      </div>

      {errorMsg && <div style={styles.error}>{errorMsg}</div>}

      {status === "success" ? (
        <div style={styles.success}>
          ✅ Withdrawal queued! You will receive your TON after the next settlement batch.
          <button style={styles.doneBtn} onClick={() => navigate("/")}>Back to Home</button>
        </div>
      ) : (
        <button
          style={styles.btn}
          onClick={handleWithdraw}
          disabled={!address || status === "pending" || !amount}
        >
          {status === "pending" ? "Processing..." : "Request Withdrawal"}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "16px 16px 80px" },
  back: { background: "none", border: "none", color: "var(--tg-theme-link-color, #2196f3)", fontSize: 16, cursor: "pointer", paddingLeft: 0, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  sub: { fontSize: 14, color: "var(--tg-theme-hint-color, #888)", marginBottom: 16, lineHeight: 1.5 },
  balanceHint: { fontSize: 13, color: "var(--tg-theme-link-color, #2196f3)", marginBottom: 12, fontWeight: 500 },
  infoBox: { background: "var(--tg-theme-secondary-bg-color, #f5f5f5)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, lineHeight: 1.5 },
  inputGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", padding: "12px 14px", fontSize: 18, border: "1px solid var(--tg-theme-secondary-bg-color, #e0e0e0)", borderRadius: 12, background: "var(--tg-theme-secondary-bg-color, #f5f5f5)", color: "var(--tg-theme-text-color, #000)", outline: "none" },
  btn: { width: "100%", padding: "14px 0", background: "var(--tg-theme-button-color, #2196f3)", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: "pointer" },
  error: { color: "#e53935", fontSize: 13, marginBottom: 12 },
  success: { background: "#e8f5e9", color: "#2e7d32", borderRadius: 12, padding: 16, fontSize: 14 },
  doneBtn: { display: "block", marginTop: 12, padding: "10px 24px", background: "#43a047", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" },
};
