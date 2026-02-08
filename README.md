# Drowsy — Drowsiness & Emotion Detection App

Real-time drowsiness and emotion detection system using a phone camera, a FastAPI backend, and a React Native (Expo) mobile app with Firebase integration.

---

## 🔧 Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Python** | 3.11.x | https://www.python.org/downloads/release/python-3119/ (check "Add to PATH") |
| **Node.js** | 18+ | https://nodejs.org/ |
| **Expo Go** | Latest | Install on your phone from App Store / Google Play |
| **DroidCam** | Latest | App on phone + PC client from https://www.dev47apps.com/ |

> Your **phone** and **PC** must be connected to the **same WiFi network**.

---

## 📋 Step-by-Step Setup

### 1. Clone the repo

```bash
git clone https://github.com/Blhasn-Sehli/Drowsy.git
cd Drowsy
```

---

### 2. Find your PC's local IP address

You'll need this IP for both the backend camera and the frontend API connection.

**Windows:**
```
ipconfig
```
Look for **Wireless LAN adapter WiFi → IPv4 Address** (e.g. `192.168.1.XX`)

**macOS / Linux:**
```
ifconfig | grep "inet "
```

> **Write down your IP**, you'll use it in steps 4 and 5 below.

---

### 3. Setup Firebase credentials

#### Backend (Back/)

You need a `firebaseKey.json` file in the `Back/` folder. Ask the project owner to send it to you, or create your own:

1. Go to [Firebase Console](https://console.firebase.google.com/) → Project Settings → Service Accounts
2. Click **"Generate new private key"**
3. Save the file as `Back/firebaseKey.json`

A template is provided at `Back/firebaseKey.example.json` for reference.

#### Frontend (front/)

Create a file `front/.env` with your Firebase config:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> Ask the project owner for the real values, or get them from Firebase Console → Project Settings → General → Your apps.

---

### 4. Configure the camera source (Backend)

Edit `Back/config.py` and set your **phone's DroidCam IP**:

```python
CAMERA_INDEX: str = "http://YOUR_PHONE_IP:4747/video"
```

Example: if DroidCam shows `192.168.1.50`, set:
```python
CAMERA_INDEX: str = "http://192.168.1.50:4747/video"
```

Or use `"0"` to use your PC's built-in webcam.

---

### 5. ⚠️ Configure the API URL (Frontend) — IMPORTANT

Edit `front/services/api.ts` and change the IP to **your PC's IP** (from step 2):

```typescript
const API_BASE_URL = 'http://YOUR_PC_IP:8000';
```

Example: if your PC's IP is `192.168.1.25`:
```typescript
const API_BASE_URL = 'http://192.168.1.25:8000';
```

> This is the most common issue! The app won't connect if this IP doesn't match your PC.

---

### 6. Start the Backend

```bash
cd Back
```

**Windows:** Double-click `setup.bat` (first time only), then `run.bat`

**Or manually:**
```bash
python -m venv venv
source venv/Scripts/activate    # Windows
# source venv/bin/activate      # macOS/Linux
pip install -r requirements.txt
python main.py
```

You should see:
```
✅ Server: http://0.0.0.0:8000
✅ Continuous detection started
```

Test it: open `http://localhost:8000/health` in your browser.

---

### 7. Start the Frontend

```bash
cd front
npm install
npm start
```

Then scan the QR code with **Expo Go** on your phone.

---

## 🔍 Quick Checklist

- [ ] Python 3.11 installed
- [ ] Node.js 18+ installed
- [ ] Phone and PC on the **same WiFi**
- [ ] `Back/firebaseKey.json` exists with real credentials
- [ ] `front/.env` exists with Firebase config
- [ ] `Back/config.py` → camera IP matches your phone's DroidCam IP
- [ ] `front/services/api.ts` → API URL matches your **PC's WiFi IP**
- [ ] Backend running (`python main.py`)
- [ ] Frontend running (`npm start`)

---

## ❌ Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend can't connect to backend | Make sure the IP in `front/services/api.ts` matches your PC's WiFi IP (`ipconfig`) |
| Camera not working | Check `Back/config.py` — DroidCam IP must be correct, and phone + PC on same WiFi |
| Firebase errors | Make sure `Back/firebaseKey.json` and `front/.env` have real credentials |
| `python` not found | Reinstall Python 3.11 with "Add to PATH" checked |
| Port 8000 in use | Kill the process using it, or change the port in `Back/main.py` |
| Expo app can't connect | Make sure your phone is on the same WiFi as your PC |

---

## 📁 Project Structure

```
Drowsy/
├── Back/                  # Python FastAPI backend
│   ├── main.py            # Server entry point
│   ├── detector.py        # Drowsiness detection (EAR/MAR)
│   ├── emotion_detector.py# Emotion detection (DeepFace)
│   ├── firebase_service.py# Firebase integration
│   ├── config.py          # Camera URL & thresholds ← EDIT THIS
│   ├── firebaseKey.json   # Firebase credentials (not in git)
│   └── requirements.txt   # Python dependencies
│
├── front/                 # React Native (Expo) app
│   ├── app/               # Screens (tabs)
│   ├── components/        # UI components
│   ├── services/
│   │   ├── api.ts         # Backend API connection ← EDIT THIS
│   │   └── firebase.ts    # Firebase realtime listener
│   ├── hooks/             # Custom React hooks
│   ├── .env               # Firebase config (not in git)
│   └── package.json
│
└── README.md              # ← You are here
```
