@echo off
title AdminSuite APK Builder
echo ========================================================
echo               AdminSuite APK Build Utility
echo ========================================================
echo.
echo Select build method:
echo   [1] Build via Expo EAS Cloud (Recommended: builds preview APK remotely)
echo   [2] Build Locally via Gradle (assembles release APK using local Android SDK)
echo.
set /p choice="Enter option (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Launching EAS Cloud APK Build...
    cd /d "%~dp0admin-suite-app"
    npx eas build --platform android --profile preview
) else if "%choice%"=="2" (
    echo.
    echo Building Local Release APK via Gradle...
    cd /d "%~dp0admin-suite-app\android"
    call gradlew.bat assembleRelease
    echo.
    echo Check output at: admin-suite-app\android\app\build\outputs\apk\release\
) else (
    echo Invalid choice.
)

echo.
pause
