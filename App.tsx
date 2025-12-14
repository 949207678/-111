import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Scene3D } from './components/Scene3D';
import { HandTracker } from './components/HandTracker';
import { UIOverlay } from './components/UIOverlay';
import { AppMode, HandGestureState } from './types';

// Default placeholder images
const DEFAULT_PHOTOS = [
  'https://picsum.photos/400/400?random=1',
  'https://picsum.photos/400/400?random=2',
  'https://picsum.photos/400/400?random=3',
];

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [photos, setPhotos] = useState<string[]>(DEFAULT_PHOTOS);
  const [gestureStatus, setGestureStatus] = useState<string>("Waiting for camera...");
  
  // Audio State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Keep track of latest hand state to pass to 3D scene for rotation
  const [currentHandState, setCurrentHandState] = useState<HandGestureState>({
      isFist: false,
      isOpen: false,
      isPinching: false,
      handPosition: { x: 0, y: 0 },
      pinchDistance: 1
  });

  const toggleMusic = () => {
      if (!audioRef.current) return;
      if (isMusicPlaying) {
          audioRef.current.pause();
      } else {
          audioRef.current.play().catch(e => console.error("Audio play failed", e));
      }
      setIsMusicPlaying(!isMusicPlaying);
  };

  // Attempt auto-play on load (might be blocked by browser)
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = 0.4;
        // Use a user interaction requirement check logic if needed, but here we just try
        audioRef.current.play()
            .then(() => setIsMusicPlaying(true))
            .catch((e) => {
                console.log("Auto-play blocked or failed:", e);
                setIsMusicPlaying(false);
            });
    }
  }, []);

  // Use functional updates to avoid dependency on 'mode' which triggers HandTracker reload
  const handleGestureUpdate = useCallback((state: HandGestureState) => {
    setCurrentHandState(state);

    setMode(prevMode => {
        // Gesture State Machine
        if (state.isFist) {
            setGestureStatus("Gesture: Fist (Assembling)");
            return AppMode.TREE;
        } else if (state.isPinching) {
            // Pinch overrides Open. Only allow pinch if we are somewhat scattered or already focused
            if (prevMode !== AppMode.TREE) {
                setGestureStatus("Gesture: Pinch (Focusing)");
                return AppMode.FOCUSED;
            }
            return prevMode;
        } else if (state.isOpen) {
            setGestureStatus("Gesture: Open (Move to Rotate)");
            return AppMode.SCATTERED;
        } else {
            setGestureStatus("Detecting...");
            return prevMode; // Stay in current mode
        }
    });
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newUrls = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setPhotos(prev => [...prev, ...newUrls]);
    }
  };

  const handleClearPhotos = () => {
    setPhotos([]);
  };

  return (
    <div className="w-full h-screen bg-[#050a05] relative overflow-hidden">
      {/* Background Music - Using Archive.org stable link for Jingle Bells */}
      <audio 
        ref={audioRef} 
        src="https://ia800305.us.archive.org/30/items/JingleBells_745/JingleBells.mp3" 
        loop 
        crossOrigin="anonymous"
      />

      {/* 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        <Scene3D 
            mode={mode} 
            photos={photos} 
            handState={currentHandState} 
        />
      </div>

      {/* UI & Overlay */}
      <UIOverlay 
        mode={mode} 
        onUpload={handlePhotoUpload}
        onClear={handleClearPhotos}
        gestureStatus={gestureStatus}
        isMusicPlaying={isMusicPlaying}
        onToggleMusic={toggleMusic}
      />

      {/* Logic Components */}
      <HandTracker onGestureUpdate={handleGestureUpdate} />
    </div>
  );
};

export default App;