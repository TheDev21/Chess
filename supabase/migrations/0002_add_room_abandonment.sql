-- Adds server-side-enforced disconnection/abandonment tracking to online
-- multiplayer rooms. See supabase/functions/_shared/state.ts (tryAbandonRoom),
-- rooms-heartbeat, rooms-abandon, and rooms-cleanup for how these columns
-- are used.

alter table public.rooms
  add column white_last_seen timestamptz,
  add column black_last_seen timestamptz,
  add column abandoned_by text check (abandoned_by in ('white', 'black')),
  add column abandoned_at timestamptz;

-- Backfill: treat "the moment this migration deploys" as an implicit fresh
-- heartbeat for every currently-seated player in every in-progress game, so
-- no existing active room is instantly eligible for abandonment the moment
-- the cleanup sweep first runs - each gets a full fresh 2-minute grace
-- window from deploy time. Unseated columns are left NULL; rooms still
-- waiting for a second player are never swept (rooms-cleanup only
-- considers rooms where both seats are filled).
update public.rooms set white_last_seen = now() where white_player_id is not null and white_last_seen is null;
update public.rooms set black_last_seen = now() where black_player_id is not null and black_last_seen is null;

-- Scheduled cleanup infrastructure. pg_cron schedules a periodic SQL job;
-- pg_net lets that job make an HTTP call to the rooms-cleanup Edge
-- Function, which is what actually sweeps for abandoned rooms (chess.js
-- game-over detection has to happen in TypeScript, not SQL).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Generates a random secret *inside Postgres* and stores it directly in
-- Vault - the value is never written into this file or any other part of
-- the repository. Only the cron job (via vault.decrypted_secrets, read
-- from inside a SQL job body) and the verify_cleanup_secret() function
-- below (also running inside Postgres) ever see the actual value.
select vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'rooms_cleanup_secret',
  'Shared secret the pg_cron sweep sends to rooms-cleanup, verified there via verify_cleanup_secret().'
);

-- Lets rooms-cleanup verify the secret without the Vault schema ever being
-- exposed through the normal REST client (it isn't, by design - this
-- SECURITY DEFINER function is the supported way to bridge that gap).
-- Empty search_path plus fully-qualified `vault.decrypted_secrets` closes
-- off search-path hijacking as an attack vector on this function.
create or replace function public.verify_cleanup_secret(provided text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'rooms_cleanup_secret' and decrypted_secret = provided
  );
$$;

revoke all on function public.verify_cleanup_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cleanup_secret(text) to service_role;

-- Runs every minute. The anon key here only satisfies rooms-cleanup's
-- default per-function JWT gate (the same gate every Edge Function in this
-- project already has) - it grants no special access by itself (and it's
-- already public: it's the same VITE_SUPABASE_ANON_KEY committed in this
-- repo's .env, confirmed in the Phase 1 licensing/secrets review). The
-- actual permission to run a sweep is the X-Cleanup-Secret header, read
-- fresh from Vault on every run.
--
-- This project's URL (confirmed) is https://oaarcqhebczfsyckfduj.supabase.co.
-- The Authorization value below is the same VITE_SUPABASE_ANON_KEY already
-- committed in this repo's .env (public by design - see that file's own
-- comment), copied in verbatim ahead of applying this migration.
select cron.schedule(
  'rooms-cleanup-sweep',
  '*/1 * * * *',
  $$
  select net.http_post(
    url := 'https://oaarcqhebczfsyckfduj.supabase.co/functions/v1/rooms-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_yESanos76Vn3sZeC7EdN0g_sYT-uqY-',
      'X-Cleanup-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rooms_cleanup_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
