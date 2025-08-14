import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ShuttleNode {
  id: number;
  position: THREE.Vector3;
  mesh?: THREE.Mesh;
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

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    mountRef.current.appendChild(renderer.domElement);

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
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create detailed shuttle/car geometry
    const createShuttleGeometry = () => {
      const group = new THREE.Group();
      
      // Main body (car chassis)
      const bodyGeometry = new THREE.BoxGeometry(1.2, 0.4, 0.6);
      const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff6b35,
        shininess: 150,
        emissive: 0xff3b2e,
        emissiveIntensity: 0.05,
        metalness: 0.3
      });
      const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
      group.add(bodyMesh);

      // Cabin/passenger area
      const cabinGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.5);
      const cabinMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff4520,
        shininess: 120,
        emissive: 0xff6b35,
        emissiveIntensity: 0.03
      });
      const cabinMesh = new THREE.Mesh(cabinGeometry, cabinMaterial);
      cabinMesh.position.y = 0.25;
      group.add(cabinMesh);

      // Front grille
      const grilleGeometry = new THREE.BoxGeometry(0.1, 0.25, 0.4);
      const grilleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        shininess: 80
      });
      const grilleMesh = new THREE.Mesh(grilleGeometry, grilleMaterial);
      grilleMesh.position.x = 0.65;
      group.add(grilleMesh);

      // Wheels
      const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
      const wheelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222,
        shininess: 50
      });
      
      // Create 4 wheels
      const wheelPositions = [
        [-0.4, -0.25, 0.35],
        [-0.4, -0.25, -0.35],
        [0.4, -0.25, 0.35],
        [0.4, -0.25, -0.35]
      ];
      
      wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.rotation.z = Math.PI / 2;
        group.add(wheel);
      });

      // Windows
      const windowGeometry = new THREE.PlaneGeometry(0.6, 0.2);
      const windowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.7,
        emissive: 0x4169e1,
        emissiveIntensity: 0.1
      });
      
      // Front and back windows
      const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
      frontWindow.position.set(0.4, 0.3, 0);
      frontWindow.rotation.y = Math.PI / 2;
      group.add(frontWindow);

      const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
      backWindow.position.set(-0.4, 0.3, 0);
      backWindow.rotation.y = -Math.PI / 2;
      group.add(backWindow);

      // Side windows
      const sideWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
      sideWindow1.position.set(0, 0.3, 0.31);
      group.add(sideWindow1);

      const sideWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
      sideWindow2.position.set(0, 0.3, -0.31);
      sideWindow2.rotation.y = Math.PI;
      group.add(sideWindow2);

      // Headlights
      const headlightGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const headlightMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffaa,
        emissive: 0xffff88,
        emissiveIntensity: 0.3
      });
      
      const headlight1 = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight1.position.set(0.6, 0, 0.2);
      group.add(headlight1);
      
      const headlight2 = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight2.position.set(0.6, 0, -0.2);
      group.add(headlight2);

      return group;
    };

    // Initialize more nodes with clustering
    const nodeCount = 25;
    const nodes: ShuttleNode[] = [];
    
    // Create clustered formations
    const clusters = [
      { center: new THREE.Vector3(-4, 2, 0), count: 8 },
      { center: new THREE.Vector3(4, -1, 1), count: 7 },
      { center: new THREE.Vector3(0, 3, -2), count: 6 },
      { center: new THREE.Vector3(-2, -3, 1), count: 4 }
    ];

    let nodeId = 0;
    clusters.forEach(cluster => {
      for (let i = 0; i < cluster.count; i++) {
        const angle = (i / cluster.count) * Math.PI * 2;
        const radius = 0.5 + Math.random() * 1.5;
        const x = cluster.center.x + Math.cos(angle) * radius;
        const y = cluster.center.y + Math.sin(angle) * radius;
        const z = cluster.center.z + (Math.random() - 0.5) * 1.5;

        const position = new THREE.Vector3(x, y, z);
        const shuttle = createShuttleGeometry();
        shuttle.position.copy(position);
        
        // Random realistic orientations
        shuttle.rotation.x = (Math.random() - 0.5) * 0.3;
        shuttle.rotation.y = Math.random() * Math.PI * 2;
        shuttle.rotation.z = (Math.random() - 0.5) * 0.2;
        
        // Slight random scale for variety
        const scale = 0.8 + Math.random() * 0.4;
        shuttle.scale.setScalar(scale);
        
        scene.add(shuttle);

        nodes.push({
          id: nodeId++,
          position: position.clone(),
          mesh: shuttle as THREE.Mesh,
          targetPosition: position.clone(),
          isDragging: false
        });
      }
    });

    shuttleNodesRef.current = nodes;

    // Create more connections for clustered appearance
    const connections: Connection[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = nodes[i].position.distanceTo(nodes[j].position);
        if (distance < 3.0 || Math.random() > 0.85) { // Connect nearby nodes or random long connections
          const points = [nodes[i].position, nodes[j].position];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ 
            color: 0xff6b35,
            transparent: true,
            opacity: 0.4,
            linewidth: 1.5
          });
          const line = new THREE.Line(geometry, material);
          scene.add(line);

          connections.push({
            from: i,
            to: j,
            line
          });
        }
      }
    }

    connectionsRef.current = connections;

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
        shuttleNodesRef.current.map(node => node.mesh!).filter(Boolean)
      );

      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const clickedNode = shuttleNodesRef.current.find(node => 
          node.mesh === clickedObject || node.mesh?.children.includes(clickedObject)
        );
        
        if (clickedNode) {
          isDraggingRef.current = true;
          selectedNodeRef.current = clickedNode;
          clickedNode.isDragging = true;
          
          // Add glow effect
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
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return <div ref={mountRef} className="scene-container" />;
};