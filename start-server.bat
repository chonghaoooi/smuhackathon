@echo off
cd /d %~dp0
set "NODE_EXE=C:\Users\amarn\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "CLOUDFLARED_EXE=C:\cloudflared\cloudflared-windows-amd64.exe"
if not exist "%NODE_EXE%" (
  echo Node runtime not found at "%NODE_EXE%".
  pause
  exit /b 1
)
if not exist "%CLOUDFLARED_EXE%" (
  echo Cloudflared not found at "%CLOUDFLARED_EXE%".
  pause
  exit /b 1
)
"%SystemRoot%\System32\netsh.exe" advfirewall firewall add rule name="Cashbux Market Sim 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>nul
"%SystemRoot%\System32\netsh.exe" advfirewall firewall add rule name="Cashbux Market Sim 4000" dir=in action=allow protocol=TCP localport=4000 >nul 2>nul
start "Cashbux Server" cmd /k ""%NODE_EXE%" scripts\start-server.mjs"
timeout /t 4 /nobreak >nul
start "Cashbux Cloudflare" cmd /k ""%CLOUDFLARED_EXE%" tunnel --url http://127.0.0.1:3000 --no-autoupdate"
echo Server and Cloudflare windows started.
echo The Cloudflare window will show the public link.
echo.
echo Press any key to close this window.
pause >nul
