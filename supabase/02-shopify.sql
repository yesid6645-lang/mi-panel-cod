-- Agrega la tabla de pedidos de Shopify (para proyectos creados antes de esta versión).
-- Supabase → SQL Editor → pega esto → Run.
create table if not exists shopify (
  id text primary key,
  tienda_id text not null references tiendas(id) on delete cascade,
  creado_en text,
  datos jsonb not null
);
alter table shopify enable row level security;
