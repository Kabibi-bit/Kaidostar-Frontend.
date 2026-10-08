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

// Right before the content script clicks submit: Kaidostar notes the attempt, so a result the extension never
// sees isn't retried. The tab is then watched: if the form's frame loads a new page, that page is read.
async function noteAttempt(msg, sender) {
  const res = await api("/applications/" + encodeURIComponent(msg.applicationId) + "/submit-attempt", { method: "POST" });
  const tabId = sender && sender.tab && sender.tab.id;
  if (tabId != null && (res.ok || res.status === 0 || res.status >= 500)) {
    const p = pendingByTab[tabId] || {};
    awaitingByTab[tabId] = {
      applicationId: msg.applicationId, frameId: sender.frameId || 0, preUrl: String(msg.preUrl || "").slice(0, 1000), preText: !!msg.preText,
      answered: msg.answered | 0, answers: Array.isArray(msg.answers) ? msg.answers.slice(0, 40) : [], recorded: !!res.ok,
      at: Date.now(), checks: 0,
      payload: { applicationId: msg.applicationId, data: p.data, resume: p.resume, autoSubmit: false, queued: p.queued },
    };
    keepAwaiting(tabId);
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
function siteOf(url) {
  const m = /^https?:\/\/([^/?#:]+)/i.exec(String(url || ""));
  const host = m ? m[1].toLowerCase() : "";
  const parts = host.split(".");
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
  try {
    await chrome.scripting.executeScript({ target: { tabId: details.tabId, frameIds: [details.frameId] }, files: ["form_fill.js", "content.js"] });
    await new Promise((res) => setTimeout(res, 200));
    await chrome.tabs.sendMessage(details.tabId, {
      type: "KAIDOSTAR_VERIFY",
      payload: { applicationId: aw.applicationId, preUrl: aw.preUrl, preText: aw.preText, answered: aw.answered, answers: aw.answers,
        recorded: aw.recorded, payload: aw.payload },
    }, { frameId: details.frameId });
  } catch (e) {
    // a page the extension can't run on: the application stays "may have gone through" on the Auto page
  }
}
if (chrome.webNavigation && chrome.webNavigation.onCompleted) chrome.webNavigation.onCompleted.addListener(verifyNewPage);

async function resolveAnswers(applicationId, questions) {
  const res = await api("/applications/" + encodeURIComponent(applicationId) + "/answers",
    { method: "POST", body: { questions: Array.isArray(questions) ? questions.slice(0, 80) : [] } });
  if (!res.ok || !res.data || !Array.isArray(res.data.answers)) return { ok: false, answers: [] };
  return { ok: true, answers: res.data.answers };
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
    resolveAnswers(msg.applicationId, msg.questions).then(sendResponse);
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
    if (p && p.queued && !p.advanced) { p.advanced = true; setTimeout(nextInQueue, 1500); }
    else if (!p && msg.queued && tabId != null) { pendingByTab[tabId] = { advanced: true, injected: true }; setTimeout(nextInQueue, 1500); }
    sendResponse({ ok: true });
    return false;
  }
});
