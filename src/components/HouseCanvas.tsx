import { useMemo, useState, type MouseEvent } from 'react'
import type { Item, Room } from '../lib/types'
import {
  CELL_H,
  CELL_W,
  GRID_COLS,
  GRID_ROWS,
  canPlaceRoom,
  roofSegments,
  roomSlotCount,
  type Placement,
} from '../lib/house'
import { roomTypeDef, roomDisplayName } from '../lib/roomTypes'
import { itemDisplayName } from '../lib/catalogue'
import { PixelSprite } from './PixelSprite'

export type Carrying =
  | { kind: 'new-room'; type: string; width: number; height: number }
  | { kind: 'move-room'; room: Room }
  | { kind: 'move-item'; item: Item }
  | null

interface Props {
  mode: 'view' | 'edit'
  rooms: Room[]
  items: Item[]
  flaggedItems: Set<string>
  carrying: Carrying
  selectedItemId: string | null
  onPlaceRoom: (p: Placement) => void
  onMoveRoom: (id: string, x: number, y: number) => void
  onDropItem: (itemId: string, roomId: string) => void
  onItemClick: (item: Item) => void
  onRoomEdit: (room: Room) => void
  onRoomAddItem: (room: Room) => void
  onPickUpRoom: (room: Room) => void
  onPickUpItem: (item: Item) => void
  onCancelCarry: () => void
}

const GRID_W = GRID_COLS * CELL_W
const GRID_H = GRID_ROWS * CELL_H
const ROOF_H = 80
const GROUND_H = 36

/** Wall-mounted items render near the ceiling instead of on the floor. */
const WALL_MOUNTED = new Set(['smoke_alarm', 'extractor_fan', 'boiler', 'shower'])
const WIDE_SPRITES = new Set(['car', 'sofa', 'bed', 'bath'])

export function HouseCanvas(props: Props) {
  const { mode, rooms, items, flaggedItems, carrying } = props
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)

  const roomRect = (r: Pick<Room, 'grid_x' | 'grid_y' | 'width' | 'height'>) => ({
    left: r.grid_x * CELL_W,
    top: ROOF_H + GRID_H - (r.grid_y + r.height) * CELL_H,
    width: r.width * CELL_W,
    height: r.height * CELL_H,
  })

  const ghost: (Placement & { ok: boolean }) | null = useMemo(() => {
    if (!carrying || carrying.kind === 'move-item' || !hoverCell) return null
    const w = carrying.kind === 'new-room' ? carrying.width : carrying.room.width
    const h = carrying.kind === 'new-room' ? carrying.height : carrying.room.height
    const type = carrying.kind === 'new-room' ? carrying.type : carrying.room.type
    const p: Placement = {
      type,
      grid_x: Math.min(Math.max(hoverCell.x - Math.floor(w / 2), 0), GRID_COLS - w),
      grid_y: Math.min(Math.max(hoverCell.y, 0), GRID_ROWS - h),
      width: w,
      height: h,
    }
    const check = canPlaceRoom(
      p,
      rooms,
      carrying.kind === 'move-room' ? carrying.room.id : undefined,
    )
    return { ...p, ok: check.ok }
  }, [carrying, hoverCell, rooms])

  const hoverRoom: Room | null = useMemo(() => {
    if (!hoverCell) return null
    return (
      rooms.find(
        (r) =>
          hoverCell.x >= r.grid_x &&
          hoverCell.x < r.grid_x + r.width &&
          hoverCell.y >= r.grid_y &&
          hoverCell.y < r.grid_y + r.height,
      ) ?? null
    )
  }, [hoverCell, rooms])

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top - ROOF_H
    const x = Math.floor(px / CELL_W)
    const y = Math.floor((GRID_H - py) / CELL_H)
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) setHoverCell(null)
    else setHoverCell({ x, y })
  }

  const onCanvasClick = () => {
    if (!carrying) return
    if (carrying.kind === 'move-item') {
      if (hoverRoom) props.onDropItem(carrying.item.id, hoverRoom.id)
      return
    }
    if (ghost?.ok) {
      if (carrying.kind === 'new-room') {
        props.onPlaceRoom({ ...ghost })
      } else {
        props.onMoveRoom(carrying.room.id, ghost.grid_x, ghost.grid_y)
      }
    }
  }

  const roof = useMemo(() => buildRoof(rooms), [rooms])
  const flaggedRooms = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) if (it.room_id && flaggedItems.has(it.id)) set.add(it.room_id)
    return set
  }, [items, flaggedItems])

  return (
    <div
      className="relative mx-auto select-none overflow-hidden rounded-xl border-3 border-soil"
      style={{
        width: GRID_W,
        height: ROOF_H + GRID_H + GROUND_H,
        background: 'linear-gradient(to bottom, #8ec8da 0%, #aedce8 55%, #cdeaf2 100%)',
        cursor: carrying ? 'copy' : 'default',
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoverCell(null)}
      onClick={onCanvasClick}
      onContextMenu={(e) => {
        if (carrying) {
          e.preventDefault()
          props.onCancelCarry()
        }
      }}
    >
      {/* sun */}
      <div
        className="pixelated absolute"
        style={{ right: 26, top: 18, width: 28, height: 28, background: '#f7dc8e', boxShadow: '0 0 0 6px rgba(247,220,142,0.35)' }}
      />

      {/* roof */}
      <svg
        className="absolute left-0 top-0"
        width={GRID_W}
        height={ROOF_H + GRID_H}
        shapeRendering="crispEdges"
        style={{ pointerEvents: 'none' }}
      >
        {roof.polys.map((pts, i) => (
          <polygon key={i} points={pts} fill="#9e4036" stroke="#574033" strokeWidth={3} />
        ))}
      </svg>

      {/* chimney + smoke on the tallest roof */}
      {roof.chimney && (
        <div
          className="absolute"
          style={{ left: roof.chimney.x, top: roof.chimney.y, pointerEvents: 'none' }}
        >
          <div style={{ width: 14, height: 26, background: '#6b4a32', border: '2px solid #574033' }} />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`smoke-puff${i ? ` delay-${i}` : ''} absolute`}
              style={{ left: 2, top: -10, width: 8, height: 8, borderRadius: 3, background: 'rgba(240,240,235,0.8)' }}
            />
          ))}
        </div>
      )}

      {/* ground */}
      <div
        className="absolute left-0"
        style={{
          top: ROOF_H + GRID_H,
          width: GRID_W,
          height: GROUND_H,
          background: 'linear-gradient(to bottom, #6e9e5b 0 8px, #6b4a32 8px)',
          borderTop: '3px solid #557a46',
        }}
      />

      {/* rooms */}
      {rooms.map((room) => {
        const def = roomTypeDef(room.type)
        const rect = roomRect(room)
        const roomItems = items.filter((i) => i.room_id === room.id)
        const glow = flaggedRooms.has(room.id)
        return (
          <div
            key={room.id}
            className={`absolute ${glow ? 'room-glow' : ''}`}
            style={{
              ...rect,
              background: def.outdoor
                ? room.type === 'garden'
                  ? 'linear-gradient(to bottom, transparent 55%, #a3cc86 55%, #7aa85e 100%)'
                  : room.type === 'driveway'
                    ? 'linear-gradient(to bottom, transparent 70%, #a8a49c 70%)'
                    : def.wall
                : def.wall,
              border: def.outdoor && room.type !== 'shed' ? 'none' : '3px solid #574033',
              borderRadius: def.outdoor ? 0 : 4,
              boxShadow: def.outdoor ? 'none' : 'inset 0 -8px 0 ' + def.floor,
            }}
          >
            {/* room label */}
            <span
              className={`font-pixel absolute left-1.5 top-1.5 truncate rounded-sm px-1 py-0.5 text-[0.5rem] ${
                mode === 'edit' ? 'max-w-[55%]' : 'max-w-full'
              }`}
              style={{ background: 'rgba(87,64,51,0.75)', color: '#fff7ea', zIndex: 3 }}
            >
              {roomDisplayName(room)}
            </span>

            {/* edit-mode room toolbar */}
            {mode === 'edit' && !carrying && (
              <div className="absolute right-1 top-1 z-10 flex gap-1">
                <button
                  title="Add item"
                  className="rounded-sm border-2 border-soil bg-moss px-1 text-[0.65rem] leading-4 text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onRoomAddItem(room)
                  }}
                >
                  +
                </button>
                <button
                  title="Move room"
                  className="rounded-sm border-2 border-soil bg-parchment px-1 text-[0.65rem] leading-4"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onPickUpRoom(room)
                  }}
                >
                  ✥
                </button>
                <button
                  title="Rename or remove room"
                  className="rounded-sm border-2 border-soil bg-parchment px-1 text-[0.65rem] leading-4"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onRoomEdit(room)
                  }}
                >
                  ✎
                </button>
              </div>
            )}

            {/* drop highlight when carrying an item */}
            {carrying?.kind === 'move-item' && hoverRoom?.id === room.id && (
              <div className="absolute inset-0 z-10 border-4 border-dashed border-amber bg-amber/20" />
            )}

            {/* items */}
            {roomItems.map((item) => {
              const slots = roomSlotCount(room)
              const slotW = rect.width / slots
              const wallMounted = WALL_MOUNTED.has(item.type)
              const size = WIDE_SPRITES.has(item.type) ? 34 : wallMounted ? 24 : 38
              const flagged = flaggedItems.has(item.id)
              const beingCarried =
                carrying?.kind === 'move-item' && carrying.item.id === item.id
              return (
                <button
                  key={item.id}
                  title={itemDisplayName(item)}
                  className={`absolute flex flex-col items-center transition-transform hover:scale-110 ${
                    beingCarried ? 'opacity-30' : ''
                  } ${props.selectedItemId === item.id ? 'scale-110' : ''}`}
                  style={{
                    left: (item.slot % slots) * slotW + slotW / 2,
                    transform: 'translateX(-50%)',
                    ...(wallMounted ? { top: 6 } : { bottom: 10 }),
                    zIndex: 5,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (mode === 'edit' && !carrying) props.onPickUpItem(item)
                    else if (mode === 'view') props.onItemClick(item)
                  }}
                >
                  {flagged && (
                    <span
                      className="badge-bob font-pixel absolute -top-3 -right-2 z-10 rounded-full border-2 border-soil bg-amber px-1 text-[0.55rem] text-white"
                      title="Something is overdue or due soon"
                    >
                      !
                    </span>
                  )}
                  <PixelSprite type={item.type} size={size} title={itemDisplayName(item)} />
                </button>
              )
            })}
          </div>
        )
      })}

      {/* placement ghost */}
      {ghost && (
        <div
          className="pointer-events-none absolute z-20 rounded-sm border-4"
          style={{
            ...roomRect(ghost),
            borderColor: ghost.ok ? '#557a46' : '#c4564a',
            borderStyle: 'dashed',
            background: ghost.ok ? 'rgba(110,158,91,0.25)' : 'rgba(196,86,74,0.25)',
          }}
        />
      )}

      {/* faint grid in edit mode */}
      {mode === 'edit' && (
        <svg
          className="pointer-events-none absolute left-0"
          style={{ top: ROOF_H, opacity: 0.18 }}
          width={GRID_W}
          height={GRID_H}
        >
          {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
            <line key={`v${i}`} x1={i * CELL_W} y1={0} x2={i * CELL_W} y2={GRID_H} stroke="#574033" />
          ))}
          {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * CELL_H} x2={GRID_W} y2={i * CELL_H} stroke="#574033" />
          ))}
        </svg>
      )}
    </div>
  )
}

/** Pitched roof polygons over contiguous runs of equal indoor-room height. */
function buildRoof(rooms: Room[]): { polys: string[]; chimney: { x: number; y: number } | null } {
  const segs = roofSegments(rooms)
  if (segs.length === 0) return { polys: [], chimney: null }

  // group contiguous columns with the same top row
  const runs: Array<{ x0: number; x1: number; topY: number }> = []
  for (const s of segs) {
    const last = runs[runs.length - 1]
    if (last && last.x1 === s.x && last.topY === s.topY) last.x1 = s.x + 1
    else runs.push({ x0: s.x, x1: s.x + 1, topY: s.topY })
  }

  const polys: string[] = []
  let best: { x: number; y: number } | null = null
  for (const run of runs) {
    const left = run.x0 * CELL_W
    const right = run.x1 * CELL_W
    const baseY = ROOF_H + GRID_H - run.topY * CELL_H
    const peakY = baseY - Math.min(ROOF_H - 6, 26 + (right - left) / 6)
    const midX = (left + right) / 2
    const overhang = 8
    polys.push(
      `${left - overhang},${baseY} ${midX},${peakY} ${right + overhang},${baseY}`,
    )
    if (!best || peakY < best.y + 26) {
      best = { x: midX + (right - left) / 5, y: peakY + (baseY - peakY) / 2 - 13 }
    }
  }
  return { polys, chimney: best }
}
