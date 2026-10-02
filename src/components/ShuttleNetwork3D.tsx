import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

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
    
    // Physically based renderer settings for realism
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.physicallyCorrectLights = true;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
  // Disable shadow map for better performance in complex models/devices
  renderer.shadowMap.enabled = false;

    // Environment reflections without external HDR files
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    // keep transparent background to blend with UI
    scene.background = null;
    
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

    // Create ultra-detailed car geometry with precise alignment and high realism
    const createDetailedShuttle = () => {
      const shuttleGroup = new THREE.Group();

      // Materials
      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xd32f20,
        metalness: 1.0,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        sheen: 0.3
      });
      const blackTrim = new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.8 });
      const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd0d0d0, metalness: 1.0, roughness: 0.08 });
      const glass = new THREE.MeshPhysicalMaterial({
        color: 0x87a8b9,
        transmission: 0.75,
        thickness: 0.15,
        roughness: 0.05,
        metalness: 0.0,
        ior: 1.5,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide
      });
      const lightLens = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.7, thickness: 0.05, roughness: 0.05, transparent: true });

      // Chassis: side profile extruded across width with high bevel to form crisp edges
      const sideProfile = new THREE.Shape();
      sideProfile.moveTo(-1.4, 0.15);                  // front bottom lip
      sideProfile.quadraticCurveTo(-1.3, 0.45, -1.0, 0.60); // hood rise
      sideProfile.quadraticCurveTo(-0.4, 0.95, 0.2, 0.92);  // windshield to roof front
      sideProfile.quadraticCurveTo(0.6, 0.90, 0.9, 0.75);    // roof to C-pillar
      sideProfile.quadraticCurveTo(1.15, 0.60, 1.25, 0.35);  // rear slope
      sideProfile.quadraticCurveTo(1.35, 0.20, 1.35, 0.10);  // trunk lip
      sideProfile.quadraticCurveTo(1.10, 0.05, 0.90, 0.05);  // rear lower
      sideProfile.lineTo(-1.1, 0.05);
      sideProfile.quadraticCurveTo(-1.3, 0.05, -1.4, 0.15);

      const bodyGeometry = new THREE.ExtrudeGeometry(sideProfile, {
        depth: 1.1,                  // overall width
        bevelEnabled: true,
        bevelSegments: 20,
        steps: 6,
        bevelSize: 0.035,
        bevelThickness: 0.02,
        curveSegments: 36
      });
      bodyGeometry.computeVertexNormals();
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.set(-0.05, 0.25, -0.55);
      shuttleGroup.add(body);

      // Hood bulge
      const hoodShape = new THREE.Shape();
      hoodShape.moveTo(-0.9, 0.02);
      hoodShape.quadraticCurveTo(-0.4, 0.14, 0.1, 0.12);
      hoodShape.quadraticCurveTo(0.6, 0.10, 0.9, 0.02);
      const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, { depth: 1.05, bevelEnabled: true, bevelSegments: 16, bevelSize: 0.02, bevelThickness: 0.01, curveSegments: 28 });
      const hood = new THREE.Mesh(hoodGeo, bodyMaterial);
      hood.position.set(0.2, 0.62, -0.52);
      shuttleGroup.add(hood);

      // Trunk lip
      const trunkShape = new THREE.Shape();
      trunkShape.moveTo(-0.7, 0.02);
      trunkShape.quadraticCurveTo(-0.2, 0.08, 0.7, 0.02);
      const trunkGeo = new THREE.ExtrudeGeometry(trunkShape, { depth: 1.05, bevelEnabled: true, bevelSegments: 12, bevelSize: 0.015, bevelThickness: 0.008, curveSegments: 24 });
      const trunk = new THREE.Mesh(trunkGeo, bodyMaterial);
      trunk.position.set(-1.0, 0.62, -0.52);
      shuttleGroup.add(trunk);

      // Wheel arches (precise torus segments)
      const arch = (x: number, z: number) => {
        const g = new THREE.TorusGeometry(0.34, 0.06, 20, 48, Math.PI);
        const m = bodyMaterial;
        const mesh = new THREE.Mesh(g, m);
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(x, 0.34, z);
        return mesh;
      };
      shuttleGroup.add(arch(0.62, -0.5));
      shuttleGroup.add(arch(0.62, 0.15));
      shuttleGroup.add(arch(-0.62, -0.5));
      shuttleGroup.add(arch(-0.62, 0.15));

      // Windows with glass material
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.45, 1, 1), glass);
      windshield.position.set(0.55, 0.78, -0.01);
      windshield.rotation.x = -0.32;
      shuttleGroup.add(windshield);

      const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.38, 1, 1), glass);
      rearGlass.position.set(-0.75, 0.76, -0.01);
      rearGlass.rotation.x = 0.28;
      rearGlass.rotation.y = Math.PI;
      shuttleGroup.add(rearGlass);

      const sideGlass = new THREE.PlaneGeometry(0.85, 0.28);
      const leftSideGlass = new THREE.Mesh(sideGlass, glass);
      leftSideGlass.position.set(0.05, 0.72, -0.98);
      leftSideGlass.rotation.y = 0;
      shuttleGroup.add(leftSideGlass);
      const rightSideGlass = new THREE.Mesh(sideGlass, glass);
      rightSideGlass.position.set(0.05, 0.72, -0.12);
      rightSideGlass.rotation.y = 0;
      shuttleGroup.add(rightSideGlass);

      // Door seams (thin tubes)
      const seamCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2, 0.35, 0),
        new THREE.Vector3(0.2, 0.55, 0),
        new THREE.Vector3(0.2, 0.75, 0)
      ]);
      const seamGeo = new THREE.TubeGeometry(seamCurve, 12, 0.005, 6, false);
      const seamL = new THREE.Mesh(seamGeo, blackTrim);
      seamL.position.set(0.0, 0.0, -0.56);
      shuttleGroup.add(seamL);
      const seamR = seamL.clone();
      seamR.position.z = 0.3;
      shuttleGroup.add(seamR);

      // Mirrors
      const mirrorBaseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.05, 0.02, 0.03),
        new THREE.Vector3(0.09, 0.0, 0.07)
      ]);
      const mirrorStalk = new THREE.Mesh(new THREE.TubeGeometry(mirrorBaseCurve, 18, 0.01, 8, false), blackTrim);
      const mirrorHead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), chrome);
      const leftMirror = new THREE.Group();
      leftMirror.add(mirrorStalk.clone());
      const lm = mirrorHead.clone(); lm.position.set(0.1, 0.03, -0.04); leftMirror.add(lm);
      leftMirror.position.set(0.75, 0.72, -0.58);
      shuttleGroup.add(leftMirror);
      const rightMirror = leftMirror.clone();
      rightMirror.position.set(0.75, 0.72, 0.02);
      shuttleGroup.add(rightMirror);

      // Headlights + lenses + subtle point lights
      const headLens = new THREE.Mesh(new THREE.SphereGeometry(0.11, 22, 16, 0, Math.PI), lightLens);
      const headL = headLens.clone(); headL.position.set(1.20, 0.42, -0.28); headL.rotation.y = -Math.PI / 2; shuttleGroup.add(headL);
      const headR = headLens.clone(); headR.position.set(1.20, 0.42, 0.06); headR.rotation.y = -Math.PI / 2; shuttleGroup.add(headR);
      const hl = new THREE.PointLight(0xfff7cc, 0.6, 2.5); hl.position.copy(headL.position); shuttleGroup.add(hl);
      const hr = new THREE.PointLight(0xfff7cc, 0.6, 2.5); hr.position.copy(headR.position); shuttleGroup.add(hr);

      // Taillights
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), new THREE.MeshPhysicalMaterial({ color: 0xff1e00, emissive: 0x550000, emissiveIntensity: 0.8 }));
      const tl = tail.clone(); tl.position.set(-1.35, 0.40, -0.28); shuttleGroup.add(tl);
      const tr = tail.clone(); tr.position.set(-1.35, 0.40, 0.06); shuttleGroup.add(tr);

      // Grille with thin slats
      for (let i = 0; i < 9; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.008, 0.02), chrome);
        slat.position.set(1.12, 0.26 + i * 0.025, -0.10);
        shuttleGroup.add(slat);
      }

      // Bumpers
      const bumperGeo = new THREE.BoxGeometry(0.34, 0.08, 0.3);
      const frontBumper = new THREE.Mesh(bumperGeo, chrome);
      frontBumper.position.set(1.24, 0.20, -0.10);
      shuttleGroup.add(frontBumper);
      const rearBumper = new THREE.Mesh(bumperGeo, chrome);
      rearBumper.position.set(-1.24, 0.22, -0.10);
      shuttleGroup.add(rearBumper);

      // Exhaust tips
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16), chrome);
      tip.rotation.z = Math.PI / 2;
      const tipL = tip.clone(); tipL.position.set(-1.18, 0.18, -0.40); shuttleGroup.add(tipL);
      const tipR = tip.clone(); tipR.position.set(-1.18, 0.18, 0.08); shuttleGroup.add(tipR);

      // Wheels: ultra-detailed torus tire + rim + spokes + brake
      const createWheel = () => {
        const g = new THREE.Group();

        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 28, 44), blackTrim);
        tire.rotation.y = Math.PI / 2; // face outward, roll along X
        g.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.12, 28), chrome);
        rim.rotation.z = Math.PI / 2;
        g.add(rim);

        // Spokes
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.10), chrome);
        for (let i = 0; i < 10; i++) {
          const s = spoke.clone();
          const a = (i / 10) * Math.PI * 2;
          s.position.set(Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06);
          s.rotation.y = a;
          g.add(s);
        }

        // Brake disc and caliper
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 28), new THREE.MeshPhysicalMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.2 }));
        disc.rotation.z = Math.PI / 2; g.add(disc);
        const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xff3b2f, metalness: 0.8, roughness: 0.3 }));
        caliper.position.set(0, 0.02, 0.09); g.add(caliper);

        return g;
      };

      const wheelPositions: [number, number, number][] = [
        [0.75, 0.22, -0.50],
        [0.75, 0.22, 0.15],
        [-0.75, 0.22, -0.50],
        [-0.75, 0.22, 0.15]
      ];
      wheelPositions.forEach(p => { const w = createWheel(); w.position.set(p[0], p[1], p[2]); shuttleGroup.add(w); });

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