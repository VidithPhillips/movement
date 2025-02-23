class PoseVisualizer {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
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
    }

    drawKeypoints(pose) {
        if (!pose || !pose.keypoints) return;

        this.ctx.fillStyle = '#00FF00';
        pose.keypoints.forEach(keypoint => {
            if (keypoint.score > 0.3) {
                this.ctx.beginPath();
                this.ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        });
    }

    drawSkeleton(pose) {
        if (!pose || !pose.keypoints) return;

        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;

        this.connections.forEach(([start, end]) => {
            const startPoint = pose.keypoints.find(kp => kp.name === start);
            const endPoint = pose.keypoints.find(kp => kp.name === end);

            if (startPoint && endPoint && 
                startPoint.score > 0.3 && 
                endPoint.score > 0.3) {
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                this.ctx.stroke();
            }
        });
    }

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
} 