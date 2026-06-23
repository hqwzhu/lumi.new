# LumiOS macOS Release Checklist

Use this checklist before publishing a macOS test build or prerelease.

## Build Host

macOS DMG builds cannot be produced on the Windows development machine. Use one of these:

- GitHub Actions `macos-latest` runner.
- A real Mac with Node.js, npm, Rust, Xcode command line tools, and Tauri build prerequisites.

## Local Commands On macOS

Run from the project root for an unsigned internal test build:

```bash
npm test
npm run lint
npm run release:macos:unsigned
```

Run this variant only after Apple signing and notarization secrets are configured in the local environment:

```bash
npm run release:macos
```

Expected outputs:

```text
release/macos/LumiOS-macOS-<version>-<arch>.dmg
release/macos/LumiOS-macOS-<version>-<arch>.app.tar.gz
release/macos/LumiOS-macOS-<version>-<arch>.zip
release/macos/manifest.json
release/macos/RELEASE_NOTES.md
release/macos/SHA256SUMS.txt
```

The release script copies the Tauri DMG, reuses an existing app archive when present, or creates `*.app.tar.gz` from the generated `.app` bundle.

## GitHub Actions Build

1. Open the `LumiOS CI and Desktop Release` workflow.
2. Click `Run workflow`.
3. Select branch `main`.
4. Set `publish_release=false`.
5. Set `release_platform=macos`.
6. Keep `prerelease=true`.
7. Confirm the `lumi-os-macos-release-kit` artifact exists.

After the artifact has been checked, run the workflow again with:

```text
publish_release=true
release_platform=macos
prerelease=true
```

The release tag uses:

```text
macos-v<version>-<arch>
```

## Signing And Distribution

The first macOS MVP supports internal testing without Apple signing secrets. For normal public distribution, configure Apple Developer signing and notarization in GitHub Actions before telling non-technical users to install it.

Optional GitHub secrets:

```text
APPLE_CERTIFICATE
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY
APPLE_ID
APPLE_PASSWORD
APPLE_TEAM_ID
KEYCHAIN_PASSWORD
```

Without signing and notarization, macOS Gatekeeper may block the app. Treat unsigned builds as internal test builds only.

## Manual Smoke Test On macOS

1. Download the DMG from the GitHub Actions artifact or prerelease.
2. Open the DMG.
3. Drag Lumi OS into Applications.
4. Launch Lumi OS from Applications.
5. Confirm first-launch setup appears.
6. Select Essential mode.
7. Save one cloud provider API key or start an Ollama / LM Studio local model.
8. Run diagnostics.
9. Confirm the desktop shell opens.
10. Export a support bundle from Settings.

## Known MVP Limits

- Build verification is done through GitHub Actions unless a real Mac is available locally.
- Unsigned builds are for internal testing.
- Linux packaging remains a later phase.
