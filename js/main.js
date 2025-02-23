class MovementAnalysisApp {
    constructor() {
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
        this.setupEventListeners();
    }

    async initialize() {
        try {
            // Setup camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false
            });
            this.video.srcObject = stream;
            
            return new Promise(resolve => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    this.canvas.width = this.video.width;
                    this.canvas.height = this.video.height;
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
            const initialized = await this.detector.initialize();
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

        const pose = await this.detector.detectPose(this.video);
        
        this.visualizer.clear();
        if (pose) {
            const angles = this.detector.calculateJointAngles(pose);
            this.visualizer.drawSkeleton(pose);
            this.visualizer.drawKeypoints(pose);
            this.visualizer.drawAngles(pose, angles);
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