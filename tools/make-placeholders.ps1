<#
  Renders the placeholder images as JPEGs.

      powershell -ExecutionPolicy Bypass -File tools\make-placeholders.ps1

  The site originally shipped these as hand-written SVGs. This script redraws
  the identical artwork with GDI+ and writes .jpg files, so the placeholders
  are in the same format as the real photography that will replace them.

  Artwork recipe (matches the original SVGs exactly):
    - background  #F5F3FC
    - 45-degree stripes #EAE6F8, 11px wide on a 22px period
    - 2px inset border #D9D2F0
    - title (semibold) #574896, subtitle #7A7498,
      letter-spaced "PLACEHOLDER IMAGE" #BFB4E4

  Text positions, sizes and colours come from tools/placeholder-manifest.txt:
      name|width|height|baselineY|fontSize|fill|bold|letterSpacing|text
#>
param(
  [int]$Quality = 92,
  [string]$Manifest = "$PSScriptRoot\placeholder-manifest.txt",
  [string]$OutDir = "$(Split-Path -Parent $PSScriptRoot)\images"
)

Add-Type -AssemblyName System.Drawing

# Poppins if the brand font is installed locally, otherwise the same fallback
# stack the stylesheet uses.
$installed = ([System.Drawing.FontFamily]::Families | ForEach-Object { $_.Name })
$FontName = 'Segoe UI'
foreach ($candidate in @('Poppins', 'Segoe UI', 'Arial')) {
  if ($installed -contains $candidate) { $FontName = $candidate; break }
}
Write-Host "Font: $FontName"

$family = New-Object System.Drawing.FontFamily($FontName)

$bgColor     = [System.Drawing.ColorTranslator]::FromHtml('#F5F3FC')
$stripeColor = [System.Drawing.ColorTranslator]::FromHtml('#EAE6F8')
$borderColor = [System.Drawing.ColorTranslator]::FromHtml('#D9D2F0')

$bgBrush     = New-Object System.Drawing.SolidBrush($bgColor)
$stripeBrush = New-Object System.Drawing.SolidBrush($stripeColor)
$borderPen   = New-Object System.Drawing.Pen($borderColor, 2)

# Typographic format: no extra padding, centred horizontally
$fmt = [System.Drawing.StringFormat]::GenericTypographic.Clone()
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Near
$fmt.FormatFlags = $fmt.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces

$fmtLeft = [System.Drawing.StringFormat]::GenericTypographic.Clone()
$fmtLeft.Alignment = [System.Drawing.StringAlignment]::Near
$fmtLeft.LineAlignment = [System.Drawing.StringAlignment]::Near

# JPEG encoder at the requested quality
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)

# SVG places text by baseline; GDI+ places it by the top of the line box.
function Get-TopFromBaseline([single]$baselineY, [single]$size, [System.Drawing.FontStyle]$style) {
  $ascent = $family.GetCellAscent($style)
  $em = $family.GetEmHeight($style)
  return $baselineY - ($size * $ascent / $em)
}

# GDI+ has no letter-spacing, so spaced text is drawn one glyph at a time.
function Draw-Tracked($g, [string]$text, $font, $brush, [single]$centerX, [single]$top, [single]$tracking) {
  $widths = @()
  $total = 0.0
  foreach ($ch in $text.ToCharArray()) {
    $w = $g.MeasureString([string]$ch, $font, [System.Drawing.PointF]::Empty, $fmtLeft).Width
    $widths += $w
    $total += $w
  }
  $total += $tracking * ($text.Length - 1)

  $x = $centerX - ($total / 2)
  for ($i = 0; $i -lt $text.Length; $i++) {
    $g.DrawString([string]$text[$i], $font, $brush, $x, $top, $fmtLeft)
    $x += $widths[$i] + $tracking
  }
}

# ---------------------------------------------------------------------------
$rows = Get-Content -LiteralPath $Manifest -Encoding UTF8 | Where-Object { $_.Trim().Length -gt 0 }
$groups = $rows | Group-Object { ($_ -split '\|')[0] }
$count = 0

foreach ($group in $groups) {
  $first = $group.Group[0] -split '\|'
  $name = $first[0]
  $w = [int]$first[1]
  $h = [int]$first[2]

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Background and 45-degree stripes
  $g.FillRectangle($bgBrush, 0, 0, $w, $h)
  $diag = [int][Math]::Ceiling([Math]::Sqrt(($w * $w) + ($h * $h))) + 44
  $state = $g.Save()
  $g.RotateTransform(45)
  for ($x = -$diag; $x -lt $diag; $x += 22) {
    $g.FillRectangle($stripeBrush, $x, -$diag, 11, ($diag * 2))
  }
  $g.Restore($state)

  # Inset border
  $g.DrawRectangle($borderPen, 1, 1, ($w - 2), ($h - 2))

  # Text lines
  foreach ($row in $group.Group) {
    $f = $row -split '\|'
    $baselineY = [single]$f[3]
    $size      = [single]$f[4]
    $fill      = $f[5]
    $bold      = ($f[6] -eq '1')
    $tracking  = [single]$f[7]
    $text      = $f[8]
    if ([string]::IsNullOrWhiteSpace($text)) { continue }

    $style = [System.Drawing.FontStyle]::Regular
    if ($bold) { $style = [System.Drawing.FontStyle]::Bold }

    $font = New-Object System.Drawing.Font($family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($fill))
    $top = Get-TopFromBaseline $baselineY $size $style

    if ($tracking -gt 0) {
      Draw-Tracked $g $text $font $brush ($w / 2) $top $tracking
    } else {
      $g.DrawString($text, $font, $brush, ($w / 2), $top, $fmt)
    }

    $font.Dispose()
    $brush.Dispose()
  }

  $outPath = Join-Path $OutDir "$name.jpg"
  $bmp.Save($outPath, $encoder, $encParams)
  $g.Dispose()
  $bmp.Dispose()
  $count++
}

Write-Host "Wrote $count JPEG placeholders to $OutDir (quality $Quality)"
