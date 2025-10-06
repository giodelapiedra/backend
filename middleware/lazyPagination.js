const express = require('express');

// Skip MongoDB imports in production
let mongoose, User;
if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
  mongoose = require('mongoose');
  User = require('../models/User');
} else {
  console.log('Skipping MongoDB imports in lazyPagination middleware - using Supabase only');
  User = {};
}
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Lazy loading pagination middleware
const lazyPaginationMiddleware = (req, res, next) => {
  // Set default pagination parameters
  req.pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    skip: 0,
    hasMore: false,
    totalPages: 0,
    totalItems: 0
  };
  
  // Calculate skip value
  req.pagination.skip = (req.pagination.page - 1) * req.pagination.limit;
  
  // Limit maximum items per page for performance
  if (req.pagination.limit > 50) {
    req.pagination.limit = 50;
  }
  
  next();
};

// Optimized user listing with lazy loading
const getUsersWithLazyLoad = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    
    // Build optimized filter - exclude admin users
    const filter = { role: { $ne: 'admin' } };
    
    // Role-based filtering
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // Optimized search
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      if (searchTerm.length > 0) {
        filter.$or = [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ];
      }
    }

    // Use aggregation for better performance with lazy loading
    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit + 1 }, // Get one extra to check if there are more
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

    // Execute aggregation
    const users = await User.aggregate(pipeline);
    
    // Check if there are more items
    const hasMore = users.length > limit;
    if (hasMore) {
      users.pop(); // Remove the extra item
    }
    
    // Get total count only if needed (for first page or when explicitly requested)
    let totalItems = 0;
    if (page === 1 || req.query.includeTotal === 'true') {
      totalItems = await User.countDocuments(filter);
    }

    // Calculate pagination info
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : null;
    
    res.json({
      users: users,
      pagination: {
        current: page,
        limit: limit,
        hasMore: hasMore,
        totalPages: totalPages,
        totalItems: totalItems,
        nextPage: hasMore ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      },
      meta: {
        loadedAt: new Date().toISOString(),
        searchTerm: req.query.search || null,
        filter: req.query.role || null
      }
    });
    
  } catch (error) {
    console.error('Error in lazy loading users:', error);
    res.status(500).json({ message: 'Error loading users' });
  }
};

// Infinite scroll endpoint (loads next batch)
const loadMoreUsers = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    
    // Build filter - exclude admin users
    const filter = { role: { $ne: 'admin' } };
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      if (searchTerm.length > 0) {
        filter.$or = [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ];
      }
    }

    // Optimized pipeline for loading more
    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          role: 1,
          phone: 1,
          isActive: 1,
          profileImage: 1,
          createdAt: 1,
          employer: 1
        }
      }
    ];

    const users = await User.aggregate(pipeline);
    
    res.json({
      users: users,
      pagination: {
        current: page,
        limit: limit,
        hasMore: users.length === limit,
        nextPage: users.length === limit ? page + 1 : null
      }
    });
    
  } catch (error) {
    console.error('Error loading more users:', error);
    res.status(500).json({ message: 'Error loading more users' });
  }
};

// Search users with lazy loading
const searchUsersLazy = async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 10 } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.json({
        users: [],
        pagination: {
          current: 1,
          limit: parseInt(limit),
          hasMore: false,
          totalPages: 0,
          totalItems: 0
        }
      });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Optimized search pipeline
    const pipeline = [
      {
        $match: {
          role: { $ne: 'admin' },
          $or: [
            { firstName: { $regex: searchTerm.trim(), $options: 'i' } },
            { lastName: { $regex: searchTerm.trim(), $options: 'i' } },
            { email: { $regex: searchTerm.trim(), $options: 'i' } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) + 1 },
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

    const users = await User.aggregate(pipeline);
    
    const hasMore = users.length > parseInt(limit);
    if (hasMore) {
      users.pop();
    }
    
    res.json({
      users: users,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        hasMore: hasMore,
        nextPage: hasMore ? parseInt(page) + 1 : null
      },
      searchTerm: searchTerm.trim()
    });
    
  } catch (error) {
    console.error('Error in lazy search:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
};

// Get user statistics (for dashboard)
const getUserStats = async (req, res) => {
  try {
    // Get basic stats without loading all users (exclude admin)
    const stats = await User.aggregate([
      {
        $match: { role: { $ne: 'admin' } }
      },
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
    ]);
    
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const activeUsers = await User.countDocuments({ role: { $ne: 'admin' }, isActive: true });
    
    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      roleStats: stats,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ message: 'Error getting user statistics' });
  }
};

module.exports = {
  lazyPaginationMiddleware,
  getUsersWithLazyLoad,
  loadMoreUsers,
  searchUsersLazy,
  getUserStats
};

