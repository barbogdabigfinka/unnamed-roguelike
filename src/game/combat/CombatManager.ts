import { ENEMY_CAST_TIME_MS, SHAMAN_SELF_HEAL_THRESHOLD } from '../core/config'
import type { EnemyState, GameState } from '../types'

export interface CombatHooks {
  getCurrentTarget: () => EnemyState | null
  onEvent: (message: string) => void
}

export function performPlayerAttack(state: GameState, hooks: CombatHooks) {
  const target = hooks.getCurrentTarget()
  if (!target) return
  const player = state.player
  const rageBonus = player.rage * player.rageBonusDamage
  const damage = player.baseDamage + player.derived.flatDamage + rageBonus

  if (player.empoweredAttack) {
    target.slowMultiplier = 1 + player.empoweredAttack.slowPercent
    target.attackTimerMs += player.empoweredAttack.slowDurationMs * player.empoweredAttack.slowPercent
    player.empoweredAttack = null
  }

  dealDamageToEnemy(target, damage)
  target.hitFlashMs = 180
  state.player.hitFlashMs = 140
  hooks.onEvent(`Hit ${target.name} for ${Math.round(damage)}.`)
}

export function performEnemyAttack(
  state: GameState,
  enemy: EnemyState,
  bonusMultiplier = 1,
  onEvent?: (message: string) => void,
) {
  if (state.phase !== 'combat') return
  const player = state.player
  const reduction = 1 - player.derived.damageReduction
  const damageMultiplier = getEnemyDamageMultiplier(enemy)
  const attackModifier = getEnemyAttackModifier(enemy)
  const intended = enemy.baseDamage * damageMultiplier * attackModifier * bonusMultiplier
  const damage = Math.max(0, intended * reduction)
  if (attackModifier !== 1) {
    enemy.buffs = enemy.buffs.filter((b) => b.type !== 'attackModifier')
  }
  player.hp = Math.max(0, player.hp - damage)
  player.hitFlashMs = 200
  const blocked = player.buffs.some((b) => b.id === 'block' && b.remainingMs > 0)
  if (blocked && intended > damage) {
    onEvent?.(`${enemy.name} hits you for ${Math.round(damage)} (${Math.round(intended)}) while blocking.`)
  } else {
    onEvent?.(`${enemy.name} hits you for ${Math.round(damage)}.`)
  }
}

export function tryEnemyAbilities(
  state: GameState,
  enemy: EnemyState,
) {
  if (!enemy.alive || enemy.intent) return
  for (const ability of enemy.abilities) {
    const cd = enemy.abilityCooldowns[ability.id] ?? 0
    if (cd > 0) continue
    if (!canUseEnemyAbility(state, enemy, ability)) continue
    const castMs = ability.castTimeMs ?? ENEMY_CAST_TIME_MS
    const phase: 'intent' | 'channeling' = ability.castTimeMs ? 'channeling' : 'intent'
    enemy.intent = {
      abilityId: ability.id,
      abilityName: ability.name,
      effect: ability.effect,
      phase,
      remainingMs: castMs,
      totalMs: castMs,
    }
    if (ability.effect === 'heal') {
      enemy.attackTimerPaused = true
    } else if (ability.effect === 'attackModifier') {
      enemy.attackTimerPaused = true
      enemy.attackTimerMs = enemy.attackIntervalMs
    } else if (ability.effect === 'instantAttack') {
      enemy.attackTimerPaused = true
      enemy.attackTimerMs = enemy.attackIntervalMs
    }
    return
  }
}

export function tickEnemyIntent(
  state: GameState,
  enemy: EnemyState,
  deltaMs: number,
  onEvent?: (message: string) => void,
) {
  const intent = enemy.intent
  if (!intent) return
  intent.remainingMs = Math.max(0, intent.remainingMs - deltaMs)
  if (intent.remainingMs > 0) return
  enemy.intent = null
  enemy.attackTimerPaused = false
  const ability = enemy.abilities.find((a) => a.id === intent.abilityId)
  if (!ability) return
  applyEnemyAbility(state, enemy, ability, onEvent)
}

export function dealDamageToEnemy(enemy: EnemyState, damage: number) {
  if (!enemy.alive) return
  enemy.hp = Math.max(0, enemy.hp - damage)
  if (enemy.hp <= 0) {
    enemy.alive = false
  }
}

export function getEnemyDamageMultiplier(enemy: EnemyState) {
  return enemy.buffs
    .filter((b) => b.type === 'damageMultiplier')
    .reduce((acc, b) => acc * (b.damageMultiplier ?? 1), 1)
}

function canUseEnemyAbility(state: GameState, enemy: EnemyState, ability: EnemyState['abilities'][number]) {
  if (!enemy.alive) return false
  if (ability.effect === 'heal') {
    return Boolean(selectHealTarget(state, enemy))
  }
  return true
}

function applyEnemyAbility(
  state: GameState,
  enemy: EnemyState,
  ability: EnemyState['abilities'][number],
  onEvent?: (message: string) => void,
) {
  if (!enemy.alive) return
  if (ability.effect === 'heal') {
    const target = selectHealTarget(state, enemy)
    if (!target) return
    const heal = ability.values.healAmount ?? 0
    target.hp = Math.min(target.maxHp, target.hp + heal)
    onEvent?.(`${enemy.name} heals ${target.name} for ${Math.round(heal)}.`)
  } else if (ability.effect === 'damageBuff') {
    const duration = ability.values.durationMs ?? 4000
    const multiplier = ability.values.damageMultiplier ?? 1.2
    enemy.buffs.push({
      id: ability.id,
      remainingMs: duration,
      type: 'damageMultiplier',
      damageMultiplier: multiplier,
    })
  } else if (ability.effect === 'attackModifier') {
    const duration = ability.values.durationMs ?? 8000
    const multiplier = ability.values.damageMultiplier ?? 1.4
    enemy.buffs.push({
      id: ability.id,
      remainingMs: duration,
      type: 'attackModifier',
      damageMultiplier: multiplier,
    })
  } else if (ability.effect === 'instantAttack') {
    const mult = ability.values.damageMultiplier ?? 1
    performEnemyAttack(state, enemy, mult, onEvent)
  }
  enemy.abilityCooldowns[ability.id] = ability.cooldownMs
}

function getEnemyAttackModifier(enemy: EnemyState) {
  return enemy.buffs
    .filter((b) => b.type === 'attackModifier')
    .reduce((acc, b) => acc * (b.damageMultiplier ?? 1), 1)
}

function selectHealTarget(state: GameState, caster: EnemyState) {
  const allies = state.enemies.filter((e) => e.alive)
  if (!allies.length) return null
  const casterRatio = caster.hp / Math.max(1, caster.maxHp)
  if (casterRatio <= SHAMAN_SELF_HEAL_THRESHOLD) return caster
  const healable = allies.filter((ally) => ally.hp < ally.maxHp * 0.5)
  if (!healable.length) return null
  return healable.reduce((lowest, ally) => {
    const ratio = ally.hp / Math.max(1, ally.maxHp)
    if (!lowest) return ally
    const lowRatio = lowest.hp / Math.max(1, lowest.maxHp)
    return ratio < lowRatio ? ally : lowest
  }, null as EnemyState | null)
}
