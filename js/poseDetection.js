class PoseDetector {
    constructor() {
        this.detector = null;
        this.lastPose = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            const model = poseDetection.SupportedModels.MOVENET;
            const detectorConfig = {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
                enableSmoothing: true,
                minPoseScore: 0.25
            };
            this.detector = await poseDetection.createDetector(model, detectorConfig);
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Error initializing pose detector:', error);
            return false;
        }
    }

    async detectPose(video) {
        if (!this.detector || !this.isInitialized) return null;
        
        try {
            const poses = await this.detector.estimatePoses(video, {
                flipHorizontal: false,
                maxPoses: 1
            });

            if (poses.length > 0 && poses[0].score > 0.3) {
                this.lastPose = poses[0];
                return poses[0];
            }
            return null;
        } catch (error) {
            console.error('Error detecting pose:', error);
            return null;
        }
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

    calculateJointAngles(pose) {
        const angles = {};
        
        // Right arm angle
        const rightShoulder = this.getKeypoint(pose, 'right_shoulder');
        const rightElbow = this.getKeypoint(pose, 'right_elbow');
        const rightWrist = this.getKeypoint(pose, 'right_wrist');
        angles.rightElbow = this.calculateAngle(rightShoulder, rightElbow, rightWrist);

        // Left arm angle
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftElbow = this.getKeypoint(pose, 'left_elbow');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');
        angles.leftElbow = this.calculateAngle(leftShoulder, leftElbow, leftWrist);

        // Right knee angle
        const rightHip = this.getKeypoint(pose, 'right_hip');
        const rightKnee = this.getKeypoint(pose, 'right_knee');
        const rightAnkle = this.getKeypoint(pose, 'right_ankle');
        angles.rightKnee = this.calculateAngle(rightHip, rightKnee, rightAnkle);

        // Left knee angle
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftKnee = this.getKeypoint(pose, 'left_knee');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');
        angles.leftKnee = this.calculateAngle(leftHip, leftKnee, leftAnkle);

        return angles;
    }

    calculateMovementSpeed(pose) {
        if (!this.lastPose || !pose) return null;

        const speeds = {};
        const keypoints = ['right_wrist', 'left_wrist', 'right_ankle', 'left_ankle'];

        keypoints.forEach(kp => {
            const current = this.getKeypoint(pose, kp);
            const last = this.getKeypoint(this.lastPose, kp);
            
            if (current && last) {
                const dx = current.x - last.x;
                const dy = current.y - last.y;
                speeds[kp] = Math.sqrt(dx * dx + dy * dy);
            }
        });

        return speeds;
    }
} 