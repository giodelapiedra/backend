# Updated KPI System - Excluding Unselected Workers

## Overview
This document details the updated KPI (Key Performance Indicator) system that excludes unselected workers from team performance calculations. The system ensures fair and accurate performance measurement by only counting assignments given to selected team members.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Problem Statement](#problem-statement)
3. [Solution Implementation](#solution-implementation)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Calculation Logic](#calculation-logic)
8. [Examples](#examples)
9. [Benefits](#benefits)
10. [Implementation Details](#implementation-details)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

## System Architecture

### Core Components
- **Backend Controller**: `goalKpiController.js` - Handles KPI calculations
- **Database Tables**: 
  - `work_readiness_assignments` - Assignment data
  - `unselected_workers` - Unselected worker tracking
  - `users` - Team member information
- **Frontend Components**: KPI dashboard displays
- **API Endpoints**: RESTful endpoints for KPI data

### Data Flow
```
Team Leader → Selects Workers → Creates Assignments → KPI Calculation
     ↓              ↓                    ↓                    ↓
Unselected     Selected Workers    Assignment Data    Performance Metrics
Workers        (Included in KPI)  (Counted)         (Fair Calculation)
(Excluded)
```

## Problem Statement

### Original Issue
The previous KPI system counted all team members regardless of whether they were selected for assignments, leading to:

1. **Unfair Penalties**: Team leaders were penalized for workers who were sick, on leave, or not rostered
2. **Inaccurate Metrics**: KPI scores didn't reflect actual team performance
3. **Misleading Data**: Completion rates were calculated based on all team members, not just those given assignments

### User Requirements
- Count only assignments given to selected team members
- Exclude unselected workers from KPI calculations
- Provide transparent separation between selected and unselected workers
- Maintain fair performance measurement

## Solution Implementation

### 1. Backend Logic Updates

#### Team Member Filtering
```javascript
// Get unselected workers for this month to exclude them from KPI calculation
const { data: unselectedWorkers } = await supabase
  .from('unselected_workers')
  .select('worker_id, assignment_date')
  .eq('team_leader_id', teamLeaderId)
  .gte('assignment_date', monthStart.toISOString().split('T')[0])
  .lte('assignment_date', monthEnd.toISOString().split('T')[0]);

// Create a set of unselected worker IDs for quick lookup
const unselectedWorkerIds = new Set(unselectedWorkers?.map(uw => uw.worker_id) || []);

// Filter out unselected workers from team member IDs
const selectedTeamMemberIds = teamMemberIds.filter(id => !unselectedWorkerIds.has(id));
```

#### Assignment Query
```javascript
// Get assignments only for selected team members (excluding unselected workers)
const { data: assignments, error: assignmentsError } = await supabase
  .from('work_readiness_assignments')
  .select('*')
  .in('worker_id', selectedTeamMemberIds) // ← Only selected workers
  .gte('assigned_date', monthStart.toISOString().split('T')[0])
  .lte('assigned_date', monthEnd.toISOString().split('T')[0])
  .order('assigned_date', { ascending: false });
```

#### Individual KPI Handling
```javascript
const individualKPIs = await Promise.all(teamMembers.map(async (member) => {
  // Only calculate KPI for selected team members (exclude unselected workers)
  if (unselectedWorkerIds.has(member.id)) {
    return {
      workerId: member.id,
      workerName: `${member.first_name} ${member.last_name}`,
      kpi: {
        rating: 'Unselected',
        letterGrade: 'N/A',
        score: 0,
        color: '#6b7280',
        description: 'Worker not selected for assignments'
      },
      metrics: {
        totalAssignments: 0,
        completedAssignments: 0,
        onTimeSubmissions: 0,
        pendingAssignments: 0,
        overdueAssignments: 0,
        completionRate: 0,
        onTimeRate: 0,
        qualityScore: 0
      }
    };
  }
  // ... rest of KPI calculation for selected workers
}));
```

### 2. Enhanced Logging
```javascript
logger.logBusiness('Team Member Filtering', {
  totalTeamMembers: teamMemberIds.length,
  unselectedWorkers: unselectedWorkerIds.size,
  selectedTeamMembers: selectedTeamMemberIds.length,
  unselectedWorkerIds: Array.from(unselectedWorkerIds)
});

logger.logBusiness('Team Metrics (Excluding Unselected Workers)', {
  totalAssignments,
  completedAssignments,
  onTimeSubmissions,
  pendingAssignments,
  overdueAssignments,
  totalTeamMembers: teamMembers?.length || 0,
  selectedTeamMembers: selectedTeamMemberIds.length,
  unselectedWorkers: unselectedWorkerIds.size,
  unselectedWorkerIds: Array.from(unselectedWorkerIds)
});
```

### 3. API Response Updates
```javascript
res.json({
  success: true,
  teamKPI: teamKPI,
  teamMetrics: {
    totalAssignments,
    completedAssignments,
    onTimeSubmissions,
    pendingAssignments,
    overdueAssignments,
    teamCompletionRate: Math.round(teamCompletionRate),
    teamOnTimeRate: Math.round(teamOnTimeRate),
    avgQualityScore: Math.round(avgQualityScore),
    totalMembers: teamMembers.length,
    selectedMembers: selectedTeamMemberIds.length,        // ← New
    unselectedMembers: unselectedWorkerIds.size,          // ← New
    unselectedWorkerIds: Array.from(unselectedWorkerIds) // ← New
  },
  individualKPIs,
  period: {
    start: monthStart.toISOString().split('T')[0],
    end: monthEnd.toISOString().split('T')[0],
    month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
  }
});
```

## Database Schema

### Unselected Workers Table
```sql
CREATE TABLE IF NOT EXISTS unselected_workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('sick', 'on_leave_rdo', 'transferred', 'injured_medical', 'not_rostered')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Work Readiness Assignments Table
```sql
CREATE TABLE IF NOT EXISTS work_readiness_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    due_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### 1. Team Leader Assignment KPI
**Endpoint**: `GET /api/goal-kpi/team-leader/assignment-summary`

**Query Parameters**:
- `teamLeaderId` (required): Team leader ID

**Response**:
```json
{
  "success": true,
  "teamKPI": {
    "rating": "Needs Improvement",
    "letterGrade": "F",
    "score": 11.4,
    "color": "#ef4444",
    "description": "Poor performance. Immediate attention required.",
    "breakdown": {
      "completionScore": 4.5,
      "onTimeScore": 1.0,
      "qualityScore": 7.0,
      "pendingBonus": 0.2,
      "overduePenalty": 1.2
    }
  },
  "teamMetrics": {
    "totalAssignments": 125,
    "completedAssignments": 8,
    "onTimeSubmissions": 6,
    "pendingAssignments": 5,
    "overdueAssignments": 15,
    "teamCompletionRate": 6,
    "teamOnTimeRate": 5,
    "avgQualityScore": 70,
    "totalMembers": 4,
    "selectedMembers": 3,
    "unselectedMembers": 1,
    "unselectedWorkerIds": ["worker-uuid-1"]
  },
  "individualKPIs": [
    {
      "workerId": "worker-uuid-1",
      "workerName": "John Doe",
      "kpi": {
        "rating": "Unselected",
        "letterGrade": "N/A",
        "score": 0,
        "color": "#6b7280",
        "description": "Worker not selected for assignments"
      },
      "metrics": {
        "totalAssignments": 0,
        "completedAssignments": 0,
        "onTimeSubmissions": 0,
        "pendingAssignments": 0,
        "overdueAssignments": 0,
        "completionRate": 0,
        "onTimeRate": 0,
        "qualityScore": 0
      }
    }
  ],
  "period": {
    "start": "2025-10-01",
    "end": "2025-10-31",
    "month": "October 2025"
  }
}
```

### 2. Worker Individual KPI
**Endpoint**: `GET /api/goal-kpi/worker/assignment-kpi`

**Query Parameters**:
- `workerId` (required): Worker ID

**Response**:
```json
{
  "success": true,
  "workerKPI": {
    "rating": "Good",
    "letterGrade": "B",
    "score": 78.5,
    "color": "#3b82f6",
    "description": "Good performance! Keep up the consistency."
  },
  "workerMetrics": {
    "totalAssignments": 20,
    "completedAssignments": 16,
    "onTimeSubmissions": 14,
    "pendingAssignments": 2,
    "overdueAssignments": 2,
    "completionRate": 80,
    "onTimeRate": 70,
    "qualityScore": 75
  },
  "period": {
    "start": "2025-10-01",
    "end": "2025-10-31",
    "month": "October 2025"
  }
}
```

## Frontend Integration

### 1. KPI Dashboard Component
```typescript
interface TeamKPIData {
  teamKPI: {
    rating: string;
    letterGrade: string;
    score: number;
    color: string;
    description: string;
  };
  teamMetrics: {
    totalAssignments: number;
    completedAssignments: number;
    onTimeSubmissions: number;
    pendingAssignments: number;
    overdueAssignments: number;
    teamCompletionRate: number;
    teamOnTimeRate: number;
    avgQualityScore: number;
    totalMembers: number;
    selectedMembers: number;        // ← New
    unselectedMembers: number;      // ← New
    unselectedWorkerIds: string[];  // ← New
  };
  individualKPIs: Array<{
    workerId: string;
    workerName: string;
    kpi: {
      rating: string;
      letterGrade: string;
      score: number;
      color: string;
      description: string;
    };
    metrics: {
      totalAssignments: number;
      completedAssignments: number;
      onTimeSubmissions: number;
      pendingAssignments: number;
      overdueAssignments: number;
      completionRate: number;
      onTimeRate: number;
      qualityScore: number;
    };
  }>;
  period: {
    start: string;
    end: string;
    month: string;
  };
}
```

### 2. Display Logic
```typescript
const TeamKPIDashboard: React.FC = () => {
  const [kpiData, setKpiData] = useState<TeamKPIData | null>(null);
  
  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    try {
      const response = await api.get('/goal-kpi/team-leader/assignment-summary', {
        params: { teamLeaderId: user.id }
      });
      
      if (response.data.success) {
        setKpiData(response.data);
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    }
  };

  return (
    <Box>
      {/* Team KPI Display */}
      <Card>
        <CardContent>
          <Typography variant="h6">Team Performance</Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              label={kpiData?.teamKPI.letterGrade} 
              color="primary" 
              style={{ backgroundColor: kpiData?.teamKPI.color }}
            />
            <Typography variant="h4">{kpiData?.teamKPI.score.toFixed(1)}</Typography>
            <Typography variant="body1">{kpiData?.teamKPI.description}</Typography>
          </Box>
          
          {/* Team Metrics */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2">Total Assignments</Typography>
              <Typography variant="h6">{kpiData?.teamMetrics.totalAssignments}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2">Completed</Typography>
              <Typography variant="h6">{kpiData?.teamMetrics.completedAssignments}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2">Selected Members</Typography>
              <Typography variant="h6">{kpiData?.teamMetrics.selectedMembers}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2">Unselected Members</Typography>
              <Typography variant="h6">{kpiData?.teamMetrics.unselectedMembers}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Individual KPIs */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6">Individual Performance</Typography>
          {kpiData?.individualKPIs.map((worker) => (
            <Box key={worker.workerId} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1">{worker.workerName}</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip 
                  label={worker.kpi.letterGrade} 
                  color="primary" 
                  style={{ backgroundColor: worker.kpi.color }}
                />
                <Typography variant="body1">{worker.kpi.description}</Typography>
              </Box>
              {worker.kpi.letterGrade === 'N/A' && (
                <Typography variant="body2" color="text.secondary">
                  Worker not selected for assignments
                </Typography>
              )}
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};
```

## Calculation Logic

### 1. Team KPI Calculation
```javascript
const calculateTeamKPI = (assignments, teamMembers, unselectedWorkers) => {
  // Filter out unselected workers
  const unselectedWorkerIds = new Set(unselectedWorkers.map(uw => uw.worker_id));
  const selectedTeamMemberIds = teamMembers
    .map(member => member.id)
    .filter(id => !unselectedWorkerIds.has(id));

  // Get assignments only for selected workers
  const selectedAssignments = assignments.filter(a => 
    selectedTeamMemberIds.includes(a.worker_id)
  );

  // Calculate metrics
  const totalAssignments = selectedAssignments.length;
  const completedAssignments = selectedAssignments.filter(a => a.status === 'completed').length;
  const onTimeSubmissions = selectedAssignments.filter(a => 
    a.status === 'completed' && 
    a.completed_at && 
    new Date(a.completed_at) <= new Date(a.due_time)
  ).length;
  const pendingAssignments = selectedAssignments.filter(a => a.status === 'pending').length;
  const overdueAssignments = selectedAssignments.filter(a => a.status === 'overdue').length;

  // Calculate rates
  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
  const onTimeRate = totalAssignments > 0 ? (onTimeSubmissions / totalAssignments) * 100 : 0;

  // Calculate bonuses and penalties
  const pendingBonus = Math.min(5, (pendingAssignments / totalAssignments) * 5);
  const overduePenalty = Math.min(10, (overdueAssignments / totalAssignments) * 10);

  // Calculate weighted score
  const weightedScore = (completionRate * 0.7) + (onTimeRate * 0.2) + (70 * 0.1) + pendingBonus - overduePenalty;

  // Convert to letter grade
  let letterGrade = '';
  if (weightedScore >= 95) letterGrade = 'A+';
  else if (weightedScore >= 90) letterGrade = 'A';
  else if (weightedScore >= 85) letterGrade = 'A-';
  else if (weightedScore >= 80) letterGrade = 'B+';
  else if (weightedScore >= 75) letterGrade = 'B';
  else if (weightedScore >= 70) letterGrade = 'B-';
  else if (weightedScore >= 65) letterGrade = 'C+';
  else if (weightedScore >= 60) letterGrade = 'C';
  else if (weightedScore >= 55) letterGrade = 'C-';
  else if (weightedScore >= 50) letterGrade = 'D';
  else letterGrade = 'F';

  return {
    letterGrade,
    score: weightedScore,
    metrics: {
      totalAssignments,
      completedAssignments,
      onTimeSubmissions,
      pendingAssignments,
      overdueAssignments,
      completionRate,
      onTimeRate,
      selectedMembers: selectedTeamMemberIds.length,
      unselectedMembers: unselectedWorkerIds.size
    }
  };
};
```

### 2. Individual KPI Calculation
```javascript
const calculateIndividualKPI = (workerId, assignments, unselectedWorkers) => {
  // Check if worker is unselected
  const isUnselected = unselectedWorkers.some(uw => uw.worker_id === workerId);
  
  if (isUnselected) {
    return {
      rating: 'Unselected',
      letterGrade: 'N/A',
      score: 0,
      color: '#6b7280',
      description: 'Worker not selected for assignments',
      metrics: {
        totalAssignments: 0,
        completedAssignments: 0,
        onTimeSubmissions: 0,
        pendingAssignments: 0,
        overdueAssignments: 0,
        completionRate: 0,
        onTimeRate: 0,
        qualityScore: 0
      }
    };
  }

  // Calculate KPI for selected worker
  const workerAssignments = assignments.filter(a => a.worker_id === workerId);
  const totalAssignments = workerAssignments.length;
  const completedAssignments = workerAssignments.filter(a => a.status === 'completed').length;
  const onTimeSubmissions = workerAssignments.filter(a => 
    a.status === 'completed' && 
    a.completed_at && 
    new Date(a.completed_at) <= new Date(a.due_time)
  ).length;
  const pendingAssignments = workerAssignments.filter(a => a.status === 'pending').length;
  const overdueAssignments = workerAssignments.filter(a => a.status === 'overdue').length;

  // Calculate rates
  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
  const onTimeRate = totalAssignments > 0 ? (onTimeSubmissions / totalAssignments) * 100 : 0;

  // Calculate bonuses and penalties
  const pendingBonus = Math.min(5, (pendingAssignments / totalAssignments) * 5);
  const overduePenalty = Math.min(10, (overdueAssignments / totalAssignments) * 10);

  // Calculate weighted score
  const weightedScore = (completionRate * 0.7) + (onTimeRate * 0.2) + (70 * 0.1) + pendingBonus - overduePenalty;

  // Convert to letter grade
  let letterGrade = '';
  if (weightedScore >= 95) letterGrade = 'A+';
  else if (weightedScore >= 90) letterGrade = 'A';
  else if (weightedScore >= 85) letterGrade = 'A-';
  else if (weightedScore >= 80) letterGrade = 'B+';
  else if (weightedScore >= 75) letterGrade = 'B';
  else if (weightedScore >= 70) letterGrade = 'B-';
  else if (weightedScore >= 65) letterGrade = 'C+';
  else if (weightedScore >= 60) letterGrade = 'C';
  else if (weightedScore >= 55) letterGrade = 'C-';
  else if (weightedScore >= 50) letterGrade = 'D';
  else letterGrade = 'F';

  return {
    letterGrade,
    score: weightedScore,
    metrics: {
      totalAssignments,
      completedAssignments,
      onTimeSubmissions,
      pendingAssignments,
      overdueAssignments,
      completionRate,
      onTimeRate,
      qualityScore: 70
    }
  };
};
```

## Examples

### Example 1: SAM WARD Team
**Scenario**: Team with 4 members, 1 unselected worker

**Team Composition**:
- Total Team Members: 4
- Unselected Workers: 1 (sick)
- Selected Workers: 3

**Daily Assignments**:
- 2025-10-01: 20 assignments
- 2025-10-02: 30 assignments
- 2025-10-03: 25 assignments
- 2025-10-04: 15 assignments
- 2025-10-05: 35 assignments

**Total Assignments**: 125 (only for selected workers)

**KPI Calculation**:
- Completed: 8
- On-Time: 6
- Overdue: 15
- Pending: 5
- Completion Rate: 6.4%
- On-Time Rate: 4.8%
- Pending Bonus: 0.2%
- Overdue Penalty: 1.2%
- Weighted Score: 11.4
- Letter Grade: F

**Individual KPIs**:
- Worker A (Selected): F grade, 3.5 score
- Worker B (Selected): F grade, 3.5 score
- Worker C (Selected): F grade, 3.5 score
- Worker D (Unselected): N/A grade, 0 score

### Example 2: High Performance Team
**Scenario**: Team with 5 members, 0 unselected workers

**Team Composition**:
- Total Team Members: 5
- Unselected Workers: 0
- Selected Workers: 5

**Daily Assignments**:
- 2025-10-01: 25 assignments
- 2025-10-02: 30 assignments
- 2025-10-03: 28 assignments
- 2025-10-04: 32 assignments
- 2025-10-05: 35 assignments

**Total Assignments**: 150 (all workers selected)

**KPI Calculation**:
- Completed: 135
- On-Time: 120
- Overdue: 5
- Pending: 10
- Completion Rate: 90%
- On-Time Rate: 80%
- Pending Bonus: 0.3%
- Overdue Penalty: 0.3%
- Weighted Score: 90.0
- Letter Grade: A

**Individual KPIs**:
- Worker A: A grade, 92.0 score
- Worker B: A grade, 88.5 score
- Worker C: A- grade, 87.0 score
- Worker D: A grade, 91.5 score
- Worker E: A grade, 89.0 score

## Benefits

### 1. Fair Performance Measurement
- **Accurate Assessment**: Only counts assignments given to selected workers
- **No Unfair Penalties**: Team leaders aren't penalized for workers who are sick, on leave, or not rostered
- **Realistic Expectations**: KPI reflects actual team performance capabilities

### 2. Transparent Logic
- **Clear Separation**: Distinct handling of selected vs unselected workers
- **Detailed Logging**: Comprehensive logs show filtering process
- **Audit Trail**: Complete record of which workers were included/excluded

### 3. Improved User Experience
- **Intuitive Interface**: Clear indication of selected vs unselected workers
- **Accurate Metrics**: Users see realistic performance data
- **Better Decision Making**: Team leaders can make informed decisions based on accurate data

### 4. System Reliability
- **Consistent Calculations**: Same logic applied across all KPI calculations
- **Data Integrity**: Proper filtering ensures data accuracy
- **Scalable Architecture**: System can handle teams of any size

## Implementation Details

### 1. Database Queries
```sql
-- Get unselected workers for current month
SELECT worker_id, assignment_date 
FROM unselected_workers 
WHERE team_leader_id = ? 
  AND assignment_date >= ? 
  AND assignment_date <= ?;

-- Get assignments for selected workers only
SELECT * 
FROM work_readiness_assignments 
WHERE worker_id IN (selected_worker_ids) 
  AND assigned_date >= ? 
  AND assigned_date <= ?;
```

### 2. Performance Optimization
- **Indexed Queries**: Proper indexes on `worker_id`, `assignment_date`, `team_leader_id`
- **Efficient Filtering**: Set-based lookups for unselected workers
- **Cached Results**: In-memory caching for frequently accessed data

### 3. Error Handling
```javascript
try {
  // KPI calculation logic
  const result = await calculateKPI(assignments, teamMembers, unselectedWorkers);
  return result;
} catch (error) {
  logger.error('KPI calculation failed', { error: error.message });
  throw new Error('Failed to calculate KPI');
}
```

### 4. Validation
```javascript
// Validate team leader ID
if (!teamLeaderId) {
  return res.status(400).json({
    success: false,
    message: 'Team Leader ID is required'
  });
}

// Validate date range
if (monthStart > monthEnd) {
  return res.status(400).json({
    success: false,
    message: 'Invalid date range'
  });
}
```

## Testing

### 1. Unit Tests
```javascript
describe('KPI Calculation with Unselected Workers', () => {
  test('should exclude unselected workers from team KPI', async () => {
    const teamMembers = [
      { id: 'worker1', name: 'Worker 1' },
      { id: 'worker2', name: 'Worker 2' },
      { id: 'worker3', name: 'Worker 3' }
    ];
    
    const unselectedWorkers = [
      { worker_id: 'worker2', assignment_date: '2025-10-01' }
    ];
    
    const assignments = [
      { worker_id: 'worker1', status: 'completed' },
      { worker_id: 'worker2', status: 'completed' },
      { worker_id: 'worker3', status: 'pending' }
    ];
    
    const result = calculateTeamKPI(assignments, teamMembers, unselectedWorkers);
    
    expect(result.metrics.selectedMembers).toBe(2);
    expect(result.metrics.unselectedMembers).toBe(1);
    expect(result.metrics.totalAssignments).toBe(2); // Only worker1 and worker3
  });
});
```

### 2. Integration Tests
```javascript
describe('API Endpoints', () => {
  test('should return KPI data excluding unselected workers', async () => {
    const response = await request(app)
      .get('/api/goal-kpi/team-leader/assignment-summary')
      .query({ teamLeaderId: 'team-leader-1' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.teamMetrics.selectedMembers).toBeDefined();
    expect(response.body.teamMetrics.unselectedMembers).toBeDefined();
  });
});
```

### 3. Manual Testing Scenarios
1. **All Workers Selected**: Verify KPI calculation includes all team members
2. **Some Workers Unselected**: Verify unselected workers are excluded from KPI
3. **All Workers Unselected**: Verify system handles edge case gracefully
4. **Mixed Scenarios**: Test various combinations of selected/unselected workers

## Troubleshooting

### Common Issues

#### 1. KPI Score Too Low
**Problem**: KPI score appears lower than expected
**Cause**: Unselected workers might be included in calculation
**Solution**: Verify unselected workers are properly filtered out

```javascript
// Check if unselected workers are being filtered
logger.logBusiness('Team Member Filtering', {
  totalTeamMembers: teamMemberIds.length,
  unselectedWorkers: unselectedWorkerIds.size,
  selectedTeamMembers: selectedTeamMemberIds.length
});
```

#### 2. Individual KPI Shows "N/A"
**Problem**: Individual KPI shows "N/A" for all workers
**Cause**: All workers might be marked as unselected
**Solution**: Check unselected_workers table for current month

```sql
SELECT * FROM unselected_workers 
WHERE team_leader_id = 'team-leader-id' 
  AND assignment_date >= '2025-10-01' 
  AND assignment_date <= '2025-10-31';
```

#### 3. Performance Issues
**Problem**: KPI calculation is slow
**Cause**: Missing database indexes
**Solution**: Add proper indexes

```sql
CREATE INDEX idx_unselected_workers_team_leader_date 
ON unselected_workers(team_leader_id, assignment_date);

CREATE INDEX idx_assignments_worker_date 
ON work_readiness_assignments(worker_id, assigned_date);
```

### Debugging Steps

1. **Check Logs**: Review application logs for KPI calculation details
2. **Verify Data**: Ensure unselected workers table has correct data
3. **Test Queries**: Run database queries manually to verify results
4. **Check Filters**: Verify date range and team leader ID filters
5. **Validate Logic**: Test KPI calculation logic with sample data

### Monitoring

```javascript
// Add monitoring for KPI calculation performance
const startTime = Date.now();
const result = await calculateKPI(assignments, teamMembers, unselectedWorkers);
const endTime = Date.now();

logger.logBusiness('KPI Calculation Performance', {
  duration: endTime - startTime,
  totalAssignments: result.metrics.totalAssignments,
  selectedMembers: result.metrics.selectedMembers,
  unselectedMembers: result.metrics.unselectedMembers
});
```

## Conclusion

The updated KPI system that excludes unselected workers provides a fair, accurate, and transparent method for measuring team performance. By only counting assignments given to selected team members, the system ensures that team leaders are not unfairly penalized for workers who are sick, on leave, or not rostered.

### Key Achievements
- ✅ **Fair Calculation**: Only selected workers included in KPI
- ✅ **Transparent Logic**: Clear separation of selected vs unselected workers
- ✅ **Accurate Metrics**: Realistic performance measurement
- ✅ **Better UX**: Intuitive interface with clear indicators
- ✅ **System Reliability**: Consistent and scalable architecture

### Future Enhancements
- **Historical Tracking**: Track unselected worker patterns over time
- **Predictive Analytics**: Predict team performance based on selection patterns
- **Advanced Filtering**: More granular filtering options
- **Performance Optimization**: Further optimization of database queries
- **Enhanced Reporting**: More detailed KPI reports and analytics

This documentation provides a comprehensive guide to understanding, implementing, and maintaining the updated KPI system that excludes unselected workers from team performance calculations.

