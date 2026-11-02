-- =====================================================================
-- JASTAR HUB · миграция 001: таблицы, вспомогательные функции, RLS
-- Все изменения статусов, ролей и экспертизы проходят только через
-- серверные функции (002_rpc.sql). Пользователи читают данные по RLS.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- справочники ----------
create table if not exists public.regions (
  id text primary key,
  name text not null,
  city text not null,
  lat numeric(6,3),
  lon numeric(6,3),
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id text primary key,
  type text not null check (type in ('fund', 'portfolio', 'subsidiary')),
  parent_id text references public.organizations(id),
  name text not null,
  full_name text not null,
  region_id text references public.regions(id),
  sector text,
  young integer not null check (young > 0),
  about text,
  council jsonb not null default '{"chairId": null, "founded": null, "regionalReps": []}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint subsidiary_parent check (type <> 'subsidiary' or parent_id is not null)
);

-- ---------- пользователи ----------
-- id = auth.uid() для зарегистрированных; у тестовых профилей (is_demo) учётной записи нет
create table if not exists public.profiles (
  id text primary key,
  role text not null default 'member' check (role in ('admin', 'chair', 'regional', 'member', 'expert')),
  org_id text references public.organizations(id),
  region_id text references public.regions(id),
  council_role text not null default 'Участник',
  verified boolean not null default false,
  council_rejected boolean not null default false,
  blocked boolean not null default false,
  conflicts text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists profiles_org on public.profiles(org_id);

-- ---------- активности ----------
create table if not exists public.projects (
  id text primary key,
  org_id text not null references public.organizations(id),
  region_id text references public.regions(id),
  category text not null default 'other',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_review', 'needs_info', 'confirmed', 'rejected')),
  created_by text not null,
  leader_id text,
  team_ids text[] not null default '{}',
  end_date date,
  review jsonb,
  history jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_org on public.projects(org_id, status);

create table if not exists public.events (
  id text primary key,
  org_id text not null references public.organizations(id),
  region_id text references public.regions(id),
  category text not null default 'other',
  status text not null default 'planned' check (status in ('planned', 'draft', 'submitted', 'in_review', 'needs_info', 'confirmed', 'rejected')),
  created_by text not null,
  organizer_ids text[] not null default '{}',
  registered text[] not null default '{}',
  event_date date not null,
  review jsonb,
  history jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_org on public.events(org_id, status);

create table if not exists public.achievements (
  id text primary key,
  user_id text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_review', 'needs_info', 'confirmed', 'rejected')),
  ach_date date not null,
  review jsonb,
  history jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists achievements_user on public.achievements(user_id);

-- ---------- контент и служебные таблицы ----------
create table if not exists public.news (
  id text primary key,
  org_id text references public.organizations(id),
  author_id text,
  kind text not null default 'news',
  published boolean not null default true,
  news_date date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge (
  id text primary key,
  org_id text references public.organizations(id),
  author_id text,
  kind text not null default 'method',
  data jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.appeals (
  id text primary key default ('ap' || substr(md5(random()::text), 1, 10)),
  entity_type text not null,
  entity_id text not null,
  user_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  resolution text not null default '',
  ts timestamptz not null default now(),
  is_demo boolean not null default false
);

create table if not exists public.notifications (
  id bigserial primary key,
  user_id text not null,
  text text not null,
  link text not null default '',
  read boolean not null default false,
  actor_id text default (auth.uid())::text,
  ts timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications(user_id, ts desc);

create table if not exists public.audit_log (
  id bigserial primary key,
  ts timestamptz not null default now(),
  actor_id text default (auth.uid())::text,
  role text,
  action text not null,
  entity_type text,
  entity_id text,
  details text
);

create table if not exists public.rating_log (
  id bigserial primary key,
  ts timestamptz not null default now(),
  kind text not null check (kind in ('org', 'person')),
  subject_id text not null,
  score_from numeric(7,2),
  score_to numeric(7,2),
  rank_from integer,
  rank_to integer,
  reason text
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  w_company jsonb not null default '{"projects":25,"reach":20,"social":15,"prof":15,"inter":10,"innov":10,"info":5}'::jsonb,
  w_person jsonb not null default '{"contrib":30,"lead":20,"init":20,"volunteer":10,"inter":10,"prof":10}'::jsonb,
  info_cap integer not null default 12,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

-- журнал аудита только дополняется
create or replace function public.audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'Журнал аудита нельзя изменять или удалять'; end $$;
drop trigger if exists audit_no_change on public.audit_log;
create trigger audit_no_change before update or delete on public.audit_log for each row execute function public.audit_immutable();

-- =====================================================================
-- Вспомогательные функции
-- =====================================================================
create or replace function public.me() returns text language sql stable as $$ select (auth.uid())::text $$;

create or replace function public.my_role() returns text language sql stable security definer set search_path = public as
$$ select role from profiles where id = (auth.uid())::text and not blocked $$;

create or replace function public.my_org() returns text language sql stable security definer set search_path = public as
$$ select org_id from profiles where id = (auth.uid())::text $$;

create or replace function public.my_region() returns text language sql stable security definer set search_path = public as
$$ select region_id from profiles where id = (auth.uid())::text $$;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' and not blocked from profiles where id = (auth.uid())::text), false) $$;

create or replace function public.org_root(o text) returns text language sql stable security definer set search_path = public as
$$ select case when type = 'subsidiary' then parent_id else id end from organizations where id = o $$;

-- председатель портфельной компании управляет и её ДЗО; председатель ДЗО — только своим советом
create or replace function public.chair_of(o text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'chair' and (
    public.my_org() = o or (public.org_root(public.my_org()) = public.my_org() and public.org_root(o) = public.my_org())
  ), false) $$;

create or replace function public.regional_of(o text, r text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'regional' and r = public.my_region() and public.org_root(o) = public.org_root(public.my_org()), false) $$;

-- конфликт интересов: своя организация, её группа (кроме Фонда) и задекларированные организации
create or replace function public.has_conflict(expert text, o text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select bool_or(c = o or c = public.org_root(o)
      or (public.org_root(c) = public.org_root(o) and (select type from organizations where id = public.org_root(o)) <> 'fund'))
    from profiles p, unnest(p.conflicts || coalesce(array[p.org_id], '{}')) c
    where p.id = expert and c is not null), false) $$;

create or replace function public.expert_load(expert text) returns integer language sql stable security definer set search_path = public as $$
  select (select count(*) from projects where review->>'expertId' = expert and status in ('submitted', 'in_review'))::int
       + (select count(*) from events where review->>'expertId' = expert and status in ('submitted', 'in_review'))::int
       + (select count(*) from achievements where review->>'expertId' = expert and status in ('submitted', 'in_review'))::int $$;

create or replace function public.pick_expert(o text, excluded text[] default '{}') returns text language sql volatile security definer set search_path = public as $$
  select id from profiles
  where role = 'expert' and not blocked and not public.has_conflict(id, o) and not (id = any(excluded))
  order by public.expert_load(id), random() limit 1 $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.regions enable row level security;
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.events enable row level security;
alter table public.achievements enable row level security;
alter table public.news enable row level security;
alter table public.knowledge enable row level security;
alter table public.appeals enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;
alter table public.rating_log enable row level security;
alter table public.settings enable row level security;

-- открытые справочники и методика
create policy regions_read on public.regions for select using (true);
create policy regions_admin on public.regions for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy orgs_read on public.organizations for select using (true);
create policy orgs_admin on public.organizations for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy settings_read on public.settings for select using (true);
create policy settings_admin on public.settings for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy rating_log_read on public.rating_log for select using (true);
create policy rating_log_insert on public.rating_log for insert with check ((select public.my_role()) in ('expert', 'admin'));

-- профили: публичная карточка; изменения — через серверные функции; администратор — всё
create policy profiles_read on public.profiles for select using (true);
create policy profiles_admin on public.profiles for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- проекты: подтверждённые видят все; черновики — команда, председатель группы, назначенный эксперт, администратор
create policy projects_read on public.projects for select using (
  status = 'confirmed'
  or (select public.is_admin())
  or created_by = (select public.me()) or leader_id = (select public.me())
  or (select public.me()) = any(team_ids)
  or review->>'expertId' = (select public.me())
  or ((select public.my_role()) in ('chair', 'regional') and public.org_root(org_id) = public.org_root((select public.my_org())))
);
create policy projects_admin on public.projects for all using ((select public.is_admin())) with check ((select public.is_admin()));

create policy events_read on public.events for select using (
  status in ('planned', 'confirmed')
  or (select public.is_admin())
  or created_by = (select public.me()) or (select public.me()) = any(organizer_ids)
  or review->>'expertId' = (select public.me())
  or ((select public.my_role()) in ('chair', 'regional') and public.org_root(org_id) = public.org_root((select public.my_org())))
);
create policy events_admin on public.events for all using ((select public.is_admin())) with check ((select public.is_admin()));

create policy achievements_read on public.achievements for select using (
  status = 'confirmed'
  or user_id = (select public.me())
  or review->>'expertId' = (select public.me())
  or (select public.is_admin())
  or ((select public.my_role()) = 'chair' and public.chair_of((select org_id from public.profiles p where p.id = user_id)))
);
create policy achievements_admin on public.achievements for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- новости и база знаний
create policy news_read on public.news for select using (published or (select public.is_admin()));
create policy news_insert on public.news for insert with check ((select public.my_role()) in ('chair', 'regional', 'admin') and author_id = (select public.me()));
create policy news_admin on public.news for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy knowledge_read on public.knowledge for select using (true);
create policy knowledge_insert on public.knowledge for insert with check ((select public.my_role()) in ('chair', 'admin') and author_id = (select public.me()));
create policy knowledge_admin on public.knowledge for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- апелляции, уведомления, аудит
create policy appeals_read on public.appeals for select using (user_id = (select public.me()) or (select public.is_admin()));
create policy appeals_admin on public.appeals for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy notif_read on public.notifications for select using (user_id = (select public.me()));
create policy notif_update on public.notifications for update using (user_id = (select public.me())) with check (user_id = (select public.me()));
create policy notif_insert on public.notifications for insert with check ((select public.me()) is not null and actor_id = (select public.me()));
create policy audit_read on public.audit_log for select using ((select public.is_admin()));
create policy audit_insert on public.audit_log for insert with check ((select public.me()) is not null and actor_id = (select public.me()));
