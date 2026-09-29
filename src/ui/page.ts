import { SCRIPT } from './script';
import { STYLES } from './styles';

/** The single-page app served at `/`: Playground, Store and README Builder. */
export const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GitPulse - stats cards and README builder</title>
<style>${STYLES}</style>
</head>
<body class="t-play">
<header>
  <span class="logo">GitPulse</span>
  <div class="tabs">
    <button id="tab-play" class="on">Playground</button>
    <button id="tab-store">Store</button>
    <button id="tab-builder">README Builder</button>
  </div>
  <span class="grow"></span>
  <div class="links"><a href="/api/cards">Cards</a><a href="/api/openapi.json">OpenAPI</a><a href="/api/themes">Themes</a><button id="scheme" title="Toggle light/dark">◐</button></div>
</header>
<div class="app">
<aside>
  <h2>GitHub user</h2>
  <input type="text" id="username" value="torvalds" autocomplete="off" spellcheck="false" placeholder="username">
  <div class="only-play">
    <h2>Card</h2>
    <div class="tiles" id="tiles"></div>
  </div>
  <h2>Theme <button class="ghost only-play" id="surprise" title="Random theme and options">🎲 Surprise me</button></h2>
  <div class="chips" id="themes"></div>
  <div class="only-play">
    <h2>Card options</h2>
    <div id="card-params"></div>
  </div>
  <div class="not-store">
    <h2><span id="appearance-title">Appearance</span> <button class="ghost" id="reset" title="Back to defaults">Reset</button></h2>
    <div class="note only-builder" style="margin-bottom:6px">Applied to every card in your README.</div>
    <div id="common-params"></div>
  </div>
</aside>
<main>
  <section class="view-play">
    <div class="editing hidden" id="editing"><b id="editing-label"></b><span class="grow"></span><button class="ghost small" id="editing-cancel">Cancel</button></div>
    <div class="bar">
      <div class="url" id="url"></div>
      <button class="primary" id="copy-md">Copy Markdown</button>
      <button class="ghost" id="copy-html">HTML</button>
      <button class="ghost" id="copy-url">URL</button>
      <button class="ghost" id="open">Open</button>
    </div>
    <div class="bar">
      <button class="primary" id="add-readme">＋ Add to README</button>
      <button class="primary hidden" id="update-block">✔ Update README block</button>
      <span class="grow"></span>
      <span class="bgs">Preview on
        <button class="ghost small bgbtn" data-bg="checker">Checker</button><button class="ghost small bgbtn" data-bg="dark">Dark</button><button class="ghost small bgbtn" data-bg="light">Light</button>
      </span>
    </div>
    <div class="stage checker" id="stage"><img id="preview" alt="Card preview"></div>
    <div class="desc" id="desc"></div>
    <details class="text" id="text-box" style="display:none">
      <summary>Plain text version (paste into a README code block)</summary>
      <button class="ghost" id="copy-text" style="margin-top:10px">Copy text</button>
      <pre id="text"></pre>
    </details>
  </section>

  <section class="view-store">
    <div class="toolbar">
      <input type="search" id="q" placeholder="Search styles: stats, ascii, globe, streak..." autocomplete="off">
      <div class="chips" id="cats"></div>
      <button class="ghost" id="clear-filters">Clear</button>
      <span class="count" id="count"></span>
    </div>
    <div class="gallery" id="gallery"></div>
  </section>

  <section class="view-builder">
    <div class="col-blocks">
      <div class="panel">
        <h3>Start from</h3>
        <div class="btnrow">
          <select id="preset" style="flex:1;min-width:160px"></select>
          <button class="ghost" id="load-preset">Load</button>
          <button class="ghost danger" id="b-reset" title="Restore the starting preset and discard changes">Reset</button>
          <button class="ghost danger" id="b-clear" title="Remove every block">Clear</button>
        </div>
        <div class="note" id="preset-desc" style="margin-top:8px"></div>
        <div class="grid2" style="margin-top:8px">
          <div><label class="f">Dark-mode theme</label><select id="dark"></select></div>
          <div><label class="f">Default alignment</label><select id="align"><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option></select></div>
        </div>
        <div class="row"><label for="footer">Add a small “Generated with GitPulse” footer</label><span class="switch"><input type="checkbox" id="footer"><span></span></span></div>
        <label class="f">Image host <span class="hint">- your deployment URL, if different from this page</span></label>
        <input type="text" id="host" placeholder="https://your-worker.workers.dev" spellcheck="false">
      </div>
      <div id="blocks" class="col-blocks"></div>
      <div class="panel"><h3>Add a block</h3><div class="btnrow" id="addbar"></div></div>
    </div>
    <div class="col-out">
      <div class="outtabs">
        <div class="tabs"><button id="out-preview" class="on">Preview</button><button id="out-md">Markdown</button></div>
        <span class="grow"></span>
        <button class="primary" id="b-copy">Copy Markdown</button>
        <button class="ghost" id="b-download">Download README.md</button>
        <button class="ghost" id="b-share">Share link</button>
        <button class="ghost" id="b-raw">Open raw</button>
      </div>
      <div class="note hidden" id="build-err" style="color:var(--danger)"></div>
      <div id="pane-preview">
        <div class="btnrow" style="margin-bottom:8px"><span class="note">Preview on</span><button class="ghost small pvbtn" data-pv="light">Light</button><button class="ghost small pvbtn" data-pv="dark">Dark</button></div>
        <iframe class="preview" id="frame" sandbox="" title="README preview"></iframe>
      </div>
      <div id="pane-md" class="hidden">
        <div class="note" style="margin-bottom:6px">Edit freely - this text is what gets copied and downloaded.
          <span id="manual-note" class="hidden">You edited it by hand, so block changes no longer overwrite it. <button class="ghost small" id="regen">Regenerate from blocks</button></span></div>
        <textarea id="md" class="md" spellcheck="false"></textarea>
      </div>
    </div>
  </section>
</main>
</div>
<div class="toast" id="toast">Copied!</div>
<script>${SCRIPT}</script>
</body>
</html>`;
