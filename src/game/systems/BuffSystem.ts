import { PLAYER_BASE_STATS } from '../core/config'
import { passivesById } from '../data'
import type { BuffInstance, DerivedStats } from '../types'

export function tickBuffs(buffs: BuffInstance[], deltaMs: number): BuffInstance[] {
  return buffs
    .map((buff) => ({ ...buff, remainingMs: buff.remainingMs - deltaMs }))
    .filter((buff) => buff.remainingMs > 0)
}

export function calculateDerivedStats(
  unlockedPassives: string[],
  playerBuffs: BuffInstance[],
): DerivedStats {
  let passiveMods = {
    attackSpeedMultiplier: 1,
    flatDamage: 0,
    maxHp: 1,
    damageReduction: 0,
  }

  for (const id of unlockedPassives) {
    const mods = passivesById.get(id)?.statModifiers
    if (!mods) continue
    passiveMods = {
      attackSpeedMultiplier: passiveMods.attackSpeedMultiplier * (mods.attackSpeedMultiplier ?? 1),
      flatDamage: passiveMods.flatDamage + (mods.flatDamage ?? 0),
      maxHp: passiveMods.maxHp * (mods.maxHp ?? 1),
      damageReduction: passiveMods.damageReduction + (mods.damageReduction ?? 0),
    }
  }

  const buffAttackSpeed = playerBuffs
    .filter((b) => b.type === 'attackSpeed')
    .reduce((acc, b) => acc + (b.attackSpeedBonus ?? 0), 0)
  const buffDamageReduction = playerBuffs
    .filter((b) => b.type === 'damageReduction')
    .reduce((acc, b) => Math.max(acc, b.damageReduction ?? 0), 0)

  return {
    attackSpeedMultiplier: passiveMods.attackSpeedMultiplier + buffAttackSpeed,
    flatDamage: passiveMods.flatDamage,
    maxHp: Math.round(PLAYER_BASE_STATS.maxHp * passiveMods.maxHp),
    damageReduction: Math.min(0.9, passiveMods.damageReduction + buffDamageReduction),
  }
}
