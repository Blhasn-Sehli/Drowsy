"""
Emotion Detection Module
Detects emotions from faces using DeepFace (runs in thread)
Shared across continuous_detector.py and main_combined.py
"""
import time
from deepface import DeepFace


# Emotion detection interval (analyze every 10 seconds)
EMOTION_INTERVAL = 10.0


class EmotionDetector:
    """Detects emotions from faces using DeepFace (runs in thread)"""
    
    def __init__(self, enabled=True):
        self.current_emotion = None
        self.emotion_scores = {'happy': 0, 'sad': 0, 'neutral': 0}
        self.last_analysis_time = 0
        self.is_analyzing = False
        self.enabled = enabled
    
    def analyze_frame(self, frame):
        """Analyze frame for emotions (runs in thread)"""
        if not self.enabled:
            return
        
        try:
            self.is_analyzing = True
            result = DeepFace.analyze(frame, actions=['emotion'], 
                                     enforce_detection=False, silent=True)
            
            if isinstance(result, list) and len(result) > 0:
                result = result[0]
                
                # Get all emotions from DeepFace
                all_emotions = result['emotion']
                
                # Map to our 3 emotions
                self.emotion_scores['happy'] = all_emotions.get('happy', 0)
                self.emotion_scores['sad'] = all_emotions.get('sad', 0)
                self.emotion_scores['neutral'] = (
                    all_emotions.get('neutral', 0) + 
                    all_emotions.get('surprise', 0)
                ) / 2
                
                # Get dominant emotion from our 3
                self.current_emotion = max(self.emotion_scores, key=self.emotion_scores.get)
                
                print(f"✅ Emotion: {self.current_emotion.upper()} ({self.emotion_scores[self.current_emotion]:.1f}%)")
                print(f"   Happy: {self.emotion_scores['happy']:.1f}% | Sad: {self.emotion_scores['sad']:.1f}% | Neutral: {self.emotion_scores['neutral']:.1f}%")
            
        except Exception as e:
            print(f"⚠️  Emotion detection error: {e}")
        
        finally:
            self.is_analyzing = False
            self.last_analysis_time = time.time()
    
    def should_analyze(self):
        """Check if it's time to analyze"""
        if not self.enabled:
            return False
        return (time.time() - self.last_analysis_time) >= EMOTION_INTERVAL and not self.is_analyzing
    
    def get_time_until_next(self):
        """Get time until next analysis"""
        elapsed = time.time() - self.last_analysis_time
        return max(0, EMOTION_INTERVAL - elapsed)
