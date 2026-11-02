"""Сборка JASTAR HUB в один файл index.html (без зависимостей, Python 3.8+).

Запуск:  python3 build.py
Исходники лежат в src/: модули JS подключаются в порядке номеров, стили — styles.css.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
MODULES = ['01-data.js', '02-core.js', '03-ui.js', '04-pages-a.js', '05-pages-b.js', '06-pages-c.js', '065-live.js', '07-main.js']
SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'

css = (SRC / 'styles.css').read_text(encoding='utf-8')
js = '\n'.join((SRC / m).read_text(encoding='utf-8') for m in MODULES)

html = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>JASTAR HUB</title>
<meta name="description" content="Единая цифровая платформа Молодёжных советов группы АО «Самрук-Қазына»">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@500;600;700&display=swap">
<style>
:root {{ padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }}
[hidden] {{ display: none !important; }}
{css}
</style>
</head>
<body>
<div class="demo-strip"><b>ТЕСТ</b> · Демо-версия: люди, показатели и рейтинги вымышлены, изменения хранятся только в вашем браузере.</div>
<div class="app">
  <aside class="side" id="side" aria-label="Навигация"></aside>
  <div class="col"><header class="topbar" id="top"></header><main class="main" id="main" tabindex="-1"></main></div>
</div>
<div class="scrim" data-act="scrim"></div>
<div id="modal" hidden></div>
<div id="toasts" aria-live="polite"></div>
<div id="tip" role="tooltip" hidden></div>
<script src="{SUPABASE_JS}"></script>
<script>
"use strict";
{js}
</script>
</body>
</html>
'''
(ROOT / 'index.html').write_text(html, encoding='utf-8')
print(f'index.html: {len(html) // 1024} KB')
