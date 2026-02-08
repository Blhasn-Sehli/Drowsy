import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Animated, Dimensions } from 'react-native';

interface DriverAvatarProps {
  isDrowsy: boolean;
  emotion?: string;
  isSleepy?: boolean;
  eyesClosedDuration?: number;
  size?: number;
}

export function DriverAvatar({
  isDrowsy,
  emotion = 'neutral',
  isSleepy = false,
  eyesClosedDuration = 0,
  size = 200,
}: DriverAvatarProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [eyeBlinkAnim] = useState(new Animated.Value(0));
  const [ring1Rotate] = useState(new Animated.Value(0));
  const [ring2Rotate] = useState(new Animated.Value(0));

  // Determine avatar state
  const avatarState = useMemo(() => {
    if (isSleepy || eyesClosedDuration >= 6) {
      return 'sleeping';
    } else if (isDrowsy && eyesClosedDuration >= 4) {
      return 'very_drowsy';
    } else if (isDrowsy) {
      return 'drowsy';
    } else {
      return 'alert';
    }
  }, [isDrowsy, isSleepy, eyesClosedDuration]);

  // Get color based on state
  const stateColor = useMemo(() => {
    switch (avatarState) {
      case 'sleeping':
        return '#FF4444';
      case 'very_drowsy':
        return '#ff8c00';
      case 'drowsy':
        return '#FFAA00';
      case 'alert':
        return '#FF6B35';
      default:
        return '#FF6B35';
    }
  }, [avatarState]);

  const statusLabel = useMemo(() => {
    switch (avatarState) {
      case 'sleeping':
        return '😴 CRITICAL';
      case 'very_drowsy':
        return '😪 VERY DROWSY';
      case 'drowsy':
        return '🥱 DROWSY';
      case 'alert':
        return '👁️ ALERT';
      default:
        return 'UNKNOWN';
    }
  }, [avatarState]);

  const emotionEmoji = useMemo(() => {
    switch (emotion?.toLowerCase()) {
      case 'happy':
        return '😊';
      case 'sad':
        return '😞';
      default:
        return '😐';
    }
  }, [emotion]);

  // Animate rings (rotating circles)
  useEffect(() => {
    if (avatarState === 'alert' || avatarState === 'drowsy') {
      const ring1Animation = Animated.loop(
        Animated.timing(ring1Rotate, {
          toValue: 360,
          duration: 8000,
          useNativeDriver: true,
        })
      );

      const ring2Animation = Animated.loop(
        Animated.timing(ring2Rotate, {
          toValue: -360,
          duration: 12000,
          useNativeDriver: true,
        })
      );

      ring1Animation.start();
      ring2Animation.start();

      return () => {
        ring1Animation.stop();
        ring2Animation.stop();
      };
    }
  }, [avatarState, ring1Rotate, ring2Rotate]);

  // Animate pulse and blink
  useEffect(() => {
    if (avatarState === 'sleeping' || avatarState === 'very_drowsy') {
      const pulseAnimation = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]);

      const loop = Animated.loop(pulseAnimation);
      loop.start();

      return () => loop.stop();
    } else if (avatarState === 'alert') {
      // Blink 2 times when returning to alert state
      const singleBlink = Animated.sequence([
        Animated.timing(eyeBlinkAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(eyeBlinkAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]);

      const blinkSequence = Animated.sequence([
        singleBlink,
        Animated.delay(300),
        singleBlink,
      ]);

      blinkSequence.start();

      return () => blinkSequence.stop();
    }
  }, [avatarState, pulseAnim, eyeBlinkAnim]);

  const ring1Spin = ring1Rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const ring2Spin = ring2Rotate.interpolate({
    inputRange: [-360, 0],
    outputRange: ['-360deg', '0deg'],
  });

  const eyeScaleY = eyeBlinkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.1],
  });

  const isClosed = avatarState === 'sleeping' || avatarState === 'very_drowsy';

  return (
    <View style={[styles.container, { width: size + 80, height: size + 120 }]}>
      {/* Decorative rotating rings */}
      <View
        style={[
          styles.ringsContainer,
          { width: size + 60, height: size + 60 },
        ]}
      >
        <Animated.View
          style={[
            styles.ring,
            {
              width: size + 80,
              height: size + 80,
              borderColor: stateColor,
              opacity: 0.2,
              transform: [{ rotate: ring1Spin }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              width: size + 40,
              height: size + 40,
              borderColor: stateColor,
              opacity: 0.1,
              transform: [{ rotate: ring2Spin }],
            },
          ]}
        />
      </View>

      {/* Avatar Background Circle */}
      <Animated.View
        style={[
          styles.avatarCircle,
          {
            width: size,
            height: size,
            borderColor: stateColor,
            backgroundColor: `${stateColor}15`,
            shadowColor: stateColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Face Content */}
        <View style={styles.faceContent}>
          {/* Eyes Container */}
          <View style={styles.eyesContainer}>
            <Animated.View
              style={[
                styles.eye,
                {
                  width: size * 0.2,
                  height: size * 0.2,
                  borderColor: stateColor,
                  backgroundColor: isClosed ? stateColor : 'white',
                  transform: isClosed ? [] : [{ scaleY: eyeScaleY }],
                },
              ]}
            >
              {!isClosed && (
                <View
                  style={[
                    styles.pupil,
                    {
                      width: size * 0.08,
                      height: size * 0.08,
                      backgroundColor: stateColor,
                    },
                  ]}
                />
              )}
            </Animated.View>
            <View style={{ width: size * 0.2 }} />
            <Animated.View
              style={[
                styles.eye,
                {
                  width: size * 0.2,
                  height: size * 0.2,
                  borderColor: stateColor,
                  backgroundColor: isClosed ? stateColor : 'white',
                  transform: isClosed ? [] : [{ scaleY: eyeScaleY }],
                },
              ]}
            >
              {!isClosed && (
                <View
                  style={[
                    styles.pupil,
                    {
                      width: size * 0.08,
                      height: size * 0.08,
                      backgroundColor: stateColor,
                    },
                  ]}
                />
              )}
            </Animated.View>
          </View>

          {/* Mouth */}
          <View style={{ marginTop: size * 0.15 }}>
            <View
              style={[
                emotion === 'happy' ? styles.smileMouth : styles.mouthLine,
                {
                  width:
                    emotion === 'happy' ? size * 0.25 : size * 0.2,
                  height: size * 0.1,
                  borderBottomColor: stateColor,
                  borderBottomWidth: emotion === 'happy' ? 2 : 1.5,
                },
              ]}
            />
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: stateColor, width: size * 0.9 },
          ]}
        >
          <Text style={[styles.statusText, { fontSize: size * 0.08 }]}>
            {statusLabel}
          </Text>
        </View>

        {/* Sweat drops */}
        {(avatarState === 'drowsy' || avatarState === 'very_drowsy') && (
          <>
            <Animated.View
              style={[
                styles.sweatDrop,
                {
                  width: size * 0.1,
                  height: size * 0.1,
                  backgroundColor: stateColor,
                  top: size * 0.1,
                  right: size * 0.08,
                  opacity: 0.8,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.sweatDrop,
                {
                  width: size * 0.07,
                  height: size * 0.07,
                  backgroundColor: stateColor,
                  top: size * 0.22,
                  right: size * 0.02,
                  opacity: 0.6,
                },
              ]}
            />
          </>
        )}
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringsContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 9999,
  },
  avatarCircle: {
    borderRadius: 9999,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  faceContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  eyesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  eye: {
    borderRadius: 9999,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pupil: {
    borderRadius: 9999,
  },
  mouthLine: {
    borderBottomWidth: 2,
    borderRadius: 2,
  },
  smileMouth: {
    borderBottomWidth: 2.5,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emotionLabel: {
    color: '#CCCCCC',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  durationText: {
    color: '#999999',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  sweatDrop: {
    position: 'absolute',
    borderRadius: 9999,
  },
});
