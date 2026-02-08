"""
Configuration settings for Raspberry Pi 4 backend
Optimized thresholds for real-time detection
"""

class Settings:
    """Detection configuration settings"""
    
    # Camera configuration
    CAMERA_INDEX: str = "http://192.168.0.146:4747/video"  # DroidCam URL or 0 for local camera
    
    # Eye Aspect Ratio threshold (eyes closed detection)
    EAR_THRESHOLD: float = 0.25
    
    # Mouth Aspect Ratio threshold (yawning detection)
    MAR_THRESHOLD: float = 0.5  # Réduit pour meilleure détection
    
    # Alert duration (seconds before triggering alert)
    ALERT_DURATION: float = 2.0
