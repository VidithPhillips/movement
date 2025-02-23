async function setupCamera() {
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
    });
    video.srcObject = stream;
    
    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            video.play();
            resolve(video);
        };
    });
}

async function main() {
    const video = await setupCamera();
    const canvas = document.getElementById('output');
    canvas.width = video.width;
    canvas.height = video.height;

    const detector = new PoseDetector();
    await detector.initialize();

    const visualizer = new PoseVisualizer(canvas);
    const analyzer = new MovementAnalyzer();

    async function detectAndDraw() {
        const pose = await detector.detectPose(video);
        
        visualizer.clear();
        if (pose) {
            visualizer.drawKeypoints(pose);
            visualizer.drawSkeleton(pose);
            analyzer.updateMetrics(pose, detector);
        }
        
        requestAnimationFrame(detectAndDraw);
    }

    detectAndDraw();
}

// Start the application when the page loads
window.onload = main; 