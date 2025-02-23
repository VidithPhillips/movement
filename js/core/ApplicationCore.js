// Core infrastructure for the application
class DependencyManager {
    static requiredDependencies = {
        'THREE.js': {
            global: 'THREE',
            version: 'r128',
            check: (obj) => obj && obj.WebGLRenderer && obj.Scene
        },
        'MediaPipe': {
            global: 'Pose',
            version: '0.5.1675469404',
            check: (obj) => obj && obj.prototype && obj.prototype.setOptions
        }
    };

    static async verifyDependencies() {
        const missing = [];
        for (const [name, dep] of Object.entries(this.requiredDependencies)) {
            const global = window[dep.global];
            if (!global || !dep.check(global)) {
                missing.push(name);
            }
        }
        if (missing.length > 0) {
            throw new ApplicationError(
                `Missing dependencies: ${missing.join(', ')}`,
                'DEPENDENCY_MISSING',
                false
            );
        }
    }
}

class ResourceManager {
    static resources = new Map();
    static lowMemoryThreshold = 0.8;

    static async initialize() {
        if ('memory' in performance) {
            setInterval(() => this.checkMemoryUsage(), 5000);
        }
    }

    static async checkMemoryUsage() {
        const memoryInfo = performance.memory;
        if (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit > this.lowMemoryThreshold) {
            await this.reduceMemoryUsage();
        }
    }

    static async reduceMemoryUsage() {
        // Notify components to reduce quality
        window.dispatchEvent(new CustomEvent('memory-pressure'));
    }
}

class ApplicationError extends Error {
    constructor(message, code, recoverable = false) {
        super(message);
        this.code = code;
        this.recoverable = recoverable;
        this.timestamp = new Date();
    }
}

class ErrorHandler {
    static errorMessages = {
        'CAMERA_ACCESS_DENIED': 'Please enable camera access to use this application',
        'DEPENDENCY_MISSING': 'Failed to load required components. Please refresh the page',
        'INITIALIZATION_FAILED': 'Failed to start the application. Please try again'
    };

    static async handleError(error, context) {
        console.error(`Error in ${context}:`, error);

        const message = this.getUserFriendlyMessage(error);
        this.updateUI(message);

        if (error.recoverable) {
            await this.attemptRecovery(error);
        }
    }

    static getUserFriendlyMessage(error) {
        return this.errorMessages[error.code] || 'An unexpected error occurred';
    }

    static updateUI(message) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="loading-error">
                    ${message}
                </div>`;
        }
    }
}

// Add script loading utility
class ScriptLoader {
    static async loadScript(src, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
                return;
            } catch (error) {
                if (i === retries - 1) {
                    throw new ApplicationError(
                        `Failed to load script: ${src}`,
                        'SCRIPT_LOAD_FAILED',
                        true
                    );
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
}

// Make loadScript globally available
window.loadScript = ScriptLoader.loadScript; 