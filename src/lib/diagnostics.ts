export type ClientDiagnosticLevel = 'info' | 'warning' | 'error' | 'fatal';

export interface ClientDiagnosticEvent {
  level: ClientDiagnosticLevel;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export function reportClientDiagnostic(event: ClientDiagnosticEvent): void {
  fetch('/api/setup/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(event),
  }).catch(() => {
    // Diagnostics must never create a second user-facing failure.
  });
}

export function installClientDiagnostics(surface: string, target: Window = window): void {
  target.addEventListener('error', (event) => {
    const error = event.error instanceof Error ? event.error : undefined;
    reportClientDiagnostic({
      level: 'error',
      message: error?.message || event.message || 'Unhandled browser error',
      stack: error?.stack,
      context: {
        surface,
        type: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: target.location?.href,
      },
    });
  });

  target.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason : undefined;
    reportClientDiagnostic({
      level: 'error',
      message: reason?.message || String(event.reason || 'Unhandled promise rejection'),
      stack: reason?.stack,
      context: {
        surface,
        type: 'window.unhandledrejection',
        url: target.location?.href,
      },
    });
  });
}
