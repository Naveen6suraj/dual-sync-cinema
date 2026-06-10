"use client";

import React, { useState, useRef } from 'react';
import { Play, Pause, Settings, Maximize, Subtitles, Volume2 } from 'lucide-react';

export default function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasSource, setHasSource] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      videoRef.current.src = url;
      setHasSource(true);
      // Note: FFmpeg metadata extraction will go here
    }
  };

  return (
    <div className="flex-1 bg-black flex items-center justify-center relative group w-full h-full overflow-hidden">
      
      {/* Video Element */}
      <video 
        ref={videoRef}
        className="w-full h-full object-contain z-10"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Overlay Background */}
      {!hasSource && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black z-0 pointer-events-none"></div>
      )}

      {/* File Loader / Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <label className="pointer-events-auto cursor-pointer px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-sm font-medium transition-all border border-white/10 text-white flex gap-2 items-center">
          <Play size={16} /> Load Local MKV / MP4
          <input type="file" className="hidden" accept="video/*,.mkv" onChange={handleFileSelect} />
        </label>
      </div>

      {/* Settings Menu Overlay */}
      {showSettings && (
        <div className="absolute right-6 bottom-24 w-64 bg-black/90 border border-white/10 rounded-xl backdrop-blur-xl p-4 z-50 text-sm flex flex-col gap-3 shadow-2xl">
          <div className="font-semibold text-white/50 uppercase tracking-widest text-xs border-b border-white/10 pb-2">Settings</div>
          
          <div className="flex justify-between items-center cursor-pointer hover:text-cyan-400 transition-colors">
            <span>Audio Track</span>
            <span className="text-white/50 text-xs">Telugu 5.1 &gt;</span>
          </div>
          <div className="flex justify-between items-center cursor-pointer hover:text-cyan-400 transition-colors">
            <span>Subtitle Track</span>
            <span className="text-white/50 text-xs">English &gt;</span>
          </div>
          <div className="flex justify-between items-center cursor-pointer hover:text-cyan-400 transition-colors">
            <span>Playback Speed</span>
            <span className="text-white/50 text-xs">1.0x &gt;</span>
          </div>
          <div className="flex justify-between items-center cursor-pointer hover:text-cyan-400 transition-colors">
            <span>Audio Delay</span>
            <span className="text-white/50 text-xs">0ms &gt;</span>
          </div>
        </div>
      )}

      {/* Floating Controls Overlay */}
      <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-4 z-40">
         {/* Smart Timeline */}
         <div className="h-1.5 w-full bg-white/20 rounded-full cursor-pointer relative group/timeline">
           <div className="absolute h-full w-0 bg-cyan-400 rounded-full relative shadow-[0_0_10px_#06b6d4]">
             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/timeline:scale-100 transition-transform"></div>
           </div>
         </div>
         
         {/* Controls */}
         <div className="flex justify-between items-center text-white/80">
           <div className="flex gap-4 items-center">
             <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:text-white hover:bg-white/20 transition-colors">
               {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
             </button>
             <button className="hover:text-white transition-colors">
                <Volume2 size={20} />
             </button>
             <span className="text-sm font-mono tracking-wider">00:00:00 / 00:00:00</span>
           </div>
           
           <div className="flex gap-4 items-center">
             <button className="hover:text-cyan-400 transition-colors" title="Subtitles">
                <Subtitles size={20} />
             </button>
             <button 
                className={`hover:text-cyan-400 transition-colors ${showSettings ? 'text-cyan-400' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
             >
                <Settings size={20} />
             </button>
             <button className="hover:text-cyan-400 transition-colors" title="Fullscreen">
                <Maximize size={20} />
             </button>
           </div>
         </div>
      </div>
    </div>
  );
}
