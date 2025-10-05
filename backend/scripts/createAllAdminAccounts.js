const bcrypt = require('bcryptjs');
const { supabase, db } = require('../config/supabase');

// All roles in the system
const roles = [
  'admin',
  'worker', 
  'employer',
  'site_supervisor',
  'clinician',
  'case_manager',
  'gp_insurer',
  'team_leader'
];

// Default password for all admin accounts
const defaultPassword = 'Admin123!@#';

// Create admin account for a specific role
const createAdminAccount = async (role) => {
  try {
    const email = `admin_${role}@test.com`;
    const firstName = `Admin`;
    const lastName = `${role.charAt(0).toUpperCase() + role.slice(1)}`;
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);
    
    // Check if user already exists
    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      console.log(`⚠️  Admin account for ${role} already exists: ${email}`);
      return existingUser;
    }
    
    // Create user data
    const userData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      password_hash: passwordHash,
      role: role,
      phone: '+1234567890',
      is_active: true
    };
    
    // Add role-specific fields (only if columns exist)
    if (role === 'team_leader') {
      userData.team = 'DEFAULT TEAM';
      userData.default_team = 'DEFAULT TEAM';
    }
    
    // Create user in Supabase
    const user = await db.users.create(userData);
    
    console.log(`✅ Created admin account for ${role}:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Role: ${role}`);
    console.log(`   ID: ${user.id}`);
    console.log('');
    
    return user;
    
  } catch (error) {
    console.error(`❌ Error creating admin account for ${role}:`, error);
    throw error;
  }
};

// Main function to create all admin accounts
const createAllAdminAccounts = async () => {
  console.log('🚀 Creating admin accounts for all roles...\n');
  
  try {
    const createdUsers = [];
    
    for (const role of roles) {
      const user = await createAdminAccount(role);
      createdUsers.push({ role, user });
    }
    
    console.log('🎉 All admin accounts created successfully!\n');
    console.log('📋 Summary of created accounts:');
    console.log('=====================================');
    
    createdUsers.forEach(({ role, user }) => {
      console.log(`${role.toUpperCase()}:`);
      console.log(`  Email: admin_${role}@test.com`);
      console.log(`  Password: ${defaultPassword}`);
      console.log(`  ID: ${user.id}`);
      console.log('');
    });
    
    console.log('🔐 Default password for all accounts: ' + defaultPassword);
    console.log('\n⚠️  Please change these passwords after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin accounts:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  createAllAdminAccounts()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createAllAdminAccounts, createAdminAccount };
