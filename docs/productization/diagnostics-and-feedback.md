# Diagnostics And Feedback

This guide explains how Lumi OS collects local diagnostics and how support should handle user reports.

## What The App Captures

Lumi OS writes local diagnostic events to:

```text
%USERPROFILE%\LumiOS\data\diagnostics\lumi-diagnostics.jsonl
```

Captured events include:

- React render failures caught by `ErrorBoundary`.
- Browser `window.error` events.
- Browser `unhandledrejection` events.
- Server uncaught exceptions.
- Server unhandled promise rejections.
- First-launch setup diagnostics.

The diagnostic logger redacts common secret patterns before writing:

- API keys starting with `sk-`
- `api_key=...`
- `token=...`
- `secret=...`
- `Authorization: Bearer ...`
- object fields whose names contain key, token, secret, password, or authorization

## Export Support Bundle

User steps:

1. Open Lumi OS.
2. Open Settings.
3. Go to Desktop Node Runtime.
4. Click `Export Support Bundle`.
5. Send the downloaded `lumi-support-bundle-*.json` file to support.

The support bundle includes app version context, setup state, configured key flags, setup diagnostics, diagnostic log path, recent diagnostic events, and release manifest if available. It does not include raw API keys.

## Minimum User Report Template

```text
1. Windows version:
2. Lumi OS version:
3. Installer file name:
4. What step failed:
5. Screenshot or exact error text:
6. Support bundle JSON:
7. Did Windows SmartScreen appear:
8. Which model provider was configured:
9. Did local Ollama / LM Studio run:
```

## Triage Rules

### Installer Does Not Open

Check:

- Is the file name `Lumi OS_<version>_x64-setup.exe`?
- Was it downloaded from the official GitHub Release?
- Does SHA256 match `SHA256SUMS.txt`?
- Did SmartScreen block the app?

### App Opens But Backend Fails

Check the support bundle:

- `diagnostics.items` includes `bundled-backend`.
- `dataRoot` points to a writable user directory.
- `recentDiagnosticEvents` has server fatal entries.

Ask the user to reinstall from the latest GitHub Release if bundled backend resources are missing.

### Setup Cannot Complete

Check:

- `diagnostics.hasModelSource`
- configured provider flags
- local model diagnostics for Ollama / LM Studio
- relay Base URL if relay is used

The user must configure at least one cloud model API key or run one local model source.

### White Screen Or UI Crash

Check:

- recent renderer diagnostic events
- `ErrorBoundary` message
- browser `window.error`
- `unhandledrejection`

Ask for a screenshot and the support bundle.

## Developer Verification

Run:

```powershell
npm test -- test/diagnostic_logs.test.ts src/lib/diagnostics.test.ts
npm run lint
```

Expected:

- diagnostic logs redact secrets
- support bundle includes recent diagnostic events
- client diagnostics post to `/api/setup/client-error`
- TypeScript passes
