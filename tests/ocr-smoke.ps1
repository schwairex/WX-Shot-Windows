$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$fixture = Join-Path $PSScriptRoot "ocr-fixture.png"
$bitmap = [System.Drawing.Bitmap]::new(1000, 240)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$font = [System.Drawing.Font]::new("Arial", 42, [System.Drawing.FontStyle]::Regular)
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::Black)
$graphics.DrawString("test@example.com", $font, $brush, 35, 35)
$graphics.DrawString("+90 555 111 22 33", $font, $brush, 35, 115)
$bitmap.Save($fixture, [System.Drawing.Imaging.ImageFormat]::Png)

$brush.Dispose()
$font.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

try {
  $json = & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "..\scripts\windows-ocr.ps1") -ImagePath $fixture
  $regions = $json | ConvertFrom-Json
  $recognized = ($regions | ForEach-Object { $_.text }) -join " "
  if ($recognized -notmatch "@" -or $recognized -notmatch "555") {
    throw "Windows OCR smoke test failed: $recognized"
  }
  Write-Host "Windows OCR smoke test passed: $recognized"
}
finally {
  Remove-Item -LiteralPath $fixture -Force -ErrorAction SilentlyContinue
}
