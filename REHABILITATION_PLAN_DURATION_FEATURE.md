# Rehabilitation Plan Duration Feature

## ✅ **Feature Summary**

Added a **duration system** to rehabilitation plans where clinicians can set how many days a plan should last (e.g., 7 days, 14 days, 30 days). The system tracks daily completions and shows accurate progress across multiple days.

---

## 🎯 **How It Works**

### **1. Clinician Creates Plan with Duration**

When creating a rehabilitation plan, clinicians can now specify:
- **Duration**: Number of days the plan should last (default: 7 days)
- Range: 1-365 days

```
Create Rehabilitation Plan
┌────────────────────────────────────┐
│ Select Case: Case #12345          │
│ Plan Name: Recovery Plan           │
│ Plan Description: Daily exercises  │
│ Duration (Days): [7]  ←── NEW!     │
│   ↳ How many days should this      │
│     plan last? (e.g., 7 days)      │
│                                    │
│ Exercises:                         │
│   1. Cat-Cow (10 reps)            │
│   2. Stretching (15 mins)         │
└────────────────────────────────────┘
```

### **2. Worker Completes Exercises Daily**

Workers see their progress displayed as "Day X of Y":

```
┌────────────────────────────────────┐
│   Today's Recovery Plan            │
│                                    │
│   Daily recovery exercises         │
│                                    │
│   ┌─────────────────────────┐     │
│   │ ✅ Day 2 of 7           │     │
│   └─────────────────────────┘     │
│                                    │
│   Exercise 1: Cat-Cow              │
│   [Complete Exercise]              │
└────────────────────────────────────┘
```

### **3. Progress Tracking**

**Progress is calculated based on completed days, not individual exercises:**

#### Example: 7-Day Plan
```
Day 1: Complete all exercises → 14% (1/7 days)
Day 2: Complete all exercises → 29% (2/7 days)
Day 3: Complete all exercises → 43% (3/7 days)
Day 4: Complete all exercises → 57% (4/7 days)
Day 5: Complete all exercises → 71% (5/7 days)
Day 6: Complete all exercises → 86% (6/7 days)
Day 7: Complete all exercises → 100% (7/7 days) ✅
```

### **4. Clinician Dashboard Display**

Clinicians see detailed progress for each plan:

```
Active Rehabilitation Plans
┌────────────────────────────────────┐
│ Recovery Plan              [Active]│
│                                    │
│ Case: #12345                       │
│ Worker: John Doe                   │
│ Duration: 7 days            ←── NEW!
│ Progress: Day 2 of 7 (29%) ←── NEW!
│                                    │
│ ████████░░░░░░░░ 29%              │
│                                    │
│ [View Progress] [Edit] [Complete] │
└────────────────────────────────────┘
```

---

## 📊 **Database Schema**

### **New Column: `duration`**

```sql
ALTER TABLE rehabilitation_plans
ADD COLUMN duration INTEGER DEFAULT 7;

-- Constraint: 1-365 days
ALTER TABLE rehabilitation_plans
ADD CONSTRAINT check_duration_positive 
CHECK (duration > 0 AND duration <= 365);
```

### **Example Data**

```json
{
  "id": "plan-123",
  "duration": 7,
  "daily_completions": [
    {
      "date": "2025-01-10",
      "exercises": [
        { "exerciseId": "ex-1", "status": "completed" },
        { "exerciseId": "ex-2", "status": "completed" }
      ]
    },
    {
      "date": "2025-01-11",
      "exercises": [
        { "exerciseId": "ex-1", "status": "completed" },
        { "exerciseId": "ex-2", "status": "completed" }
      ]
    }
  ],
  "progress_stats": {
    "completedDays": 2,
    "totalDays": 7,
    "progressPercentage": 29
  }
}
```

---

## 🔒 **24-Hour Access Lock**

After completing all exercises for the day, workers are locked out until the next day:

### **Same Day (After Completion)**
```
1. Worker completes all exercises
   ↓
2. Dialog: "🎉 All Exercises Completed!"
   ↓
3. Click "Go to Dashboard"
   ↓
4. Redirect to /worker
   ↓
5. Try to access /worker/rehabilitation-plan
   ↓
6. ⚡ AUTO-REDIRECT to /worker (locked for today)
```

### **Next Day (24 Hours Later)**
```
1. New date detected
   ↓
2. Access granted to /worker/rehabilitation-plan
   ↓
3. Can complete exercises again
   ↓
4. Progress updates: Day 2 of 7 → Day 3 of 7
```

---

## ✨ **Key Features**

| Feature | Implementation |
|---------|----------------|
| **Duration Input** | TextField with min: 1, max: 365 days |
| **Daily Progress** | Tracks which days have all exercises completed |
| **Overall Progress** | Completed days / Total days = percentage |
| **24-Hour Lock** | Can't access plan page after completion |
| **Auto Reset** | New day = unlocked automatically |
| **Clinician View** | Shows "Day X of Y (Z%)" |
| **Worker View** | Shows "Day X of Y" badge |

---

## 📁 **Files Modified**

### **Backend (Database)**
1. `add-duration-column-to-rehabilitation-plans.sql`
   - Adds `duration` column
   - Sets default to 7 days
   - Adds constraint (1-365 days)

### **Frontend - Clinician**
2. `frontend/src/pages/clinician/ClinicianDashboardRedux.tsx`
   - Added `duration` field to RehabPlan interface
   - Added `duration` input in Create Plan dialog
   - Updated `fetchRehabPlans` to calculate completed days
   - Updated form state and handlers

3. `frontend/src/components/clinician/RehabPlansSection.tsx`
   - Added duration display
   - Updated progress text to show "Day X of Y (Z%)"

### **Frontend - Worker**
4. `frontend/src/pages/worker/WorkerRehabilitationPlan.tsx`
   - Added `duration` field to RehabilitationPlan interface
   - Calculate completed days from daily_completions
   - Display "Day X of Y" badge in header
   - 24-hour access lock (already implemented)

---

## 🎨 **UI Examples**

### **Worker Dashboard - Day Badge**
```
┌────────────────────────────────────┐
│   Recovery Plan                    │
│   Daily recovery exercises         │
│                                    │
│   ┌─────────────────────────┐     │
│   │ ✅ Day 3 of 7           │     │  ← Green badge
│   └─────────────────────────┘     │
│                                    │
│   [Exercise carousel below]        │
└────────────────────────────────────┘
```

### **Clinician Dashboard - Plan Card**
```
┌────────────────────────────────────┐
│ Recovery Plan              [Active]│
│                                    │
│ Case: #12345                       │
│ Worker: John Doe                   │
│ Duration: 7 days                   │
│ Progress: Day 3 of 7 (43%)        │
│                                    │
│ ███████████░░░░░ 43%              │
└────────────────────────────────────┘
```

---

## 🔄 **Complete Workflow Example**

### **7-Day Rehabilitation Plan**

**Day 1 (Monday):**
- Worker completes 3 exercises
- Progress: Day 1 of 7 (14%)
- Status: ✅ Completed today, locked until tomorrow

**Day 2 (Tuesday):**
- Page unlocked (new day)
- Worker completes 3 exercises
- Progress: Day 2 of 7 (29%)
- Status: ✅ Completed today, locked until tomorrow

**Day 3 (Wednesday):**
- Page unlocked
- Worker completes 3 exercises
- Progress: Day 3 of 7 (43%)

**...continues...**

**Day 7 (Sunday):**
- Worker completes 3 exercises
- Progress: Day 7 of 7 (100%)
- Status: ✅ **PLAN COMPLETED!**
- Clinician can mark plan as "completed"

---

## 🛠️ **Installation & Setup**

### **1. Run Database Migration**
```bash
# Run the SQL migration
psql -U your_user -d your_database -f add-duration-column-to-rehabilitation-plans.sql
```

Or in Supabase SQL Editor:
```sql
-- Copy and run the contents of add-duration-column-to-rehabilitation-plans.sql
```

### **2. Restart Frontend**
```bash
cd frontend
npm start
```

### **3. Create a Test Plan**
1. Login as clinician
2. Go to Dashboard
3. Click "Create Plan"
4. Set Duration: 7 days
5. Add exercises
6. Assign to a case

### **4. Test as Worker**
1. Login as worker
2. Go to rehabilitation plan
3. Complete exercises
4. See "Day 1 of 7" badge
5. Try to access again (should redirect)
6. Wait 24 hours (or change date manually)
7. Access again (should work)
8. Complete exercises
9. See "Day 2 of 7" badge

---

## ✅ **Benefits**

| Benefit | Description |
|---------|-------------|
| **Clear Goals** | Workers know exactly how many days they need to complete |
| **Accurate Progress** | Progress based on days, not just today's exercises |
| **Better Planning** | Clinicians can create 7, 14, or 30-day programs |
| **Motivation** | Workers see their daily progress accumulate |
| **Professional** | Matches standard physiotherapy programs |
| **Flexible** | Duration can be adjusted per plan (1-365 days) |

---

## 🎉 **Summary**

✅ Clinicians can set plan duration (e.g., 7 days)
✅ Workers see "Day X of Y" progress
✅ Progress calculated based on completed days
✅ 24-hour lock after completing exercises
✅ Auto-reset next day
✅ Accurate progress tracking across multiple days
✅ Professional UI with green badge
✅ Database migration included

**Perfect for long-term rehabilitation programs! 💪**







