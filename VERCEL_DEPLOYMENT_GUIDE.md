# Vercel Environment Variables Setup

## Required Environment Variables

Add these environment variables in your Vercel dashboard:

### For Production:
```
REACT_APP_API_BASE_URL=https://your-backend-domain.com
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### For Development (if needed):
```
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How to Add Environment Variables in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - Name: `REACT_APP_API_BASE_URL`
   - Value: `https://your-backend-domain.com` (replace with your actual backend URL)
   - Environment: Production (and Preview if needed)

5. Repeat for the other variables

## Backend Deployment

Make sure your backend is also deployed and accessible. You can deploy it to:
- Vercel (if it's a Node.js/Express app)
- Railway
- Heroku
- DigitalOcean
- AWS
- Or any other hosting service

## Testing

After setting up the environment variables:
1. Redeploy your Vercel project
2. Check the browser console for any API errors
3. Verify that the Weekly Goals & KPI section loads properly


