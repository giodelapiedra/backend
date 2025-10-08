# Update Backend Port to 5001

## Files to Update:

1. **WorkerDashboard.tsx**
```typescript
// Change these lines:
${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}
// To:
${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}
```

2. **imageUtils.ts**
```typescript
// Change:
const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
// To:
const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';
```

3. **api.ts**
```typescript
// Change:
baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
// To:
baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
```

4. **TeamLeaderMonitoring.tsx**
```typescript
// Change:
${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}
// To:
${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}
```

5. **CaseManagerDashboard.tsx**
```typescript
// Change both instances:
'http://localhost:5000/api'
// To:
'http://localhost:5001/api'
```

6. **MonthlyPerformanceSection.tsx**
```typescript
// Change:
${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}
// To:
${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}
```

## Better Solution: Use Environment Variable

Create `.env.local` in frontend folder:
```bash
REACT_APP_API_BASE_URL=http://localhost:5001
REACT_APP_API_URL=http://localhost:5001/api
```

This way you only need to change the port in one place!
