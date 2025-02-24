class MediaPipePose {
  constructor(videoElement, canvasElement) {
    if (!videoElement || !canvasElement) {
      throw new Error('Video or canvas element not provided');
    }
    
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    // Initialize pose detection
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    // Add debug logging
    this.pose.onResults((results) => {
      console.log('Pose detection:', results.poseLandmarks ? 'success' : 'no landmarks');
      this.drawResults(results);
      if (results.poseLandmarks) {
        // Dispatch event with landmarks
        window.dispatchEvent(new CustomEvent('pose-updated', {
          detail: results.poseLandmarks
        }));
      }
    });
  }

  async start() {
    try {
      console.log('Starting MediaPipe...');
      this.camera = new Camera(this.video, {
        onFrame: async () => {
          await this.pose.send({image: this.video});
        },
        width: 640,
        height: 480
      });
      await this.camera.start();
      console.log('MediaPipe started successfully');
    } catch (error) {
      console.error('MediaPipe failed to start:', error);
      throw error;
    }
  }

  stop() {
    if (this.camera) {
      this.camera.stop();
    }
  }

  drawResults(results) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (results.poseLandmarks) {
      drawConnectors(this.ctx, results.poseLandmarks, POSE_CONNECTIONS,
        { color: '#00FF00', lineWidth: 2 });
      drawLandmarks(this.ctx, results.poseLandmarks,
        { color: '#FF0000', lineWidth: 1, radius: 3 });
    }
  }
} 