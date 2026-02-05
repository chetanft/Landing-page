import type { ReactNode } from 'react'
import { Tooltip as FTTooltip } from 'ft-design-system'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <FTTooltip content={content}>
      {children}
    </FTTooltip>
  )
}
