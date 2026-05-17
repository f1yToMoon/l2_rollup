import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "monospace" }}>
          <h2 style={{ color: "#e53935" }}>Something went wrong</h2>
          <pre style={{ marginTop: 12, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {this.state.error.message}
            {"\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
