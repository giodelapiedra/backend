# Netlify Deployment Guide para sa Full-Stack Project

## Setup Instructions

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
cd frontend
npm install

# Install Netlify functions dependencies
cd ../netlify/functions
npm install
```

### 3. Environment Variables
Create a `.env` file sa root directory with your environment variables:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Frontend URL
FRONTEND_URL=https://your-netlify-site.netlify.app

# Other environment variables from backend/env.supabase
```

### 4. Deploy to Netlify

#### Option A: Using Netlify CLI
```bash
# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

#### Option B: Using Netlify Dashboard
1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Connect your GitHub repository
4. Set build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/build`
   - Functions directory: `netlify/functions`

### 5. Configure Environment Variables sa Netlify Dashboard
1. Go to Site settings > Environment variables
2. Add all your environment variables from `.env` file

## Project Structure
```
project/
├── frontend/           # React frontend
├── backend/            # Express backend (for reference)
├── netlify/
│   └── functions/
│       ├── api.js      # Netlify function wrapper
│       └── package.json
├── netlify.toml        # Netlify configuration
└── package.json        # Root package.json
```

## Important Notes

1. **API Routes**: Lahat ng API calls magiging `/api/*` routes
2. **CORS**: Already configured para sa Netlify domain
3. **Environment Variables**: Kailangan i-configure sa Netlify dashboard
4. **Database**: Make sure your Supabase project is accessible from Netlify

## Testing Locally
```bash
# Install Netlify CLI first
npm install -g netlify-cli

# Run local development server
netlify dev
```

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Check FRONTEND_URL environment variable
2. **Database Connection**: Verify Supabase credentials
3. **Build Failures**: Check Node.js version (should be 18+)

### Build Commands:
```bash
# Manual build
npm run build:netlify

# Test locally
netlify dev
```
