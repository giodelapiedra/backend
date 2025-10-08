# Cycle Columns Migration Documentation

## Overview
This document explains the migration from cycle-based work readiness system to assignment-based system.

## Database Schema Changes

### Legacy Columns (Kept for Migration)
The following columns in the `work_readiness` table are **kept for migration purposes** but **NOT used** in the new assignment-based system:

- `cycle_day` (int4) - Day number in 7-day cycle
- `streak_days` (int4) - Consecutive days completed
- `cycle_completed` (bool) - Whether 7-day cycle is completed
- `cycle_start` (date) - Start date of current cycle

### New System Logic
The new assignment-based KPI system uses:
- `work_readiness_assignments` table for tracking assignments
- Assignment completion rates instead of consecutive days
- On-time submission tracking
- Quality scores based on readiness levels

## Code Changes

### Backend Functions
- `getWorkerAssignmentKPI()` - **NEW** assignment-based KPI calculation
- `calculateAssignmentKPI()` - **NEW** KPI calculation function
- `handleAssessmentSubmission()` - Still populates cycle columns for migration but doesn't use them

### Frontend Components
- `GoalTrackingCard` - Updated to use assignment-based metrics
- Worker Dashboard - Shows assignment completion instead of cycle progress

## Migration Strategy

### Phase 1: Parallel Systems (Current)
- ✅ New assignment-based system is active
- ✅ Legacy cycle columns are populated but not used
- ✅ Both systems can coexist

### Phase 2: Full Migration (Future)
- 🔄 Monitor new system performance
- 🔄 Ensure all data is properly migrated
- 🔄 Remove cycle columns when confident

### Phase 3: Cleanup (Future)
- 🗑️ Remove cycle-based columns
- 🗑️ Clean up legacy code
- 🗑️ Update documentation

## Benefits of This Approach

### Safety
- ✅ No data loss during migration
- ✅ Ability to rollback if needed
- ✅ Gradual transition

### Flexibility
- ✅ Can compare old vs new system
- ✅ Historical data preserved
- ✅ Easy to revert if issues arise

## Current Status
- **Active System:** Assignment-based KPI
- **Legacy System:** Cycle-based (populated but unused)
- **Migration Status:** Phase 1 - Parallel Systems

## Next Steps
1. Monitor new system performance
2. Collect user feedback
3. Plan Phase 2 migration timeline
4. Schedule Phase 3 cleanup

---
*Last Updated: [Current Date]*
*Migration Status: Phase 1 - Parallel Systems*
