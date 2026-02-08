# Drowsy F+B - Backend (Drowsiness & Emotion Detection)

FastAPI backend with real-time drowsiness detection (EAR/MAR), emotion recognition (DeepFace), and Firebase integration.

---

## Prerequisites

**You MUST install Python 3.11 first.** Nothing else is needed — the setup script handles everything.

### Install Python 3.11

| OS | How to Install |
|---|---|
| **Windows** | Download from https://www.python.org/downloads/release/python-3119/ — **CHECK both boxes**: `Add Python to PATH` and `Install py launcher` |
| **macOS** | `brew install python@3.11` |
| **Linux** | `sudo apt update && sudo apt install python3.11 python3.11-venv` |

> After installing, verify with: `python --version` (should show 3.11.x)

---

## Quick Start (2 steps)

### Step 1: Setup (one time only)

**Windows:** Double-click `setup.bat`

**macOS / Linux:**
```bash
cd Back
chmod +x setup.sh run.sh
bash setup.sh
```

This creates a virtual environment and installs all packages (~5-10 minutes).

### Step 2: Run the server

**Windows:** Double-click `run.bat`

**macOS / Linux:**
```bash
bash run.sh
```

The server starts at **http://localhost:8000**. API docs at **http://localhost:8000/docs**.

---

## Camera Setup

The backend uses a camera feed. Edit `config.py` to set your camera source:

```python
# Option A: DroidCam (phone camera over WiFi)
CAMERA_INDEX: str = "http://YOUR_PHONE_IP:4747/video"

# Option B: Built-in/USB webcam
CAMERA_INDEX: str = "0"
```

**Using DroidCam (recommended for testing):**
1. Install DroidCam app on your phone (Google Play / App Store)
2. Install DroidCam client on your PC (https://www.dev47apps.com/)
3. Connect phone and PC to the same WiFi
4. Open app → note the IP address shown
5. Set that IP in `config.py`

---

## Firebase Setup

The `firebaseKey.json` file is already included. If you need your own:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `firebaseKey.json` in the `Back/` folder

---

## Project Files

| File | Purpose |
|---|---|
| `main.py` | FastAPI server with all endpoints |
| `detector.py` | Drowsiness detection (MediaPipe EAR/MAR) |
| `emotion_detector.py` | Emotion detection (DeepFace) |
| `continuous_detector.py` | Background camera capture + detection loop |
| `firebase_service.py` | Firebase Realtime Database operations |
| `config.py` | Camera URL and detection thresholds |
| `models.py` | Pydantic request/response models |
| `firebaseKey.json` | Firebase service account credentials |
| `requirements.txt` | Python package dependencies |
| `setup.bat` / `setup.sh` | One-click setup script |
| `run.bat` / `run.sh` | One-click run script |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check (uptime, status) |
| `GET` | `/detect/current` | Current drowsiness detection from camera |
| `GET` | `/detect/combined` | Drowsiness + emotion in one call |
| `GET` | `/emotions/current` | Current emotion only |
| `GET` | `/stats` | Detection statistics |
| `POST` | `/detect/frame` | Detect from uploaded image |
| `POST` | `/settings` | Update EAR/MAR thresholds |
| `GET` | `/firebase/status` | Firebase connection status |
| `GET` | `/firebase/test` | Send test data to Firebase |
| `WS` | `/ws/alerts` | WebSocket for real-time alerts |

### Quick Test
```bash
curl http://localhost:8000/health
curl http://localhost:8000/detect/combined
curl http://localhost:8000/firebase/status
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `python` not found | Make sure Python 3.11 is installed and added to PATH |
| `venv` creation fails (Linux) | `sudo apt install python3.11-venv` |
| Camera not working | Check `config.py` — make sure the IP is correct or use `"0"` for webcam |
| Firebase errors | Make sure `firebaseKey.json` is in the `Back/` folder |
| TensorFlow import slow | Normal — first import takes 5-10 seconds |
| Port 8000 in use | Kill the other process or change port in `main.py` |

---

## Network Access

To access from your phone/other devices on the same WiFi:

1. Find your PC's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Access: `http://YOUR_PC_IP:8000`
3. Update the frontend `api.ts` with this IP
