import { Constants } from '@tosios/common';
import { Server } from 'colyseus';
import express from 'express';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom';

const PORT = Number(process.env.PORT || Constants.WS_PORT);

const app = express();
app.use(express.json());
app.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'tosios-local' });
});

// Game server
const server = new Server({
    server: createServer(app),
    express: app,
});

// Game Rooms
server.define(Constants.ROOM_NAME, GameRoom);

server.onShutdown(() => {
    console.log(`Shutting down...`);
});

server.listen(PORT);
console.log(`Listening on ws://localhost:${PORT}`);
