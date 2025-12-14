import React, { useEffect, useRef } from 'react';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';
import { HandGestureState } from '../types';

// Define a minimal interface for Results since we can't import the type from the shim
interface Results {
  multiHandLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
  image: any;
}

interface HandTrackerProps {
  onGestureUpdate: (state: HandGestureState) => void;
}

export const HandTracker: React.FC<HandTrackerProps> = ({ onGestureUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Store previous smoothed position for interpolation
  const prevPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((results: any) => {
      const res = results as Results;
      
      if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
        const landmarks = res.multiHandLandmarks[0];

        // --- 1. Position Smoothing (Exponential Moving Average) ---
        // Wrist is 0, Middle finger MCP is 9
        const palmX = 1 - landmarks[9].x; // Flip X
        const palmY = landmarks[9].y;
        
        // Normalize to -1 to 1 range
        const targetX = (palmX - 0.5) * 2;
        const targetY = (palmY - 0.5) * 2;

        // Increased from 0.15 to 0.3 for higher sensitivity/responsiveness
        const SMOOTH_FACTOR = 0.3; 
        const smoothX = prevPos.current.x + (targetX - prevPos.current.x) * SMOOTH_FACTOR;
        const smoothY = prevPos.current.y + (targetY - prevPos.current.y) * SMOOTH_FACTOR;
        
        prevPos.current = { x: smoothX, y: smoothY };

        // --- 2. Advanced Gesture Logic ---
        
        // Helper: Euclidean distance between two landmarks
        const dist = (idx1: number, idx2: number) => {
          const p1 = landmarks[idx1];
          const p2 = landmarks[idx2];
          return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        };

        // Helper: Check if a finger is curled
        const isCurled = (tipIdx: number, pipIdx: number) => {
          return dist(tipIdx, 0) < dist(pipIdx, 0);
        };

        const indexCurled = isCurled(8, 6);
        const middleCurled = isCurled(12, 10);
        const ringCurled = isCurled(16, 14);
        const pinkyCurled = isCurled(20, 18);

        const curledCount = [indexCurled, middleCurled, ringCurled, pinkyCurled].filter(Boolean).length;

        // Pinch Detection: Distance between Thumb(4) and Index(8)
        const pinchDist = dist(4, 8);
        const isPinchGeo = pinchDist < 0.06;

        // --- State Classification ---
        
        let isFist = false;
        let isOpen = false;
        let isPinching = false;

        // Priority Logic:
        // 1. PINCH: Requires Thumb+Index proximity AND other fingers NOT all curled (to distinguish from Fist).
        if (isPinchGeo && curledCount < 3) {
            isPinching = true;
        } 
        // 2. FIST: Requires significant curling (3+ fingers). 
        else if (curledCount >= 3) {
            isFist = true;
        }
        // 3. OPEN: Very few fingers curled.
        else if (curledCount <= 1) {
            isOpen = true;
        }

        onGestureUpdate({
          isFist,
          isOpen,
          isPinching,
          pinchDistance: pinchDist,
          handPosition: { x: smoothX, y: smoothY }
        });

      } else {
        // No hand detected
        onGestureUpdate({
          isFist: false,
          isOpen: false,
          isPinching: false,
          pinchDistance: 1,
          handPosition: { x: 0, y: 0 }
        });
      }
    });

    const camera = new cam.Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
        camera.stop();
        hands.close();
    };
  }, [onGestureUpdate]);

  return (
    // Hidden container: We still need the video element in the DOM for MediaPipe to work,
    // but we hide it visually from the user.
    <div className="fixed top-0 left-0 w-px h-px opacity-0 overflow-hidden pointer-events-none">
      <video ref={videoRef} className="w-full h-full object-cover transform -scale-x-100" />
    </div>
  );
};