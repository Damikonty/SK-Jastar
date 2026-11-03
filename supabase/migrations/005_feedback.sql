-- =====================================================================
-- JASTAR HUB · миграция 005: обратная связь, благодарности, контакты
--   feedback — предложения, рекомендации, вопросы, сообщения о проблемах и благодарности
--   settings.contacts — контактная информация платформы (заполняет администратор)
-- Обращения создаются только функцией submit_feedback; читать их может автор,
-- адресат благодарности и администратор; публичные благодарности видны всем.
-- =====================================================================

alter table public.settings add column if not exists contacts jsonb not null default '{}'::jsonb;

create table if not exists public.feedback (
  id text primary key default ('fb' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  user_id text,                                   -- null: гость или анонимное обращение
  kind text not null check (kind in ('suggestion', 'recommendation', 'question', 'problem', 'thanks')),
  subject text not null default '',
  body text not null check (length(body) between 10 and 3000),
  section text,
  target_type text check (target_type in ('user', 'org', 'platform')),
  target_id text,
  is_public boolean not null default false,
  status text not null default 'new' check (status in ('new', 'in_work', 'answered', 'done', 'declined', 'published', 'hidden')),
  reply text not null default '',
  replied_by text,
  replied_at timestamptz,
  contact jsonb not null default '{}'::jsonb,     -- имя и e-mail гостя, контакт для ответа
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists feedback_created on public.feedback(created_at desc);
create index if not exists feedback_user on public.feedback(user_id);

alter table public.feedback enable row level security;
create policy feedback_read on public.feedback for select using (
  (kind = 'thanks' and is_public and status = 'published')
  or (user_id is not null and user_id = (select public.me()))
  or (kind = 'thanks' and target_type = 'user' and target_id = (select public.me()))
  or (select public.is_admin())
);
create policy feedback_admin on public.feedback for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- отправка обращения (доступна и гостям) ----------
create or replace function public.submit_feedback(f jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me text := public.me();
  v_kind text := f->>'kind';
  v_body text := trim(coalesce(f->>'body', ''));
  v_subject text := left(trim(coalesce(f->>'subject', '')), 150);
  v_anon boolean := coalesce((f->>'anonymous')::boolean, false);
  v_tt text := f->>'targetType';
  v_tid text := nullif(f->>'targetId', '');
  v_user text; v_contact jsonb := '{}'::jsonb; v_status text; v_public boolean := false;
  v_name text; v_email text; r feedback; v_kind_ru text; ch text;
begin
  if v_kind not in ('suggestion', 'recommendation', 'question', 'problem', 'thanks') then raise exception 'Выберите тип обращения'; end if;
  if length(v_body) < 10 then raise exception 'Опишите обращение подробнее (от 10 знаков)'; end if;
  if length(v_body) > 3000 then raise exception 'Сообщение слишком длинное (до 3000 знаков)'; end if;
  if v_me is not null and public.my_role() is null then raise exception 'Учётная запись заблокирована'; end if;

  if v_kind = 'thanks' then
    if v_me is null then raise exception 'Войдите, чтобы поблагодарить: адресат должен знать, от кого благодарность'; end if;
    if v_tt not in ('user', 'org', 'platform') then raise exception 'Выберите, кого вы благодарите'; end if;
    if v_tt = 'user' and not exists (select 1 from profiles where id = v_tid and not blocked) then raise exception 'Сотрудник не найден'; end if;
    if v_tt = 'user' and v_tid = v_me then raise exception 'Нельзя поблагодарить самого себя'; end if;
    if v_tt = 'org' and not exists (select 1 from organizations where id = v_tid) then raise exception 'Совет не найден'; end if;
    if v_tt = 'platform' then v_tid := null; end if;
    v_user := v_me; v_status := 'published'; v_public := coalesce((f->>'isPublic')::boolean, true); v_anon := false;
    if (select count(*) from feedback where user_id = v_me and kind = 'thanks' and created_at > now() - interval '1 day') >= 20 then
      raise exception 'Сегодня отправлено уже 20 благодарностей, продолжите завтра';
    end if;
  else
    v_status := 'new'; v_tt := null; v_tid := null;
    if v_anon then
      v_user := null;
    elsif v_me is null then
      v_name := left(trim(coalesce(f->'contact'->>'name', '')), 120);
      v_email := left(trim(coalesce(f->'contact'->>'email', '')), 160);
      if v_name = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Укажите имя и e-mail для ответа'; end if;
      v_contact := jsonb_build_object('name', v_name, 'email', v_email);
    else
      v_user := v_me;
      if coalesce(trim(f->'contact'->>'reply'), '') <> '' then v_contact := jsonb_build_object('reply', left(trim(f->'contact'->>'reply'), 160)); end if;
    end if;
    if v_user is not null and (select count(*) from feedback where user_id = v_user and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'Слишком много обращений за час, попробуйте позже';
    end if;
    if v_user is null and (select count(*) from feedback where user_id is null and created_at > now() - interval '10 minutes') >= 30 then
      raise exception 'Слишком много обращений, попробуйте через несколько минут';
    end if;
  end if;

  insert into feedback (user_id, kind, subject, body, section, target_type, target_id, is_public, status, contact)
  values (v_user, v_kind, v_subject, v_body, nullif(left(f->>'section', 60), ''), v_tt, v_tid, v_public, v_status, v_contact)
  returning * into r;

  v_kind_ru := case v_kind when 'suggestion' then 'Предложение' when 'recommendation' then 'Рекомендация' when 'question' then 'Вопрос' when 'problem' then 'Проблема на сайте' else 'Благодарность' end;
  -- уведомления и аудит без автора для анонимных и гостевых обращений
  if v_kind = 'thanks' then
    if v_tt = 'user' then
      insert into notifications (user_id, text, link, actor_id) values (v_tid, public._name(v_me) || ' благодарит вас: «' || left(v_body, 140) || '»', '#person-' || v_tid, v_me);
    elsif v_tt = 'org' then
      select council->>'chairId' into ch from organizations where id = v_tid;
      if ch is not null and ch <> v_me then insert into notifications (user_id, text, link, actor_id) values (ch, public._name(v_me) || ' благодарит Молодёжный совет: «' || left(v_body, 120) || '»', '#company-' || v_tid, v_me); end if;
    else
      insert into notifications (user_id, text, link, actor_id) select id, 'Новая благодарность команде платформы', '#feedback', v_me from profiles where role = 'admin' and not blocked;
    end if;
  else
    insert into notifications (user_id, text, link, actor_id)
    select id, 'Новое обращение: ' || v_kind_ru || coalesce(' — ' || nullif(v_subject, ''), ''), '#admin', case when v_user is null then null else v_me end
    from profiles where role = 'admin' and not blocked;
  end if;
  insert into audit_log (actor_id, role, action, entity_type, entity_id, details)
  values (case when v_user is null then null else v_me end, case when v_user is null then null else public.my_role() end,
          case when v_kind = 'thanks' then 'Благодарность' else 'Новое обращение' end, 'feedback', r.id, v_kind_ru || coalesce(': ' || nullif(v_subject, ''), ''));
  return to_jsonb(r);
end $$;

-- ---------- обработка обращения администратором ----------
create or replace function public.admin_feedback_update(fid text, st text, answer text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r feedback; v_changed boolean;
begin
  perform public._require(array['admin']);
  select * into r from feedback where id = fid;
  if not found then raise exception 'Обращение не найдено'; end if;
  if r.kind = 'thanks' and st not in ('published', 'hidden') then raise exception 'Для благодарности доступны статусы «Опубликовано» и «Скрыто»'; end if;
  if r.kind <> 'thanks' and st not in ('new', 'in_work', 'answered', 'done', 'declined') then raise exception 'Неизвестный статус'; end if;
  v_changed := coalesce(trim(answer), '') <> coalesce(r.reply, '');
  update feedback set status = st,
    reply = coalesce(trim(answer), ''),
    replied_by = case when v_changed then public.me() else replied_by end,
    replied_at = case when v_changed then now() else replied_at end
  where id = fid returning * into r;
  if r.user_id is not null and r.kind <> 'thanks' then
    perform public._notify(r.user_id, 'Обращение «' || coalesce(nullif(r.subject, ''), left(r.body, 60)) || '»: ' ||
      case st when 'in_work' then 'взято в работу' when 'answered' then 'получен ответ' when 'done' then 'предложение реализовано' when 'declined' then 'отклонено' else 'обновлено' end, '#feedback');
  end if;
  perform public._audit('Обработка обращения', 'feedback', fid, st || case when v_changed then '; ответ: ' || left(coalesce(answer, ''), 200) else '' end);
  return to_jsonb(r);
end $$;

-- ---------- удаление тестовых данных (с учётом обращений) ----------
create or replace function public.purge_demo() returns jsonb language plpgsql security definer set search_path = public as $$
declare n_p int; n_e int; n_a int; n_u int;
begin
  perform public._require(array['admin']);
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

revoke execute on function public.submit_feedback(jsonb), public.admin_feedback_update(text, text, text), public.purge_demo() from public;
grant execute on function public.submit_feedback(jsonb) to anon, authenticated;
grant execute on function public.admin_feedback_update(text, text, text), public.purge_demo() to authenticated;
