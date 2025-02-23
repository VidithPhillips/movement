// Ensure global scope and handle resource management
(function(global) {
    class PoseVisualizer3D {
        constructor(container) {
            console.log('Creating PoseVisualizer3D instance');
            if (!window.THREE) {
                throw new ApplicationError('THREE.js must be loaded first', 'DEPENDENCY_MISSING', false);
            }
            this.container = container;
            this.qualityLevel = 'high';
            this.init();
            this.setupEventListeners();
        }

        init() {
            try {
                this.initializeRenderer();
                this.initializeScene();
                this.initializeCamera();
                this.initializeLights();
                this.initializeBodyParts();
                this.startAnimation();
                console.log('3D visualization initialized successfully');
            } catch (error) {
                throw new ApplicationError('Failed to initialize 3D visualizer', 'INITIALIZATION_FAILED', true);
            }
        }

        initializeRenderer() {
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(640, 480);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.container.appendChild(this.renderer.domElement);
        }

        initializeScene() {
            this.scene = new THREE.Scene();
            ResourceManager.resources.set('scene', this.scene);
        }

        initializeCamera() {
            this.camera = new THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
            this.camera.position.set(0, 1, 3);
            this.camera.lookAt(0, 0, 0);
        }

        initializeLights() {
            const ambientLight = new THREE.AmbientLight(0x404040, 2);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
            directionalLight.position.set(0, 1, 2);
            this.scene.add(ambientLight);
            this.scene.add(directionalLight);
        }

        initializeBodyParts() {
            // Create shared material with quality settings
            this.materials = {
                high: new THREE.MeshPhongMaterial({
                    color: 0x2194ce,
                    transparent: true,
                    opacity: 0.8,
                    shininess: 30
                }),
                medium: new THREE.MeshPhongMaterial({
                    color: 0x2194ce,
                    transparent: true,
                    opacity: 0.8,
                    shininess: 20,
                    flatShading: true
                }),
                low: new THREE.MeshPhongMaterial({
                    color: 0x2194ce,
                    transparent: true,
                    opacity: 0.8,
                    shininess: 10,
                    flatShading: true
                })
            };

            this.bodyParts = this.createBodyParts();
            Object.values(this.bodyParts).forEach(part => {
                if (Array.isArray(part)) {
                    part.forEach(p => this.scene.add(p));
                } else {
                    this.scene.add(part);
                }
            });
        }

        createBodyParts() {
            return {
                torso: this.createMesh(new THREE.BoxGeometry(0.3, 0.5, 0.2)),
                head: this.createMesh(new THREE.SphereGeometry(0.15, 32, 32)),
                leftArm: this.createMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16)),
                rightArm: this.createMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16)),
                leftLeg: this.createMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16)),
                rightLeg: this.createMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16))
            };
        }

        createMesh(geometry) {
            return new THREE.Mesh(geometry, this.materials[this.qualityLevel]);
        }

        setupEventListeners() {
            // Handle memory pressure events
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

            // Handle cleanup
            window.addEventListener('beforeunload', () => {
                this.dispose();
            });
        }

        reduceQuality() {
            if (this.qualityLevel === 'high') {
                this.qualityLevel = 'medium';
            } else if (this.qualityLevel === 'medium') {
                this.qualityLevel = 'low';
            }
            this.updateMaterials();
        }

        updateMaterials() {
            Object.values(this.bodyParts).forEach(part => {
                if (Array.isArray(part)) {
                    part.forEach(p => p.material = this.materials[this.qualityLevel]);
                } else {
                    part.material = this.materials[this.qualityLevel];
                }
            });
        }

        dispose() {
            // Stop animation
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }

            // Dispose Three.js resources
            this.renderer?.dispose();
            this.scene?.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });

            // Remove from ResourceManager
            ResourceManager.resources.delete('scene');
        }

        updatePose(pose) {
            if (!pose || !pose.poseLandmarks) return;

            const landmarks = pose.poseLandmarks;

            // Update torso position and rotation
            this.updateTorso(landmarks);
            
            // Update head position
            this.updateHead(landmarks);
            
            // Update limbs
            this.updateLimbs(landmarks);
        }

        updateTorso(landmarks) {
            const torso = this.bodyParts.torso;
            // Calculate torso position from shoulders and hips
            const centerX = (landmarks[11].x + landmarks[12].x) / 2;
            const centerY = -(landmarks[11].y + landmarks[12].y) / 2;
            const centerZ = (landmarks[11].z + landmarks[12].z) / 2;
            
            torso.position.set(centerX * 2 - 1, centerY * 2 + 1, centerZ);
        }

        updateHead(landmarks) {
            const head = this.bodyParts.head;
            head.position.set(
                landmarks[0].x * 2 - 1,
                -landmarks[0].y * 2 + 1,
                landmarks[0].z
            );
        }

        updateLimbs(landmarks) {
            // Update arms
            this.updateLimb(
                this.bodyParts.leftArm,
                landmarks[11], // left shoulder
                landmarks[13], // left elbow
                landmarks[15]  // left wrist
            );
            this.updateLimb(
                this.bodyParts.rightArm,
                landmarks[12], // right shoulder
                landmarks[14], // right elbow
                landmarks[16]  // right wrist
            );

            // Update legs
            this.updateLimb(
                this.bodyParts.leftLeg,
                landmarks[23], // left hip
                landmarks[25], // left knee
                landmarks[27]  // left ankle
            );
            this.updateLimb(
                this.bodyParts.rightLeg,
                landmarks[24], // right hip
                landmarks[26], // right knee
                landmarks[28]  // right ankle
            );
        }

        updateLimb(limbMesh, start, mid, end) {
            if (!start || !mid || !end) return;

            // Position at midpoint
            const x = (start.x + end.x) / 2;
            const y = -(start.y + end.y) / 2;
            const z = (start.z + end.z) / 2;

            limbMesh.position.set(x * 2 - 1, y * 2 + 1, z);

            // Calculate rotation
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            limbMesh.rotation.z = -angle;
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Attach to global scope
    global.PoseVisualizer3D = PoseVisualizer3D;
    console.log('PoseVisualizer3D attached to global scope');
})(typeof window !== 'undefined' ? window : global); 