import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeObjectData, AppMode } from '../types';
import { useTexture, Box, Sphere, Cylinder } from '@react-three/drei';

interface TreeElementProps {
  data: TreeObjectData;
  mode: AppMode;
  targetPhotoId?: string | null;
}

const MaterialGold = new THREE.MeshStandardMaterial({
  color: '#FFD700',
  metalness: 1,
  roughness: 0.15,
  emissive: '#553300',
  emissiveIntensity: 0.2
});

// Chinese Red - Ceramic/Glossy finish (Non-metallic)
const MaterialRed = new THREE.MeshStandardMaterial({
  color: '#DE2910', // Chinese Red
  metalness: 0.1,   // Reduced metalness for plastic/ceramic look
  roughness: 0.1,   // Low roughness for high gloss
  emissive: '#550000',
  emissiveIntensity: 0.1
});

const MaterialGreen = new THREE.MeshStandardMaterial({
  color: '#2F4F2F',
  metalness: 0.1,
  roughness: 0.8,
});

const MaterialWhite = new THREE.MeshStandardMaterial({
  color: '#F0F0F0',
  roughness: 0.2,
  metalness: 0.1
});

// Custom Material for the Star (Paper-like Cream/Gold)
const MaterialStar = new THREE.MeshStandardMaterial({
  color: '#FFFACD', // LemonChiffon
  roughness: 0.4,
  metalness: 0.6,
  emissive: '#FFD700',
  emissiveIntensity: 0.4,
  flatShading: true, // Key for the origami look
});

export const TreeElement: React.FC<TreeElementProps> = ({ data, mode, targetPhotoId }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = data.type === 'photo' && data.textureUrl ? useTexture(data.textureUrl) : null;
  const { camera, size } = useThree();
  
  // Random slight floating offset
  const floatOffset = useMemo(() => Math.random() * 100, []);
  // Random twinkle offset for lights
  const twinkleSpeed = useMemo(() => 2 + Math.random() * 3, []);
  const twinklePhase = useMemo(() => Math.random() * Math.PI * 2, []);

  // Generate Star Geometry (5-pointed Origami 3D Star)
  const starGeometry = useMemo(() => {
      if (data.type !== 'star') return null;

      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      
      const numPoints = 5;
      const outerRadius = 0.5;
      const innerRadius = 0.2; // Deep indent for distinct arms
      const depth = 0.15; // Thickness

      // Center Front and Back
      // We'll build face by face to ensure flat normals
      
      for (let i = 0; i < numPoints; i++) {
        const angle1 = (i / numPoints) * Math.PI * 2;
        const angle2 = ((i + 1) / numPoints) * Math.PI * 2;
        const angleMid = (angle1 + angle2) / 2;

        // Coordinates
        // Outer Tip
        const x1 = Math.cos(angle1) * outerRadius;
        const y1 = Math.sin(angle1) * outerRadius;
        
        // Inner Valley (between tips)
        const xInner = Math.cos(angleMid) * innerRadius;
        const yInner = Math.sin(angleMid) * innerRadius;

        // Next Outer Tip
        const x2 = Math.cos(angle2) * outerRadius;
        const y2 = Math.sin(angle2) * outerRadius;

        // Front Face (Ridge 1: Center -> Outer1 -> Inner)
        // Center Front is (0,0,depth)
        vertices.push(0, 0, depth); // Tip
        vertices.push(x1, y1, 0);   // Outer
        vertices.push(xInner, yInner, 0); // Inner

        // Front Face (Ridge 2: Center -> Inner -> Outer2) - Wait, this connects to the next triangle loop actually.
        // Let's do: Center -> Inner -> Outer (Current) ? No.
        // Standard loop: 
        // Tri 1: Center, Outer(i), Inner(i)  (Where Inner(i) is 'after' Outer(i))
        // Let's define Inner(i) as the valley between Outer(i) and Outer(i+1)
        
        const angleValley = ((i * 2 + 1) / (numPoints * 2)) * Math.PI * 2;
        const xVal = Math.cos(angleValley) * innerRadius;
        const yVal = Math.sin(angleValley) * innerRadius;

        // Triangle Left of arm: CenterFront, Outer(i), Valley(i-1) -- wrap around
        // Simpler: CenterFront, Outer(i), Valley(i)
        // CenterFront, Valley(i), Outer(i+1)

        // Front faces
        vertices.push(0, 0, depth);
        vertices.push(x1, y1, 0);
        vertices.push(xVal, yVal, 0); // Valley between i and i+1

        vertices.push(0, 0, depth);
        vertices.push(xVal, yVal, 0);
        vertices.push(x2, y2, 0);

        // Back faces (Mirror)
        vertices.push(0, 0, -depth);
        vertices.push(xVal, yVal, 0);
        vertices.push(x1, y1, 0);

        vertices.push(0, 0, -depth);
        vertices.push(x2, y2, 0);
        vertices.push(xVal, yVal, 0);
      }

      const float32Array = new Float32Array(vertices);
      geometry.setAttribute('position', new THREE.BufferAttribute(float32Array, 3));
      geometry.computeVertexNormals();
      return geometry;
  }, [data.type]);


  useFrame((state, delta) => {
    if (!meshRef.current) return;

    let targetPos = mode === AppMode.TREE ? data.positionTree : data.positionScattered;
    let targetRot = mode === AppMode.TREE ? data.rotationTree : data.rotationScattered;
    let targetScale = data.scale;
    let useQuaternion = false;
    let targetQuaternion = new THREE.Quaternion();

    // Handle Star Logic (No Rotation, just Position)
    if (data.type === 'star') {
        // Ensure position stays locked in center for Scattered
        if (mode === AppMode.SCATTERED) {
            targetPos = new THREE.Vector3(0, 0, 0);
        }
        // Force rotation to be flat (0,0,0) or whatever data.rotationTree is (which is 0)
        // We do NOT increment rotation.z here anymore.
    }

    // Handle Focused State
    if (mode === AppMode.FOCUSED && data.type === 'photo') {
        if (data.id === targetPhotoId) {
            const distFromCamera = 4;
            const worldTargetPos = new THREE.Vector3(0, 0, camera.position.z - distFromCamera);
            
            if (meshRef.current.parent) {
                const parentInv = meshRef.current.parent.matrixWorld.clone().invert();
                targetPos = worldTargetPos.applyMatrix4(parentInv);

                const parentWorldQuat = new THREE.Quaternion();
                meshRef.current.parent.getWorldQuaternion(parentWorldQuat);
                targetQuaternion.copy(parentWorldQuat).invert();
                
                useQuaternion = true;
            }
            
            // Adaptive Scaling based on Viewport and FOV
            // Visible height at distance 'distFromCamera'
            const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
            const visibleHeight = 2 * Math.tan(vFov / 2) * distFromCamera;
            const visibleWidth = visibleHeight * (size.width / size.height);
            
            // Scale to fit 85% of the smaller dimension
            targetScale = Math.min(visibleHeight, visibleWidth) * 0.85;

        } else {
             targetPos = data.positionScattered.clone().multiplyScalar(1.5);
             targetScale = data.scale * 0.8; 
        }
    }

    // Smooth transition
    const isFocusedItem = mode === AppMode.FOCUSED && data.id === targetPhotoId;
    const lerpSpeed = isFocusedItem ? 0.12 : 0.05;
    
    meshRef.current.position.lerp(targetPos, lerpSpeed);
    
    if (useQuaternion) {
         meshRef.current.quaternion.slerp(targetQuaternion, lerpSpeed);
    } else {
        // For the star, targetRot is (0,0,0) so it will smoothly return to flat if it was somehow moved.
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRot.x, lerpSpeed);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot.y, lerpSpeed);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRot.z, lerpSpeed);
    }

    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), lerpSpeed);

    // Add idle float animation when Scattered (but not if it's the focused target OR the Star)
    if ((mode === AppMode.SCATTERED || mode === AppMode.FOCUSED) && data.id !== targetPhotoId && data.type !== 'star') {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + floatOffset) * 0.005;
      meshRef.current.rotation.z += 0.002;
    }

    // Twinkle logic for Lights
    if (data.type === 'light') {
        const material = meshRef.current.material as THREE.MeshStandardMaterial;
        if (material) {
            const t = state.clock.elapsedTime;
            const intensity = 1.5 + (Math.sin(t * twinkleSpeed + twinklePhase) * 0.5 + 0.5) * 3.5;
            material.emissiveIntensity = intensity;
        }
    }
  });

  const getMaterial = () => {
    if (data.type === 'star') return MaterialStar;
    if (data.type === 'photo') return undefined; // Handled in mesh
    if (data.color === '#FFD700') return MaterialGold;
    if (data.color === '#DE2910') return MaterialRed; // Chinese Red Check
    if (data.color === '#2F4F2F') return MaterialGreen;
    return MaterialWhite;
  };

  if (data.type === 'star' && starGeometry) {
      return (
          <mesh ref={meshRef} geometry={starGeometry} material={MaterialStar}>
              {/* Optional: Add a subtle point light attached to the star for glow */}
              <pointLight distance={5} intensity={1} color="#FFFACD" decay={2} />
          </mesh>
      );
  }

  if (data.type === 'photo' && texture) {
    return (
      <mesh ref={meshRef}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent />
        {/* Frame */}
        <mesh position={[0,0,-0.02]}>
             <boxGeometry args={[1.1, 1.1, 0.02]} />
             <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.2} />
        </mesh>
      </mesh>
    );
  }

  if (data.type === 'gift') {
    return (
      <Box ref={meshRef} args={[1, 1, 1]} material={getMaterial()}>
        {/* Ribbon - simplified as another box */}
        <mesh position={[0, 0.51, 0]}>
             <boxGeometry args={[0.2, 0.1, 1.02]} />
             <meshStandardMaterial color="#FFD700" metalness={0.8} />
        </mesh>
         <mesh position={[0, 0.51, 0]} rotation={[0, Math.PI/2, 0]}>
             <boxGeometry args={[0.2, 0.1, 1.02]} />
             <meshStandardMaterial color="#FFD700" metalness={0.8} />
        </mesh>
      </Box>
    );
  }

  // Handle Lights specifically
  if (data.type === 'light') {
      return (
          <Sphere ref={meshRef} args={[1, 16, 16]}>
              <meshStandardMaterial 
                  color="#FFD700" 
                  emissive="#FFA500"
                  emissiveIntensity={2} 
                  toneMapped={false}
              />
          </Sphere>
      )
  }

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]} material={getMaterial()} />
  );
};