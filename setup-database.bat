@echo off
REM ================================
REM Database Setup Script for Windows
REM ================================

echo.
echo ================================
echo Database Setup Script
echo ================================
echo.

REM Check if PHP is available
where php >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PHP is not installed or not in PATH
    echo Please install PHP or add it to your system PATH
    pause
    exit /b 1
)

echo Running database setup...
php "%~dp0SETUP_DATABASE.php"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Setup failed!
    pause
    exit /b 1
)

echo.
echo Setup completed successfully!
pause
