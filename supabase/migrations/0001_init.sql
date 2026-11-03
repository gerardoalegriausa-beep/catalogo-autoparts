-- Esquema inicial del catálogo de repuestos Volvo.
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run.

create extension if not exists pgcrypto;

-- Modelos y categorías -------------------------------------------------------

create table vehicle_models (
  id text primary key,                  -- 'xc40', 'xc60', 'xc90', 's60', 's90'
  name text not null,
  body_type text not null,
  sort int not null default 0
);

create table categories (
  id text primary key,                  -- 'sensores-electronica', ...
  name text not null,
  description text not null default '',
  sort int not null default 0
);

insert into vehicle_models (id, name, body_type, sort) values
  ('xc40', 'XC40', 'SUV', 1),
  ('xc60', 'XC60', 'SUV', 2),
  ('xc90', 'XC90', 'SUV', 3),
  ('s60', 'S60', 'Sedán', 4),
  ('s90', 'S90', 'Sedán', 5);

insert into categories (id, name, description, sort) values
  ('sensores-electronica', 'Sensores y electrónica', 'Sensores de presión de combustible, ABS y módulos de gestión.', 1),
  ('motor-refrigeracion', 'Motor y refrigeración', 'Bombas de agua, kits de distribución y fajas de accesorios.', 2),
  ('frenos', 'Frenos', 'Discos y pastillas de medidas grandes para SUV y sedán.', 3),
  ('iluminacion', 'Faros y carrocería', 'Faros LED delanteros y posteriores.', 4);

-- Piezas ---------------------------------------------------------------------

create table parts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category_id text not null references categories(id),
  oem_part_number text,
  brand text not null,
  condition text not null default 'nuevo' check (condition in ('nuevo', 'reconstruido', 'usado')),
  supplier text,
  supplier_cost_usd numeric(10,2) not null check (supplier_cost_usd >= 0),
  margin_pct numeric(5,2),              -- vacío = margen por defecto
  us_shipping_usd numeric(10,2) not null default 0,
  weight_kg numeric(8,2) not null default 1,
  length_cm numeric(8,1) not null default 20,
  width_cm numeric(8,1) not null default 20,
  height_cm numeric(8,1) not null default 10,
  duty_pct numeric(5,2),                -- vacío = arancel por defecto
  high_risk boolean not null default false,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index parts_category_idx on parts (category_id) where active;

create table part_fitments (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  model_id text not null references vehicle_models(id),
  year_from int not null,
  year_to int,                          -- vacío = hasta la fecha
  engine text,                          -- código de motor, p. ej. 'B4204T'; vacío = cualquiera
  notes text,
  check (year_to is null or year_to >= year_from)
);

create index part_fitments_part_idx on part_fitments (part_id);
create index part_fitments_model_idx on part_fitments (model_id, year_from);

-- Pedidos --------------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  tracking_token text not null unique,
  status text not null default 'recibido' check (status in
    ('recibido', 'vin_verificado', 'comprado_usa', 'en_miami', 'en_aduanas', 'entregado', 'cancelado')),
  shop_name text not null,
  shop_ruc text,
  contact_name text not null,
  phone text not null,
  email text,
  vin text not null check (length(vin) = 17),
  vin_decoded jsonb,
  vin_warnings text[] not null default '{}',
  fitment jsonb not null,
  old_part_number text,
  quantity int not null default 1 check (quantity > 0),
  part_id uuid references parts(id) on delete set null,
  part_name text not null,
  part_number text,
  price_breakdown jsonb not null,
  total_usd numeric(10,2) not null,
  customer_notes text,
  admin_notes text,
  estimated_delivery date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_idx on orders (status, created_at desc);

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index order_events_order_idx on order_events (order_id, created_at);

-- Cada pedido nuevo registra su primer hito.
create function orders_first_event() returns trigger language plpgsql as $$
begin
  insert into order_events (order_id, status) values (new.id, new.status);
  return new;
end $$;

create trigger orders_first_event after insert on orders
  for each row execute function orders_first_event();

-- Cambio de estado + registro del hito en una sola operación.
create function set_order_status(p_order_id uuid, p_status text, p_note text, p_estimated_delivery date)
returns void language plpgsql as $$
begin
  update orders
     set status = p_status, estimated_delivery = p_estimated_delivery, updated_at = now()
   where id = p_order_id;
  if not found then
    raise exception 'Pedido % no encontrado', p_order_id;
  end if;
  insert into order_events (order_id, status, note) values (p_order_id, p_status, p_note);
end $$;

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger parts_touch before update on parts
  for each row execute function touch_updated_at();

-- Seguridad (RLS) ------------------------------------------------------------
-- El catálogo es de lectura pública. Los pedidos solo los lee y escribe el
-- servidor con la clave service_role, que salta RLS; sin políticas públicas,
-- nadie puede leerlos con la clave anónima.

alter table vehicle_models enable row level security;
alter table categories enable row level security;
alter table parts enable row level security;
alter table part_fitments enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;

create policy "catálogo público: modelos" on vehicle_models for select using (true);
create policy "catálogo público: categorías" on categories for select using (true);
create policy "catálogo público: piezas activas" on parts for select using (active);
create policy "catálogo público: compatibilidades" on part_fitments for select using (
  exists (select 1 from parts p where p.id = part_id and p.active)
);

revoke execute on function set_order_status(uuid, text, text, date) from public, anon, authenticated;
