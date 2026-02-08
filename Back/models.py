"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    uptime_seconds: float
    message: str


class DetectionResult(BaseModel):
    """Detection result from frame analysis"""
    timestamp: str
    ear: float = Field(..., description="Eye Aspect Ratio")
    mar: float = Field(..., description="Mouth Aspect Ratio")
    is_drowsy: bool
    is_yawning: bool
    alert_level: str = Field(..., description="safe, warning, or danger")
    message: str


class EmotionResponse(BaseModel):
    """Emotion detection response model"""
    timestamp: str
    current_emotion: Optional[str] = Field(..., description="happy, sad, or neutral")
    emotion_scores: Dict[str, float] = Field(..., description="Scores for happy, sad, neutral")
    is_analyzing: bool = Field(..., description="Whether emotion analysis is in progress")
    time_until_next: float = Field(..., description="Seconds until next analysis")


class CombinedDetectionResponse(BaseModel):
    """Combined detection result with drowsiness and emotion"""
    timestamp: str
    # Drowsiness
    ear: float = Field(..., description="Eye Aspect Ratio")
    mar: float = Field(..., description="Mouth Aspect Ratio")
    is_drowsy: bool
    is_yawning: bool
    alert_level: str = Field(..., description="safe, warning, or danger")
    message: str
    # Emotion
    current_emotion: Optional[str]
    emotion_scores: Dict[str, float]


class StatsResponse(BaseModel):
    """Statistics response model"""
    uptime_seconds: float
    total_detections: int
    drowsy_alerts: int
    yawn_alerts: int
    last_detection: Optional[str]
    current_ear_threshold: float
    current_mar_threshold: float


class SettingsUpdate(BaseModel):
    """Settings update request model"""
    ear_threshold: Optional[float] = Field(None, ge=0.1, le=0.4)
    mar_threshold: Optional[float] = Field(None, ge=0.3, le=1.0)
    alert_duration: Optional[float] = Field(None, ge=0.5, le=5.0)
