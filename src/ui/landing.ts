import pkg from '../../package.json';
import { cards } from '../cards';
import { esc } from '../core/text';
import { SITE, faqs, jsonLd } from '../seo';
import { themes } from '../themes';

/**
 * Old share links looked like `/#tab=builder&spec=...` (the app used to live at `/`).
 * Any hash with options is passed on to the app. Pinned by hash in the page's CSP.
 */
export const HEAD_SCRIPT =
  "(function(){var r=document.documentElement;if(location.hash.indexOf('=')>0)location.replace('/app'+location.hash);r.classList.add('js');try{var t=localStorage.getItem('pf-theme');if(t==='light'||t==='dark')r.setAttribute('data-theme',t)}catch(e){}})();";

/** Theme toggle (saved in this browser only), live card images that follow the theme, header shadow and scroll reveal. Pinned by hash in the CSP. */
export const UI_SCRIPT = `(function(){var d=document,r=d.documentElement,q=matchMedia('(prefers-color-scheme: dark)'),btn=d.getElementById('theme'),top=d.querySelector('.top');
function eff(){return r.getAttribute('data-theme')||(q.matches?'dark':'light')}
function imgs(){var t=r.getAttribute('data-theme'),n=t?(t==='dark'?'github_dark':'default'):'auto';d.querySelectorAll('img.shot').forEach(function(i){var s=i.getAttribute('src'),u=s.replace(/theme=[a-z_]+/,'theme='+n);if(u!==s)i.setAttribute('src',u)})}
function label(){if(btn){var e=eff();btn.setAttribute('aria-label','Switch to '+(e==='dark'?'light':'dark')+' theme');btn.setAttribute('aria-pressed',e==='dark')}}
if(btn)btn.addEventListener('click',function(){var n=eff()==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('pf-theme',n)}catch(e){}imgs();label()});
if(q.addEventListener)q.addEventListener('change',function(){imgs();label()});
imgs();label();
function sc(){top&&top.classList.toggle('scrolled',scrollY>8)}addEventListener('scroll',sc,{passive:true});sc();
var els=[].slice.call(d.querySelectorAll('.head,.card,.steps li,.stat,.showcase figure,.syl,.code,.note,.faq details,.final .wrap>*'));
var io='IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08}):null;
var tops=els.map(function(el){return el.getBoundingClientRect().top}),ih=innerHeight;
els.forEach(function(el,n){var i=[].indexOf.call(el.parentNode.children,el);el.style.setProperty('--d',Math.min(i,5)*70+'ms');el.classList.add('rv');if(!io||tops[n]<ih)el.classList.add('in');else io.observe(el)});
})();`;

/** The account whose cards are shown as live examples. */
const DEMO_USER = 'torvalds';

export const icon = (paths: string, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  palette:
    '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.83-.44-1.12-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
  template: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
  braces:
    '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41m11.32-11.32 1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'
};

export const PAGE_CSS = `:root{color-scheme:light dark;--bg:#f6f9f7;--surface:#fff;--surface-2:#eef4f0;--fg:#0b1a14;--muted:#46594f;--line:#d4e0d9;--brand:#009326;--accent:#00791f;--accent-fg:#fff;--cta:#1fb34a;--cta-fg:#04130a;--ring:#00791f;--shadow:0 1px 2px rgba(11,26,20,.06),0 8px 24px rgba(11,26,20,.08)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#07100c;--surface:#0e1a14;--surface-2:#122219;--fg:#eef6f1;--muted:#a3b8ab;--line:#1f3528;--accent:#43d36b;--accent-fg:#04130a;--ring:#43d36b;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35)}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#07100c;--surface:#0e1a14;--surface-2:#122219;--fg:#eef6f1;--muted:#a3b8ab;--line:#1f3528;--accent:#43d36b;--accent-fg:#04130a;--ring:#43d36b;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35)}:root[data-theme="light"]{color-scheme:light}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:84px;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:1rem/1.65 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;overflow-x:hidden}
img,svg{max-width:100%}.card p,.card code,.prose code,summary,details p,.meta,.note,dd{overflow-wrap:anywhere}a{color:var(--accent);text-underline-offset:3px}a:hover{text-decoration-thickness:2px}
:focus-visible{outline:3px solid var(--ring);outline-offset:3px;border-radius:6px}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 max(20px,env(safe-area-inset-left)) 0 max(20px,env(safe-area-inset-right))}
.skip{position:absolute;left:12px;top:-60px;background:var(--surface);color:var(--fg);padding:10px 14px;border-radius:8px;z-index:20;box-shadow:var(--shadow)}.skip:focus{top:12px}
h1,h2,h3{margin:0;line-height:1.15;letter-spacing:-.02em;text-wrap:balance}h2{font-size:clamp(1.65rem,3.4vw,2.3rem)}h3{font-size:1.08rem;letter-spacing:-.005em}p{margin:0}

/* header */
.top{position:sticky;top:0;z-index:10;background:rgba(7,16,12,.82);-webkit-backdrop-filter:saturate(1.4) blur(12px);backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid rgba(255,255,255,.08)}
.top .wrap{display:flex;align-items:center;gap:16px;min-height:64px}
.brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:700;font-size:1.05rem;min-height:44px}.brand img{width:32px;height:32px;border-radius:8px}
.top nav{margin-left:auto;display:flex;align-items:center;gap:4px}
.top nav a{color:#c9dccf;text-decoration:none;font-size:.95rem;padding:10px 12px;border-radius:8px;min-height:44px;display:inline-flex;align-items:center;transition:color .18s,background-color .18s}
.top nav a:hover{color:#fff;background:rgba(255,255,255,.08)}.top{transition:background-color .25s,box-shadow .25s}.top.scrolled{background:rgba(7,16,12,.94);box-shadow:0 6px 24px rgba(0,0,0,.35)}
.tt{display:none;place-items:center;width:44px;height:44px;margin-left:4px;border-radius:50%;border:1px solid transparent;background:transparent;color:#c9dccf;cursor:pointer;transition:background-color .18s,color .18s,transform .3s}.js .tt{display:grid}.tt:hover{background:rgba(255,255,255,.1);color:#fff;transform:rotate(18deg)}.tt:focus-visible{outline-color:#43d36b}
.tt .i-sun{display:none}:root[data-theme="dark"] .tt .i-sun{display:block}:root[data-theme="dark"] .tt .i-moon{display:none}
@media(prefers-color-scheme:dark){:root:not([data-theme]) .tt .i-sun{display:block}:root:not([data-theme]) .tt .i-moon{display:none}}
.top nav a.btn{margin-left:8px;color:var(--cta-fg);padding:10px 18px}.top nav a.btn:hover{background:#3ed56b}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 24px;border-radius:12px;font-weight:650;font-size:1rem;text-decoration:none;border:1px solid transparent;cursor:pointer;transition:transform .18s,background-color .18s,border-color .18s,box-shadow .18s}
.btn.primary{background:var(--cta);color:var(--cta-fg);box-shadow:0 6px 20px rgba(31,179,74,.28)}.btn.primary:hover{background:#3ed56b;transform:translateY(-1px)}
.btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.28)}.btn.ghost:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.5)}
.btn.line{background:var(--surface);color:var(--fg);border-color:var(--line)}.btn.line:hover{border-color:var(--accent)}
.btn:active{transform:translateY(0)}

/* hero (always dark) */
.hero{position:relative;overflow:hidden;color:#eef6f1;background:radial-gradient(900px 480px at 85% -10%,rgba(0,147,38,.35),transparent 65%),radial-gradient(700px 400px at -10% 110%,rgba(22,53,92,.7),transparent 60%),#07100c;padding:72px 0 88px}
.hero .wrap{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:48px;align-items:center}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.85rem;font-weight:600;color:#9be5b1;background:rgba(0,147,38,.16);border:1px solid rgba(67,211,107,.3);padding:6px 14px;border-radius:99px}
.eyebrow img{width:18px;height:18px}
.hero h1{font-size:clamp(2.2rem,5.4vw,3.7rem);margin:20px 0 18px}.hero h1 em{font-style:normal;color:#43d36b;background:linear-gradient(100deg,#43d36b,#9be5b1 45%,#43d36b);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.hero .lead{font-size:1.15rem;color:#bfd3c6;max-width:560px;margin-bottom:28px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.chips{display:flex;gap:10px 18px;flex-wrap:wrap;margin:28px 0 0;padding:0;list-style:none}.chips li{display:inline-flex;align-items:center;gap:6px;font-size:.9rem;color:#bfd3c6}.chips svg{color:#43d36b;flex:none}
.term{margin-top:28px;max-width:560px;background:#0b1812;border:1px solid #1f3528;border-radius:12px;overflow:hidden}
.term .bar{display:flex;gap:6px;padding:10px 14px;border-bottom:1px solid #1f3528}.term .bar i{width:10px;height:10px;border-radius:50%;background:#2a4636}
.term pre{margin:0;padding:14px 16px;overflow-x:auto;color:#d6ebdd;font:.84rem/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.term b{color:#43d36b;font-weight:600}
.preview{background:#0e1a14;border:1px solid #1f3528;border-radius:16px;padding:14px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.preview .bar{display:flex;align-items:center;gap:6px;padding:2px 4px 12px;color:#7f9a89;font-size:.8rem}.preview .bar i{width:10px;height:10px;border-radius:50%;background:#2a4636}.preview .bar span{margin-left:8px}
.preview .stack{display:grid;gap:12px}

.hero .wrap>div:first-child>*{animation:rise .7s cubic-bezier(.2,.7,.2,1) both}.hero .wrap>div:first-child>:nth-child(2){animation-delay:.08s}.hero .wrap>div:first-child>:nth-child(3){animation-delay:.16s}.hero .wrap>div:first-child>:nth-child(4){animation-delay:.24s}.hero .wrap>div:first-child>:nth-child(5){animation-delay:.32s}.hero .wrap>div:first-child>:nth-child(6){animation-delay:.4s}
.hero .preview{animation:rise .9s .2s cubic-bezier(.2,.7,.2,1) both}.hero .preview .stack{animation:float 7s 1.2s ease-in-out infinite}
.hero:before{content:"";position:absolute;inset:-20% -10% auto auto;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(67,211,107,.22),transparent 65%);animation:glow 9s ease-in-out infinite;pointer-events:none}
.hero .wrap{position:relative}
.js .rv{opacity:0;transform:translateY(22px);transition:opacity .6s cubic-bezier(.2,.7,.2,1) var(--d,0ms),transform .6s cubic-bezier(.2,.7,.2,1) var(--d,0ms),border-color .2s,box-shadow .2s}.js .rv.in{opacity:1;transform:none}
.js .card.rv.in:hover,.js .showcase figure.rv.in:hover{transform:translateY(-3px);transition-delay:0ms}
@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes glow{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}
/* card images: reserve space so nothing jumps while they load */
.shot{display:block;width:100%;aspect-ratio:495/195;object-fit:contain;background:var(--surface-2);border-radius:10px}
.preview .shot{background:#122219}

section{padding:88px 0}.alt{background:var(--surface-2)}
.head{max-width:680px;margin-bottom:40px}.head .kicker{display:block;font-size:.82rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}.head p{color:var(--muted);margin-top:12px;font-size:1.05rem}
.center{text-align:center;margin-inline:auto}

.showcase{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:20px}
.showcase figure{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:var(--shadow);transition:transform .2s,border-color .2s}.showcase figure:hover{transform:translateY(-3px);border-color:var(--accent)}
.showcase figcaption{font-size:.9rem;color:var(--muted);margin:10px 4px 2px}

.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:20px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:26px;transition:transform .2s,border-color .2s,box-shadow .2s}.card:hover{transform:translateY(-3px);border-color:var(--accent);box-shadow:var(--shadow)}
.card .ico{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--surface-2);color:var(--accent);margin-bottom:16px}.alt .card .ico{background:var(--bg)}
.card p{color:var(--muted);margin-top:8px;font-size:.97rem}

.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px;padding:0;margin:0;list-style:none;counter-reset:s}
.steps li{counter-increment:s;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:26px}
.steps li:before{content:counter(s);display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--cta);color:var(--cta-fg);font-weight:800;margin-bottom:16px}
.steps p{color:var(--muted);margin-top:8px}
.code{margin:28px 0 0;background:#0b1812;color:#d6ebdd;border:1px solid #1f3528;border-radius:12px;padding:16px 18px;overflow-x:auto;font:.88rem/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre}
.note{margin-top:18px;color:var(--muted)}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:24px 16px;text-align:center}.stat b{display:block;font-size:2.3rem;line-height:1.1;color:var(--accent);letter-spacing:-.02em}.stat span{display:block;margin-top:6px;color:var(--muted);font-size:.92rem}

/* SylvenOS */
.syl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:40px;align-items:center;background:radial-gradient(600px 300px at 100% 0,rgba(0,147,38,.28),transparent 65%),#07100c;color:#eef6f1;border:1px solid #1f3528;border-radius:24px;padding:48px}
.syl .logo{width:148px;height:auto;filter:drop-shadow(0 8px 24px rgba(0,147,38,.35))}
.syl .word{font-size:2rem;font-weight:800;letter-spacing:.01em;line-height:1}.syl .word span{color:#43d36b}
.syl .motto{display:inline-block;margin:12px 0 18px;padding:5px 14px;border:1px solid rgba(67,211,107,.4);border-radius:99px;color:#9be5b1;font-weight:650;font-size:.92rem}
.syl p{color:#bfd3c6;max-width:620px}.syl p+p{margin-top:12px}
.syl .links{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.syl .btn.ghost{min-height:44px;padding:10px 18px}

/* FAQ */
.faq{max-width:780px;margin:0 auto}
details{background:var(--surface);border:1px solid var(--line);border-radius:14px;margin:12px 0;transition:border-color .18s}details[open],details:hover{border-color:var(--accent)}
summary{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;font-weight:650;padding:18px 22px;min-height:56px;list-style:none;border-radius:14px}summary::-webkit-details-marker{display:none}
summary svg{flex:none;color:var(--accent);transition:transform .2s}details[open] summary svg{transform:rotate(180deg)}
details p{color:var(--muted);padding:0 22px 20px}

.final{background:radial-gradient(700px 300px at 50% 0,rgba(0,147,38,.3),transparent 70%),#07100c;color:#eef6f1;text-align:center;padding:88px 0}.final p{color:#bfd3c6;margin:14px auto 28px;max-width:520px}.final .btns{justify-content:center}

footer{background:#050b08;color:#9db3a5;padding:44px 0 36px;font-size:.93rem}
footer .row{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start;justify-content:space-between}
footer .who{display:flex;gap:12px;align-items:center;color:#eef6f1;font-weight:650}footer .who img{width:36px;height:auto}
footer nav{display:flex;flex-wrap:wrap;gap:4px 8px}footer nav a,footer .legal a{color:#c9dccf;text-decoration:none;padding:8px 10px;border-radius:8px;display:inline-block}footer nav a:hover,footer .legal a:hover{color:#fff;text-decoration:underline}
footer .legal{margin-top:24px;padding-top:20px;border-top:1px solid #16271e;line-height:1.7}footer .legal a{padding:0;text-decoration:underline}

/* responsive: large screens, laptops, tablets, phones, small phones, landscape and touch */
@media(min-width:1500px){html{font-size:106%}.wrap{max-width:1280px}}
@media(min-width:1900px){html{font-size:118%}.wrap{max-width:1440px}.hero{padding:96px 0 112px}}
@media(max-width:1024px){.hero .wrap{gap:32px}.preview{padding:12px}}
@media(max-width:900px){.hero{padding:48px 0 64px}.hero .wrap{grid-template-columns:minmax(0,1fr);gap:40px}.preview,.term{max-width:640px}section{padding:64px 0}.syl{grid-template-columns:minmax(0,1fr);gap:24px;padding:32px 24px;text-align:left}.syl .logo{width:96px}.final{padding:64px 0}.top nav a.opt{display:none}.head{margin-bottom:28px}}
@media(max-width:640px){.btns .btn{flex:1 1 100%}.top nav a.btn{margin-left:0}.stat b{font-size:1.9rem}.hero{padding:36px 0 52px}.hero .lead{font-size:1.05rem}.chips{gap:8px 14px}section{padding:52px 0}.wrap{padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right))}.card,.steps li{padding:20px}summary{padding:14px 16px}details p{padding:0 16px 16px}.syl{padding:26px 18px;border-radius:18px}.final{padding:52px 0}.code{font-size:.8rem;padding:14px}footer .row{flex-direction:column;gap:16px}}
@media(max-width:420px){.top .wrap{gap:8px;min-height:60px}.brand span{font-size:.95rem}.top nav a.btn{padding:8px 14px;font-size:.92rem;min-height:44px}.tt{margin-left:0}.hero h1{font-size:2rem}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.eyebrow{font-size:.8rem}.term pre{font-size:.75rem}}
@media(max-width:350px){.brand span{display:none}.btn{padding-left:16px;padding-right:16px}}
@media(max-height:480px) and (orientation:landscape){.top{position:static}.hero{padding:28px 0 36px}section{padding:40px 0}}
@media(hover:none){.card:hover,.showcase figure:hover,.btn:hover,.tt:hover,.js .card.rv.in:hover,.js .showcase figure.rv.in:hover{transform:none}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{transition:none!important;animation:none!important}.card:hover,.showcase figure:hover,.btn:hover,.tt:hover{transform:none}.js .rv{opacity:1;transform:none}.hero h1 em{-webkit-text-fill-color:currentColor;background:none}}`;

const demo = (origin: string, card: string, extra = '') => `${esc(origin)}/api/${card}?username=${DEMO_USER}&amp;theme=auto${extra}`;
export const faqItem = (q: string, a: string) =>
  `      <details><summary><span>${esc(q)}</span>${icon(ICONS.chevron, 20)}</summary><p>${esc(a)}</p></details>`;

/** Sticky dark header with the theme toggle. `links` are the optional (hidden on phones) nav anchors. */
export const headerHtml = (links: string) => `<header class="top">
  <div class="wrap">
    <a class="brand" href="/" aria-label="GithubStudio home"><img src="/favicon.svg" alt="" width="32" height="32"><span>GithubStudio</span></a>
    <nav aria-label="Main">${links}<button class="tt" id="theme" type="button" aria-label="Switch theme" title="Switch light and dark theme"><span class="i-moon">${icon(ICONS.moon, 20)}</span><span class="i-sun">${icon(ICONS.sun, 20)}</span></button><a class="btn primary" href="/app">Open the app</a></nav>
  </div>
</header>`;

/** Footer with the SylvenOS logo and a copyright year taken from the current date. */
export const footerHtml = () => `<footer>
  <div class="wrap">
    <div class="row">
      <div class="who"><img src="/sylvenos-logo-40.webp" alt="" width="36" height="38" loading="lazy"><span>${esc(SITE.name)} &middot; by ${esc(SITE.org.name)}</span></div>
      <nav aria-label="Footer"><a href="/app">App</a><a href="/about">About</a><a href="/llms.txt">llms.txt</a><a href="/api/openapi.json">API</a><a href="${esc(SITE.repo)}/blob/main/SECURITY.md" rel="noopener">Security</a><a href="${esc(SITE.repo)}" rel="noopener">GitHub</a></nav>
    </div>
    <p class="legal">&copy; ${new Date().getFullYear()} <a href="${esc(SITE.org.url)}" rel="noopener">${esc(SITE.org.name)}</a>. ${esc(SITE.name)} is released under the <a href="${esc(SITE.license.url)}" rel="noopener">${esc(SITE.license.name)} licence</a>. ${esc(SITE.org.motto)}</p>
  </div>
</footer>`;

/** The landing page at `/`: server-rendered, no framework, readable by people, crawlers and AI assistants without JavaScript. */
export function landingHtml(origin: string): string {
  const o = esc(origin);
  const n = cards.length;
  const t = Object.keys(themes).length;
  const f = faqs(origin).slice(0, 6);
  const feature = (ic: string, title: string, text: string) => `        <div class="card"><div class="ico">${icon(ic)}</div><h3>${title}</h3><p>${text}</p></div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GithubStudio - free GitHub stats cards and README studio</title>
<meta name="description" content="GithubStudio is a free, open-source GitHub stats API, card store and README studio by SylvenOS. ${n} cards, ${t} themes, SVG, JSON and text output.">
<link rel="canonical" href="${o}/">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="author" content="${esc(SITE.developer.name)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#07100c">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GithubStudio">
<meta property="og:title" content="GithubStudio - free GitHub stats cards and README studio">
<meta property="og:description" content="Free, open-source stats cards, profile designs and a README studio. An open-source project by SylvenOS.">
<meta property="og:url" content="${o}/">
<meta property="og:image" content="${o}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="GithubStudio: sample GitHub stats, languages and streak cards next to the logo">
<meta property="og:image" content="${o}/og-square.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="GithubStudio - free GitHub stats cards and README studio">
<meta name="twitter:description" content="Free, open-source stats cards, profile designs and a README studio by SylvenOS.">
<meta name="twitter:image" content="${o}/og.jpg">
<meta name="twitter:image:alt" content="GithubStudio: sample GitHub stats, languages and streak cards next to the logo">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<link rel="alternate" type="application/json" href="/api/openapi.json" title="OpenAPI">
<style>${PAGE_CSS}</style>
<script>${HEAD_SCRIPT}</script>
<script type="application/ld+json">${jsonLd(origin, { faq: true, faqId: `${origin}/#faq`, faqCount: f.length })}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${headerHtml(`<a class="opt" href="#features">Features</a><a class="opt" href="#how">How it works</a><a class="opt" href="#faq">FAQ</a><a class="opt" href="${esc(SITE.repo)}" rel="noopener">GitHub</a>`)}

<div class="hero">
  <div class="wrap">
    <div>
      <span class="eyebrow"><img src="/sylvenos-logo-40.webp" alt="" width="18" height="19">Open source by ${esc(SITE.org.name)}</span>
      <h1>Make your GitHub profile <em>worth a second look</em></h1>
      <p class="lead">${esc(SITE.name)} turns your public GitHub data into stats cards, streaks, trophies and complete README designs. Free, open source and ready to paste.</p>
      <div class="btns"><a class="btn primary" href="/app">Open the playground</a><a class="btn ghost" href="${esc(SITE.repo)}" rel="noopener">${icon(ICONS.star, 18)}Star on GitHub</a></div>
      <ul class="chips"><li>${icon(ICONS.check, 16)}${n} cards</li><li>${icon(ICONS.check, 16)}${t} themes</li><li>${icon(ICONS.check, 16)}${esc(SITE.license.name)} licence</li><li>${icon(ICONS.check, 16)}No cookies</li></ul>
      <div class="term" role="group" aria-label="Example Markdown"><div class="bar" aria-hidden="true"><i></i><i></i><i></i></div><pre><code>![Stats](${o}/api/<b>stats</b>?username=<b>YOU</b>&amp;theme=auto)</code></pre></div>
    </div>
    <div class="preview" aria-label="Example README with live cards">
      <div class="bar" aria-hidden="true"><i></i><i></i><i></i><span>README.md</span></div>
      <div class="stack">
        <img class="shot" src="${demo(origin, 'stats')}" alt="GitHub stats card for ${DEMO_USER}" width="495" height="195" fetchpriority="high">
        <img class="shot" src="${demo(origin, 'streak')}" alt="Contribution streak card for ${DEMO_USER}" width="495" height="195">
      </div>
    </div>
  </div>
</div>

<main id="main">
  <section id="cards">
    <div class="wrap">
      <div class="head"><span class="kicker">Live from the API</span><h2>Real cards, rendered right now</h2><p>Each image below is a normal request to this server. Yours will look the same, with your data.</p></div>
      <div class="showcase">
        <figure><img class="shot" src="${demo(origin, 'languages')}" alt="Top languages card for ${DEMO_USER}" width="495" height="195" loading="lazy"><figcaption>Top languages</figcaption></figure>
        <figure><img class="shot" src="${demo(origin, 'contributions')}" alt="Contribution graph card for ${DEMO_USER}" width="495" height="195" loading="lazy"><figcaption>Contribution graph</figcaption></figure>
        <figure><img class="shot" src="${demo(origin, 'achievements')}" alt="Trophies card for ${DEMO_USER}" width="495" height="195" loading="lazy"><figcaption>Trophies</figcaption></figure>
      </div>
    </div>
  </section>

  <section id="features" class="alt">
    <div class="wrap">
      <div class="head"><span class="kicker">Features</span><h2>Everything for a standout profile</h2><p>One small service, many ways to show your work.</p></div>
      <div class="grid">
${feature(ICONS.grid, `${n} cards`, 'Stats, languages, streaks, contribution graphs, trophies, year in review, repository timelines, tech radar and more.')}
${feature(ICONS.palette, `${t} themes, any style`, 'Light, dark or <code>theme=auto</code>. Override any colour, font, size, border or shadow with a query option.')}
${feature(ICONS.template, 'README Studio', 'Design a whole profile README visually, then export it with a workflow that keeps the images fresh.')}
${feature(ICONS.braces, 'SVG, JSON and text', 'Use the same data as an image, as JSON for your own tools, or as plain text.')}
${feature(ICONS.shield, 'Honest numbers', 'Every figure has a documented source and formula at <a href="/api/definitions">/api/definitions</a>. Estimates are labelled.')}
${feature(ICONS.lock, 'Private by design', 'No cookies and no analytics scripts. Public GitHub data only. Runs on the free Cloudflare Workers plan.')}
      </div>
    </div>
  </section>

  <section id="how">
    <div class="wrap">
      <div class="head"><span class="kicker">How it works</span><h2>Up and running in a minute</h2><p>No sign-up, no token, no install.</p></div>
      <ol class="steps">
        <li><h3>Pick a card</h3><p>Open the <a href="/app">playground</a>, enter your GitHub username and choose a card and theme.</p></li>
        <li><h3>Copy the Markdown</h3><p>Tune the options live, then copy the generated image link.</p></li>
        <li><h3>Paste into your README</h3><p>Add it to your profile README. That is all.</p></li>
      </ol>
      <pre class="code" tabindex="0" aria-label="Example Markdown"><code>![Stats](${o}/api/stats?username=YOUR_USERNAME&amp;theme=auto)</code></pre>
      <p class="note">Moving from github-readme-stats? ${esc(SITE.name)} understands its parameter names, so usually you only swap the host.</p>
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <div class="stats">
        <div class="stat"><b>${n}</b><span>cards</span></div>
        <div class="stat"><b>${t}</b><span>themes</span></div>
        <div class="stat"><b>3</b><span>formats: SVG, JSON, text</span></div>
        <div class="stat"><b>0</b><span>cookies</span></div>
        <div class="stat"><b>v${esc(pkg.version)}</b><span>current version</span></div>
      </div>
    </div>
  </section>

  <section id="sylvenos">
    <div class="wrap">
      <div class="syl">
        <img class="logo" src="/sylvenos-logo-160.webp" srcset="/sylvenos-logo-160.webp 1x, /sylvenos-logo.webp 2x" alt="SylvenOS logo" width="148" height="155" loading="lazy">
        <div>
          <div class="word">Sylven<span>OS</span></div>
          <span class="motto">${esc(SITE.org.motto)}</span>
          <p>${esc(SITE.name)} is an open-source project by <a href="${esc(SITE.org.url)}" rel="noopener" style="color:#43d36b">${esc(SITE.org.name)}</a>, an organisation focused on learning, building and educating.</p>
          <p>The code is public under the ${esc(SITE.license.name)} licence, so you can read it, use it, change it and host it yourself. Found a bug or want a new card? Open an issue or send a pull request.</p>
          <div class="links"><a class="btn ghost" href="${esc(SITE.org.url)}" rel="noopener">Visit ${esc(SITE.org.name)}${icon(ICONS.arrow, 16)}</a><a class="btn ghost" href="${esc(SITE.repo)}" rel="noopener">Source code${icon(ICONS.arrow, 16)}</a><a class="btn ghost" href="/about">About the project</a></div>
        </div>
      </div>
    </div>
  </section>

  <section id="faq" class="alt">
    <div class="wrap">
      <div class="head center" style="text-align:center"><span class="kicker">FAQ</span><h2>Questions, answered</h2><p>The short version. The full list is on the <a href="/about">About page</a>.</p></div>
      <div class="faq">
${f.map((x) => faqItem(x.q, x.a)).join('\n')}
      </div>
    </div>
  </section>

  <div class="final">
    <div class="wrap">
      <h2>Ready to try it?</h2>
      <p>Type your username and see every card with your own data.</p>
      <div class="btns"><a class="btn primary" href="/app">Open the playground</a><a class="btn ghost" href="/app#tab=builder">Design a README</a></div>
    </div>
  </div>
</main>

${footerHtml()}
<script>${UI_SCRIPT}</script>
</body>
</html>`;
}
