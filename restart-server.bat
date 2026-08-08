@echo off
cd /d %~dp0
call stop-server.bat
timeout /t 2 /nobreak >nul
call start-server.bat
