@echo off
setlocal
cd /d "%~dp0"
echo CIASSTEC WhatsApp Web Local
where node >nul 2>nul || (echo Node.js nao encontrado. Instale o Node.js 22 e tente novamente.& exit /b 1)
if not exist node_modules\whatsapp-web.js\package.json call npm install
if not exist .env echo Configure whatsapp-local\.env a partir de .env.example antes do uso com o Supabase.
start "CIASSTEC WhatsApp Local" /min cmd /c "cd /d "%~dp0" && npm start"
timeout /t 3 /nobreak >nul
start "" "%CIASSTEC_SETTINGS_URL%"
if "%CIASSTEC_SETTINGS_URL%"=="" start "" "https://ciasstec.com.br/dashboard"
echo Conector iniciado em http://127.0.0.1:8091
