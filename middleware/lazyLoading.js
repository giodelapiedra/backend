const express = require('express');

// Skip MongoDB imports in production
let mongoose, Case, Incident;
if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
  mongoose = require('mongoose');
  Case = require('../models/Case');
  Incident = require('../models/Incident');
} else {
  console.log('Skipping MongoDB imports in lazyLoading middleware - using Supabase only');
  Case = {};
  Incident = {};
}
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Generic lazy loading middleware for any collection
const createLazyPaginationMiddleware = (defaultLimit = 10, maxLimit = 50) => {
  return (req, res, next) => {
    req.pagination = {
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || defaultLimit, maxLimit),
      skip: 0,
      hasMore: false,
      totalPages: 0,
      totalItems: 0
    };
    
    req.pagination.skip = (req.pagination.page - 1) * req.pagination.limit;
    next();
  };
};

// Cases lazy loading
const getCasesWithLazyLoad = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    
    // Build filter based on user role
    const filter = {};
    
    if (req.user.role === 'worker') {
      filter.worker = req.user._id;
    } else if (req.user.role === 'clinician') {
      filter.clinician = req.user._id;
    } else if (req.user.role === 'case_manager') {
      filter.caseManager = req.user._id;
    }
    
    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Add priority filter if provided
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit + 1 },
      {
        $lookup: {
          from: 'users',
          localField: 'worker',
          foreignField: '_id',
          as: 'workerInfo',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1, role: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'clinician',
          foreignField: '_id',
          as: 'clinicianInfo',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1, specialty: 1 } }
          ]
        }
      },
      {
        $addFields: {
          worker: { $arrayElemAt: ['$workerInfo', 0] },
          clinician: { $arrayElemAt: ['$clinicianInfo', 0] }
        }
      },
      {
        $project: {
          workerInfo: 0,
          clinicianInfo: 0
        }
      }
    ];

    const cases = await Case.aggregate(pipeline);
    
    const hasMore = cases.length > limit;
    if (hasMore) {
      cases.pop();
    }
    
    // Get total count only for first page
    let totalItems = 0;
    if (page === 1 || req.query.includeTotal === 'true') {
      totalItems = await Case.countDocuments(filter);
    }

    res.json({
      cases: cases,
      pagination: {
        current: page,
        limit: limit,
        hasMore: hasMore,
        totalPages: totalItems > 0 ? Math.ceil(totalItems / limit) : null,
        totalItems: totalItems,
        nextPage: hasMore ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    });
    
  } catch (error) {
    console.error('Error in lazy loading cases:', error);
    res.status(500).json({ message: 'Error loading cases' });
  }
};

// Incidents lazy loading
const getIncidentsWithLazyLoad = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    
    // Build filter based on user role
    const filter = {};
    
    if (req.user.role === 'worker') {
      filter.reportedBy = req.user._id;
    } else if (req.user.role === 'site_supervisor') {
      // Site supervisors can see incidents for their workers
      filter['worker.employer'] = req.user.employer;
    }
    
    // Add severity filter if provided
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }
    
    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const pipeline = [
      { $match: filter },
      { $sort: { incidentDate: -1 } },
      { $skip: skip },
      { $limit: limit + 1 },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedBy',
          foreignField: '_id',
          as: 'reporterInfo',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1, role: 1 } }
          ]
        }
      },
      {
        $addFields: {
          reporter: { $arrayElemAt: ['$reporterInfo', 0] }
        }
      },
      {
        $project: {
          reporterInfo: 0
        }
      }
    ];

    const incidents = await Incident.aggregate(pipeline);
    
    const hasMore = incidents.length > limit;
    if (hasMore) {
      incidents.pop();
    }
    
    // Get total count only for first page
    let totalItems = 0;
    if (page === 1 || req.query.includeTotal === 'true') {
      totalItems = await Incident.countDocuments(filter);
    }

    res.json({
      incidents: incidents,
      pagination: {
        current: page,
        limit: limit,
        hasMore: hasMore,
        totalPages: totalItems > 0 ? Math.ceil(totalItems / limit) : null,
        totalItems: totalItems,
        nextPage: hasMore ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    });
    
  } catch (error) {
    console.error('Error in lazy loading incidents:', error);
    res.status(500).json({ message: 'Error loading incidents' });
  }
};

// Load more cases
const loadMoreCases = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    
    const filter = {};
    
    if (req.user.role === 'worker') {
      filter.worker = req.user._id;
    } else if (req.user.role === 'clinician') {
      filter.clinician = req.user._id;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          title: 1,
          description: 1,
          status: 1,
          priority: 1,
          createdAt: 1,
          worker: 1,
          clinician: 1
        }
      }
    ];

    const cases = await Case.aggregate(pipeline);
    
    res.json({
      cases: cases,
      pagination: {
        current: page,
        limit: limit,
        hasMore: cases.length === limit,
        nextPage: cases.length === limit ? page + 1 : null
      }
    });
    
  } catch (error) {
    console.error('Error loading more cases:', error);
    res.status(500).json({ message: 'Error loading more cases' });
  }
};

// Load more incidents
const loadMoreIncidents = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    
    const filter = {};
    
    if (req.user.role === 'worker') {
      filter.reportedBy = req.user._id;
    }
    
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    const pipeline = [
      { $match: filter },
      { $sort: { incidentDate: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          title: 1,
          description: 1,
          severity: 1,
          status: 1,
          incidentDate: 1,
          reportedBy: 1
        }
      }
    ];

    const incidents = await Incident.aggregate(pipeline);
    
    res.json({
      incidents: incidents,
      pagination: {
        current: page,
        limit: limit,
        hasMore: incidents.length === limit,
        nextPage: incidents.length === limit ? page + 1 : null
      }
    });
    
  } catch (error) {
    console.error('Error loading more incidents:', error);
    res.status(500).json({ message: 'Error loading more incidents' });
  }
};

// Dashboard stats with lazy loading
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let stats = {};
    
    // Get stats based on user role
    if (userRole === 'admin') {
      const [totalCases, activeCases, totalIncidents, recentIncidents] = await Promise.all([
        Case.countDocuments({}),
        Case.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        Incident.countDocuments({}),
        Incident.countDocuments({ 
          incidentDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        })
      ]);
      
      stats = {
        totalCases,
        activeCases,
        totalIncidents,
        recentIncidents
      };
    } else if (userRole === 'worker') {
      const [myCases, myIncidents] = await Promise.all([
        Case.countDocuments({ worker: userId }),
        Incident.countDocuments({ reportedBy: userId })
      ]);
      
      stats = {
        myCases,
        myIncidents
      };
    } else if (userRole === 'clinician') {
      const [assignedCases, completedCases] = await Promise.all([
        Case.countDocuments({ clinician: userId }),
        Case.countDocuments({ clinician: userId, status: 'completed' })
      ]);
      
      stats = {
        assignedCases,
        completedCases
      };
    }
    
    res.json({
      stats,
      lastUpdated: new Date().toISOString(),
      userRole
    });
    
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error getting dashboard statistics' });
  }
};

module.exports = {
  createLazyPaginationMiddleware,
  getCasesWithLazyLoad,
  getIncidentsWithLazyLoad,
  loadMoreCases,
  loadMoreIncidents,
  getDashboardStats
};

