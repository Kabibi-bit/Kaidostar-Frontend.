/* =========================================================================
   MISSION CONTROL - the overview the Kaidostar logo opens.

   One page, many views (Today, Applications, Auto, Jobs, Skills, Plan,
   Interviews, Materials, What works, Habits), each a set of charts that
   answer a plain question from the person's own records. Views switch in
   place (#today, #applications ...) so the data is read once.

   Honest by construction:
     - every number is counted from the account's records (mission-data.js),
     - a rate from too few applications is shown as "early", with its range,
     - an empty chart says exactly what will fill it, and where,
     - the example view is fictional and labelled on every screen.

   Athletes and students get their own views (mission-roles.js); this file
   never changes anyone's role.
   Depends on: api.js, state.js, mission-charts.js, mission-data.js.
   ========================================================================= */
(function(root){
'use strict';
var MD = root.MISSION_DATA, C = root.MCC;
var MISSION = {};
var DAY = 864e5, HOUR = 36e5;

/* ------------------------------------------------------------------ state */
var S = { role: 'candidate', page: null, range: '90d', D: null, real: null, example: false, loading: true, error: null,
  market: null, marketState: 'idle', marketErr: null, interview: null, interviewState: 'idle', resume: null, resumeState: 'idle', names: false, roleData: null, metis: null };
var MARKET_VIEWS = ['today', 'jobs', 'skills'];
var RANGE_KEY = 'kaidostar_mc_range';

/* ------------------------------------------------------------------ helpers */
function esc(s){ return C.esc(s); }
function $(id){ return root.document.getElementById(id); }
function isNum(v){ return typeof v === 'number' && isFinite(v); }
function plural(n, w, p){ return C.fmtN(n) + ' ' + (n === 1 ? w : (p || w + 's')); }
function pw(n, w, p){ return n === 1 ? w : (p || w + 's'); }
function bp(n, w, p){ return '<b>' + C.fmtN(n) + '</b> ' + pw(n, w, p); }
function pct(k, n){ return n ? Math.round(k / n * 100) : 0; }
function fmtPct(v){ return Math.round(v) + '%'; }
function rangeWords(){ var r = MD.RANGES.find(function(x){ return x.key === S.range; }); return S.range === 'all' ? 'all your time here' : 'the last ' + (r ? r.label : '90 days'); }
function rateLine(k, n, noun){
  if(!n) return 'No ' + (noun || 'applications') + ' yet';
  if(n < MD.ENOUGH) return k + ' of ' + n + ' - too few to call a rate yet';
  return pct(k, n) + '% (' + k + ' of ' + n + ')';
}
function replyFoot(k, n){
  if(!n) return '';
  if(n === 1) return 'The one application sent in this period ' + (k ? 'has had a reply.' : 'hasn’t had a reply yet.') + ' Too few to call a rate yet.';
  if(n < MD.ENOUGH) return k + ' of the ' + n + ' applications sent in this period ' + (k === 1 ? 'has' : 'have') + ' had a reply so far - too few to call a rate yet.';
  return pct(k, n) + '% of this period’s applications (' + k + ' of ' + n + ') have had a reply so far.';
}
function ago(t, now){
  if(!isNum(t)) return '';
  var d = Math.round((MD.util.startOfDay(now) - MD.util.startOfDay(t)) / DAY);
  if(Math.abs(now - t) < HOUR) return 'just now';
  if(d === 0) return 'today';
  if(d === 1) return 'yesterday';
  if(d === -1) return 'tomorrow';
  if(d < 0) return 'in ' + (-d) + ' days';
  if(d < 14) return d + ' days ago';
  return C.fmtDay(t);
}
function link(href, text){ return '<a class="mc-link" href="' + esc(href) + '">' + esc(text) + '</a>'; }
function tierHas(feature){ var D = S.D; if(D && D.features && typeof D.features[feature] === 'boolean') return D.features[feature]; try{ return typeof root.tierHasFeature === 'function' ? !!root.tierHasFeature(feature) : true; }catch(e){ return true; } }

/* ------------------------------------------------------------------ the page builder: cards with chart specs, mounted after insertion */
function Page(D, rg){ this.D = D; this.rg = rg; this.specs = {}; this.k = 0; this.points = []; this.snap = []; }
Page.prototype.id = function(){ return 'mcc' + (++this.k); };
Page.prototype.card = function(o){
  var id = o.spec && !o.empty ? this.id() : null;
  if(id) this.specs[id] = o.spec;
  var h = '<section class="mcc-card mc-span-' + (o.span || 6) + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + '>' +
    '<header class="mcc-head"><div><h3 class="mcc-title">' + esc(o.title) + '</h3>' + (o.sub ? '<p class="mcc-sub">' + o.sub + '</p>' : '') + '</div>' +
    (id ? '<button type="button" class="mcc-tbtn" aria-pressed="false">Table</button>' : '') + '</header>';
  if(o.empty) h += '<div class="mc-empty">' + o.empty + '</div>';
  else {
    if(o.top) h += o.top;
    if(id) h += '<div class="mcc-legend"></div><div class="mcc-plot" data-chart="' + id + '"></div><div class="mcc-table" hidden></div>';
    if(o.body) h += o.body;
  }
  if(o.foot && !o.empty) h += '<p class="mcc-foot">' + o.foot + '</p>';
  return h + '</section>';
};
Page.prototype.section = function(title, sub, items){
  return '<section class="mc-sec"><div class="mc-sec-h"><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="mc-grid">' + items.join('') + '</div></section>';
};
// a stat tile: label, value, a delta against the period before, an optional sparkline
Page.prototype.kpi = function(o){
  var id = null;
  if(o.spark && o.spark.values && o.spark.values.length > 1){ id = this.id(); this.specs[id] = Object.assign({ type: 'spark', label: o.label + ' over time' }, o.spark); }
  var d = '';
  if(o.delta && o.delta.text){
    var cls = o.delta.dir === 'up' ? (o.delta.good === false ? 'bad' : 'good') : o.delta.dir === 'down' ? (o.delta.good === false ? 'good' : 'bad') : 'flat';
    if(o.delta.good == null && o.delta.dir !== 'flat') cls = 'flat';
    d = '<div class="mc-kpi-d ' + cls + '"><span aria-hidden="true">' + (o.delta.dir === 'up' ? '▲' : o.delta.dir === 'down' ? '▼' : '•') + '</span> ' + esc(o.delta.text) + '</div>';
  }
  return '<div class="mc-kpi' + (o.tone ? ' ' + o.tone : '') + '"><div class="mc-kpi-l">' + esc(o.label) + '</div><div class="mc-kpi-v">' + esc(o.value) + '</div>' +
    (o.sub ? '<div class="mc-kpi-s">' + esc(o.sub) + '</div>' : '') + d + (id ? '<div class="mcc-plot mc-kpi-sp" data-chart="' + id + '"></div>' : '') + '</div>';
};
Page.prototype.kpis = function(tiles){ return '<div class="mc-kpis">' + tiles.join('') + '</div>'; };
function delta(cur, prev, goodUp){
  if(S.range === 'all' || !isNum(cur) || !isNum(prev)) return null;
  var r = MD.RANGES.find(function(x){ return x.key === S.range; }), span = r ? r.label : '';
  if(cur === prev) return { dir: 'flat', text: 'same as the ' + span + ' before', good: null };
  if(prev === 0) return { dir: 'up', text: 'none in the ' + span + ' before', good: goodUp };
  var ch = cur - prev;
  return { dir: ch > 0 ? 'up' : 'down', text: (ch > 0 ? '+' : '') + C.fmtN(ch) + ' vs the ' + span + ' before', good: goodUp };
}
function bucketsFor(rg){ var b = MD.buckets(rg); return { b: b, labels: b.map(function(x){ return MD.bucketLabel(x, rg.gran); }), titles: b.map(function(x){ return MD.bucketTitle(x, rg.gran); }) }; }
function series(values, label, color){ return { label: label, values: values, color: color }; }
function empty(text, href, cta){ return '<p>' + text + '</p>' + (href ? '<a class="mc-btn ghost" href="' + esc(href) + '">' + esc(cta || 'Open') + '</a>' : ''); }
function engineFail(what){ return '<div class="mc-empty"><p>' + esc(what) + ' couldn’t be loaded just now, so this part can’t be read yet. Your records are fine.</p><button type="button" class="mc-btn ghost" data-act="engines">Try again</button></div>'; }
function waiting(what){ return '<div class="mc-wait" role="status"><span class="mc-spin" aria-hidden="true"></span>' + esc(what) + '</div>'; }

/* ------------------------------------------------------------------ shared pieces of several views */
function stageSegs(list){
  var P = C.P, c = { none: 0, ghosted: 0, rejected: 0, interview: 0, offer: 0 };
  list.forEach(function(a){ c[a.stage] = (c[a.stage] || 0) + 1; });
  return [{ label: 'No reply yet', value: c.none, color: P.other }, { label: 'No reply (gave up)', value: c.ghosted, color: '#4a4e7a' },
    { label: 'Rejected', value: c.rejected, color: P.ord[1] }, { label: 'Interview', value: c.interview, color: P.ord[3] }, { label: 'Offer', value: c.offer, color: P.ord[4] }];
}
function marketNeeded(p){
  // the job market loads on demand (cached for an hour); views that use it show where it stands
  if(!S.D.hasProfile && !S.D.example) return { why: 'survey', status: 'Take the survey to see your job market.', error: '<p>Take the survey first - Job Search scores jobs against your goal and skills, and this view shows what it finds.</p><a class="mc-btn" href="survey.html">Take the survey</a>' };
  if(S.marketState === 'idle') loadMarket(false);
  if(S.market && S.market.summary) return { m: S.market.summary, meta: S.market };
  if(S.marketState === 'loading') return { why: 'loading', status: 'Reading your job market…', wait: waiting('Reading your job market - scoring your pool the way Job Search does…') };
  return { why: 'error', status: 'Couldn’t read your job market just now.', error: '<p>' + esc(S.marketErr || 'Couldn’t read your job market just now.') + '</p><button type="button" class="mc-btn ghost" data-act="market">Try again</button>' };
}
// signed out, the market is Kaidostar's demo listings: say so where the numbers are
function demoWord(mk){ return mk && mk.meta && mk.meta.demo && !(S.D && S.D.example) ? 'Demo listings: ' : ''; }
function marketFoot(meta){
  if(!meta) return '';
  var s = meta.summary || {};
  return (meta.demo ? esc(meta.note || 'Demo listings.') + ' ' : '') + 'Scored ' + plural(s.n + (s.hidden || 0), 'job') + ' ' + (meta.demo ? '' : 'from your pool ') + ago(meta.at, S.D.now) +
    ' - the same Proof Match scores Job Search shows. <button type="button" class="mc-inline" data-act="market">Refresh</button>' + (meta.note && !meta.demo ? ' ' + esc(meta.note) : '');
}

/* ======================================================================
   TODAY - what needs you, and whether the search is moving
   ====================================================================== */
function pageToday(p){
  var D = p.D, rg = p.rg, prev = MD.prevRange(rg), now = D.now, P = C.P, bk = bucketsFor(rg);
  var needs = MD.needsYou(D);
  var sent = MD.sentIn(D, rg), sentPrev = MD.sentIn(D, prev);
  var replies = D.apps.filter(function(a){ return MD.inRange(a.firstReplyAt, rg); });
  var repliesPrev = D.apps.filter(function(a){ return MD.inRange(a.firstReplyAt, prev); });
  var ivs = D.apps.filter(function(a){ return MD.inRange(a.interviewAt, rg); }), ivsPrev = D.apps.filter(function(a){ return MD.inRange(a.interviewAt, prev); });
  var offers = D.apps.filter(function(a){ return MD.inRange(a.offerAt, rg); }), offersPrev = D.apps.filter(function(a){ return MD.inRange(a.offerAt, prev); });
  var sess = D.sessions.filter(function(s){ return MD.inRange(s._at, rg); }), sessPrev = D.sessions.filter(function(s){ return MD.inRange(s._at, prev); });
  var stepsDone = D.plan ? D.plan.items.filter(function(i){ return MD.inRange(i.doneAt || i.verifiedAt, rg); }) : [];
  var stepsPrev = D.plan ? D.plan.items.filter(function(i){ return MD.inRange(i.doneAt || i.verifiedAt, prev); }) : [];
  var sentSeries = MD.countIn(sent.map(function(a){ return a.sentAt; }), bk.b), replySeries = MD.countIn(replies.map(function(a){ return a.firstReplyAt; }), bk.b);

  // the lead: what needs you
  var hero = needs.length ? '<ul class="mc-needs">' + needs.map(function(n){
    return '<li class="mc-need' + (n.urgent ? ' urgent' : '') + (n.info ? ' info' : '') + '"><span class="mc-need-ic" aria-hidden="true">' + ({ auto: '⚡', apply: '✎', follow: '↩', interview: '◆', deadline: '⏳', plan: '↗', network: '☺', stale: '…', search: '◎' }[n.kind] || '•') + '</span>' +
      '<div class="mc-need-t"><a href="' + esc(n.href) + '">' + esc(n.text) + '</a>' + (n.sub ? '<span>' + esc(n.sub) + '</span>' : '') + '</div>' +
      (n.urgent ? '<span class="mc-chip warn"><span aria-hidden="true">!</span> ' + (isNum(n.at) ? 'by ' + C.fmtDay(n.at) : 'soon') + '</span>' : '') + '</li>';
  }).join('') + '</ul>' : '<p class="mc-calm">Nothing needs you right now. ' + (D.apps.length ? 'Your applications are with employers - replies you log will show up here.' : 'Start on ' + link('dashboard.html', 'Job Search') + ' - saved jobs, applications and practice all show up here.') + '</p>';

  var kp = p.kpis([
    p.kpi({ label: 'Applications sent', value: C.fmtN(sent.length), delta: delta(sent.length, sentPrev.length, true), spark: { values: sentSeries, titles: bk.titles, unit: 'sent' } }),
    p.kpi({ label: 'Replies', value: C.fmtN(replies.length), delta: delta(replies.length, repliesPrev.length, true), spark: { values: replySeries, titles: bk.titles, unit: 'replies' } }),
    p.kpi({ label: 'Interviews reached', value: C.fmtN(ivs.length), delta: delta(ivs.length, ivsPrev.length, true), spark: { values: MD.countIn(ivs.map(function(a){ return a.interviewAt; }), bk.b), titles: bk.titles, unit: 'interviews' } }),
    p.kpi({ label: 'Offers', value: C.fmtN(offers.length), delta: delta(offers.length, offersPrev.length, true) }),
    p.kpi({ label: 'Practice interviews', value: C.fmtN(sess.length), delta: delta(sess.length, sessPrev.length, true), spark: { values: MD.countIn(sess.map(function(s){ return s._at; }), bk.b), titles: bk.titles, unit: 'sessions' } }),
    p.kpi({ label: 'Plan steps done', value: C.fmtN(stepsDone.length), delta: D.plan ? delta(stepsDone.length, stepsPrev.length, true) : null, sub: D.plan ? '' : 'No plan yet' })
  ]);

  var cards = [];
  cards.push(p.card({ title: 'Are employers replying?', sub: 'Applications you sent, and replies as they came in (a rejection counts as a reply), ' + rangeWords(),
    spec: { type: 'columns', label: 'Applications sent and replies per ' + rg.gran, labels: bk.labels, tipTitles: bk.titles, series: [series(sentSeries, 'Sent', P.cat[0]), series(replySeries, 'Replies', P.cat[1])] },
    empty: sent.length || replies.length ? null : empty('Nothing sent in ' + rangeWords() + '. Applications you send - yourself, through Auto or with the extension - show up here, with every reply you log.', 'auto.html', 'Open Auto'),
    foot: replyFoot(sent.filter(function(a){ return a.replied; }).length, sent.length), span: 8 }));
  var all = D.apps.filter(function(a){ return a.status !== 'undone'; });
  var pre = all.filter(function(a){ return !a.isSent; }).length;
  // each application in exactly one place: an offer, closed, interviewing, or waiting (a corrected status still lands somewhere)
  var where = function(a){ return !a.isSent ? 'pre' : a.latest === 'offer' ? 'offer' : (a.latest === 'rejected' || a.latest === 'ghosted') ? 'closed' : a.latest === 'interview' ? 'iv' : 'waiting'; };
  var waitingEmp = all.filter(function(a){ return where(a) === 'waiting'; }).length;
  var iv = all.filter(function(a){ return where(a) === 'iv'; }).length, of = all.filter(function(a){ return where(a) === 'offer'; }).length;
  var closed = all.filter(function(a){ return where(a) === 'closed'; }).length;
  cards.push(p.card({ title: 'Your pipeline right now', sub: 'Every application, by where it stands today', span: 4,
    spec: { type: 'stack', label: 'Applications by where they stand', segs: [{ label: 'Not sent yet', value: pre, color: P.cat[6] }, { label: 'Waiting on the employer', value: waitingEmp, color: P.other }, { label: 'Interviewing', value: iv, color: P.ord[3] }, { label: 'Offer', value: of, color: P.ord[4] }, { label: 'Closed', value: closed, color: '#4a4e7a' }] },
    empty: all.length ? null : empty('No applications yet. Prepare one from a match on Job Search, or let Auto do it.', 'dashboard.html', 'Open Job Search'),
    foot: plural(all.length, 'application') + ' in total.' }));
  var up = MD.upcoming(D, 21);
  var lanes = [{ key: 'deadline', label: 'Deadlines', color: P.cat[1] }, { key: 'send', label: 'Auto sends', color: P.cat[0] }, { key: 'follow', label: 'Follow-ups', color: P.cat[2] }, { key: 'plan', label: 'Plan steps', color: P.cat[3] }, { key: 'network', label: 'Contacts', color: P.cat[4] }]
    .filter(function(l){ return up.some(function(u){ return u.lane === l.key; }); });
  cards.push(p.card({ title: 'The next three weeks', sub: 'Everything with a date ahead: deadlines, Auto’s sends, follow-ups, plan steps and contacts', span: 6,
    spec: { type: 'timeline', label: 'Dated items in the next three weeks', from: MD.util.startOfDay(now), to: now + 21 * DAY, now: now, lanes: lanes, items: up },
    empty: up.length ? null : empty('Nothing dated in the next three weeks. Deadlines of jobs you save, follow-ups, and plan steps with due dates appear here.') }));
  var ev = MD.activity(D).filter(function(e){ return e.mine; }), days = MD.days(ev, rg.from, rg.to), active = Object.keys(days).length;
  cards.push(p.card({ title: 'Your activity', sub: 'Each day of ' + rangeWords() + ', by how much you did (Auto’s own sends aren’t counted)', span: 6,
    spec: { type: 'calendar', label: 'Activity calendar', from: rg.from, to: rg.to, days: days, unit: 'things done' },
    empty: active ? null : empty('No activity in ' + rangeWords() + ' yet.'), foot: plural(active, 'active day') + ' - ' + link('#habits', 'see your habits') }));
  var mk = marketNeeded(p);
  if(mk.m){
    var m = mk.m;
    cards.push(p.card({ title: 'Best matches right now', sub: mk.meta && mk.meta.demo && !D.example ? 'Kaidostar’s demo listings, scored against your profile - sign in to see your own job pool' : 'The jobs in your pool that fit you best, by Proof Match', span: 12,
      body: m.top.length ? '<ol class="mc-rank">' + m.top.slice(0, 6).map(function(t){ return '<li><span class="mc-rank-v">' + (isNum(t.fit) ? Math.round(t.fit) : '–') + '</span><div><b>' + esc(t.title) + '</b><span>' + esc([t.org, t.place].filter(Boolean).join(' - ')) + (isNum(t.ageDays) ? ' - posted ' + (t.ageDays <= 0 ? 'today' : t.ageDays === 1 ? 'yesterday' : t.ageDays + ' days ago') : '') + '</span></div></li>'; }).join('') + '</ol>' : '<p class="mc-calm">No jobs in view with your current filters.</p>',
      foot: marketFoot(mk.meta) + ' ' + link('dashboard.html', 'Open Job Search') }));
  } else cards.push(p.card({ title: 'Best matches right now', sub: 'The jobs in your pool that fit you best', span: 12, body: mk.wait || '<div class="mc-empty">' + mk.error + '</div>' }));

  // the status line and the guide's key points
  var acting = needs.filter(function(n){ return !n.info; });
  p.status = (acting.length ? plural(acting.length, 'thing') + ' need' + (acting.length === 1 ? 's' : '') + ' you. ' : 'Nothing needs you right now. ') +
    (sent.length || replies.length || ivs.length ? 'In ' + rangeWords() + ': ' + plural(sent.length, 'application') + ' sent, ' + plural(replies.length, 'reply', 'replies') + ', ' + plural(ivs.length, 'interview') + '.'
      : 'Nothing sent in ' + rangeWords() + ' yet.');
  p.points.push(sent.length || replies.length ? '<b>' + sent.length + '</b> sent and <b>' + replies.length + '</b> repl' + (replies.length === 1 ? 'y' : 'ies') + ' in ' + rangeWords() + '.' : 'Nothing sent in ' + rangeWords() + ' yet.');
  if(acting.length) p.points.push((acting[0].urgent ? 'Most urgent' : 'Next up') + ': <b>' + esc(acting[0].text) + '</b>.');
  if(ivs.length) p.points.push('<b>' + ivs.length + '</b> application' + (ivs.length === 1 ? '' : 's') + ' reached an interview.');
  if(mk.m) p.points.push(bp(mk.m.strong, 'job') + ' in your pool ' + (mk.m.strong === 1 ? 'is' : 'are') + ' a Strong fit (70+) right now.');
  p.snap.push('Needs you: ' + (needs.map(function(n){ return n.text; }).join('; ') || 'nothing'), 'Range: ' + rangeWords(), 'Sent ' + sent.length + ' (before: ' + sentPrev.length + '), replies ' + replies.length + ', interviews ' + ivs.length + ', offers ' + offers.length,
    'Practice sessions ' + sess.length + ', plan steps done ' + stepsDone.length, mk.m ? 'Job market: ' + mk.m.n + ' jobs in view, ' + mk.m.strong + ' strong (70+), median fit ' + Math.round(mk.m.median || 0) : '');
  return '<section class="mc-sec mc-hero"><div class="mc-sec-h"><h2>Needs you</h2></div>' + hero + '</section>' + kp + p.section('How it’s moving', '', cards);
}

/* ======================================================================
   APPLICATIONS - volume, where they stand, and timing
   ====================================================================== */
function pageApplications(p){
  var D = p.D, rg = p.rg, prev = MD.prevRange(rg), now = D.now, P = C.P, bk = bucketsFor(rg);
  var sent = MD.sentIn(D, rg), sentPrev = MD.sentIn(D, prev), f = MD.funnel(sent);
  var replyDays = sent.filter(function(a){ return isNum(a.replyDays); }).map(function(a){ return a.replyDays; });
  var med = MD.util.median(replyDays);
  var open = D.apps.filter(function(a){ return a.open; }), stale = open.filter(function(a){ return a.waitingDays >= 21; });
  var kp = p.kpis([
    p.kpi({ label: 'Sent', value: C.fmtN(sent.length), delta: delta(sent.length, sentPrev.length, true), spark: { values: MD.countIn(sent.map(function(a){ return a.sentAt; }), bk.b), titles: bk.titles, unit: 'sent' } }),
    p.kpi({ label: 'Reply rate', value: sent.length >= MD.ENOUGH ? fmtPct(pct(f.replied, f.sent)) : (sent.length ? f.replied + ' of ' + f.sent : '–'), sub: sent.length && sent.length < MD.ENOUGH ? 'too few to call a rate' : (sent.length ? f.replied + ' of ' + f.sent : 'nothing sent') }),
    p.kpi({ label: 'Interview rate', value: sent.length >= MD.ENOUGH ? fmtPct(pct(f.interview, f.sent)) : (sent.length ? f.interview + ' of ' + f.sent : '–'), sub: sent.length ? f.interview + ' of ' + f.sent + ' reached an interview' : '' }),
    p.kpi({ label: 'Offers', value: C.fmtN(f.offer), sub: 'from this period’s applications' }),
    p.kpi({ label: 'Typical wait for a reply', value: isNum(med) ? plural(Math.round(med), 'day') : '–', sub: replyDays.length ? 'median of ' + plural(replyDays.length, 'reply', 'replies') : 'no replies yet' }),
    p.kpi({ label: 'No reply for 3+ weeks', value: C.fmtN(stale.length), tone: stale.length ? 'warn' : '', sub: 'of ' + plural(open.length, 'open application') })
  ]);
  var a1 = [];
  a1.push(p.card({ title: 'From sent to offer', sub: 'How far the applications you sent in ' + rangeWords() + ' have got', span: 5,
    spec: { type: 'funnel', label: 'Applications by furthest stage', stages: [{ label: 'Sent', value: f.sent }, { label: 'Any reply', value: f.replied }, { label: 'Interview', value: f.interview }, { label: 'Offer', value: f.offer }] },
    empty: f.sent ? null : empty('Nothing sent in ' + rangeWords() + '.', 'dashboard.html', 'Find jobs to apply to'),
    foot: 'Counted from the outcomes you logged. A reply is a rejection, an interview or an offer. ' + (f.sent < MD.ENOUGH ? 'With so few, the percentages are early. ' : '') +
      (function(){ var k = sent.filter(function(a){ return a.sentImputed; }).length; return k ? plural(k, 'older application') + ' had no send time saved, so the day ' + (k === 1 ? 'it was' : 'they were') + ' made is used.' : ''; })() }));
  var stacks = { none: [], ghosted: [], rejected: [], interview: [], offer: [] };
  bk.b.forEach(function(b){
    var inB = sent.filter(function(a){ return a.sentAt >= b.start && a.sentAt < b.end; });
    Object.keys(stacks).forEach(function(k){ stacks[k].push(inB.filter(function(a){ return a.stage === k; }).length); });
  });
  var segs = stageSegs([]);
  a1.push(p.card({ title: 'What happened to each ' + (rg.gran === 'day' ? 'day' : rg.gran) + '’s applications', sub: 'Sent applications, by the furthest stage each has reached so far', span: 7,
    spec: { type: 'columns', stacked: true, label: 'Applications by stage reached, per ' + rg.gran, labels: bk.labels, tipTitles: bk.titles, series: [
      series(stacks.none, segs[0].label, segs[0].color), series(stacks.ghosted, segs[1].label, segs[1].color), series(stacks.rejected, segs[2].label, segs[2].color), series(stacks.interview, segs[3].label, segs[3].color), series(stacks.offer, segs[4].label, segs[4].color)] },
    empty: sent.length ? null : empty('Nothing sent in ' + rangeWords() + '.'), foot: 'Older bars fill in as employers answer - recent ones are mostly “no reply yet” for now.' }));
  var a2 = [];
  var rb = MD.bucketize(replyDays, MD.REPLY_BUCKETS);
  a2.push(p.card({ title: 'How long replies take', sub: 'Days from sending to the employer’s first answer', span: 6,
    spec: { type: 'hist', label: 'Days until the first reply', labels: MD.REPLY_BUCKETS.map(function(x){ return x[2]; }), values: rb, seriesLabel: 'Replies', colors: P.ord.slice(0, 5).reverse() },
    empty: replyDays.length ? null : empty('No replies logged for this period’s applications. When you log an outcome in the Workshop, its date lands here.', 'workshop.html', 'Log an outcome'),
    foot: isNum(med) ? 'Half of replies came within ' + plural(Math.round(med), 'day') + '.' : '' }));
  var wb = MD.bucketize(open.map(function(a){ return a.waitingDays; }), MD.WAIT_BUCKETS);
  a2.push(p.card({ title: 'Still waiting on employers', sub: 'Applications with no reply yet, by how long they’ve waited (right now)', span: 6,
    spec: { type: 'hist', label: 'Open applications by days waiting', labels: MD.WAIT_BUCKETS.map(function(x){ return x[2]; }), values: wb, seriesLabel: 'Applications', colors: P.ord.slice(0, 5).reverse() },
    empty: open.length ? null : empty('Nothing waiting on an employer right now.'),
    foot: stale.length ? plural(stale.length, 'application') + ' past three weeks. If you’ve heard nothing, mark them “no reply” in the Workshop so your rates stay honest.' : 'None past three weeks.' }));
  var a3 = [];
  var orgs = {};
  sent.forEach(function(a){ var o = a.org || 'Unknown'; var e = orgs[o] || (orgs[o] = { n: 0, r: 0 }); e.n++; if(a.replied) e.r++; });
  var orgRows = Object.keys(orgs).map(function(o){ return { label: o, n: orgs[o].n, r: orgs[o].r }; }).sort(function(a, b){ return b.n - a.n || (a.label < b.label ? -1 : 1); }).slice(0, 10);
  a3.push(p.card({ title: 'Where you’ve applied', sub: 'Companies you sent the most to in ' + rangeWords() + ', and how many replied', span: 6,
    spec: { type: 'bars', label: 'Applications per company', rows: orgRows.map(function(r){ return { label: r.label, segs: [{ label: 'Replied', value: r.r, color: P.cat[2] }, { label: 'No reply yet', value: r.n - r.r, color: P.other }] }; }), segFmt: C.fmtN, valueLabel: 'Sent' },
    empty: orgRows.length ? null : empty('No applications in ' + rangeWords() + '.'),
    foot: orgRows.length && orgRows[0].n >= 4 ? 'You’ve sent ' + orgRows[0].n + ' to ' + esc(orgRows[0].label) + ' - several at one company can look unfocused to their recruiters.' : '' }));
  var mode = { Remote: 0, Hybrid: 0, 'On-site': 0, 'Not stated': 0 };
  sent.forEach(function(a){ var l = (a.location || '').toLowerCase(); mode[/remote/.test(l) ? 'Remote' : /hybrid/.test(l) ? 'Hybrid' : l ? 'On-site' : 'Not stated']++; });
  a3.push(p.card({ title: 'Remote, hybrid or on-site', sub: 'What you applied to in ' + rangeWords() + ', read from each posting’s location', span: 6,
    spec: { type: 'stack', label: 'Applications by work mode', segs: [{ label: 'Remote', value: mode.Remote, color: P.cat[0] }, { label: 'Hybrid', value: mode.Hybrid, color: P.cat[1] }, { label: 'On-site', value: mode['On-site'], color: P.cat[2] }, { label: 'Not stated', value: mode['Not stated'], color: P.other }] },
    empty: sent.length ? null : empty('No applications in ' + rangeWords() + '.') }));
  var types = {};
  sent.forEach(function(a){ var t = a.type === 'internship' ? 'Internships' : a.type === 'college' ? 'Programs' : 'Jobs'; types[t] = (types[t] || 0) + 1; });
  var made = { auto: 0, you: 0 };
  sent.forEach(function(a){ made[a.auto ? 'auto' : 'you']++; });
  a3.push(p.card({ title: 'Who started them', sub: 'Applications Auto prepared vs ones you started, in ' + rangeWords(), span: 6,
    spec: { type: 'stack', label: 'Applications by who started them', segs: [{ label: 'Prepared by Auto', value: made.auto, color: P.cat[0] }, { label: 'Started by you', value: made.you, color: P.cat[2] }] },
    empty: sent.length ? null : empty('No applications in ' + rangeWords() + '.') }));
  a3.push(p.card({ title: 'Jobs, internships, programs', sub: 'What kind of opportunity you applied to', span: 6,
    spec: { type: 'bars', label: 'Applications by type', rows: Object.keys(types).map(function(k){ return { label: k, value: types[k] }; }).sort(function(a, b){ return b.value - a.value; }), valueLabel: 'Sent' },
    empty: sent.length ? null : empty('No applications in ' + rangeWords() + '.') }));
  // the latest applications, as a table
  var recent = D.apps.slice().sort(function(a, b){ return (b.sentAt || b.createdAt || 0) - (a.sentAt || a.createdAt || 0); }).slice(0, 12);
  var stageWord = { none: 'Waiting', ghosted: 'No reply', rejected: 'Rejected', interview: 'Interview', offer: 'Offer' };
  var table = recent.length ? '<div class="mc-tbl-wrap"><table class="mcc-tbl"><caption>Your latest applications</caption><thead><tr><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Sent</th><th scope="col">How</th><th scope="col">Waiting</th></tr></thead><tbody>' +
    recent.map(function(a){
      var st = a.isSent ? stageWord[a.stage] : ({ pending_review: 'To review', approved: 'Going out', sending: 'Sending', ready_to_submit: 'Ready for you', undone: 'Undone' }[a.status] || a.status);
      return '<tr><th scope="row">' + esc(a.title) + (a.org ? '<span class="mc-dim"> - ' + esc(a.org) + '</span>' : '') + '</th><td>' + esc(st) + '</td><td>' + (a.sentAt ? esc(C.fmtDay(a.sentAt)) : '–') + '</td><td>' + esc(a.how ? MD.L.how[a.how] : '–') + '</td><td>' + (isNum(a.waitingDays) ? a.waitingDays + ' days' : '–') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '';
  var a4 = [p.card({ title: 'Latest applications', sub: 'The twelve most recent', span: 12, body: table, empty: recent.length ? null : empty('No applications yet.', 'dashboard.html', 'Open Job Search'), foot: link('workshop.html', 'Manage them in the Workshop') })];
  p.status = plural(sent.length, 'application') + ' sent in ' + rangeWords() + (sent.length ? '; ' + plural(f.replied, 'has', 'have').replace(/^(\d+) (has|have)$/, function(_, n, w){ return n + ' ' + w; }) + ' had a reply so far.' : '.');
  p.points.push('Reply rate: <b>' + esc(rateLine(f.replied, f.sent)) + '</b>.', 'Interviews: <b>' + f.interview + '</b>, offers: <b>' + f.offer + '</b>.');
  if(isNum(med)) p.points.push('Replies typically arrive in <b>' + plural(Math.round(med), 'day') + '</b>.');
  if(stale.length) p.points.push(bp(stale.length, 'application') + ' ' + (stale.length === 1 ? 'has' : 'have') + ' waited over three weeks.');
  p.snap.push('Range: ' + rangeWords(), 'Sent ' + f.sent + ', replied ' + f.replied + ', interview ' + f.interview + ', offer ' + f.offer, 'Median days to reply: ' + (isNum(med) ? Math.round(med) : 'n/a'), 'Open applications ' + open.length + ', waiting 3+ weeks ' + stale.length,
    'Top companies: ' + orgRows.slice(0, 5).map(function(r){ return r.label + ' (' + r.n + ')'; }).join(', '));
  return kp + p.section('Where they stand', '', a1) + p.section('Timing', 'How long employers take - and what’s still out there.', a2) + p.section('Who and what you apply to', '', a3) + p.section('Latest', '', a4);
}

/* ======================================================================
   AUTO - what it prepared, sent, held back, and handed to you
   ====================================================================== */
var HOW_COLOR = { email: C.P.cat[0], server: C.P.cat[1], extension: C.P.cat[2], autopilot: C.P.cat[3], you: C.P.cat[4], handed: C.P.other, unknown: '#4a4e7a' };
function pageAuto(p){
  var D = p.D, rg = p.rg, now = D.now, P = C.P, bk = bucketsFor(rg), A = D.auto || {};
  var settingsUnknown = D.source.missing.indexOf('auto_settings') >= 0 && A.enabled == null;
  var autos = D.apps.filter(function(a){ return a.auto; });
  var hasFeature = tierHas('auto_mode');
  if(!autos.length && !hasFeature){
    p.status = 'Auto is part of Pro and Max.';
    p.points.push('Auto applies to your strongest matches on its own, within the limits you set.');
    return p.section('Auto', '', [p.card({ title: 'Auto is part of Pro and Max', span: 12, body: '<div class="mc-empty"><p>Auto prepares applications for your strongest matches, sends them after an undo window you choose, and hands anything that needs you back - with the reason. This view charts all of it once it’s running.</p><a class="mc-btn" href="plan.html">See plans</a> <a class="mc-btn ghost" href="auto.html">How Auto works</a></div>' })]);
  }
  var made = autos.filter(function(a){ return MD.inRange(a.createdAt, rg); });
  var sentA = autos.filter(function(a){ return a.isSent && MD.inRange(a.sentAt, rg); });
  var review = autos.filter(function(a){ return a.status === 'pending_review'; });
  var kitsAll = autos.filter(function(a){ return a.status === 'ready_to_submit'; });
  // kits Autopilot is applying to (or may be, when its status couldn't be read) aren't waiting for you
  var apUnknown = !A.autopilot && D.source.missing.indexOf('autopilot') >= 0;
  var kits = kitsAll.filter(function(a){ var h = a.pkg && a.pkg.handoff; return !MD.autopilotTakes(a, D) && !(apUnknown && h && h.autopilot && !h.possiblySent); }), apKits = kitsAll.length - kits.length;
  var going = D.apps.filter(function(a){ return a.status === 'approved' || a.status === 'sending'; });
  var rules = A.rules || {}, cap = Math.min(isNum(rules.dailyCap) ? rules.dailyCap : 99, isNum(A.tierMax) ? A.tierMax : 99);
  var today0 = MD.util.startOfDay(now), madeToday = autos.filter(function(a){ return a.createdAt >= today0; }).length;
  var cov = A.coverage || null;
  var kp = p.kpis([
    p.kpi({ label: 'Prepared by Auto', value: C.fmtN(made.length), spark: { values: MD.countIn(made.map(function(a){ return a.createdAt; }), bk.b), titles: bk.titles, unit: 'prepared' } }),
    p.kpi({ label: 'Sent by Auto', value: C.fmtN(sentA.length), spark: { values: MD.countIn(sentA.map(function(a){ return a.sentAt; }), bk.b), titles: bk.titles, unit: 'sent' } }),
    p.kpi({ label: 'Waiting for you', value: C.fmtN(review.length + kits.length), tone: review.length + kits.length ? 'warn' : '', sub: review.length + ' to review - ' + kits.length + ' to submit' + (apKits ? ' (' + apKits + (apUnknown ? ' more may be' : ' more') + ' in Autopilot’s queue)' : '') }),
    p.kpi({ label: 'Going out', value: C.fmtN(going.length), sub: going.length ? 'undo window open' : 'nothing scheduled' }),
    p.kpi({ label: 'Today', value: madeToday + (cap < 99 ? ' / ' + cap : ''), sub: cap < 99 ? 'prepared of your daily limit' : 'prepared today' }),
    p.kpi({ label: 'Answer bank', value: cov ? cov.have + ' / ' + cov.of : '–', sub: cov ? (cov.have === cov.of ? 'every standard question' : (cov.of - cov.have) + ' standard answers missing') : 'open Auto to set it up' })
  ]);
  var st = [];
  st.push(settingsUnknown ? 'Auto’s settings couldn’t be read just now.' : (A.enabled ? 'Auto is on' : 'Auto is off') + (rules.mode ? ' in ' + (rules.mode === 'auto' ? 'send-after-undo' : 'review') + ' mode' : '') + '.');
  if(!A.autopilot && D.source.missing.indexOf('autopilot') >= 0) st.push('Autopilot’s status couldn’t be read just now.');
  if(A.autopilot){ var ap = A.autopilot; st.push(ap.live ? 'Autopilot is applying in your browser.' : (ap.onSince ? 'Autopilot is on but hasn’t checked in lately.' : 'Autopilot is off.')); }
  if(isNum(A.lastRunAt)) st.push('Last pass ' + ago(A.lastRunAt, now) + '.');
  var c1 = [];
  c1.push(p.card({ title: 'Auto, ' + (rg.gran === 'day' ? 'day' : rg.gran) + ' by ' + (rg.gran === 'day' ? 'day' : rg.gran), sub: 'Applications Auto prepared, and the ones that went out', span: 8,
    spec: { type: 'columns', label: 'Auto applications prepared and sent', labels: bk.labels, tipTitles: bk.titles, series: [series(MD.countIn(made.map(function(a){ return a.createdAt; }), bk.b), 'Prepared', P.cat[0]), series(MD.countIn(sentA.map(function(a){ return a.sentAt; }), bk.b), 'Sent', P.cat[2])] },
    empty: made.length || sentA.length ? null : empty('Auto hasn’t prepared anything in ' + rangeWords() + '. ' + (settingsUnknown ? '' : A.enabled ? 'It runs twice a day on your strongest matches.' : 'Turn it on to have it apply within your rules.'), 'auto.html', 'Open Auto') }));
  var howC = {};
  autos.filter(function(a){ return MD.inRange(a.sentAt || (a.pkg && a.pkg.handoff && a.pkg.handoff.at) || a.createdAt, rg); }).forEach(function(a){
    var k = a.isSent ? a.how : (a.status === 'ready_to_submit' ? 'handed' : null); if(!k) return; howC[k] = (howC[k] || 0) + 1;
  });
  var howLabels = Object.assign({}, MD.L.how, { handed: 'Handed to you to submit' });
  var howOrder = ['email', 'server', 'extension', 'autopilot', 'you', 'handed', 'unknown'];
  c1.push(p.card({ title: 'How Auto’s applications went out', sub: 'Sent - by email, by Kaidostar, by the extension or by Autopilot - or handed back to you', span: 4,
    spec: { type: 'stack', label: 'Auto applications by how they went out', segs: howOrder.filter(function(k){ return howC[k]; }).map(function(k){ return { label: howLabels[k], value: howC[k], color: HOW_COLOR[k] }; }) },
    empty: Object.keys(howC).length ? null : empty('Nothing has gone out yet in ' + rangeWords() + '.') }));
  var c2 = [];
  var ho = {};
  autos.forEach(function(a){
    var h = a.pkg && a.pkg.handoff; if(!h || !h.key || !MD.inRange(h.at || a.createdAt, rg)) return;
    // "extension" is a hand-over to the extension (Autopilot's queue), not to you - unless Autopilot then stopped
    if(h.key === 'extension' && !(h.by === 'autopilot' && h.step)) return;
    var k = h.by === 'autopilot' && h.step ? 'autopilot:' + h.step : h.key;
    ho[k] = (ho[k] || 0) + 1;
  });
  var hoRows = Object.keys(ho).map(function(k){ var lab = k.indexOf('autopilot:') === 0 ? 'Autopilot stopped at ' + (MD.L.step[k.slice(10)] || k.slice(10)).toLowerCase() : (MD.L.handoff[k] || k); return { label: lab, value: ho[k] }; }).sort(function(a, b){ return b.value - a.value; });
  c2.push(p.card({ title: 'Why applications came back to you', sub: 'Each time Auto or Autopilot stopped and left an application for you, by the reason it gave', span: 6,
    spec: { type: 'bars', label: 'Hand-backs by reason', rows: hoRows, color: P.cat[1], valueLabel: 'Applications' },
    empty: hoRows.length ? null : empty('Nothing handed back in ' + rangeWords() + '.'), foot: 'Auto never guesses past these - a CAPTCHA, a sign-in or a question it can’t answer is always yours.' }));
  var nd = {};
  autos.filter(function(a){ return MD.inRange(a.createdAt, rg); }).forEach(function(a){
    var needs = a.pkg && a.pkg.needs || [];
    if(needs.length) needs.forEach(function(k){ nd[k] = (nd[k] || 0) + 1; });
    else if(a.status === 'pending_review') nd[rules.mode === 'review' ? 'review' : 'stale'] = (nd[rules.mode === 'review' ? 'review' : 'stale'] || 0) + 1;
  });
  var ndRows = Object.keys(nd).map(function(k){ return { label: MD.L.need[k] || k, value: nd[k] }; }).sort(function(a, b){ return b.value - a.value; });
  c2.push(p.card({ title: 'Why Auto asked you first', sub: 'What made Auto wait for your approval instead of sending', span: 6,
    spec: { type: 'bars', label: 'Reviews by reason', rows: ndRows, color: P.cat[3], valueLabel: 'Applications' },
    empty: ndRows.length ? null : empty('Auto hasn’t needed your review in ' + rangeWords() + '.') }));
  var runs = (A.runs || []).filter(function(r){ return MD.inRange(r.at, rg); });
  var held = {};
  runs.forEach(function(r){ Object.keys(r.heldCounts || {}).forEach(function(k){ held[k] = (held[k] || 0) + r.heldCounts[k]; }); Object.keys(r.excluded || {}).forEach(function(k){ held[k] = (held[k] || 0) + r.excluded[k]; }); });
  var heldRows = Object.keys(held).map(function(k){ return { label: MD.L.held[k] || k, value: held[k] }; }).sort(function(a, b){ return b.value - a.value; }).slice(0, 10);
  var c3 = [];
  c3.push(p.card({ title: 'What Auto passed over', sub: 'Jobs Auto looked at and held back, by your rules - across its last ' + plural(runs.length, 'pass', 'passes'), span: 6,
    spec: { type: 'bars', label: 'Jobs held back by reason', rows: heldRows, color: P.cat[6], valueLabel: 'Times held' },
    empty: heldRows.length ? null : empty('No passes recorded in ' + rangeWords() + '. Auto keeps its last 20 passes.'), foot: 'A job held back on several passes is counted each time.' }));
  c3.push(p.card({ title: 'Auto’s passes', sub: 'Each time Auto ran: jobs it considered and applications it made', span: 6,
    spec: { type: 'columns', label: 'Auto passes', labels: runs.map(function(r){ return C.fmtDay(r.at); }), tipTitles: runs.map(function(r){ return C.fmtFull(r.at) + (r.reason === 'manual' ? ' (you ran it)' : ''); }), series: [series(runs.map(function(r){ return r.considered; }), 'Considered', P.other), series(runs.map(function(r){ return r.created; }), 'Made', P.cat[0])] },
    empty: runs.length ? null : empty('No passes in ' + rangeWords() + '.') }));
  var fitC = { excellent: 0, strong: 0, partial: 0, weak: 0 };
  made.forEach(function(a){ var b = MD.fitBand(a.pkg && isNum(a.pkg.fit) ? a.pkg.fit : a.confidence); if(fitC[b] != null) fitC[b]++; });
  c3.push(p.card({ title: 'How well they fit', sub: 'The Proof Match fit of what Auto prepared in ' + rangeWords(), span: 6,
    spec: { type: 'hist', label: 'Auto applications by fit', labels: ['Under 55', '55-69', '70-84', '85+'], values: [fitC.weak, fitC.partial, fitC.strong, fitC.excellent], seriesLabel: 'Applications', colors: P.ord.slice(1, 5) },
    empty: made.length ? null : empty('Nothing prepared in ' + rangeWords() + '.'), foot: isNum(rules.minFit) ? 'Your bar is ' + rules.minFit + '. Stretches below it only go out with your approval.' : '' }));
  var lat = autos.filter(function(a){ return a.isSent && MD.inRange(a.sentAt, rg) && a.pkg && isNum(a.pkg.sentAt); }).map(function(a){ var from = isNum(a.pkg.approvedAt) ? a.pkg.approvedAt : a.pkg.createdAt; return isNum(from) ? (a.pkg.sentAt - from) / HOUR : null; }).filter(isNum);
  var LAT = [[0, 1, 'Under 1 hour'], [1.0001, 6, '1-6 hours'], [6.0001, 24, '6-24 hours'], [24.0001, 72, '1-3 days'], [72.0001, 1e9, '3+ days']];
  var lc = LAT.map(function(){ return 0; }); lat.forEach(function(h){ for(var i = 0; i < LAT.length; i++){ if(h <= LAT[i][1]){ lc[i]++; break; } } });
  c3.push(p.card({ title: 'From approval to sent', sub: 'How long applications waited before going out (your undo window included)', span: 6,
    spec: { type: 'hist', label: 'Time from approval to sending', labels: LAT.map(function(x){ return x[2]; }), values: lc, seriesLabel: 'Applications', color: P.cat[0] },
    empty: lat.length ? null : empty('Nothing sent by Auto in ' + rangeWords() + '.'), foot: isNum(rules.delayMinutes) ? 'Your undo window: ' + (rules.delayMinutes >= 60 ? plural(Math.round(rules.delayMinutes / 6) / 10, 'hour') : plural(rules.delayMinutes, 'minute')) + '.' : '' }));
  var c4 = [];
  var learned = (A.learned || []).slice().sort(function(a, b){ return a - b; });
  if(learned.length){
    var lb = MD.countIn(learned, bk.b), acc = learned.filter(function(t){ return t < rg.from; }).length, cum = lb.map(function(v){ acc += v; return acc; });
    c4.push(p.card({ title: 'Answers learned from forms', sub: 'Answers the extension remembered from forms you filled in, so Auto can reuse them', span: 6,
      spec: { type: 'line', label: 'Answers remembered from forms', area: true, labels: bk.labels, tipTitles: bk.titles, series: [series(cum, 'Answers remembered', P.cat[2])], tipFmt: C.fmtN },
      foot: 'Plus ' + plural((A.custom && A.custom.yours) || 0, 'answer') + ' you wrote yourself.' }));
  } else c4.push(p.card({ title: 'Answers learned from forms', span: 6, empty: empty('None yet. When you fill in a question on an application form with the Kaidostar Apply extension, it offers to remember the answer for next time.', 'auto.html', 'Open your answer bank') }));
  if(cov) c4.push(p.card({ title: 'Your answer bank', sub: 'The standard questions application forms ask - answered once, reused everywhere', span: 6,
    spec: { type: 'meters', label: 'Answer bank coverage', rows: [{ label: 'Standard answers', value: cov.have, max: cov.of, color: P.ord[3] }].concat(A.custom ? [{ label: 'Your own answers', value: A.custom.yours || 0, max: Math.max(10, A.custom.yours || 0), text: String(A.custom.yours || 0), color: P.ord[2] }, { label: 'Learned from forms', value: A.custom.form || 0, max: Math.max(10, A.custom.form || 0), text: String(A.custom.form || 0), color: P.ord[2] }] : []) },
    foot: cov.missing && cov.missing.length ? 'Missing: ' + esc(cov.missing.slice(0, 4).join(', ')) + (cov.missing.length > 4 ? ' and ' + (cov.missing.length - 4) + ' more' : '') + '.' : 'Every standard question has an answer.' }));
  var apA = autos.filter(function(a){ return a.pkg && a.pkg.autopilot && MD.inRange(a.createdAt, rg); });
  if(A.autopilot && (A.autopilot.onSince || apA.length)){
    var apS = apA.filter(function(a){ return a.isSent; }).length, apH = apA.filter(function(a){ return !a.isSent && a.status === 'ready_to_submit'; }).length;
    var last = A.autopilot.last;
    c4.push(p.card({ title: 'Autopilot', sub: 'The extension applying on its own in your browser - only when every rule passes', span: 12,
      spec: { type: 'bars', label: 'Autopilot results', rows: [{ label: 'Submitted and confirmed', value: apS, color: P.cat[2] }, { label: 'Handed back to you', value: apH, color: P.cat[1] }].concat(last ? [{ label: 'Last run: sent', value: last.sent || 0, color: P.cat[0] }, { label: 'Last run: needs you', value: last.needs || 0, color: P.cat[3] }, { label: 'Last run: to check', value: last.unsure || 0, color: P.cat[7] }] : []), valueLabel: 'Applications' },
      foot: (A.autopilot.live ? 'Live now.' : 'Not running right now.') + (last && isNum(last.at) ? ' Last run ' + ago(last.at, now) + '.' : '') }));
  }
  var fus = autos.filter(function(a){ return a.pkg && a.pkg.followUp && isNum(a.pkg.followUp.dueAt) && MD.inRange(a.pkg.followUp.dueAt, { from: rg.from, to: now + 30 * DAY }); });
  if(fus.length){
    var fd = fus.filter(function(a){ return a.pkg.followUp.doneAt; }).length, fdue = fus.filter(function(a){ return !a.pkg.followUp.doneAt && a.pkg.followUp.dueAt <= now && (!a.latest || a.latest === 'applied'); }).length, fl = fus.length - fd - fdue;
    c4.push(p.card({ title: 'Follow-ups', sub: 'The nudges Auto schedules after sending, if no reply comes', span: 12,
      spec: { type: 'stack', label: 'Follow-ups by state', segs: [{ label: 'Done', value: fd, color: P.cat[2] }, { label: 'Due now', value: fdue, color: P.cat[1] }, { label: 'Later, or answered', value: fl, color: P.other }] } }));
  }
  p.status = st.join(' ');
  p.points.push('<b>' + made.length + '</b> prepared and <b>' + sentA.length + '</b> sent by Auto in ' + rangeWords() + '.');
  if(review.length + kits.length) p.points.push('<b>' + (review.length + kits.length) + '</b> waiting for you on the Auto page.');
  if(hoRows.length) p.points.push('Most common reason it handed back: <b>' + esc(hoRows[0].label) + '</b>.');
  p.snap.push('Auto ' + (settingsUnknown ? 'settings unknown' : A.enabled ? 'on' : 'off') + ', mode ' + (rules.mode || 'n/a') + ', min fit ' + (rules.minFit || 'n/a'), 'Prepared ' + made.length + ', sent ' + sentA.length + ' in ' + rangeWords(), 'Waiting for you: ' + review.length + ' to review, ' + kits.length + ' to submit; going out ' + going.length,
    'Hand-back reasons: ' + hoRows.slice(0, 4).map(function(r){ return r.label + ' ' + r.value; }).join(', '), 'Held back: ' + heldRows.slice(0, 4).map(function(r){ return r.label + ' ' + r.value; }).join(', '));
  return kp + p.section('What Auto did', '', c1) + p.section('Where it needed you', '', c2) + p.section('How it chooses', 'Auto applies only within your rules - this is what they let through and what they held back.', c3) + p.section('Answers, Autopilot and follow-ups', '', c4);
}

/* ======================================================================
   JOBS - the market for what you're aiming at
   ====================================================================== */
var HIDE_LABEL = { company: 'Companies you blocked', onlyco: 'Not one of your chosen companies', keyword: 'Mentions a word you excluded', phrase: 'Mentions a phrase you excluded', role: 'A role you excluded',
  mention: 'Missing a must-have word', search: 'Not the role searched for', xmode: 'A work mode you ruled out', place: 'Outside your places', salary: 'Pay below your floor or not listed', xlevel: 'A level you excluded',
  xtype: 'A job type you excluded', fresh: 'Older than you want', repost: 'Reposted', ghost: 'High ghost-job risk', agency: 'Staffing agencies', evergreen: 'Talent-pool posts', thin: 'Almost no description',
  industry: 'Outside your industries', skills: 'Missing a must-have skill', learned: 'Like jobs you passed on', management: 'Management roles', minfit: 'Below your minimum fit', travel: 'Too much travel', xskill: 'Uses a skill you avoid',
  auth: 'Work authorisation doesn’t fit', eligibility: 'You may not be eligible', clearance: 'Needs a security clearance', license: 'Needs a licence', license_state: 'A licence for another state', cert: 'Needs a certification',
  education: 'Education doesn’t fit', overqualified: 'You may be overqualified', region: 'Outside the hiring region', level: 'Seniority doesn’t fit' };
function hideLabel(k){ return HIDE_LABEL[k] || (String(k).charAt(0).toUpperCase() + String(k).slice(1)).replace(/_/g, ' '); }
var LEVEL_ORDER = [['intern', 'Internship'], ['entry', 'Entry level'], ['mid', 'Mid level'], ['senior', 'Senior'], ['lead', 'Lead / staff'], ['director', 'Director'], ['exec', 'Executive'], ['unknown', 'Not stated']];
function pageJobs(p){
  var D = p.D, P = C.P, mk = marketNeeded(p);
  if(!mk.m){ p.status = mk.status; return p.section('Your job market', '', [p.card({ title: 'Your job market', span: 12, body: mk.wait || '<div class="mc-empty">' + mk.error + '</div>' })]); }
  var m = mk.m, foot = marketFoot(mk.meta), n = m.n;
  var modes = m.modes || {}, remote = modes.remote || 0;
  var kp = p.kpis([
    p.kpi({ label: 'Jobs in view', value: C.fmtN(n), sub: m.hidden ? C.fmtN(m.hidden) + ' more hidden by your filters' : 'after your filters' }),
    p.kpi({ label: 'Strong fits (70+)', value: C.fmtN(m.strong), sub: n ? pct(m.strong, n) + '% of jobs in view' : '' }),
    p.kpi({ label: 'Within reach (55-69)', value: C.fmtN(m.reach), sub: 'a skill or two away' }),
    p.kpi({ label: 'Median fit', value: isNum(m.median) ? String(Math.round(m.median)) : '–', sub: 'out of 100' }),
    p.kpi({ label: 'Posted this week', value: m.newThisWeek != null ? C.fmtN(m.newThisWeek) : '–', sub: 'new in the last 7 days' }),
    p.kpi({ label: 'Remote', value: n ? pct(remote, n) + '%' : '–', sub: C.fmtN(remote) + ' of ' + C.fmtN(n) })
  ]);
  var c1 = [];
  c1.push(p.card({ title: 'How well the jobs fit you', sub: 'Every job in view by its Proof Match fit - right of the line is Strong', span: 8,
    spec: { type: 'hist', label: 'Jobs by fit', labels: ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'], values: m.histogram, seriesLabel: 'Jobs', color: P.cat[0], mark: { at: 7, label: 'Strong' } },
    empty: n ? null : empty('No jobs in view with your current filters.', 'dashboard.html', 'Adjust filters'), foot: foot }));
  var b = m.bands || {};
  c1.push(p.card({ title: 'By band', sub: 'The same jobs in Job Search’s bands', span: 4,
    spec: { type: 'bars', label: 'Jobs by fit band', rows: [['excellent', 'Excellent (85+)'], ['strong', 'Strong (70-84)'], ['partial', 'Partial (55-69)'], ['weak', 'Weak'], ['poor', 'Poor'], ['unknown', 'Too thin to score']].map(function(x, i){ return { label: x[1], value: b[x[0]] || 0, color: [P.ord[4], P.ord[3], P.ord[2], P.ord[1], P.ord[0], P.other][i] }; }).filter(function(r){ return r.value > 0; }), valueLabel: 'Jobs' },
    empty: n ? null : empty('No jobs in view.') }));
  var c2 = [];
  c2.push(p.card({ title: 'Where the jobs are', sub: 'Jobs in view by place (remote counted on its own)', span: 6,
    spec: { type: 'bars', label: 'Jobs by place', rows: m.metros.map(function(x){ return { label: x.key, value: x.n }; }), color: P.cat[0], valueLabel: 'Jobs' }, empty: n ? null : empty('No jobs in view.') }));
  c2.push(p.card({ title: 'Remote, hybrid or on-site', sub: 'As each posting states it', span: 6,
    spec: { type: 'stack', label: 'Jobs by work mode', segs: [{ label: 'Remote', value: modes.remote || 0, color: P.cat[0] }, { label: 'Hybrid', value: modes.hybrid || 0, color: P.cat[1] }, { label: 'On-site', value: modes.onsite || 0, color: P.cat[2] }, { label: 'Not stated', value: modes.unknown || 0, color: P.other }] }, empty: n ? null : empty('No jobs in view.') }));
  var lv = m.levels || {}, youB = m.you && m.you.bucket;
  c2.push(p.card({ title: 'Seniority', sub: 'How senior the roles are' + (youB ? ' - your level highlighted' : ''), span: 6,
    spec: { type: 'bars', label: 'Jobs by seniority', rows: LEVEL_ORDER.map(function(x){ var mine = youB === x[0]; return { label: x[1] + (mine ? ' (you)' : ''), value: lv[x[0]] || 0, color: mine ? P.cat[0] : P.other }; }).filter(function(r){ return r.value > 0; }), valueLabel: 'Jobs' },
    empty: n ? null : empty('No jobs in view.') }));
  c2.push(p.card({ title: 'Roles in your pool', sub: 'The role families the jobs in view belong to', span: 6,
    spec: { type: 'bars', label: 'Jobs by role', rows: m.roles.map(function(x){ return { label: x.key, value: x.n }; }), color: P.cat[2], valueLabel: 'Jobs' }, empty: n ? null : empty('No jobs in view.') }));
  c2.push(p.card({ title: 'Who’s hiring', sub: 'Employers with the most jobs in view', span: 6,
    spec: { type: 'bars', label: 'Jobs by employer', rows: (m.companies || []).map(function(x){ return { label: x.org, value: x.count }; }), color: P.cat[6], valueLabel: 'Jobs' }, empty: n ? null : empty('No jobs in view.') }));
  var emp = m.employment || {}, ET = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Internship', temporary: 'Temporary', unknown: 'Not stated' };
  c2.push(p.card({ title: 'Full-time, contract or part-time', sub: 'Employment type as posted', span: 6,
    spec: { type: 'bars', label: 'Jobs by employment type', rows: Object.keys(ET).map(function(k){ return { label: ET[k], value: emp[k] || 0, color: k === 'unknown' ? P.other : P.cat[3] }; }).filter(function(r){ return r.value > 0; }), valueLabel: 'Jobs' }, empty: n ? null : empty('No jobs in view.') }));
  var c3 = [];
  var sal = m.salary, ss = m.salaryStrong, pr = m.prefs || {};
  var marks = []; if(isNum(pr.salaryFloor)) marks.push({ value: pr.salaryFloor, label: 'Your floor' }); if(isNum(pr.salaryTarget)) marks.push({ value: pr.salaryTarget, label: 'Your target' });
  var salRows = []; if(sal && sal.n) salRows.push(Object.assign({ label: 'All jobs in view', color: P.cat[0] }, sal)); if(ss && ss.n) salRows.push(Object.assign({ label: 'Strong fits', color: P.cat[2] }, ss));
  c3.push(p.card({ title: 'What they pay', sub: 'Yearly pay the postings state (never estimated) - the bar is the middle half, the tick the median', span: 8,
    spec: { type: 'range', label: 'Stated pay', rows: salRows, marks: marks, fmt: C.fmtMoney },
    empty: salRows.length ? null : empty('None of the jobs in view state their pay.'), foot: sal && sal.n ? C.fmtN(sal.n) + ' of ' + C.fmtN(n) + ' jobs state pay. US dollars, a year.' : '' }));
  var fr = m.freshness || {};
  c3.push(p.card({ title: 'How fresh they are', sub: 'When each was first posted', span: 4,
    spec: { type: 'bars', label: 'Jobs by posting age', rows: ['new', 'fresh', 'recent', 'aging', 'old', 'unknown'].map(function(k, i){ return { label: MD.L.freshness[k], value: fr[k] || 0, color: k === 'unknown' ? P.other : P.ord[4 - Math.min(4, i)] }; }).filter(function(r){ return r.value > 0; }), valueLabel: 'Jobs' },
    empty: n ? null : empty('No jobs in view.'), foot: 'Applying in the first days after a posting goes up gets the most replies.' }));
  var arr = m.arrivals || {}, days30 = [], labels30 = [], titles30 = [];
  for(var i = 29; i >= 0; i--){ var d0 = MD.util.addDays(MD.util.startOfDay(D.now), -i); days30.push(arr[d0] || 0); labels30.push(C.fmtDay(d0)); titles30.push(C.fmtFull(d0)); }
  c3.push(p.card({ title: 'New jobs arriving', sub: 'Jobs in view by the day they reached your pool, last 30 days', span: 8,
    spec: { type: 'columns', label: 'New jobs per day', labels: labels30, tipTitles: titles30, series: [series(days30, 'New jobs', P.cat[0])] }, empty: n ? null : empty('No jobs in view.') }));
  var gh = m.ghost || {};
  c3.push(p.card({ title: 'Is it a live opening?', sub: 'Signs a posting may not be a real, open job', span: 4,
    spec: { type: 'stack', label: 'Jobs by ghost-job risk', segs: [{ label: '✓ ' + MD.L.ghost.low, value: gh.low || 0, color: P.status.good }, { label: '! ' + MD.L.ghost.elevated, value: gh.elevated || 0, color: P.status.warning }, { label: '▲ ' + MD.L.ghost.high, value: gh.high || 0, color: P.status.serious }] },
    empty: n ? null : empty('No jobs in view.'), foot: 'Read from reposts, how long it’s been up and the posting itself.' }));
  var rt = m.routes || {}, RT = { employer: 'Employer’s hiring system', company_site: 'Company careers site', aggregator: 'Job board only', unknown: 'No link' };
  c3.push(p.card({ title: 'Where you’d apply', sub: 'Auto and the extension can apply on employers’ hiring systems; job boards and some careers sites are yours', span: 6,
    spec: { type: 'stack', label: 'Jobs by where you apply', segs: Object.keys(RT).map(function(k, i){ return { label: RT[k], value: rt[k] || 0, color: k === 'unknown' ? P.other : P.cat[i] }; }) }, empty: n ? null : empty('No jobs in view.') }));
  var src = (m.sources || []).map(function(x){ return { label: MD.L.source[x.key] || x.key, value: x.n }; });
  c3.push(p.card({ title: 'Where the listings come from', sub: 'The hiring systems and boards behind the jobs in view', span: 6,
    spec: { type: 'bars', label: 'Jobs by source', rows: src, color: P.cat[6], valueLabel: 'Jobs' }, empty: src.length ? null : empty('No jobs in view.'),
    foot: D.coverage && D.coverage.jobs ? 'Kaidostar reads ' + C.fmtN(D.coverage.jobs) + ' live jobs from ' + C.fmtN(D.coverage.employers) + ' employers’ career sites' + (isNum(D.coverage.checked_24h_pct) ? ', ' + D.coverage.checked_24h_pct + '% re-checked in the last day' : '') + '.' : '' }));
  var c4 = [];
  var hc = m.hideCounts || {}, hcRows = Object.keys(hc).map(function(k){ return { label: hideLabel(k), value: hc[k] }; }).sort(function(a, b){ return b.value - a.value; }).slice(0, 10);
  c4.push(p.card({ title: 'What your filters hide', sub: 'Jobs left out of view, by the filter that left them out (a job can be hidden by more than one)', span: 6,
    spec: { type: 'bars', label: 'Hidden jobs by filter', rows: hcRows, color: P.cat[1], valueLabel: 'Jobs' }, empty: hcRows.length ? null : empty('Your filters aren’t hiding anything.'), foot: link('dashboard.html', 'Change your filters on Job Search') }));
  var dr = {}; D.dismissReasons.forEach(function(r){ dr[r.reason] = (dr[r.reason] || 0) + 1; });
  var drRows = Object.keys(dr).map(function(k){ return { label: MD.L.dismiss[k] || k, value: dr[k] }; }).sort(function(a, b){ return b.value - a.value; });
  c4.push(p.card({ title: 'Why you passed on jobs', sub: 'The reasons you gave for “not for me” (kept in this browser)', span: 6,
    spec: { type: 'bars', label: 'Jobs you passed on, by reason', rows: drRows, color: P.cat[4], valueLabel: 'Jobs' },
    empty: drRows.length ? null : empty(D.dismissedAt.length ? 'You passed on ' + plural(D.dismissedAt.length, 'job') + ' without giving a reason here. Give one next time and Job Search learns from it.' : 'You haven’t passed on any jobs yet. When you mark one “not for me” with a reason, Job Search learns from it.'),
    foot: drRows.length ? 'Each reason teaches Job Search to rank similar jobs lower.' : '' }));
  var srch = D.search.searches || [];
  var stbl = srch.length ? '<div class="mc-tbl-wrap"><table class="mcc-tbl"><caption>Your saved searches</caption><thead><tr><th scope="col">Search</th><th scope="col">New</th><th scope="col">Matching now</th><th scope="col">Alerts</th><th scope="col">Last checked</th></tr></thead><tbody>' +
    srch.map(function(s){ return '<tr><th scope="row">' + esc(s.name || 'Saved search') + '</th><td>' + C.fmtN(s.newCount || 0) + '</td><td>' + C.fmtN(s.lastCount || 0) + '</td><td>' + (s.alert ? 'On' : 'Off') + '</td><td>' + (isNum(s.lastCheck) ? esc(ago(s.lastCheck, D.now)) : '–') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '';
  c4.push(p.card({ title: 'Saved searches', sub: 'What each of your saved searches finds now', span: 12, body: stbl, empty: srch.length ? null : empty('No saved searches. Save a search on Job Search and Kaidostar watches it for new matches.', 'dashboard.html', 'Open Job Search') }));
  p.status = demoWord(mk) + plural(n, 'job') + ' in view - ' + plural(m.strong, 'Strong fit') + ', ' + C.fmtN(m.reach) + ' within reach' + (isNum(m.median) ? ', median fit ' + Math.round(m.median) : '') + '.';
  if(demoWord(mk)) p.points.unshift('These are Kaidostar’s demo listings scored against your profile, not your own job pool - ' + link('login.html', 'sign in') + ' to see yours.');
  p.points.push(bp(m.strong, 'Strong fit') + ' and <b>' + C.fmtN(m.reach) + '</b> within reach out of ' + bp(n, 'job') + ' in view.');
  if(m.metros.length) p.points.push('Most jobs are in <b>' + esc(m.metros[0].key) + '</b> (' + m.metros[0].n + ').');
  if(sal && sal.n) p.points.push('Median stated pay: <b>' + C.fmtMoney(sal.median) + '</b> (' + plural(sal.n, 'job') + ' ' + (sal.n === 1 ? 'states' : 'state') + ' it).');
  if(hcRows.length) p.points.push('Your filters hide most for: <b>' + esc(hcRows[0].label) + '</b>.');
  p.snap.push('Jobs in view ' + n + ', hidden ' + (m.hidden || 0) + ', strong ' + m.strong + ', within reach ' + m.reach + ', median fit ' + Math.round(m.median || 0), 'Remote ' + remote + ', places: ' + m.metros.slice(0, 4).map(function(x){ return x.key + ' ' + x.n; }).join(', '),
    sal && sal.n ? 'Stated pay median ' + Math.round(sal.median) + ' (p25 ' + Math.round(sal.p25) + ', p75 ' + Math.round(sal.p75) + ', n ' + sal.n + ')' : 'No stated pay', 'Hidden by filters: ' + hcRows.slice(0, 4).map(function(r){ return r.label + ' ' + r.value; }).join(', '));
  return kp + p.section('How well they fit', '', c1) + p.section('Where and what', '', c2) + p.section('Pay, freshness and access', '', c3) + p.section('Your filters and searches', '', c4);
}

/* ======================================================================
   SKILLS - what employers ask for, and what would unlock the most
   ====================================================================== */
var HAVE = { proven: ['Proven on your resume', 4], stated: ['Listed, not shown in use', 3], adjacent: ['A close skill', 2], related: ['A related skill', 1], missing: ['Missing', 0] };
var GAP_LABEL = { missing: 'A required skill missing', partial: 'Only part of a skill', terms: 'Key terms missing', years: 'Fewer years than asked', license: 'A licence or certificate needed' };
function pageSkills(p){
  var D = p.D, P = C.P, mk = marketNeeded(p);
  if(!mk.m){ p.status = mk.status; return p.section('Skills', '', [p.card({ title: 'Skills in demand', span: 12, body: mk.wait || '<div class="mc-empty">' + mk.error + '</div>' })]); }
  var m = mk.m, foot = marketFoot(mk.meta), you = m.you || {};
  var ts = m.topSkills || [], missing = ts.filter(function(s){ return s.have === 'missing'; }), stated = ts.filter(function(s){ return s.have === 'stated'; });
  var full = m.reqCov ? m.reqCov[4] : 0, reqN = m.reqCov ? m.reqCov.reduce(function(s, x){ return s + x; }, 0) : 0;
  var kp = p.kpis([
    p.kpi({ label: 'Skills you prove', value: C.fmtN(you.proven || 0), sub: 'shown in use on your resume' }),
    p.kpi({ label: 'Skills you only list', value: C.fmtN(you.stated || 0), sub: 'named, not yet shown in use' }),
    p.kpi({ label: 'In-demand skills you miss', value: C.fmtN(missing.length), sub: 'of the top ' + ts.length + ' asked for', tone: missing.length ? 'warn' : '' }),
    p.kpi({ label: 'Jobs where you meet every requirement', value: C.fmtN(full), sub: reqN ? pct(full, reqN) + '% of jobs that list requirements' : '' }),
    p.kpi({ label: 'Experience', value: isNum(you.years) ? you.years + (you.years === 1 ? ' year' : ' years') : '–', sub: you.levelLabel || '' })
  ]);
  var c1 = [];
  var ramp = { 4: P.ord[4], 3: P.ord[3], 2: P.ord[2], 1: P.ord[1], 0: P.cat[1] };
  c1.push(p.card({ title: 'What employers ask for', sub: 'The skills named most in the jobs in view - and how you have each', span: 7,
    spec: { type: 'bars', label: 'Most-asked skills', rows: ts.map(function(s){ var h = HAVE[s.have] || HAVE.missing; return { label: s.name, value: s.pct, text: s.pct + '% of jobs', color: ramp[h[1]], sub: 'You: ' + h[0] + ' - required in ' + s.required + ' jobs' }; }), max: 100, valueLabel: 'Share of jobs',
      legend: ['proven', 'stated', 'adjacent', 'related', 'missing'].filter(function(k){ return ts.some(function(s){ return (s.have || 'missing') === k; }); }).map(function(k){ return { c: ramp[HAVE[k][1]], l: HAVE[k][0], shape: 'rect' }; }) },
    empty: ts.length ? null : empty('No jobs in view to read skills from.'), foot: 'Hover a bar for where each one is required.' }));
  var un = m.unlocks || [];
  c1.push(p.card({ title: 'Skills that would lift your fit most', sub: 'If you proved one more skill: how much your target jobs’ fit would rise, and how many would become Strong - exact re-scores, not guesses', span: 5,
    spec: { type: 'bars', label: 'Average fit gain per skill', rows: un.map(function(u){ return { label: u.name, value: u.avgGain, text: '+' + u.avgGain + (u.toStrong ? ', ' + u.toStrong + ' to Strong' : ''), color: P.cat[2], sub: 'across ' + u.jobs + ' jobs - you: ' + ((HAVE[u.have] || HAVE.missing)[0]).toLowerCase() }; }), valueLabel: 'Average fit gain' },
    empty: un.length ? null : empty('No single skill would lift your target jobs to Strong right now - your gaps are elsewhere (experience, level) or you already cover what they ask.'),
    foot: 'Judged on ' + plural(m.aimed || 0, 'job') + ' in your target roles. Prove one on Roadmap: ' + link('roadmap.html', 'open your plan') }));
  var c2 = [];
  var rc = m.reqCov || [0, 0, 0, 0, 0];
  c2.push(p.card({ title: 'How much of each job you cover', sub: 'Jobs in view by the share of their required skills you have', span: 6,
    spec: { type: 'hist', label: 'Jobs by required-skill coverage', labels: ['Under 25%', '25-49%', '50-74%', '75-99%', 'All of them'], values: rc, seriesLabel: 'Jobs', colors: P.ord.slice(0, 5) },
    empty: reqN ? null : empty('None of the jobs in view list required skills clearly enough to count.'), foot: foot }));
  var gp = m.gaps || {}, gRows = Object.keys(gp).map(function(k){ return { label: GAP_LABEL[k] || k, value: gp[k] }; }).sort(function(a, b){ return b.value - a.value; });
  c2.push(p.card({ title: 'What’s holding the fit back', sub: 'The gaps Proof Match found across the jobs in view (a job can have several)', span: 6,
    spec: { type: 'bars', label: 'Gaps by kind', rows: gRows, color: P.cat[1], valueLabel: 'Jobs' }, empty: gRows.length ? null : empty('No gaps found in the jobs in view.') }));
  var yrs = m.years || {}, yk = ['0-1', '2-3', '4-5', '6+', 'Not stated'];
  var mine = isNum(you.years) ? (you.years <= 1 ? '0-1' : you.years <= 3 ? '2-3' : you.years <= 5 ? '4-5' : '6+') : null;
  c2.push(p.card({ title: 'Experience they ask for', sub: 'Minimum years of experience in the postings' + (mine ? ' - your bracket highlighted' : ''), span: 6,
    spec: { type: 'columns', label: 'Jobs by years asked', labels: yk.map(function(k){ return k === 'Not stated' ? k : k + ' years'; }), series: [series(yk.map(function(k){ return yrs[k] || 0; }), 'Jobs', P.cat[0])], highlight: mine ? yk.indexOf(mine) : null },
    empty: m.n ? null : empty('No jobs in view.') }));
  c2.push(p.card({ title: 'Prove what you already list', sub: 'In-demand skills on your resume as words, not yet shown in a line about your work', span: 6,
    spec: { type: 'bars', label: 'Listed but unproven skills', rows: stated.map(function(s){ return { label: s.name, value: s.pct, text: s.pct + '% of jobs', color: P.ord[3] }; }), max: 100, valueLabel: 'Share of jobs' },
    empty: stated.length ? null : empty(ts.length ? 'Every in-demand skill you list is already shown in use. Nice.' : 'No jobs in view.'), foot: stated.length ? 'A bullet showing each one in use turns “listed” into “proven” - ' + link('workshop.html', 'edit your resume') : '' }));
  var h = Object.keys(HAVE).map(function(k){ return { k: k, n: ts.filter(function(s){ return s.have === k; }).length }; });
  c2.push(p.card({ title: 'Your coverage of the top skills', sub: 'The top ' + ts.length + ' skills asked for, by how you have them', span: 12,
    spec: { type: 'stack', label: 'Top skills by your coverage', segs: h.map(function(x){ return { label: HAVE[x.k][0], value: x.n, color: ramp[HAVE[x.k][1]] }; }) }, empty: ts.length ? null : empty('No jobs in view.') }));
  if(demoWord(mk)) p.points.unshift('Skills in demand are read from Kaidostar’s demo listings until you ' + link('login.html', 'sign in') + '.');
  p.status = demoWord(mk) + (you.proven || 0) + ' skills proven, ' + (you.stated || 0) + ' only listed. ' + (un.length ? 'Proving ' + un[0].name + ' would raise your fit by ' + un[0].avgGain + ' on average' + (un[0].toStrong ? ' and lift ' + plural(un[0].toStrong, 'job') + ' to Strong.' : '.') : '');
  if(un.length) p.points.push('Biggest lift: <b>' + esc(un[0].name) + '</b> - +' + un[0].avgGain + ' fit on average' + (un[0].toStrong ? ', ' + plural(un[0].toStrong, 'job') + ' to Strong' : '') + '.');
  if(missing.length) p.points.push('In demand and missing: <b>' + missing.slice(0, 3).map(function(s){ return esc(s.name); }).join(', ') + '</b>.');
  if(stated.length) p.points.push('Listed but unproven: <b>' + stated.slice(0, 3).map(function(s){ return esc(s.name); }).join(', ') + '</b>.');
  p.snap.push('Proven skills ' + (you.proven || 0) + ', listed-only ' + (you.stated || 0), 'Top skills asked: ' + ts.slice(0, 8).map(function(s){ return s.name + ' ' + s.pct + '% (you: ' + s.have + ')'; }).join(', '),
    'Unlocks: ' + un.slice(0, 5).map(function(u){ return u.name + ' -> ' + u.toStrong + ' strong'; }).join(', '), 'Jobs meeting all requirements: ' + full);
  return kp + p.section('In demand', '', c1) + p.section('Coverage and gaps', '', c2);
}

/* ======================================================================
   PLAN - the Roadmap plan, progress over time
   ====================================================================== */
function pagePlan(p){
  var D = p.D, P = C.P, now = D.now, pl = D.plan;
  if(!S.names) loadNames();
  if(!pl || !pl.items.length){
    p.status = 'No plan yet.';
    return p.section('Your plan', '', [p.card({ title: 'No plan yet', span: 12, body: '<div class="mc-empty"><p>Roadmap builds a plan from the jobs you’re aiming at: the skills to learn and prove, in the order that unlocks the most. Once you save one, this view tracks it - steps done, what’s overdue, and how many jobs come within reach as you go.</p>' +
      (tierHas('roadmap') ? '<a class="mc-btn" href="roadmap.html">Build your plan</a>' : '<a class="mc-btn" href="plan.html">Roadmap is part of Pro</a>') + '</div>' })]);
  }
  var items = pl.items, states = items.map(function(i){ return MD.stepState(i, now); });
  function cnt(s){ return states.filter(function(x){ return x === s; }).length; }
  var done = cnt('done') + cnt('verified'), total = items.length - cnt('skipped');
  var hist = pl.history || [], first = hist[0], last = hist[hist.length - 1];
  var kp = p.kpis([
    p.kpi({ label: 'Steps done', value: done + ' / ' + total, sub: total ? pct(done, total) + '% of the plan' : '' }),
    p.kpi({ label: 'Proven on your resume', value: C.fmtN(cnt('verified')), sub: 'steps the resume now shows' }),
    p.kpi({ label: 'Past due', value: C.fmtN(cnt('overdue')), tone: cnt('overdue') ? 'warn' : '' }),
    p.kpi({ label: 'In progress', value: C.fmtN(cnt('doing')) }),
    p.kpi({ label: 'Jobs within reach', value: last ? C.fmtN(last.reach) : '–', delta: first && last && hist.length > 1 ? { dir: last.reach > first.reach ? 'up' : last.reach < first.reach ? 'down' : 'flat', text: (last.reach - first.reach >= 0 ? '+' : '') + (last.reach - first.reach) + ' since ' + C.fmtDay(first.at), good: true } : null }),
    p.kpi({ label: 'Hours a week', value: isNum(pl.hoursPerWeek) ? String(pl.hoursPerWeek) : '–', sub: 'your plan’s budget' })
  ]);
  var c1 = [];
  if(hist.length > 1){
    c1.push(p.card({ title: 'Jobs coming within reach', sub: 'Each time you opened Roadmap: jobs that are a Strong fit, and jobs within reach', span: 6,
      spec: { type: 'line', label: 'Strong fits and jobs within reach over time', labels: hist.map(function(h){ return C.fmtDay(h.at); }), tipTitles: hist.map(function(h){ return C.fmtFull(h.at); }), times: hist.map(function(h){ return h.at; }), markers: hist.length < 16 ? 'all' : 'last', endLabels: true,
        series: [series(hist.map(function(h){ return h.reach; }), 'Within reach', P.cat[2]), series(hist.map(function(h){ return h.strong; }), 'Strong (70+)', P.cat[0])] } }));
    c1.push(p.card({ title: 'Your median fit', sub: 'The middle fit across the jobs your plan targets', span: 6,
      spec: { type: 'line', label: 'Median fit over time', area: true, labels: hist.map(function(h){ return C.fmtDay(h.at); }), tipTitles: hist.map(function(h){ return C.fmtFull(h.at); }), times: hist.map(function(h){ return h.at; }), markers: hist.length < 16 ? 'all' : 'last', yMin: 0, yMax: 100,
        series: [series(hist.map(function(h){ return h.median; }), 'Median fit', P.cat[0])], refs: [{ y: 70, label: 'Strong' }] } }));
  } else c1.push(p.card({ title: 'Jobs coming within reach', span: 12, empty: empty('Roadmap records how many jobs are within reach each time you open it. Open it again after finishing a step to start the line.', 'roadmap.html', 'Open Roadmap') }));
  var c2 = [];
  var doneTimes = items.map(function(i){ return i.verifiedAt || i.doneAt; }).filter(isNum).sort(function(a, b){ return a - b; });
  if(doneTimes.length){
    var start = isNum(pl.startAt) ? Math.min(pl.startAt, doneTimes[0]) : doneTimes[0];
    var rgx = { from: MD.util.startOfDay(start), to: now }, span = (now - start) / DAY;
    rgx.gran = span <= 45 ? 'day' : span <= 200 ? 'week' : 'month';
    var bx = MD.buckets(rgx), per = MD.countIn(doneTimes, bx), acc = 0, cum = per.map(function(v){ acc += v; return acc; });
    c2.push(p.card({ title: 'Steps done over time', sub: 'Your plan filling in, against the steps it has', span: 8,
      spec: { type: 'line', label: 'Cumulative steps done', area: true, labels: bx.map(function(b){ return MD.bucketLabel(b, rgx.gran); }), tipTitles: bx.map(function(b){ return MD.bucketTitle(b, rgx.gran); }), series: [series(cum, 'Steps done', P.cat[2])], refs: [{ y: total, label: total + ' steps in the plan' }], yMin: 0, yMax: Math.max(total, 1) } }));
  } else c2.push(p.card({ title: 'Steps done over time', span: 8, empty: empty('No steps marked done yet.') }));
  c2.push(p.card({ title: 'Where each step stands', sub: 'Every step in your plan', span: 4,
    spec: { type: 'stack', label: 'Plan steps by state', segs: [{ label: '✓ Proven', value: cnt('verified'), color: P.ord[4] }, { label: 'Done', value: cnt('done'), color: P.ord[3] }, { label: 'In progress', value: cnt('doing'), color: P.cat[0] }, { label: '! Past due', value: cnt('overdue'), color: P.status.warning }, { label: 'Not started', value: cnt('todo'), color: P.other }, { label: 'Skipped', value: cnt('skipped'), color: '#4a4e7a' }] } }));
  var kinds = {};
  items.forEach(function(i, k){ var kd = i.kind || 'skill'; var e = kinds[kd] || (kinds[kd] = { n: 0, d: 0 }); e.n++; if(states[k] === 'done' || states[k] === 'verified') e.d++; });
  c2.push(p.card({ title: 'What the plan is made of', sub: 'Steps by kind, and how many of each are done', span: 6,
    spec: { type: 'bars', label: 'Plan steps by kind', rows: Object.keys(kinds).map(function(k){ return { label: MD.L.kind[k] || k, segs: [{ label: 'Done', value: kinds[k].d, color: P.cat[2] }, { label: 'To do', value: kinds[k].n - kinds[k].d, color: P.other }] }; }), segFmt: C.fmtN } }));
  var open = items.filter(function(i, k){ return isNum(i.dueAt) && states[k] !== 'done' && states[k] !== 'verified' && states[k] !== 'skipped'; });
  var lo = Math.min.apply(null, open.map(function(i){ return i.dueAt; }).concat([now])), hi = Math.max.apply(null, open.map(function(i){ return i.dueAt; }).concat([now + 14 * DAY]));
  c2.push(p.card({ title: 'Due dates ahead', sub: 'Open steps by when they’re due (past due ones sit left of today)', span: 6,
    spec: { type: 'timeline', label: 'Open plan steps by due date', from: lo - 2 * DAY, to: hi + 2 * DAY, now: now, lanes: [{ key: 'over', label: 'Past due', color: P.status.warning }, { key: 'next', label: 'Coming up', color: P.cat[0] }],
      items: open.map(function(i){ return { at: i.dueAt, lane: i.dueAt < now ? 'over' : 'next', label: MD.stepTitle(i), sub: MD.L.kind[i.kind] || '' }; }) },
    empty: open.length ? null : empty('No open steps with a due date.') }));
  var list = '<ul class="mc-steps">' + items.map(function(i, k){ var s = states[k]; return '<li class="st-' + s + '"><span class="mc-chip ' + (s === 'overdue' ? 'warn' : s === 'verified' || s === 'done' ? 'good' : '') + '">' + ({ verified: '✓ Proven', done: '✓ Done', doing: 'In progress', overdue: '! Past due', todo: 'To do', skipped: 'Skipped' }[s]) + '</span><span>' + esc(MD.stepTitle(i)) + '</span>' + (isNum(i.dueAt) && s !== 'done' && s !== 'verified' ? '<span class="mc-dim">due ' + esc(C.fmtDay(i.dueAt)) + '</span>' : '') + '</li>'; }).join('') + '</ul>';
  c2.push(p.card({ title: 'Every step', sub: 'Your plan in order', span: 12, body: list, foot: link('roadmap.html', 'Work on it in Roadmap') }));
  p.status = done + ' of ' + plural(total, 'step') + ' done' + (cnt('overdue') ? ', ' + cnt('overdue') + ' past due' : '') + (last ? '. ' + plural(last.reach, 'job') + ' within reach.' : '.');
  p.points.push('<b>' + done + ' of ' + total + '</b> ' + pw(total, 'step') + ' done; <b>' + cnt('verified') + '</b> proven on your resume.');
  if(cnt('overdue')) p.points.push('<b>' + cnt('overdue') + '</b> step' + (cnt('overdue') === 1 ? ' is' : 's are') + ' past due.');
  if(first && last && hist.length > 1) p.points.push('Jobs within reach went from <b>' + first.reach + '</b> to <b>' + last.reach + '</b>.');
  p.snap.push('Plan steps ' + total + ', done ' + done + ', proven ' + cnt('verified') + ', in progress ' + cnt('doing') + ', past due ' + cnt('overdue'), last ? 'Latest readiness: ' + last.strong + ' strong, ' + last.reach + ' within reach, median fit ' + last.median : 'No readiness history',
    first ? 'First readiness: ' + first.strong + ' strong, ' + first.reach + ' within reach' : '', 'Hours per week ' + (pl.hoursPerWeek || 'n/a'));
  return kp + p.section('Getting closer', '', c1) + p.section('The plan', '', c2);
}

/* ======================================================================
   INTERVIEWS - practice scores over time, delivery, stories, real rounds
   ====================================================================== */
function interviewNeeded(){
  if(S.interviewState === 'idle'){
    S.interviewState = 'loading';
    var D0 = S.D;   // (the example can be switched on or off while this loads: a result only lands on the data that asked for it)
    MD.interview(D0).then(function(r){ if(S.D !== D0) return; S.interview = r; S.interviewState = 'ready'; rerender('interviews'); },
      function(){ if(S.D !== D0) return; S.interview = { engine: false }; S.interviewState = 'ready'; rerender('interviews'); });
  }
  return S.interview;
}
function avgDims(list){
  var out = {};
  list.forEach(function(s){ Object.keys(s.dims || {}).forEach(function(k){ if(isNum(s.dims[k])){ (out[k] = out[k] || []).push(k === 'relevance' && s.source !== 'ai' ? s.dims[k] * 5 / 4 : s.dims[k]); } }); });
  Object.keys(out).forEach(function(k){ out[k] = MD.util.mean(out[k]); });
  return out;
}
function pageInterviews(p){
  var D = p.D, rg = p.rg, P = C.P, now = D.now, bk = bucketsFor(rg), IV = interviewNeeded();
  var all = D.sessions, inR = all.filter(function(s){ return MD.inRange(s._at, rg); });
  var scores = all.map(function(s){ return s.verdict.overall; });
  var lastS = all[all.length - 1], best = all.length ? Math.max.apply(null, scores) : null;
  var half = Math.max(1, Math.min(3, Math.floor(all.length / 2)));
  // the first and the latest sessions, never overlapping (with two sessions: one against the other)
  var firstAvg = all.length >= 2 ? MD.util.mean(scores.slice(0, half)) : null, recentAvg = all.length ? MD.util.mean(scores.slice(-(all.length >= 2 ? half : 1))) : null;
  var realIv = D.apps.filter(function(a){ return a.reachedInterview; }).length;
  var cov = IV && IV.coverage;
  var kp = p.kpis([
    p.kpi({ label: 'Practice interviews', value: C.fmtN(inR.length), sub: 'in ' + rangeWords() + ' - ' + all.length + ' in all', spark: { values: MD.countIn(inR.map(function(s){ return s._at; }), bk.b), titles: bk.titles, unit: 'sessions' } }),
    p.kpi({ label: 'Latest score', value: lastS ? String(Math.round(lastS.verdict.overall)) : '–', sub: lastS ? (MD.L.decision[lastS.verdict.decision] || '') + ' - ' + ago(lastS._at, now) : 'no judged session yet' }),
    p.kpi({ label: 'Recent average', value: isNum(recentAvg) ? String(Math.round(recentAvg)) : '–', delta: isNum(firstAvg) && isNum(recentAvg) && all.length >= 2 ? { dir: recentAvg > firstAvg ? 'up' : recentAvg < firstAvg ? 'down' : 'flat', text: (recentAvg - firstAvg >= 0 ? '+' : '') + Math.round(recentAvg - firstAvg) + ' since your first sessions', good: true } : null }),
    p.kpi({ label: 'Best score', value: isNum(best) ? String(Math.round(best)) : '–' }),
    p.kpi({ label: 'Real interviews', value: C.fmtN(realIv), sub: plural(D.debriefs.length, 'debrief') + ' logged' }),
    p.kpi({ label: 'Stories for core questions', value: cov ? cov.covered + ' / ' + cov.total : C.fmtN(D.stories.length), sub: cov ? 'core competencies covered' : 'stories in your bank' })
  ]);
  var c1 = [];
  if(all.length){
    var decColor = function(s){ var d = s.verdict.decision || ''; return /strong_hire|^hire/.test(d) ? P.ord[4] : d === 'lean_hire' ? P.ord[3] : d === 'lean_no_hire' ? P.ord[1] : P.other; };
    c1.push(p.card({ title: 'Your practice scores', sub: 'Every judged practice interview, oldest to newest (out of 100)', span: 8,
      spec: { type: 'line', label: 'Practice interview scores', labels: all.map(function(s){ return C.fmtDay(s._at); }), tipTitles: all.map(function(s){ return C.fmtFull(s._at) + ' - ' + (MD.L.difficulty[s.difficulty] || '') + (s.company ? ' - ' + s.company : ''); }),
        tipNotes: all.map(function(s){ return MD.L.decision[s.verdict.decision] || ''; }), times: all.map(function(s){ return s._at; }), markers: 'all', yMin: 0, yMax: 100,
        series: [{ label: 'Score', values: scores, color: P.cat[0], pointColors: all.map(decColor) }], refs: [{ y: 72, label: 'Hire' }, { y: 60, label: 'Lean hire' }] },
      foot: 'The verdict bands are the Interview Prep judge’s (tougher settings shift them up). ' + link('interview-prep.html', 'Practise now') }));
  } else c1.push(p.card({ title: 'Your practice scores', span: 8, empty: empty('No judged practice interviews yet. The Hot Seat in Interview Prep runs a mock interview and scores every answer - your trend starts here.', 'interview-prep.html', 'Start a practice interview') }));
  var diff = { fair: [], tough: [], brutal: [] };
  bk.b.forEach(function(b){ Object.keys(diff).forEach(function(k){ diff[k].push(inR.filter(function(s){ return (s.difficulty || 'fair') === k && s._at >= b.start && s._at < b.end; }).length); }); });
  c1.push(p.card({ title: 'How often you practise', sub: 'Practice interviews per ' + rg.gran + ', by difficulty', span: 4,
    spec: { type: 'columns', stacked: true, label: 'Practice sessions by difficulty', labels: bk.labels, tipTitles: bk.titles, series: [series(diff.fair, 'Fair', P.ord[1]), series(diff.tough, 'Tough', P.ord[3]), series(diff.brutal, 'Brutal', P.ord[4])] },
    empty: inR.length ? null : empty('No practice in ' + rangeWords() + '.') }));
  var c2 = [];
  if(all.length >= 2){
    var n3 = Math.min(3, Math.floor(all.length / 2)) || 1, f3 = avgDims(all.slice(0, n3)), l3 = avgDims(all.slice(-n3));
    var dimKeys = ['structure', 'specificity', 'ownership', 'impact', 'relevance', 'concision', 'delivery'].filter(function(k){ return isNum(f3[k]) || isNum(l3[k]); });
    c2.push(p.card({ title: 'Where you’ve improved', sub: 'Each answer skill, your first ' + (n3 === 1 ? 'session' : n3 + ' sessions') + ' against your latest (out of 5)', span: 6,
      spec: { type: 'dumbbell', label: 'Answer skills, first vs latest', min: 1, max: 5, aLabel: 'First ' + (n3 === 1 ? 'session' : n3 + ' sessions'), bLabel: 'Latest ' + (n3 === 1 ? 'session' : n3 + ' sessions'), rows: dimKeys.map(function(k){ return { label: MD.L.dim[k], a: f3[k], b: l3[k] }; }), fmt: function(v){ return (Math.round(v * 10) / 10).toFixed(1); } },
      foot: 'Built-in judging scores relevance out of 4; it’s rescaled to 5 here so sessions compare.' }));
  } else c2.push(p.card({ title: 'Where you’ve improved', span: 6, empty: empty('After two judged sessions this compares your first answers with your latest, skill by skill.') }));
  var qt = {};
  inR.concat(inR.length ? [] : all).forEach(function(s){ (s.turns || []).forEach(function(t){ if(t.follow || t.skipped || t.not_reached || !t.judge || t.judge.unscored || !isNum(t.judge.overall)) return; var k = t.qtype || 'other'; (qt[k] = qt[k] || []).push(t.judge.overall); }); });
  var qRows = Object.keys(qt).map(function(k){ return { label: MD.L.qtype[k] || k, value: Math.round(MD.util.mean(qt[k]) * 10) / 10, sub: plural(qt[k].length, 'answer'), muted: qt[k].length < 2 }; }).sort(function(a, b){ return b.value - a.value; });
  c2.push(p.card({ title: 'By kind of question', sub: 'Your average answer score for each kind of question (out of 10)', span: 6,
    spec: { type: 'bars', label: 'Average answer score by question type', rows: qRows, max: 10, fmt: function(v){ return (Math.round(v * 10) / 10).toFixed(1); }, color: P.cat[0], valueLabel: 'Average' },
    empty: qRows.length ? null : empty('No scored answers yet.'), foot: inR.length ? 'From ' + rangeWords() + '.' : 'From all your sessions.' }));
  var spoken = all.filter(function(s){ return s.delivery && isNum(s.delivery.wpm); });
  if(spoken.length){
    c2.push(p.card({ title: 'Your speaking pace', sub: 'Words per minute in spoken sessions - the band is a comfortable conversational pace', span: 6,
      spec: { type: 'line', label: 'Speaking pace', labels: spoken.map(function(s){ return C.fmtDay(s._at); }), tipTitles: spoken.map(function(s){ return C.fmtFull(s._at); }), times: spoken.map(function(s){ return s._at; }), markers: 'all',
        series: [series(spoken.map(function(s){ return Math.round(s.delivery.wpm); }), 'Words per minute', P.cat[2])], band: { lo: 105, hi: 175, label: 'Comfortable pace' },
        yMin: Math.min(60, Math.floor(Math.min.apply(null, spoken.map(function(s){ return s.delivery.wpm; })) / 20) * 20), yMax: Math.max(220, Math.ceil(Math.max.apply(null, spoken.map(function(s){ return s.delivery.wpm; })) / 20) * 20) } }));
    var fp = spoken.filter(function(s){ return isNum(s.delivery.fillersPerMin); });
    c2.push(p.card({ title: 'Filler words', sub: '“Um”, “like”, “you know” per minute in spoken sessions', span: 6,
      spec: { type: 'line', label: 'Filler words per minute', area: true, labels: fp.map(function(s){ return C.fmtDay(s._at); }), tipTitles: fp.map(function(s){ return C.fmtFull(s._at); }), times: fp.map(function(s){ return s._at; }), markers: 'all',
        series: [series(fp.map(function(s){ return s.delivery.fillersPerMin; }), 'Fillers a minute', P.cat[1])], yMin: 0, tipFmt: function(v){ return (Math.round(v * 10) / 10).toFixed(1); }, yFmt: function(v){ return String(v); } },
      empty: fp.length ? null : empty('No filler counts yet.') }));
  } else c2.push(p.card({ title: 'Your speaking pace', span: 12, empty: empty('Practise out loud in the Hot Seat (voice mode) and your pace and filler words are measured - never guessed.', 'interview-prep.html', 'Practise out loud') }));
  var c3 = [];
  var rec = IV && IV.progress && IV.progress.recurring ? IV.progress.recurring : [];
  var ivFail = IV && !IV.engine;
  if(!IV) c3.push(p.card({ title: 'What keeps coming up', span: 6, body: waiting('Reading your sessions…') }));
  else if(ivFail) c3.push(p.card({ title: 'What keeps coming up', span: 6, body: engineFail('Interview Prep’s reader') }));
  else c3.push(p.card({ title: 'What keeps coming up', sub: 'The issues the judge flagged most across your sessions', span: 6,
    spec: { type: 'bars', label: 'Most frequent answer issues', rows: rec.map(function(r){ return { label: r.text || r.key, value: r.count }; }), color: P.cat[1], valueLabel: 'Sessions', labelShare: 0.6 },
    empty: rec.length ? null : empty(all.length ? 'No issue has come up more than once. Keep going.' : 'No sessions yet.') }));
  if(cov && cov.rows){
    c3.push(p.card({ title: 'Stories for the core questions', sub: 'The eight competencies behavioural questions test, and how many of your stories show each', span: 6,
      spec: { type: 'bars', label: 'Stories per competency', rows: cov.rows.map(function(r){ return { label: r.label, value: r.stories.length, text: r.stories.length ? plural(r.stories.length, 'story', 'stories') : 'none yet', color: r.stories.length ? P.cat[2] : P.cat[1] }; }), valueLabel: 'Stories' },
      foot: cov.gaps.length ? 'No story yet for ' + cov.gaps.length + ' of them - ' + link('interview-prep.html', 'forge one') : 'Every core competency has at least one story.' }));
  } else if(ivFail) c3.push(p.card({ title: 'Stories for the core questions', span: 6, body: engineFail('Interview Prep’s reader') }));
  else c3.push(p.card({ title: 'Stories for the core questions', span: 6, body: IV ? '<div class="mc-empty"><p>' + (D.stories.length ? plural(D.stories.length, 'story', 'stories') + ' in your bank.' : 'No stories yet.') + '</p><a class="mc-btn ghost" href="interview-prep.html">Open your story bank</a></div>' : waiting('Reading your stories…') }));
  var stages = {};
  D.debriefs.forEach(function(d){ var k = d.stage || 'Other'; stages[k] = (stages[k] || 0) + 1; });
  c3.push(p.card({ title: 'Your real interviews', sub: 'Rounds you debriefed in Interview Prep, by stage', span: 6,
    spec: { type: 'bars', label: 'Real interview rounds by stage', rows: Object.keys(stages).map(function(k){ return { label: k, value: stages[k] }; }), color: P.cat[6], valueLabel: 'Rounds' },
    empty: D.debriefs.length ? null : empty('After a real interview, a two-minute debrief in Interview Prep keeps what they asked - and your next round gets easier.', 'interview-prep.html', 'Write a debrief') }));
  var cats = {};
  D.answers.forEach(function(a){ if(a.answered === false || (a.answer === '' && a.answered == null)) return; var k = a.category || 'other'; cats[k] = (cats[k] || 0) + 1; });
  c3.push(p.card({ title: 'Your answer bank', sub: 'Answers you’ve written in advance, by kind of question', span: 6,
    spec: { type: 'bars', label: 'Prepared answers by category', rows: Object.keys(cats).map(function(k){ return { label: MD.L.qtype[k] || k, value: cats[k] }; }).sort(function(a, b){ return b.value - a.value; }), color: P.cat[3], valueLabel: 'Answers' },
    empty: Object.keys(cats).length ? null : empty('No prepared answers yet.'), foot: plural(D.asks, 'question') + ' ready to ask them' + (D.tmays ? '; “Tell me about yourself” prepared.' : '.') }));
  p.status = all.length ? plural(all.length, 'practice interview') + (isNum(recentAvg) ? ' - recent average ' + Math.round(recentAvg) : '') + (isNum(firstAvg) && all.length >= 2 ? ' (' + (recentAvg - firstAvg >= 0 ? '+' : '') + Math.round(recentAvg - firstAvg) + ' since you started)' : '') + '.' : 'No practice interviews yet.';
  if(all.length) p.points.push('Recent average <b>' + Math.round(recentAvg) + '</b>' + (isNum(firstAvg) ? ', from <b>' + Math.round(firstAvg) + '</b> at the start' : '') + '.');
  if(rec.length) p.points.push('Most frequent issue: <b>' + esc(String(rec[0].text || rec[0].key).replace(/[.\s]+$/, '')) + '</b>.');
  if(cov && cov.gaps.length) p.points.push(bp(cov.gaps.length, 'core competency', 'core competencies') + ' ' + (cov.gaps.length === 1 ? 'has' : 'have') + ' no story yet.');
  if(realIv) p.points.push(bp(realIv, 'application') + ' reached a real interview.');
  p.snap.push('Practice sessions ' + all.length + ' (in range ' + inR.length + '), recent avg ' + Math.round(recentAvg || 0) + ', first avg ' + Math.round(firstAvg || 0) + ', best ' + Math.round(best || 0), 'By question type: ' + qRows.map(function(r){ return r.label + ' ' + r.value; }).join(', '),
    'Recurring issues: ' + rec.map(function(r){ return (r.text || r.key) + ' x' + r.count; }).join(', '), cov ? 'Story coverage ' + cov.covered + '/' + cov.total : 'Stories ' + D.stories.length, 'Real interviews ' + realIv + ', debriefs ' + D.debriefs.length);
  return kp + p.section('Practice', '', c1) + p.section('How your answers are changing', '', c2) + p.section('Stories and real rounds', '', c3);
}

/* ======================================================================
   MATERIALS - resume, versions, letters, network
   ====================================================================== */
function resumeNeeded(){
  if(S.resumeState === 'idle'){
    S.resumeState = 'loading';
    var D0 = S.D;
    MD.resume(D0).then(function(r){ if(S.D !== D0) return; S.resume = r; S.resumeState = 'ready'; rerender('materials'); },
      function(){ if(S.D !== D0) return; S.resume = { engine: false }; S.resumeState = 'ready'; rerender('materials'); });
  }
  return S.resume;
}
function pageMaterials(p){
  var D = p.D, rg = p.rg, P = C.P, now = D.now, R = resumeNeeded();
  var sc = R && R.score, cb = R && R.callbacks;
  var letters = D.apps.filter(function(a){ return a.isSent && (a.hasDraft || (a.pkg && a.pkg.cover)); }).length;
  var tailored = D.apps.filter(function(a){ return a.isSent && a.pkg && (a.pkg.reordered || a.pkg.resume === 'version'); }).length;
  var kp = p.kpis([
    p.kpi({ label: 'Resume score', value: sc ? String(Math.round(sc.total)) : '–', sub: sc ? 'grade ' + sc.grade + ' - ' + plural(sc.bulletCount || 0, 'bullet') : (R ? (R.engine === false ? 'Resume Studio didn’t load' : 'add your experience to score it') : 'reading…') }),
    p.kpi({ label: 'Resume versions', value: C.fmtN(D.versions.length), sub: D.versions.filter(function(v){ return v.source === 'tailored'; }).length + ' tailored to a job' }),
    p.kpi({ label: 'Sent with a cover letter', value: C.fmtN(letters), sub: 'of ' + plural(D.apps.filter(function(a){ return a.isSent; }).length, 'sent application') }),
    p.kpi({ label: 'Resume matched to the job', value: C.fmtN(tailored), sub: 'by Auto, from your own versions' }),
    p.kpi({ label: 'Contacts', value: C.fmtN(D.contacts.length), sub: plural(D.contacts.filter(function(c){ var f = MD.util.ms(c.followup); return isNum(f) && f <= now; }).length, 'follow-up') + ' due' }),
    p.kpi({ label: 'Achievements logged', value: C.fmtN(D.counts.achievements), sub: plural(D.counts.references, 'reference') })
  ]);
  var c1 = [];
  var rFail = R && !R.engine;
  if(!R) c1.push(p.card({ title: 'Your resume, scored', span: 6, body: waiting('Scoring your resume…') }));
  else if(rFail) c1.push(p.card({ title: 'Your resume, scored', span: 6, body: engineFail('Resume Studio') }));
  else if(sc && sc.dimensions) c1.push(p.card({ title: 'Your resume, scored', sub: 'Resume Studio’s six checks - the same score it shows you', span: 6,
    spec: { type: 'meters', label: 'Resume score by check', rows: sc.dimensions.map(function(d){ return { label: d.label, value: d.score, max: d.max, color: d.score / d.max >= 0.75 ? P.ord[4] : d.score / d.max >= 0.5 ? P.ord[3] : P.cat[1] }; }) },
    foot: (sc.topFixes && sc.topFixes.length && sc.topFixes[0].issue ? 'Top fix: ' + esc(sc.topFixes[0].issue) + (sc.topFixes[0].text ? ' - “' + esc(C.fit(sc.topFixes[0].text, 260, 11.5, 500)) + '”' : '') + '. ' : '') + link('workshop.html', 'Open Resume Studio') }));
  else c1.push(p.card({ title: 'Your resume, scored', span: 6, empty: empty('Add your experience (jobs, projects, education) and Resume Studio scores it on impact, clarity, ATS-readiness, keywords, consistency and length.', 'workshop.html', 'Add your experience') }));
  var rows = cb && cb.rows ? cb.rows.filter(function(r){ return r.sent > 0; }) : [];
  if(!R) c1.push(p.card({ title: 'Which resume gets interviews', span: 6, body: waiting('Reading your versions…') }));
  else if(rFail) c1.push(p.card({ title: 'Which resume gets interviews', span: 6, body: engineFail('Resume Studio') }));
  else c1.push(p.card({ title: 'Which resume gets interviews', sub: 'Interview rate for each saved version, from the applications you tagged it to', span: 6,
    spec: { type: 'bars', label: 'Interview rate by resume version', rows: rows.map(function(r){ var w = MD.util.wilson(r.positive, r.sent), ok = r.sent >= MD.ENOUGH;
      return ok ? { label: r.name || 'A version', value: w.p, lo: w.lo, hi: w.hi, text: Math.round(w.p) + '% (' + r.positive + ' of ' + r.sent + ')' } : { label: r.name || 'A version', value: 0, text: r.positive + ' of ' + r.sent + ' - too few to call', muted: true, sub: MD.ENOUGH + '+ applications needed for a rate' }; }), max: 100, fmt: fmtPct, valueLabel: 'Interview rate', rangeLabel: 'Likely range' },
    empty: rows.length ? null : empty(D.versions.length ? 'None of your versions is tagged to an application yet. Tag which version went where in Resume Studio and this compares them.' : 'Save a resume version in Resume Studio, tag which applications it went to, and this shows which gets interviews.', 'workshop.html', 'Open Resume Studio'),
    foot: esc(versionAdvice(cb)) }));
  var vb = {}, vsrc = ['manual', 'auto', 'fit', 'tailored'];
  D.versions.forEach(function(v){ if(!isNum(v._at)) return; var k = MD.util.startOfMonth(v._at); vb[k] = vb[k] || { manual: 0, auto: 0, fit: 0, tailored: 0 }; var s2 = vsrc.indexOf(v.source) >= 0 ? v.source : 'manual'; vb[k][s2]++; });
  var months = Object.keys(vb).map(Number).sort(function(a, b){ return a - b; });
  c1.push(p.card({ title: 'Resume versions over time', sub: 'Versions you saved each month, by how they were made', span: 6,
    spec: { type: 'columns', stacked: true, label: 'Resume versions per month', labels: months.map(function(m){ return C.fmtMonth(m); }), series: [series(months.map(function(m){ return vb[m].manual; }), 'Written by you', P.cat[0]), series(months.map(function(m){ return vb[m].tailored; }), 'Tailored to a job', P.cat[1]), series(months.map(function(m){ return vb[m].fit; }), 'Fitted to one page', P.cat[2]), series(months.map(function(m){ return vb[m].auto; }), 'Saved automatically', P.cat[3])] },
    empty: months.length ? null : empty('No saved versions yet.') }));
  var lt = D.apps.filter(function(a){ return a.isSent && MD.inRange(a.sentAt, rg); });
  var withL = lt.filter(function(a){ return a.hasDraft || (a.pkg && a.pkg.cover); }).length;
  c1.push(p.card({ title: 'Cover letters', sub: 'Applications sent in ' + rangeWords() + ', with and without a letter', span: 6,
    spec: { type: 'stack', label: 'Applications with a cover letter', segs: [{ label: 'With a letter', value: withL, color: P.cat[0] }, { label: 'Without', value: lt.length - withL, color: P.other }] },
    empty: lt.length ? null : empty('No applications sent in ' + rangeWords() + '.'), foot: link('#works', 'Does a letter help you? See what works') }));
  var c2 = [];
  var ct = D.contacts.filter(function(c){ return isNum(c._at); }).map(function(c){ return c._at; }).sort(function(a, b){ return a - b; });
  if(ct.length){
    var rx = { from: MD.util.startOfDay(Math.min(ct[0], p.rg.from)), to: now }; var spn = (now - rx.from) / DAY; rx.gran = spn <= 45 ? 'day' : spn <= 200 ? 'week' : 'month';
    var bx = MD.buckets(rx), add = MD.countIn(ct, bx), acc = 0, cum = add.map(function(v){ acc += v; return acc; });
    c2.push(p.card({ title: 'Your network', sub: 'Contacts you’ve added, over time', span: 6,
      spec: { type: 'line', label: 'Contacts over time', area: true, labels: bx.map(function(b){ return MD.bucketLabel(b, rx.gran); }), tipTitles: bx.map(function(b){ return MD.bucketTitle(b, rx.gran); }), series: [series(cum, 'Contacts', P.cat[2])] } }));
  } else c2.push(p.card({ title: 'Your network', span: 6, empty: empty('No contacts yet. People you know at companies you want are the biggest single lift to a reply - keep them in the Workshop.', 'workshop.html', 'Add a contact') }));
  var applied = {}; D.apps.forEach(function(a){ if(a.org) applied[a.org.toLowerCase()] = (applied[a.org.toLowerCase()] || 0) + 1; });
  var byCo = {}; D.contacts.forEach(function(c){ var k = (c.company || '').trim(); if(!k) return; byCo[k] = (byCo[k] || 0) + 1; });
  var coRows = Object.keys(byCo).map(function(k){ return { label: k + (applied[k.toLowerCase()] ? ' (applied)' : ''), value: byCo[k], color: applied[k.toLowerCase()] ? P.cat[0] : P.other }; }).sort(function(a, b){ return b.value - a.value; }).slice(0, 10);
  c2.push(p.card({ title: 'People at companies', sub: 'Contacts by company - highlighted where you’ve applied', span: 6,
    spec: { type: 'bars', label: 'Contacts by company', rows: coRows, valueLabel: 'Contacts' }, empty: coRows.length ? null : empty('No contacts with a company yet.'),
    foot: coRows.some(function(r){ return /\(applied\)$/.test(r.label); }) ? 'A contact where you’ve applied can refer you - Auto can hold an application for a referral.' : '' }));
  var fu = { over: 0, week: 0, later: 0, none: 0 };
  D.contacts.forEach(function(c){ var f = MD.util.ms(c.followup); if(!isNum(f)) fu.none++; else if(f <= now) fu.over++; else if(f <= now + 7 * DAY) fu.week++; else fu.later++; });
  c2.push(p.card({ title: 'Following up', sub: 'Your contacts by when you planned to follow up', span: 6,
    spec: { type: 'stack', label: 'Contacts by follow-up', segs: [{ label: '! Due', value: fu.over, color: P.status.warning }, { label: 'This week', value: fu.week, color: P.cat[0] }, { label: 'Later', value: fu.later, color: P.cat[2] }, { label: 'No date set', value: fu.none, color: P.other }] },
    empty: D.contacts.length ? null : empty('No contacts yet.') }));
  var tg = {}; D.targets.forEach(function(t){ var k = t.status || 'researching'; tg[k] = (tg[k] || 0) + 1; });
  var TG = { researching: 'Researching', preparing: 'Preparing', networking: 'Networking', applied: 'Applied' };
  c2.push(p.card({ title: 'Target companies', sub: 'Roles and companies you’re working toward, by stage', span: 6,
    spec: { type: 'bars', label: 'Targets by stage', rows: ['researching', 'preparing', 'networking', 'applied'].map(function(k, i){ return { label: TG[k], value: tg[k] || 0, color: P.ord[i + 1] }; }), valueLabel: 'Targets' },
    empty: D.targets.length ? null : empty('No target roles yet.', 'workshop.html', 'Add a target') }));
  var ot = D.outreach;
  if(ot.length){
    var od = ot.filter(function(o){ return o.status === 'drafted'; }).length, os = ot.filter(function(o){ return o.status === 'sent'; }).length;
    c2.push(p.card({ title: 'Outreach emails', sub: 'Emails to hiring teams, drafted and sent', span: 12,
      spec: { type: 'stack', label: 'Outreach by state', segs: [{ label: 'Sent', value: os, color: P.cat[2] }, { label: 'Drafted, not sent', value: od, color: P.cat[1] }, { label: 'Other', value: ot.length - od - os, color: P.other }] } }));
  }
  p.status = (sc ? 'Resume ' + Math.round(sc.total) + '/100. ' : '') + plural(D.versions.length, 'resume version') + ', ' + plural(D.contacts.length, 'contact') + '.';
  if(sc) p.points.push('Resume score <b>' + Math.round(sc.total) + '</b> (grade ' + esc(sc.grade) + ').');
  if(versionAdvice(cb)) p.points.push(esc(versionAdvice(cb)));
  if(fu.over) p.points.push(bp(fu.over, 'contact') + ' ' + (fu.over === 1 ? 'is' : 'are') + ' due a follow-up.');
  p.snap.push(sc ? 'Resume score ' + Math.round(sc.total) + ' grade ' + sc.grade + '; ' + (sc.dimensions || []).map(function(d){ return d.label + ' ' + d.score + '/' + d.max; }).join(', ') : 'No resume score', 'Versions ' + D.versions.length + (rows.length ? '; ' + rows.map(function(r){ return r.name + ' ' + r.positive + '/' + r.sent; }).join(', ') : ''), 'Contacts ' + D.contacts.length + ', follow-ups due ' + fu.over, 'Cover letters on ' + letters + ' sent applications');
  return kp + p.section('Resume and letters', '', c1) + p.section('Network', '', c2);
}

/* ======================================================================
   WHAT WORKS - reply and interview rates by every factor that's recorded
   ====================================================================== */
// Resume Studio's advice, unless it ranks a version on fewer applications than this page does
function versionAdvice(cb){
  var rec = cb && cb.recommendation; if(!rec || !rec.text) return '';
  if(rec.kind === 'early' || rec.kind === 'none') return rec.text;
  var rows = Array.isArray(cb.rows) ? cb.rows : [];
  return rows.filter(function(r){ return r.enough; }).every(function(r){ return r.sent >= MD.ENOUGH; }) ? rec.text : 'A version needs ' + MD.ENOUGH + '+ tagged applications before its interview rate is compared here.';
}
function rateCard(p, title, sub, groups, foot, span){
  var P = C.P;
  var rows = groups.map(function(g){ return g.enough ? { label: g.label, value: g.rate, lo: g.lo, hi: g.hi, text: Math.round(g.rate) + '% (' + g.k + ' of ' + g.n + ')', color: P.cat[0] }
    : { label: g.label, value: 0, text: g.k + ' of ' + g.n + ' - too few to call', muted: true, sub: MD.ENOUGH + '+ applications needed for a rate' }; });
  return p.card({ title: title, sub: sub, span: span || 6, spec: { type: 'bars', label: title, rows: rows, max: 100, fmt: fmtPct, valueLabel: 'Rate', rangeLabel: 'Likely range (95%)' },
    empty: rows.length ? null : empty('Nothing to compare in ' + rangeWords() + ' yet.'), foot: foot || '' });
}
function pageWorks(p){
  var D = p.D, rg = p.rg, P = C.P;
  var sent = MD.sentIn(D, rg);
  var enough = sent.filter(function(a){ return a.replied; }).length;
  var c1 = [], c2 = [], c3 = [];
  var noteSmall = 'Bars show the reply rate; the thin line is its likely range. Grey groups have too few applications to call.';
  var FIT_ORDER = ['excellent', 'strong', 'partial', 'weak', 'unknown'];
  c1.push(rateCard(p, 'Do better fits get more replies?', 'Reply rate by the match score each application had when you sent it', MD.rateBy(sent, function(a){ return MD.fitBand(a.pkg && isNum(a.pkg.fit) ? a.pkg.fit : a.confidence); }, MD.FIT_LABEL, 'reply', FIT_ORDER), 'If Proof Match is honest, higher bands should reply more. ' + noteSmall));
  c1.push(rateCard(p, 'Do better fits reach interviews?', 'Interview rate by match score at the time', MD.rateBy(sent, function(a){ return MD.fitBand(a.pkg && isNum(a.pkg.fit) ? a.pkg.fit : a.confidence); }, MD.FIT_LABEL, 'interview', FIT_ORDER)));
  c2.push(rateCard(p, 'How it was sent', 'Reply rate by how the application reached the employer', MD.rateBy(sent, function(a){ return a.how; }, MD.L.how)));
  c2.push(rateCard(p, 'How fresh the posting was', 'Reply rate by the posting’s age when you applied', MD.rateBy(sent, function(a){
    var age = isNum(a.postedAt) && isNum(a.sentAt) ? (a.sentAt - a.postedAt) / DAY : (a.pkg && isNum(a.pkg.ageDays) ? a.pkg.ageDays : null);
    return age == null ? 'unknown' : age <= 3 ? 'd3' : age <= 10 ? 'd10' : age <= 30 ? 'd30' : 'older';
  }, { d3: 'Applied within 3 days', d10: '4-10 days after posting', d30: '11-30 days after', older: 'Over a month after', unknown: 'Posting date not stated' }, 'reply', ['d3', 'd10', 'd30', 'older', 'unknown'])));
  c2.push(rateCard(p, 'With or without a cover letter', 'Reply rate for applications with a letter vs without', MD.rateBy(sent, function(a){ return a.hasDraft || (a.pkg && a.pkg.cover) ? 'yes' : 'no'; }, { yes: 'With a cover letter', no: 'Without a letter' })));
  c2.push(rateCard(p, 'A resume matched to the job', 'Reply rate when Auto picked or reordered your resume for the job', MD.rateBy(sent.filter(function(a){ return a.pkg; }), function(a){ return a.pkg.reordered || a.pkg.resume === 'version' ? 'yes' : 'no'; }, { yes: 'Matched to the job', no: 'Your current resume as is' })));
  c2.push(rateCard(p, 'Remote, hybrid or on-site', 'Reply rate by the posting’s work mode', MD.rateBy(sent, function(a){ var l = (a.location || '').toLowerCase(); return /remote/.test(l) ? 'remote' : /hybrid/.test(l) ? 'hybrid' : l ? 'onsite' : 'unknown'; }, MD.L.mode)));
  c2.push(rateCard(p, 'Auto or you', 'Reply rate for applications Auto prepared vs ones you started', MD.rateBy(sent, function(a){ return a.auto ? 'auto' : 'you'; }, { auto: 'Prepared by Auto', you: 'Started by you' })));
  c2.push(rateCard(p, 'Day of the week you sent it', 'Reply rate by the day the application went out', MD.rateBy(sent, function(a){ return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(a.sentAt).getDay()]; }, { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }, 'reply', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])));
  // what the match engine has learned from your outcomes (the same maths as the rest of the app)
  var withF = D.apps.filter(function(a){ return a.factors && a.latest; }).map(function(a){ return { factors_snapshot: a.factors, outcome_status: a.stage === 'none' ? a.latest : (a.stage === 'rejected' ? 'rejected' : a.stage), confidence_pct: a.confidence, counterfactual_confidence_pct: a.counterfactual }; });
  var LBL = { goalFit: 'Fit with your goal', skillFit: 'Fit with your skills', priorityFit: 'Fit with your priorities', locationFit: 'Location fit', deadlineUrgency: 'Applying close to the deadline', descriptionFit: 'Overlap with the posting', semanticFit: 'Conceptual fit', roadmapFit: 'On your roadmap' };
  var rel = null;
  try{ if(withF.length >= 3 && typeof root.getFactorReliabilityDetail === 'function') rel = root.getFactorReliabilityDetail(withF); }catch(e){ rel = null; }
  var relRows = rel ? Object.keys(rel).filter(function(k){ return rel[k].hasEnoughData && Math.abs(rel[k].multiplier - 1) >= 0.05; }).map(function(k){ return { label: LBL[k] || k, value: Math.round((rel[k].multiplier - 1) * 100) }; }).sort(function(a, b){ return b.value - a.value; }) : [];
  c3.push(p.card({ title: 'Signals that predicted your replies', sub: 'How much more (or less) each match signal predicted a good outcome for you than average - learned from your own outcomes', span: 6,
    spec: { type: 'bars', label: 'Signal reliability for you', rows: relRows.map(function(r){ return { label: r.label, value: Math.abs(r.value), text: (r.value > 0 ? '+' : '−') + Math.abs(r.value) + '%', color: r.value > 0 ? P.cat[0] : P.cat[7], sub: r.value > 0 ? 'predicted good outcomes better than average' : 'predicted them worse than average' }; }), valueLabel: 'Change in weight' },
    empty: relRows.length ? null : empty(withF.length < 3 ? 'Kaidostar learns which signals predict replies for you once 3+ applications that it scored have an outcome logged. You have ' + withF.length + '.' : 'No signal stands out from the rest yet - your scores are being used as they are.'),
    foot: relRows.length ? 'Blue predicted better than average, coral worse. Applies to scores from the original matcher.' : '' }));
  var audit = null;
  try{ if(typeof root.auditPersonalizationEffect === 'function') audit = root.auditPersonalizationEffect(withF); }catch(e){ audit = null; }
  if(audit && audit.verdict && audit.verdict !== 'insufficient_data' && isNum(audit.personalizedAvgError) && isNum(audit.baselineAvgError)){
    c3.push(p.card({ title: 'Is personalising your scores helping?', sub: 'Average error of your match scores against what really happened - lower is better', span: 6,
      spec: { type: 'bars', label: 'Score error with and without personalising', rows: [{ label: 'Personalised to you', value: audit.personalizedAvgError, color: P.cat[0] }, { label: 'Not personalised', value: audit.baselineAvgError, color: P.other }], fmt: function(v){ return (Math.round(v * 10) / 10).toFixed(1); }, valueLabel: 'Average error' },
      foot: esc({ helping: 'Personalising is making your scores more accurate.', hurting: 'Personalising is making your scores less accurate right now - it corrects itself as outcomes come in.', neutral: 'Personalising hasn’t made a clear difference yet.' }[audit.verdict] || '') + ' Across ' + (audit.sampleSize || 0) + ' applications.' }));
  } else c3.push(p.card({ title: 'Is personalising your scores helping?', span: 6, empty: empty(audit && audit.note ? esc(audit.note) : 'Needs a few applications scored both ways with outcomes logged before it can tell.') }));
  p.status = enough < 10 ? 'Early days: ' + plural(sent.length, 'application') + ' and ' + plural(enough, 'reply', 'replies') + ' in ' + rangeWords() + ' - comparisons sharpen as more come in.' : 'What’s getting replies, from ' + plural(sent.length, 'application') + ' in ' + rangeWords() + '.';
  var best = null;
  [MD.rateBy(sent, function(a){ return a.how; }, MD.L.how), MD.rateBy(sent, function(a){ return a.hasDraft || (a.pkg && a.pkg.cover) ? 'yes' : 'no'; }, { yes: 'With a cover letter', no: 'Without a letter' })].forEach(function(gs){ gs.filter(function(g){ return g.enough; }).forEach(function(g){ if(!best || g.lo > best.lo) best = g; }); });
  if(best) p.points.push('Strongest reliable result: <b>' + esc(best.label) + '</b> - ' + Math.round(best.rate) + '% replied (' + best.k + ' of ' + best.n + ').');
  p.points.push('These rates come from ' + bp(sent.length, 'application') + ' in ' + rangeWords() + '; groups under ' + MD.ENOUGH + ' are shown but not ranked.');
  if(relRows.length) p.points.push('For you, <b>' + esc(relRows[0].label.toLowerCase()) + '</b> predicted good outcomes best.');
  p.snap.push('Range ' + rangeWords() + ', sent ' + sent.length + ', replied ' + enough, 'Reply rate by fit band: ' + MD.rateBy(sent, function(a){ return MD.fitBand(a.pkg && isNum(a.pkg.fit) ? a.pkg.fit : a.confidence); }, MD.FIT_LABEL).map(function(g){ return g.label + ' ' + g.k + '/' + g.n; }).join(', '),
    'By how sent: ' + MD.rateBy(sent, function(a){ return a.how; }, MD.L.how).map(function(g){ return g.label + ' ' + g.k + '/' + g.n; }).join(', '));
  return p.section('Is the match score honest?', 'If Proof Match ranks well, the better the fit, the more replies.', c1) + p.section('What gets replies', noteSmall, c2) + p.section('What the scoring has learned from you', '', c3);
}

/* ======================================================================
   HABITS - when and how consistently you work on it
   ====================================================================== */
function pageHabits(p){
  var D = p.D, rg = p.rg, P = C.P, now = D.now, bk = bucketsFor(rg);
  var ev = MD.activity(D), inR = ev.filter(function(e){ return MD.inRange(e.at, rg); }), mine = inR.filter(function(e){ return e.mine; });
  var st = MD.streaks(ev, now), days = MD.days(ev.filter(function(e){ return e.mine; }), rg.from, rg.to), active = Object.keys(days).length;
  var j = D.journal.filter(function(x){ return MD.inRange(x.at, rg); });
  var kp = p.kpis([
    p.kpi({ label: 'Active days', value: C.fmtN(active), sub: 'in ' + rangeWords() }),
    p.kpi({ label: 'Current streak', value: plural(st.current, 'day'), sub: 'days in a row you did something' }),
    p.kpi({ label: 'Longest streak', value: plural(st.longest, 'day') }),
    p.kpi({ label: 'Active weeks', value: st.activeWeeks12 + ' / 12', sub: 'of the last twelve weeks' }),
    p.kpi({ label: 'Things done', value: C.fmtN(mine.length), sub: active ? Math.round(mine.length / active * 10) / 10 + ' a day when active' : '' }),
    p.kpi({ label: 'Journal entries', value: C.fmtN(j.length), sub: 'in Waypoint' })
  ]);
  var c1 = [];
  c1.push(p.card({ title: 'Your activity', sub: 'Each day of ' + rangeWords() + ' - brighter is busier (Auto’s own sends aren’t counted)', span: rg.days > 190 ? 12 : 6,
    spec: { type: 'calendar', label: 'Activity calendar', from: rg.from, to: rg.to, days: days, unit: 'things done' }, empty: active ? null : empty('Nothing in ' + rangeWords() + ' yet.') }));
  var parts = {}; mine.forEach(function(e){ parts[e.part] = (parts[e.part] || 0) + 1; });
  var top = Object.keys(parts).sort(function(a, b){ return parts[b] - parts[a]; });
  // each area keeps its own colour whatever else is on the chart
  var ser = MD.AREAS.filter(function(ar){ return mine.some(function(e){ return MD.AREA_OF[e.part] === ar.key; }); }).map(function(ar){
    return series(MD.countIn(mine.filter(function(e){ return MD.AREA_OF[e.part] === ar.key; }).map(function(e){ return e.at; }), bk.b), ar.label, P.cat[ar.slot]);
  });
  c1.push(p.card({ title: 'What you spent it on', sub: 'Everything you did, per ' + rg.gran + ', by area (Auto’s own sends aren’t counted)', span: 12,
    spec: { type: 'columns', stacked: true, label: 'Activity by area', labels: bk.labels, tipTitles: bk.titles, series: ser }, empty: mine.length ? null : empty('Nothing in ' + rangeWords() + ' yet.') }));
  var c2 = [];
  var wd = [0, 0, 0, 0, 0, 0, 0], hr = []; for(var h = 0; h < 24; h++) hr.push(0);
  mine.forEach(function(e){ var d = new Date(e.at); wd[(d.getDay() + 6) % 7]++; hr[d.getHours()]++; });
  var wmax = wd.indexOf(Math.max.apply(null, wd));
  c2.push(p.card({ title: 'Which days you work on it', sub: 'Things you did, by day of the week', span: 6,
    spec: { type: 'columns', label: 'Activity by weekday', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], tipTitles: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], series: [series(wd, 'Things done', P.cat[0])], highlight: mine.length ? wmax : null },
    empty: mine.length ? null : empty('Nothing in ' + rangeWords() + ' yet.') }));
  var hmax = hr.indexOf(Math.max.apply(null, hr));
  c2.push(p.card({ title: 'What time of day', sub: 'Things you did, by hour (your time)', span: 6,
    spec: { type: 'columns', label: 'Activity by hour', labels: hr.map(function(_, i){ return i % 6 === 0 ? (i === 0 ? '12am' : i === 12 ? '12pm' : (i < 12 ? i + 'am' : (i - 12) + 'pm')) : ''; }), xLabels: hr.map(function(_, i){ return i === 0 ? '12am' : i === 6 ? '6am' : i === 12 ? '12pm' : i === 18 ? '6pm' : ''; }),
      tipTitles: hr.map(function(_, i){ var a = i % 12 === 0 ? 12 : i % 12; return a + (i < 12 ? 'am' : 'pm') + ' - ' + ((i + 1) % 12 === 0 ? 12 : (i + 1) % 12) + (i + 1 < 12 || i + 1 === 24 ? 'am' : 'pm'); }), series: [series(hr, 'Things done', P.cat[2])], capLabels: false, highlight: mine.length ? hmax : null },
    empty: mine.length ? null : empty('Nothing in ' + rangeWords() + ' yet.') }));
  var jb = MD.countIn(j.map(function(x){ return x.at; }), bk.b);
  c2.push(p.card({ title: 'Your journal', sub: 'Waypoint entries per ' + rg.gran, span: 6,
    spec: { type: 'columns', label: 'Journal entries', labels: bk.labels, tipTitles: bk.titles, series: [series(jb, 'Entries', P.cat[6])] },
    empty: j.length ? null : empty('No journal entries in ' + rangeWords() + '. A line a week in Waypoint is how the progress you can’t chart gets kept.', 'waypoint.html', 'Open Waypoint') }));
  var gh = D.goalHistory || [];
  var goals = gh.length ? '<ol class="mc-goals">' + gh.slice(-8).reverse().map(function(g, i){ return '<li><b>' + esc(g.northstar || '(no goal)') + '</b><span>' + (i === 0 ? 'since ' : 'from ') + esc(C.fmtDay(g.at)) + '</span></li>'; }).join('') + '</ol>' : '';
  c2.push(p.card({ title: 'Your goal over time', sub: 'Each time you changed your north star in the survey', span: 6, body: goals, empty: gh.length ? null : empty('Your goal history appears here once you’re signed in.') }));
  p.status = plural(active, 'active day') + ' in ' + rangeWords() + (st.current ? ' - on a ' + st.current + '-day streak.' : '.');
  p.points.push(bp(active, 'active day') + ' in ' + rangeWords() + '; longest streak ' + bp(st.longest, 'day') + '.');
  if(mine.length) p.points.push('You do most on <b>' + ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][wmax] + '</b>.');
  p.points.push('Active in <b>' + st.activeWeeks12 + ' of the last 12</b> weeks.');
  p.snap.push('Active days ' + active + ' in ' + rangeWords() + ', current streak ' + st.current + ', longest ' + st.longest + ', active weeks of last 12: ' + st.activeWeeks12, 'By kind: ' + top.slice(0, 6).map(function(k){ return k + ' ' + parts[k]; }).join(', '), 'Journal entries ' + j.length);
  // the calendar shares its row with the weekday chart unless its range needs the full width
  var cal = c1[0], spent = c1[1], wk = c2[0], hrC = c2[1], jr = c2[2], gl = c2[3], wide = rg.days > 190;
  return kp + p.section('Your rhythm', '', wide ? [cal, wk, hrC] : [cal, wk]) + p.section('Where it went', '', [spent]) +
    p.section(wide ? 'Your journal and goal' : 'Time of day, journal and goal', '', wide ? [jr, gl] : [hrC, jr, gl]);
}

/* ------------------------------------------------------------------ the pages, per role */
var CANDIDATE = [
  { id: 'today', label: 'Today', render: pageToday },
  { id: 'applications', label: 'Applications', render: pageApplications },
  { id: 'auto', label: 'Auto', render: pageAuto },
  { id: 'jobs', label: 'Jobs', render: pageJobs },
  { id: 'skills', label: 'Skills', render: pageSkills },
  { id: 'plan', label: 'Plan', render: pagePlan },
  { id: 'interviews', label: 'Interviews', render: pageInterviews },
  { id: 'materials', label: 'Materials', render: pageMaterials },
  { id: 'works', label: 'What works', render: pageWorks },
  { id: 'habits', label: 'Habits', render: pageHabits }
];
var LEGACY = { command: 'today', pipeline: 'applications', interviews: 'interviews', search: 'jobs', growth: 'plan' };
function pages(){ return S.role === 'candidate' ? CANDIDATE : ((root.MISSION_ROLES && root.MISSION_ROLES[S.role]) || CANDIDATE); }

/* ------------------------------------------------------------------ the lazy pieces */
function loadMarket(force){
  if(!S.D) return;
  var D0 = S.D;
  S.marketState = 'loading';
  var cached = MD.marketCached(D0.example ? 'example' : (D0.uid || ''));
  if(cached && !S.market) S.market = cached;
  MD.market(D0, { force: !!force }).then(function(r){ if(S.D !== D0) return; S.market = r; S.marketState = 'ready'; S.marketErr = null; rerender(MARKET_VIEWS); },
    function(e){ if(S.D !== D0) return; S.marketState = 'error'; S.marketErr = e && e.message ? e.message : 'Couldn’t read your job market just now.'; rerender(MARKET_VIEWS); });
}
function loadNames(){
  S.names = true;
  MD.load('job-engine.js').then(function(){ rerender(['plan', 'today']); }, function(){});
}
function rerender(only){
  if(only && [].concat(only).indexOf(S.page) < 0) return;
  if(!S.D || S.loading) return;
  var y = root.scrollY, keep = uiState();
  renderPage();
  restoreUi(keep);
  try{ root.scrollTo(0, y); }catch(e){}
}
// what the person had open or focused on this view, by card title - so a re-draw doesn't take it away
function cardTitle(el){ var c = el && el.closest ? el.closest('.mcc-card') : null, t = c && c.querySelector('.mcc-title'); return t ? t.textContent : null; }
function uiState(){
  var host = $('mcPage'); if(!host) return null;
  var st = { tables: [], focus: null };
  Array.prototype.forEach.call(host.querySelectorAll('.mcc-tbtn[aria-pressed="true"]'), function(b){ var k = cardTitle(b); if(k) st.tables.push(k); });
  var a = root.document.activeElement;
  if(a && host.contains(a) && a.classList){
    var k = cardTitle(a), act = a.getAttribute && a.getAttribute('data-act');
    var what = a.classList.contains('mcc-tbtn') ? '.mcc-tbtn' : a.classList.contains('mcc-plot') ? '.mcc-plot[tabindex]' : act ? '[data-act="' + act + '"]' : a.classList.contains('mcc-title') ? '.mcc-title' : null;
    if(k && what) st.focus = { card: k, sel: what };
  }
  return st;
}
function restoreUi(st){
  var host = $('mcPage'); if(!st || !host) return;
  Array.prototype.forEach.call(host.querySelectorAll('.mcc-card'), function(c){
    var t = c.querySelector('.mcc-title'), k = t ? t.textContent : null; if(!k) return;
    var b = c.querySelector('.mcc-tbtn');
    if(b && st.tables.indexOf(k) >= 0 && b.getAttribute('aria-pressed') !== 'true') b.click();
    if(st.focus && st.focus.card === k){
      // the same control if it's still there, otherwise the card's title (so focus doesn't fall to the page)
      var el = c.querySelector(st.focus.sel) || t;
      if(el === t) t.setAttribute('tabindex', '-1');
      try{ el.focus({ preventScroll: true }); }catch(e){}
    }
  });
}

/* ------------------------------------------------------------------ the shell: header, range, tabs, banners */
function css(){
  if($('missionCss')) return;
  var s = root.document.createElement('style'); s.id = 'missionCss';
  s.textContent = [
    '#missionRoot{min-height:60vh;overflow-wrap:break-word}',
    '.mc-top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:14px 24px;margin:6px 0 16px}',
    '.mc-top h1{font-family:"Space Grotesk",system-ui,sans-serif;font-weight:700;font-size:30px;letter-spacing:-.01em;margin:0;color:#fff}',
    '.mc-status{font:500 15px/1.5 Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);margin:6px 0 0;max-width:70ch}',
    '.mc-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    '.mc-range{display:inline-flex;background:var(--nightsky,#12142E);border:1px solid var(--line,#303463);border-radius:10px;padding:3px}',
    '.mc-range button{font:600 12.5px Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);background:transparent;border:0;border-radius:7px;padding:6px 10px;cursor:pointer;white-space:nowrap}',
    '.mc-range button[aria-pressed="true"]{background:var(--panel-2,#1E2140);color:#fff;box-shadow:inset 0 0 0 1px var(--line,#303463)}',
    '.mc-r-s{display:none}',
    '@media (max-width:520px){.mc-r-l{display:none}.mc-r-s{display:inline}.mc-range button{padding:6px 9px}.mc-controls{width:100%}}',
    '.mc-range button:focus-visible,.mc-btn:focus-visible,.mc-tab:focus-visible,.mc-inline:focus-visible{outline:2px solid var(--gold,#F0B24E);outline-offset:2px}',
    '.mc-btn{display:inline-flex;align-items:center;gap:6px;font:700 12.5px Manrope,system-ui,sans-serif;color:#0B0C1F;background:var(--gold,#F0B24E);border:0;border-radius:9px;padding:8px 14px;cursor:pointer;text-decoration:none}',
    '.mc-btn.ghost{color:var(--text-dim,#B4B6D6);background:transparent;border:1px solid var(--line,#303463)}',
    '.mc-btn.ghost:hover{color:#fff;border-color:var(--text-faint,#8386BE)}',
    '.mc-btn:disabled{opacity:.55;cursor:default}',
    '.mc-inline{font:inherit;color:var(--gold,#F0B24E);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}',
    '.mc-link{color:var(--gold,#F0B24E);text-decoration:underline;text-underline-offset:2px}',
    '.mc-tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:thin;border-bottom:1px solid var(--line-soft,#232548);margin:0 0 20px;-webkit-overflow-scrolling:touch}',
    '.mc-tab{flex:0 0 auto;font:600 13.5px Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);text-decoration:none;padding:10px 13px 11px;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}',
    '.mc-tab:hover{color:#fff}',
    '.mc-tab[aria-current="page"]{color:#fff;border-bottom-color:var(--gold,#F0B24E)}',
    '.mc-banner{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;border:1px solid var(--line,#303463);background:var(--nightsky,#12142E);border-radius:12px;padding:11px 14px;margin:0 0 16px;font:500 13.5px/1.5 Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6)}',
    '.mc-banner b{color:#fff}',
    '.mc-banner.example{border-color:var(--comet,#7BA9FF);position:sticky;top:8px;z-index:20}',
    '.mc-banner .grow{flex:1 1 280px}',
    '.mc-sec{margin:0 0 26px}',
    '.mc-sec-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;margin:0 0 12px}',
    '.mc-sec-h h2{font-family:"Space Grotesk",system-ui,sans-serif;font-weight:600;font-size:19px;color:#fff;margin:0}',
    '.mc-sec-h p{font:500 13px/1.45 Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE);margin:0}',
    '.mc-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;align-items:start}',
    '.mc-span-12{grid-column:span 12}.mc-span-8{grid-column:span 8}.mc-span-7{grid-column:span 7}.mc-span-6{grid-column:span 6}.mc-span-5{grid-column:span 5}.mc-span-4{grid-column:span 4}',
    '@media (max-width:1020px){.mc-span-8,.mc-span-7,.mc-span-6,.mc-span-5{grid-column:span 12}.mc-span-4{grid-column:span 6}}',
    '@media (max-width:640px){.mc-span-4{grid-column:span 12}.mc-top h1{font-size:25px}.mc-grid{gap:12px}.mcc-card{padding:14px 14px 12px}}',
    '.mc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:12px;margin:0 0 26px}',
    '.mc-kpi{background:var(--panel,#171933);border:1px solid var(--line-soft,#232548);border-radius:14px;padding:13px 14px 10px;min-width:0}',
    '.mc-kpi-l{font:600 12.5px/1.35 Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6)}',
    '.mc-kpi-v{font-family:"Space Grotesk",system-ui,sans-serif;font-weight:600;font-size:27px;line-height:1.15;color:#fff;margin-top:6px}',
    '.mc-kpi.warn .mc-kpi-v{color:var(--gold,#F0B24E)}',
    '.mc-kpi-s{font:500 12px/1.4 Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE);margin-top:3px}',
    '.mc-kpi-d{font:600 12px/1.4 Manrope,system-ui,sans-serif;margin-top:4px;color:var(--text-dim,#B4B6D6)}',
    '.mc-kpi-d.good span{color:#0ca30c}.mc-kpi-d.bad span{color:#ec835a}.mc-kpi-d.flat span{color:var(--text-faint,#8386BE)}',
    '.mc-kpi-sp{margin-top:6px;height:30px}',
    '.mc-hero{background:linear-gradient(180deg,rgba(240,178,78,.07),rgba(0,0,0,0) 70%);border:1px solid var(--line,#303463);border-radius:16px;padding:16px 18px}',
    '.mc-needs{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:8px}',
    '.mc-need{min-width:0;display:flex;align-items:flex-start;gap:12px;padding:10px 12px;background:var(--panel,#171933);border:1px solid var(--line-soft,#232548);border-radius:11px}',
    '.mc-need.urgent{border-color:rgba(250,178,25,.55)}',
    '.mc-need.info{opacity:.85}',
    '.mc-need-ic{flex:0 0 28px;height:28px;border-radius:8px;background:var(--panel-2,#1E2140);display:grid;place-items:center;color:var(--gold,#F0B24E);font-size:14px}',
    '.mc-need-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.mc-need-t a{font:700 14px/1.4 Manrope,system-ui,sans-serif;color:#fff;text-decoration:none}',
    '.mc-need-t a:hover{text-decoration:underline}',
    '.mc-need-t span{font:500 12.5px/1.4 Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE)}',
    '.mc-chip{flex:0 0 auto;font:700 11px Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);border:1px solid var(--line,#303463);border-radius:999px;padding:3px 8px;white-space:nowrap}',
    '.mc-chip.warn{color:#fab219;border-color:rgba(250,178,25,.5)}',
    '.mc-chip.good{color:#5FE0B8;border-color:rgba(95,224,184,.45)}',
    '.mc-calm{font:500 14px/1.55 Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);margin:0}',
    '.mc-empty{font:500 13px/1.55 Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);padding:8px 0 4px}',
    '.mc-empty p{margin:0 0 10px;max-width:62ch}',
    '.mc-wait{display:flex;align-items:center;gap:10px;font:500 13px Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);padding:18px 0}',
    '.mc-spin{width:14px;height:14px;border-radius:50%;border:2px solid var(--line,#303463);border-top-color:var(--gold,#F0B24E);animation:mcspin .9s linear infinite}',
    '@keyframes mcspin{to{transform:rotate(360deg)}}',
    '@media (prefers-reduced-motion:reduce){.mc-spin{animation:none}}',
    '.mc-rank{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}',
    '.mc-rank li{display:flex;gap:12px;align-items:center;background:var(--nightsky,#12142E);border:1px solid var(--line-soft,#232548);border-radius:11px;padding:9px 12px;min-width:0}',
    '.mc-rank-v{flex:0 0 auto;font-family:"Space Grotesk",system-ui,sans-serif;font-weight:700;font-size:20px;color:#fff;width:34px;text-align:center}',
    '.mc-rank b{display:block;font:700 13px/1.35 Manrope,system-ui,sans-serif;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mc-rank span{display:block;font:500 12px/1.35 Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mc-rank div{min-width:0}',
    '.mc-tbl-wrap{overflow-x:auto}',
    '.mc-dim{color:var(--text-faint,#8386BE);font-weight:500}',
    '.mc-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:6px}',
    '.mc-steps li{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font:500 13px/1.45 Manrope,system-ui,sans-serif;color:#fff}',
    '.mc-steps li.st-done span:nth-child(2),.mc-steps li.st-verified span:nth-child(2),.mc-steps li.st-skipped span:nth-child(2){color:var(--text-dim,#B4B6D6)}',
    '.mc-goals{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:8px}',
    '.mc-goals li{display:flex;flex-direction:column;gap:2px;font:500 13px/1.4 Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE);border-left:2px solid var(--line,#303463);padding-left:10px}',
    '.mc-goals li:first-child{border-left-color:var(--gold,#F0B24E)}',
    '.mc-goals b{color:#fff;font-weight:700}',
    '.mc-pilot{border:1px solid var(--line,#303463);background:linear-gradient(180deg,rgba(155,135,245,.07),rgba(0,0,0,0));border-radius:16px;padding:16px 18px;margin:6px 0 10px}',
    '.mc-pilot-h{display:flex;align-items:center;gap:10px;margin-bottom:6px}',
    '.mc-pilot-h h2{font-family:"Space Grotesk",system-ui,sans-serif;font-weight:600;font-size:17px;color:#fff;margin:0}',
    '.mc-pilot ul{margin:6px 0 0;padding-left:18px}',
    '.mc-pilot li{font:500 13.5px/1.6 Manrope,system-ui,sans-serif;color:var(--text-dim,#B4B6D6);margin-bottom:3px}',
    '.mc-pilot li b,.mc-pilot .status{color:#fff}',
    '.mc-pilot .status{font:600 14px/1.55 Manrope,system-ui,sans-serif;margin:8px 0}',
    '.mc-pilot .lbl{font:700 12px Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE);margin:12px 0 2px}',
    '.mc-pilot-a{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px;font:500 12px Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE)}',
    '.mc-foot-note{font:500 12px/1.5 Manrope,system-ui,sans-serif;color:var(--text-faint,#8386BE);margin:10px 0 0}'
  ].join('\n');
  root.document.head.appendChild(s);
}
function shell(){
  var host = $('missionRoot'); if(!host) return;
  host.innerHTML = '<div class="mc-top"><div><h1>Mission Control</h1><p class="mc-status" id="mcStatus">Reading your account…</p></div>' +
    '<div class="mc-controls"><div class="mc-range" role="group" aria-label="Time range" id="mcRange">' + MD.RANGES.map(function(r){ return '<button type="button" data-range="' + r.key + '" aria-pressed="' + (r.key === S.range) + '" aria-label="' + esc(r.label) + '"><span class="mc-r-l">' + esc(r.label) + '</span><span class="mc-r-s" aria-hidden="true">' + esc(r.key === 'all' ? 'All' : r.key) + '</span></button>'; }).join('') + '</div>' +
    '<button type="button" class="mc-btn ghost" data-act="refresh" id="mcRefresh">Refresh</button></div></div>' +
    '<div id="mcBanner"></div><nav class="mc-tabs" id="mcTabs" aria-label="Mission Control views"></nav><div id="mcPage" aria-live="off"></div>';
  host.addEventListener('click', onClick);
  C.wireTables(host);
}
function renderTabs(){
  var el = $('mcTabs'); if(!el) return;
  el.innerHTML = pages().map(function(pg){ return '<a class="mc-tab" href="#' + pg.id + '"' + (pg.id === S.page ? ' aria-current="page"' : '') + '>' + esc(pg.label) + '</a>'; }).join('');
  var cur = el.querySelector('[aria-current="page"]');
  if(cur && cur.scrollIntoView){ try{ var r = cur.getBoundingClientRect(), b = el.getBoundingClientRect(); if(r.left < b.left || r.right > b.right) el.scrollLeft += r.left - b.left - 20; }catch(e){} }
}
var MISSING_LABEL = { profile: 'your survey answers', tier: 'your plan', applications: 'applications', drafts: 'which applications have drafts', auto_packages: 'Auto’s records',
  outcomes: 'the replies you logged', saved: 'saved jobs', dismissed: 'jobs you passed on', auto: 'Auto', autopilot: 'Autopilot’s status', auto_settings: 'Auto’s settings',
  workshop: 'interview practice, stories and contacts', search: 'saved searches', journal: 'your journal', notifications: 'notifications', resume_entries: 'resume entries',
  outreach: 'outreach emails', coverage: 'job-pool coverage' };
var CAPPED_LABEL = { applications: 'applications', outcomes: 'logged replies', saved: 'saved jobs', dismissed: 'passed-on jobs', journal: 'journal entries',
  'workshop:interview_session': 'practice interviews', 'workshop:star_story': 'stories', 'workshop:interview_debrief': 'debriefs', 'workshop:interview_answer': 'prepared answers',
  'workshop:resume_version': 'resume versions', 'workshop:contact': 'contacts', 'workshop:target_role': 'target roles' };
function cappedNote(D){
  var c = D && D.source && Array.isArray(D.source.capped) ? D.source.capped.filter(function(x){ return x && CAPPED_LABEL[x.part] && isNum(x.limit); }) : [];
  return c.length ? '<div class="mc-banner"><div class="grow">Your history is long, so these charts use your newest ' + c.map(function(x){ return C.fmtN(x.limit) + ' ' + CAPPED_LABEL[x.part]; }).join(', ') + '.</div></div>' : '';
}
function renderBanner(){
  var el = $('mcBanner'); if(!el) return;
  var D = S.D, h = '';
  if(S.example) h = '<div class="mc-banner example" role="note"><div class="grow"><b>Example data.</b> A fictional job seeker applying to made-up companies, so you can see what each chart shows. None of it is yours, and nothing here is saved.</div><button type="button" class="mc-btn ghost" data-act="example-off">Back to my data</button></div>';
  else if(D && !D.signedIn) h = '<div class="mc-banner"><div class="grow">You’re not signed in, so this shows only what this browser holds. <a class="mc-link" href="login.html">Sign in</a> to see your whole account.</div>' + (isThin(D) ? '<button type="button" class="mc-btn ghost" data-act="example-on">See an example</button>' : '') + '</div>';
  else if(D && D.source.error === 'signin') h = '<div class="mc-banner"><div class="grow">Your sign-in has expired - showing what this browser holds. <a class="mc-link" href="login.html">Sign in again</a> for your whole account.</div></div>';
  else if(D && D.source.error) h = '<div class="mc-banner"><div class="grow">Couldn’t reach your account just now - showing what this browser holds. <button type="button" class="mc-inline" data-act="refresh">Try again</button></div></div>';
  else if(D && D.source.missing && D.source.missing.length) h = '<div class="mc-banner"><div class="grow">Some of your records couldn’t be read just now (' + esc(D.source.missing.map(function(k){ return MISSING_LABEL[k] || String(k).replace(/_/g, ' '); }).join(', ')) + '); the charts that use them may look emptier than they are. <button type="button" class="mc-inline" data-act="refresh">Try again</button></div></div>';
  else if(D && isThin(D)) h = '<div class="mc-banner"><div class="grow">There isn’t much to chart yet. Each view says what fills it - or look at a complete example first.</div><button type="button" class="mc-btn ghost" data-act="example-on">See an example</button></div>';
  if(!S.example && D && !D.source.error) h += cappedNote(D);
  el.innerHTML = h;
}
function isThin(D){ return D && D.role === 'candidate' && D.apps.length < 3 && D.sessions.length < 2 && !D.plan; }
function renderPage(){
  var host = $('mcPage'); if(!host || !S.D) return;
  var list = pages(), pg = list.find(function(x){ return x.id === S.page; }) || list[0];
  S.page = pg.id;
  renderTabs(); renderBanner();
  C.forget(host);
  var D = S.D, rg = MD.range(S.range, D.now, MD.earliest ? MD.earliest(D) : null);
  var p = new Page(D, rg);
  var html;
  try{ html = pg.render(p); }catch(e){
    if(root.console) console.error('Mission Control view failed', pg.id, e);
    html = '<div class="mc-banner"><div class="grow">This view couldn’t be drawn. The other views still work - and refreshing usually fixes it.</div><button type="button" class="mc-btn ghost" data-act="refresh">Refresh</button></div>';
    p.specs = {};
  }
  host.innerHTML = html + pilot(pg.id, p);
  var st = $('mcStatus'); if(st) st.textContent = p.status || '';
  Object.keys(p.specs).forEach(function(id){ var el = host.querySelector('[data-chart="' + id + '"]'); if(el) C.mount(el, p.specs[id]); });
  if(C.labelTables) C.labelTables(host);
  wirePilot(pg.id, p);
  try{ root.document.title = pg.label + ' - Mission Control - Kaidostar'; }catch(e){}
}

/* ------------------------------------------------------------------ Metis: the page in a few lines, and an AI read-out on request */
function metisMk(){ return typeof root.metisMark === 'function' ? root.metisMark(20, '#F0B24E') : '✦'; }
function metisKey(id){ return id + '|' + S.range + '|' + (S.example ? 1 : 0) + '|' + (S.D ? S.D.now : 0); }
function pilot(id, p){
  if(!p.points.length) return '';
  var kept = S.metis && S.metis.key === metisKey(id) ? S.metis.html : null, busy = S.metisPending === metisKey(id);
  return '<section class="mc-pilot" id="mcPilot" aria-label="Metis read-out"><div class="mc-pilot-h"><span aria-hidden="true">' + metisMk() + '</span><h2>Metis, in short</h2></div>' +
    '<div id="mcPilotBody">' + (kept || '<ul>' + p.points.map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ul>') + '</div>' +
    '<div class="mc-pilot-a">' + (S.D && S.D.signedIn && !S.example ? '<button type="button" class="mc-btn ghost" id="mcPilotAI"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Metis is reading this view…' : 'Ask Metis what to do next') + '</button><span id="mcPilotNote">Uses only the numbers on this view.</span>' : '<span>' + (S.example ? 'Metis reads your own numbers once you’re signed in.' : 'Sign in to ask Metis what to do next.') + '</span>') + '</div></section>';
}
function parseBriefing(text){
  var out = { status: '', points: [], moves: [] }, mode = '';
  String(text || '').split('\n').forEach(function(raw){
    var line = raw.trim(); if(!line) return;
    if(/^status\s*:/i.test(line)){ out.status = line.replace(/^status\s*:/i, '').trim(); mode = 'status'; return; }
    if(/^key points/i.test(line)){ mode = 'points'; return; }
    if(/^next moves/i.test(line)){ mode = 'moves'; return; }
    var m = line.match(/^[-*•]\s+(.*)$/);
    if(m){ (mode === 'moves' ? out.moves : out.points).push(m[1]); return; }
    if(mode === 'status' && !out.status) out.status = line;
  });
  return out;
}
function wirePilot(id, p){
  var btn = $('mcPilotAI'); if(!btn) return;
  btn.addEventListener('click', async function(){
    var key = metisKey(id);
    if(S.metisPending === key) return;
    S.metisPending = key;
    btn.disabled = true; btn.textContent = 'Metis is reading this view…';
    // the page may be re-drawn while Metis reads: find the read-out again when the answer comes
    function here(elId){ return S.page === id && metisKey(id) === key ? $(elId) : null; }
    try{
      var pr = S.D.profile || {};
      var goal = S.D.role === 'athlete' ? 'Track: athlete recruiting - ' + ([pr.sport, pr.level, pr.careerDirection].filter(Boolean).join(', ') || 'profile not set')
        : S.D.role === 'student' ? 'Track: school admissions - ' + ([pr.intendedMajor, pr.gradeLevel].filter(Boolean).join(', ') || 'profile not set')
        : 'Goal: ' + (pr.northstar || '(not set)');
      var snap = 'VIEW: ' + id.toUpperCase() + '\n' + goal + '\n' + p.snap.filter(Boolean).join('\n');
      var text = typeof root.apiAiAssist === 'function' ? await MD.within(root.apiAiAssist(S.D.uid, 'overview_briefing', { snapshot: snap }), 60000) : null;
      if(!text) throw new Error('no result');
      var b = parseBriefing(text), h = '';
      if(b.status) h += '<p class="status">' + esc(b.status) + '</p>';
      if(b.points.length) h += '<div class="lbl">Key points</div><ul>' + b.points.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      if(b.moves.length) h += '<div class="lbl">Next moves</div><ul>' + b.moves.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      if(h){ S.metis = { key: key, html: h + '<p class="mc-foot-note">Read by Metis from this view’s numbers only.</p>' }; var b2 = here('mcPilotBody'); if(b2) b2.innerHTML = S.metis.html; }
      var n2 = here('mcPilotNote'); if(n2) n2.textContent = 'Read by Metis from this view’s numbers only.';
    }catch(e){ var n3 = here('mcPilotNote'); if(n3) n3.textContent = 'Couldn’t reach Metis just now - the points above are still current.'; }
    finally{ if(S.metisPending === key) S.metisPending = null; var b3 = here('mcPilotAI'); if(b3){ b3.disabled = false; b3.textContent = 'Ask Metis what to do next'; } }
  });
}

/* ------------------------------------------------------------------ interaction */
function onClick(ev){
  var t = ev.target;
  var r = t.closest ? t.closest('[data-range]') : null;
  if(r){ S.range = r.getAttribute('data-range'); try{ root.localStorage.setItem(RANGE_KEY, S.range); }catch(e){} Array.prototype.forEach.call($('mcRange').querySelectorAll('button'), function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-range') === S.range)); }); rerender(); return; }
  var a = t.closest ? t.closest('[data-act]') : null;
  if(a){
    var act = a.getAttribute('data-act');
    if(act === 'refresh'){ refresh(); }
    else if(act === 'market'){ loadMarket(true); rerender(); }
    else if(act === 'engines'){ if(S.interview && !S.interview.engine){ S.interview = null; S.interviewState = 'idle'; } if(S.resume && !S.resume.engine){ S.resume = null; S.resumeState = 'idle'; } rerender(); }
    else if(act === 'example-on'){ setExample(true); }
    else if(act === 'example-off'){ setExample(false); }
    return;
  }
  var tab = t.closest ? t.closest('.mc-tab') : null;
  if(tab){ ev.preventDefault(); go(tab.getAttribute('href').slice(1), true, true); return; }
  var hl = t.closest ? t.closest('a[href^="#"]') : null;
  if(hl && pages().some(function(pg){ return '#' + pg.id === hl.getAttribute('href'); })){ ev.preventDefault(); go(hl.getAttribute('href').slice(1), true, true); root.scrollTo(0, 0); }
}
function go(id, push, focusTab){
  if(!pages().some(function(pg){ return pg.id === id; })) id = pages()[0].id;
  S.page = id;
  if(push){ try{ root.history.pushState(null, '', '#' + id); }catch(e){ root.location.hash = id; } }
  renderPage();
  if(focusTab){ var cur = $('mcTabs') && $('mcTabs').querySelector('[aria-current="page"]'); if(cur){ try{ cur.focus({ preventScroll: true }); }catch(e){} } }
}
// the address bar's view: no hash is the first view; a hash that isn't a view (an in-page anchor) is left alone
function onAddress(){
  var id = (root.location.hash || '').replace(/^#/, '');
  if(!id) id = pages()[0].id;
  else if(!pages().some(function(pg){ return pg.id === id; })) return;
  if(id !== S.page) go(id, false);
}
function setExample(on){
  S.example = on; S.metis = null;
  S.market = null; S.marketState = 'idle'; S.interview = null; S.interviewState = 'idle'; S.resume = null; S.resumeState = 'idle';
  S.D = on ? MD.example(Date.now()) : S.real;
  if(!on && !S.D){ refresh(); return; }
  renderPage();
  root.scrollTo(0, 0);
}
async function refresh(){
  var btn = $('mcRefresh'); if(btn){ btn.disabled = true; btn.textContent = 'Refreshing…'; }
  S.loading = true;
  try{ await loadData(); } finally { S.loading = false; if(btn){ btn.disabled = false; btn.textContent = 'Refresh'; } }
  S.market = null; S.marketState = 'idle'; S.interview = null; S.interviewState = 'idle'; S.resume = null; S.resumeState = 'idle';
  renderPage();
}
async function loadData(){
  if(S.role === 'candidate'){
    var D = await MD.gather();
    D.role = 'candidate';
    S.real = D;
    if(!S.example) S.D = D;
    // the account says this person is on the student or athlete track (an old visit here may have reset it): follow the account
    if(D.signedIn && !D.source.error && D.source.missing.indexOf('applications') < 0 && (D.profileFlags.is_student || D.profileFlags.is_athlete) && !D.apps.length){
      var nr = D.profileFlags.is_student ? 'student' : 'athlete';
      if(root.MISSION_ROLES && root.MISSION_ROLES[nr]){
        try{ if(typeof root._safeSetItem === 'function') root._safeSetItem('kaidostar_role', nr); }catch(e){}
        S.role = nr; S.page = null;
        try{ if(typeof root.renderNav === 'function') root.renderNav('mission'); }catch(e){}
        return loadData();
      }
    }
  } else {
    S.D = await root.MISSION_ROLES.gather(S.role);
    S.real = S.D;
  }
}

/* ------------------------------------------------------------------ start */
MISSION.start = async function(legacyKey){
  if(!MD || !C){ var r0 = $('missionRoot'); if(r0) r0.innerHTML = '<p class="mc-calm">Mission Control couldn’t load. Refresh the page.</p>'; return; }
  C.injectCss(); css();
  S.role = MD.role();
  try{ var sr = root.localStorage.getItem(RANGE_KEY); if(MD.RANGES.some(function(x){ return x.key === sr; })) S.range = sr; }catch(e){}
  var h = (root.location.hash || '').replace(/^#/, '');
  S.page = h || (legacyKey && LEGACY[legacyKey]) || null;
  shell();
  var pg = $('mcPage'); if(pg) pg.innerHTML = waiting('Reading your account…');
  S.loading = true;
  try{ await loadData(); }
  catch(e){ if(root.console) console.error('Mission Control data failed', e); S.D = MD.normalize(null, null, null, Date.now()); S.D.source.error = 'offline'; }
  S.loading = false;
  if(!pages().some(function(x){ return x.id === S.page; })) S.page = pages()[0].id;
  renderPage();
  root.addEventListener('hashchange', onAddress);
  root.addEventListener('popstate', onAddress);
};
// the old per-page shells call MISSION.page('pipeline') etc.
MISSION.page = function(key){ return MISSION.start(key); };
// for the athlete and student views (mission-roles.js)
MISSION._h = { rangeWords: rangeWords, plural: plural, empty: empty, link: link, waiting: waiting, buckets: bucketsFor };
MISSION._state = S;
MISSION._Page = Page;
root.MISSION = MISSION;
})(typeof window !== 'undefined' ? window : globalThis);
