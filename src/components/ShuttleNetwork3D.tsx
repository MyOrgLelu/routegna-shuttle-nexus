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

  // Load high-fidelity OBJ model and then spawn clusters from duplicates
  const loader = new OBJLoader();

    const spawnFallbackClusters = () => {
      // simple fallback: boxes with similar spacing so UI still shows clusters
      const nodes: ShuttleNode[] = [];
      // Smaller number of vehicles for clarity; larger size
      const clusters = [
        { center: new THREE.Vector3(-8, 2, 0), count: 3 },
        { center: new THREE.Vector3(-4, -1, 1), count: 2 },
        { center: new THREE.Vector3(-6, 3, -2), count: 2 },
        { center: new THREE.Vector3(-10, -3, 1), count: 3 },
      ];
      const material = new THREE.MeshStandardMaterial({ color: 0xff6b35, metalness: 0.6, roughness: 0.25 });
      let nodeId = 0;
      clusters.forEach((cluster) => {
        for (let i = 0; i < cluster.count; i++) {
          const angle = (i / cluster.count) * Math.PI * 2;
          const radius = 1.2 + rand() * 2.0;
          const x = cluster.center.x + Math.cos(angle) * radius + (rand() - 0.5) * 0.6;
          const y = cluster.center.y + Math.sin(angle) * radius + (rand() - 0.5) * 0.6;
          const z = cluster.center.z + (rand() - 0.5) * 1.6;
          const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.7), material.clone());
          box.position.set(x, y, z);
          box.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.1);
          const s = 1.6 + rand() * 0.6; // increase fallback box size
          box.scale.setScalar(s);
          scene.add(box);
          nodes.push({ id: nodeId++, position: new THREE.Vector3(x, y, z), mesh: box, targetPosition: new THREE.Vector3(x, y, z), isDragging: false });
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

    loader.load('/uploads_files_3187834_Panther+3d.obj', (base) => {
      // Normalize and re-materialize the OBJ root
      try {
        // First: collect meshes and remove very large/background pieces that some OBJ exports include
        const meshes: THREE.Mesh[] = [];
        base.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
        });

        if (meshes.length > 0) {
          // Compute size of each mesh and average to detect outliers
          const dims = meshes.map((m) => {
            const b = new THREE.Box3().setFromObject(m);
            const s = b.getSize(new THREE.Vector3());
            return Math.max(s.x || 0, s.y || 0, s.z || 0);
          });
          const avg = dims.reduce((a, b) => a + b, 0) / dims.length;
          const maxAllowed = Math.max(avg * 4, 5); // keep reasonably sized parts; anything much larger is probably background

          meshes.forEach((m, i) => {
            if (dims[i] > maxAllowed) {
              // Remove oversized/background mesh
              if (m.parent) m.parent.remove(m);
            }
          });
        }

        // Re-assign branded material and shadow params for remaining meshes
        base.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if ((mesh as THREE.Mesh).isMesh) {
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            // Use a lighter material for better performance
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0xff6b35,
              metalness: 0.6,
              roughness: 0.35,
            });
          }
        });

        // Compute initial overall bounds so we can detect and remove flat/ground pieces
        const initialBox = new THREE.Box3().setFromObject(base);
        const initialSize = new THREE.Vector3();
        initialBox.getSize(initialSize);

        // Heuristic: remove meshes that are very flat and lie at or below the model's bottom
        const meshesToCheck: THREE.Mesh[] = [];
        base.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) meshesToCheck.push(obj as THREE.Mesh);
        });

        meshesToCheck.forEach((m) => {
          try {
            const mb = new THREE.Box3().setFromObject(m);
            const ms = mb.getSize(new THREE.Vector3());
            const thickness = ms.y;

            // Basic area metric on X/Z plane
            const areaXZ = (ms.x || 0) * (ms.z || 0);
            const modelArea = (initialSize.x || 1) * (initialSize.z || 1);

            // Geometry-based flatness test: check vertex Y variance when available
            let isFlatByVertices = false;
            const geo = (m.geometry as THREE.BufferGeometry) || null;
            if (geo && geo.attributes && geo.attributes.position) {
              const pos = geo.attributes.position.array as Float32Array;
              let sum = 0;
              let sumSq = 0;
              let count = 0;
              let minY = Infinity;
              let maxY = -Infinity;
              for (let i = 1; i < pos.length; i += 3) {
                const y = pos[i];
                sum += y;
                sumSq += y * y;
                count++;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
              if (count > 0) {
                const mean = sum / count;
                const variance = sumSq / count - mean * mean;
                const yRange = Math.abs(maxY - minY) || 0;
                // If vertex variance is extremely small relative to the model height, it's flat
                if (yRange < Math.max(initialSize.y * 0.06, 0.01) || variance < 1e-5) {
                  isFlatByVertices = true;
                }
              }
            }

            // If mesh is very thin and covers a large XZ area, or geometry indicates flatness,
            // and it sits near the model bottom, consider it a ground/plate and remove it.
            if (
              (thickness > 0 && thickness < Math.max(initialSize.y * 0.12, 0.02) && areaXZ > modelArea * 0.25) ||
              (isFlatByVertices && areaXZ > modelArea * 0.15)
            ) {
              if (mb.max.y <= initialBox.min.y + initialSize.y * 0.25) {
                if (m.parent) m.parent.remove(m);
              }
            }
          } catch (err) {
            // If any test fails, don't block the rest — keep mesh and continue
            console.warn('Error while testing mesh for flatness:', err);
          }
        });

        // Recompute final bounding box after removals
        const box = new THREE.Box3().setFromObject(base);
        const size = new THREE.Vector3();
        box.getSize(size);
        const target = 2.4; // normalized larger length for a more visible car
        const s = target / Math.max(size.x || 1, size.y || 1, size.z || 1);
        base.scale.setScalar(s);
        const center = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
        base.position.sub(center);

        // Build clusters using clones
        const nodes: ShuttleNode[] = [];
        // Fewer vehicles (cleaner), but larger scale per vehicle
        const clusters = [
          { center: new THREE.Vector3(-8, 2, 0), count: 3 },
          { center: new THREE.Vector3(-4, -1, 1), count: 2 },
          { center: new THREE.Vector3(-6, 3, -2), count: 2 },
          { center: new THREE.Vector3(-10, -3, 1), count: 3 },
        ];
        let nodeId = 0;
        clusters.forEach((cluster) => {
          for (let i = 0; i < cluster.count; i++) {
            const angle = (i / cluster.count) * Math.PI * 2;
            const radius = 1.2 + rand() * 2.0;
            const x = cluster.center.x + Math.cos(angle) * radius + (rand() - 0.5) * 0.6;
            const y = cluster.center.y + Math.sin(angle) * radius + (rand() - 0.5) * 0.6;
            const z = cluster.center.z + (rand() - 0.5) * 1.6;

            const r = rand();
            const kind: 'car' | 'van' | 'bus' = r < 0.35 ? 'car' : r < 0.75 ? 'van' : 'bus';
            const group = new THREE.Group();
            const clone = base.clone(true);

            // Color/material variations: gently lerp from brand color
            clone.traverse((obj) => {
              const m = obj as THREE.Mesh;
              if ((m as THREE.Mesh).isMesh) {
                // Replace material with a brand-tinted physical material to ensure
                // consistent shading across OBJ imports and avoid complex material merges
                const baseColor = new THREE.Color(0xff6b35);
                const tint = new THREE.Color().setHSL(0.03 + rand() * 0.02, 1.0, 0.55);
                const color = baseColor.lerp(tint, 0.25);
                m.material = new THREE.MeshStandardMaterial({
                  color,
                  metalness: 0.6,
                  roughness: 0.35,
                });
              }
            });

            group.add(clone);
            // Scale profile by type, and make everything a bit larger for visibility
            const sizeBoost = 1.6;
            if (kind === 'car') group.scale.set(0.8 * sizeBoost, 0.75 * sizeBoost, 0.9 * sizeBoost);
            else if (kind === 'bus') group.scale.set(1.35 * sizeBoost, 1.1 * sizeBoost, 1.15 * sizeBoost);

            group.position.set(x, y, z);
            group.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.1);
            scene.add(group);

            nodes.push({
              id: nodeId++,
              position: new THREE.Vector3(x, y, z),
              mesh: group,
              targetPosition: new THREE.Vector3(x, y, z),
              isDragging: false,
            });
          }
        });

        shuttleNodesRef.current = nodes;

        // Connections
        const connections: Connection[] = [];
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const distance = nodes[i].position.distanceTo(nodes[j].position);
            if (distance < 3.0 || rand() > 0.86) {
              const points = [nodes[i].position, nodes[j].position];
              const geometry = new THREE.BufferGeometry().setFromPoints(points);
              const material = new THREE.LineBasicMaterial({
                color: 0xff6b35,
                transparent: true,
                opacity: 0.35,
              });
              const line = new THREE.Line(geometry, material);
              scene.add(line);
              connections.push({ from: i, to: j, line });
            }
          }
        }
        connectionsRef.current = connections;
      } catch (e) {
        console.warn('Error processing OBJ, falling back to boxes', e);
        try {
          spawnFallbackClusters();
        } catch (err) {
          console.error('Fallback cluster spawn failed', err);
        }
      }
    }, undefined, (err) => {
      console.warn('Failed to load OBJ /uploads_files_3187834_Panther+3d.obj, using fallback boxes for vehicles.', err);
      try {
        spawnFallbackClusters();
      } catch (e) {
        console.error('Fallback cluster spawn failed', e);
      }
    });

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