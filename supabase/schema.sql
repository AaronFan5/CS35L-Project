create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  username text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  category text not null default 'Opinion',
  creator_username text not null references users(username) on delete cascade,
  created_at timestamptz not null default now()
  is_open boolean not null default true
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  text text not null,
  option_index integer not null,
  votes integer not null default 0,
  unique (poll_id, option_index)
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  username text not null references users(username) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  unique (username, poll_id)
);
