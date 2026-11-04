/* =====================================================================
   Страницы: проекты (каталог, карточка, форма), мероприятия (календарь, карточка, форма)
   ===================================================================== */

/* ============================ ПРОЕКТЫ ============================ */
route('projects', () => {
  const f = (UI.pr = { q: '', cat: '', root: '', region: '', scope: 'confirmed', sort: 'new', limit: 24, ...(UI.pr || {}) });
  const u = me();
  let list = DB.projects.filter(canSeeActivity);
  if (f.scope === 'confirmed' || !u) list = list.filter((p) => p.status === 'confirmed');
  if (f.scope === 'mine' && u) list = list.filter((p) => p.createdBy === u.id || p.leaderId === u.id || p.team.some((x) => x.userId === u.id));
  if (f.scope === 'review' && u) list = list.filter((p) => p.status !== 'confirmed');
  if (f.q) list = list.filter((p) => norm(p.title + ' ' + p.desc + ' ' + orgLabel(p.orgId)).includes(norm(f.q)));
  if (f.cat) list = list.filter((p) => p.category === f.cat);
  if (f.root) list = list.filter((p) => rootOf(p.orgId) === f.root || (p.partnerOrgIds || []).some((x) => rootOf(x) === f.root));
  if (f.region) list = list.filter((p) => p.regionId === f.region);
  if (f.sort === 'score') list.sort((a, b) => qProject(b) - qProject(a));
  else if (f.sort === 'reach') list.sort((a, b) => verifiedReach(b) - verifiedReach(a));
  else list.sort((a, b) => b.end.localeCompare(a.end));
  const shown = list.slice(0, f.limit);
  const scopes = u ? [['confirmed', 'Подтверждённые'], ['all', 'Все доступные'], ['review', 'На проверке и черновики'], ['mine', 'Мои']] : [['confirmed', 'Подтверждённые']];
  return `<div class="page">
    ${pageHead(t('projects'), 'Проекты и инициативы Молодёжных советов. Гости видят только подтверждённые экспертами проекты.', can('project.create') ? `<a class="btn primary" href="#project-new" data-act="project-new">${icon('plus', 16)}Добавить проект</a>` : '')}
    <div class="filters">
      <div class="f-search">${icon('search', 16)}<input id="pr-q" type="search" placeholder="Название, описание или компания" value="${esc(f.q)}" data-live="pr.q"></div>
      ${sel('pr-cat', catOptions('Все направления'), f.cat, 'data-live="pr.cat"')}
      ${sel('pr-root', rootOptions('Все организации'), f.root, 'data-live="pr.root"')}
      ${sel('pr-region', regionOptions('Все регионы'), f.region, 'data-live="pr.region"')}
      ${sel('pr-sort', [['new', 'Сначала новые'], ['score', 'По оценке эксперта'], ['reach', 'По охвату']], f.sort, 'data-live="pr.sort" aria-label="Сортировка"')}
    </div>
    ${u ? seg('pr.scope', scopes, f.scope) : ''}
    <p class="count">${list.length} ${plural(list.length, 'проект', 'проекта', 'проектов')}${f.region ? ` · ${esc(RG(f.region).name)} <button class="lnk" data-act="clear" data-k="pr.region">сбросить регион</button>` : ''}</p>
    ${shown.length ? `<div class="pgrid">${shown.map(pcard).join('')}</div>` : emptyState('folder', 'Проектов по этим условиям нет', 'Измените фильтры или добавьте свой проект.')}
    ${list.length > shown.length ? `<div class="more"><button class="btn" data-act="more" data-k="pr">Показать ещё</button></div>` : ''}
  </div>`;
});
ACTIONS.clear = (el) => { setPath(UI, el.dataset.k, ''); rerender(); };
ACTIONS['project-new'] = () => { UI.pf = null; UI.pfOrg = null; go('project-new'); };

route('project', (id) => {
  const p = DB.projects.find((x) => x.id === id);
  if (!p) return ROUTES.notfound.render();
  if (!canSeeActivity(p)) return me() ? denied('Проект ещё не подтверждён и доступен только команде, председателю совета и эксперту.') : needLogin('Проект ещё не подтверждён экспертом. Неподтверждённые проекты видит только команда.');
  const c = CAT(p.category);
  const u = me();
  const editable = canEditActivity(p);
  const owner = u && entityOwners(p).includes(u.id);
  const isExpert = u && p.review && p.review.expertId === u.id;
  const appeal = DB.appeals.find((a) => a.entityId === p.id && a.status === 'open');
  const q = qProject(p);
  const kc = kpiCompletion(p);
  const canComment = u && (owner || isExpert || u.role === 'admin' || isChairOf(p.orgId) || p.team.some((x) => x.userId === u.id));
  const partners = uniq((p.partnerOrgIds || []).filter((x) => x !== p.orgId));
  const photo = (p.media || []).find((m) => m.kind === 'photo' && m.key);
  const scoreRows = p.review && p.review.scores ? [['relevance', 'Актуальность и соответствие цели'], ['results', 'Достигнутые результаты'], ['evidence', 'Качество доказательств'], ['reach', 'Подтверждённый охват'], ['kpi', 'Выполнение KPI']] : [];
  return `<div class="page">
    <nav class="crumbs"><a href="#projects">${esc(t('projects'))}</a> / <span>${esc(p.title)}</span></nav>
    <header class="proj-h" style="--c:${c.color}">
      <div class="proj-cover">${photo ? `<img alt="" data-media="${photo.key}">` : icon(c.icon, 40)}</div>
      <div class="grow"><div class="chips">${catChip(p.category)}${statusChip(p.status)}${partners.length ? chip('Межкорпоративный', 'accent', 'link') : ''}${appeal ? chip('Апелляция на рассмотрении', 'warn') : ''}${p.demo ? testChip() : ''}</div>
        <h1>${esc(p.title)}</h1>
        <p class="sub">${orgLink(p.companyId)}${p.orgId !== p.companyId ? ` · ${orgLink(p.orgId)}` : ''} · ${esc((RG(p.regionId) || {}).name)} · ${fmtDate(p.start)} — ${fmtDate(p.end)}</p></div>
      <div class="btn-row">
        <button class="btn ghost" data-act="share" data-id="${p.id}">${icon('share', 16)}Поделиться</button>
        ${editable ? `<a class="btn" href="#project-edit-${p.id}" data-act="project-edit" data-id="${p.id}">${icon('edit', 16)}Редактировать</a>` : ''}
        ${editable && ['draft', 'needs_info'].includes(p.status) ? `<button class="btn primary" data-act="project-submit" data-id="${p.id}">${icon('shield', 16)}Отправить на проверку</button>` : ''}
        ${(isExpert || (u && u.role === 'admin')) && ['submitted', 'in_review'].includes(p.status) ? `<a class="btn primary" href="#review-${p.id}">${icon('shield', 16)}Перейти к проверке</a>` : ''}
        ${owner && ['rejected', 'confirmed'].includes(p.status) && !appeal ? `<button class="btn ghost" data-act="appeal" data-id="${p.id}">${icon('flag', 16)}Оспорить оценку</button>` : ''}
      </div>
    </header>
    ${p.status === 'needs_info' && p.review ? `<div class="banner warn">${icon('alert', 18)}<span><b>Эксперт запросил уточнения.</b> ${esc(p.review.comment)}</span></div>` : ''}
    ${p.status === 'rejected' && p.review ? `<div class="banner bad">${icon('x', 18)}<span><b>Активность отклонена.</b> ${esc(p.review.comment)} Решение можно оспорить.</span></div>` : ''}
    <div class="grid g-2-1">
      <div class="stack-v">
        ${card('Описание проекта', `<p>${esc(p.desc)}</p><dl class="dl1"><div><dt>Проблема, которую решает проект</dt><dd>${esc(p.problem)}</dd></div><div><dt>Цель и задачи</dt><dd>${esc(p.goal)}</dd></div><div><dt>Фактические результаты</dt><dd>${esc(p.results)}</dd></div><div><dt>${p.effectType === 'economic' ? 'Экономический эффект' : p.effectType === 'both' ? 'Социальный и экономический эффект' : 'Социальный эффект'}</dt><dd>${esc(p.effect)}</dd></div>${p.partners ? `<div><dt>Партнёры</dt><dd>${esc(p.partners)}</dd></div>` : ''}</dl>`)}
        ${card('Измеримые KPI', p.kpis.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Показатель</th><th class="num">План</th><th class="num">Факт</th><th>Выполнение</th></tr></thead><tbody>${p.kpis.map((k) => { const r = k.plan ? (k.fact / k.plan) * 100 : 0; return `<tr><td>${esc(k.name)} <small class="muted">${esc(k.unit)}</small></td><td class="num">${fmt(k.plan)}</td><td class="num">${fmt(k.fact)}</td><td><span class="kpi-bar">${bar(Math.min(r, 100), 100, r >= 100 ? 'good' : r >= 80 ? '' : 'warn')}<b>${fmt(r)}%</b></span></td></tr>`; }).join('')}</tbody></table></div><p class="note">Среднее выполнение KPI: ${fmt(Math.min(kc, 1.2) * 100)}%. Перевыполнение учитывается не выше 120%.</p>` : '<p class="muted">KPI не заданы</p>')}
        ${card('Фото, видео и документы', gallery(p.media, p.category) + '<p class="note">Количество фотографий не влияет на баллы: эксперт оценивает результаты, а не объём медиаматериалов.</p>')}
        ${partners.length ? card('Компании-партнёры из группы', `<div class="chips">${partners.map((x) => `<a class="chip" href="#company-${x}">${orgLogo(O(x), 20)}${esc(orgLabel(x))}</a>`).join('')}</div><p class="note">Подтверждённый межкорпоративный проект приносит баллы каждой компании-участнику.</p>`) : ''}
      </div>
      <div class="stack-v">
        ${card('Показатели', `<dl class="stats2"><div><dt>Участников</dt><dd>${fmt(p.participants)}</dd></div><div><dt>Охват заявленный</dt><dd>${fmt(p.reach)}</dd></div><div><dt>Охват подтверждённый</dt><dd>${p.review && p.review.verifiedReach != null ? fmt(p.review.verifiedReach) : '—'}</dd></div>${p.volunteerHours ? `<div><dt>Волонтёрских часов</dt><dd>${fmt(p.review && p.review.verifiedHours != null ? p.review.verifiedHours : p.volunteerHours)}</dd></div>` : ''}</dl>`)}
        ${card(`Команда · ${p.team.length}`, `<div class="team">${p.team.map((x) => { const m = U(x.userId); return `<a class="tm" href="#person-${m.id}">${avatar(m, 36)}<span class="grow"><b>${esc(m.name)}</b><small>${esc(x.role)}${m.companyId !== p.orgId ? ' · ' + esc(orgLabel(m.companyId)) : ''}</small></span><span class="share" title="Личный вклад">${x.share}%</span></a>`; }).join('')}</div><p class="note">Руководитель: ${userLink(U(p.leaderId))}. Автор инициативы: ${userLink(U(p.initiatorId))}. Доля определяет личные баллы каждого участника.</p>`)}
        ${p.review && p.review.scores ? card('Оценка независимого эксперта', `<div class="bigscore"><b>${fmt1(q)}</b><span>качество проекта из 10<br><small>средний балл ${fmt1(scoresAvg(p.review.scores))} × поправка на KPI</small></span></div><div class="breakdown">${scoreRows.map(([k, l]) => `<div class="bd"><span class="bd-l">${l}</span>${bar(p.review.scores[k], 10)}<span class="bd-v">${fmt1(p.review.scores[k])}</span></div>`).join('')}</div>${p.review.comment ? `<blockquote>${esc(p.review.comment)}</blockquote>` : ''}`) : ''}
        ${card('История статусов', `<ul class="timeline">${(p.history || []).slice().reverse().map((h) => `<li><span class="tl-d">${fmtDT(h.ts)}</span><span><b>${esc(h.action)}</b>${h.note ? `<small>${esc(h.note)}</small>` : ''}<small>${h.actorId === 'system' ? 'Система' : esc((U(h.actorId) || {}).name || '')}</small></span></li>`).join('')}</ul>`)}
        ${canComment || (p.comments || []).length ? card('Комментарии', `${(p.comments || []).length ? `<div class="comments">${p.comments.map((cm) => `<div class="cm">${avatar(U(cm.userId), 28)}<span><b>${esc(U(cm.userId).name)}</b> <small class="muted">${fmtDT(cm.ts)}</small><p>${esc(cm.text)}</p></span></div>`).join('')}</div>` : ''}${canComment ? `<form class="cm-form" data-form="comment" data-id="${p.id}"><textarea class="input" name="text" rows="2" placeholder="Комментарий для команды и эксперта" required></textarea><button class="btn sm" type="submit">Отправить</button></form>` : ''}`) : ''}
      </div>
    </div>
  </div>`;
});
ACTIONS.share = async (el) => {
  const url = location.href.split('#')[0] + '#project-' + el.dataset.id;
  try { await navigator.clipboard.writeText(url); toast('Ссылка на публичную страницу проекта скопирована', 'good'); }
  catch (e) { openModal({ title: 'Ссылка на проект', body: `<p class="note">Скопируйте ссылку вручную:</p><input class="input" id="share-url" value="${esc(url)}" readonly>`, onMount: (r) => { const i = $('#share-url', r); i.focus(); i.select(); } }); }
};
FORMS.comment = (form) => {
  const p = DB.projects.find((x) => x.id === form.dataset.id); const text = formData(form).text;
  if (!text) return;
  p.comments = p.comments || []; p.comments.push({ ts: new Date().toISOString(), userId: me().id, text });
  audit('Комментарий к проекту', 'project', p.id, text.slice(0, 120));
  uniq([...entityOwners(p), p.review && p.review.expertId].filter((x) => x && x !== me().id)).forEach((id) => notify(id, `Новый комментарий к проекту «${p.title}»`, '#project-' + p.id));
  commit(); rerender();
};
ACTIONS['project-edit'] = (el) => { UI.pf = null; go('project-edit-' + el.dataset.id); };
ACTIONS['project-submit'] = (el) => {
  const p = DB.projects.find((x) => x.id === el.dataset.id);
  const errs = validateProject(p, true);
  if (errs.length) { UI.pf = JSON.parse(JSON.stringify(p)); UI.pfErrors = errs; go('project-edit-' + p.id); toast('Заполните обязательные поля перед отправкой', 'bad'); return; }
  submitForReview(p); toast('Проект отправлен независимому эксперту', 'good'); rerender();
};

/* ---------- форма проекта ---------- */
function blankProject() {
  const u = me();
  const orgId = UI.pfOrg || (u.companyId && O(u.companyId) ? u.companyId : headId());
  const s = new Date(); const e = new Date(); e.setMonth(e.getMonth() + 2);
  return { id: null, title: '', orgId, companyId: rootOf(orgId), regionId: u.regionId || 'ast', category: 'prof', start: isoDate(s), end: isoDate(e), leaderId: u.id, initiatorId: u.id, team: [{ userId: u.id, role: 'Руководитель проекта', share: 100 }], desc: '', goal: '', problem: '', participants: '', reach: '', volunteerHours: '', results: '', kpis: [{ name: '', unit: 'чел.', plan: '', fact: '' }], effectType: 'social', effect: '', media: [], partners: '', partnerOrgIds: [] };
}
function validateProject(p, full) {
  const e = [];
  if (!String(p.title || '').trim()) e.push('Название проекта');
  if (!p.orgId) e.push('Организация-инициатор');
  if (!full) return e;
  if (!p.start || !p.end || p.end < p.start) e.push('Сроки: дата завершения не раньше даты начала');
  ['desc', 'goal', 'problem', 'results', 'effect'].forEach((k) => { if (!String(p[k] || '').trim()) e.push({ desc: 'Описание', goal: 'Цель и задачи', problem: 'Проблема', results: 'Фактические результаты', effect: 'Социальный или экономический эффект' }[k]); });
  if (!(+p.participants > 0)) e.push('Количество участников');
  if (!(+p.reach > 0)) e.push('Количество охваченных сотрудников');
  const size = sum(uniq([p.orgId, ...(p.partnerOrgIds || [])]).map(O).filter(Boolean), (o) => o.young);
  if (+p.reach > size) e.push(`Охват (${fmt(p.reach)}) больше численности молодёжи компаний проекта (${fmt(size)})`);
  const goodK = (p.kpis || []).filter((k) => String(k.name).trim() && +k.plan > 0 && k.fact !== '' && +k.fact >= 0);
  if (!goodK.length) e.push('Хотя бы один измеримый KPI с планом и фактом');
  const sh = sum(p.team || [], (x) => +x.share || 0);
  if (sh !== 100) e.push(`Сумма долей вклада команды должна быть 100% (сейчас ${sh}%)`);
  if ((p.team || []).some((x) => !(+x.share > 0))) e.push('У каждого участника команды доля больше 0%');
  if (!(p.team || []).some((x) => x.userId === p.leaderId)) e.push('Руководитель должен входить в команду');
  if (!(p.media || []).some((m) => m.kind !== 'photo')) e.push('Подтверждающий документ (отчёт, список участников, акт)');
  return e;
}
function projectForm(existing) {
  if (!can('project.create') && !(existing && canEditActivity(existing))) return denied('Добавлять проекты могут участники советов, председатели и администраторы.');
  if (existing && !canEditActivity(existing)) return denied(['draft', 'needs_info'].includes(existing.status) ? 'Редактировать проект могут автор, руководитель, председатель совета организации и администратор.' : 'Проект на проверке или уже подтверждён — редактирование закрыто. Для изменения подтверждённых данных подайте апелляцию.');
  if (!UI.pf || (existing && UI.pf.id !== existing.id) || (!existing && UI.pf.id)) UI.pf = existing ? JSON.parse(JSON.stringify(existing)) : blankProject();
  const p = UI.pf;
  const errs = UI.pfErrors || [];
  const roots = DB.orgs.filter((o) => o.type !== 'subsidiary');
  const subs = childrenOf(p.companyId);
  const sh = sum(p.team, (x) => +x.share || 0);
  const social = ['social', 'charity', 'eco'].includes(p.category);
  const teamOpts = p.team.map((x) => [x.userId, U(x.userId).name]);
  return `<div class="page narrow-w">
    <nav class="crumbs"><a href="#projects">${esc(t('projects'))}</a> / <span>${existing ? 'Редактирование' : 'Новый проект'}</span></nav>
    ${pageHead(existing ? 'Редактирование проекта' : 'Новый проект или инициатива', 'Баллы начисляются только после проверки независимым экспертом. Поля со звёздочкой обязательны для отправки на проверку.')}
    ${errs.length ? `<div class="banner bad">${icon('alert', 18)}<span><b>Перед отправкой исправьте:</b><ul>${errs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></span></div>` : ''}
    ${existing && existing.status === 'needs_info' && existing.review ? `<div class="banner warn">${icon('message', 18)}<span><b>Комментарий эксперта:</b> ${esc(existing.review.comment)}</span></div>` : ''}
    <form class="form" data-form="project">
      <section class="card pad"><h3 class="fs">1. Основное</h3>
        ${fld('Название проекта', inp('pf-title', p.title, 'data-bind="pf.title" required maxlength="140"'), '', true)}
        <div class="form-grid">
          ${fld('Организация-инициатор', sel('pf-company', roots.map((o) => [o.id, o.name]), p.companyId, 'data-act-change="pf-company"'), '', true)}
          ${subs.length ? fld('Подразделение', sel('pf-org', [[p.companyId, '— ' + orgLabel(p.companyId) + ' —'], ...subs.map((o) => [o.id, o.name])], p.orgId, 'data-bind="pf.orgId"'), 'Совет, который реализует проект') : ''}
          ${fld('Регион', sel('pf-region', regionOptions(), p.regionId, 'data-bind="pf.regionId"'), '', true)}
          ${fld('Категория', sel('pf-cat', CATS.map((c) => [c.id, c.name]), p.category, 'data-bind="pf.category" data-rerender="1"'), '', true)}
          ${fld('Дата начала', inp('pf-start', p.start, 'type="date" data-bind="pf.start"'), '', true)}
          ${fld('Дата завершения', inp('pf-end', p.end, 'type="date" data-bind="pf.end"'), '', true)}
        </div>
      </section>
      <section class="card pad"><h3 class="fs">2. Содержание</h3>
        ${fld('Описание', txa('pf-desc', p.desc, 3, 'data-bind="pf.desc"'), '', true)}
        ${fld('Проблема, которую решает проект', txa('pf-problem', p.problem, 2, 'data-bind="pf.problem"'), '', true)}
        ${fld('Цель и задачи', txa('pf-goal', p.goal, 3, 'data-bind="pf.goal"'), '', true)}
      </section>
      <section class="card pad"><h3 class="fs">3. Команда и личный вклад</h3>
        <p class="note">Отметьте сотрудников из любых компаний группы — так формируются межкорпоративные команды. Доли вклада определяют личные баллы: сумма должна быть 100%.</p>
        <div class="team-ed">${p.team.map((x, i) => { const m = U(x.userId); return `<div class="te-row">${avatar(m, 32)}<span class="te-n"><b>${esc(m.name)}</b><small>${esc(orgLabel(m.companyId))}</small></span><input class="input" aria-label="Роль в проекте" value="${esc(x.role)}" data-bind="pf.team.${i}.role" placeholder="Роль"><span class="te-s"><input class="input num" type="number" min="1" max="100" aria-label="Доля вклада, %" value="${esc(x.share)}" data-bind="pf.team.${i}.share" data-rerender-blur="1">%</span><button type="button" class="icon-btn" data-act="team-rm" data-i="${i}" aria-label="Убрать из команды">${icon('x', 16)}</button></div>`; }).join('')}</div>
        <div class="te-foot"><div class="sugg-wrap"><span class="f-search">${icon('search', 16)}<input id="team-q" placeholder="Добавить участника: ФИО или компания" data-suggest="team" autocomplete="off"></span><div class="sugg" id="team-sugg" hidden></div></div><span class="share-sum ${sh === 100 ? 'ok' : 'bad'}">Сумма долей: <b>${sh}%</b></span><button type="button" class="btn sm ghost" data-act="team-even">Распределить поровну</button></div>
        <div class="form-grid">
          ${fld('Руководитель проекта', sel('pf-leader', teamOpts, p.leaderId, 'data-bind="pf.leaderId"'), 'Выбирается из команды', true)}
          ${fld('Автор инициативы', sel('pf-init', teamOpts, p.initiatorId, 'data-bind="pf.initiatorId"'), 'Получает баллы за реализованную инициативу')}
        </div>
      </section>
      <section class="card pad"><h3 class="fs">4. Результаты и KPI</h3>
        <div class="form-grid">
          ${fld('Количество участников', inp('pf-part', p.participants, 'type="number" min="1" data-bind="pf.participants"'), '', true)}
          ${fld('Количество охваченных сотрудников', inp('pf-reach', p.reach, 'type="number" min="1" data-bind="pf.reach"'), 'Эксперт сверит со списками', true)}
          ${social ? fld('Волонтёрских часов', inp('pf-hours', p.volunteerHours, 'type="number" min="0" data-bind="pf.volunteerHours"')) : ''}
        </div>
        ${fld('Фактические результаты', txa('pf-results', p.results, 3, 'data-bind="pf.results"'), '', true)}
        <div class="kpi-ed"><span class="fl">Измеримые KPI <em>*</em></span>${p.kpis.map((k, i) => `<div class="ke-row"><input class="input" placeholder="Показатель" aria-label="Показатель" value="${esc(k.name)}" data-bind="pf.kpis.${i}.name"><input class="input" placeholder="Ед." aria-label="Единица измерения" value="${esc(k.unit)}" data-bind="pf.kpis.${i}.unit"><input class="input num" type="number" min="0" placeholder="План" aria-label="План" value="${esc(k.plan)}" data-bind="pf.kpis.${i}.plan"><input class="input num" type="number" min="0" placeholder="Факт" aria-label="Факт" value="${esc(k.fact)}" data-bind="pf.kpis.${i}.fact"><button type="button" class="icon-btn" data-act="kpi-rm" data-i="${i}" aria-label="Удалить KPI">${icon('x', 16)}</button></div>`).join('')}<button type="button" class="btn sm ghost" data-act="kpi-add">${icon('plus', 15)}Добавить KPI</button></div>
        <div class="form-grid">${fld('Тип эффекта', sel('pf-et', [['social', 'Социальный'], ['economic', 'Экономический'], ['both', 'Социальный и экономический']], p.effectType, 'data-bind="pf.effectType"'))}</div>
        ${fld('Социальный или экономический эффект', txa('pf-effect', p.effect, 2, 'data-bind="pf.effect"'), '', true)}
      </section>
      <section class="card pad"><h3 class="fs">5. Партнёры</h3>
        <div class="form-grid">${fld('Компании-партнёры из группы', sel('pf-partner', [['', 'Добавить компанию…'], ...DB.orgs.filter((o) => o.id !== p.orgId && !p.partnerOrgIds.includes(o.id)).map((o) => [o.id, (o.type === 'subsidiary' ? '— ' : '') + o.name])], '', 'data-act-change="pf-partner"'), 'Делает проект межкорпоративным')}</div>
        ${p.partnerOrgIds.length ? `<div class="chips">${p.partnerOrgIds.map((x) => `<span class="chip">${esc(orgLabel(x))}<button type="button" class="chip-x" data-act="partner-rm" data-id="${x}" aria-label="Убрать">${icon('x', 12)}</button></span>`).join('')}</div>` : ''}
        ${fld('Внешние партнёры', inp('pf-partners', p.partners, 'data-bind="pf.partners" placeholder="Акимат, НКО, вуз"'))}
      </section>
      <section class="card pad"><h3 class="fs">6. Фото, видео, презентации и документы</h3>
        <label class="drop">${icon('upload', 20)}<span><b>Перетащите файлы или нажмите, чтобы выбрать</b><small>Фото, видео до 40 МБ, PDF, DOCX, PPTX, XLSX до 15 МБ. Нужен хотя бы один подтверждающий документ.</small></span><input type="file" multiple hidden data-upload="pf-media" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"></label>
        ${p.media.length ? gallery(p.media, p.category, true) : ''}
        <p class="note">${icon('info', 14)} Количество фотографий не влияет на баллы.</p>
      </section>
      <div class="btn-row end sticky-actions"><a class="btn ghost" href="${existing ? '#project-' + existing.id : '#projects'}" data-act="pf-cancel">Отмена</a><button class="btn" type="submit" name="mode" value="draft">Сохранить черновик</button><button class="btn primary" type="submit" name="mode" value="submit">${icon('shield', 16)}Отправить на проверку</button></div>
    </form></div>`;
}
route('project-new', () => projectForm(null), guardLogin);
route('project-edit', (id) => { const p = DB.projects.find((x) => x.id === id); if (!p) return ROUTES.notfound.render(); return projectForm(p); }, guardLogin);
ACTIONS['pf-cancel'] = (el) => { UI.pf = null; UI.pfErrors = null; go(el.getAttribute('href').slice(1)); };
ACTIONS['pf-company'] = (el) => { UI.pf.companyId = el.value; UI.pf.orgId = el.value; rerender(); };
ACTIONS['pf-partner'] = (el) => { if (el.value && !UI.pf.partnerOrgIds.includes(el.value)) UI.pf.partnerOrgIds.push(el.value); rerender(); };
ACTIONS['partner-rm'] = (el) => { UI.pf.partnerOrgIds = UI.pf.partnerOrgIds.filter((x) => x !== el.dataset.id); rerender(); };
ACTIONS['kpi-add'] = () => { UI.pf.kpis.push({ name: '', unit: '', plan: '', fact: '' }); rerender(); };
ACTIONS['kpi-rm'] = (el) => { UI.pf.kpis.splice(+el.dataset.i, 1); if (!UI.pf.kpis.length) UI.pf.kpis.push({ name: '', unit: '', plan: '', fact: '' }); rerender(); };
ACTIONS['team-rm'] = (el) => { const i = +el.dataset.i; if (UI.pf.team.length === 1) { toast('В команде должен остаться хотя бы один участник', 'warn'); return; } UI.pf.team.splice(i, 1); if (!UI.pf.team.some((x) => x.userId === UI.pf.leaderId)) UI.pf.leaderId = UI.pf.team[0].userId; if (!UI.pf.team.some((x) => x.userId === UI.pf.initiatorId)) UI.pf.initiatorId = UI.pf.team[0].userId; rerender(); };
ACTIONS['team-even'] = () => { const n = UI.pf.team.length; const b = Math.floor(100 / n); UI.pf.team.forEach((x, i) => { x.share = b + (i < 100 - b * n ? 1 : 0); }); rerender(); };
SUGGEST.team = (el) => {
  const box = $('#team-sugg'); const s = norm(el.value);
  if (s.length < 2) { box.hidden = true; return; }
  const inTeam = new Set(UI.pf.team.map((x) => x.userId));
  const res = DB.users.filter((u) => ['member', 'chair', 'regional'].includes(u.role) && !u.blocked && !inTeam.has(u.id) && norm(u.name + ' ' + orgLabel(u.companyId)).includes(s)).slice(0, 7);
  box.innerHTML = res.length ? res.map((u) => `<button type="button" data-act="team-add" data-id="${u.id}">${avatar(u, 26)}<span><b>${esc(u.name)}</b><small>${esc(u.position)} · ${esc(orgLabel(u.companyId))}</small></span></button>`).join('') : '<p class="muted pad">Никого не нашли</p>';
  box.hidden = false; hydrateMedia(box);
};
ACTIONS['team-add'] = (el) => {
  const u = U(el.dataset.id); const p = UI.pf;
  p.team.push({ userId: u.id, role: 'Участник команды', share: 0 });
  if (u.companyId && rootOf(u.companyId) !== rootOf(p.orgId) && !p.partnerOrgIds.includes(u.companyId)) { p.partnerOrgIds.push(u.companyId); toast(`${orgLabel(u.companyId)} добавлена как компания-партнёр`); }
  rerender(); setTimeout(() => { const q = $('#team-q'); if (q) { q.value = ''; q.focus(); } }, 0);
};
UPLOAD['pf-media'] = async (files) => { const items = await acceptFiles(files); UI.pf.media.push(...items); rerender(); };
FORMS.project = (form, e) => {
  const mode = (e.submitter && e.submitter.value) || 'draft';
  const p = UI.pf; const u = me();
  p.team.forEach((x) => { x.share = +x.share || 0; });
  const errs = validateProject(p, mode === 'submit');
  if (errs.length) { UI.pfErrors = errs; rerender(); window.scrollTo(0, 0); toast('Проверьте обязательные поля', 'bad'); return; }
  const data = { ...p, companyId: rootOf(p.orgId), participants: +p.participants || 0, reach: +p.reach || 0, volunteerHours: +p.volunteerHours || 0, kpis: p.kpis.filter((k) => String(k.name).trim()).map((k) => ({ ...k, plan: +k.plan || 0, fact: +k.fact || 0 })) };
  let x = p.id ? DB.projects.find((y) => y.id === p.id) : null;
  if (mode === 'submit') { const dup = findDuplicate({ ...data, id: p.id || 'pnew' }); if (dup) { UI.pfErrors = [`Похожий проект уже учтён: «${dup.title}» (${orgLabel(dup.orgId)}). Одна активность не может засчитываться дважды.`]; rerender(); return; } }
  if (!x) {
    x = { ...data, id: uid('p'), status: 'draft', review: null, comments: [], createdBy: u.id, createdAt: new Date().toISOString(), history: [{ ts: new Date().toISOString(), actorId: u.id, action: 'Создан черновик' }] };
    DB.projects.push(x); audit('Создание проекта', 'project', x.id, x.title);
    uniq(x.team.map((t0) => t0.userId)).filter((id) => id !== u.id).forEach((id) => notify(id, `Вас отметили в команде проекта «${x.title}»`, '#project-' + x.id));
  } else {
    const keep = { id: x.id, status: x.status, review: x.review, comments: x.comments, createdBy: x.createdBy, createdAt: x.createdAt, history: x.history, submittedAt: x.submittedAt, demo: x.demo };
    Object.assign(x, data, keep);
    x.history.push({ ts: new Date().toISOString(), actorId: u.id, action: 'Внесены изменения' });
    audit('Изменение проекта', 'project', x.id, x.title);
  }
  if (mode === 'submit') submitForReview(x); else commit();
  UI.pf = null; UI.pfErrors = null; UI.pfOrg = null;
  toast(mode === 'submit' ? 'Проект отправлен на проверку независимому эксперту' : 'Черновик сохранён', 'good');
  go('project-' + x.id);
};

/* ============================ МЕРОПРИЯТИЯ ============================ */
route('events', () => {
  const now = new Date();
  const f = (UI.ev = { view: 'calendar', month: isoDate(now).slice(0, 7), root: '', region: '', cat: '', when: 'all', day: null, from: '', to: '', ...(UI.ev || {}) });
  let list = DB.events.filter(canSeeActivity);
  if (f.root) list = list.filter((e) => rootOf(e.orgId) === f.root);
  if (f.region) list = list.filter((e) => e.regionId === f.region);
  if (f.cat) list = list.filter((e) => e.category === f.cat);
  const [yy, mm] = f.month.split('-').map(Number);
  let body = '';
  if (f.view === 'calendar') {
    const first = new Date(yy, mm - 1, 1);
    const startDow = (first.getDay() + 6) % 7;
    const days = new Date(yy, mm, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    const today = todayISO();
    const dayList = f.day ? list.filter((e) => e.date === f.day) : list.filter((e) => e.date.slice(0, 7) === f.month);
    body = `<div class="cal-head"><button class="icon-btn" data-act="cal-nav" data-d="-1" aria-label="Предыдущий месяц">${icon('chevL')}</button><h2>${MONTHS_FULL[mm - 1]} ${yy}</h2><button class="icon-btn" data-act="cal-nav" data-d="1" aria-label="Следующий месяц">${icon('chevR')}</button><button class="btn sm ghost" data-act="cal-today">Сегодня</button></div>
      <div class="cal" role="grid">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => `<span class="cal-dow">${d}</span>`).join('')}${cells.map((d) => {
        if (!d) return '<span class="cal-c empty"></span>';
        const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const evs = list.filter((e) => e.date === iso);
        return `<button class="cal-c ${iso === today ? 'today' : ''} ${f.day === iso ? 'sel' : ''} ${evs.length ? 'has' : ''}" data-act="cal-day" data-d="${iso}" aria-label="${d} ${MONTHS[mm - 1]}: ${evs.length} мероприятий"><b>${d}</b>${evs.slice(0, 2).map((e) => `<span class="cal-e" style="--c:${CAT(e.category).color}">${esc(e.title)}</span>`).join('')}${evs.length > 2 ? `<small>+${evs.length - 2}</small>` : ''}${evs.length ? `<i class="cal-dots">${evs.slice(0, 3).map((e) => `<i style="background:${CAT(e.category).color}"></i>`).join('')}</i>` : ''}</button>`;
      }).join('')}</div>
      <div class="cal-list"><h3>${f.day ? `Мероприятия ${fmtDate(f.day)} <button class="lnk" data-act="clear" data-k="ev.day">весь месяц</button>` : `Все мероприятия месяца · ${dayList.length}`}</h3>${dayList.length ? `<div class="elist">${dayList.sort((a, b) => a.date.localeCompare(b.date)).map(eventRow).join('')}</div>` : '<p class="muted">Нет мероприятий</p>'}</div>`;
  } else {
    let l2 = list.slice();
    if (f.when === 'upcoming') l2 = l2.filter((e) => e.date >= todayISO());
    if (f.when === 'past') l2 = l2.filter((e) => e.date < todayISO());
    if (f.from) l2 = l2.filter((e) => e.date >= f.from);
    if (f.to) l2 = l2.filter((e) => e.date <= f.to);
    l2.sort((a, b) => (f.when === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    const groups = {};
    l2.forEach((e) => { const k = e.date.slice(0, 7); (groups[k] = groups[k] || []).push(e); });
    body = `<div class="filters">${seg('ev.when', [['all', 'Все'], ['upcoming', 'Предстоящие'], ['past', 'Прошедшие']], f.when)}<label class="inline">с ${inp('ev-from', f.from, 'type="date" data-live="ev.from"')}</label><label class="inline">по ${inp('ev-to', f.to, 'type="date" data-live="ev.to"')}</label></div>
      ${Object.keys(groups).length ? Object.entries(groups).map(([k, arr]) => { const [y, m] = k.split('-').map(Number); return `<h3 class="grp">${MONTHS_FULL[m - 1]} ${y}</h3><div class="card"><div class="elist">${arr.map(eventRow).join('')}</div></div>`; }).join('') : emptyState('calendar', 'Мероприятий нет', 'Измените фильтры.')}`;
  }
  return `<div class="page">
    ${pageHead(t('events'), 'Календарь мероприятий Молодёжных советов: регистрация участников, итоги и подтверждение', can('event.create') ? `<a class="btn primary" href="#event-new" data-act="event-new">${icon('plus', 16)}Добавить мероприятие</a>` : '')}
    <div class="filters">${seg('ev.view', [['calendar', 'Календарь'], ['list', 'Список']], f.view)}
      ${sel('ev-root', rootOptions('Все организации'), f.root, 'data-live="ev.root"')}
      ${sel('ev-region', regionOptions('Все регионы'), f.region, 'data-live="ev.region"')}
      ${sel('ev-cat', catOptions('Все категории'), f.cat, 'data-live="ev.cat"')}</div>
    ${body}</div>`;
});
ACTIONS['cal-nav'] = (el) => { const [y, m] = UI.ev.month.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.d, 1); UI.ev.month = isoDate(d).slice(0, 7); UI.ev.day = null; rerender(); };
ACTIONS['cal-today'] = () => { UI.ev.month = todayISO().slice(0, 7); UI.ev.day = todayISO(); rerender(); };
ACTIONS['cal-day'] = (el) => { UI.ev.day = UI.ev.day === el.dataset.d ? null : el.dataset.d; rerender(); };
ACTIONS['event-new'] = () => { UI.ef = null; go('event-new'); };

route('event', (id) => {
  const e = DB.events.find((x) => x.id === id);
  if (!e) return ROUTES.notfound.render();
  if (!canSeeActivity(e)) return me() ? denied('Итоги мероприятия ещё не подтверждены.') : needLogin();
  const u = me();
  const past = e.date < todayISO();
  const isReg = u && e.registered.includes(u.id);
  const full = e.registered.length >= e.capacity;
  const manage = canEditActivity(e) || (u && u.role === 'admin');
  const d = new Date(e.date + 'T12:00:00');
  const c = CAT(e.category);
  const canReport = manage && (e.status === 'needs_info' || (e.status === 'planned' && past) || e.status === 'draft');
  if (canReport && (!UI.evr || UI.evr.id !== e.id)) UI.evr = { id: e.id, attended: e.attended || '', summary: e.summary || '', media: (e.media || []).slice() };
  const isExpert = u && e.review && e.review.expertId === u.id;
  return `<div class="page">
    <nav class="crumbs"><a href="#events">${esc(t('events'))}</a> / <span>${esc(e.title)}</span></nav>
    <header class="ent-h ev" style="--c:${c.color}"><span class="edate big"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]} ${d.getFullYear()}</small></span>
      <div class="grow"><div class="chips">${catChip(e.category)}${statusChip(e.status)}${e.demo ? testChip() : ''}</div><h1>${esc(e.title)}</h1><p class="sub">${orgLink(e.orgId)} · ${esc((RG(e.regionId) || {}).name)} · ${esc(e.time)} · ${esc(e.place)}</p></div>
      <div class="btn-row">${e.status === 'planned' && !past && u && can('event.register') ? (isReg ? `<button class="btn" data-act="ev-unreg" data-id="${e.id}">${icon('x', 16)}Отменить регистрацию</button>` : `<button class="btn primary" data-act="ev-reg" data-id="${e.id}" ${full ? 'disabled' : ''}>${icon('check', 16)}${full ? 'Мест нет' : 'Зарегистрироваться'}</button>`) : ''}${manage && e.status === 'planned' ? `<a class="btn" href="#event-edit-${e.id}" data-act="event-edit" data-id="${e.id}">${icon('edit', 16)}Редактировать</a>` : ''}${(isExpert || (u && u.role === 'admin')) && ['submitted', 'in_review'].includes(e.status) ? `<a class="btn primary" href="#review-${e.id}">${icon('shield', 16)}Перейти к проверке</a>` : ''}</div></header>
    ${e.status === 'needs_info' && e.review ? `<div class="banner warn">${icon('alert', 18)}<span><b>Эксперт запросил уточнения.</b> ${esc(e.review.comment)}</span></div>` : ''}
    <div class="grid g-2-1"><div class="stack-v">
      ${card('О мероприятии', `<p>${esc(e.desc)}</p><dl class="dl2"><div><dt>Организаторы</dt><dd>${(e.organizers || []).map((x) => userLink(U(x))).join(', ')}</dd></div><div><dt>Формат и место</dt><dd>${esc(e.place)}</dd></div><div><dt>Дата и время</dt><dd>${fmtDate(e.date)}, ${esc(e.time)}</dd></div><div><dt>Лимит участников</dt><dd>${e.capacity}</dd></div></dl>`)}
      ${e.status !== 'planned' ? card('Итоги мероприятия', `<dl class="stats2"><div><dt>Зарегистрировано</dt><dd>${e.registered.length}</dd></div><div><dt>Фактически пришли</dt><dd>${fmt(e.attended)}</dd></div><div><dt>Подтверждено экспертом</dt><dd>${e.review && e.review.verifiedAttended != null ? fmt(e.review.verifiedAttended) : '—'}</dd></div></dl><p>${esc(e.summary)}</p>${gallery(e.media, e.category)}`) : ''}
      ${canReport ? card('Подвести итоги и отправить на подтверждение', `<form class="form" data-form="ev-report" data-id="${e.id}"><div class="form-grid">${fld('Количество фактически пришедших', inp('evr-att', UI.evr.attended, 'type="number" min="1" data-bind="evr.attended" required'), `Зарегистрировано: ${e.registered.length}`, true)}</div>${fld('Итоги', txa('evr-sum', UI.evr.summary, 3, 'data-bind="evr.summary" required'), '', true)}<label class="drop">${icon('upload', 20)}<span><b>Фотоотчёт и лист регистрации</b><small>Лист регистрации обязателен для подтверждения</small></span><input type="file" multiple hidden data-upload="ev-media" accept="image/*,video/*,.pdf,.doc,.docx,.xlsx"></label>${UI.evr.media.length ? gallery(UI.evr.media, e.category, true) : ''}<div class="btn-row end"><button class="btn primary" type="submit">${icon('shield', 16)}Отправить на подтверждение</button></div></form>`) : ''}
    </div><div class="stack-v">
      ${card(`Участники · ${e.registered.length} из ${e.capacity}`, `${bar(e.registered.length, e.capacity)}<div class="avs">${e.registered.slice(0, 40).map((x) => `<a href="#person-${x}" title="${esc((U(x) || {}).name)}">${avatar(U(x), 32)}</a>`).join('')}${e.registered.length > 40 ? `<span class="more-n">+${e.registered.length - 40}</span>` : ''}</div>`)}
      ${e.review && e.review.scores ? card('Подтверждение эксперта', `<div class="bigscore"><b>${fmt1(scoresAvg(e.review.scores))}</b><span>средний балл из 10</span></div>${e.review.comment ? `<blockquote>${esc(e.review.comment)}</blockquote>` : ''}`) : ''}
      ${(e.history || []).length ? card('История', `<ul class="timeline">${e.history.slice().reverse().map((h) => `<li><span class="tl-d">${fmtDT(h.ts)}</span><span><b>${esc(h.action)}</b>${h.note ? `<small>${esc(h.note)}</small>` : ''}</span></li>`).join('')}</ul>`) : ''}
    </div></div></div>`;
});
ACTIONS['ev-reg'] = (el) => { const e = DB.events.find((x) => x.id === el.dataset.id); if (e.registered.length >= e.capacity) return; e.registered.push(me().id); audit('Регистрация на мероприятие', 'event', e.id, e.title); (e.organizers || []).forEach((o) => notify(o, `${me().name} зарегистрировался на «${e.title}»`, '#event-' + e.id)); commit(); toast('Вы зарегистрированы', 'good'); rerender(); };
ACTIONS['ev-unreg'] = (el) => { const e = DB.events.find((x) => x.id === el.dataset.id); e.registered = e.registered.filter((x) => x !== me().id); audit('Отмена регистрации на мероприятие', 'event', e.id, e.title); commit(); toast('Регистрация отменена'); rerender(); };
UPLOAD['ev-media'] = async (files) => { const items = await acceptFiles(files); UI.evr.media.push(...items); rerender(); };
FORMS['ev-report'] = (form) => {
  const e = DB.events.find((x) => x.id === form.dataset.id); const r = UI.evr;
  const errs = [];
  if (!(+r.attended > 0)) errs.push('количество пришедших');
  if (+r.attended > Math.max(e.capacity, e.registered.length) * 1.5) errs.push('число пришедших заметно больше лимита — проверьте');
  if (!String(r.summary).trim()) errs.push('итоги');
  if (!r.media.some((m) => m.kind !== 'photo') && !(e.media || []).some((m) => m.kind !== 'photo')) errs.push('лист регистрации (документ)');
  if (errs.length) { toast('Заполните: ' + errs.join(', '), 'bad'); return; }
  e.attended = +r.attended; e.summary = r.summary; e.media = r.media;
  e.history = e.history || [];
  audit('Итоги мероприятия', 'event', e.id, `${e.title}; пришли ${e.attended}`);
  submitForReview(e); UI.evr = null; toast('Итоги отправлены на подтверждение эксперту', 'good'); rerender();
};

function eventForm(existing) {
  if (!can('event.create') && !(existing && canEditActivity(existing))) return denied('Мероприятия добавляют председатели советов, региональные председатели и администраторы.');
  const u = me();
  if (!UI.ef || (existing && UI.ef.id !== existing.id) || (!existing && UI.ef.id)) {
    const d = new Date(); d.setDate(d.getDate() + 14);
    UI.ef = existing ? JSON.parse(JSON.stringify(existing)) : { id: null, title: '', orgId: u.role === 'admin' ? headId() : u.companyId, regionId: u.regionId, date: isoDate(d), time: '15:00', place: '', category: 'prof', desc: '', organizers: [u.id], capacity: 50, registered: [], attended: 0, summary: '', media: [] };
  }
  const e = UI.ef;
  const allowed = ['admin', 'regional'].includes(u.role) ? DB.orgs : DB.orgs.filter((o) => rootOf(o.id) === rootOf(u.companyId));
  const pool = DB.users.filter((x) => ['member', 'chair', 'regional'].includes(x.role) && rootOf(x.companyId) === rootOf(e.orgId) && !e.organizers.includes(x.id));
  return `<div class="page narrow">
    <nav class="crumbs"><a href="#events">${esc(t('events'))}</a> / <span>${existing ? 'Редактирование' : 'Новое мероприятие'}</span></nav>
    ${pageHead(existing ? 'Редактирование мероприятия' : 'Новое мероприятие', 'После проведения организатор вносит итоги и отправляет их на подтверждение')}
    <form class="form card pad" data-form="event">
      ${fld('Название', inp('ef-title', e.title, 'data-bind="ef.title" required'), '', true)}
      <div class="form-grid">
        ${fld('Компания / совет', sel('ef-org', allowed.map((o) => [o.id, (o.type === 'subsidiary' ? '— ' : '') + o.name]), e.orgId, 'data-bind="ef.orgId" data-rerender="1"'), '', true)}
        ${fld('Регион', sel('ef-region', regionOptions(), e.regionId, 'data-bind="ef.regionId"'), u.role === 'regional' ? 'Региональный председатель добавляет мероприятия своего региона' : '', true)}
        ${fld('Дата', inp('ef-date', e.date, 'type="date" data-bind="ef.date" required'), '', true)}
        ${fld('Время', inp('ef-time', e.time, 'type="time" data-bind="ef.time" required'), '', true)}
        ${fld('Категория', sel('ef-cat', CATS.map((c) => [c.id, c.name]), e.category, 'data-bind="ef.category"'), '', true)}
        ${fld('Лимит участников', inp('ef-cap', e.capacity, 'type="number" min="1" max="5000" data-bind="ef.capacity"'), '', true)}
      </div>
      ${fld('Место или ссылка на онлайн-трансляцию', inp('ef-place', e.place, 'data-bind="ef.place" required'), '', true)}
      ${fld('Описание', txa('ef-desc', e.desc, 4, 'data-bind="ef.desc"'))}
      <span class="fl">Организаторы</span>
      <div class="chips">${e.organizers.map((x) => `<span class="chip">${esc(U(x).name)}${e.organizers.length > 1 ? `<button type="button" class="chip-x" data-act="ef-org-rm" data-id="${x}" aria-label="Убрать">${icon('x', 12)}</button>` : ''}</span>`).join('')}</div>
      ${pool.length ? fld('Добавить организатора', sel('ef-org-add', [['', 'Выберите сотрудника…'], ...pool.map((x) => [x.id, x.name + ' · ' + orgLabel(x.companyId)])], '', 'data-act-change="ef-org-add"')) : ''}
      <div class="btn-row end"><a class="btn ghost" href="${existing ? '#event-' + existing.id : '#events'}">Отмена</a><button class="btn primary" type="submit">${icon('check', 16)}${existing ? 'Сохранить' : 'Опубликовать мероприятие'}</button></div>
    </form></div>`;
}
route('event-new', () => eventForm(null), guardLogin);
route('event-edit', (id) => { const e = DB.events.find((x) => x.id === id); if (!e) return ROUTES.notfound.render(); if (!canEditActivity(e)) return denied(); return eventForm(e); }, guardLogin);
ACTIONS['event-edit'] = (el) => { UI.ef = null; go('event-edit-' + el.dataset.id); };
ACTIONS['ef-org-add'] = (el) => { if (el.value) UI.ef.organizers.push(el.value); rerender(); };
ACTIONS['ef-org-rm'] = (el) => { UI.ef.organizers = UI.ef.organizers.filter((x) => x !== el.dataset.id); rerender(); };
FORMS.event = () => {
  const e = UI.ef; const u = me();
  if (!e.title.trim() || !e.date || !e.place.trim()) { toast('Заполните название, дату и место', 'bad'); return; }
  if (u.role === 'regional' && e.regionId !== u.regionId) { toast('Региональный председатель добавляет мероприятия только своего региона', 'bad'); return; }
  let x = e.id ? DB.events.find((y) => y.id === e.id) : null;
  if (!x) {
    const dup = findDuplicate({ ...e, id: 'enew' });
    if (dup) { toast(`Такое мероприятие уже есть: «${dup.title}», ${fmtDate(dup.date)}`, 'bad'); return; }
    x = { ...e, id: uid('e'), capacity: +e.capacity || 50, status: 'planned', review: null, createdBy: u.id, history: [{ ts: new Date().toISOString(), actorId: u.id, action: 'Мероприятие опубликовано' }] };
    DB.events.push(x); audit('Создание мероприятия', 'event', x.id, x.title);
  } else {
    Object.assign(x, { title: e.title, orgId: e.orgId, regionId: e.regionId, date: e.date, time: e.time, place: e.place, category: e.category, desc: e.desc, organizers: e.organizers, capacity: +e.capacity || x.capacity });
    x.history.push({ ts: new Date().toISOString(), actorId: u.id, action: 'Внесены изменения' }); audit('Изменение мероприятия', 'event', x.id, x.title);
  }
  commit(); UI.ef = null; toast('Мероприятие сохранено', 'good'); go('event-' + x.id);
};
