class MovementAnalyzer {
    constructor() {
        this.angleChart = null;
        this.initializeChart();
    }

    initializeChart() {
        const ctx = document.getElementById('angleChart').getContext('2d');
        this.angleChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Right Elbow Angle',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 180
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
    }

    updateMetrics(pose, detector) {
        if (!pose) return;

        // Calculate right elbow angle
        const shoulder = detector.getKeypoint(pose, 'right_shoulder');
        const elbow = detector.getKeypoint(pose, 'right_elbow');
        const wrist = detector.getKeypoint(pose, 'right_wrist');
        
        const angle = detector.calculateAngle(shoulder, elbow, wrist);
        
        // Update chart
        if (angle) {
            this.angleChart.data.labels.push('');
            this.angleChart.data.datasets[0].data.push(angle);
            
            // Keep last 30 frames
            if (this.angleChart.data.labels.length > 30) {
                this.angleChart.data.labels.shift();
                this.angleChart.data.datasets[0].data.shift();
            }
            
            this.angleChart.update();
        }

        // Update metrics display
        document.getElementById('jointAngles').textContent = 
            `Right Elbow: ${angle ? angle.toFixed(1) : 'N/A'}°`;
    }
} 