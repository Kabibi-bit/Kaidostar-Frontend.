/* ============================================================
   Kaidostar API connection layer
   ------------------------------------------------------------
   The real bridge between the frontend and the FastAPI backend.
   Until this file, the frontend was a standalone localStorage demo
   that called the Anthropic API directly; the backend was fully
   built but never contacted. This module is the single point every
   real, authenticated backend call routes through.

   Design goals:
   - One configurable base URL, so pointing at local dev vs the
     deployed Render backend is a one-line change, never scattered.
   - The JWT access token is stored and attached automatically, so
     no individual feature has to remember to send it.
   - Errors are normalized into one predictable shape, so callers
     handle failure the same way everywhere instead of each
     reinventing it.
   - Nothing here calls the Anthropic API directly. Moving AI calls
     server-side (so the API key is never exposed to the browser) is
     exactly what routing through this layer enables.
   ============================================================ */

// The deployed backend URL. Overridable at runtime via a
// window.KAIDOSTAR_API_BASE global (set before this script loads) so the
// same build works against local dev and production without editing
// this file. Trailing slash is stripped so path-joining is
// unambiguous.
const KAIDOSTAR_API_BASE = (function(){
  const configured = (typeof window !== 'undefined' && window.KAIDOSTAR_API_BASE) || 'https://kaidostar-backend.onrender.com';
  return String(configured).replace(/\/+$/, '');
})();

const KAIDOSTAR_TOKEN_KEY = 'kaidostar_access_token';

function getAuthToken(){
  try{ return localStorage.getItem(KAIDOSTAR_TOKEN_KEY); }catch(e){ return null; }
}
function setAuthToken(token){
  try{ localStorage.setItem(KAIDOSTAR_TOKEN_KEY, token); }catch(e){ /* storage unavailable - token stays in memory for this page only */ }
}
function clearAuthToken(){
  try{ localStorage.removeItem(KAIDOSTAR_TOKEN_KEY); }catch(e){ /* nothing to clear */ }
}

/* The core request function. Every real backend call goes through
   here. Returns { ok, status, data, error }:
   - ok:    true only on a genuine 2xx with a parseable body
   - status: the real HTTP status (0 if the request never completed,
             e.g. the backend is unreachable)
   - data:  the parsed JSON body on success, else null
   - error: a human-readable message on failure, else null
   It never throws for an ordinary failure - callers check .ok. This
   is deliberate: a network blip or a 404 is a normal, expected
   outcome to handle, not an exception to crash on. */
async function apiFetch(path, options){
  options = options || {};
  const url = KAIDOSTAR_API_BASE + (path.startsWith('/') ? path : '/' + path);
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});

  // Attach the auth token automatically unless the caller opts out
  // (login/signup themselves have no token yet).
  if(!options.noAuth){
    const token = getAuthToken();
    if(token) headers['Authorization'] = 'Bearer ' + token;
  }

  let resp;
  try{
    resp = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });
  }catch(networkErr){
    // The request never reached the server (offline, CORS, backend
    // down). A real, distinct failure mode from an HTTP error - the
    // caller may want to fall back to cached/local data here.
    return { ok: false, status: 0, data: null, error: 'Could not reach the server - check your connection and try again.' };
  }

  // A 401 on an AUTHENTICATED request means the token is missing,
  // expired, or invalid - clear it so the app stops sending a dead
  // token. But a 401 on a noAuth request (login/signup) is not an
  // expired session at all - it's the backend rejecting credentials,
  // so let it fall through to surface that real message below.
  if(resp.status === 401 && !options.noAuth){
    clearAuthToken();
    return { ok: false, status: 401, data: null, error: 'Your session has expired - please sign in again.' };
  }

  let body = null;
  const text = await resp.text();
  if(text){
    try{ body = JSON.parse(text); }
    catch(e){ body = null; }  // a non-JSON body (shouldn't happen from this API, but never crash on it)
  }

  if(!resp.ok){
    // FastAPI returns a plain-string { detail } for HTTPExceptions, but a 422
    // validation error returns detail as an ARRAY of {loc,msg,type,...} objects.
    // JSON.stringify-ing that array dumped raw JSON straight into the user's face
    // (survey/login/workshop all show result.error verbatim) - e.g. a mistyped
    // email on sign-in showed [{"type":"value_error",...}]. Surface the human
    // message(s) instead, stripping the "Value error, " prefix Pydantic prepends
    // to custom-validator messages.
    const detail = body && (body.detail || body.error);
    let msg;
    if(Array.isArray(detail)){
      msg = detail
        .map(e => (e && e.msg) ? String(e.msg).replace(/^Value error,\s*/, '') : null)
        .filter(Boolean)
        .join('; ') || `Request failed (${resp.status}).`;
    } else if(typeof detail === 'string' && detail){
      msg = detail;
    } else if(detail){
      msg = JSON.stringify(detail);
    } else {
      msg = `Request failed (${resp.status}).`;
    }
    return { ok: false, status: resp.status, data: null, error: msg };
  }

  return { ok: true, status: resp.status, data: body, error: null };
}

/* -------- Auth: the first genuinely-connected flow -------- */

async function apiSignup(email, password, role){
  const result = await apiFetch('/auth/signup', {
    method: 'POST', noAuth: true,
    body: { email, password, role: role || 'candidate' },
  });
  if(result.ok && result.data && result.data.access_token){
    setAuthToken(result.data.access_token);
  }
  return result;
}

async function apiLogin(email, password, captchaToken){
  // captchaToken is only needed once the backend's step-up kicks in (HTTP 428
  // after several failed attempts). Sent as captcha_token; omitted otherwise.
  const body = { email, password };
  if(captchaToken) body.captcha_token = captchaToken;
  const result = await apiFetch('/auth/login', {
    method: 'POST', noAuth: true,
    body,
  });
  if(result.ok && result.data && result.data.access_token){
    setAuthToken(result.data.access_token);
  }
  return result;
}

async function apiLogout(){
  clearAuthToken();
}

/* Validates the current token against the backend and returns the
   real user (or null if the token is missing/expired). Used on load
   to confirm a stored session is still genuinely valid, rather than
   trusting a stale localStorage blob. */
async function apiGetCurrentUser(){
  if(!getAuthToken()) return null;
  const result = await apiFetch('/auth/me');
  return result.ok ? result.data : null;
}

/* -------- Profile: the data nearly every other feature reads -------- */

// The frontend and backend genuinely use different field names for
// the same profile fields (historical, on both sides). Rather than
// rename across dozens of files on either side, the two mappings live
// here, in one place, so each side keeps its own natural naming.
function _profileToBackend(userId, p){
  const body = {
    user_id: userId,
    northstar: p.northstar || '',
    final_idea: p.finalidea || null,
    timeframe: p.timeframe || '',
    stage: p.stage || '',
    priorities: p.priorities || [],
    skills: p.skills || '',
    dealbreakers: p.dealbreakers || null,
    location_pref: p.loc || null,
    full_name: p.fullName || null,
    phone: p.phone || null,
    auto_submit_consent: !!p.autoSubmitConsent,
    target_types: p.types || [],
    is_athlete: !!p.isAthlete,
    is_student: !!p.isStudent,
  };
  if(p.isAthlete){
    body.sport = p.sport || null;
    body.level = p.level || null;
    body.career_direction = p.careerDirection || null;
    body.achievements = p.achievements || null;
  }
  if(p.isStudent){
    body.intended_major = p.intendedMajor || null;
    body.grade_level = p.gradeLevel || null;
    body.target_schools = p.targetSchools || null;
    body.interests = p.interests || null;
    body.student_achievements = p.studentAchievements || null;
  }
  return body;
}
function _profileFromBackend(d){
  if(!d) return null;
  const p = {
    northstar: d.northstar || '',
    finalidea: d.final_idea || '',
    timeframe: d.timeframe || '',
    stage: d.stage || '',
    priorities: d.priorities || [],
    skills: d.skills || '',
    dealbreakers: d.dealbreakers || '',
    loc: d.location_pref || '',
    fullName: d.full_name || '',
    phone: d.phone || '',
    autoSubmitConsent: !!d.auto_submit_consent,
    types: d.target_types || [],
    isAthlete: !!d.is_athlete,
    isStudent: !!d.is_student,
  };
  if(d.is_athlete){
    p.sport = d.sport || '';
    p.level = d.level || '';
    p.careerDirection = d.career_direction || '';
    p.achievements = d.achievements || '';
  }
  if(d.is_student){
    p.intendedMajor = d.intended_major || '';
    p.gradeLevel = d.grade_level || '';
    p.targetSchools = d.target_schools || '';
    p.interests = d.interests || '';
    p.studentAchievements = d.student_achievements || '';
  }
  return p;
}

// Saves the profile to the real backend. Returns the same normalized
// { ok, status, data, error } shape as everything else, plus the
// backend's real response (which includes athletic_signals_detected)
// on success.
async function apiSaveProfile(userId, profile){
  return await apiFetch('/profile', { method: 'POST', body: _profileToBackend(userId, profile) });
}

// Loads the current profile from the backend and maps it back to the
// frontend's field names. Returns null if there's no profile yet or
// the request failed - the caller decides how to handle that.
async function apiLoadProfile(userId){
  const result = await apiFetch('/profile/' + userId);
  if(!result.ok) return null;
  return _profileFromBackend(result.data);
}

/* -------- Matches: the real scored listings the dashboard shows -------- */

// The backend scores listings with snake_case keys; the dashboard's
// rendering was written against camelCase. This maps one match dict so
// the existing render code works unchanged against real backend data.
// The backend's factor keys are snake_case (goal_fit, days_left, ...); the card
// renderer reads camelCase (goalFit, daysLeft, ...). Passing the raw dict through
// meant EVERY backend-scored match rendered with an empty breakdown ("no strong
// factors engaged") - the honest, named-contributor breakdown, the app's core
// differentiator, was silently blank for every logged-in user, while the offline
// demo path (FE scoreListing, already camelCase) looked fine. Remap here so the
// breakdown, location reason and days-left notes render on the real path too.
function _factorsFromBackend(f){
  if(!f || typeof f !== 'object') return f || {};
  return {
    goalFit: f.goal_fit,
    skillFit: f.skill_fit,
    priorityFit: f.priority_fit,
    locationFit: f.location_fit,
    locationReason: f.location_reason,
    deadlineUrgency: f.deadline_urgency,
    daysLeft: f.days_left,
    descriptionFit: f.description_fit,
    descriptionTerms: f.description_terms,
    semanticFit: f.semantic_fit,
    roadmapFit: f.roadmap_fit,
    roadmapAlignment: f.roadmap_alignment,
  };
}
function _matchFromBackend(m){
  // A malformed matches array (a null/junk element from a partial or buggy backend
  // response) would otherwise crash on m.id here, taking down the whole scan cycle.
  // Return null for a non-object; apiGetMatches filters those out.
  if(!m || typeof m !== 'object') return null;
  return {
    id: m.id,
    title: m.title,
    org: m.org,
    type: m.type,
    loc: m.location,           // backend 'location' -> frontend 'loc'
    deadline: m.deadline,
    // The backend sends the real posting text (rank_listings returns the full
    // listing dict, which includes description). Dropping it here left the FE's
    // application/cover-letter drafting with an empty description for every
    // logged-in match, so drafts silently lost the "tailor to the actual posting
    // text" step the prompt relies on. Map it through.
    description: m.description || '',
    tags: m.tags || [],
    pct: m.score_pct,          // the score
    signalStrength: m.signal_strength,
    dataQuality: m.data_quality,
    matchedGoal: m.goal_match_tags || [],
    matchedSkill: m.skill_match_tags || [],
    personalized: m.personalized,
    rationale: m.rationale,
    factors: _factorsFromBackend(m.factors),
    seniorityMismatch: m.seniority_mismatch,
    locationMismatch: m.location_mismatch,
    stalenessNote: m.staleness_note,
    salaryMin: m.salary_min,
    salaryMax: m.salary_max,
    salaryIsPredicted: m.salary_is_predicted,
    // Signal Score (fit + freshness + ghost-risk) — Kaidostar's honest reframing
    // of "match %". Backend computes it; map its fields to the card's shape.
    signalScore: m.signal_score,
    signalBand: m.signal_band,
    signalHeadline: m.signal_headline,
    freshness: m.freshness,
    freshNote: m.fresh_note,
    ghostRisk: m.ghost_risk,
    ageDays: m.age_days,
  };
}

// Fetches the real, backend-scored matches for a user. Returns
// { ok, matches, nearMisses, note, error } - matches/nearMisses are
// already mapped to the frontend's field shape. On failure, matches
// is an empty array so a caller can render an empty state rather than
// crash.
async function apiGetMatches(userId){
  const result = await apiFetch('/listings/matches/' + userId);
  if(!result.ok){
    return { ok: false, matches: [], nearMisses: [], note: null, error: result.error };
  }
  const d = result.data || {};
  return {
    ok: true,
    // Array.isArray + filter(Boolean): a non-array matches field (a malformed
    // response) would crash .map, and _matchFromBackend now returns null for a junk
    // element - drop those so one bad entry can't break the whole result.
    matches: (Array.isArray(d.matches) ? d.matches : []).map(_matchFromBackend).filter(Boolean),
    nearMisses: (Array.isArray(d.near_misses) ? d.near_misses : []).map(_matchFromBackend).filter(Boolean),
    note: d.low_match_note || null,
    error: null,
  };
}

// Triggers a real backend scan (pulls fresh listings, re-scores), then
// returns the same shape as apiGetMatches. This is what a "Run scan"
// action genuinely does server-side.
async function apiTriggerScan(userId){
  const result = await apiFetch('/listings/scan/' + userId, { method: 'POST' });
  if(!result.ok){
    return { ok: false, matches: [], nearMisses: [], note: null, error: result.error };
  }
  // The scan endpoint re-runs scoring; fetch the fresh matches after.
  return await apiGetMatches(userId);
}

/* -------- Saved listings (starring) -------- */
async function apiSaveListing(userId, listingId){
  return await apiFetch('/saved', { method: 'POST', body: { user_id: userId, listing_id: String(listingId) } });
}
async function apiUnsaveListing(userId, listingId){
  return await apiFetch('/saved/' + userId + '/' + listingId, { method: 'DELETE' });
}
// Returns a Set of saved listing ids (as strings), or an empty Set on
// failure - the caller can render an empty state rather than crash.
async function apiGetSavedIds(userId){
  const result = await apiFetch('/saved/' + userId);
  if(!result.ok || !Array.isArray(result.data)) return new Set();
  // GET /saved returns rich objects ({listing_id, title, org, type, deadline}),
  // not bare ids like /dismissed does. A plain .map(String) turned every one into
  // the literal "[object Object]", so the resulting Set never matched
  // savedIds.has(String(l.id)) - a logged-in user's saved listings silently
  // stopped showing as saved and the "saved only" filter came up empty. Pull the
  // id out of each row, tolerating a bare id too in case the shape ever changes.
  return new Set(result.data.map(x => String(x && typeof x === 'object' ? x.listing_id : x)));
}

/* -------- Dismissed listings (not interested) -------- */
async function apiDismissListing(userId, listingId){
  return await apiFetch('/dismissed', { method: 'POST', body: { user_id: userId, listing_id: String(listingId) } });
}
async function apiUndismissListing(userId, listingId){
  return await apiFetch('/dismissed/' + userId + '/' + listingId, { method: 'DELETE' });
}
async function apiGetDismissedIds(userId){
  const result = await apiFetch('/dismissed/' + userId);
  if(!result.ok || !Array.isArray(result.data)) return new Set();
  return new Set(result.data.map(String));
}

/* -------- Applications: create one for a match -------- */
// The backend's /applications/accept genuinely drafts + records an
// application for a listing (the same real action the dashboard's
// "apply" does). Returns the normalized shape plus the backend body.
async function apiCreateApplication(userId, listingId){
  return await apiFetch('/applications/accept', { method: 'POST', body: { user_id: userId, listing_id: String(listingId) } });
}

/* -------- Roadmap -------- */
// Loads the current roadmap; returns { summary, milestones } mapped to
// the frontend's shape, or null if there's genuinely no roadmap yet.
async function apiGetRoadmap(userId){
  const result = await apiFetch('/roadmap/' + userId);
  if(!result.ok || !result.data || !Array.isArray(result.data.milestones) || result.data.milestones.length === 0){
    return null;
  }
  // Stamp the frontend's current roadmap version so getRoadmap()
  // accepts this as a valid current-format roadmap. Read the global
  // at call time (state.js is loaded by now) with a safe fallback.
  const version = (typeof ROADMAP_VERSION !== 'undefined') ? ROADMAP_VERSION : 3;
  return { version, summary: result.data.summary || '', milestones: result.data.milestones };
}
// Asks the backend to generate (or regenerate) the roadmap from the
// person's real profile - the generation happens server-side.
async function apiGenerateRoadmap(userId){
  const result = await apiFetch('/roadmap/' + userId, { method: 'POST' });
  if(!result.ok) return null;
  const version = (typeof ROADMAP_VERSION !== 'undefined') ? ROADMAP_VERSION : 3;
  return { version, summary: (result.data && result.data.summary) || '', milestones: (result.data && result.data.milestones) || [] };
}
// Updates a single milestone's status by its REAL backend id (the
// roadmap GET returns an `id` on each milestone). reflection is
// optional - the backend records it only when status becomes 'done'.
async function apiUpdateMilestoneStatus(milestoneId, status, reflection){
  const body = { status };
  if(reflection) body.reflection = reflection;
  return await apiFetch('/roadmap/milestone/' + milestoneId + '/status', { method: 'POST', body });
}

/* -------- Applications hub (workshop) -------- */
// Lists the user's real applications. The backend already returns the
// frontend's field names for the top-level columns (id, listing_title,
// listing_org, status, confidence_pct, draft, sendable_at, outcome_status,
// counterfactual_confidence_pct), so those pass through. The ONE exception is
// factors_snapshot: the backend stores it with snake_case keys (goal_fit,
// skill_fit, ...) from its own scorer, but the entire frontend reads it with
// camelCase keys (goalFit, skillFit - FACTOR_NAMES_JS). Without normalizing the
// keys here, a logged-in user's hydrated snapshot silently failed every
// personalization / factor-reliability / interaction read, leaving those
// features neutral on reload even though the data was there - the same
// hydration gap as before, just one layer deeper (returned but unreadable).
// Returns an array (empty on failure) so callers can render directly.
function _snakeToCamel(k){ return String(k).replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function _camelizeKeys(obj){
  if(!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for(const k in obj){ if(Object.prototype.hasOwnProperty.call(obj, k)) out[_snakeToCamel(k)] = obj[k]; }
  return out;
}
async function apiListApplications(userId){
  const result = await apiFetch('/applications/' + userId);
  if(!(result.ok && Array.isArray(result.data))) return [];
  return result.data.map(a =>
    (a && a.factors_snapshot && typeof a.factors_snapshot === 'object')
      ? { ...a, factors_snapshot: _camelizeKeys(a.factors_snapshot) }
      : a
  );
}
async function apiApproveApplication(applicationId){
  return await apiFetch('/applications/' + applicationId + '/approve', { method: 'POST' });
}
async function apiSendApplication(applicationId){
  return await apiFetch('/applications/' + applicationId + '/send', { method: 'POST' });
}
async function apiMarkApplicationSubmitted(applicationId){
  return await apiFetch('/applications/' + applicationId + '/mark-submitted', { method: 'POST' });
}
async function apiSetAutoSubmitConsent(userId, granted){
  return await apiFetch('/profile/' + userId + '/auto-submit-consent', { method: 'POST', body: { granted: !!granted } });
}
// Persist a skill add/remove to the backend so the server (matching, scheduler
// auto-apply, resume generation) reflects it immediately - not only after the next
// full survey save. The local profile update remains authoritative for the UI;
// these keep the backend in sync.
async function apiAddSkill(userId, skill){
  return await apiFetch('/resume/' + userId + '/skills/add', { method: 'POST', body: { skill: skill } });
}
async function apiRemoveSkill(userId, skill){
  return await apiFetch('/resume/' + userId + '/skills/remove', { method: 'POST', body: { skill: skill } });
}
async function apiUndoApplication(applicationId){
  return await apiFetch('/applications/' + applicationId + '/undo', { method: 'POST' });
}
// Logs a real outcome for an application's listing. status is one of
// interview/offer/rejected/ghosted/applied; reflection is optional.
async function apiLogOutcome(userId, listingId, status, reflection){
  const body = { user_id: userId, listing_id: String(listingId), status };
  if(reflection) body.reflection = reflection;
  return await apiFetch('/outcomes', { method: 'POST', body });
}

/* -------- Auto-apply settings -------- */
// Loads the real auto-apply settings; returns { enabled, threshold }
// or null if there's genuinely none/failed (caller keeps its default).
async function apiGetAutoApplySettings(userId){
  const result = await apiFetch('/profile/' + userId + '/auto-apply-settings');
  if(!result.ok || !result.data) return null;
  return { enabled: !!result.data.enabled, threshold: result.data.threshold };
}
// Saves the enabled toggle + confidence threshold to the backend.
async function apiSaveAutoApplySettings(userId, enabled, threshold){
  return await apiFetch('/profile/' + userId + '/auto-apply-settings', {
    method: 'POST', body: { enabled: !!enabled, threshold: threshold },
  });
}

/* -------- Notifications (inbox) -------- */
// Lists the user's notifications, mapping the backend's is_read to the
// frontend's `read`. Returns an array (empty on failure).
async function apiListNotifications(userId){
  const result = await apiFetch('/notifications/' + userId);
  if(!result.ok || !Array.isArray(result.data)) return [];
  return result.data.map(n => ({
    id: n.id, type: n.type, title: n.title, detail: n.detail,
    read: !!n.is_read, ts: n.created_at,
  }));
}
async function apiMarkAllNotificationsRead(userId){
  return await apiFetch('/notifications/' + userId + '/mark-all-read', { method: 'POST' });
}
async function apiClearNotifications(userId){
  return await apiFetch('/notifications/' + userId, { method: 'DELETE' });
}

/* -------- Waypoint journal (private reflection posts) -------- */
// Lists the user's own journal posts, mapping post_id -> id so the
// frontend's existing render code works unchanged.
async function apiListJournalPosts(userId){
  const result = await apiFetch('/social/posts/' + userId);
  if(!result.ok || !Array.isArray(result.data)) return [];
  return result.data.map(p => ({
    id: p.post_id, body: p.body, video_url: p.video_url,
    tag_value: p.tag_value, tag_label: p.tag_label,
    created_at: p.created_at, edited_at: p.edited_at,
  }));
}
// Creates a real journal post. The frontend's field names (body,
// video_url, tag_value, tag_label) already match the backend's PostIn.
async function apiCreateJournalPost(userId, post){
  return await apiFetch('/social/posts', {
    method: 'POST',
    body: {
      user_id: userId,
      body: post.body,
      video_url: post.video_url || null,
      tag_value: post.tag_value != null ? String(post.tag_value) : null,
      tag_label: post.tag_label || null,
    },
  });
}

/* -------- Athlete profile -------- */
// An athlete profile uses the SAME /profile endpoint with
// is_athlete:true (athlete is a trait, not a separate account type).
// The backend requires a non-empty northstar, which the athlete
// survey doesn't collect directly - so we synthesize an honest one
// from their real sport + stated career direction. This is a genuine
// translation of what they told us, not invented content.
function _athleteNorthstar(athlete){
  const sport = athlete.sport || 'my sport';
  const dir = athlete.careerDirection || 'play-college';
  const phrase = {
    'play-college': `Compete in ${sport} at the college level`,
    'go-pro': `Go pro in ${sport}`,
    'coach': `Build a career coaching ${sport}`,
    'sports-management': `Build a career in sports management, grounded in my ${sport} background`,
  }[dir] || `Pursue ${sport} at the next level`;
  return phrase;
}
async function apiSaveAthleteProfile(userId, athlete){
  const body = {
    user_id: userId,
    northstar: _athleteNorthstar(athlete),
    final_idea: null,
    timeframe: athlete.timeframe || '1-2yr',
    stage: athlete.stage || 'student',
    priorities: athlete.priorities || [],
    // achievements plays the role "skills" does for a candidate - it's
    // the real experience text the matcher scores against.
    skills: athlete.achievements || '',
    dealbreakers: athlete.dealbreakers || null,
    location_pref: athlete.loc || null,
    target_types: athlete.types || ['job'],
    is_athlete: true,
    sport: athlete.sport || null,
    level: athlete.level || null,
    career_direction: athlete.careerDirection || null,
    achievements: athlete.achievements || null,
    // Recruiting specifics — now persisted (previously dropped on save).
    position: athlete.position || null,
    grad_year: athlete.gradYear || null,
    target_division: athlete.targetDivision || null,
    gpa: athlete.gpa || null,
  };
  return await apiFetch('/profile', { method: 'POST', body });
}
// Loads the profile and maps it back to the frontend athlete shape.
// Returns null if there's no profile or it genuinely isn't an athlete
// one (so a candidate profile never masquerades as an athlete's).
async function apiLoadAthleteProfile(userId){
  const result = await apiFetch('/profile/' + userId);
  if(!result.ok || !result.data || !result.data.is_athlete) return null;
  const d = result.data;
  return {
    sport: d.sport || '',
    level: d.level || '',
    careerDirection: d.career_direction || '',
    achievements: d.achievements || '',
    loc: d.location_pref || '',
    dealbreakers: d.dealbreakers || '',
    position: d.position || '',
    gradYear: d.grad_year || '',
    targetDivision: d.target_division || '',
    gpa: d.gpa || '',
  };
}

/* -------- Career discovery (explore) -------- */
// Generates the ranked career directions server-side. This moves what
// was a direct browser->Anthropic call onto the backend, so the API
// key is never exposed client-side. Maps the frontend answers shape
// (freeText -> free_text). Returns the directions array (empty on
// failure) so the caller can render directly.
async function apiGetCareerDirections(userId, answers){
  const result = await apiFetch('/career-discovery', {
    method: 'POST',
    body: {
      user_id: userId,
      people: answers.people, data: answers.data,
      creative: answers.creative, structure: answers.structure,
      free_text: answers.freeText || '',
    },
  });
  if(!result.ok || !result.data || !Array.isArray(result.data.directions)) return { ok: false, directions: [], error: result.error };
  // Map the backend's snake_case fields to the camelCase the frontend
  // template reads. The backend omits why_fits/first_step (those come
  // from the on-demand explain endpoint), which is exactly what makes
  // the "Explain why this fits" button render.
  const directions = result.data.directions.map(d => ({
    ...d,
    relatedCount: d.related_count != null ? d.related_count : (d.relatedCount || 0),
  }));
  return { ok: true, directions, error: null };
}
// Gets the on-demand deep explanation for one direction, by its id.
async function apiExplainCareerDirection(userId, directionId){
  const result = await apiFetch('/career-discovery/' + userId + '/explain', {
    method: 'POST', body: { direction_id: directionId },
  });
  if(!result.ok) return null;
  return (result.data && (result.data.explanation || result.data)) || null;
}

/* -------- Metis chat (the AI guide) --------
   The backend owns the Anthropic key, builds the full system context, enforces
   the metis-chat rate cap, and persists cross-session memory. The frontend used
   to call api.anthropic.com directly from the browser, which cannot authenticate
   from a static page (no key, CORS-blocked) - so Metis silently failed for every
   logged-in user. This routes it through the real /chat endpoint instead.
   `history` is the prior turns ([{role, content}]), NOT including `message`
   (the new user text) - matching the backend ChatIn contract. Returns
   { ok, reply, error }. */
async function apiChat(userId, message, history){
  const result = await apiFetch('/chat', {
    method: 'POST',
    body: { user_id: userId, message: message, history: Array.isArray(history) ? history : [] },
  });
  if(!result.ok) return { ok: false, reply: '', error: result.error };
  return { ok: true, reply: (result.data && result.data.reply) || '', error: null };
}

/* -------- AI features routed through the backend (server-side key) --------
   Each mirrors a direct browser->Anthropic function that can't authenticate from
   a static page. Callers try these first when logged in and keep the direct
   function as an offline fallback. Each returns the same shape its direct
   counterpart returns (the backend service and the FE function are mirrors), or
   null so the caller falls back. */

// researchCompany(companyName, roleTitle) -> { company_name, findings, sources }
async function apiResearchCompany(companyName, roleTitle){
  const result = await apiFetch('/market/research-company', {
    method: 'POST', body: { company_name: companyName, role_title: roleTitle },
  });
  return result.ok ? result.data : null;
}

// generateInterviewPrep(...) -> prep object. Backend also reads the profile/roadmap
// server-side, so the wrapper only needs company, role and (optional) research text.
async function apiInterviewPrep(userId, companyName, roleTitle, companyResearch){
  const result = await apiFetch('/market/interview-prep', {
    method: 'POST',
    body: { user_id: userId, company_name: companyName, role_title: roleTitle, company_research: companyResearch || null },
  });
  return result.ok ? result.data : null;
}

// explainOutcomeDeep(app, listing, profile) -> raw text string. The backend reads
// the application, its listing and its logged outcome server-side by application id,
// so the wrapper only needs the real backend application id (present on logged-in
// applications loaded via apiListApplications). Returns the explanation string, or
// null so the caller falls back to the direct call.
async function apiExplainOutcome(applicationId){
  const result = await apiFetch('/applications/' + applicationId + '/explain-outcome');
  if(!result.ok || !result.data) return null;
  const explanation = result.data.explanation;
  return (typeof explanation === 'string' && explanation.trim()) ? explanation : null;
}

// getOrAnalyzeStrategicPositionJS(...) -> { current_position, compounding_connections,
// has_genuine_compounding, next_move, momentum_since_last_check?, cached }. The backend
// reads the profile, roadmap, applications, saved listings and engagement server-side
// and keeps its own content-based cache, so the wrapper needs only the user id.
// Returns the analysis object or null so the caller falls back to the local flow.
async function apiStrategicPosition(userId){
  const result = await apiFetch('/strategy/' + userId + '/position');
  return (result.ok && result.data && typeof result.data.current_position === 'string') ? result.data : null;
}

// generateDeepPersonalizationInsightsJS() -> { insights, confidence, flaggedInsightIndices,
// sampleSize, note }. The backend reads the user's applications + outcomes server-side and
// returns the same shape in snake_case; this maps snake -> the camelCase keys the overview
// page reads. Returns the mapped object, or null so the caller falls back to the direct call.
async function apiPersonalizationInsights(userId){
  const result = await apiFetch('/outcomes/' + userId + '/personalization-insights');
  if(!result.ok || !result.data || !Array.isArray(result.data.insights)) return null;
  const d = result.data;
  return {
    insights: d.insights,
    confidence: d.confidence || 'low',
    flaggedInsightIndices: Array.isArray(d.flagged_insight_indices) ? d.flagged_insight_indices : [],
    sampleSize: (typeof d.sample_size === 'number') ? d.sample_size : d.insights.length,
    note: d.note || null,
  };
}

// True only for a real backend UUID (the id shape apiGetMatches/apiListApplications
// return). Frontend seed LISTINGS use short non-UUID ids; the listing-scoped backend
// routes 404 on those, so callers use this to skip a guaranteed-404 round-trip and go
// straight to the local fallback for seed listings.
function _isServerId(id){
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// generateQuickClipPlan(athleteProfile, clipsDescription, targetSchools) ->
// { edit_sequence, captions, honest_assessment }. Backend /athletics/edit-plan returns
// the identical shape. Maps the athlete profile's careerDirection -> career_direction.
// Returns the plan object or null so the caller falls back to the direct call.
async function apiClipEditPlan(userId, athlete, clipsDescription, targetSchools){
  const body = {
    sport: athlete.sport || '', level: athlete.level || '',
    career_direction: athlete.careerDirection || '',
    clips_description: clipsDescription || '',
    target_schools: (targetSchools && targetSchools.trim()) ? targetSchools.trim() : '',
  };
  if(userId) body.user_id = userId;
  const result = await apiFetch('/athletics/edit-plan', { method: 'POST', body });
  const d = result.ok ? result.data : null;
  return (d && Array.isArray(d.edit_sequence) && Array.isArray(d.captions) && typeof d.honest_assessment === 'string') ? d : null;
}

// findAssistanceOptions(need, budget, locationContext) -> { text, sources }. Backend
// /assistance/search returns { findings, sources }; this maps findings -> text (the key
// the callers read). Returns { text, sources } or null so the caller falls back.
async function apiAssistanceSearch(userId, needDescription, budget, locationContext){
  const body = { need_description: needDescription, budget };
  if(locationContext) body.location_context = locationContext;
  if(userId) body.user_id = userId;
  const result = await apiFetch('/assistance/search', { method: 'POST', body });
  if(!result.ok || !result.data || typeof result.data.findings !== 'string' || !result.data.findings.trim()) return null;
  return { text: result.data.findings, sources: Array.isArray(result.data.sources) ? result.data.sources : [] };
}

// fetchDeepExplanation(listing, profile, roadmap) -> explanation string. Backend reads the
// profile + roadmap server-side and returns { explanation }. Needs a server listing UUID.
// Returns the explanation string, or null so the caller falls back to the direct call.
async function apiDeepExplanation(userId, listingId){
  if(!_isServerId(listingId)) return null;
  const result = await apiFetch('/listings/matches/' + userId + '/explain/' + listingId);
  if(!result.ok || !result.data) return null;
  const ex = result.data.explanation;
  return (typeof ex === 'string' && ex.trim()) ? ex : null;
}

// fetchConnectionStrategy(listing, profile) -> { contact_type, search_guidance,
// outreach_message }. Backend returns those three (plus listing fields). Needs a server
// listing UUID. Returns the three-key object, or null so the caller falls back.
async function apiConnectionStrategy(userId, listingId){
  if(!_isServerId(listingId)) return null;
  const result = await apiFetch('/listings/matches/' + userId + '/connect/' + listingId);
  const d = result.ok ? result.data : null;
  // Require all three to be non-empty strings: an empty outreach_message would
  // otherwise flow straight into a drafted outreach email. Falls back to the
  // direct call rather than surfacing a blank strategy as a success.
  const nonEmpty = s => typeof s === 'string' && s.trim();
  return (d && nonEmpty(d.contact_type) && nonEmpty(d.search_guidance) && nonEmpty(d.outreach_message))
    ? { contact_type: d.contact_type, search_guidance: d.search_guidance, outreach_message: d.outreach_message }
    : null;
}

// draftEngagementSuggestionJS(profile, postContent, posterContext) -> { drafted_question,
// is_smaller_decision_maker, reasoning }. Backend /engagement/draft reads the profile
// server-side and returns a suggestion row that is a superset of those three keys.
// Returns the three-key object, or null so the caller falls back to the direct call.
async function apiDraftEngagement(userId, postContent, posterContext){
  const body = { user_id: userId, post_content: postContent };
  if(posterContext) body.poster_context = posterContext;
  const result = await apiFetch('/engagement/draft', { method: 'POST', body });
  const d = result.ok ? result.data : null;
  return (d && typeof d.drafted_question === 'string' && typeof d.is_smaller_decision_maker === 'boolean' && typeof d.reasoning === 'string')
    ? { drafted_question: d.drafted_question, is_smaller_decision_maker: d.is_smaller_decision_maker, reasoning: d.reasoning }
    : null;
}

// reflectOnJournalEntry(profile, contextSummary, entryBody, tagLabel) -> reflection string.
// Backend /social/posts/{post_id}/reflect reads the stored post by id and returns
// { reflection }. Needs a server post id (synced journal posts carry it). Returns the
// reflection string, or null so the caller falls back to the direct call.
async function apiReflectJournalEntry(postId, focus, contextSummary){
  if(!_isServerId(postId)) return null;
  const body = { focus: focus || '' };
  if(contextSummary) body.context_summary = contextSummary;
  const result = await apiFetch('/social/posts/' + postId + '/reflect', { method: 'POST', body });
  if(!result.ok || !result.data) return null;
  const r = result.data.reflection;
  return (typeof r === 'string' && r.trim()) ? r : null;
}

// reflectOnEntryPattern(profile, contextSummary, recentEntries) -> reflection string.
// Backend /social/posts/{user_id}/reflect-pattern reads the user's own recent posts
// server-side (the passed entries are not sent) and returns { reflection }. Needs >=2
// synced posts. Returns the reflection string, or null so the caller falls back.
async function apiReflectEntryPattern(userId, focus, contextSummary, limit){
  const body = { focus: focus || '' };
  if(contextSummary) body.context_summary = contextSummary;
  if(typeof limit === 'number') body.limit = limit;
  const result = await apiFetch('/social/posts/' + userId + '/reflect-pattern', { method: 'POST', body });
  if(!result.ok || !result.data) return null;
  const r = result.data.reflection;
  return (typeof r === 'string' && r.trim()) ? r : null;
}

/* -------- Athlete content coach (recruiting content plan + program research) -------- */
// Generates the recruiting content plan server-side, moving what was
// a direct browser->Anthropic call onto the backend. Maps the
// frontend's careerDirection -> career_direction. Returns the plan
// object or null on failure (caller can fall back to local).
async function apiGenerateContentPlan(athlete){
  const _s = (typeof getSession === 'function') ? getSession() : null;
  const result = await apiFetch('/athletics/content-coach', {
    method: 'POST',
    body: {
      user_id: (_s && _s.user_id) || null,   // enables per-user cost metering server-side
      sport: athlete.sport || '',
      level: athlete.level || '',
      career_direction: athlete.careerDirection || '',
      achievements: athlete.achievements || '',
    },
  });
  if(!result.ok) return null;
  return result.data || null;
}
// Researches a specific program server-side (the backend runs the
// web-search-backed Claude call). Returns the result text/object or
// null on failure.
async function apiResearchProgram(sport, level, programName){
  const _s = (typeof getSession === 'function') ? getSession() : null;
  const result = await apiFetch('/athletics/research-program', {
    method: 'POST',
    body: { user_id: (_s && _s.user_id) || null, sport: sport || '', level: level || '', program_name: programName || '' },
  });
  if(!result.ok) return null;
  return result.data || null;
}

/* ============================================================================
   ADMISSIONS API — links the admissions frontend to the /schools backend.
   Every call returns the backend result on success, or null on any failure
   (network, auth, 404). Callers use the local engine as a fallback, which is
   kept in byte-for-byte parity with the backend, so the UI never breaks even
   if the backend is unreachable. This is the "backend-first, local-fallback"
   pattern: the backend becomes the source of truth when available.
   ============================================================================ */

// Public reference data (no user needed).
async function apiSchoolSearch(q){
  const result = await apiFetch('/schools/search?q=' + encodeURIComponent(q || ''));
  if(!result.ok) return null;
  return (result.data && result.data.results) || null;
}
async function apiSchoolLookup(name){
  const result = await apiFetch('/schools/lookup?name=' + encodeURIComponent(name || ''));
  if(!result.ok) return null;
  return result.data ? result.data.school : null;
}

// Per-student intelligence (auth-protected; needs the user's id).
async function apiSchoolGuidance(userId){
  const result = await apiFetch('/schools/guidance/' + userId);
  return result.ok ? result.data : null;
}
async function apiAdmissionsRoadmap(userId){
  const result = await apiFetch('/schools/roadmap/' + userId);
  return result.ok ? result.data : null;
}
async function apiAdmissionsReadiness(userId){
  const result = await apiFetch('/schools/readiness/' + userId);
  return result.ok ? result.data : null;
}
async function apiAdmissionsListBalance(userId){
  const result = await apiFetch('/schools/list-balance/' + userId);
  return result.ok ? result.data : null;
}
async function apiAdmissionsGapRadar(userId){
  const result = await apiFetch('/schools/gap-radar/' + userId);
  return result.ok ? result.data : null;
}
async function apiAdmissionsDeadlines(userId){
  const result = await apiFetch('/schools/deadlines/' + userId);
  return result.ok ? (result.data && result.data.deadlines) : null;
}
async function apiAdmissionsAssistantContext(userId){
  const result = await apiFetch('/schools/assistant-context/' + userId);
  return result.ok ? (result.data && result.data.system) : null;
}
// Trajectory: record a snapshot, then read the journey (trajectory + milestones
// + consistency + weekly focus in one call).
async function apiAdmissionsSnapshot(userId){
  const result = await apiFetch('/schools/snapshot/' + userId, { method: 'POST', body: {} });
  return result.ok ? result.data : null;
}
async function apiAdmissionsTrajectory(userId){
  const result = await apiFetch('/schools/trajectory/' + userId);
  return result.ok ? result.data : null;
}
async function apiAdmissionsJourney(userId){
  const result = await apiFetch('/schools/journey/' + userId);
  return result.ok ? result.data : null;
}
// Workshop: essay structure, brainstorm outline, and the scored rubric review.
async function apiEssayStructure(userId, theme){
  const result = await apiFetch('/schools/essay/' + userId, { method: 'POST', body: { theme: theme || '' } });
  return result.ok ? result.data : null;
}
async function apiEssayBrainstorm(userId, answers){
  const result = await apiFetch('/schools/essay-brainstorm/' + userId, { method: 'POST', body: answers || {} });
  return result.ok ? result.data : null;
}
async function apiEssayPolish(userId, text, prompt){
  const result = await apiFetch('/schools/essay-polish/' + userId, { method: 'POST', body: { text: text || '', prompt: prompt || '' } });
  return result.ok ? result.data : null;  // { rubric, report }
}

/* ---- Tier (subscription) — backend is the source of truth ---- */
// Reads the user's real tier + feature flags from the backend. The frontend
// TIERS gating still works offline as a fallback, but when logged in the
// backend's answer wins (and it's what's actually enforced on paid endpoints).
async function apiGetTier(userId){
  const result = await apiFetch('/users/' + userId + '/tier');
  return result.ok ? result.data : null;   // { tier, features }
}
// Sets the tier (no payment yet - testing only; backend has the same note).
async function apiSetTier(userId, tier){
  const result = await apiFetch('/users/' + userId + '/tier', { method: 'POST', body: { tier } });
  return result.ok ? result.data : null;
}

/* ---- Athlete highlight detection (Roboflow-backed) ---- */
/* ---- Athlete highlight auto-detection (Roboflow, via backend) ---- */
// Detects high-activity moments in a video the athlete links by URL. The CV
// inference runs on the backend's Roboflow deployment; if it's not configured,
// the response has available:false with an honest note (never fake moments).
async function apiDetectHighlights(userId, videoUrl, sport){
  const result = await apiFetch('/athletics/detect-highlights', {
    method: 'POST',
    body: { user_id: userId, video_url: videoUrl, sport: sport || '' }
  });
  if(!result.ok || !result.data) return { available:false, moments:[], note:'Could not reach the detection service right now.' };
  return result.data;
}
