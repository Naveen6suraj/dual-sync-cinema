import React from 'react';

interface PlayerControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isHost: boolean;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    hudTheme: string;
    setHudTheme: (theme: string) => void;
}

const formatTimeStr = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
};

export default function PlayerControls({
    isPlaying,
    currentTime,
    duration,
    isHost,
    onPlayPause,
    onSeek,
    hudTheme,
    setHudTheme,
    isIdle,
    toggleFullscreen,
    isFullscreen
}: PlayerControlsProps & { isIdle?: boolean, toggleFullscreen?: () => void, isFullscreen?: boolean }) {
    return (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col gap-2 transition-opacity duration-500 z-10 ${isIdle ? 'opacity-0' : 'opacity-100'}`}>
            <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400" 
            />
            <div className="flex justify-between items-center text-xs text-white mt-1">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onPlayPause}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-cyan-400"
                    >
                        <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    <span className="font-mono text-gray-300">
                        {formatTimeStr(currentTime)} <span className="text-gray-600">/</span> {formatTimeStr(duration)}
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex gap-1.5 bg-black/50 border border-white/10 px-2 py-1 rounded-full items-center">
                        <button onClick={() => setHudTheme('cyberpunk')} className={`w-2.5 h-2.5 rounded-full bg-purple-500 border ${hudTheme === 'cyberpunk' ? 'border-white' : 'border-transparent'}`} title="Cyberpunk theme"></button>
                        <button onClick={() => setHudTheme('scifi')} className={`w-2.5 h-2.5 rounded-full bg-blue-500 border ${hudTheme === 'scifi' ? 'border-white' : 'border-transparent'}`} title="Sci-Fi theme"></button>
                        <button onClick={() => setHudTheme('horror')} className={`w-2.5 h-2.5 rounded-full bg-red-500 border ${hudTheme === 'horror' ? 'border-white' : 'border-transparent'}`} title="Horror theme"></button>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider border ${isHost ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'}`}>
                        {isHost ? 'HOST ACTIVE' : 'CLIENT SYNCING'}
                    </div>
                    {toggleFullscreen && (
                        <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white transition px-2">
                            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
