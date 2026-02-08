"""
Continuous Camera Capture and Detection for Raspberry Pi 4
Runs in background thread, constantly analyzing frames
"""
import cv2
import threading
import time
from datetime import datetime
from detector import DrowsinessDetector
from emotion_detector import EmotionDetector


class ContinuousDetector:
    """
    Continuously captures from camera and runs detection
    Stores latest results that can be accessed by API endpoints
    """
    
    def __init__(self, camera_index="http://192.168.0.146:4747/video", ear_threshold=0.25, mar_threshold=0.6):
        self.camera_index = camera_index
        self.ear_threshold = ear_threshold
        self.mar_threshold = mar_threshold
        
        # Latest detection results
        self.latest_result = {
            'timestamp': None,
            'face_detected': False,
            'ear_right': 0.0,
            'ear_left': 0.0,
            'ear_avg': 0.0,
            'mar': 0.0,
            'eyes_closed': False,
            'yawning': False,
            'alert_level': 'unknown',
            'message': 'Waiting for detection...',
            'current_emotion': None,
            'emotion_scores': {'happy': 0, 'sad': 0, 'neutral': 0}
        }
        
        # State tracking
        self.is_running = False
        self.thread = None
        self.detector = None
        self.cap = None
        self.frame_count = 0
        self.fps = 0
        self.last_fps_time = time.time()
        
        # Emotion detector
        self.emotion_detector = EmotionDetector()
        
        # Latest frame (for streaming if needed)
        self.latest_frame = None
        
        # Alert callback for notifications
        self.alert_callback = None
        
        # Duration-based alert tracking (different durations for each type)
        self.DROWSINESS_DURATION_SECONDS = 2.0  # 2 secondes pour somnolence
        self.YAWNING_DURATION_SECONDS = 1.0     # 1 seconde pour bâillement (plus rapide)
        
        # Timestamps for consecutive detection
        self.drowsiness_start_time = None  # Timestamp quand yeux fermés détecté
        self.yawning_start_time = None     # Timestamp quand bâillement détecté
        
        # Track if alert was already sent
        self.drowsiness_alert_sent = False
        self.yawning_alert_sent = False
        
        print("📹 ContinuousDetector initialized")
        print(f"⏱️  Alert thresholds: Drowsiness={self.DROWSINESS_DURATION_SECONDS}s, Yawning={self.YAWNING_DURATION_SECONDS}s (real-time tracking)")
    
    def set_alert_callback(self, callback):
        """Set callback function to be called when alert is detected"""
        self.alert_callback = callback
        print("✅ Alert callback registered")
    
    def start(self):
        """Start continuous detection in background thread"""
        if self.is_running:
            print("⚠️  Already running")
            return False
        
        self.is_running = True
        self.thread = threading.Thread(target=self._detection_loop, daemon=True)
        self.thread.start()
        print("✅ Continuous detection started")
        return True
    
    def stop(self):
        """Stop continuous detection"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=2)
        
        if self.cap:
            self.cap.release()
        
        if self.detector:
            self.detector.close()
        
        print("🛑 Continuous detection stopped")
    
    def _detection_loop(self):
        """Main detection loop running in background thread"""
        try:
            # Initialize detector
            self.detector = DrowsinessDetector()
            
            # Open camera
            self.cap = cv2.VideoCapture(self.camera_index)
            if not self.cap.isOpened():
                print("❌ Cannot open camera")
                self.latest_result['message'] = "ERROR: Cannot open camera"
                self.is_running = False
                return
            
            print("✅ Camera opened successfully")
            
            # Warm up camera
            for _ in range(10):
                self.cap.read()
            
            # Main loop
            while self.is_running:
                ret, frame = self.cap.read()
                
                if not ret:
                    print("⚠️  Cannot read frame")
                    time.sleep(0.1)
                    continue
                
                # Flip frame (mirror effect)
                frame = cv2.flip(frame, 1)
                self.latest_frame = frame.copy()
                
                # Run detection
                result = self.detector.analyze_with_thresholds(
                    frame,
                    ear_threshold=self.ear_threshold,
                    mar_threshold=self.mar_threshold
                )
                
                # Update latest result
                self.latest_result = {
                    'timestamp': datetime.now().isoformat(),
                    'face_detected': result['face_detected'],
                    'ear_right': round(result['ear_right'], 3),
                    'ear_left': round(result['ear_left'], 3),
                    'ear_avg': round(result['ear_avg'], 3),
                    'mar': round(result['mar'], 3),
                    'eyes_closed': result['eyes_closed'],
                    'yawning': result['yawning'],
                    'alert_level': self._get_alert_level(result),
                    'message': self._get_message(result),
                    'current_emotion': self.emotion_detector.current_emotion,
                    'emotion_scores': self.emotion_detector.emotion_scores.copy()
                }
                
                # Emotion detection (threaded)
                if self.emotion_detector.should_analyze():
                    analysis_frame = frame.copy()
                    emotion_thread = threading.Thread(
                        target=self.emotion_detector.analyze_frame,
                        args=(analysis_frame,)
                    )
                    emotion_thread.daemon = True
                    emotion_thread.start()
                
                # Check if we need to send alert notification
                self._check_and_send_alert(result)
                
                # Calculate FPS
                self.frame_count += 1
                if time.time() - self.last_fps_time >= 1.0:
                    self.fps = self.frame_count
                    self.frame_count = 0
                    self.last_fps_time = time.time()
                
                # Small delay to not overload CPU
                time.sleep(0.03)  # ~30 FPS max
        
        except Exception as e:
            print(f"❌ Error in detection loop: {e}")
            self.latest_result['message'] = f"ERROR: {str(e)}"
        
        finally:
            if self.cap:
                self.cap.release()
            if self.detector:
                self.detector.close()
    
    def _get_alert_level(self, result):
        """Determine alert level from detection result"""
        if not result['face_detected']:
            return 'no_face'
        if result['eyes_closed']:
            return 'danger'
        if result['yawning']:
            return 'warning'
        return 'safe'
    
    def _get_message(self, result):
        """Generate message from detection result"""
        if not result['face_detected']:
            return '❌ No face detected'
        if result['eyes_closed']:
            return '⚠️ DROWSINESS DETECTED! Both eyes closed!'
        if result['yawning']:
            return '🥱 Yawning detected'
        return '✅ All good - Driver is alert'
    
    def _check_and_send_alert(self, result):
        """Check if alert should be sent and call callback (after 3 seconds continuous detection)"""
        if not self.alert_callback:
            return
        
        current_time = time.time()
        
        if not result['face_detected']:
            # Reset all timers when no face detected
            self.drowsiness_start_time = None
            self.yawning_start_time = None
            self.drowsiness_alert_sent = False
            self.yawning_alert_sent = False
            return
        
        # Check DROWSINESS (eyes closed)
        if result['eyes_closed']:
            # Start timer if not already started
            if self.drowsiness_start_time is None:
                self.drowsiness_start_time = current_time
            
            # Calculate duration
            duration = current_time - self.drowsiness_start_time
            
            # Send alert if threshold reached and not already sent
            if duration >= self.DROWSINESS_DURATION_SECONDS and not self.drowsiness_alert_sent:
                alert_data = {
                    'type': 'alert',
                    'alert_type': 'drowsiness',
                    'timestamp': datetime.now().isoformat(),
                    'ear_avg': round(result['ear_avg'], 3),
                    'mar': round(result['mar'], 3),
                    'duration': round(duration, 1),
                    'message': f"⚠️ SOMNOLENCE DÉTECTÉE! Yeux fermés pendant {round(duration, 1)}s!"
                }
                
                try:
                    self.alert_callback(alert_data)
                    self.drowsiness_alert_sent = True
                    print(f"🔔 Alert sent: drowsiness ({round(duration, 1)}s)")
                except Exception as e:
                    print(f"❌ Error calling alert callback: {e}")
        else:
            # Reset timer if eyes opened
            self.drowsiness_start_time = None
            self.drowsiness_alert_sent = False
        
        # Check YAWNING
        if result['yawning']:
            # Start timer if not already started
            if self.yawning_start_time is None:
                self.yawning_start_time = current_time
            
            # Calculate duration
            duration = current_time - self.yawning_start_time
            
            # Send alert if threshold reached and not already sent
            if duration >= self.YAWNING_DURATION_SECONDS and not self.yawning_alert_sent:
                alert_data = {
                    'type': 'alert',
                    'alert_type': 'yawning',
                    'timestamp': datetime.now().isoformat(),
                    'ear_avg': round(result['ear_avg'], 3),
                    'mar': round(result['mar'], 3),
                    'duration': round(duration, 1),
                    'message': f"🥱 BÂILLEMENT DÉTECTÉ! Bouche ouverte pendant {round(duration, 1)}s!"
                }
                
                try:
                    self.alert_callback(alert_data)
                    self.yawning_alert_sent = True
                    print(f"🔔 Alert sent: yawning ({round(duration, 1)}s)")
                except Exception as e:
                    print(f"❌ Error calling alert callback: {e}")
        else:
            # Reset timer if mouth closed
            self.yawning_start_time = None
            self.yawning_alert_sent = False
    
    def get_latest_result(self):
        """Get the latest detection result with duration info"""
        result = self.latest_result.copy()
        current_time = time.time()
        
        # Add duration info for debugging
        if self.drowsiness_start_time is not None:
            result['drowsiness_duration'] = round(current_time - self.drowsiness_start_time, 1)
            result['drowsiness_progress'] = round(min(100, (result['drowsiness_duration'] / self.DROWSINESS_DURATION_SECONDS) * 100), 1)
        else:
            result['drowsiness_duration'] = 0.0
            result['drowsiness_progress'] = 0.0
        
        if self.yawning_start_time is not None:
            result['yawning_duration'] = round(current_time - self.yawning_start_time, 1)
            result['yawning_progress'] = round(min(100, (result['yawning_duration'] / self.YAWNING_DURATION_SECONDS) * 100), 1)
        else:
            result['yawning_duration'] = 0.0
            result['yawning_progress'] = 0.0
        
        result['drowsiness_threshold'] = self.DROWSINESS_DURATION_SECONDS
        result['yawning_threshold'] = self.YAWNING_DURATION_SECONDS
        return result
    
    def get_latest_frame(self):
        """Get the latest frame (for streaming)"""
        return self.latest_frame
    
    def update_thresholds(self, ear_threshold=None, mar_threshold=None):
        """Update detection thresholds"""
        if ear_threshold is not None:
            self.ear_threshold = ear_threshold
        if mar_threshold is not None:
            self.mar_threshold = mar_threshold
        print(f"✅ Thresholds updated: EAR={self.ear_threshold}, MAR={self.mar_threshold}")
    
    def get_status(self):
        """Get detector status"""
        return {
            'is_running': self.is_running,
            'fps': self.fps,
            'camera_index': self.camera_index,
            'ear_threshold': self.ear_threshold,
            'mar_threshold': self.mar_threshold
        }
