import type { AbilityDefinition, EnemyState, GameState } from '../types'

export interface AbilityHooks {
  performPlayerAttack: () => void
  getPlayerAttackInterval: () => number
  getCurrentTarget: () => EnemyState | null
  performInterrupt: () => void
  dealDamageToEnemy: (enemy: EnemyState, damage: number) => void
  applyDerivedStats: () => void
}

export function castAbility(
  ability: AbilityDefinition,
  state: GameState,
  hooks: AbilityHooks,
) {
  switch (ability.effect) {
    case 'generator':
      return castGenerator(ability, state, hooks)
    case 'attackSpeedBuff':
      return castAttackSpeedBuff(ability, state, hooks)
    case 'empowerNextAttack':
      return castEmpower(ability, state)
    case 'consumeRage':
      return castConsumer(ability, state, hooks)
    default: {
      const _exhaustive: never = ability.effect
      return _exhaustive
    }
  }
}

function castGenerator(
  ability: AbilityDefinition,
  state: GameState,
  hooks: AbilityHooks,
) {
  hooks.performPlayerAttack()
  state.player.attackTimerMs = hooks.getPlayerAttackInterval()
  state.player.rage = Math.min(
    state.player.rageCap,
    state.player.rage + (ability.values.rageGain ?? 1),
  )
}

function castAttackSpeedBuff(
  ability: AbilityDefinition,
  state: GameState,
  hooks: AbilityHooks,
) {
  const bonus = ability.values.attackSpeedBonus ?? 0.3
  const duration = ability.values.durationMs ?? 4000
  state.player.buffs.push({
    id: ability.id,
    remainingMs: duration,
    type: 'attackSpeed',
    attackSpeedBonus: bonus,
  })
  hooks.applyDerivedStats()
}

function castEmpower(ability: AbilityDefinition, state: GameState) {
  state.player.empoweredAttack = {
    slowPercent: ability.values.slowPercent ?? 0.25,
    slowDurationMs: ability.values.slowDurationMs ?? 3000,
  }
}

function castConsumer(
  ability: AbilityDefinition,
  state: GameState,
  hooks: AbilityHooks,
) {
  const target = hooks.getCurrentTarget()
  if (!target) return
  const rage = state.player.rage
  const base = ability.values.consumeBaseDamage ?? 5
  const per = ability.values.consumePerRage ?? 8
  const damage = base + per * rage
  state.player.rage = 0
  hooks.performInterrupt()
  hooks.dealDamageToEnemy(target, damage)
}
