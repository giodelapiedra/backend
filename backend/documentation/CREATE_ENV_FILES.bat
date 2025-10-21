@echo off
echo ========================================
echo CREATING .ENV FILES FOR YOUR PROJECT
echo ========================================
echo.

echo Creating backend/.env file...
(
echo # SUPABASE CONFIGURATION
echo SUPABASE_URL=https://owntqluhgjqavobupayt.supabase.co
echo SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
echo.
echo # SERVER CONFIGURATION
echo PORT=5000
echo NODE_ENV=development
echo.
echo # JWT CONFIGURATION
echo JWT_SECRET=2c8f4a7b9e1d6c3a5f8e0d2b4a6c8e0f1a3c5e7f9b1d3f5a7c9e1b3d5f7a9c1
echo JWT_EXPIRE=7d
echo.
echo # CSRF CONFIGURATION
echo CSRF_SECRET=5e7f9b1d3f5a7c9e1b3d5f7a9c1e3f5a7c9e1b3d5f7a9c1e3f5a7c9e1b3d5f
echo.
echo # CLOUDINARY CONFIGURATION
echo CLOUDINARY_CLOUD_NAME=dxfdgrerx
echo CLOUDINARY_API_KEY=981778737815535
echo CLOUDINARY_API_SECRET=Pg1dI_pObyemK3XXFwQuiUNgvRA
echo.
echo # ZOOM CONFIGURATION
echo ZOOM_ACCOUNT_ID=Vs4M5C2RTqCGhFTSbYi4zQ
echo ZOOM_CLIENT_ID=E46Tv0TTSreuxqpLKGK_2A
echo ZOOM_CLIENT_SECRET=76pQzlr6Hcw96HPoW9xHpULHxyQBgnzd
echo.
echo # FRONTEND URL
echo FRONTEND_URL=http://localhost:3000
) > backend\.env

echo ✅ Backend .env created!
echo.

echo Creating frontend/.env file...
(
echo # SUPABASE CONFIGURATION
echo REACT_APP_SUPABASE_URL=https://owntqluhgjqavobupayt.supabase.co
echo REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bnRxbHVoZ2pxYXZvYnVwYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzMyNjMsImV4cCI6MjA3NDkwOTI2M30.9KlyQgD4670PXKvQPCqJxOSlhU4n32JusSm3Qk17ZXU
echo.
echo # API CONFIGURATION
echo REACT_APP_API_URL=http://localhost:5000/api
) > frontend\.env

echo ✅ Frontend .env created!
echo.

echo ========================================
echo ✅ .ENV FILES CREATED!
echo ========================================
echo.
echo ⚠️ IMPORTANT: You need to update backend/.env
echo Replace: YOUR_SERVICE_ROLE_KEY_HERE
echo With: Your actual service_role key from Supabase
echo.
echo Get it from:
echo https://supabase.com/dashboard/project/owntqluhgjqavobupayt/settings/api
echo.
echo Then:
echo 1. Open backend\.env
echo 2. Find SUPABASE_SERVICE_ROLE_KEY line
echo 3. Replace YOUR_SERVICE_ROLE_KEY_HERE with your key
echo 4. Save the file
echo.
echo After that, run:
echo   cd backend
echo   node server.js
echo.
pause



