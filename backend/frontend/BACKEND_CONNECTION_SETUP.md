# Backend Connection Setup Guide

## ✅ What's Been Done

1. **Created Backend API Configuration** (`src/utils/backendApi.ts`)
   - Connects to your deployed backend at `https://sociosystem.onrender.com`
   - Includes authentication with Supabase tokens
   - Has all KPI endpoints ready to use

2. **Updated KPI Components**
   - `TeamKPIDashboard.tsx` - Now uses backend API
   - `GoalTrackingCard.tsx` - Now uses backend API

3. **Created Test Component** (`src/components/BackendConnectionTest.tsx`)
   - Test the connection between frontend and backend

## 🚀 How to Test

### Step 1: Add Environment Variables
Create a `.env` file in the `frontend` folder:

```bash
# frontend/.env
REACT_APP_API_URL=https://sociosystem.onrender.com/api
REACT_APP_BACKEND_URL=https://sociosystem.onrender.com
REACT_APP_API_BASE_URL=https://sociosystem.onrender.com
```

### Step 2: Add Test Component to Your App
Add the test component to any page to verify connection:

```tsx
import BackendConnectionTest from '../components/BackendConnectionTest';

// In your component:
<BackendConnectionTest />
```

### Step 3: Test the KPI System
1. Login as a team leader or worker
2. Navigate to a page with KPI components
3. Check browser console for connection logs
4. The KPI data should now come from your backend

## 📋 Available KPI Endpoints

Your backend has these KPI endpoints:

- `GET /api/goal-kpi/worker/weekly-progress?workerId={id}` - Worker progress
- `GET /api/goal-kpi/team-leader/weekly-summary?teamLeaderId={id}` - Team summary
- `GET /api/goal-kpi/team-leader/monitoring-dashboard?teamLeaderId={id}` - Monitoring
- `GET /api/goal-kpi/team-leader/monthly-performance?teamLeaderId={id}` - Monthly data
- `POST /api/goal-kpi/submit-assessment` - Submit assessments
- `POST /api/goal-kpi/login-cycle` - Track login cycles

## 🔧 Usage in Components

```tsx
import { kpiAPI } from '../utils/backendApi';

// Get team KPI data
const result = await kpiAPI.getTeamWeeklySummary(teamLeaderId);

// Get worker progress
const result = await kpiAPI.getWorkerWeeklyProgress(workerId);

// Submit assessment
const result = await kpiAPI.submitAssessment(assessmentData);
```

## 🐛 Troubleshooting

1. **Connection Failed**: Check if backend is running at https://sociosystem.onrender.com
2. **401 Unauthorized**: Make sure user is logged in with Supabase
3. **404 Not Found**: Check if the endpoint exists in your backend
4. **CORS Error**: Backend should allow requests from your frontend domain

## ✅ Next Steps

1. Test the connection using the test component
2. Verify KPI data is loading from backend
3. Update other components to use the new API
4. Deploy your frontend with the new configuration

Your KPI system is now connected to your deployed backend! 🎉
