class MovementAnalyzer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.setupMetrics();
        this.setupEventListeners();
    }

    setupMetrics() {
        this.metrics = {
            jointAngles: {},
            symmetry: 0,
            stability: 0
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
                <div id="angles"></div>
            </div>
            <div class="metric-box">
                <h3>Movement Quality</h3>
                <div id="quality"></div>
            </div>
        `;
    }

    updateMetrics(landmarks) {
        // Calculate joint angles
        this.metrics.jointAngles = {
            leftElbow: this.calculateAngle(
                landmarks[11], // left shoulder
                landmarks[13], // left elbow
                landmarks[15]  // left wrist
            ),
            rightElbow: this.calculateAngle(
                landmarks[12], // right shoulder
                landmarks[14], // right elbow
                landmarks[16]  // right wrist
            ),
            leftKnee: this.calculateAngle(
                landmarks[23], // left hip
                landmarks[25], // left knee
                landmarks[27]  // left ankle
            ),
            rightKnee: this.calculateAngle(
                landmarks[24], // right hip
                landmarks[26], // right knee
                landmarks[28]  // right ankle
            )
        };

        // Calculate symmetry
        this.metrics.symmetry = this.calculateSymmetry(landmarks);
        
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

    calculateSymmetry(landmarks) {
        // Compare left and right side angles
        const elbowDiff = Math.abs(
            this.metrics.jointAngles.leftElbow - 
            this.metrics.jointAngles.rightElbow
        );
        const kneeDiff = Math.abs(
            this.metrics.jointAngles.leftKnee - 
            this.metrics.jointAngles.rightKnee
        );
        return Math.round(100 - (elbowDiff + kneeDiff) / 2);
    }

    updateDisplay() {
        // Update angles display
        const anglesDiv = this.container.querySelector('#angles');
        anglesDiv.innerHTML = Object.entries(this.metrics.jointAngles)
            .map(([joint, angle]) => `
                <div class="metric-value">
                    <span class="label">${this.formatJointName(joint)}:</span>
                    <span class="value">${angle}°</span>
                </div>
            `).join('');

        // Update quality metrics
        const qualityDiv = this.container.querySelector('#quality');
        qualityDiv.innerHTML = `
            <div class="metric-value">
                <span class="label">Symmetry:</span>
                <span class="value">${this.metrics.symmetry}%</span>
            </div>
        `;
    }

    formatJointName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }
} 