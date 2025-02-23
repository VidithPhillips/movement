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
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftElbow = this.getKeypoint(pose, 'left_elbow');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');

        // Leg keypoints
        const rightHip = this.getKeypoint(pose, 'right_hip');
        const rightKnee = this.getKeypoint(pose, 'right_knee');
        const rightAnkle = this.getKeypoint(pose, 'right_ankle');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftKnee = this.getKeypoint(pose, 'left_knee');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');

        // Calculate arm angles
        angles.rightElbow = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
        angles.leftElbow = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
        angles.rightShoulder = this.calculateAngle(rightHip, rightShoulder, rightElbow);
        angles.leftShoulder = this.calculateAngle(leftHip, leftShoulder, leftElbow);

        // Calculate leg angles
        angles.rightHip = this.calculateAngle(rightShoulder, rightHip, rightKnee);
        angles.leftHip = this.calculateAngle(leftShoulder, leftHip, leftKnee);
        angles.rightKnee = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        angles.leftKnee = this.calculateAngle(leftHip, leftKnee, leftAnkle);

        // Calculate wrist angles (relative to elbow)
        if (rightElbow && rightWrist) {
            angles.rightWrist = Math.atan2(rightWrist.y - rightElbow.y, rightWrist.x - rightElbow.x) * 180 / Math.PI;
        }
        if (leftElbow && leftWrist) {
            angles.leftWrist = Math.atan2(leftWrist.y - leftElbow.y, leftWrist.x - leftElbow.x) * 180 / Math.PI;
        }

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
        const nose = this.getKeypoint(pose, 'nose');
        const leftEye = this.getKeypoint(pose, 'left_eye');
        const rightEye = this.getKeypoint(pose, 'right_eye');
        const leftEar = this.getKeypoint(pose, 'left_ear');
        const rightEar = this.getKeypoint(pose, 'right_ear');

        if (leftEye && rightEye) {
            // Eye measurements
            const eyeDx = rightEye.x - leftEye.x;
            const eyeDy = rightEye.y - leftEye.y;
            metrics.eyeDistance = Math.sqrt(eyeDx * eyeDx + eyeDy * eyeDy);
            metrics.eyeTilt = Math.atan2(eyeDy, eyeDx) * 180 / Math.PI;
        }

        if (leftEar && rightEar && metrics.eyeDistance) {
            // Head rotation (using ear-to-ear vs eye-to-eye ratio)
            const earDist = Math.sqrt(
                Math.pow(rightEar.x - leftEar.x, 2) + 
                Math.pow(rightEar.y - leftEar.y, 2)
            );
            metrics.headRotation = earDist / metrics.eyeDistance;
        }

        if (nose && leftEye && rightEye) {
            // Head position relative to eyes
            const eyeMidX = (leftEye.x + rightEye.x) / 2;
            const eyeMidY = (leftEye.y + rightEye.y) / 2;
            metrics.headTilt = Math.atan2(nose.y - eyeMidY, nose.x - eyeMidX) * 180 / Math.PI;
            
            // Head forward/backward tilt
            metrics.headForwardTilt = nose.y - eyeMidY;
        }

        return metrics;
    }

    calculatePosture(pose) {
        const posture = {};
        
        const rightShoulder = this.getKeypoint(pose, 'right_shoulder');
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const rightHip = this.getKeypoint(pose, 'right_hip');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        
        if (rightShoulder && leftShoulder && rightHip && leftHip) {
            // Shoulder midpoint
            const shoulderMidX = (rightShoulder.x + leftShoulder.x) / 2;
            const shoulderMidY = (rightShoulder.y + leftShoulder.y) / 2;
            
            // Hip midpoint
            const hipMidX = (rightHip.x + leftHip.x) / 2;
            const hipMidY = (rightHip.y + leftHip.y) / 2;
            
            // Spine angle (vertical alignment)
            posture.spineAngle = Math.atan2(shoulderMidX - hipMidX, hipMidY - shoulderMidY) * 180 / Math.PI;
            
            // Shoulder levelness
            posture.shoulderLevel = Math.atan2(rightShoulder.y - leftShoulder.y, 
                                             rightShoulder.x - leftShoulder.x) * 180 / Math.PI;
            
            // Body symmetry (difference between right and left side angles)
            posture.symmetry = Math.abs(
                Math.atan2(rightShoulder.y - rightHip.y, rightShoulder.x - rightHip.x) -
                Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x)
            ) * 180 / Math.PI;
        }
        
        return posture;
    }
} 