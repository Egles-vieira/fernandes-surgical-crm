-- Criar tabela de roles (o tipo app_role já existe)
create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamp with time zone default now(),
    unique (user_id, role)
);

-- Habilitar RLS
alter table public.user_roles enable row level security;

-- Função security definer para verificar role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Política para usuários visualizarem suas próprias roles
create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

-- Política para admins gerenciarem roles
create policy "Admins can manage all roles"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Comentários
comment on table public.user_roles is 'Armazena roles dos usuários do sistema';
comment on function public.has_role is 'Verifica se um usuário possui determinada role';