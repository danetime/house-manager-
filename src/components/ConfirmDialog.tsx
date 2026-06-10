import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Every destructive action goes through here — nothing is silently deleted. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div className="panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-pixel mb-4 text-[0.7rem] leading-relaxed text-ink">{title}</h2>
        {children && <div className="mb-4 text-sm text-soil">{children}</div>}
        <div className="flex justify-end gap-2">
          <button className="pixel-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`pixel-btn ${danger ? '' : 'green'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
