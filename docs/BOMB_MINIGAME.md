# Bomb Minigame Documentation

## Overview

The Bomb (Desactivar la Bomba) minigame is a challenge-based game where players must complete 5 different challenges without making more than 3 errors. Players face various types of challenges including math problems, logic questions, word completion, and number sequences. The game integrates with the existing Streamer Wars infrastructure and supports reconnections with state persistence in Redis.

## Features

- **Challenge Variety**: 4 different types of challenges (math, logic, word completion, sequences)
- **Error Tracking**: Players get maximum 3 errors before elimination
- **Progress Persistence**: Game state saved in Redis for reconnections
- **Real-time Updates**: Pusher integration for instant feedback
- **Individual Progression**: Each player gets their own unique set of 5 challenges
- **Admin Control**: Complete game management via chat commands

## Challenge Types

### 1. Math (📊)
Simple arithmetic operations:
- Addition (e.g., "¿Cuánto es 45 + 23?")
- Subtraction (e.g., "¿Cuánto es 67 - 14?")
- Multiplication (e.g., "¿Cuánto es 8 × 7?")

### 2. Logic (🧩)
Riddles and logical thinking questions:
- Classic riddles
- Lateral thinking problems
- Trick questions

### 3. Word Completion (📝)
Complete partial words with hints:
- Words related to streaming and gaming
- 2-3 letters missing
- Contextual hints provided

### 4. Sequences (🔢)
Number pattern recognition:
- Even/odd numbers
- Multiples
- Geometric progressions

## How to Use

### For Admins

Control the game using chat commands:

#### Start the Game
```
/bomb start
```
Initializes the game for all active (non-eliminated, non-isolated) players. Each player receives their first challenge automatically.

#### End the Game
```
/bomb end
```
Manually ends the game. All players who haven't completed all 5 challenges are eliminated.

#### Check Status
```
/bomb status
```
Get current game statistics:
- Total players
- Completed count
- Currently playing count
- Eliminated count

### For Players

1. **Wait for Game Start**: The admin will start the game with `/bomb start`
2. **Receive First Challenge**: You'll see your first challenge with the question and input field
3. **Answer the Challenge**: Type your answer carefully (case-insensitive)
4. **Submit**: Press "Enviar Respuesta" or hit Enter
5. **Progress Tracking**: 
   - Monitor your completed challenges (X/5)
   - Track your errors (X/3)
6. **Complete All 5**: Answer all 5 challenges correctly to win
7. **Avoid Elimination**: Making 3 errors eliminates you from the game

### Challenge Navigation
- Each correct answer automatically loads the next challenge
- Incorrect answers show remaining attempts
- Progress is saved automatically (survives disconnections)

## Technical Details

### Backend Architecture

**Game Logic**: `src/utils/streamer-wars.ts`
- `games.bomb.startGame()`: Initialize game and generate challenges
- `games.bomb.submitAnswer()`: Validate player answers and update state
- `games.bomb.endGame()`: Force end the game
- `games.bomb.getGameState()`: Get current game state

**Challenge Generation**: Built-in challenge generators
- `generateMathChallenge()`: Random arithmetic operations
- `generateLogicChallenge()`: Pre-defined riddles
- `generateWordChallenge()`: Word completion with hints
- `generateSequenceChallenge()`: Number pattern challenges
- `generatePlayerChallenges()`: Creates unique set of 5 challenges per player

**API Endpoints**: `src/pages/api/bomb.ts`
- `POST /api/bomb?action=start` (Admin only)
- `POST /api/bomb?action=submit` (Players)
- `POST /api/bomb?action=end` (Admin only)
- `GET /api/bomb?action=status` (All authenticated users)
- `GET /api/bomb?action=player-state` (Get player's current state)

### Frontend Architecture

**Game Component**: `src/components/streamer-wars/games/Bomb.tsx`
- Real-time challenge display
- Answer input with validation
- Progress bars and statistics
- Error and success feedback
- Touch and keyboard support
- State management for multi-step challenges

### Redis Keys

- `player:{playerNumber}:bomb_challenges` - Stores player's 5 challenges for validation
- `streamer-wars.bomb:game-state` - Current game state (TTL: 48 hours)

### Pusher Events

**Channels**:
- `streamer-wars` - Global game events

**Events**:
- `bomb:start` - Sent when game starts with first challenge
- `bomb:next-challenge` - Player advances to next challenge
- `bomb:error` - Player answered incorrectly
- `bomb:success` - Player completed all 5 challenges
- `bomb:failed` - Player exhausted all attempts and is eliminated
- `bomb:game-started` - Broadcast when game starts
- `bomb:game-ended` - Broadcast when game ends
- `bomb:player-completed` - Broadcast when any player completes

## Validation Logic

Answer validation is case-insensitive and trimmed:
- Numeric answers match exactly
- Text answers are lowercased and compared
- No partial credit for close answers
- Each error increments error count
- 3 errors = automatic elimination

### Challenge Distribution

Each player receives exactly 5 challenges:
1. At least one of each type (math, logic, word, sequence)
2. One additional random challenge
3. Challenges are shuffled for variety
4. Challenges are generated uniquely per player

## Integration Points

### Admin Panel
- Added to `src/components/admin/streamer-wars/GameSelector.tsx`
- Appears as "Desactivar la Bomba 💣" option
- No configuration props needed

### Game Router
- Integrated in `src/components/streamer-wars/StreamerWars.tsx`
- Added to GAME_CONFIG alongside other minigames

### Elimination System
- Uses existing `eliminatePlayer()` function
- Triggers Discord notifications
- Updates player status in database
- Automatic elimination on 3 errors
- Manual elimination on game end if incomplete

### Admin Commands
- Added `/bomb` command family to `executeAdminCommand()`
- Three sub-commands: start, end, status
- Integrated with existing command system

## Game Flow

```
1. Admin: /bomb start
   ↓
2. Generate 5 unique challenges per player
   ↓
3. Save to Redis & send first challenge
   ↓
4. Player answers → Submit
   ↓
5. Validate answer:
   - Correct → Next challenge (or complete if 5th)
   - Incorrect → Increment error, show remaining attempts
   ↓
6. Repeat steps 4-5 until:
   - Player completes 5 challenges → SUCCESS
   - Player makes 3 errors → ELIMINATED
   - Admin ends game → Incomplete players eliminated
```

## Error Handling

- **Network Errors**: UI shows error toast, state preserved
- **Invalid Answers**: Empty or whitespace-only answers rejected client-side
- **Disconnections**: State persisted in Redis, restored on reconnect
- **Database Errors**: Logged to console, Discord webhook attempted
- **Concurrent Submissions**: Handled by Redis atomic operations

## Testing Checklist

- [x] Admin can start the game successfully
- [x] Players receive unique challenges
- [x] Challenge types are varied and correct
- [x] Answer validation works correctly
- [x] Error counting increments properly
- [x] Players eliminated after 3 errors
- [x] Successful players see completion screen
- [x] Progress persists through disconnections
- [x] Admin can end game manually
- [x] Discord notifications are sent
- [x] Redis persistence works correctly
- [x] Pusher events are received properly
- [x] Case-insensitive answer matching
- [x] UI updates in real-time
- [x] Progress bars show correctly

## Troubleshooting

### Players not receiving challenges
- Check Pusher connection status
- Verify player has valid userId
- Confirm player is not eliminated/isolated
- Check Redis connection

### Answers not submitting
- Verify API endpoint is accessible
- Check browser console for errors
- Confirm player session is valid
- Ensure answer is not empty

### Wrong answer accepted
- Review answer normalization (lowercase, trim)
- Check challenge generation logic
- Verify Redis cached challenges match

### State not persisting
- Check Redis connection
- Verify TTL is set correctly (48 hours)
- Confirm cache keys are correct

## Dependencies

- `pusher-js`: Real-time event system
- `ioredis`: Redis client for state persistence
- Existing Streamer Wars infrastructure
- No external APIs required

## Performance Considerations

- Challenge generation is lightweight (no external calls)
- Redis operations are atomic and fast
- Minimal network traffic per answer
- No heavy computations on client side
- Pusher events use compression for audio

## Future Enhancements

Possible improvements:
1. **More Challenge Types**: Image-based, audio recognition, typing speed
2. **Difficulty Levels**: Scale challenge difficulty based on progress
3. **Time Limits**: Add countdown per challenge or overall
4. **Hints System**: Allow players to use hints (with penalties)
5. **Leaderboard**: Track completion times and errors
6. **Custom Challenges**: Allow admins to add custom questions
7. **Team Mode**: Collaborative challenge solving
8. **Challenge Editor**: Web interface for creating new challenges

## Notes

- All challenges are deterministic and fair
- No randomness in validation (reproducible results)
- Compatible with all modern browsers
- Mobile-friendly responsive design
- Lightweight implementation (~14KB component)
- Minimal Redis memory footprint
- Integrated with existing authentication and authorization

