"""
COMBINED DROWSINESS & EMOTION DETECTOR
========================================
Integrates:
- Drowsiness detection (MediaPipe Face Mesh)
- Emotion detection (DeepFace AI)
Single camera, single window!

Versions:
- opencv-python: 4.11.0.86
- mediapipe: 0.10.21
- deepface: 0.0.95
- tensorflow: 2.20.0
- scipy: 1.16.3

Controls:
- [Q] Quit
- [M] Change mesh display mode
- [E] Toggle emotion detection on/off
"""

import cv2
import mediapipe as mp
import numpy as np
import time
import threading

# Import shared components
from detector import POINTS_EAR_DROIT, POINTS_EAR_GAUCHE, POINTS_MAR, obtenir_points, calculer_ear, calculer_mar
from emotion_detector import EmotionDetector

# ============================================================================
# CONFIGURATION
# ============================================================================

# Drowsiness parameters
SEUIL_EAR = 0.25              # Threshold for closed eyes
DUREE_ALERTE = 2.0            # Alert after 2 seconds
FPS = 24
FRAMES_ALERTE = int(DUREE_ALERTE * FPS)

# Yawn parameters
SEUIL_MAR = 0.6               # Threshold for yawning (open mouth)
DUREE_ALERTE_BAILLEMENT = 1.5 # Alert after 1.5 seconds
FRAMES_ALERTE_BAILLEMENT = int(DUREE_ALERTE_BAILLEMENT * FPS)

COOLDOWN_ALERTE = 3.0

# Emotion detection parameters
EMOTION_ENABLED = True        # Toggle emotion detection

# ============================================================================
# FACE MESH INDICES (for visualization only)
# ============================================================================

# Right eye (complete contour)
INDICES_OEIL_DROIT = [
    33, 7, 163, 144, 145, 153, 154, 155, 133,
    173, 157, 158, 159, 160, 161, 246,
    33
]

# Left eye (complete contour)
INDICES_OEIL_GAUCHE = [
    362, 382, 381, 380, 374, 373, 390, 249, 263,
    466, 388, 387, 386, 385, 384, 398,
    362
]

# Mouth contour
INDICES_BOUCHE = [
    78, 191, 80, 81, 82, 13, 312, 311, 310, 415,
    308, 324, 318, 402, 317, 14, 87, 178, 88, 95
]

# ============================================================================
# HELPER FUNCTIONS (visualization only - computation helpers imported from detector.py)
# ============================================================================


def draw_text_shadow(img, text, org, font, scale, color, thickness=2, shadow_color=(0,0,0), shadow_offset=(2,2)):
    """Draw text with shadow"""
    x, y = org
    cv2.putText(img, text, (x+shadow_offset[0], y+shadow_offset[1]), font, scale, shadow_color, thickness+1, cv2.LINE_AA)
    cv2.putText(img, text, org, font, scale, color, thickness, cv2.LINE_AA)


def draw_text_box(img, text, topleft, w, h, bg_color=(30,30,30,200), border_color=(100,100,100), alpha=0.75):
    """Draw text box with background"""
    x, y = topleft
    overlay = img.copy()
    cv2.rectangle(overlay, (x, y), (x + w, y + h), border_color, -1)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
    cv2.rectangle(img, (x+4, y+4), (x + w - 4, y + h - 4), (20,20,20), -1)


def draw_progress_bar(img, topleft, length, height, progress, bg_color=(80,80,80), fg_color=(0,165,255), border=2):
    """Draw progress bar"""
    x, y = topleft
    cv2.rectangle(img, (x, y), (x + length, y + height), bg_color, -1)
    filled = int((progress / 100.0) * (length - 2*border))
    if filled > 0:
        cv2.rectangle(img, (x + border, y + border), (x + border + filled, y + height - border), fg_color, -1)
    cv2.rectangle(img, (x, y), (x + length, y + height), (60,60,60), 1)


# ============================================================================
# MAIN APPLICATION
# ============================================================================

def main():
    print("=" * 70)
    print("🚨 COMBINED DROWSINESS & EMOTION DETECTOR 🚨")
    print("=" * 70)
    print("\n⚙️  Features:")
    print("   • Real-time drowsiness detection (eyes & yawn)")
    print("   • Emotion detection every 20 seconds")
    print("   • Complete face mesh visualization")
    print(f"\n📦 Versions:")
    print(f"   • OpenCV: 4.11.0.86")
    print(f"   • MediaPipe: 0.10.21")
    print(f"   • DeepFace: 0.0.95")
    print(f"   • TensorFlow: 2.20.0")
    print("\n📹 Controls:")
    print("   [Q] Quit")
    print("   [M] Change mesh display mode")
    print("   [E] Toggle emotion detection")
    print("=" * 70)
    print()
    
    # Initialize MediaPipe
    mp_face_mesh = mp.solutions.face_mesh
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    # Initialize camera
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture("http://192.168.1.174:4747/video")
        if not cap.isOpened():
            print("❌ Cannot open webcam")
            return
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, FPS)
    
    # Initialize emotion detector
    emotion_detector = EmotionDetector(enabled=EMOTION_ENABLED)
    
    # Drowsiness tracking variables
    compteur_fermeture = 0
    compteur_baillement = 0
    alerte_baillement_active = False
    dernier_alerte_baillement = 0
    alerte_active = False
    dernier_alerte = 0
    mode_mesh = 1  # 1=Tesselation, 2=Contours, 3=Points
    
    frame_count = 0
    
    print("✅ System ready! Starting detection...\n")
    
    # ========================================================================
    # MAIN LOOP
    # ========================================================================
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Error reading frame")
            break
        
        frame = cv2.flip(frame, 1)
        hauteur, largeur, _ = frame.shape
        
        # Convert to RGB for MediaPipe
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Detect face with MediaPipe
        results = face_mesh.process(rgb)
        
        # Variables
        ear_droit = 0
        ear_gauche = 0
        oeil_droit_ferme = False
        oeil_gauche_ferme = False
        les_deux_yeux_fermes = False
        temps_actuel = time.time()
        mar = 0
        baillement_detecte = False
        
        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                landmarks = face_landmarks.landmark
                
                # ============================================================
                # DRAW FACE MESH
                # ============================================================
                if mode_mesh == 1:
                    mp_drawing.draw_landmarks(
                        image=frame,
                        landmark_list=face_landmarks,
                        connections=mp_face_mesh.FACEMESH_TESSELATION,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_tesselation_style()
                    )
                elif mode_mesh == 2:
                    mp_drawing.draw_landmarks(
                        image=frame,
                        landmark_list=face_landmarks,
                        connections=mp_face_mesh.FACEMESH_CONTOURS,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_contours_style()
                    )
                
                # ============================================================
                # EXTRACT EYE CONTOURS
                # ============================================================
                contour_droit = obtenir_points(landmarks, INDICES_OEIL_DROIT, largeur, hauteur)
                contour_gauche = obtenir_points(landmarks, INDICES_OEIL_GAUCHE, largeur, hauteur)
                pts_ear_droit = obtenir_points(landmarks, POINTS_EAR_DROIT, largeur, hauteur)
                pts_ear_gauche = obtenir_points(landmarks, POINTS_EAR_GAUCHE, largeur, hauteur)
                
                # ============================================================
                # CALCULATE EAR
                # ============================================================
                ear_droit = calculer_ear(pts_ear_droit)
                ear_gauche = calculer_ear(pts_ear_gauche)
                oeil_droit_ferme = ear_droit < SEUIL_EAR
                oeil_gauche_ferme = ear_gauche < SEUIL_EAR
                les_deux_yeux_fermes = oeil_droit_ferme and oeil_gauche_ferme
                
                # ============================================================
                # EXTRACT MOUTH
                # ============================================================
                contour_bouche = obtenir_points(landmarks, INDICES_BOUCHE, largeur, hauteur)
                pts_mar = obtenir_points(landmarks, POINTS_MAR, largeur, hauteur)
                mar = calculer_mar(pts_mar)
                baillement_detecte = mar > SEUIL_MAR
                
                # ============================================================
                # DRAW CONTOURS
                # ============================================================
                couleur_droit = (0, 0, 255) if oeil_droit_ferme else (0, 255, 0)
                couleur_gauche = (0, 0, 255) if oeil_gauche_ferme else (0, 255, 0)
                couleur_bouche = (0, 165, 255) if baillement_detecte else (0, 255, 0)
                
                dessiner_contour_oeil(frame, contour_droit, couleur_droit, 2)
                dessiner_contour_oeil(frame, contour_gauche, couleur_gauche, 2)
                dessiner_contour_bouche(frame, contour_bouche, couleur_bouche, 2)
                
                # ============================================================
                # DROWSINESS DETECTION
                # ============================================================
                if les_deux_yeux_fermes:
                    compteur_fermeture += 1
                    if compteur_fermeture >= FRAMES_ALERTE:
                        if temps_actuel - dernier_alerte > COOLDOWN_ALERTE:
                            alerte_active = True
                            dernier_alerte = temps_actuel
                            duree = compteur_fermeture / FPS
                            print(f"⚠️  DROWSINESS ALERT! Both eyes closed for {duree:.1f}s")
                else:
                    compteur_fermeture = 0
                    alerte_active = False
                
                # ============================================================
                # YAWN DETECTION
                # ============================================================
                if baillement_detecte:
                    compteur_baillement += 1
                    if compteur_baillement >= FRAMES_ALERTE_BAILLEMENT:
                        if temps_actuel - dernier_alerte_baillement > COOLDOWN_ALERTE:
                            alerte_baillement_active = True
                            dernier_alerte_baillement = temps_actuel
                            duree = compteur_baillement / FPS
                            print(f"🥱 YAWN ALERT! Duration {duree:.1f}s")
                else:
                    compteur_baillement = 0
                    alerte_baillement_active = False
        
        # ====================================================================
        # EMOTION DETECTION (THREADED)
        # ====================================================================
        if emotion_detector.should_analyze():
            # Capture frame for analysis
            analysis_frame = frame.copy()
            # Run in thread to avoid blocking
            thread = threading.Thread(target=emotion_detector.analyze_frame, args=(analysis_frame,))
            thread.daemon = True
            thread.start()
        
        # ====================================================================
        # USER INTERFACE
        # ====================================================================
        
        # Main panel (top)
        panel_x, panel_y = 10, 8
        panel_w = min(630, largeur - 20)
        panel_h = 280
        
        overlay = frame.copy()
        cv2.rectangle(overlay, (panel_x, panel_y), (panel_x + panel_w, panel_y + panel_h), (25, 25, 25), -1)
        cv2.addWeighted(overlay, 0.78, frame, 0.22, 0, frame)
        
        # Title
        title = "DROWSINESS & EMOTION DETECTOR"
        draw_text_shadow(frame, title, (panel_x + 14, panel_y + 36), cv2.FONT_HERSHEY_DUPLEX, 0.8, (245,245,245), thickness=2)
        cv2.line(frame, (panel_x + 10, panel_y + 46), (panel_x + panel_w - 10, panel_y + 46), (90, 90, 90), 1)
        
        # EAR values (left side)
        ear_box_w = 260
        ear_box_h = 38
        bx, by = panel_x + 12, panel_y + 56
        draw_text_box(frame, "", (bx, by), ear_box_w, ear_box_h)
        draw_text_shadow(frame, f"EAR Droit: {ear_droit:.3f}", (bx + 10, by + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180,180,255), thickness=1)
        
        bx2, by2 = panel_x + 12, panel_y + 56 + ear_box_h + 6
        draw_text_box(frame, "", (bx2, by2), ear_box_w, ear_box_h)
        draw_text_shadow(frame, f"EAR Gauche: {ear_gauche:.3f}", (bx2 + 10, by2 + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255,180,180), thickness=1)
        
        # Eye states (right side)
        eye_x, eye_y = panel_x + ear_box_w + 36, panel_y + 80
        couleur_droit = (0, 0, 255) if oeil_droit_ferme else (0, 200, 0)
        couleur_gauche = (0, 0, 255) if oeil_gauche_ferme else (0, 200, 0)
        cv2.circle(frame, (eye_x, eye_y), 12, couleur_droit, -1)
        draw_text_shadow(frame, "Droit", (eye_x + 22, eye_y + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230,230,230), thickness=1)
        cv2.circle(frame, (eye_x, eye_y + 36), 12, couleur_gauche, -1)
        draw_text_shadow(frame, "Gauche", (eye_x + 22, eye_y + 42), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230,230,230), thickness=1)
        
        # Status
        status_x, status_y = panel_x + 14, panel_y + 150
        if les_deux_yeux_fermes:
            draw_text_shadow(frame, "LES DEUX YEUX FERMES", (status_x, status_y), cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 165, 255), thickness=2)
        else:
            draw_text_shadow(frame, "Au moins un oeil ouvert", (status_x, status_y), cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 220, 0), thickness=2)
        
        # Progress bars
        pb_x, pb_y = panel_x + 14, panel_y + 170
        cv2.line(frame, (panel_x + 10, pb_y - 8), (panel_x + panel_w - 10, pb_y - 8), (90, 90, 90), 1)
        
        y_pos = pb_y
        if compteur_fermeture > 0:
            duree_yeux = compteur_fermeture / FPS
            prog_yeux = min(int((compteur_fermeture / FRAMES_ALERTE) * 100), 100)
            draw_text_shadow(frame, f"Yeux fermes: {duree_yeux:.1f}s", (pb_x, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255,200,0), thickness=1)
            draw_progress_bar(frame, (pb_x, y_pos + 12), 280, 16, prog_yeux, bg_color=(60,60,60), fg_color=(0,0,220))
            draw_text_shadow(frame, f"{prog_yeux}%", (pb_x + 290, y_pos + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), thickness=1)
            y_pos += 36
        
        if compteur_baillement > 0:
            duree_bail = compteur_baillement / FPS
            prog_bail = min(int((compteur_baillement / FRAMES_ALERTE_BAILLEMENT) * 100), 100)
            draw_text_shadow(frame, f"Baillement: {duree_bail:.1f}s", (pb_x, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255,165,0), thickness=1)
            draw_progress_bar(frame, (pb_x, y_pos + 12), 280, 16, prog_bail, bg_color=(60,60,60), fg_color=(0,165,255))
            draw_text_shadow(frame, f"{prog_bail}%", (pb_x + 290, y_pos + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), thickness=1)
        
        # Instructions
        mode_texte = ["Tesselation", "Contours", "Points"][mode_mesh - 1]
        draw_text_shadow(frame, f"Mesh: {mode_texte} [M] | Emotion [E] | Quit [Q]", 
                        (panel_x + 14, panel_y + panel_h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), thickness=1)
        
        # ====================================================================
        # EMOTION PANEL (Right side)
        # ====================================================================
        if emotion_detector.enabled:
            emotion_panel_x = largeur - 320
            emotion_panel_y = 10
            emotion_panel_w = 300
            emotion_panel_h = 220
            
            # Background
            overlay = frame.copy()
            cv2.rectangle(overlay, (emotion_panel_x, emotion_panel_y), 
                         (emotion_panel_x + emotion_panel_w, emotion_panel_y + emotion_panel_h), (25, 25, 25), -1)
            cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)
            cv2.rectangle(frame, (emotion_panel_x, emotion_panel_y), 
                         (emotion_panel_x + emotion_panel_w, emotion_panel_y + emotion_panel_h), (0, 255, 100), 2)
            
            # Title
            draw_text_shadow(frame, "EMOTION DETECTION", (emotion_panel_x + 15, emotion_panel_y + 30), 
                           cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), thickness=2)
            
            # Status
            if emotion_detector.is_analyzing:
                draw_text_shadow(frame, "Analyzing...", (emotion_panel_x + 15, emotion_panel_y + 65), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), thickness=2)
            elif emotion_detector.current_emotion:
                # Show current emotion
                draw_text_shadow(frame, emotion_detector.current_emotion.upper(), 
                               (emotion_panel_x + 15, emotion_panel_y + 75), 
                               cv2.FONT_HERSHEY_DUPLEX, 1.2, (0, 255, 0), thickness=3)
                
                # Show all emotions
                y_offset = 110
                sorted_emotions = sorted(emotion_detector.emotion_scores.items(), key=lambda x: x[1], reverse=True)
                for emotion, score in sorted_emotions:
                    if emotion == 'happy':
                        color = (0, 255, 0)
                    elif emotion == 'sad':
                        color = (0, 100, 255)
                    else:
                        color = (200, 200, 0)
                    
                    # Draw bar
                    bar_width = int((score / 100) * 220)
                    cv2.rectangle(frame, (emotion_panel_x + 15, y_offset - 10), 
                                 (emotion_panel_x + 15 + bar_width, y_offset + 5), color, -1)
                    
                    # Draw text
                    text = f"{emotion.capitalize()}: {score:.1f}%"
                    draw_text_shadow(frame, text, (emotion_panel_x + 20, y_offset), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), thickness=1)
                    y_offset += 30
            else:
                draw_text_shadow(frame, "Waiting...", (emotion_panel_x + 15, emotion_panel_y + 65), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (150, 150, 150), thickness=2)
            
            # Countdown
            time_until_next = emotion_detector.get_time_until_next()
            countdown_text = f"Next: {int(time_until_next)}s"
            draw_text_shadow(frame, countdown_text, (emotion_panel_x + 15, emotion_panel_y + emotion_panel_h - 15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), thickness=1)
        
        # ====================================================================
        # ALERTS
        # ====================================================================
        if alerte_active:
            if frame_count % 10 < 5:
                cv2.rectangle(frame, (0, 0), (largeur, hauteur), (0, 0, 255), 20)
            cv2.putText(frame, "⚠️ SOMNOLENCE DETECTEE ⚠️", (50, hauteur - 120),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
            cv2.putText(frame, "LES DEUX YEUX SONT FERMES !", (80, hauteur - 70),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
        
        # ====================================================================
        # DISPLAY
        # ====================================================================
        cv2.imshow("Drowsiness & Emotion Detector", frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == ord('Q'):
            break
        elif key == ord('m') or key == ord('M'):
            mode_mesh = (mode_mesh % 3) + 1
            modes = {1: "Tesselation", 2: "Contours", 3: "Points"}
            print(f"→ Mesh mode: {modes[mode_mesh]}")
        elif key == ord('e') or key == ord('E'):
            emotion_detector.enabled = not emotion_detector.enabled
            status = "ENABLED" if emotion_detector.enabled else "DISABLED"
            print(f"→ Emotion detection: {status}")
        
        frame_count += 1
    
    # ========================================================================
    # CLEANUP
    # ========================================================================
    cap.release()
    face_mesh.close()
    cv2.destroyAllWindows()
    
    print("\n" + "=" * 70)
    print(f"✅ Program terminated ({frame_count} frames processed)")
    print("=" * 70)


if __name__ == "__main__":
    main()
