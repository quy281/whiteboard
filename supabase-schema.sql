-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default '',
  color text not null default '#6366f1',
  avatar text not null default '😎',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Projects table
create table if not exists public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  color text not null default '#6366f1',
  created_at bigint not null,
  updated_at bigint not null
);

alter table public.projects enable row level security;

create policy "Users can CRUD own projects" on public.projects
  for all using (auth.uid() = user_id);

-- Boards table
create table if not exists public.boards (
  id text primary key,
  project_id text references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  room_id text not null,
  created_at bigint not null,
  updated_at bigint not null
);

alter table public.boards enable row level security;

create policy "Users can CRUD own boards" on public.boards
  for all using (auth.uid() = user_id);

-- Board data table (shapes, notes, etc.)
create table if not exists public.board_data (
  board_id text references public.boards(id) on delete cascade primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0
);

alter table public.board_data enable row level security;

create policy "Users can CRUD own board data" on public.board_data
  for all using (auth.uid() = user_id);

-- Auto-create profile on signup
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

-- Drop existing trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
