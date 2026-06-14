import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '../contexts/AppContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { WebApp } from './web';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <WebApp />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);
