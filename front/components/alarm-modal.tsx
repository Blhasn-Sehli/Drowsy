import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useAlarmSound } from '@/hooks/use-alarm-sound';
import { AlertCircle, X, Volume2 } from 'lucide-react-native';

interface AlarmModalProps {
  visible: boolean;
  onDismiss: () => void;
  eyesClosedDuration: number; // in seconds
}

export function AlarmModal({ visible, onDismiss, eyesClosedDuration }: AlarmModalProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const windowWidth = Dimensions.get('window').width;
  const { stop: stopSound } = useAlarmSound(visible);

  useEffect(() => {
    if (visible) {
      // Pulse animation
      const pulseAnimation = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);

      const loop = Animated.loop(pulseAnimation);
      loop.start();

      return () => loop.stop();
    }
  }, [visible, pulseAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Clean up sound on back press
        stopSound();
        onDismiss();
      }}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alarmContainer,
            {
              transform: [{ scale: pulseAnim }],
              width: Math.min(windowWidth - 40, 350),
            },
          ]}
        >
      <TouchableOpacity style={styles.closeButton} onPress={async () => {
        await stopSound();
        onDismiss();
      }}>
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>

          {/* Alert Icon */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <AlertCircle size={80} color="#FF4444" strokeWidth={1.5} />
          </Animated.View>

          {/* Alarm Title */}
          <Text style={styles.alarmTitle}>⚠️ DROWSINESS ALERT</Text>

          {/* Duration */}
          <Text style={styles.durationText}>
            Eyes Closed for {eyesClosedDuration} second{eyesClosedDuration > 1 ? 's' : ''}
          </Text>

          {/* Description */}
          <Text style={styles.descriptionText}>
            Wake up! Keep your eyes open and stay focused on the road.
          </Text>

          {/* Sound Indicator */}
          <View style={styles.soundIndicator}>
            <Volume2 size={16} color="#FF4444" />
            <Text style={styles.soundText}>Alarm playing...</Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={async () => {
              await stopSound();
              onDismiss();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissButtonText}>I'm Awake</Text>
          </TouchableOpacity>

          {/* Bottom Safety Message */}
          <Text style={styles.safetyText}>
            💡 Take a break if you're feeling tired. Your safety matters.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmContainer: {
    backgroundColor: '#1c1e20',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF4444',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  alarmTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF4444',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  durationText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  soundIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  soundText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  safetyText: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
