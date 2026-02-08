import { useState, useEffect, useCallback } from 'react';
import APIService, {
  CombinedDetectionResponse,
  EmotionResponse,
  DetectionResult,
  StatsResponse,
} from '@/services/api';

/**
 * Hook for managing detection data with polling
 */
export function useDetection(
  initialPollingInterval: number = 1000,
  autoStart: boolean = true
) {
  const [data, setData] = useState<CombinedDetectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(autoStart);
  const [pollingInterval, setPollingInterval] = useState(initialPollingInterval);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await APIService.getCombinedDetection();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch detection data';
      setError(message);
      console.error('Detection fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    fetchData();
    const interval = setInterval(fetchData, pollingInterval);

    return () => clearInterval(interval);
  }, [isPolling, pollingInterval, fetchData]);

  return {
    data,
    loading,
    error,
    isPolling,
    setIsPolling,
    pollingInterval,
    setPollingInterval,
    refetch: fetchData,
  };
}

/**
 * Hook for managing emotion data
 */
export function useEmotion(autoStart: boolean = true) {
  const [data, setData] = useState<EmotionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await APIService.getCurrentEmotion();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch emotion data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoStart) return;

    fetchData();
    // Emotion updates every 20 seconds
    const interval = setInterval(fetchData, 20000);

    return () => clearInterval(interval);
  }, [autoStart, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for managing statistics
 */
export function useStats(refreshInterval: number = 5000) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await APIService.getStats();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for managing detection result from frame upload
 */
export function useFrameDetection() {
  const [data, setData] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFrame = useCallback(async (imageUri: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await APIService.detectFrame(imageUri);
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect frame';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, uploadFrame };
}

/**
 * Hook for API health checking
 */
export function useHealthCheck(autoStart: boolean = true) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      setError(null);
      await APIService.getHealth();
      setIsHealthy(true);
    } catch (err) {
      setIsHealthy(false);
      const message = err instanceof Error ? err.message : 'Health check failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoStart) return;

    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, [autoStart, checkHealth]);

  return { isHealthy, loading, error, check: checkHealth };
}
