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
total_reps = 0
good_reps = 0
bad_reps = 0
stage = "up"
feedback_message = "START PUSH-UPS"
feedback_color_hex = "#FFFF00"  # Yellow
feedback_timer = 0
last_rep_time = 0
latest_frame = None

# Rep-specific tracking state
in_rep = False
rep_min_elbow_angle = 180.0
rep_is_form_valid = True
rep_feedback = "GOOD"

# Live metrics
current_elbow_angle = 180.0
current_back_angle = 180.0

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
    global session_active, total_reps, good_reps, bad_reps, stage, feedback_message, feedback_color_hex, feedback_timer, last_rep_time, in_rep, rep_min_elbow_angle, rep_is_form_valid, rep_feedback, current_elbow_angle, current_back_angle, latest_frame
    
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
        total_reps = 0
        good_reps = 0
        bad_reps = 0
        stage = "up"
        feedback_message = "START PUSH-UPS"
        feedback_color_hex = "#FFFF00"
        feedback_timer = time.time()
        last_rep_time = 0
        in_rep = False
        rep_min_elbow_angle = 180.0
        rep_is_form_valid = True
        rep_feedback = "GOOD"
        current_elbow_angle = 180.0
        current_back_angle = 180.0
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
            l_elbow_angle = None
            r_elbow_angle = None
            if use_3d:
                if l_arm_visible:
                    l_elbow_angle = calculate_3d_angle(l_shoulder_world, l_elbow_world, l_wrist_world)
                    arm_angles.append(l_elbow_angle)
                if r_arm_visible:
                    r_elbow_angle = calculate_3d_angle(r_shoulder_world, r_elbow_world, r_wrist_world)
                    arm_angles.append(r_elbow_angle)
            else:
                if l_arm_visible:
                    l_elbow_angle = calculate_angle(l_shoulder, l_elbow, l_wrist)
                    arm_angles.append(l_elbow_angle)
                if r_arm_visible:
                    r_elbow_angle = calculate_angle(r_shoulder, r_elbow, r_wrist)
                    arm_angles.append(r_elbow_angle)
            
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

            # Classify orientation: Torso angle with horizontal plane must be horizontal (ratio < 0.65)
            is_horizontal = (vertical_ratio is None or vertical_ratio < 0.65)

            with thread_lock:
                if elbow_angle is not None:
                    current_elbow_angle = float(elbow_angle)
                if back_angle is not None:
                    current_back_angle = float(back_angle)

                if is_horizontal:
                    if elbow_angle is not None:
                        # 1. Detect start of rep (elbow bends below 120 degrees)
                        if not in_rep and elbow_angle < 120:
                            in_rep = True
                            rep_min_elbow_angle = elbow_angle
                            rep_is_form_valid = True
                            rep_feedback = "GOOD"
                            stage = "down"

                        if in_rep:
                            # Track minimum elbow angle reached (depth)
                            rep_min_elbow_angle = min(rep_min_elbow_angle, elbow_angle)

                            # Monitor posture/core alignment during the ENTIRE rep
                            if back_angle is not None and back_angle < 145:
                                rep_is_form_valid = False
                                rep_feedback = "KEEP CORE STRAIGHT / DON'T SAG HIPS"
                            if plank_angle is not None and plank_angle < 145:
                                rep_is_form_valid = False
                                rep_feedback = "KEEP CORE STRAIGHT"

                            # 2. Detect end of rep (elbow extends back above 150 degrees)
                            if elbow_angle > 150:
                                if current_time - last_rep_time > 1.0:  # Debounce filter
                                    is_deep_enough = (rep_min_elbow_angle < 100)
                                    
                                    if not is_deep_enough:
                                        bad_reps += 1
                                        feedback_message = "GO DEEPER!"
                                        feedback_color_hex = "#f59e0b"  # Warning Orange
                                    elif not rep_is_form_valid:
                                        bad_reps += 1
                                        feedback_message = rep_feedback
                                        feedback_color_hex = "#FF3232"  # Crimson Red
                                    else:
                                        good_reps += 1
                                        feedback_message = "GOOD REP!"
                                        feedback_color_hex = "#7FFF00"  # Neon Green
                                    
                                    total_reps = good_reps + bad_reps
                                    last_rep_time = current_time
                                    feedback_timer = current_time
                                
                                in_rep = False
                                stage = "up"
                else:
                    # If user stands up clearly, reset state
                    if vertical_ratio is not None and vertical_ratio > 0.85:
                        in_rep = False
                        stage = "up"
                        feedback_message = "PLEASE LIE DOWN TO PLANK"
                        feedback_color_hex = "#FFFF00"
                        feedback_timer = current_time

            # Draw lines and overlays
            # Determine dynamic form color
            with thread_lock:
                form_color = GREEN if feedback_color_hex == "#7FFF00" else (RED if feedback_color_hex == "#FF3232" else (ORANGE if feedback_color_hex == "#f59e0b" else YELLOW))

            def draw_glow_node(img, pt, col):
                cv2.circle(img, pt, 11, col, 2)
                cv2.circle(img, pt, 4, (255, 255, 255), -1)

            # Left side core lines & nodes
            if l_shoulder_lm.visibility > 0.5 and l_hip_lm.visibility > 0.5:
                cv2.line(frame, l_shoulder, l_hip, form_color, 4)
                draw_glow_node(frame, l_shoulder, form_color)
                draw_glow_node(frame, l_hip, form_color)
                
                if l_knee_lm.visibility > 0.5:
                    cv2.line(frame, l_hip, l_knee, form_color, 4)
                    draw_glow_node(frame, l_knee, form_color)
                    if l_ankle_lm.visibility > 0.5:
                        cv2.line(frame, l_knee, l_ankle, form_color, 4)
                        draw_glow_node(frame, l_ankle, form_color)

            # Right side core lines & nodes
            if r_shoulder_lm.visibility > 0.5 and r_hip_lm.visibility > 0.5:
                cv2.line(frame, r_shoulder, r_hip, form_color, 4)
                draw_glow_node(frame, r_shoulder, form_color)
                draw_glow_node(frame, r_hip, form_color)
                
                if r_knee_lm.visibility > 0.5:
                    cv2.line(frame, r_hip, r_knee, form_color, 4)
                    draw_glow_node(frame, r_knee, form_color)
                    if r_ankle_lm.visibility > 0.5:
                        cv2.line(frame, r_knee, r_ankle, form_color, 4)
                        draw_glow_node(frame, r_ankle, form_color)

            # Left arm skeleton & nodes
            if l_arm_visible:
                cv2.line(frame, l_shoulder, l_elbow, BLUE, 4)
                cv2.line(frame, l_elbow, l_wrist, BLUE, 4)
                draw_glow_node(frame, l_elbow, BLUE)
                draw_glow_node(frame, l_wrist, BLUE)
                # Text with background shadow for readability
                cv2.putText(frame, f"L: {int(elbow_angle)}", (l_elbow[0] - 50, l_elbow[1] - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, YELLOW, 2)

            # Right arm skeleton & nodes
            if r_arm_visible:
                cv2.line(frame, r_shoulder, r_elbow, BLUE, 4)
                cv2.line(frame, r_elbow, r_wrist, BLUE, 4)
                draw_glow_node(frame, r_elbow, BLUE)
                draw_glow_node(frame, r_wrist, BLUE)
                cv2.putText(frame, f"R: {int(elbow_angle)}", (r_elbow[0] + 10, r_elbow[1] - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, YELLOW, 2)

        # Draw HUD Panel
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 80), (30, 30, 30), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

        # Calculate Accuracy
        accuracy = 100 if total_reps == 0 else int((good_reps / total_reps) * 100)

        cv2.putText(frame, f"GOOD: {good_reps}  BAD: {bad_reps}  ACC: {accuracy}%", (20, 30), cv2.FONT_HERSHEY_DUPLEX, 0.7, GREEN, 2)
        cv2.putText(frame, f"STAGE: {stage.upper()}", (20, 65), cv2.FONT_HERSHEY_DUPLEX, 0.7, WHITE, 2)

        with thread_lock:
            msg = feedback_message
            color = GREEN if feedback_color_hex == "#7FFF00" else (RED if feedback_color_hex == "#FF3232" else (ORANGE if feedback_color_hex == "#f59e0b" else YELLOW))
        
        if msg:
            cv2.putText(frame, msg, (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, color, 2)
        else:
            if vertical_ratio is not None and vertical_ratio >= 0.65:
                cv2.putText(frame, "PLEASE LIE DOWN TO PLANK", (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, YELLOW, 2)
            elif back_angle is not None or plank_angle is not None:
                bad_back = (back_angle is not None and back_angle < 145)
                bad_plank = (plank_angle is not None and plank_angle < 145)
                if bad_back or bad_plank:
                    cv2.putText(frame, "KEEP CORE ALIGNED!", (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, RED, 2)
                else:
                    cv2.putText(frame, "FORM: GOOD", (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, GREEN, 2)
            else:
                cv2.putText(frame, "FORM: DETECTING...", (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, YELLOW, 2)

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
    global session_active, camera_thread, stop_event, total_reps, good_reps, bad_reps, stage, feedback_message, feedback_color_hex, feedback_timer, last_rep_time, in_rep, rep_min_elbow_angle, rep_is_form_valid, rep_feedback, current_elbow_angle, current_back_angle, latest_frame
    
    data = request.json or {}
    mode = data.get('mode', 'pc')  # 'pc' or 'mobile'
    
    with thread_lock:
        # Reset stats
        total_reps = 0
        good_reps = 0
        bad_reps = 0
        stage = "up"
        feedback_message = "START PUSH-UPS"
        feedback_color_hex = "#FFFF00"
        feedback_timer = time.time()
        last_rep_time = 0
        in_rep = False
        rep_min_elbow_angle = 180.0
        rep_is_form_valid = True
        rep_feedback = "GOOD"
        current_elbow_angle = 180.0
        current_back_angle = 180.0
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
    global session_active, stop_event, camera_thread, total_reps, good_reps, bad_reps
    with thread_lock:
        if not session_active:
            return jsonify({"status": "not_running"}), 200
        
        session_active = False
        stop_event.set()
        
    if camera_thread:
        camera_thread.join(timeout=3.0)
        
    return jsonify({
        "status": "stopped",
        "reps": total_reps,
        "good_reps": good_reps,
        "bad_reps": bad_reps
    }), 200

@app.route('/status', methods=['GET'])
def get_status():
    with thread_lock:
        return jsonify({
            "active": session_active,
            "reps": total_reps,
            "good_reps": good_reps,
            "bad_reps": bad_reps,
            "stage": stage,
            "feedback": feedback_message,
            "color": feedback_color_hex,
            "elbow_angle": current_elbow_angle,
            "back_angle": current_back_angle
        }), 200

@app.route('/process_landmarks', methods=['POST'])
def process_landmarks():
    global total_reps, good_reps, bad_reps, stage, feedback_message, feedback_color_hex, feedback_timer, last_rep_time, in_rep, rep_min_elbow_angle, rep_is_form_valid, rep_feedback, current_elbow_angle, current_back_angle, session_active
    
    data = request.json or {}
    landmarks = data.get('landmarks')
    world_landmarks = data.get('world_landmarks')
    
    if not landmarks:
        return jsonify({
            "active": session_active,
            "reps": total_reps,
            "good_reps": good_reps,
            "bad_reps": bad_reps,
            "stage": stage,
            "feedback": feedback_message,
            "color": feedback_color_hex,
            "elbow_angle": current_elbow_angle,
            "back_angle": current_back_angle
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
    l_elbow_angle = None
    r_elbow_angle = None
    if use_3d:
        if l_arm_visible and l_shoulder_world and l_elbow_world and l_wrist_world:
            l_elbow_angle = calculate_3d_angle(l_shoulder_world, l_elbow_world, l_wrist_world)
            arm_angles.append(l_elbow_angle)
        if r_arm_visible and r_shoulder_world and r_elbow_world and r_wrist_world:
            r_elbow_angle = calculate_3d_angle(r_shoulder_world, r_elbow_world, r_wrist_world)
            arm_angles.append(r_elbow_angle)
    else:
        if l_arm_visible:
            l_elbow_angle = calculate_angle(coord(l_shoulder_lm), coord(l_elbow_lm), coord(l_wrist_lm))
            arm_angles.append(l_elbow_angle)
        if r_arm_visible:
            r_elbow_angle = calculate_angle(coord(r_shoulder_lm), coord(r_elbow_lm), coord(r_wrist_lm))
            arm_angles.append(r_elbow_angle)
            
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

    # Classify orientation: Torso angle with horizontal plane must be horizontal (ratio < 0.65)
    is_horizontal = (vertical_ratio is None or vertical_ratio < 0.65)

    with thread_lock:
        if elbow_angle is not None:
            current_elbow_angle = float(elbow_angle)
        if back_angle is not None:
            current_back_angle = float(back_angle)

        if current_time - feedback_timer > 2.5:
            feedback_message = ""

        if is_horizontal:
            if elbow_angle is not None:
                # 1. Detect start of rep (elbow bends below 120 degrees)
                if not in_rep and elbow_angle < 120:
                    in_rep = True
                    rep_min_elbow_angle = elbow_angle
                    rep_is_form_valid = True
                    rep_feedback = "GOOD"
                    stage = "down"

                if in_rep:
                    # Track minimum elbow angle reached (depth)
                    rep_min_elbow_angle = min(rep_min_elbow_angle, elbow_angle)

                    # Monitor posture/core alignment during the ENTIRE rep
                    if back_angle is not None and back_angle < 145:
                        rep_is_form_valid = False
                        rep_feedback = "KEEP CORE STRAIGHT / DON'T SAG HIPS"
                    if plank_angle is not None and plank_angle < 145:
                        rep_is_form_valid = False
                        rep_feedback = "KEEP CORE STRAIGHT"

                    # 2. Detect end of rep (elbow extends back above 150 degrees)
                    if elbow_angle > 150:
                        if current_time - last_rep_time > 1.0:  # Debounce filter
                            is_deep_enough = (rep_min_elbow_angle < 100)
                            
                            if not is_deep_enough:
                                bad_reps += 1
                                feedback_message = "GO DEEPER!"
                                feedback_color_hex = "#f59e0b"  # Warning Orange
                            elif not rep_is_form_valid:
                                bad_reps += 1
                                feedback_message = rep_feedback
                                feedback_color_hex = "#FF3232"  # Crimson Red
                            else:
                                good_reps += 1
                                feedback_message = "GOOD REP!"
                                feedback_color_hex = "#7FFF00"  # Neon Green
                            
                            total_reps = good_reps + bad_reps
                            last_rep_time = current_time
                            feedback_timer = current_time
                        
                        in_rep = False
                        stage = "up"
        else:
            # If user stands up clearly, reset state
            if vertical_ratio is not None and vertical_ratio > 0.85:
                in_rep = False
                stage = "up"
                feedback_message = "PLEASE LIE DOWN TO PLANK"
                feedback_color_hex = "#FFFF00"
                feedback_timer = current_time

        disp_feedback = feedback_message
        if not disp_feedback:
            if vertical_ratio is not None and vertical_ratio >= 0.65:
                disp_feedback = "PLEASE LIE DOWN TO PLANK"
                feedback_color_hex = "#FFFF00"
            elif back_angle is not None or plank_angle is not None:
                bad_back = (back_angle is not None and back_angle < 145)
                bad_plank = (plank_angle is not None and plank_angle < 145)
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
            "reps": total_reps,
            "good_reps": good_reps,
            "bad_reps": bad_reps,
            "stage": stage,
            "feedback": disp_feedback,
            "color": feedback_color_hex,
            "elbow_angle": current_elbow_angle,
            "back_angle": current_back_angle
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
