export type Role = 'owner' | 'member'
export type ItemKind = 'standard' | 'car' | 'pet'
export type AttachmentType = 'receipt' | 'photo' | 'pdf'
export type InviteStatus = 'pending' | 'accepted' | 'revoked'

export interface Household {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface HouseholdMember {
  household_id: string
  user_id: string
  role: Role
  display_name: string | null
  created_at: string
}

export interface Invite {
  id: string
  household_id: string
  email: string
  status: InviteStatus
  invited_by: string
  created_at: string
}

export interface Room {
  id: string
  household_id: string
  type: string
  custom_name: string | null
  grid_x: number
  grid_y: number
  width: number
  height: number
  created_at: string
}

/** Car/pet specifics stored in items.extra (JSONB). */
export interface ItemExtra {
  // car
  registration?: string
  make_model?: string
  mot_due?: string
  tax_due?: string
  insurance_due?: string
  // pet
  species_breed?: string
  date_of_birth?: string
  microchip?: string
  vaccination_due?: string
  pet_insurance_due?: string
}

export interface Item {
  id: string
  household_id: string
  room_id: string | null
  type: string
  custom_name: string | null
  kind: ItemKind
  slot: number
  purchase_date: string | null
  purchase_price: number | null
  warranty_expiry: string | null
  warranty_provider: string | null
  notes: string | null
  extra: ItemExtra
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ServiceEntry {
  id: string
  item_id: string
  date: string
  note: string
  cost: number | null
  created_by: string | null
  created_at: string
}

export interface Attachment {
  id: string
  item_id: string
  storage_path: string
  type: AttachmentType
  file_name: string | null
  uploaded_by: string | null
  created_at: string
}

export interface CustomReminder {
  id: string
  item_id: string
  title: string
  due_date: string
  created_by: string | null
  created_at: string
}
