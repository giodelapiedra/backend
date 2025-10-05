require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { connectDB } = require('./config/database');

// Performance test configuration
const TEST_CONFIG = {
  // Test different user loads
  USER_COUNTS: [100, 500, 1000, 2000, 5000],
  // Number of concurrent operations
  CONCURRENT_OPERATIONS: [1, 5, 10, 20, 50],
  // Test different query types
  QUERY_TYPES: ['find', 'findOne', 'aggregate', 'count', 'update', 'insert']
};

class DatabasePerformanceTester {
  constructor() {
    this.results = [];
    this.testUsers = [];
  }

  async initialize() {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected successfully');
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...');
    await User.deleteMany({ email: { $regex: /^testuser/ } });
    console.log('✅ Cleanup completed');
  }

  async generateTestUsers(count) {
    console.log(`📝 Generating ${count} test users...`);
    const users = [];
    
    for (let i = 0; i < count; i++) {
      users.push({
        firstName: `TestUser${i}`,
        lastName: `LastName${i}`,
        email: `testuser${i}@performance.test`,
        password: 'TestPassword123',
        role: ['worker', 'clinician', 'admin', 'employer'][i % 4],
        phone: `+123456789${i.toString().padStart(3, '0')}`,
        isActive: Math.random() > 0.1, // 90% active users
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date within last year
      });
    }
    
    return users;
  }

  async measureOperation(operation, ...args) {
    const startTime = process.hrtime.bigint();
    const result = await operation(...args);
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    return { result, duration };
  }

  async testBulkInsert(userCount) {
    console.log(`\n📥 Testing bulk insert for ${userCount} users...`);
    
    const users = await this.generateTestUsers(userCount);
    
    const { duration } = await this.measureOperation(async () => {
      return await User.insertMany(users, { ordered: false });
    });
    
    const result = {
      operation: 'bulk_insert',
      userCount,
      duration,
      throughput: userCount / (duration / 1000), // users per second
      avgTimePerUser: duration / userCount
    };
    
    this.results.push(result);
    console.log(`✅ Bulk insert: ${duration.toFixed(2)}ms (${result.throughput.toFixed(2)} users/sec)`);
    
    return result;
  }

  async testFindQueries(userCount) {
    console.log(`\n🔍 Testing find queries with ${userCount} users...`);
    
    const queries = [
      { name: 'find_all', query: {} },
      { name: 'find_active', query: { isActive: true } },
      { name: 'find_by_role', query: { role: 'worker' } },
      { name: 'find_recent', query: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { name: 'find_with_limit', query: {}, options: { limit: 100 } },
      { name: 'find_with_sort', query: {}, options: { sort: { createdAt: -1 }, limit: 50 } }
    ];
    
    for (const queryTest of queries) {
      const { duration } = await this.measureOperation(async () => {
        return await User.find(queryTest.query, null, queryTest.options || {});
      });
      
      const result = {
        operation: `find_${queryTest.name}`,
        userCount,
        duration,
        queryType: queryTest.name
      };
      
      this.results.push(result);
      console.log(`✅ ${queryTest.name}: ${duration.toFixed(2)}ms`);
    }
  }

  async testAggregationQueries(userCount) {
    console.log(`\n📊 Testing aggregation queries with ${userCount} users...`);
    
    const aggregations = [
      {
        name: 'count_by_role',
        pipeline: [{ $group: { _id: '$role', count: { $sum: 1 } } }]
      },
      {
        name: 'active_users_count',
        pipeline: [{ $match: { isActive: true } }, { $count: 'activeUsers' }]
      },
      {
        name: 'users_by_month',
        pipeline: [
          { $group: { 
            _id: { 
              year: { $year: '$createdAt' }, 
              month: { $month: '$createdAt' } 
            }, 
            count: { $sum: 1 } 
          }},
          { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]
      },
      {
        name: 'role_statistics',
        pipeline: [
          { $group: { 
            _id: '$role', 
            count: { $sum: 1 },
            activeCount: { $sum: { $cond: ['$isActive', 1, 0] } }
          }}
        ]
      }
    ];
    
    for (const aggTest of aggregations) {
      const { duration } = await this.measureOperation(async () => {
        return await User.aggregate(aggTest.pipeline);
      });
      
      const result = {
        operation: `aggregation_${aggTest.name}`,
        userCount,
        duration,
        queryType: aggTest.name
      };
      
      this.results.push(result);
      console.log(`✅ ${aggTest.name}: ${duration.toFixed(2)}ms`);
    }
  }

  async testConcurrentOperations(userCount, concurrentOps) {
    console.log(`\n⚡ Testing ${concurrentOps} concurrent operations with ${userCount} users...`);
    
    const operations = [
      () => User.find({ isActive: true }).limit(10),
      () => User.findOne({ role: 'worker' }),
      () => User.countDocuments({ isActive: true }),
      () => User.find({ role: 'clinician' }).sort({ createdAt: -1 }).limit(5),
      () => User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
    ];
    
    const promises = [];
    for (let i = 0; i < concurrentOps; i++) {
      const operation = operations[i % operations.length];
      promises.push(this.measureOperation(operation));
    }
    
    const startTime = process.hrtime.bigint();
    const results = await Promise.all(promises);
    const endTime = process.hrtime.bigint();
    const totalDuration = Number(endTime - startTime) / 1000000;
    
    const avgOperationTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxOperationTime = Math.max(...results.map(r => r.duration));
    const minOperationTime = Math.min(...results.map(r => r.duration));
    
    const result = {
      operation: 'concurrent_operations',
      userCount,
      concurrentOps,
      totalDuration,
      avgOperationTime,
      maxOperationTime,
      minOperationTime,
      throughput: concurrentOps / (totalDuration / 1000)
    };
    
    this.results.push(result);
    console.log(`✅ Concurrent ops: ${totalDuration.toFixed(2)}ms total, ${avgOperationTime.toFixed(2)}ms avg`);
  }

  async testUpdateOperations(userCount) {
    console.log(`\n✏️ Testing update operations with ${userCount} users...`);
    
    const updateTests = [
      {
        name: 'bulk_update_active',
        operation: () => User.updateMany(
          { email: { $regex: /^testuser/ } },
          { $set: { lastLogin: new Date() } }
        )
      },
      {
        name: 'single_update',
        operation: () => User.findOneAndUpdate(
          { email: { $regex: /^testuser/ } },
          { $set: { lastLogin: new Date() } },
          { new: true }
        )
      },
      {
        name: 'bulk_update_role',
        operation: () => User.updateMany(
          { role: 'worker', email: { $regex: /^testuser/ } },
          { $set: { package: 'package2' } }
        )
      }
    ];
    
    for (const updateTest of updateTests) {
      const { duration } = await this.measureOperation(updateTest.operation);
      
      const result = {
        operation: `update_${updateTest.name}`,
        userCount,
        duration,
        queryType: updateTest.name
      };
      
      this.results.push(result);
      console.log(`✅ ${updateTest.name}: ${duration.toFixed(2)}ms`);
    }
  }

  async testIndexPerformance() {
    console.log(`\n📈 Testing index performance...`);
    
    // Test queries that should use different indexes
    const indexTests = [
      { name: 'email_index', query: { email: 'testuser1@performance.test' } },
      { name: 'role_index', query: { role: 'worker' } },
      { name: 'active_index', query: { isActive: true } },
      { name: 'compound_index', query: { role: 'worker', isActive: true } },
      { name: 'created_index', query: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }
    ];
    
    for (const indexTest of indexTests) {
      const { duration } = await this.measureOperation(async () => {
        return await User.find(indexTest.query).explain('executionStats');
      });
      
      const result = {
        operation: `index_${indexTest.name}`,
        duration,
        queryType: indexTest.name
      };
      
      this.results.push(result);
      console.log(`✅ ${indexTest.name}: ${duration.toFixed(2)}ms`);
    }
  }

  async runFullPerformanceTest() {
    console.log('🚀 Starting comprehensive database performance test...\n');
    
    try {
      await this.initialize();
      await this.cleanup();
      
      // Test with different user counts
      for (const userCount of TEST_CONFIG.USER_COUNTS) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 TESTING WITH ${userCount} USERS`);
        console.log(`${'='.repeat(60)}`);
        
        // Insert test users
        await this.testBulkInsert(userCount);
        
        // Test different query types
        await this.testFindQueries(userCount);
        await this.testAggregationQueries(userCount);
        await this.testUpdateOperations(userCount);
        
        // Test concurrent operations
        for (const concurrentOps of TEST_CONFIG.CONCURRENT_OPERATIONS) {
          if (concurrentOps <= userCount) {
            await this.testConcurrentOperations(userCount, concurrentOps);
          }
        }
        
        // Test index performance
        await this.testIndexPerformance();
      }
      
      // Generate performance report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Performance test failed:', error);
    } finally {
      await this.cleanup();
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    
    // Group results by operation type
    const groupedResults = {};
    this.results.forEach(result => {
      if (!groupedResults[result.operation]) {
        groupedResults[result.operation] = [];
      }
      groupedResults[result.operation].push(result);
    });
    
    // Display summary for each operation type
    Object.keys(groupedResults).forEach(operation => {
      const results = groupedResults[operation];
      console.log(`\n🔍 ${operation.toUpperCase()}:`);
      
      if (operation.includes('bulk_insert')) {
        results.forEach(r => {
          console.log(`  ${r.userCount} users: ${r.duration.toFixed(2)}ms (${r.throughput.toFixed(2)} users/sec)`);
        });
      } else if (operation.includes('concurrent')) {
        results.forEach(r => {
          console.log(`  ${r.userCount} users, ${r.concurrentOps} ops: ${r.totalDuration.toFixed(2)}ms total, ${r.throughput.toFixed(2)} ops/sec`);
        });
      } else {
        results.forEach(r => {
          console.log(`  ${r.userCount} users: ${r.duration.toFixed(2)}ms`);
        });
      }
    });
    
    // Performance recommendations
    console.log('\n' + '='.repeat(80));
    console.log('💡 PERFORMANCE RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    const bulkInsertResults = groupedResults.bulk_insert || [];
    const findResults = groupedResults.find_all || [];
    const concurrentResults = groupedResults.concurrent_operations || [];
    
    if (bulkInsertResults.length > 0) {
      const maxUsers = Math.max(...bulkInsertResults.map(r => r.userCount));
      const maxThroughput = Math.max(...bulkInsertResults.map(r => r.throughput));
      console.log(`\n📥 BULK INSERT PERFORMANCE:`);
      console.log(`  • Maximum tested: ${maxUsers} users`);
      console.log(`  • Peak throughput: ${maxThroughput.toFixed(2)} users/second`);
      
      if (maxThroughput > 1000) {
        console.log(`  ✅ EXCELLENT: Can handle high user loads efficiently`);
      } else if (maxThroughput > 500) {
        console.log(`  ✅ GOOD: Performance is acceptable for moderate loads`);
      } else {
        console.log(`  ⚠️  NEEDS IMPROVEMENT: Consider database optimization`);
      }
    }
    
    if (concurrentResults.length > 0) {
      const maxConcurrent = Math.max(...concurrentResults.map(r => r.concurrentOps));
      const maxConcurrentThroughput = Math.max(...concurrentResults.map(r => r.throughput));
      console.log(`\n⚡ CONCURRENT OPERATIONS:`);
      console.log(`  • Maximum concurrent: ${maxConcurrent} operations`);
      console.log(`  • Peak throughput: ${maxConcurrentThroughput.toFixed(2)} operations/second`);
      
      if (maxConcurrentThroughput > 100) {
        console.log(`  ✅ EXCELLENT: Can handle high concurrent load`);
      } else if (maxConcurrentThroughput > 50) {
        console.log(`  ✅ GOOD: Concurrent performance is acceptable`);
      } else {
        console.log(`  ⚠️  NEEDS IMPROVEMENT: Consider connection pooling optimization`);
      }
    }
    
    console.log(`\n🔧 OPTIMIZATION SUGGESTIONS:`);
    console.log(`  • Ensure all frequently queried fields have proper indexes`);
    console.log(`  • Consider implementing database connection pooling`);
    console.log(`  • Monitor memory usage during high loads`);
    console.log(`  • Consider read replicas for read-heavy operations`);
    console.log(`  • Implement caching for frequently accessed data`);
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run the performance test
if (require.main === module) {
  const tester = new DatabasePerformanceTester();
  tester.runFullPerformanceTest().catch(console.error);
}

module.exports = DatabasePerformanceTester;

