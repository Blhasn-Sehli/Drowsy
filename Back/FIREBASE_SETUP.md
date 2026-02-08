# Firebase Setup Guide for Drowsiness Detection Backend

## 🔥 What's Configured

Your backend now sends the following data to Firebase Realtime Database:

### 1. **Detection Data** (Real-time)
- Eye Aspect Ratio (EAR)
- Mouth Aspect Ratio (MAR)
- Eyes closed status
- Yawning status
- Alert level
- Emotion detection
- Timestamp

### 2. **Alerts** (When detected)
- Drowsiness alerts (when eyes closed for 2+ seconds)
- Yawning alerts (when yawning detected)
- Alert timestamp and details

### 3. **Statistics**
- Total detections count
- Drowsy alerts count
- Yawn alerts count
- Last detection timestamp

### 4. **Sessions**
- Session start/end tracking
- Device information
- Camera settings

---

## 📋 Setup Steps

### Step 1: Get Your Firebase Database URL

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **drowsy-c3d7d**
3. Click **Realtime Database** in the left sidebar
4. Copy your database URL (looks like: `https://drowsy-c3d7d-default-rtdb.firebaseio.com`)

### Step 2: Update the Database URL

Open `main.py` and find this line (around line 110):

```python
firebase = FirebaseService(
    credentials_path="firebaseKey.json",
    database_url="https://drowsy-c3d7d-default-rtdb.firebaseio.com"  # ← Update this!
)
```

Replace with YOUR actual Firebase Realtime Database URL.

### Step 3: Verify firebaseKey.json

Make sure your `firebaseKey.json` file is in the `Back/` folder with your service account credentials.

### Step 4: Set Firebase Rules (Security)

In Firebase Console → Realtime Database → Rules, set:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

For testing only (NOT for production):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## 📊 Firebase Database Structure

Your data will be organized like this:

```
users/
  └── default_user/  (or user_id)
      ├── detections/
      │   ├── -N1234abc/
      │   │   ├── ear: 0.25
      │   │   ├── mar: 0.45
      │   │   ├── eyes_closed: false
      │   │   ├── yawning: false
      │   │   ├── alert_level: "safe"
      │   │   ├── emotion: "neutral"
      │   │   └── timestamp: "2026-02-07T20:30:15"
      │   └── -N1234xyz/
      │       └── ...
      │
      ├── alerts/
      │   ├── -N1235def/
      │   │   ├── type: "drowsiness"
      │   │   ├── timestamp: "2026-02-07T20:31:00"
      │   │   └── data: {...}
      │   └── ...
      │
      ├── stats/
      │   ├── total_detections: 1250
      │   ├── drowsy_alerts: 15
      │   ├── yawn_alerts: 8
      │   └── last_updated: "2026-02-07T20:35:00"
      │
      └── sessions/
          └── -N1236ghi/
              ├── device: "Raspberry Pi 4"
              ├── camera: "http://192.168.1.174:4747/video"
              ├── created_at: "2026-02-07T20:00:00"
              ├── active: true
              └── ended_at: null
```

---

## 🚀 How to Run

1. Make sure Firebase is configured (steps above)
2. Run the backend:
   ```bash
   cd "D:/ME/Drowsy F+B/Back"
   python main.py
   ```

3. Check console for:
   ```
   ✅ Firebase initialized successfully
   📊 Firebase session created: -N1234abc
   ```

---

## 🧪 Testing Firebase Integration

### Test 1: Check if Firebase is connected
Look for this message when starting the backend:
```
✅ Firebase initialized successfully
```

### Test 2: Send a detection
Make a request to: `http://localhost:8000/detect/current`

Check Firebase Console → Realtime Database to see the data appear.

### Test 3: Trigger an alert
Close your eyes in front of camera for 2+ seconds
Check Firebase → alerts section for new entry

---

## 📱 Accessing Data from Mobile App

In your React Native app, you can read this data:

```typescript
import { database } from './firebaseConfig';
import { ref, onValue } from 'firebase/database';

// Listen to real-time detections
const detectionsRef = ref(database, 'users/default_user/detections');
onValue(detectionsRef, (snapshot) => {
  const data = snapshot.val();
  console.log('Detection data:', data);
});

// Listen to alerts
const alertsRef = ref(database, 'users/default_user/alerts');
onValue(alertsRef, (snapshot) => {
  const alerts = snapshot.val();
  // Trigger notification
});
```

---

## 🔧 Customization

### Change User ID
By default, data is stored under `default_user`. To change:

In `main.py`, update the Firebase calls:
```python
firebase.send_detection_data(data, user_id="YOUR_USER_ID")
firebase.send_alert(type, data, user_id="YOUR_USER_ID")
```

### Adjust Data Frequency
Currently sends data on every detection. To reduce:

In `main.py` (around line 160), add a counter:
```python
# Only send every 10th detection
if stats["total_detections"] % 10 == 0:
    firebase.send_detection_data({...})
```

---

## ❓ Troubleshooting

**Error: Firebase not initialized**
- Check if `firebaseKey.json` exists
- Verify the file path is correct
- Check Firebase Console for service account permissions

**Error: Permission denied**
- Update Firebase Realtime Database rules
- Check service account has proper permissions

**No data appearing in Firebase**
- Check console for error messages
- Verify database URL is correct
- Check if detections are actually running

---

## 📚 More Information

- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
- [Firebase Admin SDK - Python](https://firebase.google.com/docs/admin/setup)
