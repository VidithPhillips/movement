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
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                enableSmoothing: true,
                minPoseScore: 0.2,
                multiPoseMaxDimension: 256,
                enableTracking: true,
                trackerType: 'keypoint'
            };
            console.log('Initializing pose detector...');
            this.detector = await poseDetection.createDetector(model, detectorConfig);
            console.log('Pose detector initialized successfully');
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Error initializing pose detector:', error.message);
            alert('Failed to initialize pose detector. Please check console for details.');
            return false;
        }
    }

    async detectPose(video) {
        if (!this.detector || !this.isInitialized) return null;
        
        try {
            const poses = await this.detector.estimatePoses(video, {
                flipHorizontal: true,
                maxPoses: 1,
                scoreThreshold: 0.3
            });

            if (poses.length > 0) {
                const pose = poses[0];
                // Use the top-level score if available; otherwise calculate the average score from keypoints.
                const poseScore = (pose.score !== undefined)
                    ? pose.score
                    : (pose.keypoints.reduce((sum, kp) => sum + kp.score, 0) / pose.keypoints.length);

                if (poseScore > 0.2) {
                    this.lastPose = pose;
                    return pose;
                }
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
        
        // Arm angles
        const rightShoulder = this.getKeypoint(pose, 'right_shoulder');
        const rightElbow = this.getKeypoint(pose, 'right_elbow');
        const rightWrist = this.getKeypoint(pose, 'right_wrist');
        angles.rightElbow = this.calculateAngle(rightShoulder, rightElbow, rightWrist);

        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftElbow = this.getKeypoint(pose, 'left_elbow');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');
        angles.leftElbow = this.calculateAngle(leftShoulder, leftElbow, leftWrist);

        // Shoulder angles (relative to vertical)
        const rightHip = this.getKeypoint(pose, 'right_hip');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        angles.rightShoulder = this.calculateAngle(rightHip, rightShoulder, rightElbow);
        angles.leftShoulder = this.calculateAngle(leftHip, leftShoulder, leftElbow);

        // Hip angles
        const rightKnee = this.getKeypoint(pose, 'right_knee');
        const leftKnee = this.getKeypoint(pose, 'left_knee');
        angles.rightHip = this.calculateAngle(rightShoulder, rightHip, rightKnee);
        angles.leftHip = this.calculateAngle(leftShoulder, leftHip, leftKnee);

        // Knee angles
        const rightAnkle = this.getKeypoint(pose, 'right_ankle');
        angles.rightKnee = this.calculateAngle(rightHip, rightKnee, rightAnkle);

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

    calculateFaceMetrics(pose) {
        const metrics = {};
        // Face keypoints
        const leftEye = this.getKeypoint(pose, 'left_eye');
        const rightEye = this.getKeypoint(pose, 'right_eye');
        const leftEar = this.getKeypoint(pose, 'left_ear');
        const rightEar = this.getKeypoint(pose, 'right_ear');
        const nose = this.getKeypoint(pose, 'nose');

        // Eye measurements
        if (leftEye && rightEye) {
            const dx = rightEye.x - leftEye.x;
            const dy = rightEye.y - leftEye.y;
            metrics.eyeDistance = Math.sqrt(dx * dx + dy * dy);
            // Eye level (tilt)
            metrics.eyeTilt = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI;
        }

        // Head rotation estimation (using ear-to-ear distance)
        if (leftEar && rightEar) {
            const earDist = Math.sqrt(
                Math.pow(rightEar.x - leftEar.x, 2) + 
                Math.pow(rightEar.y - leftEar.y, 2)
            );
            metrics.headRotation = earDist / metrics.eyeDistance; // Ratio indicates head rotation
        }

        // Head tilt (using nose position relative to eye midpoint)
        if (nose && leftEye && rightEye) {
            const eyeMidX = (leftEye.x + rightEye.x) / 2;
            const eyeMidY = (leftEye.y + rightEye.y) / 2;
            metrics.headTilt = Math.atan2(nose.y - eyeMidY, nose.x - eyeMidX) * 180 / Math.PI;
        }

        // Face direction (forward/side using ear visibility)
        if (leftEar && rightEar) {
            metrics.faceDirection = (leftEar.score + rightEar.score) / 2; // Higher score = more forward facing
        }

        return metrics;
    }

    calculatePosture(pose) {
        const posture = {};
        
        // Spine alignment (using shoulders and hips)
        const rightShoulder = this.getKeypoint(pose, 'right_shoulder');
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const rightHip = this.getKeypoint(pose, 'right_hip');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        
        if (rightShoulder && leftShoulder && rightHip && leftHip) {
            // Calculate shoulder midpoint
            const shoulderMidX = (rightShoulder.x + leftShoulder.x) / 2;
            const shoulderMidY = (rightShoulder.y + leftShoulder.y) / 2;
            
            // Calculate hip midpoint
            const hipMidX = (rightHip.x + leftHip.x) / 2;
            const hipMidY = (rightHip.y + leftHip.y) / 2;
            
            // Calculate spine angle relative to vertical
            posture.spineAngle = Math.atan2(shoulderMidX - hipMidX, hipMidY - shoulderMidY) * 180 / Math.PI;
            
            // Calculate shoulder level
            posture.shoulderLevel = Math.atan2(rightShoulder.y - leftShoulder.y, 
                                             rightShoulder.x - leftShoulder.x) * 180 / Math.PI;
        }
        
        return posture;
    }
} 