const { execSync } = require('child_process');
const path = require('path');

console.log('Starting custom build process...');

try {
  // Change to frontend directory
  process.chdir(path.join(__dirname, 'frontend'));
  
  console.log('Installing frontend dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('Building frontend (bypassing ESLint)...');
  // Set environment variables and run build
  process.env.DISABLE_ESLINT_PLUGIN = 'true';
  process.env.CI = 'false';
  execSync('npx react-scripts build', { stdio: 'inherit' });
  
  console.log('Installing Netlify functions dependencies...');
  process.chdir(path.join(__dirname, 'netlify', 'functions'));
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('Installing Netlify CLI plugin...');
  process.chdir(__dirname);
  execSync('npm install @netlify/plugin-functions-install-core', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
