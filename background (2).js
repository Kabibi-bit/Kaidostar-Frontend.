/* Kaidostar Apply — background service worker.
 *
 * Orchestrates "apply in your own browser" runs:
 *   1. the popup asks to apply one accepted application (or to work through all
 *      the ready ones, one tab at a time);
 *   2. we fetch that application's real data + résumé from the Kaidostar backend
 *      using the signed-in user's token — the SAME Pro+consent gate is enforced
 *      server-side, so a tampered client still can't unlock it;
 *   3. we open the posting's real apply URL in a new tab;
 *   4. when that tab finishes loading we inject the shared fill engine
 *      (form_fill.js) + the content script into it (all frames, so an ATS embedded
 *      in an iframe still works), and hand over the data;
 *   5. the content script fills, asks us to answer the form's other questions
 *      from the person's own answer bank (the server decides, and refuses to
 *      guess), shows an in-page review panel, and — only if the form is safely
 *      fillable — submits and confirms. A confirmed submission is recorded with
 *      its proof (the confirmation page and words, the answers given);
 *   6. right before the click, the attempt is noted on the server (so a result we
 *      never see is "may have gone through", never retried), and if the form's
 *      frame then loads a new page we read that page for the confirmation.
 * Job boards (LinkedIn, Indeed...) are never filled: the server refuses to open
 * them, and the content script stops on one whatever link led there.
 *
 * A step only the person can do - signing in, a site's check that a real person is
 * visiting, an "Apply" button before the form - makes the page wait for them. That tab
 * is remembered (with what the run needs), its icon badge shows "!", and when the site
 * opens its next page (on the employer's own site or hiring system - never another
 * site, such as a Google or Okta sign-in in between), Kaidostar is brought back there
 * to carry on. Waiting ends when the form is being filled, when the person stops it,
 * when the tab closes, or after 30 minutes.
 *
 * Autopilot (when you turn it on): while Chrome is open, every 20 minutes - and when you click "Run now" - it asks
 * Kaidostar for the next application it may apply to on its own (one approved by you, or by Auto after your undo
 * window, on an employer's hiring system), and applies to it in a minimized window of its own: the same fill, the
 * same rules, the same proof as above, with nobody's click. It submits only when every rule passes; anything that
 * needs you (a question your answer bank doesn't cover, a CAPTCHA, a sign-in, a company's own site) is left on the
 * Auto page with the reason, and its tab is closed. One at a time, a short gap between them, at most 15 a run. Click or
 * type in one of its tabs and that application is yours: Autopilot stops for now and leaves it to you.
 *
 * The token never leaves this extension: it's read from chrome.storage and sent
 * only to the configured Kaidostar backend, never to the job site. */
"use strict";

const DEFAULT_BASE = "https://kaidostar-backhend.onrender.com";

// tabId -> { applicationId, data, resume, autoSubmit, injected, queued }
const pendingByTab = {};
// tabId -> the submit just clicked in that tab: { applicationId, frameId, preUrl, preText, answered, answers,
// recorded, at, checks }. When the form's frame then loads a new page, that page is read for the confirmation.
const awaitingByTab = {};
const AWAIT_MS = 120000;
// kept in session storage too: the browser may stop this worker between the click and the next page
function keepAwaiting(tabId) {
  try {
    const v = awaitingByTab[tabId];
    if (v) chrome.storage.session.set({ ["aw_" + tabId]: v }); else chrome.storage.session.remove("aw_" + tabId);
  } catch (e) {}
}
async function awaitingFor(tabId) {
  if (awaitingByTab[tabId]) return awaitingByTab[tabId];
  try {
    const o = await chrome.storage.session.get("aw_" + tabId);
    if (o && o["aw_" + tabId]) awaitingByTab[tabId] = o["aw_" + tabId];
  } catch (e) {}
  return awaitingByTab[tabId] || null;
}
function dropAwaiting(tabId, applicationId) {
  if (tabId == null) return;
  const aw = awaitingByTab[tabId];
  if (aw && (applicationId == null || aw.applicationId === applicationId)) { delete awaitingByTab[tabId]; keepAwaiting(tabId); }
}

// tabId -> a run waiting for the person (a sign-in, a browser check, an "Apply" click): { applicationId, kind, payload,
// since, origin, injections }. Kept in session storage too (the worker may sleep while you sign in).
const waitingByTab = {};
const WAIT_MS = 30 * 60 * 1000;
const WAIT_PAGES = 30;
function keepWaiting(tabId) {
  try {
    const v = waitingByTab[tabId];
    if (v) chrome.storage.session.set({ ["wt_" + tabId]: v }); else chrome.storage.session.remove("wt_" + tabId);
  } catch (e) {}
}
async function waitingFor(tabId) {
  if (waitingByTab[tabId]) return waitingByTab[tabId];
  try {
    const o = await chrome.storage.session.get("wt_" + tabId);
    if (o && o["wt_" + tabId]) waitingByTab[tabId] = o["wt_" + tabId];
  } catch (e) {}
  return waitingByTab[tabId] || null;
}
// the first way, else the second (an older browser may not take the first)
function tryBoth(first, second) {
  const fb = () => { try { const r2 = second(); if (r2 && r2.catch) r2.catch(() => {}); } catch (e) {} };
  try { const r = first(); if (r && r.catch) r.catch(fb); } catch (e) { fb(); }
}
function badge(tabId, on) {
  try {
    if (on) {
      chrome.action.setBadgeText({ tabId, text: "!" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#f2c94c" });
      chrome.action.setTitle({ tabId, title: "Kaidostar Apply is waiting for you in this tab" });
    } else {
      // (back to what the extension shows everywhere - Autopilot's count, if any)
      tryBoth(() => chrome.action.setBadgeText({ tabId, text: null }), () => chrome.action.setBadgeText({ tabId, text: "" }));
      tryBoth(() => chrome.action.setTitle({ tabId, title: null }), () => chrome.action.setTitle({ tabId, title: "Kaidostar Apply" }));
    }
  } catch (e) {}
}
async function dropWaiting(tabId, applicationId) {
  if (tabId == null) return;
  const wt = await waitingFor(tabId);
  if (wt && (applicationId == null || wt.applicationId === applicationId)) {
    delete waitingByTab[tabId];
    keepWaiting(tabId);
    badge(tabId, false);
  }
}
// The page asks for a step only you can do: remember the run, so the next page the site opens carries on.
async function noteWaiting(msg, sender) {
  const tabId = sender && sender.tab && sender.tab.id;
  if (tabId == null || (sender.frameId || 0) !== 0 || !msg || !msg.applicationId) return { ok: false };
  const prev = (await waitingFor(tabId)) || {};
  const p = msg.payload || {};
  const pending = pendingByTab[tabId] || {};
  const payload = {
    applicationId: msg.applicationId, data: p.data || pending.data || {}, resume: p.resume || pending.resume || null,
    autoSubmit: !!(p.autoSubmit !== undefined ? p.autoSubmit : pending.autoSubmit), queued: !!(p.queued || pending.queued),
    handed: !!(pending.handed || p.handed || (prev.applicationId === msg.applicationId && prev.payload && prev.payload.handed)),
    lease: String(p.lease || pending.lease || "").slice(0, 64),
  };
  // (Autopilot's - unless you've taken it over since: then it's yours, and the click is yours)
  payload.autopilot = !!(p.autopilot || pending.autopilot) && !payload.handed;
  if (payload.handed) payload.autoSubmit = false;
  const origin = prev.applicationId === msg.applicationId && prev.origin ? prev.origin
    : String((payload.data && payload.data.apply_url) || (sender.tab && sender.tab.url) || "");
  waitingByTab[tabId] = {
    applicationId: msg.applicationId, kind: String(msg.kind || "apply"), payload, origin,
    since: prev.applicationId === msg.applicationId && prev.since ? prev.since : Date.now(),
    injections: prev.applicationId === msg.applicationId ? (prev.injections || 0) : 0,
    follows: prev.applicationId === msg.applicationId ? (prev.follows || 0) : 0,
  };
  keepWaiting(tabId);
  badge(tabId, true);
  // the step is yours: the tab comes to the front (in a queue you may be looking at another one) - not for Autopilot,
  // which never takes the focus from what you're doing
  if (!payload.autopilot) { try { await chrome.tabs.update(tabId, { active: true }); } catch (e) {} }
  return { ok: true };
}

async function getConfig() {
  const { kaidostar_cfg, kaidostar_ap_on } = await chrome.storage.local.get(["kaidostar_cfg", "kaidostar_ap_on"]);
  const cfg = Object.assign({ baseUrl: DEFAULT_BASE, autoSubmit: false }, kaidostar_cfg || {});
  // the old default address is gone - anyone still on it is moved to the real one
  if (/scanline-backend\.onrender\.com/i.test(cfg.baseUrl || "")) cfg.baseUrl = DEFAULT_BASE;
  // (Autopilot's on/off is kept on its own: the popup saving another setting never undoes it)
  cfg.autopilot = kaidostar_ap_on === true;
  return cfg;
}
async function getAuth() {
  const { kaidostar_auth } = await chrome.storage.local.get("kaidostar_auth");
  return kaidostar_auth || null;
}
function baseOf(cfg) {
  return String(cfg.baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
}
async function safeJson(r) { try { return await r.json(); } catch (e) { return null; } }

function abToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function api(path, opts) {
  const a = await getAuth();
  if (!a || !a.token) return { ok: false, status: 401, data: null };
  const cfg = await getConfig();
  const headers = Object.assign({ Authorization: "Bearer " + a.token }, (opts && opts.body) ? { "Content-Type": "application/json" } : {});
  let r;
  try {
    r = await fetch(baseOf(cfg) + path, { method: (opts && opts.method) || "GET", headers, body: (opts && opts.body) ? JSON.stringify(opts.body) : undefined });
  } catch (e) {
    return { ok: false, status: 0, data: null };
  }
  return { ok: r.ok, status: r.status, data: await safeJson(r), raw: r };
}

// An application already open in a tab is never opened in a second one (two tabs could submit it twice):
// that tab is brought to the front instead.
async function openTabFor(applicationId) {
  for (const k of Object.keys(pendingByTab)) {
    const p = pendingByTab[k];
    if (!p || p.applicationId !== applicationId) continue;
    try {
      const t = await chrome.tabs.get(Number(k));
      if (t) return t;
    } catch (e) { delete pendingByTab[k]; }
  }
  // ... or one waiting for you (a sign-in), or checking a submit - also after the browser restarted this worker
  try {
    const all = await chrome.storage.session.get(null);
    for (const key of Object.keys(all || {})) {
      if (!/^(?:wt|aw)_\d+$/.test(key) || !all[key] || all[key].applicationId !== applicationId) continue;
      try {
        const t = await chrome.tabs.get(Number(key.slice(3)));
        if (t) return t;
      } catch (e) { chrome.storage.session.remove(key); }
    }
  } catch (e) {}
  return null;
}

// opts.autopilot: Autopilot is applying to it on its own - in its own window (opts.windowId, made when there's none),
// never taking the focus from what you're doing
async function startAutofill(applicationId, queued, opts) {
  opts = opts || {};
  const a = await getAuth();
  if (!a || !a.token) return { ok: false, error: "Sign in through the Kaidostar extension first." };
  const cfg = await getConfig();
  const base = baseOf(cfg);
  const open = await openTabFor(applicationId);
  if (open) {
    if (!opts.autopilot) {
      // (Autopilot is applying to it right now: you opening it makes it yours - nothing more happens there on its own)
      const taken = await apTakeOverTab(open.id);
      try { await chrome.tabs.update(open.id, { active: true }); } catch (e) {}
      try { await chrome.windows.update(open.windowId, { focused: true, state: "normal" }); } catch (e) {}
      if (taken) {
        if (queued) {
          // (in your queue: it waits for you to finish this one, as for any other)
          pendingByTab[open.id] = pendingByTab[open.id] || { applicationId, injected: true };
          pendingByTab[open.id].queued = true; pendingByTab[open.id].advanced = false;
        }
        return { ok: !!queued, open: true, status: 409, tabId: open.id, error: "Autopilot was applying to this one - it's yours now: finish it in that tab." };
      }
    }
    return { ok: false, open: true, status: 409, error: "This application is already open in another tab - finish it there." };
  }

  let r;
  try {
    // (Autopilot opens only one Kaidostar gave it; one you open yourself is yours from then on - Autopilot leaves it)
    r = await fetch(base + "/applications/" + encodeURIComponent(applicationId) + "/autofill" +
      (opts.autopilot ? "?autopilot=1&lease=" + encodeURIComponent(String(opts.lease || "")) : ""), {
      headers: { Authorization: "Bearer " + a.token },
    });
  } catch (e) {
    return { ok: false, status: 0, error: "Couldn't reach Kaidostar at " + base + ". Check the backend URL in settings." };
  }
  if (r.status === 401) return { ok: false, status: 401, error: "Your session expired — sign in again." };
  if (r.status === 403) {
    const d = await safeJson(r);
    return { ok: false, status: 403, error: (d && d.detail) || "This needs Kaidostar Pro and your permission to auto-submit." };
  }
  if (r.status === 409 || r.status === 400) {
    // already sent, being sent by Kaidostar right now, or not approved yet - never opened twice
    const d = await safeJson(r);
    return { ok: false, status: r.status, error: (d && d.detail) || "This application can't be opened right now." };
  }
  if (!r.ok) return { ok: false, status: r.status, error: "Couldn't load this application (HTTP " + r.status + ")." };
  const data = await safeJson(r);
  if (!data || !data.apply_url || !/^https?:\/\//i.test(data.apply_url)) {
    return { ok: false, status: 422, error: "This application has no apply link to open." };
  }
  // the application form's own page, when the hiring system keeps it apart from the job's page (Lever, Ashby,
  // Workable): opened straight away - only ever the same employer's, the same job's
  const formUrl = (typeof data.form_url === "string" && /^https?:\/\//i.test(data.form_url) &&
    sameEmployer(data.apply_url, data.form_url, data.ats_domains || [])) ? data.form_url : "";

  // The résumé Kaidostar chose for this job (best-effort). If it's missing and the
  // form requires a file, the content script's safety guard blocks auto-submit
  // rather than sending without one.
  let resume = null;
  if (data.resume_available && data.resume_url) {
    try {
      const rr = await fetch(base + data.resume_url, { headers: { Authorization: "Bearer " + a.token } });
      if (rr.ok) {
        const buf = await rr.arrayBuffer();
        resume = {
          b64: abToB64(buf),
          name: ((data.full_name || "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Resume") + "_Resume.docx",
          type: rr.headers.get("content-type") ||
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
      }
    } catch (e) { /* non-fatal — proceed without the file */ }
  }

  let tab, w = null;
  try {
    if (opts.autopilot) {
      if (opts.windowId != null) { try { w = await chrome.windows.get(opts.windowId); } catch (e) { w = null; } }
      if (!w) w = await apWindow();
      // (behind its status page: a window of its you've brought up never has its view taken by the next one)
      tab = await chrome.tabs.create({ windowId: w.id, url: formUrl || data.apply_url, active: false });
    } else {
      // (in a window of yours - never Autopilot's minimized one)
      const wid = await personWindowId();
      if (wid != null) tab = await chrome.tabs.create({ windowId: wid, url: formUrl || data.apply_url });
      else { const nw = await chrome.windows.create({ url: formUrl || data.apply_url, focused: true }); tab = nw.tabs[0]; }
    }
  } catch (e) {
    return { ok: false, status: 0, error: "Couldn't open the apply page.", windowId: w ? w.id : null };
  }
  // (Autopilot submits on its own wherever every rule allows it - its whole point; your own runs follow your setting)
  pendingByTab[tab.id] = { applicationId, data, resume, autoSubmit: opts.autopilot ? true : !!cfg.autoSubmit, autopilot: !!opts.autopilot,
    lease: opts.autopilot ? String(opts.lease || "") : "", injected: false, queued: !!queued };
  return { ok: true, tabId: tab.id, windowId: tab.windowId };
}

// The window you're using (the last one you had in front - not one of Autopilot's): null when there's none.
async function personWindowId() {
  try {
    const all = await chrome.windows.getAll({ windowTypes: ["normal"], populate: true });
    const theirs = all.filter((x) => !apIsItsWindow(x));
    const last = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => null);
    if (last && theirs.some((x) => x.id === last.id)) return last.id;
    const w = theirs.find((x) => x.state !== "minimized") || theirs[0];
    return w ? w.id : null;
  } catch (e) { return null; }
}

function whyNot(res) {
  return (res.data && typeof res.data.detail === "string" && res.data.detail) ||
    (res.status === 0 ? "couldn't reach Kaidostar" : res.status === 401 ? "your sign-in expired" : "HTTP " + res.status);
}

async function confirmSubmit(applicationId, proof, tabId) {
  const res = await api("/applications/" + encodeURIComponent(applicationId) + "/confirm-autofill-submit",
    { method: "POST", body: proof && typeof proof === "object" ? proof : {} });
  if (res.ok) {
    dropAwaiting(tabId, applicationId);
    apSent(tabId, applicationId);
    return { ok: true };
  }
  return { ok: false, error: whyNot(res), status: res.status };
}

// Right before the content script clicks submit (or as you submit it yourself, msg.own): Kaidostar notes the attempt,
// so a result the extension never sees isn't retried. The tab is watched from this moment - before Kaidostar has heard
// back: a submit of yours is already on its way, and the page it goes to may load first. If the form's frame loads a
// new page, that page is read.
const attemptPending = {};   // tabId -> the note still on its way (the page read waits a little for it)
async function noteAttempt(msg, sender) {
  const tabId = sender && sender.tab && sender.tab.id;
  if (tabId != null) {
    const p = pendingByTab[tabId] || (waitingByTab[tabId] && waitingByTab[tabId].payload) || {};
    awaitingByTab[tabId] = {
      applicationId: msg.applicationId, frameId: sender.frameId || 0, preUrl: String(msg.preUrl || "").slice(0, 1000), preText: !!msg.preText,
      answered: msg.answered | 0, answers: Array.isArray(msg.answers) ? msg.answers.slice(0, 40) : [], recorded: false, own: !!msg.own,
      at: Date.now(), checks: 0,
      payload: { applicationId: msg.applicationId, data: p.data, resume: p.resume, autoSubmit: false, queued: p.queued,
        autopilot: !!(p.autopilot || msg.autopilot) && !p.handed },
    };
    keepAwaiting(tabId);
  }
  // Autopilot's own click: only while the application is still Autopilot's - this browser's lease (you didn't open it
  // yourself meanwhile), and never once its tab is yours or it stopped there
  const byAutopilot = !msg.own && !!msg.autopilot;
  if (byAutopilot && tabId != null) {
    const wt0 = await waitingFor(tabId);
    if ((pendingByTab[tabId] && pendingByTab[tabId].handed) || (wt0 && wt0.payload && wt0.payload.handed)) {
      return { ok: false, status: 409, error: "Autopilot stopped there, so it doesn't submit it" };
    }
  }
  let leaseOf = (tabId != null && pendingByTab[tabId] && pendingByTab[tabId].lease) || String(msg.lease || "");
  if (byAutopilot && !leaseOf && tabId != null) {
    const run = await apGetRun();          // (the browser restarted this worker: the run still knows it)
    if (run && run.cur && run.cur.tabId === tabId) leaseOf = run.cur.lease || "";
  }
  const call = (async () => {
    if (tabId != null && !(awaitingByTab[tabId] && awaitingByTab[tabId].payload.data)) {
      // (the browser restarted this worker while the run waited for you: what it needs is in the waiting note)
      const wt = await waitingFor(tabId);
      const aw = awaitingByTab[tabId];
      if (wt && wt.payload && aw && aw.applicationId === msg.applicationId) {
        Object.assign(aw.payload, { data: wt.payload.data, resume: wt.payload.resume, queued: wt.payload.queued, autopilot: !!wt.payload.autopilot });
        keepAwaiting(tabId);
      }
    }
    await dropWaiting(tabId, msg.applicationId);
    // (a submit of yours: noted whatever - also when an earlier one of yours already is)
    return api("/applications/" + encodeURIComponent(msg.applicationId) + "/submit-attempt" +
      (msg.own ? "?own=1" : byAutopilot ? "?autopilot=1&lease=" + encodeURIComponent(leaseOf) : ""), { method: "POST" });
  })();
  if (tabId != null) attemptPending[tabId] = call;
  const res = await call;
  if (tabId != null && attemptPending[tabId] === call) delete attemptPending[tabId];
  // (the application Autopilot is on was clicked - by it, or by you: however its go ends now, it may have gone through)
  if (res.ok && tabId != null) apMarkAttempted(tabId, msg.applicationId);
  const aw = tabId != null ? awaitingByTab[tabId] : null;
  if (aw && aw.applicationId === msg.applicationId) {
    // Kaidostar's own click comes now, once it has heard back: the page the form goes to is expected from now
    if (!msg.own && !aw.read && !aw.commit) aw.at = Date.now();
    if (res.ok) aw.recorded = true;
    keepAwaiting(tabId);
    // Kaidostar said no (already sent, permission withdrawn...): its own click doesn't happen, so no page is read for it.
    // A submit of yours did happen - its page is still read.
    if (!res.ok && res.status >= 400 && res.status < 500 && !msg.own) dropAwaiting(tabId, msg.applicationId);
    // the page the form went to was read while this was on its way: it's told now
    if (aw.read) {
      try { chrome.tabs.sendMessage(tabId, { type: "KAIDOSTAR_NOTED", applicationId: msg.applicationId, recorded: !!res.ok }, { frameId: aw.frameId }).catch(() => {}); } catch (e) {}
    }
  }
  if (res.ok) return { ok: true };
  return { ok: false, error: whyNot(res), status: res.status };
}

async function noteNotSent(applicationId, tabId, tookBack) {
  const res = await api("/applications/" + encodeURIComponent(applicationId) + "/not-sent" + (tookBack ? "?took_back=1" : ""), { method: "POST" });
  if (res.ok && tookBack && tabId != null) apUnmarkAttempted(tabId, applicationId);
  dropAwaiting(tabId, applicationId);
  if (res.ok) return { ok: true };
  return { ok: false, error: whyNot(res), status: res.status };
}

// Only the submit's own navigation is read: the page the form goes to within moments of the click, and the
// redirects that follow it on the same site. Anything you do yourself - type an address, use a bookmark, go
// back, reload, follow a link once a page has been read - ends the watch, so your inbox or another job's page is
// never taken as this application's confirmation.
const PERSON_NAV = ["typed", "auto_bookmark", "generated", "keyword", "keyword_generated", "reload", "start_page"];
const FIRST_NAV_MS = 20000;
// (a country's second-level domains: acme.co.uk is the site, not co.uk)
const SECOND_LEVEL = /^(?:co|com|org|net|ac|gov|edu|ltd|plc|gen|firm|ind|nic)\.[a-z]{2}$/;
function siteOf(url) {
  const m = /^https?:\/\/([^/?#:]+)/i.exec(String(url || ""));
  const host = m ? m[1].toLowerCase() : "";
  const parts = host.split(".");
  if (parts.length >= 3 && SECOND_LEVEL.test(parts.slice(-2).join("."))) return parts.slice(-3).join(".");
  return parts.length >= 2 ? parts.slice(-2).join(".") : host;
}
function sameSite(a, b, ats) {
  const sa = siteOf(a), sb = siteOf(b);
  if (sa && sa === sb) return true;
  const hb = (/^https?:\/\/([^/?#:]+)/i.exec(String(b || "")) || [])[1] || "";
  const ha = (/^https?:\/\/([^/?#:]+)/i.exec(String(a || "")) || [])[1] || "";
  const onAts = (h) => (ats || []).some((d) => { d = String(d).toLowerCase(); h = String(h).toLowerCase(); return h === d || h.endsWith("." + d); });
  return onAts(ha) && onAts(hb);
}
// The same employer's part of a site: on a hiring system that holds many employers, the same one of them - one host
// (acme.wd5.myworkdayjobs.com, acme.icims.com) or, on the shared hosts, the same first part of the path
// (boards.greenhouse.io/acme, jobs.lever.co/acme) or SuccessFactors' ?company=; on a company's own site, any page of it.
const PATH_TENANT_HOSTS = ["boards.greenhouse.io", "job-boards.greenhouse.io", "boards.eu.greenhouse.io", "job-boards.eu.greenhouse.io", "jobs.lever.co",
  "jobs.eu.lever.co", "jobs.ashbyhq.com", "jobs.smartrecruiters.com", "careers.smartrecruiters.com", "apply.workable.com", "jobs.jobvite.com",
  "app.dover.com", "ats.rippling.com", "recruiting.ultipro.com", "recruiting2.ultipro.com", "recruiting.paylocity.com", "app.jazz.co", "jobs.bamboohr.com"];
function hostOf(url) { const m = /^https?:\/\/([^/?#:]+)/i.exec(String(url || "")); return m ? m[1].toLowerCase() : ""; }
function tenantOf(url) {
  const host = hostOf(url);
  let u = null;
  try { u = new URL(String(url || "")); } catch (e) { return host; }
  if (PATH_TENANT_HOSTS.indexOf(host) >= 0) return host + "/" + ((u.pathname.split("/")[1] || "").toLowerCase());
  if (/(?:^|\.)successfactors\.(?:com|eu)$/.test(host)) return host + "?" + String(u.searchParams.get("company") || "").toLowerCase();
  return host;
}
function sameEmployer(origin, url, ats) {
  const ho = hostOf(origin), hu = hostOf(url);
  const onAts = (h) => !!h && (ats || []).some((d) => { d = String(d).toLowerCase(); return h === d || h.endsWith("." + d); });
  if (onAts(ho) || onAts(hu)) return tenantOf(origin) === tenantOf(url);
  return !!siteOf(origin) && siteOf(origin) === siteOf(url);
}
async function watchCommit(d) {
  const aw = await awaitingFor(d.tabId);
  if (!aw || d.frameId !== aw.frameId) return;
  const q = d.transitionQualifiers || [];
  const byPerson = PERSON_NAV.indexOf(d.transitionType) >= 0 || q.indexOf("forward_back") >= 0 || q.indexOf("from_address_bar") >= 0;
  const late = Date.now() - aw.at > (aw.read ? AWAIT_MS : FIRST_NAV_MS);
  const ats = (aw.payload && aw.payload.data && aw.payload.data.ats_domains) || [];
  // after the submit's own page (read, or still loading), only what that page does by itself counts: a script or
  // meta redirect, or a form it posts on - never a link you click, even one the server then redirects
  const onward = q.indexOf("client_redirect") >= 0 || d.transitionType === "form_submit";
  if (byPerson || late || ((aw.read || aw.commit) && !onward) || !sameSite(aw.preUrl, d.url, ats)) {
    const elsewhere = !byPerson && !late && !(aw.read || aw.commit) && !sameSite(aw.preUrl, d.url, ats);
    dropAwaiting(d.tabId);
    // (Autopilot's click took the form to another site, whose page isn't read: it may well say "thank you" - kept for you)
    if (elsewhere && aw.payload && aw.payload.autopilot) {
      apEndTab(d.tabId, aw.applicationId, "unconfirmed", "after the click the form went to another site (" + hostOf(d.url) + "), which Kaidostar doesn't read for the confirmation - check that page (its tab is kept open for you) or your email", "page", true);
    }
    return;
  }
  aw.commit = d.url;
  keepAwaiting(d.tabId);
}
if (chrome.webNavigation && chrome.webNavigation.onCommitted) chrome.webNavigation.onCommitted.addListener(watchCommit);

// The form's frame finished loading the page the submit went to: read it for the employer's confirmation.
async function verifyNewPage(details) {
  const aw = await awaitingFor(details.tabId);
  if (!aw || details.frameId !== aw.frameId) return;
  if (Date.now() - aw.at > AWAIT_MS || aw.checks >= 4) { dropAwaiting(details.tabId); return; }
  if (!/^https?:/i.test(String(details.url || ""))) return;
  if (!aw.commit) {
    // the browser may have had this worker asleep when the page committed: then only the first page on the same
    // site, moments after the click, is read
    const ats = (aw.payload && aw.payload.data && aw.payload.data.ats_domains) || [];
    if (aw.read || Date.now() - aw.at > FIRST_NAV_MS || !sameSite(aw.preUrl, details.url, ats)) return;
  } else if (aw.commit !== details.url) return;
  aw.checks += 1;
  aw.read = true;
  aw.commit = null;
  keepAwaiting(details.tabId);
  // the note of the attempt may still be on its way (you submitted it yourself, and the page came back first): what the
  // page then says about it is right only once it's known
  const pend = attemptPending[details.tabId];
  if (pend) {
    try { await Promise.race([pend, new Promise((res) => setTimeout(res, 4000))]); } catch (e) {}
    if (awaitingByTab[details.tabId] !== aw) return;   // Kaidostar said no to it: nothing was clicked, so nothing is read
  }
  // (still on its way: the page is told "being noted", and told again once it is)
  const noted = attemptPending[details.tabId] ? null : !!aw.recorded;
  try {
    await chrome.scripting.executeScript({ target: { tabId: details.tabId, frameIds: [details.frameId] }, files: ["form_fill.js", "content.js"] });
    await new Promise((res) => setTimeout(res, 200));
    await chrome.tabs.sendMessage(details.tabId, {
      type: "KAIDOSTAR_VERIFY",
      payload: { applicationId: aw.applicationId, preUrl: aw.preUrl, preText: aw.preText, answered: aw.answered, answers: aw.answers,
        recorded: noted, payload: aw.payload },
    }, { frameId: details.frameId });
    // (the note landed while the page was being set up: it's told now)
    if (noted === null && !attemptPending[details.tabId]) {
      chrome.tabs.sendMessage(details.tabId, { type: "KAIDOSTAR_NOTED", applicationId: aw.applicationId, recorded: !!aw.recorded },
        { frameId: details.frameId }).catch(() => {});
    }
  } catch (e) {
    // a page the extension can't run on: the application stays "may have gone through" on the Auto page
  }
}
if (chrome.webNavigation && chrome.webNavigation.onCompleted) chrome.webNavigation.onCompleted.addListener(verifyNewPage);

// The site opened another page while a run waits for you (you signed in, clicked Apply, passed its check): Kaidostar is
// brought back there - only on the employer's own site or hiring system, never on another site in between (a Google
// or Okta sign-in) - and fills the application when that page has it.
async function resumeOnPage(details) {
  const wt = await waitingFor(details.tabId);
  if (!wt) return;
  if (Date.now() - wt.since > WAIT_MS || (wt.injections || 0) >= WAIT_PAGES) { dropWaiting(details.tabId); return; }
  // (the browser clears a tab's badge when it loads a page: the run still waits for you, so it's shown again - on any page)
  if (details.frameId === 0) badge(details.tabId, true);
  if (!/^https?:/i.test(String(details.url || ""))) return;
  const ats = (wt.payload && wt.payload.data && wt.payload.data.ats_domains) || [];
  if (!sameEmployer(wt.origin, details.url, ats)) return;   // another site, or another employer on the same hiring system
  const aw = await awaitingFor(details.tabId);
  if (aw) return;     // a submit is being confirmed in this tab: that comes first
  wt.injections = (wt.injections || 0) + 1;
  keepWaiting(details.tabId);
  try {
    await chrome.scripting.executeScript({ target: { tabId: details.tabId, frameIds: [details.frameId] }, files: ["form_fill.js", "content.js"] });
    await new Promise((res) => setTimeout(res, 200));
    await chrome.tabs.sendMessage(details.tabId, { type: "KAIDOSTAR_AUTOFILL",
      payload: Object.assign({}, wt.payload, { resumed: true, waitSince: wt.since, waitKind: wt.kind }) }, { frameId: details.frameId });
  } catch (e) {
    // a page the extension can't run on: it keeps waiting for the next one
  }
}
if (chrome.webNavigation && chrome.webNavigation.onCompleted) chrome.webNavigation.onCompleted.addListener(resumeOnPage);

async function resolveAnswers(applicationId, questions, page) {
  const body = { questions: Array.isArray(questions) ? questions.slice(0, 80) : [] };
  if (page && typeof page === "object") body.page = page;
  const res = await api("/applications/" + encodeURIComponent(applicationId) + "/answers", { method: "POST", body });
  if (!res.ok || !res.data || !Array.isArray(res.data.answers)) return { ok: false, answers: [] };
  return { ok: true, answers: res.data.answers };
}

// Answers you gave on the page yourself, saved to your answer bank for those same questions (you asked).
async function learnAnswers(applicationId, answers, page) {
  const body = { answers: Array.isArray(answers) ? answers.slice(0, 40) : [] };
  if (page && typeof page === "object") body.page = page;
  const res = await api("/applications/" + encodeURIComponent(applicationId) + "/learn-answers", { method: "POST", body });
  if (!res.ok || !res.data) return { ok: false, error: whyNot(res) };
  return { ok: true, saved: res.data.saved | 0 };
}

async function writeCoverLetter(applicationId) {
  const res = await api("/applications/" + encodeURIComponent(applicationId) + "/cover-letter", { method: "POST" });
  if (!res.ok || !res.data || !res.data.cover_letter) {
    return { ok: false, error: (res.data && res.data.detail) || "Couldn't write a cover letter just now." };
  }
  return { ok: true, text: res.data.cover_letter, note: res.data.review_note || "" };
}

// ---- working through every ready application, one tab at a time ----
async function getQueue() {
  const { kaidostar_queue } = await chrome.storage.local.get("kaidostar_queue");
  return Array.isArray(kaidostar_queue) ? kaidostar_queue : [];
}
async function setQueue(q) { await chrome.storage.local.set({ kaidostar_queue: q }); }

async function startQueue(ids) {
  const q = (Array.isArray(ids) ? ids : []).map(String).filter(Boolean).slice(0, 50);
  await setQueue(q);
  return nextInQueue();
}
async function nextInQueue() {
  const q = await getQueue();
  if (!q.length) return { ok: true, done: true };
  const id = q.shift();
  await setQueue(q);
  const res = await startAutofill(id, true);
  if (!res.ok) {
    // skip one that can't be opened, keep going
    setTimeout(nextInQueue, 800);
  }
  return Object.assign({ remaining: q.length }, res);
}

// ---- Autopilot: applying for you on its own ----
// A run: Kaidostar gives it one application at a time (its "lease" - no other browser of yours takes it meanwhile); it
// opens it in Autopilot's own window, the page fills it and submits it when every rule passes - or stops, and says why -
// and Kaidostar hears how it went with the request for the next one. A run's state is kept in session storage (the
// browser may stop this worker between pages); what the last run did is kept for the popup and the status page.
const AP_ALARM = "kaidostar-autopilot";           // every AP_EVERY_MIN minutes, while it's on: a run
const AP_NEXT = "kaidostar-autopilot-next";       // the short gap before the next application of a run
const AP_WATCH = "kaidostar-autopilot-watch";     // every minute during a run: an application out of time, a lost tab
const AP_EVERY_MIN = 20;
const AP_RUN_MAX = 15;                            // applications taken in one run
const AP_RUN_MS = 2 * 60 * 60 * 1000;             // a run never goes on longer than this
const AP_RUN_KEY = "ap_run";                      // (session storage) the run going on now
const AP_KEY = "kaidostar_autopilot";             // (local storage) the last run, and results still to tell Kaidostar
const AP_PAGE_OUTCOMES = ["sent", "needs_you", "unconfirmed", "failed"];
const AP_SIGN_IN = "Your sign-in to Kaidostar Apply has expired - sign in again in its popup (Autopilot waits until you do).";
const apClosing = new Set();                      // tabs it's closing itself

function apAppMs(cfg) { const v = Number(cfg && cfg.autopilotAppMs); return v >= 30000 && v <= 1800000 ? v : 5 * 60000; }
function apGapMs(cfg) { const v = Number(cfg && cfg.autopilotGapMs); return v >= 1000 && v <= 600000 ? v : 30000; }
function quiet(p) { try { if (p && p.catch) p.catch(() => {}); } catch (e) {} }

async function apGetRun() {
  try { const o = await chrome.storage.session.get(AP_RUN_KEY); return (o && o[AP_RUN_KEY]) || null; } catch (e) { return null; }
}
async function apSetRun(run) {
  try { if (run) await chrome.storage.session.set({ [AP_RUN_KEY]: run }); else await chrome.storage.session.remove(AP_RUN_KEY); } catch (e) {}
}
async function apGetSaved() {
  try { const o = await chrome.storage.local.get(AP_KEY); return (o && o[AP_KEY]) || {}; } catch (e) { return {}; }
}
async function apSave(patch) {
  const next = Object.assign({}, await apGetSaved(), patch);
  try { await chrome.storage.local.set({ [AP_KEY]: next }); } catch (e) {}
  return next;
}

// one thing at a time: a page's result, a tab closing, the next one opening, the minute's check
let apChain = Promise.resolve();
function apSerial(fn) {
  const p = apChain.then(() => fn());
  apChain = p.then(() => {}, (e) => { try { console.warn("Kaidostar Autopilot:", e); } catch (er) {} });
  return p;
}
// the browser stops an idle worker after about 30 seconds: a long wait for Kaidostar (a server waking up) keeps it awake
async function keepAlive(promise) {
  const t = setInterval(() => { try { chrome.runtime.getPlatformInfo(() => {}); } catch (e) {} }, 20000);
  try { return await promise; } finally { clearInterval(t); }
}

// Autopilot's own window, minimized: it never takes the screen or the focus from what you're doing. Its first tab is
// its status page (what it's doing, and a Stop button).
async function apWindow() {
  const w = await chrome.windows.create({ url: chrome.runtime.getURL("autopilot.html"), state: "minimized", type: "normal" });
  try {
    const o = await chrome.storage.session.get("ap_windows");
    await chrome.storage.session.set({ ap_windows: ((o && o.ap_windows) || []).filter((x) => x !== w.id).concat([w.id]).slice(-20) });
  } catch (e) {}
  return w;
}
// a window of Autopilot's: one it made (this session), or one with its status page in it (also after a browser restart)
function apIsItsWindow(w) {
  const page = chrome.runtime.getURL("autopilot.html");
  return !!(w && (w.tabs || []).some((t) => String(t.url || t.pendingUrl || "").indexOf(page) === 0));
}
async function apOwnWindow(windowId) {
  try {
    const o = await chrome.storage.session.get("ap_windows");
    if (((o && o.ap_windows) || []).indexOf(windowId) >= 0) return true;
    return apIsItsWindow(await chrome.windows.get(windowId, { populate: true }));
  } catch (e) { return false; }
}
// the newest window of its still open (a run uses it rather than making another)
async function apOpenWindow() {
  try {
    const ws = (await chrome.windows.getAll({ windowTypes: ["normal"], populate: true })).filter((w) => apIsItsWindow(w) && w.state === "minimized");
    return ws.length ? ws.sort((a, b) => b.id - a.id)[0].id : null;
  } catch (e) { return null; }
}

// Kaidostar: what happened to the last one (result), and the next one it may take (more) -> {ok, next, note, status, busy}
async function apAsk(runId, result, more) {
  const a = await getAuth();
  if (!a || !a.token || !a.userId) return { ok: false, status: 401, note: AP_SIGN_IN };
  const body = { run: String(runId || "").slice(0, 40), more: more !== false, on: (await getConfig()).autopilot };
  if (result) body.result = result;
  const res = await keepAlive(api("/auto/" + encodeURIComponent(a.userId) + "/autopilot", { method: "POST", body }));
  if (res.ok && res.data && !res.data.busy) return { ok: true, next: res.data.next || null, note: String(res.data.note || "") };
  if (res.ok && res.data && res.data.busy) return { ok: false, status: 0, busy: true, note: "Kaidostar was busy - it tries again next time." };
  return { ok: false, status: res.status,
    note: res.status === 401 ? AP_SIGN_IN
      : res.status === 429 ? "It has checked with Kaidostar very often today - it carries on tomorrow."
      : "Couldn't reach Kaidostar (" + whyNot(res) + ") - it tries again next time." };
}
// a result Kaidostar couldn't be told just now is told with the next run
function apTellLater(r) { return !!(r.busy || !r.status || r.status >= 500 || r.status === 401 || r.status === 403 || r.status === 429); }
async function apKeep(runId, result) {
  const saved = await apGetSaved();
  const pend = (Array.isArray(saved.pending) ? saved.pending : []).filter((x) => x && x.result && x.result.application_id !== result.application_id);
  pend.push({ run: runId, result, at: Date.now() });
  await apSave({ pending: pend.slice(-20) });
}
async function apFlush() {
  const saved = await apGetSaved();
  const pend = Array.isArray(saved.pending) ? saved.pending : [];
  if (!pend.length) return true;
  const left = [];
  for (const x of pend) {
    if (!x || !x.result || Date.now() - (x.at || 0) > 7 * 86400000) continue;   // (a week old: Kaidostar has moved on)
    if (left.length) { left.push(x); continue; }
    const r = await apAsk(x.run, x.result, false);
    if (!r.ok && apTellLater(r)) left.push(x);
  }
  await apSave({ pending: left });
  return !left.length;
}

// The extension's icon: "AP" while a run is on; afterwards how many it couldn't finish (until you open the popup); "!" when
// your sign-in has expired.
async function apBadge() {
  const run = await apGetRun();
  const saved = await apGetSaved();
  let text = "", color = "#5b8cff", title = "Kaidostar Apply";
  if (run) {
    text = "AP";
    title = "Kaidostar Apply - Autopilot is applying for you" + (run.sent ? " (" + run.sent + " sent so far)" : "");
  } else if (saved.signIn) {
    text = "!"; color = "#ff6b6b";
    title = "Kaidostar Apply - sign in again: Autopilot is paused until you do";
  } else if (saved.attention > 0) {
    const n = saved.attention;
    text = String(Math.min(99, n)); color = "#f2c94c";
    title = "Kaidostar Apply - " + n + " application" + (n === 1 ? "" : "s") + " Autopilot couldn't finish need" + (n === 1 ? "s" : "") + " you (Auto page)";
  }
  try {
    quiet(chrome.action.setBadgeText({ text }));
    if (text) quiet(chrome.action.setBadgeBackgroundColor({ color }));
    quiet(chrome.action.setTitle({ title }));
  } catch (e) {}
}

// Its timer: every AP_EVERY_MIN minutes while it's on - the first run soon after the browser starts (firstMin).
async function apSchedule(firstMin) {
  if (!chrome.alarms) return;
  const cfg = await getConfig();
  try {
    if (cfg.autopilot) {
      const al = await chrome.alarms.get(AP_ALARM);
      if (!al) await chrome.alarms.create(AP_ALARM, { delayInMinutes: firstMin || AP_EVERY_MIN, periodInMinutes: AP_EVERY_MIN });
    } else {
      await chrome.alarms.clear(AP_ALARM);
    }
  } catch (e) {}
}
function apWatchOn() { try { quiet(chrome.alarms.create(AP_WATCH, { delayInMinutes: 1, periodInMinutes: 1 })); } catch (e) {} }
function apScheduleNext(at) {
  try { quiet(chrome.alarms.create(AP_NEXT, { when: at })); } catch (e) {}
  const ms = at - Date.now();
  if (ms < 28000) setTimeout(() => { apNext(); }, Math.max(0, ms) + 50);   // (an alarm never comes sooner than 30 seconds from now)
}

// A run: "alarm" (every 20 minutes, only while Autopilot is on) or "now" (you clicked Run now - on its status page, it
// runs in that page's window).
function apStart(why, windowId) {
  return apSerial(async () => {
    const cfg = await getConfig();
    if (!cfg.autopilot) return { ok: false, note: "Autopilot is off - turn it on first." };
    let run = await apGetRun();
    if (run && Date.now() - run.at < AP_RUN_MS) return { ok: true, running: true };
    if (run) {
      // (a run left over - it went on too long: the one it was on is out of time)
      if (run.cur) { await apDisarm(run.cur.tabId, true); await apFinish(run, run.cur, "timeout", "the page didn't finish in time", "page", { stop: true }); }
      else if (run.opening) {
        const op = run.opening;
        run.opening = null;
        await apFinish(run, { applicationId: op.applicationId, title: op.title, org: op.org, lease: op.lease || "", tabId: null, handed: false }, "released", "", "", { stop: true, tried: true });
      } else await apEnd(run, "It went on too long, so it stopped.");
    }
    const a = await getAuth();
    if (!a || !a.token) {
      await apSave({ last: Object.assign({}, (await apGetSaved()).last || {}, { note: "Sign in to Kaidostar Apply in its popup first.", endedAt: Date.now() }) });
      await apBadge();
      return { ok: false, note: "Sign in to Kaidostar Apply first." };
    }
    if (windowId == null || !(await apOwnWindow(windowId))) windowId = await apOpenWindow();
    run = { id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), at: Date.now(), why: String(why || ""),
      windowId: windowId != null ? windowId : null, cur: null, next: null, nextAt: 0, count: 0, sent: 0, needs: 0, unsure: 0, yours: 0, log: [], kept: [],
      stopping: false, stopNote: "", reached: false };
    await apSetRun(run);
    apWatchOn();
    await apBadge();
    await apFlush();
    const r = await apAsk(run.id, null, true);
    if (!r.ok) { await apEnd(run, r.note, r.status); return { ok: false, note: r.note }; }
    run.reached = true;
    if (!r.next) { await apEnd(run, r.note || ""); return { ok: true, none: true, note: r.note || "" }; }
    await apOpen(run, r.next);
    return { ok: true, started: true };
  });
}

// Open the next one in Autopilot's window (made when there's none).
async function apOpen(run, next) {
  const item = { applicationId: String((next && next.application_id) || ""), title: String((next && next.title) || "").slice(0, 200),
    org: String((next && next.org) || "").slice(0, 200), lease: String((next && next.lease) || ""), tabId: null, handed: false, attempted: false };
  run.next = null; run.nextAt = 0;
  run.count += 1;
  run.opening = { applicationId: item.applicationId, title: item.title, org: item.org, lease: item.lease, at: Date.now() };   // (until its tab is open)
  await apSetRun(run);
  const res = await keepAlive(startAutofill(item.applicationId, false, { autopilot: true, windowId: run.windowId, lease: item.lease }));
  run.opening = null;
  if (res.windowId != null) run.windowId = res.windowId;
  if (!res.ok) {
    // never opened: back in line when it was a moment's trouble (no connection - the run stops for now), yours when it's
    // open in a tab of yours, and otherwise Kaidostar hears why
    if (res.status === 401) return apFinish(run, item, "released", "", "", { stop: true, status: 401 });
    // (it did try: a second time like this, and it's left for you)
    if (!res.status || res.status >= 500) return apFinish(run, item, "released", "", "", { stop: true, note: res.error || "", tried: true });
    return apFinish(run, item, res.open ? "yours" : "failed", res.error || "", "page");
  }
  run.cur = Object.assign(item, { tabId: res.tabId, at: Date.now() });
  await apSetRun(run);
  await apBadge();
  return null;
}

// What happened to one it took: Kaidostar is told (with the request for the next one), its tab is closed - unless it's
// yours now, or kept for you to check - and the next one comes after a short gap. The run stops after this one when you
// took one over (it never gets in your way), when it was stopped, or when it has done enough.
async function apFinish(run, item, outcome, reason, step, opts) {
  opts = opts || {};
  if (run.cur && run.cur.applicationId === item.applicationId) run.cur = null;
  const tabId = item.tabId;
  if (!item.attempted && tabId != null && attemptPending[tabId] && (outcome === "timeout" || outcome === "released" || outcome === "stopped")) {
    // (a submit note on its way: its click may come - the go ends as "check it" if it was noted)
    let r = null;
    try { r = await Promise.race([attemptPending[tabId], new Promise((res) => setTimeout(() => res(null), 8000))]); } catch (e) { r = null; }
    if (r && r.ok) item.attempted = true;
  }
  if (item.attempted && (outcome === "timeout" || outcome === "released" || outcome === "stopped")) {
    // its submit was clicked: however this go ended, it may have gone through - "check it", and its tab is kept if it's open
    reason = (outcome === "timeout" ? "it clicked submit, but the page didn't confirm it in time"
      : outcome === "stopped" ? "it clicked submit, then its tab was closed before the page confirmed it"
      : "it clicked submit just before it was stopped") + " - check the posting (or your email) before you submit it again";
    outcome = "unconfirmed";
    step = "page";
    opts = Object.assign({}, opts, { keep: !opts.gone });
  }
  const keep = !!opts.keep || outcome === "yours";
  if (outcome === "sent") run.sent += 1;
  else if (outcome === "unconfirmed") run.unsure += 1;
  else if (outcome === "yours") run.yours += 1;
  else if (outcome !== "released") run.needs += 1;
  if (outcome !== "released" || reason) {
    run.log = (run.log || []).concat([{ at: Date.now(), title: item.title || "", org: item.org || "", outcome, reason: String(reason || "").slice(0, 300) }]).slice(-30);
  }
  if (tabId != null && keep && outcome !== "yours") run.kept = (run.kept || []).concat([tabId]).slice(-20);
  if (tabId != null && !keep) {
    apClosing.add(tabId);
    setTimeout(() => {
      chrome.tabs.remove(tabId).catch(() => {}).finally(() => { setTimeout(() => apClosing.delete(tabId), 2000); });
    }, outcome === "sent" ? 2500 : 800);
  }
  const more = !opts.stop && !item.handed && !run.stopping && run.count < AP_RUN_MAX && Date.now() - run.at < AP_RUN_MS;
  await apSetRun(run);
  const result = { application_id: item.applicationId, outcome, reason: String(reason || "").slice(0, 300), step: String(step || ""), lease: item.lease || "" };
  if (opts.tried) result.tried = true;
  const r = await apAsk(run.id, result, more);
  if (!r.ok) {
    if (apTellLater(r)) await apKeep(run.id, result);
    return apEnd(run, r.note, r.status);
  }
  run.reached = true;
  if (!more || !r.next) {
    // (one it was given just now, with no run left to open it: it goes back in line)
    if (r.next && !more) run.next = r.next;
    const why = opts.status === 401 ? AP_SIGN_IN
      : opts.note ? "Couldn't open one (" + String(opts.note).replace(/[.\s]+$/, "") + ") - it tries again next time."
      : item.handed ? "You took one over, so it stopped for now - it carries on in " + AP_EVERY_MIN + " minutes."
      : run.stopping ? run.stopNote
      : run.count >= AP_RUN_MAX ? "It took " + AP_RUN_MAX + " this run, the most it takes at once - any others come next time."
      : r.note || "";
    return apEnd(run, why, opts.status);
  }
  run.next = r.next;
  run.nextAt = Date.now() + apGapMs(await getConfig());
  await apSetRun(run);
  apScheduleNext(run.nextAt);
  return null;
}

// The run is over: a next one it was given but never opened goes back in line, its window closes when nothing in it is
// yours, and what it did is kept for the popup and the status page.
async function apEnd(run, note, status) {
  if (run.next) {
    const nx = run.next;
    run.next = null;
    const result = { application_id: String(nx.application_id || ""), outcome: "released", reason: "", step: "", lease: String(nx.lease || "") };
    const r = await apAsk(run.id, result, false);
    if (!r.ok && apTellLater(r)) await apKeep(run.id, result);
    if (r.ok) run.reached = true;
  }
  try { quiet(chrome.alarms.clear(AP_NEXT)); quiet(chrome.alarms.clear(AP_WATCH)); } catch (e) {}
  if (run.windowId != null) apCloseIfIdle(run.windowId);
  const saved = await apGetSaved();
  const last = { at: run.at, endedAt: Date.now(), count: run.count, sent: run.sent, needs: run.needs, unsure: run.unsure, yours: run.yours,
    log: run.log || [], kept: (run.kept || []).length, windowId: run.windowId, note: String(note || "").slice(0, 300) };
  await apSave({ last, attention: (saved.attention || 0) + run.needs + run.unsure,
    signIn: status === 401 ? Date.now() : (run.reached ? null : (saved.signIn || null)) });
  await apSetRun(null);
  await apBadge();
}
// Autopilot's own window, once nothing in it is yours (only its status page is left) and no run is using it: closed.
function apCloseIfIdle(windowId) {
  setTimeout(async () => {
    try {
      if (!(await apOwnWindow(windowId))) return;
      const run = await apGetRun();
      if (run && run.windowId === windowId) return;            // (a run is using it again)
      const page = chrome.runtime.getURL("autopilot.html");
      const tabs = await chrome.tabs.query({ windowId });
      const others = tabs.filter((t) => String(t.url || t.pendingUrl || "").indexOf(page) !== 0 && !apClosing.has(t.id));
      if (!others.length) await chrome.windows.remove(windowId);
    } catch (e) {}
  }, 3500);
}

function apNext() {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || !run.next || run.cur) return;
    if (Date.now() < (run.nextAt || 0) - 1500) { apScheduleNext(run.nextAt); return; }
    try { quiet(chrome.alarms.clear(AP_NEXT)); } catch (e) {}
    if (run.stopping) return apEnd(run, run.stopNote || "");
    return apOpen(run, run.next);
  });
}

// Every minute during a run: the page it's on out of time (a page that never finished), its tab gone, a next one whose
// moment has passed (its alarm was lost), or a run with nothing left.
function apWatch() {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run) { try { quiet(chrome.alarms.clear(AP_WATCH)); } catch (e) {} return; }
    const now = Date.now();
    if (run.cur) {
      const cur = run.cur;
      let tab = null;
      try { tab = await chrome.tabs.get(cur.tabId); } catch (e) { tab = null; }
      if (!tab) return apFinish(run, cur, "stopped", "its tab was closed before it finished", "page", { gone: true });
      if (now - cur.at > apAppMs(await getConfig())) {
        const aw = await awaitingFor(cur.tabId);
        if (aw && now - aw.at < AWAIT_MS) return;             // a submit is being confirmed: that has its own time
        await apDisarm(cur.tabId, true);                      // (nothing more happens there on its own)
        let shown = false;
        try { shown = !!tab.active && (await chrome.windows.get(tab.windowId)).state !== "minimized"; } catch (e) {}
        return apFinish(run, cur, "timeout", "the page didn't finish in time", "page", { keep: shown });
      }
      return;
    }
    if (run.next) {
      if (now < (run.nextAt || 0)) return;
      try { quiet(chrome.alarms.clear(AP_NEXT)); } catch (e) {}
      if (run.stopping) return apEnd(run, run.stopNote || "");
      return apOpen(run, run.next);
    }
    if (run.opening) {
      // (the browser stopped this worker while it opened one: it goes back in line, and the run stops for now)
      if (now - (run.opening.at || 0) < 120000) return;
      const op = run.opening;
      run.opening = null;
      return apFinish(run, { applicationId: op.applicationId, title: op.title, org: op.org, lease: op.lease || "", tabId: null, handed: false }, "released", "", "",
        { stop: true, tried: true });
    }
    if (now - run.at > 60000) return apEnd(run, run.stopping ? run.stopNote : "");
  });
}

// A tab Autopilot no longer runs (you took it over, or it stopped there): every frame in it is told (nothing more happens
// there on its own - a countdown stops, Autopilot's click never comes), and the next page there is given what you'd get
// yourself.
async function apDisarm(tabId, stopped) {
  try { quiet(chrome.tabs.sendMessage(tabId, { type: stopped ? "KAIDOSTAR_AP_STOP" : "KAIDOSTAR_AP_HANDED" })); } catch (e) {}
  const p = pendingByTab[tabId];
  if (p) { p.autopilot = false; p.autoSubmit = false; p.handed = true; }
  const wt = await waitingFor(tabId);
  if (wt && wt.payload) { wt.payload.autopilot = false; wt.payload.autoSubmit = false; wt.payload.handed = true; keepWaiting(tabId); }
  const aw = await awaitingFor(tabId);
  if (aw && aw.payload) { aw.payload.autopilot = false; keepAwaiting(tabId); }
}

// What the page says happened (sent, needs you, couldn't confirm it, failed).
function apOutcome(msg, sender) {
  const tabId = sender && sender.tab && sender.tab.id;
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || !run.cur || tabId == null || run.cur.tabId !== tabId || run.cur.applicationId !== String(msg.applicationId || "")) return { ok: false };
    const outcome = AP_PAGE_OUTCOMES.indexOf(msg.outcome) >= 0 ? msg.outcome : "needs_you";
    await apFinish(run, run.cur, outcome, msg.reason, msg.step, { keep: !!msg.keep && outcome === "unconfirmed" });
    return { ok: true };
  });
}
// Kaidostar recorded a confirmed submission from one of its tabs (the page says so too - whichever comes first counts)
function apSent(tabId, applicationId) {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || !run.cur || tabId == null || run.cur.tabId !== tabId || run.cur.applicationId !== String(applicationId || "")) return;
    return apFinish(run, run.cur, "sent", "", "");
  });
}

// You clicked or typed in one of its tabs: that application is yours - nothing more happens there on its own, Kaidostar
// hears so (Autopilot never takes it again), and this run stops so it never gets in your way.
function apHanded(msg, sender) {
  const tabId = sender && sender.tab && sender.tab.id;
  const windowId = sender && sender.tab && sender.tab.windowId;
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || tabId == null) return { ok: false };
    if (run.cur && run.cur.tabId === tabId) {
      await apDisarm(tabId);
      const cur = run.cur;
      cur.handed = true;
      await apFinish(run, cur, "yours", "you took it over", "");
      return { ok: true };
    }
    // a tab of its you're using (one kept for you to check): it stops after the one it's on - never in your way
    if ((run.kept || []).indexOf(tabId) >= 0 || (run.windowId != null && windowId === run.windowId)) {
      await apDisarm(tabId);
      if (!run.stopping) { run.stopping = true; run.stopNote = "You were using its window, so it stopped for now - it carries on in " + AP_EVERY_MIN + " minutes."; }
      await apSetRun(run);
      if (!run.cur) return apEnd(run, run.stopNote).then(() => ({ ok: true }));
      return { ok: true };
    }
    return { ok: false };
  });
}
// You opened an application Autopilot is applying to (from the popup): yours, as if you'd clicked in its tab.
function apTakeOverTab(tabId) {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || !run.cur || run.cur.tabId !== tabId) return false;
    await apDisarm(tabId);
    const cur = run.cur;
    cur.handed = true;
    await apFinish(run, cur, "yours", "you opened it yourself", "");
    return true;
  });
}
// Its submit was clicked (Kaidostar noted it): from now on its go can end only as sent, or "check it".
function apMarkAttempted(tabId, applicationId) {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || !run.cur || run.cur.tabId !== tabId || run.cur.applicationId !== String(applicationId || "")) return;
    run.cur.attempted = true;
    await apSetRun(run);
  });
}
function apUnmarkAttempted(tabId, applicationId) {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || !run.cur || run.cur.tabId !== tabId || run.cur.applicationId !== String(applicationId || "")) return;
    run.cur.attempted = false;
    await apSetRun(run);
  });
}
// How the one it's on ended, said by the worker itself (the page can't say it: the form went to another site).
function apEndTab(tabId, applicationId, outcome, reason, step, keep) {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || !run.cur || run.cur.tabId !== tabId || run.cur.applicationId !== String(applicationId || "")) return;
    return apFinish(run, run.cur, outcome, reason, step, { keep: !!keep });
  });
}
// You took the tab it's on somewhere yourself (typed an address, went back or forward): it's yours.
const AP_PERSON_NAV = ["typed", "auto_bookmark", "generated", "keyword", "keyword_generated", "start_page", "reload"];
async function apPersonNavigated(d) {
  if (!d || d.frameId !== 0) return;
  const q = d.transitionQualifiers || [];
  if (AP_PERSON_NAV.indexOf(d.transitionType) < 0 && q.indexOf("forward_back") < 0 && q.indexOf("from_address_bar") < 0) return;
  const run = await apGetRun();
  if (!run || !run.cur || run.cur.tabId !== d.tabId) return;
  apSerial(async () => {
    const r2 = await apGetRun();
    if (!r2 || !r2.cur || r2.cur.tabId !== d.tabId) return;
    await apDisarm(d.tabId);
    const cur = r2.cur;
    cur.handed = true;
    await apFinish(r2, cur, "yours", "you took its tab somewhere else yourself", "");
  });
}
if (chrome.webNavigation && chrome.webNavigation.onCommitted) chrome.webNavigation.onCommitted.addListener(apPersonNavigated);

// One of its tabs closed: the one it was on stops there (closing its whole window stops the run for now - and puts the
// one it was on back in line).
function apTabClosed(tabId, info) {
  if (apClosing.has(tabId)) return Promise.resolve();
  info = info || {};
  // (you closed the last tab of yours in an Autopilot window - one kept for you to check, or one you took over: the
  // window, with only its status page left, goes too)
  if (!info.isWindowClosing && info.windowId != null) apCloseIfIdle(info.windowId);
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run) return;
    let changed = false;
    if (run.kept && run.kept.indexOf(tabId) >= 0) { run.kept = run.kept.filter((t) => t !== tabId); changed = true; }
    const windowGone = !!info.isWindowClosing && run.windowId != null && info.windowId === run.windowId;
    if (windowGone && !run.stopping) {
      run.stopping = true;
      run.stopNote = "You closed its window, so it stopped for now - it carries on in " + AP_EVERY_MIN + " minutes.";
      changed = true;
    }
    if (!run.cur || run.cur.tabId !== tabId) { if (changed) await apSetRun(run); return; }
    const cur = run.cur;
    if (windowGone) return apFinish(run, cur, "released", "", "", { stop: true, gone: true });
    return apFinish(run, cur, "stopped", "its tab was closed before it finished", "page", { gone: true });
  });
}
function apWindowClosed(windowId) {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run || run.windowId == null || run.windowId !== windowId) return;
    run.windowId = null;
    if (!run.stopping) { run.stopping = true; run.stopNote = "You closed its window, so it stopped for now - it carries on in " + AP_EVERY_MIN + " minutes."; }
    await apSetRun(run);
    if (run.cur) return apFinish(run, run.cur, "released", "", "", { stop: true, gone: true });
    return apEnd(run, run.stopNote);
  });
}

// Stop (the status page, the popup, or turning it off): the one it's on now stops - its tab closes, unless a submit
// there is still being confirmed - and goes back in line (a submit already on its way stays "may have gone through").
function apStop(note) {
  return apSerial(async () => {
    const run = await apGetRun();
    if (!run) return { ok: true };
    run.stopping = true;
    run.stopNote = note || "You stopped it.";
    await apSetRun(run);
    if (run.cur) {
      const cur = run.cur;
      await apDisarm(cur.tabId, true);
      await apFinish(run, cur, "released", "", "", { stop: true });
      return { ok: true };
    }
    await apEnd(run, run.stopNote);
    return { ok: true };
  });
}

async function apSet(on) {
  try { await chrome.storage.local.set({ kaidostar_ap_on: !!on }); } catch (e) {}
  await apSchedule();
  if (on) { apStart("alarm"); return { ok: true, on: true }; }
  await apStop("You turned Autopilot off.");
  await apSave({ offPending: true });
  await apTellOff();
  return { ok: true, on: false };
}
// Kaidostar hears it's off (the Auto page stops saying it applies for you, and kits come to you again) - retried when the
// browser starts and when you open the popup, until it has heard
async function apTellOff() {
  const saved = await apGetSaved();
  if (!saved.offPending || (await getConfig()).autopilot) { if (saved.offPending) await apSave({ offPending: false }); return; }
  const a = await getAuth();
  if (!a || !a.token || !a.userId) return;
  const res = await api("/auto/" + encodeURIComponent(a.userId) + "/autopilot", { method: "POST", body: { run: "off", more: false, off: true, on: false } });
  if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) await apSave({ offPending: false });
}

async function apStatus() {
  apTellOff();
  const cfg = await getConfig();
  const run = await apGetRun();
  const saved = await apGetSaved();
  const a = await getAuth();
  const it = (x, at) => x ? { title: x.title || "", org: x.org || "", at: at || x.at || 0 } : null;
  return {
    ok: true, on: !!cfg.autopilot, signedIn: !!(a && a.token), everyMin: AP_EVERY_MIN, runMax: AP_RUN_MAX,
    run: run ? { at: run.at, count: run.count, sent: run.sent, needs: run.needs, unsure: run.unsure, yours: run.yours, kept: (run.kept || []).length,
      cur: it(run.cur), next: run.next ? it(run.next, run.nextAt) : null, log: run.log || [], stopping: !!run.stopping } : null,
    last: saved.last || null, attention: saved.attention || 0, signIn: !!saved.signIn, pending: (saved.pending || []).length,
  };
}
async function apShow() {
  const run = await apGetRun();
  const saved = await apGetSaved();
  const id = run && run.windowId != null ? run.windowId : (saved.last && saved.last.windowId);
  if (id == null) return { ok: false };
  try { await chrome.windows.update(id, { state: "normal", focused: true }); return { ok: true }; } catch (e) { return { ok: false }; }
}

// The posting's own "Apply" link, which the page asks to follow (Autopilot only): only on the same employer's site or
// hiring system, at most twice for one application - the page it opens is filled only if it names this job.
async function apFollow(msg, sender) {
  const tabId = sender && sender.tab && sender.tab.id;
  if (tabId == null || (sender.frameId || 0) !== 0) return { ok: false };
  const run = await apGetRun();
  if (!run || !run.cur || run.cur.tabId !== tabId || run.cur.handed || run.stopping) return { ok: false };
  const wt = await waitingFor(tabId);
  if (!wt || wt.applicationId !== msg.applicationId || !(wt.payload && wt.payload.autopilot)) return { ok: false };
  const url = String(msg.url || "");
  const ats = (wt.payload.data && wt.payload.data.ats_domains) || [];
  if (!/^https?:\/\//i.test(url) || !sameEmployer(wt.origin, url, ats)) return { ok: false, why: "it leads to another site" };
  if ((wt.follows || 0) >= 2) return { ok: false, why: "it has already followed two links for this one" };
  wt.follows = (wt.follows || 0) + 1;
  keepWaiting(tabId);
  return { ok: true };
}

// only Kaidostar Apply's own pages (the popup, the status page) run Autopilot
function fromOwnPage(sender) {
  if (!sender || sender.id !== chrome.runtime.id) return false;
  return String(sender.url || "").indexOf(chrome.runtime.getURL("")) === 0;
}

if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener((al) => {
    if (!al) return;
    if (al.name === AP_ALARM) apStart("alarm");
    else if (al.name === AP_NEXT) apNext();
    else if (al.name === AP_WATCH) apWatch();
  });
}
chrome.runtime.onInstalled.addListener(() => { apSchedule(2); apBadge(); apTellOff(); });
chrome.runtime.onStartup.addListener(() => { apSchedule(2); apBadge(); apTellOff(); });
if (chrome.windows && chrome.windows.onRemoved) {
  chrome.windows.onRemoved.addListener((windowId) => {
    apWindowClosed(windowId);
    chrome.storage.session.get("ap_windows").then((o) => {
      const ws = (o && o.ap_windows) || [];
      if (ws.indexOf(windowId) >= 0) return chrome.storage.session.set({ ap_windows: ws.filter((x) => x !== windowId) });
    }).catch(() => {});
  });
}

// Inject once the opened apply tab has finished loading.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  const p = pendingByTab[tabId];
  if (!p || p.injected) return;
  if (changeInfo.status !== "complete") return;
  p.injected = true;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["form_fill.js", "content.js"],
    });
    // Let the freshly-injected content scripts register their listeners.
    await new Promise((res) => setTimeout(res, 200));
    await chrome.tabs.sendMessage(tabId, {
      type: "KAIDOSTAR_AUTOFILL",
      payload: { applicationId: p.applicationId, data: p.data, resume: p.resume, autoSubmit: p.autoSubmit, queued: p.queued, autopilot: !!p.autopilot,
        lease: p.lease || "" },
    });
  } catch (e) {
    // Injection is refused on chrome://, the Web Store, and a handful of blocked
    // pages. Nothing we can do there; the tab just won't be auto-filled.
  }
});

chrome.tabs.onRemoved.addListener((tabId, info) => {
  const p = pendingByTab[tabId];
  delete pendingByTab[tabId];
  dropAwaiting(tabId);
  dropWaiting(tabId);
  if (p && p.queued && !p.advanced) setTimeout(nextInQueue, 600);
  apTabClosed(tabId, info);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  if (/^AUTOPILOT_/.test(msg.type)) {
    // Autopilot is run from Kaidostar Apply's own pages only
    if (!fromOwnPage(sender)) return;
    const act = msg.type === "AUTOPILOT_SET" ? apSet(!!msg.on)
      : msg.type === "AUTOPILOT_RUN" ? apStart("now", sender.tab ? sender.tab.windowId : null)
      : msg.type === "AUTOPILOT_STOP" ? apStop("You stopped it.")
      : msg.type === "AUTOPILOT_STATUS" ? apStatus()
      : msg.type === "AUTOPILOT_SHOW" ? apShow()
      : msg.type === "AUTOPILOT_SEEN" ? apSave({ attention: 0 }).then(apBadge).then(() => ({ ok: true }))
      : msg.type === "AUTOPILOT_SIGNED_IN" ? apSave({ signIn: null }).then(apBadge).then(async () => {
        if ((await getConfig()).autopilot) apStart("alarm");
        return { ok: true };
      })
      : null;
    if (!act) return;
    act.then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  }
  if (msg.type === "KAIDOSTAR_AUTOPILOT") {
    apOutcome(msg, sender).then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  }
  if (msg.type === "KAIDOSTAR_AP_HANDED") {
    apHanded(msg, sender).then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  }
  if (msg.type === "KAIDOSTAR_AP_FOLLOW") {
    apFollow(msg, sender).then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  }
  if (msg.type === "START_AUTOFILL") {
    startAutofill(msg.applicationId, false).then(sendResponse);
    return true; // async response
  }
  if (msg.type === "START_QUEUE") {
    startQueue(msg.applicationIds).then(sendResponse);
    return true;
  }
  if (msg.type === "KAIDOSTAR_CONFIRM_SUBMIT") {
    confirmSubmit(msg.applicationId, msg.proof, sender && sender.tab && sender.tab.id).then(sendResponse);
    return true;
  }
  if (msg.type === "KAIDOSTAR_ATTEMPT") {
    noteAttempt(msg, sender).then(sendResponse);
    return true;
  }
  if (msg.type === "KAIDOSTAR_CHALLENGE") {
    // you're doing a check the site showed after the click: the page the form goes to afterwards is still its own
    const tabId = sender && sender.tab && sender.tab.id;
    awaitingFor(tabId).then((aw) => {
      if (aw && aw.applicationId === msg.applicationId && !aw.read && !aw.commit) { aw.at = Date.now(); keepAwaiting(tabId); }
      sendResponse({ ok: !!aw });
    });
    return true;
  }
  if (msg.type === "KAIDOSTAR_STOP_WATCH") {
    dropAwaiting(sender && sender.tab && sender.tab.id, msg.applicationId);
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === "KAIDOSTAR_NOT_SENT") {
    noteNotSent(msg.applicationId, sender && sender.tab && sender.tab.id, !!msg.tookBack).then(sendResponse);
    return true;
  }
  if (msg.type === "KAIDOSTAR_RESOLVE_ANSWERS") {
    resolveAnswers(msg.applicationId, msg.questions, msg.page).then(sendResponse);
    return true;
  }
  if (msg.type === "KAIDOSTAR_LEARN") {
    learnAnswers(msg.applicationId, msg.answers, msg.page).then(sendResponse);
    return true;
  }
  if (msg.type === "KAIDOSTAR_WAIT") {
    noteWaiting(msg, sender).then(sendResponse);
    return true;
  }
  if (msg.type === "KAIDOSTAR_FILLING") {
    // the form is being filled: nothing more to wait for in this tab
    dropWaiting(sender && sender.tab && sender.tab.id, msg.applicationId).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "KAIDOSTAR_COVER_LETTER") {
    writeCoverLetter(msg.applicationId).then(sendResponse);
    return true;
  }
  if (msg.type === "KAIDOSTAR_DONE") {
    // the page finished (submitted, stopped or handed back): in a queue, the next one opens (the page says it
    // was queued too, in case the browser restarted this worker since the tab opened)
    const tabId = sender && sender.tab && sender.tab.id;
    const p = tabId != null ? pendingByTab[tabId] : null;
    dropAwaiting(tabId);   // you're done with this page: nothing you open next is read as its confirmation
    dropWaiting(tabId);    // ... nor filled
    if (p && p.queued && !p.advanced) { p.advanced = true; setTimeout(nextInQueue, 1500); }
    else if (!p && msg.queued && tabId != null) { pendingByTab[tabId] = { advanced: true, injected: true }; setTimeout(nextInQueue, 1500); }
    sendResponse({ ok: true });
    return false;
  }
});
