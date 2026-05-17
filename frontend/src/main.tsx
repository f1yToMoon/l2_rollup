import React from "react";
import ReactDOM from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5000 },
  },
});

const MANIFEST_URL =
  import.meta.env.VITE_MANIFEST_URL ??
  `${window.location.origin}/tonconnect-manifest.json`;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </TonConnectUIProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
