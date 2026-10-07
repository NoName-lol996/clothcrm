@echo off
title ClothCRM
cd /d "%~dp0"
set "PATH=C:\Users\30350\.cache\codex-tools\bin;%PATH%"
echo.
echo   ClothCRM is starting...
echo   Keep this window open while you use the site.
echo   Close this window to stop.
echo.
start "" /min cmd /c "timeout /t 6 >nul & start http://localhost:3000"
call npm run dev
pause