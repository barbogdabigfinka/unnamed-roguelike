import { useState } from 'react'

import { talentTreeDefinition } from '@/game/data'
import { TalentTree } from '@/ui/components/TalentTree'
import type { GameController, GameState, TalentTreeDefinition } from '@/game/types'

type TalentTreeOption =
  | {
      id: string
      name: string
      description: string
      status: 'available'
      tree: TalentTreeDefinition
    }
  | {
      id: string
      name: string
      description: string
      status: 'wip'
    }

interface LevelUpModalProps {
  game: GameController
  state: GameState
  onClose: () => void
}

export function LevelUpModal({ game, state, onClose }: LevelUpModalProps) {
  const trees: TalentTreeOption[] = [
    {
      id: 'rage',
      name: 'Rage',
      description: 'Berserker talents focused on aggression, crits, and bleed.',
      status: 'available' as const,
      tree: talentTreeDefinition,
    },
    {
      id: 'guardian',
      name: 'Coming soon...',
      description: 'Work in progress.',
      status: 'wip' as const,
    },
    {
      id: 'mystic',
      name: 'Coming soon...',
      description: 'Work in progress.',
      status: 'wip' as const,
    },
  ]

  const firstAvailableId = trees.find((tree) => tree.status === 'available')?.id ?? trees[0].id
  const [selectedTreeId, setSelectedTreeId] = useState(firstAvailableId)

  const activeTree = trees.find((tree) => tree.id === selectedTreeId)
  const activeAvailableTree = activeTree && activeTree.status === 'available' ? activeTree : undefined

  const handleSelect = (nodeId: string) => {
    if (!activeAvailableTree) return
    game.applyTalent(nodeId)
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Level Up!</h2>
        <p>You have {state.talentPoints} talent point(s) to spend.</p>
        <p className="muted">Choose a specialization. Additional trees are coming soon.</p>
        <div className="card-row">
          {trees.map((tree) => {
            const isAvailable = tree.status === 'available'
            const isSelected = selectedTreeId === tree.id
            return (
              <div
                key={tree.id}
                className={`card ${isAvailable ? 'selectable' : 'locked'} ${isSelected ? 'active' : ''}`}
                onClick={isAvailable ? () => setSelectedTreeId(tree.id) : undefined}
                role={isAvailable ? 'button' : undefined}
                tabIndex={isAvailable ? 0 : -1}
              >
                <h3>{tree.name}</h3>
                <p className="muted">{tree.description}</p>
              </div>
            )
          })}
        </div>
        {activeAvailableTree && (
          <TalentTree
            tree={activeAvailableTree.tree}
            unlocked={state.unlockedTalents}
            talentPoints={state.talentPoints}
            onSelect={handleSelect}
          />
        )}
        <div className="menu-actions">
          <button onClick={onClose} disabled={state.talentPoints > 0 && state.level < 10}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}