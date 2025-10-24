@echo off
echo Starting KPI API Backend Server with Memory Optimization...
echo.

REM Kill any existing Node.js processes on port 5001
echo Checking for existing processes on port 5001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001') do (
    echo Killing process %%a
    taskkill /PID %%a /F >nul 2>&1
)

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start the server with garbage collection enabled
echo Starting optimized server...
node --expose-gc --max-old-space-size=1024 server-optimized.js

pause
