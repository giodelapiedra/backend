@echo off
echo 🔧 Fixing Backend Port Conflict...
echo.

echo 🛑 Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM nodemon.exe 2>nul

echo ⏳ Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo 🚀 Starting backend with PM2...
pm2 start ecosystem.config.js --env development

echo 📊 Checking status...
pm2 status

echo.
echo ✅ Backend should now be running smoothly!
echo 🌐 Access at: http://localhost:5001
echo 🔍 Health check: http://localhost:5001/health
echo.
pause
