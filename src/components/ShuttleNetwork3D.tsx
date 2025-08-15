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

    // Create detailed shuttle geometry instead of loading OBJ
    const createDetailedShuttle = () => {
      const shuttleGroup = new THREE.Group();

      // Main body (elongated for shuttle look)
      const bodyGeometry = new THREE.BoxGeometry(2.0, 0.6, 0.8);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6b35,
        metalness: 0.7,
        roughness: 0.3
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.3;
      shuttleGroup.add(body);

      // Windshield
      const windshieldGeometry = new THREE.BoxGeometry(1.8, 0.4, 0.02);
      const windshieldMaterial = new THREE.MeshStandardMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.7,
        metalness: 0.1,
        roughness: 0.1
      });
      const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
      windshield.position.set(0, 0.5, 0.41);
      shuttleGroup.add(windshield);

      // Side windows
      const sideWindowGeometry = new THREE.BoxGeometry(0.02, 0.3, 0.6);
      const leftWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
      leftWindow.position.set(1.01, 0.45, 0);
      shuttleGroup.add(leftWindow);
      
      const rightWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
      rightWindow.position.set(-1.01, 0.45, 0);
      shuttleGroup.add(rightWindow);

      // Wheels
      const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
      const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.8,
        roughness: 0.4
      });

      // Front wheels
      const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      frontLeftWheel.position.set(0.6, 0.15, -0.5);
      frontLeftWheel.rotation.z = Math.PI / 2;
      shuttleGroup.add(frontLeftWheel);

      const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      frontRightWheel.position.set(0.6, 0.15, 0.5);
      frontRightWheel.rotation.z = Math.PI / 2;
      shuttleGroup.add(frontRightWheel);

      // Rear wheels
      const rearLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      rearLeftWheel.position.set(-0.6, 0.15, -0.5);
      rearLeftWheel.rotation.z = Math.PI / 2;
      shuttleGroup.add(rearLeftWheel);

      const rearRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      rearRightWheel.position.set(-0.6, 0.15, 0.5);
      rearRightWheel.rotation.z = Math.PI / 2;
      shuttleGroup.add(rearRightWheel);

      // Headlights
      const headlightGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.3
      });

      const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      leftHeadlight.position.set(1.0, 0.35, -0.25);
      shuttleGroup.add(leftHeadlight);

      const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      rightHeadlight.position.set(1.0, 0.35, 0.25);
      shuttleGroup.add(rightHeadlight);

      // Door handles
      const handleGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.15);
      const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.9,
        roughness: 0.2
      });

      const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
      leftHandle.position.set(0.51, 0.4, -0.45);
      shuttleGroup.add(leftHandle);

      const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
      rightHandle.position.set(0.51, 0.4, 0.45);
      shuttleGroup.add(rightHandle);

      // Roof rack
      const rackGeometry = new THREE.BoxGeometry(1.8, 0.05, 0.6);
      const rackMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.3
      });
      const rack = new THREE.Mesh(rackGeometry, rackMaterial);
      rack.position.y = 0.625;
      shuttleGroup.add(rack);

      return shuttleGroup;
    };

    const spawnDetailedClusters = () => {
      const nodes: ShuttleNode[] = [];
      // More vehicles in tighter clusters for city-like density
      const clusters = [
        { center: new THREE.Vector3(-12, 2, 0), count: 8 },
        { center: new THREE.Vector3(-8, -1, 1), count: 6 },
        { center: new THREE.Vector3(-10, 4, -2), count: 5 },
        { center: new THREE.Vector3(-14, -2, 1), count: 7 },
        { center: new THREE.Vector3(-6, 1, 2), count: 4 },
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
          
          // Color variations
          const hue = 0.03 + rand() * 0.02;
          const saturation = 0.8 + rand() * 0.2;
          const lightness = 0.4 + rand() * 0.2;
          const color = new THREE.Color().setHSL(hue, saturation, lightness);
          
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