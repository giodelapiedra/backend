@echo off
echo ========================================
echo Starting Backend Server
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
echo Installing dependencies...
call npm install @supabase/supabase-js

echo.
echo Starting server on port 5001...
echo.
echo ========================================
echo Backend Server Starting...
echo ========================================
echo.

node server.js

pause
