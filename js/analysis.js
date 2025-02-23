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
        
        const faceMetrics = detector.calculateFaceMetrics(pose);
        
        // Determine tracking mode based on eye distance (face size)
        // If eyeDistance is greater than a threshold, assume a close-up (head tracking)
        // Otherwise, assume full body tracking.
        let mode = 'full';
        const threshold = 70; // Adjust this value (in pixels) to fit your environment
        if (faceMetrics && faceMetrics.eyeDistance && faceMetrics.eyeDistance > threshold) {
            mode = 'head';
        }
        console.log('Tracking mode:', mode, 'eyeDistance:', faceMetrics ? faceMetrics.eyeDistance : 'N/A');

        if (mode === 'full') {
            const angles = detector.calculateJointAngles(pose);
            const postureMetrics = detector.calculatePosture(pose);
            this.updateBodyAnglesDOM(angles);
            this.updatePostureDOM(postureMetrics);
        }

        // Always update head & face metrics in both modes
        this.updateHeadFaceDOM(faceMetrics);
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
            'Head Yaw': metrics.headYaw ? `${metrics.headYaw.toFixed(1)}°` : 'N/A',
            'Head Pitch': metrics.headPitch ? `${metrics.headPitch.toFixed(1)}°` : 'N/A',
            'Head Roll': metrics.headRoll ? `${metrics.headRoll.toFixed(1)}°` : 'N/A',
            'Eye Symmetry': metrics.eyeSymmetry ? `${metrics.eyeSymmetry.toFixed(1)}` : 'N/A'
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