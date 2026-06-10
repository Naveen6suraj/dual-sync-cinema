import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import authRoutes from './routes/auth.routes';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(helmet());
app.use(cors({ origin: '*' }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use(express.json());
app.use('/api/auth', authRoutes);

import play from 'play-dl';

app.get('/api/stream/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await play.video_info(url);
        
        // Find best audio+video format
        let format = info.format.find((f: any) => f.hasVideo && f.hasAudio);
        
        if (!format) {
            console.warn('No combined audio/video format found. Prioritizing audio-only stream so music plays!');
            format = info.format.find((f: any) => f.hasAudio) || info.format.find((f: any) => f.hasVideo) || info.format[0];
        }

        if (!format || !format.url) {
            res.status(404).send('No suitable format found');
            return;
        }

        const https = require('https');
        const headers: any = {};
        if (req.headers.range) {
            headers.Range = req.headers.range;
        }

        https.get(format.url, { headers }, (response: any) => {
            res.writeHead(response.statusCode || 200, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes',
                ...(response.headers['content-length'] && { 'Content-Length': response.headers['content-length'] }),
                ...(response.headers['content-range'] && { 'Content-Range': response.headers['content-range'] }),
            });
            response.pipe(res);
        }).on('error', (err: any) => {
            console.error('Proxy stream error:', err);
            res.status(500).send('Streaming proxy error');
        });

    } catch (e: any) {
        console.error('YTDL Error:', e.message);
        res.status(500).send('Streaming error');
    }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const prisma = new PrismaClient();

// Setup Redis Client
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// In-memory fallback if Redis is unavailable
const memoryRooms: Record<string, RoomState> = {};
let isRedisConnected = false;

redisClient.on('error', (err) => {
    console.log('Redis Client Error', err.message);
    isRedisConnected = false;
});

// Connect Redis before handling requests
(async () => {
    try {
        await redisClient.connect();
        isRedisConnected = true;
        console.log('Connected to Redis for Room State');
    } catch (e) {
        console.error('Failed to connect to Redis, using in-memory fallback');
        isRedisConnected = false;
    }
})();

interface RoomState {
    roomId: string;
    mediaUrl: string;
    title: string;
    isPlaying: boolean;
    currentTime: number;
    lastUpdatedServerTime: number;
}

const getRoomState = async (roomId: string): Promise<RoomState | null> => {
    if (isRedisConnected) {
        try {
            const data = await redisClient.get(`room:${roomId}`);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Redis get error', e);
        }
    }
    return memoryRooms[roomId] || null;
};

const setRoomState = async (roomId: string, state: RoomState) => {
    if (isRedisConnected) {
        try {
            await redisClient.set(`room:${roomId}`, JSON.stringify(state), { EX: 86400 });
            return;
        } catch (e) {
            console.error('Redis set error', e);
        }
    }
    memoryRooms[roomId] = state;
};

app.post('/api/rooms', async (req, res) => {
    const { roomId, name, mediaUrl } = req.body;
    if (!roomId) {
        res.status(400).json({ error: 'Room ID is required' });
        return;
    }
    
    // Save to Postgres
    const hostId = req.body.hostId || 'anonymous'; // Replace with JWT user later
    let roomRecord;
    try {
        // Just checking if host exists, if not we will skip Postgres for demo purposes 
        // until full JWT integration is hooked up.
        const host = await prisma.user.findUnique({ where: { id: hostId }});
        if (host) {
            roomRecord = await prisma.room.create({
                data: {
                    id: roomId,
                    name: name || 'Demo Movie',
                    hostId: host.id,
                    mediaUrl: mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                }
            });
        }
    } catch(e) {
        console.error('Failed to create postgres room:', e);
    }

    const newState: RoomState = {
        roomId,
        mediaUrl: mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: name || 'Demo Movie',
        isPlaying: false,
        currentTime: 0,
        lastUpdatedServerTime: Date.now()
    };
    
    await setRoomState(roomId, newState);
    res.status(201).json(newState);
});

io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    socket.on('ntp:ping', (data: { clientTime: number }) => {
        socket.emit('ntp:pong', {
            clientTime: data.clientTime,
            serverTime: Date.now()
        });
    });
    
    socket.on('room:join', async (data: { roomId: string; userId: string }) => {
        const { roomId, userId } = data;
        socket.join(roomId);
        console.log(`User ${userId} (${socket.id}) joined room: ${roomId}`);
        
        let roomState = await getRoomState(roomId);
        if (!roomState) {
            roomState = {
                roomId,
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                title: 'Demo Trailer',
                isPlaying: false,
                currentTime: 0,
                lastUpdatedServerTime: Date.now()
            };
            await setRoomState(roomId, roomState);
        }
        
        socket.emit('room:joined', {
            state: roomState,
            ownerId: userId 
        });
        
        io.to(roomId).emit('room:users-changed', {
            users: Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        });
    });

    socket.on('sync:state', async (data: { roomId: string; isPlaying: boolean; currentTime: number; clientTime: number }) => {
        const { roomId, isPlaying, currentTime } = data;
        const roomState = await getRoomState(roomId);
        
        if (roomState) {
            roomState.isPlaying = isPlaying;
            roomState.currentTime = currentTime;
            roomState.lastUpdatedServerTime = Date.now();
            
            await setRoomState(roomId, roomState);
            
            socket.to(roomId).emit('sync:update', {
                isPlaying: roomState.isPlaying,
                currentTime: roomState.currentTime,
                serverTime: roomState.lastUpdatedServerTime
            });
        }
    });

    socket.on('sync:seek', async (data: { roomId: string; targetTime: number; clientTime: number }) => {
        const { roomId, targetTime } = data;
        const roomState = await getRoomState(roomId);
        
        if (roomState) {
            roomState.currentTime = targetTime;
            roomState.lastUpdatedServerTime = Date.now();
            
            await setRoomState(roomId, roomState);
            
            socket.to(roomId).emit('sync:seek-update', {
                targetTime: roomState.currentTime,
                serverTime: roomState.lastUpdatedServerTime
            });
        }
    });

    socket.on('sync:pause', async (data: { roomId: string; currentTime: number; clientTime: number }) => {
        const { roomId, currentTime } = data;
        const roomState = await getRoomState(roomId);
        
        if (roomState) {
            roomState.isPlaying = false;
            roomState.currentTime = currentTime;
            roomState.lastUpdatedServerTime = Date.now();
            
            await setRoomState(roomId, roomState);
            
            socket.to(roomId).emit('sync:pause-update', {
                currentTime: roomState.currentTime,
                serverTime: roomState.lastUpdatedServerTime
            });
        }
    });

    socket.on('webrtc:signal', (data: { roomId: string; targetId: string; senderId: string; signal: any }) => {
        const { targetId, senderId, signal } = data;
        io.to(targetId).emit('webrtc:signal-receive', {
            senderId,
            signal
        });
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(roomId => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('room:user-left', { socketId: socket.id });
            }
        });
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`DualSync Cinema Pro signaling backend active on port ${PORT}`);
});
