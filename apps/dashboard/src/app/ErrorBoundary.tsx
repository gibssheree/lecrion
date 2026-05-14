import { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches unhandled render errors and shows a fallback UI.
 * Placed at the app root so a single page crash doesn't take down the shell.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: 16,
            padding: 32,
            background: "var(--bg-base)",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ fontSize: 40 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Terjadi kesalahan yang tidak terduga
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            {this.state.error?.message ?? "Unknown error"}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
