/* Kaidostar Apply — content script (runs in the apply page, injected on demand).
 *
 * Receives the applicant data from the background worker, fills the form with the
 * shared, safety-first engine (window.KaidostarFill from form_fill.js), answers the
 * form's other questions ONLY from the person's own answer bank (the server
 * resolves each question and refuses to guess), and shows an in-page review panel.
 * It submits ONLY:
 *   - never on a job board's own form (those sites forbid automated applying);
 *   - never past a login wall or CAPTCHA (the engine reports a blocker → we stop);
 *   - never when a required field can't be filled honestly (a question the answer
 *     bank doesn't cover, a consent checkbox, a missing résumé → we stop and say so),
 *     nor with an answer the form picked by itself that the person never gave;
 *   - otherwise, either on the user's explicit click, or — if they turned on
 *     "submit automatically" AND the form is on an employer's hiring system AND it
 *     is safely fillable — after a visible countdown with a Cancel button.
 * Right before it clicks submit it tells Kaidostar, so a result it never sees (the
 * page moved on, the tab closed) is remembered as "may have gone through" and never
 * opened for a second go. After submitting it verifies a real change (a confirmation
 * page or message that wasn't there before) - on this page, or on the page the form
 * moved to (the background worker reads that one) - before reporting success, and
 * sends that proof (the page, the confirming words, the answers given) to Kaidostar.
 * It never claims a submission it can't confirm. */
(function () {
  "use strict";
  if (window.__kaidostarContentActive) return;
  window.__kaidostarContentActive = true;

  var K = window.KaidostarFill;
  var IS_TOP = (function () { try { return window.top === window; } catch (e) { return false; } })();
  var formFoundElsewhere = false;   // another frame on this page holds the application form

  // Only a frame that holds the application form acts on it - never a newsletter or
  // talent-community signup elsewhere on the page.
  function hasApplicationForm() {
    try { return !!(K && K.applicationForm && K.applicationForm(document)); } catch (e) { return false; }
  }
  if (IS_TOP) {
    window.addEventListener("message", function (e) {
      if (e && e.data && e.data.kaidostar === "form-found") formFoundElsewhere = true;
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
    card.querySelector(".x").addEventListener("click", function () { host.remove(); host = null; root = null; });
    return root;
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
    if (state.qa && state.qa.asked) items.push(["Questions", state.qa.filled + " of " + state.qa.asked + " answered from your answer bank", state.qa.filled > 0]);
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
    coverBusy: false, done: false, payload: null, attempt: null, verifying: false, unconfirmed: false, notSentBusy: false, movedOn: false };

  function finished() {
    if (state.done) return;
    state.done = true;
    send({ type: "KAIDOSTAR_DONE", applicationId: state.applicationId, queued: !!(state.payload && state.payload.queued) });
  }

  function coverFieldPresent() {
    try {
      var sc = state.scope || document;
      return !!sc.querySelector("textarea[name*=cover i], textarea[id*=cover i], textarea[aria-label*='cover letter' i], textarea[placeholder*='cover letter' i], textarea[name='job_application[cover_letter_text]']");
    } catch (e) { return false; }
  }

  function render(mode, extra) {
    var b = ensureBanner()._body;
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
    if (mode === "board") {
      b.innerHTML = head + '<div class="stop">This is a job board (' + esc(location.hostname.replace(/^www\./, "")) + "). Kaidostar never fills or submits a job board’s own form - " +
        "job boards like LinkedIn and Indeed forbid automated applying. Apply on the site yourself; your answers are on the Auto page (Copy my answers).</div>" +
        '<div class="btns"><button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }
    if (mode === "success") {
      b.innerHTML = head + '<div class="good">Application submitted ✓ Kaidostar confirmed it went through and recorded it as sent, with the confirmation as proof.</div>';
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
        "), so mark it submitted on the Auto page (Needs you) to keep your records right.</div>" +
        '<div class="btns"><button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }
    if (mode === "unconfirmed") {
      var rec = !!(state.attempt && state.attempt.recorded);
      b.innerHTML = head +
        '<div class="warn">Clicked submit, but couldn’t confirm it went through. Check this page (or your email for a confirmation). ' +
        (rec ? "Kaidostar has noted it may have gone through, so it won’t open it again for you until you say it didn’t."
             : "Kaidostar couldn’t note this attempt" + (state.attempt && state.attempt.why ? " (" + esc(state.attempt.why) + ")" : "") + ", so this job may still be listed - don’t submit it again if it went through.") +
        " If it didn’t go through, fix what the page asks and submit again.</div>" +
        '<div class="btns"><button class="act ghost" data-a="notsent">' + (state.notSentBusy ? "Saving…" : "It didn’t go through - let me fix it") + "</button>" +
        '<button class="act ghost" data-a="next">Done here</button></div>';
      wire(b);
      return;
    }

    // mode === "review"
    var body = head + (extra && extra.note ? '<div class="warn">' + esc(extra.note) + "</div>" : "") +
      (data.resume_note ? '<div class="info">' + esc(data.resume_note) + "</div>" : "") + filledRows(data, res);
    var missing = openQuestions();
    if (missing.length) {
      body += '<div class="warn">Your answer bank doesn’t cover ' + (missing.length === 1 ? "this required question" : "these required questions") + " - answer on the page:" +
        '<ul class="list">' + missing.slice(0, 6).map(function (m) { return "<li>" + esc(m.label || "a question") + (m.why ? " <span style='color:#aab2c5'>(" + esc(m.why) + ")</span>" : "") + "</li>"; }).join("") + "</ul></div>";
    }
    var reason = res.requiredMissing;
    var dropdownBlocked = !!(reason && /dropdown/i.test(reason));
    var presetBlocked = !!(reason && /already picked|already ticked/i.test(reason));
    if (reason) {
      body += '<div class="warn">Filled what I safely can, but ' + esc(reason) + ". " +
        (dropdownBlocked
          ? "Kaidostar only picks dropdown answers from your answer bank — choose this one on the posting yourself; Submit here unlocks once you have."
          : (presetBlocked ? "Pick your answer on the page - or, if the form’s answer is right, say so here." : "Answer it on the page, then click Submit here.")) +
        (presetBlocked ? '<button class="act ghost" data-a="keep" style="flex:none;margin-top:6px;width:100%">The form’s answer is right - keep it</button>' : "") + "</div>";
    } else if (!res.submitFound) {
      body += '<div class="warn">No submit button found yet — the form may still be loading, or it has more steps. Review, then submit on the page.</div>';
    } else {
      body += '<div class="info">Review the form, then submit. Kaidostar filled it from your Kaidostar profile and answer bank.' +
        (state.autoWanted && !state.ats ? " This form is on the company’s own site, so Kaidostar never submits it on its own here - the click is yours." : "") + "</div>";
    }
    if (!data.cover_letter && coverFieldPresent() && data.cover_letter_policy !== "never") {
      body += '<div class="info">This form has a cover letter box. <button class="act ghost" data-a="cover" style="flex:none;margin-top:6px;width:100%">' + (state.coverBusy ? "Writing…" : "Write one from the posting and my own experience") + "</button></div>";
    }
    if (extra && extra.countdown != null) {
      body += '<div class="warn">Auto-submitting in <span class="count">' + extra.countdown + "</span>s… Cancel to review.</div>";
    }
    var sending = !!(extra && extra.sending);
    var canClick = res.submitFound && !dropdownBlocked && !presetBlocked && !sending;
    body += '<div class="btns">' +
      '<button class="act primary" data-a="submit"' + (canClick ? "" : " disabled") + '>' +
      (sending ? "Submitting…" : (extra && extra.countdown != null ? "Submit now" : "Submit application")) + "</button>" +
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

  function wire(b) {
    var sb = b.querySelector('[data-a="submit"]');
    if (sb) sb.addEventListener("click", function () {
      if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
      doSubmit(false);
    });
    var cb = b.querySelector('[data-a="cancel"]');
    if (cb) cb.addEventListener("click", function () {
      if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; render("review"); return; }
      finished();
      render("review");
    });
    var nb = b.querySelector('[data-a="next"]');
    if (nb) nb.addEventListener("click", function () { finished(); });
    var cv = b.querySelector('[data-a="cover"]');
    if (cv) cv.addEventListener("click", writeCover);
    var ns = b.querySelector('[data-a="notsent"]');
    if (ns) ns.addEventListener("click", notSent);
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
    if (!e || !e.isTrusted || !state.started || state.submitting || state.done || state.unconfirmed || state.verifying) return;
    var t = e.target;
    if (!t || !t.tagName) return;
    var tag = t.tagName.toUpperCase(), type = String(t.getAttribute("type") || "").toLowerCase();
    if (tag !== "SELECT" && type !== "radio" && type !== "checkbox" && tag !== "TEXTAREA" && tag !== "INPUT") return;
    if (tag === "SELECT") t.setAttribute("data-kaido-answered", "1");
    if (state.qa && state.qa.blocking) state.qa.blocking.forEach(function (b) { if (Array.isArray(b.ref) ? b.ref.indexOf(t) >= 0 : b.ref === t) b.ok = true; });
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
    reevaluate();
    render("review");
  }
  document.addEventListener("change", onUserAnswer, true);

  // After a submit, a link you follow (or another form you send) is you moving on: the page it opens is never
  // read as this application's confirmation.
  function movingOn(e) {
    if (!e || !e.isTrusted || !(state.submitting || state.unconfirmed || state.verifying) || !state.applicationId) return;
    var t = e.target;
    if (e.type === "click" && !(t && t.closest && t.closest("a[href], button, [role=button], [role=link], [role=tab], [role=menuitem], input[type=submit], input[type=button]"))) return;
    if (e.type === "submit" && state.scope && (t === state.scope || (state.scope.contains && state.scope.contains(t)))) return;
    state.movedOn = true;   // the check on this page ends too: what you open isn't read as the confirmation
    send({ type: "KAIDOSTAR_STOP_WATCH", applicationId: state.applicationId });
  }
  document.addEventListener("click", movingOn, true);
  document.addEventListener("submit", movingOn, true);

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
    try { submitEl = K.findSubmit(document); } catch (e) {}
    state.res = state.res || {};
    state.res.requiredMissing = reason;
    state.res.submitFound = !!submitEl;
    state.res.canAutoSubmit = !reason && !!submitEl;
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
    // Re-check LIVE at click time: the user may have just answered a required
    // question on the page since we filled the rest. Never submit while any
    // required field is still unsatisfied; instead reflect the current reason and
    // stay in review.
    reevaluate();
    if (state.res.requiredMissing || !state.res.submitFound) {
      if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
      render("review");
      return;
    }
    var submitEl = K.findSubmit(document);
    state.submitting = true;
    var preUrl = location.href;
    var preText = K.confirmationTextPresent(document);
    var answered = (state.qa && state.qa.filled) || 0, given = (state.qa && state.qa.given) || [];
    render("review", { sending: true });
    // Tell Kaidostar first: if the result is never seen (the page moves on, the tab closes), the application
    // is already marked "may have gone through" - never opened for a second go.
    send({ type: "KAIDOSTAR_ATTEMPT", applicationId: state.applicationId, preUrl: preUrl.slice(0, 1000), preText: !!preText,
      answered: answered, answers: given }).then(function (r) {
      var recorded = !!(r && r.ok), status = (r && r.status) || 0;
      state.attempt = { recorded: recorded, why: (r && r.error) || "" };
      if (!recorded && status >= 400 && status < 500) {
        // Kaidostar says no (already sent, permission withdrawn, no longer approved): nothing is submitted
        state.submitting = false;
        render("review", { note: "Kaidostar didn’t submit this: " + (state.attempt.why || "it can’t be submitted right now") + "." });
        return;
      }
      if (auto && !recorded) {
        // an automatic submit happens only once Kaidostar has noted it
        state.submitting = false;
        render("review", { note: "Kaidostar couldn’t reach your account to note this submission first" + (state.attempt.why ? " (" + state.attempt.why + ")" : "") +
          ", so it didn’t submit on its own. Review the form and click Submit application to send it yourself." });
        return;
      }
      try { submitEl.click(); }
      catch (e) {
        state.submitting = false;
        if (recorded) send({ type: "KAIDOSTAR_NOT_SENT", applicationId: state.applicationId });
        state.attempt = null;
        render("review", { note: "Couldn’t press the form’s submit button - submit it on the page yourself." });
        return;
      }
      waitForConfirmation(preUrl, preText, answered, given);
    });
  }

  // Poll for a real confirmation (SPA forms confirm without navigating; when the page does navigate, this
  // script ends with it and the background worker reads the new page instead).
  function waitForConfirmation(preUrl, preText, answered, given) {
    var waited = 0;
    var iv = setInterval(function () {
      waited += 500;
      var confirmed = false;
      if (!state.movedOn) { try { confirmed = K.looksConfirmed(window, preUrl, preText); } catch (e) {} }
      if (confirmed) { clearInterval(iv); recordConfirmed(answered, given); return; }
      if (waited >= 12000 || state.movedOn) {
        clearInterval(iv);
        state.submitting = false;
        state.unconfirmed = true;
        render("unconfirmed");
      }
    }, 500);
  }

  function recordConfirmed(answered, given) {
    var proof = { url: location.href.slice(0, 1000), phrase: (K.confirmationPhrase ? K.confirmationPhrase(document) : "").slice(0, 200),
      answered: answered || 0, answers: given || [] };
    send({ type: "KAIDOSTAR_CONFIRM_SUBMIT", applicationId: state.applicationId, proof: proof }).then(function (r) {
      if (r && r.ok) { render("success"); setTimeout(finished, 1200); }
      else render("unrecorded", { why: (r && r.error) || "" });
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
    if (!(state.attempt && state.attempt.recorded)) { back(); return; }
    state.notSentBusy = true; render("unconfirmed");
    send({ type: "KAIDOSTAR_NOT_SENT", applicationId: state.applicationId }).then(function (r) {
      state.notSentBusy = false;
      if (r && r.ok) { back(); return; }
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
    state.attempt = { recorded: !!v.recorded, why: "" };
    var tries = 0;
    var iv = setInterval(function () {
      tries += 1;
      var ok = false;
      if (!state.movedOn) { try { ok = K.looksConfirmed(window, String(v.preUrl || ""), !!v.preText); } catch (e) {} }
      if (ok) { clearInterval(iv); recordConfirmed(v.answered, v.answers); return; }
      if (tries >= 16 || state.movedOn) { clearInterval(iv); state.unconfirmed = true; render("unconfirmed"); }
    }, 500);
  }

  // The form's other questions -> the server answers what the answer bank covers -> fill those.
  function answerQuestions() {
    var collected;
    try { collected = K.collectQuestions(state.scope || document); } catch (e) { collected = null; }
    if (!collected || !collected.questions.length) { state.qa = { asked: 0, filled: 0, missingRequired: [], given: [], blocking: [] }; return Promise.resolve(); }
    return send({ type: "KAIDOSTAR_RESOLVE_ANSWERS", applicationId: state.applicationId, questions: collected.questions }).then(function (r) {
      var answers = (r && r.ok && Array.isArray(r.answers)) ? r.answers : [];
      var filled = 0;
      try { filled = K.applyAnswers(collected.refs, answers); } catch (e) {}
      var missingRequired = answers.filter(function (a) { return a && a.missing && a.required; })
        .map(function (a) { return { i: a.i, label: (collected.questions[a.i] || {}).label || "", why: a.why || "" }; });
      var given = answers.filter(function (a) { return a && !a.missing; })
        .map(function (a) { return { label: ((collected.questions[a.i] || {}).label || "").slice(0, 120), answer: String(a.answer || "").slice(0, 120) }; });
      var blocking = answers.filter(function (a) { return a && a.missing && a.blocking && collected.refs[a.i]; })
        .map(function (a) { var q = collected.questions[a.i] || {}; return { i: a.i, ref: collected.refs[a.i], current: q.current || "", label: (q.label || "").slice(0, 120), checkbox: q.type === "checkbox" }; });
      if (!(r && r.ok)) {
        // the answers couldn't be checked: no answer the form picked by itself is trusted for an automatic submit
        blocking = collected.questions.map(function (q, i) { return q && q.preset ? { i: i, ref: collected.refs[i], current: q.current || "", label: (q.label || "").slice(0, 120), checkbox: q.type === "checkbox" } : null; })
          .filter(function (b) { return b && b.ref; });
      }
      state.qa = { asked: collected.questions.length, filled: filled, missingRequired: missingRequired, given: given.slice(0, 40), blocking: blocking, resolved: !!(r && r.ok) };
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
    if (res.blocker) { render("blocked"); return; }
    try { state.scope = K.applicationForm(document) || document; } catch (e) { state.scope = document; }
    // Kaidostar submits on its own only on an employer's hiring system (Greenhouse, Lever, Workday...);
    // on a company's own site the final click is always yours
    try { state.ats = !!(K.onAts && K.onAts(location.hostname, state.data && state.data.ats_domains)); } catch (e) { state.ats = false; }
    state.autoWanted = !!payload.autoSubmit;
    answerQuestions().then(function () {
      reevaluate();
      var open = openQuestions();
      if (payload.autoSubmit && state.ats && state.res.canAutoSubmit && !open.length) { startCountdown(6); }
      else { render("review"); }
    });
  }

  // Many real ATS forms (Greenhouse embeds, Workday, Ashby, newer Lever) render
  // client-side AFTER the page's load event, so the form usually isn't in the DOM
  // at injection time. Wait for it (up to ~9s, mirroring the server submitter's
  // bounded form-resolve) rather than bailing on the first check — otherwise the
  // extension silently does nothing on exactly the SPA postings it exists for. A
  // frame that never grows a form (e.g. the outer page when the ATS is in an
  // iframe) just stays dormant when the wait elapses.
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
    if (hasApplicationForm()) { announceForm(); runNow(payload); return; }
    var waited = 0;
    var iv = setInterval(function () {
      if (state.started) { clearInterval(iv); return; }
      waited += 400;
      if (hasApplicationForm()) { clearInterval(iv); announceForm(); runNow(payload); return; }
      if (waited >= 9000) {
        clearInterval(iv);
        // nothing here looks like an application form (and no frame on the page found one): say so, do nothing
        if (IS_TOP && !formFoundElsewhere) stopHere(payload, "noform");
      }
    }, 400);
  }

  function stopHere(payload, mode) {
    if (state.started) return;
    state.started = true;
    state.applicationId = payload.applicationId;
    state.data = payload.data || {};
    render(mode);
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg && msg.type === "KAIDOSTAR_AUTOFILL") {
      try { run(msg.payload || {}); } catch (e) {}
      if (sendResponse) sendResponse({ received: true });
    } else if (msg && msg.type === "KAIDOSTAR_VERIFY") {
      try { verifyAfterClick(msg.payload || {}); } catch (e) {}
      if (sendResponse) sendResponse({ received: true });
    }
    return false;
  });
})();
