# Dalgona Minigame Documentation

## Overview

The Dalgona minigame is inspired by the "Dalgona Candy" (ppopgi) challenge from Squid Game. Players must carefully trace a shape that appears on their screen using mouse or touch input. The game integrates with the existing Streamer Wars infrastructure.

## Features

- **Team-based Shape Assignment**: Each team gets a different shape based on difficulty
- **SVG Image Generation**: Dynamically generated images with slight variations
- **Real-time Updates**: Pusher integration for instant game state updates
- **Attempt Tracking**: Players get 2 attempts before elimination
- **Touch & Mouse Support**: Works on both desktop and mobile devices

## Team Shape Mapping

| Team ID | Color  | Shape    | Difficulty |
|---------|--------|----------|------------|
| 1       | Red    | Circle   | Easy       |
| 2       | Blue   | Triangle | Easy       |
| 3       | Yellow | Star     | Medium     |
| 4       | Purple | Umbrella | Hard       |

## How to Use

### For Admins

1. Navigate to the Streamer Wars admin panel
2. Go to the Game Selector section
3. Select "Dalgona (Ppopgi) 🍪" from the available games
4. Click "Lanzar juego" to start the minigame
5. Players will automatically receive their assigned shapes

### Optional: End the Game Manually

If you need to end the game before all players complete:
- Send a POST request to `/api/dalgona?action=end`
- All players who haven't completed will be eliminated

### For Players

1. Wait for the game to start
2. You'll receive a Dalgona cookie image with your team's shape
3. Carefully trace the shape using your mouse or finger (on touch devices)
4. Click "Enviar" to submit your trace
5. If you fail, you get 1 more attempt (2 total)
6. Success means you've completed the challenge!
7. Failure on both attempts results in elimination

## Technical Details

### Backend Architecture

**Game Logic**: `src/utils/streamer-wars.ts`
- `games.dalgona.startGame()`: Initialize game and assign shapes
- `games.dalgona.submitTrace()`: Validate player trace attempts
- `games.dalgona.endGame()`: Force end the game
- `games.dalgona.getGameState()`: Get current game state

**Image Generation**: `src/services/dalgona-image-generator.ts`
- Generates SVG images dynamically
- Includes slight variations to prevent memorization
- Exports as base64 data URIs

**API Endpoints**: `src/pages/api/dalgona.ts`
- `POST /api/dalgona?action=start` (Admin only)
- `POST /api/dalgona?action=submit` (Players)
- `POST /api/dalgona?action=end` (Admin only)
- `GET /api/dalgona?action=state` (All authenticated users)

### Frontend Architecture

**Game Component**: `src/components/streamer-wars/games/Dalgona.tsx`
- Canvas-based drawing interface
- Real-time trace visualization
- Touch and mouse event handlers
- State management for attempts and status

### Redis Keys

- `player:{playerNumber}:dalgona_shape` - Stores assigned shape for validation
- `streamer-wars.dalgona:game-state` - Current game state (TTL: 48 hours)

### Pusher Events

**Channels**:
- `private-player-{userId}` - Individual player notifications
- `streamer-wars` - Global game events

**Events**:
- `dalgona:start` - Sent to individual player when game starts
- `dalgona:success` - Player successfully completed challenge
- `dalgona:attempt-failed` - Player failed attempt but has attempts left
- `dalgona:player-completed` - Broadcast when any player completes
- `dalgona:game-started` - Broadcast when game starts
- `dalgona:game-ended` - Broadcast when game ends

## Validation Logic

Current implementation uses simplified validation based on trace point count:
- Circle: minimum 30 points
- Triangle: minimum 20 points
- Star: minimum 40 points
- Umbrella: minimum 35 points

### Future Enhancements

The validation can be enhanced with:
1. **Path Shape Matching**: Compare traced path with expected shape
2. **Accuracy Scoring**: Calculate how closely the trace matches
3. **Boundary Checking**: Ensure trace stays within shape bounds
4. **Continuous Path Verification**: Check for breaks in the trace
5. **Speed/Pressure Analysis**: Factor in drawing speed and pressure

## Integration Points

### Admin Panel
- Added to `src/components/admin/streamer-wars/GameSelector.tsx`
- Appears as "Dalgona (Ppopgi) 🍪" option

### Game Router
- Integrated in `src/components/streamer-wars/StreamerWars.tsx`
- Added to GAME_CONFIG alongside other minigames

### Elimination System
- Uses existing `eliminatePlayer()` function
- Triggers Discord notifications
- Updates player status in database

## Testing Checklist

- [ ] Admin can start the game successfully
- [ ] Players receive correct shapes based on team
- [ ] Images display correctly on all devices
- [ ] Mouse tracing works smoothly
- [ ] Touch tracing works on mobile devices
- [ ] Submit button properly sends trace data
- [ ] Validation correctly identifies success/failure
- [ ] Attempt counter decrements properly
- [ ] Players with 0 attempts get eliminated
- [ ] Successful players see completion screen
- [ ] Admin can end game manually
- [ ] Discord notifications are sent
- [ ] Redis persistence works correctly
- [ ] Pusher events are received properly

## Troubleshooting

### Players not receiving images
- Check Pusher connection status
- Verify player has valid userId
- Confirm player is in a team
- Check Redis connection

### Trace not submitting
- Verify API endpoint is accessible
- Check browser console for errors
- Confirm player session is valid
- Verify trace has enough points

### Images not displaying
- Check SVG generation service
- Verify base64 encoding
- Test browser canvas support
- Check image data URI validity

## Dependencies

- `pusher-js`: Real-time event system
- `ioredis`: Redis client for state persistence
- Existing Streamer Wars infrastructure
- Canvas API (browser native)
- SVG support (browser native)

## Notes

- No external API keys required (SVG generation is server-side)
- Uses existing Redis and Pusher configurations
- Compatible with all modern browsers
- Mobile-friendly with touch support
- Lightweight SVG images (~5-8KB each)
