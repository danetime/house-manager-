import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase, ATTACHMENTS_BUCKET } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type {
  CustomReminder,
  Household,
  HouseholdMember,
  Invite,
  Item,
  Room,
} from '../lib/types'
import { catalogueEntry } from '../lib/catalogue'
import { canResizeRoom, nextFreeSlot, type Placement } from '../lib/house'
import { deriveReminders, flaggedItemIds, type Reminder } from '../lib/reminders'

interface HouseholdState {
  loading: boolean
  household: Household | null
  members: HouseholdMember[]
  pendingInvites: Invite[]
  myInvites: Invite[]
  rooms: Room[]
  items: Item[]
  customReminders: CustomReminder[]
  reminders: Reminder[]
  flaggedItems: Set<string>
  refresh: () => Promise<void>
  createHousehold: (name: string) => Promise<void>
  acceptInvite: (inviteId: string) => Promise<void>
  inviteMember: (email: string) => Promise<void>
  revokeInvite: (inviteId: string) => Promise<void>
  addRoom: (p: Placement) => Promise<void>
  moveRoom: (id: string, gridX: number, gridY: number) => Promise<void>
  renameRoom: (id: string, name: string) => Promise<void>
  resizeRoom: (id: string, width: number, height: number) => Promise<void>
  removeRoom: (id: string) => Promise<void>
  addItem: (roomId: string | null, typeKey: string) => Promise<Item | null>
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>
  moveItem: (id: string, roomId: string | null, slot?: number) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

const Ctx = createContext<HouseholdState | null>(null)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])
  const [myInvites, setMyInvites] = useState<Invite[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([])

  const refresh = useCallback(async () => {
    if (!user) {
      setHousehold(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership) {
        // Not in a household yet — check for invites addressed to this email
        const { data: invites } = await supabase
          .from('invites')
          .select('*')
          .eq('status', 'pending')
          .ilike('email', user.email ?? '')
        setMyInvites(invites ?? [])
        setHousehold(null)
        setRooms([])
        setItems([])
        setCustomReminders([])
        return
      }

      const hid = membership.household_id
      const [hh, mem, inv, rm, it, cr] = await Promise.all([
        supabase.from('households').select('*').eq('id', hid).single(),
        supabase.from('household_members').select('*').eq('household_id', hid),
        supabase.from('invites').select('*').eq('household_id', hid).eq('status', 'pending'),
        supabase.from('rooms').select('*').eq('household_id', hid).order('created_at'),
        supabase.from('items').select('*').eq('household_id', hid).order('created_at'),
        supabase
          .from('custom_reminders')
          .select('*, items!inner(household_id)')
          .eq('items.household_id', hid),
      ])
      setHousehold((hh.data as Household) ?? null)
      setMembers((mem.data as HouseholdMember[]) ?? [])
      setPendingInvites((inv.data as Invite[]) ?? [])
      setRooms((rm.data as Room[]) ?? [])
      setItems((it.data as Item[]) ?? [])
      setCustomReminders(
        ((cr.data as Array<CustomReminder & { items?: unknown }>) ?? []).map(
          ({ items: _join, ...c }) => c,
        ),
      )
      setMyInvites([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const reminders = useMemo(
    () => deriveReminders(items, customReminders),
    [items, customReminders],
  )
  const flaggedItems = useMemo(() => flaggedItemIds(reminders), [reminders])

  const createHousehold = async (name: string) => {
    const { error } = await supabase.rpc('create_household', { p_name: name })
    if (error) throw error
    await refresh()
  }

  const acceptInvite = async (inviteId: string) => {
    const { error } = await supabase.rpc('accept_invite', { p_invite_id: inviteId })
    if (error) throw error
    await refresh()
  }

  const inviteMember = async (email: string) => {
    if (!household || !user) return
    const { error } = await supabase.from('invites').insert({
      household_id: household.id,
      email: email.trim().toLowerCase(),
      invited_by: user.id,
    })
    if (error) throw error
    await refresh()
  }

  const revokeInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
    if (error) throw error
    await refresh()
  }

  const addRoom = async (p: Placement) => {
    if (!household) return
    const { error } = await supabase.from('rooms').insert({ household_id: household.id, ...p })
    if (error) throw error
    await refresh()
  }

  const moveRoom = async (id: string, gridX: number, gridY: number) => {
    const { error } = await supabase
      .from('rooms')
      .update({ grid_x: gridX, grid_y: gridY })
      .eq('id', id)
    if (error) throw error
    await refresh()
  }

  const renameRoom = async (id: string, name: string) => {
    const { error } = await supabase
      .from('rooms')
      .update({ custom_name: name.trim() || null })
      .eq('id', id)
    if (error) throw error
    await refresh()
  }

  const resizeRoom = async (id: string, width: number, height: number) => {
    const room = rooms.find((r) => r.id === id)
    if (!room) return
    const check = canResizeRoom(room, width, height, rooms)
    if (!check.ok) throw new Error(check.reason)
    const { error } = await supabase.from('rooms').update({ width, height }).eq('id', id)
    if (error) throw error
    await refresh()
  }

  /** Items move to the Unassigned holding area — never silently deleted. */
  const removeRoom = async (id: string) => {
    const move = await supabase.from('items').update({ room_id: null }).eq('room_id', id)
    if (move.error) throw move.error
    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  const addItem = async (roomId: string | null, typeKey: string): Promise<Item | null> => {
    if (!household || !user) return null
    const entry = catalogueEntry(typeKey)
    const room = rooms.find((r) => r.id === roomId)
    const taken = items.filter((i) => i.room_id === roomId).map((i) => i.slot)
    const slot = room ? nextFreeSlot(room, taken) : 0
    const { data, error } = await supabase
      .from('items')
      .insert({
        household_id: household.id,
        room_id: roomId,
        type: typeKey,
        kind: entry.kind,
        slot,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) throw error
    await refresh()
    return data as Item
  }

  const updateItem = async (id: string, patch: Partial<Item>) => {
    const { error } = await supabase.from('items').update(patch).eq('id', id)
    if (error) throw error
    await refresh()
  }

  const moveItem = async (id: string, roomId: string | null, slot?: number) => {
    const room = rooms.find((r) => r.id === roomId)
    const moving = items.find((i) => i.id === id)
    const others = items.filter((i) => i.room_id === roomId && i.id !== id)
    const taken = others.map((i) => i.slot)
    const target = room ? (slot ?? nextFreeSlot(room, taken)) : 0
    // dropping onto an occupied slot displaces the occupant, swapping if
    // the carried item came from the same room
    const occupant = others.find((i) => i.slot === target)
    if (occupant && room) {
      const fallback =
        moving && moving.room_id === roomId
          ? moving.slot
          : nextFreeSlot(room, [...taken, target])
      const { error } = await supabase.from('items').update({ slot: fallback }).eq('id', occupant.id)
      if (error) throw error
    }
    await updateItem(id, { room_id: roomId, slot: target })
  }

  /** Deletes the item, its records (cascade) and its files in storage. */
  const deleteItem = async (id: string) => {
    const { data: atts } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('item_id', id)
    if (atts && atts.length > 0) {
      await supabase.storage.from(ATTACHMENTS_BUCKET).remove(atts.map((a) => a.storage_path))
    }
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  return (
    <Ctx.Provider
      value={{
        loading,
        household,
        members,
        pendingInvites,
        myInvites,
        rooms,
        items,
        customReminders,
        reminders,
        flaggedItems,
        refresh,
        createHousehold,
        acceptInvite,
        inviteMember,
        revokeInvite,
        addRoom,
        moveRoom,
        renameRoom,
        resizeRoom,
        removeRoom,
        addItem,
        updateItem,
        moveItem,
        deleteItem,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useHousehold(): HouseholdState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useHousehold must be used inside HouseholdProvider')
  return ctx
}
