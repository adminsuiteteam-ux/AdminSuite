@echo off
title AdminSuite Firewall Setup
echo ========================================================
echo        Configuring Windows Firewall for AdminSuite
echo ========================================================
echo.

:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with administrator privileges.
    echo.
    echo Adding inbound firewall rule for Port 8000 - Django...
    powershell -Command "New-NetFirewallRule -DisplayName 'Django Dev Server' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000 -Force"
    echo.
    echo Adding inbound firewall rule for Port 8081 - Expo Metro...
    powershell -Command "New-NetFirewallRule -DisplayName 'Expo Metro Bundler' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081 -Force"
    echo.
    echo ========================================================
    echo SUCCESS: Firewall rules configured successfully!
    echo Your phone can now connect to Django on port 8000 and Expo on port 8081.
    echo ========================================================
    echo.
    pause
) else (
    echo [INFO] Administrative privileges are required.
    echo Requesting elevation...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
)
