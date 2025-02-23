class PoseDetector {
    constructor() {
        this.detector = null;
        this.lastPose = null;
        this.isInitialized = false;
        // Cache commonly used values
        this.PI_180 = 180 / Math.PI;
        // Cache commonly used keypoint names
        this.keypointNames = {
            face: ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'],
            body: ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 
                  'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 
                  'left_knee', 'right_knee', 'left_ankle', 'right_ankle']
        };
        // Pre-allocate vectors for 3D calculations
        this.v1 = { x: 0, y: 0, z: 0 };
        this.v2 = { x: 0, y: 0, z: 0 };
    }

    async initialize() {
        try {
            console.log('Starting detector initialization...');
            // Wait for MediaPipe to be ready
            if (typeof window.pose === 'undefined') {
                console.log('Waiting for MediaPipe to load...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const model = poseDetection.SupportedModels.BLAZEPOSE;
            const detectorConfig = {
                enableSmoothing: true,
                runtime: 'mediapipe',
                modelType: 'full',  // Try full model instead of lite
                enableTracking: true,
                smoothLandmarks: true,
                minPoseScore: 0.3
            };
            
            // Check if required dependencies are loaded
            if (!window.tf || !window.poseDetection) {
                throw new Error('Required libraries not loaded');
            }

            console.log('Creating detector with config:', detectorConfig);
            this.detector = await poseDetection.createDetector(model, detectorConfig);
            if (!this.detector) {
                throw new Error('Failed to create detector');
            }

            this.isInitialized = true;
            console.log('Detector initialized successfully');
            return true;
        } catch (error) {
            console.error('Detector initialization error:', error.message);
            console.error('Full error:', error);
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
                scoreThreshold: 0.3,
                staticImageMode: false,
                smoothSegmentation: false
            });

            if (poses.length > 0) {
                const pose = poses[0];
                // Add basic validation
                if (!pose.keypoints || pose.keypoints.length === 0) {
                    console.warn('Invalid pose detected');
                    return null;
                }
                this.lastPose = pose;
                return pose;
            }
            return null;
        } catch (error) {
            console.error('Error detecting pose:', error.message);
            return null;
        }
    }

    getKeypoint(pose, name) {
        if (!pose || !pose.keypoints) return null;
        // MediaPipe uses keypoints3D for better accuracy
        if (pose.keypoints3D) {
            const kp = pose.keypoints3D.find(kp => kp.name === name);
            if (kp) return kp;
        }
        // Fallback to 2D keypoints
        return pose.keypoints.find(kp => kp.name === name);
    }

    calculateAngle(p1, p2, p3) {
        if (!p1 || !p2 || !p3) return null;
        
        if (p1.z !== undefined && p2.z !== undefined && p3.z !== undefined) {
            // Reuse pre-allocated vectors
            this.v1.x = p1.x - p2.x;
            this.v1.y = p1.y - p2.y;
            this.v1.z = p1.z - p2.z;
            this.v2.x = p3.x - p2.x;
            this.v2.y = p3.y - p2.y;
            this.v2.z = p3.z - p2.z;
            
            const dot = this.v1.x * this.v2.x + this.v1.y * this.v2.y + this.v1.z * this.v2.z;
            const v1mag = Math.hypot(this.v1.x, this.v1.y, this.v1.z);
            const v2mag = Math.hypot(this.v2.x, this.v2.y, this.v2.z);
            
            return Math.acos(dot / (v1mag * v2mag)) * this.PI_180;
        }
        
        return Math.abs(Math.atan2(
            p3.y - p2.y,
            p3.x - p2.x
        ) - Math.atan2(
            p1.y - p2.y,
            p1.x - p2.x
        )) * this.PI_180;
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

    calculateFaceMetrics(pose) {
        const metrics = {};
        
        // MediaPipe face landmarks
        const landmarks = [
            'nose',
            'left_eye_inner', 'left_eye', 'left_eye_outer',
            'right_eye_inner', 'right_eye', 'right_eye_outer',
            'left_ear', 'right_ear',
            'mouth_left', 'mouth_right'
        ];
        
        const points = {};
        landmarks.forEach(name => {
            points[name] = this.getKeypoint(pose, name);
        });

        if (points.left_eye && points.right_eye) {
            // Enhanced eye measurements using inner and outer points
            const leftEyeWidth = this.getDistance(points.left_eye_inner, points.left_eye_outer);
            const rightEyeWidth = this.getDistance(points.right_eye_inner, points.right_eye_outer);
            metrics.eyeDistance = this.getDistance(points.left_eye, points.right_eye);
            metrics.eyeSymmetry = Math.abs(leftEyeWidth - rightEyeWidth);
            metrics.eyeTilt = this.calculateAngle(points.left_eye, points.right_eye, {
                x: points.right_eye.x,
                y: points.left_eye.y,
                z: points.left_eye.z
            });
        }

        // Enhanced head pose estimation using 3D points
        if (points.nose && points.left_eye && points.right_eye) {
            const faceNormal = this.calculateFaceNormal(
                points.left_eye,
                points.right_eye,
                points.nose
            );
            metrics.headYaw = Math.atan2(faceNormal.x, faceNormal.z) * 180 / Math.PI;
            metrics.headPitch = Math.atan2(faceNormal.y, faceNormal.z) * 180 / Math.PI;
            metrics.headRoll = metrics.eyeTilt;
        }

        return metrics;
    }

    getDistance(p1, p2) {
        if (!p1 || !p2) return null;
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2)
        );
    }

    calculateFaceNormal(p1, p2, p3) {
        // Calculate face plane normal vector
        const v1 = {
            x: p2.x - p1.x,
            y: p2.y - p1.y,
            z: p2.z - p1.z
        };
        const v2 = {
            x: p3.x - p1.x,
            y: p3.y - p1.y,
            z: p3.z - p1.z
        };
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
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