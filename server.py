import cv2
import mediapipe as mp
import numpy as np
import time
import threading
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Global variables for state management
session_active = False
counter = 0
stage = "up"
feedback_message = "START PUSH-UPS"
feedback_color_hex = "#FFFF00"  # Yellow
feedback_timer = 0
last_rep_time = 0
is_rep_valid = True
latest_frame = None

thread_lock = threading.Lock()
camera_thread = None
stop_event = threading.Event()

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180:
        angle = 360 - angle

    return angle

def calculate_3d_angle(a, b, c):
    def get_xyz(point):
        if hasattr(point, 'x'):
            return np.array([point.x, point.y, point.z])
        elif isinstance(point, dict):
            return np.array([point.get('x', 0), point.get('y', 0), point.get('z', 0)])
        return np.array([0.0, 0.0, 0.0])
        
    p_a = get_xyz(a)
    p_b = get_xyz(b)
    p_c = get_xyz(c)
    
    ba = p_a - p_b
    bc = p_c - p_b
    
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    
    if norm_ba == 0 or norm_bc == 0:
        return None
        
    cosine_angle = np.dot(ba, bc) / (norm_ba * norm_bc)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

def calculate_vertical_ratio(shoulder_world, hip_world):
    dx = shoulder_world.x - hip_world.x
    dy = shoulder_world.y - hip_world.y
    dz = shoulder_world.z - hip_world.z
    
    distance_3d = np.sqrt(dx**2 + dy**2 + dz**2)
    if distance_3d == 0:
        return 1.0
    return abs(dy) / distance_3d

def get_placeholder_frame(text="CAMERA INACTIVE"):
    img = np.zeros((480, 640, 3), np.uint8)
    img[:] = (30, 30, 35)  # Dark slate background
    # Add simple graphics
    cv2.putText(img, text, (180, 240), cv2.FONT_HERSHEY_DUPLEX, 1.0, (180, 180, 180), 2)
    cv2.putText(img, "Press Start Session in App", (150, 280), cv2.FONT_HERSHEY_DUPLEX, 0.7, (120, 120, 120), 1)
    ret, jpeg = cv2.imencode('.jpg', img)
    return jpeg.tobytes()

def pose_estimation_loop():
    global session_active, counter, stage, feedback_message, feedback_color_hex, feedback_timer, last_rep_time, is_rep_valid, latest_frame
    
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    cam = cv2.VideoCapture(0)
    if not cam.isOpened():
        with thread_lock:
            feedback_message = "ERROR: Camera not available"
            feedback_color_hex = "#FF3232"
        pose.close()
        return
        
    # Reset stats for new session
    with thread_lock:
        counter = 0
        stage = "up"
        feedback_message = "START PUSH-UPS"
        feedback_color_hex = "#FFFF00"
        feedback_timer = time.time()
        last_rep_time = 0
        is_rep_valid = True
        latest_frame = None

    # Colors for OpenCV drawing (BGR format)
    GREEN = (127, 255, 0)   # #7FFF00 Neon Green (displayed as RGB)
    RED = (50, 50, 255)     # #FF3232 Red
    BLUE = (255, 127, 0)    # #007FFF Blue
    WHITE = (255, 255, 255) # White
    YELLOW = (0, 255, 255)  # #FFFF00 Yellow
    
    while not stop_event.is_set():
        success, frame = cam.read()
        if not success:
            time.sleep(0.01)
            continue
            
        h, w, c = frame.shape
        current_time = time.time()
        
        # Clear feedback message after 2.5 seconds
        with thread_lock:
            if current_time - feedback_timer > 2.5:
                feedback_message = ""
                
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)
        
        elbow_angle = None
        back_angle = None
        plank_angle = None
        vertical_ratio = None
        
        l_back_angle = None
        r_back_angle = None
        l_plank_angle = None
        r_plank_angle = None

        l_arm_visible = False
        r_arm_visible = False
        l_knee_visible = False
        r_knee_visible = False
        l_ankle_visible = False
        r_ankle_visible = False

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            # Extract landmarks
            l_shoulder_lm = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            l_elbow_lm = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value]
            l_wrist_lm = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
            l_hip_lm = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            l_knee_lm = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
            l_ankle_lm = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]

            r_shoulder_lm = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            r_elbow_lm = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
            r_wrist_lm = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
            r_hip_lm = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            r_knee_lm = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
            r_ankle_lm = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

            l_arm_visible = (l_shoulder_lm.visibility > 0.5 and 
                             l_elbow_lm.visibility > 0.5 and 
                             l_wrist_lm.visibility > 0.5)

            r_arm_visible = (r_shoulder_lm.visibility > 0.5 and 
                             r_elbow_lm.visibility > 0.5 and 
                             r_wrist_lm.visibility > 0.5)

            l_knee_visible = (l_shoulder_lm.visibility > 0.5 and 
                              l_hip_lm.visibility > 0.5 and 
                              l_knee_lm.visibility > 0.5)

            r_knee_visible = (r_shoulder_lm.visibility > 0.5 and 
                              r_hip_lm.visibility > 0.5 and 
                              r_knee_lm.visibility > 0.5)

            l_ankle_visible = (l_shoulder_lm.visibility > 0.5 and 
                               l_hip_lm.visibility > 0.5 and 
                               l_ankle_lm.visibility > 0.5)

            r_ankle_visible = (r_shoulder_lm.visibility > 0.5 and 
                               r_hip_lm.visibility > 0.5 and 
                               r_ankle_lm.visibility > 0.5)

            # Pixel coordinates
            l_shoulder = (int(l_shoulder_lm.x * w), int(l_shoulder_lm.y * h))
            l_elbow = (int(l_elbow_lm.x * w), int(l_elbow_lm.y * h))
            l_wrist = (int(l_wrist_lm.x * w), int(l_wrist_lm.y * h))
            l_hip = (int(l_hip_lm.x * w), int(l_hip_lm.y * h))
            l_knee = (int(l_knee_lm.x * w), int(l_knee_lm.y * h))
            l_ankle = (int(l_ankle_lm.x * w), int(l_ankle_lm.y * h))

            r_shoulder = (int(r_shoulder_lm.x * w), int(r_shoulder_lm.y * h))
            r_elbow = (int(r_elbow_lm.x * w), int(r_elbow_lm.y * h))
            r_wrist = (int(r_wrist_lm.x * w), int(r_wrist_lm.y * h))
            r_hip = (int(r_hip_lm.x * w), int(r_hip_lm.y * h))
            r_knee = (int(r_knee_lm.x * w), int(r_knee_lm.y * h))
            r_ankle = (int(r_ankle_lm.x * w), int(r_ankle_lm.y * h))

            # Check if 3D world landmarks are available
            use_3d = (results.pose_world_landmarks is not None)
            if use_3d:
                world_landmarks = results.pose_world_landmarks.landmark
                l_shoulder_world = world_landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
                l_elbow_world = world_landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value]
                l_wrist_world = world_landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
                l_hip_world = world_landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
                l_knee_world = world_landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
                l_ankle_world = world_landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
                
                r_shoulder_world = world_landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
                r_elbow_world = world_landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
                r_wrist_world = world_landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
                r_hip_world = world_landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
                r_knee_world = world_landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
                r_ankle_world = world_landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

            # Elbow angles
            arm_angles = []
            if use_3d:
                if l_arm_visible:
                    arm_angles.append(calculate_3d_angle(l_shoulder_world, l_elbow_world, l_wrist_world))
                if r_arm_visible:
                    arm_angles.append(calculate_3d_angle(r_shoulder_world, r_elbow_world, r_wrist_world))
            else:
                if l_arm_visible:
                    arm_angles.append(calculate_angle(l_shoulder, l_elbow, l_wrist))
                if r_arm_visible:
                    arm_angles.append(calculate_angle(r_shoulder, r_elbow, r_wrist))
            
            arm_angles = [a for a in arm_angles if a is not None]
            if arm_angles:
                elbow_angle = np.mean(arm_angles)

            # Spine/back angles
            back_angles = []
            if use_3d:
                if l_knee_visible:
                    l_back_angle = calculate_3d_angle(l_shoulder_world, l_hip_world, l_knee_world)
                    back_angles.append(l_back_angle)
                if r_knee_visible:
                    r_back_angle = calculate_3d_angle(r_shoulder_world, r_hip_world, r_knee_world)
                    back_angles.append(r_back_angle)
            else:
                if l_knee_visible:
                    l_back_angle = calculate_angle(l_shoulder, l_hip, l_knee)
                    back_angles.append(l_back_angle)
                if r_knee_visible:
                    r_back_angle = calculate_angle(r_shoulder, r_hip, r_knee)
                    back_angles.append(r_back_angle)
            
            back_angles = [a for a in back_angles if a is not None]
            if back_angles:
                back_angle = np.mean(back_angles)

            # Body line angles (plank)
            plank_angles = []
            if use_3d:
                if l_ankle_visible:
                    l_plank_angle = calculate_3d_angle(l_shoulder_world, l_hip_world, l_ankle_world)
                    plank_angles.append(l_plank_angle)
                if r_ankle_visible:
                    r_plank_angle = calculate_3d_angle(r_shoulder_world, r_hip_world, r_ankle_world)
                    plank_angles.append(r_plank_angle)
            else:
                if l_ankle_visible:
                    l_plank_angle = calculate_angle(l_shoulder, l_hip, l_ankle)
                    plank_angles.append(l_plank_angle)
                if r_ankle_visible:
                    r_plank_angle = calculate_angle(r_shoulder, r_hip, r_ankle)
                    plank_angles.append(r_plank_angle)
            
            plank_angles = [a for a in plank_angles if a is not None]
            if plank_angles:
                plank_angle = np.mean(plank_angles)

            # Vertical ratio (standing check)
            if use_3d:
                vertical_ratios = []
                if l_shoulder_lm.visibility > 0.5 and l_hip_lm.visibility > 0.5:
                    vertical_ratios.append(calculate_vertical_ratio(l_shoulder_world, l_hip_world))
                if r_shoulder_lm.visibility > 0.5 and r_hip_lm.visibility > 0.5:
                    vertical_ratios.append(calculate_vertical_ratio(r_shoulder_world, r_hip_world))

                if vertical_ratios:
                    vertical_ratio = np.mean(vertical_ratios)

            # Fallback to True if landmarks are missing, or check if ratio < 0.85 (more lenient)
            is_horizontal = (vertical_ratio is None or vertical_ratio < 0.85)

            with thread_lock:
                if is_horizontal:
                    if elbow_angle is not None:
                        # 1. Going down: Transition from UP to DOWN (more lenient: < 115)
                        if stage == "up" and elbow_angle < 115:
                            stage = "down"
                            is_rep_valid = True

                        # 2. Monitoring phase
                        if stage == "down":
                            # Posture angle checks (more lenient: < 135)
                            if back_angle is not None and back_angle < 135:
                                is_rep_valid = False
                            if plank_angle is not None and plank_angle < 135:
                                is_rep_valid = False

                            # 3. Pushing up: Complete the cycle (more lenient: > 140)
                            if elbow_angle > 140:
                                stage = "up"
                                if current_time - last_rep_time > 1.2:
                                    counter += 1  # ALWAYS count the completed rep!
                                    if is_rep_valid:
                                        feedback_message = "GOOD REP!"
                                        feedback_color_hex = "#7FFF00"  # Neon Green
                                    else:
                                        feedback_message = "REP COUNTED! KEEP CORE TIGHT."
                                        feedback_color_hex = "#f59e0b"  # Warning Orange
                                    last_rep_time = current_time
                                    feedback_timer = current_time
                else:
                    # Standing check: only reset if elbows are straight AND we are clearly standing (vertical_ratio > 0.88)
                    if vertical_ratio is not None and vertical_ratio > 0.88:
                        if elbow_angle is None or elbow_angle > 130:
                            stage = "up"
                            is_rep_valid = False

            # Draw lines and overlays
            if l_shoulder_lm.visibility > 0.5 and l_hip_lm.visibility > 0.5:
                l_back_ok = (l_back_angle is None or l_back_angle > 150)
                l_plank_ok = (l_plank_angle is None or l_plank_angle > 150)
                l_form_ok = l_back_ok and l_plank_ok
                back_color = GREEN if (l_form_ok and is_horizontal) else RED
                
                cv2.line(frame, l_shoulder, l_hip, back_color, 4)
                cv2.circle(frame, l_shoulder, 8, WHITE, -1)
                cv2.circle(frame, l_hip, 8, WHITE, -1)
                
                if l_knee_lm.visibility > 0.5:
                    cv2.line(frame, l_hip, l_knee, back_color, 4)
                    cv2.circle(frame, l_knee, 8, WHITE, -1)
                    if l_ankle_lm.visibility > 0.5:
                        cv2.line(frame, l_knee, l_ankle, back_color, 4)
                        cv2.circle(frame, l_ankle, 8, WHITE, -1)

            if r_shoulder_lm.visibility > 0.5 and r_hip_lm.visibility > 0.5:
                r_back_ok = (r_back_angle is None or r_back_angle > 150)
                r_plank_ok = (r_plank_angle is None or r_plank_angle > 150)
                r_form_ok = r_back_ok and r_plank_ok
                back_color = GREEN if (r_form_ok and is_horizontal) else RED
                
                cv2.line(frame, r_shoulder, r_hip, back_color, 4)
                cv2.circle(frame, r_shoulder, 8, WHITE, -1)
                cv2.circle(frame, r_hip, 8, WHITE, -1)
                
                if r_knee_lm.visibility > 0.5:
                    cv2.line(frame, r_hip, r_knee, back_color, 4)
                    cv2.circle(frame, r_knee, 8, WHITE, -1)
                    if r_ankle_lm.visibility > 0.5:
                        cv2.line(frame, r_knee, r_ankle, back_color, 4)
                        cv2.circle(frame, r_ankle, 8, WHITE, -1)

            if l_arm_visible:
                cv2.line(frame, l_shoulder, l_elbow, BLUE, 4)
                cv2.line(frame, l_elbow, l_wrist, BLUE, 4)
                cv2.circle(frame, l_elbow, 8, WHITE, -1)
                cv2.circle(frame, l_wrist, 8, WHITE, -1)
                cv2.putText(frame, f"L: {int(l_elbow_angle)}", (l_elbow[0] - 50, l_elbow[1] - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, YELLOW, 2)

            if r_arm_visible:
                cv2.line(frame, r_shoulder, r_elbow, BLUE, 4)
                cv2.line(frame, r_elbow, r_wrist, BLUE, 4)
                cv2.circle(frame, r_elbow, 8, WHITE, -1)
                cv2.circle(frame, r_wrist, 8, WHITE, -1)
                cv2.putText(frame, f"R: {int(r_elbow_angle)}", (r_elbow[0] + 10, r_elbow[1] - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, YELLOW, 2)

        # Draw HUD Panel
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 80), (30, 30, 30), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

        cv2.putText(frame, f"REPS: {counter}", (30, 50), cv2.FONT_HERSHEY_DUPLEX, 1.1, GREEN, 2)
        cv2.putText(frame, f"STAGE: {stage.upper()}", (210, 50), cv2.FONT_HERSHEY_DUPLEX, 0.9, WHITE, 2)

        with thread_lock:
            msg = feedback_message
            color = GREEN if feedback_color_hex == "#7FFF00" else (RED if feedback_color_hex == "#FF3232" else YELLOW)
        
        if msg:
            cv2.putText(frame, msg, (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, color, 2)
        else:
            if vertical_ratio is not None and vertical_ratio >= 0.55:
                cv2.putText(frame, "PLEASE LIE DOWN TO PLANK", (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, YELLOW, 2)
            elif back_angle is not None or plank_angle is not None:
                bad_back = (back_angle is not None and back_angle < 150)
                bad_plank = (plank_angle is not None and plank_angle < 150)
                if bad_back or bad_plank:
                    cv2.putText(frame, "KEEP CORE ALIGNED!", (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, RED, 2)
                else:
                    cv2.putText(frame, "FORM: GOOD", (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, GREEN, 2)
            else:
                cv2.putText(frame, "FORM: DETECTING...", (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, YELLOW, 2)

        # Encode as JPEG
        ret, jpeg = cv2.imencode('.jpg', frame)
        if ret:
            with thread_lock:
                latest_frame = jpeg.tobytes()
        
        time.sleep(0.03)  # Rate limiting (~30fps)
        
    cam.release()
    pose.close()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "app": "gym-ai-pose-server"}), 200

@app.route('/start', methods=['POST'])
def start_session():
    global session_active, camera_thread, stop_event, counter, stage, feedback_message, feedback_color_hex, feedback_timer, last_rep_time, is_rep_valid, latest_frame
    
    data = request.json or {}
    mode = data.get('mode', 'pc')  # 'pc' or 'mobile'
    
    with thread_lock:
        # Reset stats
        counter = 0
        stage = "up"
        feedback_message = "START PUSH-UPS"
        feedback_color_hex = "#FFFF00"
        feedback_timer = time.time()
        last_rep_time = 0
        is_rep_valid = True
        latest_frame = None
        
        if session_active:
            return jsonify({"status": "already_running"}), 200
        
        session_active = True
        stop_event.clear()
        
        if mode == 'pc':
            camera_thread = threading.Thread(target=pose_estimation_loop)
            camera_thread.daemon = True
            camera_thread.start()
            
    return jsonify({"status": "started", "mode": mode}), 200

@app.route('/stop', methods=['POST'])
def stop_session():
    global session_active, stop_event, camera_thread
    with thread_lock:
        if not session_active:
            return jsonify({"status": "not_running"}), 200
        
        session_active = False
        stop_event.set()
        
    if camera_thread:
        camera_thread.join(timeout=3.0)
        
    return jsonify({"status": "stopped", "reps": counter}), 200

@app.route('/status', methods=['GET'])
def get_status():
    with thread_lock:
        return jsonify({
            "active": session_active,
            "reps": counter,
            "stage": stage,
            "feedback": feedback_message,
            "color": feedback_color_hex
        }), 200

@app.route('/process_landmarks', methods=['POST'])
def process_landmarks():
    global counter, stage, feedback_message, feedback_color_hex, feedback_timer, last_rep_time, is_rep_valid, session_active
    
    data = request.json or {}
    landmarks = data.get('landmarks')
    world_landmarks = data.get('world_landmarks')
    
    if not landmarks:
        return jsonify({
            "active": session_active,
            "reps": counter,
            "stage": stage,
            "feedback": feedback_message,
            "color": feedback_color_hex
        }), 200
        
    current_time = time.time()
    
    def get_lm(idx):
        if idx < len(landmarks):
            return landmarks[idx]
        return None
        
    def get_world_lm(idx):
        if world_landmarks and idx < len(world_landmarks):
            return world_landmarks[idx]
        return None
        
    l_shoulder_lm = get_lm(11)
    l_elbow_lm = get_lm(13)
    l_wrist_lm = get_lm(15)
    l_hip_lm = get_lm(23)
    l_knee_lm = get_lm(25)
    l_ankle_lm = get_lm(27)

    r_shoulder_lm = get_lm(12)
    r_elbow_lm = get_lm(14)
    r_wrist_lm = get_lm(16)
    r_hip_lm = get_lm(24)
    r_knee_lm = get_lm(26)
    r_ankle_lm = get_lm(28)

    def is_visible(lm):
        return lm is not None and lm.get('visibility', 0) > 0.5

    l_arm_visible = is_visible(l_shoulder_lm) and is_visible(l_elbow_lm) and is_visible(l_wrist_lm)
    r_arm_visible = is_visible(r_shoulder_lm) and is_visible(r_elbow_lm) and is_visible(r_wrist_lm)
    l_knee_visible = is_visible(l_shoulder_lm) and is_visible(l_hip_lm) and is_visible(l_knee_lm)
    r_knee_visible = is_visible(r_shoulder_lm) and is_visible(r_hip_lm) and is_visible(r_knee_lm)
    l_ankle_visible = is_visible(l_shoulder_lm) and is_visible(l_hip_lm) and is_visible(l_ankle_lm)
    r_ankle_visible = is_visible(r_shoulder_lm) and is_visible(r_hip_lm) and is_visible(r_ankle_lm)

    def coord(lm):
        return (lm.get('x', 0) * 640, lm.get('y', 0) * 480)

    elbow_angle = None
    back_angle = None
    plank_angle = None
    
    use_3d = (world_landmarks is not None and len(world_landmarks) > 0)
    
    l_shoulder_world = get_world_lm(11)
    l_elbow_world = get_world_lm(13)
    l_wrist_world = get_world_lm(15)
    l_hip_world = get_world_lm(23)
    l_knee_world = get_world_lm(25)
    l_ankle_world = get_world_lm(27)

    r_shoulder_world = get_world_lm(12)
    r_elbow_world = get_world_lm(14)
    r_wrist_world = get_world_lm(16)
    r_hip_world = get_world_lm(24)
    r_knee_world = get_world_lm(26)
    r_ankle_world = get_world_lm(28)

    # Elbow angles
    arm_angles = []
    if use_3d:
        if l_arm_visible and l_shoulder_world and l_elbow_world and l_wrist_world:
            arm_angles.append(calculate_3d_angle(l_shoulder_world, l_elbow_world, l_wrist_world))
        if r_arm_visible and r_shoulder_world and r_elbow_world and r_wrist_world:
            arm_angles.append(calculate_3d_angle(r_shoulder_world, r_elbow_world, r_wrist_world))
    else:
        if l_arm_visible:
            arm_angles.append(calculate_angle(coord(l_shoulder_lm), coord(l_elbow_lm), coord(l_wrist_lm)))
        if r_arm_visible:
            arm_angles.append(calculate_angle(coord(r_shoulder_lm), coord(r_elbow_lm), coord(r_wrist_lm)))
            
    arm_angles = [a for a in arm_angles if a is not None]
    if arm_angles:
        elbow_angle = np.mean(arm_angles)

    # Spine/back angles
    back_angles = []
    if use_3d:
        if l_knee_visible and l_shoulder_world and l_hip_world and l_knee_world:
            back_angles.append(calculate_3d_angle(l_shoulder_world, l_hip_world, l_knee_world))
        if r_knee_visible and r_shoulder_world and r_hip_world and r_knee_world:
            back_angles.append(calculate_3d_angle(r_shoulder_world, r_hip_world, r_knee_world))
    else:
        if l_knee_visible:
            back_angles.append(calculate_angle(coord(l_shoulder_lm), coord(l_hip_lm), coord(l_knee_lm)))
        if r_knee_visible:
            back_angles.append(calculate_angle(coord(r_shoulder_lm), coord(r_hip_lm), coord(r_knee_lm)))
            
    back_angles = [a for a in back_angles if a is not None]
    if back_angles:
        back_angle = np.mean(back_angles)

    # Body line angles (plank)
    plank_angles = []
    if use_3d:
        if l_ankle_visible and l_shoulder_world and l_hip_world and l_ankle_world:
            plank_angles.append(calculate_3d_angle(l_shoulder_world, l_hip_world, l_ankle_world))
        if r_ankle_visible and r_shoulder_world and r_hip_world and r_ankle_world:
            plank_angles.append(calculate_3d_angle(r_shoulder_world, r_hip_world, r_ankle_world))
    else:
        if l_ankle_visible:
            plank_angles.append(calculate_angle(coord(l_shoulder_lm), coord(l_hip_lm), coord(l_ankle_lm)))
        if r_ankle_visible:
            plank_angles.append(calculate_angle(coord(r_shoulder_lm), coord(r_hip_lm), coord(r_ankle_lm)))
            
    plank_angles = [a for a in plank_angles if a is not None]
    if plank_angles:
        plank_angle = np.mean(plank_angles)

    vertical_ratio = None
    if use_3d:
        class DummyLandmark:
            def __init__(self, d):
                self.x = d.get('x', 0) if d else 0
                self.y = d.get('y', 0) if d else 0
                self.z = d.get('z', 0) if d else 0

        vertical_ratios = []
        if is_visible(l_shoulder_lm) and is_visible(l_hip_lm) and l_shoulder_world and l_hip_world:
            vertical_ratios.append(calculate_vertical_ratio(DummyLandmark(l_shoulder_world), DummyLandmark(l_hip_world)))
        if is_visible(r_shoulder_lm) and is_visible(r_hip_lm) and r_shoulder_world and r_hip_world:
            vertical_ratios.append(calculate_vertical_ratio(DummyLandmark(r_shoulder_world), DummyLandmark(r_hip_world)))

        if vertical_ratios:
            vertical_ratio = np.mean(vertical_ratios)

    # Fallback to True if landmarks are missing, or check if ratio < 0.85 (more lenient)
    is_horizontal = (vertical_ratio is None or vertical_ratio < 0.85)

    with thread_lock:
        if current_time - feedback_timer > 2.5:
            feedback_message = ""

        if is_horizontal:
            if elbow_angle is not None:
                # 1. Going down: Transition from UP to DOWN (more lenient: < 115)
                if stage == "up" and elbow_angle < 115:
                    stage = "down"
                    is_rep_valid = True

                if stage == "down":
                    # Posture angle checks (more lenient: < 135)
                    if back_angle is not None and back_angle < 135:
                        is_rep_valid = False
                    if plank_angle is not None and plank_angle < 135:
                        is_rep_valid = False

                    # 3. Pushing up: Complete the cycle (more lenient: > 140)
                    if elbow_angle > 140:
                        stage = "up"
                        if current_time - last_rep_time > 1.2:
                            counter += 1  # ALWAYS count the completed rep!
                            if is_rep_valid:
                                feedback_message = "GOOD REP!"
                                feedback_color_hex = "#7FFF00"
                            else:
                                feedback_message = "REP COUNTED! KEEP CORE TIGHT."
                                feedback_color_hex = "#f59e0b"
                            last_rep_time = current_time
                            feedback_timer = current_time
        else:
            # Standing check: only reset if elbows are straight AND we are clearly standing (vertical_ratio > 0.88)
            if vertical_ratio is not None and vertical_ratio > 0.88:
                if elbow_angle is None or elbow_angle > 130:
                    stage = "up"
                    is_rep_valid = False

        disp_feedback = feedback_message
        if not disp_feedback:
            if vertical_ratio is not None and vertical_ratio >= 0.85:
                disp_feedback = "PLEASE LIE DOWN TO PLANK"
                feedback_color_hex = "#FFFF00"
            elif back_angle is not None or plank_angle is not None:
                bad_back = (back_angle is not None and back_angle < 135)
                bad_plank = (plank_angle is not None and plank_angle < 135)
                if bad_back or bad_plank:
                    disp_feedback = "KEEP CORE ALIGNED!"
                    feedback_color_hex = "#FF3232"
                else:
                    disp_feedback = "FORM: GOOD"
                    feedback_color_hex = "#7FFF00"
            else:
                disp_feedback = "FORM: DETECTING..."
                feedback_color_hex = "#FFFF00"

        return jsonify({
            "active": session_active,
            "reps": counter,
            "stage": stage,
            "feedback": disp_feedback,
            "color": feedback_color_hex
        }), 200

def gen():
    while True:
        with thread_lock:
            frame = latest_frame
            active = session_active
        
        if not active or frame is None:
            placeholder = get_placeholder_frame("AWAITING START...")
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + placeholder + b'\r\n\r\n')
            time.sleep(0.5)
        else:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')
            time.sleep(0.03)

@app.route('/video_feed')
def video_feed():
    return Response(gen(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    # Binding to 0.0.0.0 enables access from devices on the same network
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
