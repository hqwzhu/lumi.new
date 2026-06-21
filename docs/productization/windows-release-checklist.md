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
npm run site:downloads
npm run release:windows:check
npm run package:windows-release:check
npm run smoke:windows-installer
npm run github:release:windows -- --dry-run
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
- `release\windows\manifest.json`, `SHA256SUMS.txt`, and `RELEASE_NOTES.md` are created.
- `release\windows\LumiOS-Windows-<version>.zip` is created for sharing.
- `public\downloads\windows.html` and `public\downloads\windows.json` are generated for the website download page.
- `release:windows:check` confirms the installer checksum and required desktop server resources.
- `package:windows-release:check` confirms the zip contains the installer, manifest, checksum file, and release notes.
- `smoke:windows-installer` silently installs to `release\windows-smoke-install\` and confirms the installed desktop executable, uninstaller, and backend resources exist.
- `github:release:windows -- --dry-run` prints the GitHub Release tag, notes file, and upload assets without publishing.

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

Before manual smoke testing, run `npm run smoke:windows-installer` to verify the installer can unpack successfully without changing the normal user install directory.

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

For user distribution, prefer the zip package:

```text
LumiOS-Windows-<version>.zip
```

It includes the installer, manifest, checksum file, and release notes.

## GitHub Release Publishing

Dry run first:

```powershell
npm run github:release:windows -- --dry-run
```

Publish after GitHub CLI authentication:

```powershell
gh auth login
npm run github:release:windows
```

The command publishes to `hqwzhu/lumi.new` with tag `windows-v<version>` and uploads the zip package, installer, checksum file, manifest, and release notes.

Attach a short release note that tells users:

- This is Windows-first.
- First launch includes setup guidance.
- API keys are stored locally.
- macOS/Linux are planned later.
