/* Kaidostar Auto engine - the pure planner behind Auto.
 *
 * Given the jobs Kaidostar matched for you (each already scored by the Job
 * Search engine), your Auto rules and a little context (what you already applied
 * to, today's count, who you know where), it decides - with a reason for every
 * job - what Auto will prepare now, what waits for a later day, and what it holds
 * back. The page runs this on the server's candidate list to preview exactly what
 * Auto will do; the server runs the line-for-line Python port (auto_engine.py) on
 * the same list when it acts, so the preview and the action can't disagree.
 *
 * The defaults follow the evidence on what gets interviews (see the "How it
 * works" tab on the Auto page for sources): fewer, better-fitting applications;
 * one role per company at a time; fresh postings first; the employer's own
 * hiring site over job boards; never automate a site that forbids it; stop
 * rather than guess. Pure: no DOM, no network, no clock (the time comes in ctx).
 */
(function (root) {
  'use strict';

  var VERSION = '1.0.0';
  var DAY = 86400000;
  var STRONG = 70;                 // the Job Search "Strong" band
  var ALWAYS_FLOOR = 55;           // the lowest fit an always-list company can go down to
  var FIT_MIN = 50, FIT_MAX = 97;  // the fit bar's range (97 is the scorer's own ceiling)
  var TIER_DAILY_MAX = { free: 0, pro: 10, max: 50 };
  var DAILY_MAX = 50, WEEKLY_MAX = 250;
  var DELAYS = [0, 30, 120, 720, 1440];
  var MAX_AGES = [0, 3, 7, 14, 21, 30, 60];
  var FOLLOWUPS = [0, 5, 7, 10, 14];
  var WINDOWS = [14, 30, 60, 90];
  var HOLD_DAYS = [1, 2, 3, 5, 7];
  var TYPES = ['job', 'internship', 'college'];
  var SIZES = ['startup', 'small', 'midmarket', 'enterprise'];
  var LIST_KEYS = ['locations', 'industries', 'companySizes', 'keywordsInclude', 'keywordsExclude'];
  var LIST_CAP = 30, ITEM_CHARS = 80, COMPANY_CAP = 60;
  var STRETCH_KEYS = { years: 1, level: 1 }, STRETCH_MIN_CAP = 64;   // the same stretch rule the Roadmap uses
  var FRESH_BONUS = { 'new': 6, fresh: 4, recent: 2, aging: 0, old: -4, unknown: -1 };
  var WHAT_IF = [60, 65, 70, 75, 80, 85, 90];
  // Company-size buckets, matched from words a posting uses (listings carry no size field).
  var SIZE_SIGNALS = {
    startup: ['startup', 'start-up', 'seed', 'series a', 'series b', 'early-stage', 'early stage', 'pre-seed'],
    small: ['small business', 'small team', 'boutique', 'smb'],
    midmarket: ['mid-size', 'midsize', 'mid size', 'scale-up', 'scaleup', 'growth-stage', 'growth stage', 'mid-market'],
    enterprise: ['enterprise', 'fortune 500', 'publicly traded', 'multinational', 'global leader', 'large organization']
  };
  var FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'aol.com',
    'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com', 'yandex.com', 'zoho.com', 'qq.com', '163.com'];
  var TYPE_NAMES = { job: 'jobs', internship: 'internships', college: 'fellowships & programs' };
  var BAND_NAMES = { excellent: 'Excellent', strong: 'Strong', partial: 'Partial', weak: 'Weak' };
  var HAY_MAX = 6000;   // how much of a posting the keyword, field and size rules read (bounded: the page and the server both hold it)

  function defaults() {
    return {
      v: 2,
      mode: 'review',              // 'review' (you approve each) | 'auto' (Auto approves what passes, sends after the delay)
      minFit: 80,
      allowStretch: false,         // also prepare "stretch" roles (always held for your review)
      minConfidence: 'any',        // 'any' | 'medium' | 'high'
      types: { job: true, internship: true, college: false },
      dailyCap: 5,
      weeklyCap: 20,               // 0 = no weekly cap
      perCompany: 1,
      companyWindowDays: 30,
      maxAgeDays: 14,              // 0 = any age
      preferFresh: true,
      skipGhost: 'high',           // 'high' | 'elevated' | 'off'
      skipAgencies: false,
      skipReposts: false,
      aggregators: 'handoff',      // 'handoff' (prepare a kit, never automate) | 'skip'
      remoteOnly: false,
      locations: [], industries: [], companySizes: [], keywordsInclude: [], keywordsExclude: [],
      salaryFloor: 0,              // $k a year, 0 = off
      requireSalary: false,
      deadlineMaxDays: 0,
      companies: [],               // [{name, rule: 'always' | 'never' | 'boost'}]
      avoidCurrentEmployer: true,
      referral: 'note',            // 'note' | 'hold' | 'off'
      referralHoldDays: 3,
      coverLetter: 'asked',        // 'asked' | 'always' | 'never'
      tailorResume: true,
      delayMinutes: 720,
      followUpDays: 7,             // 0 = off
      pausedUntil: null,           // 'YYYY-MM-DD' (Auto resumes that day) or null
      pauseOnInterview: false,
      sendDays: 'any',             // 'any' | 'weekdays'
      tz: '',
      outreach: false,
      migratedFrom: 0
    };
  }

  /* ---------------------------------------------------------------- helpers */
  var WS = '[\\t\\n\\v\\f\\r \\u00a0\\u1680\\u2000-\\u200b\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]';
  var WS_RUN = new RegExp(WS + '+', 'g');
  function cps(s) { return Array.from(s); }
  function clean(s, n) {
    if (typeof s !== 'string') return '';
    var t = s.replace(WS_RUN, ' ').replace(/^ +| +$/g, '');
    if (n && t.length > n) { var a = cps(t); if (a.length > n) t = a.slice(0, n).join('').replace(/ +$/g, ''); }
    return t;
  }
  function lc(s) { return String(s == null ? '' : s).toLowerCase(); }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function rnd(x) { return Math.floor(x + 0.5); }
  function intIn(v, lo, hi, d) { var x = num(v); if (x === null) return d; x = rnd(x); return x < lo ? lo : (x > hi ? hi : x); }
  function choice(v, list, d) { var x = num(v); if (x === null) return d; x = rnd(x); return list.indexOf(x) >= 0 ? x : d; }
  function oneOf(v, list, d) { return (typeof v === 'string' && list.indexOf(v) >= 0) ? v : d; }
  function bool(v, d) { return v === true ? true : (v === false ? false : d); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v) { return v == null ? '' : String(v); }
  function plural(n, w, p) { return n + ' ' + (n === 1 ? w : (p || w + 's')); }
  function andList(xs) { return xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }

  // "Acme, Inc." -> "acme inc": lower-case words of letters/digits, single spaces
  function normName(s) { return lc(s).replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/^ +| +$/g, ''); }
  // whole-word containment: "meta" is in "meta platforms", "apple" is not in "pineapple express"
  function nameIn(name, org) {
    var a = normName(name), b = normName(org);
    if (!a || !b) return false;
    return (' ' + b + ' ').indexOf(' ' + a + ' ') >= 0;
  }

  function strList(v, cap, chars) {
    var out = [], seen = Object.create(null);
    var a = arr(v);
    for (var i = 0; i < a.length && out.length < cap; i++) {
      var s = clean(a[i], chars);
      if (!s) continue;
      var k = lc(s);
      if (seen[k]) continue;
      seen[k] = 1; out.push(s);
    }
    return out;
  }
  function companyList(v) {
    var out = [], seen = Object.create(null), a = arr(v);
    for (var i = 0; i < a.length && out.length < COMPANY_CAP; i++) {
      var c = a[i];
      if (!isObj(c)) continue;
      var name = clean(c.name, ITEM_CHARS);
      var rule = oneOf(c.rule, ['always', 'never', 'boost'], null);
      var k = normName(name);
      if (!name || !rule || !k || seen[k]) continue;
      seen[k] = 1; out.push({ name: name, rule: rule });
    }
    return out;
  }
  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
    var dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
    return d <= dim ? s : null;
  }
  function dayStart(ymd) { return Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)); }
  function validTz(s) { return (typeof s === 'string' && s.length <= 64 && /^[A-Za-z][A-Za-z0-9_+\-]*(\/[A-Za-z0-9_+\-]+){0,2}$/.test(s)) ? s : ''; }

  /* ------------------------------------------------------------ the rules */
  // Every stored rule set - this version's, the previous Auto's, or a hand-edited
  // one - comes out the same well-formed shape with every value in range.
  // `threshold` is the legacy fit bar stored alongside (used when minFit is absent).
  function normRules(raw, threshold) {
    var d = defaults();
    var r = isObj(raw) ? raw : {};
    var v1 = r.v !== 2 && Object.keys(r).length > 0;
    var out = defaults();
    // the fit bar: this version's minFit, else the legacy threshold, else the default
    var mf = num(r.minFit) !== null ? r.minFit : (num(threshold) !== null ? threshold : d.minFit);
    out.minFit = intIn(mf, FIT_MIN, FIT_MAX, d.minFit);
    if (v1) {
      // the previous Auto: auto_approve | draft_only, and "autonomous" = consented, no undo window
      out.mode = r.mode === 'draft_only' ? 'review' : (r.mode === 'auto_approve' || r.autonomous === true ? 'auto' : d.mode);
      out.delayMinutes = r.autonomous === true ? 0 : 30;
      out.skipGhost = r.skipHighGhostRisk === false ? 'off' : 'high';
      out.minConfidence = r.requireStrongSignal === true ? 'high' : 'any';
      var cap = num(r.dailyCap);
      out.dailyCap = cap === null ? d.dailyCap : (rnd(cap) <= 0 ? DAILY_MAX : intIn(cap, 1, DAILY_MAX, d.dailyCap));
      out.outreach = bool(r.outreach, false);
      out.migratedFrom = 1;
    } else {
      out.mode = oneOf(r.mode, ['review', 'auto'], d.mode);
      out.delayMinutes = choice(r.delayMinutes, DELAYS, d.delayMinutes);
      out.skipGhost = oneOf(r.skipGhost, ['high', 'elevated', 'off'], d.skipGhost);
      out.minConfidence = oneOf(r.minConfidence, ['any', 'medium', 'high'], d.minConfidence);
      out.dailyCap = intIn(r.dailyCap, 1, DAILY_MAX, d.dailyCap);
      out.outreach = bool(r.outreach, d.outreach);
      out.migratedFrom = intIn(r.migratedFrom, 0, 1, 0);
    }
    var t = isObj(r.types) ? r.types : {};
    out.types = {};
    TYPES.forEach(function (k) { out.types[k] = bool(t[k], d.types[k]); });
    out.allowStretch = bool(r.allowStretch, d.allowStretch);
    out.weeklyCap = intIn(r.weeklyCap, 0, WEEKLY_MAX, d.weeklyCap);
    out.perCompany = intIn(r.perCompany, 1, 3, d.perCompany);
    out.companyWindowDays = choice(r.companyWindowDays, WINDOWS, d.companyWindowDays);
    out.maxAgeDays = choice(r.maxAgeDays, MAX_AGES, d.maxAgeDays);
    out.preferFresh = bool(r.preferFresh, d.preferFresh);
    out.skipAgencies = bool(r.skipAgencies, d.skipAgencies);
    out.skipReposts = bool(r.skipReposts, d.skipReposts);
    out.aggregators = oneOf(r.aggregators, ['handoff', 'skip'], d.aggregators);
    out.remoteOnly = bool(r.remoteOnly, d.remoteOnly);
    LIST_KEYS.forEach(function (k) { out[k] = strList(r[k], LIST_CAP, ITEM_CHARS); });
    out.companySizes = out.companySizes.map(lc).filter(function (s) { return SIZES.indexOf(s) >= 0; });
    out.salaryFloor = intIn(r.salaryFloor, 0, 1000, d.salaryFloor);
    out.requireSalary = bool(r.requireSalary, d.requireSalary);
    out.deadlineMaxDays = intIn(r.deadlineMaxDays, 0, 365, d.deadlineMaxDays);
    out.companies = companyList(r.companies);
    out.avoidCurrentEmployer = bool(r.avoidCurrentEmployer, d.avoidCurrentEmployer);
    out.referral = oneOf(r.referral, ['note', 'hold', 'off'], d.referral);
    out.referralHoldDays = choice(r.referralHoldDays, HOLD_DAYS, d.referralHoldDays);
    out.coverLetter = oneOf(r.coverLetter, ['asked', 'always', 'never'], d.coverLetter);
    out.tailorResume = bool(r.tailorResume, d.tailorResume);
    out.followUpDays = choice(r.followUpDays, FOLLOWUPS, d.followUpDays);
    out.pausedUntil = validDate(r.pausedUntil);
    out.pauseOnInterview = bool(r.pauseOnInterview, d.pauseOnInterview);
    out.sendDays = oneOf(r.sendDays, ['any', 'weekdays'], d.sendDays);
    out.tz = validTz(r.tz);
    return out;
  }

  /* ------------------------------------------------------- candidates */
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
  var COVER_RE = /(?<![a-z])cover(?:ing)?[ -]letters?(?![a-z])/;
  var SP = '[ \\t\\n\\r\\f\\v\\u00a0]';
  var NO_COVER_RE = new RegExp('(?<![a-z])(?:no|without|not (?:required|necessary|needed)[^.]{0,20})' + SP + '*(?:a' + SP + '+)?cover[ -]letters?|cover[ -]letters?' + SP + '+(?:is|are)' + SP + '+(?:not|optional)');
  var EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,24}/g;
  // "send your resume to", "apply by email", "to apply, email", "applications should be sent to" - said about THIS address
  var APPLY_VERB = '(?:send(?:ing)?|e-?mail(?:ing)?|submit(?:ting)?|forward(?:ing)?|mail(?:ing)?|direct(?:ing)?)';
  var DOC_NOUN = '(?:resumes?|résumés?|cvs?|applications?|cover' + SP + '+letters?)';
  var APPLY_RE = new RegExp('(?<![a-z])(?:' + APPLY_VERB + '(?:' + SP + "+[a-z']{1,12}){0,3}" + SP + '+' + DOC_NOUN +
    '|apply' + SP + '+(?:by|via|through|with)' + SP + '+e-?mail' +
    '|to' + SP + '+apply[,:]?' + SP + '+(?:please' + SP + '+)?(?:send|e-?mail|contact|write|reach)' +
    '|' + DOC_NOUN + SP + '+(?:should|can|may|must|will)' + SP + '+be' + SP + '+(?:sent|e-?mailed|submitted|forwarded|directed)' +
    ')(?![a-z])');
  // ... and not an accommodations / questions / "please don't" sentence, nor one asking for things Kaidostar can't attach
  var NOT_APPLY_RE = new RegExp('(?<![a-z])(?:accommodat[a-z]*|accessib[a-z]*|disabilit[a-z]*|assistance|questions?|inquir[a-z]*|enquir[a-z]*|difficult[a-z]*' +
    '|trouble|problems?|unable|privacy|eeo|references?|portfolios?|samples?|transcripts?|unsolicited|agenc(?:y|ies)|recruiters?' +
    '|do' + SP + "+not|don't|dont|never)(?![a-z])");
  var SENTENCE_ENDS = ['. ', '! ', '? ', '; ', '\n'];
  var EMAIL_SKIP = ['accommodation', 'accommodations', 'accessibility', 'ada', 'privacy', 'dpo', 'gdpr', 'legal', 'compliance', 'security', 'abuse',
    'support', 'help', 'helpdesk', 'reply', 'webmaster', 'eeo', 'eeoc', 'benefits', 'payroll', 'press', 'media', 'billing', 'invoice',
    'invoices', 'feedback', 'unsubscribe', 'ethics', 'accounts', 'accounting', 'finance', 'orders', 'newsletter', 'notifications',
    'alerts', 'admin', 'postmaster', 'hostmaster', 'marketing', 'sales'];
  // An address that is plainly not where applications go (accommodations@, privacy@, no-reply@...).
  function emailSkip(local) {
    var flat = local.replace(/[^a-z]/g, '');
    if (flat.indexOf('noreply') >= 0 || flat.indexOf('donotreply') >= 0) return true;
    return local.split(/[^a-z]+/).some(function (tok) { return EMAIL_SKIP.indexOf(tok) >= 0; });
  }
  // The address a posting itself says to send applications to, or ''. Only when the same sentence says to
  // apply/send your resume there - never an accommodations, questions or privacy address.
  function postingEmail(text) {
    var t = lc(text).replace(/\u2019/g, "'").replace(/\u2018/g, "'");   // "don’t send" is "don't send"
    var m;
    EMAIL_RE.lastIndex = 0;
    while ((m = EMAIL_RE.exec(t)) !== null) {
      var addr = m[0].replace(/[.\-]+$/, '');
      if (emailSkip(addr.split('@')[0])) continue;
      var before = t.slice(0, m.index);
      var cut = Math.max.apply(null, SENTENCE_ENDS.map(function (e) { return before.lastIndexOf(e); }));
      var clause = before.slice(cut + 1);
      if (APPLY_RE.test(clause) && !NOT_APPLY_RE.test(clause)) return addr;
    }
    return '';
  }
  function domainOf(email) { var i = email.lastIndexOf('@'); return i >= 0 ? email.slice(i + 1) : ''; }
  var MULTI_SUFFIX = ['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'ltd.uk', 'plc.uk', 'me.uk', 'net.uk', 'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'co.nz',
    'org.nz', 'net.nz', 'co.jp', 'ne.jp', 'or.jp', 'co.in', 'net.in', 'org.in', 'com.br', 'net.br', 'org.br', 'com.mx', 'org.mx', 'co.za',
    'org.za', 'com.sg', 'edu.sg', 'com.hk', 'org.hk', 'com.cn', 'net.cn', 'org.cn', 'co.kr', 'or.kr', 'com.tw', 'com.tr', 'com.ar',
    'com.co', 'com.pe', 'com.ph', 'com.my', 'co.id', 'co.il', 'co.th', 'com.vn', 'com.pk', 'com.ng', 'com.eg', 'com.sa', 'co.ke', 'com.ua',
    'co.at', 'or.at', 'com.pl', 'co.ve', 'com.ec', 'com.uy', 'com.do', 'com.gt', 'com.bd', 'com.np', 'com.lk', 'com.qa', 'com.kw',
    'com.bh', 'com.om', 'co.ug', 'co.tz', 'com.gh'];
  // platforms that host many companies' sites and hiring pages: sharing one says nothing about who owns an address
  var SHARED_HOSTS = ['github.io', 'gitlab.io', 'herokuapp.com', 'netlify.app', 'vercel.app', 'pages.dev', 'web.app', 'firebaseapp.com', 'wixsite.com',
    'squarespace.com', 'wordpress.com', 'blogspot.com', 'weebly.com', 'webflow.io', 'notion.site', 'carrd.co', 'myworkdayjobs.com',
    'greenhouse.io', 'lever.co', 'ashbyhq.com', 'smartrecruiters.com', 'workable.com', 'recruitee.com', 'bamboohr.com', 'jobvite.com',
    'icims.com', 'taleo.net', 'breezy.hr', 'applytojob.com', 'jazzhr.com', 'teamtailor.com', 'personio.de', 'ultipro.com',
    'dayforcehcm.com', 'freshteam.com', 'zohorecruit.com', 'pinpointhq.com', 'trakstar.com', 'comeet.com'];
  var ORG_LEGAL = ['inc', 'llc', 'ltd', 'corp', 'corporation', 'incorporated', 'limited', 'the', 'and', 'group', 'company', 'co', 'plc', 'gmbh', 'ag',
    'sa', 'llp', 'lp', 'holdings'];
  var ORG_GENERIC = ['global', 'international', 'solutions', 'services', 'systems', 'technologies', 'technology', 'tech', 'labs', 'health', 'healthcare',
    'partners', 'consulting', 'capital', 'bank', 'financial', 'digital', 'media', 'network', 'networks', 'software', 'data', 'analytics',
    'careers', 'jobs', 'talent', 'staffing', 'recruiting', 'agency', 'associates', 'enterprises', 'industries', 'foundation', 'university',
    'college', 'school', 'institute', 'center', 'centre', 'hospital', 'medical', 'energy', 'world', 'online', 'apps', 'cloud', 'design',
    'studio', 'studios', 'games', 'marketing', 'american', 'national', 'united', 'first'];
  // 'careers.acme.co.uk' -> 'acme.co.uk', 'jobs.acme.com' -> 'acme.com'
  function registrable(domain) {
    var parts = str(domain).replace(/^\.+|\.+$/g, '').split('.').filter(Boolean);
    if (parts.length <= 2) return parts.join('.');
    var last2 = parts.slice(-2).join('.');
    return (MULTI_SUFFIX.indexOf(last2) >= 0 || SHARED_HOSTS.indexOf(last2) >= 0) ? parts.slice(-3).join('.') : last2;
  }
  // A posting's own address is used only when it plainly belongs to the company: never a free mail provider or a
  // shared platform, and either on the same site as the posting or named after the company.
  function emailTrusted(c) {
    var e = str(c.emailTo);
    if (!e) return false;
    var dom = domainOf(e);
    if (!dom || FREE_MAIL.indexOf(dom) >= 0 || SHARED_HOSTS.indexOf(dom.split('.').slice(-2).join('.')) >= 0) return false;
    var reg = registrable(dom);
    if (reg.split('.').length < 2) return false;
    var host = lc(c.host);
    if (host && SHARED_HOSTS.indexOf(host.split('.').slice(-2).join('.')) < 0 && registrable(host) === reg) return true;
    var label = reg.split('.')[0];
    var core = normName(c.org).split(' ').filter(function (w) { return w && ORG_LEGAL.indexOf(w) < 0; });
    var flat = core.join('');
    if (flat.length >= 3 && label === flat) return true;
    return core.some(function (w) { return w.length >= 4 && ORG_GENERIC.indexOf(w) < 0 && label === w; });
  }
  function textSlice(s, n) { var t = str(s); if (t.length > n) { var a = cps(t); if (a.length > n) t = a.slice(0, n).join(''); } return t; }

  // One job as Auto reads it - built from a Job Search analysis item (the same on the page and the server).
  function candidateFrom(it, normOrg) {
    var j = it.job, s = it.score, o = it.opp;
    var ids = [str(j.id)];
    arr(j.duplicates).forEach(function (d) { if (d && d.id != null && ids.indexOf(str(d.id)) < 0) ids.push(str(d.id)); });
    var desc = str(j.description);
    var skills = arr(j.skills).map(function (x) { return str(x && x.name); }).filter(Boolean).slice(0, 20);
    var hay = textSlice(lc(str(j.title) + ' \n ' + skills.join(', ') + ' \n ' + desc), HAY_MAX);
    var ok = normOrg ? normOrg(j.org) : normName(j.org);
    var cover = COVER_RE.test(lc(desc)) && !NO_COVER_RE.test(lc(desc));
    var c = {
      id: str(j.id), ids: ids,
      title: clean(str(j.title), 200), org: clean(str(j.org), 120), orgKey: ok || ('#' + str(j.id)),
      type: str(j.type), location: clean(str(j.location), 160), mode: j.mode || null,
      fit: s.fit, fitUncapped: s.fitUncapped, band: s.band, confidence: s.confidence,
      stretch: isStretch(s), capWhy: s.capApplied ? clean(str(s.capApplied.why), 160) : '',
      positives: arr(s.positives).slice(0, 3).map(function (p) { return clean(str(p && p.text), 160); }),
      gaps: arr(s.gaps).slice(0, 2).map(function (g) { return clean(str(g && g.text), 160); }),
      ageDays: o.ageDays, freshness: o.freshness, ghost: o.ghost, ghostReasons: arr(o.ghostReasons).slice(0, 3).map(function (x) { return clean(str(x), 120); }),
      repostCount: o.repostCount || 0, route: o.applyRoute, host: textSlice(o.applyHost, 120), applyUrl: textSlice(j.applyUrl, 600),
      agency: !!(j.agency && j.agency.is), evergreen: !!(j.evergreen && j.evergreen.is),
      salaryMin: j.salary ? j.salary.annualMin : null, salaryMax: j.salary ? j.salary.annualMax : null, salarySource: j.salary ? (j.salary.source || null) : null,
      deadline: j.deadline ? str(j.deadline).slice(0, 10) : null,
      skills: skills, coverAsked: cover, emailTo: postingEmail(desc), source: str(j.source),
      hay: hay
    };
    return c;
  }

  /* ------------------------------------------------------------- the plan */
  function daysLeft(deadline, now) {
    var ymd = validDate(str(deadline).slice(0, 10));
    if (!ymd || num(now) === null) return null;
    var today = Math.floor(now / DAY) * DAY;
    return Math.floor((dayStart(ymd) - today) / DAY);
  }
  function companyRule(rules, org, rule) {
    for (var i = 0; i < rules.companies.length; i++) {
      var c = rules.companies[i];
      if (c.rule === rule && nameIn(c.name, org)) return c;
    }
    return null;
  }
  function currentEmployer(rules, ctx, org) {
    if (!rules.avoidCurrentEmployer) return null;
    var list = arr(ctx.currentEmployers);
    for (var i = 0; i < list.length; i++) if (nameIn(list[i], org) || nameIn(org, list[i])) return list[i];
    return null;
  }
  function contactsAt(ctx, c) {
    var map = isObj(ctx.contacts) ? ctx.contacts : {};
    var out = [];
    Object.keys(map).sort().forEach(function (company) {
      if (nameIn(company, c.org) || nameIn(c.org, company)) arr(map[company]).forEach(function (n) { if (out.indexOf(str(n)) < 0) out.push(str(n)); });
    });
    return out.slice(0, 5);
  }
  function salaryTop(c) {
    var a = num(c.salaryMin), b = num(c.salaryMax);
    if (a === null && b === null) return null;
    return Math.max(a === null ? 0 : a, b === null ? 0 : b);
  }
  function isRemote(c) { return c.mode === 'remote' || /(?<![a-z])remote(?![a-z])/.test(lc(c.location)); }
  function ageText(n) { return n === 0 ? 'Posted today' : (n === 1 ? 'Posted yesterday' : 'Posted ' + n + ' days ago'); }
  function closeText(n) { return n === 0 ? 'Closes today' : (n === 1 ? 'Closes tomorrow' : 'Closes in ' + n + ' days'); }

  // One job against the rules: {state: 'excluded' | 'held' | 'ok', key, why, always, boost, stretch, dl}
  // skipFit: judge every rule except the fit bar (for the "what if" counts).
  function evaluate(c, rules, ctx, skipFit) {
    var now = num(ctx.now) || 0;
    var res = { state: 'ok', key: '', why: '', always: false, boost: false, stretch: false, dl: daysLeft(c.deadline, now) };
    function out(state, key, why) { res.state = state; res.key = key; res.why = why; return res; }
    if (num(c.fit) === null) return out('excluded', 'unscored', 'The posting says too little to score');
    var taken = isObj(ctx.taken) ? ctx.taken : {};
    for (var i = 0; i < c.ids.length; i++) if (own(taken, c.ids[i]) && taken[c.ids[i]]) return out('excluded', 'applied', 'You already have an application for this job');
    if (res.dl !== null && res.dl < 0) return out('excluded', 'closed', 'Its closing date has passed');
    var never = companyRule(rules, c.org, 'never');
    if (never) return out('excluded', 'never', 'On your never-apply list (' + never.name + ')');
    var cur = currentEmployer(rules, ctx, c.org);
    if (cur) return out('excluded', 'current_employer', 'Your current employer (' + cur + ')');
    var always = companyRule(rules, c.org, 'always');
    res.always = !!always;
    res.boost = !!companyRule(rules, c.org, 'boost');
    if (rules.types[c.type] === false) return out('held', 'type', 'You turned off ' + (TYPE_NAMES[c.type] || c.type));
    var floor = always ? Math.min(rules.minFit, ALWAYS_FLOOR) : rules.minFit;
    if (!skipFit && c.fit < floor) {
      if (c.stretch && rules.allowStretch && !always) res.stretch = true;
      else return out('held', 'fit', 'Fit ' + c.fit + ' - below your ' + floor);
    } else if (c.stretch) {
      res.stretch = true;   // clears your bar, but it's a level or years stretch: Auto still asks you first
    }
    if (rules.minConfidence === 'high' && c.confidence !== 'high') return out('held', 'confidence', 'Kaidostar is only ' + c.confidence + '-confidence in this fit');
    if (rules.minConfidence === 'medium' && c.confidence === 'low') return out('held', 'confidence', 'Kaidostar is only low-confidence in this fit');
    if (c.evergreen && !always) return out('held', 'evergreen', 'A standing "talent pool" post, not a specific opening');
    if ((rules.skipGhost === 'high' && c.ghost === 'high') || (rules.skipGhost === 'elevated' && (c.ghost === 'high' || c.ghost === 'elevated')))
      return out('held', 'ghost', 'May not be a live opening (' + (arr(c.ghostReasons)[0] || 'ghost-job signals') + ')');
    if (rules.skipAgencies && c.agency) return out('held', 'agency', 'Posted by a staffing agency');
    if (rules.skipReposts && c.repostCount >= 1) return out('held', 'repost', 'Reposted ' + plural(c.repostCount, 'time'));
    var hay = str(c.hay);
    for (var k = 0; k < rules.keywordsExclude.length; k++) {
      var w = rules.keywordsExclude[k];
      if (hay.indexOf(lc(w)) >= 0) return out('held', 'keyword_excluded', 'Mentions "' + w + '" (on your exclude list)');
    }
    if (rules.aggregators === 'skip' && c.route === 'aggregator') return out('held', 'aggregator', 'Only on a job board (' + (c.host || 'unknown site') + ') - you chose to skip those');
    if (!always) {
      if (rules.maxAgeDays > 0 && num(c.ageDays) !== null && c.ageDays > rules.maxAgeDays) return out('held', 'age', 'Posted ' + c.ageDays + ' days ago - older than your ' + rules.maxAgeDays + '-day limit');
      if (rules.remoteOnly && !isRemote(c)) return out('held', 'remote', 'Not remote');
      if (rules.locations.length) {
        var loc = lc(c.location), okLoc = false;
        for (var a = 0; a < rules.locations.length; a++) {
          var term = lc(rules.locations[a]);
          if (term === 'remote' ? isRemote(c) : loc.indexOf(term) >= 0) { okLoc = true; break; }
        }
        if (!okLoc) return out('held', 'location', 'Not in your target locations');
      }
      if (rules.industries.length && !rules.industries.some(function (x) { return hay.indexOf(lc(x)) >= 0; })) return out('held', 'industry', 'Not in your target fields');
      if (rules.companySizes.length && !rules.companySizes.some(function (sz) { return (SIZE_SIGNALS[sz] || []).some(function (x) { return hay.indexOf(x) >= 0; }); }))
        return out('held', 'size', 'Company size not stated as one you picked');
      if (rules.keywordsInclude.length && !rules.keywordsInclude.some(function (x) { return hay.indexOf(lc(x)) >= 0; })) return out('held', 'keyword_missing', 'Has none of your must-have keywords');
      var top = salaryTop(c);
      if (rules.salaryFloor > 0 && top !== null && top < rules.salaryFloor * 1000)
        return out('held', 'salary', (c.salarySource === 'estimated' ? 'Estimated to pay' : 'Pays') + ' up to $' + rnd(top / 1000) + 'k - under your $' + rules.salaryFloor + 'k floor');
      if (rules.requireSalary && top === null) return out('held', 'salary_missing', 'Doesn’t state pay (you asked for jobs that do)');
      if (rules.deadlineMaxDays > 0 && (res.dl === null || res.dl > rules.deadlineMaxDays)) return out('held', 'deadline', 'Not closing within ' + rules.deadlineMaxDays + ' days');
    }
    return res;
  }

  function deliveryFor(c, rules, ctx) {
    if (c.route === 'aggregator') return { method: 'handoff', key: 'aggregator', why: (c.host || 'This') + ' is a job board - Kaidostar never applies for you on job boards, so you’ll get a ready-to-submit kit' };
    if (c.route !== 'employer' && c.route !== 'company_site') return { method: 'handoff', key: 'no_link', why: 'No standard application link - you’ll get a ready-to-submit kit' };
    if (!ctx.consent) return { method: 'handoff', key: 'consent', why: 'You haven’t let Kaidostar submit for you - you’ll get a ready-to-submit kit' };
    // by email only where the posting says so on the company's own site (an employer's hiring system has its
    // form for that), and only when this server can send email
    if (c.emailTo && c.route === 'company_site' && ctx.emailReady) {
      if (emailTrusted(c)) return { method: 'email', key: 'email', why: 'Emailed on your behalf to ' + c.emailTo + ' (the address the posting gives) with your resume attached - replies go to you' };
      return { method: 'handoff', key: 'email_untrusted', why: 'The posting asks for email to ' + c.emailTo + ', which doesn’t look like the company’s own address - check it yourself' };
    }
    // a company's own site may hold other forms (a general "send us your CV"): never submitted on its own
    if (c.route === 'company_site') return { method: 'extension', key: 'extension', why: 'On the company’s own careers site - the Kaidostar Apply extension fills it and you click submit (or use the kit)' };
    if (ctx.browserAvailable) return { method: 'auto_submit', key: 'auto_submit', why: 'Kaidostar fills and submits it on ' + (c.host || 'the employer’s hiring system') + ', and stops if anything needs you' };
    return { method: 'extension', key: 'extension', why: 'Ready for one-click submit in the Kaidostar Apply extension (or the kit) - this server can’t open a browser' };
  }

  // The plan for this moment: what Auto prepares now, what waits, what it holds back - every job with a reason.
  function plan(cands, rules, ctx) {
    rules = normRules(rules);
    ctx = isObj(ctx) ? ctx : {};
    var now = num(ctx.now) || 0;
    var excluded = { applied: 0, closed: 0, never: 0, current_employer: 0, unscored: 0 };
    var held = [], heldCounts = {}, ok = [], whatIfOk = [];
    arr(cands).forEach(function (c) {
      if (!isObj(c) || !Array.isArray(c.ids)) return;
      var ev = evaluate(c, rules, ctx, false);
      if (ev.state === 'excluded') { excluded[ev.key] = (excluded[ev.key] || 0) + 1; return; }
      var evw = (ev.state === 'held' && ev.key === 'fit') || ev.stretch ? evaluate(c, rules, ctx, true) : ev;
      if (evw.state === 'ok') whatIfOk.push({ fit: c.fit, always: evw.always });
      if (ev.state === 'held') { held.push({ c: c, key: ev.key, why: ev.why }); heldCounts[ev.key] = (heldCounts[ev.key] || 0) + 1; return; }
      ok.push({ c: c, ev: ev });
    });
    // priority: fit, then fresher, prioritized companies, the employer's own site, closing soon; stretches last
    ok.forEach(function (x) {
      var c = x.c, ev = x.ev, p = c.fit;
      if (rules.preferFresh) p += own(FRESH_BONUS, c.freshness) ? FRESH_BONUS[c.freshness] : 0;
      if (ev.always) p += 8;
      if (ev.boost) p += 5;
      if (c.route === 'employer') p += 2; else if (c.route === 'company_site') p += 1;
      if (ev.dl !== null && ev.dl <= 7) p += 3;
      if (ev.stretch) p -= 6;
      if (c.ghost === 'elevated') p -= 2;
      x.p = p;
    });
    ok.sort(function (a, b) {
      return (b.p - a.p) || (b.c.fit - a.c.fit) ||
        ((a.c.ageDays == null ? 1e9 : a.c.ageDays) - (b.c.ageDays == null ? 1e9 : b.c.ageDays)) ||
        (a.c.id < b.c.id ? -1 : (a.c.id > b.c.id ? 1 : 0));
    });
    // one role per company: what you applied to in the window, plus what this plan already takes
    var since = now - rules.companyWindowDays * DAY, recent = Object.create(null), lastAt = Object.create(null);
    arr(ctx.history).forEach(function (h) {
      if (!isObj(h) || h.status === 'undone' || num(h.at) === null || h.at < since) return;
      var k = str(h.orgKey); if (!k) return;
      recent[k] = (recent[k] || 0) + 1;
      if (!lastAt[k] || h.at > lastAt[k]) lastAt[k] = h.at;
    });
    var planned = Object.create(null), accepted = [];
    ok.forEach(function (x) {
      var k = x.c.orgKey, have = (recent[k] || 0) + (planned[k] || 0);
      if (have >= rules.perCompany) {
        var why = planned[k] && !recent[k]
          ? 'A better-fitting ' + x.c.org + ' role is already in this plan (one per company)'
          : 'Applied to ' + x.c.org + ' ' + Math.max(0, Math.floor((now - (lastAt[k] || now)) / DAY)) + ' days ago - one role per company every ' + rules.companyWindowDays + ' days';
        held.push({ c: x.c, key: 'company_limit', why: why }); heldCounts.company_limit = (heldCounts.company_limit || 0) + 1;
        return;
      }
      planned[k] = (planned[k] || 0) + 1;
      accepted.push(x);
    });
    held.sort(function (a, b) { return (b.c.fit - a.c.fit) || (a.c.id < b.c.id ? -1 : (a.c.id > b.c.id ? 1 : 0)); });
    // pause and capacity
    var paused = '';
    if (rules.pausedUntil && now < dayStart(rules.pausedUntil)) paused = 'until';
    else if (rules.pauseOnInterview && (num(ctx.interviewsActive) || 0) > 0) paused = 'interview';
    var tierMax = intIn(ctx.tierMax, 0, DAILY_MAX, 0);
    var cap = Math.min(rules.dailyCap, tierMax);
    var madeToday = Math.max(0, intIn(ctx.madeToday, 0, 100000, 0)), madeWeek = Math.max(0, intIn(ctx.madeWeek, 0, 100000, 0));
    var remainingToday = Math.max(0, cap - madeToday);
    var remainingWeek = rules.weeklyCap > 0 ? Math.max(0, rules.weeklyCap - madeWeek) : null;
    var slots = paused ? 0 : (remainingWeek === null ? remainingToday : Math.min(remainingToday, remainingWeek));
    var queue = [], waiting = [];
    accepted.forEach(function (x, i) {
      var c = x.c, ev = x.ev;
      var reasons = ['Fit ' + c.fit + ' · ' + (BAND_NAMES[c.band] || 'Scored')];
      if (num(c.ageDays) !== null) reasons.push(ageText(c.ageDays)); else reasons.push('Posting date unknown');
      if (c.route === 'employer') reasons.push('On the employer’s own hiring site');
      else if (c.route === 'company_site') reasons.push('On the company’s careers site');
      if (ev.always) reasons.push('On your always list');
      if (ev.boost) reasons.push('A company you prioritized');
      if (ev.dl !== null && ev.dl <= 7) reasons.push(closeText(ev.dl));
      if (i >= slots) {
        var wk = paused ? 'paused' : (remainingWeek !== null && remainingWeek <= remainingToday && i >= remainingWeek ? 'cap_week' : 'cap_today');
        waiting.push({ c: c, p: x.p, key: wk, reasons: reasons, position: i - slots + 1 });
        return;
      }
      var needs = [];
      if (ev.stretch) needs.push({ key: 'stretch', why: 'A stretch role (' + (c.capWhy || 'a level or years gap') + ') - Auto always asks you first' });
      var contacts = contactsAt(ctx, c);
      var hold = (contacts.length && rules.referral === 'hold')
        ? { days: rules.referralHoldDays, contact: contacts[0], why: 'Waits ' + plural(rules.referralHoldDays, 'day') + ' so you can ask ' + contacts[0] + ' for a referral first' } : null;
      var dv = deliveryFor(c, rules, ctx);
      var missing = arr(ctx.answersMissing);
      if ((dv.method === 'auto_submit' || dv.method === 'extension') && missing.length) needs.push({ key: 'answers', why: 'Add your ' + andList(missing) + ' answers so forms can be finished' });
      var status = rules.mode === 'auto' && !needs.length ? 'send' : 'review';
      queue.push({ c: c, p: x.p, reasons: reasons, needs: needs, hold: hold, delivery: dv, status: status, contacts: rules.referral === 'off' ? [] : contacts });
    });
    var whatIf = WHAT_IF.map(function (t) {
      var n = 0;
      whatIfOk.forEach(function (w) { if (w.fit >= (w.always ? Math.min(t, ALWAYS_FLOOR) : t)) n++; });
      return { minFit: t, n: n };
    });
    return {
      version: VERSION, queue: queue, waiting: waiting, held: held, heldCounts: heldCounts, excluded: excluded,
      paused: paused, considered: arr(cands).length,
      capacity: { cap: cap, tierMax: tierMax, madeToday: madeToday, remainingToday: remainingToday, weeklyCap: rules.weeklyCap, madeWeek: madeWeek, remainingWeek: remainingWeek, slots: slots },
      whatIf: whatIf
    };
  }

  /* ------------------------------------------------------------- results */
  // Honest results: applications sent, by route / fit / freshness / documents, with counts small
  // enough to be noise said plainly. An "interview" is one you logged (interview or offer).
  var ENOUGH = 10;
  function bandOfFit(f) { return num(f) === null ? 'unknown' : (f >= 85 ? 'excellent' : (f >= 70 ? 'strong' : (f >= 55 ? 'partial' : 'weak'))); }
  function results(apps) {
    var sent = arr(apps).filter(function (a) { return isObj(a) && a.status === 'sent'; });
    function group(keyFn, labels) {
      var g = {};
      sent.forEach(function (a) {
        var k = keyFn(a); if (k == null) return;
        var e = g[k] || (g[k] = { key: k, label: labels[k] || k, sent: 0, responses: 0, interviews: 0 });
        e.sent++;
        var o = a.outcome_status;
        if (o && o !== 'applied') e.responses++;
        if (o === 'interview' || o === 'offer') e.interviews++;
      });
      return Object.keys(g).map(function (k) { var e = g[k]; e.rate = e.sent ? Math.round(e.interviews / e.sent * 1000) / 10 : 0; e.enough = e.sent >= ENOUGH; return e; })
        .sort(function (a, b) { return b.sent - a.sent || (a.key < b.key ? -1 : 1); });
    }
    function pk(a) { return isObj(a.package) ? a.package : {}; }
    return {
      total: sent.length,
      interviews: sent.filter(function (a) { return a.outcome_status === 'interview' || a.outcome_status === 'offer'; }).length,
      byWho: group(function (a) { return a.auto_generated ? 'auto' : 'you'; }, { auto: 'Prepared by Auto', you: 'Started by you' }),
      byRoute: group(function (a) { var r = pk(a).route; return r || 'unknown'; }, { employer: 'Employer’s hiring site', company_site: 'Company careers site', aggregator: 'Job board', unknown: 'Not recorded' }),
      byFit: group(function (a) { return bandOfFit(num(pk(a).fit) !== null ? pk(a).fit : a.confidence_pct); }, { excellent: 'Fit 85+', strong: 'Fit 70-84', partial: 'Fit 55-69', weak: 'Fit under 55', unknown: 'Not recorded' }),
      byFresh: group(function (a) { var d = num(pk(a).ageDays); return d === null ? 'unknown' : (d <= 3 ? 'd3' : (d <= 10 ? 'd10' : 'older')); }, { d3: 'Posted 0-3 days before', d10: 'Posted 4-10 days before', older: 'Older postings', unknown: 'Not recorded' }),
      byCover: group(function (a) { return isObj(a.package) ? (pk(a).coverLetter ? 'yes' : 'no') : null; }, { yes: 'With a cover letter', no: 'Without a cover letter' }),
      byChannel: group(function (a) { return a.sent_channel || 'unknown'; }, { web_auto: 'Submitted by Kaidostar', web_ext: 'Submitted in your browser', email: 'Emailed', web: 'You submitted it', unknown: 'Not recorded' }),
      enough: ENOUGH
    };
  }

  /* ------------------------------------------------------------- messages */
  function firstName(n) { return clean(str(n), 80).split(' ')[0] || ''; }
  function referralText(contact, title, org, me) {
    return 'Hi ' + (firstName(contact) || 'there') + ',\n\nI’m applying for the ' + title + ' role at ' + org + ' and saw that you work there. Would you be open to a quick chat about the team - or, if you think I’d be a fit, referring me? I’m happy to send my resume.\n\nThanks,\n' + (clean(str(me), 80) || '');
  }
  function followUpText(title, org, sentOn, me) {
    return 'Hello,\n\nI applied for the ' + title + ' role at ' + org + (sentOn ? ' on ' + sentOn : '') + ' and wanted to say I’m still very interested. I’d welcome the chance to talk about how I could help the team, and I’m happy to share anything else that’s useful.\n\nThank you,\n' + (clean(str(me), 80) || '');
  }

  var api = {
    version: VERSION, DAY: DAY, TIER_DAILY_MAX: TIER_DAILY_MAX, DAILY_MAX: DAILY_MAX, WEEKLY_MAX: WEEKLY_MAX,
    DELAYS: DELAYS, MAX_AGES: MAX_AGES, FOLLOWUPS: FOLLOWUPS, WINDOWS: WINDOWS, HOLD_DAYS: HOLD_DAYS, SIZES: SIZES, SIZE_SIGNALS: SIZE_SIGNALS,
    FIT_MIN: FIT_MIN, FIT_MAX: FIT_MAX, ALWAYS_FLOOR: ALWAYS_FLOOR, WHAT_IF: WHAT_IF, ENOUGH: ENOUGH,
    defaults: defaults, normRules: normRules, normName: normName, nameIn: nameIn, clean: clean,
    isStretch: isStretch, candidateFrom: candidateFrom, postingEmail: postingEmail, emailTrusted: emailTrusted,
    daysLeft: daysLeft, evaluate: evaluate, deliveryFor: deliveryFor, plan: plan, results: results,
    referralText: referralText, followUpText: followUpText, validDate: validDate
  };
  root.AutoEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
