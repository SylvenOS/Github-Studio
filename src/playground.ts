/**
 * Live playground served at `/`. It is generated from `/api/cards`, so new cards and
 * parameters appear here automatically. The client script deliberately avoids template
 * literals so it can live inside this one.
 */
export const playgroundHtml = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GitPulse Playground</title>
<style>
  :root { color-scheme: dark light; --bg:#0d1117; --panel:#161b22; --line:#30363d; --fg:#e6edf3; --muted:#8b949e; --accent:#58a6ff; }
  @media (prefers-color-scheme: light) { :root { --bg:#f6f8fa; --panel:#fff; --line:#d0d7de; --fg:#1f2328; --muted:#59636e; --accent:#0969da; } }
  * { box-sizing: border-box; }
  body { margin:0; height:100vh; display:flex; font:14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:var(--bg); color:var(--fg); }
  aside { width:340px; flex:none; background:var(--panel); border-right:1px solid var(--line); padding:20px; overflow-y:auto; }
  main { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; padding:32px; gap:20px; overflow:auto; }
  h1 { margin:0 0 4px; font-size:20px; color:var(--accent); }
  .sub { color:var(--muted); font-size:12px; margin-bottom:16px; }
  h2 { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin:20px 0 8px; }
  label { display:block; font-weight:600; font-size:12px; margin:10px 0 4px; }
  .hint { font-weight:400; color:var(--muted); }
  input[type=text], input[type=number], select { width:100%; padding:7px 8px; border-radius:6px; border:1px solid var(--line); background:var(--bg); color:var(--fg); font:inherit; }
  .check { display:flex; align-items:center; gap:8px; margin:10px 0 0; }
  .check label { margin:0; }
  .bar { width:100%; max-width:820px; display:flex; gap:8px; }
  .url { flex:1; min-width:0; padding:10px 12px; background:var(--panel); border:1px solid var(--line); border-radius:6px; font:12px ui-monospace,monospace; color:var(--muted); word-break:break-all; }
  button { padding:8px 12px; border-radius:6px; border:1px solid var(--line); background:var(--panel); color:var(--fg); cursor:pointer; font:inherit; white-space:nowrap; }
  button:hover { border-color:var(--accent); }
  .stage { max-width:100%; overflow:auto; padding:24px; border-radius:10px; border:1px dashed var(--line); background:repeating-conic-gradient(#8881 0% 25%, transparent 0% 50%) 0 0/16px 16px; }
  .stage img { display:block; max-width:none; }
  .desc { color:var(--muted); max-width:820px; text-align:center; }
  @media (max-width:800px) { body { flex-direction:column; height:auto; } aside { width:auto; border-right:0; border-bottom:1px solid var(--line); } }
</style>
</head>
<body>
<aside>
  <h1>GitPulse</h1>
  <div class="sub">Customisable GitHub stats cards. <a style="color:var(--accent)" href="/api/cards">API reference</a></div>
  <label for="username">GitHub username</label>
  <input type="text" id="username" value="torvalds" autocomplete="off" spellcheck="false">
  <label for="card">Card</label>
  <select id="card"></select>
  <label for="theme">Theme</label>
  <select id="theme"></select>
  <h2>Card options</h2>
  <div id="card-params"></div>
  <h2>Appearance</h2>
  <div id="common-params"></div>
</aside>
<main>
  <div class="bar">
    <div class="url" id="url"></div>
    <button id="copy-md">Copy Markdown</button>
    <button id="copy-url">Copy URL</button>
  </div>
  <div class="stage"><img id="preview" alt="Card preview"></div>
  <div class="desc" id="desc"></div>
</main>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var meta, timer;
  var SPECIAL = { username: 1, theme: 1, format: 1, cache_seconds: 1 };

  function field(p) {
    var wrap = document.createElement('div');
    var id = 'p_' + p.name;
    var input;
    if (p.type === 'boolean') {
      wrap.className = 'check';
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = p.default === true;
      input.id = id;
      var l = document.createElement('label'); l.htmlFor = id;
      l.innerHTML = p.name + ' <span class="hint">- ' + p.description + '</span>';
      wrap.appendChild(input); wrap.appendChild(l);
    } else {
      var lab = document.createElement('label'); lab.htmlFor = id;
      lab.innerHTML = p.name + ' <span class="hint">- ' + p.description + '</span>';
      wrap.appendChild(lab);
      if (p.type === 'enum') {
        input = document.createElement('select');
        (p.options || []).forEach(function (o) {
          var opt = document.createElement('option'); opt.value = o; opt.textContent = o; input.appendChild(opt);
        });
        if (p.default !== undefined) input.value = String(p.default);
      } else {
        input = document.createElement('input');
        input.type = p.type === 'number' ? 'number' : 'text';
        if (p.min !== undefined) input.min = p.min;
        if (p.max !== undefined) input.max = p.max;
        if (p.default !== undefined && p.name !== 'username') input.placeholder = String(p.default);
        input.autocomplete = 'off'; input.spellcheck = false;
      }
      input.id = id;
      wrap.appendChild(input);
    }
    input.dataset.param = p.name;
    input.dataset.type = p.type;
    input.dataset.def = p.default === undefined ? '' : String(p.default);
    input.addEventListener('input', schedule);
    input.addEventListener('change', schedule);
    return wrap;
  }

  function collect(container, qs) {
    Array.prototype.forEach.call(container.querySelectorAll('[data-param]'), function (el) {
      var v = el.dataset.type === 'boolean' ? String(el.checked) : el.value.trim();
      if (v === '' || v === el.dataset.def) return;
      qs.push(encodeURIComponent(el.dataset.param) + '=' + encodeURIComponent(v.replace(/^#/, '')));
    });
  }

  function currentCard() {
    return meta.cards.filter(function (c) { return c.id === $('card').value; })[0];
  }

  function buildUrl() {
    var qs = ['username=' + encodeURIComponent($('username').value.trim() || 'torvalds')];
    if ($('theme').value !== 'default') qs.push('theme=' + $('theme').value);
    collect($('card-params'), qs);
    collect($('common-params'), qs);
    return '/api/' + $('card').value + '?' + qs.join('&');
  }

  function update() {
    var url = buildUrl();
    var abs = location.origin + url;
    $('url').textContent = abs;
    $('preview').src = url;
    var c = currentCard();
    $('desc').textContent = c ? c.description : '';
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(update, 250); }

  function renderCardParams() {
    var box = $('card-params'); box.innerHTML = '';
    var c = currentCard();
    c.params.forEach(function (p) { box.appendChild(field(p)); });
    // the repo card needs a value to render; prefill one
    var repo = box.querySelector('[data-param=repo]');
    if (repo && !repo.value) repo.value = 'linux';
    if (repo) repo.dataset.def = '';
  }

  function copy(text, btn) {
    navigator.clipboard.writeText(text).then(function () {
      var old = btn.textContent; btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = old; }, 1200);
    });
  }

  fetch('/api/cards').then(function (r) { return r.json(); }).then(function (m) {
    meta = m;
    m.cards.forEach(function (c) {
      var o = document.createElement('option'); o.value = c.id; o.textContent = c.title; $('card').appendChild(o);
    });
    var themeDoc = m.common.filter(function (p) { return p.name === 'theme'; })[0];
    (themeDoc.options || []).forEach(function (t) {
      var o = document.createElement('option'); o.value = t; o.textContent = t; $('theme').appendChild(o);
    });
    $('theme').value = 'default';
    m.common.filter(function (p) { return !SPECIAL[p.name]; }).forEach(function (p) { $('common-params').appendChild(field(p)); });
    renderCardParams();
    update();
  });

  $('username').addEventListener('input', schedule);
  $('theme').addEventListener('change', schedule);
  $('card').addEventListener('change', function () { renderCardParams(); update(); });
  $('copy-url').addEventListener('click', function () { copy($('url').textContent, this); });
  $('copy-md').addEventListener('click', function () { copy('![GitHub card](' + $('url').textContent + ')', this); });
})();
</script>
</body>
</html>`;
