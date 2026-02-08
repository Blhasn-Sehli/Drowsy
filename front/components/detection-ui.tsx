import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';

interface AlertBadgeProps {
  level: 'safe' | 'warning' | 'danger';
  message: string;
}

export function AlertBadge({ level, message }: AlertBadgeProps) {
  const colors = {
    safe: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
    warning: { bg: '#fff3cd', text: '#856404', border: '#ffeeba' },
    danger: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
  };

  const color = colors[level] || colors.safe; // Fallback to 'safe' if level is invalid

  return (
    <View style={[styles.badge, { backgroundColor: color.bg, borderColor: color.border }]}>
      <Text style={[styles.badgeText, { color: color.text }]}>{message}</Text>
    </View>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}

export function MetricCard({ label, value, unit = '', color = '#FF6B35' }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
      <View style={styles.metricValueContainer}>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {unit && <Text style={styles.metricUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

interface EmotionScoreProps {
  emotion: string;
  score: number;
}

export function EmotionScore({ emotion, score }: EmotionScoreProps) {
  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      happy: '#FFAA00',
      sad: '#4169E1',
      neutral: '#999',
      angry: '#FF4444',
      surprise: '#FF6B35',
      fear: '#8B5CF6',
      disgust: '#228B22',
    };
    return colors[emotion.toLowerCase()] || '#999';
  };

  const color = getEmotionColor(emotion);
  const percentage = Math.round(score);

  return (
    <View style={styles.emotionScoreContainer}>
      <View style={styles.emotionLabelContainer}>
        <Text style={styles.emotionLabel}>{emotion}</Text>
        <Text style={styles.emotionPercentage}>{percentage}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

interface StatusIndicatorProps {
  isDrowsy: boolean;
  isYawning: boolean;
  emotion?: string;
}

export function StatusIndicator({ isDrowsy, isYawning, emotion }: StatusIndicatorProps) {
  return (
    <View style={styles.statusContainer}>
      <View style={[styles.statusBadge, { backgroundColor: isDrowsy ? '#FF4444' : '#44AA44' }]}>
        <Text style={styles.statusText}>{isDrowsy ? '😴 Drowsy' : '👁️ Alert'}</Text>
      </View>

      {isYawning && (
        <View style={[styles.statusBadge, { backgroundColor: '#FFAA00' }]}>
          <Text style={styles.statusText}>🥱 Yawning</Text>
        </View>
      )}

      {emotion && (
        <View style={[styles.statusBadge, { backgroundColor: '#8B5CF6' }]}>
          <Text style={styles.statusText}>😊 {emotion}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 10,
    marginHorizontal: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  metricCard: {
    padding: 16,
    marginVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  metricUnit: {
    fontSize: 12,
    color: '#999',
  },
  emotionScoreContainer: {
    paddingHorizontal: 4,
    marginVertical: 6,
  },
  emotionLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  emotionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: '#444',
  },
  emotionPercentage: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#444',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
    marginHorizontal: 20,
    justifyContent: 'center',
  },
  statusBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
