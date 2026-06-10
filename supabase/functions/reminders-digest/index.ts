// Phase 2 stub — email reminder digests (PRD §9.3).
//
// Deploy as a scheduled Supabase Edge Function (cron, e.g. daily at 08:00):
//   supabase functions deploy reminders-digest
//   select cron.schedule('reminders-digest', '0 8 * * *', ...)
//
// Intended behaviour: for each household, derive reminders the same way the
// client does (warranty/MOT/tax/insurance/vaccination dates + custom
// reminders), pick those hitting 30 days / 7 days / overdue today, and email
// a digest to every household member. The in-app/email/push channel split is
// already modelled in src/lib/reminders.ts (ReminderChannel).
//
// Intentionally not implemented in the MVP.

Deno.serve(() => {
  return new Response(
    JSON.stringify({ status: 'stub', message: 'Email digests are a Phase 2 feature.' }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
