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

export function performEnemyAttack(state: GameState, enemy: EnemyState) {
  if (state.phase !== 'combat') return
  const player = state.player
  const reduction = 1 - player.derived.damageReduction
  const damageMultiplier = getEnemyDamageMultiplier(enemy)
  const damage = Math.max(0, enemy.baseDamage * damageMultiplier * reduction)
  player.hp = Math.max(0, player.hp - damage)
  player.hitFlashMs = 200
}

export function tryEnemyAbilities(state: GameState, enemy: EnemyState) {
  for (const ability of enemy.abilities) {
    const cd = enemy.abilityCooldowns[ability.id] ?? 0
    if (cd > 0 || !enemy.alive) continue
    if (ability.effect === 'heal') {
      if (enemy.hp < enemy.maxHp * 0.5) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + (ability.values.healAmount ?? 0))
        enemy.abilityCooldowns[ability.id] = ability.cooldownMs
      }
    } else if (ability.effect === 'damageBuff') {
      const duration = ability.values.durationMs ?? 4000
      const multiplier = ability.values.damageMultiplier ?? 1.2
      enemy.buffs.push({
        id: ability.id,
        remainingMs: duration,
        type: 'damageMultiplier',
        damageMultiplier: multiplier,
      })
      enemy.abilityCooldowns[ability.id] = ability.cooldownMs
    } else if (ability.effect === 'instantAttack') {
      performEnemyAttack(state, enemy)
      enemy.abilityCooldowns[ability.id] = ability.cooldownMs
    }
  }
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
