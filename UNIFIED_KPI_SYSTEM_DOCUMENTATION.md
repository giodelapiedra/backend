# Unified KPI System Documentation

## Overview
This document provides comprehensive documentation for the unified Work Readiness KPI (Key Performance Indicator) system, including monthly and individual calculations, implementation details, and usage guidelines.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [KPI Calculation Logic](#kpi-calculation-logic)
3. [Monthly vs Individual KPI](#monthly-vs-individual-kpi)
4. [Letter Grade System](#letter-grade-system)
5. [Implementation Details](#implementation-details)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Database Schema](#database-schema)
9. [Security Features](#security-features)
10. [Examples and Use Cases](#examples-and-use-cases)
11. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Unified KPI System Design
The unified KPI system uses a single backend calculation engine with consistent logic for both monthly and individual performance tracking.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Database      │
│   Components    │    │   KPI Engine     │    │   Supabase      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ TeamKPIDashboard│    │ kpiUtils.js      │    │ work_readiness  │
│ MonthlyTracking │────│ calculateKPI()   │────│ _assignments    │
│ WorkerDashboard │    │ Letter Grades    │    │ Table           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Principles
- **Single Source of Truth:** All KPI calculations happen in the backend
- **Consistent Logic:** Same formula for monthly and individual KPIs
- **Secure Calculation:** Server-side only, cannot be tampered by users
- **Letter Grades:** Standard A+ to F grading system
- **Real-time Data:** Direct database queries for current month data

---

## KPI Calculation Logic

### Core Formula
```
Weighted Score = (Completion Rate × 50%) + (On-Time Rate × 25%) + (Late Rate × 15%) + (Quality Score × 10%) + Bonuses - Penalties
```

### Component Breakdown

#### 1. Completion Rate (50% weight)
```
Completion Rate = (Completed Assignments / Total Assignments) × 100%
```

**Example:**
- Total Assignments: 20
- Completed: 1
- Completion Rate: (1 / 20) × 100% = 5.0%
- Weighted Contribution: 5.0% × 50% = 2.5 points

#### 2. On-Time Rate (25% weight)
```
On-Time Rate = (On-Time Submissions / Total Assignments) × 100%
```

**Example:**
- Total Assignments: 20
- On-Time: 1
- On-Time Rate: (1 / 20) × 100% = 5.0%
- Weighted Contribution: 5.0% × 25% = 1.25 points

#### 3. Late Rate (15% weight)
```
Late Rate = (Late Submissions / Total Assignments) × 100%
```

**Example:**
- Total Assignments: 20
- Late: 9
- Late Rate: (9 / 20) × 100% = 45.0%
- Weighted Contribution: 45.0% × 15% = 6.75 points

#### 4. Quality Score (10% weight)
```
Quality Score = Average quality score (0-100)
```

**Example:**
- Quality Score: 70%
- Weighted Contribution: 70% × 10% = 7.0 points

#### 4. Pending Bonus (up to 5%)
```
Pending Bonus = min(5, (Pending Assignments / Total Assignments) × 5)
```

**Example:**
- Total Assignments: 20
- Pending: 2
- Pending Bonus: min(5, (2 / 20) × 5) = 0.5%

#### 5. Overdue Penalty (up to 10%)
```
Overdue Penalty = min(10, (Overdue Assignments / Total Assignments) × 10)
```

**Example:**
- Total Assignments: 20
- Overdue: 17
- Overdue Penalty: min(10, (17 / 20) × 10) = 8.5%

#### 6. Recovery Bonus (up to 3%)
```
Recovery Bonus = Based on recent completion rate (last 7 days)
- >80% recent completion: +3% bonus
- >60% recent completion: +2% bonus
- >40% recent completion: +1% bonus
```

### Shift-Based Overdue Penalty (Advanced)
For more sophisticated penalty calculation:

```
Hours Overdue = (Current Time - Due Time) / (1000 * 60 * 60)
Shifts Overdue = Hours Overdue / 8
Penalty Multiplier = Based on shifts overdue:
- 0-3 shifts: 100% penalty
- 3-10 shifts: 60% penalty
- 10-30 shifts: 30% penalty
- 30+ shifts: 10% penalty
```

---

## Monthly vs Individual KPI

### Monthly KPI
**Purpose:** Team performance measurement  
**Scope:** All team members combined  
**Responsibility:** Team leader  
**Data Source:** Aggregated assignments across all workers

#### Calculation Steps
1. **Filter by Month:** Get all assignments for current month
2. **Aggregate Data:** Sum across all team members
3. **Apply Formula:** Use unified KPI calculation
4. **Generate Grade:** Convert to letter grade

#### Example: SAM WARD Team (October 2025)
```
Total Assignments: 80 (4 workers × 20 each)
Completed: 4 (1 per worker)
On-Time: 4
Overdue: 68 (17 per worker)
Pending: 8

Completion Rate: (4 / 80) × 100% = 5.0%
On-Time Rate: (4 / 80) × 100% = 5.0%
Quality Score: 70%
Pending Bonus: min(5, (8 / 80) × 5) = 0.5%
Overdue Penalty: min(10, (68 / 80) × 10) = 8.5%

Weighted Score = (5.0 × 0.7) + (5.0 × 0.2) + (70 × 0.1) + 0.5 - 8.5
Weighted Score = 3.5 + 1.0 + 7.0 + 0.5 - 8.5 = 3.5
Letter Grade: F (score < 50)
```

### Individual KPI
**Purpose:** Individual performance measurement  
**Scope:** Single worker only  
**Responsibility:** Individual worker  
**Data Source:** Personal assignments only

#### Calculation Steps
1. **Filter by Worker and Month:** Get assignments for specific worker
2. **Calculate Personal Metrics:** Individual performance data
3. **Apply Formula:** Use same unified KPI calculation
4. **Generate Grade:** Convert to same letter grade scale

#### Example: Worker A (October 2025)
```
Total Assignments: 20 (single worker)
Completed: 1
On-Time: 1
Overdue: 17
Pending: 2

Completion Rate: (1 / 20) × 100% = 5.0%
On-Time Rate: (1 / 20) × 100% = 5.0%
Quality Score: 70%
Pending Bonus: min(5, (2 / 20) × 5) = 0.5%
Overdue Penalty: min(10, (17 / 20) × 10) = 8.5%

Weighted Score = (5.0 × 0.7) + (5.0 × 0.2) + (70 × 0.1) + 0.5 - 8.5
Weighted Score = 3.5 + 1.0 + 7.0 + 0.5 - 8.5 = 3.5
Letter Grade: F (score < 50)
```

### Key Differences

| Aspect | Monthly KPI | Individual KPI |
|--------|-------------|---------------|
| **Scope** | All team members | Single worker |
| **Data Volume** | Higher (aggregated) | Lower (personal) |
| **Responsibility** | Team leader | Individual worker |
| **Purpose** | Team management | Personal accountability |
| **Calculation** | Same formula | Same formula |
| **Grading** | Same scale | Same scale |

---

## Letter Grade System

### Grade Scale
| Grade | Score Range | Rating | Color | Description |
|-------|-------------|--------|-------|-------------|
| A+ | 95-100 | Excellent | #10b981 | Outstanding Performance |
| A | 90-94 | Excellent | #10b981 | Excellent Performance |
| A- | 85-89 | Very Good | #10b981 | Very Good Performance |
| B+ | 80-84 | Good | #3b82f6 | Good Performance |
| B | 75-79 | Good | #3b82f6 | Above Average Performance |
| B- | 70-74 | Above Average | #3b82f6 | Average Performance |
| C+ | 65-69 | Average | #eab308 | Below Average Performance |
| C | 60-64 | Average | #eab308 | Needs Improvement |
| C- | 55-59 | Below Average | #f97316 | Poor Performance |
| D | 50-54 | Below Average | #f97316 | Very Poor Performance |
| F | 0-49 | Needs Improvement | #ef4444 | Critical Performance Issues |

### Special Cases
| Case | Rating | Color | Description |
|------|--------|-------|-------------|
| No Assignments | No Assignments | #6b7280 | No work readiness assignments given yet |
| Not Started | Not Started | #6b7280 | KPI rating not yet started |

---

## Implementation Details

### Backend Implementation (`kpiUtils.js`)

#### Function Signature
```javascript
calculateAssignmentKPI(
  completedAssignments,      // Number of completed assignments
  totalAssignments,         // Total number of assignments
  onTimeSubmissions,        // Number of on-time submissions (default: 0)
  qualityScore,            // Average quality score (default: 0)
  pendingAssignments,       // Number of pending assignments (default: 0)
  overdueAssignments,       // Number of overdue assignments (default: 0)
  overdueAssignmentsWithDates // Array of overdue assignments with dates (default: [])
)
```

#### Return Object
```javascript
{
  rating: "Needs Improvement",           // Text rating
  letterGrade: "F",                     // Letter grade
  color: "#ef4444",                     // Color code
  description: "Poor performance...",   // Description
  score: 3,                             // Weighted score (0-100)
  completionRate: 5,                     // Completion rate percentage
  onTimeRate: 5,                        // On-time rate percentage
  qualityScore: 70,                     // Quality score
  pendingBonus: 0,                      // Pending bonus points
  overduePenalty: 9,                    // Overdue penalty points
  recoveryBonus: 0,                     // Recovery bonus points
  completedAssignments: 1,               // Number of completed assignments
  pendingAssignments: 0,                 // Number of pending assignments
  overdueAssignments: 17,                // Number of overdue assignments
  totalAssignments: 20,                  // Total number of assignments
  shiftBasedDecayApplied: false         // Whether shift-based decay was applied
}
```

#### Logging
The system includes comprehensive logging for debugging and monitoring:
```javascript
logger.logBusiness('Assignment KPI Calculation (Improved)', {
  totalAssignments,
  completedAssignments,
  completionRate: Math.round(completionRate * 100) / 100,
  onTimeSubmissions,
  onTimeRate: Math.round(onTimeRate * 100) / 100,
  qualityScore: Math.round(validatedQualityScore * 100) / 100,
  pendingAssignments,
  pendingBonus: Math.round(pendingBonus * 100) / 100,
  overdueAssignments,
  overduePenalty: Math.round(overduePenalty * 100) / 100,
  recoveryBonus: Math.round(recoveryBonus * 100) / 100,
  weightedScore: Math.round(weightedScore * 100) / 100,
  shiftBasedDecayApplied: overdueAssignmentsWithDates && overdueAssignmentsWithDates.length > 0
});
```

---

## API Endpoints

### Monthly KPI Endpoint
**URL:** `/api/goal-kpi/team-leader/assignment-kpi`  
**Method:** GET  
**Access:** Team Leader

#### Query Parameters
- `teamLeaderId` (required): Team leader ID
- `period` (optional): Time period (weekly, monthly, yearly)
- `date` (optional): Specific date for calculation

#### Response Format
```javascript
{
  "success": true,
  "teamKPI": {
    "rating": "Needs Improvement",
    "letterGrade": "F",
    "color": "#ef4444",
    "description": "Poor performance. Immediate attention required.",
    "score": 3,
    "completionRate": 5,
    "onTimeRate": 5,
    "qualityScore": 70,
    "pendingBonus": 0,
    "overduePenalty": 9,
    "recoveryBonus": 0,
    "completedAssignments": 1,
    "pendingAssignments": 0,
    "overdueAssignments": 17,
    "totalAssignments": 20,
    "shiftBasedDecayApplied": false
  },
  "teamMetrics": {
    "totalAssignments": 20,
    "completedAssignments": 1,
    "onTimeSubmissions": 1,
    "pendingAssignments": 0,
    "overdueAssignments": 17,
    "teamCompletionRate": 5,
    "teamOnTimeRate": 5,
    "avgQualityScore": 70,
    "totalMembers": 4
  },
  "individualKPIs": [
    {
      "workerId": "worker1",
      "workerName": "Worker A",
      "kpi": {
        "rating": "Needs Improvement",
        "letterGrade": "F",
        "score": 3
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

### Individual KPI Endpoint
**URL:** `/api/goal-kpi/worker/assignment-kpi`  
**Method:** GET  
**Access:** Worker

#### Query Parameters
- `workerId` (required): Worker ID
- `period` (optional): Time period (weekly, monthly, yearly)
- `date` (optional): Specific date for calculation

#### Response Format
```javascript
{
  "success": true,
  "workerKPI": {
    "rating": "Needs Improvement",
    "letterGrade": "F",
    "color": "#ef4444",
    "description": "Poor performance. Immediate attention required.",
    "score": 3,
    "completionRate": 5,
    "onTimeRate": 5,
    "qualityScore": 70,
    "pendingBonus": 0,
    "overduePenalty": 9,
    "recoveryBonus": 0,
    "completedAssignments": 1,
    "pendingAssignments": 0,
    "overdueAssignments": 17,
    "totalAssignments": 20,
    "shiftBasedDecayApplied": false
  },
  "workerMetrics": {
    "totalAssignments": 20,
    "completedAssignments": 1,
    "onTimeSubmissions": 1,
    "pendingAssignments": 0,
    "overdueAssignments": 17,
    "completionRate": 5,
    "onTimeRate": 5,
    "qualityScore": 70
  },
  "period": {
    "start": "2025-10-01",
    "end": "2025-10-31",
    "month": "October 2025"
  }
}
```

---

## Frontend Integration

### TeamKPIDashboard Component
**File:** `frontend/src/components/TeamKPIDashboard.tsx`  
**Purpose:** Display monthly team KPI

#### Key Features
- Real-time KPI display
- Letter grade visualization
- Performance breakdown
- Individual worker KPIs
- Refresh functionality

#### Usage
```typescript
<TeamKPIDashboard 
  teamLeaderId={user.id} 
  compact={false} 
/>
```

### MonthlyAssignmentTracking Component
**File:** `frontend/src/components/MonthlyAssignmentTracking.tsx`  
**Purpose:** Display individual worker KPI

#### Key Features
- Monthly performance tracking
- Letter grade display
- Assignment breakdown
- Trend analysis
- Export functionality

#### Usage
```typescript
<MonthlyAssignmentTracking 
  teamLeaderId={user.id} 
  team={user.team} 
/>
```

### KPI Display Components
```typescript
// KPI Card Component
<KpiCard
  rating={kpi.rating}
  letterGrade={kpi.letterGrade}
  color={kpi.color}
  score={kpi.score}
  description={kpi.description}
  completionRate={kpi.completionRate}
  onTimeRate={kpi.onTimeRate}
  qualityScore={kpi.qualityScore}
/>
```

---

## Database Schema

### Primary Table: `work_readiness_assignments`
```sql
CREATE TABLE work_readiness_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES users(id),
  team_leader_id UUID NOT NULL REFERENCES users(id),
  assigned_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_time TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
  overdue_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Columns for KPI Calculation
- `worker_id`: Individual worker identifier
- `team_leader_id`: Team leader identifier
- `assigned_date`: When assignment was given
- `due_time`: When assignment is due
- `completed_at`: When assignment was completed
- `status`: Current status of assignment
- `overdue_date`: When assignment became overdue

### Indexes for Performance
```sql
-- Index for monthly KPI queries
CREATE INDEX idx_work_readiness_assignments_monthly 
ON work_readiness_assignments (team_leader_id, assigned_date);

-- Index for individual KPI queries
CREATE INDEX idx_work_readiness_assignments_individual 
ON work_readiness_assignments (worker_id, assigned_date);

-- Index for status filtering
CREATE INDEX idx_work_readiness_assignments_status 
ON work_readiness_assignments (status);
```

---

## Security Features

### Server-Side Calculation
- All KPI calculations happen in the backend
- Frontend only displays results
- Cannot be tampered by users
- Consistent across all clients

### Input Validation
```javascript
// Input validation in kpiUtils.js
if (typeof completedAssignments !== 'number' || typeof totalAssignments !== 'number') {
  logger.error('Invalid input types for KPI calculation', {
    completedAssignments: typeof completedAssignments,
    totalAssignments: typeof totalAssignments
  });
  return {
    rating: 'Error',
    color: '#ef4444',
    description: 'Invalid data for KPI calculation',
    score: 0
  };
}
```

### Rate Limiting
- API endpoints have rate limiting
- Prevents abuse and ensures fair usage
- Configurable limits per user role

### Authentication
- JWT token authentication required
- Role-based access control
- Team leaders can only see their team data
- Workers can only see their own data

---

## Examples and Use Cases

### Example 1: Poor Performance (Current SAM WARD)
```
Input Data:
- Total Assignments: 20
- Completed: 1
- On-Time: 1
- Overdue: 17
- Pending: 0
- Quality Score: 70

Calculation:
Completion Rate: (1 / 20) × 100% = 5.0%
On-Time Rate: (1 / 20) × 100% = 5.0%
Quality Score: 70%
Pending Bonus: 0%
Overdue Penalty: (17 / 20) × 10% = 8.5%

Weighted Score = (5.0 × 0.7) + (5.0 × 0.2) + (70 × 0.1) + 0 - 8.5
Weighted Score = 3.5 + 1.0 + 7.0 + 0 - 8.5 = 3.0

Result:
- Rating: "Needs Improvement"
- Letter Grade: F
- Score: 3
- Color: #ef4444 (red)
- Description: "Poor performance. Immediate attention required."
```

### Example 2: Good Performance
```
Input Data:
- Total Assignments: 20
- Completed: 15
- On-Time: 12
- Overdue: 2
- Pending: 3
- Quality Score: 80

Calculation:
Completion Rate: (15 / 20) × 100% = 75.0%
On-Time Rate: (12 / 20) × 100% = 60.0%
Quality Score: 80%
Pending Bonus: (3 / 20) × 5% = 0.75%
Overdue Penalty: (2 / 20) × 10% = 1.0%

Weighted Score = (75.0 × 0.7) + (60.0 × 0.2) + (80 × 0.1) + 0.75 - 1.0
Weighted Score = 52.5 + 12.0 + 8.0 + 0.75 - 1.0 = 72.25

Result:
- Rating: "Above Average"
- Letter Grade: B-
- Score: 72
- Color: #3b82f6 (blue)
- Description: "Above average performance. Good progress."
```

### Example 3: Excellent Performance
```
Input Data:
- Total Assignments: 20
- Completed: 19
- On-Time: 18
- Overdue: 0
- Pending: 1
- Quality Score: 90

Calculation:
Completion Rate: (19 / 20) × 100% = 95.0%
On-Time Rate: (18 / 20) × 100% = 90.0%
Quality Score: 90%
Pending Bonus: (1 / 20) × 5% = 0.25%
Overdue Penalty: 0%

Weighted Score = (95.0 × 0.7) + (90.0 × 0.2) + (90 × 0.1) + 0.25 - 0
Weighted Score = 66.5 + 18.0 + 9.0 + 0.25 - 0 = 93.75

Result:
- Rating: "Excellent"
- Letter Grade: A
- Score: 94
- Color: #10b981 (green)
- Description: "Excellent performance! Perfect assignment completion and quality."
```

---

## Troubleshooting

### Common Issues

#### 1. KPI Score Mismatch
**Problem:** Different scores showing in different components  
**Solution:** Ensure all components use the same backend KPI system

#### 2. Letter Grade Not Displaying
**Problem:** Letter grades not showing in frontend  
**Solution:** Check if `letterGrade` field is included in API response

#### 3. Performance Issues
**Problem:** Slow KPI calculations  
**Solution:** Check database indexes and query optimization

#### 4. Authentication Errors
**Problem:** 401/403 errors when accessing KPI endpoints  
**Solution:** Verify JWT token and user permissions

### Debug Logging
Enable debug logging to troubleshoot issues:
```javascript
// In kpiUtils.js
logger.logBusiness('Assignment KPI Calculation (Improved)', {
  totalAssignments,
  completedAssignments,
  completionRate: Math.round(completionRate * 100) / 100,
  weightedScore: Math.round(weightedScore * 100) / 100
});
```

### Performance Monitoring
Monitor KPI calculation performance:
```javascript
const startTime = Date.now();
const result = calculateAssignmentKPI(...);
const endTime = Date.now();
console.log(`KPI calculation took ${endTime - startTime}ms`);
```

---

## Best Practices

### 1. Data Consistency
- Always use current month data for calculations
- Ensure assignments are properly marked as completed/overdue
- Regular data validation and cleanup

### 2. Performance Optimization
- Use database indexes for common queries
- Cache frequently accessed KPI data
- Implement pagination for large datasets

### 3. User Experience
- Display loading states during KPI calculations
- Provide clear error messages
- Show helpful descriptions for each grade

### 4. Security
- Validate all input data
- Use parameterized queries
- Implement proper access controls

### 5. Maintenance
- Regular monitoring of KPI calculations
- Update documentation when changes are made
- Test thoroughly before deployment

---

## Future Enhancements

### Planned Features
1. **Historical Trends:** Track KPI changes over time
2. **Predictive Analytics:** Forecast future performance
3. **Custom Weighting:** Allow team leaders to adjust KPI weights
4. **Advanced Reporting:** Detailed performance reports
5. **Mobile Optimization:** Better mobile experience

### Technical Improvements
1. **Caching:** Implement Redis caching for KPI data
2. **Real-time Updates:** WebSocket updates for KPI changes
3. **Batch Processing:** Optimize bulk KPI calculations
4. **API Versioning:** Support multiple API versions
5. **Monitoring:** Advanced performance monitoring

---

## Conclusion

The unified KPI system provides a comprehensive, secure, and consistent approach to performance measurement. By using a single backend calculation engine with standardized letter grades, the system ensures fairness, accuracy, and user trust.

Key benefits:
- **Security:** Server-side calculation only
- **Consistency:** Same logic for monthly and individual KPIs
- **Transparency:** Clear grading system and descriptions
- **Maintainability:** Centralized logic and comprehensive logging
- **Scalability:** Optimized database queries and caching

For questions or issues, refer to the troubleshooting section or contact the development team.

---

*Last Updated: October 2025*  
*Version: 2.0*  
*Author: Work Readiness System Development Team*
