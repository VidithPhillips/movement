class MovementAnalysis {
    constructor() {
        this.initializeComponents();
        this.setupCamera();
    }

    initializeComponents() {
        // Get DOM elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('output');
        this.canvas.width = 640;
        this.canvas.height = 480;
        
        // Initialize components
        this.pose = new MediaPipePose(this.video, this.canvas);
        this.analyzer = new MovementAnalyzer('movement-metrics');
        this.visualizer = new PoseVisualizer3D(document.querySelector('.video-container'));
    }

    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false
            });
            this.video.srcObject = stream;
            await this.video.play();
            
            // Start pose detection
            await this.pose.start();
        } catch (error) {
            console.error('Failed to initialize:', error);
            // Show error in UI
            const metrics = document.getElementById('movement-metrics');
            metrics.innerHTML = `
                <div class="error-message">
                    Failed to start camera. Please check permissions and refresh.
                </div>
            `;
        }
    }
}

// Start when page loads
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('output');
    
    // Initialize movement analyzer
    const analyzer = new MovementAnalyzer('movement-metrics');
    
    // Initialize pose detection
    const pose = new MediaPipePose(video, canvas);
    pose.start();
});

class MovementAnalysisApp {
    constructor() {
        console.log('Creating MovementAnalysisApp instance');
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

        this.components = new Map();
        this.initialized = false;
    }

    async initialize() {
        try {
            await this.initializeComponents();
            this.setupEventListeners();
            this.initialized = true;
            console.log('Movement Analysis App initialized successfully');
        } catch (error) {
            throw new ApplicationError('Failed to initialize app', 'INITIALIZATION_FAILED', false);
        }
    }

    async initializeComponents() {
        // Initialize in correct order
        const mediaPipePose = new MediaPipePose(
            document.getElementById('video'),
            document.getElementById('output')
        );
        const exerciseDetector = new ExerciseDetector();
        const feedbackSystem = new FeedbackSystem();

        // Store components for cleanup
        this.components.set('pose', mediaPipePose);
        this.components.set('detector', exerciseDetector);
        this.components.set('feedback', feedbackSystem);

        // Start camera
        await mediaPipePose.start();
    }

    dispose() {
        // Cleanup all components
        for (const [name, component] of this.components) {
            if (component && typeof component.dispose === 'function') {
                component.dispose();
            }
        }
        this.components.clear();
        this.initialized = false;
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