"""
Firebase Service for Drowsiness Detection
Sends detection data, alerts, and statistics to Firebase Realtime Database
"""
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime
import json
from typing import Dict, Optional


class FirebaseService:
    """Handle all Firebase operations for drowsiness detection"""
    
    def __init__(self, credentials_path: str = "firebaseKey.json", database_url: str = None):
        """
        Initialize Firebase connection
        
        Args:
            credentials_path: Path to Firebase service account JSON file
            database_url: Firebase Realtime Database URL (optional)
        """
        self.initialized = False
        
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                cred = credentials.Certificate(credentials_path)
                
                # Initialize with or without database URL
                if database_url:
                    firebase_admin.initialize_app(cred, {
                        'databaseURL': database_url
                    })
                else:
                    firebase_admin.initialize_app(cred)
                
                print("✅ Firebase initialized successfully")
            else:
                print("ℹ️  Firebase already initialized")
            
            self.initialized = True
            
        except Exception as e:
            print(f"❌ Firebase initialization error: {e}")
            self.initialized = False
    
    def send_detection_data(self, detection_result: Dict, user_id: str = "default_user") -> bool:
        """
        Send detection result to Firebase
        
        Args:
            detection_result: Detection data (EAR, MAR, alerts, etc.)
            user_id: User identifier
            
        Returns:
            True if successful, False otherwise
        """
        if not self.initialized:
            print("⚠️  Firebase not initialized, skipping data send")
            return False
        
        try:
            # Create reference to user's detections
            ref = db.reference(f'users/{user_id}/detections')
            
            # Add timestamp if not present
            if 'timestamp' not in detection_result:
                detection_result['timestamp'] = datetime.now().isoformat()
            
            # Push new detection data
            new_ref = ref.push(detection_result)
            print(f"🔥 Detection data sent to Firebase → users/{user_id}/detections/{new_ref.key}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error sending detection data: {e}")
            return False
    
    def send_alert(self, alert_type: str, alert_data: Dict, user_id: str = "default_user") -> bool:
        """
        Send alert to Firebase (drowsiness or yawning alert)
        
        Args:
            alert_type: 'drowsiness' or 'yawning'
            alert_data: Alert details
            user_id: User identifier
            
        Returns:
            True if successful, False otherwise
        """
        if not self.initialized:
            print("⚠️  Firebase not initialized, skipping alert send")
            return False
        
        try:
            # Create reference to user's alerts
            ref = db.reference(f'users/{user_id}/alerts')
            
            # Add alert type and timestamp to the data
            alert_data['type'] = alert_type
            if 'timestamp' not in alert_data:
                alert_data['timestamp'] = datetime.now().isoformat()
            
            # Push alert directly (flat structure)
            new_ref = ref.push(alert_data)
            
            print(f"🔔 Alert sent to Firebase: {alert_type} → users/{user_id}/alerts/{new_ref.key}")
            return True
            
        except Exception as e:
            print(f"❌ Error sending alert: {e}")
            return False
    
    def update_statistics(self, stats: Dict, user_id: str = "default_user") -> bool:
        """
        Update user statistics in Firebase
        
        Args:
            stats: Statistics data (total detections, alerts, etc.)
            user_id: User identifier
            
        Returns:
            True if successful, False otherwise
        """
        if not self.initialized:
            print("⚠️  Firebase not initialized, skipping stats update")
            return False
        
        try:
            # Add last updated timestamp
            stats['last_updated'] = datetime.now().isoformat()
            
            # Update stats in Realtime Database
            ref = db.reference(f'users/{user_id}/stats')
            ref.set(stats)
            print(f"📊 Statistics updated in Firebase → users/{user_id}/stats")
            
            return True
            
        except Exception as e:
            print(f"❌ Error updating statistics: {e}")
            return False
    
    def send_session_data(self, session_data: Dict, user_id: str = "default_user") -> Optional[str]:
        """
        Create a new session in Firebase Realtime Database
        
        Args:
            session_data: Session information (start time, device, etc.)
            user_id: User identifier
            
        Returns:
            Session ID if successful, None otherwise
        """
        if not self.initialized:
            print("⚠️  Firebase not initialized, skipping session creation")
            return None
        
        try:
            # Add timestamp
            session_data['created_at'] = datetime.now().isoformat()
            session_data['active'] = True
            
            # Add new session to Realtime Database
            ref = db.reference(f'users/{user_id}/sessions')
            new_session_ref = ref.push(session_data)
            session_id = new_session_ref.key
            
            print(f"📊 New session created: {session_id} → users/{user_id}/sessions/{session_id}")
            return session_id
            
        except Exception as e:
            print(f"❌ Error creating session: {e}")
            return None
    
    def end_session(self, session_id: str, user_id: str = "default_user") -> bool:
        """
        Mark a session as ended
        
        Args:
            session_id: Session identifier
            user_id: User identifier
            
        Returns:
            True if successful, False otherwise
        """
        if not self.initialized:
            return False
        
        try:
            ref = db.reference(f'users/{user_id}/sessions/{session_id}')
            ref.update({
                'active': False,
                'ended_at': datetime.now().isoformat()
            })
            
            print(f"📊 Session ended: {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error ending session: {e}")
            return False
    
    def get_user_stats(self, user_id: str = "default_user") -> Optional[Dict]:
        """
        Retrieve user statistics from Firebase Realtime Database
        
        Args:
            user_id: User identifier
            
        Returns:
            Statistics dictionary or None
        """
        if not self.initialized:
            return None
        
        try:
            ref = db.reference(f'users/{user_id}/stats')
            stats = ref.get()
            return stats
            
        except Exception as e:
            print(f"❌ Error retrieving stats: {e}")
            return None
