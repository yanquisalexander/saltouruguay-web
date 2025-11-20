# Streamer Wars - Modular Architecture

This directory contains the refactored Streamer Wars system, organized into focused modules for better maintainability and scalability.

## Structure

```
/utils/streamer-wars/
├── index.ts              # Main entry point - exports all modules
├── types.ts              # Type definitions for all game states
├── constants.ts          # Constants (cache keys, game settings)
├── utils.ts              # Shared utility functions
├── cache.ts              # Cache management wrapper
├── state.ts              # Game state management functions
├── README.md             # This file
│
├── /minigames/           # Minigame implementations
│   ├── index.ts
│   ├── simon-says.ts      # Complete Simon Says game logic
│   └── bomb-challenges.ts # Bomb game challenge generators
│
├── /players/             # Player management
│   ├── index.ts
│   ├── player-operations.ts  # Add, remove, get players
│   ├── player-queries.ts     # Query player data
│   └── player-isolation.ts   # Isolation/quarantine logic
│
├── /teams/               # Team management
│   └── index.ts
│
├── /eliminations/        # Elimination logic
│   └── index.ts
│
├── /game/                # Game flow management
│   └── index.ts
│
└── /events/              # Event/Pusher broadcasting
    └── index.ts
```

## Usage

### Importing the entire module

```typescript
import * as streamerWars from '@/utils/streamer-wars';
```

### Importing specific modules

```typescript
import { simonSays } from '@/utils/streamer-wars/minigames';
import { createCache } from '@/utils/streamer-wars/cache';
import type { SimonSaysGameState } from '@/utils/streamer-wars/types';
```

### Backward Compatibility

The original `streamer-wars.ts` file still exists and re-exports all functionality, ensuring no breaking changes:

```typescript
// This still works
import { games, eliminatePlayer } from '@/utils/streamer-wars';
```

## Migration Status

- ✅ Types extracted and centralized
- ✅ Constants extracted and centralized
- ✅ Utility functions extracted
- ✅ Cache management extracted
- ✅ Simon Says minigame fully extracted
- ✅ Bomb challenge generators fully extracted
- 🔄 In Progress: Remaining game logic and player management
- ⏳ Pending: Complete extraction of all modules

## Design Principles

1. **Separation of Concerns**: Each module handles a specific domain
2. **Single Responsibility**: Functions do one thing well
3. **Backward Compatibility**: No breaking changes to existing code
4. **Type Safety**: Strict TypeScript types throughout
5. **Testability**: Modules can be tested independently
6. **Documentation**: Clear function signatures and comments

## Benefits

- **Maintainability**: Easier to find and modify specific functionality
- **Scalability**: New features can be added without bloating files
- **Reduced Coupling**: Clear module boundaries reduce dependencies
- **Better Testing**: Individual modules can be tested in isolation
- **Improved Collaboration**: Multiple developers can work on different modules
