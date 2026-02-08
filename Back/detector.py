"""
Drowsiness Detection Module for Raspberry Pi 4
Extracted from main_combined_raspberrypi4.py
Optimized for FastAPI backend
"""
import cv2
import mediapipe as mp
import numpy as np
from scipy.spatial import distance


# ============================================================================
# FACE MESH INDICES (from main_combined_raspberrypi4.py)
# ============================================================================

# EAR calculation points (6 key points per eye)
POINTS_EAR_DROIT = [33, 160, 159, 133, 145, 144]
POINTS_EAR_GAUCHE = [362, 385, 386, 263, 374, 373]

# MAR calculation points
POINTS_MAR = [
    78,   # Coin gauche (début)
    308,  # Coin droit
    13,   # Centre bas
    14,   # Centre haut
    82,   # Vertical gauche bas
    87,   # Vertical gauche haut
    312,  # Vertical droit bas
    317,  # Vertical droit haut
    191,  # Lèvre inférieure gauche
    80,   # Lèvre inférieure gauche
    81,   # Lèvre inférieure
    311,  # Lèvre inférieure droite
    310   # Lèvre inférieure droite
]


# ============================================================================
# HELPER FUNCTIONS (from main_combined_raspberrypi4.py)
# ============================================================================

def obtenir_points(landmarks, indices, largeur, hauteur):
    """Convert landmarks to pixel coordinates"""
    points = []
    for i in indices:
        x = int(landmarks[i].x * largeur)
        y = int(landmarks[i].y * hauteur)
        points.append([x, y])
    return np.array(points)


def calculer_ear(points):
    """Calculate Eye Aspect Ratio"""
    A = distance.euclidean(points[1], points[5])
    B = distance.euclidean(points[2], points[4])
    C = distance.euclidean(points[0], points[3])
    ear = (A + B) / (2.0 * C)
    return ear


def calculer_mar(points):
    """Calculate Mouth Aspect Ratio"""
    A = distance.euclidean(points[2], points[10])
    B = distance.euclidean(points[3], points[9])
    C = distance.euclidean(points[4], points[8])
    D = distance.euclidean(points[5], points[7])
    E = distance.euclidean(points[0], points[6])
    mar = (A + B + C + D) / (4.0 * E)
    return mar


# ============================================================================
# DROWSINESS DETECTOR CLASS
# ============================================================================

class DrowsinessDetector:
    """
    Lightweight drowsiness detector optimized for Raspberry Pi 4
    Uses MediaPipe Face Mesh for real-time detection
    """
    
    def __init__(self):
        """Initialize MediaPipe Face Mesh"""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.3,  # Lower threshold for better detection
            min_tracking_confidence=0.3    # Lower threshold for better detection
        )
        print("✅ DrowsinessDetector initialized (detection confidence: 0.3)")
    
    def detect(self, frame):
        """
        Detect drowsiness from a single frame
        
        Args:
            frame: BGR image from OpenCV
            
        Returns:
            dict with detection results:
            {
                'face_detected': bool,
                'ear_right': float,
                'ear_left': float,
                'ear_avg': float,
                'mar': float,
                'eyes_closed': bool,
                'yawning': bool
            }
        """
        result = {
            'face_detected': False,
            'ear_right': 0.0,
            'ear_left': 0.0,
            'ear_avg': 0.0,
            'mar': 0.0,
            'eyes_closed': False,
            'yawning': False
        }
        
        if frame is None:
            return result
        
        # Get frame dimensions
        hauteur, largeur, _ = frame.shape
        
        # Convert BGR to RGB for MediaPipe
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = self.face_mesh.process(rgb)
        
        if not results.multi_face_landmarks:
            return result
        
        # Get first face
        face_landmarks = results.multi_face_landmarks[0]
        landmarks = face_landmarks.landmark
        
        result['face_detected'] = True
        
        # Calculate EAR for both eyes
        pts_ear_droit = obtenir_points(landmarks, POINTS_EAR_DROIT, largeur, hauteur)
        pts_ear_gauche = obtenir_points(landmarks, POINTS_EAR_GAUCHE, largeur, hauteur)
        
        result['ear_right'] = calculer_ear(pts_ear_droit)
        result['ear_left'] = calculer_ear(pts_ear_gauche)
        result['ear_avg'] = (result['ear_right'] + result['ear_left']) / 2.0
        
        # Calculate MAR for mouth
        pts_mar = obtenir_points(landmarks, POINTS_MAR, largeur, hauteur)
        result['mar'] = calculer_mar(pts_mar)
        
        return result
    
    def analyze_with_thresholds(self, frame, ear_threshold=0.25, mar_threshold=0.6):
        """
        Detect drowsiness with custom thresholds
        
        Args:
            frame: BGR image from OpenCV
            ear_threshold: Eye Aspect Ratio threshold (default 0.25)
            mar_threshold: Mouth Aspect Ratio threshold (default 0.6)
            
        Returns:
            dict with detection results including alert status
        """
        result = self.detect(frame)
        
        if result['face_detected']:
            # Check if eyes are closed
            result['eyes_closed'] = (
                result['ear_right'] < ear_threshold and 
                result['ear_left'] < ear_threshold
            )
            
            # Check if yawning
            result['yawning'] = result['mar'] > mar_threshold
        
        return result
    
    def close(self):
        """Close MediaPipe resources"""
        if self.face_mesh:
            self.face_mesh.close()
            print("✅ DrowsinessDetector closed")
