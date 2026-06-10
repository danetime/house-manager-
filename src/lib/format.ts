/** dd/mm/yyyy, British style. Accepts ISO date strings. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export function formatGBP(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
}

/** Days from today (local midnight) until the given ISO date. Negative = past. */
export function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function relativeDue(iso: string): string {
  const days = daysUntil(iso)
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  if (days === -1) return '1 day overdue'
  if (days < 0) return `${-days} days overdue`
  return `due in ${days} days`
}
