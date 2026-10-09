import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import AppLayout from './layouts/AppLayout'
import PublicLayout from './layouts/PublicLayout'
import Ask from './pages/Ask'
import { ForgotPasswordPage, LoginPage, RegisterPage, VerifyEmailPage } from './pages/AuthPages'
import Bounties from './pages/Bounties'
import Feed from './pages/Feed'
import Landing from './pages/Landing'
import Leaderboard from './pages/Leaderboard'
import Messages from './pages/Messages'
import NewSnippet from './pages/NewSnippet'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import QuestionPage from './pages/QuestionPage'
import Rooms from './pages/Rooms'
import Snippets from './pages/Snippets'
import StatusPage from './pages/StatusPage'
import WalletPage from './pages/WalletPage'

export default function App() {
  return (
    <Routes>
      {/* Accueil public, connexion et inscription : barre du haut visible */}
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="verification" element={<RequireAuth><VerifyEmailPage /></RequireAuth>} />
      </Route>

      {/* Application : lecture libre, participation réservée aux membres */}
      <Route path="app" element={<AppLayout />}>
        <Route index element={<Feed />} />
        <Route path="questions/:id" element={<QuestionPage />} />
        <Route path="snippets" element={<Snippets />} />
        <Route path="primes" element={<Bounties />} />
        <Route path="classement" element={<Leaderboard />} />
        <Route path="profil/:id" element={<Profile />} />
        <Route path="salons" element={<Rooms />} />
        <Route path="salons/:slug" element={<Rooms />} />
        <Route path="messages" element={<RequireAuth><Messages /></RequireAuth>} />
        <Route path="messages/:userId" element={<RequireAuth><Messages /></RequireAuth>} />
        <Route path="notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="poser" element={<RequireAuth><Ask /></RequireAuth>} />
        <Route path="snippets/nouveau" element={<RequireAuth><NewSnippet /></RequireAuth>} />
        <Route path="portefeuille" element={<RequireAuth><WalletPage /></RequireAuth>} />
      </Route>

      <Route path="*" element={<StatusPage kind="not_found" />} />
    </Routes>
  )
}
