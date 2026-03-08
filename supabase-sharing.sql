-- ============================================================
-- RUN THIS in Supabase SQL Editor to add project sharing
-- ============================================================

-- 1. Project members table
create table if not exists public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id text references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'editor',  -- 'owner' or 'editor'
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

alter table public.project_members enable row level security;

-- Members can see their own memberships
create policy "Users can see own memberships" on public.project_members
  for select using (auth.uid() = user_id);

-- Project owner can manage members
create policy "Project owner can manage members" on public.project_members
  for all using (
    exists (
      select 1 from public.projects
      where id = project_id and user_id = auth.uid()
    )
  );

-- 2. Allow profile lookup by anyone (for showing member names)
create policy "Anyone can view profiles" on public.profiles
  for select using (true);
-- Drop old restrictive policy first
drop policy if exists "Users can view own profile" on public.profiles;

-- 3. Update projects RLS: allow access to shared projects
drop policy if exists "Users can CRUD own projects" on public.projects;
create policy "Users can view own or shared projects" on public.projects
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.project_members
      where project_id = id and user_id = auth.uid()
    )
  );
create policy "Users can modify own projects" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = user_id);

-- 4. Update boards RLS: allow access to shared project boards
drop policy if exists "Users can CRUD own boards" on public.boards;
create policy "Users can view own or shared boards" on public.boards
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.project_members pm
      join public.boards b on b.project_id = pm.project_id
      where b.id = boards.id and pm.user_id = auth.uid()
    )
  );
create policy "Users can modify own boards" on public.boards
  for insert with check (auth.uid() = user_id);
create policy "Users can update own boards" on public.boards
  for update using (auth.uid() = user_id);
create policy "Users can delete own boards" on public.boards
  for delete using (auth.uid() = user_id);

-- 5. Update board_data RLS: allow access to shared board data
drop policy if exists "Users can CRUD own board data" on public.board_data;
create policy "Users can view own or shared board data" on public.board_data
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.project_members pm
      join public.boards b on b.id = board_data.board_id
      where b.project_id = pm.project_id and pm.user_id = auth.uid()
    )
  );
create policy "Users can modify own board data" on public.board_data
  for insert with check (auth.uid() = user_id);
create policy "Users can update own or shared board data" on public.board_data
  for update using (
    auth.uid() = user_id
    or exists (
      select 1 from public.project_members pm
      join public.boards b on b.id = board_data.board_id
      where b.project_id = pm.project_id and pm.user_id = auth.uid()
    )
  );
create policy "Users can delete own board data" on public.board_data
  for delete using (auth.uid() = user_id);

-- 6. Function to find user by email (for invites)
create or replace function public.find_user_by_email(email_input text)
returns uuid as $$
  select id from auth.users where email = lower(email_input) limit 1;
$$ language sql security definer;

