import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const WINDOWS_INSTALLER_NAME = 'Lumi OS 安装.exe';
const WINDOWS_UNINSTALLER_NAME = 'Lumi OS 卸载.cmd';

export function getWindowsReleaseDir(projectDir) {
  return path.join(projectDir, 'release', 'windows');
}

export function getNsisBundleDir(projectDir) {
  return path.join(projectDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
}

export function findLatestWindowsInstaller(projectDir) {
  const bundleDir = getNsisBundleDir(projectDir);
  if (!fs.existsSync(bundleDir)) {
    throw new Error(`NSIS bundle directory not found: ${bundleDir}`);
  }

  const installers = fs
    .readdirSync(bundleDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(bundleDir, entry.name))
    .filter((filePath) => filePath.endsWith('_x64-setup.exe'))
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (installers.length === 0) {
    throw new Error(`No Windows installer matching *_x64-setup.exe found in: ${bundleDir}`);
  }

  return installers[0].filePath;
}

export function exportWindowsInstaller(projectDir) {
  const source = findLatestWindowsInstaller(projectDir);
  const releaseDir = getWindowsReleaseDir(projectDir);
  fs.mkdirSync(releaseDir, { recursive: true });

  const sourceName = path.basename(source);
  const version = getInstallerVersion(sourceName);
  const installerName = WINDOWS_INSTALLER_NAME;
  const destination = path.join(releaseDir, installerName);
  fs.copyFileSync(source, destination);

  const sourceStat = fs.statSync(source);
  fs.utimesSync(destination, sourceStat.atime, sourceStat.mtime);

  return {
    source,
    destination,
    installerName,
    version,
    size: fs.statSync(destination).size,
  };
}

function getInstallerVersion(installerName) {
  const match = installerName.match(/^Lumi OS_(.+)_x64-setup\.exe$/);
  if (!match) {
    return 'unknown';
  }
  return match[1];
}

function getFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createWindowsUninstaller(releaseDir) {
  const uninstallerName = WINDOWS_UNINSTALLER_NAME;
  const cmdPath = path.join(releaseDir, uninstallerName);

  const script = String.raw`param(
  [switch]$RemoveUserData,
  [switch]$Silent
)

$ErrorActionPreference = "Stop"

function Get-LumiUninstallCommand {
  $roots = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )

  $entries = foreach ($root in $roots) {
    Get-ItemProperty -Path $root -ErrorAction SilentlyContinue |
      Where-Object {
        ($_.DisplayName -eq "Lumi OS" -or $_.DisplayName -eq "LumiOS") -and
        ($_.UninstallString -or $_.QuietUninstallString)
      }
  }

  $entry = $entries |
    Sort-Object @{ Expression = { if ($_.DisplayName -eq "Lumi OS") { 0 } else { 1 } } } |
    Select-Object -First 1

  if ($entry) {
    if ($Silent -and $entry.QuietUninstallString) { return $entry.QuietUninstallString }
    if ($entry.UninstallString) { return $entry.UninstallString }
    if ($entry.QuietUninstallString) { return $entry.QuietUninstallString }
  }

  return $null
}

function Get-LumiUninstallExeCandidates {
  $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
  $programFiles = [Environment]::GetFolderPath("ProgramFiles")
  $programFilesX86 = \${env:ProgramFiles(x86)}

  $paths = @()
  if ($localAppData) {
    $paths += Join-Path $localAppData "Programs\Lumi OS\uninstall.exe"
    $paths += Join-Path $localAppData "Lumi OS\uninstall.exe"
    $paths += Join-Path $localAppData "com.lumiai.os\uninstall.exe"
  }
  if ($programFiles) {
    $paths += Join-Path $programFiles "Lumi OS\uninstall.exe"
  }
  if ($programFilesX86) {
    $paths += Join-Path $programFilesX86 "Lumi OS\uninstall.exe"
  }

  return $paths | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
}

function Split-UninstallCommand([string]$Command) {
  if ($Command -match '^\s*"([^"]+)"\s*(.*)$') {
    return @{ FilePath = $matches[1]; Arguments = $matches[2] }
  }
  if ($Command -match '^\s*([^\s]+)\s*(.*)$') {
    return @{ FilePath = $matches[1]; Arguments = $matches[2] }
  }
  throw "Invalid uninstall command: $Command"
}

function Invoke-LumiUninstaller([string]$Command) {
  $parts = Split-UninstallCommand $Command
  $filePath = $parts.FilePath
  $arguments = $parts.Arguments

  Write-Host "Starting Lumi OS uninstaller..."
  Write-Host "Command: $Command"

  if ((Test-Path -LiteralPath $filePath) -or (Get-Command $filePath -ErrorAction SilentlyContinue)) {
    if ([string]::IsNullOrWhiteSpace($arguments)) {
      $process = Start-Process -FilePath $filePath -Wait -PassThru
    } else {
      $process = Start-Process -FilePath $filePath -ArgumentList $arguments -Wait -PassThru
    }
  } else {
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $Command) -Wait -PassThru
  }

  if ($process.ExitCode -ne 0) {
    throw "Lumi OS uninstaller exited with code $($process.ExitCode)."
  }
}

function Remove-LumiUserData {
  $userProfile = [Environment]::GetFolderPath("UserProfile")
  $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
  $targets = @()

  if ($userProfile) {
    $targets += Join-Path $userProfile "LumiOS"
    $targets += Join-Path $userProfile "lumi_skills"
  }
  if ($localAppData) {
    $targets += Join-Path $localAppData "com.lumiai.os"
  }

  foreach ($target in $targets) {
    if ($target -and (Test-Path -LiteralPath $target)) {
      Write-Host "Removing user data: $target"
      Remove-Item -LiteralPath $target -Recurse -Force
    }
  }
}

try {
  $command = Get-LumiUninstallCommand
  if (-not $command) {
    $exe = Get-LumiUninstallExeCandidates | Select-Object -First 1
    if ($exe) { $command = '"' + $exe + '"' }
  }

  if (-not $command) {
    Write-Host "Lumi OS uninstaller was not found." -ForegroundColor Red
    Write-Host "Try Windows Settings > Apps > Installed apps > Lumi OS > Uninstall."
    exit 1
  }

  Invoke-LumiUninstaller $command

  if (-not $Silent -and -not $RemoveUserData) {
    $answer = Read-Host "Remove local Lumi OS data and installed skills? [y/N]"
    if ($answer -match "^(y|yes)$") { $RemoveUserData = $true }
  }

  if ($RemoveUserData) { Remove-LumiUserData }

  Write-Host "Lumi OS uninstall helper finished."
  exit 0
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
`;

  const cmd = [
    '@echo off',
    'setlocal',
    'set "SELF=%~f0"',
    "powershell -NoProfile -ExecutionPolicy Bypass -Command \"$ErrorActionPreference = 'Stop'; $marker = ':LUMI_PS_PAYLOAD'; $lines = Get-Content -LiteralPath $env:SELF -Encoding UTF8; $start = [Array]::IndexOf($lines, $marker); if ($start -lt 0) { throw 'Lumi OS uninstall payload not found.' }; $script = ($lines[($start + 1)..($lines.Length - 1)] -join [Environment]::NewLine); $tmp = Join-Path $env:TEMP ('lumi-os-uninstall-' + [Guid]::NewGuid().ToString('N') + '.ps1'); Set-Content -LiteralPath $tmp -Encoding UTF8 -Value $script; try { & powershell -NoProfile -ExecutionPolicy Bypass -File $tmp @args; exit $LASTEXITCODE } finally { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }\" %*",
    'set "EXITCODE=%ERRORLEVEL%"',
    'if not "%EXITCODE%"=="0" (',
    '  echo.',
    '  echo Lumi OS uninstall helper exited with code %EXITCODE%.',
    ')',
    'pause',
    'exit /b %EXITCODE%',
    ':LUMI_PS_PAYLOAD',
    script,
  ].join('\r\n');

  fs.writeFileSync(cmdPath, cmd);

  return {
    uninstallerName,
    cmdPath,
    cmdSize: fs.statSync(cmdPath).size,
    cmdSha256: getFileSha256(cmdPath),
  };
}

function createReleaseNotes(manifest) {
  return `# Lumi OS ${manifest.version} Windows Release

## Artifact

- Installer: ${manifest.installerName}
- Uninstaller: ${manifest.uninstallerName}
- Platform: ${manifest.platform}
- Size: ${manifest.size} bytes
- SHA256: ${manifest.sha256}

## What Users Get

- Windows-first NSIS installer.
- One-machine license activation before first-launch setup.
- First-launch setup wizard with Essential, Practical, and Full modes.
- China, international, and local model provider recommendations.
- Bilingual API key help for provider setup.
- Local API key storage under the user's LumiOS data directory.
- Ollama and LM Studio local model diagnostics.

## Before Sharing

1. Verify the checksum in \`SHA256SUMS.txt\`.
2. Run the installer on a clean Windows user profile or VM.
3. Confirm first launch shows the machine code and rejects an invalid authorization code.
4. Generate an authorization code for the displayed machine code, activate, then confirm setup reaches the LumiOS desktop after a cloud key or local model is available.

## Install

1. Run \`${manifest.installerName}\`. This is the only file normal users need to click for installation.
2. Follow the Windows installer prompts.
3. Launch Lumi OS from the Start Menu or desktop shortcut.
4. If Windows SmartScreen appears, choose more info and run anyway only when this installer came from the official release channel.

## Uninstall

1. Run \`${manifest.uninstallerName}\` from the release package, or use Windows Settings > Apps > Installed apps > Lumi OS > Uninstall.
2. The helper locates Lumi OS through the Windows uninstall registry or the local install directory, then runs the installed \`uninstall.exe\`.
3. When prompted, choose whether to remove local setup data and installed skills. User data is kept by default.

## First Launch Activation

1. Copy the machine code shown by Lumi OS.
2. Generate an authorization code at the admin license generator.
3. Paste the authorization code into Lumi OS and activate.

## First Launch Setup

1. Choose Essential for the fastest start, Practical for daily use, or Full for all provider options.
2. Configure at least one cloud model API key, or start Ollama / LM Studio with a loaded local chat model.
3. Use the bilingual API key help beside each provider field when you need provider-specific instructions.
4. Run diagnostics and continue when at least one model source is available.

Lumi OS stores local setup data under:

\`\`\`text
%USERPROFILE%\\LumiOS\\data
\`\`\`

## Troubleshooting

### No model source detected

Save one supported cloud provider API key, or start Ollama / LM Studio with a loaded model and run diagnostics again.

### Relay provider test fails

OpenAI-compatible relay providers require both an API key and a Base URL ending in a compatible API path such as \`/v1\`.

### Installer cannot be found after build

Use the exported release kit under \`release\\windows\`. The deeper \`src-tauri\\target\\release\\bundle\\nsis\` directory is only Tauri's internal build output.
`;
}

export function exportWindowsReleaseKit(projectDir, options = {}) {
  const installer = exportWindowsInstaller(projectDir);
  const releaseDir = getWindowsReleaseDir(projectDir);
  const installerName = path.basename(installer.destination);
  const sha256 = getFileSha256(installer.destination);
  const generatedAt = options.generatedAt ?? new Date();
  const version = installer.version;
  if (!version || version === 'unknown') {
    throw new Error(`Unable to derive Windows release version from installer source: ${path.basename(installer.source)}`);
  }
  const packageName = `LumiOS-Windows-${version}.zip`;
  const uninstaller = createWindowsUninstaller(releaseDir);

  const checksumPath = path.join(releaseDir, 'SHA256SUMS.txt');
  const manifestPath = path.join(releaseDir, 'manifest.json');
  const releaseNotesPath = path.join(releaseDir, 'RELEASE_NOTES.md');

  const manifest = {
    appName: 'Lumi OS',
    version,
    platform: 'windows-x64',
    installerName,
    uninstallerName: uninstaller.uninstallerName,
    packageName,
    size: installer.size,
    sha256,
    uninstallerSize: uninstaller.cmdSize,
    uninstallerSha256: uninstaller.cmdSha256,
    generatedAt: generatedAt.toISOString(),
  };

  fs.writeFileSync(checksumPath, [
    `${sha256}  ${installerName}`,
    `${uninstaller.cmdSha256}  ${uninstaller.uninstallerName}`,
  ].join('\n') + '\n');
  writeJson(manifestPath, manifest);
  fs.writeFileSync(releaseNotesPath, createReleaseNotes(manifest));

  return {
    installerPath: installer.destination,
    uninstallerCmdPath: uninstaller.cmdPath,
    checksumPath,
    manifestPath,
    releaseNotesPath,
    manifest,
  };
}

export function validateWindowsReleaseKit(projectDir) {
  const releaseDir = getWindowsReleaseDir(projectDir);
  const manifestPath = path.join(releaseDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Windows release manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const installerPath = path.join(releaseDir, manifest.installerName);
  const packageName = manifest.packageName ?? `LumiOS-Windows-${manifest.version ?? 'unknown'}.zip`;
  const packagePath = path.join(releaseDir, packageName);
  if (!fs.existsSync(installerPath)) {
    throw new Error(`Windows release installer not found: ${installerPath}`);
  }
  const uninstallerPath = manifest.uninstallerName ? path.join(releaseDir, manifest.uninstallerName) : null;

  const size = fs.statSync(installerPath).size;
  const sha256 = getFileSha256(installerPath);
  const uninstallerExists = !!(uninstallerPath && fs.existsSync(uninstallerPath));
  const uninstallerSha256 = uninstallerExists ? getFileSha256(uninstallerPath) : '';
  const resourceChecks = [
    path.join(projectDir, 'desktop-resources', 'dist-server', 'node.exe'),
    path.join(projectDir, 'desktop-resources', 'dist-server', 'entry.cjs'),
    path.join(projectDir, 'desktop-resources', 'dist-server', 'server.mjs'),
  ].map((resourcePath) => ({
    path: resourcePath,
    ok: fs.existsSync(resourcePath),
  }));

  const packageExists = fs.existsSync(packagePath);
  const ok =
    size === manifest.size &&
    sha256 === manifest.sha256 &&
    uninstallerExists &&
    uninstallerSha256 === manifest.uninstallerSha256 &&
    packageExists &&
    resourceChecks.every((check) => check.ok);

  return {
    ok,
    installerName: manifest.installerName,
    packageName,
    packageExists,
    size,
    sha256,
    expectedSha256: manifest.sha256,
    uninstallerName: manifest.uninstallerName,
    uninstallerExists,
    uninstallerSha256,
    expectedUninstallerSha256: manifest.uninstallerSha256,
    resourceChecks,
  };
}
