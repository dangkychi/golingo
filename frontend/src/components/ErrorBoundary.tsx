import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logErrorToServer } from '../utils/logger';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logErrorToServer(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0a0a0c',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</span>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: '#00e5ff',
          }}>
            Oops, something went wrong!
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#9e9e9e',
            maxWidth: '500px',
            lineHeight: '1.6',
            marginBottom: '2rem',
          }}>
            An unexpected error has occurred. The development team has been notified automatically.
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
          }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#0a0a0c',
                backgroundColor: '#00e5ff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseOut={(e) => (e.currentTarget.style.filter = 'brightness(1.0)')}
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
            >
              Reset App Data
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: '3rem',
              padding: '1rem',
              backgroundColor: '#16161a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#ff5252',
              textAlign: 'left',
              maxWidth: '800px',
              overflowX: 'auto',
            }}>
              {this.state.error.toString()}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
