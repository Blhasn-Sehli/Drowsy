@echo off
REM ============================================================
REM  Drowsy F+B Backend - Run Server (Windows)
REM ============================================================
title Drowsy F+B Backend

echo.
echo ============================================================
echo    Starting Drowsy F+B Backend Server...
echo ============================================================
echo.

REM Check if venv exists
if not exist venv\Scripts\python.exe (
    echo ERROR: Virtual environment not found!
    echo Please run setup.bat first.
    echo.
    pause
    exit /b 1
)

REM Check if firebaseKey.json exists
if not exist firebaseKey.json (
    echo WARNING: firebaseKey.json not found!
    echo Firebase features will not work.
    echo Make sure firebaseKey.json is in the Back folder.
    echo.
)

echo    Server will start at: http://localhost:8000
echo    API docs at:          http://localhost:8000/docs
echo    Press Ctrl+C to stop
echo.
echo ============================================================
echo.

venv\Scripts\python.exe main.py
pause
