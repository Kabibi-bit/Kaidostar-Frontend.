/* Kaidostar Apply — Autopilot's status page: the first tab of Autopilot's own window. What it's doing now, what this run
 * has done (and why anything was left for you), and a Stop button. Everything comes from the background worker. */
"use strict";

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
}
function when(ms) {
  if (!ms) return "";
  try { return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; }
}
var TAGS = {
  sent: ["sent", "Sent"], needs_you: ["needs", "Needs you"], stopped: ["needs", "Stopped"], timeout: ["needs", "Out of time"],
  failed: ["needs", "Couldn’t"], unconfirmed: ["unsure", "Check it"], yours: ["yours", "Yours"], released: ["yours", "Back in line"],
};

var status = null;
function ask(type) {
  return new Promise(function (res) {
    try { chrome.runtime.sendMessage({ type: type }, function (r) { void chrome.runtime.lastError; res(r || null); }); } catch (e) { res(null); }
  });
}

function draw() {
  var st = status || {};
  var run = st.run, last = st.last;
  $("dot").className = "dot" + (run ? " on" : "");
  $("sub").textContent = st.on ? "On - every " + (st.everyMin || 20) + " minutes while Chrome is open" : "Off";
  var now = "", counts = null, note = "";
  if (run) {
    if (run.cur) now = "Applying to " + esc(run.cur.title || "an application") + (run.cur.org ? " at " + esc(run.cur.org) : "") + "…";
    else if (run.next) {
      var s = Math.max(0, Math.round((run.next.at - Date.now()) / 1000));
      now = "Next: " + esc(run.next.title || "an application") + (run.next.org ? " at " + esc(run.next.org) : "") + "<small>in " + s + " s</small>";
    } else now = run.stopping ? "Stopping…" : "Checking with Kaidostar…";
    counts = run;
  } else if (last && last.endedAt) {
    now = "Done for now" + "<small>The last run ended at " + esc(when(last.endedAt)) + (st.on ? " - the next one comes within " + (st.everyMin || 20) + " minutes." : ".") + "</small>";
    counts = last;
    note = last.note || "";
  } else {
    now = st.on ? "Waiting for its first run" : "Autopilot is off";
  }
  if (st.signIn) note = "Your sign-in to Kaidostar Apply has expired - sign in again in its popup. Autopilot waits until you do.";
  $("now").innerHTML = now;
  if (counts) {
    $("counts").hidden = false;
    $("counts").innerHTML = "<span><b>" + (counts.sent || 0) + "</b>sent</span><span><b>" + (counts.needs || 0) + "</b>need you</span>" +
      (counts.unsure ? "<span><b>" + counts.unsure + "</b>to check</span>" : "") + (counts.yours ? "<span><b>" + counts.yours + "</b>yours</span>" : "");
  } else $("counts").hidden = true;
  $("note").hidden = !note;
  $("note").textContent = note;
  $("stop").hidden = !run || !!run.stopping;
  $("runNow").hidden = !!run || !st.signedIn || !st.on;
  var log = (run ? run.log : (last && last.log)) || [];
  $("logTitle").textContent = run ? "This run" : "The last run";
  $("log").innerHTML = log.length ? log.slice().reverse().map(function (x) {
    var tg = TAGS[x.outcome] || ["needs", "Needs you"];
    return '<div class="row"><span class="tag ' + tg[0] + '">' + tg[1] + '</span><div><div class="t">' + esc(x.title || "An application") +
      (x.org ? " · " + esc(x.org) : "") + "</div>" + (x.reason ? '<div class="why">' + esc(x.reason) + "</div>" : "") + "</div></div>";
  }).join("") : '<div class="empty">Nothing yet.</div>';
}

function refresh() { return ask("AUTOPILOT_STATUS").then(function (r) { if (r && r.ok) { status = r; draw(); } }); }

$("stop").addEventListener("click", function () { this.disabled = true; ask("AUTOPILOT_STOP").then(function () { $("stop").disabled = false; refresh(); }); });
$("runNow").addEventListener("click", function () { ask("AUTOPILOT_RUN").then(refresh); });
try { chrome.storage.onChanged.addListener(function () { refresh(); }); } catch (e) {}
setInterval(function () { if (status && status.run && status.run.next) draw(); }, 1000);
setInterval(refresh, 15000);
refresh();
