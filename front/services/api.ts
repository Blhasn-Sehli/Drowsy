/**
 * API Service for Drowsiness and Emotion Detection
 * Communicates with FastAPI backend
 */

const API_BASE_URL = 'http://192.168.0.195:8000'; // Backend at 192.168.0.195

export interface DetectionResult {
  timestamp: string;
  ear: number;
  mar: number;
  is_drowsy: boolean;
  is_yawning: boolean;
  alert_level: 'safe' | 'warning' | 'danger';
  message: string;
}

export interface EmotionResponse {
  timestamp: string;
  current_emotion: string | null;
  emotion_scores: Record<string, number>;
  is_analyzing: boolean;
  time_until_next: number;
}

export interface CombinedDetectionResponse extends DetectionResult {
  current_emotion: string | null;
  emotion_scores: Record<string, number>;
}

export interface StatsResponse {
  uptime_seconds: number;
  total_detections: number;
  drowsy_alerts: number;
  yawn_alerts: number;
  last_detection: string | null;
  current_ear_threshold: number;
  current_mar_threshold: number;
}

export interface HealthResponse {
  status: string;
  uptime_seconds: number;
  message: string;
}

class APIService {
  private baseUrl: string;
  private retryCount: number = 3;
  private retryDelay: number = 1000; // ms

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the API base URL (useful for configuration)
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * Generic fetch wrapper with retry logic
   */
  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt: number = 1
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`[API] Attempt ${attempt}/3 - Fetching: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[API] Success: ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`[API] Attempt ${attempt} failed:`, error);
      
      if (attempt < this.retryCount) {
        console.log(`[API] Retrying in ${this.retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.fetchWithRetry<T>(endpoint, options, attempt + 1);
      }
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[API] All ${this.retryCount} attempts failed for ${endpoint}`);
      console.error('[API] Configuration:', {
        baseUrl: this.baseUrl,
        endpoint,
        error: errorMsg,
        hint: 'Ensure backend is running on http://0.0.0.0:8000'
      });
      throw error;
    }
  }

  /**
   * GET /health - Check backend health
   */
  async getHealth(): Promise<HealthResponse> {
    return this.fetchWithRetry<HealthResponse>('/health');
  }

  /**
   * GET /detect/current - Get current detection from live camera
   */
  async getCurrentDetection(): Promise<DetectionResult> {
    return this.fetchWithRetry<DetectionResult>('/detect/current');
  }

  /**
   * GET /emotions/current - Get current emotion detection
   */
  async getCurrentEmotion(): Promise<EmotionResponse> {
    return this.fetchWithRetry<EmotionResponse>('/emotions/current');
  }

  /**
   * GET /detect/combined - Get combined drowsiness + emotion detection
   */
  async getCombinedDetection(): Promise<CombinedDetectionResponse> {
    return this.fetchWithRetry<CombinedDetectionResponse>('/detect/combined');
  }

  /**
   * GET /stats - Get detection statistics
   */
  async getStats(): Promise<StatsResponse> {
    return this.fetchWithRetry<StatsResponse>('/stats');
  }

  /**
   * POST /detect/frame - Send an image for detection
   */
  async detectFrame(imageUri: string): Promise<DetectionResult> {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // For React Native/Expo, we need to use the proper format
    formData.append('file', {
      uri: imageUri,
      type,
      name: filename,
    } as any);

    try {
      const response = await fetch(`${this.baseUrl}/detect/frame`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST /settings - Update detection thresholds
   */
  async updateSettings(settings: {
    ear_threshold?: number;
    mar_threshold?: number;
    alert_duration?: number;
  }): Promise<any> {
    return this.fetchWithRetry('/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Setup polling for continuous detection updates
   */
  setupDetectionPolling(
    callback: (data: CombinedDetectionResponse) => void,
    interval: number = 1000
  ): number {
    const poll = async () => {
      try {
        const data = await this.getCombinedDetection();
        callback(data);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Call immediately
    poll();

    // Then set interval
    return setInterval(poll, interval);
  }
}

export default new APIService();
