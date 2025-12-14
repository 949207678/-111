import * as THREE from 'three';

export enum AppMode {
  TREE = 'TREE',
  SCATTERED = 'SCATTERED',
  FOCUSED = 'FOCUSED',
}

export interface TreeObjectData {
  id: string;
  type: 'ball' | 'gift' | 'photo' | 'candy' | 'light' | 'star';
  color: string; // Hex
  textureUrl?: string; // For photos
  positionTree: THREE.Vector3;
  positionScattered: THREE.Vector3;
  rotationTree: THREE.Euler;
  rotationScattered: THREE.Euler;
  scale: number;
}

export interface HandGestureState {
  isFist: boolean;
  isOpen: boolean;
  isPinching: boolean;
  handPosition: { x: number; y: number }; // Normalized -1 to 1
  pinchDistance: number;
}