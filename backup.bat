@echo off
cd /d %~dp0
set "NODE_EXE=C:\Users\amarn\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%NODE_EXE%" scripts\backup.mjs
pause
