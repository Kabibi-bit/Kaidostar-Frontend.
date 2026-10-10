/* Kaidostar Apply — popup UI.
 * Sign in with the user's Kaidostar account (password, then the emailed code - the
 * same two steps as the website), list their applications that still need
 * submitting, and launch an in-browser run for one - or for all of them, one tab
 * at a time. The token is stored only in this extension's local storage and sent
 * only to the configured Kaidostar backend.
 * Autopilot (the background worker applying on its own) is turned on and off here, and shows what it's doing. */
"use strict";

var DEFAULT_BASE = "https://kaidostar-backhend.onrender.com";
var pendingEmail = null;

function $(id) { return document.getElementById(id); }

function getCfg() {
  return chrome.storage.local.get("kaidostar_cfg").then(function (o) {
    var c = Object.assign({ baseUrl: DEFAULT_BASE, autoSubmit: false }, o.kaidostar_cfg || {});
    if (/scanline-backend\.onrender\.com/i.test(c.baseUrl || "")) c.baseUrl = DEFAULT_BASE;   // the old default is gone
    return c;
  });
}
function setCfg(patch) {
  return getCfg().then(function (c) {
    var next = Object.assign({}, c, patch);
    return chrome.storage.local.set({ kaidostar_cfg: next }).then(function () { return next; });
  });
}
function getAuth() {
  return chrome.storage.local.get("kaidostar_auth").then(function (o) { return o.kaidostar_auth || null; });
}
function setAuth(a) { return chrome.storage.local.set({ kaidostar_auth: a }); }
function clearAuth() { return chrome.storage.local.remove("kaidostar_auth"); }
function baseOf(c) { return String(c.baseUrl || DEFAULT_BASE).replace(/\/+$/, ""); }

function show(view) {
  $("loginView").hidden = view !== "login";
  $("appsView").hidden = view !== "apps";
}
function msg(el, kind, text) {
  el.className = "msg" + (kind ? " " + kind : "");
  el.textContent = text || "";
  if (!text) el.className = "msg";
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

async function postJson(path, body) {
  var base = baseOf(await getCfg());
  try {
    var r = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    var d = null;
    try { d = await r.json(); } catch (e) { d = null; }
    return { ok: r.ok, status: r.status, data: d, base: base };
  } catch (e) {
    return { ok: false, status: 0, data: null, base: base };
  }
}

function showCodeStep(on) {
  $("codeBox").hidden = !on;
  $("loginBtn").hidden = on;
  $("password").disabled = on;
  $("email").disabled = on;
  if (on) setTimeout(function () { $("code").focus(); }, 50);
}

async function doLogin() {
  var email = $("email").value.trim();
  var password = $("password").value;
  if (!email || !password) { msg($("loginMsg"), "err", "Enter your email and password."); return; }
  $("loginBtn").disabled = true;
  msg($("loginMsg"), "info", "Signing in…");
  var r = await postJson("/auth/login", { email: email, password: password });
  $("loginBtn").disabled = false;
  if (r.status === 0) { msg($("loginMsg"), "err", "Couldn't reach " + r.base + ". Check the backend URL under settings."); return; }
  if (r.status === 401) { msg($("loginMsg"), "err", "Incorrect email or password."); return; }
  if (r.status === 428 || r.status === 429) { msg($("loginMsg"), "err", "Too many attempts — try again shortly, or sign in on the website first."); return; }
  if (!r.ok || !r.data) { msg($("loginMsg"), "err", "Sign-in failed (HTTP " + r.status + ")."); return; }
  if (r.data.access_token) { await finishLogin(r.data); return; }
  if (r.data.status === "email_not_verified") { msg($("loginMsg"), "err", "Verify your email on the Kaidostar website first, then sign in here."); return; }
  if (r.data.status === "mfa_required") {
    pendingEmail = r.data.email || email;
    showCodeStep(true);
    msg($("loginMsg"), "info", r.data.delivery === "cooldown" ? "A code was sent a moment ago - check your email." : "We emailed you a sign-in code.");
    return;
  }
  msg($("loginMsg"), "err", "Sign-in didn't complete - try again.");
}

async function doCode() {
  var code = $("code").value.trim();
  if (!code) { msg($("loginMsg"), "err", "Enter the code from your email."); return; }
  $("codeBtn").disabled = true;
  var r = await postJson("/auth/verify-2fa", { email: pendingEmail, code: code });
  $("codeBtn").disabled = false;
  if (r.ok && r.data && r.data.access_token) { await finishLogin(r.data); return; }
  msg($("loginMsg"), "err", (r.data && typeof r.data.detail === "string") ? r.data.detail : "That code didn't work - try again.");
}

async function resendCode() {
  if (!pendingEmail) return;
  var r = await postJson("/auth/resend-2fa", { email: pendingEmail });
  msg($("loginMsg"), r.ok ? "info" : "err", r.ok ? "If a sign-in was pending, a new code is on its way." : "Couldn't send a new code just now.");
}

async function finishLogin(d) {
  await setAuth({ token: d.access_token, userId: d.user_id, email: d.email });
  apAsk("AUTOPILOT_SIGNED_IN").then(apRefresh);
  pendingEmail = null;
  showCodeStep(false);
  $("password").value = ""; $("code").value = "";
  msg($("loginMsg"), "", "");
  show("apps");
  loadApps();
}

var readyIds = [];

function renderApps(apps) {
  var list = $("appList");
  list.innerHTML = "";
  readyIds = apps.map(function (a) { return a.id; });
  $("applyAll").hidden = apps.length < 2;
  if (!apps.length) {
    list.innerHTML = '<div class="empty">Nothing waiting to be submitted. When Auto or you approve an application, it appears here.</div>';
    return;
  }
  apps.forEach(function (a) {
    var el = document.createElement("div");
    el.className = "app";
    var statusLabel = a.status === "ready_to_submit" ? "Ready to submit" : "Approved";
    el.innerHTML =
      '<div class="t">' + esc(a.listing_title || "Application") + "</div>" +
      '<div class="o">' + esc(a.listing_org || "") + "</div>" +
      '<div class="st">' + statusLabel + (a.auto_prepared ? " · prepared by Auto" : "") + "</div>" +
      (a.send_reasoning ? '<div class="st" style="margin-top:4px;">' + esc(a.send_reasoning) + "</div>" : "") +
      '<button class="small" style="margin-top:9px" data-id="' + esc(a.id) + '">Apply in this browser</button>';
    el.querySelector("button").addEventListener("click", function () { launch(a.id, this); });
    list.appendChild(el);
  });
}

async function loadApps() {
  var a = await getAuth();
  if (!a) { show("login"); return; }
  $("tier").textContent = a.email || "";
  var base = baseOf(await getCfg());
  msg($("appsMsg"), "info", "Loading…");
  var r;
  try {
    r = await fetch(base + "/applications/" + encodeURIComponent(a.userId), {
      headers: { Authorization: "Bearer " + a.token },
    });
  } catch (e) { msg($("appsMsg"), "err", "Couldn't reach the backend."); return; }
  if (r.status === 401) { await clearAuth(); show("login"); msg($("loginMsg"), "err", "Session expired — sign in again."); return; }
  if (!r.ok) { msg($("appsMsg"), "err", "Couldn't load applications (HTTP " + r.status + ")."); return; }
  var all = await r.json();
  // The extension applies at a real posting's own form, so it only lists
  // applications that (a) are approved or already handed back for web submission,
  // and (b) actually have an apply URL. Already-sent ones don't belong here, nor
  // one that may already have gone through, nor a job board's posting (those sites
  // forbid automated applying - you apply there yourself).
  var ready = (all || []).filter(function (x) {
    return x.apply_url && /^https?:\/\//i.test(x.apply_url) && (x.status === "approved" || x.status === "ready_to_submit") &&
      !x.auto_submit_possibly_sent && x.apply_route !== "aggregator";
  });
  msg($("appsMsg"), "", "");
  renderApps(ready);
}

async function launch(applicationId, btn) {
  if (btn) { btn.disabled = true; btn.textContent = "Opening…"; }
  msg($("appsMsg"), "info", "Opening the application in a new tab. Watch for the Kaidostar panel there.");
  chrome.runtime.sendMessage({ type: "START_AUTOFILL", applicationId: applicationId }, function (resp) {
    if (btn) { btn.disabled = false; btn.textContent = "Apply in this browser"; }
    if (!resp || !resp.ok) {
      msg($("appsMsg"), "err", (resp && resp.error) || "Couldn't start. Try again.");
    } else {
      msg($("appsMsg"), "ok", "Opened. Review and submit in the new tab.");
    }
  });
}

function applyAll() {
  if (!readyIds.length) return;
  msg($("appsMsg"), "info", "Opening the first one. When you finish it (or close its tab), the next opens.");
  chrome.runtime.sendMessage({ type: "START_QUEUE", applicationIds: readyIds }, function (resp) {
    if (!resp || !resp.ok) msg($("appsMsg"), "err", (resp && resp.error) || "Couldn't start. Try again.");
  });
}

// ---- Autopilot ----
function apAsk(type, extra) {
  return new Promise(function (res) {
    try {
      chrome.runtime.sendMessage(Object.assign({ type: type }, extra || {}), function (r) { void chrome.runtime.lastError; res(r || null); });
    } catch (e) { res(null); }
  });
}
function apWhen(ms) {
  if (!ms) return "";
  var d = new Date(ms), today = new Date();
  var t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === today.toDateString() ? "at " + t : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + t;
}
function apSummary(x) {
  var parts = [];
  if (x.sent) parts.push(x.sent + " sent");
  if (x.needs) parts.push(x.needs + " need" + (x.needs === 1 ? "s" : "") + " you");
  if (x.unsure) parts.push(x.unsure + " to check");
  if (x.yours) parts.push(x.yours + " yours");
  return parts.length ? parts.join(", ") : "nothing to apply to";
}
var apBusy = false;
async function apRefresh() {
  var st = await apAsk("AUTOPILOT_STATUS");
  if (!st || !st.ok) return;
  if (!apBusy) $("apOn").checked = !!st.on;
  var line, run = st.run, last = st.last;
  if (run) {
    line = run.cur ? "Applying now: " + (run.cur.title || "an application") + (run.cur.org ? " at " + run.cur.org : "") + "."
      : run.next ? "Next: " + (run.next.title || "an application") + (run.next.org ? " at " + run.next.org : "") + "."
      : run.stopping ? "Stopping…" : "Checking with Kaidostar…";
    if (run.count) line += " This run: " + apSummary(run) + ".";
  } else if (st.signIn) {
    line = "Your sign-in has expired - sign in again (Autopilot waits until you do).";
  } else if (last && last.endedAt) {
    line = "Last run " + apWhen(last.endedAt) + ": " + apSummary(last) + "." + (last.note ? " " + last.note : "") +
      (last.kept ? " " + last.kept + " tab" + (last.kept === 1 ? " is" : "s are") + " kept in its window for you to check." : "");
  } else {
    line = st.on ? "On - it checks every " + (st.everyMin || 20) + " minutes while Chrome is open (or click Run now)." : "Off.";
  }
  $("apLine").textContent = line;
  var state = $("apState");
  state.textContent = run ? "Running" : st.on ? "On" : "Off";
  state.className = "ap-state" + (run ? " run" : st.on ? " on" : "");
  $("apStop").hidden = !run;
  $("apRun").hidden = !!run || !st.on;
  $("apShow").hidden = !(run || (last && last.kept));
}

async function init() {
  var cfg = await getCfg();
  $("baseUrl").value = cfg.baseUrl || "";
  $("baseUrl2").value = cfg.baseUrl || "";
  $("autoSubmit").checked = !!cfg.autoSubmit;

  $("loginBtn").addEventListener("click", doLogin);
  $("password").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  $("codeBtn").addEventListener("click", doCode);
  $("code").addEventListener("keydown", function (e) { if (e.key === "Enter") doCode(); });
  $("resendCode").addEventListener("click", resendCode);
  $("baseUrl").addEventListener("change", function () { setCfg({ baseUrl: this.value.trim() || DEFAULT_BASE }); });
  $("baseUrl2").addEventListener("change", function () {
    var v = this.value.trim() || DEFAULT_BASE; setCfg({ baseUrl: v }); $("baseUrl").value = v;
  });
  $("autoSubmit").addEventListener("change", function () { setCfg({ autoSubmit: this.checked }); });
  $("apOn").addEventListener("change", function () {
    var on = this.checked;
    apBusy = true;
    apAsk("AUTOPILOT_SET", { on: on }).then(function () { apBusy = false; apRefresh(); });
  });
  $("apRun").addEventListener("click", function () {
    $("apLine").textContent = "Starting…";
    apAsk("AUTOPILOT_RUN").then(function (r) {
      if (r && !r.ok && r.note) $("apLine").textContent = r.note;
      setTimeout(apRefresh, 400);
    });
  });
  $("apStop").addEventListener("click", function () { apAsk("AUTOPILOT_STOP").then(apRefresh); });
  $("apShow").addEventListener("click", function () { apAsk("AUTOPILOT_SHOW").then(function () { window.close(); }); });
  $("refresh").addEventListener("click", loadApps);
  $("applyAll").addEventListener("click", applyAll);
  $("settingsLink").addEventListener("click", function () { $("settingsBox").open = !$("settingsBox").open; });
  $("signout").addEventListener("click", async function () {
    // (signed out, Autopilot can't apply: it's turned off - and Kaidostar told - first)
    await apAsk("AUTOPILOT_SET", { on: false });
    await clearAuth(); show("login");
  });

  var a = await getAuth();
  if (a && a.token) { show("apps"); loadApps(); } else { show("login"); }
  // (you've seen what Autopilot couldn't finish: the count on the icon goes)
  apAsk("AUTOPILOT_SEEN");
  apRefresh();
  setInterval(apRefresh, 2000);
}

document.addEventListener("DOMContentLoaded", init);
