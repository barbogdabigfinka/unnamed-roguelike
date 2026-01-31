export type AbilitySlot = 'Q' | 'W' | 'E' | 'R'

export type AbilityEffectType =
  | 'generator'
  | 'attackSpeedBuff'
  | 'empowerNextAttack'
  | 'consumeRage'

export interface AbilityValues {
  damageBonus?: number
  rageGain?: number
  attackSpeedBonus?: number
  durationMs?: number
  slowPercent?: number
  slowDurationMs?: number
  consumeBaseDamage?: number
  consumePerRage?: number
}

export interface AbilityDefinition {
  id: string
  name: string
  slot: AbilitySlot
  cooldownMs: number
  effect: AbilityEffectType
  values: AbilityValues
  description?: string
}

export interface PassiveDefinition {
  id: string
  name: string
  description?: string
  statModifiers: Partial<DerivedStats>
}

export interface EnemyAbilityDefinition {
  id: string
  name: string
  cooldownMs: number
  effect: 'damageBuff' | 'instantAttack' | 'heal'
  values: {
    damageMultiplier?: number
    attackSpeedBonus?: number
    durationMs?: number
    healAmount?: number
  }
}

export interface EnemyDefinition {
  id: string
  name: string
  maxHp: number
  baseDamage: number
  attackSpeedMinMs: number
  attackSpeedMaxMs: number
  abilities: EnemyAbilityDefinition[]
}

export interface TalentNodeDefinition {
  id: string
  row: number
  type: 'ability' | 'passive'
  abilityId?: string
  passiveId?: string
  prerequisiteIds?: string[]
  label: string
}

export interface TalentTreeDefinition {
  rows: TalentNodeDefinition[][]
  rowUnlockRequirements: Record<number, number>
}

export type GamePhase = 'idle' | 'combat' | 'levelUp' | 'victory' | 'defeat'

export interface BuffInstance {
  id: string
  remainingMs: number
  type: 'attackSpeed' | 'damageReduction' | 'attackModifier' | 'damageMultiplier'
  attackSpeedBonus?: number
  damageReduction?: number
  onExpire?: () => void
  damageMultiplier?: number
}

export interface EmpoweredAttack {
  slowPercent: number
  slowDurationMs: number
}

export interface DerivedStats {
  attackSpeedMultiplier: number
  flatDamage: number
  maxHp: number
  damageReduction: number
}

export interface PlayerState {
  name: string
  hp: number
  maxHp: number
  baseDamage: number
  baseAttackSpeedMs: number
  attackTimerMs: number
  rage: number
  rageCap: number
  rageBonusDamage: number
  abilityCooldowns: Record<AbilitySlot, number>
  blockCooldownMs: number
  buffs: BuffInstance[]
  empoweredAttack: EmpoweredAttack | null
  hitFlashMs: number
  derived: DerivedStats
}

export interface EnemyState {
  id: string
  name: string
  hp: number
  maxHp: number
  baseDamage: number
  attackTimerMs: number
  attackIntervalMs: number
  attackSpeedMinMs: number
  attackSpeedMaxMs: number
  slowMultiplier: number
  buffs: BuffInstance[]
  hitFlashMs: number
  abilities: EnemyAbilityDefinition[]
  abilityCooldowns: Record<string, number>
  alive: boolean
}

export interface GameState {
  phase: GamePhase
  level: number
  fightCount: number
  fightsToNextLevel: number
  talentPoints: number
  targetIndex: number
  unlockedTalents: string[]
  unlockedPassives: string[]
  knownAbilities: string[]
  equippedAbilityIds: Record<AbilitySlot, string | null>
  recentEvents: string[]
  player: PlayerState
  enemies: EnemyState[]
}

export interface GameRenderer {
  render(state: GameState): void
}

export interface GameController {
  getState(): GameState
  subscribe(listener: GameStateListener): () => void
  setRenderer(renderer: GameRenderer | null): void
  startLoop(): void
  stopLoop(): void
  startNewRun(): void
  resumeAfterLevel(): void
  activateBlock(): void
  activateAbility(slot: AbilitySlot): void
  selectNextTarget(): void
  selectPrevTarget(): void
  applyTalent(nodeId: string): void
}

export type GameStateListener = (state: GameState) => void