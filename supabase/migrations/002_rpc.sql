-- =====================================================================
-- JASTAR HUB · миграция 002: серверные функции (единственный путь изменений)
-- Каждая функция проверяет роль вызывающего, пишет историю и журнал аудита.
-- =====================================================================

-- ---------- внутренние помощники (недоступны из API) ----------
create or replace function public._tbl(kind text) returns text language sql immutable as $$
  select case kind when 'project' then 'projects' when 'event' then 'events' when 'achievement' then 'achievements' end $$;

create or replace function public._row(kind text, eid text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if public._tbl(kind) is null then raise exception 'Неизвестный тип активности'; end if;
  execute format('select to_jsonb(t) from public.%I t where id = $1', public._tbl(kind)) into r using eid;
  if r is null then raise exception 'Запись не найдена'; end if;
  return r;
end $$;

create or replace function public._entity_org(kind text, r jsonb) returns text language sql stable security definer set search_path = public as $$
  select case when kind = 'achievement' then (select org_id from profiles where id = r->>'user_id') else r->>'org_id' end $$;

create or replace function public._owners(kind text, r jsonb) returns text[] language sql stable as $$
  select coalesce(array(select distinct x from unnest(case kind
    when 'project' then array[r->>'created_by', r->>'leader_id']
    when 'event' then array[r->>'created_by'] || coalesce((select array_agg(y) from jsonb_array_elements_text(r->'organizer_ids') y), '{}')
    else array[r->>'user_id'] end) x where x is not null), '{}') $$;

create or replace function public._link(kind text, r jsonb) returns text language sql immutable as $$
  select case kind when 'project' then '#project-' || (r->>'id') when 'event' then '#event-' || (r->>'id') else '#person-' || (r->>'user_id') end $$;

create or replace function public._name(uid text) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select data->>'name' from profiles where id = uid), '') $$;

create or replace function public._can_edit(kind text, r jsonb) returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_me text := public.me(); v_org text := public._entity_org(kind, r);
begin
  if v_me is null or public.my_role() is null then return false; end if;
  if public.is_admin() then return true; end if;
  if (r->>'status') not in ('draft', 'needs_info', 'planned') then return false; end if;
  if v_me = any(public._owners(kind, r)) then return true; end if;
  if kind <> 'achievement' and (public.chair_of(v_org) or public.regional_of(v_org, r->>'region_id')) then return true; end if;
  return false;
end $$;

create or replace function public._hist(kind text, eid text, action text, note text default null, actor text default null) returns void language plpgsql security definer set search_path = public as $$
begin
  execute format('update public.%I set history = history || $1, updated_at = now() where id = $2', public._tbl(kind))
  using jsonb_strip_nulls(jsonb_build_object('ts', now(), 'actorId', coalesce(actor, public.me(), 'system'), 'action', action, 'note', note)), eid;
end $$;

create or replace function public._notify(uid text, txt text, lnk text default '') returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, text, link, actor_id) select uid, txt, coalesce(lnk, ''), public.me() where uid is not null $$;

create or replace function public._audit(act text, etype text, eid text, det text default '') returns void language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, role, action, entity_type, entity_id, details) values (public.me(), public.my_role(), act, etype, eid, coalesce(det, '')) $$;

create or replace function public._require(roles text[]) returns text language plpgsql stable security definer set search_path = public as $$
declare r text := public.my_role();
begin
  if public.me() is null then raise exception 'Войдите в систему'; end if;
  if r is null then raise exception 'Профиль не найден или заблокирован'; end if;
  if not (r = any(roles)) then raise exception 'Недостаточно прав для этого действия'; end if;
  return r;
end $$;

-- ---------- сохранение черновиков ----------
create or replace function public.save_project(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me text := public.me(); v_id text := p->>'id'; r jsonb; v_team text[]; v_data jsonb;
begin
  perform public._require(array['member', 'chair', 'regional', 'admin']);
  if coalesce(trim(p->>'title'), '') = '' then raise exception 'Укажите название проекта'; end if;
  if not exists (select 1 from organizations where id = p->>'orgId') then raise exception 'Организация не найдена'; end if;
  if v_id is null or v_id !~ '^p[a-z0-9]{3,30}$' then raise exception 'Некорректный идентификатор проекта'; end if;
  select coalesce(array_agg(distinct t->>'userId'), '{}') into v_team from jsonb_array_elements(coalesce(p->'team', '[]'::jsonb)) t;
  v_data := p - array['id', 'status', 'review', 'history', 'comments', 'createdBy', 'submittedAt', 'demo', 'companyId'];
  select to_jsonb(t) into r from projects t where id = v_id;
  if r is not null then
    if not public._can_edit('project', r) then raise exception 'Редактирование закрыто: проект на проверке, подтверждён или у вас нет прав'; end if;
    update projects set org_id = p->>'orgId', region_id = nullif(p->>'regionId', ''), category = coalesce(p->>'category', 'other'),
      leader_id = p->>'leaderId', team_ids = v_team, end_date = nullif(p->>'end', '')::date, data = v_data, updated_at = now(),
      history = history || jsonb_build_object('ts', now(), 'actorId', v_me, 'action', 'Внесены изменения')
    where id = v_id;
    perform public._audit('Изменение проекта', 'project', v_id, p->>'title');
  else
    insert into projects (id, org_id, region_id, category, status, created_by, leader_id, team_ids, end_date, data, history)
    values (v_id, p->>'orgId', nullif(p->>'regionId', ''), coalesce(p->>'category', 'other'), 'draft', v_me, p->>'leaderId', v_team,
      nullif(p->>'end', '')::date, v_data, jsonb_build_array(jsonb_build_object('ts', now(), 'actorId', v_me, 'action', 'Создан черновик')));
    perform public._audit('Создание проекта', 'project', v_id, p->>'title');
    perform public._notify(u, 'Вас отметили в команде проекта «' || (p->>'title') || '»', '#project-' || v_id) from unnest(v_team) u where u <> v_me;
  end if;
  return public._row('project', v_id);
end $$;

create or replace function public.save_event(e jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me text := public.me(); v_id text := e->>'id'; v_org text := e->>'orgId'; v_reg text := nullif(e->>'regionId', ''); r jsonb; v_orgs text[]; v_data jsonb;
begin
  perform public._require(array['member', 'chair', 'regional', 'admin']);
  if coalesce(trim(e->>'title'), '') = '' or nullif(e->>'date', '') is null then raise exception 'Укажите название и дату'; end if;
  if not exists (select 1 from organizations where id = v_org) then raise exception 'Организация не найдена'; end if;
  if v_id is null or v_id !~ '^e[a-z0-9]{3,30}$' then raise exception 'Некорректный идентификатор мероприятия'; end if;
  select coalesce(array_agg(distinct x), '{}') into v_orgs from jsonb_array_elements_text(coalesce(e->'organizers', '[]'::jsonb)) x;
  v_data := e - array['id', 'status', 'review', 'history', 'registered', 'createdBy', 'submittedAt', 'demo', 'organizers'];
  select to_jsonb(t) into r from events t where id = v_id;
  if r is not null then
    if not public._can_edit('event', r) then raise exception 'Редактирование закрыто: мероприятие на проверке или у вас нет прав'; end if;
    update events set org_id = v_org, region_id = v_reg, category = coalesce(e->>'category', 'other'), organizer_ids = v_orgs,
      event_date = (e->>'date')::date, data = v_data, updated_at = now(),
      history = history || jsonb_build_object('ts', now(), 'actorId', v_me, 'action', 'Внесены изменения')
    where id = v_id;
    perform public._audit('Изменение мероприятия', 'event', v_id, e->>'title');
  else
    if not (public.is_admin() or public.chair_of(v_org) or public.regional_of(v_org, v_reg)) then
      raise exception 'Мероприятия добавляют председатель совета этой организации, региональный председатель своего региона или администратор';
    end if;
    if not (v_me = any(v_orgs)) then v_orgs := v_orgs || v_me; end if;
    insert into events (id, org_id, region_id, category, status, created_by, organizer_ids, event_date, data, history)
    values (v_id, v_org, v_reg, coalesce(e->>'category', 'other'), 'planned', v_me, v_orgs, (e->>'date')::date, v_data,
      jsonb_build_array(jsonb_build_object('ts', now(), 'actorId', v_me, 'action', 'Мероприятие опубликовано')));
    perform public._audit('Создание мероприятия', 'event', v_id, e->>'title');
  end if;
  return public._row('event', v_id);
end $$;

create or replace function public.save_achievement(a jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me text := public.me(); v_id text := a->>'id'; r jsonb; v_data jsonb;
begin
  perform public._require(array['member', 'chair', 'regional', 'admin']);
  if coalesce(trim(a->>'title'), '') = '' or nullif(a->>'date', '') is null then raise exception 'Укажите название и дату'; end if;
  if (a->>'type') not in ('volunteer', 'training', 'mentoring', 'award', 'sport', 'social') then raise exception 'Неизвестный тип достижения'; end if;
  if v_id is null or v_id !~ '^a[a-z0-9]{3,30}$' then raise exception 'Некорректный идентификатор'; end if;
  v_data := a - array['id', 'status', 'review', 'history', 'userId', 'submittedAt', 'demo', 'date'];
  select to_jsonb(t) into r from achievements t where id = v_id;
  if r is not null then
    if not public._can_edit('achievement', r) then raise exception 'Редактирование закрыто'; end if;
    update achievements set ach_date = (a->>'date')::date, data = v_data, updated_at = now(),
      history = history || jsonb_build_object('ts', now(), 'actorId', v_me, 'action', 'Внесены изменения') where id = v_id;
  else
    insert into achievements (id, user_id, status, ach_date, data, history)
    values (v_id, v_me, 'draft', (a->>'date')::date, v_data, jsonb_build_array(jsonb_build_object('ts', now(), 'actorId', v_me, 'action', 'Создан черновик')));
  end if;
  perform public._audit(case when r is null then 'Создание достижения' else 'Изменение достижения' end, 'achievement', v_id, a->>'title');
  return public._row('achievement', v_id);
end $$;

-- ---------- отправка на проверку ----------
create or replace function public.submit_activity(kind text, eid text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := public._row(kind, eid); d jsonb := r->'data'; v_org text := public._entity_org(kind, r); v_prev text := r->>'status';
        v_ex text; v_rev jsonb; v_title text := coalesce(r->'data'->>'title', '');
begin
  perform public._require(array['member', 'chair', 'regional', 'admin']);
  if not public._can_edit(kind, r) then raise exception 'Нет прав отправить эту активность'; end if;
  if v_prev not in ('draft', 'needs_info', 'planned') then raise exception 'Активность уже на проверке или решение принято'; end if;
  if kind = 'project' then
    if (select coalesce(sum((t->>'share')::numeric), 0) from jsonb_array_elements(coalesce(d->'team', '[]'::jsonb)) t) <> 100 then raise exception 'Сумма долей вклада команды должна быть 100%%'; end if;
    if not exists (select 1 from jsonb_array_elements(coalesce(d->'kpis', '[]'::jsonb)) k where coalesce(k->>'name', '') <> '' and coalesce((k->>'plan')::numeric, 0) > 0) then raise exception 'Нужен хотя бы один измеримый KPI с планом'; end if;
    if not exists (select 1 from jsonb_array_elements(coalesce(d->'media', '[]'::jsonb)) m where m->>'kind' <> 'photo') then raise exception 'Приложите документ, подтверждающий результаты'; end if;
    if exists (select 1 from projects x where x.id <> eid and x.org_id = r->>'org_id' and x.status not in ('draft', 'rejected')
               and lower(trim(x.data->>'title')) = lower(trim(d->>'title'))
               and not ((x.data->>'end')::date < (d->>'start')::date or (x.data->>'start')::date > (d->>'end')::date)) then
      raise exception 'Такой проект уже учтён: одна активность не засчитывается дважды';
    end if;
  elsif kind = 'event' then
    if (r->>'event_date')::date > current_date then raise exception 'Итоги можно отправить после даты мероприятия'; end if;
    if coalesce((d->>'attended')::numeric, 0) <= 0 then raise exception 'Укажите число пришедших'; end if;
    if not exists (select 1 from jsonb_array_elements(coalesce(d->'media', '[]'::jsonb)) m where m->>'kind' <> 'photo') then raise exception 'Приложите лист регистрации'; end if;
  else
    if jsonb_array_length(coalesce(d->'files', '[]'::jsonb)) = 0 then raise exception 'Приложите подтверждающий документ'; end if;
  end if;
  v_rev := r->'review';
  if v_prev = 'needs_info' and v_rev->>'expertId' is not null and not public.has_conflict(v_rev->>'expertId', v_org) then
    v_ex := v_rev->>'expertId';
    v_rev := v_rev || jsonb_build_object('resubmittedAt', now());
  else
    v_ex := public.pick_expert(v_org);
    v_rev := jsonb_build_object('expertId', v_ex, 'assignedAt', now(), 'scores', null, 'comment', '');
  end if;
  execute format('update public.%I set status = ''submitted'', submitted_at = now(), review = $1, updated_at = now() where id = $2', public._tbl(kind)) using v_rev, eid;
  perform public._hist(kind, eid, case when v_prev = 'needs_info' then 'Уточнения отправлены, повторная проверка' else 'Отправлено на проверку' end);
  if v_ex is not null then
    perform public._hist(kind, eid, 'Назначен эксперт без конфликта интересов: ' || public._name(v_ex), null, 'system');
    perform public._notify(v_ex, 'Новая заявка на проверку: «' || v_title || '»', '#review-' || eid);
  else
    perform public._hist(kind, eid, 'Нет эксперта без конфликта интересов — назначит администратор', null, 'system');
  end if;
  perform public._audit('Отправка на проверку', kind, eid, v_title);
  return public._row(kind, eid);
end $$;

-- ---------- экспертиза ----------
create or replace function public.review_take(kind text, eid text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := public._row(kind, eid); v_me text := public.me(); v_role text; v_org text := public._entity_org(kind, r); v_ex text := r->'review'->>'expertId';
begin
  v_role := public._require(array['expert', 'admin']);
  if r->>'status' <> 'submitted' then raise exception 'Заявку нельзя взять в работу в текущем статусе'; end if;
  if v_role = 'expert' then
    if public.has_conflict(v_me, v_org) then raise exception 'Конфликт интересов: вы не можете проверять эту организацию'; end if;
    if v_ex is not null and v_ex <> v_me then raise exception 'Заявка назначена другому эксперту'; end if;
    v_ex := v_me;
  else
    v_ex := coalesce(v_ex, v_me);
  end if;
  execute format('update public.%I set status = ''in_review'', review = coalesce(review, ''{}''::jsonb) || $1, updated_at = now() where id = $2', public._tbl(kind))
    using jsonb_build_object('expertId', v_ex, 'takenAt', now()), eid;
  perform public._hist(kind, eid, 'Взято на рассмотрение');
  perform public._notify(o, 'Заявка «' || coalesce(r->'data'->>'title', '') || '» на рассмотрении у эксперта', public._link(kind, r)) from unnest(public._owners(kind, r)) o;
  perform public._audit('Эксперт взял заявку в работу', kind, eid, r->'data'->>'title');
  return public._row(kind, eid);
end $$;

create or replace function public.review_decide(kind text, eid text, decision text, rv jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := public._row(kind, eid); d jsonb := r->'data'; v_me text := public.me(); v_role text; v_org text := public._entity_org(kind, r);
        v_rev jsonb; k text; v_avg numeric := 0; v_label text;
begin
  v_role := public._require(array['expert', 'admin']);
  if r->>'status' <> 'in_review' then raise exception 'Сначала возьмите заявку в работу'; end if;
  if v_role = 'expert' and (r->'review'->>'expertId') is distinct from v_me then raise exception 'Заявка назначена другому эксперту'; end if;
  if v_role = 'expert' and public.has_conflict(v_me, v_org) then raise exception 'Конфликт интересов'; end if;
  if decision not in ('confirmed', 'rejected', 'needs_info') then raise exception 'Неизвестное решение'; end if;
  if decision <> 'confirmed' and length(coalesce(trim(rv->>'comment'), '')) < 10 then raise exception 'Опишите причину в комментарии (от 10 знаков)'; end if;
  foreach k in array array['relevance', 'results', 'evidence', 'reach', 'kpi'] loop
    if rv->'scores'->>k is null or (rv->'scores'->>k)::numeric not between 0 and 10 then raise exception 'Оценки по критериям должны быть от 0 до 10'; end if;
    v_avg := v_avg + (rv->'scores'->>k)::numeric / 5;
  end loop;
  if kind = 'project' and coalesce((rv->>'verifiedReach')::numeric, 0) > coalesce((d->>'reach')::numeric, 0) then raise exception 'Подтверждённый охват не может превышать заявленный'; end if;
  if kind = 'project' and coalesce((rv->>'verifiedHours')::numeric, 0) > coalesce((d->>'volunteerHours')::numeric, 0) then raise exception 'Подтверждённые часы не могут превышать заявленные'; end if;
  if kind = 'event' and coalesce((rv->>'verifiedAttended')::numeric, 0) > coalesce((d->>'attended')::numeric, 0) then raise exception 'Подтверждённое число участников не может превышать заявленное'; end if;
  if kind = 'achievement' and coalesce((rv->>'verifiedHours')::numeric, 0) > coalesce((d->>'hours')::numeric, 0) then raise exception 'Подтверждённые часы не могут превышать заявленные'; end if;
  v_rev := coalesce(r->'review', '{}'::jsonb)
    || jsonb_build_object('scores', rv->'scores', 'comment', coalesce(rv->>'comment', ''), 'expertId', coalesce(r->'review'->>'expertId', v_me), 'decidedAt', now())
    || jsonb_strip_nulls(jsonb_build_object('verifiedReach', (rv->>'verifiedReach')::numeric, 'verifiedHours', (rv->>'verifiedHours')::numeric, 'verifiedAttended', (rv->>'verifiedAttended')::numeric));
  execute format('update public.%I set status = $1, review = $2, updated_at = now() where id = $3', public._tbl(kind)) using decision, v_rev, eid;
  v_label := case decision when 'confirmed' then 'Подтверждено экспертом' when 'rejected' then 'Отклонено экспертом' else 'Запрошены уточнения' end;
  perform public._hist(kind, eid, v_label, nullif(rv->>'comment', ''));
  perform public._audit(v_label, kind, eid, coalesce(d->>'title', '') || '; средний балл ' || round(v_avg, 1) || coalesce('; комментарий: ' || nullif(rv->>'comment', ''), ''));
  return public._row(kind, eid);
end $$;

create or replace function public.review_decline(kind text, eid text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := public._row(kind, eid); v_me text := public.me(); v_new text;
begin
  perform public._require(array['expert']);
  if (r->'review'->>'expertId') is distinct from v_me or r->>'status' not in ('submitted', 'in_review') then raise exception 'Заявка не назначена вам'; end if;
  v_new := public.pick_expert(public._entity_org(kind, r), array[v_me]);
  execute format('update public.%I set status = ''submitted'', review = coalesce(review, ''{}''::jsonb) || $1, updated_at = now() where id = $2', public._tbl(kind))
    using jsonb_build_object('expertId', v_new, 'assignedAt', now()), eid;
  perform public._hist(kind, eid, 'Эксперт заявил конфликт интересов, заявка передана' || coalesce(': ' || public._name(v_new), ' администратору'));
  perform public._notify(v_new, 'Новая заявка на проверку: «' || coalesce(r->'data'->>'title', '') || '»', '#review-' || eid);
  perform public._audit('Самоотвод эксперта (конфликт интересов)', kind, eid, r->'data'->>'title');
  return public._row(kind, eid);
end $$;

create or replace function public.admin_assign(kind text, eid text, expert text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := public._row(kind, eid); v_org text := public._entity_org(kind, r);
begin
  perform public._require(array['admin']);
  if expert is not null and (not exists (select 1 from profiles where id = expert and role = 'expert' and not blocked) or public.has_conflict(expert, v_org)) then
    raise exception 'Эксперт недоступен или у него конфликт интересов';
  end if;
  execute format('update public.%I set review = coalesce(review, ''{}''::jsonb) || $1, status = case when status = ''in_review'' then ''submitted'' else status end, updated_at = now() where id = $2', public._tbl(kind))
    using jsonb_build_object('expertId', expert, 'assignedAt', now()), eid;
  perform public._hist(kind, eid, case when expert is null then 'Эксперт снят администратором' else 'Администратор назначил эксперта: ' || public._name(expert) end);
  perform public._notify(expert, 'Вам назначена заявка: «' || coalesce(r->'data'->>'title', '') || '»', '#review-' || eid);
  perform public._audit('Назначение эксперта', kind, eid, coalesce(public._name(expert), 'снят'));
  return public._row(kind, eid);
end $$;

create or replace function public.set_my_conflicts(orgs text[]) returns integer language plpgsql security definer set search_path = public as $$
declare v_me text := public.me(); rec record; v_new text; n integer := 0;
begin
  perform public._require(array['expert']);
  update profiles set conflicts = coalesce(orgs, '{}') where id = v_me;
  perform public._audit('Изменение декларации конфликта интересов', 'user', v_me, coalesce(array_to_string(orgs, ', '), 'нет'));
  for rec in
    select 'project' k, id, org_id o, data->>'title' t from projects where review->>'expertId' = v_me and status in ('submitted', 'in_review')
    union all select 'event', id, org_id, data->>'title' from events where review->>'expertId' = v_me and status in ('submitted', 'in_review')
    union all select 'achievement', a.id, p.org_id, a.data->>'title' from achievements a join profiles p on p.id = a.user_id where a.review->>'expertId' = v_me and a.status in ('submitted', 'in_review')
  loop
    if public.has_conflict(v_me, rec.o) then
      v_new := public.pick_expert(rec.o, array[v_me]);
      execute format('update public.%I set status = ''submitted'', review = review || $1 where id = $2', public._tbl(rec.k)) using jsonb_build_object('expertId', v_new, 'assignedAt', now()), rec.id;
      perform public._hist(rec.k, rec.id, 'Переназначено из-за конфликта интересов' || coalesce(': ' || public._name(v_new), ''), null, 'system');
      perform public._notify(v_new, 'Новая заявка на проверку: «' || coalesce(rec.t, '') || '»', '#review-' || rec.id);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------- мероприятия: регистрация ----------
create or replace function public.event_register(eid text, on_ boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare r events; v_me text := public.me();
begin
  perform public._require(array['member', 'chair', 'regional', 'admin']);
  select * into r from events where id = eid;
  if not found then raise exception 'Мероприятие не найдено'; end if;
  if r.status <> 'planned' or r.event_date < current_date then raise exception 'Регистрация закрыта'; end if;
  if on_ then
    if v_me = any(r.registered) then return public._row('event', eid); end if;
    if cardinality(r.registered) >= coalesce((r.data->>'capacity')::int, 100000) then raise exception 'Мест нет'; end if;
    update events set registered = array_append(registered, v_me) where id = eid;
    perform public._notify(o, public._name(v_me) || ' зарегистрировался на «' || coalesce(r.data->>'title', '') || '»', '#event-' || eid) from unnest(r.organizer_ids) o where o <> v_me;
    perform public._audit('Регистрация на мероприятие', 'event', eid, r.data->>'title');
  else
    update events set registered = array_remove(registered, v_me) where id = eid;
    perform public._audit('Отмена регистрации на мероприятие', 'event', eid, r.data->>'title');
  end if;
  return public._row('event', eid);
end $$;

-- ---------- комментарии и апелляции ----------
create or replace function public.add_comment(eid text, txt text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r projects; v_me text := public.me(); v_ok boolean;
begin
  perform public._require(array['member', 'chair', 'regional', 'expert', 'admin']);
  select * into r from projects where id = eid;
  if not found then raise exception 'Проект не найден'; end if;
  if length(coalesce(trim(txt), '')) = 0 or length(txt) > 2000 then raise exception 'Комментарий пустой или слишком длинный'; end if;
  v_ok := public.is_admin() or v_me in (r.created_by, r.leader_id) or v_me = any(r.team_ids) or r.review->>'expertId' = v_me or public.chair_of(r.org_id);
  if not v_ok then raise exception 'Комментировать могут команда, председатель, эксперт и администратор'; end if;
  update projects set comments = comments || jsonb_build_object('ts', now(), 'userId', v_me, 'text', trim(txt)) where id = eid;
  perform public._notify(u, 'Новый комментарий к проекту «' || coalesce(r.data->>'title', '') || '»', '#project-' || eid)
    from unnest(array_remove(array[r.created_by, r.leader_id, r.review->>'expertId'], null)) u where u <> v_me;
  perform public._audit('Комментарий к проекту', 'project', eid, left(txt, 120));
  return public._row('project', eid);
end $$;

create or replace function public.create_appeal(kind text, eid text, reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := public._row(kind, eid); v_me text := public.me(); a appeals;
begin
  perform public._require(array['member', 'chair', 'regional', 'admin']);
  if not (v_me = any(public._owners(kind, r)) or (kind = 'project' and r->'team_ids' ? v_me)) then raise exception 'Оспорить оценку могут автор, руководитель или участник команды'; end if;
  if r->>'status' not in ('confirmed', 'rejected') then raise exception 'Апелляция возможна только после решения эксперта'; end if;
  if exists (select 1 from appeals where entity_id = eid and status = 'open') then raise exception 'По этой активности уже есть открытая апелляция'; end if;
  if length(coalesce(trim(reason), '')) < 15 then raise exception 'Опишите основание подробнее (от 15 знаков)'; end if;
  insert into appeals (entity_type, entity_id, user_id, reason) values (kind, eid, v_me, trim(reason)) returning * into a;
  perform public._hist(kind, eid, 'Подана апелляция', trim(reason));
  perform public._notify(p.id, 'Новая апелляция по «' || coalesce(r->'data'->>'title', '') || '»', '#admin') from profiles p where p.role = 'admin' and not p.blocked;
  perform public._audit('Подача апелляции', kind, eid, trim(reason));
  return to_jsonb(a);
end $$;

create or replace function public.resolve_appeal(apid text, accept boolean, resolution text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a appeals; r jsonb; v_prev text; v_new text;
begin
  perform public._require(array['admin']);
  select * into a from appeals where id = apid;
  if not found or a.status <> 'open' then raise exception 'Апелляция не найдена или уже рассмотрена'; end if;
  r := public._row(a.entity_type, a.entity_id);
  if accept then
    v_prev := r->'review'->>'expertId';
    v_new := public.pick_expert(public._entity_org(a.entity_type, r), array_remove(array[v_prev], null));
    if v_new is null then raise exception 'Нет другого эксперта без конфликта интересов'; end if;
    execute format('update public.%I set status = ''submitted'', submitted_at = now(), review = $1, updated_at = now() where id = $2', public._tbl(a.entity_type))
      using jsonb_build_object('expertId', v_new, 'assignedAt', now(), 'scores', null, 'comment', '', 'previous', r->'review'), a.entity_id;
    update appeals set status = 'accepted', resolution = 'Назначена повторная экспертиза: ' || public._name(v_new) where id = apid;
    perform public._hist(a.entity_type, a.entity_id, 'Апелляция принята, назначена повторная экспертиза: ' || public._name(v_new));
    perform public._notify(a.user_id, 'Апелляция по «' || coalesce(r->'data'->>'title', '') || '» принята. Назначена повторная экспертиза.', public._link(a.entity_type, r));
    perform public._notify(v_new, 'Повторная экспертиза по апелляции: «' || coalesce(r->'data'->>'title', '') || '»', '#review-' || a.entity_id);
    perform public._audit('Апелляция принята', a.entity_type, a.entity_id, public._name(v_new));
  else
    if length(coalesce(trim(resolution), '')) < 10 then raise exception 'Обоснуйте решение (от 10 знаков)'; end if;
    update appeals set status = 'declined', resolution = trim(resolution) where id = apid;
    perform public._hist(a.entity_type, a.entity_id, 'Апелляция отклонена', trim(resolution));
    perform public._notify(a.user_id, 'Апелляция по «' || coalesce(r->'data'->>'title', '') || '» отклонена: ' || trim(resolution), public._link(a.entity_type, r));
    perform public._audit('Апелляция отклонена', a.entity_type, a.entity_id, trim(resolution));
  end if;
  return (select to_jsonb(x) from appeals x where id = apid);
end $$;

-- ---------- участники и роли ----------
create or replace function public.verify_member(uid text, accept boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  perform public._require(array['chair', 'admin']);
  select * into p from profiles where id = uid;
  if not found then raise exception 'Пользователь не найден'; end if;
  if not (public.is_admin() or public.chair_of(p.org_id)) then raise exception 'Подтверждать участников может председатель этого совета'; end if;
  if accept then
    update profiles set verified = true, council_rejected = false, council_role = case when council_role = 'Участник' then 'Член совета' else council_role end where id = uid;
    perform public._notify(uid, 'Председатель подтвердил ваше членство в Молодёжном совете.', '#company-' || p.org_id);
    perform public._audit('Подтверждение членства в совете', 'user', uid, p.data->>'name');
  else
    update profiles set verified = false, council_rejected = true where id = uid;
    perform public._notify(uid, 'Заявка на вступление в Молодёжный совет отклонена. Уточните детали у председателя.', '#company-' || p.org_id);
    perform public._audit('Отклонение заявки в совет', 'user', uid, p.data->>'name');
  end if;
  return (select to_jsonb(x) from profiles x where id = uid);
end $$;

create or replace function public.set_council_role(uid text, cr text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  perform public._require(array['chair', 'admin']);
  if cr not in ('Председатель', 'Заместитель председателя', 'Секретарь', 'Региональный представитель', 'Член совета', 'Участник') then raise exception 'Неизвестная должность'; end if;
  select * into p from profiles where id = uid;
  if not found then raise exception 'Пользователь не найден'; end if;
  if not (public.is_admin() or public.chair_of(p.org_id)) then raise exception 'Должности меняет председатель этого совета'; end if;
  if cr = 'Председатель' and not public.is_admin() then raise exception 'Председателя назначает администратор'; end if;
  update profiles set council_role = cr where id = uid;
  perform public._audit('Изменение должности в совете', 'user', uid, coalesce(p.data->>'name', '') || ': ' || cr);
  return (select to_jsonb(x) from profiles x where id = uid);
end $$;

create or replace function public.admin_set_role(uid text, r text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  perform public._require(array['admin']);
  if r not in ('admin', 'chair', 'regional', 'member', 'expert') then raise exception 'Неизвестная роль'; end if;
  select * into p from profiles where id = uid;
  if not found then raise exception 'Пользователь не найден'; end if;
  if uid = public.me() and r <> 'admin' then raise exception 'Нельзя снять роль администратора с самого себя'; end if;
  if r in ('chair', 'regional') and p.org_id is null then raise exception 'Сначала укажите пользователю компанию'; end if;
  update profiles set role = r,
    verified = case when r in ('chair', 'regional') then true else verified end,
    council_role = case when r = 'chair' then 'Председатель' when r = 'regional' then 'Региональный представитель'
                        when council_role in ('Председатель', 'Региональный представитель') then 'Член совета' else council_role end
  where id = uid;
  if p.role = 'chair' and r <> 'chair' then
    update organizations set council = jsonb_set(council, '{chairId}', 'null'::jsonb) where council->>'chairId' = uid;
  end if;
  if p.role = 'regional' and r <> 'regional' then
    update organizations set council = jsonb_set(council, '{regionalReps}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(council->'regionalReps') x where x <> uid), '[]'::jsonb)) where council->'regionalReps' ? uid;
  end if;
  if r = 'chair' then
    update organizations set council = jsonb_set(council, '{chairId}', to_jsonb(uid)) where id = p.org_id;
  elsif r = 'regional' then
    update organizations set council = jsonb_set(council, '{regionalReps}', coalesce(council->'regionalReps', '[]'::jsonb) || to_jsonb(uid)) where id = p.org_id and not (coalesce(council->'regionalReps', '[]'::jsonb) ? uid);
  end if;
  perform public._notify(uid, 'Ваша роль на платформе изменена: ' || case r when 'admin' then 'Главный администратор' when 'chair' then 'Председатель Молодёжного совета' when 'regional' then 'Региональный председатель' when 'expert' then 'Независимый эксперт' else 'Участник' end, '#me');
  perform public._audit('Изменение роли пользователя', 'user', uid, coalesce(p.data->>'name', '') || ': ' || p.role || ' → ' || r);
  return (select to_jsonb(x) from profiles x where id = uid);
end $$;

create or replace function public.admin_set_blocked(uid text, b boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require(array['admin']);
  if uid = public.me() then raise exception 'Нельзя заблокировать самого себя'; end if;
  update profiles set blocked = b where id = uid;
  perform public._audit(case when b then 'Блокировка пользователя' else 'Разблокировка пользователя' end, 'user', uid, public._name(uid));
  return (select to_jsonb(x) from profiles x where id = uid);
end $$;

create or replace function public.admin_user_emails() returns table (id text, email text) language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require(array['admin']);
  return query select u.id::text, u.email::text from auth.users u;
end $$;

create or replace function public.update_org_profile(o text, about text, sector text, founded integer) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require(array['chair', 'admin']);
  if not (public.is_admin() or public.chair_of(o)) then raise exception 'Профиль компании редактирует её председатель или администратор'; end if;
  update organizations set about = coalesce(update_org_profile.about, organizations.about), sector = coalesce(nullif(update_org_profile.sector, ''), organizations.sector),
    council = jsonb_set(council, '{founded}', to_jsonb(founded)) where id = o;
  perform public._audit('Изменение профиля компании', 'org', o, '');
  return (select to_jsonb(x) from organizations x where id = o);
end $$;

create or replace function public.update_my_profile(d jsonb, org text, region text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p profiles; v_me text := public.me(); ch text;
begin
  if v_me is null then raise exception 'Войдите в систему'; end if;
  select * into p from profiles where id = v_me;
  if not found then raise exception 'Профиль не найден'; end if;
  if region is not null and not exists (select 1 from regions where id = region) then raise exception 'Регион не найден'; end if;
  if org is not null and not exists (select 1 from organizations where id = org) then raise exception 'Организация не найдена'; end if;
  if org is distinct from p.org_id and org is not null and p.role in ('chair', 'regional') then raise exception 'Председатели меняют компанию через администратора'; end if;
  update profiles set data = (d - array['id', 'role', 'verified', 'blocked', 'conflicts', 'councilRole', 'companyId', 'regionId', 'email', 'demo', 'councilRejected']),
    region_id = coalesce(region, region_id),
    org_id = coalesce(org, org_id),
    verified = case when org is not null and org is distinct from p.org_id then false else verified end,
    council_rejected = case when org is not null and org is distinct from p.org_id then false else council_rejected end,
    council_role = case when org is not null and org is distinct from p.org_id then 'Участник' else council_role end
  where id = v_me;
  if org is not null and org is distinct from p.org_id then
    select council->>'chairId' into ch from organizations where id = org;
    perform public._notify(ch, coalesce(d->>'name', 'Участник') || ' просит подтвердить членство в Молодёжном совете', '#company-' || org);
  end if;
  perform public._audit('Редактирование профиля', 'user', v_me, d->>'name');
  return (select to_jsonb(x) from profiles x where id = v_me);
end $$;

create or replace function public.purge_demo() returns jsonb language plpgsql security definer set search_path = public as $$
declare n_p int; n_e int; n_a int; n_u int;
begin
  perform public._require(array['admin']);
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

-- ---------- профиль при регистрации ----------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); v_org text := m->>'companyId'; v_reg text := m->>'regionId'; ch text; v_name text;
begin
  if v_org is not null and not exists (select 1 from organizations where id = v_org) then v_org := null; end if;
  if v_reg is not null and not exists (select 1 from regions where id = v_reg) then v_reg := null; end if;
  v_name := coalesce(nullif(trim(m->>'name'), ''), split_part(new.email, '@', 1));
  insert into profiles (id, role, org_id, region_id, data) values (new.id::text, 'member', v_org, v_reg,
    jsonb_strip_nulls(jsonb_build_object('name', v_name, 'position', m->>'position', 'dept', m->>'dept', 'city', m->>'city',
      'startYear', case when m->>'startYear' ~ '^\d{4}$' then (m->>'startYear')::int end, 'bio', m->>'bio', 'education', m->>'education',
      'skills', coalesce(m->'skills', '[]'::jsonb), 'interests', m->>'interests', 'media', '[]'::jsonb, 'createdAt', now())))
  on conflict (id) do nothing;
  if v_org is not null then
    select council->>'chairId' into ch from organizations where id = v_org;
    if ch is not null then insert into notifications (user_id, text, link, actor_id) values (ch, v_name || ' просит подтвердить членство в Молодёжном совете', '#company-' || v_org, new.id::text); end if;
  end if;
  insert into notifications (user_id, text, link, actor_id) values (new.id::text, 'Добро пожаловать в JASTAR HUB! Заполните профиль и добавьте первую активность.', '#me', new.id::text);
  insert into audit_log (actor_id, role, action, entity_type, entity_id, details) values (new.id::text, 'member', 'Регистрация пользователя', 'user', new.id::text, v_name);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- права на выполнение ----------
revoke execute on function public._tbl(text), public._row(text, text), public._entity_org(text, jsonb), public._owners(text, jsonb), public._link(text, jsonb),
  public._name(text), public._can_edit(text, jsonb), public._hist(text, text, text, text, text), public._notify(text, text, text), public._audit(text, text, text, text),
  public._require(text[]), public.pick_expert(text, text[]), public.expert_load(text), public.handle_new_user(), public.audit_immutable()
  from public, anon, authenticated;
revoke execute on function public.save_project(jsonb), public.save_event(jsonb), public.save_achievement(jsonb), public.submit_activity(text, text),
  public.review_take(text, text), public.review_decide(text, text, text, jsonb), public.review_decline(text, text), public.admin_assign(text, text, text),
  public.set_my_conflicts(text[]), public.event_register(text, boolean), public.add_comment(text, text), public.create_appeal(text, text, text),
  public.resolve_appeal(text, boolean, text), public.verify_member(text, boolean), public.set_council_role(text, text), public.admin_set_role(text, text),
  public.admin_set_blocked(text, boolean), public.admin_user_emails(), public.update_org_profile(text, text, text, integer),
  public.update_my_profile(jsonb, text, text), public.purge_demo()
  from public, anon;
grant execute on function public.save_project(jsonb), public.save_event(jsonb), public.save_achievement(jsonb), public.submit_activity(text, text),
  public.review_take(text, text), public.review_decide(text, text, text, jsonb), public.review_decline(text, text), public.admin_assign(text, text, text),
  public.set_my_conflicts(text[]), public.event_register(text, boolean), public.add_comment(text, text), public.create_appeal(text, text, text),
  public.resolve_appeal(text, boolean, text), public.verify_member(text, boolean), public.set_council_role(text, text), public.admin_set_role(text, text),
  public.admin_set_blocked(text, boolean), public.admin_user_emails(), public.update_org_profile(text, text, text, integer),
  public.update_my_profile(jsonb, text, text), public.purge_demo()
  to authenticated;
