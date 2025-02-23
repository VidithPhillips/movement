class MovementAnalyzer {
    constructor() {
        this.angleHistory = {
            rightElbow: [],
            leftElbow: [],
            rightKnee: [],
            leftKnee: []
        };
        this.baselineAngles = null;
    }

    setBaseline(angles) {
        this.baselineAngles = angles;
    }

    updateMetrics(pose, detector) {
        if (!pose) return;

        // Calculate joint angles
        const angles = detector.calculateJointAngles(pose);
        
        // Update angle history for each joint
        Object.keys(angles).forEach(joint => {
            if (angles[joint] !== null) {
                this.angleHistory[joint].push(angles[joint]);
                if (this.angleHistory[joint].length > 2) {
                    this.angleHistory[joint].shift();
                }
            }
        });

        // Calculate movement speeds
        const speeds = detector.calculateMovementSpeed(pose);
        
        // Update DOM with metrics
        this.updateDOM(angles, speeds);
    }

    updateDOM(angles, speeds) {
        // Update joint angles display
        const jointAnglesDiv = document.getElementById('jointAngles');
        jointAnglesDiv.innerHTML = Object.entries(angles)
            .map(([joint, angle]) => {
                let changeInfo = "";
                const history = this.angleHistory[joint];
                if (history.length >= 2) {
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

        // Update movement speeds display
        const movementMetricsDiv = document.getElementById('movementMetrics');
        movementMetricsDiv.innerHTML = Object.entries(speeds || {})
            .map(([joint, speed]) => `
                <div class="metric-value">
                    <div class="metric-label">${this.formatJointName(joint)}</div>
                    <div class="metric-number">
                        <span class="speed-value">${speed ? speed.toFixed(1) : 'N/A'}</span>
                        <span class="unit">units/s</span>
                    </div>
                </div>
            `).join('');
    }

    updateFaceDOM(faceMetrics) {
        const faceMetricsDiv = document.getElementById('faceMetrics');
        faceMetricsDiv.innerHTML = Object.entries(faceMetrics)
            .map(([key, value]) => {
                let label = key;
                if (key === "eyeDistance") label = "Interocular Distance";
                else if (key === "noseX") label = "Nose X";
                else if (key === "noseY") label = "Nose Y";
                return `<div class="metric-value">
                            <div class="metric-label">${label}</div>
                            <div class="metric-number">${value ? value.toFixed(1) : 'N/A'}</div>
                        </div>`;
            }).join('');
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