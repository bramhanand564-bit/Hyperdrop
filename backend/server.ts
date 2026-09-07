import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Room codes aur unke connected devices ko store karne ke liye
const rooms = new Map<string, Set<WebSocket>>();

const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

wss.on('connection', (ws) => {
  let currentRoom: string | null = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { type, room, payload } = data;

      switch (type) {
        case 'create_room':
          const newRoom = generateRoomCode();
          rooms.set(newRoom, new Set([ws]));
          currentRoom = newRoom;
          ws.send(JSON.stringify({ type: 'room_created', room: newRoom }));
          break;

        case 'join_room':
          if (rooms.has(room) && rooms.get(room)!.size < 2) {
            rooms.get(room)!.add(ws);
            currentRoom = room;
            ws.send(JSON.stringify({ type: 'joined' }));
            // Sender ko batana ki receiver aa gaya hai
            broadcastToOthers(ws, currentRoom, { type: 'peer_joined' });
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Room full ya invalid hai' }));
          }
          break;

        case 'signal': // WebRTC connection (Offer, Answer, ICE Candidates)
          if (currentRoom) {
            broadcastToOthers(ws, currentRoom, { type: 'signal', payload });
          }
          break;
      }
    } catch (e) {
      console.error('Invalid message');
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom)!.delete(ws);
      broadcastToOthers(ws, currentRoom, { type: 'peer_left' });
      if (rooms.get(currentRoom)!.size === 0) {
        rooms.delete(currentRoom); // Agar dono chale gaye toh room delete kar do
      }
    }
  });
});

function broadcastToOthers(sender: WebSocket, room: string, message: any) {
  const peers = rooms.get(room);
  if (peers) {
    peers.forEach(peer => {
      if (peer !== sender && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify(message));
      }
    });
  }
}

app.get('/health', (req, res) => res.status(200).send('HyperDrop Signaling Server is Running!'));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
