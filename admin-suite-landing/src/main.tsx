import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import './i18n'

// Initialize Sentry when a real DSN is provided via env var
const _landingDsn = import.meta.env.VITE_SENTRY_DSN;
if (_landingDsn && _landingDsn !== 'YOUR_SENTRY_DSN_HERE') {
  Sentry.init({
    dsn: _landingDsn,
    tracesSampleRate: 1.0,
    sendDefaultPii: false, // Keep PII safe
  });
  // Expose a test helper in the browser console: sentryTest()
  (window as any).sentryTest = () => {
    throw new Error('Sentry Landing Page debug error!');
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
