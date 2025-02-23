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
            
            return new Promise((resolve, reject) => {
                this.video.onloadedmetadata = async () => {
                    try {
                        console.log('3. Video metadata loaded');
                        await this.video.play();
                        console.log('4. Video playing');
                        
                        document.getElementById('loading').style.display = 'flex';
                        console.log('5. Starting detector initialization');
                        const initialized = await this.detector.initialize();
                        console.log('6. Detector initialized:', initialized);
                        document.getElementById('loading').style.display = 'none';
                        
                        if (initialized) {
                            console.log('7. Starting detection loop');
                            this.detectAndDraw();
                            resolve(true);
                        } else {
                            reject(new Error('Failed to initialize detector'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                // Clear timeout on success
                const timeoutId = setTimeout(() => reject(new Error('Video metadata load timeout')), 10000);
                this.video.onloadedmetadata = () => {
                    clearTimeout(timeoutId);
                    // ... rest of the code
                };
            });
        } catch (error) {
            console.error('Initialization error:', error);
            return false;
        }
    }

    async detectAndDraw() {
        if (!this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
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
                requestAnimationFrame(() => this.detectAndDraw());
                this.lastFrameTime = now;
            } else {
                setTimeout(() => this.detectAndDraw(), 1);
            }
        }
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