-- Repurpose narrator_log as the canonical log of all Claude-as-PT commentary.
-- Adds patient_id + source, makes session_id nullable so non-session
-- commentary (intake, chat, plan rationale) can be captured.

alter table public.narrator_log
  alter column session_id drop not null;

alter table public.narrator_log
  add column if not exists patient_id uuid references public.patients(id) on delete cascade;

alter table public.narrator_log
  add column if not exists source text;

-- Backfill any existing rows (there are none in practice; defensive).
update public.narrator_log set source = 'narrator' where source is null;

alter table public.narrator_log
  alter column source set not null;

alter table public.narrator_log
  add column if not exists created_at timestamp with time zone default now();

alter table public.narrator_log
  alter column created_at set not null;

alter table public.narrator_log
  alter column t_ms set default 0;

create index if not exists narrator_log_patient_created_idx
  on public.narrator_log (patient_id, created_at desc);
