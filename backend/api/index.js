// Vercel API entry point
require('dotenv').config({ path: './env.supabase' });

// Import the main server app
const app = require('../server');

// Export for Vercel
module.exports = app;
