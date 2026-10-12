/* =========================================================================
   MISSION CONTROL - the data behind the pages.

   One read of the account (GET /mission/{uid}/overview) plus what this
   browser holds, merged by id, normalised into one dataset the pages chart.
   Everything here is counted from real records - nothing is estimated,
   smoothed into a "score" or filled in. Where a number needs more data to
   mean anything (a reply rate from three applications), the helpers say so
   (Wilson ranges, "enough" flags) instead of hiding it.

   The heavy parts load only when a page needs them:
     - the job market: the Job Search pool scored by the same engine Job
       Search uses (job-engine.js), summarised and cached for an hour,
     - interview progress and story coverage (interview-studio.js engine),
     - the resume score and callbacks per version (resume-studio.js engine).

   An example dataset (a fictional job seeker at fictional companies) exists
   for people with nothing to chart yet; the pages label it on every view.
   ========================================================================= */
(function(root){
'use strict';
var MD = {};
var DAY = 864e5, HOUR = 36e5;

/* ------------------------------------------------------------------ small, safe helpers */
function lsGet(k, d){ try{ var v = JSON.parse(root.localStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }
function lsSet(k, v){ try{ root.localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function arr(v){ return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object' && !Array.isArray(x); }) : []; }
function isNum(v){ return typeof v === 'number' && isFinite(v); }
function num(v){ return isNum(v) ? v : null; }
function str(v, n){ return typeof v === 'string' ? (n ? v.slice(0, n) : v) : ''; }
// any stored time (ms, seconds, ISO text, "YYYY-MM-DD") -> ms, or null
function ms(v){
  if(isNum(v)) return v > 1e12 ? v : (v > 1e9 ? v * 1000 : null);
  if(typeof v === 'string' && v){
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)){ var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
    var t = Date.parse(v); return isFinite(t) ? t : null;
  }
  return null;
}
// ids made as prefix + Date.now() (base 10 or 36) carry their creation time
function idTime(id){
  var s = String(id || ''), m = /(\d{13})/.exec(s);
  if(m){ var t = +m[1]; if(t > 1.4e12 && t < 4.1e12) return t; }
  var b = /^(?:x|hs|db|q|rv_|ss_)([0-9a-z]{8,9})/.exec(s);
  if(b){ var t2 = parseInt(b[1], 36); if(t2 > 1.4e12 && t2 < 4.1e12) return t2; }
  return null;
}
function byId(list){ var o = {}; list.forEach(function(x){ if(x && x.id != null) o[String(x.id)] = x; }); return o; }
// two lists of records, one per id: the first list wins (this browser's fuller copy), the second fills in
function unionById(first, second){
  var seen = {}, out = [];
  arr(first).concat(arr(second)).forEach(function(x){ var k = x.id != null ? String(x.id) : null; if(k == null){ out.push(x); return; } if(seen[k]) return; seen[k] = 1; out.push(x); });
  return out;
}
// when the account answered, it is the record: this browser's copy only stands in for the same record (it's fuller);
// a record only this browser has (another account's, on a shared computer) is left out
function accountFirst(local, server, useServer){
  if(!useServer) return unionById(local, server);
  var loc = byId(arr(local));
  return arr(server).map(function(x){ var k = x.id != null ? String(x.id) : null; return k && loc[k] ? loc[k] : x; });
}
// old or hand-edited browser records: the shapes the views rely on
function cleanSession(s){ if(!Array.isArray(s.turns)) s.turns = []; s.turns = s.turns.filter(function(t){ return t && typeof t === 'object'; }); if(s.dims && typeof s.dims !== 'object') s.dims = {}; if(s.delivery && typeof s.delivery !== 'object') s.delivery = null; return s; }
function cleanText(o, keys){ keys.forEach(function(k){ if(o[k] != null && typeof o[k] !== 'string') o[k] = typeof o[k] === 'number' ? String(o[k]) : ''; }); return o; }
function startOfDay(t){ var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function startOfWeek(t){ var d = new Date(startOfDay(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }   // Monday
function startOfMonth(t){ var d = new Date(startOfDay(t)); d.setDate(1); return d.getTime(); }
function addDays(t, n){ var d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }
function addMonths(t, n){ var d = new Date(t); d.setMonth(d.getMonth() + n); return d.getTime(); }
function median(a){ a = a.filter(isNum).slice().sort(function(x, y){ return x - y; }); if(!a.length) return null; var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function quantile(a, q){ a = a.filter(isNum).slice().sort(function(x, y){ return x - y; }); if(!a.length) return null; var p = (a.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return a[lo] + (a[hi] - a[lo]) * (p - lo); }
function mean(a){ a = a.filter(isNum); return a.length ? a.reduce(function(s, x){ return s + x; }, 0) / a.length : null; }
// 95% Wilson score interval for k of n, in percent - honest about small samples
function wilson(k, n){
  if(!n) return { lo: 0, hi: 0, p: 0 };
  var z = 1.96, ph = k / n, d = 1 + z * z / n, c = ph + z * z / (2 * n), r = z * Math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n));
  return { p: ph * 100, lo: Math.max(0, (c - r) / d * 100), hi: Math.min(100, (c + r) / d * 100) };
}
MD.util = { ms: ms, idTime: idTime, median: median, quantile: quantile, mean: mean, wilson: wilson, startOfDay: startOfDay, startOfWeek: startOfWeek, startOfMonth: startOfMonth, addDays: addDays, addMonths: addMonths, unionById: unionById, lsGet: lsGet };
MD.ENOUGH = 5;   // a rate from fewer than this many applications is shown as "early", never ranked

/* ------------------------------------------------------------------ labels (the same words the Auto and Job Search pages use) */
MD.L = {
  how: { email: 'Emailed', server: 'Submitted by Kaidostar', extension: 'Submitted in your browser', autopilot: 'Submitted by Autopilot', you: 'You submitted it', unknown: 'Not recorded' },
  handoff: { missing: 'Couldn’t find the form', hand_added: 'Added by you', closed: 'Posting closed', aggregator: 'Only on a job board', no_link: 'No link to apply',
    pro_only: 'Needs Pro to submit', consent: 'Needs your permission to submit', email_untrusted: 'Email address not trusted', extension: 'Waiting for the extension',
    extension_opened: 'You opened it in the extension', extension_clicked: 'Clicked submit - check it went through', email_limit: 'Daily email limit', no_resume: 'No resume on file',
    email_error: 'Email failed', submit_limit: 'Daily submit limit', person_step: 'A step only you can do', needs_you: 'Needs your answer', error: 'Something went wrong', interrupted: 'Interrupted' },
  step: { captcha: 'A CAPTCHA', login: 'A sign-in', account: 'An account to create', question: 'A question it couldn’t answer', site: 'The company’s own site', page: 'A page it couldn’t read' },
  need: { stretch: 'A stretch for you', answers: 'Answers missing', cover_letter: 'Cover letter to check', flagged: 'A claim to check in the letter', resume: 'No resume yet', fit_dropped: 'Fit dropped since', review: 'Review mode (you approve each)', stale: 'Approval went stale' },
  held: { fit: 'Below your fit bar', type: 'A type you turned off', confidence: 'Fit too uncertain', evergreen: 'Talent-pool posts', ghost: 'May not be a live opening', agency: 'Staffing agencies',
    repost: 'Reposted', keyword_excluded: 'Mentions an excluded word', aggregator: 'Job-board only', age: 'Too old', remote: 'Not remote', location: 'Outside your locations', industry: 'Outside your fields',
    size: 'Company size not stated', keyword_missing: 'Missing must-have words', salary: 'Pay under your floor', salary_missing: 'No pay stated', deadline: 'Not closing soon enough', company_limit: 'One role per company',
    applied: 'Already applied', closed: 'Closing date passed', never: 'On your never list', current_employer: 'Your current employer', unscored: 'Too thin to score' },
  dismiss: { too_senior: 'Too senior', too_junior: 'Too junior', location: 'Wrong place', salary: 'Pay too low', not_my_field: 'Not my field', skills: 'Skills don’t match', type: 'Wrong type of job', company: 'The company', other: 'Other' },
  outcome: { none: 'No reply yet', applied: 'No reply yet', rejected: 'Rejected', ghosted: 'No reply (gave up)', interview: 'Interview', offer: 'Offer' },
  kind: { skill: 'Learn', prove: 'Prove', credential: 'Earn', network: 'Network', apply: 'Apply', interview: 'Interview prep' },
  qtype: { tell: 'Tell me about yourself', behavioral: 'Behavioural', situational: 'Situational', explain: 'Explain your work', motivation: 'Motivation', role: 'Role & strengths', technical: 'Technical', closing: 'Closing' },
  dim: { structure: 'Structure', specificity: 'Specificity', ownership: 'Ownership', impact: 'Impact', relevance: 'Relevance', concision: 'Concision', delivery: 'Delivery' },
  difficulty: { fair: 'Fair', tough: 'Tough', brutal: 'Brutal' },
  decision: { strong_no_hire: 'Strong no hire', no_hire: 'No hire', lean_no_hire: 'Lean no hire', lean_hire: 'Lean hire', hire: 'Hire', strong_hire: 'Strong hire' },
  freshness: { new: 'New (0-2 days)', fresh: 'Fresh (3-7 days)', recent: 'Recent (8-21 days)', aging: 'Aging (22-45 days)', old: 'Old (45+ days)', unknown: 'Date not stated' },
  ghost: { low: 'Looks live', elevated: 'Some doubt', high: 'May not be live' },
  mode: { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site', unknown: 'Not stated' },
  source: { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', smartrecruiters: 'SmartRecruiters', workable: 'Workable', recruitee: 'Recruitee', usajobs: 'USAJOBS', adzuna: 'Adzuna', simplify: 'Simplify', manual: 'Added by hand' }
};

/* ------------------------------------------------------------------ the role (and the server's correction of it) */
MD.role = function(){
  var r = 'candidate';
  try{ r = root.localStorage.getItem('kaidostar_role') || 'candidate'; }catch(e){}
  return r === 'athlete' || r === 'student' ? r : 'candidate';
};
MD.session = function(){ try{ return (typeof root.getSession === 'function' && root.getSession()) || null; }catch(e){ return null; } };

/* ------------------------------------------------------------------ reading this browser */
function readLocal(uid){
  var jobOwner = lsGet('kaidostar_job_owner', null);
  var jobMine = !uid || !jobOwner || String(jobOwner) === String(uid);
  var planRec = lsGet('kaidostar_roadmap_plan', null);
  var plan = planRec && typeof planRec === 'object' && planRec.plan && (!uid || !planRec.owner || String(planRec.owner) === String(uid)) ? planRec.plan : null;
  return {
    // whose this browser's records are: Job Search stamps the account that last used it here (and clears its copy for another);
    // signed out, or never stamped, they're taken as this person's
    mine: jobMine,
    profile: (function(){ try{ return (typeof root.getProfile === 'function' && root.getProfile()) || null; }catch(e){ return null; } })(),
    apps: (function(){ try{ return typeof root.getApplications === 'function' ? root.getApplications() : arr(lsGet('kaidostar_applications', [])); }catch(e){ return []; } })(),
    sessions: arr(lsGet('kaidostar_interview_sessions', [])),
    stories: arr(lsGet('kaidostar_star_stories', [])),
    debriefs: arr(lsGet('kaidostar_interview_debriefs', [])),
    answers: (function(){ var a = lsGet('kaidostar_interview_answers', []); return Array.isArray(a) ? arr(a) : arr(Object.keys(a || {}).map(function(k){ return Object.assign({ id: k }, a[k]); })); })(),
    asks: arr(lsGet('kaidostar_interview_asks', [])),
    tmays: lsGet('kaidostar_interview_tmays', null),
    versions: arr(lsGet('kaidostar_resume_versions', [])),
    contacts: arr(lsGet('kaidostar_contacts', [])),
    targets: arr(lsGet('kaidostar_targets', [])),
    achievements: arr(lsGet('kaidostar_achievements', [])),
    references: arr(lsGet('kaidostar_references', [])),
    portfolio: arr(lsGet('kaidostar_portfolio', [])),
    pitch: lsGet('kaidostar_pitch', null),
    plan: plan,
    journal: arr(lsGet('kaidostar_waypoint_candidate', [])),
    notifications: arr(lsGet('kaidostar_notifications', [])),
    outreach: arr(lsGet('kaidostar_outreach_drafts', [])),
    entries: (function(){ try{ return typeof root.getResumeEntries === 'function' ? root.getResumeEntries() : arr(lsGet('kaidostar_resume_entries', [])); }catch(e){ return []; } })(),
    doc: lsGet('kaidostar_resume_document', null),
    savedIds: jobMine ? (lsGet('kaidostar_saved_ids', []) || []) : [],
    dismissMeta: jobMine ? (lsGet('kaidostar_job_dismissed_meta', {}) || {}) : {},
    jobPrefs: jobMine ? lsGet('kaidostar_job_prefs', null) : null,
    jobSearches: jobMine ? arr(lsGet('kaidostar_job_searches', [])) : [],
    jobLearned: jobMine ? arr(lsGet('kaidostar_job_learned', [])) : [],
    jobApplied: jobMine ? (lsGet('kaidostar_job_applied', []) || []) : [],
    lastVisit: num(lsGet('kaidostar_job_last_visit', null)),
    autoMirror: lsGet('kaidostar_auto_apply_settings', null)
  };
}

/* ------------------------------------------------------------------ one application, from the server's shape or this browser's */
function howSent(channel, pkg, status){
  if(channel === 'email') return 'email';
  if(channel === 'web_auto') return 'server';
  if(channel === 'web_ext') return pkg && pkg.autopilot ? 'autopilot' : 'extension';
  if(channel === 'web' && status === 'sent') return 'you';
  return 'unknown';
}
function normServerApp(a){
  var pkg = a.pkg && typeof a.pkg === 'object' ? a.pkg : null;
  return {
    id: String(a.id), listing_id: String(a.listing_id || ''), title: str(a.title, 140) || 'A role', org: str(a.org, 100), location: str(a.location, 120),
    type: str(a.type, 20), employmentType: str(a.employment_type, 20), source: str(a.source, 30), route: str(a.route, 20),
    postedAt: num(a.posted_at), deadline: ms(a.deadline), status: str(a.status, 30), createdAt: num(a.created_at), sendableAt: num(a.sendable_at),
    sentAt: num(a.sent_at) || (pkg && num(pkg.sentAt)) || null, channel: str(a.channel, 20), confidence: num(a.confidence), counterfactual: num(a.counterfactual),
    auto: !!a.auto, hasDraft: !!a.has_draft, factors: a.factors && typeof a.factors === 'object' ? a.factors : null, pkg: pkg
  };
}
function normLocalApp(a){
  return {
    id: String(a.id), listing_id: String(a.listing_id || ''), title: str(a.listing_title || a.title, 140) || 'A role', org: str(a.listing_org || a.org, 100), location: str(a.location || a.listing_loc, 120),
    type: str(a.listing_type || a.type, 20), employmentType: '', source: '', route: str(a.apply_route, 20), postedAt: null, deadline: ms(a.deadline),
    status: str(a.status, 30), createdAt: ms(a.created_at), sendableAt: ms(a.sendable_at), sentAt: ms(a.sent_at), channel: str(a.sent_channel, 20),
    confidence: num(typeof a.confidence_pct === 'string' ? parseFloat(a.confidence_pct) : a.confidence_pct), counterfactual: num(a.counterfactual_confidence_pct),
    auto: !!(a.auto_generated || a.auto_prepared), hasDraft: !!(a.draft && String(a.draft).trim()), factors: a.factors_snapshot && typeof a.factors_snapshot === 'object' ? a.factors_snapshot : null, pkg: null,
    _localOutcome: a.outcome_status ? { status: a.outcome_status, at: ms(a.outcome_logged_at) } : null
  };
}
// what the outcome history says about each application: when the first reply came, how far it got
function deriveApp(a, hist, now){
  hist = (hist || []).filter(function(o){ return o && o.status; }).sort(function(x, y){ return (x.at || 0) - (y.at || 0); });
  a.history = hist;
  var last = hist[hist.length - 1] || null;
  a.latest = last ? last.status : null;
  a.latestAt = last ? last.at : null;
  // a reply is the employer answering: a rejection, an interview or an offer (giving up on one isn't a reply)
  var reply = hist.find(function(o){ return o.status === 'rejected' || o.status === 'interview' || o.status === 'offer'; }) || null;
  var iv = hist.find(function(o){ return o.status === 'interview' || o.status === 'offer'; }) || null;
  var of = hist.find(function(o){ return o.status === 'offer'; }) || null;
  a.firstReplyAt = reply ? reply.at : null;
  a.replied = !!reply;
  a.reachedInterview = !!iv; a.interviewAt = iv ? iv.at : null;
  a.reachedOffer = !!of; a.offerAt = of ? of.at : null;
  a.rejected = a.latest === 'rejected';
  a.gaveUp = a.latest === 'ghosted';
  a.isSent = a.status === 'sent' || (!!a.sentAt && a.status !== 'undone') || (!!reply && a.status !== 'undone');
  a.sentImputed = false;
  if(a.isSent && !a.sentAt && a.createdAt){ a.sentAt = a.createdAt; a.sentImputed = true; }   // (an old record with no send time: when it was made)
  a.how = a.isSent ? howSent(a.channel, a.pkg, 'sent') : null;
  a.open = a.isSent && !a.replied && !a.gaveUp;                // waiting on the employer
  a.waitingDays = a.open && a.sentAt ? Math.floor((now - a.sentAt) / DAY) : null;
  a.replyDays = a.replied && a.sentAt && a.firstReplyAt ? Math.max(0, (a.firstReplyAt - a.sentAt) / DAY) : null;
  // furthest stage: offer > interview > replied (a rejection is a reply) > waiting / gave up
  a.stage = a.reachedOffer ? 'offer' : a.reachedInterview ? 'interview' : a.replied ? 'rejected' : (a.gaveUp ? 'ghosted' : 'none');
  return a;
}

/* ------------------------------------------------------------------ merge the account's read with this browser's */
MD.normalize = function(S, L, uid, now){
  now = now || Date.now();
  L = L || readLocal(uid);
  var srv = S && typeof S === 'object' ? S : null;
  var D = { role: 'candidate', signedIn: !!uid, uid: uid || null, now: now, example: false,
    source: { server: !!srv, missing: srv && Array.isArray(srv.missing) ? srv.missing.slice() : [], capped: srv && Array.isArray(srv.capped) ? srv.capped : [], at: now },
    tier: (srv && srv.tier) || (function(){ try{ return typeof root.getTier === 'function' ? root.getTier() : 'free'; }catch(e){ return 'free'; } })(),
    features: (srv && srv.features) || {} };
  // profile: this browser's survey copy (fuller) with the account's goal history
  var lp = L.profile && typeof L.profile === 'object' ? L.profile : {};
  var sp = srv && srv.profile && typeof srv.profile === 'object' ? srv.profile : {};
  D.hasProfile = !!(srv ? srv.has_profile : (lp && (lp.northstar || lp.skills)));
  var localMine = L.mine !== false;
  D.profile = localMine ? Object.assign({}, lp) : {};
  // signed in, the account's survey answers win (this browser may hold an older survey, or another account's)
  var useSrv = !!(srv && srv.has_profile);
  if(sp.northstar && (useSrv || !D.profile.northstar)) D.profile.northstar = sp.northstar;
  if(sp.skills && (useSrv || !D.profile.skills)) D.profile.skills = sp.skills;
  if(useSrv){
    if(sp.timeframe) D.profile.timeframe = sp.timeframe;
    if(sp.stage) D.profile.stage = sp.stage;
    if(sp.location_pref) D.profile.loc = sp.location_pref;
    if(Array.isArray(sp.target_types) && sp.target_types.length){ D.profile.types = sp.target_types.slice(); D.profile.target_types = sp.target_types.slice(); }
    if(Array.isArray(sp.priorities)) D.profile.priorities = sp.priorities.slice();
  }
  D.profileFlags = { is_student: !!sp.is_student, is_athlete: !!sp.is_athlete };
  D.goalHistory = arr(sp.history).map(function(h){ return { at: num(h.at), northstar: str(h.northstar, 120) }; }).filter(function(h){ return h.at; });

  // applications + the outcome history
  var apps = srv ? arr(srv.apps).map(normServerApp) : arr(L.apps).map(normLocalApp);
  var outcomes = srv ? arr(srv.outcomes).map(function(o){ return { listing_id: String(o.listing_id || ''), status: str(o.status, 20), at: num(o.at) }; })
    : apps.filter(function(a){ return a._localOutcome; }).map(function(a){ return { listing_id: a.listing_id, status: a._localOutcome.status, at: a._localOutcome.at || a.sentAt || a.createdAt }; });
  outcomes = outcomes.filter(function(o){ return o.status; }).sort(function(a, b){ return (a.at || 0) - (b.at || 0); });
  var byListing = {};
  outcomes.forEach(function(o){ (byListing[o.listing_id] = byListing[o.listing_id] || []).push(o); });
  apps.forEach(function(a){ deriveApp(a, byListing[a.listing_id], now); });
  D.apps = apps; D.outcomes = outcomes;

  // saved and passed-on jobs
  D.saved = srv ? arr(srv.saved).map(function(s){ return { listing_id: String(s.listing_id), at: num(s.at), title: str(s.title, 140), org: str(s.org, 100), deadline: ms(s.deadline), type: str(s.type, 20) }; })
    : (Array.isArray(L.savedIds) ? L.savedIds : []).map(function(id){ return { listing_id: String(id), at: null, title: '', org: '', deadline: null, type: '' }; });
  D.dismissedAt = srv && Array.isArray(srv.dismissed) ? srv.dismissed.filter(isNum) : [];
  var meta = L.dismissMeta && typeof L.dismissMeta === 'object' ? L.dismissMeta : {};
  D.dismissReasons = Object.keys(meta).map(function(id){ var m = meta[id] || {}; return { id: id, reason: str(m.r, 30) || 'other', at: num(m.at), title: str(m.t, 140), org: str(m.o, 100) }; });
  if(!D.dismissedAt.length) D.dismissedAt = D.dismissReasons.map(function(r){ return r.at; }).filter(isNum);

  // Auto
  D.auto = srv && srv.auto && typeof srv.auto === 'object' ? srv.auto : null;
  if(!D.auto && L.autoMirror && typeof L.autoMirror === 'object') D.auto = { enabled: !!L.autoMirror.enabled, rules: L.autoMirror.rules || {}, runs: [], coverage: null, learned: [], custom: { form: 0, yours: 0 }, autopilot: null, local: true };

  // practice, stories, materials, network (this browser's copy wins on the same id: it's fuller)
  var it = srv && srv.items && typeof srv.items === 'object' ? srv.items : {};
  var srvMiss = srv && Array.isArray(srv.missing) ? srv.missing : [];
  // this browser's records join the account's when they're this person's (a session saved on this device only, say);
  // when another account used this browser last, only the account's records count
  var acct = !!srv && !!srv.items && srvMiss.indexOf('workshop') < 0 && !localMine;
  D.sessions = accountFirst(L.sessions, it.sessions, acct).map(cleanSession).filter(function(s){ return s.verdict && typeof s.verdict === 'object' && isNum(s.verdict.overall); })
    .map(function(s){ s._at = ms(s.at) || num(s.created) || idTime(s.id); return s; }).filter(function(s){ return s._at; }).sort(function(a, b){ return a._at - b._at; });
  D.stories = accountFirst(L.stories, it.stories, acct).map(function(s){ cleanText(s, ['title', 's', 't', 'a', 'r', 'situation', 'task', 'action', 'result']); s._at = ms(s.created_at) || num(s.created) || idTime(s.id); return s; });
  D.debriefs = accountFirst(L.debriefs, it.debriefs, acct).map(function(d){ cleanText(d, ['stage', 'company', 'role']); d._at = ms(d.date) || num(d.at) || idTime(d.id); return d; });
  D.answers = accountFirst(L.answers, it.answers, acct).map(function(a){ return cleanText(a, ['category']); });
  var counts = it.counts || {};
  var localPitch = !!(L.pitch && typeof L.pitch === 'object' && Object.keys(L.pitch).some(function(k){ return typeof L.pitch[k] === 'string' && L.pitch[k].trim(); }));
  D.asks = acct ? (counts.asks || 0) : Math.max(arr(L.asks).length, counts.asks || 0);
  D.tmays = localMine && L.tmays && typeof L.tmays === 'object' ? L.tmays : null;
  D.versions = accountFirst(L.versions, it.versions, acct).map(function(v){ cleanText(v, ['name', 'source']); v._at = ms(v.created_at) || num(v.created) || idTime(v.id); return v; });
  D.contacts = accountFirst(L.contacts, it.contacts, acct).map(function(c){ cleanText(c, ['name', 'company', 'how', 'followup']); c._at = ms(c.created_at) || num(c.created) || idTime(c.id); return c; });
  D.targets = accountFirst(L.targets, it.targets, acct).map(function(t){ return cleanText(t, ['role', 'company', 'status']); });
  D.counts = acct ? { achievements: counts.achievements || 0, references: counts.references || 0, portfolio: counts.portfolio || 0, pitch: !!counts.pitch }
    : { achievements: Math.max(arr(L.achievements).length, counts.achievements || 0), references: Math.max(arr(L.references).length, counts.references || 0),
      portfolio: Math.max(arr(L.portfolio).length, counts.portfolio || 0), pitch: !!counts.pitch || localPitch };
  // the saved plan: whichever copy changed last
  var sPlan = it.plan && typeof it.plan === 'object' ? it.plan : null, lPlan = L.plan && typeof L.plan === 'object' ? L.plan : null;
  function changed(p){ return p ? (num(p.changedAt) || num(p.updatedAt) || num(p.builtAt) || 0) : -1; }
  D.plan = changed(lPlan) >= changed(sPlan) ? (lPlan || sPlan) : sPlan;
  if(D.plan){ D.plan.items = arr(D.plan.items); D.plan.history = arr(D.plan.history).filter(function(h){ return isNum(h.at); }).sort(function(a, b){ return a.at - b.at; }); }

  // Job Search's targets and saved searches
  var ss = srv && srv.search && typeof srv.search === 'object' ? srv.search : null;
  D.search = ss ? { prefs: ss.prefs || {}, searches: arr(ss.searches), learned: ss.learned || 0, applied: ss.applied || 0 }
    : { prefs: (L.jobPrefs && typeof L.jobPrefs === 'object') ? L.jobPrefs : {}, searches: arr(L.jobSearches).map(function(s){ return { id: s.id, name: str(s.name || s.raw, 80), alert: !!s.alert, created: num(s.created), newCount: num(s.newCount) || 0, lastCount: num(s.lastCount) || 0, lastCheck: num(s.lastCheck) }; }),
      learned: arr(L.jobLearned).filter(function(r){ return r.active !== false; }).length, applied: Array.isArray(L.jobApplied) ? L.jobApplied.length : 0 };
  D.lastVisit = L.lastVisit;

  // journal, notifications, resume entries, outreach, the pool's coverage
  D.journal = srv && Array.isArray(srv.journal) && srvMiss.indexOf('journal') < 0 ? arr(srv.journal).map(function(j){ return { at: num(j.at), tagged: !!j.tagged }; })
    : arr(localMine ? L.journal : []).map(function(j){ return { at: ms(j.created_at) || idTime(j.id), tagged: !!j.tag_value }; });
  D.journal = D.journal.filter(function(j){ return j.at; });
  D.notifications = srv && Array.isArray(srv.notifications) && srvMiss.indexOf('notifications') < 0 ? arr(srv.notifications).map(function(n){ return { type: str(n.type, 30), at: num(n.at), read: !!n.read }; })
    : arr(L.notifications).map(function(n){ return { type: str(n.type, 30), at: ms(n.ts), read: !!n.read }; });
  var srvEntries = srv && Array.isArray(srv.resume_entries) && srvMiss.indexOf('resume_entries') < 0 ? arr(srv.resume_entries) : null;
  D.entries = srvEntries && (srvEntries.length || !localMine) ? srvEntries : arr(localMine ? L.entries : []);
  D.doc = localMine && L.doc && typeof L.doc === 'object' ? L.doc : null;
  var outreach = {};
  arr(srv && srv.outreach).forEach(function(o){ outreach[o.listing_id] = { listing_id: o.listing_id, status: str(o.status, 20), at: num(o.at), sentAt: null, auto: !!o.auto }; });
  var mineL = {}; apps.forEach(function(a){ mineL[a.listing_id] = 1; });
  arr(L.outreach).forEach(function(o){ var k = String(o.listing_id || o.id); if(srv && !localMine && !outreach[k] && !mineL[k]) return;   // (another account's: left out)
    outreach[k] = { listing_id: k, status: str(o.status, 20), at: ms(o.created_at) || (outreach[k] && outreach[k].at), sentAt: ms(o.sent_at), auto: !!o.auto_generated }; });
  D.outreach = Object.keys(outreach).map(function(k){ return outreach[k]; });
  D.coverage = srv && srv.coverage && typeof srv.coverage === 'object' ? srv.coverage : null;
  return D;
};

/* ------------------------------------------------------------------ gather (the account's read, falling back to this browser) */
MD.WAIT_MS = 30000;
// a promise that settles with null if the call takes longer than ms
function within(p, ms){ var t; return Promise.race([Promise.resolve(p), new Promise(function(res){ t = setTimeout(function(){ res(null); }, ms); })]).then(function(v){ clearTimeout(t); return v; }, function(e){ clearTimeout(t); throw e; }); }
MD.within = within;
MD.gather = async function(){
  var sess = MD.session(), uid = sess && sess.user_id ? String(sess.user_id) : null, now = Date.now();
  var L = readLocal(uid), S = null, err = null, status = 0;
  if(uid && typeof root.apiMissionOverview === 'function'){
    try{
      var r = await within(root.apiMissionOverview(uid), MD.WAIT_MS);
      status = r ? r.status : 0;
      if(r && r.ok && r.data && typeof r.data === 'object') S = r.data;
      else err = r && r.status === 401 ? 'signin' : 'offline';
    }catch(e){ err = 'offline'; }
  }
  var D = MD.normalize(S, L, uid, now);
  D.source.error = err; D.source.status = status;
  return D;
};

/* ------------------------------------------------------------------ time ranges and buckets */
MD.RANGES = [{ key: '30d', label: '30 days' }, { key: '90d', label: '90 days' }, { key: '6m', label: '6 months' }, { key: '12m', label: '12 months' }, { key: 'all', label: 'All time' }];
MD.range = function(key, now, earliest){
  var to = now, from;
  if(key === '30d') from = startOfDay(addDays(now, -29));
  else if(key === '6m') from = startOfDay(addMonths(now, -6));
  else if(key === '12m') from = startOfMonth(addMonths(now, -11));
  else if(key === 'all') from = startOfDay(Math.min(isNum(earliest) ? earliest : now, addDays(now, -29)));
  else { key = '90d'; from = startOfDay(addDays(now, -89)); }
  var span = (to - from) / DAY;
  return { key: key, from: from, to: to, gran: span <= 45 ? 'day' : span <= 200 ? 'week' : 'month', days: Math.round(span) };
};
MD.buckets = function(rg){
  var out = [], t = rg.gran === 'day' ? startOfDay(rg.from) : rg.gran === 'week' ? startOfWeek(rg.from) : startOfMonth(rg.from);
  while(t <= rg.to){
    var next = rg.gran === 'day' ? addDays(t, 1) : rg.gran === 'week' ? addDays(t, 7) : addMonths(t, 1);
    out.push({ start: t, end: next });
    t = next;
  }
  return out;
};
MD.bucketLabel = function(b, gran){ if(!root.MCC) return ''; return gran === 'month' ? root.MCC.fmtMonth(b.start) : root.MCC.fmtDay(b.start); };
MD.bucketTitle = function(b, gran){
  if(!root.MCC) return '';
  if(gran === 'day') return root.MCC.fmtFull(b.start);
  if(gran === 'week') return 'Week of ' + root.MCC.fmtDay(b.start);
  var d = new Date(b.start); return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()] + ' ' + d.getFullYear();
};
// counts of times per bucket
MD.countIn = function(times, bks){
  var out = bks.map(function(){ return 0; });
  times.forEach(function(t){ if(!isNum(t)) return; for(var i = 0; i < bks.length; i++){ if(t >= bks[i].start && t < bks[i].end){ out[i]++; return; } } });
  return out;
};
MD.inRange = function(t, rg){ return isNum(t) && t >= rg.from && t <= rg.to; };
// the same-length window just before this one (for "vs the 30 days before")
MD.prevRange = function(rg){ var len = rg.to - rg.from; return { key: rg.key, from: rg.from - len, to: rg.from - 1, gran: rg.gran }; };
MD.earliest = function(D){
  if(!D) return null;
  if(isNum(D.earliest)) return D.earliest;   // the athlete and student overviews work theirs out
  var ts = [];
  (D.apps || []).forEach(function(a){ if(a && isNum(a.createdAt)) ts.push(a.createdAt); });
  (D.sessions || []).forEach(function(s){ if(s && isNum(s._at)) ts.push(s._at); });
  (D.outcomes || []).forEach(function(o){ if(o && isNum(o.at)) ts.push(o.at); });
  return ts.length ? Math.min.apply(null, ts) : null;
};

/* ------------------------------------------------------------------ applications: funnel, replies, waiting, rates by group */
MD.sentIn = function(D, rg){ return D.apps.filter(function(a){ return a.isSent && MD.inRange(a.sentAt, rg); }); };
MD.funnel = function(list){
  var sent = list.length, replied = list.filter(function(a){ return a.replied; }).length;
  var iv = list.filter(function(a){ return a.reachedInterview; }).length, of = list.filter(function(a){ return a.reachedOffer; }).length;
  return { sent: sent, replied: replied, interview: iv, offer: of };
};
// a rate per group, with its honest range; groups with fewer than ENOUGH applications are flagged, never ranked
MD.rateBy = function(list, keyFn, labels, what, order){
  var g = {};
  list.forEach(function(a){
    var k = keyFn(a); if(k == null) return;
    var e = g[k] || (g[k] = { key: k, label: (labels && labels[k]) || k, n: 0, k: 0 });
    e.n++;
    if(what === 'interview' ? a.reachedInterview : a.replied) e.k++;
  });
  var out = Object.keys(g).map(function(k){ var e = g[k], w = wilson(e.k, e.n); e.rate = w.p; e.lo = w.lo; e.hi = w.hi; e.enough = e.n >= MD.ENOUGH; return e; });
  if(order) return out.sort(function(a, b){ var ia = order.indexOf(a.key), ib = order.indexOf(b.key); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  return out.sort(function(a, b){ return (b.enough - a.enough) || (b.n - a.n); });
};
MD.WAIT_BUCKETS = [[0, 7, '0-7 days'], [8, 14, '8-14 days'], [15, 30, '15-30 days'], [31, 60, '31-60 days'], [61, 1e9, '60+ days']];
MD.REPLY_BUCKETS = [[0, 3, '0-3 days'], [4, 7, '4-7 days'], [8, 14, '8-14 days'], [15, 30, '15-30 days'], [31, 1e9, '30+ days']];
MD.bucketize = function(values, defs){ var out = defs.map(function(){ return 0; }); values.forEach(function(v){ if(!isNum(v)) return; for(var i = 0; i < defs.length; i++){ if(v >= defs[i][0] && v <= defs[i][1] + 0.999){ out[i]++; return; } } }); return out; };
MD.fitBand = function(v){ return !isNum(v) ? 'unknown' : v >= 85 ? 'excellent' : v >= 70 ? 'strong' : v >= 55 ? 'partial' : 'weak'; };
MD.FIT_LABEL = { excellent: 'Fit 85+', strong: 'Fit 70-84', partial: 'Fit 55-69', weak: 'Fit under 55', unknown: 'No score recorded' };

/* ------------------------------------------------------------------ activity: everything that moved the search, by day */
MD.activity = function(D){
  var ev = [];
  function add(t, part, mine){ if(isNum(t)) ev.push({ at: t, part: part, mine: mine !== false }); }
  D.apps.forEach(function(a){
    if(a.isSent){
      var byYou = !a.auto || (a.pkg && isNum(a.pkg.approvedAt)) || a.how === 'you' || a.how === 'extension';
      add(a.sentAt, byYou ? 'Applications you sent' : 'Sent by Auto', byYou);
    }
  });
  D.outcomes.forEach(function(o){ if(o.status !== 'applied') add(o.at, 'Replies logged'); });
  D.sessions.forEach(function(s){ add(s._at, 'Practice interviews'); });
  D.stories.forEach(function(s){ add(s._at, 'Stories written'); });
  D.debriefs.forEach(function(d){ add(d._at, 'Interview debriefs'); });
  if(D.plan) D.plan.items.forEach(function(i){ add(num(i.doneAt) || num(i.verifiedAt), 'Plan steps done'); });
  D.contacts.forEach(function(c){ add(c._at, 'Contacts added'); });
  D.journal.forEach(function(j){ add(j.at, 'Journal entries'); });
  D.saved.forEach(function(s){ add(s.at, 'Jobs saved'); });
  D.dismissedAt.forEach(function(t){ add(t, 'Jobs passed on'); });
  D.versions.forEach(function(v){ add(v._at, 'Resume versions'); });
  return ev;
};
// the areas the activity charts group by - each with a fixed colour slot
MD.AREAS = [{ key: 'apply', label: 'Applying', slot: 0 }, { key: 'search', label: 'Choosing jobs', slot: 1 }, { key: 'replies', label: 'Logging replies', slot: 2 }, { key: 'interview', label: 'Interview prep', slot: 3 },
  { key: 'plan', label: 'Your plan', slot: 4 }, { key: 'network', label: 'Networking', slot: 5 }, { key: 'materials', label: 'Resume', slot: 6 }, { key: 'journal', label: 'Journal', slot: 7 }];
MD.AREA_OF = { 'Applications you sent': 'apply', 'Jobs saved': 'search', 'Jobs passed on': 'search', 'Replies logged': 'replies', 'Practice interviews': 'interview', 'Stories written': 'interview', 'Interview debriefs': 'interview',
  'Plan steps done': 'plan', 'Contacts added': 'network', 'Resume versions': 'materials', 'Journal entries': 'journal' };
MD.days = function(events, from, to){
  var days = {};
  events.forEach(function(e){
    if(e.at < from || e.at > to) return;
    var k = root.MCC ? root.MCC.dayKey(e.at) : new Date(e.at).toISOString().slice(0, 10);
    var d = days[k] || (days[k] = { n: 0, parts: {}, mine: 0 });
    d.n++; d.parts[e.part] = (d.parts[e.part] || 0) + 1; if(e.mine) d.mine++;
  });
  return days;
};
// streaks of days with something you did (Auto's own sends don't count)
MD.streaks = function(events, now){
  var set = {};
  events.forEach(function(e){ if(e.mine) set[startOfDay(e.at)] = 1; });
  var days = Object.keys(set).map(Number).sort(function(a, b){ return a - b; });
  var longest = 0, run = 0, prev = null;
  days.forEach(function(d){ run = prev != null && Math.round((d - prev) / DAY) === 1 ? run + 1 : 1; longest = Math.max(longest, run); prev = d; });
  var cur = 0, t = startOfDay(now);
  if(!set[t]) t = addDays(t, -1);           // today not done yet: the streak still counts from yesterday
  while(set[t]){ cur++; t = addDays(t, -1); }
  var weeks = {}; days.forEach(function(d){ weeks[startOfWeek(d)] = 1; });
  var activeWeeks12 = 0, w = startOfWeek(now);
  for(var i = 0; i < 12; i++){ if(weeks[w]) activeWeeks12++; w = addDays(w, -7); }
  return { current: cur, longest: longest, activeDays: days.length, activeWeeks12: activeWeeks12 };
};

/* ------------------------------------------------------------------ what needs the person now (most urgent first) */
MD.needsYou = function(D){
  var now = D.now, out = [], apps = D.apps;
  function push(o){ out.push(o); }
  var going = apps.filter(function(a){ return (a.status === 'approved' || a.status === 'sending') && isNum(a.sendableAt) && a.sendableAt > now; });
  if(going.length){ var soon = Math.min.apply(null, going.map(function(a){ return a.sendableAt; })); push({ kind: 'auto', urgent: soon - now < 6 * HOUR, at: soon, n: going.length, text: going.length + ' application' + (going.length === 1 ? ' goes' : 's go') + ' out soon', sub: 'You can still undo until it sends', href: 'auto.html' }); }
  var review = apps.filter(function(a){ return a.status === 'pending_review'; });
  var autoReview = review.filter(function(a){ return a.auto; }), mineReview = review.filter(function(a){ return !a.auto; });
  var apUnknown = !!(D.auto && D.auto.autopilot == null && D.source && D.source.missing && D.source.missing.indexOf('autopilot') >= 0);
  var kits = apps.filter(function(a){ return a.status === 'ready_to_submit' && !MD.autopilotTakes(a, D); });
  var apQueue = apps.filter(function(a){ return a.status === 'ready_to_submit' && MD.autopilotTakes(a, D); });
  var unsure = apUnknown ? kits.filter(function(a){ var h = a.pkg && a.pkg.handoff; return h && h.autopilot && !h.possiblySent; }) : [];
  if(unsure.length){ kits = kits.filter(function(a){ return unsure.indexOf(a) < 0; }); push({ kind: 'auto', at: null, n: unsure.length, text: unsure.length + ' ready to submit - check Auto first', sub: 'Autopilot’s status couldn’t be read just now, so ' + (unsure.length === 1 ? 'it' : 'some') + ' may already be in its queue', href: 'auto.html' }); }
  if(apQueue.length) push({ kind: 'auto', at: null, n: apQueue.length, text: apQueue.length + ' in Autopilot’s queue', sub: 'It applies to ' + (apQueue.length === 1 ? 'it' : 'them') + ' in your browser - nothing for you to do unless it hands one back', href: 'auto.html', info: true });
  if(autoReview.length) push({ kind: 'auto', at: null, n: autoReview.length, text: autoReview.length + ' application' + (autoReview.length === 1 ? '' : 's') + ' from Auto to review', sub: 'Approve, edit or skip each one', href: 'auto.html' });
  if(kits.length) push({ kind: 'auto', at: null, n: kits.length, text: kits.length + ' ready to submit yourself', sub: 'Auto left ' + (kits.length === 1 ? 'it' : 'them') + ' for you - the reason is on each one', href: 'auto.html' });
  if(mineReview.length) push({ kind: 'apply', at: null, n: mineReview.length, text: mineReview.length + ' draft' + (mineReview.length === 1 ? '' : 's') + ' waiting for you', sub: 'Drafts you started, not sent yet', href: 'workshop.html' });
  var fu = apps.filter(function(a){ var f = a.pkg && a.pkg.followUp; return f && isNum(f.dueAt) && f.dueAt <= now && !f.doneAt && (!a.latest || a.latest === 'applied'); });
  if(fu.length) push({ kind: 'follow', at: null, n: fu.length, text: fu.length + ' follow-up' + (fu.length === 1 ? '' : 's') + ' due', sub: 'No reply yet - a short note can bring one', href: 'auto.html' });
  var ivs = apps.filter(function(a){ return a.latest === 'interview'; });
  if(ivs.length) push({ kind: 'interview', at: null, n: ivs.length, text: 'Prepare for ' + ivs.length + ' interview' + (ivs.length === 1 ? '' : 's'), sub: ivs.slice(0, 3).map(function(a){ return a.org || a.title; }).filter(Boolean).join(', '), href: 'interview-prep.html' });
  var closing = [];
  D.saved.forEach(function(s){ if(isNum(s.deadline) && s.deadline >= startOfDay(now) && s.deadline - now <= 7 * DAY && !apps.some(function(a){ return a.listing_id === s.listing_id && a.isSent; })) closing.push(s); });
  if(closing.length){ var first = Math.min.apply(null, closing.map(function(s){ return s.deadline; })); push({ kind: 'deadline', urgent: first - now < 3 * DAY, at: first, n: closing.length, text: closing.length + ' saved job' + (closing.length === 1 ? ' closes' : 's close') + ' within a week', sub: closing.slice(0, 2).map(function(s){ return (s.title || 'A job') + (s.org ? ' at ' + s.org : ''); }).join('; '), href: 'dashboard.html' }); }
  if(D.plan){
    var overdue = D.plan.items.filter(function(i){ return isNum(i.dueAt) && i.dueAt < now && !(i.status === 'done' || i.status === 'skip' || i.doneAt || i.verifiedAt); });
    if(overdue.length) push({ kind: 'plan', at: null, n: overdue.length, text: overdue.length + ' plan step' + (overdue.length === 1 ? ' is' : 's are') + ' past due', sub: 'Re-plan or mark them done on Roadmap', href: 'roadmap.html' });
  }
  var cf = D.contacts.filter(function(c){ var f = ms(c.followup); return isNum(f) && f <= startOfDay(now) + DAY - 1; });
  if(cf.length) push({ kind: 'network', at: null, n: cf.length, text: cf.length + ' contact' + (cf.length === 1 ? '' : 's') + ' to follow up with', sub: cf.slice(0, 3).map(function(c){ return c.name || c.company; }).filter(Boolean).join(', '), href: 'workshop.html' });
  var stale = apps.filter(function(a){ return a.open && a.waitingDays >= 21; });
  if(stale.length) push({ kind: 'stale', at: null, n: stale.length, text: stale.length + ' application' + (stale.length === 1 ? ' has' : 's have') + ' had no reply for 3+ weeks', sub: 'Follow up once, or mark them as no reply so your rates stay honest', href: 'workshop.html' });
  var fresh = D.search.searches.filter(function(s){ return s.newCount > 0; });
  if(fresh.length){ var nNew = fresh.reduce(function(s, x){ return s + x.newCount; }, 0); push({ kind: 'search', at: null, n: nNew, info: true, text: nNew + ' new match' + (nNew === 1 ? '' : 'es') + ' in your saved searches', sub: fresh.slice(0, 3).map(function(s){ return s.name; }).filter(Boolean).join(', '), href: 'dashboard.html' }); }
  var rank = { auto: 1, deadline: 2, interview: 3, follow: 4, apply: 5, network: 6, plan: 7, stale: 8, search: 9 };
  return out.sort(function(a, b){ return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || (rank[a.kind] - rank[b.kind]); });
};

// would the extension's Autopilot take this kit (the same rule the server applies)?
MD.autopilotTakes = function(a, D){
  var h = a.pkg && a.pkg.handoff, ap = D.auto && D.auto.autopilot;
  if(!h || !h.autopilot || h.possiblySent || !ap || !isNum(ap.onSince) || ap.offAt && ap.offAt > ap.onSince) return false;
  if(!isNum(h.at) || h.at < ap.onSince || D.now - h.at > (num(ap.maxAgeDays) || 7) * DAY) return false;
  return (a.route || (a.pkg && a.pkg.route)) === 'employer';
};

/* ------------------------------------------------------------------ the next weeks: everything with a date ahead */
MD.upcoming = function(D, days){
  var now = D.now, end = now + days * DAY, items = [];
  function add(t, lane, label, sub){ if(isNum(t) && t >= startOfDay(now) && t <= end) items.push({ at: t, lane: lane, label: label, sub: sub || '' }); }
  D.saved.forEach(function(s){ if(!D.apps.some(function(a){ return a.listing_id === s.listing_id && a.status !== 'undone'; })) add(s.deadline, 'deadline', (s.title || 'Saved job') + (s.org ? ' - ' + s.org : ''), 'Application deadline'); });
  D.apps.forEach(function(a){
    if(!a.isSent && a.status !== 'undone') add(a.deadline, 'deadline', a.title + (a.org ? ' - ' + a.org : ''), 'Deadline - not sent yet');
    if((a.status === 'approved' || a.status === 'sending') && isNum(a.sendableAt)) add(a.sendableAt, 'send', a.title + (a.org ? ' - ' + a.org : ''), 'Auto sends it then');
    var f = a.pkg && a.pkg.followUp; if(f && !f.doneAt && (!a.latest || a.latest === 'applied')) add(f.dueAt, 'follow', 'Follow up: ' + (a.org || a.title), a.title);
  });
  if(D.plan) D.plan.items.forEach(function(i){ if(!(i.status === 'done' || i.status === 'skip' || i.doneAt || i.verifiedAt)) add(i.dueAt, 'plan', MD.stepTitle(i), 'Plan step due'); });
  D.contacts.forEach(function(c){ add(ms(c.followup), 'network', 'Follow up: ' + (c.name || c.company || 'a contact'), c.company || ''); });
  return items;
};

/* ------------------------------------------------------------------ the saved plan, readable without the Roadmap engine */
MD.skillName = function(id){
  try{ if(root.JobEngine && typeof root.JobEngine.skillName === 'function'){ var n = root.JobEngine.skillName(id); if(n) return n; } }catch(e){}
  var s = String(id || '').replace(/[_-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};
MD.stepTitle = function(i){
  var k = i.kind || String(i.id || '').split(':')[0], skill = i.skillId || (String(i.id || '').split(':')[1] || '');
  if(k === 'network') return 'Talk to people in the field';
  if(k === 'apply') return 'Apply to roles within reach';
  if(k === 'interview') return 'Practise interviews';
  var name = MD.skillName(skill);
  if(k === 'prove') return 'Prove ' + name + ' on your resume';
  if(k === 'credential' || k === 'cred') return 'Earn ' + name;
  return 'Learn ' + name;
};
MD.stepState = function(i, now){
  if(i.verifiedAt) return 'verified';
  if(i.status === 'done' || i.doneAt) return 'done';
  if(i.status === 'skip') return 'skipped';
  if(isNum(i.dueAt) && i.dueAt < now) return 'overdue';
  if(i.status === 'doing') return 'doing';
  return 'todo';
};

/* ------------------------------------------------------------------ loading the engines a page needs */
var loads = {};
MD.load = function(src){
  if(loads[src]) return loads[src];
  loads[src] = new Promise(function(resolve, reject){
    if(!root.document){ reject(new Error('no document')); return; }
    var s = root.document.createElement('script'); s.src = src; s.async = true;
    s.onload = function(){ resolve(true); };
    s.onerror = function(){ delete loads[src]; reject(new Error('Couldn’t load ' + src)); };
    root.document.head.appendChild(s);
  });
  return loads[src];
};

/* ------------------------------------------------------------------ the job market: the Job Search pool, scored as Job Search scores it */
var MARKET_KEY = 'kaidostar_mc_market', MARKET_TTL = HOUR, MARKET_V = 2;
MD.marketCached = function(uid){
  var c = lsGet(MARKET_KEY + (uid === 'example' ? '_example' : ''), null);
  if(!c || c.v !== MARKET_V || String(c.uid || '') !== String(uid || '') || !c.summary) return null;
  return c;
};
function poolParamsFrom(prefs){
  prefs = prefs || {};
  return { roles: (Array.isArray(prefs.targetRoles) ? prefs.targetRoles : []).filter(function(r){ return typeof r === 'string'; }).slice(0, 20),
    loc: typeof prefs.locations === 'string' ? prefs.locations.slice(0, 200) : '', modes: prefs.modeRule === 'hide' && Array.isArray(prefs.modes) ? prefs.modes.slice(0, 3) : [], kw: [] };
}
// D -> Promise<{summary, at, demo, note}>; a cached summary under an hour old is reused unless force
MD.market = async function(D, opts){
  opts = opts || {};
  var uid = D.example ? 'example' : (D.uid || '');
  var cached = MD.marketCached(uid);
  if(cached && !opts.force && D.now - cached.at < MARKET_TTL) return cached;
  await MD.load('job-engine.js');
  var E = root.JobEngine; if(!E) throw new Error('The job engine didn’t load');
  var listings = null, entries = D.entries, prefs = D.search.prefs || {}, learned = [], dismissed = {}, applied = {}, demo = false, note = '', truncated = false, employerCount = 0;
  if(D.uid && !D.example && typeof root.apiGetJobPool === 'function'){
    var r = await within(root.apiGetJobPool(D.uid, poolParamsFrom(prefs)), 45000);
    if(r === null){
      if(cached) return Object.assign({}, cached, { note: 'Your live listings are taking a while - showing the read from ' + timeAgo(cached.at, D.now) + '.' });
      throw new Error('Your live listings are taking a while to load (the server may be waking up) - try again in a minute.');
    }
    if(r && r.ok && r.data && Array.isArray(r.data.listings)){
      listings = r.data.listings; truncated = !!r.data.truncated; employerCount = r.data.employer_count || 0;
      if(Array.isArray(r.data.entries) && r.data.entries.length) entries = r.data.entries;
      var st = r.data.state && typeof r.data.state === 'object' ? r.data.state : null;
      if(st && st.prefs && typeof st.prefs === 'object') prefs = st.prefs;
      if(st && Array.isArray(st.learned)) learned = st.learned;
      (r.data.dismissed_ids || []).forEach(function(id){ dismissed[String(id)] = true; });
      (r.data.applied_ids || []).forEach(function(id){ applied[String(id)] = true; });
      (st && Array.isArray(st.applied) ? st.applied : []).forEach(function(id){ applied[String(id)] = true; });
    } else if(r && r.status === 429){
      if(cached) return Object.assign({}, cached, { note: 'Your listings are loading in another tab - showing the last read from ' + timeAgo(cached.at, D.now) + '.' });
      throw new Error('Your listings are already loading (another tab) - try again in a moment.');
    } else if(r && r.status === 401){
      throw new Error('Your sign-in has expired - sign in again to read your live listings.');
    } else {
      if(cached) return Object.assign({}, cached, { note: 'Couldn’t refresh your live listings - showing the read from ' + timeAgo(cached.at, D.now) + '.' });
      throw new Error('Couldn’t reach your live listings just now.');
    }
  }
  if(!listings){
    await MD.load('job-data.js');
    listings = (root.KAIDO_JOB_CORPUS || []).slice(); demo = true;
    note = D.example ? 'Example: scored on Kaidostar’s demo listings (fictional companies).' : 'Demo listings - sign in to see your live job pool.';
    if(!D.example){ learned = arr(lsGet('kaidostar_job_learned', [])); }
  }
  var profile = D.profile || {};
  var types = Array.isArray(profile.types) && profile.types.length ? profile.types : (Array.isArray(profile.target_types) && profile.target_types.length ? profile.target_types : null);
  var P2 = E.composePrefs ? E.composePrefs(prefs, null) : prefs;
  var nowMs = D.now;
  var res = E.analyzePool(listings, profile, entries || [], P2, learned, { now: nowMs, types: types, dismissed: dismissed, applied: applied, queryRoles: [] });
  var cand = res.candidate || E.buildCandidate(profile, entries || [], P2, nowMs);
  var summary = MD.summarizeMarket(E, res, cand, P2, nowMs);
  summary.truncated = truncated; summary.employerCount = employerCount; summary.poolSize = listings.length;
  var out = { v: MARKET_V, uid: uid, at: nowMs, demo: demo, note: note, summary: summary };
  lsSet(MARKET_KEY + (uid === 'example' ? '_example' : ''), out);
  return out;
};
function timeAgo(t, now){
  var m = Math.round((now - t) / 60000), h = Math.round(m / 60), d = Math.round(m / 1440);
  return m < 2 ? 'just now' : m < 60 ? m + ' minutes ago' : h < 2 ? 'an hour ago' : h < 48 ? h + ' hours ago' : d + ' days ago';
}
MD.timeAgo = timeAgo;
function topCounts(map, n){ return Object.keys(map).map(function(k){ return { key: k, n: map[k] }; }).sort(function(a, b){ return b.n - a.n || (a.key < b.key ? -1 : 1); }).slice(0, n || 10); }
MD.summarizeMarket = function(E, res, cand, prefs, nowMs){
  var vis = res.visible || [], items = res.items || vis;
  var fits = vis.map(function(it){ return it.score && isNum(it.score.fit) ? it.score.fit : null; }).filter(isNum);
  var audit = E.scoreAudit ? E.scoreAudit(vis) : null;
  var pulse = E.marketPulse ? E.marketPulse(vis, cand) : null;
  var metros = {}, roles = {}, sources = {}, routes = {}, fresh = {}, ghost = {}, emp = {}, gaps = {}, years = { '0-1': 0, '2-3': 0, '4-5': 0, '6+': 0, 'Not stated': 0 }, arrivals = {}, reqCov = [0, 0, 0, 0, 0];
  var skillHow = {};
  vis.forEach(function(it){
    var j = it.job || {}, sc = it.score || {}, op = it.opp || {};
    var pl = (j.places || [])[0];
    var mk = j.mode === 'remote' ? 'Remote' : (pl ? (pl.metro ? (E.metroName ? E.metroName(pl.metro) : pl.metro) : (pl.label || pl.state || 'Other')) : 'Not stated');
    metros[mk] = (metros[mk] || 0) + 1;
    var rid = j.roles && j.roles[0] ? j.roles[0].id : null;
    var rn = rid ? (E.roleName ? E.roleName(rid) : rid) : 'Other roles';
    roles[rn] = (roles[rn] || 0) + 1;
    var src = String(j.source || 'other'); sources[src] = (sources[src] || 0) + 1;
    var rt = op.applyRoute || 'unknown'; routes[rt] = (routes[rt] || 0) + 1;
    var fr = op.freshness || 'unknown'; fresh[fr] = (fresh[fr] || 0) + 1;
    var gh = op.ghost || 'low'; ghost[gh] = (ghost[gh] || 0) + 1;
    var et = j.employmentType || 'unknown'; emp[et] = (emp[et] || 0) + 1;
    (sc.gaps || []).forEach(function(g){ var k = g.kind || 'other'; gaps[k] = (gaps[k] || 0) + 1; });
    var y = isNum(j.yearsMin) ? j.yearsMin : null;
    years[y == null ? 'Not stated' : y <= 1 ? '0-1' : y <= 3 ? '2-3' : y <= 5 ? '4-5' : '6+']++;
    var at = isNum(j.firstSeenAt) ? j.firstSeenAt : j.postedAt;
    if(isNum(at) && at >= nowMs - 30 * DAY){ var k2 = startOfDay(at); arrivals[k2] = (arrivals[k2] || 0) + 1; }
    var cov = sc.coverage && isNum(sc.coverage.required) ? sc.coverage.required : null;
    if(cov != null){ var c100 = cov <= 1 ? cov * 100 : cov; reqCov[c100 >= 100 ? 4 : c100 >= 75 ? 3 : c100 >= 50 ? 2 : c100 >= 25 ? 1 : 0]++; }
    (sc.skillDetail || []).forEach(function(s){ if(!s.required) return; var h = skillHow[s.id] || (skillHow[s.id] = { id: s.id, name: s.name, n: 0, how: {} }); h.n++; h.how[s.how || 'missing'] = (h.how[s.how || 'missing'] || 0) + 1; });
  });
  var bands = { excellent: 0, strong: 0, partial: 0, weak: 0, poor: 0, unknown: 0 };
  vis.forEach(function(it){ var b = it.score && it.score.band || 'unknown'; if(bands[b] == null) b = 'unknown'; bands[b]++; });
  // skills worth learning are judged on the jobs you're aiming for (your target roles), as Job Search judges them
  var unlocks = [], aimedN = vis.length;
  try{
    if(E.skillUnlocks && cand){
      var targets = (cand.roles || []).map(function(x){ return x.id; });
      var aimed = targets.length && E.roleSim ? vis.filter(function(it){ return (it.job.roles || []).some(function(jr){ return targets.some(function(t){ return E.roleSim(t, jr.id) >= 0.6; }); }); }) : vis;
      if(aimed.length < 5) aimed = vis;
      aimedN = Math.min(80, aimed.length);
      unlocks = (E.skillUnlocks(aimed.slice(0, 80), cand, res.prefs || prefs, { queryRoles: [] }) || []).slice(0, 10).map(function(u){ return { id: u.id, name: u.name, have: u.have, jobs: u.jobs, avgGain: u.avgGain, toStrong: u.toStrong }; });
    }
  }catch(e){ unlocks = []; }
  var top = vis.slice().sort(function(a, b){ return ((b.score && b.score.fit) || 0) - ((a.score && a.score.fit) || 0); }).slice(0, 8).map(function(it){
    var j = it.job || {}; return { id: String(j.id), title: str(j.title, 140), org: str(j.org, 100), fit: it.score ? it.score.fit : null, band: it.score ? it.score.band : null, place: j.mode === 'remote' ? 'Remote' : (j.places && j.places[0] ? (j.places[0].label || '') : (j.location || '')), ageDays: it.opp ? it.opp.ageDays : null };
  });
  var candSkills = cand && cand.skills ? cand.skills : {};
  var hows = Object.keys(skillHow).map(function(k){ return skillHow[k]; }).sort(function(a, b){ return b.n - a.n; }).slice(0, 12);
  return {
    n: vis.length, hidden: (res.hidden || []).length, scanned: res.scanned || items.length, hideCounts: res.hideCounts || {},
    strong: fits.filter(function(f){ return f >= 70; }).length, reach: fits.filter(function(f){ return f >= 55 && f < 70; }).length,
    median: median(fits), avg: mean(fits), histogram: audit && audit.histogram ? audit.histogram : (function(){ var h = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; fits.forEach(function(f){ h[Math.min(9, Math.floor(f / 10))]++; }); return h; })(),
    bands: bands, confidence: audit ? audit.confidence : null,
    modes: pulse ? pulse.modes : null, levels: pulse ? pulse.levels : null, salary: pulse ? pulse.salary : null,
    // pay the posting states (listed or written in the text - never the estimates), the same rule as Job Search's pulse
    salaryStrong: (function(){ var v = vis.filter(function(it){ var s = it.job && it.job.salary; return it.score && it.score.fit >= 70 && s && (s.source === 'listed' || s.source === 'parsed') && (isNum(s.annualMin) || isNum(s.annualMax)); }).map(function(it){ var s = it.job.salary; return isNum(s.annualMin) && isNum(s.annualMax) ? (s.annualMin + s.annualMax) / 2 : (s.annualMax || s.annualMin); }); return v.length ? { n: v.length, p25: quantile(v, 0.25), median: median(v), p75: quantile(v, 0.75), min: Math.min.apply(null, v), max: Math.max.apply(null, v) } : null; })(),
    companies: pulse ? pulse.companies : topCounts(vis.reduce(function(m, it){ var o = it.job && it.job.org; if(o) m[o] = (m[o] || 0) + 1; return m; }, {}), 8).map(function(c){ return { org: c.key, count: c.n }; }),
    topSkills: pulse ? (pulse.topSkills || []).slice(0, 12).map(function(s){ var h = candSkills[s.id]; return { id: s.id, name: s.name, count: s.count, pct: s.pct, required: s.required, have: s.have, level: h ? h.level : null }; }) : [],
    newThisWeek: pulse ? pulse.newThisWeek : null, noSponsorship: pulse ? pulse.noSponsorship : null, sponsors: pulse ? pulse.sponsors : null,
    metros: topCounts(metros, 10), roles: topCounts(roles, 10), sources: topCounts(sources, 10), routes: routes, freshness: fresh, ghost: ghost, employment: emp,
    gaps: gaps, years: years, reqCov: reqCov, arrivals: arrivals, unlocks: unlocks, aimed: aimedN, top: top, skillHow: hows.map(function(h){ return { id: h.id, name: h.name, n: h.n, how: h.how }; }),
    you: { years: cand ? cand.years : null, level: cand ? cand.level : null, bucket: cand && E.levelBucket ? E.levelBucket(cand.level) : null, levelLabel: cand ? cand.levelLabel : '', proven: cand ? cand.provenCount || 0 : 0, stated: cand ? cand.statedCount || 0 : 0,
      roles: cand && cand.roles ? cand.roles.slice(0, 5).map(function(r){ return r.name; }) : [] },
    prefs: { salaryFloor: num(prefs.salaryFloor), salaryTarget: num(prefs.salaryTarget) }
  };
};

/* ------------------------------------------------------------------ interview progress and story coverage (the Interview Prep engine) */
MD.interview = async function(D){
  var E = null;
  try{ await MD.load('interview-studio.js'); E = root.INTERVIEW_STUDIO_ENGINE || null; }catch(e){ E = null; }
  var sessions = D.sessions.map(function(s){ return Object.assign({}, s, { at: s.at || new Date(s._at).toISOString() }); });
  var out = { engine: !!E, progress: null, coverage: null };
  if(E){
    try{ out.progress = E.progress(sessions); }catch(e){ out.progress = null; }
    try{ out.coverage = E.coverage(D.stories); }catch(e){ out.coverage = null; }
    out.issueText = E.ISSUE_TEXT || {};
    out.dimLabel = E.DIM_LABEL || {};
  }
  return out;
};

/* ------------------------------------------------------------------ the resume score and callbacks per version (the Resume Studio engine) */
MD.resume = async function(D){
  var R = null;
  try{ await MD.load('resume-studio.js'); R = root.RESUME_STUDIO_ENGINE || null; }catch(e){ R = null; }
  var out = { engine: !!R, score: null, vitals: null, callbacks: null };
  if(!R) return out;
  try{
    if(D.entries.length || (D.profile && D.profile.skills)){
      var built = R.buildResume({ profile: D.profile || {}, session: MD.session() || {}, entries: D.entries, doc: D.doc });
      out.score = R.scoreResume(built, {});
    }
  }catch(e){ out.score = null; }
  try{
    var apps = D.apps.map(function(a){ return { id: a.id, listing_title: a.title, listing_org: a.org, status: a.isSent ? 'sent' : a.status, sent_at: a.sentAt, outcome_status: a.stage === 'none' ? (a.latest === 'applied' ? 'applied' : '') : (a.stage === 'rejected' ? 'rejected' : a.stage) }; });
    if(D.versions.length) out.callbacks = R.callbackStats(D.versions, apps);
  }catch(e){ out.callbacks = null; }
  return out;
};

/* ------------------------------------------------------------------ an example, for an account with nothing to chart yet (fictional, labelled on every view) */
function prng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
MD.exampleServer = function(now){
  var rnd = prng(20261010), DAYS = 120;
  function pick(a){ return a[Math.floor(rnd() * a.length)]; }
  function at(daysAgo, hour){ var d = new Date(now - daysAgo * DAY); d.setHours(hour != null ? hour : 9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0); return d.getTime(); }
  var orgs = ['Fernway', 'Northlight Health', 'Delmar Freight', 'Quillon Labs', 'Bramblecode', 'Tidewell', 'Sablecrest', 'Orrin Data', 'Kestrel Point', 'Lumen & Ash', 'Harrowgate Retail', 'Vellum Studio', 'Marisol Energy', 'Copperleaf Bank'];
  var titles = ['Data Analyst', 'Business Intelligence Analyst', 'Junior Data Analyst', 'Analytics Associate', 'Product Analyst', 'Operations Analyst', 'Marketing Analyst'];
  var places = ['New York, NY', 'Remote (US)', 'Chicago, IL', 'Austin, TX', 'Boston, MA', 'Remote (US)', 'Denver, CO'];
  var apps = [], outcomes = [], saved = [], dismissed = [];
  var hows = ['email', 'web_auto', 'web_ext', 'web_ext', 'web', 'web_ext'];
  for(var i = 0; i < 46; i++){
    var created = Math.max(2, Math.round(DAYS * Math.pow(rnd(), 0.85))), org = pick(orgs), lid = 'ex-l' + i, id = 'ex-a' + i;
    var auto = rnd() < 0.62, fit = Math.round(52 + rnd() * 44), ch = pick(hows), autopilot = ch === 'web_ext' && auto && rnd() < 0.5;
    var status = created < 3 && rnd() < 0.5 ? pick(['pending_review', 'approved', 'ready_to_submit']) : 'sent';
    var sentAt = status === 'sent' ? at(created - (rnd() < 0.7 ? 0 : 1)) : null;
    var pkg = auto ? { fit: fit, band: fit >= 85 ? 'excellent' : fit >= 70 ? 'strong' : 'partial', confidence: pick(['high', 'high', 'medium']), stretch: fit < 62, freshness: pick(['new', 'fresh', 'fresh', 'recent', 'aging']), ghost: pick(['low', 'low', 'low', 'elevated']),
      ageDays: Math.round(rnd() * 20), route: pick(['employer', 'employer', 'employer', 'company_site', 'aggregator']), delivery: ch === 'email' ? 'email' : ch === 'web_auto' ? 'auto_submit' : 'extension',
      needs: status === 'pending_review' ? [pick(['stretch', 'answers', 'cover_letter'])] : [], hold: false,
      handoff: status === 'ready_to_submit' ? { key: pick(['aggregator', 'person_step', 'extension', 'no_link']), by: autopilot ? 'autopilot' : '', step: autopilot ? pick(['captcha', 'question', 'login']) : '', possiblySent: false, at: at(created), autopilot: false } : null,
      createdAt: at(created), approvedAt: rnd() < 0.3 ? at(created) : null, sendAt: at(created), sentAt: sentAt, sentChannel: status === 'sent' ? ch : '',
      resume: pick(['version', 'current', 'current']), reordered: rnd() < 0.6, skillCover: { have: 3 + Math.floor(rnd() * 3), of: 6 }, cover: rnd() < 0.45, coverPolicy: 'asked',
      attempts: status === 'sent' ? [{ at: sentAt, channel: ch, status: autopilot ? 'autopilot' : 'sent' }] : [], followUp: sentAt ? { dueAt: sentAt + 7 * DAY, doneAt: rnd() < 0.4 ? sentAt + 8 * DAY : null, notifiedAt: null } : null,
      autopilot: autopilot, tries: autopilot ? 1 : 0 } : null;
    if(pkg && status === 'sent' && ch === 'web') pkg.handoff = { key: pick(['aggregator', 'aggregator', 'person_step', 'no_link', 'missing']), by: '', step: '', possiblySent: false, at: at(created), autopilot: false };
    if(pkg && autopilot) pkg.handoff = { key: 'extension', by: '', step: '', possiblySent: false, at: at(created), autopilot: true };
    apps.push({ id: id, listing_id: lid, title: pick(titles), org: org, location: pick(places), type: rnd() < 0.85 ? 'job' : 'internship', employment_type: 'full_time', source: pick(['greenhouse', 'lever', 'ashby', 'adzuna']),
      posted_at: at(created + 2 + Math.floor(rnd() * 10)), deadline: null, route: pkg ? pkg.route : 'employer', status: status, created_at: at(created), sendable_at: status === 'approved' ? now + (2 + Math.floor(rnd() * 20)) * HOUR : null,
      sent_at: sentAt, channel: status === 'sent' ? ch : (status === 'ready_to_submit' ? 'web' : ''), confidence: fit, counterfactual: null, auto: auto, has_draft: !auto || rnd() < 0.4, flagged: 0,
      factors: { goalFit: rnd(), skillFit: rnd(), locationFit: rnd(), descriptionFit: rnd() }, pkg: pkg });
    if(status === 'sent'){
      var sentDays = (now - sentAt) / DAY, r = rnd(), p = fit >= 80 ? 0.42 : fit >= 65 ? 0.3 : 0.18;
      if(r < p && sentDays > 3){
        var rd = Math.min(sentDays - 1, 2 + Math.round(rnd() * 16));
        var good = rnd() < 0.42;
        outcomes.push({ listing_id: lid, status: 'applied', at: sentAt + 3600e3 });
        if(good){
          outcomes.push({ listing_id: lid, status: 'interview', at: sentAt + rd * DAY });
          if(sentDays - rd > 6){ var r2 = rnd(); if(r2 < 0.18) outcomes.push({ listing_id: lid, status: 'offer', at: sentAt + (rd + 6 + Math.round(rnd() * 8)) * DAY }); else if(r2 < 0.55) outcomes.push({ listing_id: lid, status: 'rejected', at: sentAt + (rd + 5) * DAY }); }
        } else outcomes.push({ listing_id: lid, status: 'rejected', at: sentAt + rd * DAY });
      } else if(sentDays > 45 && rnd() < 0.4) outcomes.push({ listing_id: lid, status: 'ghosted', at: sentAt + 40 * DAY });
    }
  }
  // a few still in flight: waiting for review, going out, and handed back
  [['pending_review', ['stretch']], ['pending_review', ['answers']], ['approved', []], ['ready_to_submit', []], ['ready_to_submit', []]].forEach(function(x, n){
    var org = orgs[(n * 5 + 3) % orgs.length], fit = [64, 78, 88, 81, 74][n], cAt = now - (n + 1) * 5 * HOUR;
    var ho = x[0] === 'ready_to_submit' ? (n === 3 ? { key: 'extension', by: 'autopilot', step: 'captcha', possiblySent: false, at: cAt + HOUR, autopilot: false } : { key: 'aggregator', by: '', step: '', possiblySent: false, at: cAt, autopilot: false }) : null;
    apps.push({ id: 'ex-q' + n, listing_id: 'ex-lq' + n, title: titles[n % titles.length], org: org, location: places[n % places.length], type: 'job', employment_type: 'full_time', source: 'greenhouse', posted_at: cAt - 2 * DAY, deadline: null,
      route: x[0] === 'ready_to_submit' && n === 4 ? 'aggregator' : 'employer', status: x[0], created_at: cAt, sendable_at: x[0] === 'approved' ? now + 3 * HOUR : null, sent_at: null, channel: x[0] === 'ready_to_submit' ? 'web' : '',
      confidence: fit, counterfactual: null, auto: true, has_draft: false, flagged: 0, factors: null,
      pkg: { fit: fit, band: fit >= 85 ? 'excellent' : fit >= 70 ? 'strong' : 'partial', confidence: 'high', stretch: fit < 70, freshness: 'new', ghost: 'low', ageDays: 2, route: 'employer', delivery: 'extension', needs: x[1].slice(), hold: false,
        handoff: ho, createdAt: cAt, approvedAt: null, sendAt: x[0] === 'approved' ? now + 3 * HOUR : null, sentAt: null, sentChannel: '', resume: 'current', reordered: true, skillCover: { have: 4, of: 6 }, cover: false, coverPolicy: 'asked',
        attempts: n === 3 ? [{ at: cAt + HOUR, channel: 'web_ext', status: 'autopilot' }, { at: cAt + HOUR, channel: 'web_ext', status: 'needs_you' }] : [], followUp: null, autopilot: n === 3, tries: n === 3 ? 1 : 0 } });
  });
  outcomes = outcomes.filter(function(o){ return o.at <= now; });
  for(var s = 0; s < 14; s++){ var sa = at(Math.floor(rnd() * 60)); saved.push({ listing_id: 'ex-s' + s, at: sa, title: pick(titles), org: pick(orgs), deadline: rnd() < 0.5 ? new Date(now + Math.round(rnd() * 20) * DAY).toISOString().slice(0, 10) : null, type: 'job' }); }
  for(var k = 0; k < 38; k++) dismissed.push(at(Math.floor(rnd() * DAYS)));
  dismissed.sort(function(a, b){ return b - a; });
  var dimsBase = { structure: 2.4, specificity: 2.1, ownership: 3.0, impact: 1.9, relevance: 3.2, concision: 2.6, delivery: 2.8 };
  var sessions = [];
  for(var q = 0; q < 11; q++){
    var gain = q / 10, dims = {};
    Object.keys(dimsBase).forEach(function(d){ dims[d] = Math.round(Math.min(4.8, dimsBase[d] + gain * (1 + rnd() * 0.9) + (rnd() - 0.5) * 0.4) * 10) / 10; });
    var overall = Math.round(42 + gain * 26 + (rnd() - 0.5) * 8), sAt = at(80 - q * 7 - Math.floor(rnd() * 3));
    sessions.push({ id: 'ex-hs' + q, at: new Date(sAt).toISOString(), role: 'Data Analyst', company: pick(orgs), persona: pick(['recruiter', 'hiring_manager', 'bar_raiser']), difficulty: q < 4 ? 'fair' : (q < 8 ? 'tough' : pick(['tough', 'brutal'])),
      focus: 'mixed', mode: q % 3 ? 'voice' : 'text', source: 'ai', verdict: { overall: overall, decision: overall >= 70 ? 'hire' : overall >= 60 ? 'lean_hire' : overall >= 50 ? 'lean_no_hire' : 'no_hire', competencies: [] },
      dims: dims, delivery: q % 3 ? { answers: 6, spoken: 6, wpm: Math.round(172 - q * 3 + rnd() * 6), fillersPerMin: Math.round((4.2 - q * 0.28 + rnd() * 0.6) * 10) / 10, seconds: 420 } : null,
      issues: q < 6 ? ['noresult', 'hedge', 'vague'].slice(0, 1 + (q % 3)) : (rnd() < 0.5 ? ['long'] : []),
      turns: ['tell', 'behavioral', 'behavioral', 'situational', 'motivation', 'technical'].map(function(t){ return { qtype: t, follow: false, skipped: false, judge: { overall: Math.round(Math.min(10, overall / 10 + (rnd() - 0.5) * 2) * 10) / 10, scores: {} }, m: { seconds: 60 + Math.round(rnd() * 70) } }; }) });
  }
  var stories = [
    { id: 'ex-x1', title: 'Rebuilt the weekly sales dashboard', s: 'Our weekly sales report took two days to assemble by hand.', t: 'I owned fixing it.', a: 'I rebuilt it in SQL and Tableau and automated the refresh.', r: 'It now refreshes in minutes and the team uses it daily.', competencies: ['problem_solving', 'ownership'], created: at(70) },
    { id: 'ex-x2', title: 'Disagreed with my manager on a metric', s: 'We were about to report a churn number I thought was wrong.', t: 'I needed to raise it without derailing the review.', a: 'I showed both calculations side by side and proposed a fix.', r: 'We changed the definition before the board meeting.', competencies: ['conflict', 'influence'], created: at(55) },
    { id: 'ex-x3', title: 'Led a three-person data project', s: 'A cross-team pricing analysis had no owner.', t: 'I volunteered to lead it.', a: 'I split the work, ran check-ins and wrote the summary.', r: 'Shipped two weeks early.', competencies: ['leadership', 'execution'], created: at(30) }
  ];
  var debriefs = [{ id: 'ex-db1', at: at(20), date: new Date(now - 20 * DAY).toISOString().slice(0, 10), stage: 'Recruiter screen', company: 'Quillon Labs', role: 'Data Analyst', questions: 4 },
    { id: 'ex-db2', at: at(9), date: new Date(now - 9 * DAY).toISOString().slice(0, 10), stage: 'Hiring manager', company: 'Quillon Labs', role: 'Data Analyst', questions: 6 }];
  var sentIds = apps.filter(function(a){ return a.status === 'sent'; }).map(function(a){ return a.id; });
  var versions = [{ id: 'ex-rv1', name: 'Analyst - general', source: 'manual', created: at(100), sent_to: sentIds.slice(0, 14) },
    { id: 'ex-rv2', name: 'Tailored: BI Analyst', source: 'tailored', created: at(60), sent_to: sentIds.slice(14, 26) },
    { id: 'ex-rv3', name: 'Product analytics', source: 'fit', created: at(25), sent_to: sentIds.slice(26, 30) }];
  var contacts = [];
  for(var c = 0; c < 9; c++) contacts.push({ id: 'ex-c' + c, name: pick(['Sam', 'Priya', 'Jordan', 'Wei', 'Amara', 'Luis', 'Noor']), company: pick(orgs), how: pick(['Alumni', 'Meetup', 'Referral', 'LinkedIn']), followup: c < 2 ? new Date(now - c * DAY).toISOString().slice(0, 10) : (c < 4 ? new Date(now + (c + 2) * DAY).toISOString().slice(0, 10) : null), created: at(90 - c * 9) });
  var planItems = [
    { id: 'skill:sql', kind: 'skill', skillId: 'sql', status: 'done', doneAt: at(70), dueAt: at(72), verifiedAt: at(60) },
    { id: 'prove:sql', kind: 'prove', skillId: 'sql', status: 'done', doneAt: at(52), dueAt: at(50) },
    { id: 'skill:tableau', kind: 'skill', skillId: 'tableau', status: 'done', doneAt: at(40), dueAt: at(38) },
    { id: 'skill:python', kind: 'skill', skillId: 'python', status: 'doing', startedAt: at(20), dueAt: now + 6 * DAY },
    { id: 'prove:python', kind: 'prove', skillId: 'python', dueAt: now + 20 * DAY },
    { id: 'cred:google_analytics', kind: 'credential', skillId: 'google_analytics', dueAt: at(3) },
    { id: 'network', kind: 'network', status: 'doing', dueAt: now + 10 * DAY },
    { id: 'apply', kind: 'apply', status: 'doing', dueAt: now + 30 * DAY },
    { id: 'interview', kind: 'interview', status: 'done', doneAt: at(12), dueAt: at(14) }];
  var history = [];
  for(var h = 0; h < 10; h++) history.push({ at: at(95 - h * 10), role: 'data_analyst', n: 140 + Math.round(rnd() * 30), strong: 6 + h * 2 + Math.round(rnd() * 2), reach: 22 + h * 3 + Math.round(rnd() * 3), median: Math.round((48 + h * 1.4 + rnd()) * 10) / 10 });
  var runs = [];
  for(var u = 0; u < 12; u++) runs.push({ at: at(24 - u * 2, 7), reason: 'schedule', considered: 30 + Math.round(rnd() * 20), created: Math.round(rnd() * 4), review: Math.round(rnd() * 2), approved: Math.round(rnd() * 3), waiting: 0, held: 6 + Math.round(rnd() * 8),
    heldCounts: { fit: 3 + Math.round(rnd() * 4), ghost: Math.round(rnd() * 2), agency: Math.round(rnd() * 2), salary: Math.round(rnd() * 2), location: Math.round(rnd() * 3), company_limit: Math.round(rnd() * 2) }, excluded: { applied: 5 + Math.round(rnd() * 4), closed: Math.round(rnd() * 2) }, errors: 0, paused: '', cap: 5, madeToday: Math.round(rnd() * 4), slots: 5 });
  var learned = []; for(var l2 = 0; l2 < 7; l2++) learned.push(at(60 - l2 * 8));
  var journal = []; for(var jj = 0; jj < 16; jj++) journal.push({ at: at(Math.floor(rnd() * 90)), tagged: rnd() < 0.6 });
  return {
    v: 1, now: now, has_profile: true, tier: 'pro', features: { auto_mode: true, auto_submit: true, roadmap: true, interview_prep: true, workshop: true },
    profile: { northstar: 'Data analyst at a mission-driven company', skills: 'SQL, Tableau, Excel, Python, A/B testing, Stakeholder communication', history: [{ at: at(118), northstar: 'Marketing analyst' }, { at: at(70), northstar: 'Data analyst at a mission-driven company' }] },
    apps: apps.sort(function(a, b){ return b.created_at - a.created_at; }), outcomes: outcomes.sort(function(a, b){ return a.at - b.at; }), saved: saved, dismissed: dismissed,
    auto: { enabled: true, consent: true, tierMax: 10, rules: { mode: 'auto', minFit: 70, dailyCap: 5, weeklyCap: 25, delayMinutes: 120, followUpDays: 7 }, runs: runs, lastRunAt: at(0, 7), extensionSeenAt: at(0, 8), lastError: false,
      coverage: { have: 11, of: 13, missing: ['Start date', 'How did you hear about the job?'] }, learned: learned, custom: { form: 7, yours: 4 },
      autopilot: { seenAt: at(0, 8), okAt: at(0, 8), offAt: null, live: true, onSince: at(30), note: null, last: { at: at(0, 8), sent: 2, needs: 1, unsure: 0 }, maxAgeDays: 7 } },
    items: { stories: stories, sessions: sessions, debriefs: debriefs, answers: [{ id: 'b1', category: 'behavioral', answered: true, score: { structure: 4, specificity: 3, clarity: 4 } }, { id: 'b2', category: 'tell', answered: true, score: { structure: 3, specificity: 3, clarity: 4 } }, { id: 'b5', category: 'motivation', answered: true, score: {} }],
      versions: versions, contacts: contacts, targets: [{ id: 'ex-t1', role: 'Data Analyst', company: 'Quillon Labs', status: 'applied' }, { id: 'ex-t2', role: 'BI Analyst', company: 'Tidewell', status: 'networking' }, { id: 'ex-t3', role: 'Product Analyst', company: 'Orrin Data', status: 'researching' }],
      counts: { asks: 6, achievements: 5, references: 2, portfolio: 1, pitch: true },
      plan: { v: 1, role: 'data_analyst', route: 'direct', hoursPerWeek: 8, startAt: at(100), targetAt: now + 40 * DAY, items: planItems, history: history, changedAt: at(1) }, planAt: at(1) },
    search: { prefs: { targetRoles: ['data_analyst', 'bi_analyst'], salaryFloor: 65000, salaryTarget: 85000, locations: 'New York, Remote', modes: ['remote', 'hybrid'] },
      searches: [{ id: 'ex-ss1', name: 'Data analyst, New York', alert: true, created: at(80), newCount: 3, lastCount: 41, lastCheck: at(0, 6) }, { id: 'ex-ss2', name: 'Remote BI roles', alert: true, created: at(50), newCount: 1, lastCount: 18, lastCheck: at(0, 6) }, { id: 'ex-ss3', name: 'Product analyst', alert: false, created: at(20), newCount: 0, lastCount: 26, lastCheck: at(2) }], learned: 6, applied: 30 },
    journal: journal.sort(function(a, b){ return b.at - a.at; }), notifications: [{ type: 'scan', at: at(0, 6), read: false }, { type: 'auto_apply', at: at(0, 8), read: false }, { type: 'auto_apply', at: at(1), read: true }],
    resume_entries: [{ id: 'ex-e1', entry_type: 'work', title: 'Data Analyst Intern', org: 'Brightway Co-op', start_date: 'Jun 2024', end_date: 'Aug 2024', raw_description: '- Built SQL queries and a Tableau dashboard for weekly sales\n- Automated an Excel report with Python, saving the team 3 hours a week' },
      { id: 'ex-e2', entry_type: 'work', title: 'Research Assistant', org: 'State University', start_date: 'Sep 2023', end_date: 'May 2024', raw_description: '- Cleaned and analysed survey data in R\n- Presented findings to the department' },
      { id: 'ex-e3', entry_type: 'education', title: 'BA Economics', org: 'State University', start_date: '2020', end_date: '2024', raw_description: 'Minor in Statistics' }],
    outreach: [{ listing_id: 'ex-l3', status: 'sent', at: at(30), auto: true }, { listing_id: 'ex-l9', status: 'drafted', at: at(4), auto: true }],
    coverage: { jobs: 52000, employers: 1400, checked_24h: 41000, checked_24h_pct: 79, by_source: { greenhouse: 31000, lever: 9000, ashby: 6000, workable: 4000, smartrecruiters: 2000 }, as_of: new Date(now).toISOString() },
    missing: []
  };
};
MD.example = function(now){
  now = now || Date.now();
  var S = MD.exampleServer(now);
  var D = MD.normalize(S, { profile: { northstar: S.profile.northstar, skills: S.profile.skills, loc: 'New York, NY', stage: 'grad', timeframe: 'now', types: ['job'] } }, null, now);
  D.example = true; D.signedIn = false; D.uid = null; D.tier = 'pro';
  D.source = { server: false, missing: [], at: now, example: true };
  D.dismissReasons = ['too_senior', 'location', 'salary', 'not_my_field', 'skills', 'too_senior', 'location', 'company', 'too_senior', 'salary', 'not_my_field', 'location'].map(function(r, i){ return { id: 'ex-d' + i, reason: r, at: now - i * 5 * DAY }; });
  return D;
};

root.MISSION_DATA = MD;
})(typeof window !== 'undefined' ? window : globalThis);
