class FeedbackSystem {
    constructor() {
        this.initializeComponents();
        this.setupEventListeners();
        this.setupVoiceFeedback();
    }

    initializeComponents() {
        // Create feedback overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'feedback-overlay';
        document.querySelector('.video-container').appendChild(this.overlay);

        // Initialize feedback states
        this.feedbackState = {
            currentExercise: null,
            activeWarnings: new Set(),
            lastFeedbackTime: 0,
            feedbackQueue: [],
            suppressedWarnings: new Set()
        };

        // Configure feedback settings
        this.config = {
            minTimeBetweenFeedback: 2000,  // 2 seconds
            warningThreshold: 3,           // Show warning after 3 occurrences
            feedbackDuration: 3000,        // Show feedback for 3 seconds
            voiceFeedbackEnabled: true
        };

        // Initialize metrics display
        this.metricsDisplay = this.createMetricsDisplay();
    }

    createMetricsDisplay() {
        const display = document.createElement('div');
        display.className = 'metrics-display';
        display.innerHTML = `
            <div class="metric" id="exercise-name"></div>
            <div class="metric" id="rep-count">Reps: 0</div>
            <div class="metric" id="form-score">Form: 100%</div>
            <div class="metric" id="range-of-motion">ROM: --</div>
        `;
        this.overlay.appendChild(display);
        return display;
    }

    setupEventListeners() {
        // Listen for exercise detector events
        if (window.exerciseDetector) {
            window.exerciseDetector.on('exercise-detected', (exercise) => {
                this.handleExerciseDetected(exercise);
            });

            window.exerciseDetector.on('rep-completed', (data) => {
                this.handleRepCompleted(data);
            });

            window.exerciseDetector.on('form-warning', (warnings) => {
                this.handleFormWarnings(warnings);
            });
        }

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseFeedback();
            } else {
                this.resumeFeedback();
            }
        });
    }

    setupVoiceFeedback() {
        this.speechSynthesis = window.speechSynthesis;
        this.voiceQueue = [];
        
        // Configure voice settings
        this.voice = {
            enabled: true,
            rate: 1.0,
            pitch: 1.0,
            volume: 0.8
        };
    }

    handleExerciseDetected(exercise) {
        this.feedbackState.currentExercise = exercise;
        this.showFeedback({
            type: 'success',
            message: `Starting ${exercise.name}`,
            duration: 2000
        });

        // Update metrics display
        this.updateMetricsDisplay({
            exercise: exercise.name,
            reps: 0,
            formScore: 100,
            rom: '--'
        });
    }

    handleRepCompleted(data) {
        const { repCount, formScore, rangeOfMotion } = data;
        
        // Update metrics
        this.updateMetricsDisplay({
            reps: repCount,
            formScore: Math.round(formScore),
            rom: Math.round(rangeOfMotion)
        });

        // Provide form feedback
        if (formScore < 80) {
            this.showFeedback({
                type: 'warning',
                message: 'Focus on form quality',
                duration: 2000
            });
        }
    }

    handleFormWarnings(warnings) {
        warnings.forEach(warning => {
            if (!this.feedbackState.suppressedWarnings.has(warning.type)) {
                this.queueFeedback({
                    type: 'warning',
                    message: warning.message,
                    priority: warning.severity
                });
            }
        });
    }

    updateMetricsDisplay(metrics) {
        if (metrics.exercise) {
            this.metricsDisplay.querySelector('#exercise-name').textContent = metrics.exercise;
        }
        if (metrics.reps !== undefined) {
            this.metricsDisplay.querySelector('#rep-count').textContent = `Reps: ${metrics.reps}`;
        }
        if (metrics.formScore !== undefined) {
            this.metricsDisplay.querySelector('#form-score').textContent = `Form: ${metrics.formScore}%`;
        }
        if (metrics.rom !== undefined) {
            this.metricsDisplay.querySelector('#range-of-motion').textContent = `ROM: ${metrics.rom}°`;
        }
    }

    queueFeedback(feedback) {
        this.feedbackQueue.push({
            ...feedback,
            timestamp: performance.now()
        });

        this.processFeedbackQueue();
    }

    processFeedbackQueue() {
        if (this.feedbackQueue.length === 0) return;

        const now = performance.now();
        if (now - this.feedbackState.lastFeedbackTime < this.config.minTimeBetweenFeedback) {
            setTimeout(() => this.processFeedbackQueue(), 
                this.config.minTimeBetweenFeedback - (now - this.feedbackState.lastFeedbackTime)
            );
            return;
        }

        // Sort by priority
        this.feedbackQueue.sort((a, b) => b.priority - a.priority);

        const feedback = this.feedbackQueue.shift();
        this.showFeedback(feedback);
    }

    showFeedback(feedback) {
        // Create feedback element
        const feedbackElement = document.createElement('div');
        feedbackElement.className = `feedback-message ${feedback.type}`;
        feedbackElement.textContent = feedback.message;

        // Add to overlay
        this.overlay.appendChild(feedbackElement);

        // Provide voice feedback if enabled
        if (this.voice.enabled && feedback.type === 'warning') {
            this.speakFeedback(feedback.message);
        }

        // Remove after duration
        setTimeout(() => {
            feedbackElement.classList.add('fade-out');
            setTimeout(() => {
                this.overlay.removeChild(feedbackElement);
            }, 300);
        }, feedback.duration || this.config.feedbackDuration);

        this.feedbackState.lastFeedbackTime = performance.now();
    }

    speakFeedback(message) {
        if (!this.speechSynthesis || !this.voice.enabled) return;

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = this.voice.rate;
        utterance.pitch = this.voice.pitch;
        utterance.volume = this.voice.volume;
        
        this.speechSynthesis.speak(utterance);
    }

    pauseFeedback() {
        if (this.speechSynthesis) {
            this.speechSynthesis.pause();
        }
    }

    resumeFeedback() {
        if (this.speechSynthesis) {
            this.speechSynthesis.resume();
        }
    }

    dispose() {
        // Clear all timeouts
        this.feedbackQueue.forEach(feedback => {
            if (feedback.timeoutId) {
                clearTimeout(feedback.timeoutId);
            }
        });

        // Stop speech
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }

        // Remove event listeners
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        
        // Clean up DOM
        this.overlay?.remove();
    }
} 