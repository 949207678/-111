import * as THREE from 'three';
import { TreeObjectData } from '../types';
import { v4 as uuidv4 } from 'uuid';

const COLORS = {
  GOLD: '#FFD700',
  MATTE_GREEN: '#2F4F2F',
  RED: '#DE2910', // Chinese Red
  WHITE: '#F0F0F0',
  LIGHT_WARM: '#ffddaa',
  STAR_CREAM: '#FFFACD' // LemonChiffon/Cream for the star
};

const TREE_HEIGHT = 12;
const TREE_RADIUS_BASE = 4.5;

// Generate positions for a cone spiral
export const generateTreeData = (photoUrls: string[]): TreeObjectData[] => {
  const objects: TreeObjectData[] = [];
  // Increased count to accommodate lights
  const baseObjectCount = 220; 
  
  // Helper to map index to tree position (Cone Spiral)
  const getTreePos = (i: number, total: number) => {
    const y = -TREE_HEIGHT / 2 + (i / total) * TREE_HEIGHT;
    const radius = TREE_RADIUS_BASE * (1 - (y + TREE_HEIGHT / 2) / TREE_HEIGHT);
    const angle = i * 0.5; // Spiral tightness
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return new THREE.Vector3(x, y, z);
  };

  // Helper for scattered position (Random Sphere)
  const getScatteredPos = () => {
    const vec = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 10 // Flatter depth
    );
    return vec;
  };

  // 0. Add The Star (Top of tree, Center of scattered)
  objects.push({
    id: uuidv4(),
    type: 'star',
    color: COLORS.STAR_CREAM,
    // Top of tree (slightly higher than max height)
    positionTree: new THREE.Vector3(0, TREE_HEIGHT / 2 + 0.5, 0),
    // Center of universe when scattered (Immovable anchor)
    positionScattered: new THREE.Vector3(0, 0, 0),
    rotationTree: new THREE.Euler(0, 0, 0),
    // Standard upright rotation
    rotationScattered: new THREE.Euler(0, 0, 0),
    scale: 2.5 // Larger than ornaments
  });

  // 1. Add Photos first (evenly distributed)
  photoUrls.forEach((url, index) => {
    // Distribute photos specifically along the spiral
    const step = Math.floor(baseObjectCount / (photoUrls.length + 1));
    const treeIdx = (index + 1) * step;
    
    // Calculate accurate position and facing for photos
    const basePos = getTreePos(treeIdx, baseObjectCount);
    
    // Determine outward direction from the central axis (y-axis)
    // We only care about X and Z for the radial direction
    const radialDir = new THREE.Vector3(basePos.x, 0, basePos.z).normalize();
    
    // Push the photo slightly outward from the branch tip so it "hangs" on the surface
    // Using 0.8 offset ensures it clears the needles/branches
    const surfacePos = basePos.clone().add(radialDir.multiplyScalar(0.8));

    // Calculate rotation to face outwards
    // Math.atan2(x, z) gives the angle from the Z-axis, which aligns with standard Euler Y rotation
    const facingAngle = Math.atan2(radialDir.x, radialDir.z);

    objects.push({
      id: uuidv4(),
      type: 'photo',
      color: COLORS.WHITE,
      textureUrl: url,
      positionTree: surfacePos,
      positionScattered: getScatteredPos(),
      // Rotate Y to face outward. 
      rotationTree: new THREE.Euler(0, facingAngle, 0),
      rotationScattered: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
      scale: 1.5
    });
  });

  // 2. Add Ornaments, Gifts, and Lights
  for (let i = 0; i < baseObjectCount; i++) {
    const r = Math.random();
    let type: TreeObjectData['type'] = 'ball';
    let color = COLORS.GOLD;
    let scale = 0.3 + Math.random() * 0.3;

    if (r > 0.85) {
      type = 'gift';
      color = COLORS.RED;
      scale = 0.5;
    } else if (r > 0.75) {
      // Formerly candy, now just white/red balls
      type = 'candy'; 
      color = COLORS.WHITE;
      scale = 0.4;
    } else if (r > 0.55) {
       // Lights - 20% chance
       type = 'light';
       color = COLORS.LIGHT_WARM;
       scale = 0.15; // Small bulb
    } else {
      // Ball variants - ONLY Gold and Red as requested (removed Green)
      color = Math.random() > 0.5 ? COLORS.RED : COLORS.GOLD;
    }

    const treePos = getTreePos(i, baseObjectCount);
    // Add some noise to tree pos so it's not perfect line
    treePos.x += (Math.random() - 0.5) * 0.5;
    treePos.z += (Math.random() - 0.5) * 0.5;
    treePos.y += (Math.random() - 0.5) * 0.5;

    // If it's a light, pull it slightly deeper into the tree so it sits on branches
    if (type === 'light') {
        treePos.multiplyScalar(0.95);
    }

    objects.push({
      id: uuidv4(),
      type,
      color,
      positionTree: treePos,
      positionScattered: getScatteredPos(),
      rotationTree: new THREE.Euler(Math.random(), Math.random(), Math.random()),
      rotationScattered: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
      scale
    });
  }

  return objects;
};