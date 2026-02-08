#!/bin/bash
# ============================================================
#  Drowsy F+B Backend - Run Server (macOS / Linux)
# ============================================================

echo ""
echo "============================================================"
echo "   Starting Drowsy F+B Backend Server..."
echo "============================================================"
echo ""

# Check if venv exists
if [ ! -f "./venv/bin/python" ]; then
    echo "ERROR: Virtual environment not found!"
    echo "Please run: bash setup.sh"
    exit 1
fi

# Check if firebaseKey.json exists
if [ ! -f "firebaseKey.json" ]; then
    echo "WARNING: firebaseKey.json not found!"
    echo "Firebase features will not work."
    echo "Make sure firebaseKey.json is in the Back folder."
    echo ""
fi

echo "   Server will start at: http://localhost:8000"
echo "   API docs at:          http://localhost:8000/docs"
echo "   Press Ctrl+C to stop"
echo ""
echo "============================================================"
echo ""

./venv/bin/python main.py
