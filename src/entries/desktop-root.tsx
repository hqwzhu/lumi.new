import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '../contexts/AppContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DesktopApp } from './desktop';
import { installClientDiagnostics } from '../lib/diagnostics';

installClientDiagnostics('desktop');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <DesktopApp />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);
