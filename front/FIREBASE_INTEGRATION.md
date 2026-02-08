# Firebase Frontend Integration Guide

## 🔥 Firebase Setup Complete!

Your React Native app can now retrieve data from Firebase Realtime Database in real-time!

---

## 📋 Step 1: Add Your Firebase Config

Open `Drowsy/services/firebase.ts` and replace with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",                    // Get from Firebase Console
  authDomain: "drowsy-c3d7d.firebaseapp.com",
  databaseURL: "https://drowsy-c3d7d-default-rtdb.firebaseio.com",
  projectId: "drowsy-c3d7d",
  storageBucket: "drowsy-c3d7d.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Where to find these values:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **drowsy-c3d7d**
3. Click ⚙️ Settings → Project settings
4. Scroll to "Your apps" → Web app
5. Copy the config values

---

## 📋 Step 2: Update Components to Use Firebase

### Option A: Use Firebase Data (Recommended)

Replace the API polling with Firebase real-time updates:

```typescript
// In detection.tsx - REPLACE this:
import { useDetection } from '@/hooks/use-detection';

// WITH this:
import { useFirebaseAlerts, useFirebaseEmotions } from '@/hooks/use-firebase';
import { useDetection } from '@/hooks/use-detection';  // Keep for EAR/MAR data

export default function DetectionScreen() {
  // Get detection metrics from API (EAR, MAR - every second)
  const { data: detectionData, loading, error } = useDetection(1000);
  
  // Get alerts from Firebase (only when drowsy/yawning detected)
  const { latestAlert } = useFirebaseAlerts();
  
  // Get emotions from Firebase (only when emotion changes)
  const { latestEmotion } = useFirebaseEmotions();

  // Use latestAlert for showing alerts
  // Use latestEmotion for displaying emotion
  // Use detectionData for real-time EAR/MAR values
```

### Option B: Hybrid Approach (Best Performance)

Use Firebase for alerts/emotions + API for real-time metrics:

```typescript
import { useFirebaseData } from '@/hooks/use-firebase';
import { useDetection } from '@/hooks/use-detection';

export default function DetectionScreen() {
  // Real-time detection metrics (EAR, MAR) from API
  const { data, loading: apiLoading } = useDetection(1000);
  
  // Alerts and emotions from Firebase
  const { latestAlert, latestEmotion, stats, loading: firebaseLoading } = useFirebaseData();

  // Show alert when Firebase receives drowsiness/yawning
  useEffect(() => {
    if (latestAlert) {
      if (latestAlert.type === 'drowsiness') {
        triggerDrowsinessAlarm(latestAlert);
      } else if (latestAlert.type === 'yawning') {
        triggerYawningAlarm(latestAlert);
      }
    }
  }, [latestAlert]);

  return (
    <View>
      {/* Display real-time EAR/MAR from API */}
      <MetricCard label="EAR" value={data?.ear} />
      
      {/* Display latest alert from Firebase */}
      {latestAlert && (
        <AlertBadge
          type={latestAlert.type}
          message={latestAlert.message}
          level={latestAlert.alert_level}
        />
      )}
      
      {/* Display emotion from Firebase */}
      {latestEmotion && (
        <EmotionScore
          emotion={latestEmotion.emotion}
          scores={latestEmotion.emotion_scores}
        />
      )}
    </View>
  );
}
```

---

## 📋 Step 3: Update Stats Screen

In `app/(tabs)/stats.tsx`:

```typescript
import { useFirebaseStats } from '@/hooks/use-firebase';

export default function StatsScreen() {
  const { stats, loading, error } = useFirebaseStats();

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <View>
      <Text>Total Detections: {stats?.total_detections}</Text>
      <Text>Drowsy Alerts: {stats?.drowsy_alerts}</Text>
      <Text>Yawn Alerts: {stats?.yawn_alerts}</Text>
      <Text>Last Detection: {stats?.last_detection}</Text>
    </View>
  );
}
```

---

## 🎯 What Data Comes from Where?

### From Firebase 🔥 (Real-time, only when changed):
- ✅ **Alerts** - When drowsiness/yawning detected (every 2 seconds minimum)
- ✅ **Emotions** - When emotion changes (happy → sad, etc.)
- ✅ **Statistics** - Total counts, alert counts

### From API 🌐 (Polling every 1 second):
- ✅ **Real-time EAR/MAR** - Eye/Mouth aspect ratios
- ✅ **Face detection** - Is face detected?
- ✅ **Current status** - safe/warning/danger

---

## 🚀 Why Use Firebase?

### Before (API Only):
- ❌ Polls every second (high traffic)
- ❌ Can miss alerts between polls
- ❌ More battery usage
- ❌ Network intensive

### After (Firebase + API):
- ✅ Instant alerts (real-time)
- ✅ Less network traffic
- ✅ Better battery life
- ✅ Never miss alerts
- ✅ Cleaner separation of concerns

---

## 📱 Example: Complete Detection Screen with Firebase

```typescript
import React, { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useDetection } from '@/hooks/use-detection';
import { useFirebaseData } from '@/hooks/use-firebase';
import { useDrowsinessAlarm } from '@/hooks/use-drowsiness-alarm';

export default function DetectionScreen() {
  // API: Real-time EAR/MAR (every second)
  const { data: detection, loading } = useDetection(1000);
  
  // Firebase: Alerts & Emotions (real-time updates)
  const { latestAlert, latestEmotion, stats } = useFirebaseData();
  
  // Alarm system
  const { showAlarm, dismissAlarm } = useDrowsinessAlarm();

  // React to new alerts from Firebase
  useEffect(() => {
    if (latestAlert) {
      if (latestAlert.type === 'drowsiness') {
        // Show drowsiness alarm
        Alert.alert(
          '⚠️ DROWSINESS DETECTED!',
          latestAlert.message,
          [{ text: 'OK', onPress: dismissAlarm }]
        );
      }
    }
  }, [latestAlert?.timestamp]); // Only trigger on new alerts

  return (
    <View>
      {/* Real-time Metrics (from API) */}
      <MetricCard label="EAR" value={detection?.ear.toFixed(3)} />
      <MetricCard label="MAR" value={detection?.mar.toFixed(3)} />
      
      {/* Latest Alert (from Firebase) */}
      {latestAlert && (
        <AlertBadge
          type={latestAlert.type}
          level={latestAlert.alert_level}
          message={latestAlert.message}
          duration={latestAlert.duration}
        />
      )}
      
      {/* Current Emotion (from Firebase) */}
      {latestEmotion && (
        <View>
          <Text>Current Emotion: {latestEmotion.emotion}</Text>
          <EmotionScores scores={latestEmotion.emotion_scores} />
        </View>
      )}
      
      {/* Statistics (from Firebase) */}
      <View>
        <Text>Total Detections: {stats?.total_detections}</Text>
        <Text>Drowsy Alerts: {stats?.drowsy_alerts}</Text>
        <Text>Yawn Alerts: {stats?.yawn_alerts}</Text>
      </View>
    </View>
  );
}
```

---

## 🧪 Testing

1. **Start your backend**: `cd Back && python main.py`
2. **Start your app**: `cd Drowsy && npm start`
3. **Close your eyes** for 2+ seconds
4. **Check**: Alert should appear instantly from Firebase!
5. **Change emotion**: Smile/frown in front of camera
6. **Check**: Emotion should update in app

---

## 🔍 Debugging

Check if Firebase is receiving data:
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Go to **Realtime Database**
3. Watch `users/default_user/alerts` - should update when drowsy/yawning
4. Watch `users/default_user/emotions` - should update when emotion changes

Check if app is receiving data:
```typescript
useEffect(() => {
  console.log('New alert from Firebase:', latestAlert);
}, [latestAlert]);

useEffect(() => {
  console.log('New emotion from Firebase:', latestEmotion);
}, [latestEmotion]);
```

---

## ✨ Benefits Summary

| Feature | API Only | Firebase + API |
|---------|----------|----------------|
| Real-time EAR/MAR | ✅ Every 1s | ✅ Every 1s |
| Instant Alerts | ❌ Delayed | ✅ Real-time |
| Battery Life | 🔴 High usage | 🟢 Low usage |
| Network Traffic | 🔴 High | 🟢 Low |
| Offline Data | ❌ No | ✅ Yes (cached) |
| Alert History | ❌ No | ✅ Yes |

Ready to use Firebase! 🔥
