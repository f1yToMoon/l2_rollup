import { useState } from "react";
import { useBatches, useVerifyBatch } from "../hooks/useApi";
import { BatchCard } from "../components/BatchCard";
import type { VerifyResult } from "../types";
import { computeStateRootAsync } from "../utils/verify";

export function BatchesPage() {
  const { data: batches, isLoading } = useBatches();
  const verifyMut = useVerifyBatch();
  const [verifyResults, setVerifyResults] = useState<Record<number, VerifyResult>>({});
  const [localVerifyResults, setLocalVerifyResults] = useState<Record<number, { match: boolean; serverRoot: string; clientRoot: string }>>({});

  const handleVerify = async (batchId: number) => {
    try {
      // 1. Fetch batch data + server-stored state root
      const result = await verifyMut.mutateAsync(batchId);
      setVerifyResults((prev) => ({ ...prev, [batchId]: result }));

      // 2. Re-compute state root client-side and compare
      const clientRoot = await computeStateRootAsync(result.balances);
      const serverRoot = result.stored_state_root;
      setLocalVerifyResults((prev) => ({
        ...prev,
        [batchId]: { match: clientRoot === serverRoot, serverRoot, clientRoot },
      }));
    } catch (e) {
      console.error("Verify failed", e);
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Settlement Batches</h2>
      <p style={styles.sub}>
        Each batch compresses multiple off-chain transactions into one on-chain settlement.
        Tap "Verify" to independently check the state root.
      </p>

      {isLoading && <div style={styles.loading}>Loading batches...</div>}

      {batches?.length === 0 && !isLoading && (
        <div style={styles.empty}>No batches yet — off-chain transfers are accumulating</div>
      )}

      {batches?.map((batch) => {
        const lr = localVerifyResults[batch.id];
        return (
          <div key={batch.id}>
            <BatchCard
              batch={batch}
              onVerify={handleVerify}
              verifyResult={lr ? { match: lr.match } : null}
            />
            {lr && !lr.match && (
              <div style={styles.mismatchDetail}>
                <div>Server root: <code>{lr.serverRoot.slice(0, 16)}...</code></div>
                <div>Client root: <code>{lr.clientRoot.slice(0, 16)}...</code></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "16px 16px 80px" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  sub: { fontSize: 14, color: "var(--tg-theme-hint-color, #888)", marginBottom: 20, lineHeight: 1.5 },
  loading: { textAlign: "center", padding: "32px 0", color: "var(--tg-theme-hint-color, #888)" },
  empty: { textAlign: "center", padding: "48px 16px", color: "var(--tg-theme-hint-color, #888)", fontSize: 14 },
  mismatchDetail: { background: "#ffebee", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginTop: -8, marginBottom: 12, fontFamily: "monospace" },
};
