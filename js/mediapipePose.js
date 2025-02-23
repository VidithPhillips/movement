class MediaPipePose {
  constructor(video, canvas) {
    this.initializeWithRetry();
  }

  async initializeWithRetry(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.initialize();
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  validateDependencies() {
    if (typeof window.THREE === 'undefined') {
      throw new ApplicationError('THREE.js must be loaded first', 'DEPENDENCY_MISSING', false);
    }
    if (typeof window.PoseVisualizer3D !== 'function') {
      throw new ApplicationError('PoseVisualizer3D must be loaded first', 'DEPENDENCY_MISSING', false);
    }
  }

  initializeComponents(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isRunning = false;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.performanceMetrics = {
      fps: 0,
      processingTime: 0,
      memoryUsage: 0
    };

    const container = document.querySelector('.video-container');
    if (!container) {
      throw new ApplicationError('Video container not found', 'INITIALIZATION_FAILED', false);
    }
    this.visualizer3D = new window.PoseVisualizer3D(container);
  }

  setupPoseDetection() {
    this.pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults((results) => this.processResults(results));
  }

  setupPerformanceMonitoring() {
    this.performanceMonitor = setInterval(() => this.updatePerformanceMetrics(), 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  async start() {
    try {
      await this.initializeCamera();
      this.isRunning = true;
      console.log('Camera and processing started successfully');
    } catch (error) {
      const appError = new ApplicationError(
        'Failed to start camera',
        'CAMERA_ACCESS_DENIED',
        true
      );
      ErrorHandler.handleError(appError, 'MediaPipePose.start');
      throw appError;
    }
  }

  async initializeCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });
    
    this.video.srcObject = stream;
    
    await new Promise((resolve) => {
      this.video.onloadedmetadata = async () => {
        await this.video.play();
        resolve();
      };
    });

    this.camera = new Camera(this.video, {
      onFrame: async () => {
        if (this.isRunning) {
          const startTime = performance.now();
          await this.pose.send({ image: this.video });
          this.performanceMetrics.processingTime = performance.now() - startTime;
        }
      },
      width: 640,
      height: 480
    });

    await this.camera.start();
  }

  processResults(results) {
    if (!this.isRunning) return;

    const startTime = performance.now();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

    if (results.poseLandmarks) {
      this.drawPose(results);
      this.updateMetrics(results);
      this.update3DVisualization(results);
    }

    this.frameCount++;
    this.performanceMetrics.processingTime = performance.now() - startTime;
  }

  drawPose(results) {
    drawConnectors(this.ctx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 2
    });
    drawLandmarks(this.ctx, results.poseLandmarks, {
      color: '#FF0000',
      lineWidth: 1
    });
  }

  updateMetrics(results) {
    if (!this.analyzer) {
      this.analyzer = new MovementAnalyzer();
    }
    this.analyzer.updateMetrics(results);
  }

  update3DVisualization(results) {
    if (this.visualizer3D) {
      this.visualizer3D.updatePose(results);
    }
  }

  updatePerformanceMetrics() {
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastFrameTime;
    
    this.performanceMetrics.fps = Math.round((this.frameCount * 1000) / elapsed);
    if ('memory' in performance) {
      this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
    }

    this.frameCount = 0;
    this.lastFrameTime = currentTime;

    window.dispatchEvent(new CustomEvent('performance-update', {
      detail: this.performanceMetrics
    }));
  }

  pause() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
    }
  }

  resume() {
    this.isRunning = true;
    if (this.camera) {
      this.camera.start();
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
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
    }
    if (this.visualizer3D) {
      this.visualizer3D.dispose();
    }
  }

  dispose() {
    this.stop();
    this.visualizer3D?.dispose();
    this.pose?.close();
  }
} 