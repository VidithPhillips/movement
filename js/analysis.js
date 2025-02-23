class MovementAnalyzer {
    constructor() {
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
    }

    setBaseline(angles) {
        this.baselineAngles = angles;
    }

    updateMetrics(pose, detector) {
        if (!pose) return;

        // Calculate all metrics
        const angles = detector.calculateJointAngles(pose);
        const faceMetrics = detector.calculateFaceMetrics(pose);
        const postureMetrics = detector.calculatePosture(pose);
        
        // Update angle history
        Object.keys(angles).forEach(joint => {
            if (angles[joint] !== null) {
                this.angleHistory[joint] = this.angleHistory[joint] || [];
                this.angleHistory[joint].push(angles[joint]);
                if (this.angleHistory[joint].length > 2) {
                    this.angleHistory[joint].shift();
                }
            }
        });

        // Update all DOM elements with new metrics
        this.updateBodyAnglesDOM(angles);
        this.updateHeadFaceDOM(faceMetrics);
        this.updatePostureDOM(postureMetrics);
    }

    updateBodyAnglesDOM(angles) {
        const bodyAnglesDiv = document.getElementById('bodyAngles');
        bodyAnglesDiv.innerHTML = Object.entries(angles)
            .map(([joint, angle]) => {
                let changeInfo = "";
                const history = this.angleHistory[joint];
                if (history && history.length >= 2) {
                    const change = history[history.length - 1] - history[history.length - 2];
                    const changeSymbol = change > 0 ? '↑' : change < 0 ? '↓' : '→';
                    changeInfo = `<div class="change-indicator ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}">
                        ${changeSymbol} ${Math.abs(change).toFixed(1)}°
                    </div>`;
                }
                
                return `<div class="metric-value">
                    <div class="metric-label">${this.formatJointName(joint)}</div>
                    <div class="metric-number">
                        ${angle ? angle.toFixed(1) : 'N/A'}°
                        ${changeInfo}
                    </div>
                </div>`;
            }).join('');
    }

    updateHeadFaceDOM(metrics) {
        const headFaceDiv = document.getElementById('headFaceMetrics');
        const formattedMetrics = {
            'Eye Distance': metrics.eyeDistance ? `${metrics.eyeDistance.toFixed(1)}px` : 'N/A',
            'Eye Tilt': metrics.eyeTilt ? `${metrics.eyeTilt.toFixed(1)}°` : 'N/A',
            'Head Rotation': metrics.headRotation ? `${(metrics.headRotation * 100).toFixed(1)}%` : 'N/A',
            'Head Tilt': metrics.headTilt ? `${metrics.headTilt.toFixed(1)}°` : 'N/A',
            'Forward Tilt': metrics.headForwardTilt ? `${metrics.headForwardTilt.toFixed(1)}px` : 'N/A'
        };

        headFaceDiv.innerHTML = Object.entries(formattedMetrics)
            .map(([label, value]) => `
                <div class="metric-value">
                    <div class="metric-label">${label}</div>
                    <div class="metric-number">${value}</div>
                </div>
            `).join('');
    }

    updatePostureDOM(posture) {
        const postureDiv = document.getElementById('postureMetrics');
        const formattedMetrics = {
            'Spine Angle': posture.spineAngle ? `${posture.spineAngle.toFixed(1)}°` : 'N/A',
            'Shoulder Level': posture.shoulderLevel ? `${posture.shoulderLevel.toFixed(1)}°` : 'N/A',
            'Body Symmetry': posture.symmetry ? `${posture.symmetry.toFixed(1)}°` : 'N/A'
        };

        postureDiv.innerHTML = Object.entries(formattedMetrics)
            .map(([label, value]) => `
                <div class="metric-value">
                    <div class="metric-label">${label}</div>
                    <div class="metric-number">${value}</div>
                </div>
            `).join('');
    }

    formatJointName(name) {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    reset() {
        Object.keys(this.angleHistory).forEach(key => {
            this.angleHistory[key] = [];
        });
    }
} 