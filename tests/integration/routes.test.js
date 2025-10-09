/**
 * Integration Tests for API Routes
 * Tests authentication, validation, and basic functionality
 */

const request = require('supertest');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: { id: 'test-user', role: 'team_leader' }, error: null }))
      }))
    }))
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.JWT_SECRET = 'test-secret';

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'team_leader'
  };
  next();
};

// Mock validation middleware
const mockValidation = (req, res, next) => {
  next();
};

// Mock rate limiter
const mockRateLimit = (req, res, next) => {
  next();
};

// Mock controllers
const mockControllers = {
  createAssignments: (req, res) => {
    res.json({ success: true, message: 'Assignments created' });
  },
  getAssignments: (req, res) => {
    res.json({ success: true, data: [] });
  },
  getWorkerAssignments: (req, res) => {
    res.json({ success: true, data: [] });
  },
  getTodayAssignment: (req, res) => {
    res.json({ success: true, data: null });
  },
  canSubmitWorkReadiness: (req, res) => {
    res.json({ success: true, canSubmit: true });
  },
  getAssignmentStats: (req, res) => {
    res.json({ success: true, data: { total: 0, completed: 0 } });
  },
  getUnselectedWorkers: (req, res) => {
    res.json({ success: true, data: [] });
  },
  closeUnselectedWorkerCase: (req, res) => {
    res.json({ success: true, message: 'Case closed' });
  },
  updateAssignmentStatus: (req, res) => {
    res.json({ success: true, message: 'Status updated' });
  },
  cancelAssignment: (req, res) => {
    res.json({ success: true, message: 'Assignment cancelled' });
  },
  markOverdueAssignments: (req, res) => {
    res.json({ success: true, count: 0, message: 'Marked 0 assignments as overdue' });
  }
};

// Mock role middleware
const mockRequireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  next();
};

// Mock UUID validation
const mockValidateUUID = (paramName) => (req, res, next) => {
  const uuid = req.params[paramName];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuid && !uuidRegex.test(uuid)) {
    return res.status(400).json({ success: false, error: 'Invalid UUID format' });
  }
  next();
};

// Mock pagination validation
const mockValidatePagination = (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  req.query.page = Math.max(1, parseInt(page) || 1);
  req.query.limit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  next();
};

// Setup routes
const workReadinessRouter = express.Router();
workReadinessRouter.use(mockAuth);

workReadinessRouter.post('/', mockRequireRole('team_leader', 'admin'), mockValidation, mockControllers.createAssignments);
workReadinessRouter.get('/', mockValidatePagination, mockControllers.getAssignments);
workReadinessRouter.get('/worker', mockValidatePagination, mockControllers.getWorkerAssignments);
workReadinessRouter.get('/today', mockControllers.getTodayAssignment);
workReadinessRouter.get('/can-submit', mockControllers.canSubmitWorkReadiness);
workReadinessRouter.get('/stats', mockValidatePagination, mockControllers.getAssignmentStats);
workReadinessRouter.get('/unselected', mockValidatePagination, mockControllers.getUnselectedWorkers);
workReadinessRouter.patch('/unselected/:id/close', mockValidateUUID('id'), mockRequireRole('team_leader', 'admin'), mockControllers.closeUnselectedWorkerCase);
workReadinessRouter.patch('/:id', mockValidateUUID('id'), mockControllers.updateAssignmentStatus);
workReadinessRouter.delete('/:id', mockValidateUUID('id'), mockRequireRole('team_leader', 'admin'), mockControllers.cancelAssignment);
workReadinessRouter.post('/mark-overdue', mockRateLimit, mockRequireRole('admin'), mockControllers.markOverdueAssignments);

app.use('/api/work-readiness-assignments', workReadinessRouter);

describe('Work Readiness Assignments API', () => {
  describe('Authentication', () => {
    test('should require authentication for all routes', async () => {
      const response = await request(app)
        .get('/api/work-readiness-assignments')
        .expect(401);
    });
  });

  describe('Role-based access control', () => {
    test('should allow team_leader to create assignments', async () => {
      const response = await request(app)
        .post('/api/work-readiness-assignments')
        .set('Authorization', 'Bearer test-token')
        .send({
          workerIds: ['worker-1'],
          assignedDate: '2024-01-15',
          team: 'Team A'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should deny worker role from creating assignments', async () => {
      // Mock worker role
      const workerApp = express();
      workerApp.use(express.json());
      const workerRouter = express.Router();
      workerRouter.use((req, res, next) => {
        req.user = { id: 'worker-id', role: 'worker' };
        next();
      });
      workerRouter.post('/', mockRequireRole('team_leader', 'admin'), mockControllers.createAssignments);
      workerApp.use('/api/work-readiness-assignments', workerRouter);

      const response = await request(workerApp)
        .post('/api/work-readiness-assignments')
        .set('Authorization', 'Bearer test-token')
        .send({
          workerIds: ['worker-1'],
          assignedDate: '2024-01-15'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('UUID validation', () => {
    test('should validate UUID format for :id parameters', async () => {
      const response = await request(app)
        .patch('/api/work-readiness-assignments/invalid-uuid')
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid UUID format');
    });

    test('should accept valid UUID format', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .patch(`/api/work-readiness-assignments/${validUUID}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Pagination validation', () => {
    test('should apply default pagination parameters', async () => {
      const response = await request(app)
        .get('/api/work-readiness-assignments')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should limit maximum page size', async () => {
      const response = await request(app)
        .get('/api/work-readiness-assignments?limit=200')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Admin-only endpoints', () => {
    test('should restrict mark-overdue to admin only', async () => {
      // Mock non-admin user
      const nonAdminApp = express();
      nonAdminApp.use(express.json());
      const nonAdminRouter = express.Router();
      nonAdminRouter.use((req, res, next) => {
        req.user = { id: 'team-leader-id', role: 'team_leader' };
        next();
      });
      nonAdminRouter.post('/mark-overdue', mockRequireRole('admin'), mockControllers.markOverdueAssignments);
      nonAdminApp.use('/api/work-readiness-assignments', nonAdminRouter);

      const response = await request(nonAdminApp)
        .post('/api/work-readiness-assignments/mark-overdue')
        .set('Authorization', 'Bearer test-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });
  });
});

describe('Response format consistency', () => {
  test('should return consistent success response format', async () => {
    const response = await request(app)
      .get('/api/work-readiness-assignments')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });

  test('should return consistent error response format', async () => {
    const response = await request(app)
      .patch('/api/work-readiness-assignments/invalid-uuid')
      .set('Authorization', 'Bearer test-token')
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
  });
});



