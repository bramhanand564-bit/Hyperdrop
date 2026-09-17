import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map<string, Set<WebSocket>>();

function generateRoomCode(): string {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

function broadcastToOthers(sender: WebSocket, room: string, message: unknown): void {
  const peers = rooms.get(room);
  if (!peers) return;

  const serialized = JSON.stringify(message);
  for (const peer of peers) {
    if (peer !== sender && peer.readyState === WebSocket.OPEN) {
      peer.send(serialized);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: string | null = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString()) as {
        type?: string;
        room?: unknown;
        payload?: unknown;
      };

      switch (data.type) {
        case 'create_room': {
          const room = generateRoomCode();
          rooms.set(room, new Set([ws]));
          currentRoom = room;
          ws.send(JSON.stringify({ type: 'room_created', room }));
          break;
        }

        case 'join_room': {
          const room = typeof data.room === 'string' ? data.room : '';
          const peers = rooms.get(room);

          if (!peers || peers.size >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room full ya invalid hai' }));
            break;
          }

          peers.add(ws);
          currentRoom = room;
          ws.send(JSON.stringify({ type: 'joined' }));
          broadcastToOthers(ws, room, { type: 'peer_joined' });
          break;
        }

        case 'signal': {
          if (currentRoom) {
            broadcastToOthers(ws, currentRoom, {
              type: 'signal',
              payload: data.payload,
            });
          }
          break;
        }
      }
    } catch (error) {
      console.error('Invalid WebSocket message', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    const room = currentRoom;
    if (!room) return;

    const peers = rooms.get(room);
    if (!peers) return;

    peers.delete(ws);
    broadcastToOthers(ws, room, { type: 'peer_left' });

    if (peers.size === 0) {
      rooms.delete(room);
    }
    currentRoom = null;
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'HyperDrop signaling server' });
});

const PORT = Number(process.env.PORT) || 8080;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
