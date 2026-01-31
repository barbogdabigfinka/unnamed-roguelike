import { abilitiesById, enemiesById, enemyList, talentTreeDefinition } from './data'
import { BLOCK, LEVEL_TARGETS, MAX_LEVEL, PLAYER_BASE_STATS } from './core/config'
import {
  dealDamageToEnemy as applyDamageToEnemy,
  performEnemyAttack as performEnemyAttackAction,
  performPlayerAttack as performPlayerAttackAction,
  tryEnemyAbilities as runEnemyAbilities,
} from './combat/CombatManager'
import type {
  AbilitySlot,
  EnemyDefinition,
  EnemyState,
  GameRenderer,
  GameState,
  GameStateListener,
  TalentNodeDefinition,
} from './types'
import { castAbility } from './systems/AbilitySystem'
import { calculateDerivedStats, tickBuffs } from './systems/BuffSystem'

export class Game {
  private state: GameState
  private listeners = new Set<GameStateListener>()
  private renderer: GameRenderer | null = null
  private rafId: number | null = null
  private lastFrame = 0
  private accumulator = 0
  private readonly tickMs = 1000 / 60

  constructor() {
    this.state = this.createInitialState()
  }

  public setRenderer(renderer: GameRenderer | null) {
    this.renderer = renderer
  }

  public subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  public getState(): GameState {
    return this.snapshot()
  }

  private snapshot(): GameState {
    const player = this.state.player
    const enemies = this.state.enemies.map((enemy) => ({
      ...enemy,
      buffs: enemy.buffs.map((b) => ({ ...b })),
      abilityCooldowns: { ...enemy.abilityCooldowns },
    }))

    return {
      ...this.state,
      recentEvents: [...this.state.recentEvents],
      unlockedTalents: [...this.state.unlockedTalents],
      unlockedPassives: [...this.state.unlockedPassives],
      knownAbilities: [...this.state.knownAbilities],
      equippedAbilityIds: { ...this.state.equippedAbilityIds },
      player: {
        ...player,
        abilityCooldowns: { ...player.abilityCooldowns },
        buffs: player.buffs.map((b) => ({ ...b })),
        derived: { ...player.derived },
        empoweredAttack: player.empoweredAttack ? { ...player.empoweredAttack } : null,
      },
      enemies,
    }
  }

  private emit() {
    const snap = this.snapshot()
    this.listeners.forEach((l) => l(snap))
  }

  private pushEvent(message: string) {
    this.state.recentEvents = [message, ...this.state.recentEvents].slice(0, 5)
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      level: 1,
      fightCount: 0,
      fightsToNextLevel: LEVEL_TARGETS[0],
      talentPoints: 0,
      targetIndex: 0,
      unlockedTalents: [],
      unlockedPassives: [],
      knownAbilities: [],
      equippedAbilityIds: { Q: null, W: null, E: null, R: null },
      recentEvents: [],
      player: {
        name: 'Rage Warrior',
        hp: PLAYER_BASE_STATS.maxHp,
        maxHp: PLAYER_BASE_STATS.maxHp,
        baseDamage: PLAYER_BASE_STATS.baseDamage,
        baseAttackSpeedMs: PLAYER_BASE_STATS.baseAttackSpeedMs,
        attackTimerMs: PLAYER_BASE_STATS.baseAttackSpeedMs,
        rage: 0,
        rageCap: PLAYER_BASE_STATS.rageCap,
        rageBonusDamage: PLAYER_BASE_STATS.rageBonusDamage,
        abilityCooldowns: { Q: 0, W: 0, E: 0, R: 0 },
        blockCooldownMs: 0,
        buffs: [],
        empoweredAttack: null,
        hitFlashMs: 0,
        derived: {
          attackSpeedMultiplier: 1,
          flatDamage: 0,
          maxHp: PLAYER_BASE_STATS.maxHp,
          damageReduction: 0,
        },
      },
      enemies: [],
    }
  }

  private resetPlayerForCombat() {
    const player = this.state.player
    player.attackTimerMs = PLAYER_BASE_STATS.baseAttackSpeedMs
    player.abilityCooldowns = { Q: 0, W: 0, E: 0, R: 0 }
    player.blockCooldownMs = 0
    player.buffs = []
    player.empoweredAttack = null
    player.hitFlashMs = 0
    player.rage = 0
    this.applyDerivedStats()
  }

  public startNewRun() {
    this.state = this.createInitialState()
    this.spawnNextEnemy(true)
    this.emit()
  }

  public startLoop() {
    if (this.rafId) return
    this.lastFrame = performance.now()
    const step = (time: number) => {
      const delta = time - this.lastFrame
      this.lastFrame = time
      this.accumulator += delta
      while (this.accumulator >= this.tickMs) {
        this.update(this.tickMs)
        this.accumulator -= this.tickMs
      }
      this.renderer?.render(this.state)
      this.rafId = requestAnimationFrame(step)
    }
    this.rafId = requestAnimationFrame(step)
  }

  public stopLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private update(deltaMs: number) {
    if (this.state.phase !== 'combat') return
    this.tickPlayer(deltaMs)
    this.tickEnemies(deltaMs)
    this.checkCombatResolution()
    this.emit()
  }

  private tickPlayer(deltaMs: number) {
    const player = this.state.player
    this.reduceAbilityCooldowns(player.abilityCooldowns, deltaMs)
    player.blockCooldownMs = Math.max(0, player.blockCooldownMs - deltaMs)
    player.hitFlashMs = Math.max(0, player.hitFlashMs - deltaMs)
    this.updateBuffs(deltaMs)

    const interval = this.getPlayerAttackInterval()
    player.attackTimerMs = Math.max(0, player.attackTimerMs - deltaMs)
    if (player.attackTimerMs <= 0) {
      this.performPlayerAttack()
      player.attackTimerMs = interval
    }
  }

  private tickEnemies(deltaMs: number) {
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue
      this.reduceAbilityCooldowns(enemy.abilityCooldowns, deltaMs)
      enemy.attackTimerMs = Math.max(0, enemy.attackTimerMs - deltaMs)
      enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs)
      enemy.buffs = tickBuffs(enemy.buffs, deltaMs)
      if (enemy.attackTimerMs <= 0) {
        this.performEnemyAttack(enemy)
        const next = this.rollEnemyAttackInterval(enemy)
        enemy.attackIntervalMs = next
        enemy.attackTimerMs = next
      }
      this.tryEnemyAbilities(enemy)
    }
  }

  private updateBuffs(deltaMs: number) {
    const player = this.state.player
    player.buffs = tickBuffs(player.buffs, deltaMs)
    this.applyDerivedStats()
  }

  private applyDerivedStats() {
    const player = this.state.player
    player.derived = calculateDerivedStats(this.state.unlockedPassives, player.buffs)
    player.maxHp = player.derived.maxHp
    player.hp = Math.min(player.hp, player.maxHp)
  }

  private reduceAbilityCooldowns(record: Record<string, number>, deltaMs: number) {
    for (const key of Object.keys(record)) {
      record[key] = Math.max(0, record[key] - deltaMs)
    }
  }

  private getPlayerAttackInterval() {
    const player = this.state.player
    const speed = Math.max(0.5, player.derived.attackSpeedMultiplier)
    return PLAYER_BASE_STATS.baseAttackSpeedMs / speed
  }

  private performPlayerAttack() {
    performPlayerAttackAction(this.state, {
      getCurrentTarget: () => this.getCurrentTarget(),
      onEvent: (message) => this.pushEvent(message),
    })
  }

  private performEnemyAttack(enemy: EnemyState) {
    performEnemyAttackAction(this.state, enemy)
  }

  private tryEnemyAbilities(enemy: EnemyState) {
    runEnemyAbilities(this.state, enemy)
  }

  private checkCombatResolution() {
    const allDead = this.state.enemies.every((e) => !e.alive)
    if (allDead) {
      this.onVictory()
    } else if (this.state.player.hp <= 0) {
      this.state.phase = 'defeat'
    }
  }

  private onVictory() {
    this.state.phase = 'victory'
    this.pushEvent('Victory!')
    this.state.fightCount += 1
    const needsLevel =
      this.state.level < MAX_LEVEL &&
      this.state.fightCount >= this.state.fightsToNextLevel
    if (needsLevel) {
      this.state.level += 1
      this.state.talentPoints += 1
      const nextTarget = LEVEL_TARGETS[Math.min(this.state.level - 1, LEVEL_TARGETS.length - 1)]
      this.state.fightsToNextLevel = this.state.fightCount + nextTarget
      this.state.phase = 'levelUp'
    }
  }

  public resumeAfterLevel() {
    if (this.state.phase === 'levelUp' || this.state.phase === 'victory') {
      this.spawnNextEnemy(false)
      this.state.phase = 'combat'
      this.emit()
    }
  }

  public selectNextTarget() {
    const alive = this.state.enemies.filter((e) => e.alive)
    if (!alive.length) return
    const current = this.getCurrentTarget()
    const currentIdx = alive.findIndex((e) => e.id === current?.id)
    const next = (currentIdx + 1) % alive.length
    const target = alive[next]
    const fullIdx = this.state.enemies.findIndex((e) => e.id === target.id)
    this.state.targetIndex = fullIdx >= 0 ? fullIdx : 0
    this.emit()
  }

  public selectPrevTarget() {
    const alive = this.state.enemies.filter((e) => e.alive)
    if (!alive.length) return
    const current = this.getCurrentTarget()
    const currentIdx = alive.findIndex((e) => e.id === current?.id)
    const next = (currentIdx - 1 + alive.length) % alive.length
    const target = alive[next]
    const fullIdx = this.state.enemies.findIndex((e) => e.id === target.id)
    this.state.targetIndex = fullIdx >= 0 ? fullIdx : 0
    this.emit()
  }

  public activateBlock() {
    const player = this.state.player
    if (player.blockCooldownMs > 0) return
    player.buffs.push({
      id: 'block',
      remainingMs: BLOCK.durationMs,
      type: 'damageReduction',
      damageReduction: BLOCK.damageReduction,
    })
    player.attackTimerMs += BLOCK.durationMs
    player.blockCooldownMs = BLOCK.cooldownMs
    this.applyDerivedStats()
    this.pushEvent('Block activated.')
    this.emit()
  }

  public activateAbility(slot: AbilitySlot) {
    const abilityId = this.state.equippedAbilityIds[slot]
    if (!abilityId) return
    const ability = abilitiesById.get(abilityId)
    if (!ability) return
    const remaining = this.state.player.abilityCooldowns[slot]
    if (remaining > 0) return

    castAbility(ability, this.state, {
      performPlayerAttack: () => this.performPlayerAttack(),
      getPlayerAttackInterval: () => this.getPlayerAttackInterval(),
      getCurrentTarget: () => this.getCurrentTarget(),
      performInterrupt: () => this.performInterrupt(),
      dealDamageToEnemy: (enemy, damage) => this.dealDamageToEnemy(enemy, damage),
      applyDerivedStats: () => this.applyDerivedStats(),
    })
    this.state.player.abilityCooldowns[slot] = ability.cooldownMs
    this.pushEvent(`${ability.name} used.`)
    this.emit()
  }

  private performInterrupt() {
    this.state.player.attackTimerMs = this.getPlayerAttackInterval()
  }

  private dealDamageToEnemy(enemy: EnemyState, damage: number) {
    applyDamageToEnemy(enemy, damage)
  }

  private getCurrentTarget() {
    const alive = this.state.enemies.filter((e) => e.alive)
    if (!alive.length) return null
    const desired = this.state.enemies[this.state.targetIndex]
    if (desired?.alive) return desired
    return alive[0]
  }

  private spawnNextEnemy(isTutorial: boolean) {
    const definition = isTutorial
      ? enemiesById.get('tutorialDummy')
      : this.randomEnemy()
    if (!definition) return
    const enemy = this.instantiateEnemy(definition)
    this.state.enemies = [enemy]
    this.state.targetIndex = 0
    this.resetPlayerForCombat()
    this.state.phase = 'combat'
  }

  private randomEnemy(): EnemyDefinition | undefined {
    const pool = enemyList.filter((e) => e.id !== 'tutorialDummy')
    return pool[Math.floor(Math.random() * pool.length)]
  }

  private instantiateEnemy(def: EnemyDefinition) {
    const cooldowns: Record<string, number> = {}
    def.abilities.forEach((a) => (cooldowns[a.id] = 0))
    const interval = this.rollBetween(def.attackSpeedMinMs, def.attackSpeedMaxMs)
    return {
      id: def.id,
      name: def.name,
      hp: def.maxHp,
      maxHp: def.maxHp,
      baseDamage: def.baseDamage,
      attackTimerMs: interval,
      attackIntervalMs: interval,
      attackSpeedMinMs: def.attackSpeedMinMs,
      attackSpeedMaxMs: def.attackSpeedMaxMs,
      slowMultiplier: 1,
      buffs: [],
      hitFlashMs: 0,
      abilities: def.abilities,
      abilityCooldowns: cooldowns,
      alive: true,
    }
  }

  private rollBetween(min: number, max: number) {
    return min + Math.random() * (max - min)
  }

  private rollEnemyAttackInterval(enemy: EnemyState) {
    const slowed = Math.max(1, enemy.slowMultiplier)
    return this.rollBetween(enemy.attackSpeedMinMs, enemy.attackSpeedMaxMs) * slowed
  }

  public applyTalent(nodeId: string) {
    const node = this.findTalentNode(nodeId)
    if (!node) return
    if (this.state.talentPoints <= 0) return
    if (this.state.unlockedTalents.includes(node.id)) return
    if (!this.meetsTalentRequirements(node)) return

    this.state.unlockedTalents.push(node.id)
    this.state.talentPoints -= 1

    if (node.type === 'ability' && node.abilityId) {
      this.learnAbility(node.abilityId)
    } else if (node.type === 'passive' && node.passiveId) {
      this.learnPassive(node.passiveId)
    }
    this.emit()
  }

  private learnAbility(abilityId: string) {
    const ability = abilitiesById.get(abilityId)
    if (!ability) return
    if (!this.state.knownAbilities.includes(abilityId)) {
      this.state.knownAbilities.push(abilityId)
    }
    this.state.equippedAbilityIds[ability.slot] = abilityId
  }

  private learnPassive(passiveId: string) {
    if (!this.state.unlockedPassives.includes(passiveId)) {
      this.state.unlockedPassives.push(passiveId)
        this.applyDerivedStats()
    }
  }

  private meetsTalentRequirements(node: TalentNodeDefinition): boolean {
    const prereqs = node.prerequisiteIds ?? []
    const hasPrereqs = prereqs.every((id) => this.state.unlockedTalents.includes(id))
    if (!hasPrereqs) return false
    const required = talentTreeDefinition.rowUnlockRequirements[node.row] ?? 0
    const pointsBeforeRow = this.pointsInRowsBefore(node.row)
    return pointsBeforeRow >= required
  }

  private pointsInRowsBefore(row: number) {
    return this.state.unlockedTalents.filter((id) => {
      const node = this.findTalentNode(id)
      return node && node.row < row
    }).length
  }

  private findTalentNode(id: string): TalentNodeDefinition | undefined {
    for (const row of talentTreeDefinition.rows) {
      const match = row.find((n) => n.id === id)
      if (match) return match
    }
    return undefined
  }
}