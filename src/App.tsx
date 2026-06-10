import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { HouseholdProvider, useHousehold } from './context/HouseholdContext'
import { supabaseConfigured } from './lib/supabase'
import { SignInPage } from './pages/SignInPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { HousePage } from './pages/HousePage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { Header } from './components/Header'

function Gate() {
  const { user, loading } = useAuth()
  const hh = useHousehold()

  if (loading || (user && hh.loading && !hh.household)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-pixel text-xs text-soil">Loading…</p>
      </div>
    )
  }

  if (!user) return <SignInPage />
  if (!hh.household) return <OnboardingPage />

  return (
    <div className="min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<HousePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function NotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="panel max-w-lg p-8">
        <h1 className="font-pixel mb-4 text-sm text-terracotta">The House</h1>
        <p className="mb-3">
          Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code> and fill
          in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from your
          Supabase project, then restart the dev server.
        </p>
        <p className="text-sm text-soil">
          Apply <code>supabase/migrations/0001_init.sql</code> to your project first — see the
          README for full setup.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigured) return <NotConfigured />
  return (
    <BrowserRouter>
      <AuthProvider>
        <HouseholdProvider>
          <Gate />
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
