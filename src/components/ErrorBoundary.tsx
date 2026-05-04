import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Runtime monitoring hook — log to console with structured tag for easy capture
    console.error("[ErrorBoundary]", { message: error.message, stack: error.stack, componentStack: errorInfo.componentStack });
    this.setState({ errorInfo });
    // Forward to a global hook so external monitoring can pick it up
    if (typeof window !== "undefined" && (window as any).__onAppError) {
      try { (window as any).__onAppError(error, errorInfo); } catch {}
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="surface-card rounded-2xl max-w-md w-full p-6 text-center space-y-4 border border-destructive/30">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Something broke</h1>
              <p className="text-xs text-muted-foreground mt-1">
                The app hit an unexpected error. Your data is safe.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] font-mono text-left bg-secondary rounded-md p-2 max-h-32 overflow-auto text-destructive/80">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="h-9 px-4 rounded-lg bg-secondary text-sm font-medium hover:bg-accent transition-colors"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
