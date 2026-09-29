/** Stylesheet for the playground / store / builder page. */
export const STYLES = String.raw`
  :root { color-scheme: dark; --bg:#0b0f17; --panel:#121826; --panel2:#182033; --line:#243049; --fg:#e6edf6; --muted:#8b98b0; --accent:#6ea8fe; --accent2:#a78bfa; --ok:#34d399; --danger:#f87171; }
  :root[data-scheme=light] { color-scheme: light; --bg:#f3f5f9; --panel:#ffffff; --panel2:#f0f3f8; --line:#d8dfeb; --fg:#1b2333; --muted:#5c6980; --accent:#2563eb; --accent2:#7c3aed; --danger:#dc2626; }
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
  main { flex:1; min-width:0; overflow:auto; padding:22px; }
  h2 { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); margin:22px 0 10px; display:flex; align-items:center; gap:8px; }
  aside > h2:first-child { margin-top:0; }
  h2 button { margin-left:auto; text-transform:none; letter-spacing:0; }
  label.f { display:block; margin:12px 0 5px; font-weight:600; font-size:12.5px; }
  .hint { color:var(--muted); font-weight:400; font-size:12px; }
  input[type=text], input[type=number], input[type=search], select, textarea { width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--line); background:var(--panel2); color:var(--fg); font:inherit; }
  textarea { resize:vertical; min-height:70px; font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; }
  input:focus, select:focus, textarea:focus, button:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }
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
  .chip.plain { padding:5px 12px; } .chip.plain.on { background:var(--accent); border-color:var(--accent); color:#fff; box-shadow:none; }
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
  button.ghost { border:1px solid var(--line); background:var(--panel2); color:var(--fg); padding:6px 11px; border-radius:8px; cursor:pointer; font:inherit; font-size:12.5px; white-space:nowrap; }
  button.ghost:hover { border-color:var(--accent); }
  button.ghost.danger:hover { border-color:var(--danger); color:var(--danger); }
  button.primary { border:0; background:linear-gradient(90deg,var(--accent),var(--accent2)); color:#fff; font-weight:700; padding:8px 14px; border-radius:8px; cursor:pointer; font:inherit; white-space:nowrap; }
  button.small { padding:3px 8px; font-size:12px; }
  .hidden { display:none !important; }

  /* per-tab visibility */
  body.t-play .only-store, body.t-play .only-builder, body.t-store .only-play, body.t-store .only-builder, body.t-builder .only-play, body.t-builder .only-store { display:none; }
  body.t-store .view-play, body.t-store .view-builder, body.t-play .view-store, body.t-play .view-builder, body.t-builder .view-play, body.t-builder .view-store { display:none; }

  body.t-store .not-store { display:none; }

  /* playground */
  .view-play { display:flex; flex-direction:column; align-items:center; gap:16px; }
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
  .editing { width:100%; max-width:900px; padding:8px 12px; border-radius:8px; background:color-mix(in srgb,var(--accent) 14%,var(--panel)); border:1px solid var(--accent); display:flex; gap:10px; align-items:center; }

  /* store */
  .toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:18px; }
  .toolbar input[type=search] { max-width:320px; }
  .count { color:var(--muted); font-size:12.5px; margin-left:auto; }
  .gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:18px; align-content:start; }
  .item { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px; min-width:0; }
  .item:hover { border-color:color-mix(in srgb,var(--accent) 60%,var(--line)); }
  .item h3 { margin:0; font-size:14px; display:flex; gap:8px; align-items:baseline; }
  .item h3 span { color:var(--muted); font-weight:400; font-size:12px; }
  .item .shot { overflow:auto; min-height:60px; display:flex; align-items:center; }
  .item img { display:block; max-width:100%; height:auto; }
  .item .acts { display:flex; gap:6px; flex-wrap:wrap; margin-top:auto; }
  .empty { color:var(--muted); padding:30px; text-align:center; border:1px dashed var(--line); border-radius:12px; }

  /* builder */
  .view-builder { display:grid; grid-template-columns:minmax(380px,520px) 1fr; gap:22px; align-items:start; }
  .col-blocks { display:flex; flex-direction:column; gap:12px; }
  .panel { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; }
  .panel h3 { margin:0 0 10px; font-size:13px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .btnrow { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .blk { background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .blk.over { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent); }
  .blk header { padding:8px 10px; background:var(--panel2); gap:8px; border:0; }
  .blk header .handle { cursor:grab; color:var(--muted); user-select:none; padding:0 4px; }
  .blk header .name { font-weight:700; font-size:12.5px; }
  .blk header .sub { color:var(--muted); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
  .blk .body { padding:12px; display:flex; flex-direction:column; gap:10px; }
  .blk .body label { font-size:12px; font-weight:600; display:block; margin-bottom:4px; }
  .item-edit { border:1px dashed var(--line); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px; }
  .col-out { position:sticky; top:0; display:flex; flex-direction:column; gap:12px; }
  .outtabs { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
  iframe.preview { width:100%; height:68vh; border:1px solid var(--line); border-radius:12px; background:#fff; }
  textarea.md { min-height:68vh; }
  .note { color:var(--muted); font-size:12px; }
  .toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--ok); color:#04241a; padding:8px 16px; border-radius:999px; font-weight:700; opacity:0; pointer-events:none; transition:.2s; z-index:10; }
  .toast.on { opacity:1; }
  @media (max-width:1100px) { .view-builder { grid-template-columns:1fr; } .col-out { position:static; } }
  @media (max-width:860px) { .app { flex-direction:column; } aside { width:auto; border-right:0; border-bottom:1px solid var(--line); } }
`;
