import { useState } from 'react'
import { useHousehold } from '../context/HouseholdContext'
import { ItemDrawer } from '../components/ItemDrawer'
import { PixelSprite } from '../components/PixelSprite'
import { formatDate, relativeDue } from '../lib/format'
import type { Reminder, ReminderStatus } from '../lib/reminders'
import type { Item } from '../lib/types'

const GROUPS: Array<{ status: ReminderStatus; title: string; chip: string; border: string }> = [
  { status: 'overdue', title: 'Overdue', chip: 'bg-terracotta text-white', border: 'border-terracotta' },
  { status: 'soon', title: 'Due within 30 days', chip: 'bg-amber text-white', border: 'border-amber' },
  { status: 'later', title: 'Later', chip: 'bg-soil/20 text-ink', border: 'border-soil/40' },
]

export function DashboardPage() {
  const { reminders, items } = useHousehold()
  const [openItem, setOpenItem] = useState<Item | null>(null)
  const liveOpenItem = openItem ? (items.find((i) => i.id === openItem.id) ?? null) : null

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="font-pixel mb-6 text-sm text-ink">Upcoming reminders</h1>

      {reminders.length === 0 && (
        <div className="panel p-6 text-center">
          <p className="font-pixel mb-2 text-[0.65rem] leading-relaxed text-moss-dark">
            Nothing to chase — lovely.
          </p>
          <p className="text-sm text-soil">
            Add warranty dates, MOT dates or vaccination dates to your items and they will show up
            here automatically.
          </p>
        </div>
      )}

      {GROUPS.map((group) => {
        const rows = reminders.filter((r) => r.status === group.status)
        if (rows.length === 0) return null
        return (
          <section key={group.status} className="mb-6">
            <h2 className="field-label">
              <span className={`mr-2 inline-block rounded-full px-2 py-0.5 ${group.chip}`}>
                {rows.length}
              </span>
              {group.title}
            </h2>
            <ul className="space-y-2">
              {rows.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  border={group.border}
                  onOpen={() => {
                    const item = items.find((i) => i.id === r.itemId)
                    if (item) setOpenItem(item)
                  }}
                />
              ))}
            </ul>
          </section>
        )
      })}

      {liveOpenItem && <ItemDrawer item={liveOpenItem} onClose={() => setOpenItem(null)} />}
    </main>
  )
}

function ReminderRow({
  reminder,
  border,
  onOpen,
}: {
  reminder: Reminder
  border: string
  onOpen: () => void
}) {
  const { items } = useHousehold()
  const item = items.find((i) => i.id === reminder.itemId)
  return (
    <li>
      <button
        className={`panel flex w-full items-center gap-3 border-3 ${border} p-3 text-left hover:brightness-105`}
        onClick={onOpen}
      >
        {item && <PixelSprite type={item.type} size={30} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{reminder.itemName}</p>
          <p className="text-sm text-soil">{reminder.title}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatDate(reminder.dueDate)}</p>
          <p className="text-xs text-soil">{relativeDue(reminder.dueDate)}</p>
        </div>
      </button>
    </li>
  )
}
