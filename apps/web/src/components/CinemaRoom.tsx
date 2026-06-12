"use client";

import React, { useRef, useState } from 'react';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useAudioEngine } from '../hooks/useAudioEngine';
import SidebarNav from './layout/SidebarNav';
import YouTubePlayer, { extractYouTubeId } from './player/YouTubePlayer';
import LocalMediaPlayer from './player/LocalMediaPlayer';
import PlayerControls from './room/PlayerControls';
import AudioConsole from './room/AudioConsole';
import DeviceManager from './room/DeviceManager';

interface CinemaRoomProps {
    roomId: string;
    userId: string;
    userName: string;
    isHost: boolean;
}

export default function CinemaRoom({ roomId, userId, userName, isHost }: CinemaRoomProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const secondaryAudioRef = useRef<HTMLAudioElement | null>(null);
    const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const {
        listeners, devices, isPermissionGranted, requestAudioPermissions,
        playCalibrationSound,
        addListener, removeListener, updateVolume, updateDelay, updateDevice, saveDeviceProfile
    } = useAudioEngine(videoRef, secondaryAudioRef);

    const {
        ping, syncScore, handleHostAction
    } = useSyncEngine(roomId, userId, isHost, videoRef);

    const [activeTab, setActiveTab] = useState<'movies' | 'youtube'>('movies');
    const [hudTheme, setHudTheme] = useState<'cyberpunk' | 'scifi' | 'horror'>('cyberpunk');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [mediaType, setMediaType] = useState<'local' | 'youtube' | null>(null);
    const [mediaUrl, setMediaUrl] = useState('');
    const [localFile, setLocalFile] = useState<File | null>(null);

    const [subtitleDelay, setSubtitleDelay] = useState(0);
    const [subtitleSize, setSubtitleSize] = useState(20);
    const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
    
    const [secondaryAudioFile, setSecondaryAudioFile] = useState<File | null>(null);
    const [embeddedAudioTracks] = useState<{ index: number; label: string }[]>([]);
    const [embeddedVideoTracks] = useState<{ index: number; label: string }[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
    const [selectedVideoTrack, setSelectedVideoTrack] = useState<number>(-1);

    const [ambientColor] = useState('rgba(168, 85, 247, 0.45)');

    // Sync React State with Native Player callbacks for Host Actions
    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
        if (isHost) {
            handleHostAction(!isPlaying ? 'play' : 'pause', currentTime);
        }
    };

    const handleSeek = (time: number) => {
        setCurrentTime(time);
        if (isHost) {
            handleHostAction('seek', time);
        }
    };

    const [isIdle, setIsIdle] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const playerWrapperRef = useRef<HTMLDivElement | null>(null);

    const handleMouseMove = () => {
        setIsIdle(false);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setIsIdle(true), 3000);
    };

    const handleMouseLeave = () => {
        setIsIdle(true);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };

    const toggleFullscreen = () => {
        const wrapper = playerWrapperRef.current;
        if (!wrapper) return;

        if (!document.fullscreenElement) {
            wrapper.requestFullscreen().catch(err => console.error(err));
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(err => console.error(err));
            setIsFullscreen(false);
        }
    };

    const renderPlayer = () => {
        if (!mediaType || !mediaUrl) return null;

        return (
            <div 
                ref={playerWrapperRef}
                className="rounded-2xl border border-purple-500/10 bg-black/40 overflow-hidden shadow-2xl relative mt-6"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <div className={`relative ${isFullscreen ? 'w-screen h-screen' : 'aspect-video'}`}>
                    {mediaType === 'youtube' ? (
                        <YouTubePlayer 
                            url={mediaUrl}
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            playbackRate={1.0}
                            volume={1.0}
                            onTimeUpdate={setCurrentTime}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onSeek={setCurrentTime}
                            isHost={isHost}
                            videoRef={videoRef}
                        />
                    ) : (
                        <LocalMediaPlayer 
                            fileUrl={mediaUrl}
                            fileObj={localFile}
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            playbackRate={1.0}
                            volume={1.0}
                            onTimeUpdate={setCurrentTime}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onSeek={setCurrentTime}
                            onDurationChange={setDuration}
                            isHost={isHost}
                            videoRef={videoRef}
                        />
                    )}
                    
                    <PlayerControls 
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        duration={duration}
                        isHost={isHost}
                        onPlayPause={handlePlayPause}
                        onSeek={handleSeek}
                        hudTheme={hudTheme}
                        setHudTheme={setHudTheme as (theme: string) => void}
                        isIdle={isIdle}
                        toggleFullscreen={toggleFullscreen}
                        isFullscreen={isFullscreen}
                    />
                </div>
                {!isFullscreen && (
                    <div className="p-5 border-t border-purple-500/5 bg-white/[0.01] flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-md text-white">Current Media</h3>
                            <p className="text-xs text-gray-500 font-mono truncate max-w-lg">{mediaUrl}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div 
            className={`flex min-h-screen ${hudTheme === 'scifi' ? 'bg-[#020617] text-gray-100' : hudTheme === 'horror' ? 'bg-[#09090b] text-zinc-100' : 'bg-[#050508] text-gray-100'} overflow-hidden relative font-sans flex-col md:flex-row pb-16 md:pb-0`}
            data-theme={hudTheme}
        >
            <div 
                className="absolute inset-0 pointer-events-none transition-all duration-1000 blur-[130px] opacity-[0.22] z-0"
                style={{ background: `radial-gradient(circle at center, ${ambientColor} 0%, transparent 65%)` }}
            ></div>
            <canvas ref={ambientCanvasRef} className="hidden" width={10} height={10}></canvas>

            <SidebarNav activeTab={activeTab as "movies" | "youtube"} setActiveTab={setActiveTab as (tab: string) => void} userName={userName} />

            <div className="flex-grow flex flex-col h-screen overflow-y-auto relative z-1">
                <header className="h-[70px] border-b border-purple-500/10 bg-[#050508]/50 backdrop-blur-md flex justify-between items-center px-4 md:px-8 sticky top-0 z-10 shrink-0">
                    <div>
                        <span className="font-mono text-[9px] text-cyan-400 tracking-wider">ROOM // {roomId}</span>
                        <h2 className="font-hud text-sm font-bold tracking-wide text-white uppercase">{activeTab}</h2>
                    </div>
                    
                    <div className="flex items-center gap-5">
                        <div className="flex flex-col items-end font-mono text-[10px]">
                            <span className="text-gray-500 text-[9px]">SYNC SCORE</span>
                            <span className="font-bold text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)]">{syncScore}%</span>
                        </div>
                        <div className="flex flex-col items-end font-mono text-[10px]">
                            <span className="text-gray-500 text-[9px]">PING</span>
                            <span className="font-bold text-purple-400">{ping}ms</span>
                        </div>
                        
                        <div 
                            className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-purple-500/10 font-hud text-xs font-bold cursor-pointer hover:bg-white/10 transition"
                            onClick={requestAudioPermissions}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isPermissionGranted ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]'}`}></span>
                            <span>{isPermissionGranted ? 'ACCESS GRANTED' : 'GRANT DEVICE PERMISSION'}</span>
                        </div>
                    </div>
                </header>

                <div className="p-6 flex-grow overflow-y-auto max-w-7xl mx-auto w-full">
                    {activeTab === 'youtube' && (
                        <div className="glass-card p-6 flex flex-col gap-4">
                            <h3 className="font-hud text-lg font-bold text-white">YouTube Deck</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Paste YouTube URL here..." 
                                    className="flex-grow bg-black/50 border border-white/10 rounded px-4 py-2 text-white outline-none focus:border-purple-500 transition"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = e.currentTarget.value;
                                            if (extractYouTubeId(val)) {
                                                setMediaUrl(val);
                                                setMediaType('youtube');
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'movies' && (
                        <div className="glass-card p-6 flex flex-col gap-4">
                            <h3 className="font-hud text-lg font-bold text-white">Local Media Deck</h3>
                            <div className="border-2 border-dashed border-purple-500/30 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:border-purple-500/60 hover:bg-purple-500/5 transition cursor-pointer">
                                <i className="fa-solid fa-file-video text-4xl text-purple-400 mb-4"></i>
                                <p className="text-white font-bold mb-2">Drop MKV or MP4 files here</p>
                                <p className="text-xs text-gray-500 mb-4">ffmpeg.wasm will automatically extract tracks</p>
                                <label className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold cursor-pointer transition">
                                    Browse Files
                                    <input 
                                        type="file" 
                                        accept="video/*,.mkv" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setLocalFile(file);
                                                setMediaUrl(URL.createObjectURL(file));
                                                setMediaType('local');
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {renderPlayer()}

                    <DeviceManager 
                        devices={devices}
                        listeners={listeners}
                        addListener={addListener}
                        removeListener={removeListener}
                        updateVolume={updateVolume}
                        updateDelay={updateDelay}
                        updateDevice={updateDevice}
                        playCalibrationSound={playCalibrationSound}
                        saveDeviceProfile={saveDeviceProfile}
                        userId={userId}
                    />

                    <div className="mt-6">
                        <AudioConsole 
                            subtitleDelay={subtitleDelay}
                            setSubtitleDelay={setSubtitleDelay}
                            subtitleSize={subtitleSize}
                            setSubtitleSize={setSubtitleSize}
                            onSubtitleUpload={setSubtitleFile}
                            subtitleFileName={subtitleFile?.name}
                            embeddedAudioTracks={embeddedAudioTracks}
                            selectedAudioTrack={selectedAudioTrack}
                            setSelectedAudioTrack={setSelectedAudioTrack}
                            embeddedVideoTracks={embeddedVideoTracks}
                            selectedVideoTrack={selectedVideoTrack}
                            setSelectedVideoTrack={setSelectedVideoTrack}
                            onSecondaryAudioUpload={setSecondaryAudioFile}
                            secondaryAudioFileName={secondaryAudioFile?.name}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
