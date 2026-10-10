/* Kaidostar Apply — content script (runs in the apply page, injected on demand).
 *
 * Receives the applicant data from the background worker, fills the form with the
 * shared, safety-first engine (window.KaidostarFill from form_fill.js), answers the
 * form's other questions ONLY from the person's own answer bank (the server
 * resolves each question and refuses to guess), and shows an in-page review panel.
 *
 * The steps that are only ever the person's, Kaidostar never does - and never tries
 * to get round: signing in or creating an account, a site's check that a real person
 * is visiting, a CAPTCHA, a password. It waits for them instead:
 *   - a sign-in wall, a browser check, or no application form yet ("click Apply
 *     first"): it waits; when the application form appears - on this page, or on the
 *     next one the site opens (the background worker brings it back there) - it
 *     carries on, checking first that the form is this job's;
 *   - a CAPTCHA or a password on the application: it fills everything else, and the
 *     person does that step and makes the final click (never a countdown there).
 * It submits ONLY:
 *   - never on a job board's own form (those sites forbid automated applying);
 *   - never when a required field can't be filled honestly (a question the answer
 *     bank doesn't cover, a consent checkbox, a missing résumé → we stop and say so),
 *     nor with an answer the form picked by itself that the person never gave;
 *   - otherwise, either on the user's explicit click, or — if they turned on
 *     "submit automatically" AND the form is on an employer's hiring system AND it
 *     is safely fillable — after a visible countdown with a Cancel button.
 * Right before it clicks submit it tells Kaidostar, so a result it never sees (the
 * page moved on, the tab closed) is remembered as "may have gone through" and never
 * opened for a second go - and when the person submits the form themselves (its own
 * button), that is noted and confirmed the same way. After submitting it verifies a
 * real change (a confirmation page or message that wasn't there before) - on this
 * page, or on the page the form moved to (the background worker reads that one) -
 * before reporting success, and sends that proof (the page, the confirming words, the
 * answers given) to Kaidostar. It never claims a submission it can't confirm.
 * Answers the person gives on the page to questions Kaidostar left can be saved to
 * their answer bank - only when they ask, for those same questions.
 *
 * Autopilot (the extension applying on its own, in a window of its own): the same rules, with no countdown waiting on
 * anyone's click - it submits only when every one of them passes, on an employer's hiring system. Where the application
 * form is behind the posting's own "Apply" link, it follows that link (only on the same employer's site). Anything that
 * needs the person - a question the answer bank doesn't cover, a CAPTCHA, a sign-in, a company's own site - it reports,
 * with the reason, and the background worker leaves it on the Auto page. The moment the person clicks or types in the
 * page, the application is theirs: nothing more happens there on its own. */
(function () {
  "use strict";
  if (window.__kaidostarContentActive) return;
  window.__kaidostarContentActive = true;

  var K = window.KaidostarFill;
  var IS_TOP = (function () { try { return window.top === window; } catch (e) { return false; } })();
  var formFoundElsewhere = false;   // another frame on this page holds the application form
  var WAIT_MS = 30 * 60 * 1000;     // how long a page waits for you (a sign-in, a check, an "Apply" click) - as the background worker

  // Only a frame that holds the application form acts on it - never a newsletter or
  // talent-community signup elsewhere on the page.
  function hasApplicationForm() {
    try { return !!(K && K.applicationForm && K.applicationForm(document)); } catch (e) { return false; }
  }
  if (IS_TOP) {
    window.addEventListener("message", function (e) {
      if (e && e.data && e.data.kaidostar === "form-found") {
        formFoundElsewhere = true;
        // a frame on this page has the application now: it shows the panel there
        if (state.waiting) stopWaiting(true);
      }
    });
  }
  function announceForm() {
    if (IS_TOP) return;
    try { window.top.postMessage({ kaidostar: "form-found" }, "*"); } catch (e) {}
  }

  function fileFromResume(resume) {
    if (!resume || !resume.b64) return null;
    try {
      var bin = atob(resume.b64);
      var len = bin.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      return new File([bytes], resume.name || "resume.docx",
        { type: resume.type || "application/octet-stream" });
    } catch (e) { return null; }
  }

  function send(msg) {
    return new Promise(function (res) {
      try { chrome.runtime.sendMessage(msg, function (r) { res(r || null); }); } catch (e) { res(null); }
    });
  }

  // ---- Review panel (shadow DOM so the page's CSS can't distort it) ----
  var host, root;
  function ensureBanner() {
    // Reuse the existing panel only if it's still attached. An SPA that confirms
    // by replacing document.body detaches our host, so a stale `host` reference
    // would render the success/failure message into an off-DOM node the user never
    // sees. If it's been detached, rebuild and re-append it to the current body.
    if (host && host.isConnected) return root;
    host = document.createElement("div");
    host.id = "kaidostar-apply-banner-host";
    host.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;";
    (document.body || document.documentElement).appendChild(host);
    root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var style = document.createElement("style");
    style.textContent =
      ".card{font:14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
      "width:350px;max-width:88vw;max-height:84vh;overflow:auto;background:#0f1115;color:#eef1f6;border:1px solid #2a2f3a;" +
      "border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.45)}" +
      ".hd{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#151925;border-bottom:1px solid #232838;position:sticky;top:0}" +
      ".dot{width:9px;height:9px;border-radius:50%;background:#5b8cff;flex:0 0 auto}" +
      ".ttl{font-weight:600;font-size:13px;letter-spacing:.2px}" +
      ".x{margin-left:auto;cursor:pointer;color:#8b93a7;font-size:18px;line-height:1;background:none;border:0}" +
      ".bd{padding:12px 14px}" +
      ".sub{color:#aab2c5;font-size:12px;margin:0 0 8px}" +
      ".rows{margin:6px 0 10px;display:flex;flex-direction:column;gap:3px}" +
      ".row{display:flex;gap:8px;font-size:12.5px}" +
      ".ok{color:#57d9a3}.no{color:#8b93a7}" +
      ".k{color:#8b93a7;min-width:74px}.v{color:#dfe4ee;word-break:break-word}" +
      ".warn{background:#2a2410;border:1px solid #5c4a12;color:#f2c94c;padding:8px 10px;border-radius:9px;font-size:12.5px;margin:8px 0}" +
      ".stop{background:#2a1416;border:1px solid #5c1e22;color:#ff8a8a;padding:8px 10px;border-radius:9px;font-size:12.5px;margin:8px 0}" +
      ".good{background:#12251c;border:1px solid #1d5c3f;color:#57d9a3;padding:8px 10px;border-radius:9px;font-size:12.5px;margin:8px 0}" +
      ".info{background:#12203a;border:1px solid #1d3a6c;color:#9dc0ff;padding:8px 10px;border-radius:9px;font-size:12.5px;margin:8px 0}" +
      ".step{background:#1f1630;border:1px solid #4b3477;color:#d6c2ff;padding:8px 10px;border-radius:9px;font-size:12.5px;margin:8px 0}" +
      ".list{margin:4px 0 0 16px;padding:0;font-size:12px;color:#cdd4e3}" +
      ".btns{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}" +
      "button.act{flex:1;cursor:pointer;border:0;border-radius:9px;padding:9px 12px;font-weight:600;font-size:13px}" +
      ".primary{background:#5b8cff;color:#fff}.primary[disabled]{background:#2c3550;color:#7f88a3;cursor:not-allowed}" +
      ".ghost{background:#1b2130;color:#cdd4e3;border:1px solid #2a3040}" +
      ".count{font-variant-numeric:tabular-nums;font-weight:700}";
    root.appendChild(style);
    var card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      '<div class="hd"><span class="dot"></span><span class="ttl">Kaidostar Apply</span>' +
      '<button class="x" title="Dismiss">×</button></div><div class="bd"></div>';
    root.appendChild(card);
    root._body = card.querySelector(".bd");
    card.querySelector(".x").addEventListener("click", dismiss);
    return root;
  }
  // × : the panel goes - and with it a countdown (nothing is then submitted on its own) and a wait for you (Kaidostar
  // stops here). What you do on the page yourself is still noted: a submit of yours, and its confirmation, come back.
  function dismiss() {
    state.dismissed = true;
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
    state.autoWanted = false;
    if (state.waiting || state.pendingConfirm) { state.waiting = null; state.pendingConfirm = null; finished(); }
    try { if (host) host.remove(); } catch (e) {}
    host = null; root = null;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function filledRows(data, res) {
    var f = res.filled || {};
    var items = [];
    var nameShown = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ");
    items.push(["Name", (f.name || f.first || f.last) ? nameShown : "", (f.name || f.first || f.last)]);
    items.push(["Email", f.email ? data.email : "", f.email]);
    items.push(["Phone", f.phone ? data.phone : "", f.phone]);
    if (data.cover_letter) items.push(["Cover letter", f.cover ? "added" : "", f.cover]);
    items.push(["Résumé", f.resume ? "attached" : "", f.resume]);
    if (state.qa && state.qa.asked) {
      items.push(["Questions", state.qa.filled + " of " + state.qa.asked + " answered from your answer bank" +
        (state.qa.read ? " (" + state.qa.read + " of them read by AI from the question’s own words, checked twice)" : ""), state.qa.filled > 0]);
    }
    var html = '<div class="rows">';
    for (var i = 0; i < items.length; i++) {
      var label = items[i][0], val = items[i][1], ok = items[i][2];
      if (!ok && (label === "Cover letter")) continue;
      html += '<div class="row"><span class="k">' + esc(label) + '</span>' +
        '<span class="v ' + (ok ? "ok" : "no") + '">' +
        (ok ? esc(val || "✓") : (label === "Questions" ? esc(val) : "— not on this form")) + "</span></div>";
    }
    return html + "</div>";
  }

  var state = { applicationId: null, data: null, res: null, submitting: false, countdownTimer: null, started: false, qa: null, scope: null,
    coverBusy: false, done: false, payload: null, attempt: null, verifying: false, unconfirmed: false, notSentBusy: false, movedOn: false,
    waiting: null, waitTimer: null, waitSince: 0, captcha: null, captchaTimer: null, account: false, learnBusy: false, learned: 0, learnError: "",
    clickPending: false, personSubmitted: false, clicking: false, framesBefore: null, handedBack: false, sent: false, dismissed: false,
    attempted: false, lastActAt: 0, lastActEl: null, lastActKey: "", sentBy: null, waitUntil: 0, confirmTimer: null, preText: false, noted: false,
    apHanded: false, apReported: false, apTriedLink: false, apFollowing: false, apNote: "" };
  // what you've answered or changed on the page yourself (a real key or click - never a script): Kaidostar never
  // overwrites it with an answer that arrives afterwards
  var touchedEls = (typeof WeakSet !== "undefined") ? new WeakSet() : null;
  function markTouched(e) { try { if (e && e.isTrusted && e.target && touchedEls) touchedEls.add(e.target); } catch (er) {} }
  document.addEventListener("input", markTouched, true);
  document.addEventListener("change", markTouched, true);
  function touchedRef(ref) {
    if (!touchedEls || !ref) return false;
    try { return Array.isArray(ref) ? ref.some(function (r) { return touchedEls.has(r); }) : touchedEls.has(ref); } catch (e) { return false; }
  }

  // ---- Autopilot ----
  // applying on its own here (not once you've taken it over)
  function autopilotOn() { return !!(state.payload && state.payload.autopilot) && !state.apHanded; }
  // how this page's go ended, told once: the background worker tells Kaidostar and moves on to the next one
  function autopilotEnd(outcome, reason, step, keep) {
    if (!autopilotOn() || state.apReported) return;
    state.apReported = true;
    send({ type: "KAIDOSTAR_AUTOPILOT", applicationId: state.applicationId || (state.payload && state.payload.applicationId), outcome: outcome,
      reason: String(reason || "").slice(0, 300), step: step || "", keep: !!keep });
  }
  // A CAPTCHA service the page loads, or one drawn inside a component (a shadow root), that the form's own check doesn't
  // see - one that checks you only as the form is sent: under Autopilot, the click is then yours.
  var CAPTCHA_SCRIPT = /recaptcha|hcaptcha|turnstile|challenges\.cloudflare\.com|arkoselabs|funcaptcha|geetest|mtcaptcha|friendlycaptcha|altcha|captcha/i;
  var CAPTCHA_IN_SHADOW = ".g-recaptcha, .h-captcha, .cf-turnstile, [data-sitekey], iframe[src*=captcha i], iframe[src*='challenges.cloudflare.com'], iframe[src*='arkoselabs']";
  function apCaptchaHint() {
    try {
      var ss = document.querySelectorAll("script[src]");
      for (var i = 0; i < ss.length && i < 400; i++) if (CAPTCHA_SCRIPT.test(String(ss[i].getAttribute("src") || ""))) return true;
      var all = document.querySelectorAll("*");
      for (var k = 0; k < all.length && k < 4000; k++) {
        var sr = all[k].shadowRoot;
        if (sr && sr.querySelector && sr.querySelector(CAPTCHA_IN_SHADOW)) return true;
      }
    } catch (e) {}
    return false;
  }
  // why Autopilot didn't submit this one, in words for the Auto page - and the kind of step it is
  function apWhy() {
    var res = state.res || {}, why = [], step = "";
    var add = function (t, k) { why.push(t); if (!step) step = k; };
    var open = openQuestions();
    var pl = state.payload || {};
    if (pl.resumed && pl.waitKind && pl.waitKind !== "apply") {
      add("it reached this form after a step only you can do (a sign-in, or the site checking that a real person is visiting), so the final click is yours", "site");
    }
    if (!state.captcha && apCaptchaHint()) {
      add("the page loads a CAPTCHA that checks a real person is applying when the form is sent, so the final click is yours", "captcha");
    }
    if (state.captcha) {
      add(state.captcha.invisible ? "the site checks that a real person is applying when the form is sent (an invisible CAPTCHA), so the final click is yours"
        : "the form has a check that a real person is applying (a CAPTCHA) - only you can do it", "captcha");
    }
    if (state.account) add("the form also creates an account with the employer, with a password only you choose", "account");
    if (open.length) {
      add("your answer bank doesn’t cover " + (open.length === 1 ? "this required question: " : open.length + " required questions: ") +
        open.slice(0, 4).map(function (m) { return "“" + String(m.label || "a question").slice(0, 90) + "”"; }).join(", ") + (open.length > 4 ? "…" : ""), "question");
    } else if (res.requiredMissing) add(res.requiredMissing, "question");
    if (!state.ats) add("the form is on the company’s own site, where the final click is always yours", "site");
    if (!why.length && !res.submitFound) add("it found no submit button - the form may have more steps", "page");
    if (!why.length) add("the form needs you", "page");
    return [why.join("; "), step];
  }
  // it's yours now (you clicked or typed here - or Autopilot stopped): nothing more happens on its own on this page,
  // and what this page passes on says so
  function apHandOver(stopped) {
    if (!state.payload || !state.payload.autopilot || state.apHanded) return;
    state.apHanded = true;
    state.payload.autopilot = false; state.payload.autoSubmit = false; state.payload.handed = true;
    state.autoWanted = false;
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
    state.apNote = stopped ? "Autopilot stopped here, so it won’t submit this on its own."
      : "You took this one over, so Autopilot won’t submit it on its own - it’s yours to finish (or close the tab).";
    if (state.started && state.res && !state.done && !state.submitting && !state.verifying && !state.unconfirmed && !state.waiting && !state.pendingConfirm) render("review");
  }
  // a real click, or a key (not a lone Shift or Ctrl), anywhere in the page: you're here
  function personHere(e) {
    if (!e || !e.isTrusted || !state.payload || !state.payload.autopilot || state.apHanded) return;
    if (e.type === "keydown" && /^(?:Control|Shift|Alt|Meta|AltGraph|CapsLock|OS)$/.test(String(e.key || ""))) return;
    var id = state.payload.applicationId;
    apHandOver(false);
    send({ type: "KAIDOSTAR_AP_HANDED", applicationId: id });
  }
  document.addEventListener("pointerdown", personHere, true);
  document.addEventListener("keydown", personHere, true);
  // The posting's own "Apply" link, when the application form is on the next page: a plain link whose words just say
  // apply ("Apply", "Apply now", "Apply for this job", "I'm interested") - never "Apply with LinkedIn" or "Apply on the
  // company's site"; the background worker checks that it stays on the employer's own site or hiring system.
  var APPLY_LINK = /^(?:apply|apply now|apply here|apply today|apply online|apply for (?:this|the) (?:job|position|role|opening|vacancy|opportunity)|apply to (?:this|the) (?:job|position|role)|start (?:your |my |an |the )?application|begin (?:your |the )?application|i ?a?m interested)$/;
  function applyLink() {
    var links;
    try { links = document.querySelectorAll("a[href]"); } catch (e) { return ""; }
    var here = String(location.href).split("#")[0];
    for (var i = 0; i < links.length && i < 600; i++) {
      var a = links[i];
      var words = plainWords(a.innerText || a.textContent || "") || plainWords(a.getAttribute("aria-label") || a.getAttribute("title") || "");
      if (!APPLY_LINK.test(words)) continue;
      try {
        var r = a.getBoundingClientRect(), cs = getComputedStyle(a);
        if (r.width < 4 || r.height < 4 || cs.visibility === "hidden" || cs.display === "none") continue;
      } catch (e) { continue; }
      var u = null;
      try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { continue; }
      if (!/^https?:$/.test(u.protocol) || u.href.split("#")[0] === here) continue;
      return u.href;
    }
    return "";
  }
  function apTryLink(payload) {
    if (state.apTriedLink || !autopilotOn()) return;
    state.apTriedLink = true;
    var href = applyLink();
    if (!href) return;
    state.apFollowing = true;
    send({ type: "KAIDOSTAR_AP_FOLLOW", applicationId: payload.applicationId, url: href }).then(function (r) {
      if (r && r.ok && autopilotOn()) {
        try { location.assign(href); } catch (e) { state.apFollowing = false; return; }
        setTimeout(function () { state.apFollowing = false; }, 15000);   // (a page that never went: the wait carries on)
      } else {
        state.apFollowing = false;
      }
    });
  }
  // While Autopilot waits on a page: a sign-in, and a site's check that a real person is visiting, are yours (said at
  // once - it never waits one out); a page with no application form gets 12 seconds (after its own "Apply" link, if it
  // has one).
  function apWaitCheck() {
    if (!autopilotOn() || state.apReported || !state.waiting) return;
    var waited = Date.now() - (state.waitSince || Date.now());
    if (state.waiting === "login") {
      autopilotEnd("needs_you", "the site asks you to sign in or create an account first - only you can do that", "login");
    } else if (state.waiting === "checking") {
      autopilotEnd("needs_you", "the site checks that a real person is visiting before it shows the application - only you can do that", "captcha");
    } else if (state.waiting === "apply" && waited > 12000 && !state.apFollowing) {
      autopilotEnd("needs_you", "it couldn’t find the application form on the posting’s page - it may need you to click “Apply”, or sign in, first", "page");
    }
  }

  function finished() {
    if (state.done) return;
    state.done = true;
    if (state.waitTimer) { clearInterval(state.waitTimer); state.waitTimer = null; }
    if (state.captchaTimer) { clearInterval(state.captchaTimer); state.captchaTimer = null; }
    send({ type: "KAIDOSTAR_DONE", applicationId: state.applicationId, queued: !!(state.payload && state.payload.queued) });
  }

  function coverFieldPresent() {
    try {
      var sc = state.scope || document;
      return !!sc.querySelector("textarea[name*=cover i], textarea[id*=cover i], textarea[aria-label*='cover letter' i], textarea[placeholder*='cover letter' i], textarea[name='job_application[cover_letter_text]']");
    } catch (e) { return false; }
  }

  // the CAPTCHA, when there is one that you still have to do on this form (one whose "done" Kaidostar can see - it never
  // locks Submit for one it can't)
  function captchaPending() { return !!(state.captcha && !state.captcha.invisible && !state.captcha.solved && !state.captcha.generic); }

  function render(mode, extra) {
    // once you've closed the panel it stays closed - except to tell you how a submit went (or that a check after it is yours)
    if (state.dismissed && (mode === "review" || mode === "waiting" || mode === "confirmjob")) {
      try { if (host) host.remove(); } catch (e) {}
      host = null; root = null;
      return;
    }
    var b = ensureBanner()._body;
    // while it waits for you, the panel sits at the bottom, out of the way of the sign-in you're doing
    try { host.style.top = mode === "waiting" ? "auto" : "16px"; host.style.bottom = mode === "waiting" ? "16px" : "auto"; } catch (e) {}
    var data = state.data || {}, res = state.res || {};
    var org = data.listing_org ? esc(data.listing_org) : "";
    var title = data.listing_title ? esc(data.listing_title) : "this role";
    var head = '<p class="sub">' + title + (org ? " · " + org : "") + "</p>";

    if (mode === "blocked") {
      b.innerHTML = head + '<div class="stop">Stopped: ' + esc(res.blocker) +
        ". Kaidostar won't act past this. Sign in or clear it, then apply here yourself.</div>" +
        '<div class="btns"><button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }
    if (mode === "waiting") {
      var k = (extra && extra.kind) || state.waiting || "apply";
      var msg = k === "login"
        ? "This site asks you to sign in (or create an account) first. Do that here - your browser’s password manager can fill it in. Kaidostar never sees or types your password, and once the application form appears it carries on by itself."
        : (k === "checking"
          ? "The site is checking that a real person is visiting. If it asks you to confirm, do that - Kaidostar carries on when the page loads."
          : "Kaidostar can’t see the application form yet. If the page has an “Apply” button, click it (and sign in if it asks) - Kaidostar fills the form when it appears.");
      b.innerHTML = head + '<div class="step"><b>Your step:</b> ' + esc(msg) + "</div>" +
        '<div class="btns"><button class="act ghost" data-a="next">Stop - I’ll do it myself</button></div>';
      wire(b);
      return;
    }
    if (mode === "waitover") {
      b.innerHTML = head + '<div class="warn">Kaidostar stopped waiting after 30 minutes, so it didn’t fill or submit anything here. Apply on this page yourself, ' +
        "or start this application again from the Kaidostar extension.</div>" +
        '<div class="btns"><button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }
    if (mode === "confirmjob") {
      b.innerHTML = head + '<div class="warn">Is this the application for ' + title + (org ? " at " + org : "") + "? " +
        "The page doesn’t name the job, so Kaidostar checks with you before it fills anything.</div>" +
        '<div class="btns"><button class="act primary" data-a="isjob">Yes - fill it</button><button class="act ghost" data-a="next">No - stop</button></div>';
      wire(b);
      return;
    }
    if (mode === "board") {
      b.innerHTML = head + '<div class="stop">This is a job board (' + esc(location.hostname.replace(/^www\./, "")) + "). Kaidostar never fills or submits a job board’s own form - " +
        "job boards like LinkedIn and Indeed forbid automated applying. Apply on the site yourself; your answers are on the Auto page (Copy my answers).</div>" +
        '<div class="btns"><button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }
    if (mode === "success") {
      b.innerHTML = head + '<div class="good">Application submitted ✓ Kaidostar confirmed it went through and recorded it as sent, with the confirmation as proof.</div>' + learnBlock();
      wire(b);
      return;
    }
    if (mode === "noform") {
      var signup = false;
      try { signup = !!(K && K.signUpHere && K.signUpHere(document)); } catch (e) {}
      b.innerHTML = head + '<div class="warn">' + (signup
        ? "This page looks like a sign-up - a talent community, a newsletter or a general application - not this job’s application, so Kaidostar didn’t fill or submit anything. The job may have closed: check the posting."
        : "Kaidostar couldn’t find the application form on this page, so it didn’t fill or submit anything. " +
          "If the posting needs you to click “Apply” or sign in first, do that and fill it in yourself - your answers are on the Auto page (Copy my answers).") + "</div>" +
        '<div class="btns"><button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }
    if (mode === "unrecorded") {
      b.innerHTML = head + '<div class="warn">Submitted ✓ - the page confirmed it. But Kaidostar couldn’t record it (' + esc((extra && extra.why) || "no connection") +
        "), so mark it submitted on the Auto page (Needs you) to keep your records right.</div>" + learnBlock() +
        '<div class="btns"><button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }
    if (mode === "unconfirmed") {
      // (noted once on this page is noted: a later go whose note failed doesn't undo that)
      var rec = state.noted ? true : (state.attempt ? state.attempt.recorded : false);
      b.innerHTML = head +
        '<div class="warn">Clicked submit, but couldn’t confirm it went through. Check this page (or your email for a confirmation). ' +
        (rec === true ? "Kaidostar has noted it may have gone through, so it won’t open it again for you until you say it didn’t."
          : rec === null ? "Kaidostar is noting that it may have gone through (so it won’t open it again for you)…"
          : "Kaidostar couldn’t note this attempt" + (state.attempt && state.attempt.why ? " (" + esc(state.attempt.why) + ")" : "") + ", so this job may still be listed - don’t submit it again if it went through.") +
        " If it didn’t go through, fix what the page asks and submit again.</div>" +
        '<div class="btns"><button class="act ghost" data-a="notsent">' + (state.notSentBusy ? "Saving…" : "It didn’t go through - let me fix it") + "</button>" +
        '<button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }
    if (mode === "challenge") {
      b.innerHTML = head + '<div class="step"><b>Your step:</b> the site is asking you to confirm you’re a real person. Do that - Kaidostar never does it - and it confirms the submission once it’s through.</div>';
      return;
    }

    // mode === "review"
    var body = head + (autopilotOn() ? '<div class="info"><b>Autopilot</b> is applying to this on its own. Click anywhere on the page to take it over.</div>'
      : (state.apNote ? '<div class="info">' + esc(state.apNote) + "</div>" : "")) +
      (extra && extra.note ? '<div class="warn">' + esc(extra.note) + "</div>" : "") +
      (data.resume_note ? '<div class="info">' + esc(data.resume_note) + "</div>" : "") + filledRows(data, res);
    var missing = openQuestions();
    if (missing.length) {
      body += '<div class="warn">Your answer bank doesn’t cover ' + (missing.length === 1 ? "this required question" : "these required questions") + " - answer on the page:" +
        '<ul class="list">' + missing.slice(0, 6).map(function (m) { return "<li>" + esc(m.label || "a question") + (m.why ? " <span style='color:#aab2c5'>(" + esc(m.why) + ")</span>" : "") + "</li>"; }).join("") + "</ul></div>";
    }
    var reason = res.requiredMissing;
    var dropdownBlocked = !!(reason && /dropdown/i.test(reason));
    var presetBlocked = !!(reason && /already picked|already ticked/i.test(reason));
    var personStep = captchaPending();
    if (state.captcha) {
      body += captchaPending()
        ? '<div class="step"><b>One step only you can do:</b> the “I’m not a robot” check on the form - Kaidostar never does it. Do it, then click Submit application.</div>'
        : (state.captcha.generic && !state.captcha.invisible)
        ? '<div class="step"><b>One step only you can do:</b> the check on this form that a real person is applying (a CAPTCHA) - Kaidostar never does it, and can’t see when it’s done. Do it on the form, then click Submit application.</div>'
        : (state.captcha.invisible
          ? '<div class="step">This site checks that a real person is applying when you submit, so the click is yours. If it then asks you to confirm you’re human, do that - Kaidostar confirms the submission once it’s through.</div>'
          : '<div class="good">Check done ✓ - click Submit application when you’re ready.</div>');
    }
    if (state.account) {
      body += '<div class="step">This form also creates an account with the employer: choose a password in it (your browser’s password manager can suggest one). Kaidostar never types passwords, so the click is yours.</div>';
    }
    if (reason) {
      body += '<div class="warn">Filled what I safely can, but ' + esc(reason) + ". " +
        (dropdownBlocked
          ? "Kaidostar only picks dropdown answers from your answer bank — choose this one on the posting yourself; Submit here unlocks once you have."
          : (presetBlocked ? "Pick your answer on the page - or, if the form’s answer is right, say so here." : "Answer it on the page, then click Submit here.")) +
        (presetBlocked ? '<button class="act ghost" data-a="keep" style="flex:none;margin-top:6px;width:100%">The form’s answer is right - keep it</button>' : "") + "</div>";
    } else if (!res.submitFound) {
      body += '<div class="warn">No submit button found yet — the form may still be loading, or it has more steps. Review, then submit on the page.</div>';
    } else if (!state.captcha && !state.account) {
      body += '<div class="info">Review the form, then submit. Kaidostar filled it from your Kaidostar profile and answer bank.' +
        (state.autoWanted && !state.ats ? " This form is on the company’s own site, so Kaidostar never submits it on its own here - the click is yours." : "") + "</div>";
    }
    if (!data.cover_letter && coverFieldPresent() && data.cover_letter_policy !== "never") {
      body += '<div class="info">This form has a cover letter box. <button class="act ghost" data-a="cover" style="flex:none;margin-top:6px;width:100%">' + (state.coverBusy ? "Writing…" : "Write one from the posting and my own experience") + "</button></div>";
    }
    body += learnBlock();
    if (extra && extra.countdown != null) {
      body += autopilotOn()
        ? '<div class="warn">Autopilot submits this in <span class="count">' + extra.countdown + "</span>s… Cancel (or click anywhere on the page) to take it over.</div>"
        : '<div class="warn">Auto-submitting in <span class="count">' + extra.countdown + "</span>s… Cancel to review.</div>";
    }
    var sending = !!(extra && extra.sending);
    var canClick = res.submitFound && !dropdownBlocked && !presetBlocked && !sending && !personStep;
    body += '<div class="btns">' +
      '<button class="act primary" data-a="submit"' + (canClick ? "" : " disabled") + '>' +
      (sending ? "Submitting…" : (personStep ? "Do the check first" : (extra && extra.countdown != null ? "Submit now" : "Submit application"))) + "</button>" +
      (sending ? "" : '<button class="act ghost" data-a="cancel">' + (extra && extra.countdown != null ? "Cancel" : "I’ll do it") + "</button>") +
      "</div>";
    b.innerHTML = body;
    wire(b);
  }

  // the required questions your bank doesn't cover that are still open (a form's own pick you've since
  // answered on the page, or OK'd in the panel, no longer is)
  function openQuestions() {
    var qa = state.qa || {};
    var okIdx = {};
    (qa.blocking || []).forEach(function (bk) { if (bk.ok) okIdx[bk.i] = 1; });
    return (qa.missingRequired || []).filter(function (m) { return !okIdx[m.i]; });
  }

  // ---- answers you give on the page, remembered when you ask ----
  // Never remembered from a form (the same rules as the server's auto_answers.learn): a question Kaidostar never answers,
  // a voluntary equal-opportunity one, and anything about working in a country - work authorization, sponsorship,
  // citizenship, a visa or residency (those answers live in your answer bank, for the countries they're about).
  var NOT_REMEMBERED = /^(?:never|eeo:.*|authUnclear|sponsorUnclear|twoQuestions|status|workAuth|sponsorship|authNoSponsor|authPermanent|citizen|citizenPR)$/;
  var WORK_WORDS = /(?:^|[^a-z0-9])(?:authorized|authorised|authorization|authorisation|eligible|eligibility|sponsor|sponsorship|sponsored|visa|visas|citizen|citizens|citizenship|nationality|national|nationals|resident|residency|residence|permit|permits|immigration|green card|right to work|legally|lawfully|work in|country|countries|restriction|restrictions|restricted|unrestricted|limitation|limitations|employment|employable|employ|work for|able to work|allowed to work|permitted to work|entitled to work|any employer|work rights|work pass|passport|everify|e verify|i 9|i9|h 1b|h1b|opt|cpt|ead|tn|us person|u s person|itar|export)(?![a-z0-9])/;
  function plainLabel(s) { return String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9+]+/g, " ").trim(); }
  function rememberable(key, label) {
    var n = plainLabel(label);
    return n.length >= 6 && !NOT_REMEMBERED.test(String(key || "")) && !WORK_WORDS.test(n);
  }
  // what you've answered yourself, on this page, of the questions Kaidostar left (never a tick box, a question
  // Kaidostar never answers, or a voluntary equal-opportunity one - the server checks again)
  function givenHere() {
    var out = [];
    ((state.qa && state.qa.learnable) || []).forEach(function (l) {
      var v = "";
      try {
        if (Array.isArray(l.ref) || (l.ref && l.ref.tagName === "SELECT")) v = (K.currentAnswer ? K.currentAnswer(l.ref) : "") || "";
        else if (l.ref) v = String(l.ref.value || "").trim();
        if (l.ref && !Array.isArray(l.ref) && l.ref.tagName === "SELECT") {
          var o = l.ref.options[l.ref.selectedIndex];
          if (!o || !String(o.value || "").trim()) v = "";
        }
      } catch (e) { v = ""; }
      if (!v || v.length > 300) return;
      // a choice the form had picked by itself counts only once you've picked or confirmed it
      if (l.preset && v === l.initial && !l.touched()) return;
      out.push({ label: l.label, type: l.type, options: l.options, answer: v });
    });
    return out;
  }
  function learnBlock() {
    if (state.learned) {
      return '<div class="good">Saved ✓ - next time a form asks ' + (state.learned === 1 ? "that question" : "these questions") +
        ", Kaidostar answers the same way (change them on the Auto page, Answer bank).</div>";
    }
    var n = givenHere().length;
    if (!n) return "";
    return '<div class="info">You answered ' + n + " question" + (n === 1 ? "" : "s") + " Kaidostar didn’t know." +
      (state.learnError ? " " + esc(state.learnError) : "") +
      '<button class="act ghost" data-a="learn" style="flex:none;margin-top:6px;width:100%">' + (state.learnBusy ? "Saving…" : "Remember " + (n === 1 ? "it" : "them") + " for next time") + "</button></div>";
  }
  function learn() {
    if (state.learnBusy) return;
    var given = givenHere();
    if (!given.length) return;
    state.learnBusy = true; state.learnError = "";
    rerender();
    var page = null;
    try { page = K.pageJob ? K.pageJob(document) : null; } catch (e) { page = null; }
    // (with the job page's data: an answer is reused for jobs in this job's country only)
    send({ type: "KAIDOSTAR_LEARN", applicationId: state.applicationId, answers: given, page: page }).then(function (r) {
      state.learnBusy = false;
      if (r && r.ok && r.saved) state.learned = r.saved;
      else state.learnError = (r && r.error) || "Couldn’t save them just now.";
      rerender();
    });
  }
  // the panel as it was, with what changed
  function rerender() {
    if (state.verifying || state.unconfirmed) return;
    if (state.lastMode === "success" || state.lastMode === "unrecorded") { render(state.lastMode, state.lastExtra); return; }
    if (!state.submitting && !state.waiting) render("review");
  }

  function wire(b) {
    var sb = b.querySelector('[data-a="submit"]');
    if (sb) sb.addEventListener("click", function () {
      if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
      doSubmit(false);
    });
    var cb = b.querySelector('[data-a="cancel"]');
    if (cb) cb.addEventListener("click", function () {
      if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; render("review"); return; }
      // you'll submit it yourself: that submit is still noted, and confirmed, like Kaidostar's own
      state.handedBack = true;
      finished();
      render("review");
    });
    var nb = b.querySelector('[data-a="next"]');
    if (nb) nb.addEventListener("click", function () { finished(); });
    var cv = b.querySelector('[data-a="cover"]');
    if (cv) cv.addEventListener("click", writeCover);
    var ns = b.querySelector('[data-a="notsent"]');
    if (ns) ns.addEventListener("click", notSent);
    var lb = b.querySelector('[data-a="learn"]');
    if (lb) lb.addEventListener("click", learn);
    var ij = b.querySelector('[data-a="isjob"]');
    if (ij) ij.addEventListener("click", function () {
      // you said this is the job's application: fill it (a click of yours, so it counts as your OK for this page)
      var p = state.pendingConfirm;
      state.pendingConfirm = null;
      if (p) { state.started = false; runNow(p); }
    });
    var kp = b.querySelector('[data-a="keep"]');
    if (kp) kp.addEventListener("click", function () {
      // your explicit OK for the form's own pick, on the first question still waiting for one
      var left = presetLeft();
      if (left.length) {
        left[0].ok = true;
        try { if (!Array.isArray(left[0].ref) && left[0].ref.tagName === "SELECT") left[0].ref.setAttribute("data-kaido-answered", "1"); } catch (e) {}
      }
      reevaluate();
      render("review");
    });
  }

  // An answer you give on the page yourself is yours: a dropdown you pick counts as answered, and a
  // pre-picked answer you change is no longer one you didn't give. (Only real clicks and keys count -
  // never a script's change - and any countdown stops while you're answering.)
  function onUserAnswer(e) {
    if (!e || !e.isTrusted || !state.started || state.submitting || state.done || state.unconfirmed || state.verifying || state.waiting) return;
    var t = e.target;
    if (!t || !t.tagName) return;
    var tag = t.tagName.toUpperCase(), type = String(t.getAttribute("type") || "").toLowerCase();
    if (tag !== "SELECT" && type !== "radio" && type !== "checkbox" && tag !== "TEXTAREA" && tag !== "INPUT") return;
    if (tag === "SELECT") t.setAttribute("data-kaido-answered", "1");
    if (state.qa && state.qa.blocking) state.qa.blocking.forEach(function (b) { if (Array.isArray(b.ref) ? b.ref.indexOf(t) >= 0 : b.ref === t) b.ok = true; });
    if (state.qa && state.qa.learnable) state.qa.learnable.forEach(function (l) { if (Array.isArray(l.ref) ? l.ref.indexOf(t) >= 0 : l.ref === t) l.changed = true; });
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
    reevaluate();
    render("review");
  }
  document.addEventListener("change", onUserAnswer, true);

  // the application form as it is now (a page that re-draws its form gets the new one)
  function currentScope() {
    var sc = state.scope;
    if (sc && sc !== document && sc.isConnected === false) {
      try { sc = K.applicationForm(document) || sc; } catch (e) {}
      state.scope = sc;
    }
    return sc;
  }
  // the button that sends this application - never "Save for later", "Back" or "Next"
  function appSubmitButton() {
    var sc = currentScope();
    try { return K.findSubmit(document, sc && sc !== document ? sc : null); } catch (e) { return null; }
  }
  // a form's real submit button: the form's own submit event covers it, and says which button sent it
  function sendsByItself(b) {
    var tag = String((b && b.tagName) || "").toUpperCase();
    return (tag === "BUTTON" || tag === "INPUT") && !!b.form && /^(?:submit|image)$/.test(String(b.type || "").toLowerCase());
  }
  // a control in the application that sends it: its submit button, a button whose words say it sends it ("Submit
  // application", "Apply"), or the one you've just sent it with (relabelled "Submitting…" since) - never one whose words
  // say it doesn't ("Save for later", "Back", "Next", "Upload"), nor, once Kaidostar knows the form's submit button, any
  // other button (a calendar icon, a search's "Go")
  function sendControl(t) {
    var sc = currentScope();
    if (!sc || sc === document) return null;
    var btn = t && t.closest ? t.closest("button, input[type=submit], input[type=button], input[type=image], [role=button]") : null;
    try { if (!btn || !(sc.contains(btn) || (btn.form && btn.form === sc))) return null; } catch (e) { return null; }
    if (state.sentBy && btn === state.sentBy) return btn;
    if (K.skipButton && K.skipButton(btn)) return null;
    var sub = appSubmitButton();
    if (btn === sub) return btn;
    if (K.saysSubmit && K.saysSubmit(btn)) return btn;
    // a form whose submit button Kaidostar doesn't know (its words aren't ones it reads - another language, "Done"): any
    // of its real submit buttons may be the one (taking one for it that wasn't is the safe side: you can say it didn't go)
    return !sub && sendsByItself(btn) ? btn : null;
  }
  // how many controls could send the form by themselves
  function submitControls(sc) {
    try { return sc.querySelectorAll("button:not([type=button]):not([type=reset]), input[type=submit], input[type=image]").length; } catch (e) { return 2; }
  }
  // something you did in the application form (a click, a key): a script's send right after a click on words that say
  // "submit", or after Enter, is yours
  function personActs(e) {
    try {
      if (e && e.isTrusted && state.scope && state.scope !== document && e.target && state.scope.contains(e.target)) {
        state.lastActAt = Date.now();
        state.lastActEl = e.target;
        state.lastActKey = e.type === "keydown" ? String(e.key || "") : "";
      }
    } catch (er) {}
  }
  function saidSubmit(el) {
    for (var k = 0; el && k < 4; k++, el = el.parentElement) {
      try { if (K.saysSubmit && K.saysSubmit(el)) return true; } catch (e) {}
      if (el === state.scope) break;
    }
    return false;
  }
  document.addEventListener("pointerdown", personActs, true);
  document.addEventListener("keydown", personActs, true);
  // the application's submit button, when that's what was clicked
  function onAppSubmitButton(t) {
    var btn = t && t.closest ? t.closest("button, input[type=submit], input[type=button], input[type=image], [role=button]") : null;
    var sub = btn ? appSubmitButton() : null;
    return btn && sub && btn === sub ? btn : null;
  }

  // After a submit, a link you follow (or another form you send) is you moving on: the page it opens is never
  // read as this application's confirmation. (The application's own submit button is a submit of yours, not that.)
  function movingOn(e) {
    if (!e || !e.isTrusted || !(state.submitting || state.unconfirmed || state.verifying) || !state.applicationId) return;
    var t = e.target;
    if (e.type === "click" && !(t && t.closest && t.closest("a[href], button, [role=button], [role=link], [role=tab], [role=menuitem], input[type=submit], input[type=button]"))) return;
    // the application's own submit - even relabelled "Submitting…" once clicked - is a submit of yours, not you moving on
    // (any other button or link is: a "My applications" view is never read as this one's confirmation)
    if (e.type === "click" && (sendControl(t) || onAppSubmitButton(t))) return;
    if (e.type === "submit" && state.scope && (t === state.scope || (state.scope.contains && state.scope.contains(t)))) return;
    state.movedOn = true;   // the check on this page ends too: what you open isn't read as the confirmation
    send({ type: "KAIDOSTAR_STOP_WATCH", applicationId: state.applicationId });
  }
  document.addEventListener("click", movingOn, true);
  document.addEventListener("submit", movingOn, true);

  // Is this you sending the application? Its submit button - never "Save for later" or another of its buttons - or
  // Enter in it.
  function ownAppSubmit(e) {
    var sc = currentScope();
    if (!sc || sc === document) return false;
    var isForm = String(sc.tagName || "").toUpperCase() === "FORM";
    if (e.type === "submit") {
      if (!isForm || e.target !== sc) return false;
      var by = e.submitter || null;
      if (by) {
        if (sendControl(by)) return true;                       // its submit button, or one that says it sends it
        if (K.skipButton && K.skipButton(by)) return false;     // "Save for later", "Next"...
        return submitControls(sc) <= 1;                         // another button: yours only if nothing else could send it
      }
      // sent with no button named (the page's own script): yours right after you clicked words that say "submit", or
      // pressed Enter, in the form - or when the form has no other way to be sent
      if (Date.now() - (state.lastActAt || 0) < 2000 && (state.lastActKey === "Enter" || saidSubmit(state.lastActEl))) return true;
      return submitControls(sc) <= 1;
    }
    var btn = sendControl(e.target);
    if (!btn) return false;
    return !(isForm && sendsByItself(btn) && btn.form === sc);   // that one is covered by the form's submit event (or laterOwnClick)
  }

  // You submitting the application yourself - its own submit button, or Enter in it (a form with a CAPTCHA is
  // usually sent like this): noted like Kaidostar's own click, and its confirmation looked for the same way. Also after
  // you said you'd do it yourself, and for a second go after one that couldn't be confirmed. A submit Kaidostar's own
  // click caused is never counted twice; and a click of yours while Kaidostar is noting its own attempt sends the form -
  // Kaidostar's click then never follows.
  function onOwnSubmit(e) {
    if (!e || !e.isTrusted || state.clicking || !state.started || state.waiting || state.verifying || state.sent || !state.res) return;
    if (state.done && !state.handedBack) return;
    if (state.clickPending) {
      // Kaidostar is noting its own attempt, about to click: a click of yours on what sends the form (or the form being
      // sent) sends it - and Kaidostar's click never follows
      if (ownAppSubmit(e) || (e.type === "click" && sendControl(e.target))) state.personSubmitted = true;
      return;
    }
    var mine = ownAppSubmit(e);
    if (!mine) {
      if (e.type === "click") laterOwnClick(e);
      return;
    }
    var by = e.type === "submit" ? (e.submitter || null) : sendControl(e.target);
    // you sent it again while Kaidostar waited for the page to confirm it: noted again, and the wait starts over
    if (state.submitting) { resend(by); return; }
    ownSubmit(null, by);
  }
  document.addEventListener("submit", onOwnSubmit, true);
  document.addEventListener("click", onOwnSubmit, true);

  // A click on one of the form's real submit buttons that the page stops, to send the form its own way (a script's fetch,
  // an invisible CAPTCHA's check and then the form's own send): no submit event may follow - so that click is taken as
  // your submit. (If it didn't go through after all, the panel says it couldn't confirm it, and you can say so.)
  function laterOwnClick(e) {
    var btn = sendControl(e.target);
    if (!btn || !sendsByItself(btn)) return;
    var before = shownChallenges();
    setTimeout(function () {
      if (!e.defaultPrevented || state.sent || (state.done && !state.handedBack)) return;
      if (state.submitting) { if (!state.clickPending) resend(btn); return; }
      ownSubmit(before, btn);
    }, 0);
  }

  // a send of yours while Kaidostar waits for the page to confirm an earlier one: noted again (the watch on the page
  // the form goes to starts over), and so does the wait
  function resend(by) {
    if (by) state.sentBy = by;
    state.waitUntil = Date.now() + 12000;
    var mine = state.attempt = { recorded: null, why: "" };
    var preUrl = location.href;
    send({ type: "KAIDOSTAR_ATTEMPT", applicationId: state.applicationId, preUrl: preUrl.slice(0, 1000), preText: !!(state.preText),
      answered: (state.qa && state.qa.filled) || 0, answers: (state.qa && state.qa.given) || [], own: true }).then(function (r) {
      mine.recorded = !!(r && r.ok);
      mine.why = (r && r.error) || "";
      if (mine.recorded) state.noted = true;
      if (state.attempt === mine && state.unconfirmed && !state.notSentBusy) render("unconfirmed");
    });
  }

  function ownSubmit(before, by) {
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
    state.submitting = true;
    state.unconfirmed = false; state.movedOn = false; state.notSentBusy = false;   // (a second go, after one that couldn't be confirmed)
    state.framesBefore = before || shownChallenges();
    state.attempted = true;
    state.sentBy = by || null;
    var preUrl = location.href, preText = false;
    try { preText = K.confirmationTextPresent(document); } catch (e) {}
    state.preText = preText;
    var answered = (state.qa && state.qa.filled) || 0, given = (state.qa && state.qa.given) || [];
    render("review", { sending: true });
    var mine = state.attempt = { recorded: null, why: "" };   // (being noted)
    send({ type: "KAIDOSTAR_ATTEMPT", applicationId: state.applicationId, preUrl: preUrl.slice(0, 1000), preText: !!preText,
      answered: answered, answers: given, own: true }).then(function (r) {
      mine.recorded = !!(r && r.ok);
      mine.why = (r && r.error) || "";
      if (mine.recorded) state.noted = true;
      if (state.attempt === mine && state.unconfirmed && !state.notSentBusy) render("unconfirmed");
    });
    waitForConfirmation(preUrl, preText, answered, given);
  }

  function writeCover() {
    if (state.coverBusy) return;
    state.coverBusy = true; render("review");
    send({ type: "KAIDOSTAR_COVER_LETTER", applicationId: state.applicationId }).then(function (r) {
      state.coverBusy = false;
      if (r && r.ok && r.text) {
        state.data.cover_letter = r.text;
        try { K.autofill(window, { cover_letter: r.text }, null); } catch (e) {}
        reevaluate();
        render("review");
        if (r.note) { var b = ensureBanner()._body; b.insertAdjacentHTML("afterbegin", '<div class="warn">' + esc(r.note) + "</div>"); }
      } else {
        render("review");
        ensureBanner()._body.insertAdjacentHTML("afterbegin", '<div class="warn">' + esc((r && r.error) || "Couldn't write a cover letter just now.") + "</div>");
      }
    });
  }

  // the form's own picks still waiting for you: only your own action on the page (or your OK in the
  // panel) clears one - never a script changing the value
  function presetLeft() {
    if (!state.qa || !state.qa.blocking) return [];
    return state.qa.blocking.filter(function (b) { return !b.ok; });
  }

  function reevaluate() {
    var reason = null, submitEl = null;
    // first: an answer the form picked by itself, which your answer bank doesn't cover - never submitted
    // for you until you pick the answer yourself (or say the form's pick is right)
    var left = presetLeft();
    if (left.length) reason = "the form already " + (left[0].checkbox ? "ticked “" : "picked an answer to “") + (left[0].label || "a question") + "” - an answer you haven’t given";
    if (!reason) { try { reason = K.requiredUnsatisfiedReason(document); } catch (e) { reason = "couldn't verify the form"; } }
    submitEl = appSubmitButton();
    var sc = currentScope();
    try { state.captcha = K.captchaState ? K.captchaState(document, sc) : null; } catch (e) {}
    try { state.account = !!(K.accountStep && K.accountStep(sc || document)); } catch (e) {}
    state.res = state.res || {};
    state.res.requiredMissing = reason;
    state.res.submitFound = !!submitEl;
    state.res.canAutoSubmit = !reason && !!submitEl && !state.captcha && !state.account;
  }

  // a CAPTCHA you still have to do: the panel follows it, and unlocks Submit when it's done
  function watchCaptcha() {
    if (state.captchaTimer || !captchaPending()) return;
    try { if (state.captcha.el && state.captcha.el.scrollIntoView) state.captcha.el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
    state.captchaTimer = setInterval(function () {
      if (state.done || state.submitting || state.verifying || state.unconfirmed) { clearInterval(state.captchaTimer); state.captchaTimer = null; return; }
      var was = captchaPending();
      try { state.captcha = K.captchaState(document, state.scope); } catch (e) {}
      if (was && !captchaPending()) {
        clearInterval(state.captchaTimer); state.captchaTimer = null;
        reevaluate();
        render("review");
      }
    }, 1000);
  }

  function startCountdown(seconds) {
    var n = seconds;
    render("review", { countdown: n });
    state.countdownTimer = setInterval(function () {
      n -= 1;
      if (n <= 0) {
        clearInterval(state.countdownTimer); state.countdownTimer = null;
        doSubmit(true);
        return;
      }
      render("review", { countdown: n });
    }, 1000);
  }

  // auto: the countdown's submit (no click of yours). It goes ahead only once Kaidostar has noted the attempt.
  function doSubmit(auto) {
    if (state.submitting) return;
    // an automatic submit only ever once, before anything was sent from this page - never after you closed the panel
    if (auto && (state.attempted || state.dismissed || state.sent)) return;
    // Re-check LIVE at click time: the user may have just answered a required
    // question on the page since we filled the rest. Never submit while any
    // required field is still unsatisfied; instead reflect the current reason and
    // stay in review.
    reevaluate();
    if (state.res.requiredMissing || !state.res.submitFound || captchaPending() || (auto && (state.captcha || state.account || !state.ats)) ||
        (auto && autopilotOn() && apCaptchaHint())) {
      if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
      render("review");
      watchCaptcha();
      if (auto) { var w0 = apWhy(); autopilotEnd("needs_you", w0[0], w0[1]); }
      return;
    }
    var submitEl = appSubmitButton();
    state.submitting = true;
    state.attempted = true;
    // until Kaidostar's own click: a click of yours on the form's submit button sends it, and Kaidostar's never follows
    state.clickPending = true; state.personSubmitted = false;
    var preUrl = location.href;
    var preText = K.confirmationTextPresent(document);
    var answered = (state.qa && state.qa.filled) || 0, given = (state.qa && state.qa.given) || [];
    render("review", { sending: true });
    // Tell Kaidostar first: if the result is never seen (the page moves on, the tab closes), the application
    // is already marked "may have gone through" - never opened for a second go.
    send({ type: "KAIDOSTAR_ATTEMPT", applicationId: state.applicationId, preUrl: preUrl.slice(0, 1000), preText: !!preText,
      answered: answered, answers: given, autopilot: auto && autopilotOn(), lease: String((state.payload && state.payload.lease) || "") }).then(function (r) {
      state.clickPending = false;
      var recorded = !!(r && r.ok), status = (r && r.status) || 0;
      state.attempt = { recorded: recorded, why: (r && r.error) || "" };
      if (recorded) state.noted = true;
      if (state.personSubmitted) {
        // you sent it yourself meanwhile: it is never clicked a second time - your submit is the one confirmed
        waitForConfirmation(preUrl, preText, answered, given);
        return;
      }
      var noClick = function (note, apWhyNot) {
        state.submitting = false;
        send({ type: "KAIDOSTAR_STOP_WATCH", applicationId: state.applicationId });   // nothing was clicked: no page is read as its result
        render("review", { note: note });
        if (auto) autopilotEnd("failed", apWhyNot, "page");
      };
      if (!recorded && status >= 400 && status < 500) {
        // Kaidostar says no (already sent, permission withdrawn, no longer approved): nothing is submitted
        noClick("Kaidostar didn’t submit this: " + (state.attempt.why || "it can’t be submitted right now") + ".",
          "Kaidostar didn’t let it submit this: " + (state.attempt.why || "it can’t be submitted right now"));
        return;
      }
      if (auto && (state.dismissed || state.apHanded)) {
        // you closed the panel (or took it over) while it was about to submit on its own: it doesn't - and what it noted is
        // taken back
        state.submitting = false;
        send({ type: recorded ? "KAIDOSTAR_NOT_SENT" : "KAIDOSTAR_STOP_WATCH", applicationId: state.applicationId, tookBack: true });
        state.attempt = null;
        if (!state.dismissed) render("review");
        return;
      }
      if (auto && !recorded) {
        // an automatic submit happens only once Kaidostar has noted it
        noClick("Kaidostar couldn’t reach your account to note this submission first" + (state.attempt.why ? " (" + state.attempt.why + ")" : "") +
          ", so it didn’t submit on its own. Review the form and click Submit application to send it yourself.",
          "it couldn’t reach Kaidostar to note the submission first" + (state.attempt.why ? " (" + state.attempt.why + ")" : "") + ", so it didn’t submit");
        return;
      }
      var el = submitEl && submitEl.isConnected !== false ? submitEl : appSubmitButton();
      var failed = !el;
      state.sentBy = el || null;
      state.framesBefore = shownChallenges();
      state.clicking = true;
      try { if (el) el.click(); } catch (e) { failed = true; }
      state.clicking = false;
      if (failed) {
        state.submitting = false;
        if (recorded) send({ type: "KAIDOSTAR_NOT_SENT", applicationId: state.applicationId, tookBack: true });
        else send({ type: "KAIDOSTAR_STOP_WATCH", applicationId: state.applicationId });
        state.attempt = null;
        render("review", { note: "Couldn’t press the form’s submit button - submit it on the page yourself." });
        if (auto) autopilotEnd("failed", "it couldn’t press the form’s submit button", "page");
        return;
      }
      waitForConfirmation(preUrl, preText, answered, given);
    });
  }

  // a check the site shows once you've clicked submit ("select all images with..."): yours to do, and the
  // confirmation is waited for while it's up. Only one that wasn't showing when the click was made counts - never the
  // "I'm not a robot" box you'd already ticked, or a check that sits on the form.
  var CHALLENGE_FRAMES = "iframe[src*='recaptcha/api2/bframe'], iframe[src*='recaptcha/enterprise/bframe'], iframe[src*='hcaptcha.com'][src*='frame=challenge'], " +
    "iframe[src*='challenges.cloudflare.com'], iframe[src*='arkoselabs'], iframe[src*='funcaptcha'], iframe[src*=captcha i]";
  function shownChallenges() {
    var out = [];
    try {
      var fs = document.querySelectorAll(CHALLENGE_FRAMES);
      for (var i = 0; i < fs.length; i++) {
        var r = fs[i].getBoundingClientRect();
        if (r.width > 60 && r.height > 60) {
          var cs = getComputedStyle(fs[i]);
          if (cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0") out.push(fs[i]);
        }
      }
    } catch (e) {}
    return out;
  }
  function challengeShowing() {
    var before = state.framesBefore || [];
    return shownChallenges().some(function (f) { return before.indexOf(f) < 0; });
  }

  // Poll for a real confirmation (SPA forms confirm without navigating; when the page does navigate, this
  // script ends with it and the background worker reads the new page instead).
  function waitForConfirmation(preUrl, preText, answered, given) {
    var started = Date.now(), shown = false, pinged = 0;
    state.waitUntil = started + 12000;      // (a send of yours meanwhile starts it over - see resend)
    if (state.confirmTimer) clearInterval(state.confirmTimer);
    var iv = state.confirmTimer = setInterval(function () {
      var confirmed = false;
      if (!state.movedOn) { try { confirmed = K.looksConfirmed(window, preUrl, preText); } catch (e) {} }
      if (confirmed) { clearInterval(iv); recordConfirmed(answered, given); return; }
      var now = Date.now();
      if (!state.movedOn && challengeShowing()) {
        // the site asked you to prove you're a person: wait while you do (up to three minutes) - and the background
        // worker keeps waiting for the page the form goes to once you're done
        state.waitUntil = Math.max(state.waitUntil, Math.min(started + 180000, now + 15000));
        if (!shown) {
          shown = true; render("challenge");
          // (no one may be watching: Autopilot says so and moves on - this tab is kept, and its confirmation still counts)
          autopilotEnd("unconfirmed", "after the click, the site asked to confirm that a real person is applying - only you can do that (its tab is kept open for you)", "captcha", true);
        }
        if (now - pinged >= 5000) { pinged = now; send({ type: "KAIDOSTAR_CHALLENGE", applicationId: state.applicationId }); }
      } else if (shown) {
        shown = false;
        render("review", { sending: true });
      }
      if (now >= state.waitUntil || state.movedOn) {
        clearInterval(iv);
        if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
        state.submitting = false;
        state.unconfirmed = true;
        render("unconfirmed");
        autopilotEnd("unconfirmed", "it clicked submit but didn’t see the employer’s confirmation - check the page (its tab is kept open for you) or your email", "page", true);
      }
    }, 500);
  }

  function recordConfirmed(answered, given) {
    var proof = { url: location.href.slice(0, 1000), phrase: (K.confirmationPhrase ? K.confirmationPhrase(document) : "").slice(0, 200),
      answered: answered || 0, answers: given || [] };
    state.sent = true;   // the page confirmed it: nothing more on this page is taken as this application's submit
    send({ type: "KAIDOSTAR_CONFIRM_SUBMIT", applicationId: state.applicationId, proof: proof }).then(function (r) {
      if (r && r.ok) { state.lastMode = "success"; render("success"); autopilotEnd("sent", "", ""); setTimeout(finished, 1200); }
      else {
        state.lastMode = "unrecorded"; state.lastExtra = { why: (r && r.error) || "" }; render("unrecorded", state.lastExtra);
        autopilotEnd("unconfirmed", "the page confirmed it, but Kaidostar couldn’t record it (" + ((r && r.error) || "no connection") + ") - mark it submitted on the Auto page", "page", true);
      }
    });
  }

  // You checked the page: it didn't go through. The "may have gone through" note is cleared (only you can
  // say this), and you're back at the form - never with a countdown.
  function notSent() {
    if (state.notSentBusy) return;
    var back = function () {
      state.attempt = null; state.submitting = false; state.unconfirmed = false; state.autoWanted = false; state.movedOn = false;
      if (state.verifying) {
        // the page the form moved to: start over here (the form may be back, asking for something)
        state.verifying = false; state.started = false; state.done = false;
        run(Object.assign({}, state.payload || {}, { autoSubmit: false }));
        return;
      }
      reevaluate();
      render("review");
    };
    // nothing was ever noted for this page: nothing to take back (one still being noted is taken back too)
    if (!state.noted && (!state.attempt || state.attempt.recorded === false)) { back(); return; }
    state.notSentBusy = true; render("unconfirmed");
    send({ type: "KAIDOSTAR_NOT_SENT", applicationId: state.applicationId }).then(function (r) {
      state.notSentBusy = false;
      if (r && r.ok) { state.noted = false; back(); return; }
      render("unconfirmed");
      ensureBanner()._body.insertAdjacentHTML("afterbegin", '<div class="warn">' + esc((r && r.error) || "Couldn't reach Kaidostar - try again.") + "</div>");
    });
  }

  // The page the form moved to after the click (the background worker injected us here): is it the
  // employer's confirmation? Only read - nothing on it is filled unless you say it didn't go through.
  function verifyAfterClick(v) {
    if (state.started) return;
    state.started = true; state.verifying = true;
    state.applicationId = v.applicationId;
    state.payload = v.payload || null;
    state.data = (v.payload && v.payload.data) || {};
    state.attempt = { recorded: v.recorded === null ? null : !!v.recorded, why: "" };   // (null: still being noted - told when it is)
    state.noted = v.recorded === true;
    var tries = 0;
    var iv = setInterval(function () {
      tries += 1;
      var ok = false;
      if (!state.movedOn) { try { ok = K.looksConfirmed(window, String(v.preUrl || ""), !!v.preText); } catch (e) {} }
      if (ok) { clearInterval(iv); recordConfirmed(v.answered, v.answers); return; }
      if (tries >= 16 || state.movedOn) {
        clearInterval(iv); state.unconfirmed = true; render("unconfirmed");
        autopilotEnd("unconfirmed", "it clicked submit but didn’t see the employer’s confirmation - check the page (its tab is kept open for you) or your email", "page", true);
      }
    }, 500);
  }

  // The form's other questions -> the server answers what the answer bank covers -> fill those.
  function answerQuestions() {
    var collected;
    try { collected = K.collectQuestions(state.scope || document); } catch (e) { collected = null; }
    if (!collected || !collected.questions.length) { state.qa = { asked: 0, filled: 0, missingRequired: [], given: [], blocking: [], learnable: [], read: 0 }; return Promise.resolve(); }
    var page = null;
    try { page = K.pageJob ? K.pageJob(document) : null; } catch (e) { page = null; }
    return send({ type: "KAIDOSTAR_RESOLVE_ANSWERS", applicationId: state.applicationId, questions: collected.questions, page: page }).then(function (r) {
      var answers = (r && r.ok && Array.isArray(r.answers)) ? r.answers : [];
      // a question you answered on the page while these were on their way is yours: never overwritten
      var yours = function (a) { return !!(a && a.i != null && touchedRef(collected.refs[a.i])); };
      var use = (state.attempted || state.sent) ? [] : answers.filter(function (a) { return !(a && !a.missing && yours(a)); });
      var filled = 0;
      try { filled = K.applyAnswers(collected.refs, use); } catch (e) {}
      var missingRequired = answers.filter(function (a) { return a && a.missing && a.required && !yours(a); })
        .map(function (a) { return { i: a.i, label: (collected.questions[a.i] || {}).label || "", why: a.why || "" }; });
      var given = use.filter(function (a) { return a && !a.missing; })
        .map(function (a) { return { label: ((collected.questions[a.i] || {}).label || "").slice(0, 120), answer: String(a.answer || "").slice(0, 120) }; });
      var blocking = answers.filter(function (a) { return a && a.missing && a.blocking && collected.refs[a.i] && !yours(a); })
        .map(function (a) { var q = collected.questions[a.i] || {}; return { i: a.i, ref: collected.refs[a.i], current: q.current || "", label: (q.label || "").slice(0, 120), checkbox: q.type === "checkbox" }; });
      if (!(r && r.ok)) {
        // the answers couldn't be checked: no answer the form picked by itself is trusted for an automatic submit
        blocking = collected.questions.map(function (q, i) { return q && q.preset ? { i: i, ref: collected.refs[i], current: q.current || "", label: (q.label || "").slice(0, 120), checkbox: q.type === "checkbox" } : null; })
          .filter(function (b) { return b && b.ref; });
      }
      // the questions you may answer on the page yourself - and ask Kaidostar to remember (the ones the server would keep)
      var learnable = answers.filter(function (a) {
        var q = a && collected.questions[a.i];
        return a && a.missing && q && q.type !== "checkbox" && collected.refs[a.i] && rememberable(a.key, q.label);
      }).map(function (a) {
        var q = collected.questions[a.i], ref = collected.refs[a.i];
        var item = { i: a.i, ref: ref, label: String(q.label || "").slice(0, 300), type: q.type, options: (q.options || []).slice(0, 60),
          preset: !!q.preset, initial: q.current || "", changed: touchedRef(ref) };
        item.touched = function () {
          if (item.changed) return true;
          var bk = blocking.filter(function (x) { return x.i === a.i; })[0];
          return !!(bk && bk.ok);
        };
        return item;
      });
      var read = use.filter(function (a) { return a && !a.missing && a.read; }).length;
      state.qa = { asked: collected.questions.length, filled: filled, missingRequired: missingRequired, given: given.slice(0, 40), blocking: blocking,
        learnable: learnable, read: read, resolved: !!(r && r.ok) };
    });
  }

  function runNow(payload) {
    if (state.started) return;
    state.started = true;
    state.applicationId = payload.applicationId;
    state.data = payload.data || {};
    var candidate = {
      full_name: state.data.full_name, first_name: state.data.first_name,
      last_name: state.data.last_name, email: state.data.email,
      phone: state.data.phone, cover_letter: state.data.cover_letter,
    };
    var resumeFile = fileFromResume(payload.resume);
    var res;
    try { res = K.autofill(window, candidate, resumeFile); }
    catch (e) { return; }
    state.res = res;
    if (res.blocker) {
      // a check the site runs on your browser: yours - Kaidostar waits, then carries on
      state.started = false;
      if (IS_TOP) waitForPerson(payload, res.blockerKind || "checking");
      return;
    }
    // filling here: nothing more to wait for in this tab
    send({ type: "KAIDOSTAR_FILLING", applicationId: payload.applicationId });
    try { state.scope = K.applicationForm(document) || document; } catch (e) { state.scope = document; }
    state.captcha = res.captcha || null;
    state.account = !!res.account;
    // Kaidostar submits on its own only on an employer's hiring system (Greenhouse, Lever, Workday...);
    // on a company's own site the final click is always yours
    try { state.ats = !!(K.onAts && K.onAts(location.hostname, state.data && state.data.ats_domains)); } catch (e) { state.ats = false; }
    state.autoWanted = !!payload.autoSubmit;
    answerQuestions().then(function () {
      // you sent it (or closed the panel) while the answers were on their way: nothing more happens here on its own
      if (state.attempted || state.submitting || state.unconfirmed || state.sent || state.done) return;
      reevaluate();
      var open = openQuestions();
      // (a run picked up on a later page - after you signed in, or clicked Apply - is never submitted on its own: you're
      // there, and the click is yours. Autopilot's is: nobody signed in or clicked - it followed the posting's own link, or
      // the site's check passed by itself - and the page named this job)
      // (Autopilot: only on a page it reached itself, by the posting's own "Apply" link - and never one with a CAPTCHA,
      // even one that only checks you as the form is sent)
      var apOk = !autopilotOn() || (!apCaptchaHint() && (!payload.resumed || payload.waitKind === "apply"));
      if (payload.autoSubmit && (!payload.resumed || autopilotOn()) && apOk && !state.dismissed && state.ats && state.res.canAutoSubmit && !open.length) { startCountdown(6); }
      else {
        render("review"); watchCaptcha();
        if (autopilotOn()) { var w = apWhy(); autopilotEnd("needs_you", w[0], w[1]); }
      }
    });
  }

  // ---- waiting for the person (a sign-in, a browser check, an "Apply" click) ----
  function waitForPerson(payload, kind) {
    if (!IS_TOP || state.done) return;
    var first = !state.waiting;
    state.started = true;
    state.waiting = kind;
    state.applicationId = payload.applicationId;
    state.payload = payload;
    state.data = payload.data || {};
    if (!state.waitSince) state.waitSince = Number(payload && payload.waitSince) || Date.now();   // (the wait began on an earlier page, maybe)
    render("waiting", { kind: kind });
    // the background worker brings Kaidostar back on the next page the site opens (with everything it needs)
    if (first) {
      send({ type: "KAIDOSTAR_WAIT", applicationId: payload.applicationId, kind: kind, payload: payload }).then(function () {
        // Autopilot: a sign-in is yours (said at once); the application form may be behind the posting's own "Apply" link
        if (state.waiting === "apply") apTryLink(payload);
        apWaitCheck();
      });
    }
    if (state.waitTimer) return;
    state.waitTimer = setInterval(function () {
      if (state.done || !state.waiting) { clearInterval(state.waitTimer); state.waitTimer = null; return; }
      apWaitCheck();
      if (Date.now() - state.waitSince > WAIT_MS) {
        // waited long enough: Kaidostar stops here (and says so) - nothing is filled later, when you may not be looking
        clearInterval(state.waitTimer); state.waitTimer = null;
        state.waiting = null;
        render("waitover");
        finished();
        return;
      }
      if (formFoundElsewhere) { stopWaiting(true); return; }
      var scope = null, bk = null;
      try { scope = K.applicationForm(document); bk = K.blockerKind(document, scope); } catch (e) {}
      if (bk && bk.kind !== state.waiting) { state.waiting = bk.kind; render("waiting", { kind: bk.kind }); }
      if (!bk && scope) {
        // a sign-in on the same page (a single-page site): the application is here now
        var kindNow = state.waiting;
        stopWaiting(false);
        run(Object.assign({}, payload, { resumed: true, waitKind: kindNow }));
      }
    }, 1500);
  }
  function stopWaiting(elsewhere) {
    if (state.waitTimer) { clearInterval(state.waitTimer); state.waitTimer = null; }
    state.waiting = null;
    state.started = false;
    if (elsewhere) { try { if (host) { host.remove(); host = null; root = null; } } catch (e) {} }
  }

  // A run Kaidostar picked up again on a later page (after you signed in, or clicked Apply): it fills only a form on a
  // page that names this job - or one you say is its application.
  function plainWords(s) { return String(s || "").toLowerCase().replace(/[\u2019\u2018']/g, "").replace(/[^a-z0-9+#]+/g, " ").trim(); }
  // the page is this job's: its own title says exactly this job ("Data Analyst", "Data Analyst - Acme", "Apply for Data
  // Analyst" - never "Senior Data Analyst"), in a heading, the page's title or its structured data; and the employer's
  // name is on it
  function namesThisJob(title, org) {
    var t = plainWords(title);
    if (!t) return true;
    var heads = [String(document.title || "")];
    try {
      var hs = document.querySelectorAll("h1, h2, h3, [role=heading]");
      for (var i = 0; i < hs.length && i < 30; i++) heads.push(String(hs[i].innerText || hs[i].textContent || ""));
      var pj = K.pageJob ? K.pageJob(document) : null;
      if (pj && pj.n === 1 && pj.title) heads.push(pj.title);
    } catch (e) {}
    var exact = heads.some(function (h) {
      return String(h).split(/\s+[-–—|·]\s+|\s*:\s+|\s+at\s+|\n/).some(function (seg) {
        var p = plainWords(seg).replace(/^(?:apply for|apply to|applying for|application for|job application for|job application)\s+/, "");
        return p === t;
      });
    });
    if (!exact) return false;
    var o = plainWords(org).split(" ").filter(function (w) { return w.length >= 3 && ["the", "inc", "llc", "ltd", "corp", "corporation", "company", "group", "limited"].indexOf(w) < 0; })[0];
    if (!o) return true;
    var text = plainWords(String(document.title || "") + " " + String((document.body && (document.body.innerText || document.body.textContent)) || "").slice(0, 30000));
    return (" " + text + " ").indexOf(" " + o + " ") >= 0;
  }
  function startOn(payload) {
    var title = "";
    try { title = K.jobTitle ? K.jobTitle() : ""; } catch (e) {}
    var named = true;
    try { named = !payload.resumed || namesThisJob(title, (payload.data || {}).listing_org); } catch (e) { named = false; }
    if (payload.resumed && !named) {
      if (state.started) return;
      state.started = true;
      state.applicationId = payload.applicationId;
      state.data = payload.data || {};
      state.payload = payload;
      state.pendingConfirm = Object.assign({}, payload, { autoSubmit: false, autopilot: false });
      render("confirmjob");
      autopilotEnd("needs_you", "the page it reached doesn’t name this job, so it didn’t fill anything there", "page");
      return;
    }
    runNow(payload);
  }

  // Many real ATS forms (Greenhouse embeds, Workday, Ashby, newer Lever) render
  // client-side AFTER the page's load event, so the form usually isn't in the DOM
  // at injection time. Wait for it (up to ~9s, mirroring the server submitter's
  // bounded form-resolve) rather than bailing on the first check — otherwise the
  // extension silently does nothing on exactly the SPA postings it exists for. A
  // frame that never grows a form (e.g. the outer page when the ATS is in an
  // iframe) just stays dormant when the wait elapses. With no form: a sign-in, a
  // browser check or an "Apply" button first - the top frame waits for you.
  function run(payload) {
    if (!K || typeof K.autofill !== "function") return;      // engine missing
    if (state.started) return;                               // already handled here
    payload = payload || {};
    state.payload = payload;
    var d = payload.data || {};
    try { if (K.setJobTitle) K.setJobTitle(d.listing_title || ""); } catch (e) {}
    // a job board's own apply form is never filled or submitted for you - whatever link led here
    var board = false;
    try { board = !!(K.onBoard && K.onBoard(location.hostname, d.board_domains)); } catch (e) {}
    if (board) { if (IS_TOP) stopHere(payload, "board"); return; }
    if (hasApplicationForm()) { announceForm(); startOn(payload); return; }
    var waited = 0;
    var iv = setInterval(function () {
      if (state.started) { clearInterval(iv); return; }
      waited += 400;
      if (hasApplicationForm()) { clearInterval(iv); announceForm(); startOn(payload); return; }
      if (formFoundElsewhere) { clearInterval(iv); return; }
      var bk = null;
      if (IS_TOP && waited >= 1200) { try { bk = K.blockerKind(document, null); } catch (e) {} }
      if (bk) { clearInterval(iv); waitForPerson(payload, bk.kind); return; }
      if (waited >= 9000) {
        clearInterval(iv);
        // nothing here looks like an application form (and no frame on the page found one)
        if (IS_TOP && !formFoundElsewhere) {
          var signup = false;
          try { signup = !!(K.signUpHere && K.signUpHere(document)); } catch (e) {}
          if (signup) stopHere(payload, "noform");     // a talent community or a general application: nothing to wait for
          else waitForPerson(payload, "apply");        // perhaps behind an "Apply" button, or a sign-in
        }
      }
    }, 400);
  }

  function stopHere(payload, mode) {
    if (state.started) return;
    state.started = true;
    state.applicationId = payload.applicationId;
    state.data = payload.data || {};
    render(mode);
    if (mode === "board") autopilotEnd("needs_you", "the link led to a job board (" + location.hostname.replace(/^www\./, "") + "), where Kaidostar never applies for you - apply there yourself", "site");
    else autopilotEnd("needs_you", "the page is a sign-up (a talent community, a newsletter or a general application), not this job’s application - the job may have closed", "page");
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg && msg.type === "KAIDOSTAR_AUTOFILL") {
      try { run(msg.payload || {}); } catch (e) {}
      if (sendResponse) sendResponse({ received: true });
    } else if (msg && msg.type === "KAIDOSTAR_VERIFY") {
      try { verifyAfterClick(msg.payload || {}); } catch (e) {}
      if (sendResponse) sendResponse({ received: true });
    } else if (msg && (msg.type === "KAIDOSTAR_AP_HANDED" || msg.type === "KAIDOSTAR_AP_STOP")) {
      try { apHandOver(msg.type === "KAIDOSTAR_AP_STOP"); } catch (e) {}
      if (sendResponse) sendResponse({ received: true });
    } else if (msg && msg.type === "KAIDOSTAR_NOTED") {
      // the note of the attempt this page is checking has landed (it was still on its way when the page was read)
      if (state.verifying && state.applicationId === msg.applicationId && state.attempt && state.attempt.recorded === null) {
        state.attempt.recorded = !!msg.recorded;
        if (msg.recorded) state.noted = true;
        if (state.unconfirmed && !state.notSentBusy) render("unconfirmed");
      }
      if (sendResponse) sendResponse({ received: true });
    }
    return false;
  });
})();
