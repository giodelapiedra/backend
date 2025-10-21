const { 
  generatePerformanceInsights, 
  generateMonitoringInsights, 
  generateMonthlyInsights 
} = require('../utils/insightGenerators');

describe('Insight Generators', () => {
  describe('generatePerformanceInsights', () => {
    test('should generate insights for excellent performers', () => {
      const individualKPIs = [
        {
          workerName: 'John Doe',
          weeklyKPIMetrics: {
            kpi: { rating: 'Excellent' }
          }
        },
        {
          workerName: 'Jane Smith',
          weeklyKPIMetrics: {
            kpi: { rating: 'Good' }
          }
        }
      ];

      const teamKPI = { rating: 'Excellent' };
      const insights = generatePerformanceInsights(individualKPIs, teamKPI);

      expect(insights).toHaveLength(2);
      expect(insights[0].type).toBe('success');
      expect(insights[0].title).toBe('Excellent Performers');
      expect(insights[0].message).toContain('John Doe');
    });

    test('should generate insights for members needing support', () => {
      const individualKPIs = [
        {
          workerName: 'Bob Wilson',
          weeklyKPIMetrics: {
            kpi: { rating: 'Needs Improvement' }
          }
        }
      ];

      const teamKPI = { rating: 'Average' };
      const insights = generatePerformanceInsights(individualKPIs, teamKPI);

      expect(insights).toHaveLength(2);
      expect(insights[0].type).toBe('warning');
      expect(insights[0].title).toBe('Members Needing Support');
      expect(insights[0].message).toContain('Bob Wilson');
    });

    test('should generate team performance insights', () => {
      const individualKPIs = [
        {
          workerName: 'Alice Johnson',
          weeklyKPIMetrics: {
            kpi: { rating: 'Good' }
          }
        }
      ];

      const teamKPI = { rating: 'Excellent' };
      const insights = generatePerformanceInsights(individualKPIs, teamKPI);

      expect(insights).toHaveLength(2);
      expect(insights[1].type).toBe('success');
      expect(insights[1].title).toBe('Outstanding Team Performance');
    });

    test('should generate consistency insights for high performers', () => {
      const individualKPIs = [
        { weeklyKPIMetrics: { kpi: { rating: 'Excellent' } } },
        { weeklyKPIMetrics: { kpi: { rating: 'Good' } } },
        { weeklyKPIMetrics: { kpi: { rating: 'Excellent' } } },
        { weeklyKPIMetrics: { kpi: { rating: 'Good' } } }
      ];

      const teamKPI = { rating: 'Good' };
      const insights = generatePerformanceInsights(individualKPIs, teamKPI);

      expect(insights).toHaveLength(3);
      expect(insights[2].type).toBe('info');
      expect(insights[2].title).toBe('High Consistency');
      expect(insights[2].message).toContain('100%');
    });

    test('should handle empty individual KPIs', () => {
      const individualKPIs = [];
      const teamKPI = { rating: 'Average' };
      const insights = generatePerformanceInsights(individualKPIs, teamKPI);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('warning');
      expect(insights[0].title).toBe('Average Team Performance');
    });
  });

  describe('generateMonitoringInsights', () => {
    test('should generate insights for active cycles', () => {
      const currentCycleStatus = [
        {
          workerId: '1',
          workerName: 'John Doe',
          status: 'Cycle In Progress'
        },
        {
          workerId: '2',
          workerName: 'Jane Smith',
          status: 'Cycle Completed'
        }
      ];

      const completedCyclesHistory = [];
      const teamSummary = { averageCyclesPerMember: 0 };

      const insights = generateMonitoringInsights(currentCycleStatus, completedCyclesHistory, teamSummary);

      expect(insights).toHaveLength(2);
      expect(insights[0].type).toBe('info');
      expect(insights[0].title).toBe('Active Cycles');
      expect(insights[0].message).toContain('1 team members currently have active cycles');
    });

    test('should generate insights for completed cycles', () => {
      const currentCycleStatus = [
        {
          workerId: '1',
          workerName: 'John Doe',
          status: 'Cycle Completed'
        }
      ];

      const completedCyclesHistory = [];
      const teamSummary = { averageCyclesPerMember: 0 };

      const insights = generateMonitoringInsights(currentCycleStatus, completedCyclesHistory, teamSummary);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('success');
      expect(insights[0].title).toBe('Recent Completions');
      expect(insights[0].message).toContain('1 team members have completed their cycles');
    });

    test('should generate insights for inactive members', () => {
      const currentCycleStatus = [
        {
          workerId: '1',
          workerName: 'John Doe',
          status: 'No Cycle Started'
        }
      ];

      const completedCyclesHistory = [];
      const teamSummary = { averageCyclesPerMember: 0 };

      const insights = generateMonitoringInsights(currentCycleStatus, completedCyclesHistory, teamSummary);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('warning');
      expect(insights[0].title).toBe('Inactive Members');
      expect(insights[0].message).toContain('1 team members haven\'t started any cycles');
    });

    test('should generate team performance insights', () => {
      const currentCycleStatus = [];
      const completedCyclesHistory = [];
      const teamSummary = { averageCyclesPerMember: 2.5 };

      const insights = generateMonitoringInsights(currentCycleStatus, completedCyclesHistory, teamSummary);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('info');
      expect(insights[0].title).toBe('Team Performance');
      expect(insights[0].message).toContain('2.5 completed cycles per member');
    });
  });

  describe('generateMonthlyInsights', () => {
    test('should generate insights for top performers', () => {
      const monthlyWorkerKPIs = [
        {
          workerName: 'John Doe',
          monthlyMetrics: {
            monthlyKPI: { rating: 'Excellent' },
            completionRate: 95,
            completedCycles: 4
          }
        }
      ];

      const teamSummary = {
        totalCompletedCycles: 4,
        averageCompletionRate: 95,
        teamKPI: { rating: 'Excellent' }
      };

      const monthlyTrends = [];

      const insights = generateMonthlyInsights(monthlyWorkerKPIs, teamSummary, monthlyTrends);

      expect(insights).toHaveLength(2);
      expect(insights[0].type).toBe('success');
      expect(insights[0].title).toBe('Top Performers');
      expect(insights[0].message).toContain('1 team members achieved Excellent rating');
    });

    test('should generate insights for workers needing improvement', () => {
      const monthlyWorkerKPIs = [
        {
          workerName: 'Bob Wilson',
          monthlyMetrics: {
            monthlyKPI: { rating: 'Needs Improvement' },
            completionRate: 30,
            completedCycles: 1
          }
        }
      ];

      const teamSummary = {
        totalCompletedCycles: 1,
        averageCompletionRate: 30,
        teamKPI: { rating: 'Needs Improvement' }
      };

      const monthlyTrends = [];

      const insights = generateMonthlyInsights(monthlyWorkerKPIs, teamSummary, monthlyTrends);

      expect(insights).toHaveLength(2);
      expect(insights[0].type).toBe('warning');
      expect(insights[0].title).toBe('Needs Improvement');
      expect(insights[0].message).toContain('1 team members need support');
    });

    test('should generate improving trend insights', () => {
      const monthlyWorkerKPIs = [];
      const teamSummary = {
        totalCompletedCycles: 10,
        averageCompletionRate: 80,
        teamKPI: { rating: 'Good' }
      };

      const monthlyTrends = [
        { completionRate: 70, completedCycles: 8 },
        { completionRate: 80, completedCycles: 10 }
      ];

      const insights = generateMonthlyInsights(monthlyWorkerKPIs, teamSummary, monthlyTrends);

      expect(insights).toHaveLength(2);
      expect(insights[0].type).toBe('info');
      expect(insights[0].title).toBe('Improving Trend');
      expect(insights[0].message).toContain('improved by 10%');
    });

    test('should generate declining trend insights', () => {
      const monthlyWorkerKPIs = [];
      const teamSummary = {
        totalCompletedCycles: 8,
        averageCompletionRate: 70,
        teamKPI: { rating: 'Average' }
      };

      const monthlyTrends = [
        { completionRate: 80, completedCycles: 10 },
        { completionRate: 70, completedCycles: 8 }
      ];

      const insights = generateMonthlyInsights(monthlyWorkerKPIs, teamSummary, monthlyTrends);

      expect(insights).toHaveLength(2);
      expect(insights[0].type).toBe('warning');
      expect(insights[0].title).toBe('Declining Trend');
      expect(insights[0].message).toContain('decreased by 10%');
    });

    test('should generate monthly summary insights', () => {
      const monthlyWorkerKPIs = [];
      const teamSummary = {
        totalCompletedCycles: 20,
        averageCompletionRate: 85,
        teamKPI: { rating: 'Good' }
      };

      const monthlyTrends = [];

      const insights = generateMonthlyInsights(monthlyWorkerKPIs, teamSummary, monthlyTrends);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('info');
      expect(insights[0].title).toBe('Monthly Summary');
      expect(insights[0].message).toContain('20 cycles with 85% average completion rate');
    });
  });
});
