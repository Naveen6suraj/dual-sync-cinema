import { useEffect, useRef, useState } from 'react';

export interface Listener {
    id: string;
    name: string;
    deviceId: string;
    volume: number; // 0.0 - 1.0
    delayMs: number; // 0 - 1000
    audioSource: 'primary' | 'secondary';
    delayNode: DelayNode | null;
    gainNode: GainNode | null;
    streamDest: MediaStreamAudioDestinationNode | null;
    audioElement: HTMLAudioElement | null;
}

export function useAudioEngine(
    videoElementRef: React.RefObject<HTMLVideoElement | null>,
    secondaryAudioRef: React.RefObject<HTMLAudioElement | null>
) {
    const [listeners, setListeners] = useState<Listener[]>([]);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(false);
    
    const mainCtxRef = useRef<AudioContext | null>(null);
    const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const secondarySourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    // 1. Enumerate available audio output devices
    const updateDevices = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                console.warn('enumerateDevices is not supported in this context.');
                return;
            }
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const outputs = allDevices.filter(d => d.kind === 'audiooutput');
            setDevices(outputs);
        } catch (e) {
            console.error('Error scanning system audio outputs:', e);
        }
    };

    // Request permissions to display human-readable audio device labels
    const requestAudioPermissions = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('getUserMedia is not supported in this context.');
                return false;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Immediately shut down microphone
            setIsPermissionGranted(true);
            await updateDevices();
            return true;
        } catch (e) {
            console.error('Permission denied or failed:', e);
            setIsPermissionGranted(false);
            return false;
        }
    };

    // Scan devices on mount
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        updateDevices();
        // Listen for new headphones connected dynamically
        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', updateDevices);
            return () => {
                navigator.mediaDevices.removeEventListener('devicechange', updateDevices);
            };
        }
    }, []);

    // 2. Initialize Main Audio Context and Stream Splits
    const initMainAudioContext = () => {
        if (mainCtxRef.current) {
            listeners.forEach(l => {
                if (!l.audioElement) {
                    connectListenerPipeline(l);
                }
            });
            return;
        }
        const video = videoElementRef.current;
        const secondaryAudio = secondaryAudioRef.current;
        if (!video || !secondaryAudio) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const mainCtx = new AudioContextClass({ latencyHint: 'balanced' });
        mainCtxRef.current = mainCtx;

        // Capture streams but do not connect them to the default destination.
        // We will branch them out to dedicated listener streams.
        mediaSourceRef.current = mainCtx.createMediaElementSource(video);
        secondarySourceRef.current = mainCtx.createMediaElementSource(secondaryAudio);
    };

    const resumeAllAudioContexts = async () => {
        if (mainCtxRef.current && mainCtxRef.current.state === 'suspended') {
            await mainCtxRef.current.resume();
        }
        for (const l of listeners) {
            if (l.audioElement && l.audioElement.paused) {
                l.audioElement.play().catch(e => console.warn("Auto-play deferred:", e));
            }
        }
    };

    // 3. Connect/Rebuild Listener Node Connections using HTMLAudioElement sink routing
    const connectListenerPipeline = (listener: Listener) => {
        if (!mainCtxRef.current) return;

        const mainCtx = mainCtxRef.current;

        // Select matching source node (primary or secondary)
        const sourceNode = listener.audioSource === 'secondary' && secondarySourceRef.current 
            ? secondarySourceRef.current 
            : mediaSourceRef.current;

        if (!sourceNode) return;

        try {
            // Keep to stereo for safest Bluetooth routing compatibility
            const targetChannels = 2;

            // Configure DSP modules in the MAIN context
            const delayNode = mainCtx.createDelay(2.0);
            delayNode.delayTime.value = listener.delayMs / 1000;
            delayNode.channelCount = targetChannels;
            delayNode.channelInterpretation = 'speakers';

            const gainNode = mainCtx.createGain();
            gainNode.gain.value = listener.volume;
            gainNode.channelCount = targetChannels;
            gainNode.channelInterpretation = 'speakers';

            const streamDest = mainCtx.createMediaStreamDestination();
            streamDest.channelCount = targetChannels;
            streamDest.channelInterpretation = 'speakers';

            // Connect graph: source -> delay -> gain -> dedicated stream destination
            sourceNode.connect(delayNode);
            delayNode.connect(gainNode);
            gainNode.connect(streamDest);

            // Create HTMLAudioElement to play the stream and route it via setSinkId
            const audioElement = new Audio();
            audioElement.srcObject = streamDest.stream;
            
            // Apply sinkId to route to the specific Bluetooth device
            if (listener.deviceId && listener.deviceId !== 'default' && typeof (audioElement as any).setSinkId === 'function') {
                (audioElement as any).setSinkId(listener.deviceId).catch((err: any) => {
                    console.warn(`Failed setSinkId on audio element for ${listener.name}:`, err);
                });
            }

            // Play the stream pipeline unconditionally so it acts as a live pipe
            audioElement.play().catch(e => console.warn("Auto-play listener audio deferred:", e));

            // Store back to state reference
            listener.delayNode = delayNode;
            listener.gainNode = gainNode;
            listener.streamDest = streamDest;
            listener.audioElement = audioElement;

        } catch (err) {
            console.error(`Failed mapping audio stream for ${listener.name} to ${listener.deviceId}:`, err);
        }
    };

    // 4. API Controllers
    const addListener = (name: string, deviceId: string = 'default') => {
        initMainAudioContext();
        resumeAllAudioContexts();

        const newListener: Listener = {
            id: 'listener_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            name,
            deviceId,
            volume: 1.0,
            delayMs: 0,
            audioSource: 'primary',
            delayNode: null,
            gainNode: null,
            streamDest: null,
            audioElement: null
        };

        if (mainCtxRef.current) {
            connectListenerPipeline(newListener);
        }

        setListeners(prev => [...prev, newListener]);
    };

    const removeListener = (id: string) => {
        setListeners(prev => {
            const list = [...prev];
            const idx = list.findIndex(l => l.id === id);
            if (idx !== -1) {
                const target = list[idx];
                if (target.audioElement) {
                    target.audioElement.pause();
                    target.audioElement.srcObject = null;
                }
                if (target.delayNode) target.delayNode.disconnect();
                if (target.gainNode) target.gainNode.disconnect();
                if (target.streamDest) target.streamDest.disconnect();
                list.splice(idx, 1);
            }
            return list;
        });
    };

    const updateVolume = (id: string, vol: number) => {
        setListeners(prev =>
            prev.map(l => {
                if (l.id === id) {
                    const newVol = Math.max(0, Math.min(1, vol));
                    if (l.gainNode && mainCtxRef.current) {
                        l.gainNode.gain.setValueAtTime(newVol, mainCtxRef.current.currentTime);
                    }
                    return { ...l, volume: newVol };
                }
                return l;
            })
        );
    };

    const updateDelay = (id: string, delayMs: number) => {
        setListeners(prev =>
            prev.map(l => {
                if (l.id === id) {
                    const ms = Math.max(0, Math.min(2000, delayMs));
                    if (l.delayNode && mainCtxRef.current) {
                        l.delayNode.delayTime.setValueAtTime(ms / 1000, mainCtxRef.current.currentTime);
                    }
                    return { ...l, delayMs: ms };
                }
                return l;
            })
        );
    };

    const updateDevice = async (id: string, deviceId: string) => {
        setListeners(prev =>
            prev.map(l => {
                if (l.id === id) {
                    const updated = { ...l, deviceId };
                    if (updated.audioElement) {
                        if (typeof (updated.audioElement as any).setSinkId === 'function') {
                            (updated.audioElement as any).setSinkId(deviceId)
                                .then(() => console.log(`Device sink switched to: ${deviceId}`))
                                .catch((err: any) => {
                                    console.warn('Failed dynamic sink ID map, rebuilding pipeline:', err);
                                    // Teardown and rebuild
                                    updated.audioElement?.pause();
                                    updated.audioElement!.srcObject = null;
                                    if (updated.delayNode) updated.delayNode.disconnect();
                                    if (updated.gainNode) updated.gainNode.disconnect();
                                    if (updated.streamDest) updated.streamDest.disconnect();
                                    
                                    updated.audioElement = null;
                                    updated.delayNode = null;
                                    updated.gainNode = null;
                                    updated.streamDest = null;
                                    connectListenerPipeline(updated);
                                });
                        }
                    } else {
                        connectListenerPipeline(updated);
                    }
                    return updated;
                }
                return l;
            })
        );
    };

    const updateAudioSource = (id: string, source: 'primary' | 'secondary') => {
        setListeners(prev =>
            prev.map(l => {
                if (l.id === id) {
                    const updated = { ...l, audioSource: source };
                    // Tear down previous pipeline and re-route
                    if (updated.audioElement) {
                        updated.audioElement.pause();
                        updated.audioElement.srcObject = null;
                    }
                    if (updated.delayNode) updated.delayNode.disconnect();
                    if (updated.gainNode) updated.gainNode.disconnect();
                    if (updated.streamDest) updated.streamDest.disconnect();
                    
                    updated.audioElement = null;
                    updated.delayNode = null;
                    updated.gainNode = null;
                    updated.streamDest = null;
                    
                    connectListenerPipeline(updated);
                    return updated;
                }
                return l;
            })
        );
    };

    const playCalibrationSound = (listener: Listener) => {
        initMainAudioContext();
        resumeAllAudioContexts();
        
        if (!listener.audioElement) {
            connectListenerPipeline(listener);
        }

        if (mainCtxRef.current && listener.delayNode) {
            const now = mainCtxRef.current.currentTime;
            const osc = mainCtxRef.current.createOscillator();
            const gainNode = mainCtxRef.current.createGain();

            osc.frequency.setValueAtTime(1000, now);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
            gainNode.gain.setValueAtTime(0.4, now + 0.07);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.08);

            osc.connect(gainNode);
            gainNode.connect(listener.delayNode); // Passes through the delay node to test offset

            osc.start(now);
            osc.stop(now + 0.08);
        }
    };

    // Clean up all nodes on unmount
    useEffect(() => {
        return () => {
            listeners.forEach(l => {
                if (l.audioElement) {
                    l.audioElement.pause();
                    l.audioElement.srcObject = null;
                }
                if (l.delayNode) l.delayNode.disconnect();
                if (l.gainNode) l.gainNode.disconnect();
                if (l.streamDest) l.streamDest.disconnect();
            });
            if (mainCtxRef.current) mainCtxRef.current.close().catch(() => {});
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
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
        updateAudioSource,
        playCalibrationSound
    };
}
