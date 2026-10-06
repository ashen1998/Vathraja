<#
  Minimal static file server for local preview.

      powershell -ExecutionPolicy Bypass -File tools\serve.ps1

  Then open http://localhost:5173/ — the site itself needs no server and can
  also be opened straight from index.html, but a server avoids browser file://
  restrictions when testing.
#>
param([int]$Port = 5173)

$root = Split-Path -Parent $PSScriptRoot
$prefix = "http://localhost:$Port/"

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.json' = 'application/json'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving $root at $prefix (Ctrl+C to stop)"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $path = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
  if ($path -eq '/') { $path = '/index.html' }
  $file = Join-Path $root $path.TrimStart('/').Replace('/', '\')

  if (Test-Path -LiteralPath $file -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $ct = $types[$ext]
    if (-not $ct) { $ct = 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $context.Response.ContentType = $ct
    $context.Response.Headers.Add('Cache-Control', 'no-store, must-revalidate')
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $context.Response.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes('Not found: ' + $path)
    $context.Response.OutputStream.Write($msg, 0, $msg.Length)
  }
  $context.Response.Close()
}
