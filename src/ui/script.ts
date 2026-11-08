/**
 * Client script for the page. It is embedded in a template literal (String.raw), so it must not
 * contain backticks, `${`, or a closing script tag. Everything user-controlled goes through
 * textContent/attributes (never innerHTML); the README preview renders inside a sandboxed iframe.
 */
export const SCRIPT = String.raw`
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  // line icons by card category (24x24 grid, drawn with currentColor); static markup only
  var SVG_ICONS = {
    overview: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    activity: '<polyline points="3 13 7 13 10 5 14 19 17 11 21 11"/>',
    languages: '<path d="M4 7h10M9 4v3M6 12c2 3 5 5 8 6M12 7c-1 4-4 8-8 10"/><path d="M13 20l4-9 4 9M14.5 17h5"/>',
    repositories: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"/><path d="M5 16a2 2 0 0 1 2-2h11"/>',
    achievements: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8"/>',
    art: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="9" r="1"/><circle cx="15.5" cy="14" r="1"/>',
    decor: '<path d="M3 10c3-4 6-4 9 0s6 4 9 0"/><path d="M3 16c3-4 6-4 9 0s6 4 9 0"/>',
    utility: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
    integrations: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    designs: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>',
    up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  function icon(name, size) {
    var s = el('span', { class: 'ic', 'aria-hidden': 'true' });
    var n = size || 16;
    s.innerHTML = '<svg viewBox="0 0 24 24" width="' + n + '" height="' + n + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (SVG_ICONS[name] || SVG_ICONS.overview) + '</svg>';
    return s;
  }
  function human(n) { var t = String(n).replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); }
  var GROUPS = [['colors', 'Colours'], ['layout', 'Layout and size'], ['typography', 'Text'], ['effects', 'Effects'], ['data', 'Data and output']];
  // UI-only style bundles: they just set ordinary parameters
  var STYLE_PRESETS = {
    Flat: { hide_border: 'true' },
    Outline: { card_style: 'outline', bg_opacity: '0' },
    Glass: { card_style: 'glass', bg_pattern: 'dots' },
    Elevated: { card_style: 'elevated', radius: '14' },
    Gradient: { card_style: 'gradient', title_gradient: 'true' },
    Neon: { card_style: 'neon', glow: 'true', theme: 'synthwave' },
    Soft: { card_style: 'soft', bg_pattern: 'topo', radius: '16' },
    Minimal: { hide_border: 'true', hide_subtitle: 'true', padding: '16' },
    Large: { width: '720', text_scale: '110' }
  };

  var CATS = { overview: 'Overview', activity: 'Activity', languages: 'Languages', repositories: 'Repositories', achievements: 'Achievements', art: 'Art', decor: 'Decor', utility: 'Utility', integrations: 'Integrations', designs: 'Designs' };
  var SPECIAL = { username: 1, theme: 1, format: 1, cache_seconds: 1 };
  var BLOCK_LABELS = { card: 'Card', row: 'Row of cards', heading: 'Heading', text: 'Text', badges: 'Badges', divider: 'Divider', html: 'HTML' };
  var meta, themes, presets = [], timer, buildTimer, previewMode = 'light', dragFrom = -1;
  var state = { tab: 'play', card: 'stats', username: 'torvalds', theme: 'default', params: {}, editing: null, q: '', cat: 'all', pickCat: 'all' };
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
      return el('label', { class: 'f', text: human(p.name), for: 'p_' + p.name });
    };
    var cur = store.get(p);
    var shown = cur === '' || cur === undefined ? (p.default === undefined ? '' : p.default) : cur;

    if (p.type === 'boolean') {
      var input = el('input', { type: 'checkbox', id: 'p_' + p.name });
      input.checked = String(shown) === 'true';
      input.addEventListener('change', function () { store.set(p, input.checked ? 'true' : 'false'); });
      return el('div', { class: 'row' }, [
        el('div', { class: 'rowtxt' }, [el('label', { for: 'p_' + p.name, text: human(p.name) }), el('div', { class: 'help', text: plain(p.description) })]),
        el('span', { class: 'switch' }, [input, el('span')])
      ]);
    }
    box.appendChild(head());
    if (p.description) box.appendChild(el('div', { class: 'help', text: plain(p.description) }));

    if (p.type === 'enum' && p.options && p.options.length <= 5) {
      var seg = el('div', { class: 'seg', role: 'group', 'aria-label': p.name });
      p.options.forEach(function (o) {
        var b = el('button', { text: o, type: 'button', class: String(shown) === o ? 'on' : '', 'aria-pressed': String(String(shown) === o) });
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(seg.children, function (x) { x.className = ''; x.setAttribute('aria-pressed', 'false'); });
          b.className = 'on'; b.setAttribute('aria-pressed', 'true'); store.set(p, o);
        });
        seg.appendChild(b);
      });
      box.appendChild(seg);
    } else if (p.type === 'enum') {
      var sel = el('select', { id: 'p_' + p.name });
      p.options.forEach(function (o) { sel.appendChild(el('option', { value: o, text: o })); });
      sel.value = String(shown);
      sel.addEventListener('change', function () { store.set(p, sel.value); });
      box.appendChild(sel);
    } else if (p.type === 'number' && p.min !== undefined && p.max !== undefined) {
      var val = el('span', { class: 'val', text: String(shown === '' ? '-' : shown) });
      var range = el('input', { type: 'range', min: p.min, max: p.max, step: p.step || 1, id: 'p_' + p.name });
      range.value = shown === '' ? p.min : shown;
      range.setAttribute('aria-valuetext', String(shown === '' ? 'default' : shown));
      range.addEventListener('input', function () { val.textContent = range.value; range.setAttribute('aria-valuetext', range.value); store.set(p, range.value); });
      var clear = el('button', { type: 'button', class: 'ghost small clr', title: 'Back to default', text: '×' });
      clear.addEventListener('click', function () { store.set(p, ''); val.textContent = String(p.default === undefined ? '-' : p.default); range.value = p.default === undefined ? p.min : p.default; });
      box.firstChild.appendChild(val);
      box.appendChild(el('div', { class: 'rangerow' }, [range, clear]));
    } else if (p.type === 'color') {
      var text = el('input', { type: 'text', placeholder: 'e.g. 1f6feb or 135,7f5af0,2cb67d', spellcheck: 'false', id: 'p_' + p.name });
      text.value = cur === undefined ? '' : cur;
      var pick = el('input', { type: 'color' });
      text.addEventListener('input', function () { store.set(p, text.value.trim()); if (/^#?[0-9a-f]{6}$/i.test(text.value)) pick.value = '#' + text.value.replace('#', ''); });
      pick.addEventListener('input', function () { text.value = pick.value.slice(1); store.set(p, text.value); });
      box.appendChild(el('div', { class: 'color' }, [pick, text]));
    } else if (p.type === 'list' && /_colors$/.test(p.name)) {
      var lt = el('input', { type: 'text', spellcheck: 'false', autocomplete: 'off', id: 'p_' + p.name, placeholder: 'e.g. 0e4429,006d32,26a641,39d353' });
      lt.value = cur === undefined ? '' : cur;
      var sw = el('div', { class: 'swatches' });
      var paint = function () {
        sw.innerHTML = '';
        lt.value.split(',').forEach(function (c) { c = c.trim().replace('#', ''); if (/^[0-9a-f]{3,8}$/i.test(c)) { var d = el('i'); d.style.background = '#' + c; sw.appendChild(d); } });
      };
      paint();
      lt.addEventListener('input', function () { paint(); store.set(p, lt.value.replace(/#/g, '').replace(/\s/g, '')); });
      box.appendChild(lt);
      box.appendChild(sw);
    } else {
      var inp = el('input', { type: p.type === 'number' ? 'number' : 'text', spellcheck: 'false', autocomplete: 'off', id: 'p_' + p.name });
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
    if (tab === 'builder') { renderBlocks(); renderDesigns(); build(); }
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
    var q = ($('card-search').value || '').toLowerCase().trim();
    var cats = $('card-cats'); cats.innerHTML = '';
    ['all'].concat(Object.keys(CATS)).forEach(function (k) {
      if (k !== 'all' && !meta.cards.some(function (c) { return c.category === k; })) return;
      var bt = el('button', { class: state.pickCat === k || (!state.pickCat && k === 'all') ? 'on' : '', type: 'button', text: k === 'all' ? 'All' : CATS[k] });
      bt.addEventListener('click', function () { state.pickCat = k; renderTiles(); });
      cats.appendChild(bt);
    });
    var shown = meta.cards.filter(function (c) {
      if (state.pickCat && state.pickCat !== 'all' && c.category !== state.pickCat) return false;
      if (!q) return true;
      return (c.title + ' ' + c.id + ' ' + c.tags.join(' ') + ' ' + c.aliases.join(' ')).toLowerCase().indexOf(q) >= 0;
    });
    $('card-count').textContent = shown.length === meta.cards.length ? String(shown.length) : shown.length + ' of ' + meta.cards.length;
    if (!shown.length) box.appendChild(el('div', { class: 'note', text: 'No card matches that search.', style: 'padding:16px 10px' }));
    Object.keys(CATS).forEach(function (k) {
      var inCat = shown.filter(function (c) { return c.category === k; });
      if (!inCat.length) return;
      box.appendChild(el('div', { class: 'grphd', text: CATS[k] }));
      inCat.forEach(function (c) {
        var t = el('button', { class: 'tile' + (c.id === state.card ? ' on' : ''), type: 'button', title: c.description }, [document.createTextNode(c.title)]);
        if (c.id === state.card) t.setAttribute('aria-current', 'true');
        t.addEventListener('click', function () { selectCard(c.id, true); });
        box.appendChild(t);
      });
    });
  }
  function renderThemes() {
    var box = $('themes'); box.innerHTML = '';
    $('sys-theme').checked = state.theme === 'auto';
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
  var themeBeforeAuto = 'default';
  $('sys-theme').addEventListener('change', function (e) {
    if (e.target.checked) { if (state.theme !== 'auto') themeBeforeAuto = state.theme; state.theme = 'auto'; } else state.theme = themeBeforeAuto;
    renderThemes(); onThemeChange();
  });
  function plain(t) { return String(t).split(String.fromCharCode(96)).join(''); }
  function onThemeChange() { if (state.tab === 'play') scheduleUpdate(); else if (state.tab === 'store') renderStore(); else scheduleBuild(); saveHash(); }
  function renderParams() {
    var common = $('common-params'); common.innerHTML = '';
    var store = state.tab === 'builder' ? globalStore : playStore;
    var target = state.tab === 'builder' ? function () { return builder.spec.params; } : function () { return state.params; };
    var presets = el('div', { class: 'seg presets', role: 'group', 'aria-label': 'Style presets' });
    Object.keys(STYLE_PRESETS).forEach(function (name) {
      presets.appendChild(el('button', { type: 'button', text: name, title: 'Apply the ' + name + ' style', onclick: function () {
        var o = target(), bundle = STYLE_PRESETS[name];
        for (var k in bundle) { if (k === 'theme') { state.theme = bundle[k]; renderThemes(); } else o[k] = bundle[k]; }
        renderParams(); if (state.tab === 'builder') scheduleBuild(); else scheduleUpdate();
        toast(name + ' style applied');
      } }));
    });
    common.appendChild(el('div', { class: 'looks-title', text: 'Quick styles' }));
    common.appendChild(presets);
    var open = {};
    try { open = JSON.parse(localStorage.getItem('gp-groups') || '{"colors":true,"layout":true}'); } catch (e) { open = { colors: true, layout: true }; }
    GROUPS.forEach(function (g) {
      var params = meta.common.filter(function (p) { return !SPECIAL[p.name] && (p.group || 'data') === g[0]; });
      if (!params.length) return;
      var det = el('details', { class: 'grp' }, [el('summary', { text: g[1] })]);
      if (open[g[0]]) det.open = true;
      det.addEventListener('toggle', function () { open[g[0]] = det.open; try { localStorage.setItem('gp-groups', JSON.stringify(open)); } catch (e) { /* ignore */ } });
      params.forEach(function (p) { det.appendChild(field(p, store)); });
      common.appendChild(det);
    });
    var box = $('card-params'); box.innerHTML = '';
    var c = currentCard();
    if (c) renderCardPanel(box, c);
  }
  // ---- per-card panel: header, looks, search, grouped options ------------------------------------
  var LOOK_RE = /^(layout|style|shape|chart|view|rank|effect|cursor_style|charset|design|chrome|avatar|align|grid|fill|scale|bar|backdrop|size|cell|gap|columns|per_line|height|width|smooth|reverse|stroke|color|ring_color|label_color|logo_color|bar_radius|line_width|equalizer|scanlines|tiles|cover|levels|data|ramp|anim|mode|speed)$/;
  var BUCKETS = [['look', 'Look'], ['content', 'Content'], ['details', 'Details']];
  function paramBucket(p) {
    if (LOOK_RE.test(p.name)) return 'look';
    if (p.type === 'boolean') return 'details';
    return 'content';
  }
  function cardParamNames(c) { var o = {}; c.params.forEach(function (p) { o[p.name] = 1; }); return o; }
  function lookMatches(v) {
    var vp = v.params || {};
    for (var k in vp) { if (k === 'theme') { if (state.theme !== vp[k]) return false; } else if (String(state.params[k]) !== String(vp[k])) return false; }
    return true;
  }
  function applyLook(v) {
    var keep = {};
    meta.common.forEach(function (p) { if (state.params[p.name] !== undefined) keep[p.name] = state.params[p.name]; });
    state.params = keep;
    var vp = v.params || {};
    for (var k in vp) { if (k === 'theme') { state.theme = vp[k]; renderThemes(); } else state.params[k] = vp[k]; }
    renderParams(); update();
  }
  function renderCardPanel(box, c) {
    var names = cardParamNames(c);
    var changed = Object.keys(state.params).filter(function (k) { return names[k]; }).length;
    var head = el('div', { class: 'cardhead' }, [
      el('span', { class: 'ico' }, [icon(c.category, 20)]),
      el('div', { class: 'ct' }, [
        el('b', { text: c.title }),
        el('span', { class: 'cs', text: c.params.length + ' options, ' + c.variants.length + ' looks' + (c.needsUser === false ? ', no username needed' : '') })
      ]),
      el('button', { class: 'ghost small', type: 'button', text: 'Reset' + (changed ? ' (' + changed + ')' : ''), title: 'Clear this card’s options', disabled: changed ? null : 'true', onclick: function () {
        Object.keys(names).forEach(function (k) { delete state.params[k]; });
        renderParams(); update();
      } })
    ]);
    box.appendChild(head);
    box.appendChild(el('div', { class: 'cardnote', text: c.description }));

    if (c.variants.length > 1) {
      box.appendChild(el('div', { class: 'looks-title', text: 'Looks' }));
      var looks = el('div', { class: 'looks', role: 'group', 'aria-label': 'Looks for ' + c.title });
      c.variants.forEach(function (v) {
        var b = el('button', { type: 'button', class: 'look' + (lookMatches(v) ? ' on' : ''), text: v.label, onclick: function () { applyLook(v); } });
        b.setAttribute('aria-pressed', lookMatches(v) ? 'true' : 'false');
        looks.appendChild(b);
      });
      box.appendChild(looks);
    }

    var fields = [];
    var search = el('input', { type: 'search', class: 'optsearch', placeholder: 'Search ' + c.params.length + ' options…', 'aria-label': 'Search card options', autocomplete: 'off' });
    if (c.params.length > 6) box.appendChild(search);
    var sections = [];
    BUCKETS.forEach(function (bk) {
      var ps = c.params.filter(function (p) { return paramBucket(p) === bk[0]; });
      if (!ps.length) return;
      var det = el('details', { class: 'grp', open: bk[0] === 'details' && ps.length > 4 ? null : 'true' }, [el('summary', { text: bk[1] + ' (' + ps.length + ')' })]);
      ps.forEach(function (p) { var node = field(p, playStore); det.appendChild(node); fields.push({ p: p, node: node, det: det }); });
      box.appendChild(det);
      sections.push(det);
    });
    search.addEventListener('input', function () {
      var q = search.value.toLowerCase().trim();
      fields.forEach(function (f) { f.node.style.display = !q || (f.p.name + ' ' + (f.p.description || '')).toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
      sections.forEach(function (d) {
        var any = fields.some(function (f) { return f.det === d && f.node.style.display !== 'none'; });
        d.style.display = any ? '' : 'none';
        if (q && any) d.open = true;
      });
    });
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
    img.onload = function () { img.classList.remove('loading'); };
    img.onerror = function () { img.classList.remove('loading'); toast('Could not load the preview. Check your connection and try again.'); };
    // the default theme is a fixed light card; in the preview it follows the app's light/dark switch (copied URLs stay as chosen)
    var dark = effectiveScheme() === 'dark';
    img.src = state.theme === 'default' && dark ? url + (url.indexOf('?') < 0 ? '?' : '&') + 'theme=github_dark'
      : state.theme === 'auto' ? url.replace('theme=auto', dark ? 'theme=github_dark' : 'theme=default') : url;
    $('url').textContent = location.origin + url;
    $('desc').textContent = c.description;
    img.alt = c.title + ' for @' + user();
    var isAscii = state.card === 'ascii';
    $('text-box').style.display = isAscii ? 'block' : 'none';
    if (isAscii) fetch(url + '&format=text').then(function (r) { return r.text(); }).then(function (t) { $('text').textContent = t; });
    var editing = state.editing !== null && builder.spec.blocks[state.editing];
    $('editing').classList.toggle('hidden', !editing);
    $('update-block').classList.toggle('hidden', !editing);
    $('add-readme').textContent = editing ? 'Add as new block' : 'Add to README';
    $('stage-title').textContent = c.title;
    if (editing) $('editing-label').textContent = 'Editing README block #' + (state.editing + 1);
    renderDefinitions();
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
      var b = el('button', { class: state.cat === k ? 'on' : '', type: 'button', text: k === 'all' ? 'All' : CATS[k] });
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
      el('button', { class: 'ghost small', type: 'button', text: 'Add to README', onclick: function () { addCardBlock(c.id, params); toast('Added to your README'); } }),
      el('button', { class: 'ghost small', type: 'button', text: 'Copy', onclick: function () { copy('![' + c.title + '](' + location.origin + url + ')'); } })
    ]);
    return el('div', { class: 'item' }, [
      el('div', { class: 'shot' }, [el('img', { src: url, loading: 'lazy', alt: c.title + ' - ' + v.label })]),
      el('div', { class: 'meta' }, [el('h3', { text: v.label }), el('span', { class: 'look-name', text: c.title })]),
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
        var warn = $('build-warn');
        warn.textContent = (j.warnings || []).join('  ');
        warn.classList.toggle('hidden', !(j.warnings && j.warnings.length));
        builder.md = j.markdown; builder.html = j.html;
        if (!builder.manual) $('md').value = j.markdown;
        $('frame').srcdoc = previewDoc(j.html);
        checkImages();
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
        if (b.items.length < 4) out.push(el('button', { class: 'ghost small', type: 'button', text: 'Add card to row', onclick: function () { b.items.push(newCard('streak')); renderBlocks(); scheduleBuild(); } }));
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
    var handle = el('span', { class: 'handle', title: 'Drag to reorder' }, [icon('grip')]);
    var head = el('header', {}, [
      handle,
      el('span', { class: 'name', text: (i + 1) + '. ' + BLOCK_LABELS[b.type] }),
      el('span', { class: 'sub' }),
      el('button', { class: 'ghost small icon', type: 'button', title: 'Move up', 'aria-label': 'Move up', onclick: function () { move(i, -1); } }, [icon('up')]),
      el('button', { class: 'ghost small icon', type: 'button', title: 'Move down', 'aria-label': 'Move down', onclick: function () { move(i, 1); } }, [icon('down')]),
      el('button', { class: 'ghost small icon', type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate', onclick: function () { builder.spec.blocks.splice(i + 1, 0, clone(b)); renderBlocks(); scheduleBuild(); } }, [icon('copy')]),
      el('button', { class: 'ghost small danger icon', type: 'button', title: 'Remove', 'aria-label': 'Remove', onclick: function () { builder.spec.blocks.splice(i, 1); renderBlocks(); scheduleBuild(); } }, [icon('x')])
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
      var designIds = DESIGN_PRESETS.map(function (d) { return d[0]; });
      presets.filter(function (p) { return designIds.indexOf(p.id) < 0; }).forEach(function (p) { sel.appendChild(el('option', { value: p.id, text: p.title })); });
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
      bar.appendChild(el('button', { class: 'ghost', type: 'button', text: BLOCK_LABELS[t], onclick: function () { builder.spec.blocks.push(newBlock(t)); renderBlocks(); scheduleBuild(); } }));
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
    $('b-zip').addEventListener('click', exportZip);
    $('b-config').addEventListener('click', function () {
      var a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(payload(), null, 2)], { type: 'application/json' })), download: 'profilefoundry.config.json' });
      document.body.appendChild(a); a.click(); a.remove();
    });
    $('b-import').addEventListener('click', function () { $('config-file').click(); });
    $('config-file').addEventListener('change', function (e) { if (e.target.files && e.target.files[0]) importConfig(e.target.files[0]); e.target.value = ''; });
    Array.prototype.forEach.call(document.querySelectorAll('.wbtn'), function (b) {
      b.addEventListener('click', function () {
        previewWidth = b.dataset.w;
        $('frame').classList.toggle('mobile', previewWidth === 'mobile');
        Array.prototype.forEach.call(document.querySelectorAll('.wbtn'), function (x) { x.setAttribute('aria-pressed', String(x === b)); x.classList.toggle('on', x === b); });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.pvbtn'), function (b) {
      b.addEventListener('click', function () {
        previewMode = b.dataset.pv; if (builder.html) $('frame').srcdoc = previewDoc(builder.html);
        Array.prototype.forEach.call(document.querySelectorAll('.pvbtn'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
  }


  // ---- README Studio: designs, validation, export ----------------------------------------------
  var DESIGN_PRESETS = [['terminal-os', 'terminal', 'Terminal OS'], ['code-studio', 'ide', 'Code Studio'], ['editorial', 'editorial', 'Editorial'], ['dev-dashboard', 'dashboard', 'Dashboard'], ['blueprint', 'blueprint', 'Blueprint'], ['retro', 'retro', 'Retro Arcade'], ['minimal-page', 'minimal', 'Minimal'], ['glass-dashboard', 'glass', 'Glass'], ['poster', 'poster', 'Poster']];
  var definitions = null, checkTimer, previewWidth = 'desktop';
  function renderDesigns() {
    var box = $('designs'); if (!box) return; box.innerHTML = '';
    DESIGN_PRESETS.forEach(function (d) {
      var img = el('img', { src: '/api/design?' + qs({ username: user(), design: d[1], hide: 'projects,languages,now', width: '420' }), alt: d[2] + ' design preview', loading: 'lazy' });
      var b = el('button', { class: 'design' + (builder.presetId === d[0] ? ' on' : ''), type: 'button', title: 'Use the ' + d[2] + ' design for the whole README' }, [img, el('span', { text: d[2] })]);
      b.addEventListener('click', function () {
        if (builder.spec.blocks.length && !confirm('Replace your current blocks with the ' + d[2] + ' design?')) return;
        fetchPresets().then(function () { loadPreset(d[0]); renderDesigns(); });
      });
      box.appendChild(b);
    });
  }
  // every hosted image in the generated Markdown/HTML: [{raw, url}] (raw = as written, url = fetchable)
  function imageUrls(md) {
    var seen = {}, out = [];
    var re = /https?:\/\/[^\s"'<>)]+\/api\/[a-z0-9-]+\?[^\s"'<>)]+/g, m;
    while ((m = re.exec(md))) {
      var raw = m[0];
      if (seen[raw]) continue;
      seen[raw] = 1;
      out.push({ raw: raw, url: raw.replace(/&amp;/g, '&') });
    }
    return out;
  }
  function checkImages() {
    var box = $('build-check'); if (!box) return;
    var list = imageUrls(builder.md || '');
    box.textContent = list.length ? 'Checking ' + list.length + ' images…' : '';
    box.className = 'note';
    clearTimeout(checkTimer);
    checkTimer = setTimeout(function () {
      Promise.all(list.map(function (it) {
        var card = (it.url.match(/\/api\/([a-z0-9-]+)/) || [])[1] || 'image';
        return fetch(it.url).then(function (r) {
          var code = r.headers.get('X-Card-Error');
          return r.ok && !code ? null : card + ': ' + (code || ('HTTP ' + r.status));
        }, function () { return card + ': unreachable (check the image host)'; });
      })).then(function (res) {
        var bad = res.filter(Boolean);
        box.textContent = bad.length ? bad.length + ' image(s) show an error card: ' + bad.slice(0, 3).join(', ') + (bad.length > 3 ? ' and ' + (bad.length - 3) + ' more' : '') : (list.length ? 'All ' + list.length + ' images render' : '');
        box.className = 'note ' + (bad.length ? 'bad' : 'good');
      });
    }, 600);
  }
  // minimal ZIP writer (stored, no compression) with CRC-32
  var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      var head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
      offset += head.length + name.length + data.length;
    });
    var size = central.reduce(function (a, p) { return a + p.length; }, 0);
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(size), u32(offset), u16(0)));
    return new Blob(parts.concat(central, [end]), { type: 'application/zip' });
  }
  function workflowYaml(assets) {
    var lines = [
      'name: Refresh ProfileFoundry cards',
      'on:',
      '  schedule:',
      "    - cron: '17 */12 * * *'",
      '  workflow_dispatch:',
      'permissions:',
      '  contents: write',
      'jobs:',
      '  refresh:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - name: Download cards (keeps the old file if a card fails)',
      '        run: |',
      '          mkdir -p assets',
      '          get() { if curl -fsSL --max-time 30 -D h.txt "$1" -o t.svg && ! grep -qi "^x-card-error" h.txt; then mv t.svg "$2"; else echo "kept $2"; fi; }'
    ];
    assets.forEach(function (a) { lines.push('          get "' + a.url.replace(/"/g, '%22') + '" "' + a.file + '"'); });
    lines.push('          rm -f h.txt t.svg',
      '      - name: Commit changes',
      '        run: |',
      '          git config user.name "github-actions[bot]"',
      '          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
      '          git add assets',
      '          git diff --cached --quiet || (git commit -m "Refresh ProfileFoundry cards" && git push)');
    return lines.join('\n') + '\n';
  }
  function exportZip() {
    var md = $('md').value;
    var list = imageUrls(md).filter(function (it) { return !/\/api\/(views|visitors|counter|view-counter|spotify|now-playing|music)\?/.test(it.url); });
    var count = {};
    var assets = list.map(function (it) {
      var card = (it.url.match(/\/api\/([a-z0-9-]+)/) || [])[1] || 'card';
      var dark = /[?&]theme=/.test(it.url) && md.indexOf('srcset="' + it.raw) >= 0 ? '-dark' : '';
      count[card] = (count[card] || 0) + 1;
      return { raw: it.raw, url: it.url, file: 'assets/' + card + (count[card] > 1 ? '-' + count[card] : '') + dark + '.svg' };
    });
    toast('Packing ' + assets.length + ' images…');
    Promise.all(assets.map(function (a) { return fetch(a.url).then(function (r) { return r.text(); }).catch(function () { return ''; }); })).then(function (svgs) {
      var local = md;
      assets.forEach(function (a) { local = local.split(a.raw).join('./' + a.file); });
      var files = [
        { name: 'README.md', data: local },
        { name: 'README.live.md', data: md },
        { name: 'profilefoundry.config.json', data: JSON.stringify(payload(), null, 2) + '\n' },
        { name: '.github/workflows/profilefoundry.yml', data: workflowYaml(assets) },
        { name: 'PROFILEFOUNDRY.txt', data: 'README.md uses the SVGs in ./assets (self-hosted).\nThe workflow in .github/workflows refreshes them twice a day; edit the cron to change that.\nREADME.live.md is the same profile served live from ' + (builder.host || location.origin) + '.\nLive-only cards (views counter, Spotify) always stay live.\nRe-open the design: Import config in the README builder and choose profilefoundry.config.json.\n' }
      ];
      assets.forEach(function (a, i) { if (svgs[i]) files.push({ name: a.file, data: svgs[i] }); });
      var link = el('a', { href: URL.createObjectURL(zip(files)), download: user() + '-profile.zip' });
      document.body.appendChild(link); link.click(); link.remove();
      toast('ZIP downloaded');
    });
  }
  function importConfig(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var s = JSON.parse(String(r.result));
        if (!s || !Array.isArray(s.blocks)) throw new Error('no blocks');
        location.hash = 'tab=builder&spec=' + b64u(s);
        restoreBuilder(); $('username').value = state.username; renderThemes(); renderBlocks(); renderParams(); build(); toast('Config imported');
      } catch (e) { toast('That file is not a ProfileFoundry config'); }
    };
    r.readAsText(file);
  }
  function renderDefinitions() {
    var box = $('defs'); if (!box) return;
    var show = function () {
      box.innerHTML = '';
      var mine = (definitions || []).filter(function (d) { return d.cards.indexOf(state.card) >= 0; });
      box.style.display = mine.length ? 'block' : 'none';
      if (!mine.length) return;
      box.appendChild(el('summary', { text: 'What these numbers mean (' + mine.length + ')' }));
      mine.forEach(function (d) {
        var tags = (d.token ? ' · needs server token' : '') + (d.estimate ? ' · estimate' : '');
        box.appendChild(el('div', { class: 'def' }, [el('b', { text: d.label }), el('span', { class: 'hint', text: ' ' + d.source + tags }), el('p', { text: d.calculation })]));
      });
    };
    if (definitions) return show();
    fetch('/api/definitions').then(function (r) { return r.json(); }).then(function (j) { definitions = j.metrics || []; show(); }, function () { definitions = []; });
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
    $('card-search').addEventListener('input', function () { renderTiles(); });
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
  // the pulse only invites the first click
  $('username').addEventListener('focus', function () { $('username').parentNode.classList.remove('attention'); });
  $('username').addEventListener('input', function (e) {
    state.username = e.target.value;
    if (state.tab === 'play') scheduleUpdate(); else if (state.tab === 'store') { clearTimeout(timer); timer = setTimeout(renderStore, 400); } else { scheduleBuild(); clearTimeout(checkTimer); checkTimer = setTimeout(renderDesigns, 700); }
  });
  ['play', 'store', 'builder'].forEach(function (t) { $('tab-' + t).addEventListener('click', function () { setTab(t); }); });
  $('reset').addEventListener('click', resetCurrent);
  $('copy-settings').addEventListener('click', function () { copy(JSON.stringify({ card: state.card, theme: state.theme, params: state.params }, null, 2), 'Settings copied'); });
  $('import-settings').addEventListener('click', function () {
    var raw = prompt('Paste a card URL (from here or github-readme-stats) or copied settings JSON:');
    if (!raw) return;
    try {
      raw = raw.trim();
      if (raw.charAt(0) === '{') {
        var j = JSON.parse(raw);
        if (j.card && cardDef(j.card)) state.card = cardDef(j.card).id;
        if (j.theme) state.theme = String(j.theme);
        state.params = {};
        for (var k in (j.params || {})) if (/^[a-z][a-z0-9_.]*$/.test(k)) state.params[k] = String(j.params[k]);
      } else {
        var u = new URL(raw, location.origin);
        var id = (u.pathname.split('/').filter(Boolean)[1] || 'stats');
        if (cardDef(id)) state.card = cardDef(id).id;
        var q = parseQs(u.search);
        if (q.username) { state.username = q.username; $('username').value = q.username; }
        state.theme = q.theme || 'default';
        state.params = {};
        for (var key in q) if (key !== 'username' && key !== 'theme' && /^[a-z][a-z0-9_.]*$/.test(key)) state.params[key] = q[key];
      }
      renderTiles(); renderThemes(); renderParams(); update(); toast('Settings imported');
    } catch (e) { toast('Could not read those settings'); }
  });
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
    b.addEventListener('click', function () {
      $('stage').className = 'stage ' + b.dataset.bg;
      Array.prototype.forEach.call(document.querySelectorAll('.bgbtn'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    });
  });
  var root = document.documentElement;
  function effectiveScheme() { return root.dataset.scheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  $('scheme').addEventListener('click', function () {
    var next = effectiveScheme() === 'dark' ? 'light' : 'dark';
    root.dataset.scheme = next;
    try { localStorage.setItem('gp-scheme', next); } catch (e) { /* ignore */ }
    if (state.tab === 'play') update();
  });
  try { var saved = localStorage.getItem('gp-scheme'); if (saved === 'light' || saved === 'dark') root.dataset.scheme = saved; } catch (e) { /* ignore */ }
  if (state.tab === 'play') update();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!root.dataset.scheme && state.tab === 'play') update(); });
})();
`;
