create table if not exists public.local_service_category_keywords (
  keyword text primary key,
  category_slug text not null references public.founder_eligible_categories(slug) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.local_service_category_keywords to authenticated, anon;
grant all on public.local_service_category_keywords to service_role;
alter table public.local_service_category_keywords enable row level security;
drop policy if exists "keywords readable" on public.local_service_category_keywords;
create policy "keywords readable" on public.local_service_category_keywords for select using (true);

insert into public.local_service_category_keywords(keyword, category_slug) values
  ('ouverture piscine','ouverture-fermeture-piscine'),
  ('fermeture piscine','ouverture-fermeture-piscine'),
  ('fermeture de piscine','ouverture-fermeture-piscine'),
  ('ouverture de piscine','ouverture-fermeture-piscine'),
  ('hivernation piscine','ouverture-fermeture-piscine'),
  ('entretien piscine','entretien-piscine-spa'),
  ('entretien de piscine','entretien-piscine-spa'),
  ('piscine','entretien-piscine-spa'),
  ('spa','entretien-piscine-spa'),
  ('traitement eau piscine','entretien-piscine-spa'),
  ('lavage de vitres','lavage-de-vitres'),
  ('lavage vitres','lavage-de-vitres'),
  ('laveur de vitres','lavage-de-vitres'),
  ('nettoyage de vitres','lavage-de-vitres'),
  ('fenetres','lavage-de-vitres'),
  ('gouttiere','nettoyage-gouttieres'),
  ('gouttieres','nettoyage-gouttieres'),
  ('nettoyage de gouttieres','nettoyage-gouttieres'),
  ('lavage a pression','lavage-pression'),
  ('lavage pression','lavage-pression'),
  ('pression','lavage-pression'),
  ('entretien exterieur','lavage-pression'),
  ('nettoyage exterieur','lavage-pression'),
  ('abri tempo','abris-temporaires'),
  ('abris tempo','abris-temporaires'),
  ('tempo','abris-temporaires'),
  ('abri d auto','abris-temporaires'),
  ('abri auto','abris-temporaires'),
  ('abri temporaire','abris-temporaires'),
  ('abris temporaires','abris-temporaires'),
  ('nettoyage de tapis','nettoyage-tapis'),
  ('tapis','nettoyage-tapis'),
  ('carpette','nettoyage-tapis'),
  ('carpettes','nettoyage-tapis'),
  ('shampooing tapis','nettoyage-tapis'),
  ('mobilier','nettoyage-mobilier'),
  ('meubles rembourres','nettoyage-mobilier'),
  ('tissus d ameublement','nettoyage-mobilier'),
  ('sofa','nettoyage-mobilier'),
  ('divan','nettoyage-mobilier'),
  ('conduits','nettoyage-conduits'),
  ('conduit d air','nettoyage-conduits'),
  ('conduits d air','nettoyage-conduits'),
  ('secheuse','nettoyage-conduits'),
  ('echangeur d air','nettoyage-conduits'),
  ('entretien menager','entretien-menager'),
  ('menage','entretien-menager'),
  ('femme de menage','entretien-menager'),
  ('nettoyage residentiel','entretien-menager'),
  ('service de menage','entretien-menager'),
  ('grand menage','grand-menage'),
  ('menage en profondeur','grand-menage'),
  ('grand nettoyage','grand-menage'),
  ('extermination','gestion-parasitaire'),
  ('exterminateur','gestion-parasitaire'),
  ('gestion parasitaire','gestion-parasitaire'),
  ('parasites','gestion-parasitaire'),
  ('punaises','gestion-parasitaire'),
  ('fourmis','gestion-parasitaire'),
  ('souris','gestion-parasitaire'),
  ('gazon','entretien-gazon'),
  ('pelouse','entretien-gazon'),
  ('tonte','entretien-gazon'),
  ('entretien de pelouse','entretien-gazon'),
  ('entretien de gazon','entretien-gazon'),
  ('paysagement','entretien-paysager'),
  ('paysagiste','entretien-paysager'),
  ('amenagement paysager','entretien-paysager'),
  ('entretien paysager','entretien-paysager'),
  ('haie','entretien-paysager'),
  ('deneigement','deneigement'),
  ('deneiger','deneigement'),
  ('neige','deneigement'),
  ('souffleuse','deneigement'),
  ('planchers','nettoyage-planchers'),
  ('ceramique','nettoyage-planchers'),
  ('coulis','nettoyage-planchers'),
  ('nettoyage de planchers','nettoyage-planchers'),
  ('matelas','nettoyage-matelas'),
  ('nettoyage de matelas','nettoyage-matelas'),
  ('apres construction','nettoyage-apres-construction'),
  ('apres renovation','nettoyage-apres-construction'),
  ('nettoyage de chantier','nettoyage-apres-construction'),
  ('fin de chantier','nettoyage-apres-construction'),
  ('ramonage','ramonage-cheminee'),
  ('ramoneur','ramonage-cheminee'),
  ('cheminee','ramonage-cheminee'),
  ('homme a tout faire','homme-a-tout-faire'),
  ('petits travaux','homme-a-tout-faire'),
  ('handyman','homme-a-tout-faire'),
  ('bricoleur','homme-a-tout-faire'),
  ('demenagement','demenagement'),
  ('demenageur','demenagement'),
  ('transport de meubles','demenagement'),
  ('organisation','organisation-rangement'),
  ('rangement','organisation-rangement'),
  ('desencombrement','organisation-rangement'),
  ('entretien preventif','entretien-preventif-domicile'),
  ('maintenance residentielle','entretien-preventif-domicile'),
  ('services a la maison','entretien-preventif-domicile')
on conflict (keyword) do update set category_slug=excluded.category_slug;

create or replace function public.normalize_local_service_category(p_label text)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  with norm as (
    select lower(regexp_replace(
      translate(coalesce(p_label,''),
        'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
        'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'),
      '[^a-zA-Z0-9]+', ' ', 'g')) as t
  )
  select k.category_slug
  from public.local_service_category_keywords k, norm
  where trim(norm.t) <> '' and position(k.keyword in norm.t) > 0
  order by length(k.keyword) desc
  limit 1
$$;

create or replace function public.set_local_service_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.service_category_slug is null and new.category is not null then
    new.service_category_slug := public.normalize_local_service_category(new.category);
    if new.service_category_slug is not null then
      new.service_category_source := coalesce(new.service_category_source, 'inferred');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_local_service_category on public.verified_contractor_prospects;
create trigger trg_set_local_service_category
  before insert or update of category on public.verified_contractor_prospects
  for each row execute function public.set_local_service_category();

update public.verified_contractor_prospects p
set service_category_slug = public.normalize_local_service_category(p.category),
    service_category_source = 'inferred'
where p.service_category_slug is null
  and p.category is not null
  and public.normalize_local_service_category(p.category) is not null;