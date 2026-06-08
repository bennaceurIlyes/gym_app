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

        // Draw connections helper
        function drawConnectors(ctx, landmarks, connections, color, lineWidth) {
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          connections.forEach(([i, j]) => {
            const first = landmarks[i];
            const second = landmarks[j];
            if (first && second && first.visibility > 0.5 && second.visibility > 0.5) {
              ctx.beginPath();
              ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
              ctx.lineTo(second.x * canvas.width, second.y * canvas.height);
              ctx.stroke();
            }
          });
        }

        // Draw landmarks helper
        function drawLandmarks(ctx, landmarks, color, radius) {
          ctx.fillStyle = color;
          landmarks.forEach((lm) => {
            if (lm.visibility > 0.5) {
              ctx.beginPath();
              ctx.arc(lm.x * canvas.width, lm.y * canvas.height, radius, 0, 2 * Math.PI);
              ctx.fill();
            }
          });
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
            // Draw skeleton lines
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, '#007FFF', 3);
            // Draw joint dots
            drawLandmarks(ctx, results.poseLandmarks, '#FFFFFF', 5);

            // Send landmarks to python server for state machine
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
