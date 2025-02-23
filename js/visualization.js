class PoseVisualizer {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;
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
    }

    drawKeypoints(pose) {
        if (!pose || !pose.keypoints) return;

        this.ctx.fillStyle = this.colors.keypoints;
        this.ctx.strokeStyle = this.colors.outline;
        this.ctx.lineWidth = 3;
        pose.keypoints.forEach(keypoint => {
            if (keypoint.score > 0.3) {
                this.ctx.beginPath();
                this.ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
            }
        });
    }

    drawSkeleton(pose) {
        if (!pose || !pose.keypoints) return;

        this.ctx.strokeStyle = this.colors.skeleton;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';    // Round line endings
        this.ctx.lineJoin = 'round';   // Round line joints

        this.connections.forEach(([start, end]) => {
            const startPoint = pose.keypoints.find(kp => kp.name === start);
            const endPoint = pose.keypoints.find(kp => kp.name === end);

            if (startPoint && endPoint && 
                startPoint.score > 0.3 && 
                endPoint.score > 0.3) {
                this.ctx.strokeStyle = this.colors.outline;
                this.ctx.lineWidth = 6;
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                this.ctx.stroke();

                this.ctx.strokeStyle = this.colors.skeleton;
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                this.ctx.stroke();
            }
        });
    }

    drawAngles(pose, angles) {
        if (!pose || !angles) return;

        this.ctx.font = 'bold 16px Inter';
        this.ctx.fillStyle = this.colors.text;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

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

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
} 