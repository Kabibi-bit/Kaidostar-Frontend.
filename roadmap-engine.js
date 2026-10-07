/* ============================================================================
   Kaidostar Roadmap engine - the "Proof Plan".

   A roadmap from where you can PROVE you are today to the role you want,
   built from the live jobs in your market and re-checked every time it runs.

   What makes every number here honest:
   - Readiness is counted, not estimated: each live job in your target role is
     scored by the same Proof Match engine as the Job Search page, and "Strong"
     means the same 70+ it means there. A "stretch" is a job that is a 70+ match
     on everything except the years or level it asks for, and only when that gap
     is modest (under three years, or one level) - never a long shot.
   - What a step is worth is an exact re-score: "proving SQL moves 12 more jobs
     to Strong" is the count of today's jobs whose fit crosses 70 when SQL is
     added to your record AFTER the steps before it - nothing is guessed, and the
     steps are ordered by what each one adds on top of the last.
   - Progress is proof: a skill step is verified only when your resume shows the
     skill in use (the engine then counts it in every fit). Marking a step done
     yourself is allowed and labelled as yours - it never moves a number.
   - The only estimates are effort hours. They are labelled as rough ranges, you
     can overwrite them, and once you finish steps your own pace replaces them.

   Pure functions only: no DOM, no storage, no network, no clock. Callers pass
   `now` and the job engine in, so results are reproducible and testable.
   ============================================================================ */
(function (root) {
  'use strict';

  var VERSION = '1.1.0';
  var STRONG = 70;
  var DAY = 86400000, WEEK = 7 * DAY;
  var APPLY_MIN = 3;          // jobs within reach before a real search is worth running
  var MIN_BRIDGE_N = 5;       // a stepping-stone role needs at least this many live jobs to count
  var MAX_SKILL_MOVES = 6;    // skill steps in one plan
  var GAP_POOL = 12;          // most-asked gaps considered for those steps
  var HISTORY_CAP = 60;       // daily readiness snapshots kept
  var MAX_PLAN_ITEMS = 30;
  var HPW_MIN = 2, HPW_MAX = 60;

  /* ------------------------------------------------------------ helpers */
  function str(v) { return v == null ? '' : String(v); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rnd(x) { return Math.floor(x + 0.5); }
  function own(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function median(xs) { if (!xs.length) return null; var s = xs.slice().sort(function (a, b) { return a - b; }); return s[Math.floor((s.length - 1) / 2)]; }
  function cmpStr(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }
  function timeOf(v) {
    if (isNum(v)) return v;
    var t = Date.parse(str(v));
    return isFinite(t) ? t : null;
  }
  function fmtHours(lo, hi) { return lo === hi ? '~' + lo + ' h' : lo + '–' + hi + ' h'; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dict() { return Object.create(null); }

  /* ----------------------------------------------------- skill index */
  var SKI = null, SKI_TAX = null;
  function skIdx(JE) {
    var T = JE.TAX;
    if (SKI && SKI_TAX === T) return SKI;
    var byId = dict(), fam = dict(), impliedBy = dict();
    T.skills.forEach(function (s) {
      byId[s.id] = s;
      if (s.family) (fam[s.family] = fam[s.family] || []).push(s.id);
      arr(s.implies).forEach(function (t) { (impliedBy[t] = impliedBy[t] || []).push(s.id); });
    });
    SKI = { byId: byId, fam: fam, impliedBy: impliedBy }; SKI_TAX = T;
    return SKI;
  }
  function skillInfo(JE, sid) { return skIdx(JE).byId[sid] || null; }
  // what you'd be credited with on a skill today: the Job Search engine's own rule (same skill, a close cousin, or a
  // skill it builds on)
  function haveLevel(JE, cand, sid) {
    var cs = cand.skills[sid]; if (cs) return cs.level;
    var X = skIdx(JE), sk = X.byId[sid]; if (!sk) return 'missing';
    if (sk.family && arr(X.fam[sk.family]).some(function (k) { return k !== sid && cand.skills[k]; })) return 'adjacent';
    if (arr(sk.implies).some(function (k) { return cand.skills[k]; })) return 'related';
    return 'missing';
  }
  // every posting skill whose credit can change when `sid` is proven: the skill, the skills it implies, their close
  // cousins, and the skills that build on them
  function touchSet(JE, sid) {
    var X = skIdx(JE), sk = X.byId[sid], out = dict();
    if (!sk) return out;
    [sid].concat(arr(sk.implies)).forEach(function (y) {
      out[y] = 1;
      var yi = X.byId[y];
      if (yi && yi.family) arr(X.fam[yi.family]).forEach(function (k) { out[k] = 1; });
      arr(X.impliedBy[y]).forEach(function (k) { out[k] = 1; });
    });
    return out;
  }

  /* ----------------------------------------------------- effort model
     Rough hours to reach a WORKING level - enough to use the skill in a real
     project. Labelled as estimates everywhere, editable, and replaced by the
     person's own pace once they've finished steps. */
  var EFFORT_CLASS = {
    xs: [4, 10], s: [10, 30], m: [25, 60], l: [60, 150], xl: [150, 400],
    prove: [2, 6], lang: [600, 1100],
  };
  var KIND_DEFAULT = { tool: 's', hard: 'm', cert: 'm', lang: 'lang', soft: 'prove' };
  var EFFORT_OVERRIDE = {
    // quick tools
    google_sheets: 'xs', canva: 'xs', jira: 'xs', presentation_decks: 'xs', survey_tools: 'xs', hipaa: 'xs', data_entry: 'xs',
    bls_cpr: 'xs', osha_card: 'xs', office_suite: 'xs',
    // tools and narrow skills
    git: 's', excel: 's', tableau: 's', power_bi: 's', looker: 's', qlik: 's', google_analytics: 's', product_analytics_tools: 's',
    figma: 's', sketch_xd: 's', hubspot: 's', salesforce: 's', crm: 's', docker: 's', linux: 's', html_css: 's', bash: 's',
    seo: 's', sem: 's', email_marketing: 's', medical_terminology: 's', dbt: 's', snowflake: 's', bigquery: 's', redshift: 's',
    prototyping: 's', mailchimp: 's', klaviyo: 's', marketing_automation: 's', accounting_software: 's', lms: 's',
    // working-level skills
    sql: 'm', pandas: 'm', data_viz: 'm', data_analysis: 'm', experimentation: 'm', rest_apis: 'm', react: 'm', nodejs: 'm',
    django: 'm', flask: 'm', fastapi: 'm', aws: 'm', gcp: 'm', azure: 'm', kubernetes: 'm', terraform: 'm', typescript: 'm',
    financial_modeling: 'm', fpa: 'm', forecasting: 'm', user_research: 'm', ux_design: 'm', ui_design: 'm', copywriting: 'm',
    content_marketing: 'm', data_modeling: 'm', etl: 'm', data_warehousing: 'm', spark: 'm', airflow: 'm', capm_cert: 'm',
    aws_cert: 'm', security_plus: 'm', comptia_a_plus: 'm', network_plus: 'm', phlebotomy: 'm',
    // deep skills
    python: 'l', java: 'l', javascript: 'l', csharp: 'l', go_lang: 'l', c_lang: 'l', ruby: 'l', php: 'l', swift: 'l', kotlin: 'l',
    statistics: 'l', machine_learning: 'l', product_management: 'l', project_management: 'm', system_design: 'l', algorithms: 'l',
    mlops: 'l', cybersecurity: 'l', networking: 'l', ios: 'l', android: 'l', audit: 'l', tax: 'l', valuation: 'm',
    cpp: 'xl', deep_learning: 'xl', nlp: 'xl', computer_vision: 'xl', embedded: 'xl', accounting: 'xl', cna_cert: 'l', oscp: 'l',
  };
  // A framework or tool you can't learn without its base (React without JavaScript, pandas without Python, PostgreSQL
  // without SQL): when the base is missing too, the step's hours include it. Broad categories a skill "implies" for
  // matching (data analysis, data visualisation) are not prerequisites and never add hours.
  var PREREQ = { javascript: 1, python: 1, java: 1, ruby: 1, csharp: 1, sql: 1, react: 1, excel: 1 };
  // Credentials with formal prerequisites: no amount of weekly hours shortens them, so they are never scheduled as a
  // step - they become a decision, stated plainly.
  var GATED = {
    rn_license: 'Needs an accredited nursing program (ADN or BSN) and a pass on the NCLEX-RN exam.',
    aprn_license: 'Needs an RN license, a graduate nursing degree (MSN or DNP) and national certification.',
    cpa: 'Needs the college credit your state sets, the CPA exam and supervised experience.',
    bar_admission: 'Needs a law degree (JD) and a pass on a state bar exam.',
    teaching_license: 'Needs a state-approved teacher-preparation program (or an alternative-certification route) and state exams.',
    electrician_license: 'Needs an apprenticeship - typically about four years of supervised work - and a state exam.',
    master_electrician: 'Needs years as a licensed journeyman electrician and a state exam.',
    cdl: 'Needs entry-level driver training from a registered provider and state knowledge and skills tests (weeks, not years).',
    pe_license: 'Needs an engineering degree, the FE exam, typically four years of supervised experience and the PE exam.',
    pharmacist_license: 'Needs a PharmD and the NAPLEX (most states add a law exam).',
    lcsw: 'Needs an MSW, supervised clinical hours and a licensing exam.',
    lmsw_license: 'Needs an MSW and a licensing exam.',
    lpc_license: 'Needs a master’s in counseling, supervised clinical hours and a state exam.',
    lmft_license: 'Needs a master’s in marriage and family therapy, supervised clinical hours and a state exam.',
    cfa: 'Three exam levels, each usually studied for hundreds of hours, plus relevant work experience for the charter.',
    pmp: 'Needs about three years leading projects plus 35 hours of project-management education before the exam.',
    cissp: 'Needs five years of paid security work (a degree or another credential can count for one year).',
    cism: 'Needs five years of information-security work, three of them in security management.',
    casp: 'An advanced exam; CompTIA recommends about ten years in IT, five of them hands-on in security.',
    jd_degree: 'A three-year law degree.',
    pharmd: 'A four-year Doctor of Pharmacy program (after its prerequisites).',
    pharmacy_residency: 'One or two years of residency after a PharmD.',
    pharmacy_board_cert: 'Needs a PharmD plus residency or practice experience, then a board exam.',
    eit_cert: 'The FE exam, usually taken near the end of (or after) an accredited engineering degree.',
  };

  function effortFor(JE, sid, have) {
    var sk = skillInfo(JE, sid);
    if (!sk) return { cls: 'm', lo: EFFORT_CLASS.m[0], hi: EFFORT_CLASS.m[1], gated: false };
    if (GATED[sid] || sk.license) return { cls: 'gated', lo: null, hi: null, gated: true, note: GATED[sid] || 'A licensed credential with formal requirements.' };
    if (have === 'stated') return { cls: 'prove', lo: EFFORT_CLASS.prove[0], hi: EFFORT_CLASS.prove[1], gated: false };
    var cls = own(EFFORT_OVERRIDE, sid) || KIND_DEFAULT[sk.kind] || 'm';
    // you already have a close cousin (Looker when it asks for Tableau): about half the climb
    var lo = EFFORT_CLASS[cls][0], hi = EFFORT_CLASS[cls][1];
    if (have === 'adjacent' || have === 'related') { lo = Math.max(2, rnd(lo * 0.5)); hi = Math.max(lo + 2, rnd(hi * 0.5)); }
    return { cls: cls, lo: lo, hi: hi, gated: false, lang: cls === 'lang' };
  }
  function effortWithBase(JE, sid, have, cand) {
    var e = effortFor(JE, sid, have);
    var out = Object.assign({ includes: [], includeIds: [] }, e);
    if (e.gated || e.lang || have === 'stated') return out;
    var sk = skillInfo(JE, sid);
    arr(sk && sk.implies).forEach(function (t) {
      if (!PREREQ[t]) return;
      var h = haveLevel(JE, cand, t);
      if (h === 'proven' || h === 'stated') return;
      var et = effortFor(JE, t, h);
      if (et.gated || et.lang) return;
      out.lo += et.lo; out.hi += et.hi;
      out.includes.push(skillInfo(JE, t).name); out.includeIds.push(t);
    });
    return out;
  }

  /* ------------------------------------------------- candidate what-ifs */
  // the same rule the job engine applies to a skill you prove: it counts in full, and so do the skills it implies
  function withProven(JE, cand, sids) {
    var skills = Object.assign({}, cand.skills);
    sids.forEach(function (sid) {
      var sk = skillInfo(JE, sid); if (!sk) return;
      skills[sid] = { id: sid, name: sk.name, level: 'proven', evidence: 'what-if', source: 'what-if', via: null };
      arr(sk.implies).forEach(function (t) {
        var ti = skillInfo(JE, t);
        if (ti && (!skills[t] || skills[t].level !== 'proven')) skills[t] = { id: t, name: ti.name, level: 'proven', evidence: 'what-if', source: 'what-if', via: sk.name };
      });
    });
    return Object.assign({}, cand, { skills: skills, provenCount: Object.keys(skills).filter(function (k) { return skills[k].level === 'proven'; }).length });
  }
  // the record as it was before a step: the skill back at the level it had when the step was planned
  function withLevel(cand, sid, level) {
    var skills = Object.assign({}, cand.skills);
    if (level === 'missing' || level === 'adjacent' || level === 'related' || !level) delete skills[sid];
    else if (skills[sid]) skills[sid] = Object.assign({}, skills[sid], { level: level });
    return Object.assign({}, cand, { skills: skills, provenCount: Object.keys(skills).filter(function (k) { return skills[k].level === 'proven'; }).length });
  }

  /* -------------------------------------------------------------- market */
  // Where you'd actually work, not what you'd like to see: your places and the work modes you rule out, blocked
  // companies and industries, eligibility - and none of the page's display filters (a minimum fit would hide the
  // very jobs this plan is about).
  function marketPrefs(JE, prefs, profile) {
    var p = JE.mergePrefs(prefs || null, null);
    var hasLoc = !!(str(p.locations).trim() || str(profile.loc).trim());
    var anywhere = /(?<![a-z])(anywhere|any location|open to relocat|willing to relocate|flexible)(?![a-z])/i.test(str(p.locations) + ' ' + str(profile.loc));
    return JE.mergePrefs(p, {
      minFit: 0, postedWithin: null, hideReposts: false, ghostRule: 'rank', hideAgencies: false, hideEvergreen: true, hideThin: false,
      mustSkills: [], keywords: [], excludeKeywords: [], excludePhrases: [], onlyRoles: [], excludeRoles: [], companies: [],
      salaryRule: 'rank', hideNoSalary: false, levelRule: 'rank', yearsRule: 'rank', typeRule: 'rank', industryRule: 'rank',
      rankKeywords: [], skillsMore: [], skillsAvoid: [], dreamCompanies: [], maxYears: null, levels: [], types: [],
      locationRule: hasLoc && !p.relocate && !anywhere ? 'hide' : p.locationRule,
    });
  }
  function whereLabel(mprefs, profile) {
    var w = str(mprefs.locations).trim() || str(profile.loc).trim();
    return w ? w.slice(0, 80) : '';
  }
  function belongs(JE, job, rid) {
    return arr(job.roles).some(function (r) { return r.id === rid || JE.roleSim(r.id, rid) >= 0.95; });
  }

  /* --------------------------------------------------------- readiness */
  // A stretch: Strong on everything but the years or level asked for, and that gap is modest - the engine's own caps
  // for "under three years short" (64, 69, 79) and "one level up" (69). Three years or more, or two levels up, is a
  // long shot and never counted as within reach.
  var STRETCH_KEYS = { years: 1, level: 1 };
  var STRETCH_MIN_CAP = 64;
  function isStretch(s) {
    if (!s || s.fit == null || s.fit >= STRONG || s.fitUncapped == null || s.fitUncapped < STRONG) return false;
    var any = false, caps = arr(s.caps);
    for (var i = 0; i < caps.length; i++) {
      var c = caps[i];
      if (!c || c.cap >= STRONG) continue;
      if (STRETCH_KEYS[c.key] && c.cap >= STRETCH_MIN_CAP) { any = true; continue; }
      return false;
    }
    return any;
  }
  // the fit a job would have if only a modest years-or-level gap were waived: how close you really are to it
  function softFit(s) {
    if (!s || s.fit == null) return null;
    if (s.fitUncapped == null) return s.fit;
    var f = s.fitUncapped;
    arr(s.caps).forEach(function (c) { if (!c) return; if (STRETCH_KEYS[c.key] && c.cap >= STRETCH_MIN_CAP) return; if (c.cap < f) f = c.cap; });
    return f;
  }
  function statsOf(scores) {
    var strong = 0, stretch = 0, fits = [];
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      if (!s || s.fit == null) continue;
      fits.push(s.fit);
      if (s.fit >= STRONG) strong++; else if (isStretch(s)) stretch++;
    }
    return { strong: strong, stretch: stretch, reach: strong + stretch, medianFit: median(fits) };
  }
  var CAP_GROUP = {
    skills: 'skills', skills_gap: 'skills', title_skill: 'skills', evidence: 'proof',
    years: 'experience', level: 'experience', education: 'degree', license: 'license', license_state: 'license',
    clearance: 'eligibility', auth: 'eligibility', region: 'eligibility', management: 'management',
    eligibility: 'program', overqualified: 'overqualified', role: 'field',
    unverified: 'detail', role_unknown: 'detail', title_only: 'detail', thin_reqs: 'detail', unplaced: 'detail',
  };
  var BLOCKER_TEXT = {
    skills: 'Skills they ask for that your record doesn’t show yet',
    proof: 'Skills you list but no resume line shows in use',
    experience: 'More years or a higher level than you have',
    degree: 'A degree you don’t list',
    license: 'A license or credential you don’t hold',
    eligibility: 'Clearance, citizenship or region rules',
    management: 'People-management experience',
    program: 'Student or graduation-date rules',
    overqualified: 'Below your level',
    field: 'Mostly a different kind of work',
    detail: 'Too little detail in the posting to rate higher',
  };
  function blockerOf(s) {
    if (s.capApplied) return CAP_GROUP[s.capApplied.key] || 'skills';
    return s.dims && isNum(s.dims.role) && s.dims.role < 50 ? 'field' : 'skills';
  }
  function readiness(JE, items, cand) {
    var n = items.length, bands = { excellent: 0, strong: 0, partial: 0, weak: 0, poor: 0, unknown: 0 };
    var blockers = dict(), stretchBy = dict(), yrs = { none: 0, '0-1': 0, '2-3': 0, '4-5': 0, '6+': 0 };
    var degree = 0, degreeEq = 0, remote = 0, within = [];
    var st = statsOf(items.map(function (it) { return it.score; }));
    items.forEach(function (it) {
      var s = it.score, j = it.job;
      bands[s.band] = (bands[s.band] || 0) + 1;
      if (s.fit != null && s.fit >= STRONG) within.push({ id: str(j.id), fit: s.fit, stretch: false });
      else if (s.fit != null) {
        var g = blockerOf(s);
        blockers[g] = (blockers[g] || 0) + 1;
        if (isStretch(s)) { stretchBy[g] = (stretchBy[g] || 0) + 1; within.push({ id: str(j.id), fit: s.fit, stretch: true }); }
      }
      var ym = j.yearsMin;
      if (!isNum(ym)) yrs.none++; else if (ym <= 1) yrs['0-1']++; else if (ym <= 3) yrs['2-3']++; else if (ym <= 5) yrs['4-5']++; else yrs['6+']++;
      if (j.education && isNum(j.education.level) && j.education.level >= 2) { degree++; if (j.education.equivalentOk) degreeEq++; }
      if (j.mode === 'remote') remote++;
    });
    within.sort(function (a, b) { return (a.stretch - b.stretch) || (b.fit - a.fit) || cmpStr(a.id, b.id); });
    var pulse = n ? JE.marketPulse(items, cand) : { topSkills: [], salary: { n: 0 } };
    var blockList = Object.keys(blockers).filter(function (k) { return k !== 'detail' && k !== 'overqualified'; }).map(function (k) {
      return { key: k, count: blockers[k], stretch: stretchBy[k] || 0, text: BLOCKER_TEXT[k] || k };
    }).sort(function (a, b) { return b.count - a.count || cmpStr(a.key, b.key); });
    return {
      n: n, strong: st.strong, stretch: st.stretch, reach: st.reach, medianFit: st.medianFit, bands: bands,
      withinIds: within.slice(0, 40).map(function (w) { return w.id; }),
      blockers: blockList, otherBlocked: (blockers.detail || 0) + (blockers.overqualified || 0),
      years: yrs, degree: degree, degreeEquivalentOk: degreeEq, remote: remote,
      topSkills: pulse.topSkills || [], salary: pulse.salary || { n: 0 },
    };
  }

  /* ------------------------------------------------------- projections */
  // Re-scores today's jobs as your record changes, one proven skill at a time. Only the jobs that ask for a skill the
  // change can touch are re-scored (the rest can't move); proving your very first skill lifts a cap on every job, so
  // that one re-scores them all.
  function Projector(JE, items, cand, prefs, rid) {
    this.JE = JE; this.items = items; this.cand = cand; this.prefs = prefs; this.opts = { queryRoles: [rid] };
    this.scores = items.map(function (it) { return it.score; });
    this.stats = statsOf(this.scores);
    this.skillsOf = items.map(function (it) { var o = dict(); arr(it.job.skills).forEach(function (s) { o[s.id] = 1; }); return o; });
  }
  Projector.prototype.tryProve = function (sid) {
    var JE = this.JE, c2 = withProven(JE, this.cand, [sid]);
    var all = !(this.cand.provenCount > 0), T = all ? null : touchSet(JE, sid);
    var scores = this.scores.slice(), gain = 0, touched = 0, crossed = [], reached = [];
    for (var i = 0; i < this.items.length; i++) {
      if (!all) {
        var ks = this.skillsOf[i], hit = false;
        for (var k in T) { if (ks[k]) { hit = true; break; } }
        if (!hit) continue;
      }
      var s1 = this.scores[i], s2 = JE.scoreJob(this.items[i].job, c2, this.prefs, this.opts);
      scores[i] = s2;
      if (s1.fit == null || s2.fit == null) continue;
      touched++;
      gain += softFit(s2) - softFit(s1);
      var wasStrong = s1.fit >= STRONG, isStrong = s2.fit >= STRONG;
      if (!wasStrong && isStrong) crossed.push(str(this.items[i].job.id));
      else if (!isStrong && !isStretch(s1) && isStretch(s2)) reached.push(str(this.items[i].job.id));
    }
    return { sid: sid, cand: c2, scores: scores, stats: statsOf(scores), gain: gain, touched: touched, crossedIds: crossed, reachedIds: reached };
  };
  Projector.prototype.commit = function (r) { this.cand = r.cand; this.scores = r.scores; this.stats = r.stats; };
  Projector.prototype.fork = function () { var f = Object.create(Projector.prototype); Object.assign(f, this); return f; };

  function rescoreCount(JE, items, cand, prefs, rid) {
    return statsOf(items.map(function (it) { return JE.scoreJob(it.job, cand, prefs, { queryRoles: [rid] }); }));
  }

  /* ------------------------------------------------------------- moves */
  // the skills the jobs ask for that your record doesn't fully cover - counted per job, once, and only where an
  // "A or B" choice isn't already met by the other option
  function gapSkills(JE, items) {
    var X = skIdx(JE), g = dict(), order = [];
    items.forEach(function (it) {
      var s = it.score; if (!s || s.fit == null) return;
      var groupBest = dict(), seen = dict();
      arr(s.skillDetail).forEach(function (d) { if (d.group) groupBest[d.group] = Math.max(groupBest[d.group] || 0, d.credit || 0); });
      arr(s.skillDetail).forEach(function (d) {
        var sk = X.byId[d.id];
        if (!sk || sk.kind === 'soft' || d.credit >= 1 || seen[d.id]) return;
        if (d.group && groupBest[d.group] >= 1) return;
        seen[d.id] = 1;
        if (!g[d.id]) { g[d.id] = { id: d.id, jobs: 0, required: 0 }; order.push(d.id); }
        g[d.id].jobs++; if (d.required) g[d.id].required++;
      });
    });
    order.sort(function (a, b) { return g[b].jobs - g[a].jobs || g[b].required - g[a].required || cmpStr(a, b); });
    return order.map(function (id) { return g[id]; });
  }

  // The skill steps for one route, chosen one at a time by what each adds on top of the steps before it (exact
  // re-scores of today's jobs). Until enough jobs are within reach to start applying, the step that gets you there
  // fastest wins (jobs gained per hour); after that, the one that moves the most jobs to Strong for the time.
  function planMoves(JE, rid, items, cand, prefs, T) {
    var n = items.length, gaps = gapSkills(JE, items);
    var P = new Projector(JE, items, cand, prefs, rid);
    var start = P.stats, curve = [start], moves = [];
    var pool = [], creds = [], langs = [];
    gaps.forEach(function (g) {
      var sk = skillInfo(JE, g.id); if (!sk) return;
      var e0 = effortFor(JE, g.id, haveLevel(JE, cand, g.id));
      if (e0.gated) { creds.push({ g: g, sk: sk, eff: e0 }); return; }
      if (e0.lang) { langs.push({ id: g.id, name: sk.name, jobs: g.jobs, share: n ? rnd(100 * g.jobs / n) : 0 }); return; }
      if (pool.length < GAP_POOL) pool.push({ g: g, sk: sk });
    });
    // a step's standing: 2 = it moves jobs (to Strong, or within reach); 1 = it doesn't, but it's broadly asked for and
    // either cheap proof of something you list or a real lift on those jobs; 0 = not worth a step on its own
    function evalMove(Pr, m, phase1) {
      var have = haveLevel(JE, Pr.cand, m.g.id);
      if (have === 'proven') return null;
      var eff = effortWithBase(JE, m.g.id, have, Pr.cand);
      var cur = Pr.stats, r = Pr.tryProve(m.g.id);
      var dS = r.stats.strong - cur.strong, dR = r.stats.reach - cur.reach;
      var core = dS + 0.5 * ((r.stats.reach - r.stats.strong) - (cur.reach - cur.strong));
      var avg = r.touched ? r.gain / r.touched : 0;
      var share = n ? m.g.jobs / n : 0, breadth = n ? (m.g.required + 0.5 * (m.g.jobs - m.g.required)) / n : 0;
      var isProve = have === 'stated';
      var tier = dS > 0 || dR > 0 ? 2 : ((isProve && share >= 0.25) || (phase1 ? share >= 0.25 && avg >= 3 : share >= 0.4 && avg >= 5) ? 1 : 0);
      var mid = Math.max(1, (eff.lo + eff.hi) / 2);
      var value = phase1 ? (dR + 0.5 * core + 0.01 * r.gain + 0.25 * breadth) / mid : (core + 0.015 * r.gain + 0.5 * breadth) / Math.sqrt(mid);
      return { m: m, r: r, eff: eff, have: have, dS: dS, dR: dR, core: core, gain: r.gain, avg: avg, tier: tier, value: value, mid: mid };
    }
    function tvBetter(a, b) {   // a beats b?
      if (!b) return true;
      if (a.tier !== b.tier) return a.tier > b.tier;
      if (Math.abs(a.value - b.value) > 1e-12) return a.value > b.value;
      return cmpStr(a.id, b.id) < 0;
    }
    function push(e, before) {
      P.commit(e.r);
      curve.push(e.r.stats);
      var haveNow = haveLevel(JE, cand, e.m.g.id);
      moves.push({
        id: (haveNow === 'stated' ? 'prove:' : 'skill:') + e.m.g.id, kind: haveNow === 'stated' ? 'prove' : 'skill',
        skillId: e.m.g.id, skillName: e.m.sk.name, skillKind: e.m.sk.kind, role: rid, have: haveNow, haveAfterEarlier: e.have,
        jobs: e.m.g.jobs, required: e.m.g.required, share: n ? rnd(100 * e.m.g.jobs / n) : 0,
        estLo: e.eff.lo, estHi: e.eff.hi, effortClass: e.eff.cls, includes: e.eff.includes, includeIds: e.eff.includeIds,
        delta: { strong: e.dS, reach: e.dR }, before: before, after: e.r.stats,
        avgGain: Math.round(10 * e.avg) / 10,
        unlockIds: e.r.crossedIds.slice(0, 20), reachIds: e.r.reachedIds.slice(0, 20),
      });
      pool = pool.filter(function (m) { return m !== e.m; });
    }
    // Every round re-scores every remaining candidate on top of the steps already chosen (worth can grow when two
    // skills pay off together), so the order always follows the stated rule. The numbers shown are always exact.
    while (moves.length < MAX_SKILL_MOVES && pool.length) {
      var phase1 = P.stats.reach < T, best = null, evals = [];
      pool.forEach(function (m) {
        var e = evalMove(P, m, phase1);
        if (!e) { m.dead = true; return; }
        e.id = m.g.id;
        evals.push(e);
        if (e.tier > 0 && tvBetter(e, best)) best = e;
      });
      pool = pool.filter(function (m) { return !m.dead; });
      if (best && best.tier === 2) { push(best, P.stats); continue; }
      // no single skill moves a job on its own: two together sometimes do (a job that needs both) - try the pairs
      // among the five that lift fit the most (every round while you're not yet apply-ready; afterwards only before
      // giving up - and only for two skills the same not-yet-Strong jobs ask for)
      var bestPair = null, bestPV = 0;
      if ((phase1 || !best) && moves.length + 2 <= MAX_SKILL_MOVES) {
        var top = evals.filter(function (e) { return e.gain > 0; }).sort(function (a, b) { return b.gain - a.gain || cmpStr(a.id, b.id); }).slice(0, 5);
        var openJobs = top.map(function (e) {
          var ts = touchSet(JE, e.id), o = dict();
          P.items.forEach(function (it, ix) { var sc = P.scores[ix]; if (sc.fit == null || sc.fit >= STRONG) return; for (var k in ts) { if (P.skillsOf[ix][k]) { o[ix] = 1; break; } } });
          return o;
        });
        for (var i = 0; i < top.length; i++) for (var j = 0; j < top.length; j++) {
          if (i === j) continue;
          var shared = false; for (var ix in openJobs[i]) { if (openJobs[j][ix]) { shared = true; break; } }
          if (!shared) continue;
          var F = P.fork(); F.commit(top[i].r);
          var e2 = evalMove(F, top[j].m, phase1);
          if (!e2 || !(e2.dS > 0 || e2.dR > 0)) continue;
          var cost = top[i].mid + e2.mid, dR2 = e2.r.stats.reach - P.stats.reach, dS2 = e2.r.stats.strong - P.stats.strong;
          var pv = phase1 ? (dR2 + 0.5 * dS2) / cost : (dS2 + 0.5 * Math.max(0, dR2 - dS2)) / Math.sqrt(cost);
          if (!bestPair || pv > bestPV + 1e-12) { bestPair = [top[i], top[j]]; bestPV = pv; }
        }
      }
      if (bestPair) {
        push(bestPair[0], P.stats);
        var second = evalMove(P, bestPair[1].m, phase1);
        if (second) push(second, P.stats);
        continue;
      }
      if (best) { push(best, P.stats); continue; }
      break;
    }
    // credentials: never a weekly step - a decision, with what holding it would change (exact re-scores)
    var P0 = new Projector(JE, items, cand, prefs, rid);
    var credentials = creds.map(function (c) {
      var alone = P0.tryProve(c.g.id).stats, withPlan = P.tryProve(c.g.id).stats;
      var share = n ? rnd(100 * c.g.jobs / n) : 0;
      return { id: 'cred:' + c.g.id, kind: 'credential', skillId: c.g.id, skillName: c.sk.name, role: rid,
        jobs: c.g.jobs, share: share, note: c.eff.note, withNow: alone, withPlan: withPlan,
        listedOnly: haveLevel(JE, cand, c.g.id) === 'stated',   // you list it - a resume entry, not a decision
        estLo: null, estHi: null, effortClass: 'gated' };
    });
    credentials.sort(function (a, b) { return b.jobs - a.jobs || cmpStr(a.id, b.id); });
    return { start: start, moves: moves, curve: curve, credentials: credentials, languages: langs };
  }

  /* ------------------------------------------------------------- texts */
  function describeSkill(s, roleName, n, isFirst) {
    var name = s.skillName, d = s.delta || { strong: 0, reach: 0 };
    var asked = s.jobs ? name + ' is asked for in ' + s.jobs + ' of the ' + n + ' live ' + roleName + ' jobs' + (s.share ? ' (' + s.share + '%)' : '') + '.' : '';
    var lead = isFirst ? 'Proving it' : 'On top of the steps before it, proving it';
    var gainTxt;
    if (s.stale) gainTxt = 'Today’s ' + roleName + ' jobs don’t ask for ' + name + ' - it stays because it’s in your saved plan (remove it if it no longer helps).';
    else if (d.strong > 0) gainTxt = lead + ' moves ' + plural(d.strong, 'more job') + ' to Strong (70+)' + (d.reach > d.strong ? ' and puts ' + (d.reach - d.strong) + ' more within reach' : '') + '.';
    else if (d.reach > 0) gainTxt = lead + ' puts ' + plural(d.reach, 'more job') + ' within reach - only the years or level they ask for hold you back there.';
    else if (!(s.avgGain > 0)) gainTxt = (isFirst ? 'Today’s' : 'Even after the steps before it, today’s') + ' counts don’t move with it alone - something else caps those jobs for now' + (s.kind === 'prove' ? ' - but it’s quick, and ' + (s.share || 0) + '% of these postings ask for it.' : '.');
    else gainTxt = lead + ' raises your fit on the jobs that ask for it by about ' + s.avgGain + (s.avgGain === 1 ? ' point' : ' points') + ', which the later steps build on.';
    if (s.kind === 'prove' && s.skillKind === 'cert') {
      return {
        title: 'Add your ' + name + ' to your resume',
        why: 'You list ' + name + ', but your resume has no certification entry for it. ' + (asked ? asked + ' ' : '') + gainTxt,
        done_when: 'A certification entry in your resume names ' + name + ' (with the issuing body and date) - Kaidostar then counts it as shown.',
        first_action: 'Today: add a certification entry for ' + name + ' in Resume Studio, with who issued it and when it expires.',
        resource: 'Resume Studio in the Workshop.',
        risk: 'Listing a certification that has lapsed - renew it first if it has.',
        if_it_works: 'Your fit on those jobs updates the moment it’s saved.',
        if_it_stalls: 'If it has lapsed, renewing it is usually a short course - book one.',
      };
    }
    if (s.kind === 'prove') {
      return {
        title: 'Back up ' + name + ' with a resume line',
        why: 'You list ' + name + ', but no resume line shows you using it. ' + (asked ? asked + ' ' : '') + gainTxt,
        done_when: 'A project, job or internship entry in your resume has a line showing you using ' + name + ' for a real result - Kaidostar then counts it as proven.',
        first_action: 'Today: write one resume line about a time you actually used ' + name + ' - what you did and what came of it. If there isn’t one yet, turn this into a small project.',
        resource: 'Resume Studio in the Workshop - add the line to the entry where it happened.',
        risk: 'Listing the skill again in a bare keyword list - only a line that shows it in use counts as proof.',
        if_it_works: 'Your fit on those jobs updates the moment the line is saved.',
        if_it_stalls: 'If you can’t point to a real use yet, make it a small project and come back to this step.',
      };
    }
    var cousin = s.have === 'adjacent' || s.have === 'related';
    var cousinLater = !cousin && (s.haveAfterEarlier === 'adjacent' || s.haveAfterEarlier === 'related');
    var inc = arr(s.includes).length ? ' (with ' + s.includes.join(' and ') + ', which it builds on)' : '';
    if (s.skillKind === 'cert') {
      return {
        title: 'Earn the ' + name,
        why: (asked ? asked + ' ' : '') + gainTxt,
        done_when: 'A certification entry in your resume names ' + name + ' (with the issuing body and date) - Kaidostar then counts it.',
        first_action: 'Today: open the official exam outline for ' + name + ', take a practice test and book a date.',
        resource: 'The official exam outline from the certifying body, plus a practice exam.',
        risk: 'Studying without a booked date - the date is what makes it happen.',
        if_it_works: 'Add it to your resume the day you pass - the jobs it unlocks update immediately.',
        if_it_stalls: 'Move the date once, not twice; if it slips again, put the next step first.',
      };
    }
    return {
      title: 'Learn ' + name + inc + ' and prove it in a project',
      why: (asked ? asked + ' ' : '') + gainTxt + (cousin ? ' You already know a close cousin, so it should come faster.' : (cousinLater ? ' The steps before it cover a close cousin, so it should come faster by then.' : '')),
      done_when: 'A project, job or internship entry in your resume has a line showing you using ' + name + ' for a real result - Kaidostar then counts it as proven.',
      first_action: 'Today: pick one real problem from ' + roleName + ' work and do the first hands-on exercise with ' + name + ' - build something small, don’t just watch.',
      resource: s.skillKind === 'tool' ? 'The tool’s free tier or trial and its official tutorials, used on a real problem.' :
        (s.skillKind === 'cert' ? 'The official exam outline from the certifying body, plus a practice exam.' : 'Official documentation or a free interactive course, plus one public dataset or real problem from ' + roleName + ' work.'),
      risk: 'Watching tutorials without producing anything - a skill only counts once something you built shows it.',
      if_it_works: 'Add the resume line, then re-open the Roadmap - the jobs it unlocks update immediately.',
      if_it_stalls: 'Shrink the project until a rough version fits a weekend, or move to the next step and come back.',
    };
  }
  function describeCredential(c, roleName, n) {
    var w = c.withPlan || c.withNow;
    if (c.listedOnly) {
      return {
        title: 'Add your ' + c.skillName + ' to your resume',
        why: 'You list ' + c.skillName + ', but your resume has no entry for it. ' + (c.jobs ? c.skillName + ' is asked for in ' + c.jobs + ' of the ' + n + ' live ' + roleName + ' jobs (' + c.share + '%). ' : '') + 'A license or certification entry - with its state and dates - is what every posting can check.',
        done_when: 'A license or certification entry in your resume names ' + c.skillName + ' - Kaidostar then counts it as shown.',
        first_action: 'Today: add a license entry for ' + c.skillName + ' in Resume Studio, with the state, the license number if you share it, and its expiry date.',
        resource: 'Resume Studio in the Workshop.',
        risk: 'Listing a license that has lapsed or is still pending - say exactly where it stands.',
        if_it_works: 'Your fit on those jobs updates the moment it’s saved.',
        if_it_stalls: 'If it’s pending, add the expected date - employers often accept a license in progress.',
      };
    }
    return {
      title: 'Decide on the ' + c.skillName + ' route',
      why: c.skillName + ' is asked for in ' + c.jobs + ' of the ' + n + ' live ' + roleName + ' jobs (' + c.share + '%). ' +
        (w ? 'Holding it (with the other steps here) would put you within reach of ' + w.reach + ' of them. ' : '') +
        c.note + ' Kaidostar can’t shorten that - it’s a decision, not a weekly task.',
      done_when: 'You’ve chosen: start the credential path, or aim first at roles that don’t require it.',
      first_action: 'Today: look up the requirements for ' + c.skillName + ' in your state on the official licensing or certifying body’s site.',
      resource: 'The official licensing board or certifying body for ' + c.skillName + '.',
      risk: 'Starting a long credential before checking the jobs you actually want require it.',
      if_it_works: 'Plan the credential as its own multi-month (or multi-year) project.',
      if_it_stalls: 'Look at the stepping-stone routes that don’t require it.',
    };
  }

  /* ------------------------------------------------------------- context */
  function currentRoleOf(JE, entries, nowMs) {
    var best = null;
    arr(entries).forEach(function (e) {
      if (!e || typeof e !== 'object') return;
      var et = str(e.entry_type || e.type || 'work').toLowerCase();
      if (et !== 'work' && et !== 'job' && et !== 'experience' && et !== 'internship') return;
      var end = str(e.end_date || e.endDate).toLowerCase(), endT = /present|current|now/.test(end) || !end ? nowMs : timeOf(e.end_date || e.endDate);
      var rs = JE.findRoles(str(e.title));
      if (!rs.length) return;
      if (!best || (endT || 0) > (best.endT || 0)) best = { id: rs[0].id, name: rs[0].name, title: str(e.title).slice(0, 80), endT: endT || 0, current: endT === nowMs };
    });
    return best;
  }
  function stageWord(st) { return { student: 'Student', grad: 'Recent graduate', switch: 'Career switcher', working: 'Working professional' }[st] || ''; }
  function defaultHours(stage) { return { student: 6, grad: 10, switch: 8, working: 6 }[stage] || 6; }
  // the far end of the timeframe you gave in the survey
  function timeframeWeeks(tf) { return { now: 12, '6-12mo': 52, '1-2yr': 104, '2yr+': 156 }[str(tf)] || 52; }
  // enough jobs within reach to run a real search: 3, or 5% of a big market - never more than the market has
  function threshold(n) { return n > 0 ? Math.max(1, Math.min(n, Math.max(APPLY_MIN, Math.ceil(n * 0.05)))) : APPLY_MIN; }
  // a share of every week goes to people and applications: about a quarter of your hours
  function reachHours(hpw) { return hpw >= 4 ? Math.max(1, Math.round(hpw / 4)) : 1; }
  function buildHours(hpw) { return Math.max(1, hpw - reachHours(hpw)); }
  // the fewest hours a week (people time included) that fit `hours` of skill work into `weeks`
  function hpwFor(hours, weeks) {
    if (!(hours > 0)) return 0;
    if (!(weeks > 0)) return null;
    for (var x = HPW_MIN; x <= HPW_MAX; x++) if (buildHours(x) * weeks >= hours) return x;
    return null;
  }

  /* -------------------------------------------------------------- plans */
  // The saved plan, field by field and bounded. The server's clean_plan (app/routes/roadmap.py) keeps exactly the same
  // fields with exactly the same rules, so a plan reads the same on every device.
  var ITEM_KINDS = { skill: 1, prove: 1, credential: 1, network: 1, apply: 1, interview: 1 };
  var USER_STATUS = { doing: 1, done: 1, skip: 1 };
  var HAVE_LEVELS = { missing: 1, adjacent: 1, related: 1, stated: 1, proven: 1 };
  var ROLE_RE = /^[a-z0-9_]{1,60}$/, ROUTE_RE = /^[a-z0-9_:]{1,80}$/, STEP_RE = /^[a-z0-9_:.\-]{1,80}$/;
  var T_MIN = 946684800000, T_MAX = 4102444800000;   // 2000-01-01 .. 2100-01-01
  var ARCHIVE_MAX = 4;
  function msTime(v) { return isNum(v) && v >= T_MIN && v <= T_MAX ? Math.floor(v) : null; }
  function intIn(v, lo, hi) { if (!isNum(v)) return null; var r = rnd(v); return r >= lo && r <= hi ? r : null; }
  function intClamp(v, lo, hi) { return isNum(v) ? clamp(rnd(v), lo, hi) : null; }
  function reOk(v, re) { return typeof v === 'string' && re.test(v) ? v : null; }
  function normItem(x) {
    if (!x || typeof x !== 'object' || !reOk(x.id, STEP_RE) || !ITEM_KINDS[x.kind]) return null;
    var o = { id: x.id, kind: x.kind };
    if (reOk(x.skillId, ROLE_RE)) o.skillId = x.skillId;
    if (HAVE_LEVELS[x.haveAtStart] && typeof x.haveAtStart === 'string') o.haveAtStart = x.haveAtStart;
    if (USER_STATUS[x.status] && typeof x.status === 'string') o.status = x.status;
    ['startedAt', 'doneAt', 'dueAt', 'verifiedAt'].forEach(function (k) { var t = msTime(x[k]); if (t != null) o[k] = t; });
    if (isNum(x.hours) && x.hours > 0) o.hours = intClamp(x.hours, 1, 2000);
    return o;
  }
  function normItems(list) {
    var seen = dict(), items = [];
    arr(list).slice(0, 200).forEach(function (x) { var o = normItem(x); if (o && !seen[o.id] && items.length < MAX_PLAN_ITEMS) { seen[o.id] = 1; items.push(o); } });
    return items;
  }
  function normArchive(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return {};
    var rows = Object.keys(a).filter(function (k) { return ROLE_RE.test(k) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]); }).map(function (k) {
      var e = a[k];
      return { role: k, v: { route: reOk(e.route, ROUTE_RE), forRoute: reOk(e.forRoute, ROUTE_RE), startAt: msTime(e.startAt), baselineReadyAt: msTime(e.baselineReadyAt), savedAt: msTime(e.savedAt), items: normItems(e.items) } };
    });
    rows.sort(function (x, y) { return (y.v.savedAt || 0) - (x.v.savedAt || 0) || cmpStr(x.role, y.role); });
    var out = {};
    rows.slice(0, ARCHIVE_MAX).forEach(function (r) { out[r.role] = r.v; });
    return out;
  }
  function normPlan(p) {
    p = p && typeof p === 'object' && !Array.isArray(p) ? p : {};
    return {
      v: 1,
      // role: a destination you picked yourself (otherwise the Roadmap follows your goal and Job Search target)
      role: reOk(p.role, ROLE_RE),
      // forRole / forRoute: the destination and route the saved steps were built for
      forRole: reOk(p.forRole, ROLE_RE),
      route: reOk(p.route, ROUTE_RE),
      forRoute: reOk(p.forRoute, ROUTE_RE),
      hoursPerWeek: intClamp(p.hoursPerWeek, HPW_MIN, HPW_MAX),
      targetAt: msTime(p.targetAt),
      startAt: msTime(p.startAt),
      items: normItems(p.items),
      baselineReadyAt: msTime(p.baselineReadyAt),
      readySince: msTime(p.readySince),
      history: arr(p.history).slice(-HISTORY_CAP).filter(function (h) { return h && typeof h === 'object' && msTime(h.at) != null; }).map(function (h) {
        var med = intIn(h.median, 0, 100);
        return { at: msTime(h.at), role: reOk(h.role, ROLE_RE) || '', n: intIn(h.n, 0, 1000000) || 0, strong: intIn(h.strong, 0, 1000000) || 0, reach: intIn(h.reach, 0, 1000000) || 0, median: med };
      }),
      // the plans you had for other destinations, so switching back picks up where you left off
      archive: normArchive(p.archive),
      builtAt: msTime(p.builtAt),
      updatedAt: msTime(p.updatedAt),
      // the last time YOU changed the plan (steps, route, destination, hours, date) - what decides which copy wins
      // between devices; a page load or a daily snapshot never moves it
      changedAt: msTime(p.changedAt),
    };
  }

  // what you've done since the plan started, from your own records
  var RECENT = 30 * DAY;
  function countSignals(signals, sinceMs, marketIds, inRole, nowMs) {
    signals = signals || {};
    var since = isNum(sinceMs) ? sinceMs : 0;
    if (isNum(nowMs)) since = Math.min(since || nowMs, nowMs - RECENT);
    var applied = dict();
    arr(signals.appliedIds).forEach(function (id) { if (id != null && (!marketIds || marketIds[str(id)])) applied[str(id)] = true; });
    arr(signals.applications).forEach(function (a) {
      if (!a || typeof a !== 'object' || a.status !== 'sent') return;
      var id = str(a.listing_id); if (!id) return;
      if (marketIds && !marketIds[id] && !(inRole && inRole(str(a.listing_title || a.title)))) return;
      applied[id] = true;
    });
    var talks = arr(signals.contacts).filter(function (c) {
      if (!c || typeof c !== 'object') return false;
      var t = timeOf(c.last_contacted) || timeOf(c.created_at);
      return t != null && t >= since - DAY;
    }).length;
    var mocks = arr(signals.sessions).filter(function (s) { var t = s && typeof s === 'object' ? timeOf(s.at) : null; return t != null && t >= since - DAY; }).length;
    return { applied: Object.keys(applied).length, conversations: talks, mockInterviews: mocks };
  }

  /* ============================================================ analyze */
  function analyze(input) {
    input = input || {};
    var JE = input.engine || root.JobEngine;
    if (!JE) throw new Error('RoadmapEngine needs the job engine');
    var now = isNum(input.now) ? input.now : 0;
    var profile = input.profile && typeof input.profile === 'object' ? input.profile : {};
    var entries = arr(input.entries);
    var plan = normPlan(input.plan);
    var mprefs = marketPrefs(JE, input.prefs, profile);
    var notes = [];
    // The market side (the pool, your record, each route's steps) depends only on the jobs and your record, not on
    // the plan - a page can pass the same `cache` object back while those stay the same, and changing a step's status
    // or your hours a week then re-plans instantly. Clear it (or pass a new one) when the jobs or your record change.
    var cache = input.cache && typeof input.cache === 'object' ? input.cache : null;
    var base = cache && cache.base && cache.base.engine === JE ? cache.base : null;
    if (!base) {
      // ---- the whole pool, once: deduped, expired jobs out, your hard constraints applied
      var pool0 = JE.analyzePool(arr(input.listings), profile, entries, mprefs, [], { now: now, parsedCache: input.parsedCache || null, dismissed: input.dismissedIds || null });
      var ghosts0 = 0;
      var live0 = pool0.items.filter(function (it) {
        if (it.filters.hidden) return false;
        if (it.opp && it.opp.ghost === 'high') { ghosts0++; return false; }
        return true;
      });
      var cand0 = JE.buildCandidate(profile, entries, mprefs, now); cand0.country = 'US';
      base = { engine: JE, now: now, pool: pool0, live: live0, ghosts: ghosts0, baseCand: cand0, current: currentRoleOf(JE, entries, now),
        candCache: dict(), itemCache: dict(), routeCache: dict() };
      if (cache) cache.base = base;
    }
    var pool = base.pool, live = base.live, baseCand = base.baseCand, current = base.current;
    if (base.ghosts) notes.push(plural(base.ghosts, 'likely ghost post') + ' (old, reposted or not seen live lately) left out of every count.');
    if (pool.excluded) notes.push(plural(pool.excluded, 'job') + ' you dismissed left out.');
    var where = whereLabel(mprefs, profile);
    if (!where) notes.push('No location on file, so these counts cover jobs anywhere - add where you’d work to narrow them.');
    var mnow = base.now;   // the market side is computed as of when it was built

    // ---- the goal
    var I = JE.TAX.roles, roleOk = function (r) { return I.some(function (x) { return x.id === r; }); };
    var goalId = null, goalFrom = null;
    if (plan.role && roleOk(plan.role)) { goalId = plan.role; goalFrom = 'you chose it'; }
    else if (arr(mprefs.targetRoles).length && roleOk(mprefs.targetRoles[0])) { goalId = mprefs.targetRoles[0]; goalFrom = 'your Job Search target'; }
    else if (baseCand.roles.length) { goalId = baseCand.roles[0].id; goalFrom = 'your goal'; }
    var roleOptions = [];
    [goalId].concat(baseCand.roles.map(function (r) { return r.id; })).concat(arr(mprefs.targetRoles)).concat(current ? [current.id] : []).forEach(function (r) {
      if (r && roleOk(r) && roleOptions.indexOf(r) === -1) roleOptions.push(r);
    });
    // live jobs per role where you'd work (for picking a destination) - counted exactly as a destination counts them
    var rc = base.roleCounts;
    if (!rc) {
      rc = dict();
      var kids = dict(), par = dict();
      I.forEach(function (r) { if (r.parent) { par[r.id] = r.parent; (kids[r.parent] = kids[r.parent] || []).push(r.id); } });
      live.forEach(function (it) {
        if (it.job.type !== 'job') return;
        var hit = dict();
        arr(it.job.roles).forEach(function (r) { hit[r.id] = 1; if (par[r.id]) hit[par[r.id]] = 1; arr(kids[r.id]).forEach(function (k) { hit[k] = 1; }); });
        Object.keys(hit).forEach(function (k) { rc[k] = (rc[k] || 0) + 1; });
      });
      base.roleCounts = rc;
    }
    var roleCounts = Object.keys(rc).sort(function (a, b) { return rc[b] - rc[a] || cmpStr(a, b); }).slice(0, 40).map(function (r) { return { id: r, name: JE.roleName(r), n: rc[r] }; });

    var candCache = base.candCache;
    function candFor(rid) {
      if (candCache[rid]) return candCache[rid];
      var c = JE.buildCandidate(profile, entries, JE.mergePrefs(mprefs, { targetRoles: [rid] }), mnow); c.country = 'US';
      return (candCache[rid] = c);
    }
    var itemCache = base.itemCache;
    function itemsFor(rid, type) {
      var key = rid + '|' + type;
      if (itemCache[key]) return itemCache[key];
      var c = candFor(rid);
      var out = live.filter(function (it) { return it.job.type === type && belongs(JE, it.job, rid); }).map(function (it) {
        return { job: it.job, opp: it.opp, score: JE.scoreJob(it.job, c, mprefs, { queryRoles: [rid] }) };
      });
      return (itemCache[key] = out);
    }
    var roleName = function (rid) { return JE.roleName(rid); };

    var model = {
      version: VERSION, now: now, notes: notes, where: where,
      you: {
        stage: baseCand.stage, stageLabel: stageWord(baseCand.stage), years: baseCand.years, yearsSource: baseCand.yearsSource,
        levelLabel: baseCand.levelLabel, proven: baseCand.provenCount, stated: baseCand.statedCount,
        current: current, education: baseCand.education,
        provenSkills: Object.keys(baseCand.skills).filter(function (k) { return baseCand.skills[k].level === 'proven'; }).map(function (k) { return baseCand.skills[k].name; }).sort().slice(0, 16),
        statedSkills: Object.keys(baseCand.skills).filter(function (k) { return baseCand.skills[k].level === 'stated'; }).map(function (k) { return baseCand.skills[k].name; }).sort().slice(0, 16),
      },
      poolSize: live.length, scanned: pool.scanned,
      goal: goalId ? { id: goalId, name: roleName(goalId), from: goalFrom } : null,
      roleOptions: roleOptions.map(function (r) { return { id: r, name: roleName(r), n: rc[r] || 0 }; }),
      roleCounts: roleCounts,
      allRoles: JE.allRoles(),
    };
    if (!goalId) { model.needsGoal = true; return model; }

    // ---- the destination: your market for the goal role
    var enrolled = baseCand.stage === 'student' || baseCand.enrolled === true;
    var rcache = base.routeCache[goalId] || (base.routeCache[goalId] = buildRoutes());
    var goalJobs = rcache.goalJobs, goalR = rcache.goalR;
    model.market = goalR;
    model.thin = goalR.n < 8;
    if (!goalR.n) notes.push('No live ' + roleName(goalId) + ' jobs ' + (where ? 'where you’d work' : 'in the pool') + ' right now.');
    else if (model.thin) notes.push('Only ' + plural(goalR.n, 'live ' + roleName(goalId) + ' job') + ' ' + (where ? 'where you’d work' : 'in the pool') + ' right now - treat every count as a small sample.');

    // a plan saved for another destination doesn't carry over (its steps' statuses still do, by step)
    var sameGoal = (plan.forRole || plan.role) === goalId;
    if (!sameGoal) plan = Object.assign({}, plan, { route: null, startAt: null, baselineReadyAt: null, items: [], carry: plan.items });
    var hpw = plan.hoursPerWeek || defaultHours(baseCand.stage);
    var planStart = plan.startAt || now;
    var target = plan.targetAt && plan.targetAt > now ? plan.targetAt : null;
    if (plan.targetAt && !target) notes.push('Your “ready by” date has passed - set a new one, or clear it to plan against your timeframe.');
    var budgetEnd = target || (planStart + timeframeWeeks(profile.timeframe) * WEEK);
    if (!target && budgetEnd <= now) notes.push('The timeframe you gave has passed since this plan started - set a “ready by” date to plan against a new one.');
    var budgetWeeks = Math.max(1, Math.round((budgetEnd - now) / WEEK));

    // ---- routes (computed once per destination; the per-plan parts below are recomputed every time)
    var routes = rcache.routes.map(function (r) { return Object.assign({}, r); });
    var direct = routes[0];
    routes.forEach(function (r) {
      r.weeksToReady = weeksUntilReach(r, hpw);
      var h = hoursUntilReach(r);
      // the hours a week that would make you apply-ready inside your timeframe
      r.hoursToReady = h;
      r.hpwToReadyInBudget = h ? hpwFor(h, budgetWeeks) : (h === 0 ? 0 : null);
    });

    function buildRoutes() {
      var gJobs = itemsFor(goalId, 'job');
      var gR = readiness(JE, gJobs, candFor(goalId));
      var out = [];
      var d = routeFor('direct', goalId, 'job', null, gR, gJobs, null);
      out.push(d);
      if (enrolled) {
        var ir = routeFor('internship', goalId, 'internship', null, gR, gJobs, d);
        if (ir && ir.market.n >= 3) out.push(ir);
      }
      // stepping stones: related roles you can win sooner, that build what the goal asks for
      bridgeCandidates(gR).slice(0, 2).forEach(function (b) { var r = routeFor('bridge', b.id, 'job', b, gR, gJobs, d); if (r) out.push(r); });
      return { goalJobs: gJobs, goalR: gR, routes: out };
    }
    function routeFor(kind, rid, type, bridge, goalR, goalJobs, direct) {
      var items = itemsFor(rid, type);
      if (!items.length && kind !== 'direct') return null;
      var c = candFor(rid), rd = kind === 'direct' ? goalR : readiness(JE, items, c);
      var Tr = threshold(rd.n);
      var pm = planMoves(JE, rid, items, c, mprefs, Tr);
      pm.moves.forEach(function (m, i) { Object.assign(m, describeSkill(m, roleName(rid), rd.n, i === 0)); });
      pm.credentials.forEach(function (m) { Object.assign(m, describeCredential(m, roleName(rid), rd.n)); });
      var last = pm.curve[pm.curve.length - 1];
      var r = {
        id: kind === 'bridge' ? 'bridge:' + rid : kind, kind: kind, role: rid, roleName: roleName(rid), type: type,
        market: rd, threshold: Tr, moves: pm.moves, credentials: pm.credentials, languages: pm.languages, curve: pm.curve,
        reachNow: rd.reach, strongNow: rd.strong, reachAfter: last.reach, strongAfter: last.strong,
        hours: pm.moves.reduce(function (a, m) { return a + (m.estLo + m.estHi) / 2; }, 0),
      };
      if (kind === 'bridge') {
        r.bridge = bridge;
        r.label = 'Via ' + roleName(rid);
        // and then: the goal, a year into this job - its skills proven there, and the goal's own steps done alongside
        var proved = pm.moves.map(function (m) { return m.skillId; }).concat(direct ? direct.moves.map(function (m) { return m.skillId; }) : []);
        var laterC = laterCandidate(JE, profile, entries, mprefs, goalId, rid, mnow, proved);
        r.then = rescoreCount(JE, goalJobs, laterC, mprefs, goalId);
      } else if (kind === 'internship') {
        r.label = roleName(rid) + ' internship first';
        r.deadlinesSoon = items.filter(function (it) { var t = timeOf(it.job.deadline); return t != null && t >= mnow && t - mnow <= 120 * DAY; }).length;
      } else r.label = 'Straight to ' + roleName(rid);
      return r;
    }

    function bridgeCandidates(goalR) {
      var goalTop = goalR.topSkills.filter(function (s) { return s.pct >= 10; });
      var goalW = goalTop.reduce(function (a, s) { return a + s.pct; }, 0) || 1;
      var out = [];
      I.forEach(function (role) {
        var rid = role.id;
        if (rid === goalId) return;
        var sim = JE.roleSim(goalId, rid);
        var ok = (sim >= 0.4 && sim < 0.95) || (current && current.id === rid && sim >= 0.3 && sim < 0.95);
        if (!ok) return;
        // count first (cheap): too few jobs, or too few to beat the goal's reach even if all were within it, can't qualify
        var cnt = 0; for (var q = 0; q < live.length; q++) { var lj = live[q].job; if (lj.type === 'job' && belongs(JE, lj, rid)) cnt++; }
        if (cnt < MIN_BRIDGE_N) return;
        var items = itemsFor(rid, 'job');
        var rd = readiness(JE, items, candFor(rid));
        var top = dict(); rd.topSkills.forEach(function (s) { if (s.pct >= 15) top[s.id] = true; });
        var overlap = goalTop.reduce(function (a, s) { return a + (top[s.id] ? s.pct : 0); }, 0) / goalW;
        // a stepping stone has to build toward the goal, and be closer to you than the goal is: more of its jobs within
        // reach today, or a clearly higher typical fit (whether it actually wins is decided on its re-scored steps)
        if (overlap < 0.3) return;
        var closer = rd.reach > goalR.reach || (rd.medianFit != null && (goalR.medianFit == null || rd.medianFit >= goalR.medianFit + 5));
        if (!closer) return;
        out.push({ id: rid, name: roleName(rid), sim: sim, overlap: Math.round(overlap * 100) / 100, reach: rd.reach, n: rd.n, medianFit: rd.medianFit,
          isCurrent: !!(current && current.id === rid) });
      });
      var bscore = function (b) { return b.reach * (0.5 + b.overlap) + 0.05 * (b.medianFit || 0) * b.overlap; };
      out.sort(function (a, b) { return bscore(b) - bscore(a) || cmpStr(a.id, b.id); });
      return out;
    }

    // ---- which route, and why (a stated rule, so you can see it and overrule it)
    var rec = recommend(routes, enrolled, budgetWeeks, hpw, roleName(goalId));
    var chosen = null;
    if (plan.route) chosen = routes.filter(function (r) { return r.id === plan.route; })[0] || null;
    if (plan.route && !chosen) notes.push('The route this plan was on isn’t available in today’s jobs, so the recommended one is shown.');
    if (!chosen) chosen = rec.route;
    routes.forEach(function (r) { r.recommended = r === rec.route; r.chosen = r === chosen; });
    model.routes = routes;
    model.recommended = rec.route ? rec.route.id : null;
    model.recommendedWhy = rec.why;
    model.recommendedCase = rec.kase;
    model.route = chosen ? chosen.id : null;
    model.threshold = direct.threshold;
    model.hoursPerWeek = hpw;
    model.budgetWeeks = budgetWeeks;
    model.budgetFrom = target ? 'your target date' : 'your timeframe';
    if (!chosen) return model;

    // ---- the plan: your saved steps (or a fresh set), checked against your records and scheduled from today
    var routeItems = itemsFor(chosen.role, chosen.type);
    var built = buildPlan(JE, chosen, plan, candFor(chosen.role), routeItems, mprefs, input.signals, now, hpw, budgetEnd);
    model.plan = built;
    model.jobs = jobsIndex(routeItems, chosen, built);
    model.milestones = toMilestones(built, chosen, model.goal);
    model.summary = summaryText(model, chosen, built);
    arr(chosen.languages).forEach(function (l) { if (l.share >= 10) notes.push(l.name + ' is asked for in ' + l.share + '% of these jobs - a long road, so it isn’t scheduled as a step.'); });
    return model;
  }

  // the steps' hours, in order, until enough jobs are within reach to start applying
  function hoursUntilReach(r) {
    if (r.reachNow >= r.threshold) return 0;
    var h = 0;
    for (var i = 0; i < r.moves.length; i++) {
      h += (r.moves[i].estLo + r.moves[i].estHi) / 2;
      if (r.curve[i + 1].reach >= r.threshold) return h;
    }
    return null;
  }
  function weeksUntilReach(r, hpw) {
    var h = hoursUntilReach(r);
    return h == null ? null : (h === 0 ? 0 : Math.max(1, Math.ceil(h / buildHours(hpw))));
  }

  // your record a year into a stepping-stone job: you left your current one for it, and proved its skills there
  function laterCandidate(JE, profile, entries, mprefs, goalId, bridgeRid, now, provedIds) {
    var d = new Date(now), ym = d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1);
    var ents = arr(entries).map(function (e) {
      if (!e || typeof e !== 'object') return e;
      var et = str(e.entry_type || e.type || 'work').toLowerCase();
      if (et !== 'work' && et !== 'job' && et !== 'experience' && et !== 'internship') return e;
      var end = str(e.end_date || e.endDate).trim().toLowerCase();
      if (end && !/present|current|now/.test(end)) return e;
      if (!str(e.start_date || e.startDate).trim()) return e;
      var c = Object.assign({}, e, { end_date: ym }); delete c.endDate; return c;
    });
    ents.push({ entry_type: 'work', title: JE.roleName(bridgeRid), org: '', start_date: ym, end_date: 'present', raw_description: '' });
    var prof = Object.assign({}, profile);
    if (prof.stage === 'student' || prof.stage === 'grad') prof.stage = 'working';
    var c = JE.buildCandidate(prof, ents, JE.mergePrefs(mprefs, { targetRoles: [goalId], years: isNum(mprefs.years) ? mprefs.years + 1 : null }), now + 365 * DAY);
    c.country = 'US';
    return withProven(JE, c, provedIds);
  }

  function topBlocker(rd) {
    var b = arr(rd.blockers).filter(function (x) { return x.key !== 'skills'; })[0];
    return b ? b.text.charAt(0).toLowerCase() + b.text.slice(1) + ' (' + plural(b.count, 'job') + ')' : '';
  }
  function recommend(routes, enrolled, budgetWeeks, hpw, goalName) {
    var dr = routes.filter(function (r) { return r.kind === 'direct'; })[0];
    var ir = routes.filter(function (r) { return r.kind === 'internship'; })[0];
    var br = routes.filter(function (r) { return r.kind === 'bridge'; });
    var T = dr.threshold, n = dr.market.n, why = [];
    var bestB = br.filter(function (b) { return b.reachAfter >= b.threshold && b.then && b.then.reach > dr.reachAfter; }).sort(function (a, b) {
      return ((b.then ? b.then.reach : 0) - (a.then ? a.then.reach : 0)) || ((a.weeksToReady == null ? 1e9 : a.weeksToReady) - (b.weeksToReady == null ? 1e9 : b.weeksToReady)) || cmpStr(a.id, b.id);
    })[0];
    var cred = arr(dr.credentials).filter(function (c) { return c.share >= 50 && !c.listedOnly; })[0];
    function bridgeWhy(b) {
      why.push(b.roleName + ' jobs ask for ' + Math.round(b.bridge.overlap * 100) + '% of the skills ' + goalName + ' jobs ask for, and you’d be within reach of ' + b.reachAfter + ' of its ' + b.market.n + ' live jobs after its steps' + (b.weeksToReady ? ' (about ' + plural(b.weeksToReady, 'week') + ' at ' + hpw + ' h a week)' : '') + '.');
      if (b.then) why.push('A year into that job - with the ' + goalName + ' steps done alongside - your record would put you within reach of about ' + b.then.reach + ' of today’s ' + n + ' ' + goalName + ' jobs (' + dr.reachNow + ' now; ' + dr.reachAfter + ' with the steps alone).');
    }
    if (!n) {
      if (bestB) { why.push('There are no live ' + goalName + ' jobs where you’d work right now.'); bridgeWhy(bestB); return { route: bestB, why: why, kase: 'bridge_empty' }; }
      why.push('There are no live ' + goalName + ' jobs where you’d work right now, so this plan can’t be checked against real postings yet - widen where you’d work, or check back as new jobs come in.');
      return { route: dr, why: why, kase: 'empty' };
    }
    if (ir && enrolled && dr.reachNow < T && ir.reachAfter >= Math.min(3, ir.market.n)) {
      why.push('You’re a student, and ' + plural(ir.market.n, 'live ' + ir.roleName + ' internship') + ' are open where you’d work - you’d be within reach of ' + ir.reachAfter + ' of them after the steps below' + (ir.reachNow ? ' (' + ir.reachNow + ' today)' : '') + '.');
      why.push('An internship is the strongest early signal there is: in one large study of graduates it cut the odds of starting out underemployed by about half.');
      return { route: ir, why: why, kase: 'internship' };
    }
    if (dr.reachNow >= T) {
      why.push('You’re already within reach of ' + dr.reachNow + ' of the ' + n + ' live ' + goalName + ' jobs' + (dr.market.stretch ? ' (' + dr.strongNow + ' Strong, ' + dr.market.stretch + ' a stretch on years or level alone)' : '') + ' - enough to start applying now while you close the gaps.');
      return { route: dr, why: why, kase: 'apply_now' };
    }
    if (dr.reachAfter >= T && dr.weeksToReady != null) {
      if (dr.weeksToReady <= budgetWeeks || !(bestB && bestB.weeksToReady != null && bestB.weeksToReady <= budgetWeeks)) {
        why.push('After the steps below you’d be within reach of ' + dr.reachAfter + ' of today’s ' + n + ' ' + goalName + ' jobs, in about ' + plural(dr.weeksToReady, 'week') + ' at ' + hpw + ' h a week' +
          (dr.weeksToReady <= budgetWeeks ? ' - inside your timeframe.' : ' - longer than your timeframe (' + plural(budgetWeeks, 'week') + ' left).' + (dr.hpwToReadyInBudget && dr.hpwToReadyInBudget <= HPW_MAX ? ' About ' + dr.hpwToReadyInBudget + ' h a week would bring it in.' : ' Fewer steps, or a later date, would bring it in.')));
        return { route: dr, why: why, kase: dr.weeksToReady <= budgetWeeks ? 'direct' : 'direct_slow' };
      }
      why.push('Straight to ' + goalName + ' would take about ' + plural(dr.weeksToReady, 'week') + ' at ' + hpw + ' h a week - longer than your timeframe.');
      bridgeWhy(bestB);
      return { route: bestB, why: why, kase: 'bridge_faster' };
    }
    if (cred && cred.withPlan && cred.withPlan.reach >= T) {
      why.push(cred.skillName + ' is asked for in ' + cred.share + '% of the ' + n + ' live ' + goalName + ' jobs. With it - and the steps below - you’d be within reach of ' + cred.withPlan.reach + ' of them; without it, ' + dr.reachAfter + '.');
      why.push(cred.note + ' So the first step is deciding on that route' + (bestB ? ' - or starting with the stepping stone below while you decide.' : '.'));
      return { route: dr, why: why, kase: 'credential' };
    }
    if (bestB && bestB.reachAfter > dr.reachAfter) {
      var tb = topBlocker(dr.market);
      why.push('Straight to ' + goalName + ', you’d be within reach of ' + dr.reachAfter + ' of ' + n + ' jobs even after the steps' + (tb ? ' - what holds most of the rest back is ' + tb : '') + '.');
      bridgeWhy(bestB);
      return { route: bestB, why: why, kase: 'bridge' };
    }
    var tb2 = topBlocker(dr.market);
    why.push('This is the closest path, but a long one: after the steps you’d be within reach of ' + dr.reachAfter + ' of the ' + n + ' live ' + goalName + ' jobs.' + (tb2 ? ' What holds most of the rest back: ' + tb2 + '.' : ''));
    if (cred) why.push(cred.skillName + ' is asked for in ' + cred.share + '% of them. ' + cred.note);
    return { route: dr, why: why, kase: 'closest' };
  }

  /* --------------------------------------------------------- schedule */
  function buildPlan(JE, route, plan, cand, items, prefs, signals, now, hpw, budgetEnd) {
    // your saved steps are this route's plan when they were built for this route - and hold its skill work (a copy
    // saved from an empty or failed load, with no skill steps at all, never stands in for a real plan)
    var savedSkillish = plan.items.some(function (s) { return s.kind === 'skill' || s.kind === 'prove' || s.kind === 'credential'; });
    var sameRoute = (plan.forRoute || plan.route) === route.id && plan.items.length > 0 && (savedSkillish || (!route.moves.length && !route.credentials.length));
    var startAt = sameRoute && plan.startAt ? plan.startAt : now;
    var marketIds = dict(); items.forEach(function (it) { marketIds[str(it.job.id)] = true; });
    var inRole = function (title) { return !!title && JE.findRoles(title).some(function (r) { return r.id === route.role || JE.roleSim(r.id, route.role) >= 0.95; }); };
    var sig = countSignals(signals, startAt, marketIds, inRole, now);
    var n = route.market.n;

    // the steps: saved ones keep their order, identity and history; new gaps the market shows are offered, not forced
    var byId = dict(); route.moves.concat(route.credentials).forEach(function (m) { byId[m.id] = m; });
    var gapBy = dict(); gapSkills(JE, items).forEach(function (g) { gapBy[g.id] = g; });
    var carry = dict(); plan.items.concat(arr(plan.carry)).forEach(function (s) { if (!carry[s.id]) carry[s.id] = s; });
    var steps = [];
    if (sameRoute) {
      plan.items.forEach(function (s) {
        if (s.kind === 'network' || s.kind === 'apply' || s.kind === 'interview') return;
        var m = byId[s.id] || restoreMove(JE, s, route, cand, gapBy[s.skillId] || null);
        if (m) steps.push(merge(m, s));
      });
    } else {
      route.moves.forEach(function (m) { steps.push(merge(m, carry[m.id] || null)); });
      route.credentials.forEach(function (m) { if (m.share >= 25) steps.push(merge(m, carry[m.id] || null)); });
    }
    var offered = route.moves.filter(function (m) { return !steps.some(function (s) { return s.id === m.id || s.skillId === m.skillId; }); }).slice(0, 3);

    // reach steps: always the same three, sized to this market
    var reachNow = route.market.reach, applyTarget = Math.max(APPLY_MIN, Math.min(10, reachNow || APPLY_MIN));
    if (n > 0) applyTarget = Math.max(1, Math.min(applyTarget, n));
    var noneReachable = reachNow === 0 && route.reachAfter === 0;
    var isIntern = route.kind === 'internship', unit = isIntern ? 'internship' : 'job';
    var reachSteps = [
      { id: 'network', kind: 'network', title: 'Talk to 5 people in ' + route.roleName + ' roles',
        why: 'Most offers move through people: at one large US firm, referred candidates were 6% of applicants but 29% of hires. Short conversations now also tell you which of these steps matter most where you want to work.',
        done_when: '5 conversations logged in the Workshop’s networking tracker (the last 30 days count, or everything since this plan started if that’s longer).',
        first_action: 'Today: list ten people doing ' + route.roleName + ' work (alumni, former colleagues, friends of friends) and message two.',
        resource: 'The Workshop’s networking tracker and outreach drafts.',
        risk: 'Asking for a job in the first message - ask what their work is really like.',
        if_it_works: 'Ask the warmest contact whether they’d refer you once you apply.',
        if_it_stalls: 'Widen the list to people one step away from the role (managers, adjacent teams).',
        target: 5, have: sig.conversations, estLo: 5, estHi: 8, effortClass: 'reach' },
      { id: 'apply', kind: 'apply', title: 'Apply to ' + applyTarget + ' ' + route.roleName + ' ' + unit + 's within reach',
        why: '',
        done_when: applyTarget + ' applications sent to ' + route.roleName + ' ' + unit + 's (counted from your Kaidostar applications and the jobs you mark as applied in Job Search).',
        first_action: reachNow ? 'Today: open the ' + unit + 's within reach below and pick the first three.' : 'When the plan says so, open Job Search for these ' + unit + 's.',
        resource: 'Job Search and Resume Studio’s “Tailor to a job”.',
        risk: 'Sending the same resume everywhere - lead with the skills each posting asks for.',
        if_it_works: 'Prepare for interviews with the step below.',
        if_it_stalls: 'If nothing comes back after ten applications, check which requirement keeps capping your fit and move that step up.',
        target: applyTarget, have: sig.applied, estLo: applyTarget, estHi: applyTarget * 2, effortClass: 'reach', blocked: noneReachable },
      { id: 'interview', kind: 'interview', title: 'Practise 3 mock interviews for ' + route.roleName,
        why: noneReachable ? 'Worth doing once jobs are within reach - until the decision above is made, practice has nothing to aim at.' : 'Interviews turn being within reach into an offer; practising on this role’s real questions is cheap insurance.',
        done_when: '3 practice sessions in Interview Prep (the last 30 days count, or everything since this plan started if that’s longer).',
        first_action: 'Today: set ' + route.roleName + ' as your Interview Prep target and do one round.',
        resource: 'Interview Prep (Hot Seat and the question bank).',
        risk: 'Practising only the answers you like - include the questions about your gaps.',
        if_it_works: 'Keep one session a week going while you interview.',
        if_it_stalls: 'Write out STAR stories for your three strongest resume lines first.',
        target: 3, have: sig.mockInterviews, estLo: 3, estHi: 5, effortClass: 'reach', blocked: noneReachable },
    ];
    reachSteps.forEach(function (r) { steps.push(merge(r, sameRoute ? carry[r.id] || null : null)); });

    // ---- status: proof where it exists
    steps.forEach(function (s) { evalStatus(s, cand, sig); });

    // ---- projection from today: proven steps are already in your record; the rest add up in the plan's order
    var P = new Projector(JE, items, cand, prefs, route.role);
    var curve = [P.stats], firstOpen = true, readyAt0 = P.stats.reach >= route.threshold, passed = readyAt0;
    steps.forEach(function (s) {
      if (s.kind !== 'skill' && s.kind !== 'prove') return;
      // steps up to the one that gets enough jobs within reach make you apply-ready; the rest strengthen you after
      s.phase = passed ? 'strengthen' : 'ready';
      if (s.status === 'verified' || s.status === 'skipped') { s.delta = null; return; }
      var r = P.tryProve(s.skillId), cur = P.stats;
      s.delta = { strong: r.stats.strong - cur.strong, reach: r.stats.reach - cur.reach };
      s.avgGain = r.touched ? Math.round(10 * r.gain / r.touched) / 10 : 0;
      s.unlockIds = r.crossedIds.slice(0, 20); s.reachIds = r.reachedIds.slice(0, 20);
      s.projected = r.stats;
      if (!passed && r.stats.reach >= route.threshold) passed = true;
      P.commit(r); curve.push(r.stats);
      Object.assign(s, describeSkill(s, route.roleName, n, firstOpen));
      firstOpen = false;
    });
    steps.forEach(function (s) {
      if ((s.kind === 'skill' || s.kind === 'prove') && s.status === 'verified') {
        Object.assign(s, describeSkill(s, route.roleName, n, true));
        s.why = 'Verified: your resume shows ' + s.skillName + ' in use' + (s.verify && s.verify.via ? ' (through ' + s.verify.via + ')' : '') + ', so every fit already counts it.';
      } else if (s.kind === 'credential') {
        Object.assign(s, describeCredential(s, route.roleName, n));
        if (s.status === 'verified') s.why = 'Verified: your resume has a ' + s.skillName + ' entry' + (s.verify && s.verify.source ? ' (' + s.verify.source + ')' : '') + ', so every fit already counts it.';
      }
    });
    // what the proof you've shown since the plan started has unlocked (exact: today's jobs with and without it)
    var realized = null;
    var verifiedSkills = steps.filter(function (s) { return (s.kind === 'skill' || s.kind === 'prove') && s.status === 'verified' && s.haveAtStart && s.haveAtStart !== 'proven'; });
    if (verifiedSkills.length) {
      var before = cand;
      verifiedSkills.forEach(function (s) { before = withLevel(before, s.skillId, s.haveAtStart); });
      var then = rescoreCount(JE, items, before, prefs, route.role);
      realized = { strongBefore: then.strong, reachBefore: then.reach, strongNow: curve[0].strong, reachNow: curve[0].reach, steps: verifiedSkills.length };
    }

    // ---- pace: your own speed on steps you started and finished replaces the default estimates
    var buildHpw = buildHours(hpw), reachHpw = reachHours(hpw);
    var sumActual = 0, sumPlanned = 0;
    steps.forEach(function (s) {
      if (s.kind !== 'skill' && s.kind !== 'prove') return;
      if ((s.status === 'verified' || s.status === 'done') && isNum(s.startedAt) && isNum(s.doneAt) && s.doneAt - s.startedAt >= DAY && s.estLo != null) {
        sumActual += (s.doneAt - s.startedAt) / WEEK;
        sumPlanned += (s.hours != null ? s.hours : (s.estLo + s.estHi) / 2) / buildHpw;
      }
    });
    var pace = sumActual >= 1 && sumPlanned > 0 ? Math.round(clamp(sumActual / sumPlanned, 0.5, 2.5) * 100) / 100 : null;

    // ---- schedule from today: skill steps one after another; people and applications alongside
    var weekNow = Math.max(0, Math.floor((now - startAt) / WEEK));
    var cursor = weekNow, applyFrom = null;
    var T = route.threshold;
    if (curve[0].reach >= T) applyFrom = weekNow;
    steps.forEach(function (s) {
      if (s.kind !== 'skill' && s.kind !== 'prove') return;
      if (s.status === 'verified' || s.status === 'skipped' || s.status === 'done') {
        s.startWeek = isNum(s.startedAt) ? Math.max(0, Math.floor((s.startedAt - startAt) / WEEK)) : null;
        s.endWeek = isNum(s.doneAt) ? Math.max(0, Math.floor((s.doneAt - startAt) / WEEK)) : null;
        // a step you've done (shown as yours) still counts toward when you can apply: the work is behind you and only
        // the resume line is left - so its effect lands now, not in the past
        if (s.status === 'done' && s.projected) {
          s.effectWeek = Math.ceil(cursor);
          if (applyFrom == null && s.projected.reach >= T) applyFrom = Math.ceil(cursor);
        }
        return;
      }
      var hrs = s.hours != null ? s.hours : (s.estLo + s.estHi) / 2;
      if (pace) hrs *= pace;
      // a step you're in the middle of: the time you've had since starting counts, but some always remains
      if (s.status === 'doing' && isNum(s.startedAt) && s.startedAt < now) hrs = Math.max(hrs * 0.25, hrs - ((now - s.startedAt) / WEEK) * buildHpw);
      s.plannedHours = Math.max(1, Math.round(hrs));
      s.startWeek = Math.floor(cursor);
      cursor += hrs / buildHpw;
      s.endWeek = Math.max(s.startWeek, Math.ceil(cursor) - 1);
      s.weeks = s.endWeek - s.startWeek + 1;
      s.effectWeek = s.endWeek + 1;
      if (applyFrom == null && s.projected && s.projected.reach >= T) applyFrom = s.endWeek + 1;
    });
    var buildEnd = Math.ceil(cursor);
    var apS = steps.filter(function (s) { return s.kind === 'apply'; })[0];
    if (apS) {
      var stretchTxt = route.market.stretch ? ', including ' + route.market.stretch + ' where only the years or level asked for hold you back (under three years short, or one level) - experience asks are often softer than they read' : '';
      if (noneReachable) apS.why = 'No ' + route.roleName + ' ' + unit + ' here is within reach yet, and the skill steps alone won’t change that - this waits on the bigger decision above.';
      else if (reachNow >= T) apS.why = 'You’re within reach of ' + plural(reachNow, 'live ' + unit) + ' today' + stretchTxt + '. Applying while you build beats waiting until you feel ready.';
      else if (reachNow > 0) apS.why = 'You’re within reach of ' + plural(reachNow, 'live ' + unit) + ' today' + stretchTxt + ' - worth applying to now. The full search starts ' + (applyFrom != null ? 'in week ' + (applyFrom + 1) + ', when the steps put at least ' + T + ' within reach.' : 'once the steps put more within reach.');
      else apS.why = 'This starts ' + (applyFrom != null ? 'in week ' + (applyFrom + 1) + ', when the steps above put at least ' + T + ' ' + unit + 's within reach.' : 'once the steps above put ' + unit + 's within reach.');
    }
    function laneWeeks(h) { return Math.max(1, Math.ceil(h / reachHpw)); }
    steps.forEach(function (s) {
      if (s.kind === 'skill' || s.kind === 'prove') return;
      if (s.status === 'verified' || s.status === 'done' || s.status === 'skipped') { s.startWeek = null; s.endWeek = null; return; }
      var mid = (s.estLo + s.estHi) / 2;
      if (s.kind === 'network') { s.startWeek = weekNow; s.endWeek = weekNow + laneWeeks(mid) - 1; }
      else if (s.kind === 'apply') {
        if (s.blocked) { s.startWeek = null; s.endWeek = null; return; }
        s.startWeek = applyFrom != null ? applyFrom : buildEnd; s.endWeek = s.startWeek + laneWeeks(mid) - 1;
      } else if (s.kind === 'interview') {
        if (s.blocked) { s.startWeek = null; s.endWeek = null; return; }
        var aS = applyFrom != null ? applyFrom : buildEnd, iw = laneWeeks(mid);
        s.startWeek = Math.max(weekNow, aS - 1); s.endWeek = s.startWeek + iw - 1;
      } else if (s.kind === 'credential') { s.startWeek = weekNow; s.endWeek = weekNow; }
      if (s.kind === 'network' || s.kind === 'apply' || s.kind === 'interview') s.plannedHours = Math.round(mid);
    });

    // ---- on track? (against the plan as you started it)
    var readyWeek = applyFrom;
    var readyAt = readyWeek != null ? startAt + readyWeek * WEEK : null;
    var readyNow = applyFrom != null && applyFrom <= weekNow;
    // already apply-ready: the date you got there (kept from your earlier visits), not today, so being ready never "slips"
    if (readyNow) readyAt = sameRoute && isNum(plan.readySince) && plan.readySince <= now ? plan.readySince : Math.min(now, readyAt);
    var baselineReadyAt = sameRoute && plan.baselineReadyAt ? plan.baselineReadyAt : readyAt;
    var drift = readyAt != null && baselineReadyAt != null ? Math.round((readyAt - baselineReadyAt) / WEEK) : null;
    steps.forEach(function (s) {
      if (s.endWeek != null && s.status !== 'verified' && s.status !== 'done' && s.status !== 'skipped') s.planDueAt = startAt + (s.endWeek + 1) * WEEK;
      s.overdue = isNum(s.dueAt) && s.dueAt < now && s.status !== 'verified' && s.status !== 'done' && s.status !== 'skipped';
    });
    var overdue = steps.filter(function (s) { return s.overdue; }).length;

    // ---- what this week holds
    var thisWeek = steps.filter(function (s) {
      if (s.status === 'verified' || s.status === 'done' || s.status === 'skipped' || s.blocked) return false;
      if (s.kind === 'credential') return true;
      return s.startWeek != null && s.startWeek <= weekNow && (s.endWeek == null || s.endWeek >= weekNow);
    }).sort(function (a, b) { return (a.kind === 'credential' ? -1 : 0) - (b.kind === 'credential' ? -1 : 0) || (a.startWeek || 0) - (b.startWeek || 0); }).slice(0, 4).map(function (s) { return s.id; });

    // ---- hours a week the skill steps need to be done inside your timeframe
    var remainingH = steps.filter(function (s) { return (s.kind === 'skill' || s.kind === 'prove') && s.status !== 'verified' && s.status !== 'skipped' && s.status !== 'done'; })
      .reduce(function (a, s) { return a + (s.plannedHours || 0); }, 0);
    var weeksLeft = Math.round((budgetEnd - now) / WEEK);
    var budgetHoursNeeded = weeksLeft > 0 && remainingH > 0 ? hpwFor(remainingH, weeksLeft) : null;
    // and just the steps that make you apply-ready
    var readyH = steps.filter(function (s) { return (s.kind === 'skill' || s.kind === 'prove') && s.phase === 'ready' && s.status !== 'verified' && s.status !== 'skipped' && s.status !== 'done'; })
      .reduce(function (a, s) { return a + (s.plannedHours || 0); }, 0);
    var readyHoursNeeded = null, readyHoursWhy;
    if (applyFrom == null) readyHoursWhy = 'never';            // the skill steps alone don't reach the bar
    else if (applyFrom <= weekNow) { readyHoursNeeded = 0; readyHoursWhy = 'now'; }
    else if (weeksLeft <= 0) readyHoursWhy = 'late';           // the date has passed (or is this week)
    else { readyHoursNeeded = hpwFor(readyH, weeksLeft); readyHoursWhy = readyHoursNeeded == null ? 'over' : 'ok'; }   // over = more than 60 h a week

    var counted = steps.filter(function (s) { return s.status !== 'skipped'; });
    return {
      startAt: startAt, weekNow: weekNow, hoursPerWeek: hpw, buildHoursPerWeek: buildHpw, reachHoursPerWeek: reachHpw, pace: pace,
      steps: steps, offered: offered, curve: curve, realized: realized,
      applyFromWeek: applyFrom, readyWeek: readyWeek, readyAt: readyAt, baselineReadyAt: baselineReadyAt, drift: drift, overdue: overdue,
      buildEndWeek: buildEnd, budgetEndAt: budgetEnd, budgetWeeksLeft: weeksLeft, budgetHoursNeeded: budgetHoursNeeded, readyHoursNeeded: readyHoursNeeded, readyHoursWhy: readyHoursWhy, remainingHours: remainingH, readyHours: readyH,
      readyNow: readyNow,
      thisWeek: thisWeek, signals: sig, threshold: T,
      done: counted.filter(function (s) { return s.status === 'verified' || s.status === 'done'; }).length,
      total: counted.length,
      verified: steps.filter(function (s) { return s.status === 'verified'; }).length,
      fresh: !sameRoute,
    };
  }

  function merge(m, saved) {
    var s = Object.assign({}, m);
    s.status = 'todo';
    if (saved) {
      if (USER_STATUS[saved.status]) s.userStatus = saved.status;
      if (isNum(saved.startedAt)) s.startedAt = saved.startedAt;
      if (isNum(saved.doneAt)) s.doneAt = saved.doneAt;
      if (isNum(saved.hours) && saved.hours > 0) s.hours = clamp(Math.round(saved.hours), 1, 2000);
      if (typeof saved.haveAtStart === 'string') s.haveAtStart = saved.haveAtStart;
      if (isNum(saved.dueAt)) s.dueAt = saved.dueAt;
      if (isNum(saved.verifiedAt)) s.verifiedAt = saved.verifiedAt;
    }
    if (!s.haveAtStart && (s.kind === 'skill' || s.kind === 'prove')) s.haveAtStart = s.have || 'missing';
    return s;
  }
  // a saved step that isn't among the route's top picks today: kept as you saved it, with today's counts - and marked
  // stale only when today's jobs don't ask for it at all
  function restoreMove(JE, s, route, cand, gap) {
    if (s.kind !== 'skill' && s.kind !== 'prove' && s.kind !== 'credential') return null;
    var sk = skillInfo(JE, s.skillId); if (!sk) return null;
    var n = route.market.n, jobs = gap ? gap.jobs : 0, share = gap && n ? rnd(100 * gap.jobs / n) : 0;
    if (s.kind === 'credential') {
      var eg = effortFor(JE, s.skillId, 'missing');
      return { id: s.id, kind: 'credential', skillId: s.skillId, skillName: sk.name, role: route.role, jobs: jobs, share: share, note: eg.note || 'A licensed credential with formal requirements.', estLo: null, estHi: null, effortClass: 'gated', stale: !gap };
    }
    var have = haveLevel(JE, cand, s.skillId);
    var eff = effortWithBase(JE, s.skillId, have === 'proven' ? (s.haveAtStart || 'missing') : have, cand);
    return { id: s.id, kind: s.kind, skillId: s.skillId, skillName: sk.name, skillKind: sk.kind, role: route.role, have: s.haveAtStart || have,
      jobs: jobs, share: share, required: gap ? gap.required : 0, avgGain: 0, delta: { strong: 0, reach: 0 }, includes: eff.includes, includeIds: eff.includeIds,
      estLo: eff.lo != null ? eff.lo : 2, estHi: eff.hi != null ? eff.hi : 6, effortClass: eff.cls, stale: !gap };
  }
  function evalStatus(s, cand, sig) {
    s.verify = null;
    if (s.kind === 'skill' || s.kind === 'prove') {
      var cs = cand.skills[s.skillId];
      if (cs && cs.level === 'proven' && cs.source !== 'what-if') {
        s.status = 'verified';
        s.verify = { how: 'resume', evidence: str(cs.evidence).slice(0, 160), source: str(cs.source).slice(0, 80), via: cs.via || null };
        return;
      }
    } else if (s.kind === 'credential') {
      var cc = cand.skills[s.skillId];
      if (cc && cc.level === 'proven' && cc.source !== 'what-if') { s.status = 'verified'; s.verify = { how: 'resume', evidence: str(cc.evidence).slice(0, 160), source: str(cc.source).slice(0, 80) }; return; }
      s.listedOnly = !!(cc && cc.level === 'stated');
    } else if (s.kind === 'network' || s.kind === 'apply' || s.kind === 'interview') {
      if (isNum(s.target) && s.have >= s.target) { s.status = 'verified'; s.verify = { how: 'records', count: s.have }; return; }
    }
    if (s.userStatus === 'skip') s.status = 'skipped';
    else if (s.userStatus === 'done') s.status = 'done';     // you marked it - shown as yours, never counted as proof
    else if (s.userStatus === 'doing') s.status = 'doing';
    else s.status = 'todo';
  }

  // the jobs the page shows by name: the ones within reach now, and the ones each step unlocks
  function jobsIndex(items, route, built) {
    var want = dict(), out = dict();
    arr(route.market.withinIds).slice(0, 15).forEach(function (id) { want[id] = 1; });
    built.steps.forEach(function (s) { arr(s.unlockIds).slice(0, 8).forEach(function (id) { want[id] = 1; }); arr(s.reachIds).slice(0, 4).forEach(function (id) { want[id] = 1; }); });
    items.forEach(function (it) {
      var id = str(it.job.id); if (!want[id]) return;
      var j = it.job, s = it.score;
      out[id] = { id: id, title: str(j.title).slice(0, 140), org: str(j.org).slice(0, 100), location: str(j.location).slice(0, 100), mode: j.mode || null,
        fit: s.fit, stretch: isStretch(s), why: s.capApplied ? str(s.capApplied.why).slice(0, 160) : '', applyUrl: str(j.applyUrl).slice(0, 500), deadline: j.deadline || null };
    });
    return out;
  }

  /* ---------------------------------------------------- shared export */
  // The milestone shape the rest of Kaidostar reads (overview, Mission Control, Waypoint, chat, matching).
  function toMilestones(built, route, goal) {
    var KIND_ORDER = { credential: 0, skill: 1, prove: 1, network: 2, interview: 3, apply: 4 };
    var order = built.steps.filter(function (s) { return s.status !== 'skipped'; }).slice().sort(function (a, b) {
      var aw = a.startWeek == null ? 9999 : a.startWeek, bw = b.startWeek == null ? 9999 : b.startWeek;
      return aw - bw || (KIND_ORDER[a.kind] - KIND_ORDER[b.kind]) || cmpStr(a.id, b.id);
    });
    var out = order.map(function (s, i) {
      var tf = s.kind === 'credential' ? 'A decision now; the credential itself takes months to years' :
        (s.status === 'verified' ? 'Done - verified' : (s.weeks ? '~' + plural(s.weeks, 'week') + ' at ' + built.buildHoursPerWeek + ' h/week' : (s.estLo != null ? fmtHours(s.estLo, s.estHi) : '')));
      return {
        stage: i + 1, key: s.id, title: s.title, description: s.why, success_criteria: s.done_when,
        estimated_timeframe: tf, first_action: s.first_action, resource: s.resource, risk: s.risk,
        if_it_works: s.if_it_works || '', if_it_stalls: s.if_it_stalls || '',
        // complete means verified (or a decision you made); a step you marked done yourself counts as in progress until
        // your records show it - the same rule this page uses, so no other page can count it as proof
        status: s.status === 'verified' || (s.status === 'done' && s.kind === 'credential') ? 'done' : (s.status === 'doing' || s.status === 'done' ? 'in_progress' : 'planned'),
      };
    });
    if (route.kind === 'bridge' && goal) {
      out.push({
        stage: out.length + 1, key: 'then', title: 'Then: move toward ' + goal.name,
        description: 'After about a year as ' + route.roleName + (route.then ? ', your record would put you within reach of about ' + route.then.reach + ' of today’s ' + goal.name + ' jobs (re-checked against live jobs when you get there).' : '.'),
        success_criteria: 'Applying to ' + goal.name + ' jobs from your ' + route.roleName + ' role.',
        estimated_timeframe: 'About a year after you start as ' + route.roleName, first_action: 'Once you’re in the role, re-open the Roadmap with ' + goal.name + ' as your destination.',
        resource: 'The Roadmap, re-run against the jobs live then.', risk: 'Staying in the stepping-stone role longer than you meant to - set the date now.',
        if_it_works: '', if_it_stalls: '', status: 'planned',
      });
    }
    return out;
  }
  function summaryText(model, route, built) {
    var c0 = built.curve[0], cN = built.curve[built.curve.length - 1], n = route.market.n;
    var unit = route.type === 'internship' ? 'internship' : 'job';
    var parts = ['Route: ' + route.label + '.'];
    parts.push('Within reach today: ' + c0.reach + ' of ' + plural(n, 'live ' + route.roleName + ' ' + unit) + (cN.reach > c0.reach ? ', ' + cN.reach + ' after the open skill steps' : '') + '.');
    var nb = built.steps.filter(function (s) { return (s.kind === 'skill' || s.kind === 'prove') && s.status !== 'skipped' && s.status !== 'verified' && s.status !== 'done'; }).length;
    parts.push(plural(nb, 'open skill step') + ' at ' + built.hoursPerWeek + ' h a week' + (built.applyFromWeek != null ? '; start applying ' + (built.applyFromWeek <= built.weekNow ? 'now' : 'in week ' + (built.applyFromWeek + 1)) : '; the skill steps alone don’t reach the bar to apply') + '.');
    if (route.kind === 'bridge' && model.goal) parts.push('Then: ' + model.goal.name + '.');
    return parts.join(' ');
  }

  /* ------------------------------------------------------ plan state */
  // The record the page saves after you change something: which steps, their status and your own hour estimates.
  // opts.rebaseline: you changed the plan itself (hours a week, target date, steps) - "on track" is measured from here.
  function planState(model, prev, nowMs, opts) {
    opts = opts || {};
    var p = normPlan(prev);
    if (!model || !model.plan) return p;
    var built = model.plan, prevRoute = p.forRoute || p.route, prevFor = p.forRole;
    p.forRole = model.goal ? model.goal.id : null;
    p.route = model.route;
    p.forRoute = model.route;
    p.readySince = built.readyNow ? (isNum(p.readySince) && !built.fresh && p.readySince <= nowMs ? p.readySince : (built.readyAt != null ? Math.min(built.readyAt, nowMs) : nowMs)) : null;
    p.hoursPerWeek = built.hoursPerWeek;
    p.startAt = built.startAt;
    p.items = built.steps.slice(0, MAX_PLAN_ITEMS).map(function (s) {
      var o = { id: s.id, kind: s.kind };
      if (s.skillId) o.skillId = s.skillId;
      if (s.haveAtStart) o.haveAtStart = s.haveAtStart;
      if (s.userStatus) o.status = s.userStatus;
      if (isNum(s.startedAt)) o.startedAt = s.startedAt;
      if (isNum(s.doneAt)) o.doneAt = s.doneAt;
      if (isNum(s.hours)) o.hours = s.hours;
      // when each step was first due: kept, so a slipped step shows as slipped
      var due = !opts.rebaseline && isNum(s.dueAt) ? s.dueAt : (isNum(s.planDueAt) ? s.planDueAt : null);
      if (due != null) o.dueAt = due;
      // the day a step was first seen proven
      if (s.status === 'verified') o.verifiedAt = isNum(s.verifiedAt) ? s.verifiedAt : nowMs;
      return o;
    });
    if (opts.rebaseline || !p.baselineReadyAt || p.forRoute !== prevRoute || p.forRole !== prevFor || built.fresh) p.baselineReadyAt = built.readyAt;
    p.builtAt = p.builtAt && !built.fresh ? p.builtAt : nowMs;
    p.updatedAt = nowMs;
    // one readiness snapshot a day, for the trend
    if (model.market && model.goal) {
      var last = p.history[p.history.length - 1];
      var snap = { at: nowMs, role: model.goal.id, n: model.market.n, strong: model.market.strong, reach: model.market.reach, median: model.market.medianFit };
      if (!last || Math.floor(nowMs / DAY) !== Math.floor(last.at / DAY) || last.role !== snap.role) p.history.push(snap);
      else p.history[p.history.length - 1] = snap;
      p.history = p.history.slice(-HISTORY_CAP);
    }
    return p;
  }

  var api = {
    version: VERSION, STRONG: STRONG,
    analyze: analyze, planState: planState, normPlan: normPlan, isStretch: isStretch,
    effortFor: function (sid, have) { return effortFor(root.JobEngine, sid, have); },
    countSignals: countSignals, GATED: GATED, timeframeWeeks: timeframeWeeks,
    _internal: { touchSet: touchSet, withProven: withProven, statsOf: statsOf, gapSkills: gapSkills, haveLevel: haveLevel, effortWithBase: effortWithBase,
      reachHours: reachHours, buildHours: buildHours, hpwFor: hpwFor, threshold: threshold, marketPrefs: marketPrefs, belongs: belongs, softFit: softFit },
  };
  root.RoadmapEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
