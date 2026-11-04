/* =====================================================================
   Ядро: хранилище, доступ к данным, RBAC, рейтинги, аудит, уведомления.
   Слой API (api.*) повторяет будущие вызовы Supabase — при подключении
   бэкенда меняется только реализация этих функций.
   ===================================================================== */

const STORE_KEY = 'jastar-hub:v' + SCHEMA_VERSION;
let DB = null;
let DB_REV = 0;
let STORAGE_OK = true;
const IDX = { users: new Map(), orgs: new Map(), regions: new Map() };

function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.version === SCHEMA_VERSION) { DB = d; reindex(); return; }
    }
  } catch (e) { STORAGE_OK = false; }
  DB = seedDB();
  reindex();
  saveDB(true);
}
let _saveT = null;
function saveDB(now) {
  clearTimeout(_saveT);
  const run = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); STORAGE_OK = true; } catch (e) { STORAGE_OK = false; } };
  if (now) run(); else _saveT = setTimeout(run, 120);
}
function reindex() {
  IDX.users = new Map(DB.users.map((u) => [u.id, u]));
  IDX.orgs = new Map(DB.orgs.map((o) => [o.id, o]));
  IDX.regions = new Map(DB.regions.map((r) => [r.id, r]));
}
function commit() { DB_REV++; reindex(); saveDB(); _scoreCache.clear(); }

/* ---------- утилиты ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt = (n) => nf0.format(Math.round(n || 0));
const fmt1 = (n) => nf1.format(n || 0);
const pct = (n) => nf1.format(n || 0) + '%';
const uid = (p) => p + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);
const isoDate = (d) => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
const todayISO = () => isoDate(new Date());
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s.length <= 10 ? s + 'T12:00:00' : s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDT = (s) => { if (!s) return '—'; const d = new Date(s); return `${fmtDate(s)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const fmtSize = (b) => !b ? '' : b > 1048576 ? fmt1(b / 1048576) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ';
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + (f(x) || 0), 0);
const uniq = (a) => Array.from(new Set(a));
const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"'.,:;!?()–—-]/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- справочники ---------- */
const U = (id) => IDX.users.get(id);
const O = (id) => IDX.orgs.get(id);
const RG = (id) => IDX.regions.get(id);
const CAT = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
const rootOf = (id) => { const o = O(id); if (!o) return null; return o.type === 'subsidiary' ? o.parentId : o.id; };
const childrenOf = (id) => DB.orgs.filter((o) => o.parentId === id && o.type === 'subsidiary');
const familyOf = (id) => [id, ...childrenOf(id).map((o) => o.id)];
const orgLabel = (id) => (O(id) ? O(id).name : '—');
/* Структура группы: корпоративный центр (fund) → ДЗО (portfolio) → филиалы ДЗО (subsidiary) */
const headId = () => ((DB.orgs || []).find((o) => o.type === 'fund') || { id: 'se' }).id;
const orgTypeLabel = (o) => (!o ? '' : o.type === 'fund' ? 'Корпоративный центр' : o.type === 'portfolio' ? 'ДЗО' : 'Филиал ' + orgLabel(o.parentId));
const groupName = (o) => { const n = DB.orgs.filter((x) => x.parentId === o.id && x.type === 'subsidiary').length; return o.name + (n ? (n > 1 ? ' с филиалами' : ' с филиалом') : ''); };
const rootOptions = (allLabel) => [['', allLabel], ...DB.orgs.filter((o) => o.type !== 'subsidiary').map((o) => [o.id, groupName(o)])];
const ABBR = { se: 'СЭ', qgp: 'QGP', pves: 'ПВЭС', ewp: 'EWP', sge: 'SGE', shges: 'ШГЭС', mges: 'МГЭС', ukges: 'УКГЭС', bges: 'БГЭС', shulges: 'ШуГЭС', azhk: 'АЖК', azhkes: 'ЭС', ales: 'АлЭС', egres: 'ГРЭС1', egres2: 'ГРЭС2', esc: 'ESC', escoco: 'ОЦО', semey: 'СмЭ', oskemen: 'ОсЭ', ktec: 'КТЭЦ' };
const ORG_HUE = { se: 192, qgp: 150, pves: 168, ewp: 176, sge: 120, shges: 205, mges: 214, ukges: 222, bges: 230, shulges: 238, azhk: 32, ales: 4, egres: 268, egres2: 282, esc: 250, semey: 44, oskemen: 340, ktec: 20 };
function orgAbbr(o) {
  if (o.abbr) return o.abbr;
  if (ABBR[o.id]) return ABBR[o.id];
  const words = o.name.split(/[\s\-–]+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
  const caps = o.name.replace(/[^A-ZА-ЯЁӘҒҚҢӨҰҮҺІ]/g, '');
  return caps.length >= 2 ? caps.slice(0, 3) : o.name.slice(0, 2);
}

/* ---------- сессия и роли ---------- */
const ROLES = {
  admin: { name: 'Главный администратор платформы', short: 'Администратор' },
  chair: { name: 'Председатель Молодёжного совета', short: 'Председатель' },
  regional: { name: 'Региональный председатель', short: 'Региональный председатель' },
  member: { name: 'Участник', short: 'Участник' },
  expert: { name: 'Независимый эксперт', short: 'Эксперт' },
  guest: { name: 'Гость', short: 'Гость' }
};
const PERMS = {
  admin: ['*'],
  chair: ['project.create', 'event.create', 'news.create', 'kb.create', 'council.manage', 'member.verify', 'company.edit', 'analytics.view', 'profile.edit', 'achievement.create', 'event.register', 'appeal.create'],
  regional: ['project.create', 'event.create', 'news.create', 'members.region', 'analytics.view', 'profile.edit', 'achievement.create', 'event.register', 'appeal.create'],
  member: ['project.create', 'profile.edit', 'achievement.create', 'event.register', 'appeal.create'],
  expert: ['review.do', 'profile.edit'],
  guest: []
};
const me = () => (DB.session.userId ? U(DB.session.userId) : null);
const myRole = () => (me() ? me().role : 'guest');
function can(perm) {
  const p = PERMS[myRole()] || [];
  return p.includes('*') || p.includes(perm);
}
/* право редактирования проекта/мероприятия с учётом статуса и роли */
function canEditActivity(x) {
  const u = me(); if (!u) return false;
  if (u.role === 'admin') return true;
  const open = ['draft', 'needs_info', 'planned'].includes(x.status);
  if (!open) return false;
  if (x.createdBy === u.id || x.leaderId === u.id || (x.organizers || []).includes(u.id)) return true;
  if (u.role === 'chair' && familyOf(rootOf(u.companyId)).includes(x.orgId) && (rootOf(u.companyId) === u.companyId || u.companyId === x.orgId)) return true;
  if (u.role === 'regional' && x.regionId === u.regionId) return true;
  return false;
}
function canSeeActivity(x) {
  if (x.status === 'confirmed' || x.status === 'planned') return true;
  const u = me(); if (!u) return false;
  if (u.role === 'admin') return true;
  if (u.role === 'expert') return x.review && x.review.expertId === u.id;
  if (x.createdBy === u.id || x.leaderId === u.id || (x.team || []).some((t) => t.userId === u.id) || (x.organizers || []).includes(u.id)) return true;
  if (['chair', 'regional'].includes(u.role) && rootOf(x.orgId) === rootOf(u.companyId)) return true;
  if (u.role === 'regional' && x.regionId === u.regionId) return true;
  return false;
}
function isChairOf(orgId) {
  const u = me(); if (!u) return false;
  if (u.role === 'admin') return true;
  return u.role === 'chair' && (u.companyId === orgId || (rootOf(u.companyId) === u.companyId && rootOf(orgId) === u.companyId));
}

/* ---------- аудит и уведомления ---------- */
function audit(action, entityType, entityId, details) {
  const u = me();
  DB.audit.push({ id: uid('l'), ts: new Date().toISOString(), actorId: u ? u.id : 'guest', role: myRole(), action, entityType, entityId, details: details || '' });
}
function notify(userId, text, link) {
  if (!userId) return;
  DB.notifications.push({ id: uid('nt'), userId, ts: new Date().toISOString(), text, link: link || '', read: false });
}
const myNotifications = () => (me() ? DB.notifications.filter((n) => n.userId === me().id).sort((a, b) => b.ts.localeCompare(a.ts)) : []);

/* ---------- статусы ---------- */
const STATUS = {
  draft: { label: 'Черновик', tone: 'muted' },
  submitted: { label: 'Отправлено на проверку', tone: 'info' },
  in_review: { label: 'На рассмотрении', tone: 'accent' },
  needs_info: { label: 'Требуются уточнения', tone: 'warn' },
  confirmed: { label: 'Подтверждено', tone: 'good' },
  rejected: { label: 'Отклонено', tone: 'bad' },
  planned: { label: 'Запланировано', tone: 'info' }
};

/* =====================================================================
   МЕТОДИКА РЕЙТИНГА
   ===================================================================== */
const COMPANY_COMPONENTS = [
  { k: 'projects', name: 'Проекты и результативность', hint: 'Сумма качества подтверждённых проектов (оценка эксперта × выполнение KPI), делённая на √(численность/100)' },
  { k: 'reach', name: 'Охват и вовлечённость', hint: 'Доля уникально охваченных молодых сотрудников с учётом пересечений: 1 − e^(−подтверждённый охват / численность), %' },
  { k: 'social', name: 'Социальная деятельность', hint: 'Социальные, экологические и благотворительные проекты + подтверждённые волонтёрские часы на одного молодого сотрудника' },
  { k: 'prof', name: 'Профессиональное развитие', hint: 'Проекты проф. развития и наставничества + подтверждённые обучения на 100 молодых сотрудников' },
  { k: 'inter', name: 'Межкорпоративное взаимодействие', hint: 'Подтверждённые проекты с компаниями группы (балл получают все компании-участники)' },
  { k: 'innov', name: 'Инновации и инициативы', hint: 'Качество подтверждённых проектов категории «Инновации и цифровизация»' },
  { k: 'info', name: 'Информационная активность', hint: 'Опубликованные материалы, не более 12 за период — больше публикаций баллы не увеличивают' }
];
const PERSON_COMPONENTS = [
  { k: 'contrib', name: 'Личный вклад в проекты', hint: 'Качество каждого подтверждённого проекта × личная доля участника в команде' },
  { k: 'lead', name: 'Организация и лидерство', hint: 'Руководство подтверждёнными проектами и организация подтверждённых мероприятий' },
  { k: 'init', name: 'Реализованные инициативы', hint: 'Подтверждённые проекты, где сотрудник — автор инициативы' },
  { k: 'volunteer', name: 'Волонтёрство', hint: 'Подтверждённые волонтёрские часы (личные и доля в социальных проектах)' },
  { k: 'inter', name: 'Межкорпоративное взаимодействие', hint: 'Участие в подтверждённых проектах с другими компаниями группы' },
  { k: 'prof', name: 'Профессиональное развитие и наставничество', hint: 'Подтверждённые обучения, сертификаты и наставничество' }
];
const PERIODS = [
  { id: 'month', label: 'Месяц', m: 1 }, { id: 'quarter', label: 'Квартал', m: 3 }, { id: 'half', label: 'Полугодие', m: 6 },
  { id: 'year', label: 'Год', m: 12 }, { id: 'all', label: 'Весь период', m: 0 }
];
function periodRange(id, back = 0) {
  if (!id || id === 'all') {
    if (!back) return { from: null, to: null };
    const t = new Date(); t.setDate(t.getDate() - 30 * back); return { from: null, to: isoDate(t) };
  }
  const m = PERIODS.find((p) => p.id === id).m;
  const to = new Date(); to.setMonth(to.getMonth() - m * back);
  const from = new Date(to); from.setMonth(from.getMonth() - m);
  return { from: isoDate(from), to: isoDate(to) };
}
const inRange = (d, r) => !!d && (!r.from || d >= r.from) && (!r.to || d <= r.to);

const scoresAvg = (s) => (s ? (s.relevance + s.results + s.evidence + s.reach + s.kpi) / 5 : 0);
function kpiCompletion(p) {
  if (!p.kpis || !p.kpis.length) return 0.5;
  return sum(p.kpis, (k) => Math.min(1.2, k.plan ? k.fact / k.plan : 0)) / p.kpis.length;
}
/* качество проекта 0–10: оценка эксперта с поправкой на выполнение KPI. Фото на балл не влияют. */
function qProject(p) { return p.review && p.review.scores ? scoresAvg(p.review.scores) * (0.5 + 0.5 * Math.min(1, kpiCompletion(p))) : 0; }
function qEvent(e) { return e.review && e.review.scores ? scoresAvg(e.review.scores) * 0.4 : 0; }
const hasPartners = (p) => (p.partnerOrgIds || []).filter((x) => x !== p.orgId).length > 0 || p.category === 'inter';

/* Оценка доли уникально охваченных: участники разных активностей пересекаются, поэтому 1 − e^(−охват/численность). В рабочей версии — точный подсчёт по реестру участников. */
const uniqueShare = (reach, size) => (size > 0 ? 1 - Math.exp(-Math.max(0, reach) / size) : 0);
const _scoreCache = new Map();
function cached(key, fn) { if (_scoreCache.has(key)) return _scoreCache.get(key); const v = fn(); _scoreCache.set(key, v); return v; }

/* Рейтинг Молодёжных советов. level: 'all' — каждый совет отдельно; 'groups' — ДЗО вместе с филиалами */
function companyScores(opt = {}) {
  const o = { from: null, to: null, region: '', category: '', level: 'all', ...opt };
  return cached('c' + JSON.stringify(o), () => {
    const range = { from: o.from, to: o.to };
    const keyOf = (orgId) => (o.level === 'groups' ? rootOf(orgId) : orgId);
    const acc = new Map();
    const orgsIn = o.level === 'groups' ? DB.orgs.filter((x) => x.type !== 'subsidiary') : DB.orgs;
    orgsIn.forEach((x) => acc.set(x.id, { orgId: x.id, size: o.level === 'groups' ? sum(familyOf(x.id).map(O), (y) => y.young) : x.young, q: 0, qSocial: 0, qProf: 0, qInnov: 0, inter: 0, reach: 0, hours: 0, profCount: 0, news: 0, activities: 0, projects: 0, events: 0, regionHit: false }));
    const A = (orgId) => acc.get(keyOf(orgId));
    const catOk = (c) => !o.category || c === o.category;
    const regOk = (r) => !o.region || r === o.region;
    DB.projects.forEach((p) => {
      if (p.status !== 'confirmed' || !inRange(p.end, range) || !catOk(p.category) || !regOk(p.regionId)) return;
      const a = A(p.orgId); if (!a) return;
      const q = qProject(p);
      a.q += q; a.projects++; a.activities++; a.regionHit = true;
      a.reach += p.review.verifiedReach ?? p.reach;
      if (['social', 'charity', 'eco'].includes(p.category)) { a.qSocial += q; a.hours += p.review.verifiedHours ?? p.volunteerHours ?? 0; }
      if (['prof', 'edu'].includes(p.category)) a.qProf += q;
      if (p.category === 'innov') a.qInnov += q;
      if (hasPartners(p)) {
        const partners = uniq((p.partnerOrgIds || []).filter((x) => x !== p.orgId));
        a.inter += 1 + Math.min(3, partners.length) * 0.5;
        uniq(partners.map(keyOf)).forEach((k) => { if (k !== keyOf(p.orgId) && acc.get(k)) acc.get(k).inter += 1; });
      }
    });
    DB.events.forEach((e) => {
      if (e.status !== 'confirmed' || !inRange(e.date, range) || !catOk(e.category) || !regOk(e.regionId)) return;
      const a = A(e.orgId); if (!a) return;
      const q = qEvent(e);
      a.events++; a.activities++; a.regionHit = true;
      a.reach += e.review.verifiedAttended ?? e.attended;
      if (['social', 'charity', 'eco'].includes(e.category)) a.qSocial += q;
      if (['prof', 'edu'].includes(e.category)) a.qProf += q;
      if (e.category === 'innov') a.qInnov += q;
      if (e.category === 'inter') a.inter += 0.5;
    });
    DB.achievements.forEach((x) => {
      if (x.status !== 'confirmed' || !inRange(x.date, range)) return;
      const u = U(x.userId); if (!u || !u.companyId) return;
      if (!catOk(ACH_TYPES[x.type].cat) || !regOk(u.regionId)) return;
      const a = A(u.companyId); if (!a) return;
      a.activities++;
      if (x.type === 'volunteer' || x.type === 'social') a.hours += x.review?.verifiedHours ?? x.hours ?? 0;
      if (x.type === 'training' || x.type === 'mentoring') a.profCount++;
    });
    if (!o.category) DB.news.forEach((n) => {
      if (!n.published || !inRange(n.date, range)) return;
      const org = O(n.orgId); if (!org || !regOk(org.regionId)) return;
      const a = A(n.orgId); if (a) a.news++;
    });
    const rows = Array.from(acc.values()).map((a) => {
      const size = Math.max(a.size, 1);
      const s = Math.sqrt(Math.max(size, 30) / 100);
      const raw = {
        projects: a.q / s,
        reach: uniqueShare(a.reach, size) * 100,
        social: a.qSocial / s + (a.hours / size) * 10,
        prof: a.qProf / s + (a.profCount / size) * 50,
        inter: a.inter / s,
        innov: a.qInnov / s,
        info: (Math.min(a.news, DB.settings.infoCap) / DB.settings.infoCap) * 100
      };
      return { ...a, raw, engagement: uniqueShare(a.reach, size) * 100 };
    });
    const max = {};
    COMPANY_COMPONENTS.forEach(({ k }) => { max[k] = Math.max(0, ...rows.map((r) => r.raw[k])); });
    const w = DB.settings.wCompany;
    rows.forEach((r) => {
      r.comps = {};
      COMPANY_COMPONENTS.forEach(({ k }) => { r.comps[k] = max[k] > 0 ? (r.raw[k] / max[k]) * 100 : 0; });
      r.total = sum(COMPANY_COMPONENTS, ({ k }) => (r.comps[k] * (w[k] || 0)) / 100);
    });
    let out = rows;
    if (o.region) out = rows.filter((r) => r.regionHit || (O(r.orgId) && O(r.orgId).regionId === o.region));
    out.sort((a, b) => b.total - a.total || b.activities - a.activities || a.orgId.localeCompare(b.orgId));
    out.forEach((r, i) => { r.rank = i + 1; });
    return out;
  });
}

/* Индивидуальный рейтинг: только личный вклад, баллы компании сотруднику не передаются */
function personScores(opt = {}) {
  const o = { from: null, to: null, root: '', region: '', ...opt };
  return cached('p' + JSON.stringify(o), () => {
    const range = { from: o.from, to: o.to };
    const acc = new Map();
    DB.users.filter((u) => ['member', 'chair', 'regional'].includes(u.role) && !u.blocked).forEach((u) => acc.set(u.id, { userId: u.id, contrib: 0, lead: 0, init: 0, volunteer: 0, inter: 0, prof: 0, projects: 0, shares: [], events: 0 }));
    DB.projects.forEach((p) => {
      if (p.status !== 'confirmed' || !inRange(p.end, range)) return;
      const q = qProject(p);
      (p.team || []).forEach((t) => {
        const a = acc.get(t.userId); if (!a) return;
        a.contrib += (q * t.share) / 100; a.projects++; a.shares.push(t.share);
        if (hasPartners(p)) a.inter += 1;
        if (['social', 'charity', 'eco'].includes(p.category)) a.volunteer += ((p.review.verifiedHours ?? p.volunteerHours ?? 0) * t.share) / 100;
        if (['prof', 'edu'].includes(p.category)) a.prof += t.share / 100;
      });
      const l = acc.get(p.leaderId); if (l) l.lead += 2 + q * 0.5;
      const i = acc.get(p.initiatorId); if (i) i.init += q;
    });
    DB.events.forEach((e) => {
      if (e.status !== 'confirmed' || !inRange(e.date, range)) return;
      (e.organizers || []).forEach((id) => { const a = acc.get(id); if (a) { a.lead += 1.5; a.events++; } });
    });
    DB.achievements.forEach((x) => {
      if (x.status !== 'confirmed' || !inRange(x.date, range)) return;
      const a = acc.get(x.userId); if (!a) return;
      if (x.type === 'volunteer' || x.type === 'social') a.volunteer += x.review?.verifiedHours ?? x.hours ?? 0;
      if (x.type === 'training' || x.type === 'mentoring') a.prof += 1;
      if (x.type === 'award') a.prof += 0.5;
    });
    const rows = Array.from(acc.values());
    const max = {};
    PERSON_COMPONENTS.forEach(({ k }) => { max[k] = Math.max(0, ...rows.map((r) => r[k])); });
    const w = DB.settings.wPerson;
    rows.forEach((r) => {
      r.comps = {};
      PERSON_COMPONENTS.forEach(({ k }) => { r.comps[k] = max[k] > 0 ? (r[k] / max[k]) * 100 : 0; });
      r.total = sum(PERSON_COMPONENTS, ({ k }) => (r.comps[k] * (w[k] || 0)) / 100);
      r.avgShare = r.shares.length ? sum(r.shares) / r.shares.length : 0;
    });
    let out = rows;
    if (o.root) out = out.filter((r) => rootOf(U(r.userId).companyId) === o.root);
    if (o.region) out = out.filter((r) => U(r.userId).regionId === o.region);
    out.sort((a, b) => b.total - a.total || b.projects - a.projects || a.userId.localeCompare(b.userId));
    out.forEach((r, i) => { r.rank = i + 1; });
    return out;
  });
}

/* Позиции за предыдущий сопоставимый период — для стрелок ↑↓ */
function prevRanks(fn, opt, period) {
  const prev = periodRange(period, 1);
  const rows = fn({ ...opt, ...prev });
  const m = new Map(); rows.forEach((r) => m.set(r.orgId || r.userId, r.rank));
  return m;
}
/* Динамика места по месяцам (6 точек) */
function rankHistory(orgId, level = 'all') {
  return cached('h' + orgId + level, () => {
    const pts = [];
    for (let i = 5; i >= 0; i--) {
      const to = new Date(); to.setMonth(to.getMonth() - i);
      const rows = companyScores({ from: null, to: isoDate(to), level });
      const r = rows.find((x) => x.orgId === orgId);
      pts.push({ label: MONTHS[to.getMonth()], rank: r ? r.rank : null, total: r ? r.total : 0 });
    }
    return pts;
  });
}
function personBadges(userId) {
  return cached('b' + userId, () => {
    const conf = DB.projects.filter((p) => p.status === 'confirmed');
    const led = conf.filter((p) => p.leaderId === userId).length;
    const init = conf.filter((p) => p.initiatorId === userId).length;
    const inter = conf.filter((p) => hasPartners(p) && p.team.some((t) => t.userId === userId)).length;
    const ach = DB.achievements.filter((a) => a.userId === userId && a.status === 'confirmed');
    const vol = sum(ach.filter((a) => a.type === 'volunteer' || a.type === 'social'), (a) => a.hours);
    const mentor = ach.some((a) => a.type === 'mentoring');
    const org = DB.events.filter((e) => e.status === 'confirmed' && (e.organizers || []).includes(userId)).length;
    const rank = (personScores().find((r) => r.userId === userId) || {}).rank;
    const b = [];
    if (rank && rank <= 10) b.push({ id: 'top10', label: 'ТОП-10 лидеров', icon: 'trophy' });
    if (led) b.push({ id: 'leader', label: 'Руководитель проекта', icon: 'flag' });
    if (init >= 2) b.push({ id: 'initiator', label: 'Автор инициатив', icon: 'bulb' });
    if (inter) b.push({ id: 'inter', label: 'Межкорпоративные проекты', icon: 'link' });
    if (vol >= 40) b.push({ id: 'volunteer', label: 'Волонтёр 40+ часов', icon: 'hand' });
    if (mentor) b.push({ id: 'mentor', label: 'Наставник', icon: 'book' });
    if (org >= 2) b.push({ id: 'organizer', label: 'Организатор мероприятий', icon: 'calendar' });
    return b;
  });
}

/* История изменений рейтинга: фиксируем каждое изменение баллов и мест */
function snapshotRatings() {
  const c = new Map(); companyScores().forEach((r) => c.set(r.orgId, { t: r.total, r: r.rank }));
  const p = new Map(); personScores().forEach((r) => p.set(r.userId, { t: r.total, r: r.rank }));
  return { c, p };
}
function withRatingDiff(reason, fn) {
  const before = snapshotRatings();
  fn();
  commit();
  const after = snapshotRatings();
  const ts = new Date().toISOString();
  const changes = { orgs: [], people: [] };
  after.c.forEach((v, id) => {
    const b = before.c.get(id) || { t: 0, r: null };
    if (Math.abs(v.t - b.t) >= 0.05 || v.r !== b.r) { const row = { ts, kind: 'org', id, from: b.t, to: v.t, rankFrom: b.r, rankTo: v.r, reason }; DB.ratingLog.push(row); changes.orgs.push(row); }
  });
  after.p.forEach((v, id) => {
    const b = before.p.get(id) || { t: 0, r: null };
    if (Math.abs(v.t - b.t) >= 0.05) { const row = { ts, kind: 'person', id, from: b.t, to: v.t, rankFrom: b.r, rankTo: v.r, reason }; DB.ratingLog.push(row); changes.people.push(row); }
  });
  if (DB.ratingLog.length > 4000) DB.ratingLog = DB.ratingLog.slice(-4000);
  saveDB();
  return changes;
}

/* =====================================================================
   ЖИЗНЕННЫЙ ЦИКЛ ПРОВЕРКИ АКТИВНОСТИ
   ===================================================================== */
function entityType(x) { return x.id[0] === 'p' ? 'project' : x.id[0] === 'e' ? 'event' : 'achievement'; }
function entityOrg(x) { return x.orgId || (U(x.userId) ? U(x.userId).companyId : null); }
function entityTitle(x) { return x.title; }
function entityLink(x) { const t = entityType(x); return t === 'project' ? '#project-' + x.id : t === 'event' ? '#event-' + x.id : '#person-' + x.userId; }
function entityOwners(x) {
  const t = entityType(x);
  if (t === 'achievement') return [x.userId];
  if (t === 'event') return uniq([x.createdBy, ...(x.organizers || [])]);
  return uniq([x.createdBy, x.leaderId]);
}
function findEntity(id) {
  return DB.projects.find((x) => x.id === id) || DB.events.find((x) => x.id === id) || DB.achievements.find((x) => x.id === id);
}
function hasConflict(expert, orgId) {
  if (!expert || !orgId) return !!expert && false;
  const root = rootOf(orgId);
  const list = [...(expert.conflicts || [])];
  if (expert.companyId) list.push(expert.companyId);
  return list.some((c) => c === orgId || c === root || (rootOf(c) && rootOf(c) !== headId() && rootOf(c) === root));
}
const experts = () => DB.users.filter((u) => u.role === 'expert' && !u.blocked);
function expertLoad(id) {
  return [...DB.projects, ...DB.events, ...DB.achievements].filter((x) => x.review && x.review.expertId === id && ['submitted', 'in_review'].includes(x.status)).length;
}
function pickExpert(x, exclude = []) {
  const org = entityOrg(x);
  const pool = experts().filter((e) => !hasConflict(e, org) && !exclude.includes(e.id));
  if (!pool.length) return null;
  pool.sort((a, b) => expertLoad(a.id) - expertLoad(b.id));
  return pool[0];
}
/* Повторный учёт одной активности запрещён: ищем дубль по названию, организации и пересечению дат */
function findDuplicate(x) {
  const t = norm(x.title);
  const type = entityType(x);
  const list = type === 'project' ? DB.projects : type === 'event' ? DB.events : DB.achievements;
  return list.find((y) => {
    if (y.id === x.id || y.status === 'rejected' || y.status === 'draft') return false;
    if (norm(y.title) !== t) return false;
    if (type === 'achievement') return y.userId === x.userId && y.date === x.date;
    if (y.orgId !== x.orgId) return false;
    if (type === 'event') return y.date === x.date;
    return !(y.end < x.start || y.start > x.end);
  });
}
function submitForReview(x) {
  const u = me();
  const prev = x.status;
  x.status = 'submitted';
  x.submittedAt = new Date().toISOString();
  x.history = x.history || [];
  x.history.push({ ts: x.submittedAt, actorId: u.id, action: prev === 'needs_info' ? 'Уточнения отправлены, повторная проверка' : 'Отправлено на проверку' });
  if (!x.review || !x.review.expertId || prev !== 'needs_info') {
    const ex = pickExpert(x);
    x.review = { expertId: ex ? ex.id : null, scores: null, comment: '', assignedAt: x.submittedAt, decidedAt: null };
    if (ex) {
      x.history.push({ ts: x.submittedAt, actorId: 'system', action: 'Назначен эксперт: ' + ex.name + ' (без конфликта интересов)' });
      notify(ex.id, `Новая заявка на проверку: «${x.title}»`, '#review-' + x.id);
    } else x.history.push({ ts: x.submittedAt, actorId: 'system', action: 'Нет доступного эксперта без конфликта интересов — назначит администратор' });
  } else if (x.review.expertId) notify(x.review.expertId, `Получены уточнения по заявке «${x.title}»`, '#review-' + x.id);
  audit('Отправка на проверку', entityType(x), x.id, x.title);
  commit();
}
function takeInWork(x) {
  x.status = 'in_review';
  x.history.push({ ts: new Date().toISOString(), actorId: me().id, action: 'Взято на рассмотрение' });
  audit('Эксперт взял заявку в работу', entityType(x), x.id, x.title);
  entityOwners(x).forEach((id) => notify(id, `Заявка «${x.title}» на рассмотрении у эксперта`, entityLink(x)));
  commit();
}
function decide(x, decision, data) {
  const ex = me();
  const labels = { confirmed: 'Подтверждено экспертом', rejected: 'Отклонено экспертом', needs_info: 'Запрошены уточнения' };
  const owners = entityOwners(x);
  const teamIds = entityType(x) === 'project' ? uniq((x.team || []).map((t) => t.userId)) : [];
  const changes = withRatingDiff(`${labels[decision]}: «${x.title}»`, () => {
    x.status = decision;
    x.review = { ...(x.review || {}), ...data, expertId: ex.id, decidedAt: new Date().toISOString() };
    x.history.push({ ts: x.review.decidedAt, actorId: ex.id, action: labels[decision], note: data.comment || '' });
    audit(labels[decision], entityType(x), x.id, `${x.title}; средний балл ${fmt1(scoresAvg(data.scores))}` + (data.comment ? `; комментарий: ${data.comment}` : ''));
  });
  const texts = { confirmed: 'подтверждена', rejected: 'отклонена', needs_info: 'требует уточнений' };
  uniq([...owners, ...teamIds]).forEach((id) => {
    let msg = `Активность «${x.title}» ${texts[decision]}.`;
    const ch = changes.people.find((r) => r.id === id);
    if (ch) msg += ch.from < 0.05 ? ` Вы вошли в рейтинг: ${fmt1(ch.to)} баллов, место ${ch.rankTo}.` : ` Ваш рейтинг: ${fmt1(ch.from)} → ${fmt1(ch.to)} баллов` + (ch.rankFrom && ch.rankTo ? `, место ${ch.rankFrom} → ${ch.rankTo}.` : '.');
    notify(id, msg, entityLink(x));
  });
  const org = entityOrg(x);
  const chair = O(org) && O(org).council.chairId;
  if (chair && !owners.includes(chair)) notify(chair, `Активность совета «${x.title}» ${texts[decision]}.`, entityLink(x));
  saveDB();
  return changes;
}

/* ---------- медиа: IndexedDB с запасным вариантом в памяти ---------- */
const MEDIA = {
  db: null, urls: new Map(), mem: new Map(),
  async open() {
    if (this.db !== null) return this.db;
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open('jastar-media', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('m');
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
    } catch (e) { this.db = false; }
    return this.db;
  },
  async put(key, blob) {
    this.mem.set(key, blob);
    const db = await this.open(); if (!db) return;
    try { await new Promise((res, rej) => { const tx = db.transaction('m', 'readwrite'); tx.objectStore('m').put(blob, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch (e) { /* остаётся в памяти */ }
  },
  async get(key) {
    if (this.mem.has(key)) return this.mem.get(key);
    const db = await this.open(); if (!db) return null;
    try { return await new Promise((res, rej) => { const r = db.transaction('m').objectStore('m').get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); }); } catch (e) { return null; }
  },
  async url(key) {
    if (this.urls.has(key)) return this.urls.get(key);
    const b = await this.get(key); if (!b) return null;
    const u = URL.createObjectURL(b); this.urls.set(key, u); return u;
  },
  async clear() {
    this.mem.clear(); this.urls.clear();
    const db = await this.open(); if (!db) return;
    try { await new Promise((res) => { const tx = db.transaction('m', 'readwrite'); tx.objectStore('m').clear(); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { /* ignore */ }
  }
};
async function hydrateMedia(root = document) {
  for (const el of $$('[data-media]', root)) {
    const u = await MEDIA.url(el.dataset.media);
    if (!u) continue;
    if (el.tagName === 'IMG') { el.src = u; el.closest('.ph')?.classList.add('has-img'); }
    else if (el.tagName === 'VIDEO') el.src = u;
  }
}
async function resizeImage(file, max = 1280, q = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', q));
  } catch (e) { return file; } finally { URL.revokeObjectURL(url); }
}
/* Ключ файла: в демо — локальный ключ, в общей базе — путь в хранилище с папкой пользователя */
function newMediaKey(name, kind) {
  if (typeof LIVE !== 'undefined' && LIVE && me()) {
    const ext = (String(name || '').match(/\.[a-z0-9]{1,6}$/i) || [''])[0].toLowerCase();
    return (kind === 'avatar' ? 'avatars/' : 'files/') + me().id + '/' + uid('f') + ext;
  }
  return uid(kind === 'avatar' ? 'ava' : 'blob');
}
/* Приём файлов: фото сжимаются, видео до 40 МБ, документы до 15 МБ */
async function acceptFiles(fileList, opts = {}) {
  const out = []; const errs = [];
  for (const f of Array.from(fileList || [])) {
    const isImg = /^image\//.test(f.type);
    const isVid = /^video\//.test(f.type);
    if (isVid && f.size > 40 * 1048576) { errs.push(`${f.name}: видео больше 40 МБ`); continue; }
    if (!isImg && !isVid && f.size > 15 * 1048576) { errs.push(`${f.name}: файл больше 15 МБ`); continue; }
    const key = newMediaKey(isImg ? 'photo.jpg' : f.name);
    const blob = isImg ? await resizeImage(f, opts.max || 1280) : f;
    try { await MEDIA.put(key, blob); } catch (e) { errs.push(`${f.name}: не удалось загрузить (${e.message || e})`); continue; }
    const kind = opts.kind || (isImg ? 'photo' : isVid ? 'video' : /presentation|pptx?$/i.test(f.type + f.name) ? 'presentation' : 'doc');
    out.push({ id: uid('m'), kind, name: f.name, size: blob.size, key, type: f.type, uploadedAt: new Date().toISOString() });
  }
  if (errs.length) toast(errs.join('; '), 'bad');
  return out;
}

/* ---------- скачивание файлов через возможность downloads ---------- */
let DL = null;
(async () => { try { DL = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { DL = null; } })();
async function saveFile(filename, data) {
  if (!DL) {
    if (!window.claude) {
      /* самостоятельный хостинг (GitHub Pages, локальный файл): обычное скачивание браузером */
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('Файл сохранён: ' + filename, 'good');
      return true;
    }
    toast('Скачивание пока недоступно, попробуйте через пару секунд', 'warn'); return false;
  }
  try { await DL.save({ filename, data }); toast('Файл передан на сохранение: ' + filename, 'good'); return true; }
  catch (e) {
    if (e && e.code === 'declined') toast('Сохранение отменено');
    else if (e && e.code === 'rate_limited') toast('Предыдущее окно сохранения ещё открыто', 'warn');
    else toast('Не удалось сохранить файл', 'bad');
    return false;
  }
}
function loadScript(src) {
  return new Promise((res, rej) => {
    if ($(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src));
    document.head.appendChild(s);
  });
}
const LIBS = {
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
};
async function exportXlsx(filename, sheets) {
  try { await loadScript(LIBS.xlsx); } catch (e) { toast('Не удалось загрузить модуль Excel', 'bad'); return; }
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = (rows[0] || []).map((_, i) => ({ wch: Math.min(48, Math.max(10, ...rows.slice(0, 60).map((r) => String(r[i] ?? '').length + 2))) }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  await saveFile(filename, new Blob([buf]));
}
async function exportPdf(filename, node) {
  try { await loadScript(LIBS.h2c); await loadScript(LIBS.jspdf); } catch (e) { toast('Не удалось загрузить модуль PDF', 'bad'); return; }
  toast('Формирую PDF…');
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pw = 210, ph = 297, m = 10;
  const iw = pw - 2 * m;
  const pxPerMm = canvas.width / iw;
  const pageHpx = Math.floor((ph - 2 * m) * pxPerMm);
  let y = 0, first = true;
  while (y < canvas.height) {
    const h = Math.min(pageHpx, canvas.height - y);
    const c = document.createElement('canvas'); c.width = canvas.width; c.height = h;
    c.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!first) pdf.addPage();
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, iw, h / pxPerMm);
    first = false; y += h;
  }
  await saveFile(filename, pdf.output('blob'));
}

/* ---------- локализация (архитектура: ru — полностью, kk/en — интерфейс навигации) ---------- */
const I18N = {
  ru: { feedback: 'Обратная связь', home: 'Главная', companies: 'Организации и советы', people: 'Участники', projects: 'Проекты', events: 'Мероприятия', rating: 'Рейтинг советов', leaders: 'ТОП-100 лидеров', expert: 'Экспертиза', news: 'Новости и медиа', knowledge: 'База знаний', analytics: 'Аналитика', admin: 'Администрирование', me: 'Личный кабинет', methodology: 'Методика рейтинга', search: 'Поиск: люди, проекты, организации', login: 'Войти', register: 'Регистрация', logout: 'Выйти', notifications: 'Уведомления', compare: 'Сравнение советов', g_main: 'Платформа', g_rating: 'Рейтинги', g_work: 'Управление', demo: 'Демо-версия: все люди, показатели и рейтинги тестовые', slogan: 'Одна молодёжь. Единые возможности. Общие результаты.' },
  kk: { feedback: 'Кері байланыс', home: 'Басты бет', companies: 'Ұйымдар мен кеңестер', people: 'Қатысушылар', projects: 'Жобалар', events: 'Іс-шаралар', rating: 'Кеңестер рейтингі', leaders: 'ТОП-100 көшбасшы', expert: 'Сараптама', news: 'Жаңалықтар мен медиа', knowledge: 'Білім базасы', analytics: 'Аналитика', admin: 'Әкімшілік', me: 'Жеке кабинет', methodology: 'Рейтинг әдістемесі', search: 'Іздеу: адамдар, жобалар, ұйымдар', login: 'Кіру', register: 'Тіркелу', logout: 'Шығу', notifications: 'Хабарламалар', compare: 'Кеңестерді салыстыру', g_main: 'Платформа', g_rating: 'Рейтингтер', g_work: 'Басқару', demo: 'Демо-нұсқа: барлық адамдар, көрсеткіштер мен рейтингтер сынақтық', slogan: 'Бір жастар. Бірыңғай мүмкіндіктер. Ортақ нәтижелер.' },
  en: { feedback: 'Feedback', home: 'Home', companies: 'Organizations & councils', people: 'People', projects: 'Projects', events: 'Events', rating: 'Council rating', leaders: 'Top-100 leaders', expert: 'Expert review', news: 'News & media', knowledge: 'Knowledge base', analytics: 'Analytics', admin: 'Administration', me: 'My profile', methodology: 'Rating methodology', search: 'Search people, projects, organizations', login: 'Sign in', register: 'Sign up', logout: 'Sign out', notifications: 'Notifications', compare: 'Compare councils', g_main: 'Platform', g_rating: 'Ratings', g_work: 'Management', demo: 'Demo: all people, figures and ratings are test data', slogan: 'One youth. Shared opportunities. Common results.' }
};
const t = (k) => (I18N[DB.lang] && I18N[DB.lang][k]) || I18N.ru[k] || k;

/* ---------- API-слой (точка подключения Supabase) ---------- */
const api = {
  async hash(s) {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('jastar:' + s)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let h = 0; for (const c of 'jastar:' + s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'h' + h; }
  },
  async signUp(data) {
    const email = data.email.trim().toLowerCase();
    if (DB.users.some((u) => u.email === email)) throw new Error('Пользователь с таким e-mail уже зарегистрирован');
    const u = {
      id: uid('u'), email, pass: await api.hash(data.password), name: data.name, position: data.position, companyId: data.companyId,
      dept: data.dept || '', regionId: data.regionId, city: data.city || (RG(data.regionId) || {}).city || '', startYear: +data.startYear || new Date().getFullYear(),
      bio: data.bio || '', education: data.education || '', interests: data.interests || '', skills: data.skills || [], sport: '',
      councilRole: 'Участник', role: 'member', photo: data.photo || null, media: [], verified: false, blocked: false, conflicts: [], createdAt: new Date().toISOString()
    };
    DB.users.push(u);
    DB.session.userId = u.id;
    reindex();
    audit('Регистрация пользователя', 'user', u.id, `${u.name}, ${orgLabel(u.companyId)}`);
    const org = O(u.companyId);
    if (org && org.council.chairId) notify(org.council.chairId, `Новый участник ${u.name} просит подтвердить членство в Молодёжном совете`, '#company-' + org.id);
    notify(u.id, 'Добро пожаловать в JASTAR HUB! Заполните профиль и добавьте первую активность.', '#me');
    commit();
    return u;
  },
  async signIn(email, password) {
    const u = DB.users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || !u.pass || u.pass !== (await api.hash(password))) throw new Error('Неверный e-mail или пароль');
    if (u.blocked) throw new Error('Учётная запись заблокирована администратором');
    DB.session.userId = u.id; audit('Вход в систему', 'user', u.id, ''); commit();
    return u;
  },
  signInDemo(userId) { DB.session.userId = userId; audit('Вход (демо-аккаунт)', 'user', userId, ROLES[U(userId).role].name); commit(); },
  signOut() { audit('Выход из системы', 'user', DB.session.userId, ''); DB.session.userId = null; commit(); }
};
