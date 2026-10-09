import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

// Saisie d'un code à 6 chiffres : une case par chiffre, passage automatique à la suivante,
// collage du code entier accepté, retour arrière qui revient à la case précédente.
export function CodeInput({ value, onChange, onComplete, invalid, disabled }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; invalid?: boolean; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '')

  const set = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, 6)
    onChange(clean)
    if (clean.length === 6) onComplete?.(clean)
    refs.current[Math.min(clean.length, 5)]?.focus()
  }

  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      set(value.slice(0, i - 1))
    }
  }

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    set(e.clipboardData.getData('text'))
  }

  return (
    <div className="flex justify-between gap-2" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          id={i === 0 ? 'code-0' : undefined}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Chiffre ${i + 1}`}
          maxLength={1}
          disabled={disabled}
          value={d}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '')
            if (!typed) return set(value.slice(0, i))
            set((value.slice(0, i) + typed).slice(0, 6))
          }}
          onKeyDown={onKey(i)}
          className={`h-14 w-full min-w-0 rounded-[12px] border bg-surface text-center font-mono text-[24px] font-bold outline-none focus:border-green focus:ring-3 focus:ring-green-soft ${
            invalid ? 'border-red' : 'border-line'
          }`}
        />
      ))}
    </div>
  )
}
