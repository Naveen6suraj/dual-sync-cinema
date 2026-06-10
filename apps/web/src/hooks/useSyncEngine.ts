import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SyncState {
    isPlaying: boolean;
    currentTime: number;
    serverTime: number;
}

export function useSyncEngine(
    roomId: string,
    userId: string,
    isHost: boolean,
    videoElementRef: React.RefObject<HTMLVideoElement | null>
) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [ping, setPing] = useState<number>(0);
    const [syncOffset, setSyncOffset] = useState<number>(0); // Server vs Local time offset (theta)
    const [syncScore, setSyncScore] = useState<number>(100); // 0-100 rating of sync quality
    
    const ntpOffsetRef = useRef<number>(0);
    const isSeekingRef = useRef<boolean>(false);
    const lastSyncStateRef = useRef<SyncState | null>(null);

    // 1. Establish Socket Connection and NTP Loop
    useEffect(() => {
        const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket']
        });
        
        socketInstance.on('connect', () => {
            setSocket(socketInstance);
            console.log('Sync Engine Socket connected:', socketInstance.id);
            socketInstance.emit('room:join', { roomId, userId });
            
            // Run NTP synchronization cycle
            runNtpHandshake(socketInstance, 5);
        });
        
        socketInstance.on('disconnect', (reason) => {
            console.warn('Socket disconnected:', reason);
        });
        
        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Periodic NTP keepalive sync to adjust for network jitter (every 30 seconds)
        const ntpInterval = setInterval(() => {
            if (socketInstance.connected) {
                runNtpHandshake(socketInstance, 1);
            }
        }, 30000);

        return () => {
            socketInstance.disconnect();
            clearInterval(ntpInterval);
        };
    }, [roomId, userId]);

    // 2. Perform Network Time Protocol (NTP) Sync
    function runNtpHandshake(socketClient: Socket, sweeps: number) {
        let count = 0;
        const offsets: number[] = [];
        const rtts: number[] = [];

        const pingServer = () => {
            const t1 = Date.now();
            socketClient.emit('ntp:ping', { clientTime: t1 });
            
            socketClient.once('ntp:pong', (data: { clientTime: number; serverTime: number }) => {
                const t4 = Date.now();
                const rtt = t4 - data.clientTime;
                // Clock Offset (theta) calculation
                const offset = data.serverTime - (data.clientTime + t4) / 2;
                
                offsets.push(offset);
                rtts.push(rtt);
                count++;

                if (count < sweeps) {
                    setTimeout(pingServer, 100);
                } else {
                    // Find the sweep with the lowest Round Trip Time (lowest jitter)
                    const minIndex = rtts.indexOf(Math.min(...rtts));
                    ntpOffsetRef.current = offsets[minIndex];
                    setSyncOffset(offsets[minIndex]);
                    setPing(Math.round(rtts[minIndex] / 2)); // Latency is RTT / 2
                }
            });
        };

        pingServer();
    };

    // Helper: translate Local Time to Server Time
    function getServerTime() { return Date.now() + ntpOffsetRef.current; }

    // 3. Socket Event Listeners for Synchronization Updates (Follower Mode)
     
    useEffect(() => {
        if (!socket || isHost) return;

        // Handles room joined base coordinates
        socket.on('room:joined', (data: { state: SyncState }) => {
            handleIncomingSync(data.state);
        });

        // Play / Pause / Rate Sync Broadcasters
        socket.on('sync:update', (data: SyncState) => {
            handleIncomingSync(data);
        });

        socket.on('sync:seek-update', (data: { targetTime: number; serverTime: number }) => {
            const video = videoElementRef.current;
            if (!video) return;
            
            isSeekingRef.current = true;
            video.currentTime = calculateFuturePosition(data.targetTime, data.serverTime);
            setTimeout(() => { isSeekingRef.current = false; }, 200);
        });

        socket.on('sync:pause-update', (data: { currentTime: number }) => {
            const video = videoElementRef.current;
            if (!video) return;
            
            video.pause();
            video.currentTime = data.currentTime;
        });

        return () => {
            socket.off('room:joined');
            socket.off('sync:update');
            socket.off('sync:seek-update');
            socket.off('sync:pause-update');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, isHost]);

    // 4. Calculate coordinates adjusting for server time passage
    function calculateFuturePosition(targetTime: number, serverTime: number) {
        const passage = (getServerTime() - serverTime) / 1000; // time elapsed in seconds
        return targetTime + Math.max(0, passage);
    };

    function handleIncomingSync(state: SyncState) {
        const video = videoElementRef.current;
        if (!video) return;

        lastSyncStateRef.current = state;
        
        // Sync Play/Pause state
        if (state.isPlaying && video.paused) {
            video.play().catch(e => console.log('Autoplay deferred:', e));
        } else if (!state.isPlaying && !video.paused) {
            video.pause();
        }

        if (state.isPlaying) {
            const targetPos = calculateFuturePosition(state.currentTime, state.serverTime);
            const drift = Math.abs(video.currentTime - targetPos);

            if (drift > 2.0) {
                // Hard desync: force buffer seek
                isSeekingRef.current = true;
                video.currentTime = targetPos;
                setTimeout(() => { isSeekingRef.current = false; }, 200);
                setSyncScore(60);
            } else {
                // Micro-adjust alignment using playbackRate (Adaptive Sync Curve)
                const delta = targetPos - video.currentTime; // negative means video is ahead
                adjustPlaybackRate(delta);
                
                // Calculate sync score
                const score = Math.max(0, Math.min(100, 100 - Math.round(Math.abs(delta) * 100)));
                setSyncScore(score);
            }
        } else {
            video.currentTime = state.currentTime;
            video.playbackRate = 1.0;
        }
    };

    function adjustPlaybackRate(delta: number) {
        const video = videoElementRef.current;
        if (!video) return;

        if (Math.abs(delta) <= 0.01) { // 10ms threshold
            video.playbackRate = 1.0; // Perfect Sync
        } else if (delta > 0) {
            // Client is lagging, speed up video playback (Max 1.15x)
            video.playbackRate = Math.min(1.15, 1.0 + delta * 0.1);
        } else {
            // Client is ahead, slow down video playback (Min 0.85x)
            video.playbackRate = Math.max(0.85, 1.0 + delta * 0.1);
        }
    };

    // 5. User action emitter (Host Mode)
    function handleHostAction(type: 'play' | 'pause' | 'seek', customTime?: number) {
        const video = videoElementRef.current;
        if (!socket || !isHost || !video) return;

        const time = customTime !== undefined ? customTime : video.currentTime;
        const now = getServerTime();

        if (type === 'play') {
            socket.emit('sync:state', {
                roomId,
                isPlaying: true,
                currentTime: time,
                clientTime: now
            });
        } else if (type === 'pause') {
            socket.emit('sync:pause', {
                roomId,
                currentTime: time,
                clientTime: now
            });
        } else if (type === 'seek') {
            socket.emit('sync:seek', {
                roomId,
                targetTime: time,
                clientTime: now
            });
        }
    };

    return {
        socket,
        ping,
        syncOffset,
        syncScore,
        handleHostAction,
        isSeeking: () => isSeekingRef.current
    };
}
