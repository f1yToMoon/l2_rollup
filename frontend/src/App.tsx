import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useTonAddress } from "@tonconnect/ui-react";
import { useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { DepositPage } from "./pages/DepositPage";
import { TransferPage } from "./pages/TransferPage";
import { WithdrawPage } from "./pages/WithdrawPage";
import { BatchesPage } from "./pages/BatchesPage";
import { StatsPage } from "./pages/StatsPage";
import { useRegisterUser } from "./hooks/useApi";
import { useTelegram } from "./hooks/useTelegram";

function AutoRegister() {
  const address = useTonAddress();
  const { tgUser } = useTelegram();
  const register = useRegisterUser();

  useEffect(() => {
    if (!address) return;
    const storageKey = `keypair_${address}`;
    let publicKeyHex = "";

    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const kp = JSON.parse(stored);
      publicKeyHex = (kp.publicKey as number[]).map((b: number) => b.toString(16).padStart(2, "0")).join("");
    } else {
      // Generate keypair on first connection
      import("tweetnacl").then((nacl) => {
        const kp = nacl.default.sign.keyPair();
        localStorage.setItem(storageKey, JSON.stringify({
          publicKey: Array.from(kp.publicKey),
          secretKey: Array.from(kp.secretKey),
        }));
        publicKeyHex = Array.from(kp.publicKey).map(b => b.toString(16).padStart(2, "0")).join("");
        register.mutate({
          address,
          public_key: publicKeyHex,
          telegram_id: tgUser?.id,
          username: tgUser?.username,
          avatar_url: tgUser?.photoUrl,
        });
      });
      return;
    }

    register.mutate({
      address,
      public_key: publicKeyHex,
      telegram_id: tgUser?.id,
      username: tgUser?.username,
      avatar_url: tgUser?.photoUrl,
    });
  }, [address]);

  return null;
}

function BottomNav() {
  const loc = useLocation();

  const items = [
    { to: "/", label: "Home", icon: "🏠" },
    { to: "/batches", label: "Batches", icon: "📦" },
    { to: "/stats", label: "Stats", icon: "📊" },
  ];

  return (
    <nav style={styles.nav}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          style={({ isActive }) => ({
            ...styles.navItem,
            color: isActive
              ? "var(--tg-theme-button-color, #2196f3)"
              : "var(--tg-theme-hint-color, #888)",
          })}
        >
          <span style={styles.navIcon}>{item.icon}</span>
          <span style={styles.navLabel}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AutoRegister />
      <div style={{ minHeight: "100vh", background: "var(--tg-theme-bg-color, #fff)" }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/deposit" element={<DepositPage />} />
          <Route path="/transfer" element={<TransferPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/batches" element={<BatchesPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-around",
    background: "var(--tg-theme-secondary-bg-color, #f5f5f5)",
    borderTop: "1px solid rgba(0,0,0,0.08)",
    padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
    zIndex: 1000,
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    textDecoration: "none",
    padding: "4px 16px",
  },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, fontWeight: 500 },
};
