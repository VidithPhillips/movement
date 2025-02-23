class MediaPipePose {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isRunning = false;

    // Initialize 3D visualizer after ensuring the class is loaded
    try {
      this.visualizer3D = new PoseVisualizer3D(
        document.querySelector('.video-container')
      );
      console.log('3D visualizer initialized');
    } catch (error) {
      console.error('Failed to initialize 3D visualizer:', error);
    }

    // Initialize the MediaPipe Pose instance
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });
    
    // Configure pose detection
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    // Bind callbacks
    this.pose.onResults(this.onResults.bind(this));
  }

  async start() {
    try {
      console.log('1. Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      
      this.video.srcObject = stream;
      console.log('2. Camera access granted');

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.onloadedmetadata = async () => {
          await this.video.play();
          resolve();
        };
      });
      console.log('3. Video stream ready');

      // Initialize camera helper
      this.camera = new Camera(this.video, {
        onFrame: async () => {
          if (this.isRunning) {
            await this.pose.send({ image: this.video });
          }
        },
        width: 640,
        height: 480
      });

      // Start camera and processing
      this.isRunning = true;
      await this.camera.start();
      console.log('4. MediaPipe camera started');
      
      // Show success status
      document.getElementById('loading').style.display = 'none';
      
    } catch (error) {
      console.error('Failed to start camera:', error);
      document.getElementById('loading').innerHTML = `
        <div class="loading-error">
          Failed to access camera. Please check permissions and refresh.
        </div>`;
    }
  }

  onResults(results) {
    if (!this.isRunning) return;

    // Clear previous frame
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw video frame
    this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
    
    if (results.poseLandmarks) {
        console.log("Pose detected:", results.poseLandmarks); // Debug log

        // Draw pose using MediaPipe's built-in utilities
        drawConnectors(this.ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
        });
        drawLandmarks(this.ctx, results.poseLandmarks, {
            color: '#FF0000',
            lineWidth: 1
        });

        // Update metrics using MediaPipe's format
        if (!this.analyzer) {
            this.analyzer = new MovementAnalyzer();
        }
        
        // Pass the entire results object to the analyzer
        this.analyzer.updateMetrics(results);

        // Update 3D visualization
        if (this.visualizer3D) {
            this.visualizer3D.updatePose(results);
        }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
    }
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
    }
  }
} 