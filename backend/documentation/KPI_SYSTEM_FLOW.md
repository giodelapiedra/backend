# KPI System Flow - Paano Gumagana ang System Mo

## 🎯 **OVERVIEW: Paano Gumagana ang KPI System**

### **1. USER JOURNEY (Worker Experience)**

```
Worker Login → Dashboard → Work Readiness Assessment → KPI Calculation → Display Results
```

#### **Step 1: Worker Login**
- Worker nag-login sa system
- System automatically calls `handleLoginCycle()` 
- Checks kung may existing cycle o kailangan ng bagong cycle

#### **Step 2: Work Readiness Assessment**
- Worker nag-submit ng daily work readiness assessment
- System validates kung consecutive ba ang submission
- Updates cycle data (streak_days, cycle_day, cycle_completed)

#### **Step 3: KPI Calculation**
- System calculates KPI based sa consecutive days
- Updates dashboard with real-time KPI data

---

## 🔄 **CYCLE MANAGEMENT SYSTEM**

### **Cycle Rules Implementation:**

#### **Rule 1: Daily Submission Required**
```javascript
// Check if consecutive day
const daysDiff = Math.floor((todayDate - lastSubmissionDate) / (1000 * 60 * 60 * 24));

if (daysDiff === 1) {
  // ✅ Consecutive day - continue streak
  streakDays = (latestAssessment.streak_days || 0) + 1;
}
```

#### **Rule 2: Missed Day = Cycle Reset**
```javascript
if (daysDiff > 1) {
  // ❌ Missed day(s) - reset cycle
  console.log('🔄 MISSED DAYS - Resetting cycle due to gap of', daysDiff, 'days');
  cycleStart = today;
  cycleDay = 1;
  streakDays = 1;
  cycleCompleted = false;
}
```

#### **Rule 3: 7 Consecutive Days = Cycle Complete**
```javascript
if (streakDays >= 7) {
  cycleCompleted = true;
  message = "🎉 Cycle complete! Excellent work! 7 consecutive days achieved!";
}
```

#### **Rule 4: After Completion = New Cycle**
```javascript
if (latestAssessment?.cycle_completed) {
  // Start new cycle
  cycleStart = today;
  cycleDay = 1;
  streakDays = 1;
  cycleCompleted = false;
}
```

---

## 📊 **KPI CALCULATION LOGIC**

### **KPI Scoring System:**
```javascript
const calculateKPI = (consecutiveDays) => {
  if (consecutiveDays >= 7) {
    return { rating: 'Excellent', score: 100, color: '#10b981' };
  } else if (consecutiveDays >= 5) {
    return { rating: 'Good', score: Math.round((consecutiveDays / 7) * 100), color: '#22c55e' };
  } else if (consecutiveDays >= 3) {
    return { rating: 'Average', score: Math.round((consecutiveDays / 7) * 100), color: '#eab308' };
  } else {
    return { rating: 'No KPI Points', score: 0, color: '#ef4444' };
  }
};
```

### **KPI Examples:**
- **7 consecutive days** → **Excellent** (100% score) 🏆
- **5-6 consecutive days** → **Good** (71-85% score) ✅
- **3-4 consecutive days** → **Average** (43-57% score) ⚠️
- **Less than 3 days** → **No KPI Points** (0% score) ❌

---

## 🗄️ **DATABASE OPERATIONS**

### **Main Tables Used:**

#### **1. `users` Table**
```sql
-- Worker information
SELECT id, first_name, last_name, role, team, team_leader_id
FROM users 
WHERE role = 'worker' AND id = workerId
```

#### **2. `work_readiness` Table**
```sql
-- Work readiness assessments with cycle data
SELECT cycle_start, cycle_day, streak_days, cycle_completed, submitted_at
FROM work_readiness 
WHERE worker_id = workerId
ORDER BY submitted_at DESC
```

### **Database Flow:**

#### **Step 1: Check Existing Assessment**
```javascript
const { data: latestAssessment } = await supabase
  .from('work_readiness')
  .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
  .eq('worker_id', workerId)
  .order('submitted_at', { ascending: false })
  .limit(1)
  .single();
```

#### **Step 2: Validate Consecutive Days**
```javascript
const lastSubmissionDate = new Date(latestAssessment.submitted_at);
const todayDate = new Date(today);
const daysDiff = Math.floor((todayDate - lastSubmissionDate) / (1000 * 60 * 60 * 24));
```

#### **Step 3: Update Cycle Data**
```javascript
const assessmentWithCycle = {
  ...assessmentData,
  cycle_start: cycleStart,
  cycle_day: cycleDay,
  streak_days: streakDays,
  cycle_completed: cycleCompleted
};
```

---

## 🌐 **API ENDPOINTS**

### **Worker KPI Endpoint:**
```
GET /api/goal-kpi/worker/weekly-progress?workerId={workerId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "weeklyProgress": {
      "completedDays": 5,
      "totalWorkDays": 7,
      "completionRate": 71,
      "kpi": {
        "rating": "Good",
        "score": 71,
        "color": "#22c55e",
        "description": "Good progress! Keep going to complete the cycle."
      },
      "weekLabel": "Cycle Day 5 of 7",
      "streaks": { "current": 5, "longest": 8 }
    },
    "dailyBreakdown": [
      {
        "date": "2024-01-01",
        "dayName": "Mon",
        "completed": true,
        "readinessLevel": "fit",
        "fatigueLevel": 2,
        "mood": "good"
      }
    ]
  }
}
```

### **Team Leader KPI Endpoint:**
```
GET /api/goal-kpi/team-leader/weekly-summary?teamLeaderId={teamLeaderId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "teamKPI": {
      "overallTeamKPI": { "rating": "Good", "score": 75 },
      "teamOverview": {
        "totalMembers": 10,
        "activeMembers": 8,
        "averageCompletion": 75
      },
      "individualKPIs": [
        {
          "workerId": "123",
          "name": "John Doe",
          "kpi": { "rating": "Excellent", "score": 100 },
          "streakDays": 7
        }
      ]
    }
  }
}
```

---

## 🎮 **FRONTEND INTEGRATION**

### **Worker Dashboard:**
```javascript
// GoalTrackingCard.tsx
const fetchGoalData = async () => {
  const response = await fetch(`http://localhost:5000/api/goal-kpi/worker/weekly-progress?workerId=${user?.id}`);
  const result = await response.json();
  
  if (result.success) {
    setData(result.data);
    // Display KPI, streaks, daily breakdown
  }
};
```

### **Team Leader Dashboard:**
```javascript
// TeamKPIDashboard.tsx
const fetchTeamKPIData = async () => {
  const response = await fetch(`http://localhost:5000/api/goal-kpi/team-leader/weekly-summary?teamLeaderId=${user?.id}`);
  const result = await response.json();
  
  if (result.success) {
    setData(result.data.teamKPI);
    // Display team overview, individual KPIs
  }
};
```

---

## 🔄 **REAL-TIME UPDATES**

### **Automatic Cycle Management:**
1. **Login Detection** → `handleLoginCycle()` called
2. **Submission Validation** → Consecutive day check
3. **Cycle Update** → Database updated with new cycle data
4. **KPI Calculation** → Real-time KPI calculation
5. **Dashboard Refresh** → Frontend displays updated data

### **Cycle States:**
- **No Cycle** → Start new cycle (Day 1)
- **Active Cycle** → Continue streak or reset if missed day
- **Completed Cycle** → Start new cycle on next submission
- **Missed Day** → Reset cycle automatically

---

## 📈 **PERFORMANCE TRACKING**

### **Streak Calculation:**
```javascript
const calculateStreaks = (assessments) => {
  // Calculate current streak from most recent submissions
  // Calculate longest streak from all submissions
  // Skip weekends (Saturday/Sunday)
  
  return {
    current: currentStreak,
    longest: longestStreak
  };
};
```

### **Daily Breakdown:**
```javascript
// Generate 7-day breakdown for current cycle
for (let i = 0; i < 7; i++) {
  const currentDate = new Date(cycleStart);
  currentDate.setDate(cycleStart.getDate() + i);
  
  const dayAssessment = assessments?.find(a => 
    new Date(a.submitted_at).toISOString().split('T')[0] === dateStr
  );
  
  dailyBreakdown.push({
    date: dateStr,
    dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
    completed: !!dayAssessment,
    readinessLevel: dayAssessment?.readiness_level || null
  });
}
```

---

## 🎯 **SUMMARY: Paano Gumagana ang System**

1. **Worker nag-login** → System checks cycle status
2. **Worker nag-submit assessment** → System validates consecutive days
3. **System calculates KPI** → Based sa consecutive days completed
4. **Database updated** → New cycle data saved
5. **Dashboard refreshed** → Real-time KPI display
6. **Team leader monitoring** → Can see team performance
7. **Cycle management** → Automatic reset if missed day
8. **Achievement tracking** → Streaks, completion rates, trends

Ang system mo ay **FULLY AUTOMATED** at **REAL-TIME** - walang manual intervention needed!



