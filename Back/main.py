"""
FastAPI Backend for Raspberry Pi 4 - Drowsiness Detection
Optimized for RPi4 hardware with minimal overhead
Architecture A: Continuous camera detection
"""
from fastapi import FastAPI, HTTPException, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import time
import cv2
import numpy as np
from datetime import datetime
import asyncio

from config import Settings
from models import HealthResponse, DetectionResult, StatsResponse, SettingsUpdate, EmotionResponse, CombinedDetectionResponse
from detector import DrowsinessDetector
from continuous_detector import ContinuousDetector
from firebase_service import FirebaseService
from firebase_admin import db

# Initialize FastAPI app
app = FastAPI(
    title="RPi4 Drowsiness Detection API",
    description="Lightweight drowsiness detection backend for Raspberry Pi 4 with continuous camera",
    version="1.0.0"
)

# Enable CORS for mobile/web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 WebSocket client connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"🔌 WebSocket client disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        if not self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"❌ Error sending to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

# Global settings and stats
settings = Settings()
stats = {
    "start_time": time.time(),
    "total_detections": 0,
    "drowsy_alerts": 0,
    "yawn_alerts": 0,
    "last_detection": None,
    "last_emotion": None
}

# Initialize CONTINUOUS detector with camera (ARCHITECTURE A)
# Use DroidCam or local camera (0)
continuous_detector = ContinuousDetector(
    camera_index=settings.CAMERA_INDEX,
    ear_threshold=settings.EAR_THRESHOLD,
    mar_threshold=settings.MAR_THRESHOLD
)

# Notification callback for WebSocket broadcasting
def on_alert_detected(alert_data: dict):
    """Called by continuous_detector when alert detected"""
    # Create async task to broadcast (since this is called from sync thread)
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.broadcast(alert_data))
    except:
        # If no event loop, create one
        asyncio.run(manager.broadcast(alert_data))
    
    # Get correct alert type from the data
    alert_type = alert_data.get("alert_type", "unknown")
    
    # Determine alert level based on type
    if alert_type == "drowsiness":
        alert_level = "danger"
    elif alert_type == "yawning":
        alert_level = "warning"
    else:
        alert_level = "unknown"
    
    # Clean alert data for Firebase
    clean_alert_data = {
        "ear": float(alert_data.get("ear_avg", 0)),
        "mar": float(alert_data.get("mar", 0)),
        "alert_level": alert_level,
        "message": str(alert_data.get("message", "")),
        "timestamp": str(alert_data.get("timestamp", "")),
        "duration": float(alert_data.get("duration", 0))
    }
    
    firebase.send_alert(alert_type, clean_alert_data)
    
    # Update stats in Firebase
    firebase.update_statistics({
        "total_detections": int(stats["total_detections"]),
        "drowsy_alerts": int(stats["drowsy_alerts"]),
        "yawn_alerts": int(stats["yawn_alerts"]),
        "last_detection": str(stats["last_detection"]) if stats["last_detection"] else None
    })

# Set callback for continuous detector
continuous_detector.set_alert_callback(on_alert_detected)
print("🚀 Continuous detector initialized - will use Raspberry Pi camera")

# Also keep single-frame detector for manual image uploads
detector = DrowsinessDetector()

# Initialize Firebase service with Realtime Database
firebase = FirebaseService(
    credentials_path="firebaseKey.json",
    database_url="https://drowsy-c3d7d-default-rtdb.firebaseio.com"
)


@app.on_event("startup")
async def startup_event():
    """Start continuous detection when server starts"""
    continuous_detector.start()
    print("✅ Continuous camera detection started!")
    print("🔥 Firebase: Sending only ALERTS and EMOTIONS (not all detections)")


# ============================================================================
# ENDPOINT 1: Health Check
# ============================================================================
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Check if the backend is running properly
    Returns system status and uptime
    """
    uptime_seconds = time.time() - stats["start_time"]
    
    return HealthResponse(
        status="healthy",
        uptime_seconds=round(uptime_seconds, 2),
        message="Backend is running smoothly on Raspberry Pi 4"
    )


# ============================================================================
# ENDPOINT: Firebase Test & Status
# ============================================================================
@app.get("/firebase/status")
async def firebase_status():
    """
    Check Firebase connection status
    """
    return {
        "firebase_initialized": firebase.initialized,
        "database_url": "https://drowsy-c3d7d-default-rtdb.firebaseio.com",
        "session_id": stats.get("session_id"),
        "message": "✅ Firebase connected and ready" if firebase.initialized else "❌ Firebase not initialized"
    }


@app.get("/firebase/test")
async def test_firebase():
    """
    Test Firebase by sending sample alert and emotion
    Check Firebase Console to verify data arrival
    """
    if not firebase.initialized:
        return {
            "status": "error",
            "message": "❌ Firebase is not initialized. Check firebaseKey.json and database URL",
            "firebase_connected": False
        }
    
    try:
        # Test 1: Send test drowsiness alert
        test_alert_data = {
            "ear": 0.15,
            "mar": 0.35,
            "alert_level": "danger",
            "message": "Test drowsiness alert - Eyes closed!",
            "timestamp": datetime.now().isoformat(),
            "duration": 2.5
        }
        
        firebase.send_alert("drowsiness", test_alert_data, user_id="default_user")
        
        # Test 2: Send test yawning alert
        test_yawn_data = {
            "ear": 0.25,
            "mar": 0.75,
            "alert_level": "warning",
            "message": "Test yawning alert - Mouth open!",
            "timestamp": datetime.now().isoformat(),
            "duration": 1.2
        }
        
        firebase.send_alert("yawning", test_yawn_data, user_id="default_user")
        
        # Test 3: Send test emotion (directly to users/default_user/emotions)
        test_emotion_data = {
            "emotion": "happy",
            "emotion_scores": {"happy": 85.5, "sad": 10.2, "neutral": 4.3},
            "timestamp": datetime.now().isoformat()
        }
        
        ref = db.reference('users/default_user/emotions')
        ref.push(test_emotion_data)
        
        # Test 4: Update statistics
        firebase.update_statistics({
            "total_detections": 100,
            "drowsy_alerts": 5,
            "yawn_alerts": 3,
            "last_detection": datetime.now().isoformat()
        })
        
        return {
            "status": "success",
            "message": "✅ Test data sent to Firebase successfully!",
            "firebase_connected": True,
            "sent": {
                "drowsiness_alert": test_alert_data,
                "yawning_alert": test_yawn_data,
                "emotion": test_emotion_data
            },
            "check_firebase": "Firebase Console → Realtime Database → users/default_user/"
        }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Firebase test error: {str(e)}",
            "firebase_connected": firebase.initialized
        }


# ============================================================================
# ENDPOINT 2A: Get Current Detection (from continuous camera)
# ============================================================================
@app.get("/detect/current", response_model=DetectionResult)
async def get_current_detection():
    """
    Get the CURRENT detection result from the Raspberry Pi's camera
    No need to upload image - uses live camera feed!
    
    This is the MAIN endpoint for Architecture A
    """
    result = continuous_detector.get_latest_result()
    
    # Update stats
    stats["total_detections"] += 1
    stats["last_detection"] = result['timestamp']
    
    if result['eyes_closed']:
        stats["drowsy_alerts"] += 1
    if result['yawning']:
        stats["yawn_alerts"] += 1
    
    return DetectionResult(
        timestamp=result['timestamp'],
        ear=result['ear_avg'],
        mar=result['mar'],
        is_drowsy=result['eyes_closed'],
        is_yawning=result['yawning'],
        alert_level=result['alert_level'],
        message=result['message']
    )


# ============================================================================
# ENDPOINT 2B: Detect from Uploaded Frame (optional - for external images)
# ============================================================================
@app.post("/detect/frame", response_model=DetectionResult)
async def detect_frame(file: UploadFile = File(...)):
    """
    Upload a video frame and get drowsiness detection results
    Accepts: JPG, PNG image
    Returns: Detection results with EAR, MAR, and alert status
    
    NOTE: This is for EXTERNAL images. Use /detect/current for live camera!
    """
    try:
        # Read uploaded image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # REAL DETECTION using MediaPipe
        detection_result = detector.analyze_with_thresholds(
            frame, 
            ear_threshold=settings.EAR_THRESHOLD,
            mar_threshold=settings.MAR_THRESHOLD
        )
        
        # Check if face was detected
        if not detection_result['face_detected']:
            raise HTTPException(status_code=400, detail="No face detected in image")
        
        # Update stats
        stats["total_detections"] += 1
        stats["last_detection"] = datetime.now().isoformat()
        
        # Extract values
        ear_value = round(detection_result['ear_avg'], 3)
        mar_value = round(detection_result['mar'], 3)
        is_drowsy = detection_result['eyes_closed']
        is_yawning = detection_result['yawning']
        
        # Update alert counters
        if is_drowsy:
            stats["drowsy_alerts"] += 1
        if is_yawning:
            stats["yawn_alerts"] += 1
        
        # Determine alert level and message
        if is_drowsy:
            alert_level = "danger"
            message = "⚠️ DROWSINESS DETECTED! Both eyes closed!"
        elif is_yawning:
            alert_level = "warning"
            message = "🥱 Yawning detected"
        else:
            alert_level = "safe"
            message = "✅ All good - Driver is alert"
        
        return DetectionResult(
            timestamp=datetime.now().isoformat(),
            ear=ear_value,
            mar=mar_value,
            is_drowsy=is_drowsy,
            is_yawning=is_yawning,
            alert_level=alert_level,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


# ============================================================================
# ENDPOINT 3: Get Statistics
# ============================================================================
@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """
    Get detection statistics and system info
    Returns counts of detections, alerts, and uptime
    """
    uptime_seconds = time.time() - stats["start_time"]
    
    return StatsResponse(
        uptime_seconds=round(uptime_seconds, 2),
        total_detections=stats["total_detections"],
        drowsy_alerts=stats["drowsy_alerts"],
        yawn_alerts=stats["yawn_alerts"],
        last_detection=stats["last_detection"],
        current_ear_threshold=settings.EAR_THRESHOLD,
        current_mar_threshold=settings.MAR_THRESHOLD
    )


# ============================================================================
# ENDPOINT 3B: Get Emotion Detection Results
# ============================================================================
@app.get("/emotions/current", response_model=EmotionResponse)
async def get_current_emotion():
    """
    Get the CURRENT emotion detection result from the Raspberry Pi's camera
    Emotions are analyzed every 20 seconds in background
    
    Returns the latest emotion detection:
    - current_emotion: The dominant emotion (happy, sad, neutral)
    - emotion_scores: Scores for each emotion (0-100)
    - is_analyzing: Whether analysis is currently running
    - time_until_next: Seconds until next analysis
    """
    emotion_detector = continuous_detector.emotion_detector
    
    return EmotionResponse(
        timestamp=continuous_detector.latest_result['timestamp'],
        current_emotion=emotion_detector.current_emotion,
        emotion_scores=emotion_detector.emotion_scores.copy(),
        is_analyzing=emotion_detector.is_analyzing,
        time_until_next=round(emotion_detector.get_time_until_next(), 1)
    )


# ============================================================================
# ENDPOINT 3C: Get Combined Detection (Drowsiness + Emotion)
# ============================================================================
@app.get("/detect/combined", response_model=CombinedDetectionResponse)
async def get_combined_detection():
    """
    Get COMBINED detection result with both drowsiness and emotion
    This endpoint returns everything in one call:
    - Drowsiness metrics (EAR, MAR, eyes_closed, yawning)
    - Emotion detection (current emotion and scores)
    
    Perfect for dashboard applications that need both metrics
    """
    result = continuous_detector.get_latest_result()
    
    # Update stats
    stats["total_detections"] += 1
    stats["last_detection"] = result['timestamp']
    
    if result['eyes_closed']:
        stats["drowsy_alerts"] += 1
    if result['yawning']:
        stats["yawn_alerts"] += 1
    
    # Track emotion changes and send to Firebase
    current_emotion = result.get('current_emotion')
    if current_emotion and current_emotion != stats.get("last_emotion"):
        stats["last_emotion"] = current_emotion
        # Send to users/default_user/emotions path
        ref = db.reference('users/default_user/emotions')
        ref.push({
            "emotion": str(current_emotion),
            "emotion_scores": {k: float(v) for k, v in result['emotion_scores'].items()},
            "timestamp": str(result['timestamp'])
        })
        print(f"😊 Emotion changed: {current_emotion} → Firebase")
    
    return CombinedDetectionResponse(
        timestamp=result['timestamp'],
        ear=result['ear_avg'],
        mar=result['mar'],
        is_drowsy=result['eyes_closed'],
        is_yawning=result['yawning'],
        alert_level=result['alert_level'],
        message=result['message'],
        current_emotion=result['current_emotion'],
        emotion_scores=result['emotion_scores']
    )


# ============================================================================
# ENDPOINT 5: Update Settings
# ============================================================================
@app.post("/settings")
async def update_settings(settings_update: SettingsUpdate):
    """
    Update detection thresholds and parameters
    Allows adjusting EAR and MAR thresholds on the fly
    Updates BOTH stored settings AND continuous detector
    """
    try:
        if settings_update.ear_threshold is not None:
            if not 0.1 <= settings_update.ear_threshold <= 0.4:
                raise HTTPException(
                    status_code=400, 
                    detail="EAR threshold must be between 0.1 and 0.4"
                )
            settings.EAR_THRESHOLD = settings_update.ear_threshold
            continuous_detector.update_thresholds(ear_threshold=settings_update.ear_threshold)
        
        if settings_update.mar_threshold is not None:
            if not 0.3 <= settings_update.mar_threshold <= 1.0:
                raise HTTPException(
                    status_code=400, 
                    detail="MAR threshold must be between 0.3 and 1.0"
                )
            settings.MAR_THRESHOLD = settings_update.mar_threshold
            continuous_detector.update_thresholds(mar_threshold=settings_update.mar_threshold)
        
        if settings_update.alert_duration is not None:
            if not 0.5 <= settings_update.alert_duration <= 5.0:
                raise HTTPException(
                    status_code=400, 
                    detail="Alert duration must be between 0.5 and 5.0 seconds"
                )
            settings.ALERT_DURATION = settings_update.alert_duration
        
        return {
            "status": "success",
            "message": "Settings updated successfully (live camera updated)",
            "current_settings": {
                "ear_threshold": settings.EAR_THRESHOLD,
                "mar_threshold": settings.MAR_THRESHOLD,
                "alert_duration": settings.ALERT_DURATION
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")


# ============================================================================
# Root Endpoint
# ============================================================================
@app.get("/")
async def root():
    """Welcome message and API info"""
    detector_status = continuous_detector.get_status()
    return {
        "message": "Welcome to RPi4 Drowsiness & Emotion Detection API - Architecture A (Continuous Camera)",
        "version": "1.0.0",
        "mode": "continuous_detection",
        "camera_status": "running" if detector_status['is_running'] else "stopped",
        "fps": detector_status['fps'],
        "docs": "/docs",
        "endpoints": {
            "health": "GET /health",
            "detect_current": "GET /detect/current (MAIN - uses RPi camera)",
            "detect_combined": "GET /detect/combined (drowsiness + emotion)",
            "detect_frame": "POST /detect/frame (optional - upload external image)",
            "emotions_current": "GET /emotions/current (emotion only)",
            "stats": "GET /stats",
            "settings": "POST /settings",
            "websocket": "WS /ws/alerts (real-time notifications)"
        }
    }


# ============================================================================
# ENDPOINT 6: WebSocket for Real-Time Notifications
# ============================================================================
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time drowsiness alerts
    
    Clients connect here to receive instant notifications when:
    - Eyes closed detected (drowsiness)
    - Yawning detected
    
    Message format:
    {
        "type": "alert",
        "alert_type": "drowsiness" | "yawning",
        "timestamp": "ISO timestamp",
        "ear_avg": 0.15,
        "mar": 0.7,
        "message": "Alert message"
    }
    """
    await manager.connect(websocket)
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to drowsiness detection alerts",
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep connection alive and wait for disconnect
        while True:
            # Receive any messages from client (mostly for keepalive)
            try:
                data = await websocket.receive_text()
                # Echo back if client sends ping
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    continuous_detector.stop()
    detector.close()
    print("🛑 Server shutting down...")


if __name__ == "__main__":
    import uvicorn
    # Run on all interfaces (0.0.0.0) to be accessible from network
    print("\n" + "="*70)
    print("🚀 Starting RPi4 Drowsiness Detection API")
    print("="*70)
    print("📡 Server: http://0.0.0.0:8000")
    print("📚 Docs: http://localhost:8000/docs or http://127.0.0.1:8000/docs")
    print("="*70 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
