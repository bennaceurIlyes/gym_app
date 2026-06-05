import cv2
import mediapipe as mp
import numpy as np
import time

# get pose model from mediapipe
mp_pose = mp.solutions.pose

# function to calculate angle between three points (e.g. shoulder, elbow, wrist)
# got this math from a tutorial using arctan2
def calculate_angle(a, b, c):
    a = np.array(a) # first point
    b = np.array(b) # middle point (the vertex)
    c = np.array(c) # third point

    # calculate angle in radians and convert to degrees
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)

    # force angle to be inside 180 degrees
    if angle > 180:
        angle = 360 - angle

    return angle

# check if body is vertical (standing) or horizontal (plank)
# using 3D world landmarks in meters. Y-axis is vertical height difference.
# this is much better than 2D screen pixels because it works at any camera angle!
def calculate_vertical_ratio(shoulder_world, hip_world):
    dx = shoulder_world.x - hip_world.x
    dy = shoulder_world.y - hip_world.y
    dz = shoulder_world.z - hip_world.z
    
    # 3D distance of torso
    distance_3d = np.sqrt(dx**2 + dy**2 + dz**2)
    if distance_3d == 0:
        return 1.0
    # ratio of height difference to total torso length
    return abs(dy) / distance_3d

# setup camera
cam = cv2.VideoCapture(0)
if not cam.isOpened():
    print("Error: Could not open webcam.")
    exit()

# load pose detection with confidence thresholds
pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# variables to track my pushups
counter = 0
stage = "up"  # starts at the up position
last_rep_time = 0
is_rep_valid = True

# message displayed on screen to help me
feedback_message = "START PUSH-UPS"
feedback_color = (0, 255, 255) # start with yellow
feedback_timer = time.time()

# color values for drawing HUD and skeleton
GREEN = (127, 255, 0)   # for correct form
RED = (50, 50, 255)     # for incorrect form or warnings
BLUE = (255, 127, 0)    # for arms drawing
WHITE = (255, 255, 255) # for joint dots
YELLOW = (0, 255, 255)  # for warnings or info text

while True:
    success, frame = cam.read()
    if not success:
        break

    h, w, c = frame.shape
    current_time = time.time()

    # hide feedback message after 2.5 seconds so screen stays clean
    if current_time - feedback_timer > 2.5:
        feedback_message = ""

    # process frame with mediapipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_frame)

    # reset values for this frame
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

        # get all keypoints needed for arms, back, hips, knees and ankles
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

        # check which joints are visible to avoid crash and bad calculation
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

        # convert normalized coordinates (0 to 1) to screen pixels (width and height)
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

        # calculate elbow angles for left and right arm
        arm_angles = []
        if l_arm_visible:
            l_elbow_angle = calculate_angle(l_shoulder, l_elbow, l_wrist)
            arm_angles.append(l_elbow_angle)
        if r_arm_visible:
            r_elbow_angle = calculate_angle(r_shoulder, r_elbow, r_wrist)
            arm_angles.append(r_elbow_angle)
        
        # use average if both arms visible
        if arm_angles:
            elbow_angle = np.mean(arm_angles)

        # calculate spine angle (shoulder-hip-knee)
        back_angles = []
        if l_knee_visible:
            l_back_angle = calculate_angle(l_shoulder, l_hip, l_knee)
            back_angles.append(l_back_angle)
        if r_knee_visible:
            r_back_angle = calculate_angle(r_shoulder, r_hip, r_knee)
            back_angles.append(r_back_angle)
        
        if back_angles:
            back_angle = np.mean(back_angles)

        # calculate full body line angle (shoulder-hip-ankle)
        plank_angles = []
        if l_ankle_visible:
            l_plank_angle = calculate_angle(l_shoulder, l_hip, l_ankle)
            plank_angles.append(l_plank_angle)
        if r_ankle_visible:
            r_plank_angle = calculate_angle(r_shoulder, r_hip, r_ankle)
            plank_angles.append(r_plank_angle)

        if plank_angles:
            plank_angle = np.mean(plank_angles)

        # check standing vs lying down using 3D world coordinates
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

        # horizontal position classified when vertical ratio is small (< 0.55)
        # this corresponds to a torso slope < 33 degrees
        is_horizontal = (vertical_ratio is not None and vertical_ratio < 0.55)

        # pushup counting state machine logic (only works if i am horizontal!)
        if is_horizontal:
            if elbow_angle is not None:
                # 1. user goes down (arms bend < 100 degrees)
                if stage == "up" and elbow_angle < 100:
                    stage = "down"
                    is_rep_valid = True  # reset validation flag for this rep

                # 2. check if posture remains straight while user is in down phase
                if stage == "down":
                    # if back or plank line bends too much (< 150 degrees), rep becomes invalid
                    if back_angle is not None and back_angle < 150:
                        is_rep_valid = False
                    if plank_angle is not None and plank_angle < 150:
                        is_rep_valid = False

                    # 3. user pushes back up (arms extend > 150 degrees)
                    if elbow_angle > 150:
                        # only transition to 'up' and count the rep if the 1.0s debounce time passed.
                        # this prevents ignoring reps that are pushed up quickly!
                        if current_time - last_rep_time > 1.0:
                            stage = "up"
                            if is_rep_valid:
                                counter += 1
                                feedback_message = "GOOD REP!"
                                feedback_color = GREEN
                            else:
                                feedback_message = "REP DISCARDED: KEEP CORE TIGHT!"
                                feedback_color = RED
                            last_rep_time = current_time
                            feedback_timer = current_time
        else:
            # reset stage when i stand up so it doesnt get stuck
            stage = "up"
            is_rep_valid = False

        # draw skeleton lines with color feedback (green if correct, red if bad/standing)
        if l_shoulder_lm.visibility > 0.5 and l_hip_lm.visibility > 0.5:
            l_back_ok = (l_back_angle is None or l_back_angle > 150)
            l_plank_ok = (l_plank_angle is None or l_plank_angle > 150)
            l_form_ok = l_back_ok and l_plank_ok
            back_color = GREEN if (l_form_ok and is_horizontal) else RED
            
            # draw body lines segments
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

        # draw arm joints and lines
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

    # draw dark HUD overlay at the top of the frame
    # only copy and overlay the top 80 pixels to optimize performance!
    hud_height = 80
    overlay = frame[0:hud_height, 0:w].copy()
    cv2.rectangle(overlay, (0, 0), (w, hud_height), (30, 30, 30), -1)
    cv2.addWeighted(overlay, 0.6, frame[0:hud_height, 0:w], 0.4, 0, frame[0:hud_height, 0:w])

    # write info on HUD
    cv2.putText(frame, f"REPS: {counter}", (30, 50), cv2.FONT_HERSHEY_DUPLEX, 1.1, GREEN, 2)
    cv2.putText(frame, f"STAGE: {stage.upper()}", (210, 50), cv2.FONT_HERSHEY_DUPLEX, 0.9, WHITE, 2)

    # display relevant warning/form message
    if feedback_message:
        cv2.putText(frame, feedback_message, (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, feedback_color, 2)
    else:
        if vertical_ratio is not None and vertical_ratio >= 0.55:
            cv2.putText(frame, "PLEASE LIE DOWN TO PLANK", (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, YELLOW, 2)
        elif back_angle is not None or plank_angle is not None:
            # show core warning if any part is bent
            bad_back = (back_angle is not None and bad_back < 150 if 'bad_back' in locals() else back_angle < 150) # wait, let's keep it direct
            bad_back = (back_angle is not None and back_angle < 150)
            bad_plank = (plank_angle is not None and plank_angle < 150)
            if bad_back or bad_plank:
                cv2.putText(frame, "KEEP CORE ALIGNED!", (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, RED, 2)
            else:
                cv2.putText(frame, "FORM: GOOD", (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, GREEN, 2)
        else:
            cv2.putText(frame, "FORM: DETECTING...", (390, 50), cv2.FONT_HERSHEY_DUPLEX, 0.8, YELLOW, 2)

    cv2.imshow("Push-up Counter", frame)

    # exit on 'q' key
    if cv2.waitKey(1) == ord('q'):
        break

cam.release()
cv2.destroyAllWindows()
