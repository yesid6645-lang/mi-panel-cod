-- CRM Service: tablas en Supabase. Pégalo completo en Supabase → SQL Editor → Run.
-- Cada fila guarda el objeto completo en `datos`; las otras columnas son para filtrar.

create table if not exists tiendas (
  id text primary key,
  datos jsonb not null
);

create table if not exists productos (
  id text primary key,
  tienda_id text not null references tiendas(id) on delete cascade,
  datos jsonb not null
);

create table if not exists pedidos (
  id text primary key,
  tienda_id text not null references tiendas(id) on delete cascade,
  creado_en text,
  datos jsonb not null
);
create index if not exists pedidos_tienda_fecha on pedidos (tienda_id, creado_en);

create table if not exists pauta (
  tienda_id text not null references tiendas(id) on delete cascade,
  fecha date not null,
  producto_id text not null,
  datos jsonb not null,
  primary key (tienda_id, fecha, producto_id)
);

create table if not exists shopify (
  id text primary key,
  tienda_id text not null references tiendas(id) on delete cascade,
  creado_en text,
  datos jsonb not null
);

create table if not exists gestiones (
  pedido_id text primary key,
  datos jsonb not null
);

create table if not exists ajustes (
  clave text primary key,
  datos jsonb not null
);

-- Seguridad: RLS activado y sin políticas = nadie puede leer ni escribir desde
-- el navegador. Solo el servidor del panel, con la clave service_role.
alter table tiendas enable row level security;
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table pauta enable row level security;
alter table gestiones enable row level security;
alter table shopify enable row level security;
alter table ajustes enable row level security;
