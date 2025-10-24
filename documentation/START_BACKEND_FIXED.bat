@echo off
echo ========================================
echo Starting Backend Server (FIXED VERSION)
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)

echo.
echo Killing any existing node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Installing dependencies...
call npm install express cors dotenv @supabase/supabase-js

echo.
echo Setting correct port in env.supabase...
powershell -Command "(Get-Content env.supabase) -replace 'PORT=5000', 'PORT=5001' | Set-Content env.supabase"

echo.
echo Starting server on port 5001...
echo.
echo ========================================
echo Backend Server Starting...
echo ========================================
echo.
echo IMPORTANT: Keep this window open!
echo.

node server.js

pause
