import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useVisualViewport } from './hooks/useVisualViewport'
import { loadTheme, saveTheme } from './core/storage'
import type { LanguageId } from './core/types'
import { getAdapter } from './languages'
import { HomeScreen } from './components/HomeScreen'
import { LanguageHome } from './components/LanguageHome'
import { Button } from './components/ui/button'

type Screen = { kind: 'home' } | { kind: 'language'; id: LanguageId }

export default function App() {
  useVisualViewport()
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    saveTheme(theme)
  }, [theme])

  return (
    <div className="min-h-[var(--vv)] bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-11 w-full max-w-2xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setScreen({ kind: 'home' })}
            className="text-sm font-bold tracking-wide"
          >
            打字練習 <span className="font-normal text-muted-foreground">Typing Trainer</span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? '轉淺色模式' : '轉深色模式'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {screen.kind === 'home' ? (
        <HomeScreen onSelect={(id) => setScreen({ kind: 'language', id })} />
      ) : (
        <LanguageHome
          key={screen.id}
          adapter={getAdapter(screen.id)}
          onBack={() => setScreen({ kind: 'home' })}
        />
      )}
    </div>
  )
}
