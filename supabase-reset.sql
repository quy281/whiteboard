-- ============================================================
-- RESET TOÀN BỘ + FIX INFINITE RECURSION
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- ========== BƯỚC 1: XÓA HẾT CÁI CŨ ==========
drop function if exists public.find_user_by_email(text);
drop function if exists public.handle_new_user() cascade;
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.board_data cascade;
drop table if exists public.boards cascade;
drop table if exists public.project_members cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;

-- ========== BƯỚC 2: TẠO TABLES ==========

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default '',
  color text not null default '#6366f1',
  avatar text not null default '😎',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  color text not null default '#6366f1',
  created_at bigint not null,
  updated_at bigint not null
);
alter table public.projects enable row level security;

create table public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id text references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'editor',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);
alter table public.project_members enable row level security;

create table public.boards (
  id text primary key,
  project_id text references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  room_id text not null,
  created_at bigint not null,
  updated_at bigint not null
);
alter table public.boards enable row level security;

create table public.board_data (
  board_id text references public.boards(id) on delete cascade primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0
);
alter table public.board_data enable row level security;

-- ========== BƯỚC 3: TẠO SECURITY DEFINER FUNCTION (TRÁNH RECURSION) ==========
-- Dùng security definer function để check membership mà không trigger RLS

create or replace function public.is_project_member(p_project_id text, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  );
$$ language sql security definer stable;

create or replace function public.is_project_owner(p_project_id text, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and user_id = p_user_id
  );
$$ language sql security definer stable;

create or replace function public.get_board_project_id(p_board_id text)
returns text as $$
  select project_id from public.boards where id = p_board_id limit 1;
$$ language sql security definer stable;

-- ========== BƯỚC 4: RLS POLICIES (KHÔNG RECURSION) ==========

-- Profiles
create policy "Anyone can view profiles" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Projects: dùng function thay vì subquery trực tiếp
create policy "Users can view own or shared projects" on public.projects
  for select using (
    auth.uid() = user_id
    or public.is_project_member(id, auth.uid())
  );
create policy "Users can insert own projects" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = user_id);

-- Project members: dùng function thay vì subquery vào projects
create policy "Users can see own memberships" on public.project_members
  for select using (auth.uid() = user_id);
create policy "Project owner can insert members" on public.project_members
  for insert with check (public.is_project_owner(project_id, auth.uid()));
create policy "Project owner can update members" on public.project_members
  for update using (public.is_project_owner(project_id, auth.uid()));
create policy "Project owner can delete members" on public.project_members
  for delete using (public.is_project_owner(project_id, auth.uid()));

-- Boards: dùng function
create policy "Users can view own or shared boards" on public.boards
  for select using (
    auth.uid() = user_id
    or public.is_project_member(project_id, auth.uid())
  );
create policy "Users can insert own boards" on public.boards
  for insert with check (auth.uid() = user_id);
create policy "Users can update own boards" on public.boards
  for update using (auth.uid() = user_id);
create policy "Users can delete own boards" on public.boards
  for delete using (auth.uid() = user_id);

-- Board data: dùng function
create policy "Users can view own or shared board data" on public.board_data
  for select using (
    auth.uid() = user_id
    or public.is_project_member(public.get_board_project_id(board_id), auth.uid())
  );
create policy "Users can insert own board data" on public.board_data
  for insert with check (auth.uid() = user_id);
create policy "Users can update own or shared board data" on public.board_data
  for update using (
    auth.uid() = user_id
    or public.is_project_member(public.get_board_project_id(board_id), auth.uid())
  );
create policy "Users can delete own board data" on public.board_data
  for delete using (auth.uid() = user_id);

-- ========== BƯỚC 5: FUNCTIONS + TRIGGERS ==========

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'avatar', '😎'),
    coalesce(new.raw_user_meta_data->>'color', '#6366f1')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.find_user_by_email(email_input text)
returns uuid as $$
  select id from auth.users where email = lower(email_input) limit 1;
$$ language sql security definer;

-- ========== BƯỚC 6: TẠO LẠI PROFILE CHO USERS ĐÃ CÓ ==========
insert into public.profiles (id, name, avatar, color)
select
  id,
  coalesce(raw_user_meta_data->>'name', 'User'),
  coalesce(raw_user_meta_data->>'avatar', '😎'),
  coalesce(raw_user_meta_data->>'color', '#6366f1')
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;
