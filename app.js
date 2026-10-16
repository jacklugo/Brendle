import { AIRPORTS, ANSWER_CODES } from './data/airports.js';
import { AIRCRAFT } from './data/aircraft.js';
import { WORLD_PATHS } from './data/world.js';

/* ---------- day + seeding ---------- */
const EPOCH = new Date(2026, 9, 16); // Brendle #1 = Oct 16, 2026 (local midnight)
function todayIndex() {
  const n = new Date();
  const t = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((t - EPOCH) / 86400000);
}
const DAY = todayIndex();
const PUZZLE_NO = DAY + 1;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(list, seed) {
  const r = mulberry32(seed), a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Walks a fresh shuffle every full cycle so each list repeats as rarely as possible.
function dailyPick(list, salt, day = DAY) {
  const n = list.length, cycle = Math.floor(day / n), idx = ((day % n) + n) % n;
  return shuffled(list, salt * 1000 + cycle)[idx];
}

/* ---------- data helpers ---------- */
const BY_CODE = Object.fromEntries(AIRPORTS.map(a => [a.i, a]));
const CITY_FIX = {
  IAD: 'Washington, D.C.', DCA: 'Washington, D.C.', PTY: 'Panama City', SJO: 'San José', EZE: 'Buenos Aires',
  CDG: 'Paris', MXP: 'Milan', OSL: 'Oslo', HEL: 'Helsinki', EDI: 'Edinburgh', MAN: 'Manchester', ATH: 'Athens',
  BRU: 'Brussels', KUL: 'Kuala Lumpur', MNL: 'Manila', TPE: 'Taipei', NRT: 'Tokyo', PVG: 'Shanghai', CAN: 'Guangzhou',
  HAN: 'Hanoi', DPS: 'Bali', CTU: 'Chengdu', SYD: 'Sydney', HNL: 'Honolulu', CVG: 'Cincinnati', RDU: 'Raleigh–Durham',
  NCE: 'Nice', GIG: 'Rio de Janeiro', DFW: 'Dallas–Fort Worth', FRA: 'Frankfurt', HKG: 'Hong Kong', SIN: 'Singapore',
};
const city = a => CITY_FIX[a.i] || a.c || a.n;
const CONTINENT = { NA: 'North America', SA: 'South America', EU: 'Europe', AF: 'Africa', AS: 'Asia', OC: 'Oceania' };

const R_MI = 3958.8, rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
function miles(a, b) {
  const dLat = rad(b.la - a.la), dLon = rad(b.lo - a.lo);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.la)) * Math.cos(rad(b.la)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}
function bearing(a, b) {
  const y = Math.sin(rad(b.lo - a.lo)) * Math.cos(rad(b.la));
  const x = Math.cos(rad(a.la)) * Math.sin(rad(b.la)) - Math.sin(rad(a.la)) * Math.cos(rad(b.la)) * Math.cos(rad(b.lo - a.lo));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
const ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];
const arrowFor = b => ARROWS[Math.round(b / 45) % 8];
const fmt = n => Math.round(n).toLocaleString('en-US');

/* ---------- today's puzzles ---------- */
const LAYOVER = BY_CODE[dailyPick(ANSWER_CODES, 11)];
const HANGAR = dailyPick(AIRCRAFT, 23);
const WHERE = (() => {
  const order = shuffled(ANSWER_CODES.filter(c => c !== LAYOVER.i), 37000 + DAY);
  // One city per continent first, then fill; never two from the same city or country.
  const picks = [], seenCity = new Set(), seenCountry = new Set(), perCont = {};
  for (const cap of [1, 2]) for (const c of order) {
    if (picks.length === 5) break;
    const a = BY_CODE[c];
    if (seenCity.has(city(a)) || seenCountry.has(a.k) || (perCont[a.r] || 0) >= cap) continue;
    seenCity.add(city(a)); seenCountry.add(a.k); perCont[a.r] = (perCont[a.r] || 0) + 1; picks.push(a);
  }
  return picks;
})();

/* ---------- storage ---------- */
const KEY = `brendle:day:${DAY}`;
function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const state = Object.assign({ layover: { g: [] }, where: { r: [] }, hangar: { g: [] } }, load(KEY, {}));
const persist = () => save(KEY, state);

function recordResult(game, won, score) {
  const s = load('brendle:stats', {});
  const g = s[game] || { played: 0, won: 0, streak: 0, best: 0, last: null, dist: {} };
  if (g.last === DAY) return;
  g.played++;
  if (won) { g.won++; g.streak = g.last === DAY - 1 ? g.streak + 1 : 1; g.best = Math.max(g.best, g.streak); }
  else g.streak = 0;
  if (score != null) g.dist[score] = (g.dist[score] || 0) + 1;
  g.last = DAY; s[game] = g; save('brendle:stats', s);
}

/* ---------- Brendan bits ---------- */
const MASCOT = `<svg viewBox="0 0 120 120" aria-hidden="true">
  <circle cx="60" cy="60" r="58" fill="#cfe6d4"/>
  <path d="M22 120c2-20 18-30 38-30s36 10 38 30z" fill="#fff" stroke="#15191e" stroke-width="2.5"/>
  <path d="M50 92q10 7 20 0" fill="none" stroke="#15191e" stroke-width="2"/>
  <rect x="51" y="82" width="18" height="12" rx="4" fill="#f0c3a1"/>
  <circle cx="31" cy="64" r="7" fill="#eab592" stroke="#15191e" stroke-width="2"/>
  <circle cx="89" cy="64" r="7" fill="#eab592" stroke="#15191e" stroke-width="2"/>
  <ellipse cx="60" cy="62" rx="29" ry="31" fill="#f4caa8" stroke="#15191e" stroke-width="2.5"/>
  <path d="M31 56c0-6 2-10 4-12l2 14zM89 56c0-6-2-10-4-12l-2 14z" fill="#7a5433"/>
  <path d="M29 54C29 27 44 15 60 15s31 12 31 39c-10-4-20-6-31-6s-21 2-31 6z" fill="#1b1d21" stroke="#15191e" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M47 50c0-12 26-12 26 0z" fill="#7a5433"/>
  <rect x="45" y="44" width="30" height="6" rx="2" fill="#1b1d21"/>
  <rect x="56" y="42.5" width="8" height="9" rx="1.5" fill="none" stroke="#d7dce3" stroke-width="2"/>
  <path d="M43 62q5-4 10 0M67 62q5-4 10 0" fill="none" stroke="#15191e" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M45 66q4 3 8 0M67 66q4 3 8 0" fill="none" stroke="#15191e" stroke-width="2" stroke-linecap="round"/>
  <circle cx="41" cy="73" r="4" fill="#ef9f88" opacity=".55"/><circle cx="79" cy="73" r="4" fill="#ef9f88" opacity=".55"/>
  <path d="M44 75q16 3 32 0q-3 15-16 15t-16-15z" fill="#fff" stroke="#15191e" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M46 77.5q14 2 28 0" fill="none" stroke="#15191e" stroke-width="1.2" opacity=".5"/>
</svg>`;
const pickLine = (lines, salt) => lines[Math.floor(mulberry32(DAY * 97 + salt)() * lines.length)];
const QUIPS = {
  layover: [
    'Brendan has a tight connection. Find his gate before boarding closes.',
    'Cap goes backwards, tray table stays up. Where is Brendan connecting?',
    'Brendan is somewhere airside with a smile and a pretzel. Which airport?',
  ],
  where: [
    'Brendan keeps sending pics from the window seat. Pin where he landed.',
    'Five stops, one backwards cap. Track him down.',
    'Brendan does not post his location. That is your job.',
  ],
  hangar: [
    'A mystery jet rolled into Brendan Air\'s hangar. Name it.',
    'Brendan swears he can tell them apart by the engine sound. Can you?',
    'New aircraft in the fleet. Brendan wants to know if you are a real avgeek.',
  ],
};

/* ---------- UI utils ---------- */
const $app = document.getElementById('app');
const h = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
const modal = document.getElementById('modal');
function openModal(html) { document.getElementById('modalBody').innerHTML = html; modal.showModal(); }
document.getElementById('modalClose').onclick = () => modal.close();
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

function untilTomorrow() {
  const n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), s = Math.floor((t - n) / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
let cdTimer;
function startCountdown() {
  clearInterval(cdTimer);
  cdTimer = setInterval(() => document.querySelectorAll('.countdown span').forEach(e => e.textContent = untilTomorrow()), 1000);
}
const SITE = location.origin + location.pathname;

async function share(text) {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); toast('Copied. Paste it in the group chat'); }
  catch { openModal(`<h3>Copy your result</h3><pre class="share">${esc(text)}</pre>`); }
}

/* autocomplete */
function makeSearch({ placeholder, items, render, onPick }) {
  const wrap = h(`<div class="search"><input type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${placeholder}" aria-label="${placeholder}"><ul class="suggest" hidden></ul></div>`);
  const input = wrap.querySelector('input'), ul = wrap.querySelector('ul');
  let results = [], active = 0;
  function draw() {
    ul.innerHTML = '';
    if (!results.length) { ul.hidden = true; return; }
    results.forEach((r, i) => {
      const li = h(`<li><button type="button" class="${i === active ? 'active' : ''}">${render(r)}</button></li>`);
      li.firstChild.addEventListener('pointerdown', e => { e.preventDefault(); pick(r); });
      ul.appendChild(li);
    });
    ul.hidden = false;
  }
  function pick(r) { input.value = ''; results = []; draw(); onPick(r); }
  input.addEventListener('input', () => { results = items(input.value.trim()); active = 0; draw(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { active = Math.min(active + 1, results.length - 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && results[active]) { pick(results[active]); e.preventDefault(); }
    else if (e.key === 'Escape') { results = []; draw(); }
  });
  input.addEventListener('blur', () => setTimeout(() => { results = []; draw(); }, 100));
  return wrap;
}

/* ================= HOME ================= */
const GAMES = [
  { id: 'layover', gate: 'Gate A1 · Airports', title: "Brendan's Layover", desc: 'Guess the mystery airport in 6. Every miss tells you how far and which way.' },
  { id: 'where', gate: 'Gate B2 · Geography', title: "Where's Brendan?", desc: 'Five cities, one world map. Tap where he landed. Fewest miles off wins.' },
  { id: 'hangar', gate: 'Gate C3 · Planes', title: "Brendan's Hangar", desc: 'Name the mystery aircraft in 6 using maker, engines, seats, range and age.' },
];
function statusOf(id) {
  if (id === 'layover') { const s = state.layover; if (!s.done) return s.g.length ? { cls: 'todo', big: `${s.g.length}/6`, small: 'boarding' } : { cls: 'todo', big: '▶', small: 'play' }; return s.won ? { cls: 'done', big: `${s.g.length}/6`, small: 'landed' } : { cls: 'lost', big: 'X/6', small: 'missed' }; }
  if (id === 'where') { const s = state.where; if (!s.done) return s.r.length ? { cls: 'todo', big: `${s.r.length}/5`, small: 'in flight' } : { cls: 'todo', big: '▶', small: 'play' }; return { cls: 'done', big: fmt(whereTotal()), small: 'mi off' }; }
  const s = state.hangar; if (!s.done) return s.g.length ? { cls: 'todo', big: `${s.g.length}/6`, small: 'taxiing' } : { cls: 'todo', big: '▶', small: 'play' }; return s.won ? { cls: 'done', big: `${s.g.length}/6`, small: 'cleared' } : { cls: 'lost', big: 'X/6', small: 'grounded' };
}
function renderHome() {
  const allDone = state.layover.done && state.where.done && state.hangar.done;
  const anyDone = state.layover.done || state.where.done || state.hangar.done;
  $app.innerHTML = '';
  $app.append(h(`<section class="hero">${MASCOT}<div><h1>Fly with Brendan</h1><p>Three new flights every day. Same puzzles for everyone, so send your board to the crew and see who's the real captain.</p></div></section>`));
  GAMES.forEach(g => {
    const st = statusOf(g.id);
    const b = h(`<button class="pass"><div class="gate">${g.gate}</div><div class="title">${g.title}</div><div class="desc">${g.desc}</div><div class="status ${st.cls}"><span class="big">${st.big}</span>${st.small}</div></button>`);
    b.onclick = () => go(g.id);
    $app.append(b);
  });
  const shareBtn = h(`<button class="btn block" ${anyDone ? '' : 'disabled'}>${allDone ? 'Share today’s boarding pass' : anyDone ? 'Share what you’ve finished' : 'Play a game to share'}</button>`);
  shareBtn.onclick = () => share(shareAll());
  $app.append(shareBtn);
  $app.append(h(`<p class="countdown" style="text-align:center">Next flights board in <span>${untilTomorrow()}</span></p>`));
  $app.append(h(`<p class="foot">Airport data: <a href="https://ourairports.com/data/" target="_blank" rel="noopener">OurAirports</a> · Map: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a><br>Aircraft figures are typical, approximate values.</p>`));
  startCountdown();
}

/* ================= LAYOVER ================= */
function layoverRow(code) {
  const a = BY_CODE[code], d = miles(a, LAYOVER), win = code === LAYOVER.i;
  const prox = Math.max(0, Math.round(100 - d / 12450 * 100));
  return { a, d, win, prox, arrow: win ? '🛬' : arrowFor(bearing(a, LAYOVER)) };
}
function airportItems(q) {
  if (!q) return [];
  const Q = q.toUpperCase(), ql = q.toLowerCase(), used = new Set(state.layover.g);
  const out = [];
  for (const a of AIRPORTS) {
    if (used.has(a.i)) continue;
    let s = 0;
    if (a.i === Q) s = 100; else if (a.i.startsWith(Q)) s = 60;
    else if (city(a).toLowerCase().startsWith(ql)) s = 50;
    else if (a.n.toLowerCase().includes(ql) || city(a).toLowerCase().includes(ql)) s = 30;
    else if (a.k.toLowerCase().startsWith(ql)) s = 20;
    if (s) out.push([s + (ANSWER_CODES.includes(a.i) ? 5 : 0), a]);
  }
  return out.sort((x, y) => y[0] - x[0]).slice(0, 8).map(x => x[1]);
}
function renderLayover() {
  const s = state.layover;
  $app.innerHTML = '';
  $app.append(h(`<div class="gamehead"><div class="gate">Gate A1 · Brendle #${PUZZLE_NO}</div><h2>Brendan's Layover</h2><p>Guess the airport by name, city or 3-letter code. Arrows point toward Brendan.</p></div>`));
  $app.append(h(`<div class="quip">${MASCOT}<span>${pickLine(QUIPS.layover, 1)}</span></div>`));
  if (!s.done) {
    $app.append(makeSearch({
      placeholder: 'Search airport, city or code',
      items: airportItems,
      render: a => `<span class="code">${a.i}</span><span class="meta">${esc(city(a))}, ${esc(a.k)} · ${esc(a.n)}</span>`,
      onPick: a => {
        s.g.push(a.i);
        if (a.i === LAYOVER.i) { s.done = true; s.won = true; recordResult('layover', true, s.g.length); }
        else if (s.g.length >= 6) { s.done = true; s.won = false; recordResult('layover', false, 'X'); }
        persist(); renderLayover();
        if (!s.done) setTimeout(() => document.querySelector('.search input')?.focus(), 50);
      },
    }));
  }
  const board = h('<div class="board"></div>');
  for (let i = 0; i < 6; i++) {
    const code = s.g[i];
    if (!code) { board.append(h(`<div class="slot empty"><span class="mono" style="color:var(--muted);font-size:12px">${i + 1}</span></div>`)); continue; }
    const r = layoverRow(code);
    board.append(h(`<div class="slot ${r.win ? 'win' : ''}"><div class="code">${code}</div><div class="place"><b>${esc(city(r.a))}</b>${esc(r.a.k)}</div><div class="dist">${r.win ? 'You found him' : fmt(r.d) + ' mi'}<small>${r.prox}% close</small></div><div class="arrow">${r.arrow}</div></div>`));
  }
  $app.append(board);
  if (!s.done && s.g.length >= 3) {
    $app.append(h(`<p class="hint">Hint: Brendan is in <b>${CONTINENT[LAYOVER.r]}</b>${s.g.length >= 5 ? `, specifically <b>${esc(LAYOVER.k)}</b>` : ''}.</p>`));
  }
  if (s.done) {
    $app.append(endCard(
      s.won ? (s.g.length <= 2 ? 'Smooth landing, Captain' : 'Made the connection') : 'Brendan missed his flight',
      `It was <span class="answer">${LAYOVER.i}</span>, ${esc(LAYOVER.n)} in ${esc(city(LAYOVER))}, ${esc(LAYOVER.k)}.`,
      shareLayover(), 'layover'));
  }
}
function shareLayover() {
  const s = state.layover; if (!s.done) return null;
  const line = s.g.map(c => layoverRow(c).win ? '🟩' : layoverRow(c).arrow).join('');
  return `🛫 Layover ${s.won ? s.g.length : 'X'}/6 ${line}`;
}

/* ================= WHERE'S BRENDAN ================= */
const KY = 1.35; // vertical stretch so the map is taller on phones
const VB0 = { x: 0, y: 4 * KY, w: 360, h: 160 * KY };
let vb = { ...VB0 }, pending = null;
function whereTotal() { return state.where.r.reduce((t, r) => t + r.d, 0); }
const whereEmoji = d => d < 100 ? '🎯' : d < 300 ? '🟩' : d < 750 ? '🟨' : d < 1500 ? '🟧' : '🟥';
function renderWhere() {
  const s = state.where;
  const round = s.r.length, cur = WHERE[Math.min(round, 4)];
  const showingResult = s.r.length > 0 && s.showLast;
  $app.innerHTML = '';
  $app.append(h(`<div class="gamehead"><div class="gate">Gate B2 · Brendle #${PUZZLE_NO}</div><h2>Where's Brendan?</h2><p>Tap the map to drop a pin. Drag to pan, use + and − to zoom.</p></div>`));
  if (round === 0 && !pending) $app.append(h(`<div class="quip">${MASCOT}<span>${pickLine(QUIPS.where, 2)}</span></div>`));

  const target = showingResult ? WHERE[round - 1] : cur;
  const legs = [0, 1, 2, 3, 4].map(i => `<span class="${i < round ? 'done' : i === round && !s.done ? 'on' : ''}"></span>`).join('');
  const prompt = h(`<div class="prompt"><div class="gate">${s.done && !showingResult ? 'All legs complete' : `Leg ${showingResult ? round : round + 1} of 5`}</div>
    <div class="city">${esc(city(target))}</div><div class="country">${esc(target.k)}</div>
    ${showingResult ? `<div class="result-line">${whereEmoji(s.r[round - 1].d)} ${fmt(s.r[round - 1].d)} mi off</div>` : ''}
    <div class="legs">${legs}</div></div>`);
  if (s.done && !showingResult) prompt.querySelector('.city').textContent = `${fmt(whereTotal())} mi total`, prompt.querySelector('.country').textContent = s.r.map(r => whereEmoji(r.d)).join(' ');
  $app.append(prompt);

  const map = buildMap();
  $app.append(map.el);
  if (showingResult) {
    const r = s.r[round - 1];
    map.marks({ guess: r.g, truth: [target.la, target.lo] });
  } else if (s.done) {
    map.marks({ all: s.r.map((r, i) => ({ guess: r.g, truth: [WHERE[i].la, WHERE[i].lo] })) });
  } else map.marks({ guess: pending });

  const actions = h('<div class="row" style="margin-top:12px"></div>');
  if (showingResult) {
    const b = h(`<button class="btn block">${round < 5 ? 'Next leg ✈️' : 'See final score'}</button>`);
    b.onclick = () => { s.showLast = false; vb = { ...VB0 }; persist(); renderWhere(); };
    actions.append(b);
  } else if (!s.done) {
    const b = h(`<button class="btn block" ${pending ? '' : 'disabled'}>${pending ? 'Lock it in' : 'Tap the map to drop a pin'}</button>`);
    b.onclick = () => {
      const g = pending, d = miles({ la: g[0], lo: g[1] }, cur);
      s.r.push({ g, d }); pending = null; s.showLast = true;
      if (s.r.length === 5) { s.done = true; recordResult('where', true, null); }
      persist(); renderWhere();
    };
    actions.append(b);
  }
  $app.append(actions);
  if (s.done && !showingResult) {
    const t = whereTotal();
    const title = t < 1000 ? 'Captain Brendan energy' : t < 2500 ? 'First Officer material' : t < 5000 ? 'Solid co-pilot' : t < 9000 ? 'Window-seat tourist' : 'Brendan is still lost';
    $app.append(endCard(title, s.r.map((r, i) => `${esc(city(WHERE[i]))}: ${fmt(r.d)} mi`).join(' · '), shareWhere(), 'where'));
  }
}
function shareWhere() {
  const s = state.where; if (!s.done) return null;
  return `🌍 Where's Brendan ${fmt(whereTotal())} mi ${s.r.map(r => whereEmoji(r.d)).join('')}`;
}
function buildMap() {
  const NS = 'http://www.w3.org/2000/svg';
  const el = h(`<div class="mapwrap"><svg xmlns="${NS}"><g transform="scale(1 ${KY})"><g class="grat"></g><g class="landg"></g></g><g class="marks"></g></svg><div class="zoom"><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button><button aria-label="Reset view" style="font-size:13px">⟲</button></div></div>`);
  const svg = el.querySelector('svg'), landg = svg.querySelector('.landg'), gratg = svg.querySelector('.grat'), marksg = svg.querySelector('.marks');
  let grat = '';
  for (let lo = -150; lo <= 150; lo += 30) grat += `<path d="M${lo + 180} 0V180"/>`;
  for (let la = -60; la <= 80; la += 30) grat += `<path d="M0 ${90 - la}H360"/>`;
  gratg.innerHTML = grat;
  landg.innerHTML = WORLD_PATHS.map(d => `<path class="land" d="${d}"/>`).join('');
  let markSpec = {};
  const apply = () => { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); drawMarks(); };
  function clamp() {
    vb.w = Math.min(360, Math.max(22.5, vb.w)); vb.h = vb.w * VB0.h / 360;
    vb.x = Math.min(360 - vb.w, Math.max(0, vb.x)); vb.y = Math.min(VB0.y + VB0.h - vb.h, Math.max(VB0.y, vb.y));
  }
  function zoomAt(f, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2) {
    const nw = Math.min(360, Math.max(22.5, vb.w / f)), k = nw / vb.w;
    vb.x = cx - (cx - vb.x) * k; vb.y = cy - (cy - vb.y) * k; vb.w = nw; clamp(); apply();
  }
  const [zin, zout, zreset] = el.querySelectorAll('.zoom button');
  zin.onclick = () => zoomAt(2); zout.onclick = () => zoomAt(0.5); zreset.onclick = () => { vb = { ...VB0 }; apply(); };
  function toSvg(cx, cy) { const r = svg.getBoundingClientRect(); return [vb.x + (cx - r.left) / r.width * vb.w, vb.y + (cy - r.top) / r.height * vb.h]; }

  const pts = new Map(); let moved = 0, pinch0 = null;
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: vb.w }; } });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), cur = [e.clientX, e.clientY]; pts.set(e.pointerId, cur);
    const r = svg.getBoundingClientRect();
    if (pts.size === 1) {
      const dx = cur[0] - prev[0], dy = cur[1] - prev[1]; moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) { vb.x -= dx / r.width * vb.w; vb.y -= dy / r.height * vb.h; clamp(); apply(); }
    } else if (pts.size === 2 && pinch0) {
      moved = 99; const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const [cx, cy] = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      zoomAt(vb.w / (pinch0.w * pinch0.d / d), cx, cy);
    }
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    const single = pts.size === 1; pts.delete(e.pointerId); if (pts.size < 2) pinch0 = null;
    if (single && moved <= 6 && e.type === 'pointerup' && !state.where.done && !state.where.showLast) {
      const [x, y] = toSvg(e.clientX, e.clientY);
      pending = [+(90 - y / KY).toFixed(3), +(x - 180).toFixed(3)];
      const keep = { ...vb }; renderWhere(); vb = keep;
      document.querySelector('.mapwrap svg')?.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    }
  };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', e => { e.preventDefault(); const [cx, cy] = toSvg(e.clientX, e.clientY); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, cx, cy); }, { passive: false });

  function drawMarks() {
    const k = vb.w / 360, out = [];
    const P = ([la, lo]) => [lo + 180, (90 - la) * KY];
    const pin = (p, color) => { const [x, y] = P(p); return `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0c-3-5-6-8-6-11a6 6 0 0 1 12 0c0 3-3 6-6 11z" fill="${color}" stroke="#fff" stroke-width="1.2"/><circle cy="-11" r="2.2" fill="#fff"/></g>`; };
    const star = (p) => { const [x, y] = P(p); return `<g transform="translate(${x} ${y}) scale(${k})"><circle r="5.5" fill="var(--leaf)" stroke="#fff" stroke-width="1.5"/><path d="M-2.6 0l1.8 1.9 3.4-3.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`; };
    const line = (a, b) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)" stroke-width="${1.4 * k}" stroke-dasharray="${3 * k} ${2.5 * k}"/>`; };
    const pairs = markSpec.all || (markSpec.truth ? [markSpec] : []);
    pairs.forEach(m => { out.push(line(m.guess, m.truth)); });
    pairs.forEach(m => { out.push(pin(m.guess, 'var(--sky)')); out.push(star(m.truth)); });
    if (!markSpec.truth && !markSpec.all && markSpec.guess) out.push(pin(markSpec.guess, 'var(--red)'));
    marksg.innerHTML = out.join('');
  }
  apply();
  return { el, marks(spec) { markSpec = spec; drawMarks(); } };
}

/* ================= HANGAR ================= */
const COLS = [
  { k: 'maker', label: 'Maker' }, { k: 'eng', label: 'Engines' }, { k: 'body', label: 'Body' },
  { k: 'seats', label: 'Seats', num: true, near: v => Math.abs(v) <= 0.15 },
  { k: 'range', label: 'Range', num: true, near: v => Math.abs(v) <= 0.15, unit: 'nm' },
  { k: 'year', label: '1st flt', num: true, nearAbs: 5 },
];
function compare(g, t, c) {
  const gv = g[c.k], tv = t[c.k];
  if (gv === tv) return { cls: 'hit', arrow: '' };
  if (!c.num) return { cls: '', arrow: '' };
  const near = c.nearAbs != null ? Math.abs(gv - tv) <= c.nearAbs : c.near((gv - tv) / tv);
  return { cls: near ? 'near' : '', arrow: tv > gv ? '↑' : '↓' };
}
function renderHangar() {
  const s = state.hangar;
  $app.innerHTML = '';
  $app.append(h(`<div class="gamehead"><div class="gate">Gate C3 · Brendle #${PUZZLE_NO}</div><h2>Brendan's Hangar</h2><p>Green is a match, yellow is close, arrows say if the mystery jet is higher or lower.</p></div>`));
  $app.append(h(`<div class="quip">${MASCOT}<span>${pickLine(QUIPS.hangar, 3)}</span></div>`));
  if (!s.done) {
    $app.append(makeSearch({
      placeholder: 'Type an aircraft (e.g. 737, A350, E175)',
      items: q => {
        if (!q) return [];
        const used = new Set(s.g), ql = q.toLowerCase().replace(/\s+/g, '');
        return AIRCRAFT.filter(a => !used.has(a.id) && (a.name.toLowerCase().replace(/\s+/g, '').includes(ql) || a.maker.toLowerCase().startsWith(q.toLowerCase()))).slice(0, 8);
      },
      render: a => `<span>${esc(a.name)}</span>`,
      onPick: a => {
        s.g.push(a.id);
        if (a.id === HANGAR.id) { s.done = true; s.won = true; recordResult('hangar', true, s.g.length); }
        else if (s.g.length >= 6) { s.done = true; s.won = false; recordResult('hangar', false, 'X'); }
        persist(); renderHangar();
        if (!s.done) setTimeout(() => document.querySelector('.search input')?.focus(), 50);
      },
    }));
  }
  if (s.g.length) $app.append(h(`<div class="hangar-legend">${COLS.map(c => `<span>${c.label}</span>`).join('')}</div>`));
  const byId = Object.fromEntries(AIRCRAFT.map(a => [a.id, a]));
  s.g.slice().reverse().forEach(id => {
    const a = byId[id];
    const tiles = COLS.map(c => {
      const r = compare(a, HANGAR, c);
      let v = a[c.k]; if (c.k === 'range') v = `${(v / 1000).toFixed(1)}k`; if (c.k === 'maker') v = v.replace('De Havilland Canada', 'De Havilland');
      return `<div class="tile ${r.cls}"><div>${esc(v)}${c.unit ? `<small>${c.unit}</small>` : ''}${r.arrow ? `<small>${r.arrow}</small>` : ''}</div></div>`;
    }).join('');
    $app.append(h(`<div class="hguess"><div class="hname">${esc(a.name)}</div><div class="tiles">${tiles}</div></div>`));
  });
  if (!s.done) $app.append(h(`<p class="left">${6 - s.g.length} guess${6 - s.g.length === 1 ? '' : 'es'} left</p>`));
  if (s.done) {
    $app.append(endCard(
      s.won ? (s.g.length <= 2 ? 'Certified avgeek' : 'Cleared for takeoff') : 'Grounded',
      `The mystery jet was the <span class="answer">${esc(HANGAR.name)}</span>.`, shareHangar(), 'hangar'));
  }
}
function shareHangar() {
  const s = state.hangar; if (!s.done) return null;
  const byId = Object.fromEntries(AIRCRAFT.map(a => [a.id, a]));
  const rows = s.g.map(id => COLS.map(c => { const r = compare(byId[id], HANGAR, c).cls; return r === 'hit' ? '🟩' : r === 'near' ? '🟨' : '⬜'; }).join(''));
  return `🛩️ Hangar ${s.won ? s.g.length : 'X'}/6\n${rows.join('\n')}`;
}

/* ================= shared ================= */
function header() { return `✈️ Brendle #${PUZZLE_NO} · Brendan Air`; }
function shareAll() {
  return [header(), shareLayover(), shareWhere(), shareHangar()].filter(Boolean).join('\n') + `\n${SITE}`;
}
function endCard(title, body, line, game) {
  const el = h(`<div class="endcard"><h3>${title}</h3><p>${body}</p><pre class="share">${esc(header() + '\n' + line)}</pre>
    <div class="row"><button class="btn" data-a="share">Share</button><button class="btn ghost" data-a="next">${nextGame(game) ? 'Next game →' : 'Home'}</button></div>
    <p class="countdown">New flight in <span>${untilTomorrow()}</span></p></div>`);
  el.querySelector('[data-a=share]').onclick = () => share(header() + '\n' + line + '\n' + SITE);
  el.querySelector('[data-a=next]').onclick = () => go(nextGame(game) || '');
  startCountdown();
  return el;
}
function nextGame(cur) { return GAMES.map(g => g.id).find(id => id !== cur && !state[id].done); }

function showHelp() {
  const st = load('brendle:stats', {});
  const statRow = (id, label) => { const g = st[id] || { played: 0, won: 0, streak: 0, best: 0 }; return `<h4>${label}</h4><div class="stats"><div><b>${g.played}</b><span>Played</span></div><div><b>${g.played ? Math.round(g.won / g.played * 100) : 0}%</b><span>${id === 'where' ? 'Done' : 'Won'}</span></div><div><b>${g.streak}</b><span>Streak</span></div><div><b>${g.best}</b><span>Best</span></div></div>`; };
  openModal(`<h3>How to fly Brendan Air</h3>
  <p>Everyone gets the same three puzzles each day. They reset at midnight your time.</p>
  <ul>
    <li><b>Brendan's Layover:</b> guess the mystery airport. Each guess shows the distance in miles and an arrow pointing toward the answer. Hints unlock after 3 and 5 guesses.</li>
    <li><b>Where's Brendan?:</b> five cities. Tap where each one is on the map. Your score is total miles off, so lower is better. 🎯 under 100 mi, 🟩 under 300, 🟨 under 750, 🟧 under 1,500.</li>
    <li><b>Brendan's Hangar:</b> guess the aircraft. Seats and range turn yellow within 15%, first flight within 5 years.</li>
  </ul>
  ${statRow('layover', "Brendan's Layover")}${statRow('where', "Where's Brendan?")}${statRow('hangar', "Brendan's Hangar")}
  <p class="small">Airports and coordinates: OurAirports (public domain). Map: Natural Earth (public domain). Aircraft seats, range and first-flight years are typical approximate figures for the game, not official specs.</p>`);
}
document.getElementById('helpBtn').onclick = showHelp;
document.getElementById('homeBtn').onclick = () => go('');

/* ---------- routing ---------- */
function go(id) { location.hash = id ? '#' + id : ''; if (!id) route(); }
function route() {
  const id = location.hash.slice(1);
  document.getElementById('flightNo').textContent = `Flight BD${String(PUZZLE_NO).padStart(3, '0')} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  window.scrollTo(0, 0);
  if (id === 'layover') renderLayover();
  else if (id === 'where') { vb = { ...VB0 }; renderWhere(); }
  else if (id === 'hangar') renderHangar();
  else renderHome();
}
window.addEventListener('hashchange', route);
route();
if (!load('brendle:seenHelp', false)) { save('brendle:seenHelp', true); setTimeout(showHelp, 300); }
