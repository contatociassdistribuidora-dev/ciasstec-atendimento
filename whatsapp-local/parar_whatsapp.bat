@echo off
setlocal
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "127.0.0.1:8091" ^| findstr "LISTENING"') do taskkill /PID %%p /T /F >nul 2>nul
echo Conector WhatsApp Local parado.
