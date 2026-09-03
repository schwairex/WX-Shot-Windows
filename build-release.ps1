param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "dist\release")
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$installer = Join-Path $projectRoot "dist\WX-Shot-Windows-Setup-1.0.0-x64.exe"
$portableRoot = Join-Path $projectRoot "dist\win-unpacked"

if (-not (Test-Path -LiteralPath $installer)) { throw "Installer is missing. Run npm run dist:win first." }
if (-not (Test-Path -LiteralPath $portableRoot)) { throw "Portable build is missing. Run npm run dist:win first." }

if (-not (Test-Path -LiteralPath $OutputDirectory)) {
  New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}
$outputRoot = (Resolve-Path -LiteralPath $OutputDirectory).Path
$stagingRoot = Join-Path $projectRoot (".release-staging-" + [guid]::NewGuid().ToString("N"))
$sourceRoot = Join-Path $stagingRoot "source"

try {
  New-Item -ItemType Directory -Path $sourceRoot | Out-Null
  foreach ($directory in @(".github", "assets", "scripts", "src", "tests")) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $directory) -Destination $sourceRoot -Recurse
  }
  foreach ($file in @(".gitignore", ".gitattributes", "package.json", "package-lock.json", "README.md", "KURULUM.md", "GITHUBA-YUKLEME.md", "CONTRIBUTING.md", "SECURITY.md", "LICENSE", "build-release.ps1")) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $sourceRoot
  }

  $installerTarget = Join-Path $outputRoot "WX-Shot-Windows-Setup-1.0.0-x64.exe"
  $portableTarget = Join-Path $outputRoot "WX-Shot-Windows-Portable-1.0.0-x64.zip"
  $sourceTarget = Join-Path $outputRoot "WX-Shot-Windows-Source-1.0.0.zip"
  Copy-Item -LiteralPath $installer -Destination $installerTarget -Force
  if (Test-Path -LiteralPath $portableTarget) { Remove-Item -LiteralPath $portableTarget -Force }
  if (Test-Path -LiteralPath $sourceTarget) { Remove-Item -LiteralPath $sourceTarget -Force }
  Compress-Archive -Path (Join-Path $portableRoot "*") -DestinationPath $portableTarget -CompressionLevel Optimal
  Compress-Archive -Path (Join-Path $sourceRoot "*") -DestinationPath $sourceTarget -CompressionLevel Optimal

  $hashLines = foreach ($file in @($installerTarget, $portableTarget, $sourceTarget)) {
    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $file
    "$($hash.Hash)  $([System.IO.Path]::GetFileName($file))"
  }
  Set-Content -LiteralPath (Join-Path $outputRoot "WX-Shot-Windows-SHA256.txt") -Value $hashLines -Encoding utf8
  Write-Host "WX Shot Windows release created in $outputRoot"
}
finally {
  $resolvedProject = [System.IO.Path]::GetFullPath($projectRoot).TrimEnd("\") + "\"
  $resolvedStaging = [System.IO.Path]::GetFullPath($stagingRoot)
  if ($resolvedStaging.StartsWith($resolvedProject, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedStaging)) {
    Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
  }
}
