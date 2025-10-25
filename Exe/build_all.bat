@echo off
REM Master build script for all platforms
REM Run this on Windows to build Windows executable

echo ========================================
echo DeployX Agent Build Script
echo ========================================
echo.

echo This script will build the agent for your current platform.
echo.
echo Available platforms:
echo 1. Windows (current platform)
echo 2. Linux (requires Linux/WSL)
echo 3. macOS (requires macOS)
echo.

set /p choice="Select platform (1-3): "

if "%choice%"=="1" (
    echo.
    echo Building for Windows...
    cd build\windows
    python build_windows.py
    cd ..\..
    echo.
    echo ========================================
    echo Windows build complete!
    echo Check: build\windows\output\
    echo ========================================
) else if "%choice%"=="2" (
    echo.
    echo Building for Linux...
    echo.
    echo Please run this on Linux or WSL:
    echo   cd build/linux
    echo   chmod +x build_linux.sh
    echo   ./build_linux.sh
    echo.
) else if "%choice%"=="3" (
    echo.
    echo Building for macOS...
    echo.
    echo Please run this on macOS:
    echo   cd build/macos
    echo   chmod +x build_macos.sh
    echo   ./build_macos.sh
    echo.
) else (
    echo Invalid choice!
)

pause
