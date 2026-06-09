export const getWebViewHtml = (serverIp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          overflow: hidden; 
          background-color: #0f172a; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #video { 
          width: 100vw; 
          height: 100vh; 
          object-fit: cover;
          transform: scaleX(-1); /* Mirror front camera */
          position: absolute;
          top: 0;
          left: 0;
        }
        #canvas { 
          width: 100vw; 
          height: 100vh; 
          object-fit: cover;
          transform: scaleX(-1); /* Match mirrored video */
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
          pointer-events: none;
        }
        #loading {
          position: absolute;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #38bdf8;
          font-weight: bold;
          font-size: 16px;
          text-align: center;
          width: 80%;
          line-height: 24px;
          z-index: 20;
        }
        .error-title {
          color: #ef4444;
          font-size: 18px;
          margin-bottom: 8px;
        }
        .error-detail {
          color: #94a3b8;
          font-size: 12px;
          font-weight: normal;
          text-align: left;
          background-color: #1e293b;
          padding: 10px;
          border-radius: 8px;
          overflow-x: auto;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div id="loading">Initializing Phone Camera & Pose AI...<br><span style="font-size:12px;color:#64748b;font-weight:normal;">Please ensure camera access is granted.</span></div>
      <video id="video" playsinline webkit-playsinline muted autoplay></video>
      <canvas id="canvas"></canvas>
      <script>
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const loadingDiv = document.getElementById('loading');
        
        // Show diagnostics if scripts fail
        window.onerror = function(message, source, lineno, colno, error) {
          if (loadingDiv) {
            loadingDiv.innerHTML = \`
              <div class="error-title">JavaScript Runtime Error</div>
              <div style="font-size:14px;color:#cbd5e1;">The Pose tracking engine crashed during startup.</div>
              <div class="error-detail">
                <strong>Error:</strong> \${message}<br>
                <strong>Source:</strong> \${source.split('/').pop()}:\${lineno}:\${colno}
              </div>
            \`;
          }
          return false;
        };

        function resizeCanvas() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Check for WebRTC mediaDevices support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("navigator.mediaDevices.getUserMedia is undefined. Browser/WebView blocked insecure WebRTC access. Use localhost or HTTPS.");
        }

        // Check if CDN loaded classes
        if (typeof Pose === 'undefined') {
          throw new Error("MediaPipe Pose class is not defined. CDN scripts failed to load. Check internet connection.");
        }
        if (typeof Camera === 'undefined') {
          throw new Error("MediaPipe Camera class is not defined. CDN scripts failed to load. Check internet connection.");
        }

        const pose = new Pose({
          locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/pose/\${file}\`
        });
        
        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults(onResults);

        let feedbackColor = '#00D2FF';
        let elbowAngle = null;
        let backAngle = null;

        function hexToRgba(hex, alpha) {
          hex = hex.replace('#', '');
          if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
          }
          let r = parseInt(hex.substring(0, 2), 16) || 0;
          let g = parseInt(hex.substring(2, 4), 16) || 0;
          let b = parseInt(hex.substring(4, 6), 16) || 0;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        // Draw connections helper
        function drawConnectors(ctx, landmarks, connections, defaultColor, lineWidth) {
          connections.forEach(([i, j]) => {
            const first = landmarks[i];
            const second = landmarks[j];
            if (first && second && first.visibility > 0.5 && second.visibility > 0.5) {
              ctx.beginPath();
              ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
              ctx.lineTo(second.x * canvas.width, second.y * canvas.height);
              
              // Color code specific bones
              const isSpine = (i === 11 && j === 23) || (i === 23 && j === 25) || (i === 25 && j === 27) ||
                              (i === 12 && j === 24) || (i === 24 && j === 26) || (i === 26 && j === 28);
              const isArm = (i === 11 && j === 13) || (i === 13 && j === 15) ||
                            (i === 12 && j === 14) || (i === 14 && j === 16);
              
              if (isSpine) {
                ctx.strokeStyle = feedbackColor; // turns red/orange/green dynamically
                ctx.lineWidth = 4;
              } else if (isArm) {
                ctx.strokeStyle = '#00D2FF'; // electric cyan arms
                ctx.lineWidth = 4;
              } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // muted gray/white for secondary bones
                ctx.lineWidth = 2;
              }
              
              ctx.stroke();
            }
          });
        }

        // Draw glowing joint landmarks helper
        const ACTIVE_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]; // shoulders, elbows, wrists, hips, knees, ankles

        function drawLandmarks(ctx, landmarks, defaultColor, radius) {
          landmarks.forEach((lm, idx) => {
            if (lm.visibility > 0.5) {
              const isActive = ACTIVE_JOINTS.includes(idx);
              const x = lm.x * canvas.width;
              const y = lm.y * canvas.height;
              
              if (isActive) {
                // Glow Ring 2
                ctx.beginPath();
                ctx.arc(x, y, 15, 0, 2 * Math.PI);
                ctx.fillStyle = hexToRgba(feedbackColor, 0.15);
                ctx.fill();

                // Glow Ring 1
                ctx.beginPath();
                ctx.arc(x, y, 9, 0, 2 * Math.PI);
                ctx.fillStyle = hexToRgba(feedbackColor, 0.4);
                ctx.fill();

                // Solid Core
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
              } else {
                // Secondary joints (small translucent dot)
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
              }
            }
          });
        }

        // Draw dynamic joint flex angle gauges around elbows
        function drawElbowGauge(ctx, a, b, c) {
          if (!a || !b || !c || a.visibility < 0.5 || b.visibility < 0.5 || c.visibility < 0.5) return;
          
          let dx1 = a.x - b.x;
          let dy1 = a.y - b.y;
          let dx2 = c.x - b.x;
          let dy2 = c.y - b.y;
          
          let ang1 = Math.atan2(dy1, dx1);
          let ang2 = Math.atan2(dy2, dx2);
          
          let angle = Math.abs((ang2 - ang1) * 180 / Math.PI);
          if (angle > 180) angle = 360 - angle;
          
          const bx = b.x * canvas.width;
          const by = b.y * canvas.height;
          
          // Draw circular arc around elbow
          ctx.beginPath();
          ctx.arc(bx, by, 26, ang1, ang2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          
          // Draw neon glowing arc overlay
          ctx.beginPath();
          ctx.arc(bx, by, 26, ang1, ang2);
          ctx.strokeStyle = hexToRgba(feedbackColor, 0.25);
          ctx.lineWidth = 7;
          ctx.stroke();

          // Render angle text cell next to elbow
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px sans-serif';
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 4;
          let textX = bx + (a.x < b.x ? 32 : -50);
          let textY = by - 8;
          ctx.fillText(Math.round(angle) + '°', textX, textY);
          ctx.shadowBlur = 0;
        }

        const POSE_CONNECTIONS = [
          [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body
          [11, 23], [12, 24], [23, 24], // Torso
          [23, 25], [25, 27], [24, 26], [26, 28] // Lower body
        ];

        function onResults(results) {
          if (loadingDiv && loadingDiv.style.display !== 'none') {
            loadingDiv.style.display = 'none';
          }
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            // Draw custom styled connectors and glowing nodes
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, '#007FFF', 3);
            drawLandmarks(ctx, results.poseLandmarks, '#FFFFFF', 5);

            // Draw individual real-time elbow gauges
            const l_shoulder = results.poseLandmarks[11];
            const l_elbow = results.poseLandmarks[13];
            const l_wrist = results.poseLandmarks[15];
            drawElbowGauge(ctx, l_shoulder, l_elbow, l_wrist);

            const r_shoulder = results.poseLandmarks[12];
            const r_elbow = results.poseLandmarks[14];
            const r_wrist = results.poseLandmarks[16];
            drawElbowGauge(ctx, r_shoulder, r_elbow, r_wrist);

            // Send landmarks to python server for state machine processing
            sendLandmarksToPython(results.poseLandmarks, results.poseWorldLandmarks);
          }
        }

        let lastSendTime = 0;
        async function sendLandmarksToPython(landmarks, worldLandmarks) {
          const now = Date.now();
          if (now - lastSendTime < 120) return; // Throttle to ~8 FPS
          lastSendTime = now;

          try {
            const response = await fetch('http://${serverIp}:5000/process_landmarks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ landmarks, world_landmarks: worldLandmarks })
            });
            const data = await response.json();
            // Send back to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
            
            // Save state for dynamic local drawings
            if (data) {
              feedbackColor = data.color || '#00D2FF';
              elbowAngle = data.elbow_angle;
              backAngle = data.back_angle;
            }
          } catch (e) {
            console.error('Error sending landmarks:', e);
          }
        }

        navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        })
        .then(stream => {
          video.srcObject = stream;
          video.muted = true;
          video.play();
          
          const camera = new Camera(video, {
            onFrame: async () => {
              await pose.send({ image: video });
            },
            width: 640,
            height: 480
          });
          camera.start();
        })
        .catch(err => {
          loadingDiv.innerHTML = \`
            <div class="error-title">Camera Access Error</div>
            <div style="font-size:14px;color:#cbd5e1;">WebRTC camera request was rejected.</div>
            <div class="error-detail">
              <strong>Error:</strong> \${err.message || err.name || err}
            </div>
          \`;
          console.error(err);
        });
      </script>
    </body>
    </html>
  `;
};
