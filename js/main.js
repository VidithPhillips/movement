class MovementAnalysisApp {
    constructor() {
        // Set canvas size immediately
        this.canvas = document.getElementById('output');
        this.canvas.width = 640;
        this.canvas.height = 480;
        
        // Store timestamp for FPS calculation
        this.lastDrawTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.rafId = null;  // Store requestAnimationFrame ID
        this.lastFrameTime = 0;
        this.targetFrameInterval = 1000 / 30; // Increase to 30 FPS like iris-track
        
        this.video = document.getElementById('video');
        
        this.detector = new PoseDetector();
        this.visualizer = new PoseVisualizer(this.canvas);
        this.analyzer = new MovementAnalyzer();
        
        this.isRunning = true; // Start running immediately
        this.analyticsInterval = null; // To hold interval for analytics updates
        this.lastPoseDetectionTime = 0;
        this.detectionInterval = 1000 / 30;  // Limit to 30 FPS
        
        // Add video error handling
        this.video.onerror = (e) => {
            console.error('Video error:', e);
        };
        
        this.video.onplaying = () => {
            console.log('Video is actually playing');
        };
    }

    async initialize() {
        try {
            console.log('1. Starting initialization...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: 640,
                    height: 480,
                    frameRate: 30
                },
                audio: false
            });
            console.log('2. Camera access granted');
            this.video.srcObject = stream;

            // Wait for video metadata and start playing once loaded
            await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Video metadata load timeout'));
                }, 10000);
                this.video.onloadedmetadata = async () => {
                    clearTimeout(timeoutId);
                    try {
                        await this.video.play();
                        console.log('3. Video metadata loaded & playing');
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                };
            });

            // Show loading indicator until detector is ready
            document.getElementById('loading').style.display = 'flex';
            console.log('4. Starting detector initialization');
            const initialized = await this.detector.initialize();
            console.log('5. Detector initialized:', initialized);
            document.getElementById('loading').style.display = 'none';

            if (!initialized) {
                throw new Error('Failed to initialize detector');
            }

            // Set up loop timing variables
            this.isRunning = true;
            this.lastFrameTime = performance.now();
            this.targetFrameInterval = 1000 / 30; // ~30 FPS

            console.log('6. Starting detection loop');
            this.detectAndDraw();
            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            return false;
        }
    }

    async detectAndDraw() {
        if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(() => this.detectAndDraw());
            return;
        }
        
        try {
            let pose = await this.detector.detectPose(this.video);
            
            if (pose) {
                this.visualizer.drawSkeleton(pose);
                this.visualizer.drawKeypoints(pose);
                const angles = this.detector.calculateJointAngles(pose);
                this.visualizer.drawAngles(pose, angles);
                this.analyzer.updateMetrics(pose, this.detector);
            }
            this.visualizer.clear();
        } catch (error) {
            console.error('Detection error:', error);
        }
        
        if (this.isRunning) {
            const now = performance.now();
            if (now - this.lastFrameTime >= this.targetFrameInterval) {
                this.lastFrameTime = now;
                requestAnimationFrame(() => this.detectAndDraw());
            } else {
                setTimeout(() => this.detectAndDraw(), 1);
            }
        }
    }
}

// Start the application when the page loads
window.onload = async () => {
    try {
        // Debug logging
        console.log('Initialization start');
        console.log('THREE loaded:', typeof THREE !== 'undefined');
        console.log('PoseVisualizer3D loaded:', typeof PoseVisualizer3D !== 'undefined');
        console.log('MovementAnalyzer loaded:', typeof MovementAnalyzer !== 'undefined');

        // Check DOM elements
        const video = document.getElementById('video');
        const canvas = document.getElementById('output');
        console.log('Video element:', video);
        console.log('Canvas element:', canvas);

        if (!video || !canvas) {
            throw new Error('Required video or canvas element not found');
        }

        // Initialize pose detection
        console.log('Initializing MediaPipePose...');
        window.poseDetector = new MediaPipePose(video, canvas);
        console.log('MediaPipePose initialized');
        
        await window.poseDetector.start();
        console.log('Pose detection started');

    } catch (error) {
        console.error('Initialization failed:', error);
        document.getElementById('loading').innerHTML = `
            <div class="loading-error">
                Failed to initialize: ${error.message}
            </div>`;
    }
};

// Clean up on page unload
window.onbeforeunload = () => {
    if (window.poseDetector) {
        window.poseDetector.stop();
    }
}; 