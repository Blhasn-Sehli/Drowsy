import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

/**
 * Hook for managing alarm sound playback
 * Handles loading, playing, stopping, and cleanup of alarm audio
 */
export function useAlarmSound(shouldPlay: boolean = false) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const manageSound = async () => {
      try {
        if (shouldPlay && !isPlayingRef.current) {
          // Stop and unload any existing sound
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }

          // Load and play the alarm sound
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sounds/alarm.mp3'),
            { 
              shouldPlay: true, 
              isLooping: true,
              volume: 1.0 
            }
          );
          soundRef.current = sound;
          isPlayingRef.current = true;
          console.log('[ALARM] Sound started playing');
        } else if (!shouldPlay && isPlayingRef.current) {
          // Stop the sound if it's playing
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
          isPlayingRef.current = false;
          console.log('[ALARM] Sound stopped');
        }
      } catch (error) {
        console.error('[ALARM] Error managing sound:', error);
      }
    };

    manageSound();

    // Cleanup on unmount
    return () => {
      const cleanup = async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch (error) {
          console.error('[ALARM] Cleanup error:', error);
        }
      };
      cleanup();
    };
  }, [shouldPlay]);

  const stop = async () => {
    try {
      if (soundRef.current && isPlayingRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        isPlayingRef.current = false;
        console.log('[ALARM] Sound manually stopped');
      }
    } catch (error) {
      console.error('[ALARM] Error stopping sound:', error);
    }
  };

  return {
    stop,
    isPlaying: isPlayingRef.current,
  };
}
