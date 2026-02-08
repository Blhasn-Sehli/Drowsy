@echo off
REM ============================================================
REM  Drowsy F+B Backend - Automatic Setup (Windows)
REM  This script sets up everything you need to run the backend
REM ============================================================
title Drowsy F+B Backend Setup

echo.
echo ============================================================
echo    Drowsy F+B Backend - Automatic Setup
echo ============================================================
echo.

REM ---- Step 1: Check if Python 3.11 is available ----
echo [1/5] Checking for Python 3.11...

REM Try py launcher first (most reliable on Windows)
py -3.11 --version >nul 2>&1
if %errorlevel%==0 (
    echo    Found Python 3.11 via py launcher
    set PYTHON_CMD=py -3.11
    goto :python_found
)

REM Try python3.11 command
python3.11 --version >nul 2>&1
if %errorlevel%==0 (
    echo    Found python3.11
    set PYTHON_CMD=python3.11
    goto :python_found
)

REM Try plain python and check version
python --version 2>nul | findstr "3.11" >nul 2>&1
if %errorlevel%==0 (
    echo    Found Python 3.11 via python command
    set PYTHON_CMD=python
    goto :python_found
)

REM Python 3.11 not found
echo.
echo ============================================================
echo   ERROR: Python 3.11 is NOT installed on this machine!
echo ============================================================
echo.
echo   Please install Python 3.11 from:
echo     https://www.python.org/downloads/release/python-3119/
echo.
echo   IMPORTANT during installation:
echo     [x] Check "Add Python to PATH"
echo     [x] Check "Install py launcher"
echo.
echo   After installing, run this script again.
echo ============================================================
echo.
pause
exit /b 1

:python_found
echo    Using: %PYTHON_CMD%
%PYTHON_CMD% --version

REM ---- Step 2: Create virtual environment ----
echo.
echo [2/5] Setting up virtual environment...

if exist venv (
    echo    Virtual environment already exists - recreating...
    rmdir /s /q venv
)

%PYTHON_CMD% -m venv venv
if %errorlevel% neq 0 (
    echo    ERROR: Failed to create virtual environment!
    pause
    exit /b 1
)
echo    Virtual environment created successfully

REM ---- Step 3: Upgrade pip ----
echo.
echo [3/5] Upgrading pip...
venv\Scripts\python.exe -m pip install --upgrade pip >nul 2>&1
echo    pip upgraded

REM ---- Step 4: Install requirements ----
echo.
echo [4/5] Installing packages (this may take 5-10 minutes)...
echo    Installing: FastAPI, OpenCV, MediaPipe, TensorFlow, DeepFace, Firebase...
echo.

venv\Scripts\python.exe -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo    ERROR: Some packages failed to install!
    echo    Try running: venv\Scripts\python.exe -m pip install -r requirements.txt
    pause
    exit /b 1
)

REM ---- Step 5: Verify installation ----
echo.
echo [5/5] Verifying installation...

venv\Scripts\python.exe -c "import fastapi; import uvicorn; import cv2; import mediapipe; import numpy; import scipy; import tensorflow; import deepface; import firebase_admin; import pydantic; import websockets; print('    ALL PACKAGES VERIFIED SUCCESSFULLY')"
if %errorlevel% neq 0 (
    echo    WARNING: Some packages may not have installed correctly
    echo    Check the errors above and try reinstalling
    pause
    exit /b 1
)

echo.
echo ============================================================
echo    SETUP COMPLETE!
echo ============================================================
echo.
echo    To start the backend:
echo      1. Double-click  run.bat
echo      OR
echo      2. Run:  venv\Scripts\python.exe main.py
echo.
echo    The server will be available at:
echo      http://localhost:8000
echo      http://YOUR_IP:8000
echo.
echo    API docs at: http://localhost:8000/docs
echo ============================================================
echo.
pause
