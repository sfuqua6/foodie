@echo off
echo ========================================
echo    Rate My Rest - Real Data Population
echo ========================================
echo.
echo This script will populate your database with real restaurant data
echo from Google Places API. Make sure you have:
echo.
echo 1. A valid Google Places API key in your .env file
echo 2. Internet connection
echo 3. Python dependencies installed
echo.
echo Press any key to continue...
pause > nul
echo.
echo Starting data population...
echo.

python populate_real_data_simple.py

echo.
echo ========================================
echo    Script Complete!
echo ========================================
echo.
echo If successful, you can now test the application with real restaurant data.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000/docs
echo.
echo Press any key to exit...
pause > nul