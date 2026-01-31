import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { MainMenu } from '@/ui/screens/MainMenu'
import { CharacterSelect } from '@/ui/screens/CharacterSelect'
import { CombatScreen } from '@/ui/screens/CombatScreen'
import { LevelUpModal } from '@/ui/screens/LevelUpModal'
import { Game } from '@/game/game'
import type { GameController } from '@/game/types'
import { useGameState } from '@/ui/hooks/useGameState'

type Screen = 'menu' | 'character' | 'combat'

export default function App() {
  const game = useMemo<GameController>(() => new Game(), [])
  const state = useGameState(game)
  const [screen, setScreen] = useState<Screen>('menu')
  const [showLevelUp, setShowLevelUp] = useState(false)

  useEffect(() => {
    if (state.phase === 'levelUp') {
      setShowLevelUp(true)
    }
  }, [state.phase])

  const startNew = () => {
    game.startNewRun()
    setScreen('character')
  }

  const handleCharacterSelect = () => {
    setScreen('combat')
  }

  const handleContinue = () => {
    // Save/load pipeline placeholder: continue disabled until implemented
  }

  const closeLevelUp = () => {
    setShowLevelUp(false)
    game.resumeAfterLevel()
  }

  return (
    <div className="app-shell">
      {screen === 'menu' && (
        <MainMenu canContinue={false} onStart={startNew} onContinue={handleContinue} />
      )}

      {screen === 'character' && (
        <CharacterSelect onSelect={handleCharacterSelect} onBack={() => setScreen('menu')} />
      )}

      {screen === 'combat' && <CombatScreen game={game} state={state} onLevelUp={() => setShowLevelUp(true)} />}

      {showLevelUp && <LevelUpModal game={game} state={state} onClose={closeLevelUp} />}
    </div>
  )
}
