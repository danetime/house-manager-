import type { Room } from './types'
import { roomTypeDef, MAX_DRIVEWAYS } from './roomTypes'

/** Grid dimensions: x runs left→right, y runs ground (0) → up. */
export const GRID_COLS = 18
export const GRID_ROWS = 5
/** Pixel size of one grid cell on the canvas. */
export const CELL_W = 52
export const CELL_H = 104

export interface Placement {
  type: string
  grid_x: number
  grid_y: number
  width: number
  height: number
}

function overlaps(a: Placement, b: Placement): boolean {
  return (
    a.grid_x < b.grid_x + b.width &&
    b.grid_x < a.grid_x + a.width &&
    a.grid_y < b.grid_y + b.height &&
    b.grid_y < a.grid_y + a.height
  )
}

export function inBounds(r: Placement): boolean {
  return (
    r.grid_x >= 0 &&
    r.grid_y >= 0 &&
    r.grid_x + r.width <= GRID_COLS &&
    r.grid_y + r.height <= GRID_ROWS
  )
}

/**
 * Gravity rule: a room is supported if it sits on the ground row, or every
 * column of its footprint rests directly on top of an indoor room below.
 * Outdoor zones never provide support and must sit on the ground.
 */
function isSupported(r: Placement, others: Placement[]): boolean {
  if (r.grid_y === 0) return true
  if (roomTypeDef(r.type).outdoor) return false
  const indoor = others.filter((o) => !roomTypeDef(o.type).outdoor)
  for (let x = r.grid_x; x < r.grid_x + r.width; x++) {
    const supported = indoor.some(
      (o) => x >= o.grid_x && x < o.grid_x + o.width && o.grid_y + o.height === r.grid_y,
    )
    if (!supported) return false
  }
  return true
}

/** Every room in the set must be reachable from the ground via support. */
export function allSupported(rooms: Placement[]): boolean {
  return rooms.every((r) => isSupported(r, rooms.filter((o) => o !== r)))
}

export interface PlacementCheck {
  ok: boolean
  reason?: string
}

export function canPlaceRoom(
  candidate: Placement,
  existing: Room[],
  ignoreRoomId?: string,
): PlacementCheck {
  const others = existing.filter((r) => r.id !== ignoreRoomId)
  if (!inBounds(candidate)) return { ok: false, reason: 'Out of bounds' }
  if (others.some((o) => overlaps(candidate, o))) return { ok: false, reason: 'Overlaps another room' }
  const def = roomTypeDef(candidate.type)
  if (def.outdoor && candidate.grid_y !== 0)
    return { ok: false, reason: `${def.label} must be at ground level` }
  if (!isSupported(candidate, others))
    return { ok: false, reason: 'Rooms cannot float — place on the ground or on another room' }
  if (
    candidate.type === 'driveway' &&
    others.filter((o) => o.type === 'driveway').length >= MAX_DRIVEWAYS
  )
    return { ok: false, reason: `Maximum ${MAX_DRIVEWAYS} driveway slots` }
  // moving an existing room must not leave the rest floating
  if (ignoreRoomId && !allSupported([candidate, ...others]))
    return { ok: false, reason: 'That would leave another room floating' }
  return { ok: true }
}

/** Removing a room must not leave any other room floating. */
export function canRemoveRoom(roomId: string, rooms: Room[]): PlacementCheck {
  const rest = rooms.filter((r) => r.id !== roomId)
  if (!allSupported(rest))
    return { ok: false, reason: 'Rooms above would be left floating — remove those first' }
  return { ok: true }
}

/**
 * Roof segments: for each column occupied by an indoor room, the roof sits
 * above the tallest indoor room in that column.
 */
export function roofSegments(rooms: Room[]): Array<{ x: number; topY: number }> {
  const tops = new Map<number, number>()
  for (const r of rooms) {
    if (roomTypeDef(r.type).outdoor) continue
    for (let x = r.grid_x; x < r.grid_x + r.width; x++) {
      const top = r.grid_y + r.height
      if ((tops.get(x) ?? 0) < top) tops.set(x, top)
    }
  }
  return [...tops.entries()].map(([x, topY]) => ({ x, topY })).sort((a, b) => a.x - b.x)
}

/** Number of item slots a room offers (two per grid cell of width). */
export const roomSlotCount = (room: Pick<Room, 'width'>) => room.width * 2

/**
 * Prefer even slots (cell centres) so items spread out before doubling up
 * in the half-cell positions between them.
 */
export function nextFreeSlot(room: Pick<Room, 'width'>, taken: number[]): number {
  const cap = roomSlotCount(room)
  const order: number[] = []
  for (let s = 0; s < cap; s += 2) order.push(s)
  for (let s = 1; s < cap; s += 2) order.push(s)
  for (const s of order) if (!taken.includes(s)) return s
  return taken.length % cap
}

/** Resizing keeps the room anchored at its bottom-left corner. */
export function canResizeRoom(
  room: Room,
  width: number,
  height: number,
  rooms: Room[],
): PlacementCheck {
  return canPlaceRoom(
    { type: room.type, grid_x: room.grid_x, grid_y: room.grid_y, width, height },
    rooms,
    room.id,
  )
}
