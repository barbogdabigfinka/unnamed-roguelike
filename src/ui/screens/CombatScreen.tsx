import { useEffect, useRef } from 'react'
import type { GameController, GameState } from '@/game/types'
import { Renderer } from '@/rendering/renderer'
import { abilitiesById } from '@/game/data'

interface CombatScreenProps {
  game: GameController
  state: GameState
  onLevelUp: () => void
}

export function CombatScreen({ game, state, onLevelUp }: CombatScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new Renderer(canvas)
    game.setRenderer(renderer)
    game.startLoop()
    return () => game.stopLoop()
  }, [game])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (state.phase !== 'combat') return
      if (e.code === 'Space') {
        e.preventDefault()
        game.activateBlock()
      } else if (e.key === 'ArrowRight') {
        game.selectNextTarget()
      } else if (e.key === 'ArrowLeft') {
        game.selectPrevTarget()
      } else if (['q', 'w', 'e', 'r'].includes(e.key.toLowerCase())) {
        const slot = e.key.toUpperCase() as 'Q' | 'W' | 'E' | 'R'
        game.activateAbility(slot)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [game, state.phase])

  useEffect(() => {
    if (state.phase === 'levelUp') onLevelUp()
  }, [game, state.phase, onLevelUp])

  return (
    <div className="combat-shell">
      <div className="combat-main">
        <div className="hud">
          <div className="stat-block">
            <div className="label">HP</div>
            <div>
              {Math.round(state.player.hp)} / {state.player.maxHp}
            </div>
          </div>
          <div className="stat-block">
            <div className="label">Rage</div>
            <div>{state.player.rage} / {state.player.rageCap}</div>
          </div>
          <div className="stat-block">
            <div className="label">Level</div>
            <div>{state.level}</div>
          </div>
          <div className="stat-block">
            <div className="label">Fight</div>
            <div>{state.fightCount + 1}</div>
          </div>
        </div>

        <div className="canvas-wrap">
          <canvas ref={canvasRef} width={780} height={460} className="canvas" />
          <BuffOverlay buffs={state.player.buffs} />
        </div>

        <div className="ability-bar">
          {(['Q', 'W', 'E', 'R'] as const)
            .map((slot) => ({ slot, id: state.equippedAbilityIds[slot] }))
            .filter((entry) => entry.id)
            .map((entry) => {
              const def = abilitiesById.get(entry.id!)
              if (!def) return null
              return (
                <AbilitySlot
                  key={entry.slot}
                  label={entry.slot}
                  cooldown={state.player.abilityCooldowns[entry.slot]}
                  total={def.cooldownMs}
                  description={def.name}
                />
              )
            })}
          <AbilitySlot label="Space" cooldown={state.player.blockCooldownMs} total={5000} description="Block" />
        </div>
        <p className="muted">Controls: Arrow keys to swap targets, Space to Block, Q/W/E/R for abilities.</p>
      </div>

      <aside className="combat-sidebar">
        <h4>Combat Log</h4>
        <EventFeed events={state.recentEvents} />
      </aside>

      {(state.phase === 'victory' || state.phase === 'defeat') && (
        <div className="modal">
          <div className="modal-content">
            <h3>{state.phase === 'victory' ? 'Victory!' : 'Defeat'}</h3>
            <p className="muted">
              {state.phase === 'victory'
                ? 'Enemy defeated. Continue when ready.'
                : 'You were defeated. Restart to try again.'}
            </p>
            <div className="menu-actions">
              {state.phase === 'victory' && (
                <button onClick={() => game.resumeAfterLevel()}>Next Fight</button>
              )}
              {state.phase === 'defeat' && (
                <button onClick={() => window.location.reload()}>Restart</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SlotProps {
  label: string
  cooldown: number
  total: number
  description: string
}

function AbilitySlot({ label, cooldown, total, description }: SlotProps) {
  const pct = total > 0 ? 1 - cooldown / total : 1
  return (
    <div className="ability-slot">
      <div className="ability-label">{label}</div>
      <div className="ability-progress">
        <div className="ability-fill" style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} />
      </div>
      <div className="ability-desc">{description}</div>
    </div>
  )
}

function EventFeed({ events }: { events: string[] }) {
  if (!events.length) return null
  return (
    <div className="event-feed">
      {events.map((ev, idx) => (
        <div key={idx} className="event-line">
          {ev}
        </div>
      ))}
    </div>
  )
}

function BuffOverlay({ buffs }: { buffs: GameState['player']['buffs'] }) {
  if (!buffs.length) return null
  return (
    <div className="buff-overlay">
      {buffs.map((buff, idx) => {
        const def = abilitiesById.get(buff.id)
        const label = def?.name ?? buff.id
        return (
          <div key={idx} className="buff-chip">
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}