/* =====================================================================
   Страницы: главная, компании, участники, профили, вход и регистрация
   ===================================================================== */

const ACTIONS = {};
const FORMS = {};
const UPLOAD = {};
const SUGGEST = {};

function pageHead(title, sub = '', actions = '', eyebrow = '') {
  return `<header class="page-head"><div class="ph-t">${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}<h1>${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions ? `<div class="btn-row">${actions}</div>` : ''}</header>`;
}
const kpi = (label, value, note = '', ic = '') => `<div class="kpi">${ic ? `<span class="kpi-i">${icon(ic, 18)}</span>` : ''}<span class="kpi-l">${esc(label)}</span><b class="kpi-v">${value}</b>${note ? `<span class="kpi-n">${note}</span>` : ''}</div>`;
const card = (title, body, actions = '', cls = '') => `<section class="card ${cls}">${title ? `<div class="card-h"><h2>${title}</h2>${actions}</div>` : ''}<div class="card-b">${body}</div></section>`;
const verifiedReach = (p) => (p.review && p.review.verifiedReach != null ? p.review.verifiedReach : p.reach);
const verifiedAtt = (e) => (e.review && e.review.verifiedAttended != null ? e.review.verifiedAttended : e.attended);
const councilMembers = (orgId) => DB.users.filter((u) => u.companyId === orgId && ['member', 'chair', 'regional'].includes(u.role) && !u.blocked);
const roleLabel = (u) => (u.role === 'member' ? u.councilRole : ROLES[u.role].short + (u.councilRole && u.councilRole !== 'Участник' && u.role === 'member' ? '' : ''));

function monthSeries(n = 12) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); out.push({ key: isoDate(d).slice(0, 7), label: MONTHS[d.getMonth()] }); }
  return out;
}

function pcard(p) {
  const c = CAT(p.category);
  const cover = (p.media || []).find((m) => m.kind === 'photo' && m.key);
  const team = (p.team || []).slice(0, 4).map((x) => avatar(U(x.userId), 26)).join('');
  const q = qProject(p);
  return `<a class="pcard" href="#project-${p.id}">
    <div class="cover" style="--c:${c.color}">${cover ? `<img alt="" data-media="${cover.key}">` : `<span class="cv-ic">${icon(c.icon, 30)}</span>`}<span class="cv-top">${catChip(p.category)}${p.status !== 'confirmed' ? statusChip(p.status) : `<span class="score-b" title="Качество проекта по оценке эксперта, из 10">${fmt1(q)}</span>`}</span></div>
    <div class="pc-b"><h3>${esc(p.title)}</h3><p class="meta">${esc(orgLabel(p.orgId))} · ${esc((RG(p.regionId) || {}).city || '')}</p><p class="desc">${esc(p.desc)}</p>
    <div class="pc-f"><span class="stack">${team}</span><span class="muted">${fmtDate(p.end)}</span><span class="muted" title="Охват">${icon('users', 14)} ${fmt(verifiedReach(p))}</span></div></div></a>`;
}
function eventRow(e) {
  const d = new Date(e.date + 'T12:00:00');
  return `<a class="erow" href="#event-${e.id}"><span class="edate"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></span><span class="emain"><b>${esc(e.title)}</b><small>${esc(orgLabel(e.orgId))} · ${esc((RG(e.regionId) || {}).city || '')} · ${esc(e.time)}</small></span><span class="eside">${catChip(e.category)}${statusChip(e.status)}<small class="muted">${icon('users', 13)} ${e.status === 'planned' ? `${e.registered.length}/${e.capacity}` : fmt(verifiedAtt(e))}</small></span></a>`;
}
function newsCard(n, big = false) {
  const kindTone = { announce: 'info', interview: 'accent', success: 'good', practice: 'good' }[n.kind] || '';
  return `<a class="ncard ${big ? 'big' : ''}" href="#news-${n.id}"><div class="ncover" style="--h:${ORG_HUE[rootOf(n.orgId)] ?? 200}">${n.cover ? `<img alt="" data-media="${n.cover}">` : `<span>${esc(NEWS_KINDS[n.kind])}</span>`}</div><div class="nb">${chip(NEWS_KINDS[n.kind], kindTone)}<h3>${esc(n.title)}</h3>${big ? `<p>${esc(n.lead)}</p>` : ''}<small class="muted">${esc(orgLabel(n.orgId))} · ${fmtDate(n.date)}</small></div></a>`;
}

/* ============================ ГЛАВНАЯ ============================ */
route('home', () => {
  const u = me();
  const conf = DB.projects.filter((p) => p.status === 'confirmed');
  const confEv = DB.events.filter((e) => e.status === 'confirmed');
  const confAch = DB.achievements.filter((a) => a.status === 'confirmed');
  const young = sum(DB.orgs, (o) => o.young);
  const reach = sum(conf, verifiedReach) + sum(confEv, verifiedAtt);
  const hours = sum(conf, (p) => p.review.verifiedHours || 0) + sum(confAch.filter((a) => a.hours), (a) => a.hours);
  const upcoming = DB.events.filter((e) => e.status === 'planned' && e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date));
  const rows = companyScores();
  const people = personScores().slice(0, 5);
  const ms = monthSeries(12);
  const byMonth = (arr, f) => ms.map((m) => arr.filter((x) => (f(x) || '').slice(0, 7) === m.key).length);
  const mapVals = {};
  conf.forEach((p) => { const v = (mapVals[p.regionId] = mapVals[p.regionId] || { v: 0, p: 0, e: 0, reach: 0 }); v.v++; v.p++; v.reach += verifiedReach(p); });
  confEv.forEach((e) => { const v = (mapVals[e.regionId] = mapVals[e.regionId] || { v: 0, p: 0, e: 0, reach: 0 }); v.v++; v.e++; v.reach += verifiedAtt(e); });
  const regTop = DB.regions.map((r) => ({ label: r.name, v: (mapVals[r.id] || {}).v || 0 })).sort((a, b) => b.v - a.v).slice(0, 5);
  let best = conf.filter((p) => p.end >= periodRange('month').from).sort((a, b) => qProject(b) - qProject(a)).slice(0, 3);
  if (best.length < 3) best = conf.filter((p) => p.end >= periodRange('quarter').from).sort((a, b) => qProject(b) - qProject(a)).slice(0, 3);
  const catRows = CATS.map((c) => ({ label: c.short, v: conf.filter((p) => p.category === c.id).length, color: c.color })).sort((a, b) => b.v - a.v);
  const ps = u ? personScores().find((r) => r.userId === u.id) : null;
  const myPending = u ? [...DB.projects, ...DB.events, ...DB.achievements].filter((x) => entityOwners(x).includes(u.id) && ['submitted', 'in_review', 'needs_info', 'draft'].includes(x.status)).length : 0;

  const side = u ? `<div class="hero-side">
      <div class="hs-u">${avatar(u, 44)}<span><b>${esc(u.name)}</b><small>${esc(ROLES[u.role].name)} · ${esc(orgLabel(u.companyId) || 'независимый эксперт')}</small></span></div>
      ${ps ? `<div class="hs-stats"><span><small>Баллы</small><b>${fmt1(ps.total)}</b></span><span><small>Место</small><b>${ps.total > 0 ? ps.rank : '—'}</b></span><span><small>Заявок в работе</small><b>${myPending}</b></span></div>` : `<p class="muted">${u.role === 'expert' ? 'Эксперты и администраторы не участвуют в рейтинге.' : ''}</p>`}
      <div class="btn-row">${u.role === 'expert' ? `<a class="btn primary" href="#expert">${icon('shield', 16)}Очередь проверки</a>` : `<a class="btn primary" href="#achievement-new">${icon('plus', 16)}Добавить активность</a><a class="btn" href="#me">Личный кабинет</a>`}</div>
    </div>` : `<div class="hero-side"><b class="hs-t">Как начать</b><ol class="steps">
      <li><span><b>Зарегистрируйтесь</b> и выберите свою компанию и ДЗО</span></li><li><span><b>Заполните профиль</b>: должность, биография, фото</span></li><li><span><b>Добавьте активность</b> с доказательствами</span></li><li><span><b>Получите подтверждение</b> эксперта и баллы в рейтинге</span></li></ol>
      <div class="btn-row"><a class="btn primary" href="#register">Зарегистрироваться</a><button class="btn" data-act="role-switch">${icon('swap', 16)}Демо-вход</button></div></div>`;

  return `<div class="page home">
  <section class="hero">
    <div class="hero-main">
      <span class="eyebrow">Единая цифровая платформа Молодёжных советов группы АО «Самрук-Қазына»</span>
      <h1 class="wordmark">JASTAR HUB</h1>
      <p class="slogan-l">${esc(t('slogan'))}</p>
      <p class="lead">Профили молодых сотрудников, проекты и мероприятия советов, независимая экспертиза и открытые рейтинги, в которых баллы начисляются только за подтверждённые результаты.</p>
      <div class="hero-links"><a href="#rating">${icon('trophy', 16)}Рейтинг советов</a><a href="#projects">${icon('folder', 16)}Проекты</a><a href="#methodology">${icon('scale', 16)}Методика</a></div>
    </div>${side}
  </section>
  <div class="kpis k4">
    ${kpi('Молодых сотрудников в системе', fmt(young), 'до 35 лет · тестовая численность', 'users')}
    ${kpi('Портфельных компаний', fmt(DB.orgs.filter((o) => o.type === 'portfolio').length), `и ${DB.orgs.filter((o) => o.type === 'subsidiary').length} ДЗО на платформе`, 'building')}
    ${kpi('Молодёжных советов', fmt(DB.orgs.length), `${DB.regions.length} регионов присутствия`, 'flag')}
    ${kpi('Реализованных проектов', fmt(conf.length), 'подтверждены экспертами', 'folder')}
    ${kpi('Мероприятий', fmt(DB.events.length), `${upcoming.length} предстоящих`, 'calendar')}
    ${kpi('Общий охват участников', fmt(reach), 'подтверждённый охват, чел.', 'globe')}
    ${kpi('Подтверждённых инициатив', fmt(conf.length + confAch.length), 'проекты и личные достижения', 'check')}
    ${kpi('Волонтёрских часов', fmt(hours), 'подтверждено', 'hand')}
  </div>
  <div class="grid g-2-1">
    ${card('Активность по регионам', `${chart('map', { values: mapVals, h: 300 })}<div class="map-note"><span>${icon('info', 14)}Размер круга — число подтверждённых проектов и мероприятий. Нажмите на регион, чтобы открыть его проекты.</span></div>${hbars(regTop)}`, chip('Тестовые данные', 'test'))}
    ${card('ТОП-5 Молодёжных советов', `<ol class="toplist">${rows.slice(0, 5).map((r) => `<li><span class="rk">${r.rank}</span><a href="#company-${r.orgId}" class="tl-m">${orgLogo(O(r.orgId), 34)}<span><b>${esc(O(r.orgId).name)}</b><small>${fmt(r.engagement)}% вовлечённость · ${r.projects} ${plural(r.projects, 'проект', 'проекта', 'проектов')}</small></span></a><b class="tl-v">${fmt1(r.total)}</b></li>`).join('')}</ol>`, `<a class="lnk" href="#rating">Весь рейтинг ${icon('chevR', 14)}</a>`)}
  </div>
  <div class="grid g-2-1">
    ${card('Динамика подтверждённой активности', chart('line', { labels: ms.map((m) => m.label), series: [{ name: 'Проекты', values: byMonth(conf, (p) => p.end) }, { name: 'Мероприятия', values: byMonth(confEv, (e) => e.date) }], h: 240 }), '<span class="muted sm">12 месяцев</span>')}
    ${card('Проекты по направлениям', hbars(catRows))}
  </div>
  ${card('Лучшие проекты месяца', best.length ? `<div class="pgrid">${best.map(pcard).join('')}</div>` : emptyState('folder', 'Пока нет подтверждённых проектов за месяц', 'Они появятся после проверки экспертом.'), `<a class="lnk" href="#projects">Все проекты ${icon('chevR', 14)}</a>`)}
  <div class="grid g3">
    ${card('ТОП-5 сотрудников', `<ol class="toplist">${people.map((r) => { const x = U(r.userId); return `<li><span class="rk">${r.rank}</span><a href="#person-${x.id}" class="tl-m">${avatar(x, 34)}<span><b>${esc(x.name)}</b><small>${esc(orgLabel(x.companyId))}</small></span></a><b class="tl-v">${fmt1(r.total)}</b></li>`; }).join('')}</ol>`, `<a class="lnk" href="#leaders">ТОП-100 ${icon('chevR', 14)}</a>`)}
    ${card('Предстоящие мероприятия', upcoming.length ? `<div class="elist">${upcoming.slice(0, 4).map(eventRow).join('')}</div>` : emptyState('calendar', 'Нет запланированных мероприятий', ''), `<a class="lnk" href="#events">Календарь ${icon('chevR', 14)}</a>`)}
    ${card('Последние новости и события', `<div class="nlist">${DB.news.filter((n) => n.published).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((n) => `<a href="#news-${n.id}" class="nl"><small>${esc(NEWS_KINDS[n.kind])} · ${fmtDate(n.date)}</small><b>${esc(n.title)}</b></a>`).join('')}</div>`, `<a class="lnk" href="#news">Все материалы ${icon('chevR', 14)}</a>`)}
  </div>
  </div>`;
});
ACTIONS['map-region'] = (el) => { UI.pr = { ...(UI.pr || {}), region: el.dataset.id, limit: 24 }; go('projects'); };

/* ============================ КОМПАНИИ ============================ */
route('companies', () => {
  const f = (UI.co = UI.co || { q: '', type: '', parent: '', region: '' });
  const ranks = new Map(companyScores().map((r) => [r.orgId, r]));
  let list = DB.orgs.slice();
  if (f.q) list = list.filter((o) => norm(o.name + ' ' + o.full + ' ' + o.sector).includes(norm(f.q)));
  if (f.type === 'portfolio') list = list.filter((o) => o.type !== 'subsidiary');
  if (f.type === 'subsidiary') list = list.filter((o) => o.type === 'subsidiary');
  if (f.parent) list = list.filter((o) => o.id === f.parent || o.parentId === f.parent);
  if (f.region) list = list.filter((o) => o.regionId === f.region || councilMembers(o.id).some((u) => u.regionId === f.region));
  list.sort((a, b) => ranks.get(a.id).rank - ranks.get(b.id).rank);
  const parents = DB.orgs.filter((o) => o.type === 'portfolio');
  return `<div class="page">
  ${pageHead(t('companies'), 'Каталог портфельных компаний Фонда, их дочерних организаций и Молодёжных советов', can('company.edit') && myRole() === 'admin' ? `<a class="btn" href="#admin">${icon('plus', 16)}Добавить организацию</a>` : '')}
  <div class="filters">
    <div class="f-search">${icon('search', 16)}<input id="co-q" type="search" placeholder="Название компании или отрасль" value="${esc(f.q)}" data-live="co.q"></div>
    ${seg('co.type', [['', 'Все'], ['portfolio', 'Фонд и портфельные'], ['subsidiary', 'ДЗО']], f.type)}
    ${sel('co-parent', [['', 'Все группы компаний'], ...parents.map((o) => [o.id, o.name + ' и ДЗО'])], f.parent, 'data-live="co.parent"')}
    ${sel('co-region', regionOptions('Все регионы'), f.region, 'data-live="co.region"')}
  </div>
  <p class="count">${list.length} ${plural(list.length, 'организация', 'организации', 'организаций')}</p>
  ${list.length ? `<div class="cgrid">${list.map((o) => { const r = ranks.get(o.id); const m = councilMembers(o.id); return `<a class="ccard" href="#company-${o.id}">
    <div class="cc-h">${orgLogo(o, 44)}<span><b>${esc(o.name)}</b><small>${esc(o.full)}</small></span></div>
    <div class="cc-chips">${chip(o.type === 'fund' ? 'Фонд' : o.type === 'portfolio' ? 'Портфельная компания' : 'ДЗО ' + orgLabel(o.parentId))}${chip(o.sector)}</div>
    <dl class="cc-m"><div><dt>Молодёжь</dt><dd>${fmt(o.young)}</dd></div><div><dt>В совете</dt><dd>${m.filter((u) => u.verified).length}</dd></div><div><dt>Место</dt><dd>${r.rank}</dd></div><div><dt>Баллы</dt><dd>${fmt1(r.total)}</dd></div></dl>
    <span class="cc-f">${icon('pin', 14)}${esc((RG(o.regionId) || {}).name)}</span></a>`; }).join('')}</div>` : emptyState('building', 'Организации не найдены', 'Измените условия поиска или фильтры.')}
  </div>`;
});

route('company', (id) => {
  const o = O(id);
  if (!o) return ROUTES.notfound.render();
  const rows = companyScores();
  const r = rows.find((x) => x.orgId === id);
  const prev = prevRanks(companyScores, {}, 'all').get(id);
  const members = councilMembers(id);
  const verified = members.filter((u) => u.verified);
  const pending = members.filter((u) => !u.verified && !u.councilRejected);
  const chair = U(o.council.chairId);
  const reps = (o.council.regionalReps || []).map(U).filter(Boolean);
  const projs = DB.projects.filter((p) => p.orgId === id && canSeeActivity(p)).sort((a, b) => b.end.localeCompare(a.end));
  const evs = DB.events.filter((e) => e.orgId === id && canSeeActivity(e)).sort((a, b) => b.date.localeCompare(a.date));
  const tab = UI.tabs['co-' + id] || 'overview';
  const own = isChairOf(id);
  const ps = new Map(personScores().map((x) => [x.userId, x]));
  const subs = childrenOf(id);
  let body = '';
  if (tab === 'overview') {
    const ms = monthSeries(12);
    const confP = DB.projects.filter((p) => p.orgId === id && p.status === 'confirmed');
    const confE = DB.events.filter((e) => e.orgId === id && e.status === 'confirmed');
    body = `<div class="grid g-2-1"><div class="stack-v">
      ${card('О компании и Молодёжном совете', `<p>${esc(o.about)}</p><dl class="dl2"><div><dt>Полное наименование</dt><dd>${esc(o.full)}</dd></div><div><dt>Отрасль</dt><dd>${esc(o.sector)}</dd></div><div><dt>Регион головного офиса</dt><dd>${esc((RG(o.regionId) || {}).name)}</dd></div><div><dt>Совет создан</dt><dd>${o.council.founded} г.</dd></div>${o.parentId ? `<div><dt>Входит в группу</dt><dd>${orgLink(o.parentId)}</dd></div>` : ''}</dl>`, own ? `<button class="btn sm ghost" data-act="company-edit" data-id="${id}">${icon('edit', 15)}Редактировать</button>` : '')}
      ${card('Подтверждённая активность по месяцам', chart('line', { labels: ms.map((m) => m.label), series: [{ name: 'Проекты', values: ms.map((m) => confP.filter((p) => p.end.slice(0, 7) === m.key).length) }, { name: 'Мероприятия', values: ms.map((m) => confE.filter((e) => e.date.slice(0, 7) === m.key).length) }], h: 220 }))}
    </div><div class="stack-v">
      ${card('Председатель совета', chair ? `<a class="person-l" href="#person-${chair.id}">${avatar(chair, 64)}<span><b>${esc(chair.name)}</b><small>${esc(chair.position)}</small><small>Председатель Молодёжного совета</small></span></a>` : '<p class="muted">Не назначен</p>')}
      ${card('Региональные представители', reps.length ? reps.map((x) => `<a class="person-s" href="#person-${x.id}">${avatar(x, 34)}<span><b>${esc(x.name)}</b><small>${esc((RG(x.regionId) || {}).name)}</small></span></a>`).join('') : '<p class="muted">Региональные представители не назначены</p>')}
      ${subs.length ? card('Дочерние организации', subs.map((s) => { const sr = rows.find((x) => x.orgId === s.id); return `<a class="person-s" href="#company-${s.id}">${orgLogo(s, 32)}<span><b>${esc(s.name)}</b><small>Место ${sr.rank} · ${fmt1(sr.total)} баллов</small></span></a>`; }).join('')) : ''}
    </div></div>`;
  } else if (tab === 'council') {
    body = `${own && pending.length ? card('Заявки на вступление', `<div class="list">${pending.map((u) => `<div class="lrow">${avatar(u, 36)}<span class="grow"><b>${esc(u.name)}</b><small>${esc(u.position)} · ${esc(u.dept)}</small></span><button class="btn sm primary" data-act="member-verify" data-id="${u.id}">${icon('check', 15)}Подтвердить</button><button class="btn sm ghost" data-act="member-reject" data-id="${u.id}">Отклонить</button></div>`).join('')}</div>`, chip(pending.length + ' ожидают', 'warn')) : ''}
    ${card(`Состав Молодёжного совета · ${verified.length}`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Участник</th><th>Роль в совете</th><th>Регион</th><th class="num">Баллы</th><th class="num">Место</th></tr></thead><tbody>
      ${verified.sort((a, b) => COUNCIL_ROLES.indexOf(a.councilRole) - COUNCIL_ROLES.indexOf(b.councilRole)).map((u) => { const s = ps.get(u.id); return `<tr><td><a class="tcell" href="#person-${u.id}">${avatar(u, 30)}<span><b>${esc(u.name)}</b><small>${esc(u.position)}</small></span></a></td><td>${own && u.id !== me().id ? sel('cr-' + u.id, COUNCIL_ROLES, u.councilRole, `data-act-change="council-role" data-id="${u.id}" aria-label="Роль в совете"`) : esc(u.councilRole)}</td><td>${esc((RG(u.regionId) || {}).city)}</td><td class="num">${s ? fmt1(s.total) : '—'}</td><td class="num">${s && s.total > 0 ? s.rank : '—'}</td></tr>`; }).join('')}</tbody></table></div>`)}`;
  } else if (tab === 'projects') {
    body = `${projs.length ? `<div class="pgrid">${projs.map(pcard).join('')}</div>` : emptyState('folder', 'Проектов пока нет', 'Председатель и участники совета могут добавить первый проект.')}`;
  } else if (tab === 'events') {
    body = evs.length ? card('', `<div class="elist">${evs.map(eventRow).join('')}</div>`) : emptyState('calendar', 'Мероприятий пока нет', '');
  } else {
    const hist = rankHistory(id);
    const log = DB.ratingLog.filter((x) => x.kind === 'org' && x.id === id).slice(-12).reverse();
    body = `<div class="grid g2">
      ${card('Разбивка баллов по методике', `<div class="breakdown">${COMPANY_COMPONENTS.map((c) => `<div class="bd" data-tip="${esc(c.hint)}"><span class="bd-l">${esc(c.name)} <small>вес ${DB.settings.wCompany[c.k]}%</small></span>${bar(r.comps[c.k])}<span class="bd-v">${fmt(r.comps[c.k])}<small> → ${fmt1((r.comps[c.k] * DB.settings.wCompany[c.k]) / 100)}</small></span></div>`).join('')}</div><p class="note">Шкала каждого показателя: 100 — лучший результат среди советов. Итог: ${fmt1(r.total)} из 100.</p>`)}
      ${card('Динамика баллов и места', `${chart('line', { labels: hist.map((h) => h.label), series: [{ name: 'Баллы', values: hist.map((h) => +h.total.toFixed(1)) }], h: 200, fmtY: (v) => fmt1(v) })}<div class="rankstrip">${hist.map((h) => `<span><small>${esc(h.label)}</small><b>${h.rank || '—'}</b></span>`).join('')}</div><p class="note">Место на конец месяца с накопленным итогом.</p>`)}
    </div>
    ${card('История изменений рейтинга', log.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Причина</th><th class="num">Баллы</th><th class="num">Место</th></tr></thead><tbody>${log.map((x) => `<tr><td>${fmtDT(x.ts)}</td><td>${esc(x.reason)}</td><td class="num">${fmt1(x.from)} → ${fmt1(x.to)}</td><td class="num">${x.rankFrom || '—'} → ${x.rankTo}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Изменения появятся после новых подтверждений активности.</p>')}`;
  }
  return `<div class="page">
    <nav class="crumbs"><a href="#companies">${esc(t('companies'))}</a>${o.parentId && o.type === 'subsidiary' ? ` / ${orgLink(o.parentId)}` : ''} / <span>${esc(o.name)}</span></nav>
    <header class="ent-h">${orgLogo(o, 64)}<div class="grow"><h1>${esc(o.name)}</h1><p class="sub">${esc(o.full)}</p><div class="chips">${chip(o.type === 'fund' ? 'Головной уровень — Фонд' : o.type === 'portfolio' ? 'Портфельная компания' : 'Дочерняя организация')}${chip(o.sector)}${chip((RG(o.regionId) || {}).name, '', 'pin')}${o.demo ? testChip() : ''}</div></div>
      <div class="btn-row">${own || (me() && myRole() !== 'guest' && rootOf(me().companyId) === rootOf(id) && can('project.create')) ? `<a class="btn primary" href="#project-new" data-act="new-project-for" data-id="${id}">${icon('plus', 16)}Добавить проект</a>` : ''}<a class="btn" href="#compare" data-act="compare-with" data-id="${id}">${icon('compare', 16)}Сравнить</a></div></header>
    <div class="kpis k6">
      ${kpi('Молодых сотрудников', fmt(o.young), 'тестовая численность')}
      ${kpi('Участников совета', fmt(verified.length), pending.length ? `${pending.length} ожидают подтверждения` : '')}
      ${kpi('Вовлечённость', pct(r.engagement), 'подтверждённый охват')}
      ${kpi('Подтверждённых проектов', fmt(r.projects))}
      ${kpi('Проведено мероприятий', fmt(r.events))}
      ${kpi('Место в рейтинге', `${r.rank} <small>из ${rows.length}</small> ${delta(prev, r.rank)}`, `${fmt1(r.total)} баллов из 100`)}
    </div>
    ${tabs('tabs.co-' + id, [['overview', 'Обзор'], ['council', 'Состав совета', verified.length], ['projects', 'Проекты', projs.length], ['events', 'Мероприятия', evs.length], ['rating', 'Рейтинг']], tab)}
    ${body}
  </div>`;
});
ACTIONS['new-project-for'] = (el) => { UI.pf = null; UI.pfOrg = el.dataset.id; go('project-new'); };
ACTIONS['compare-with'] = (el) => { const id = el.dataset.id; UI.cmp = UI.cmp || { ids: [], period: 'year' }; if (!UI.cmp.ids.includes(id)) UI.cmp.ids = [id, ...UI.cmp.ids].slice(0, 4); go('compare'); };
ACTIONS['member-verify'] = (el) => {
  const u = U(el.dataset.id); if (!u || !isChairOf(u.companyId)) return;
  u.verified = true; u.councilRejected = false; if (u.councilRole === 'Участник') u.councilRole = 'Член совета';
  audit('Подтверждение членства в совете', 'user', u.id, `${u.name}, ${orgLabel(u.companyId)}`);
  notify(u.id, `Председатель подтвердил ваше членство в Молодёжном совете ${orgLabel(u.companyId)}.`, '#company-' + u.companyId);
  commit(); toast('Членство подтверждено', 'good'); rerender();
};
ACTIONS['member-reject'] = (el) => {
  const u = U(el.dataset.id); if (!u || !isChairOf(u.companyId)) return;
  confirmModal('Отклонить заявку?', `${u.name} не будет включён в состав совета. Профиль сотрудника сохранится.`, 'Отклонить', () => {
    u.councilRejected = true; audit('Отклонение заявки в совет', 'user', u.id, u.name);
    notify(u.id, `Заявка на вступление в Молодёжный совет ${orgLabel(u.companyId)} отклонена. Уточните детали у председателя.`, '#company-' + u.companyId);
    commit(); rerender();
  }, true);
};
ACTIONS['council-role'] = (el) => {
  const u = U(el.dataset.id); const v = el.value;
  if (!u || !isChairOf(u.companyId)) return;
  if (v === 'Председатель' && myRole() !== 'admin') { toast('Председателя назначает администратор', 'warn'); el.value = u.councilRole; return; }
  u.councilRole = v; audit('Изменение должности в совете', 'user', u.id, `${u.name}: ${v}`); commit(); toast('Должность обновлена', 'good');
};
ACTIONS['company-edit'] = (el) => {
  const o = O(el.dataset.id);
  openModal({
    title: 'Профиль компании', body: `<form class="form" id="co-form">${fld('Описание компании и совета', txa('co-about', o.about, 6))}${fld('Отрасль', inp('co-sector', o.sector))}${fld('Год создания совета', inp('co-founded', o.council.founded, 'type="number" min="1990" max="2030"'))}</form>`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить', cls: 'primary', fn: () => { o.about = $('#co-about').value.trim(); o.sector = $('#co-sector').value.trim() || o.sector; o.council.founded = +$('#co-founded').value || o.council.founded; audit('Изменение профиля компании', 'org', o.id, o.name); commit(); closeModal(); toast('Профиль компании сохранён', 'good'); rerender(); } }]
  });
};

/* ============================ УЧАСТНИКИ ============================ */
route('people', () => {
  const f = (UI.pp = UI.pp || { q: '', root: '', region: '', crole: '', limit: 24 });
  const scores = new Map(personScores().map((r) => [r.userId, r]));
  let list = DB.users.filter((u) => ['member', 'chair', 'regional'].includes(u.role) && !u.blocked);
  if (f.q) list = list.filter((u) => norm(u.name + ' ' + orgLabel(u.companyId) + ' ' + u.position).includes(norm(f.q)));
  if (f.root) list = list.filter((u) => rootOf(u.companyId) === f.root);
  if (f.region) list = list.filter((u) => u.regionId === f.region);
  if (f.crole) list = list.filter((u) => u.councilRole === f.crole);
  list.sort((a, b) => (scores.get(b.id)?.total || 0) - (scores.get(a.id)?.total || 0));
  const shown = list.slice(0, f.limit);
  return `<div class="page">
    ${pageHead(t('people'), 'Молодые сотрудники, участники и председатели Молодёжных советов группы')}
    <div class="filters">
      <div class="f-search">${icon('search', 16)}<input id="pp-q" type="search" placeholder="ФИО, компания или должность" value="${esc(f.q)}" data-live="pp.q"></div>
      ${sel('pp-root', [['', 'Все компании'], ...DB.orgs.filter((o) => o.type !== 'subsidiary').map((o) => [o.id, o.name + ' и ДЗО'])], f.root, 'data-live="pp.root"')}
      ${sel('pp-region', regionOptions('Все регионы'), f.region, 'data-live="pp.region"')}
      ${sel('pp-crole', [['', 'Любая роль в совете'], ...COUNCIL_ROLES.map((x) => [x, x])], f.crole, 'data-live="pp.crole"')}
    </div>
    <p class="count">${list.length} ${plural(list.length, 'участник', 'участника', 'участников')}</p>
    ${shown.length ? `<div class="ugrid">${shown.map((u) => { const s = scores.get(u.id); return `<a class="ucard" href="#person-${u.id}">${avatar(u, 52)}<span class="uc-m"><b>${esc(u.name)}</b><small>${esc(u.position)}</small><small>${esc(orgLabel(u.companyId))} · ${esc(u.city)}</small></span><span class="uc-s">${u.councilRole !== 'Участник' ? chip(u.councilRole, u.role === 'chair' ? 'accent' : '') : ''}<span><b>${s ? fmt1(s.total) : '0,0'}</b><small>баллов</small></span></span></a>`; }).join('')}</div>` : emptyState('users', 'Никого не нашли', 'Попробуйте изменить запрос или фильтры.')}
    ${list.length > shown.length ? `<div class="more"><button class="btn" data-act="more" data-k="pp">Показать ещё</button></div>` : ''}
  </div>`;
});
ACTIONS.more = (el) => { const k = el.dataset.k; UI[k].limit = (UI[k].limit || 24) + 24; rerender(); };

function personView(u, own) {
  const s = personScores().find((r) => r.userId === u.id);
  const inRating = ['member', 'chair', 'regional'].includes(u.role);
  const conf = DB.projects.filter((p) => p.status === 'confirmed' && p.team.some((x) => x.userId === u.id));
  const ach = DB.achievements.filter((a) => a.userId === u.id && (own || a.status === 'confirmed' || isChairOf(u.companyId)));
  const evOrg = DB.events.filter((e) => (e.organizers || []).includes(u.id) && canSeeActivity(e));
  const volH = sum(ach.filter((a) => a.status === 'confirmed' && (a.type === 'volunteer' || a.type === 'social')), (a) => a.hours) + (s ? 0 : 0);
  const tabK = 'tabs.pr-' + u.id;
  const tab = UI.tabs['pr-' + u.id] || 'profile';
  const badges = inRating ? personBadges(u.id) : [];
  const allMine = own ? [...DB.projects.filter((p) => p.createdBy === u.id || p.leaderId === u.id), ...DB.events.filter((e) => (e.organizers || []).includes(u.id) && e.status !== 'planned'), ...DB.achievements.filter((a) => a.userId === u.id)] : [];
  let body = '';
  if (tab === 'profile') {
    body = `<div class="grid g-2-1"><div class="stack-v">
      ${card('О себе', `<p>${esc(u.bio || 'Биография не заполнена.')}</p><dl class="dl2"><div><dt>Образование</dt><dd>${esc(u.education || '—')}</dd></div><div><dt>Профессиональные интересы</dt><dd>${esc(u.interests || '—')}</dd></div><div><dt>Департамент / подразделение</dt><dd>${esc(u.dept || '—')}</dd></div><div><dt>Спортивная активность</dt><dd>${esc(u.sport || '—')}</dd></div></dl><div class="chips">${(u.skills || []).map((x) => chip(x)).join('')}</div>`)}
    </div><div class="stack-v">
      ${inRating && s ? card('Баллы по методике', `<div class="breakdown">${PERSON_COMPONENTS.map((c) => `<div class="bd" data-tip="${esc(c.hint)}"><span class="bd-l">${esc(c.name)} <small>${DB.settings.wPerson[c.k]}%</small></span>${bar(s.comps[c.k])}<span class="bd-v">${fmt(s.comps[c.k])}</span></div>`).join('')}</div><p class="note">Баллы начисляются только за подтверждённые активности и только в пределах личного вклада.</p>`) : card('Рейтинг', `<p class="muted">${u.role === 'expert' ? 'Независимые эксперты не участвуют в рейтинге.' : 'Администраторы не участвуют в рейтинге.'}</p>`)}
      ${badges.length ? card('Бейджи', `<div class="badges">${badges.map((b) => `<span class="badge">${icon(b.icon, 18)}${esc(b.label)}</span>`).join('')}</div>`) : ''}
    </div></div>`;
  } else if (tab === 'social') {
    const myProjects = DB.projects.filter((p) => p.team.some((x) => x.userId === u.id) && canSeeActivity(p)).sort((a, b) => b.end.localeCompare(a.end));
    const inter = myProjects.filter((p) => p.status === 'confirmed' && hasPartners(p));
    const byType = (tp) => ach.filter((a) => tp.includes(a.type));
    const achList = (arr) => arr.length ? `<div class="list">${arr.map((a) => `<div class="lrow">${icon(ACH_TYPES[a.type].icon, 18)}<span class="grow"><b>${esc(a.title)}</b><small>${fmtDate(a.date)}${a.hours ? ` · ${a.hours} ч` : ''}${a.org ? ' · ' + esc(a.org) : ''}</small></span>${statusChip(a.status)}</div>`).join('')}</div>` : '<p class="muted">Нет записей</p>';
    body = `<div class="grid g2">
      ${card('Участие в проектах', myProjects.length ? `<div class="list">${myProjects.map((p) => { const tm = p.team.find((x) => x.userId === u.id); return `<a class="lrow" href="#project-${p.id}">${icon(CAT(p.category).icon, 18)}<span class="grow"><b>${esc(p.title)}</b><small>${esc(tm.role)} · личный вклад ${tm.share}% · ${esc(orgLabel(p.orgId))}</small></span>${statusChip(p.status)}</a>`; }).join('')}</div>` : '<p class="muted">Пока нет проектов</p>')}
      ${card('Организованные мероприятия', evOrg.length ? `<div class="elist">${evOrg.map(eventRow).join('')}</div>` : '<p class="muted">Нет организованных мероприятий</p>')}
      ${card('Межкорпоративные проекты', inter.length ? `<div class="list">${inter.map((p) => `<a class="lrow" href="#project-${p.id}">${icon('link', 18)}<span class="grow"><b>${esc(p.title)}</b><small>${uniq([p.orgId, ...p.partnerOrgIds]).map(orgLabel).join(' · ')}</small></span></a>`).join('')}</div>` : '<p class="muted">Нет подтверждённых межкорпоративных проектов</p>')}
      ${card('Волонтёрская деятельность и социальные инициативы', achList(byType(['volunteer', 'social'])))}
      ${card('Обучение и наставничество', achList(byType(['training', 'mentoring'])))}
      ${card('Достижения, награды и спорт', achList(byType(['award', 'sport'])))}
    </div>`;
  } else if (tab === 'media') {
    const kinds = { photo: 'Фотографии', video: 'Видео', cert: 'Сертификаты', letter: 'Благодарственные письма', doc: 'Документы' };
    body = `${own ? card('Загрузить материалы', `<div class="upl-row">${sel('um-kind', Object.entries(kinds), UI.umKind || 'photo', 'data-bind="umKind" aria-label="Тип материала"')}<label class="btn">${icon('upload', 16)}Выбрать файлы<input type="file" multiple hidden data-upload="user-media" accept="image/*,video/*,.pdf,.doc,.docx,.jpg,.png"></label></div><p class="note">Фото сжимаются автоматически. Видео — до 40 МБ, документы — до 15 МБ. В демо-версии файлы хранятся в вашем браузере.</p>`) : ''}
    ${Object.entries(kinds).map(([k, l]) => { const items = (u.media || []).filter((m) => (m.cat || m.kind) === k); return items.length ? card(l, gallery(items.map((m) => ({ ...m, kind: m.kind === 'photo' ? 'photo' : m.kind })), 'other', own)) : ''; }).join('') || card('', emptyState('image', 'Медиафайлов пока нет', own ? 'Добавьте фото, видео, сертификаты и письма — они подтверждают ваши достижения.' : 'Участник ещё не загрузил материалы.'))}`;
  } else if (tab === 'history') {
    const log = DB.ratingLog.filter((x) => x.kind === 'person' && x.id === u.id).slice(-15).reverse();
    const timeline = [...DB.projects.filter((p) => p.team.some((x) => x.userId === u.id) && canSeeActivity(p)).map((p) => ({ d: p.end, t: p.title, s: p.status, l: '#project-' + p.id, k: 'Проект' })), ...ach.map((a) => ({ d: a.date, t: a.title, s: a.status, l: '', k: ACH_TYPES[a.type].name })), ...evOrg.map((e) => ({ d: e.date, t: e.title, s: e.status, l: '#event-' + e.id, k: 'Мероприятие' }))].sort((a, b) => b.d.localeCompare(a.d));
    body = `<div class="grid g2">${card('История активности', timeline.length ? `<ul class="timeline">${timeline.map((x) => `<li><span class="tl-d">${fmtDate(x.d)}</span><span><small>${esc(x.k)}</small>${x.l ? `<a href="${x.l}">${esc(x.t)}</a>` : `<b>${esc(x.t)}</b>`} ${statusChip(x.s)}</span></li>`).join('')}</ul>` : '<p class="muted">Пока пусто</p>')}
      ${card('История изменений баллов', log.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Причина</th><th class="num">Баллы</th><th class="num">Место</th></tr></thead><tbody>${log.map((x) => `<tr><td>${fmtDT(x.ts)}</td><td>${esc(x.reason)}</td><td class="num">${fmt1(x.from)} → ${fmt1(x.to)}</td><td class="num">${x.rankFrom || '—'} → ${x.rankTo || '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Изменения появятся после подтверждения ваших активностей экспертом.</p>')}</div>`;
  } else if (tab === 'mine') {
    body = card('Мои активности и заявки', allMine.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Активность</th><th>Тип</th><th>Статус</th><th>Обновлено</th><th></th></tr></thead><tbody>${allMine.sort((a, b) => ((b.history || []).slice(-1)[0]?.ts || '').localeCompare((a.history || []).slice(-1)[0]?.ts || '')).map((x) => { const tp = entityType(x); const last = (x.history || []).slice(-1)[0]; const appeal = DB.appeals.find((a) => a.entityId === x.id && a.status === 'open'); return `<tr><td><b>${esc(x.title)}</b>${x.status === 'needs_info' && x.review?.comment ? `<small class="warn-t">Эксперт: ${esc(x.review.comment)}</small>` : ''}</td><td>${tp === 'project' ? 'Проект' : tp === 'event' ? 'Мероприятие' : ACH_TYPES[x.type].name}</td><td>${statusChip(x.status)}${appeal ? chip('апелляция', 'warn') : ''}</td><td>${last ? fmtDate(last.ts) : '—'}</td><td class="act">${tp === 'achievement' && ['draft', 'needs_info'].includes(x.status) ? `<button class="btn sm" data-act="ach-edit" data-id="${x.id}">Исправить</button>` : tp !== 'achievement' ? `<a class="btn sm ghost" href="${entityLink(x)}">Открыть</a>` : ''}${['rejected', 'confirmed'].includes(x.status) && !appeal ? `<button class="btn sm ghost" data-act="appeal" data-id="${x.id}">Оспорить</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : emptyState('folder', 'Заявок пока нет', 'Добавьте проект, мероприятие или личное достижение и отправьте на проверку.', `<a class="btn primary" href="#achievement-new">${icon('plus', 16)}Добавить достижение</a>`));
  }
  const tabsList = [['profile', 'Профиль'], ['social', 'Общественная деятельность'], ['media', 'Медиа', (u.media || []).length], ['history', 'История']];
  if (own) tabsList.push(['mine', 'Мои заявки', allMine.filter((x) => x.status !== 'confirmed').length]);
  const canVerify = !u.verified && !u.councilRejected && isChairOf(u.companyId) && !own;
  return `<div class="page">
    ${own ? '' : `<nav class="crumbs"><a href="#people">${esc(t('people'))}</a> / <span>${esc(u.name)}</span></nav>`}
    <header class="ent-h person">${avatar(u, 92)}<div class="grow"><h1>${esc(u.name)}</h1><p class="sub">${esc(u.position)}${u.companyId ? ` · ${orgLink(u.companyId)}` : ''}</p>
      <div class="chips">${chip((RG(u.regionId) || {}).name + (u.city && u.city !== (RG(u.regionId) || {}).city ? ', ' + u.city : ''), '', 'pin')}${u.startYear ? chip('В компании с ' + u.startYear, '', 'clock') : ''}${inRating ? chip(u.councilRole, u.councilRole === 'Председатель' ? 'accent' : '') : chip(ROLES[u.role].name, 'accent')}${inRating && !u.verified ? chip(u.councilRejected ? 'Заявка в совет отклонена' : 'Членство ожидает подтверждения', 'warn') : ''}${u.demo ? testChip() : ''}</div>
      ${badges.length ? `<div class="badges sm">${badges.map((b) => `<span class="badge" title="${esc(b.label)}">${icon(b.icon, 15)}${esc(b.label)}</span>`).join('')}</div>` : ''}</div>
      <div class="btn-row">${own ? `<a class="btn" href="#me-edit">${icon('edit', 16)}Редактировать профиль</a>${can('achievement.create') ? `<a class="btn primary" href="#achievement-new">${icon('plus', 16)}Добавить достижение</a>` : ''}` : ''}${canVerify ? `<button class="btn primary" data-act="member-verify" data-id="${u.id}">${icon('check', 16)}Подтвердить членство</button>` : ''}</div></header>
    ${inRating ? `<div class="kpis k5">${kpi('Набранные баллы', s ? fmt1(s.total) : '0,0', 'из 100 · весь период')}${kpi('Место в ТОП-100', s && s.total > 0 ? String(s.rank) : '—', s && s.rank <= 100 && s.total > 0 ? 'входит в ТОП-100' : '')}${kpi('Подтверждённых проектов', fmt(conf.length), s && s.avgShare ? `средний личный вклад ${fmt(s.avgShare)}%` : '')}${kpi('Волонтёрских часов', fmt(volH), 'личные подтверждённые')}${kpi('Организовано мероприятий', fmt(evOrg.filter((e) => e.status === 'confirmed').length))}</div>` : ''}
    ${tabs(tabK, tabsList, tab)}
    ${body}
  </div>`;
}
route('person', (id) => { const u = U(id); if (!u || u.role === 'admin') return ROUTES.notfound.render(); return personView(u, me() && me().id === id); });
route('me', () => personView(me(), true), guardLogin);
UPLOAD['user-media'] = async (files) => {
  const u = me(); if (!u) return;
  const kind = UI.umKind || 'photo';
  const items = await acceptFiles(files, kind === 'photo' ? {} : { kind: kind === 'video' ? 'video' : 'doc' });
  items.forEach((m) => { m.cat = kind; if (kind === 'photo' && m.type && !m.type.startsWith('image/')) m.kind = 'doc'; });
  u.media = [...(u.media || []), ...items];
  audit('Загрузка медиафайлов в профиль', 'user', u.id, items.map((m) => m.name).join(', '));
  commit(); toast(`Загружено файлов: ${items.length}`, 'good'); rerender();
};
ACTIONS['media-remove'] = (el) => {
  const id = el.dataset.id;
  if (UI.pf && UI.pf.media && UI.pf.media.some((m) => m.id === id)) { UI.pf.media = UI.pf.media.filter((m) => m.id !== id); rerender(); return; }
  if (UI.af && UI.af.files && UI.af.files.some((m) => m.id === id)) { UI.af.files = UI.af.files.filter((m) => m.id !== id); rerender(); return; }
  if (UI.evr && UI.evr.media && UI.evr.media.some((m) => m.id === id)) { UI.evr.media = UI.evr.media.filter((m) => m.id !== id); rerender(); return; }
  const u = me(); if (u && (u.media || []).some((m) => m.id === id)) { u.media = u.media.filter((m) => m.id !== id); audit('Удаление медиафайла', 'user', u.id, id); commit(); rerender(); }
};

/* ---------- редактирование профиля ---------- */
route('me-edit', () => {
  const u = me();
  const roots = DB.orgs.filter((o) => o.type !== 'subsidiary');
  const root = UI.meRoot || rootOf(u.companyId) || 'sk';
  const subs = childrenOf(root);
  return `<div class="page narrow">
    <nav class="crumbs"><a href="#me">${esc(t('me'))}</a> / <span>Редактирование</span></nav>
    ${pageHead('Редактирование профиля', 'Изменения видны другим участникам сразу после сохранения')}
    <form class="form card pad" data-form="profile">
      <div class="photo-row">${avatar(u, 84)}<div><label class="btn">${icon('upload', 16)}Загрузить фотографию<input type="file" accept="image/*" hidden data-upload="avatar"></label><p class="note">Квадратное фото, лицо по центру. Изображение будет уменьшено до 400 пикселей.</p></div></div>
      <h3 class="fs">Личная информация</h3>
      <div class="form-grid">
        ${fld('ФИО', inp('name', u.name, 'required autocomplete="name"'), '', true)}
        ${fld('Должность', inp('position', u.position, 'required'), '', true)}
        ${u.role === 'expert' || u.role === 'admin' ? '' : fld('Компания', sel('root', roots.map((o) => [o.id, o.name]), root, 'data-act-change="me-root"'), 'Смена компании отправит заявку председателю нового совета')}
        ${u.role === 'expert' || u.role === 'admin' ? '' : fld('Дочерняя организация', sel('companyId', [[root, '— Головная компания —'], ...subs.map((o) => [o.id, o.name])], subs.some((s) => s.id === u.companyId) ? u.companyId : root))}
        ${fld('Департамент / подразделение', inp('dept', u.dept))}
        ${fld('Регион', sel('regionId', regionOptions(), u.regionId))}
        ${fld('Город', inp('city', u.city))}
        ${fld('Год начала работы', inp('startYear', u.startYear, 'type="number" min="1990" max="2030"'))}
      </div>
      ${fld('Краткая биография', txa('bio', u.bio, 4, 'maxlength="800"'), 'До 800 знаков')}
      ${fld('Образование', txa('education', u.education, 2))}
      ${fld('Профессиональные интересы', inp('interests', u.interests))}
      ${fld('Навыки и компетенции', inp('skills', (u.skills || []).join(', ')), 'Через запятую')}
      ${fld('Спортивная активность', inp('sport', u.sport))}
      ${fld('Должность в Молодёжном совете', `<input class="input" value="${esc(u.councilRole)}" disabled>`, 'Меняет председатель совета')}
      <div class="btn-row end"><a class="btn ghost" href="#me">Отмена</a><button class="btn primary" type="submit">${icon('check', 16)}Сохранить</button></div>
    </form></div>`;
}, guardLogin);
ACTIONS['me-root'] = (el) => { UI.meRoot = el.value; rerender(); };
UPLOAD.avatar = async (files) => {
  const f = files[0]; if (!f) return;
  if (!/^image\//.test(f.type)) { toast('Нужен файл изображения', 'bad'); return; }
  const key = newMediaKey('avatar.jpg', 'avatar');
  try { await MEDIA.put(key, await resizeImage(f, 400, 0.86)); } catch (e) { toast('Не удалось загрузить фото: ' + (e.message || e), 'bad'); return; }
  if (UI.reg && CURRENT.name === 'register') { UI.reg.data.photo = key; rerender(); return; }
  const u = me(); u.photo = key; audit('Обновление фотографии профиля', 'user', u.id, ''); commit(); toast('Фотография обновлена', 'good'); rerender();
};
FORMS.profile = (form) => {
  const d = formData(form); const u = me();
  if (!d.name || !d.position) { toast('Заполните ФИО и должность', 'bad'); return; }
  const prevCo = u.companyId;
  Object.assign(u, { name: d.name, position: d.position, dept: d.dept, regionId: d.regionId, city: d.city, startYear: +d.startYear || u.startYear, bio: d.bio, education: d.education, interests: d.interests, skills: d.skills.split(',').map((x) => x.trim()).filter(Boolean), sport: d.sport });
  if (d.companyId && d.companyId !== prevCo) {
    u.companyId = d.companyId; u.verified = false; u.councilRejected = false; u.councilRole = 'Участник';
    const ch = O(d.companyId).council.chairId; notify(ch, `${u.name} просит подтвердить членство в Молодёжном совете`, '#company-' + d.companyId);
  }
  audit('Редактирование профиля', 'user', u.id, u.name);
  commit(); UI.meRoot = null; toast('Профиль сохранён', 'good'); go('me');
};

/* ---------- личное достижение ---------- */
route('achievement-new', () => {
  const u = me();
  if (!can('achievement.create')) return denied('Добавлять достижения могут участники советов.');
  const a = (UI.af = UI.af || { id: null, type: 'volunteer', title: '', date: todayISO(), hours: '', org: '', desc: '', files: [] });
  const hrs = a.type === 'volunteer' || a.type === 'social';
  return `<div class="page narrow">
    <nav class="crumbs"><a href="#me">${esc(t('me'))}</a> / <span>${a.id ? 'Исправление достижения' : 'Новое достижение'}</span></nav>
    ${pageHead(a.id ? 'Исправление достижения' : 'Добавить личное достижение', 'Волонтёрство, обучение, наставничество, награды. Баллы начисляются после подтверждения экспертом.')}
    <form class="form card pad" data-form="achievement">
      <div class="form-grid">
        ${fld('Тип достижения', sel('af-type', Object.entries(ACH_TYPES).map(([k, v]) => [k, v.name]), a.type, 'data-bind="af.type" data-rerender="1"'), '', true)}
        ${fld('Дата', inp('af-date', a.date, 'type="date" data-bind="af.date" required'), '', true)}
      </div>
      ${fld('Название', inp('af-title', a.title, 'data-bind="af.title" required placeholder="Например: Волонтёр городского марафона"'), '', true)}
      <div class="form-grid">
        ${hrs ? fld('Количество часов', inp('af-hours', a.hours, 'type="number" min="1" max="500" data-bind="af.hours"'), 'Эксперт сверит часы с подтверждающим документом', true) : ''}
        ${fld('Организация / выдавший орган', inp('af-org', a.org, 'data-bind="af.org"'))}
      </div>
      ${fld('Описание', txa('af-desc', a.desc, 3, 'data-bind="af.desc"'))}
      <h3 class="fs">Подтверждающие документы <em>*</em></h3>
      <label class="drop">${icon('upload', 20)}<span><b>Сертификат, благодарственное письмо, справка или фото</b><small>PDF, JPG, PNG · до 15 МБ</small></span><input type="file" multiple hidden data-upload="ach-files" accept="image/*,.pdf,.doc,.docx"></label>
      ${a.files.length ? gallery(a.files, ACH_TYPES[a.type].cat, true) : ''}
      <div class="btn-row end"><a class="btn ghost" href="#me" data-act="af-cancel">Отмена</a><button class="btn" type="submit" name="mode" value="draft">Сохранить черновик</button><button class="btn primary" type="submit" name="mode" value="submit">${icon('shield', 16)}Отправить на проверку</button></div>
    </form></div>`;
}, guardLogin);
ACTIONS['af-cancel'] = () => { UI.af = null; go('me'); };
UPLOAD['ach-files'] = async (files) => { const items = await acceptFiles(files, { kind: undefined }); items.forEach((m) => { if (m.kind !== 'photo') m.kind = 'cert'; }); UI.af.files.push(...items); rerender(); };
ACTIONS['ach-edit'] = (el) => { const a = DB.achievements.find((x) => x.id === el.dataset.id); UI.af = JSON.parse(JSON.stringify(a)); go('achievement-new'); };
FORMS.achievement = (form, e) => {
  const mode = (e.submitter && e.submitter.value) || 'draft';
  const a = UI.af; const u = me();
  const errs = [];
  if (!a.title.trim()) errs.push('название');
  if (mode === 'submit') {
    if ((a.type === 'volunteer' || a.type === 'social') && !(+a.hours > 0)) errs.push('количество часов');
    if (!a.files.length) errs.push('подтверждающий документ');
  }
  if (errs.length) { toast('Заполните: ' + errs.join(', '), 'bad'); return; }
  let x = a.id ? DB.achievements.find((y) => y.id === a.id) : null;
  if (!x) { x = { id: uid('a'), userId: u.id, status: 'draft', review: null, history: [{ ts: new Date().toISOString(), actorId: u.id, action: 'Создан черновик' }] }; DB.achievements.push(x); }
  Object.assign(x, { type: a.type, title: a.title.trim(), date: a.date, hours: +a.hours || 0, org: a.org, desc: a.desc, files: a.files });
  const dup = findDuplicate(x);
  if (mode === 'submit' && dup) { toast('Такое достижение уже учтено: одна активность не может засчитываться дважды', 'bad'); return; }
  audit(a.id ? 'Изменение достижения' : 'Создание достижения', 'achievement', x.id, x.title);
  if (mode === 'submit') submitForReview(x); else commit();
  UI.af = null;
  toast(mode === 'submit' ? 'Отправлено на проверку независимому эксперту' : 'Черновик сохранён', 'good');
  UI.tabs['pr-' + u.id] = 'mine'; go('me');
};
ACTIONS.appeal = (el) => {
  const x = findEntity(el.dataset.id);
  openModal({
    title: 'Оспорить оценку', body: `<p class="lead">«${esc(x.title)}» — ${esc(STATUS[x.status].label.toLowerCase())}.</p><p class="note">Апелляцию рассматривает администратор. При обоснованных доводах назначается повторная экспертиза другим экспертом, решение фиксируется в журнале аудита.</p>${fld('Основание для пересмотра', txa('ap-reason', '', 4, 'placeholder="Какие факты не учтены и какие документы это подтверждают"'), '', true)}`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Подать апелляцию', cls: 'primary', fn: () => {
      const reason = $('#ap-reason').value.trim(); if (reason.length < 15) { toast('Опишите основание подробнее (от 15 знаков)', 'bad'); return; }
      DB.appeals.push({ id: uid('ap'), entityType: entityType(x), entityId: x.id, userId: me().id, reason, status: 'open', ts: new Date().toISOString(), resolution: '' });
      x.history.push({ ts: new Date().toISOString(), actorId: me().id, action: 'Подана апелляция', note: reason });
      audit('Подача апелляции', entityType(x), x.id, reason);
      DB.users.filter((u) => u.role === 'admin').forEach((a) => notify(a.id, `Новая апелляция по «${x.title}»`, '#admin'));
      commit(); closeModal(); toast('Апелляция отправлена администратору', 'good'); rerender();
    } }]
  });
};

/* ---------- уведомления ---------- */
route('notifications', () => {
  const list = myNotifications();
  return `<div class="page narrow">${pageHead(t('notifications'), list.length ? `${list.filter((n) => !n.read).length} непрочитанных` : '', list.some((n) => !n.read) ? `<button class="btn" data-act="notif-read-all">${icon('check', 16)}Отметить все прочитанными</button>` : '')}
    ${list.length ? `<div class="card"><div class="nlist2">${list.map((n) => `<a class="ntf ${n.read ? '' : 'unread'}" href="${n.link || '#notifications'}" data-act="notif-open" data-id="${n.id}"><i class="dot"></i><span><b>${esc(n.text)}</b><small>${fmtDT(n.ts)}</small></span></a>`).join('')}</div></div>` : emptyState('bell', 'Уведомлений нет', 'Здесь появятся решения экспертов, изменения рейтинга и заявки.')}</div>`;
}, guardLogin);
ACTIONS['notif-read-all'] = () => { myNotifications().forEach((n) => { n.read = true; }); commit(); rerender(); };
ACTIONS['notif-open'] = (el) => { const n = DB.notifications.find((x) => x.id === el.dataset.id); if (n) { n.read = true; commit(); } go((n && n.link ? n.link : '#notifications').slice(1)); };

/* ---------- вход и регистрация ---------- */
const DEMO_ROLES = [
  ['admin', 'Главный администратор Фонда', 'Полный доступ: компании, пользователи, критерии рейтинга, эксперты, аудит'],
  ['chair', 'Председатель совета · KEGOC', 'Профиль компании, состав совета, проекты, статистика своей компании'],
  ['regional', 'Региональный председатель · КТЖ, Караганда', 'Мероприятия и проекты региона, региональная аналитика'],
  ['member', 'Участник · QazaqGaz', 'Личный профиль, достижения, проекты, отправка на проверку'],
  ['expert', 'Независимый эксперт', 'Очередь проверки, оценка по критериям, подтверждение и отклонение'],
  ['expertConflict', 'Эксперт из КазМунайГаза', 'Пример конфликта интересов: заявки группы КМГ ему не видны']
];
function demoGrid() {
  return `<div class="demo-grid">${DEMO_ROLES.map(([k, l, d]) => { const id = DB.demoAccounts[k]; const u = U(id); if (!u) return ''; return `<button class="demo-acc ${me() && me().id === id ? 'on' : ''}" data-act="demo-login" data-id="${id}">${avatar(u, 36)}<span><b>${esc(l)}</b><small>${esc(u.name)}</small><small class="muted">${esc(d)}</small></span></button>`; }).join('')}<button class="demo-acc" data-act="demo-logout">${icon('eye', 22)}<span><b>Гость</b><small class="muted">Только открытые страницы, опубликованные проекты, рейтинги и новости</small></span></button></div>`;
}
ACTIONS['role-switch'] = () => openModal({ title: 'Посмотреть платформу глазами роли', body: `<p class="note">Демо-режим: выберите тестовый аккаунт. Набор разделов и действий меняется по правилам ролевого доступа.</p>${demoGrid()}`, wide: true });
ACTIONS['demo-login'] = (el) => { api.signInDemo(el.dataset.id); closeModal(); toast('Вы вошли как ' + ROLES[myRole()].name); if (['login', 'register'].includes(CURRENT.name)) go('home'); else rerender(); };
ACTIONS['demo-logout'] = () => { if (me()) api.signOut(); closeModal(); toast('Вы просматриваете платформу как гость'); if (['me', 'expert', 'admin', 'analytics'].includes(CURRENT.name)) go('home'); else rerender(); };
ACTIONS.logout = ACTIONS['demo-logout'];

route('login', () => `<div class="page narrow">
  <div class="auth">
    <section class="card pad">${pageHead(t('login'), 'Войдите по e-mail, указанному при регистрации')}
      <form class="form" data-form="login">${fld('E-mail', inp('email', '', 'type="email" required autocomplete="email"'), '', true)}${fld('Пароль', inp('password', '', 'type="password" required autocomplete="current-password"'), '', true)}<div class="btn-row"><button class="btn primary" type="submit">${icon('login', 16)}Войти</button><a class="btn ghost" href="#register">Регистрация</a></div></form>
      <p class="note">В рабочей версии вход выполняется через корпоративную учётную запись (Supabase Auth, SSO). В демо-версии данные хранятся только в вашем браузере.</p></section>
    <section class="card pad"><h2 class="h3">Демо-аккаунты</h2><p class="note">Тестовые пользователи для просмотра платформы в разных ролях.</p>${demoGrid()}</section>
  </div></div>`);
FORMS.login = async (form) => {
  const d = formData(form);
  try { await api.signIn(d.email, d.password); toast('Добро пожаловать, ' + me().name.split(' ')[1], 'good'); go('home'); }
  catch (err) { toast(err.message, 'bad'); }
};

route('register', () => {
  if (me()) return `<div class="page narrow">${emptyState('user', 'Вы уже вошли в систему', 'Чтобы зарегистрировать нового участника, сначала выйдите.', `<button class="btn" data-act="demo-logout">${icon('logout', 16)}Выйти</button>`)}</div>`;
  const R = (UI.reg = UI.reg || { step: 1, data: { root: '', companyId: '', regionId: 'ast' } });
  const d = R.data;
  const steps = ['Учётная запись', 'Компания', 'Профиль', 'Фотография'];
  let body = '';
  if (R.step === 1) {
    body = `${fld('ФИО', inp('name', d.name || '', 'required autocomplete="name" placeholder="Фамилия Имя Отчество"'), '', true)}
      ${fld('Корпоративный e-mail', inp('email', d.email || '', 'type="email" required autocomplete="email"'), '', true)}
      ${fld('Пароль', inp('password', '', 'type="password" required minlength="8" autocomplete="new-password"'), 'Не короче 8 символов', true)}
      <label class="check"><input type="checkbox" name="consent" ${d.consent ? 'checked' : ''} required><span>Даю согласие на сбор и обработку персональных данных в соответствии с Законом РК «О персональных данных и их защите»</span></label>
      <label class="check"><input type="checkbox" name="age" ${d.age ? 'checked' : ''} required><span>Мне 35 лет или меньше, я работаю в компании группы Самрук-Қазына</span></label>`;
  } else if (R.step === 2) {
    const roots = DB.orgs.filter((o) => o.type !== 'subsidiary');
    const root = d.root || '';
    const subs = root ? childrenOf(root) : [];
    body = `${fld('Компания', sel('root', [['', 'Выберите компанию'], ...roots.map((o) => [o.id, o.full])], root, 'required data-act-change="reg-root"'), '', true)}
      ${root ? fld('Дочерняя организация', sel('companyId', [[root, '— Головная компания —'], ...subs.map((o) => [o.id, o.full])], d.companyId || root), subs.length ? 'Если вы работаете в ДЗО, выберите его — вы попадёте в его Молодёжный совет' : 'У компании нет ДЗО на платформе') : ''}
      <div class="form-grid">${fld('Регион', sel('regionId', regionOptions(), d.regionId || 'ast'), '', true)}${fld('Город', inp('city', d.city || ''))}</div>
      ${root ? `<div class="hint-card">${icon('users', 18)}<span>Молодёжный совет ${esc(O(d.companyId || root).name)}: ${councilMembers(d.companyId || root).filter((u) => u.verified).length} участников. Председатель — ${esc((U(O(d.companyId || root).council.chairId) || {}).name || 'не назначен')}. После регистрации он подтвердит ваше членство.</span></div>` : ''}`;
  } else if (R.step === 3) {
    body = `<div class="form-grid">${fld('Должность', inp('position', d.position || '', 'required'), '', true)}${fld('Департамент / подразделение', inp('dept', d.dept || ''))}${fld('Год начала работы', inp('startYear', d.startYear || new Date().getFullYear(), 'type="number" min="1990" max="2030"'))}</div>
      ${fld('Краткая биография', txa('bio', d.bio || '', 4, 'placeholder="Чем занимаетесь, что хотите развивать в совете"'))}
      ${fld('Образование', inp('education', d.education || ''))}
      ${fld('Навыки и компетенции', inp('skills', d.skills || ''), 'Через запятую')}`;
  } else {
    const fake = { name: d.name, photo: d.photo };
    body = `<div class="photo-row">${avatar(fake, 96)}<div><label class="btn">${icon('upload', 16)}Загрузить фотографию<input type="file" accept="image/*" hidden data-upload="avatar"></label><p class="note">Можно пропустить и добавить позже в личном кабинете.</p></div></div>
      <div class="hint-card">${icon('info', 18)}<span>После регистрации: найдите свой Молодёжный совет, посмотрите проекты, добавьте активность и отправьте её на проверку. После подтверждения экспертом вы увидите изменение своего рейтинга.</span></div>`;
  }
  return `<div class="page narrow">${pageHead(t('register'), 'Создайте профиль участника Молодёжного совета')}
    <ol class="stepper">${steps.map((s, i) => `<li class="${i + 1 === R.step ? 'on' : i + 1 < R.step ? 'done' : ''}"><span>${i + 1 < R.step ? icon('check', 14) : i + 1}</span>${esc(s)}</li>`).join('')}</ol>
    <form class="form card pad" data-form="register">${body}
      <div class="btn-row end">${R.step > 1 ? `<button class="btn ghost" type="button" data-act="reg-back">${icon('chevL', 16)}Назад</button>` : `<a class="btn ghost" href="#login">У меня есть аккаунт</a>`}<button class="btn primary" type="submit">${R.step < 4 ? 'Далее' : 'Создать профиль'}${icon(R.step < 4 ? 'chevR' : 'check', 16)}</button></div></form></div>`;
});
ACTIONS['reg-root'] = (el) => { UI.reg.data.root = el.value; UI.reg.data.companyId = el.value; rerender(); };
ACTIONS['reg-back'] = () => { UI.reg.step = Math.max(1, UI.reg.step - 1); rerender(); };
FORMS.register = async (form) => {
  const R = UI.reg; const d = formData(form);
  if (R.step === 1) {
    if (!d.name || d.name.split(' ').length < 2) { toast('Укажите фамилию и имя', 'bad'); return; }
    if (!/^\S+@\S+\.\S+$/.test(d.email)) { toast('Проверьте e-mail', 'bad'); return; }
    if ((d.password || '').length < 8) { toast('Пароль должен быть не короче 8 символов', 'bad'); return; }
    if (DB.users.some((u) => u.email === d.email.toLowerCase())) { toast('Этот e-mail уже зарегистрирован', 'bad'); return; }
    Object.assign(R.data, { name: d.name, email: d.email, password: d.password, consent: true, age: true });
  } else if (R.step === 2) {
    if (!d.root) { toast('Выберите компанию', 'bad'); return; }
    Object.assign(R.data, { root: d.root, companyId: d.companyId || d.root, regionId: d.regionId, city: d.city });
  } else if (R.step === 3) {
    if (!d.position) { toast('Укажите должность', 'bad'); return; }
    Object.assign(R.data, { position: d.position, dept: d.dept, startYear: d.startYear, bio: d.bio, education: d.education, skills: d.skills });
  } else {
    try {
      const x = R.data;
      await api.signUp({ ...x, skills: String(x.skills || '').split(',').map((s) => s.trim()).filter(Boolean) });
      UI.reg = null;
      toast('Профиль создан. Председатель совета подтвердит ваше членство.', 'good');
      go('me'); return;
    } catch (err) { toast(err.message, 'bad'); return; }
  }
  R.step++; rerender();
};
