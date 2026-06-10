import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'

type Mode = 'signin' | 'signup' | 'reset'

export function SignInPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signInWithGoogle = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your inbox to confirm your email, then sign in.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage('Password reset email sent — check your inbox.')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky to-cream p-4">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="font-pixel mb-2 text-base text-terracotta">The House</h1>
          <p className="text-sm text-soil">Your home, organised. Pixel by pixel.</p>
        </div>

        <button
          className="pixel-btn secondary mb-4 w-full"
          onClick={() => void signInWithGoogle()}
        >
          Sign in with Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-soil">
          <div className="h-0.5 flex-1 bg-soil/30" />
          or with email
          <div className="h-0.5 flex-1 bg-soil/30" />
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="field"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== 'reset' && (
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="field"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {error && <p className="text-sm text-terracotta">{error}</p>}
          {message && <p className="text-sm text-moss-dark">{message}</p>}
          <button className="pixel-btn w-full" type="submit" disabled={busy}>
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-xs">
          {mode !== 'signup' ? (
            <button className="text-soil underline" onClick={() => setMode('signup')}>
              Create an account
            </button>
          ) : (
            <button className="text-soil underline" onClick={() => setMode('signin')}>
              Have an account? Sign in
            </button>
          )}
          {mode !== 'reset' ? (
            <button className="text-soil underline" onClick={() => setMode('reset')}>
              Forgotten password?
            </button>
          ) : (
            <button className="text-soil underline" onClick={() => setMode('signin')}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
