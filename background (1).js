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
function badge(tabId, on) {
  try {
    chrome.action.setBadgeText({ tabId, text: on ? "!" : "" });
    if (on) {
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#f2c94c" });
      chrome.action.setTitle({ tabId, title: "Kaidostar Apply is waiting for you in this tab" });
    } else {
      chrome.action.setTitle({ tabId, title: "Kaidostar Apply" });
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
  };
  const origin = prev.applicationId === msg.applicationId && prev.origin ? prev.origin
    : String((payload.data && payload.data.apply_url) || (sender.tab && sender.tab.url) || "");
  waitingByTab[tabId] = {
    applicationId: msg.applicationId, kind: String(msg.kind || "apply"), payload, origin,
    since: prev.applicationId === msg.applicationId && prev.since ? prev.since : Date.now(),
    injections: prev.applicationId === msg.applicationId ? (prev.injections || 0) : 0,
  };
  keepWaiting(tabId);
  badge(tabId, true);
  // the step is yours: the tab comes to the front (in a queue you may be looking at another one)
  try { await chrome.tabs.update(tabId, { active: true }); } catch (e) {}
  return { ok: true };
}

async function getConfig() {
  const { kaidostar_cfg } = await chrome.storage.local.get("kaidostar_cfg");
  const cfg = Object.assign({ baseUrl: DEFAULT_BASE, autoSubmit: false }, kaidostar_cfg || {});
  // the old default address is gone - anyone still on it is moved to the real one
  if (/scanline-backend\.onrender\.com/i.test(cfg.baseUrl || "")) cfg.baseUrl = DEFAULT_BASE;
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

async function startAutofill(applicationId, queued) {
  const a = await getAuth();
  if (!a || !a.token) return { ok: false, error: "Sign in through the Kaidostar extension first." };
  const cfg = await getConfig();
  const base = baseOf(cfg);
  const open = await openTabFor(applicationId);
  if (open) {
    try { await chrome.tabs.update(open.id, { active: true }); } catch (e) {}
    return { ok: false, error: "This application is already open in another tab - finish it there." };
  }

  let r;
  try {
    r = await fetch(base + "/applications/" + encodeURIComponent(applicationId) + "/autofill", {
      headers: { Authorization: "Bearer " + a.token },
    });
  } catch (e) {
    return { ok: false, error: "Couldn't reach Kaidostar at " + base + ". Check the backend URL in settings." };
  }
  if (r.status === 401) return { ok: false, error: "Your session expired — sign in again." };
  if (r.status === 403) {
    const d = await safeJson(r);
    return { ok: false, error: (d && d.detail) || "This needs Kaidostar Pro and your permission to auto-submit." };
  }
  if (r.status === 409 || r.status === 400) {
    // already sent, being sent by Kaidostar right now, or not approved yet - never opened twice
    const d = await safeJson(r);
    return { ok: false, error: (d && d.detail) || "This application can't be opened right now." };
  }
  if (!r.ok) return { ok: false, error: "Couldn't load this application (HTTP " + r.status + ")." };
  const data = await r.json();
  if (!data.apply_url || !/^https?:\/\//i.test(data.apply_url)) {
    return { ok: false, error: "This application has no apply link to open." };
  }

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

  let tab;
  try {
    tab = await chrome.tabs.create({ url: data.apply_url });
  } catch (e) {
    return { ok: false, error: "Couldn't open the apply page." };
  }
  pendingByTab[tab.id] = { applicationId, data, resume, autoSubmit: !!cfg.autoSubmit, injected: false, queued: !!queued };
  return { ok: true };
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
      payload: { applicationId: msg.applicationId, data: p.data, resume: p.resume, autoSubmit: false, queued: p.queued },
    };
    keepAwaiting(tabId);
  }
  const call = (async () => {
    if (tabId != null && !(awaitingByTab[tabId] && awaitingByTab[tabId].payload.data)) {
      // (the browser restarted this worker while the run waited for you: what it needs is in the waiting note)
      const wt = await waitingFor(tabId);
      const aw = awaitingByTab[tabId];
      if (wt && wt.payload && aw && aw.applicationId === msg.applicationId) {
        Object.assign(aw.payload, { data: wt.payload.data, resume: wt.payload.resume, queued: wt.payload.queued });
        keepAwaiting(tabId);
      }
    }
    await dropWaiting(tabId, msg.applicationId);
    // (a submit of yours: noted whatever - also when an earlier one of yours already is)
    return api("/applications/" + encodeURIComponent(msg.applicationId) + "/submit-attempt" + (msg.own ? "?own=1" : ""), { method: "POST" });
  })();
  if (tabId != null) attemptPending[tabId] = call;
  const res = await call;
  if (tabId != null && attemptPending[tabId] === call) delete attemptPending[tabId];
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

async function noteNotSent(applicationId, tabId) {
  const res = await api("/applications/" + encodeURIComponent(applicationId) + "/not-sent", { method: "POST" });
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
  if (byPerson || late || ((aw.read || aw.commit) && !onward) || !sameSite(aw.preUrl, d.url, ats)) { dropAwaiting(d.tabId); return; }
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
    await chrome.tabs.sendMessage(details.tabId, { type: "KAIDOSTAR_AUTOFILL", payload: Object.assign({}, wt.payload, { resumed: true, waitSince: wt.since }) },
      { frameId: details.frameId });
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
      payload: { applicationId: p.applicationId, data: p.data, resume: p.resume, autoSubmit: p.autoSubmit, queued: p.queued },
    });
  } catch (e) {
    // Injection is refused on chrome://, the Web Store, and a handful of blocked
    // pages. Nothing we can do there; the tab just won't be auto-filled.
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const p = pendingByTab[tabId];
  delete pendingByTab[tabId];
  dropAwaiting(tabId);
  dropWaiting(tabId);
  if (p && p.queued && !p.advanced) setTimeout(nextInQueue, 600);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
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
    noteNotSent(msg.applicationId, sender && sender.tab && sender.tab.id).then(sendResponse);
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
