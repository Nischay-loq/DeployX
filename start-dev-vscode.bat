@echo off
setlocal

echo Starting PrintHub Application...
echo.
echo This script will start both frontend and backend servers
echo Frontend: http://localhost:5173
echo Backend: http://localhost:8000
echo.
echo Press any key to stop both servers when done.
echo.

REM === Check for package.json in root ===
if not exist "frontend\package.json" (
    echo Error: package.json not found. Please run this script from the PrintHub root directory.
    pause
    exit /b 1
)

@REM REM === Check for package.json in server directory ===
@REM if not exist "server\package.json" (
@REM     echo Error: server\package.json not found. Please ensure the server directory exists.
@REM     pause
@REM     exit /b 1
@REM )

REM === Start backend and capture PID ===
echo Starting backend server...
powershell -Command "Start-Process cmd -ArgumentList '/c cd /d backend && python start_server.py' -WindowStyle Hidden -PassThru | ForEach-Object { $_.Id }" > tmp_backend.pid

REM === Wait briefly before starting frontend ===
timeout /t 3 >nul

REM === Start frontend and capture PID ===
echo Starting frontend server...
powershell -Command "Start-Process cmd -ArgumentList '/c cd /d frontend && npm run dev' -WindowStyle Hidden -PassThru | ForEach-Object { $_.Id }" > tmp_frontend.pid

REM === Open frontend in browser ===
timeout /t 5 >nul
start "" http://localhost:5173

REM === Read PIDs ===
set /p BACKEND_PID=<tmp_backend.pid
set /p FRONTEND_PID=<tmp_frontend.pid
del tmp_backend.pid
del tmp_frontend.pid

echo.
echo Both servers are starting...
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:8000
echo.
echo Press any key to stop both servers...
pause >nul

REM === Kill both processes ===
echo Terminating servers...
taskkill /PID %FRONTEND_PID% /T /F >nul 2>&1
taskkill /PID %BACKEND_PID% /T /F >nul 2>&1

echo Servers terminated.
endlocal
pause