# 🚀 VERCEL DEPLOYMENT GUIDE

## Environment Variables for Vercel

Add these environment variables in your Vercel Dashboard:

### Required Environment Variables

```env
# Production Environment
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://dtcgzgbxhefwhqpeotrl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8

# Frontend URL (will be updated after deployment)
FRONTEND_URL=https://your-app-name.vercel.app

# Security Keys
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_this
CSRF_SECRET=your_super_secure_csrf_secret_key_here_change_this
COOKIE_SECRET=your_cookie_secret_change_in_production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dxfdgrerx
CLOUDINARY_API_KEY=981778737815535
CLOUDINARY_API_SECRET=Pg1dI_pObyemK3XXFwQuiUNgvRA

# Zoom Configuration
ZOOM_ACCOUNT_ID=Vs4M5C2RTqCGhFTSbYi4zQ
ZOOM_CLIENT_ID=E46Tv0TTSreuxqpLKGK_2A
ZOOM_CLIENT_SECRET=76pQzlr6Hcw96HPoW9xHpULHxyQBgnzd
```

### Frontend Environment Variables

For the frontend build, add these in Vercel:

```env
# Frontend Build Variables
VITE_SUPABASE_URL=https://dtcgzgbxhefwhqpeotrl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDQ3MTgsImV4cCI6MjA3NDcyMDcxOH0.n557fWuqr8-e900nNhWOfeJTzdnhSzsv5tBW2pNM4gw
VITE_API_URL=https://your-app-name.vercel.app/api
```

## Deployment Steps

1. **Push to GitHub** - All changes are ready
2. **Go to Vercel Dashboard** - https://vercel.com
3. **Import Repository** - Connect your GitHub repo
4. **Configure Build Settings:**
   - Framework Preset: **Other**
   - Build Command: `npm run vercel-build`
   - Output Directory: `frontend/build`
   - Install Command: `npm install && cd frontend && npm install && cd ../backend && npm install`

5. **Add Environment Variables** - Copy all variables above
6. **Deploy!**

## After Deployment

1. **Update Supabase Settings:**
   - Go to Supabase Dashboard
   - Authentication > URL Configuration
   - Add your Vercel URL to Site URL and Redirect URLs

2. **Update Frontend URL:**
   - In Vercel Dashboard, update `FRONTEND_URL` with your actual Vercel URL
   - Update `VITE_API_URL` with your actual Vercel URL

## Testing

After deployment, test these endpoints:
- `https://your-app.vercel.app/api/health` - Health check
- `https://your-app.vercel.app/api/auth/login` - Authentication
- `https://your-app.vercel.app` - Frontend

## Troubleshooting

If you encounter issues:
1. Check Vercel function logs
2. Verify all environment variables are set
3. Check Supabase CORS settings
4. Test API endpoints individually