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

    // Create highly detailed curved shuttle geometry
    const createDetailedShuttle = () => {
      const shuttleGroup = new THREE.Group();

      // Create realistic car body with complex curves and multiple sections
      // Main chassis with realistic car proportions
      const chassisShape = new THREE.Shape();
      chassisShape.moveTo(-0.9, 0);
      chassisShape.quadraticCurveTo(-1.05, 0.08, -1.0, 0.25);
      chassisShape.quadraticCurveTo(-0.95, 0.5, -0.85, 0.6);
      chassisShape.lineTo(0.85, 0.6);
      chassisShape.quadraticCurveTo(0.95, 0.5, 1.0, 0.25);
      chassisShape.quadraticCurveTo(1.05, 0.08, 0.9, 0);
      chassisShape.lineTo(-0.9, 0);

      const chassisExtrudeSettings = {
        depth: 0.7,
        bevelEnabled: true,
        bevelSegments: 12,
        steps: 3,
        bevelSize: 0.04,
        bevelThickness: 0.015
      };

      const chassisGeometry = new THREE.ExtrudeGeometry(chassisShape, chassisExtrudeSettings);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xd32f20,
        metalness: 0.85,
        roughness: 0.15,
        envMapIntensity: 1.2
      });
      const chassis = new THREE.Mesh(chassisGeometry, bodyMaterial);
      chassis.position.set(0, 0.28, -0.35);
      shuttleGroup.add(chassis);

      // Hood section with detailed curves
      const hoodShape = new THREE.Shape();
      hoodShape.moveTo(-0.5, 0);
      hoodShape.quadraticCurveTo(-0.1, 0.12, 0.5, 0);
      hoodShape.quadraticCurveTo(0.6, 0.05, 0.55, 0.15);
      hoodShape.lineTo(-0.55, 0.15);
      hoodShape.quadraticCurveTo(-0.6, 0.05, -0.5, 0);

      const hoodGeometry = new THREE.ExtrudeGeometry(hoodShape, { 
        depth: 0.3, 
        bevelEnabled: true, 
        bevelSegments: 8, 
        bevelSize: 0.02,
        bevelThickness: 0.01 
      });
      const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
      hood.position.set(0.75, 0.6, -0.5);
      shuttleGroup.add(hood);

      // Trunk section
      const trunkShape = new THREE.Shape();
      trunkShape.moveTo(-0.4, 0);
      trunkShape.quadraticCurveTo(0, 0.08, 0.4, 0);
      trunkShape.quadraticCurveTo(0.45, 0.03, 0.4, 0.12);
      trunkShape.lineTo(-0.4, 0.12);
      trunkShape.quadraticCurveTo(-0.45, 0.03, -0.4, 0);

      const trunkGeometry = new THREE.ExtrudeGeometry(trunkShape, { 
        depth: 0.25, 
        bevelEnabled: true, 
        bevelSegments: 6, 
        bevelSize: 0.015,
        bevelThickness: 0.008 
      });
      const trunk = new THREE.Mesh(trunkGeometry, bodyMaterial);
      trunk.position.set(-0.75, 0.6, -0.45);
      shuttleGroup.add(trunk);

      // Curved roof using LatheGeometry for smooth dome
      const roofPoints = [];
      for (let i = 0; i <= 10; i++) {
        const angle = (i / 10) * Math.PI * 0.5;
        roofPoints.push(new THREE.Vector2(Math.sin(angle) * 0.9, Math.cos(angle) * 0.3 + 0.4));
      }
      const roofGeometry = new THREE.LatheGeometry(roofPoints, 16);
      const roofMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4520,
        metalness: 0.7,
        roughness: 0.3
      });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 0.5;
      roof.scale.set(1, 1, 1.2);
      shuttleGroup.add(roof);

      // Front windshield with proper curvature and alignment
      const windshieldGeometry = new THREE.CylinderGeometry(0.7, 0.8, 0.03, 16, 1, false, 0, Math.PI * 0.8);
      const windshieldMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e4f6f,
        transparent: true,
        opacity: 0.75,
        metalness: 0.3,
        roughness: 0.05,
        side: THREE.DoubleSide
      });
      const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
      windshield.position.set(0.85, 0.6, -0.1);
      windshield.rotation.z = Math.PI;
      windshield.rotation.x = -0.1;
      shuttleGroup.add(windshield);

      // Properly aligned side windows with realistic glass
      const sideWindowShape = new THREE.Shape();
      sideWindowShape.moveTo(0, 0);
      sideWindowShape.quadraticCurveTo(0.25, 0.02, 0.5, 0);
      sideWindowShape.lineTo(0.5, 0.25);
      sideWindowShape.quadraticCurveTo(0.25, 0.28, 0, 0.25);
      sideWindowShape.lineTo(0, 0);

      const sideWindowGeometry = new THREE.ExtrudeGeometry(sideWindowShape, { 
        depth: 0.015, 
        bevelEnabled: true, 
        bevelSize: 0.002,
        bevelThickness: 0.001 
      });
      
      // Left side window (driver side)
      const leftWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
      leftWindow.position.set(0.82, 0.55, -0.35);
      leftWindow.rotation.y = Math.PI / 2;
      leftWindow.rotation.x = -0.05;
      shuttleGroup.add(leftWindow);
      
      // Right side window (passenger side)
      const rightWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
      rightWindow.position.set(-0.82, 0.55, -0.35);
      rightWindow.rotation.y = -Math.PI / 2;
      rightWindow.rotation.x = -0.05;
      shuttleGroup.add(rightWindow);

      // Rear window
      const rearWindowGeometry = new THREE.PlaneGeometry(0.6, 0.3);
      const rearWindow = new THREE.Mesh(rearWindowGeometry, windshieldMaterial);
      rearWindow.position.set(-0.85, 0.6, -0.1);
      rearWindow.rotation.y = Math.PI;
      rearWindow.rotation.x = 0.1;
      shuttleGroup.add(rearWindow);

      // Detailed wheels with rims and tires
      const createWheel = () => {
        const wheelGroup = new THREE.Group();
        
        // Tire (torus for realistic shape)
        const tireGeometry = new THREE.TorusGeometry(0.18, 0.08, 8, 16);
        const tireMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          roughness: 0.9,
          metalness: 0.1
        });
        const tire = new THREE.Mesh(tireGeometry, tireMaterial);
        tire.rotation.x = Math.PI / 2;
        wheelGroup.add(tire);

        // Rim (cylinder with metallic material)
        const rimGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12);
        const rimMaterial = new THREE.MeshStandardMaterial({
          color: 0x888888,
          metalness: 0.9,
          roughness: 0.1
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);

        // Spokes
        for (let i = 0; i < 5; i++) {
          const spokeGeometry = new THREE.BoxGeometry(0.02, 0.12, 0.01);
          const spoke = new THREE.Mesh(spokeGeometry, rimMaterial);
          spoke.rotation.z = (i / 5) * Math.PI * 2;
          spoke.position.y = 0.06;
          wheelGroup.add(spoke);
        }

        return wheelGroup;
      };

      // Position wheels
      const wheels = [
        { pos: [0.7, 0.18, -0.6], name: 'frontLeft' },
        { pos: [0.7, 0.18, 0.2], name: 'frontRight' },
        { pos: [-0.7, 0.18, -0.6], name: 'rearLeft' },
        { pos: [-0.7, 0.18, 0.2], name: 'rearRight' }
      ];

      wheels.forEach(wheelData => {
        const wheel = createWheel();
        wheel.position.set(...wheelData.pos);
        shuttleGroup.add(wheel);
      });

      // Curved headlights using SphereGeometry with emissive material
      const headlightGeometry = new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI);
      const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffaa,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.9
      });

      const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      leftHeadlight.position.set(1.05, 0.4, -0.3);
      leftHeadlight.rotation.y = -Math.PI / 2;
      shuttleGroup.add(leftHeadlight);

      const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      rightHeadlight.position.set(1.05, 0.4, 0.1);
      rightHeadlight.rotation.y = -Math.PI / 2;
      shuttleGroup.add(rightHeadlight);

      // Curved door handles
      const handleCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.02, 0.01, 0),
        new THREE.Vector3(0.04, 0, 0),
        new THREE.Vector3(0.06, -0.01, 0)
      ]);

      const handleGeometry = new THREE.TubeGeometry(handleCurve, 8, 0.008, 6, false);
      const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.95,
        roughness: 0.05
      });

      const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
      leftHandle.position.set(0.92, 0.4, -0.4);
      leftHandle.rotation.z = Math.PI / 2;
      shuttleGroup.add(leftHandle);

      const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
      rightHandle.position.set(0.92, 0.4, 0.0);
      rightHandle.rotation.z = Math.PI / 2;
      shuttleGroup.add(rightHandle);

      // Curved grille using multiple thin cylinders
      for (let i = 0; i < 8; i++) {
        const grilleGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.3, 6);
        const grilleMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
          metalness: 0.8,
          roughness: 0.2
        });
        const grillePiece = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grillePiece.position.set(1.02, 0.25 + i * 0.03, -0.1);
        grillePiece.rotation.z = Math.PI / 2;
        shuttleGroup.add(grillePiece);
      }

      // Side mirrors with curved stalks
      const mirrorStalkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.05, 0.02, 0.03),
        new THREE.Vector3(0.08, 0.01, 0.05)
      ]);

      const stalkGeometry = new THREE.TubeGeometry(mirrorStalkCurve, 8, 0.01, 6, false);
      const stalkMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.7,
        roughness: 0.3
      });

      [{ side: 'left', z: -0.5 }, { side: 'right', z: 0.3 }].forEach(mirror => {
        const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
        stalk.position.set(0.85, 0.65, mirror.z);
        stalk.rotation.y = mirror.side === 'left' ? -0.3 : 0.3;
        shuttleGroup.add(stalk);

        // Mirror glass
        const mirrorGeometry = new THREE.PlaneGeometry(0.08, 0.06);
        const mirrorMaterial = new THREE.MeshStandardMaterial({
          color: 0x87ceeb,
          metalness: 0.9,
          roughness: 0.1
        });
        const mirrorGlass = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        mirrorGlass.position.set(0.93, 0.66, mirror.z + (mirror.side === 'left' ? -0.05 : 0.05));
        shuttleGroup.add(mirrorGlass);
      });

      // Detailed exhaust pipes with curved design
      const exhaustCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.1, -0.02, 0),
        new THREE.Vector3(-0.2, -0.01, 0)
      ]);
      
      const exhaustGeometry = new THREE.TubeGeometry(exhaustCurve, 12, 0.025, 8, false);
      const exhaustMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.9,
        roughness: 0.1
      });
      
      // Left exhaust
      const leftExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
      leftExhaust.position.set(-1.1, 0.15, -0.4);
      shuttleGroup.add(leftExhaust);
      
      // Right exhaust
      const rightExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
      rightExhaust.position.set(-1.1, 0.15, 0.1);
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
          
          // Enhanced color variations optimized for light mode visibility
          const colorVariant = rand();
          let color: THREE.Color;
          
          if (colorVariant < 0.3) {
            // Vibrant crimson red - high contrast in light mode
            const hue = 0.0 + rand() * 0.01; // Pure red spectrum
            const saturation = 0.9 + rand() * 0.1;
            const lightness = 0.3 + rand() * 0.15; // Darker for light mode visibility
            color = new THREE.Color().setHSL(hue, saturation, lightness);
          } else if (colorVariant < 0.6) {
            // Dark burgundy variants - excellent light mode contrast
            const hue = 0.97 + rand() * 0.03; // Deep red-purple
            const saturation = 0.85 + rand() * 0.15;
            const lightness = 0.25 + rand() * 0.2; // Very dark for visibility
            color = new THREE.Color().setHSL(hue, saturation, lightness);
          } else {
            // Rich orange-red variants - warm but visible
            const hue = 0.03 + rand() * 0.02; // Orange-red spectrum
            const saturation = 0.95 + rand() * 0.05;
            const lightness = 0.35 + rand() * 0.15; // Medium dark
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