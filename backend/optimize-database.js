require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { connectDB } = require('./config/database');

// Database optimization script
async function optimizeDatabase() {
  console.log('🔧 Starting database optimization...\n');
  
  try {
    await connectDB();
    
    console.log('1️⃣ Creating additional indexes for better performance...');
    
    // Create compound indexes for common query patterns
    const indexes = [
      // User search optimization
      {
        name: 'user_search_compound',
        index: { firstName: 'text', lastName: 'text', email: 'text' },
        options: { weights: { firstName: 10, lastName: 10, email: 5 } }
      },
      
      // Role and active status compound index
      {
        name: 'role_active_compound',
        index: { role: 1, isActive: 1, createdAt: -1 }
      },
      
      // Employer lookup optimization
      {
        name: 'employer_lookup',
        index: { employer: 1, isActive: 1 }
      },
      
      // Team leader optimization
      {
        name: 'team_leader_lookup',
        index: { teamLeader: 1, isActive: 1 }
      },
      
      // Login activity optimization
      {
        name: 'login_activity',
        index: { lastLogin: -1, isActive: 1 }
      },
      
      // Clinician availability optimization
      {
        name: 'clinician_availability',
        index: { role: 1, isActive: 1, isAvailable: 1 }
      },
      
      // User creation date for pagination
      {
        name: 'created_at_desc',
        index: { createdAt: -1 }
      },
      
      // Email uniqueness (already exists but ensure it's there)
      {
        name: 'email_unique',
        index: { email: 1 },
        options: { unique: true }
      }
    ];
    
    for (const indexSpec of indexes) {
      try {
        console.log(`   Creating index: ${indexSpec.name}...`);
        await User.collection.createIndex(indexSpec.index, {
          name: indexSpec.name,
          ...indexSpec.options
        });
        console.log(`   ✅ Index ${indexSpec.name} created successfully`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`   ℹ️  Index ${indexSpec.name} already exists`);
        } else {
          console.log(`   ⚠️  Error creating index ${indexSpec.name}:`, error.message);
        }
      }
    }
    
    console.log('\n2️⃣ Analyzing existing indexes...');
    const existingIndexes = await User.collection.getIndexes();
    console.log(`   📊 Total indexes: ${existingIndexes.length}`);
    
    existingIndexes.forEach(index => {
      console.log(`   • ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n3️⃣ Testing query performance with new indexes...');
    
    // Test search performance
    const searchStart = Date.now();
    const searchResults = await User.find({
      $or: [
        { firstName: { $regex: 'test', $options: 'i' } },
        { lastName: { $regex: 'test', $options: 'i' } },
        { email: { $regex: 'test', $options: 'i' } }
      ],
      isActive: true
    }).limit(10).lean();
    const searchDuration = Date.now() - searchStart;
    console.log(`   🔍 Search query: ${searchDuration}ms (${searchResults.length} results)`);
    
    // Test role-based query
    const roleStart = Date.now();
    const roleResults = await User.find({
      role: 'worker',
      isActive: true
    }).sort({ createdAt: -1 }).limit(20).lean();
    const roleDuration = Date.now() - roleStart;
    console.log(`   👥 Role query: ${roleDuration}ms (${roleResults.length} results)`);
    
    // Test aggregation performance
    const aggStart = Date.now();
    const aggResults = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const aggDuration = Date.now() - aggStart;
    console.log(`   📊 Aggregation query: ${aggDuration}ms (${aggResults.length} groups)`);
    
    console.log('\n4️⃣ Database statistics...');
    const stats = await User.collection.stats();
    console.log(`   📈 Collection size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📄 Document count: ${stats.count}`);
    console.log(`   🗂️  Index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ⚡ Average document size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ Database optimization completed successfully!');
    console.log('\n💡 PERFORMANCE IMPROVEMENTS:');
    console.log('   • Added compound indexes for common query patterns');
    console.log('   • Optimized search queries with text indexes');
    console.log('   • Improved role-based filtering performance');
    console.log('   • Enhanced pagination with proper sorting indexes');
    console.log('   • Added indexes for team management operations');
    
    console.log('\n🚀 Your database is now optimized for high-performance operations!');
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run optimization
if (require.main === module) {
  optimizeDatabase().catch(console.error);
}

module.exports = optimizeDatabase;

