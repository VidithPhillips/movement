class PoseDetector {
    constructor() {
        this.detector = null;
        this.lastPose = null;
    }

    async initialize() {
        const model = poseDetection.SupportedModels.MOVENET;
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };
        this.detector = await poseDetection.createDetector(model, detectorConfig);
    }

    async detectPose(video) {
        if (!this.detector) return null;
        
        const poses = await this.detector.estimatePoses(video, {
            flipHorizontal: false
        });

        if (poses.length > 0) {
            this.lastPose = poses[0];
            return poses[0];
        }
        return null;
    }

    getKeypoint(pose, name) {
        if (!pose || !pose.keypoints) return null;
        return pose.keypoints.find(kp => kp.name === name);
    }

    calculateAngle(p1, p2, p3) {
        if (!p1 || !p2 || !p3) return null;
        
        const radians = Math.atan2(
            p3.y - p2.y,
            p3.x - p2.x
        ) - Math.atan2(
            p1.y - p2.y,
            p1.x - p2.x
        );
        
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) angle = 360 - angle;
        return angle;
    }
} 