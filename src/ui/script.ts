/**
 * Client script for the page. It is embedded in a template literal (String.raw), so it must not
 * contain backticks, `${`, or a closing script tag. Everything user-controlled goes through
 * textContent/attributes (never innerHTML); the README preview renders inside a sandboxed iframe.
 */
export const SCRIPT = String.raw`
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ICONS = { stats: '📊', 'profile-card': '👤', ascii: '🎨', languages: '🔤', streak: '🔥', contributions: '🟩', repos: '📌', 'top-repos': '⭐', radar: '🕸️', achievements: '🏆', activity: '📈', badge: '🏷️', compare: '⚔️', banner: '🏞️', divider: '➖' };
  var CATS = { overview: 'Overview', activity: 'Activity', languages: 'Languages', repositories: 'Repositories', achievements: 'Achievements', art: 'Art', decor: 'Decor', utility: 'Utility' };
  var SPECIAL = { username: 1, theme: 1, format: 1, cache_seconds: 1 };
  var BLOCK_LABELS = { card: 'Card', row: 'Row of cards', heading: 'Heading', text: 'Text', badges: 'Badges', divider: 'Divider', html: 'HTML' };
  var meta, themes, presets = [], timer, buildTimer, previewMode = 'light', dragFrom = -1;
  var state = { tab: 'play', card: 'stats', username: 'torvalds', theme: 'default', params: {}, editing: null, q: '', cat: 'all' };
  var builder = { presetId: 'classic', spec: { dark: '', align: 'center', footer: false, params: {}, blocks: [] }, manual: false, md: '', host: '' };

  // ---- small helpers -------------------------------------------------------------------------
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    for (var k in (props || {})) {
      var v = props[k];
      if (v === undefined || v === null) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'value') n.value = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toast(msg) { var t = $('toast'); t.textContent = msg || 'Copied!'; t.classList.add('on'); setTimeout(function () { t.classList.remove('on'); }, 1400); }
  function copy(text, msg) { navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { toast('Copy failed'); }); }
  function qs(o) { var a = []; for (var k in o) if (o[k] !== '' && o[k] !== undefined) a.push(encodeURIComponent(k) + '=' + encodeURIComponent(o[k])); return a.join('&'); }
  function parseQs(s) {
    var o = {};
    String(s || '').replace(/^[?#]/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      try { o[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { /* skip malformed */ }
    });
    return o;
  }
  function paramsToText(p) { var a = []; for (var k in (p || {})) a.push(k + '=' + p[k]); return a.join('&'); }
  function textToParams(t) { var o = {}; String(t || '').split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) { var k = kv.slice(0, i).trim(); if (/^[a-z][a-z0-9_]*$/.test(k)) o[k] = kv.slice(i + 1).trim(); } }); return o; }
  function b64u(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  function user() { return state.username.trim() || 'torvalds'; }
  function cardDef(id) { return meta.cards.filter(function (c) { return c.id === id || c.aliases.indexOf(id) >= 0; })[0]; }
  function imgUrl(cardId, params) {
    var q = { username: user() };
    if (state.theme !== 'default') q.theme = state.theme;
    for (var k in (params || {})) q[k] = String(params[k]).replace(/^#/, '');
    return '/api/' + cardId + '?' + qs(q);
  }
  function download(name, text) {
    var a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/markdown' })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---- form controls, shared by the playground and the builder ---------------------------------
  // store = { get(p) -> current value or '', set(p, value) }
  function field(p, store) {
    var box = el('div');
    var head = function () {
      var l = el('label', { class: 'f', text: p.name });
      l.appendChild(el('span', { class: 'hint', text: ' - ' + p.description }));
      return l;
    };
    var cur = store.get(p);
    var shown = cur === '' || cur === undefined ? (p.default === undefined ? '' : p.default) : cur;

    if (p.type === 'boolean') {
      var input = el('input', { type: 'checkbox', id: 'p_' + p.name });
      input.checked = String(shown) === 'true';
      input.addEventListener('change', function () { store.set(p, input.checked ? 'true' : 'false'); });
      return el('div', { class: 'row', title: p.description }, [
        el('label', { for: 'p_' + p.name, text: p.name.replace(/_/g, ' ') }),
        el('span', { class: 'switch' }, [input, el('span')])
      ]);
    }
    box.appendChild(head());

    if (p.type === 'enum' && p.options && p.options.length <= 5) {
      var seg = el('div', { class: 'seg' });
      p.options.forEach(function (o) {
        var b = el('button', { text: o, type: 'button', class: String(shown) === o ? 'on' : '' });
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(seg.children, function (x) { x.className = ''; });
          b.className = 'on'; store.set(p, o);
        });
        seg.appendChild(b);
      });
      box.appendChild(seg);
    } else if (p.type === 'enum') {
      var sel = el('select');
      p.options.forEach(function (o) { sel.appendChild(el('option', { value: o, text: o })); });
      sel.value = String(shown);
      sel.addEventListener('change', function () { store.set(p, sel.value); });
      box.appendChild(sel);
    } else if (p.type === 'number' && p.min !== undefined && p.max !== undefined) {
      var val = el('span', { class: 'val', text: String(shown === '' ? '-' : shown) });
      var range = el('input', { type: 'range', min: p.min, max: p.max });
      range.value = shown === '' ? p.min : shown;
      range.addEventListener('input', function () { val.textContent = range.value; store.set(p, range.value); });
      box.firstChild.appendChild(val);
      box.appendChild(range);
    } else if (p.type === 'color') {
      var text = el('input', { type: 'text', placeholder: 'e.g. 1f6feb or 135,7f5af0,2cb67d', spellcheck: 'false' });
      text.value = cur === undefined ? '' : cur;
      var pick = el('input', { type: 'color' });
      text.addEventListener('input', function () { store.set(p, text.value.trim()); if (/^#?[0-9a-f]{6}$/i.test(text.value)) pick.value = '#' + text.value.replace('#', ''); });
      pick.addEventListener('input', function () { text.value = pick.value.slice(1); store.set(p, text.value); });
      box.appendChild(el('div', { class: 'color' }, [pick, text]));
    } else {
      var inp = el('input', { type: p.type === 'number' ? 'number' : 'text', spellcheck: 'false', autocomplete: 'off' });
      if (p.default !== undefined) inp.placeholder = String(p.default);
      inp.value = cur === undefined ? '' : cur;
      inp.addEventListener('input', function () { store.set(p, inp.value.trim()); });
      box.appendChild(inp);
    }
    return box;
  }
  function makeStore(getObj, onChange) {
    return {
      get: function (p) { var v = getObj()[p.name]; return v === undefined ? '' : v; },
      set: function (p, value) {
        var o = getObj();
        var isDefault = value === '' || value === undefined || String(value) === String(p.default === undefined ? '' : p.default);
        if (isDefault) delete o[p.name]; else o[p.name] = value;
        onChange();
      }
    };
  }
  var playStore = makeStore(function () { return state.params; }, function () { scheduleUpdate(); });
  var globalStore = makeStore(function () { return builder.spec.params; }, function () { scheduleBuild(); });

  // ---- tabs and hash ---------------------------------------------------------------------------
  function setTab(tab) {
    state.tab = tab;
    document.body.className = 't-' + tab;
    ['play', 'store', 'builder'].forEach(function (t) { $('tab-' + t).className = t === tab ? 'on' : ''; });
    $('appearance-title').textContent = tab === 'builder' ? 'Every card' : 'Appearance';
    renderParams();
    if (tab === 'store') renderStore();
    if (tab === 'builder') { renderBlocks(); build(); }
    if (tab === 'play') update();
    saveHash();
  }
  function saveHash() {
    var q = ['tab=' + state.tab, 'username=' + encodeURIComponent(state.username), 'theme=' + state.theme];
    if (state.tab === 'play') { q.push('card=' + state.card); for (var k in state.params) q.push(encodeURIComponent(k) + '=' + encodeURIComponent(state.params[k])); }
    history.replaceState(null, '', '#' + q.join('&'));
  }

  // ---- playground ------------------------------------------------------------------------------
  function currentCard() { return cardDef(state.card); }
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
    ['auto'].concat(Object.keys(themes)).forEach(function (n) {
      var th = themes[n] || themes['default'];
      var dot = el('i');
      dot.style.color = th.accent; dot.style.borderColor = th.accent;
      dot.style.background = n === 'auto' ? 'linear-gradient(135deg,#fff 50%,#0d1117 50%)' : th.background;
      var c = el('button', { class: 'chip' + (n === state.theme ? ' on' : ''), type: 'button' }, [dot, el('span', { text: n })]);
      c.addEventListener('click', function () { state.theme = n; renderThemes(); onThemeChange(); });
      box.appendChild(c);
    });
  }
  function onThemeChange() { if (state.tab === 'play') scheduleUpdate(); else if (state.tab === 'store') renderStore(); else scheduleBuild(); saveHash(); }
  function renderParams() {
    var common = $('common-params'); common.innerHTML = '';
    var store = state.tab === 'builder' ? globalStore : playStore;
    meta.common.filter(function (p) { return !SPECIAL[p.name]; }).forEach(function (p) { common.appendChild(field(p, store)); });
    var box = $('card-params'); box.innerHTML = '';
    var c = currentCard();
    if (c) c.params.forEach(function (p) { box.appendChild(field(p, playStore)); });
  }
  function selectCard(id, keepCommon) {
    var common = {};
    if (keepCommon) meta.common.forEach(function (p) { if (state.params[p.name] !== undefined) common[p.name] = state.params[p.name]; });
    state.card = id; state.params = common;
    renderTiles(); renderParams(); update();
  }
  function scheduleUpdate() { clearTimeout(timer); timer = setTimeout(update, 220); }
  function update() {
    var c = currentCard(); if (!c) return;
    var url = imgUrl(state.card, state.params);
    var img = $('preview');
    img.classList.add('loading');
    img.onload = img.onerror = function () { img.classList.remove('loading'); };
    img.src = url;
    $('url').textContent = location.origin + url;
    $('desc').textContent = c.description;
    var isAscii = state.card === 'ascii';
    $('text-box').style.display = isAscii ? 'block' : 'none';
    if (isAscii) fetch(url + '&format=text').then(function (r) { return r.text(); }).then(function (t) { $('text').textContent = t; });
    var editing = state.editing !== null && builder.spec.blocks[state.editing];
    $('editing').classList.toggle('hidden', !editing);
    $('update-block').classList.toggle('hidden', !editing);
    $('add-readme').textContent = editing ? '＋ Add as new block' : '＋ Add to README';
    if (editing) $('editing-label').textContent = 'Editing README block #' + (state.editing + 1);
    saveHash();
  }
  function surprise() {
    var names = Object.keys(themes);
    state.theme = names[Math.floor(Math.random() * names.length)];
    var c = currentCard();
    c.params.forEach(function (p) { if (p.type === 'enum' && p.options && Math.random() < 0.6) state.params[p.name] = p.options[Math.floor(Math.random() * p.options.length)]; });
    renderThemes(); renderParams(); update();
  }
  function resetCurrent() {
    if (state.tab === 'builder') { builder.spec.params = {}; renderParams(); scheduleBuild(); return; }
    if (state.tab === 'store') { state.q = ''; state.cat = 'all'; $('q').value = ''; renderStore(); return; }
    state.params = {}; state.theme = 'default';
    renderThemes(); renderParams(); update();
    toast('Reset to defaults');
  }

  // ---- store -----------------------------------------------------------------------------------
  function renderCats() {
    var box = $('cats'); box.innerHTML = '';
    ['all'].concat(Object.keys(CATS)).forEach(function (k) {
      var b = el('button', { class: 'chip plain' + (state.cat === k ? ' on' : ''), type: 'button', text: k === 'all' ? 'All' : CATS[k] });
      b.addEventListener('click', function () { state.cat = k; renderCats(); renderStore(); });
      box.appendChild(b);
    });
  }
  function renderStore() {
    var box = $('gallery'); box.innerHTML = '';
    var q = state.q.toLowerCase().trim(), n = 0;
    meta.cards.forEach(function (c) {
      if (state.cat !== 'all' && c.category !== state.cat) return;
      c.variants.forEach(function (v) {
        var hay = (c.title + ' ' + c.id + ' ' + c.description + ' ' + c.category + ' ' + c.tags.join(' ') + ' ' + v.label).toLowerCase();
        if (q && hay.indexOf(q) < 0) return;
        n++;
        box.appendChild(storeItem(c, v));
      });
    });
    $('count').textContent = n + ' style' + (n === 1 ? '' : 's');
    if (!n) box.appendChild(el('div', { class: 'empty', text: 'Nothing matches. Try another search or clear the filters.' }));
  }
  function storeItem(c, v) {
    var params = v.params || {};
    var url = imgUrl(c.id, params);
    var acts = el('div', { class: 'acts' }, [
      el('button', { class: 'ghost small', type: 'button', text: 'Customize', onclick: function () { customize(c.id, params); } }),
      el('button', { class: 'primary small', type: 'button', text: '＋ README', onclick: function () { addCardBlock(c.id, params); toast('Added to your README'); } }),
      el('button', { class: 'ghost small', type: 'button', text: 'Copy', onclick: function () { copy('![' + c.title + '](' + location.origin + url + ')'); } })
    ]);
    return el('div', { class: 'item' }, [
      el('h3', {}, [el('span', { text: ICONS[c.id] || '🧩' }), el('div', { text: c.title }), el('span', { text: v.label })]),
      el('div', { class: 'shot' }, [el('img', { src: url, loading: 'lazy', alt: c.title + ' - ' + v.label })]),
      acts
    ]);
  }
  function customize(cardId, params) {
    state.card = cardId; state.params = clone(params || {}); state.editing = null;
    renderTiles(); setTab('play');
  }

  // ---- README builder ----------------------------------------------------------------------------
  function newCard(id, params) { return { type: 'card', card: id, params: clone(params || {}) }; }
  function newBlock(type) {
    switch (type) {
      case 'card': return newCard('stats');
      case 'row': return { type: 'row', items: [newCard('stats'), newCard('languages')] };
      case 'heading': return { type: 'heading', text: 'About me', level: 2, align: 'left' };
      case 'text': return { type: 'text', markdown: 'Write something about yourself here.', align: 'left' };
      case 'badges': return { type: 'badges', style: 'for-the-badge', raw: 'tech:TypeScript\ntech:Python\nsocial:github:' + user(), items: [] };
      case 'divider': return { type: 'divider', style: 'wave' };
      default: return { type: 'html', html: '<!-- your own HTML -->' };
    }
  }
  function addCardBlock(id, params) { builder.spec.blocks.push(newCard(id, params)); renderBlocks(); scheduleBuild(); }
  function parseBadges(raw) {
    return String(raw || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var p = l.split(':'); var kind = p[0].toLowerCase();
      if (kind === 'stat') return { kind: 'stat', name: p[1] };
      if (kind === 'tech') return { kind: 'tech', name: p.slice(1).join(':') };
      if (kind === 'social') return { kind: 'social', name: (p[1] || '').toLowerCase(), handle: p.slice(2).join(':') };
      if (kind === 'custom') return { kind: 'custom', label: p[1], message: p[2], color: p[3] };
      return null;
    }).filter(Boolean);
  }
  function payload() {
    var s = builder.spec;
    var blocks = s.blocks.map(function (b) {
      var o = clone(b);
      if (o.type === 'badges') { o.items = parseBadges(o.raw); delete o.raw; }
      return o;
    });
    return { username: user(), theme: state.theme, dark: s.dark || '', align: s.align, footer: s.footer, params: s.params, blocks: blocks };
  }
  function save() {
    try { localStorage.setItem('gp-builder', JSON.stringify({ presetId: builder.presetId, host: builder.host, spec: builder.spec })); } catch (e) { /* storage unavailable */ }
  }
  function scheduleBuild() { clearTimeout(buildTimer); buildTimer = setTimeout(build, 300); save(); }
  function previewDoc(html) {
    var dark = previewMode === 'dark';
    var css = 'body{margin:0;padding:24px;font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:' + (dark ? '#e6edf3' : '#1f2328') + ';background:' + (dark ? '#0d1117' : '#fff') + '}' +
      'img{max-width:100%;height:auto}h1,h2{border-bottom:1px solid ' + (dark ? '#30363d' : '#d0d7de') + ';padding-bottom:.3em}a{color:' + (dark ? '#58a6ff' : '#0969da') + '}' +
      'code{background:' + (dark ? '#161b22' : '#eff1f3') + ';padding:.2em .4em;border-radius:6px}details{margin:8px 0}';
    return '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' + html + '</body></html>';
  }
  function build() {
    if (state.tab !== 'builder') return;
    var url = '/api/readme?format=json' + (builder.host ? '&base=' + encodeURIComponent(builder.host) : '');
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var err = $('build-err');
        if (j.error) { err.textContent = j.error.message; err.classList.remove('hidden'); return; }
        err.classList.add('hidden');
        builder.md = j.markdown; builder.html = j.html;
        if (!builder.manual) $('md').value = j.markdown;
        $('frame').srcdoc = previewDoc(j.html);
      })
      .catch(function () { var err = $('build-err'); err.textContent = 'Could not reach the API.'; err.classList.remove('hidden'); });
  }
  function move(i, d) {
    var b = builder.spec.blocks, j = i + d;
    if (j < 0 || j >= b.length) return;
    var t = b[i]; b[i] = b[j]; b[j] = t;
    renderBlocks(); scheduleBuild();
  }
  function cardOptions(selected) {
    return meta.cards.map(function (c) { var o = el('option', { value: c.id, text: c.title }); if (c.id === selected) o.selected = true; return o; });
  }
  function labelled(text, control) { return el('div', {}, [el('label', { text: text }), control]); }
  function selectOf(options, value, onchange) {
    var s = el('select');
    options.forEach(function (o) { var opt = el('option', { value: o[0], text: o[1] }); s.appendChild(opt); });
    s.value = value === undefined ? options[0][0] : value;
    s.addEventListener('change', function () { onchange(s.value); });
    return s;
  }
  var ALIGN_OPTS = [['', 'Inherit'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right']];

  // one card (used by card blocks and by each item of a row)
  function cardEditor(item, onchange, onremove, index) {
    var paramsInput = el('input', { type: 'text', value: paramsToText(item.params), spellcheck: 'false', placeholder: 'layout=compact&show_icons=true' });
    paramsInput.addEventListener('input', function () { item.params = textToParams(paramsInput.value); onchange(); });
    var variantSel = el('select');
    var fillVariants = function () {
      variantSel.innerHTML = '';
      variantSel.appendChild(el('option', { value: '', text: 'Style presets...' }));
      var d = cardDef(item.card);
      (d ? d.variants : []).forEach(function (v, i) { variantSel.appendChild(el('option', { value: String(i), text: v.label })); });
    };
    fillVariants();
    variantSel.addEventListener('change', function () {
      if (variantSel.value === '') return;
      var v = cardDef(item.card).variants[Number(variantSel.value)];
      item.params = clone(v.params || {}); paramsInput.value = paramsToText(item.params); variantSel.value = ''; onchange();
    });
    var cardSel = el('select'); cardOptions(item.card).forEach(function (o) { cardSel.appendChild(o); });
    cardSel.addEventListener('change', function () { item.card = cardSel.value; item.params = {}; paramsInput.value = ''; fillVariants(); onchange(); });
    var more = el('details', {}, [
      el('summary', { class: 'note', text: 'Size, link and alt text' }),
      el('div', { class: 'grid2', style: 'margin-top:8px' }, [
        labelled('Width (px)', (function () { var i = el('input', { type: 'number', min: '40', max: '1200', value: item.width || '' }); i.addEventListener('input', function () { item.width = i.value ? Number(i.value) : undefined; onchange(); }); return i; })()),
        labelled('Link to', (function () { var i = el('input', { type: 'text', value: item.link || '', placeholder: 'https://...' }); i.addEventListener('input', function () { item.link = i.value.trim() || undefined; onchange(); }); return i; })()),
        labelled('Alt text', (function () { var i = el('input', { type: 'text', value: item.alt || '' }); i.addEventListener('input', function () { item.alt = i.value || undefined; onchange(); }); return i; })())
      ])
    ]);
    var btns = el('div', { class: 'btnrow' }, [
      el('button', { class: 'ghost small', type: 'button', text: 'Edit in playground', onclick: function () { editInPlayground(item, index); } })
    ]);
    if (onremove) btns.appendChild(el('button', { class: 'ghost small danger', type: 'button', text: 'Remove', onclick: onremove }));
    return [el('div', { class: 'grid2' }, [labelled('Card', cardSel), labelled('Style', variantSel)]), labelled('Options (query string)', paramsInput), more, btns];
  }
  function editInPlayground(item, blockIndex) {
    state.card = cardDef(item.card).id; state.params = clone(item.params || {}); state.editing = blockIndex;
    // remember which item of a row is being edited
    state.editingItem = item;
    renderTiles(); setTab('play');
  }

  function blockBody(b, i) {
    var change = function () { subFor(i); scheduleBuild(); };
    var alignSel = function () { return labelled('Alignment', selectOf(ALIGN_OPTS, b.align || '', function (v) { b.align = v || undefined; change(); })); };
    switch (b.type) {
      case 'card': return cardEditor(b, change, null, i).concat([alignSel()]);
      case 'row': {
        var out = [];
        b.items.forEach(function (it, k) {
          out.push(el('div', { class: 'item-edit' }, [el('div', { class: 'note', text: 'Card ' + (k + 1) })].concat(cardEditor(it, change, b.items.length > 1 ? function () { b.items.splice(k, 1); renderBlocks(); scheduleBuild(); } : null, i))));
        });
        if (b.items.length < 4) out.push(el('button', { class: 'ghost small', type: 'button', text: '＋ Add card to row', onclick: function () { b.items.push(newCard('streak')); renderBlocks(); scheduleBuild(); } }));
        out.push(alignSel());
        return out;
      }
      case 'heading': {
        var t = el('input', { type: 'text', value: b.text }); t.addEventListener('input', function () { b.text = t.value; change(); });
        return [labelled('Text', t), el('div', { class: 'grid2' }, [
          labelled('Level', selectOf([['1', 'H1'], ['2', 'H2'], ['3', 'H3'], ['4', 'H4']], String(b.level || 2), function (v) { b.level = Number(v); change(); })),
          labelled('Alignment', selectOf(ALIGN_OPTS.slice(1), b.align || 'left', function (v) { b.align = v; change(); }))])];
      }
      case 'text': {
        var ta = el('textarea', { spellcheck: 'false' }); ta.value = b.markdown; ta.addEventListener('input', function () { b.markdown = ta.value; change(); });
        return [labelled('Markdown', ta), labelled('Alignment', selectOf(ALIGN_OPTS.slice(1), b.align || 'left', function (v) { b.align = v; change(); }))];
      }
      case 'badges': {
        var bt = el('textarea', { spellcheck: 'false', rows: '5' }); bt.value = b.raw || ''; bt.addEventListener('input', function () { b.raw = bt.value; change(); });
        return [labelled('One badge per line', bt),
          el('div', { class: 'note', text: 'stat:stars  ·  tech:TypeScript  ·  social:twitter:handle  ·  social:website:https://you.dev  ·  custom:Label:Message:ff0000' }),
          el('div', { class: 'grid2' }, [
            labelled('Style', selectOf([['for-the-badge', 'For the badge'], ['flat', 'Flat'], ['flat-square', 'Flat square'], ['plastic', 'Plastic']], b.style || 'for-the-badge', function (v) { b.style = v; change(); })),
            labelled('Alignment', selectOf(ALIGN_OPTS, b.align || '', function (v) { b.align = v || undefined; change(); }))])];
      }
      case 'divider':
        return [el('div', { class: 'grid2' }, [
          labelled('Style', selectOf(['wave', 'dots', 'line', 'gradient', 'dashed', 'stars'].map(function (s) { return [s, s]; }), b.style || 'wave', function (v) { b.style = v; change(); })),
          labelled('Alignment', selectOf(ALIGN_OPTS.slice(1), b.align || 'center', function (v) { b.align = v; change(); }))])];
      default: {
        var h = el('textarea', { spellcheck: 'false' }); h.value = b.html; h.addEventListener('input', function () { b.html = h.value; change(); });
        return [labelled('HTML (used as-is in the file)', h)];
      }
    }
  }
  function subFor(i) {
    var b = builder.spec.blocks[i]; var node = document.querySelector('[data-blk="' + i + '"] .sub'); if (!node || !b) return;
    node.textContent = b.type === 'card' ? b.card : b.type === 'row' ? b.items.map(function (x) { return x.card; }).join(' + ') : b.type === 'heading' ? b.text : b.type === 'text' ? b.markdown.slice(0, 40) : '';
  }
  function blockEl(b, i) {
    var handle = el('span', { class: 'handle', title: 'Drag to reorder', text: '⠿' });
    var head = el('header', {}, [
      handle,
      el('span', { class: 'name', text: (i + 1) + '. ' + BLOCK_LABELS[b.type] }),
      el('span', { class: 'sub' }),
      el('button', { class: 'ghost small', type: 'button', title: 'Move up', text: '▲', onclick: function () { move(i, -1); } }),
      el('button', { class: 'ghost small', type: 'button', title: 'Move down', text: '▼', onclick: function () { move(i, 1); } }),
      el('button', { class: 'ghost small', type: 'button', title: 'Duplicate', text: '⧉', onclick: function () { builder.spec.blocks.splice(i + 1, 0, clone(b)); renderBlocks(); scheduleBuild(); } }),
      el('button', { class: 'ghost small danger', type: 'button', title: 'Remove', text: '✕', onclick: function () { builder.spec.blocks.splice(i, 1); renderBlocks(); scheduleBuild(); } })
    ]);
    var node = el('div', { class: 'blk', 'data-blk': String(i) }, [head, el('div', { class: 'body' }, blockBody(b, i))]);
    handle.addEventListener('mousedown', function () { node.draggable = true; });
    node.addEventListener('dragstart', function (e) { dragFrom = i; try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); } catch (x) { /* ignore */ } });
    node.addEventListener('dragend', function () { node.draggable = false; dragFrom = -1; Array.prototype.forEach.call(document.querySelectorAll('.blk.over'), function (n) { n.classList.remove('over'); }); });
    node.addEventListener('dragover', function (e) { if (dragFrom >= 0) { e.preventDefault(); node.classList.add('over'); } });
    node.addEventListener('dragleave', function () { node.classList.remove('over'); });
    node.addEventListener('drop', function (e) {
      e.preventDefault();
      if (dragFrom < 0 || dragFrom === i) return;
      var arr = builder.spec.blocks, item = arr.splice(dragFrom, 1)[0];
      arr.splice(i, 0, item); dragFrom = -1; renderBlocks(); scheduleBuild();
    });
    setTimeout(function () { subFor(i); }, 0);
    return node;
  }
  function renderBlocks() {
    var box = $('blocks'); box.innerHTML = '';
    builder.spec.blocks.forEach(function (b, i) { box.appendChild(blockEl(b, i)); });
    if (!builder.spec.blocks.length) box.appendChild(el('div', { class: 'empty', text: 'No blocks yet. Add one below or load a preset.' }));
    $('dark').value = builder.spec.dark || '';
    $('align').value = builder.spec.align || 'center';
    $('footer').checked = !!builder.spec.footer;
    $('host').value = builder.host || '';
  }
  function loadPreset(id, silent) {
    var p = presets.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    builder.presetId = id; builder.spec.blocks = clone(p.blocks); builder.manual = false;
    $('manual-note').classList.add('hidden');
    if (p.theme) { state.theme = p.theme; renderThemes(); }
    $('preset').value = id; $('preset-desc').textContent = p.description;
    renderBlocks(); scheduleBuild();
    if (!silent) toast('Loaded "' + p.title + '"');
  }
  function fetchPresets() {
    return fetch('/api/presets?username=' + encodeURIComponent(user())).then(function (r) { return r.json(); }).then(function (j) {
      presets = j.presets;
      var sel = $('preset'); sel.innerHTML = '';
      presets.forEach(function (p) { sel.appendChild(el('option', { value: p.id, text: p.title })); });
    });
  }
  function resetBuilder() {
    if (builder.spec.blocks.length && !confirm('Discard your changes and restore the "' + builder.presetId + '" preset?')) return;
    builder.spec = { dark: '', align: 'center', footer: false, params: {}, blocks: [] }; builder.host = '';
    try { localStorage.removeItem('gp-builder'); } catch (e) { /* ignore */ }
    fetchPresets().then(function () { loadPreset(builder.presetId, true); renderParams(); toast('Builder reset'); });
  }
  function initBuilderControls() {
    var darkSel = $('dark'); darkSel.appendChild(el('option', { value: '', text: 'Same as light' }));
    Object.keys(themes).forEach(function (n) { darkSel.appendChild(el('option', { value: n, text: n })); });
    darkSel.addEventListener('change', function () { builder.spec.dark = darkSel.value; scheduleBuild(); });
    $('align').addEventListener('change', function (e) { builder.spec.align = e.target.value; scheduleBuild(); });
    $('footer').addEventListener('change', function (e) { builder.spec.footer = e.target.checked; scheduleBuild(); });
    $('host').addEventListener('input', function (e) { builder.host = e.target.value.trim(); scheduleBuild(); });
    $('preset').addEventListener('change', function () { var p = presets.filter(function (x) { return x.id === $('preset').value; })[0]; if (p) $('preset-desc').textContent = p.description; });
    $('load-preset').addEventListener('click', function () {
      if (builder.spec.blocks.length && !confirm('Replace your current blocks with this preset?')) return;
      fetchPresets().then(function () { loadPreset($('preset').value); });
    });
    $('b-reset').addEventListener('click', resetBuilder);
    $('b-clear').addEventListener('click', function () { if (!builder.spec.blocks.length || confirm('Remove every block?')) { builder.spec.blocks = []; renderBlocks(); scheduleBuild(); } });
    var bar = $('addbar');
    Object.keys(BLOCK_LABELS).forEach(function (t) {
      bar.appendChild(el('button', { class: 'ghost', type: 'button', text: '＋ ' + BLOCK_LABELS[t], onclick: function () { builder.spec.blocks.push(newBlock(t)); renderBlocks(); scheduleBuild(); } }));
    });
    var showOut = function (which) {
      $('pane-preview').classList.toggle('hidden', which !== 'preview'); $('pane-md').classList.toggle('hidden', which !== 'md');
      $('out-preview').className = which === 'preview' ? 'on' : ''; $('out-md').className = which === 'md' ? 'on' : '';
    };
    $('out-preview').addEventListener('click', function () { showOut('preview'); });
    $('out-md').addEventListener('click', function () { showOut('md'); });
    $('md').addEventListener('input', function () { builder.manual = true; $('manual-note').classList.remove('hidden'); });
    $('regen').addEventListener('click', function () { builder.manual = false; $('manual-note').classList.add('hidden'); $('md').value = builder.md; });
    $('b-copy').addEventListener('click', function () { copy($('md').value, 'README copied'); });
    $('b-download').addEventListener('click', function () { download('README.md', $('md').value); });
    $('b-share').addEventListener('click', function () { copy(location.origin + '/#tab=builder&spec=' + b64u(payload()), 'Share link copied'); });
    $('b-raw').addEventListener('click', function () { window.open('/api/readme?spec=' + b64u(payload()) + (builder.host ? '&base=' + encodeURIComponent(builder.host) : ''), '_blank'); });
    Array.prototype.forEach.call(document.querySelectorAll('.pvbtn'), function (b) {
      b.addEventListener('click', function () { previewMode = b.dataset.pv; if (builder.html) $('frame').srcdoc = previewDoc(builder.html); });
    });
  }

  // ---- boot ----------------------------------------------------------------------------------------
  function restoreBuilder() {
    var h = parseQs(location.hash);
    if (h.spec) {
      try {
        var s = unb64u(h.spec);
        builder.spec = { dark: s.dark || '', align: s.align || 'center', footer: !!s.footer, params: s.params || {}, blocks: (s.blocks || []).map(function (b) { if (b.type === 'badges') b.raw = (b.items || []).map(function (x) { return x.kind === 'stat' ? 'stat:' + x.name : x.kind === 'tech' ? 'tech:' + x.name : x.kind === 'social' ? 'social:' + x.name + ':' + (x.handle || '') : 'custom:' + (x.label || '') + ':' + (x.message || '') + ':' + (x.color || ''); }).join('\n'); return b; }) };
        if (s.username) state.username = s.username;
        if (s.theme) state.theme = s.theme;
        return true;
      } catch (e) { /* fall through */ }
    }
    try {
      var saved = JSON.parse(localStorage.getItem('gp-builder') || 'null');
      if (saved && saved.spec && saved.spec.blocks) { builder.spec = saved.spec; builder.presetId = saved.presetId || 'classic'; builder.host = saved.host || ''; return true; }
    } catch (e) { /* ignore */ }
    return false;
  }

  fetch('/api/cards').then(function (r) { return r.json(); }).then(function (m) {
    meta = m;
    return fetch('/api/themes').then(function (r) { return r.json(); });
  }).then(function (t) {
    themes = t;
    var h = parseQs(location.hash);
    if (h.username) state.username = h.username;
    if (h.theme) state.theme = h.theme;
    if (h.card && cardDef(h.card)) state.card = cardDef(h.card).id;
    var reserved = { tab: 1, username: 1, theme: 1, card: 1, spec: 1 };
    for (var k in h) if (!reserved[k]) state.params[k] = h[k];
    var restored = restoreBuilder();
    $('username').value = state.username;
    initBuilderControls();
    renderTiles(); renderThemes(); renderCats();
    return fetchPresets().then(function () {
      if (!restored) loadPreset(builder.presetId, true);
      else { $('preset').value = builder.presetId; var p = presets.filter(function (x) { return x.id === builder.presetId; })[0]; if (p) $('preset-desc').textContent = p.description; }
      var tab = h.tab === 'store' || h.tab === 'builder' ? h.tab : h.spec ? 'builder' : 'play';
      setTab(tab);
    });
  });

  // ---- events --------------------------------------------------------------------------------------
  $('username').addEventListener('input', function (e) {
    state.username = e.target.value;
    if (state.tab === 'play') scheduleUpdate(); else if (state.tab === 'store') { clearTimeout(timer); timer = setTimeout(renderStore, 400); } else scheduleBuild();
  });
  ['play', 'store', 'builder'].forEach(function (t) { $('tab-' + t).addEventListener('click', function () { setTab(t); }); });
  $('reset').addEventListener('click', resetCurrent);
  $('surprise').addEventListener('click', surprise);
  $('q').addEventListener('input', function (e) { state.q = e.target.value; renderStore(); });
  $('clear-filters').addEventListener('click', function () { state.q = ''; state.cat = 'all'; $('q').value = ''; renderCats(); renderStore(); });
  $('copy-url').addEventListener('click', function () { copy($('url').textContent); });
  $('copy-md').addEventListener('click', function () { copy('![' + currentCard().title + '](' + $('url').textContent + ')'); });
  $('copy-html').addEventListener('click', function () { copy('<img src="' + $('url').textContent + '" alt="' + currentCard().title + '" />'); });
  $('copy-text').addEventListener('click', function () { copy($('text').textContent); });
  $('open').addEventListener('click', function () { window.open($('url').textContent, '_blank'); });
  $('add-readme').addEventListener('click', function () { addCardBlock(state.card, clone(state.params)); toast('Added to your README'); });
  $('update-block').addEventListener('click', function () {
    var b = builder.spec.blocks[state.editing]; if (!b) return;
    var target = state.editingItem || b;
    target.card = state.card; target.params = clone(state.params);
    state.editing = null; state.editingItem = null; renderBlocks(); scheduleBuild(); setTab('builder'); toast('Block updated');
  });
  $('editing-cancel').addEventListener('click', function () { state.editing = null; state.editingItem = null; update(); });
  Array.prototype.forEach.call(document.querySelectorAll('.bgbtn'), function (b) {
    b.addEventListener('click', function () { $('stage').className = 'stage ' + b.dataset.bg; });
  });
  var root = document.documentElement;
  $('scheme').addEventListener('click', function () {
    var next = root.dataset.scheme === 'light' ? 'dark' : 'light';
    root.dataset.scheme = next;
    try { localStorage.setItem('gp-scheme', next); } catch (e) { /* ignore */ }
  });
  try { var saved = localStorage.getItem('gp-scheme'); if (saved) root.dataset.scheme = saved; else if (matchMedia('(prefers-color-scheme: light)').matches) root.dataset.scheme = 'light'; } catch (e) { /* ignore */ }
})();
`;
