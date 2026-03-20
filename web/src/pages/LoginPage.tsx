import { useState } from 'react'
import type { FormEvent } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useToast } from '../contexts/ToastContext'

interface Props {
  onLogin: (email: string, password: string) => Promise<boolean>
  loading: boolean
  error: string | null
}

export default function LoginPage({ onLogin, loading, error }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const toast = useToast()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const success = await onLogin(email, password)
    if (success) {
      toast.success('Welcome back!', 'You have been signed in successfully.')
    }
  }

  return (
    <div className="auth-page">
      <Header variant="auth" />

      <div className="auth-body">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Sign in to ForgeAPI</h1>
            <p>Enter your credentials to access your workspace</p>
          </div>

          <div className="auth-card-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="auth-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !email || !password}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="auth-hint">
              Demo account: <code>admin@example.com</code> / <code>password123</code>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
