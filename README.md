# HyperDrop

Internet file-transfer starter: browser-to-browser P2P transfer using WebRTC DataChannel, with a small WebSocket signaling server.

## What it does
- Create a 6-digit transfer room
- Share the code with the receiver
- WebRTC peer-to-peer transfer
- Chunked streaming (64 KiB chunks)
- Backpressure-aware sending
- SHA-256 hash verification
- Pause/cancel controls
- STUN/TURN configuration through environment variables
- No permanent file storage by default

## Run locally

Requirements: Node.js 20+

```bash
npm install
npm run dev
```

Then open:
- Web app: http://localhost:3000
- Signaling server: ws://localhost:8080

For two devices on the same LAN, set `NEXT_PUBLIC_SIGNAL_URL` to a reachable signaling-server URL.

## Environment

Copy `.env.example` to `.env.local` for the web app and `.env` for the signaling server as needed.

```env
NEXT_PUBLIC_SIGNAL_URL=ws://localhost:8080
NEXT_PUBLIC_STUN_URL=stun:stun.l.google.com:19302
NEXT_PUBLIC_TURN_URL=
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=
```

For real-world Internet reliability, configure a TURN server. Without TURN, some NAT/firewall combinations will not connect.

## Production

Build the web app and signaling server separately:

```bash
npm run build
npm run start
```

The project is intentionally storage-free. Add authentication, rate limiting, Redis/Postgres, object-storage relay, resumable persistence, and observability before operating it as a large public service.

## Architecture

Browser A <-> WebSocket signaling <-> Browser B
                     |
              offer/answer/ICE

After negotiation:
Browser A <======== WebRTC DataChannel ========> Browser B

The signaling server does not receive the file in the normal P2P path.
