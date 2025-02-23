// Make PoseVisualizer3D globally available
window.PoseVisualizer3D = class PoseVisualizer3D {
    constructor(container) {
        if (!window.THREE) {
            throw new Error('THREE.js must be loaded first');
        }
        this.container = container;
        this.init();
    }

    init() {
        // Create scene, camera, renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(640, 480);
        this.container.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(0, 1, 2);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        // Initialize body parts
        this.initializeBodyParts();

        // Set camera position
        this.camera.position.set(0, 1, 3);
        this.camera.lookAt(0, 0, 0);

        // Start animation loop
        this.animate();
    }

    initializeBodyParts() {
        // Create a single shared material
        this.sharedMaterial = new THREE.MeshPhongMaterial({
            color: 0x2194ce,
            transparent: true,
            opacity: 0.8,
            shininess: 30
        });

        // Create body parts using shared material
        this.bodyParts = {
            torso: this.createMesh(new THREE.BoxGeometry(0.3, 0.5, 0.2)),
            head: this.createMesh(new THREE.SphereGeometry(0.15)),
            leftArm: this.createMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3)),
            rightArm: this.createMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3)),
            leftLeg: this.createMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4)),
            rightLeg: this.createMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4))
        };

        // Add all parts to scene
        Object.values(this.bodyParts).forEach(part => {
            this.scene.add(part);
        });
    }

    // Helper method to create mesh with shared material
    createMesh(geometry) {
        return new THREE.Mesh(geometry, this.sharedMaterial);
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