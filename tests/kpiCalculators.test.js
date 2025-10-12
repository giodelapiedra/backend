const { 
  calculateKPI, 
  calculateAssignmentKPI, 
  calculateCompletionRateKPI, 
  calculateWeeklyTeamKPI,
  calculateStreaks 
} = require('../utils/kpiCalculators');

describe('KPI Calculators', () => {
  describe('calculateKPI', () => {
    test('should return "Not Started" for 0 consecutive days', () => {
      const result = calculateKPI(0);
      expect(result.rating).toBe('Not Started');
      expect(result.score).toBe(0);
      expect(result.color).toBe('#6b7280');
    });

    test('should return "Getting Started" for 1 consecutive day', () => {
      const result = calculateKPI(1);
      expect(result.rating).toBe('Getting Started');
      expect(result.score).toBe(20);
      expect(result.color).toBe('#f59e0b');
    });

    test('should return "Perfect" for 7+ consecutive days', () => {
      const result = calculateKPI(7);
      expect(result.rating).toBe('Perfect');
      expect(result.score).toBe(100);
      expect(result.color).toBe('#10b981');
    });

    test('should return "Perfect" for 10 consecutive days', () => {
      const result = calculateKPI(10);
      expect(result.rating).toBe('Perfect');
      expect(result.score).toBe(100);
      expect(result.color).toBe('#10b981');
    });
  });

  describe('calculateAssignmentKPI', () => {
    test('should return "No Assignments" for 0 total assignments', () => {
      const result = calculateAssignmentKPI(0, 0);
      expect(result.rating).toBe('No Assignments');
      expect(result.letterGrade).toBe('N/A');
      expect(result.score).toBe(0);
    });

    test('should return "Excellent" for high completion rate', () => {
      const result = calculateAssignmentKPI(90, 100, 85, 90, 5, 0);
      expect(result.rating).toBe('Excellent');
      expect(result.letterGrade).toBe('A');
      expect(result.score).toBeGreaterThan(90);
    });

    test('should return "Needs Improvement" for low completion rate', () => {
      const result = calculateAssignmentKPI(20, 100, 15, 50, 0, 30);
      expect(result.rating).toBe('Needs Improvement');
      expect(result.letterGrade).toBe('F');
      expect(result.score).toBeLessThan(50);
    });

    test('should apply pending bonus correctly', () => {
      const result = calculateAssignmentKPI(50, 100, 40, 70, 20, 0);
      expect(result.breakdown.pendingBonus).toBeGreaterThan(0);
      expect(result.breakdown.pendingBonus).toBeLessThanOrEqual(5);
    });

    test('should apply overdue penalty correctly', () => {
      const result = calculateAssignmentKPI(50, 100, 40, 70, 0, 20);
      expect(result.breakdown.overduePenalty).toBeGreaterThan(0);
      expect(result.breakdown.overduePenalty).toBeLessThanOrEqual(10);
    });

    test('should handle shift-based decay for overdue assignments', () => {
      const overdueAssignmentsWithDates = [
        {
          due_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          status: 'overdue'
        },
        {
          due_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          status: 'overdue'
        }
      ];

      const result = calculateAssignmentKPI(50, 100, 40, 70, 0, 2, overdueAssignmentsWithDates);
      expect(result.breakdown.shiftBasedDecayApplied).toBe(true);
      expect(result.breakdown.overduePenalty).toBeGreaterThan(0);
    });

    test('should apply recovery bonus for recent completions', () => {
      const overdueAssignmentsWithDates = [
        {
          due_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      const result = calculateAssignmentKPI(80, 100, 70, 80, 0, 0, overdueAssignmentsWithDates);
      expect(result.breakdown.recoveryBonus).toBeGreaterThan(0);
    });
  });

  describe('calculateCompletionRateKPI', () => {
    test('should return "Excellent" for 90%+ completion rate', () => {
      const result = calculateCompletionRateKPI(95);
      expect(result.rating).toBe('Excellent');
      expect(result.score).toBe(95);
      expect(result.color).toBe('#10b981');
    });

    test('should return "Good" for 75-89% completion rate', () => {
      const result = calculateCompletionRateKPI(80);
      expect(result.rating).toBe('Good');
      expect(result.score).toBe(80);
      expect(result.color).toBe('#3b82f6');
    });

    test('should return "Average" for 60-74% completion rate', () => {
      const result = calculateCompletionRateKPI(65);
      expect(result.rating).toBe('Average');
      expect(result.score).toBe(65);
      expect(result.color).toBe('#f59e0b');
    });

    test('should return "Needs Improvement" for 40-59% completion rate', () => {
      const result = calculateCompletionRateKPI(50);
      expect(result.rating).toBe('Needs Improvement');
      expect(result.score).toBe(50);
      expect(result.color).toBe('#ef4444');
    });

    test('should return "Poor" for <40% completion rate', () => {
      const result = calculateCompletionRateKPI(30);
      expect(result.rating).toBe('Poor');
      expect(result.score).toBe(30);
      expect(result.color).toBe('#dc2626');
    });
  });

  describe('calculateWeeklyTeamKPI', () => {
    test('should return "Excellent" for 90%+ submission rate', () => {
      const result = calculateWeeklyTeamKPI(95, 19, 20);
      expect(result.rating).toBe('Excellent');
      expect(result.score).toBe(95);
      expect(result.color).toBe('#10b981');
    });

    test('should return "Good" for 75-89% submission rate', () => {
      const result = calculateWeeklyTeamKPI(80, 16, 20);
      expect(result.rating).toBe('Good');
      expect(result.score).toBe(80);
      expect(result.color).toBe('#3b82f6');
    });

    test('should return "Average" for 60-74% submission rate', () => {
      const result = calculateWeeklyTeamKPI(65, 13, 20);
      expect(result.rating).toBe('Average');
      expect(result.score).toBe(65);
      expect(result.color).toBe('#f59e0b');
    });

    test('should return "Needs Improvement" for 40-59% submission rate', () => {
      const result = calculateWeeklyTeamKPI(50, 10, 20);
      expect(result.rating).toBe('Needs Improvement');
      expect(result.score).toBe(50);
      expect(result.color).toBe('#ef4444');
    });

    test('should return "Poor" for <40% submission rate', () => {
      const result = calculateWeeklyTeamKPI(30, 6, 20);
      expect(result.rating).toBe('Poor');
      expect(result.score).toBe(30);
      expect(result.color).toBe('#dc2626');
    });
  });

  describe('calculateStreaks', () => {
    test('should return zero streaks for empty assessments', () => {
      const result = calculateStreaks([]);
      expect(result.current).toBe(0);
      expect(result.longest).toBe(0);
    });

    test('should calculate current streak correctly', () => {
      const assessments = [
        { submitted_at: '2025-01-01T10:00:00Z' },
        { submitted_at: '2025-01-02T10:00:00Z' },
        { submitted_at: '2025-01-03T10:00:00Z' }
      ];
      const result = calculateStreaks(assessments);
      expect(result.current).toBe(3);
      expect(result.longest).toBe(3);
    });

    test('should handle gaps in submissions', () => {
      const assessments = [
        { submitted_at: '2025-01-01T10:00:00Z' },
        { submitted_at: '2025-01-02T10:00:00Z' },
        { submitted_at: '2025-01-04T10:00:00Z' }, // Gap of 1 day
        { submitted_at: '2025-01-05T10:00:00Z' }
      ];
      const result = calculateStreaks(assessments);
      expect(result.current).toBe(2); // Current streak after gap
      expect(result.longest).toBe(2); // Longest streak
    });

    test('should find longest streak correctly', () => {
      const assessments = [
        { submitted_at: '2025-01-01T10:00:00Z' },
        { submitted_at: '2025-01-02T10:00:00Z' },
        { submitted_at: '2025-01-03T10:00:00Z' },
        { submitted_at: '2025-01-05T10:00:00Z' }, // Gap
        { submitted_at: '2025-01-06T10:00:00Z' },
        { submitted_at: '2025-01-07T10:00:00Z' }
      ];
      const result = calculateStreaks(assessments);
      expect(result.current).toBe(3); // Current streak
      expect(result.longest).toBe(3); // Longest streak
    });
  });
});

