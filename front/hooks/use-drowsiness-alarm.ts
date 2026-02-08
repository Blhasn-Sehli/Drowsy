import { useState, useRef, useCallback } from 'react';

/**
 * Hook for managing drowsiness alarm based on eyes closed duration
 * @param thresholdSeconds - Seconds of eyes being closed before triggering alarm (default: 4)
 * @param pollingInterval - Detection polling interval in milliseconds (default: 1000)
 */
export function useDrowsinessAlarm(
  thresholdSeconds: number = 4,
  pollingInterval: number = 1000
) {
  const [showAlarm, setShowAlarm] = useState(false);
  const [eyesClosedDuration, setEyesClosedDuration] = useState(0);

  const eyesClosedCounterRef = useRef(0);
  const alarmTriggeredRef = useRef(false);

  const checkDrowsiness = useCallback(
    (isDrowsy: boolean, earValue: number) => {
      if (isDrowsy && earValue < 0.25) {
        // Eyes are closed, increment counter
        eyesClosedCounterRef.current += pollingInterval / 1000;
        const duration = Math.floor(eyesClosedCounterRef.current);

        // Trigger alarm at threshold and show only once
        if (duration >= thresholdSeconds && !alarmTriggeredRef.current) {
          setEyesClosedDuration(duration);
          setShowAlarm(true);
          alarmTriggeredRef.current = true;
          console.log(`[DROWSINESS ALARM] Eyes closed for ${duration} seconds!`);
        } else if (duration >= thresholdSeconds) {
          // Update duration while alarm is showing
          setEyesClosedDuration(duration);
        }
      } else {
        // Eyes are open, reset counter
        eyesClosedCounterRef.current = 0;
        alarmTriggeredRef.current = false;
      }
    },
    [thresholdSeconds, pollingInterval]
  );

  const dismissAlarm = useCallback(() => {
    setShowAlarm(false);
    alarmTriggeredRef.current = false;
  }, []);

  const resetAlarm = useCallback(() => {
    eyesClosedCounterRef.current = 0;
    alarmTriggeredRef.current = false;
    setShowAlarm(false);
    setEyesClosedDuration(0);
  }, []);

  return {
    showAlarm,
    eyesClosedDuration,
    checkDrowsiness,
    dismissAlarm,
    resetAlarm,
  };
}
