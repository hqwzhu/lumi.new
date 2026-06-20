param(
  [string]$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path,
  [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"

$ReleaseDir = Join-Path $ProjectDir "release\windows"
$ManifestPath = Join-Path $ReleaseDir "manifest.json"

if (-not (Test-Path $ManifestPath)) {
  throw "Windows release manifest not found: $ManifestPath"
}

$Manifest = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
$InstallerPath = Join-Path $ReleaseDir $Manifest.installerName

if (-not (Test-Path $InstallerPath)) {
  throw "Windows installer not found: $InstallerPath"
}

if (-not $InstallDir) {
  $InstallDir = Join-Path $ProjectDir "release\windows-smoke-install"
}

if (Test-Path $InstallDir) {
  Remove-Item -LiteralPath $InstallDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

Write-Host "Running Windows installer smoke test:"
Write-Host "  Installer: $InstallerPath"
Write-Host "  Install:   $InstallDir"

$Process = Start-Process -FilePath $InstallerPath -ArgumentList @("/S", "/D=$InstallDir") -Wait -PassThru -WindowStyle Hidden
if ($Process.ExitCode -ne 0) {
  throw "Installer exited with code $($Process.ExitCode)"
}

$ExpectedFiles = @(
  (Join-Path $InstallDir "lumi-os.exe"),
  (Join-Path $InstallDir "uninstall.exe"),
  (Join-Path $InstallDir "_up_\desktop-resources\dist-server\entry.cjs"),
  (Join-Path $InstallDir "_up_\desktop-resources\dist-server\server.mjs")
)

foreach ($File in $ExpectedFiles) {
  if (-not (Test-Path $File)) {
    throw "Installed file missing: $File"
  }
  Write-Host "  OK: $File"
}

Write-Host "Windows installer smoke test passed."
