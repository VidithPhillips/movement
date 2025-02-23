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
            console.log('Waiting for Three.js...');
            await waitForThree();
            console.log('Three.js loaded successfully');

            // Check dependencies
            if (!window.THREE) {
                throw new Error('THREE.js not loaded');
            }
            if (!window.PoseVisualizer3D) {
                throw new Error('PoseVisualizer3D not loaded');
            }
            if (!window.MovementAnalyzer) {
                throw new Error('MovementAnalyzer not loaded');
            }

            console.log('All dependencies loaded');

            // Get DOM elements
            const video = document.getElementById('video');
            const canvas = document.getElementById('output');
            
            if (!video || !canvas) {
                throw new Error('Required video or canvas element not found');
            }

            // Initialize pose detection
            console.log('Initializing MediaPipePose...');
            window.poseDetector = new MediaPipePose(video, canvas);
            console.log('MediaPipePose initialized');
            
            await window.poseDetector.start();
            console.log('Pose detection started');

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

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
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

            // Initialize the MovementAnalysisApp
            const app = new MovementAnalysisApp();
            await app.initialize();

        } catch (error) {
            console.error('Initialization failed:', error);
            document.getElementById('loading').innerHTML = `
                <div class="loading-error">
                    Failed to initialize: ${error.message}
                </div>`;
        }
    });
}

// Clean up on page unload
window.onbeforeunload = () => {
    if (window.poseDetector) {
        window.poseDetector.stop();
    }
};

async function waitForThree() {
    return new Promise((resolve) => {
        if (window.THREE) {
            resolve();
        } else {
            window.addEventListener('load', () => {
                if (window.THREE) {
                    resolve();
                } else {
                    console.error('Three.js failed to load');
                }
            });
        }
    });
} 