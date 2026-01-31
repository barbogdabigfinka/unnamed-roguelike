export const PLAYER_BASE_STATS = {
  maxHp: 100,
  baseDamage: 10,
  baseAttackSpeedMs: 3500,
  rageBonusDamage: 3,
  rageCap: 5,
}

export const BLOCK = {
  durationMs: 500,
  damageReduction: 0.5,
  cooldownMs: 4000,
}

export const ENEMY_CAST_TIME_MS = 1200

export const LEVEL_TARGETS = [1, 2, 3, 3, 3, 3, 3, 3, 3, 3]
export const MAX_LEVEL = 10

// Curated encounter packs by size
export const ENCOUNTER_PACKS = {
  solo: [
    ['brute'],
    ['skirmisher'],
    ['shaman'],
  ],
  duo: [
    ['brute', 'skirmisher'],
    ['skirmisher', 'skirmisher'],
    ['brute', 'shaman'],
    ['skirmisher', 'shaman'],
  ],
  trio: [
    ['brute', 'skirmisher', 'shaman'],
    ['skirmisher', 'skirmisher', 'shaman'],
    ['brute', 'skirmisher', 'skirmisher'],
  ],
  quint: [
    ['brute', 'skirmisher', 'skirmisher', 'shaman', 'shaman'],
    ['brute', 'brute', 'skirmisher', 'shaman', 'skirmisher'],
    ['brute', 'skirmisher', 'skirmisher', 'skirmisher', 'shaman'],
  ],
}

// Level thresholds unlocking larger packs
export const ENCOUNTER_SCALING = [
  { maxFight: 1, tiers: ['solo'] },
  { maxFight: 3, tiers: ['solo', 'duo'] },
  { maxFight: 5, tiers: ['duo', 'trio'] },
  { maxFight: 7, tiers: ['duo', 'trio', 'quint'] },
  { maxFight: Infinity, tiers: ['trio', 'quint'] },
] as const

// Per-enemy scaling when multiple spawn (keeps groups threatening but not overwhelming)
export const GROUP_SCALING = {
  1: { hp: 0.95, damage: 0.95 },
  2: { hp: 0.78, damage: 0.82 },
  3: { hp: 0.68, damage: 0.76 },
  4: { hp: 0.62, damage: 0.7 },
  5: { hp: 0.56, damage: 0.64 },
}

// Baseline power ramp by fight number
export const ENEMY_POWER_SCALING = [
  { maxFight: 1, hp: 0.86, damage: 0.86 },
  { maxFight: 3, hp: 0.96, damage: 0.96 },
  { maxFight: 6, hp: 1.02, damage: 1.02 },
  { maxFight: 9, hp: 1.1, damage: 1.08 },
  { maxFight: Infinity, hp: 1.18, damage: 1.14 },
] as const

// Shaman prefers self-heal if under this HP fraction
export const SHAMAN_SELF_HEAL_THRESHOLD = 0.4
