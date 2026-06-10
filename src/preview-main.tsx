// Temporary visual preview harness — not part of the app.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { HouseCanvas, type Carrying } from './components/HouseCanvas'
import { PixelSprite } from './components/PixelSprite'
import { SPRITES } from './sprites/sprites'
import type { Item, Room } from './lib/types'

const now = new Date().toISOString()
const mkRoom = (id: string, type: string, x: number, y: number, w: number, name?: string): Room => ({
  id,
  household_id: 'h',
  type,
  custom_name: name ?? null,
  grid_x: x,
  grid_y: y,
  width: w,
  height: 1,
  created_at: now,
})
const mkItem = (id: string, room: string | null, type: string, slot: number, kind: Item['kind'] = 'standard'): Item => ({
  id,
  household_id: 'h',
  room_id: room,
  type,
  custom_name: null,
  kind,
  slot,
  purchase_date: null,
  purchase_price: null,
  warranty_expiry: null,
  warranty_provider: null,
  notes: null,
  extra: {},
  created_by: null,
  created_at: now,
  updated_at: now,
})

const rooms: Room[] = [
  mkRoom('r1', 'living_room', 2, 0, 4, 'Snug'),
  mkRoom('r2', 'kitchen', 6, 0, 4),
  mkRoom('r3', 'bedroom', 2, 1, 4, 'Master Bedroom'),
  mkRoom('r4', 'bathroom', 6, 1, 3),
  mkRoom('r5', 'driveway', 10, 0, 3),
  mkRoom('r6', 'garden', 13, 0, 4),
  mkRoom('r7', 'office', 9, 1, 3, "Dan's Spare Room"),
]

const items: Item[] = [
  mkItem('i1', 'r1', 'tv', 1),
  mkItem('i2', 'r1', 'sofa', 4),
  mkItem('i3', 'r1', 'console', 2),
  mkItem('i4', 'r2', 'oven', 0),
  mkItem('i5', 'r2', 'fridge', 2),
  mkItem('i6', 'r2', 'boiler', 6, 'standard'),
  mkItem('i7', 'r2', 'washing_machine', 4),
  mkItem('i8', 'r3', 'bed', 2),
  mkItem('i9', 'r3', 'wardrobe', 5),
  mkItem('i10', 'r4', 'bath', 1),
  mkItem('i11', 'r4', 'toilet', 3),
  mkItem('i12', 'r5', 'car', 1, 'car'),
  mkItem('i13', 'r6', 'bbq', 2),
  mkItem('i14', 'r6', 'lawnmower', 5),
  mkItem('i15', 'r1', 'pet', 6, 'pet'),
  mkItem('i16', 'r7', 'desk', 1),
  mkItem('i17', 'r7', 'monitor', 3),
]

function Preview() {
  const [carrying] = useState<Carrying>(null)
  return (
    <div className="p-6 space-y-8">
      <h1 className="font-pixel text-sm text-terracotta">Canvas preview (view mode)</h1>
      <HouseCanvas
        mode="view"
        rooms={rooms}
        items={items}
        flaggedItems={new Set(['i6', 'i12'])}
        carrying={carrying}
        selectedItemId={null}
        onPlaceRoom={() => {}}
        onMoveRoom={() => {}}
        onDropItem={() => {}}
        onItemClick={() => {}}
        onRoomEdit={() => {}}
        onRoomAddItem={() => {}}
        onPickUpRoom={() => {}}
        onPickUpItem={() => {}}
        onCancelCarry={() => {}}
      />
      <h1 className="font-pixel text-sm text-terracotta">Edit mode</h1>
      <HouseCanvas
        mode="edit"
        rooms={rooms}
        items={items}
        flaggedItems={new Set()}
        carrying={carrying}
        selectedItemId={null}
        onPlaceRoom={() => {}}
        onMoveRoom={() => {}}
        onDropItem={() => {}}
        onItemClick={() => {}}
        onRoomEdit={() => {}}
        onRoomAddItem={() => {}}
        onPickUpRoom={() => {}}
        onPickUpItem={() => {}}
        onCancelCarry={() => {}}
      />
      <h1 className="font-pixel text-sm text-terracotta">Sprite gallery</h1>
      <div className="flex flex-wrap gap-3">
        {Object.keys(SPRITES).map((k) => (
          <div key={k} className="panel flex w-24 flex-col items-center gap-1 p-2">
            <PixelSprite type={k} size={40} />
            <span className="text-[0.6rem]">{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
