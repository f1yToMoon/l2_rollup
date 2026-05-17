/**
 * Off-chain transfer page.
 * Signs transfer data with the user's local Ed25519 keypair and sends
 * it to the backend. No on-chain transaction is created.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTonAddress } from "@tonconnect/ui-react";
import nacl from "tweetnacl";
import { useTransfer, useBalance } from "../hooks/useApi";
import { tonToNano, formatTon } from "../utils/format";

function getOrCreateKeyPair(address: string): { publicKey: Uint8Array; secretKey: Uint8Array } {
  const storageKey = `keypair_${address}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    const parsed = JSON.parse(stored);
    return {
      publicKey: Uint8Array.from(parsed.publicKey),
      secretKey: Uint8Array.from(parsed.secretKey),
    };
  }
  const kp = nacl.sign.keyPair();
  localStorage.setItem(
    storageKey,
    JSON.stringify({ publicKey: Array.from(kp.publicKey), secretKey: Array.from(kp.secretKey) })
  );
  return kp;
}

function buildTransferMessage(sender: string, receiver: string, amount: number, nonce: number): Uint8Array {
  const payload = JSON.stringify({ sender, receiver, amount, nonce }, Object.keys({ sender, receiver, amount, nonce }).sort());
  // SHA-256 via crypto.subtle is async; use a simple hash for signing
  const enc = new TextEncoder().encode(payload);
  // In production use crypto.subtle.digest("SHA-256", enc) — async
  // For demo we sign the raw payload directly
  return enc;
}

export function TransferPage() {
  const navigate = useNavigate();
  const address = useTonAddress();
  const { data: balance } = useBalance(address);
  const transferMut = useTransfer();

  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ senderBalance: number; receiverBalance: number } | null>(null);

  const handleTransfer = async () => {
    if (!address) return;
    const tons = parseFloat(amount);
    if (isNaN(tons) || tons <= 0) { setErrorMsg("Invalid amount"); return; }
    if (!receiver.trim()) { setErrorMsg("Enter receiver address"); return; }

    const nanoAmount = tonToNano(tons);
    const nonce = balance?.nonce ?? 0;

    const kp = getOrCreateKeyPair(address);
    const message = buildTransferMessage(address, receiver.trim(), nanoAmount, nonce);
    const signedMsg = nacl.sign(message, kp.secretKey);
    const signature = Buffer.from(signedMsg.slice(0, 64)).toString("hex");

    setStatus("pending");
    setErrorMsg("");

    try {
      const data = await transferMut.mutateAsync({
        sender: address,
        receiver: receiver.trim(),
        amount: nanoAmount,
        nonce,
        signature,
      });
      setResult({ senderBalance: data.sender_balance, receiverBalance: data.receiver_balance });
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.response?.data?.detail ?? e?.message ?? "Transfer failed");
    }
  };

  return (
    <div style={styles.page}>
      <button style={styles.back} onClick={() => navigate(-1)}>← Back</button>
      <h2 style={styles.title}>Off-Chain Transfer</h2>
      <p style={styles.sub}>
        Instant, free transfer — no on-chain transaction. Signed with your local keypair.
      </p>

      {balance && (
        <div style={styles.balanceHint}>
          Available: {formatTon(balance.off_chain_balance)}
        </div>
      )}

      <div style={styles.inputGroup}>
        <label style={styles.label}>Receiver Address</label>
        <input
          style={styles.input}
          placeholder="EQ..."
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          disabled={status === "pending"}
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Amount (TON)</label>
        <input
          style={styles.input}
          type="number"
          min="0.000000001"
          step="0.1"
          placeholder="e.g. 1.5"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={status === "pending"}
        />
      </div>

      {errorMsg && <div style={styles.error}>{errorMsg}</div>}

      {status === "success" && result ? (
        <div style={styles.success}>
          <div>✅ Transfer sent instantly!</div>
          <div style={styles.resultRow}>
            Your new balance: <b>{formatTon(result.senderBalance)}</b>
          </div>
          <button style={styles.doneBtn} onClick={() => navigate("/")}>Done</button>
        </div>
      ) : (
        <button
          style={styles.btn}
          onClick={handleTransfer}
          disabled={!address || status === "pending" || !amount || !receiver}
        >
          {status === "pending" ? "Signing & Sending..." : "Send Off-Chain Transfer"}
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
  balanceHint: { fontSize: 13, color: "var(--tg-theme-link-color, #2196f3)", marginBottom: 16, fontWeight: 500 },
  inputGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", padding: "12px 14px", fontSize: 16, border: "1px solid var(--tg-theme-secondary-bg-color, #e0e0e0)", borderRadius: 12, background: "var(--tg-theme-secondary-bg-color, #f5f5f5)", color: "var(--tg-theme-text-color, #000)", outline: "none" },
  btn: { width: "100%", padding: "14px 0", background: "var(--tg-theme-button-color, #2196f3)", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: "pointer" },
  error: { color: "#e53935", fontSize: 13, marginBottom: 12 },
  success: { background: "#e8f5e9", color: "#2e7d32", borderRadius: 12, padding: 16, textAlign: "center", fontSize: 14 },
  resultRow: { marginTop: 8, fontSize: 15 },
  doneBtn: { marginTop: 12, padding: "10px 24px", background: "#43a047", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" },
};
