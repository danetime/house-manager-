import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { supabase, ATTACHMENTS_BUCKET } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Attachment } from '../lib/types'
import { ACCEPT_ATTR, prepareUpload } from '../lib/images'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  itemId: string
  householdId: string
}

/** Receipts & photos: thumbnail gallery backed by Supabase Storage. */
export function Attachments({ itemId, householdId }: Props) {
  const { user } = useAuth()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Attachment | null>(null)
  const [viewing, setViewing] = useState<Attachment | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('attachments')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
    const atts = (data as Attachment[]) ?? []
    setAttachments(atts)
    const entries = await Promise.all(
      atts.map(async (a) => {
        const { data: signed } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .createSignedUrl(a.storage_path, 60 * 60)
        return [a.id, signed?.signedUrl ?? ''] as const
      }),
    )
    setUrls(Object.fromEntries(entries))
  }, [itemId])

  useEffect(() => {
    void load()
  }, [load])

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      for (const raw of Array.from(files)) {
        const file = await prepareUpload(raw)
        const safeName = file.name.replace(/[^\w.\-]+/g, '_')
        const path = `${householdId}/${itemId}/${Date.now()}-${safeName}`
        const { error: upErr } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .upload(path, file, { contentType: file.type })
        if (upErr) throw upErr
        const type = file.type === 'application/pdf' ? 'pdf' : 'photo'
        const { error: insErr } = await supabase.from('attachments').insert({
          item_id: itemId,
          storage_path: path,
          type,
          file_name: raw.name,
          uploaded_by: user?.id,
        })
        if (insErr) throw insErr
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const remove = async (a: Attachment) => {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([a.storage_path])
    await supabase.from('attachments').delete().eq('id', a.id)
    setDeleting(null)
    await load()
  }

  return (
    <section>
      <h3 className="field-label">Receipts & photos</h3>
      <label className={`pixel-btn secondary inline-block ${busy ? 'opacity-50' : ''}`}>
        {busy ? 'Uploading…' : 'Upload file'}
        <input type="file" hidden multiple accept={ACCEPT_ATTR} onChange={(e) => void upload(e)} disabled={busy} />
      </label>
      <span className="ml-2 text-xs text-soil/70">jpg, png, heic or pdf — up to 10MB</span>
      {error && <p className="mt-1 text-sm text-terracotta">{error}</p>}

      {attachments.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {attachments.map((a) => (
            <div key={a.id} className="relative">
              <button
                className="block h-20 w-full overflow-hidden rounded-md border-2 border-soil bg-cream"
                title={a.file_name ?? 'attachment'}
                onClick={() => setViewing(a)}
              >
                {a.type === 'pdf' ? (
                  <span className="font-pixel flex h-full items-center justify-center text-[0.55rem] text-soil">
                    PDF
                  </span>
                ) : (
                  urls[a.id] && (
                    <img src={urls[a.id]} alt={a.file_name ?? ''} className="h-full w-full object-cover" />
                  )
                )}
              </button>
              <button
                className="absolute -top-1.5 -right-1.5 rounded-full border-2 border-soil bg-terracotta px-1 text-[0.6rem] leading-4 text-white"
                title="Delete attachment"
                onClick={() => setDeleting(a)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* full-size viewer */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setViewing(null)}
        >
          {viewing.type === 'pdf' ? (
            <a
              className="pixel-btn"
              href={urls[viewing.id]}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Open PDF: {viewing.file_name}
            </a>
          ) : (
            <img
              src={urls[viewing.id]}
              alt={viewing.file_name ?? ''}
              className="max-h-full max-w-full rounded-lg border-4 border-parchment"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this file?"
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
      >
        {deleting?.file_name ?? 'This file'} will be permanently removed.
      </ConfirmDialog>
    </section>
  )
}
