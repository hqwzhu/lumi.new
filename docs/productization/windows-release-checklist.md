# LumiOS Windows Release Checklist

Use this checklist before publishing a Windows installer.

## Build Inputs

- Source branch is clean.
- `npm install` has been run with the expected Node version.
- No API keys or `.env` files are committed.
- `desktop-resources/dist-server/entry.cjs` exists after build.
- `desktop-resources/dist-server/server.mjs` exists after build.

## Verification

Run:

```powershell
npm test
npm run lint
npm run release:windows
```

Expected:

- All Vitest tests pass.
- TypeScript check passes.
- Desktop UI, server bundle, desktop resources, Tauri shell, and NSIS bundle build.
- NSIS installer is created under:

```text
src-tauri\target\release\bundle\nsis\
```
- The release copy is exported to:

```text
release\windows\
```

## Installer Smoke Test

On a clean Windows user profile or VM:

1. Install LumiOS.
2. Launch the app.
3. Confirm onboarding appears on first launch.
4. Select Essential mode.
5. Save one test provider API key or start a local Ollama / LM Studio model.
6. Run diagnostics.
7. Launch into the desktop shell.
8. Open Settings and reopen setup.
9. Confirm setup state resets without deleting saved keys.

## Product Scope For This Release

Included:

- Windows NSIS installer MVP.
- Backend persisted setup state.
- Local API key storage through backend.
- Essential / Practical / Full setup modes.
- China, international, and local model recommendations.
- Bilingual API key tutorials.
- Local Ollama and LM Studio diagnostics.
- Reopen setup from Settings.

Deferred:

- macOS installer.
- Linux packages.
- Real paid-provider live inference test calls during setup.
- Code signing and auto-update channel hardening.
- Automated clean-VM smoke test.

## Known Packaging Notes

- The build may warn if `WebView2Loader.dll` is not found. The current hook writes an empty NSIS macro when the DLL is unavailable.
- Tauri may warn if bundler metadata cannot be written to the EXE due to transient file locking. Confirm the installer still builds and installs correctly.
- Large Vite chunks are expected in this MVP because the desktop shell includes Three.js, Motion, and the existing app surface.

## Release Artifact Naming

Use this installer naming pattern:

```text
Lumi OS_<version>_x64-setup.exe
```

Use the exported file under `release\windows\` for manual testing and release uploads. The deep `src-tauri\target\release\bundle\nsis\` path is an internal Tauri build output.

Attach a short release note that tells users:

- This is Windows-first.
- First launch includes setup guidance.
- API keys are stored locally.
- macOS/Linux are planned later.
