@echo off
cd /d "%~dp0"
echo Deploying Genesis Idle...
call npx --yes wrangler@latest deploy
echo.
pause
