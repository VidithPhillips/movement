class MovementAnalyzer {
    constructor() {
        this.initializeComponents();
        this.setupPerformanceOptimizations();
    }

    initializeComponents() {
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
            positions: new Array(100).fill(null),
            timestamps: [],
            angles: {}
        };

        // Initialize performance metrics
        this.performanceMetrics = {
            calculationTime: 0,
            updateFrequency: 0,
            lastUpdate: performance.now()
        };
    }

    setupPerformanceOptimizations() {
        // Use requestAnimationFrame for DOM updates
        this.pendingUpdate = false;
        this.updateQueue = new Map();

        // Handle memory pressure
        window.addEventListener('memory-pressure', () => {
            this.reduceHistorySize();
        });
    }

    setBaseline(angles) {
        this.baselineAngles = angles;
    }

    updateMetrics(results) {
        const startTime = performance.now();

        try {
            const landmarks = results.poseLandmarks;
            if (!landmarks) return;

            // Calculate angles efficiently
            const angles = this.calculateAnglesOptimized(landmarks);
            
            // Update motion history
            this.updateMotionHistory(landmarks);

            // Calculate performance metrics
            const posture = this.calculatePostureMetrics(landmarks);
            const headMetrics = this.calculateHeadMetrics(landmarks);

            // Queue DOM updates
            this.queueDOMUpdate('angles', angles);
            this.queueDOMUpdate('posture', posture);
            this.queueDOMUpdate('head', headMetrics);

            // Schedule render
            this.scheduleRender();

            // Update performance metrics
            this.performanceMetrics.calculationTime = performance.now() - startTime;
            this.performanceMetrics.updateFrequency = 1000 / (performance.now() - this.performanceMetrics.lastUpdate);
            this.performanceMetrics.lastUpdate = performance.now();

        } catch (error) {
            ErrorHandler.handleError(error, 'MovementAnalyzer.updateMetrics');
        }
    }

    calculateAnglesOptimized(landmarks) {
        const angles = {};
        
        // Calculate joint angles using vectorized operations
        const jointPairs = [
            ['rightElbow', [this.landmarks.rightShoulder, this.landmarks.rightElbow, this.landmarks.rightWrist]],
            ['leftElbow', [this.landmarks.leftShoulder, this.landmarks.leftElbow, this.landmarks.leftWrist]],
            ['rightKnee', [this.landmarks.rightHip, this.landmarks.rightKnee, this.landmarks.rightAnkle]],
            ['leftKnee', [this.landmarks.leftHip, this.landmarks.leftKnee, this.landmarks.leftAnkle]]
        ];

        for (const [name, [p1, p2, p3]] of jointPairs) {
            angles[name] = this.calculateAngleVectorized(
                landmarks[p1],
                landmarks[p2],
                landmarks[p3]
            );
        }

        return angles;
    }

    calculateAngleVectorized(a, b, c) {
        if (!a || !b || !c) return null;

        // Use typed arrays for better performance
        const vec1 = new Float32Array([a.x - b.x, a.y - b.y]);
        const vec2 = new Float32Array([c.x - b.x, c.y - b.y]);

        const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1];
        const mag1 = Math.sqrt(vec1[0] * vec1[0] + vec1[1] * vec1[1]);
        const mag2 = Math.sqrt(vec2[0] * vec2[0] + vec2[1] * vec2[1]);

        const angle = Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
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
        const center = {
            x: (landmarks[this.landmarks.leftHip].x + landmarks[this.landmarks.rightHip].x) / 2,
            y: (landmarks[this.landmarks.leftHip].y + landmarks[this.landmarks.rightHip].y) / 2,
            z: (landmarks[this.landmarks.leftHip].z + landmarks[this.landmarks.rightHip].z) / 2,
            timestamp: performance.now()
        };

        this.motionHistory.positions.push(center);
        this.motionHistory.positions.shift();
        this.motionHistory.timestamps.push(center.timestamp);

        // Limit history size based on memory usage
        if (this.motionHistory.timestamps.length > 1000) {
            this.reduceHistorySize();
        }
    }

    reduceHistorySize() {
        const reduction = Math.floor(this.motionHistory.positions.length / 2);
        this.motionHistory.positions = this.motionHistory.positions.slice(-reduction);
        this.motionHistory.timestamps = this.motionHistory.timestamps.slice(-reduction);
    }

    queueDOMUpdate(type, data) {
        this.updateQueue.set(type, data);
    }

    scheduleRender() {
        if (!this.pendingUpdate) {
            this.pendingUpdate = true;
            requestAnimationFrame(() => this.render());
        }
    }

    render() {
        this.pendingUpdate = false;

        if (this.updateQueue.has('angles')) {
            this.updateBodyAnglesDOM(this.updateQueue.get('angles'));
        }
        if (this.updateQueue.has('posture')) {
            this.updatePostureDOM(this.updateQueue.get('posture'));
        }
        if (this.updateQueue.has('head')) {
            this.updateHeadFaceDOM(this.updateQueue.get('head'));
        }

        this.updateQueue.clear();
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