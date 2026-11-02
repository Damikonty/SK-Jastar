/* =====================================================================
   Страницы: рейтинги, экспертиза, новости, база знаний, аналитика,
   сравнение, администрирование, методика
   ===================================================================== */

/* ============================ РЕЙТИНГ СОВЕТОВ ============================ */
route('rating', () => {
  const f = (UI.rt = { period: 'quarter', region: '', cat: '', level: 'all', limit: 30, open: null, ...(UI.rt || {}) });
  const opt = { region: f.region, category: f.cat, level: f.level };
  const rows = companyScores({ ...opt, ...periodRange(f.period) });
  const prev = prevRanks(companyScores, opt, f.period);
  const shown = rows.slice(0, f.limit);
  const top3 = rows.slice(0, 3).filter((r) => r.total > 0);
  const pod = (r, cls) => r ? `<a class="pod ${cls}" href="#company-${r.orgId}"><span class="pod-n">${r.rank}</span>${orgLogo(O(r.orgId), 52)}<b>${esc(O(r.orgId).name)}</b><span class="pod-s">${fmt1(r.total)}<small> баллов</small></span><span class="pod-m">${pct(r.engagement)} вовлечённость · ${r.activities} ${plural(r.activities, 'активность', 'активности', 'активностей')}</span></a>` : '';
  const pLabel = PERIODS.find((p) => p.id === f.period).label.toLowerCase();
  return `<div class="page">
    ${pageHead('ТОП Молодёжных советов группы Самрук-Қазына', `Баллы из 100 по открытой методике. Учитываются только подтверждённые экспертами активности, показатели нормированы по численности молодёжи. ${testChip()}`, `<button class="btn ghost" data-act="rt-export">${icon('download', 16)}Excel</button><a class="btn ghost" href="#methodology">${icon('scale', 16)}Методика</a>`, 'Рейтинг')}
    <div class="filters">${seg('rt.period', PERIODS.map((p) => [p.id, p.label]), f.period)}
      ${sel('rt-region', regionOptions('Все регионы'), f.region, 'data-live="rt.region"')}
      ${sel('rt-cat', catOptions('Все категории деятельности'), f.cat, 'data-live="rt.cat"')}
      ${sel('rt-level', [['all', 'Каждый совет отдельно'], ['groups', 'Портфельные компании вместе с ДЗО']], f.level, 'data-live="rt.level" aria-label="Уровень рейтинга"')}</div>
    ${top3.length ? `<div class="podium">${pod(top3[1], 'p2')}${pod(top3[0], 'p1')}${pod(top3[2], 'p3')}</div>` : ''}
    ${card('', `<div class="tbl-wrap"><table class="tbl rating"><thead><tr><th class="num">Место</th><th>Изм.</th><th>Молодёжный совет</th><th class="num">Баллы</th><th class="num">Подтв. активностей</th><th class="num">Охват</th><th class="num">Проектов</th><th>Динамика места</th><th></th></tr></thead><tbody>
      ${shown.map((r) => { const o = O(r.orgId); const h = rankHistory(r.orgId, f.level); return `<tr class="${f.open === r.orgId ? 'open' : ''} ${r.rank <= 3 && r.total > 0 ? 'top' : ''}"><td class="num"><b class="rk">${r.rank}</b></td><td>${f.period === 'all' && !prev.size ? '' : delta(prev.get(r.orgId), r.rank)}</td><td><a class="tcell" href="#company-${o.id}">${orgLogo(o, 30)}<span><b>${esc(o.name)}</b><small>${o.type === 'subsidiary' ? 'ДЗО ' + esc(orgLabel(o.parentId)) : o.type === 'fund' ? 'Фонд' : 'Портфельная компания'} · ${fmt(r.size)} молодых</small></span></a></td><td class="num"><span class="sc">${bar(r.total)}<b>${fmt1(r.total)}</b></span></td><td class="num">${r.activities}</td><td class="num" title="Доля охваченных молодых сотрудников">${pct(r.engagement)}</td><td class="num">${r.projects}</td><td>${sparkline(h.map((x) => x.rank))}</td><td><button class="icon-btn" data-act="rt-open" data-id="${r.orgId}" aria-expanded="${f.open === r.orgId}" aria-label="Разбивка баллов">${icon('chevD', 16)}</button></td></tr>
        ${f.open === r.orgId ? `<tr class="detail"><td colspan="9"><div class="breakdown cols">${COMPANY_COMPONENTS.map((c) => `<div class="bd" data-tip="${esc(c.hint)}"><span class="bd-l">${esc(c.name)} <small>${DB.settings.wCompany[c.k]}%</small></span>${bar(r.comps[c.k])}<span class="bd-v">${fmt(r.comps[c.k])}<small> → ${fmt1((r.comps[c.k] * DB.settings.wCompany[c.k]) / 100)}</small></span></div>`).join('')}</div></td></tr>` : ''}`; }).join('')}
    </tbody></table></div>${rows.length > shown.length ? `<div class="more"><button class="btn" data-act="more" data-k="rt">Показать места ${shown.length + 1}–${Math.min(rows.length, shown.length + 30)}</button></div>` : ''}`)}
    <p class="note">Изменение позиции — относительно предыдущего периода такой же длины (${esc(pLabel)}). Для «Весь период» — относительно положения 30 дней назад. Нажмите ${icon('chevD', 12)}, чтобы увидеть разбивку баллов по 7 показателям.</p>
  </div>`;
});
ACTIONS['rt-open'] = (el) => { UI.rt.open = UI.rt.open === el.dataset.id ? null : el.dataset.id; rerender(); };
ACTIONS['rt-export'] = () => {
  const f = UI.rt;
  const rows = companyScores({ region: f.region, category: f.cat, level: f.level, ...periodRange(f.period) });
  exportXlsx(`JASTAR_рейтинг_советов_${f.period}.xlsx`, [{ name: 'Рейтинг советов', rows: [['ТЕСТОВЫЕ ДАННЫЕ ДЕМО-ВЕРСИИ'], ['Место', 'Совет', 'Тип', 'Баллы', 'Подтв. активностей', 'Вовлечённость, %', 'Проектов', 'Мероприятий', ...COMPANY_COMPONENTS.map((c) => c.name)], ...rows.map((r) => [r.rank, O(r.orgId).full, O(r.orgId).type, +r.total.toFixed(2), r.activities, +r.engagement.toFixed(1), r.projects, r.events, ...COMPANY_COMPONENTS.map((c) => +r.comps[c.k].toFixed(1))])] }]);
};

/* ============================ ТОП-100 ЛИДЕРОВ ============================ */
route('leaders', () => {
  const f = (UI.ld = { period: 'year', root: '', region: '', ...(UI.ld || {}) });
  const opt = { root: f.root, region: f.region };
  const rows = personScores({ ...opt, ...periodRange(f.period) }).filter((r) => r.total > 0).slice(0, 100);
  const prev = prevRanks(personScores, opt, f.period);
  const pod = (r, cls) => { if (!r) return ''; const u = U(r.userId); return `<a class="pod ${cls}" href="#person-${u.id}"><span class="pod-n">${r.rank}</span>${avatar(u, 56)}<b>${esc(u.name)}</b><span class="pod-m">${esc(orgLabel(u.companyId))}</span><span class="pod-s">${fmt1(r.total)}<small> баллов</small></span></a>`; };
  return `<div class="page">
    ${pageHead('ТОП-100 молодых лидеров группы Самрук-Қазына', `Индивидуальный рейтинг считает только личный вклад: долю участника в каждом подтверждённом проекте, руководство, инициативы и личные достижения. ${testChip()}`, `<button class="btn ghost" data-act="ld-export">${icon('download', 16)}Excel</button>`, 'Рейтинг')}
    <div class="filters">${seg('ld.period', PERIODS.map((p) => [p.id, p.label]), f.period)}
      ${sel('ld-root', [['', 'Все компании'], ...DB.orgs.filter((o) => o.type !== 'subsidiary').map((o) => [o.id, o.name + ' и ДЗО'])], f.root, 'data-live="ld.root"')}
      ${sel('ld-region', regionOptions('Все регионы'), f.region, 'data-live="ld.region"')}</div>
    ${rows.length >= 3 ? `<div class="podium">${pod(rows[1], 'p2')}${pod(rows[0], 'p1')}${pod(rows[2], 'p3')}</div>` : ''}
    ${rows.length ? card('', `<div class="tbl-wrap"><table class="tbl rating"><thead><tr><th class="num">Место</th><th>Изм.</th><th>Сотрудник</th><th>Компания</th><th>Регион</th><th class="num">Подтв. проектов</th><th>Личный вклад</th><th class="num">Баллы</th><th>Достижения</th></tr></thead><tbody>
      ${rows.map((r) => { const u = U(r.userId); const b = personBadges(u.id); return `<tr class="${r.rank <= 3 ? 'top' : ''}"><td class="num"><b class="rk">${r.rank}</b></td><td>${delta(prev.get(r.userId), r.rank)}</td><td><a class="tcell" href="#person-${u.id}">${avatar(u, 32)}<span><b>${esc(u.name)}</b><small>${esc(u.position)}</small></span></a></td><td>${esc(orgLabel(u.companyId))}</td><td>${esc((RG(u.regionId) || {}).city)}</td><td class="num">${r.projects}</td><td><span class="sc" title="Средняя личная доля в проектах: ${fmt(r.avgShare)}%">${bar(r.comps.contrib)}<small>${r.projects ? `ср. доля ${fmt(r.avgShare)}%` : '—'}</small></span></td><td class="num"><b>${fmt1(r.total)}</b></td><td><span class="bicons">${b.slice(0, 4).map((x) => `<span title="${esc(x.label)}">${icon(x.icon, 16)}</span>`).join('')}</span></td></tr>`; }).join('')}
    </tbody></table></div>`) : emptyState('award', 'За выбранный период нет подтверждённых активностей', 'Выберите более длинный период.')}
  </div>`;
});
ACTIONS['ld-export'] = () => {
  const f = UI.ld;
  const rows = personScores({ root: f.root, region: f.region, ...periodRange(f.period) }).filter((r) => r.total > 0).slice(0, 100);
  exportXlsx(`JASTAR_ТОП-100_${f.period}.xlsx`, [{ name: 'ТОП-100', rows: [['ТЕСТОВЫЕ ДАННЫЕ ДЕМО-ВЕРСИИ'], ['Место', 'ФИО', 'Компания', 'Должность', 'Регион', 'Подтв. проектов', 'Средняя доля, %', 'Баллы', ...PERSON_COMPONENTS.map((c) => c.name)], ...rows.map((r) => { const u = U(r.userId); return [r.rank, u.name, orgLabel(u.companyId), u.position, (RG(u.regionId) || {}).name, r.projects, Math.round(r.avgShare), +r.total.toFixed(2), ...PERSON_COMPONENTS.map((c) => +r.comps[c.k].toFixed(1))]; })] }]);
};

/* ============================ НЕЗАВИСИМАЯ ЭКСПЕРТИЗА ============================ */
function queueRow(x) {
  const tp = entityType(x);
  const org = entityOrg(x);
  const ex = x.review && U(x.review.expertId);
  const claim = tp === 'project' ? `охват ${fmt(x.reach)} · ${x.kpis.length} KPI` : tp === 'event' ? `пришли ${fmt(x.attended)}` : x.hours ? `${x.hours} ч` : ACH_TYPES[x.type].name;
  return `<a class="qrow" href="#review-${x.id}"><span class="q-ic">${icon(tp === 'project' ? 'folder' : tp === 'event' ? 'calendar' : 'award', 18)}</span><span class="grow"><b>${esc(x.title)}</b><small>${tp === 'project' ? 'Проект' : tp === 'event' ? 'Мероприятие' : 'Личное достижение · ' + esc((U(x.userId) || {}).name || '')} · ${esc(orgLabel(org))} · ${esc(claim)}</small></span><span class="q-side">${statusChip(x.status)}<small class="muted">${fmtDate(x.submittedAt || (x.review && x.review.assignedAt))}${myRole() === 'admin' ? ' · ' + esc(ex ? ex.name : 'без эксперта') : ''}</small></span></a>`;
}
route('expert', () => {
  const u = me();
  const all = [...DB.projects, ...DB.events, ...DB.achievements].filter((x) => x.review || x.status === 'submitted');
  const admin = u.role === 'admin';
  const mine = admin ? all : all.filter((x) => x.review && x.review.expertId === u.id);
  const free = all.filter((x) => x.status === 'submitted' && (!x.review || !x.review.expertId) && !hasConflict(u, entityOrg(x)));
  const tab = UI.tabs.ex || 'new';
  const sets = {
    new: mine.filter((x) => x.status === 'submitted'), work: mine.filter((x) => x.status === 'in_review'),
    info: mine.filter((x) => x.status === 'needs_info'), done: mine.filter((x) => ['confirmed', 'rejected'].includes(x.status)), free
  };
  const list = (sets[tab] || []).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
  const decided = sets.done.filter((x) => x.review && x.review.scores);
  const avg = decided.length ? sum(decided, (x) => scoresAvg(x.review.scores)) / decided.length : 0;
  const conflicts = uniq([...(u.conflicts || []), ...(u.companyId ? [u.companyId] : [])]);
  return `<div class="page">
    ${pageHead('Кабинет независимого эксперта', admin ? 'Администратор видит все заявки и может переназначать экспертов.' : 'Проверка доказательств, оценка по критериям и решение по каждой заявке. Все действия фиксируются в журнале аудита.', '', 'Экспертиза')}
    ${!admin ? `<div class="banner info">${icon('shield', 18)}<span><b>Конфликт интересов.</b> Вам не назначаются и не показываются заявки организаций: ${conflicts.length ? conflicts.map((c) => esc(orgLabel(c)) + (O(c) && O(c).type !== 'subsidiary' && c !== 'sk' ? ' и её ДЗО' : '')).join(', ') : 'нет задекларированных'}. <button class="lnk" data-act="ex-conflicts">Изменить декларацию</button></span></div>` : ''}
    <div class="kpis k4">${kpi('Новые заявки', fmt(sets.new.length), 'ожидают взятия в работу')}${kpi('В работе', fmt(sets.work.length))}${kpi('Ждут уточнений', fmt(sets.info.length), 'у авторов')}${kpi('Решено', fmt(sets.done.length), decided.length ? `средняя оценка ${fmt1(avg)}` : '')}</div>
    ${tabs('tabs.ex', [['new', 'Новые', sets.new.length], ['work', 'В работе', sets.work.length], ['info', 'Требуются уточнения', sets.info.length], ['done', 'Решённые', sets.done.length], ...(admin ? [] : [['free', 'Свободные заявки', free.length]])], tab)}
    ${list.length ? `<div class="card"><div class="qlist">${list.slice(0, 80).map(queueRow).join('')}</div></div>` : emptyState('check', 'Заявок нет', tab === 'new' ? 'Новые заявки появятся, когда авторы отправят активности на проверку.' : 'В этом разделе пусто.')}
  </div>`;
}, guardRoles('expert', 'admin'));
ACTIONS['ex-conflicts'] = () => {
  const u = me();
  openModal({
    title: 'Декларация конфликта интересов', wide: true,
    body: `<p class="note">Отметьте организации, с которыми у вас есть конфликт интересов (место работы, родственники, участие в проектах). Заявки этих организаций и их ДЗО вам назначаться не будут.</p><div class="checks">${DB.orgs.filter((o) => o.type !== 'subsidiary').map((o) => `<label class="check"><input type="checkbox" name="cf" value="${o.id}" ${(u.conflicts || []).includes(o.id) || u.companyId === o.id ? 'checked' : ''} ${u.companyId === o.id ? 'disabled' : ''}><span>${esc(o.full)}${u.companyId === o.id ? ' — ваша организация' : ''}</span></label>`).join('')}</div>`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить декларацию', cls: 'primary', fn: () => {
      u.conflicts = $$('input[name=cf]:checked:not(:disabled)').map((i) => i.value);
      audit('Изменение декларации конфликта интересов', 'user', u.id, u.conflicts.map(orgLabel).join(', ') || 'нет');
      const moved = [...DB.projects, ...DB.events, ...DB.achievements].filter((x) => x.review && x.review.expertId === u.id && ['submitted', 'in_review'].includes(x.status) && hasConflict(u, entityOrg(x)));
      moved.forEach((x) => { const ex = pickExpert(x, [u.id]); x.review.expertId = ex ? ex.id : null; x.status = 'submitted'; x.history.push({ ts: new Date().toISOString(), actorId: 'system', action: 'Переназначено из-за конфликта интересов' + (ex ? ': ' + ex.name : '') }); if (ex) notify(ex.id, `Новая заявка на проверку: «${x.title}»`, '#review-' + x.id); });
      commit(); closeModal(); toast(moved.length ? `Декларация сохранена, переназначено заявок: ${moved.length}` : 'Декларация сохранена', 'good'); rerender();
    } }]
  });
};

route('review', (id) => {
  const x = findEntity(id);
  if (!x) return ROUTES.notfound.render();
  const u = me();
  const org = entityOrg(x);
  const tp = entityType(x);
  if (u.role === 'expert' && hasConflict(u, org)) {
    if (!UI.cfLogged || UI.cfLogged !== id) { audit('Заблокирован доступ: конфликт интересов', tp, x.id, `${u.name} → ${orgLabel(org)}`); commit(); UI.cfLogged = id; }
    return `<div class="page narrow">${emptyState('lock', 'Конфликт интересов', `Вы не можете проверять активности ${orgLabel(org)}: организация входит в вашу декларацию конфликта интересов. Попытка доступа записана в журнал аудита.`, `<a class="btn" href="#expert">К очереди</a>`)}</div>`;
  }
  if (u.role === 'expert' && x.review && x.review.expertId && x.review.expertId !== u.id) return denied('Заявка назначена другому эксперту.');
  const assigned = x.review && x.review.expertId === u.id;
  const c = CAT(tp === 'achievement' ? ACH_TYPES[x.type].cat : x.category);
  const claim = tp === 'project'
    ? `<dl class="stats2"><div><dt>Участников</dt><dd>${fmt(x.participants)}</dd></div><div><dt>Охват заявлен</dt><dd>${fmt(x.reach)}</dd></div>${x.volunteerHours ? `<div><dt>Волонтёрских часов</dt><dd>${fmt(x.volunteerHours)}</dd></div>` : ''}<div><dt>Численность молодёжи</dt><dd>${fmt(O(x.orgId).young)}</dd></div></dl>
       <div class="tbl-wrap"><table class="tbl"><thead><tr><th>KPI</th><th class="num">План</th><th class="num">Факт</th><th class="num">%</th></tr></thead><tbody>${x.kpis.map((k) => `<tr><td>${esc(k.name)} <small class="muted">${esc(k.unit)}</small></td><td class="num">${fmt(k.plan)}</td><td class="num">${fmt(k.fact)}</td><td class="num">${k.plan ? fmt((k.fact / k.plan) * 100) : '—'}</td></tr>`).join('')}</tbody></table></div>
       <dl class="dl1"><div><dt>Проблема</dt><dd>${esc(x.problem)}</dd></div><div><dt>Результаты</dt><dd>${esc(x.results)}</dd></div><div><dt>Эффект</dt><dd>${esc(x.effect)}</dd></div></dl>
       <h3 class="fs">Команда и доли вклада</h3><div class="team">${x.team.map((t0) => `<div class="tm">${avatar(U(t0.userId), 30)}<span class="grow"><b>${esc(U(t0.userId).name)}</b><small>${esc(t0.role)} · ${esc(orgLabel(U(t0.userId).companyId))}</small></span><span class="share">${t0.share}%</span></div>`).join('')}</div>`
    : tp === 'event'
      ? `<dl class="stats2"><div><dt>Зарегистрировано</dt><dd>${x.registered.length}</dd></div><div><dt>Пришли (заявлено)</dt><dd>${fmt(x.attended)}</dd></div><div><dt>Лимит</dt><dd>${x.capacity}</dd></div></dl><p>${esc(x.summary)}</p>`
      : `<dl class="stats2"><div><dt>Сотрудник</dt><dd>${userLink(U(x.userId))}</dd></div><div><dt>Дата</dt><dd>${fmtDate(x.date)}</dd></div>${x.hours ? `<div><dt>Часов заявлено</dt><dd>${x.hours}</dd></div>` : ''}<div><dt>Организация</dt><dd>${esc(x.org || '—')}</dd></div></dl><p>${esc(x.desc)}</p>`;
  const media = tp === 'achievement' ? x.files : x.media;
  const R = x.review || {};
  if (assigned && x.status === 'in_review' && (!UI.rv || UI.rv.id !== x.id)) {
    UI.rv = { id: x.id, scores: { ...(R.scores || { relevance: 7, results: 7, evidence: 7, reach: 7, kpi: 7 }) }, verifiedReach: R.verifiedReach ?? x.reach ?? '', verifiedAttended: R.verifiedAttended ?? x.attended ?? '', verifiedHours: R.verifiedHours ?? x.volunteerHours ?? x.hours ?? '', comment: '' };
  }
  const crit = [['relevance', 'Актуальность и соответствие цели', 'Насколько активность решает заявленную проблему молодёжи'], ['results', 'Достигнутые результаты', 'Измеримость и значимость фактических результатов'], ['evidence', 'Качество доказательств', 'Документы, списки участников, акты. Количество фото не оценивается'], ['reach', 'Подтверждённый охват', 'Соответствие охвата спискам и численности'], ['kpi', 'Выполнение KPI', 'Соотношение плана и факта']];
  let panel = '';
  if (x.status === 'submitted' && (assigned || !R.expertId || u.role === 'admin')) {
    panel = `<p class="note">Перед оценкой возьмите заявку в работу — автор получит уведомление.</p><div class="btn-row"><button class="btn primary" data-act="rv-take" data-id="${x.id}">${icon('check', 16)}Взять в работу</button>${u.role === 'expert' ? `<button class="btn ghost" data-act="rv-decline" data-id="${x.id}">Заявить конфликт интересов</button>` : ''}</div>`;
  } else if (x.status === 'in_review' && assigned) {
    const r = UI.rv;
    const avg = scoresAvg(r.scores);
    panel = `<form class="form" data-form="review" data-id="${x.id}">
      ${tp !== 'achievement' ? crit.map(([k, l, h]) => `<div class="crit"><label for="rv-${k}"><b>${l}</b><small>${h}</small></label><input type="range" id="rv-${k}" min="0" max="10" step="0.5" value="${r.scores[k]}" data-bind="rv.scores.${k}" data-rerender="1"><output>${fmt1(r.scores[k])}</output></div>`).join('') + `<div class="avg-line">Средний балл: <b>${fmt1(avg)}</b>${tp === 'project' ? ` · качество с учётом KPI: <b>${fmt1(avg * (0.5 + 0.5 * Math.min(1, kpiCompletion(x))))}</b>` : ''}</div>` : ''}
      <div class="form-grid">
        ${tp === 'project' ? fld('Подтверждённый охват', inp('rv-reach', r.verifiedReach, 'type="number" min="0" data-bind="rv.verifiedReach"'), `Заявлено: ${fmt(x.reach)}`) : ''}
        ${tp === 'event' ? fld('Подтверждённое число участников', inp('rv-att', r.verifiedAttended, 'type="number" min="0" data-bind="rv.verifiedAttended"'), `Заявлено: ${fmt(x.attended)}`) : ''}
        ${(tp === 'project' && x.volunteerHours) || (tp === 'achievement' && x.hours) ? fld('Подтверждённые волонтёрские часы', inp('rv-hours', r.verifiedHours, 'type="number" min="0" data-bind="rv.verifiedHours"')) : ''}
      </div>
      ${fld('Комментарий и рекомендации', txa('rv-comment', r.comment, 3, 'data-bind="rv.comment" placeholder="Обязателен при отклонении и запросе уточнений"'))}
      <div class="btn-row"><button class="btn primary" type="submit" name="d" value="confirmed">${icon('check', 16)}Подтвердить</button><button class="btn" type="submit" name="d" value="needs_info">${icon('message', 16)}Запросить уточнения</button><button class="btn danger" type="submit" name="d" value="rejected">${icon('x', 16)}Отклонить</button></div>
    </form>`;
  } else if (R.scores || ['confirmed', 'rejected', 'needs_info'].includes(x.status)) {
    panel = `<p>${statusChip(x.status)}</p>${R.scores ? `<div class="bigscore"><b>${fmt1(scoresAvg(R.scores))}</b><span>средний балл</span></div>` : ''}${R.comment ? `<blockquote>${esc(R.comment)}</blockquote>` : ''}<p class="note">Решение принято ${fmtDT(R.decidedAt)}. Пересмотр возможен только через апелляцию.</p>`;
  } else panel = `<p class="muted">Заявка ещё не отправлена на проверку.</p>`;
  return `<div class="page">
    <nav class="crumbs"><a href="#expert">Экспертиза</a> / <span>${esc(x.title)}</span></nav>
    <header class="ent-h" style="--c:${c.color}"><span class="q-ic big">${icon(c.icon, 24)}</span><div class="grow"><div class="chips">${statusChip(x.status)}${tp !== 'achievement' ? catChip(x.category) : chip(ACH_TYPES[x.type].name)}${x.demo ? testChip() : ''}</div><h1>${esc(x.title)}</h1><p class="sub">${esc(orgLabel(org))}${x.regionId ? ' · ' + esc(RG(x.regionId).name) : ''}${tp === 'project' ? ` · ${fmtDate(x.start)} — ${fmtDate(x.end)}` : tp === 'event' ? ' · ' + fmtDate(x.date) : ''}</p></div>${tp !== 'achievement' ? `<a class="btn ghost" href="${entityLink(x)}">Открыть карточку</a>` : ''}</header>
    <div class="grid g-2-1 review"><div class="stack-v">
      ${card('Заявленные показатели', claim)}
      ${card('Доказательства', gallery(media, c.id) + '<p class="note">Откройте файлы и сверьте показатели. Фото помогают понять контекст, но баллы за их количество не начисляются.</p>')}
      ${card('История и комментарии', `<ul class="timeline">${(x.history || []).slice().reverse().map((h) => `<li><span class="tl-d">${fmtDT(h.ts)}</span><span><b>${esc(h.action)}</b>${h.note ? `<small>${esc(h.note)}</small>` : ''}<small>${h.actorId === 'system' ? 'Система' : esc((U(h.actorId) || {}).name || '')}</small></span></li>`).join('')}</ul>${(x.comments || []).map((cm) => `<div class="cm">${avatar(U(cm.userId), 28)}<span><b>${esc(U(cm.userId).name)}</b> <small class="muted">${fmtDT(cm.ts)}</small><p>${esc(cm.text)}</p></span></div>`).join('')}`)}
    </div><div class="stack-v sticky">${card('Оценка эксперта', panel)}</div></div></div>`;
}, guardRoles('expert', 'admin'));
ACTIONS['rv-take'] = (el) => { const x = findEntity(el.dataset.id); if (!x.review) x.review = { expertId: me().id, assignedAt: new Date().toISOString() }; if (!x.review.expertId) x.review.expertId = me().id; if (myRole() === 'admin') x.review.expertId = x.review.expertId || me().id; takeInWork(x); UI.rv = null; toast('Заявка взята в работу', 'good'); rerender(); };
ACTIONS['rv-decline'] = (el) => {
  const x = findEntity(el.dataset.id); const u = me();
  confirmModal('Заявить конфликт интересов?', 'Заявка будет передана другому эксперту без конфликта. Действие фиксируется в журнале аудита.', 'Передать заявку', () => {
    const ex = pickExpert(x, [u.id]);
    x.review.expertId = ex ? ex.id : null;
    x.history.push({ ts: new Date().toISOString(), actorId: u.id, action: 'Эксперт заявил конфликт интересов, заявка передана' + (ex ? ': ' + ex.name : ' администратору') });
    if (ex) notify(ex.id, `Новая заявка на проверку: «${x.title}»`, '#review-' + x.id);
    audit('Самоотвод эксперта (конфликт интересов)', entityType(x), x.id, x.title);
    commit(); go('expert');
  });
};
FORMS.review = (form, e) => {
  const x = findEntity(form.dataset.id); const r = UI.rv; const d = (e.submitter && e.submitter.value) || 'confirmed';
  if (d !== 'confirmed' && String(r.comment || '').trim().length < 10) { toast('Опишите причину в комментарии (от 10 знаков)', 'bad'); return; }
  const tp = entityType(x);
  const data = { scores: tp === 'achievement' ? { relevance: 8, results: 8, evidence: 8, reach: 8, kpi: 8 } : { ...r.scores }, comment: String(r.comment || '').trim() };
  Object.keys(data.scores).forEach((k) => { data.scores[k] = +data.scores[k]; });
  if (tp === 'project') { data.verifiedReach = Math.max(0, +r.verifiedReach || 0); if (x.volunteerHours) data.verifiedHours = Math.max(0, +r.verifiedHours || 0); if (data.verifiedReach > x.reach) { toast('Подтверждённый охват не может превышать заявленный', 'bad'); return; } }
  if (tp === 'event') { data.verifiedAttended = Math.max(0, +r.verifiedAttended || 0); if (data.verifiedAttended > x.attended) { toast('Подтверждённое число не может превышать заявленное', 'bad'); return; } }
  if (tp === 'achievement' && x.hours) data.verifiedHours = Math.max(0, Math.min(+r.verifiedHours || 0, x.hours));
  const go2 = () => {
    const ch = decide(x, d, data);
    UI.rv = null;
    const oc = ch.orgs.find((c) => c.id === entityOrg(x));
    toast(d === 'confirmed' ? `Подтверждено. ${oc ? `${orgLabel(oc.id)}: ${fmt1(oc.from)} → ${fmt1(oc.to)} баллов.` : ''} Рейтинги пересчитаны.` : d === 'rejected' ? 'Активность отклонена, автор уведомлён' : 'Автору отправлен запрос уточнений', 'good');
    go('expert');
  };
  if (d === 'rejected') confirmModal('Отклонить активность?', 'Автор получит уведомление с вашим комментарием и сможет подать апелляцию.', 'Отклонить', go2, true); else go2();
};

/* ============================ НОВОСТИ ============================ */
function newsList() {
  const f = (UI.nw = { kind: '', ...(UI.nw || {}) });
  let list = DB.news.filter((n) => n.published || myRole() === 'admin').sort((a, b) => b.date.localeCompare(a.date));
  if (f.kind) list = list.filter((n) => n.kind === f.kind);
  return `<div class="page">
    ${pageHead(t('news'), 'Новости, фотоотчёты, видео, анонсы, истории успеха, интервью и лучшие практики компаний', can('news.create') ? `<button class="btn primary" data-act="news-new">${icon('plus', 16)}Опубликовать материал</button>` : '')}
    <div class="chips filter-chips">${[['', 'Все'], ...Object.entries(NEWS_KINDS)].map(([k, l]) => `<button class="chip ${f.kind === k ? 'on' : ''}" data-act="seg" data-name="nw.kind" data-v="${k}">${esc(l)}</button>`).join('')}</div>
    ${list.length ? `<div class="ngrid">${newsCard(list[0], true)}${list.slice(1).map((n) => newsCard(n)).join('')}</div>` : emptyState('news', 'Материалов нет', '')}
  </div>`;
}
route('news', (id) => {
  if (!id) return newsList();
  const n = DB.news.find((x) => x.id === id);
  if (!n) return ROUTES.notfound.render();
  const related = DB.news.filter((x) => x.id !== n.id && x.published && (x.orgId === n.orgId || x.kind === n.kind)).slice(0, 3);
  const author = U(n.authorId);
  return `<div class="page narrow">
    <nav class="crumbs"><a href="#news">${esc(t('news'))}</a> / <span>${esc(NEWS_KINDS[n.kind])}</span></nav>
    <article class="article">
      <div class="chips">${chip(NEWS_KINDS[n.kind], 'accent')}${n.demo ? testChip() : ''}${!n.published ? chip('Снято с публикации', 'warn') : ''}</div>
      <h1>${esc(n.title)}</h1>
      <p class="lead">${esc(n.lead)}</p>
      <div class="byline">${orgLogo(O(n.orgId), 28)}<span>${orgLink(n.orgId)} · ${author ? userLink(author) + ' · ' : ''}${fmtDate(n.date)} · ${fmt(n.views)} просмотров</span></div>
      <div class="ncover big" style="--h:${ORG_HUE[rootOf(n.orgId)] ?? 200}">${n.cover ? `<img alt="" data-media="${n.cover}">` : `<span>${esc(NEWS_KINDS[n.kind])}</span>`}</div>
      ${n.body.map((p) => `<p>${esc(p)}</p>`).join('')}
      <div class="btn-row"><button class="btn ghost" data-act="copy-link" data-h="news-${n.id}">${icon('link', 16)}Скопировать ссылку</button>${myRole() === 'admin' ? `<button class="btn ghost" data-act="news-toggle" data-id="${n.id}">${n.published ? 'Снять с публикации' : 'Опубликовать'}</button>` : ''}</div>
    </article>
    ${related.length ? `<h2 class="h3">Читайте также</h2><div class="ngrid three">${related.map((x) => newsCard(x)).join('')}</div>` : ''}
  </div>`;
});
ACTIONS['copy-link'] = async (el) => { const url = location.href.split('#')[0] + '#' + el.dataset.h; try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована', 'good'); } catch (e) { openModal({ title: 'Ссылка', body: `<input class="input" id="cl-url" value="${esc(url)}" readonly>`, onMount: (r) => $('#cl-url', r).select() }); } };
ACTIONS['news-toggle'] = (el) => { const n = DB.news.find((x) => x.id === el.dataset.id); n.published = !n.published; audit(n.published ? 'Публикация материала' : 'Снятие материала с публикации', 'news', n.id, n.title); commit(); rerender(); };
ACTIONS['news-new'] = () => {
  const u = me();
  const orgs = u.role === 'admin' ? DB.orgs : DB.orgs.filter((o) => rootOf(o.id) === rootOf(u.companyId));
  UI.nf = { cover: null };
  openModal({
    title: 'Новый материал', wide: true,
    body: `<form class="form" id="nf-form"><div class="form-grid">${fld('Тип материала', sel('nf-kind', Object.entries(NEWS_KINDS), 'news'))}${fld('Компания', sel('nf-org', orgs.map((o) => [o.id, o.name]), u.companyId && orgs.some((o) => o.id === u.companyId) ? u.companyId : orgs[0].id))}</div>${fld('Заголовок', inp('nf-title', '', 'maxlength="120" required'), '', true)}${fld('Лид', txa('nf-lead', '', 2, 'maxlength="240"'), 'Одно-два предложения о главном', true)}${fld('Текст', txa('nf-body', '', 7), 'Абзацы разделяйте пустой строкой', true)}<label class="drop">${icon('image', 20)}<span><b id="nf-cover-l">Обложка (необязательно)</b><small>JPG или PNG</small></span><input type="file" accept="image/*" hidden data-upload="news-cover"></label></form>`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Опубликовать', cls: 'primary', fn: () => {
      const title = $('#nf-title').value.trim(), lead = $('#nf-lead').value.trim(), body = $('#nf-body').value.trim();
      if (!title || !lead || !body) { toast('Заполните заголовок, лид и текст', 'bad'); return; }
      const n = { id: uid('n'), kind: $('#nf-kind').value, orgId: $('#nf-org').value, title, lead, body: body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean), date: todayISO(), authorId: u.id, published: true, views: 0, cover: UI.nf.cover };
      DB.news.push(n); audit('Публикация материала', 'news', n.id, title); commit(); closeModal(); toast('Материал опубликован', 'good'); go('news-' + n.id);
    } }]
  });
};
UPLOAD['news-cover'] = async (files) => { const f = files[0]; if (!f) return; const key = uid('cov'); await MEDIA.put(key, await resizeImage(f, 1400)); UI.nf.cover = key; const l = $('#nf-cover-l'); if (l) l.textContent = 'Обложка: ' + f.name; };

/* ============================ БАЗА ЗНАНИЙ ============================ */
route('knowledge', () => {
  const f = (UI.kb = { q: '', kind: '', ...(UI.kb || {}) });
  let list = DB.knowledge.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (f.q) list = list.filter((k) => norm(k.title + ' ' + k.desc + ' ' + orgLabel(k.orgId)).includes(norm(f.q)));
  if (f.kind) list = list.filter((k) => k.kind === f.kind);
  const kicons = { case: 'trophy', method: 'scale', presentation: 'chart', edu: 'book', howto: 'check', template: 'file', success: 'star' };
  return `<div class="page">
    ${pageHead(t('knowledge'), 'Лучшие проекты, методические рекомендации, презентации, обучающие материалы, инструкции и шаблоны', ['admin', 'chair'].includes(myRole()) ? `<button class="btn primary" data-act="kb-new">${icon('plus', 16)}Добавить материал</button>` : '')}
    <div class="filters"><div class="f-search">${icon('search', 16)}<input id="kb-q" type="search" placeholder="Поиск по базе знаний" value="${esc(f.q)}" data-live="kb.q"></div>${sel('kb-kind', [['', 'Все типы'], ...Object.entries(KB_KINDS)], f.kind, 'data-live="kb.kind"')}</div>
    <p class="count">${list.length} ${plural(list.length, 'материал', 'материала', 'материалов')}</p>
    ${list.length ? `<div class="kgrid">${list.map((k) => `<button class="kcard" data-act="kb-open" data-id="${k.id}"><span class="k-ic">${icon(kicons[k.kind] || 'file', 20)}</span><span class="grow"><small>${esc(KB_KINDS[k.kind])}</small><b>${esc(k.title)}</b><span>${esc(k.desc)}</span><small class="muted">${esc(orgLabel(k.orgId))} · ${fmtDate(k.date)}</small></span></button>`).join('')}</div>` : emptyState('book', 'Ничего не найдено', 'Измените запрос.')}
  </div>`;
});
ACTIONS['kb-open'] = (el) => {
  const k = DB.knowledge.find((x) => x.id === el.dataset.id);
  openModal({ title: k.title, wide: true, body: `<div class="chips">${chip(KB_KINDS[k.kind], 'accent')}${chip(orgLabel(k.orgId))}${k.demo ? testChip() : ''}</div><pre class="kb-content">${esc(k.content)}</pre>`,
    actions: [...(k.kind === 'template' && k.title.includes('паспорта') && can('project.create') ? [{ label: 'Создать проект по шаблону', cls: 'ghost', icon: 'plus', fn: () => { closeModal(); UI.pf = null; go('project-new'); } }] : []), { label: 'Скачать .md', cls: 'primary', icon: 'download', fn: () => saveFile(k.title.replace(/[^\wа-яё\s-]/gi, '').slice(0, 60) + '.md', k.content) }] });
};
ACTIONS['kb-new'] = () => openModal({
  title: 'Новый материал базы знаний', wide: true,
  body: `<form class="form"><div class="form-grid">${fld('Тип', sel('kb-k', Object.entries(KB_KINDS), 'method'))}${fld('Компания', sel('kb-o', orgOptions(), me().companyId || 'sk'))}</div>${fld('Название', inp('kb-t', '', 'required'), '', true)}${fld('Краткое описание', inp('kb-d', ''), '', true)}${fld('Содержание', txa('kb-c', '', 8))}</form>`,
  actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Добавить', cls: 'primary', fn: () => {
    const title = $('#kb-t').value.trim(), desc = $('#kb-d').value.trim();
    if (!title || !desc) { toast('Заполните название и описание', 'bad'); return; }
    const k = { id: uid('k'), kind: $('#kb-k').value, orgId: $('#kb-o').value, title, desc, content: $('#kb-c').value.trim() || `# ${title}\n\n${desc}`, date: todayISO(), authorId: me().id, tags: [] };
    DB.knowledge.push(k); audit('Добавление материала в базу знаний', 'kb', k.id, title); commit(); closeModal(); toast('Материал добавлен', 'good'); rerender();
  } }]
});

/* ============================ АНАЛИТИКА ============================ */
function analyticsScope() {
  const u = me(); const f = UI.an;
  let orgIds = DB.orgs.map((o) => o.id); let region = f.region; let label = 'Вся группа';
  if (u.role === 'chair') { orgIds = familyOf(rootOf(u.companyId)); label = orgLabel(rootOf(u.companyId)) + ' и ДЗО'; }
  else if (u.role === 'regional') { region = u.regionId; label = RG(u.regionId).name + ' · все компании'; }
  else if (f.root) { orgIds = familyOf(f.root); label = orgLabel(f.root) + ' и ДЗО'; }
  if (region && u.role !== 'regional') label += ' · ' + RG(region).name;
  return { orgIds: new Set(orgIds), region, label };
}
function analyticsData(range) {
  const sc = analyticsScope();
  const inScope = (orgId, regionId) => sc.orgIds.has(orgId) && (!sc.region || regionId === sc.region);
  const projects = DB.projects.filter((p) => inScope(p.orgId, p.regionId));
  const events = DB.events.filter((e) => inScope(e.orgId, e.regionId));
  const achs = DB.achievements.filter((a) => { const u = U(a.userId); return u && inScope(u.companyId, u.regionId); });
  const cp = projects.filter((p) => p.status === 'confirmed' && inRange(p.end, range));
  const ce = events.filter((e) => e.status === 'confirmed' && inRange(e.date, range));
  const ca = achs.filter((a) => a.status === 'confirmed' && inRange(a.date, range));
  const young = sum([...sc.orgIds].map(O), (o) => o.young);
  const reach = sum(cp, verifiedReach) + sum(ce, verifiedAtt);
  const reachBy = {}; cp.forEach((p) => { reachBy[p.orgId] = (reachBy[p.orgId] || 0) + verifiedReach(p); }); ce.forEach((e) => { reachBy[e.orgId] = (reachBy[e.orgId] || 0) + verifiedAtt(e); });
  const unique = Math.round(sum([...sc.orgIds], (id) => (O(id) ? O(id).young * uniqueShare(reachBy[id] || 0, O(id).young) : 0)));
  const hours = sum(cp, (p) => p.review.verifiedHours || 0) + sum(ca.filter((a) => a.hours), (a) => a.review?.verifiedHours ?? a.hours);
  const activeOrgs = new Set([...cp.map((p) => p.orgId), ...ce.map((e) => e.orgId)]);
  const scores = companyScores({ ...range, region: sc.region }).filter((r) => sc.orgIds.has(r.orgId));
  return { sc, projects, events, achs, cp, ce, ca, young, reach, unique, hours, activeOrgs, scores, inter: cp.filter(hasPartners).length, attendees: sum(ce, verifiedAtt) };
}
function quarterList(n = 6) {
  const out = []; const d = new Date();
  let q = Math.floor(d.getMonth() / 3), y = d.getFullYear();
  for (let i = 0; i < n; i++) {
    const from = `${y}-${String(q * 3 + 1).padStart(2, '0')}-01`;
    const endD = new Date(y, q * 3 + 3, 0);
    out.unshift({ id: `${y}-Q${q + 1}`, label: `${['I', 'II', 'III', 'IV'][q]} кв. ${y}`, from, to: isoDate(endD) });
    q--; if (q < 0) { q = 3; y--; }
  }
  return out;
}
route('analytics', () => {
  const u = me();
  const f = (UI.an = { period: 'year', root: '', region: '', ...(UI.an || {}) });
  const range = periodRange(f.period);
  const A = analyticsData(range);
  const qs = quarterList(6);
  const qData = qs.map((q) => { const r = { from: q.from, to: q.to }; return { p: A.projects.filter((p) => p.status === 'confirmed' && inRange(p.end, r)).length, e: A.events.filter((e) => e.status === 'confirmed' && inRange(e.date, r)).length, a: A.achs.filter((a) => a.status === 'confirmed' && inRange(a.date, r)).length }; });
  const engRows = A.scores.slice().sort((a, b) => b.engagement - a.engagement).slice(0, 12).map((r) => ({ label: O(r.orgId).name, v: r.engagement, tip: `${O(r.orgId).full}\nВовлечённость: ${pct(r.engagement)}\nМолодёжь: ${fmt(r.size)}` }));
  const catRows = CATS.map((c) => ({ label: c.short, v: A.cp.filter((p) => p.category === c.id).length, color: c.color })).filter((r) => r.v).sort((a, b) => b.v - a.v);
  const regRows = DB.regions.map((r) => ({ label: r.name, v: A.cp.filter((p) => p.regionId === r.id).length + A.ce.filter((e) => e.regionId === r.id).length })).filter((r) => r.v).sort((a, b) => b.v - a.v).slice(0, 10);
  const funnel = ['draft', 'submitted', 'in_review', 'needs_info', 'confirmed', 'rejected'].map((s) => ({ label: STATUS[s].label, v: [...A.projects, ...A.events, ...A.achs].filter((x) => x.status === s).length, color: { draft: 'var(--ink-3)', submitted: 'var(--info)', in_review: 'var(--accent)', needs_info: 'var(--warn)', confirmed: 'var(--good)', rejected: 'var(--bad)' }[s] }));
  const decided = [...A.projects, ...A.events, ...A.achs].filter((x) => x.review && x.review.decidedAt && x.submittedAt);
  const avgDays = decided.length ? sum(decided, (x) => Math.max(0, (new Date(x.review.decidedAt) - new Date(x.submittedAt)) / 864e5)) / decided.length : 0;
  const avgScore = A.scores.length ? sum(A.scores, (r) => r.total) / A.scores.length : 0;
  return `<div class="page">
    ${pageHead('Аналитика', `Охват: <b>${esc(A.sc.label)}</b>${u.role === 'chair' ? ' (статистика вашей компании)' : u.role === 'regional' ? ' (региональная аналитика)' : ''} · ${testChip()}`, `<button class="btn ghost" data-act="an-xlsx">${icon('download', 16)}Excel</button><button class="btn primary" data-act="an-report">${icon('file', 16)}Квартальный отчёт</button>`, 'Для руководства')}
    <div class="filters">${seg('an.period', PERIODS.map((p) => [p.id, p.label]), f.period)}
      ${u.role === 'admin' ? sel('an-root', [['', 'Вся группа'], ...DB.orgs.filter((o) => o.type !== 'subsidiary').map((o) => [o.id, o.name + ' и ДЗО'])], f.root, 'data-live="an.root"') + sel('an-region', regionOptions('Все регионы'), f.region, 'data-live="an.region"') : ''}</div>
    <div class="kpis k4">
      ${kpi('Молодых сотрудников', fmt(A.young), 'тестовая численность', 'users')}
      ${kpi('Доля вовлечённых', pct(A.young ? (A.unique / A.young) * 100 : 0), 'уникальный охват / численность', 'globe')}
      ${kpi('Активных Молодёжных советов', `${A.activeOrgs.size} <small>из ${A.sc.orgIds.size}</small>`, 'с подтверждённой активностью', 'flag')}
      ${kpi('Реализованных проектов', fmt(A.cp.length), 'подтверждено', 'folder')}
      ${kpi('Мероприятий', fmt(A.ce.length), 'проведено и подтверждено', 'calendar')}
      ${kpi('Участников мероприятий', fmt(A.attendees), 'подтверждено экспертами', 'users')}
      ${kpi('Уникальных охваченных', fmt(A.unique), 'в пределах численности', 'user')}
      ${kpi('Волонтёрских часов', fmt(A.hours), 'проекты и личные', 'hand')}
      ${kpi('Межкорпоративных проектов', fmt(A.inter), 'с компаниями группы', 'link')}
      ${kpi('Подтверждённых инициатив', fmt(A.cp.length + A.ca.length), 'проекты и личные достижения', 'check')}
      ${kpi('Средний показатель активности', fmt1(avgScore), 'средний балл советов из 100', 'trophy')}
      ${kpi('Средний срок проверки', `${fmt1(avgDays)} <small>дн.</small>`, `${decided.length} решений`, 'clock')}
    </div>
    <div class="grid g2">
      ${card('Динамика активности по кварталам', chart('bars', { labels: qs.map((q) => q.label), series: [{ name: 'Проекты', values: qData.map((x) => x.p) }, { name: 'Мероприятия', values: qData.map((x) => x.e) }, { name: 'Личные достижения', values: qData.map((x) => x.a) }], h: 250 }), '<span class="muted sm">подтверждённые</span>')}
      ${card('Вовлечённость молодёжи по советам', engRows.length ? hbars(engRows, { max: 100, fmt: (v) => pct(v) }) : '<p class="muted">Нет данных</p>', '<span class="muted sm">% от численности</span>')}
      ${card('Проекты по направлениям', catRows.length ? hbars(catRows) : '<p class="muted">Нет данных</p>')}
      ${card('Активность по регионам', regRows.length ? hbars(regRows) : '<p class="muted">Нет данных</p>')}
      ${card('Статусы заявок на проверку', hbars(funnel), '<span class="muted sm">за всё время</span>')}
      ${card('Средний балл советов', hbars(A.scores.slice(0, 10).map((r) => ({ label: O(r.orgId).name, v: r.total })), { max: 100, fmt: fmt1 }), `<a class="lnk" href="#compare">Сравнить ${icon('chevR', 14)}</a>`)}
    </div>
  </div>`;
}, guardRoles('admin', 'chair', 'regional'));

function reportHTML(q) {
  const range = { from: q.from, to: q.to };
  const A = analyticsData(range);
  const top = A.scores.slice(0, 10);
  const people = personScores(range).filter((r) => r.total > 0 && (A.sc.orgIds.has(U(r.userId).companyId)) && (!A.sc.region || U(r.userId).regionId === A.sc.region)).slice(0, 10);
  const rows = (arr) => arr.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<div class="report" id="report-node">
    <div class="rp-h"><div>${brandMark(36)}</div><div><b>JASTAR HUB</b><span>Квартальный отчёт о деятельности Молодёжных советов группы АО «Самрук-Қазына»</span></div></div>
    <h2>${esc(q.label)} · ${esc(A.sc.label)}</h2>
    <p class="rp-warn">ТЕСТОВЫЕ ДАННЫЕ ДЕМО-ВЕРСИИ. Отчёт сформирован автоматически ${fmtDT(new Date().toISOString())}. Показатели не являются официальными.</p>
    <h3>Ключевые показатели</h3>
    <table class="rp-t"><tbody>${rows([['Молодых сотрудников', fmt(A.young)], ['Доля вовлечённых', pct(A.young ? (A.unique / A.young) * 100 : 0)], ['Активных советов', `${A.activeOrgs.size} из ${A.sc.orgIds.size}`], ['Реализованных проектов', fmt(A.cp.length)], ['Проведено мероприятий', fmt(A.ce.length)], ['Участников мероприятий', fmt(A.attendees)], ['Волонтёрских часов', fmt(A.hours)], ['Межкорпоративных проектов', fmt(A.inter)], ['Подтверждённых инициатив', fmt(A.cp.length + A.ca.length)]])}</tbody></table>
    <h3>ТОП-10 Молодёжных советов за квартал</h3>
    <table class="rp-t"><thead><tr><th>Место</th><th>Совет</th><th>Баллы</th><th>Вовлечённость</th><th>Проектов</th></tr></thead><tbody>${rows(top.map((r, i) => [i + 1, esc(O(r.orgId).full), fmt1(r.total), pct(r.engagement), r.projects]))}</tbody></table>
    <h3>ТОП-10 молодых лидеров за квартал</h3>
    <table class="rp-t"><thead><tr><th>Место</th><th>Сотрудник</th><th>Компания</th><th>Баллы</th></tr></thead><tbody>${rows(people.map((r, i) => [i + 1, esc(U(r.userId).name), esc(orgLabel(U(r.userId).companyId)), fmt1(r.total)]))}</tbody></table>
    <h3>Подтверждённые проекты квартала</h3>
    <table class="rp-t"><thead><tr><th>Проект</th><th>Совет</th><th>Направление</th><th>Охват</th><th>Оценка</th></tr></thead><tbody>${rows(A.cp.sort((a, b) => qProject(b) - qProject(a)).slice(0, 25).map((p) => [esc(p.title), esc(orgLabel(p.orgId)), esc(CAT(p.category).short), fmt(verifiedReach(p)), fmt1(qProject(p))]))}</tbody></table>
    <p class="rp-foot">Методика: 7 показателей с весами ${COMPANY_COMPONENTS.map((c) => `${c.name.toLowerCase()} ${DB.settings.wCompany[c.k]}%`).join(', ')}. Учитываются только подтверждённые активности; показатели нормированы по численности молодёжи.</p>
  </div>`;
}
ACTIONS['an-report'] = () => {
  const qs = quarterList(4);
  UI.rq = UI.rq && qs.some((q) => q.id === UI.rq) ? UI.rq : qs[qs.length - 1].id;
  const show = () => {
    const q = qs.find((x) => x.id === UI.rq);
    openModal({
      title: 'Квартальный отчёт', wide: true,
      body: `<div class="filters">${sel('rq', qs.map((x) => [x.id, x.label]), UI.rq, 'data-act-change="rq-change" aria-label="Квартал"')}</div><div class="report-wrap">${reportHTML(q)}</div>`,
      actions: [{ label: 'Excel', cls: 'ghost', icon: 'download', fn: () => reportXlsx(q) }, { label: 'Скачать PDF', cls: 'primary', icon: 'download', fn: () => { const clone = $('#report-node').cloneNode(true); const box = document.createElement('div'); box.className = 'pdf-stage'; box.appendChild(clone); document.body.appendChild(box); exportPdf(`JASTAR_отчёт_${q.id}.pdf`, clone).finally(() => box.remove()); } }]
    });
  };
  ACTIONS['rq-change'] = (el) => { UI.rq = el.value; show(); };
  show();
};
function reportXlsx(q) {
  const range = { from: q.from, to: q.to };
  const A = analyticsData(range);
  exportXlsx(`JASTAR_отчёт_${q.id}.xlsx`, [
    { name: 'Показатели', rows: [['ТЕСТОВЫЕ ДАННЫЕ ДЕМО-ВЕРСИИ'], ['Отчёт', q.label + ' · ' + A.sc.label], ['Молодых сотрудников', A.young], ['Доля вовлечённых, %', A.young ? +((A.unique / A.young) * 100).toFixed(1) : 0], ['Активных советов', A.activeOrgs.size], ['Проектов', A.cp.length], ['Мероприятий', A.ce.length], ['Участников мероприятий', A.attendees], ['Волонтёрских часов', A.hours], ['Межкорпоративных проектов', A.inter], ['Подтверждённых инициатив', A.cp.length + A.ca.length]] },
    { name: 'Рейтинг советов', rows: [['Место', 'Совет', 'Баллы', 'Вовлечённость, %', 'Проектов', 'Мероприятий'], ...A.scores.map((r, i) => [i + 1, O(r.orgId).full, +r.total.toFixed(2), +r.engagement.toFixed(1), r.projects, r.events])] },
    { name: 'Проекты', rows: [['Проект', 'Совет', 'Направление', 'Регион', 'Начало', 'Завершение', 'Охват', 'Оценка'], ...A.cp.map((p) => [p.title, orgLabel(p.orgId), CAT(p.category).name, RG(p.regionId).name, p.start, p.end, verifiedReach(p), +qProject(p).toFixed(2)])] },
    { name: 'Мероприятия', rows: [['Мероприятие', 'Совет', 'Дата', 'Пришли (подтв.)', 'Категория'], ...A.ce.map((e) => [e.title, orgLabel(e.orgId), e.date, verifiedAtt(e), CAT(e.category).name])] }
  ]);
}
ACTIONS['an-xlsx'] = () => {
  const range = periodRange(UI.an.period);
  const A = analyticsData(range);
  exportXlsx('JASTAR_аналитика.xlsx', [
    { name: 'KPI', rows: [['ТЕСТОВЫЕ ДАННЫЕ ДЕМО-ВЕРСИИ'], ['Охват', A.sc.label], ['Период', PERIODS.find((p) => p.id === UI.an.period).label], ['Молодых сотрудников', A.young], ['Уникальных охваченных', A.unique], ['Проектов', A.cp.length], ['Мероприятий', A.ce.length], ['Волонтёрских часов', A.hours], ['Межкорпоративных проектов', A.inter]] },
    { name: 'Советы', rows: [['Место', 'Совет', 'Баллы', 'Вовлечённость, %', 'Активностей', 'Проектов', 'Мероприятий'], ...A.scores.map((r, i) => [i + 1, O(r.orgId).full, +r.total.toFixed(2), +r.engagement.toFixed(1), r.activities, r.projects, r.events])] },
    { name: 'Проекты', rows: [['ID', 'Проект', 'Совет', 'Статус', 'Направление', 'Регион', 'Завершение', 'Охват', 'Оценка'], ...A.projects.map((p) => [p.id, p.title, orgLabel(p.orgId), STATUS[p.status].label, CAT(p.category).name, RG(p.regionId).name, p.end, verifiedReach(p), +qProject(p).toFixed(2)])] }
  ]);
};

/* ============================ СРАВНЕНИЕ ============================ */
route('compare', () => {
  const f = (UI.cmp = { ids: [], period: 'year', ...(UI.cmp || {}) });
  const rows = companyScores(periodRange(f.period));
  if (!f.ids.length) f.ids = rows.slice(0, 3).map((r) => r.orgId);
  const sel2 = f.ids.map((id) => rows.find((r) => r.orgId === id)).filter(Boolean);
  const metrics = [['Место в рейтинге', (r) => r.rank], ['Баллы из 100', (r) => fmt1(r.total)], ['Молодых сотрудников', (r) => fmt(r.size)], ['Вовлечённость', (r) => pct(r.engagement)], ['Подтверждённых активностей', (r) => r.activities], ['Проектов', (r) => r.projects], ['Мероприятий', (r) => r.events], ['Волонтёрских часов', (r) => fmt(r.hours)]];
  return `<div class="page">
    ${pageHead(t('compare'), 'Сравнение активности двух или нескольких советов по показателям методики. Показатели нормированы, поэтому сравнение крупной и небольшой компании корректно.')}
    <div class="filters">${seg('cmp.period', PERIODS.map((p) => [p.id, p.label]), f.period)}${f.ids.length < 4 ? sel('cmp-add', [['', 'Добавить совет к сравнению…'], ...DB.orgs.filter((o) => !f.ids.includes(o.id)).map((o) => [o.id, (o.type === 'subsidiary' ? '— ' : '') + o.name])], '', 'data-act-change="cmp-add"') : ''}</div>
    <div class="chips cmp-chips">${sel2.map((r, i) => `<span class="chip"><i class="sw ${SER[i]}"></i>${esc(O(r.orgId).name)}<button class="chip-x" data-act="cmp-rm" data-id="${r.orgId}" aria-label="Убрать">${icon('x', 12)}</button></span>`).join('')}</div>
    ${sel2.length >= 2 ? `${card('Показатели методики (0–100, 100 — лучший результат в группе)', chart('bars', { labels: COMPANY_COMPONENTS.map((c) => c.name.split(' ')[0] + (c.k === 'inter' ? ' взаимод.' : '')), series: sel2.map((r) => ({ name: O(r.orgId).name, values: COMPANY_COMPONENTS.map((c) => +r.comps[c.k].toFixed(1)) })), h: 280, fmtY: (v) => fmt(v) }))}
    ${card('Сводная таблица', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Показатель</th>${sel2.map((r, i) => `<th class="num"><i class="sw ${SER[i]}"></i> ${esc(O(r.orgId).name)}</th>`).join('')}</tr></thead><tbody>${metrics.map(([l, fn]) => `<tr><td>${l}</td>${sel2.map((r) => `<td class="num">${fn(r)}</td>`).join('')}</tr>`).join('')}${COMPANY_COMPONENTS.map((c) => `<tr><td>${esc(c.name)} <small class="muted">${DB.settings.wCompany[c.k]}%</small></td>${sel2.map((r) => `<td class="num">${fmt(r.comps[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)}` : emptyState('compare', 'Выберите минимум два совета', 'Добавьте советы через список выше.')}
  </div>`;
});
ACTIONS['cmp-add'] = (el) => { if (el.value) UI.cmp.ids.push(el.value); rerender(); };
ACTIONS['cmp-rm'] = (el) => { UI.cmp.ids = UI.cmp.ids.filter((x) => x !== el.dataset.id); if (!UI.cmp.ids.length) UI.cmp.ids = ['__none']; rerender(); };

/* ============================ АДМИНИСТРИРОВАНИЕ ============================ */
route('admin', () => {
  const tab = UI.tabs.adm || 'orgs';
  const openAppeals = DB.appeals.filter((a) => a.status === 'open').length;
  const unassigned = [...DB.projects, ...DB.events, ...DB.achievements].filter((x) => ['submitted', 'in_review'].includes(x.status) && (!x.review || !x.review.expertId)).length;
  let body = '';
  if (tab === 'orgs') {
    body = `${card('Организации и Молодёжные советы', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Организация</th><th>Тип</th><th>Регион</th><th class="num">Молодёжь до 35</th><th class="num">В совете</th></tr></thead><tbody>${DB.orgs.map((o) => `<tr><td><a class="tcell" href="#company-${o.id}">${orgLogo(o, 28)}<span><b>${esc(o.name)}</b><small>${esc(o.full)}</small></span></a></td><td>${o.type === 'fund' ? 'Фонд' : o.type === 'portfolio' ? 'Портфельная' : 'ДЗО ' + esc(orgLabel(o.parentId))}</td><td>${esc(RG(o.regionId).name)}</td><td class="num"><input class="input num sm" type="number" min="1" value="${o.young}" aria-label="Численность молодёжи" data-act-change="org-young" data-id="${o.id}"></td><td class="num">${councilMembers(o.id).filter((u) => u.verified).length}</td></tr>`).join('')}</tbody></table></div><p class="note">Численность молодёжи используется для нормирования рейтинга. Изменение пересчитывает рейтинг и записывается в историю.</p>`)}
    <div class="grid g2">${card('Добавить организацию', `<form class="form" data-form="org-add"><div class="form-grid">${fld('Тип', sel('type', [['portfolio', 'Портфельная компания'], ['subsidiary', 'Дочерняя организация']], 'subsidiary'))}${fld('Головная компания (для ДЗО)', sel('parentId', DB.orgs.filter((o) => o.type === 'portfolio').map((o) => [o.id, o.name])))}</div>${fld('Краткое название', inp('name', '', 'required'), '', true)}${fld('Полное наименование', inp('full', '', 'required placeholder="АО «…»"'), '', true)}<div class="form-grid">${fld('Регион', sel('regionId', regionOptions()))}${fld('Молодёжь до 35 лет', inp('young', '', 'type="number" min="1" required'), '', true)}</div>${fld('Отрасль', inp('sector', ''))}<button class="btn primary" type="submit">${icon('plus', 16)}Добавить</button></form><p class="note">Новые компании, ДЗО и регионы добавляются без изменения архитектуры: организация сразу появляется в каталоге, формах и рейтинге.</p>`)}
    ${card('Добавить региональное подразделение', `<form class="form" data-form="region-add">${fld('Название региона', inp('name', '', 'required'), '', true)}${fld('Административный центр', inp('city', '', 'required'), '', true)}<div class="form-grid">${fld('Широта', inp('lat', '', 'type="number" step="0.01" min="40" max="56" required'))}${fld('Долгота', inp('lon', '', 'type="number" step="0.01" min="46" max="88" required'))}</div><button class="btn" type="submit">${icon('plus', 16)}Добавить регион</button></form>`)}</div>`;
  } else if (tab === 'users') {
    const f = (UI.au = { q: '', role: '', ...(UI.au || {}) });
    let list = DB.users.slice();
    if (f.q) list = list.filter((u) => norm(u.name + ' ' + u.email + ' ' + orgLabel(u.companyId)).includes(norm(f.q)));
    if (f.role) list = list.filter((u) => u.role === f.role);
    body = `<div class="filters"><div class="f-search">${icon('search', 16)}<input id="au-q" type="search" placeholder="ФИО, e-mail или компания" value="${esc(f.q)}" data-live="au.q"></div>${sel('au-role', [['', 'Все роли'], ...Object.entries(ROLES).filter(([k]) => k !== 'guest').map(([k, v]) => [k, v.name])], f.role, 'data-live="au.role"')}</div>
    ${card(`Пользователи · ${list.length}`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Пользователь</th><th>Компания</th><th>Роль (RBAC)</th><th>Статус</th></tr></thead><tbody>${list.slice(0, 120).map((u) => `<tr><td><a class="tcell" href="#person-${u.id}">${avatar(u, 28)}<span><b>${esc(u.name)}</b><small>${esc(u.email)}</small></span></a></td><td>${esc(orgLabel(u.companyId) || 'Независимый эксперт')}</td><td>${u.id === me().id ? esc(ROLES[u.role].name) : sel('ur-' + u.id, Object.entries(ROLES).filter(([k]) => k !== 'guest').map(([k, v]) => [k, v.name]), u.role, `data-act-change="user-role" data-id="${u.id}" aria-label="Роль"`)}</td><td>${u.id === me().id ? '' : `<button class="btn sm ${u.blocked ? '' : 'ghost'}" data-act="user-block" data-id="${u.id}">${u.blocked ? 'Разблокировать' : 'Заблокировать'}</button>`}</td></tr>`).join('')}</tbody></table></div>${list.length > 120 ? '<p class="note">Показаны первые 120. Уточните поиск.</p>' : ''}`)}
    ${card('Матрица прав доступа', `<div class="tbl-wrap"><table class="tbl perm"><thead><tr><th>Действие</th>${Object.values(ROLES).map((r) => `<th>${esc(r.short)}</th>`).join('')}</tr></thead><tbody>${[['Просмотр открытых страниц, рейтингов, новостей', 'all'], ['Личный профиль и достижения', 'profile.edit'], ['Создание проектов и инициатив', 'project.create'], ['Добавление мероприятий', 'event.create'], ['Управление составом совета', 'council.manage'], ['Аналитика (своя компания / регион / группа)', 'analytics.view'], ['Проверка активности', 'review.do'], ['Компании, пользователи, критерии', 'admin']].map(([l, p]) => `<tr><td>${l}</td>${Object.keys(ROLES).map((r) => `<td>${p === 'all' || (PERMS[r] || []).includes('*') || (PERMS[r] || []).includes(p) ? icon('check', 16) : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)}`;
  } else if (tab === 'experts') {
    const q = [...DB.projects, ...DB.events, ...DB.achievements].filter((x) => ['submitted', 'in_review'].includes(x.status)).sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)));
    body = `${card('Пул независимых экспертов', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Эксперт</th><th>Конфликт интересов</th><th class="num">В очереди</th><th class="num">Решено</th></tr></thead><tbody>${experts().map((e) => `<tr><td><a class="tcell" href="#person-${e.id}">${avatar(e, 28)}<span><b>${esc(e.name)}</b><small>${esc(e.position)}</small></span></a></td><td>${uniq([...(e.conflicts || []), ...(e.companyId ? [e.companyId] : [])]).map((c) => chip(orgLabel(c))).join('') || '<span class="muted">нет</span>'}</td><td class="num">${expertLoad(e.id)}</td><td class="num">${[...DB.projects, ...DB.events, ...DB.achievements].filter((x) => x.review && x.review.expertId === e.id && ['confirmed', 'rejected'].includes(x.status)).length}</td></tr>`).join('')}</tbody></table></div><p class="note">Назначить эксперта можно на вкладке «Пользователи», сменив роль сотрудника.</p>`)}
    ${card(`Назначение экспертов · ${q.length} заявок на проверке`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Заявка</th><th>Организация</th><th>Статус</th><th>Эксперт (только без конфликта)</th></tr></thead><tbody>${q.slice(0, 60).map((x) => { const org = entityOrg(x); const ok = experts().filter((e) => !hasConflict(e, org)); return `<tr><td><a href="#review-${x.id}">${esc(x.title)}</a></td><td>${esc(orgLabel(org))}</td><td>${statusChip(x.status)}</td><td>${sel('ax-' + x.id, [['', '— не назначен —'], ...ok.map((e) => [e.id, `${e.name} (${expertLoad(e.id)})`])], x.review ? x.review.expertId || '' : '', `data-act-change="assign-expert" data-id="${x.id}" aria-label="Эксперт"`)}</td></tr>`; }).join('')}</tbody></table></div>`)}`;
  } else if (tab === 'criteria') {
    const w = (UI.aw = UI.aw || { c: { ...DB.settings.wCompany }, p: { ...DB.settings.wPerson } });
    const sc = sum(Object.values(w.c), Number), sp = sum(Object.values(w.p), Number);
    body = `<div class="grid g2">${card('Веса рейтинга Молодёжных советов', `${COMPANY_COMPONENTS.map((c) => `<div class="w-row"><label for="wc-${c.k}">${esc(c.name)}</label><input class="input num" type="number" min="0" max="100" id="wc-${c.k}" value="${w.c[c.k]}" data-bind="aw.c.${c.k}" data-rerender-blur="1"><span>%</span></div>`).join('')}<div class="w-sum ${sc === 100 ? 'ok' : 'bad'}">Сумма: <b>${sc}%</b></div>`)}
      ${card('Веса индивидуального рейтинга', `${PERSON_COMPONENTS.map((c) => `<div class="w-row"><label for="wp-${c.k}">${esc(c.name)}</label><input class="input num" type="number" min="0" max="100" id="wp-${c.k}" value="${w.p[c.k]}" data-bind="aw.p.${c.k}" data-rerender-blur="1"><span>%</span></div>`).join('')}<div class="w-sum ${sp === 100 ? 'ok' : 'bad'}">Сумма: <b>${sp}%</b></div>`)}</div>
      ${card('Ограничение информационной активности', `<div class="w-row"><label for="w-cap">Максимум публикаций за период, которые учитываются</label><input class="input num" type="number" min="1" max="50" id="w-cap" value="${DB.settings.infoCap}"><span>шт.</span></div>`)}
      <div class="btn-row end"><button class="btn ghost" data-act="w-reset">Вернуть исходные веса</button><button class="btn primary" data-act="w-save" ${sc === 100 && sp === 100 ? '' : 'disabled'}>${icon('check', 16)}Сохранить и пересчитать рейтинги</button></div>
      <p class="note">Изменение весов пересчитывает все рейтинги. Старые и новые значения сохраняются в истории рейтинга и журнале аудита; пользователи видят актуальную методику на странице «Методика рейтинга».</p>`;
  } else if (tab === 'appeals') {
    const list = DB.appeals.slice().sort((a, b) => b.ts.localeCompare(a.ts));
    body = list.length ? `<div class="stack-v">${list.map((a) => { const x = findEntity(a.entityId); if (!x) return ''; const ex = x.review && U(x.review.expertId); return card(`${esc(x.title)}`, `<div class="chips">${statusChip(x.status)}${chip(a.status === 'open' ? 'Открыта' : a.status === 'accepted' ? 'Принята: повторная экспертиза' : 'Отклонена', a.status === 'open' ? 'warn' : a.status === 'accepted' ? 'good' : 'bad')}</div><p><b>Заявитель:</b> ${userLink(U(a.userId))} · ${fmtDT(a.ts)}</p><blockquote>${esc(a.reason)}</blockquote>${x.review && x.review.comment ? `<p class="note">Решение эксперта ${ex ? esc(ex.name) : ''}: ${esc(x.review.comment)}</p>` : ''}${a.resolution ? `<p class="note"><b>Решение по апелляции:</b> ${esc(a.resolution)}</p>` : ''}${a.status === 'open' ? `<div class="btn-row"><button class="btn primary" data-act="appeal-accept" data-id="${a.id}">Назначить повторную экспертизу</button><button class="btn ghost" data-act="appeal-decline" data-id="${a.id}">Отклонить апелляцию</button><a class="btn ghost" href="${entityLink(x)}">Открыть</a></div>` : ''}`); }).join('')}</div>` : emptyState('flag', 'Апелляций нет', '');
  } else if (tab === 'audit') {
    const f = (UI.aa = { q: '', role: '', ...(UI.aa || {}) });
    let list = DB.audit.slice().reverse();
    if (f.role) list = list.filter((x) => x.role === f.role);
    if (f.q) list = list.filter((x) => norm(x.action + ' ' + x.details + ' ' + ((U(x.actorId) || {}).name || '')).includes(norm(f.q)));
    body = `<div class="filters"><div class="f-search">${icon('search', 16)}<input id="aa-q" type="search" placeholder="Действие, пользователь, объект" value="${esc(f.q)}" data-live="aa.q"></div>${sel('aa-role', [['', 'Все роли'], ...Object.entries(ROLES).map(([k, v]) => [k, v.name])], f.role, 'data-live="aa.role"')}<button class="btn ghost" data-act="audit-xlsx">${icon('download', 16)}Excel</button></div>
    ${card(`Журнал аудита · ${list.length} записей`, `<div class="tbl-wrap"><table class="tbl audit"><thead><tr><th>Время</th><th>Кто</th><th>Роль</th><th>Действие</th><th>Объект и детали</th></tr></thead><tbody>${list.slice(0, 200).map((x) => `<tr><td class="nowrap">${fmtDT(x.ts)}</td><td>${esc((U(x.actorId) || {}).name || 'Гость')}</td><td>${esc((ROLES[x.role] || {}).short || x.role)}</td><td><b>${esc(x.action)}</b></td><td><small>${esc(x.entityType)} · ${esc(x.entityId || '')}</small> ${esc(x.details)}</td></tr>`).join('')}</tbody></table></div><p class="note">Журнал только дополняется: записи нельзя изменить или удалить через интерфейс.</p>`)}`;
  } else if (tab === 'history') {
    const f = (UI.ah = { kind: 'org', ...(UI.ah || {}) });
    const list = DB.ratingLog.filter((x) => x.kind === f.kind).slice().reverse().slice(0, 200);
    body = `<div class="filters">${seg('ah.kind', [['org', 'Советы'], ['person', 'Сотрудники']], f.kind)}</div>${card('История изменений рейтинга', list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Время</th><th>${f.kind === 'org' ? 'Совет' : 'Сотрудник'}</th><th class="num">Баллы</th><th class="num">Место</th><th>Причина</th></tr></thead><tbody>${list.map((x) => `<tr><td class="nowrap">${fmtDT(x.ts)}</td><td>${f.kind === 'org' ? orgLink(x.id) : userLink(U(x.id))}</td><td class="num">${fmt1(x.from)} → <b>${fmt1(x.to)}</b></td><td class="num">${x.rankFrom || '—'} → ${x.rankTo || '—'}</td><td>${esc(x.reason)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">История пока пуста. Она заполняется при каждом решении эксперта и изменении методики.</p>')}`;
  } else {
    body = `<div class="grid g2">${card('Хранение данных', `<p>Демо-версия хранит данные в браузере: ${STORAGE_OK ? chip('сохранение работает', 'good') : chip('сохранение недоступно — данные живут до перезагрузки', 'warn')}</p><dl class="dl2"><div><dt>Пользователей</dt><dd>${DB.users.length}</dd></div><div><dt>Проектов</dt><dd>${DB.projects.length}</dd></div><div><dt>Мероприятий</dt><dd>${DB.events.length}</dd></div><div><dt>Записей аудита</dt><dd>${DB.audit.length}</dd></div></dl><p class="note">В рабочей версии данные хранятся в PostgreSQL (Supabase) с политиками RLS, файлы — в Supabase Storage. Схема базы данных приложена к проекту.</p>`)}
      ${card('Экспорт и сброс', `<div class="btn-row"><button class="btn" data-act="export-json">${icon('download', 16)}Экспорт всех данных (JSON)</button><button class="btn danger" data-act="reset-demo">${icon('refresh', 16)}Сбросить демо-данные</button></div><p class="note">Сброс удаляет все изменения в этом браузере и заново генерирует тестовые данные.</p>`)}</div>`;
  }
  return `<div class="page">${pageHead('Администрирование', 'Управление компаниями, пользователями, экспертами, критериями рейтинга и журналами', '', 'Главный администратор Фонда')}
    ${tabs('tabs.adm', [['orgs', 'Компании и регионы'], ['users', 'Пользователи и роли'], ['experts', 'Эксперты', unassigned || null], ['criteria', 'Критерии рейтинга'], ['appeals', 'Апелляции', openAppeals || null], ['audit', 'Журнал аудита'], ['history', 'История рейтинга'], ['data', 'Данные']], tab)}${body}</div>`;
}, guardRoles('admin'));
ACTIONS['org-young'] = (el) => {
  const o = O(el.dataset.id); const v = Math.max(1, Math.round(+el.value || 0));
  if (!v || v === o.young) return;
  const old = o.young;
  withRatingDiff(`Численность молодёжи ${o.name}: ${old} → ${v}`, () => { o.young = v; audit('Изменение численности молодёжи', 'org', o.id, `${old} → ${v}`); });
  toast('Численность обновлена, рейтинг пересчитан', 'good'); rerender();
};
FORMS['org-add'] = (form) => {
  const d = formData(form);
  if (!d.name || !d.full || !(+d.young > 0)) { toast('Заполните название, полное наименование и численность', 'bad'); return; }
  const id = (d.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'org') + Math.random().toString(36).slice(2, 5);
  const o = { id, type: d.type, parentId: d.type === 'subsidiary' ? d.parentId : 'sk', name: d.name, full: d.full, regionId: d.regionId, sector: d.sector || '—', young: +d.young, about: `Молодёжный совет ${d.full}.`, council: { chairId: null, founded: new Date().getFullYear(), regionalReps: [] } };
  withRatingDiff('Добавлена организация ' + d.name, () => { DB.orgs.push(o); reindex(); audit('Добавление организации', 'org', id, d.full); });
  toast('Организация добавлена', 'good'); rerender();
};
FORMS['region-add'] = (form) => {
  const d = formData(form);
  if (!d.name || !d.city || !(+d.lat) || !(+d.lon)) { toast('Заполните все поля региона', 'bad'); return; }
  const r = { id: 'r' + Math.random().toString(36).slice(2, 6), name: d.name, city: d.city, lat: +d.lat, lon: +d.lon };
  DB.regions.push(r); audit('Добавление региона', 'region', r.id, r.name); commit(); toast('Регион добавлен', 'good'); rerender();
};
ACTIONS['user-role'] = (el) => {
  const u = U(el.dataset.id); const old = u.role; const nr = el.value;
  withRatingDiff(`Смена роли ${u.name}: ${ROLES[old].short} → ${ROLES[nr].short}`, () => { u.role = nr; if (nr === 'chair') { const o = O(u.companyId); if (o) o.council.chairId = u.id; u.councilRole = 'Председатель'; } audit('Изменение роли пользователя', 'user', u.id, `${ROLES[old].name} → ${ROLES[nr].name}`); });
  notify(u.id, `Ваша роль на платформе изменена: ${ROLES[nr].name}`, '#me');
  saveDB(); toast('Роль изменена', 'good'); rerender();
};
ACTIONS['user-block'] = (el) => { const u = U(el.dataset.id); withRatingDiff((u.blocked ? 'Разблокирован ' : 'Заблокирован ') + u.name, () => { u.blocked = !u.blocked; audit(u.blocked ? 'Блокировка пользователя' : 'Разблокировка пользователя', 'user', u.id, u.name); }); rerender(); };
ACTIONS['assign-expert'] = (el) => {
  const x = findEntity(el.dataset.id); const id = el.value;
  x.review = x.review || { assignedAt: new Date().toISOString(), scores: null };
  x.review.expertId = id || null; if (x.status === 'in_review') x.status = 'submitted';
  x.history.push({ ts: new Date().toISOString(), actorId: me().id, action: id ? 'Администратор назначил эксперта: ' + U(id).name : 'Эксперт снят администратором' });
  if (id) notify(id, `Вам назначена заявка: «${x.title}»`, '#review-' + x.id);
  audit('Назначение эксперта', entityType(x), x.id, id ? U(id).name : 'снят'); commit(); toast('Назначение сохранено', 'good'); rerender();
};
ACTIONS['w-reset'] = () => { UI.aw = { c: { projects: 25, reach: 20, social: 15, prof: 15, inter: 10, innov: 10, info: 5 }, p: { contrib: 30, lead: 20, init: 20, volunteer: 10, inter: 10, prof: 10 } }; rerender(); };
ACTIONS['w-save'] = () => {
  const w = UI.aw; const cap = Math.max(1, +$('#w-cap').value || 12);
  const c = {}; const p = {};
  Object.keys(w.c).forEach((k) => { c[k] = +w.c[k] || 0; }); Object.keys(w.p).forEach((k) => { p[k] = +w.p[k] || 0; });
  const desc = COMPANY_COMPONENTS.map((x) => `${x.name} ${DB.settings.wCompany[x.k]}→${c[x.k]}`).join('; ');
  withRatingDiff('Изменение весов методики', () => { DB.settings.wCompany = c; DB.settings.wPerson = p; DB.settings.infoCap = cap; audit('Изменение критериев рейтинга', 'settings', 'weights', desc); });
  UI.aw = null; toast('Методика обновлена, рейтинги пересчитаны', 'good'); rerender();
};
ACTIONS['appeal-accept'] = (el) => {
  const a = DB.appeals.find((x) => x.id === el.dataset.id); const x = findEntity(a.entityId);
  const prevEx = x.review && x.review.expertId;
  const ex = pickExpert(x, [prevEx]);
  if (!ex) { toast('Нет другого эксперта без конфликта интересов', 'bad'); return; }
  withRatingDiff(`Апелляция принята: «${x.title}», повторная экспертиза`, () => {
    a.status = 'accepted'; a.resolution = `Назначена повторная экспертиза: ${ex.name}`;
    x.status = 'submitted'; x.review = { expertId: ex.id, scores: null, comment: '', assignedAt: new Date().toISOString(), decidedAt: null, previous: x.review };
    x.history.push({ ts: new Date().toISOString(), actorId: me().id, action: 'Апелляция принята, назначена повторная экспертиза: ' + ex.name });
    audit('Апелляция принята', entityType(x), x.id, a.resolution);
  });
  notify(a.userId, `Апелляция по «${x.title}» принята. Назначена повторная экспертиза.`, entityLink(x));
  notify(ex.id, `Повторная экспертиза по апелляции: «${x.title}»`, '#review-' + x.id);
  saveDB(); toast('Повторная экспертиза назначена', 'good'); rerender();
};
ACTIONS['appeal-decline'] = (el) => {
  const a = DB.appeals.find((x) => x.id === el.dataset.id); const x = findEntity(a.entityId);
  openModal({ title: 'Отклонить апелляцию', body: fld('Обоснование решения', txa('ad-res', '', 3), 'Заявитель увидит этот текст', true), actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Отклонить', cls: 'danger', fn: () => {
    const r = $('#ad-res').value.trim(); if (r.length < 10) { toast('Обоснуйте решение (от 10 знаков)', 'bad'); return; }
    a.status = 'declined'; a.resolution = r; x.history.push({ ts: new Date().toISOString(), actorId: me().id, action: 'Апелляция отклонена', note: r });
    audit('Апелляция отклонена', entityType(x), x.id, r); notify(a.userId, `Апелляция по «${x.title}» отклонена: ${r}`, entityLink(x));
    commit(); closeModal(); rerender();
  } }] });
};
ACTIONS['audit-xlsx'] = () => exportXlsx('JASTAR_журнал_аудита.xlsx', [{ name: 'Аудит', rows: [['Время', 'Пользователь', 'Роль', 'Действие', 'Тип объекта', 'ID объекта', 'Детали'], ...DB.audit.slice().reverse().map((x) => [x.ts, (U(x.actorId) || {}).name || 'Гость', (ROLES[x.role] || {}).name || x.role, x.action, x.entityType, x.entityId, x.details])] }]);
ACTIONS['export-json'] = () => { const copy = { ...DB, users: DB.users.map((u) => ({ ...u, pass: u.pass ? '***' : null })) }; saveFile('jastar-hub-data.json', JSON.stringify(copy, null, 2)); };
ACTIONS['reset-demo'] = () => confirmModal('Сбросить демо-данные?', 'Все изменения, регистрации и загруженные файлы в этом браузере будут удалены, тестовые данные сгенерируются заново.', 'Сбросить', async () => {
  await MEDIA.clear(); DB = seedDB(); reindex(); commit(); saveDB(true);
  Object.keys(UI).forEach((k) => { if (k !== 'tabs') delete UI[k]; }); UI.tabs = {};
  toast('Демо-данные восстановлены', 'good'); go('home');
}, true);

/* ============================ МЕТОДИКА ============================ */
route('methodology', () => {
  const rows = companyScores();
  const big = rows.find((r) => r.orgId === 'ktz'), small = rows.find((r) => r.orgId === 'ivt') || rows[rows.length - 1];
  const steps = [['draft', 'Автор заполняет форму и прикладывает доказательства'], ['submitted', 'Система назначает эксперта без конфликта интересов'], ['in_review', 'Эксперт проверяет документы и показатели'], ['needs_info', 'При необходимости запрашивает уточнения'], ['confirmed', 'Подтверждение — баллы начисляются, рейтинг пересчитывается'], ['rejected', 'Отклонение — можно подать апелляцию']];
  return `<div class="page narrow-w">
    ${pageHead('Методика рейтинга', 'Открытая методика оценки Молодёжных советов и молодых лидеров. Версия для демо — веса могут быть изменены решением администратора Фонда, все изменения фиксируются.', '', 'Прозрачность')}
    <div class="grid g2">
      ${card('Рейтинг Молодёжных советов', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Показатель</th><th class="num">Вес</th></tr></thead><tbody>${COMPANY_COMPONENTS.map((c) => `<tr><td><b>${esc(c.name)}</b><small>${esc(c.hint)}</small></td><td class="num">${DB.settings.wCompany[c.k]}%</td></tr>`).join('')}</tbody></table></div>`)}
      ${card('ТОП-100 молодых лидеров', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Показатель</th><th class="num">Вес</th></tr></thead><tbody>${PERSON_COMPONENTS.map((c) => `<tr><td><b>${esc(c.name)}</b><small>${esc(c.hint)}</small></td><td class="num">${DB.settings.wPerson[c.k]}%</td></tr>`).join('')}</tbody></table></div>`)}
    </div>
    ${card('Как считаются баллы', `<ol class="method">
      <li><b>Только подтверждённые активности.</b> Черновики, заявки на проверке и отклонённые активности баллов не дают.</li>
      <li><b>Качество проекта</b> = средняя оценка эксперта по 5 критериям (0–10) × (0,5 + 0,5 × выполнение KPI). Перевыполнение KPI учитывается не выше 120%, поэтому завышенный план не помогает.</li>
      <li><b>Нормирование по размеру.</b> Вовлечённость — доля уникально охваченных молодых сотрудников; пересечения участников разных активностей учитываются формулой 1 − e<sup>−охват/численность</sup>. Суммы качества проектов делятся на √(численность / 100): крупная компания не получает автоматического преимущества, а небольшая — не наказывается за малую численность.</li>
      <li><b>Шкала 0–100.</b> По каждому показателю лучший результат в группе за период принимается за 100, остальные — пропорционально. Итог — взвешенная сумма.</li>
      <li><b>Личный вклад.</b> Сотрудник получает баллы проекта только в пределах своей доли в команде (сумма долей = 100%). Баллы компании сотрудникам не передаются.</li>
      <li><b>Межкорпоративность.</b> Подтверждённый совместный проект приносит баллы каждой компании-участнику.</li></ol>
      ${big && small ? `<div class="example"><b>Пример на текущих тестовых данных.</b> ${esc(O(big.orgId).name)}: ${fmt(big.size)} молодых сотрудников, вовлечённость ${pct(big.engagement)}, ${fmt1(big.total)} баллов. ${esc(O(small.orgId).name)}: ${fmt(small.size)} молодых сотрудников, вовлечённость ${pct(small.engagement)}, ${fmt1(small.total)} баллов. Небольшой совет может опережать крупный за счёт доли вовлечённых и качества проектов.</div>` : ''}`)}
    ${card('Защита от завышения активности', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Принцип</th><th>Как обеспечено на платформе</th></tr></thead><tbody>${[
      ['Одна активность учитывается один раз', 'Проверка дублей по названию, организации и датам при отправке; активность засчитывается только своей организации, партнёры получают отдельный балл за взаимодействие'],
      ['Количество фото не влияет на баллы', 'Медиафайлы не входят ни в одну формулу; эксперт оценивает доказательства по качеству'],
      ['У каждого проекта есть измеримые результаты', 'Без хотя бы одного KPI с планом и фактом проект нельзя отправить на проверку'],
      ['Индивидуальные баллы = личный вклад', 'Доли вклада в команде обязательны и суммируются в 100%'],
      ['Показатели подтверждены доказательствами', 'Для отправки обязателен документ; эксперт фиксирует подтверждённый охват и часы, которые не могут превышать заявленные'],
      ['Эксперты независимы', 'Автоматическое назначение без конфликта интересов, декларация конфликтов, блокировка доступа и самоотвод'],
      ['Изменения рейтинга сохраняются', 'Каждое решение и изменение весов записывается в историю рейтинга и журнал аудита'],
      ['Оценку можно оспорить', 'Апелляция → решение администратора → повторная экспертиза другим экспертом'],
      ['Методика открыта', 'Эта страница всегда показывает действующие веса и формулы']
    ].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join('')}</tbody></table></div>`)}
    ${card('Жизненный цикл проверки', `<ol class="flow">${steps.map(([s, d]) => `<li>${statusChip(s)}<span>${d}</span></li>`).join('')}</ol>`)}
    ${card('Процедура оспаривания', `<ol class="method"><li>Автор, руководитель или участник открывает активность и нажимает «Оспорить оценку», указывает основание.</li><li>Администратор Фонда рассматривает апелляцию и либо отклоняет её с обоснованием, либо назначает повторную экспертизу.</li><li>Повторную экспертизу проводит другой эксперт без конфликта интересов; новое решение пересчитывает рейтинг.</li><li>Все шаги видны заявителю в истории статусов и сохраняются в журнале аудита.</li></ol>`)}
  </div>`;
});

route('notfound', () => `<div class="page narrow">${emptyState('search', 'Страница не найдена', 'Возможно, ссылка устарела или запись была удалена.', `<a class="btn" href="#home">На главную</a>`)}</div>`);
