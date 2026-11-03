create table public.rooms (
  id text primary key,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  move_history jsonb not null default '[]'::jsonb,
  white_player_id text,
  black_player_id text,
  draw_offered_by text check (draw_offered_by in ('white', 'black', 'agreed')),
  resigned_by text check (resigned_by in ('white', 'black')),
  created_at timestamptz not null default now()
);

create index rooms_created_at_idx on public.rooms (created_at);

alter table public.rooms enable row level security;

-- Anyone who knows the room code may read that one room (the code itself
-- is the shared secret, matching the original server's "join by code" model).
-- All writes go through Edge Functions using the service role key, never
-- directly from the browser, so there is no public write policy.
create policy "Anyone can read a room by id" on public.rooms
  for select using (true);

alter publication supabase_realtime add table public.rooms;
