-- Prepared bootstrap for a NEW CleanCity Supabase project only. Not executed here.
-- Inspect the target first. Run once with SQL Editor; no credentials in this file.
create table public.devices (
  id text primary key check (id ~ '^device-[A-Za-z0-9-]{1,48}$'),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  enabled boolean not null default false,
  last_seen timestamptz,
  last_boot text,
  last_seq bigint,
  last_batch timestamptz
);
create table public.physical_bins (
  id text primary key check (id ~ '^BIN-00[1-4]$'),
  label text not null,
  device_id text not null references public.devices(id),
  empty_cm double precision not null check (empty_cm <= 400),
  full_cm double precision not null check (full_cm >= 2 and full_cm < empty_cm)
);
create table public.sensor_readings (
  id bigint generated always as identity primary key,
  device_id text not null references public.devices(id),
  bin_id text not null references public.physical_bins(id),
  boot_id text not null,
  seq bigint not null check (seq >= 0),
  distance_cm double precision check (distance_cm between 2 and 400),
  fill_percent double precision check (fill_percent between 0 and 100),
  received_at timestamptz not null default clock_timestamp(),
  unique(device_id,boot_id,seq,bin_id)
);
create index sensor_readings_bin_time on public.sensor_readings(bin_id,received_at desc);
alter table public.devices enable row level security;
alter table public.physical_bins enable row level security;
alter table public.sensor_readings enable row level security;
revoke all on public.devices,public.physical_bins,public.sensor_readings from anon,authenticated;
grant all on public.devices,public.physical_bins,public.sensor_readings to service_role;
grant usage,select on sequence public.sensor_readings_id_seq to service_role;

create function public.ingest_readings(payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare d public.devices%rowtype; r jsonb; b public.physical_bins%rowtype; dist double precision; fill double precision; boot text; sequence_number bigint; stamp timestamptz := clock_timestamp();
begin
  select * into d from public.devices where id=payload->>'deviceId' and enabled for update;
  if not found then return jsonb_build_object('rejected',true,'reason','Unknown or disabled device'); end if;
  boot:=payload->>'bootId'; sequence_number:=(payload->>'seq')::bigint;
  if boot=d.last_boot and sequence_number=d.last_seq then return jsonb_build_object('duplicate',true,'receivedAt',d.last_seen);end if;
  if boot=d.last_boot and sequence_number<d.last_seq then return jsonb_build_object('rejected',true,'reason','Out of order sequence');end if;
  if exists(select 1 from public.sensor_readings where device_id=d.id and boot_id=boot and seq=sequence_number) then return jsonb_build_object('duplicate',true);end if;
  if d.last_batch is not null and stamp-d.last_batch<interval '2 seconds' then return jsonb_build_object('rateLimited',true);end if;
  if jsonb_array_length(payload->'readings') not between 1 and 4 then raise exception 'Invalid reading count';end if;
  for r in select * from jsonb_array_elements(payload->'readings') loop
    select * into b from public.physical_bins where id=r->>'binId' and device_id=d.id;
    if not found then raise exception 'Bin does not belong to device';end if;
    dist:=(r->>'distanceCm')::double precision;
    fill:=case when dist is null then null else greatest(0,least(100,(b.empty_cm-dist)/(b.empty_cm-b.full_cm)*100)) end;
    insert into public.sensor_readings(device_id,bin_id,boot_id,seq,distance_cm,fill_percent,received_at) values(d.id,b.id,boot,sequence_number,dist,fill,stamp);
  end loop;
  update public.devices set last_seen=stamp,last_batch=stamp,last_boot=boot,last_seq=sequence_number where id=d.id;
  return jsonb_build_object('stored',true,'receivedAt',stamp);
end; $$;
revoke all on function public.ingest_readings(jsonb) from public,anon,authenticated;
grant execute on function public.ingest_readings(jsonb) to service_role;

create function public.physical_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'label',b.label,'deviceId',b.device_id,'distanceCm',latest.distance_cm,'fillPercent',latest.fill_percent,'receivedAt',latest.received_at,'deviceLastSeen',d.last_seen,'history',coalesce(history.items,'[]'::jsonb)) order by b.id),'[]'::jsonb)
from public.physical_bins b join public.devices d on d.id=b.device_id
left join lateral(select * from public.sensor_readings s where s.bin_id=b.id order by s.received_at desc,s.id desc limit 1) latest on true
left join lateral(select jsonb_agg(jsonb_build_object('receivedAt',h.received_at,'fillPercent',h.fill_percent) order by h.received_at,h.id) items from(select * from public.sensor_readings s where s.bin_id=b.id order by s.received_at desc,s.id desc limit 30)h) history on true;
$$;
revoke all on function public.physical_snapshot() from public,anon,authenticated;
grant execute on function public.physical_snapshot() to service_role;
