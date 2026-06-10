import { Socket } from 'socket.io-client';

interface VoicePeer {
    id: string;
    connection: RTCPeerConnection;
    stream: MediaStream;
}

export class WebRTCManager {
    private socket: Socket;
    private localStream: MediaStream | null = null;
    private peers: Map<string, VoicePeer> = new Map();
    private roomId: string;
    private userId: string;
    private onStreamAdded: (peerId: string, stream: MediaStream) => void;
    private onStreamRemoved: (peerId: string) => void;

    constructor(
        socket: Socket, 
        roomId: string, 
        userId: string,
        onStreamAdded: (peerId: string, stream: MediaStream) => void,
        onStreamRemoved: (peerId: string) => void
    ) {
        this.socket = socket;
        this.roomId = roomId;
        this.userId = userId;
        this.onStreamAdded = onStreamAdded;
        this.onStreamRemoved = onStreamRemoved;

        this.socket.on('webrtc:signal-receive', this.handleSignal.bind(this));
        this.socket.on('room:user-left', ({ socketId }) => this.removePeer(socketId));
    }

    public async initializeLocalStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            return this.localStream;
        } catch (e) {
            console.error('Failed to get local voice stream', e);
            return null;
        }
    }

    public async connectToPeer(targetId: string) {
        if (this.peers.has(targetId)) return;

        const connection = this.createPeerConnection(targetId);
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                connection.addTrack(track, this.localStream!);
            });
        }

        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);

        this.socket.emit('webrtc:signal', {
            roomId: this.roomId,
            targetId,
            senderId: this.socket.id,
            signal: { type: 'offer', sdp: offer }
        });
    }

    private createPeerConnection(targetId: string): RTCPeerConnection {
        const connection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        connection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('webrtc:signal', {
                    roomId: this.roomId,
                    targetId,
                    senderId: this.socket.id,
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };

        connection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                const stream = event.streams[0];
                this.onStreamAdded(targetId, stream);
                
                const peer = this.peers.get(targetId);
                if (peer) {
                    peer.stream = stream;
                }
            }
        };

        connection.onconnectionstatechange = () => {
            if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
                this.removePeer(targetId);
            }
        };

        this.peers.set(targetId, { id: targetId, connection, stream: new MediaStream() });
        return connection;
    }

    private async handleSignal(data: { senderId: string; signal: { type: string; sdp?: unknown; candidate?: unknown } }) {
        const { senderId, signal } = data;

        let peer = this.peers.get(senderId);
        if (!peer && signal.type === 'offer') {
            const connection = this.createPeerConnection(senderId);
            peer = this.peers.get(senderId);
            
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    connection.addTrack(track, this.localStream!);
                });
            }
        }

        if (!peer) return;

        if (signal.type === 'offer') {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(signal.sdp as RTCSessionDescriptionInit));
            const answer = await peer.connection.createAnswer();
            await peer.connection.setLocalDescription(answer);
            
            this.socket.emit('webrtc:signal', {
                roomId: this.roomId,
                targetId: senderId,
                senderId: this.socket.id,
                signal: { type: 'answer', sdp: answer }
            });
        } else if (signal.type === 'answer') {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(signal.sdp as RTCSessionDescriptionInit));
        } else if (signal.type === 'candidate') {
            await peer.connection.addIceCandidate(new RTCIceCandidate(signal.candidate as RTCIceCandidateInit));
        }
    }

    public removePeer(peerId: string) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.connection.close();
            this.peers.delete(peerId);
            this.onStreamRemoved(peerId);
        }
    }

    public destroy() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
        }
        for (const peer of this.peers.values()) {
            peer.connection.close();
        }
        this.peers.clear();
        this.socket.off('webrtc:signal-receive');
        this.socket.off('room:user-left');
    }
}
