import { TalentTree } from '@/ui/components/TalentTree'
import { talentTreeDefinition } from '@/game/data'
import type { GameController, GameState } from '@/game/types'

interface LevelUpModalProps {
  game: GameController
  state: GameState
  onClose: () => void
}

export function LevelUpModal({ game, state, onClose }: LevelUpModalProps) {
  const handleSelect = (nodeId: string) => {
    game.applyTalent(nodeId)
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Level Up!</h2>
        <p>You have {state.talentPoints} talent point(s) to spend.</p>
        <TalentTree
          tree={talentTreeDefinition}
          unlocked={state.unlockedTalents}
          talentPoints={state.talentPoints}
          onSelect={handleSelect}
        />
        <div className="menu-actions">
          <button onClick={onClose} disabled={state.talentPoints > 0 && state.level < 10}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}