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

        // Add threshold configurations
        this.thresholds = {
            distance: {
                min: 0.3, // Normalized shoulder width when too close
                max: 0.5, // Normalized shoulder width when too far
                optimal: 0.4 // Ideal normalized shoulder width
            },
            orientation: {
                maxTilt: 30, // Maximum degrees of body tilt allowed
                maxRotation: 45 // Maximum degrees of rotation allowed
            },
            confidence: {
                min: 0.7 // Minimum confidence score for reliable measurements
            }
        }

        this.distanceGauge = {
            fill: document.querySelector('.gauge-fill'),
            optimal: {
                min: 0.35,
                max: 0.45
            }
        };
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

        // Update distance gauge
        this.updateDistanceGauge(landmarks);

        const validationResult = this.isValidMeasurement(landmarks);
        
        if (!validationResult.isValid) {
            this.showValidationWarnings(validationResult.messages);
            return;
        }

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
        this.metrics.quality = {
            postural: {
                alignment: {
                    value: this.calculatePosturalAlignment(landmarks),
                    description: "Overall postural alignment",
                    normal: "80-100%",
                    clinical: "Indicates overall postural control"
                },
                stability: {
                    value: this.calculateStability(landmarks),
                    description: "Postural stability",
                    normal: "85-100%",
                    clinical: "Balance and stability assessment"
                }
            },
            symmetry: {
                upper: {
                    value: this.calculateUpperBodySymmetry(landmarks),
                    description: "Upper body symmetry",
                    normal: "90-100%",
                    clinical: "Left-right upper body comparison"
                },
                lower: {
                    value: this.calculateLowerBodySymmetry(landmarks),
                    description: "Lower body symmetry",
                    normal: "90-100%",
                    clinical: "Left-right lower body comparison"
                }
            },
            movement: {
                smoothness: {
                    value: this.calculateMovementSmoothness(),
                    description: "Movement smoothness",
                    normal: "85-100%",
                    clinical: "Quality of movement transitions"
                },
                coordination: {
                    value: this.calculateCoordination(landmarks),
                    description: "Movement coordination",
                    normal: "80-100%",
                    clinical: "Multi-joint coordination"
                }
            }
        };
    }

    calculatePosturalAlignment(landmarks) {
        // Calculate vertical alignment of key points
        const verticalPoints = [landmarks[0], landmarks[11], landmarks[23], landmarks[25]];
        let alignment = this.calculateVerticalDeviation(verticalPoints);
        
        // Adjust for distance from camera
        const distance = this.estimateDistanceFromCamera(landmarks);
        return this.adjustMetricForDistance(alignment, distance);
    }

    calculateStability(landmarks) {
        // Track movement of center points over time
        const centerPoints = [
            landmarks[23], // left hip
            landmarks[24]  // right hip
        ];
        
        // Calculate stability based on movement variation
        return this.calculateMovementStability(centerPoints);
    }

    estimateDistanceFromCamera(landmarks) {
        // Use shoulder width as reference
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
        
        // Add confidence check
        const confidence = (leftShoulder.visibility + rightShoulder.visibility) / 2;
        if (confidence < 0.7) return null;

        return this.normalizeDistance(shoulderWidth);
    }

    adjustMetricForDistance(value, distance) {
        // Adjust metrics based on subject's distance from camera
        const optimalDistance = 0.4; // normalized optimal distance
        const tolerance = 0.1;
        
        if (Math.abs(distance - optimalDistance) > tolerance) {
            return null; // or return adjusted value
        }
        return value;
    }

    calculateMovementStability(points, timeWindow = 30) {
        // Calculate stability over time window
        if (!this.positionHistory) {
            this.positionHistory = [];
        }
        
        this.positionHistory.push(points);
        if (this.positionHistory.length > timeWindow) {
            this.positionHistory.shift();
        }
        
        // Calculate variation in position
        return this.calculateStabilityScore(this.positionHistory);
    }

    normalizeDistance(shoulderWidth) {
        // Normalize shoulder width to 0-1 range
        // Typical shoulder width in pixels at 6-8 feet
        const minWidth = 100;
        const maxWidth = 200;
        return (shoulderWidth - minWidth) / (maxWidth - minWidth);
    }

    calculateStabilityScore(history) {
        if (history.length < 2) return 100;
        
        // Calculate movement variance
        let totalVariance = 0;
        for (let i = 1; i < history.length; i++) {
            const prev = history[i-1];
            const curr = history[i];
            totalVariance += this.calculatePointsVariance(prev, curr);
        }
        
        // Convert to stability score (100% = perfectly stable)
        return Math.max(0, 100 - (totalVariance * 100));
    }

    calculatePointsVariance(points1, points2) {
        // Calculate movement variance between two sets of points
        let totalVariance = 0;
        for (let i = 0; i < points1.length; i++) {
            const dx = points1[i].x - points2[i].x;
            const dy = points1[i].y - points2[i].y;
            totalVariance += dx*dx + dy*dy;
        }
        return Math.sqrt(totalVariance / points1.length);
    }

    calculateUpperBodySymmetry(landmarks) {
        // Implementation of calculateUpperBodySymmetry method
    }

    calculateLowerBodySymmetry(landmarks) {
        // Implementation of calculateLowerBodySymmetry method
    }

    calculateMovementSmoothness() {
        // Implementation of calculateMovementSmoothness method
    }

    calculateCoordination(landmarks) {
        // Implementation of calculateCoordination method
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
        const distanceValid = this.isDistanceValid();
        
        if (!distanceValid) {
            return `
                <div class="metric-value warning">
                    <div class="metric-header">
                        <span class="plane-indicator">${this.formatPlaneName(plane)}</span>
                        <span class="label">${this.formatMetricName(name)}</span>
                    </div>
                    <div class="distance-warning">
                        Please adjust distance from camera (6-8 feet optimal)
                    </div>
                </div>
            `;
        }

        return `
            <div class="metric-value">
                <div class="metric-header">
                    <span class="plane-indicator">${this.formatPlaneName(plane)}</span>
                    <span class="label">${this.formatMetricName(name)}</span>
                </div>
                <div class="value-container">
                    <span class="value ${this.getValueClass(data.value, data.normal, name)}">
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
                        <span class="value ${this.getValueClass(data.left.value, data.left.normal, name)}">
                            ${Math.round(data.left.value)}°
                        </span>
                    </div>
                    <div class="side-value">
                        <span class="side-label">Right</span>
                        <span class="value ${this.getValueClass(data.right.value, data.right.normal, name)}">
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

    getValueClass(value, normalRange, metric) {
        if (!value || !normalRange) return '';
        
        // Parse range values
        const [min, max] = normalRange.replace('°', '').replace('%', '')
            .split('-').map(n => parseFloat(n));

        // Different thresholds for different metric types
        switch(metric) {
            case 'symmetry':
                if (value >= 95) return 'excellent';
                if (value >= 85) return 'good';
                if (value >= 75) return 'fair';
                return 'poor';

            case 'stability':
                if (value >= 90) return 'excellent';
                if (value >= 80) return 'good';
                if (value >= 70) return 'fair';
                return 'poor';

            case 'angle':
                // For joint angles, being within range is good
                if (value >= min && value <= max) return 'normal';
                // Small deviations are fair
                if (value < min && value >= min - 10 || 
                    value > max && value <= max + 10) return 'fair';
                return 'poor';

            default:
                if (value >= 90) return 'excellent';
                if (value >= 75) return 'good';
                if (value >= 60) return 'fair';
                return 'poor';
        }
    }

    formatMetricName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }

    isValidMeasurement(landmarks) {
        const distance = this.estimateDistanceFromCamera(landmarks);
        const orientation = this.calculateBodyOrientation(landmarks);
        const confidence = this.calculateLandmarkConfidence(landmarks);

        return {
            isValid: distance.isValid && orientation.isValid && confidence.isValid,
            messages: [
                ...(!distance.isValid ? [
                    `Please adjust distance: ${
                        distance.tooClose 
                            ? 'Step back (2-3 feet)' 
                            : 'Step closer (2-3 feet)'
                    }`
                ] : []),
                ...(!orientation.isValid ? [
                    `Body alignment: ${
                        Math.abs(orientation.tilt) > this.thresholds.orientation.maxTilt
                            ? 'Face the camera directly'
                            : 'Reduce body rotation'
                    }`
                ] : []),
                ...(!confidence.isValid ? [
                    'Ensure your full body is visible in frame'
                ] : [])
            ]
        };
    }

    calculateBodyOrientation(landmarks) {
        // Calculate body orientation using shoulders and hips
        const shoulderVector = {
            x: landmarks[12].x - landmarks[11].x,
            y: landmarks[12].y - landmarks[11].y
        };
        const hipVector = {
            x: landmarks[24].x - landmarks[23].x,
            y: landmarks[24].y - landmarks[23].y
        };

        const shoulderAngle = Math.atan2(shoulderVector.y, shoulderVector.x) * 180 / Math.PI;
        const hipAngle = Math.atan2(hipVector.y, hipVector.x) * 180 / Math.PI;

        return {
            isValid: Math.abs(shoulderAngle) < this.thresholds.orientation.maxTilt && 
                    Math.abs(hipAngle) < this.thresholds.orientation.maxTilt,
            tilt: shoulderAngle,
            rotation: Math.abs(shoulderAngle - hipAngle)
        };
    }

    calculateLandmarkConfidence(landmarks) {
        // Check visibility and confidence of key landmarks
        const keyPoints = [
            landmarks[0],  // nose
            landmarks[11], landmarks[12], // shoulders
            landmarks[23], landmarks[24], // hips
            landmarks[25], landmarks[26], // knees
            landmarks[27], landmarks[28]  // ankles
        ];

        const avgConfidence = keyPoints.reduce((sum, point) => 
            sum + (point.visibility || 0), 0) / keyPoints.length;

        return {
            isValid: avgConfidence > this.thresholds.confidence.min,
            value: avgConfidence
        };
    }

    showValidationWarnings(messages) {
        const warningHTML = `
            <div class="validation-warning">
                ${messages.map(msg => `<div class="warning-message">${msg}</div>`).join('')}
            </div>
        `;

        // Update each metric section with warnings
        ['sagittal', 'frontal', 'functional', 'quality'].forEach(section => {
            const div = this.container.querySelector(`#${section}`);
            if (div) div.innerHTML = warningHTML;
        });
    }

    updateDistanceGauge(landmarks) {
        const distance = this.estimateDistanceFromCamera(landmarks);
        const fill = this.distanceGauge.fill;
        
        // Remove existing classes
        fill.classList.remove('too-close', 'optimal', 'too-far');
        
        // Update gauge based on distance
        if (distance < this.distanceGauge.optimal.min) {
            fill.classList.add('too-close');
            fill.style.width = `${(distance / this.distanceGauge.optimal.min) * 30}%`;
        } else if (distance > this.distanceGauge.optimal.max) {
            fill.classList.add('too-far');
            fill.style.width = `${(distance / this.distanceGauge.optimal.max) * 80}%`;
        } else {
            fill.classList.add('optimal');
            fill.style.width = '50%';
        }
    }
} 