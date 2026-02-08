/**
 * Firebase Configuration and Service
 * Connects to Firebase Realtime Database to retrieve drowsiness alerts and emotions
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, DataSnapshot } from 'firebase/database';

// Firebase configuration — values loaded from environment variables
// Create a .env file in the front/ directory with EXPO_PUBLIC_FIREBASE_* keys
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Types
export interface AlertData {
  type: 'drowsiness' | 'yawning';
  alert_level: 'danger' | 'warning';
  ear: number;
  mar: number;
  message: string;
  timestamp: string;
  duration: number;
}

export interface EmotionData {
  emotion: string;
  emotion_scores: {
    happy: number;
    sad: number;
    neutral: number;
  };
  timestamp: string;
}

export interface StatsData {
  total_detections: number;
  drowsy_alerts: number;
  yawn_alerts: number;
  last_detection: string;
  last_updated: string;
}

/**
 * Subscribe to alerts in real-time
 */
export function subscribeToAlerts(
  callback: (alerts: Record<string, AlertData>) => void,
  onError?: (error: Error) => void
) {
  const alertsRef = ref(database, 'users/default_user/alerts');
  
  const unsubscribe = onValue(
    alertsRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      callback(data || {});
    },
    (error) => {
      console.error('Firebase alerts error:', error);
      if (onError) onError(error);
    }
  );
  
  // Return cleanup function
  return () => off(alertsRef);
}

/**
 * Subscribe to emotions in real-time
 */
export function subscribeToEmotions(
  callback: (emotions: Record<string, EmotionData>) => void,
  onError?: (error: Error) => void
) {
  const emotionsRef = ref(database, 'users/default_user/emotions');
  
  const unsubscribe = onValue(
    emotionsRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      callback(data || {});
    },
    (error) => {
      console.error('Firebase emotions error:', error);
      if (onError) onError(error);
    }
  );
  
  // Return cleanup function
  return () => off(emotionsRef);
}

/**
 * Subscribe to statistics in real-time
 */
export function subscribeToStats(
  callback: (stats: StatsData | null) => void,
  onError?: (error: Error) => void
) {
  const statsRef = ref(database, 'users/default_user/stats');
  
  const unsubscribe = onValue(
    statsRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      callback(data);
    },
    (error) => {
      console.error('Firebase stats error:', error);
      if (onError) onError(error);
    }
  );
  
  // Return cleanup function
  return () => off(statsRef);
}

/**
 * Get the latest alert
 */
export function getLatestAlert(alerts: Record<string, AlertData>): AlertData | null {
  if (!alerts || Object.keys(alerts).length === 0) return null;
  
  const alertsList = Object.entries(alerts).map(([id, data]) => ({
    id,
    ...data,
  }));
  
  // Sort by timestamp descending
  alertsList.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return alertsList[0] || null;
}

/**
 * Get the latest emotion
 */
export function getLatestEmotion(emotions: Record<string, EmotionData>): EmotionData | null {
  if (!emotions || Object.keys(emotions).length === 0) return null;
  
  const emotionsList = Object.entries(emotions).map(([id, data]) => ({
    id,
    ...data,
  }));
  
  // Sort by timestamp descending
  emotionsList.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return emotionsList[0] || null;
}

export { database };
