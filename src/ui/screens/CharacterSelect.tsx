interface CharacterSelectProps {
  onSelect: () => void
  onBack: () => void
}

export function CharacterSelect({ onSelect, onBack }: CharacterSelectProps) {
  return (
    <div className="panel">
      <h2>Select Your Class</h2>
      <div className="card-row">
        <div className="card selectable" onClick={onSelect} role="button" tabIndex={0}>
          <h3>Rage Warrior</h3>
          <p className="muted">Rage-based fighter with rapid strikes.</p>
          <p className="muted">Signature: Rage Strike (Q)</p>
        </div>
        <div className="card locked">
          <h3>Locked</h3>
          <p className="muted">Unlock in future updates.</p>
        </div>
        <div className="card locked">
          <h3>Locked</h3>
          <p className="muted">Unlock in future updates.</p>
        </div>
      </div>
      <div className="menu-actions">
        <button onClick={onBack} className="ghost">
          Back
        </button>
      </div>
    </div>
  )
}