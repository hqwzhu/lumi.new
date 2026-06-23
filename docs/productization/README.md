# Lumi OS Productization

This directory is the operating manual for Windows and macOS desktop releases.

## What To Send To Users

For normal Windows users, send the Windows installer:

```text
release/windows/LumiOS-Windows-3.0.0-x64-setup.exe
```

For a formal Windows release channel, publish all files in `release/windows/`:

- `LumiOS-Windows-3.0.0-x64-setup.exe`
- `LumiOS-Windows-3.0.0.zip`
- `manifest.json`
- `RELEASE_NOTES.md`
- `SHA256SUMS.txt`

The macOS version is in development. For internal Apple Silicon testing, send the DMG from the macOS release kit:

```text
release/macos/LumiOS-macOS-3.0.4-arm64.dmg
```

For normal macOS users, publish the DMG only after Apple Developer signing and notarization are configured. Until then, keep macOS marked as an internal test build / in-development platform in GitHub and website copy.

Do not send source project archives to normal users.

## Documents

- `windows-release-checklist.md`: maintainer checklist before release.
- `macos-release-checklist.md`: macOS DMG build, artifact, signing, and smoke-test checklist.
- `macos-user-guide.zh-CN.md`: Chinese macOS install and first-launch test guide.
- `macos-signing-and-release.zh-CN.md`: Chinese Apple signing, notarization, and release workflow.
- `github-release-and-download-page.md`: GitHub Release and static download page workflow.
- `windows-user-guide.md`: user install and first-launch guide.
- `api-key-guide.md`: bilingual API key setup guide.
- `diagnostics-and-feedback.md`: support bundle, crash logs, and issue triage.

## Release Commands

```powershell
npm test
npm run lint
npm run release:windows
npm run site:downloads
npm run github:release:windows -- --dry-run
```

Publish with GitHub CLI after authentication:

```powershell
gh auth login
npm run github:release:windows
```

Or use GitHub Actions:

1. Open the `LumiOS CI and Desktop Release` workflow.
2. Run workflow on `main`.
3. Set `publish_release=true`.
4. Set `release_platform=windows` or `release_platform=macos`.
5. Keep `prerelease=true` for beta builds.

For unsigned macOS builds, publish only as an internal prerelease. For public macOS distribution, configure Apple Developer signing secrets first, then run the macOS workflow with `publish_release=true` and `prerelease=false`.
