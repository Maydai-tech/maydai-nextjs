-- Plusieurs alias EcoLogits (dated / latest) peuvent pointer vers une même fiche MaydAI.
alter table public.ecologits_model_links
  drop constraint if exists ecologits_model_links_maydai_model_id_key;

create index if not exists ecologits_model_links_maydai_model_id_idx
  on public.ecologits_model_links (maydai_model_id);

comment on column public.ecologits_model_links.maydai_model_id is
  'Fiche canonique MaydAI. Plusieurs lignes EcoLogits peuvent partager le même model_id.';
