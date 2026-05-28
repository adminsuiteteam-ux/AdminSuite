@echo off
title AdminSuite Control Panel
echo ========================================================
echo               Launching AdminSuite Ecosystem
echo ========================================================
echo.

echo [1/3] Starting Django REST Backend on http://127.0.0.1:8000/
start "AdminSuite Django Backend" cmd /k "cd /d %~dp0admin-suite-backend && .venv\Scripts\python manage.py runserver 0.0.0.0:8000"

echo.
echo [2/3] Starting Expo React Native Development Server...
start "AdminSuite Expo App" cmd /k "cd /d %~dp0admin-suite-app && npx expo start --clear"

echo.
echo [3/3] Starting Vite Web Dashboard on http://localhost:5173/
start "AdminSuite Web Dashboard" cmd /k "cd /d %~dp0admin-suite-web && npm run dev"

echo.
echo ========================================================
echo All servers have been launched in separate terminals.
echo - Close the launched terminal windows to terminate them.
echo ========================================================
echo.
pause
