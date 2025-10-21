@echo off
echo ========================================
echo  Creating Sample Users for Testing
echo ========================================
echo.
echo This will create sample users for all roles:
echo - Team Leaders (2)
echo - Workers (2)
echo - Clinicians (2)
echo - Case Manager (1)
echo - Site Supervisor (1)
echo.
echo Make sure:
echo 1. Backend is running (http://localhost:5000)
echo 2. Frontend is running (http://localhost:3000)
echo 3. You are logged in as admin
echo.
pause
echo.
echo Running script...
node create-sample-users.js
echo.
echo.
echo ========================================
echo  DONE!
echo ========================================
echo.
echo You can now test the different dashboards:
echo.
echo TEAM LEADER DASHBOARD:
echo   Email: teamleader1@rehab.com
echo   Password: TeamLeader123!@#
echo   URL: http://localhost:3000/team-leader
echo.
echo WORKER DASHBOARD:
echo   Email: worker1@rehab.com
echo   Password: Worker123!@#$
echo   URL: http://localhost:3000/worker
echo.
echo CLINICIAN DASHBOARD:
echo   Email: clinician1@rehab.com
echo   Password: Clinician123!@#
echo   URL: http://localhost:3000/clinician
echo.
pause

