import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useFFmpeg() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const ffmpegRef = useRef<FFmpeg | null>(null);

    const load = async () => {
        if (isLoaded) return;
        
        setIsProcessing(true);
        try {
            const ffmpeg = new FFmpeg();
            ffmpegRef.current = ffmpeg;
            
            ffmpeg.on('progress', ({ progress }) => {
                setProgress(Math.round(progress * 100));
            });

            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            setIsLoaded(true);
        } catch (error) {
            console.error('Failed to load ffmpeg.wasm:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const extractSubtitles = useCallback(async (file: File): Promise<string | null> => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg || !isLoaded) return null;

        setIsProcessing(true);
        setProgress(0);
        
        try {
            await ffmpeg.writeFile(file.name, await fetchFile(file));
            
            // Extract subtitle track 0 to a VTT file
            // -map 0:s:0 selects the first subtitle track
            await ffmpeg.exec(['-i', file.name, '-map', '0:s:0', 'output.vtt']);
            
            const data = await ffmpeg.readFile('output.vtt');
            
            // Clean up
            await ffmpeg.deleteFile(file.name);
            await ffmpeg.deleteFile('output.vtt');
            
            if (data) {
                const text = new TextDecoder().decode(data as Uint8Array);
                return text;
            }
            return null;
        } catch (err) {
            console.error('Extraction error:', err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [isLoaded]);

    return {
        isLoaded,
        progress,
        isProcessing,
        load,
        extractSubtitles
    };
}
