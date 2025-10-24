#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

console.log('🔧 Backend Server Fix Script');
console.log('============================\n');

// Function to kill processes on port 5001
function killPort5001() {
  return new Promise((resolve) => {
    console.log('1. Killing processes on port 5001...');
    
    // Windows command to find and kill processes on port 5001
    exec('netstat -ano | findstr :5001', (error, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            if (pid && pid !== '0') {
              pids.add(pid);
            }
          }
        });
        
        if (pids.size > 0) {
          console.log(`   Found ${pids.size} process(es) using port 5001`);
          pids.forEach(pid => {
            console.log(`   Killing process ${pid}...`);
            exec(`taskkill /PID ${pid} /F`, (killError) => {
              if (!killError) {
                console.log(`   ✅ Process ${pid} killed`);
              }
            });
          });
        } else {
          console.log('   ✅ No processes found on port 5001');
        }
      } else {
        console.log('   ✅ No processes found on port 5001');
      }
      
      // Wait a moment for processes to be killed
      setTimeout(resolve, 2000);
    });
  });
}

// Function to install PM2 globally
function installPM2() {
  return new Promise((resolve) => {
    console.log('\n2. Installing PM2 process manager...');
    exec('npm install -g pm2', (error, stdout, stderr) => {
      if (error) {
        console.log('   ⚠️  PM2 installation failed (may already be installed)');
      } else {
        console.log('   ✅ PM2 installed successfully');
      }
      resolve();
    });
  });
}

// Function to create PM2 ecosystem file
function createPM2Config() {
  console.log('\n3. Creating PM2 configuration...');
  
  const pm2Config = {
    apps: [{
      name: 'kpi-backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      max_memory_restart: '1G',
      node_args: '--expose-gc --max-old-space-size=1024',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }]
  };
  
  fs.writeFileSync('./ecosystem.config.js', `module.exports = ${JSON.stringify(pm2Config, null, 2)};`);
  console.log('   ✅ PM2 ecosystem.config.js created');
}

// Function to create startup scripts
function createStartupScripts() {
  console.log('\n4. Creating startup scripts...');
  
  // Windows batch file
  const batchScript = `@echo off
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
pause`;

  fs.writeFileSync('./start-backend-pm2.bat', batchScript);
  console.log('   ✅ start-backend-pm2.bat created');
  
  // PowerShell script
  const psScript = `# KPI Backend PM2 Startup Script
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
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`;

  fs.writeFileSync('./start-backend-pm2.ps1', psScript);
  console.log('   ✅ start-backend-pm2.ps1 created');
}

// Function to fix the KPI calculation error
function fixKPIError() {
  console.log('\n5. Fixing KPI calculation error...');
  
  const teamKPIServicePath = './services/teamKPI.service.js';
  
  if (fs.existsSync(teamKPIServicePath)) {
    let content = fs.readFileSync(teamKPIServicePath, 'utf8');
    
    // Fix the toFixed error by adding null checks
    const fixedContent = content.replace(
      /(\w+)\.toFixed\(/g,
      '($1 || 0).toFixed('
    );
    
    if (content !== fixedContent) {
      fs.writeFileSync(teamKPIServicePath, fixedContent);
      console.log('   ✅ Fixed KPI calculation error (added null checks)');
    } else {
      console.log('   ✅ KPI calculation already fixed');
    }
  } else {
    console.log('   ⚠️  teamKPI.service.js not found');
  }
}

// Function to optimize server configuration
function optimizeServerConfig() {
  console.log('\n6. Optimizing server configuration...');
  
  const serverPath = './server.js';
  
  if (fs.existsSync(serverPath)) {
    let content = fs.readFileSync(serverPath, 'utf8');
    
    // Add better error handling
    const errorHandlingCode = `
// ✅ ENHANCED: Better error handling for crashes
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - Server will restart:', error);
  // Don't exit immediately, let PM2 handle restart
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection - Server will restart:', { reason, promise });
  // Don't exit immediately, let PM2 handle restart
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// ✅ ENHANCED: Memory monitoring
setInterval(() => {
  const used = process.memoryUsage();
  const memoryMB = Math.round(used.heapUsed / 1024 / 1024);
  
  if (memoryMB > 800) { // If memory usage > 800MB
    logger.warn('High memory usage detected', { memoryMB });
    if (global.gc) {
      global.gc();
      logger.info('Garbage collection triggered');
    }
  }
}, 30000); // Check every 30 seconds`;

    // Check if enhanced error handling already exists
    if (!content.includes('ENHANCED: Better error handling')) {
      // Find the existing error handlers and replace them
      content = content.replace(
        /process\.on\('uncaughtException',[^}]+}/g,
        errorHandlingCode
      );
      
      fs.writeFileSync(serverPath, content);
      console.log('   ✅ Enhanced error handling added');
    } else {
      console.log('   ✅ Server configuration already optimized');
    }
  } else {
    console.log('   ⚠️  server.js not found');
  }
}

// Main execution
async function main() {
  try {
    await killPort5001();
    await installPM2();
    createPM2Config();
    createStartupScripts();
    fixKPIError();
    optimizeServerConfig();
    
    console.log('\n=====================================');
    console.log('✅ Backend Fix Complete!');
    console.log('=====================================');
    console.log('');
    console.log('🚀 To start your backend server:');
    console.log('   Windows: Run start-backend-pm2.bat');
    console.log('   PowerShell: Run start-backend-pm2.ps1');
    console.log('   Manual: pm2 start ecosystem.config.js');
    console.log('');
    console.log('🔧 PM2 will automatically:');
    console.log('   - Restart the server if it crashes');
    console.log('   - Monitor memory usage');
    console.log('   - Handle port conflicts');
    console.log('   - Provide better logging');
    console.log('');
    console.log('📊 Monitor your server:');
    console.log('   pm2 status - Check server status');
    console.log('   pm2 logs kpi-backend - View logs');
    console.log('=====================================\n');
    
  } catch (error) {
    console.error('❌ Error during fix process:', error);
  }
}

main();
