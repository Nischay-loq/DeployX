@echo off
SET ROOT_DIR=%~dp0

REM 1. Start Frontend: npm run dev
REM /B runs the process in the background of the current console (no new window).
REM /D sets the starting directory.
start "Frontend Dev Server" /B /D "%ROOT_DIR%frontend" npm run dev

REM 2. Start Backend: python start_server.py (with .venv activation)
REM CALL is needed to run the batch activation script successfully.
start "Backend API Server" /B "CALL "%ROOT_DIR%.venv\Scripts\activate.bat" && cd /d "%ROOT_DIR%backend" && python start_server.py"

TIMEOUT /T 15 /NOBREAK

REM 3. Start Agent: python -m agent.main (with .venv activation, running from root)
start "Agent Main Process" /B "CALL "%ROOT_DIR%.venv\Scripts\activate.bat" && cd /d "%ROOT_DIR%" && python -m agent.main"

ECHO.
ECHO All services launched in the background.
ECHO *** DO NOT CLOSE THIS WINDOW ***
ECHO Press any key to stop all services and close this window...
pause