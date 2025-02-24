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
        
        this.historyLength = 30; // 1 second at 30fps
    }

    setupMetrics() {
        this.metrics = {
            sagittalPlane: {},
            frontalPlane: {},
            functional: {},
            quality: {}
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
                <h3>Sagittal Plane (Side View)</h3>
                <div id="sagittal" class="metric-grid"></div>
            </div>
            <div class="metric-box">
                <h3>Frontal Plane (Front View)</h3>
                <div id="frontal" class="metric-grid"></div>
            </div>
            <div class="metric-box">
                <h3>Functional Movement</h3>
                <div id="functional" class="metric-grid"></div>
            </div>
            <div class="metric-box">
                <h3>Movement Quality</h3>
                <div id="quality" class="metric-grid"></div>
            </div>
        `;
    }

    updateMetrics(landmarks) {
        if (!landmarks) return;

        // Sagittal Plane Measurements
        this.metrics.sagittalPlane = {
            trunkFlexion: {
                value: this.calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
                description: "Forward/backward lean",
                normal: "0-15°",
                direction: value => value > 7.5 ? "Forward lean" : "Neutral/Back",
                clinical: "Indicates postural alignment in standing"
            },
            neckFlexion: {
                value: this.calculateAngle(landmarks[7], landmarks[0], landmarks[11]),
                description: "Head forward position",
                normal: "0-35°",
                direction: value => value > 45 ? "Forward head" : "Neutral",
                clinical: "Forward head posture assessment"
            },
            hipFlexion: {
                left: {
                    value: this.calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
                    description: "Left hip bend",
                    normal: "0-125°",
                    clinical: "Hip mobility and function"
                },
                right: {
                    value: this.calculateAngle(landmarks[12], landmarks[24], landmarks[26]),
                    description: "Right hip bend",
                    normal: "0-125°",
                    clinical: "Hip mobility and function"
                }
            }
        };

        // Frontal Plane Measurements
        this.metrics.frontalPlane = {
            shoulderTilt: {
                value: this.calculateHorizontalDeviation(landmarks[11], landmarks[12]),
                description: "Shoulder levelness",
                normal: "0-5°",
                clinical: "Shoulder girdle alignment"
            },
            pelvisTilt: {
                value: this.calculateHorizontalDeviation(landmarks[23], landmarks[24]),
                description: "Pelvic tilt",
                normal: "0-5°",
                clinical: "Pelvic alignment assessment"
            },
            lateralLean: {
                value: this.calculateVerticalDeviation([landmarks[11], landmarks[23]]),
                description: "Side lean",
                normal: "0-5°",
                clinical: "Lateral postural alignment"
            }
        };

        // Functional Measurements
        this.metrics.functional = {
            kneeFlexion: {
                left: {
                    value: this.calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
                    description: "Left knee mobility",
                    normal: "0-140°",
                    clinical: "Knee function during movement"
                },
                right: {
                    value: this.calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
                    description: "Right knee mobility",
                    normal: "0-140°",
                    clinical: "Knee function during movement"
                }
            }
        };

        // Update quality metrics
        this.updateMovementQuality(landmarks);
        
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

    updateMovementQuality(landmarks) {
        // Calculate symmetry
        this.metrics.quality.symmetry = {
            arms: this.calculateSymmetry(
                this.metrics.sagittalPlane.leftShoulder,
                this.metrics.sagittalPlane.rightShoulder,
                this.metrics.sagittalPlane.leftElbow,
                this.metrics.sagittalPlane.rightElbow
            ),
            legs: this.calculateSymmetry(
                this.metrics.sagittalPlane.leftHip,
                this.metrics.sagittalPlane.rightHip,
                this.metrics.sagittalPlane.leftKnee,
                this.metrics.sagittalPlane.rightKnee
            )
        };
        
        // Update range of motion tracking
        this.updateRangeOfMotion(landmarks);
    }

    calculateSymmetry(leftUpper, rightUpper, leftLower, rightLower) {
        const upperDiff = Math.abs(leftUpper - rightUpper);
        const lowerDiff = Math.abs(leftLower - rightLower);
        return Math.max(0, 100 - ((upperDiff + lowerDiff) / 2));
    }

    updateRangeOfMotion(landmarks) {
        // Update angle histories
        this.updateAngleHistory('leftShoulder', this.metrics.sagittalPlane.leftShoulder);
        this.updateAngleHistory('rightShoulder', this.metrics.sagittalPlane.rightShoulder);
        this.updateAngleHistory('leftHip', this.metrics.sagittalPlane.leftHip);
        this.updateAngleHistory('rightHip', this.metrics.sagittalPlane.rightHip);
        this.updateAngleHistory('spine', this.metrics.sagittalPlane.spine);

        // Calculate range of motion
        this.metrics.quality.rangeOfMotion = {
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
        // Update sagittal plane metrics
        const sagittalDiv = this.container.querySelector('#sagittal');
        sagittalDiv.innerHTML = this.generateMetricsHTML(this.metrics.sagittalPlane, 'sagittal');

        // Update frontal plane metrics
        const frontalDiv = this.container.querySelector('#frontal');
        frontalDiv.innerHTML = this.generateMetricsHTML(this.metrics.frontalPlane, 'frontal');

        // Update functional metrics
        const functionalDiv = this.container.querySelector('#functional');
        functionalDiv.innerHTML = this.generateMetricsHTML(this.metrics.functional, 'functional');

        // Update quality metrics
        const qualityDiv = this.container.querySelector('#quality');
        qualityDiv.innerHTML = this.generateQualityHTML(this.metrics.quality);
    }

    generateMetricsHTML(metrics, plane) {
        return Object.entries(metrics)
            .map(([name, data]) => {
                if (data.left && data.right) {
                    return this.generateBilateralMetricHTML(name, data);
                }
                return this.generateSingleMetricHTML(name, data, plane);
            }).join('');
    }

    generateSingleMetricHTML(name, data, plane) {
        const direction = data.direction ? data.direction(data.value) : '';
        return `
            <div class="metric-value">
                <div class="metric-header">
                    <span class="plane-indicator">${this.formatPlaneName(plane)}</span>
                    <span class="label">${this.formatMetricName(name)}</span>
                </div>
                <div class="value-container">
                    <span class="value ${this.getValueClass(data.value, data.normal)}">
                        ${Math.round(data.value)}°
                    </span>
                    <span class="direction">${direction}</span>
                    <span class="normal-range">Normal: ${data.normal}</span>
                </div>
                <div class="description">${data.description}</div>
                <div class="clinical-note">${data.clinical}</div>
            </div>
        `;
    }

    generateBilateralMetricHTML(name, data) {
        return `
            <div class="metric-group">
                <div class="metric-header bilateral">
                    <span class="label">${this.formatMetricName(name)}</span>
                    <span class="normal-range">Normal: ${data.left.normal}</span>
                </div>
                <div class="bilateral-container">
                    <div class="side-value">
                        <span class="side-label">Left</span>
                        <span class="value ${this.getValueClass(data.left.value, data.left.normal)}">
                            ${Math.round(data.left.value)}°
                        </span>
                    </div>
                    <div class="side-value">
                        <span class="side-label">Right</span>
                        <span class="value ${this.getValueClass(data.right.value, data.right.normal)}">
                            ${Math.round(data.right.value)}°
                        </span>
                    </div>
                </div>
                <div class="clinical-note">${data.left.clinical}</div>
            </div>
        `;
    }

    formatPlaneName(plane) {
        const planes = {
            sagittal: 'Side View',
            frontal: 'Front View',
            functional: 'Movement'
        };
        return planes[plane] || plane;
    }

    getValueClass(value, normalRange) {
        if (!normalRange) return '';
        const [min, max] = normalRange.split('-').map(n => parseInt(n));
        if (value >= min && value <= max) return 'normal';
        return value < min ? 'below' : 'above';
    }

    formatMetricName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }
} 