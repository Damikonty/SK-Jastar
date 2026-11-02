/* =====================================================================
   Обработчики событий и запуск приложения
   ===================================================================== */

function setPath(obj, path, val) {
  const ks = path.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    o = o[k];
  }
  o[ks[ks.length - 1]] = val;
}
function readVal(el) { return el.type === 'number' || el.type === 'range' ? (el.value === '' ? '' : +el.value) : el.value; }
function resetLimits(path) {
  const ns = path.split('.')[0];
  const defaults = { pp: 24, pr: 24, rt: 30 };
  if (defaults[ns] && UI[ns]) UI[ns].limit = defaults[ns];
  if (ns === 'ev' && UI.ev && path !== 'ev.day') UI.ev.day = null;
}
function debounce(fn, ms) { let t0; return (...a) => { clearTimeout(t0); t0 = setTimeout(() => fn(...a), ms); }; }
const liveRerender = debounce(() => rerender(), 180);

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (!e.target.closest('.gsearch')) { const g = $('#gres'); if (g) g.hidden = true; }
  if (!e.target.closest('.sugg-wrap')) { const s = $('#team-sugg'); if (s) s.hidden = true; }
  if (e.target.closest('.gres a')) { const g = $('#gres'); if (g) g.hidden = true; UI.gq = ''; }
  if (!a) return;
  const k = a.dataset.act;
  if (k === 'seg') { e.preventDefault(); setPath(UI, a.dataset.name, a.dataset.v); resetLimits(a.dataset.name); rerender(); return; }
  if (k === 'modal-close') { closeModal(); return; }
  if (k === 'modal-action') { const fn = MODAL_CB[a.dataset.k]; if (fn) fn(); return; }
  if (k === 'drawer') { document.body.classList.toggle('drawer-open'); return; }
  if (k === 'scrim') { closeDrawer(); return; }
  if (k === 'lang') {
    DB.lang = a.dataset.v; saveDB();
    if (DB.lang !== 'ru') toast(DB.lang === 'kk' ? 'Қазақ тілі: навигация және негізгі элементтер аударылды. Толық аударма архитектурасы дайын.' : 'English: navigation and key elements are translated. The i18n layer is ready for full translation.');
    rerender(); return;
  }
  if (k === 'lightbox') {
    MEDIA.url(a.dataset.key).then((u) => { if (u) openModal({ title: a.dataset.name || 'Фото', wide: true, body: `<img class="lightbox" alt="${esc(a.dataset.name || '')}" src="${u}">` }); });
    return;
  }
  if (k === 'file-download') {
    e.preventDefault();
    MEDIA.get(a.dataset.key).then((b) => { if (b) saveFile(a.dataset.name, b); else toast('Файл недоступен в этом браузере', 'warn'); });
    return;
  }
  const fn = ACTIONS[k];
  if (fn) { e.preventDefault(); fn(a, e); }
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'gq') { UI.gq = el.value; globalSearch(el.value); return; }
  if (el.dataset.suggest && SUGGEST[el.dataset.suggest]) { SUGGEST[el.dataset.suggest](el); return; }
  if (el.dataset.bind) {
    setPath(UI, el.dataset.bind, readVal(el));
    if (el.type === 'range') { const o = el.parentElement.querySelector('output'); if (o) o.textContent = fmt1(+el.value); }
    return;
  }
  if (el.dataset.live && el.tagName === 'INPUT' && el.type !== 'date') { setPath(UI, el.dataset.live, el.value); resetLimits(el.dataset.live); liveRerender(); }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.upload) {
    const files = Array.from(el.files || []);
    el.value = '';
    if (files.length && UPLOAD[el.dataset.upload]) UPLOAD[el.dataset.upload](files);
    return;
  }
  if (el.dataset.actChange) { const fn = ACTIONS[el.dataset.actChange]; if (fn) fn(el, e); return; }
  if (el.dataset.bind) { setPath(UI, el.dataset.bind, readVal(el)); if (el.dataset.rerender || el.dataset.rerenderBlur) rerender(); return; }
  if (el.dataset.live) { setPath(UI, el.dataset.live, el.value); resetLimits(el.dataset.live); rerender(); }
});

document.addEventListener('submit', (e) => {
  const f = e.target;
  e.preventDefault();
  const k = f.dataset.form;
  if (k && FORMS[k]) FORMS[k](f, e);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeDrawer(); const g = $('#gres'); if (g) g.hidden = true; }
  if (e.key === 'Enter' && e.target.id === 'gq') { const first = $('#gres a'); if (first) { e.preventDefault(); first.click(); } }
});

/* перетаскивание файлов на зоны загрузки */
document.addEventListener('dragover', (e) => { const d = e.target.closest && e.target.closest('.drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragleave', (e) => { const d = e.target.closest && e.target.closest('.drop'); if (d) d.classList.remove('over'); });
document.addEventListener('drop', (e) => {
  const d = e.target.closest && e.target.closest('.drop');
  if (!d) return;
  e.preventDefault(); d.classList.remove('over');
  const inp2 = d.querySelector('input[data-upload]');
  const files = Array.from(e.dataTransfer.files || []);
  if (inp2 && files.length) UPLOAD[inp2.dataset.upload](files);
});

window.addEventListener('hashchange', () => render());
window.addEventListener('resize', debounce(drawCharts, 160));

function boot() {
  loadDB();
  initTips();
  render();
  if (!STORAGE_OK) toast('Браузер не разрешает сохранять данные: изменения сохранятся до перезагрузки страницы', 'warn');
}
boot();
