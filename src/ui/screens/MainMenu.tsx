interface MainMenuProps {
  canContinue: boolean
  onStart: () => void
  onContinue: () => void
}

export function MainMenu({ canContinue, onStart, onContinue }: MainMenuProps) {
  return (
    <div className="panel">
      <h1>Rage Roguelike</h1>
      <p className="muted">Singleplayer prototype — React + Canvas 2D</p>
      <div className="menu-actions">
        <button onClick={onStart}>Start</button>
        <button onClick={onContinue} disabled={!canContinue}>
          Continue
        </button>
      </div>
      {!canContinue && <p className="muted">No save detected yet.</p>}
    </div>
  )
}