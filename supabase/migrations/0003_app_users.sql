-- Simple username/password auth — a public.users table replacing the
-- auth.users reference. Existing user_id columns are dropped and re-added
-- because the UUIDs that previously pointed at auth.users no longer apply;
-- the demo seed will repopulate patients under the new public.users row.

-- 1. Create the users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  created_at timestamp with time zone not null default now()
);

-- 2. Drop existing FK constraints that point at auth.users.
--    Names come from drizzle-kit's 0000_initial.sql.
alter table public.patients
  drop constraint if exists patients_user_id_users_id_fk;
alter table public.sessions
  drop constraint if exists sessions_user_id_users_id_fk;
alter table public.chat_messages
  drop constraint if exists chat_messages_user_id_users_id_fk;
alter table public.patient_memory
  drop constraint if exists patient_memory_user_id_users_id_fk;

-- 3. Wipe stale user_id values — they reference auth.users which we've
--    stopped using. Re-seed (`npm run db:seed`) will fill them in again.
update public.patients set user_id = null;
update public.sessions set user_id = null;
update public.chat_messages set user_id = null;
update public.patient_memory set user_id = null;

-- 4. Re-add FKs pointing at the new public.users table.
alter table public.patients
  add constraint patients_user_id_users_id_fk
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.sessions
  add constraint sessions_user_id_users_id_fk
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.chat_messages
  add constraint chat_messages_user_id_users_id_fk
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.patient_memory
  add constraint patient_memory_user_id_users_id_fk
  foreign key (user_id) references public.users(id) on delete cascade;

-- 5. RLS policies from 0002_enable_rls.sql reference auth.uid() which no
--    longer matches our app users. Drop them so RLS doesn't silently block
--    future queries if it gets re-enabled.
alter table public.patients disable row level security;
alter table public.plans disable row level security;
alter table public.sessions disable row level security;
alter table public.sets disable row level security;
alter table public.rep_analyses disable row level security;
alter table public.form_events disable row level security;
alter table public.red_flags disable row level security;
alter table public.narrator_log disable row level security;
alter table public.chat_messages disable row level security;
alter table public.patient_memory disable row level security;
