import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '../contexts/AppContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MobileApp } from './mobile';
import { installClientDiagnostics } from '../lib/diagnostics';

installClientDiagnostics('mobile');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <MobileApp />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);
