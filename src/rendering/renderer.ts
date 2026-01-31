import { abilitiesById } from '@/game/data'
import type { EnemyIntent, GameState } from '@/game/types'

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
    const scale = Math.min(width / 900, height / 540)
    ctx.clearRect(0, 0, width, height)

    // Background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    this.drawPlayer(state, width, height, scale)
    this.drawEnemies(state, width, height, scale)
    this.drawHud(state, width, height, scale)
  }

  private drawPlayer(state: GameState, width: number, height: number, scale: number) {
    const playerX = width * 0.25
    const playerY = height * 0.55
    const flash = state.player.hitFlashMs > 0
    const body = 60 * scale
    this.ctx.fillStyle = flash ? '#f8fafc' : '#38bdf8'
    this.ctx.fillRect(playerX - body / 2, playerY - body / 2, body, body)
    if (this.isBlocking(state)) {
      this.ctx.strokeStyle = '#22c55e'
      this.ctx.lineWidth = 3 * scale
      this.ctx.strokeRect(playerX - body / 2 - 6 * scale, playerY - body / 2 - 6 * scale, body + 12 * scale, body + 12 * scale)
      this.ctx.strokeStyle = '#10b981'
      this.ctx.strokeRect(playerX - body / 2 - 10 * scale, playerY - body / 2 - 10 * scale, body + 20 * scale, body + 20 * scale)
    }
    if (this.hasAttackSpeedBuff(state)) {
      this.ctx.strokeStyle = '#f59e0b'
      this.ctx.lineWidth = 2 * scale
      this.ctx.beginPath()
      this.ctx.arc(playerX, playerY, 46 * scale, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    this.drawHealthBar(playerX - 40 * scale, playerY - 64 * scale, 80 * scale, 8 * scale, state.player.hp, state.player.maxHp, '#38bdf8')
    this.drawRagePips(playerX, playerY + 52 * scale, state.player.rage, state.player.rageCap, scale)
  }

  private drawEnemies(state: GameState, width: number, height: number, scale: number) {
    const alive = state.enemies.filter((e) => e.alive)
    if (!alive.length) return
    const centerX = width * 0.72
    const centerY = height * 0.55
    const targetRows = 3
    const cols = Math.ceil(alive.length / targetRows) || 1
    const rows = Math.min(targetRows, Math.ceil(alive.length / cols))
    const spacingX = width * 0.24
    const spacingY = height * 0.28

    alive.forEach((enemy, idx) => {
      const row = Math.floor(idx / cols)
      const col = idx % cols
      const offsetX = (col - (cols - 1) / 2) * spacingX
      const offsetY = (row - (rows - 1) / 2) * spacingY
      const x = centerX + offsetX
      const y = centerY + offsetY
      const isTarget = enemy.id === this.currentTargetId(state)
      const flash = enemy.hitFlashMs > 0
      const radius = 30 * scale
      this.ctx.fillStyle = flash ? '#fde68a' : this.enemyColor(enemy)
      this.ctx.beginPath()
      this.ctx.arc(x, y, radius, 0, Math.PI * 2)
      this.ctx.fill()
      if (isTarget) {
        this.ctx.strokeStyle = '#f59e0b'
        this.ctx.lineWidth = 3 * scale
        this.ctx.beginPath()
        this.ctx.arc(x, y, radius + 6 * scale, 0, Math.PI * 2)
        this.ctx.stroke()
      }
      this.drawEnemyIntent(x, y, enemy, scale)
      this.drawHealthBar(x - 32 * scale, y - 48 * scale, 64 * scale, 6 * scale, enemy.hp, enemy.maxHp, '#ef4444')
      this.drawEnemyTimerBar(x - 42 * scale, y + 52 * scale, 84 * scale, 8 * scale, enemy)
    })
  }

  private drawHud(state: GameState, width: number, height: number, scale: number) {
    const slots: Array<'Q' | 'W' | 'E' | 'R'> = ['Q', 'W', 'E', 'R']
    const slotSpacing = 64 * scale
    const slotSize = 44 * scale
    const totalSlotsWidth = slotSize + slotSpacing * (slots.length - 1)
    const playerCenterX = width * 0.25
    const slotStartX = playerCenterX - totalSlotsWidth / 2

    // Attack timer bar for player, centered on the player model
    const barPadding = 18 * scale
    const barWidth = totalSlotsWidth + barPadding * 2
    const interval = state.player.baseAttackSpeedMs / Math.max(0.5, state.player.derived.attackSpeedMultiplier)
    const progress = 1 - state.player.attackTimerMs / interval
    this.drawBar(playerCenterX - barWidth / 2, height - 80 * scale, barWidth, 14 * scale, progress, '#38bdf8', '#1f2937')

    // Ability cooldowns centered under the attack bar and player
    slots.forEach((slot, idx) => {
      const x = slotStartX + idx * slotSpacing
      const remaining = state.player.abilityCooldowns[slot] ?? 0
      const abilityId = state.equippedAbilityIds[slot]
      const def = abilityId ? abilitiesById.get(abilityId) : undefined
      this.drawCooldownBox(x, height - 58 * scale, slot, remaining, def?.cooldownMs ?? 0, scale)
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

  private drawRagePips(centerX: number, y: number, rage: number, cap: number, scale: number) {
    const size = 10 * scale
    const gap = 4 * scale
    const totalWidth = cap * size + (cap - 1) * gap
    const startX = centerX - totalWidth / 2
    for (let i = 0; i < cap; i += 1) {
      this.ctx.fillStyle = i < rage ? '#f97316' : '#1f2937'
      this.ctx.fillRect(startX + i * (size + gap), y, size, size)
    }
  }

  private drawCooldownBox(
    x: number,
    y: number,
    label: string,
    remainingMs: number,
    totalMs: number,
    scale: number,
  ) {
    const size = 44 * scale
    this.ctx.strokeStyle = '#1f2937'
    this.ctx.lineWidth = 2 * scale
    this.ctx.strokeRect(x, y, size, size)
    const pct = totalMs ? Math.max(0, Math.min(1, 1 - remainingMs / totalMs)) : 1
    this.ctx.fillStyle = '#0ea5e9'
    this.ctx.fillRect(x, y + size * (1 - pct), size, size * pct)
    this.ctx.fillStyle = '#0b1224'
    this.ctx.font = `${12 * scale}px sans-serif`
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

  private drawEnemyIntent(x: number, y: number, enemy: GameState['enemies'][number], scale: number) {
    const intent = enemy.intent
    if (!intent) return
    const progress = intent.totalMs ? 1 - intent.remainingMs / intent.totalMs : 1
    const chip = this.intentColors(intent.effect)
    const isChannel = intent.phase === 'channeling'
    const paddingX = 8
    this.ctx.font = `${12 * scale}px sans-serif`
    const chipLabel = intent.phase === 'channeling'
      ? `${intent.abilityName} (Channeling)`
      : `${intent.abilityName} (Preparing)`
    const textWidth = this.ctx.measureText(chipLabel).width
    const chipWidth = textWidth + paddingX * 2 * scale
    const chipHeight = 18 * scale
    this.ctx.fillStyle = chip.bg
    this.ctx.strokeStyle = chip.border
    this.ctx.lineWidth = 1 * scale
    const chipX = x - chipWidth / 2
    const chipY = y - 90 * scale
    this.ctx.fillRect(chipX, chipY, chipWidth, chipHeight)
    this.ctx.strokeRect(chipX, chipY, chipWidth, chipHeight)
    this.ctx.fillStyle = chip.text
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(chipLabel, x, chipY + chipHeight / 2)

    const barX = x - 50 * scale
    const barY = y - 68 * scale
    const barW = 100 * scale
    const barH = 6 * scale
    this.ctx.save()
    this.ctx.fillStyle = isChannel ? '#0f172a' : '#0b1224'
    this.ctx.fillRect(barX, barY, barW, barH)
    this.ctx.globalAlpha = isChannel ? 0.5 : 0.28
    this.ctx.fillStyle = chip.bar
    this.ctx.fillRect(barX, barY, barW, barH)
    this.ctx.globalAlpha = 1
    this.ctx.fillStyle = chip.bar
    this.ctx.fillRect(barX, barY, barW * Math.max(0, Math.min(1, progress)), barH)
    this.ctx.restore()
  }

  private intentColors(effect: EnemyIntent['effect']) {
    if (effect === 'instantAttack') {
      return { bg: '#7f1d1d', border: '#b91c1c', text: '#fde68a', bar: '#ef4444' }
    }
    if (effect === 'damageBuff') {
      return { bg: '#0f172a', border: '#0ea5e9', text: '#e0f2fe', bar: '#38bdf8' }
    }
    if (effect === 'heal') {
      return { bg: '#064e3b', border: '#10b981', text: '#d1fae5', bar: '#34d399' }
    }
    if (effect === 'attackModifier') {
      return { bg: '#431407', border: '#ea580c', text: '#fed7aa', bar: '#f97316' }
    }
    return { bg: '#111827', border: '#334155', text: '#e5e7eb', bar: '#e5e7eb' }
  }

  private enemyColor(enemy: GameState['enemies'][number]) {
    const base = enemy.id.split('-')[0]
    if (base === 'shaman') return '#10b981'
    if (base === 'skirmisher') return '#f97316'
    if (base === 'brute') return '#ef4444'
    return '#ef4444'
  }

  private currentTargetId(state: GameState) {
    const target = state.enemies[state.targetIndex]
    if (target?.alive) return target.id
    const alive = state.enemies.find((e) => e.alive)
    return alive?.id
  }
}