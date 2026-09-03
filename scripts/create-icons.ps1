param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\assets")
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $OutputDirectory)) {
  New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}

foreach ($size in @(16, 32, 48, 128, 256)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $bounds = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
  $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $bounds,
    [System.Drawing.ColorTranslator]::FromHtml("#7857F2"),
    [System.Drawing.ColorTranslator]::FromHtml("#3B82F6"),
    45.0
  )
  $radius = [Math]::Max(3, [Math]::Round($size * 0.23))
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
  $path.AddArc($size - $diameter - 1, 0, $diameter, $diameter, 270, 90)
  $path.AddArc($size - $diameter - 1, $size - $diameter - 1, $diameter, $diameter, 0, 90)
  $path.AddArc(0, $size - $diameter - 1, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  $graphics.FillPath($gradient, $path)

  $fontSize = [Math]::Max(6, [Math]::Round($size * 0.34))
  $font = [System.Drawing.Font]::new("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $graphics.DrawString("WX", $font, $white, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $format)

  $target = Join-Path $OutputDirectory "icon-$size.png"
  $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)

  $white.Dispose()
  $format.Dispose()
  $font.Dispose()
  $path.Dispose()
  $gradient.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Host "WX Shot icons created in $OutputDirectory"
