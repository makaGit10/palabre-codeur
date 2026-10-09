import { Component, type ReactNode } from 'react'
import StatusPage from '../pages/StatusPage'

// Une erreur inattendue dans un écran affiche une page soignée au lieu d'une page blanche
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    if (this.state.failed) return <StatusPage kind="error" onRetry={() => window.location.reload()} />
    return this.props.children
  }
}
