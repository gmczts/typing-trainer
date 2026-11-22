import { useEffect, useState } from 'react'
import { Moon, Palette, Sun } from 'lucide-react'
import { useVisualViewport } from './hooks/useVisualViewport'
import { loadPrevTheme, loadTheme, savePrevTheme, saveTheme, type Theme } from './core/storage'
import type { LanguageId } from './core/types'
import { getAdapter } from './languages'
import { HomeScreen } from './components/HomeScreen'
import { LanguageHome } from './components/LanguageHome'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'

type Screen = { kind: 'home' } | { kind: 'language'; id: LanguageId }

export default function App() {
  useVisualViewport()
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [theme, setTheme] = useState<Theme>(() => {
    // Preview links can force the Memphis theme: ?theme=memphis
    try {
      if (new URLSearchParams(window.location.search).get('theme') === 'memphis') {
        return 'memphis'
      }
    } catch {
      // ignore
    }
    return loadTheme()
  })
  const [prevTheme, setPrevTheme] = useState<'light' | 'dark'>(() => loadPrevTheme())

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    savePrevTheme(prevTheme)
  }, [prevTheme])

  const memphis = theme === 'memphis'
  // The light/dark theme underneath Memphis (used by the Moon/Sun toggle).
  const baseTheme: 'light' | 'dark' = memphis ? prevTheme : theme

  const toggleMemphis = () => {
    if (theme === 'memphis') {
      setTheme(prevTheme)
    } else {
      setPrevTheme(theme)
      setTheme('memphis')
    }
  }

  return (
    <div className="app-shell min-h-[var(--vv)] bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-2xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setScreen({ kind: 'home' })}
            className="text-base font-bold tracking-wide"
          >
            打字練習 <span className="font-normal text-muted-foreground">Typing Trainer</span>
          </button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMemphis}
              aria-label={memphis ? '關閉 Memphis 主題' : 'Memphis 主題'}
              aria-pressed={memphis}
              className={cn(memphis && 'bg-primary text-primary-foreground hover:bg-primary/90')}
            >
              <Palette className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(baseTheme === 'dark' ? 'light' : 'dark')}
              aria-label={baseTheme === 'dark' ? '轉淺色模式' : '轉深色模式'}
            >
              {baseTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {screen.kind === 'home' ? (
        <HomeScreen onSelect={(id) => setScreen({ kind: 'language', id })} memphis={memphis} />
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
