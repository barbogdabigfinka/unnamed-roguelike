import { abilitiesById, passivesById } from '@/game/data'
import { Tooltip } from '@/ui/components/Tooltip'
import type { TalentNodeDefinition, TalentTreeDefinition } from '@/game/types'

interface TalentTreeProps {
  tree: TalentTreeDefinition
  unlocked: string[]
  talentPoints: number
  onSelect: (nodeId: string) => void
}

export function TalentTree({ tree, unlocked, talentPoints, onSelect }: TalentTreeProps) {
  return (
    <div className="talent-tree">
      {tree.rows.map((row, idx) => (
        <div key={idx} className="talent-row">
          {row.map((node) => {
            const state = getNodeState(node, unlocked, talentPoints, tree)
            const tooltip = getTooltip(node)
            return (
              <Tooltip key={node.id} label={tooltip}>
                <button
                  className={`talent-node ${state}`}
                  onClick={() => state === 'available' && onSelect(node.id)}
                  disabled={state !== 'available'}
                >
                  <div className="talent-label">{node.label}</div>
                  <div className="talent-type">{node.type === 'ability' ? 'Ability' : 'Passive'}</div>
                </button>
              </Tooltip>
            )
          })}
        </div>
      ))}
      <p className="muted">Spend talent points to unlock abilities and passives. Row unlocks require points in prior rows.</p>
    </div>
  )
}

function getTooltip(node: TalentNodeDefinition): string {
  if (node.type === 'ability' && node.abilityId) {
    const def = abilitiesById.get(node.abilityId)
    if (def) {
      const desc = def.description ? `: ${def.description}` : ''
      return `${def.name}${desc}`
    }
  }
  if (node.type === 'passive' && node.passiveId) {
    const def = passivesById.get(node.passiveId)
    if (def) {
      const desc = def.description ? `: ${def.description}` : ''
      return `${def.name}${desc}`
    }
  }
  return 'Talent details coming soon'
}

function getNodeState(
  node: TalentNodeDefinition,
  unlocked: string[],
  talentPoints: number,
  tree: TalentTreeDefinition,
): 'purchased' | 'available' | 'locked' {
  if (unlocked.includes(node.id)) return 'purchased'
  if (talentPoints <= 0) return 'locked'
  const prereqs = node.prerequisiteIds ?? []
  const hasPrereqs = prereqs.every((p) => unlocked.includes(p))
  if (!hasPrereqs) return 'locked'
  const required = tree.rowUnlockRequirements[node.row] ?? 0
  const pointsInPreviousRows = unlocked.filter((id) => {
    const match = findNode(tree, id)
    return match && match.row < node.row
  }).length
  if (pointsInPreviousRows < required) return 'locked'
  return 'available'
}

function findNode(tree: TalentTreeDefinition, id: string) {
  for (const row of tree.rows) {
    const node = row.find((n) => n.id === id)
    if (node) return node
  }
  return undefined
}