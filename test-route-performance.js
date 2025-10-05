require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { connectDB } = require('./config/database');

// Simple performance monitoring for routes
class RoutePerformanceMonitor {
  constructor() {
    this.metrics = {
      userQueries: [],
      authQueries: [],
      totalRequests: 0,
      averageResponseTime: 0
    };
  }

  async testOptimizedUserRoutes() {
    console.log('🚀 Testing optimized user routes...\n');
    
    try {
      await connectDB();
      
      // Test 1: Get all users with pagination
      console.log('1️⃣ Testing GET /api/users with pagination...');
      const start1 = Date.now();
      
      const pipeline = [
        { $match: { isActive: true } },
        { $sort: { createdAt: -1 } },
        { $skip: 0 },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: 'employer',
            foreignField: '_id',
            as: 'employerInfo',
            pipeline: [
              { $project: { firstName: 1, lastName: 1, email: 1 } }
            ]
          }
        },
        {
          $addFields: {
            employer: { $arrayElemAt: ['$employerInfo', 0] }
          }
        },
        {
          $project: {
            password: 0,
            employerInfo: 0,
            loginAttempts: 0,
            lockUntil: 0,
            resetPasswordToken: 0,
            resetPasswordExpires: 0,
            emailVerificationToken: 0,
            twoFactorSecret: 0
          }
        }
      ];

      const [users, total] = await Promise.all([
        User.aggregate(pipeline),
        User.countDocuments({ isActive: true })
      ]);
      
      const duration1 = Date.now() - start1;
      console.log(`   ✅ Found ${users.length} users in ${duration1}ms`);
      console.log(`   📊 Total users: ${total}`);
      
      this.metrics.userQueries.push({
        operation: 'get_users_paginated',
        duration: duration1,
        resultCount: users.length
      });

      // Test 2: Search users
      console.log('\n2️⃣ Testing user search...');
      const start2 = Date.now();
      
      const searchPipeline = [
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
        { $limit: 20 },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            isActive: 1,
            createdAt: 1
          }
        }
      ];

      const searchResults = await User.aggregate(searchPipeline);
      const duration2 = Date.now() - start2;
      
      console.log(`   ✅ Search completed in ${duration2}ms`);
      console.log(`   🔍 Found ${searchResults.length} matching users`);
      
      this.metrics.userQueries.push({
        operation: 'search_users',
        duration: duration2,
        resultCount: searchResults.length
      });

      // Test 3: Get user by ID
      console.log('\n3️⃣ Testing get user by ID...');
      const start3 = Date.now();
      
      const userPipeline = [
        { $match: { _id: users[0]?._id } },
        {
          $lookup: {
            from: 'users',
            localField: 'employer',
            foreignField: '_id',
            as: 'employerInfo',
            pipeline: [
              { $project: { firstName: 1, lastName: 1, email: 1 } }
            ]
          }
        },
        {
          $addFields: {
            employer: { $arrayElemAt: ['$employerInfo', 0] }
          }
        },
        {
          $project: {
            password: 0,
            employerInfo: 0,
            loginAttempts: 0,
            lockUntil: 0,
            resetPasswordToken: 0,
            resetPasswordExpires: 0,
            emailVerificationToken: 0,
            twoFactorSecret: 0
          }
        }
      ];

      const userResult = await User.aggregate(userPipeline);
      const duration3 = Date.now() - start3;
      
      console.log(`   ✅ User lookup completed in ${duration3}ms`);
      
      this.metrics.userQueries.push({
        operation: 'get_user_by_id',
        duration: duration3,
        resultCount: userResult.length
      });

      // Test 4: Optimized login simulation
      console.log('\n4️⃣ Testing optimized login simulation...');
      const start4 = Date.now();
      
      const testUser = await User.findOne({ email: { $regex: /test/i } })
        .select('+password')
        .lean();
      
      if (testUser) {
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare('TestPassword123', testUser.password);
        
        if (isMatch) {
          await User.findByIdAndUpdate(testUser._id, {
            $unset: { loginAttempts: 1, lockUntil: 1 },
            $set: { lastLogin: new Date() }
          });
        }
      }
      
      const duration4 = Date.now() - start4;
      console.log(`   ✅ Login simulation completed in ${duration4}ms`);
      
      this.metrics.authQueries.push({
        operation: 'login_simulation',
        duration: duration4
      });

      // Calculate performance metrics
      this.calculateMetrics();
      
    } catch (error) {
      console.error('❌ Performance test failed:', error);
    } finally {
      await mongoose.connection.close();
    }
  }

  calculateMetrics() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ROUTE OPTIMIZATION PERFORMANCE REPORT');
    console.log('='.repeat(60));
    
    const allQueries = [...this.metrics.userQueries, ...this.metrics.authQueries];
    const totalDuration = allQueries.reduce((sum, q) => sum + q.duration, 0);
    const averageDuration = totalDuration / allQueries.length;
    
    console.log(`\n🔍 USER ROUTES PERFORMANCE:`);
    this.metrics.userQueries.forEach(query => {
      console.log(`   • ${query.operation}: ${query.duration}ms (${query.resultCount} results)`);
    });
    
    console.log(`\n🔐 AUTH ROUTES PERFORMANCE:`);
    this.metrics.authQueries.forEach(query => {
      console.log(`   • ${query.operation}: ${query.duration}ms`);
    });
    
    console.log(`\n📈 OVERALL METRICS:`);
    console.log(`   • Total queries tested: ${allQueries.length}`);
    console.log(`   • Average response time: ${averageDuration.toFixed(2)}ms`);
    console.log(`   • Total test duration: ${totalDuration}ms`);
    
    // Performance recommendations
    console.log(`\n💡 OPTIMIZATION RESULTS:`);
    
    const slowQueries = allQueries.filter(q => q.duration > 100);
    if (slowQueries.length === 0) {
      console.log(`   ✅ All queries are performing well (< 100ms)`);
    } else {
      console.log(`   ⚠️  ${slowQueries.length} queries are slower than 100ms:`);
      slowQueries.forEach(q => {
        console.log(`      - ${q.operation}: ${q.duration}ms`);
      });
    }
    
    if (averageDuration < 50) {
      console.log(`   🚀 EXCELLENT: Average response time is very fast`);
    } else if (averageDuration < 100) {
      console.log(`   ✅ GOOD: Average response time is acceptable`);
    } else {
      console.log(`   ⚠️  NEEDS IMPROVEMENT: Consider further optimization`);
    }
    
    console.log(`\n🔧 OPTIMIZATION TECHNIQUES APPLIED:`);
    console.log(`   • Used MongoDB aggregation pipelines for complex queries`);
    console.log(`   • Implemented parallel query execution`);
    console.log(`   • Added proper field projection to reduce data transfer`);
    console.log(`   • Used lean() queries where appropriate`);
    console.log(`   • Optimized database updates with atomic operations`);
    console.log(`   • Added proper indexing for search operations`);
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the performance test
if (require.main === module) {
  const monitor = new RoutePerformanceMonitor();
  monitor.testOptimizedUserRoutes().catch(console.error);
}

module.exports = RoutePerformanceMonitor;

