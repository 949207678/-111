import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppMode, TreeObjectData, HandGestureState } from '../types';
import { generateTreeData } from '../utils/math';
import { TreeElement } from './TreeElement';

interface SceneContentProps {
  mode: AppMode;
  photos: string[];
  handState: HandGestureState;
}

// Automatically adjusts camera distance to fit the tree in the viewport
const AdaptiveCamera = () => {
  const { camera, size } = useThree();
  
  useEffect(() => {
    // Define the bounding box of the tree we want to keep visible
    // Tree height is ~12, centered at 0 (y: -6 to 6). Star is at ~6.5.
    // Width is radius 4.5 * 2 = 9.
    // We add padding to ensure it doesn't touch the edges.
    const TARGET_HEIGHT = 18; // 12 + extra vertical space
    const TARGET_WIDTH = 14;  // 9 + extra horizontal space

    const aspect = size.width / size.height;
    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);

    // Calculate distance required to fit the height
    const distVertical = TARGET_HEIGHT / (2 * Math.tan(fovRad / 2));

    // Calculate distance required to fit the width
    // visibleWidth = 2 * dist * tan(fov/2) * aspect
    const distHorizontal = TARGET_WIDTH / (2 * Math.tan(fovRad / 2) * aspect);

    // Choose the larger distance to satisfy both constraints
    // Clamp to a minimum of 20 to preserve the look
    const finalDist = Math.max(distVertical, distHorizontal, 20);

    // Smoothly update camera position
    camera.position.z = finalDist;
    camera.updateProjectionMatrix();
    
  }, [size, camera]);

  return null;
};

const SceneContent: React.FC<SceneContentProps> = ({ mode, photos, handState }) => {
  const [objects, setObjects] = useState<TreeObjectData[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  
  // State to track which photos have been viewed to avoid repetition
  const [viewedPhotoIds, setViewedPhotoIds] = useState<Set<string>>(new Set());

  // Find the photo closest to the "front" for focusing
  const [targetPhotoId, setTargetPhotoId] = useState<string | null>(null);

  useEffect(() => {
    const data = generateTreeData(photos);
    setObjects(data);
    // Reset viewed history when photos change (new objects = new IDs)
    setViewedPhotoIds(new Set());
  }, [photos]);

  useEffect(() => {
    if (mode === AppMode.FOCUSED) {
        // If we don't already have a target, pick one
        if (!targetPhotoId) {
            const photoObjs = objects.filter(o => o.type === 'photo');
            if (photoObjs.length > 0) {
                // Filter out photos that have already been viewed
                let candidates = photoObjs.filter(p => !viewedPhotoIds.has(p.id));
                let shouldResetHistory = false;

                // If all photos have been viewed, reset the pool
                if (candidates.length === 0) {
                    candidates = photoObjs;
                    shouldResetHistory = true;
                }

                // Select a random photo from the candidates
                const randomPhoto = candidates[Math.floor(Math.random() * candidates.length)];
                
                setTargetPhotoId(randomPhoto.id);
                
                // Update the history
                setViewedPhotoIds(prev => {
                    const next = shouldResetHistory ? new Set<string>() : new Set(prev);
                    next.add(randomPhoto.id);
                    return next;
                });
            }
        }
    } else {
        if (targetPhotoId) {
            setTargetPhotoId(null);
        }
    }
  }, [mode, objects, targetPhotoId, viewedPhotoIds]);

  useFrame((state) => {
    if (groupRef.current) {
        // Rotate the entire group based on hand movement if Scattered
        if (mode === AppMode.SCATTERED) {
             // High sensitivity for "dragging" feel
             const SENSITIVITY_X = 5.0; // Horizontal rotation speed
             const SENSITIVITY_Y = 3.0; // Vertical tilt speed
             
             // Map normalized hand (-1 to 1) to rotation radians
             const targetRotY = handState.handPosition.x * SENSITIVITY_X;
             const targetRotX = -handState.handPosition.y * SENSITIVITY_Y;
             
             // Fast Lerp (0.1) for responsive, low-latency follow
             groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.1);
             groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.1);
        } else if (mode === AppMode.TREE) {
             // Slowly rotate tree in idle (Tree mode only)
             groupRef.current.rotation.y += 0.002;
             // Reset X tilt smoothly
             groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
        }
        // In FOCUSED mode, we stop rotating the group so the user can see the photo clearly.
    }
  });

  return (
    <>
      <AdaptiveCamera />
      
      <group ref={groupRef}>
        {objects.map((obj) => (
          <TreeElement 
            key={obj.id} 
            data={obj} 
            mode={mode} 
            targetPhotoId={targetPhotoId}
          />
        ))}
      </group>
      
      {/* Dynamic Lights */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
      <spotLight 
        position={[0, 20, 0]} 
        angle={0.3} 
        penumbra={1} 
        intensity={2} 
        color="#ffaa00" 
        castShadow 
      />
      <pointLight position={[-10, -5, -10]} intensity={0.5} color="#8B0000" />

      {/* Atmospheric Particles */}
      <Sparkles count={200} scale={20} size={2} speed={0.4} opacity={0.5} color="#FFD700" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </>
  );
};

export const Scene3D: React.FC<SceneContentProps> = (props) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 25], fov: 50 }}
      gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#050a05']} />
      <fog attach="fog" args={['#050a05', 15, 45]} />
      
      <Environment preset="city" />
      
      <SceneContent {...props} />

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.4} />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};