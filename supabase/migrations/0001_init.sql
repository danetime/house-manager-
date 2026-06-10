-- Pixel House Organiser — initial schema
-- Run via `supabase db push` or paste into the Supabase SQL editor.

-- ============================================================
-- Tables
-- ============================================================

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- A user belongs to exactly one household (MVP rule)
  constraint one_household_per_user unique (user_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  type text not null,
  custom_name text,
  grid_x integer not null,
  grid_y integer not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- null room = "Unassigned" holding area
  room_id uuid references public.rooms (id) on delete set null,
  type text not null,
  custom_name text,
  kind text not null default 'standard' check (kind in ('standard', 'car', 'pet')),
  slot integer not null default 0,
  purchase_date date,
  purchase_price numeric(10, 2),
  warranty_expiry date,
  warranty_provider text,
  notes text,
  -- car/pet specifics: registration, make_model, mot_due, tax_due, insurance_due,
  -- species_breed, date_of_birth, microchip, vaccination_due, pet_insurance_due
  extra jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_entries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  date date not null,
  note text not null,
  cost numeric(10, 2),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  storage_path text not null,
  type text not null default 'receipt' check (type in ('receipt', 'photo', 'pdf')),
  file_name text,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.custom_reminders (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  title text not null,
  due_date date not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index rooms_household_idx on public.rooms (household_id);
create index items_household_idx on public.items (household_id);
create index items_room_idx on public.items (room_id);
create index service_entries_item_idx on public.service_entries (item_id);
create index attachments_item_idx on public.attachments (item_id);
create index custom_reminders_item_idx on public.custom_reminders (item_id);
create index invites_email_idx on public.invites (lower(email));

-- keep items.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Membership helper (security definer avoids RLS recursion)
-- ============================================================

create or replace function public.my_household_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  )
$$;

-- ============================================================
-- RPCs for onboarding (security definer keeps policies simple)
-- ============================================================

-- Create a household and become its owner. Fails if already in one.
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household';
  end if;
  insert into public.households (name, created_by)
    values (p_name, auth.uid()) returning id into hid;
  insert into public.household_members (household_id, user_id, role)
    values (hid, auth.uid(), 'owner');
  return hid;
end $$;

-- Accept a pending invite addressed to the signed-in user's email.
create or replace function public.accept_invite(p_invite_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv public.invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household';
  end if;
  select * into inv from public.invites
    where id = p_invite_id
      and status = 'pending'
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  if not found then
    raise exception 'Invite not found or not addressed to you';
  end if;
  insert into public.household_members (household_id, user_id, role)
    values (inv.household_id, auth.uid(), 'member');
  update public.invites set status = 'accepted' where id = inv.id;
  return inv.household_id;
end $$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.invites enable row level security;
alter table public.rooms enable row level security;
alter table public.items enable row level security;
alter table public.service_entries enable row level security;
alter table public.attachments enable row level security;
alter table public.custom_reminders enable row level security;

create policy "members read household" on public.households
  for select using (public.is_household_member(id));
create policy "members update household" on public.households
  for update using (public.is_household_member(id));

create policy "members read members" on public.household_members
  for select using (public.is_household_member(household_id));
create policy "self update member row" on public.household_members
  for update using (user_id = auth.uid());

-- Invites: household members manage them; invitees can see their own by email.
create policy "members read invites" on public.invites
  for select using (
    public.is_household_member(household_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "members create invites" on public.invites
  for insert with check (
    public.is_household_member(household_id) and invited_by = auth.uid()
  );
create policy "members update invites" on public.invites
  for update using (public.is_household_member(household_id));
create policy "members delete invites" on public.invites
  for delete using (public.is_household_member(household_id));

-- Household-scoped tables: full read/write for members.
create policy "members all rooms" on public.rooms
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "members all items" on public.items
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "members all service_entries" on public.service_entries
  for all using (
    exists (select 1 from public.items i
            where i.id = item_id and public.is_household_member(i.household_id))
  )
  with check (
    exists (select 1 from public.items i
            where i.id = item_id and public.is_household_member(i.household_id))
  );

create policy "members all attachments" on public.attachments
  for all using (
    exists (select 1 from public.items i
            where i.id = item_id and public.is_household_member(i.household_id))
  )
  with check (
    exists (select 1 from public.items i
            where i.id = item_id and public.is_household_member(i.household_id))
  );

create policy "members all custom_reminders" on public.custom_reminders
  for all using (
    exists (select 1 from public.items i
            where i.id = item_id and public.is_household_member(i.household_id))
  )
  with check (
    exists (select 1 from public.items i
            where i.id = item_id and public.is_household_member(i.household_id))
  );

-- ============================================================
-- Storage: attachments bucket, paths scoped per household
-- (object path convention: <household_id>/<item_id>/<filename>)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "household members read files" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and public.is_household_member((storage.foldername(name))[1]::uuid)
  );
create policy "household members upload files" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and public.is_household_member((storage.foldername(name))[1]::uuid)
  );
create policy "household members delete files" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and public.is_household_member((storage.foldername(name))[1]::uuid)
  );
