import { useEffect, useMemo, useState } from 'react'
import { useHousehold } from '../context/HouseholdContext'
import { HouseCanvas, type Carrying } from '../components/HouseCanvas'
import { ItemDrawer } from '../components/ItemDrawer'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PixelSprite } from '../components/PixelSprite'
import { ROOM_TYPES, roomDisplayName, roomTypeDef, MAX_DRIVEWAYS } from '../lib/roomTypes'
import { entriesForRoom, itemDisplayName } from '../lib/catalogue'
import type { Item, Room } from '../lib/types'
import type { Placement } from '../lib/house'

export function HousePage() {
  const hh = useHousehold()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [carrying, setCarrying] = useState<Carrying>(null)
  const [openItem, setOpenItem] = useState<Item | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [catalogueRoom, setCatalogueRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)

  // keep the open drawer in sync with refreshed data
  const liveOpenItem = useMemo(
    () => (openItem ? (hh.items.find((i) => i.id === openItem.id) ?? null) : null),
    [openItem, hh.items],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCarrying(null)
        setCatalogueRoom(null)
        setEditingRoom(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const act = (fn: () => Promise<void>) => {
    setError(null)
    fn().catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong'))
  }

  const unassigned = hh.items.filter((i) => i.room_id === null)
  const drivewayCount = hh.rooms.filter((r) => r.type === 'driveway').length

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-pixel text-sm text-ink">Your house</h1>
        <div className="ml-auto flex gap-2">
          <button
            className={`pixel-btn ${mode === 'view' ? 'green' : 'secondary'}`}
            onClick={() => {
              setMode('view')
              setCarrying(null)
            }}
          >
            View
          </button>
          <button
            className={`pixel-btn ${mode === 'edit' ? 'green' : 'secondary'}`}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-md border-2 border-terracotta bg-terracotta/10 px-3 py-2 text-sm text-terracotta-dark">
          {error}
        </p>
      )}

      {/* room palette */}
      {mode === 'edit' && (
        <div className="panel mb-4 p-3">
          <p className="field-label">
            {carrying
              ? carrying.kind === 'move-item'
                ? `Placing “${itemDisplayName(carrying.item)}” — click a room (right-click to cancel)`
                : 'Click a green spot to place — right-click or Esc to cancel'
              : 'Pick a room, then click the canvas to place it'}
          </p>
          <div className="flex flex-wrap gap-2">
            {ROOM_TYPES.map((rt) => {
              const atMax = rt.key === 'driveway' && drivewayCount >= MAX_DRIVEWAYS
              return (
                <button
                  key={rt.key}
                  disabled={atMax}
                  className={`rounded-md border-2 border-soil px-2 py-1 text-xs font-medium shadow-[2px_2px_0_rgba(87,64,51,0.3)] disabled:opacity-40 ${
                    carrying?.kind === 'new-room' && carrying.type === rt.key
                      ? 'ring-2 ring-amber'
                      : ''
                  }`}
                  style={{ background: rt.wall }}
                  title={atMax ? `Maximum ${MAX_DRIVEWAYS} driveway slots` : `Add ${rt.label}`}
                  onClick={() =>
                    setCarrying({
                      kind: 'new-room',
                      type: rt.key,
                      width: rt.defaultWidth,
                      height: rt.defaultHeight,
                    })
                  }
                >
                  {rt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <HouseCanvas
          mode={mode}
          rooms={hh.rooms}
          items={hh.items}
          flaggedItems={hh.flaggedItems}
          carrying={carrying}
          selectedItemId={liveOpenItem?.id ?? null}
          onPlaceRoom={(p: Placement) => {
            setCarrying(null)
            act(() => hh.addRoom(p))
          }}
          onMoveRoom={(id, x, y) => {
            setCarrying(null)
            act(() => hh.moveRoom(id, x, y))
          }}
          onDropItem={(itemId, roomId) => {
            setCarrying(null)
            act(() => hh.moveItem(itemId, roomId))
          }}
          onItemClick={(item) => setOpenItem(item)}
          onRoomEdit={(room) => setEditingRoom(room)}
          onRoomAddItem={(room) => setCatalogueRoom(room)}
          onPickUpRoom={(room) => setCarrying({ kind: 'move-room', room })}
          onPickUpItem={(item) => setCarrying({ kind: 'move-item', item })}
          onCancelCarry={() => setCarrying(null)}
        />
      </div>

      {hh.rooms.length === 0 && (
        <div className="panel mx-auto mt-4 max-w-md p-5 text-center">
          <p className="font-pixel mb-2 text-[0.65rem] leading-relaxed text-terracotta">
            Add your first room!
          </p>
          <p className="text-sm text-soil">
            {mode === 'edit'
              ? 'Pick a room type above, then click the canvas to place it on the ground.'
              : 'Switch to Edit mode to start building your house.'}
          </p>
          {mode === 'view' && (
            <button className="pixel-btn mt-3" onClick={() => setMode('edit')}>
              Start building
            </button>
          )}
        </div>
      )}

      {/* unassigned holding area */}
      {unassigned.length > 0 && (
        <div className="panel mt-4 p-3">
          <p className="field-label">Unassigned items — give them a home</p>
          <div className="flex flex-wrap gap-3">
            {unassigned.map((item) => (
              <button
                key={item.id}
                className="flex flex-col items-center gap-1 rounded-md border-2 border-soil bg-cream p-2 hover:bg-parchment"
                title={itemDisplayName(item)}
                onClick={() => {
                  if (mode === 'edit') setCarrying({ kind: 'move-item', item })
                  else setOpenItem(item)
                }}
              >
                <PixelSprite type={item.type} size={32} />
                <span className="max-w-24 truncate text-xs">{itemDisplayName(item)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {liveOpenItem && mode === 'view' && (
        <ItemDrawer item={liveOpenItem} onClose={() => setOpenItem(null)} />
      )}

      {editingRoom && (
        <RoomEditDialog
          room={hh.rooms.find((r) => r.id === editingRoom.id) ?? editingRoom}
          onClose={() => setEditingRoom(null)}
        />
      )}

      {catalogueRoom && (
        <ItemCatalogueDialog
          room={catalogueRoom}
          onClose={() => setCatalogueRoom(null)}
          onAdded={(item) => {
            setCatalogueRoom(null)
            setOpenItem(item)
            setMode('view')
          }}
        />
      )}
    </main>
  )
}

function RoomEditDialog({ room, onClose }: { room: Room; onClose: () => void }) {
  const hh = useHousehold()
  const [name, setName] = useState(room.custom_name ?? '')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contents = hh.items.filter((i) => i.room_id === room.id)

  const remove = async () => {
    setConfirmRemove(false)
    try {
      await hh.removeRoom(room.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove room')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-pixel mb-4 text-[0.7rem]">{roomDisplayName(room)}</h2>
        <label className="field-label" htmlFor="room-name">Room name</label>
        <input
          id="room-name"
          className="field mb-3"
          placeholder={roomTypeDef(room.type).label}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="mb-3 text-sm text-terracotta">{error}</p>}
        <div className="flex justify-between gap-2">
          <button className="pixel-btn" onClick={() => setConfirmRemove(true)}>
            Remove room
          </button>
          <div className="flex gap-2">
            <button className="pixel-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="pixel-btn green"
              onClick={() => {
                void hh.renameRoom(room.id, name).then(onClose)
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title={`Remove ${roomDisplayName(room)}?`}
        confirmLabel="Remove room"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => void remove()}
      >
        {contents.length > 0
          ? `This room contains ${contents.length} item${contents.length === 1 ? '' : 's'}. They will move to the Unassigned area — nothing is deleted.`
          : 'This room is empty.'}
      </ConfirmDialog>
    </div>
  )
}

function ItemCatalogueDialog({
  room,
  onClose,
  onAdded,
}: {
  room: Room
  onClose: () => void
  onAdded: (item: Item) => void
}) {
  const hh = useHousehold()
  const entries = entriesForRoom(room.type)
  const [busy, setBusy] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="panel max-h-[80vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-pixel text-[0.7rem]">Add to {roomDisplayName(room)}</h2>
          <button className="pixel-btn secondary" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {entries.map((entry) => (
            <button
              key={entry.key}
              disabled={busy}
              className="flex flex-col items-center gap-1.5 rounded-md border-2 border-soil bg-cream p-3 hover:bg-parchment disabled:opacity-50"
              onClick={() => {
                setBusy(true)
                hh.addItem(room.id, entry.key)
                  .then((item) => item && onAdded(item))
                  .finally(() => setBusy(false))
              }}
            >
              <PixelSprite type={entry.key} size={34} />
              <span className="text-center text-xs leading-tight">{entry.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
