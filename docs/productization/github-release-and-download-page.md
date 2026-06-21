# GitHub Release And Download Page

This workflow publishes the Windows MVP through GitHub Releases and generates a static download page for the official website.

## Release Channel

Repository:

```text
hqwzhu/lumi.new
```

Tag pattern:

```text
windows-v<version>
```

Example:

```text
windows-v3.0.0
```

## Local Release Flow

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

The workflow `.github/workflows/ci.yml` is Windows-first:

- PR and push checks run TypeScript, Rust check, Vitest, and frontend build.
- Installer build runs on `windows-latest`.
- macOS and Linux installers are deferred to phase 2.
- Manual workflow dispatch can publish a GitHub Release.

Manual publish:

1. Go to GitHub Actions.
2. Select `LumiOS CI and Windows Release`.
3. Click `Run workflow`.
4. Select branch `main`.
5. Set `publish_release=true`.
6. Keep `prerelease=true` for beta builds.
7. Confirm the release assets appear under `windows-v<version>`.

## Official Website Download Page

Generate static files:

```powershell
npm run site:downloads
```

Generated files:

```text
public/downloads/windows.html
public/downloads/windows.json
```

Recommended website route:

```text
https://lumiai.asia/downloads/windows.html
```

The HTML page links directly to GitHub Release assets. The JSON file can be used by a future website, updater service, or release monitor.

## Before Public Distribution

Confirm:

- The installer was downloaded from the official GitHub Release.
- SHA256 matches `SHA256SUMS.txt`.
- First launch reaches the setup wizard on a clean Windows profile.
- At least one cloud key or local model source can complete setup.
- Support bundle export works from Settings.

Code signing is still pending. Until signing is added, tell users to expect a possible Windows SmartScreen warning and only trust the official release channel.
