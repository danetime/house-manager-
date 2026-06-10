import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHousehold } from '../context/HouseholdContext'

/** First sign-in: create a household or accept a pending invite. */
export function OnboardingPage() {
  const { user, signOut } = useAuth()
  const { createHousehold, acceptInvite, myInvites } = useHousehold()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky to-cream p-4">
      <div className="panel w-full max-w-lg p-8">
        <h1 className="font-pixel mb-2 text-sm text-terracotta">Welcome home</h1>
        <p className="mb-6 text-sm text-soil">
          Signed in as <strong>{user?.email}</strong>
        </p>

        {myInvites.length > 0 && (
          <div className="mb-6">
            <h2 className="field-label">You have been invited</h2>
            {myInvites.map((inv) => (
              <div
                key={inv.id}
                className="mb-2 flex items-center justify-between rounded-md border-2 border-soil bg-cream p-3"
              >
                <span className="text-sm">Join a household as a member</span>
                <button
                  className="pixel-btn green"
                  disabled={busy}
                  onClick={() => void run(() => acceptInvite(inv.id))}
                >
                  Accept
                </button>
              </div>
            ))}
            <div className="my-4 flex items-center gap-3 text-xs text-soil">
              <div className="h-0.5 flex-1 bg-soil/30" />
              or start fresh
              <div className="h-0.5 flex-1 bg-soil/30" />
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void run(() => createHousehold(name.trim()))
          }}
        >
          <label className="field-label" htmlFor="household-name">
            Name your household
          </label>
          <input
            id="household-name"
            className="field mb-3"
            placeholder="e.g. Chez Dane"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="mb-3 text-sm text-terracotta">{error}</p>}
          <button className="pixel-btn w-full" type="submit" disabled={busy || !name.trim()}>
            Create household
          </button>
        </form>

        <button className="mt-4 text-xs text-soil underline" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </div>
  )
}
