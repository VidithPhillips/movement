class ExerciseDetector {
    constructor() {
        this.initializeExercises();
        this.setupDetectionSystem();
        this.setupEventEmitter();
    }

    initializeExercises() {
        this.exercises = {
            squat: {
                name: 'Squat',
                phases: ['preparation', 'descent', 'hold', 'ascent'],
                keyPoints: ['hips', 'knees', 'ankles'],
                angleThresholds: {
                    knees: { min: 60, max: 100 },
                    hips: { min: 50, max: 100 }
                },
                formChecks: [
                    this.checkKneeAlignment,
                    this.checkHipHinge,
                    this.checkBackAngle
                ]
            },
            pushup: {
                name: 'Push-up',
                phases: ['up', 'descent', 'hold', 'ascent'],
                keyPoints: ['shoulders', 'elbows', 'wrists'],
                angleThresholds: {
                    elbows: { min: 80, max: 110 },
                    shoulders: { min: 0, max: 40 }
                },
                formChecks: [
                    this.checkElbowAlignment,
                    this.checkBackAlignment,
                    this.checkNeckPosition
                ]
            }
        };

        this.currentExercise = null;
        this.currentPhase = null;
        this.repCount = 0;
        this.formScores = new Map();
    }

    setupDetectionSystem() {
        this.detectionBuffer = {
            poses: [],
            angles: [],
            timestamps: []
        };

        this.detectionConfig = {
            bufferSize: 30,  // 1 second at 30fps
            confidenceThreshold: 0.7,
            smoothingFactor: 0.3
        };

        this.metrics = {
            repDuration: 0,
            formScore: 100,
            rangeOfMotion: 0,
            stability: 0
        };
    }

    setupEventEmitter() {
        this.events = new Map();
        ['exercise-detected', 'rep-completed', 'form-warning'].forEach(event => {
            this.events.set(event, new Set());
        });
    }

    on(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).add(callback);
        }
    }

    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data));
        }
    }

    detectExercise(pose) {
        if (!pose || !pose.keypoints) return;

        this.updateDetectionBuffer(pose);
        
        if (this.currentExercise) {
            this.trackExercise(pose);
        } else {
            this.identifyExercise(pose);
        }
    }

    updateDetectionBuffer(pose) {
        const timestamp = performance.now();
        
        this.detectionBuffer.poses.push(pose);
        this.detectionBuffer.timestamps.push(timestamp);

        if (this.detectionBuffer.poses.length > this.detectionConfig.bufferSize) {
            this.detectionBuffer.poses.shift();
            this.detectionBuffer.timestamps.shift();
        }
    }

    identifyExercise(pose) {
        const angles = this.calculateJointAngles(pose);
        const posture = this.analyzePosture(pose);

        // Check for exercise start positions
        for (const [name, exercise] of Object.entries(this.exercises)) {
            if (this.matchesStartPosition(angles, posture, exercise)) {
                this.startExercise(name);
                break;
            }
        }
    }

    matchesStartPosition(angles, posture, exercise) {
        const confidence = this.calculateConfidence(angles, exercise.keyPoints);
        if (confidence < this.detectionConfig.confidenceThreshold) return false;

        // Check angle thresholds
        for (const [joint, threshold] of Object.entries(exercise.angleThresholds)) {
            if (angles[joint] < threshold.min || angles[joint] > threshold.max) {
                return false;
            }
        }

        return true;
    }

    trackExercise(pose) {
        const angles = this.calculateJointAngles(pose);
        const phase = this.determinePhase(angles);
        
        if (phase !== this.currentPhase) {
            this.handlePhaseChange(phase, angles);
        }

        // Run form checks
        const formIssues = this.checkForm(pose, angles);
        if (formIssues.length > 0) {
            this.emit('form-warning', formIssues);
        }

        // Update metrics
        this.updateMetrics(angles, phase);
    }

    determinePhase(angles) {
        const exercise = this.exercises[this.currentExercise];
        const primaryJoint = exercise.keyPoints[0];
        const angle = angles[primaryJoint];

        // Use state machine to determine phase
        switch (this.currentPhase) {
            case 'preparation':
                return angle < exercise.angleThresholds[primaryJoint].min ? 'descent' : 'preparation';
            case 'descent':
                return angle < exercise.angleThresholds[primaryJoint].max ? 'hold' : 'descent';
            case 'hold':
                return angle > exercise.angleThresholds[primaryJoint].min ? 'ascent' : 'hold';
            case 'ascent':
                return angle > exercise.angleThresholds[primaryJoint].max ? 'preparation' : 'ascent';
            default:
                return 'preparation';
        }
    }

    checkForm(pose, angles) {
        const issues = [];
        const exercise = this.exercises[this.currentExercise];

        exercise.formChecks.forEach(check => {
            const result = check.call(this, pose, angles);
            if (!result.passed) {
                issues.push(result.message);
            }
        });

        return issues;
    }

    // Form check implementations
    checkKneeAlignment(pose, angles) {
        // Check if knees are tracking over toes
        return {
            passed: true,
            message: 'Keep knees aligned with toes'
        };
    }

    checkHipHinge(pose, angles) {
        // Check proper hip hinge movement
        return {
            passed: true,
            message: 'Initiate movement from hips'
        };
    }

    // ... other form check methods ...

    updateMetrics(angles, phase) {
        // Update exercise metrics
        this.metrics.rangeOfMotion = this.calculateRangeOfMotion(angles);
        this.metrics.stability = this.calculateStability();
        this.metrics.formScore = this.calculateFormScore();
    }

    reset() {
        this.currentExercise = null;
        this.currentPhase = null;
        this.repCount = 0;
        this.detectionBuffer.poses = [];
        this.detectionBuffer.timestamps = [];
        this.formScores.clear();
    }
} 