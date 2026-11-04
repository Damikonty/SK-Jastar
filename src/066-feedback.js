/* =====================================================================
   Обратная связь: предложения, рекомендации, вопросы, проблемы на сайте,
   благодарности коллегам и советам; контакты платформы и советов.
   Работает в демо-режиме (данные в браузере) и с общей базой (Supabase).
   Благодарности и обращения не влияют на рейтинг.
   ===================================================================== */

Object.assign(ICONS, {
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M22 6l-10 7L2 6',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.8 2z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15'
});

const FB_KINDS = {
  suggestion: { name: 'Предложение', icon: 'bulb', hint: 'Идея, как улучшить платформу или работу советов' },
  recommendation: { name: 'Рекомендация', icon: 'growth', hint: 'Совет по практике, процессу или методике' },
  question: { name: 'Вопрос', icon: 'message', hint: 'Не нашли ответ в базе знаний' },
  problem: { name: 'Проблема на сайте', icon: 'alert', hint: 'Ошибка, неработающая кнопка, неверные данные' },
  thanks: { name: 'Благодарность', icon: 'heart', hint: 'Поблагодарить коллегу, совет или команду за поддержку' }
};
const FB_STATUS = {
  new: ['Новое', 'info'], in_work: ['В работе', 'accent'], answered: ['Ответ дан', 'good'], done: ['Реализовано', 'good'],
  declined: ['Отклонено', 'bad'], published: ['Опубликовано', 'good'], hidden: ['Скрыто', 'muted']
};
const FB_SECTIONS = ['Главная', 'Организации и советы', 'Личный кабинет', 'Проекты', 'Мероприятия', 'Рейтинги', 'Экспертиза', 'Новости и база знаний', 'Аналитика', 'Регистрация и вход', 'Другое'];
const CONTACT_FIELDS = [
  ['org', 'Организация', 'building', 'Например: Молодёжный совет АО «Самрук-Энерго»'],
  ['person', 'Ответственный за платформу', 'user', 'ФИО и должность'],
  ['email', 'E-mail', 'mail', 'name@company.kz'],
  ['phone', 'Телефон', 'phone', '+7 …'],
  ['telegram', 'Telegram', 'send', '@username'],
  ['address', 'Адрес', 'pin', 'Город, улица, офис'],
  ['hours', 'Часы работы', 'clock', 'Например: пн–пт, 9:00–18:00'],
  ['response', 'Срок ответа на обращения', 'check', 'Например: до 3 рабочих дней']
];
const fbChip = (s) => { const x = FB_STATUS[s] || [s, '']; return `<span class="chip st tone-${x[1]}"><i class="dot"></i>${esc(x[0])}</span>`; };
const fbKindChip = (k) => chip((FB_KINDS[k] || {}).name || k, k === 'thanks' ? 'accent' : '', (FB_KINDS[k] || {}).icon);
const fbList = () => DB.feedback || (DB.feedback = []);
const siteContacts = () => (DB.settings && DB.settings.contacts) || {};
const publicThanks = () => fbList().filter((f) => f.kind === 'thanks' && f.isPublic && f.status === 'published').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
const fbRun = (fn) => (LIVE ? busy(fn) : fn());
const tgUrl = (v) => { const h = String(v || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, ''); return /^[A-Za-z0-9_]{4,32}$/.test(h) ? 'https://t.me/' + h : ''; };

if (typeof ROW !== 'undefined') {
  ROW.feedback = (r) => ({ id: r.id, userId: r.user_id, kind: r.kind, subject: r.subject || '', body: r.body, section: r.section, targetType: r.target_type, targetId: r.target_id, isPublic: r.is_public, status: r.status, reply: r.reply || '', repliedBy: r.replied_by, repliedAt: r.replied_at, contact: r.contact || {}, demo: r.is_demo, createdAt: r.created_at });
}

/* ---------- данные: демо и общая база ---------- */
const FBAPI = {
  async submit(f) {
    if (LIVE) {
      const row = await rpc('submit_feedback', { f });
      const obj = ROW.feedback(row); fbList().push(obj); commit(); return obj;
    }
    const u = me();
    const body = String(f.body || '').trim();
    if (!FB_KINDS[f.kind]) throw new Error('Выберите тип обращения');
    if (body.length < 10) throw new Error('Опишите обращение подробнее (от 10 знаков)');
    if (body.length > 3000) throw new Error('Сообщение слишком длинное (до 3000 знаков)');
    const x = { id: uid('fb'), userId: null, kind: f.kind, subject: String(f.subject || '').trim().slice(0, 150), body, section: f.section || null, targetType: null, targetId: null, isPublic: false, status: 'new', reply: '', repliedBy: null, repliedAt: null, contact: {}, createdAt: new Date().toISOString() };
    if (f.kind === 'thanks') {
      if (!u) throw new Error('Войдите, чтобы поблагодарить: адресат должен знать, от кого благодарность');
      if (!['user', 'org', 'platform'].includes(f.targetType)) throw new Error('Выберите, кого вы благодарите');
      if (f.targetType === 'user' && !U(f.targetId)) throw new Error('Выберите сотрудника');
      if (f.targetType === 'user' && f.targetId === u.id) throw new Error('Нельзя поблагодарить самого себя');
      if (f.targetType === 'org' && !O(f.targetId)) throw new Error('Выберите совет');
      Object.assign(x, { userId: u.id, targetType: f.targetType, targetId: f.targetType === 'platform' ? null : f.targetId, isPublic: f.isPublic !== false, status: 'published' });
      if (x.targetType === 'user') notify(x.targetId, `${u.name} благодарит вас: «${body.slice(0, 140)}»`, '#person-' + x.targetId);
      else if (x.targetType === 'org') { const ch = O(x.targetId).council.chairId; if (ch && ch !== u.id) notify(ch, `${u.name} благодарит Молодёжный совет: «${body.slice(0, 120)}»`, '#company-' + x.targetId); }
      else DB.users.filter((a) => a.role === 'admin').forEach((a) => notify(a.id, 'Новая благодарность команде платформы', '#feedback'));
      audit('Благодарность', 'feedback', x.id, FB_KINDS.thanks.name);
    } else {
      if (f.anonymous) x.userId = null;
      else if (!u) {
        const name = String((f.contact || {}).name || '').trim(); const email = String((f.contact || {}).email || '').trim();
        if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Укажите имя и e-mail для ответа');
        x.contact = { name, email };
      } else { x.userId = u.id; if ((f.contact || {}).reply) x.contact = { reply: String(f.contact.reply).trim().slice(0, 160) }; }
      DB.users.filter((a) => a.role === 'admin').forEach((a) => notify(a.id, `Новое обращение: ${FB_KINDS[x.kind].name}${x.subject ? ' — ' + x.subject : ''}`, '#admin'));
      DB.audit.push({ id: uid('l'), ts: new Date().toISOString(), actorId: x.userId, role: x.userId ? myRole() : 'guest', action: 'Новое обращение', entityType: 'feedback', entityId: x.id, details: FB_KINDS[x.kind].name + (x.subject ? ': ' + x.subject : '') });
    }
    fbList().push(x); commit();
    return x;
  },
  async update(id, st, reply) {
    if (LIVE) {
      const row = await rpc('admin_feedback_update', { fid: id, st, answer: reply });
      const obj = ROW.feedback(row); const i = fbList().findIndex((f) => f.id === id); if (i >= 0) DB.feedback[i] = obj; commit(); return obj;
    }
    const f = fbList().find((x) => x.id === id);
    const changed = String(reply || '').trim() !== (f.reply || '');
    f.status = st; f.reply = String(reply || '').trim();
    if (changed) { f.repliedBy = me().id; f.repliedAt = new Date().toISOString(); }
    if (f.userId && f.kind !== 'thanks') notify(f.userId, `Обращение «${f.subject || f.body.slice(0, 60)}»: ${{ in_work: 'взято в работу', answered: 'получен ответ', done: 'предложение реализовано', declined: 'отклонено' }[st] || 'обновлено'}`, '#feedback');
    audit('Обработка обращения', 'feedback', id, st + (changed ? '; ответ: ' + f.reply.slice(0, 200) : ''));
    commit(); return f;
  },
  async saveContacts(c) {
    if (LIVE) await tbl(sb.from('settings').update({ contacts: c, updated_at: new Date().toISOString() }).eq('id', 1));
    DB.settings.contacts = c;
    audit('Изменение контактной информации', 'settings', 'contacts', Object.keys(c).filter((k) => c[k]).join(', '));
    commit();
  }
};

/* ---------- компоненты ---------- */
function thanksTarget(f) {
  if (f.targetType === 'user') { const t = U(f.targetId); return t ? { html: `<a href="#person-${t.id}">${esc(t.name)}</a>`, av: avatar(t, 26), label: t.name } : { html: 'Участнику', av: '', label: 'Участник' }; }
  if (f.targetType === 'org') { const o = O(f.targetId); return o ? { html: `<a href="#company-${o.id}">Молодёжному совету ${esc(o.name)}</a>`, av: orgLogo(o, 26), label: 'Молодёжный совет ' + o.name } : { html: 'Совету', av: '', label: 'Совет' }; }
  return { html: 'Команде платформы', av: `<span class="thx-pl">${icon('heart', 14)}</span>`, label: 'Команда платформы' };
}
function thanksCard(f, compact = false) {
  const from = U(f.userId); const to = thanksTarget(f);
  return `<article class="thx ${compact ? 'sm' : ''}">
    <div class="thx-h">${from ? `${avatar(from, 26)}<a href="#person-${from.id}">${esc(from.name)}</a>` : '<span>Участник</span>'}<span class="thx-arrow" aria-label="благодарит">${icon('chevR', 14)}</span>${compact ? '' : to.av}${to.html}</div>
    <p>«${esc(f.body)}»</p>
    <small class="muted">${fmtDate(f.createdAt)}${f.demo ? ' · ' + testChip() : ''}${f.status === 'hidden' ? ' · скрыто администратором' : ''}</small>
  </article>`;
}
function contactRows(c, keys) {
  return `<div class="contact-list">${CONTACT_FIELDS.filter(([k]) => (!keys || keys.includes(k)) && c[k]).map(([k, label, ic]) => {
    const v = String(c[k]);
    let val = esc(v);
    if (k === 'telegram' && tgUrl(v)) val = `<a href="${tgUrl(v)}" target="_blank" rel="noopener">${esc(v)}</a>`;
    const copy = ['email', 'phone', 'telegram'].includes(k) ? `<button class="icon-btn sm-ic" data-act="copy-text" data-v="${esc(v)}" aria-label="Скопировать: ${esc(label)}" title="Скопировать">${icon('copy', 15)}</button>` : '<span></span>';
    return `<div class="ct">${icon(ic, 18)}<span><small>${esc(label)}</small><b>${val}</b></span>${copy}</div>`;
  }).join('')}</div>`;
}
function contactsCard() {
  const c = siteContacts();
  const edit = myRole() === 'admin' ? `<button class="btn sm ghost" data-act="fb-contacts-edit">${icon('edit', 15)}Изменить</button>` : '';
  if (!CONTACT_FIELDS.some(([k]) => c[k])) return card('Контакты платформы', emptyState('mail', 'Контакты пока не указаны', myRole() === 'admin' ? 'Добавьте e-mail, телефон и ответственного — они появятся здесь для всех пользователей.' : 'Администратор платформы добавит e-mail, телефон и ответственного. А пока напишите через форму — обращение дойдёт.', myRole() === 'admin' ? `<button class="btn primary" data-act="fb-contacts-edit">${icon('edit', 16)}Заполнить контакты</button>` : ''), edit);
  return card('Контакты платформы', contactRows(c), edit);
}
function personContacts(u) {
  const c = u.contacts || {};
  return CONTACT_FIELDS.some(([k]) => ['email', 'phone', 'telegram'].includes(k) && c[k]) ? contactRows(c, ['email', 'phone', 'telegram']) : '';
}
ACTIONS['copy-text'] = async (el) => {
  const v = el.dataset.v;
  try { await navigator.clipboard.writeText(v); toast('Скопировано: ' + v, 'good'); }
  catch (e) { openModal({ title: 'Скопируйте вручную', body: `<input class="input" id="copy-v" value="${esc(v)}" readonly>`, onMount: (r) => { const i = $('#copy-v', r); i.focus(); i.select(); } }); }
};
ACTIONS['fb-contacts-edit'] = () => {
  const c = siteContacts();
  openModal({
    title: 'Контактная информация платформы', wide: true,
    body: `<p class="note">Эти данные увидят все посетители на странице «Обратная связь». Оставьте поле пустым, чтобы не показывать его.</p><form class="form"><div class="form-grid">${CONTACT_FIELDS.map(([k, label, , ph]) => fld(label, inp('ct-' + k, c[k] || '', `placeholder="${esc(ph)}" maxlength="200"`))).join('')}</div></form>`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить', cls: 'primary', icon: 'check', fn: () => fbRun(async () => {
      const next = {}; CONTACT_FIELDS.forEach(([k]) => { const v = $('#ct-' + k).value.trim(); if (v) next[k] = v; });
      if (next.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next.email)) { toast('Проверьте e-mail', 'bad'); return; }
      await FBAPI.saveContacts(next); closeModal(); toast('Контакты сохранены', 'good'); rerender();
    }) }]
  });
};
ACTIONS['thank-user'] = (el) => { UI.fbf = { ...fbBlank(), kind: 'thanks', targetType: 'user', targetId: el.dataset.id }; UI.fbDone = null; UI.tabs.fb = 'write'; go('feedback'); };
ACTIONS['thank-org'] = (el) => { UI.fbf = { ...fbBlank(), kind: 'thanks', targetType: 'org', targetOrg: el.dataset.id }; UI.fbDone = null; UI.tabs.fb = 'write'; go('feedback'); };

/* ---------- страница «Обратная связь» ---------- */
function fbBlank() { return { kind: 'suggestion', subject: '', body: '', section: '', targetType: 'user', targetId: '', targetOrg: '', isPublic: true, anonymous: false, name: '', email: '', reply: '' }; }
function fbForm() {
  const u = me();
  const F = (UI.fbf = UI.fbf || fbBlank());
  if (UI.fbDone) {
    const d = UI.fbDone;
    const text = d.kind === 'thanks'
      ? `${esc(d.target)} ${d.targetType === 'platform' ? 'получит' : 'получит уведомление'}${d.isPublic ? ', а благодарность появится на стене благодарностей' : ''}. Спасибо, что замечаете и поддерживаете коллег.`
      : d.anonymous ? 'Обращение отправлено анонимно. Мы рассмотрим его, но ответить лично не сможем.'
        : d.guest ? `Ответ придёт на ${esc(d.email)}.`
          : 'Статус и ответ появятся в разделе «Мои обращения» и в уведомлениях.';
    return `<section class="card fb-done"><span class="fb-done-ic">${icon(d.kind === 'thanks' ? 'heart' : 'check', 28)}</span><h2>${d.kind === 'thanks' ? 'Спасибо за поддержку!' : 'Спасибо за обращение!'}</h2><p>${text}</p>${d.kind !== 'thanks' ? `<p class="muted sm">Номер обращения: ${esc(d.id)}</p>` : ''}
      <div class="btn-row center"><button class="btn primary" data-act="fb-again">${icon('plus', 16)}${d.kind === 'thanks' ? 'Поблагодарить ещё' : 'Написать ещё'}</button>${u && !d.anonymous ? `<button class="btn" data-act="seg" data-name="tabs.fb" data-v="${d.kind === 'thanks' ? 'thanks' : 'mine'}">${d.kind === 'thanks' ? 'Стена благодарностей' : 'Мои обращения'}</button>` : ''}<a class="btn ghost" href="#home">На главную</a></div></section>`;
  }
  const isThanks = F.kind === 'thanks';
  const target = F.targetType === 'user' && F.targetId && U(F.targetId);
  let who = '';
  if (isThanks) {
    if (!u) who = `<div class="hint-card">${icon('lock', 18)}<span>Чтобы поблагодарить, войдите в систему: адресат должен знать, от кого благодарность. <a class="lnk" href="#login">Войти</a></span></div>`;
    else {
      who = `<div class="field"><span class="fl">Кого вы благодарите <em>*</em></span>${seg('fbf.targetType', [['user', 'Сотрудника'], ['org', 'Молодёжный совет'], ['platform', 'Команду платформы']], F.targetType)}</div>`;
      if (F.targetType === 'user') who += target
        ? `<div class="picked">${avatar(target, 28)}<span><b>${esc(target.name)}</b><small>${esc(target.position)} · ${esc(orgLabel(target.companyId))}</small></span><button type="button" class="icon-btn" data-act="fb-unpick" aria-label="Выбрать другого">${icon('x', 15)}</button></div>`
        : `<div class="sugg-wrap"><span class="f-search">${icon('search', 16)}<input id="fb-user-q" placeholder="ФИО или компания сотрудника" data-suggest="fbuser" autocomplete="off"></span><div class="sugg" id="fb-user-sugg" hidden></div></div>`;
      if (F.targetType === 'org') who += fld('Совет', sel('fb-org', [['', 'Выберите совет'], ...DB.orgs.map((o) => [o.id, (o.type === 'subsidiary' ? '— ' : '') + o.name])], F.targetOrg, 'data-bind="fbf.targetOrg"'), '', true);
      who += `<label class="check"><input type="checkbox" id="fb-public" ${F.isPublic ? 'checked' : ''} data-act-change="fb-flag" data-k="isPublic"><span>Показать на стене благодарностей (иначе её увидит только адресат)</span></label>`;
    }
  }
  const disabled = isThanks && !u;
  return `<form class="form card pad" data-form="feedback">
    <div class="field"><span class="fl">Тип обращения</span><div class="fb-kinds" role="radiogroup" aria-label="Тип обращения">${Object.entries(FB_KINDS).map(([k, v]) => `<button type="button" role="radio" aria-checked="${F.kind === k}" class="fb-kind ${F.kind === k ? 'on' : ''}" data-act="fb-kind" data-v="${k}">${icon(v.icon, 18)}<b>${esc(v.name)}</b></button>`).join('')}</div><span class="fh">${esc(FB_KINDS[F.kind].hint)}</span></div>
    ${who}
    ${!isThanks ? `<div class="form-grid">${fld('Тема', inp('fb-subject', F.subject, 'data-bind="fbf.subject" maxlength="150" placeholder="Кратко, о чём обращение"'))}${fld('Раздел платформы', sel('fb-section', [['', 'Не относится к разделу'], ...FB_SECTIONS.map((s) => [s, s])], F.section, 'data-bind="fbf.section"'))}</div>` : ''}
    ${fld(isThanks ? 'Текст благодарности' : 'Сообщение', txa('fb-body', F.body, isThanks ? 4 : 6, `data-bind="fbf.body" maxlength="3000" placeholder="${isThanks ? 'За что вы благодарны: конкретная помощь, поддержка, результат' : F.kind === 'problem' ? 'Что вы делали, что ожидали увидеть и что произошло' : 'Опишите идею, рекомендацию или вопрос'}" ${disabled ? 'disabled' : ''}`), 'От 10 до 3000 знаков', true)}
    ${!isThanks && !u ? `<div class="form-grid">${fld('Ваше имя', inp('fb-name', F.name, 'data-bind="fbf.name" autocomplete="name"'), '', true)}${fld('E-mail для ответа', inp('fb-email', F.email, 'type="email" data-bind="fbf.email" autocomplete="email"'), '', true)}</div>` : ''}
    ${!isThanks && u ? `<label class="check"><input type="checkbox" id="fb-anon" ${F.anonymous ? 'checked' : ''} data-act-change="fb-flag" data-k="anonymous"><span>Отправить анонимно: имя не сохраняется, но и ответ получить не получится</span></label>${!F.anonymous ? fld('Дополнительный контакт для ответа', inp('fb-reply', F.reply, 'data-bind="fbf.reply" maxlength="160" placeholder="Необязательно: телефон или Telegram"'), 'Ответ также придёт в уведомления и в «Мои обращения»') : ''}` : ''}
    <div class="btn-row end"><button class="btn primary" type="submit" ${disabled ? 'disabled' : ''}>${icon(isThanks ? 'heart' : 'send', 16)}${isThanks ? 'Отправить благодарность' : 'Отправить обращение'}</button></div>
  </form>`;
}
ACTIONS['fb-kind'] = (el) => { UI.fbf = UI.fbf || fbBlank(); UI.fbf.kind = el.dataset.v; rerender(); };
ACTIONS['fb-flag'] = (el) => { UI.fbf[el.dataset.k] = el.checked; rerender(); };
ACTIONS['fb-unpick'] = () => { UI.fbf.targetId = ''; rerender(); setTimeout(() => { const q = $('#fb-user-q'); if (q) q.focus(); }, 0); };
ACTIONS['fb-pick-user'] = (el) => { UI.fbf.targetId = el.dataset.id; rerender(); };
ACTIONS['fb-again'] = () => { const k = UI.fbDone ? UI.fbDone.kind : 'suggestion'; UI.fbDone = null; UI.fbf = { ...fbBlank(), kind: k }; rerender(); };
SUGGEST.fbuser = (el) => {
  const box = $('#fb-user-sugg'); const s = norm(el.value);
  if (s.length < 2) { box.hidden = true; return; }
  const res = DB.users.filter((u) => ['member', 'chair', 'regional', 'expert'].includes(u.role) && !u.blocked && (!me() || u.id !== me().id) && norm(u.name + ' ' + orgLabel(u.companyId)).includes(s)).slice(0, 7);
  box.innerHTML = res.length ? res.map((u) => `<button type="button" data-act="fb-pick-user" data-id="${u.id}">${avatar(u, 26)}<span><b>${esc(u.name)}</b><small>${esc(u.position)} · ${esc(orgLabel(u.companyId) || 'эксперт')}</small></span></button>`).join('') : '<p class="muted pad">Никого не нашли</p>';
  box.hidden = false; hydrateMedia(box);
};
FORMS.feedback = () => fbRun(async () => {
  const F = UI.fbf; const u = me();
  const f = { kind: F.kind, subject: F.subject, body: F.body, section: F.section };
  if (F.kind === 'thanks') {
    f.targetType = F.targetType; f.targetId = F.targetType === 'user' ? F.targetId : F.targetType === 'org' ? F.targetOrg : null; f.isPublic = F.isPublic;
    if (F.targetType === 'user' && !F.targetId) { toast('Выберите сотрудника, которого благодарите', 'bad'); return; }
    if (F.targetType === 'org' && !F.targetOrg) { toast('Выберите совет', 'bad'); return; }
  } else if (!u) f.contact = { name: F.name, email: F.email };
  else { f.anonymous = !!F.anonymous; if (!F.anonymous && F.reply) f.contact = { reply: F.reply }; }
  if (String(F.body || '').trim().length < 10) { toast('Опишите обращение подробнее (от 10 знаков)', 'bad'); return; }
  let x;
  try { x = await FBAPI.submit(f); } catch (e) { if (!LIVE) toast(e.message, 'bad'); return; }
  UI.fbDone = { id: x.id, kind: x.kind, target: x.kind === 'thanks' ? thanksTarget(x).label : '', targetType: x.targetType, isPublic: x.isPublic, anonymous: !!f.anonymous, guest: !u, email: F.email };
  UI.fbf = { ...fbBlank(), kind: F.kind };
  window.scrollTo(0, 0); rerender();
});

function fbFlow() {
  const steps = [['new', 'Обращение зарегистрировано, администратор получает уведомление'], ['in_work', 'Обращение изучают и передают ответственным'], ['answered', 'Ответ приходит в уведомления и в «Мои обращения»'], ['done', 'Предложение внедрено — вы увидите это в статусе']];
  return `<ol class="flow compact">${steps.map(([s, d]) => `<li>${fbChip(s)}<span>${d}</span></li>`).join('')}</ol><p class="note">Благодарности и обращения не влияют на рейтинг советов и сотрудников.</p>`;
}
route('feedback', () => {
  const u = me();
  const tab = UI.tabs.fb || 'write';
  const thanks = publicThanks();
  const mine = u ? fbList().filter((f) => f.userId === u.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) : [];
  let body = '';
  if (tab === 'write') {
    body = `<div class="grid g-2-1"><div class="stack-v">${fbForm()}</div><div class="stack-v">${contactsCard()}${card('Как мы работаем с обращениями', fbFlow())}</div></div>`;
  } else if (tab === 'thanks') {
    body = `<div class="thx-head"><p class="note">Публичные благодарности коллегам, Молодёжным советам и команде платформы за поддержку.</p>${u ? `<button class="btn primary" data-act="fb-kind" data-v="thanks" data-tab="write">${icon('heart', 16)}Поблагодарить</button>` : ''}</div>
      ${thanks.length ? `<div class="thx-grid">${thanks.map((f) => thanksCard(f)).join('')}</div>` : emptyState('heart', 'Благодарностей пока нет', 'Поблагодарите коллегу, совет или команду платформы — благодарность появится здесь.')}`;
  } else if (tab === 'councils') {
    const q = norm((UI.fbc = UI.fbc || { q: '' }).q);
    const list = DB.orgs.filter((o) => !q || norm(o.name + ' ' + o.full + ' ' + ((U(o.council.chairId) || {}).name || '')).includes(q));
    body = `<div class="filters"><div class="f-search">${icon('search', 16)}<input id="fbc-q" type="search" placeholder="Компания или ФИО председателя" value="${esc(UI.fbc.q)}" data-live="fbc.q"></div></div>
      ${card('', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Молодёжный совет</th><th>Председатель</th><th>Контакты председателя</th><th class="num">В совете</th></tr></thead><tbody>${list.map((o) => {
        const ch = U(o.council.chairId); const c = (ch && ch.contacts) || {};
        const cs = [c.email && `<span class="nowrap">${icon('mail', 14)} ${esc(c.email)}</span>`, c.phone && `<span class="nowrap">${icon('phone', 14)} ${esc(c.phone)}</span>`, c.telegram && (tgUrl(c.telegram) ? `<a class="nowrap" href="${tgUrl(c.telegram)}" target="_blank" rel="noopener">${icon('send', 14)} ${esc(c.telegram)}</a>` : `<span class="nowrap">${icon('send', 14)} ${esc(c.telegram)}</span>`)].filter(Boolean);
        return `<tr><td><a class="tcell" href="#company-${o.id}">${orgLogo(o, 28)}<span><b>${esc(o.name)}</b><small>${esc(o.full)}</small></span></a></td><td>${ch ? `<a class="tcell" href="#person-${ch.id}">${avatar(ch, 26)}<span><b>${esc(ch.name)}</b><small>${esc(ch.position || '')}</small></span></a>` : '<span class="muted">Не назначен</span>'}</td><td><span class="ct-inline">${cs.length ? cs.join('') : '<span class="muted">Не указаны</span>'}</span></td><td class="num">${councilMembers(o.id).filter((m) => m.verified).length}</td></tr>`;
      }).join('')}</tbody></table></div><p class="note">Председатели указывают свои рабочие контакты в личном кабинете: «Редактировать профиль → Контакты в профиле».</p>`)}`;
  } else if (tab === 'mine') {
    body = mine.length ? `<div class="card"><div class="fb-mine">${mine.map((f) => `<div class="fb-row"><div class="fb-row-h">${fbKindChip(f.kind)}${fbChip(f.status)}<small class="muted">${fmtDT(f.createdAt)}</small></div>
        ${f.kind === 'thanks' ? `<p><b>${thanksTarget(f).html}</b></p>` : f.subject ? `<p><b>${esc(f.subject)}</b>${f.section ? ` <small class="muted">· ${esc(f.section)}</small>` : ''}</p>` : ''}
        <p class="fb-text">${esc(f.body)}</p>
        ${f.reply ? `<div class="fb-reply"><small>Ответ ${f.repliedAt ? fmtDate(f.repliedAt) : ''}</small><p>${esc(f.reply)}</p></div>` : ''}</div>`).join('')}</div></div>`
      : emptyState('message', 'Обращений пока нет', 'Здесь появятся ваши предложения, вопросы и благодарности вместе со статусом и ответом.', `<button class="btn primary" data-act="seg" data-name="tabs.fb" data-v="write">${icon('plus', 16)}Написать</button>`);
  }
  const tabsList = [['write', 'Написать'], ['thanks', 'Благодарности', thanks.length || null], ['councils', 'Контакты советов']];
  if (u) tabsList.push(['mine', 'Мои обращения', mine.length || null]);
  return `<div class="page">${pageHead(t('feedback'), 'Предложения, рекомендации, вопросы и благодарности за поддержку. На каждое обращение с контактом мы отвечаем.')}
    ${tabs('tabs.fb', tabsList, tab)}${body}</div>`;
});
/* кнопка «Поблагодарить» на стене переключает на форму */
const _fbKind = ACTIONS['fb-kind'];
ACTIONS['fb-kind'] = (el) => { if (el.dataset.tab) { UI.tabs.fb = el.dataset.tab; UI.fbDone = null; } _fbKind(el); };

/* ---------- администрирование обращений ---------- */
function adminFeedbackTab() {
  const f = (UI.afb = { kind: '', status: 'open', ...(UI.afb || {}) });
  let list = fbList().slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (f.kind) list = list.filter((x) => x.kind === f.kind);
  if (f.status === 'open') list = list.filter((x) => ['new', 'in_work'].includes(x.status));
  else if (f.status) list = list.filter((x) => x.status === f.status);
  const counts = { new: fbList().filter((x) => x.status === 'new').length, in_work: fbList().filter((x) => x.status === 'in_work').length, thanks: fbList().filter((x) => x.kind === 'thanks').length };
  const from = (x) => x.kind === 'thanks' ? ((U(x.userId) || {}).name || 'Участник') : x.userId ? ((U(x.userId) || {}).name || 'Участник') : x.contact && x.contact.email ? `${x.contact.name || 'Гость'} · ${x.contact.email}` : 'Анонимно';
  return `<div class="kpis k4">${kpi('Новые', fmt(counts.new), 'ждут ответа')}${kpi('В работе', fmt(counts.in_work))}${kpi('Всего обращений', fmt(fbList().filter((x) => x.kind !== 'thanks').length))}${kpi('Благодарностей', fmt(counts.thanks))}</div>
    <div class="filters">${seg('afb.kind', [['', 'Все'], ...Object.entries(FB_KINDS).map(([k, v]) => [k, v.name])], f.kind)}${sel('afb-st', [['open', 'Требуют внимания'], ['', 'Все статусы'], ...Object.entries(FB_STATUS).map(([k, v]) => [k, v[0]])], f.status, 'data-live="afb.status" aria-label="Статус"')}<button class="btn ghost" data-act="fb-contacts-edit">${icon('edit', 16)}Контакты платформы</button></div>
    ${card(`Обращения · ${list.length}`, list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Тип</th><th>Обращение</th><th>От кого</th><th>Дата</th><th>Статус</th><th></th></tr></thead><tbody>${list.slice(0, 150).map((x) => `<tr><td>${fbKindChip(x.kind)}</td><td><b>${esc(x.kind === 'thanks' ? '→ ' + thanksTarget(x).label : x.subject || x.body.slice(0, 60))}</b><small>${esc(x.body.slice(0, 110))}${x.body.length > 110 ? '…' : ''}</small></td><td>${esc(from(x))}${x.demo ? ' ' + testChip() : ''}</td><td class="nowrap">${fmtDate(x.createdAt)}</td><td>${fbChip(x.status)}</td><td class="act"><button class="btn sm" data-act="fb-open" data-id="${x.id}">Открыть</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Нет обращений по этим условиям</p>')}`;
}
ACTIONS['fb-open'] = (el) => {
  const x = fbList().find((f) => f.id === el.dataset.id);
  const sts = x.kind === 'thanks' ? ['published', 'hidden'] : ['new', 'in_work', 'answered', 'done', 'declined'];
  const who = x.kind === 'thanks' || x.userId ? userLink(U(x.userId)) : x.contact && x.contact.email ? `${esc(x.contact.name || 'Гость')} · <span class="nowrap">${esc(x.contact.email)}</span> <button class="icon-btn sm-ic" data-act="copy-text" data-v="${esc(x.contact.email)}" aria-label="Скопировать e-mail">${icon('copy', 14)}</button>` : 'Анонимно';
  openModal({
    title: (FB_KINDS[x.kind] || {}).name + (x.subject ? ': ' + x.subject : ''), wide: true,
    body: `<div class="chips">${fbKindChip(x.kind)}${fbChip(x.status)}${x.section ? chip(x.section) : ''}${x.demo ? testChip() : ''}</div>
      <dl class="dl2"><div><dt>От кого</dt><dd>${who}</dd></div><div><dt>Дата</dt><dd>${fmtDT(x.createdAt)}</dd></div>${x.kind === 'thanks' ? `<div><dt>Кому</dt><dd>${thanksTarget(x).html}</dd></div><div><dt>Публичность</dt><dd>${x.isPublic ? 'На стене благодарностей' : 'Видит только адресат'}</dd></div>` : ''}${x.contact && x.contact.reply ? `<div><dt>Контакт для ответа</dt><dd>${esc(x.contact.reply)}</dd></div>` : ''}</dl>
      <blockquote class="fb-quote">${esc(x.body)}</blockquote>
      <div class="form-grid">${fld('Статус', sel('fb-st', sts.map((s) => [s, FB_STATUS[s][0]]), x.status))}</div>
      ${x.kind !== 'thanks' ? fld(x.userId ? 'Ответ автору' : 'Ответ (виден только администраторам)', txa('fb-ans', x.reply || '', 4, 'maxlength="2000"'), x.userId ? 'Автор получит уведомление и увидит ответ в «Мои обращения»' : x.contact && x.contact.email ? 'Автор — гость: ответьте на указанный e-mail, а здесь сохраните текст ответа' : 'Анонимное обращение: ответ сохранится для истории') : ''}`,
    actions: [{ label: 'Отмена', cls: 'ghost', fn: closeModal }, { label: 'Сохранить', cls: 'primary', icon: 'check', fn: () => fbRun(async () => {
      const ans = $('#fb-ans') ? $('#fb-ans').value : '';
      await FBAPI.update(x.id, $('#fb-st').value, ans); closeModal(); toast('Обращение обновлено', 'good'); rerender();
    }) }]
  });
};
