# KPI System Documentation

## Overview
This document provides comprehensive documentation for the Work Readiness KPI (Key Performance Indicator) system, including calculations, rating scales, and implementation details.

## Table of Contents
1. [KPI Rating System](#kpi-rating-system)
2. [Team vs Individual KPI](#team-vs-individual-kpi)
3. [Calculation Formulas](#calculation-formulas)
4. [Sample Calculations](#sample-calculations)
5. [Implementation Details](#implementation-details)
6. [Monthly Reset Mechanism](#monthly-reset-mechanism)
7. [Historical Data Retention](#historical-data-retention)

---

## KPI Rating System

### Current Rating System (Based on Weighted Score 0-100)

| Grade | Score Range | Rating | Color | Performance Level |
|-------|-------------|--------|-------|-------------------|
| A+ | 90-100 | Excellent | Green (#10b981) | Outstanding |
| B | 75-89 | Good | Light Green (#22c55e) | Good |
| C | 60-74 | Average | Yellow (#eab308) | Average |
| D | 40-59 | Below Average | Orange (#f97316) | Needs Improvement |
| F | 0-39 | Needs Improvement | Red (#ef4444) | Poor |

### Rating Descriptions

**A+ Grade (90-100 points):**
- **Rating:** "Excellent"
- **Color:** Green (#10b981)
- **Description:** "Outstanding performance! Perfect assignment completion and quality."
- **Score Range:** 90-100

**B Grade (75-89 points):**
- **Rating:** "Good"
- **Color:** Light Green (#22c55e)
- **Description:** "Good performance! Keep up the consistency."
- **Score Range:** 75-89

**C Grade (60-74 points):**
- **Rating:** "Average"
- **Color:** Yellow (#eab308)
- **Description:** "Average performance. Focus on completing more assignments."
- **Score Range:** 60-74

**D Grade (40-59 points):**
- **Rating:** "Below Average"
- **Color:** Orange (#f97316)
- **Description:** "Below average performance. Needs improvement."
- **Score Range:** 40-59

**F Grade (0-39 points):**
- **Rating:** "Needs Improvement"
- **Color:** Red (#ef4444)
- **Description:** "Poor performance. Immediate attention required."
- **Score Range:** 0-39

### Special Cases

**No Assignments:**
- **Rating:** "No Assignments"
- **Color:** Gray (#6b7280)
- **Description:** "No work readiness assignments given yet."
- **Score:** 0

**Not Started:**
- **Rating:** "Not Started"
- **Color:** Gray (#6b7280)
- **Description:** "KPI rating not yet started. Begin your work readiness assessments."
- **Score:** 0

---

## Team vs Individual KPI

### Team KPI Calculation
**Basis:** All team members combined performance  
**Scope:** Team leader manages multiple workers  
**Metrics:** Aggregated across all team members

### Individual KPI Calculation
**Basis:** Single worker performance only  
**Scope:** Individual worker assignments  
**Metrics:** Personal performance metrics

### Key Differences

| Aspect | Team KPI | Individual KPI |
|--------|----------|----------------|
| **Scope** | All team members | Single worker |
| **Responsibility** | Team leader | Individual worker |
| **Numbers** | Higher (aggregated) | Lower (personal) |
| **Purpose** | Team effectiveness | Personal accountability |
| **Management** | Team performance | Self-management |

### Sample Comparison

| Worker | Total | Completed | Completion | On-Time | Overdue | Grade |
|--------|-------|-----------|------------|---------|---------|-------|
| **Team (SAM WARD)** | 80 | 32 | 40.0% | 35.0% | 50.0% | **D** |
| **Worker A** | 20 | 15 | 75.0% | 60.0% | 25.0% | **B** |
| **Worker B** | 20 | 8 | 40.0% | 30.0% | 50.0% | **D** |
| **Worker C** | 20 | 5 | 25.0% | 20.0% | 75.0% | **F** |
| **Worker D** | 20 | 4 | 20.0% | 30.0% | 50.0% | **F** |

---

## Calculation Formulas

### Main KPI Formula
```
Weighted Score = (Completion Rate × 70%) + (On-Time Rate × 20%) + (Quality Score × 10%) + Pending Bonus - Overdue Penalty + Recovery Bonus
```

### Component Breakdown

**1. Completion Rate (70% weight):**
```
Completion Rate = (Completed Assignments / Total Assignments) × 100%
```

**2. On-Time Rate (20% weight):**
```
On-Time Rate = (On-Time Submissions / Total Assignments) × 100%
```

**3. Quality Score (10% weight):**
```
Quality Score = Average quality score (0-100)
```

**4. Pending Bonus (up to 5%):**
```
Pending Bonus = min(5, (Pending Assignments / Total Assignments) × 5)
```

**5. Overdue Penalty (up to 10%):**
```
Overdue Penalty = min(10, (Overdue Assignments / Total Assignments) × 10)
```

**6. Recovery Bonus (up to 3%):**
```
Recovery Bonus = Based on recent completion rate (last 7 days)
- >80% recent completion: +3% bonus
- >60% recent completion: +2% bonus
- >40% recent completion: +1% bonus
```

### Shift-Based Overdue Penalty (Improved)

**Time Decay Logic:**
- **0-3 shifts overdue:** 100% penalty
- **3-10 shifts overdue:** 60% penalty (40% reduction)
- **10-30 shifts overdue:** 30% penalty (70% reduction)
- **30+ shifts overdue:** 10% penalty (90% reduction)

**Calculation:**
```
Hours Overdue = (Current Time - Due Time) / (1000 * 60 * 60)
Shifts Overdue = Hours Overdue / 8
Penalty Multiplier = Based on shifts overdue
Total Penalty = Sum of (Penalty Multiplier for each overdue assignment)
```

---

## Sample Calculations

### Example 1: SAM WARD Team (Current Status)

**Input Data:**
- Total Assignments: 20
- Completed: 1
- On-Time: 1
- Overdue: 17
- Pending: 0
- Cancelled: 2
- Quality Score: 70 (default)

**Calculations:**
```
Completion Rate = (1 / 20) × 100% = 5.0%
On-Time Rate = (1 / 20) × 100% = 5.0%
Quality Score = 70%
Pending Bonus = min(5, (0 / 20) × 5) = 0%
Overdue Penalty = min(10, (17 / 20) × 10) = 8.5%
Recovery Bonus = 0% (no recent completions)

Weighted Score = (5.0 × 0.7) + (5.0 × 0.2) + (70 × 0.1) + 0 - 8.5 + 0
Weighted Score = 3.5 + 1.0 + 7.0 + 0 - 8.5 + 0
Weighted Score = 3.0
```

**Result:**
- **Score:** 3.0 points
- **Grade:** F
- **Rating:** "Needs Improvement"
- **Color:** Red (#ef4444)

### Example 2: Worker A (Good Performance)

**Input Data:**
- Total Assignments: 20
- Completed: 15
- On-Time: 12
- Overdue: 5
- Pending: 0
- Quality Score: 80

**Calculations:**
```
Completion Rate = (15 / 20) × 100% = 75.0%
On-Time Rate = (12 / 20) × 100% = 60.0%
Quality Score = 80%
Pending Bonus = min(5, (0 / 20) × 5) = 0%
Overdue Penalty = min(10, (5 / 20) × 10) = 2.5%
Recovery Bonus = 2% (good recent performance)

Weighted Score = (75.0 × 0.7) + (60.0 × 0.2) + (80 × 0.1) + 0 - 2.5 + 2
Weighted Score = 52.5 + 12.0 + 8.0 + 0 - 2.5 + 2
Weighted Score = 72.0
```

**Result:**
- **Score:** 72.0 points
- **Grade:** C
- **Rating:** "Average"
- **Color:** Yellow (#eab308)

### Example 3: Team Performance (Mixed Results)

**Input Data:**
- Total Assignments: 80 (4 workers × 20 each)
- Completed: 32
- On-Time: 28
- Overdue: 40
- Pending: 8
- Quality Score: 70

**Calculations:**
```
Completion Rate = (32 / 80) × 100% = 40.0%
On-Time Rate = (28 / 80) × 100% = 35.0%
Quality Score = 70%
Pending Bonus = min(5, (8 / 80) × 5) = 0.5%
Overdue Penalty = min(10, (40 / 80) × 10) = 5.0%
Recovery Bonus = 1% (some recent completions)

Weighted Score = (40.0 × 0.7) + (35.0 × 0.2) + (70 × 0.1) + 0.5 - 5.0 + 1
Weighted Score = 28.0 + 7.0 + 7.0 + 0.5 - 5.0 + 1
Weighted Score = 38.5
```

**Result:**
- **Score:** 38.5 points
- **Grade:** F
- **Rating:** "Needs Improvement"
- **Color:** Red (#ef4444)

---

## Implementation Details

### File Location
- **Backend:** `backend/utils/kpiUtils.js`
- **Main Function:** `calculateAssignmentKPI()`

### Function Signature
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

### Return Object
```javascript
{
  rating: "Excellent" | "Good" | "Average" | "Below Average" | "Needs Improvement",
  color: "#10b981" | "#22c55e" | "#eab308" | "#f97316" | "#ef4444",
  description: "Performance description",
  score: 85,                    // Weighted score (0-100)
  completionRate: 75,             // Completion rate percentage
  onTimeRate: 60,                 // On-time rate percentage
  qualityScore: 80,               // Quality score
  pendingBonus: 2,                // Pending bonus points
  overduePenalty: 5,              // Overdue penalty points
  recoveryBonus: 1,               // Recovery bonus points
  completedAssignments: 15,       // Number of completed assignments
  pendingAssignments: 3,          // Number of pending assignments
  overdueAssignments: 2,          // Number of overdue assignments
  totalAssignments: 20,           // Total number of assignments
  shiftBasedDecayApplied: true   // Whether shift-based decay was applied
}
```

### Logging
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

## Monthly Reset Mechanism

### How Monthly Reset Works

**Step 1: New Month Begins (e.g., November 1, 2025)**
- Previous month data: Still stored in database
- New assignments: Start counting from 0
- KPI calculation: Only uses November assignments

**Step 2: Assignment Counting**
- October assignments: Still visible in reports
- November assignments: New count starts
- Historical view: Can see all months

**Step 3: KPI Calculation**
- October KPI: Still shows historical score (e.g., 3.0%)
- November KPI: Calculated from November assignments only
- Trend analysis: Can compare month-over-month

### What Resets vs What Stays

**What Resets:**
1. Current month KPI calculation
2. Assignment counting for new month
3. Performance tracking for current month

**What Stays (Never Deleted):**
1. All previous KPI scores
2. All assignment history
3. All performance trends
4. All monthly reports

### Data Retention Status

| Database Table | Purpose | Retention | Contains |
|----------------|---------|-----------|----------|
| `work_readiness_assignments` | Assignment records | Permanent - never deleted | All assignments with dates, status, completion times |
| `kpi_calculations` | KPI score history | Permanent - never deleted | Monthly KPI scores, breakdowns, trends |
| `team_leader_performance` | Performance tracking | Permanent - never deleted | Historical performance metrics |

### Accessing Historical Data

**1. Analytics Dashboard:**
- Month selector: Choose any previous month
- Historical charts: Show past performance
- Trend analysis: Compare months

**2. Reports Section:**
- Monthly reports: Download previous months
- Performance history: View all past scores
- Assignment history: See all past assignments

**3. Database Queries:**
- Direct access: Query historical data
- Export data: Download for analysis
- Custom reports: Create historical comparisons

---

## Historical Data Retention

### SAM WARD Historical Example

| Month | Total Assignments | Completed | KPI Score | Grade | Status |
|-------|------------------|-----------|-----------|-------|--------|
| September 2025 | 15 | 8 | 45.2% | D | Good performance |
| October 2025 | 20 | 1 | 3.0% | F | Needs improvement |
| November 2025 | 0 | 0 | 0.0% | F | New month - fresh start |

### Key Points

**Monthly Basis:**
- Only counts assignments from current month
- Previous month performance does not affect current month
- Each month starts fresh

**Data Retention:**
- All assignments: Stored permanently
- KPI scores: Historical records kept
- Performance trends: Available for analysis
- Reports: Can generate for any month

**Access Methods:**
- Dashboard: Month selector for historical view
- Reports: Download previous month data
- Analytics: Compare month-over-month performance
- Database: Direct query access

---

## Management Insights

### For Team Leaders

**Current SAM WARD Status:**
- **Team Grade:** D (Below Average)
- **Score:** ~40 points
- **Rating:** "Below Average"
- **Color:** Orange
- **Description:** "Below average performance. Needs improvement."

**Improvement Strategy:**
1. Focus on current month assignments
2. Complete more assignments on time
3. Reduce overdue assignments
4. Each month is a new opportunity

**Target Grades:**
- **Target C Grade:** Need 60+ points
- **Target B Grade:** Need 75+ points
- **Target A Grade:** Need 90+ points

### For Individual Workers

**Performance Levels:**
- **Worker A:** Excellent (75% completion) - Grade B
- **Worker B:** Average (40% completion) - Grade D
- **Worker C:** Below average (25% completion) - Grade F
- **Worker D:** Poor (20% completion) - Grade F

**Individual Improvement:**
1. Worker A: Maintain excellent performance
2. Worker B: Aim for consistency
3. Worker C: Focus on completion rate
4. Worker D: Needs significant improvement

---

## Technical Implementation

### Backend Integration

**Controller Usage:**
```javascript
const { calculateAssignmentKPI } = require('../utils/kpiUtils');

// Calculate KPI for team leader
const kpiResult = calculateAssignmentKPI(
  completedAssignments,
  totalAssignments,
  onTimeSubmissions,
  qualityScore,
  pendingAssignments,
  overdueAssignments,
  overdueAssignmentsWithDates
);
```

**API Response Format:**
```javascript
{
  success: true,
  data: {
    kpi: {
      rating: "Good",
      color: "#22c55e",
      description: "Good performance! Keep up the consistency.",
      score: 75,
      completionRate: 60,
      onTimeRate: 50,
      qualityScore: 70,
      pendingBonus: 2,
      overduePenalty: 5,
      recoveryBonus: 1,
      completedAssignments: 12,
      pendingAssignments: 3,
      overdueAssignments: 5,
      totalAssignments: 20,
      shiftBasedDecayApplied: true
    }
  }
}
```

### Frontend Integration

**Display Format:**
```javascript
// KPI Card Component
<KpiCard
  rating={kpi.rating}
  color={kpi.color}
  score={kpi.score}
  description={kpi.description}
  completionRate={kpi.completionRate}
  onTimeRate={kpi.onTimeRate}
  qualityScore={kpi.qualityScore}
/>
```

**Color Coding:**
- **Green:** Excellent performance (A+)
- **Light Green:** Good performance (B)
- **Yellow:** Average performance (C)
- **Orange:** Below average (D)
- **Red:** Poor performance (F)
- **Gray:** No data/not started

---

## Conclusion

The KPI system provides a comprehensive performance measurement tool that:

1. **Measures Performance:** Tracks completion, on-time, and quality metrics
2. **Provides Feedback:** Clear letter grades and descriptions
3. **Encourages Improvement:** Recovery bonuses and time decay
4. **Maintains History:** Permanent data retention for trend analysis
5. **Supports Management:** Team and individual performance tracking

The system is designed to be fair, motivating, and comprehensive, providing both team leaders and individual workers with clear performance indicators and improvement opportunities.

---

*Last Updated: October 2025*
*Version: 1.0*
*Author: Work Readiness System Development Team*

