import abilities from '@/data/abilities.json'
import enemies from '@/data/enemies.json'
import passives from '@/data/passives.json'
import talentTree from '@/data/talentTree.json'
import type {
  AbilityDefinition,
  EnemyDefinition,
  PassiveDefinition,
  TalentTreeDefinition,
} from './types'

export const abilityList = abilities as AbilityDefinition[]
export const passiveList = passives as PassiveDefinition[]
export const enemyList = enemies as EnemyDefinition[]
export const talentTreeDefinition = talentTree as TalentTreeDefinition

export const abilitiesById = new Map<string, AbilityDefinition>(
  abilityList.map((a) => [a.id, a]),
)

export const passivesById = new Map<string, PassiveDefinition>(
  passiveList.map((p) => [p.id, p]),
)

export const enemiesById = new Map<string, EnemyDefinition>(
  enemyList.map((e) => [e.id, e]),
)