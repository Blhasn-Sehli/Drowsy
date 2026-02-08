#!/bin/bash
# ============================================================
#  Drowsy F+B Backend - Automatic Setup (macOS / Linux)
#  This script sets up everything you need to run the backend
# ============================================================

echo ""
echo "============================================================"
echo "   Drowsy F+B Backend - Automatic Setup"
echo "============================================================"
echo ""

# ---- Step 1: Check for Python 3.11 ----
echo "[1/5] Checking for Python 3.11..."

PYTHON_CMD=""

# Try python3.11 first
if command -v python3.11 &>/dev/null; then
    PYTHON_CMD="python3.11"
    echo "   Found python3.11"
# Try python3 and check version
elif command -v python3 &>/dev/null; then
    PY3_VERSION=$(python3 --version 2>&1 | grep -o "3\.\([0-9]*\)" | head -1)
    if [[ "$PY3_VERSION" == "3.11" ]]; then
        PYTHON_CMD="python3"
        echo "   Found Python 3.11 via python3"
    fi
fi

if [[ -z "$PYTHON_CMD" ]]; then
    echo ""
    echo "============================================================"
    echo "  ERROR: Python 3.11 is NOT installed!"
    echo "============================================================"
    echo ""
    echo "  Install Python 3.11:"
    echo ""
    echo "  macOS (Homebrew):"
    echo "    brew install python@3.11"
    echo ""
    echo "  Ubuntu/Debian:"
    echo "    sudo apt update"
    echo "    sudo apt install python3.11 python3.11-venv"
    echo ""
    echo "  Or download from:"
    echo "    https://www.python.org/downloads/release/python-3119/"
    echo ""
    echo "  After installing, run this script again."
    echo "============================================================"
    exit 1
fi

echo "   Using: $PYTHON_CMD"
$PYTHON_CMD --version

# ---- Step 2: Create virtual environment ----
echo ""
echo "[2/5] Setting up virtual environment..."

if [ -d "venv" ]; then
    echo "   Virtual environment already exists - recreating..."
    rm -rf venv
fi

$PYTHON_CMD -m venv venv
if [ $? -ne 0 ]; then
    echo "   ERROR: Failed to create virtual environment!"
    echo "   On Ubuntu/Debian, try: sudo apt install python3.11-venv"
    exit 1
fi
echo "   Virtual environment created successfully"

# ---- Step 3: Upgrade pip ----
echo ""
echo "[3/5] Upgrading pip..."
./venv/bin/python -m pip install --upgrade pip >/dev/null 2>&1
echo "   pip upgraded"

# ---- Step 4: Install requirements ----
echo ""
echo "[4/5] Installing packages (this may take 5-10 minutes)..."
echo "   Installing: FastAPI, OpenCV, MediaPipe, TensorFlow, DeepFace, Firebase..."
echo ""

./venv/bin/python -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo ""
    echo "   ERROR: Some packages failed to install!"
    echo "   Try running: ./venv/bin/python -m pip install -r requirements.txt"
    exit 1
fi

# ---- Step 5: Verify installation ----
echo ""
echo "[5/5] Verifying installation..."

./venv/bin/python -c "
import fastapi; import uvicorn; import cv2; import mediapipe
import numpy; import scipy; import tensorflow; import deepface
import firebase_admin; import pydantic; import websockets
print('   ALL PACKAGES VERIFIED SUCCESSFULLY')
"

if [ $? -ne 0 ]; then
    echo "   WARNING: Some packages may not have installed correctly"
    exit 1
fi

echo ""
echo "============================================================"
echo "   SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "   To start the backend:"
echo "     1. Run: ./run.sh"
echo "     OR"
echo "     2. Run: ./venv/bin/python main.py"
echo ""
echo "   The server will be available at:"
echo "     http://localhost:8000"
echo "     http://YOUR_IP:8000"
echo ""
echo "   API docs at: http://localhost:8000/docs"
echo "============================================================"
echo ""
