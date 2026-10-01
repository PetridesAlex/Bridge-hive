-- Location images: private bucket + image_path + set_location_image_path RPC.

begin;

select plan(4);

select ok(
  exists (select 1 from storage.buckets where id = 'location-images'),
  'location-images bucket exists'
);

select is(
  (select public from storage.buckets where id = 'location-images'),
  false,
  'location-images bucket is private'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'locations'
      and column_name = 'image_path'
  ),
  'locations.image_path column exists'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_location_image_path'
      and p.prosecdef
  ),
  'set_location_image_path is security definer'
);

select * from finish();

rollback;
