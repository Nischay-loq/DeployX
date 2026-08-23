@echo off
REM Build the DeployX agent into a single Windows executable and deploy it
REM to the backend's agent_updates/ folder (served by /api/agent/setup).
setlocal

set ROOT=%~dp0
set VENV=%ROOT%.venv\Scripts\python.exe
if not exist "%VENV%" set VENV=python

"%VENV%" -m PyInstaller --version >nul 2>&1 || "%VENV%" -m pip install pyinstaller || exit /b 1

"%VENV%" -m PyInstaller ^
  --noconfirm --clean --onefile ^
  --name DeployXAgent ^
  --distpath "%ROOT%build_agent" ^
  --workpath "%ROOT%build_agent\_work" ^
  --specpath "%ROOT%build_agent" ^
  --paths "%ROOT%" ^
  --hidden-import socketio --hidden-import engineio --hidden-import zeroconf ^
  "%ROOT%agent\main.py" || exit /b 1

if not exist "%ROOT%backend\agent_updates" mkdir "%ROOT%backend\agent_updates"
copy /y "%ROOT%build_agent\DeployXAgent.exe" "%ROOT%backend\agent_updates\DeployXAgent.exe" >nul

echo.
echo Deployed: backend\agent_updates\DeployXAgent.exe

endlocal
