"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useAudioEngine } from '../hooks/useAudioEngine';

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

    // Audio & Routing state hook
    const {
        listeners,
        devices,
        isPermissionGranted,
        requestAudioPermissions,
        initMainAudioContext,
        resumeAllAudioContexts,
        addListener,
        removeListener,
        updateVolume,
        updateDelay,
        updateDevice,
        playCalibrationSound
    } = useAudioEngine(videoRef, secondaryAudioRef);

    // Network & Clock synchronization state hook
    const {
        socket,
        ping,
        syncScore,
        handleHostAction,
        isSeeking
    } = useSyncEngine(roomId, userId, isHost, videoRef);

    // Local UI & Viewport Tabs State
    const [activeTab, setActiveTab] = useState<'watch-party' | 'movies' | 'youtube' | 'voice-chat' | 'friends' | 'settings'>('watch-party');
    const [hudTheme, setHudTheme] = useState<'cyberpunk' | 'scifi' | 'horror'>('cyberpunk');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // YouTube State
    const [ytInputUrl, setYtInputUrl] = useState('');
    const [ytVideoId, setYtVideoId] = useState<string | null>(null);
    const [isLoadingYt, setIsLoadingYt] = useState(false);
    const [ytError, setYtError] = useState('');

    // YouTube URL Extractor
    const extractYouTubeId = (url: string) => {
        const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live|watch)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regExp);
        return (match && match[1]) ? match[1] : null;
    };

    const [newListenerName, setNewListenerName] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCalibratorActive, setIsCalibratorActive] = useState(false);
    const [calibratorFlash, setCalibratorFlash] = useState(false);
    
    // Voice activity states (Simulated Discord speech rings)
    const [sarahSpeaking, setSarahSpeaking] = useState(false);
    const [keanuSpeaking, setKeanuSpeaking] = useState(false);

    const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
    const [subtitleDelay, setSubtitleDelay] = useState(0);
    const [subtitleSize, setSubtitleSize] = useState(20);
    const [secondaryAudioFile, setSecondaryAudioFile] = useState<File | null>(null);
    const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
    
    // Embedded Audio/Video track list and selections
    const [embeddedAudioTracks, setEmbeddedAudioTracks] = useState<{ index: number; label: string }[]>([]);
    const [embeddedVideoTracks, setEmbeddedVideoTracks] = useState<{ index: number; label: string }[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
    const [selectedVideoTrack, setSelectedVideoTrack] = useState<number>(-1);

    // Dynamic Ambient color backplate variable
    const [ambientColor, setAmbientColor] = useState('rgba(168, 85, 247, 0.45)');

    // 1. Sync React State with Native Player callbacks
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => {
            setIsPlaying(true);
            resumeAllAudioContexts();
            if (isHost) handleHostAction('play');
        };

        const onPause = () => {
            setIsPlaying(false);
            if (isHost) handleHostAction('pause');
        };

        const onTimeUpdate = () => {
            setCurrentTime(video.currentTime);
        };

        const onDurationChange = () => {
            setDuration(video.duration);
        };

        const onSeeking = () => {
            if (isHost && !isSeeking()) {
                handleHostAction('seek', video.currentTime);
            }
        };

        const onLoadedMetadata = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const audioTracksList = (video as any).audioTracks;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const videoTracksList = (video as any).videoTracks;
            
            if (audioTracksList && audioTracksList.length > 0) {
                const tracks = [];
                for (let i = 0; i < audioTracksList.length; i++) {
                    const t = audioTracksList[i];
                    tracks.push({
                        index: i,
                        label: `${t.label || `Track ${i + 1}`} [${t.language || 'unknown'}]`
                    });
                }
                setEmbeddedAudioTracks(tracks);
            } else {
                setEmbeddedAudioTracks([]);
            }

            if (videoTracksList && videoTracksList.length > 0) {
                const tracks = [];
                for (let i = 0; i < videoTracksList.length; i++) {
                    const t = videoTracksList[i];
                    tracks.push({
                        index: i,
                        label: `${t.label || `Stream ${i + 1}`} (${t.width || '?'}x${t.height || '?'})`
                    });
                }
                setEmbeddedVideoTracks(tracks);
            } else {
                setEmbeddedVideoTracks([]);
            }
        };

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('seeking', onSeeking);
        video.addEventListener('loadedmetadata', onLoadedMetadata);

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('durationchange', onDurationChange);
            video.removeEventListener('seeking', onSeeking);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHost, socket]);

    // 2. Simulated Discord voice activity loops
    useEffect(() => {
        const interval = setInterval(() => {
            setSarahSpeaking(Math.random() > 0.65);
            setKeanuSpeaking(Math.random() > 0.75);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    // 3. Real-Time Ambient glow reflection loop
    useEffect(() => {
        const video = videoRef.current;
        const canvas = ambientCanvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        const draw = () => {
            if (!video.paused && !video.ended) {
                try {
                    ctx.drawImage(video, 0, 0, 10, 10);
                    const imgData = ctx.getImageData(0, 0, 10, 10);
                    let r = 0, g = 0, b = 0;
                    for (let i = 0; i < imgData.data.length; i += 4) {
                        r += imgData.data[i];
                        g += imgData.data[i + 1];
                        b += imgData.data[i + 2];
                    }
                    r = Math.round(r / (imgData.data.length / 4));
                    g = Math.round(g / (imgData.data.length / 4));
                    b = Math.round(b / (imgData.data.length / 4));
                    setAmbientColor(`rgba(${r}, ${g}, ${b}, 0.45)`);
                } catch {
                    // Fail gracefully on CORS blocks
                }
            }
            frameId = requestAnimationFrame(draw);
        };
        draw();

        return () => cancelAnimationFrame(frameId);
    }, []);

    // 4. Subtitles Parsing & Cue Shifting
    const [subBlocks, setSubBlocks] = useState<{ start: number; end: number; text: string }[]>([]);

    const parseSubtitles = (text: string, extension: string) => {
        const blocks: { start: number; end: number; text: string }[] = [];
        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        if (extension === 'srt') {
            const sections = normalized.split('\n\n');
            sections.forEach(sec => {
                const lines = sec.trim().split('\n');
                if (lines.length >= 3) {
                    const timeMatch = lines[1]?.match(/(\d+):(\d+):(\d+),(\d+)\s*-->\s*(\d+):(\d+):(\d+),(\d+)/);
                    if (timeMatch) {
                        const start = parseTimeToSec(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                        const end = parseTimeToSec(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
                        const textContent = lines.slice(2).join('\n');
                        blocks.push({ start, end, text: textContent });
                    }
                }
            });
        }
        setSubBlocks(blocks);
    };

    const parseTimeToSec = (h: string, m: string, s: string, ms: string) => {
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
    };

    const formatVttTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video || subBlocks.length === 0) return;

        // Clear tracks
        const tracks = video.querySelectorAll('track');
        tracks.forEach(t => t.remove());

        // Build WebVTT content
        let vtt = 'WEBVTT\n\n';
        subBlocks.forEach((b, idx) => {
            const start = Math.max(0, b.start + subtitleDelay);
            const end = Math.max(0, b.end + subtitleDelay);
            vtt += `${idx + 1}\n${formatVttTime(start)} --> ${formatVttTime(end)}\n${b.text}\n\n`;
        });

        const blob = new Blob([vtt], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);

        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = subtitleFile ? subtitleFile.name : 'Subtitles';
        track.srclang = 'en';
        track.src = url;
        track.default = true;

        video.appendChild(track);
        if (video.textTracks.length > 0) {
            video.textTracks[0].mode = 'showing';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subBlocks, subtitleDelay]);

    // 5. Subtitles Delay Style Injector
    useEffect(() => {
        let style = document.getElementById('vlc-sub-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'vlc-sub-style';
            document.head.appendChild(style);
        }
        style.innerHTML = `video::cue { font-size: ${subtitleSize}px !important; }`;
    }, [subtitleSize]);

    // 6. Secondary Audio Track Sync Manager
    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !secondaryAudioRef.current) return;

        setSecondaryAudioFile(file);
        initMainAudioContext();
        
        const url = URL.createObjectURL(file);
        secondaryAudioRef.current.src = url;
        secondaryAudioRef.current.currentTime = videoRef.current ? videoRef.current.currentTime : 0;
        
        if (isPlaying) {
            secondaryAudioRef.current.play().catch(err => console.warn(err));
        }
    };

    // 7. Calibration Wizard Loop
    useEffect(() => {
        if (!isCalibratorActive) return;

        const interval = setInterval(() => {
            // Visual Flash trigger
            setCalibratorFlash(true);
            setTimeout(() => setCalibratorFlash(false), 80);

            // Audio Tick play across all listeners
            listeners.forEach(l => playCalibrationSound(l));
        }, 1000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCalibratorActive, listeners]);

    // Format Time Display
    const formatTimeStr = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const rem = Math.floor(secs % 60);
        return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
    };

    return (
        <div 
            className="flex min-h-screen bg-[#050508] text-[#ecebf0] font-sans overflow-hidden relative"
            data-theme={hudTheme}
        >
            {/* Real-time Dynamic Ambient Glow Canvas Backing */}
            <div 
                className="absolute inset-0 pointer-events-none transition-all duration-1000 blur-[130px] opacity-[0.22] z-0"
                style={{
                    background: `radial-gradient(circle at center, ${ambientColor} 0%, transparent 65%)`
                }}
            ></div>
            <canvas ref={ambientCanvasRef} className="hidden" width={10} height={10}></canvas>

            {/* Left Sidebar: Discord navigation layout */}
            <aside className="w-[76px] bg-[#05040a] border-r border-purple-500/10 flex flex-col items-center py-5 z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                    <i className="fa-solid fa-wand-magic-sparkles text-white text-lg"></i>
                </div>
                
                <nav className="flex flex-col gap-3 items-center w-full flex-grow">
                    <div 
                        className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer relative transition-all duration-200 ${activeTab === 'watch-party' ? 'bg-purple-600 text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:rounded-xl'}`}
                        onClick={() => setActiveTab('watch-party')}
                        title="Watch Party Room"
                    >
                        <i className="fa-solid fa-clapperboard"></i>
                        <span className={`absolute left-0 w-1 rounded-r bg-white transition-all ${activeTab === 'watch-party' ? 'h-9' : 'h-0 group-hover:h-5'}`}></span>
                    </div>

                    <div 
                        className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer relative transition-all duration-200 ${activeTab === 'movies' ? 'bg-purple-600 text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:rounded-xl'}`}
                        onClick={() => setActiveTab('movies')}
                        title="Movie Library"
                    >
                        <i className="fa-solid fa-film"></i>
                        <span className={`absolute left-0 w-1 rounded-r bg-white transition-all ${activeTab === 'movies' ? 'h-9' : 'h-0 group-hover:h-5'}`}></span>
                    </div>

                    <div 
                        className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer relative transition-all duration-200 ${activeTab === 'youtube' ? 'bg-purple-600 text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:rounded-xl'}`}
                        onClick={() => setActiveTab('youtube')}
                        title="YouTube Deck"
                    >
                        <i className="fa-brands fa-youtube"></i>
                        <span className={`absolute left-0 w-1 rounded-r bg-white transition-all ${activeTab === 'youtube' ? 'h-9' : 'h-0 group-hover:h-5'}`}></span>
                    </div>

                    <div className="w-8 h-[1px] bg-white/5 my-2"></div>

                    <div 
                        className="w-12 h-12 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:rounded-xl flex items-center justify-center cursor-pointer transition-all"
                        onClick={() => alert('Voice Lobby Channel is active in simulated mode.')}
                        title="Voice Lobby"
                    >
                        <i className="fa-solid fa-headphones-simple"></i>
                    </div>

                    <div 
                        className="w-12 h-12 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:rounded-xl flex items-center justify-center cursor-pointer relative transition-all"
                        onClick={() => alert('Friends HUD tab is loaded.')}
                        title="Friends"
                    >
                        <i className="fa-solid fa-user-group"></i>
                        <span className="absolute bottom-0 right-0 bg-red-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#05040a]">3</span>
                    </div>
                </nav>

                <div className="w-12 h-12 rounded-full bg-indigo-900 border border-white/10 flex items-center justify-center text-white font-bold relative cursor-pointer">
                    <span>{userName.charAt(0).toUpperCase()}</span>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border border-[#05040a] rounded-full shadow-[0_0_6px_#10b981]"></span>
                </div>
            </aside>

            {/* Main Viewport Content Area */}
            <div className="flex-grow flex flex-col h-screen overflow-y-auto relative z-1">
                
                {/* Top HUD Header bar */}
                <header className="h-[70px] border-b border-purple-500/10 bg-[#050508]/50 backdrop-blur-md flex justify-between items-center px-8 sticky top-0 z-10">
                    <div>
                        <span className="font-mono text-[9px] text-cyan-400 tracking-wider">ROOM // {roomId}</span>
                        <h2 className="font-hud text-sm font-bold tracking-wide text-white uppercase">{activeTab.replace('-', ' ')}</h2>
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
                            id="permission-status"
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isPermissionGranted ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]'}`}></span>
                            <span>{isPermissionGranted ? 'ACCESS GRANTED' : 'GRANT DEVICE PERMISSION'}</span>
                        </div>
                    </div>
                </header>

                {/* Main Tab Panels viewport grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 flex-grow overflow-y-auto">
                    
                    {/* Left Column (8 cols width) */}
                    <div className="xl:col-span-8 flex flex-col gap-6">
                        
                        {/* Tab Panel 1: Watch Party Room (Player Stage) */}
                        {activeTab === 'watch-party' && (
                            <>
                                <div className="rounded-2xl border border-purple-500/10 bg-black/40 overflow-hidden shadow-2xl relative">
                                    <div className="relative aspect-video">
                                        {ytVideoId ? (
                                            <div className="relative w-full h-full bg-black">
                                                {isLoadingYt && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img 
                                                            src={`https://img.youtube.com/vi/${ytVideoId}/maxresdefault.jpg`} 
                                                            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" 
                                                            alt="Thumbnail preview"
                                                        />
                                                        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-red-500 mb-3 z-10"></i>
                                                        <span className="font-hud text-xs font-bold text-white z-10 tracking-widest">ESTABLISHING YOUTUBE UPLINK...</span>
                                                    </div>
                                                )}
                                                <iframe 
                                                    className="w-full h-full"
                                                    src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&rel=0`}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    onLoad={() => setIsLoadingYt(false)}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <video ref={videoRef} className="w-full h-full object-contain" playsInline>
                                                    <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
                                                </video>
                                                <audio ref={secondaryAudioRef} className="hidden" />
                                            </>
                                        )}

                                        {/* HTML5 Overlay UI Controls */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300 z-10">
                                            <input 
                                                type="range" 
                                                min={0} 
                                                max={duration || 100} 
                                                value={currentTime}
                                                onChange={(e) => {
                                                    if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value);
                                                }}
                                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400" 
                                            />
                                            <div className="flex justify-between items-center text-xs text-white">
                                                <div className="flex gap-4">
                                                    <button 
                                                        onClick={() => {
                                                            if (videoRef.current) {
                                                                if (videoRef.current.paused) videoRef.current.play().catch(() => {});
                                                                else videoRef.current.pause();
                                                            }
                                                        }}
                                                        className="hover:text-cyan-400 font-bold transition"
                                                    >
                                                        {isPlaying ? 'PAUSE' : 'PLAY'}
                                                    </button>
                                                    <span className="font-mono">{formatTimeStr(currentTime)} / {formatTimeStr(duration)}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    {/* HUD Theme Switcher pills */}
                                                    <div className="flex gap-1.5 bg-black/50 border border-white/10 px-2 py-1 rounded-full items-center">
                                                        <button onClick={() => setHudTheme('cyberpunk')} className={`w-2.5 h-2.5 rounded-full bg-purple-500 border ${hudTheme === 'cyberpunk' ? 'border-white' : 'border-transparent'}`} title="Cyberpunk theme"></button>
                                                        <button onClick={() => setHudTheme('scifi')} className={`w-2.5 h-2.5 rounded-full bg-blue-500 border ${hudTheme === 'scifi' ? 'border-white' : 'border-transparent'}`} title="Sci-Fi theme"></button>
                                                        <button onClick={() => setHudTheme('horror')} className={`w-2.5 h-2.5 rounded-full bg-red-500 border ${hudTheme === 'horror' ? 'border-white' : 'border-transparent'}`} title="Horror theme"></button>
                                                    </div>
                                                    <span className="text-[10px] text-white/50">{isHost ? 'HOST ACTIVE' : 'CLIENT SYNCING'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 border-t border-purple-500/5 bg-white/[0.01] flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold text-md text-white">Demo Trailer: Big Buck Bunny</h3>
                                            <p className="text-xs text-gray-500 font-mono">1080p MP4 HLS Streaming</p>
                                        </div>
                                    </div>
                                </div>

                                {/* VLC Studio Console features */}
                                <div className="glass-card p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-2 border-b border-purple-500/10 pb-3 mb-1">
                                        <i className="fa-solid fa-sliders text-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.4)]"></i>
                                        <h3 className="font-hud text-xs font-bold tracking-wider text-white">VLC STUDIO SYSTEM SETTINGS</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Subtitle adjustment deck */}
                                        <div className="flex flex-col gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                                            <h4 className="text-xs font-hud font-bold tracking-wide text-purple-400 flex items-center gap-2">
                                                <i className="fa-regular fa-closed-captioning"></i> SUBTITLE ADVANCED SETTINGS
                                            </h4>
                                            
                                            <label className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-white/5 border border-purple-500/10 hover:bg-white/10 cursor-pointer text-xs font-bold transition">
                                                LOAD SUBTITLES (.SRT / .VTT)
                                                <input 
                                                    type="file" 
                                                    accept=".srt,.vtt" 
                                                    className="hidden" 
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setSubtitleFile(file);
                                                        const reader = new FileReader();
                                                        reader.onload = (ev) => parseSubtitles(ev.target?.result as string, file.name.split('.').pop()!);
                                                        reader.readAsText(file);
                                                    }}
                                                />
                                            </label>
                                            <span className="text-[10px] text-gray-500 text-center truncate">{subtitleFile ? subtitleFile.name : 'No file loaded'}</span>

                                            <div className="flex flex-col gap-1.5 mt-2">
                                                <div className="flex justify-between text-[11px] text-gray-400">
                                                    <span>Subtitle timing delay</span>
                                                    <span className="font-mono text-cyan-400 font-bold">{subtitleDelay.toFixed(1)}s</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setSubtitleDelay(prev => Math.max(-5, prev - 0.1))} className="px-2 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded text-[10px] font-mono">-0.1s</button>
                                                    <input 
                                                        type="range" 
                                                        min={-5} 
                                                        max={5} 
                                                        step={0.1} 
                                                        value={subtitleDelay}
                                                        onChange={(e) => setSubtitleDelay(parseFloat(e.target.value))}
                                                        className="flex-grow accent-cyan-400 h-1 bg-white/10 rounded"
                                                    />
                                                    <button onClick={() => setSubtitleDelay(prev => Math.min(5, prev + 0.1))} className="px-2 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded text-[10px] font-mono">+0.1s</button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1.5 mt-2">
                                                <div className="flex justify-between text-[11px] text-gray-400">
                                                    <span>Font size scaling</span>
                                                    <span className="font-mono text-purple-400 font-bold">{subtitleSize}px</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min={14} 
                                                    max={32} 
                                                    value={subtitleSize}
                                                    onChange={(e) => setSubtitleSize(parseInt(e.target.value))}
                                                    className="w-full accent-purple-500 h-1 bg-white/10 rounded"
                                                />
                                            </div>
                                        </div>

                                        {/* Multi dialogue track */}
                                        <div className="flex flex-col gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                                            <h4 className="text-xs font-hud font-bold tracking-wide text-cyan-400 flex items-center gap-2">
                                                <i className="fa-solid fa-language"></i> MULTI-TRACK CONTROLS
                                            </h4>
                                            
                                            <div className="flex flex-col gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Embedded Audio Track</label>
                                                    <select 
                                                        value={selectedAudioTrack}
                                                        onChange={(e) => {
                                                            const idx = parseInt(e.target.value);
                                                            setSelectedAudioTrack(idx);
                                                            const video = videoRef.current;
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                            if (video && (video as any).audioTracks) {
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                for (let i = 0; i < (video as any).audioTracks.length; i++) {
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    (video as any).audioTracks[i].enabled = (i === idx);
                                                                }
                                                            }
                                                        }}
                                                        className="bg-[#05040a] border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none w-full"
                                                    >
                                                        <option value={-1}>Default / Track 1</option>
                                                        {embeddedAudioTracks.map(t => (
                                                            <option key={t.index} value={t.index}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Embedded Video Track / Quality</label>
                                                    <select 
                                                        value={selectedVideoTrack}
                                                        onChange={(e) => {
                                                            const idx = parseInt(e.target.value);
                                                            setSelectedVideoTrack(idx);
                                                            const video = videoRef.current;
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                            if (video && (video as any).videoTracks) {
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                for (let i = 0; i < (video as any).videoTracks.length; i++) {
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    (video as any).videoTracks[i].selected = (i === idx);
                                                                }
                                                            }
                                                        }}
                                                        className="bg-[#05040a] border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none w-full"
                                                    >
                                                        <option value={-1}>Default / Auto</option>
                                                        {embeddedVideoTracks.map(t => (
                                                            <option key={t.index} value={t.index}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="text-[9px] text-gray-500 leading-relaxed bg-white/[0.02] border border-white/5 p-2 rounded">
                                                    <span className="text-blue-400 font-bold">Chromium Tip:</span> For local multi-audio files, enable Chrome&apos;s flag: <code>chrome://flags/#enable-experimental-web-platform-features</code>
                                                </div>
                                            </div>

                                            <h5 className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase mt-2">Load External Dialogue File</h5>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                                Or load an external audio file (.mp3, .m4a) to route as a secondary language track.
                                            </p>
                                            <label className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-white/5 border border-purple-500/10 hover:bg-white/10 cursor-pointer text-xs font-bold transition mt-2">
                                                LOAD DIALOGUE FILE
                                                <input 
                                                    type="file" 
                                                    accept="audio/*" 
                                                    className="hidden" 
                                                    onChange={handleAudioUpload}
                                                />
                                            </label>
                                            <span className="text-[10px] text-gray-500 text-center truncate">{secondaryAudioFile ? secondaryAudioFile.name : 'No track loaded'}</span>

                                            {secondaryAudioFile && (
                                                <div className="flex items-center gap-2 p-2 rounded bg-cyan-500/5 border border-cyan-500/20 text-xs text-cyan-400 mt-2 justify-center">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                                                    <span>Dialogue clock synchronizing</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Tab Panel 2: Movie Selection Shelf (Netflix Style) */}
                        {activeTab === 'movies' && (
                            <div className="flex flex-col gap-6">
                                <div className="border-b border-purple-500/10 pb-3">
                                    <h3 className="font-hud text-md font-bold tracking-wide text-white">RECOMMENDED FOR MOVIE NIGHT</h3>
                                    <p className="text-xs text-gray-500">Select any card to launch immediately.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div 
                                        className="h-[300px] border border-purple-500/10 hover:border-cyan-500/40 rounded-xl relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-cover bg-center"
                                        style={{ backgroundImage: `url('/images/cyberpunk.png')` }}
                                        onClick={() => {
                                            if (videoRef.current) {
                                                videoRef.current.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4";
                                                videoRef.current.play().catch(() => {});
                                                setActiveTab('watch-party');
                                            }
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-[#050508]/30 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h5 className="font-hud text-xs font-bold text-white">DUALSYNC 2099</h5>
                                            <p className="text-[10px] text-gray-400">Cyberpunk Cinema • 1080p</p>
                                        </div>
                                    </div>

                                    <div 
                                        className="h-[300px] border border-purple-500/10 hover:border-cyan-500/40 rounded-xl relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-cover bg-center"
                                        style={{ backgroundImage: `url('/images/scifi.png')` }}
                                        onClick={() => {
                                            if (videoRef.current) {
                                                videoRef.current.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";
                                                videoRef.current.play().catch(() => {});
                                                setActiveTab('watch-party');
                                            }
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-[#050508]/30 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h5 className="font-hud text-xs font-bold text-white">COSMIC DRIFT</h5>
                                            <p className="text-[10px] text-gray-400">Sci-Fi Space • 4K HDR</p>
                                        </div>
                                    </div>

                                    <div 
                                        className="h-[300px] border border-purple-500/10 hover:border-cyan-500/40 rounded-xl relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-cover bg-center"
                                        style={{ backgroundImage: `url('/images/horror.png')` }}
                                        onClick={() => {
                                            if (videoRef.current) {
                                                videoRef.current.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4";
                                                videoRef.current.play().catch(() => {});
                                                setActiveTab('watch-party');
                                            }
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-[#050508]/30 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h5 className="font-hud text-xs font-bold text-white">THE NEON FOG</h5>
                                            <p className="text-[10px] text-gray-400">Horror Suspense • 1080p</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Panel 3: YouTube Theater tab */}
                        {activeTab === 'youtube' && (
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                                    <i className="fa-brands fa-youtube text-red-500 text-2xl shadow-[0_0_8px_#ef4444]"></i>
                                    <div>
                                        <h3 className="font-hud text-xs font-bold text-white">YOUTUBE SYNC SYSTEM</h3>
                                        <p className="text-[11px] text-gray-500">Paste links to stream synchronized videos with friends.</p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-xl border border-purple-500/10 bg-white/[0.01] flex flex-col gap-3">
                                    <label className="text-[10px] font-hud font-bold text-gray-500 tracking-wider">INPUT YOUTUBE LINK OR VIDEO ID</label>
                                    <div className="flex gap-3">
                                        <input 
                                            type="text" 
                                            value={ytInputUrl} 
                                            onChange={(e) => {
                                                setYtInputUrl(e.target.value);
                                                if (ytError) setYtError('');
                                            }}
                                            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                            className={`flex-grow bg-black/40 border ${ytError ? 'border-red-500' : 'border-purple-500/10'} rounded px-4 py-2 text-xs text-white focus:border-cyan-500 outline-none`}
                                        />
                                        <button 
                                            onClick={() => {
                                                const url = ytInputUrl.trim();
                                                if (url) {
                                                    const id = extractYouTubeId(url);
                                                    if (id) {
                                                        setYtError('');
                                                        setIsLoadingYt(true);
                                                        setYtVideoId(id);
                                                        setActiveTab('watch-party');
                                                    } else {
                                                        setYtError('Invalid YouTube URL format.');
                                                    }
                                                }
                                            }}
                                            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-xs font-hud font-bold shadow-lg"
                                        >
                                            LOAD DECK
                                        </button>
                                    </div>
                                    {ytError && <p className="text-red-500 text-[10px] mt-1 font-bold">{ytError}</p>}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Right Column (4 cols width) */}
                    <div className="xl:col-span-4 flex flex-col gap-6">
                        
                        {/* Discord Voice chat and Lobby Members */}
                        <div className="glass-card p-5 flex flex-col gap-4">
                            <div className="flex justify-between items-center border-b border-purple-500/10 pb-3 mb-1">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-volume-high text-cyan-400"></i>
                                    <h4 className="font-hud text-xs font-bold tracking-wider text-white">VOICE CHANNEL: THEATER_01</h4>
                                </div>
                                <span className="font-mono text-[9px] border border-cyan-400/30 text-cyan-400 bg-cyan-400/5 px-2 py-0.5 rounded font-bold">P2P MESH</span>
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* Active User 1 (Me) */}
                                <div className="flex items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center font-bold text-xs">
                                        <span>N</span>
                                    </div>
                                    <div className="flex-grow flex flex-col">
                                        <span className="text-xs font-semibold text-white">{userName} (You) <span className="bg-purple-600/35 border border-purple-500/30 px-1 rounded text-[8px] font-bold">HOST</span></span>
                                        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><i className="fa-solid fa-eye"></i> Watching</span>
                                    </div>
                                    <span className="font-mono text-[9px] text-gray-500">12ms</span>
                                    <i className="fa-solid fa-microphone text-emerald-400 shadow-[0_0_4px_#10b981]"></i>
                                </div>

                                {/* Active User 2 (Sarah - Simulated Speaker) */}
                                <div className="flex items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl gap-3">
                                    <div className={`w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${sarahSpeaking ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-transparent'}`}>
                                        <span>S</span>
                                    </div>
                                    <div className="flex-grow flex flex-col">
                                        <span className="text-xs font-semibold text-white">Sarah</span>
                                        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><i className="fa-solid fa-eye"></i> Watching</span>
                                    </div>
                                    <span className="font-mono text-[9px] text-gray-500">24ms</span>
                                    <i className={`fa-solid ${sarahSpeaking ? 'fa-microphone text-emerald-400' : 'fa-microphone text-gray-500'}`}></i>
                                </div>

                                {/* Active User 3 (Dave) */}
                                <div className="flex items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                                        <span>D</span>
                                    </div>
                                    <div className="flex-grow flex flex-col">
                                        <span className="text-xs font-semibold text-white">Dave</span>
                                        <span className="text-[10px] text-cyan-400 flex items-center gap-1"><i className="fa-solid fa-arrows-spin"></i> Syncing</span>
                                    </div>
                                    <span className="font-mono text-[9px] text-gray-500">112ms</span>
                                    <i className="fa-solid fa-microphone-slash text-red-500"></i>
                                </div>

                                {/* Active User 4 (Keanu - Simulated Speaker) */}
                                <div className="flex items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl gap-3">
                                    <div className={`w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${keanuSpeaking ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-transparent'}`}>
                                        <span>K</span>
                                    </div>
                                    <div className="flex-grow flex flex-col">
                                        <span className="text-xs font-semibold text-white">Keanu</span>
                                        <span className="text-[10px] text-purple-400 flex items-center gap-1"><i className="fa-solid fa-pause"></i> Paused</span>
                                    </div>
                                    <span className="font-mono text-[9px] text-gray-500">14ms</span>
                                    <i className={`fa-solid ${keanuSpeaking ? 'fa-microphone text-emerald-400' : 'fa-microphone text-gray-500'}`}></i>
                                </div>
                            </div>
                        </div>

                        {/* Dual-Pairing Multi-Bluetooth Mixer Console */}
                        <div className="glass-card p-5 flex flex-col gap-4 flex-grow">
                            <div className="flex justify-between items-center border-b border-purple-500/10 pb-3 mb-1">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-sliders text-purple-400"></i>
                                    <h4 className="font-hud text-xs font-bold tracking-wider text-white">LISTENER AUDIO MIXER</h4>
                                </div>
                                <button 
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded text-[10px] font-bold font-hud transition"
                                >
                                    + ADD
                                </button>
                            </div>

                            <div className="flex flex-col gap-4 flex-grow max-h-[360px] overflow-y-auto pr-1">
                                {listeners.map((listener) => (
                                    <div key={listener.id} className="p-4 rounded-xl border border-purple-500/5 bg-white/[0.015] hover:bg-white/[0.035] transition duration-200 flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-hud text-[10px] font-bold">
                                                    {listener.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-xs font-semibold text-white">{listener.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => removeListener(listener.id)}
                                                className="text-[10px] text-gray-500 hover:text-red-400 hover:bg-red-500/5 px-2 py-0.5 rounded transition"
                                            >
                                                REMOVE
                                            </button>
                                        </div>

                                        <select 
                                            value={listener.deviceId}
                                            onChange={(e) => updateDevice(listener.id, e.target.value)}
                                            className="w-full text-[11px] py-1.5 px-2 bg-black/40 border border-purple-500/10 rounded text-gray-300 focus:border-purple-500 outline-none"
                                        >
                                            <option value="default">System Default Output</option>
                                            {devices.map(d => (
                                                <option key={d.deviceId} value={d.deviceId}>{d.label || `Device (${d.deviceId.substring(0, 5)}...)`}</option>
                                            ))}
                                        </select>

                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between text-[10px] text-gray-500">
                                                <span>Volume</span>
                                                <span>{Math.round(listener.volume * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min={0} 
                                                max={1} 
                                                step={0.05} 
                                                value={listener.volume}
                                                onChange={(e) => updateVolume(listener.id, parseFloat(e.target.value))}
                                                className="w-full accent-purple-500 h-1 bg-white/10 rounded"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between text-[10px] text-gray-500">
                                                <span>Latency Compensation</span>
                                                <span className="text-cyan-400 font-mono font-bold">{listener.delayMs}ms</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min={0} 
                                                max={1000} 
                                                step={5} 
                                                value={listener.delayMs}
                                                onChange={(e) => updateDelay(listener.id, parseInt(e.target.value))}
                                                className="w-full accent-cyan-400 h-1 bg-white/10 rounded"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Calibration Wizard Section */}
                            <div className="border-t border-purple-500/5 pt-4 mt-2 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_#a855f7] animate-pulse"></span>
                                        <h5 className="font-hud text-[10px] font-bold text-gray-400">AV CALIBRATION ENGINE</h5>
                                    </div>
                                    <button 
                                        onClick={() => setIsCalibratorActive(!isCalibratorActive)}
                                        className={`px-2 py-0.5 border text-[9px] font-hud font-bold rounded transition ${isCalibratorActive ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-white/5 text-gray-500 border-white/10'}`}
                                    >
                                        {isCalibratorActive ? 'STOP CALIBRATOR' : 'START CALIBRATOR'}
                                    </button>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="w-11 h-11 bg-black/40 border border-purple-500/10 rounded flex items-center justify-center relative overflow-hidden flex-shrink-0">
                                        <div className={`w-4 h-4 rounded-full transition duration-75 ${calibratorFlash ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee] scale-110' : 'bg-white/10 scale-100'}`}></div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-normal">Adjust headphone delay (ms) until the tick matches the visual flash.</p>
                                </div>
                            </div>
                        </div>

                        {/* Collapsible Telemetry diagnostics card */}
                        <div className="glass-card">
                            <div 
                                className="flex justify-between items-center p-4 cursor-pointer"
                                onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
                            >
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-bug text-cyan-400"></i>
                                    <h4 className="font-hud text-xs font-bold tracking-wider text-white">DIAGNOSTICS LOGS</h4>
                                </div>
                                <i className={`fa-solid ${isDiagnosticsOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                            </div>

                            {isDiagnosticsOpen && (
                                <div className="px-4 pb-4 flex flex-col gap-2 font-mono text-[10px]">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Secure Context:</span>
                                        <span className="text-emerald-400 font-bold">Yes (Localhost active)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Output Selection:</span>
                                        <span className="text-emerald-400 font-bold">Supported (setSinkId)</span>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                </div>

            </div>

            {/* Allocation Track Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="w-[90%] max-w-[400px] p-6 rounded-2xl border border-purple-500/30 bg-[#0a0915] shadow-2xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-cyan-400 shadow-md"></div>
                        <h3 className="font-hud text-sm font-bold tracking-wider text-white text-center">ALLOCATE LISTENER TRACK</h3>
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-hud font-bold text-gray-500">LISTENER NAME TAG</label>
                            <input 
                                type="text"
                                value={newListenerName}
                                onChange={(e) => setNewListenerName(e.target.value)}
                                placeholder="e.g. Sarah, Dave"
                                className="w-full bg-black/40 border border-purple-500/10 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newListenerName.trim()) {
                                        addListener(newListenerName.trim());
                                        setNewListenerName('');
                                        setIsAddModalOpen(false);
                                    }
                                }}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded text-xs font-hud font-bold text-gray-400 transition"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={() => {
                                    if (newListenerName.trim()) {
                                        addListener(newListenerName.trim());
                                        setNewListenerName('');
                                        setIsAddModalOpen(false);
                                    }
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded text-xs font-hud font-bold shadow-lg"
                            >
                                ALLOCATE TRACK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
