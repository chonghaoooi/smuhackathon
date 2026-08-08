@echo off
cd /d %~dp0
set "NODE_EXE=C:\Users\amarn\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  echo Node runtime not found at "%NODE_EXE%".
  pause
  exit /b 1
)
"%NODE_EXE%" scripts\reseed-players.mjs
pause
