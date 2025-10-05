require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { connectDB } = require('./config/database');

// Test lazy loading performance
class LazyLoadingTester {
  constructor() {
    this.results = [];
  }

  async testLazyLoadingPerformance() {
    console.log('🚀 Testing lazy loading performance...\n');
    
    try {
      await connectDB();
      
      // Test 1: First page load (should be fast)
      console.log('1️⃣ Testing first page load...');
      const start1 = Date.now();
      
      const pipeline1 = [
        { $match: { isActive: true } },
        { $sort: { createdAt: -1 } },
        { $skip: 0 },
        { $limit: 11 }, // Get one extra to check hasMore
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            profileImage: 1,
            createdAt: 1
          }
        }
      ];

      const users1 = await User.aggregate(pipeline1);
      const hasMore1 = users1.length > 10;
      if (hasMore1) users1.pop();
      
      const duration1 = Date.now() - start1;
      console.log(`   ✅ First page: ${duration1}ms (${users1.length} users, hasMore: ${hasMore1})`);
      
      this.results.push({
        test: 'first_page',
        duration: duration1,
        count: users1.length,
        hasMore: hasMore1
      });

      // Test 2: Page 5 load (middle pagination)
      console.log('\n2️⃣ Testing page 5 load...');
      const start2 = Date.now();
      
      const pipeline2 = [
        { $match: { isActive: true } },
        { $sort: { createdAt: -1 } },
        { $skip: 40 }, // Page 5 with 10 items per page
        { $limit: 11 },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            createdAt: 1
          }
        }
      ];

      const users2 = await User.aggregate(pipeline2);
      const hasMore2 = users2.length > 10;
      if (hasMore2) users2.pop();
      
      const duration2 = Date.now() - start2;
      console.log(`   ✅ Page 5: ${duration2}ms (${users2.length} users, hasMore: ${hasMore2})`);
      
      this.results.push({
        test: 'page_5',
        duration: duration2,
        count: users2.length,
        hasMore: hasMore2
      });

      // Test 3: Search with lazy loading
      console.log('\n3️⃣ Testing search with lazy loading...');
      const start3 = Date.now();
      
      const pipeline3 = [
        {
          $match: {
            isActive: true,
            $or: [
              { firstName: { $regex: 'test', $options: 'i' } },
              { lastName: { $regex: 'test', $options: 'i' } },
              { email: { $regex: 'test', $options: 'i' } }
            ]
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: 0 },
        { $limit: 11 },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1
          }
        }
      ];

      const users3 = await User.aggregate(pipeline3);
      const hasMore3 = users3.length > 10;
      if (hasMore3) users3.pop();
      
      const duration3 = Date.now() - start3;
      console.log(`   ✅ Search: ${duration3}ms (${users3.length} users, hasMore: ${hasMore3})`);
      
      this.results.push({
        test: 'search',
        duration: duration3,
        count: users3.length,
        hasMore: hasMore3
      });

      // Test 4: Role-based filtering
      console.log('\n4️⃣ Testing role-based filtering...');
      const start4 = Date.now();
      
      const pipeline4 = [
        {
          $match: {
            isActive: true,
            role: 'worker'
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: 0 },
        { $limit: 11 },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            createdAt: 1
          }
        }
      ];

      const users4 = await User.aggregate(pipeline4);
      const hasMore4 = users4.length > 10;
      if (hasMore4) users4.pop();
      
      const duration4 = Date.now() - start4;
      console.log(`   ✅ Role filter: ${duration4}ms (${users4.length} users, hasMore: ${hasMore4})`);
      
      this.results.push({
        test: 'role_filter',
        duration: duration4,
        count: users4.length,
        hasMore: hasMore4
      });

      // Test 5: Load more simulation
      console.log('\n5️⃣ Testing load more simulation...');
      const start5 = Date.now();
      
      const pipeline5 = [
        { $match: { isActive: true } },
        { $sort: { createdAt: -1 } },
        { $skip: 10 }, // Load next batch
        { $limit: 10 },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1
          }
        }
      ];

      const users5 = await User.aggregate(pipeline5);
      const duration5 = Date.now() - start5;
      console.log(`   ✅ Load more: ${duration5}ms (${users5.length} users)`);
      
      this.results.push({
        test: 'load_more',
        duration: duration5,
        count: users5.length
      });

      // Test 6: Statistics without loading all data
      console.log('\n6️⃣ Testing statistics generation...');
      const start6 = Date.now();
      
      const statsPipeline = [
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            activeCount: { 
              $sum: { $cond: ['$isActive', 1, 0] } 
            }
          }
        },
        { $sort: { count: -1 } }
      ];

      const stats = await User.aggregate(statsPipeline);
      const totalUsers = await User.countDocuments({});
      const activeUsers = await User.countDocuments({ isActive: true });
      
      const duration6 = Date.now() - start6;
      console.log(`   ✅ Statistics: ${duration6}ms (${stats.length} role groups)`);
      
      this.results.push({
        test: 'statistics',
        duration: duration6,
        count: stats.length
      });

      // Generate performance report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Lazy loading test failed:', error);
    } finally {
      await mongoose.connection.close();
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 LAZY LOADING PERFORMANCE REPORT');
    console.log('='.repeat(70));
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = totalDuration / this.results.length;
    
    console.log('\n🔍 PERFORMANCE RESULTS:');
    this.results.forEach(result => {
      console.log(`   • ${result.test}: ${result.duration}ms (${result.count} items)`);
      if (result.hasMore !== undefined) {
        console.log(`     Has more: ${result.hasMore}`);
      }
    });
    
    console.log(`\n📈 OVERALL METRICS:`);
    console.log(`   • Total tests: ${this.results.length}`);
    console.log(`   • Average response time: ${averageDuration.toFixed(2)}ms`);
    console.log(`   • Total test duration: ${totalDuration}ms`);
    
    // Performance analysis
    console.log(`\n💡 PERFORMANCE ANALYSIS:`);
    
    const fastQueries = this.results.filter(r => r.duration < 50);
    const mediumQueries = this.results.filter(r => r.duration >= 50 && r.duration < 100);
    const slowQueries = this.results.filter(r => r.duration >= 100);
    
    console.log(`   • Fast queries (< 50ms): ${fastQueries.length}`);
    console.log(`   • Medium queries (50-100ms): ${mediumQueries.length}`);
    console.log(`   • Slow queries (> 100ms): ${slowQueries.length}`);
    
    if (averageDuration < 50) {
      console.log(`   🚀 EXCELLENT: Lazy loading is performing very well`);
    } else if (averageDuration < 100) {
      console.log(`   ✅ GOOD: Lazy loading performance is acceptable`);
    } else {
      console.log(`   ⚠️  NEEDS IMPROVEMENT: Consider further optimization`);
    }
    
    console.log(`\n🔧 LAZY LOADING BENEFITS:`);
    console.log(`   • Only loads data when needed`);
    console.log(`   • Reduces initial page load time`);
    console.log(`   • Improves user experience`);
    console.log(`   • Reduces server memory usage`);
    console.log(`   • Enables infinite scroll functionality`);
    console.log(`   • Optimizes database queries`);
    
    console.log(`\n📱 FRONTEND INTEGRATION TIPS:`);
    console.log(`   • Use infinite scroll for better UX`);
    console.log(`   • Implement loading states`);
    console.log(`   • Cache loaded data in frontend`);
    console.log(`   • Use virtual scrolling for large lists`);
    console.log(`   • Implement search debouncing`);
    
    console.log('\n' + '='.repeat(70));
  }
}

// Run the test
if (require.main === module) {
  const tester = new LazyLoadingTester();
  tester.testLazyLoadingPerformance().catch(console.error);
}

module.exports = LazyLoadingTester;

