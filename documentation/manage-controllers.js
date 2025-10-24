#!/usr/bin/env node

/**
 * Controller Management Script
 * Helps you enable/disable controllers one by one
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 Controller Management Tool\n');

// Current server.js content
const serverPath = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Controller status
const controllers = {
  'goalKpiController': {
    file: 'controllers/goalKpiController.js',
    route: 'routes/goalKpi.js',
    endpoint: '/api/goal-kpi',
    status: 'ACTIVE',
    usedBy: ['WorkerDashboard.tsx', 'TeamLeaderMonitoring.tsx', 'MonthlyPerformanceSection.tsx']
  },
  'workReadinessAssignmentController': {
    file: 'controllers/workReadinessAssignmentController.js',
    route: 'routes/workReadinessAssignments.js',
    endpoint: '/api/work-readiness-assignments',
    status: 'ACTIVE',
    usedBy: ['WorkReadinessAssignmentManager.tsx', 'backendAssignmentApi.ts']
  },
  'workReadinessControllerEnhanced': {
    file: 'controllers/workReadinessController.enhanced.js',
    route: 'routes/workReadiness.js', // Not created yet
    endpoint: '/api/work-readiness',
    status: 'DISABLED',
    usedBy: ['None - Not connected yet']
  }
};

// Check current status
console.log('📊 Current Controller Status:');
console.log('================================');

Object.entries(controllers).forEach(([name, config]) => {
  const statusIcon = config.status === 'ACTIVE' ? '✅' : '❌';
  console.log(`${statusIcon} ${name}`);
  console.log(`   File: ${config.file}`);
  console.log(`   Route: ${config.route}`);
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Status: ${config.status}`);
  console.log(`   Used by: ${config.usedBy.join(', ')}`);
  console.log('');
});

// Check if routes are in server.js
console.log('🔍 Checking server.js routing:');
console.log('==============================');

const activeRoutes = [];
const inactiveRoutes = [];

Object.entries(controllers).forEach(([name, config]) => {
  const routePattern = `app.use('${config.endpoint}'`;
  if (serverContent.includes(routePattern)) {
    activeRoutes.push(name);
    console.log(`✅ ${name} - Route active in server.js`);
  } else {
    inactiveRoutes.push(name);
    console.log(`❌ ${name} - Route NOT in server.js`);
  }
});

console.log('\n📋 Summary:');
console.log('===========');
console.log(`Active Routes: ${activeRoutes.length}`);
console.log(`Inactive Routes: ${inactiveRoutes.length}`);

// Check if route files exist
console.log('\n📁 Checking route files:');
console.log('========================');

Object.entries(controllers).forEach(([name, config]) => {
  const routePath = path.join(__dirname, config.route);
  if (fs.existsSync(routePath)) {
    console.log(`✅ ${config.route} - File exists`);
  } else {
    console.log(`❌ ${config.route} - File missing`);
  }
});

// Recommendations
console.log('\n💡 Recommendations:');
console.log('==================');

if (inactiveRoutes.length > 0) {
  console.log('🚀 Ready to add:');
  inactiveRoutes.forEach(name => {
    const config = controllers[name];
    console.log(`   - ${name} (${config.endpoint})`);
  });
  
  console.log('\n📝 To add a controller:');
  console.log('   1. Create route file if missing');
  console.log('   2. Add to server.js');
  console.log('   3. Test with Postman/curl');
  console.log('   4. Update frontend to use new endpoints');
}

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Keep current system working (don\'t break anything)');
console.log('2. Add enhanced controller when ready');
console.log('3. Test one endpoint at a time');
console.log('4. Migrate frontend gradually');

console.log('\n✅ Your current system is working fine!');
console.log('🔄 Enhanced features are ready when you want them!');

