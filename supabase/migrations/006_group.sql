-- =====================================================================
-- JASTAR HUB · миграция 006: группа компаний — активы, вакансии, ключевые контакты
--   organizations.profile — чем занимается организация, мощность, объекты, сайт,
--     численность персонала (правят председатель совета организации и администратор)
--   vacancies — подборка вакансий со ссылками на Qsamruk.kz
--     (добавляют председатели для своих организаций и администратор)
--   settings.people — ключевые контакты на странице «Контакты» (правит администратор;
--     пока поле пустое, сайт показывает контакты по умолчанию)
-- =====================================================================

alter table public.organizations add column if not exists profile jsonb not null default '{}'::jsonb;
alter table public.settings add column if not exists people jsonb;

-- Energy Solution Center — это Экибастузская ТЭЦ; ТОО «Семей Энерго», «Оскемен Энерго»
-- и «Кокшетауская ТЭЦ» строят новые ТЭЦ
update public.organizations set region_id = 'pav', sector = 'Теплоэнергетика (Экибастузская ТЭЦ)' where id = 'esc' and region_id = 'ast';
update public.organizations set sector = 'Строительство новой ТЭЦ' where id in ('semey', 'oskemen', 'ktec') and sector in ('Энергоснабжение', 'Теплоэнергетика');

-- профили по открытым данным samruk-energy.kz и СМИ (ссылка на источник — в поле src)
update public.organizations set profile = '{"kind":"center","what":"Корпоративный центр группы: управляет дочерними организациями, определяет стратегию развития, инвестиционные и финансовые решения группы. Входит в группу АО «Самрук-Қазына».","city":"г. Астана","address":"г. Астана, пр. Кабанбай батыра, 15А, блок Б","site":"samruk-energy.kz","src":"https://samruk-energy.kz/ru/company/group-of-companies/"}'::jsonb where id = 'se' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"holding","what":"Компания группы по гидро- и возобновляемой энергетике: модернизация действующих и строительство новых генерирующих мощностей, новые энергетические технологии. Создана 4 ноября 2022 года.","city":"г. Астана","share":"100% — АО «Самрук-Энерго»","since":"2022","objects":["Мойнакская ГЭС","Шардаринская ГЭС","Усть-Каменогорская ГЭС","Шульбинская ГЭС","Бухтарминская ГЭС","Samruk-Green Energy","ПВЭС"],"src":"https://samruk-energy.kz/en/company/group-of-companies/qgp-plc"}'::jsonb where id = 'qgp' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"res","holding":"qgp","what":"Первая ветровая электрическая станция: производит электроэнергию на 22 ветроустановках мощностью 2,05 МВт каждая. Введена в эксплуатацию в 2015 году.","city":"Район г. Ерейментау, Акмолинская область","mw":45,"objects":["ВЭС 45 МВт, 22 ветроустановки"],"since":"2015","site":"pves.kz","src":"https://samruk-energy.kz/en/company/group-of-companies/pves"}'::jsonb where id = 'pves' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"res","what":"Производство электроэнергии из возобновляемых источников: ветровая электростанция 50 МВт в районе Ерейментау с возможностью расширения до 300 МВт. Компания создана в 2011 году.","city":"Район г. Ерейментау, Акмолинская область","capText":"50 МВт","share":"100% — АО «Самрук-Энерго»","since":"2011","site":"ewp.kz","src":"https://samruk-energy.kz/en/company/group-of-companies/ewp"}'::jsonb where id = 'ewp' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"res","holding":"qgp","what":"Солнечные и ветровые электростанции в Алматинской области, проектирование и строительство объектов ВИЭ. Создана в 2012 году.","city":"г. Конаев, г. Алматы и Алматинская область","mw":8.6,"objects":["СЭС 2 МВт, г. Конаев (2013)","СЭС 416 кВт, район г. Конаев","СЭС 1 МВт, мкр. Алатау, г. Алматы","ВЭС 5 МВт, с. Нурлы, Енбекшиказахский район","Проект: СЭС 50 МВт в районе Капшагая"],"since":"2012","src":"https://samruk-energy.kz/en/company/group-of-companies/too-samruk-green-energy"}'::jsonb where id = 'sge' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"hydro","holding":"qgp","what":"Гидроэлектростанция на реке Сырдарья — последняя в каскаде перед Аральским морем. Идёт модернизация с ростом мощности до 126 МВт.","city":"г. Шардара, Туркестанская область","mw":100,"site":"sharges.kz","src":"https://samruk-energy.kz/en/company/group-of-companies/ao-shardarinskaya-ges"}'::jsonb where id = 'shges' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"hydro","holding":"qgp","what":"Мойнакская ГЭС имени У. Д. Кантаева: работает на полную мощность в утренние и вечерние пики энергосистемы, вырабатывает около 1 млрд кВт·ч в год. Запущена в 2012 году.","city":"р. Чарын, Алматинская область","mw":300,"since":"2012","src":"https://informburo.kz/stati/kak-rabotaet-moynakskaya-ges-obespechivayushchaya-energiey-pyatuyu-chast-almatinskoy-oblasti.html"}'::jsonb where id = 'mges' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"hydro","holding":"qgp","what":"ГЭС на реке Иртыш на северо-восточной окраине Усть-Каменогорска, среднемноголетняя выработка — 1,58 млрд кВт·ч. В периметре Qazaq Green Power с февраля 2025 года.","city":"г. Усть-Каменогорск, ВКО","mw":331.2,"src":"https://samruk-energy.kz/en/company/group-of-companies/ao-ust-kamenogorskaya-ges"}'::jsonb where id = 'ukges' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"hydro","holding":"qgp","what":"Вторая по мощности ГЭС Казахстана, на реке Иртыш; образует Бухтарминское водохранилище объёмом 49,6 млрд м³. Активы до конца 2028 года в концессии у ТОО «Казцинк». В периметре Qazaq Green Power с сентября 2025 года.","city":"г. Серебрянск, ВКО","mw":675,"site":"bges.kz","src":"https://en.orda.kz/samruq-energo-transfers-bukhtarma-hydroelectric-power-plant-to-subsidiary-qazaq-green-power-8754"}'::jsonb where id = 'bges' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"hydro","holding":"qgp","what":"Крупнейшая по установленной мощности ГЭС Казахстана, на реке Иртыш. В периметре Qazaq Green Power с февраля 2025 года.","city":"пос. Шульбинск, Абайская область","mw":702,"src":"https://kapital.kz/finance/134807/ust-kamenogorskuyu-i-shul-binskuyu-g-es-peredali-dochke-samruk-energo.html"}'::jsonb where id = 'shulges' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"grid","what":"Региональная электросетевая компания юга Казахстана: передача и распределение электроэнергии в г. Алматы и Алматинской области — от побережья Балхаша до границы с Китаем.","city":"г. Алматы и Алматинская область","objects":["209 подстанций 35 кВ и выше","6 762 трансформаторные подстанции 6–10/0,4 кВ","Около 30,6 тыс. км линий 0,4–220 кВ"],"site":"azhk.kz","src":"https://samruk-energy.kz/en/company/group-of-companies/ao-alatau-zharyk-kompaniyasy"}'::jsonb where id = 'azhk' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"grid","what":"Филиал АО «Алатау Жарык Компаниясы»: работа с потребителями — договоры энергоснабжения, расчёты и обслуживание абонентов.","city":"г. Алматы","check":true}'::jsonb where id = 'azhkes' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"thermal","what":"Производство электрической и тепловой энергии для г. Алматы и Алматинской области; естественная монополия по производству тепла.","city":"г. Алматы и Алматинская область","objects":["ТЭЦ-1","ТЭЦ-2","ТЭЦ-3","Капшагайская ГЭС","Каскад ГЭС","Западный тепловой комплекс","ПРП «Энергоремонт»"],"share":"100% — АО «Самрук-Энерго»","site":"ales.kz","src":"https://samruk-energy.kz/en/company/group-of-companies/ao-almatinskie-elektricheskie-stantsii"}'::jsonb where id = 'ales' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"thermal","what":"Крупнейшая электростанция Казахстана: конденсационная ГРЭС на экибастузском угле, 8 энергоблоков по 500 МВт.","city":"г. Экибастуз, Павлодарская область","mw":4000,"share":"100% — АО «Самрук-Энерго»","site":"gres1.kz","src":"https://samruk-energy.kz/en/company/group-of-companies/too-ekibastuzskaya-gres-1"}'::jsonb where id = 'egres' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"thermal","what":"Конденсационная электростанция на высокозольном экибастузском угле: 2 энергоблока по 500 МВт.","city":"Павлодарская область, район г. Экибастуза","mw":1000,"share":"50% — АО «Самрук-Энерго», 50% — АО «Самрук-Қазына»","site":"gres2.kz","src":"https://samruk-energy.kz/en/company/group-of-companies/ao-stantsiya-ekibastuzskaya-gres-2"}'::jsonb where id = 'egres2' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"thermal","what":"Экибастузская ТЭЦ — единственный поставщик централизованного тепла для жителей г. Экибастуза.","city":"г. Экибастуз, Павлодарская область","mw":12,"gcal":750,"objects":["Экибастузская ТЭЦ"],"share":"100%, в доверительном управлении АО «Самрук-Энерго»","site":"ekibastec.kz","src":"https://samruk-energy.kz/en/company/group-of-companies/too-energy-solutions-center"}'::jsonb where id = 'esc' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"service","what":"Общий центр обслуживания компаний группы: типовые учётные, кадровые и другие сервисные операции.","check":true}'::jsonb where id = 'escoco' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"project","what":"Строительство новой ТЭЦ в г. Семей. EPC-контракт подписан 30 января 2026 года, ввод — IV квартал 2029 года.","city":"г. Семей, Абайская область","check":true,"src":"https://www.zakon.kz/ekonomika-biznes/6513653-kogda-zavershitsya-stroitelstvo-trekh-novykh-tets-rasskazali-v-samrukenergo.html"}'::jsonb where id = 'semey' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"project","what":"Строительство новой ТЭЦ в г. Усть-Каменогорск. EPC-контракт подписан 30 января 2026 года, ввод — IV квартал 2029 года.","city":"г. Усть-Каменогорск, ВКО","check":true,"src":"https://www.zakon.kz/ekonomika-biznes/6513653-kogda-zavershitsya-stroitelstvo-trekh-novykh-tets-rasskazali-v-samrukenergo.html"}'::jsonb where id = 'oskemen' and profile = '{}'::jsonb;
update public.organizations set profile = '{"kind":"project","what":"Строительство новой ТЭЦ в г. Кокшетау по технологии «чистого угля». Ввод — I квартал 2029 года.","city":"г. Кокшетау, Акмолинская область","src":"https://kapital.kz/economic/143064/tec-v-kokshetau-stroyat-po-tehnologii-chistogo-uglya.html"}'::jsonb where id = 'ktec' and profile = '{}'::jsonb;

-- ---------- вакансии ----------
create table if not exists public.vacancies (
  id text primary key default ('vac' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  org_id text not null references public.organizations(id),
  title text not null check (length(title) between 3 and 150),
  city text not null default '',
  kind text not null default 'job' check (kind in ('job', 'intern', 'program')),
  url text not null check (url ~ '^https://\S+$'),
  deadline date,
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vacancies_org on public.vacancies(org_id);

alter table public.vacancies enable row level security;
-- открытые вакансии видят все, включая гостей; закрытые — администратор и председатель организации
create policy vacancies_read on public.vacancies for select using (status = 'open' or (select public.is_admin()) or (select public.chair_of(org_id)));
create policy vacancies_admin on public.vacancies for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- профиль организации ----------
create or replace function public.update_org_assets(o text, p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  cur jsonb; nxt jsonb; v_adm boolean := public.is_admin(); objs jsonb; v_site text; v_src text; v_kind text;
begin
  perform public._require(array['chair', 'admin']);
  if not (v_adm or public.chair_of(o)) then raise exception 'Профиль организации редактирует председатель её совета или администратор'; end if;
  select profile into cur from organizations where id = o;
  if not found then raise exception 'Организация не найдена'; end if;
  if length(trim(coalesce(p->>'what', ''))) < 10 then raise exception 'Опишите, чем занимается организация (от 10 знаков)'; end if;
  if (jsonb_typeof(p->'mw') = 'number' and (p->>'mw')::numeric < 0) or (jsonb_typeof(p->'gcal') = 'number' and (p->>'gcal')::numeric < 0)
     or (jsonb_typeof(p->'staff') = 'number' and (p->>'staff')::numeric < 0) then
    raise exception 'Числовые поля не могут быть отрицательными';
  end if;
  v_site := nullif(regexp_replace(regexp_replace(trim(coalesce(p->>'site', '')), '^https?://', '', 'i'), '/+$', ''), '');
  if v_site is not null and v_site !~* '^[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$' then raise exception 'Сайт укажите в виде example.kz'; end if;
  select coalesce(jsonb_agg(left(trim(x), 160)), '[]'::jsonb) into objs
  from (select jsonb_array_elements_text(case when jsonb_typeof(p->'objects') = 'array' then p->'objects' else '[]'::jsonb end) x limit 30) t
  where trim(x) <> '';
  if v_adm then
    v_kind := coalesce(nullif(p->>'kind', ''), cur->>'kind');
    v_src := nullif(trim(coalesce(p->>'src', '')), '');
    if v_src is not null and v_src !~ '^https://\S+$' then raise exception 'Ссылка на источник должна начинаться с https://'; end if;
  else
    v_kind := cur->>'kind'; v_src := cur->>'src';
  end if;
  if v_kind is not null and v_kind not in ('center', 'holding', 'thermal', 'hydro', 'res', 'grid', 'service', 'project') then raise exception 'Неизвестное направление'; end if;
  nxt := jsonb_build_object(
    'kind', v_kind,
    'what', left(trim(p->>'what'), 800),
    'city', nullif(left(trim(coalesce(p->>'city', '')), 160), ''),
    'address', nullif(left(trim(coalesce(p->>'address', '')), 200), ''),
    'mw', case when jsonb_typeof(p->'mw') = 'number' then p->'mw' end,
    'gcal', case when jsonb_typeof(p->'gcal') = 'number' then p->'gcal' end,
    'capText', nullif(left(trim(coalesce(p->>'capText', '')), 80), ''),
    'objects', case when jsonb_array_length(objs) > 0 then objs end,
    'staff', case when jsonb_typeof(p->'staff') = 'number' then to_jsonb(round((p->>'staff')::numeric)::int) end,
    'staffAsOf', case when coalesce(p->>'staffAsOf', '') ~ '^\d{4}-\d{2}-\d{2}$' then p->'staffAsOf' end,
    'site', v_site,
    'since', nullif(left(trim(coalesce(p->>'since', '')), 10), ''),
    'share', case when v_adm then nullif(left(trim(coalesce(p->>'share', '')), 160), '') else cur->>'share' end,
    'holding', case when v_adm then (case when p->>'holding' = 'qgp' then 'qgp' end) else cur->>'holding' end,
    'src', v_src,
    'check', case when coalesce((p->>'check')::boolean, false) then true end
  );
  update organizations set profile = jsonb_strip_nulls(nxt) where id = o;
  perform public._audit('Изменение профиля организации', 'org', o, (select name from organizations where id = o));
  return (select to_jsonb(x) from organizations x where id = o);
end $$;

-- ---------- вакансии: добавление, изменение, удаление ----------
create or replace function public.save_vacancy(v jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r vacancies; old vacancies; v_id text := nullif(v->>'id', ''); v_org text := v->>'orgId';
  v_title text := left(trim(coalesce(v->>'title', '')), 150); v_url text := trim(coalesce(v->>'url', ''));
  v_kind text := coalesce(nullif(v->>'kind', ''), 'job'); v_status text := coalesce(nullif(v->>'status', ''), 'open');
  v_deadline date;
begin
  perform public._require(array['chair', 'admin']);
  if not exists (select 1 from organizations where id = v_org) then raise exception 'Выберите организацию'; end if;
  if not (public.is_admin() or public.chair_of(v_org)) then raise exception 'Вакансии организации добавляет председатель её совета или администратор'; end if;
  if length(v_title) < 3 then raise exception 'Укажите должность'; end if;
  if v_url !~ '^https://\S+$' then raise exception 'Ссылка должна начинаться с https://'; end if;
  if v_kind not in ('job', 'intern', 'program') then raise exception 'Неизвестный тип вакансии'; end if;
  if v_status not in ('open', 'closed') then raise exception 'Неизвестный статус'; end if;
  begin v_deadline := nullif(v->>'deadline', '')::date; exception when others then raise exception 'Проверьте срок приёма заявок'; end;
  if v_id is not null then
    select * into old from vacancies where id = v_id;
    if not found then raise exception 'Вакансия не найдена'; end if;
    if not (public.is_admin() or public.chair_of(old.org_id)) then raise exception 'Нет прав на изменение этой вакансии'; end if;
    update vacancies set org_id = v_org, title = v_title, city = left(trim(coalesce(v->>'city', '')), 80), kind = v_kind, url = v_url,
      deadline = v_deadline, description = left(trim(coalesce(v->>'description', '')), 600), status = v_status, updated_at = now()
    where id = v_id returning * into r;
    perform public._audit(case when old.status <> v_status then case v_status when 'closed' then 'Закрытие вакансии' else 'Открытие вакансии' end else 'Изменение вакансии' end, 'vacancy', v_id, r.title);
  else
    insert into vacancies (org_id, title, city, kind, url, deadline, description, status, created_by)
    values (v_org, v_title, left(trim(coalesce(v->>'city', '')), 80), v_kind, v_url, v_deadline, left(trim(coalesce(v->>'description', '')), 600), v_status, public.me())
    returning * into r;
    perform public._audit('Добавление вакансии', 'vacancy', r.id, r.title);
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.delete_vacancy(vid text) returns void language plpgsql security definer set search_path = public as $$
declare old vacancies;
begin
  perform public._require(array['chair', 'admin']);
  select * into old from vacancies where id = vid;
  if not found then raise exception 'Вакансия не найдена'; end if;
  if not (public.is_admin() or public.chair_of(old.org_id)) then raise exception 'Нет прав на удаление этой вакансии'; end if;
  delete from vacancies where id = vid;
  perform public._audit('Удаление вакансии', 'vacancy', vid, old.title);
end $$;

-- ---------- удаление тестовых данных (с учётом вакансий) ----------
create or replace function public.purge_demo() returns jsonb language plpgsql security definer set search_path = public as $$
declare n_p int; n_e int; n_a int; n_u int;
begin
  perform public._require(array['admin']);
  delete from vacancies where is_demo;
  delete from feedback where is_demo or user_id in (select id from profiles where is_demo) or (target_type = 'user' and target_id in (select id from profiles where is_demo));
  delete from appeals where is_demo or entity_id in (select id from projects where is_demo union select id from events where is_demo union select id from achievements where is_demo);
  delete from projects where is_demo; get diagnostics n_p = row_count;
  delete from events where is_demo; get diagnostics n_e = row_count;
  delete from achievements where is_demo; get diagnostics n_a = row_count;
  delete from news where is_demo; delete from knowledge where is_demo;
  delete from notifications where user_id in (select id from profiles where is_demo);
  delete from profiles where is_demo; get diagnostics n_u = row_count;
  delete from rating_log where kind = 'person' and subject_id not in (select id from profiles);
  update organizations o set council = o.council || jsonb_build_object(
    'chairId', (select to_jsonb(p.id) from profiles p where p.id = o.council->>'chairId'),
    'regionalReps', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(o.council->'regionalReps', '[]'::jsonb)) x where exists (select 1 from profiles p where p.id = x)), '[]'::jsonb));
  perform public._audit('Удаление тестовых данных', 'settings', 'demo', format('проектов %s, мероприятий %s, достижений %s, профилей %s', n_p, n_e, n_a, n_u));
  return jsonb_build_object('projects', n_p, 'events', n_e, 'achievements', n_a, 'profiles', n_u);
end $$;

revoke execute on function public.update_org_assets(text, jsonb), public.save_vacancy(jsonb), public.delete_vacancy(text), public.purge_demo() from public, anon;
grant execute on function public.update_org_assets(text, jsonb), public.save_vacancy(jsonb), public.delete_vacancy(text), public.purge_demo() to authenticated;
