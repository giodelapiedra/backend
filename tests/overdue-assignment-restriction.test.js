/**
 * Test for Overdue Assignment Restriction
 * Verifies that workers with overdue assignments cannot be reassigned on the same day
 */

const request = require('supertest');
const express = require('express');

// Mock Supabase client for overdue assignment testing
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: { id: 'test-user', role: 'team_leader' }, error: null }))
      })),
      in: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-user', role: 'team_leader' }, error: null }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null }))
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

// Import the actual controller to test the logic
const workReadinessAssignmentController = require('../controllers/workReadinessAssignmentController');

describe('Overdue Assignment Restriction', () => {
  let app;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock request and response objects
    mockReq = {
      user: { id: 'team-leader-id', role: 'team_leader' },
      body: {
        workerIds: ['worker-1', 'worker-2'],
        assignedDate: '2024-01-15',
        team: 'Test Team',
        notes: 'Test assignment'
      },
      logger: {
        logBusiness: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
      }
    };

    mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(() => mockRes)
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  test('should block assignment when workers have overdue assignments on same date', async () => {
    // Mock Supabase responses for overdue assignment scenario
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'team-leader-id', role: 'team_leader' }, 
            error: null 
          }))
        })),
        in: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'team-leader-id', role: 'team_leader' }, 
              error: null 
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }));

    // Mock the assignments query to return overdue assignments
    mockFrom.mockImplementation((table) => {
      if (table === 'work_readiness_assignments') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                  data: [
                    {
                      id: 'assignment-1',
                      worker_id: 'worker-1',
                      assigned_date: '2024-01-15',
                      status: 'overdue',
                      due_time: '2024-01-15T08:00:00Z'
                    }
                  ],
                  error: null
                }))
              }))
            }))
          }))
        };
      }
      return mockFrom();
    });

    mockSupabase.from = mockFrom;

    // Call the controller function
    await workReadinessAssignmentController.createAssignments(mockReq, mockRes);

    // Verify that the response blocks the assignment
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining('overdue assignments for 2024-01-15'),
      overdueWorkers: ['worker-1'],
      message: expect.stringContaining('cannot receive new assignments on the same date')
    });
  });

  test('should allow assignment when workers have overdue assignments on different date', async () => {
    // Mock Supabase responses for overdue assignment on different date
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'team-leader-id', role: 'team_leader' }, 
            error: null 
          }))
        })),
        in: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'team-leader-id', role: 'team_leader' }, 
              error: null 
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }));

    // Mock the assignments query to return overdue assignments on different date
    mockFrom.mockImplementation((table) => {
      if (table === 'work_readiness_assignments') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                  data: [
                    {
                      id: 'assignment-1',
                      worker_id: 'worker-1',
                      assigned_date: '2024-01-14', // Different date
                      status: 'overdue',
                      due_time: '2024-01-14T08:00:00Z'
                    }
                  ],
                  error: null
                }))
              }))
            }))
          }))
        };
      }
      return mockFrom();
    });

    mockSupabase.from = mockFrom;

    // Call the controller function
    await workReadinessAssignmentController.createAssignments(mockReq, mockRes);

    // Verify that the response allows the assignment (no 400 error)
    expect(mockRes.status).not.toHaveBeenCalledWith(400);
  });

  test('should block assignment when workers have pending assignments that are not due', async () => {
    // Mock Supabase responses for pending assignment scenario
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'team-leader-id', role: 'team_leader' }, 
            error: null 
          }))
        })),
        in: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'team-leader-id', role: 'team_leader' }, 
              error: null 
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }));

    // Mock the assignments query to return pending assignments
    mockFrom.mockImplementation((table) => {
      if (table === 'work_readiness_assignments') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                  data: [
                    {
                      id: 'assignment-1',
                      worker_id: 'worker-1',
                      assigned_date: '2024-01-15',
                      status: 'pending',
                      due_time: '2024-01-15T18:00:00Z' // Future due time
                    }
                  ],
                  error: null
                }))
              }))
            }))
          }))
        };
      }
      return mockFrom();
    });

    mockSupabase.from = mockFrom;

    // Call the controller function
    await workReadinessAssignmentController.createAssignments(mockReq, mockRes);

    // Verify that the response blocks the assignment
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining('pending assignments that are not yet due'),
      pendingNotDueWorkers: ['worker-1'],
      message: expect.stringContaining('cannot receive new assignments')
    });
  });
});
