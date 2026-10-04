export class NetworkManager {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.role = null;
        this.callbacks = {};
        this.isConnected = false;
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.emit('connected');
                resolve();
            };

            this.ws.onmessage = (event) => {
                let msg;
                try {
                    msg = JSON.parse(event.data);
                } catch {
                    return;
                }
                this.handleMessage(msg);
            };

            this.ws.onerror = (err) => {
                this.emit('error', 'サーバーとの通信でエラーが発生しました。');
                reject(err);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.emit('disconnected');
            };
        });
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'room_created':
                this.roomId = msg.roomId;
                this.role = msg.role;
                this.emit('room_created', { roomId: msg.roomId, role: msg.role });
                break;

            case 'room_joined':
                this.roomId = msg.roomId;
                this.role = msg.role;
                this.emit('room_joined', { roomId: msg.roomId, role: msg.role });
                break;

            case 'opponent_joined':
                this.emit('opponent_joined', { role: msg.role });
                break;

            case 'battle_countdown':
                this.emit('battle_countdown', { seed: msg.seed, count: msg.count });
                break;

            case 'opponent_state':
                this.emit('opponent_state', msg);
                break;

            case 'incoming_garbage':
                this.emit('incoming_garbage', { lines: msg.lines, holeCol: msg.holeCol });
                break;

            case 'battle_result':
                this.emit('battle_result', { result: msg.result, winner: msg.winner });
                break;

            case 'opponent_left':
                this.emit('opponent_left');
                break;

            case 'rematch_offered':
                this.emit('rematch_offered');
                break;

            case 'error':
                this.emit('error', msg.message);
                break;
        }
    }

    send(type, payload = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...payload }));
        }
    }

    createRoom() {
        this.send('create_room');
    }

    joinRoom(roomId) {
        this.send('join_room', { roomId });
    }

    startBattle() {
        this.send('start_battle');
    }

    sendGameState(state) {
        this.send('game_state', state);
    }

    sendGarbage(lines, holeCol) {
        this.send('garbage_attack', { lines, holeCol });
    }

    sendGameOver() {
        this.send('game_over');
    }

    sendRematchRequest() {
        this.send('rematch_request');
    }

    sendRematchAccept() {
        this.send('rematch_accept');
    }

    leaveRoom() {
        this.send('leave_room');
        this.roomId = null;
        this.role = null;
    }
}
