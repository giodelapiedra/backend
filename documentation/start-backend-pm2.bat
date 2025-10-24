@echo off
echo Starting KPI Backend with PM2...
echo.

REM Kill any existing PM2 processes
pm2 delete kpi-backend 2>nul

REM Start the application
pm2 start ecosystem.config.js --env development

REM Show status
pm2 status

echo.
echo Backend started! Access at: http://localhost:5001
echo.
echo Useful PM2 commands:
echo   pm2 status          - Check status
echo   pm2 logs kpi-backend - View logs
echo   pm2 restart kpi-backend - Restart
echo   pm2 stop kpi-backend - Stop
echo   pm2 delete kpi-backend - Delete
echo.
pause