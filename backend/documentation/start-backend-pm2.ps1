# KPI Backend PM2 Startup Script
Write-Host "🚀 Starting KPI Backend with PM2..." -ForegroundColor Green
Write-Host ""

# Kill any existing PM2 processes
Write-Host "🔄 Stopping existing processes..." -ForegroundColor Yellow
pm2 delete kpi-backend 2>$null

# Start the application
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
pm2 start ecosystem.config.js --env development

# Show status
Write-Host ""
Write-Host "📊 Server Status:" -ForegroundColor Cyan
pm2 status

Write-Host ""
Write-Host "✅ Backend started! Access at: http://localhost:5001" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Useful PM2 commands:" -ForegroundColor Yellow
Write-Host "   pm2 status          - Check status"
Write-Host "   pm2 logs kpi-backend - View logs"
Write-Host "   pm2 restart kpi-backend - Restart"
Write-Host "   pm2 stop kpi-backend - Stop"
Write-Host "   pm2 delete kpi-backend - Delete"
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")