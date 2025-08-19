import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface ShuttleNode {
  id: number;
  position: THREE.Vector3;
  mesh?: THREE.Object3D;
  targetPosition: THREE.Vector3;
  isDragging: boolean;
}

interface Connection {
  from: number;
  to: number;
  line?: THREE.Line;
}

export const ShuttleNetwork3D = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const shuttleNodesRef = useRef<ShuttleNode[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const isDraggingRef = useRef(false);
  const selectedNodeRef = useRef<ShuttleNode | null>(null);
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    // Subtle reddish fog to blend with page background glow
    scene.fog = new THREE.Fog(new THREE.Color(0xfff1ec), 28, 80);

    // Add the map background image on the left side
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/lovable-uploads/746ec594-24f0-4b40-910e-201e3c103ecd.png', (texture) => {
      const aspectRatio = texture.image.width / texture.image.height;
      const planeGeometry = new THREE.PlaneGeometry(12, 12 / aspectRatio);
      const planeMaterial = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true, 
        opacity: 0.15,
        side: THREE.DoubleSide
      });
      const mapPlane = new THREE.Mesh(planeGeometry, planeMaterial);
      mapPlane.position.set(-8, 0, -8);
      mapPlane.rotation.x = 0;
      scene.add(mapPlane);
    });
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
  // Disable shadow map for better performance in complex models/devices
  renderer.shadowMap.enabled = false;
    
  mountEl.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Camera positioning
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
  // Turn off shadow casting on the main light to reduce GPU cost
  directionalLight.castShadow = false;
    scene.add(directionalLight);

    // Brand-tinted fill light
    const fillLight = new THREE.PointLight(0xff6b35, 0.4, 40);
    fillLight.position.set(-8, -6, 6);
    scene.add(fillLight);

    // Deterministic pseudo-random generator (LCG) to avoid approximations
    let seed = 123456789 >>> 0;
    const rand = () => {
      seed = (1664525 * seed + 1013904223) >>> 0; // LCG
      return seed / 0x100000000; // [0,1)
    };

    // Create ultra-realistic detailed car geometry
    const createDetailedShuttle = () => {
      const shuttleGroup = new THREE.Group();

      // Main body frame with realistic car curvature using LatheGeometry
      const bodyProfile = new THREE.Shape();
      bodyProfile.moveTo(0, 0);
      bodyProfile.quadraticCurveTo(0.1, 0.05, 0.3, 0.1);
      bodyProfile.quadraticCurveTo(0.6, 0.15, 0.9, 0.2);
      bodyProfile.quadraticCurveTo(1.0, 0.35, 0.95, 0.55);
      bodyProfile.quadraticCurveTo(0.85, 0.7, 0.7, 0.75);
      bodyProfile.quadraticCurveTo(0.4, 0.8, 0.1, 0.75);
      bodyProfile.lineTo(0, 0.7);
      bodyProfile.lineTo(0, 0);

      const bodyGeometry = new THREE.ExtrudeGeometry(bodyProfile, {
        depth: 1.8,
        bevelEnabled: true,
        bevelSegments: 20,
        steps: 8,
        bevelSize: 0.08,
        bevelThickness: 0.05,
        curveSegments: 32
      });
      
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xd32f20,
        metalness: 0.9,
        roughness: 0.12,
        envMapIntensity: 1.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });
      
      const mainBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
      mainBody.position.set(0, 0.1, -0.9);
      shuttleGroup.add(mainBody);

      // Separate engine compartment with detailed hood lines
      const hoodShape = new THREE.Shape();
      hoodShape.moveTo(-0.6, 0);
      hoodShape.quadraticCurveTo(-0.3, 0.15, 0, 0.2);
      hoodShape.quadraticCurveTo(0.3, 0.15, 0.6, 0);
      hoodShape.quadraticCurveTo(0.65, 0.1, 0.6, 0.25);
      hoodShape.quadraticCurveTo(0.3, 0.3, 0, 0.3);
      hoodShape.quadraticCurveTo(-0.3, 0.3, -0.6, 0.25);
      hoodShape.quadraticCurveTo(-0.65, 0.1, -0.6, 0);

      const hoodGeometry = new THREE.ExtrudeGeometry(hoodShape, {
        depth: 0.4,
        bevelEnabled: true,
        bevelSegments: 12,
        bevelSize: 0.03,
        bevelThickness: 0.02,
        curveSegments: 24
      });
      
      const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
      hood.position.set(0.8, 0.75, -0.7);
      shuttleGroup.add(hood);

      // Realistic roof with sunroof detail
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-0.7, -0.3);
      roofShape.quadraticCurveTo(-0.35, 0.1, 0, 0.15);
      roofShape.quadraticCurveTo(0.35, 0.1, 0.7, -0.3);
      roofShape.quadraticCurveTo(0.75, -0.25, 0.7, -0.2);
      roofShape.quadraticCurveTo(0.35, 0.05, 0, 0.1);
      roofShape.quadraticCurveTo(-0.35, 0.05, -0.7, -0.2);
      roofShape.quadraticCurveTo(-0.75, -0.25, -0.7, -0.3);

      const roofGeometry = new THREE.ExtrudeGeometry(roofShape, {
        depth: 0.05,
        bevelEnabled: true,
        bevelSegments: 8,
        bevelSize: 0.01,
        bevelThickness: 0.005
      });
      
      const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
      roof.position.set(0, 1.05, -0.35);
      shuttleGroup.add(roof);

      // Detailed trunk with realistic proportions
      const trunkShape = new THREE.Shape();
      trunkShape.moveTo(-0.5, 0);
      trunkShape.quadraticCurveTo(-0.25, 0.12, 0, 0.15);
      trunkShape.quadraticCurveTo(0.25, 0.12, 0.5, 0);
      trunkShape.quadraticCurveTo(0.55, 0.05, 0.5, 0.18);
      trunkShape.quadraticCurveTo(0.25, 0.22, 0, 0.22);
      trunkShape.quadraticCurveTo(-0.25, 0.22, -0.5, 0.18);
      trunkShape.quadraticCurveTo(-0.55, 0.05, -0.5, 0);

      const trunkGeometry = new THREE.ExtrudeGeometry(trunkShape, {
        depth: 0.3,
        bevelEnabled: true,
        bevelSegments: 10,
        bevelSize: 0.02,
        bevelThickness: 0.015
      });
      
      const trunk = new THREE.Mesh(trunkGeometry, bodyMaterial);
      trunk.position.set(-0.85, 0.75, -0.5);
      shuttleGroup.add(trunk);

      // Remove the circular roof - no longer needed

      // Front windshield with proper positioning on car
      const windshieldGeometry = new THREE.PlaneGeometry(0.8, 0.4);
      const windshieldMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a4d6b,
        transparent: true,
        opacity: 0.8,
        metalness: 0.3,
        roughness: 0.05,
        side: THREE.DoubleSide
      });
      const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
      windshield.position.set(0.75, 0.65, -0.1);
      windshield.rotation.y = 0;
      windshield.rotation.x = -0.15; // Slight angle for realism
      shuttleGroup.add(windshield);

      // Properly aligned side windows
      const sideWindowGeometry = new THREE.PlaneGeometry(0.5, 0.25);
      
      // Left side window (properly positioned on car side)
      const leftWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
      leftWindow.position.set(0.2, 0.6, -0.85);
      leftWindow.rotation.y = 0;
      leftWindow.rotation.x = -0.05;
      shuttleGroup.add(leftWindow);
      
      // Right side window (properly positioned on car side)
      const rightWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
      rightWindow.position.set(0.2, 0.6, 0.15);
      rightWindow.rotation.y = 0;
      rightWindow.rotation.x = -0.05;
      shuttleGroup.add(rightWindow);

      // Rear window
      const rearWindowGeometry = new THREE.PlaneGeometry(0.6, 0.3);
      const rearWindow = new THREE.Mesh(rearWindowGeometry, windshieldMaterial);
      rearWindow.position.set(-0.75, 0.65, -0.1);
      rearWindow.rotation.y = Math.PI;
      rearWindow.rotation.x = 0.1;
      shuttleGroup.add(rearWindow);

      // Ultra-realistic wheel assembly with detailed tire treads and alloy rims
      const createWheel = () => {
        const wheelGroup = new THREE.Group();
        
        // Main tire with realistic tread pattern
        const tireGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 24);
        const tireMaterial = new THREE.MeshStandardMaterial({
          color: 0x0a0a0a,
          roughness: 0.98,
          metalness: 0.02,
          normalScale: new THREE.Vector2(0.8, 0.8)
        });
        const tire = new THREE.Mesh(tireGeometry, tireMaterial);
        tire.rotation.z = Math.PI / 2;
        wheelGroup.add(tire);

        // Tire sidewall details with brand markings simulation
        const sidewallGeometry = new THREE.RingGeometry(0.16, 0.22, 24);
        const sidewallMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide
        });
        const leftSidewall = new THREE.Mesh(sidewallGeometry, sidewallMaterial);
        leftSidewall.position.z = 0.08;
        leftSidewall.rotation.x = Math.PI / 2;
        wheelGroup.add(leftSidewall);
        
        const rightSidewall = leftSidewall.clone();
        rightSidewall.position.z = -0.08;
        wheelGroup.add(rightSidewall);

        // Detailed alloy rim with spokes
        const rimGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.17, 16);
        const rimMaterial = new THREE.MeshStandardMaterial({
          color: 0x888888,
          metalness: 0.95,
          roughness: 0.08,
          envMapIntensity: 1.2
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);

        // Rim center cap
        const centerCapGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12);
        const centerCapMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
          metalness: 0.9,
          roughness: 0.1
        });
        const centerCap = new THREE.Mesh(centerCapGeometry, centerCapMaterial);
        centerCap.rotation.z = Math.PI / 2;
        wheelGroup.add(centerCap);

        // 5-spoke alloy design
        for (let i = 0; i < 5; i++) {
          const spokeGeometry = new THREE.BoxGeometry(0.12, 0.025, 0.01);
          const spoke = new THREE.Mesh(spokeGeometry, rimMaterial);
          spoke.rotation.z = (i / 5) * Math.PI * 2;
          spoke.position.y = 0.075;
          wheelGroup.add(spoke);
          
          // Spoke reinforcement detail
          const reinforcementGeometry = new THREE.BoxGeometry(0.08, 0.015, 0.008);
          const reinforcement = new THREE.Mesh(reinforcementGeometry, centerCapMaterial);
          reinforcement.rotation.z = (i / 5) * Math.PI * 2;
          reinforcement.position.y = 0.05;
          wheelGroup.add(reinforcement);
        }

        // Brake disc simulation (visible through spokes)
        const brakeDiscGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.008, 24);
        const brakeDiscMaterial = new THREE.MeshStandardMaterial({
          color: 0x444444,
          metalness: 0.8,
          roughness: 0.3
        });
        const brakeDisc = new THREE.Mesh(brakeDiscGeometry, brakeDiscMaterial);
        brakeDisc.rotation.z = Math.PI / 2;
        brakeDisc.position.z = 0.05;
        wheelGroup.add(brakeDisc);

        return wheelGroup;
      };

      // Position 4 wheels properly on the car corners
      const wheelPositions = [
        [0.6, 0.18, -0.5],  // front left
        [0.6, 0.18, 0.15],  // front right  
        [-0.6, 0.18, -0.5], // rear left
        [-0.6, 0.18, 0.15]  // rear right
      ];

      wheelPositions.forEach(position => {
        const wheel = createWheel();
        wheel.position.set(...position);
        shuttleGroup.add(wheel);
      });

      // Ultra-realistic LED headlight assemblies with multiple elements
      const createHeadlightAssembly = (side: 'left' | 'right') => {
        const headlightGroup = new THREE.Group();
        
        // Main headlight housing
        const housingGeometry = new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI);
        const housingMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          metalness: 0.9,
          roughness: 0.1,
          transparent: true,
          opacity: 0.95
        });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.rotation.y = -Math.PI / 2;
        headlightGroup.add(housing);
        
        // LED main beam (bright white center)
        const mainBeamGeometry = new THREE.SphereGeometry(0.08, 12, 8);
        const mainBeamMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.9
        });
        const mainBeam = new THREE.Mesh(mainBeamGeometry, mainBeamMaterial);
        mainBeam.position.set(0.05, 0, 0);
        headlightGroup.add(mainBeam);
        
        // LED strip (modern car design)
        for (let i = 0; i < 5; i++) {
          const ledGeometry = new THREE.SphereGeometry(0.02, 8, 6);
          const ledMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaffff,
            emissive: 0x4499aa,
            emissiveIntensity: 0.8
          });
          const led = new THREE.Mesh(ledGeometry, ledMaterial);
          led.position.set(0.03, 0.08 - i * 0.04, side === 'left' ? 0.05 : -0.05);
          headlightGroup.add(led);
        }
        
        // Reflector elements
        const reflectorGeometry = new THREE.RingGeometry(0.06, 0.11, 12);
        const reflectorMaterial = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 1.0,
          roughness: 0.05,
          side: THREE.DoubleSide
        });
        const reflector = new THREE.Mesh(reflectorGeometry, reflectorMaterial);
        reflector.position.set(0.02, 0, 0);
        reflector.rotation.y = Math.PI / 2;
        headlightGroup.add(reflector);
        
        return headlightGroup;
      };

      const leftHeadlight = createHeadlightAssembly('left');
      leftHeadlight.position.set(1.05, 0.4, -0.4);
      shuttleGroup.add(leftHeadlight);

      const rightHeadlight = createHeadlightAssembly('right');
      rightHeadlight.position.set(1.05, 0.4, 0.2);
      shuttleGroup.add(rightHeadlight);

      // Detailed tail lights with multiple LED elements
      const createTaillightAssembly = () => {
        const taillightGroup = new THREE.Group();
        
        // Main taillight housing
        const housingGeometry = new THREE.BoxGeometry(0.06, 0.2, 0.15);
        const housingMaterial = new THREE.MeshStandardMaterial({
          color: 0x2a0000,
          transparent: true,
          opacity: 0.8,
          metalness: 0.5,
          roughness: 0.3
        });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        taillightGroup.add(housing);
        
        // LED elements
        for (let i = 0; i < 4; i++) {
          const ledGeometry = new THREE.SphereGeometry(0.015, 8, 6);
          const ledMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0x440000,
            emissiveIntensity: 0.5
          });
          const led = new THREE.Mesh(ledGeometry, ledMaterial);
          led.position.set(0.025, 0.06 - i * 0.04, 0);
          taillightGroup.add(led);
        }
        
        return taillightGroup;
      };

      const leftTaillight = createTaillightAssembly();
      leftTaillight.position.set(-1.1, 0.5, -0.4);
      shuttleGroup.add(leftTaillight);

      const rightTaillight = createTaillightAssembly();
      rightTaillight.position.set(-1.1, 0.5, 0.2);
      shuttleGroup.add(rightTaillight);

      // Ultra-detailed door assemblies with handles, locks, and body panels
      const createDoorAssembly = () => {
        const doorGroup = new THREE.Group();
        
        // Main door panel with realistic curvature
        const doorShape = new THREE.Shape();
        doorShape.moveTo(-0.02, 0);
        doorShape.quadraticCurveTo(0.08, 0.1, 0.06, 0.3);
        doorShape.quadraticCurveTo(0.04, 0.5, 0.02, 0.65);
        doorShape.quadraticCurveTo(-0.01, 0.68, -0.04, 0.65);
        doorShape.quadraticCurveTo(-0.06, 0.5, -0.04, 0.3);
        doorShape.quadraticCurveTo(-0.06, 0.1, -0.02, 0);

        const doorGeometry = new THREE.ExtrudeGeometry(doorShape, {
          depth: 0.03,
          bevelEnabled: true,
          bevelSegments: 8,
          bevelSize: 0.005,
          bevelThickness: 0.003
        });
        
        const doorMaterial = new THREE.MeshStandardMaterial({
          color: 0xd32f20,
          metalness: 0.9,
          roughness: 0.12
        });
        
        const doorPanel = new THREE.Mesh(doorGeometry, doorMaterial);
        doorGroup.add(doorPanel);
        
        // Door handle with realistic mechanism
        const handleBaseGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.015);
        const handleMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
          metalness: 0.95,
          roughness: 0.05
        });
        const handleBase = new THREE.Mesh(handleBaseGeometry, handleMaterial);
        handleBase.position.set(0.05, 0.3, 0.025);
        doorGroup.add(handleBase);
        
        // Handle grip
        const handleGripGeometry = new THREE.CapsuleGeometry(0.005, 0.04, 4, 8);
        const handleGrip = new THREE.Mesh(handleGripGeometry, handleMaterial);
        handleGrip.position.set(0.08, 0.3, 0.025);
        handleGrip.rotation.z = Math.PI / 2;
        doorGroup.add(handleGrip);
        
        // Door lock mechanism
        const lockGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8);
        const lockMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          metalness: 0.9,
          roughness: 0.1
        });
        const lock = new THREE.Mesh(lockGeometry, lockMaterial);
        lock.position.set(0.05, 0.35, 0.025);
        lock.rotation.z = Math.PI / 2;
        doorGroup.add(lock);
        
        // Door trim lines
        const trimCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.1, 0.02),
          new THREE.Vector3(0.02, 0.3, 0.02),
          new THREE.Vector3(0, 0.5, 0.02),
          new THREE.Vector3(-0.01, 0.6, 0.02)
        ]);
        
        const trimGeometry = new THREE.TubeGeometry(trimCurve, 12, 0.003, 6, false);
        const trimMaterial = new THREE.MeshStandardMaterial({
          color: 0x222222,
          metalness: 0.8,
          roughness: 0.2
        });
        const trim = new THREE.Mesh(trimGeometry, trimMaterial);
        doorGroup.add(trim);
        
        return doorGroup;
      };

      // Add doors to both sides
      const leftDoor = createDoorAssembly();
      leftDoor.position.set(0.88, 0.25, -0.6);
      leftDoor.rotation.y = Math.PI / 2;
      shuttleGroup.add(leftDoor);

      const rightDoor = createDoorAssembly();
      rightDoor.position.set(0.88, 0.25, 0.3);
      rightDoor.rotation.y = Math.PI / 2;
      shuttleGroup.add(rightDoor);

      // Ultra-detailed front grille with brand logo area and air intakes
      const createGrilleAssembly = () => {
        const grilleGroup = new THREE.Group();
        
        // Main grille frame
        const frameShape = new THREE.Shape();
        frameShape.moveTo(-0.25, -0.15);
        frameShape.quadraticCurveTo(0, -0.18, 0.25, -0.15);
        frameShape.quadraticCurveTo(0.3, -0.1, 0.25, 0.15);
        frameShape.quadraticCurveTo(0, 0.18, -0.25, 0.15);
        frameShape.quadraticCurveTo(-0.3, -0.1, -0.25, -0.15);
        
        const frameGeometry = new THREE.ExtrudeGeometry(frameShape, {
          depth: 0.02,
          bevelEnabled: true,
          bevelSegments: 4,
          bevelSize: 0.005,
          bevelThickness: 0.003
        });
        
        const frameMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          metalness: 0.95,
          roughness: 0.05
        });
        
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        grilleGroup.add(frame);
        
        // Hexagonal grille pattern
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 6; col++) {
            const hexGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 6);
            const hexMaterial = new THREE.MeshStandardMaterial({
              color: 0x333333,
              metalness: 0.8,
              roughness: 0.2
            });
            const hex = new THREE.Mesh(hexGeometry, hexMaterial);
            hex.position.set(
              0.015,
              -0.12 + row * 0.08,
              -0.18 + col * 0.06 + (row % 2) * 0.03
            );
            hex.rotation.x = Math.PI / 2;
            grilleGroup.add(hex);
          }
        }
        
        // Central logo area (emblem placeholder)
        const logoGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.005, 12);
        const logoMaterial = new THREE.MeshStandardMaterial({
          color: 0x666666,
          metalness: 0.9,
          roughness: 0.1
        });
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(0.025, 0.05, -0.1);
        logo.rotation.x = Math.PI / 2;
        grilleGroup.add(logo);
        
        // Air intake lower grille
        const intakeGeometry = new THREE.BoxGeometry(0.4, 0.08, 0.02);
        const intake = new THREE.Mesh(intakeGeometry, frameMaterial);
        intake.position.set(0.015, -0.18, -0.1);
        grilleGroup.add(intake);
        
        return grilleGroup;
      };

      const frontGrille = createGrilleAssembly();
      frontGrille.position.set(1.02, 0.4, -0.1);
      shuttleGroup.add(frontGrille);

      // Ultra-detailed side mirrors with housing, adjustment mechanisms, and turn signals
      const createMirrorAssembly = (side: 'left' | 'right') => {
        const mirrorGroup = new THREE.Group();
        
        // Mirror housing with realistic aerodynamic shape
        const housingShape = new THREE.Shape();
        housingShape.moveTo(0, 0);
        housingShape.quadraticCurveTo(0.04, 0.02, 0.08, 0.01);
        housingShape.quadraticCurveTo(0.1, 0.03, 0.08, 0.06);
        housingShape.quadraticCurveTo(0.04, 0.08, 0, 0.06);
        housingShape.quadraticCurveTo(-0.02, 0.03, 0, 0);

        const housingGeometry = new THREE.ExtrudeGeometry(housingShape, {
          depth: 0.04,
          bevelEnabled: true,
          bevelSegments: 6,
          bevelSize: 0.005,
          bevelThickness: 0.003
        });
        
        const housingMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          metalness: 0.8,
          roughness: 0.2
        });
        
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        mirrorGroup.add(housing);
        
        // Mirror glass with realistic reflection
        const glassGeometry = new THREE.PlaneGeometry(0.06, 0.04);
        const glassMaterial = new THREE.MeshStandardMaterial({
          color: 0x87ceeb,
          metalness: 1.0,
          roughness: 0.05,
          envMapIntensity: 1.5
        });
        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.set(0.04, 0.03, 0.02);
        glass.rotation.y = side === 'left' ? 0.1 : -0.1;
        mirrorGroup.add(glass);
        
        // Turn signal indicator
        const signalGeometry = new THREE.SphereGeometry(0.008, 8, 6);
        const signalMaterial = new THREE.MeshStandardMaterial({
          color: 0xffa500,
          emissive: 0x442200,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.8
        });
        const signal = new THREE.Mesh(signalGeometry, signalMaterial);
        signal.position.set(0.02, 0.05, side === 'left' ? -0.01 : 0.05);
        mirrorGroup.add(signal);
        
        // Adjustment mechanism (visible joint)
        const jointGeometry = new THREE.SphereGeometry(0.012, 8, 6);
        const jointMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
          metalness: 0.9,
          roughness: 0.1
        });
        const joint = new THREE.Mesh(jointGeometry, jointMaterial);
        joint.position.set(-0.01, 0.03, 0.02);
        mirrorGroup.add(joint);
        
        // Mounting stalk with realistic curvature
        const stalkCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.02, 0.03, 0.02),
          new THREE.Vector3(-0.04, 0.01, 0.01),
          new THREE.Vector3(-0.06, -0.01, 0)
        ]);
        
        const stalkGeometry = new THREE.TubeGeometry(stalkCurve, 8, 0.008, 6, false);
        const stalk = new THREE.Mesh(stalkGeometry, housingMaterial);
        mirrorGroup.add(stalk);
        
        return mirrorGroup;
      };

      const leftMirror = createMirrorAssembly('left');
      leftMirror.position.set(0.85, 0.85, -0.6);
      leftMirror.rotation.y = -0.3;
      shuttleGroup.add(leftMirror);

      const rightMirror = createMirrorAssembly('right');
      rightMirror.position.set(0.85, 0.85, 0.4);
      rightMirror.rotation.y = 0.3;
      shuttleGroup.add(rightMirror);

      // Ultra-realistic exhaust system with muffler, pipes, and heat shields
      const createExhaustSystem = () => {
        const exhaustGroup = new THREE.Group();
        
        // Main muffler body
        const mufflerGeometry = new THREE.CapsuleGeometry(0.04, 0.25, 4, 8);
        const mufflerMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
          metalness: 0.8,
          roughness: 0.3
        });
        const muffler = new THREE.Mesh(mufflerGeometry, mufflerMaterial);
        muffler.position.set(-0.15, 0, 0);
        muffler.rotation.z = Math.PI / 2;
        exhaustGroup.add(muffler);
        
        // Exhaust pipe with realistic bends
        const pipeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(-0.08, -0.01, 0),
          new THREE.Vector3(-0.12, -0.02, 0),
          new THREE.Vector3(-0.18, -0.015, 0)
        ]);
        
        const pipeGeometry = new THREE.TubeGeometry(pipeCurve, 12, 0.02, 8, false);
        const pipeMaterial = new THREE.MeshStandardMaterial({
          color: 0x444444,
          metalness: 0.9,
          roughness: 0.15
        });
        const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
        exhaustGroup.add(pipe);
        
        // Exhaust tip with realistic interior
        const tipGeometry = new THREE.CylinderGeometry(0.025, 0.02, 0.06, 12);
        const tipMaterial = new THREE.MeshStandardMaterial({
          color: 0x555555,
          metalness: 0.95,
          roughness: 0.1
        });
        const tip = new THREE.Mesh(tipGeometry, tipMaterial);
        tip.position.set(-0.21, -0.015, 0);
        tip.rotation.z = Math.PI / 2;
        exhaustGroup.add(tip);
        
        // Interior pipe (visible through tip)
        const innerGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8);
        const innerMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          metalness: 0.3,
          roughness: 0.8
        });
        const inner = new THREE.Mesh(innerGeometry, innerMaterial);
        inner.position.set(-0.205, -0.015, 0);
        inner.rotation.z = Math.PI / 2;
        exhaustGroup.add(inner);
        
        // Heat shield
        const shieldGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.02);
        const shieldMaterial = new THREE.MeshStandardMaterial({
          color: 0x2a2a2a,
          metalness: 0.7,
          roughness: 0.4
        });
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shield.position.set(-0.1, 0.04, 0);
        exhaustGroup.add(shield);
        
        // Mounting brackets
        for (let i = 0; i < 2; i++) {
          const bracketGeometry = new THREE.BoxGeometry(0.03, 0.01, 0.01);
          const bracket = new THREE.Mesh(bracketGeometry, mufflerMaterial);
          bracket.position.set(-0.05 - i * 0.1, 0.025, 0);
          exhaustGroup.add(bracket);
        }
        
        return exhaustGroup;
      };

      const leftExhaust = createExhaustSystem();
      leftExhaust.position.set(-1.1, 0.15, -0.3);
      shuttleGroup.add(leftExhaust);

      const rightExhaust = createExhaustSystem();
      rightExhaust.position.set(-1.1, 0.15, 0.05);
      shuttleGroup.add(rightExhaust);

      // Curved antenna with detailed segments
      const antennaCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.02, 0.15, 0.01),
        new THREE.Vector3(0.05, 0.3, 0.02),
        new THREE.Vector3(0.03, 0.45, 0.01)
      ]);
      
      const antennaGeometry = new THREE.TubeGeometry(antennaCurve, 16, 0.008, 6, false);
      const antennaMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2
      });
      
      const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna.position.set(0, 0.7, -0.2);
      shuttleGroup.add(antenna);

      // Curved door panels with detailed frames
      const doorFrameShape = new THREE.Shape();
      doorFrameShape.moveTo(0, 0);
      doorFrameShape.quadraticCurveTo(0.02, 0.1, 0, 0.2);
      doorFrameShape.quadraticCurveTo(0.05, 0.4, 0, 0.6);
      doorFrameShape.lineTo(-0.02, 0.6);
      doorFrameShape.quadraticCurveTo(-0.03, 0.4, -0.02, 0.2);
      doorFrameShape.quadraticCurveTo(-0.03, 0.1, -0.02, 0);
      doorFrameShape.lineTo(0, 0);

      const doorFrameGeometry = new THREE.ExtrudeGeometry(doorFrameShape, { 
        depth: 0.01, 
        bevelEnabled: true,
        bevelSize: 0.002,
        bevelThickness: 0.001
      });
      const doorFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.7,
        roughness: 0.3
      });

      // Left door frame
      const leftDoorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
      leftDoorFrame.position.set(0.88, 0.3, -0.5);
      leftDoorFrame.rotation.y = Math.PI / 2;
      shuttleGroup.add(leftDoorFrame);

      // Right door frame  
      const rightDoorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
      rightDoorFrame.position.set(0.88, 0.3, 0.2);
      rightDoorFrame.rotation.y = Math.PI / 2;
      shuttleGroup.add(rightDoorFrame);

      // Detailed bumpers with curved design
      const bumperCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.3, 0, 0),
        new THREE.Vector3(-0.1, 0.02, 0),
        new THREE.Vector3(0.1, 0.02, 0),
        new THREE.Vector3(0.3, 0, 0)
      ]);
      
      const bumperGeometry = new THREE.TubeGeometry(bumperCurve, 16, 0.04, 8, false);
      const bumperMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4520,
        metalness: 0.6,
        roughness: 0.4
      });
      
      // Front bumper
      const frontBumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
      frontBumper.position.set(1.15, 0.2, -0.1);
      frontBumper.rotation.y = Math.PI / 2;
      shuttleGroup.add(frontBumper);
      
      // Rear bumper
      const rearBumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
      rearBumper.position.set(-1.15, 0.2, -0.1);
      rearBumper.rotation.y = Math.PI / 2;
      shuttleGroup.add(rearBumper);

      return shuttleGroup;
    };

    const spawnDetailedClusters = () => {
      const nodes: ShuttleNode[] = [];
      // Further reduced clusters to prevent overlap with better spacing
      const clusters = [
        { center: new THREE.Vector3(-12, 2, 0), count: 3 },
        { center: new THREE.Vector3(-8, -1, 1), count: 2 },
        { center: new THREE.Vector3(-10, 4, -2), count: 2 },
        { center: new THREE.Vector3(-14, -2, 1), count: 3 },
        { center: new THREE.Vector3(-6, 1, 2), count: 2 },
      ];
      let nodeId = 0;
      clusters.forEach((cluster) => {
        for (let i = 0; i < cluster.count; i++) {
          const angle = (i / cluster.count) * Math.PI * 2;
          const radius = 0.8 + rand() * 1.2;
          const x = cluster.center.x + Math.cos(angle) * radius + (rand() - 0.5) * 0.4;
          const y = cluster.center.y + Math.sin(angle) * radius + (rand() - 0.5) * 0.4;
          const z = cluster.center.z + (rand() - 0.5) * 1.2;
          
          const shuttle = createDetailedShuttle();
          
          // Bright vivid colors optimized for light mode visibility
          const colorVariant = rand();
          let color: THREE.Color;
          
          if (colorVariant < 0.3) {
            // Bright vivid red - highly visible in light mode
            const hue = 0.0 + rand() * 0.01; // Pure red spectrum
            const saturation = 1.0; // Maximum saturation for vividness
            const lightness = 0.5 + rand() * 0.15; // Bright enough to stand out
            color = new THREE.Color().setHSL(hue, saturation, lightness);
          } else if (colorVariant < 0.6) {
            // Bright magenta-red variants - very visible
            const hue = 0.93 + rand() * 0.05; // Magenta-red spectrum
            const saturation = 0.95 + rand() * 0.05;
            const lightness = 0.45 + rand() * 0.2; // Medium-bright
            color = new THREE.Color().setHSL(hue, saturation, lightness);
          } else {
            // Bright orange-red variants - warm and vivid
            const hue = 0.02 + rand() * 0.03; // Orange-red spectrum
            const saturation = 1.0; // Maximum saturation
            const lightness = 0.55 + rand() * 0.1; // Bright
            color = new THREE.Color().setHSL(hue, saturation, lightness);
          }
          
          shuttle.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              if (child.material.color.r > 0.5) { // Only recolor the main body
                child.material.color.copy(color);
              }
            }
          });
          
          shuttle.position.set(x, y, z);
          shuttle.rotation.set((rand() - 0.5) * 0.1, rand() * Math.PI * 2, (rand() - 0.5) * 0.05);
          const s = 0.8 + rand() * 0.4;
          shuttle.scale.setScalar(s);
          scene.add(shuttle);
          nodes.push({ id: nodeId++, position: new THREE.Vector3(x, y, z), mesh: shuttle, targetPosition: new THREE.Vector3(x, y, z), isDragging: false });
        }
      });
      shuttleNodesRef.current = nodes;

      // simple connections
      const connections: Connection[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const distance = nodes[i].position.distanceTo(nodes[j].position);
          if (distance < 3.0 || rand() > 0.86) {
            const geometry = new THREE.BufferGeometry().setFromPoints([nodes[i].position, nodes[j].position]);
            const material = new THREE.LineBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0.28 });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            connections.push({ from: i, to: j, line });
          }
        }
      }
      connectionsRef.current = connections;
    };

    // Use detailed shuttle models directly
    try {
      spawnDetailedClusters();
    } catch (e) {
      console.error('Detailed cluster spawn failed', e);
    }

    // Mouse interaction handlers
    const onMouseMove = (event: MouseEvent) => {
      if (!cameraRef.current || !sceneRef.current) return;

      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      if (isDraggingRef.current && selectedNodeRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersectPoint = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(
          new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
          intersectPoint
        );
        
        selectedNodeRef.current.targetPosition.copy(intersectPoint);
        selectedNodeRef.current.position.copy(intersectPoint);
        
        if (selectedNodeRef.current.mesh) {
          selectedNodeRef.current.mesh.position.copy(intersectPoint);
        }

        // Update connections
        updateConnections();
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      if (!cameraRef.current || !sceneRef.current) return;

      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(
        shuttleNodesRef.current.map(node => node.mesh!).filter(Boolean),
        true
      );

      if (intersects.length > 0) {
        let clickedObject: THREE.Object3D | null = intersects[0].object;
        let clickedNode: ShuttleNode | undefined;

        // Walk up the parent chain to find the node's root group
        while (clickedObject) {
          clickedNode = shuttleNodesRef.current.find(node => node.mesh === clickedObject);
          if (clickedNode) break;
          clickedObject = clickedObject.parent;
        }

        if (clickedNode) {
          isDraggingRef.current = true;
          selectedNodeRef.current = clickedNode;
          clickedNode.isDragging = true;

          // Add subtle scale 'picked up' effect
          if (clickedNode.mesh) {
            clickedNode.mesh.scale.setScalar(1.2);
          }
        }
      }
    };

    const onMouseUp = () => {
      if (selectedNodeRef.current) {
        selectedNodeRef.current.isDragging = false;
        
        // Remove glow effect
        if (selectedNodeRef.current.mesh) {
          selectedNodeRef.current.mesh.scale.setScalar(1.0);
        }
      }
      
      isDraggingRef.current = false;
      selectedNodeRef.current = null;
    };

    const updateConnections = () => {
      connectionsRef.current.forEach(connection => {
        if (connection.line) {
          const fromNode = shuttleNodesRef.current[connection.from];
          const toNode = shuttleNodesRef.current[connection.to];
          const points = [fromNode.position, toNode.position];
          connection.line.geometry.setFromPoints(points);
        }
      });
    };

    // Event listeners
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Gentle floating animation for non-dragged nodes
      shuttleNodesRef.current.forEach((node, index) => {
        if (!node.isDragging && node.mesh) {
          const time = Date.now() * 0.001;
          const floatY = Math.sin(time + index) * 0.05;
          const floatX = Math.cos(time * 0.5 + index) * 0.03;
          
          node.mesh.position.x = node.targetPosition.x + floatX;
          node.mesh.position.y = node.targetPosition.y + floatY;
          node.mesh.position.z = node.targetPosition.z;
          
          node.position.copy(node.mesh.position);
          
          // Gentle rotation
          node.mesh.rotation.y += 0.002;
        }
      });

      // Update connection opacity with pulse effect
      const time = Date.now() * 0.002;
      connectionsRef.current.forEach((connection, index) => {
        if (connection.line) {
          const material = connection.line.material as THREE.LineBasicMaterial;
          material.opacity = 0.2 + Math.sin(time + index * 0.5) * 0.1;
        }
      });

      updateConnections();

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      
      if (mountEl && rendererRef.current) {
        mountEl.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return <div ref={mountRef} className="scene-container" />;
};