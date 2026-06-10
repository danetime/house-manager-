import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHousehold } from '../context/HouseholdContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatDate } from '../lib/format'
import type { Invite } from '../lib/types'

export function SettingsPage() {
  const { user } = useAuth()
  const hh = useHousehold()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<Invite | null>(null)

  const me = hh.members.find((m) => m.user_id === user?.id)

  const invite = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await hh.inviteMember(email)
      setMessage(
        `Invite created for ${email.trim().toLowerCase()}. When they sign in with that email, they can accept it.`,
      )
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite')
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-pixel mb-6 text-sm text-ink">{hh.household?.name}</h1>

      <section className="panel mb-4 p-5">
        <h2 className="field-label">Members</h2>
        <ul className="space-y-2">
          {hh.members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2 text-sm">
              <span className="font-pixel rounded-md border-2 border-soil bg-cream px-2 py-1 text-[0.5rem] uppercase">
                {m.role}
              </span>
              <span>
                {m.user_id === user?.id ? `You (${user?.email ?? ''})` : (m.display_name ?? 'Household member')}
              </span>
              <span className="ml-auto text-xs text-soil">joined {formatDate(m.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel mb-4 p-5">
        <h2 className="field-label">Invite a member</h2>
        <p className="mb-3 text-sm text-soil">
          Invite your partner or housemate by email. They get full access to everything in the
          household.
        </p>
        <form onSubmit={(e) => void invite(e)} className="flex gap-2">
          <input
            className="field flex-1"
            type="email"
            required
            placeholder="them@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="pixel-btn green" type="submit">
            Invite
          </button>
        </form>
        {message && <p className="mt-2 text-sm text-moss-dark">{message}</p>}
        {error && <p className="mt-2 text-sm text-terracotta">{error}</p>}

        {hh.pendingInvites.length > 0 && (
          <ul className="mt-4 space-y-2">
            {hh.pendingInvites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{inv.email}</span>
                <span className="text-xs text-soil">invited {formatDate(inv.created_at)}</span>
                <button className="pixel-btn secondary" onClick={() => setRevoking(inv)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel p-5 text-sm text-soil">
        <h2 className="field-label">About</h2>
        <p>
          You are signed in as <strong>{user?.email}</strong>
          {me ? ` (${me.role})` : ''}. Email reminder digests are coming in a later version — for
          now, keep an eye on the dashboard.
        </p>
      </section>

      <ConfirmDialog
        open={revoking !== null}
        title={`Revoke invite for ${revoking?.email}?`}
        confirmLabel="Revoke"
        onCancel={() => setRevoking(null)}
        onConfirm={() => {
          if (revoking) void hh.revokeInvite(revoking.id)
          setRevoking(null)
        }}
      />
    </main>
  )
}
