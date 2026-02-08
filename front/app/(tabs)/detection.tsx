import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, Smile, Clock, RotateCw, Play, Pause } from 'lucide-react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import {
  AlertBadge,
  MetricCard,
  EmotionScore,
  StatusIndicator,
} from '@/components/detection-ui';
import { AlarmModal } from '@/components/alarm-modal';
import { DriverAvatar } from '@/components/driver-avatar';
import { useDrowsinessAlarm } from '@/hooks/use-drowsiness-alarm';
import APIService, { CombinedDetectionResponse } from '@/services/api';

export default function DetectionScreen() {
  const [detectionData, setDetectionData] = useState<CombinedDetectionResponse | null>(null);
  const [emotionData, setEmotionData] = useState<{ emotion: string | null; scores: Record<string, number> }>({ emotion: null, scores: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emotionInterval, setEmotionInterval] = useState(5000);
  const [isEmotionPolling, setIsEmotionPolling] = useState(true);
  
  // Use drowsiness alarm hook (drowsiness always polls at 1s)
  const { showAlarm, eyesClosedDuration, checkDrowsiness, dismissAlarm } = useDrowsinessAlarm(4, 1000);

  // Fetch drowsiness data (CRITICAL - always runs at 1s)
  const fetchDrowsinessData = async () => {
    try {
      setError(null);
      const data = await APIService.getCombinedDetection();
      setDetectionData(data);
      setLoading(false);
      checkDrowsiness(data.is_drowsy, data.ear);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch detection data';
      setError(errorMsg);
      setLoading(false);
    }
  };

  // Fetch emotion data (user-controlled interval)
  const fetchEmotionData = async () => {
    try {
      const data = await APIService.getCombinedDetection();
      if (data.current_emotion) {
        setEmotionData({ emotion: data.current_emotion, scores: data.emotion_scores });
      }
    } catch (err) {
      console.error('Emotion fetch error:', err);
    }
  };

  // Drowsiness polling - ALWAYS ON at 1 second (critical)
  useEffect(() => {
    fetchDrowsinessData();
    const interval = setInterval(fetchDrowsinessData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Emotion polling - user controlled interval
  useEffect(() => {
    if (!isEmotionPolling) return;
    fetchEmotionData();
    const interval = setInterval(fetchEmotionData, emotionInterval);
    return () => clearInterval(interval);
  }, [emotionInterval, isEmotionPolling]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDrowsinessData(), fetchEmotionData()]);
    setRefreshing(false);
  };

  // Format timestamp
  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString();
    } catch {
      return 'N/A';
    }
  };

  if (loading && !detectionData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centerContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <ThemedText style={styles.loadingText}>Connecting to backend...</ThemedText>
            <Text style={styles.loadingSubText}>Setting up real-time detection</Text>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <>
      <AlarmModal
        visible={showAlarm}
        onDismiss={dismissAlarm}
        eyesClosedDuration={eyesClosedDuration}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
        >
        <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBg}>
              <Eye size={22} color="#FFF" />
            </View>
            <View>
              <ThemedText type="title" style={styles.headerTitle}>Detection</ThemedText>
              <Text style={styles.headerSubtitle}>Real-time API monitoring</Text>
            </View>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDrowsinessData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real-time Detection Data */}
        {detectionData && (
          <>
            {/* Driver Avatar */}
            <View style={styles.avatarSection}>
              <DriverAvatar
                isDrowsy={detectionData.is_drowsy}
                emotion={detectionData.current_emotion || 'neutral'}
                isSleepy={eyesClosedDuration >= 6}
                eyesClosedDuration={eyesClosedDuration}
                size={220}
              />
            </View>

            {/* Alert Badge */}
            <AlertBadge 
              level={detectionData.alert_level || 'safe'} 
              message={detectionData.message} 
            />

            {/* Status Badges */}
            <StatusIndicator
              isDrowsy={detectionData.is_drowsy}
              isYawning={detectionData.is_yawning}
              emotion={detectionData.current_emotion || undefined}
            />

            {/* Real-time Metrics */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Eye size={20} color="#FF6B35" />
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Real-Time Metrics
                </ThemedText>
              </View>

              <MetricCard
                label="Eye Aspect Ratio (EAR)"
                value={detectionData.ear.toFixed(3)}
                color={detectionData.is_drowsy ? '#FF4444' : '#44AA44'}
              />

              <MetricCard
                label="Mouth Aspect Ratio (MAR)"
                value={detectionData.mar.toFixed(3)}
                color={detectionData.is_yawning ? '#FFAA00' : '#44AA44'}
              />

              <View style={styles.thresholdInfo}>
                <ThemedText style={styles.smallText}>
                  💡 Drowsiness when EAR &lt; 0.25 | Yawning when MAR &gt; 0.6
                </ThemedText>
              </View>
            </View>

            {/* Emotion Section */}
            {emotionData.emotion && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Smile size={20} color="#8B5CF6" />
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Current Emotion
                  </ThemedText>
                </View>

                <View style={styles.emotionHeader}>
                  <ThemedText style={styles.emotionTitle}>
                    Detected: <Text style={styles.emotionHighlight}>{emotionData.emotion}</Text>
                  </ThemedText>
                </View>
                <View style={styles.emotionScoresContainer}>
                  {Object.entries(emotionData.scores).map(([emotion, score]) => (
                    <EmotionScore
                      key={emotion}
                      emotion={emotion}
                      score={score as number}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Timestamp & Emotion Polling Controls */}
            <View style={styles.section}>
              <View style={styles.timestampRow}>
                <Clock size={16} color="#999" />
                <ThemedText style={styles.smallText}>
                  Last Update: {formatTime(detectionData.timestamp)}
                </ThemedText>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>💡 Drowsiness updates every 1s (always on)</Text>
              </View>
              
              {/* Emotion Polling Controls */}
              <ThemedText type="subtitle" style={styles.emotionPollingTitle}>
                😊 Emotion Polling
              </ThemedText>
              <View style={styles.pollingControl}>
                <TouchableOpacity
                  style={[styles.controlButton, isEmotionPolling && styles.controlButtonActive]}
                  onPress={() => setIsEmotionPolling(!isEmotionPolling)}
                >
                  {isEmotionPolling ? (
                    <Pause size={18} color="#FFF" />
                  ) : (
                    <Play size={18} color="#FFF" />
                  )}
                  <Text style={styles.controlButtonText}>
                    {isEmotionPolling ? 'Stop' : 'Start'} Emotions
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={fetchEmotionData}>
                  <RotateCw size={18} color="#FFF" />
                  <Text style={styles.controlButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {/* Emotion Interval Selector */}
              <ThemedText style={styles.intervalLabel}>Emotion Polling Interval:</ThemedText>
              <View style={styles.intervalButtons}>
                {[2000, 5000, 7000, 10000].map((interval) => (
                  <TouchableOpacity
                    key={interval}
                    style={[
                      styles.intervalButton,
                      emotionInterval === interval && styles.intervalButtonActive,
                    ]}
                    onPress={() => setEmotionInterval(interval)}
                  >
                    <Text
                      style={[
                        styles.intervalButtonText,
                        emotionInterval === interval && styles.intervalButtonTextActive,
                      ]}
                    >
                      {interval / 1000}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ThemedView>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '600',
  },
  loadingSubText: {
    marginTop: 6,
    fontSize: 13,
    color: '#999',
  },

  // Header - matches stats
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#44AA44',
  },
  liveBadgeText: {
    color: '#44AA44',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Error
  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorText: {
    color: '#C62828',
    flex: 1,
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },

  // Avatar
  avatarSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
  },

  // Sections
  section: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionTitle: {
    marginBottom: 0,
    fontSize: 18,
  },
  smallText: {
    fontSize: 12,
    color: '#999',
  },
  thresholdInfo: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    marginTop: 10,
  },

  // Emotion
  emotionHeader: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  emotionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emotionHighlight: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  emotionScoresContainer: {
    paddingHorizontal: 0,
  },

  // Timestamp & controls
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoBoxText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  emotionPollingTitle: {
    marginBottom: 12,
  },
  pollingControl: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  controlButtonActive: {
    backgroundColor: '#44AA44',
    shadowColor: '#44AA44',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  intervalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: '#999',
  },
  intervalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  intervalButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  intervalButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  intervalButtonTextActive: {
    color: '#FFFFFF',
  },
});
