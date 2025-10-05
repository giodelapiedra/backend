# Vercel Deployment Guide

## Quick Deploy Commands

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Go to backend directory
cd backend

# 4. Deploy to Vercel
vercel

# 5. Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add JWT_SECRET
vercel env add CSRF_SECRET
vercel env add FRONTEND_URL

# 6. Deploy to production
vercel --prod
```

## Environment Variables Needed

Add these in Vercel Dashboard → Settings → Environment Variables:

- `SUPABASE_URL` = https://dtcgzgbxhefwhqpeotrl.supabase.co
- `SUPABASE_SERVICE_KEY` = your-service-key
- `JWT_SECRET` = your-jwt-secret
- `CSRF_SECRET` = your-csrf-secret
- `FRONTEND_URL` = your-frontend-url
- `NODE_ENV` = production

## After Deployment

Your API will be available at:
`https://your-project-name.vercel.app/api/`

Update your frontend to use this URL in production.
