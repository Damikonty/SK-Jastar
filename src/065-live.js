/* =====================================================================
   Режим общей базы (Supabase): настоящие аккаунты, общие данные для всех,
   все изменения статусов и ролей — через серверные функции с проверкой прав.
   На GitHub Pages включается автоматически; в демо-версии (Claude) не используется.
   ===================================================================== */

const LIVE_CFG = {
  url: 'https://ehrwdcaaeytpvmgrjfal.supabase.co',
  /* публичный ключ: предназначен для браузера, доступ ограничен правилами RLS в базе */
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocndkY2FhZXl0cHZtZ3JqZmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NTQxODAsImV4cCI6MjEwOTIzMDE4MH0.Fp9drHq2Z_MHUoUALn_uI7IgpfEhyl0Z_Tb_vgOa__0'
};
const LIVE_EXPECTED = !!LIVE_CFG.url && !window.claude && (/^https?:$/.test(location.protocol) || !!window.__JASTAR_FORCE_LIVE);
const LIVE = LIVE_EXPECTED && !!(window.supabase && window.supabase.createClient);
let sb = null;
let LAST_LOAD = 0;
let LIVE_BUSY = false;

/* ---------- преобразование строк базы в объекты интерфейса ---------- */
const USER_COLS = ['id', 'role', 'companyId', 'regionId', 'councilRole', 'verified', 'councilRejected', 'blocked', 'conflicts', 'demo', 'email'];
const omit = (o, keys) => { const r = { ...o }; keys.forEach((k) => delete r[k]); return r; };
const ROW = {
  region: (r) => ({ id: r.id, name: r.name, city: r.city, lat: +r.lat, lon: +r.lon }),
  org: (r) => ({ id: r.id, type: r.type, parentId: r.parent_id, name: r.name, full: r.full_name, regionId: r.region_id, sector: r.sector || '', young: r.young, about: r.about || '', profile: r.profile && Object.keys(r.profile).length ? r.profile : JSON.parse(JSON.stringify(ORG_PROFILE[r.id] || {})), council: { chairId: null, founded: null, regionalReps: [], ...(r.council || {}) }, demo: r.is_demo }),
  user: (r) => ({ skills: [], media: [], position: '', city: '', bio: '', ...(r.data || {}), name: (r.data && r.data.name) || 'Без имени', id: r.id, role: r.role, companyId: r.org_id, regionId: r.region_id || 'ast', councilRole: r.council_role, verified: r.verified, councilRejected: r.council_rejected, blocked: r.blocked, conflicts: r.conflicts || [], demo: r.is_demo }),
  project: (r) => ({ team: [], kpis: [], media: [], partnerOrgIds: [], ...(r.data || {}), id: r.id, orgId: r.org_id, regionId: r.region_id, category: r.category, status: r.status, createdBy: r.created_by, leaderId: r.leader_id, review: r.review, history: r.history || [], comments: r.comments || [], submittedAt: r.submitted_at, demo: r.is_demo }),
  event: (r) => ({ media: [], ...(r.data || {}), id: r.id, orgId: r.org_id, regionId: r.region_id, category: r.category, status: r.status, createdBy: r.created_by, organizers: r.organizer_ids || [], registered: r.registered || [], date: r.event_date, review: r.review, history: r.history || [], submittedAt: r.submitted_at, demo: r.is_demo }),
  achievement: (r) => ({ files: [], ...(r.data || {}), id: r.id, userId: r.user_id, status: r.status, date: r.ach_date, review: r.review, history: r.history || [], submittedAt: r.submitted_at, demo: r.is_demo }),
  news: (r) => ({ body: [], views: 0, ...(r.data || {}), id: r.id, orgId: r.org_id, authorId: r.author_id, kind: r.kind, published: r.published, date: r.news_date, demo: r.is_demo }),
  kb: (r) => ({ ...(r.data || {}), id: r.id, orgId: r.org_id, authorId: r.author_id, kind: r.kind, demo: r.is_demo }),
  appeal: (r) => ({ id: r.id, entityType: r.entity_type, entityId: r.entity_id, userId: r.user_id, reason: r.reason, status: r.status, resolution: r.resolution, ts: r.ts }),
  notif: (r) => ({ id: r.id, userId: r.user_id, text: r.text, link: r.link, read: r.read, ts: r.ts }),
  audit: (r) => ({ id: r.id, ts: r.ts, actorId: r.actor_id, role: r.role || 'guest', action: r.action, entityType: r.entity_type, entityId: r.entity_id, details: r.details || '' }),
  rlog: (r) => ({ ts: r.ts, kind: r.kind, id: r.subject_id, from: +r.score_from, to: +r.score_to, rankFrom: r.rank_from, rankTo: r.rank_to, reason: r.reason })
};
const KIND_LIST = { project: 'projects', event: 'events', achievement: 'achievements' };
const userData = (u) => omit(u, USER_COLS);

/* ---------- обращения к серверу ---------- */
async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) { const msg = error.message || 'Ошибка сервера'; toast(msg, 'bad'); throw new Error(msg); }
  return data;
}
async function tbl(op) {
  const { data, error } = await op;
  if (error) { const msg = error.message || 'Ошибка сервера'; toast(msg, 'bad'); throw new Error(msg); }
  return data;
}
async function fetchAll(table, order) {
  let out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select('*');
    if (order) q = q.order(order, { ascending: false });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    out = out.concat(data || []);
    if (!data || data.length < 1000) break;
  }
  return out;
}
async function busy(fn) {
  if (LIVE_BUSY) return;
  LIVE_BUSY = true; document.body.classList.add('busy');
  try { return await fn(); } catch (e) { console.error(e); } finally { LIVE_BUSY = false; document.body.classList.remove('busy'); }
}
function putRow(kind, row) {
  const map = { project: [DB.projects, ROW.project], event: [DB.events, ROW.event], achievement: [DB.achievements, ROW.achievement] }[kind];
  const obj = map[1](row);
  if (kind === 'project') obj.companyId = rootOf(obj.orgId);
  const i = map[0].findIndex((x) => x.id === obj.id);
  if (i >= 0) map[0][i] = obj; else map[0].push(obj);
  commit();
  return obj;
}
function putUser(row) {
  const obj = ROW.user(row);
  const old = U(obj.id); if (old && old.email) obj.email = old.email;
  const i = DB.users.findIndex((x) => x.id === obj.id);
  if (i >= 0) DB.users[i] = obj; else DB.users.push(obj);
  commit();
  return obj;
}
async function refetch(kind, id) {
  const row = await tbl(sb.from(KIND_LIST[kind]).select('*').eq('id', id).maybeSingle());
  if (row) return putRow(kind, row);
  return null;
}

async function liveLoad() {
  const { data: sess } = await sb.auth.getSession();
  const uidNow = sess && sess.session ? sess.session.user.id : null;
  const [regions, orgs, profiles, projects, events, achs, news, kb, settingsRows, rlog] = await Promise.all([
    fetchAll('regions'), fetchAll('organizations'), fetchAll('profiles'), fetchAll('projects'), fetchAll('events'), fetchAll('achievements'),
    fetchAll('news'), fetchAll('knowledge'), fetchAll('settings'), fetchAll('rating_log', 'ts')
  ]);
  const feedbackRows = await fetchAll('feedback', 'created_at').catch(() => []);
  const vacRows = await fetchAll('vacancies', 'created_at').catch(() => []);
  let notifs = [], appeals = [], audits = [];
  if (uidNow) [notifs, appeals] = await Promise.all([fetchAll('notifications', 'ts'), fetchAll('appeals')]);
  const st = settingsRows[0] || {};
  let lang = 'ru'; try { lang = localStorage.getItem('jastar-lang') || 'ru'; } catch (e) { /* по умолчанию */ }
  DB = {
    version: SCHEMA_VERSION, seededAt: new Date().toISOString(), lang,
    regions: regions.map(ROW.region), orgs: orgs.map(ROW.org), users: profiles.map(ROW.user),
    projects: projects.map(ROW.project), events: events.map(ROW.event), achievements: achs.map(ROW.achievement),
    news: news.map(ROW.news), knowledge: kb.map(ROW.kb), appeals: appeals.map(ROW.appeal), feedback: feedbackRows.map(ROW.feedback), vacancies: vacRows.map(ROW.vacancy),
    notifications: notifs.map(ROW.notif), audit: [], ratingLog: rlog.map(ROW.rlog).reverse(),
    settings: { wCompany: st.w_company || { projects: 25, reach: 20, social: 15, prof: 15, inter: 10, innov: 10, info: 5 }, wPerson: st.w_person || { contrib: 30, lead: 20, init: 20, volunteer: 10, inter: 10, prof: 10 }, infoCap: st.info_cap || 12, contacts: st.contacts || {}, people: Array.isArray(st.people) ? st.people : JSON.parse(JSON.stringify(CONTACT_PEOPLE_DEFAULT)) },
    session: { userId: uidNow }, demoAccounts: {}
  };
  reindex();
  DB.projects.forEach((p) => { p.companyId = rootOf(p.orgId); });
  const u = me();
  if (u && u.role === 'admin') {
    try {
      audits = await fetchAll('audit_log', 'ts');
      DB.audit = audits.map(ROW.audit).reverse();
      const emails = await rpc('admin_user_emails', {});
      (emails || []).forEach((e) => { const x = U(e.id); if (x) x.email = e.email; });
    } catch (e) { /* журнал недоступен */ }
  }
  commit();
  LAST_LOAD = Date.now();
}

/* ---------- рейтинг: фиксируем изменения после решения ---------- */
function ratingDiffRows(before, after, reason) {
  const ts = new Date().toISOString(); const rows = [];
  after.c.forEach((v, id) => { const b = before.c.get(id) || { t: 0, r: null }; if (Math.abs(v.t - b.t) >= 0.05 || v.r !== b.r) rows.push({ ts, kind: 'org', id, from: b.t, to: v.t, rankFrom: b.r, rankTo: v.r, reason }); });
  after.p.forEach((v, id) => { const b = before.p.get(id) || { t: 0, r: null }; if (Math.abs(v.t - b.t) >= 0.05) rows.push({ ts, kind: 'person', id, from: b.t, to: v.t, rankFrom: b.r, rankTo: v.r, reason }); });
  return rows;
}
async function logRating(rows) {
  if (!rows.length) return;
  DB.ratingLog.push(...rows);
  const payload = rows.slice(0, 400).map((r) => ({ kind: r.kind, subject_id: r.id, score_from: +r.from.toFixed(2), score_to: +r.to.toFixed(2), rank_from: r.rankFrom, rank_to: r.rankTo, reason: r.reason }));
  const { error } = await sb.from('rating_log').insert(payload);
  if (error) console.warn('rating_log', error.message);
}

/* ---------- аудит и уведомления со стороны клиента ---------- */
function liveAuditLocal(action, entityType, entityId, details) {
  if (!me()) return;
  sb.from('audit_log').insert({ role: myRole(), action, entity_type: entityType, entity_id: String(entityId || ''), details: details || '' }).then(() => {}, () => {});
}
function liveNotify(rows) {
  const list = rows.filter((r) => r.user_id);
  if (!list.length || !me()) return Promise.resolve();
  return sb.from('notifications').insert(list).then(() => {}, () => {});
}

/* ---------- файлы в хранилище ---------- */
function splitKey(key) { const i = key.indexOf('/'); return { bucket: key.slice(0, i), path: key.slice(i + 1) }; }
function installLiveMedia() {
  MEDIA.put = async (key, blob) => {
    MEDIA.mem.set(key, blob);
    if (!/^(files|avatars)\//.test(key)) return;
    const { bucket, path } = splitKey(key);
    const { error } = await sb.storage.from(bucket).upload(path, blob, { upsert: false, contentType: blob.type || undefined });
    if (error) throw new Error(error.message);
  };
  MEDIA.get = async (key) => {
    if (MEDIA.mem.has(key)) return MEDIA.mem.get(key);
    if (!/^(files|avatars)\//.test(key)) return null;
    const { bucket, path } = splitKey(key);
    const { data, error } = await sb.storage.from(bucket).download(path);
    return error ? null : data;
  };
  MEDIA.url = async (key) => {
    if (MEDIA.urls.has(key)) return MEDIA.urls.get(key);
    let u = null;
    if (MEDIA.mem.has(key)) u = URL.createObjectURL(MEDIA.mem.get(key));
    else if (/^avatars\//.test(key)) u = sb.storage.from('avatars').getPublicUrl(splitKey(key).path).data.publicUrl;
    else if (/^files\//.test(key) && me()) { const { data } = await sb.storage.from('files').createSignedUrl(splitKey(key).path, 3600); u = data ? data.signedUrl : null; }
    if (u) MEDIA.urls.set(key, u);
    return u;
  };
  MEDIA.clear = async () => { MEDIA.mem.clear(); MEDIA.urls.clear(); };
}

/* ---------- вход и регистрация ---------- */
function authError(m) {
  const s = String(m || '');
  if (/Invalid login credentials/i.test(s)) return 'Неверный e-mail или пароль';
  if (/already registered|already been registered/i.test(s)) return 'Пользователь с таким e-mail уже зарегистрирован';
  if (/Email not confirmed/i.test(s)) return 'E-mail не подтверждён. Администратору нужно отключить подтверждение почты в настройках Supabase';
  if (/not authorized|Error sending confirmation/i.test(s)) return 'Сервер не может отправить письмо подтверждения. Администратору нужно отключить подтверждение e-mail в Supabase';
  if (/Password should be/i.test(s)) return 'Пароль слишком короткий';
  if (/rate limit/i.test(s)) return 'Слишком много попыток, попробуйте через минуту';
  return s || 'Ошибка входа';
}
function installLiveApi() {
  api.signUp = async (d) => {
    const meta = { name: d.name, position: d.position || '', companyId: d.companyId || null, regionId: d.regionId || null, city: d.city || '', dept: d.dept || '', startYear: String(d.startYear || ''), bio: d.bio || '', education: d.education || '', skills: d.skills || [] };
    const { data, error } = await sb.auth.signUp({ email: d.email.trim().toLowerCase(), password: d.password, options: { data: meta } });
    if (error) throw new Error(authError(error.message));
    if (!data.session) throw new Error('Аккаунт создан, но вход требует подтверждения e-mail. Администратору нужно отключить подтверждение почты в Supabase');
    await liveLoad();
    const u = me();
    if (u && d.photo && MEDIA.mem.has(d.photo)) {
      try {
        const key = newMediaKey('avatar.jpg', 'avatar');
        await MEDIA.put(key, MEDIA.mem.get(d.photo));
        u.photo = key;
        putUser(await rpc('update_my_profile', { d: userData(u), org: null, region: null }));
      } catch (e) { /* фото можно добавить позже */ }
    }
    return me();
  };
  api.signIn = async (email, password) => {
    const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new Error(authError(error.message));
    await liveLoad();
    if (!me()) throw new Error('Профиль не найден. Обратитесь к администратору');
    if (me().blocked) { await sb.auth.signOut(); await liveLoad(); throw new Error('Учётная запись заблокирована администратором'); }
    return me();
  };
  api.signOut = async () => { await sb.auth.signOut(); await liveLoad(); };
  api.signInDemo = () => {};
}

/* ---------- переопределение действий для общей базы ---------- */
function installLiveActions() {
  saveDB = function () { try { localStorage.setItem('jastar-lang', DB.lang); } catch (e) { /* не критично */ } };
  audit = function (action, entityType, entityId, details) {
    DB.audit.push({ id: uid('l'), ts: new Date().toISOString(), actorId: me() ? me().id : 'guest', role: myRole(), action, entityType, entityId, details: details || '' });
    liveAuditLocal(action, entityType, entityId, details);
  };
  notify = function (userId, text, link) {
    if (!userId) return;
    if (me() && userId === me().id) DB.notifications.push({ id: uid('nt'), userId, ts: new Date().toISOString(), text, link: link || '', read: false });
    liveNotify([{ user_id: userId, text, link: link || '' }]);
  };

  /* вход, выход, демо-переключатель */
  ACTIONS['role-switch'] = () => go(me() ? 'me' : 'login');
  ACTIONS['demo-login'] = () => {};
  ACTIONS['demo-logout'] = ACTIONS.logout = () => busy(async () => { await api.signOut(); toast('Вы вышли из системы'); go('home'); });
  route('login', () => `<div class="page narrow"><section class="card pad auth-one">${pageHead(t('login'), 'Войдите по e-mail и паролю, указанным при регистрации')}
    <form class="form" data-form="login">${fld('E-mail', inp('email', '', 'type="email" required autocomplete="email"'), '', true)}${fld('Пароль', inp('password', '', 'type="password" required autocomplete="current-password"'), '', true)}<div class="btn-row"><button class="btn primary" type="submit">${icon('login', 16)}Войти</button><a class="btn ghost" href="#register">Регистрация</a></div></form>
    <p class="note">Забыли пароль? Обратитесь к администратору платформы.</p></section></div>`);
  FORMS.login = (form) => busy(async () => {
    const d = formData(form);
    try { await api.signIn(d.email, d.password); toast('Добро пожаловать, ' + (me().name.split(' ')[1] || me().name), 'good'); go('home'); }
    catch (err) { toast(err.message, 'bad'); }
  });
  const regForm = FORMS.register;
  FORMS.register = (form, e) => {
    if (UI.reg && UI.reg.step === 4) return busy(async () => {
      try {
        const x = UI.reg.data;
        await api.signUp({ ...x, skills: String(x.skills || '').split(',').map((s) => s.trim()).filter(Boolean) });
        UI.reg = null; toast('Профиль создан. Председатель совета подтвердит ваше членство.', 'good'); go('me');
      } catch (err) { toast(err.message, 'bad'); }
    });
    return regForm(form, e);
  };

  /* профиль */
  FORMS.profile = (form) => busy(async () => {
    const d = formData(form); const u = me();
    if (!d.name || !d.position) { toast('Заполните ФИО и должность', 'bad'); return; }
    if (d.pc_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.pc_email)) { toast('Проверьте рабочий e-mail', 'bad'); return; }
    const data = { ...userData(u), contacts: { email: d.pc_email || '', phone: d.pc_phone || '', telegram: d.pc_tg || '' }, name: d.name, position: d.position, dept: d.dept, city: d.city, startYear: +d.startYear || u.startYear, bio: d.bio, education: d.education, interests: d.interests, skills: String(d.skills || '').split(',').map((x) => x.trim()).filter(Boolean), sport: d.sport };
    const org = d.companyId && d.companyId !== u.companyId ? d.companyId : null;
    putUser(await rpc('update_my_profile', { d: data, org, region: d.regionId || null }));
    UI.meRoot = null; toast('Профиль сохранён', 'good'); go('me');
  });
  UPLOAD.avatar = async (files) => {
    const f = files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { toast('Нужен файл изображения', 'bad'); return; }
    const blob = await resizeImage(f, 400, 0.86);
    if (!me()) { const key = uid('ava'); MEDIA.mem.set(key, blob); if (UI.reg) { UI.reg.data.photo = key; rerender(); } return; }
    await busy(async () => {
      const key = newMediaKey('avatar.jpg', 'avatar');
      await MEDIA.put(key, blob);
      const u = me(); putUser(await rpc('update_my_profile', { d: { ...userData(u), photo: key }, org: null, region: null }));
      toast('Фотография обновлена', 'good'); rerender();
    });
  };
  UPLOAD['user-media'] = (files) => busy(async () => {
    const u = me(); const kind = UI.umKind || 'photo';
    const items = await acceptFiles(files, kind === 'photo' ? {} : { kind: kind === 'video' ? 'video' : 'doc' });
    items.forEach((m) => { m.cat = kind; if (kind === 'photo' && m.type && !m.type.startsWith('image/')) m.kind = 'doc'; });
    if (!items.length) return;
    putUser(await rpc('update_my_profile', { d: { ...userData(u), media: [...(u.media || []), ...items] }, org: null, region: null }));
    toast(`Загружено файлов: ${items.length}`, 'good'); rerender();
  });
  const mediaRemove = ACTIONS['media-remove'];
  ACTIONS['media-remove'] = (el) => {
    const id = el.dataset.id; const u = me();
    if (u && (u.media || []).some((m) => m.id === id) && !(UI.pf && UI.pf.media && UI.pf.media.some((m) => m.id === id))) {
      return busy(async () => { putUser(await rpc('update_my_profile', { d: { ...userData(u), media: u.media.filter((m) => m.id !== id) }, org: null, region: null })); rerender(); });
    }
    return mediaRemove(el);
  };

  /* совет */
  ACTIONS['member-verify'] = (el) => busy(async () => { putUser(await rpc('verify_member', { uid: el.dataset.id, accept: true })); toast('Членство подтверждено', 'good'); rerender(); });
  ACTIONS['member-reject'] = (el) => {
    const u = U(el.dataset.id);
    confirmModal('Отклонить заявку?', `${u.name} не будет включён в состав совета. Профиль сотрудника сохранится.`, 'Отклонить', () => busy(async () => { putUser(await rpc('verify_member', { uid: u.id, accept: false })); rerender(); }), true);
  };
  ACTIONS['council-role'] = (el) => busy(async () => {
    try { putUser(await rpc('set_council_role', { uid: el.dataset.id, cr: el.value })); toast('Должность обновлена', 'good'); } catch (e) { rerender(); }
  });
  ACTIONS['company-edit'] = (el) => {
    const o = O(el.dataset.id);
    openModal({
      title: 'Профиль компании', body: `<form class="form">${fld('Описание компании и совета', txa('co-about', o.about, 6))}${fld('Отрасль', inp('co-sector', o.sector))}${fld('Год создания совета', inp('co-founded', o.council.founded || '', 'type="number" min="1990" max="2030"'))}</form>`,
      actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить', cls: 'primary', fn: () => busy(async () => {
        const row = await rpc('update_org_profile', { o: o.id, about: $('#co-about').value.trim(), sector: $('#co-sector').value.trim(), founded: +$('#co-founded').value || null });
        const i = DB.orgs.findIndex((x) => x.id === o.id); DB.orgs[i] = ROW.org(row); commit(); closeModal(); toast('Профиль компании сохранён', 'good'); rerender();
      }) }]
    });
  };

  /* личные достижения */
  FORMS.achievement = (form, e) => busy(async () => {
    const mode = (e.submitter && e.submitter.value) || 'draft'; const a = UI.af;
    const errs = [];
    if (!a.title.trim()) errs.push('название');
    if (mode === 'submit') { if ((a.type === 'volunteer' || a.type === 'social') && !(+a.hours > 0)) errs.push('количество часов'); if (!a.files.length) errs.push('подтверждающий документ'); }
    if (errs.length) { toast('Заполните: ' + errs.join(', '), 'bad'); return; }
    const payload = { id: a.id || uid('a'), type: a.type, title: a.title.trim(), date: a.date, hours: +a.hours || 0, org: a.org, desc: a.desc, files: a.files };
    if (mode === 'submit') { const dup = findDuplicate({ ...payload, userId: me().id }); if (dup) { toast('Такое достижение уже учтено: одна активность не засчитывается дважды', 'bad'); return; } }
    let row = await rpc('save_achievement', { a: payload });
    if (mode === 'submit') row = await rpc('submit_activity', { kind: 'achievement', eid: payload.id });
    putRow('achievement', row);
    UI.af = null; toast(mode === 'submit' ? 'Отправлено на проверку независимому эксперту' : 'Черновик сохранён', 'good');
    UI.tabs['pr-' + me().id] = 'mine'; go('me');
  });
  ACTIONS.appeal = (el) => {
    const x = findEntity(el.dataset.id); const kind = entityType(x);
    openModal({
      title: 'Оспорить оценку', body: `<p class="lead">«${esc(x.title)}» — ${esc(STATUS[x.status].label.toLowerCase())}.</p><p class="note">Апелляцию рассматривает администратор. При обоснованных доводах назначается повторная экспертиза другим экспертом.</p>${fld('Основание для пересмотра', txa('ap-reason', '', 4), '', true)}`,
      actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Подать апелляцию', cls: 'primary', fn: () => busy(async () => {
        const row = await rpc('create_appeal', { kind, eid: x.id, reason: $('#ap-reason').value.trim() });
        DB.appeals.push(ROW.appeal(row)); await refetch(kind, x.id); closeModal(); toast('Апелляция отправлена администратору', 'good'); rerender();
      }) }]
    });
  };

  /* уведомления */
  ACTIONS['notif-read-all'] = () => busy(async () => { await tbl(sb.from('notifications').update({ read: true }).eq('user_id', me().id)); myNotifications().forEach((n) => { n.read = true; }); commit(); rerender(); });
  ACTIONS['notif-open'] = (el) => { const n = DB.notifications.find((x) => String(x.id) === el.dataset.id); if (n && !n.read) { n.read = true; commit(); sb.from('notifications').update({ read: true }).eq('id', n.id).then(() => {}, () => {}); } go((n && n.link ? n.link : '#notifications').slice(1)); };

  /* проекты */
  FORMS.comment = (form) => busy(async () => { const text = formData(form).text; if (!text) return; putRow('project', await rpc('add_comment', { eid: form.dataset.id, txt: text })); rerender(); });
  ACTIONS['project-submit'] = (el) => {
    const p = DB.projects.find((x) => x.id === el.dataset.id);
    const errs = validateProject(p, true);
    if (errs.length) { UI.pf = JSON.parse(JSON.stringify(p)); UI.pfErrors = errs; go('project-edit-' + p.id); toast('Заполните обязательные поля перед отправкой', 'bad'); return; }
    return busy(async () => { putRow('project', await rpc('submit_activity', { kind: 'project', eid: p.id })); toast('Проект отправлен независимому эксперту', 'good'); rerender(); });
  };
  FORMS.project = (form, e) => busy(async () => {
    const mode = (e.submitter && e.submitter.value) || 'draft'; const p = UI.pf;
    p.team.forEach((x) => { x.share = +x.share || 0; });
    const errs = validateProject(p, mode === 'submit');
    if (errs.length) { UI.pfErrors = errs; rerender(); window.scrollTo(0, 0); toast('Проверьте обязательные поля', 'bad'); return; }
    const payload = { title: p.title, orgId: p.orgId, regionId: p.regionId, category: p.category, start: p.start, end: p.end, leaderId: p.leaderId, initiatorId: p.initiatorId, team: p.team, desc: p.desc, goal: p.goal, problem: p.problem, participants: +p.participants || 0, reach: +p.reach || 0, volunteerHours: +p.volunteerHours || 0, results: p.results, kpis: p.kpis.filter((k) => String(k.name).trim()).map((k) => ({ ...k, plan: +k.plan || 0, fact: +k.fact || 0 })), effectType: p.effectType, effect: p.effect, media: p.media, partners: p.partners, partnerOrgIds: p.partnerOrgIds, id: p.id || uid('p') };
    if (mode === 'submit') { const dup = findDuplicate({ ...payload, id: payload.id }); if (dup) { UI.pfErrors = [`Похожий проект уже учтён: «${dup.title}» (${orgLabel(dup.orgId)}). Одна активность не засчитывается дважды.`]; rerender(); return; } }
    let row = await rpc('save_project', { p: payload });
    if (mode === 'submit') { try { row = await rpc('submit_activity', { kind: 'project', eid: payload.id }); } catch (err) { putRow('project', row); UI.pf = null; go('project-' + payload.id); return; } }
    putRow('project', row);
    UI.pf = null; UI.pfErrors = null; UI.pfOrg = null;
    toast(mode === 'submit' ? 'Проект отправлен на проверку независимому эксперту' : 'Черновик сохранён', 'good');
    go('project-' + payload.id);
  });

  /* мероприятия */
  ACTIONS['ev-reg'] = (el) => busy(async () => { putRow('event', await rpc('event_register', { eid: el.dataset.id, on_: true })); toast('Вы зарегистрированы', 'good'); rerender(); });
  ACTIONS['ev-unreg'] = (el) => busy(async () => { putRow('event', await rpc('event_register', { eid: el.dataset.id, on_: false })); toast('Регистрация отменена'); rerender(); });
  const eventPayload = (e) => ({ id: e.id, title: e.title, orgId: e.orgId, regionId: e.regionId, date: e.date, time: e.time, place: e.place, category: e.category, desc: e.desc, organizers: e.organizers, capacity: +e.capacity || 50, attended: +e.attended || 0, summary: e.summary || '', media: e.media || [] });
  FORMS['ev-report'] = (form) => busy(async () => {
    const e = DB.events.find((x) => x.id === form.dataset.id); const r = UI.evr;
    const errs = [];
    if (!(+r.attended > 0)) errs.push('количество пришедших');
    if (!String(r.summary).trim()) errs.push('итоги');
    if (!r.media.some((m) => m.kind !== 'photo')) errs.push('лист регистрации (документ)');
    if (errs.length) { toast('Заполните: ' + errs.join(', '), 'bad'); return; }
    await rpc('save_event', { e: eventPayload({ ...e, attended: +r.attended, summary: r.summary, media: r.media }) });
    putRow('event', await rpc('submit_activity', { kind: 'event', eid: e.id }));
    UI.evr = null; toast('Итоги отправлены на подтверждение эксперту', 'good'); rerender();
  });
  FORMS.event = () => busy(async () => {
    const e = UI.ef; const u = me();
    if (!e.title.trim() || !e.date || !e.place.trim()) { toast('Заполните название, дату и место', 'bad'); return; }
    if (u.role === 'regional' && e.regionId !== u.regionId) { toast('Региональный председатель добавляет мероприятия только своего региона', 'bad'); return; }
    const id = e.id || uid('e');
    if (!e.id) { const dup = findDuplicate({ ...e, id }); if (dup) { toast(`Такое мероприятие уже есть: «${dup.title}», ${fmtDate(dup.date)}`, 'bad'); return; } }
    putRow('event', await rpc('save_event', { e: eventPayload({ ...e, id }) }));
    UI.ef = null; toast('Мероприятие сохранено', 'good'); go('event-' + id);
  });

  /* экспертиза */
  ACTIONS['ex-conflicts'] = () => {
    const u = me();
    openModal({
      title: 'Декларация конфликта интересов', wide: true,
      body: `<p class="note">Отметьте организации, с которыми у вас есть конфликт интересов. Заявки этих организаций и их филиалов вам назначаться не будут.</p><div class="checks">${DB.orgs.filter((o) => o.type !== 'subsidiary').map((o) => `<label class="check"><input type="checkbox" name="cf" value="${o.id}" ${(u.conflicts || []).includes(o.id) || u.companyId === o.id ? 'checked' : ''} ${u.companyId === o.id ? 'disabled' : ''}><span>${esc(o.full)}${u.companyId === o.id ? ' — ваша организация' : ''}</span></label>`).join('')}</div>`,
      actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить декларацию', cls: 'primary', fn: () => busy(async () => {
        const n = await rpc('set_my_conflicts', { orgs: $$('input[name=cf]:checked:not(:disabled)').map((i) => i.value) });
        await liveLoad(); closeModal(); toast(n ? `Декларация сохранена, переназначено заявок: ${n}` : 'Декларация сохранена', 'good'); rerender();
      }) }]
    });
  };
  ACTIONS['rv-take'] = (el) => busy(async () => { const x = findEntity(el.dataset.id); putRow(entityType(x), await rpc('review_take', { kind: entityType(x), eid: x.id })); UI.rv = null; toast('Заявка взята в работу', 'good'); rerender(); });
  ACTIONS['rv-decline'] = (el) => {
    const x = findEntity(el.dataset.id);
    confirmModal('Заявить конфликт интересов?', 'Заявка будет передана другому эксперту без конфликта. Действие фиксируется в журнале аудита.', 'Передать заявку', () => busy(async () => { await rpc('review_decline', { kind: entityType(x), eid: x.id }); await liveLoad(); go('expert'); }));
  };
  FORMS.review = (form, e) => {
    const x = findEntity(form.dataset.id); const r = UI.rv; const d = (e.submitter && e.submitter.value) || 'confirmed'; const kind = entityType(x);
    if (d !== 'confirmed' && String(r.comment || '').trim().length < 10) { toast('Опишите причину в комментарии (от 10 знаков)', 'bad'); return; }
    const rv = { scores: kind === 'achievement' ? { relevance: 8, results: 8, evidence: 8, reach: 8, kpi: 8 } : Object.fromEntries(Object.entries(r.scores).map(([k, v]) => [k, +v])), comment: String(r.comment || '').trim() };
    if (kind === 'project') { rv.verifiedReach = Math.max(0, +r.verifiedReach || 0); if (x.volunteerHours) rv.verifiedHours = Math.max(0, +r.verifiedHours || 0); }
    if (kind === 'event') rv.verifiedAttended = Math.max(0, +r.verifiedAttended || 0);
    if (kind === 'achievement' && x.hours) rv.verifiedHours = Math.max(0, Math.min(+r.verifiedHours || 0, x.hours));
    const run = () => busy(async () => {
      const before = snapshotRatings();
      const labels = { confirmed: 'Подтверждено экспертом', rejected: 'Отклонено экспертом', needs_info: 'Запрошены уточнения' };
      const obj = putRow(kind, await rpc('review_decide', { kind, eid: x.id, decision: d, rv }));
      const after = snapshotRatings();
      const rows = ratingDiffRows(before, after, `${labels[d]}: «${obj.title}»`);
      await logRating(rows);
      const texts = { confirmed: 'подтверждена', rejected: 'отклонена', needs_info: 'требует уточнений' };
      const people = uniq([...entityOwners(obj), ...(kind === 'project' ? obj.team.map((t0) => t0.userId) : [])]);
      const notes = people.map((id) => {
        let msg = `Активность «${obj.title}» ${texts[d]}.`;
        const ch = rows.find((z) => z.kind === 'person' && z.id === id);
        if (ch) msg += ch.from < 0.05 ? ` Вы вошли в рейтинг: ${fmt1(ch.to)} баллов, место ${ch.rankTo}.` : ` Ваш рейтинг: ${fmt1(ch.from)} → ${fmt1(ch.to)} баллов` + (ch.rankFrom && ch.rankTo ? `, место ${ch.rankFrom} → ${ch.rankTo}.` : '.');
        return { user_id: id, text: msg, link: entityLink(obj) };
      });
      const org = O(entityOrg(obj)); if (org && org.council.chairId && !people.includes(org.council.chairId)) notes.push({ user_id: org.council.chairId, text: `Активность совета «${obj.title}» ${texts[d]}.`, link: entityLink(obj) });
      await liveNotify(notes);
      UI.rv = null;
      const oc = rows.find((z) => z.kind === 'org' && z.id === entityOrg(obj));
      toast(d === 'confirmed' ? `Подтверждено. ${oc ? `${orgLabel(oc.id)}: ${fmt1(oc.from)} → ${fmt1(oc.to)} баллов.` : ''} Рейтинги пересчитаны.` : d === 'rejected' ? 'Активность отклонена, автор уведомлён' : 'Автору отправлен запрос уточнений', 'good');
      go('expert');
    });
    if (d === 'rejected') confirmModal('Отклонить активность?', 'Автор получит уведомление с вашим комментарием и сможет подать апелляцию.', 'Отклонить', run, true); else run();
  };

  /* новости и база знаний */
  ACTIONS['news-toggle'] = (el) => busy(async () => { const n = DB.news.find((x) => x.id === el.dataset.id); await tbl(sb.from('news').update({ published: !n.published }).eq('id', n.id)); n.published = !n.published; audit(n.published ? 'Публикация материала' : 'Снятие материала с публикации', 'news', n.id, n.title); commit(); rerender(); });
  ACTIONS['news-new'] = () => {
    const u = me();
    const orgs = u.role === 'admin' ? DB.orgs : DB.orgs.filter((o) => rootOf(o.id) === rootOf(u.companyId));
    UI.nf = { cover: null };
    openModal({
      title: 'Новый материал', wide: true,
      body: `<form class="form"><div class="form-grid">${fld('Тип материала', sel('nf-kind', Object.entries(NEWS_KINDS), 'news'))}${fld('Организация', sel('nf-org', orgs.map((o) => [o.id, o.name]), u.companyId && orgs.some((o) => o.id === u.companyId) ? u.companyId : orgs[0].id))}</div>${fld('Заголовок', inp('nf-title', '', 'maxlength="120" required'), '', true)}${fld('Лид', txa('nf-lead', '', 2, 'maxlength="240"'), 'Одно-два предложения о главном', true)}${fld('Текст', txa('nf-body', '', 7), 'Абзацы разделяйте пустой строкой', true)}<label class="drop">${icon('image', 20)}<span><b id="nf-cover-l">Обложка (необязательно)</b><small>JPG или PNG</small></span><input type="file" accept="image/*" hidden data-upload="news-cover"></label></form>`,
      actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Опубликовать', cls: 'primary', fn: () => busy(async () => {
        const title = $('#nf-title').value.trim(), lead = $('#nf-lead').value.trim(), body = $('#nf-body').value.trim();
        if (!title || !lead || !body) { toast('Заполните заголовок, лид и текст', 'bad'); return; }
        const id = uid('n');
        const row = { id, org_id: $('#nf-org').value, author_id: u.id, kind: $('#nf-kind').value, published: true, news_date: todayISO(), data: { title, lead, body: body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean), cover: UI.nf.cover, views: 0 } };
        await tbl(sb.from('news').insert(row));
        DB.news.push(ROW.news(row)); audit('Публикация материала', 'news', id, title); commit(); closeModal(); toast('Материал опубликован', 'good'); go('news-' + id);
      }) }]
    });
  };
  ACTIONS['kb-new'] = () => openModal({
    title: 'Новый материал базы знаний', wide: true,
    body: `<form class="form"><div class="form-grid">${fld('Тип', sel('kb-k', Object.entries(KB_KINDS), 'method'))}${fld('Организация', sel('kb-o', orgOptions(), me().companyId || headId()))}</div>${fld('Название', inp('kb-t', '', 'required'), '', true)}${fld('Краткое описание', inp('kb-d', ''), '', true)}${fld('Содержание', txa('kb-c', '', 8))}</form>`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Добавить', cls: 'primary', fn: () => busy(async () => {
      const title = $('#kb-t').value.trim(), desc = $('#kb-d').value.trim();
      if (!title || !desc) { toast('Заполните название и описание', 'bad'); return; }
      const row = { id: uid('k'), kind: $('#kb-k').value, org_id: $('#kb-o').value, author_id: me().id, data: { title, desc, content: $('#kb-c').value.trim() || `# ${title}\n\n${desc}`, date: todayISO(), tags: [] } };
      await tbl(sb.from('knowledge').insert(row));
      DB.knowledge.push(ROW.kb(row)); audit('Добавление материала в базу знаний', 'kb', row.id, title); commit(); closeModal(); toast('Материал добавлен', 'good'); rerender();
    }) }]
  });

  /* администрирование */
  ACTIONS['user-role'] = (el) => busy(async () => { try { await rpc('admin_set_role', { uid: el.dataset.id, r: el.value }); toast('Роль изменена', 'good'); } finally { await liveLoad(); rerender(); } });
  ACTIONS['user-block'] = (el) => busy(async () => { const u = U(el.dataset.id); putUser(await rpc('admin_set_blocked', { uid: u.id, b: !u.blocked })); rerender(); });
  ACTIONS['assign-expert'] = (el) => busy(async () => { const x = findEntity(el.dataset.id); try { putRow(entityType(x), await rpc('admin_assign', { kind: entityType(x), eid: x.id, expert: el.value || null })); toast('Назначение сохранено', 'good'); } finally { rerender(); } });
  ACTIONS['org-young'] = (el) => busy(async () => {
    const o = O(el.dataset.id); const v = Math.max(1, Math.round(+el.value || 0));
    if (!v || v === o.young) return;
    const before = snapshotRatings(); const old = o.young;
    await tbl(sb.from('organizations').update({ young: v }).eq('id', o.id));
    o.young = v; commit();
    await logRating(ratingDiffRows(before, snapshotRatings(), `Численность молодёжи ${o.name}: ${old} → ${v}`));
    audit('Изменение численности молодёжи', 'org', o.id, `${old} → ${v}`);
    toast('Численность обновлена, рейтинг пересчитан', 'good'); rerender();
  });
  FORMS['org-add'] = (form) => busy(async () => {
    const d = formData(form);
    if (!d.name || !d.full || !(+d.young > 0)) { toast('Заполните название, полное наименование и численность', 'bad'); return; }
    const id = (d.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'org') + Math.random().toString(36).slice(2, 5);
    const row = { id, type: d.type, parent_id: d.type === 'subsidiary' ? d.parentId : headId(), name: d.name, full_name: d.full, region_id: d.regionId, sector: d.sector || '—', young: +d.young, about: `Молодёжный совет ${d.full}.` };
    await tbl(sb.from('organizations').insert(row));
    DB.orgs.push(ROW.org({ ...row, council: {} })); audit('Добавление организации', 'org', id, d.full); commit(); toast('Организация добавлена', 'good'); rerender();
  });
  FORMS['region-add'] = (form) => busy(async () => {
    const d = formData(form);
    if (!d.name || !d.city || !(+d.lat) || !(+d.lon)) { toast('Заполните все поля региона', 'bad'); return; }
    const row = { id: 'r' + Math.random().toString(36).slice(2, 6), name: d.name, city: d.city, lat: +d.lat, lon: +d.lon };
    await tbl(sb.from('regions').insert(row));
    DB.regions.push(ROW.region(row)); audit('Добавление региона', 'region', row.id, row.name); commit(); toast('Регион добавлен', 'good'); rerender();
  });
  ACTIONS['w-save'] = () => busy(async () => {
    const w = UI.aw; const cap = Math.max(1, +$('#w-cap').value || 12);
    const c = {}; const p = {};
    Object.keys(w.c).forEach((k) => { c[k] = +w.c[k] || 0; }); Object.keys(w.p).forEach((k) => { p[k] = +w.p[k] || 0; });
    const desc = COMPANY_COMPONENTS.map((x) => `${x.name} ${DB.settings.wCompany[x.k]}→${c[x.k]}`).join('; ');
    const before = snapshotRatings();
    await tbl(sb.from('settings').update({ w_company: c, w_person: p, info_cap: cap, updated_at: new Date().toISOString() }).eq('id', 1));
    DB.settings.wCompany = c; DB.settings.wPerson = p; DB.settings.infoCap = cap; commit();
    await logRating(ratingDiffRows(before, snapshotRatings(), 'Изменение весов методики'));
    audit('Изменение критериев рейтинга', 'settings', 'weights', desc);
    UI.aw = null; toast('Методика обновлена, рейтинги пересчитаны', 'good'); rerender();
  });
  ACTIONS['appeal-accept'] = (el) => busy(async () => { await rpc('resolve_appeal', { apid: el.dataset.id, accept: true, resolution: '' }); await liveLoad(); toast('Повторная экспертиза назначена', 'good'); rerender(); });
  ACTIONS['appeal-decline'] = (el) => openModal({
    title: 'Отклонить апелляцию', body: fld('Обоснование решения', txa('ad-res', '', 3), 'Заявитель увидит этот текст', true),
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Отклонить', cls: 'danger', fn: () => busy(async () => { await rpc('resolve_appeal', { apid: el.dataset.id, accept: false, resolution: $('#ad-res').value.trim() }); await liveLoad(); closeModal(); rerender(); }) }]
  });
  ACTIONS['export-json'] = () => saveFile('jastar-hub-data.json', JSON.stringify(omit(DB, ['session']), null, 2));
  ACTIONS['demo-seed'] = () => confirmModal('Загрузить тестовые данные?', 'В базу добавятся вымышленные участники, проекты, мероприятия и новости с пометкой «ТЕСТ». Их можно удалить одной кнопкой.', 'Загрузить', () => busy(seedLive));
  ACTIONS['demo-purge'] = () => confirmModal('Удалить тестовые данные?', 'Будут удалены все записи с пометкой «ТЕСТ». Данные реальных пользователей не затрагиваются. Журнал аудита сохраняется.', 'Удалить', () => busy(async () => {
    const r = await rpc('purge_demo', {}); await liveLoad();
    toast(`Удалено: проектов ${r.projects}, мероприятий ${r.events}, профилей ${r.profiles}`, 'good'); rerender();
  }), true);
}

function liveDataTab() {
  const demo = DB.users.filter((u) => u.demo).length;
  const real = DB.users.filter((u) => !u.demo).length;
  return `<div class="grid g2">${card('Общая база данных', `<p>Данные хранятся в Supabase (PostgreSQL, Франкфурт). Доступ ограничен правилами на уровне базы: изменения статусов, ролей и оценок выполняются только серверными функциями.</p><dl class="dl2"><div><dt>Зарегистрированных пользователей</dt><dd>${real}</dd></div><div><dt>Тестовых профилей</dt><dd>${demo}</dd></div><div><dt>Проектов</dt><dd>${DB.projects.length}</dd></div><div><dt>Мероприятий</dt><dd>${DB.events.length}</dd></div></dl>`)}
    ${card('Тестовые данные', `<p class="note">Для показа платформы можно загрузить вымышленные записи с пометкой «ТЕСТ» и удалить их перед запуском.</p><div class="btn-row">${demo ? `<button class="btn danger" data-act="demo-purge">${icon('trash', 16)}Удалить тестовые данные</button>` : `<button class="btn primary" data-act="demo-seed">${icon('download', 16)}Загрузить тестовые данные</button>`}<button class="btn" data-act="export-json">${icon('download', 16)}Экспорт данных (JSON)</button></div>`)}</div>`;
}

async function seedLive() {
  if (DB.users.some((u) => u.demo)) { toast('Тестовые данные уже загружены', 'warn'); return; }
  toast('Генерирую и загружаю тестовые данные…');
  const S = seedDB();
  const dataOf = (o, keys) => omit(o, keys);
  const profiles = S.users.filter((u) => u.role !== 'admin').map((u) => ({ id: u.id, role: u.role, org_id: u.companyId, region_id: u.regionId, council_role: u.councilRole, verified: u.verified, council_rejected: false, blocked: false, conflicts: u.conflicts || [], data: dataOf(u, [...USER_COLS, 'pass']), is_demo: true }));
  const projects = S.projects.map((p) => ({ id: p.id, org_id: p.orgId, region_id: p.regionId, category: p.category, status: p.status, created_by: p.createdBy, leader_id: p.leaderId, team_ids: uniq(p.team.map((x) => x.userId)), end_date: p.end, review: p.review, history: p.history, comments: p.comments || [], submitted_at: p.submittedAt || null, data: dataOf(p, ['id', 'orgId', 'regionId', 'category', 'status', 'createdBy', 'leaderId', 'review', 'history', 'comments', 'submittedAt', 'demo', 'companyId']), is_demo: true }));
  const events = S.events.map((e) => ({ id: e.id, org_id: e.orgId, region_id: e.regionId, category: e.category, status: e.status, created_by: e.createdBy || e.organizers[0], organizer_ids: e.organizers, registered: e.registered, event_date: e.date, review: e.review, history: e.history || [], data: dataOf(e, ['id', 'orgId', 'regionId', 'category', 'status', 'createdBy', 'organizers', 'registered', 'date', 'review', 'history', 'demo']), is_demo: true }));
  const achs = S.achievements.map((a) => ({ id: a.id, user_id: a.userId, status: a.status, ach_date: a.date, review: a.review, history: a.history || [], data: dataOf(a, ['id', 'userId', 'status', 'date', 'review', 'history', 'demo']), is_demo: true }));
  const news = S.news.map((n) => ({ id: n.id, org_id: n.orgId, author_id: n.authorId, kind: n.kind, published: n.published, news_date: n.date, data: dataOf(n, ['id', 'orgId', 'authorId', 'kind', 'published', 'date', 'demo']), is_demo: true }));
  const kb = S.knowledge.map((k) => ({ id: k.id, org_id: k.orgId, author_id: me().id, kind: k.kind, data: dataOf(k, ['id', 'orgId', 'authorId', 'kind', 'demo']), is_demo: true }));
  const appeals = S.appeals.map((a) => ({ id: 'apdemo' + a.id, entity_type: a.entityType, entity_id: a.entityId, user_id: a.userId, reason: a.reason, status: a.status, resolution: a.resolution, ts: a.ts, is_demo: true }));
  const fbRows = (S.feedback || []).map((f) => ({ id: 'fbdemo' + f.id, user_id: f.userId, kind: f.kind, subject: f.subject || '', body: f.body, section: f.section, target_type: f.targetType, target_id: f.targetId, is_public: f.isPublic, status: f.status, reply: f.reply || '', replied_by: f.repliedBy ? me().id : null, replied_at: f.repliedAt, contact: f.contact || {}, is_demo: true, created_at: f.createdAt }));
  const vacs = demoVacancies().map((v) => ({ id: 'vdemo' + v.id, org_id: v.orgId, title: v.title, city: v.city, kind: v.kind, url: v.url, deadline: v.deadline, description: v.description, status: v.status, created_by: me().id, is_demo: true }));
  const batches = [['profiles', profiles], ['projects', projects], ['events', events], ['achievements', achs], ['news', news], ['knowledge', kb], ['appeals', appeals], ['feedback', fbRows]];
  for (const [table, rows] of batches) {
    for (let i = 0; i < rows.length; i += 100) await tbl(sb.from(table).insert(rows.slice(i, i + 100)));
  }
  { const { error } = await sb.from('vacancies').insert(vacs); if (error) console.warn('Тестовые вакансии не загружены (нужна миграция 006):', error.message); }
  for (const o of S.orgs) {
    const cur = O(o.id); if (!cur) continue;
    const council = { ...cur.council, chairId: cur.council.chairId && U(cur.council.chairId) && !U(cur.council.chairId).demo ? cur.council.chairId : o.council.chairId, regionalReps: uniq([...(cur.council.regionalReps || []), ...(o.council.regionalReps || [])]), founded: cur.council.founded || o.council.founded };
    await tbl(sb.from('organizations').update({ council }).eq('id', o.id));
  }
  liveAuditLocal('Загрузка тестовых данных', 'settings', 'demo', `профилей ${profiles.length}, проектов ${projects.length}, мероприятий ${events.length}`);
  await liveLoad();
  toast(`Загружено: ${profiles.length} профилей, ${projects.length} проектов, ${events.length} мероприятий`, 'good');
  rerender();
}

/* ---------- запуск ---------- */
async function liveBoot() {
  document.body.classList.add('live');
  const strip = $('.demo-strip');
  if (strip) strip.innerHTML = '<b>ПИЛОТ</b> · Записи с пометкой «ТЕСТ» — демонстрационные. Данные хранятся в общей базе платформы.';
  $('#main').innerHTML = `<div class="page narrow">${emptyState('refresh', 'Загрузка данных…', 'Подключаюсь к базе платформы.')}</div>`;
  try {
    sb = window.supabase.createClient(LIVE_CFG.url, LIVE_CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });
    installLiveMedia(); installLiveApi(); installLiveActions();
    await liveLoad();
  } catch (e) {
    console.error(e);
    $('#main').innerHTML = `<div class="page narrow">${emptyState('alert', 'Не удалось подключиться к базе', 'Проверьте интернет-соединение и обновите страницу. ' + (e.message || ''), `<button class="btn" onclick="location.reload()">Обновить</button>`)}</div>`;
    return;
  }
  initTips();
  render();
  if (me() && me().blocked) { await api.signOut(); toast('Учётная запись заблокирована администратором', 'bad'); render(); }
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT' && DB.session.userId) { liveLoad().then(() => render()); } });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - LAST_LOAD > 60000 && !LIVE_BUSY && $('#modal').hidden) liveLoad().then(() => rerender()).catch(() => {});
  });
}
