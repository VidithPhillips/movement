class FeedbackSystem {
    constructor() {
        this.feedbackElement = document.createElement('div');
        this.feedbackElement.className = 'feedback-overlay';
        document.querySelector('.video-container').appendChild(this.feedbackElement);
    }

    provideFeedback(metrics, form) {
        const feedback = [];
        
        // Check posture
        if (metrics.spineAngle > 20) {
            feedback.push({
                type: 'warning',
                message: 'Straighten your back'
            });
        }

        // Check symmetry
        if (Math.abs(metrics.shoulderLevel) > 10) {
            feedback.push({
                type: 'warning',
                message: 'Level your shoulders'
            });
        }

        this.displayFeedback(feedback);
    }
} 