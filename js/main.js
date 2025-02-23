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
                    frameRate: { max: 60 }  // Allow higher framerates
                },
                audio: false
            });
            this.video.srcObject = stream;
            
            return new Promise(async resolve => {
                this.video.onloadedmetadata = async () => {
                    this.video.play();
                    console.log('Camera initialized successfully');
                    // Start everything immediately
                    await this.startTracking();
                    resolve(true);
                };
                // Add error timeout
                setTimeout(() => resolve(false), 10000);
            });
        } catch (error) {
            console.error('Camera initialization error:', error);
            return false;
        }
    }

    async startTracking() {
        // Initialize detector
        document.getElementById('loading').style.display = 'flex';
        const initialized = await this.detector.initialize();
        document.getElementById('loading').style.display = 'none';
        
        if (initialized) {
            // Start immediate tracking
            this.detectAndDraw();
            // Update metrics more frequently
            this.analyticsInterval = setInterval(() => {
                if (this.detector.lastPose) {
                    this.analyzer.updateMetrics(this.detector.lastPose, this.detector);
                }
            }, 33); // ~30fps updates
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
        // Always running
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        // Use RAF timing instead of manual frame skipping
        this.lastFrameTime = now;

        let pose = await this.detector.detectPose(this.video);
        if (pose) {
            this.visualizer.drawSkeleton(pose);
            this.visualizer.drawKeypoints(pose);
            // Only draw angles if we're in full body mode
            if (this.analyzer.mode === 'full') {
                const angles = this.detector.calculateJointAngles(pose);
                this.visualizer.drawAngles(pose, angles);
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