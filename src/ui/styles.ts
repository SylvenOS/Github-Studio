/**
 * Stylesheet for the app. A quiet workbench: green-tinted neutrals, one accent taken from the
 * contribution-graph green, ink-coloured primary actions, hairline structure instead of boxes.
 * Both themes are defined as tokens; `data-scheme` on <html> overrides the system setting.
 */
export const STYLES = String.raw`
  /* --- tokens ------------------------------------------------------------------------------ */
  :root {
    color-scheme: light;
    --bg:#f5f6f3; --surface:#ffffff; --surface-2:#eef0ec; --sunken:#e8ebe6;
    --line:#e0e4dc; --line-strong:#c8cec4;
    --fg:#171b18; --muted:#58625a; --faint:#8a948b;
    --accent:#1b7f5c; --accent-fg:#ffffff; --accent-soft:#dff0e8;
    --ink:#171b18; --ink-fg:#ffffff;
    --danger:#bf3329; --warn:#966400; --ok:#1b7f5c;
    --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI Variable Text','Segoe UI',Roboto,'Helvetica Neue',sans-serif;
    --mono:ui-monospace,'Cascadia Code','SF Mono',Consolas,'Liberation Mono',monospace;
    --r-sm:6px; --r:8px; --r-lg:12px;
    --shadow:0 1px 2px rgb(20 28 22 / .06),0 4px 14px rgb(20 28 22 / .05);
  }
  @media (prefers-color-scheme:dark) {
    :root:not([data-scheme=light]) {
      color-scheme:dark;
      --bg:#0e1210; --surface:#151a17; --surface-2:#1b211d; --sunken:#0a0d0b;
      --line:#242b26; --line-strong:#333d36;
      --fg:#e8ede9; --muted:#9aa59c; --faint:#6b756d;
      --accent:#3dbf8e; --accent-fg:#06140e; --accent-soft:#14291f;
      --ink:#e8ede9; --ink-fg:#0e1210;
      --danger:#f0766c; --warn:#d9a441; --ok:#3dbf8e;
      --shadow:0 1px 2px rgb(0 0 0 / .4),0 6px 18px rgb(0 0 0 / .3);
    }
  }
  :root[data-scheme=dark] {
    color-scheme:dark;
    --bg:#0e1210; --surface:#151a17; --surface-2:#1b211d; --sunken:#0a0d0b;
    --line:#242b26; --line-strong:#333d36;
    --fg:#e8ede9; --muted:#9aa59c; --faint:#6b756d;
    --accent:#3dbf8e; --accent-fg:#06140e; --accent-soft:#14291f;
    --ink:#e8ede9; --ink-fg:#0e1210;
    --danger:#f0766c; --warn:#d9a441; --ok:#3dbf8e;
    --shadow:0 1px 2px rgb(0 0 0 / .4),0 6px 18px rgb(0 0 0 / .3);
  }

  /* --- base -------------------------------------------------------------------------------- */
  * { box-sizing:border-box; }
  html,body { height:100%; }
  body { margin:0; background:var(--bg); color:var(--fg); font:13.5px/1.55 var(--sans); display:flex; flex-direction:column; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  button { font:inherit; color:inherit; }
  .hidden { display:none !important; }
  .grow { flex:1; }
  ::selection { background:var(--accent-soft); }
  :focus-visible { outline:2px solid var(--accent); outline-offset:2px; border-radius:var(--r-sm); }
  .ic { display:inline-flex; flex:none; }
  .ic svg { display:block; }

  /* --- header ------------------------------------------------------------------------------ */
  header.top { display:flex; align-items:center; gap:28px; height:56px; padding:0 24px; background:var(--surface); border-bottom:1px solid var(--line); flex:none; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:650; font-size:15px; letter-spacing:-.01em; }
  .brand .mark { color:var(--accent); }
  .tabs { display:flex; gap:4px; height:100%; }
  .tabs button { position:relative; border:0; background:none; padding:0 12px; color:var(--muted); font-weight:500; cursor:pointer; height:100%; }
  .tabs button:hover { color:var(--fg); }
  .tabs button.on { color:var(--fg); }
  .tabs button.on::after { content:''; position:absolute; left:12px; right:12px; bottom:-1px; height:2px; background:var(--fg); border-radius:2px; }
  .who { display:flex; align-items:center; gap:2px; border:1.5px solid var(--accent); border-radius:var(--r); background:var(--accent-soft); padding:0 12px; height:38px; width:300px; cursor:text; transition:box-shadow .15s; }
  .who:hover { box-shadow:0 0 0 3px var(--accent-soft); }
  .who:focus-within { box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 28%,transparent); }
  .who b { font-size:11.5px; font-weight:650; color:var(--accent); white-space:nowrap; margin-right:10px; padding-right:10px; border-right:1px solid color-mix(in srgb,var(--accent) 35%,transparent); line-height:1; }
  .who span { color:var(--accent); font-family:var(--mono); font-weight:600; }
  .who input[type=text] { border:0; background:none; box-shadow:none; padding:0 0 0 3px; height:34px; font-family:var(--mono); font-size:13.5px; font-weight:550; outline:0; width:100%; color:var(--fg); }
  .who input[type=text]::placeholder { color:var(--faint); font-weight:400; }
  .who.attention { animation:whoPulse 2.2s ease-out 3; }
  @keyframes whoPulse { 0% { box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 45%,transparent); } 70%,100% { box-shadow:0 0 0 10px transparent; } }
  .links { display:flex; gap:18px; align-items:center; color:var(--muted); font-size:13px; }
  .links a:hover { color:var(--fg); }
  #scheme { display:grid; place-items:center; width:34px; height:34px; border:1px solid var(--line-strong); border-radius:var(--r); background:none; color:var(--muted); cursor:pointer; }
  #scheme:hover { color:var(--fg); background:var(--surface-2); }

  /* --- workbench layout -------------------------------------------------------------------- */
  .app { flex:1; min-height:0; display:grid; grid-template-columns:260px minmax(0,1fr) 352px; }
  body.t-store .app, body.t-builder .app { grid-template-columns:minmax(0,1fr) 352px; }
  .rail, .inspector { overflow-y:auto; background:var(--surface); min-height:0; }
  .rail { border-right:1px solid var(--line); display:flex; flex-direction:column; }
  .inspector { border-left:1px solid var(--line); padding:8px 24px 40px; }
  main { overflow:auto; min-width:0; padding:32px 40px 56px; }

  /* rail: card picker */
  .rail-top { position:sticky; top:0; z-index:2; background:var(--surface); padding:20px 16px 12px; border-bottom:1px solid var(--line); }
  .rail-top .row1 { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:10px; }
  .rail-top h2 { margin:0; font-size:13px; font-weight:650; }
  .rail-top .count { font-size:12px; color:var(--faint); }
  .catrow { display:flex; gap:2px; overflow-x:auto; margin:10px -4px 0; padding:0 4px 2px; scrollbar-width:none; }
  .catrow::-webkit-scrollbar { display:none; }
  .catrow button { flex:none; border:0; background:none; padding:4px 9px; border-radius:999px; color:var(--muted); font-size:12px; cursor:pointer; }
  .catrow button:hover { color:var(--fg); background:var(--surface-2); }
  .catrow button.on { background:var(--ink); color:var(--ink-fg); }
  .cardlist { padding:8px 8px 32px; }
  .grphd { padding:16px 10px 6px; font-size:11.5px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--faint); }
  .tile { display:block; width:100%; padding:7px 12px; border:0; border-radius:var(--r-sm); background:none; text-align:left; color:var(--muted); cursor:pointer; font-size:13px; }
  .tile:hover { background:var(--surface-2); color:var(--fg); }
  .tile.on { background:var(--accent-soft); color:var(--fg); font-weight:600; box-shadow:inset 2px 0 0 var(--accent); }

  /* --- form controls ----------------------------------------------------------------------- */
  input[type=text], input[type=number], input[type=search], select, textarea {
    width:100%; padding:0 11px; height:36px; border-radius:var(--r); border:1px solid var(--line-strong); background:var(--surface); color:var(--fg); font:inherit; font-size:13px;
  }
  input::placeholder, textarea::placeholder { color:var(--faint); }
  textarea { height:auto; padding:9px 11px; resize:vertical; min-height:76px; font:12.5px/1.5 var(--mono); }
  input[type=search] { background:var(--surface-2); border-color:transparent; }
  input:focus, select:focus, textarea:focus { outline:0; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); }
  select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a948b' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 11px center; padding-right:30px; }
  label.f { display:block; font-weight:550; font-size:13px; }
  .help { color:var(--muted); font-size:12px; line-height:1.45; margin:2px 0 8px; }
  .hint { color:var(--faint); font-weight:400; font-size:12px; }
  .note { color:var(--muted); font-size:12.5px; line-height:1.5; }
  .val { float:right; font-family:var(--mono); font-size:12px; color:var(--accent); font-weight:600; }
  input[type=range] { width:100%; accent-color:var(--accent); margin:6px 0; }
  .rangerow { display:flex; align-items:center; gap:8px; } .rangerow input { flex:1; }
  .color { display:flex; gap:8px; }
  .color input[type=color] { width:36px; height:36px; padding:3px; border-radius:var(--r); border:1px solid var(--line-strong); background:var(--surface); flex:none; cursor:pointer; }
  .swatches { display:flex; gap:4px; margin-top:8px; } .swatches i { width:20px; height:20px; border-radius:5px; border:1px solid var(--line); display:block; }

  .seg { display:flex; flex-wrap:wrap; gap:2px; padding:2px; background:var(--surface-2); border-radius:var(--r); }
  .seg button { flex:1 1 auto; padding:5px 10px; border:0; border-radius:6px; background:none; color:var(--muted); cursor:pointer; font-size:12.5px; }
  .seg button:hover { color:var(--fg); }
  .seg button.on { background:var(--surface); color:var(--fg); font-weight:600; box-shadow:0 1px 2px rgb(0 0 0 / .1),0 0 0 1px var(--line); }
  .seg.presets { margin-bottom:20px; background:none; padding:0; gap:6px; display:grid; grid-template-columns:repeat(3,1fr); }
  .seg.presets button { border:1px solid var(--line-strong); background:var(--surface); }
  .seg.presets button:hover { border-color:var(--fg); }

  .row { display:flex; align-items:center; gap:14px; }
  .row .rowtxt { flex:1; min-width:0; }
  .row label { cursor:pointer; font-weight:550; font-size:13px; display:block; }
  .row .help { margin:1px 0 0; }
  .switch { position:relative; width:36px; height:21px; flex:none; }
  .switch input { opacity:0; position:absolute; inset:0; margin:0; cursor:pointer; z-index:1; }
  .switch span { position:absolute; inset:0; background:var(--line-strong); border-radius:999px; transition:background .15s; }
  .switch span::after { content:''; position:absolute; top:2.5px; left:2.5px; width:16px; height:16px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgb(0 0 0 / .3); transition:transform .15s; }
  .switch input:checked + span { background:var(--accent); }
  .switch input:checked + span::after { transform:translateX(15px); }
  .switch input:focus-visible + span { outline:2px solid var(--accent); outline-offset:2px; }

  button.primary, button.ghost { display:inline-flex; align-items:center; justify-content:center; gap:6px; height:34px; padding:0 14px; border-radius:var(--r); cursor:pointer; white-space:nowrap; font-size:13px; font-weight:550; }
  button.primary { border:1px solid var(--ink); background:var(--ink); color:var(--ink-fg); }
  button.primary:hover { opacity:.88; }
  button.ghost { border:1px solid var(--line-strong); background:var(--surface); }
  button.ghost:hover { background:var(--surface-2); border-color:var(--faint); }
  button.ghost.danger:hover { border-color:var(--danger); color:var(--danger); }
  button.small { height:28px; padding:0 10px; font-size:12.5px; }
  button.icon, button.clr { width:28px; padding:0; }
  button:disabled { opacity:.45; cursor:default; }

  /* --- inspector sections ------------------------------------------------------------------ */
  .sect { padding:24px 0; border-bottom:1px solid var(--line); }
  .sect:last-child { border-bottom:0; }
  .sect-hd { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:16px; min-height:28px; }
  .sect-hd h2 { margin:0; font-size:14px; font-weight:650; }
  .chips { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; }
  .chip { display:flex; align-items:center; gap:9px; padding:6px 10px; border-radius:var(--r-sm); border:1px solid var(--line); background:var(--surface); cursor:pointer; font-size:12.5px; color:var(--muted); text-align:left; }
  .chip:hover { border-color:var(--line-strong); color:var(--fg); }
  .chip i { width:16px; height:16px; border-radius:50%; border:2px solid; display:block; position:relative; flex:none; }
  .chip i::after { content:''; position:absolute; inset:2px; border-radius:50%; background:currentColor; }
  .chip.on { border-color:var(--fg); color:var(--fg); font-weight:600; box-shadow:0 0 0 1px var(--fg); }

  details.grp { border-top:1px solid var(--line); margin:0; padding:0; }
  details.grp:first-of-type { border-top:0; }
  details.grp > summary { display:flex; align-items:center; justify-content:space-between; cursor:pointer; font-weight:600; font-size:13px; padding:14px 0; list-style:none; }
  details.grp > summary::-webkit-details-marker { display:none; }
  details.grp > summary::after { content:''; width:7px; height:7px; border-right:1.6px solid var(--faint); border-bottom:1.6px solid var(--faint); transform:rotate(45deg) translateY(-2px); transition:transform .15s; }
  details.grp[open] > summary::after { transform:rotate(-135deg) translateY(-2px); }
  details.grp > div, details.grp > .row { margin:0 0 18px; }
  details.grp[open] { padding-bottom:2px; }

  .cardhead { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
  .cardhead .ico { width:40px; height:40px; display:grid; place-items:center; border-radius:10px; background:var(--accent-soft); color:var(--accent); flex:none; }
  .cardhead .ct { flex:1; min-width:0; display:flex; flex-direction:column; }
  .cardhead .ct b { font-size:14.5px; font-weight:650; }
  .cardhead .cs { font-size:12px; color:var(--muted); }
  .cardnote { font-size:12.5px; color:var(--muted); margin:0 0 20px; line-height:1.55; }
  .looks-title { margin:0 0 8px; font-size:12px; font-weight:600; color:var(--muted); }
  .looks { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:22px; }
  .looks .look { padding:5px 11px; border-radius:999px; border:1px solid var(--line-strong); background:var(--surface); color:var(--muted); font-size:12.5px; cursor:pointer; }
  .looks .look:hover { border-color:var(--fg); color:var(--fg); }
  .looks .look.on { background:var(--ink); border-color:var(--ink); color:var(--ink-fg); font-weight:600; }
  .optsearch { margin-bottom:12px; }

  /* --- playground -------------------------------------------------------------------------- */
  .view-play { display:flex; flex-direction:column; gap:20px; max-width:980px; margin:0 auto; }
  .stagebar { display:flex; align-items:center; gap:16px; }
  .stagebar h1 { margin:0; font-size:20px; font-weight:650; letter-spacing:-.015em; }
  .bgs { display:flex; align-items:center; gap:10px; color:var(--muted); font-size:12.5px; }
  .bgs .seg button { padding:3px 11px; }
  .stage { overflow:auto; padding:48px 32px; border-radius:var(--r-lg); border:1px solid var(--line); min-height:260px; display:flex; align-items:center; justify-content:safe center; }
  .stage.checker { background-color:var(--sunken); background-image:radial-gradient(var(--line-strong) 1px,transparent 1.2px); background-size:18px 18px; }
  .stage.dark { background:#0d1117; border-color:#0d1117; }
  .stage.light { background:#ffffff; }
  .stage img { display:block; max-width:100%; height:auto; transition:opacity .15s; }
  .stage img.loading { opacity:.35; }
  .desc { color:var(--muted); max-width:68ch; line-height:1.6; margin:0; }
  .embed { display:flex; flex-direction:column; gap:12px; padding:16px; border:1px solid var(--line); border-radius:var(--r-lg); background:var(--surface); }
  .embed .url { padding:10px 12px; background:var(--sunken); border-radius:var(--r); font:12px/1.5 var(--mono); color:var(--muted); word-break:break-all; max-height:84px; overflow:auto; }
  .acts-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .editing { padding:10px 14px; border-radius:var(--r); background:var(--accent-soft); display:flex; gap:10px; align-items:center; }
  details.text, details.defs { border:1px solid var(--line); border-radius:var(--r-lg); background:var(--surface); padding:0 16px; }
  details.text summary, details.defs summary { cursor:pointer; font-weight:600; padding:14px 0; font-size:13px; }
  details.defs .def { padding:0 0 14px; font-size:12.5px; }
  details.defs .def b { font-weight:600; }
  details.defs .def p { margin:3px 0 0; color:var(--muted); }
  pre#text { margin:0 0 16px; overflow:auto; font:9px/9px var(--mono); max-height:420px; }

  /* --- store ------------------------------------------------------------------------------- */
  .view-store { max-width:1280px; margin:0 auto; }
  .toolbar { display:flex; gap:20px; align-items:center; flex-wrap:wrap; margin-bottom:28px; }
  .toolbar input[type=search] { max-width:300px; }
  #cats { display:flex; flex-wrap:wrap; gap:2px; }
  #cats button { border:0; background:none; padding:5px 11px; border-radius:999px; color:var(--muted); font-size:12.5px; cursor:pointer; }
  #cats button:hover { color:var(--fg); background:var(--surface-2); }
  #cats button.on { background:var(--ink); color:var(--ink-fg); font-weight:600; }
  .count { color:var(--faint); font-size:12.5px; margin-left:auto; }
  .gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:20px; align-content:start; }
  .item { display:flex; flex-direction:column; gap:14px; min-width:0; }
  .item .shot { border-radius:var(--r-lg); border:1px solid var(--line); background-color:var(--sunken); background-image:radial-gradient(var(--line-strong) 1px,transparent 1.2px); background-size:18px 18px; padding:24px; min-height:140px; display:flex; align-items:center; justify-content:center; overflow:auto; }
  .item img { display:block; max-width:100%; height:auto; }
  .item .meta { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
  .item h3 { margin:0; font-size:13.5px; font-weight:600; }
  .item .look-name { color:var(--muted); font-size:12.5px; }
  .item .acts { display:flex; gap:8px; }
  .empty { color:var(--muted); padding:48px; text-align:center; border:1px dashed var(--line-strong); border-radius:var(--r-lg); grid-column:1/-1; }

  /* --- README studio ----------------------------------------------------------------------- */
  .view-builder { display:grid; grid-template-columns:minmax(360px,480px) minmax(0,1fr); gap:32px; align-items:start; max-width:1400px; margin:0 auto; }
  .col-blocks { display:flex; flex-direction:column; gap:20px; }
  .panel { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-lg); padding:20px; }
  .panel h3 { margin:0 0 16px; font-size:14px; font-weight:650; }
  .panel h3 .hint { display:block; margin-top:2px; }
  .panel .row { margin-top:16px; }
  .panel label.f { margin:16px 0 6px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .grid2 label.f { margin-top:0; }
  .btnrow { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .designs { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .design { display:flex; flex-direction:column; gap:8px; padding:0; border:0; background:none; cursor:pointer; text-align:left; color:var(--muted); font-size:12.5px; }
  .design img { width:100%; aspect-ratio:16/10; object-fit:cover; object-position:top; border-radius:var(--r); border:1px solid var(--line); background:var(--sunken); transition:border-color .15s,box-shadow .15s; }
  .design:hover img { border-color:var(--faint); }
  .design.on { color:var(--fg); font-weight:600; }
  .design.on img { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent); }
  .blk { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-lg); overflow:hidden; }
  .blk.over { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-soft); }
  .blk header { display:flex; align-items:center; gap:6px; padding:8px 10px 8px 8px; border-bottom:1px solid var(--line); background:none; height:auto; }
  .blk .handle { cursor:grab; color:var(--faint); padding:4px; display:inline-flex; }
  .blk .handle:hover { color:var(--fg); }
  .blk .name { font-weight:600; font-size:13px; }
  .blk .sub { color:var(--faint); font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; margin-left:4px; }
  .blk .body { padding:16px; display:flex; flex-direction:column; gap:14px; }
  .blk .body label { font-size:12.5px; font-weight:550; display:block; margin-bottom:5px; }
  .item-edit { border:1px dashed var(--line-strong); border-radius:var(--r); padding:14px; display:flex; flex-direction:column; gap:12px; }
  .col-out { position:sticky; top:0; display:flex; flex-direction:column; gap:14px; }
  .outtabs { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .outtabs .tabs { height:34px; gap:2px; padding:2px; background:var(--surface-2); border-radius:var(--r); }
  .outtabs .tabs button { height:30px; border-radius:6px; padding:0 14px; }
  .outtabs .tabs button.on { background:var(--surface); box-shadow:0 1px 2px rgb(0 0 0 / .1),0 0 0 1px var(--line); }
  .outtabs .tabs button.on::after { display:none; }
  iframe.preview { width:100%; height:68vh; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; }
  iframe.preview.mobile { width:390px; max-width:100%; margin:0 auto; display:block; }
  textarea.md { min-height:68vh; }
  #build-check.good { color:var(--ok); } #build-check.bad { color:var(--danger); }

  .toast { position:fixed; bottom:24px; left:50%; transform:translate(-50%,8px); background:var(--ink); color:var(--ink-fg); padding:9px 18px; border-radius:var(--r); font-weight:550; font-size:13px; opacity:0; pointer-events:none; transition:opacity .2s,transform .2s; z-index:20; box-shadow:var(--shadow); }
  .toast.on { opacity:1; transform:translate(-50%,0); }

  /* --- per-tab visibility ------------------------------------------------------------------ */
  body.t-play .only-store, body.t-play .only-builder, body.t-store .only-play, body.t-store .only-builder, body.t-builder .only-play, body.t-builder .only-store { display:none; }
  body.t-store .view-play, body.t-store .view-builder, body.t-play .view-store, body.t-play .view-builder, body.t-builder .view-play, body.t-builder .view-store { display:none; }
  body.t-store .not-store { display:none; }

  /* --- narrow screens ---------------------------------------------------------------------- */
  body { overflow-x:hidden; }
  @media (min-width:1181px) and (max-width:1380px) {
    .app { grid-template-columns:232px minmax(0,1fr) 316px; }
    body.t-store .app, body.t-builder .app { grid-template-columns:minmax(0,1fr) 316px; }
    .inspector { padding-left:18px; padding-right:18px; }
  }
  @media (min-width:1700px) {
    .app { grid-template-columns:300px minmax(0,1fr) 400px; }
    body.t-store .app, body.t-builder .app { grid-template-columns:minmax(0,1fr) 400px; }
  }
  @media (max-width:1180px) {
    html, body { height:auto; min-height:100%; }
    .app, body.t-store .app, body.t-builder .app { overflow:visible; }
    .app, body.t-store .app, body.t-builder .app { display:block; overflow:auto; }
    .rail, .inspector { overflow:visible; border:0; border-bottom:1px solid var(--line); }
    .rail-top { position:static; }
    .cardlist { max-height:220px; overflow:auto; }
    .inspector { padding:8px 16px 32px; }
    .gallery { grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); }
    .embed .url { word-break:break-all; }
    main { overflow:visible; padding:24px 16px 40px; }
    .view-builder { grid-template-columns:minmax(0,1fr); } .col-out { position:static; }
    header.top { gap:14px; padding:0 16px; flex-wrap:wrap; height:auto; min-height:56px; }
    .who { width:220px; }
    .links a { display:none; }
  }
  @media (max-width:640px) {
    header.top { padding:8px 12px; gap:8px 14px; }
    .tabs { height:40px; order:2; width:100%; overflow-x:auto; }
    .tabs button { padding:0 10px; white-space:nowrap; }
    .who { order:3; width:100%; }
    .who b { display:none; }
    .links { margin-left:auto; }
    .stagebar { flex-wrap:wrap; }
    .embed .acts-row .grow { display:none; }
    .toolbar { gap:12px; }
    .designs { grid-template-columns:repeat(2,1fr); }
    .grid2 { grid-template-columns:1fr; }
    .stage { padding:20px 10px; min-height:180px; }
    main { padding:16px 12px 32px; }
    .acts-row, .btnrow, .outtabs { flex-wrap:wrap; }
    .acts-row button { flex:1 1 auto; }
    .gallery { grid-template-columns:1fr; }
    .toolbar input[type=search] { width:100%; flex:1 1 100%; }
  }
  @media (max-width:380px) {
    header.top { padding:8px 10px; }
    .designs { grid-template-columns:1fr; }
    .inspector { padding:8px 12px 28px; }
    .seg button { padding:3px 9px; }
  }
  @media (prefers-reduced-motion:reduce) { * { transition:none !important; } .who.attention { animation:none; } }
`;
