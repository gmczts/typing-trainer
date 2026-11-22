import { Check } from 'lucide-react'
import { levelCountFor } from '../core/types'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

export interface LevelGridProps {
  wordCount: number
  completedLevels: number[]
  currentLevel: number
  onSelect: (level: number) => void
}

/** Progress grid — one cell per level, completed levels ticked. */
export function LevelGrid({ wordCount, completedLevels, currentLevel, onSelect }: LevelGridProps) {
  const total = levelCountFor(wordCount)
  const done = new Set(completedLevels)
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
      {Array.from({ length: total }, (_, i) => i + 1).map((level) => {
        const isDone = done.has(level)
        const isCurrent = level === currentLevel
        return (
          <Button
            key={level}
            variant={isDone ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onSelect(level)}
            className={cn(
              'h-9 px-0 text-xs tabular-nums',
              isCurrent && 'ring-2 ring-primary',
              isDone && 'text-green-700 dark:text-green-400',
            )}
            aria-label={`第 ${level} 課${isDone ? '（已完成）' : ''}`}
          >
            {isDone && <Check className="mr-0.5 h-3 w-3" />}
            {level}
          </Button>
        )
      })}
    </div>
  )
}
