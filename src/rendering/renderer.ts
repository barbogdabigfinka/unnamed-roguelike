import { abilitiesById } from '@/game/data'
import type { GameState } from '@/game/types'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable')
    }
    this.canvas = canvas
    this.ctx = ctx
  }

  render(state: GameState) {
    const { ctx } = this
    const width = this.canvas.width
    const height = this.canvas.height
    ctx.clearRect(0, 0, width, height)

    // Background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    this.drawPlayer(state, width, height)
    this.drawEnemies(state, width, height)
    this.drawHud(state, width, height)
  }

  private drawPlayer(state: GameState, width: number, height: number) {
    const playerX = width * 0.2
    const playerY = height * 0.6
    const flash = state.player.hitFlashMs > 0
    this.ctx.fillStyle = flash ? '#f8fafc' : '#38bdf8'
    this.ctx.fillRect(playerX - 30, playerY - 30, 60, 60)
    if (this.isBlocking(state)) {
      this.ctx.strokeStyle = '#22c55e'
      this.ctx.lineWidth = 3
      this.ctx.strokeRect(playerX - 36, playerY - 36, 72, 72)
      this.ctx.strokeStyle = '#10b981'
      this.ctx.strokeRect(playerX - 40, playerY - 40, 80, 80)
    }
    if (this.hasAttackSpeedBuff(state)) {
      this.ctx.strokeStyle = '#f59e0b'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(playerX, playerY, 46, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    this.drawHealthBar(playerX - 40, playerY - 50, 80, 8, state.player.hp, state.player.maxHp, '#38bdf8')
    this.drawRagePips(playerX - 40, playerY + 40, state.player.rage, state.player.rageCap)
  }

  private drawEnemies(state: GameState, width: number, height: number) {
    const alive = state.enemies.filter((e) => e.alive)
    if (!alive.length) return
    const spacing = width * 0.28
    const baseX = width * 0.6
    const centerY = height * 0.42

    alive.forEach((enemy, idx) => {
      const x = baseX + (idx / Math.max(alive.length - 1, 1)) * spacing
      const y = centerY + (idx % 2 === 0 ? -20 : 20)
      const isTarget = enemy.id === this.currentTargetId(state)
      const flash = enemy.hitFlashMs > 0
      this.ctx.fillStyle = flash ? '#fde68a' : isTarget ? '#f59e0b' : '#ef4444'
      this.ctx.beginPath()
      this.ctx.arc(x, y, 28, 0, Math.PI * 2)
      this.ctx.fill()
      this.drawHealthBar(x - 30, y - 40, 60, 6, enemy.hp, enemy.maxHp, '#ef4444')
      this.drawEnemyTimerBar(x - 30, y + 34, 60, 6, enemy)
    })
  }

  private drawHud(state: GameState, width: number, height: number) {
    // Attack timer bar for player
    const barWidth = 220
    const interval = state.player.baseAttackSpeedMs / Math.max(0.5, state.player.derived.attackSpeedMultiplier)
    const progress = 1 - state.player.attackTimerMs / interval
    this.drawBar(width * 0.1, height - 70, barWidth, 12, progress, '#38bdf8', '#1f2937')

    // Ability cooldowns
    const slots: Array<'Q' | 'W' | 'E' | 'R'> = ['Q', 'W', 'E', 'R']
    slots.forEach((slot, idx) => {
      const x = width * 0.1 + idx * 60
      const remaining = state.player.abilityCooldowns[slot] ?? 0
      const abilityId = state.equippedAbilityIds[slot]
      const def = abilityId ? abilitiesById.get(abilityId) : undefined
      this.drawCooldownBox(x, height - 50, slot, remaining, def?.cooldownMs ?? 0)
    })
  }

  private drawBar(x: number, y: number, w: number, h: number, progress: number, color: string, bg: string) {
    this.ctx.fillStyle = bg
    this.ctx.fillRect(x, y, w, h)
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, Math.max(0, Math.min(1, progress)) * w, h)
  }

  private drawHealthBar(x: number, y: number, w: number, h: number, hp: number, maxHp: number, color: string) {
    const pct = maxHp === 0 ? 0 : hp / maxHp
    this.drawBar(x, y, w, h, pct, color, '#0f172a')
  }

  private drawRagePips(x: number, y: number, rage: number, cap: number) {
    const size = 10
    for (let i = 0; i < cap; i += 1) {
      this.ctx.fillStyle = i < rage ? '#f97316' : '#1f2937'
      this.ctx.fillRect(x + i * (size + 4), y, size, size)
    }
  }

  private drawCooldownBox(x: number, y: number, label: string, remainingMs: number, totalMs: number) {
    const size = 40
    this.ctx.strokeStyle = '#1f2937'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, size, size)
    const pct = totalMs ? Math.max(0, Math.min(1, 1 - remainingMs / totalMs)) : 1
    this.ctx.fillStyle = '#0ea5e9'
    this.ctx.fillRect(x, y + size * (1 - pct), size, size * pct)
    this.ctx.fillStyle = '#0b1224'
    this.ctx.font = '12px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(label, x + size / 2, y + size / 2)
  }

  private isBlocking(state: GameState) {
    return state.player.buffs.some((b) => b.id === 'block' && b.remainingMs > 0)
  }

  private hasAttackSpeedBuff(state: GameState) {
    return state.player.buffs.some((b) => b.type === 'attackSpeed' && b.remainingMs > 0)
  }

  private drawEnemyTimerBar(x: number, y: number, w: number, h: number, enemy: GameState['enemies'][number]) {
    const interval = enemy.attackIntervalMs || enemy.attackSpeedMaxMs || 1
    const progress = 1 - enemy.attackTimerMs / interval
    this.drawBar(x, y, w, h, progress, '#f97316', '#1f2937')
  }

  private currentTargetId(state: GameState) {
    const target = state.enemies[state.targetIndex]
    if (target?.alive) return target.id
    const alive = state.enemies.find((e) => e.alive)
    return alive?.id
  }
}