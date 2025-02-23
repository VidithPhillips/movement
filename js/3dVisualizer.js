class PoseVisualizer3D {
    constructor(container) {
        this.container = container;
        this.init();
    }

    init() {
        // Set up Three.js scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        // Set renderer size and add to container
        this.renderer.setSize(640, 480);
        this.container.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        // Initialize body parts
        this.initializeBodyParts();

        // Position camera
        this.camera.position.z = 2;

        // Start animation
        this.animate();
    }

    initializeBodyParts() {
        // Create geometries for body parts
        this.bodyParts = {
            torso: this.createBodyPart(0.3, 0.5, 0.2),
            head: this.createBodyPart(0.15, 0.15, 0.15, true),
            leftArm: this.createLimb(0.1, 0.3),
            rightArm: this.createLimb(0.1, 0.3),
            leftLeg: this.createLimb(0.12, 0.4),
            rightLeg: this.createLimb(0.12, 0.4)
        };

        // Add all parts to scene
        Object.values(this.bodyParts).forEach(part => {
            this.scene.add(part);
        });
    }

    createBodyPart(width, height, depth, isSphere = false) {
        let geometry, material;
        
        if (isSphere) {
            geometry = new THREE.SphereGeometry(width);
        } else {
            geometry = new THREE.BoxGeometry(width, height, depth);
        }
        
        material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });

        return new THREE.Mesh(geometry, material);
    }

    createLimb(width, height) {
        const geometry = new THREE.CylinderGeometry(width/2, width/2, height);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        return new THREE.Mesh(geometry, material);
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
        // Update arms and legs positions and rotations
        // ... (implementation details)
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
} 