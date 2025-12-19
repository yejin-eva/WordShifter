<#
WordShifter Ollama CORS Proxy (Windows / PowerShell)

Purpose:
- GitHub Pages serves WordShifter over HTTPS.
- Browsers block HTTPS pages from calling http://localhost:11434 (mixed content) and enforce CORS.
- This script runs a small local HTTP proxy that forwards to Ollama and adds CORS headers.

Default:
- Listens on: http://localhost:8787
- Forwards to: http://localhost:11434
- Allows origins:
  - https://yejin-eva.github.io
  - http://localhost:5173

Usage (PowerShell):
  powershell -NoProfile -ExecutionPolicy Bypass -File .\ollama-cors-proxy.ps1

Optional parameters:
  -Port 8787
  -Upstream http://localhost:11434
  -AllowedOrigins "https://yejin-eva.github.io,http://localhost:5173"
#>

param(
  [int]$Port = 8787,
  [string]$Upstream = "http://localhost:11434",
  [string]$AllowedOrigins = "https://yejin-eva.github.io,http://localhost:5173"
)

$ErrorActionPreference = "Stop"

function Normalize-BaseUrl([string]$u) {
  $u = $u.Trim()
  if ($u.EndsWith("/")) { return $u.TrimEnd("/") }
  return $u
}

$Upstream = Normalize-BaseUrl $Upstream
$Allowed = @{}
($AllowedOrigins.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }) | ForEach-Object { $Allowed[$_] = $true }

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "[wordshifter] Ollama CORS proxy listening on $prefix"
Write-Host "[wordshifter] Upstream: $Upstream/"
Write-Host "[wordshifter] Allowed origins: $AllowedOrigins"
Write-Host "[wordshifter] Press Ctrl+C to stop."

$http = New-Object System.Net.Http.HttpClient
$http.Timeout = [TimeSpan]::FromSeconds(60)

function Add-CorsHeaders($response, [string]$origin) {
  if ([string]::IsNullOrWhiteSpace($origin)) { return }
  if (-not $Allowed.ContainsKey($origin)) { return }
  $response.Headers["Access-Control-Allow-Origin"] = $origin
  $response.Headers["Vary"] = "Origin"
  $response.Headers["Access-Control-Allow-Credentials"] = "true"
  $response.Headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  $response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, X-Requested-With, Cache-Control"
  $response.Headers["Access-Control-Max-Age"] = "86400"
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $origin = $req.Headers["Origin"]
    Add-CorsHeaders $res $origin

    if ($req.HttpMethod -eq "OPTIONS") {
      $res.StatusCode = 204
      $res.Close()
      continue
    }

    try {
      $pathAndQuery = $req.RawUrl
      if ([string]::IsNullOrEmpty($pathAndQuery)) { $pathAndQuery = "/" }
      $target = "$Upstream$pathAndQuery"

      $method = New-Object System.Net.Http.HttpMethod($req.HttpMethod)
      $upReq = New-Object System.Net.Http.HttpRequestMessage($method, $target)

      # Forward selected headers (skip hop-by-hop + Origin/Host)
      foreach ($key in $req.Headers.AllKeys) {
        $lk = $key.ToLowerInvariant()
        if ($lk -in @("connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailer","transfer-encoding","upgrade","host","origin","referer")) { continue }
        $value = $req.Headers[$key]
        if ([string]::IsNullOrEmpty($value)) { continue }
        [void]$upReq.Headers.TryAddWithoutValidation($key, $value)
      }

      if ($req.HasEntityBody) {
        $ms = New-Object System.IO.MemoryStream
        $req.InputStream.CopyTo($ms)
        $bytes = $ms.ToArray()
        $content = New-Object System.Net.Http.ByteArrayContent($bytes)
        if ($req.ContentType) {
          $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($req.ContentType)
        }
        $upReq.Content = $content
      }

      $upRes = $http.SendAsync($upReq).GetAwaiter().GetResult()

      $res.StatusCode = [int]$upRes.StatusCode
      if ($upRes.Content.Headers.ContentType) {
        $res.ContentType = $upRes.Content.Headers.ContentType.ToString()
      }

      # Copy upstream headers (avoid overwriting our CORS headers)
      foreach ($h in $upRes.Headers) {
        $name = $h.Key
        if ($name.ToLowerInvariant().StartsWith("access-control-")) { continue }
        $res.Headers[$name] = ($h.Value -join ",")
      }
      foreach ($h in $upRes.Content.Headers) {
        $name = $h.Key
        if ($name.ToLowerInvariant().StartsWith("access-control-")) { continue }
        if ($name -eq "Content-Type") { continue }
        $res.Headers[$name] = ($h.Value -join ",")
      }

      $outBytes = $upRes.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
      $res.OutputStream.Write($outBytes, 0, $outBytes.Length)
      $res.Close()
    } catch {
      $res.StatusCode = 502
      $res.ContentType = "application/json"
      $msg = $_.Exception.Message.Replace('"','\"')
      $payload = "{""error"":""proxy_error"",""message"":""$msg"",""upstream"":""$Upstream/""}"
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
    }
  }
} finally {
  try { $listener.Stop() } catch {}
  try { $listener.Close() } catch {}
  try { $http.Dispose() } catch {}
}


