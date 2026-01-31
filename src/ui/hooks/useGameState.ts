import { useEffect, useState } from 'react'
import type { GameController, GameState } from '@/game/types'

export function useGameState(game: GameController) {
  const [state, setState] = useState<GameState>(() => game.getState())

  useEffect(() => {
    const unsubscribe = game.subscribe(setState)
    return () => unsubscribe()
  }, [game])

  return state
}