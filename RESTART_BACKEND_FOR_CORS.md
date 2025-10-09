# Restart Backend Server for CORS Fix

## Quick Fix Instructions

### 1. Stop the current backend server
- Press `Ctrl+C` in the terminal where the backend is running

### 2. Restart the backend server
```bash
cd backend
npm start
```

### 3. Verify CORS is working
Visit: `http://localhost:5001/health`

You should see:
```json
{
  "status": "ok",
  "message": "KPI API is running"
}
```

### 4. Test from frontend
- Refresh the Shift Management page
- Check browser console for authentication test results
- Click "Test Auth" button if needed

## What Was Fixed

1. **Enhanced CORS Configuration**:
   - Added multiple allowed origins
   - Explicitly allowed all necessary HTTP methods
   - Added proper headers for Authorization

2. **Manual CORS Headers**:
   - Added backup CORS headers
   - Handles OPTIONS preflight requests
   - Ensures proper response headers

3. **Debug Endpoint**:
   - Added `/api/shifts/test-auth` for testing
   - Helps identify authentication issues

## Expected Results

After restarting the backend:
- ✅ No more CORS errors
- ✅ Authentication test should work
- ✅ API calls should succeed
- ✅ Shift management should load properly

## Troubleshooting

If CORS still doesn't work:
1. Check if backend is running on port 5001
2. Verify frontend is running on port 3000
3. Check browser network tab for actual requests
4. Look for any firewall or proxy issues

