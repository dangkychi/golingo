import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { logErrorToServer } from './utils/logger.ts'

// Listen for global unhandled errors
window.onerror = (message, source, lineno, colno, error) => {
  if (error) {
    logErrorToServer(error);
  } else {
    logErrorToServer(new Error(String(message)), { source, lineno, colno });
  }
};

// Listen for global unhandled promise rejections
window.onunhandledrejection = (event) => {
  const reason = event.reason;
  if (reason instanceof Error) {
    logErrorToServer(reason);
  } else {
    logErrorToServer(new Error(reason ? String(reason) : 'Unhandled promise rejection'));
  }
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
