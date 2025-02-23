class MovementAnalyzer {
    constructor() {
        // Cache DOM elements
        this.bodyAnglesDiv = document.getElementById('bodyAngles');
        this.headFaceDiv = document.getElementById('headFaceMetrics');
        this.postureDiv = document.getElementById('postureMetrics');
        // Pre-allocate string builder for HTML
        this.htmlBuilder = [];
        this.angleHistory = {
            rightElbow: [],
            leftElbow: [],
            rightShoulder: [],
            leftShoulder: [],
            rightHip: [],
            leftHip: [],
            rightKnee: [],
            leftKnee: [],
            rightWrist: [],
            leftWrist: []
        };
        this.baselineAngles = null;
        // Use Map for O(1) lookups
        this.jointNameMap = new Map([
            ['right_elbow', 'Right Elbow'],
            ['left_elbow', 'Left Elbow'],
            // ... other mappings
        ]);

        // MediaPipe landmark indices
        this.landmarks = {
            nose: 0,
            leftEye: 2,
            rightEye: 5,
            leftShoulder: 11,
            rightShoulder: 12,
            leftElbow: 13,
            rightElbow: 14,
            leftWrist: 15,
            rightWrist: 16,
            leftHip: 23,
            rightHip: 24,
            leftKnee: 25,
            rightKnee: 26,
            leftAnkle: 27,
            rightAnkle: 28
        };
    }

    setBaseline(angles) {
        this.baselineAngles = angles;
    }

    updateMetrics(pose) {
        if (!pose || !pose.keypoints) return;

        const angles = this.calculateJointAngles(pose);
        const postureMetrics = this.calculatePosture(pose);
        const faceMetrics = this.calculateFaceMetrics(pose);

        this.updateBodyAnglesDOM(angles);
        this.updatePostureDOM(postureMetrics);
        this.updateHeadFaceDOM(faceMetrics);
    }

    calculateJointAngles(pose) {
        const angles = {};
        // MediaPipe provides results.poseLandmarks
        const landmarks = pose.poseLandmarks;
        
        if (!landmarks) return angles;

        // Calculate arm angles
        angles.rightElbow = this.calculateAngle(
            landmarks[this.landmarks.rightShoulder],
            landmarks[this.landmarks.rightElbow],
            landmarks[this.landmarks.rightWrist]
        );
        angles.leftElbow = this.calculateAngle(
            landmarks[this.landmarks.leftShoulder],
            landmarks[this.landmarks.leftElbow],
            landmarks[this.landmarks.leftWrist]
        );

        // Calculate shoulder angles
        angles.rightShoulder = this.calculateAngle(
            landmarks[this.landmarks.rightHip],
            landmarks[this.landmarks.rightShoulder],
            landmarks[this.landmarks.rightElbow]
        );
        angles.leftShoulder = this.calculateAngle(
            landmarks[this.landmarks.leftHip],
            landmarks[this.landmarks.leftShoulder],
            landmarks[this.landmarks.leftElbow]
        );

        // Calculate knee angles
        angles.rightKnee = this.calculateAngle(
            landmarks[this.landmarks.rightHip],
            landmarks[this.landmarks.rightKnee],
            landmarks[this.landmarks.rightAnkle]
        );
        angles.leftKnee = this.calculateAngle(
            landmarks[this.landmarks.leftHip],
            landmarks[this.landmarks.leftKnee],
            landmarks[this.landmarks.leftAnkle]
        );

        // Calculate hip angles
        angles.rightHip = this.calculateAngle(
            landmarks[this.landmarks.rightShoulder],
            landmarks[this.landmarks.rightHip],
            landmarks[this.landmarks.rightKnee]
        );
        angles.leftHip = this.calculateAngle(
            landmarks[this.landmarks.leftShoulder],
            landmarks[this.landmarks.leftHip],
            landmarks[this.landmarks.leftKnee]
        );

        return angles;
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
        
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        
        return angle;
    }

    updateBodyAnglesDOM(angles) {
        this.bodyAnglesDiv.innerHTML = Object.entries(angles)
            .map(([joint, angle]) => `
                <div class="metric-value">
                    <div class="metric-label">${this.formatJointName(joint)}</div>
                    <div class="metric-number">
                        ${angle ? angle.toFixed(1) : 'N/A'}°
                    </div>
                </div>
            `).join('');
    }

    updateHeadFaceDOM(metrics) {
        const formattedMetrics = {
            'Head Yaw': metrics.headYaw ? `${metrics.headYaw.toFixed(1)}°` : 'N/A',
            'Head Pitch': metrics.headPitch ? `${metrics.headPitch.toFixed(1)}°` : 'N/A',
            'Head Roll': metrics.headRoll ? `${metrics.headRoll.toFixed(1)}°` : 'N/A',
            'Eye Symmetry': metrics.eyeSymmetry ? `${metrics.eyeSymmetry.toFixed(1)}` : 'N/A'
        };

        this.headFaceDiv.innerHTML = Object.entries(formattedMetrics)
            .map(([label, value]) => `
                <div class="metric-value">
                    <div class="metric-label">${label}</div>
                    <div class="metric-number">${value}</div>
                </div>
            `).join('');
    }

    updatePostureDOM(posture) {
        const formattedMetrics = {
            'Spine Angle': posture.spineAngle ? `${posture.spineAngle.toFixed(1)}°` : 'N/A',
            'Shoulder Level': posture.shoulderLevel ? `${posture.shoulderLevel.toFixed(1)}°` : 'N/A',
            'Body Symmetry': posture.symmetry ? `${posture.symmetry.toFixed(1)}°` : 'N/A'
        };

        this.postureDiv.innerHTML = Object.entries(formattedMetrics)
            .map(([label, value]) => `
                <div class="metric-value">
                    <div class="metric-label">${label}</div>
                    <div class="metric-number">${value}</div>
                </div>
            `).join('');
    }

    formatJointName(name) {
        return name
            .split(/(?=[A-Z])/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    reset() {
        Object.keys(this.angleHistory).forEach(key => {
            this.angleHistory[key] = [];
        });
    }

    // Helper method to get normalized coordinates
    getNormalizedCoord(landmark) {
        if (!landmark) return null;
        return {
            x: landmark.x,
            y: landmark.y,
            z: landmark.z || 0,
            visibility: landmark.visibility || 0
        };
    }
} 