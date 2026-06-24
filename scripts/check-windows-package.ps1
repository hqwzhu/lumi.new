param(
  [string]$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path
)

$ErrorActionPreference = "Stop"

$ReleaseDir = Join-Path $ProjectDir "release\windows"
$ManifestPath = Join-Path $ReleaseDir "manifest.json"

if (-not (Test-Path $ManifestPath)) {
  throw "Windows release manifest not found: $ManifestPath"
}

$Manifest = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
$PackagePath = Join-Path $ReleaseDir $Manifest.packageName

if (-not (Test-Path $PackagePath)) {
  throw "Windows release package not found: $PackagePath"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$Zip = [System.IO.Compression.ZipFile]::OpenRead($PackagePath)

try {
  $EntryNames = @($Zip.Entries | ForEach-Object { $_.Name })
  $Required = @(
    $Manifest.installerName,
    $Manifest.uninstallerName,
    $Manifest.uninstallerScriptName,
    "manifest.json",
    "SHA256SUMS.txt",
    "RELEASE_NOTES.md"
  )

  foreach ($Name in $Required) {
    if ($EntryNames -notcontains $Name) {
      throw "Windows release package is missing: $Name"
    }
  }

  Write-Host "Windows release package contents:"
  foreach ($Name in $Required) {
    Write-Host "  OK: $Name"
  }
}
finally {
  $Zip.Dispose()
}
