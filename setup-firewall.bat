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
    netsh advfirewall firewall delete rule name="Django Dev Server" >nul 2>&1
    netsh advfirewall firewall add rule name="Django Dev Server" dir=in action=allow protocol=TCP localport=8000
    echo.
    echo Adding inbound firewall rule for Port 8081 - Expo Metro...
    netsh advfirewall firewall delete rule name="Expo Metro Bundler" >nul 2>&1
    netsh advfirewall firewall add rule name="Expo Metro Bundler" dir=in action=allow protocol=TCP localport=8081
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
