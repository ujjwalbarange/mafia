# 🎭 Mafia Party Game — Socket.IO Event Documentation

All events use Socket.IO with callback-style acknowledgements.

---

## Client → Server Events

### Room Events

| Event | Payload | Callback | Description |
|-------|---------|----------|-------------|
| `room:create` | `{ displayName, avatarIndex }` | `{ success, roomCode, roomId, playerId, sessionToken, isHost }` | Create a new room |
| `room:join` | `{ roomCode, displayName, avatarIndex }` | `{ success, roomCode, roomId, playerId, sessionToken, isHost }` | Join existing room |
| `room:reconnect` | `{ sessionToken, roomId }` | `{ success, gameState }` | Reconnect to room |

### Player Events

| Event | Payload | Callback | Description |
|-------|---------|----------|-------------|
| `player:ready` | _(none)_ | `{ success, isReady }` | Toggle ready state |

### Game Events

| Event | Payload | Callback | Description |
|-------|---------|----------|-------------|
| `game:settings` | `{ settings }` | `{ success }` | Update game settings (host only) |
| `game:assign-roles` | `{ assignments }` | `{ success, pinCode }` | Assign roles (host only) |
| `game:verify-pin` | `{ pin }` | `{ success, role }` | Verify PIN to view role |
| `game:start-night` | _(none)_ | `{ success, nightStep }` | Start night phase (host only) |
| `game:night-action` | `{ step, targetId }` | `{ success, nextStep, policeResult }` | Submit night action (host only) |
| `game:resolve-night` | _(none)_ | `{ success, killedPlayerId, wasSaved, gameOver, winner }` | Resolve night (host only) |
| `game:start-voting` | _(none)_ | `{ success }` | Start voting phase (host only) |
| `game:vote` | `{ targetId }` | `{ success, isGhost }` | Cast a vote |
| `game:resolve-voting` | _(none)_ | `{ success }` | Force-resolve voting (host only) |
| `game:get-summary` | _(none)_ | `{ success, summary }` | Get post-game summary |
| `game:play-again` | _(none)_ | `{ success }` | Reset for new game (host only) |

---

## Server → Client Events

### Room Events

| Event | Payload | Description |
|-------|---------|-------------|
| `room:players` | `[{ id, displayName, avatarIndex, isAlive, isHost, isReady, isConnected }]` | Updated player list |
| `room:player-joined` | `{ displayName }` | New player joined |
| `room:player-disconnected` | `{ displayName }` | Player disconnected |
| `room:player-reconnected` | `{ displayName }` | Player reconnected |
| `room:host-assigned` | _(none)_ | You are now the host |

### Game Events

| Event | Payload | Description |
|-------|---------|-------------|
| `game:role-reveal` | `{ role }` | Your assigned role (private) |
| `game:pin-code` | `{ pinCode }` | Game PIN (host only) |
| `game:phase-change` | `{ phase, round, nightStep, killedPlayerId, killedPlayerName, wasSaved, discussionDeadline, votingDeadline }` | Phase transition |
| `game:night-step` | `{ step }` | Night sub-step changed |
| `game:settings-updated` | `{ ...settings }` | Settings changed |
| `game:vote-update` | `{ voteCount, totalVoters, anonymous }` | Vote progress |
| `game:vote-result` | `{ eliminatedId, eliminatedName, wasImpostor, isTie, voteResults, showRole, gameOver, winner }` | Vote outcome |
| `game:over` | `{ winner, players }` | Game ended |

---

## Game Phases

```
lobby → role_assignment → night → day_discussion → voting → night → ... → game_over
```

## Night Sub-Steps

```
mafia_wake → doctor_wake → police_wake → resolve
```

(Steps are skipped if that role is disabled in settings)

---

## Reconnection Flow

1. Client stores `sessionToken` in localStorage on join
2. On page reload, client emits `room:reconnect` with token
3. Server restores full game state and re-joins socket room
4. If player was disconnected > 30 seconds, host is reassigned

---

## Security Notes

- **Server is authoritative** — all game logic runs server-side
- **Roles are never sent to other players** — only the player and host know
- **Votes are validated** — duplicate votes are rejected
- **Host actions are verified** — only the host can trigger phase transitions
- **Session tokens** prevent room hijacking
