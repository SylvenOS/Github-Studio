import { SCRIPT } from './script';
import { STYLES } from './styles';

/** The single-page app served at `/`: Playground, Store and README Studio. */
export const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ProfileFoundry - stats cards, profile designs and README studio</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="description" content="ProfileFoundry is a free, open-source GitHub stats API, card store and README studio by SylvenOS.">
<meta property="og:title" content="ProfileFoundry - free GitHub stats cards and README studio">
<meta property="og:description" content="Free, open-source stats cards, profile designs and a README studio. An open-source project by SylvenOS.">
<meta property="og:type" content="website">
<meta name="theme-color" content="#0a1931">
<style>${STYLES}</style>
</head>
<body class="t-play">
<header class="top">
  <a class="brand" href="/" aria-label="ProfileFoundry home">
    <svg class="mark" viewBox="0 0 512 512" width="28" height="28" aria-hidden="true" fill="currentColor"><g transform="translate(0 0) scale(1)"><g fill="none" stroke="currentColor" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"><path d="M256 396C256 346 130 352 130 302"/><path d="M256 396C256 330 256 290 256 214"/><path d="M256 396C256 300 382 262 382 122"/></g><circle cx="130" cy="302" r="34" fill="currentColor"/><circle cx="256" cy="214" r="34" fill="currentColor"/><circle cx="382" cy="122" r="34" fill="currentColor"/><circle cx="256" cy="396" r="44" fill="currentColor"/></g></svg>
    <span>ProfileFoundry</span>
  </a>
  <nav class="tabs" aria-label="Sections">
    <button id="tab-play" class="on">Playground</button>
    <button id="tab-store">Store</button>
    <button id="tab-builder">README Studio</button>
  </nav>
  <span class="grow"></span>
  <label class="who attention" title="Type any GitHub username to preview every card"><b>GitHub user</b><span>@</span><input type="text" id="username" value="torvalds" autocomplete="off" spellcheck="false" placeholder="username" aria-label="GitHub username"></label>
  <div class="links">
    <a href="https://sylvenos.com" target="_blank" rel="noopener" title="ProfileFoundry is an open-source project by SylvenOS">by SylvenOS</a><a href="/api/cards">Cards</a><a href="/api/openapi.json">OpenAPI</a><a href="/api/themes">Themes</a>
    <button id="scheme" title="Switch light and dark" aria-label="Switch light and dark"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg></button>
  </div>
</header>
<div class="app">
  <nav class="rail only-play" aria-label="Cards">
    <div class="rail-top">
      <div class="row1"><h2>Cards</h2><span class="count" id="card-count"></span></div>
      <input type="search" id="card-search" placeholder="Search cards" autocomplete="off" aria-label="Search cards">
      <div class="catrow" id="card-cats"></div>
    </div>
    <div class="cardlist" id="tiles"></div>
  </nav>

  <main>
    <section class="view-play">
      <div class="editing hidden" id="editing"><b id="editing-label"></b><span class="grow"></span><button class="ghost small" id="editing-cancel">Cancel</button></div>
      <div class="stagebar">
        <h1 id="stage-title">Preview</h1>
        <span class="grow"></span>
        <div class="bgs"><span>Background</span>
          <div class="seg" role="group" aria-label="Preview background"><button class="bgbtn on" data-bg="checker" aria-pressed="true">Grid</button><button class="bgbtn" data-bg="dark" aria-pressed="false">Dark</button><button class="bgbtn" data-bg="light" aria-pressed="false">Light</button></div>
        </div>
      </div>
      <div class="stage checker" id="stage"><img id="preview" alt="Card preview"></div>
      <p class="desc" id="desc"></p>
      <div class="embed">
        <div class="url" id="url"></div>
        <div class="acts-row">
          <button class="primary" id="copy-md">Copy Markdown</button>
          <button class="ghost" id="copy-html">Copy HTML</button>
          <button class="ghost" id="copy-url">Copy URL</button>
          <button class="ghost" id="open">Open image</button>
          <span class="grow"></span>
          <button class="ghost" id="add-readme">Add to README</button>
          <button class="primary hidden" id="update-block">Update README block</button>
        </div>
        <div class="acts-row">
          <button class="ghost small" id="copy-settings" title="Copy these settings as JSON">Copy settings</button>
          <button class="ghost small" id="import-settings" title="Paste a URL or settings JSON">Import settings</button>
        </div>
      </div>
      <details class="defs" id="defs" style="display:none"></details>
      <details class="text" id="text-box" style="display:none">
        <summary>Plain text version</summary>
        <p class="note" style="margin:0 0 12px">Paste into a code block in your README.</p>
        <button class="ghost small" id="copy-text" style="margin-bottom:12px">Copy text</button>
        <pre id="text"></pre>
      </details>
    </section>

    <section class="view-store">
      <div class="toolbar">
        <input type="search" id="q" placeholder="Search styles" autocomplete="off" aria-label="Search styles">
        <div id="cats"></div>
        <button class="ghost small" id="clear-filters">Clear</button>
        <span class="count" id="count"></span>
      </div>
      <div class="gallery" id="gallery"></div>
    </section>

    <section class="view-builder">
      <div class="col-blocks">
        <div class="panel">
          <h3>Design<span class="hint">One look for the whole README. Pick a starting point, then edit the blocks.</span></h3>
          <div class="designs" id="designs"></div>
        </div>
        <div class="panel">
          <h3>Start from a layout</h3>
          <div class="btnrow">
            <select id="preset" style="flex:1;min-width:160px" aria-label="Layout"></select>
            <button class="ghost" id="load-preset">Load</button>
          </div>
          <p class="note" id="preset-desc" style="margin:10px 0 0"></p>
          <div class="grid2" style="margin-top:20px">
            <div><label class="f" for="dark">Dark-mode theme</label><select id="dark"></select></div>
            <div><label class="f" for="align">Alignment</label><select id="align"><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option></select></div>
          </div>
          <div class="row"><div class="rowtxt"><label for="footer">Footer credit</label><div class="help">A small “Generated with ProfileFoundry” line.</div></div><span class="switch"><input type="checkbox" id="footer"><span></span></span></div>
          <label class="f" for="host">Image host</label>
          <div class="help">Your deployment URL, if different from this page.</div>
          <input type="text" id="host" placeholder="https://your-worker.workers.dev" spellcheck="false">
          <div class="btnrow" style="margin-top:20px">
            <button class="ghost small danger" id="b-reset" title="Restore the starting layout and discard changes">Reset</button>
            <button class="ghost small danger" id="b-clear" title="Remove every block">Clear all</button>
          </div>
        </div>
        <div id="blocks" class="col-blocks"></div>
        <div class="panel"><h3>Add a block</h3><div class="btnrow" id="addbar"></div></div>
      </div>
      <div class="col-out">
        <div class="outtabs">
          <div class="tabs"><button id="out-preview" class="on">Preview</button><button id="out-md">Markdown</button></div>
          <span class="grow"></span>
          <button class="primary" id="b-copy">Copy Markdown</button>
          <button class="ghost" id="b-download">Download</button>
          <button class="ghost" id="b-zip" title="README.md + SVG assets + GitHub Actions refresh workflow + config">Export ZIP</button>
        </div>
        <div class="outtabs">
          <button class="ghost small" id="b-share">Share link</button>
          <button class="ghost small" id="b-raw">Open raw</button>
          <button class="ghost small" id="b-config" title="Save this design as JSON">Save config</button>
          <button class="ghost small" id="b-import" title="Open a saved profilefoundry.config.json">Open config</button>
          <input type="file" id="config-file" accept="application/json,.json" hidden>
        </div>
        <div class="note hidden" id="build-err" style="color:var(--danger)"></div>
        <div class="note hidden" id="build-warn" style="color:var(--warn)"></div>
        <div class="note" id="build-check" role="status" aria-live="polite"></div>
        <div id="pane-preview">
          <div class="btnrow" style="margin-bottom:12px">
            <div class="seg" role="group" aria-label="Preview theme"><button class="pvbtn on" data-pv="light" aria-pressed="true">Light</button><button class="pvbtn" data-pv="dark" aria-pressed="false">Dark</button></div>
            <div class="seg" role="group" aria-label="Preview width"><button class="wbtn on" data-w="desktop" aria-pressed="true">Desktop</button><button class="wbtn" data-w="mobile" aria-pressed="false">Mobile</button></div>
          </div>
          <iframe class="preview" id="frame" sandbox="" title="README preview"></iframe>
        </div>
        <div id="pane-md" class="hidden">
          <p class="note" style="margin:0 0 8px">Edit freely. This text is what gets copied and downloaded.
            <span id="manual-note" class="hidden">You edited it by hand, so block changes no longer overwrite it. <button class="ghost small" id="regen">Regenerate from blocks</button></span></p>
          <textarea id="md" class="md" spellcheck="false"></textarea>
        </div>
      </div>
    </section>
  </main>

  <aside class="inspector" aria-label="Options">
    <section class="sect only-play"><div id="card-params"></div></section>
    <section class="sect">
      <div class="sect-hd"><h2>Theme</h2><button class="ghost small only-play" id="surprise" title="Random theme and options">Shuffle</button></div>
      <div class="row" style="margin:0 0 14px"><div class="rowtxt"><label for="sys-theme">Match system theme</label><div class="help">Cards switch between light and dark with the viewer’s device setting.</div></div><span class="switch"><input type="checkbox" id="sys-theme"><span></span></span></div>
      <div class="chips" id="themes"></div>
    </section>
    <section class="sect not-store">
      <div class="sect-hd"><h2 id="appearance-title">Appearance</h2><button class="ghost small" id="reset" title="Back to defaults">Reset</button></div>
      <p class="note only-builder" style="margin:-6px 0 16px">Applied to every card in your README.</p>
      <div id="common-params"></div>
    </section>
  </aside>
</div>
<div class="toast" id="toast" role="status" aria-live="polite">Copied</div>
<script>${SCRIPT}</script>
</body>
</html>`;
