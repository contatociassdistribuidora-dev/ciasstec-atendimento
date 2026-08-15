@echo off
powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri 'http://127.0.0.1:8091/status' -TimeoutSec 3) | ConvertTo-Json } catch { Write-Host 'Conector offline.'; exit 1 }"
