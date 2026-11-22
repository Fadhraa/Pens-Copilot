-- PENS Copilot Database Schema (Supabase / PostgreSQL)
-- Jalankan file ini di Supabase Dashboard -> SQL Editor

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  nrp text unique not null,
  prodi text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. KRS Documents (metadata untuk file di Supabase Storage bucket 'krs-uploads')
create table if not exists public.krs_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text,
  extracted_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. Schedules (Jadwal Kuliah & Pengingat Presensi ETHOL)
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  krs_document_id uuid references public.krs_documents(id) on delete set null,
  day text not null,
  time_range text not null,
  subject text not null,
  lecturer text,
  room text,
  ethol_reminder boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Tasks (Daftar Tugas Kuliah & Deadline)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null,
  title text not null,
  description text,
  deadline timestamptz,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Chat Sessions & Messages (Histori Percakapan AI)
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Percakapan Baru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- 6. Quizzes & Attempts (Quiz AI berdasarkan materi)
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  title text not null,
  topic text,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total_questions integer not null default 0,
  completed_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.krs_documents enable row level security;
alter table public.schedules enable row level security;
alter table public.tasks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;

-- RLS Policies
create policy "Users can manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage own krs_documents" on public.krs_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own schedules" on public.schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own chat_sessions" on public.chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own chat_messages" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own quizzes" on public.quizzes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own quiz_attempts" on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage Bucket untuk Gambar / PDF Jadwal KRS
insert into storage.buckets (id, name, public)
values ('krs-uploads', 'krs-uploads', false)
on conflict (id) do nothing;

create policy "Users can upload own KRS files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'krs-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own KRS files" on storage.objects
  for select to authenticated
  using (bucket_id = 'krs-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own KRS files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'krs-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

-- Auto-create profile when a new user signs up in auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, nrp, prodi, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'nrp', ''),
    coalesce(new.raw_user_meta_data->>'prodi', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. RAG Knowledge Base (pgvector + Study Materials + Document Chunks)
create extension if not exists vector;

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text,
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.study_materials(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

alter table public.study_materials enable row level security;
alter table public.document_chunks enable row level security;

create policy "Users can manage own study_materials" on public.study_materials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own document_chunks" on public.document_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.match_document_chunks (
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 3,
  p_user_id uuid default auth.uid()
)
returns table (
  id uuid,
  material_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.material_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.user_id = p_user_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
