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

        this.connections = [
            ['nose', 'left_eye'], ['nose', 'right_eye'],
            ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
            ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
            ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
            ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
        ];
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
        // Pre-allocate path points
        this.pathPoints = new Float32Array(1000);
        // Use integer values for better performance
        this.keyPointRadius = 4;
        this.lineWidth = 4;
        this.outlineWidth = 6;
        // Pre-compile common values
        this.TWO_PI = 2 * Math.PI;
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.colors.skeleton;
    }

    drawKeypoints(pose) {
        if (!pose || !pose.keypoints) return;
        
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = this.colors.keypoints;
        ctx.beginPath();
        pose.keypoints.forEach(keypoint => {
            if (keypoint && keypoint.score > 0.2) {
                ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
            }
        });
        ctx.fill();
        ctx.restore();

        // Draw face orientation if available
        if (pose.keypoints3D) {
            this.drawFaceOrientation(pose);
        }
    }

    drawSkeleton(pose) {
        if (!pose || !pose.keypoints) return;
        
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors.skeleton;
        ctx.lineWidth = this.lineWidth;
        
        this.connections.forEach(([start, end]) => {
            const startPoint = pose.keypoints.find(kp => kp.name === start);
            const endPoint = pose.keypoints.find(kp => kp.name === end);

            if (startPoint && endPoint && 
                startPoint.score > 0.3 && 
                endPoint.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.lineTo(endPoint.x, endPoint.y);
                ctx.stroke();
            }
        });
    }

    drawAngles(pose, angles) {
        if (!pose || !angles) return;

        this.ctx.font = this.textSettings.font;
        this.ctx.fillStyle = this.colors.text;
        this.ctx.textAlign = this.textSettings.align;
        this.ctx.textBaseline = this.textSettings.baseline;

        // Draw right elbow angle
        const rightElbow = pose.keypoints.find(kp => kp.name === 'right_elbow');
        if (rightElbow && angles.rightElbow) {
            this.ctx.fillText(
                `${Math.round(angles.rightElbow)}°`,
                rightElbow.x + 10,
                rightElbow.y
            );
        }

        // Draw left elbow angle
        const leftElbow = pose.keypoints.find(kp => kp.name === 'left_elbow');
        if (leftElbow && angles.leftElbow) {
            this.ctx.fillText(
                `${Math.round(angles.leftElbow)}°`,
                leftElbow.x - 40,
                leftElbow.y
            );
        }

        // Draw knee angles
        const knees = ['right_knee', 'left_knee'];
        knees.forEach(knee => {
            const kp = pose.keypoints.find(kp => kp.name === knee);
            const angle = angles[knee === 'right_knee' ? 'rightKnee' : 'leftKnee'];
            if (kp && angle) {
                this.ctx.fillText(
                    `${Math.round(angle)}°`,
                    kp.x + (knee === 'right_knee' ? 10 : -40),
                    kp.y
                );
            }
        });
    }

    drawFaceOrientation(pose) {
        const nose = pose.keypoints3D.find(kp => kp.name === 'nose');
        const leftEye = pose.keypoints3D.find(kp => kp.name === 'left_eye');
        const rightEye = pose.keypoints3D.find(kp => kp.name === 'right_eye');

        if (nose && leftEye && rightEye) {
            const ctx = this.ctx;
            const scale = 50; // Scale factor for visualization

            // Draw direction vector from nose
            ctx.beginPath();
            ctx.moveTo(nose.x, nose.y);
            ctx.lineTo(nose.x + nose.z * scale, nose.y);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
} 