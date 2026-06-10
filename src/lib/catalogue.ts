import type { ItemKind } from './types'

export interface CatalogueEntry {
  key: string
  label: string
  kind: ItemKind
  /** room type keys this item belongs in; empty = anywhere */
  rooms: string[]
}

const LIVING = ['living_room', 'bedroom', 'loft', 'hallway', 'office']
const KITCHEN = ['kitchen', 'utility', 'garage']
const OUTDOOR = ['garden', 'shed', 'garage']

export const CATALOGUE: CatalogueEntry[] = [
  // Living / Bedroom
  { key: 'tv', label: 'TV', kind: 'standard', rooms: LIVING },
  { key: 'sofa', label: 'Sofa', kind: 'standard', rooms: LIVING },
  { key: 'bed', label: 'Bed', kind: 'standard', rooms: ['bedroom', 'loft'] },
  { key: 'wardrobe', label: 'Wardrobe', kind: 'standard', rooms: ['bedroom', 'loft', 'hallway'] },
  { key: 'lamp', label: 'Lamp', kind: 'standard', rooms: [] },
  { key: 'console', label: 'Games Console', kind: 'standard', rooms: LIVING },
  { key: 'bookshelf', label: 'Bookshelf', kind: 'standard', rooms: LIVING },
  // Kitchen / Utility
  { key: 'oven', label: 'Oven', kind: 'standard', rooms: KITCHEN },
  { key: 'hob', label: 'Hob', kind: 'standard', rooms: KITCHEN },
  { key: 'fridge', label: 'Fridge / Freezer', kind: 'standard', rooms: KITCHEN },
  { key: 'dishwasher', label: 'Dishwasher', kind: 'standard', rooms: KITCHEN },
  { key: 'washing_machine', label: 'Washing Machine', kind: 'standard', rooms: KITCHEN },
  { key: 'tumble_dryer', label: 'Tumble Dryer', kind: 'standard', rooms: KITCHEN },
  { key: 'microwave', label: 'Microwave', kind: 'standard', rooms: KITCHEN },
  { key: 'kettle', label: 'Kettle', kind: 'standard', rooms: KITCHEN },
  { key: 'boiler', label: 'Boiler', kind: 'standard', rooms: [...KITCHEN, 'bathroom', 'loft', 'hallway'] },
  // Bathroom
  { key: 'shower', label: 'Shower', kind: 'standard', rooms: ['bathroom'] },
  { key: 'bath', label: 'Bath', kind: 'standard', rooms: ['bathroom'] },
  { key: 'toilet', label: 'Toilet', kind: 'standard', rooms: ['bathroom'] },
  { key: 'extractor_fan', label: 'Extractor Fan', kind: 'standard', rooms: ['bathroom', 'kitchen', 'utility'] },
  // Office
  { key: 'desk', label: 'Desk', kind: 'standard', rooms: ['office', 'bedroom', 'living_room', 'loft'] },
  { key: 'computer', label: 'Computer', kind: 'standard', rooms: ['office', 'bedroom', 'living_room', 'loft'] },
  { key: 'monitor', label: 'Monitor', kind: 'standard', rooms: ['office', 'bedroom', 'living_room', 'loft'] },
  { key: 'printer', label: 'Printer', kind: 'standard', rooms: ['office', 'bedroom', 'living_room', 'loft'] },
  // Garden / Shed
  { key: 'lawnmower', label: 'Lawnmower', kind: 'standard', rooms: OUTDOOR },
  { key: 'bbq', label: 'BBQ', kind: 'standard', rooms: OUTDOOR },
  { key: 'sauna', label: 'Sauna', kind: 'standard', rooms: OUTDOOR },
  { key: 'garden_furniture', label: 'Garden Furniture', kind: 'standard', rooms: OUTDOOR },
  { key: 'power_tools', label: 'Power Tools', kind: 'standard', rooms: OUTDOOR },
  // Driveway
  { key: 'car', label: 'Car', kind: 'car', rooms: ['driveway', 'garage'] },
  { key: 'bike', label: 'Bike', kind: 'standard', rooms: ['driveway', 'garage', 'shed', 'garden'] },
  { key: 'motorbike', label: 'Motorbike', kind: 'standard', rooms: ['driveway', 'garage'] },
  // Anywhere
  { key: 'pet', label: 'Pet', kind: 'pet', rooms: [] },
  { key: 'smoke_alarm', label: 'Smoke Alarm', kind: 'standard', rooms: [] },
  { key: 'radiator', label: 'Radiator', kind: 'standard', rooms: [] },
  { key: 'other', label: 'Other Item', kind: 'standard', rooms: [] },
]

export const catalogueEntry = (key: string): CatalogueEntry =>
  CATALOGUE.find((c) => c.key === key) ?? CATALOGUE[CATALOGUE.length - 1]

export function entriesForRoom(roomType: string): CatalogueEntry[] {
  return CATALOGUE.filter((c) => c.rooms.length === 0 || c.rooms.includes(roomType))
}

export function itemDisplayName(item: { type: string; custom_name: string | null }): string {
  return item.custom_name || catalogueEntry(item.type).label
}
