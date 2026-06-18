@echo off

echo Stopping all services...
taskkill /F /IM python.exe
taskkill /F /IM node.exe
taskkill /F /IM chrome.exe

echo All services stopped!
pause