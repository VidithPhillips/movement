class PoseVisualizer {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false
        });

        // Set canvas size
        canvas.width = 640;
        canvas.height = 480;

        // MediaPipe POSE_CONNECTIONS will be used directly from the library
        this.colors = {
            keypoints: '#00ff00',    // Bright green for better visibility
            skeleton: '#ffffff',      // White for skeleton
            text: '#00ff00',         // Green text
            outline: '#000000'       // Black outline for contrast
        };
        
        this.textSettings = {
            font: 'bold 16px Inter',
            align: 'center',
            baseline: 'middle'
        };

        // Pre-compile common values
        this.keyPointRadius = 4;
        this.lineWidth = 4;
        this.outlineWidth = 6;
    }

    drawKeypoints(pose) {
        if (!pose || !pose.keypoints) return;
        
        const ctx = this.ctx;
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        ctx.save();
        ctx.fillStyle = this.colors.keypoints;
        ctx.beginPath();
        
        pose.keypoints.forEach(keypoint => {
            if (keypoint && keypoint.score > 0.2) {
                // Convert normalized coordinates to pixel coordinates
                const x = keypoint.x * canvasWidth;
                const y = keypoint.y * canvasHeight;
                ctx.arc(x, y, this.keyPointRadius, 0, 2 * Math.PI);
            }
        });
        
        ctx.fill();
        ctx.restore();
    }

    drawSkeleton(pose) {
        if (!pose || !pose.keypoints) return;
        
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors.skeleton;
        ctx.lineWidth = this.lineWidth;
        
        // MediaPipe POSE_CONNECTIONS will be used directly from the library
        pose.keypoints.forEach((keypoint, index) => {
            const nextKeypoint = pose.keypoints[index + 1];
            if (nextKeypoint && keypoint.score > 0.3 && nextKeypoint.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(keypoint.x * ctx.canvas.width, keypoint.y * ctx.canvas.height);
                ctx.lineTo(nextKeypoint.x * ctx.canvas.width, nextKeypoint.y * ctx.canvas.height);
                ctx.stroke();
            }
        });
    }

    drawAngles(pose, angles) {
        if (!pose || !angles) return;

        const ctx = this.ctx;
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        ctx.save();
        ctx.font = this.textSettings.font;
        ctx.fillStyle = this.colors.text;
        ctx.textAlign = this.textSettings.align;
        ctx.textBaseline = this.textSettings.baseline;

        // MediaPipe pose landmarks are indexed 0-32
        // Draw angles at specific landmarks
        const anglePoints = {
            rightElbow: 14,  // Right elbow
            leftElbow: 13,   // Left elbow
            rightKnee: 26,   // Right knee
            leftKnee: 25     // Left knee
        };

        for (const [angleName, landmarkIndex] of Object.entries(anglePoints)) {
            if (pose.poseLandmarks && pose.poseLandmarks[landmarkIndex] && angles[angleName]) {
                const x = pose.poseLandmarks[landmarkIndex].x * canvasWidth;
                const y = pose.poseLandmarks[landmarkIndex].y * canvasHeight;
                
                ctx.fillText(
                    `${Math.round(angles[angleName])}°`,
                    x + (angleName.includes('right') ? 10 : -40),
                    y
                );
            }
        }

        ctx.restore();
    }

    drawFaceOrientation(pose) {
        if (!pose || !pose.keypoints3D) return;
        
        const ctx = this.ctx;
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        const nose = pose.keypoints3D.find(kp => kp.name === 'nose');
        const leftEye = pose.keypoints3D.find(kp => kp.name === 'left_eye');
        const rightEye = pose.keypoints3D.find(kp => kp.name === 'right_eye');

        if (nose && leftEye && rightEye) {
            const scale = 50; // Scale factor for visualization

            // Draw direction vector from nose
            ctx.beginPath();
            ctx.moveTo(nose.x * canvasWidth, nose.y * canvasHeight);
            ctx.lineTo(nose.x * canvasWidth + nose.z * scale, nose.y * canvasHeight);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
} 