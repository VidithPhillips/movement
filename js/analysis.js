class MovementAnalyzer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.setupMetrics();
        this.setupEventListeners();
        
        // Store historical data for range of motion
        this.angleHistory = {
            leftShoulder: [],
            rightShoulder: [],
            leftHip: [],
            rightHip: [],
            spine: []
        };
        
        // Configure history length for tracking
        this.historyLength = 30; // 1 second at 30fps
    }

    setupMetrics() {
        this.metrics = {
            jointAngles: {},
            posture: {},
            symmetry: {},
            stability: {},
            rangeOfMotion: {}
        };
        
        this.createMetricsDisplay();
    }

    setupEventListeners() {
        window.addEventListener('pose-updated', (event) => {
            this.updateMetrics(event.detail);
        });
    }

    createMetricsDisplay() {
        this.container.innerHTML = `
            <div class="metric-box">
                <h3>Joint Angles</h3>
                <div id="angles" class="metric-grid"></div>
            </div>
            <div class="metric-box">
                <h3>Posture Analysis</h3>
                <div id="posture" class="metric-grid"></div>
            </div>
            <div class="metric-box">
                <h3>Movement Quality</h3>
                <div id="quality" class="metric-grid"></div>
            </div>
        `;
    }

    updateMetrics(landmarks) {
        if (!landmarks) return;

        // Calculate joint angles
        this.metrics.jointAngles = {
            // Sagittal Plane (side view) angles
            trunkFlexion: {
                value: this.calculateAngle(landmarks[11], landmarks[23], landmarks[25]), // shoulder-hip-knee
                description: "Forward/backward lean",
                normal: "0-15°"
            },
            neckFlexion: {
                value: this.calculateAngle(landmarks[7], landmarks[0], landmarks[11]), // ear-nose-shoulder
                description: "Head forward position",
                normal: "0-15°"
            },
            
            // Frontal Plane (front view) angles
            lateralLean: {
                value: this.calculateVerticalDeviation([landmarks[11], landmarks[23]]), // shoulder-hip vertical
                description: "Side lean",
                normal: "0-5°"
            },
            shoulderTilt: {
                value: this.calculateHorizontalDeviation(landmarks[11], landmarks[12]),
                description: "Shoulder levelness",
                normal: "0-5°"
            },

            // Functional angles
            kneeFlexion: {
                left: {
                    value: this.calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
                    description: "Left knee bend",
                    normal: "0-140°"
                },
                right: {
                    value: this.calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
                    description: "Right knee bend",
                    normal: "0-140°"
                }
            },
            hipFlexion: {
                left: {
                    value: this.calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
                    description: "Left hip bend",
                    normal: "0-125°"
                },
                right: {
                    value: this.calculateAngle(landmarks[12], landmarks[24], landmarks[26]),
                    description: "Right hip bend",
                    normal: "0-125°"
                }
            }
        };

        // Calculate posture metrics
        this.metrics.posture = {
            spineAlignment: this.calculateVerticalDeviation([
                landmarks[0], landmarks[11], landmarks[23]
            ]),
            shoulderLevel: this.calculateHorizontalDeviation(
                landmarks[11], landmarks[12]
            ),
            hipLevel: this.calculateHorizontalDeviation(
                landmarks[23], landmarks[24]
            )
        };

        // Update movement quality metrics
        this.updateMovementQuality();
        
        // Update display
        this.updateDisplay();
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
        return Math.round(angle);
    }

    calculateVerticalDeviation(points) {
        // Calculate deviation from perfect vertical alignment (0-100%)
        let totalDeviation = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            totalDeviation += Math.abs(dx);
        }
        return Math.max(0, 100 - (totalDeviation * 200));
    }

    calculateHorizontalDeviation(point1, point2) {
        // Calculate how level two points are (0-100%)
        const dy = Math.abs(point1.y - point2.y);
        return Math.max(0, 100 - (dy * 200));
    }

    updateMovementQuality() {
        // Calculate symmetry
        this.metrics.symmetry = {
            arms: this.calculateSymmetry(
                this.metrics.jointAngles.leftShoulder,
                this.metrics.jointAngles.rightShoulder,
                this.metrics.jointAngles.leftElbow,
                this.metrics.jointAngles.rightElbow
            ),
            legs: this.calculateSymmetry(
                this.metrics.jointAngles.leftHip,
                this.metrics.jointAngles.rightHip,
                this.metrics.jointAngles.leftKnee,
                this.metrics.jointAngles.rightKnee
            )
        };
        
        // Update range of motion tracking
        this.updateRangeOfMotion();
    }

    calculateSymmetry(leftUpper, rightUpper, leftLower, rightLower) {
        const upperDiff = Math.abs(leftUpper - rightUpper);
        const lowerDiff = Math.abs(leftLower - rightLower);
        return Math.max(0, 100 - ((upperDiff + lowerDiff) / 2));
    }

    updateRangeOfMotion() {
        // Update angle histories
        this.updateAngleHistory('leftShoulder', this.metrics.jointAngles.leftShoulder);
        this.updateAngleHistory('rightShoulder', this.metrics.jointAngles.rightShoulder);
        this.updateAngleHistory('leftHip', this.metrics.jointAngles.leftHip);
        this.updateAngleHistory('rightHip', this.metrics.jointAngles.rightHip);
        this.updateAngleHistory('spine', this.metrics.jointAngles.spine);

        // Calculate range of motion
        this.metrics.rangeOfMotion = {
            leftArm: this.calculateROM('leftShoulder'),
            rightArm: this.calculateROM('rightShoulder'),
            leftLeg: this.calculateROM('leftHip'),
            rightLeg: this.calculateROM('rightHip'),
            trunk: this.calculateROM('spine')
        };
    }

    updateAngleHistory(joint, angle) {
        if (!angle) return;
        
        this.angleHistory[joint].push(angle);
        if (this.angleHistory[joint].length > this.historyLength) {
            this.angleHistory[joint].shift();
        }
    }

    calculateROM(joint) {
        const history = this.angleHistory[joint];
        if (history.length < 2) return 0;
        
        const min = Math.min(...history);
        const max = Math.max(...history);
        return Math.round(max - min);
    }

    updateDisplay() {
        // Update angles display
        const anglesDiv = this.container.querySelector('#angles');
        anglesDiv.innerHTML = Object.entries(this.metrics.jointAngles)
            .map(([joint, data]) => {
                if (data.left && data.right) {
                    // Handle bilateral measurements
                    return `
                        <div class="metric-group">
                            <div class="metric-header">${this.formatJointName(joint)}</div>
                            <div class="metric-value">
                                <span class="label">Left: ${data.left.value}° (${data.left.normal})</span>
                                <span class="description">${data.left.description}</span>
                            </div>
                            <div class="metric-value">
                                <span class="label">Right: ${data.right.value}° (${data.right.normal})</span>
                                <span class="description">${data.right.description}</span>
                            </div>
                        </div>
                    `;
                } else {
                    // Handle single measurements
                    return `
                        <div class="metric-value">
                            <div class="metric-header">
                                <span class="label">${this.formatJointName(joint)}</span>
                                <span class="normal-range">${data.normal}</span>
                            </div>
                            <div class="value ${this.getValueClass(data.value)}">
                                ${Math.round(data.value)}°
                            </div>
                            <div class="description">${data.description}</div>
                        </div>
                    `;
                }
            }).join('');

        // Update posture metrics
        const postureDiv = this.container.querySelector('#posture');
        postureDiv.innerHTML = Object.entries(this.metrics.posture)
            .map(([metric, value]) => `
                <div class="metric-value">
                    <span class="label">${this.formatMetricName(metric)}:</span>
                    <span class="value ${this.getValueClass(value)}">
                        ${Math.round(value)}%
                    </span>
                </div>
            `).join('');

        // Update quality metrics
        const qualityDiv = this.container.querySelector('#quality');
        qualityDiv.innerHTML = `
            <div class="metric-value">
                <span class="label">Arm Symmetry:</span>
                <span class="value ${this.getValueClass(this.metrics.symmetry.arms)}">
                    ${Math.round(this.metrics.symmetry.arms)}%
                </span>
            </div>
            <div class="metric-value">
                <span class="label">Leg Symmetry:</span>
                <span class="value ${this.getValueClass(this.metrics.symmetry.legs)}">
                    ${Math.round(this.metrics.symmetry.legs)}%
                </span>
            </div>
            ${Object.entries(this.metrics.rangeOfMotion)
                .map(([part, range]) => `
                    <div class="metric-value">
                        <span class="label">${this.formatJointName(part)} ROM:</span>
                        <span class="value">${range}°</span>
                    </div>
                `).join('')}
        `;
    }

    getValueClass(value) {
        if (value >= 90) return 'excellent';
        if (value >= 75) return 'good';
        if (value >= 60) return 'fair';
        return 'poor';
    }

    formatJointName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }

    formatMetricName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }
} 