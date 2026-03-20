import { useEffect } from 'react'
import { useAuth } from './auth/useAuth'
import { ToastProvider } from './contexts/ToastContext'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import './App.css'

function AppContent() {
  const { user, loading, error, signIn, signOut, loadProfile } = useAuth()

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      loadProfile()
    }
  }, [loadProfile])

  if (loading && !user) {
    return (
      <div className="splash">
        <div className="spinner" aria-label="Loading" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={signIn} loading={loading} error={error} />
  }

  return (
    <ProfilePage
      user={user}
      token={localStorage.getItem('access_token') ?? ''}
      onSignOut={signOut}
    />
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
