class MovementAnalysisApp {
    constructor() {
        // Store timestamp for FPS calculation
        this.lastDrawTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.rafId = null;  // Store requestAnimationFrame ID
        this.lastFrameTime = 0;
        this.targetFrameInterval = 1000 / 30; // Increase to 30 FPS like iris-track
        
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('output');
        this.resetBtn = document.getElementById('resetBtn');
        
        this.detector = new PoseDetector();
        this.visualizer = new PoseVisualizer(this.canvas);
        this.analyzer = new MovementAnalyzer();
        
        this.isRunning = true; // Start running immediately
        this.analyticsInterval = null; // To hold interval for analytics updates
        this.lastPoseDetectionTime = 0;
        this.detectionInterval = 1000 / 30;  // Limit to 30 FPS
        this.setupEventListeners();
    }

    async initialize() {
        try {
            console.log('Starting camera initialization...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });
            this.video.srcObject = stream;
            
            return new Promise(async resolve => {
                this.video.onloadedmetadata = async () => {
                    this.video.play();
                    console.log('Camera initialized successfully');
                    this.canvas.width = this.video.width;
                    this.canvas.height = this.video.height;
                    
                    // Initialize detector immediately
                    document.getElementById('loading').style.display = 'flex';
                    const initialized = await this.detector.initialize();
                    document.getElementById('loading').style.display = 'none';
                    
                    if (initialized) {
                        // Start detection loop immediately
                        this.detectAndDraw();
                        // Start analytics updates
                        this.analyticsInterval = setInterval(() => {
                            const pose = this.detector.lastPose;
                            if (pose) {
                                this.analyzer.updateMetrics(pose, this.detector);
                            }
                        }, 500);
                    }
                    
                    resolve(initialized);
                };
            });
        } catch (error) {
            console.error('Camera initialization error:', error);
            alert('Failed to access camera. Please ensure camera permissions are granted.');
            return false;
        }
    }

    setupEventListeners() {
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    reset() {
        this.analyzer.reset();
        this.visualizer.clear();
        if (this.analyzer.baselineAngles) {
            this.analyzer.baselineAngles = null;
        }
    }

    async detectAndDraw() {
        if (!this.isRunning) return;

        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        // Skip frames to maintain target frame rate
        if (elapsed < this.targetFrameInterval) {
            requestAnimationFrame(() => this.detectAndDraw());
            return;
        }
        this.lastFrameTime = now;

        const timeSinceLastDetection = now - this.lastPoseDetectionTime;

        let pose = this.detector.lastPose;
        if (timeSinceLastDetection >= this.detectionInterval) {
            pose = await this.detector.detectPose(this.video);
            if (pose) {
                console.log('Pose detected:', pose);
            } else {
                console.log('No pose detected this frame');
            }
            this.lastPoseDetectionTime = now;
        }
        
        // Clear with black background
        const ctx = this.canvas.getContext('2d');
        ctx.canvas.width = this.video.videoWidth || 640;
        ctx.canvas.height = this.video.videoHeight || 480;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (pose) {
            const angles = this.detector.calculateJointAngles(pose);
            const faceMetrics = this.detector.calculateFaceMetrics(pose);
            const postureMetrics = this.detector.calculatePosture(pose);
            
            // Draw visualizations
            this.visualizer.drawSkeleton(pose);
            this.visualizer.drawKeypoints(pose);
            this.visualizer.drawAngles(pose, angles);
            
            // Update metrics display
            this.analyzer.updateMetrics(pose, this.detector);

            // Calculate and display FPS
            this.frameCount++;
            if (now - this.lastDrawTime >= 1000) {
                this.fps = this.frameCount;
                this.frameCount = 0;
                this.lastDrawTime = now;
                // Optional: Display FPS
                ctx.font = '16px Inter';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`FPS: ${this.fps}`, 10, 20);
            }
        }
        
        requestAnimationFrame(() => this.detectAndDraw());
    }
}

// Start the application when the page loads
window.onload = async () => {
    const app = new MovementAnalysisApp();
    const initialized = await app.initialize();
    if (!initialized) {
        alert('Failed to initialize camera');
    }
}; 