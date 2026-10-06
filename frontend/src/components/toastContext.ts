import { createContext, useContext } from 'react'
import type { IconName } from './Icon'

export type ShowToast = (message: string, icon?: IconName) => void

export const ToastContext = createContext<ShowToast>(() => {})

// Affiche un petit message de confirmation en bas de l'écran
export const useToast = () => useContext(ToastContext)
