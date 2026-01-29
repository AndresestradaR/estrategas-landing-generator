'use client'

import { useState, useEffect } from 'react'
import { Key, Info, Check, X } from 'lucide-react'

interface CookieInputProps {
  onCookiesChange: (cookies: string) => void
}

const STORAGE_KEY = 'dropkiller_cookies'

export function CookieInput({ onCookiesChange }: CookieInputProps) {
  const [cookies, setCookies] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // Cargar cookies guardadas
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setCookies(saved)
      onCookiesChange(saved)
      setIsValid(true)
    }
  }, [])

  const handleSave = () => {
    if (cookies.trim()) {
      localStorage.setItem(STORAGE_KEY, cookies)
      onCookiesChange(cookies)
      setIsValid(true)
    }
  }

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCookies('')
    onCookiesChange('')
    setIsValid(null)
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-text-primary">Cookies de DropKiller</h3>
          {isValid === true && (
            <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
              <Check className="w-3 h-3" /> Guardadas
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-sm text-text-secondary hover:text-accent flex items-center gap-1"
        >
          <Info className="w-4 h-4" />
          ¿Cómo obtenerlas?
        </button>
      </div>

      {showInstructions && (
        <div className="mb-4 p-4 bg-accent/5 border border-accent/20 rounded-lg text-sm text-text-secondary space-y-2">
          <p className="font-medium text-text-primary">Instrucciones:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Ve a <a href="https://app.dropkiller.com" target="_blank" rel="noopener" className="text-accent hover:underline">app.dropkiller.com</a> e inicia sesión</li>
            <li>Presiona <kbd className="px-1.5 py-0.5 bg-border rounded text-xs">F12</kbd> para abrir DevTools</li>
            <li>Ve a la pestaña <strong>Application</strong> (o Storage)</li>
            <li>En el menú izquierdo, expande <strong>Cookies</strong></li>
            <li>Haz clic en <strong>app.dropkiller.com</strong></li>
            <li>Copia todos los valores en formato: <code className="bg-border px-1 rounded">nombre=valor; nombre2=valor2</code></li>
          </ol>
          <p className="text-xs text-text-secondary/70 mt-2">
            💡 Tip: Puedes usar la extensión "EditThisCookie" para copiar todas las cookies fácilmente.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={cookies}
          onChange={(e) => {
            setCookies(e.target.value)
            setIsValid(null)
          }}
          placeholder="Pega tus cookies aquí..."
          rows={2}
          className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none font-mono"
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!cookies.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-border disabled:text-text-secondary text-background text-sm font-medium rounded-lg transition-colors"
          >
            Guardar
          </button>
          {cookies && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error text-sm font-medium rounded-lg transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
