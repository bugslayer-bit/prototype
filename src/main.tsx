import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./shared/context/AuthContext";
import "./styles.css";

/* ── Global Error Boundary — catches runtime crashes and displays info ── */
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[IFMIS ErrorBoundary]", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: "system-ui, sans-serif", maxWidth: 800, margin: "40px auto" }}>
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 24 }}>
            <h1 style={{ color: "#991b1b", fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ color: "#b91c1c", fontSize: 14, margin: "0 0 16px" }}>
              The application encountered a runtime error. Details below:
            </p>
            <pre style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, fontSize: 12, overflow: "auto", maxHeight: 200, color: "#dc2626" }}>
              {this.state.error?.toString()}
            </pre>
            {this.state.errorInfo && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Component Stack</summary>
                <pre style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, fontSize: 11, overflow: "auto", maxHeight: 300, marginTop: 8, color: "#4b5563" }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.href = "/"; }}
              style={{ marginTop: 16, padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider appMode="admin" defaultRole="admin">
          <App />
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
