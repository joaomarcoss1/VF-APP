-- VF Nexus V9.2 - Hardening de login e sessão operacional de atendimento
create extension if not exists pgcrypto;

create table if not exists public.restaurant_staff_sessions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade not null,
  staff_id uuid references public.restaurant_staff(id) on delete cascade not null,
  setor text not null,
  ativo boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '12 hours'),
  ended_at timestamptz
);

alter table if exists public.restaurant_staff_sessions
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade,
  add column if not exists staff_id uuid references public.restaurant_staff(id) on delete cascade,
  add column if not exists setor text,
  add column if not exists ativo boolean default true,
  add column if not exists expires_at timestamptz default (now() + interval '12 hours'),
  add column if not exists ended_at timestamptz;

create index if not exists restaurant_staff_sessions_empresa_staff_idx on public.restaurant_staff_sessions(empresa_id, staff_id, ativo);
create index if not exists restaurant_staff_sessions_expires_idx on public.restaurant_staff_sessions(expires_at);

create or replace function public.vf_only_digits(p_text text)
returns text language sql immutable as $$ select regexp_replace(coalesce(p_text,''), '\D', '', 'g') $$;

drop function if exists public.vf_restaurante_login_staff(text,text,text) cascade;
create or replace function public.vf_restaurante_login_staff(p_nome text, p_cpf text, p_codigo_empresa text)
returns table(
  id uuid,
  empresa_id uuid,
  nome text,
  cpf text,
  cpf_normalizado text,
  setor text,
  cargo text,
  ativo boolean,
  session_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_staff public.restaurant_staff%rowtype;
  v_session_id uuid;
  v_nome text := lower(trim(coalesce(p_nome,'')));
  v_cpf text := public.vf_only_digits(p_cpf);
  v_codigo text := trim(coalesce(p_codigo_empresa,''));
begin
  if v_nome = '' or length(v_cpf) < 11 or v_codigo = '' then
    raise exception 'Informe nome, CPF e código/matrícula da empresa.';
  end if;

  select e.id into v_empresa_id
  from public.empresas e
  where lower(coalesce(e.codigo_empresa,'')) = lower(v_codigo)
     or lower(coalesce(e.matricula_empresa,'')) = lower(v_codigo)
     or e.id::text = v_codigo
  limit 1;

  if v_empresa_id is null then
    raise exception 'Empresa não encontrada para o código/matrícula informado.';
  end if;

  select * into v_staff
  from public.restaurant_staff rs
  where rs.empresa_id = v_empresa_id
    and rs.cpf_normalizado = v_cpf
    and coalesce(rs.ativo,true) = true
  limit 1;

  if v_staff.id is null then
    raise exception 'Funcionário não encontrado ou inativo nesta empresa.';
  end if;

  if position(split_part(v_nome, ' ', 1) in lower(coalesce(v_staff.nome,''))) = 0 then
    raise exception 'Nome não confere com o CPF informado.';
  end if;

  insert into public.restaurant_staff_sessions(empresa_id, staff_id, setor, ativo, created_at, expires_at)
  values (v_empresa_id, v_staff.id, v_staff.setor, true, now(), now() + interval '12 hours')
  returning restaurant_staff_sessions.id into v_session_id;

  update public.restaurant_staff
  set ultimo_acesso_em = now(), updated_at = now()
  where id = v_staff.id and empresa_id = v_empresa_id;

  return query select v_staff.id, v_staff.empresa_id, v_staff.nome, v_staff.cpf, v_staff.cpf_normalizado, v_staff.setor, v_staff.cargo, v_staff.ativo, v_session_id;
end;
$$;

grant execute on function public.vf_restaurante_login_staff(text,text,text) to anon, authenticated;

create or replace function public.vf_restaurante_validar_staff_session(p_session_id uuid, p_setor text default null)
returns table(
  session_valida boolean,
  empresa_id uuid,
  staff_id uuid,
  setor text,
  pode_operar boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select s.*, st.ativo as staff_ativo
  into v_row
  from public.restaurant_staff_sessions s
  join public.restaurant_staff st on st.id = s.staff_id and st.empresa_id = s.empresa_id
  where s.id = p_session_id
    and s.ativo = true
    and s.expires_at > now()
  limit 1;

  if v_row.id is null then
    return query select false, null::uuid, null::uuid, null::text, false;
    return;
  end if;

  return query select true, v_row.empresa_id, v_row.staff_id, v_row.setor,
    (p_setor is null or v_row.setor = p_setor or v_row.setor in ('gerente','admin'))::boolean;
end;
$$;

grant execute on function public.vf_restaurante_validar_staff_session(uuid,text) to anon, authenticated;
