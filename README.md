# The House — Pixel House Organiser

A web app that presents your home as a 2D side-on pixel-art cutaway (dollhouse style). Build your
house by placing rooms, drop items into them (TV, boiler, oven…), and click any item to store the
real-world boring-but-important stuff: warranty dates, receipts, purchase details, service history.
Cars live on the driveway, pets live in the house, and the dashboard makes sure you never miss an
MOT, warranty expiry or vaccination again.

Built with React + Vite + TypeScript, Tailwind, and Supabase (Postgres, Auth, Storage, RLS).
All pixel art is drawn in code — no sprite assets.

## Features

- **House builder** — grid-based cutaway with a gravity rule (no floating rooms), driveway slots
  (max 2), garden, automatic pitched roof, View/Edit modes.
- **Items & records** — fixed sprite catalogue, rename/move items, purchase details (£, dd/mm/yyyy),
  warranty dates, receipt/photo uploads (jpg/png/heic/pdf ≤10MB, images compressed client-side),
  service history log, free-text notes.
- **Cars** — MOT, road tax and insurance renewal dates, registration, make/model.
- **Pets** — vaccinations, vet visits, pet insurance, microchip, species/breed.
- **Reminders** — derived automatically from the data; dashboard groups Overdue / Due within
  30 days / Later; flagged items get a “!” badge on the house and their room glows.
- **Sharing** — one household, two (or more) members with full shared access, invite by email.
- Nothing is ever silently deleted: removing a room moves its items to an Unassigned area, and all
  destructive actions ask for confirmation.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Apply the schema:** paste `supabase/migrations/0001_init.sql` into the SQL editor (or run
   `supabase db push` with the CLI). This creates all tables, row-level security policies, the
   `attachments` storage bucket and the onboarding RPCs.
3. **Enable auth providers:** in Authentication → Providers, enable **Email** and **Google**
   (add your Google OAuth client ID/secret, and your site URL to the redirect allow-list).
4. **Configure the app:**
   ```sh
   cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   npm install
   npm run dev
   ```
5. Sign in, name your household (e.g. “Chez Dane”), and start building.

## Project layout

```
supabase/migrations/0001_init.sql   schema + RLS + storage policies + RPCs
supabase/functions/reminders-digest Phase 2 email digest stub (Edge Function)
src/lib/                            domain logic: grid/gravity rules, catalogue,
                                    reminder derivation, formatting (en-GB)
src/sprites/                        pixel sprites defined as character grids
src/components/                     canvas, item drawer, uploads, dialogs
src/pages/                          sign-in, onboarding, house, dashboard, household
```

## Roadmap (per the PRD)

- **Phase 2:** scheduled email digests via the `reminders-digest` Edge Function — the
  channel interface already exists in `src/lib/reminders.ts`.
- **Phase 3:** installable PWA with push notifications.
