/**
 * Live playground served at `/`. It is generated from `/api/cards` and `/api/themes`, so new cards,
 * options and themes appear here automatically. The client script avoids template literals and
 * `${` so it can live inside this one (String.raw keeps backslashes intact).
 */
export const playgroundHtml = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GitPulse Playground</title>
<style>
  :root { color-scheme: dark; --bg:#0b0f17; --panel:#121826; --panel2:#182033; --line:#243049; --fg:#e6edf6; --muted:#8b98b0; --accent:#6ea8fe; --accent2:#a78bfa; --ok:#34d399; }
  :root[data-scheme=light] { color-scheme: light; --bg:#f3f5f9; --panel:#ffffff; --panel2:#f0f3f8; --line:#d8dfeb; --fg:#1b2333; --muted:#5c6980; --accent:#2563eb; --accent2:#7c3aed; }
  * { box-sizing:border-box; }
  html,body { height:100%; }
  body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; display:flex; flex-direction:column; }
  a { color:var(--accent); text-decoration:none; } a:hover { text-decoration:underline; }
  header { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:1px solid var(--line); background:var(--panel); flex-wrap:wrap; }
  .logo { font-weight:800; font-size:18px; letter-spacing:-.02em; background:linear-gradient(90deg,var(--accent),var(--accent2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .tabs { display:flex; gap:4px; background:var(--panel2); padding:3px; border-radius:10px; }
  .tabs button { border:0; background:none; color:var(--muted); padding:6px 14px; border-radius:8px; font:inherit; font-weight:600; cursor:pointer; }
  .tabs button.on { background:var(--panel); color:var(--fg); box-shadow:0 1px 3px #0003; }
  .grow { flex:1; }
  .links { display:flex; gap:14px; font-size:13px; align-items:center; }
  #scheme { border:1px solid var(--line); background:var(--panel2); color:var(--fg); border-radius:8px; padding:5px 9px; cursor:pointer; }
  .app { flex:1; min-height:0; display:flex; }
  aside { width:370px; flex:none; overflow-y:auto; padding:18px; border-right:1px solid var(--line); background:var(--panel); }
  main { flex:1; min-width:0; overflow:auto; padding:22px; display:flex; flex-direction:column; align-items:center; gap:16px; }
  h2 { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); margin:22px 0 10px; display:flex; align-items:center; gap:8px; }
  aside > h2:first-child { margin-top:0; }
  h2 button { margin-left:auto; text-transform:none; letter-spacing:0; }
  label.f { display:block; margin:12px 0 5px; font-weight:600; font-size:12.5px; }
  .hint { color:var(--muted); font-weight:400; font-size:12px; }
  input[type=text], input[type=number], select { width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--line); background:var(--panel2); color:var(--fg); font:inherit; }
  input:focus, select:focus, button:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }
  .tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .tile { display:flex; flex-direction:column; align-items:center; gap:3px; padding:10px 4px; border:1px solid var(--line); border-radius:10px; background:var(--panel2); color:var(--fg); cursor:pointer; font:inherit; font-size:12px; }
  .tile b { font-size:20px; line-height:1; font-weight:400; }
  .tile:hover { border-color:var(--accent); }
  .tile.on { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 16%,var(--panel2)); font-weight:700; }
  .chips { display:flex; flex-wrap:wrap; gap:7px; }
  .chip { display:flex; align-items:center; gap:6px; padding:4px 10px 4px 5px; border-radius:999px; border:1px solid var(--line); background:var(--panel2); color:var(--fg); cursor:pointer; font:inherit; font-size:12px; }
  .chip i { width:20px; height:20px; border-radius:50%; border:2px solid; display:block; position:relative; }
  .chip i::after { content:''; position:absolute; inset:3px; border-radius:50%; background:currentColor; }
  .chip.on { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent); font-weight:700; }
  .seg { display:flex; flex-wrap:wrap; gap:4px; }
  .seg button { flex:1 1 auto; padding:6px 10px; border-radius:8px; border:1px solid var(--line); background:var(--panel2); color:var(--muted); cursor:pointer; font:inherit; font-size:12.5px; }
  .seg button.on { background:var(--accent); border-color:var(--accent); color:#fff; font-weight:700; }
  .row { display:flex; align-items:center; gap:10px; margin:12px 0 0; }
  .row label { flex:1; font-weight:600; font-size:12.5px; cursor:pointer; }
  .switch { position:relative; width:38px; height:22px; flex:none; }
  .switch input { opacity:0; position:absolute; inset:0; margin:0; cursor:pointer; z-index:1; }
  .switch span { position:absolute; inset:0; background:var(--line); border-radius:999px; transition:.15s; }
  .switch span::after { content:''; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:.15s; }
  .switch input:checked + span { background:var(--accent); }
  .switch input:checked + span::after { transform:translateX(16px); }
  input[type=range] { width:100%; accent-color:var(--accent); }
  .val { float:right; color:var(--accent); font-weight:700; }
  .color { display:flex; gap:8px; } .color input[type=color] { width:38px; height:36px; padding:2px; border-radius:8px; border:1px solid var(--line); background:var(--panel2); flex:none; }
  button.ghost { border:1px solid var(--line); background:var(--panel2); color:var(--fg); padding:6px 11px; border-radius:8px; cursor:pointer; font:inherit; font-size:12.5px; }
  button.ghost:hover { border-color:var(--accent); }
  button.primary { border:0; background:linear-gradient(90deg,var(--accent),var(--accent2)); color:#fff; font-weight:700; padding:8px 14px; border-radius:8px; cursor:pointer; font:inherit; }
  .bar { width:100%; max-width:900px; display:flex; gap:8px; flex-wrap:wrap; }
  .url { flex:1 1 300px; min-width:0; padding:9px 12px; background:var(--panel); border:1px solid var(--line); border-radius:8px; font:12px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--muted); word-break:break-all; max-height:74px; overflow:auto; }
  .stage { max-width:100%; overflow:auto; padding:26px; border-radius:14px; border:1px solid var(--line); min-height:160px; display:flex; align-items:center; justify-content:center; }
  .stage.checker { background:repeating-conic-gradient(#8882 0% 25%, transparent 0% 50%) 0 0/18px 18px; }
  .stage.dark { background:#0d1117; } .stage.light { background:#fff; }
  .stage img { display:block; max-width:none; transition:opacity .15s; }
  .stage img.loading { opacity:.35; }
  .bgs { display:flex; gap:6px; align-items:center; color:var(--muted); font-size:12px; }
  .desc { color:var(--muted); max-width:760px; text-align:center; }
  details.text { width:100%; max-width:900px; background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:10px 14px; }
  details.text summary { cursor:pointer; font-weight:600; }
  pre#text { margin:10px 0 0; overflow:auto; font:9px/9px ui-monospace,Menlo,Consolas,monospace; max-height:420px; color:var(--fg); }
  .gallery { width:100%; display:none; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:18px; align-content:start; }
  .gallery figure { margin:0; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; cursor:pointer; overflow:auto; }
  .gallery figure:hover { border-color:var(--accent); }
  .gallery figcaption { font-weight:700; margin-bottom:10px; display:flex; justify-content:space-between; }
  .gallery figcaption span { color:var(--muted); font-weight:400; font-size:12px; }
  .gallery img { display:block; max-width:100%; height:auto; }
  body.gal .gallery { display:grid; } body.gal .single { display:none; } body.gal aside .card-only { display:none; }
  .toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--ok); color:#04241a; padding:8px 16px; border-radius:999px; font-weight:700; opacity:0; pointer-events:none; transition:.2s; }
  .toast.on { opacity:1; }
  @media (max-width:860px) { .app { flex-direction:column; } aside { width:auto; border-right:0; border-bottom:1px solid var(--line); max-height:none; } }
</style>
</head>
<body>
<header>
  <span class="logo">GitPulse</span>
  <div class="tabs"><button id="tab-play" class="on">Playground</button><button id="tab-gal">Gallery</button></div>
  <span class="grow"></span>
  <div class="links"><a href="/api/cards">Cards</a><a href="/api/openapi.json">OpenAPI</a><a href="/api/themes">Themes</a><button id="scheme" title="Toggle light/dark">◐</button></div>
</header>
<div class="app">
<aside>
  <h2>GitHub user</h2>
  <input type="text" id="username" value="torvalds" autocomplete="off" spellcheck="false" placeholder="username">
  <div class="card-only">
    <h2>Card</h2>
    <div class="tiles" id="tiles"></div>
  </div>
  <h2>Theme <button class="ghost" id="surprise" title="Random theme and options">🎲 Surprise me</button></h2>
  <div class="chips" id="themes"></div>
  <div class="card-only">
    <h2>Card options</h2>
    <div id="card-params"></div>
  </div>
  <h2>Appearance <button class="ghost" id="reset">Reset</button></h2>
  <div id="common-params"></div>
</aside>
<main>
  <div class="single" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:16px">
    <div class="bar">
      <div class="url" id="url"></div>
      <button class="primary" id="copy-md">Copy Markdown</button>
      <button class="ghost" id="copy-html">HTML</button>
      <button class="ghost" id="copy-url">URL</button>
      <button class="ghost" id="open">Open</button>
    </div>
    <div class="bgs">Preview on
      <button class="ghost bgbtn" data-bg="checker">Checker</button><button class="ghost bgbtn" data-bg="dark">Dark</button><button class="ghost bgbtn" data-bg="light">Light</button>
    </div>
    <div class="stage checker" id="stage"><img id="preview" alt="Card preview"></div>
    <div class="desc" id="desc"></div>
    <details class="text" id="text-box" style="display:none">
      <summary>Plain text version (paste into a README code block)</summary>
      <button class="ghost" id="copy-text" style="margin-top:10px">Copy text</button>
      <pre id="text"></pre>
    </details>
  </div>
  <div class="gallery" id="gallery"></div>
</main>
</div>
<div class="toast" id="toast">Copied!</div>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var ICONS = { stats: '📊', 'profile-card': '👤', ascii: '🎨', languages: '🔤', streak: '🔥', contributions: '🟩', repos: '📌', 'top-repos': '⭐', radar: '🕸️', achievements: '🏆', activity: '📈', badge: '🏷️' };
  var SPECIAL = { username: 1, theme: 1, format: 1, cache_seconds: 1 };
  var meta, themes, timer;
  var state = { tab: '', card: 'stats', username: 'torvalds', theme: 'default', params: {}, bg: 'checker' };

  function el(tag, props, kids) {
    var n = document.createElement(tag);
    for (var k in (props || {})) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), props[k]);
      else n.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function toast(msg) { var t = $('toast'); t.textContent = msg || 'Copied!'; t.classList.add('on'); setTimeout(function () { t.classList.remove('on'); }, 1200); }
  function copy(text) { navigator.clipboard.writeText(text).then(function () { toast(); }); }
  function schedule() { clearTimeout(timer); timer = setTimeout(update, 220); }
  function card() { return meta.cards.filter(function (c) { return c.id === state.card; })[0]; }
  function docFor(name) { var all = card().params.concat(meta.common); return all.filter(function (p) { return p.name === name; })[0]; }

  // ---- state <-> location.hash ---------------------------------------------------------------
  function saveHash() {
    var q = ['card=' + state.card, 'username=' + encodeURIComponent(state.username), 'theme=' + state.theme];
    for (var k in state.params) q.push(encodeURIComponent(k) + '=' + encodeURIComponent(state.params[k]));
    history.replaceState(null, '', '#' + q.join('&'));
  }
  function loadHash() {
    if (!location.hash) return;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i < 0) return;
      var k = decodeURIComponent(kv.slice(0, i)), v = decodeURIComponent(kv.slice(i + 1));
      if (k === 'tab') state.tab = v; else if (k === 'card') state.card = v; else if (k === 'username') state.username = v; else if (k === 'theme') state.theme = v; else state.params[k] = v;
    });
  }

  // ---- URLs ----------------------------------------------------------------------------------
  function buildUrl(cardId, overrides, params) {
    var q = ['username=' + encodeURIComponent(state.username.trim() || 'torvalds')];
    if (state.theme !== 'default') q.push('theme=' + state.theme);
    var all = params || state.params;
    for (var k in all) {
      var v = all[k];
      if (v === '' || v === undefined) continue;
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v).replace(/^#/, '')));
    }
    for (var o in (overrides || {})) q.push(o + '=' + encodeURIComponent(overrides[o]));
    return '/api/' + cardId + '?' + q.join('&');
  }

  // ---- controls ------------------------------------------------------------------------------
  function setParam(p, value) {
    var isDefault = value === '' || value === undefined || String(value) === String(p.default === undefined ? '' : p.default);
    if (isDefault && p.name !== 'repo') delete state.params[p.name]; else state.params[p.name] = value;
    schedule();
  }
  function current(p) { return state.params[p.name] !== undefined ? state.params[p.name] : (p.default === undefined ? '' : p.default); }

  function field(p) {
    var box = el('div');
    var title = function () { return el('label', { class: 'f', text: p.name }); };
    var hint = function (t) { t.appendChild(el('span', { class: 'hint', text: ' - ' + p.description })); return t; };

    if (p.type === 'boolean') {
      var on = String(current(p)) === 'true';
      var input = el('input', { type: 'checkbox', id: 'p_' + p.name });
      input.checked = on;
      input.addEventListener('change', function () { setParam(p, input.checked ? 'true' : 'false'); });
      return el('div', { class: 'row', title: p.description }, [
        el('label', { for: 'p_' + p.name, text: p.name.replace(/_/g, ' ') }),
        el('span', { class: 'switch' }, [input, el('span')])
      ]);
    }
    box.appendChild(hint(title()));

    if (p.type === 'enum' && p.options && p.options.length <= 5) {
      var seg = el('div', { class: 'seg' });
      p.options.forEach(function (o) {
        var b = el('button', { text: o, type: 'button' });
        if (String(current(p)) === o) b.className = 'on';
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(seg.children, function (x) { x.className = ''; });
          b.className = 'on'; setParam(p, o);
        });
        seg.appendChild(b);
      });
      box.appendChild(seg);
    } else if (p.type === 'enum') {
      var sel = el('select');
      p.options.forEach(function (o) { sel.appendChild(el('option', { value: o, text: o })); });
      sel.value = String(current(p));
      sel.addEventListener('change', function () { setParam(p, sel.value); });
      box.appendChild(sel);
    } else if (p.type === 'number' && p.min !== undefined && p.max !== undefined) {
      var val = el('span', { class: 'val', text: String(current(p) === '' ? '-' : current(p)) });
      var range = el('input', { type: 'range', min: p.min, max: p.max });
      range.value = current(p) === '' ? (p.default !== undefined ? p.default : p.min) : current(p);
      range.addEventListener('input', function () { val.textContent = range.value; setParam(p, range.value); });
      box.firstChild.appendChild(val);
      box.appendChild(range);
    } else if (p.type === 'color') {
      var text = el('input', { type: 'text', placeholder: 'e.g. 1f6feb', spellcheck: 'false' });
      text.value = current(p);
      var pick = el('input', { type: 'color' });
      text.addEventListener('input', function () { setParam(p, text.value.trim()); if (/^#?[0-9a-f]{6}$/i.test(text.value)) pick.value = '#' + text.value.replace('#', ''); });
      pick.addEventListener('input', function () { text.value = pick.value.slice(1); setParam(p, text.value); });
      box.appendChild(el('div', { class: 'color' }, [pick, text]));
    } else {
      var inp = el('input', { type: p.type === 'number' ? 'number' : 'text', spellcheck: 'false', autocomplete: 'off' });
      if (p.default !== undefined) inp.placeholder = String(p.default);
      inp.value = current(p);
      inp.addEventListener('input', function () { setParam(p, inp.value.trim()); });
      box.appendChild(inp);
    }
    return box;
  }

  function renderTiles() {
    var box = $('tiles'); box.innerHTML = '';
    meta.cards.forEach(function (c) {
      var t = el('button', { class: 'tile' + (c.id === state.card ? ' on' : ''), type: 'button', title: c.description }, [el('b', { text: ICONS[c.id] || '🧩' }), el('span', { text: c.title })]);
      t.addEventListener('click', function () { selectCard(c.id, true); });
      box.appendChild(t);
    });
  }
  function renderThemes() {
    var box = $('themes'); box.innerHTML = '';
    var names = ['auto'].concat(Object.keys(themes));
    names.forEach(function (n) {
      var th = themes[n] || themes['default'];
      var dot = el('i');
      dot.style.color = th.accent; dot.style.borderColor = th.accent;
      dot.style.background = n === 'auto' ? 'linear-gradient(135deg,#fff 50%,#0d1117 50%)' : th.background;
      var c = el('button', { class: 'chip' + (n === state.theme ? ' on' : ''), type: 'button' }, [dot, el('span', { text: n })]);
      c.addEventListener('click', function () { state.theme = n; renderThemes(); schedule(); });
      box.appendChild(c);
    });
  }
  function renderParams() {
    var box = $('card-params'); box.innerHTML = '';
    card().params.forEach(function (p) { box.appendChild(field(p)); });
    var common = $('common-params'); common.innerHTML = '';
    meta.common.filter(function (p) { return !SPECIAL[p.name]; }).forEach(function (p) { common.appendChild(field(p)); });
  }

  function selectCard(id, keepCommon) {
    var common = {};
    if (keepCommon) meta.common.forEach(function (p) { if (state.params[p.name] !== undefined) common[p.name] = state.params[p.name]; });
    state.card = id; state.params = common;
    // the repo card cannot render without a repository
    if (id === 'repos') state.params.repo = 'linux';
    document.body.classList.remove('gal'); $('tab-play').className = 'on'; $('tab-gal').className = '';
    renderTiles(); renderParams(); update();
  }

  // ---- preview -------------------------------------------------------------------------------
  function update() {
    var url = buildUrl(state.card);
    var img = $('preview');
    img.classList.add('loading');
    img.onload = img.onerror = function () { img.classList.remove('loading'); };
    img.src = url;
    $('url').textContent = location.origin + url;
    $('desc').textContent = card().description;
    saveHash();
    var isAscii = state.card === 'ascii';
    $('text-box').style.display = isAscii ? 'block' : 'none';
    if (isAscii) {
      fetch(buildUrl('ascii', { format: 'text' })).then(function (r) { return r.text(); }).then(function (t) { $('text').textContent = t; });
    }
    if (document.body.classList.contains('gal')) renderGallery();
  }

  function renderGallery() {
    var g = $('gallery'); g.innerHTML = '';
    meta.cards.forEach(function (c) {
      var extra = c.id === 'repos' ? { repo: 'linux' } : {};
      var src = buildUrl(c.id, extra, {});
      var img = el('img', { src: src, loading: 'lazy', alt: c.title });
      var fig = el('figure', {}, [el('figcaption', {}, [el('div', { text: (ICONS[c.id] || '') + ' ' + c.title }), el('span', { text: '/api/' + c.id })]), img]);
      fig.addEventListener('click', function () { selectCard(c.id, false); });
      g.appendChild(fig);
    });
  }

  function surprise() {
    var names = Object.keys(themes);
    state.theme = names[Math.floor(Math.random() * names.length)];
    card().params.forEach(function (p) {
      if (p.type === 'enum' && p.options && Math.random() < 0.6) state.params[p.name] = p.options[Math.floor(Math.random() * p.options.length)];
    });
    renderThemes(); renderParams(); update();
  }

  // ---- boot ----------------------------------------------------------------------------------
  fetch('/api/cards').then(function (r) { return r.json(); }).then(function (m) {
    meta = m;
    return fetch('/api/themes').then(function (r) { return r.json(); });
  }).then(function (t) {
    themes = t;
    loadHash();
    if (!card()) state.card = 'stats';
    $('username').value = state.username;
    renderTiles(); renderThemes(); renderParams(); update();
    if (state.tab === 'gallery') $('tab-gal').click();
  });

  $('username').addEventListener('input', function (e) { state.username = e.target.value; schedule(); });
  $('reset').addEventListener('click', function () { state.params = {}; state.theme = 'default'; if (state.card === 'repos') state.params.repo = 'linux'; renderThemes(); renderParams(); update(); });
  $('surprise').addEventListener('click', surprise);
  $('copy-url').addEventListener('click', function () { copy($('url').textContent); });
  $('copy-md').addEventListener('click', function () { copy('![' + card().title + '](' + $('url').textContent + ')'); });
  $('copy-html').addEventListener('click', function () { copy('<img src="' + $('url').textContent + '" alt="' + card().title + '" />'); });
  $('copy-text').addEventListener('click', function () { copy($('text').textContent); });
  $('open').addEventListener('click', function () { window.open($('url').textContent, '_blank'); });
  $('tab-play').addEventListener('click', function () { document.body.classList.remove('gal'); $('tab-play').className = 'on'; $('tab-gal').className = ''; });
  $('tab-gal').addEventListener('click', function () { document.body.classList.add('gal'); $('tab-gal').className = 'on'; $('tab-play').className = ''; renderGallery(); });
  Array.prototype.forEach.call(document.querySelectorAll('.bgbtn'), function (b) {
    b.addEventListener('click', function () { $('stage').className = 'stage ' + b.dataset.bg; });
  });
  var scheme = document.documentElement;
  $('scheme').addEventListener('click', function () {
    var next = scheme.dataset.scheme === 'light' ? 'dark' : 'light';
    scheme.dataset.scheme = next;
    try { localStorage.setItem('gp-scheme', next); } catch (e) {}
  });
  try { var saved = localStorage.getItem('gp-scheme'); if (saved) scheme.dataset.scheme = saved; else if (matchMedia('(prefers-color-scheme: light)').matches) scheme.dataset.scheme = 'light'; } catch (e) {}
})();
</script>
</body>
</html>`;
