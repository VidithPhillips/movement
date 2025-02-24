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

        // Initialize distance gauge after DOM is ready
        requestAnimationFrame(() => {
            this.distanceGauge = {
                fill: document.querySelector('.gauge-fill'),
                optimal: {
                    min: 0.35,
                    max: 0.45
                }
            };
            
            // Add error handling
            if (!this.distanceGauge.fill) {
                console.error('Distance gauge element not found');
            }
        });
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

        // Always update distance gauge
        this.updateDistanceGauge(landmarks);

        // Calculate confidence for each body segment
        const confidence = {
            upper: this.calculateSegmentConfidence(landmarks, [0, 11, 12, 13, 14, 15, 16]),
            core: this.calculateSegmentConfidence(landmarks, [11, 12, 23, 24]),
            lower: this.calculateSegmentConfidence(landmarks, [23, 24, 25, 26, 27, 28])
        };

        // Calculate available metrics based on what's visible
        let metrics = {};

        if (confidence.upper.isValid) {
            metrics.upperBody = {
                shoulderAngle: this.calculateAngle(landmarks[13], landmarks[11], landmarks[23]),
                neckTilt: this.calculateAngle(landmarks[7], landmarks[0], landmarks[11])
                // Add other upper body metrics
            };
        }

        if (confidence.core.isValid) {
            metrics.core = {
                spineAngle: this.calculateAngle(landmarks[0], landmarks[11], landmarks[23]),
                trunkLean: this.calculateVerticalDeviation([landmarks[11], landmarks[23]])
                // Add other core metrics
            };
        }

        if (confidence.lower.isValid) {
            metrics.lowerBody = {
                kneeAngle: {
                    left: this.calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
                    right: this.calculateAngle(landmarks[24], landmarks[26], landmarks[28])
                },
                hipAngle: {
                    left: this.calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
                    right: this.calculateAngle(landmarks[12], landmarks[24], landmarks[26])
                }
                // Add other lower body metrics
            };
        }

        // Update display with available metrics
        this.updateDisplay(metrics, confidence);
    }

    calculateSegmentConfidence(landmarks, indices) {
        const visibilities = indices.map(i => landmarks[i]?.visibility || 0);
        const avgVisibility = visibilities.reduce((a, b) => a + b, 0) / visibilities.length;
        return {
            isValid: avgVisibility > 0.5,
            value: avgVisibility
        };
    }

    updateDisplay(metrics, confidence) {
        let html = '';

        // Upper Body Section
        if (confidence.upper.isValid) {
            html += `
                <div class="metric-box">
                    <h3>Upper Body</h3>
                    <div class="metric-grid">
                        ${this.generateMetricsHTML(metrics.upperBody)}
                    </div>
                </div>
            `;
        }

        // Core Section
        if (confidence.core.isValid) {
            html += `
                <div class="metric-box">
                    <h3>Core</h3>
                    <div class="metric-grid">
                        ${this.generateMetricsHTML(metrics.core)}
                    </div>
                </div>
            `;
        }

        // Lower Body Section
        if (confidence.lower.isValid) {
            html += `
                <div class="metric-box">
                    <h3>Lower Body</h3>
                    <div class="metric-grid">
                        ${this.generateMetricsHTML(metrics.lowerBody)}
                    </div>
                </div>
            `;
        }

        this.container.innerHTML = html || '<div class="metric-box">Adjusting camera view...</div>';
    }

    generateMetricsHTML(metrics) {
        if (!metrics) return '';
        
        return Object.entries(metrics).map(([name, value]) => {
            if (typeof value === 'object' && (value.left || value.right)) {
                // Bilateral metrics
                return `
                    <div class="metric-value">
                        <div class="metric-header">${this.formatMetricName(name)}</div>
                        <div class="bilateral-values">
                            <span>L: ${Math.round(value.left)}°</span>
                            <span>R: ${Math.round(value.right)}°</span>
                        </div>
                    </div>
                `;
            } else {
                // Single metrics
                return `
                    <div class="metric-value">
                        <div class="metric-header">${this.formatMetricName(name)}</div>
                        <div class="value">
                            ${Math.round(value)}°
                        </div>
                    </div>
                `;
            }
        }).join('');
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
        // Use height of the person in frame as reference
        const topPoint = landmarks[0];  // nose
        const bottomPoint = landmarks[28]; // right ankle
        
        if (!topPoint || !bottomPoint) return null;
        
        const personHeight = Math.abs(bottomPoint.y - topPoint.y);
        const frameHeight = 1.0; // MediaPipe normalizes to 0-1
        
        // Calculate percentage of frame occupied
        const frameOccupancy = personHeight / frameHeight;
        
        // Rough distance estimate (in feet) based on frame occupancy
        // When person takes up ~70% of frame height, they're typically at optimal distance
        const estimatedDistance = 7 * (0.7 / frameOccupancy);
        
        return {
            value: estimatedDistance,
            isValid: frameOccupancy > 0.4 && frameOccupancy < 0.95, // Allow wider range
            tooClose: frameOccupancy > 0.95,
            tooFar: frameOccupancy < 0.4
        };
    }

    adjustMetricForDistance(value, distance) {
        // Adjust metrics based on subject's distance from camera
        const optimalDistance = 0.4; // normalized optimal distance
        const tolerance = 0.1;
        
        if (Math.abs(distance.value - optimalDistance) > tolerance) {
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
        if (!distance) return;
        
        const fill = this.distanceGauge.fill;
        const label = document.querySelector('.gauge-label');
        
        // Remove existing classes
        fill.classList.remove('too-close', 'optimal', 'too-far');
        
        // Update gauge and label
        if (distance.tooClose) {
            fill.classList.add('too-close');
            fill.style.width = '90%';
            label.textContent = `Too Close (${distance.value.toFixed(1)}ft)`;
        } else if (distance.tooFar) {
            fill.classList.add('too-far');
            fill.style.width = '30%';
            label.textContent = `Too Far (${distance.value.toFixed(1)}ft)`;
        } else {
            fill.classList.add('optimal');
            fill.style.width = '60%';
            label.textContent = `Distance: ${distance.value.toFixed(1)}ft`;
        }
    }
} 