import cv2
import mediapipe as mp
import numpy as np
import time

mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180:
        angle = 360 - angle

    return angle

def calculate_vertical_ratio(shoulder_world, hip_world):
    # Calculate Y-displacement relative to overall 3D length in world meters
    dx = shoulder_world.x - hip_world.x
    dy = shoulder_world.y - hip_world.y
    dz = shoulder_world.z - hip_world.z
    
    distance_3d = np.sqrt(dx**2 + dy**2 + dz**2)
    if distance_3d == 0:
        return 1.0
    return abs(dy) / distance_3d

cam = cv2.VideoCapture(0)
pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# State tracking variables
good_reps = 0
bad_reps = 0
total_reps = 0
stage = "up"  # "up" or "down"
last_rep_time = 0

# Rep-specific tracking
in_rep = False
rep_min_elbow_angle = 180.0
rep_is_form_valid = True
rep_feedback = "GOOD"

# Feedback notification variables
feedback_message = "START PUSH-UPS"
feedback_color = (0, 255, 255) # Yellow
feedback_timer = time.time()

# Premium Color Palette (BGR format for OpenCV)
GREEN = (127, 255, 0)   # Neon Green
RED = (50, 50, 255)     # Crimson Red
ORANGE = (0, 165, 255)  # Warning Orange
BLUE = (255, 127, 0)    # Royal Blue
WHITE = (255, 255, 255) # White
YELLOW = (0, 255, 255)  # Yellow

while True:
    success, frame = cam.read()
    if not success:
        break

    h, w, c = frame.shape
    current_time = time.time()

    # Clear feedback notifications after 2.5 seconds
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

        # Extract landmark visibilities and locations
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

        # Convert to pixel coordinates
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

        # Calculate elbow angles
        arm_angles = []
        if l_arm_visible:
            l_elbow_angle = calculate_angle(l_shoulder, l_elbow, l_wrist)
            arm_angles.append(l_elbow_angle)
        if r_arm_visible:
            r_elbow_angle = calculate_angle(r_shoulder, r_elbow, r_wrist)
            arm_angles.append(r_elbow_angle)
        
        if arm_angles:
            elbow_angle = np.mean(arm_angles)

        # Calculate spine/back angles (Shoulder-Hip-Knee)
        back_angles = []
        if l_knee_visible:
            l_back_angle = calculate_angle(l_shoulder, l_hip, l_knee)
            back_angles.append(l_back_angle)
        if r_knee_visible:
            r_back_angle = calculate_angle(r_shoulder, r_hip, r_knee)
            back_angles.append(r_back_angle)
        
        if back_angles:
            back_angle = np.mean(back_angles)

        # Calculate overall body line angles (Shoulder-Hip-Ankle)
        plank_angles = []
        if l_ankle_visible:
            l_plank_angle = calculate_angle(l_shoulder, l_hip, l_ankle)
            plank_angles.append(l_plank_angle)
        if r_ankle_visible:
            r_plank_angle = calculate_angle(r_shoulder, r_hip, r_ankle)
            plank_angles.append(r_plank_angle)

        if plank_angles:
            plank_angle = np.mean(plank_angles)

        # Calculate physical standing vs. lying ratio using Pose World Landmarks (in metric meters)
        if results.pose_world_landmarks:
            world_landmarks = results.pose_world_landmarks.landmark
            l_shoulder_world = world_landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            l_hip_world = world_landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            r_shoulder_world = world_landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            r_hip_world = world_landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]

            vertical_ratios = []
            if l_shoulder_lm.visibility > 0.5 and l_hip_lm.visibility > 0.5:
                vertical_ratios.append(calculate_vertical_ratio(l_shoulder_world, l_hip_world))
            if r_shoulder_lm.visibility > 0.5 and r_hip_lm.visibility > 0.5:
                vertical_ratios.append(calculate_vertical_ratio(r_shoulder_world, r_hip_world))

            if vertical_ratios:
                vertical_ratio = np.mean(vertical_ratios)

        # Classify orientation: Torso angle with horizontal plane must be horizontal (ratio < 0.65)
        is_horizontal = (vertical_ratio is None or vertical_ratio < 0.65)

        # PUSH-UP BIOMECHANICAL STATE MACHINE
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
                                feedback_color = ORANGE
                            elif not rep_is_form_valid:
                                bad_reps += 1
                                feedback_message = rep_feedback
                                feedback_color = RED
                            else:
                                good_reps += 1
                                feedback_message = "GOOD REP!"
                                feedback_color = GREEN
                            
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
                feedback_color = YELLOW
                feedback_timer = current_time

        # DRAW BODY CORRESPONDENCES WITH COLOR-CODED CORRECTNESS
        # Draw full core alignment lines (Green if straight and lying down, Red if sagging/piked or standing)
        if l_shoulder_lm.visibility > 0.5 and l_hip_lm.visibility > 0.5:
            l_back_ok = (l_back_angle is None or l_back_angle > 145)
            l_plank_ok = (l_plank_angle is None or l_plank_angle > 145)
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
            r_back_ok = (r_back_angle is None or r_back_angle > 145)
            r_plank_ok = (r_plank_angle is None or r_plank_angle > 145)
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

        # Draw arm lines and display current elbow angles
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

    # DRAW PREMIUM HUD OVERLAY PANEL
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 80), (30, 30, 30), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    # Calculate Accuracy
    accuracy = 100 if total_reps == 0 else int((good_reps / total_reps) * 100)

    # Render details inside the HUD
    cv2.putText(frame, f"GOOD: {good_reps}  BAD: {bad_reps}  ACC: {accuracy}%", (20, 30), cv2.FONT_HERSHEY_DUPLEX, 0.7, GREEN, 2)
    cv2.putText(frame, f"STAGE: {stage.upper()}", (20, 65), cv2.FONT_HERSHEY_DUPLEX, 0.7, WHITE, 2)

    if feedback_message:
        cv2.putText(frame, feedback_message, (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, feedback_color, 2)
    else:
        if vertical_ratio is not None and vertical_ratio >= 0.65:
            cv2.putText(frame, "PLEASE LIE DOWN TO PLANK", (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, YELLOW, 2)
        elif back_angle is not None or plank_angle is not None:
            # Bad posture checks on whichever parts are visible
            bad_back = (back_angle is not None and back_angle < 145)
            bad_plank = (plank_angle is not None and plank_angle < 145)
            if bad_back or bad_plank:
                cv2.putText(frame, "KEEP CORE ALIGNED!", (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, RED, 2)
            else:
                cv2.putText(frame, "FORM: GOOD", (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, GREEN, 2)
        else:
            cv2.putText(frame, "FORM: DETECTING...", (350, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, YELLOW, 2)

    cv2.imshow("Push-up Counter", frame)

    if cv2.waitKey(1) == ord('q'):
        break

cam.release()
pose.close()
cv2.destroyAllWindows()