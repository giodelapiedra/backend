# KPI API Backend Server Startup Script with Memory Optimization
Write-Host "🚀 Starting KPI API Backend Server with Memory Optimization..." -ForegroundColor Green
Write-Host ""

# Kill any existing Node.js processes on port 5001
Write-Host "🔍 Checking for existing processes on port 5001..." -ForegroundColor Yellow
try {
    $processes = Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue
    if ($processes) {
        foreach ($process in $processes) {
            $pid = $process.OwningProcess
            Write-Host "Killing process $pid" -ForegroundColor Red
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Host "No existing processes found on port 5001" -ForegroundColor Green
}

# Wait a moment
Start-Sleep -Seconds 2

# Start the server with garbage collection enabled
Write-Host "🚀 Starting optimized server..." -ForegroundColor Green
Write-Host "Memory limit: 1GB" -ForegroundColor Cyan
Write-Host "Garbage collection: Enabled" -ForegroundColor Cyan
Write-Host ""

try {
    node --expose-gc --max-old-space-size=1024 server-optimized.js
} catch {
    Write-Host "❌ Failed to start server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
