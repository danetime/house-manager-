import type { CustomReminder, Item } from './types'
import { daysUntil } from './format'
import { itemDisplayName } from './catalogue'

export type ReminderStatus = 'overdue' | 'soon' | 'later'
export const SOON_DAYS = 30

export interface Reminder {
  id: string
  itemId: string
  itemName: string
  title: string
  dueDate: string
  status: ReminderStatus
  source:
    | 'warranty'
    | 'mot'
    | 'tax'
    | 'insurance'
    | 'vaccination'
    | 'pet_insurance'
    | 'custom'
}

export function statusFor(dueDate: string): ReminderStatus {
  const days = daysUntil(dueDate)
  if (days < 0) return 'overdue'
  if (days <= SOON_DAYS) return 'soon'
  return 'later'
}

/** Derive every reminder from item data — no manual setup needed. */
export function deriveReminders(items: Item[], custom: CustomReminder[]): Reminder[] {
  const out: Reminder[] = []
  const push = (item: Item, source: Reminder['source'], title: string, dueDate: string | null | undefined) => {
    if (!dueDate) return
    out.push({
      id: `${item.id}:${source}:${dueDate}`,
      itemId: item.id,
      itemName: itemDisplayName(item),
      title,
      dueDate,
      status: statusFor(dueDate),
      source,
    })
  }

  for (const item of items) {
    if (item.kind !== 'pet') push(item, 'warranty', 'Warranty expires', item.warranty_expiry)
    if (item.kind === 'car') {
      push(item, 'mot', 'MOT due', item.extra.mot_due)
      push(item, 'tax', 'Road tax due', item.extra.tax_due)
      push(item, 'insurance', 'Insurance renewal', item.extra.insurance_due)
    }
    if (item.kind === 'pet') {
      push(item, 'vaccination', 'Vaccinations due', item.extra.vaccination_due)
      push(item, 'pet_insurance', 'Pet insurance renewal', item.extra.pet_insurance_due)
    }
  }

  const byId = new Map(items.map((i) => [i.id, i]))
  for (const c of custom) {
    const item = byId.get(c.item_id)
    if (!item) continue
    out.push({
      id: `custom:${c.id}`,
      itemId: item.id,
      itemName: itemDisplayName(item),
      title: c.title,
      dueDate: c.due_date,
      status: statusFor(c.due_date),
      source: 'custom',
    })
  }

  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/** Items needing a warning badge on the house canvas. */
export function flaggedItemIds(reminders: Reminder[]): Set<string> {
  return new Set(reminders.filter((r) => r.status !== 'later').map((r) => r.itemId))
}

// ------------------------------------------------------------------
// Notification channels (Phase 2 hook): reminders are delivered through
// pluggable channels. In-app is the only live channel in the MVP; email
// (Supabase Edge Function + cron) and push (PWA) plug in here later.
// ------------------------------------------------------------------

export interface ReminderChannel {
  key: 'in_app' | 'email' | 'push'
  deliver(reminders: Reminder[]): Promise<void>
}

export const inAppChannel: ReminderChannel = {
  key: 'in_app',
  // In-app delivery is rendering: the dashboard and badges read derived
  // reminders directly, so this is a no-op.
  deliver: async () => {},
}

export const emailChannel: ReminderChannel = {
  key: 'email',
  deliver: async () => {
    // Phase 2: implemented server-side as a scheduled Supabase Edge Function
    // (see supabase/functions/reminders-digest). Intentionally a stub here.
  },
}

export const channels: ReminderChannel[] = [inAppChannel, emailChannel]
