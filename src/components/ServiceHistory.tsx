import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { ServiceEntry } from '../lib/types'
import { formatDate, formatGBP } from '../lib/format'
import { ConfirmDialog } from './ConfirmDialog'

/** Dated log entries — used for item service history AND pet vet visits. */
export function ServiceHistory({ itemId, title }: { itemId: string; title: string }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ServiceEntry[]>([])
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [cost, setCost] = useState('')
  const [deleting, setDeleting] = useState<ServiceEntry | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('service_entries')
      .select('*')
      .eq('item_id', itemId)
      .order('date', { ascending: false })
    setEntries((data as ServiceEntry[]) ?? [])
  }, [itemId])

  useEffect(() => {
    void load()
  }, [load])

  const add = async () => {
    if (!date || !note.trim()) return
    await supabase.from('service_entries').insert({
      item_id: itemId,
      date,
      note: note.trim(),
      cost: cost ? Number(cost) : null,
      created_by: user?.id,
    })
    setDate('')
    setNote('')
    setCost('')
    await load()
  }

  const remove = async (id: string) => {
    await supabase.from('service_entries').delete().eq('id', id)
    setDeleting(null)
    await load()
  }

  return (
    <section>
      <h3 className="field-label">{title}</h3>
      <div className="mb-2 flex flex-wrap gap-2">
        <input
          type="date"
          className="field"
          style={{ width: '10rem' }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="field flex-1"
          style={{ minWidth: '8rem' }}
          placeholder="e.g. Annual boiler service, Gas Safe engineer"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          className="field"
          style={{ width: '6rem' }}
          placeholder="£"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <button className="pixel-btn green" onClick={() => void add()} disabled={!date || !note.trim()}>
          Add
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-soil/70">No entries yet.</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-2 rounded-md border-2 border-soil/30 bg-cream px-2 py-1.5 text-sm"
            >
              <span className="font-medium whitespace-nowrap">{formatDate(e.date)}</span>
              <span className="flex-1">{e.note}</span>
              {e.cost != null && <span className="whitespace-nowrap">{formatGBP(e.cost)}</span>}
              <button
                className="text-terracotta"
                title="Delete entry"
                onClick={() => setDeleting(e)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this entry?"
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting.id)}
      >
        {deleting && `${formatDate(deleting.date)} — ${deleting.note}`}
      </ConfirmDialog>
    </section>
  )
}
