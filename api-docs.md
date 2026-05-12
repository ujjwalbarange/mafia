# 🎭 Mafia Party Game — REST API Documentation

Base URL: `http://localhost:5000/api`

---

## Health Check

### `GET /api/health`

Check server and database status.

**Response:**
```json
{
  "status": "ok",
  "db": "connected",
  "uptime": 123.456
}
```

---

## Rooms

### `GET /api/rooms/:code`

Get room info by room code.

**Parameters:**
- `code` (string) — 6-character room code

**Response (200):**
```json
{
  "success": true,
  "data": {
    "roomCode": "A3KP7M",
    "status": "waiting",
    "playerCount": 4,
    "maxPlayers": 10
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Room not found"
}
```

---

## Players

### `GET /api/players/session/:token`

Validate a session token for reconnection.

**Parameters:**
- `token` (string) — UUID session token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "playerId": "uuid-here",
    "roomId": "uuid-here",
    "displayName": "Player1",
    "isHost": true
  }
}
```

---

## Game

### `GET /api/game/:roomId/summary`

Get post-game summary for a completed game.

**Parameters:**
- `roomId` (string) — Room UUID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "roomCode": "A3KP7M",
    "totalRounds": 5,
    "winner": "civilians",
    "players": [
      {
        "id": "uuid",
        "displayName": "Player1",
        "role": "impostor",
        "isAlive": false
      }
    ],
    "roundLogs": [...],
    "voteHistory": [...]
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Human readable error message"
}
```

Common HTTP status codes:
- `200` — Success
- `404` — Resource not found
- `500` — Internal server error
- `503` — Service unavailable (DB down)
