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

        this.motionHistory = {
            positions: new Array(100).fill(null), // Store last 100 positions
            timestamps: []
        };
    }

    setBaseline(angles) {
        this.baselineAngles = angles;
    }

    updateMetrics(results) {
        if (!results.poseLandmarks) return;

        const landmarks = results.poseLandmarks;
        
        // Calculate angles
        const angles = {
            leftElbow: this.calculateAngle(
                landmarks[11], // LEFT_SHOULDER
                landmarks[13], // LEFT_ELBOW
                landmarks[15]  // LEFT_WRIST
            ),
            rightElbow: this.calculateAngle(
                landmarks[12], // RIGHT_SHOULDER
                landmarks[14], // RIGHT_ELBOW
                landmarks[16]  // RIGHT_WRIST
            ),
            leftKnee: this.calculateAngle(
                landmarks[23], // LEFT_HIP
                landmarks[25], // LEFT_KNEE
                landmarks[27]  // LEFT_ANKLE
            ),
            rightKnee: this.calculateAngle(
                landmarks[24], // RIGHT_HIP
                landmarks[26], // RIGHT_KNEE
                landmarks[28]  // RIGHT_ANKLE
            )
        };

        // Calculate posture metrics
        const posture = {
            spineAngle: this.calculateSpineAngle(landmarks),
            shoulderLevel: this.calculateShoulderLevel(landmarks),
            hipLevel: this.calculateHipLevel(landmarks)
        };

        // Update DOM
        this.updateBodyAnglesDOM(angles);
        this.updatePostureDOM(posture);
        this.updateHeadFaceDOM(this.calculateHeadMetrics(landmarks));

        // Track motion history
        this.updateMotionHistory(results.poseLandmarks);
        
        // Calculate velocity and acceleration
        const motion = this.calculateMotionMetrics();
        this.updateMotionDOM(motion);
    }

    calculateAngle(a, b, c) {
        if (!a || !b || !c) return null;

        const radians = Math.atan2(
            c.y - b.y,
            c.x - b.x
        ) - Math.atan2(
            a.y - b.y,
            a.x - b.x
        );

        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) angle = 360 - angle;
        return angle;
    }

    calculateSpineAngle(landmarks) {
        const neck = landmarks[0];  // NOSE
        const midHip = {
            x: (landmarks[23].x + landmarks[24].x) / 2,
            y: (landmarks[23].y + landmarks[24].y) / 2
        };
        return Math.abs(90 - this.calculateAngle(
            { x: neck.x, y: 0 },
            neck,
            midHip
        ));
    }

    calculateShoulderLevel(landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        return Math.atan2(
            rightShoulder.y - leftShoulder.y,
            rightShoulder.x - leftShoulder.x
        ) * 180 / Math.PI;
    }

    calculateHeadMetrics(landmarks) {
        return {
            headYaw: this.calculateHeadYaw(landmarks),
            headPitch: this.calculateHeadPitch(landmarks),
            headRoll: this.calculateHeadRoll(landmarks)
        };
    }

    updateBodyAnglesDOM(angles) {
        if (!this.bodyAnglesDiv) return;
        
        this.bodyAnglesDiv.innerHTML = Object.entries(angles)
            .map(([joint, angle]) => `
                <div class="metric-value">
                    <div class="metric-label">${this.formatJointName(joint)}</div>
                    <div class="metric-number">${angle ? angle.toFixed(1) : 'N/A'}°</div>
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
        return name.replace(/([A-Z])/g, ' $1')
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

    updateMotionHistory(landmarks) {
        if (!landmarks) return;

        // Store center position (hip point)
        const center = {
            x: (landmarks[23].x + landmarks[24].x) / 2,
            y: (landmarks[23].y + landmarks[24].y) / 2,
            z: (landmarks[23].z + landmarks[24].z) / 2,
            timestamp: Date.now()
        };

        this.motionHistory.positions.push(center);
        this.motionHistory.positions.shift();
        this.motionHistory.timestamps.push(Date.now());
    }

    calculatePerformanceMetrics() {
        return {
            stability: this.calculateStability(),
            symmetry: this.calculateSymmetry(),
            smoothness: this.calculateSmoothness()
        };
    }

    calculateStability() {
        // Calculate variance in position over time
        const positions = this.motionHistory.positions.filter(p => p !== null);
        if (positions.length < 2) return null;

        const variance = {
            x: this.calculateVariance(positions.map(p => p.x)),
            y: this.calculateVariance(positions.map(p => p.y))
        };

        return 1 - Math.min(1, Math.sqrt(variance.x * variance.x + variance.y * variance.y) / 0.1);
    }
} 