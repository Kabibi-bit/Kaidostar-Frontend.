/* =========================================================================
   MISSION CONTROL - the athlete and student overviews.

   The same honest rules as the job-seeker views (mission.js): every number is
   counted from the person's own records and an empty chart says what fills it.
     - Athletes: applications, outcomes, events, coach outreach, roadmap, clip
       plan and journal are what Kaidostar keeps in this browser. Matched
       programs come from the account when signed in (the same matches the
       Opportunities page shows); signed out, the demo listings, labelled.
     - Students: readiness, list balance, the readiness line and milestones
       come from the account when signed in - the same numbers the
       Opportunities page shows - and from this browser otherwise. Readiness is
       an evidence score, never an admission probability.
   ========================================================================= */
(function(root){
'use strict';
var MD = root.MISSION_DATA, C = root.MCC;
var DAY = 864e5, HOUR = 36e5, WAIT_MS = 30000;
function H(){ return root.MISSION._h; }
function isNum(v){ return typeof v === 'number' && isFinite(v); }
function esc(s){ return C.esc(s); }
function lsGet(k, d){ try{ var v = JSON.parse(root.localStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }
function lsSet(k, v){ try{ root.localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function arr(v){ return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object' && !Array.isArray(x); }) : []; }
function call(fn, d){ try{ var v = typeof root[fn] === 'function' ? root[fn]() : d; return v == null ? d : v; }catch(e){ return d; } }
function num(v){ var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : null; }
var ms = MD.util.ms, idTime = MD.util.idTime;
// the server prints UTC times without a zone ("2026-10-01 12:30:00.123") - read them as UTC, not local
function utcMs(v){ if(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(v.trim())) return ms(v.trim().replace(' ', 'T') + 'Z'); return ms(v); }
function earliestOf(list){ var t = list.filter(isNum); return t.length ? Math.min.apply(null, t) : null; }
function token(){ try{ return typeof root.getAuthToken === 'function' ? root.getAuthToken() : null; }catch(e){ return null; } }
// a backend call that gives up after WAIT_MS (a sleeping server can take most of a minute to wake)
function ask(fn, args){
  if(typeof root[fn] !== 'function') return Promise.resolve({ v: null, failed: false, absent: true });
  var done = false;
  return new Promise(function(resolve){
    var t = setTimeout(function(){ if(!done){ done = true; resolve({ v: null, failed: true, slow: true }); } }, WAIT_MS);
    Promise.resolve().then(function(){ return root[fn].apply(root, args); }).then(function(v){ if(done) return; done = true; clearTimeout(t); resolve({ v: v, failed: v == null }); },
      function(){ if(done) return; done = true; clearTimeout(t); resolve({ v: null, failed: true }); });
  });
}
function bp(n, w, p){ return '<b>' + C.fmtN(n) + '</b> ' + (n === 1 ? w : (p || w + 's')); }
function clock(sec){ sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }

/* ------------------------------------------------------------------ athletes: what this browser and the account hold */
var AM_KEY = 'kaidostar_mc_athlete_matches', AM_TTL = HOUR;
function slimMatch(m){
  var terms = [].concat(Array.isArray(m.matched) ? m.matched : [], Array.isArray(m.matchedGoal) ? m.matchedGoal : [], Array.isArray(m.matchedSkill) ? m.matchedSkill : [])
    .filter(function(t){ return typeof t === 'string' && t.trim(); }).map(function(t){ return t.trim().toLowerCase().slice(0, 40); });
  return { id: String(m.id == null ? '' : m.id), title: String(m.title || 'A program').slice(0, 160), org: String(m.org || '').slice(0, 120), loc: String(m.loc || '').slice(0, 80),
    pct: num(m.pct), terms: terms.filter(function(t, i){ return terms.indexOf(t) === i; }).slice(0, 12) };
}
async function athleteMatches(prof, uid){
  var now = Date.now();
  if(uid){
    var c = lsGet(AM_KEY, null), mine = c && c.uid === uid && Array.isArray(c.matches) && isNum(c.at);
    if(mine && now - c.at < AM_TTL) return { list: arr(c.matches), source: 'account', at: c.at };
    var hadToken = !!token();
    var r = await ask('apiGetMatches', [uid]);
    if(r.v && r.v.ok && Array.isArray(r.v.matches)){
      var list = arr(r.v.matches).map(slimMatch);
      lsSet(AM_KEY, { uid: uid, at: now, matches: list });
      return { list: list, source: 'account', at: now };
    }
    var expired = hadToken && !token();
    if(mine) return { list: arr(c.matches), source: 'account', at: c.at, stale: true, expired: expired };
    return { list: [], source: 'account', error: true, expired: expired };
  }
  var demo = [];
  try{ if(prof && typeof root.runAthleteMatchCycle === 'function') demo = arr(root.runAthleteMatchCycle(prof)).map(slimMatch); }catch(e){ demo = []; }
  return { list: demo, source: 'demo', at: now };
}
function journalOf(key){ return arr(lsGet(key, [])).map(function(j){ return { at: ms(j.created_at) || idTime(j.id) }; }).filter(function(j){ return isNum(j.at); }); }
async function gatherAthlete(){
  var now = Date.now(), sess = MD.session(), uid = sess && sess.user_id ? String(sess.user_id) : null;
  var prof = call('getAthleteProfile', null);
  if(!prof || typeof prof !== 'object') prof = {};
  var hasProfile = !!(prof.sport || prof.level);
  var apps = arr(call('getAthleteApplications', [])).map(function(a){ return { id: String(a.id), listing_id: String(a.listing_id || ''), title: String(a.listing_title || 'A program'), org: String(a.listing_org || ''),
    status: String(a.status || ''), createdAt: ms(a.created_at) || idTime(a.id), sentAt: ms(a.sent_at), score: isNum(a.match_score) ? a.match_score : (isNum(a.confidence_pct) ? a.confidence_pct : null) }; });
  var oc = call('getAthleteOutcomes', {}); if(!oc || typeof oc !== 'object' || Array.isArray(oc)) oc = {};
  apps.forEach(function(a){ var o = oc[a.listing_id]; a.outcome = o && o.outcome ? String(o.outcome) : null; a.outcomeAt = o ? ms(o.logged_at) : null; });
  var outcomes = Object.keys(oc).map(function(k){ var o = oc[k]; return { listing_id: k, outcome: o && typeof o === 'object' && o.outcome ? String(o.outcome) : null, at: o && typeof o === 'object' ? ms(o.logged_at) : null }; }).filter(function(o){ return o.outcome; });
  var events = arr(call('getAthleteEvents', [])).map(function(e){ return { id: String(e.id || ''), title: String(e.title || 'An event'), org: String(e.org || ''), type: String(e.event_type || 'other'), status: String(e.status || 'upcoming'), at: ms(e.event_date), madeAt: idTime(e.id) }; });
  var outreach = arr(call('getAthleteOutreachDrafts', [])).map(function(o){ return { id: String(o.id || ''), status: String(o.status || 'drafted'), createdAt: ms(o.created_at) || idTime(o.id), sentAt: ms(o.sent_at) }; });
  var clips = arr(call('getClipPlan', [])).map(function(c){ var a = num(c.in_time), b = num(c.out_time); return { seg: isNum(c.segment_index) ? c.segment_index : null, label: c.segment_label ? String(c.segment_label).slice(0, 120) : '', secs: a != null && b != null && b > a ? b - a : 0, madeAt: idTime(c.id) }; });
  var roadmap = call('getAthleteRoadmap', null);
  var timeline = null; try{ if(hasProfile && typeof root.athleteRecruitingTimeline === 'function') timeline = root.athleteRecruitingTimeline(prof); }catch(e){ timeline = null; }
  var mt = hasProfile ? await athleteMatches(prof, uid) : { list: [], source: uid ? 'account' : 'demo' };
  var journal = journalOf('kaidostar_waypoint_athlete');
  var D = { role: 'athlete', now: now, signedIn: !!uid, uid: uid, example: false,
    source: { server: mt.source === 'account' && !mt.error, missing: mt.error && !mt.expired ? ['matched programs'] : [], at: now, error: mt.expired ? 'signin' : null },
    hasProfile: hasProfile, profile: prof, apps: apps, outcomes: outcomes, events: events, outreach: outreach, clips: clips, roadmap: roadmap, timeline: timeline,
    matches: mt.list, matchSource: mt.source, matchAt: mt.at || null, matchStale: !!mt.stale, matchError: !!mt.error,
    saved: (lsGet('kaidostar_athlete_saved_ids', []) || []).length, journal: journal };
  D.earliest = earliestOf([].concat(apps.map(function(a){ return a.createdAt; }), outreach.map(function(o){ return o.createdAt; }), events.map(function(e){ return e.madeAt; }), outcomes.map(function(o){ return o.at; }), journal.map(function(j){ return j.at; })));
  return D;
}

/* ------------------------------------------------------------------ students */
// the Opportunities page turns the server's answers into these shapes; the same here, so the numbers match it
function normReadiness(be){
  if(!be || !Array.isArray(be.schools) || !be.schools.length) return null;
  return { schools: arr(be.schools).map(function(s){ return { name: String(s.name || ''), country: s.country, tier: s.tier === 'reach' ? 'reach' : 'target', accept: s.accept ? String(s.accept) : '', general: !!s.general,
    score: isNum(s.score) ? s.score : 0, band: String(s.band || ''), bandNote: s.band_note || '', factors: Array.isArray(s.factors) ? s.factors : [], academicFit: s.academic_fit || null, nextMove: s.next_move || '', values: Array.isArray(s.values) ? s.values : [] }; }),
    evidence: be.evidence && typeof be.evidence === 'object' ? { achCount: num(be.evidence.ach_count) || 0, competitions: num(be.evidence.competitions) || 0, internships: num(be.evidence.internships) || 0,
      doneStages: num(be.evidence.done_stages) || 0, totalStages: num(be.evidence.total_stages) || 0, trackedCount: num(be.evidence.tracked_count) || 0, eventCount: num(be.evidence.event_count) || 0,
      hasMajor: !!be.evidence.has_major, hasInterests: !!be.evidence.has_interests, achItems: [] } : null };
}
function normBalance(be){ return be && be.counts && typeof be.counts === 'object' ? { counts: be.counts, schools: arr(be.schools), verdict: String(be.verdict || ''), verdictNote: be.verdict_note || '', risk: be.risk || null } : null; }
var GLYPH = { flag: '⚑', trophy: '🏆', briefcase: '💼', medal: '🏅', rise: '📈', star: '⭐', check: '✓' };
function slimMilestone(m, server){ return { at: server ? utcMs(m.ts) : ms(m.ts), key: String(m.key || ''), title: String(m.title || ''), detail: String(m.detail || ''), glyph: GLYPH[m.icon] || '✓' }; }
// what each kind of evidence adds to the score, worked out with the Opportunities page's own scoring
function scoreParts(adm, ev){
  if(!adm || !ev || typeof root.admissionsAnchor !== 'function' || typeof root.schoolReadiness !== 'function') return null;
  try{
    var kb = (root.admissionsAnchor(adm) || {}).kb || [];
    if(!kb.length) return null;
    var avg = function(e){ var t = 0; kb.forEach(function(s){ t += root.schoolReadiness(s, adm, e).score; }); return t / kb.length; };
    var base = avg(ev);
    var parts = [
      { key: 'focus', label: 'Your major and interests', zero: { hasMajor: false, hasInterests: false }, have: (ev.hasMajor ? 'major named' : 'no major yet') + ', ' + (ev.hasInterests ? 'interests added' : 'no interests yet') },
      { key: 'ach', label: 'Achievements', zero: { achCount: 0 }, have: H().plural(ev.achCount, 'achievement') + ' stated' },
      { key: 'comp', label: 'Competitions', zero: { competitions: 0 }, have: H().plural(ev.competitions, 'competition') + ' tracked' },
      { key: 'intern', label: 'Hands-on experience', zero: { internships: 0 }, have: H().plural(ev.internships, 'internship or experience', 'internships or experiences') + ' tracked' },
      { key: 'stages', label: 'Roadmap progress', zero: { doneStages: 0 }, have: ev.totalStages ? ev.doneStages + ' of ' + H().plural(ev.totalStages, 'stage') + ' done' : 'no roadmap yet' },
      { key: 'tracked', label: 'Opportunities tracked', zero: { trackedCount: 0 }, have: H().plural(ev.trackedCount, 'opportunity', 'opportunities') + ' tracked' }
    ];
    return { score: Math.round(base), rows: parts.map(function(p){ return { key: p.key, label: p.label, have: p.have, value: Math.max(0, Math.round(base - avg(Object.assign({}, ev, p.zero)))) }; }) };
  }catch(e){ return null; }
}
async function gatherStudent(){
  var now = Date.now(), sess = MD.session(), uid = sess && sess.user_id ? String(sess.user_id) : null;
  var adm = call('getAdmissionsProfile', null); if(adm && typeof adm !== 'object') adm = null;
  var localReady = null, localBal = null;
  try{ if(adm && typeof root.admissionsReadiness === 'function') localReady = root.admissionsReadiness(adm); }catch(e){ localReady = null; }
  try{ if(adm && typeof root.admissionsListBalance === 'function') localBal = root.admissionsListBalance(adm); }catch(e){ localBal = null; }
  var missing = [], expired = false, be = {};
  if(uid){
    var hadToken = !!token();
    var r = await Promise.all([ask('apiAdmissionsReadiness', [uid]), ask('apiAdmissionsListBalance', [uid]), ask('apiAdmissionsJourney', [uid])]);
    be = { readiness: r[0].v, balance: r[1].v, journey: r[2].v };
    expired = hadToken && !token();
    // a 404 from list-balance just means no schools we know yet - only a failed or slow call is missing
    if(!expired){ if(r[0].failed && (r[0].slow || !localReady)) missing.push('readiness'); if(r[2].failed && r[2].slow) missing.push('your readiness history'); }
  }
  var srvReady = normReadiness(be.readiness), srvBal = normBalance(be.balance);
  var ready = srvReady || (localReady && Array.isArray(localReady.schools) && localReady.schools.length ? localReady : null);
  var bal = srvReady ? (srvBal || null) : (localBal || srvBal || null);
  var localSnaps = arr(call('getAdmissionsSnapshots', [])).map(function(s){ return { at: ms(s.ts), avg: num(s.avg), perSchool: arr(s.perSchool), evidence: s.evidence && typeof s.evidence === 'object' ? s.evidence : {} }; })
    .filter(function(s){ return isNum(s.at) && isNum(s.avg); }).sort(function(a, b){ return a.at - b.at; });
  var jr = be.journey && typeof be.journey === 'object' ? be.journey : null;
  var srvLine = jr && jr.trajectory && Array.isArray(jr.trajectory.points) ? arr(jr.trajectory.points).map(function(p){ return { at: utcMs(p.ts), avg: num(p.avg) }; }).filter(function(p){ return isNum(p.at) && isNum(p.avg); }).sort(function(a, b){ return a.at - b.at; }) : [];
  var useSrvLine = srvLine.length >= 2 || (srvReady && srvLine.length >= localSnaps.length);
  var line = useSrvLine ? srvLine : localSnaps.map(function(s){ return { at: s.at, avg: s.avg }; });
  var srvMiles = jr && Array.isArray(jr.milestones) ? arr(jr.milestones).map(function(m){ return slimMilestone(m, true); }).filter(function(m){ return isNum(m.at) && m.title; }) : [];
  var localMiles = arr(call('getAdmissionsMilestones', [])).map(function(m){ return slimMilestone(m, false); }).filter(function(m){ return isNum(m.at) && m.title; });
  var miles = (srvMiles.length ? srvMiles : localMiles).sort(function(a, b){ return a.at - b.at; });
  var events = arr(call('getAdmissionsEvents', [])).map(function(e){ return { id: String(e.id || ''), title: String(e.title || 'An event'), org: String(e.org || ''), type: String(e.event_type || 'deadline'), status: String(e.status || 'upcoming'), when: String(e.event_date || ''), at: ms(e.event_date), madeAt: idTime(e.id) }; });
  var tracked = arr(call('getAdmissionsApplications', [])).map(function(a){ return { id: String(a.id || ''), outcome: a.outcome_status ? String(a.outcome_status) : null, outcomeAt: ms(a.outcome_logged_at), madeAt: idTime(a.id) }; });
  var roadmap = call('getAdmissionsRoadmap', null);
  var ev = srvReady && srvReady.evidence ? srvReady.evidence : (localReady && localReady.evidence) || null;
  var journal = journalOf('kaidostar_waypoint_student');
  var D = { role: 'student', now: now, signedIn: !!uid, uid: uid, example: false, source: { server: !!(srvReady || srvBal || jr), missing: missing, at: now, error: expired ? 'signin' : null },
    hasProfile: !!adm || !!srvReady, profile: adm || {}, ready: ready, readySource: srvReady ? 'account' : 'browser', balance: bal, parts: scoreParts(adm, ev),
    line: line, lineSource: useSrvLine ? 'account' : 'browser', snaps: localSnaps, miles: miles, events: events, tracked: tracked, roadmap: roadmap, journal: journal };
  D.earliest = earliestOf([].concat(line.map(function(s){ return s.at; }), miles.map(function(m){ return m.at; }), tracked.map(function(t){ return t.madeAt; }), events.map(function(e){ return e.madeAt; }), journal.map(function(j){ return j.at; })));
  return D;
}

/* ------------------------------------------------------------------ shared */
function stagesOf(rm){ var m = rm && Array.isArray(rm.milestones) ? rm.milestones.filter(function(x){ return x && typeof x === 'object'; }) : []; return { all: m, done: m.filter(function(x){ return x.status === 'done'; }).length, doing: m.filter(function(x){ return x.status === 'in_progress'; }).length }; }
function noProfile(p, track, href){
  p.status = 'Take the ' + track + ' survey to start.';
  return p.section('Your overview', '', [p.card({ title: 'Nothing to chart yet', span: 12, body: '<div class="mc-empty"><p>Take the ' + esc(track) + ' survey and this overview fills in as you go: what fits you, what you’ve sent, what’s coming up and how far you’ve come.</p><a class="mc-btn" href="' + esc(href) + '">Take the survey</a></div>' })]);
}
function needsList(needs){
  return needs.length ? '<ul class="mc-needs">' + needs.map(function(n){ return '<li class="mc-need' + (n.urgent ? ' urgent' : '') + '"><span class="mc-need-ic" aria-hidden="true">' + n.icon + '</span><div class="mc-need-t"><a href="' + esc(n.href) + '">' + esc(n.text) + '</a>' + (n.sub ? '<span>' + esc(n.sub) + '</span>' : '') + '</div>' +
    (n.urgent && isNum(n.at) ? '<span class="mc-chip warn"><span aria-hidden="true">!</span> ' + esc(C.fmtDay(n.at)) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="mc-calm">Nothing needs you right now.</p>';
}
function roadmapCard(p, rm, href){
  var P = C.P, st = stagesOf(rm);
  if(!st.all.length) return p.card({ title: 'Your roadmap', span: 6, empty: H().empty('No roadmap yet - it lays out your stages and what “done” looks like for each.', href, 'Build your roadmap') });
  return p.card({ title: 'Your roadmap', sub: 'Stages and where each stands', span: 6,
    spec: { type: 'stack', label: 'Roadmap stages', segs: [{ label: '✓ Done', value: st.done, color: P.ord[4] }, { label: 'In progress', value: st.doing, color: P.cat[0] }, { label: 'Planned', value: st.all.length - st.done - st.doing, color: P.other }] },
    body: '<ul class="mc-steps" style="margin-top:12px">' + st.all.map(function(m, i){ var s = m.status === 'done' ? 'done' : m.status === 'in_progress' ? 'doing' : 'todo'; return '<li class="st-' + s + '"><span class="mc-chip ' + (s === 'done' ? 'good' : '') + '">' + (s === 'done' ? '✓ Done' : s === 'doing' ? 'In progress' : 'Planned') + '</span><span>' + esc(m.title || ('Stage ' + (m.stage || i + 1))) + '</span></li>'; }).join('') + '</ul>',
    foot: st.done + ' of ' + H().plural(st.all.length, 'stage') + ' done. ' + H().link(href, 'Open your roadmap') });
}
function journalCard(p, journal, href, span){
  var rg = p.rg, bk = H().buckets(rg), j = journal.filter(function(x){ return MD.inRange(x.at, rg); });
  return p.card({ title: 'Your journal', sub: 'Waypoint entries per ' + rg.gran, span: span || 6,
    spec: { type: 'columns', label: 'Journal entries', labels: bk.labels, tipTitles: bk.titles, series: [{ label: 'Entries', values: MD.countIn(j.map(function(x){ return x.at; }), bk.b), color: C.P.cat[6] }] },
    empty: j.length ? null : H().empty('No journal entries in ' + H().rangeWords() + '.', href, 'Open Waypoint') });
}
function comingUp(p, list, lanesDef, opts){
  var P = C.P, now = p.D.now, from = MD.util.startOfDay(now), to = now + opts.days * DAY;
  var items = list.filter(function(e){ return e.status === 'upcoming' && isNum(e.at) && e.at >= from && e.at <= to; });
  var keys = Object.keys(lanesDef);
  var lanes = keys.filter(function(k){ return items.some(function(e){ return (lanesDef[e.type] ? e.type : 'other') === k; }); }).map(function(k){ return { key: k, label: lanesDef[k], color: P.cat[keys.indexOf(k)] }; });
  return p.card({ title: 'Coming up', sub: opts.sub, span: opts.span || 7,
    spec: { type: 'timeline', label: 'Upcoming events', from: from, to: to, now: now, lanes: lanes, items: items.map(function(e){ return { at: e.at, lane: lanesDef[e.type] ? e.type : 'other', label: e.title, sub: e.org }; }) },
    empty: items.length ? null : H().empty(opts.empty, opts.href, opts.cta), foot: opts.foot || '' });
}

/* ======================================================================
   ATHLETE
   ====================================================================== */
var EV = { tryout: 'Tryouts', camp: 'Camps', combine: 'Combines', application_deadline: 'Application deadlines', other: 'Other events' };
var OUT = { made_it: 'Made it', tryout: 'Got a tryout', waitlisted: 'Waitlisted', no: 'Not this time' };
function athleteEvents(D){
  var ev = [];
  D.apps.forEach(function(a){ if(a.sentAt) ev.push({ at: a.sentAt, part: 'Applications sent' }); });
  D.outreach.forEach(function(o){ if(o.sentAt) ev.push({ at: o.sentAt, part: 'Coach outreach sent' }); else if(o.createdAt) ev.push({ at: o.createdAt, part: 'Outreach drafted' }); });
  D.outcomes.forEach(function(o){ if(o.at) ev.push({ at: o.at, part: 'Outcomes logged' }); });
  D.events.forEach(function(e){ if(e.status === 'attended' && e.at) ev.push({ at: e.at, part: 'Events attended' }); });
  D.clips.forEach(function(c){ if(c.madeAt) ev.push({ at: c.madeAt, part: 'Clips marked' }); });
  D.journal.forEach(function(j){ ev.push({ at: j.at, part: 'Journal entries' }); });
  return ev.filter(function(e){ return isNum(e.at); }).map(function(e){ e.mine = true; return e; });
}
function matchNote(D){
  if(D.matchSource === 'demo') return 'Scored on Kaidostar’s demo listings - ' + H().link('login.html', 'sign in') + ' to see programs matched to your account.';
  if(D.matchError) return 'Couldn’t load your matched programs just now. <button type="button" class="mc-inline" data-act="refresh">Try again</button>';
  return 'The programs your Opportunities page matches to you' + (D.matchAt ? ', read ' + esc(MD.timeAgo(D.matchAt, D.now)) : '') + (D.matchStale ? ' (couldn’t refresh just now)' : '') + '.';
}
function athleteToday(p){
  var D = p.D, P = C.P, now = D.now, rg = p.rg, h = H();
  if(!D.hasProfile) return noProfile(p, 'athlete', 'athlete-survey.html');
  var upcoming = D.events.filter(function(e){ return e.status === 'upcoming' && isNum(e.at) && e.at >= MD.util.startOfDay(now); }).sort(function(a, b){ return a.at - b.at; });
  var soon = upcoming.filter(function(e){ return e.at - now <= 14 * DAY; });
  var drafts = D.outreach.filter(function(o){ return o.status !== 'sent'; });
  var review = D.apps.filter(function(a){ return a.status === 'pending_review'; });
  var needs = [];
  soon.forEach(function(e){ needs.push({ icon: '⏳', text: e.title + (e.org ? ' - ' + e.org : ''), sub: (EV[e.type] || 'Event').replace(/s$/, '') + ' on ' + C.fmtFull(e.at), href: 'athlete-dashboard.html', urgent: e.at - now < 4 * DAY, at: e.at }); });
  var passed = D.events.filter(function(e){ return e.status === 'upcoming' && isNum(e.at) && e.at < MD.util.startOfDay(now); });
  if(passed.length) needs.push({ icon: '✓', text: h.plural(passed.length, 'event') + ' ha' + (passed.length === 1 ? 's' : 've') + ' passed - how did ' + (passed.length === 1 ? 'it' : 'they') + ' go?', sub: 'Mark ' + (passed.length === 1 ? 'it' : 'each') + ' attended or missed so your record stays true', href: 'athlete-dashboard.html' });
  if(review.length) needs.push({ icon: '✎', text: h.plural(review.length, 'application') + ' to review', sub: 'Drafted and waiting for you', href: 'athlete-dashboard.html' });
  if(drafts.length) needs.push({ icon: '✉', text: h.plural(drafts.length, 'coach email') + ' drafted, not sent', sub: 'Send them from the Workshop', href: 'athlete-workshop.html' });
  var sent = D.apps.filter(function(a){ return MD.inRange(a.sentAt, rg); }), osent = D.outreach.filter(function(o){ return MD.inRange(o.sentAt, rg); });
  var st = stagesOf(D.roadmap), best = D.matches.reduce(function(m, x){ return isNum(x.pct) && x.pct > m ? x.pct : m; }, -1);
  var kp = p.kpis([
    p.kpi({ label: 'Programs matched', value: D.matchError && !D.matches.length ? '–' : C.fmtN(D.matches.length), sub: D.matchError && !D.matches.length ? 'couldn’t load just now' : D.matchSource === 'demo' ? 'from demo listings' : best >= 0 ? 'strongest ' + Math.round(best) + '%' : 'update your profile to match' }),
    p.kpi({ label: 'Applications sent', value: C.fmtN(sent.length), sub: 'in ' + h.rangeWords() }),
    p.kpi({ label: 'Coach emails sent', value: C.fmtN(osent.length), sub: h.plural(drafts.length, 'draft') + ' not sent' }),
    p.kpi({ label: 'Events coming up', value: C.fmtN(upcoming.length), sub: soon.length ? soon.length + ' in the next two weeks' : 'none in the next two weeks' }),
    p.kpi({ label: 'Saved programs', value: C.fmtN(D.saved) }),
    p.kpi({ label: 'Roadmap', value: st.all.length ? st.done + ' / ' + st.all.length : '–', sub: st.all.length ? 'stages done' : 'not built yet' })
  ]);
  var cards = [];
  cards.push(comingUp(p, D.events, EV, { days: 60, span: 7, sub: 'Your tryouts, camps, combines and deadlines in the next two months', empty: 'No upcoming events. Add tryouts, camps and deadlines from your Opportunities page.', href: 'athlete-dashboard.html', cta: 'Open Opportunities' }));
  var top = D.matches.slice().sort(function(a, b){ return (b.pct || 0) - (a.pct || 0); }).slice(0, 5);
  cards.push(p.card({ title: 'Best fits right now', sub: 'Programs matched to your sport, level and direction', span: 5,
    body: top.length ? '<ol class="mc-rank" style="grid-template-columns:1fr">' + top.map(function(m){ return '<li><span class="mc-rank-v">' + (isNum(m.pct) ? Math.round(m.pct) : '–') + '</span><div><b>' + esc(m.title) + '</b><span>' + esc([m.org, m.loc].filter(Boolean).join(' - ')) + '</span></div></li>'; }).join('') + '</ol>' : '',
    empty: top.length ? null : (D.matchError ? '<p>Couldn’t load your matched programs just now.</p><button type="button" class="mc-btn ghost" data-act="refresh">Try again</button>' : h.empty('No programs matched yet.', 'athlete-dashboard.html', 'Open Opportunities')),
    foot: matchNote(D) + ' ' + h.link('athlete-dashboard.html', 'See every opportunity') }));
  var ev = athleteEvents(D), days = MD.days(ev, rg.from, rg.to), wide = !(D.timeline && D.timeline.note) || rg.days > 190;
  cards.push(p.card({ title: 'Your activity', sub: 'Each day of ' + h.rangeWords() + ' - applications, outreach, events, clips and journal entries', span: wide ? 12 : 6, spec: { type: 'calendar', label: 'Activity calendar', from: rg.from, to: rg.to, days: days, unit: 'things done' },
    empty: Object.keys(days).length ? null : h.empty('Nothing in ' + h.rangeWords() + ' yet.') }));
  if(D.timeline && D.timeline.note) cards.push(p.card({ title: 'Your recruiting window', sub: 'Where your class is in the recruiting calendar', span: wide ? 12 : 6, body: '<p class="mc-calm">' + esc(D.timeline.note) + '</p>', foot: 'Worked out from the graduation year in your profile. ' + h.link('athlete-survey.html', 'Update it') }));
  var acting = needs.length;
  p.status = (acting ? h.plural(acting, 'thing') + ' need' + (acting === 1 ? 's' : '') + ' you. ' : 'Nothing needs you right now. ') + (upcoming.length ? h.plural(upcoming.length, 'event') + ' coming up.' : 'No events coming up.');
  var noMatches = D.matchError && !D.matches.length;
  p.points.push((noMatches ? 'Your matched programs couldn’t be loaded just now' : bp(D.matches.length, 'program') + ' matched' + (D.matchSource === 'demo' ? ' (demo listings)' : '')) + '; ' + bp(sent.length, 'application') + ' and ' + bp(osent.length, 'coach email') + ' sent in ' + h.rangeWords() + '.');
  if(soon.length) p.points.push('Next: <b>' + esc(soon[0].title) + '</b> on ' + esc(C.fmtDay(soon[0].at)) + '.');
  p.snap.push('Athlete: ' + [D.profile.sport, D.profile.level, D.profile.position, D.profile.careerDirection].filter(Boolean).join(', '), (noMatches ? 'Programs matched: could not be loaded' : 'Programs matched ' + D.matches.length + (D.matchSource === 'demo' ? ' (demo listings)' : '')) + ', applications sent ' + sent.length + ', coach emails sent ' + osent.length + ', drafts ' + drafts.length, 'Upcoming events ' + upcoming.length + (soon.length ? ', next ' + soon[0].title + ' on ' + C.fmtDay(soon[0].at) : ''));
  return '<section class="mc-sec mc-hero"><div class="mc-sec-h"><h2>Needs you</h2></div>' + needsList(needs) + '</section>' + kp + p.section('What’s next', '', cards);
}
function athleteRecruiting(p){
  var D = p.D, P = C.P, rg = p.rg, h = H(), bk = h.buckets(rg);
  if(!D.hasProfile) return noProfile(p, 'athlete', 'athlete-survey.html');
  var all = D.apps, sent = all.filter(function(a){ return a.sentAt || a.status === 'sent'; });
  var withOut = sent.filter(function(a){ return a.outcome; }), made = withOut.filter(function(a){ return a.outcome === 'made_it'; }).length, good = withOut.filter(function(a){ return a.outcome === 'made_it' || a.outcome === 'tryout'; }).length;
  var c1 = [], c2 = [], c3 = [];
  c1.push(p.card({ title: 'From application to a spot', sub: 'Every program you applied to, and how far it got', span: 6,
    spec: { type: 'funnel', label: 'Applications by stage', stages: [{ label: 'Prepared', value: all.length }, { label: 'Sent', value: sent.length }, { label: 'Tryout or better', value: good }, { label: 'Made it', value: made }] },
    empty: all.length ? null : h.empty('No applications yet. Prepare one from a program on your Opportunities page.', 'athlete-dashboard.html', 'Open Opportunities') }));
  var oc = {}; D.outcomes.forEach(function(o){ oc[o.outcome] = (oc[o.outcome] || 0) + 1; });
  c1.push(p.card({ title: 'How it went', sub: 'The outcomes you logged', span: 6,
    spec: { type: 'stack', label: 'Outcomes', segs: [{ label: OUT.made_it, value: oc.made_it || 0, color: P.ord[4] }, { label: OUT.tryout, value: oc.tryout || 0, color: P.ord[3] }, { label: OUT.waitlisted, value: oc.waitlisted || 0, color: P.ord[1] }, { label: OUT.no, value: oc.no || 0, color: P.other }] },
    empty: D.outcomes.length ? null : h.empty('No outcomes logged yet. Log how each one went on your Opportunities page.') }));
  var od = D.outreach.filter(function(o){ return MD.inRange(o.createdAt, rg); }), os = D.outreach.filter(function(o){ return MD.inRange(o.sentAt, rg); });
  c2.push(p.card({ title: 'Coach outreach', sub: 'Emails to coaches drafted and sent, per ' + rg.gran, span: 6,
    spec: { type: 'columns', label: 'Coach outreach', labels: bk.labels, tipTitles: bk.titles, series: [{ label: 'Drafted', values: MD.countIn(od.map(function(o){ return o.createdAt; }), bk.b), color: P.cat[3] }, { label: 'Sent', values: MD.countIn(os.map(function(o){ return o.sentAt; }), bk.b), color: P.cat[0] }] },
    empty: od.length || os.length ? null : h.empty('No coach outreach in ' + h.rangeWords() + '. The Workshop drafts emails and call scripts for the coaches you name.', 'athlete-workshop.html', 'Open the Workshop') }));
  var et = {}; D.events.forEach(function(e){ var k = EV[e.type] ? e.type : 'other'; et[k] = (et[k] || 0) + 1; });
  c2.push(p.card({ title: 'Your events', sub: 'Tryouts, camps, combines and deadlines you’ve tracked', span: 6,
    spec: { type: 'bars', label: 'Events by kind', rows: Object.keys(EV).filter(function(k){ return et[k]; }).map(function(k){ return { label: EV[k], value: et[k], color: P.cat[Object.keys(EV).indexOf(k)] }; }), valueLabel: 'Events' },
    empty: D.events.length ? null : h.empty('No events tracked yet.', 'athlete-dashboard.html', 'Add an event') }));
  var es = { attended: 0, upcoming: 0, passed: 0, missed: 0 }; D.events.forEach(function(e){ es[e.status] = (es[e.status] || 0) + 1; });
  c3.push(p.card({ title: 'Showing up', sub: 'Your events by what happened', span: 4,
    spec: { type: 'stack', label: 'Events by status', segs: [{ label: 'Attended', value: es.attended, color: P.ord[4] }, { label: 'Coming up', value: es.upcoming, color: P.cat[0] }, { label: 'Passed', value: es.passed, color: P.other }, { label: 'Missed', value: es.missed, color: '#4a4e7a' }] },
    empty: D.events.length ? null : h.empty('No events tracked yet.') }));
  var fb = [0, 0, 0, 0, 0], scored = D.matches.filter(function(m){ return isNum(m.pct); });
  scored.forEach(function(m){ var v = m.pct; fb[v >= 90 ? 4 : v >= 80 ? 3 : v >= 70 ? 2 : v >= 60 ? 1 : 0]++; });
  c3.push(p.card({ title: 'How well programs fit', sub: 'The programs matched to you, by fit', span: 4,
    spec: { type: 'hist', label: 'Programs by fit', labels: ['Under 60', '60-69', '70-79', '80-89', '90+'], values: fb, seriesLabel: 'Programs', colors: P.ord.slice(0, 5) },
    empty: scored.length ? null : h.empty(D.matchError ? 'Couldn’t load your matched programs just now.' : 'No programs matched yet.'), foot: matchNote(D) }));
  var tc = {}; D.matches.forEach(function(m){ m.terms.forEach(function(t){ tc[t] = (tc[t] || 0) + 1; }); });
  var tRows = Object.keys(tc).sort(function(a, b){ return tc[b] - tc[a] || (a < b ? -1 : 1); }).slice(0, 8).map(function(t){ return { label: t, value: tc[t], color: P.cat[0] }; });
  c3.push(p.card({ title: 'What’s matching you', sub: 'The parts of your profile programs matched on', span: 4,
    spec: { type: 'bars', label: 'Matched terms', rows: tRows, valueLabel: 'Programs' },
    empty: tRows.length ? null : (D.matchError && !D.matches.length ? h.empty('Couldn’t load your matched programs just now.') : h.empty('Nothing matched on yet - the sport, level, position and achievements in your profile are what programs match on.', 'athlete-survey.html', 'Update your profile')) }));
  p.status = h.plural(sent.length, 'application') + ' sent, ' + h.plural(D.outcomes.length, 'outcome') + ' logged' + (made ? ', ' + made + ' made it' : '') + '.';
  p.points.push('<b>' + sent.length + '</b> sent; <b>' + good + '</b> reached a tryout or better.');
  if(tRows.length) p.points.push('Programs match you most on <b>' + esc(tRows[0].label) + '</b>' + (tRows[1] ? ' and <b>' + esc(tRows[1].label) + '</b>' : '') + '.');
  p.snap.push('Applications ' + all.length + ', sent ' + sent.length + ', tryout or better ' + good + ', made it ' + made, 'Outreach drafted ' + od.length + ', sent ' + os.length + ' in range',
    'Events: ' + Object.keys(et).map(function(k){ return EV[k] + ' ' + et[k]; }).join(', '), 'Matched on: ' + tRows.map(function(r){ return r.label + ' ' + r.value; }).join(', '));
  return p.section('Your applications', '', c1) + p.section('Outreach and events', '', c2) + p.section('How programs see you', '', c3);
}
function athleteProgress(p){
  var D = p.D, P = C.P, rg = p.rg, h = H(), bk = h.buckets(rg);
  if(!D.hasProfile) return noProfile(p, 'athlete', 'athlete-survey.html');
  var cards = [roadmapCard(p, D.roadmap, 'athlete-roadmap.html'), journalCard(p, D.journal, 'athlete-waypoint.html')];
  var att = D.events.filter(function(e){ return e.status === 'attended' && MD.inRange(e.at, rg); }), mis = D.events.filter(function(e){ return e.status === 'missed' && MD.inRange(e.at, rg); });
  cards.push(p.card({ title: 'Events over time', sub: 'Events you attended and missed, per ' + rg.gran, span: 6,
    spec: { type: 'columns', label: 'Events attended and missed', labels: bk.labels, tipTitles: bk.titles, series: [{ label: 'Attended', values: MD.countIn(att.map(function(e){ return e.at; }), bk.b), color: P.cat[2] }, { label: 'Missed', values: MD.countIn(mis.map(function(e){ return e.at; }), bk.b), color: P.cat[1] }] },
    empty: att.length || mis.length ? null : h.empty('No attended or missed events in ' + h.rangeWords() + '. Mark each event on your Opportunities page once it’s happened.', 'athlete-dashboard.html', 'Open Opportunities') }));
  // the clip planner: footage marked on the athlete's own video (it never leaves their computer)
  var segs = {}, total = 0;
  D.clips.forEach(function(c){ var k = c.seg != null ? 's' + c.seg : 'none'; var g = segs[k] || (segs[k] = { idx: c.seg, label: c.label, n: 0, secs: 0 }); g.n++; g.secs += c.secs; total += c.secs; });
  var segRows = Object.keys(segs).map(function(k){ return segs[k]; }).sort(function(a, b){ return (a.idx == null ? 1e9 : a.idx) - (b.idx == null ? 1e9 : b.idx); })
    .map(function(g){ var name = g.idx != null ? 'Segment ' + (g.idx + 1) : 'No segment'; var desc = g.label ? g.label.replace(/^Segment \d+:\s*/, '') : ''; return { label: name, value: g.secs, text: clock(g.secs) + ' - ' + h.plural(g.n, 'clip'), sub: desc, color: g.idx != null ? P.cat[0] : P.other }; });
  cards.push(p.card({ title: 'Your highlight reel plan', sub: 'Seconds of footage you’ve marked for each part of your reel', span: 6,
    spec: { type: 'bars', label: 'Footage by reel segment', rows: segRows, valueLabel: 'Seconds' },
    empty: segRows.length ? null : h.empty('No clips marked yet. The Workshop’s clip planner marks in and out points on your own video - it never leaves your computer.', 'athlete-workshop.html', 'Open the Workshop'),
    foot: D.clips.length ? h.plural(D.clips.length, 'clip') + ', ' + clock(total) + ' in all.' : '' }));
  var st = stagesOf(D.roadmap);
  p.status = (st.all.length ? st.done + ' of ' + st.all.length + ' roadmap ' + (st.all.length === 1 ? 'stage' : 'stages') + ' done. ' : 'No roadmap yet. ') + (D.clips.length ? clock(total) + ' of footage marked for your reel.' : '');
  p.points.push(st.all.length ? '<b>' + st.done + ' of ' + st.all.length + '</b> roadmap ' + (st.all.length === 1 ? 'stage' : 'stages') + ' done.' : 'Build a roadmap to track your stages.');
  if(D.clips.length) p.points.push('<b>' + clock(total) + '</b> of footage marked across ' + bp(D.clips.length, 'clip') + '.');
  p.snap.push('Roadmap ' + st.done + '/' + st.all.length + ', journal entries ' + D.journal.length + ', clips ' + D.clips.length + ' (' + clock(total) + ')', 'Events attended ' + att.length + ', missed ' + mis.length + ' in range');
  return p.section('Progress', '', cards);
}

/* ======================================================================
   STUDENT
   ====================================================================== */
var SEV = { deadline: 'Deadlines', competition: 'Competitions', internship: 'Internships', test: 'Tests', other: 'Other' };
function readySourceNote(D){ return 'Worked out with the scoring your Opportunities page uses, ' + (D.readySource === 'account' ? 'from the evidence on your account.' : 'from what this browser holds' + (D.signedIn ? ' - your account’s copy couldn’t be read just now.' : '.')); }
function bandSummary(schools){
  var by = {}; schools.forEach(function(s){ (by[s.band] = by[s.band] || []).push(s.name); });
  return Object.keys(by).map(function(b){ var n = by[b]; return '<b>' + esc(b) + '</b> at ' + esc(n.length > 2 ? n.slice(0, 2).join(', ') + ' and ' + (n.length - 2) + ' more' : n.join(' and ')); }).join('; ');
}
function studentToday(p){
  var D = p.D, P = C.P, now = D.now, rg = p.rg, h = H();
  if(!D.hasProfile) return noProfile(p, 'student', 'survey.html');
  var schools = D.ready && D.ready.schools || [], line = D.line;
  var scoreNow = schools.length ? Math.round(schools.reduce(function(s, x){ return s + x.score; }, 0) / schools.length) : null;
  var back = line.filter(function(s){ return s.at <= now - 30 * DAY; }), base = back.length ? back[back.length - 1] : line[0];
  var today0 = MD.util.startOfDay(now);
  var up = D.events.filter(function(e){ return e.status === 'upcoming' && (!isNum(e.at) || e.at >= today0); }).sort(function(a, b){ return (isNum(a.at) ? a.at : 9e15) - (isNum(b.at) ? b.at : 9e15); });
  var overdue = D.events.filter(function(e){ return e.status === 'upcoming' && isNum(e.at) && e.at < today0; });
  var st = stagesOf(D.roadmap), bal = D.balance;
  var needs = [];
  up.slice(0, 3).forEach(function(e){ needs.push({ icon: '⏳', text: e.title + (e.org ? ' - ' + e.org : ''), sub: (isNum(e.at) ? C.fmtFull(e.at) : (e.when || 'No date yet')) + ' - ' + (SEV[e.type] || 'Event').replace(/s$/, ''), href: 'admissions-schedule.html', urgent: isNum(e.at) && e.at >= MD.util.startOfDay(now) && e.at - now < 4 * DAY, at: e.at }); });
  if(overdue.length) needs.push({ icon: '✓', text: h.plural(overdue.length, 'schedule item') + (overdue.length === 1 ? ' has passed its date' : ' have passed their dates'), sub: 'Mark how ' + (overdue.length === 1 ? 'it' : 'they') + ' went on your schedule', href: 'admissions-schedule.html' });
  if(bal && bal.risk) needs.push({ icon: '◎', text: bal.verdict, sub: String(bal.risk), href: 'admissions-dashboard.html' });
  var reach = schools.filter(function(s){ return s.tier === 'reach'; })[0] || schools[0];
  if(reach && reach.nextMove) needs.push({ icon: '↗', text: 'Next move for ' + reach.name, sub: reach.nextMove, href: 'admissions-dashboard.html' });
  var dl = isNum(scoreNow) && base && base.at < now - 2 * DAY ? Math.round(scoreNow - base.avg) : null;
  var kp = p.kpis([
    p.kpi({ label: 'Readiness score', value: isNum(scoreNow) ? String(scoreNow) : '–', sub: 'out of 100 - the same at every school', delta: isNum(dl) ? { dir: dl > 0 ? 'up' : dl < 0 ? 'down' : 'flat', text: (dl > 0 ? '+' : '') + dl + ' since ' + C.fmtDay(base.at), good: dl === 0 ? null : true } : null }),
    p.kpi({ label: 'Schools on your list', value: C.fmtN(schools.length), sub: bal && bal.counts ? bal.counts.reach + ' reach - ' + bal.counts.target + ' target - ' + bal.counts.likely + ' likely' : '' }),
    p.kpi({ label: 'Your list', value: bal ? bal.verdict : '–', sub: bal ? 'the shape of your list' : 'add schools to check it' }),
    p.kpi({ label: 'Coming up', value: C.fmtN(up.length), sub: 'deadlines and events' }),
    p.kpi({ label: 'Roadmap', value: st.all.length ? st.done + ' / ' + st.all.length : '–', sub: st.all.length ? 'stages done' : 'not built yet' }),
    p.kpi({ label: 'Milestones', value: C.fmtN(D.miles.length), sub: D.miles.length ? 'latest ' + C.fmtDay(D.miles[D.miles.length - 1].at) : 'none yet' })
  ]);
  var cards = [];
  var inR = line.filter(function(s){ return MD.inRange(s.at, rg); });
  if(inR.length > 1){
    cards.push(p.card({ title: 'Your readiness over time', sub: 'Your readiness score, recorded as your evidence changes - ' + h.rangeWords(), span: 8,
      spec: { type: 'line', label: 'Readiness over time', area: true, labels: inR.map(function(s){ return C.fmtDay(s.at); }), tipTitles: inR.map(function(s){ return C.fmtFull(s.at); }), times: inR.map(function(s){ return s.at; }), markers: inR.length < 20 ? 'all' : 'last', yMin: 0, yMax: 100,
        refs: [{ y: 25 }, { y: 50 }, { y: 72 }], series: [{ label: 'Readiness', values: inR.map(function(s){ return s.avg; }), color: P.cat[0] }] },
      foot: 'An evidence score - what you’ve done that schools reward - never a chance of admission. The faint lines at 25, 50 and 72 are where your band changes. ' + (D.lineSource === 'account' ? 'Recorded by your account.' : 'Recorded in this browser.') }));
  } else cards.push(p.card({ title: 'Your readiness over time', span: 8, empty: h.empty(line.length > 1 ? 'No readings in ' + h.rangeWords() + ' - try a longer range.' : 'Your Opportunities page records your readiness as your evidence changes; the line starts after the second reading.', 'admissions-dashboard.html', 'Open Opportunities') }));
  var bc = bal && bal.counts ? bal.counts : null;
  cards.push(p.card({ title: 'Your list’s shape', sub: 'Reach, target and likely schools - by selectivity and your readiness', span: 4,
    spec: { type: 'stack', label: 'Schools by category', segs: bc ? [{ label: 'Reach', value: bc.reach || 0, color: P.cat[1] }, { label: 'Target', value: bc.target || 0, color: P.cat[0] }, { label: 'Likely', value: bc.likely || 0, color: P.cat[2] }] : [] },
    empty: bc && bc.total ? null : h.empty('Add your target schools in the survey to check your list.', 'survey.html', 'Add schools'), foot: bal ? esc(bal.verdictNote) : '' }));
  var wideS = rg.days > 190;
  cards.push(comingUp(p, D.events, SEV, { days: 90, span: wideS ? 12 : 6, sub: 'Deadlines, competitions, internships and tests on your schedule in the next three months', empty: 'Nothing dated in the next three months. Add deadlines and competitions to your schedule and they line up here.', href: 'admissions-schedule.html', cta: 'Open your schedule',
    foot: up.some(function(e){ return !isNum(e.at); }) ? h.plural(up.filter(function(e){ return !isNum(e.at); }).length, 'item') + ' on your schedule ha' + (up.filter(function(e){ return !isNum(e.at); }).length === 1 ? 's' : 've') + ' no date yet.' : '' }));
  var ev = [];
  D.miles.forEach(function(m){ ev.push({ at: m.at, part: 'Milestones', mine: true }); }); D.journal.forEach(function(j){ ev.push({ at: j.at, part: 'Journal entries', mine: true }); });
  D.tracked.forEach(function(t){ if(t.outcomeAt) ev.push({ at: t.outcomeAt, part: 'Outcomes logged', mine: true }); if(t.madeAt) ev.push({ at: t.madeAt, part: 'Opportunities tracked', mine: true }); });
  D.events.forEach(function(e){ if(e.madeAt) ev.push({ at: e.madeAt, part: 'Events added', mine: true }); });
  var days = MD.days(ev.filter(function(e){ return isNum(e.at); }), rg.from, rg.to);
  cards.push(p.card({ title: 'Your activity', sub: 'Each day of ' + h.rangeWords() + ' - milestones, tracking, schedule and journal', span: wideS ? 12 : 6, spec: { type: 'calendar', label: 'Activity calendar', from: rg.from, to: rg.to, days: days, unit: 'things done' },
    empty: Object.keys(days).length ? null : h.empty('Nothing in ' + h.rangeWords() + ' yet.') }));
  var acting = needs.length;
  p.status = (acting ? h.plural(acting, 'thing') + ' need' + (acting === 1 ? 's' : '') + ' you. ' : '') + (isNum(scoreNow) ? 'Readiness ' + scoreNow + ' of 100. ' : '') + (bal ? bal.verdict + '. ' : '') + (up.length ? h.plural(up.length, 'deadline or event', 'deadlines and events') + ' coming up.' : 'Nothing on your schedule yet.');
  if(isNum(scoreNow)) p.points.push('Readiness <b>' + scoreNow + '</b> of 100 - ' + bandSummary(schools) + '.');
  if(bal && bal.verdict) p.points.push('Your list: <b>' + esc(bal.verdict) + '</b>.');
  if(reach && reach.nextMove) p.points.push('Next move for ' + esc(reach.name) + ': ' + esc(reach.nextMove));
  p.snap.push('Student: ' + [D.profile.intendedMajor, D.profile.gradeLevel].filter(Boolean).join(', '), 'Readiness ' + scoreNow + ' of 100 over ' + schools.length + ' schools; bands: ' + schools.map(function(s){ return s.name + ' ' + s.band; }).join(', '),
    bal && bc ? 'List: ' + bal.verdict + ' (' + bc.reach + ' reach, ' + bc.target + ' target, ' + bc.likely + ' likely)' : '', 'Upcoming deadlines and events ' + up.length);
  return '<section class="mc-sec mc-hero"><div class="mc-sec-h"><h2>Needs you</h2></div>' + needsList(needs) + '</section>' + kp + p.section('How it’s going', '', cards);
}
function studentSchools(p){
  var D = p.D, P = C.P, h = H();
  if(!D.hasProfile) return noProfile(p, 'student', 'survey.html');
  var schools = D.ready && D.ready.schools || [], bal = D.balance;
  var catOf = {}; (bal && bal.schools || []).forEach(function(s){ catOf[s.name] = s.cat; });
  var CAT = { reach: P.cat[1], target: P.cat[0], likely: P.cat[2] }, CATL = { reach: 'Reach', target: 'Target', likely: 'Likely' };
  function cat(s){ var c = catOf[s.name]; return CAT[c] ? c : (s.tier === 'reach' ? 'reach' : 'target'); }
  var cards = [];
  var scoreNow = schools.length ? Math.round(schools.reduce(function(t, x){ return t + x.score; }, 0) / schools.length) : null;
  // the breakdown is only shown when it adds up to the score the person sees
  var pt = D.parts && isNum(scoreNow) && Math.abs(D.parts.score - scoreNow) <= 1 ? D.parts : null;
  var ptRows = pt ? pt.rows.map(function(r){ return { label: r.label, value: r.value, text: '+' + r.value, sub: r.have, color: P.cat[0], muted: !r.value }; }) : [];
  cards.push(p.card({ title: 'What your score is made of', sub: 'Points each kind of evidence adds to your readiness score' + (pt ? ' of ' + pt.score : ''), span: 6,
    spec: { type: 'bars', label: 'Readiness by kind of evidence', rows: ptRows, valueLabel: 'Points' },
    empty: ptRows.length ? null : (schools.length ? h.empty('The breakdown of your score isn’t available just now - your Opportunities page has the full read.', 'admissions-dashboard.html', 'Open Opportunities') : h.empty('Add target schools in the survey to see what your score is made of.', 'survey.html', 'Add schools')),
    foot: readySourceNote(D) }));
  var rates = schools.map(function(s){ var v = parseFloat(String(s.accept || '').replace(/[^0-9.]/g, '')); return { s: s, value: isFinite(v) ? v : null }; }).filter(function(r){ return r.value != null; }).sort(function(a, b){ return a.value - b.value; });
  var used = {}; rates.forEach(function(r){ used[cat(r.s)] = 1; });
  cards.push(p.card({ title: 'How selective your schools are', sub: 'Each school’s published admit rate - colour shows whether it’s a reach, target or likely for you', span: 6,
    spec: { type: 'bars', label: 'Admit rate by school', rows: rates.map(function(r){ var c = cat(r.s); var short = (/^~?\s*\d+(\.\d+)?%/.exec(String(r.s.accept)) || [r.s.accept])[0]; return { label: r.s.name, value: r.value, text: short, sub: CATL[c] + ' - ' + r.s.band + (short !== r.s.accept ? ' - ' + r.s.accept : ''), color: CAT[c] }; }), max: Math.max(10, Math.max.apply(null, rates.map(function(r){ return r.value; }).concat([0]))), valueLabel: 'Admit rate',
      legend: ['reach', 'target', 'likely'].filter(function(k){ return used[k]; }).map(function(k){ return { c: CAT[k], l: CATL[k], shape: 'rect' }; }) },
    empty: rates.length ? null : h.empty(schools.length ? 'No admit rates on file for your schools.' : 'Add target schools in the survey and each one is read against what it rewards.', schools.length ? '' : 'survey.html', 'Add schools') }));
  var rows = schools.map(function(s){ var f = s.academicFit, c = cat(s); return '<tr><th scope="row">' + esc(s.name) + '</th><td>' + esc(CATL[c]) + '</td><td>' + esc(s.accept || 'not published') + '</td><td>' + esc(s.band || '') + '</td><td>' + esc(f && f.band ? String(f.band).replace(/-/g, ' ') : 'add your GPA or test scores') + '</td></tr>'; }).join('');
  cards.push(p.card({ title: 'School by school', sub: 'Where you stand at each - the band your score earns at that school’s selectivity, and your grades against its range', span: 12,
    body: schools.length ? '<div class="mc-tbl-wrap"><table class="mcc-tbl"><caption>Your schools</caption><thead><tr><th scope="col">School</th><th scope="col">For you</th><th scope="col">Admit rate</th><th scope="col">Readiness band</th><th scope="col">Academic fit</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '',
    empty: schools.length ? null : h.empty('No schools yet.', 'survey.html', 'Add schools'), foot: 'Evidence scores and bands, not admission chances.' }));
  var moves = schools.filter(function(s){ return s.nextMove; });
  if(moves.length) cards.push(p.card({ title: 'Next move at each school', sub: 'The single highest-leverage step for each, from what that school rewards', span: 12,
    body: '<ol class="mc-goals">' + moves.map(function(s){ return '<li><b>' + esc(s.name) + '</b><span>' + esc(s.nextMove) + '</span></li>'; }).join('') + '</ol>' }));
  var top = pt ? pt.rows.filter(function(r){ return r.value; }).sort(function(a, b){ return b.value - a.value; })[0] : null, zero = pt ? pt.rows.filter(function(r){ return !r.value; }) : [];
  p.status = h.plural(schools.length, 'school') + ' on your list' + (bal && bal.verdict ? ' - ' + bal.verdict.toLowerCase() : '') + '.';
  if(top) p.points.push('Most of your score comes from <b>' + esc(top.label.toLowerCase()) + '</b> (+' + top.value + ').');
  if(zero.length) p.points.push('Not yet counting: ' + esc(zero.map(function(r){ return r.label.toLowerCase(); }).join(', ')) + '.');
  if(bal && bal.risk) p.points.push(esc(String(bal.risk)));
  p.snap.push('Schools: ' + schools.map(function(s){ return s.name + ' (' + cat(s) + ', ' + (s.accept || 'n/a') + ', ' + s.band + ')'; }).join('; '), pt ? 'Score parts: ' + pt.rows.map(function(r){ return r.label + ' +' + r.value; }).join(', ') : '');
  return p.section('Your schools', '', cards);
}
function studentProgress(p){
  var D = p.D, P = C.P, rg = p.rg, h = H();
  if(!D.hasProfile) return noProfile(p, 'student', 'survey.html');
  var cards = [];
  var ms2 = D.miles.filter(function(m){ return MD.inRange(m.at, rg); });
  cards.push(p.card({ title: 'Milestones', sub: 'Moments of real progress - crossing a readiness band, a first achievement, a stage done', span: 6,
    body: ms2.length ? '<ol class="mc-goals">' + ms2.slice(-10).reverse().map(function(m){ return '<li><b><span aria-hidden="true">' + esc(m.glyph) + '</span> ' + esc(m.title) + '</b><span>' + esc(C.fmtDay(m.at)) + (m.detail ? ' - ' + esc(m.detail) : '') + '</span></li>'; }).join('') + '</ol>' : '',
    empty: ms2.length ? null : h.empty(D.miles.length ? 'No milestones in ' + h.rangeWords() + ' - try a longer range.' : 'No milestones yet. They’re recorded as your readiness moves on your Opportunities page.', 'admissions-dashboard.html', 'Open Opportunities') }));
  cards.push(roadmapCard(p, D.roadmap, 'admissions-roadmap.html'));
  // what the evidence was at each reading this browser recorded
  var sn = D.snaps.filter(function(s){ return MD.inRange(s.at, rg); });
  var EVS = [{ k: 'achCount', l: 'Achievements' }, { k: 'competitions', l: 'Competitions' }, { k: 'internships', l: 'Experiences' }, { k: 'doneStages', l: 'Roadmap stages done' }];
  var evSeries = EVS.map(function(x, i){ return { label: x.l, values: sn.map(function(s){ return num(s.evidence[x.k]); }), color: P.cat[i] }; }).filter(function(sr){ return sr.values.some(function(v){ return v; }); });
  cards.push(p.card({ title: 'Your evidence over time', sub: 'What counted toward your readiness at each reading - ' + h.rangeWords(), span: 12,
    spec: { type: 'line', label: 'Evidence over time', labels: sn.map(function(s){ return C.fmtDay(s.at); }), tipTitles: sn.map(function(s){ return C.fmtFull(s.at); }), times: sn.map(function(s){ return s.at; }), markers: sn.length < 20 ? 'all' : 'last', yMin: 0, endLabels: evSeries.length <= 3, series: evSeries },
    empty: sn.length > 1 && evSeries.length ? null : h.empty(sn.length > 1 ? 'No achievements, competitions, experiences or finished stages counted yet.' : 'This fills in as your Opportunities page records readings in this browser.', 'admissions-dashboard.html', 'Open Opportunities'), foot: 'Readings recorded in this browser.' }));
  var oc = { accepted: 0, waitlisted: 0, rejected: 0, withdrew: 0, none: 0 }; D.tracked.forEach(function(t){ var k = oc.hasOwnProperty(t.outcome) ? t.outcome : 'none'; oc[k]++; });
  cards.push(p.card({ title: 'Opportunities you’re tracking', sub: 'Competitions, programs and internships - by outcome', span: 6,
    spec: { type: 'stack', label: 'Tracked opportunities by outcome', segs: [{ label: 'Accepted', value: oc.accepted, color: P.ord[4] }, { label: 'Waitlisted', value: oc.waitlisted, color: P.ord[2] }, { label: 'Not accepted', value: oc.rejected, color: P.ord[0] }, { label: 'Withdrew', value: oc.withdrew, color: '#4a4e7a' }, { label: 'Waiting', value: oc.none, color: P.other }] },
    empty: D.tracked.length ? null : h.empty('Track a competition or program from your Opportunities page.', 'admissions-dashboard.html', 'Open Opportunities') }));
  var et = {}; D.events.forEach(function(e){ var k = SEV[e.type] ? e.type : 'other'; et[k] = (et[k] || 0) + 1; });
  var es = { upcoming: 0, done: 0, missed: 0 }; D.events.forEach(function(e){ var k = e.status === 'upcoming' ? 'upcoming' : e.status === 'missed' ? 'missed' : 'done'; es[k]++; });
  cards.push(p.card({ title: 'Your schedule', sub: 'What’s on your calendar, by kind', span: 6,
    spec: { type: 'bars', label: 'Schedule by kind', rows: Object.keys(SEV).filter(function(k){ return et[k]; }).map(function(k){ return { label: SEV[k], value: et[k], color: P.cat[Object.keys(SEV).indexOf(k)] }; }), valueLabel: 'Items' },
    empty: D.events.length ? null : h.empty('Nothing on your schedule yet.', 'admissions-schedule.html', 'Open your schedule'), foot: D.events.length ? es.upcoming + ' still ahead, ' + es.done + ' done or passed' + (es.missed ? ', ' + es.missed + ' missed' : '') + '.' : '' }));
  cards.push(journalCard(p, D.journal, 'admissions-waypoint.html', 12));
  var st = stagesOf(D.roadmap);
  p.status = h.plural(D.miles.length, 'milestone') + ' so far' + (st.all.length ? '; ' + st.done + ' of ' + st.all.length + ' roadmap ' + (st.all.length === 1 ? 'stage' : 'stages') + ' done.' : '.');
  p.points.push(bp(D.miles.length, 'milestone') + '; ' + bp(D.tracked.length, 'opportunity', 'opportunities') + ' tracked' + (oc.accepted ? ', <b>' + oc.accepted + '</b> accepted' : '') + '.');
  if(D.miles.length) p.points.push('Latest: <b>' + esc(D.miles[D.miles.length - 1].title) + '</b> (' + esc(C.fmtDay(D.miles[D.miles.length - 1].at)) + ').');
  p.snap.push('Milestones ' + D.miles.length + ', roadmap ' + st.done + '/' + st.all.length + ', tracked ' + D.tracked.length + ' (accepted ' + oc.accepted + ')', 'Schedule: ' + Object.keys(et).map(function(k){ return SEV[k] + ' ' + et[k]; }).join(', '));
  return p.section('Progress', '', cards);
}

/* ------------------------------------------------------------------ the views each track gets */
async function safeGather(fn, role){
  try{ return await fn(); }
  catch(e){
    if(root.console) console.error('Mission Control (' + role + ') could not read its records', e);
    var now = Date.now(), sess = MD.session();
    return { role: role, now: now, signedIn: !!(sess && sess.user_id), uid: sess && sess.user_id || null, example: false, source: { server: false, missing: ['this browser’s records'], at: now, error: null }, hasProfile: false, profile: {},
      apps: [], outcomes: [], events: [], outreach: [], clips: [], matches: [], journal: [], miles: [], tracked: [], snaps: [], line: [], saved: 0, earliest: null };
  }
}
root.MISSION_ROLES = {
  gather: function(role){ return role === 'athlete' ? safeGather(gatherAthlete, 'athlete') : safeGather(gatherStudent, 'student'); },
  athlete: [{ id: 'today', label: 'Today', render: athleteToday }, { id: 'recruiting', label: 'Recruiting', render: athleteRecruiting }, { id: 'progress', label: 'Progress', render: athleteProgress }],
  student: [{ id: 'today', label: 'Today', render: studentToday }, { id: 'schools', label: 'Schools', render: studentSchools }, { id: 'progress', label: 'Progress', render: studentProgress }],
  _gatherAthlete: gatherAthlete, _gatherStudent: gatherStudent, _scoreParts: scoreParts, _utcMs: utcMs
};
})(typeof window !== 'undefined' ? window : globalThis);
