import { useState, useEffect } from 'react';
import {
  subscribeToAlerts,
  subscribeToEmotions,
  subscribeToStats,
  getLatestAlert,
  getLatestEmotion,
  AlertData,
  EmotionData,
  StatsData,
} from '@/services/firebase';

/**
 * Hook to subscribe to Firebase alerts in real-time
 */
export function useFirebaseAlerts() {
  const [alerts, setAlerts] = useState<Record<string, AlertData>>({});
  const [latestAlert, setLatestAlert] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts(
      (data) => {
        setAlerts(data);
        setLatestAlert(getLatestAlert(data));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { alerts, latestAlert, loading, error };
}

/**
 * Hook to subscribe to Firebase emotions in real-time
 */
export function useFirebaseEmotions() {
  const [emotions, setEmotions] = useState<Record<string, EmotionData>>({});
  const [latestEmotion, setLatestEmotion] = useState<EmotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToEmotions(
      (data) => {
        setEmotions(data);
        setLatestEmotion(getLatestEmotion(data));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { emotions, latestEmotion, loading, error };
}

/**
 * Hook to subscribe to Firebase statistics in real-time
 */
export function useFirebaseStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToStats(
      (data) => {
        setStats(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { stats, loading, error };
}

/**
 * Combined hook for all Firebase data
 */
export function useFirebaseData() {
  const { latestAlert, loading: alertsLoading, error: alertsError } = useFirebaseAlerts();
  const { latestEmotion, loading: emotionsLoading, error: emotionsError } = useFirebaseEmotions();
  const { stats, loading: statsLoading, error: statsError } = useFirebaseStats();

  return {
    latestAlert,
    latestEmotion,
    stats,
    loading: alertsLoading || emotionsLoading || statsLoading,
    error: alertsError || emotionsError || statsError,
  };
}
