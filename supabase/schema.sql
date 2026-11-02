-- =====================================================================
-- JASTAR HUB — схема базы данных для Supabase (PostgreSQL 15+)
-- Единая цифровая платформа Молодёжных советов группы АО «Самрук-Қазына»
--
-- АРХИТЕКТУРА
--   Frontend : Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui, графики — Recharts
--   Backend  : Supabase — PostgreSQL, Auth (корпоративный e-mail / SSO), Storage, Edge Functions
--   Доступ   : RBAC через таблицу profiles.role + Row Level Security на каждой таблице
--   Рейтинги : функции company_scores() / person_scores() + журнал rating_log;
--              пересчёт при каждом решении эксперта и изменении весов (триггеры)
--   Файлы    : bucket "evidence" (доказательства, приватный), "avatars" и "media" (публичные превью)
--   Аудит    : append-only таблица audit_log, запись через триггеры, UPDATE/DELETE запрещены
--   i18n     : тексты интерфейса в next-intl (ru / kk / en); справочники имеют поля name_ru/name_kk/name_en
--
-- КЛЮЧЕВЫЕ ПОЛЬЗОВАТЕЛЬСКИЕ СЦЕНАРИИ
--   1. Регистрация → выбор компании и ДЗО → профиль и фото → заявка в Молодёжный совет
--      → председатель подтверждает членство (council_memberships.verified).
--   2. Участник создаёт проект / достижение → команда с долями вклада (сумма 100%) → KPI план/факт
--      → доказательства в Storage → отправка на проверку (status = 'submitted').
--   3. Система назначает эксперта без конфликта интересов → эксперт берёт в работу → оценивает
--      по 5 критериям, фиксирует подтверждённый охват и часы → подтверждает / запрашивает уточнения / отклоняет.
--   4. Подтверждение пересчитывает рейтинги, изменения пишутся в rating_log, участникам уходят уведомления.
--   5. Несогласие с решением → апелляция → администратор назначает повторную экспертизу другому эксперту.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- перечисления ----------
create type app_role       as enum ('admin', 'chair', 'regional', 'member', 'expert');
create type org_type       as enum ('fund', 'portfolio', 'subsidiary');
create type activity_status as enum ('draft', 'submitted', 'in_review', 'needs_info', 'confirmed', 'rejected', 'planned');
create type project_category as enum ('prof', 'social', 'sport', 'eco', 'innov', 'edu', 'culture', 'inter', 'charity', 'other');
create type achievement_type as enum ('volunteer', 'training', 'mentoring', 'award', 'sport', 'social');
create type council_role   as enum ('Председатель', 'Заместитель председателя', 'Секретарь', 'Региональный представитель', 'Член совета', 'Участник');
create type appeal_status  as enum ('open', 'accepted', 'declined');
create type media_kind     as enum ('photo', 'video', 'doc', 'presentation', 'cert', 'letter');

-- ---------- справочники и оргструктура ----------
create table regions (
  id          text primary key,
  name_ru     text not null, name_kk text, name_en text,
  center_city text not null,
  lat numeric(6,3), lon numeric(6,3)
);

-- Фонд → портфельные компании → ДЗО. Новые компании и регионы добавляются строками, без изменения схемы.
create table organizations (
  id            uuid primary key default gen_random_uuid(),
  type          org_type not null,
  parent_id     uuid references organizations(id),
  short_name    text not null,
  full_name     text not null,
  region_id     text references regions(id),
  sector        text,
  young_headcount integer not null check (young_headcount > 0),   -- численность молодёжи до 35 лет (для нормирования)
  about         text,
  council_founded smallint,
  created_at    timestamptz default now(),
  constraint subsidiary_has_parent check (type <> 'subsidiary' or parent_id is not null)
);
create index on organizations(parent_id);

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text unique not null,
  role        app_role not null default 'member',
  org_id      uuid references organizations(id),
  position    text, department text,
  region_id   text references regions(id), city text,
  start_year  smallint, bio text, education text, interests text,
  skills      text[] default '{}', sport text,
  avatar_path text,                                -- Storage: avatars/<uid>.jpg
  blocked     boolean default false,
  created_at  timestamptz default now()
);

create table council_memberships (
  user_id    uuid primary key references profiles(id) on delete cascade,
  org_id     uuid not null references organizations(id),
  council_role council_role not null default 'Участник',
  verified   boolean not null default false,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  rejected   boolean default false
);
create table regional_representatives (
  org_id uuid references organizations(id), user_id uuid references profiles(id), region_id text references regions(id),
  primary key (org_id, user_id)
);
create table expert_conflicts (                  -- декларация конфликта интересов
  expert_id uuid references profiles(id) on delete cascade,
  org_id    uuid references organizations(id),
  declared_at timestamptz default now(),
  primary key (expert_id, org_id)
);

-- ---------- проекты ----------
create table projects (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  org_id        uuid not null references organizations(id),          -- совет, реализующий проект (компания или ДЗО)
  region_id     text not null references regions(id),
  category      project_category not null,
  start_date    date not null, end_date date not null check (end_date >= start_date),
  leader_id     uuid not null references profiles(id),
  initiator_id  uuid not null references profiles(id),
  description   text, goal text, problem text, results text,
  participants  integer check (participants >= 0),
  reach_claimed integer check (reach_claimed >= 0),
  volunteer_hours_claimed integer default 0,
  effect_type   text check (effect_type in ('social', 'economic', 'both')),
  effect        text,
  external_partners text,
  status        activity_status not null default 'draft',
  created_by    uuid not null references profiles(id),
  created_at    timestamptz default now(),
  submitted_at  timestamptz
);
create index on projects(org_id, status);
create index on projects(end_date);
-- защита от двойного учёта: одна и та же активность одной организации не может быть активной дважды
create unique index projects_no_duplicates on projects (org_id, lower(title), start_date) where status not in ('draft', 'rejected');

create table project_team (
  project_id uuid references projects(id) on delete cascade,
  user_id    uuid references profiles(id),
  team_role  text,
  share_pct  smallint not null check (share_pct between 1 and 100),   -- личный вклад
  primary key (project_id, user_id)
);
create table project_partners (                 -- межкорпоративные проекты
  project_id uuid references projects(id) on delete cascade,
  org_id     uuid references organizations(id),
  primary key (project_id, org_id)
);
create table project_kpis (
  id serial primary key,
  project_id uuid references projects(id) on delete cascade,
  name text not null, unit text,
  plan numeric not null check (plan > 0), fact numeric not null check (fact >= 0)
);

-- ---------- мероприятия ----------
create table events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  org_id      uuid not null references organizations(id),
  region_id   text not null references regions(id),
  category    project_category not null,
  starts_at   timestamptz not null,
  place       text, description text,
  capacity    integer check (capacity > 0),
  attended_claimed integer,
  summary     text,
  status      activity_status not null default 'planned',
  created_by  uuid references profiles(id),
  created_at  timestamptz default now(),
  submitted_at timestamptz
);
create table event_organizers (event_id uuid references events(id) on delete cascade, user_id uuid references profiles(id), primary key (event_id, user_id));
create table event_registrations (
  event_id uuid references events(id) on delete cascade,
  user_id  uuid references profiles(id),
  registered_at timestamptz default now(),
  attended boolean,
  primary key (event_id, user_id)
);

-- ---------- личные достижения ----------
create table achievements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id),
  type       achievement_type not null,
  title      text not null,
  achieved_on date not null,
  hours_claimed integer default 0,
  issuer     text, description text,
  status     activity_status not null default 'draft',
  submitted_at timestamptz
);

-- ---------- файлы и доказательства (метаданные; сами файлы — в Supabase Storage) ----------
create table media (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references profiles(id),
  project_id   uuid references projects(id) on delete cascade,
  event_id     uuid references events(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  kind         media_kind not null,
  storage_path text not null,                     -- evidence/<entity>/<uuid>.<ext>
  file_name    text, size_bytes bigint, mime text,
  uploaded_at  timestamptz default now(),
  constraint one_parent check (num_nonnulls(project_id, event_id, achievement_id) <= 1)
);

-- ---------- экспертиза ----------
-- Полиморфная ссылка: ровно одна из сущностей. Каждая повторная экспертиза — новая строка (история сохраняется).
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  event_id    uuid references events(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  expert_id   uuid references profiles(id),
  assigned_at timestamptz default now(),
  taken_at    timestamptz,
  decided_at  timestamptz,
  decision    activity_status check (decision in ('confirmed', 'rejected', 'needs_info')),
  score_relevance numeric(3,1) check (score_relevance between 0 and 10),
  score_results   numeric(3,1) check (score_results between 0 and 10),
  score_evidence  numeric(3,1) check (score_evidence between 0 and 10),
  score_reach     numeric(3,1) check (score_reach between 0 and 10),
  score_kpi       numeric(3,1) check (score_kpi between 0 and 10),
  verified_reach  integer, verified_attended integer, verified_hours integer,
  comment     text,
  is_current  boolean default true,
  constraint one_entity check (num_nonnulls(project_id, event_id, achievement_id) = 1)
);
create index on reviews(expert_id) where is_current;

create table status_history (
  id bigserial primary key,
  entity_type text not null, entity_id uuid not null,
  actor_id uuid references profiles(id),
  from_status activity_status, to_status activity_status,
  note text, created_at timestamptz default now()
);
create table comments (
  id bigserial primary key, entity_type text not null, entity_id uuid not null,
  author_id uuid references profiles(id), body text not null, created_at timestamptz default now()
);
create table appeals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, entity_id uuid not null,
  applicant_id uuid references profiles(id),
  reason text not null check (length(reason) >= 15),
  status appeal_status default 'open',
  resolution text, resolved_by uuid references profiles(id), resolved_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- контент ----------
create table news (
  id uuid primary key default gen_random_uuid(),
  kind text check (kind in ('news', 'photo', 'video', 'announce', 'success', 'interview', 'story', 'practice')),
  org_id uuid references organizations(id), author_id uuid references profiles(id),
  title text not null, lead text, body text, cover_path text,
  published boolean default true, published_at timestamptz default now(), views integer default 0
);
create table knowledge_items (
  id uuid primary key default gen_random_uuid(),
  kind text check (kind in ('case', 'method', 'presentation', 'edu', 'howto', 'template', 'success')),
  org_id uuid references organizations(id), author_id uuid references profiles(id),
  title text not null, description text, content_md text, file_path text, tags text[], created_at timestamptz default now()
);
create table notifications (
  id bigserial primary key, user_id uuid references profiles(id) on delete cascade,
  body text not null, link text, read boolean default false, created_at timestamptz default now()
);

-- ---------- методика и история рейтинга ----------
create table rating_settings (
  id smallint primary key default 1 check (id = 1),
  w_company jsonb not null default '{"projects":25,"reach":20,"social":15,"prof":15,"inter":10,"innov":10,"info":5}',
  w_person  jsonb not null default '{"contrib":30,"lead":20,"init":20,"volunteer":10,"inter":10,"prof":10}',
  info_cap  smallint not null default 12,
  updated_by uuid references profiles(id), updated_at timestamptz default now()
);
create table rating_log (                        -- каждое изменение баллов и мест
  id bigserial primary key,
  subject_type text check (subject_type in ('org', 'person')),
  subject_id uuid not null,
  score_from numeric(6,2), score_to numeric(6,2),
  rank_from integer, rank_to integer,
  reason text, created_at timestamptz default now()
);

-- ---------- журнал аудита (только добавление) ----------
create table audit_log (
  id bigserial primary key,
  actor_id uuid, actor_role app_role,
  action text not null, entity_type text, entity_id text, details jsonb,
  ip inet, created_at timestamptz default now()
);
create rule audit_no_update as on update to audit_log do instead nothing;
create rule audit_no_delete as on delete to audit_log do instead nothing;

-- =====================================================================
-- ФУНКЦИИ-ПОМОЩНИКИ ДЛЯ RLS
-- =====================================================================
create or replace function my_role() returns app_role language sql stable security definer as
$$ select role from profiles where id = auth.uid() $$;
create or replace function is_admin() returns boolean language sql stable as $$ select my_role() = 'admin' $$;
create or replace function org_root(o uuid) returns uuid language sql stable as
$$ select case when type = 'subsidiary' then parent_id else id end from organizations where id = o $$;
create or replace function my_org() returns uuid language sql stable security definer as
$$ select org_id from profiles where id = auth.uid() $$;
-- председатель портфельной компании управляет и её ДЗО; председатель ДЗО — только своим советом
create or replace function is_chair_of(o uuid) returns boolean language sql stable as
$$ select my_role() = 'chair' and (my_org() = o or (org_root(my_org()) = my_org() and org_root(o) = my_org())) $$;
create or replace function expert_has_conflict(expert uuid, o uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from (
      select org_id from expert_conflicts where expert_id = expert
      union select org_id from profiles where id = expert and org_id is not null
    ) c where c.org_id = o or c.org_id = org_root(o) or (org_root(c.org_id) = org_root(o) and org_root(o) <> (select id from organizations where type = 'fund' limit 1))
  ) $$;

-- =====================================================================
-- БИЗНЕС-ПРАВИЛА (триггеры)
-- =====================================================================
-- 1) Перед отправкой на проверку: доли = 100%, есть KPI и документ-доказательство
create or replace function check_project_ready() returns trigger language plpgsql as $$
begin
  if new.status = 'submitted' and old.status in ('draft', 'needs_info') then
    if (select coalesce(sum(share_pct), 0) from project_team where project_id = new.id) <> 100 then
      raise exception 'Сумма долей вклада команды должна быть 100%%';
    end if;
    if not exists (select 1 from project_kpis where project_id = new.id) then
      raise exception 'Нужен хотя бы один измеримый KPI';
    end if;
    if not exists (select 1 from media where project_id = new.id and kind <> 'photo') then
      raise exception 'Нужен документ, подтверждающий результаты';
    end if;
    new.submitted_at := now();
  end if;
  return new;
end $$;
create trigger trg_project_ready before update of status on projects for each row execute function check_project_ready();

-- 2) Эксперт не может быть назначен при конфликте интересов
create or replace function check_review_conflict() returns trigger language plpgsql as $$
declare o uuid;
begin
  select coalesce(p.org_id, e.org_id, pr.org_id) into o
  from (select new.project_id pid, new.event_id eid, new.achievement_id aid) x
  left join projects p on p.id = x.pid
  left join events e on e.id = x.eid
  left join achievements a on a.id = x.aid left join profiles pr on pr.id = a.user_id;
  if new.expert_id is not null and expert_has_conflict(new.expert_id, o) then
    raise exception 'Конфликт интересов: эксперт не может проверять эту организацию';
  end if;
  return new;
end $$;
create trigger trg_review_conflict before insert or update of expert_id on reviews for each row execute function check_review_conflict();

-- 3) Подтверждённые значения не могут превышать заявленные
create or replace function check_verified_values() returns trigger language plpgsql as $$
begin
  if new.project_id is not null and new.verified_reach > (select reach_claimed from projects where id = new.project_id) then
    raise exception 'Подтверждённый охват больше заявленного';
  end if;
  if new.event_id is not null and new.verified_attended > (select attended_claimed from events where id = new.event_id) then
    raise exception 'Подтверждённое число участников больше заявленного';
  end if;
  return new;
end $$;
create trigger trg_verified_values before insert or update on reviews for each row execute function check_verified_values();

-- 4) Универсальный аудит изменений
create or replace function write_audit() returns trigger language plpgsql security definer as $$
begin
  insert into audit_log(actor_id, actor_role, action, entity_type, entity_id, details)
  values (auth.uid(), my_role(), tg_op, tg_table_name, coalesce(new.id, old.id)::text,
          jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  return coalesce(new, old);
end $$;
create trigger audit_projects after insert or update or delete on projects for each row execute function write_audit();
create trigger audit_events   after insert or update or delete on events   for each row execute function write_audit();
create trigger audit_reviews  after insert or update on reviews for each row execute function write_audit();
create trigger audit_appeals  after insert or update on appeals for each row execute function write_audit();
create trigger audit_settings after update on rating_settings for each row execute function write_audit();
create trigger audit_profiles after update of role, blocked on profiles for each row execute function write_audit();

-- =====================================================================
-- РАСЧЁТ РЕЙТИНГА МОЛОДЁЖНЫХ СОВЕТОВ (те же формулы, что в демо)
--   качество проекта q = средний балл эксперта × (0,5 + 0,5 × min(1, выполнение KPI, максимум 120%))
--   нормирование: сумма q / √(max(численность, 30) / 100); вовлечённость = 1 − e^(−охват / численность)
--   каждая компонента масштабируется к 100 по лучшему значению периода; итог — взвешенная сумма
-- =====================================================================
create or replace view project_quality as
select p.id, p.org_id, p.category, p.end_date, p.region_id,
       ((r.score_relevance + r.score_results + r.score_evidence + r.score_reach + r.score_kpi) / 5.0)
       * (0.5 + 0.5 * least(1, coalesce((select avg(least(k.fact / k.plan, 1.2)) from project_kpis k where k.project_id = p.id), 0.5))) as q,
       coalesce(r.verified_reach, p.reach_claimed) as reach,
       coalesce(r.verified_hours, p.volunteer_hours_claimed, 0) as hours,
       exists (select 1 from project_partners pp where pp.project_id = p.id) or p.category = 'inter' as is_inter
from projects p join reviews r on r.project_id = p.id and r.is_current and r.decision = 'confirmed'
where p.status = 'confirmed';

create or replace function company_scores(p_from date default null, p_to date default null)
returns table (org_id uuid, total numeric, engagement numeric, projects bigint, rank bigint)
language sql stable as $$
  with w as (select w_company c from rating_settings where id = 1),
  base as (
    select o.id, o.young_headcount size, sqrt(greatest(o.young_headcount, 30) / 100.0) s,
           coalesce(sum(pq.q), 0) q,
           coalesce(sum(pq.q) filter (where pq.category in ('social', 'charity', 'eco')), 0) qs,
           coalesce(sum(pq.q) filter (where pq.category in ('prof', 'edu')), 0) qp,
           coalesce(sum(pq.q) filter (where pq.category = 'innov'), 0) qi,
           coalesce(sum(pq.reach), 0) reach,
           coalesce(sum(pq.hours) filter (where pq.category in ('social', 'charity', 'eco')), 0) hours,
           count(pq.id) filter (where pq.is_inter) inter,
           count(pq.id) n
    from organizations o
    left join project_quality pq on pq.org_id = o.id
         and (p_from is null or pq.end_date >= p_from) and (p_to is null or pq.end_date <= p_to)
    group by o.id
  ),
  raw as (
    select id, q / s c_projects, (1 - exp(-reach / size::numeric)) * 100 c_reach,
           qs / s + hours / size::numeric * 10 c_social, qp / s c_prof, inter / s c_inter, qi / s c_innov, n,
           (1 - exp(-reach / size::numeric)) * 100 eng
    from base
  ),
  mx as (select max(c_projects) mp, max(c_reach) mr, max(c_social) ms, max(c_prof) mf, max(c_inter) mi, max(c_innov) mn from raw),
  scored as (
  select r.id,
    round((coalesce(r.c_projects / nullif(mx.mp, 0), 0) * (w.c->>'projects')::numeric
         + coalesce(r.c_reach    / nullif(mx.mr, 0), 0) * (w.c->>'reach')::numeric
         + coalesce(r.c_social   / nullif(mx.ms, 0), 0) * (w.c->>'social')::numeric
         + coalesce(r.c_prof     / nullif(mx.mf, 0), 0) * (w.c->>'prof')::numeric
         + coalesce(r.c_inter    / nullif(mx.mi, 0), 0) * (w.c->>'inter')::numeric
         + coalesce(r.c_innov    / nullif(mx.mn, 0), 0) * (w.c->>'innov')::numeric), 2) as total,
    round(r.eng, 1) as engagement, r.n
  from raw r, mx, w)
  select id, total, engagement, n, rank() over (order by total desc) from scored;
  -- примечание: информационная активность (news, не более info_cap за период) добавляется аналогично;
  -- для продакшена функция переносится в Edge Function с кэшем в таблице rating_snapshots
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles            enable row level security;
alter table council_memberships enable row level security;
alter table projects            enable row level security;
alter table project_team        enable row level security;
alter table events              enable row level security;
alter table achievements        enable row level security;
alter table reviews             enable row level security;
alter table media               enable row level security;
alter table appeals             enable row level security;
alter table notifications       enable row level security;
alter table audit_log           enable row level security;
alter table rating_settings     enable row level security;
alter table expert_conflicts    enable row level security;

-- Профили: открытая карточка видна всем; редактирует владелец; роль меняет только администратор
create policy profiles_read on profiles for select using (true);
create policy profiles_self_update on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy profiles_admin on profiles for all using (is_admin());

-- Членство: председатель подтверждает участников своего совета
create policy cm_read on council_memberships for select using (true);
create policy cm_self_insert on council_memberships for insert with check (user_id = auth.uid() and verified = false);
create policy cm_chair_update on council_memberships for update using (is_chair_of(org_id) or is_admin());

-- Проекты: гости и все пользователи видят подтверждённые; черновики — команда, председатель, эксперт, администратор
create policy projects_public on projects for select using (status = 'confirmed');
create policy projects_team on projects for select using (
  created_by = auth.uid() or leader_id = auth.uid()
  or exists (select 1 from project_team t where t.project_id = id and t.user_id = auth.uid())
  or is_chair_of(org_id) or is_admin()
  or exists (select 1 from reviews r where r.project_id = id and r.expert_id = auth.uid()));
create policy projects_create on projects for insert with check (created_by = auth.uid() and my_role() in ('member', 'chair', 'regional', 'admin'));
create policy projects_edit on projects for update using (
  is_admin() or (status in ('draft', 'needs_info') and (created_by = auth.uid() or leader_id = auth.uid() or is_chair_of(org_id))));
-- статус 'confirmed' / 'rejected' выставляет только эксперт через функцию decide_review() (security definer)

-- Мероприятия: председатели и региональные председатели (своего региона) создают; запланированные видны всем
create policy events_public on events for select using (status in ('planned', 'confirmed'));
create policy events_create on events for insert with check (
  is_admin() or is_chair_of(org_id)
  or (my_role() = 'regional' and region_id = (select region_id from profiles where id = auth.uid())));

-- Экспертиза: эксперт видит только назначенные ему заявки
create policy reviews_expert on reviews for select using (expert_id = auth.uid() or is_admin());
create policy reviews_public_confirmed on reviews for select using (decision = 'confirmed');
create policy reviews_expert_update on reviews for update using (expert_id = auth.uid() and decided_at is null);
create policy conflicts_own on expert_conflicts for all using (expert_id = auth.uid() or is_admin());

-- Файлы-доказательства: владелец, команда, назначенный эксперт, администратор
create policy media_read on media for select using (
  owner_id = auth.uid() or is_admin()
  or exists (select 1 from reviews r where r.expert_id = auth.uid() and (r.project_id = media.project_id or r.event_id = media.event_id or r.achievement_id = media.achievement_id))
  or exists (select 1 from projects p where p.id = media.project_id and p.status = 'confirmed'));
create policy media_insert on media for insert with check (owner_id = auth.uid());

create policy appeals_own on appeals for select using (applicant_id = auth.uid() or is_admin());
create policy appeals_create on appeals for insert with check (applicant_id = auth.uid());
create policy appeals_admin on appeals for update using (is_admin());
create policy notif_own on notifications for all using (user_id = auth.uid());
create policy audit_admin_read on audit_log for select using (is_admin());
create policy settings_read on rating_settings for select using (true);
create policy settings_admin on rating_settings for update using (is_admin());

-- =====================================================================
-- STORAGE (выполнить в Supabase Dashboard → Storage)
--   bucket evidence (private): путь evidence/<entity_type>/<entity_id>/<uuid>.<ext>, лимит 15 МБ, видео 40 МБ
--   bucket avatars  (public) : avatars/<user_id>.jpg, сжатие на клиенте до 400 px
--   bucket media    (public) : обложки новостей и фото подтверждённых проектов
-- =====================================================================
insert into rating_settings (id) values (1) on conflict do nothing;
