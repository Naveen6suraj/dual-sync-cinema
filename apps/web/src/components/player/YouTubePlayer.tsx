import React, { useMemo } from 'react';
import LocalMediaPlayer from './LocalMediaPlayer';

export const extractYouTubeId = (url: string): string | null => {
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live|watch)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
};

interface YouTubePlayerProps {
    url: string;
    isPlaying: boolean;
    currentTime: number;
    playbackRate: number;
    volume: number;
    onTimeUpdate: (time: number) => void;
    onPlay: () => void;
    onPause: () => void;
    onSeek: (time: number) => void;
    isHost: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function YouTubePlayer({
    url,
    isPlaying,
    currentTime,
    playbackRate,
    volume,
    onTimeUpdate,
    onPlay,
    onPause,
    onSeek,
    isHost,
    videoRef
}: YouTubePlayerProps) {
    const videoId = useMemo(() => extractYouTubeId(url), [url]);

    if (!videoId) {
        return (
            <div className="relative w-full h-full bg-black">
                <div className="absolute inset-0 flex items-center justify-center text-red-500 font-hud z-20 bg-black/80">
                    <i className="fa-solid fa-triangle-exclamation mr-2"></i> Invalid YouTube URL
                </div>
            </div>
        );
    }

    // We stream through our own backend proxy to completely bypass CORS restrictions!
    // This allows AudioContext manipulation and Bluetooth delay syncing!
    const backendStreamUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/stream/${videoId}`;

    return (
        <LocalMediaPlayer
            fileUrl={backendStreamUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            playbackRate={playbackRate}
            volume={volume}
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
            onSeek={onSeek}
            isHost={isHost}
            videoRef={videoRef}
        />
    );
}
