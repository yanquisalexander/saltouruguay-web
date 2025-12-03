# Ruleta Loca - Game Documentation

## Overview

**Ruleta Loca** is a single-player word puzzle game inspired by "Wheel of Fortune" (Roda a Roda). Players spin a wheel, guess letters, and try to solve a hidden phrase to earn SaltoCoins.

## Game Mechanics

### Core Gameplay Loop

1. **Start Game**: Player starts a new game session, which assigns a random phrase from the database
2. **Spin Wheel**: Player spins the wheel to determine points or special outcomes
3. **Guess Letter**: If the wheel lands on points, player selects a letter
4. **Letter Reveal**: If the letter exists in the phrase, it's revealed and points are awarded
5. **Solve Puzzle**: Game continues until all letters in the phrase are guessed

### Wheel Segments

The wheel contains 8 segments with different outcomes:

| Value | Type | Description |
|-------|------|-------------|
| 100 | coins | Win 100 points per letter found |
| 200 | coins | Win 200 points per letter found |
| 300 | coins | Win 300 points per letter found |
| 500 | coins | Win 500 points per letter found |
| 750 | coins | Win 750 points per letter found |
| 1000 | coins | Win 1000 points per letter found |
| 0 | lose_turn | Player loses their turn (returns to idle state) |
| 0 | bankrupt | Player loses all accumulated points (future feature) |

### Scoring System

- **Points Per Letter**: When a letter is guessed correctly, points = wheel_value × number_of_occurrences
- **Example**: If wheel shows 500 and letter "A" appears 3 times, player earns 1500 points
- **Win Reward**: Upon completing the puzzle, all accumulated points convert to SaltoCoins (1:1 ratio)

### Letter Normalization

The game supports Spanish characters with automatic accent normalization:
- Players can type regular letters (A, E, I, O, U)
- System matches them with accented versions (Á, É, Í, Ó, Ú, Ñ)
- Example: Typing "A" will reveal both "A" and "Á" in the phrase

## Database Schema

### Tables

#### `ruleta_loca_phrases`
Stores all available phrases for the game.

#### `ruleta_loca_game_sessions`
Tracks active and completed game sessions.

#### `ruleta_loca_player_stats`
Aggregates player performance statistics.

## API Endpoints (Actions)

### `games.ruletaLoca.startGame()`
Creates a new game session for the authenticated user.

### `games.ruletaLoca.getGameState()`
Retrieves current active game session for the user.

### `games.ruletaLoca.spinWheel()`
Spins the wheel and returns a random segment.

### `games.ruletaLoca.guessLetter(input)`
Attempts to guess a letter in the current game.

### `games.ruletaLoca.forfeitGame(input)`
Ends the current game without winning.

### `games.ruletaLoca.getStats()`
Gets player statistics.

## Banco Saltano Integration

The game integrates with the Banco Saltano (virtual currency system):

1. **On Game Win**: 
   - Player's score converts to SaltoCoins (1:1)
   - `users.coins` column is updated via SQL
   - Transaction is recorded in player stats

2. **Statistics Tracking**:
   - Total coins earned across all games
   - Win/loss ratio
   - Highest score achieved

## Seed Data

Initial phrases are provided in `/src/db/seeds/ruleta-loca-phrases.ts`:

- **35 phrases** covering multiple categories
- Categories: País, Ciudad, Bebida, Comida, Deporte, Cultura, Turismo, etc.
- Includes Uruguay-specific phrases and community references
- Difficulty levels: Easy (8), Medium (16), Hard (11)

### Running Seeds

```bash
# Via tsx
npx tsx src/db/seeds/ruleta-loca-phrases.ts
```

## Future Enhancements

### Planned Features (from Issue)

1. **Multiplayer Mode**
   - Turn-based gameplay
   - Multiple players per room
   - Real-time updates via Pusher

2. **Advanced Mechanics**
   - Buy vowels feature
   - Special power-ups
   - Time limits per turn
   - Bonus rounds

3. **Economy Features**
   - Entry fees
   - Betting system
   - Loans from Banco Saltano
   - Jackpots and special prizes

4. **Leaderboards**
   - Daily/weekly rankings
   - Tournament system
   - Achievement unlocks

5. **Enhanced UI**
   - Better animations
   - Sound effects
   - Particle effects on win
   - More detailed statistics page

### Scalability Considerations

The current architecture supports future multiplayer:

- Session-based design allows multiple concurrent games
- Action handlers are stateless
- Database schema can be extended with room_id, turn_order, time_limits

## Maintenance

### Adding New Phrases

```typescript
await client.insert(RuletaLocaPhrasesTable)
    .values({
        phrase: "TU FRASE AQUI",
        category: "Categoría",
        difficulty: "medium",
        active: true
    });
```

### Adjusting Wheel Segments

Edit `WHEEL_SEGMENTS` array in `/src/utils/games/ruleta-loca.ts`

## Contributing

When adding features:

1. Update this documentation
2. Add database migrations if schema changes
3. Write tests for new functionality
4. Ensure Banco Saltano integration still works
5. Test on mobile devices
6. Consider multiplayer compatibility
