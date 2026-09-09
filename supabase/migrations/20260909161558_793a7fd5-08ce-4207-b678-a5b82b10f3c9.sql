insert into public.founder_eligible_categories (slug, name_fr, group_type, internal_cap_per_city, is_active)
values ('debarras-ramassage', 'Débarras et ramassage d''encombrants', 'local_service', 10, true)
on conflict (slug) do update
  set name_fr = excluded.name_fr,
      group_type = excluded.group_type,
      internal_cap_per_city = excluded.internal_cap_per_city,
      is_active = true,
      updated_at = now();