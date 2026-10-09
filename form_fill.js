/* Kaidostar autofill engine — the shared, safety-first logic that fills a real
 * job-application form in the user's own browser. It is the DOM counterpart of
 * the backend's application_submit.py and enforces the SAME guarantees:
 *
 *   - never bluff past a login wall or CAPTCHA: those steps are the person's. It reports a sign-in or a browser
 *     check (the content script waits for the person, then carries on), and fills a form that has a CAPTCHA or
 *     asks for a password around it - the person does that step and makes the final click;
 *   - fill only fields we can confidently map to the user's real data;
 *   - NEVER let an auto-submit go through when a required field can't be filled
 *     honestly — a required <select> (visa sponsorship, work authorization,
 *     EEO/veteran/disability), a required consent checkbox, or a required radio
 *     group all block auto-submit, because the extension does not guess answers
 *     to those; the user answers them;
 *   - only report a submission as confirmed on a real change after submit.
 *
 * This never auto-submits by itself. It fills + reports; the content script (and
 * the user) decide whether to submit. Runs in the page via the content script,
 * and is also importable in Node for tests. */
(function (root) {
  "use strict";

  var LOGIN_MARKERS = ["sign in to apply", "log in to apply", "login to apply", "create an account to apply"];
  var CAPTCHA_SELECTOR = "iframe[src*='recaptcha'], iframe[src*='hcaptcha'], .g-recaptcha, .h-captcha, [data-sitekey]";
  // application-specific wording only: a newsletter or talent-community signup's "thanks, we'll be in
  // touch" must never read as a submitted application (the same list as application_submit.py)
  var CONFIRM_MARKERS = [
    "thank you for applying", "thanks for applying", "thank you for your application", "thanks for your application",
    "application received", "received your application", "application submitted", "application was submitted",
    "application was successfully submitted", "application has been submitted", "application has been received",
    "application has been sent", "application was received", "submitted your application", "application complete",
    "application is complete", "successfully applied"
  ];
  // the words around a form that collects sign-ups, not applications - and the buttons such forms have
  var NOT_APPLICATION_BTN = /^(?:join|subscribe|sign ?up|notify me|get (?:job )?alerts?|create (?:an? )?alert|keep me posted)/i;
  // Kaidostar submits on its own only on employers' hiring systems (Greenhouse, Lever, Workday...), where a
  // page is one job's application. On a company's own site you always make the final click.
  var ATS_DOMAINS = ["greenhouse.io", "lever.co", "myworkdayjobs.com", "workday.com", "ashbyhq.com", "smartrecruiters.com", "icims.com", "jobvite.com", "bamboohr.com", "breezy.hr", "workable.com", "recruitee.com", "taleo.net", "successfactors.com", "paylocity.com", "ultipro.com", "rippling.com", "dover.com", "jazzhr.com", "applytojob.com", "teamtailor.com"];
  function onAts(host, list) {
    host = String(host || "").toLowerCase();
    var l = Array.isArray(list) && list.length ? list : ATS_DOMAINS;
    return l.some(function (dmn) { dmn = String(dmn).toLowerCase(); return host === dmn || host.slice(-(dmn.length + 1)) === "." + dmn; });
  }
  // job boards (LinkedIn, Indeed...): their own apply forms are never filled or submitted for you, whatever link
  // led there (the server's list and this one - the job engine's - together)
  var BOARD_DOMAINS = ["adzuna.com", "indeed.com", "linkedin.com", "ziprecruiter.com", "glassdoor.com", "simplyhired.com", "monster.com", "careerbuilder.com", "jooble.org", "talent.com", "lensa.com", "jobright.ai", "dice.com", "snagajob.com", "indeed.co.uk", "indeed.ca", "indeed.de", "indeed.fr", "indeed.co.in", "indeed.com.au", "indeed.ie", "indeed.nl", "indeed.es", "indeed.it", "indeed.com.br", "indeed.com.mx", "indeed.com.sg", "indeed.ch", "indeed.co.nz", "indeed.co.za", "indeed.jp", "glassdoor.co.uk", "glassdoor.ca", "glassdoor.co.in", "glassdoor.com.au", "glassdoor.de", "glassdoor.fr", "glassdoor.ie", "glassdoor.nl", "glassdoor.es", "glassdoor.it", "glassdoor.com.br", "glassdoor.com.mx", "glassdoor.sg", "glassdoor.ch", "glassdoor.co.nz", "glassdoor.com.hk", "glassdoor.be", "glassdoor.at", "monster.co.uk", "monster.ca", "monster.de", "monster.fr", "monster.ie", "monster.nl", "monster.es", "monster.it", "monster.be", "monster.at", "monster.ch", "monster.lu", "ziprecruiter.co.uk", "ziprecruiter.ca", "adzuna.co.uk", "adzuna.ca", "adzuna.com.au", "adzuna.de", "adzuna.fr", "adzuna.in", "adzuna.nl", "adzuna.it", "adzuna.es", "adzuna.pl", "adzuna.at", "adzuna.ch", "adzuna.com.br", "adzuna.co.za", "adzuna.sg", "adzuna.co.nz", "adzuna.com.mx", "adzuna.be", "careerbuilder.ca", "careerbuilder.co.uk", "simplyhired.ca", "simplyhired.co.uk", "simplyhired.com.au", "seek.com.au", "seek.co.nz", "reed.co.uk", "totaljobs.com", "cv-library.co.uk", "naukri.com", "stepstone.de", "xing.com", "workopolis.com", "jobstreet.com", "jobsdb.com"];
  function onBoard(host, list) {
    host = String(host || "").toLowerCase();
    var l = BOARD_DOMAINS.concat(Array.isArray(list) ? list : []);
    return !!host && l.some(function (dmn) { dmn = String(dmn).toLowerCase(); return !!dmn && (host === dmn || host.slice(-(dmn.length + 1)) === "." + dmn); });
  }
  // The job this run is for: a form whose button doesn't say "apply" only counts when the page names this job
  // (a careers page's general "share your resume" form is not this job's application).
  var JOB_TITLE = "";
  function setJobTitle(t) { JOB_TITLE = String(t || ""); }
  // (whether the page names the job: titleSeen, in the shared block below)
  // a form's own words plus the section around it and the page title (where "Join our talent community" usually sits)
  // (without the labels of tick boxes and choices, as ownText: an opt-in is not what the form is)
  function formContext(f, docu) {
    var t = ownText(f), pe = f.parentElement;
    for (var k = 0; k < 2 && pe; k++) { t += " " + ownText(pe).slice(0, 4000); pe = pe.parentElement; }
    return (t + " " + String((docu && docu.title) || "")).slice(0, 12000);
  }
  var CONFIRM_URL_MARKERS = ["thank-you", "thankyou", "thank_you", "/thanks", "confirmation", "/confirmed", "application-received", "application-submitted"];

  function doc(ctx) { return (ctx && ctx.document) ? ctx.document : (typeof document !== "undefined" ? document : ctx); }

  function isVisible(el) {
    try {
      if (!el) return false;
      // No layout boxes => not rendered: display:none on the element OR any
      // ancestor, or detached. This is the reliable signal; offsetParent alone is
      // null for a visible position:fixed element, and an element's OWN computed
      // display isn't "none" when only an ancestor is hidden - the old check missed
      // that and treated conditional/multi-step hidden fields as visible.
      if (el.getClientRects().length === 0) return false;
      var cs = (el.ownerDocument.defaultView || window).getComputedStyle(el);
      if (cs && (cs.visibility === "hidden" || cs.visibility === "collapse")) return false;
      return true;
    } catch (e) { return true; }
  }

  // React/Vue-safe value set: assign through the native setter and fire input +
  // change, or the framework never sees the value and treats the field as empty.
  function setValue(el, value) {
    try {
      var win = el.ownerDocument.defaultView || window;
      var proto = el.tagName === "TEXTAREA" ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
      var desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) desc.set.call(el, value); else el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    } catch (e) { return false; }
  }

  /* @@QA_LIB_START@@ - the form's other questions, read so your answer bank can fill the ones it
   * covers. Shared word for word with the backend's application_submit.py, which runs it in its
   * own browser - so both delivery paths read and answer a form the same way. */
  function qaText(n) { return n ? String(n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function qaAttr(v) { return String(v).replace(/["\\]/g, '\\$&'); }
  function qaVisible(el) {
    try {
      if (!el || el.getClientRects().length === 0) return false;
      var cs = (el.ownerDocument.defaultView || window).getComputedStyle(el);
      return !(cs && (cs.visibility === 'hidden' || cs.visibility === 'collapse'));
    } catch (e) { return true; }
  }
  function qaSetValue(el, value) {
    try {
      var win = el.ownerDocument.defaultView || window;
      var proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : (el.tagName === 'SELECT' ? win.HTMLSelectElement.prototype : win.HTMLInputElement.prototype);
      var desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, value); else el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    } catch (e) { return false; }
  }
  function qaEmptySelect(s) {
    var o = s.options[s.selectedIndex];
    if (!o) return true;
    var v = String(o.value || '').trim(), t = qaText(o).toLowerCase();
    return !v || /^(select|choose|please select|pick|--|\u2014|-)/.test(t);
  }
  function qaLabel(el, d) {
    var t = '';
    try {
      if (el.id) { var l = d.querySelector('label[for="' + qaAttr(el.id) + '"]'); if (l) t = qaText(l); }
      if (!t) { var by = el.getAttribute('aria-labelledby'); if (by) t = by.split(/\s+/).map(function (i) { return qaText(d.getElementById(i)); }).join(' ').trim(); }
      if (!t) t = String(el.getAttribute('aria-label') || '').trim();
      if (!t) { var p = el.closest('label'); if (p) t = qaText(p); }
      if (!t) { var fs = el.closest('fieldset'); if (fs) t = qaText(fs.querySelector('legend')); }
      if (!t) {
        var w = el.parentElement;
        for (var k = 0; k < 3 && w && !t; k++) {
          var cand = w.querySelector('label, legend, .label, [class*="label"], [class*="question"]');
          if (cand && !cand.contains(el) && !cand.querySelector('input, select, textarea')) t = qaText(cand);
          w = w.parentElement;
        }
      }
      if (!t) t = String(el.getAttribute('placeholder') || el.getAttribute('name') || '').trim();
    } catch (e) {}
    return t.slice(0, 300);
  }
  function qaOptionLabel(input, d) {
    var t = '';
    try {
      if (input.id) { var l = d.querySelector('label[for="' + qaAttr(input.id) + '"]'); if (l) t = qaText(l); }
      if (!t) { var p = input.closest('label'); if (p) t = qaText(p); }
      if (!t) t = String(input.getAttribute('aria-label') || input.value || '');
    } catch (e) {}
    return String(t).trim().slice(0, 200);
  }
  function qaGroupLabel(radio, d) {
    try {
      var fs = radio.closest('fieldset');
      if (fs) { var lg = qaText(fs.querySelector('legend')); if (lg) return lg.slice(0, 300); }
      var rg = radio.closest('[role="radiogroup"]');
      if (rg) {
        var t = String(rg.getAttribute('aria-label') || ''), by = rg.getAttribute('aria-labelledby');
        if (!t && by) t = by.split(/\s+/).map(function (i) { return qaText(d.getElementById(i)); }).join(' ');
        if (t.trim()) return t.trim().slice(0, 300);
      }
      var w = radio.parentElement;
      for (var k = 0; k < 6 && w; k++) {
        var cands = w.querySelectorAll('label, legend, .label, [class*="question"], p, span, div');
        for (var j = 0; j < cands.length; j++) {
          var c = cands[j];
          if (c.contains(radio) || c.querySelector('input, select, textarea')) continue;
          var tx = qaText(c);
          if (tx) return tx.slice(0, 300);
        }
        w = w.parentElement;
      }
    } catch (e) {}
    return String(radio.getAttribute('name') || '').slice(0, 300);
  }
  // what a select or radio group says right now (its chosen option's label), '' when nothing is chosen
  function qaCurrent(ref) {
    try {
      if (Array.isArray(ref)) {
        var on = ref.filter(function (r) { return r.checked; })[0];
        return on ? qaOptionLabel(on, on.ownerDocument) : '';
      }
      if (ref.tagName === 'SELECT') { var o = ref.options[ref.selectedIndex]; return o ? qaText(o).slice(0, 200) : ''; }
    } catch (e) {}
    return '';
  }
  var QA_SKIP = { hidden: 1, submit: 1, button: 1, reset: 1, image: 1, file: 1, password: 1, email: 1, tel: 1, search: 1 };
  // -> { questions: [{label, type, options, required}], refs: [element | [radio...]] }
  function collectQuestions(scope) {
    scope = scope || document;
    var d = scope.ownerDocument || scope, out = [], refs = [], seen = {};
    var els;
    try { els = scope.querySelectorAll('select, textarea, input'); } catch (e) { return { questions: [], refs: [] }; }
    for (var i = 0; i < els.length && out.length < 60; i++) {
      var el = els[i], tag = el.tagName, type = String(el.getAttribute('type') || 'text').toLowerCase();
      if (el.disabled) continue;
      if (type !== 'radio' && type !== 'checkbox' && !qaVisible(el)) continue;   // a styled radio/checkbox can hide its input
      var req = !!(el.required || el.getAttribute('aria-required') === 'true');
      if (tag === 'SELECT') {
        // a select the form already answered (no "Select..." placeholder) is still a question: a pre-picked
        // answer to "Will you need sponsorship?" is one you never gave
        var preset = !qaEmptySelect(el);
        var opts = [];
        for (var k = 0; k < el.options.length; k++) { var ot = qaText(el.options[k]); if (ot && String(el.options[k].value || '').trim()) opts.push(ot.slice(0, 200)); }
        out.push({ label: qaLabel(el, d), type: 'select', options: opts.slice(0, 60), required: req, preset: preset, current: preset ? qaCurrent(el) : '' }); refs.push(el);
      } else if (tag === 'TEXTAREA') {
        if (String(el.value || '').trim()) continue;
        out.push({ label: qaLabel(el, d), type: 'textarea', options: [], required: req }); refs.push(el);
      } else if (type === 'radio') {
        var key = el.name ? 'n:' + el.name : 'i:' + i;
        if (seen[key]) continue;
        seen[key] = 1;
        var group = el.name ? Array.prototype.filter.call(scope.querySelectorAll('input[type=radio]'), function (r) { return r.name === el.name; }) : [el];
        var on = group.some(function (r) { return r.checked; });
        var reqG = group.some(function (r) { return r.required || r.getAttribute('aria-required') === 'true'; });
        out.push({ label: qaGroupLabel(el, d), type: 'radio', options: group.map(function (r) { return qaOptionLabel(r, d); }), required: reqG, preset: on, current: on ? qaCurrent(group) : '' }); refs.push(group);
      } else if (type === 'checkbox') {
        // a required box is a question - and so is any box the form ticked by itself (a pre-ticked "I agree", an
        // opt-in): that is an answer you never gave. An optional box left unticked is left alone.
        if (!el.checked && !req) continue;
        out.push({ label: qaOptionLabel(el, d) || qaLabel(el, d), type: 'checkbox', options: [], required: req, preset: !!el.checked, current: el.checked ? 'ticked' : '' }); refs.push(el);
      } else if (!QA_SKIP[type]) {
        if (String(el.value || '').trim()) continue;
        if (/captcha|honeypot|bot-?field/i.test(String(el.name || '') + ' ' + String(el.id || ''))) continue;
        out.push({ label: qaLabel(el, d), type: ['number', 'date', 'url'].indexOf(type) >= 0 ? type : 'text', options: [], required: req }); refs.push(el);
      }
    }
    return { questions: out, refs: refs };
  }
  // the job this page's own structured data describes (schema.org JobPosting, which hiring systems publish for search
  // engines): its title, where it is, and where a remote job's applicants must be - read only when the page describes
  // exactly one job (n), so the server can check it is this job before it uses the country
  function pageJob(d) {
    var out = { n: 0, title: '', countries: [], regions: [], localities: [], remote: [], telecommute: false };
    try {
      var found = [];
      var walk = function (o, depth) {
        if (!o || depth > 6 || found.length > 3) return;
        if (Array.isArray(o)) { for (var i = 0; i < o.length && i < 50; i++) walk(o[i], depth + 1); return; }
        if (typeof o !== 'object') return;
        var t = o['@type'];
        if (t === 'JobPosting' || (Array.isArray(t) && t.indexOf('JobPosting') >= 0)) { found.push(o); return; }
        if (o['@graph']) walk(o['@graph'], depth + 1);
      };
      var ss = (d || document).querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < ss.length && i < 20; i++) { try { walk(JSON.parse(ss[i].textContent || ''), 0); } catch (e) {} }
      out.n = found.length;
      if (found.length !== 1) return out;
      var j = found[0];
      var s = function (v) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 120) : ''; };
      var nm = function (v) { return typeof v === 'string' ? s(v) : (v && typeof v === 'object' ? s(v.name || '') : ''); };
      out.title = s(j.title);
      var locs = Array.isArray(j.jobLocation) ? j.jobLocation : (j.jobLocation ? [j.jobLocation] : []);
      locs.slice(0, 20).forEach(function (l) {
        var a = (l && typeof l === 'object') ? (l.address || l) : null;
        if (typeof a === 'string') { if (s(a)) out.localities.push(s(a)); return; }
        if (!a || typeof a !== 'object') return;
        var c = nm(a.addressCountry); if (c) out.countries.push(c);
        var r = s(a.addressRegion); if (r) out.regions.push(r);
        var lo = s(a.addressLocality); if (lo) out.localities.push(lo);
      });
      var req = Array.isArray(j.applicantLocationRequirements) ? j.applicantLocationRequirements : (j.applicantLocationRequirements ? [j.applicantLocationRequirements] : []);
      req.slice(0, 20).forEach(function (r) { var c = nm(r); if (c) out.remote.push(c); });
      out.telecommute = String(j.jobLocationType || '').toUpperCase() === 'TELECOMMUTE';
    } catch (e) {}
    return out;
  }
  // answers: [{i, option, answer, check, missing}] from the server's resolver. Returns how many were filled.
  function applyAnswers(refs, answers) {
    var done = 0;
    (answers || []).forEach(function (a) {
      if (!a || a.missing || a.i == null || !refs[a.i]) return;
      var ref = refs[a.i];
      try {
        if (Array.isArray(ref)) {
          var d = ref[0].ownerDocument;
          var pick = ref.filter(function (r) { return qaOptionLabel(r, d) === a.option; })[0];
          if (!pick) return;
          pick.click();
          if (!pick.checked) { pick.checked = true; pick.dispatchEvent(new Event('change', { bubbles: true })); }
          ref.forEach(function (r) { r.setAttribute('data-kaido-answered', '1'); });
          done++;
        } else if (ref.tagName === 'SELECT') {
          var opt = Array.prototype.filter.call(ref.options, function (o) { return qaText(o).slice(0, 200) === a.option; })[0];
          if (!opt || !qaSetValue(ref, opt.value)) return;
          ref.setAttribute('data-kaido-answered', '1');
          done++;
        } else if (String(ref.getAttribute('type') || '').toLowerCase() === 'checkbox') {
          if (a.check && !ref.checked) ref.click();
          if (ref.checked) { ref.setAttribute('data-kaido-answered', '1'); done++; }
        } else if (a.answer && qaSetValue(ref, String(a.answer))) {
          ref.setAttribute('data-kaido-answered', '1');
          done++;
        }
      } catch (e) {}
    });
    return done;
  }
  /* @@QA_LIB_END@@ */

  // boxes that don't take typed text: never filled with your details (a password box above all - an "email_password"
  // field matches "email") - the same list as application_submit.py
  var NOT_TYPED = { password: 1, hidden: 1, file: 1, checkbox: 1, radio: 1, submit: 1, button: 1, image: 1, reset: 1, range: 1, color: 1 };
  function fillFirst(d, selectors, value) {
    if (!value) return false;
    for (var i = 0; i < selectors.length; i++) {
      var els;
      try {
        els = d.querySelectorAll(selectors[i]);
      } catch (e) { continue; /* bad selector — skip */ }
      // Try EVERY element matching this selector, not just the first: a hidden or
      // disabled field matching an early selector must not shadow a visible one
      // that matches the same selector (querySelector would stop at the first).
      for (var k = 0; k < els.length; k++) {
        var el = els[k];
        if (el && NOT_TYPED[String(el.getAttribute("type") || "").trim().toLowerCase()]) continue;
        if (el && isVisible(el) && !el.disabled && !el.readOnly) {
          var ok = setValue(el, String(value));
          if (ok) { try { el.setAttribute("data-kaido-filled", "1"); } catch (e) {} }
          return ok;
        }
      }
    }
    return false;
  }

  function detectBlockers(d) {
    try {
      if (d.querySelector(CAPTCHA_SELECTOR)) return "the posting is protected by a CAPTCHA";
    } catch (e) {}
    var bodyText = (d.body && d.body.innerText ? d.body.innerText : "").toLowerCase();
    for (var i = 0; i < LOGIN_MARKERS.length; i++) {
      if (bodyText.indexOf(LOGIN_MARKERS[i]) !== -1) return "the posting requires signing in or creating an account first";
    }
    if (d.querySelector("input[type=password]")) return "the posting requires signing in or creating an account first";
    return null;
  }

  /* The steps only the person can do - Kaidostar never does them, and never tries to get round them:
   *   - a site checking that a real person is there ("Just a moment...", "Verify you are human") before it shows the page;
   *   - signing in, or creating an account, before the application appears;
   *   - a CAPTCHA on the application ("I'm not a robot");
   *   - a password the application itself asks for (it creates an account with the employer).
   * The first two mean "wait for the person, then carry on"; the last two mean "fill everything else, and the person
   * does that step and clicks Submit". */
  var CHECKING_TITLE = /^(?:just a moment|checking your browser|verify you are human|attention required|one more step|please wait)/i;
  function visiblePassword(scope) {
    try {
      var ps = scope.querySelectorAll("input[type=password]");
      for (var i = 0; i < ps.length; i++) if (isVisible(ps[i])) return ps[i];
    } catch (e) {}
    return null;
  }
  // a check the site runs before it shows the page, or a sign-in it asks for first - only when there's no application
  // form to fill here (a "Sign in to apply faster" link beside one is optional)
  function blockerKind(d, scope) {
    try {
      var title = String(d.title || "").trim();
      if (CHECKING_TITLE.test(title) || d.querySelector("#challenge-running, #challenge-form, #cf-challenge-running, #challenge-stage")) {
        return { kind: "checking", why: "the site is checking that a real person is visiting" };
      }
    } catch (e) {}
    if (scope) {
      // a form that asks for a password but has no button that sends an application ("Create account", "Register"):
      // an account to make first - the application comes after it
      if (visiblePassword(scope) && !pickSubmit(scope)) return { kind: "login", why: "the site asks you to create an account first" };
      return null;
    }
    var bodyText = (d.body && d.body.innerText ? d.body.innerText : "").toLowerCase();
    for (var i = 0; i < LOGIN_MARKERS.length; i++) {
      if (bodyText.indexOf(LOGIN_MARKERS[i]) !== -1) return { kind: "login", why: "the site asks you to sign in or create an account first" };
    }
    if (visiblePassword(d)) return { kind: "login", why: "the site asks you to sign in or create an account first" };
    return null;
  }
  /* @@CAPTCHA_START@@ - the checks that a real person is applying (CAPTCHAs): always the person's step, never Kaidostar's.
   * Shared word for word with application_submit.py, whose own browser runs it too - so both recognize the same ones. */
  // the CAPTCHAs whose "done" Kaidostar can see (reCAPTCHA, hCaptcha, Cloudflare Turnstile): Submit stays locked until it's done
  var CAPTCHA_WIDGET = ".g-recaptcha, .h-captcha, .cf-turnstile, iframe[src*='recaptcha/api2/anchor'], iframe[src*='recaptcha/enterprise/anchor'], " +
    "iframe[src*='hcaptcha.com'], iframe[src*='challenges.cloudflare.com']";
  var CAPTCHA_TOKEN = "textarea[name^='g-recaptcha-response'], textarea[name='h-captcha-response'], input[name='cf-turnstile-response'], textarea[name^='h-captcha-response']";
  // every other kind - Arkose/FunCaptcha, GeeTest, AWS WAF, MTCaptcha, Friendly Captcha, ALTCHA, Yandex SmartCaptcha, any
  // frame whose address says "captcha", a site's own "type the characters you see" box - and blocks the page names a
  // CAPTCHA. Kaidostar can't see when one of these is done, so it never locks Submit for one; but it is the person's
  // step, so a form with one is never submitted on its own.
  var CAPTCHA_SERVICE = "[data-sitekey], iframe[src*=captcha i], iframe[src*='arkoselabs'], iframe[src*='funcaptcha'], [id^='FunCaptcha'], " +
    "iframe[src*='geetest'], [class*='geetest_'], iframe[src*='awswaf'], awswaf-captcha, .mtcaptcha, .frc-captcha, altcha-widget, .smart-captcha, " +
    "input[name*=captcha i], input[id*=captcha i]";
  var CAPTCHA_WORDS = "[class*=captcha i], [id*=captcha i]";
  var NOT_A_WIDGET = /^(?:TEXTAREA|SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE|LABEL|A|P|SMALL|SELECT|OPTION|BUTTON|FORM|BODY|HTML|HEAD)$/;
  var CAPTCHA_NOT_TYPED = { password: 1, hidden: 1, file: 1, checkbox: 1, radio: 1, submit: 1, button: 1, image: 1, reset: 1, range: 1, color: 1 };
  function capShown(el) {
    try {
      if (!el || el.getClientRects().length === 0) return false;
      var cs = (el.ownerDocument.defaultView || window).getComputedStyle(el);
      return !(cs && (cs.visibility === "hidden" || cs.visibility === "collapse"));
    } catch (e) { return true; }
  }
  // (in the application form, or in no form at all: a page-wide check - never in another form on the page, a newsletter's)
  function inApplication(w, d, scope) {
    var f = w.closest ? w.closest("form") : null;
    var inScope = !!(scope && scope !== d && scope.contains && scope.contains(w));
    return inScope || !f || f === scope;
  }
  // a CAPTCHA of another kind on the application: {generic: true, invisible: it shows itself only when you submit, el}
  function otherCaptcha(d, scope) {
    var shown = null, later = null;
    var look = function (sel, strong) {
      var all;
      try { all = d.querySelectorAll(sel); } catch (e) { return; }
      for (var i = 0; i < all.length && i < 200; i++) {
        var el = all[i], tag = String(el.tagName || "").toUpperCase();
        if (NOT_A_WIDGET.test(tag) || !inApplication(el, d, scope)) continue;
        var box = tag === "INPUT";
        if (box && CAPTCHA_NOT_TYPED[String(el.getAttribute("type") || "").trim().toLowerCase()]) continue;
        try {
          // a block that holds the form (or any form) is the page's layout, not a CAPTCHA ...
          if (el.querySelector("form") || (scope && scope !== d && el.contains(scope))) continue;
          // ... and words about one ("This site is protected by reCAPTCHA") aren't one: a CAPTCHA has something to do in it
          if (!strong && !el.querySelector("iframe, img, canvas, input:not([type=hidden]), button, [role=button], [role=checkbox]")) continue;
        } catch (e) { continue; }
        var r = null;
        try { r = el.getBoundingClientRect(); } catch (e) {}
        if (capShown(el) && r && r.width >= 20 && r.height >= 10 && r.height <= 700) { if (!shown) shown = el; }
        else if (strong && !box && !later) later = el;   // a service's, that shows itself when you submit
      }
    };
    look(CAPTCHA_SERVICE, true);
    if (!shown) look(CAPTCHA_WORDS, false);
    if (shown) return { invisible: false, solved: false, generic: true, el: shown };
    if (later) return { invisible: true, solved: false, generic: true, el: later };
    return null;
  }
  // the fields a CAPTCHA writes its answer to, in a part of the page (a Turnstile can be told to use another name)
  function captchaFields(root) {
    var out = [];
    try {
      var t = root.querySelectorAll(CAPTCHA_TOKEN);
      for (var i = 0; i < t.length; i++) out.push(t[i]);
      var cf = root.querySelectorAll(".cf-turnstile[data-response-field-name]");
      if (root.matches && root.matches(".cf-turnstile[data-response-field-name]")) cf = [root].concat(Array.prototype.slice.call(cf));
      for (var k = 0; k < cf.length; k++) {
        var nm = String(cf[k].getAttribute("data-response-field-name") || "").replace(/["\\]/g, "");
        if (!nm) continue;
        var f = (root.ownerDocument || root).querySelectorAll('[name="' + nm + '"]');
        for (var j = 0; j < f.length; j++) out.push(f[j]);
      }
    } catch (e) {}
    return out;
  }
  // the CAPTCHA on the application, if there is one: {invisible: only checks you when you submit, solved: its check is
  // done, generic: one whose "done" Kaidostar can't see, el}
  function captchaState(d, scope) {
    var all;
    try { all = d.querySelectorAll(CAPTCHA_WIDGET); } catch (e) { return null; }
    var els = [];
    for (var a = 0; a < (all ? all.length : 0); a++) if (inApplication(all[a], d, scope)) els.push(all[a]);
    if (!els.length) return otherCaptcha(d, scope);
    var visible = null;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var size = String(el.getAttribute("data-size") || "").toLowerCase();
      var src = String(el.getAttribute("src") || "");
      // (a submit button that carries the CAPTCHA itself checks you only when you click it)
      var tag = String(el.tagName || "").toUpperCase();
      var onButton = tag === "BUTTON" || (tag === "INPUT" && /^(?:submit|button|image)$/i.test(String(el.type || "")));
      var hidden = size === "invisible" || /[?&]size=invisible/.test(src) || onButton || !capShown(el);
      if (!hidden && !visible) visible = el;
    }
    // the answer field of the one to do: next to it, else in the application
    var fields = [];
    for (var box = visible, up = 0; box && up < 4 && !fields.length; up++, box = box.parentElement) fields = captchaFields(box);
    if (!fields.length) fields = captchaFields(scope && scope !== d ? scope : d);
    // one whose answer field isn't there to read (told to keep it elsewhere, or not drawn yet): Kaidostar can't see when
    // it's done - it never locks Submit for it (and a form with it is still never submitted on its own)
    if (visible && !fields.length) return { invisible: false, solved: false, generic: true, el: visible };
    var solved = false;
    for (var k = 0; k < fields.length; k++) if (String(fields[k].value || "").trim().length > 20) solved = true;
    return { invisible: !visible, solved: solved, el: visible || els[0] };
  }
  /* @@CAPTCHA_END@@ */

  // Identify the actual application <form> on a page that may hold several forms
  // (a header search box, a newsletter signup, etc.). We score each form by how
  // much it looks like a job application — a résumé file input and a name field
  // are strong signals, an "apply"/"application" submit stronger still — and pick
  // the best. Returns null when nothing looks like an application form - then
  // nothing is filled or submitted (a newsletter or talent-community signup on a
  // careers page must never receive your details or count as an application).
  /* @@FORMLESS_START@@ - some hiring systems render the application without a <form> element. Then the
   * application is the smallest block around the resume upload (or the name field) that also holds an email
   * box and an "apply" / "submit application" button - and no other form inside it. Also here: how a page that
   * is itself a sign-up is recognized, and which button submits an application. Shared word for word with
   * application_submit.py. */
  // the words of a sign-up, a newsletter or a general "send us your CV" form - never one job's application
  var NOT_APPLICATION = /talent (?:community|network|pool)|join our talent|newsletter|subscribe|job alerts?|stay in touch|sign up for|get notified|don'?t see (?:the right|a suitable|a matching|an? open|your)|general application|future (?:opportunities|openings|roles|positions)|share your (?:resume|cv)|keep (?:your resume|you) on file|expression of interest|open application|speculative application|no (?:current )?openings|not (?:quite )?the (?:right )?role/i;
  // ... and the words that, in a page's title or headings, make the whole page a sign-up whatever its buttons say
  // (a job's description may mention "future opportunities"; a job's page is not titled "Join our talent community")
  var SIGNUP_PAGE = /talent (?:community|network|pool)|join our talent|newsletter|job alerts?|general application|open application|speculative application|expression of interest/i;
  // ... and, in the text of a form whose button says "apply", the words that invite you to sign up (an application's
  // own privacy note may say it keeps you "in our talent pool" - that doesn't make it a sign-up)
  var OWN_SIGNUP = /join (?:our|the) talent|(?:sign up|subscribe) (?:for|to) (?:our )?(?:job alerts?|newsletter)|general application|open application|speculative application|expression of interest|don'?t see (?:the right|a suitable|a matching|an? open|your)|share your (?:resume|cv)/i;
  // a block's own words - without its sidebars, menus and footers, or the labels of its tick boxes and choices
  // ("Send me job alerts" is an opt-in on an application, a "Job alerts" sidebar is beside it - neither is what it is)
  function ownText(el) {
    var raw = String((el && (el.innerText || el.textContent)) || "");
    try {
      var cut = function (n) { var x = n ? String(n.innerText || n.textContent || "").trim() : ""; if (x) raw = raw.split(x).join(" "); };
      var side = el.querySelectorAll("aside, nav, footer");
      for (var s = 0; s < side.length && s < 20; s++) cut(side[s]);
      var boxes = el.querySelectorAll("input[type=checkbox], input[type=radio]");
      for (var i = 0; i < boxes.length && i < 60; i++) {
        cut(boxes[i].closest("label") || (boxes[i].id ? el.querySelector('label[for="' + String(boxes[i].id).replace(/["\\]/g, "\\$&") + '"]') : null));
      }
    } catch (e) {}
    return raw.replace(/[\u2019\u2018]/g, "'").slice(0, 6000);
  }
  // the words of the section a form sits in (its container - not the whole page): "Don't see the right role? Send us
  // your CV" just above an "Apply" button makes that form a general one
  function sectionText(el) {
    var pe = el && el.parentElement;
    if (!pe || /^(?:BODY|MAIN|HTML)$/.test(pe.tagName)) return "";
    return ownText(pe);
  }
  // the page's title and main headings, and the heading of the section the form sits in (the last heading before
  // it, when that heading's own container holds the form - never a sidebar's or a footer's)
  function pageHeads(docu, el) {
    var t = String((docu && docu.title) || ""), last = null;
    try {
      var hs = docu.querySelectorAll("h1, h2, h3, [role=heading]");
      for (var i = 0; i < hs.length && i < 80; i++) {
        var h = hs[i];
        if (h.tagName === "H1") t += " | " + String(h.innerText || h.textContent || "").slice(0, 200);
        if (el && !el.contains(h) && (h.compareDocumentPosition(el) & 4) && !h.closest("aside, nav, footer")) last = h;
      }
      if (last && last.parentElement && last.parentElement.contains(el)) t += " | " + String(last.innerText || last.textContent || "").slice(0, 200);
    } catch (e) {}
    return t.replace(/[\u2019\u2018]/g, "'");
  }
  // the job you chose is itself a general application or a talent community: then that form is the one you want
  function generalJob(jobTitle) { var t = String(jobTitle || ""); return SIGNUP_PAGE.test(t) || OWN_SIGNUP.test(t); }
  function signUpPage(docu, el, jobTitle) {
    if (generalJob(jobTitle)) return false;
    return SIGNUP_PAGE.test(pageHeads(docu, el));
  }
  // does the page name this job? (most of its title's words appear on it - true when there's no title to check)
  var TITLE_STOP = { the: 1, and: 1, for: 1, with: 1, senior: 1, junior: 1, lead: 1, remote: 1, hybrid: 1, onsite: 1, level: 1, new: 1, grad: 1,
    full: 1, part: 1, time: 1, contract: 1, temporary: 1, temp: 1, entry: 1, associate: 1, staff: 1, principal: 1, sr: 1, jr: 1 };
  function titleWords(t) {
    return String(t || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").split(/[^a-z0-9+#]+/).filter(function (w) { return w.length >= 3 && !TITLE_STOP[w]; });
  }
  function titleSeen(docu, title) {
    var words = titleWords(title);
    if (!words.length) return true;
    var text = (String((docu && docu.title) || "") + " " + String((docu && docu.body && (docu.body.innerText || docu.body.textContent)) || "")).toLowerCase().slice(0, 30000);
    var hits = words.filter(function (w) { return new RegExp("(?:^|[^a-z0-9])" + w.replace(/[+#]/g, "\\$&") + "(?:[^a-z0-9]|$)").test(text); }).length;
    return hits >= Math.max(1, Math.ceil(words.length * 0.6));
  }
  var APP_NAME_SEL = "input[name*=first i], input[name*='full_name' i], input[name*='full-name' i], input[name*=fullname i], input[name='name'], input[autocomplete='name'], input[autocomplete='given-name']";
  var APP_EMAIL_SEL = "input[type=email], input[name*=email i], input[autocomplete='email']";
  function formlessApplication(docu, jobTitle) {
    try {
      var inputs = docu.querySelectorAll("input[type=file], " + APP_NAME_SEL);
      var anchor = null;
      for (var i = 0; i < inputs.length && !anchor; i++) if (!inputs[i].closest("form")) anchor = inputs[i];
      if (!anchor) return null;
      var el = anchor.parentElement;
      for (var k = 0; k < 12 && el && el !== docu.documentElement; k++, el = el.parentElement) {
        if (el.querySelector("form")) return null;   // a block that holds another form is the page, not the application
        if (!el.querySelector(APP_EMAIL_SEL)) continue;
        if (!(el.querySelector("input[type=file]") || el.querySelector(APP_NAME_SEL))) continue;
        var btns = el.querySelectorAll("button, input[type=submit], [role=button]");
        for (var j = 0; j < btns.length; j++) {
          var t = ((btns[j].innerText || btns[j].value || btns[j].textContent || "") + "").toLowerCase();
          // "Apply to join our talent community" isn't a job's application
          if (t.indexOf("appl") !== -1) {
            var own = ownText(el);
            if (!generalJob(jobTitle) && (OWN_SIGNUP.test(own) || OWN_SIGNUP.test(sectionText(el)) || signUpPage(docu, el, jobTitle))) return null;
            // a general "send us your CV" block counts only on a page that names the job
            return (jobTitle && NOT_APPLICATION.test(own) && !titleSeen(docu, jobTitle)) ? null : el;
          }
        }
      }
    } catch (e) {}
    return null;
  }
  // The button that sends the application: one that says submit / apply / send / finish - never "Save for
  // later", "Back", "Next", "Apply with LinkedIn" and the like (a saved draft is not an application sent, and a
  // multi-step form's "Next" is not its last step). The form's own submit button comes first.
  var SUBMIT_WORDS = /^(?:submit|apply|send|finish|complete)\b|\bsubmit\b/i;
  var SUBMIT_SKIP = /\b(?:save|saved|draft|later|back|previous|prev|cancel|reset|clear|preview|upload|attach|add|remove|delete|search|sign ?in|log ?in|login|next|continue|edit|print|share|subscribe|join|alerts?|notify|linkedin|indeed|google|facebook|github|dropbox|drive|seek|xing|autofill|auto-fill|manual|manually|import)\b/i;
  function shownEl(el) {
    try {
      if (!el || el.getClientRects().length === 0) return false;
      var cs = (el.ownerDocument.defaultView || window).getComputedStyle(el);
      return !(cs && (cs.visibility === "hidden" || cs.visibility === "collapse"));
    } catch (e) { return true; }
  }
  function pickSubmit(scope) {
    var els, later = null;
    try { els = scope.querySelectorAll("button, input[type=submit], input[type=button], [role=button]"); } catch (e) { return null; }
    for (var i = 0; i < els.length; i++) {
      var b = els[i];
      if (b.disabled || !shownEl(b)) continue;
      var t = String(b.innerText || b.value || b.textContent || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      if (!t || t.length > 60 || !SUBMIT_WORDS.test(t) || SUBMIT_SKIP.test(t)) continue;
      if (String(b.type || "").toLowerCase() === "submit") return b;
      if (!later) later = b;
    }
    return later;
  }
  /* @@FORMLESS_END@@ */
  // the page holds a sign-up (a talent community, a newsletter, a general application) rather than this job's
  // application - said plainly when no application form is found
  function signUpHere(d) {
    try {
      if (signUpPage(d, null, JOB_TITLE)) return true;
      var forms = d.querySelectorAll("form");
      for (var i = 0; i < forms.length; i++) {
        var f = forms[i];
        if (NOT_APPLICATION.test(ownText(f)) || signUpPage(d, f, JOB_TITLE)) return true;
        // a "Join" / "Subscribe" form among a talent community's words ("No openings that fit? Join our talent community")
        var sub = pickSubmit(f) || f.querySelector("button[type=submit], input[type=submit], button");
        var st = sub ? String(sub.innerText || sub.value || "").replace(/\s+/g, " ").trim() : "";
        if (NOT_APPLICATION_BTN.test(st) && NOT_APPLICATION.test(formContext(f, d).replace(/[’‘]/g, "'"))) return true;
      }
    } catch (e) {}
    return false;
  }
  function applicationForm(d) {
    var docu = (d && d.querySelectorAll) ? d : (d && d.ownerDocument) || d;
    var forms;
    try { forms = docu.querySelectorAll("form"); } catch (e) { return null; }
    if (!forms || !forms.length) return formlessApplication(docu, JOB_TITLE);
    var best = null, bestScore = 1; // require a minimal signal (>1) to claim a form
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i], s = 0;
      try {
        var hasFile = !!f.querySelector("input[type=file]");
        var hasName = !!f.querySelector("input[name*=first i], input[name*='full_name' i], input[name*='full-name' i], input[name*=fullname i], input[name='name'], input[autocomplete='name'], input[autocomplete='given-name']");
        var hasEmail = !!f.querySelector("input[type=email], input[name*=email i], input[autocomplete='email']");
        var hasPhone = !!f.querySelector("input[type=tel], input[name*=phone i]");
        // the words of the button that would send it (never "Attach" or "Save for later"), else its first button
        var sub = pickSubmit(f) || f.querySelector("button[type=submit], input[type=submit], button");
        var st = sub ? ((sub.innerText || sub.value || "") + "").toLowerCase() : "";
        var applyBtn = st.indexOf("appl") !== -1; // "apply" / "application"
        s = (hasFile ? 3 : 0) + (hasName ? 2 : 0) + (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0) + (applyBtn ? 2 : 0);
        // an application asks for a resume or who you are - an email box alone is a newsletter or a contact form
        if (!(hasFile || (hasName && hasEmail) || applyBtn)) continue;
        // a form that says it's a sign-up or a general application isn't this job's - nor is one on a page whose title
        // or heading says so ("Join our talent community"). With an "apply" button only words that invite you to sign
        // up count (an application's privacy note may mention "future positions" or "our talent pool")
        if (!generalJob(JOB_TITLE) && ((applyBtn ? OWN_SIGNUP : NOT_APPLICATION).test(ownText(f)) || (applyBtn && OWN_SIGNUP.test(sectionText(f))) || signUpPage(docu, f, JOB_TITLE))) continue;
        // ... and an "apply" form among a general application's words ("Don't see the right role? Send us your CV")
        // counts only on a page that names the job
        if (applyBtn && JOB_TITLE && (NOT_APPLICATION.test(ownText(f)) || NOT_APPLICATION.test(formContext(f, docu))) && !titleSeen(docu, JOB_TITLE)) continue;
        // ... nor one in such a section, unless its own button says "apply"
        if (!applyBtn && (NOT_APPLICATION_BTN.test(st.trim()) || NOT_APPLICATION.test(formContext(f, docu).replace(/[\u2019\u2018]/g, "'")))) continue;
        // ... and a form whose button doesn't say "apply" is this job's application only if the page names the job
        if (!applyBtn && JOB_TITLE && !titleSeen(docu, JOB_TITLE)) continue;
      } catch (e) { continue; }
      if (s > bestScore) { bestScore = s; best = f; }
    }
    return best || formlessApplication(docu, JOB_TITLE);
  }

  // The anti-garbage guard. Returns null if every required control is safely
  // satisfied, else a reason string. Mirrors application_submit.py exactly.
  // Scoped to the application form when one is identifiable, so a required field
  // in an unrelated form (a newsletter's email, say) can't block a real submit.
  function requiredUnsatisfiedReason(d, scope) {
    scope = scope || applicationForm(d);
    if (!scope) return "Kaidostar couldn't identify the application form on this page";
    var controls;
    try {
      controls = scope.querySelectorAll(
        "input[required]:not([type=hidden]):not([type=submit]):not([type=button]), textarea[required], select[required], [aria-required='true']"
      );
    } catch (e) { return "couldn't read the form's required fields"; }
    for (var i = 0; i < controls.length; i++) {
      var c = controls[i];
      try {
        if (!isVisible(c)) continue;
        var tag = (c.tagName || "").toUpperCase();
        if (tag === "SELECT") {
          // A required dropdown is high-stakes (sponsorship, work auth, EEO) and
          // always has a default option — we never guess it. It counts as answered
          // only when Kaidostar set it from YOUR answer bank (marked when filled);
          // anything else, the user answers.
          if (c.getAttribute("data-kaido-answered") === "1" && !qaEmptySelect(c)) continue;
          return "a required dropdown needs your answer";
        }
        var type = (c.getAttribute("type") || "").toLowerCase();
        if (type === "radio") {
          // one choice in a required group is enough (the other options stay unchecked)
          var grp = c.name ? scope.querySelectorAll('input[type=radio][name="' + qaAttr(c.name) + '"]') : [c];
          if (!Array.prototype.some.call(grp, function (r) { return r.checked; })) return "a required choice needs your answer";
          continue;
        }
        if (type === "checkbox") {
          if (!c.checked) return "a required option/consent box needs your choice";
          continue;
        }
        if (type === "file") {
          if (!c.files || c.files.length === 0) return "a required file upload is missing";
          continue;
        }
        if (!String(c.value || "").trim()) return "a required field couldn't be filled automatically";
      } catch (e) { return "couldn't verify a required field"; }
    }
    return null;
  }

  function confirmationTextPresent(d) {
    var body = (d.body && d.body.innerText ? d.body.innerText : "").toLowerCase();
    for (var i = 0; i < CONFIRM_MARKERS.length; i++) if (body.indexOf(CONFIRM_MARKERS[i]) !== -1) return true;
    return false;
  }

  // The confirmation words actually on the page after a submit - kept as proof of what was seen.
  // the confirming words as the page wrote them: the line holding the first confirmation phrase
  // (just the phrase when that line is long) - kept as proof of the submission
  function confirmationPhrase(d) {
    var body = (d.body && d.body.innerText) ? String(d.body.innerText) : "";
    for (var i = 0; i < CONFIRM_MARKERS.length; i++) {
      var m = CONFIRM_MARKERS[i];
      var hit = new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").exec(body);
      if (!hit) continue;
      var start = body.lastIndexOf("\n", hit.index) + 1, end = body.indexOf("\n", hit.index);
      var line = body.slice(start, end === -1 ? body.length : end).trim();
      return (line.length <= 160 ? line : hit[0]).slice(0, 200);
    }
    return "";
  }

  function looksConfirmed(ctx, preUrl, preText) {
    try {
      var d = doc(ctx);
      var win = d.defaultView || (typeof window !== "undefined" ? window : ctx);
      var postUrl = (win && win.location && win.location.href) || "";
      if (postUrl !== preUrl) {
        var lu = postUrl.toLowerCase();
        for (var i = 0; i < CONFIRM_URL_MARKERS.length; i++) if (lu.indexOf(CONFIRM_URL_MARKERS[i]) !== -1) return true;
      }
      if (confirmationTextPresent(d) && !preText) return true;
      return false;
    } catch (e) { return false; }
  }

  function attachResume(scope, file) {
    try {
      var input = scope.querySelector("input[type=file]");
      if (!input || !file) return false;
      // scope may be a <form> element or the document — derive the window from
      // whichever, so the page's own DataTransfer constructor is used.
      var docu = scope.ownerDocument || scope;
      var win = (docu && docu.defaultView) || window;
      var dt = new win.DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      try { input.setAttribute("data-kaido-filled", "1"); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  // Scoped to the application form when identifiable, so we click that form's
  // submit rather than a search/newsletter button that happens to come first -
  // and only a button that says it submits (pickSubmit: never "Save for later").
  function findSubmit(d, scope) {
    scope = scope || applicationForm(d);
    if (!scope) return null;   // never a submit button outside the application form
    return pickSubmit(scope);
  }

  /* Fill everything we safely can. Returns:
   *   { filled: {...}, blocker: reason|null, requiredMissing: reason|null,
   *     canAutoSubmit: bool, submitFound: bool }
   * It does NOT click submit. */
  function autofill(ctx, candidate, resumeFile) {
    var d = doc(ctx);
    candidate = candidate || {};

    // Operate only within the application form, so on a page with several forms we
    // never fill a decoy's field or submit the wrong form. No application form:
    // nothing is filled, and the caller tells the person.
    var scope = applicationForm(d);
    var bk = blockerKind(d, scope);
    if (bk) return { blocker: bk.why, blockerKind: bk.kind, canAutoSubmit: false, submitFound: false, filled: {} };
    if (!scope) return { blocker: null, noForm: true, canAutoSubmit: false, submitFound: false, filled: {}, requiredMissing: "Kaidostar couldn't identify the application form on this page" };

    var filled = {};
    filled.email = fillFirst(scope, [
      "input[type=email]", "input[name*=email i]", "input[id*=email i]",
      "input[placeholder*=email i]", "input[aria-label*=email i]",
      "input[name='job_application[email]']", "input[autocomplete='email']"
    ], candidate.email);

    var fullName = candidate.full_name || [candidate.first_name, candidate.last_name].filter(Boolean).join(" ").trim();
    var filledFull = fillFirst(scope, [
      "input[name*='full_name' i]", "input[name*='full-name' i]", "input[name*='full name' i]", "input[name*=fullname i]",
      "input[id*='full_name' i]", "input[id*=fullname i]",
      "input[placeholder*='full name' i]", "input[aria-label*='full name' i]",
      "input[autocomplete='name']", "input[name='name']", "input[id='name']",
      "input[name*='your_name' i]", "input[name*=applicant i]"
    ], fullName);
    filled.name = filledFull;
    if (!filledFull) {
      filled.first = fillFirst(scope, [
        "input[name='job_application[first_name]']", "input[autocomplete='given-name']",
        "input[name*=first i]", "input[id*=first i]", "input[placeholder*='first name' i]", "input[aria-label*='first name' i]"
      ], candidate.first_name);
      filled.last = fillFirst(scope, [
        "input[name='job_application[last_name]']", "input[autocomplete='family-name']",
        "input[name*=last i]", "input[id*=last i]", "input[placeholder*='last name' i]", "input[aria-label*='last name' i]"
      ], candidate.last_name);
    }
    filled.phone = fillFirst(scope, [
      "input[type=tel]", "input[name='job_application[phone]']", "input[autocomplete='tel']",
      "input[name*=phone i]", "input[id*=phone i]", "input[placeholder*=phone i]", "input[aria-label*=phone i]"
    ], candidate.phone);
    if (candidate.cover_letter) {
      filled.cover = fillFirst(scope, [
        "textarea[name*=cover i]", "textarea[id*=cover i]", "textarea[name*=message i]", "textarea[name*=letter i]",
        "textarea[placeholder*='cover letter' i]", "textarea[aria-label*='cover letter' i]",
        "textarea[name='job_application[cover_letter_text]']"
        // (never "any textarea": an essay question must not receive the cover letter - it's left for you)
      ], candidate.cover_letter);
    }
    if (resumeFile) filled.resume = attachResume(scope, resumeFile);

    var requiredMissing = requiredUnsatisfiedReason(d, scope);
    var submitEl = findSubmit(d, scope);
    // a CAPTCHA, or a password the form asks for: the person's step - and then the click is theirs too
    var captcha = captchaState(d, scope);
    var account = !!visiblePassword(scope);
    return {
      blocker: null,
      filled: filled,
      requiredMissing: requiredMissing,
      submitFound: !!submitEl,
      captcha: captcha,
      account: account,
      // Auto-submit is only safe when nothing required is unfillable AND there is
      // a submit control - and never on a form that checks a person is applying, or makes an account.
      canAutoSubmit: !requiredMissing && !!submitEl && !captcha && !account
    };
  }

  var api = {
    autofill: autofill,
    detectBlockers: detectBlockers,
    blockerKind: blockerKind,
    captchaState: captchaState,
    accountStep: function (scope) { return !!visiblePassword(scope || doc()); },
    titleSeen: titleSeen,
    jobTitle: function () { return JOB_TITLE; },
    pageJob: pageJob,
    requiredUnsatisfiedReason: requiredUnsatisfiedReason,
    looksConfirmed: looksConfirmed,
    confirmationTextPresent: confirmationTextPresent,
    findSubmit: findSubmit,
    // a button that doesn't send an application: "Save for later", "Back", "Next", "Apply with LinkedIn"...
    skipButton: function (b) {
      var t = "";
      try { t = String(b.innerText || b.value || b.textContent || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim(); } catch (e) {}
      return !!t && SUBMIT_SKIP.test(t);
    },
    // ... and one whose words say it sends it ("Submit application", "Apply", "Send")
    saysSubmit: function (b) {
      var t = "";
      try { t = String(b.innerText || b.value || b.textContent || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim(); } catch (e) {}
      return !!t && t.length <= 60 && SUBMIT_WORDS.test(t) && !SUBMIT_SKIP.test(t);
    },
    attachResume: attachResume,
    applicationForm: applicationForm,
    setJobTitle: setJobTitle,
    onAts: onAts,
    onBoard: onBoard,
    signUpHere: signUpHere,
    collectQuestions: collectQuestions,
    applyAnswers: applyAnswers,
    currentAnswer: qaCurrent,
    confirmationPhrase: confirmationPhrase,
    _setValue: setValue
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KaidostarFill = api;
})(typeof window !== "undefined" ? window : this);
