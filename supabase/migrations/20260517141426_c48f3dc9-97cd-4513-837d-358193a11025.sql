
alter table public.war_prospects drop constraint if exists war_prospects_category_check;
alter table public.war_prospects add constraint war_prospects_category_check
  check (category in (
    'toiture','asphalte','gazon','peinture',
    'isolation','plomberie','electricite','cvac',
    'fenestration','revetement','excavation','paysagement','renovation','general'
  ));
