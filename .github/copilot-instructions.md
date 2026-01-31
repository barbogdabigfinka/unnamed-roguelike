# Rage Roguelike - AI Agent Instructions

## Project Overview

A browser-based roguelike game built with **React + TypeScript + Vite + Bun**. Combat is rendered on HTML5 Canvas with a rage-based warrior mechanic. The architecture emphasizes separation of concerns for maintainability and expandability.

## Tech Stack

- Runtime: Bun
- Framework: React 18+ with TypeScript
- Build: Vite
- Rendering: Canvas 2D API
- State: Custom pub/sub pattern with immutable snapshots
- Data: JSON files for abilities, enemies, passives, talent tree

## Architecture

### Directory Structure

```
src/
├── game/                      # Core game logic (framework-agnostic)
│   ├── core/config.ts         # Balance constants (HP, damage, cooldowns)
│   ├── combat/CombatManager.ts # Attack resolution, damage, enemy AI
│   ├── systems/
│   │   ├── AbilitySystem.ts   # Player ability casting with hooks pattern
│   │   └── BuffSystem.ts      # Buff duration ticking, derived stats
│   ├── data.ts                # JSON loaders, lookup maps
│   ├── game.ts                # Game class - thin orchestrator
│   └── types.ts               # All TypeScript types and interfaces
├── rendering/renderer.ts      # Canvas 2D drawing
├── ui/                        # React components
│   ├── components/            # Reusable (TalentTree)
│   ├── hooks/useGameState.ts  # Subscribe to game state
│   └── screens/               # Full-page views
├── data/                      # JSON data files
└── App.tsx                    # Root component, screen routing
```

### Key Patterns

1. GameController Interface — UI depends on the `GameController` interface, not the concrete `Game` class. Enables testing/mocking.
2. Hooks Pattern for Systems — Systems like `AbilitySystem` receive callback hooks rather than direct game references, keeping them pure and testable.
3. Immutable State Snapshots — `Game.snapshot()` creates shallow copies of state for React consumption. Never mutate state returned from `getState()`.
4. Centralized Config — All balance values live in `src/game/core/config.ts`. Add new constants here, not inline.
5. Data-Driven Design — Abilities, enemies, passives are defined in JSON (`src/data/*.json`). Add new content via data files when possible.

## Key Types

```typescript
interface GameState { phase, level, player, enemies, ... }
interface BuffInstance { id, remainingMs, type, ... }
interface AbilityDefinition { id, name, slot, effect, values, ... }
interface GameController {
  getState(): GameState
  subscribe(listener): () => void
  activateAbility(slot): void
  activateBlock(): void
  // ... other actions
}
```

## Development Guidelines

### Adding New Abilities
1. Add definition to `src/data/abilities.json`.
2. If a new effect type, add to `AbilityEffectType` union in `types.ts`.
3. Implement handler in `AbilitySystem.ts` with an exhaustive switch.
4. Talent tree unlocks ability via `talentTree.json`.

### Adding New Enemies
1. Add definition to `src/data/enemies.json`.
2. If a new enemy ability effect, extend `EnemyAbilityDefinition` and `tryEnemyAbilities()`.
3. Enemy spawning handled in `Game.randomEnemy()`.

### Adding New Buff Types
1. Add type to `BuffInstance.type` union in `types.ts`.
2. Handle in `BuffSystem.calculateDerivedStats()` for player buffs.
3. Handle in `CombatManager.getEnemyDamageMultiplier()` for enemy buffs.

### Modifying Balance
1. Update values in `src/game/core/config.ts`.
2. Or update JSON data files for content-specific values.

### UI Changes
1. UI components receive the `GameController` interface, not the `Game` class.
2. Use `useGameState(game)` hook to subscribe to state.
3. Call controller methods for user actions.

## Code Style

- Prefer pure functions in systems (BuffSystem, CombatManager).
- Use TypeScript strict mode.
- Exhaustive switches for union types (see AbilitySystem).
- No direct state mutation outside the Game class.
- Shallow copy arrays/objects when creating snapshots.

## Build & Run

```
bun install
bun run dev
bun run build
```

## Known Remaining Work

- [ ] Extract talent tree utilities to a shared helper (findTalentNode duplication).
- [ ] Centralize UI colors and canvas dimensions into config.
- [ ] Populate `src/game/state/` with state utilities if needed.
- [ ] Add save/load system using GameState serialization.
- [ ] Remove `src/data/chat.json` dev artifact.

## Testing Considerations

- Systems (`BuffSystem`, `AbilitySystem`, `CombatManager`) are pure functions, easily unit testable.
- `GameController` interface enables mocking for UI tests.
- State snapshots are immutable, safe for snapshot testing.
