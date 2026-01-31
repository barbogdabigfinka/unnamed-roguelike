import { ReactNode, useId, useState } from 'react'

interface TooltipProps {
  label: string
  children: ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span role="tooltip" id={id} className={`tooltip-bubble ${open ? 'visible' : ''}`}>
        {label}
      </span>
    </span>
  )
}
