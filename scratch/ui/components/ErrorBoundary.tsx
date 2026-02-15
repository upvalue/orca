import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback to render instead of the default UI */
  fallback?: ReactNode;
  /** If true, show a compact inline error instead of the full-page version */
  inline?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    if (this.props.inline) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-6 py-10">
          <AlertTriangle className="h-6 w-6 text-[var(--destructive)]" />
          <p className="mt-2 text-sm font-medium text-[var(--destructive)]">
            Something went wrong loading this section.
          </p>
          <p className="mt-1 max-w-md text-center text-xs text-[var(--muted-foreground)]">
            {this.state.error?.message}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={this.handleReset}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Try again
          </Button>
        </div>
      );
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-full bg-[var(--destructive)]/10 p-4">
            <AlertTriangle className="h-10 w-10 text-[var(--destructive)]" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 max-w-md text-[var(--muted-foreground)]">
            An unexpected error occurred. You can try refreshing the page or going back.
          </p>
          <p className="mt-2 max-w-lg rounded bg-[var(--muted)] px-3 py-2 font-mono text-xs text-[var(--muted-foreground)]">
            {this.state.error?.message}
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button onClick={() => (window.location.href = '/')}>
              Go to home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
