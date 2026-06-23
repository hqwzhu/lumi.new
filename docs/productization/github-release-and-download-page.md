# GitHub Release And Download Page

This workflow publishes desktop releases through GitHub Releases and generates a static download page for the official website.

## Release Channel

Repository:

```text
hqwzhu/lumi.new
```

Windows tag pattern:

```text
windows-v<version>
```

macOS tag pattern:

```text
macos-v<version>-<arch>
```

Example:

```text
windows-v3.0.0
```

## Local Windows Release Flow

Run from the project root:

```powershell
npm test
npm run lint
npm run release:windows
npm run site:downloads
npm run github:release:windows -- --dry-run
```

Expected outputs:

```text
release/windows/Lumi OS_<version>_x64-setup.exe
release/windows/LumiOS-Windows-<version>.zip
release/windows/manifest.json
release/windows/RELEASE_NOTES.md
release/windows/SHA256SUMS.txt
public/downloads/windows.html
public/downloads/windows.json
```

Publish after GitHub CLI authentication:

```powershell
gh auth login
npm run github:release:windows
```

## GitHub Actions Flow

The workflow `.github/workflows/ci.yml` supports Windows and macOS desktop release artifacts:

- PR and push checks run TypeScript, Rust check, Vitest, and frontend build.
- Windows installer build runs on `windows-latest`.
- macOS DMG build runs on `macos-latest`.
- Manual workflow dispatch can publish a GitHub Release for the selected platform.

Manual Windows publish:

1. Go to GitHub Actions.
2. Select `LumiOS CI and Desktop Release`.
3. Click `Run workflow`.
4. Select branch `main`.
5. Set `publish_release=true`.
6. Set `release_platform=windows`.
7. Keep `prerelease=true` for beta builds.
8. Confirm the release assets appear under `windows-v<version>`.

Manual macOS test artifact:

1. Go to GitHub Actions.
2. Select `LumiOS CI and Desktop Release`.
3. Click `Run workflow`.
4. Select branch `main`.
5. Set `publish_release=false`.
6. Set `release_platform=macos`.
7. Confirm the `lumi-os-macos-release-kit` artifact contains the DMG, app archive, zip, manifest, checksum file, and release notes.

Manual macOS prerelease:

1. Run the macOS test artifact workflow first.
2. Run workflow again with `publish_release=true`.
3. Set `release_platform=macos`.
4. Keep `prerelease=true` unless Apple signing and notarization are ready.
5. Confirm the release assets appear under `macos-v<version>-<arch>`.

## Official Website Download Page

Generate static files:

```powershell
npm run site:downloads
```

Generated files:

```text
public/downloads/windows.html
public/downloads/windows.json
public/downloads/macos.html
public/downloads/macos.json
```

Recommended website route:

```text
https://lumiai.asia/downloads/windows.html
https://lumiai.asia/downloads/macos.html
```

The Windows HTML page links directly to GitHub Release assets. The macOS HTML page intentionally marks macOS as in development until Apple Developer signing and notarization are complete. The JSON files can be used by a future website, updater service, or release monitor.

## Before Public Distribution

Confirm:

- The installer was downloaded from the official GitHub Release.
- SHA256 matches `SHA256SUMS.txt`.
- First launch reaches the setup wizard on a clean Windows profile.
- At least one cloud key or local model source can complete setup.
- Support bundle export works from Settings.

Code signing is still pending. Until signing is added, tell users to expect a possible Windows SmartScreen warning and only trust the official release channel.

For macOS public distribution, configure Apple Developer signing and notarization before sending the DMG to normal users. Unsigned DMGs are internal test builds and may be blocked by Gatekeeper.
