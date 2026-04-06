@echo off
setlocal

echo ================================================
echo  Career-Ops India Scan ^— Task Scheduler Setup
echo ================================================
echo.

:: Check Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found in PATH. Install Node.js 18+ first.
    pause
    exit /b 1
)
for /f "tokens=1" %%v in ('node --version') do set NODE_VER=%%v
echo Node.js version: %NODE_VER%

set TASK_NAME=CareerOpsIndiaScan
set SCRIPT_PATH=C:\Users\saxen\career-ops\india\scan-india.mjs

echo.
echo Creating scheduled task: %TASK_NAME%
echo Script: %SCRIPT_PATH%
echo Schedule: Every 2 hours
echo.

schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "node \"%SCRIPT_PATH%\"" ^
  /sc hourly ^
  /mo 2 ^
  /rl HIGHEST ^
  /f

if %errorlevel% == 0 (
    echo.
    echo SUCCESS: Task created.
    echo.
    echo Useful commands:
    echo   Run now:  schtasks /run /tn "%TASK_NAME%"
    echo   Status:   schtasks /query /tn "%TASK_NAME%"
    echo   Delete:   schtasks /delete /tn "%TASK_NAME%" /f
    echo.
    echo Logs: career-ops\logs\india-scan.log
) else (
    echo.
    echo FAILED: Could not create task.
    echo Make sure you right-clicked and chose "Run as administrator".
)

echo.
pause
endlocal
