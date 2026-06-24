param(
  [string]$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path
)

$ErrorActionPreference = "Stop"

$ReleaseDir = Join-Path $ProjectDir "release\windows"
$ManifestPath = Join-Path $ReleaseDir "manifest.json"

if (-not (Test-Path $ManifestPath)) {
  throw "Windows release manifest not found: $ManifestPath"
}

$Manifest = Get-Content -Raw -Encoding UTF8 -Path $ManifestPath | ConvertFrom-Json
$PackageName = $Manifest.packageName
if (-not $PackageName) {
  $PackageName = "LumiOS-Windows-$($Manifest.version).zip"
}
$PackagePath = Join-Path $ReleaseDir $PackageName

$Files = @(
  (Join-Path $ReleaseDir $Manifest.installerName),
  (Join-Path $ReleaseDir $Manifest.uninstallerName),
  (Join-Path $ReleaseDir "manifest.json"),
  (Join-Path $ReleaseDir "SHA256SUMS.txt"),
  (Join-Path $ReleaseDir "RELEASE_NOTES.md")
)

foreach ($File in $Files) {
  if (-not (Test-Path $File)) {
    throw "Required release file not found: $File"
  }
}

if (Test-Path $PackagePath) {
  Remove-Item -LiteralPath $PackagePath -Force
}

Compress-Archive -LiteralPath $Files -DestinationPath $PackagePath -CompressionLevel Optimal

$Package = Get-Item -LiteralPath $PackagePath
Write-Host "Windows release package created:"
Write-Host "  $($Package.FullName)"
Write-Host "  $($Package.Length) bytes"
