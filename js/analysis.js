class MovementAnalyzer {
    constructor() {
        this.angleChart = null;
        this.angleHistory = {
            rightElbow: [],
            leftElbow: [],
            rightKnee: [],
            leftKnee: []
        };
        this.baselineAngles = null;
        this.maxHistoryLength = 30;
        this.initializeChart();
    }

    initializeChart() {
        const ctx = document.getElementById('angleChart').getContext('2d');
        this.angleChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(this.maxHistoryLength).fill(''),
                datasets: [
                    {
                        label: 'Right Elbow',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.4
                    },
                    {
                        label: 'Left Elbow',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 180,
                        title: {
                            display: true,
                            text: 'Angle (degrees)'
                        }
                    }
                },
                animation: {
                    duration: 0
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    setBaseline(angles) {
        this.baselineAngles = angles;
    }

    updateMetrics(pose, detector) {
        if (!pose) return;

        // Calculate joint angles
        const angles = detector.calculateJointAngles(pose);
        
        // Update angle history
        Object.keys(angles).forEach(joint => {
            if (angles[joint]) {
                this.angleHistory[joint].push(angles[joint]);
                if (this.angleHistory[joint].length > this.maxHistoryLength) {
                    this.angleHistory[joint].shift();
                }
            }
        });

        // Update chart
        this.angleChart.data.datasets[0].data = [...this.angleHistory.rightElbow];
        this.angleChart.data.datasets[1].data = [...this.angleHistory.leftElbow];
        this.angleChart.update();

        // Calculate movement speeds
        const speeds = detector.calculateMovementSpeed(pose);

        // Update DOM with metrics
        this.updateDOM(angles, speeds);
    }

    updateDOM(angles, speeds) {
        // Update joint angles display with baseline comparison if available
        const jointAnglesDiv = document.getElementById('jointAngles');
        jointAnglesDiv.innerHTML = Object.entries(angles)
            .map(([joint, angle]) => {
                let baselineInfo = "";
                if (this.baselineAngles && this.baselineAngles[joint] != null) {
                    baselineInfo = `<br>Baseline: ${this.baselineAngles[joint].toFixed(1)}°, Diff: ${(angle - this.baselineAngles[joint]).toFixed(1)}°`;
                }
                return `<div class="metric-value">
                            <div class="metric-label">${this.formatJointName(joint)}</div>
                            <div class="metric-number">Current: ${angle ? angle.toFixed(1) : 'N/A'}° ${baselineInfo}</div>
                        </div>`;
            }).join('');

        // Update movement speeds display
        const movementMetricsDiv = document.getElementById('movementMetrics');
        movementMetricsDiv.innerHTML = Object.entries(speeds || {})
            .map(([joint, speed]) => `
                <div class="metric-value">
                    <div class="metric-label">${this.formatJointName(joint)} Speed</div>
                    <div class="metric-number">${speed ? speed.toFixed(1) : 'N/A'}</div>
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
        this.angleChart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        this.angleChart.update();
    }
} 