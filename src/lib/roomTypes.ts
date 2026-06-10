export interface RoomTypeDef {
  key: string
  label: string
  /** default size in grid cells (width) and floors (height) */
  defaultWidth: number
  defaultHeight: number
  /** outdoor zones sit at ground level beside the house and get no roof */
  outdoor: boolean
  /** wall / interior colours for the cutaway */
  wall: string
  floor: string
  accent: string
}

export const ROOM_TYPES: RoomTypeDef[] = [
  { key: 'living_room', label: 'Living Room', defaultWidth: 4, defaultHeight: 1, outdoor: false, wall: '#f3e3c3', floor: '#a9714b', accent: '#d9b98c' },
  { key: 'kitchen', label: 'Kitchen', defaultWidth: 4, defaultHeight: 1, outdoor: false, wall: '#e8e6d4', floor: '#b3b09a', accent: '#cfcdb8' },
  { key: 'bedroom', label: 'Bedroom', defaultWidth: 4, defaultHeight: 1, outdoor: false, wall: '#e9d6e0', floor: '#a9714b', accent: '#d4b4c6' },
  { key: 'bathroom', label: 'Bathroom', defaultWidth: 3, defaultHeight: 1, outdoor: false, wall: '#d3e7e3', floor: '#9fbcb6', accent: '#b9d8d2' },
  { key: 'hallway', label: 'Hallway / Stairs', defaultWidth: 2, defaultHeight: 1, outdoor: false, wall: '#efe2cc', floor: '#a9714b', accent: '#dcc9a8' },
  { key: 'utility', label: 'Utility Room', defaultWidth: 3, defaultHeight: 1, outdoor: false, wall: '#e2e2da', floor: '#9c9c90', accent: '#c9c9bf' },
  { key: 'office', label: 'Office', defaultWidth: 3, defaultHeight: 1, outdoor: false, wall: '#dde7d4', floor: '#a9714b', accent: '#c2d2b3' },
  { key: 'loft', label: 'Loft', defaultWidth: 4, defaultHeight: 1, outdoor: false, wall: '#e7dcc5', floor: '#8a6a4a', accent: '#cdbd9d' },
  { key: 'garage', label: 'Garage', defaultWidth: 3, defaultHeight: 1, outdoor: false, wall: '#d8d4cc', floor: '#8e8a82', accent: '#bdb8ae' },
  { key: 'garden', label: 'Garden', defaultWidth: 4, defaultHeight: 1, outdoor: true, wall: '#bfe0a8', floor: '#7aa85e', accent: '#a3cc86' },
  { key: 'shed', label: 'Shed', defaultWidth: 2, defaultHeight: 1, outdoor: true, wall: '#c8a276', floor: '#8a6a4a', accent: '#a9825a' },
  { key: 'driveway', label: 'Driveway', defaultWidth: 3, defaultHeight: 1, outdoor: true, wall: '#d6d2ca', floor: '#a8a49c', accent: '#bcb8b0' },
]

export const roomTypeDef = (key: string): RoomTypeDef =>
  ROOM_TYPES.find((r) => r.key === key) ?? ROOM_TYPES[0]

export function roomDisplayName(room: { type: string; custom_name: string | null }): string {
  return room.custom_name || roomTypeDef(room.type).label
}

/** Max number of driveway zones (PRD: max 2 driveway slots). */
export const MAX_DRIVEWAYS = 2
