@echo off

echo MFS500 started...
start /B "MFS500 Backend" cmd /k "C:\visitor_management\bridge\venv\Scripts\python.exe C:\visitor_management\bridge\main.py"

echo Django started...
start /B "Django Backend" cmd /k "C:\visitor_management\visitor_management_backend\venv\Scripts\python.exe C:\visitor_management\visitor_management_backend\manage.py runserver 0.0.0.0:8000"

echo Node started...
start /B "Node Frontend" cmd /k "serve -s C:\visitor_management\build -l 3000"

:waitloop
:: 🚀 FIX 1: Changed https to http in curl check
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto waitloop
)

echo All services started!
timeout /t 1 /nobreak >nul

:: 🚀 FIX 2: Changed https to http for Chrome launch
start chrome --kiosk --noerrdialogs --disable-infobars http://localhost:3000
exit