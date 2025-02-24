class MediaPipePose {
  constructor(videoElement, canvasElement) {
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
      console.log('Pose detected:', results.poseLandmarks ? 'yes' : 'no');
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
    console.log('Starting camera...');
    const camera = new Camera(this.video, {
      onFrame: async () => {
        await this.pose.send({image: this.video});
      },
      width: 640,
      height: 480
    });
    await camera.start();
    console.log('Camera started');
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