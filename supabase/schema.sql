create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  username text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower_username text not null references users(username) on delete cascade,
  followed_username text not null references users(username) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_username, followed_username),
  check (follower_username <> followed_username)
);

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  category text not null default 'Opinion',
  creator_username text not null references users(username) on delete cascade,
  created_at timestamptz not null default now(),
  is_open boolean not null default true,
  voting_type text not null default 'single',
  max_choices integer,
  closes_at timestamptz,
  check (voting_type in ('single', 'multiple', 'ranked')),
  check (max_choices is null or max_choices >= 1)
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  text text not null,
  option_index integer not null,
  votes integer not null default 0,
  image_path text,
  unique (poll_id, option_index)
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  username text not null references users(username) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  rank integer,
  unique (username, poll_id, option_id)
);
