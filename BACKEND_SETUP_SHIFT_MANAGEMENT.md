# Backend Server Setup for Shift Management

## Quick Start Instructions

### 1. Start the Backend Server
```bash
cd backend
npm start
# or
node server.js
```

The server should start on `http://localhost:5001`

### 2. Verify Backend is Running
Visit: `http://localhost:5001/health`

You should see:
```json
{
  "status": "ok",
  "message": "KPI API is running"
}
```

### 3. Test Shift Management API
Visit: `http://localhost:5001/api/shifts/types`

You should see the shift types data.

## Environment Variables

Make sure you have these environment variables set in your `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:3000
PORT=5001
```

## Troubleshooting

### Error: "Failed to fetch shift types - Backend may not be running"
- Check if backend server is running on port 5001
- Verify the API routes are properly loaded
- Check console for any server errors

### Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
- This means the frontend is getting an HTML response instead of JSON
- Usually indicates the backend server is not running
- The frontend will now show mock data when backend is unavailable

### Port Conflicts
If port 5001 is in use, update the PORT environment variable:
```env
PORT=5002
```

And update the frontend API URL:
```env
REACT_APP_API_URL=http://localhost:5002/api
```

## API Endpoints Available

- `GET /api/shifts/types` - Get all shift types
- `GET /api/shifts/team-leaders` - Get team leaders with shifts
- `POST /api/shifts/assign` - Assign shift to team leader
- `GET /api/shifts/history/:teamLeaderId` - Get shift history
- `PUT /api/shifts/:shiftId` - Update shift assignment
- `DELETE /api/shifts/:shiftId` - Deactivate shift assignment
- `GET /api/shifts/statistics` - Get shift statistics

## Frontend Fallback

The frontend now includes fallback mechanisms:
- If backend is not available, it shows mock shift types
- Empty states for team leaders and statistics
- Clear error messages indicating backend status

This allows the UI to be viewed even when the backend is not running.

