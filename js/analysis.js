class MovementAnalyzer {
    constructor(containerId) {
        console.log('Initializing MovementAnalyzer...');
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Metrics container not found:', containerId);
            return;
        }
        
        this.setupMetrics();
        this.setupEventListeners();
    }

    setupMetrics() {
        this.metrics = {
            upperBody: {},
            core: {},
            lowerBody: {}
        };
    }

    setupEventListeners() {
        window.addEventListener('pose-updated', (event) => {
            console.log('Received pose update');
            this.updateMetrics(event.detail);
        });
    }

    updateMetrics(landmarks) {
        if (!landmarks) return;
        
        const metrics = {
            upperBody: {
                shoulderAngle: {
                    left: this.calculateAngle(landmarks[13], landmarks[11], landmarks[23]),
                    right: this.calculateAngle(landmarks[14], landmarks[12], landmarks[24])
                },
                neckTilt: this.calculateAngle(landmarks[7], landmarks[0], landmarks[11]),
                elbowAngle: {
                    left: this.calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
                    right: this.calculateAngle(landmarks[12], landmarks[14], landmarks[16])
                },
                wristAngle: {
                    left: this.calculateAngle(landmarks[13], landmarks[15], landmarks[17]),
                    right: this.calculateAngle(landmarks[14], landmarks[16], landmarks[18])
                },
                shoulderRotation: {
                    left: this.calculateRotation([landmarks[11], landmarks[13]]),
                    right: this.calculateRotation([landmarks[12], landmarks[14]])
                }
            },
            core: {
                spineAngle: this.calculateAngle(landmarks[0], landmarks[11], landmarks[23]),
                trunkLean: this.calculateVerticalDeviation([landmarks[11], landmarks[23]]),
                pelvisAngle: this.calculateAngle(landmarks[23], landmarks[24], landmarks[26]),
                torsoRotation: this.calculateRotation(
                    [landmarks[11], landmarks[12]],
                    [landmarks[23], landmarks[24]]
                ),
                lateralBend: this.calculateAngle(landmarks[11], landmarks[23], landmarks[24])
            },
            lowerBody: {
                kneeAngle: {
                    left: this.calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
                    right: this.calculateAngle(landmarks[24], landmarks[26], landmarks[28])
                },
                hipAngle: {
                    left: this.calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
                    right: this.calculateAngle(landmarks[12], landmarks[24], landmarks[26])
                },
                ankleAngle: {
                    left: this.calculateAngle(landmarks[25], landmarks[27], landmarks[31]),
                    right: this.calculateAngle(landmarks[26], landmarks[28], landmarks[32])
                },
                hipRotation: {
                    left: this.calculateRotation([landmarks[23], landmarks[25]]),
                    right: this.calculateRotation([landmarks[24], landmarks[26]])
                },
                kneeAlignment: {
                    left: this.calculateAlignment(landmarks[23], landmarks[25], landmarks[27]),
                    right: this.calculateAlignment(landmarks[24], landmarks[26], landmarks[28])
                }
            }
        };

        this.updateDisplay(metrics);
    }

    updateDisplay(metrics) {
        let html = '';

        // Upper Body
        html += `
            <div class="metric-box">
                <h3>Upper Body</h3>
                <div class="metric-grid">
                    <div class="metric-value">
                        <div class="metric-header">Shoulder Angle</div>
                        <div class="bilateral-values">
                            <span>L: ${Math.round(metrics.upperBody.shoulderAngle.left)}°</span>
                            <span>R: ${Math.round(metrics.upperBody.shoulderAngle.right)}°</span>
                        </div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Elbow Angle</div>
                        <div class="bilateral-values">
                            <span>L: ${Math.round(metrics.upperBody.elbowAngle.left)}°</span>
                            <span>R: ${Math.round(metrics.upperBody.elbowAngle.right)}°</span>
                        </div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Wrist Angle</div>
                        <div class="bilateral-values">
                            <span>L: ${Math.round(metrics.upperBody.wristAngle.left)}°</span>
                            <span>R: ${Math.round(metrics.upperBody.wristAngle.right)}°</span>
                        </div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Neck Tilt</div>
                        <div class="value">${Math.round(metrics.upperBody.neckTilt)}°</div>
                    </div>
                </div>
            </div>
        `;

        // Core
        html += `
            <div class="metric-box">
                <h3>Core</h3>
                <div class="metric-grid">
                    <div class="metric-value">
                        <div class="metric-header">Spine Angle</div>
                        <div class="value">${Math.round(metrics.core.spineAngle)}°</div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Trunk Lean</div>
                        <div class="value">${Math.round(metrics.core.trunkLean)}°</div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Pelvis Angle</div>
                        <div class="value">${Math.round(metrics.core.pelvisAngle)}°</div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Torso Rotation</div>
                        <div class="value">${Math.round(metrics.core.torsoRotation)}°</div>
                    </div>
                </div>
            </div>
        `;

        // Lower Body
        html += `
            <div class="metric-box">
                <h3>Lower Body</h3>
                <div class="metric-grid">
                    <div class="metric-value">
                        <div class="metric-header">Hip Angle</div>
                        <div class="bilateral-values">
                            <span>L: ${Math.round(metrics.lowerBody.hipAngle.left)}°</span>
                            <span>R: ${Math.round(metrics.lowerBody.hipAngle.right)}°</span>
                        </div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Knee Angle</div>
                        <div class="bilateral-values">
                            <span>L: ${Math.round(metrics.lowerBody.kneeAngle.left)}°</span>
                            <span>R: ${Math.round(metrics.lowerBody.kneeAngle.right)}°</span>
                        </div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Ankle Angle</div>
                        <div class="bilateral-values">
                            <span>L: ${Math.round(metrics.lowerBody.ankleAngle.left)}°</span>
                            <span>R: ${Math.round(metrics.lowerBody.ankleAngle.right)}°</span>
                        </div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-header">Hip Rotation</div>
                        <div class="bilateral-values">
                            <span>L: ${Math.round(metrics.lowerBody.hipRotation.left)}°</span>
                            <span>R: ${Math.round(metrics.lowerBody.hipRotation.right)}°</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    calculateAngle(a, b, c) {
        if (!a || !b || !c) return 0;
        
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

    calculateVerticalDeviation(points) {
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

    calculateDepth(point1, point2) {
        if (!point1?.z || !point2?.z) return null;
        return Math.abs(point1.z - point2.z);
    }

    calculateRotation(line1, line2) {
        // Calculate angle between two lines (e.g., shoulders vs hips)
        const angle1 = Math.atan2(line1[1].y - line1[0].y, line1[1].x - line1[0].x);
        const angle2 = Math.atan2(line2[1].y - line2[0].y, line2[1].x - line2[0].x);
        return Math.abs((angle1 - angle2) * 180 / Math.PI);
    }

    calculateAlignment(point1, point2, point3) {
        // Calculate deviation from straight line
        const expectedY = point1.y + (point3.y - point1.y) * 
            ((point2.x - point1.x) / (point3.x - point1.x));
        return Math.abs(point2.y - expectedY);
    }

    calculateSymmetry(bilateralMetric) {
        if (!bilateralMetric?.left || !bilateralMetric?.right) return null;
        const diff = Math.abs(bilateralMetric.left - bilateralMetric.right);
        return Math.max(0, 100 - (diff * 2));
    }

    calculateBalanceScore(landmarks) {
        // Calculate center of mass and base of support
        const com = this.calculateCenterOfMass(landmarks);
        const bos = this.calculateBaseOfSupport(landmarks);
        return this.calculateStabilityIndex(com, bos);
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
        const confidence = this.calculateLandmarkConfidence(landmarks);

        // More lenient validation
        return {
            isValid: confidence.isValid && distance?.isValid,
            messages: [
                ...(!distance?.isValid ? [
                    `Adjust position: ${
                        distance?.tooClose 
                            ? 'Step back' 
                            : 'Step closer'
                    } (${distance?.value.toFixed(1)}ft)`
                ] : []),
                ...(!confidence.isValid ? [
                    'Ensure full body is visible'
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
        if (!this.distanceGauge?.fill) return;
        
        const distance = this.estimateDistanceFromCamera(landmarks);
        if (distance === null) return;
        
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