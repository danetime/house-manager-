import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useHousehold } from '../context/HouseholdContext'
import type { CustomReminder, Item, ItemExtra } from '../lib/types'
import { catalogueEntry, itemDisplayName } from '../lib/catalogue'
import { roomDisplayName } from '../lib/roomTypes'
import { formatDate } from '../lib/format'
import { PixelSprite } from './PixelSprite'
import { ServiceHistory } from './ServiceHistory'
import { Attachments } from './Attachments'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  item: Item
  onClose: () => void
}

interface Draft {
  custom_name: string
  room_id: string
  purchase_date: string
  purchase_price: string
  warranty_expiry: string
  warranty_provider: string
  notes: string
  extra: ItemExtra
}

const toDraft = (item: Item): Draft => ({
  custom_name: item.custom_name ?? '',
  room_id: item.room_id ?? '',
  purchase_date: item.purchase_date ?? '',
  purchase_price: item.purchase_price != null ? String(item.purchase_price) : '',
  warranty_expiry: item.warranty_expiry ?? '',
  warranty_provider: item.warranty_provider ?? '',
  notes: item.notes ?? '',
  extra: { ...item.extra },
})

export function ItemDrawer({ item, onClose }: Props) {
  const { user } = useAuth()
  const { rooms, household, updateItem, moveItem, deleteItem } = useHousehold()
  const [draft, setDraft] = useState<Draft>(() => toDraft(item))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const entry = catalogueEntry(item.type)

  useEffect(() => {
    setDraft(toDraft(item))
    setDirty(false)
  }, [item])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setDirty(true)
  }
  const setExtra = (key: keyof ItemExtra, value: string) => {
    setDraft((d) => ({ ...d, extra: { ...d.extra, [key]: value || undefined } }))
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await updateItem(item.id, {
        custom_name: draft.custom_name.trim() || null,
        purchase_date: draft.purchase_date || null,
        purchase_price: draft.purchase_price ? Number(draft.purchase_price) : null,
        warranty_expiry: draft.warranty_expiry || null,
        warranty_provider: draft.warranty_provider.trim() || null,
        notes: draft.notes.trim() || null,
        extra: draft.extra,
      })
      if ((item.room_id ?? '') !== draft.room_id) {
        await moveItem(item.id, draft.room_id || null)
      }
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  const room = rooms.find((r) => r.id === item.room_id)

  const dateField = (label: string, key: keyof ItemExtra) => (
    <div>
      <label className="field-label">{label}</label>
      <input
        type="date"
        className="field"
        value={draft.extra[key] ?? ''}
        onChange={(e) => setExtra(key, e.target.value)}
      />
    </div>
  )
  const textField = (label: string, key: keyof ItemExtra, placeholder = '') => (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field"
        placeholder={placeholder}
        value={draft.extra[key] ?? ''}
        onChange={(e) => setExtra(key, e.target.value)}
      />
    </div>
  )

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />
      <aside className="panel fixed right-0 top-0 z-40 flex h-full w-full flex-col overflow-y-auto rounded-none border-y-0 border-r-0 p-5 md:w-[30rem]">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-md border-2 border-soil bg-cream p-2">
            <PixelSprite type={item.type} size={44} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-pixel truncate text-[0.7rem] leading-relaxed">
              {itemDisplayName(item)}
            </h2>
            <p className="text-xs text-soil">
              {entry.label}
              {room ? ` · ${roomDisplayName(room)}` : ' · Unassigned'}
            </p>
          </div>
          <button className="pixel-btn secondary" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="field-label">Name</label>
            <input
              className="field"
              placeholder={entry.label}
              value={draft.custom_name}
              onChange={(e) => set('custom_name', e.target.value)}
            />
          </div>

          <div>
            <label className="field-label">Room</label>
            <select
              className="field"
              value={draft.room_id}
              onChange={(e) => set('room_id', e.target.value)}
            >
              <option value="">Unassigned</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {roomDisplayName(r)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Purchase date</label>
              <input
                type="date"
                className="field"
                value={draft.purchase_date}
                onChange={(e) => set('purchase_date', e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Purchase price (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="field"
                value={draft.purchase_price}
                onChange={(e) => set('purchase_price', e.target.value)}
              />
            </div>
          </div>

          {item.kind !== 'pet' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Warranty expiry</label>
                <input
                  type="date"
                  className="field"
                  value={draft.warranty_expiry}
                  onChange={(e) => set('warranty_expiry', e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Warranty provider / ref</label>
                <input
                  className="field"
                  value={draft.warranty_provider}
                  onChange={(e) => set('warranty_provider', e.target.value)}
                />
              </div>
            </div>
          )}

          {item.kind === 'car' && (
            <div className="rounded-md border-2 border-soil/40 bg-cream p-3">
              <h3 className="field-label">Car details</h3>
              <div className="grid grid-cols-2 gap-3">
                {textField('Registration plate', 'registration', 'AB12 CDE')}
                {textField('Make / model', 'make_model', 'e.g. Honda Jazz')}
                {dateField('MOT due', 'mot_due')}
                {dateField('Road tax due', 'tax_due')}
                {dateField('Insurance renewal', 'insurance_due')}
              </div>
            </div>
          )}

          {item.kind === 'pet' && (
            <div className="rounded-md border-2 border-soil/40 bg-cream p-3">
              <h3 className="field-label">Pet details</h3>
              <div className="grid grid-cols-2 gap-3">
                {textField('Species / breed', 'species_breed', 'e.g. Cat — tabby')}
                {dateField('Date of birth', 'date_of_birth')}
                {textField('Microchip number', 'microchip')}
                {dateField('Vaccinations due', 'vaccination_due')}
                {dateField('Pet insurance renewal', 'pet_insurance_due')}
              </div>
            </div>
          )}

          <div>
            <label className="field-label">Notes</label>
            <textarea
              className="field"
              rows={3}
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <button className="pixel-btn green w-full" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>

          <CustomReminders itemId={item.id} />

          <ServiceHistory
            itemId={item.id}
            title={item.kind === 'pet' ? 'Vet visits' : 'Service history'}
          />

          {household && <Attachments itemId={item.id} householdId={household.id} />}

          <p className="text-xs text-soil/70">
            Added {formatDate(item.created_at)}
            {item.created_by === user?.id ? ' by you' : ''} · Updated {formatDate(item.updated_at)}
          </p>

          <button className="pixel-btn w-full" onClick={() => setConfirmDelete(true)}>
            Delete item
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${itemDisplayName(item)}?`}
        confirmLabel="Delete forever"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          void deleteItem(item.id).then(onClose)
        }}
      >
        This deletes the item along with its service history, reminders, receipts and photos.
        This cannot be undone.
      </ConfirmDialog>
    </>
  )
}

/** Manual reminders on an item, e.g. “Descale coffee machine”. */
function CustomReminders({ itemId }: { itemId: string }) {
  const { user } = useAuth()
  const { customReminders, refresh } = useHousehold()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [deleting, setDeleting] = useState<CustomReminder | null>(null)
  const mine = customReminders.filter((c) => c.item_id === itemId)

  const add = async () => {
    if (!title.trim() || !dueDate) return
    await supabase.from('custom_reminders').insert({
      item_id: itemId,
      title: title.trim(),
      due_date: dueDate,
      created_by: user?.id,
    })
    setTitle('')
    setDueDate('')
    await refresh()
  }

  const remove = async (id: string) => {
    await supabase.from('custom_reminders').delete().eq('id', id)
    setDeleting(null)
    await refresh()
  }

  return (
    <section>
      <h3 className="field-label">Custom reminders</h3>
      <div className="mb-2 flex gap-2">
        <input
          className="field flex-1"
          placeholder="e.g. Descale coffee machine"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="field"
          style={{ width: '10rem' }}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button className="pixel-btn green" onClick={() => void add()} disabled={!title.trim() || !dueDate}>
          Add
        </button>
      </div>
      {mine.length > 0 && (
        <ul className="space-y-1">
          {mine.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-md border-2 border-soil/30 bg-cream px-2 py-1.5 text-sm"
            >
              <span className="flex-1">{c.title}</span>
              <span className="whitespace-nowrap">{formatDate(c.due_date)}</span>
              <button className="text-terracotta" title="Delete reminder" onClick={() => setDeleting(c)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this reminder?"
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting.id)}
      >
        {deleting?.title}
      </ConfirmDialog>
    </section>
  )
}
