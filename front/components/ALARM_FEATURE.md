# Drowsiness Alarm Feature

## Overview
The drowsiness alarm feature automatically detects when a driver's eyes have been closed for 4 consecutive seconds and displays an alarm modal to alert them.

## Components

### `AlarmModal` Component
Located in: `components/alarm-modal.tsx`

A full-screen modal that displays when drowsiness is detected. Features:
- **Pulsing animation** for visual emphasis
- **Alert icon** with animated warning
- **Duration display** showing how long eyes have been closed
- **Audio indicator** (visual representation of alarm sound)
- **Dismissal button** with "I'm Awake" message
- **Safety message** encouraging the driver to take a break
- **Teal/red color scheme** matching the app theme

### `useDrowsinessAlarm` Hook
Located in: `hooks/use-drowsiness-alarm.ts`

A reusable React hook that manages the alarm logic:
```typescript
const {
  showAlarm,           // Whether alarm should be displayed
  eyesClosedDuration,  // Duration in seconds
  checkDrowsiness,     // Function to call with detection data
  dismissAlarm,        // Function to dismiss alarm
  resetAlarm          // Function to reset all alarm state
} = useDrowsinessAlarm(4, 1000); // threshold (4s), polling interval (1000ms)
```

## Integration in Detection Screen

The alarm is integrated into `app/(tabs)/detection.tsx`:

1. **Hook initialization**: 
   ```typescript
   const { showAlarm, eyesClosedDuration, checkDrowsiness, dismissAlarm } = useDrowsinessAlarm(4, pollingInterval);
   ```

2. **Alarm checking**: In `fetchDetectionData()`, after getting detection data:
   ```typescript
   checkDrowsiness(data.is_drowsy, data.ear);
   ```

3. **Modal rendering**: Wrapped in the component return:
   ```tsx
   <AlarmModal
     visible={showAlarm}
     onDismiss={dismissAlarm}
     eyesClosedDuration={eyesClosedDuration}
   />
   ```

## How It Works

1. **Detection**: Every polling cycle (default 1000ms), the system checks if:
   - `is_drowsy` is true AND
   - EAR (Eye Aspect Ratio) is below 0.25

2. **Counting**: If eyes are closed, duration counter increments

3. **Triggering**: When eyes have been closed for 4+ seconds:
   - Modal becomes visible
   - Duration is displayed
   - Alarm triggers (visual + audio representation)

4. **Dismissal**: Driver can tap "I'm Awake" to close the alarm

5. **Reset**: Counter resets immediately when eyes open

## Configuration

To change the alarm threshold, modify the initialization in `detection.tsx`:
```typescript
// Change 4 to any number of seconds
const { ... } = useDrowsinessAlarm(4, pollingInterval);
```

## Future Enhancements

- [ ] Play actual alarm sound
- [ ] Haptic feedback on alarm trigger
- [ ] Log drowsiness events to analytics
- [ ] Adjust threshold based on driver preferences
- [ ] Multiple alert levels (warning, danger)
- [ ] Auto-dismiss after certain duration
