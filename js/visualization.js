class PoseVisualizer {
    constructor(canvas) {
        this.initializeCanvas(canvas);
        this.setupStyles();
        this.setupOptimizations();
        this.setupEventListeners();
    }

    initializeCanvas(canvas) {
        this.ctx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false
        });

        this.canvas = canvas;
        this.canvas.width = 640;
        this.canvas.height = 480;

        // Create off-screen canvas for double buffering
        this.offscreenCanvas = new OffscreenCanvas(640, 480);
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    setupStyles() {
        this.styles = {
            keypoints: {
                radius: 4,
                colors: {
                    default: '#00ff00',
                    highlighted: '#ff0000',
                    inactive: '#666666'
                }
            },
            connections: {
                width: 2,
                colors: {
                    default: '#ffffff',
                    highlighted: '#00ff00',
                    inactive: '#444444'
                }
            },
            text: {
                font: '14px Inter',
                color: '#ffffff',
                background: 'rgba(0,0,0,0.5)',
                padding: 4
            }
        };

        // Pre-calculate connection paths for performance
        this.connectionPaths = POSE_CONNECTIONS.map(([start, end]) => ({
            start,
            end,
            path: new Path2D()
        }));
    }

    setupOptimizations() {
        // Performance optimization flags
        this.quality = 'high';
        this.lastRenderTime = 0;
        this.frameInterval = 1000 / 30; // Target 30 FPS
        this.renderQueued = false;

        // Create render buffer
        this.renderBuffer = {
            keypoints: new Map(),
            connections: new Map(),
            angles: new Map()
        };
    }

    setupEventListeners() {
        // Handle quality adjustments based on performance
        window.addEventListener('memory-pressure', () => {
            this.reduceQuality();
        });

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }

    drawPose(pose, angles = null) {
        if (!pose || !pose.keypoints) return;

        const now = performance.now();
        if (now - this.lastRenderTime < this.frameInterval) {
            // Queue render if we're trying to render too frequently
            if (!this.renderQueued) {
                this.renderQueued = true;
                setTimeout(() => {
                    this.renderQueued = false;
                    this.drawPose(pose, angles);
                }, this.frameInterval);
            }
            return;
        }
        this.lastRenderTime = now;

        // Clear and prepare for drawing
        this.clear();
        this.updateRenderBuffer(pose, angles);
        
        // Draw to offscreen canvas first
        this.drawToOffscreen();
        
        // Copy to main canvas
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }

    updateRenderBuffer(pose, angles) {
        // Update keypoints
        pose.keypoints.forEach((keypoint, index) => {
            if (keypoint.score > 0.3) {
                this.renderBuffer.keypoints.set(index, {
                    x: keypoint.x * this.canvas.width,
                    y: keypoint.y * this.canvas.height,
                    score: keypoint.score
                });
            } else {
                this.renderBuffer.keypoints.delete(index);
            }
        });

        // Update connections
        this.connectionPaths.forEach(connection => {
            const start = this.renderBuffer.keypoints.get(connection.start);
            const end = this.renderBuffer.keypoints.get(connection.end);
            if (start && end) {
                connection.path = new Path2D();
                connection.path.moveTo(start.x, start.y);
                connection.path.lineTo(end.x, end.y);
            }
        });

        // Update angles if provided
        if (angles) {
            Object.entries(angles).forEach(([joint, angle]) => {
                if (angle !== null) {
                    this.renderBuffer.angles.set(joint, angle);
                }
            });
        }
    }

    drawToOffscreen() {
        const ctx = this.offscreenCtx;
        
        // Draw connections first
        ctx.lineWidth = this.styles.connections.width;
        this.connectionPaths.forEach(connection => {
            if (connection.path) {
                ctx.strokeStyle = this.styles.connections.colors.default;
                ctx.stroke(connection.path);
            }
        });

        // Draw keypoints
        this.renderBuffer.keypoints.forEach((point, index) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.styles.keypoints.radius, 0, 2 * Math.PI);
            ctx.fillStyle = point.score > 0.5 ? 
                this.styles.keypoints.colors.default : 
                this.styles.keypoints.colors.inactive;
            ctx.fill();
        });

        // Draw angles
        if (this.quality !== 'low') {
            this.renderBuffer.angles.forEach((angle, joint) => {
                this.drawAngle(ctx, joint, angle);
            });
        }
    }

    drawAngle(ctx, joint, angle) {
        const keypoint = this.renderBuffer.keypoints.get(this.getJointKeypoint(joint));
        if (!keypoint) return;

        ctx.save();
        ctx.font = this.styles.text.font;
        ctx.fillStyle = this.styles.text.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = `${Math.round(angle)}°`;
        const metrics = ctx.measureText(text);
        const padding = this.styles.text.padding;

        // Draw background
        ctx.fillStyle = this.styles.text.background;
        ctx.fillRect(
            keypoint.x - metrics.width/2 - padding,
            keypoint.y - metrics.actualBoundingBoxAscent/2 - padding,
            metrics.width + padding*2,
            metrics.actualBoundingBoxAscent + padding*2
        );

        // Draw text
        ctx.fillStyle = this.styles.text.color;
        ctx.fillText(text, keypoint.x, keypoint.y);
        ctx.restore();
    }

    getJointKeypoint(joint) {
        const jointMap = {
            'rightElbow': 14,
            'leftElbow': 13,
            'rightKnee': 26,
            'leftKnee': 25
        };
        return jointMap[joint];
    }

    reduceQuality() {
        if (this.quality === 'high') {
            this.quality = 'medium';
            this.frameInterval = 1000 / 24; // Reduce to 24 FPS
        } else if (this.quality === 'medium') {
            this.quality = 'low';
            this.frameInterval = 1000 / 15; // Reduce to 15 FPS
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    }

    pause() {
        this.renderQueued = false;
    }

    resume() {
        this.lastRenderTime = 0;
    }
} 