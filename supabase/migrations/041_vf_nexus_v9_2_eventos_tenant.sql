-- VF Nexus V9.2 - Isolamento tenant para eventos e itens
alter table if exists public.evento_itens
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

update public.evento_itens ei
set empresa_id = e.empresa_id
from public.eventos e
where ei.evento_id = e.id
  and ei.empresa_id is null;

create index if not exists eventos_empresa_created_idx on public.eventos(empresa_id, created_at desc);
create index if not exists evento_itens_empresa_evento_idx on public.evento_itens(empresa_id, evento_id);

alter table if exists public.eventos enable row level security;
alter table if exists public.evento_itens enable row level security;

drop policy if exists eventos_tenant_select_v92 on public.eventos;
create policy eventos_tenant_select_v92 on public.eventos for select
using (public.vf_is_master() or public.vf_same_empresa(empresa_id));

drop policy if exists eventos_tenant_write_v92 on public.eventos;
create policy eventos_tenant_write_v92 on public.eventos for all
using (public.vf_is_master() or public.vf_same_empresa(empresa_id))
with check (public.vf_is_master() or public.vf_same_empresa(empresa_id));

drop policy if exists evento_itens_tenant_select_v92 on public.evento_itens;
create policy evento_itens_tenant_select_v92 on public.evento_itens for select
using (public.vf_is_master() or public.vf_same_empresa(empresa_id));

drop policy if exists evento_itens_tenant_write_v92 on public.evento_itens;
create policy evento_itens_tenant_write_v92 on public.evento_itens for all
using (public.vf_is_master() or public.vf_same_empresa(empresa_id))
with check (public.vf_is_master() or public.vf_same_empresa(empresa_id));
