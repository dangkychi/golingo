const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export interface ClientErrorPayload {
  message: string;
  url?: string;
  stack?: string;
  user_agent?: string;
  user_id?: string;
}

export const logErrorToServer = async (error: Error, info?: any) => {
  // Always log to console first
  console.error("Caught error:", error, info);

  try {
    let userId = '';
    // Try to get userId from localStorage or parse JWT if exists
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payload = JSON.parse(atob(payloadBase64));
          userId = payload.user_id || payload.id || '';
        }
      } catch {
        // Ignore parsing errors
      }
    }

    const payload: ClientErrorPayload = {
      message: error.message || 'Unknown Javascript error',
      url: window.location.href,
      stack: error.stack || (info && JSON.stringify(info)) || '',
      user_agent: navigator.userAgent,
      user_id: userId || undefined,
    };

    // Use sendBeacon or standard fetch
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE_URL}/logs/error`, blob);
    } else {
      await fetch(`${API_BASE_URL}/logs/error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }
  } catch (loggingError) {
    // Fail silently to prevent infinite loops of error reporting
    console.error("Failed to log error to server:", loggingError);
  }
};
