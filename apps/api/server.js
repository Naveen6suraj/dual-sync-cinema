const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const rooms = new Map();

app.post('/api/rooms', (req, res) => {
    const { roomId, name, mediaUrl } = req.body;
    if (!roomId) return res.status(400).json({ error: 'Room ID is required' });
    
    const newState = {
        roomId,
        mediaUrl: mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: name || 'Demo Movie',
        isPlaying: false,
        currentTime: 0,
        lastUpdatedServerTime: Date.now()
    };
    rooms.set(roomId, newState);
    res.status(201).json(newState);
});

// YouTube Proxy Route for Dual Audio Bypass
app.get('/api/proxy/youtube', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url || !ytdl.validateURL(url)) {
            return res.status(400).send("Invalid YouTube URL");
        }
        
        const info = await ytdl.getInfo(url);
        // Find the best merged format containing both video and audio
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
        
        if (!format) {
            return res.status(404).send("No suitable format found");
        }
        
        res.header('Content-Type', 'video/mp4');
        ytdl(url, { format: format }).pipe(res);
    } catch (err) {
        console.error("YouTube Proxy Error:", err);
        res.status(500).send("Failed to proxy YouTube stream");
    }
});

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // 1. NTP Handshake response
    socket.on('ntp:ping', (data) => {
        socket.emit('ntp:pong', {
            clientTime: data.clientTime,
            serverTime: Date.now()
        });
    });
    
    // 2. Room Join
    socket.on('room:join', (data) => {
        const { roomId, userId } = data;
        socket.join(roomId);
        console.log(`User ${userId} joined room: ${roomId}`);
        
        let roomState = rooms.get(roomId);
        if (!roomState) {
            roomState = {
                roomId,
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                title: 'Demo Trailer',
                isPlaying: false,
                currentTime: 0,
                lastUpdatedServerTime: Date.now()
            };
            rooms.set(roomId, roomState);
        }
        
        socket.emit('room:joined', {
            state: roomState,
            ownerId: userId
        });
        
        io.to(roomId).emit('room:users-changed', {
            users: Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        });
    });

    // 3. Playback coordinate sync
    socket.on('sync:state', (data) => {
        const { roomId, isPlaying, currentTime } = data;
        const roomState = rooms.get(roomId);
        if (roomState) {
            roomState.isPlaying = isPlaying;
            roomState.currentTime = currentTime;
            roomState.lastUpdatedServerTime = Date.now();
            socket.to(roomId).emit('sync:update', {
                isPlaying: roomState.isPlaying,
                currentTime: roomState.currentTime,
                serverTime: roomState.lastUpdatedServerTime
            });
        }
    });

    // 4. Seek sync
    socket.on('sync:seek', (data) => {
        const { roomId, targetTime } = data;
        const roomState = rooms.get(roomId);
        if (roomState) {
            roomState.currentTime = targetTime;
            roomState.lastUpdatedServerTime = Date.now();
            socket.to(roomId).emit('sync:seek-update', {
                targetTime: roomState.currentTime,
                serverTime: roomState.lastUpdatedServerTime
            });
        }
    });

    // 5. Pause sync
    socket.on('sync:pause', (data) => {
        const { roomId, currentTime } = data;
        const roomState = rooms.get(roomId);
        if (roomState) {
            roomState.isPlaying = false;
            roomState.currentTime = currentTime;
            roomState.lastUpdatedServerTime = Date.now();
            socket.to(roomId).emit('sync:pause-update', {
                currentTime: roomState.currentTime,
                serverTime: roomState.lastUpdatedServerTime
            });
        }
    });

    // 6. WebRTC Voice Signaling
    socket.on('webrtc:signal', (data) => {
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
    console.log(`DualSync Cinema Pro backend running on port ${PORT}`);
});
