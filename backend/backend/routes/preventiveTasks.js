const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Case = require('../models/Case');

// @route   GET /api/preventive-tasks
// @desc    Get preventive tasks for a user
// @access  Private
router.get('/', [
  authMiddleware,
  roleMiddleware('worker', 'site_supervisor', 'employer', 'admin', 'case_manager')
], asyncHandler(async (req, res) => {
  try {
    let tasks = [];
    
    // For workers, get tasks assigned to them
    if (req.user.role === 'worker') {
      // Mock preventive tasks for now - in a real app, these would come from a database
      tasks = [
        {
          _id: '1',
          taskName: 'Safety Equipment Check',
          description: 'Inspect and test all safety equipment before starting work',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: 'pending',
          priority: 'high',
          category: 'safety',
          assignedBy: {
            firstName: 'John',
            lastName: 'Supervisor'
          }
        },
        {
          _id: '2',
          taskName: 'Workplace Safety Training',
          description: 'Complete the monthly safety training module',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          status: 'pending',
          priority: 'medium',
          category: 'training',
          assignedBy: {
            firstName: 'Sarah',
            lastName: 'Manager'
          }
        },
        {
          _id: '3',
          taskName: 'Equipment Maintenance',
          description: 'Schedule maintenance for assigned equipment',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          status: 'completed',
          priority: 'high',
          category: 'maintenance',
          assignedBy: {
            firstName: 'Mike',
            lastName: 'Supervisor'
          },
          completedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          notes: 'Completed successfully'
        }
      ];
    }

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error fetching preventive tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching preventive tasks'
    });
  }
}));

// @route   POST /api/preventive-tasks
// @desc    Create a new preventive task
// @access  Private (site_supervisor, employer, admin, case_manager)
router.post('/', [
  authMiddleware,
  roleMiddleware('site_supervisor', 'employer', 'admin', 'case_manager'),
  body('taskName').notEmpty().withMessage('Task name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('priority').isIn(['low', 'medium', 'high']).withMessage('Valid priority is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('assignedTo').notEmpty().withMessage('Assigned user is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  try {
    const { taskName, description, dueDate, priority, category, assignedTo, notes } = req.body;

    // Verify assigned user exists and is a worker
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser || assignedUser.role !== 'worker') {
      return res.status(400).json({
        success: false,
        message: 'Assigned user must be a worker'
      });
    }

    // Create task object (in a real app, this would be saved to database)
    const task = {
      _id: Date.now().toString(),
      taskName,
      description,
      dueDate: new Date(dueDate),
      status: 'pending',
      priority,
      category,
      assignedBy: {
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      assignedTo: assignedUser._id,
      notes: notes || '',
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error creating preventive task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating preventive task'
    });
  }
}));

// @route   PUT /api/preventive-tasks/:id
// @desc    Update a preventive task
// @access  Private
router.put('/:id', [
  authMiddleware,
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('notes').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  try {
    const { status, notes } = req.body;
    const taskId = req.params.id;

    // In a real app, this would update the task in the database
    // For now, we'll just return a success response
    const updatedTask = {
      _id: taskId,
      status: status || 'pending',
      notes: notes || '',
      updatedAt: new Date()
    };

    res.json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    console.error('Error updating preventive task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preventive task'
    });
  }
}));

module.exports = router;
