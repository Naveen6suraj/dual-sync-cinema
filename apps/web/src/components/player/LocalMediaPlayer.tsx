import React, { useRef, useEffect, useState } from 'react';
import { useFFmpeg } from '../../hooks/useFFmpeg';

interface LocalMediaPlayerProps {
    fileUrl: string;
    fileObj?: File | null;
    isPlaying: boolean;
    currentTime: number;
    playbackRate: number;
    volume: number;
    onTimeUpdate: (time: number) => void;
    onPlay: () => void;
    onPause: () => void;
    onSeek: (time: number) => void;
    onDurationChange?: (duration: number) => void;
    isHost: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function LocalMediaPlayer({
    fileUrl,
    fileObj,
    isPlaying,
    currentTime,
    playbackRate,
    volume,
    onTimeUpdate,
    onPlay,
    onPause,
    onSeek,
    onDurationChange,
    videoRef
}: LocalMediaPlayerProps) {
    const { isLoaded, load, extractSubtitles, isProcessing, progress } = useFFmpeg();
    const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync state
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying && video.paused) {
            video.play().catch(e => console.warn('Autoplay prevented', e));
        } else if (!isPlaying && !video.paused) {
            video.pause();
        }
    }, [isPlaying, videoRef]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        
        if (Math.abs(video.currentTime - currentTime) > 2) {
            video.currentTime = currentTime;
        }
    }, [currentTime, videoRef]);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.playbackRate = playbackRate;
        }
    }, [playbackRate, videoRef]);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.volume = volume;
        }
    }, [volume, videoRef]);

    // FFmpeg subtitle extraction logic
    useEffect(() => {
        if (!fileObj || !fileObj.name.endsWith('.mkv')) return;
        
        const processMKV = async () => {
            if (!isLoaded) {
                await load();
            }
            const vttData = await extractSubtitles(fileObj);
            if (vttData) {
                const blob = new Blob([vttData], { type: 'text/vtt' });
                setSubtitleUrl(URL.createObjectURL(blob));
            }
        };

        processMKV();
    }, [fileObj, isLoaded, extractSubtitles, load]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return; // don't hijack typing
            }

            const video = videoRef.current;
            if (!video) return;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
                    onSeek(video.currentTime);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 5);
                    onSeek(video.currentTime);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    video.volume = Math.min(1, video.volume + 0.05);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    video.volume = Math.max(0, video.volume - 0.05);
                    break;
                case 'f':
                case 'F':
                    // Do not preventDefault on 'f' as it can break user-gesture trust in some browsers
                    const elem = containerRef.current || video;
                    if (!elem) break;

                    if (!document.fullscreenElement) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const reqFs = elem.requestFullscreen || (elem as any).webkitRequestFullscreen || (elem as any).msRequestFullscreen;
                        if (reqFs) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            reqFs.call(elem).catch((err: any) => console.error("Fullscreen error:", err));
                        }
                    } else {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const exitFs = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).msExitFullscreen;
                        if (exitFs) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            exitFs.call(document).catch((err: any) => console.error("Exit fullscreen error:", err));
                        }
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [videoRef, onSeek]);

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full bg-black"
        >
            {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur z-20">
                    <i className="fa-solid fa-microchip text-3xl text-purple-500 mb-3 animate-pulse"></i>
                    <span className="font-hud text-xs font-bold text-white z-10 tracking-widest">
                        EXTRACTING TRACKS VIA WEBASSEMBLY [{progress}%]
                    </span>
                </div>
            )}
            <video 
                ref={videoRef}
                className="w-full h-full object-contain pointer-events-none"
                src={fileUrl}
                playsInline
                crossOrigin="anonymous"
                onTimeUpdate={() => {
                    if (videoRef.current) onTimeUpdate(videoRef.current.currentTime);
                }}
                onPlay={onPlay}
                onPause={onPause}
                onSeeking={() => {
                    if (videoRef.current) onSeek(videoRef.current.currentTime);
                }}
                onDurationChange={() => {
                    if (videoRef.current && onDurationChange) onDurationChange(videoRef.current.duration);
                }}
            >
                {subtitleUrl && (
                    <track 
                        kind="subtitles" 
                        src={subtitleUrl} 
                        srcLang="en" 
                        label="Extracted Subs" 
                        default 
                    />
                )}
            </video>
        </div>
    );
}
