import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHousehold } from '../context/HouseholdContext'

export function Header() {
  const { signOut } = useAuth()
  const { household, reminders } = useHousehold()
  const location = useLocation()
  const dueCount = reminders.filter((r) => r.status !== 'later').length

  const tab = (to: string, label: string) => (
    <Link
      to={to}
      className={`font-pixel text-[0.55rem] px-3 py-2 rounded-md border-2 ${
        location.pathname === to
          ? 'bg-terracotta text-[#fff7ea] border-soil'
          : 'border-transparent text-soil hover:border-soil'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-40 border-b-3 border-soil bg-parchment px-4 py-3 shadow-[0_3px_0_rgba(87,64,51,0.25)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <Link to="/" className="font-pixel text-xs text-terracotta">
          🏠 {household?.name ?? 'The House'}
        </Link>
        <nav className="flex items-center gap-1">
          {tab('/', 'House')}
          <span className="relative">
            {tab('/dashboard', 'Dashboard')}
            {dueCount > 0 && (
              <span
                className="font-pixel absolute -top-1 -right-1 rounded-full border-2 border-soil bg-amber px-1.5 py-0.5 text-[0.5rem] text-white"
                title={`${dueCount} reminder${dueCount === 1 ? '' : 's'} overdue or due soon`}
              >
                {dueCount}
              </span>
            )}
          </span>
          {tab('/settings', 'Household')}
        </nav>
        <div className="ml-auto">
          <button className="pixel-btn secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
