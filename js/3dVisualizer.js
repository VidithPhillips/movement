class PoseVisualizer3D {
    constructor(container) {
        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            throw new Error('Three.js is not loaded');
        }
        if (typeof THREE.OrbitControls === 'undefined') {
            console.warn('OrbitControls not loaded, skipping controls');
        }
        this.container = container;
        this.init();
    }

    init() {
        try {
            // Set up Three.js scene
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true, 
                alpha: true,
                canvas: document.createElement('canvas')
            });
            
            // Set renderer size and add to container
            this.renderer.setSize(640, 480);
            this.container.appendChild(this.renderer.domElement);

            // Add lights with more intensity
            const ambientLight = new THREE.AmbientLight(0x404040, 2);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
            directionalLight.position.set(0, 1, 2);
            this.scene.add(ambientLight);
            this.scene.add(directionalLight);

            // Initialize body parts
            this.initializeBodyParts();

            // Update camera position for better viewing angle
            this.camera.position.set(0, 1, 3);
            this.camera.lookAt(0, 0, 0);

            // Add orbit controls if available
            if (typeof THREE.OrbitControls !== 'undefined') {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
            }

            // Make renderer background transparent
            this.renderer.setClearColor(0x000000, 0);

            // Start animation
            this.animate();
            
            console.log('3D visualization initialized successfully');
        } catch (error) {
            console.error('Failed to initialize 3D visualization:', error);
        }
    }

    initializeBodyParts() {
        // Create geometries for body parts with better materials
        const humanMaterial = new THREE.MeshPhongMaterial({
            color: 0x2194ce,
            transparent: true,
            opacity: 0.8,
            shininess: 30,
            specular: 0x666666
        });

        this.bodyParts = {
            torso: this.createBodyPart(0.3, 0.5, 0.2, false, humanMaterial),
            head: this.createBodyPart(0.15, 0.15, 0.15, true, humanMaterial),
            leftArm: this.createLimb(0.1, 0.3, humanMaterial),
            rightArm: this.createLimb(0.1, 0.3, humanMaterial),
            leftLeg: this.createLimb(0.12, 0.4, humanMaterial),
            rightLeg: this.createLimb(0.12, 0.4, humanMaterial),
            // Add joints as spheres
            joints: this.createJoints(humanMaterial)
        };

        // Add shadow casting
        Object.values(this.bodyParts).forEach(part => {
            if (Array.isArray(part)) {
                part.forEach(joint => {
                    joint.castShadow = true;
                    this.scene.add(joint);
                });
            } else {
                part.castShadow = true;
                this.scene.add(part);
            }
        });
    }

    createBodyPart(width, height, depth, isSphere = false, material) {
        // Only declare geometry since material is passed as parameter
        let geometry;
        
        if (isSphere) {
            geometry = new THREE.SphereGeometry(width);
        } else {
            geometry = new THREE.BoxGeometry(width, height, depth);
        }
        
        return new THREE.Mesh(geometry, material);
    }

    createLimb(width, height, material) {
        const geometry = new THREE.CylinderGeometry(width/2, width/2, height);
        return new THREE.Mesh(geometry, material);
    }

    createJoints(material) {
        const joints = [];
        const jointRadius = 0.05;
        for (let i = 0; i < 33; i++) { // MediaPipe has 33 landmarks
            const joint = new THREE.Mesh(
                new THREE.SphereGeometry(jointRadius),
                material.clone()
            );
            joints.push(joint);
        }
        return joints;
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