-- Enable Row Level Security and policies for Vero tables.
-- Applied AFTER the Drizzle-generated initial schema migration.
--
-- Each patient-scoped table carries user_id references auth.users.
-- Policies let an authenticated user only see/mutate their own rows.
-- The service-role key used by API routes bypasses RLS automatically,
-- so the demo keeps working without login UI.

-- ---------- patients ----------
alter table public.patients enable row level security;

create policy "patients_select_own"
  on public.patients for select
  using (auth.uid() = user_id);

create policy "patients_insert_own"
  on public.patients for insert
  with check (auth.uid() = user_id);

create policy "patients_update_own"
  on public.patients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "patients_delete_own"
  on public.patients for delete
  using (auth.uid() = user_id);

-- ---------- plans (scoped via patient_id) ----------
alter table public.plans enable row level security;

create policy "plans_select_via_patient"
  on public.plans for select
  using (exists (
    select 1 from public.patients p
    where p.id = plans.patient_id and p.user_id = auth.uid()
  ));

create policy "plans_mutate_via_patient"
  on public.plans for all
  using (exists (
    select 1 from public.patients p
    where p.id = plans.patient_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.patients p
    where p.id = plans.patient_id and p.user_id = auth.uid()
  ));

-- ---------- sessions ----------
alter table public.sessions enable row level security;

create policy "sessions_select_own"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "sessions_mutate_own"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- sets (scoped via session_id) ----------
alter table public.sets enable row level security;

create policy "sets_select_via_session"
  on public.sets for select
  using (exists (
    select 1 from public.sessions s
    where s.id = sets.session_id and s.user_id = auth.uid()
  ));

create policy "sets_mutate_via_session"
  on public.sets for all
  using (exists (
    select 1 from public.sessions s
    where s.id = sets.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = sets.session_id and s.user_id = auth.uid()
  ));

-- ---------- rep_analyses (scoped via set → session) ----------
alter table public.rep_analyses enable row level security;

create policy "rep_analyses_select_via_session"
  on public.rep_analyses for select
  using (exists (
    select 1 from public.sets st
    join public.sessions s on s.id = st.session_id
    where st.id = rep_analyses.set_id and s.user_id = auth.uid()
  ));

create policy "rep_analyses_mutate_via_session"
  on public.rep_analyses for all
  using (exists (
    select 1 from public.sets st
    join public.sessions s on s.id = st.session_id
    where st.id = rep_analyses.set_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sets st
    join public.sessions s on s.id = st.session_id
    where st.id = rep_analyses.set_id and s.user_id = auth.uid()
  ));

-- ---------- form_events ----------
alter table public.form_events enable row level security;

create policy "form_events_select_via_session"
  on public.form_events for select
  using (exists (
    select 1 from public.sets st
    join public.sessions s on s.id = st.session_id
    where st.id = form_events.set_id and s.user_id = auth.uid()
  ));

create policy "form_events_mutate_via_session"
  on public.form_events for all
  using (exists (
    select 1 from public.sets st
    join public.sessions s on s.id = st.session_id
    where st.id = form_events.set_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sets st
    join public.sessions s on s.id = st.session_id
    where st.id = form_events.set_id and s.user_id = auth.uid()
  ));

-- ---------- red_flags (scoped via session_id) ----------
alter table public.red_flags enable row level security;

create policy "red_flags_select_via_session"
  on public.red_flags for select
  using (exists (
    select 1 from public.sessions s
    where s.id = red_flags.session_id and s.user_id = auth.uid()
  ));

create policy "red_flags_mutate_via_session"
  on public.red_flags for all
  using (exists (
    select 1 from public.sessions s
    where s.id = red_flags.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = red_flags.session_id and s.user_id = auth.uid()
  ));

-- ---------- narrator_log (scoped via session_id) ----------
alter table public.narrator_log enable row level security;

create policy "narrator_log_select_via_session"
  on public.narrator_log for select
  using (exists (
    select 1 from public.sessions s
    where s.id = narrator_log.session_id and s.user_id = auth.uid()
  ));

create policy "narrator_log_mutate_via_session"
  on public.narrator_log for all
  using (exists (
    select 1 from public.sessions s
    where s.id = narrator_log.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = narrator_log.session_id and s.user_id = auth.uid()
  ));

-- ---------- chat_messages ----------
alter table public.chat_messages enable row level security;

create policy "chat_messages_select_own"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "chat_messages_mutate_own"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- patient_memory ----------
alter table public.patient_memory enable row level security;

create policy "patient_memory_select_own"
  on public.patient_memory for select
  using (auth.uid() = user_id);

create policy "patient_memory_mutate_own"
  on public.patient_memory for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
