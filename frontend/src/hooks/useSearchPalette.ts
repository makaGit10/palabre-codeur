import { createContext, useContext } from 'react'

// Ouvre la recherche globale depuis n'importe quel bouton de l'application (voir SearchProvider)
export const SearchPaletteContext = createContext<() => void>(() => {})
export const useSearchPalette = () => useContext(SearchPaletteContext)
