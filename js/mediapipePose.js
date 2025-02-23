class MediaPipePose {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Initialize the MediaPipe Pose instance with a locateFile helper.
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });
    
    // Set MediaPipe options.
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    // Bind the onResults callback.
    this.pose.onResults(this.onResults.bind(this));
  }

  async start() {
    // Use MediaPipe's Camera helper to process video frames.
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        await this.pose.send({ image: this.video });
      },
      width: 640,
      height: 480
    });
    this.camera.start();
  }

  onResults(results) {
    // Clear the canvas.
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw the current video frame.
    this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
    
    // If pose landmarks are detected, draw connectors and points.
    if (results.poseLandmarks) {
      // Draw connections.
      drawConnectors(this.ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 4
      });
      // Draw landmarks.
      drawLandmarks(this.ctx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 2
      });
    }
  }
} 