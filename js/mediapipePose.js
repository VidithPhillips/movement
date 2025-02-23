class MediaPipePose {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults((results) => this.onResults(results));
    
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        await this.pose.send({image: this.video});
      },
      width: 640,
      height: 480
    });
  }

  async start() {
    await this.camera.start();
  }

  onResults(results) {
    // Draw pose
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
    
    if (results.poseLandmarks) {
      // Draw skeleton
      drawConnectors(this.ctx, results.poseLandmarks, POSE_CONNECTIONS, 
        {color: '#00FF00', lineWidth: 2});
      drawLandmarks(this.ctx, results.poseLandmarks, 
        {color: '#FF0000', lineWidth: 1});
      
      // Emit pose data for analysis
      window.dispatchEvent(new CustomEvent('pose-updated', {
        detail: results.poseLandmarks
      }));
    }
  }
} 