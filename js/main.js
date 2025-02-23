class MovementAnalysisApp {
    constructor() {
        // Store timestamp for FPS calculation
        this.lastDrawTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('output');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.baselineBtn = document.getElementById('baselineBtn');
        
        this.detector = new PoseDetector();
        this.visualizer = new PoseVisualizer(this.canvas);
        this.analyzer = new MovementAnalyzer();
        
        this.isRunning = false;
        this.analyticsInterval = null; // To hold interval for analytics updates
        this.lastPoseDetectionTime = 0;
        this.detectionInterval = 1000 / 30;  // Limit to 30 FPS
        this.setupEventListeners();
    }

    async initialize() {
        try {
            // Setup camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });
            this.video.srcObject = stream;
            
            return new Promise(resolve => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    this.canvas.width = this.video.width;
                    this.canvas.height = this.video.height;
                    // Enable hardware acceleration
                    this.canvas.getContext('2d', { 
                        alpha: false,
                        desynchronized: true
                    });
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Error initializing camera:', error);
            return false;
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleAnalysis());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.baselineBtn.addEventListener('click', () => this.captureBaseline());
    }

    captureBaseline() {
        if (!this.detector.lastPose) {
            alert("No pose detected yet. Please ensure you are in frame before capturing the baseline.");
            return;
        }
        // Calculate current joint angles and set as baseline
        const angles = this.detector.calculateJointAngles(this.detector.lastPose);
        this.analyzer.setBaseline(angles);
        alert("Baseline captured!");
    }

    async toggleAnalysis() {
        if (!this.isRunning) {
            document.getElementById('loading').style.display = 'flex';
            const initialized = await this.detector.initialize();
            document.getElementById('loading').style.display = 'none';
            if (!initialized) {
                alert('Failed to initialize pose detector');
                return;
            }
            this.isRunning = true;
            this.startBtn.textContent = 'Stop Analysis';
            // Start the drawing loop
            this.detectAndDraw();
            // Start analytics updates every 500ms
            this.analyticsInterval = setInterval(() => {
                const pose = this.detector.lastPose;
                if (pose) {
                    this.analyzer.updateMetrics(pose, this.detector);
                }
            }, 500);
        } else {
            this.isRunning = false;
            this.startBtn.textContent = 'Start Analysis';
            clearInterval(this.analyticsInterval);
        }
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
        const timeSinceLastDetection = now - this.lastPoseDetectionTime;

        // Throttle pose detection to maintain consistent frame rate
        let pose = this.detector.lastPose;
        if (timeSinceLastDetection >= this.detectionInterval) {
            pose = await this.detector.detectPose(this.video);
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
            this.visualizer.drawSkeleton(pose);
            this.visualizer.drawKeypoints(pose);
            this.visualizer.drawAngles(pose, angles);

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