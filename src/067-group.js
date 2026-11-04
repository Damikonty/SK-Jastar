/* =====================================================================
   Группа «Самрук-Энерго»: активы, организационная структура, вакансии
   (со ссылкой на Qsamruk.kz) и контакты. Работает в демо-режиме и с общей базой.
   Профиль организации правят председатель её совета и администратор,
   вакансии — они же, ключевые контакты — администратор.
   ===================================================================== */

Object.assign(ICONS, {
  bolt: 'M13 2 3 14h9l-1 8 10-12h-9z',
  drop: 'M12 2.7s7 7.3 7 12.3a7 7 0 0 1-14 0c0-5 7-12.3 7-12.3',
  flame: 'M12 22a7 7 0 0 0 7-7c0-3-2-5.5-3.5-7-.4 2-1.5 3-2.5 3.5C13 8 12.5 4.5 10 2c.2 3-1.6 5.3-3.2 7.2C5.7 10.6 5 12.6 5 15a7 7 0 0 0 7 7',
  wind: 'M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2',
  briefcase: 'M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M3 13h18',
  tree: 'M9 2h6v6H9zM12 8v4M5 12h14M5 12v3M12 12v3M19 12v3M2 15h6v6H2zM9 15h6v6H9zM16 15h6v6h-6z',
  ext: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  crane: 'M6 21V3l14 4H6M6 7l4 4M10 3v4M16 7v6M14 13h4v3h-4zM3 21h8',
  factory: 'M2 20V9l6 4V9l6 4V4h6v16zM2 20h20M17 8v.01M17 12v.01M17 16v.01'
});

Object.assign(I18N.ru, { g_group: 'Группа компаний', assets: 'Активы группы', structure: 'Оргструктура', vacancies: 'Вакансии', contacts: 'Контакты' });
Object.assign(I18N.kk, { g_group: 'Компаниялар тобы', assets: 'Топ активтері', structure: 'Ұйымдық құрылым', vacancies: 'Бос орындар', contacts: 'Байланыс' });
Object.assign(I18N.en, { g_group: 'Group of companies', assets: 'Group assets', structure: 'Org structure', vacancies: 'Vacancies', contacts: 'Contacts' });
NAV.splice(1, 0, { g: 'g_group', items: [['assets', 'factory'], ['structure', 'tree'], ['vacancies', 'briefcase'], ['contacts', 'phone']] });

const ORG_KINDS = {
  center: { name: 'Корпоративный центр', icon: 'building' },
  holding: { name: 'Гидро и ВИЭ: холдинг', icon: 'leaf' },
  thermal: { name: 'Тепловая генерация', icon: 'flame' },
  hydro: { name: 'Гидрогенерация', icon: 'drop' },
  res: { name: 'Ветер и солнце', icon: 'wind' },
  grid: { name: 'Сети и энергосбыт', icon: 'bolt' },
  service: { name: 'Сервис', icon: 'settings' },
  project: { name: 'Строительство ТЭЦ', icon: 'crane' }
};
const KIND_TONE = { thermal: 's2', hydro: 's3', res: 's1' };
const VAC_KINDS = { job: 'Вакансия', intern: 'Стажировка', program: 'Программа развития' };
const nfCap = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const prof = (o) => (o && o.profile) || {};
const kindOf = (o) => prof(o).kind || (o && o.type === 'fund' ? 'center' : 'service');
const capLabel = (p) => p.capText || [p.mw != null ? nfCap.format(p.mw) + ' МВт' : '', p.gcal != null ? nfCap.format(p.gcal) + ' Гкал/ч' : ''].filter(Boolean).join(' · ');
const siteUrl = (s) => 'https://' + String(s || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
const extLink = (href, label, cls = 'lnk') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}${icon('ext', 13)}</a>`;
const peopleList = () => (DB.settings && Array.isArray(DB.settings.people) ? DB.settings.people : CONTACT_PEOPLE_DEFAULT);
const vacList = () => DB.vacancies || (DB.vacancies = []);
const vacOpen = (v) => v.status === 'open' && (!v.deadline || v.deadline >= todayISO());
const canManageVac = (orgId) => myRole() === 'admin' || (myRole() === 'chair' && isChairOf(orgId));
const groupRun = (fn) => (LIVE ? busy(fn) : fn());

if (typeof ROW !== 'undefined') {
  ROW.vacancy = (r) => ({ id: r.id, orgId: r.org_id, title: r.title, city: r.city || '', kind: r.kind || 'job', url: r.url, deadline: r.deadline, description: r.description || '', status: r.status, createdBy: r.created_by, createdAt: r.created_at, demo: r.is_demo });
}

/* ---------- данные: демо и общая база ---------- */
const GROUPAPI = {
  async saveProfile(o, p) {
    if (LIVE) {
      const row = await rpc('update_org_assets', { o: o.id, p });
      const i = DB.orgs.findIndex((x) => x.id === o.id); DB.orgs[i] = ROW.org(row); commit(); return;
    }
    o.profile = p;
    audit('Изменение профиля организации', 'org', o.id, o.name);
    commit();
  },
  async saveVacancy(v) {
    if (LIVE) {
      const row = await rpc('save_vacancy', { v });
      const obj = ROW.vacancy(row); const i = vacList().findIndex((x) => x.id === obj.id);
      if (i >= 0) DB.vacancies[i] = obj; else DB.vacancies.push(obj);
      commit(); return obj;
    }
    if (!O(v.orgId)) throw new Error('Выберите организацию');
    if (!canManageVac(v.orgId)) throw new Error('Вакансии организации добавляет председатель её совета или администратор');
    const old = v.id ? vacList().find((x) => x.id === v.id) : null;
    if (old && !canManageVac(old.orgId)) throw new Error('Нет прав на изменение этой вакансии');
    let obj;
    if (old) obj = Object.assign(old, { ...v, id: old.id });
    else { obj = { ...v, id: uid('vac'), createdBy: me().id, createdAt: new Date().toISOString(), demo: false }; vacList().push(obj); }
    audit(old ? 'Изменение вакансии' : 'Добавление вакансии', 'vacancy', obj.id, obj.title + ' · ' + orgLabel(obj.orgId));
    commit(); return obj;
  },
  async removeVacancy(id) {
    if (LIVE) { await rpc('delete_vacancy', { vid: id }); DB.vacancies = vacList().filter((x) => x.id !== id); commit(); return; }
    const v = vacList().find((x) => x.id === id);
    if (!v || !canManageVac(v.orgId)) throw new Error('Нет прав на удаление этой вакансии');
    DB.vacancies = vacList().filter((x) => x.id !== id);
    audit('Удаление вакансии', 'vacancy', id, v.title);
    commit();
  },
  async savePeople(list) {
    if (LIVE) await tbl(sb.from('settings').update({ people: list, updated_at: new Date().toISOString() }).eq('id', 1));
    DB.settings.people = list;
    audit('Изменение ключевых контактов', 'settings', 'people', list.map((p) => p.role).join(', '));
    commit();
  }
};

/* ---------- активы: карточка организации ---------- */
function assetFacts(o, opts = {}) {
  const p = prof(o);
  const members = councilMembers(o.id).filter((u) => u.verified).length;
  const cap = capLabel(p);
  const rows = [
    cap ? ['Мощность', esc(cap)] : null,
    ['Расположение', esc(p.city || (RG(o.regionId) || {}).name || '—')],
    ['Персонал', p.staff > 0 ? `${fmt(p.staff)} чел.${p.staffAsOf ? `<small>на ${fmtDate(p.staffAsOf)}</small>` : ''}` : '<span class="muted">уточняется</span>'],
    ['Молодёжь до 35 лет', fmt(o.young)],
    ['В совете на платформе', fmt(members)],
    p.share && !opts.noShare ? ['Доля группы', esc(p.share)] : null,
    p.since ? ['Год', esc(p.since)] : null,
    p.address ? ['Адрес', esc(p.address)] : null
  ].filter(Boolean);
  return `<dl class="ac-facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}
function assetObjects(p, open = false) {
  const list = p.objects || [];
  if (!list.length) return '';
  return `<details class="ac-obj" ${open ? 'open' : ''}><summary>Объекты и активы · ${list.length}</summary><ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
}
function assetLinks(o) {
  const p = prof(o);
  return [p.site ? extLink(siteUrl(p.site), p.site.replace(/^https?:\/\//, '')) : '', p.src ? extLink(p.src, 'Источник данных') : ''].filter(Boolean).join('');
}
const canEditAsset = (o) => myRole() === 'admin' || (myRole() === 'chair' && isChairOf(o.id));
function acard(o) {
  const p = prof(o); const k = ORG_KINDS[kindOf(o)] || ORG_KINDS.service;
  return `<article class="acard ${o.type === 'subsidiary' ? 'branch' : ''}" id="asset-${o.id}">
    <header class="ac-h">${orgLogo(o, 40)}<span><a href="#company-${o.id}"><b>${esc(o.name)}</b></a><small>${esc(o.full)}</small></span></header>
    <div class="chips">${chip(k.name, '', k.icon)}${o.type === 'subsidiary' ? chip('Филиал ' + orgLabel(o.parentId)) : ''}${p.holding === 'qgp' ? chip('Периметр QGP', 'accent') : ''}${p.check ? chip('Описание уточняется', 'warn', 'info') : ''}</div>
    <p class="ac-what">${esc(p.what || o.sector || '')}</p>
    ${assetFacts(o)}
    ${assetObjects(p)}
    <footer class="ac-f"><span class="ac-links">${assetLinks(o)}</span><span class="btn-row">${canEditAsset(o) ? `<button class="btn sm ghost" data-act="asset-edit" data-id="${o.id}">${icon('edit', 15)}Изменить</button>` : ''}<a class="btn sm" href="#company-${o.id}">Совет</a></span></footer>
  </article>`;
}
/* Блок «Профиль организации» на странице компании */
function assetCard(o) {
  const p = prof(o);
  if (!p.what && !capLabel(p) && !(p.objects || []).length) return '';
  const k = ORG_KINDS[kindOf(o)] || ORG_KINDS.service;
  const head = `<div class="chips">${chip(k.name, '', k.icon)}${p.holding === 'qgp' ? chip('Периметр Qazaq Green Power', 'accent') : ''}${p.check ? chip('Описание уточняется', 'warn', 'info') : ''}</div>`;
  const links = assetLinks(o);
  return card('Чем занимается организация', `${head}<p class="ac-what">${esc(p.what || '')}</p>${assetFacts(o)}${assetObjects(p)}${links ? `<p class="ac-links mt">${links}</p>` : ''}`,
    `<span class="btn-row">${canEditAsset(o) ? `<button class="btn sm ghost" data-act="asset-edit" data-id="${o.id}">${icon('edit', 15)}Изменить</button>` : ''}<a class="btn sm ghost" href="#assets">Все активы</a></span>`);
}

function capacityBars(orgs) {
  const rows = orgs.filter((o) => prof(o).mw > 0 && kindOf(o) !== 'project').sort((a, b) => prof(b).mw - prof(a).mw);
  if (!rows.length) return '<p class="muted">Мощности пока не указаны</p>';
  const max = prof(rows[0]).mw;
  const byKind = {};
  rows.forEach((o) => { const k = KIND_TONE[kindOf(o)] ? kindOf(o) : 'thermal'; byKind[k] = (byKind[k] || 0) + prof(o).mw; });
  const legend = Object.keys(KIND_TONE).filter((k) => byKind[k]).map((k) => `<span><i class="sw ${KIND_TONE[k]}"></i>${esc(ORG_KINDS[k].name)} — <b>${nfCap.format(byKind[k])} МВт</b></span>`).join('');
  return `<div class="cb-leg">${legend}</div>
    <div class="capbars" role="list" aria-label="Установленная электрическая мощность по организациям, МВт">${rows.map((o) => {
      const mw = prof(o).mw; const tone = KIND_TONE[kindOf(o)] || 's2';
      return `<a class="cb-row" role="listitem" href="#company-${o.id}" title="${esc(o.name)}: ${nfCap.format(mw)} МВт"><span class="cb-n">${esc(o.name)}</span><span class="cb-b"><i class="${tone}" style="width:${Math.max(0.8, (mw / max) * 100)}%"></i></span><span class="cb-v">${nfCap.format(mw)}</span></a>`;
    }).join('')}</div>
    <p class="note">Установленная электрическая мощность по опубликованным данным компаний. Компании без опубликованной цифры (например, АлЭС) в сумму не входят; строящиеся ТЭЦ не учтены.</p>`;
}

route('assets', () => {
  const F = (UI.as = { k: '', q: '', ...(UI.as || {}) });
  const orgs = orgTree();
  const dzo = orgs.filter((o) => o.type === 'portfolio').length;
  const subs = orgs.filter((o) => o.type === 'subsidiary').length;
  const withMW = orgs.filter((o) => prof(o).mw > 0 && kindOf(o) !== 'project');
  const totalMW = sum(withMW, (o) => prof(o).mw);
  const projects = orgs.filter((o) => kindOf(o) === 'project');
  const regions = uniq(orgs.map((o) => o.regionId)).length;
  const groups = [['', 'Все'], ['thermal', 'Тепловая генерация'], ['hydro', 'ГЭС'], ['res', 'Ветер и солнце'], ['grid', 'Сети и сбыт'], ['project', 'Новые ТЭЦ'], ['mgmt', 'Управление и сервис']];
  const q = norm(F.q);
  const list = orgs.filter((o) => {
    const k = kindOf(o);
    if (F.k === 'mgmt' ? !['center', 'holding', 'service'].includes(k) : F.k && k !== F.k) return false;
    return !q || norm([o.name, o.full, prof(o).what, prof(o).city, (prof(o).objects || []).join(' ')].join(' ')).includes(q);
  });
  return `<div class="page">${pageHead(t('assets'), 'Какие компании входят в группу АО «Самрук-Энерго», чем они занимаются, где работают и сколько в них людей.', '<a class="btn" href="#structure">' + icon('tree', 16) + 'Оргструктура</a>')}
    <div class="kpis k4">${kpi('Организаций в группе', fmt(orgs.length), `корпоративный центр, ${dzo} ДЗО и ${subs} ${plural(subs, 'филиал', 'филиала', 'филиалов')}`, 'building')}${kpi('Установленная мощность', `${fmt(totalMW)} <small>МВт</small>`, `электрическая, по ${withMW.length} ${plural(withMW.length, 'компании', 'компаниям', 'компаниям')}`, 'bolt')}${kpi('Регионов присутствия', fmt(regions), 'по месту организаций', 'pin')}${kpi('Новые ТЭЦ', fmt(projects.length), 'строятся, ввод — 2029 год', 'crane')}</div>
    <div class="grid g-2-1">
      ${card('Установленная электрическая мощность, МВт', capacityBars(orgs))}
      ${card('Как читать раздел', `<ul class="ticks"><li><b>Чем занимается</b> — по открытым данным сайта samruk-energy.kz и СМИ; ссылка на источник — внизу карточки. Пометка «уточняется» — описание ждёт проверки.</li><li><b>Персонал</b> — общая численность работников. Её вносит председатель совета организации или администратор, пока она не указана — «уточняется».</li><li><b>Молодёжь до 35 лет</b> — база для нормирования рейтинга советов, её уточняет администратор.</li><li><b>Периметр QGP</b> — гидро- и ВИЭ-активы, переданные в Qazaq Green Power PLC.</li></ul>`)}
    </div>
    <div class="filters">${seg('as.k', groups, F.k)}<div class="f-search">${icon('search', 16)}<input id="as-q" type="search" placeholder="Компания, город или объект" value="${esc(F.q)}" data-live="as.q" aria-label="Поиск по активам"></div></div>
    <p class="count">${list.length} ${plural(list.length, 'организация', 'организации', 'организаций')}</p>
    ${list.length ? `<div class="agrid">${list.map(acard).join('')}</div>` : emptyState('search', 'Ничего не нашли', 'Измените направление или запрос.')}
  </div>`;
});

ACTIONS['asset-edit'] = (el) => {
  const o = O(el.dataset.id); if (!o) return;
  if (!canEditAsset(o)) { toast('Профиль организации редактирует председатель её совета или администратор', 'bad'); return; }
  const p = prof(o); const adm = myRole() === 'admin';
  const num = (v) => (v == null ? '' : v);
  openModal({
    title: 'Профиль организации: ' + o.name, wide: true,
    body: `<form class="form" data-form="noop">
      ${adm ? `<div class="form-grid">${fld('Направление', sel('ae-kind', Object.entries(ORG_KINDS).map(([k, v]) => [k, v.name]), kindOf(o)))}${fld('Доля группы', inp('ae-share', p.share || '', 'maxlength="160" placeholder="Например: 100% — АО «Самрук-Энерго»"'))}</div>` : ''}
      ${fld('Чем занимается', txa('ae-what', p.what || '', 4, 'maxlength="800"'), 'Одно-два предложения простым языком: что производит организация и для кого', true)}
      <div class="form-grid">${fld('Расположение', inp('ae-city', p.city || '', 'maxlength="160" placeholder="Город, область"'))}${fld('Адрес офиса', inp('ae-address', p.address || '', 'maxlength="200"'))}</div>
      <div class="form-grid">${fld('Электрическая мощность, МВт', inp('ae-mw', num(p.mw), 'type="number" min="0" step="0.1" inputmode="decimal"'))}${fld('Тепловая мощность, Гкал/ч', inp('ae-gcal', num(p.gcal), 'type="number" min="0" step="1" inputmode="decimal"'))}</div>
      ${fld('Мощность текстом', inp('ae-cap', p.capText || '', 'maxlength="80" placeholder="Например: 50 МВт (проект)"'), 'Если заполнено, показывается вместо цифр; в сумму по группе не входит')}
      ${fld('Объекты и активы', txa('ae-obj', (p.objects || []).join('\n'), 4, 'maxlength="3000"'), 'По одному объекту в строке')}
      <div class="form-grid">${fld('Численность персонала, чел.', inp('ae-staff', num(p.staff), 'type="number" min="0" step="1" inputmode="numeric"'))}${fld('Данные на дату', inp('ae-asof', p.staffAsOf || '', 'type="date"'))}</div>
      <div class="form-grid">${fld('Сайт', inp('ae-site', p.site || '', 'maxlength="80" placeholder="example.kz"'))}${fld('Год создания или ввода', inp('ae-since', p.since || '', 'maxlength="10"'))}</div>
      ${adm ? fld('Источник данных', inp('ae-src', p.src || '', 'maxlength="300" placeholder="https://…"')) + `<label class="check"><input type="checkbox" id="ae-qgp" ${p.holding === 'qgp' ? 'checked' : ''}><span>Актив в периметре Qazaq Green Power</span></label>` : ''}
      <label class="check"><input type="checkbox" id="ae-check" ${p.check ? 'checked' : ''}><span>Пометить «описание уточняется»</span></label>
    </form>`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить', cls: 'primary', icon: 'check', fn: () => groupRun(async () => {
      const v = (id) => ($('#' + id) ? $('#' + id).value.trim() : '');
      const n = (id) => { const s = v(id); if (s === '') return null; const x = +s.replace(',', '.'); return Number.isFinite(x) && x >= 0 ? x : NaN; };
      const next = { ...p };
      next.what = v('ae-what');
      if (next.what.length < 10) { toast('Опишите, чем занимается организация (от 10 знаков)', 'bad'); return; }
      Object.assign(next, { city: v('ae-city'), address: v('ae-address'), capText: v('ae-cap'), since: v('ae-since'), staffAsOf: v('ae-asof'), check: $('#ae-check').checked });
      for (const [k, id] of [['mw', 'ae-mw'], ['gcal', 'ae-gcal'], ['staff', 'ae-staff']]) { const x = n(id); if (Number.isNaN(x)) { toast('Проверьте числовые поля: только неотрицательные числа', 'bad'); return; } next[k] = k === 'staff' && x != null ? Math.round(x) : x; }
      next.objects = v('ae-obj').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 30);
      const site = v('ae-site').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      if (site && !/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(site)) { toast('Сайт укажите в виде example.kz', 'bad'); return; }
      next.site = site;
      if (adm) {
        next.kind = v('ae-kind'); next.share = v('ae-share'); next.holding = $('#ae-qgp').checked ? 'qgp' : null; next.src = v('ae-src');
        if (next.src && !/^https:\/\/\S+$/i.test(next.src)) { toast('Ссылка на источник должна начинаться с https://', 'bad'); return; }
      }
      Object.keys(next).forEach((k) => { if (next[k] === '' || next[k] == null || (Array.isArray(next[k]) && !next[k].length) || next[k] === false) delete next[k]; });
      try { await GROUPAPI.saveProfile(o, next); } catch (e) { if (!LIVE) toast(e.message, 'bad'); return; }
      closeModal(); toast('Профиль организации сохранён', 'good'); rerender();
    }) }]
  });
};

/* ---------- организационная структура ---------- */
function ocNode(o, cls = '') {
  const p = prof(o); const k = ORG_KINDS[kindOf(o)] || ORG_KINDS.service;
  const kids = childrenOf(o.id);
  return `<div class="oc-item"><a class="oc-node ${cls} ${o.type}" href="#company-${o.id}">${orgLogo(o, 30)}<span><b>${esc(o.name)}</b><small>${esc(o.type === 'subsidiary' ? 'Филиал' : capLabel(p) || k.name)}</small></span></a>${kids.length ? `<div class="oc-kids">${kids.map((x) => ocNode(x)).join('')}</div>` : ''}</div>`;
}
function orgChart() {
  const head = O(headId());
  const dzo = DB.orgs.filter((o) => o.type === 'portfolio');
  const used = new Set();
  const take = (f) => dzo.filter((o) => !used.has(o.id) && f(o)).map((o) => { used.add(o.id); return o; });
  const qgp = dzo.find((o) => kindOf(o) === 'holding');
  const thermal = take((o) => kindOf(o) === 'thermal');
  if (qgp) used.add(qgp.id);
  const inQgp = take((o) => prof(o).holding === 'qgp');
  const greenOther = take((o) => ['hydro', 'res'].includes(kindOf(o)));
  const grid = take((o) => kindOf(o) === 'grid');
  const build = take((o) => kindOf(o) === 'project');
  const other = take(() => true);
  const col = (ic, name, html, n) => `<section class="oc-col"><h3>${icon(ic, 16)}<span>${esc(name)}</span><small>${n}</small></h3><div class="oc-list">${html}</div></section>`;
  const green = `${qgp ? `<div class="oc-hold">${ocNode(qgp, 'hold')}<div class="oc-hold-l">${inQgp.map((o) => ocNode(o)).join('')}</div></div>` : inQgp.map((o) => ocNode(o)).join('')}${greenOther.map((o) => ocNode(o)).join('')}`;
  const cols = [
    col('flame', 'Тепловая генерация', thermal.map((o) => ocNode(o)).join(''), thermal.length),
    col('drop', 'Гидроэнергетика и ВИЭ', green, inQgp.length + greenOther.length + (qgp ? 1 : 0)),
    col('bolt', 'Сети и энергосбыт', grid.map((o) => ocNode(o)).join(''), grid.length),
    col('crane', 'Строительство новых ТЭЦ', build.map((o) => ocNode(o)).join(''), build.length)
  ];
  if (other.length) cols.push(col('building', 'Другие организации', other.map((o) => ocNode(o)).join(''), other.length));
  return `<div class="orgchart"><div class="oc-root">${head ? ocNode(head, 'root') : ''}</div><div class="oc-cols n${cols.length}">${cols.join('')}</div></div>`;
}
function councilStructure() {
  const head = O(headId());
  const hm = head ? councilMembers(head.id).filter((u) => u.verified) : [];
  const chair = head ? U(head.council.chairId) : null;
  const deputies = hm.filter((u) => u.councilRole === 'Заместитель председателя');
  const secretary = hm.filter((u) => u.councilRole === 'Секретарь');
  const regionals = DB.users.filter((u) => u.role === 'regional' && !u.blocked);
  const pcard = (u, role, sub) => `<a class="cs-p" href="#person-${u.id}">${avatar(u, 44)}<span><small>${esc(role)}</small><b>${esc(u.name)}</b><small>${esc(sub || u.position || '')}</small>${u.demo ? testChip() : ''}</span></a>`;
  const vacant = (role) => `<div class="cs-p empty"><span class="av" style="--s:44px">${icon('user', 18)}</span><span><small>${esc(role)}</small><b class="muted">Не назначен</b></span></div>`;
  const councils = orgTree().filter((o) => o.id !== headId());
  return `<div class="cs">
    <section class="cs-lvl"><h3>Руководство Молодёжного совета ${esc(head ? head.full : '')}</h3>
      <div class="cs-row">${chair ? pcard(chair, 'Председатель совета') : vacant('Председатель совета')}${deputies.length ? deputies.map((u) => pcard(u, 'Заместитель председателя')).join('') : vacant('Заместитель председателя')}${secretary.length ? secretary.map((u) => pcard(u, 'Секретарь')).join('') : vacant('Секретарь')}</div></section>
    <section class="cs-lvl"><h3>Региональные председатели <small>${regionals.length}</small></h3>
      ${regionals.length ? `<div class="cs-row">${regionals.map((u) => pcard(u, 'Региональный председатель', (RG(u.regionId) || {}).name || '—')).join('')}</div>` : '<p class="muted">Пока не назначены. Роль назначает администратор в разделе «Администрирование → Пользователи».</p>'}</section>
    <section class="cs-lvl"><h3>Молодёжные советы ДЗО и филиалов <small>${councils.length}</small></h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Совет</th><th>Председатель</th><th class="num">В совете</th></tr></thead><tbody>${councils.map((o) => { const ch = U(o.council.chairId); return `<tr class="${o.type === 'subsidiary' ? 'sub' : ''}"><td><a class="tcell" href="#company-${o.id}">${orgLogo(o, 28)}<span><b>${o.type === 'subsidiary' ? '↳ ' : ''}${esc(o.name)}</b><small>${esc(orgTypeLabel(o))}</small></span></a></td><td>${ch ? `<a class="tcell" href="#person-${ch.id}">${avatar(ch, 26)}<span><b>${esc(ch.name)}</b></span></a>` : '<span class="muted">Не назначен</span>'}</td><td class="num">${fmt(councilMembers(o.id).filter((u) => u.verified).length)}</td></tr>`; }).join('')}</tbody></table></div></section>
  </div>`;
}
route('structure', () => {
  const tab = UI.tabs.st || 'group';
  const body = tab === 'group'
    ? `${card('', orgChart())}
      <div class="grid g2">${card('Как устроена группа', `<dl class="dl1"><div><dt>Корпоративный центр</dt><dd>АО «Самрук-Энерго» управляет дочерними организациями и входит в группу АО «Самрук-Қазына».</dd></div><div><dt>ДЗО</dt><dd>Дочерняя или зависимая организация. У каждой ДЗО свой Молодёжный совет и своё место в рейтинге.</dd></div><div><dt>Филиал</dt><dd>Подразделение ДЗО. У филиала может быть свой совет, в рейтинге он считается вместе с ДЗО.</dd></div><div><dt>Периметр Qazaq Green Power</dt><dd>ГЭС и ВИЭ-активы, переданные в Qazaq Green Power PLC. На платформе это самостоятельные организации со своими советами.</dd></div></dl>`)}
        ${card('Как это связано с платформой', `<ul class="ticks"><li>Сотрудник при регистрации выбирает свою организацию и, если нужно, филиал.</li><li>Председатель ДЗО видит и подтверждает участников своей ДЗО и её филиалов.</li><li>Региональный председатель работает со всеми организациями своего региона.</li><li>Рейтинг ведётся по ДЗО вместе с филиалами, с нормированием по численности молодёжи.</li></ul>`)}</div>`
    : councilStructure();
  return `<div class="page">${pageHead(t('structure'), 'Структура группы компаний АО «Самрук-Энерго» и Молодёжного совета. Нажмите на организацию, чтобы открыть её совет.', '<a class="btn" href="#assets">' + icon('factory', 16) + 'Активы группы</a>')}
    ${tabs('tabs.st', [['group', 'Группа компаний'], ['council', 'Молодёжный совет']], tab)}${body}</div>`;
});

/* ---------- вакансии ---------- */
function vacCard(v) {
  const o = O(v.orgId); const open = vacOpen(v); const mng = canManageVac(v.orgId);
  const left = v.deadline ? Math.round((new Date(v.deadline + 'T23:59:59') - new Date()) / 864e5) : null;
  return `<article class="vcard ${open ? '' : 'closed'}">
    <header class="vc-h">${orgLogo(o, 36)}<span><b>${esc(v.title)}</b><small><a href="#company-${v.orgId}">${esc(orgLabel(v.orgId))}</a>${v.city ? ' · ' + esc(v.city) : ''}</small></span></header>
    <div class="chips">${chip(VAC_KINDS[v.kind] || 'Вакансия', v.kind === 'intern' ? 'info' : v.kind === 'program' ? 'accent' : '')}${open ? (v.deadline ? chip(left <= 3 ? `Осталось ${Math.max(0, left)} ${plural(Math.max(0, left), 'день', 'дня', 'дней')}` : 'Приём до ' + fmtDate(v.deadline), left <= 3 ? 'warn' : '', 'clock') : chip('Без срока', 'muted', 'clock')) : chip(v.status === 'closed' ? 'Закрыта' : 'Срок истёк', 'muted')}${v.demo ? testChip() : ''}</div>
    ${v.description ? `<p class="vc-d">${esc(v.description)}</p>` : ''}
    <footer class="vc-f">${open ? extLink(v.url, /qsamruk\.kz/i.test(v.url) ? 'Откликнуться на Qsamruk' : 'Открыть вакансию', 'btn sm primary') : ''}${mng ? `<span class="btn-row"><button class="btn sm ghost" data-act="vac-edit" data-id="${v.id}">${icon('edit', 15)}Изменить</button><button class="btn sm ghost" data-act="vac-toggle" data-id="${v.id}">${v.status === 'open' ? 'Закрыть' : 'Открыть снова'}</button><button class="icon-btn" data-act="vac-del" data-id="${v.id}" aria-label="Удалить вакансию" title="Удалить">${icon('trash', 16)}</button></span>` : ''}</footer>
  </article>`;
}
route('vacancies', () => {
  const F = (UI.vac = { org: '', kind: '', q: '', all: false, ...(UI.vac || {}) });
  const manager = ['admin', 'chair'].includes(myRole());
  const q = norm(F.q);
  let list = vacList().slice().sort((a, b) => (vacOpen(b) - vacOpen(a)) || String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')));
  if (!(manager && F.all)) list = list.filter(vacOpen);
  if (F.org) list = list.filter((v) => rootOf(v.orgId) === F.org);
  if (F.kind) list = list.filter((v) => v.kind === F.kind);
  if (q) list = list.filter((v) => norm([v.title, v.city, v.description, orgLabel(v.orgId)].join(' ')).includes(q));
  const openN = vacList().filter(vacOpen).length;
  const steps = [['Зарегистрируйтесь', 'Создайте профиль и резюме на Qsamruk.kz — один раз для всех компаний группы «Самрук-Қазына».'], ['Найдите вакансию', 'Отфильтруйте по компании: АО «Самрук-Энерго» и его дочерние организации.'], ['Откликнитесь', 'Отправьте отклик прямо на Qsamruk. Платформа JASTAR HUB резюме не принимает.'], ['Следите за статусом', 'Этапы отбора и приглашения приходят в личный кабинет Qsamruk.']];
  return `<div class="page">${pageHead(t('vacancies'), 'Открытые позиции в компаниях группы АО «Самрук-Энерго». Отбор проходит на Qsamruk.kz — единой платформе подбора персонала группы «Самрук-Қазына».', manager ? `<button class="btn primary" data-act="vac-add">${icon('plus', 16)}Добавить вакансию</button>` : '')}
    <section class="qs-hero"><div class="qs-t"><span class="eyebrow">Qsamruk.kz</span><h2>Все вакансии группы — в одном месте</h2><p>Вакансии АО «Самрук-Энерго» и дочерних организаций публикуются на Qsamruk. Там же — резюме, отклик и статус отбора. Ниже — подборка от Молодёжного совета.</p></div><div class="qs-a">${extLink(QSAMRUK_URL, 'Перейти на Qsamruk.kz', 'btn primary')}<small>Откроется в новой вкладке</small></div></section>
    <ol class="qs-steps">${steps.map(([h, d], i) => `<li><b><span>${i + 1}</span>${esc(h)}</b><p>${esc(d)}</p></li>`).join('')}</ol>
    <div class="filters">${seg('vac.kind', [['', 'Все'], ...Object.entries(VAC_KINDS)], F.kind)}${sel('vac-org', rootOptions('Все организации'), F.org, 'data-live="vac.org" aria-label="Организация"')}<div class="f-search">${icon('search', 16)}<input id="vac-q" type="search" placeholder="Должность или город" value="${esc(F.q)}" data-live="vac.q" aria-label="Поиск вакансий"></div>${manager ? `<label class="check inline-check"><input type="checkbox" ${F.all ? 'checked' : ''} data-act-change="vac-all"><span>Показать закрытые</span></label>` : ''}</div>
    <p class="count">В подборке ${openN} ${plural(openN, 'открытая вакансия', 'открытые вакансии', 'открытых вакансий')}</p>
    ${list.length ? `<div class="vgrid">${list.map(vacCard).join('')}</div>` : emptyState('briefcase', 'В подборке пока нет вакансий', 'Актуальные вакансии всех компаний группы смотрите на Qsamruk.kz.', extLink(QSAMRUK_URL, 'Открыть Qsamruk.kz', 'btn primary'))}
    <p class="note">${icon('info', 14)} Подборку ведут председатели советов и администратор. Ссылка «Откликнуться» ведёт на страницу вакансии на Qsamruk.kz или на главную страницу Qsamruk, если отдельной ссылки нет.</p>
  </div>`;
});
ACTIONS['vac-all'] = (el) => { UI.vac.all = el.checked; rerender(); };
function vacForm(v) {
  const adm = myRole() === 'admin';
  const orgs = adm ? orgOptions() : orgOptions('', (o) => isChairOf(o.id));
  openModal({
    title: v.id ? 'Изменить вакансию' : 'Новая вакансия', wide: true,
    body: `<form class="form" data-form="noop">
      <div class="form-grid">${fld('Организация', sel('vf-org', orgs, v.orgId || (me() && isChairOf(me().companyId) ? me().companyId : headId())), '', true)}${fld('Тип', sel('vf-kind', Object.entries(VAC_KINDS), v.kind || 'job'))}</div>
      ${fld('Должность или программа', inp('vf-title', v.title || '', 'maxlength="150" required'), '', true)}
      <div class="form-grid">${fld('Город', inp('vf-city', v.city || '', 'maxlength="80"'))}${fld('Приём заявок до', inp('vf-deadline', v.deadline || '', 'type="date"'), 'Пусто — без срока')}</div>
      ${fld('Ссылка на вакансию', inp('vf-url', v.url || QSAMRUK_URL, 'type="url" maxlength="400" placeholder="https://www.qsamruk.kz/…"'), 'Лучше — прямая ссылка на вакансию на Qsamruk.kz', true)}
      ${fld('Коротко о вакансии', txa('vf-desc', v.description || '', 3, 'maxlength="600"'), 'Обязанности и требования в 1–2 предложениях')}
    </form>`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить', cls: 'primary', icon: 'check', fn: () => groupRun(async () => {
      const val = (id) => $('#' + id).value.trim();
      const x = { id: v.id || null, orgId: val('vf-org'), kind: val('vf-kind'), title: val('vf-title'), city: val('vf-city'), deadline: val('vf-deadline') || null, url: val('vf-url'), description: val('vf-desc'), status: v.status || 'open' };
      if (x.title.length < 3) { toast('Укажите должность', 'bad'); return; }
      if (!/^https:\/\/\S+$/i.test(x.url)) { toast('Ссылка должна начинаться с https://', 'bad'); return; }
      try { await GROUPAPI.saveVacancy(x); } catch (e) { if (!LIVE) toast(e.message, 'bad'); return; }
      closeModal(); toast(v.id ? 'Вакансия обновлена' : 'Вакансия добавлена в подборку', 'good'); rerender();
    }) }]
  });
}
ACTIONS['vac-add'] = () => vacForm({});
ACTIONS['vac-edit'] = (el) => { const v = vacList().find((x) => x.id === el.dataset.id); if (v) vacForm(v); };
ACTIONS['vac-toggle'] = (el) => groupRun(async () => {
  const v = vacList().find((x) => x.id === el.dataset.id); if (!v) return;
  try { await GROUPAPI.saveVacancy({ ...v, status: v.status === 'open' ? 'closed' : 'open' }); } catch (e) { if (!LIVE) toast(e.message, 'bad'); return; }
  toast(v.status === 'open' ? 'Вакансия снова открыта' : 'Вакансия закрыта', 'good'); rerender();
});
ACTIONS['vac-del'] = (el) => {
  const v = vacList().find((x) => x.id === el.dataset.id); if (!v) return;
  confirmModal('Удалить вакансию?', `«${v.title}» исчезнет из подборки. Вакансия на Qsamruk.kz не изменится.`, 'Удалить', () => groupRun(async () => {
    try { await GROUPAPI.removeVacancy(v.id); } catch (e) { if (!LIVE) toast(e.message, 'bad'); return; }
    toast('Вакансия удалена', 'good'); rerender();
  }), true);
};

/* ---------- контакты ---------- */
function keyPersonCard(p, i) {
  const adm = myRole() === 'admin';
  const has = ['email', 'phone', 'telegram'].some((k) => p[k]);
  return `<article class="kp">
    <div class="kp-h">${avatar({ name: p.name || p.role }, 52)}<span><small class="eyebrow">${esc(p.role)}</small><b>${p.name ? esc(p.name) : '<span class="muted">Будет указан</span>'}</b>${p.position ? `<small>${esc(p.position)}</small>` : ''}${p.org ? `<small>${esc(p.org)}</small>` : ''}</span></div>
    ${p.topics ? `<p class="kp-t"><span>По вопросам</span>${esc(p.topics)}</p>` : ''}
    ${has ? contactRows(p, ['email', 'phone', 'telegram']) : `<p class="muted sm">Контакты скоро появятся. А пока напишите через <a class="lnk" href="#feedback">обратную связь</a> — обращение дойдёт.</p>`}
    ${adm ? `<div class="btn-row kp-a"><button class="btn sm ghost" data-act="people-edit" data-i="${i}">${icon('edit', 15)}${has ? 'Изменить' : 'Заполнить'}</button>${i > 0 ? `<button class="icon-btn" data-act="people-up" data-i="${i}" aria-label="Поднять выше" title="Поднять выше">${icon('up', 15)}</button>` : ''}<button class="icon-btn" data-act="people-del" data-i="${i}" aria-label="Удалить контакт" title="Удалить">${icon('trash', 15)}</button></div>` : ''}
  </article>`;
}
route('contacts', () => {
  const adm = myRole() === 'admin';
  const people = peopleList();
  const head = O(headId());
  const chair = head ? U(head.council.chairId) : null;
  const deps = head ? councilMembers(head.id).filter((u) => u.verified && u.councilRole === 'Заместитель председателя') : [];
  const sites = orgTree().filter((o) => prof(o).site);
  const hp = prof(head);
  const councilPeople = [chair ? [chair, 'Председатель Молодёжного совета'] : null, ...deps.map((u) => [u, 'Заместитель председателя'])].filter(Boolean);
  return `<div class="page">${pageHead(t('contacts'), 'К кому обратиться по платформе, Молодёжному совету и работе в группе «Самрук-Энерго».', `<a class="btn" href="#feedback">${icon('message', 16)}Написать обращение</a>${adm ? `<button class="btn primary" data-act="people-add">${icon('plus', 16)}Добавить контакт</button>` : ''}`)}
    <section><h2 class="sec-h">Ключевые контакты</h2>
      ${people.length ? `<div class="kpgrid">${people.map(keyPersonCard).join('')}</div>` : emptyState('user', 'Контакты не указаны', adm ? 'Добавьте руководителя проекта и администратора системы.' : 'Скоро здесь появятся контакты команды платформы.')}</section>
    <div class="grid g3">
      ${card('Молодёжный совет', councilPeople.length ? councilPeople.map(([u, role]) => `<div class="cs-ct"><a class="person-s" href="#person-${u.id}">${avatar(u, 40)}<span><b>${esc(u.name)}</b><small>${esc(role)}</small></span></a>${personContacts(u) || '<p class="muted sm">Рабочие контакты не указаны в профиле</p>'}</div>`).join('') : '<p class="muted">Председатель совета пока не назначен.</p>', `<button class="lnk" data-act="go-councils">Контакты советов ДЗО${icon('chevR', 14)}</button>`)}
      ${contactsCard()}
      ${card('Корпоративный центр', `<div class="contact-list">${hp.address ? `<div class="ct">${icon('pin', 18)}<span><small>Адрес</small><b>${esc(hp.address)}</b></span><span></span></div>` : ''}<div class="ct">${icon('globe', 18)}<span><small>Сайт</small><b>${extLink('https://samruk-energy.kz', 'samruk-energy.kz')}</b></span><span></span></div><div class="ct">${icon('briefcase', 18)}<span><small>Вакансии группы</small><b>${extLink(QSAMRUK_URL, 'qsamruk.kz')}</b></span><span></span></div><div class="ct">${icon('building', 18)}<span><small>Входит в группу</small><b>${extLink('https://sk.kz', 'АО «Самрук-Қазына»')}</b></span><span></span></div></div>`)}
    </div>
    ${card('Сайты компаний группы', `<div class="site-grid">${sites.map((o) => `<a class="site-l" href="${esc(siteUrl(prof(o).site))}" target="_blank" rel="noopener">${orgLogo(o, 28)}<span class="st"><b>${esc(o.name)}</b><small>${esc(prof(o).site)}</small></span>${icon('ext', 14)}</a>`).join('')}</div>`, '<a class="lnk" href="#assets">Активы группы' + icon('chevR', 14) + '</a>')}
  </div>`;
});
function peopleForm(i) {
  const list = peopleList().map((x) => ({ ...x }));
  const p = i == null ? { id: uid('ct'), role: '', name: '', position: '', org: '', topics: '', email: '', phone: '', telegram: '' } : list[i];
  openModal({
    title: i == null ? 'Новый контакт' : 'Контакт: ' + (p.role || p.name), wide: true,
    body: `<p class="note">Эти данные увидят все посетители на странице «Контакты». Указывайте рабочие контакты.</p><form class="form" data-form="noop">
      <div class="form-grid">${fld('Роль', inp('pf-role', p.role, 'maxlength="80" placeholder="Например: Администратор системы" required'), '', true)}${fld('ФИО', inp('pf-name', p.name, 'maxlength="120"'))}</div>
      <div class="form-grid">${fld('Должность', inp('pf-position', p.position, 'maxlength="160"'))}${fld('Организация', inp('pf-org', p.org, 'maxlength="160"'))}</div>
      ${fld('По каким вопросам обращаться', inp('pf-topics', p.topics, 'maxlength="240"'))}
      <div class="form-grid">${fld('E-mail', inp('pf-email', p.email, 'type="email" maxlength="160" placeholder="name@samruk-energy.kz"'))}${fld('Телефон', inp('pf-phone', p.phone, 'maxlength="40" placeholder="+7 …"'))}</div>
      ${fld('Telegram', inp('pf-telegram', p.telegram, 'maxlength="60" placeholder="@username"'))}
    </form>`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить', cls: 'primary', icon: 'check', fn: () => groupRun(async () => {
      const next = { ...p }; ['role', 'name', 'position', 'org', 'topics', 'email', 'phone', 'telegram'].forEach((k) => { next[k] = $('#pf-' + k).value.trim(); });
      if (!next.role) { toast('Укажите роль контакта', 'bad'); return; }
      if (next.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next.email)) { toast('Проверьте e-mail', 'bad'); return; }
      if (i == null) list.push(next); else list[i] = next;
      await GROUPAPI.savePeople(list); closeModal(); toast('Контакт сохранён', 'good'); rerender();
    }) }]
  });
}
ACTIONS['people-add'] = () => peopleForm(null);
ACTIONS['people-edit'] = (el) => peopleForm(+el.dataset.i);
ACTIONS['people-up'] = (el) => groupRun(async () => {
  const i = +el.dataset.i; const list = peopleList().slice(); if (i < 1) return;
  [list[i - 1], list[i]] = [list[i], list[i - 1]];
  await GROUPAPI.savePeople(list); rerender();
});
ACTIONS['people-del'] = (el) => {
  const i = +el.dataset.i; const p = peopleList()[i]; if (!p) return;
  confirmModal('Удалить контакт?', `Карточка «${p.role}${p.name ? ' — ' + p.name : ''}» исчезнет со страницы «Контакты».`, 'Удалить', () => groupRun(async () => {
    await GROUPAPI.savePeople(peopleList().filter((_, k) => k !== i)); toast('Контакт удалён', 'good'); rerender();
  }), true);
};
ACTIONS['go-councils'] = () => { UI.tabs.fb = 'councils'; go('feedback'); };
FORMS.noop = () => {};
