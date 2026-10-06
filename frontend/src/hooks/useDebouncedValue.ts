import { useEffect, useState } from 'react'

// Valeur qui ne change qu'une fois la frappe calmée (pour interroger l'API sans la saturer)
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
