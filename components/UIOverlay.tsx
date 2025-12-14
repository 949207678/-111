import React from 'react';
import { AppMode } from '../types';
import { Upload, Trash2, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';

interface UIOverlayProps {
  mode: AppMode;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  gestureStatus: string;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
  mode, 
  onUpload, 
  onClear, 
  gestureStatus,
  isMusicPlaying,
  onToggleMusic
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 md:p-12">
      {/* Header - Centered Title */}
      <header className="w-full flex justify-between items-start pointer-events-auto">
        <div className="flex-1"></div> {/* Spacer Left */}
        
        <div className="text-center text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]">
          <h1 className="text-7xl md:text-9xl font-['Pinyon_Script'] tracking-wide leading-tight py-4">
            Merry Christmas
          </h1>
        </div>

        <div className="flex-1 flex justify-end">
            <button 
                onClick={onToggleMusic}
                className="group p-3 rounded-full bg-[#0a1f0a]/50 backdrop-blur-md border border-[#FFD700]/20 hover:bg-[#FFD700]/20 transition-all text-[#FFD700]"
                title={isMusicPlaying ? "Mute Music" : "Play Music"}
            >
                {isMusicPlaying ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 opacity-70" />}
            </button>
        </div>
      </header>

      {/* Center Feedback - Removed subtitles as requested */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        {/* Placeholder for future central UI elements if needed */}
      </div>

      {/* Footer Container */}
      <footer className="flex flex-col items-center gap-8 pointer-events-auto">
        
        {/* Control Buttons - Centered Bottom */}
        <div className="flex flex-wrap justify-center items-center gap-4">
            
            <label className="cursor-pointer group flex items-center gap-2 bg-[#0a1f0a]/80 backdrop-blur-md border border-[#FFD700]/40 px-6 py-3 rounded-full hover:bg-[#FFD700]/20 hover:border-[#FFD700] hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <Upload className="w-5 h-5 text-[#FFD700]" />
                <span className="text-[#FFD700] text-sm font-semibold tracking-wide uppercase">Add Photo</span>
                <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
            </label>

            <button 
                onClick={onClear}
                className="group flex items-center gap-2 bg-[#1a0505]/80 backdrop-blur-md border border-red-500/40 px-6 py-3 rounded-full hover:bg-red-900/40 hover:border-red-500 hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
                <Trash2 className="w-5 h-5 text-red-300 group-hover:text-red-100" />
                <span className="text-red-300 group-hover:text-red-100 text-sm font-semibold tracking-wide uppercase">Clear Photos</span>
            </button>
        </div>

      </footer>
      
    </div>
  );
};