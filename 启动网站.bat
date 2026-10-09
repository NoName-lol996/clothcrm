@echo off
chcp 65001 >nul
title ClothCRM
cd /d "%~dp0"
set "PATH=C:\Users\30350\.cache\codex-tools\bin;%PATH%"

netstat -an | findstr /c:":3000 " | findstr /i "LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo.
  echo   ClothCRM 已经在运行，正在帮你打开浏览器…
  start "" http://localhost:3000
  timeout /t 3 >nul
  exit /b
)

echo.
echo   ClothCRM 正在启动，请稍候…
echo.
echo   三点提醒：
echo     1. 这个黑窗口要一直开着，关掉它网站就打不开了
echo     2. 浏览器会自动打开；如果没有，就手动访问 http://localhost:3000
echo     3. 想停止网站，直接关掉这个窗口就行
echo.

start "" /min cmd /c "timeout /t 10 >nul & start http://localhost:3000"
call npm run dev
pause