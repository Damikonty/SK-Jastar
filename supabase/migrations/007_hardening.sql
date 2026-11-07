-- JASTAR HUB · миграция 007: замечания проверки безопасности Supabase
-- фиксированный search_path у служебных функций
alter function public.me() set search_path = public;
alter function public._tbl(text) set search_path = public;
alter function public._link(text, jsonb) set search_path = public;
alter function public._owners(text, jsonb) set search_path = public;
alter function public.audit_immutable() set search_path = public;
-- обработка обращений — только для вошедших (внутри дополнительно проверяется роль администратора)
revoke execute on function public.admin_feedback_update(text, text, text) from anon;
