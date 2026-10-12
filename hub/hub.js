'use strict';
/* Stan Media Hub — one app for the Manager (admin) and the client portals.
   Data lives in the "client portal" Supabase project. See hub-supabase.sql for the tables. */
const SUPABASE_URL = 'https://zpytheddymwifekobsvz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kUCCmW7n0Lx9KjeAJ5rauw_1nqMUrWB';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (n = 7) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayKey = () => ymd(new Date());
const parseD = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseD(k); d.setDate(d.getDate() + n); return ymd(d); };
const mondayOf = (k = todayKey()) => { const d = parseD(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); };
const daysFrom = k => Math.round((parseD(k) - parseD(todayKey())) / 864e5);
const fmtD = (k, o = { day: 'numeric', month: 'short' }) => k ? parseD(k).toLocaleDateString('en-GB', o) : '';
const fmtTime = t => t ? new Date('2000-01-01T' + t).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }) : '';
const safeUrl = u => /^(https?:|mailto:|tel:)/i.test(u) ? u : 'https://' + u;
const COLORS = ['#0a84ff', '#5e5ce6', '#af52de', '#ff2d55', '#ff9500', '#34c759', '#30b0c7', '#a2845e'];
const colorFor = s => COLORS[[...String(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initials = n => (n || '?').trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });
const money = v => { v = +v || 0; return Number.isInteger(Math.round(v * 100) / 100) ? gbp0.format(v) : gbp2.format(v); };
const moneyShort = v => v >= 1000 ? '£' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : '£' + Math.round(v);
const sum = a => a.reduce((x, y) => x + (+y || 0), 0);
const lsGet = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const linkify = t => esc(t).replace(/\b(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi, u => {
  const trail = (u.match(/[.,!?;:)]+$/) || [''])[0], url = u.slice(0, u.length - trail.length);
  return `<a href="${url.startsWith('www.') ? 'https://' + url : url}" target="_blank" rel="noopener">${url}</a>${trail}`;
});
function relLabel(k) {
  const n = daysFrom(k), d = parseD(k);
  if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}

/* ---------- icons ---------- */
const sv = (d, w = 1.9) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
  plus: sv('<path d="M12 5v14M5 12h14"/>', 2.2),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>', 2.2),
  left: sv('<path d="M15 5l-7 7 7 7"/>', 2.2),
  right: sv('<path d="M9 5l7 7-7 7"/>', 2.2),
  down: sv('<path d="M6 9l6 6 6-6"/>', 2.2),
  more: sv('<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>', 2.2),
  eye: sv('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: sv('<path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  cal: sv('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  clock: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  pin: sv('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  link: sv('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
  ext: sv('<path d="M7 17L17 7M9 7h8v8"/>', 2.1),
  chat: sv('<path d="M20.5 11.5a8.4 8.4 0 0 1-9 8.4 9.2 9.2 0 0 1-3.6-.7L3.5 21l1.6-4.2a8 8 0 0 1-1.6-5.3A8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 8.5 8.5z"/>'),
  send: sv('<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>', 2.6),
  clip: sv('<path d="M21 11.5l-9 9a5.7 5.7 0 0 1-8.1-8.1l9-9a3.8 3.8 0 0 1 5.4 5.4l-9 9a1.9 1.9 0 0 1-2.7-2.7l8.3-8.3"/>'),
  sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>'),
  moon: sv('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  out: sv('<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l-4-4 4-4M6 12h10"/>'),
  refresh: sv('<path d="M20 11a8 8 0 0 0-14.7-4.3L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.7 4.3l1.3-1.8M20 20v-4.5h-4.5"/>'),
  tasks: sv('<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="M3.8 6.4l1.3 1.3L7.5 5.2M3.8 11.9l1.3 1.3 2.4-2.5M3.8 17.4l1.3 1.3 2.4-2.5"/>'),
  money: sv('<rect x="2.5" y="6" width="19" height="12.5" rx="3"/><circle cx="12" cy="12.25" r="2.6"/><path d="M6 9.5v.01M18 15v.01"/>'),
  rocket: sv('<path d="M5 15c-1.5 1-2 4-2 4s3-.5 4-2M14.5 4.5c2.5-1.5 5-1.5 5-1.5s0 2.5-1.5 5l-6.5 6.5-3.5-3.5z"/><path d="M8.5 11.5L5 11l3-3h4.5M12.5 15.5L13 19l3-3v-4.5"/>'),
  grid: sv('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
  bolt: sv('<path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z"/>'),
  edit: sv('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-12M9 7V4.5h6V7"/>'),
  search: sv('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  flag: sv('<path d="M5 21V4M5 4.5h11.5l-2 4 2 4H5"/>'),
  alert: sv('<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>'),
  file: sv('<path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3.5V9h5.5"/>'),
  play: sv('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/>'),
  folder: sv('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  doc: sv('<rect x="4.5" y="3.5" width="15" height="17" rx="3"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>'),
  screen: sv('<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M8.5 20h7M12 16.5V20"/>'),
  mega: sv('<path d="M3.5 10v4a1.5 1.5 0 0 0 1.5 1.5h2L14 20V4L7 8.5H5A1.5 1.5 0 0 0 3.5 10zM17.5 9a4 4 0 0 1 0 6"/>'),
  user: sv('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  users: sv('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>'),
  sparkle: sv('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  copy: sv('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>'),
  card: sv('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 9.5h19M6.5 15h4"/>'),
  plane: sv('<path d="M10.5 13.5L3 11l1.5-1.5 8 1 4-4.5a2.1 2.1 0 0 1 3 3l-4.5 4 1 8L14.5 21l-2.5-7.5"/>'),
  home: sv('<path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5"/>'),
  inbox: sv('<path d="M3.5 13.5l2.6-7.4A2 2 0 0 1 8 4.8h8a2 2 0 0 1 1.9 1.3l2.6 7.4V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.5 13.5h4.8l1.2 2.5h5l1.2-2.5h4.8"/>'),
  ads: sv('<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/>'),
};

/* ---------- state ---------- */
const S = {
  user: null, admin: false, ready: false, preview: false, week: null, q: '',
  view: lsGet('hub.taskView', 'clients'), taskClient: 'all', qaVis: lsGet('hub.qaVis', '1') === '1',
  showDone: {}, obSel: lsGet('hub.obSel', ''), obOpen: {}, showPast: false, showAllPosts: false, showDoneNeeds: false, payAll: false,
  authRole: lsGet('hub.authRole', 'client'), authMode: 'signin',
  vtView: lsGet('hub.vtView', 'board'), vtClient: 'all', vtQ: '', vtActAll: false,
};
const D = { portals: [], access: {}, tasks: [], clients: {}, expenses: [], inbox: [], marks: {}, comments: [], episodes: [], vact: [], loadedAt: 0 };
const portal = id => D.portals.find(p => p.id === id);
const task = id => D.tasks.find(t => t.id === id);
const hc = pid => D.clients[pid] || { portal_id: pid, status: 'active', ob_done: {}, retainer: 0, cycle: 'monthly', plan: '', notes: '' };
const pColor = p => (p && D.clients[p.id]?.color) || colorFor(p?.name);
const me = () => (S.user?.email || '').toLowerCase();
const who = e => e === me() ? 'You' : (e || '').split('@')[0];
const mk = (pid, id) => D.marks[pid + ':' + id];
const aprState = (pid, id) => ({ approved: 'approved', changes: 'changes' }[mk(pid, id)?.value] || 'pending');
const commentsFor = (pid, id) => D.comments.filter(c => c.portal_id === pid && c.item_id === id);
const weekOf = t => mondayOf(t.due || (t.created_at || new Date().toISOString()).slice(0, 10));
const STATUS_RANK = { active: 0, paused: 1, completed: 2 };
const PRIO_RANK = { high: 0, med: 1, low: 2 };
function sortedPortals() {
  return [...D.portals].sort((a, b) => (STATUS_RANK[hc(a.id).status] ?? 0) - (STATUS_RANK[hc(b.id).status] ?? 0) || a.name.localeCompare(b.name));
}
function sortTasks(list) {
  return [...list].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || (a.created_at || '').localeCompare(b.created_at || ''));
}
const lastPortalId = () => { const id = lsGet('hub.lastPortal', ''); return portal(id) ? id : sortedPortals()[0]?.id || ''; };

/* ---------- routing ---------- */
function route() {
  const [a = '', b = ''] = location.hash.replace(/^#\/?/, '').split('/');
  if (S.admin) {
    if (['tasks', 'finance', 'onboarding', 'videos'].includes(a)) return { mode: 'manager', page: a };
    if (a === 'portal') return { mode: 'portal', pid: portal(b) ? b : lastPortalId() };
    if (a === 'needed') return { mode: 'needed' };
    return { mode: 'manager', page: 'tasks' };
  }
  return { mode: 'portal', pid: portal(b) ? b : D.portals[0]?.id };
}
const go = h => { if (location.hash !== h) location.hash = h; else render(true); };
addEventListener('hashchange', () => { closeSheet(true); S.week = null; render(true); });

/* ---------- toast ---------- */
let toastT;
function toast(msg, undo, label = 'Undo') {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button>${label}</button>` : ''}`;
  if (undo) t.querySelector('button').onclick = () => { t.classList.remove('on'); undo(); };
  t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), undo ? 5000 : 2600);
}

/* ---------- auth ---------- */
function showAuth() {
  S.user = null; S.ready = false; S.admin = false;
  if (live) { sb.removeChannel(live); live = null; }
  closeSheet(true); dock.toggle(false);
  $('#boot').hidden = true; $('#app').hidden = true; $('#dock').hidden = true; $('#auth').hidden = false;
  document.body.classList.remove('client', 'admin');
  renderAuth(S.authNotice || ''); S.authNotice = '';
}
function renderAuth(msg = '', ok = false) {
  const m = S.authMode, admin = S.authRole === 'admin';
  const title = m === 'reset' ? 'Reset password' : m === 'signup' ? 'Create your account' : admin ? 'Stan Media Manager' : 'Your client portal';
  const sub = m === 'reset' ? 'We’ll email you a link to set a new one.' : m === 'signup' ? 'Use the email Stan Media invited.' : admin ? 'Sign in to run the business.' : 'Sign in with the email we invited.';
  $('#auth').innerHTML = `<form class="auth-card chrome" data-form="auth" novalidate>
    <div class="mark">S</div><h1>${title}</h1><p class="sub">${sub}</p>
    ${m === 'signin' ? `<div class="seg" data-seg="authrole"><button type="button" data-act="authRole" data-v="client" class="${admin ? '' : 'on'}">Client</button><button type="button" data-act="authRole" data-v="admin" class="${admin ? 'on' : ''}">Admin</button><i class="lens"></i></div>` : ''}
    <div class="fld"><label class="l" for="aEm">Email</label><input id="aEm" name="email" type="email" autocomplete="email" required placeholder="you@company.com" value="${esc(S.authEmail || '')}"></div>
    ${m !== 'reset' ? `<div class="fld"><label class="l" for="aPw">Password</label><input id="aPw" name="password" type="password" autocomplete="${m === 'signup' ? 'new-password' : 'current-password'}" required minlength="6" placeholder="••••••••"></div>` : ''}
    <button class="btn primary" type="submit">${m === 'reset' ? 'Send reset link' : m === 'signup' ? 'Create account' : 'Sign in'}</button>
    <div class="auth-msg ${ok ? 'ok' : ''}">${esc(msg)}</div>
    <div class="auth-links">${m === 'signin' ? `<button type="button" class="linkbtn" data-act="authMode" data-v="reset">Forgot password?</button>${admin ? '' : '<button type="button" class="linkbtn" data-act="authMode" data-v="signup">First time? Create account</button>'}`
      : '<button type="button" class="linkbtn" data-act="authMode" data-v="signin">Back to sign in</button>'}</div>
  </form>`;
  syncSegs($('#auth'));
}
async function submitAuth(f) {
  const email = f.email.value.trim().toLowerCase(), password = f.password?.value || '', btn = f.querySelector('.btn.primary');
  S.authEmail = email;
  const say = (t, ok) => { const m = $('.auth-msg', f); m.textContent = t; m.classList.toggle('ok', !!ok); if (!ok) { f.classList.remove('shake'); void f.offsetWidth; f.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: 'none' }], { duration: 380 }); } };
  if (!/^\S+@\S+\.\S+$/.test(email)) return say('Enter your email address.');
  if (S.authMode !== 'reset' && password.length < 6) return say('Passwords are at least 6 characters.');
  btn.disabled = true;
  try {
    if (S.authMode === 'reset') {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      S.authMode = 'signin'; renderAuth('Check your inbox for the reset link.', true); return;
    }
    if (S.authMode === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) { S.authMode = 'signin'; renderAuth('Check your email to confirm, then sign in.', true); }
      return;
    }
    S.wantAdmin = S.authRole === 'admin';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err) {
    say(/fetch|network/i.test(err.message) ? 'Can’t reach the server. Check your connection.' : err.message === 'Invalid login credentials' ? 'That email and password don’t match.' : err.message);
  }
  btn.disabled = false;
}
sb.auth.onAuthStateChange((ev, session) => {
  if (ev === 'PASSWORD_RECOVERY') S.recovery = true;
  // never await Supabase calls inside this callback
  setTimeout(() => {
    if (session?.user) { if (S.user?.id !== session.user.id) boot(session.user); else if (S.recovery && S.ready) openRecovery(); }
    else showAuth();
  });
});

/* ---------- boot + data ---------- */
async function boot(user) {
  S.user = user; S.ready = false;
  $('#auth').hidden = true; $('#boot').hidden = false;
  const adm = await sb.from('portal_admins').select('email').limit(1);
  if (S.user?.id !== user.id) return;
  S.admin = !!adm.data?.length;
  if (S.wantAdmin && !S.admin) { S.wantAdmin = false; S.authRole = 'client'; S.authNotice = 'That account isn’t an admin. Sign in as a client instead.'; await sb.auth.signOut(); return; }
  S.wantAdmin = false;
  await loadAll();
  S.ready = true;
  document.body.classList.toggle('admin', S.admin); document.body.classList.toggle('client', !S.admin);
  $('#boot').hidden = true; $('#app').hidden = false;
  startLive(); render(true);
  if (S.recovery) openRecovery();
}
async function loadAll() {
  const q = {
    portals: sb.from('portals').select('*').order('created_at'),
    access: sb.from('portal_access').select('*'),
    tasks: sb.from('hub_tasks').select('*').order('created_at'),
    marks: sb.from('portal_marks').select('*'),
    comments: sb.from('portal_comments').select('*').order('created_at').limit(5000),
  };
  if (S.admin) { q.clients = sb.from('hub_clients').select('*'); q.expenses = sb.from('hub_expenses').select('*').order('date'); q.inbox = sb.from('hub_inbox').select('*').order('created_at');
    q.episodes = sb.from('vt_episodes').select('*').order('created_at'); q.vact = sb.from('vt_activity').select('*').order('at', { ascending: false }).limit(400); }
  const keys = Object.keys(q), res = await Promise.all(Object.values(q)), r = Object.fromEntries(keys.map((k, i) => [k, res[i]]));
  const bad = res.find(x => x.error);
  if (bad) toast('Couldn’t load everything: ' + bad.error.message);
  // keep local copies of portals with an unsaved edit
  D.portals = (r.portals.data || []).map(p => saveT[p.id] ? portal(p.id) || p : p);
  D.access = {}; (r.access.data || []).forEach(a => (D.access[a.portal_id] ||= []).push(a.email));
  D.tasks = r.tasks.data || [];
  D.marks = {}; (r.marks.data || []).forEach(m => D.marks[m.portal_id + ':' + m.item_id] = m);
  D.comments = r.comments.data || [];
  if (S.admin) { D.clients = {}; (r.clients.data || []).forEach(c => D.clients[c.portal_id] = c); D.expenses = r.expenses.data || []; D.inbox = r.inbox.data || [];
    D.episodes = (r.episodes.data || []).map(e => vtSaveT[e.id] ? vtEp(e.id) || e : e); D.vact = r.vact.data || []; }
  D.loadedAt = Date.now();
}
let live = null;
function startLive() {
  if (live) sb.removeChannel(live);
  live = sb.channel('hub-' + S.user.id);
  const on = (table, fn) => live.on('postgres_changes', { event: '*', schema: 'public', table }, e => { fn(e); liveRender(); });
  const upsert = (list, e, key = 'id') => {
    const i = list.findIndex(x => x[key] === (e.eventType === 'DELETE' ? e.old : e.new)[key]);
    if (e.eventType === 'DELETE') { if (i >= 0) list.splice(i, 1); } else if (i >= 0) list[i] = e.new; else list.push(e.new);
  };
  on('hub_tasks', e => { if (!(e.eventType !== 'DELETE' && taskSaveT[e.new.id])) upsert(D.tasks, e); });
  on('portals', e => { if (e.eventType === 'DELETE' || !saveT[e.new.id]) upsert(D.portals, e); });
  on('portal_access', e => {
    const r = e.eventType === 'DELETE' ? e.old : e.new, list = (D.access[r.portal_id] ||= []);
    if (e.eventType === 'DELETE') D.access[r.portal_id] = list.filter(x => x !== r.email); else if (!list.includes(r.email)) list.push(r.email);
  });
  on('portal_marks', e => {
    const r = e.eventType === 'DELETE' ? e.old : e.new; if (e.eventType === 'DELETE') { delete D.marks[r.portal_id + ':' + r.item_id]; return; }
    if (S.admin && r.value === 'changes' && r.by_email !== me() && D.marks[r.portal_id + ':' + r.item_id]?.value !== 'changes') toast(`${portal(r.portal_id)?.name || 'A client'} asked for changes`);
    const was = D.marks[r.portal_id + ':' + r.item_id]?.value;
    D.marks[r.portal_id + ':' + r.item_id] = r;
    if (S.admin && was !== r.value) vtOnMark(r.portal_id, r.item_id, r.value);
  });
  on('portal_comments', e => {
    if (e.eventType === 'DELETE') { D.comments = D.comments.filter(c => c.id !== e.old.id); return; }
    if (D.comments.some(c => c.id === e.new.id)) return;
    const tmp = D.comments.findIndex(c => c._tmp && c.body === e.new.body && c.item_id === e.new.item_id && c.portal_id === e.new.portal_id);
    if (tmp >= 0) D.comments.splice(tmp, 1);
    D.comments.push(e.new);
    if (e.new.item_id === 'general' && e.new.author_email !== me()) dock.nudge();
  });
  if (S.admin) {
    on('hub_clients', e => { if (e.eventType === 'DELETE') delete D.clients[e.old.portal_id]; else if (!clientSaveT[e.new.portal_id]) D.clients[e.new.portal_id] = e.new; });
    on('hub_expenses', e => upsert(D.expenses, e));
    on('hub_inbox', e => { const fresh = e.eventType === 'INSERT' && !D.inbox.some(x => x.id === e.new.id); upsert(D.inbox, e); if (fresh) toast('Needs you: ' + e.new.title); });
    on('vt_episodes', e => { if (!(e.eventType !== 'DELETE' && vtSaveT[e.new.id])) upsert(D.episodes, e); });
    on('vt_activity', e => { if (e.eventType !== 'DELETE' && !D.vact.some(a => a.id === e.new.id)) D.vact.unshift(e.new); });
  }
  live.subscribe();
}
// Live changes redraw the page, but never while you're typing in it
let liveT;
const typing = () => { const a = document.activeElement; return a && $('#view').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName); };
function liveRender() {
  clearTimeout(liveT);
  liveT = setTimeout(() => { SH?.live?.(); dock.redraw(); if (typing()) { S.deferred = true; return; } render(false); if (SH?.kind === 'vtep') redrawSheet(); }, 80);
}
document.addEventListener('focusout', () => setTimeout(() => { if (S.deferred && !typing()) { S.deferred = false; render(false); } }, 150));
let laterT;
function renderLater(ms = 650) { clearTimeout(laterT); laterT = setTimeout(() => typing() ? (S.deferred = true) : render(false), ms); }
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('idle', document.hidden);
  if (!document.hidden && S.ready && Date.now() - D.loadedAt > 60000) loadAll().then(() => render(false));
});

/* ---------- writes ---------- */
async function dbUpdate(table, match, patch) {
  let q = sb.from(table).update(patch);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error) toast('Couldn’t save: ' + error.message);
  return !error;
}
const saveT = {};
function savePortal(p, now) {
  clearTimeout(saveT[p.id]);
  const run = async () => {
    const { error } = await sb.from('portals').update({ name: p.name, content: p.content, updated_at: new Date().toISOString() }).eq('id', p.id);
    delete saveT[p.id];
    if (error) toast('Couldn’t save: ' + error.message);
  };
  saveT[p.id] = setTimeout(run, now ? 0 : 450);
}
const clientSaveT = {}, clientPatch = {};
function saveClient(pid, patch) {
  D.clients[pid] = { ...hc(pid), ...(D.clients[pid] || {}), ...patch };
  clientPatch[pid] = { ...(clientPatch[pid] || {}), ...patch };
  clearTimeout(clientSaveT[pid]);
  clientSaveT[pid] = setTimeout(async () => {
    const body = { portal_id: pid, ...clientPatch[pid] }; delete clientPatch[pid];
    const { error } = await sb.from('hub_clients').upsert(body);
    delete clientSaveT[pid];
    if (error) toast('Couldn’t save: ' + error.message);
  }, 350);
}
const taskSaveT = {};
async function updateTask(t, patch) {
  Object.assign(t, patch);
  taskSaveT[t.id] = (taskSaveT[t.id] || 0) + 1;
  await dbUpdate('hub_tasks', { id: t.id }, patch);
  if (!--taskSaveT[t.id]) delete taskSaveT[t.id];
}
async function createTask(row) {
  const t = { id: uid(10), notes: '', due: null, priority: 'med', deliverable: true, approval: false, review_by: null, done: false, done_at: null, ob_key: null,
    created_at: new Date().toISOString(), ...row };
  D.tasks.push(t);
  taskSaveT[t.id] = 1;
  const { error } = await sb.from('hub_tasks').insert({ id: t.id, portal_id: t.portal_id, title: t.title, notes: t.notes, due: t.due || null, priority: t.priority,
    deliverable: t.deliverable, approval: t.approval, review_by: t.review_by || null, done: t.done, done_at: t.done_at, ob_key: t.ob_key });
  delete taskSaveT[t.id];
  if (error) { D.tasks = D.tasks.filter(x => x !== t); toast('Couldn’t add task: ' + error.message); render(false); return null; }
  return t;
}
function setTaskDone(t, on, el) {
  updateTask(t, { done: on, done_at: on ? new Date().toISOString() : null });
  if (el) {
    el.classList.toggle('on', on); el.classList.toggle('pop', on);
    el.closest('.trow,.need,.step')?.classList.toggle('done', on);
  }
  renderLater();
}
async function deleteTask(t) {
  D.episodes.filter(e => e.task_id === t.id).forEach(e => vtUpdate(e, { task_id: null }));
  D.tasks = D.tasks.filter(x => x !== t); closeSheet(); render(false);
  const { error } = await sb.from('hub_tasks').delete().eq('id', t.id);
  if (error) { D.tasks.push(t); render(false); return toast('Couldn’t delete: ' + error.message); }
  toast('Task deleted', async () => {
    const { created_at, updated_at, ...row } = t;
    const { error: e2 } = await sb.from('hub_tasks').insert(row);
    if (!e2 && !task(t.id)) { D.tasks.push(t); render(false); }
  });
}
async function setMark(pid, item, value) {
  if (S.preview) { render(false); return toast('Preview only. Nothing is saved in client view.'); }
  const key = pid + ':' + item, prev = D.marks[key];
  if (value) D.marks[key] = { portal_id: pid, item_id: item, value, by_email: me(), updated_at: new Date().toISOString() }; else delete D.marks[key];
  if (S.admin && prev?.value !== value) vtOnMark(pid, item, value);
  SH?.live?.(); renderLater(400);
  const { error } = value
    ? await sb.from('portal_marks').upsert({ portal_id: pid, item_id: item, value, by_email: me(), updated_at: new Date().toISOString() })
    : await sb.from('portal_marks').delete().eq('portal_id', pid).eq('item_id', item);
  if (error) { if (prev) D.marks[key] = prev; else delete D.marks[key]; SH?.live?.(); render(false); toast('Couldn’t save: ' + error.message); }
}
async function postComment(pid, item, body, attachment = null) {
  if (S.preview) return toast('Preview only. Switch back to admin to send messages.');
  const tmp = { id: 'tmp-' + uid(), _tmp: true, portal_id: pid, item_id: item, author_email: me(), body, attachment, created_at: new Date().toISOString() };
  D.comments.push(tmp); SH?.live?.(); dock.redraw();
  const row = { portal_id: pid, item_id: item, author_email: me(), body }; if (attachment) row.attachment = attachment;
  const { data, error } = await sb.from('portal_comments').insert(row).select().single();
  D.comments = D.comments.filter(x => x !== tmp);
  if (error) toast('Message didn’t send: ' + error.message);
  else if (!D.comments.some(x => x.id === data.id)) D.comments.push(data);
  SH?.live?.(); dock.redraw(); renderLater(200);
}
const canDelete = m => !m._tmp && !S.preview && (S.admin || m.author_email === me());
async function deleteComment(id) {
  const m = D.comments.find(x => x.id === id); if (!m || !canDelete(m)) return;
  D.comments = D.comments.filter(x => x !== m); SH?.live?.(); dock.redraw();
  const { error } = await sb.from('portal_comments').delete().eq('id', id);
  if (error) { D.comments.push(m); D.comments.sort((a, b) => a.created_at.localeCompare(b.created_at)); SH?.live?.(); dock.redraw(); return toast('Couldn’t delete: ' + error.message); }
  if (m.attachment?.path) sb.storage.from('portal-files').remove([m.attachment.path]).catch(() => {});
}

/* ---------- small building blocks ---------- */
function ring(pct, c = 'var(--accent)', cls = '') {
  const C = 100.53, p = Math.max(0, Math.min(100, pct || 0));
  return `<div class="ring ${cls}" style="--c:${c}" role="img" aria-label="${p}% complete"><svg viewBox="0 0 40 40"><circle class="tk" cx="20" cy="20" r="16"/><circle class="vl" cx="20" cy="20" r="16" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - p / 100)).toFixed(2)}"/></svg><span>${p}%</span></div>`;
}
function dueChip(k, done, label = '') {
  if (!k) return '';
  const n = daysFrom(k), cls = done ? '' : n < 0 ? 'red' : n <= 1 ? 'orange' : '';
  return `<span class="chip ${cls}">${I.cal}${label}${relLabel(k)}${!done && n < -1 ? ` · ${-n}d late` : ''}</span>`;
}
const aprChip = st => ({ pending: '<span class="chip orange">Awaiting approval</span>', approved: `<span class="chip green">${I.check}Approved</span>`, changes: '<span class="chip red">Changes requested</span>' })[st];
const av = (p, cls = '') => `<span class="av ${cls}" style="--c:${pColor(p)}">${esc(initials(p?.name))}</span>`;
const empty = (title, sub = '') => `<div class="empty"><b>${title}</b>${sub}</div>`;
function seg(key, items, cur, act, cls = '') {
  return `<div class="seg ${cls}" data-seg="${key}">${items.map(([v, label]) => `<button type="button" data-act="${act}" data-v="${v}" class="${v === cur ? 'on' : ''}">${label}</button>`).join('')}<i class="lens"></i></div>`;
}

/* segmented controls: the lens glides between options like a drop of glass */
const segMem = {};
function syncSegs(root = document) {
  $$('.seg, .tabbar', root).forEach(s => {
    const lens = $(':scope > .lens', s), on = $(':scope > button.on', s);
    if (!lens) return;
    if (!on || !on.offsetWidth) { lens.style.opacity = on ? '' : 0; return; }
    lens.style.opacity = '';
    const L = on.offsetLeft, W = on.offsetWidth, key = s.dataset.seg, prev = key && segMem[key];
    if (prev && (prev.L !== L || prev.W !== W) && !reduceMotion.matches) {
      lens.style.transition = 'none'; lens.style.left = prev.L + 'px'; lens.style.width = prev.W + 'px'; void lens.offsetWidth; lens.style.transition = '';
      lens.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.1,.88)', offset: .3 }, { transform: 'scale(.97,1.04)', offset: .65 }, { transform: 'scale(1,1)' }], { duration: 620, easing: 'ease-out' });
    }
    lens.style.left = L + 'px'; lens.style.width = W + 'px';
    if (key) segMem[key] = { L, W };
  });
}
addEventListener('resize', () => { clearTimeout(syncSegs._t); syncSegs._t = setTimeout(() => syncSegs(), 120); });

/* ---------- shell ---------- */
function render(enter) {
  if (!S.ready) return;
  const r = route(); S.r = r;
  if (r.mode === 'manager') S.lastPage = r.page;
  renderTop(r); renderTabbar(r);
  const v = $('#view'), y = scrollY;
  let html;
  if (r.mode === 'manager') html = r.page === 'finance' ? pageFinance() : r.page === 'onboarding' ? pageOnboarding() : r.page === 'videos' ? pageVideos() : pageTasks();
  else if (r.mode === 'needed') html = pageNeeded();
  else html = pagePortal(portal(r.pid));
  v.innerHTML = `<div class="${enter ? 'enter' : ''}">${html}</div>`;
  if (enter) scrollTo(0, 0); else scrollTo({ top: y, behavior: 'instant' });
  syncSegs();
  if (r.mode === 'portal' && r.pid) lsSet('hub.lastPortal', r.pid);
  $$('#view .chips').forEach(c => { const on = $('.fchip.on', c); if (on) c.scrollLeft += on.getBoundingClientRect().left - c.getBoundingClientRect().left - (c.clientWidth - on.offsetWidth) / 2; });
  dock.sync(); updateBadges();
  $('.preview-bar')?.remove();
  if (S.preview && r.mode === 'portal') document.body.insertAdjacentHTML('beforeend', `<div class="preview-bar chrome">${I.eye}<span class="hide-m">You’re seeing exactly what your client sees</span><span class="show-m">Client view</span><button class="btn sm primary" data-act="preview" data-v="0">Back to admin</button></div>`);
}
function totalUnread() { return sum(D.portals.map(p => unreadFor(p.id))); }
function unreadFor(pid) {
  const last = lsGet(`hub.read:${pid}:${me()}`, '');
  return D.comments.filter(c => c.portal_id === pid && c.item_id === 'general' && c.author_email !== me() && c.created_at > last).length;
}
function renderTop(r) {
  const p = r.mode === 'portal' ? portal(r.pid) : null, unread = S.admin ? totalUnread() : 0, needed = S.admin ? neededItems().count : 0;
  $('#top').innerHTML = `
    <div class="brand"><span class="mark sm">S</span><div style="min-width:0"><span class="nm">Stan Media</span><small>${S.admin ? ({ manager: 'Manager', needed: 'Needed from me' }[r.mode] || 'Client portals') : esc(p?.name || 'Client portal')}</small></div></div>
    ${S.admin ? `<div class="seg big mode" data-seg="mode"><button data-act="go" data-v="#/${S.lastPage || 'tasks'}" class="${r.mode === 'manager' ? 'on' : ''}">Manager</button><button data-act="go" data-v="#/needed" class="${r.mode === 'needed' ? 'on' : ''}">Needed from me${needed ? `<span class="badge">${needed > 9 ? '9+' : needed}</span>` : ''}</button><button data-act="go" data-v="#/portal/${lastPortalId()}" class="${r.mode === 'portal' ? 'on' : ''}">Client portals${unread ? `<span class="badge">${unread > 9 ? '9+' : unread}</span>` : ''}</button><i class="lens"></i></div>` : ''}
    <div class="top-r"><button class="ib" data-act="theme" title="Light / dark" aria-label="Switch light or dark">${isDark() ? I.sun : I.moon}</button>
      <button class="acct" data-act="menu" aria-label="Account"><span class="av" style="--c:${colorFor(me())}">${esc(initials(me()))}</span></button></div>`;
}
function renderTabbar(r) {
  const tb = $('#tabbar');
  if (!S.admin) { tb.innerHTML = ''; return; }
  const cur = r.mode === 'portal' ? 'portal' : r.mode === 'needed' ? 'needed' : r.page, unread = totalUnread(), needed = neededItems().count;
  tb.innerHTML = [['tasks', 'Tasks', I.tasks, '#/tasks'], ['videos', 'Videos', I.play, '#/videos'], ['finance', 'Finance', I.money, '#/finance'], ['onboarding', 'Onboard', I.rocket, '#/onboarding'], ['needed', 'For me', I.inbox, '#/needed'], ['portal', 'Portals', I.grid, '#/portal/' + lastPortalId()]]
    .map(([k, label, ic, h]) => `<button data-act="go" data-v="${h}" class="${cur === k ? 'on' : ''}">${ic}<span>${label}</span>${k === 'portal' && unread ? `<span class="badge">${unread}</span>` : ''}${k === 'needed' && needed ? `<span class="badge">${needed}</span>` : ''}</button>`).join('') + '<i class="lens"></i>';
  tb.dataset.seg = 'tabbar';
}
function managerNav(page) {
  return `<div class="subnav hide-m">${seg('mgr', [['tasks', 'Tasks'], ['videos', 'Videos'], ['finance', 'Finance'], ['onboarding', 'Onboarding & automations']], page, 'go-page')}</div>`;
}

/* ---------- TASKS ---------- */
function taskRow(t, showClient) {
  const p = portal(t.portal_id), st = t.deliverable && t.approval ? aprState(t.portal_id, t.id) : null, nC = commentsFor(t.portal_id, t.id).length;
  const meta = [
    showClient && p ? `<span class="chip"><span class="dot" style="--c:${pColor(p)}"></span>${esc(p.name)}</span>` : '',
    dueChip(t.due, t.done), st ? aprChip(st) : '',
    nC ? `<span class="chip">${I.chat}${nC}</span>` : '',
    t.ob_key ? `<span class="chip violet">${I.rocket}Onboarding</span>` : '',
  ].join('');
  return `<div class="trow ${t.done ? 'done' : ''}">
    <button class="chk ${t.done ? 'on' : ''}" data-act="tick" data-id="${t.id}" aria-label="${t.done ? 'Mark not done' : 'Mark done'}">${I.check}</button>
    <div class="tmain" data-act="task" data-id="${t.id}"><div class="ttl">${esc(t.title)}</div><div class="tmeta">${meta}</div></div>
    <span class="prio ${t.priority}" title="${{ high: 'High', med: 'Medium', low: 'Low' }[t.priority]} priority"></span>
    <button class="vis ${t.deliverable ? 'on' : ''}" data-act="vis" data-id="${t.id}" title="${t.deliverable ? 'In the client’s portal. Click to make internal' : 'Internal only. Click to show in their portal'}">${t.deliverable ? I.eye : I.eyeOff}</button>
  </div>`;
}
const taskMatch = t => (S.taskClient === 'all' || t.portal_id === S.taskClient) && (!S.q || t.title.toLowerCase().includes(S.q));
function pageTasks() {
  const today = todayKey(), wk = mondayOf(), open = D.tasks.filter(t => !t.done);
  const dueToday = open.filter(t => t.due === today).length, overdue = open.filter(t => t.due && t.due < today).length;
  const doneWk = D.tasks.filter(t => t.done && t.done_at && ymd(new Date(t.done_at)) >= wk).length;
  const awaiting = D.tasks.filter(t => !t.done && t.deliverable && t.approval && aprState(t.portal_id, t.id) !== 'approved').length;
  const ps = sortedPortals();
  return `${managerNav('tasks')}
  <div class="page-head"><div><div class="eyebrow">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>Tasks</h1>
    <div class="sub">Tick a task with ${I.eye.replace('width="18" height="18"', 'width="15" height="15" style="vertical-align:-2px"')} on and it’s ticked in that client’s portal too.</div></div>
    <div class="acts"><button class="btn" data-act="newClient">${I.plus}Client</button><button class="btn primary" data-act="task">${I.plus}Task</button></div></div>
  <div class="stats">
    <div class="card stat ${overdue ? 'alert' : ''}"><div class="k">${I.alert}Overdue</div><div class="v">${overdue}</div><div class="s">${overdue ? 'Needs attention' : 'Nothing late'}</div></div>
    <div class="card stat"><div class="k">${I.cal}Due today</div><div class="v">${dueToday}</div><div class="s">${open.length} open in total</div></div>
    <div class="card stat"><div class="k">${I.flag}Awaiting approval</div><div class="v">${awaiting}</div><div class="s">From clients</div></div>
    <div class="card stat"><div class="k">${I.check}Done this week</div><div class="v">${doneWk}</div><div class="s">Since Monday</div></div>
  </div>
  <div class="toolbar">${seg('tview', [['clients', 'By client'], ['timeline', 'Timeline']], S.view, 'tview')}
    <div class="chips grow"><button class="fchip ${S.taskClient === 'all' ? 'on' : ''}" data-act="tclient" data-v="all">All clients</button>${ps.map(p => `<button class="fchip ${S.taskClient === p.id ? 'on' : ''}" data-act="tclient" data-v="${p.id}">${av(p, 'sm')}${esc(p.name)}</button>`).join('')}</div>
    <label class="search">${I.search}<input type="search" placeholder="Search tasks" value="${esc(S.q)}" data-in="q" aria-label="Search tasks"></label></div>
  <div id="tbody">${tasksBody()}</div>`;
}
function tasksBody() {
  const ps = sortedPortals().filter(p => S.taskClient === 'all' || p.id === S.taskClient);
  if (!D.portals.length) return `<div class="card">${empty('No clients yet', 'Add your first client to start tracking tasks.')}</div>`;
  if (S.view === 'timeline') {
    const today = todayKey(), tom = addDays(today, 1), sun = addDays(mondayOf(), 6);
    const open = sortTasks(D.tasks.filter(t => !t.done && taskMatch(t)));
    const groups = [['Overdue', t => t.due && t.due < today, 'red'], ['Today', t => t.due === today], ['Tomorrow', t => t.due === tom], ['Later this week', t => t.due > tom && t.due <= sun], ['Coming up', t => t.due > sun && t.due > tom], ['No date', t => !t.due]];
    const done = D.tasks.filter(t => t.done && taskMatch(t)).sort((a, b) => (b.done_at || '').localeCompare(a.done_at || ''));
    return `<div class="card">${groups.map(([name, f, cls]) => { const ts = open.filter(f); return ts.length ? `<div class="tl-group"><h4 class="${cls || ''}">${name}<span class="chip">${ts.length}</span></h4>${ts.map(t => taskRow(t, true)).join('')}</div>` : ''; }).join('') || empty('All clear', 'Nothing open. Enjoy it.')}
      ${done.length ? `<button class="more ${S.showDone.tl ? 'open' : ''}" data-act="showDone" data-id="tl">${I.right}${done.length} completed</button>${S.showDone.tl ? done.slice(0, 40).map(t => taskRow(t, true)).join('') : ''}` : ''}</div>`;
  }
  return `<div class="cgrid">${ps.map(clientCard).join('')}</div>`;
}
function clientCard(p) {
  const today = todayKey(), c = pColor(p), all = D.tasks.filter(t => t.portal_id === p.id);
  const ts = all.filter(taskMatch), open = sortTasks(ts.filter(t => !t.done));
  const done = ts.filter(t => t.done).sort((a, b) => (b.done_at || '').localeCompare(a.done_at || ''));
  const overdue = open.filter(t => t.due && t.due < today).length, wk = all.filter(t => weekOf(t) === mondayOf()), st = hc(p.id).status;
  return `<section class="card ccard lift" style="--c:${c}">
    <header>${av(p)}<div class="nm"><b>${esc(p.name)}</b><small>${open.length} open${overdue ? ` · <span style="color:var(--bad)">${overdue} overdue</span>` : ''}${st !== 'active' ? ' · ' + st : ''}</small></div>
      <span title="This week: ${wk.filter(t => t.done).length} of ${wk.length} done">${ring(wk.length ? Math.round(wk.filter(t => t.done).length / wk.length * 100) : 0, c)}</span>
      <button class="ib sm" data-act="client" data-id="${p.id}" title="Client details" aria-label="Client details">${I.more}</button></header>
    <div>${open.map(t => taskRow(t)).join('') || `<div class="empty">${S.q ? 'No matches' : 'All clear ✨'}</div>`}</div>
    ${done.length ? `<button class="more ${S.showDone[p.id] ? 'open' : ''}" data-act="showDone" data-id="${p.id}">${I.right}${done.length} completed</button>${S.showDone[p.id] ? done.slice(0, 30).map(t => taskRow(t)).join('') : ''}` : ''}
    <form class="qadd" data-form="qadd" data-pid="${p.id}"><input name="t" placeholder="Add a task… (try “tomorrow”)" autocomplete="off" enterkeyhint="done" aria-label="New task for ${esc(p.name)}">
      <button type="button" class="vis ${S.qaVis ? 'on' : ''}" data-act="qaVis" title="${S.qaVis ? 'New tasks show in the client portal' : 'New tasks are internal only'}">${S.qaVis ? I.eye : I.eyeOff}</button>
      <button class="ib sm" aria-label="Add">${I.plus}</button></form>
  </section>`;
}
// "Film reel tomorrow" → due tomorrow; also today / mon…sun / next week
function parseQuick(s) {
  const m = s.match(/\s+(today|tod|tomorrow|tmrw|tmr|next week|mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(rs(day)?)?|fri(day)?|sat(urday)?|sun(day)?)\s*$/i);
  if (!m) return { title: s.trim(), due: null };
  const w = m[1].toLowerCase(), t = todayKey(); let due;
  if (/^tod/.test(w)) due = t; else if (/^tom|^tm/.test(w)) due = addDays(t, 1); else if (w === 'next week') due = addDays(mondayOf(), 7);
  else { const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(w.slice(0, 3)); const d = parseD(t); due = addDays(t, ((idx - d.getDay() + 7) % 7) || 7); }
  return { title: s.slice(0, m.index).trim() || s.trim(), due };
}

/* task sheet (new or existing) */
function openTask(id, preset = {}) {
  const t = id ? task(id) : null;
  if (id && !t) return;
  const ctx = { id, isNew: !t, preset };
  openSheet('task', ctx, () => taskSheetHTML(ctx), { live: () => drawThread(t?.portal_id, id), onClose: () => t && flushTaskForm(t), focus: !t ? '[name=title]' : null });
}
function taskSheetHTML(ctx) {
  const t = ctx.isNew ? { portal_id: ctx.preset.pid || (S.taskClient !== 'all' ? S.taskClient : sortedPortals()[0]?.id), title: '', notes: '', due: ctx.preset.due || '', priority: 'med', deliverable: ctx.preset.deliverable ?? S.qaVis, approval: false, review_by: '' } : task(ctx.id);
  const p = portal(t.portal_id), st = !ctx.isNew && t.approval ? aprState(t.portal_id, t.id) : null, m = st && mk(t.portal_id, t.id);
  return `<div class="sh-head"><h2><span class="k">${ctx.isNew ? 'New task' : 'Task'}${p ? ' · ' + esc(p.name) : ''}</span></h2>
      ${!ctx.isNew ? `<button class="ib" data-act="goPortal" data-id="${t.portal_id}" title="Open their portal">${I.grid}</button>` : ''}<button class="ib" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="sh-body">
      <form id="taskForm" data-form="task" data-chg="taskForm" autocomplete="off">
        <input class="title-in" name="title" value="${esc(t.title)}" placeholder="What needs doing?" required maxlength="300">
        <div class="two"><div class="fld"><label class="l">Client</label><select name="portal_id">${sortedPortals().map(x => `<option value="${x.id}" ${x.id === t.portal_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
          <div class="fld"><label class="l">Due</label><input type="date" name="due" value="${esc(t.due || '')}"></div></div>
        <div class="fld"><label class="l">Priority</label>${seg('prio', [['low', 'Low'], ['med', 'Medium'], ['high', 'High']], t.priority, 'prio')}<input type="hidden" name="priority" value="${t.priority}"></div>
        <label class="toggle"><input type="checkbox" name="deliverable" ${t.deliverable ? 'checked' : ''}><span class="tr"><span class="kn"></span></span><span class="tx">Show in their portal<small>Appears in that week’s deliverables. Ticking it here ticks it there.</small></span></label>
        <div class="if-del">
          <label class="toggle"><input type="checkbox" name="approval" ${t.approval ? 'checked' : ''}><span class="tr"><span class="kn"></span></span><span class="tx">Ask them to approve it<small>Shows in “Actions needed” with Approve / Request changes.</small></span></label>
          <div class="if-apr fld" style="margin-top:6px"><label class="l">Review by</label><input type="date" name="review_by" value="${esc(t.review_by || '')}"></div>
          ${st ? `<div class="fld" data-apr>${aprBlock(t.portal_id, t.id)}</div>` : ''}
        </div>
        <div class="fld" style="margin-top:10px"><label class="l">Notes <span class="if-del" style="text-transform:none;letter-spacing:0;font-weight:500">· the client sees these</span></label>
          <textarea name="notes" placeholder="Details, links, what to review…">${esc(t.notes || '')}</textarea></div>
      </form>
      ${!ctx.isNew && t.deliverable ? `<label class="l" style="margin-top:6px">Comments with ${esc(p?.name || 'client')}</label><div class="thread" data-thread>${threadHTML(t.portal_id, t.id)}</div>${composer(t.portal_id, t.id)}` : ''}
    </div>
    <div class="sh-foot">${ctx.isNew ? '' : `<button class="btn danger ghost" data-act="delTask" data-id="${t.id}">${I.trash}Delete</button>`}
      <div class="r">${ctx.isNew ? `<button class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit" form="taskForm">Add task</button>` : `<button class="btn primary" data-act="close">Done</button>`}</div></div>`;
}
function readTaskForm(f) {
  const e = f.elements;
  return { title: e.title.value.trim(), portal_id: e.portal_id.value, due: e.due.value || null, priority: e.priority.value, deliverable: e.deliverable.checked,
    approval: e.deliverable.checked && e.approval.checked, review_by: e.review_by.value || null, notes: e.notes.value };
}
function flushTaskForm(t) {
  const f = $('#taskForm'); if (!f || !task(t.id)) return;
  const v = readTaskForm(f); if (!v.title) v.title = t.title;
  const patch = {}; for (const k in v) if ((t[k] ?? null) !== (v[k] ?? null) && !(k === 'notes' && (t[k] || '') === v[k])) patch[k] = v[k];
  if (Object.keys(patch).length) { updateTask(t, patch); renderLater(50); }
}
function aprBlock(pid, id) {
  const st = aprState(pid, id), m = mk(pid, id);
  return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${aprChip(st)}${m && st !== 'pending' ? `<span class="muted" style="font-size:13px">by ${esc(who(m.by_email))} · ${new Date(m.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>` : ''}
    ${S.admin && !S.preview && st !== 'pending' ? `<button type="button" class="btn sm ghost" data-act="mark" data-pid="${pid}" data-id="${id}" data-v="">Reset</button>` : ''}</div>`;
}

/* ---------- FINANCE ---------- */
const CYCLES = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', 'one-off': 'One-off' };
const monthlyOf = (amt, cycle) => ({ weekly: amt * 52 / 12, monthly: amt, quarterly: amt / 3, yearly: amt / 12 }[cycle] || 0);
const EXP_CATS = { Software: I.screen, Ads: I.ads, Freelancers: I.users, Equipment: I.card, Office: I.home, Travel: I.plane, Other: I.file };
const monthKey = (offset = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return ymd(d).slice(0, 7); };
function monthDiff(a, b) { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); }
function expenseIn(e, mk_) {
  const amt = +e.amount || 0;
  if (!e.recurring) return e.date.slice(0, 7) === mk_ ? amt : 0;
  const start = e.date.slice(0, 7), diff = monthDiff(start, mk_);
  if (diff < 0) return 0;
  if (e.cycle === 'monthly') return amt;
  if (e.cycle === 'quarterly') return diff % 3 ? 0 : amt;
  if (e.cycle === 'yearly') return diff % 12 ? 0 : amt;
  // weekly: count the charge days that land in this month
  const [y, m] = mk_.split('-').map(Number); let n = 0;
  for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) { const k = `${mk_}-${String(d).padStart(2, '0')}`; if (k >= e.date && Math.round((parseD(k) - parseD(e.date)) / 864e5) % 7 === 0) n++; }
  return n * amt;
}
function nextCharge(e) {
  const t = todayKey();
  if (!e.recurring) return e.date >= t ? e.date : null;
  let d = e.date;
  for (let i = 0; i < 600 && d < t; i++) d = e.cycle === 'weekly' ? addDays(d, 7) : (() => { const x = parseD(e.date), n = monthDiff(e.date.slice(0, 7), d.slice(0, 7)) + ({ monthly: 1, quarterly: 3, yearly: 12 }[e.cycle] || 1); const t2 = new Date(x.getFullYear(), x.getMonth() + n, 1); t2.setDate(Math.min(x.getDate(), new Date(t2.getFullYear(), t2.getMonth() + 1, 0).getDate())); return ymd(t2); })();
  return d;
}
function allPayments() {
  return D.portals.flatMap(p => (p.content?.billing?.payments || []).map(pm => ({ p, pm })));
}
const paidMonth = pm => (pm.paidAt || pm.date || '').slice(0, 7);
function niceMax(v) { if (v <= 0) return 100; const p = 10 ** Math.floor(Math.log10(v)), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function pageFinance() {
  const today = todayKey(), m0 = monthKey();
  const pays = allPayments(), ps = sortedPortals();
  const mrr = sum(ps.filter(p => hc(p.id).status === 'active').map(p => monthlyOf(+hc(p.id).retainer || 0, hc(p.id).cycle)));
  const collected = sum(pays.filter(x => x.pm.paid && paidMonth(x.pm) === m0).map(x => x.pm.amount));
  const unpaid = pays.filter(x => !x.pm.paid), outstanding = sum(unpaid.map(x => x.pm.amount)), overdue = unpaid.filter(x => x.pm.date < today);
  const expM = sum(D.expenses.map(e => expenseIn(e, m0)));
  const months = [-5, -4, -3, -2, -1, 0].map(monthKey);
  const inc = months.map(k => sum(pays.filter(x => x.pm.paid && paidMonth(x.pm) === k).map(x => x.pm.amount)));
  const exp = months.map(k => sum(D.expenses.map(e => expenseIn(e, k))));
  const max = niceMax(Math.max(...inc, ...exp)), mName = k => parseD(k + '-01').toLocaleDateString('en-GB', { month: 'short' });
  const list = [...unpaid.sort((a, b) => a.pm.date.localeCompare(b.pm.date)), ...pays.filter(x => x.pm.paid).sort((a, b) => (b.pm.paidAt || b.pm.date).localeCompare(a.pm.paidAt || a.pm.date))];
  const shown = S.payAll ? list : list.slice(0, unpaid.length + 4);
  return `${managerNav('finance')}
  <div class="page-head"><div><div class="eyebrow">${parseD(m0 + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div><h1>Finance</h1>
    <div class="sub">Payments here are the same ones in each client’s portal.</div></div>
    <div class="acts"><button class="btn" data-act="expense">${I.plus}Expense</button><button class="btn primary" data-act="payment">${I.plus}Payment</button></div></div>
  <div class="stats five">
    <div class="card stat"><div class="k">${I.refresh}Monthly recurring</div><div class="v">${money(mrr)}</div><div class="s">${ps.filter(p => hc(p.id).status === 'active').length} active clients</div></div>
    <div class="card stat"><div class="k">${I.check}Collected</div><div class="v">${money(collected)}</div><div class="s">This month</div></div>
    <div class="card stat ${overdue.length ? 'alert' : ''}"><div class="k">${I.clock}Outstanding</div><div class="v">${money(outstanding)}</div><div class="s">${overdue.length ? `${money(sum(overdue.map(x => x.pm.amount)))} overdue` : `${unpaid.length} scheduled`}</div></div>
    <div class="card stat"><div class="k">${I.card}Expenses</div><div class="v">${money(expM)}</div><div class="s">This month</div></div>
    <div class="card stat"><div class="k">${I.sparkle}Net</div><div class="v" style="${collected - expM < 0 ? 'color:var(--bad)' : ''}">${money(collected - expM)}</div><div class="s">Collected minus expenses</div></div>
  </div>
  <div class="fgrid">
    <div style="display:grid;gap:16px">
      <section class="card"><div class="card-head"><div><h3>Income vs expenses</h3><div class="sub">Last 6 months · income counts when a payment is marked paid</div></div>
        <div class="legend"><span><i style="background:var(--series-1)"></i>Income</span><span><i style="background:var(--series-2)"></i>Expenses</span></div></div>
        <div class="chart" aria-hidden="true"><div class="grid">${[0, .5, 1].map(f => `<div class="gl ${f ? '' : 'zero'}" style="bottom:${f * 100}%"><span>${moneyShort(max * f)}</span></div>`).join('')}</div>
          <div class="cols">${months.map((k, i) => `<div class="col ${k === m0 ? 'now' : ''}">
            <div class="bar i" style="height:${inc[i] / max * 100}%;animation-delay:${i * 50}ms"></div><div class="bar e" style="height:${exp[i] / max * 100}%;animation-delay:${i * 50 + 30}ms"></div>
            <div class="tip chrome"><b>${parseD(k + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</b><div><span><i style="background:var(--series-1)"></i>Income</span><span>${money(inc[i])}</span></div><div><span><i style="background:var(--series-2)"></i>Expenses</span><span>${money(exp[i])}</span></div><div style="margin-top:4px;font-weight:700"><span>Net</span><span>${money(inc[i] - exp[i])}</span></div></div>
            <div class="ml">${mName(k)}</div></div>`).join('')}</div></div>
        <table class="sr"><caption>Income and expenses by month</caption><tr><th>Month</th><th>Income</th><th>Expenses</th></tr>${months.map((k, i) => `<tr><td>${mName(k)}</td><td>${money(inc[i])}</td><td>${money(exp[i])}</td></tr>`).join('')}</table>
      </section>
      <section class="card"><div class="card-head"><div><h3>Client payments</h3><div class="sub">Tick to mark paid. Their portal updates instantly.</div></div><button class="ib" data-act="payment" title="Add payment" aria-label="Add payment">${I.plus}</button></div>
        ${shown.map(({ p, pm }) => payRow(p, pm)).join('') || empty('No payments scheduled', 'Add one, or set a payment schedule in a client’s portal.')}
        ${list.length > shown.length || S.payAll ? `<button class="more ${S.payAll ? 'open' : ''}" data-act="payAll">${I.right}${S.payAll ? 'Show less' : `Show all ${list.length}`}</button>` : ''}
      </section>
    </div>
    <div style="display:grid;gap:16px">
      <section class="card"><div class="card-head"><div><h3>Retainers</h3><div class="sub">${money(mrr)}/month across active clients</div></div></div>
        ${ps.map(p => { const c = hc(p.id); return `<div class="mrow click" data-act="client" data-id="${p.id}">${av(p, 'sm')}<div class="t"><div>${esc(p.name)}</div><small>${esc(c.plan || 'No plan set')} · ${CYCLES[c.cycle] || 'Monthly'}</small></div>
          ${c.status !== 'active' ? `<span class="chip">${c.status}</span>` : ''}<span class="amt">${money(c.retainer)}</span></div>`; }).join('') || empty('No clients yet')}
      </section>
      <section class="card"><div class="card-head"><div><h3>Expenses</h3><div class="sub">${money(sum(D.expenses.filter(e => e.recurring).map(e => monthlyOf(+e.amount, e.cycle))))}/month recurring</div></div><button class="ib" data-act="expense" title="Add expense" aria-label="Add expense">${I.plus}</button></div>
        ${[...D.expenses].sort((a, b) => (nextCharge(a) || '9999').localeCompare(nextCharge(b) || '9999')).map(e => { const n = nextCharge(e); return `<div class="mrow click" data-act="expense" data-id="${e.id}"><span class="cat">${EXP_CATS[e.category] || I.file}</span>
          <div class="t"><div>${esc(e.title)}</div><small>${esc(e.category)} · ${e.recurring ? CYCLES[e.cycle] : 'One-off'}${n ? ` · ${e.recurring ? 'next' : 'on'} ${fmtD(n)}` : e.recurring ? '' : ` · ${fmtD(e.date)}`}</small></div><span class="amt">${money(e.amount)}</span></div>`; }).join('') || empty('No expenses yet', 'Track software, freelancers and ads here.')}
      </section>
    </div>
  </div>`;
}
function payRow(p, pm) {
  const n = daysFrom(pm.date || todayKey());
  const chip = pm.paid ? `<span class="chip green">Paid${pm.paidAt ? ' ' + fmtD(pm.paidAt) : ''}</span>` : `<span class="chip ${n < 0 ? 'red' : n <= 3 ? 'orange' : 'blue'}">${n < 0 ? 'Overdue · ' : ''}${relLabel(pm.date)}</span>`;
  return `<div class="mrow ${pm.paid ? 'paid' : ''}"><button class="chk ${pm.paid ? 'on' : ''}" data-act="paid" data-pid="${p.id}" data-id="${pm.id}" aria-label="Mark paid">${I.check}</button>${av(p, 'sm')}
    <div class="t click" data-act="payment" data-pid="${p.id}" data-id="${pm.id}" style="cursor:pointer"><div>${esc(pm.for || 'Payment')}</div><small>${esc(p.name)}</small></div>${chip}<span class="amt">${money(pm.amount)}</span></div>`;
}

/* ---------- ONBOARDING & AUTOMATIONS ---------- */
// Step keys are stable (Claude and the old tracker use them). Labels can change freely.
const SKILLS = {
  'onboard-client': { d: 'Builds the Drive folders, the portal and access, books the call with a Meet link and sends the onboarding email.' },
  'onboarding-call': { d: 'Reads the onboarding form, builds the Notion brainstorm and context pages, and writes the call script.' },
  'post-onboarding-call': { d: 'Files the Gemini call notes in Drive and emails the client their profile optimisations.' },
  'super-onboarding': { d: 'Runs the three above in a row, watching for the form and the call notes in between.' },
  'client-scripting-tool': { d: 'Scripts the next episode from Notion and sends it to the client for approval.' },
  'client-editing-tool': { d: 'Pulls the raw footage, preps the edit, and uploads the finished video for approval.' },
};
const OB = [
  { e: '🚀', t: 'Kick-off', steps: [
    { k: 'paid', p: 'high', l: 'Client pays the invoice' },
    { k: 'drive', p: 'med', l: 'Drive folders built and shared with the client', s: 'onboard-client' },
    { k: 'call_booked', p: 'high', l: 'Onboarding call booked with Meet link', s: 'onboard-client' },
    { k: 'portal', p: 'med', l: 'Client portal built and access given', s: 'onboard-client' },
    { k: 'email_sent', p: 'high', l: 'Onboarding email sent with form and portal SOP', s: 'onboard-client' }] },
  { e: '📋', t: 'Call prep', steps: [
    { k: 'form_in', p: 'high', l: 'Client filled in the onboarding form', s: 'onboarding-call' },
    { k: 'notion_page', p: 'med', l: 'Notion client page built (problems, insecurities, actions, belief shifts)', s: 'onboarding-call' },
    { k: 'context_page', p: 'med', l: 'Client context page built', s: 'onboarding-call' },
    { k: 'call_script', p: 'high', l: 'Onboarding call script written', s: 'onboarding-call' }] },
  { e: '🧱', t: 'Onboarding call', steps: [
    { k: 'call_done', p: 'high', l: 'Have the onboarding call' },
    { k: 'notes_filed', p: 'med', l: 'Gemini call notes filed in the client’s Drive “call notes” folder', s: 'post-onboarding-call' },
    { k: 'profile_email', p: 'med', l: 'Profile optimisations emailed to the client', s: 'post-onboarding-call' }] },
  { e: '🛠️', t: 'Setup', steps: [
    { k: 'funnel', p: 'med', l: 'Set up funnel' },
    { k: 'content_structure', p: 'med', l: 'Create full in-depth content structure' }] },
  { e: '🖊️', t: 'First script', steps: [
    { k: 'script_written', p: 'high', l: 'First script written from the onboarding form', s: 'client-scripting-tool' },
    { k: 'script_sent', p: 'high', l: 'Script, screenplay and instructions emailed to the client', s: 'client-scripting-tool' }] },
  { e: '🎬', t: 'First video live', steps: [
    { k: 'video_edit', p: 'high', l: 'Once footage is recorded, edit the video', s: 'client-editing-tool' },
    { k: 'thumbnail', p: 'med', l: 'Build thumbnail for the series' },
    { k: 'video_posted', p: 'high', l: 'Post the video' },
    { k: 'feedback_video', p: 'med', l: 'Record feedback video and upload it to the portal' }] },
  { e: '💭', t: 'Cooldown', steps: [{ k: 'cooldown', p: 'low', l: '24 hour cooldown (warm up account)' }] },
  { e: '🗣️', t: 'Review', steps: [
    { k: 'perf_logged', p: 'med', l: 'Log how the video performed with a detailed breakdown' },
    { k: 'next_week_notes', p: 'med', l: 'Note what we’ll do differently next week' }] },
  { e: '♟️', t: 'Strategy call', steps: [
    { k: 'strategy_call', p: 'high', l: 'Weekly strategy call (stats breakdown + what’s next)' },
    { k: 'portal_update', p: 'low', l: 'Post an update in the client portal' }] },
];
const OB_STEPS = OB.flatMap((st, i) => st.steps.map(x => ({ ...x, stage: i })));
// what the hub can tell by itself from the portal
function obDetect(p) {
  const c = p.content || {}, out = {};
  if ((c.billing?.payments || []).some(x => x.paid)) out.paid = 'A payment is marked paid';
  if ((c.links || []).some(l => /drive\.google\.com|docs\.google\.com\/drive/i.test(l.url || ''))) out.drive = 'Drive folder is linked in the portal';
  if ((c.events || []).some(e => /onboard/i.test(e.title || ''))) out.call_booked = 'Onboarding call is in the portal';
  if ((D.access[p.id] || []).length) out.portal = 'Client has portal access';
  const form = Object.values(c.needs || {}).flat().find(n => /onboarding form/i.test(n?.title || ''));
  if (form && mk(p.id, form.id)?.value === 'done') out.form_in = 'Client ticked it off in their portal';
  const wk = mondayOf();
  if ((c.updates || []).some(u => u.date >= wk && !/^Portal created/i.test(u.text || ''))) out.portal_update = 'Update posted this week';
  return out;
}
function obStep(p, k, det = obDetect(p)) {
  const linked = D.tasks.find(t => t.portal_id === p.id && t.ob_key === k), at = hc(p.id).ob_done?.[k];
  if (linked) return { done: linked.done || !!det[k], via: linked.done ? 'task' : det[k] ? 'auto' : null, task: linked, det: det[k] };
  return { done: !!at || !!det[k], via: at ? 'manual' : det[k] ? 'auto' : null, at, det: det[k] };
}
function obSummary(p) {
  const det = obDetect(p), st = OB_STEPS.map(x => ({ ...x, ...obStep(p, x.k, det) })), done = st.filter(x => x.done).length;
  const next = st.find(x => !x.done), c = hc(p.id), d = k => st.find(x => x.k === k)?.done;
  let status = next ? `Next: ${next.l}` : 'Onboarding complete';
  if (next && d('call_done') && !d('notes_filed')) status = 'Waiting for call notes';
  else if (next && d('call_script') && !d('call_done')) status = c.ob_call_at ? `Call prepped · ${fmtCall(c.ob_call_at)}` : 'Call prepped · no call time set';
  else if (next && d('email_sent') && !d('form_in')) status = 'Waiting for the onboarding form';
  return { st, done, pct: Math.round(done / OB_STEPS.length * 100), next, stage: next ? next.stage : OB.length, status };
}
const fmtCall = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
function obStageDate(pid, s) {
  const c = hc(pid), start = c.ob_start || todayKey(), call = c.ob_call_at && !isNaN(new Date(c.ob_call_at)) ? ymd(new Date(c.ob_call_at)) : addDays(start, 1);
  if (s === 0) return start;
  if (s === 1) { const prep = addDays(call, -1); return prep < start ? start : prep; }
  return addDays(call, Math.max(0, s - 3));
}
function pageOnboarding() {
  const ps = sortedPortals(), tracked = ps.filter(p => hc(p.id).ob_start).sort((a, b) => (hc(b.id).ob_start || '').localeCompare(hc(a.id).ob_start || '')), untracked = ps.filter(p => !hc(p.id).ob_start);
  let sel = portal(S.obSel); if (!sel || !hc(sel.id).ob_start) sel = tracked.find(p => obSummary(p).pct < 100) || tracked[0];
  if (sel) S.obSel = sel.id;
  return `${managerNav('onboarding')}
  <div class="page-head"><div><div class="eyebrow">Onboarding & automations</div><h1>Onboarding</h1><div class="sub">Every new client from invoice to first video, and what Claude does for you.</div></div>
    <div class="acts"><button class="btn primary" data-act="newClient">${I.plus}New client</button></div></div>
  ${tracked.length ? `<div class="pipe">${tracked.map(p => { const s = obSummary(p), c = pColor(p); return `<button class="card pcard ${sel?.id === p.id ? 'on' : ''}" style="--c:${c}" data-act="obSel" data-id="${p.id}">
      <div class="r1">${av(p)}<b>${esc(p.name)}</b><span class="chip">${s.done}/${OB_STEPS.length}</span></div>
      <div class="pbar"><b style="width:${s.pct}%"></b></div><div class="st">${OB[Math.min(s.stage, OB.length - 1)].e} ${esc(s.status)}</div></button>`; }).join('')}</div>` : ''}
  <div class="ogrid"><div>${sel ? obDetail(sel) : `<div class="card">${empty('No one onboarding', 'New portals (from here or Claude’s onboard-client skill) start onboarding automatically.')}</div>`}
    ${untracked.length ? `<section class="card" style="margin-top:16px"><div class="card-head"><h3>Not tracking</h3></div>${untracked.map(p => `<div class="mrow">${av(p, 'sm')}<div class="t"><div>${esc(p.name)}</div></div><button class="btn sm" data-act="obStart" data-id="${p.id}">Start onboarding</button></div>`).join('')}</section>` : ''}</div>
    ${automationsCard(sel)}</div>`;
}
function obDetail(p) {
  const s = obSummary(p), c = hc(p.id), col = pColor(p);
  return `<section class="card" style="--c:${col};margin-bottom:12px"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      ${av(p, 'lg')}<div style="flex:1;min-width:180px"><h2 style="font-size:24px">${esc(p.name)}</h2><div class="muted" style="font-size:14px">${esc(s.status)}</div></div>${ring(s.pct, col, 'lg')}</div>
    <div class="three" style="margin-top:16px">
      <div><label class="l">Started</label><input type="date" value="${esc(c.ob_start || '')}" data-chg="obField" data-pid="${p.id}" data-f="ob_start"></div>
      <div><label class="l">Onboarding call</label><input type="datetime-local" value="${c.ob_call_at ? toLocalInput(c.ob_call_at) : ''}" data-chg="obField" data-pid="${p.id}" data-f="ob_call_at"></div>
      <div style="display:flex;gap:8px;align-items:flex-end"><button class="btn" style="flex:1" data-act="go" data-v="#/portal/${p.id}">${I.grid}Portal</button><button class="ib" data-act="obStop" data-id="${p.id}" title="Stop tracking onboarding" aria-label="Stop tracking">${I.x}</button></div>
    </div></section>
  ${OB.map((st, i) => {
    const rows = s.st.filter(x => x.stage === i), n = rows.filter(x => x.done).length, key = p.id + ':' + i;
    const open = S.obOpen[key] ?? (i === s.stage);
    return `<section class="card stage ${open ? 'open' : ''} ${n === rows.length ? 'complete' : ''} ${i === s.stage ? 'current' : ''}" data-stage="${key}">
      <button data-act="stage" data-id="${key}" aria-expanded="${open}"><span class="emo">${n === rows.length ? '✅' : st.e}</span><span class="sn"><b>${i + 1}. ${st.t}</b><small>${n} of ${rows.length} · ${fmtD(obStageDate(p.id, i), { weekday: 'short', day: 'numeric', month: 'short' })}</small></span>
        ${rows.some(x => x.s) ? `<span class="chip violet hide-m">${I.bolt}${[...new Set(rows.filter(x => x.s).map(x => x.s))].join(', ')}</span>` : ''}<span class="cv">${I.down}</span></button>
      <div class="body"><div>${rows.map(x => `<div class="step ${x.done ? 'done' : ''}">
        <button class="chk ${x.done ? 'on' : ''} ${x.via === 'auto' ? 'auto' : ''}" data-act="obTick" data-pid="${p.id}" data-k="${x.k}" aria-label="${esc(x.l)}">${I.check}</button>
        <div class="t"><div>${esc(x.l)}</div><div class="tags">${x.s ? `<span class="chip violet" title="Claude can do this with the ${x.s} skill">${I.bolt}${x.s}</span>` : ''}${x.det ? `<span class="chip green" title="${esc(x.det)}">${I.sparkle}Auto · ${esc(x.det)}</span>` : ''}${x.at ? `<span class="chip">${new Date(x.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>` : ''}</div></div>
        <button class="tbtn ${x.task ? 'on' : ''}" data-act="obTask" data-pid="${p.id}" data-k="${x.k}" title="${x.task ? 'Open the linked task' : 'Add this step to Tasks'}">${x.task ? I.check + 'In tasks' : I.plus + 'Task'}</button></div>`).join('')}</div></div></section>`;
  }).join('')}`;
}
const toLocalInput = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${ymd(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function automationsCard(p) {
  const s = p ? obSummary(p) : null;
  const cover = name => OB_STEPS.filter(x => x.s === name || (name === 'super-onboarding' && ['onboard-client', 'onboarding-call', 'post-onboarding-call'].includes(x.s)));
  return `<aside class="card auto-list" style="position:sticky;top:90px"><div class="card-head"><div><h3>${I.bolt}Automations</h3><div class="sub">${p ? `Progress for ${esc(p.name)}` : 'Claude skills + hub links'}</div></div></div>
    <div class="eyebrow" style="margin:4px 4px 2px">Claude skills</div>
    ${Object.entries(SKILLS).map(([name, x]) => { const steps = cover(name), d = s ? steps.filter(st => s.st.find(y => y.k === st.k)?.done).length : 0; return `<div class="ar"><span class="auto-ic">${I.bolt}</span>
      <div class="t"><b>${name}</b><p>${x.d}</p><div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap;align-items:center"><button class="tbtn" data-act="copy" data-v="/${name}" title="Copy the command for Claude">${I.copy}/${name}</button>
        ${s && steps.length ? `<span class="chip ${d === steps.length ? 'green' : ''}">${d}/${steps.length} steps</span>` : ''}</div></div></div>`; }).join('')}
    <div class="eyebrow" style="margin:14px 4px 2px">Built into the hub · always on</div>
    ${[['Tasks → client deliverables', 'Tasks with the eye on show in that week’s deliverables. Ticking either one ticks both, live.'],
      ['Client approvals → tasks', 'When a client approves or asks for changes, the task shows it straight away.'],
      ['Finance ⇄ portal payments', 'Mark a payment paid here and the client’s plan updates.'],
      ['New portal → Manager', 'Any new portal (including from onboard-client) joins Tasks and starts onboarding.'],
      ['Portal → onboarding ticks', 'Drive link, call booked, access given, form ticked and payment paid are detected automatically.'],
      ['Videos ⇄ Needed from me', 'Moving an episode adds or ticks off the matching item. Ticking the item moves the episode. Client sign-off happens in their portal.']]
      .map(([t, d]) => `<div class="ar"><span class="auto-ic live">${I.link}</span><div class="t"><b>${t}</b><p>${d}</p></div></div>`).join('')}
  </aside>`;
}


/* ---------- NEEDED FROM ME ---------- */
function neededItems() {
  const today = todayKey();
  const mine = D.inbox.filter(x => x.status === 'pending');
  const changes = D.tasks.filter(t => !t.done && t.deliverable && t.approval && aprState(t.portal_id, t.id) === 'changes');
  const late = allPayments().filter(x => !x.pm.paid && x.pm.date && x.pm.date < today);
  const unread = D.portals.filter(p => unreadFor(p.id));
  const videos = S.admin ? vtNeeds() : [];
  return { mine, changes, late, unread, videos, count: mine.length + changes.length + late.length + videos.length };
}
// red badges everywhere: tab title and the home-screen app icon too
function updateBadges() {
  if (!S.admin) return;
  const n = neededItems().count, all = n + totalUnread();
  document.title = all ? `(${all}) Stan Media Hub` : 'Stan Media Hub';
  if (navigator.setAppBadge) (all ? navigator.setAppBadge(all) : navigator.clearAppBadge()).catch(() => {});
}
const INBOX_ST = { approved: '<span class="chip green">Approved</span>', changes: '<span class="chip orange">Changes requested</span>', done: '<span class="chip green">Done</span>' };
function inboxRow(x) {
  const p = x.portal_id && portal(x.portal_id), done = x.status !== 'pending', apr = x.kind === 'approval';
  const ep = vtInboxEpisode(x);
  const meta = [p ? `<span class="chip"><span class="dot" style="--c:${pColor(p)}"></span>${esc(p.name)}</span>` : '', done ? INBOX_ST[x.status] : dueChip(x.due, false, 'By '),
    ep ? `<button class="chip" data-act="vtOpen" data-id="${ep.id}" title="Open the episode">${I.play}Ep ${ep.number} · ${esc(vtStage(ep).short)}</button>` : '',
    x.source && x.source !== 'manual' ? `<span class="chip violet">${I.bolt}${esc(x.source)}</span>` : '', done && x.response ? `<span class="chip">${I.chat}Note</span>` : ''].join('');
  return `<div class="need ${!done && apr ? 'ask' : ''} ${done ? 'done' : ''}">
    ${apr && !done ? '<span class="pulse"></span>' : `<button class="chk ${done ? 'on' : ''}" data-act="inboxDo" data-id="${x.id}" data-v="${done ? 'pending' : 'done'}" aria-label="${done ? 'Reopen' : 'Mark done'}">${I.check}</button>`}
    <div class="t" data-act="inbox" data-id="${x.id}"><div class="ttl">${apr && !done ? 'Approve: ' : ''}${esc(x.title)}</div>${x.notes ? `<div class="nt">${esc(x.notes)}</div>` : ''}<div class="tmeta">${meta}</div></div>
    <div class="acts">${x.link ? `<a class="ib sm" href="${esc(safeUrl(x.link))}" target="_blank" rel="noopener" title="Open link" aria-label="Open link">${I.ext}</a>` : ''}
      ${apr && !done ? `<button class="btn good sm" data-act="inboxDo" data-id="${x.id}" data-v="approved">${I.check}Approve</button><button class="btn sm" data-act="inbox" data-id="${x.id}" data-v="changes">Changes</button>` : ''}</div></div>`;
}
function pageNeeded() {
  const n = neededItems();
  const pend = [...n.mine].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.created_at.localeCompare(b.created_at));
  const resolved = D.inbox.filter(x => x.status !== 'pending').sort((a, b) => (b.resolved_at || '').localeCompare(a.resolved_at || ''));
  const fromClients = n.changes.length + n.late.length + n.unread.length;
  const chip = p => `<span class="chip"><span class="dot" style="--c:${pColor(p)}"></span>${esc(p.name)}</span>`;
  return `<div class="page-head"><div><div class="eyebrow">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>Needed from me</h1>
    <div class="sub">Approvals and anything waiting on you. Claude skills can drop things in here too.</div></div>
    <div class="acts"><button class="btn primary" data-act="inbox">${I.plus}Add</button></div></div>
  <div class="pgrid">
    <section class="card s7"><div class="card-head"><div><h3>${I.inbox}Waiting on you${pend.length ? `<span class="badge">${pend.length}</span>` : ''}</h3><div class="sub">Things to approve or do yourself</div></div><button class="ib sm" data-act="inbox" title="Add" aria-label="Add">${I.plus}</button></div>
      ${pend.map(inboxRow).join('')}${n.videos.map(vtNeedRow).join('')}${pend.length + n.videos.length ? '' : empty('All clear', 'Nothing needs you right now.')}
      <form class="qadd" data-form="inboxQuick"><input name="t" placeholder="Add something that needs your approval…" autocomplete="off" enterkeyhint="done" aria-label="New item"><button class="ib sm" aria-label="Add">${I.plus}</button></form></section>
    <section class="card s5"><div class="card-head"><div><h3>${I.users}From clients${n.changes.length + n.late.length ? `<span class="badge">${n.changes.length + n.late.length}</span>` : ''}</h3><div class="sub">Change requests, late payments and messages</div></div></div>
      ${n.changes.map(t => { const p = portal(t.portal_id), last = commentsFor(t.portal_id, t.id).filter(c => c.author_email !== me()).pop(); return `<div class="need chg"><span style="font-size:17px;line-height:1.4;width:24px;text-align:center">✏️</span>
        <div class="t" data-act="item" data-pid="${t.portal_id}" data-id="${t.id}"><div class="ttl">Changes wanted: ${esc(t.title)}</div>${last ? `<div class="nt">“${esc(last.body)}”</div>` : ''}<div class="tmeta">${chip(p)}</div></div>
        <div class="acts"><button class="btn sm" data-act="resend" data-pid="${t.portal_id}" data-id="${t.id}" title="Changes made: ask them to approve again">Re-send</button></div></div>`; }).join('')}
      ${n.late.map(({ p, pm }) => `<div class="need"><span class="pulse"></span><div class="t" data-act="payment" data-pid="${p.id}" data-id="${pm.id}"><div class="ttl">Chase payment: ${esc(pm.for || 'Payment')} · ${money(pm.amount)}</div>
        <div class="tmeta">${chip(p)}${dueChip(pm.date, false)}</div></div><div class="acts"><button class="btn good sm" data-act="paid" data-pid="${p.id}" data-id="${pm.id}">${I.check}Paid</button></div></div>`).join('')}
      ${n.unread.map(p => { const ms = D.comments.filter(c => c.portal_id === p.id && c.item_id === 'general' && c.author_email !== me()), k = unreadFor(p.id); return `<div class="need">${av(p, 'sm')}
        <div class="t" data-act="reply" data-id="${p.id}"><div class="ttl">${k} new message${k > 1 ? 's' : ''} from ${esc(p.name)}</div><div class="nt">${esc(ms[ms.length - 1]?.body || 'Sent a file')}</div></div>
        <div class="acts"><button class="btn sm" data-act="reply" data-id="${p.id}">${I.chat}Reply</button></div></div>`; }).join('')}
      ${fromClients ? '' : empty('Nothing from clients', 'Change requests, late payments and new messages show up here.')}</section>
    ${resolved.length ? `<section class="card s12"><button class="more ${S.showResolved ? 'open' : ''}" data-act="showResolved" style="padding-top:0">${I.right}${resolved.length} handled</button>${S.showResolved ? resolved.slice(0, 40).map(inboxRow).join('') : ''}</section>` : ''}
  </div>`;
}
function openInbox(id, focusResponse) {
  const x = id && D.inbox.find(i => i.id === id);
  if (id && !x) return;
  const btn = (v, label, cls = '') => `<button class="btn ${cls}" type="submit" form="inboxForm" name="decision" value="${v}">${label}</button>`;
  openSheet('inbox', { id }, () => `<div class="sh-head"><h2><span class="k">${!x ? 'Add to Needed from me' : x.status !== 'pending' ? 'Handled' : x.kind === 'approval' ? 'Needs your approval' : 'Needs doing'}</span></h2><button class="ib" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="sh-body"><form id="inboxForm" data-form="inbox" autocomplete="off">
      <input class="title-in" name="title" value="${esc(x?.title || '')}" placeholder="What needs you?" required maxlength="300">
      ${fSel('kind', 'Type', [['approval', 'Needs my approval'], ['todo', 'Needs me to do it']], x?.kind || 'approval')}
      <div class="two">${fSel('portal_id', 'Client', [['', 'No client'], ...portalOpts()], x?.portal_id || '')}<div class="fld"><label class="l">By</label><input type="date" name="due" value="${esc(x?.due || '')}"></div></div>
      ${fIn('link', 'Link', x?.link, 'placeholder="Script, video, doc…" inputmode="url"')}${fTa('notes', 'Details', x?.notes, 'What it is and what to check')}
      ${x ? fTa('response', 'Your response', x.response, 'Notes for yourself, or what needs changing') : ''}
      ${x?.source && x.source !== 'manual' ? `<p class="muted" style="font-size:13px">${I.bolt} Added by ${esc(x.source)} · ${new Date(x.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>` : ''}
    </form></div>
    <div class="sh-foot" style="flex-wrap:wrap">${x ? `<button class="btn danger ghost" data-act="inboxDel" data-id="${x.id}">${I.trash}</button>` : ''}<div class="r">
      ${!x ? `<button class="btn" data-act="close">Cancel</button>${btn('save', 'Add', 'primary')}`
        : x.status !== 'pending' ? `${btn('pending', 'Reopen')}${btn('save', 'Save', 'primary')}`
        : x.kind === 'approval' ? `${btn('changes', 'Request changes')}${btn('approved', I.check + 'Approve', 'good')}` : `${btn('save', 'Save')}${btn('done', I.check + 'Done', 'good')}`}</div></div>`,
    { focus: focusResponse ? '[name=response]' : x ? null : '[name=title]' });
  if (focusResponse) setTimeout(() => $('[name=response]', SH?.box)?.focus(), 120);
}
async function setInbox(x, patch, msg) {
  const prev = { ...x };
  if ('status' in patch) patch.resolved_at = patch.status === 'pending' ? null : new Date().toISOString();
  Object.assign(x, patch); render(false);
  const { error } = await sb.from('hub_inbox').update(patch).eq('id', x.id);
  if (error) { Object.assign(x, prev); render(false); return toast('Couldn’t save: ' + error.message); }
  if (msg) toast(msg, 'status' in patch && patch.status !== 'pending' ? () => setInbox(x, { status: 'pending' }) : null);
  if ('status' in patch && prev.status !== patch.status) vtOnInbox(x, patch.status);
}
async function addInbox(row) {
  const x = { id: uid(10), notes: '', link: '', portal_id: null, due: null, kind: 'approval', status: 'pending', response: '', source: 'manual', created_at: new Date().toISOString(), resolved_at: null, ...row };
  D.inbox.push(x); render(false);
  const { error } = await sb.from('hub_inbox').insert(x);
  if (error) { D.inbox = D.inbox.filter(i => i !== x); render(false); toast('Couldn’t add: ' + error.message); }
}

/* ---------- PORTAL ---------- */
const template = name => ({
  welcomeTitle: `Welcome, ${name}`,
  welcome: 'This is your private space. See what we’re working on this week, what we need from you, and everything we share, all in one place.',
  overview: { aim: '', deliverables: '', outcome: '' }, weeks: {}, needs: {},
  updates: [{ id: uid(), date: todayKey(), text: 'Portal created. We’ll post progress here.' }],
  events: [], billing: { payments: [], contract: {}, howToPay: '', payLink: '' }, links: [],
  contact: { name: 'Stan', email: me(), note: 'Questions? Reach out any time.' },
});
const allNeeds = c => Object.entries(c.needs || {}).flatMap(([wk, arr]) => (Array.isArray(arr) ? arr : []).map(n => ({ ...n, wk })));
function findNeed(p, id) { for (const arr of Object.values(p.content?.needs || {})) { const n = (arr || []).find(x => x.id === id); if (n) return { n, arr }; } return null; }
function deliverables(pid, wk) { return sortTasks(D.tasks.filter(t => t.portal_id === pid && t.deliverable && weekOf(t) === wk)); }
function linkIcon(url) {
  const u = (url || '').toLowerCase();
  if (/drive\.google|docs\.google\.com\/drive/.test(u)) return [I.folder, '#1fa463'];
  if (/docs\.google|sheets\.google|slides\.google/.test(u)) return [I.doc, '#4285f4'];
  if (/notion\.(so|site)/.test(u)) return [I.doc, '#2b2b2b'];
  if (/loom\.com|youtube|youtu\.be|vimeo|frame\.io/.test(u)) return [I.play, '#ff375f'];
  if (/meet\.google|zoom\.us|calendly|cal\.com/.test(u)) return [I.cal, '#30b0c7'];
  if (/stripe|paypal|invoice/.test(u)) return [I.card, '#5e5ce6'];
  if (/instagram|tiktok|linkedin|twitter|x\.com|facebook/.test(u)) return [I.user, '#af52de'];
  return [I.link, ''];
}
function pagePortal(p) {
  const head = S.admin ? portalNav(p) : (D.portals.length > 1 ? `<div class="subnav"><div class="chips">${D.portals.map(x => `<button class="fchip ${x.id === p?.id ? 'on' : ''}" data-act="go" data-v="#/portal/${x.id}">${av(x, 'sm')}${esc(x.name)}</button>`).join('')}</div></div>` : '');
  if (!p) return head + `<div class="card" style="padding:50px 24px">${empty(S.admin ? 'No portals yet' : 'Nothing here yet', S.admin ? 'Create a client to get their portal.' : `Once Stan Media shares a portal with ${esc(me())}, it will appear here.`)}</div>`;
  const admin = S.admin && !S.preview, c = p.content || {}, today = todayKey();
  const wk = S.week || mondayOf(), isNow = wk === mondayOf(), dels = deliverables(p.id, wk), dDone = dels.filter(t => t.done).length, pct = dels.length ? Math.round(dDone / dels.length * 100) : 0;
  const events = (c.events || []).filter(e => e.date);
  const up = events.filter(e => e.date >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const past = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const next = up[0];
  // actions needed: approvals waiting + requests
  const apprs = D.tasks.filter(t => t.portal_id === p.id && t.deliverable && t.approval).map(t => ({ kind: 'apr', t, st: aprState(p.id, t.id), date: t.review_by || t.due }));
  const needs = allNeeds(c).map(n => ({ kind: 'need', n, done: mk(p.id, n.id)?.value === 'done', date: n.date }));
  const openA = [...apprs.filter(x => x.st !== 'approved'), ...needs.filter(x => !x.done)].sort((a, b) => (a.kind === 'apr' && a.st === 'pending' ? 0 : 1) - (b.kind === 'apr' && b.st === 'pending' ? 0 : 1) || (a.date || '9999').localeCompare(b.date || '9999'));
  const doneA = [...apprs.filter(x => x.st === 'approved'), ...needs.filter(x => x.done)];
  const posts = [...(c.updates || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const b = c.billing || {}, ct = b.contract || {}, pays = [...(b.payments || [])].sort((x, y) => (x.date || '').localeCompare(y.date || '')), nextPay = pays.find(x => !x.paid), ov = c.overview || {};
  const editBtn = (act, label = 'Edit', extra = '') => admin ? `<button class="ib sm" data-act="${act}" data-pid="${p.id}" ${extra} title="${label}" aria-label="${label}">${I.edit}</button>` : '';
  const addBtn = (act, label) => admin ? `<button class="ib sm" data-act="${act}" data-pid="${p.id}" title="${label}" aria-label="${label}">${I.plus}</button>` : '';
  return `${head}<div class="pgrid">
  <section class="card hero s12 ${admin ? 'admin' : ''}" style="position:relative"><div class="t"><div class="eyebrow">${admin ? 'Client portal · admin' : 'Your portal'}<span class="dt"> · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
      <h1>${esc(c.welcomeTitle || 'Welcome, ' + p.name)}</h1><p>${linkify(c.welcome || '')}</p>
      ${next ? `<button class="nx" data-act="event" data-pid="${p.id}" data-id="${next.id}">${I.cal}<span>Next: ${esc(next.title)}</span><span class="chip blue">${relLabel(next.date)}${next.time ? ' · ' + fmtTime(next.time) : ''}</span></button>` : ''}</div>
    <div class="side">${ring(pct, 'var(--accent)', 'xl')}<small>${dDone} of ${dels.length} delivered<br>${isNow ? 'this week' : 'that week'}</small></div>
    ${admin ? `<div style="position:absolute;top:14px;right:14px">${editBtn('editWelcome', 'Edit welcome & contact')}</div>` : ''}</section>

  <section class="card s7"><div class="card-head"><div><h3>${I.flag}Actions needed${openA.length ? `<span class="badge">${openA.length}</span>` : ''}</h3><div class="sub">${admin ? 'What you’re waiting on from them' : 'What we need from you'}</div></div>${addBtn('need', 'Ask for something')}</div>
    ${openA.map(x => actionRow(p, x, admin)).join('') || `<div class="empty">${admin ? 'Nothing waiting on them. Add a request, or ask them to approve a deliverable.' : 'Nothing needed from you right now 🎉'}</div>`}
    ${doneA.length ? `<button class="more ${S.showDoneNeeds ? 'open' : ''}" data-act="showDoneNeeds">${I.right}${doneA.length} done</button>${S.showDoneNeeds ? doneA.map(x => actionRow(p, x, admin)).join('') : ''}` : ''}</section>

  <section class="card s5"><div class="card-head"><div><h3>${isNow ? 'This week’s deliverables' : 'Deliverables'}</h3><div class="sub">Week of ${fmtD(wk, { day: 'numeric', month: 'long' })}</div></div>
      <div class="wk-nav">${isNow ? '' : '<button class="btn sm ghost" data-act="week" data-v="now">Today</button>'}<button class="ib sm" data-act="week" data-v="-1" aria-label="Previous week">${I.left}</button><button class="ib sm" data-act="week" data-v="1" aria-label="Next week">${I.right}</button></div></div>
    <div class="progress"><b style="width:${pct}%"></b></div>
    ${dels.map(t => { const st = t.approval ? aprState(p.id, t.id) : null, nC = commentsFor(p.id, t.id).length; return `<div class="trow ${t.done ? 'done' : ''}">
      <button class="chk ${t.done ? 'on' : ''}" ${admin ? `data-act="tick" data-id="${t.id}"` : 'disabled tabindex="-1"'} aria-label="${t.done ? 'Delivered' : 'Not delivered yet'}">${I.check}</button>
      <div class="tmain" data-act="item" data-pid="${p.id}" data-id="${t.id}"><div class="ttl">${esc(t.title)}</div><div class="tmeta">${t.done ? '<span class="chip green">Delivered</span>' : dueChip(t.due, false)}${st ? aprChip(st) : ''}${t.notes ? `<span class="chip">${I.doc}Notes</span>` : ''}${nC ? `<span class="chip">${I.chat}${nC}</span>` : ''}</div></div></div>`; }).join('')
      || `<div class="empty">${admin ? 'No deliverables this week. Add one below, or switch the eye on for a task.' : 'Nothing scheduled for this week yet.'}</div>`}
    ${admin ? `<form class="qadd" data-form="qaddDel" data-pid="${p.id}"><input name="t" placeholder="Add a deliverable…" autocomplete="off" enterkeyhint="done" aria-label="New deliverable"><button class="ib sm" aria-label="Add">${I.plus}</button></form>` : ''}</section>

  <section class="card s7"><div class="card-head"><div><h3>${I.mega}Updates</h3><div class="sub">${admin ? 'Post news for ' + esc(p.name) : 'News from Stan Media'}</div></div><button class="btn sm" data-act="dock" data-v="1">${I.chat}Message</button></div>
    ${admin ? `<form class="compose-row" data-form="post" data-pid="${p.id}"><textarea name="b" rows="1" placeholder="Share an update…" aria-label="New update"></textarea><button class="send" aria-label="Post">${I.send}</button></form>` : ''}
    ${(S.showAllPosts ? posts : posts.slice(0, 5)).map(u => `<div class="post"><div class="d">${u.date === today ? 'Today' : fmtD(u.date, { weekday: 'short', day: 'numeric', month: 'short' })}${admin ? `<button class="ib sm" style="width:22px;height:22px;margin-left:auto" data-act="delPost" data-pid="${p.id}" data-id="${u.id}" aria-label="Delete update">${I.x}</button>` : ''}</div><p>${linkify(u.text)}</p></div>`).join('') || '<div class="empty">No updates yet.</div>'}
    ${posts.length > 5 ? `<button class="more ${S.showAllPosts ? 'open' : ''}" data-act="allPosts">${I.right}${S.showAllPosts ? 'Show fewer' : `All ${posts.length} updates`}</button>` : ''}</section>

  <section class="card s5"><div class="card-head"><div><h3>${I.cal}Upcoming</h3><div class="sub">Calls, deadlines and events</div></div><div style="display:flex;gap:6px">${past.length ? `<button class="btn sm ghost" data-act="past">${S.showPast ? 'Hide past' : `Past (${past.length})`}</button>` : ''}${addBtn('event', 'Add event')}</div></div>
    ${up.map(e => evRow(p, e)).join('') || '<div class="empty">Nothing coming up yet.</div>'}
    ${S.showPast ? past.map(e => evRow(p, e, true)).join('') : ''}</section>

  <section class="card s12"><div class="card-head"><div><h3>${I.link}Key links & resources</h3><div class="sub">Everything we share, in one place</div></div>${addBtn('link', 'Add link')}</div>
    ${(c.links || []).length ? `<div class="links">${c.links.map(l => { const [ic, col] = linkIcon(l.url); let host = ''; try { host = new URL(safeUrl(l.url)).hostname.replace(/^www\./, ''); } catch {} return `<div class="lw"><a class="lnk" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener"><span class="li" ${col ? `style="--c:${col}"` : ''}>${ic}</span><span class="t"><b>${esc(l.label)}</b><small>${esc(host || l.url)}</small></span>${I.ext}</a>
      ${admin ? `<button class="ib sm ed" data-act="link" data-pid="${p.id}" data-id="${l.id}" aria-label="Edit link">${I.edit}</button>` : ''}</div>`; }).join('')}</div>` : '<div class="empty">Nothing shared yet.</div>'}</section>

  <section class="card s12"><div class="card-head"><div><h3>${I.doc}Your plan</h3><div class="sub">Project, contract and payments</div></div>${editBtn('editPlan', 'Edit plan & contract')}</div>
    <div class="plan">
      <div class="pi">${[['aim', 'Aim'], ['deliverables', 'What you get'], ['outcome', 'Outcome']].map(([k, label]) => `<h4>${label}</h4><p class="${ov[k] ? '' : 'muted'}">${ov[k] ? linkify(ov[k]) : 'Not added yet.'}</p>`).join('')}</div>
      <div class="pi"><h4>Contract</h4>
        <div class="kv"><span>Start</span><span>${ct.start ? fmtD(ct.start, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
        <div class="kv"><span>End</span><span>${ct.end ? fmtD(ct.end, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
        <div class="kv"><span>Value</span><span>${ct.value ? money(String(ct.value).replace(/[^\d.]/g, '')) : '—'}</span></div>
        ${ct.terms ? `<div class="kv"><span>Terms</span><span>${esc(ct.terms)}</span></div>` : ''}
        ${ct.link ? `<a class="btn sm" style="margin-top:10px" href="${esc(safeUrl(ct.link))}" target="_blank" rel="noopener">View contract ${I.ext}</a>` : ''}</div>
      <div class="pi"><h4 style="display:flex;justify-content:space-between;align-items:center">Payments ${admin ? `<button class="ib sm" style="width:24px;height:24px" data-act="payment" data-pid="${p.id}" aria-label="Add payment">${I.plus}</button>` : ''}</h4>
        ${nextPay ? `<div class="big-amt">${money(nextPay.amount)}</div><span class="chip ${nextPay.date < today ? 'red' : daysFrom(nextPay.date) <= 3 ? 'orange' : 'blue'}">${nextPay.date < today ? 'Overdue · ' : 'Due '}${relLabel(nextPay.date)}</span><div class="muted" style="font-size:13px;margin-top:6px">${esc(nextPay.for || 'Next payment')}</div>`
          : `<div class="big-amt">✓</div><div class="muted" style="font-size:13px">${pays.length ? 'All paid up. Thank you!' : 'No payments scheduled yet.'}</div>`}
        ${pays.length ? `<div style="margin-top:12px">${pays.map(pm => `<div class="kv" ${admin ? `data-act="payment" data-pid="${p.id}" data-id="${pm.id}" style="cursor:pointer"` : ''}><span>${esc(pm.for || 'Payment')} · ${fmtD(pm.date)}</span><span>${pm.paid ? `<span class="chip green">${I.check}Paid</span>` : money(pm.amount)}</span></div>`).join('')}</div>` : ''}
        ${b.howToPay ? `<h4 style="margin-top:14px">How to pay</h4><p style="font-size:14px">${linkify(b.howToPay)}</p>` : ''}
        ${b.payLink ? `<a class="btn primary sm" style="margin-top:10px" href="${esc(safeUrl(b.payLink))}" target="_blank" rel="noopener">Pay now ${I.ext}</a>` : ''}</div>
    </div></section>

  ${admin ? `${vtPortalCard(p)}<section class="card s6"><div class="card-head"><div><h3>${I.users}Access</h3><div class="sub">Who can sign in to this portal</div></div></div>
    ${(D.access[p.id] || []).map(e => `<div class="person"><span class="av sm" style="--c:${colorFor(e)};border-radius:50%">${esc(e[0].toUpperCase())}</span><div class="e">${esc(e)}</div><button class="ib sm" data-act="delAccess" data-pid="${p.id}" data-v="${esc(e)}" aria-label="Remove access">${I.x}</button></div>`).join('') || '<div class="empty">Nobody has access yet.</div>'}
    <form class="qadd" data-form="access" data-pid="${p.id}"><input name="e" type="email" placeholder="client@company.com" autocomplete="off" aria-label="Email to give access"><button class="btn sm primary">Give access</button></form>
    <p class="muted" style="font-size:12.5px;margin:10px 4px 0">They sign in (or create an account) with this exact email and only ever see this portal.</p></section>
  <section class="card s6"><div class="card-head"><div><h3>${I.user}Contact on this portal</h3><div class="sub">Shown to the client</div></div>${editBtn('editWelcome', 'Edit contact')}</div>
    <div class="kv"><span>Name</span><span>${esc(c.contact?.name || '—')}</span></div><div class="kv"><span>Email</span><span>${esc(c.contact?.email || '—')}</span></div><div class="kv"><span>Note</span><span>${esc(c.contact?.note || '—')}</span></div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn sm" data-act="client" data-id="${p.id}">${I.edit}Client details</button><button class="btn sm danger ghost" data-act="delPortal" data-id="${p.id}">${I.trash}Delete portal</button></div></section>`
  : `<section class="card s12"><div class="card-head"><h3>${I.user}Your contact</h3></div><div style="display:flex;align-items:center;gap:12px">${c.contact?.name ? `<span class="av" style="--c:${colorFor(c.contact.name)}">${esc(initials(c.contact.name))}</span>` : ''}<div><b>${esc(c.contact?.name || 'Stan Media')}</b>${c.contact?.email ? `<div><a href="mailto:${esc(c.contact.email)}" style="color:var(--accent)">${esc(c.contact.email)}</a></div>` : ''}<div class="muted" style="font-size:14px">${esc(c.contact?.note || '')}</div></div>
      <button class="btn sm" style="margin-left:auto" data-act="dock" data-v="1">${I.chat}Message</button></div></section>`}
  </div>`;
}
function portalNav(p) {
  return `<div class="subnav portal-nav"><div class="chips">${sortedPortals().map(x => `<button class="fchip ${x.id === p?.id ? 'on' : ''}" data-act="go" data-v="#/portal/${x.id}">${av(x, 'sm')}${esc(x.name)}${unreadFor(x.id) ? '<span class="pip"></span>' : ''}</button>`).join('')}
    <button class="fchip" data-act="newClient">${I.plus}New</button></div>
    ${p ? seg('preview', [['0', 'Admin'], ['1', 'Client view']], S.preview ? '1' : '0', 'preview') : ''}</div>`;
}
function actionRow(p, x, admin) {
  if (x.kind === 'apr') {
    const t = x.t, cls = x.st === 'pending' ? 'ask' : x.st === 'changes' ? 'chg' : '', nC = commentsFor(p.id, t.id).length;
    return `<div class="need ${cls} ${x.st === 'approved' ? 'done' : ''}">${x.st === 'pending' ? '<span class="pulse"></span>' : `<span style="font-size:17px;line-height:1.4;width:24px;text-align:center">${x.st === 'approved' ? '✅' : '✏️'}</span>`}
      <div class="t" data-act="item" data-pid="${p.id}" data-id="${t.id}"><div class="ttl">${x.st === 'pending' ? 'Approve: ' : ''}${esc(t.title)}</div>
        <div class="nt">${x.st === 'pending' ? esc(t.notes || 'Please review this and approve it, or tell us what to change.') : x.st === 'approved' ? `Approved by ${esc(who(mk(p.id, t.id)?.by_email))}` : 'Changes requested. We’re on it.'}</div>
        <div class="tmeta">${x.st !== 'approved' ? dueChip(t.review_by, false, 'Review by ') : ''}${admin ? aprChip(x.st) : ''}${nC ? `<span class="chip">${I.chat}${nC}</span>` : ''}</div></div>
      <div class="acts">${!admin && x.st !== 'approved' ? `<button class="btn good sm" data-act="approve" data-pid="${p.id}" data-id="${t.id}">${I.check}Approve</button>` : ''}</div></div>`;
  }
  const n = x.n, m = mk(p.id, n.id), nC = commentsFor(p.id, n.id).length;
  return `<div class="need ${x.done ? 'done' : ''}"><button class="chk ${x.done ? 'on' : ''}" data-act="needDone" data-pid="${p.id}" data-id="${n.id}" aria-label="Mark done">${I.check}</button>
    <div class="t" data-act="item" data-pid="${p.id}" data-id="${n.id}"><div class="ttl">${esc(n.title)}</div>${n.notes ? `<div class="nt">${esc(n.notes)}</div>` : ''}
      <div class="tmeta">${x.done ? `<span class="chip green">Done${m ? ' by ' + esc(who(m.by_email)) : ''}</span>` : dueChip(n.date, false)}${nC ? `<span class="chip">${I.chat}${nC}</span>` : ''}</div></div>
    ${admin ? `<div class="acts"><button class="ib sm" data-act="need" data-pid="${p.id}" data-id="${n.id}" aria-label="Edit request">${I.edit}</button></div>` : ''}</div>`;
}
function evRow(p, e, past) {
  const d = parseD(e.date), rel = relLabel(e.date), soon = daysFrom(e.date) <= 1;
  const meta = [e.time && fmtTime(e.time), e.location && (/^https?:/i.test(e.location) ? 'Online' : e.location)].filter(Boolean).map(esc).join(' · ') || d.toLocaleDateString('en-GB', { weekday: 'long' });
  return `<button class="ev ${past ? 'past' : ''}" data-act="event" data-pid="${p.id}" data-id="${e.id}"><span class="ev-d"><small>${d.toLocaleDateString('en-GB', { month: 'short' })}</small><b>${d.getDate()}</b></span>
    <span class="t"><b>${esc(e.title)}</b><small>${meta}</small></span>${past ? '' : `<span class="chip ${soon ? 'orange' : 'blue'}">${rel}</span>`}</button>`;
}

/* ---------- threads ---------- */
const sameGroup = (a, b) => a && b && a.author_email === b.author_email && new Date(a.created_at).toDateString() === new Date(b.created_at).toDateString() && Math.abs(new Date(b.created_at) - new Date(a.created_at)) < 6e5;
const grpCls = (ms, i) => `${sameGroup(ms[i - 1], ms[i]) ? '' : 'first'} ${sameGroup(ms[i], ms[i + 1]) ? '' : 'last'}`;
// tap a bubble to see its time
document.addEventListener('click', e => { const w = e.target.closest('.bub-w'); if (w && !e.target.closest('a,button,img')) w.classList.toggle('show'); });
function threadHTML(pid, item) {
  const ms = commentsFor(pid, item);
  if (!ms.length) return `<div class="muted" style="font-size:13.5px;text-align:center;padding:8px">No messages yet. Questions or changes go here.</div>`;
  return ms.map((m, i) => `<div class="bub-w ${m.author_email === me() ? 'me' : ''} ${m._tmp ? 'sending' : ''} ${grpCls(ms, i)}">${sameGroup(ms[i - 1], m) ? '' : `<div class="nm">${esc(nameFor(m.author_email, pid))}</div>`}
    <div class="bub">${linkify(m.body)}</div><div class="tm">${m._tmp ? 'Sending…' : new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${canDelete(m) ? `<button class="del" data-act="delMsg" data-id="${m.id}">Delete</button>` : ''}</div></div>`).join('');
}
function drawThread(pid, item) {
  const box = SH && $('[data-thread]', SH.box); if (!box || !pid) return;
  const near = box.closest('.sh-body'); box.innerHTML = threadHTML(pid, item);
  const ap = $('[data-apr]', SH.box); if (ap) ap.innerHTML = SH.kind === 'item' ? itemStatus(SH.ctx) : aprBlock(pid, item);
  if (near && SH.kind === 'item') near.scrollTop = near.scrollHeight;
}
const composer = (pid, item) => `<form class="composer" data-form="comment" data-pid="${pid}" data-item="${item}" style="margin-top:8px"><textarea name="b" rows="1" placeholder="Write a message…" aria-label="Message"></textarea><button class="send" aria-label="Send">${I.send}</button></form>`;
function nameFor(email, pid) {
  if (email === me()) return 'You';
  const ct = portal(pid)?.content?.contact || {};
  if (!S.admin && ct.email && ct.email.toLowerCase() === email) return ct.name || who(email);
  return who(email);
}

/* item sheet: a deliverable or a request, as the client sees it (plus admin tools) */
function openItem(pid, id) {
  const p = portal(pid); if (!p) return;
  const t = task(id), nd = !t && findNeed(p, id); if (!t && !nd) return;
  const ctx = { pid, id };
  openSheet('item', ctx, () => itemHTML(ctx), { live: () => drawThread(pid, id) });
}
function itemStatus({ pid, id }) {
  const t = task(id), admin = S.admin && !S.preview;
  if (t) {
    if (!t.approval) return t.done ? '<span class="chip green">Delivered</span>' : '';
    const st = aprState(pid, id);
    return `${aprBlock(pid, id)}${!admin ? `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">${st !== 'approved' ? `<button class="btn good" data-act="approve" data-pid="${pid}" data-id="${id}">${I.check}Approve</button>` : `<button class="btn sm ghost" data-act="mark" data-pid="${pid}" data-id="${id}" data-v="">Undo approval</button>`}
      ${st !== 'changes' ? `<button class="btn" data-act="changes" data-pid="${pid}" data-id="${id}">Request changes</button>` : ''}</div>` : ''}`;
  }
  const m = mk(pid, id), done = m?.value === 'done';
  return `<button class="btn ${done ? 'ghost' : 'good'}" data-act="needDone" data-pid="${pid}" data-id="${id}">${done ? 'Mark not done' : I.check + 'Mark done'}</button>${done ? ` <span class="muted" style="font-size:13px">Done by ${esc(who(m.by_email))}</span>` : ''}`;
}
function itemHTML(ctx) {
  const p = portal(ctx.pid), t = task(ctx.id), n = !t && findNeed(p, ctx.id)?.n, admin = S.admin && !S.preview;
  const it = t || n || {}, notes = t ? t.notes : n?.notes;
  return `<div class="sh-head"><h2><span class="k">${t ? 'Deliverable' : 'Needed from you'} · ${esc(p.name)}</span>${esc(it.title || '')}</h2>
      ${admin ? `<button class="ib" data-act="${t ? 'task' : 'need'}" data-pid="${p.id}" data-id="${ctx.id}" title="Edit" aria-label="Edit">${I.edit}</button>` : ''}<button class="ib" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="sh-body">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${t ? (t.done ? '' : dueChip(t.due, false, 'Due ')) + (t.approval && t.review_by && !t.done ? dueChip(t.review_by, false, 'Review by ') : '') : dueChip(n?.date, false, 'Due ')}</div>
      ${notes ? `<p style="white-space:pre-wrap;line-height:1.55;margin-bottom:14px">${linkify(notes)}</p>` : ''}
      <div class="fld" data-apr>${itemStatus(ctx)}</div>
      <label class="l" style="margin-top:8px">Conversation</label><div class="thread" data-thread>${threadHTML(p.id, ctx.id)}</div>${composer(p.id, ctx.id)}
    </div>`;
}

/* ---------- form sheets (admin edits) ---------- */
function formSheet({ kicker, title, body, submit = 'Save', onSubmit, onDelete, deleteLabel = 'Delete', wide }) {
  const ctx = { onSubmit, onDelete };
  openSheet('form', ctx, () => `<div class="sh-head"><h2><span class="k">${esc(kicker || '')}</span>${esc(title)}</h2><button class="ib" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="sh-body"><form id="sheetForm" data-form="sheet" autocomplete="off">${body}</form></div>
    <div class="sh-foot">${onDelete ? `<button class="btn danger ghost" data-act="sheetDel">${I.trash}${deleteLabel}</button>` : ''}<div class="r"><button class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit" form="sheetForm">${submit}</button></div></div>`,
  { wide, focus: '#sheetForm input:not([type=hidden]),#sheetForm textarea' });
}
const fIn = (name, label, val = '', attrs = '') => `<div class="fld"><label class="l">${label}</label><input name="${name}" value="${esc(val ?? '')}" ${attrs}></div>`;
const fTa = (name, label, val = '', ph = '') => `<div class="fld"><label class="l">${label}</label><textarea name="${name}" placeholder="${esc(ph)}">${esc(val ?? '')}</textarea></div>`;
const fSel = (name, label, opts, val) => `<div class="fld"><label class="l">${label}</label><select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
const fTog = (name, label, on, sub = '') => `<label class="toggle"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span class="tr"><span class="kn"></span></span><span class="tx">${label}${sub ? `<small>${sub}</small>` : ''}</span></label>`;
const numVal = v => parseFloat(String(v).replace(/[£,\s]/g, ''));
const portalOpts = () => sortedPortals().map(p => [p.id, p.name]);

function editWelcome(p) {
  const c = p.content, ct = c.contact || {};
  formSheet({ kicker: p.name, title: 'Welcome & contact', body: `${fIn('name', 'Client name', p.name, 'required')}${fIn('welcomeTitle', 'Welcome title', c.welcomeTitle)}${fTa('welcome', 'Welcome message', c.welcome)}
    <div class="two">${fIn('cname', 'Contact name', ct.name)}${fIn('cemail', 'Contact email', ct.email, 'type="email"')}</div>${fIn('cnote', 'Contact note', ct.note)}`,
    onSubmit: f => { p.name = f.get('name').trim() || p.name; c.welcomeTitle = f.get('welcomeTitle'); c.welcome = f.get('welcome'); c.contact = { name: f.get('cname'), email: f.get('cemail'), note: f.get('cnote') }; savePortal(p, true); } });
}
function editPlan(p) {
  const c = p.content, ov = c.overview ||= {}, b = c.billing ||= { payments: [] }, ct = b.contract ||= {};
  formSheet({ kicker: p.name, title: 'Plan & contract', wide: true, body: `${fTa('aim', 'Aim', ov.aim, 'What this project is set up to achieve')}${fTa('deliverables', 'What they get', ov.deliverables, 'One per line')}${fTa('outcome', 'Outcome', ov.outcome, 'The result we’re working towards')}
    <div class="two"><div class="fld"><label class="l">Contract start</label><input type="date" name="start" value="${esc(ct.start || '')}"></div><div class="fld"><label class="l">Contract end</label><input type="date" name="end" value="${esc(ct.end || '')}"></div></div>
    <div class="two">${fIn('value', 'Total value (£)', ct.value, 'inputmode="decimal"')}${fIn('terms', 'Terms', ct.terms, 'placeholder="e.g. 3 months, monthly retainer"')}</div>${fIn('link', 'Contract link', ct.link, 'placeholder="https://…"')}
    ${fTa('howToPay', 'How to pay', b.howToPay, 'Bank details, reference to use…')}${fIn('payLink', 'Payment link', b.payLink, 'placeholder="Stripe / invoice link"')}`,
    onSubmit: f => { ['aim', 'deliverables', 'outcome'].forEach(k => ov[k] = f.get(k)); Object.assign(ct, { start: f.get('start'), end: f.get('end'), value: f.get('value').trim(), terms: f.get('terms'), link: f.get('link').trim() }); b.howToPay = f.get('howToPay'); b.payLink = f.get('payLink').trim(); savePortal(p, true); } });
}
function editNeed(p, id) {
  const found = id && findNeed(p, id), n = found?.n || { title: '', date: '', notes: '' };
  formSheet({ kicker: p.name, title: found ? 'Edit request' : 'Ask the client for something', submit: found ? 'Save' : 'Add request',
    body: `${fIn('title', 'What do you need from them?', n.title, 'required placeholder="e.g. Send brand assets"')}<div class="fld"><label class="l">Needed by</label><input type="date" name="date" value="${esc(n.date || '')}"></div>${fTa('notes', 'Notes', n.notes, 'Links, details, how to send it…')}`,
    onSubmit: f => {
      const v = { title: f.get('title').trim(), date: f.get('date'), notes: f.get('notes') }; if (!v.title) return false;
      if (found) Object.assign(n, v); else ((p.content.needs ||= {})[mondayOf(v.date || todayKey())] ||= []).push({ id: uid(), ...v });
      savePortal(p, true);
    },
    onDelete: found && (() => { found.arr.splice(found.arr.indexOf(n), 1); savePortal(p, true); }) });
}
function editLink(p, id) {
  const l = id && (p.content.links || []).find(x => x.id === id);
  formSheet({ kicker: p.name, title: l ? 'Edit link' : 'Add a link', submit: l ? 'Save' : 'Add link',
    body: `${fIn('label', 'Label', l?.label, 'required placeholder="e.g. Content folder"')}${fIn('url', 'Link', l?.url, 'required placeholder="https://…" inputmode="url"')}`,
    onSubmit: f => { const v = { label: f.get('label').trim(), url: f.get('url').trim() }; if (!v.label || !v.url) return false; if (l) Object.assign(l, v); else (p.content.links ||= []).push({ id: uid(), ...v }); savePortal(p, true); },
    onDelete: l && (() => { p.content.links = p.content.links.filter(x => x !== l); savePortal(p, true); }) });
}
function openEvent(p, id) {
  const ev = id && (p.content.events || []).find(e => e.id === id), admin = S.admin && !S.preview;
  if (!admin) {
    if (!ev) return;
    const links = ev.links || [], loc = ev.location || '';
    openSheet('event', {}, () => `<div class="sh-head"><h2><span class="k">${relLabel(ev.date)}</span>${esc(ev.title)}</h2><button class="ib" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="sh-body"><div class="kv"><span>${I.cal}</span><span>${parseD(ev.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${ev.time ? ' · ' + fmtTime(ev.time) : ''}</span></div>
        ${loc ? `<div class="kv"><span>${I.pin}</span><span>${/^https?:/i.test(loc) ? `<a href="${esc(loc)}" target="_blank" rel="noopener" style="color:var(--accent)">Join link</a>` : esc(loc)}</span></div>` : ''}
        ${ev.details ? `<label class="l" style="margin-top:14px">Details</label><p style="white-space:pre-wrap">${linkify(ev.details)}</p>` : ''}
        ${ev.notes ? `<label class="l" style="margin-top:14px">Notes</label><p style="white-space:pre-wrap">${linkify(ev.notes)}</p>` : ''}
        ${links.length ? `<label class="l" style="margin-top:14px">Links</label><div class="links">${links.map(l => `<a class="lnk" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener"><span class="li">${linkIcon(l.url)[0]}</span><span class="t"><b>${esc(l.label)}</b></span>${I.ext}</a>`).join('')}</div>` : ''}</div>`);
    return;
  }
  const e = ev || { title: '', date: S.week && S.week !== mondayOf() ? S.week : todayKey(), time: '', location: '', details: '', notes: '', links: [] };
  formSheet({ kicker: p.name, title: ev ? 'Edit event' : 'Add an event', submit: ev ? 'Save' : 'Add event', wide: true,
    body: `${fIn('title', 'Title', e.title, 'required placeholder="e.g. Strategy call"')}
      <div class="two"><div class="fld"><label class="l">Date</label><input type="date" name="date" value="${esc(e.date)}" required></div><div class="fld"><label class="l">Time</label><input type="time" name="time" value="${esc(e.time || '')}"></div></div>
      ${fIn('location', 'Location or call link', e.location, 'placeholder="Google Meet link, office…"')}${fTa('details', 'Details', e.details, 'What this is and what to expect')}${fTa('notes', 'Notes', e.notes, 'Prep, things to bring…')}
      ${fTa('links', 'Links (one per line: Label | https://…)', (e.links || []).map(l => `${l.label} | ${l.url}`).join('\n'), 'Google Meet | https://meet.google.com/…')}`,
    onSubmit: f => {
      const v = { title: f.get('title').trim(), date: f.get('date'), time: f.get('time'), location: f.get('location').trim(), details: f.get('details'), notes: f.get('notes'),
        links: f.get('links').split('\n').map(x => x.trim()).filter(Boolean).map(x => { const [a, b2] = x.includes('|') ? x.split('|') : [x, x]; return { id: uid(), label: a.trim(), url: (b2 || a).trim() }; }) };
      if (!v.title || !v.date) return false;
      if (ev) Object.assign(ev, v); else (p.content.events ||= []).push({ id: uid(), ...v });
      savePortal(p, true);
    },
    onDelete: ev && (() => { p.content.events = p.content.events.filter(x => x !== ev); savePortal(p, true); }) });
}
function openPayment(pid, id) {
  let p = pid && portal(pid); const pm = p && id && (p.content.billing?.payments || []).find(x => x.id === id);
  if (!D.portals.length) return toast('Add a client first');
  formSheet({ kicker: pm ? p.name : 'Client payment', title: pm ? 'Edit payment' : 'Schedule a payment', submit: pm ? 'Save' : 'Add payment',
    body: `${pm ? '' : fSel('pid', 'Client', portalOpts(), pid || (S.r?.pid || sortedPortals()[0]?.id))}${fIn('for', 'What it’s for', pm?.for, 'placeholder="e.g. Month 2 retainer"')}
      <div class="two">${fIn('amount', 'Amount (£)', pm?.amount, 'required inputmode="decimal" placeholder="750"')}<div class="fld"><label class="l">Due</label><input type="date" name="date" value="${esc(pm?.date || todayKey())}" required></div></div>
      ${fTog('paid', 'Paid', pm?.paid, 'Shows as paid in their portal')}`,
    onSubmit: f => {
      const amount = numVal(f.get('amount')); if (isNaN(amount)) { toast('Enter an amount'); return false; }
      if (!pm) p = portal(f.get('pid'));
      const paid = f.get('paid') === 'on', v = { for: f.get('for').trim(), amount, date: f.get('date'), paid };
      const b = p.content.billing ||= { payments: [] }; b.payments ||= [];
      if (pm) { Object.assign(pm, v); if (paid && !pm.paidAt) pm.paidAt = todayKey(); if (!paid) delete pm.paidAt; }
      else b.payments.push({ id: uid(), ...v, ...(paid ? { paidAt: todayKey() } : {}) });
      savePortal(p, true);
    },
    onDelete: pm && (() => { p.content.billing.payments = p.content.billing.payments.filter(x => x !== pm); savePortal(p, true); }) });
}
function openExpense(id) {
  const e = id && D.expenses.find(x => x.id === id);
  formSheet({ kicker: 'Expense', title: e ? e.title : 'Add an expense', submit: e ? 'Save' : 'Add expense',
    body: `${fIn('title', 'What is it?', e?.title, 'required placeholder="e.g. Adobe Creative Cloud"')}
      <div class="two">${fIn('amount', 'Amount (£)', e?.amount, 'required inputmode="decimal"')}${fSel('category', 'Category', Object.keys(EXP_CATS).map(k => [k, k]), e?.category || 'Software')}</div>
      <div class="fld"><label class="l">${e?.recurring ? 'First charge' : 'Date'}</label><input type="date" name="date" value="${esc(e?.date || todayKey())}" required></div>
      ${fTog('recurring', 'Recurring', e?.recurring ?? true, 'Charged every cycle from the date above')}
      <div class="if-rec">${fSel('cycle', 'Every', [['weekly', 'Week'], ['monthly', 'Month'], ['quarterly', 'Quarter'], ['yearly', 'Year']], e?.cycle || 'monthly')}</div>${fTa('notes', 'Notes', e?.notes)}`,
    onSubmit: async f => {
      const amount = numVal(f.get('amount')); if (isNaN(amount) || !f.get('title').trim()) { toast('Add a name and amount'); return false; }
      const v = { title: f.get('title').trim(), amount, category: f.get('category'), date: f.get('date'), recurring: f.get('recurring') === 'on', cycle: f.get('cycle'), notes: f.get('notes') };
      if (e) { Object.assign(e, v); dbUpdate('hub_expenses', { id: e.id }, v); }
      else { const row = { id: uid(10), ...v }; D.expenses.push(row); const { error } = await sb.from('hub_expenses').insert(row); if (error) { D.expenses = D.expenses.filter(x => x !== row); toast('Couldn’t save: ' + error.message); } }
    },
    onDelete: e && (async () => { D.expenses = D.expenses.filter(x => x !== e); const { error } = await sb.from('hub_expenses').delete().eq('id', e.id); if (error) { D.expenses.push(e); toast('Couldn’t delete: ' + error.message); } }) });
}
function openClient(pid) {
  const p = portal(pid); if (!p) return;
  const c = hc(pid);
  formSheet({ kicker: 'Client details · only you see these', title: p.name, wide: true,
    body: `${fIn('name', 'Name', p.name, 'required')}
      <div class="two">${fSel('status', 'Status', [['active', 'Active'], ['paused', 'Paused'], ['completed', 'Completed']], c.status)}<div class="fld"><label class="l">Colour</label><div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:6px">${COLORS.map(col => `<label style="cursor:pointer"><input type="radio" name="color" value="${col}" ${col === pColor(p) ? 'checked' : ''} class="sr"><span class="av sm" style="--c:${col};border-radius:50%;outline-offset:2px"></span></label>`).join('')}</div></div></div>
      <div class="three">${fIn('plan', 'Plan', c.plan, 'placeholder="Full stack"')}${fIn('retainer', 'Retainer (£)', c.retainer || '', 'inputmode="decimal"')}${fSel('cycle', 'Billed', Object.entries(CYCLES), c.cycle)}</div>
      <div class="two">${fIn('contact', 'Contact name', c.contact)}${fIn('phone', 'Phone', c.phone, 'type="tel"')}</div>
      <div class="two">${fIn('website', 'Website / handle', c.website)}${fIn('services', 'Services', c.services)}</div>
      <div class="fld"><label class="l">Client since</label><input type="date" name="start" value="${esc(c.start || '')}"></div>${fTa('notes', 'Notes', c.notes, 'Anything worth remembering')}`,
    onSubmit: f => {
      const name = f.get('name').trim(); if (name && name !== p.name) { p.name = name; savePortal(p, true); }
      saveClient(pid, { status: f.get('status'), color: f.get('color') || c.color || null, plan: f.get('plan').trim(), retainer: numVal(f.get('retainer')) || 0, cycle: f.get('cycle'),
        contact: f.get('contact').trim(), phone: f.get('phone').trim(), website: f.get('website').trim(), services: f.get('services').trim(), start: f.get('start') || null, notes: f.get('notes') });
    } });
}
function newClient() {
  formSheet({ kicker: 'New client', title: 'Add a client', submit: 'Create client & portal',
    body: `${fIn('name', 'Client name', '', 'required placeholder="e.g. CampFit"')}${fIn('email', 'Their email (portal login)', '', 'type="email" placeholder="client@company.com"')}
      <div class="three">${fIn('plan', 'Plan', '', 'placeholder="Full stack"')}${fIn('retainer', 'Retainer (£)', '', 'inputmode="decimal"')}${fSel('cycle', 'Billed', Object.entries(CYCLES), 'monthly')}</div>
      <p class="muted" style="font-size:13px">This creates their portal from the template and starts onboarding. Prefer Claude to do the lot? Run <b>/onboard-client</b>, it will show up here automatically.</p>`,
    onSubmit: async f => {
      const name = f.get('name').trim(), email = f.get('email').trim().toLowerCase(); if (!name) return false;
      const { data, error } = await sb.from('portals').insert({ name, content: template(name) }).select().single();
      if (error) { toast('Couldn’t create: ' + error.message); return false; }
      if (!portal(data.id)) D.portals.push(data);
      const color = COLORS[D.portals.length % COLORS.length];
      D.clients[data.id] = { ...hc(data.id), ob_start: todayKey(), color };
      saveClient(data.id, { color, plan: f.get('plan').trim(), retainer: numVal(f.get('retainer')) || 0, cycle: f.get('cycle'), ob_start: todayKey() });
      if (/^\S+@\S+\.\S+$/.test(email)) { const r = await sb.from('portal_access').insert({ portal_id: data.id, email }); if (!r.error) (D.access[data.id] ||= []).push(email); else toast('Portal made, but access failed: ' + r.error.message); }
      toast(`${name} added`); go('#/portal/' + data.id);
    } });
}
function openRecovery() {
  S.recovery = false;
  formSheet({ kicker: 'Account', title: 'Set a new password', submit: 'Update password', body: fIn('password', 'New password', '', 'type="password" minlength="6" required autocomplete="new-password"'),
    onSubmit: async f => { const { error } = await sb.auth.updateUser({ password: f.get('password') }); if (error) { toast(error.message); return false; } toast('Password updated'); } });
}

/* ---------- sheet plumbing ---------- */
let SH = null;
function openSheet(kind, ctx, draw, opts = {}) {
  closeSheet(true);
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  scrim.innerHTML = `<div class="sheet ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true"></div>`;
  document.body.appendChild(scrim);
  SH = { el: scrim, box: scrim.firstElementChild, kind, ctx, draw, live: opts.live, onClose: opts.onClose };
  SH.box.innerHTML = draw(ctx);
  syncSegs(SH.box);
  scrim.addEventListener('pointerdown', e => { scrim._down = e.target === scrim; });
  scrim.addEventListener('click', e => { if (e.target === scrim && scrim._down) closeSheet(); });
  document.body.style.overflow = 'hidden';
  if (opts.focus && matchMedia('(hover:hover)').matches) setTimeout(() => $(opts.focus, SH?.box)?.focus(), 80);
  const th = kind === 'item' && $('[data-thread]', SH.box); if (th) { const b = th.closest('.sh-body'); if (b) setTimeout(() => b.scrollTop = b.scrollHeight, 30); }
}
function redrawSheet() { if (!SH) return; const b = $('.sh-body', SH.box), y = b?.scrollTop; SH.box.innerHTML = SH.draw(SH.ctx); syncSegs(SH.box); const b2 = $('.sh-body', SH.box); if (b2 && y) b2.scrollTop = y; }
function closeSheet(instant) {
  if (!SH) return;
  const s = SH; SH = null;
  try { s.onClose?.(); } catch (e) { console.error(e); }
  document.body.style.overflow = '';
  if (instant || reduceMotion.matches) s.el.remove(); else { s.el.classList.add('out'); setTimeout(() => s.el.remove(), 260); }
}
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('.menu')) return closeMenu(); if ($('.lightbox')) return $('.lightbox').remove(); if (SH) return closeSheet(); if (dock.open) dock.toggle(false); }
  // Enter sends in chat boxes; Shift+Enter for a new line
  const ta = e.target.closest?.('.composer textarea, .compose-row textarea');
  if (ta && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ta.form.requestSubmit(); }
});

/* ---------- menu ---------- */
function closeMenu() { $('.menu')?.remove(); }
function openMenu(anchor) {
  closeMenu();
  const r = anchor.getBoundingClientRect(), m = document.createElement('div'); m.className = 'menu';
  m.innerHTML = `<div class="mh">${esc(me())}<br><b style="color:var(--ink)">${S.admin ? 'Admin' : 'Client'}</b></div><hr>
    <button class="mi" data-act="refresh">${I.refresh}Refresh</button><button class="mi" data-act="theme">${isDark() ? I.sun : I.moon}${isDark() ? 'Light mode' : 'Dark mode'}</button><hr>
    <button class="mi" data-act="signout" style="color:var(--bad)">${I.out}Sign out</button>`;
  document.body.appendChild(m);
  m.style.top = r.bottom + 8 + 'px'; m.style.right = Math.max(10, innerWidth - r.right) + 'px';
  setTimeout(() => addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { closeMenu(); removeEventListener('pointerdown', off, true); } }, true));
}

/* ---------- theme ---------- */
const sysDark = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : sysDark.matches;
function toggleTheme(from) {
  const dark = !isDark(), apply = () => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; if (S.ready) renderTop(S.r || route()); };
  lsSet('hub-theme', dark ? 'dark' : 'light');
  if (reduceMotion.matches || !document.startViewTransition || !from) { document.documentElement.classList.add('theme-fade'); apply(); return setTimeout(() => document.documentElement.classList.remove('theme-fade'), 500); }
  const r = from.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }, { duration: 650, easing: 'cubic-bezier(.3,.8,.3,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
}
sysDark.addEventListener('change', () => S.ready && renderTop(S.r || route()));

/* ---------- chat dock (one thread per portal) ---------- */
const FILE_MAX = 10 * 1024 * 1024;
const signed = {};
async function fileUrl(path, download) {
  const key = path + (download ? '#dl' : '');
  if (signed[key] && signed[key].exp > Date.now()) return signed[key].url;
  const { data, error } = await sb.storage.from('portal-files').createSignedUrl(path, 3600, download ? { download } : undefined);
  if (error) return null;
  signed[key] = { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 };
  return data.signedUrl;
}
const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const dock = {
  open: false, seen: 0, pid: null,
  sync() {
    const r = S.r, p = r?.mode === 'portal' && portal(r.pid), show = !!p && S.ready;
    $('#dock').hidden = !show;
    if (!show) { if (this.open) this.toggle(false); return; }
    if (this.pid !== p.id) { this.pid = p.id; this.seen = 0; }
    const ct = p.content?.contact || {}, nm = S.admin ? p.name : (ct.name || 'Stan Media');
    $('#dockName').textContent = nm;
    $('#dockSub').textContent = S.admin ? ((D.access[p.id] || []).join(', ') || 'No client added yet') : 'Chat with ' + (ct.name || 'Stan Media');
    const a = $('#dockAv'); a.textContent = initials(nm); a.style.setProperty('--c', S.admin ? pColor(p) : colorFor(nm));
    this.redraw();
  },
  readKey() { return `hub.read:${this.pid}:${me()}`; },
  redraw() {
    if ($('#dock').hidden || !this.pid) return;
    const ms = D.comments.filter(c => c.portal_id === this.pid && c.item_id === 'general'), box = $('#dockMsgs');
    if (this.open) lsSet(this.readKey(), new Date().toISOString());
    const unread = unreadFor(this.pid), badge = $('#dockBadge');
    badge.hidden = !unread; badge.textContent = unread > 9 ? '9+' : unread;
    if (!this.open && this.seen) return;
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    let lastDay = '';
    box.innerHTML = ms.length ? ms.map((m, i) => {
      const d = new Date(m.created_at), day = d.toDateString(), mine = m.author_email === me();
      const lbl = day === new Date().toDateString() ? 'Today' : day === new Date(Date.now() - 864e5).toDateString() ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const sep = day !== lastDay ? `<div class="day-sep">${lbl}</div>` : ''; lastDay = day;
      const showName = !mine && (!sameGroup(ms[i - 1], m) || sep);
      const a = m.attachment, img = a && /^image\//.test(a.type || '');
      const att = !a ? '' : img ? `<img class="att-img" data-img="${esc(a.path)}" alt="${esc(a.name)}">`
        : `<a class="att-file" data-dl="${esc(a.path)}" data-name="${esc(a.name)}" href="#"><span class="fi">${esc((a.name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase())}</span><span style="min-width:0"><b>${esc(a.name)}</b><small>${fmtSize(a.size || 0)}${m._tmp ? ' · Uploading…' : ''}</small></span></a>`;
      return `${sep}<div class="bub-w ${mine ? 'me' : ''} ${m._tmp ? 'sending' : ''} ${sep ? 'first' : ''} ${grpCls(ms, i)}" style="${i < this.seen ? 'animation:none' : ''}">${showName ? `<div class="nm">${esc(nameFor(m.author_email, this.pid))}</div>` : ''}${att}${m.body ? `<div class="bub">${linkify(m.body)}</div>` : ''}
        <div class="tm">${m._tmp ? 'Sending…' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}${canDelete(m) ? `<button class="del" data-act="delMsg" data-id="${m.id}">Delete</button>` : ''}</div></div>`;
    }).join('') : `<div class="empty" style="margin-top:30%"><b>Start the conversation</b>Messages, links and files you share here stay in this portal.</div>`;
    $$('[data-img]', box).forEach(async img => {
      const u = await fileUrl(img.dataset.img); if (u) img.src = u;
      img.onclick = () => { const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<img src="${esc(u)}" alt="">`; lb.onclick = () => lb.remove(); document.body.appendChild(lb); };
      img.onload = () => { if (nearBottom || !this.seen) box.scrollTop = box.scrollHeight; };
    });
    $$('[data-dl]', box).forEach(a => a.onclick = async e => { e.preventDefault(); const u = await fileUrl(a.dataset.dl, a.dataset.name); u ? window.open(u, '_blank', 'noopener') : toast('Couldn’t open that file'); });
    if (ms.length !== this.seen && (nearBottom || !this.seen || ms[ms.length - 1]?.author_email === me())) box.scrollTop = box.scrollHeight;
    this.seen = ms.length;
  },
  toggle(on = !this.open) {
    this.open = on; $('#dock').classList.toggle('open', on); $('#dockPanel').setAttribute('aria-hidden', !on);
    if (on) { this.seen = 0; this.redraw(); if (matchMedia('(hover:hover)').matches) setTimeout(() => $('#dockIn').focus(), 350); if (S.ready) setTimeout(() => render(false), 400); }
  },
  nudge() { if (this.open) return; const b = $('.dock-btn'); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); },
  send() {
    const ta = $('#dockIn'), v = ta.value.trim(); if (!v || !this.pid) return;
    if (S.preview) return toast('Preview only. Switch back to admin to send messages.');
    ta.value = ''; this.grow(); postComment(this.pid, 'general', v);
  },
  async upload(file) {
    if (!file || !this.pid) return;
    if (S.preview) return toast('Preview only. Switch back to admin to send files.');
    if (file.size > FILE_MAX) return toast('That file is over 10 MB. Share a link to it instead.');
    const pid = this.pid, safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80), path = `${pid}/${Date.now()}-${uid()}-${safe}`;
    const caption = $('#dockIn').value.trim(); $('#dockIn').value = ''; this.grow();
    const tmp = { id: 'tmp-' + uid(), _tmp: true, portal_id: pid, item_id: 'general', author_email: me(), body: caption, attachment: { name: file.name, size: file.size, type: file.type, path: '' }, created_at: new Date().toISOString() };
    D.comments.push(tmp); this.redraw();
    const { error } = await sb.storage.from('portal-files').upload(path, file, { contentType: file.type || 'application/octet-stream' });
    D.comments = D.comments.filter(x => x !== tmp);
    if (error) { this.redraw(); return toast('Upload failed: ' + error.message); }
    postComment(pid, 'general', caption, { path, name: file.name, size: file.size, type: file.type || '' });
  },
  grow() { const ta = $('#dockIn'); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; $('#dockSend').disabled = !ta.value.trim(); },
};
(() => {
  $('.dock-btn').innerHTML = `${I.chat.replace('<svg', '<svg class="ic1" width="26" height="26"').replace('width="18" height="18"', '')}${I.x.replace('<svg', '<svg class="ic2" width="22" height="22"').replace('width="18" height="18"', '')}<span class="badge" id="dockBadge" hidden></span>`;
  $('.dock-head .ib').innerHTML = I.x; $('#dockAttach').innerHTML = I.clip; $('#dockSend').innerHTML = I.send;
  const panel = $('#dockPanel'), ta = $('#dockIn');
  $('#dockSend').onclick = () => dock.send();
  $('#dockAttach').onclick = () => $('#dockFile').click();
  $('#dockFile').onchange = e => { dock.upload(e.target.files[0]); e.target.value = ''; };
  ta.oninput = () => dock.grow();
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); dock.send(); } };
  ta.onpaste = e => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); dock.upload(f); } };
  let depth = 0;
  panel.addEventListener('dragenter', e => { e.preventDefault(); depth++; panel.classList.add('drag'); });
  panel.addEventListener('dragover', e => e.preventDefault());
  panel.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; panel.classList.remove('drag'); } });
  panel.addEventListener('drop', e => { e.preventDefault(); depth = 0; panel.classList.remove('drag'); dock.upload(e.dataTransfer.files[0]); });
})();

/* ---------- VIDEOS (episode pipeline) ----------
   Every client video episode and the stage it is at, manager side only. Lives in vt_episodes / vt_activity
   (see video-tracker-supabase.sql). Episodes belong to portals. The Super Client Video skill moves episodes
   with vt_set_stage(); the hub picks that up live. Moves made here chain into Needed from me (hub_inbox) and,
   for client sign-off, into a deliverable the client approves in their portal. */
const VT_STAGES = [
  { id: 'scripted',          label: 'Scripted',                    short: 'Scripted',       who: 'me',     next: 'Approve the script',       inbox: { kind: 'todo', title: (c, n) => `Approve ${c} ep ${n} script` } },
  { id: 'script_approved',   label: 'Script approved',             short: 'Script OK',      who: 'me',     next: 'Send it to the client' },
  { id: 'sent_to_client',    label: 'Waiting for footage',         short: 'Footage',        who: 'client', next: 'Client is recording' },
  { id: 'footage_uploaded',  label: 'Footage uploaded',            short: 'Footage in',     who: 'me',     next: 'Start the edit',           inbox: { kind: 'todo', title: (c, n) => `Edit ${c} ep ${n}` } },
  { id: 'editing',           label: 'Editing',                     short: 'Editing',        who: 'none',   next: 'Edit in progress' },
  { id: 'waiting_approval',  label: 'Ready for my review',         short: 'My review',      who: 'me',     next: 'Review the video',         inbox: { kind: 'approval', title: (c, n) => `Review ${c} episode ${n}` } },
  { id: 'client_approval',   label: 'Waiting for client approval', short: 'Client sign-off',who: 'client', next: 'Client is reviewing' },
  { id: 'approved',          label: 'Approved',                    short: 'Approved',       who: 'me',     next: 'Record the feedback video', inbox: { kind: 'todo', title: (c, n) => `Record feedback video for ${c} ep ${n}` } },
  { id: 'feedback_recorded', label: 'Feedback video recorded',     short: 'Done',           who: 'none',   next: 'Done' },
];
const VT_IDX = Object.fromEntries(VT_STAGES.map((s, i) => [s.id, i]));
const VT_FINAL = 'feedback_recorded';
// Inbox titles the skill writes that mean "this episode is stuck on something"
const VT_ATTN = /^(attention:|fix send for|chase |answer (script|edit) question for|wake your mac for|check .* video|need from you:)/i;
const vtIsStage = s => typeof s === 'string' && Object.prototype.hasOwnProperty.call(VT_IDX, s);
const vtEp = id => D.episodes.find(e => e.id === id);
const vtStage = ep => VT_STAGES[VT_IDX[ep.stage]] || VT_STAGES[0];
const vtColor = id => `var(--vt${(VT_IDX[id] ?? 0) + 1})`;
const vtName = ep => `${portal(ep.portal_id)?.name || 'Client'} · Ep ${ep.number}`;
const vtDaysSince = iso => iso ? Math.max(0, Math.round((parseD(todayKey()) - parseD(ymd(new Date(iso)))) / 864e5)) : 0;
const vtEnteredAt = ep => { const h = ep.history || []; for (let i = h.length - 1; i >= 0; i--) if (h[i].stage === ep.stage) return h[i].at; return ep.created_at; };
const vtLastChange = ep => [vtEnteredAt(ep), ep.blocked?.at, ep.created_at].filter(Boolean).sort().pop();
const vtFmt = iso => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
function vtSorted(list) { return [...list].sort((a, b) => (a.portal_id !== b.portal_id ? (portal(a.portal_id)?.name || '').localeCompare(portal(b.portal_id)?.name || '') : b.number - a.number)); }

/* inbox ↔ episode: the skill's items are "<verb> <Client> ep <N> …"; match on portal + episode number */
function vtInboxEpisode(x) {
  if (!x) return null;
  const m = (x.title || '').match(/\b(?:ep|episode)\.?\s*(\d+)\b/i); if (!m) return null;
  const n = +m[1], t = x.title.toLowerCase();
  let pid = x.portal_id;
  if (!pid) { const p = sortedPortals().find(p => t.includes(p.name.toLowerCase())) || sortedPortals().find(p => new RegExp('\\b' + p.name.toLowerCase().split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t)); pid = p?.id; }
  if (!pid) return null;
  return D.episodes.find(e => e.portal_id === pid && e.number === n) || null;
}
const vtItemsFor = ep => D.inbox.filter(x => x.status === 'pending' && vtInboxEpisode(x)?.id === ep.id);
function vtBlocked(ep) {
  if (ep.blocked?.reason) return { reason: ep.blocked.reason, at: ep.blocked.at, src: 'flag' };
  const x = vtItemsFor(ep).find(i => VT_ATTN.test(i.title));
  return x ? { reason: x.notes?.trim() ? x.notes.trim().split('\n')[0] : x.title, at: x.created_at, src: 'inbox', item: x } : null;
}
/* episodes waiting on Stan with no item in Needed from me yet: shown there so nothing is missed */
function vtNeeds() {
  return D.episodes.filter(ep => ep.stage !== VT_FINAL && vtStage(ep).who === 'me' && !vtItemsFor(ep).length)
    .map(ep => ({ ep, action: vtStage(ep).next, since: vtLastChange(ep) }))
    .sort((a, b) => (a.since || '').localeCompare(b.since || ''));
}
const vtNextOf = ep => VT_STAGES[VT_IDX[ep.stage] + 1] || null;
function vtDue(ep) {
  if (!ep.due) return '';
  const n = daysFrom(ep.due), done = ep.stage === VT_FINAL, cls = done ? '' : n < 0 ? 'red' : n <= 2 ? 'orange' : '';
  return `<span class="chip ${cls}">${I.clock}${n < 0 ? `${-n}d overdue` : n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : n <= 6 ? `Due in ${n}d` : 'Due ' + fmtD(ep.due)}</span>`;
}
const vtStageChip = ep => `<span class="vt-chip" style="--c:${vtColor(ep.stage)}"><span class="dot" style="--c:${vtColor(ep.stage)}"></span>${esc(vtStage(ep).label)}</span>`;

/* ---------- writes ---------- */
const vtSaveT = {};
async function vtLog(entry) {
  const row = { id: 'a' + uid(10), at: new Date().toISOString(), type: 'note', episode_id: null, portal_id: null, from_stage: null, to_stage: null, via: 'hub', text: '', ...entry };
  D.vact.unshift(row);
  const { error } = await sb.from('vt_activity').insert(row);
  if (error) console.warn('activity', error.message);
}
async function vtUpdate(ep, patch, log) {
  Object.assign(ep, patch, { updated_at: new Date().toISOString() });
  vtSaveT[ep.id] = (vtSaveT[ep.id] || 0) + 1;
  const { error } = await sb.from('vt_episodes').update({ ...patch, updated_at: ep.updated_at }).eq('id', ep.id);
  if (!--vtSaveT[ep.id]) delete vtSaveT[ep.id];
  if (error) toast('Couldn’t save: ' + error.message);
  else if (log) vtLog({ episode_id: ep.id, portal_id: ep.portal_id, ...log });
  return !error;
}
async function vtSetStage(ep, stage, via = 'hub') {
  if (!vtIsStage(stage) || ep.stage === stage) return false;
  const from = ep.stage, back = VT_IDX[stage] < VT_IDX[from], at = new Date().toISOString();
  const history = [...(ep.history || []), { stage, at, via, ...(back ? { back: true } : {}) }];
  const ok = await vtUpdate(ep, { stage, history }, { type: 'stage', from_stage: from, to_stage: stage, via });
  if (ok) vtChain(ep, from, stage);     // idempotent: resolves only pending items, never adds a duplicate
  return ok;
}
async function vtCreate({ portal_id, number, title = '', stage = 'scripted', due = null, notes = '' }) {
  const at = new Date().toISOString();
  const ep = { id: 'ep' + uid(10), portal_id, number, title, stage, history: [{ stage, at, via: 'hub' }], notes, links: {}, blocked: null, due, task_id: null, created_at: at, updated_at: at };
  D.episodes.push(ep);
  const { error } = await sb.from('vt_episodes').insert(ep);
  if (error) { D.episodes = D.episodes.filter(x => x !== ep); toast('Couldn’t add: ' + error.message); return null; }
  vtLog({ type: 'added', episode_id: ep.id, portal_id, to_stage: stage });
  vtChain(ep, null, stage);
  return ep;
}
async function vtDelete(ep) {
  D.episodes = D.episodes.filter(x => x !== ep); closeSheet(); render(false);
  const { error } = await sb.from('vt_episodes').delete().eq('id', ep.id);
  if (error) { D.episodes.push(ep); render(false); return toast('Couldn’t delete: ' + error.message); }
  vtLog({ type: 'deleted', episode_id: ep.id, portal_id: ep.portal_id, text: `Ep ${ep.number}` });
  toast(`${vtName(ep)} deleted`, async () => { const { created_at, updated_at, ...row } = ep; const r = await sb.from('vt_episodes').insert({ ...row, created_at, updated_at }); if (!r.error && !vtEp(ep.id)) { D.episodes.push(ep); render(false); } });
}

/* ---------- chaining: a move here creates / clears the matching Needed from me item ---------- */
function vtFind(ep, re) { return vtItemsFor(ep).find(x => re.test(x.title)); }
function vtEnsureInbox(ep, def) {
  const p = portal(ep.portal_id); if (!p || !def) return;
  const title = def.title(p.name, ep.number);
  const key = title.toLowerCase().replace(/\s+/g, ' ');
  const dupe = D.inbox.find(x => x.status === 'pending' && x.title.toLowerCase().replace(/\s+/g, ' ').startsWith(key.split(' ').slice(0, 2).join(' ')) && vtInboxEpisode(x)?.id === ep.id);
  if (dupe) return;
  addInbox({ title, kind: def.kind, portal_id: ep.portal_id, due: ep.due || null, link: ep.links?.video || ep.links?.notion || '', notes: '', source: 'videos' });
}
function vtResolve(ep, re, status) { const x = vtFind(ep, re); if (x) setInbox(x, { status }); }
function vtChain(ep, from, to) {
  const s = VT_STAGES[VT_IDX[to]];
  if (from === 'scripted' && VT_IDX[to] > VT_IDX.scripted) vtResolve(ep, /approve .*script/i, 'done');
  if (['footage_uploaded', 'editing'].includes(from) && VT_IDX[to] > VT_IDX.editing) vtResolve(ep, /^edit /i, 'done');
  if (from === 'waiting_approval' && VT_IDX[to] > VT_IDX.waiting_approval) vtResolve(ep, /^review /i, 'approved');
  if (from === 'approved' && to === VT_FINAL) vtResolve(ep, /^record feedback video/i, 'done');
  if (s.inbox) vtEnsureInbox(ep, s.inbox);
  if (to === 'client_approval') vtEnsureApprovalTask(ep);
  if (to === 'approved' || to === VT_FINAL) { const t = ep.task_id && task(ep.task_id); if (t && !t.done) setTaskDone(t, true); }
}
/* the client signs off in their portal through a normal deliverable with "Ask them to approve it" on */
async function vtEnsureApprovalTask(ep) {
  const p = portal(ep.portal_id); if (!p) return;
  let t = ep.task_id && task(ep.task_id);
  if (!t && vtEnsureApprovalTask.busy?.[ep.id]) return;
  if (!t) {
    (vtEnsureApprovalTask.busy ||= {})[ep.id] = true;
    t = await createTask({ portal_id: ep.portal_id, title: `Episode ${ep.number} video${ep.title ? ` · ${ep.title}` : ''}`, notes: ep.links?.video ? `Watch it here: ${ep.links.video}\n\nApprove it, or tell us what to change.` : 'Approve it, or tell us what to change.',
      due: ep.due || null, priority: 'high', deliverable: true, approval: true, review_by: ep.due || addDays(todayKey(), 3) });
    delete vtEnsureApprovalTask.busy[ep.id];
    if (!t) return;
    vtUpdate(ep, { task_id: t.id });
  } else if (aprState(ep.portal_id, t.id) !== 'pending') setMark(ep.portal_id, t.id, null);   // sent back for another look
  toast(`${p.name} can now approve episode ${ep.number} in their portal`);
}
/* an item ticked off in Needed from me moves the episode on */
function vtOnInbox(x, status) {
  const ep = vtInboxEpisode(x); if (!ep || status === 'pending') return;
  const t = x.title.toLowerCase();
  if (/approve .*script/.test(t) && ep.stage === 'scripted') return vtSetStage(ep, 'script_approved', 'hub-inbox');
  if (/^edit /.test(t) && ['footage_uploaded', 'editing'].includes(ep.stage)) return vtSetStage(ep, 'waiting_approval', 'hub-inbox');
  if (/^review /.test(t) && ep.stage === 'waiting_approval') {
    if (status === 'approved') vtSetStage(ep, 'client_approval', 'hub-inbox');
    else if (status === 'changes') vtUpdate(ep, { blocked: { reason: 'Changes needed on the video' + (x.response ? ': ' + x.response : ''), at: new Date().toISOString() } }, { type: 'blocked', text: 'changes requested' });
    return;
  }
  if (/^record feedback video/.test(t) && ep.stage === 'approved') return vtSetStage(ep, VT_FINAL, 'hub-inbox');
}
/* the client approved (or asked for changes on) the linked deliverable */
function vtOnMark(pid, itemId, value) {
  const ep = D.episodes.find(e => e.portal_id === pid && e.task_id === itemId); if (!ep) return;
  if (value === 'approved' && ep.stage === 'client_approval') { vtSetStage(ep, 'approved', 'client').then(() => { if (ep.blocked) vtUpdate(ep, { blocked: null }, { type: 'unblocked', via: 'client' }); }); }
  else if (value === 'changes' && !ep.blocked) vtUpdate(ep, { blocked: { reason: `${portal(pid)?.name || 'Client'} asked for changes`, at: new Date().toISOString() } }, { type: 'blocked', via: 'client', text: 'client asked for changes' });
}
/* a derived "Needed from me" row ticked: take the obvious next step */
function vtAdvance(ep) {
  const nxt = { scripted: 'script_approved', footage_uploaded: 'editing', waiting_approval: 'client_approval', approved: VT_FINAL }[ep.stage];
  if (nxt) vtSetStage(ep, nxt, 'hub');
}

/* ---------- page ---------- */
const vtMatch = ep => (S.vtClient === 'all' || ep.portal_id === S.vtClient) && (!S.vtQ || `${portal(ep.portal_id)?.name || ''} ep ${ep.number} ${ep.title || ''} ${ep.notes || ''} ${vtStage(ep).label}`.toLowerCase().includes(S.vtQ));
function pageVideos() {
  const all = D.episodes.filter(vtMatch), open = all.filter(e => e.stage !== VT_FINAL);
  const onClients = open.filter(e => vtStage(e).who === 'client' && !vtBlocked(e)).length;
  const onMe = open.filter(e => vtStage(e).who === 'me' || vtBlocked(e)).length;
  const wk = addDays(todayKey(), -7);
  const delivered = all.filter(e => VT_IDX[e.stage] >= VT_IDX.approved && (e.history || []).some(h => h.stage === 'approved' && !h.back && ymd(new Date(h.at)) >= wk)).length;
  const ps = sortedPortals();
  return `${managerNav('videos')}
  <div class="page-head"><div><div class="eyebrow">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>Videos</h1>
    <div class="sub">Every episode and the stage it’s at. Moves here update Needed from me; the skill updates this.</div></div>
    <div class="acts"><button class="btn primary" data-act="vtNew">${I.plus}Episode</button></div></div>
  <div class="stats">
    <div class="card stat"><div class="k">${I.play}In progress</div><div class="v">${open.length}</div><div class="s">${all.length} episodes in total</div></div>
    <div class="card stat"><div class="k">${I.users}Waiting on clients</div><div class="v">${onClients}</div><div class="s">Footage or sign-off</div></div>
    <div class="card stat ${onMe ? 'alert' : ''}"><div class="k">${I.flag}Waiting on me</div><div class="v">${onMe}</div><div class="s">${open.filter(vtBlocked).length ? `${open.filter(vtBlocked).length} blocked` : 'Nothing blocked'}</div></div>
    <div class="card stat"><div class="k">${I.check}Delivered this week</div><div class="v">${delivered}</div><div class="s">Approved in the last 7 days</div></div>
  </div>
  <div class="toolbar vt-toolbar">${seg('vtview', [['board', 'Board'], ['clients', 'By client']], S.vtView, 'vtView')}
    <div class="chips grow"><button class="fchip ${S.vtClient === 'all' ? 'on' : ''}" data-act="vtClient" data-v="all">All clients</button>${ps.map(p => `<button class="fchip ${S.vtClient === p.id ? 'on' : ''}" data-act="vtClient" data-v="${p.id}">${av(p, 'sm')}${esc(p.name)}</button>`).join('')}</div>
    <label class="search">${I.search}<input type="search" placeholder="Search episodes" value="${esc(S.vtQ)}" data-in="vtq" aria-label="Search episodes"></label></div>
  <div id="vtbody">${vtBody()}</div>
  <div class="pgrid" style="margin-top:16px">${vtNeedsCard()}${vtActivityCard()}</div>`;
}
function vtBody() {
  if (!D.portals.length) return `<div class="card">${empty('No clients yet', 'Add a client first, then their episodes.')}</div>`;
  const items = D.episodes.filter(vtMatch);
  if (S.vtView === 'clients') return `<div class="cgrid">${sortedPortals().filter(p => S.vtClient === 'all' || p.id === S.vtClient).map(p => vtClientCard(p, items.filter(e => e.portal_id === p.id))).join('')}</div>`;
  return `<div class="vt-board">${VT_STAGES.map(s => {
    const eps = items.filter(e => e.stage === s.id).sort((a, b) => (vtEnteredAt(a) || '').localeCompare(vtEnteredAt(b) || ''));
    return `<section class="vt-col ${eps.length ? '' : 'empty'}" data-stage="${s.id}" aria-label="${esc(s.label)}">
      <h4><span class="dot" style="--c:${vtColor(s.id)}"></span>${esc(s.label)}<span class="n">${eps.length}</span></h4>
      ${eps.map(vtCard).join('')}<div class="hint">Drop here</div></section>`; }).join('')}</div>`;
}
function vtCard(ep) {
  const p = portal(ep.portal_id), d = vtDaysSince(vtEnteredAt(ep)), b = vtBlocked(ep), pct = Math.round(VT_IDX[ep.stage] / (VT_STAGES.length - 1) * 100);
  return `<article class="vt-card ${b ? 'blocked' : ''}" draggable="true" data-id="${ep.id}" style="--c:${vtColor(ep.stage)}">
    <div class="cl">${esc(p?.name || 'Client')}</div>
    <button class="ep" data-act="vtOpen" data-id="${ep.id}">Ep ${ep.number}${ep.title ? `<small>${esc(ep.title)}</small>` : ''}</button>
    <div class="meta"><span>${d === 0 ? 'Moved today' : `${d}d in stage`}</span>${vtDue(ep)}${b ? `<span class="chip orange" title="${esc(b.reason)}">${I.flag}Blocked</span>` : ''}</div>
    <button class="ib sm" data-act="vtMenu" data-id="${ep.id}" title="Move to…" aria-label="Move ${esc(vtName(ep))}">${I.more}</button>
    <div class="bar"><b style="width:${pct}%"></b></div></article>`;
}
function vtClientCard(p, eps) {
  const c = pColor(p), counts = VT_STAGES.map(s => eps.filter(e => e.stage === s.id).length), open = eps.filter(e => e.stage !== VT_FINAL).length;
  const wk = addDays(todayKey(), -30), delivered = eps.filter(e => (e.history || []).some(h => h.stage === 'approved' && !h.back && ymd(new Date(h.at)) >= wk)).length;
  const blocked = eps.filter(vtBlocked).length, late = eps.filter(e => e.due && e.due < todayKey() && e.stage !== VT_FINAL).length;
  return `<section class="card ccard lift" style="--c:${c}">
    <header>${av(p)}<div class="nm"><b>${esc(p.name)}</b><small>${open} in flight · ${delivered} delivered in 30 days${blocked ? ` · <span style="color:var(--warn)">${blocked} blocked</span>` : ''}${late ? ` · <span style="color:var(--bad)">${late} overdue</span>` : ''}</small></div>
      <button class="ib sm" data-act="go" data-v="#/portal/${p.id}" title="Open their portal" aria-label="Open portal">${I.grid}</button></header>
    <div class="vt-pipe" title="${VT_STAGES.map((s, k) => `${s.label}: ${counts[k]}`).join('\n')}">${VT_STAGES.map((s, k) => `<span class="${counts[k] ? 'has' : ''}" style="--c:${vtColor(s.id)}">${counts[k] ? `<b>${counts[k]}</b>` : ''}</span>`).join('')}</div>
    <div>${vtSorted(eps).map(ep => `<div class="trow"><span class="dot" style="--c:${vtBlocked(ep) ? 'var(--vtblk)' : vtColor(ep.stage)};margin-top:8px"></span>
      <div class="tmain" data-act="vtOpen" data-id="${ep.id}"><div class="ttl">Ep ${ep.number}${ep.title ? ` · ${esc(ep.title)}` : ''}</div><div class="tmeta">${vtStageChip(ep)}${vtDue(ep)}${vtBlocked(ep) ? '<span class="chip orange">Blocked</span>' : ''}</div></div>
      <span class="muted" style="font-size:12.5px;white-space:nowrap;margin-top:8px">${vtDaysSince(vtEnteredAt(ep))}d</span></div>`).join('') || `<div class="empty">No episodes yet</div>`}</div>
    <form class="qadd" data-form="vtQuick" data-pid="${p.id}"><input name="t" placeholder="New episode… (number, then title)" autocomplete="off" enterkeyhint="done" aria-label="New episode for ${esc(p.name)}"><button class="ib sm" aria-label="Add">${I.plus}</button></form>
  </section>`;
}
function vtNeedRow({ ep, action, since }) {
  const p = portal(ep.portal_id), d = vtDaysSince(since);
  return `<div class="need vt-need"><button class="chk go" data-act="vtAdvance" data-id="${ep.id}" title="${esc(action)}" aria-label="${esc(action)}">${I.right}</button>
    <div class="t" data-act="vtOpen" data-id="${ep.id}"><div class="ttl">${esc(action)}</div><div class="tmeta">${p ? `<span class="chip"><span class="dot" style="--c:${pColor(p)}"></span>${esc(p.name)}</span>` : ''}<span class="chip">${I.play}Ep ${ep.number}</span>${vtStageChip(ep)}${vtDue(ep)}<span class="chip">${d === 0 ? 'today' : `${d}d`}</span></div></div></div>`;
}
function vtNeedsCard() {
  const linked = D.inbox.filter(x => x.status === 'pending' && vtInboxEpisode(x)).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.created_at.localeCompare(b.created_at));
  const derived = vtNeeds();
  return `<section class="card s7"><div class="card-head"><div><h3>${I.inbox}Needs my attention${linked.length + derived.length ? `<span class="badge">${linked.length + derived.length}</span>` : ''}</h3><div class="sub">The same items as Needed from me, filtered to videos</div></div><button class="btn sm ghost" data-act="go" data-v="#/needed">All</button></div>
    ${linked.map(inboxRow).join('')}${derived.map(vtNeedRow).join('')}${linked.length + derived.length ? '' : empty('Nothing waiting on you', 'Episodes with clients or in the edit don’t count.')}</section>`;
}
function vtActLine(a) {
  const ep = a.episode_id && vtEp(a.episode_id), p = a.portal_id && portal(a.portal_id);
  const who = ep && p ? `<b>${esc(p.name)} · Ep ${ep.number}</b>` : p ? `<b>${esc(p.name)}</b>` : '<b>An episode</b>';
  const st = id => vtIsStage(id) ? VT_STAGES[VT_IDX[id]].label : '';
  const text = { stage: `${who} moved to ${esc(st(a.to_stage))}`, added: `${who} added${a.to_stage && a.to_stage !== 'scripted' ? ` at ${esc(st(a.to_stage))}` : ''}`, blocked: `${who} blocked: ${esc(a.text)}`, unblocked: `${who} flag cleared`, due: `${who} ${esc(a.text)}`, deleted: `${p ? `<b>${esc(p.name)} · ${esc(a.text)}</b>` : who} deleted` }[a.type] || `${who} ${esc(a.text || a.type)}`;
  const via = a.via && !/^hub/.test(a.via) ? `<span class="chip violet">${I.bolt}${esc(a.via === 'client' ? 'client' : a.via)}</span>` : '';
  const d = new Date(a.at), mins = Math.round((Date.now() - d) / 60000);
  const when = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : relLabel(ymd(d));
  return `<div class="vt-act"><span class="dot" style="--c:${a.to_stage ? vtColor(a.to_stage) : a.type === 'blocked' ? 'var(--vtblk)' : 'var(--muted)'}"></span><span>${text} ${via}</span><time title="${esc(vtFmt(a.at))}">${when}</time></div>`;
}
function vtActivityCard() {
  const list = [...D.vact].sort((a, b) => b.at.localeCompare(a.at)), shown = S.vtActAll ? list.slice(0, 80) : list.slice(0, 10);
  return `<section class="card s5"><div class="card-head"><div><h3>${I.clock}Activity</h3><div class="sub">Moves, flags and what the skill did</div></div></div>
    ${shown.map(vtActLine).join('') || '<div class="empty">Nothing yet.</div>'}
    ${list.length > 10 ? `<button class="more ${S.vtActAll ? 'open' : ''}" data-act="vtActAll">${I.right}${S.vtActAll ? 'Show less' : `All ${Math.min(list.length, 80)}`}</button>` : ''}</section>`;
}
/* admin-only card on a client's portal page: their pipeline at a glance (clients never see this) */
function vtPortalCard(p) {
  const eps = vtSorted(D.episodes.filter(e => e.portal_id === p.id));
  return `<section class="card s12"><div class="card-head"><div><h3>${I.play}Videos</h3><div class="sub">Only you see this. The client sees finished videos as deliverables.</div></div>
      <div style="display:flex;gap:6px"><button class="btn sm" data-act="go" data-v="#/videos">Board</button><button class="ib sm" data-act="vtNew" data-pid="${p.id}" title="New episode" aria-label="New episode">${I.plus}</button></div></div>
    ${eps.length ? `<div class="vt-pipe" style="margin-top:4px">${VT_STAGES.map(s => { const n = eps.filter(e => e.stage === s.id).length; return `<span class="${n ? 'has' : ''}" style="--c:${vtColor(s.id)}">${n ? `<b>${n}</b>` : ''}</span>`; }).join('')}</div>
    ${eps.slice(0, 6).map(ep => `<div class="trow"><span class="dot" style="--c:${vtColor(ep.stage)};margin-top:8px"></span><div class="tmain" data-act="vtOpen" data-id="${ep.id}"><div class="ttl">Ep ${ep.number}${ep.title ? ` · ${esc(ep.title)}` : ''}</div><div class="tmeta">${vtStageChip(ep)}${vtDue(ep)}${vtBlocked(ep) ? '<span class="chip orange">Blocked</span>' : ''}</div></div>
      <span class="muted" style="font-size:12.5px;margin-top:8px">${esc(vtStage(ep).next)}</span></div>`).join('')}${eps.length > 6 ? `<button class="more" data-act="go" data-v="#/videos">${I.right}All ${eps.length} on the board</button>` : ''}`
    : `<div class="empty">No episodes yet. Add one, or run <b>/super-client-video ${esc(p.name)}</b>.</div>`}</section>`;
}

/* ---------- episode sheet ---------- */
function openEpisode(id) {
  const ep = vtEp(id); if (!ep) return;
  openSheet('vtep', { id }, () => vtSheetHTML(id), { onClose: () => { const e = vtEp(id); if (e) flushEpForm(e); } });
}
function vtSheetHTML(id) {
  const ep = vtEp(id); if (!ep) return '';
  const p = portal(ep.portal_id), s = vtStage(ep), i = VT_IDX[ep.stage], nxt = vtNextOf(ep), prv = VT_STAGES[i - 1], b = vtBlocked(ep), items = vtItemsFor(ep), t = ep.task_id && task(ep.task_id);
  const last = sid => { const h = ep.history || []; let any = null; for (let k = h.length - 1; k >= 0; k--) { if (h[k].stage !== sid) continue; if (!h[k].back) return h[k]; any ||= h[k]; } return any; };
  return `<div class="sh-head"><h2><span class="k">${esc(p?.name || 'Client')} · Episode ${ep.number}</span>${esc(ep.title || `Episode ${ep.number}`)}</h2>
      ${p ? `<button class="ib" data-act="goPortal" data-id="${p.id}" title="Open their portal">${I.grid}</button>` : ''}<button class="ib" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="sh-body">
      <div class="vt-stagebox" style="--c:${vtColor(ep.stage)}"><span class="dot" style="--c:${vtColor(ep.stage)};width:10px;height:10px;box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 25%,transparent)"></span>
        <select data-chg="vtStage" data-id="${ep.id}" aria-label="Stage">${VT_STAGES.map(x => `<option value="${x.id}" ${x.id === ep.stage ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>
        <span class="nx">${vtDaysSince(vtEnteredAt(ep)) === 0 ? 'Moved today' : `${vtDaysSince(vtEnteredAt(ep))} days in stage`} · ${esc(s.next)}</span></div>
      <div style="display:flex;gap:8px;margin-bottom:14px"><button class="btn" style="flex:1" data-act="vtStep" data-id="${ep.id}" data-v="-1" ${prv ? '' : 'disabled'}>${I.left}${prv ? esc(prv.short) : 'Back'}</button><button class="btn primary" style="flex:1.4" data-act="vtStep" data-id="${ep.id}" data-v="1" ${nxt ? '' : 'disabled'}>${nxt ? 'Next: ' + esc(nxt.short) : 'Done'}${I.right}</button></div>
      ${b ? `<div class="vt-blk"><b>${I.flag} Blocked</b>${esc(b.reason)}<small>${b.src === 'inbox' ? 'From Needed from me. Clears when that item is handled.' : 'Flagged by you · ' + esc(vtFmt(b.at))}</small>${b.src === 'flag' ? `<button class="btn sm ghost" style="margin-top:8px" data-act="vtUnblock" data-id="${ep.id}">Clear flag</button>` : ''}</div>`
        : `<form class="qadd" data-form="vtBlock" data-id="${ep.id}" style="margin:0 0 14px"><input name="r" placeholder="Stuck on something? Flag it with a short reason" autocomplete="off" maxlength="140" aria-label="Reason for blocking"><button class="btn sm" aria-label="Flag">${I.flag}Flag</button></form>`}
      <form id="vtForm" data-form="vtep" data-chg="vtForm" data-id="${ep.id}" autocomplete="off">
        <div class="two">${fIn('title', 'Title', ep.title, 'maxlength="80" placeholder="What it is about"')}<div class="fld"><label class="l">Due</label><input type="date" name="due" value="${esc(ep.due || '')}"></div></div>
        <label class="l">Timeline</label>
        <div class="vt-tl">${VT_STAGES.map((x, k) => { const h = last(x.id), cls = k < i ? 'done' : k === i ? 'now' : 'up'; return `<div class="r ${cls}" style="--c:${vtColor(x.id)}"><span class="d"></span><div class="m"><span>${esc(x.label)}</span><small>${k <= i && h ? esc(vtFmt(h.at)) + (h.via && !/^hub/.test(h.via) ? ' · ' + esc(h.via) : '') : h ? 'earlier · ' + esc(fmtD(ymd(new Date(h.at)))) : '—'}</small></div></div>`; }).join('')}</div>
        ${fTa('notes', 'Notes', ep.notes, 'Anything worth remembering')}
        <div class="vt-links"><label class="l">Links</label>
          ${[['notion', 'Notion page'], ['drive', 'Drive folder'], ['video', 'Finished video']].map(([k, l]) => `<div class="fld"><label class="l">${l}${ep.links?.[k] ? `<a href="${esc(safeUrl(ep.links[k]))}" target="_blank" rel="noopener" style="color:var(--accent);text-transform:none;letter-spacing:0">Open ${I.ext}</a>` : ''}</label><input name="link_${k}" value="${esc(ep.links?.[k] || '')}" placeholder="https://…" inputmode="url"></div>`).join('')}</div>
      </form>
      ${items.length || t ? `<label class="l" style="margin-top:4px">Linked</label>${items.map(x => `<div class="mrow click" data-act="inbox" data-id="${x.id}"><span class="cat">${I.inbox}</span><div class="t"><div>${esc(x.title)}</div><small>${x.kind === 'approval' ? 'Needs your approval' : 'Needs doing'}${x.source && x.source !== 'manual' ? ' · ' + esc(x.source) : ''}</small></div></div>`).join('')}
        ${t ? `<div class="mrow click" data-act="task" data-id="${t.id}"><span class="cat">${I.eye}</span><div class="t"><div>${esc(t.title)}</div><small>In their portal · ${t.approval ? { pending: 'awaiting their approval', approved: 'approved by the client', changes: 'they asked for changes' }[aprState(ep.portal_id, t.id)] : t.done ? 'delivered' : 'not delivered yet'}</small></div></div>` : ''}` : ''}
    </div>
    <div class="sh-foot"><button class="btn danger ghost" data-act="vtDel" data-id="${ep.id}">${I.trash}Delete</button><div class="r"><button class="btn primary" data-act="close">Done</button></div></div>`;
}
function flushEpForm(ep) {
  const f = $('#vtForm'); if (!f || f.dataset.id !== ep.id) return;
  const e = f.elements, links = { notion: e.link_notion.value.trim(), drive: e.link_drive.value.trim(), video: e.link_video.value.trim() };
  const patch = {};
  if (e.title.value.trim() !== (ep.title || '')) patch.title = e.title.value.trim();
  if ((e.due.value || null) !== (ep.due || null)) patch.due = e.due.value || null;
  if (e.notes.value !== (ep.notes || '')) patch.notes = e.notes.value;
  if (JSON.stringify(links) !== JSON.stringify({ notion: ep.links?.notion || '', drive: ep.links?.drive || '', video: ep.links?.video || '' })) patch.links = links;
  if (Object.keys(patch).length) vtUpdate(ep, patch, 'due' in patch ? { type: 'due', text: patch.due ? `due ${fmtD(patch.due)}` : 'due date cleared' } : null).then(() => renderLater(50));
}
function vtNewEpisode(pid) {
  if (!D.portals.length) return toast('Add a client first');
  const p0 = portal(pid) || portal(S.vtClient) || portal(S.r?.pid) || sortedPortals()[0];
  const nextN = id => Math.max(0, ...D.episodes.filter(e => e.portal_id === id).map(e => e.number)) + 1;
  formSheet({ kicker: 'Videos', title: 'New episode', submit: 'Add episode',
    body: `<div class="two">${fSel('pid', 'Client', portalOpts(), p0?.id)}${fIn('number', 'Episode number', nextN(p0?.id), 'type="number" min="0" step="1" required inputmode="numeric"')}</div>
      <div class="two">${fIn('title', 'Title', '', 'placeholder="What it is about" maxlength="80"')}<div class="fld"><label class="l">Due</label><input type="date" name="due"></div></div>
      ${fSel('stage', 'Starting stage', VT_STAGES.map(s => [s.id, s.label]), 'scripted')}${fTa('notes', 'Notes', '', 'Topic, angle, anything useful')}
      <p class="muted" style="font-size:13px">Adding at Scripted puts “Approve the script” in Needed from me. Prefer Claude to do the lot? Run <b>/super-client-video</b>; it will show up here on its own.</p>`,
    onSubmit: async f => {
      const pid2 = f.get('pid'), n = parseInt(f.get('number'), 10);
      if (!Number.isInteger(n) || n < 0) { toast('Enter a whole episode number'); return false; }
      if (D.episodes.some(e => e.portal_id === pid2 && e.number === n)) { toast(`${portal(pid2)?.name} already has episode ${n}`); return false; }
      const ep = await vtCreate({ portal_id: pid2, number: n, title: f.get('title').trim(), stage: f.get('stage'), due: f.get('due') || null, notes: f.get('notes') });
      if (ep) toast(`Added ${vtName(ep)}`);
      return !!ep;
    } });
}
/* ⋯ on a card: jump to any stage */
function vtMenu(anchor, id) {
  closeMenu();
  const ep = vtEp(id); if (!ep) return;
  const r = anchor.getBoundingClientRect(), m = document.createElement('div'); m.className = 'menu';
  m.innerHTML = `<div class="mh">${esc(vtName(ep))}<br><b style="color:var(--ink)">Move to</b></div><hr>` + VT_STAGES.map(s => `<button class="mi" data-act="vtMove" data-id="${ep.id}" data-v="${s.id}" ${s.id === ep.stage ? 'style="font-weight:700"' : ''}><span class="dot" style="--c:${vtColor(s.id)}"></span>${esc(s.label)}${s.id === ep.stage ? I.check : ''}</button>`).join('');
  document.body.appendChild(m);
  const top = r.bottom + 8, h = m.offsetHeight;
  m.style.top = (top + h > innerHeight - 10 ? Math.max(10, r.top - h - 8) : top) + 'px'; m.style.right = Math.max(10, innerWidth - r.right) + 'px';
  setTimeout(() => addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { closeMenu(); removeEventListener('pointerdown', off, true); } }, true));
}
/* drag and drop between columns (the ⋯ menu covers keyboard and touch) */
let vtDrag = null;
document.addEventListener('dragstart', e => { const c = e.target.closest?.('.vt-card[draggable]'); if (!c) return; vtDrag = c.dataset.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', vtDrag); } catch {} requestAnimationFrame(() => c.classList.add('drag')); });
document.addEventListener('dragend', () => { vtDrag = null; $$('.vt-card.drag').forEach(c => c.classList.remove('drag')); $$('.vt-col.over').forEach(c => c.classList.remove('over')); });
document.addEventListener('dragover', e => { const col = e.target.closest?.('.vt-col'); if (!col || !vtDrag) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; $$('.vt-col.over').forEach(c => c !== col && c.classList.remove('over')); col.classList.add('over'); });
document.addEventListener('dragleave', e => { const col = e.target.closest?.('.vt-col'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('over'); });
document.addEventListener('drop', e => {
  const col = e.target.closest?.('.vt-col'); if (!col) return; e.preventDefault();
  const id = vtDrag || e.dataTransfer.getData('text/plain'), ep = vtEp(id); vtDrag = null; col.classList.remove('over');
  if (!ep || ep.stage === col.dataset.stage) return;
  const from = ep.stage;
  vtSetStage(ep, col.dataset.stage).then(ok => { if (!ok) return; render(false); $(`.vt-card[data-id="${ep.id}"]`)?.classList.add('land'); toast(`${vtName(ep)} → ${VT_STAGES[VT_IDX[ep.stage]].label}`, () => vtSetStage(ep, from)); });
});

/* ---------- actions (one delegated listener for the whole app) ---------- */
const A = {
  go: el => { closeMenu(); go(el.dataset.v); },
  'go-page': el => go('#/' + el.dataset.v),
  goPortal: el => { closeSheet(true); go('#/portal/' + el.dataset.id); },
  authRole: el => { S.authRole = el.dataset.v; lsSet('hub.authRole', S.authRole); const em = $('#aEm')?.value; if (em) S.authEmail = em; renderAuth(); },
  authMode: el => { const em = $('#aEm')?.value; if (em) S.authEmail = em; S.authMode = el.dataset.v; renderAuth(); },
  theme: el => { closeMenu(); toggleTheme(el); },
  menu: el => openMenu(el),
  signout: () => { closeMenu(); sb.auth.signOut(); },
  refresh: async () => { closeMenu(); await loadAll(); render(false); toast('Up to date'); },
  close: () => closeSheet(),
  tview: el => { S.view = el.dataset.v; lsSet('hub.taskView', S.view); $('#tbody').innerHTML = tasksBody(); $$('[data-seg="tview"] button').forEach(b => b.classList.toggle('on', b === el)); syncSegs(); },
  tclient: el => { S.taskClient = el.dataset.v; $$('[data-act="tclient"]').forEach(b => b.classList.toggle('on', b === el)); $('#tbody').innerHTML = tasksBody(); },
  showDone: el => { S.showDone[el.dataset.id] = !S.showDone[el.dataset.id]; render(false); },
  qaVis: () => { S.qaVis = !S.qaVis; lsSet('hub.qaVis', S.qaVis ? '1' : '0'); toast(S.qaVis ? 'New tasks will show in the client portal' : 'New tasks will be internal only'); render(false); },
  tick: el => { const t = task(el.dataset.id); if (t) setTaskDone(t, !t.done, el); },
  vis: el => {
    const t = task(el.dataset.id); if (!t) return;
    const on = !t.deliverable; updateTask(t, { deliverable: on });
    el.classList.toggle('on', on); el.innerHTML = on ? I.eye : I.eyeOff;
    toast(on ? `Now in ${portal(t.portal_id)?.name}’s portal` : 'Hidden from the client'); renderLater(900);
  },
  task: el => { if (el.dataset.id && !task(el.dataset.id)) return; openTask(el.dataset.id || null, S.r?.mode === 'portal' ? { pid: S.r.pid, deliverable: true } : {}); },
  prio: el => { const f = el.closest('form'); f.elements.priority.value = el.dataset.v; $$('button', el.parentElement).forEach(b => b.classList.toggle('on', b === el)); syncSegs(f); f.dispatchEvent(new Event('change', { bubbles: true })); },
  delTask: el => { const t = task(el.dataset.id); if (t) deleteTask(t); },
  client: el => openClient(el.dataset.id),
  newClient: () => newClient(),
  // finance
  paid: el => {
    const p = portal(el.dataset.pid), pm = p?.content?.billing?.payments?.find(x => x.id === el.dataset.id); if (!pm) return;
    pm.paid = !pm.paid; if (pm.paid) pm.paidAt = todayKey(); else delete pm.paidAt;
    el.classList.toggle('on', pm.paid); el.classList.toggle('pop', pm.paid); el.closest('.mrow')?.classList.toggle('paid', pm.paid);
    savePortal(p, true); renderLater(700);
    toast(pm.paid ? `Paid · ${p.name}’s portal updated` : 'Marked unpaid');
  },
  payment: el => openPayment(el.dataset.pid, el.dataset.id),
  payAll: () => { S.payAll = !S.payAll; render(false); },
  expense: el => openExpense(el.dataset.id),
  // onboarding
  obSel: el => { S.obSel = el.dataset.id; lsSet('hub.obSel', S.obSel); render(false); },
  stage: el => {
    const box = el.closest('.stage'), open = !box.classList.contains('open');
    box.classList.toggle('open', open); el.setAttribute('aria-expanded', open); S.obOpen[el.dataset.id] = open;
  },
  obTick: el => {
    const p = portal(el.dataset.pid), k = el.dataset.k, s = obStep(p, k);
    if (s.task) return setTaskDone(s.task, !s.task.done, el);
    if (s.via === 'auto') return toast('Ticked automatically: ' + s.det);
    const done = { ...(hc(p.id).ob_done || {}) };
    if (done[k]) delete done[k]; else done[k] = Date.now();
    el.classList.toggle('on', !!done[k]); el.classList.toggle('pop', !!done[k]); el.closest('.step')?.classList.toggle('done', !!done[k]);
    saveClient(p.id, { ob_done: done }); renderLater(700);
  },
  obTask: async el => {
    const p = portal(el.dataset.pid), k = el.dataset.k, x = OB_STEPS.find(s => s.k === k), s = obStep(p, k);
    if (s.task) return openTask(s.task.id);
    const t = await createTask({ portal_id: p.id, title: x.l, due: obStageDate(p.id, x.stage), priority: x.p, deliverable: false, ob_key: k, done: s.done, done_at: s.done ? new Date().toISOString() : null });
    if (t) { toast(`Added to ${p.name}’s tasks · due ${fmtD(t.due, { weekday: 'short', day: 'numeric', month: 'short' })}`); render(false); }
  },
  obStart: el => { saveClient(el.dataset.id, { ob_start: todayKey() }); S.obSel = el.dataset.id; render(false); },
  obStop: el => { const p = portal(el.dataset.id); if (!confirm(`Stop tracking onboarding for ${p.name}? Ticks are kept.`)) return; saveClient(p.id, { ob_start: null }); render(false); },
  copy: el => { navigator.clipboard?.writeText(el.dataset.v).then(() => toast(`Copied ${el.dataset.v}. Paste it into Claude.`), () => toast(el.dataset.v)); },
  // videos
  vtView: el => { S.vtView = el.dataset.v; lsSet('hub.vtView', S.vtView); $('#vtbody').innerHTML = vtBody(); $$('[data-seg="vtview"] button').forEach(b => b.classList.toggle('on', b === el)); syncSegs(); },
  vtClient: el => { S.vtClient = el.dataset.v; $$('[data-act="vtClient"]').forEach(b => b.classList.toggle('on', b === el)); $('#vtbody').innerHTML = vtBody(); },
  vtOpen: el => { closeMenu(); openEpisode(el.dataset.id); },
  vtNew: el => vtNewEpisode(el.dataset.pid),
  vtMenu: el => vtMenu(el, el.dataset.id),
  vtMove: el => { closeMenu(); const ep = vtEp(el.dataset.id); if (!ep || ep.stage === el.dataset.v) return; const from = ep.stage; vtSetStage(ep, el.dataset.v).then(ok => { if (!ok) return; render(false); if (SH?.kind === 'vtep') redrawSheet(); toast(`${vtName(ep)} → ${VT_STAGES[VT_IDX[ep.stage]].label}`, () => vtSetStage(ep, from)); }); },
  vtStep: el => { const ep = vtEp(el.dataset.id); if (!ep) return; const to = VT_STAGES[VT_IDX[ep.stage] + +el.dataset.v]; if (!to) return; flushEpForm(ep); vtSetStage(ep, to.id).then(ok => { if (ok) { redrawSheet(); renderLater(50); } }); },
  vtAdvance: el => { const ep = vtEp(el.dataset.id); if (!ep) return; el.classList.add('on', 'pop'); vtAdvance(ep); setTimeout(() => render(false), 350); },
  vtUnblock: el => { const ep = vtEp(el.dataset.id); if (!ep) return; vtUpdate(ep, { blocked: null }, { type: 'unblocked' }).then(() => { redrawSheet(); renderLater(50); }); },
  vtDel: el => { const ep = vtEp(el.dataset.id); if (ep && confirm(`Delete ${vtName(ep)}? Its history goes too.`)) vtDelete(ep); },
  vtActAll: () => { S.vtActAll = !S.vtActAll; render(false); },
  // needed from me
  inbox: el => openInbox(el.dataset.id, el.dataset.v === 'changes'),
  inboxDo: el => {
    const x = D.inbox.find(i => i.id === el.dataset.id); if (!x) return;
    const v = el.dataset.v; if (el.classList.contains('chk')) { el.classList.toggle('on', v !== 'pending'); el.classList.add('pop'); }
    setInbox(x, { status: v }, { approved: 'Approved', done: 'Done', pending: 'Reopened' }[v]);
  },
  inboxDel: async el => {
    const x = D.inbox.find(i => i.id === el.dataset.id); if (!x) return;
    D.inbox = D.inbox.filter(i => i !== x); closeSheet(); render(false);
    const { error } = await sb.from('hub_inbox').delete().eq('id', x.id);
    if (error) { D.inbox.push(x); render(false); return toast('Couldn’t delete: ' + error.message); }
    toast('Deleted', () => addInbox(x));
  },
  showResolved: () => { S.showResolved = !S.showResolved; render(false); },
  resend: el => { setMark(el.dataset.pid, el.dataset.id, null); toast(`Sent back to ${portal(el.dataset.pid)?.name} for approval`); },
  reply: el => { go('#/portal/' + el.dataset.id); setTimeout(() => dock.toggle(true), 450); },
  // portal
  preview: el => { S.preview = el.dataset.v === '1'; dock.toggle(false); render(false); if (S.preview) toast('Client view. Nothing you click here is saved.'); },
  week: el => { const cur = S.week || mondayOf(); S.week = el.dataset.v === 'now' ? null : addDays(cur, 7 * +el.dataset.v); if (S.week === mondayOf()) S.week = null; render(false); },
  item: el => openItem(el.dataset.pid, el.dataset.id),
  approve: el => { el.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 400 }); setMark(el.dataset.pid, el.dataset.id, 'approved'); toast('Approved. Thank you!'); },
  changes: el => {
    const f = $('.composer', SH?.box), ta = f?.b, txt = ta?.value.trim();
    if (!txt) { ta.placeholder = 'Tell us what you’d like changed, then press Request changes'; ta.focus(); f.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'none' }], { duration: 360 }); return; }
    ta.value = ''; postComment(el.dataset.pid, el.dataset.id, txt).then(() => setMark(el.dataset.pid, el.dataset.id, 'changes'));
  },
  mark: el => setMark(el.dataset.pid, el.dataset.id, el.dataset.v || null),
  needDone: el => {
    const pid = el.dataset.pid, id = el.dataset.id, on = mk(pid, id)?.value !== 'done';
    if (el.classList.contains('chk')) { el.classList.toggle('on', on); el.classList.toggle('pop', on); el.closest('.need')?.classList.toggle('done', on); }
    setMark(pid, id, on ? 'done' : null);
  },
  need: el => editNeed(portal(el.dataset.pid), el.dataset.id),
  event: el => openEvent(portal(el.dataset.pid), el.dataset.id),
  link: el => editLink(portal(el.dataset.pid), el.dataset.id),
  editWelcome: el => editWelcome(portal(el.dataset.pid)),
  editPlan: el => editPlan(portal(el.dataset.pid)),
  past: () => { S.showPast = !S.showPast; render(false); },
  allPosts: () => { S.showAllPosts = !S.showAllPosts; render(false); },
  showDoneNeeds: () => { S.showDoneNeeds = !S.showDoneNeeds; render(false); },
  delPost: el => {
    const p = portal(el.dataset.pid), c = p.content, u = (c.updates || []).find(x => x.id === el.dataset.id); if (!u) return;
    c.updates = c.updates.filter(x => x !== u); savePortal(p, true); render(false);
    toast('Update deleted', () => { c.updates.push(u); savePortal(p, true); render(false); });
  },
  delAccess: async el => {
    const pid = el.dataset.pid, email = el.dataset.v;
    if (!confirm(`Remove ${email}’s access to this portal?`)) return;
    const { error } = await sb.from('portal_access').delete().eq('portal_id', pid).eq('email', email);
    if (error) return toast(error.message);
    D.access[pid] = (D.access[pid] || []).filter(e => e !== email); render(false); toast('Access removed');
  },
  delPortal: async el => {
    const p = portal(el.dataset.id);
    if (prompt(`This deletes ${p.name}’s portal, tasks, chat and finance details for good.\nType the client name to confirm:`)?.trim() !== p.name) return;
    const { error } = await sb.from('portals').delete().eq('id', p.id);
    if (error) return toast(error.message);
    D.portals = D.portals.filter(x => x !== p); D.tasks = D.tasks.filter(t => t.portal_id !== p.id); delete D.clients[p.id];
    toast(`${p.name} deleted`); go('#/tasks');
  },
  dock: el => dock.toggle(el.dataset.v === undefined ? undefined : el.dataset.v === '1'),
  delMsg: el => {
    if (!el.classList.contains('armed')) { el.classList.add('armed'); el.textContent = 'Delete?'; clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove('armed'); el.textContent = 'Delete'; }, 3000); return; }
    deleteComment(el.dataset.id);
  },
  sheetDel: async () => {
    const ctx = SH?.ctx; if (!ctx?.onDelete || !confirm('Delete this? It can’t be undone.')) return;
    await ctx.onDelete(); closeSheet(); render(false);
  },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'BUTTON' && el.closest('a')) e.preventDefault();
  fn(el, e);
});

/* forms */
const F = {
  auth: f => submitAuth(f),
  qadd: async f => {
    const raw = f.t.value.trim(); if (!raw) return;
    const { title, due } = parseQuick(raw), pid = f.dataset.pid;
    f.t.value = '';
    const t = createTask({ portal_id: pid, title, due, deliverable: S.qaVis });
    render(false);
    const again = $(`form[data-form="qadd"][data-pid="${pid}"] input`); again?.focus({ preventScroll: true });
    await t;
  },
  qaddDel: async f => {
    const title = f.t.value.trim(); if (!title) return;
    const wk = S.week || mondayOf(), due = wk === mondayOf() ? todayKey() : addDays(wk, 4);
    f.t.value = ''; createTask({ portal_id: f.dataset.pid, title, due, deliverable: true });
    render(false); $('form[data-form="qaddDel"] input')?.focus({ preventScroll: true });
  },
  task: async f => {
    const v = readTaskForm(f); if (!v.title) { f.elements.title.focus(); return; }
    if (!v.portal_id) return toast('Add a client first');
    const t = await createTask(v);
    if (t) { closeSheet(); render(false); toast(`Added to ${portal(t.portal_id)?.name}${t.deliverable ? ' · visible in their portal' : ''}`); }
  },
  comment: f => { const v = f.b.value.trim(); if (!v) return; f.b.value = ''; f.b.style.height = ''; postComment(f.dataset.pid, f.dataset.item, v); },
  post: f => {
    const v = f.b.value.trim(); if (!v) return;
    const p = portal(f.dataset.pid); (p.content.updates ||= []).unshift({ id: uid(), date: todayKey(), text: v });
    savePortal(p, true); render(false); toast('Update posted');
  },
  access: async f => {
    const pid = f.dataset.pid, email = f.e.value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Enter a valid email');
    if ((D.access[pid] || []).includes(email)) return toast('They already have access');
    const { error } = await sb.from('portal_access').insert({ portal_id: pid, email });
    if (error) return toast(error.message);
    (D.access[pid] ||= []).push(email); render(false); toast('Access given');
  },
  vtQuick: async f => {
    const raw = f.t.value.trim(); if (!raw) return;
    const m = raw.match(/^(?:ep(?:isode)?\.?\s*)?(\d+)\s*[-:·.]?\s*(.*)$/i), pid = f.dataset.pid;
    const number = m ? +m[1] : Math.max(0, ...D.episodes.filter(e => e.portal_id === pid).map(e => e.number)) + 1, title = m ? m[2].trim() : raw;
    if (D.episodes.some(e => e.portal_id === pid && e.number === number)) return toast(`${portal(pid)?.name} already has episode ${number}`);
    f.t.value = '';
    const ep = await vtCreate({ portal_id: pid, number, title });
    if (ep) { render(false); toast(`Added ${vtName(ep)}`); }
  },
  vtBlock: f => { const ep = vtEp(f.dataset.id), r = f.r.value.trim(); if (!ep || !r) return; vtUpdate(ep, { blocked: { reason: r, at: new Date().toISOString() } }, { type: 'blocked', text: r }).then(() => { redrawSheet(); renderLater(50); }); },
  vtep: f => { const ep = vtEp(f.dataset.id); if (ep) flushEpForm(ep); },
  inboxQuick: f => { const t = f.t.value.trim(); if (!t) return; f.t.value = ''; addInbox({ title: t }); setTimeout(() => $('form[data-form="inboxQuick"] input')?.focus({ preventScroll: true }), 50); },
  inbox: (f, sub) => {
    const e = f.elements, id = SH?.ctx?.id, x = id && D.inbox.find(i => i.id === id), decision = sub?.value || 'save';
    const v = { title: e.title.value.trim(), kind: e.kind.value, portal_id: e.portal_id.value || null, due: e.due.value || null, link: e.link.value.trim(), notes: e.notes.value };
    if (!v.title) return e.title.focus();
    if (x) v.response = e.response.value;
    if (decision === 'changes' && x && !v.response.trim()) { e.response.placeholder = 'Write what needs changing, then press Request changes'; return e.response.focus(); }
    closeSheet();
    if (!x) return addInbox(v);
    if (decision !== 'save') v.status = decision;
    setInbox(x, v, { approved: 'Approved', changes: 'Changes noted', done: 'Done', pending: 'Reopened' }[decision] || 'Saved');
  },
  sheet: async f => {
    const ctx = SH?.ctx; if (!ctx?.onSubmit) return;
    const btn = $('.sh-foot .btn.primary', SH.box); if (btn) btn.disabled = true;
    const ok = await ctx.onSubmit(new FormData(f));
    if (btn) btn.disabled = false;
    if (ok === false) return;
    closeSheet(); render(false);
  },
};
document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); F[f.dataset.form]?.(f, e.submitter); });

/* inputs + changes */
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.in === 'q') { S.q = el.value.trim().toLowerCase(); $('#tbody').innerHTML = tasksBody(); }
  if (el.dataset.in === 'vtq') { S.vtQ = el.value.trim().toLowerCase(); $('#vtbody').innerHTML = vtBody(); }
  if (el.matches('.composer textarea, .compose-row textarea')) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-chg]') || e.target.form?.closest('[data-chg]'); if (!el) return;
  if (el.dataset.chg === 'taskForm' && SH?.ctx && !SH.ctx.isNew) {
    const t = task(SH.ctx.id); if (!t) return;
    const before = t.deliverable;
    flushTaskForm(t);
    if (e.target.name === 'deliverable' && before !== t.deliverable) redrawSheet();
  }
  if (el.dataset.chg === 'vtForm') { const ep = vtEp(el.dataset.id); if (ep) flushEpForm(ep); }
  if (e.target.dataset.chg === 'vtStage') { const ep = vtEp(e.target.dataset.id); if (ep) { flushEpForm(ep); vtSetStage(ep, e.target.value).then(ok => { if (ok) { redrawSheet(); renderLater(50); } }); } }
  if (el.dataset.chg === 'obField') {
    const f = el.dataset.f, v = el.value;
    saveClient(el.dataset.pid, { [f]: f === 'ob_call_at' ? (v ? new Date(v).toISOString() : null) : (v || null) });
    renderLater(300);
  }
});

/* specular highlight follows the pointer on glass cards */
if (matchMedia('(hover:hover)').matches) document.addEventListener('pointermove', e => {
  const c = e.target.closest?.('.card.lift'); if (!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });

/* installable + offline shell */
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
