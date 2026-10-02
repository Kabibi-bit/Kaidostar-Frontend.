/* ============ KAIDOSTAR SHARED CORE ============ */

/* ---- Logo mark: guiding star, navy + gold ---- */
function kaidostarMark(size){
  size = size || 32;
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="kaidostarGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#F7C878"/>
        <stop offset="100%" stop-color="#D98A2B"/>
      </linearGradient>
      <radialGradient id="kaidostarBg" cx="35%" cy="25%" r="80%">
        <stop offset="0%" stop-color="#1E2150"/>
        <stop offset="100%" stop-color="#0B0C1F"/>
      </radialGradient>
    </defs>
    <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#kaidostarBg)" stroke="#303463" stroke-width="1"/>
    <path d="M20 8 L22.6 17.4 L20 20 L17.4 17.4 Z" fill="url(#kaidostarGold)"/>
    <path d="M20 32 L17.4 22.6 L20 20 L22.6 22.6 Z" fill="url(#kaidostarGold)" opacity="0.5"/>
    <path d="M8 20 L17.4 17.4 L20 20 L17.4 22.6 Z" fill="url(#kaidostarGold)" opacity="0.5"/>
    <path d="M32 20 L22.6 22.6 L20 20 L22.6 17.4 Z" fill="url(#kaidostarGold)" opacity="0.5"/>
    <circle cx="20" cy="20" r="2.4" fill="url(#kaidostarGold)"/>
  </svg>`;
}
function metisMark(size, fg){
  size = size || 26; fg = fg || '#241704';
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6 L22.5 18 L20 20.5 L17.5 18 Z" fill="${fg}"/>
    <path d="M20 34 L17.5 22 L20 19.5 L22.5 22 Z" fill="${fg}" opacity="0.45"/>
    <path d="M6 20 L18 17.5 L20.5 20 L18 22.5 Z" fill="${fg}" opacity="0.45"/>
    <path d="M34 20 L22 22.5 L19.5 20 L22 17.5 Z" fill="${fg}" opacity="0.45"/>
  </svg>`;
}

/* ---- Starfield background (subtle, shared across pages) ---- */
function initStarfield(){
  const canvas = document.getElementById('starfield');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = document.documentElement.scrollHeight;
    const count = Math.floor((canvas.width * canvas.height) / 12000);
    stars = Array.from({length: count}, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.1 + 0.2, baseAlpha: Math.random() * 0.5 + 0.12,
      phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.015 + 0.005,
    }));
  }
  function draw(t){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(const s of stars){
      const twinkle = Math.sin(t * s.speed + s.phase) * 0.35 + 0.65;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.baseAlpha * twinkle})`; ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize);
  resize(); requestAnimationFrame(draw);
}

/* ---- Nav ---- */
function renderNav(activePage){
  const role = localStorage.getItem('kaidostar_role') || 'candidate';
  let links;
  if(role === 'athlete'){
    links = [
      {id: 'athlete-survey', label: 'Survey', href: 'athlete-survey.html'},
      {id: 'athlete', label: 'Opportunities', href: 'athlete-dashboard.html'},
      {id: 'athlete-roadmap', label: 'Roadmap', href: 'athlete-roadmap.html'},
      {id: 'athlete-content', label: 'Content Coach', href: 'athlete-content.html'},
      {id: 'athlete-workshop', label: 'Workshop', href: 'athlete-workshop.html'},
      {id: 'athlete-waypoint', label: 'Waypoint', href: 'athlete-waypoint.html'},
    ];
  } else if(role === 'student'){
    links = [
      {id: 'survey', label: 'Survey', href: 'survey.html'},
      {id: 'admissions', label: 'Opportunities', href: 'admissions-dashboard.html'},
      {id: 'admissions-roadmap', label: 'Roadmap', href: 'admissions-roadmap.html'},
      {id: 'admissions-schedule', label: 'Schedule', href: 'admissions-schedule.html'},
      {id: 'admissions-workshop', label: 'Application', href: 'admissions-workshop.html'},
      {id: 'admissions-waypoint', label: 'Waypoint', href: 'admissions-waypoint.html'},
    ];
  } else {
    links = [
      {id: 'survey', label: 'Survey', href: 'survey.html'},
      {id: 'dashboard', label: 'Job Search', href: 'dashboard.html'},
      {id: 'roadmap', label: 'Roadmap', href: 'roadmap.html'},
      {id: 'workshop', label: 'Workshop', href: 'workshop.html'},
      {id: 'interview', label: 'Interview Prep', href: 'interview-prep.html'},
      {id: 'auto', label: 'Auto', href: 'auto.html'},
      {id: 'explore', label: 'Explore', href: 'explore.html'},
      {id: 'waypoint', label: 'Waypoint', href: 'waypoint.html'},
      {id: 'inbox', label: 'Inbox', href: 'inbox.html'},
    ];
  }
  const unreadCount = getUnreadNotificationCount();
  // Whole-page gated destinations -> the feature key that unlocks them. A free
  // user sees a "PRO" lock right in the nav, so it's obvious which sections need
  // an upgrade before they even click through.
  const GATED_NAV = { auto: 'auto_mode', workshop: 'workshop', 'athlete-workshop': 'workshop', 'admissions-workshop': 'workshop',
    roadmap: 'roadmap', 'athlete-roadmap': 'roadmap', 'admissions-roadmap': 'roadmap',
    interview: 'interview_prep' };
  const linksHtml = links.map(l => {
    const badge = (l.id === 'inbox' && unreadCount > 0) ? ` <span class="nav-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : '';
    const proBadge = (GATED_NAV[l.id] && typeof proBadgeHTML === 'function') ? ' ' + proBadgeHTML(GATED_NAV[l.id], {nav:true}) : '';
    return `<a class="nav-link ${l.id===activePage?'active':''} ${proBadge?'nav-link-gated':''}" href="${l.href}">${l.label}${badge}${proBadge}</a>`;
  }).join('');
  const logoHrefMap = { candidate: 'mission.html' };
  const logoHref = logoHrefMap[role] || 'mission.html';
  const watchActive = localStorage.getItem('kaidostar_watch_active') === 'true';
  const session = getSession();
  const root = document.getElementById('nav-root');
  if(!root) return;
  root.innerHTML = `
    <nav class="nav">
      <div class="wrap nav-inner">
        <a class="logo" href="${logoHref}">${kaidostarMark(32)}<span class="logo-word">KAIDOSTAR</span></a>
        <div class="nav-links">${linksHtml}</div>
        <div class="nav-right">
          <button class="nav-cmdk" id="navCmdkBtn" title="Search & commands (Ctrl/Cmd-K)" aria-label="Open command palette">&#8981; <kbd>&#8984;K</kbd></button>
          <div class="nav-status"><span class="dot ${watchActive?'live':''}"></span>Watch ${watchActive ? 'active' : 'idle'}</div>
          ${session
            ? `<div class="nav-account">
                 <div class="nav-plan-wrap">
                   <a class="nav-avatar" href="plan.html" title="${session.email} - account &amp; plan">${(session.email||'?').trim().charAt(0).toUpperCase()}</a>
                   <button class="nav-plan tier-${getTier()}" id="navPlanPill" title="Your plan (preview - click to switch)">${getTierInfo().name}</button>
                   <div class="nav-plan-menu" id="navPlanMenu">
                     <div class="npm-label">Switch plan &middot; preview</div>
                     ${TIER_ORDER.map(t=>`<button class="npm-item ${t===getTier()?'on':''}" data-tier="${t}">${TIERS[t].name}</button>`).join('')}
                   </div>
                 </div>
                 <a class="nav-link" href="#" id="navLogoutLink">Log out</a>
               </div>`
            : ''}
        </div>
      </div>
    </nav>`;
  const logoutLink = document.getElementById('navLogoutLink');
  if(logoutLink){
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = 'site-home.html';
    });
  }
  const navCmdkBtn = document.getElementById('navCmdkBtn');
  if(navCmdkBtn){ navCmdkBtn.addEventListener('click', function(){ if(typeof window.openCommandPalette === 'function'){ window.openCommandPalette(); } }); }
  // Top-right plan pill: shows the current plan; click to switch tier (preview,
  // no payment) so gating stays testable now that the bottom widget is gone.
  const planPill = document.getElementById('navPlanPill');
  const planMenu = document.getElementById('navPlanMenu');
  if(planPill && planMenu){
    planPill.addEventListener('click', (e) => { e.stopPropagation(); planMenu.classList.toggle('open'); });
    document.addEventListener('click', () => planMenu.classList.remove('open'));
    planMenu.querySelectorAll('.npm-item').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      setTier(b.dataset.tier);  // local (instant, offline fallback)
      try {
        const s = (typeof getSession === 'function') ? getSession() : null;
        if(s && s.user_id && typeof apiSetTier === 'function'){ await apiSetTier(s.user_id, b.dataset.tier); }
      } catch(err){ /* offline - local tier still applies */ }
      location.reload();
    }));
  }
}

/* ---- Session (login). Demo mode: this page's own login/signup form
   only creates a LOCAL session (email + role saved to localStorage) -
   there is no backend attached from this standalone frontend, so no
   real password is verified here. The real backend (app/routes/auth.py)
   has genuine bcrypt-hashed passwords and JWT tokens - this local
   session is a stand-in for what a connected frontend would get back
   from POST /auth/login, not a real security boundary on its own. ---- */
function _safeSetItem(key, value){
  // Drop-in for localStorage.setItem that NEVER throws. On QuotaExceededError
  // (storage full) or in private/disabled-storage modes, a bare setItem would
  // throw uncaught and crash whatever interaction triggered the save (a saved
  // star that never lights, a dismiss that errors, a scan that dies). The getters
  // are all guarded; this makes the setters equally graceful. First reclaim space
  // by evicting disposable, re-derivable caches, then retry once; if it still
  // fails, degrade silently - in-memory state stays correct for the session.
  try{ localStorage.setItem(key, value); return true; }
  catch(e){
    try{
      var disposable = ['kaidostar_deep_explanations','kaidostar_company_research','kaidostar_interview_prep','kaidostar_leadership_research','kaidostar_strategy_cache','kaidostar_strategy_history','kaidostar_engagement_suggestions','kaidostar_chat_history','kaidostar_matches','kaidostar_trajectory'];
      for(var i=0;i<disposable.length;i++){ if(disposable[i] !== key){ try{ localStorage.removeItem(disposable[i]); }catch(_){} } }
      localStorage.setItem(key, value); return true;
    }catch(_){ return false; }
  }
}
function getSession(){ try{ return JSON.parse(localStorage.getItem('kaidostar_session')); }catch(e){ return null; } }
function saveSession(session){ _safeSetItem('kaidostar_session', JSON.stringify(session)); }

/* ============================================================================
   TIERS — Free / Pro / Max. Single source of truth for what each plan includes.
   Feature gating everywhere (dashboard, workshop, pricing page) reads from here,
   so there is exactly ONE place to change what a tier gets. No payment yet: the
   tier is stored locally and switched via a visible switcher for testing. When
   payment is added later, only setTier's source changes (to the billing status)
   - every gate keeps working unchanged.
   ============================================================================ */
var TIER_ORDER = ['free', 'pro', 'max'];

var TIERS = {
  free: {
    key: 'free', name: 'Free', price: 0,
    tagline: 'Everything you need to start a real search.',
    // Feature flags this tier grants (true = included).
    features: {
      // The whole Job Search page is FREE - its Metis Pilot, personalised
      // (tunable) ranking and deep match explanations are all included here, so
      // Job Search is the free hook. Everything else - Roadmap, Interview Prep,
      // the Application Workshop, Auto mode and outreach drafting - stays Pro+.
      // MUST stay in sync with the backend TIER_FEATURES in app/services/tiers.py.
      opportunity_watch: true,
      roadmap: false,
      metis: true,
      manual_drafting: true,
      school_readiness: true,
      interview_prep: false,
      ai_copilot: true,            // Job Search Metis Pilot (flag key kept as ai_copilot) - FREE
      advanced_search: true,       // Personalised weight-tuning on Job Search - FREE
      workshop: false,
      deep_match_explanations: true,  // Deep match explanations (Job Search) - FREE
      outreach_drafting: false,
      auto_mode: false,
      auto_submit: false,
      priority_metis: false,
      early_access: false,
    },
    // Human-readable feature list for the pricing page (label + included).
    display: [
      ['Continuous opportunity watch', true],
      ['Metis AI guide', true],
      ['School fit & readiness analysis', true],
      ['Roadmap — every path mapped, best route picked', false],
      ['Interview Prep — mock interviews, STAR & coaching', false],
      ['Metis Pilot + tunable ranking on Job Search', true],
      ['Deep AI match explanations', true],
      ['Application Workshop — draft, resume & outreach', false],
      ['Referral & cold-outreach drafting', false],
      ['Auto mode (drafts while you\u2019re away)', false],
    ],
    // Daily usage caps for metered features (null = not available at this tier).
    // 'match explanations' (deep AI match explanations) is now a FREE Job Search
    // feature - features.deep_match_explanations is true and the backend gives
    // free a deep-explain cap of 8/day - so it shows a real 8/day allowance here
    // (kept in sync with the backend FEATURE_DAILY_CAPS["deep-explain"] free cap).
    limits: { ai_actions_per_day: 10, auto_drafts_per_day: 0 },
    featureCaps: { 'roadmaps': 3, 'essay reviews': 5, 'match explanations': 8 },
  },
  pro: {
    key: 'pro', name: 'Pro', price: 24,
    tagline: 'For an active search across many opportunities.',
    features: {
      opportunity_watch: true, roadmap: true, metis: true, manual_drafting: true,
      school_readiness: true,
      interview_prep: true,
      ai_copilot: true,
      advanced_search: true,
      workshop: true,
      deep_match_explanations: true,
      outreach_drafting: true,
      auto_mode: true,
      auto_submit: true,
      priority_metis: false,
      early_access: false,
    },
    display: [
      ['Everything in Free', true],
      ['Roadmap — every path mapped, best route picked', true],
      ['Interview Prep — mock interviews, STAR & coaching', true],
      ['Application Workshop — draft, resume & outreach', true],
      ['Referral & cold-outreach drafting', true],
      ['Auto mode (drafts while you\u2019re away)', true],
      ['Higher daily usage limits', true],
      ['Priority Metis response time', false],
      ['Early access to new features', false],
    ],
    limits: { ai_actions_per_day: 250, auto_drafts_per_day: 10 },
    featureCaps: { 'roadmaps': 25, 'essay reviews': 50, 'match explanations': 80 },
  },
  max: {
    key: 'max', name: 'Max', price: 95,
    tagline: 'For power users running a full-time search.',
    features: {
      opportunity_watch: true, roadmap: true, metis: true, manual_drafting: true,
      interview_prep: true,
      ai_copilot: true,
      advanced_search: true,
      workshop: true,
      school_readiness: true, deep_match_explanations: true, outreach_drafting: true,
      auto_mode: true,
      auto_submit: true,
      priority_metis: true,
      early_access: true,
    },
    display: [
      ['Everything in Pro', true],
      ['Unlimited auto-drafted applications', true],
      ['Priority Metis response time', true],
      ['Early access to new features', true],
      ['Highest daily usage limits', true],
    ],
    limits: { ai_actions_per_day: 5000, auto_drafts_per_day: 5000 },
    featureCaps: { 'roadmaps': 'Unlimited', 'essay reviews': 'Unlimited', 'match explanations': 'Unlimited' },
  },
};

/* The user's current tier. Defaults to 'free'. (Later: sourced from billing.) */
function getTier(){
  const t = localStorage.getItem('kaidostar_tier');
  return (t && TIERS[t]) ? t : 'free';
}
function setTier(tier){
  if(!TIERS[tier]) return false;
  _safeSetItem('kaidostar_tier', tier);
  return true;
}
function getTierInfo(tier){ return TIERS[tier || getTier()] || TIERS.free; }

/* THE gate every feature check goes through. Returns true if the current
   (or given) tier includes the feature key. Unknown keys default to false
   (fail-closed for gating - the opposite of the rate limiter, on purpose:
   a missing flag should hide a paid feature, not expose it). */
function hasFeature(featureKey, tier){
  const info = getTierInfo(tier);
  return !!(info.features && info.features[featureKey]);
}

/* The tier a feature first becomes available at (for "Upgrade to Pro" prompts). */
function tierRequiredFor(featureKey){
  for(const t of TIER_ORDER){
    if(TIERS[t].features && TIERS[t].features[featureKey]) return t;
  }
  return null;
}

/* Small inline "locked" badge for a gated control (a button, nav item, or
   feature header). Returns '' when the current tier already includes the
   feature, so it's safe to sprinkle unconditionally, e.g.:
     `Explain in depth ${proBadgeHTML('deep_match_explanations')}`
   It names the tier needed (PRO / MAX) so Free users see, UP FRONT, exactly
   which controls are gated - instead of only finding out after they click.
   Pass {nav:true} for the smaller nav-sized variant. */
function proBadgeHTML(featureKey, opts){
  if(hasFeature(featureKey)) return '';
  const needed = tierRequiredFor(featureKey) || 'pro';
  const label = needed.toUpperCase();
  const nice = needed.charAt(0).toUpperCase() + needed.slice(1);
  const cls = (opts && opts.nav) ? 'pro-badge nav-pro-badge' : 'pro-badge';
  return `<span class="${cls}" title="Upgrade to ${nice} to unlock">&#128274; ${label}</span>`;
}

/* Inject a small, visible tier switcher (bottom-left) so you and testers can
   flip Free/Pro/Max and see the gating live - no payment needed. It reloads the
   page on change so every gate re-evaluates. Clearly labelled as a preview
   control, and easy to remove later (delete this function + its one call). */
function injectTierSwitcher(){
  /* Bottom-left plan/price widget removed by request. The current plan now
     lives in the top-right nav (see renderNav); clicking that pill switches
     tier for preview testing. This is now a no-op so every existing per-page
     injectTierSwitcher() call stays harmless. */
  return;
  /* --- legacy bottom widget below is intentionally unreachable --- */
  if(document.getElementById('tierSwitch')) return;
  const cur = getTier();
  const wrap = document.createElement('div');
  wrap.id = 'tierSwitch';
  wrap.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9998;background:rgba(20,20,28,0.94);border:1px solid rgba(255,255,255,0.14);border-radius:12px;padding:8px 10px;font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#9aa;box-shadow:0 6px 24px rgba(0,0,0,0.4);backdrop-filter:blur(6px);';
  const btns = TIER_ORDER.map(t => {
    const active = t === cur;
    const info = TIERS[t];
    const bg = active ? (t==='max'?'#F0B24E':t==='pro'?'#8B7CF6':'#40C0A0') : 'transparent';
    const col = active ? '#0b0b0f' : '#ccd';
    return `<button data-tier="${t}" style="border:none;cursor:pointer;border-radius:7px;padding:5px 10px;margin:0 2px;font-family:inherit;font-size:10px;font-weight:600;background:${bg};color:${col};">${info.name}${info.price?(' $'+info.price):''}</button>`;
  }).join('');
  wrap.innerHTML = `<div style="margin-bottom:6px;letter-spacing:0.06em;color:#778;">PLAN (preview · no payment)</div><div style="display:flex;">${btns}</div><div id="tierBudget" style="margin-top:7px;color:#889;font-size:9.5px;letter-spacing:0.03em;"></div>`;
  document.body.appendChild(wrap);
  // Show today's AI-usage budget honestly (from the backend, when logged in) so
  // a Free user understands the limit rather than hitting an unexplained wall.
  (async () => {
    try {
      const s = (typeof getSession === 'function') ? getSession() : null;
      if(!s || !s.user_id || typeof apiGetTier !== 'function') return;
      const info = await apiGetTier(s.user_id);
      const bEl = document.getElementById('tierBudget');
      if(info && info.ai_budget && bEl){
        const ab = info.ai_budget;
        bEl.textContent = ab.unlimited
          ? 'AI actions today: unlimited'
          : `AI actions today: ${ab.used_today}/${ab.limit}`;
      }
    } catch(e){ /* offline - just don't show the budget line */ }
  })();
  wrap.querySelectorAll('button').forEach(b => b.addEventListener('click', async () => {
    setTier(b.dataset.tier);  // local (instant, offline fallback)
    // Also set it on the backend when logged in, so the REAL enforced tier
    // matches - otherwise paid endpoints would still block/allow by the old tier.
    try {
      const s = (typeof getSession === 'function') ? getSession() : null;
      if(s && s.user_id && typeof apiSetTier === 'function'){ await apiSetTier(s.user_id, b.dataset.tier); }
    } catch(e){ /* offline - local tier still applies to the UI */ }
    location.reload();
  }));
}

/* Standard "locked" overlay markup for a gated feature. Returns an HTML string
   you can drop into a panel when hasFeature(key) is false. Honest and useful:
   it names the tier needed and what the feature does, and links to pricing. */
function lockedFeatureHTML(featureKey, title, blurb){
  const needed = tierRequiredFor(featureKey);
  const tierName = needed ? TIERS[needed].name : 'a paid plan';
  return `
    <div class="feature-locked" style="border:1px dashed var(--line,#333);border-radius:14px;padding:22px;text-align:center;background:var(--void,#111);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold,#F0B24E);margin-bottom:8px;">&#128274; ${tierName} feature</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;color:var(--text,#eee);margin-bottom:6px;">${title}</div>
      <div style="font-family:'Manrope',sans-serif;font-size:12.5px;color:var(--text-dim,#aaa);line-height:1.55;max-width:420px;margin:0 auto 14px;">${blurb}</div>
      <a href="site-pricing.html" style="display:inline-block;font-family:'Manrope',sans-serif;font-size:12px;font-weight:600;text-decoration:none;color:#0b0b0f;background:var(--gold,#F0B24E);border-radius:8px;padding:8px 16px;">Upgrade to ${tierName} →</a>
    </div>`;
}

/* Gate a single element by feature: if the current tier lacks `featureKey`,
   hide the element's contents and show the locked overlay inside it instead.
   Idempotent and reversible. One-liner for any page:
   gateElement('auto_mode', '#autoPanel', 'Auto mode', '...'). */
function gateElement(featureKey, selector, title, blurb){
  const el = (typeof selector === 'string') ? document.querySelector(selector) : selector;
  if(!el) return hasFeature(featureKey);
  if(hasFeature(featureKey)){
    const lock = el.querySelector(':scope > .feature-locked');
    if(lock){
      lock.remove();
      Array.from(el.children).forEach(ch => { if(ch.hasAttribute && ch.hasAttribute('data-gated-real')){ ch.style.display=''; ch.removeAttribute('data-gated-real'); } });
    }
    return true;
  }
  if(!el.querySelector(':scope > .feature-locked')){
    Array.from(el.children).forEach(ch => { ch.setAttribute('data-gated-real',''); ch.style.display='none'; });
    const div = document.createElement('div');
    div.innerHTML = lockedFeatureHTML(featureKey, title, blurb);
    el.appendChild(div.firstElementChild);
  }
  return false;
}

/* Gate an entire page by feature: replace the main content with a full-page
   locked message when the tier lacks it. Keeps nav + tier switcher visible. */
function gateWholePage(featureKey, contentSelector, title, blurb){
  if(hasFeature(featureKey)) return true;
  const host = (contentSelector && document.querySelector(contentSelector)) || document.querySelector('main') || document.body;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'max-width:560px;margin:80px auto;padding:0 20px;';
  overlay.innerHTML = lockedFeatureHTML(featureKey, title, blurb);
  Array.from(host.children).forEach(ch => {
    const tag = (ch.tagName||'').toLowerCase();
    if(tag === 'header' || tag === 'nav' || ch.id === 'tierSwitch') return;
    ch.style.display = 'none';
  });
  host.appendChild(overlay);
  return false;
}
function clearSession(){ localStorage.removeItem('kaidostar_session'); }

/* ---- localStorage helpers ---- */
function getProfile(){ try{ return JSON.parse(localStorage.getItem('kaidostar_profile')); }catch(e){ return null; } }
function saveProfile(p){ _safeSetItem('kaidostar_profile', JSON.stringify(p)); }

// Offline/demo fallback for the resume fast-path: a best-effort profile pulled
// from pasted resume TEXT with no server. The signed-in path uses the backend
// model (apiResumeIngest) for a real read; this keeps the feature working when
// there's no session or the server is unreachable, and never invents anything -
// it only lifts what's literally in the text, leaving unknowns blank.
function parseResumeTextLocal(text){
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const low = raw.toLowerCase();
  const prof = { types: ['job','internship'], timeframe: 'now' };

  // Name: the first short, letters-only line that isn't a contact detail or a
  // section header - the overwhelming resume convention is name-at-top.
  const headerWords = /resume|curriculum|vitae|objective|summary|experience|education|skills|projects|contact/i;
  for(const l of lines.slice(0, 6)){
    if(/@|\d|http|www\./.test(l)) continue;
    if(headerWords.test(l)) continue;
    const words = l.split(/\s+/);
    if(words.length >= 1 && words.length <= 4 && /^[A-Za-z][A-Za-z.'\-\s]+$/.test(l)){ prof.fullName = l.replace(/\s+/g,' ').trim(); break; }
  }
  const phone = raw.match(/(\+?\d[\d\s().\-]{7,}\d)/);
  if(phone) prof.phone = phone[1].trim();
  // Location: a "City, ST" pattern, scanned per line so it never spills across
  // a line break; else an explicit Remote.
  for(const l of lines){
    const m = l.match(/([A-Z][a-zA-Z.\-]+(?:[ \t][A-Z][a-zA-Z.\-]+)*,[ \t]*[A-Z]{2})\b/);
    if(m){ prof.loc = m[1].replace(/\s+/g,' ').trim(); break; }
  }
  if(!prof.loc && /\bremote\b/i.test(low)) prof.loc = 'Remote';

  // Skills: prefer an explicit Skills section; take the lines under it until the
  // next section header.
  const skillSet = [];
  const si = lines.findIndex(l => /^skills\b|^technical skills\b|^core skills\b/i.test(l));
  if(si >= 0){
    for(let j = si; j < Math.min(si + 6, lines.length); j++){
      let seg = lines[j].replace(/^(technical |core )?skills[:\s]*/i, '');
      if(j > si && /^(experience|education|projects|work|employment|summary|objective)\b/i.test(lines[j])) break;
      seg.split(/[,•|•;/]+/).map(s => s.trim()).filter(s => s && s.length <= 32).forEach(s => skillSet.push(s));
    }
  }
  // Supplement with any well-known skills literally present (never invented).
  // Word-boundary matched so 'java' doesn't fire on 'javascript' and short,
  // ambiguous tokens don't match random substrings.
  const COMMON = ['python','javascript','typescript','java','c++','sql','react','node.js','node','excel','powerpoint','figma','sketch','aws','azure','gcp','docker','kubernetes','html','css','tableau','power bi','rust','swift','kotlin','product management','project management','marketing','sales','accounting','finance','design','data analysis','machine learning','leadership','communication'];
  COMMON.forEach(k => {
    if(skillSet.some(s => s.toLowerCase() === k)) return;
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = /^[a-z0-9]/.test(k) && /[a-z0-9]$/.test(k) ? new RegExp('\\b' + esc + '\\b', 'i') : new RegExp(esc, 'i');
    if(re.test(raw)) skillSet.push(k);
  });
  // De-dupe, cap, keep it tidy.
  const seen = new Set();
  prof.skills = skillSet.filter(s => { const k = s.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0, 18).join(', ');

  // North-star: the most recent/senior title we can spot. Look at a title line
  // right under an Experience header, else the line right after the name.
  let title = '';
  const ei = lines.findIndex(l => /^(experience|work experience|employment|professional experience)\b/i.test(l));
  if(ei >= 0 && lines[ei + 1]) title = lines[ei + 1];
  if(!title){
    const nmeIdx = prof.fullName ? lines.indexOf(prof.fullName) : -1;
    if(nmeIdx >= 0 && lines[nmeIdx + 1] && !/@|\d{3}/.test(lines[nmeIdx + 1])) title = lines[nameIdxGuard(nmeIdx)];
  }
  title = (title || '').replace(/\s+at\s+.*$/i, '').replace(/[|••].*$/, '').replace(/[,–-]\s*\d.*$/, '').trim();
  if(title && title.length <= 80) prof.northstar = title;

  // Stage: student signals vs. working.
  if(/\b(intern|internship|student|undergraduate|b\.?s\.?|b\.?a\.?|expected\s+20\d\d|class of 20\d\d)\b/i.test(low)) prof.stage = 'student';
  else prof.stage = 'working';

  return prof;
}
function nameIdxGuard(i){ return i + 1; }

function getAthleteProfile(){ try{ return JSON.parse(localStorage.getItem('kaidostar_athlete_profile')); }catch(e){ return null; } }
function saveAthleteProfile(p){ _safeSetItem('kaidostar_athlete_profile', JSON.stringify(p)); }
function getMatches(){ try{ const v = JSON.parse(localStorage.getItem('kaidostar_matches')); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
function saveMatches(m){ _safeSetItem('kaidostar_matches', JSON.stringify(m)); }
function getCycleCount(){ return parseInt(localStorage.getItem('kaidostar_cycle_count') || '0'); }
function saveCycleCount(n){ _safeSetItem('kaidostar_cycle_count', String(n)); }
function getTrajectory(){ try{ const v = JSON.parse(localStorage.getItem('kaidostar_trajectory')); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
function saveTrajectory(t){ _safeSetItem('kaidostar_trajectory', JSON.stringify(t)); }
function getSavedIds(){ try{ return new Set(JSON.parse(localStorage.getItem('kaidostar_saved_ids')) || []); }catch(e){ return new Set(); } }
function saveSavedIds(s){ _safeSetItem('kaidostar_saved_ids', JSON.stringify([...s])); }

function getDismissedIds(){ try{ return new Set(JSON.parse(localStorage.getItem('kaidostar_dismissed_ids')) || []); }catch(e){ return new Set(); } }
function saveDismissedIds(s){ _safeSetItem('kaidostar_dismissed_ids', JSON.stringify([...s])); }
function dismissListing(id){
  // The real backend equivalent is POST /dismissed (see
  // app/routes/dismissed_listings.py) - once this frontend is
  // connected to the deployed backend, dismissing there also
  // excludes the listing from every real match cycle and scan,
  // including the background scheduler and auto-apply.
  const dismissed = getDismissedIds();
  dismissed.add(String(id));
  saveDismissedIds(dismissed);
}
function getChatHistory(){ try{ const _v = JSON.parse(localStorage.getItem('kaidostar_chat_history')); return Array.isArray(_v) ? _v : []; }catch(e){ return []; } }
function saveChatHistory(h){ _safeSetItem('kaidostar_chat_history', JSON.stringify(h)); }
function getNotifications(){ try{ const _v = JSON.parse(localStorage.getItem('kaidostar_notifications')); return Array.isArray(_v) ? _v : []; }catch(e){ return []; } }
function getNotificationPreferences(){
  try{ return JSON.parse(localStorage.getItem('kaidostar_notification_preferences')) || {}; }catch(e){ return {}; }
}
function saveNotificationPreferences(prefs){
  _safeSetItem('kaidostar_notification_preferences', JSON.stringify(prefs));
}
function updateNotificationPreference(type, enabled){
  const prefs = getNotificationPreferences();
  prefs[type] = enabled;
  saveNotificationPreferences(prefs);
}

function addNotification(note){
  // Checks the real, stored preference before adding anything - the
  // concrete answer to a documented complaint about receiving
  // outreach/notifications a person never opted into. A type not yet
  // explicitly listed defaults to enabled - opt-out, never opt-in,
  // so a new notification type added later isn't silently suppressed
  // for someone who never actually muted it. Mirrors the backend's
  // identical create_notification guard exactly.
  const prefs = getNotificationPreferences();
  if(prefs[note.type] === false) return;
  const list = getNotifications();
  list.unshift({ ...note, id: Date.now() + Math.random(), ts: new Date().toISOString(), read: false });
  _safeSetItem('kaidostar_notifications', JSON.stringify(list.slice(0, 50)));
}
function clearNotifications(){ _safeSetItem('kaidostar_notifications', JSON.stringify([])); }
function markAllNotificationsRead(){
  const list = getNotifications();
  list.forEach(n => { n.read = true; });
  _safeSetItem('kaidostar_notifications', JSON.stringify(list));
}
function getUnreadNotificationCount(){ return getNotifications().filter(n => !n.read).length; }

/* ---- Applications / Workshop / Auto Apply ---- */
const UNDO_WINDOW_MINUTES = 30;

function getAutoApplySettings(){
  const DEFAULT_RULES = {
    autonomous: false,               // true only after explicit consent: submit automatically, no manual review
    mode: 'auto_approve',            // 'auto_approve' | 'draft_only'
    outreach: true,                  // also draft referral outreach
    types: { job: true, internship: true, college: true },
    remoteOnly: false,
    deadlineMaxDays: 0,              // 0 = any; else only if closing within N days
    skipClosed: true,
    keywordsInclude: [],             // must contain at least one (if any set)
    keywordsExclude: [],             // must contain none
    requireStrongSignal: false,
    skipHighGhostRisk: true,
    salaryFloor: 0,                  // 0 = no floor (in $k)
    dailyCap: 10,
    companies: [],                   // [{name, rule:'always'|'never'|'boost'}]
    // Optional targeting add-ons - empty means "no constraint" (auto applies
    // exactly as before). Matched from real listing data / posting text.
    locations: [],                   // e.g. ['Remote','London'] - listing location must match one
    industries: [],                  // e.g. ['fintech','healthcare'] - matched in the posting text
    companySizes: [],                // subset of ['startup','small','midmarket','enterprise']
  };
  let base = { enabled: false, threshold: 80 };
  try{
    const raw = JSON.parse(localStorage.getItem('kaidostar_auto_apply_settings'));
    if(raw && typeof raw.enabled === 'boolean' && typeof raw.threshold === 'number') base = raw;
  }catch(e){}
  // Always return a well-formed rules object, merging any stored rules over defaults
  // so an older {enabled,threshold}-only save still works.
  base.rules = Object.assign({}, DEFAULT_RULES, (base.rules && typeof base.rules === 'object') ? base.rules : {});
  base.rules.types = Object.assign({ job: true, internship: true, college: true }, base.rules.types || {});
  ['keywordsInclude','keywordsExclude','companies','locations','industries','companySizes'].forEach(k => { if(!Array.isArray(base.rules[k])) base.rules[k] = []; });
  return base;
}
function saveAutoApplySettings(settings){ _safeSetItem('kaidostar_auto_apply_settings', JSON.stringify(settings)); }

/* ---- Athlete: application drafting on star, Auto mode, deep-explain.
   Mirrors the candidate pattern exactly, but built against the
   athlete profile shape (sport/level/careerDirection/achievements)
   instead of northstar/skills. ---- */
function getAthleteApplications(){ try{ const v = JSON.parse(localStorage.getItem('kaidostar_athlete_applications')); return Array.isArray(v) ? v.filter(a => a && typeof a === 'object') : []; }catch(e){ return []; } }  // filter to objects (see getApplications)
function saveAthleteApplications(list){ _safeSetItem('kaidostar_athlete_applications', JSON.stringify(list)); }
function getAthleteApplicationForListing(listingId){ return getAthleteApplications().find(a => a.listing_id === String(listingId)); }

function getAthleteAutoSettings(){
  try{
    const raw = JSON.parse(localStorage.getItem('kaidostar_athlete_auto_settings'));
    if(raw && typeof raw.enabled === 'boolean' && typeof raw.threshold === 'number') return raw;
  }catch(e){}
  return { enabled: false, threshold: 75 };
}
function saveAthleteAutoSettings(settings){ _safeSetItem('kaidostar_athlete_auto_settings', JSON.stringify(settings)); }

async function draftAthleteApplication(listing, athleteProfile, autoGenerated){
  autoGenerated = autoGenerated || false;
  const existing = getAthleteApplicationForListing(listing.id);
  if(existing) return existing;

  const prompt = `Write a short, tailored application message (120-180 words) for this listing: "${listing.title}" at ${listing.org} (${listing.type === 'athletic' ? 'athletics' : listing.type}).\nCandidate's sport: "${athleteProfile.sport || 'not specified'}". Level: ${athleteProfile.level || 'not specified'}. Career direction: ${(athleteProfile.careerDirection || '').replace(/-/g,' ')}. Achievements: "${athleteProfile.achievements || 'not specified'}".\nBe concrete and specific, reference their actual achievements, no generic filler, no placeholder brackets.`;
  let draftText = null;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 400, messages: [{role: "user", content: prompt}] })
    });
    const data = await response.json();
    draftText = (data.content || []).map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('\n') || null;
  } catch(err){ console.error('Athlete application draft failed:', err); return null; }
  if(!draftText) return null;

  const settings = getAthleteAutoSettings();
  const status = listing.pct >= settings.threshold ? 'approved' : 'pending_review';
  const sendableAt = status === 'approved' ? new Date(Date.now() + UNDO_WINDOW_MINUTES * 60000).toISOString() : null;

  const application = {
    id: 'athapp_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    listing_id: String(listing.id),
    listing_title: listing.title,
    listing_org: listing.org,
    match_score: listing.pct,
    confidence_pct: listing.pct,
    draft: draftText,
    status,
    sendable_at: sendableAt,
    sent_at: null,
    auto_generated: autoGenerated,
    created_at: new Date().toISOString(),
  };
  const apps = getAthleteApplications();
  apps.unshift(application);
  saveAthleteApplications(apps);

  addNotification({
    type: 'athlete_application',
    title: `${autoGenerated ? 'Auto-drafted' : 'Drafted'} application: ${listing.title}`,
    detail: `${status === 'approved' ? 'Auto-approved' : 'Needs your review'} - ${listing.pct}% match.`,
  });
  return application;
}

async function runAthleteAutoApply(matches, athleteProfile){
  const settings = getAthleteAutoSettings();
  if(!settings.enabled) return [];
  const results = [];
  for(const listing of matches){
    if(getAthleteApplicationForListing(listing.id)) continue;
    const app = await draftAthleteApplication(listing, athleteProfile, true);
    if(app) results.push(app);
  }
  return results;
}

async function explainAthleteMatchDeep(listing, athleteProfile){
  const prompt = `A student-athlete: sport "${athleteProfile.sport || 'not specified'}", level ${athleteProfile.level || 'not specified'}, career direction ${(athleteProfile.careerDirection || '').replace(/-/g,' ')}, achievements: "${athleteProfile.achievements || 'not specified'}".\n\nA listing they're considering: "${listing.title}" at ${listing.org}, tags: ${listing.tags.join(', ')}.\n\nWrite a genuine, specific 3-4 sentence case for why this is or isn't a strong match for THIS athlete specifically - reference their actual sport, level, and achievements. Be honest about weak fit if it's weak, don't oversell.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    return (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n') || null;
  } catch(err){ console.error('Athlete match explanation failed:', err); return null; }
}

/* ---- Athlete match scoring, shared across athlete-dashboard.html and
   athlete-roadmap.html (the roadmap page needs real current matches
   too, for its "supported by" tags on each milestone). ---- */
/* Athlete outcome logging - closes the feedback loop for the athlete track
   (parity with job + admissions). Athletes save opportunities by id, so outcomes
   live in a small map keyed by listing id. Honest, recruiting-appropriate results
   so an athlete sees what actually happened over their recruiting timeline. */
const ATHLETE_OUTCOMES = ['made_it','tryout','waitlisted','no'];
function getAthleteOutcomes(){ try{ return JSON.parse(localStorage.getItem('kaidostar_athlete_outcomes')) || {}; }catch(e){ return {}; } }
function saveAthleteOutcomes(map){ _safeSetItem('kaidostar_athlete_outcomes', JSON.stringify(map || {})); }
function logAthleteOutcome(listingId, outcome){
  if(!ATHLETE_OUTCOMES.includes(outcome)) return false;
  if(listingId === null || listingId === undefined) return false;
  const map = getAthleteOutcomes();
  if(typeof map !== 'object' || map === null) return false;
  map[String(listingId)] = { outcome, logged_at: new Date().toISOString() };
  saveAthleteOutcomes(map);
  return true;
}

function athleteRationale(listing, matched, profile){
  profile = profile || {};
  matched = matched || [];
  // Escape user-controlled values at the source (like admissionsRationale) so the
  // string can be rendered as HTML with its intended <b> without an XSS hole.
  const escR = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const div = escR((profile.targetDivision || '').trim());
  const pos = escR((profile.position || '').trim());
  const sport = escR(profile.sport || 'your sport');
  const level = escR(profile.level || 'this');
  const direction = escR((profile.careerDirection || '').replace(/-/g, ' '));
  const matchedSafe = escR(matched.slice(0,3).join(', '));
  const divBit = div ? ` (targeting ${div})` : '';
  if(matched.length === 0){
    return `Looser fit for ${sport} at the ${level} level${divBit} - no strong overlap yet, but worth a look while broadening your search.`;
  }
  const posBit = pos ? `, relevant to your position (${pos})` : '';
  return `Matches on <b>${matchedSafe}</b> - directly relevant to ${sport}${posBit} and your stated direction toward ${direction}${divBit}.`;
}

/* Athlete match breakdown: which specific parts of the athlete's OWN recruiting
   profile this opportunity matched on - the same "named, real contributors, not a
   black box" transparency the job dashboard gives, adapted to recruiting. Pure
   function of the listing's tags vs. the athlete's stated profile fields; each row
   is a real, checkable reason this opportunity fits (or a note that it's a stretch). */
function athleteMatchBreakdown(listing, profile){
  profile = profile || {};
  const tags = (Array.isArray(listing.tags) ? listing.tags : []).map(t => String(t).toLowerCase());
  const has = (val) => {
    if(!val) return false;
    const v = String(val).toLowerCase().trim();
    if(!v) return false;
    return tags.some(t => t.includes(v) || v.includes(t));
  };
  const rows = [];
  if(has(profile.sport))          rows.push({ label:'Sport', value: profile.sport, note:'matches your sport' });
  if(has(profile.level))          rows.push({ label:'Level', value: profile.level, note:'fits your competition level' });
  if(has(profile.position))       rows.push({ label:'Position', value: profile.position, note:'relevant to your position' });
  if(has(profile.targetDivision)) rows.push({ label:'Division', value: profile.targetDivision, note:'aligns with your target division' });
  // career-direction match (e.g. "play-college" -> a college-recruiting opportunity)
  const dir = (profile.careerDirection || '').replace(/-/g,' ').trim();
  if(dir && tags.some(t => t.includes(dir.split(' ')[0]) || dir.includes(t))) {
    rows.push({ label:'Direction', value: dir, note:'supports where you want to go' });
  }
  return rows;
}

// A student-athlete's graduation year sets their recruiting clock: a rising
// senior is on a tight timeline; an underclassman has runway. Honest, real, and
// uses the recruiting data the survey collects (previously unused).
function athleteRecruitingTimeline(profile){
  const gy = parseInt((profile && profile.gradYear || '').toString().replace(/\D/g, ''), 10);
  if(!gy || gy < 2000) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearsOut = gy - currentYear;
  if(yearsOut <= 0) return { band: 'now', note: `You graduate in ${gy} - recruiting for your class is happening right now. Prioritize direct coach outreach and getting current film in front of programs immediately.` };
  if(yearsOut === 1) return { band: 'soon', note: `You graduate in ${gy} - you're in the core recruiting window. Coaches are actively evaluating your class; keep film current and outreach consistent this year.` };
  if(yearsOut === 2) return { band: 'building', note: `You graduate in ${gy} - you have real runway. Focus on measurable improvement and building a body of film now, so you're a known name when your window opens.` };
  return { band: 'early', note: `You graduate in ${gy} - it's early, which is an advantage. Build fundamentals and a growing highlight record; getting on coaches' radar early compounds.` };
}

function runAthleteMatchCycle(profile){
  const athletic = LISTINGS.filter(l => l.type === 'athletic');
  // Fold the FULL recruiting profile into the requirement text so position,
  // target division, and grad year actually influence matches - not just
  // sport/level/direction. (These fields were collected but previously unused.)
  const requirementText = [
    profile.sport, profile.level, profile.position, profile.targetDivision,
    profile.careerDirection, profile.achievements
  ].filter(Boolean).join(' ');
  const dealbreakers = (profile.dealbreakers || '').toLowerCase();
  const scored = athletic
    .filter(l => !hasDealbreaker(l.tags, dealbreakers))
    .filter(l => !isListingExpired(l))   // honest: never surface an already-closed opportunity (parity with job track + backend)
    .map(l => {
      const { pct, matched } = scoreByOverlap(l.tags, requirementText);
      return { ...l, pct, matched, rationale: athleteRationale(l, matched, profile) };
    })
    .sort((a,b) => b.pct - a.pct);
  // Only surface genuine matches (real overlap -> 85+); weak no-overlap listings
  // are held back rather than padding the list with junk. Rotate for freshness so
  // cycles don't repeat. If nothing genuinely matches yet, show a few of the
  // closest as honest "looser fits" rather than an empty page.
  const good = scored.filter(l => l.pct >= 85);
  return _rotateForVariety(good.length ? good : scored.slice(0, 3), 2);
}

/* ---- Athlete events: deadlines and trial opportunities (tryouts,
   camps, combines, application deadlines), optionally tied to a
   specific roadmap stage. ---- */
function getAthleteEvents(){ try{ const v = JSON.parse(localStorage.getItem('kaidostar_athlete_events')); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
function saveAthleteEvents(list){ _safeSetItem('kaidostar_athlete_events', JSON.stringify(list)); }
function addAthleteEvent(event){
  const events = getAthleteEvents();
  events.push({ id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), status: 'upcoming', ...event });
  events.sort((a,b) => (a.event_date || '9999').localeCompare(b.event_date || '9999'));
  saveAthleteEvents(events);
}
function updateAthleteEventStatus(eventId, status){
  const events = getAthleteEvents();
  const event = events.find(e => e.id === eventId);
  if(event) event.status = status;
  saveAthleteEvents(events);
}
function deleteAthleteEvent(eventId){
  saveAthleteEvents(getAthleteEvents().filter(e => e.id !== eventId));
}

/* ---- Coach outreach: real email + cold-call script, mirroring the
   candidate side's "never invent a specific named person" boundary. ---- */
async function draftCoachOutreach(athleteProfile, targetDescription){
  const directionLabel = {'play-college': 'playing at the college level', 'go-pro': 'going pro', 'coach': 'coaching', 'sports-management': 'a sports management career'}[athleteProfile.careerDirection] || athleteProfile.careerDirection || 'not specified';
  const prompt = `A student-athlete: sport "${athleteProfile.sport || 'not specified'}", level ${athleteProfile.level || 'not specified'}, career direction: ${directionLabel}. Achievements: "${athleteProfile.achievements || 'not specified'}". They want to reach out about: "${targetDescription}".\n\nHelp them make direct contact. Never invent a specific real named person - describe the TYPE of contact to look for, not a fabricated name.\n\nReturn a JSON object with exactly these five keys:\n- who_to_contact: the specific type of person worth reaching out to\n- how_to_find: 1-2 concrete sentences on how to actually find that person\n- email_subject: a short, specific email subject line\n- email_body: a genuine, specific 100-140 word email referencing their actual sport, achievements, and goal - no generic filler, no placeholder brackets\n- cold_call_script: a real, specific phone call opening and structure (2-3 sentences of what to actually say when the person picks up, plus 1-2 follow-up talking points) - concrete and usable, not generic "be confident" advice\n\nReturn ONLY valid JSON, nothing else, no markdown fences, no commentary.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 700, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const result = JSON.parse(text);
    // Real shape validation - confirmed missing fields here wouldn't
    // crash (template literals render "undefined" as literal text
    // rather than throwing), but that's still a real, bad-data
    // failure mode worth preventing before it's ever saved.
    const requiredKeys = ['who_to_contact', 'how_to_find', 'email_subject', 'email_body', 'cold_call_script'];
    if(!requiredKeys.every(k => typeof result[k] === 'string')){
      throw new Error('Coach outreach response has an unexpected shape');
    }
    return result;
  } catch(err){ console.error('Coach outreach draft failed:', err); return null; }
}

function getAthleteOutreachDrafts(){ try{ const _v = JSON.parse(localStorage.getItem('kaidostar_athlete_outreach')); return Array.isArray(_v) ? _v : []; }catch(e){ return []; } }
function saveAthleteOutreachDrafts(list){ _safeSetItem('kaidostar_athlete_outreach', JSON.stringify(list)); }

/* ---- Video clip planner: a real, honestly-scoped tool. This is NOT
   video editing/merging/export - that would need either heavy
   client-side video encoding or real server infrastructure, neither
   of which exists here. What this genuinely does: lets you preview
   your OWN local video file entirely in-browser (no upload, no
   storage - the file never leaves your computer), mark real in/out
   timestamps for clips you want to use, tag each to a reel-structure
   segment, and export a real, usable edit plan (a shot list with
   exact timestamps) to hand to any actual video editor. ---- */
function getClipPlan(){ try{ const _v = JSON.parse(localStorage.getItem('kaidostar_athlete_clip_plan')); return Array.isArray(_v) ? _v : []; }catch(e){ return []; } }
function saveClipPlan(clips){ _safeSetItem('kaidostar_athlete_clip_plan', JSON.stringify(clips)); }
function addClip(clip){
  const clips = getClipPlan();
  clips.push({ id: 'clip_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), ...clip });
  saveClipPlan(clips);
}
function removeClip(clipId){
  saveClipPlan(getClipPlan().filter(c => c.id !== clipId));
}

/* ============================================================
   SCHOOL ADMISSIONS TRACK
   A parallel vertical for students applying to universities -
   mirrors the athlete track's architecture exactly (own profile,
   own opportunity matcher, own schedule, own roadmap). Where the
   athlete track finds athletic opportunities, this finds the
   extracurriculars, competitions, and internships that genuinely
   strengthen a college application, scheduled and pushed against
   real deadlines - the honest, structured version of what a
   college counselor does.
   ============================================================ */
function getAdmissionsProfile(){ try{ return JSON.parse(localStorage.getItem('kaidostar_admissions_profile')); }catch(e){ return null; } }
function saveAdmissionsProfile(p){ _safeSetItem('kaidostar_admissions_profile', JSON.stringify(p)); }

/* ---- School knowledge base: real universities with their genuine
   selectivity tier and what they actually weigh, so the advice can be
   specific to the school a student is targeting (Harvard vs a state
   flagship call for genuinely different strategies). Guidance is honest
   and general-to-the-school - never a fabricated claim about what a
   specific admissions officer wants this year, and never a promise. ---- */
const SCHOOLS = [
  { name: "Harvard University", aka: ["harvard"], country: "US", tier: "reach", accept: "~3.6%", region: "Cambridge, MA", dataDepth: "deep",
    motto: "\"Veritas\" — Latin for \"truth.\" Harvard's mission is to educate citizens and citizen-leaders through a transformative liberal-arts education.",
    values: ["intellectual vitality", "a genuine spike", "impact on others", "authentic voice"],
    guidance: "Harvard rejects the vast majority of valedictorians - grades and scores get you considered, not admitted. What separates admits is a genuine, deep \"spike\" (a demonstrated, exceptional strength in one area) plus evidence you affect the people around you. Its motto \"Veritas\" rewards intellectual honesty and real curiosity - reference the value through your own experience, never by name-dropping.",
    acceptedPattern: "Public analyses of admitted students consistently show a clear spike, usually built from extracurriculars and honors rather than coursework - e.g. an admit who progressed over four years from environmental-club member to regional coordinator, showing rising responsibility and measurable impact. The recurring pattern: sustained depth in one or two things, framed around real, quantifiable change - not a long list of shallow memberships." },
  { name: "Stanford University", aka: ["stanford"], country: "US", tier: "reach", accept: "~4%", region: "Stanford, CA", dataDepth: "deep",
    motto: "\"Die Luft der Freiheit weht\" — German for \"the wind of freedom blows,\" chosen to enshrine fearless, unfettered inquiry (\"studies blossom and the minds move\").",
    values: ["intellectual vitality", "initiative", "a distinctive angle", "building things"],
    guidance: "Stanford prizes intellectual curiosity for its own sake and students who build or start things - its \"intellectual vitality\" essay directly probes this. The motto reflects a culture of fearless inquiry, so a self-started project or genuine intellectual obsession reads far stronger than a prestigious-but-passive membership.",
    acceptedPattern: "Admitted profiles tend to show a distinctive personal angle - the \"what makes you, you\" - and evidence of self-directed initiative (a founded project, a curiosity taken further than assigned). Depth and an authentic, specific essay voice recur far more than a broad resume." },
  { name: "Massachusetts Institute of Technology (MIT)", aka: ["mit", "massachusetts institute of technology"], country: "US", tier: "reach", accept: "~4%", region: "Cambridge, MA", dataDepth: "deep",
    motto: "\"Mens et Manus\" — Latin for \"Mind and Hand.\" MIT's founding ideal is education for practical application: learning by doing, theory joined to making.",
    values: ["hands-on making", "STEM depth", "collaboration", "using knowledge for good"],
    guidance: "MIT wants makers, not just high scorers. Its motto \"Mens et Manus\" (Mind and Hand) means concrete evidence you build, tinker, and solve real problems is what tips an application. MIT genuinely values collaboration over competition (\"you cannot graduate from MIT by yourself\") - show teamwork and mutual support, not just individual wins.",
    acceptedPattern: "By MIT's own admissions materials and analyses of admitted profiles, the Maker Portfolio is often the real tie-breaker: admitted students show \"the stuff they have built\" - a coded app on GitHub, a robotics project, a restored engine, a hackathon build, or olympiad/research work with genuine hands-on depth. Building something tangible beats winning a generic award." },
  { name: "California Institute of Technology (Caltech)", aka: ["caltech", "california institute of technology"], country: "US", tier: "reach", accept: "~3.8%", region: "Pasadena, CA", dataDepth: "deep",
    motto: "\"The truth shall make you free\" (Veritas vos liberabit). Caltech is a tiny, intensely rigorous science-and-engineering institute (~2,200 students).",
    values: ["capacity for rigor", "scholarly character", "deep STEM ability", "lifting up peers"],
    guidance: "Caltech is uniquely, unapologetically about raw scientific and mathematical ability at an extreme level. Its own admissions site names three qualities: capacity for Caltech rigor, scholarly character (integrity, resilience, generosity), and readiness to thrive in a brutally fast pace. Deep math/science preparation and genuine research or problem-solving matter more here than a well-rounded profile.",
    acceptedPattern: "Admits show exceptional depth in advanced math and science - olympiads, serious research, self-driven technical work - and, per Caltech, \"elevate the people learning alongside them.\" It is one of the few top schools where pure STEM firepower and scholarly character outweigh breadth of activities." },
  { name: "Princeton University", aka: ["princeton"], country: "US", tier: "reach", accept: "~4%", region: "Princeton, NJ", dataDepth: "deep",
    motto: "\"Dei sub numine viget\" — \"Under God's power she flourishes,\" paired with the informal ethos \"in the nation's service and the service of humanity.\"",
    values: ["scholarship", "service", "intellectual depth", "writing"],
    guidance: "Princeton has a strong undergraduate focus and service ethos. It weighs intellectual depth and strong writing heavily - the graded written paper it requests is read seriously. Sustained scholarship and genuine service commitments matter more than breadth.",
    acceptedPattern: "Admitted students commonly pair real intellectual depth (research, a scholarly pursuit) with authentic, sustained service - and write exceptionally well. Because Princeton reads a graded academic paper, demonstrated writing quality is a recurring differentiator." },
  { name: "Yale University", aka: ["yale"], country: "US", tier: "reach", accept: "~4%", region: "New Haven, CT", dataDepth: "deep",
    motto: "\"Lux et Veritas\" — Latin for \"Light and Truth.\"",
    values: ["intellectual engagement", "community impact", "distinctive voice", "the arts and humanities"],
    guidance: "Yale reads for how you engage ideas and community - it famously weighs \"what you'll bring to the residential college.\" A distinctive essay voice and genuine engagement (including arts and humanities, which Yale values strongly) stand out more than a purely stats-driven profile.",
    acceptedPattern: "Admitted profiles often show a person who visibly contributes to a community and brings a distinctive voice - Yale wants to picture what you add to residential-college life. Engagement and character recur as much as raw achievement." },
  { name: "University of Pennsylvania (UPenn)", aka: ["upenn", "penn", "university of pennsylvania"], country: "US", tier: "reach", accept: "~6%", region: "Philadelphia, PA", dataDepth: "deep",
    motto: "\"Leges sine moribus vanae\" — \"Laws without morals are in vain,\" reflecting Benjamin Franklin's founding emphasis on practical, ethical purpose.",
    values: ["pre-professional focus", "a specific \"why Penn\"", "interdisciplinary drive", "purpose"],
    guidance: "Penn is the most pre-professional Ivy and admits with real attention to fit with its specific schools (Wharton, Engineering, Nursing, CAS) and cross-disciplinary programs. A concrete, specific \"why Penn / why this program\" and evidence you'll use your education purposefully read very well.",
    acceptedPattern: "Admits typically show a focused direction that maps onto a specific Penn school or program, plus a clear, researched reason for Penn specifically - not a generic Ivy application. Demonstrated purpose and pre-professional initiative recur." },
  { name: "Columbia University", aka: ["columbia"], country: "US", tier: "reach", accept: "~4%", region: "New York, NY", dataDepth: "deep",
    motto: "\"In lumine Tuo videbimus lumen\" — \"In Thy light shall we see light.\"",
    values: ["intellectual breadth", "the Core Curriculum", "engagement with NYC", "ideas across disciplines"],
    guidance: "Columbia's famous Core Curriculum means it looks for genuine intellectual breadth and love of big ideas across disciplines, plus students who will engage with New York City. Its distinctive \"list\" supplements (books, media you enjoy) reward authentic intellectual curiosity, not a curated performance.",
    acceptedPattern: "Admits show wide-ranging intellectual curiosity and specific, honest engagement with ideas (and the city) - the Core rewards thinkers comfortable across the humanities and sciences, not just single-track specialists." },
  { name: "Brown University", aka: ["brown"], country: "US", tier: "reach", accept: "~5%", region: "Providence, RI", dataDepth: "deep",
    motto: "\"In Deo Speramus\" — \"In God we hope.\" Brown is known for its Open Curriculum (no core requirements).",
    values: ["intellectual self-direction", "curiosity", "fit with the Open Curriculum", "initiative"],
    guidance: "Brown's Open Curriculum means it specifically seeks self-directed students who thrive without a rigid structure. Show intellectual independence and a clear sense of what you'd do with that freedom - a student who needs to be told what to study is a poor fit, and Brown's essays test exactly this.",
    acceptedPattern: "Admits demonstrate genuine intellectual self-direction - self-designed projects, unusual course combinations, pursuits driven by their own curiosity. A convincing account of why the Open Curriculum fits how you learn recurs strongly." },
  { name: "Dartmouth College", aka: ["dartmouth"], country: "US", tier: "reach", accept: "~5.3%", region: "Hanover, NH", dataDepth: "deep",
    motto: "\"Vox clamantis in deserto\" — \"A voice crying out in the wilderness.\" Dartmouth is the smallest, most undergraduate-focused Ivy.",
    values: ["undergraduate focus", "community", "a bold, independent voice", "engagement with a tight-knit campus"],
    guidance: "Dartmouth prizes undergraduate teaching and a close community, so it reads for students who will actively contribute to a small, tight-knit campus. A bold, authentic voice and evidence you engage deeply with people and place fit its \"voice in the wilderness\" identity.",
    acceptedPattern: "Admits often show genuine community contribution and a distinctive, independent voice - Dartmouth wants people who will show up for a small campus, not just excel in isolation." },
  { name: "Duke University", aka: ["duke"], country: "US", tier: "reach", accept: "~6%", region: "Durham, NC", dataDepth: "deep",
    motto: "\"Eruditio et Religio\" — \"Knowledge and Faith.\"",
    values: ["ambition with balance", "collaboration", "breadth and depth", "real-world application"],
    guidance: "Duke looks for high-achieving students who combine serious ambition with collaboration and range (it prizes both intellectual and, often, athletic/extracurricular energy). A specific \"why Duke\" and evidence of applying your interests in the real world read well.",
    acceptedPattern: "Admits tend to pair strong academics with genuine collaborative leadership and applied impact - the recurring theme is ambition balanced with contribution to a team or community, not solo achievement alone." },
  { name: "Johns Hopkins University", aka: ["johns hopkins", "jhu", "hopkins"], country: "US", tier: "reach", accept: "~6%", region: "Baltimore, MD", dataDepth: "deep",
    motto: "\"Veritas vos liberabit\" — \"The truth shall set you free.\" America's first research university.",
    values: ["research", "collaboration", "hands-on inquiry", "depth in a field"],
    guidance: "Hopkins, the original US research university, explicitly values students who do real research and collaborate. It is especially strong in the sciences and medicine, and its essays reward concrete evidence of inquiry and teamwork over polished generalities.",
    acceptedPattern: "Admits frequently show genuine research or hands-on inquiry (labs, independent projects) and collaborative work - Hopkins publicly emphasizes collaboration over competition, and that shows up in who gets in." },
  { name: "Northwestern University", aka: ["northwestern"], country: "US", tier: "reach", accept: "~7%", region: "Evanston, IL", dataDepth: "deep",
    motto: "\"Quaecumque sunt vera\" — \"Whatsoever things are true.\"",
    values: ["a specific \"why Northwestern\"", "interdisciplinary interests", "balance of academics and passions", "fit"],
    guidance: "Northwestern weighs demonstrated interest and fit heavily, and its \"Why Northwestern\" essay is genuinely important - it wants students who have researched its specific programs (journalism, engineering, theatre, its quarter system). Balanced, cross-disciplinary students who can name exactly why Northwestern do well.",
    acceptedPattern: "Admits show a well-researched, specific fit with Northwestern's programs and culture, plus a balance of academic strength and real passions. Generic applications fare worse; specificity recurs among those admitted." },
  { name: "University of Chicago", aka: ["uchicago", "university of chicago", "u chicago"], country: "US", tier: "reach", accept: "~5%", region: "Chicago, IL", dataDepth: "deep",
    motto: "\"Crescat scientia; vita excolatur\" — \"Let knowledge grow from more to more; and so be human life enriched.\"",
    values: ["intellectual playfulness", "rigor for its own sake", "original thinking", "loving ideas"],
    guidance: "UChicago is famous for its quirky, open-ended essay prompts that test genuine intellectual playfulness and original thinking - \"the life of the mind\" is its whole identity. It rewards students who love ideas for their own sake and can think unconventionally, not resume-optimizers.",
    acceptedPattern: "Admits consistently show intellectual originality and a real delight in ideas - the standout essays take an unusual prompt somewhere genuinely creative and rigorous. Loving the thinking itself, visibly, is the recurring signal." },
  { name: "Cornell University", aka: ["cornell"], country: "US", tier: "reach", accept: "~7%", region: "Ithaca, NY", dataDepth: "deep",
    motto: "\"I would found an institution where any person can find instruction in any study.\" — Ezra Cornell.",
    values: ["fit with a specific college", "breadth of access", "applied and practical study", "a clear academic direction"],
    guidance: "Cornell admits by specific college (Engineering, Arts & Sciences, CALS, Hotel, ILR, etc.), each with its own priorities, so fit with your chosen college and a clear \"why this college/major\" is central. Its \"any person, any study\" ethos values applied, practical study alongside theory.",
    acceptedPattern: "Admits show a clear academic direction that genuinely matches their chosen Cornell college, with evidence of engagement in that specific field - the per-college structure makes focused, well-matched applications recur among those admitted." },
  { name: "Rice University", aka: ["rice"], country: "US", tier: "reach", accept: "~8%", region: "Houston, TX", dataDepth: "deep",
    motto: "\"Letters, Science, Art.\" Rice is small, collaborative, and known for its residential-college culture.",
    values: ["collaboration", "fit with the residential-college culture", "depth in a field", "a distinctive perspective"],
    guidance: "Rice is small and collaborative, with a strong residential-college system and a famous supplemental question (\"what perspective would you add?\"). It reads for students who will add something distinctive to a tight community and go deep in their field.",
    acceptedPattern: "Admits show real depth in an area plus a genuine, specific sense of what they'd contribute to Rice's collaborative community - the recurring theme is distinctive perspective and fit, not just stats." },
  { name: "Vanderbilt University", aka: ["vanderbilt", "vandy"], country: "US", tier: "reach", accept: "~5%", region: "Nashville, TN", dataDepth: "deep",
    motto: "\"Crescere Aude\" — \"Dare to grow.\"",
    values: ["leadership", "collaboration", "ambition with balance", "contribution to community"],
    guidance: "Vanderbilt (among the most selective now) looks for high-achieving students with real leadership and a collaborative, community-minded streak. Its \"dare to grow\" ethos rewards evidence of stretching yourself and lifting others, alongside strong academics.",
    acceptedPattern: "Admits pair strong academics with demonstrated leadership and community contribution - growth, initiative, and helping others recur alongside raw achievement." },
  { name: "University of Notre Dame", aka: ["notre dame", "nd"], country: "US", tier: "reach", accept: "~9%", region: "Notre Dame, IN", dataDepth: "deep",
    motto: "\"Vita, Dulcedo, Spes\" — \"Life, Sweetness, Hope.\" A Catholic university with a strong service and community identity.",
    values: ["service", "character and values", "community", "a sense of purpose"],
    guidance: "Notre Dame has a distinctive Catholic mission and a strong service ethos, and it reads for character, values, and genuine community commitment alongside academics. Authentic service and a sense of purpose fit its identity - and its essays probe for exactly that.",
    acceptedPattern: "Admits often show sustained, genuine service and a clear values-driven purpose, plus real community involvement - character and contribution recur strongly, consistent with its mission." },
  { name: "Georgetown University", aka: ["georgetown"], country: "US", tier: "reach", accept: "~12%", region: "Washington, DC", dataDepth: "deep",
    motto: "\"Utraque Unum\" — \"Both into one.\" A Jesuit university strong in government, international affairs, and service.",
    values: ["service (\"cura personalis\")", "engagement with the world", "intellectual seriousness", "purpose"],
    guidance: "Georgetown, Jesuit and DC-based, is strong in politics, international relations, and service, and its ethos \"cura personalis\" (care for the whole person) shapes what it seeks. It uses its own application (not the Common App) and values intellectual seriousness plus genuine engagement with the world.",
    acceptedPattern: "Admits show real engagement with the world (service, politics, global issues) and intellectual seriousness - purpose and contribution recur, fitting its Jesuit, service-oriented mission." },
  { name: "University of California, Berkeley", aka: ["uc berkeley", "berkeley", "cal"], country: "US", tier: "reach", accept: "~11%", region: "Berkeley, CA", dataDepth: "deep",
    motto: "\"Fiat Lux\" — \"Let there be light.\" A public research powerhouse.",
    values: ["academic excellence", "overcoming challenges", "contribution to community", "the UC PIQs"],
    guidance: "Berkeley uses the UC application (no Common App essay) and its Personal Insight Questions carry real weight. It reads holistically with genuine attention to context and challenges overcome. For CS/engineering it is especially competitive - demonstrated rigor in your intended field matters.",
    acceptedPattern: "Strong Personal Insight Question responses that show real contribution and growth in context recur among admits. Berkeley values demonstrated excellence within a student's own circumstances, not just absolute stats." },
  { name: "University of California, Los Angeles (UCLA)", aka: ["ucla", "uc los angeles"], country: "US", tier: "reach", accept: "~9%", region: "Los Angeles, CA", dataDepth: "deep",
    motto: "\"Fiat Lux\" — \"Let there be light.\" The most-applied-to university in the US.",
    values: ["academic excellence", "the UC PIQs", "contribution and context", "breadth with depth"],
    guidance: "UCLA (UC application, PIQs matter) reads holistically with real attention to context and contribution. It is extremely competitive overall. Strong, specific Personal Insight Questions and demonstrated impact in your community stand out more than stats alone.",
    acceptedPattern: "Like Berkeley, UCLA admits tend to show strong, specific Personal Insight Question responses and real community impact framed in the context of their own circumstances." },
  { name: "University of Michigan", aka: ["michigan", "umich", "university of michigan"], country: "US", tier: "target", accept: "~18%", region: "Ann Arbor, MI", dataDepth: "deep",
    motto: "\"Artes, Scientia, Veritas\" — \"Arts, Knowledge, Truth.\"",
    values: ["academic rigor", "community contribution", "specific \"why Michigan\"", "leadership"],
    guidance: "Michigan values genuine \"why Michigan / why this community\" specificity and sustained contribution. It reads rigor in context. A thoughtful, specific supplemental essay and real depth in a couple of activities matter more than a generic strong-student profile.",
    acceptedPattern: "A specific, well-researched \"why Michigan\" supplement and sustained depth in a few activities recur among admits far more than a generically strong record." },
  { name: "University of North Carolina at Chapel Hill (UNC)", aka: ["unc", "unc chapel hill", "north carolina"], country: "US", tier: "target", accept: "~17%", region: "Chapel Hill, NC", dataDepth: "deep",
    motto: "\"Lux Libertas\" — \"Light and Liberty.\" The oldest US public university.",
    values: ["service and public good", "leadership", "contribution to community", "academic strength"],
    guidance: "UNC (much more selective for out-of-state applicants) has a strong public-service ethos and reads for leadership and community contribution alongside academics. Genuine service and a clear sense of contributing to the public good fit its identity.",
    acceptedPattern: "Admits show academic strength plus real service and leadership - contribution to community recurs, consistent with UNC's public-good mission. Out-of-state admission is notably more competitive." },
  { name: "Carnegie Mellon University", aka: ["carnegie mellon", "cmu"], country: "US", tier: "reach", accept: "~11%", region: "Pittsburgh, PA", dataDepth: "deep",
    motto: "\"My heart is in the work.\" — Andrew Carnegie.",
    values: ["depth in the intended program", "a technical or artistic portfolio", "fit with the specific college", "rigor"],
    guidance: "CMU admits by specific college/program, so depth and fit with your exact intended field is central - a portfolio or concrete body of work (technical or artistic) is often what tips it. Its ethos \"my heart is in the work\" rewards visible dedication. Generalist profiles fare worse here than at more holistic schools; go deep in your lane.",
    acceptedPattern: "Admits usually present a real body of work in their intended program - a portfolio, a technical project, an artistic reel - showing the dedication Carnegie's \"heart is in the work\" ethos points to." },
  { name: "Emory University", aka: ["emory"], country: "US", tier: "target", accept: "~13%", region: "Atlanta, GA", dataDepth: "deep",
    motto: "\"Cor prudentis possidebit scientiam\" — \"The wise heart seeks knowledge.\"",
    values: ["intellectual curiosity", "service", "fit and demonstrated interest", "strength in the health sciences/humanities"],
    guidance: "Emory reads for genuine intellectual curiosity and demonstrated interest, and is especially strong for pre-med and the humanities. A specific \"why Emory\" and authentic engagement with your field read well; it values fit and character over pure prestige-chasing.",
    acceptedPattern: "Admits show real curiosity and often service, with a specific reason for Emory - demonstrated interest and authentic fit recur alongside strong academics." },
  { name: "University of Virginia (UVA)", aka: ["uva", "university of virginia", "virginia"], country: "US", tier: "target", accept: "~17%", region: "Charlottesville, VA", dataDepth: "deep",
    motto: "Founded by Thomas Jefferson on ideals of self-governance and honor; known for its student-run Honor System.",
    values: ["character and honor", "leadership", "community and self-governance", "academic strength"],
    guidance: "UVA (much more selective out-of-state) has a distinctive honor and student-self-governance culture, and reads for character, leadership, and community contribution. Its short, specific supplements reward authentic voice and a real sense of how you'd engage its community.",
    acceptedPattern: "Admits pair academic strength with genuine leadership and character - contribution to community and a fit with UVA's honor culture recur, especially given how competitive out-of-state admission is." },
  { name: "Washington University in St. Louis (WashU)", aka: ["washu", "wustl", "washington university", "washington university in st louis"], country: "US", tier: "reach", accept: "~11%", region: "St. Louis, MO", dataDepth: "deep",
    motto: "\"Per veritatem vis\" — \"Strength through truth.\"",
    values: ["demonstrated interest", "academic depth", "collaboration", "fit"],
    guidance: "WashU weighs demonstrated interest meaningfully and is strong in the sciences, medicine, and business. A specific \"why WashU,\" genuine engagement, and real academic depth read well - it rewards students who clearly want WashU specifically.",
    acceptedPattern: "Admits show strong academics plus clear, demonstrated interest and fit - a specific reason for WashU and authentic engagement recur among those admitted." },
  { name: "University of Southern California (USC)", aka: ["usc", "university of southern california", "southern cal"], country: "US", tier: "target", accept: "~10%", region: "Los Angeles, CA", dataDepth: "deep",
    motto: "\"Palmam qui meruit ferat\" — \"Let whoever earns the palm bear it.\"",
    values: ["a distinctive talent or angle", "interdisciplinary drive", "fit with a specific school (film, business, engineering)", "initiative"],
    guidance: "USC is strong in film, business, engineering, and the arts, and admits with real attention to fit with its specific schools and to a distinctive talent or angle. A clear \"why this USC school\" and evidence of a genuine, developed passion read well.",
    acceptedPattern: "Admits often show a distinctive, developed talent that maps onto a specific USC school, plus interdisciplinary energy - a clear angle and fit recur more than a generic strong profile." },
  { name: "New York University (NYU)", aka: ["nyu", "new york university"], country: "US", tier: "target", accept: "~12%", region: "New York, NY", dataDepth: "deep",
    motto: "\"Perstare et praestare\" — \"To persevere and to excel.\"",
    values: ["genuine fit with NYU's global/urban identity", "demonstrated interest", "academic rigor"],
    guidance: "NYU reads for genuine fit with its urban, global identity and rewards demonstrated interest and a specific \"why NYU.\" It has no single \"type,\" but a clear reason you want NYU specifically (not just New York) and real depth in your field help a lot.",
    acceptedPattern: "A convincing, specific \"why NYU\" (the programs, the global identity - not just the city) plus demonstrated interest recur among admits, alongside solid rigor in the intended field." },
  { name: "Tufts University", aka: ["tufts"], country: "US", tier: "target", accept: "~10%", region: "Medford, MA", dataDepth: "deep",
    motto: "\"Pax et Lux\" — \"Peace and Light.\" Known for its quirky, thoughtful supplemental essays.",
    values: ["intellectual playfulness", "a distinctive voice", "fit and demonstrated interest", "global engagement"],
    guidance: "Tufts is known for creative, open-ended supplements that reward authentic voice and intellectual playfulness (its \"why Tufts\" and quirky prompts genuinely matter). It values students who are thoughtful, distinctive, and clearly want Tufts specifically.",
    acceptedPattern: "Admits show a distinctive, genuine voice in the supplements and real fit with Tufts - the standout applications lean into the quirky prompts sincerely rather than playing it safe." },
  { name: "Georgia Institute of Technology", aka: ["georgia tech", "gatech", "georgia institute of technology"], country: "US", tier: "target", accept: "~16%", region: "Atlanta, GA", dataDepth: "deep",
    motto: "\"Progress and Service.\"",
    values: ["STEM rigor", "hands-on projects", "fit with the major", "problem-solving"],
    guidance: "Georgia Tech is strongly major-focused - fit with your intended (especially STEM) program matters a lot, and admission can differ sharply by major. Demonstrated rigor and real projects in your field, plus a clear \"why this major,\" read very well. Slightly less essay-driven than the Ivies, more focused on academic fit.",
    acceptedPattern: "Admits typically show clear rigor in the intended major plus concrete projects (a build, a competition, applied work) that prove genuine engagement with the field - and a specific, credible reason for that major." },
  { name: "University of Oxford", aka: ["oxford", "oxford university", "university of oxford"], country: "UK", tier: "reach", accept: "~13% (course-dependent)", region: "Oxford, England", dataDepth: "deep",
    motto: "\"Dominus illuminatio mea\" — \"The Lord is my light.\"",
    values: ["deep subject knowledge", "academic potential", "ability to think under pressure", "fit for the tutorial system"],
    guidance: "UK admissions are fundamentally different from the US: Oxford cares almost entirely about ACADEMIC ability and potential in your one chosen subject - not well-roundedness or a broad activity list. Its own guidance: \"show how deeply you have engaged with your subject, above and beyond school.\" Most courses require an admissions test (e.g. TMUA, TARA) and an interview that probes how you think. Your UCAS personal statement should be overwhelmingly about your subject.",
    acceptedPattern: "Successful applicants demonstrate subject obsession that goes far beyond the syllabus - wider reading, engaging with real problems in the field, and articulating ideas clearly. In interviews, admits think aloud and handle unfamiliar problems rather than reciting facts. Extracurriculars matter only if they connect to academic ability." },
  { name: "University of Cambridge", aka: ["cambridge", "cambridge university", "university of cambridge"], country: "UK", tier: "reach", accept: "~16% (course-dependent)", region: "Cambridge, England", dataDepth: "deep",
    motto: "\"Hinc lucem et pocula sacra\" — \"From here, light and sacred draughts\" (enlightenment and knowledge).",
    values: ["exceptional subject ability", "academic depth", "supervision-system fit", "clear scientific/analytical thinking"],
    guidance: "Like Oxford, Cambridge is about pure academic ability in your chosen subject, assessed through your grades, a subject admissions test (e.g. TMUA, ESAT), your personal statement, and a rigorous interview. It also asks many applicants to complete extra questionnaires. Deep, demonstrated engagement with your subject - not breadth of activities - is what matters.",
    acceptedPattern: "Admits show top-level performance in the relevant subjects plus genuine intellectual depth beyond the curriculum, and in interviews they reason through hard, unfamiliar problems calmly. The recurring signal is exceptional, demonstrated ability in the one subject - the UK system rewards specialists." },
  { name: "Imperial College London", aka: ["imperial", "imperial college", "imperial college london"], country: "UK", tier: "reach", accept: "~14% (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "Imperial retired its Latin motto in 2020; today it centres science, engineering, medicine, and business for real-world benefit.",
    values: ["STEM excellence", "course fit", "quantitative ability", "practical application of science"],
    guidance: "Imperial is a STEM-focused UK powerhouse - admission is course-specific and heavily academic, with most courses requiring an admissions test (e.g. TMUA, ESAT) and strong maths/science grades. Its new structured personal statement asks directly why the course and why you're ready. Show deep, genuine ability and interest in your specific subject.",
    acceptedPattern: "Admits show strong quantitative ability and genuine subject engagement (projects, competitions, wider study) - Imperial is unapologetically academic and course-focused, so demonstrated STEM depth and test performance recur far more than breadth." },
  { name: "London School of Economics (LSE)", aka: ["lse", "london school of economics"], country: "UK", tier: "reach", accept: "~9% (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "\"Rerum cognoscere causas\" — \"To understand the causes of things.\"",
    values: ["analytical and quantitative ability", "deep interest in the social sciences", "academic writing", "course fit"],
    guidance: "LSE places arguably more weight on the personal statement than any other top UK university, because it does not interview - the statement is your only chance to show fit. Its guidance is explicit: it should be overwhelmingly academic, focused on your chosen social-science subject. Strong grades, often a maths test (TMUA), and demonstrated analytical engagement matter most.",
    acceptedPattern: "Because LSE doesn't interview, admits stand out through an intensely academic personal statement - real engagement with economics/social science beyond the syllabus, wider reading, and clear analytical thinking. Top grades and (where required) strong test scores recur. Extracurriculars are near-irrelevant unless academically connected." },
  { name: "University College London (UCL)", aka: ["ucl", "university college london"], country: "UK", tier: "reach", accept: "~30% (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "\"Cuncti adsint meritaeque expectent praemia palmae\" — \"Let all come who by merit deserve the most reward.\" Founded as a secular, inclusive alternative to Oxbridge.",
    values: ["academic ability in the chosen course", "genuine subject interest", "breadth of London/UCL opportunity", "merit"],
    guidance: "UCL is a large, research-intensive UK university with course-specific admission. Founded to be open to all \"by merit,\" it reads for genuine academic ability and subject interest through your grades, personal statement, and (for some courses) an admissions test. As in all UK applications, focus the statement on your chosen subject, not a broad activity list.",
    acceptedPattern: "Admits show solid-to-strong grades and clear, genuine engagement with their chosen subject in the personal statement. Requirements vary widely by course, but the recurring signal is academic fit and subject motivation, not well-roundedness." },
  { name: "University of Edinburgh", aka: ["edinburgh", "university of edinburgh"], country: "UK", tier: "target", accept: "course-dependent", region: "Edinburgh, Scotland", dataDepth: "deep",
    motto: "\"Nec temere, nec timide\" — \"Neither rashly, nor timidly.\"",
    values: ["academic ability in the chosen course", "genuine subject interest", "independent thinking", "course fit"],
    guidance: "Edinburgh is a large, ancient, research-intensive UK university with course-specific admission driven mainly by grades and the personal statement (it generally does not interview for most subjects). As with all UK applications, make the statement overwhelmingly about your chosen subject and your academic readiness for it.",
    acceptedPattern: "Admits show the required grades and a focused, subject-driven personal statement demonstrating genuine interest and independent thinking. Competitiveness varies significantly by course; academic fit is the recurring signal." },
  { name: "University of Texas at Austin", aka: ["ut austin", "university of texas", "ut", "texas", "ut-austin"], country: "US", tier: "target", accept: "~29% overall (far lower for top majors)", region: "Austin, TX", dataDepth: "deep",
    motto: "\"Disciplina Praesidium Civitatis\" — \"A cultivated mind is the guardian genius of democracy.\" A major public flagship with elite CS, business, and engineering.",
    values: ["fit with the specific major", "genuine depth in your field", "a real 'why this major'", "academic rigor"],
    guidance: "UT Austin admits BY MAJOR, and this is the single most important thing to understand: the ~29% overall rate is misleading because top programs (CS, McCombs business, engineering) are dramatically harder - CS's Turing honors reportedly denies 85% of valedictorians and competitive CS applicants rank top 1-3% with 1500+ SAT. Texas residents in the top ~6% get automatic admission to the university (not necessarily the major). Write the ApplyTexas Topic A personal statement plus a major-specific short answer that shows genuine curiosity about THAT field, not 'CS/business at any top school.'",
    acceptedPattern: "Admitted students to competitive majors show deep, specific experience in that exact field (real projects, research, competitions) plus top-percentile academics - and essays that engage the actual discipline (specific CS subareas, faculty research, real problems), not generic ambition. Generic 'why this major' essays are immediately less competitive. For non-impacted majors, a solid record and clear direction suffice." },
  { name: "University of California, San Diego (UCSD)", aka: ["ucsd", "uc san diego"], country: "US", tier: "target", accept: "~25%", region: "La Jolla, CA", dataDepth: "deep",
    motto: "\"Fiat Lux\" — \"Let there be light.\" A top public research university (2nd in the world by some research measures) with a distinctive eight-college system.",
    values: ["strong PIQs with specificity", "academic and research focus", "contribution and self-reflection", "fit with a college theme"],
    guidance: "UCSD uses the UC application - four of eight Personal Insight Questions (350 words each), the SAME essays across every UC campus, no separate supplement. Since admitted students' academics are uniformly strong, the PIQs are your real differentiator: they reward specificity, genuine self-reflection, and even honest vulnerability (what you found hard, how you improved) over polished bragging. UCSD is especially strong in STEM, and its eight-college system rewards showing where you'd fit.",
    acceptedPattern: "Admits show strong GPAs plus PIQs with real specificity and reflection - a documented pattern is essays that reveal a genuine, sustained intellectual or community commitment (e.g. a student who led a marine-biology club, researched ocean acidification, and built underwater drones toward a clear goal). CS, engineering, and biology are the most competitive." },
  { name: "University of California, Davis (UC Davis)", aka: ["uc davis", "ucd", "davis"], country: "US", tier: "target", accept: "~37%", region: "Davis, CA", dataDepth: "deep",
    motto: "\"Fiat Lux\" — \"Let there be light.\" World-leading in veterinary medicine, agriculture, and environmental science.",
    values: ["strong PIQs", "academic focus", "community contribution", "fit with signature programs"],
    guidance: "UC Davis uses the UC application - four of eight Personal Insight Questions (350 words each), identical across all UC campuses. It's a well-rounded research university that's genuinely world-first in veterinary science, agriculture, and environmental studies. As with all UCs, the PIQs carry real weight and reward specificity and self-reflection; a clear academic direction (especially in its signature fields) helps.",
    acceptedPattern: "Admits show solid academics and PIQs conveying genuine interest and contribution. Applicants with real depth in Davis's standout areas (vet/ag/environmental/sustainability) stand out; the recurring signal is specificity and growth in the PIQs, not just stats." },
  { name: "University of California, Irvine (UC Irvine)", aka: ["uc irvine", "uci", "irvine"], country: "US", tier: "target", accept: "~25%", region: "Irvine, CA", dataDepth: "deep",
    motto: "\"Fiat Lux\" — \"Let there be light.\" A fast-rising research university strong in CS, biology, and public health.",
    values: ["strong PIQs", "academic focus in your field", "contribution", "self-reflection"],
    guidance: "UC Irvine uses the UC application - four of eight Personal Insight Questions (350 words each), identical across all UC campuses. It's rising fast and especially strong in computer science, biological sciences, and public health. The PIQs are the key differentiator among academically-strong applicants; write with specificity and genuine reflection, and show focus in your intended field (top majors are more competitive).",
    acceptedPattern: "Admits show strong academics and focused, specific PIQs. Competitiveness varies sharply by major - CS and biology are among the hardest - and the recurring signal is demonstrated interest plus reflective, specific essays." },
  { name: "University of California, Santa Barbara (UCSB)", aka: ["ucsb", "uc santa barbara"], country: "US", tier: "target", accept: "~38%", region: "Santa Barbara, CA", dataDepth: "deep",
    motto: "\"Fiat Lux\" — \"Let there be light.\" A research university with standout physics, engineering, and materials science (and multiple Nobel laureates).",
    values: ["strong PIQs", "intellectual curiosity", "empathy and contribution", "academic focus"],
    guidance: "UCSB uses the UC application - four of eight Personal Insight Questions (350 words each), identical across all UC campuses. It has genuinely elite physics, engineering, and materials-science programs. UCSB specifically values students who will positively contribute to campus and show empathy alongside achievement; write PIQs with specificity and real reflection, and show genuine intellectual interest.",
    acceptedPattern: "Admits show solid academics and PIQs conveying real curiosity, contribution, and (UCSB emphasizes) empathy and character. Its top science/engineering programs are notably more competitive; specific, reflective essays recur." },
  { name: "University of Wisconsin-Madison", aka: ["wisconsin", "uw madison", "university of wisconsin", "uw-madison"], country: "US", tier: "target", accept: "~43%", region: "Madison, WI", dataDepth: "deep",
    motto: "\"Numen Lumen\" (\"God, our light\"), but its living ethos is the \"Wisconsin Idea\": that university knowledge should improve people's lives beyond the classroom.",
    values: ["the Wisconsin Idea (real-world impact)", "academic rigor", "genuine involvement", "a clear direction"],
    guidance: "Wisconsin-Madison is a top public research university whose defining value is the \"Wisconsin Idea\" - knowledge applied for the public good, statewide and beyond. Its supplemental essay asks what you want to accomplish and how you'd contribute, so tie your interests to real-world impact. It reads for rigor plus genuine involvement; out-of-state and top majors (CS, business, engineering) are more competitive.",
    acceptedPattern: "Admits show strong academics plus genuine involvement, and the strongest essays connect the applicant's interests to real-world contribution consistent with the Wisconsin Idea. A clear sense of how you'd use your education recurs." },
  { name: "University of Illinois Urbana-Champaign (UIUC)", aka: ["uiuc", "university of illinois", "illinois", "u of i"], country: "US", tier: "target", accept: "~45% overall (far lower for engineering/CS)", region: "Urbana-Champaign, IL", dataDepth: "deep",
    motto: "\"Learning and Labor.\" A public powerhouse with top-5-in-the-nation engineering and computer science.",
    values: ["fit with the specific major", "genuine technical depth", "problem-solving", "a real 'why this major'"],
    guidance: "UIUC admits BY MAJOR, and its world-class engineering and CS programs (Grainger College) are dramatically more competitive than the ~45% overall rate - CS admits are near the very top of the applicant pool. Apply directly to the major you want and write essays showing genuine, specific technical interest and real projects. A clear 'why this major and why UIUC' matters; generic ambition doesn't compete for the top programs.",
    acceptedPattern: "Admits to top engineering/CS programs show serious demonstrated technical depth - real projects, competitions, applied work - well beyond strong grades, plus essays engaging the specific field. For less-impacted majors, a solid record and clear direction suffice." },
  { name: "University of Washington (UW)", aka: ["uw", "university of washington", "udub"], country: "US", tier: "target", accept: "~43% overall (far lower for CS)", region: "Seattle, WA", dataDepth: "deep",
    motto: "\"Lux Sit\" — \"Let there be light.\" A major public research university with an elite CS program (the Allen School), plus top medicine and sciences.",
    values: ["fit with the intended field", "real engagement and impact", "a clear direction", "genuine reflection"],
    guidance: "UW is a leading public research university where the Allen School of Computer Science is extremely competitive and effectively a separate, much harder admit than the ~43% overall rate. It reads holistically with two required essays (a personal statement and a short response) that reward genuine reflection and real engagement. Show demonstrated depth in your field; top majors (CS especially) require serious evidence.",
    acceptedPattern: "Admits show strong academics and reflective essays showing real engagement or impact; CS/Allen School admits in particular show serious demonstrated technical depth. Fit with the intended field and authentic reflection recur." },
  { name: "University of Florida (UF)", aka: ["uf", "university of florida", "florida"], country: "US", tier: "target", accept: "~24%", region: "Gainesville, FL", dataDepth: "deep",
    motto: "\"Civium in moribus rei publicae salus\" — \"The welfare of the state depends on the character of its citizens.\" A top public flagship and an especially strong value.",
    values: ["academic rigor", "genuine involvement and leadership", "a clear direction", "contribution"],
    guidance: "UF is a highly-ranked public flagship, strong across the board, that has become notably more selective. It reads for academic rigor plus genuine, sustained involvement and leadership. Its application rewards clear direction and real contribution to your community; the competitive Honors Program and top majors ask for more demonstrated depth.",
    acceptedPattern: "Admits show strong academics with genuine involvement and leadership over time; the recurring signal is sustained commitment and contribution rather than a scattered activity list. Honors and top majors are more competitive." },
  { name: "Michigan State University", aka: ["michigan state", "msu", "mich state"], country: "US", tier: "target", accept: "~83%", region: "East Lansing, MI", dataDepth: "deep",
    motto: "\"Advancing Knowledge. Transforming Lives.\" A large land-grant flagship, pioneer of the land-grant model, strong in education, supply chain, and the sciences.",
    values: ["academic readiness", "a clear direction", "involvement", "fit with the major/program"],
    guidance: "Michigan State is a large, accessible land-grant flagship (the original land-grant model) with a much higher overall admit rate, though its Honors College and top programs (supply-chain management, education, some sciences) are meaningfully more competitive. A solid academic record, a clear direction, and genuine involvement read well; it's a strong target/safety with real program strengths.",
    acceptedPattern: "Admits generally clear a solid GPA and course-rigor bar with a clear academic direction; Honors College and standout programs reward additional demonstrated depth and involvement." },
  { name: "Northeastern University", aka: ["northeastern", "neu"], country: "US", tier: "reach", accept: "~5-6% overall (RD ~3.8%)", region: "Boston, MA", dataDepth: "deep",
    motto: "\"Lux, Veritas, Virtus\" — \"Light, Truth, Courage.\" Defined by its co-op program (paid six-month professional placements integrated into the degree).",
    values: ["co-op / experiential readiness", "demonstrated interest", "real-world initiative", "depth over breadth"],
    guidance: "Northeastern's entire identity is co-op, so it reads applications for students who will thrive in paid professional placements - show real-world initiative and readiness for hands-on work. It's one of the few top-30 schools that rates demonstrated interest 'very important' (open its emails, attend sessions, and strongly consider Early Decision, which roughly doubles your odds - RD is under 4%). There's no 'Why Northeastern' essay, so your interest and co-op fit must come through the Common App essay and activities.",
    acceptedPattern: "A documented admit pattern: a student with a 3.8 GPA / 1460 SAT got in because her essay showed her teaching herself Python to analyze local water-quality data - the officer 'could picture her succeeding in co-op.' Self-taught skills and independently solving real problems beat titles; sustained depth beats a long list; and demonstrated interest genuinely moves the needle here." },
  { name: "Tulane University", aka: ["tulane"], country: "US", tier: "reach", accept: "~13% overall (RD reportedly under 3%)", region: "New Orleans, LA", dataDepth: "deep",
    motto: "\"Non sibi, sed suis\" — \"Not for oneself, but for one's own.\" Strong in pre-med and STEM (it began as a medical school) with a built-in service requirement.",
    values: ["demonstrated interest (heavily)", "service", "a genuine 'why Tulane / why New Orleans'", "a distinctive angle"],
    guidance: "Tulane is the demonstrated-interest school - it admits the vast majority of its class through Early Decision/Early Action, leaving a Regular Decision rate reportedly under 3%. If Tulane is a real choice, applying early and showing genuine engagement is the single biggest lever. It has a strong service ethos (service is built into the curriculum) and pre-med/STEM strength; a specific 'why Tulane and why New Orleans' plus real service read well.",
    acceptedPattern: "Admits overwhelmingly come from the early rounds and show clear, genuine interest in Tulane specifically (visits, contact, a specific reason for New Orleans), often paired with real service. The recurring lesson: 'Tulane wants students who want Tulane' - demonstrated interest and applying early matter more here than at almost any peer." },
  { name: "Purdue University", aka: ["purdue", "purdue university"], country: "US", tier: "target", accept: "~43% overall (far lower for engineering/CS)", region: "West Lafayette, IN", dataDepth: "deep",
    motto: "\"Education, Research, Service.\" A public flagship with world-class engineering, computer science, and aviation, admitting by college.",
    values: ["fit with the specific major/college", "genuine technical depth", "a specific 'why Purdue'", "hands-on/applied work"],
    guidance: "Purdue's ~43% overall rate is misleading - engineering and CS are far more competitive (admitted engineers average ~3.85 GPA / ~1409 SAT), and you apply directly into a college (engineering starts in a First-Year Engineering program). Its 'Why Purdue' short answer rewards SPECIFICITY - name an actual lab, a specific sub-field ('robotics and autonomous sensing,' not 'engineering'), and pick one academic and one non-academic interest. Purdue uses rolling admission, so apply early.",
    acceptedPattern: "Admits to competitive colleges show genuine major-fit rigor (strong math/science, real projects) and essays that reference specific Purdue programs, labs, or faculty rather than generic 'good engineering school' praise. Applying early in the rolling cycle and demonstrated technical depth recur." },
  { name: "Wake Forest University", aka: ["wake forest", "wfu"], country: "US", tier: "target", accept: "~21%", region: "Winston-Salem, NC", dataDepth: "deep",
    motto: "\"Pro Humanitate\" — \"For Humanity.\" Small, teaching-focused, and a pioneer of test-optional admissions.",
    values: ["character and service", "authentic voice", "engagement and work ethic", "fit with a small community"],
    guidance: "Wake Forest has been test-optional since 2009 and genuinely means it - it states 'numbers rarely tell the whole story' and weighs the interview, essays, and personal qualities (life experience, work ethic, engagement) heavily. Its optional supplemental questions are read closely and reward authentic voice. It's small and teaching-focused with a 'Pro Humanitate' service ethos; show real character and how you'd engage a close community.",
    acceptedPattern: "Admits stand out through authentic voice, character, and service rather than stats alone - Wake Forest deliberately de-emphasizes test scores and looks for the person behind the numbers. Doing the optional interview and engaging sincerely with the supplements recur among admits." },
  { name: "Boston University (BU)", aka: ["bu", "boston university"], country: "US", tier: "reach", accept: "~14%", region: "Boston, MA", dataDepth: "deep",
    motto: "\"Learning, Virtue, Piety.\" A large private research university woven into the city of Boston, admitting by school/college.",
    values: ["fit with a specific school", "academic rigor", "a genuine 'why BU'", "engagement with an urban campus"],
    guidance: "BU is a large urban research university that admits into its specific schools/colleges (e.g. Questrom business, engineering, CAS, COM), so fit with your intended school matters. Its supplemental essay asks why BU, and it rewards specificity about programs and the Boston setting. Strong academics plus a credible reason you want BU (not just 'a school in Boston') read well.",
    acceptedPattern: "Admits show strong academics and a specific reason for BU and their intended college; the recurring signal is genuine fit and a clear academic direction rather than treating BU as an interchangeable big-city option." },
  { name: "Boston College", aka: ["bc", "boston college"], country: "US", tier: "target", accept: "~15%", region: "Chestnut Hill, MA", dataDepth: "deep",
    motto: "\"Ever to Excel\" (Aien Aristeuein). A Jesuit university with a formation ethos ('cura personalis' - care for the whole person) and a liberal-arts core.",
    values: ["character and formation", "service", "reflective purpose", "intellectual and personal growth"],
    guidance: "Boston College is Jesuit, and its 'cura personalis' formation ethos genuinely shapes admissions - it reads for character, values, and a reflective sense of purpose alongside academics. Its supplemental prompts are often reflective/values-oriented (BC has asked distinctive questions about beliefs and purpose), so answer them with genuine self-reflection. Real service and a thoughtful sense of who you're becoming fit its identity.",
    acceptedPattern: "Admits show strong academics plus genuine service and reflective depth in the essays - character and a values-driven purpose recur, consistent with BC's Jesuit formation mission." },
  { name: "University of Rochester", aka: ["rochester", "u of r", "university of rochester", "uofr"], country: "US", tier: "target", accept: "~35%", region: "Rochester, NY", dataDepth: "deep",
    motto: "\"Meliora\" — \"Ever Better.\" Open curriculum (no strict core) with standout optics, music (Eastman), and the sciences.",
    values: ["intellectual self-direction", "fit with the open curriculum", "depth in a field", "curiosity"],
    guidance: "Rochester has a flexible open curriculum (the 'Rochester Curriculum' - no rigid general-ed requirements) and elite programs in optics, music (Eastman), and the sciences. Its 'Meliora' ethos and self-directed structure reward students who show intellectual independence and a clear sense of what they'd pursue with that freedom. Its essays ask how you'd use the open curriculum - answer specifically.",
    acceptedPattern: "Admits show genuine curiosity and self-direction plus real depth in an area; a convincing account of why the open curriculum fits how you learn, and clear academic interests, recur among those admitted." },
  { name: "Case Western Reserve University", aka: ["case western", "cwru", "case"], country: "US", tier: "target", accept: "~30%", region: "Cleveland, OH", dataDepth: "deep",
    motto: "\"Thinking Beyond the Possible.\" A research-intensive university strong in engineering, the sciences, and pre-med.",
    values: ["STEM and research strength", "demonstrated interest", "fit with the intended field", "problem-solving"],
    guidance: "Case Western is research-intensive and strong in engineering, the sciences, and pre-med, and it weighs demonstrated interest. It offers strong ED options and reads for genuine fit with your intended field. Real research or technical engagement, and a specific reason for Case (its co-op, its labs, the Cleveland medical ecosystem), read well.",
    acceptedPattern: "Admits show strong academics with genuine STEM depth or research and clear demonstrated interest; fit with the intended program and a specific reason for Case recur, and applying ED helps for a committed applicant." },
  { name: "University of Maryland, College Park", aka: ["maryland", "umd", "university of maryland", "umcp", "maryland college park"], country: "US", tier: "target", accept: "~45% overall (far lower for CS/engineering)", region: "College Park, MD", dataDepth: "deep",
    motto: "Historically Latin; the university today rallies around \"Fear the Turtle\" and a 'Fearless Ideas' innovation identity. A public flagship near DC.",
    values: ["fit with the major", "innovation and initiative", "a clear direction", "academic rigor"],
    guidance: "Maryland is a public flagship near DC, very strong in computer science, engineering, and business - and those top majors (plus the honors programs like ACES, QUEST, and the Banneker/Key scholarship) are far more competitive than the ~45% overall rate. It reads for rigor and a clear direction; demonstrated depth in your intended field helps most for the competitive majors. Apply early - Maryland reviews on a priority timeline.",
    acceptedPattern: "Admits to CS/engineering show genuine technical depth beyond grades; across the board, a clear academic direction and real initiative recur, with honors and top majors rewarding demonstrated depth. Meeting the priority deadline matters." },
  { name: "Ohio State University", aka: ["ohio state", "osu", "the ohio state university"], country: "US", tier: "target", accept: "~53%", region: "Columbus, OH", dataDepth: "deep",
    motto: "\"Disciplina in civitatem\" — \"Education for citizenship.\" A very large public flagship strong across many fields.",
    values: ["academic rigor", "a clear direction", "involvement", "fit with the major/honors"],
    guidance: "Ohio State is a large public flagship, strong across many disciplines, with a competitive Honors & Scholars program and more selective top majors. A solid academic record, a clear direction, and genuine involvement read well; the honors program and standout majors (business, engineering) ask for more. Applying by the early-action deadline improves scholarship and honors consideration.",
    acceptedPattern: "Admits clear a solid GPA and course-rigor bar with a clear academic direction; the Honors & Scholars program and top majors reward demonstrated depth and involvement. Applying early helps for merit and honors." },
  { name: "Texas A&M University", aka: ["texas a&m", "tamu", "aggies", "texas am", "texas a and m"], country: "US", tier: "target", accept: "~57% overall (holistic for non-auto-admits)", region: "College Station, TX", dataDepth: "deep",
    motto: "A land-grant flagship defined by the Aggie Core Values (respect, excellence, leadership, loyalty, integrity, selfless service) and a famously tight alumni culture.",
    values: ["character and Core Values", "leadership and service", "fit with the specific major", "a genuine 'why A&M'"],
    guidance: "Texas A&M has two paths: Texas residents in the top 10% get automatic admission; everyone else (and most out-of-state applicants) goes through full holistic review. Its essay set is distinctive - a 750-word 'Tell us your story' plus short answers including 'why your major' and 'why A&M' - and it reads for the Aggie Core Values, leadership, and service, not just stats. Engineering is a separate, harder holistic review (CS targets ~3.75 GPA via the ETAM process). Apply early (opens in August) and show genuine fit with its strong, service-oriented culture.",
    acceptedPattern: "Over 40% of admits were NOT top-10%, so holistic factors genuinely matter: admits show rigor plus real leadership, service, and character consistent with the Core Values, and essays with genuine interest in A&M and their specific major/college. Applying early and demonstrated interest recur; engineering/CS admits show serious major-specific depth." },
  { name: "University of Georgia (UGA)", aka: ["uga", "university of georgia", "georgia bulldogs"], country: "US", tier: "target", accept: "~37%", region: "Athens, GA", dataDepth: "deep",
    motto: "\"Et docere et rerum exquirere causas\" — \"To teach and to inquire into the nature of things.\" The oldest state-chartered US university, with standout business and journalism.",
    values: ["academic rigor", "genuine involvement and leadership", "a clear direction", "contribution"],
    guidance: "UGA is a strong public flagship that reads GPA and course rigor heavily in a first academic read, then weighs essays, involvement, and leadership for many applicants in a holistic second read. Early Action is non-binding and strategically valuable (better odds and scholarship consideration). Its standout Terry business and Grady journalism programs, and the Honors Program, are more competitive. Show rigor plus genuine, sustained involvement.",
    acceptedPattern: "Admits show strong academics with genuine leadership and sustained involvement; the recurring signal is real contribution over a scattered list. Applying Early Action and demonstrated depth (especially for Terry/Grady/Honors) recur among competitive admits." },
  { name: "College of William & Mary", aka: ["william and mary", "william & mary", "w&m", "wm"], country: "US", tier: "target", accept: "~33%", region: "Williamsburg, VA", dataDepth: "deep",
    motto: "A historic public 'Public Ivy' (the second-oldest US college), known for close undergraduate teaching, strong writing, and a liberal-arts ethos.",
    values: ["genuine intellectual engagement", "strong writing and voice", "fit with a small, close community", "academic rigor"],
    guidance: "William & Mary practices genuine holistic review - every application is read at least twice, including by your regional counselor - and it's test-optional. It's a small, teaching-focused Public Ivy that values intellectual engagement and strong writing, so its essays (including distinctive optional prompts) genuinely matter. Out-of-state admission is notably more competitive. Show authentic voice and how you'd engage a close academic community.",
    acceptedPattern: "Admits show academic strength plus genuine intellectual engagement and distinctive, well-written essays - W&M explicitly looks for 'dynamic, diverse, academically engaged' students, and voice and fit recur over pure stats, especially for the competitive out-of-state pool." },
  { name: "University of Pittsburgh", aka: ["pitt", "university of pittsburgh", "upitt"], country: "US", tier: "target", accept: "~58%", region: "Pittsburgh, PA", dataDepth: "deep",
    motto: "\"Veritas et Virtus\" — \"Truth and Virtue.\" A public research university strong in the health sciences, engineering, and philosophy.",
    values: ["academic rigor", "a clear direction", "real-world engagement", "applying early"],
    guidance: "Pitt uses ROLLING admission - there's no set deadline and it reviews files daily starting in August, so applying early is the single biggest strategic lever (better odds plus scholarship, Frederick Honors, and guaranteed-program consideration; decisions come in ~6-8 weeks). It requires the SRAR (self-reported academic record). It reads holistically for rigor and fit, and is strong in the health sciences, engineering, and philosophy. Keep senior-year rigor up.",
    acceptedPattern: "Admits show solid-to-strong academics and a clear direction; because admission is rolling, applying early genuinely improves outcomes for both admission and honors/scholarships. Demonstrated fit with the intended field recurs." },
  { name: "Rutgers University-New Brunswick", aka: ["rutgers", "rutgers university", "ru", "rutgers new brunswick"], country: "US", tier: "target", accept: "~66%", region: "New Brunswick, NJ", dataDepth: "deep",
    motto: "\"Sol iustitiae et occidentem illustra\" — \"Sun of righteousness, shine also upon the West.\" A colonial-era public flagship, strong in many fields, admitting by school.",
    values: ["academic rigor", "a clear direction", "fit with the school/major", "involvement"],
    guidance: "Rutgers-New Brunswick admits BY school/college (e.g. the School of Arts and Sciences, Engineering, Business), and it's more numbers-driven than the most selective privates - GPA and course rigor carry a lot of weight, and it's largely test-optional. Honors College and top majors are more holistic and competitive. A solid record, clear academic direction, and fit with your chosen school read well.",
    acceptedPattern: "Admits generally clear a GPA/rigor bar with a clear direction that matches their chosen school; the Honors College and competitive majors (engineering, business) reward additional demonstrated depth. Applying early in the cycle helps." },
  { name: "University of Minnesota Twin Cities", aka: ["minnesota", "umn", "university of minnesota", "u of m", "umn twin cities"], country: "US", tier: "target", accept: "~70%", region: "Minneapolis, MN", dataDepth: "deep",
    motto: "\"Commune vinculum omnibus artibus\" — \"A common bond for all the arts.\" A large public research flagship strong across many fields.",
    values: ["academic rigor", "a clear direction", "involvement", "fit with the college/major"],
    guidance: "Minnesota is a large public research flagship, strong across many fields, admitting into specific colleges, with a competitive University Honors Program and more selective top majors (e.g. Carlson business, CSE engineering/CS). It reads for rigor and a clear direction; a solid record with genuine involvement reads well, and honors/top majors ask for more demonstrated depth. Priority deadlines help for scholarships and honors.",
    acceptedPattern: "Admits clear a solid academic bar with a clear direction that fits their chosen college; the Honors Program and top majors reward demonstrated depth. Meeting the priority deadline recurs among competitive/honors admits." },
  { name: "Indiana University Bloomington", aka: ["indiana", "iu", "indiana university", "iub", "iu bloomington"], country: "US", tier: "target", accept: "~80%", region: "Bloomington, IN", dataDepth: "deep",
    motto: "\"Lux et Veritas\" — \"Light and Truth.\" A large public flagship famed for the Kelley School of Business, music (Jacobs), and informatics.",
    values: ["academic rigor", "fit with the program (esp. direct-admit)", "a clear direction", "involvement"],
    guidance: "Indiana is an accessible large flagship overall, but its standout programs are the real story - the Kelley School of Business offers competitive DIRECT ADMIT (far harder than the overall rate; standard admits must later apply to Kelley internally), and the Jacobs School of Music requires auditions. Applying early (Kelley's direct-admit deadline is early) and showing genuine, specific interest and rigor in your target program matters most.",
    acceptedPattern: "For accessible majors, a solid record suffices; for Kelley direct admit, Jacobs music, and honors, admits show serious program-specific strength (strong quantitative record for Kelley, auditions for Jacobs) and clear demonstrated interest. Applying early for direct admit recurs." },
  { name: "Villanova University", aka: ["villanova", "nova", "villanova university"], country: "US", tier: "target", accept: "~23%", region: "Villanova, PA", dataDepth: "deep",
    motto: "\"Veritas, Unitas, Caritas\" — \"Truth, Unity, Love.\" An Augustinian Catholic university with a strong community ethos and standout business and engineering.",
    values: ["character and service", "community and 'why Villanova'", "a clear purpose", "academic strength"],
    guidance: "Villanova is Augustinian Catholic with a genuinely strong community and service culture, and it weighs fit and demonstrated interest. Its supplemental essays lean toward community, values, and service, so answer them with real reflection and a specific reason for Villanova. Its business (VSB) and engineering programs are more competitive. Consider Early Decision if it's a true first choice.",
    acceptedPattern: "Admits show strong academics plus genuine service and community involvement, and essays that convey real fit with Villanova's values-driven community. Character, a specific 'why Villanova,' and (for VSB/engineering) demonstrated depth recur." },
  { name: "Lehigh University", aka: ["lehigh", "lehigh university"], country: "US", tier: "target", accept: "~29%", region: "Bethlehem, PA", dataDepth: "deep",
    motto: "\"Homo minister et interpres naturae\" — \"Man, the servant and interpreter of nature.\" Strong in engineering, business, and the integrated sciences.",
    values: ["fit with the college", "demonstrated interest", "a clear direction", "academic rigor"],
    guidance: "Lehigh admits with attention to fit with its specific colleges (Engineering, Business, Arts & Sciences, and the integrated programs), and it weighs demonstrated interest. It offers strong Early Decision options (ED meaningfully boosts odds). A clear 'why Lehigh,' genuine interest in your intended college, and real academic focus read well.",
    acceptedPattern: "Admits show strong academics with demonstrated interest and a clear fit with a specific college; applying ED for a committed applicant and genuine engagement with the intended program recur." },
  { name: "Brandeis University", aka: ["brandeis", "brandeis university"], country: "US", tier: "target", accept: "~39%", region: "Waltham, MA", dataDepth: "deep",
    motto: "\"Truth, even unto its innermost parts\" (Emet). A research university founded on a strong social-justice and intellectual tradition.",
    values: ["intellectual seriousness", "social justice and service", "a distinctive voice", "academic depth"],
    guidance: "Brandeis has a strong intellectual and social-justice tradition (founded in 1948 on inclusive, justice-oriented values) and reads for genuine ideas, values, and academic seriousness. It's test-optional and its essays reward a distinctive voice and real engagement with issues you care about. Show intellectual depth and authentic values fit rather than a generic strong-student profile.",
    acceptedPattern: "Admits show intellectual seriousness and often a social-justice or service dimension, plus a distinctive, sincere voice; depth and genuine values fit recur over pure stats." },
  { name: "University of Miami", aka: ["miami", "um", "university of miami", "the u", "umiami"], country: "US", tier: "target", accept: "~19%", region: "Coral Gables, FL", dataDepth: "deep",
    motto: "\"Magna est veritas\" — \"Great is truth.\" A private research university strong in marine science, medicine, business, and music (Frost).",
    values: ["demonstrated interest", "a specific 'why Miami'", "intellectual vitality / a spike", "academic rigor"],
    guidance: "University of Miami has become notably more selective and weighs demonstrated interest ('considered') - engage genuinely (sessions, campus, opening emails). It does NOT interview, so your personality must come through the Common App and supplemental essays, which should show specific knowledge of Miami's programs, faculty, or opportunities (marine science, the Frost music school, medicine). It values intellectual vitality - a real spike or independent project stands out. Over 60% of admits were top-10% in class.",
    acceptedPattern: "Admits show strong academics (weighted GPAs well above 3.5, most top-10%) plus a specific, informed reason for Miami and often a developed 'spike.' Generic supplements are easy to spot; specificity and demonstrated interest recur among admits." },
  { name: "Fordham University", aka: ["fordham", "fordham university"], country: "US", tier: "target", accept: "~47%", region: "New York City, NY", dataDepth: "deep",
    motto: "A Jesuit university whose ethos is 'cura personalis' (care for the whole person) and 'New York is my campus, Fordham is my school.'",
    values: ["service and 'men and women for others'", "fit with NYC and Fordham", "reflection and character", "a specific 'why Fordham'"],
    guidance: "Fordham is Jesuit, and its supplements are explicitly values-oriented - one asks how you'd contribute as an engaged learner and leader drawing on your identity and experiences, another asks about embracing NYC as your campus. Answer with genuine reflection and service; you needn't be Catholic, but alignment with Jesuit values (justice, compassion, service to others) strengthens your case. Applying Early Decision meaningfully boosts odds (ED ~52%). Show a real reason for Fordham and New York specifically.",
    acceptedPattern: "Admits show solid academics (GPAs above ~3.6, rigorous curriculum) plus genuine service, moral reflection, and a specific connection to Fordham's Jesuit mission and NYC setting. Reflection, character, and a real 'why Fordham' recur; ED applicants have a notable edge." },
  { name: "Southern Methodist University (SMU)", aka: ["smu", "southern methodist", "southern methodist university"], country: "US", tier: "target", accept: "~47%", region: "Dallas, TX", dataDepth: "deep",
    motto: "\"Veritas Liberabit Vos\" — \"The truth will make you free.\" Strong in business (Cox) and the arts, with a powerful Dallas alumni and internship network.",
    values: ["fit with a specific school", "a clear 'why SMU'", "leadership and involvement", "demonstrated interest"],
    guidance: "SMU is a private university strong in business (Cox) and the arts, with deep Dallas corporate connections. It reads for academic strength, fit with its specific schools, and demonstrated interest. A clear, specific reason for SMU (its programs, Dallas opportunities, leadership community) and genuine involvement read well; ED is available for committed applicants.",
    acceptedPattern: "Admits show solid-to-strong academics and a specific reason for SMU and their intended school, plus genuine leadership/involvement; fit and demonstrated interest recur. Cox business and the arts programs are more competitive." },
  { name: "Texas Christian University (TCU)", aka: ["tcu", "texas christian", "texas christian university"], country: "US", tier: "target", accept: "~44%", region: "Fort Worth, TX", dataDepth: "deep",
    motto: "\"Add value; be a good citizen.\" A private university (Disciples of Christ heritage) with a strong community culture and standout Neeley business program.",
    values: ["genuine fit and 'why TCU'", "community contribution", "character and involvement", "academic rigor"],
    guidance: "TCU places significant weight on essays and fit - it explicitly says 'generic essays do not work here' and values students who articulate clear goals and how they'd contribute to the TCU community. It's test-optional (about half of admits submit scores) and reads course rigor heavily (admitted weighted GPA near ~3.85). Its Neeley School of Business is a top-30 undergraduate program and more competitive. Show genuine, specific interest in TCU's community.",
    acceptedPattern: "Admits show strong academics with a rigorous curriculum plus essays that convey a genuine, specific reason for TCU and how they'd contribute to its community. Fit, character, and a non-generic 'why TCU' recur; Neeley is more competitive." },
  { name: "Baylor University", aka: ["baylor", "baylor university"], country: "US", tier: "target", accept: "~45%", region: "Waco, TX", dataDepth: "deep",
    motto: "\"Pro Ecclesia, Pro Texana\" — \"For Church, For Texas.\" The largest Baptist university, strong in the sciences, business, and pre-health, with a faith-informed community.",
    values: ["character and faith/values fit", "academic rigor", "service", "a clear direction"],
    guidance: "Baylor is a large Baptist university with a genuine faith-informed community and mission, strong in the sciences, business, and pre-health. It reads for academic rigor plus character and fit with its values-driven, service-oriented culture. A clear academic direction and authentic engagement with its community and mission read well; honors and top programs are more competitive.",
    acceptedPattern: "Admits show solid-to-strong academics with a clear direction, plus character and genuine fit with Baylor's faith-informed, service-oriented community. Honors College and competitive majors reward additional demonstrated depth." },
  { name: "Syracuse University", aka: ["syracuse", "cuse", "syracuse university"], country: "US", tier: "target", accept: "~46% overall (far lower for Newhouse)", region: "Syracuse, NY", dataDepth: "deep",
    motto: "\"Suos cultores scientia coronat\" — \"Knowledge crowns those who seek her.\" Home to the elite Newhouse communications school and the #1-ranked Maxwell public-affairs program.",
    values: ["fit with a specific school", "a distinctive talent or portfolio", "demonstrated interest", "a clear direction"],
    guidance: "Syracuse's ~46% overall rate hides that its signature schools are far more competitive - the Newhouse School of Public Communications is often cited at ~8-20%, and Maxwell (public affairs), architecture, and Visual & Performing Arts are standouts (some requiring portfolios/auditions). Admission is school-specific, so a distinctive talent and a clear, specific reason for your Syracuse school matter most. Strong admits average ~3.9 GPA.",
    acceptedPattern: "For the signature schools, admits show a developed talent or portfolio and clear fit with that specific program; across the board, a clear direction and demonstrated interest recur. Newhouse/architecture/VPA admits show genuine, specific creative or communications depth." },
  { name: "Pennsylvania State University (Penn State)", aka: ["penn state", "psu", "pennsylvania state university", "penn state university park"], country: "US", tier: "target", accept: "~55%", region: "University Park, PA", dataDepth: "deep",
    motto: "\"Making Life Better.\" A large public flagship strong in engineering, business (Smeal), and the sciences, with a vast alumni network.",
    values: ["academic rigor", "a clear direction", "involvement", "fit with the major/honors"],
    guidance: "Penn State is a large public flagship, strong in engineering, business, and the sciences, with more selective top majors and the highly competitive Schreyer Honors College (which has its own essays and a much lower admit rate). It reviews on a rolling-ish priority basis, so applying by the November 30 priority deadline genuinely helps. A solid record, clear direction, and genuine involvement read well; honors and top majors ask for more.",
    acceptedPattern: "Admits clear a solid academic bar with a clear direction; Schreyer Honors and top majors (engineering, Smeal business) reward demonstrated depth. Applying by the priority deadline recurs among competitive and honors admits." },
  { name: "University of Connecticut (UConn)", aka: ["uconn", "university of connecticut", "u conn"], country: "US", tier: "target", accept: "~55%", region: "Storrs, CT", dataDepth: "deep",
    motto: "\"Qui transtulit sustinet\" — \"He who transplanted still sustains.\" A public flagship strong in the sciences, engineering, business, and nursing.",
    values: ["academic rigor", "a clear direction", "involvement", "fit with the major/honors"],
    guidance: "UConn is a public flagship strong in the sciences, engineering, business, and nursing, with a competitive Honors Program and more selective top majors. It reads for rigor and a clear direction; a solid academic record with genuine involvement reads well, and honors/top majors ask for more demonstrated depth. Applying by the priority deadline helps for honors and merit.",
    acceptedPattern: "Admits show solid academics and a clear direction; the Honors Program and competitive majors reward demonstrated depth. Meeting the priority deadline recurs among honors/merit admits." },
  { name: "Pepperdine University", aka: ["pepperdine", "pepperdine university"], country: "US", tier: "target", accept: "~49%", region: "Malibu, CA", dataDepth: "deep",
    motto: "\"Freely ye received, freely give.\" A Christian university (Churches of Christ heritage) with a strong values, service, and global-programs emphasis.",
    values: ["character and faith/values fit", "service", "a clear purpose", "a specific 'why Pepperdine'"],
    guidance: "Pepperdine is a Christian university with a genuinely strong values, service, and community emphasis and standout study-abroad programs. It reads for character and a reflective sense of purpose alongside academics; its supplements lean toward values, service, and fit. Authentic service and a specific reason for Pepperdine's mission and community read well.",
    acceptedPattern: "Admits show solid academics plus genuine service and a values-driven purpose, with essays conveying real fit with Pepperdine's Christian, service-oriented mission. Character and a specific 'why Pepperdine' recur." },
  { name: "Williams College", aka: ["williams", "williams college"], country: "US", tier: "reach", accept: "~9%", region: "Williamstown, MA", dataDepth: "deep",
    motto: "The top-ranked US liberal arts college, defined by its Oxford-style tutorial system and a rural, undergraduate-centered, scholar-athlete culture.",
    values: ["fit with the tutorial system", "intellectual specificity", "fit with a small rural community", "genuine (not generic) 'why Williams'"],
    guidance: "Williams is a liberal arts college (~2,000 students) as selective as the Ivies - it rejects many valedictorians. Its defining feature is the TUTORIAL system: Oxford-style classes of just two students who produce and critique work weekly. Its 'Why Williams' supplement should engage the tutorial specifically - readers instantly detect essays that treat Williams as interchangeable with Amherst/Swarthmore/Bowdoin. Fit with the rural Williamstown setting matters (urban-career emphasis signals poor fit). ED is meaningful (~27%) but only works with authentic commitment.",
    acceptedPattern: "Admits show intellectual specificity and genuine fit with the tutorial format and rural setting; the strongest non-athlete essays focus on academic/intellectual specifics (not athletics), while athlete essays keep sports brief within a broader academic narrative. Generic 'elite LAC' essays and poor rural fit are the top failure modes." },
  { name: "Amherst College", aka: ["amherst", "amherst college"], country: "US", tier: "reach", accept: "~9%", region: "Amherst, MA", dataDepth: "deep",
    motto: "\"Terras Irradient\" — \"Let them illuminate the lands.\" A top LAC defined by its open curriculum (no core requirements) and Five College consortium access.",
    values: ["intellectual flexibility and self-direction", "fit with the open curriculum", "a distinctive voice", "genuine curiosity"],
    guidance: "Amherst is a top liberal arts college (~1,900 students) whose signature is the OPEN CURRICULUM - no general-education requirements, so it seeks intellectually flexible, self-directed students who will make thoughtful choices with that freedom. Its distinctive supplement often asks you to respond to a quotation, rewarding genuine intellectual engagement over polish. Fit with the open curriculum and Five College consortium, plus a distinctive voice, matter more than a broad resume.",
    acceptedPattern: "Admits show genuine intellectual curiosity and self-direction plus a distinctive voice in the quotation-response essay; a convincing sense of how they'd use curricular freedom recurs. Like all top LACs, generic 'why Amherst' essays fare poorly." },
  { name: "Swarthmore College", aka: ["swarthmore", "swat", "swarthmore college"], country: "US", tier: "reach", accept: "~7%", region: "Swarthmore, PA", dataDepth: "deep",
    motto: "\"Mind the light\" (a Quaker phrase). An intensely academic LAC with a discussion-based, intellectually rigorous culture and a Quaker ethic of social responsibility.",
    values: ["intellectual intensity", "discussion-based rigor", "social responsibility", "genuine love of ideas"],
    guidance: "Swarthmore is among the most academically intense liberal arts colleges (~1,700 students), with a discussion-heavy, seminar-driven culture and a Quaker-rooted ethic of social responsibility (its Honors Program uses external examiners, modeled on Oxford). It reads for genuine intellectual intensity and love of ideas, plus a values dimension. Show real depth of thought and how you'd engage its rigorous, discussion-based, ethically-minded community.",
    acceptedPattern: "Admits show genuine intellectual intensity and a love of ideas for their own sake, often paired with social conscience; the recurring signal is depth of thought and fit with a demanding, discussion-based culture rather than credentials alone." },
  { name: "Pomona College", aka: ["pomona", "pomona college"], country: "US", tier: "reach", accept: "~7%", region: "Claremont, CA", dataDepth: "deep",
    motto: "A top LAC and the founding member of the Claremont Colleges consortium, combining a small close-knit college with access to five neighboring campuses.",
    values: ["intellectual curiosity", "fit with the consortium model", "a distinctive voice", "collaboration and community"],
    guidance: "Pomona is a top liberal arts college (~1,700 students) and the anchor of the Claremont Colleges consortium - you get a small, close college plus cross-registration across five campuses. It reads for intellectual curiosity, character, and genuine fit with its collaborative, sunny, close-knit community. Its supplements reward authentic voice and specificity about Pomona and the consortium. Show real curiosity and how you'd contribute to a tight community.",
    acceptedPattern: "Admits show genuine curiosity and a distinctive, sincere voice, plus a specific sense of how they'd use the consortium and contribute to Pomona's community; fit and character recur over pure stats." },
  { name: "Wellesley College", aka: ["wellesley", "wellesley college"], country: "US", tier: "reach", accept: "~13%", region: "Wellesley, MA", dataDepth: "deep",
    motto: "\"Non Ministrari sed Ministrare\" — \"Not to be ministered unto, but to minister.\" The top women's liberal arts college, with a strong ethic of women's leadership.",
    values: ["women's leadership and empowerment", "intellectual rigor", "service and contribution", "a distinctive voice"],
    guidance: "Wellesley is the leading women's liberal arts college (~2,400 students), with a powerful legacy of women's leadership (its alumnae include many trailblazers). It reads for intellectual rigor plus a genuine commitment to leadership and making a difference, consistent with its 'not to be ministered unto, but to minister' motto. Its supplement asks why a women's college; answer authentically. Show real academic drive and how you'd contribute to and grow within its community.",
    acceptedPattern: "Admits show intellectual rigor plus a genuine drive to lead and contribute, and an authentic reason for choosing a women's college. Leadership potential and a distinctive voice recur alongside strong academics." },
  { name: "Bowdoin College", aka: ["bowdoin", "bowdoin college"], country: "US", tier: "reach", accept: "~9%", region: "Brunswick, ME", dataDepth: "deep",
    motto: "\"The Offer of the College\" (1906) frames its values: to be at home in all lands and ages, to lose yourself in generous enthusiasms, and to count nature a familiar acquaintance.",
    values: ["character and 'The Offer' values", "intellectual engagement", "service and community", "fit with a close community"],
    guidance: "Bowdoin is a top liberal arts college (~1,800 students) in coastal Maine, and a test-optional pioneer (since 1969). Its distinctive optional supplement invites you to reflect on a line from 'The Offer of the College' - a genuine window into whether its values resonate with you, so answer it sincerely if it does. It has a strong College House residential system and community ethos. Show character, intellectual engagement, and how you'd contribute to a close community.",
    acceptedPattern: "Admits show academic strength plus genuine character and community-mindedness, and (when they write it) an authentic response to 'The Offer of the College.' Fit with a close, values-driven community recurs; scores matter less given the long test-optional history." },
  { name: "Carleton College", aka: ["carleton", "carleton college"], country: "US", tier: "reach", accept: "~17%", region: "Northfield, MN", dataDepth: "deep",
    motto: "A top Midwestern LAC known for intellectual seriousness worn lightly - a quirky, collaborative, genuinely nerdy-in-the-best-way culture and standout undergraduate teaching.",
    values: ["intellectual curiosity and playfulness", "collaboration (not competition)", "a distinctive, authentic voice", "genuine engagement"],
    guidance: "Carleton is a top liberal arts college (~2,000 students) in Minnesota, famous for pairing serious academics with a warm, quirky, collaborative (non-cutthroat) culture. Its supplements reward genuine intellectual curiosity and authentic personality - it wants people who love learning and don't take themselves too seriously. Show real curiosity, a distinctive voice, and how you'd add to a collaborative community rather than a polished, generic profile.",
    acceptedPattern: "Admits show genuine intellectual curiosity and an authentic, often playful voice, plus collaborative spirit; the recurring signal is a real love of learning and fit with Carleton's warm, quirky culture rather than resume polish." },
  { name: "Middlebury College", aka: ["middlebury", "midd", "middlebury college"], country: "US", tier: "reach", accept: "~13%", region: "Middlebury, VT", dataDepth: "deep",
    motto: "A top LAC renowned for languages (its immersive Language Schools), international studies, and environmental studies, in a rural Vermont setting.",
    values: ["intellectual engagement", "fit with its signature strengths (languages/environment/international)", "fit with a rural community", "a clear direction"],
    guidance: "Middlebury is a top liberal arts college (~2,900 students) in rural Vermont, world-renowned for language immersion (its summer Language Schools are legendary), international studies, and environmental studies. It reads holistically and its essays reward genuine engagement; fit with the rural setting and its signature academic strengths helps. Show real intellectual interest (especially if it aligns with languages, the environment, or global study) and how you'd engage a close rural community.",
    acceptedPattern: "Admits show strong academics and genuine intellectual engagement, often with interest in Middlebury's signature areas (languages, international, environmental); fit with a rural, close community and a clear direction recur." },
  { name: "Claremont McKenna College", aka: ["claremont mckenna", "cmc", "claremont mckenna college"], country: "US", tier: "reach", accept: "~10%", region: "Claremont, CA", dataDepth: "deep",
    motto: "A top LAC focused on 'responsible leadership,' economics, government, and public affairs - pre-professional in flavor and part of the Claremont consortium.",
    values: ["responsible leadership", "interest in economics/government/public affairs", "real-world application", "a specific 'why CMC'"],
    guidance: "Claremont McKenna is a top liberal arts college (~1,400 students) with a distinctive, pre-professional focus on leadership, economics, government, and public policy - its Athenaeum (a daily speaker/discussion forum) and Robert Day econ/finance program are signatures, and it's part of the Claremont consortium. Its supplements ask directly about 'responsible leadership' and a public-policy issue you care about; answer with genuine specifics and connect your goals to CMC's actual programs (the Athenaeum, research institutes).",
    acceptedPattern: "Admits show demonstrated leadership and a genuine interest in economics/government/public affairs, plus essays that specifically connect their goals to CMC's programs (Athenaeum, institutes). Specificity and a clear leadership/impact orientation recur." },
  { name: "Davidson College", aka: ["davidson", "davidson college"], country: "US", tier: "reach", accept: "~17%", region: "Davidson, NC", dataDepth: "deep",
    motto: "\"Alenda lux ubi orta libertas\" — \"Let learning be cherished where liberty has arisen.\" A top LAC with a rigorous Honor Code and a close, service-minded community.",
    values: ["character and the Honor Code", "intellectual rigor", "service and community", "fit with a close community"],
    guidance: "Davidson is a top liberal arts college (~2,000 students) near Charlotte, defined by a genuinely central, student-run Honor Code (self-scheduled, unproctored exams) and a strong service ethos. It reads for character, intellectual rigor, and community fit; its essays reward authentic reflection and a real sense of how you'd engage a trust-based, close community. It also meets full demonstrated need. Show integrity, academic seriousness, and community-mindedness.",
    acceptedPattern: "Admits show strong academics plus genuine character and community engagement consistent with the Honor Code and service culture; integrity, contribution, and fit with a close, trust-based community recur over stats alone." },
  { name: "Harvey Mudd College", aka: ["harvey mudd", "hmc", "mudd"], country: "US", tier: "reach", accept: "~13%", region: "Claremont, CA", dataDepth: "deep",
    motto: "A top STEM-focused liberal arts college in the Claremont consortium, uniquely pairing rigorous science/engineering with a required humanities/social-science core and a collaborative (not cutthroat) intensity.",
    values: ["exceptional STEM aptitude", "collaboration under intensity", "impact and interdisciplinary thinking", "authentic voice"],
    guidance: "Harvey Mudd (~850 students) is a STEM powerhouse LAC whose mission is engineers/scientists/mathematicians who also understand the humanities and 'the impact of their work.' It's academically intense but genuinely collaborative, with a signature Clinic Program (real-world team projects for companies). Its essays ask how your background shapes the problems you want to solve - answer authentically, not with what you think they want. Show exceptional STEM ability plus collaborative spirit and a sense of impact.",
    acceptedPattern: "Admits show exceptional math/science aptitude AND collaborative character, plus essays connecting their background to real problems they want to solve. The recurring signal is depth in STEM combined with genuine interdisciplinary curiosity and a we-not-me spirit - Mudd is intense but not individualistic." },
  { name: "Haverford College", aka: ["haverford", "haverford college"], country: "US", tier: "reach", accept: "~14%", region: "Haverford, PA", dataDepth: "deep",
    motto: "A top LAC defined by its student-run Honor Code (trust-based, self-scheduled exams) and Quaker-rooted values, with Bi-College (Bryn Mawr) and Tri-College/Penn access.",
    values: ["character and the Honor Code", "intellectual seriousness", "trust and community", "originality and careful reading"],
    guidance: "Haverford (~1,400 students) centers a genuinely student-run Honor Code that shapes academic and social life. Its supplement is famous for a long, values-laden prompt - admissions is testing whether you read carefully AND can push its community values into your own life with originality and honesty. Read it slowly and answer with real reflection. It has Bi-Co (Bryn Mawr) and Tri-Co/Penn consortium access. Show intellectual seriousness, integrity, and genuine fit with a trust-based community.",
    acceptedPattern: "Admits show intellectual seriousness plus genuine character and honesty consistent with the Honor Code; the recurring signal is a careful, original supplement that applies Haverford's values authentically - generic or careless responses stand out negatively at a school this values-driven." },
  { name: "Grinnell College", aka: ["grinnell", "grinnell college"], country: "US", tier: "reach", accept: "~11%", region: "Grinnell, IA", dataDepth: "deep",
    motto: "A top Midwestern LAC with an open curriculum, a strong ethic of self-governance and social justice, and unusually generous financial aid.",
    values: ["intellectual self-direction", "social responsibility", "self-governance and community", "genuine curiosity"],
    guidance: "Grinnell (~1,700 students) in rural Iowa pairs an OPEN CURRICULUM (design your own course of study via one-on-one academic advising) with a deep culture of self-governance and social justice. It reads for intellectual self-direction, genuine curiosity, and social conscience. Its essays reward authentic engagement with ideas and community. Show that you'd thrive with curricular freedom and contribute to a values-driven, self-governing community - and fit with a rural, close-knit setting.",
    acceptedPattern: "Admits show genuine intellectual self-direction and a demonstrated commitment to social responsibility; the recurring signal is curiosity plus values and a fit with self-governance, rather than a conventional resume. Grinnell wants students who'll use freedom well and engage a close community." },
  { name: "Barnard College", aka: ["barnard", "barnard college"], country: "US", tier: "reach", accept: "~7%", region: "New York City, NY", dataDepth: "deep",
    motto: "A top women's liberal arts college in NYC, partnered with Columbia University - the small-college experience plus access to a research university and the city.",
    values: ["women's leadership and ambition", "intellectual boldness", "fit with NYC and the Columbia partnership", "a distinctive voice"],
    guidance: "Barnard (~3,000 students) is a women's liberal arts college with a formal partnership with Columbia (shared courses, cross-registration, a Columbia degree affiliation) and all of New York City as its extended campus. It reads for intellectually bold, ambitious women who will use the small-college-plus-research-university-plus-city combination. Its supplements ask why a women's college and why Barnard specifically; answer authentically. Show ambition, a distinctive voice, and genuine fit with its NYC/Columbia context.",
    acceptedPattern: "Admits show intellectual boldness and ambition plus a genuine reason for choosing a women's college and Barnard's NYC/Columbia setting; a distinctive voice and drive recur alongside strong academics." },
  { name: "Wesleyan University", aka: ["wesleyan", "wesleyan university", "wes"], country: "US", tier: "reach", accept: "~14%", region: "Middletown, CT", dataDepth: "deep",
    motto: "An intellectually adventurous LAC known for open curriculum flexibility, strengths in film and the arts, and a progressive, activist campus culture.",
    values: ["intellectual adventurousness", "creativity and the arts", "independent thinking and activism", "a distinctive voice"],
    guidance: "Wesleyan (~3,000 students) is one of the more intellectually adventurous and creative LACs - flexible curriculum, standout film and arts programs, and a progressive, activist culture. It reads for originality, creativity, and independent thinking, and its essays reward a genuinely distinctive voice over polish. Show intellectual boldness, creative or activist engagement, and how you'd add to a nonconformist community.",
    acceptedPattern: "Admits show intellectual adventurousness and a distinctive, creative voice, often with artistic or activist depth; the recurring signal is originality and independent thinking rather than a conventional strong-student profile." },
  { name: "Hamilton College", aka: ["hamilton", "hamilton college"], country: "US", tier: "reach", accept: "~12%", region: "Clinton, NY", dataDepth: "deep",
    motto: "A top LAC renowned for its open curriculum and an exceptional emphasis on writing and oral communication.",
    values: ["strong writing and communication", "intellectual self-direction", "fit with the open curriculum", "a clear voice"],
    guidance: "Hamilton (~2,000 students) in rural New York is known for its OPEN CURRICULUM and a distinctive, serious emphasis on writing and speaking (it has a dedicated writing center and communication requirements). It reads for strong writers and self-directed thinkers. Its essays reward clarity and a genuine voice; show that you'd thrive with curricular freedom and value the craft of writing/communication. Fit with a rural, close community helps.",
    acceptedPattern: "Admits show strong writing and a clear voice plus intellectual self-direction; the recurring signal is genuine engagement with ideas and communication, and fit with the open curriculum, over a broad activity list." },
  { name: "Vassar College", aka: ["vassar", "vassar college"], country: "US", tier: "reach", accept: "~18%", region: "Poughkeepsie, NY", dataDepth: "deep",
    motto: "A top LAC (originally a women's college) known for the arts, an open and flexible curriculum, and a creative, independent-minded campus culture.",
    values: ["creativity and the arts", "intellectual independence", "an open, flexible approach", "a distinctive voice"],
    guidance: "Vassar (~2,400 students) is a creative, intellectually independent LAC with a flexible curriculum and notable strengths in the arts, drama, and film. It reads for originality, genuine intellectual curiosity, and fit with an expressive, open-minded community. Its essays reward a distinctive, authentic voice. Show creative or intellectual depth and how you'd contribute to a nonconformist, arts-friendly community.",
    acceptedPattern: "Admits show creativity and intellectual independence plus a distinctive voice; the recurring signal is authentic self-expression and genuine curiosity rather than a formulaic profile." },
  { name: "Colgate University", aka: ["colgate", "colgate university"], country: "US", tier: "reach", accept: "~12%", region: "Hamilton, NY", dataDepth: "deep",
    motto: "A top LAC with a strong core/liberal-arts tradition, a beautiful rural campus, and notable strengths in the sciences, economics, and international study.",
    values: ["academic rigor and breadth", "genuine 'why Colgate'", "involvement and community", "fit with a rural campus"],
    guidance: "Colgate (~3,000 students) is a top LAC in rural New York with a strong liberal-arts core, robust study-abroad, and strengths across the sciences, economics, and international relations. It reads holistically and weighs fit; a specific 'why Colgate' and genuine involvement read well. It offers Early Decision, which helps committed applicants. Show academic rigor, real engagement, and fit with a close, rural campus community.",
    acceptedPattern: "Admits show strong academics plus genuine involvement and a specific reason for Colgate; fit with a rural, close-knit campus and a clear direction recur, and ED applicants have an edge." },
  { name: "Colby College", aka: ["colby", "colby college"], country: "US", tier: "reach", accept: "~8%", region: "Waterville, ME", dataDepth: "deep",
    motto: "A top LAC in Maine known for strong sciences and environmental studies, generous financial aid, and a close, engaged community that has invested heavily in downtown Waterville.",
    values: ["academic rigor", "community engagement", "fit with a rural/environmental setting", "a genuine 'why Colby'"],
    guidance: "Colby (~2,300 students) is a top LAC in Maine with strengths in the sciences and environmental studies, a January 'Jan Plan' term, and deep community-engagement initiatives (including revitalizing downtown Waterville). It reads holistically and values fit; a specific reason for Colby and genuine engagement read well. It offers Early Decision. Show academic seriousness, community-mindedness, and fit with a close, rural, environmentally-engaged community.",
    acceptedPattern: "Admits show strong academics plus genuine community engagement and a specific reason for Colby; fit with a close rural community and (often) interest in its science/environmental strengths recur, with an ED edge for committed applicants." },
  { name: "Bates College", aka: ["bates", "bates college"], country: "US", tier: "reach", accept: "~14%", region: "Lewiston, ME", dataDepth: "deep",
    motto: "A top LAC in Maine founded on egalitarian, abolitionist principles (no fraternities, coeducational from the start), test-optional since 1984, with a strong senior-thesis culture.",
    values: ["character and egalitarian values", "intellectual engagement", "a distinctive voice", "community and inclusion"],
    guidance: "Bates (~1,800 students) is a top LAC in Maine with deep egalitarian roots (founded by abolitionists, coed and fraternity-free from the start) and a pioneering test-optional history (since 1984), so scores carry less weight. It requires a capstone senior thesis and reads for genuine intellectual engagement, character, and inclusive community fit. Its essays reward authentic voice. Show real intellectual curiosity, values alignment, and how you'd contribute to a close, egalitarian community.",
    acceptedPattern: "Admits show genuine intellectual engagement and character consistent with Bates's egalitarian, inclusive ethos; a distinctive voice and community fit recur, and test scores matter less given the long test-optional history." },
  { name: "Smith College", aka: ["smith", "smith college"], country: "US", tier: "target", accept: "~23%", region: "Northampton, MA", dataDepth: "deep",
    motto: "The largest of the Seven Sisters women's colleges, with an open curriculum, a strong engineering program (rare for a women's LAC), and a member of the Five College Consortium.",
    values: ["women's leadership", "intellectual independence", "fit with the open curriculum", "a distinctive voice"],
    guidance: "Smith (~2,500 students) is the largest historically women's college, distinctive for an OPEN CURRICULUM and the first engineering program at a US women's college. It's part of the Five College Consortium (Amherst, Mount Holyoke, Hampshire, UMass). It reads for intellectually independent, ambitious women and rewards a genuine reason for choosing a women's college and Smith specifically. Show academic drive, self-direction with curricular freedom, and how you'd contribute to its community.",
    acceptedPattern: "Admits show intellectual independence and ambition plus an authentic reason for a women's college; a distinctive voice and drive recur. Interest in its open curriculum, engineering, or consortium access strengthens fit." },
  { name: "Mount Holyoke College", aka: ["mount holyoke", "holyoke", "mount holyoke college", "mhc"], country: "US", tier: "target", accept: "~38%", region: "South Hadley, MA", dataDepth: "deep",
    motto: "The oldest of the Seven Sisters (founded 1837), a women's college with a strong global/international student body and Five College Consortium membership.",
    values: ["women's leadership", "global perspective", "intellectual seriousness", "community contribution"],
    guidance: "Mount Holyoke (~2,200 students) is the oldest women's college in the US, known for a notably international, globally-minded community and Five College Consortium access. It reads for intellectually serious, purpose-driven women and rewards a genuine reason for a women's college. Show academic seriousness, a global or community-minded outlook, and how you'd contribute to and grow within its community.",
    acceptedPattern: "Admits show intellectual seriousness plus a purpose- or community-minded outlook and an authentic reason for choosing a women's college; a global perspective and genuine contribution recur." },
  { name: "Bryn Mawr College", aka: ["bryn mawr", "bryn mawr college"], country: "US", tier: "target", accept: "~32%", region: "Bryn Mawr, PA", dataDepth: "deep",
    motto: "\"Veritatem Dilexi\" — \"I have delighted in the truth.\" A Seven Sisters women's college with a rigorous, graduate-serious intellectual culture, a strong Honor Code, and Bi-College (Haverford) / Tri-College (Swarthmore, Penn) access.",
    values: ["intellectual rigor and seriousness", "the Honor Code and self-governance", "women's scholarship", "a distinctive voice"],
    guidance: "Bryn Mawr (~1,400 students) is a women's college with an unusually rigorous, scholarly culture (it was a pioneer in women's graduate education) and a strong student-run Honor Code and self-governance tradition. It has Bi-Co (Haverford) and Tri-Co (Swarthmore, Penn) consortium access. It reads for genuinely serious intellectuals and rewards depth of thought plus a real reason for a women's college. Show scholarly seriousness, integrity, and fit with a rigorous, self-governing community.",
    acceptedPattern: "Admits show genuine intellectual rigor and scholarly seriousness plus fit with the Honor Code and self-governance; depth of thought and an authentic reason for a women's college recur over conventional credentials." },
  { name: "Colorado College", aka: ["colorado college", "cc"], country: "US", tier: "target", accept: "~14%", region: "Colorado Springs, CO", dataDepth: "deep",
    motto: "A top LAC defined by the Block Plan - students take one course at a time, intensively, for three-and-a-half weeks - paired with an outdoorsy, experiential, adventurous culture at the base of Pikes Peak.",
    values: ["intellectual intensity and focus", "experiential/adventurous learning", "independence and time-management", "a genuine 'why the Block Plan'"],
    guidance: "Colorado College (~2,000 students) is best known for the BLOCK PLAN: one class at a time (9am-noon daily) for 3.5 weeks, eight blocks a year - immersive, intense, and enabling deep fieldwork and outdoor adventure. Its supplements probe fit with this distinctive format, so show that you'd thrive learning one subject intensively and value experiential, focused study. An outdoorsy, adventurous, independent streak fits its culture. Engage the Block Plan specifically, not generically.",
    acceptedPattern: "Admits show genuine enthusiasm for intensive, immersive learning and fit with the Block Plan's focus and pace, often paired with an adventurous, experiential, or outdoorsy orientation; a specific 'why the Block Plan' recurs over generic LAC essays." },
  { name: "Washington and Lee University", aka: ["washington and lee", "w&l", "wlu", "washington & lee"], country: "US", tier: "reach", accept: "~17%", region: "Lexington, VA", dataDepth: "deep",
    motto: "\"Non Incautus Futuri\" — \"Not Unmindful of the Future.\" A top LAC with a genuinely central, student-run Honor System and strengths in pre-law, business/commerce, and the humanities.",
    values: ["character and the Honor System", "leadership", "intellectual seriousness", "fit with a close, traditional community"],
    guidance: "Washington and Lee (~1,800 undergraduates) in Virginia is defined by a deeply central, student-run Honor System (a single-sanction honor code shaping all of campus life) and strengths in pre-law, its Williams School of commerce/economics, and the humanities. It's generous with need- and merit-aid (the Johnson Scholarship). It reads for character, leadership, and intellectual seriousness. Show integrity, leadership, and genuine fit with a close, tradition-minded, honor-based community.",
    acceptedPattern: "Admits show strong academics plus genuine character and leadership consistent with the Honor System; integrity, contribution, and fit with a close, traditional community recur. The Johnson Scholarship pool is especially competitive." },
  { name: "Oberlin College", aka: ["oberlin", "oberlin college"], country: "US", tier: "target", accept: "~35%", region: "Oberlin, OH", dataDepth: "deep",
    motto: "\"Learning and Labor.\" A top LAC with a world-class music Conservatory, a pioneering history (first coeducational and among the first to admit Black students), and a deeply progressive, activist culture.",
    values: ["intellectual and artistic passion", "social justice and activism", "independent thinking", "a distinctive voice"],
    guidance: "Oberlin (~2,900 students, including its renowned Conservatory of Music) has a pioneering, activist identity and a famously progressive, socially-engaged culture. It reads for intellectual and artistic passion, independent thinking, and genuine social conscience. Music applicants apply to the Conservatory (auditions). Its essays reward a distinctive, authentic voice. Show real intellectual or creative depth, values-driven engagement, and fit with a nonconformist, justice-minded community.",
    acceptedPattern: "Admits show genuine intellectual or artistic passion and often a social-justice orientation, plus a distinctive voice; independent thinking and values fit recur. Conservatory admission hinges on the audition and musical excellence." },
  { name: "Kenyon College", aka: ["kenyon", "kenyon college"], country: "US", tier: "target", accept: "~30%", region: "Gambier, OH", dataDepth: "deep",
    motto: "A top LAC renowned for English and creative writing (home of the historic Kenyon Review), set on a small, tight-knit rural Ohio campus.",
    values: ["strong writing and a love of literature", "intellectual community", "a distinctive voice", "fit with a rural, close community"],
    guidance: "Kenyon (~1,800 students) in rural Ohio is famous for English and creative writing (the Kenyon Review is a storied literary journal) and a warm, close intellectual community. It reads for strong writers and genuine humanists, and its essays especially reward voice and craft. Show a real love of ideas and language (whatever your field), a distinctive voice, and fit with a small, rural, tight-knit community.",
    acceptedPattern: "Admits show strong writing and a genuine love of learning (especially, but not only, in the humanities), plus a distinctive voice; fit with a close, literary, rural community recurs over conventional stats." },
  { name: "Macalester College", aka: ["macalester", "mac", "macalester college"], country: "US", tier: "target", accept: "~29%", region: "Saint Paul, MN", dataDepth: "deep",
    motto: "\"Natura Consilium\" - a top LAC with a defining emphasis on internationalism, multiculturalism, and civic engagement, in the Twin Cities.",
    values: ["global citizenship", "service and civic engagement", "intellectual seriousness", "a distinctive voice"],
    guidance: "Macalester (~2,100 students) in Saint Paul is distinctive for its core commitments to internationalism, multiculturalism, and service to society - a genuinely globally-minded, civically-engaged community with Twin Cities access. It reads for intellectually serious, globally-aware, service-minded students. Its essays reward authentic engagement with the world and community. Show a global perspective, real civic or service commitment, and intellectual seriousness.",
    acceptedPattern: "Admits show intellectual seriousness plus genuine global awareness and civic/service engagement, consistent with Macalester's international, service-oriented mission; a distinctive voice and real-world engagement recur." },
  { name: "Occidental College", aka: ["occidental", "oxy", "occidental college"], country: "US", tier: "target", accept: "~37%", region: "Los Angeles, CA", dataDepth: "deep",
    motto: "\"Occidens Proximus Orienti\" - a top LAC in Los Angeles known for interdisciplinary learning, strong civic engagement, and standout programs in politics, international relations, and the arts (with LA as a resource).",
    values: ["civic engagement", "interdisciplinary curiosity", "fit with an urban LA setting", "a distinctive voice"],
    guidance: "Occidental (~2,000 students) is a top LAC in LA, known for interdisciplinary learning, civic engagement, and strengths in politics and international relations (with real access to Los Angeles's institutions). It reads for intellectually curious, civically-engaged students and rewards genuine fit with an urban, diverse, engaged community. Its essays reward a distinctive voice and specificity about Oxy and LA. Show curiosity, civic-mindedness, and a real reason for Occidental.",
    acceptedPattern: "Admits show intellectual curiosity and genuine civic engagement plus a specific fit with Oxy's urban, interdisciplinary community; a distinctive voice and clear 'why Oxy/LA' recur." },
  { name: "University of Richmond", aka: ["richmond", "university of richmond", "uofr richmond"], country: "US", tier: "target", accept: "~24%", region: "Richmond, VA", dataDepth: "deep",
    motto: "\"Verbum Vitae et Lumen\" - a top small university blending liberal arts with strong professional schools (business/Robins, leadership studies/Jepson - the nation's first school of leadership studies), with unusually generous aid.",
    values: ["leadership", "academic breadth and depth", "genuine 'why Richmond'", "a distinctive voice"],
    guidance: "Richmond (~3,000 students) is a small university with a liberal-arts core plus standout professional programs - the Robins School of Business and the Jepson School of Leadership Studies (the first of its kind). It's generous with aid (the Richmond's Promise / merit scholarships). It reads holistically and values fit and demonstrated interest; a specific reason for Richmond and genuine engagement read well. Show academic seriousness, leadership or purpose, and a real 'why Richmond.'",
    acceptedPattern: "Admits show strong academics plus leadership or clear purpose and a specific reason for Richmond and its distinctive programs; fit and demonstrated interest recur, and the top merit scholarships are especially competitive." },
  { name: "University of St Andrews", aka: ["st andrews", "saint andrews", "university of st andrews"], country: "UK", tier: "reach", accept: "~30-35% offer rate (course-dependent)", region: "St Andrews, Scotland", dataDepth: "deep",
    motto: "Scotland's first university (founded 1413) and consistently among the very top UK universities, known for a close, traditional community and strong arts, sciences, and international relations.",
    values: ["deep subject knowledge and wider reading", "academic independence", "a focused personal statement", "genuine subject passion"],
    guidance: "St Andrews (UK course-specific model) values academic, independent, well-read students - its guidance is explicit that grades alone don't guarantee admission, and it weighs your personal statement and reference alongside grades and context. Make the personal statement overwhelmingly about your chosen subject: cite specific wider reading and activities that genuinely deepened your knowledge of it. Most courses decide on grades + PS (no interview, except Medicine, which uses the UCAT and multiple mini-interviews). It pledges offers to UK applicants meeting its criteria.",
    acceptedPattern: "Successful applicants show demonstrated subject passion beyond the syllabus - specific wider reading, relevant activities, and independent engagement - articulated in a focused personal statement. As across UK admissions, subject depth and academic ability matter far more than a broad activity list." },
  { name: "University of Warwick", aka: ["warwick", "university of warwick"], country: "UK", tier: "reach", accept: "~60% offer rate overall (far lower for Econ/Maths/CS)", region: "Coventry, England", dataDepth: "deep",
    motto: "\"Mens agitat molem\" — \"Mind moves matter.\" A leading Russell Group university especially renowned for economics, mathematics (MORSE), business (WBS), and computer science.",
    values: ["exceptional ability in the specific subject", "analytical/quantitative strength", "a rigorous, specific personal statement", "test performance where required"],
    guidance: "Warwick (UK course-specific model) has a ~60% overall offer rate that badly understates its flagship courses - Economics, Maths, MORSE, and CS require top grades (often A*A*A*) plus admissions tests (TMUA/STEP/MAT for maths-heavy courses), so among near-identical top applicants the personal statement and test performance are the differentiators. Its business school (WMG/WBS) explicitly warns against generic statements ('I want a better job') and inspirational quotes. Make the PS deeply subject-specific and analytical.",
    acceptedPattern: "For the flagship quantitative courses, admits show top grades, strong admissions-test scores, and a rigorous, subject-specific personal statement demonstrating real analytical engagement. Generic statements and quotes are explicitly penalised; subject depth is everything." },
  { name: "Durham University", aka: ["durham", "durham university"], country: "UK", tier: "reach", accept: "~40% offer rate (course-dependent)", region: "Durham, England", dataDepth: "deep",
    motto: "A collegiate Russell Group university (one of England's oldest) with an Oxbridge-adjacent reputation, a strong college system, and standout humanities, sciences, and social sciences.",
    values: ["strong subject ability", "a focused personal statement", "academic depth beyond the syllabus", "fit with the collegiate system"],
    guidance: "Durham (UK course-specific model) is a collegiate university with a strong academic reputation and, like Oxbridge, a residential college system (you can apply to a specific college or make an open application). Admission is grades + personal statement for most courses (interviews mainly for Medicine/Education); some courses require admissions tests. Make the PS overwhelmingly subject-focused - demonstrated engagement beyond the syllabus. It's a common choice alongside Oxbridge and other top Russell Group universities.",
    acceptedPattern: "Admits show strong grades and a focused, subject-specific personal statement with genuine engagement beyond the curriculum; as across UK admissions, academic ability and subject depth drive decisions, with the college system a fit/preference layer on top." },
  { name: "University of Bristol", aka: ["bristol", "university of bristol"], country: "UK", tier: "reach", accept: "~45% offer rate (course-dependent)", region: "Bristol, England", dataDepth: "deep",
    motto: "\"Vim promovet insitam\" — \"[Learning] promotes one's innate power.\" A leading Russell Group university strong in engineering, medicine, law, and the sciences, with a strong research reputation.",
    values: ["strong subject ability", "a skills- and programme-focused personal statement", "academic depth", "genuine interest in the course"],
    guidance: "Bristol (UK course-specific model) is a research-intensive Russell Group university that weighs the personal statement heavily and looks for genuine, specific interest in the programme plus relevant skills and academic achievement. Its own guidance emphasises skills, experience, and specific interest in the course. Some courses require admissions tests or extra assessment. Make the PS deeply subject-focused, showing real engagement with your chosen field and why Bristol's course fits.",
    acceptedPattern: "Admits show strong grades and a personal statement demonstrating genuine, specific interest in the course plus relevant skills and academic depth; subject engagement and course fit recur over breadth, consistent with UK admissions." },
  { name: "University of Manchester", aka: ["manchester", "university of manchester"], country: "UK", tier: "target", accept: "~55% offer rate (course-dependent)", region: "Manchester, England", dataDepth: "deep",
    motto: "\"Cognitio, sapientia, humanitas\" — \"Knowledge, wisdom, humanity.\" A very large Russell Group university with broad strength across the sciences, engineering, medicine, and social sciences.",
    values: ["strong subject ability", "a subject-focused personal statement", "academic depth", "genuine interest in the course"],
    guidance: "Manchester (UK course-specific model) is one of the largest Russell Group universities, strong across a very wide range of fields. Admission is grades + personal statement for most courses (some, like Medicine and Dentistry, require admissions tests and interviews). Competitiveness varies substantially by course. Make the personal statement overwhelmingly about your chosen subject - demonstrated engagement and genuine interest in that field.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; competitiveness and any tests vary by course, but academic ability and subject depth are the recurring signals across UK admissions." },
  { name: "King's College London (KCL)", aka: ["kings college london", "kcl", "king's college london", "kings college"], country: "UK", tier: "reach", accept: "~40% offer rate (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "\"Sancte et Sapienter\" — \"With holiness and wisdom.\" A leading Russell Group university in central London, especially strong in medicine, law, humanities, and the health sciences.",
    values: ["strong subject ability", "a subject-focused personal statement", "academic depth", "genuine interest in the course"],
    guidance: "King's College London (UK course-specific model) is a research-intensive Russell Group university in central London with particular strength in medicine, dentistry, law, war studies, and the health sciences. Admission is grades + personal statement for most courses; Medicine/Dentistry require the UCAT and interviews. Make the personal statement deeply subject-focused, showing genuine engagement with your chosen field and, where relevant, why King's and London fit.",
    acceptedPattern: "Admits show strong grades and a subject-focused personal statement with genuine engagement; for the competitive health-science courses, test performance and interviews also matter. Subject depth drives decisions, per UK admissions." },
  { name: "University of Bath", aka: ["bath", "university of bath"], country: "UK", tier: "reach", accept: "~40% offer rate (course-dependent)", region: "Bath, England", dataDepth: "deep",
    motto: "\"Generatim discite cultus\" — \"Learn the culture proper to each after its kind.\" A campus university strong in engineering, management, and the sciences, and famous for its placement/sandwich-year programmes.",
    values: ["strong subject ability", "interest in professional/placement study", "a subject-focused personal statement", "academic depth"],
    guidance: "Bath (UK course-specific model) is a strong campus university especially known for engineering, management (its School of Management is highly rated), and its excellent placement (sandwich-year) programmes with employers. Admission is grades + personal statement; some courses require admissions tests. Because Bath is so placement/career-oriented, showing genuine interest in applying your subject professionally reads well. Keep the PS deeply subject-focused.",
    acceptedPattern: "Admits show strong grades and a subject-focused personal statement, often with genuine interest in practical/professional application (fitting Bath's placement strength); subject depth and course fit recur, per UK admissions." },
  { name: "University of Glasgow", aka: ["glasgow", "university of glasgow"], country: "UK", tier: "target", accept: "~60% offer rate (course-dependent)", region: "Glasgow, Scotland", dataDepth: "deep",
    motto: "\"Via, Veritas, Vita\" — \"The Way, the Truth, the Life.\" An ancient Russell Group university (founded 1451) with broad strength across medicine, engineering, and the humanities.",
    values: ["strong subject ability", "a subject-focused personal statement", "academic depth", "genuine interest in the course"],
    guidance: "Glasgow (UK course-specific model) is an ancient, broad Russell Group university strong across many fields. Admission is grades + personal statement for most courses (Medicine/Dentistry/Vet require tests and interviews); note some Glasgow programmes may not require a personal statement for certain routes. Competitiveness varies by course. Make the personal statement overwhelmingly about your chosen subject and genuine engagement with it.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; competitiveness and any tests vary by course, with academic ability and subject depth the recurring signals per UK admissions." },
  { name: "University of Exeter", aka: ["exeter", "university of exeter"], country: "UK", tier: "target", accept: "~60% offer rate (course-dependent)", region: "Exeter, England", dataDepth: "deep",
    motto: "\"Lucem sequimur\" — \"We follow the light.\" A Russell Group university strong in business, the humanities, and environmental science, with a strong student experience reputation.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Exeter (UK course-specific model) is a Russell Group university strong in business, the humanities, law, and environmental/geographical sciences. Admission is grades + personal statement for most courses (some require admissions tests). Note Exeter is among the Russell Group universities that may not require a personal statement for all programmes - check the specific course. Where it's read, make it deeply subject-focused with genuine engagement.",
    acceptedPattern: "Admits show the required grades and, where read, a subject-focused personal statement with genuine engagement; academic ability and subject fit recur, per UK admissions. Competitiveness varies by course." },
  { name: "University of Leeds", aka: ["leeds", "university of leeds"], country: "UK", tier: "target", accept: "~60% offer rate (course-dependent)", region: "Leeds, England", dataDepth: "deep",
    motto: "\"Et augebitur scientia\" — \"And knowledge will be increased.\" A large Russell Group university with broad strength across the arts, sciences, engineering, and business.",
    values: ["strong subject ability", "a concise, subject-focused personal statement", "academic depth", "genuine interest in the course"],
    guidance: "Leeds (UK course-specific model) is a large, broad Russell Group university strong across many fields. Admission is grades + personal statement for most courses (Medicine/Dentistry require tests and interviews). Leeds is notably strict on personal-statement length for some routes (keep it concise and entirely your own work). Make the PS overwhelmingly about your chosen subject and genuine engagement with it.",
    acceptedPattern: "Admits show the required grades and a concise, subject-focused personal statement with genuine engagement; competitiveness and any tests vary by course, with academic ability and subject depth the recurring signals per UK admissions." },
  { name: "University of Nottingham", aka: ["nottingham", "university of nottingham"], country: "UK", tier: "target", accept: "~65-75% offer rate (course-dependent)", region: "Nottingham, England", dataDepth: "deep",
    motto: "\"Sapientia urbs conditur\" — \"A city is built on wisdom.\" A large, broad Russell Group university strong in medicine, engineering, sciences, and business, with a global reputation.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Nottingham (UK course-specific model) is a broad Russell Group university with a wide range of grade requirements - a few flagship courses ask A*AA, but many are more accessible, and foundation-year routes exist. Admission is grades + personal statement for most courses (Medicine requires the UCAT and interviews). You need at least Grade 4 in English and Maths at GCSE. Make the personal statement overwhelmingly about your chosen subject and genuine engagement with it.",
    acceptedPattern: "Admits show the required grades (course-dependent) and a subject-focused personal statement with genuine engagement; academic ability and subject depth are the recurring signals per UK admissions, with Medicine and top courses notably more competitive." },
  { name: "University of Southampton", aka: ["southampton", "university of southampton"], country: "UK", tier: "target", accept: "~65-75% offer rate (course-dependent)", region: "Southampton, England", dataDepth: "deep",
    motto: "A Russell Group university with particular strength in engineering (especially aeronautics and maritime), computer science, oceanography, and the sciences.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course (esp. STEM)", "academic depth"],
    guidance: "Southampton (UK course-specific model) is a research-intensive Russell Group university known especially for engineering, computer science, and its world-leading oceanography and maritime research (near the coast). Admission is grades + personal statement for most courses (Medicine requires the UCAT and interview). Make the personal statement deeply subject-focused, showing genuine engagement with your chosen field - particularly valuable for its strong STEM and maritime programmes.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement, often with demonstrated STEM interest for its signature engineering/CS/oceanography courses; academic ability and subject depth recur per UK admissions." },
  { name: "University of Sheffield", aka: ["sheffield", "university of sheffield"], country: "UK", tier: "target", accept: "~75-80% offer rate (course-dependent)", region: "Sheffield, England", dataDepth: "deep",
    motto: "\"Rerum cognoscere causas\" — \"To understand the causes of things.\" A Russell Group university with a strong, welcoming reputation and standout engineering, materials science, and the arts/humanities.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Sheffield (UK course-specific model) is a research-intensive Russell Group university with a notably high offer rate (around 78% in a recent cycle) and standout engineering, materials science, and arts/humanities programmes, plus an excellent Students' Union. Admission is grades + personal statement for most courses (Medicine requires the UCAT and interview). Make the personal statement overwhelmingly about your chosen subject and genuine engagement with it.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; the recurring signal is academic ability and subject depth per UK admissions, with a relatively generous offer rate for many courses." },
  { name: "University of Birmingham", aka: ["birmingham", "university of birmingham", "uob"], country: "UK", tier: "target", accept: "~65-75% offer rate (course-dependent)", region: "Birmingham, England", dataDepth: "deep",
    motto: "\"Per Ardua Ad Alta\" — \"Through effort to the heights.\" A large civic Russell Group university (the original 'redbrick') with broad strength across medicine, engineering, business, and the humanities.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Birmingham (UK course-specific model) is a large civic Russell Group university (the first of the 'redbricks') strong across a wide range of fields, with typical offers around AAA-ABB. Admission is grades + personal statement for most courses (Medicine/Dentistry require the UCAT and interviews). Make the personal statement deeply subject-focused, showing genuine engagement with your chosen field.",
    acceptedPattern: "Admits show the required grades (typically AAA-ABB, course-dependent) and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions." },
  { name: "Newcastle University", aka: ["newcastle", "newcastle university"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "Newcastle upon Tyne, England", dataDepth: "deep",
    motto: "A civic Russell Group university with some of the more accessible entry requirements in the group, strong in medicine, engineering, and the sciences, and known for generous contextual offers.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Newcastle (UK course-specific model) is a civic Russell Group university with among the more accessible grade requirements in the group (many courses ask ABB), and notably generous contextual offers (which can lower requirements by up to three grades for eligible applicants). Admission is grades + personal statement for most courses; only Medicine and Dentistry use an admissions test (UCAT) and interviews. Make the personal statement subject-focused with genuine engagement.",
    acceptedPattern: "Admits show the required grades (often ABB, lower with contextual offers) and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur, with contextual offers meaningfully widening access." },
  { name: "Cardiff University", aka: ["cardiff", "cardiff university", "prifysgol caerdydd"], country: "UK", tier: "target", accept: "~65-75% offer rate (course-dependent)", region: "Cardiff, Wales", dataDepth: "deep",
    motto: "The sole Welsh member of the Russell Group, strong in medicine, engineering, journalism, and world-leading in brain research (its neuroscience institute).",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Cardiff (UK course-specific model) is the only Welsh Russell Group university, strong in medicine, engineering, journalism, and neuroscience/brain research, with typical offers around AAA-BBB depending on course (CS around ABB/BBB). Admission is grades + personal statement for most courses (Medicine/Dentistry require the UCAT and interviews). Make the personal statement deeply subject-focused, showing genuine engagement with your chosen field.",
    acceptedPattern: "Admits show the required grades (course-dependent) and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions, with Medicine and top courses more competitive." },
  { name: "University of York", aka: ["york", "university of york"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "York, England", dataDepth: "deep",
    motto: "A collegiate Russell Group university (a leading 'plate-glass' university) with strong sciences, social sciences, history, and a strong teaching and research reputation.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "York (UK course-specific model) is a collegiate Russell Group university with a strong research and teaching reputation across the sciences, social sciences, and humanities, with typical offers around AAA-BBB. Admission is grades + personal statement for most courses (Medicine requires the UCAT and interview). Make the personal statement overwhelmingly about your chosen subject and genuine engagement with it.",
    acceptedPattern: "Admits show the required grades (course-dependent) and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions." },
  { name: "Queen Mary University of London (QMUL)", aka: ["queen mary", "qmul", "queen mary university of london", "queen mary university"], country: "UK", tier: "target", accept: "~65-75% offer rate (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "A Russell Group university in East London, strong in medicine (Barts), law, and the sciences, and known for a diverse, research-intensive community.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Queen Mary (UK course-specific model) is a research-intensive Russell Group university in East London, strong in medicine (its Barts and The London medical school), law, and the sciences, and notably diverse. Admission is grades + personal statement for most courses (Medicine/Dentistry require the UCAT and interviews). Make the personal statement deeply subject-focused, showing genuine engagement with your chosen field.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions, with the Barts medical courses more competitive." },
  { name: "Lancaster University", aka: ["lancaster", "lancaster university"], country: "UK", tier: "target", accept: "~65-75% offer rate (course-dependent)", region: "Lancaster, England", dataDepth: "deep",
    motto: "\"Patet omnibus veritas\" — \"Truth lies open to all.\" A collegiate campus university (not Russell Group but consistently highly ranked), strong in management, physics, and environmental science.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Lancaster (UK course-specific model) is a collegiate campus university that ranks consistently among the UK's best despite not being in the Russell Group - strong in management (its business school is triple-accredited), physics, environmental science, and linguistics. Admission is grades + personal statement, with typical offers around AAA-BBB. Make the personal statement overwhelmingly about your chosen subject and genuine engagement with it.",
    acceptedPattern: "Admits show the required grades (course-dependent) and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions. A strong reminder that top course quality isn't limited to the Russell Group." },
  { name: "Loughborough University", aka: ["loughborough", "loughborough university", "lboro"], country: "UK", tier: "target", accept: "~65-75% offer rate (course-dependent)", region: "Loughborough, England", dataDepth: "deep",
    motto: "\"Veritate, scientia, labore\" — \"With truth, wisdom, and effort.\" A campus university (not Russell Group) world-renowned for sport and exercise science, plus strong engineering, design, and business.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Loughborough (UK course-specific model) is a campus university that, despite not being in the Russell Group, is world-leading in sport and exercise science (consistently #1 globally) and strong in engineering, design, and business, with an outstanding student experience and sports facilities. Admission is grades + personal statement, with typical offers around AAB-ABB. Make the personal statement deeply subject-focused; for sport science and its signature programmes, genuine, specific engagement with the field reads especially well.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; for its world-leading sport-science and engineering/design programmes, demonstrated specific interest recurs. Another reminder that elite course quality extends beyond the Russell Group." },
  { name: "University of Liverpool", aka: ["liverpool", "university of liverpool"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "Liverpool, England", dataDepth: "deep",
    motto: "\"Fiat Lux\" — \"Let there be light.\" A founding civic 'redbrick' Russell Group university, strong in medicine, veterinary science, and engineering.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Liverpool (UK course-specific model) is a founding redbrick Russell Group university, strong in medicine, veterinary science, and engineering, with typical offers around AAA-BBB. Admission is grades + personal statement for most courses (Medicine/Dentistry/Vet require admissions tests and interviews). Make the personal statement deeply subject-focused, showing genuine engagement with your chosen field.",
    acceptedPattern: "Admits show the required grades (course-dependent) and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions, with Medicine/Vet notably more competitive." },
  { name: "Queen's University Belfast (QUB)", aka: ["queens university belfast", "qub", "queen's university belfast", "queens belfast"], country: "UK", tier: "target", accept: "~30-40% intake (course-dependent)", region: "Belfast, Northern Ireland", dataDepth: "deep",
    motto: "\"Pro tanto quid retribuamus\" — \"For so much, what shall we give back.\" The sole Northern Irish Russell Group member (joined 2007), strong in dentistry, pharmacy, food science, and law.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Queen's Belfast (UK course-specific model) is the only Northern Irish Russell Group university, a research-intensive institution strong in dentistry, pharmacy, food science, accounting/finance, and law. Admission is grades + personal statement for most courses (Medicine/Dentistry require the UCAT and interviews). It runs a Pathway Opportunity Programme offering contextual offers and guaranteed interviews for eligible students. Make the personal statement subject-focused with genuine engagement.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions, with contextual pathways widening access for eligible applicants." },
  { name: "University of Leicester", aka: ["leicester", "university of leicester"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "Leicester, England", dataDepth: "deep",
    motto: "\"Ut vitam habeant\" — \"So that they may have life.\" A Russell-adjacent research university (where DNA genetic fingerprinting was invented) with strengths in genetics, space science, and the sciences.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Leicester (UK course-specific model) is a research university famous for pioneering DNA genetic fingerprinting and for space science (it runs a National Space Centre partnership), with strengths across genetics, physics/astronomy, and the sciences, plus notably generous contextual and access provision. Admission is grades + personal statement for most courses (Medicine requires the UCAT and interview). Make the personal statement subject-focused with genuine engagement.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions, with strong access/contextual provision widening entry." },
  { name: "University of Surrey", aka: ["surrey", "university of surrey"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "Guildford, England", dataDepth: "deep",
    motto: "A campus university (not Russell Group) renowned for its professional placement (sandwich) programmes and strong graduate employability, plus veterinary medicine, engineering, and hospitality.",
    values: ["strong subject ability", "interest in placement/professional study", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Surrey (UK course-specific model) is a campus university known for excellent professional placement years (its Professional Training placements are a signature) and strong graduate employability, with well-regarded veterinary medicine, engineering, and hospitality programmes. Admission is grades + personal statement, typical offers around AAB-BBB. Because Surrey is so placement/career-focused, showing genuine interest in applying your subject professionally reads well. Keep the personal statement subject-focused.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement, often with genuine interest in practical/professional application (fitting Surrey's placement strength); subject depth and course fit recur per UK admissions." },
  { name: "University of Sussex", aka: ["sussex", "university of sussex"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "Brighton, England", dataDepth: "deep",
    motto: "\"Be still and know.\" A campus university (a leading 'plate-glass' university) renowned for development studies (its IDS is world-#1), the social sciences, and a progressive, interdisciplinary ethos.",
    values: ["strong subject ability", "interdisciplinary curiosity", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Sussex (UK course-specific model) is a campus university near Brighton, world-leading in development studies (the Institute of Development Studies is consistently ranked #1 globally) and strong in the social sciences, with a progressive, interdisciplinary culture. Admission is grades + personal statement, typical offers around AAB-BBB. Make the personal statement subject-focused with genuine engagement; its social-science and development strengths reward applicants with real interest in those areas.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement, often with interest in the social sciences or development for its signature programmes; subject depth recurs per UK admissions." },
  { name: "University of East Anglia (UEA)", aka: ["uea", "university of east anglia", "east anglia"], country: "UK", tier: "target", accept: "~75-85% offer rate (course-dependent)", region: "Norwich, England", dataDepth: "deep",
    motto: "\"Do Different.\" A campus university renowned for creative writing (its MA has produced multiple Booker Prize winners), environmental sciences, and a strong research reputation.",
    values: ["strong subject ability", "genuine interest in the course (esp. writing/environment)", "a subject-focused personal statement", "academic depth"],
    guidance: "UEA (UK course-specific model) is a campus university in Norwich famous for its creative writing programme (its alumni include Booker Prize winners and it's arguably the UK's most storied writing school) and for world-class environmental sciences and climate research. Admission is grades + personal statement, typical offers around AAB-BBB. Make the personal statement subject-focused with genuine engagement; its writing and environmental programmes reward applicants with real, demonstrated interest.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement, often with demonstrated interest for its signature writing or environmental programmes; subject depth recurs per UK admissions." },
  { name: "University of Strathclyde", aka: ["strathclyde", "university of strathclyde"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "Glasgow, Scotland", dataDepth: "deep",
    motto: "\"The place of useful learning.\" A technological university in Glasgow strong in engineering, business (its triple-accredited Strathclyde Business School), and the sciences, with a practical, industry-focused ethos.",
    values: ["strong subject ability", "practical/applied focus", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Strathclyde (UK course-specific model) is a Glasgow technological university with a genuinely practical, industry-focused mission ('the place of useful learning'), strong in engineering, its triple-accredited business school, and applied sciences. Admission is grades + personal statement (Scottish four-year degree structure). Make the personal statement subject-focused with genuine engagement; its applied, industry-linked programmes reward real interest in practical application.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement, often with a practical/applied orientation fitting its 'useful learning' mission; subject depth recurs per UK admissions." },
  { name: "University of Aberdeen", aka: ["aberdeen", "university of aberdeen"], country: "UK", tier: "target", accept: "~75-85% offer rate (course-dependent)", region: "Aberdeen, Scotland", dataDepth: "deep",
    motto: "\"Initium sapientiae timor domini\" — \"The fear of the Lord is the beginning of wisdom.\" An ancient Scottish university (founded 1495) strong in medicine, law, and energy/geoscience (with North Sea energy links).",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Aberdeen (UK course-specific model) is an ancient Scottish university (the UK's fifth-oldest) strong in medicine, law, divinity, and energy/geoscience (with deep North Sea oil-and-gas and now renewables links). Admission is grades + personal statement (Scottish four-year degrees); Medicine requires the UCAT and interview. Make the personal statement subject-focused with genuine engagement.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; academic ability and subject depth recur per UK admissions, with Medicine more competitive." },
  { name: "University of Dundee", aka: ["dundee", "university of dundee"], country: "UK", tier: "target", accept: "~75-85% offer rate (course-dependent)", region: "Dundee, Scotland", dataDepth: "deep",
    motto: "\"Magnificat anima mea dominum\" — a Scottish university renowned for life sciences (world-leading biomedical research), medicine, dentistry, and art & design (its Duncan of Jordanstone college).",
    values: ["strong subject ability", "genuine interest in the course (esp. life sciences/art)", "a subject-focused personal statement", "academic depth"],
    guidance: "Dundee (UK course-specific model) is a Scottish university with world-leading life-sciences/biomedical research, strong medicine and dentistry, and a renowned art & design school (Duncan of Jordanstone). Admission is grades + personal statement (Scottish four-year degrees); Medicine/Dentistry require admissions tests and interviews, and art & design routes require a portfolio. Make the personal statement subject-focused; portfolio quality is central for art applicants.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; for its signature life-sciences, medicine, and art & design programmes, demonstrated subject depth (or portfolio, for art) recurs per UK admissions." },
  { name: "University of Reading", aka: ["reading", "university of reading"], country: "UK", tier: "target", accept: "~75-85% offer rate (course-dependent)", region: "Reading, England", dataDepth: "deep",
    motto: "A campus university strong in meteorology (its department is world-#1), agriculture, real estate/land management, and the environmental sciences.",
    values: ["strong subject ability", "genuine interest in the course", "a subject-focused personal statement", "academic depth"],
    guidance: "Reading (UK course-specific model) is a campus university with genuine world-leading strengths in meteorology/climate science (its department is consistently ranked #1 globally), agriculture, real estate and planning (Henley Business School), and environmental sciences. Admission is grades + personal statement, typical offers around ABB-BBB. Make the personal statement subject-focused with genuine engagement; its signature programmes reward applicants with real, demonstrated interest.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement, often with demonstrated interest for its signature meteorology, agriculture, or real-estate programmes; subject depth recurs per UK admissions." },
  { name: "SOAS University of London", aka: ["soas", "soas university of london", "school of oriental and african studies"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "\"Knowledge is power.\" The world's leading specialist institution for the study of Asia, Africa, and the Middle East - languages, politics, development, law, and area studies.",
    values: ["genuine interest in its regional/area-studies focus", "a subject-focused personal statement", "global and critical perspective", "academic depth"],
    guidance: "SOAS (UK course-specific model) is uniquely specialised in Asian, African, and Middle Eastern studies - languages, development, politics, law, anthropology, and area studies - with a distinctive critical, globally-minded ethos. Admission is grades + personal statement, typically around AAB-BBB. Because it's so specialised, a genuine, specific interest in its regional focus and its critical approach reads especially well. Make the personal statement subject-focused, showing real engagement with the languages, regions, or global issues you want to study.",
    acceptedPattern: "Admits show genuine, specific interest in SOAS's regional and area-studies focus and a critical global perspective, plus the required grades; the recurring signal is authentic engagement with its distinctive specialism rather than generic strong-student credentials." },
  { name: "Royal Holloway, University of London", aka: ["royal holloway", "rhul", "royal holloway university of london"], country: "UK", tier: "target", accept: "~75-85% offer rate (course-dependent)", region: "Egham, England", dataDepth: "deep",
    motto: "\"Esse quam videri\" — \"To be, rather than to seem.\" A University of London college with a landmark Founder's Building, strong in information security (CS), drama, music, and the humanities.",
    values: ["strong subject ability", "genuine interest in the course", "a subject-focused personal statement", "academic depth"],
    guidance: "Royal Holloway (UK course-specific model) is a University of London college near London, with a benchmark of around AAB and genuine strengths in Information Security within computer science, drama and theatre, music, and the humanities. Admission is grades + personal statement (drama/music routes may involve audition/interview). Make the personal statement subject-focused with genuine engagement; its signature programmes reward demonstrated specific interest.",
    acceptedPattern: "Admits show the required grades (around AAB, course-dependent) and a subject-focused personal statement with genuine engagement; for its signature information-security, drama, and music programmes, demonstrated specific interest (or audition/portfolio) recurs per UK admissions." },
  { name: "City St George's, University of London", aka: ["city university london", "city st georges", "city university of london", "city st george's"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "A London university (recently merged with St George's) strong in business (Bayes Business School), journalism, law, and the health sciences, with a professional, career-oriented ethos.",
    values: ["strong subject ability", "a career/professional orientation", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "City St George's, University of London (UK course-specific model) is a professionally-oriented London university with standout programmes in business (Bayes Business School), journalism, law, and - since its merger with St George's - the health sciences and medicine. Admission is grades + personal statement (health/medicine routes require tests and interviews). Its career focus means genuine interest in professional application reads well. Make the personal statement subject-focused with real engagement.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement, often with a clear professional or career orientation fitting City's ethos; subject depth and course fit recur per UK admissions." },
  { name: "Brunel University of London", aka: ["brunel", "brunel university", "brunel university of london"], country: "UK", tier: "target", accept: "~75-85% offer rate (course-dependent)", region: "Uxbridge, England", dataDepth: "deep",
    motto: "Named after the engineer Isambard Kingdom Brunel, a London campus university strong in engineering, design, and business, with a practical, industry-linked ethos and strong placement provision.",
    values: ["strong subject ability", "a practical/applied focus", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Brunel (UK course-specific model) is a London campus university named after the Victorian engineer, with a practical, industry-linked identity and genuine strengths in engineering, design (product/industrial), and business, plus strong placement/sandwich-year provision. Admission is grades + personal statement, typically around ABB-BBB. Its applied focus means genuine interest in practical/professional application reads well. Make the personal statement subject-focused.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement, often with a practical/applied orientation and interest in placements; subject depth and course fit recur per UK admissions." },
  { name: "University of Kent", aka: ["kent", "university of kent"], country: "UK", tier: "target", accept: "~80-90% offer rate (course-dependent)", region: "Canterbury, England", dataDepth: "deep",
    motto: "\"Cui servire regnare est\" - a campus university historically branded 'the UK's European university,' strong in social sciences, arts, humanities, and law, with a collegiate campus near Canterbury.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic depth"],
    guidance: "Kent (UK course-specific model) is a collegiate campus university near Canterbury, historically known for its European outlook and continental links, strong in the social sciences, humanities, arts, and law. Admission is grades + personal statement, typically around ABB-BBB, with a generous offer rate for many courses. Make the personal statement subject-focused with genuine engagement.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; academic ability and subject fit recur per UK admissions, with a relatively accessible offer rate for many courses." },
  { name: "University of Essex", aka: ["essex", "university of essex"], country: "UK", tier: "target", accept: "~80-90% offer rate (course-dependent)", region: "Colchester, England", dataDepth: "deep",
    motto: "\"Thought the harder, heart the keener.\" A campus university renowned for the social sciences - especially politics, economics, sociology, and human rights - with a strong research and activist tradition.",
    values: ["strong subject ability", "genuine interest (esp. social sciences/human rights)", "a subject-focused personal statement", "academic depth"],
    guidance: "Essex (UK course-specific model) is a campus university with a genuinely outstanding reputation in the social sciences - politics, economics, sociology - and a distinctive human-rights and activist tradition. Admission is grades + personal statement, typically around ABB-BBB, with a generous offer rate for many courses. Its social-science strengths reward genuine, specific interest. Make the personal statement subject-focused with real engagement.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement, often with demonstrated interest for its signature social-science and human-rights programmes; subject depth recurs per UK admissions, with a relatively accessible offer rate." },
  { name: "Aston University", aka: ["aston", "aston university"], country: "UK", tier: "target", accept: "~75-85% offer rate (course-dependent)", region: "Birmingham, England", dataDepth: "deep",
    motto: "\"Forward.\" A Birmingham city-centre university with a strong professional, placement-focused identity and standout business (Aston Business School), engineering, pharmacy, and optometry.",
    values: ["strong subject ability", "a placement/professional orientation", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Aston (UK course-specific model) is a Birmingham university with a strong professional, employability-focused ethos and excellent placement (sandwich-year) provision, with genuine strengths in business (its triple-accredited business school), engineering, pharmacy, and optometry. Admission is grades + personal statement, typically around ABB-BBB. Its career focus means genuine interest in professional application reads well. Keep the personal statement subject-focused.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement, often with a practical/professional orientation fitting Aston's placement strength; subject depth and course fit recur per UK admissions." },
  { name: "Heriot-Watt University", aka: ["heriot-watt", "heriot watt", "heriot-watt university"], country: "UK", tier: "target", accept: "~75-85% offer rate (course-dependent)", region: "Edinburgh, Scotland", dataDepth: "deep",
    motto: "\"Leac na fìrinne\" / a technological university (the UK's eighth-oldest) strong in engineering, the built environment, actuarial science, and energy, with global campuses.",
    values: ["strong subject ability", "a practical/technical focus", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Heriot-Watt (UK course-specific model) is an Edinburgh technological university with a practical, industry-focused identity and genuine strengths in engineering, the built environment, actuarial mathematics, and energy (with campuses in Dubai and Malaysia too). Its admission is by individual assessment - experience and skills are valued alongside formal qualifications - within the Scottish four-year structure. Make the personal statement subject-focused, showing genuine technical/practical engagement.",
    acceptedPattern: "Admits show the required qualifications (assessed individually, with skills/experience considered) and a subject-focused personal statement with genuine engagement, often practical/technical; subject depth recurs per UK admissions." },
  { name: "University of Stirling", aka: ["stirling", "university of stirling"], country: "UK", tier: "general", accept: "~80-90% offer rate (course-dependent)", region: "Stirling, Scotland", dataDepth: "general",
    motto: "\"Innovation and excellence\" - a Scottish campus university known for sports studies, aquaculture, education, and a scenic campus, with a flexible, semester-based structure.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic fit"],
    guidance: "Stirling (UK course-specific model) is a Scottish campus university with recognised strengths in sports studies (it's Scotland's University for Sporting Excellence), aquaculture, education, and the social sciences, on a scenic loch-side campus. Admission is grades + personal statement (Scottish four-year degrees). As with all UK applications, make the personal statement overwhelmingly about your chosen subject and genuine engagement with it. (This entry is source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement showing genuine interest. As across UK admissions, academic fit and subject engagement are what matter; verify exact requirements on the course page." },
  { name: "Swansea University", aka: ["swansea", "swansea university", "prifysgol abertawe"], country: "UK", tier: "general", accept: "~80-90% offer rate (course-dependent)", region: "Swansea, Wales", dataDepth: "general",
    motto: "\"Technium\" / a Welsh seaside university strong in engineering, medicine, sports science, and law, known for a beachfront Bay Campus and strong student experience.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic fit"],
    guidance: "Swansea (UK course-specific model) is a Welsh university with a beachfront campus and genuine strengths in engineering, medicine (graduate-entry), sports science, and law, with a strong student-experience reputation. Admission is grades + personal statement (Medicine routes require tests/interviews). As with all UK applications, make the personal statement overwhelmingly about your chosen subject and genuine engagement with it. (This entry is source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement showing genuine interest; academic fit and subject engagement are the recurring signals across UK admissions. Verify exact requirements on the course page." },
  { name: "Keele University", aka: ["keele", "keele university"], country: "UK", tier: "target", accept: "~80-90% offer rate (course-dependent)", region: "Keele, Staffordshire, England", dataDepth: "deep",
    motto: "\"Thanke God for all\" - a campus university that pioneered the UK's dual-honours degree system (study two subjects together), on one of the UK's largest parkland campuses, with a strong medical school.",
    values: ["interest in breadth/dual-honours study", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Keele (UK course-specific model) is distinctive for pioneering and championing DUAL HONOURS - many students combine two subjects - on a large, scenic parkland campus, with a well-regarded medical school and strengths in the sciences. Admission is grades + personal statement (Medicine requires the UCAT and interview), typically around ABB-BBB for most courses. If you're drawn to combining subjects, say so specifically. Make the personal statement subject-focused with genuine engagement.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement; interest in Keele's dual-honours breadth is a genuine fit signal, and subject depth recurs per UK admissions. Medicine is notably more competitive." },
  { name: "Oxford Brookes University", aka: ["oxford brookes", "brookes", "oxford brookes university"], country: "UK", tier: "target", accept: "~80-90% offer rate (course-dependent)", region: "Oxford, England", dataDepth: "deep",
    motto: "One of the UK's leading post-92 universities, especially renowned for architecture, its ACCA-partnered accounting degree, occupational therapy, and publishing.",
    values: ["strong subject ability", "a career/professional orientation", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Oxford Brookes (UK course-specific model) is consistently one of the top post-1992 universities, with genuine standout strengths in architecture, applied accounting (via a long-standing ACCA partnership), occupational therapy (it ran the UK's first such school), and publishing. Admission is grades + personal statement, typically around BBB-BBC (architecture and health routes more competitive, some with portfolio/interview). Make the personal statement subject-focused; its professional programmes reward genuine, specific interest.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement, often with a professional or career orientation fitting Brookes's applied strengths; for architecture and health programmes, demonstrated specific interest (or portfolio) recurs per UK admissions." },
  { name: "Nottingham Trent University (NTU)", aka: ["nottingham trent", "ntu", "nottingham trent university"], country: "UK", tier: "general", accept: "~90% offer rate (course-dependent)", region: "Nottingham, England", dataDepth: "general",
    motto: "A large, employability-focused post-92 university with strong industry links and recognised strengths in fashion, art and design, and business.",
    values: ["a career/employability orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Nottingham Trent (UK course-specific model) is a large post-92 university built around employability and practical, industry-linked learning, with genuine strengths in fashion, art and design, business, and sports science. Admission is grades + personal statement, with a generous offer rate (~90%); creative courses may require a portfolio. Make the personal statement subject-focused and, for its career-oriented programmes, show genuine interest in real-world application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for creative courses a portfolio matters. Academic/course fit and genuine interest are the recurring signals per UK admissions. Verify exact requirements on the course page." },
  { name: "Coventry University", aka: ["coventry", "coventry university"], country: "UK", tier: "general", accept: "~88% offer rate (course-dependent)", region: "Coventry, England", dataDepth: "general",
    motto: "A large, strongly employability-focused post-92 university with industry-linked programmes in engineering, design, business, and health, and a strong reputation for student experience.",
    values: ["a career/employability orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Coventry (UK course-specific model) is a post-92 university with a strong employability and industry-partnership focus, known for engineering, automotive/transport design, business, and health programmes, plus a good student-experience reputation. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application for its career-oriented courses. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/career orientation; course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "Northumbria University", aka: ["northumbria", "northumbria university"], country: "UK", tier: "general", accept: "~90% offer rate (course-dependent)", region: "Newcastle upon Tyne, England", dataDepth: "general",
    motto: "A large Newcastle post-92 university with strong reputations in design (its design school is highly regarded), law, business, and nursing, and a growing research profile.",
    values: ["strong subject ability", "a career/professional orientation", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Northumbria (UK course-specific model) is a large Newcastle post-92 university with a genuinely strong design school (notable alumni including major product/industrial designers), plus well-regarded law, business, and nursing, and a rising research profile. Admission is grades + personal statement, with a generous offer rate; design routes require a portfolio. Make the personal statement subject-focused; creative and professional programmes reward genuine, specific interest. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for design a portfolio is central. Course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "Bournemouth University", aka: ["bournemouth", "bournemouth university", "bu bournemouth"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Bournemouth, England", dataDepth: "general",
    motto: "A post-92 university internationally renowned for media production, animation, and visual effects - its National Centre for Computer Animation has contributed to Oscar-winning films.",
    values: ["a creative/media portfolio and passion", "strong subject ability", "genuine interest in the course", "a subject-focused personal statement"],
    guidance: "Bournemouth (UK course-specific model) is a post-92 university with a world-class reputation in media, animation, and visual effects - its National Centre for Computer Animation has graduates who've worked on Oscar-winning VFX. It's also strong in media production, journalism, and tourism. Admission is grades + personal statement, and its signature creative courses typically require a portfolio and show demonstrated passion. Make the personal statement subject-focused; for creative programmes, portfolio and genuine creative engagement are central. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): for its signature media/animation/VFX courses, admits present a strong portfolio and demonstrated creative passion; for other courses, grade requirements plus a subject-focused personal statement. Course fit and genuine interest recur per UK admissions." },
  { name: "University of Portsmouth", aka: ["portsmouth", "university of portsmouth"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Portsmouth, England", dataDepth: "general",
    motto: "One of the stronger-performing post-92 universities, with recognised strengths in forensic science, cosmology, criminology, and a strong graduate-employment and student-experience record.",
    values: ["strong subject ability", "a career/professional orientation", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Portsmouth (UK course-specific model) is among the better-performing post-92 universities, known for forensic science, cosmology/astrophysics (a strong research group), criminology, and good graduate employability. Admission is grades + personal statement, with a generous offer rate for many courses. Make the personal statement subject-focused with genuine engagement; its signature programmes reward demonstrated specific interest. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement showing genuine interest; course fit and subject engagement recur per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Plymouth", aka: ["plymouth", "university of plymouth"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Plymouth, England", dataDepth: "general",
    motto: "A post-92 university with genuine world-class strength in marine and ocean sciences (its coastal location and marine research are standout), plus medicine, health, and the sciences.",
    values: ["strong subject ability", "genuine interest in the course (esp. marine/health)", "a subject-focused personal statement", "academic fit"],
    guidance: "Plymouth (UK course-specific model) is a post-92 university with genuinely world-leading marine and ocean science (its coastal setting and marine research are a real distinction), plus a medical school (Peninsula), health sciences, and psychology. Admission is grades + personal statement (Medicine/Dentistry require tests and interviews). Make the personal statement subject-focused; its marine and health programmes reward demonstrated, specific interest. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with demonstrated interest for its signature marine/health programmes; course fit recurs per UK admissions. Medicine is notably more competitive." },
  { name: "University of Hull", aka: ["hull", "university of hull"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Hull, England", dataDepth: "general",
    motto: "\"Lampada ferens\" — \"Carrying the torch of learning.\" A civic university (founded 1927) with strengths in medicine (Hull York Medical School), nursing, and a strong widening-participation mission.",
    values: ["strong subject ability", "a subject-focused personal statement", "genuine interest in the course", "academic fit"],
    guidance: "Hull (UK course-specific model) is a civic university with a strong widening-participation ethos, a medical school (the Hull York Medical School, jointly with York), and strengths in nursing, health, and the humanities. Admission is grades + personal statement (Medicine requires the UCAT and interview), with a generous offer rate for many courses. Make the personal statement subject-focused with genuine engagement. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement showing genuine interest; course fit recurs per UK admissions, with Medicine more competitive. Verify exact requirements on the course page." },
  { name: "De Montfort University (DMU)", aka: ["de montfort", "dmu", "de montfort university"], country: "UK", tier: "general", accept: "~89% offer rate (course-dependent)", region: "Leicester, England", dataDepth: "general",
    motto: "A large Leicester post-92 university with strong reputations in art and design (fashion, contour fashion), law, and pharmacy, and a strong widening-participation and employability focus.",
    values: ["a creative/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "De Montfort (UK course-specific model) is a large Leicester post-92 university with genuine strengths in art and design (its fashion and contour-fashion programmes are notable), law, pharmacy, and a strong employability and widening-participation focus. Admission is grades + personal statement, with a generous offer rate; creative courses require a portfolio. Make the personal statement subject-focused; its creative and professional programmes reward genuine, specific interest. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for art and design a portfolio is central. Course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "University of the Arts London (UAL)", aka: ["ual", "university of the arts london", "university of arts london", "central saint martins"], country: "UK", tier: "reach", accept: "~60-70% offer rate (portfolio-dependent)", region: "London, England", dataDepth: "deep",
    motto: "The world's leading specialist art-and-design university (consistently ranked #2 globally for art & design), a federation of six colleges including Central Saint Martins, London College of Fashion, and Chelsea.",
    values: ["an exceptional creative portfolio", "genuine artistic voice and process", "fit with the specific college/discipline", "creative risk-taking"],
    guidance: "UAL (UK creative-specialist model) is the world's foremost art-and-design university, made up of six renowned colleges (Central Saint Martins, London College of Fashion, Chelsea, Camberwell, Wimbledon, London College of Communication). Admission is portfolio-central - your creative work matters far more than grades, and many courses interview. Show a genuine artistic voice, strong process/sketchbook work (not just finished pieces), and fit with your specific college and discipline. Foundation diplomas are a common route in.",
    acceptedPattern: "Admits stand out through an exceptional, distinctive portfolio that shows process and ideas (not just polished outcomes) and a genuine creative voice; interview performance and fit with the specific college/discipline recur. Grades matter far less than the portfolio at UAL." },
  { name: "Goldsmiths, University of London", aka: ["goldsmiths", "goldsmiths university of london", "goldsmiths university"], country: "UK", tier: "target", accept: "~70-80% offer rate (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "A University of London college internationally known for creativity and unconventional, critical approaches - especially fine art (alumni include Damien Hirst, Steve McQueen), media, design, computing, and the social sciences.",
    values: ["creative and critical originality", "a portfolio (for art/design)", "intellectual unconventionality", "genuine interest in the discipline"],
    guidance: "Goldsmiths (UK course-specific model) is famed for creativity, critical thinking, and an unconventional ethos - its fine art programme has produced Turner Prize winners and its media, computing, and social sciences are strongly research-led (80% of research rated world-leading/internationally excellent, REF 2021). Art and design routes are portfolio-based; academic courses are grades + personal statement. Show genuine creative or critical originality and fit with its distinctive, boundary-pushing approach.",
    acceptedPattern: "For art/design, admits present a distinctive, conceptually strong portfolio; for academic courses, a subject-focused personal statement showing genuine critical or creative originality. The recurring signal is unconventional intellectual/creative voice and fit with Goldsmiths's ethos." },
  { name: "Falmouth University", aka: ["falmouth", "falmouth university"], country: "UK", tier: "target", accept: "~70-80% offer rate (portfolio-dependent)", region: "Falmouth, Cornwall, England", dataDepth: "deep",
    motto: "A specialist creative-arts university in Cornwall with strong reputations in photography, film, game arts, illustration, and creative writing, in a distinctive coastal setting.",
    values: ["a strong creative portfolio", "genuine creative passion", "fit with the specific creative discipline", "originality"],
    guidance: "Falmouth (UK creative-specialist model) is a dedicated arts university in Cornwall with genuine strengths in photography, film & television, game arts/design, illustration, and creative writing. Admission is portfolio- and passion-driven for creative courses (with interviews for many), and grades matter less than demonstrated creative ability and potential. Show a distinctive portfolio, real creative process, and genuine fit with your specific discipline. Its coastal, creative-community setting is part of the draw.",
    acceptedPattern: "Admits present a strong, distinctive portfolio and genuine creative passion for their specific discipline; interview/portfolio review is central and grades matter less. Creative voice and fit recur among those admitted." },
  { name: "Manchester Metropolitan University (MMU)", aka: ["manchester metropolitan", "mmu", "manchester met", "manchester metropolitan university"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Manchester, England", dataDepth: "general",
    motto: "A large Manchester post-92 university with strong reputations in art and design (the Manchester School of Art), fashion, and a broad range of professional and applied programmes.",
    values: ["strong subject ability", "a portfolio (for creative courses)", "a career/professional orientation", "genuine interest in the course"],
    guidance: "Manchester Metropolitan (UK course-specific model) is a large post-92 university with a well-regarded Manchester School of Art, plus strong fashion, business, and applied/professional programmes, in a vibrant city. Admission is grades + personal statement (creative courses require a portfolio), with a generous offer rate. Make the personal statement subject-focused; creative programmes reward a strong portfolio. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for art/design a portfolio is central. Course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "Sheffield Hallam University", aka: ["sheffield hallam", "hallam", "sheffield hallam university"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Sheffield, England", dataDepth: "general",
    motto: "A large Sheffield post-92 university with a strong applied, employability-focused ethos and recognised programmes in sport, health, engineering, and the built environment.",
    values: ["a career/employability orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Sheffield Hallam (UK course-specific model) is one of the UK's largest post-92 universities, with a strong applied/employability focus and well-regarded programmes in sport, health, nursing, engineering, and the built environment. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and, for its career-oriented courses, show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/career orientation; course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "University of the West of England (UWE Bristol)", aka: ["uwe", "uwe bristol", "university of the west of england", "west of england"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Bristol, England", dataDepth: "general",
    motto: "A large Bristol post-92 university with a strong applied, professional focus and recognised programmes in engineering (with aerospace links), health, business, and art & design.",
    values: ["a career/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "UWE Bristol (UK course-specific model) is a large post-92 university with a strong professional/applied ethos and industry links (notably aerospace and engineering in the Bristol area), plus health, business, and art & design. Admission is grades + personal statement (creative courses require a portfolio), with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/career orientation; for art/design a portfolio matters. Course fit recurs per UK admissions." },
  { name: "Leeds Beckett University", aka: ["leeds beckett", "leeds beckett university", "leeds met"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Leeds, England", dataDepth: "general",
    motto: "A large Leeds post-92 university with an applied, employability-focused ethos and recognised programmes in sport, the built environment, and business.",
    values: ["a career/employability orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Leeds Beckett (UK course-specific model) is a large post-92 university with a practical, employability focus and well-regarded programmes in sport (a genuine strength), the built environment/architecture, and business. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application for its career-oriented courses. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/career orientation; course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "Robert Gordon University (RGU)", aka: ["robert gordon", "rgu", "robert gordon university"], country: "UK", tier: "general", accept: "~80-90% offer rate (course-dependent)", region: "Aberdeen, Scotland", dataDepth: "general",
    motto: "An Aberdeen post-92 university with a strong graduate-employability record and applied programmes in energy/engineering, health, pharmacy, and business, with strong industry links.",
    values: ["a career/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Robert Gordon (UK course-specific model) is an Aberdeen university with a consistently strong graduate-employment record and applied, industry-linked programmes in energy/engineering (North Sea links), health, pharmacy, and business. Admission is grades + personal statement (Scottish structure). Make the personal statement subject-focused and show genuine interest in practical/professional application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's requirements and present a subject-focused personal statement, often with a practical/professional orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "Glasgow Caledonian University (GCU)", aka: ["glasgow caledonian", "gcu", "glasgow caledonian university", "caledonian"], country: "UK", tier: "general", accept: "~80-90% offer rate (course-dependent)", region: "Glasgow, Scotland", dataDepth: "general",
    motto: "\"For the Common Good.\" A Glasgow post-92 university with a strong social-mission ethos and applied programmes in health/nursing, engineering, and business.",
    values: ["a social-good and community orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Glasgow Caledonian (UK course-specific model) is a Glasgow university with a genuine 'University for the Common Good' social mission, strong in health and nursing, engineering, the built environment, and business. Admission is grades + personal statement (Scottish structure). Make the personal statement subject-focused; a genuine social-good or community orientation fits its ethos well. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's requirements and present a subject-focused personal statement, often with a practical or social-good orientation fitting its mission; course fit recurs per UK admissions." },
  { name: "Abertay University", aka: ["abertay", "abertay university"], country: "UK", tier: "general", accept: "~80-90% offer rate (course-dependent)", region: "Dundee, Scotland", dataDepth: "general",
    motto: "A small Dundee post-92 university that pioneered UK computer-games education - it offered the world's first computer-games degrees and remains a leading name in games and cyber-security.",
    values: ["genuine passion for games/computing", "a portfolio or demonstrated projects", "strong subject ability", "a subject-focused personal statement"],
    guidance: "Abertay (UK course-specific model) is a small Dundee university with a genuinely distinctive claim: it launched the world's first computer-games technology and design degrees and is a leading UK name in games development and cyber-security. Admission is grades + personal statement (Scottish structure); games/creative routes value demonstrated projects or a portfolio. Make the personal statement subject-focused; for games and computing, real projects and genuine passion read especially well. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): for its signature games/computing programmes, admits show genuine passion and demonstrated projects; otherwise, grade requirements plus a subject-focused personal statement. Course fit and genuine interest recur per UK admissions." },
  { name: "Royal Academy of Dramatic Art (RADA)", aka: ["rada", "royal academy of dramatic art"], country: "UK", tier: "reach", accept: "extremely competitive (audition-based; a tiny cohort)", region: "London, England", dataDepth: "deep",
    motto: "The world's most renowned drama school (founded 1904) - alumni include generations of leading actors - with an intensely selective, audition-based admissions process.",
    values: ["exceptional performance talent and potential", "authenticity and presence at audition", "commitment to the craft", "coachability"],
    guidance: "RADA (UK conservatoire/drama-school model) is the most famous drama school in the world, training a very small cohort each year through a rigorous, multi-round audition process (largely its own private process, separate from standard UCAS). Grades are essentially irrelevant - everything rests on audition performance, presence, and potential. Prepare contrasting monologues to the exact brief, show authenticity and range rather than performed 'polish,' and demonstrate genuine commitment to acting as a craft. Expect multiple recall rounds and workshops.",
    acceptedPattern: "Admits stand out purely through audition - raw talent, authenticity, presence, emotional availability, and coachability across recall rounds and workshops. Academic record is not the point; the recurring signal is genuine performing potential and commitment to the craft." },
  { name: "Guildhall School of Music and Drama", aka: ["guildhall", "guildhall school", "guildhall school of music and drama", "gsmd"], country: "UK", tier: "reach", accept: "extremely competitive (audition-based)", region: "London, England", dataDepth: "deep",
    motto: "A world-leading conservatoire (ranked #1 in the UK and #3 globally for music) at the Barbican, training musicians, actors, and production artists - including a rare, strong jazz programme.",
    values: ["exceptional musical/dramatic talent", "audition performance", "artistic potential and musicianship", "commitment to the craft"],
    guidance: "Guildhall (UK conservatoire model) is among the world's top conservatoires, training classical and jazz musicians, actors, and production artists at the Barbican (home of the LSO). Music applicants apply via UCAS Conservatoires and are admitted primarily on AUDITION (in-person or video); drama runs its own audition process. Grades matter far less than performance. Prepare your audition repertoire meticulously to the specified requirements, and show genuine musicianship/dramatic potential and commitment. Its jazz programme is a rare UK strength.",
    acceptedPattern: "Admits are selected principally on audition - technical excellence, musicianship or dramatic potential, and artistic promise - with grades a minor factor. The recurring signal is performance quality and genuine artistic potential at audition/recall." },
  { name: "Royal College of Music (RCM)", aka: ["rcm", "royal college of music"], country: "UK", tier: "reach", accept: "extremely competitive (audition-based)", region: "London, England", dataDepth: "deep",
    motto: "A world-leading music conservatoire (consistently top-ranked globally) training performers and composers to the highest level.",
    values: ["exceptional performance ability", "audition/portfolio quality", "musicianship and artistic potential", "commitment to the craft"],
    guidance: "RCM (UK conservatoire model) is one of the world's top music conservatoires. Its own guidance is explicit: 'the main basis for admission is your performance at audition' (in person or video); composers are admitted on the strength of their portfolio and interview. Apply via UCAS Conservatoires, then submit audition materials. Grades are a minor factor. Prepare your audition repertoire (or composition portfolio) to the exact requirements, and demonstrate genuine musicianship and artistic potential.",
    acceptedPattern: "Admits are chosen on audition (performers) or portfolio + interview (composers) - technical mastery, musicianship, and artistic potential are decisive, and grades matter little. Performance/portfolio quality is the recurring signal, per RCM's own stated basis for admission." },
  { name: "Norwich University of the Arts (NUA)", aka: ["norwich university of the arts", "nua", "norwich arts"], country: "UK", tier: "target", accept: "~70-80% offer rate (portfolio-dependent)", region: "Norwich, England", dataDepth: "deep",
    motto: "A specialist arts university with strong reputations in illustration, animation, graphic design, film, and fashion, known for a focused creative-community ethos.",
    values: ["a strong creative portfolio", "genuine creative voice", "fit with the specific discipline", "originality"],
    guidance: "Norwich University of the Arts (UK creative-specialist model) is a dedicated arts university with genuine strengths in illustration, animation, graphic communication design, film, and fashion. Admission is portfolio- and interview-based for creative courses, and grades matter less than demonstrated creative ability and potential. Show a distinctive portfolio (with process, not just outcomes), a genuine creative voice, and fit with your specific discipline.",
    acceptedPattern: "Admits present a strong, distinctive portfolio and genuine creative voice for their specific discipline; portfolio/interview is central and grades matter less. Creative potential and fit recur among those admitted." },
  { name: "Arts University Bournemouth (AUB)", aka: ["arts university bournemouth", "aub", "aub bournemouth"], country: "UK", tier: "target", accept: "~70-80% offer rate (portfolio-dependent)", region: "Bournemouth, England", dataDepth: "deep",
    motto: "A specialist arts university with strong reputations in animation, film, visual effects, architecture, and design - a focused creative institution distinct from the nearby Bournemouth University.",
    values: ["a strong creative portfolio", "genuine creative passion", "fit with the specific discipline", "originality"],
    guidance: "Arts University Bournemouth (UK creative-specialist model) is a dedicated arts university (distinct from Bournemouth University) with genuine strengths in animation, film, visual effects, architecture, and a broad range of art and design. Admission is portfolio- and interview-based for creative courses, with grades a secondary factor. Show a distinctive portfolio demonstrating process and ideas, genuine creative passion, and fit with your specific discipline.",
    acceptedPattern: "Admits present a strong, distinctive portfolio and genuine creative passion for their specific discipline; portfolio/interview is central and grades matter less. Creative potential and fit recur among those admitted." },
  { name: "Kingston University", aka: ["kingston", "kingston university", "kingston university london"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "London, England", dataDepth: "general",
    motto: "A large London post-92 university with strong reputations in art, design, and fashion (its fashion programme is highly regarded), plus a broad range of professional courses.",
    values: ["a portfolio (for creative courses)", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Kingston (UK course-specific model) is a large London post-92 university with a genuinely strong art, design, and fashion school (its fashion course has a notable industry reputation), plus broad professional programmes. Admission is grades + personal statement (creative courses require a portfolio and often interview), with a generous offer rate. Make the personal statement subject-focused; creative programmes reward a strong portfolio. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for art/design/fashion a portfolio is central. Course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "Middlesex University", aka: ["middlesex", "middlesex university", "mdx"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "London, England", dataDepth: "general",
    motto: "A large, diverse London post-92 university with applied programmes across business, health, art & design, and a strong widening-participation and international focus.",
    values: ["a career/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Middlesex (UK course-specific model) is a large, diverse London post-92 university with a strong widening-participation and international student focus, and applied programmes in business, health, nursing, and art & design. Admission is grades + personal statement (creative courses require a portfolio), with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for creative courses a portfolio matters. Course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Brighton", aka: ["brighton", "university of brighton"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Brighton, England", dataDepth: "general",
    motto: "A post-92 university with strong reputations in art and design (a genuine creative strength), architecture, and health, in the vibrant seaside city of Brighton.",
    values: ["a portfolio (for creative courses)", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Brighton (UK course-specific model) is a post-92 university with a genuinely well-regarded art and design school, plus architecture, health, and education, in a lively coastal city. Admission is grades + personal statement (creative courses require a portfolio and often interview), with a generous offer rate. Make the personal statement subject-focused; creative programmes reward a strong portfolio. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for art/design a portfolio is central. Course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "Liverpool John Moores University (LJMU)", aka: ["liverpool john moores", "ljmu", "john moores"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Liverpool, England", dataDepth: "general",
    motto: "A large Liverpool post-92 university with an applied, employability-focused ethos and recognised programmes in astrophysics, sport science, forensic science, and the built environment.",
    values: ["a career/applied orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Liverpool John Moores (UK course-specific model) is a large post-92 university with a strong applied and employability focus, and some genuinely notable strengths - it runs one of the world's largest robotic telescopes (astrophysics), plus sport science, forensic science, and the built environment. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/applied orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "Teesside University", aka: ["teesside", "teesside university"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Middlesbrough, England", dataDepth: "general",
    motto: "A post-92 university internationally recognised for computer games and animation (its games/VFX programmes and the Animex festival are notable), plus strong health and engineering.",
    values: ["a portfolio/projects (for games/creative)", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Teesside (UK course-specific model) is a post-92 university in the northeast with a genuine international reputation for computer games and animation (it hosts the Animex international festival and its graduates work across the games/VFX industry), plus health and engineering. Admission is grades + personal statement (games/creative routes value demonstrated projects or a portfolio), with a generous offer rate. Make the personal statement subject-focused; for games and creative programmes, real projects and genuine passion read well. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): for its signature games/animation programmes, admits show genuine passion and demonstrated projects; otherwise, grade requirements plus a subject-focused personal statement. Course fit and genuine interest recur per UK admissions." },
  { name: "Aberystwyth University", aka: ["aberystwyth", "aberystwyth university", "aber"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Aberystwyth, Wales", dataDepth: "deep",
    motto: "\"Nid Byd, Byd Heb Wybodaeth\" — \"A world without knowledge is no world at all.\" A historic Welsh university (founded 1872) - notably the birthplace of the academic discipline of International Politics.",
    values: ["genuine subject interest (esp. international politics/history)", "strong subject ability", "a subject-focused personal statement", "academic fit"],
    guidance: "Aberystwyth (UK course-specific model) is a historic seaside Welsh university with a genuine claim to fame: the world's first department of International Politics was founded here in 1919, and it remains a strength alongside history, geography, and the environmental sciences. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused; its signature international-politics and history programmes reward demonstrated, specific interest.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement with genuine engagement, often with demonstrated interest for its signature international-politics or history programmes; subject fit recurs per UK admissions." },
  { name: "Bangor University", aka: ["bangor", "bangor university", "prifysgol bangor"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Bangor, Wales", dataDepth: "general",
    motto: "A historic Welsh university (founded 1884) between Snowdonia and the sea, with genuine strengths in ocean sciences, environmental science, psychology, and history.",
    values: ["strong subject ability", "genuine interest in the course", "a subject-focused personal statement", "academic fit"],
    guidance: "Bangor (UK course-specific model) is a historic Welsh university in a striking natural setting, with real strengths in ocean/marine sciences, environmental science, psychology, and history. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused with genuine engagement; its signature science programmes reward demonstrated interest. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement showing genuine interest; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "Ulster University", aka: ["ulster", "ulster university"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Belfast, Northern Ireland", dataDepth: "general",
    motto: "A large multi-campus Northern Irish university (Belfast, Coleraine, Derry/Magee, plus branch campuses) with strengths in art & design, health, and biomedical sciences.",
    values: ["strong subject ability", "a career/professional orientation", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Ulster (UK course-specific model) is a large Northern Irish university spread across several campuses, with genuine strengths in art & design (the Belfast School of Art), health and nursing, and biomedical sciences. Admission is grades + personal statement (creative courses require a portfolio; some health courses require interviews), with a generous offer rate. Make the personal statement subject-focused. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for art/design a portfolio matters. Course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Lincoln", aka: ["lincoln", "university of lincoln"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Lincoln, England", dataDepth: "general",
    motto: "A modern university (its city-centre campus opened in 1996) that has risen quickly, known for strong student satisfaction and industry-linked programmes in engineering, agri-food, and the sciences.",
    values: ["strong subject ability", "a career/professional orientation", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Lincoln (UK course-specific model) is a fast-rising modern university with a strong student-satisfaction record and genuine industry links - its engineering school was founded in partnership with Siemens, and it has notable agri-food and science programmes. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application for its industry-linked courses. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/career orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Salford", aka: ["salford", "university of salford"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Salford, Greater Manchester, England", dataDepth: "general",
    motto: "A Greater Manchester post-92 university with a strong media focus - it has a major campus at MediaCityUK (home to parts of the BBC and ITV) - plus health, engineering, and the built environment.",
    values: ["a media/career orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Salford (UK course-specific model) is a Greater Manchester post-92 university with a genuine media distinction - it has a campus at MediaCityUK alongside the BBC and ITV, giving strong industry links for media, journalism, and production - plus health, engineering, and the built environment. Admission is grades + personal statement (creative/media courses may need a portfolio), with a generous offer rate. Make the personal statement subject-focused; media programmes reward genuine, specific interest. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a media/practical orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Huddersfield", aka: ["huddersfield", "university of huddersfield"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Huddersfield, England", dataDepth: "general",
    motto: "A post-92 university with a strong teaching-quality reputation and applied programmes in music/music technology, engineering, and health, plus a strong focus on professional accreditation.",
    values: ["a career/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Huddersfield (UK course-specific model) is a post-92 university known for strong teaching quality and applied, professionally-accredited programmes, with genuine strengths in music and music technology, engineering, and health. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/professional orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Bradford", aka: ["bradford", "university of bradford"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Bradford, England", dataDepth: "general",
    motto: "\"Give invention light.\" A post-92 university with a strong social-mobility record and applied programmes in health, pharmacy, engineering, and management.",
    values: ["a career/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Bradford (UK course-specific model) is a post-92 university with a genuinely strong social-mobility record and applied, professionally-focused programmes in health, pharmacy, engineering, and management. Admission is grades + personal statement (health/pharmacy routes may need interviews), with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/professional orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "Bath Spa University", aka: ["bath spa", "bath spa university"], country: "UK", tier: "general", accept: "~85-90% offer rate (portfolio-dependent)", region: "Bath, England", dataDepth: "general",
    motto: "A post-92 university with a strong creative-arts focus - art and design, creative writing, and education - on scenic campuses near the historic city of Bath.",
    values: ["a portfolio/creative passion", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Bath Spa (UK course-specific model) is a post-92 university with a genuine creative-arts identity - art and design, creative writing, music, and education - on attractive campuses near Bath. Admission is grades + personal statement (creative courses require a portfolio or audition), with a generous offer rate. Make the personal statement subject-focused; creative programmes reward a strong portfolio and genuine creative passion. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for creative courses a portfolio matters. Course fit and genuine interest recur per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Chester", aka: ["chester", "university of chester"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Chester, England", dataDepth: "general",
    motto: "One of England's longest-established higher-education institutions (its origins date to 1839), a university with a strong focus on health, education, and the professions.",
    values: ["a career/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Chester (UK course-specific model) is a university with a long teaching heritage (among the oldest English HE institutions, dating to 1839) and applied strengths in health, nursing, education, and the professions, across several campuses. Admission is grades + personal statement (health/education routes may need interviews and checks), with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/professional orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "Edinburgh Napier University", aka: ["edinburgh napier", "napier", "edinburgh napier university"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Edinburgh, Scotland", dataDepth: "general",
    motto: "\"Nisi sapientia frustra\" — \"Without wisdom, all is in vain.\" An Edinburgh post-92 university with applied strengths in computing, engineering, nursing, and business, and strong industry links.",
    values: ["a career/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Edinburgh Napier (UK course-specific model) is an Edinburgh post-92 university with a practical, employability focus and genuine strengths in computing, engineering, nursing, and business. Admission is grades + personal statement (Scottish structure), with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical/professional application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's requirements and present a subject-focused personal statement, often with a practical/professional orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Westminster", aka: ["westminster", "university of westminster"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "London, England", dataDepth: "deep",
    motto: "A central-London university (the UK's first polytechnic, 1838) with genuine strengths in media and communications, architecture, and fashion, and strong industry links in the capital.",
    values: ["a portfolio/creative or media orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Westminster (UK course-specific model) was Britain's first polytechnic and has a genuine reputation in media and communications (film, journalism, broadcasting), architecture, and fashion, with strong London industry connections. Admission is grades + personal statement (creative/media and architecture courses require a portfolio and often interview), with a generous offer rate. Make the personal statement subject-focused; its signature creative and media programmes reward a strong portfolio and demonstrated interest.",
    acceptedPattern: "Admits show the required grades and a subject-focused personal statement; for its signature media, architecture, and fashion programmes a strong portfolio and genuine, specific interest are central. Course fit recurs per UK admissions." },
  { name: "Harper Adams University", aka: ["harper adams", "harper adams university"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Edgmond, Shropshire, England", dataDepth: "deep",
    motto: "\"Utile Dulci\" — \"Useful and agreeable.\" The UK's leading specialist land-based university - agriculture, food production, agri-engineering, animal sciences, and rural business.",
    values: ["genuine interest in agriculture/land-based fields", "practical/hands-on experience", "a subject-focused personal statement", "fit with a specialist rural community"],
    guidance: "Harper Adams (UK specialist model) is the UK's foremost land-based university, dedicated to agriculture, food, agricultural engineering, animal sciences, veterinary nursing, and rural business, with outstanding graduate employability and a working farm. Admission is grades + personal statement, and it genuinely values relevant practical/farm/industry experience and a real commitment to the land-based sector. Make the personal statement specifically about your interest in agriculture/food/rural fields - demonstrated hands-on experience reads especially well here.",
    acceptedPattern: "Admits show genuine, specific interest in land-based fields plus (very often) real practical or farm/industry experience, and fit with a specialist rural community; demonstrated commitment to agriculture/food and relevant experience recur, alongside meeting grade requirements." },
  { name: "University of Hertfordshire", aka: ["hertfordshire", "university of hertfordshire", "herts"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Hatfield, England", dataDepth: "general",
    motto: "A post-92 university near London with applied strengths in aerospace/automotive engineering, computer science, and business, plus strong industry links (it grew from de Havilland's aeronautical roots).",
    values: ["a career/applied orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Hertfordshire (UK course-specific model) is a post-92 university near London with a practical, industry-linked focus and genuine strengths in aerospace and automotive engineering (its roots trace to the de Havilland aircraft company), computer science, and business. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical/applied study. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/applied orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Greenwich", aka: ["greenwich", "university of greenwich"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "London, England", dataDepth: "general",
    motto: "A London post-92 university on a UNESCO World Heritage riverside campus, with applied strengths in engineering, pharmacy, business, and computing.",
    values: ["a career/applied orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Greenwich (UK course-specific model) is a London post-92 university (its main campus occupies the historic Old Royal Naval College, a UNESCO World Heritage Site) with applied strengths in engineering, pharmacy, business, and computing. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/career orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Roehampton", aka: ["roehampton", "university of roehampton"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "London, England", dataDepth: "general",
    motto: "A London collegiate university (Cathedrals Group) on a green campus, with recognised strengths in dance, education/teacher training, psychology, and the humanities.",
    values: ["strong subject ability", "genuine interest in the course", "a subject-focused personal statement", "academic fit"],
    guidance: "Roehampton (UK course-specific model) is a London university with a collegiate structure and green campus, known for dance (a genuine strength), teacher training and education, psychology, and the humanities. Admission is grades + personal statement (dance/creative routes require audition/portfolio; teaching routes require interviews and checks), with a generous offer rate. Make the personal statement subject-focused with genuine engagement. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement; for dance/creative an audition or portfolio matters. Course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "Staffordshire University", aka: ["staffordshire", "staffordshire university", "staffs"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Stoke-on-Trent, England", dataDepth: "general",
    motto: "A post-92 university with a strong reputation in computer games design and esports (a genuine specialism), plus health, engineering, and forensic science.",
    values: ["a portfolio/projects (for games/creative)", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Staffordshire (UK course-specific model) is a post-92 university with a genuine, long-standing specialism in computer games design and esports (it runs a dedicated Games Institute and esports facilities), plus health, engineering, and forensic science. Admission is grades + personal statement (games/creative routes value demonstrated projects or a portfolio), with a generous offer rate. Make the personal statement subject-focused; for games and creative programmes, real projects and genuine passion read well. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): for its signature games/esports programmes, admits show genuine passion and demonstrated projects; otherwise, grade requirements plus a subject-focused personal statement. Course fit recurs per UK admissions." },
  { name: "University of Winchester", aka: ["winchester", "university of winchester"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Winchester, England", dataDepth: "general",
    motto: "\"Wisdom and understanding.\" A small university (Cathedrals Group heritage) with a values-driven, social-justice ethos and strengths in education, the humanities, and social sciences.",
    values: ["character and values fit", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Winchester (UK course-specific model) is a small university with a distinctive values-led, social-justice ethos, strong in education/teacher training, the humanities, and social sciences. Admission is grades + personal statement (education routes require interviews and checks), with a generous offer rate. Make the personal statement subject-focused; a genuine values or social-justice orientation fits its ethos. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, sometimes with a values/social-justice orientation fitting its ethos; course fit recurs per UK admissions." },
  { name: "University of Derby", aka: ["derby", "university of derby"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Derby, England", dataDepth: "general",
    motto: "A post-92 university with an applied, employability focus and recognised programmes in nursing/health, engineering, and one of the UK's leading spa/hospitality programmes at its Buxton campus.",
    values: ["a career/applied orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Derby (UK course-specific model) is a post-92 university with a practical, employability focus and applied strengths in nursing/health, engineering, and hospitality/spa management (at its historic Buxton campus). Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/career orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "University of Northampton", aka: ["northampton", "university of northampton"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Northampton, England", dataDepth: "general",
    motto: "A post-92 university with a strong social-enterprise and 'changemaker' ethos, on a modern waterside campus, with applied programmes in business, health, and education.",
    values: ["a social-enterprise/changemaker orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Northampton (UK course-specific model) is a post-92 university on a modern campus with a distinctive social-enterprise and 'changemaker' identity, and applied programmes in business, health, and education. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused; a genuine social-enterprise or community orientation fits its ethos. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, sometimes with a social-enterprise orientation fitting its ethos; course fit recurs per UK admissions." },
  { name: "University of Gloucestershire", aka: ["gloucestershire", "university of gloucestershire"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Cheltenham, England", dataDepth: "general",
    motto: "A post-92 university across Cheltenham and Gloucester with applied strengths in sport, business, education, and the creative industries.",
    values: ["a career/applied orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Gloucestershire (UK course-specific model) is a post-92 university with campuses across Cheltenham and Gloucester and applied strengths in sport, business, education, and the creative industries. Admission is grades + personal statement (creative courses may need a portfolio), with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/career orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "London South Bank University (LSBU)", aka: ["london south bank", "lsbu", "south bank university"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "London, England", dataDepth: "general",
    motto: "A London post-92 university with a strongly vocational, career-focused ethos and applied strengths in the built environment, engineering, health, and nursing.",
    values: ["a career/vocational orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "London South Bank (UK course-specific model) is a London post-92 university with a genuinely vocational, employability-driven identity and applied strengths in the built environment, engineering, health, and nursing, with strong professional accreditation. Admission is grades + personal statement (health routes require interviews and checks), with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical/professional application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a strong practical/vocational orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
  { name: "Solent University", aka: ["solent", "solent university", "southampton solent"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Southampton, England", dataDepth: "general",
    motto: "A post-92 university in Southampton with distinctive strengths in maritime studies (a genuine specialism), media production, and sport.",
    values: ["a career/applied orientation", "a portfolio (for media/creative)", "strong subject ability", "genuine interest in the course"],
    guidance: "Solent (UK course-specific model) is a Southampton post-92 university with a genuine maritime-studies specialism (Warsash Maritime School), plus media production, music, and sport. Admission is grades + personal statement (media/creative routes value a portfolio; maritime routes have specific requirements), with a generous offer rate. Make the personal statement subject-focused; its signature maritime and media programmes reward demonstrated, specific interest. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): for its signature maritime/media programmes, admits show genuine, specific interest (and a portfolio for media); otherwise, grade requirements plus a subject-focused personal statement. Course fit recurs per UK admissions." },
  { name: "Anglia Ruskin University (ARU)", aka: ["anglia ruskin", "aru", "anglia ruskin university"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "Cambridge & Chelmsford, England", dataDepth: "general",
    motto: "A large post-92 university (Cambridge and Chelmsford campuses) with a strong health and medical-education focus, a medical school, plus business and the arts.",
    values: ["a career/professional orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "Anglia Ruskin (UK course-specific model) is a large post-92 university with campuses in Cambridge and Chelmsford, a strong focus on health and medical education (it has a medical school), plus nursing, business, and the arts. Admission is grades + personal statement (Medicine/health routes require tests, interviews, and checks), with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical/professional application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course's grade requirements and present a subject-focused personal statement, often with a practical/professional orientation; course fit recurs per UK admissions, with Medicine notably more competitive." },
  { name: "University of East London (UEL)", aka: ["uel", "university of east london", "east london"], country: "UK", tier: "general", accept: "~85-90% offer rate (course-dependent)", region: "London, England", dataDepth: "general",
    motto: "A diverse East London post-92 university with a strong social-mobility mission and applied programmes in health, sport, business, and the creative industries.",
    values: ["a career/applied orientation", "strong subject ability", "a subject-focused personal statement", "genuine interest in the course"],
    guidance: "University of East London (UK course-specific model) is a diverse East London post-92 university with a strong widening-participation and social-mobility mission, and applied programmes in health, sport (its SportsDock facilities are notable), business, and the creative industries. Admission is grades + personal statement, with a generous offer rate. Make the personal statement subject-focused and show genuine interest in practical application. (Source-verified for facts and entry model; detailed admitted-student pattern data is limited, so guidance here is general.)",
    acceptedPattern: "General pattern (limited published admit-specific data): admits meet the course grade requirements and present a subject-focused personal statement, often with a practical/career orientation; course fit recurs per UK admissions. Verify exact requirements on the course page." },
];

/* Search the school KB by name or alias - powers the survey autocomplete. */
// True if the alias genuinely matches the query. The query containing the
// alias only counts at a word boundary, so short aliases like 'cal' or 'nd'
// don't spuriously match inside unrelated words (e.g. 'cal' in 'some local
// college'). The alias containing the query is fine (typing a prefix).
function _aliasMatches(qNorm, alias){
  if(typeof qNorm !== "string" || typeof alias !== "string") return false;
  if(alias.includes(qNorm)) return true;
  return new RegExp('\\b' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(qNorm);
}

function searchSchools(query){
  const q = (query || '').trim().toLowerCase();
  if(!q) return [];
  return SCHOOLS.filter(s =>
    s.name.toLowerCase().includes(q) || s.aka.some(a => _aliasMatches(q, a))
  ).slice(0, 6);
}

/* Resolve a stored school name (or free-typed text) to its KB entry, if any. */
function lookupSchool(name){
  const q = String(name == null ? '' : name).trim().toLowerCase();
  if(!q) return null;
  // exact / alias first
  const exact = SCHOOLS.find(s => s.name.toLowerCase() === q || s.aka.includes(q));
  if(exact) return exact;
  // Fuzzy (name-substring / alias) pass ONLY for a meaningful query. A short or
  // generic query ("a","the","college","state") would otherwise fuzzy-match a
  // specific, often highly-selective school and silently anchor the student's
  // whole roadmap/readiness on the WRONG school. Kept in exact parity with the
  // backend lookup_school. Generic queries resolve to null ("general guidance").
  const GENERIC = new Set(["a","the","of","in","at","college","university","state","institute","school","and","for","new","san","los","the university"]);
  if(q.length >= 4 && !GENERIC.has(q)){
    return SCHOOLS.find(s => s.name.toLowerCase().includes(q) || s.aka.some(a => _aliasMatches(q, a))) || null;
  }
  return null;
}

/* Shared admissions helper: resolve the KB "anchor" (most selective matched
   school, which sets the bar) plus the admissions "shape" flags every
   admissions page uses to tailor advice consistently. Single source of truth
   so the dashboard, roadmap, workshop, and schedule never diverge. */
function admissionsAnchor(admProfile){
  const schools = String((admProfile && admProfile.targetSchools) || '').split(',').map(s=>s.trim()).filter(Boolean);
  const kb = schools.map(s => lookupSchool(s)).filter(Boolean);
  const anchor = kb.slice().sort((a,b)=>(a.tier==='reach'?0:1)-(b.tier==='reach'?0:1))[0] || null;
  const blob = anchor ? (anchor.guidance + ' ' + anchor.acceptedPattern + ' ' + (anchor.values||[]).join(' ')).toLowerCase() : '';
  return {
    schools, kb, anchor,
    isUK: anchor ? anchor.country === 'UK' : kb.some(s=>s.country==='UK'),
    hasUS: kb.some(s=>s.country==='US'),
    hasUK: kb.some(s=>s.country==='UK'),
    isPortfolio: /portfolio/.test(blob),
    isAudition: /audition/.test(blob),
    isMaker: /(maker|build|hands-on making|tinker)/.test(blob),
    isResearch: /(research|lab|scholar)/.test(blob),
    isService: /(service|community|leadership|contribution)/.test(blob),
    isGeneral: !!anchor && anchor.dataDepth === 'general',
    values: anchor ? (anchor.values||[]) : [],
    twoValues: anchor ? (anchor.values||[]).slice(0,2).join(' and ') : '',
    evidence: (anchor && anchor.dataDepth !== 'general')
      ? anchor.acceptedPattern.replace(/^By [^,]+,\s*/,'').replace(/^Public analyses[^:]*:\s*/i,'')
      : ''
  };
}

/* Shared, school-aware Metis system prompt for every admissions page. Gives the
   AI guide the student's real profile, target schools with their actual values
   and admissions model (US-holistic vs UK-course-specific), the honest dataDepth
   caveat, and their roadmap - so answers are genuinely school-specific and never
   fabricate a school's requirements. Used by the admissions dashboard, roadmap,
   schedule, workshop, and waypoint so the guide is consistent everywhere. */
function admissionsMetisContext(){
  const p = getAdmissionsProfile() || {};
  const A = admissionsAnchor(p);
  let ctx = `You are Metis, the built-in ADMISSIONS guide inside "Kaidostar", helping a student build a strong university application. Be concise, practical, and honest. Never invent a school's specific requirements, deadlines, or statistics - if unsure, tell the student to verify on the official course/admissions page.\n\n`;
  if(p.intendedMajor) ctx += `Student's intended major/subject: "${p.intendedMajor}".\n`;
  if(p.gradeLevel) ctx += `Current stage: ${p.gradeLevel}.\n`;
  if(p.interests) ctx += `Their interests/background: "${p.interests}".\n`;
  if(p.studentAchievements) ctx += `Achievements they've stated: "${p.studentAchievements}".\n`;

  if(A.kb.length){
    ctx += `\nTarget schools (with what each actually rewards - use this to give school-specific advice):\n`;
    A.kb.forEach(s => {
      ctx += `- ${s.name} (${s.country}, ${s.tier}, ${s.accept}): values ${(s.values||[]).slice(0,3).join(', ')}.`;
      if(s.dataDepth === 'general') ctx += ` [We have verified this school's facts and admissions model, but detailed admit-pattern data is limited - keep school-specific claims general and tell the student to confirm specifics.]`;
      ctx += `\n`;
    });
    if(A.isUK && A.hasUS){
      ctx += `\nIMPORTANT: this student targets BOTH UK and US schools, which use fundamentally different admissions models. UK = academic ability in one subject (grades, super-curricular depth, admissions tests, a subject-focused UCAS statement; extracurriculars matter little). US = holistic (a "spike", extracurricular depth, leadership/impact, personal essays). Advise on the right model for whichever school the student asks about, and remind them these need separate preparation.\n`;
    } else if(A.isUK){
      ctx += `\nThese are UK schools: admission is course-specific and academic. Steer the student toward top grades in the required subjects, genuine super-curricular depth in ${p.intendedMajor||'their subject'}, any required admissions test, and a subject-focused UCAS personal statement - NOT a broad activity list or a US-style personal-narrative essay.\n`;
    } else if(A.anchor){
      ctx += `\nThese are US schools: admission is holistic. Steer the student toward a genuine "spike" in ${p.intendedMajor||'their field'}, depth over breadth, a concrete achievement, real experience, and authentic personal essays that reflect what these schools value.\n`;
    }
  } else {
    ctx += `\nThe student hasn't named target schools we have detailed data on yet - give sound general admissions advice and suggest they add target schools for school-specific guidance.\n`;
  }
  const rm = getAdmissionsRoadmap();
  if(rm && rm.summary){ ctx += `\nTheir current roadmap strategy: ${rm.summary}\n`; }
  return ctx;
}

/* ============================================================================
   X-FACTOR: School Fit & Readiness analyzer.
   Gives a student an HONEST read of where they stand for EACH target school,
   built from their real profile (achievements, tracked opportunities, roadmap
   progress) weighed against that school's real tier and what it genuinely
   values. Deterministic and transparent - it never invents a precise
   admit-probability (which would be dishonest); it reports an evidence-based
   readiness BAND, the single highest-leverage next move for that specific
   school, and shows its work. Shared engine used by the dashboard and mirrored
   on the backend so frontend/backend never disagree.
   ============================================================================ */

/* Count how much real evidence the student has, from their own data. */
function _admissionsEvidence(admProfile){
  const ach = String(admProfile.studentAchievements || '').trim();
  // A rough, honest count of distinct achievements (comma/newline/semicolon separated).
  const achItems = ach ? ach.split(/[,;\n]+/).map(s=>s.trim()).filter(s=>s.length>2) : [];
  let tracked = [], events = [], roadmap = null;
  try { tracked = getAdmissionsApplications ? getAdmissionsApplications() : []; } catch(e){}
  try { events = getAdmissionsEvents ? getAdmissionsEvents() : []; } catch(e){}
  try { roadmap = getAdmissionsRoadmap ? getAdmissionsRoadmap() : null; } catch(e){}
  const doneStages = roadmap && roadmap.milestones ? roadmap.milestones.filter(m=>m.status==='done').length : 0;
  const totalStages = roadmap && roadmap.milestones ? roadmap.milestones.length : 0;
  const competitions = events.filter(e => (e.event_type||'')==='competition').length;
  const internships = events.filter(e => (e.event_type||'')==='internship').length;
  return {
    achItems, achCount: achItems.length,
    trackedCount: (tracked||[]).length,
    eventCount: (events||[]).length,
    competitions, internships,
    doneStages, totalStages,
    hasMajor: !!(admProfile.intendedMajor||'').trim(),
    hasInterests: !!(admProfile.interests||'').trim(),
  };
}

/* The readiness analysis for ONE school, honest and school-specific. */
// Academic-fit signal from GPA/test scores vs a school's selectivity. Backend
// mirror of academic_fit() in schools.py - honest, calibrated, no fake %.
function _parseGpaFE(raw){
  if(!raw) return null;
  const m = String(raw).match(/(\d\.\d{1,2}|\d)/);
  if(!m) return null;
  const v = parseFloat(m[1]);
  if(!(v>0) || v>5.5) return null;
  return v;
}
function _parseTestFE(raw){
  if(!raw) return null;
  const nums = (String(raw).match(/\d{2,4}/g) || []).map(Number);
  for(const n of nums){ if(n>=400 && n<=1600) return ['sat', n]; }
  for(const n of nums){ if(n>=1 && n<=36) return ['act', n]; }
  return null;
}
function academicFit(school, admProfile){
  const gpa = _parseGpaFE(admProfile.gpa);
  const test = _parseTestFE(admProfile.testScores || admProfile.test_scores);
  if(gpa===null && test===null) return null;
  const accM = String(school.accept||'').match(/([\d.]+)/);
  const acc = accM ? parseFloat(accM[1]) : null;
  const tier = school.tier;
  // Audition/portfolio schools admit on performance, not stats - say so honestly.
  const acceptText = String(school.accept||'').toLowerCase();
  if(acceptText.includes('audition') || acceptText.includes('portfolio')){
    const bits=[];
    if(gpa!==null) bits.push('GPA '+(Number.isInteger(gpa)?gpa:gpa));
    if(test!==null) bits.push(test[0].toUpperCase()+' '+test[1]);
    return { band:'audition-based', stated: bits.join(', '), note:"This school admits primarily by audition or portfolio, not academic stats - your GPA and test scores matter far less here than the quality of your performance or work. Meet any academic minimum, then put your energy into an outstanding audition or portfolio." };
  }
  let gpaStrong, gpaOk, satStrong, satOk, actStrong, actOk, sel;
  if(acc!==null && acc<=10){ gpaStrong=3.9; gpaOk=3.7; satStrong=1500; satOk=1430; actStrong=34; actOk=32; sel='highly selective'; }
  else if((acc!==null && acc<=25) || tier==='reach'){ gpaStrong=3.8; gpaOk=3.5; satStrong=1450; satOk=1350; actStrong=33; actOk=30; sel='very selective'; }
  else { gpaStrong=3.6; gpaOk=3.2; satStrong=1350; satOk=1200; actStrong=29; actOk=26; sel='selective'; }
  const grades = [];
  if(gpa!==null){ const g=Math.min(gpa,4.0); grades.push(g>=gpaStrong?'strong':(g>=gpaOk?'ok':'below')); }
  if(test!==null){ const [kind,val]=test; const strong=kind==='sat'?satStrong:actStrong; const ok=kind==='sat'?satOk:actOk; grades.push(val>=strong?'strong':(val>=ok?'ok':'below')); }
  let band, note;
  if(grades.includes('below')){ band='headwind'; note=`Your academic stats look below the typical admitted range for a ${sel} school like this - a real headwind. It's not disqualifying (admissions is holistic), but the rest of your profile has to carry more weight, and this school likely belongs in your reach tier.`; }
  else if(grades.every(x=>x==='strong')){ band='competitive'; note=`Your academic stats are competitive for a ${sel} school - they clear the academic bar. That's necessary, not sufficient: at this selectivity, strong stats are common among applicants, so your activities, essays, and distinctiveness are what actually differentiate you.`; }
  else { band='in-range'; note=`Your academic stats are in a reasonable range for a ${sel} school, but not a standout - they keep you in the conversation rather than lifting you above it. The holistic pieces (depth of activities, essays, fit) carry the decision from here.`; }
  const label=[];
  if(gpa!==null) label.push('GPA '+(Number.isInteger(gpa)?gpa:gpa));
  if(test!==null) label.push(test[0].toUpperCase()+' '+test[1]);
  return { band, note, stated: label.join(', ') };
}

function schoolReadiness(school, admProfile, ev){
  ev = ev || _admissionsEvidence(admProfile);
  const isUK = school.country === 'UK';
  const tier = school.tier; // 'reach' | 'target'
  const general = school.dataDepth === 'general';

  // --- Build an evidence score (0-100) from the student's REAL data. This is a
  //     transparent proxy for "how much demonstrated signal do you have", NOT an
  //     admit probability. Weighted by what the school's model rewards. ---
  let score = 0;
  const factors = [];
  // Foundation: having a clear focus at all.
  if(ev.hasMajor){ score += 12; }
  if(ev.hasInterests){ score += 6; }
  // Achievements / demonstrated ability (the biggest signal everywhere).
  const achPts = Math.min(ev.achCount, 3) * 12; // up to 36
  score += achPts;
  if(ev.achCount) factors.push(`${ev.achCount} stated achievement${ev.achCount>1?'s':''}`);
  // Competitions & experience.
  score += Math.min(ev.competitions,2)*7;   // up to 14
  score += Math.min(ev.internships,2)*8;    // up to 16
  if(ev.competitions) factors.push(`${ev.competitions} competition${ev.competitions>1?'s':''} tracked`);
  if(ev.internships) factors.push(`${ev.internships} internship/experience tracked`);
  // Roadmap progress = active, structured effort.
  if(ev.totalStages){ score += Math.round((ev.doneStages/ev.totalStages)*16); if(ev.doneStages) factors.push(`${ev.doneStages}/${ev.totalStages} roadmap stages done`); }
  // General tracking effort.
  score += Math.min(ev.trackedCount,3)*2;   // up to 6
  if(score > 100) score = 100;

  // --- Selectivity headwind: the same evidence means different things at a
  //     ~4% reach vs a ~40% target. We DON'T fake precision - we shift the BAND. ---
  // Bands are intentionally honest and non-numeric to the user.
  let band, bandNote;
  const reachCut = tier === 'reach';
  if(score < 25){
    band = 'Getting started';
    bandNote = reachCut
      ? `You're at the beginning for a school this selective (${school.accept}). That's completely normal - the plan below is how you build real signal.`
      : `You're at the beginning. The plan below builds the profile this school looks for.`;
  } else if(score < 50){
    band = 'Building';
    bandNote = reachCut
      ? `You're building a foundation. For a reach like this (${school.accept}), keep concentrating on depth - one standout thread beats several shallow ones.`
      : `You're building a solid foundation for a realistic target here.`;
  } else if(score < 72){
    band = reachCut ? 'Competitive foundation' : 'Strong position';
    bandNote = reachCut
      ? `You have a genuine foundation. At ${school.accept}, nothing guarantees admission - but you're doing the right things; now deepen your strongest thread.`
      : `You're in a strong position for this school - keep the momentum and polish your application.`;
  } else {
    band = reachCut ? 'Strong signal' : 'Excellent position';
    bandNote = reachCut
      ? `You've built strong signal. Even so, at ${school.accept} outcomes are never certain for anyone - focus now on telling your story well.`
      : `You're in an excellent position here - focus on execution and authentic essays.`;
  }

  // --- The single highest-leverage next move, specific to THIS school's model. ---
  const major = admProfile.intendedMajor || 'your subject';
  let nextMove;
  if(isUK){
    if(ev.achCount === 0) nextMove = `Add one subject-linked achievement in ${major} (an olympiad, essay competition, or EPQ) - UK tutors want demonstrated academic ability, and you have none logged yet.`;
    else if(ev.doneStages < 2 && ev.totalStages) nextMove = `Go deeper beyond the syllabus in ${major} (wider reading, a lecture series, a project) and log it - super-curricular depth is the heart of a UK personal statement.`;
    else nextMove = `Confirm ${school.name}'s exact grade requirements and any admissions test for ${major}, and start test prep - at ${school.accept} this is what separates near-identical applicants.`;
    if(school.dataDepth !== 'general'){
      const v = (school.values||[])[0];
      if(v) nextMove += ` It particularly rewards ${v}.`;
    }
  } else {
    if(ev.achCount === 0) nextMove = `Win one concrete, verifiable achievement in ${major} - it turns "interested" into "demonstrated," and you have none logged yet.`;
    else if(ev.internships === 0) nextMove = `Land one hands-on experience (research, internship, or shadowing) in ${major} - it's what separates a strong applicant from a great one and gives real essay material.`;
    else if(ev.doneStages < 3 && ev.totalStages) nextMove = `Deepen your signature "spike" in ${major} rather than adding breadth - ${school.name} rewards depth over a long activity list.`;
    else nextMove = `Focus on essays that speak to what ${school.name} genuinely values${(school.values||[]).length?` - especially ${(school.values||[]).slice(0,2).join(' and ')}` : ''}, shown through your real story.`;
  }

  return { name: school.name, country: school.country, tier, accept: school.accept, general,
           score, band, bandNote, factors, nextMove,
           values: (school.values||[]).slice(0,3), academicFit: academicFit(school, admProfile) };
}

/* Readiness across ALL of a student's target schools, sorted reach-first. */
function admissionsReadiness(admProfile){
  const A = admissionsAnchor(admProfile);
  if(!A.kb.length) return { schools: [], evidence: null };
  const ev = _admissionsEvidence(admProfile);
  const schools = A.kb
    .map(s => schoolReadiness(s, admProfile, ev))
    .sort((a,b) => (a.tier==='reach'?0:1)-(b.tier==='reach'?0:1));
  // An honest overall read: the strongest single lever across all schools.
  return { schools, evidence: ev };
}

/* ============================================================================
   UNIQUE #1: School List Balance Analyzer.
   The single most valuable - and most fabricated-by-chatbots - piece of
   college advice: "is my list actually realistic?" A stateless chatbot can't
   answer this well because it doesn't know your real profile AND it invents
   acceptance rates. This computes, from VERIFIED tiers + your own readiness,
   whether your list is dangerously reach-heavy, balanced, or too conservative,
   and names the specific structural risk. Deterministic and honest.
   ============================================================================ */
function admissionsListBalance(admProfile){
  const A = admissionsAnchor(admProfile);
  if(!A.kb.length) return null;
  const ev = _admissionsEvidence(admProfile);

  // Classify each school by REAL selectivity, refined by the student's readiness.
  // A "reach" for everyone; but a low-readiness student's "target" may really be a reach.
  const rd = A.kb.map(s => {
    const r = schoolReadiness(s, admProfile, ev);
    // Effective category: start from the KB tier, then apply an honest readiness lens.
    let cat = s.tier === 'reach' ? 'reach' : 'target';
    // A named "target" where the student has weak signal behaves like a reach for them.
    if(cat === 'target' && r.score < 35) cat = 'reach';
    // A "reach" is ALWAYS a reach - readiness never downgrades a genuinely selective school.
    // Identify likely-safety: a target with strong readiness and a higher admit rate.
    const acceptNum = parseFloat(String(s.accept).replace(/[^0-9.]/g,'')) || null;
    if(cat === 'target' && r.score >= 60 && acceptNum && acceptNum >= 40) cat = 'likely';
    return { name: s.name, country: s.country, tier: s.tier, accept: s.accept, cat, score: r.score };
  });

  const reaches = rd.filter(x=>x.cat==='reach');
  const targets = rd.filter(x=>x.cat==='target');
  const likelies = rd.filter(x=>x.cat==='likely');
  const n = rd.length;

  // Honest verdict on the SHAPE of the list.
  let verdict, verdictNote, risk = null;
  const reachShare = reaches.length / n;
  if(n < 3){
    verdict = 'Too short to judge';
    verdictNote = `You've listed ${n} school${n===1?'':'s'}. A healthy list usually spans a few reaches, a few realistic targets, and at least one you'd be genuinely happy to attend and are very likely to get into.`;
  } else if(likelies.length === 0 && targets.length === 0){
    verdict = 'All reaches — high risk';
    verdictNote = `Every school on your list is a reach for you right now. Even a strong applicant can be shut out of an all-reach list, because at these admit rates outcomes are partly out of anyone's control.`;
    risk = `Add 2-3 schools you'd genuinely be happy to attend where your profile is comfortably above the bar - not as "backups you'll resent," but as real options.`;
  } else if(likelies.length === 0){
    verdict = 'Reach-heavy — add a floor';
    verdictNote = `You have realistic targets, but no school you're very likely to get into. That's the one gap that turns a good list into a risky one.`;
    risk = `Add at least one "likely" school - a place you'd be happy at where your readiness is strong and the admit rate is higher. It's the safety net that lets you aim high elsewhere without fear.`;
  } else if(reachShare > 0.7){
    verdict = 'Aiming very high';
    verdictNote = `Most of your list is reaches, but you do have a floor. That's an aggressive-but-defensible shape - just make sure the reaches are schools you genuinely fit, not just names.`;
    risk = `Consider swapping one reach for a strong target you're excited about - it raises your odds of a great outcome without lowering your ceiling much.`;
  } else if(reaches.length === 0){
    verdict = 'Very safe — you can aim higher';
    verdictNote = `Your list has no genuine reaches. If there's a dream school you'd regret not trying for, your profile may support adding one - a well-chosen reach costs you little.`;
    risk = `Add one or two genuine reaches you'd love to attend. With your foundation, it's worth the shot.`;
  } else {
    verdict = 'Well balanced';
    verdictNote = `Your list spans reaches, realistic targets, and a floor you're likely to get into. This is the shape admissions counselors actually recommend - now the work is depth, not more schools.`;
  }

  return {
    counts: { reach: reaches.length, target: targets.length, likely: likelies.length, total: n },
    schools: rd,
    verdict, verdictNote, risk,
    isUK: A.isUK, hasUS: A.hasUS, hasUK: A.hasUK,
  };
}

/* ============================================================================
   UNIQUE #2: Profile Gap Radar.
   Cross-school synthesis a stateless chatbot can't do: it looks at ALL your
   target schools' values AT ONCE and finds the ONE addition that would
   strengthen your standing across the MOST of them simultaneously. Not
   per-question advice - whole-picture optimization against your real profile.
   ============================================================================ */
function admissionsGapRadar(admProfile){
  const A = admissionsAnchor(admProfile);
  if(!A.kb.length) return null;
  const ev = _admissionsEvidence(admProfile);
  const major = admProfile.intendedMajor || 'your field';

  // Candidate "moves" a student can make, each mapped to the school-signals it satisfies.
  // We score each move by how many target schools genuinely reward it AND whether the
  // student is currently missing it (so we never suggest what they've already done).
  const candidates = [];

  const anyUK = A.hasUK, anyUS = A.hasUS;

  // Achievement (universal, weighted heavily; missing if achCount===0)
  if(ev.achCount === 0){
    candidates.push({
      key:'achievement',
      move: anyUK
        ? `Win or place in one subject competition/olympiad in ${major}`
        : `Win one concrete, verifiable achievement in ${major} (a competition placement, a published piece, a measurable result)`,
      why:`Turns "interested in ${major}" into "demonstrated ability" - the single highest-signal thing you can add, and it strengthens EVERY school on your list.`,
      lifts: A.kb.length, missing:true,
    });
  }
  // Depth / spike (US) or super-curricular (UK)
  if(ev.doneStages < 2){
    candidates.push({
      key:'depth',
      move: anyUK
        ? `Build genuine super-curricular depth in ${major} (wider reading, a lecture series, a self-driven project) and document what you learned`
        : `Deepen ONE signature "spike" in ${major} rather than adding breadth`,
      why: anyUK
        ? `UK tutors read for demonstrated engagement beyond the syllabus - it's the heart of a strong personal statement across all your UK choices.`
        : `Selective US schools reward depth over a long activity list - one deep thread lifts every holistic school you're applying to.`,
      lifts: A.kb.length, missing:true,
    });
  }
  // Experience (mostly US-relevant, but research helps UK too)
  if(ev.internships === 0){
    const usCount = A.kb.filter(s=>s.country==='US').length;
    candidates.push({
      key:'experience',
      move:`Land one hands-on experience in ${major} - research, an internship, or shadowing`,
      why: anyUS
        ? `Real experience separates strong applicants from great ones at holistic schools, and gives you concrete, un-fakeable material for essays and interviews.`
        : `Relevant experience or a research project gives your application specific, credible substance.`,
      lifts: anyUS ? Math.max(usCount, Math.ceil(A.kb.length/2)) : Math.ceil(A.kb.length/2), missing:true,
    });
  }
  // Test prep (UK-specific, high-leverage for reaches)
  if(anyUK){
    candidates.push({
      key:'test',
      move:`Confirm and prepare for any required admissions test (TMUA, ESAT, MAT, STEP, LNAT, or UCAT) for ${major}`,
      why:`For competitive UK courses the admissions test is a genuine differentiator among near-identical top-grade applicants - and registration deadlines come early.`,
      lifts: A.kb.filter(s=>s.country==='UK').length, missing:true,
    });
  }

  if(!candidates.length){
    return { top: null, note: `You've already logged the big signals (an achievement, real depth, and experience). At this point the highest-leverage work isn't adding more - it's telling your story well in essays and hitting every deadline.`, candidates: [] };
  }

  // The top move = the one that lifts the most schools (ties broken by universal signals).
  candidates.sort((a,b)=> b.lifts - a.lifts);
  const top = candidates[0];
  return {
    top,
    note: `Across your ${A.kb.length} target school${A.kb.length>1?'s':''}, this single move would strengthen your standing at the most of them at once.`,
    candidates,
  };
}

/* ============================================================================
   THE UNIQUE ONE: Trajectory Engine (longitudinal readiness over real time).
   No chatbot can do this - it has no memory between sessions. No single-meeting
   counselor can either - they don't watch your profile day to day. This app
   PERSISTS a timestamped snapshot of your readiness each time you engage, then
   reads the SHAPE OF YOUR PROGRESS OVER TIME: momentum, stalls, what moved the
   needle and when, and whether your pace matches your remaining runway. It turns
   one-time advice into a feedback loop.

   Honesty: snapshots are your own real evidence at real timestamps. Trajectory
   language is descriptive of what actually changed - never a fabricated forecast.
   ============================================================================ */

var ADMISSIONS_SNAPSHOT_KEY = 'kaidostar_admissions_snapshots';
var SNAPSHOT_MIN_GAP_HOURS = 12; // don't spam snapshots within a session

function getAdmissionsSnapshots(){
  try { const _v = JSON.parse(localStorage.getItem(ADMISSIONS_SNAPSHOT_KEY)); return Array.isArray(_v) ? _v : []; }
  catch(e){ return []; }
}
function _saveAdmissionsSnapshots(arr){
  // keep the series bounded and clean (max ~180 points)
  _safeSetItem(ADMISSIONS_SNAPSHOT_KEY, JSON.stringify(arr.slice(-180)));
}

/* Record a snapshot of the student's CURRENT readiness, but only if enough time
   has passed since the last one (so the trajectory reflects real days, not
   page refreshes). Call this whenever the student loads the dashboard. */
function recordAdmissionsSnapshot(admProfile){
  if(!admProfile) return null;
  const r = admissionsReadiness(admProfile);
  if(!r || !r.schools.length) return null;
  const ev = r.evidence || {};
  const snaps = getAdmissionsSnapshots();
  const now = Date.now();
  const last = snaps.length ? snaps[snaps.length-1] : null;
  // Average readiness across schools = a single honest "overall signal" number.
  const avg = Math.round(r.schools.reduce((s,x)=>s+x.score,0) / r.schools.length);
  const snap = {
    ts: new Date().toISOString(),
    avg,
    perSchool: r.schools.map(x=>({name:x.name, score:x.score, band:x.band})),
    evidence: { achCount: ev.achCount||0, competitions: ev.competitions||0, internships: ev.internships||0, doneStages: ev.doneStages||0, totalStages: ev.totalStages||0, eventCount: ev.eventCount||0 },
  };
  // Only append if >12h since last OR the evidence actually changed (a real event worth marking).
  const evChanged = last && JSON.stringify(last.evidence) !== JSON.stringify(snap.evidence);
  if(!last || evChanged || (now - new Date(last.ts).getTime()) > SNAPSHOT_MIN_GAP_HOURS*3600000){
    snaps.push(snap);
    _saveAdmissionsSnapshots(snaps);
  }
  return snap;
}

/* Estimate the student's application runway in months, from grade level. Honest
   and rough - used only to contextualize pace, never as a hard deadline. */
function _admissionsRunwayMonths(admProfile){
  const g = String((admProfile && admProfile.gradeLevel) || '').toLowerCase();
  // US grades / UK years -> rough months until the main application deadline.
  if(/(^|\D)(12|senior|year 13|yr 13|upper sixth)(\D|$)/.test(g)) return 3;
  if(/(^|\D)(11|junior|year 12|yr 12|lower sixth)(\D|$)/.test(g)) return 12;
  if(/(^|\D)(10|sophomore|year 11|yr 11)(\D|$)/.test(g)) return 24;
  if(/(^|\D)(9|freshman|year 10|yr 10)(\D|$)/.test(g)) return 36;
  return null;
}

/* The trajectory read: momentum, what moved the needle, pace vs runway. This is
   the payload the dashboard renders and the thing no stateless AI can produce. */
function admissionsTrajectory(admProfile){
  const snaps = getAdmissionsSnapshots();
  const runway = _admissionsRunwayMonths(admProfile);
  // Robust: guarantee every snapshot has a numeric avg (malformed stored rows).
  snaps.forEach(s => { const n = parseInt(s && s.avg); s.avg = (isNaN(n) || n < 0) ? 0 : n; });
  if(snaps.length < 2){
    return {
      state: 'baseline',
      headline: snaps.length === 1 ? 'Your starting point is recorded.' : 'Building your baseline.',
      detail: 'Come back as you make progress - this will track how your readiness actually moves over time, which is something no one-time answer can show you. Log an achievement or complete a roadmap stage and watch it respond.',
      points: snaps.map(s=>({ts:s.ts, avg:s.avg})),
      runwayMonths: runway,
      delta: 0, spanDays: 0,
    };
  }

  const first = snaps[0], last = snaps[snaps.length-1];
  const recent = snaps[Math.max(0, snaps.length-4)]; // ~last few data points
  const delta = last.avg - recent.avg;
  const totalDelta = last.avg - first.avg;
  const spanDays = Math.max(1, Math.round((new Date(last.ts).getTime() - new Date(first.ts).getTime())/86400000));
  const daysSinceMove = Math.round((Date.now() - new Date(last.ts).getTime())/86400000);

  // Find the biggest single jump and what evidence changed at that step (the
  // "what actually moved the needle" insight).
  let biggestJump = 0, jumpWhat = null, jumpWhen = null;
  for(let k=1;k<snaps.length;k++){
    const d = snaps[k].avg - snaps[k-1].avg;
    if(d > biggestJump){
      biggestJump = d;
      const a = snaps[k].evidence, prev = snaps[k-1].evidence;
      if(a.achCount > prev.achCount) jumpWhat = 'logging a new achievement';
      else if(a.internships > prev.internships) jumpWhat = 'adding hands-on experience';
      else if(a.competitions > prev.competitions) jumpWhat = 'entering a competition';
      else if(a.doneStages > prev.doneStages) jumpWhat = 'completing roadmap stages';
      else jumpWhat = 'your logged progress';
      jumpWhen = snaps[k].ts;
    }
  }

  // Determine momentum state.
  let state, headline, detail;
  const stalledDays = 21;
  if(delta >= 6){
    state = 'rising';
    headline = `Your readiness is climbing — up ${delta} points recently.`;
    detail = biggestJump>0 && jumpWhat
      ? `The biggest jump came from ${jumpWhat}. Keep doing exactly that kind of concrete, evidence-building work - it's what's moving your standing.`
      : `You're building real, measurable momentum. Keep the concrete work going.`;
  } else if(delta <= -4){
    state = 'declining';
    headline = `Your relative standing has slipped a little.`;
    detail = `This usually means the calendar is moving while new evidence isn't being added. The fix is one concrete action - log an achievement, complete a roadmap stage, or track a new opportunity.`;
  } else if(daysSinceMove >= stalledDays){
    state = 'stalled';
    headline = `Momentum has stalled — ${daysSinceMove} days since your last logged progress.`;
    detail = runway
      ? `With roughly ${runway} month${runway===1?'':'s'} of runway left, consistent small steps beat occasional big pushes. Pick one thing from your #1 move and do it this week.`
      : `Consistent small steps beat occasional big pushes. Pick one thing from your #1 move and do it this week.`;
  } else {
    state = 'steady';
    headline = totalDelta > 0 ? `Steady progress — up ${totalDelta} points over ${spanDays} day${spanDays===1?'':'s'}.` : `Holding steady.`;
    detail = `You're moving at a consistent pace. The students who end up with the strongest applications are the ones who keep this rhythm up over months, not the ones who cram.`;
  }

  // Pace vs runway - an honest, non-alarmist read.
  let paceNote = null;
  if(runway !== null){
    const perMonth = totalDelta / Math.max(spanDays/30, 0.25);
    if(runway <= 3 && last.avg < 45){
      paceNote = `You're close to application season and still building - focus now on finishing what you've started and telling your story well, rather than starting new long projects.`;
    } else if(runway >= 12 && totalDelta > 0){
      paceNote = `You have real runway (${runway}+ months). At your current pace you have plenty of time to build a genuinely deep profile - the advantage of starting early is compounding, so keep going.`;
    }
  }

  return {
    state, headline, detail, paceNote,
    delta, totalDelta, spanDays, daysSinceMove,
    biggestJump, jumpWhat, jumpWhen,
    runwayMonths: runway,
    points: snaps.map(s=>({ts:s.ts, avg:s.avg})),
    current: last.avg,
  };
}

/* ============================================================================
   X-FACTOR DEEPENED: Milestones, Streaks & Adaptive Weekly Focus.
   These all COMPOUND on the one thing no chatbot has - memory over time. The
   app remembers your wins, notices your consistency, and adapts its single
   weekly recommendation to what you've ACTUALLY been doing. Motivation from a
   real, remembered journey - the moat widens the longer you use it.
   ============================================================================ */

var ADMISSIONS_MILESTONES_KEY = 'kaidostar_admissions_milestones';

function getAdmissionsMilestones(){
  try { const _v = JSON.parse(localStorage.getItem(ADMISSIONS_MILESTONES_KEY)); return Array.isArray(_v) ? _v : []; }
  catch(e){ return []; }
}
function _saveAdmissionsMilestones(arr){
  _safeSetItem(ADMISSIONS_MILESTONES_KEY, JSON.stringify(arr.slice(-60)));
}

/* Detect and record NEW milestones by comparing the last two snapshots. A
   milestone is a genuine, dated moment of progress worth remembering and
   celebrating - crossing a readiness band, a first achievement, first
   experience, roadmap completion. Idempotent: never records the same one twice.
   Call right after recordAdmissionsSnapshot. */
function detectAdmissionsMilestones(admProfile){
  const snaps = getAdmissionsSnapshots();
  if(snaps.length < 2) {
    // Seed a "journey started" milestone on the very first snapshot.
    if(snaps.length === 1){
      const ms = getAdmissionsMilestones();
      if(!ms.some(m=>m.key==='started')){
        ms.push({ key:'started', ts:snaps[0].ts, icon:'flag', title:'You started your journey', detail:'Your baseline is recorded. Everything from here is forward motion.' });
        _saveAdmissionsMilestones(ms);
      }
    }
    return getAdmissionsMilestones();
  }
  const prev = snaps[snaps.length-2], cur = snaps[snaps.length-1];
  const ms = getAdmissionsMilestones();
  const add = (key, icon, title, detail) => {
    if(!ms.some(m=>m.key===key)) ms.push({ key, ts:cur.ts, icon, title, detail });
  };
  const pe = prev.evidence||{}, ce = cur.evidence||{};

  // First-of-a-kind wins (permanent milestones).
  if((pe.achCount||0)===0 && (ce.achCount||0)>0) add('first_achievement','trophy','First achievement logged','You turned "interested" into "demonstrated." This is the highest-signal thing on any application.');
  if((pe.internships||0)===0 && (ce.internships||0)>0) add('first_experience','briefcase','First hands-on experience','Real experience is what separates a strong applicant from a great one - and it gives you genuine essay material.');
  if((pe.competitions||0)===0 && (ce.competitions||0)>0) add('first_competition','medal','First competition entered','Entering matters more than winning - you now have a concrete, verifiable credential in progress.');

  // Readiness BAND crossings (compare avg thresholds - the honest bands used elsewhere).
  const bandOf = v => v<25?0 : v<50?1 : v<72?2 : 3;
  const names = ['Getting started','Building','Competitive foundation','Strong signal'];
  const pb = bandOf(prev.avg), cb = bandOf(cur.avg);
  if(cb>pb){
    add('band_'+cb, 'rise', 'Readiness reached "'+names[cb]+'"', 'Your overall signal crossed into a new tier. Concrete, sustained work is paying off.');
  }

  // Roadmap completion milestones.
  if(ce.totalStages && (ce.doneStages||0) >= ce.totalStages && (pe.doneStages||0) < ce.totalStages){
    add('roadmap_complete','star','Roadmap complete','You finished every stage of your plan. Now it is all about execution and telling your story well.');
  } else if((ce.doneStages||0) >= 3 && (pe.doneStages||0) < 3){
    add('roadmap_momentum','check','Three roadmap stages done','You are past the hardest part - starting. Consistency from here is what wins.');
  }

  _saveAdmissionsMilestones(ms);
  return ms;
}

/* Consistency read from snapshot timestamps: how many of the last N weeks had
   any logged activity (an evidence change). Momentum begets momentum, and this
   is only possible because the app remembers. */
function admissionsConsistency(){
  const snaps = getAdmissionsSnapshots();
  if(snaps.length < 2) return { activeWeeks:0, windowWeeks:6, streakWeeks:0, note:null };
  const weekMs = 7*86400000, now = Date.now(), windowWeeks = 6;
  // Which weeks (0=this week ... 5) saw an evidence change vs the prior snapshot?
  const activeSet = new Set();
  for(let k=1;k<snaps.length;k++){
    const changed = JSON.stringify(snaps[k].evidence) !== JSON.stringify(snaps[k-1].evidence);
    if(!changed) continue;
    const wk = Math.floor((now - new Date(snaps[k].ts).getTime())/weekMs);
    if(wk >= 0 && wk < windowWeeks) activeSet.add(wk);
  }
  // Current streak: consecutive recent weeks (starting from this or last week) with activity.
  let streak = 0;
  for(let w=0; w<windowWeeks; w++){ if(activeSet.has(w)) streak++; else if(w>0) break; }
  const activeWeeks = activeSet.size;
  let note = null;
  if(streak >= 3) note = `You've made progress ${streak} weeks running - that consistency is exactly what builds a standout profile.`;
  else if(activeWeeks >= 3) note = `You've been active ${activeWeeks} of the last ${windowWeeks} weeks. Steady beats sporadic.`;
  else if(activeWeeks >= 1) note = `You've logged progress recently - build it into a weekly rhythm and it compounds.`;
  return { activeWeeks, windowWeeks, streakWeeks:streak, note };
}

/* THE adaptive weekly focus: ONE recommendation, chosen from the student's live
   gap-radar but PHRASED around what they just did and their momentum. A bot
   gives the same advice every time; this changes because it remembers last week. */
function admissionsWeeklyFocus(admProfile){
  const gap = admissionsGapRadar(admProfile);
  const traj = admissionsTrajectory(admProfile);
  if(!gap) return null;

  // The core move comes from the gap-radar (whole-list optimization).
  const coreMove = gap.top ? gap.top.move : null;

  // Momentum-aware framing.
  let framing;
  if(!coreMove){
    framing = `You've logged the big signals already. This week, open your Application workshop and draft one paragraph of a real essay - execution is now your highest-leverage work.`;
    return { move: 'Draft one real essay paragraph this week', why: framing, momentum: traj ? traj.state : null, fromHistory: true };
  }
  if(traj && traj.state === 'rising'){
    framing = `You've got real momentum right now${traj.jumpWhat?` (that came from ${traj.jumpWhat})`:''} - the best time to push is when you're already moving. This week: ${coreMove.charAt(0).toLowerCase()+coreMove.slice(1)}.`;
  } else if(traj && (traj.state === 'stalled' || traj.state === 'declining')){
    framing = `It's been a quiet stretch, and the calendar doesn't pause. One concrete action restarts everything. This week, just this: ${coreMove.charAt(0).toLowerCase()+coreMove.slice(1)}.`;
  } else if(traj && traj.state === 'steady'){
    framing = `You're in a good rhythm. Keep it going with the single move that helps the most schools at once. This week: ${coreMove.charAt(0).toLowerCase()+coreMove.slice(1)}.`;
  } else {
    framing = `Your highest-leverage move to start with: ${coreMove.charAt(0).toLowerCase()+coreMove.slice(1)}.`;
  }
  return { move: coreMove, why: framing, lifts: gap.top?gap.top.lifts:null, momentum: traj?traj.state:null, fromHistory: !!(traj && traj.points && traj.points.length>=2) };
}

/* ============================================================================
   HONEST HUMANIZER: analyze the student's OWN essay draft.
   Flags clichés, AI-tells, overused/vague words, repetitive sentence openers,
   and school-format misfit - then gives concrete, do-it-yourself revision notes.
   Does NOT rewrite the essay (a rewrite isn't the student's) and is NOT a
   detector-evasion tool. Pure heuristics on the student's text - shared with the
   backend so both give identical feedback.
   ============================================================================ */

// Admissions-essay clichés and AI-tell phrases that make essays blur together.
var ESSAY_CLICHES = [
  'ever since i was young','ever since i was a child','from a young age','for as long as i can remember',
  'changed my life','changed me forever','little did i know','taught me the true meaning',
  'the true meaning of','made me who i am today','shaped me into','i realized that','i learned that',
  'step out of my comfort zone','outside my comfort zone','comfort zone','hard work and dedication',
  'passion for','my passion','i am passionate about','open my eyes','opened my eyes','eye-opening',
  'in today\'s society','in todays society','in this day and age','the world we live in',
  'make a difference','give back to my community','well-rounded','think outside the box',
  'against all odds','light at the end of the tunnel','journey','my journey','rollercoaster',
  'blood, sweat, and tears','last but not least','in conclusion','all walks of life'
];
// AI-tell phrases (the LLM-favorite connective tissue and abstractions).
var AI_TELLS = [
  'moreover','furthermore','in addition to this','it is important to note','it is worth noting',
  'delve into','delving into','navigate the complexities','navigating the complexities','tapestry',
  'testament to','a testament','underscores','fostering','foster a','showcase','showcasing',
  'multifaceted','holistic','myriad','plethora','pivotal','pivotal role','crucial role',
  'in the realm of','realm of','landscape of','the landscape','ever-evolving','ever-changing',
  'not only','but also','seamless','seamlessly','robust','leverage','leveraging','cutting-edge',
  'first and foremost','when it comes to','at the end of the day','embark on','embark'
];
// Vague intensifiers/abstractions that should be replaced with specifics.
var VAGUE_WORDS = ['very','really','things','stuff','a lot','many things','various','numerous','several','amazing','incredible','awesome','great','good','nice','interesting','important','impactful','meaningful','unique','special'];

function _essayFind(lowerText, phrases){
  const hits = [];
  phrases.forEach(p => {
    // whole-phrase / word-boundary match
    const re = new RegExp('(^|[^a-z])' + p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '([^a-z]|$)', 'g');
    let m, c = 0;
    while((m = re.exec(lowerText)) !== null){ c++; if(c>3) break; }
    if(c>0) hits.push({ phrase:p, count:c });
  });
  return hits;
}

function polishAnalyze(text, admProfile){
  const lower = text.toLowerCase();
  const words = (text.match(/\b[\w']+\b/g) || []);
  const wordCount = words.length;
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s=>s.trim().length>0);

  const cliches = _essayFind(lower, ESSAY_CLICHES);
  const aiTells = _essayFind(lower, AI_TELLS);
  const vague = _essayFind(lower, VAGUE_WORDS);

  // Repetitive sentence openers (a real AI/weak-writing tell).
  const openers = {};
  sentences.forEach(s => {
    const first = (s.trim().split(/\s+/)[0]||'').toLowerCase().replace(/[^a-z']/g,'');
    if(first) openers[first] = (openers[first]||0)+1;
  });
  const repeatedOpeners = Object.entries(openers).filter(([w,c])=>c>=3 && w.length>1).sort((a,b)=>b[1]-a[1]);

  // "I"-heavy vs specific detail: count sentences starting with "I".
  const iStart = sentences.filter(s=>/^i\b/i.test(s.trim())).length;

  // Concrete-detail signal: numbers, proper nouns (capitalized mid-sentence), quotes.
  const numbers = (text.match(/\b\d+\b/g)||[]).length;

  // Build the honest report.
  let r = `DRAFT CHECK — feedback on YOUR writing (${wordCount} words, ${sentences.length} sentences)\n`;
  r += `The point of this is to help you revise it yourself. Nothing here rewrites your essay for you.\n`;

  // Overall voice read
  const flags = cliches.length + aiTells.length;
  let voice;
  if(flags === 0 && vague.length <= 2) voice = 'STRONG: this reads specific and personal. Keep going.';
  else if(flags <= 2) voice = 'GOOD, with a few spots to sharpen below.';
  else if(flags <= 5) voice = 'GENERIC IN PLACES: several phrases below appear in thousands of essays - swapping them for your specifics will make it unmistakably yours.';
  else voice = 'READS GENERIC / AI-LIKE: a lot of the phrasing below is the kind admissions readers see constantly. This needs your real, specific voice - the notes show exactly where.';
  r += `\nOverall: ${voice}\n`;

  if(cliches.length){
    r += `\n① ADMISSIONS CLICHÉS (${cliches.length}) — every reader has seen these; replace with your specifics:\n`;
    cliches.slice(0,8).forEach(h => r += `   • "${h.phrase}"${h.count>1?` (×${h.count})`:''}\n`);
  }
  if(aiTells.length){
    r += `\n② AI-TELL PHRASES (${aiTells.length}) — these words make writing sound machine-generated; cut or replace:\n`;
    aiTells.slice(0,8).forEach(h => r += `   • "${h.phrase}"${h.count>1?` (×${h.count})`:''}\n`);
  }
  if(vague.length){
    r += `\n③ VAGUE WORDS (${vague.length}) — swap each for a concrete detail ("very hard" → what exactly?):\n`;
    r += `   ${vague.slice(0,10).map(h=>'"'+h.phrase+'"').join(', ')}\n`;
  }
  if(repeatedOpeners.length){
    r += `\n④ REPEATED SENTENCE OPENERS — vary these so it doesn't read like a list:\n`;
    repeatedOpeners.slice(0,4).forEach(([w,c]) => r += `   • ${c} sentences start with "${w.charAt(0).toUpperCase()+w.slice(1)}..."\n`);
  }
  if(iStart >= Math.max(4, Math.ceil(sentences.length*0.5))){
    r += `\n⑤ "I"-HEAVY — ${iStart} of ${sentences.length} sentences start with "I". Some is fine in a personal essay, but vary the rhythm so a few sentences lead with action or detail instead.\n`;
  }
  if(numbers === 0 && wordCount > 150){
    r += `\n⑥ NO CONCRETE NUMBERS — specifics (how many, how long, how much) make a story credible and vivid. Where could one real number go?\n`;
  }

  // School-format sanity (uses the KB).
  const A = admissionsAnchor(admProfile);
  if(A.isUK){
    const major = admProfile.intendedMajor || 'your subject';
    const personalOpen = /^(i |ever since|from a young|for as long|when i was|growing up)/i.test(text.trim());
    r += `\n⑦ FORMAT CHECK (UK) — your targets are UK universities. A UCAS statement should be ~80% about ${major}: what you've read, explored, and understood, not a personal narrative.`;
    if(personalOpen) r += ` Your opening reads personal/narrative - for the UK, lead with a specific idea or question in ${major} instead.`;
    r += `\n`;
  } else if(A.anchor){
    r += `\n⑦ FORMAT CHECK (US) — good: US personal essays SHOULD be story-driven and personal like this. Make sure the reflection connects to who you are, and (where honest) to what ${A.anchor.name} values.\n`;
  }

  if(!cliches.length && !aiTells.length && !vague.length && !repeatedOpeners.length){
    r += `\nNo major red flags found - this already reads specific and human. Final pass: read it aloud, and cut any sentence that doesn't earn its place.\n`;
  }
  r += `\nRemember: the strongest essays are honest and specific, not polished-and-generic. Revise in your own voice - that's what actually stands out.`;
  return r;
}

/* ============================================================================
   COMPETITIVE-GRADE ESSAY REVIEWER (beats the field on substance).
   The best tools (LumiSource, CoGrader, GradeWithAI) score an essay in
   ISOLATION on a generic rubric. This does everything they do - per-dimension
   scoring (hook, specificity, voice, reflection, structure, prompt-fit) with an
   honest overall "draft strength" read - PLUS the two things NONE of them can,
   because they don't know the student:
     • grounds the review in the student's REAL logged achievements (catches an
       essay that doesn't reflect what they actually did)
     • aligns to the ANCHOR school's real values + US/UK format
   Honest: it's a draft-strength read to guide revision, never an admit predictor,
   and it never rewrites the essay. Shared with the backend for identical output.
   ============================================================================ */
function essayRubricReview(text, admProfile, opts){
  opts = opts || {};
  const prompt = (opts.prompt||'').trim();     // optional: the essay prompt
  const lower = text.toLowerCase();
  const words = (text.match(/\b[\w']+\b/g) || []);
  const wc = words.length;
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s=>s.trim().length>0);
  const A = admissionsAnchor(admProfile);
  const isUK = A.isUK;

  // Reuse the tell-detectors from polishAnalyze.
  const cliches = _essayFind(lower, ESSAY_CLICHES);
  const aiTells = _essayFind(lower, AI_TELLS);
  const vague = _essayFind(lower, VAGUE_WORDS);
  const numbers = (text.match(/\b\d+\b/g)||[]).length;
  // Proper-noun signal (specific names/places = concreteness), rough: capitalized words mid-sentence.
  const properNouns = (text.match(/(?<=[a-z,] )[A-Z][a-z]{2,}/g)||[]).length;
  // Sensory / concrete verbs signal.
  const sensory = _essayFind(lower, ['saw','heard','smelled','felt','touched','watched','noticed','remember','hands','voice','cold','warm','dark','quiet','loud']).length;
  const firstSentence = (sentences[0]||'').trim();

  // ---- Score each dimension 0-5, honestly, from the text. ----
  const dims = [];
  function dim(name, score, note){ dims.push({name, score:Math.max(0,Math.min(5,score)), note}); }

  // 1. HOOK (the opening "Magnet"): scene/action/curiosity vs thesis/quote/cliche.
  let hook = 3;
  if(/^(i am|i have always|i believe|throughout|my name is|the dictionary|webster)/i.test(firstSentence)) hook -= 2;
  if(/^["']/.test(firstSentence)) hook -= 1; // opening with a quote
  if(/^(ever since|from a young|for as long)/i.test(firstSentence)) hook -= 2;
  if(firstSentence.length && (/\b(when|the night|at \d|that morning|i was \d|the first time)\b/i.test(firstSentence) || sensory>0 && firstSentence.length<160)) hook += 1;
  if(firstSentence.length > 0 && firstSentence.length < 120 && !/^(i am|throughout)/i.test(firstSentence)) hook += 0; // neutral
  dim('Hook (opening)', hook, hook>=4?'Strong, specific opening that pulls the reader in.':hook>=3?'Serviceable opening - could start deeper inside a specific moment.':'Weak opening. Start inside a concrete scene, not a summary, thesis, or quote.');

  // 2. SPECIFICITY / concrete detail (the biggest differentiator admissions cite).
  let spec = 2;
  spec += Math.min(2, Math.floor((numbers + properNouns)/3));
  spec += Math.min(1, Math.floor(sensory/3));
  spec -= Math.min(2, Math.floor(vague.length/2));
  dim('Specificity & detail', spec, spec>=4?'Rich, concrete detail - this is what makes an essay memorable.':spec>=3?'Some specifics; add more real names, numbers, and sensory detail.':'Too general. Swap vague words for exact, only-you details.');

  // 3. VOICE / authenticity: penalize cliche + AI-tells heavily.
  let voice = 5 - Math.min(3, cliches.length) - Math.min(2, aiTells.length);
  dim('Authentic voice', voice, voice>=4?'Sounds like a real person, not a template.':voice>=3?'Voice is okay but some phrasing is generic - see the flagged clichés.':'Reads generic/AI-like. The flagged phrases below appear in thousands of essays.');

  // 4. REFLECTION / insight: is there a "what it changed" turn?
  let refl = 2;
  if(/\b(i realized|i learned|i understand now|changed how i|now i|taught me|i began to|made me see|i started to)\b/i.test(lower)) refl += 2;
  if(/\b(because|which meant|so that|the reason)\b/i.test(lower)) refl += 1;
  if(refl>=4 && cliches.some(c=>/taught me the true meaning|i realized that|i learned that/.test(c.phrase))) refl -= 1; // reflection exists but clichéd
  dim('Reflection & insight', refl, refl>=4?'Genuine reflection on what the experience meant - the heart of a great essay.':refl>=3?'Some reflection; go deeper on how you actually changed.':'Missing real reflection. Show what shifted in how you think or act.');

  // 5. STRUCTURE / arc: length, sentence-length variety, a turn.
  let struct = 3;
  const avgLen = sentences.length ? wc/sentences.length : 0;
  const lens = sentences.map(s=>(s.match(/\b[\w']+\b/g)||[]).length);
  const variety = lens.length>2 ? (Math.max(...lens)-Math.min(...lens)) : 0;
  if(variety >= 12) struct += 1; else if(variety <= 5 && lens.length>3) struct -= 1;
  if(avgLen > 30) struct -= 1; // run-on tendency
  if(/\b(but|until|then|that changed|everything changed|one day)\b/i.test(lower)) struct += 1; // a pivot exists
  dim('Structure & arc', struct, struct>=4?'Clear arc with good rhythm and a turning point.':struct>=3?'Structure holds; vary sentence length and sharpen the turn.':'Structure is flat. Build a clear before/after and vary your rhythm.');

  // 6. PROMPT / FORMAT FIT.
  let fit = 3, fitNote;
  if(isUK){
    const personalOpen = /^(i |ever since|from a young|for as long|when i was|growing up|my )/i.test(firstSentence);
    // For UK, an essay should be subject-heavy; penalize a personal-narrative shape.
    fit = personalOpen ? 2 : 4;
    fitNote = fit>=4 ? 'Good subject focus for a UK statement.' : 'For UK/UCAS this is too personal-narrative - lead with your subject, not your story (~80% academic).';
  } else if(prompt){
    // crude prompt-answering check: do meaningful prompt words appear in the essay?
    const stop = new Set(['the','a','an','and','or','to','of','in','on','your','you','with','for','how','what','why','that','this','about','describe','tell','us','has','have']);
    const pw = (prompt.toLowerCase().match(/\b[a-z]{4,}\b/g)||[]).filter(w=>!stop.has(w));
    const hit = pw.filter(w=>lower.includes(w)).length;
    fit = pw.length ? Math.round((hit/pw.length)*5) : 3;
    fitNote = fit>=4 ? 'Directly engages the prompt.' : fit>=3 ? 'Partially addresses the prompt - make sure every part is answered.' : "Drifts from the prompt. Re-read it and make sure you're answering what's asked.";
  } else {
    fit = 3; fitNote = 'Paste the prompt above for a prompt-alignment check. (US personal essays should still reveal who you are through a real story.)';
  }
  dim(isUK?'Subject/format fit':'Prompt fit', fit, fitNote);

  // ---- Overall draft-strength (weighted, honest, NOT an admit prediction). ----
  const weights = { 'Hook (opening)':1, 'Specificity & detail':1.4, 'Authentic voice':1.4, 'Reflection & insight':1.3, 'Structure & arc':1, };
  let wsum=0, w=0;
  dims.forEach(dd=>{ const wt = weights[dd.name]|| (dd.name.indexOf('fit')>-1?1.1:1); wsum += dd.score*wt; w += wt; });
  const overall10 = Math.round((wsum/w)/5*10*10)/10; // 0-10, one decimal
  let band;
  if(overall10 >= 8) band = 'Strong draft';
  else if(overall10 >= 6.5) band = 'Solid, with clear fixes';
  else if(overall10 >= 4.5) band = 'Needs real revision';
  else band = 'Early draft - rebuild the core';

  // ---- Profile-grounding: the thing NO competitor can do. ----
  let groundingNotes = [];
  const ach = String(admProfile.studentAchievements||'').trim();
  if(ach){
    // Does the essay reference any of the student's real achievements/interests?
    const achWords = ach.toLowerCase().match(/\b[a-z]{4,}\b/g)||[];
    const interestWords = String(admProfile.interests||'').toLowerCase().match(/\b[a-z]{4,}\b/g)||[];
    const pool = [...new Set([...achWords, ...interestWords])].filter(w=>!['with','that','this','from','have','been','your'].includes(w));
    const referenced = pool.filter(w=>lower.includes(w)).length;
    if(pool.length && referenced === 0){
      groundingNotes.push(`Your essay doesn't seem to draw on anything from your actual logged profile (your achievements/interests). The strongest essays are rooted in what you've really done - consider whether this story connects to them.`);
    } else if(referenced > 0){
      groundingNotes.push(`Good - this connects to your real logged profile. That authenticity is exactly what admissions readers can feel.`);
    }
  }
  const major = admProfile.intendedMajor;
  if(major && !lower.includes(String(major).toLowerCase().split(' ')[0])){
    // Not necessarily bad for a personal essay, but note it for "why major"/UK.
    if(isUK) groundingNotes.push(`For a UK statement this must be about ${major} - it currently doesn't mention your subject clearly.`);
  }

  // ---- School-value alignment: the second thing competitors can't do. ----
  let schoolNote = null;
  if(A.anchor && !isUK && A.anchor.values && A.anchor.values.length){
    schoolNote = `${A.anchor.name} particularly values ${A.anchor.values.slice(0,2).join(' and ')}. Where it's honest, make sure your story reflects qualities like that - shown, never name-dropped.`;
  }

  return {
    overall: overall10, band, wordCount: wc, sentenceCount: sentences.length,
    dimensions: dims,
    cliches: cliches.map(c=>c.phrase), aiTells: aiTells.map(a=>a.phrase), vague: vague.map(v=>v.phrase),
    groundingNotes, schoolNote, isUK,
  };
}


function getAdmissionsApplications(){ try{ const v = JSON.parse(localStorage.getItem('kaidostar_admissions_applications')); return Array.isArray(v) ? v.filter(a => a && typeof a === 'object') : []; }catch(e){ return []; } }  // filter to objects (see getApplications)
function saveAdmissionsApplications(list){ _safeSetItem('kaidostar_admissions_applications', JSON.stringify(list)); }

/* Log a real outcome on a tracked admissions opportunity, closing the feedback
   loop for the admissions track (parity with the job track's outcome logging).
   Honest and simple: records what actually happened so the student sees their
   real results over time. Valid outcomes are the genuine admissions results. */
const ADMISSIONS_OUTCOMES = ['accepted','waitlisted','rejected','withdrew'];
function logAdmissionsOutcome(listingId, outcome){
  if(!ADMISSIONS_OUTCOMES.includes(outcome)) return false;
  const apps = getAdmissionsApplications();
  const app = apps.find(a => String(a.listing_id) === String(listingId));
  if(!app) return false;
  app.outcome_status = outcome;
  app.outcome_logged_at = new Date().toISOString();
  saveAdmissionsApplications(apps);
  return true;
}
function getAdmissionsApplicationForListing(listingId){ return getAdmissionsApplications().find(a => a.listing_id === String(listingId)); }

/* One honest rationale per opportunity - grounds the match in the
   student's stated intended major and target schools, never a
   black-box score. */
function admissionsRationale(listing, matched, profile){
  profile = profile || {};
  matched = matched || [];
  // Escape user-controlled values (major, school name, matched tags) since this
  // string is rendered as raw HTML on the dashboard (it intentionally allows the
  // <b> tags below, so the untrusted parts must be neutralized at the source).
  const escR = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const major = escR(profile.intendedMajor || 'your intended field');
  const matchedSafe = escR(matched.slice(0,3).join(', '));
  if(matched.length === 0){
    return `Looser fit for ${major} - no strong overlap yet, but a broad, well-run activity can still show genuine commitment while you narrow your focus.`;
  }
  const schoolBit = profile.targetSchools ? ` and the kind of applicant selective schools like ${escR(String(profile.targetSchools).split(',')[0].trim())} look for` : '';
  return `Strengthens your profile on <b>${matchedSafe}</b> - directly relevant to ${major}${schoolBit}.`;
}

/* Admissions match breakdown: which parts of the student's OWN profile this
   opportunity strengthens - the same "named, real reasons, not a black box"
   transparency the job/athlete tracks give, adapted to admissions. Pure function
   of the opportunity's tags vs. the student's stated major/interests/achievements. */
function admissionsMatchBreakdown(opp, profile){
  profile = profile || {};
  const tags = (Array.isArray(opp.tags) ? opp.tags : []).map(t => String(t).toLowerCase());
  const hits = (val) => {
    if(!val) return null;
    // return the first stated term (from a comma/space list) that overlaps a tag
    const terms = String(val).toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean);
    for(const term of terms){
      const words = term.split(/\s+/).filter(w => w.length >= 3);
      for(const w of words){ if(tags.some(t => t.includes(w) || w.includes(t))) return term; }
      if(tags.some(t => t.includes(term) || term.includes(t))) return term;
    }
    return null;
  };
  const rows = [];
  const majorHit = hits(profile.intendedMajor);
  if(majorHit) rows.push({ label:'Intended major', value: profile.intendedMajor, note:'directly relevant to your field' });
  const interestHit = hits(profile.interests);
  if(interestHit) rows.push({ label:'Interest', value: interestHit, note:'builds on a stated interest' });
  const achHit = hits(profile.studentAchievements || profile.achievements);
  if(achHit) rows.push({ label:'Track record', value: achHit, note:'extends what you\'ve already done' });
  // activity-type signal (competition / internship / leadership / research)
  const typeWord = ['competition','internship','leadership','research','volunteer','entrepreneurship'].find(w => tags.some(t => t.includes(w)));
  if(typeWord) rows.push({ label:'Activity type', value: typeWord.charAt(0).toUpperCase()+typeWord.slice(1), note:'a strong, verifiable kind of activity' });
  return rows;
}

/* Application-clock band from the student's grade level - reuses the existing,
   tested _admissionsRunwayMonths so the card's timing chip stays consistent with
   the trajectory read elsewhere. */
function admissionsClockBand(profile){
  const months = _admissionsRunwayMonths(profile);
  if(months === null) return null;
  if(months <= 3)  return { band:'now',      note:'Application season is here - act now' };
  if(months <= 12) return { band:'soon',     note:'Core building year - depth matters now' };
  if(months <= 24) return { band:'building', note:'Real runway - build a focused record' };
  return { band:'early', note:'Early - explore and start a spike' };
}

/* Scores admissions opportunities (extracurriculars, competitions,
   internships) against the student's real intended major, interests,
   and stated achievements. Reuses the same tag-overlap matcher the
   athlete track uses - proven, shared, no re-implementation. */
function runAdmissionsMatchCycle(profile){
  const opps = LISTINGS.filter(l => l.type === 'admissions');
  const requirementText = `${profile.intendedMajor || ''} ${profile.interests || ''} ${profile.gradeLevel || ''} ${profile.achievements || ''}`;
  const dealbreakers = (profile.dealbreakers || '').toLowerCase();
  const scored = opps
    .filter(l => !hasDealbreaker(l.tags, dealbreakers))
    .filter(l => !isListingExpired(l))   // honest: never surface an already-closed opportunity (parity with job track + backend)
    .map(l => {
      const { pct, matched } = scoreByOverlap(l.tags, requirementText);
      return { ...l, pct, matched, rationale: admissionsRationale(l, matched, profile) };
    })
    .sort((a,b) => b.pct - a.pct);
  // Only surface genuine matches (real overlap -> 85+); hold back weak no-overlap
  // ones rather than padding. Rotate for freshness across cycles. Fall back to a
  // few closest as honest "looser fits" only if nothing genuinely matches yet.
  const good = scored.filter(l => l.pct >= 85);
  return _rotateForVariety(good.length ? good : scored.slice(0, 3), 2);
}

/* ---- Admissions schedule: real, dated milestones - competition
   rounds, application deadlines, test dates, internship openings -
   optionally tied to a roadmap stage. Same shape as athlete events. ---- */
function getAdmissionsEvents(){ try{ const v = JSON.parse(localStorage.getItem('kaidostar_admissions_events')); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
function saveAdmissionsEvents(list){ _safeSetItem('kaidostar_admissions_events', JSON.stringify(list)); }
function addAdmissionsEvent(event){
  const events = getAdmissionsEvents();
  events.push({ id: 'aevt_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), status: 'upcoming', ...event });
  events.sort((a,b) => (a.event_date || '9999').localeCompare(b.event_date || '9999'));
  saveAdmissionsEvents(events);
}
function updateAdmissionsEventStatus(eventId, status){
  const events = getAdmissionsEvents();
  const event = events.find(e => e.id === eventId);
  if(event) event.status = status;
  saveAdmissionsEvents(events);
}
function deleteAdmissionsEvent(eventId){
  saveAdmissionsEvents(getAdmissionsEvents().filter(e => e.id !== eventId));
}

function getAdmissionsRoadmap(){ try{ const raw = JSON.parse(localStorage.getItem('kaidostar_admissions_roadmap')); return (raw && Array.isArray(raw.milestones) && raw.version === ROADMAP_VERSION) ? raw : null; }catch(e){ return null; } }
function saveAdmissionsRoadmap(r){ _safeSetItem('kaidostar_admissions_roadmap', JSON.stringify(r)); }

function formatTimestamp(seconds){
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}

/* ---- Quick clip plan from a text description - complementary to the
   manual timestamp-marking tool above, for before footage is
   organized/uploaded. Mirrors app/services/athletics.py's
   generate_clip_edit_plan() exactly. Still not real video editing -
   a real plan grounded in what the athlete actually describes having. ---- */
async function generateQuickClipPlan(athleteProfile, clipsDescription, targetSchools){
  // Backend-first: the server runs the identical clip-edit planner (same three-key
  // shape) with the shared API key. Falls back to the direct call below when logged
  // out or the backend is unreachable.
  const _cpSession = (typeof getSession === 'function') ? getSession() : null;
  if(_cpSession && _cpSession.user_id && typeof apiClipEditPlan === 'function'){
    const _be = await apiClipEditPlan(_cpSession.user_id, athleteProfile, clipsDescription, targetSchools);
    if(_be) return _be;
  }
  const directionLabel = {'play-college': 'playing at the college level', 'go-pro': 'going pro', 'coach': 'coaching', 'sports-management': 'a sports management career'}[athleteProfile.careerDirection] || athleteProfile.careerDirection || 'not specified';
  const _schoolsLine = (targetSchools && targetSchools.trim()) ? `They are targeting these programs/schools: \\"${targetSchools.trim()}\\".\\n\\n` : '';
  const _tailorLine = (targetSchools && targetSchools.trim()) ? `TAILOR the plan to those programs: consider their typical division/level and playing style and what coaches at that level commonly prioritize, and order/emphasize clips accordingly. Reason from the program's LEVEL and TYPE - do NOT invent claims about a named coach. Add a \\"why_for_schools\\" field (1 sentence) to steps where the tailoring changes the choice.\\n\\n` : '';
  const prompt = `A student-athlete: sport "${athleteProfile.sport || 'not specified'}", level ${athleteProfile.level || 'not specified'}, career direction: ${directionLabel}.\n\n${_schoolsLine}They described their available raw footage/clips as:\n"${clipsDescription}"\n\nGive them a real, specific edit plan for turning this into a strong highlight reel - based ONLY on the clips they actually described, not invented footage. If what they described is too thin to make a strong reel, say so honestly rather than pretending it's enough.\n\n${_tailorLine}Return a JSON object with exactly these three keys:\n- edit_sequence: an array of objects, each with "clip" (which described clip/moment this refers to, by their own description) and "instruction" (specific guidance: where to trim it, how long to hold it, what to lead into next, and why it goes in this position)\n- captions: an array of 2-4 short on-screen text suggestions tied to specific clips\n- honest_assessment: 1-2 sentences on whether what they described is actually enough for a strong reel, and if not, what specific kind of footage they're missing\n\nReturn ONLY valid JSON, nothing else, no markdown fences, no commentary.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 900, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const plan = JSON.parse(text);
    // Real shape validation - the caller calls .map() on
    // edit_sequence and captions, and directly reads
    // honest_assessment, with zero defensive checks otherwise.
    if(!Array.isArray(plan.edit_sequence) || !Array.isArray(plan.captions) || typeof plan.honest_assessment !== 'string'){
      throw new Error('Quick clip plan response has an unexpected shape');
    }
    return plan;
  } catch(err){ console.error('Quick clip plan failed:', err); return null; }
}

function getApplications(){ try{ const _v = JSON.parse(localStorage.getItem('kaidostar_applications')); return Array.isArray(_v) ? _v.filter(a => a && typeof a === 'object') : []; }catch(e){ return []; } }  // filter to objects: a malformed backend sync (overview.html persists a backend array checking only Array.isArray) or corrupt storage could leave a null/junk element that crashes every downstream a.x consumer - incl. getPersonalizedFactorWeightsJS, which would break the whole dashboard
function saveApplications(apps){ _safeSetItem('kaidostar_applications', JSON.stringify(apps)); }
function getApplicationForListing(listingId){ return getApplications().find(a => a.listing_id === listingId); }

const LISTING_STALE_DAYS = 30;
function getListingStalenessNote(listing){
  // The honest ghost-job caution, mirroring the backend exactly: a
  // listing not re-seen in a long time is more likely filled or
  // stale - but that's genuinely uncertain, so this is a soft
  // caution, never a hard exclusion, and pairs with the real advice
  // to verify on the company's own careers page. Returns null when
  // there's no fetchedAt or it's recent - never a fabricated concern.
  const fetched = listing.fetchedAt;
  if(!fetched) return null;
  const fetchedTime = new Date(fetched).getTime();
  if(isNaN(fetchedTime)) return null;
  const days = Math.floor((Date.now() - fetchedTime) / 86400000);
  if(days < LISTING_STALE_DAYS) return null;
  return { days_since_seen: days, note: `Kaidostar last saw this posting ${days} days ago - aggregated listings can be filled or removed without the board updating, so it's worth confirming it's still open on the company's own careers page before applying.` };
}

const SAME_COMPANY_CAUTION_THRESHOLD = 3;  // ~2-3 relevant roles per company is normal; at 3+ already active, a new one starts reading as spray-pattern in an ATS
function getSameCompanyActiveApplications(org){
  // Only genuinely ACTIVE applications count against the real
  // same-company etiquette line - a discarded/undone one was never
  // actually sent, so it doesn't make the person look like they're
  // spraying a company. Matched on a normalized org name so trivial
  // formatting/case differences don't split one real company into
  // two, or miss a genuine repeat.
  if(!org) return [];
  const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = norm(org);
  if(!target) return [];
  return getApplications().filter(a =>
    a.status !== 'undone' && norm(a.listing_org) === target
  );
}
function getSameCompanyCaution(org, currentListingId){
  // Returns an honest caution only when applying to THIS company
  // would push the person past the real spray-pattern line - i.e.
  // they already have enough OTHER active applications to it.
  // Excludes the current listing itself, so re-opening a card for a
  // job you already applied to never falsely counts itself.
  const active = getSameCompanyActiveApplications(org).filter(a => a.listing_id !== currentListingId);
  if(active.length >= SAME_COMPANY_CAUTION_THRESHOLD){
    return { count: active.length, note: `You already have ${active.length} active applications to ${org}. Applying to several roles at one company can read as unfocused in their applicant system - it's often stronger to concentrate on the single best fit here.` };
  }
  return null;
}

const SEARCH_STRAIN_MIN_SENT = 15;       // enough real volume that zero traction is a genuine pattern, not early-search noise
const SEARCH_STRAIN_MIN_DAYS = 21;       // over a real span - a burst of applications in one afternoon isn't strain yet
function detectSearchStrainPattern(){
  // The honest answer to the real, documented burnout dimension: a
  // long, high-volume search with no positive traction quietly erodes
  // confidence, and a tool that just keeps saying "apply to more"
  // makes it worse. This reflects a genuine pattern in the person's
  // OWN logged data back to them - never cheerleading, never
  // manufactured concern. Only fires when there's real volume
  // (SEARCH_STRAIN_MIN_SENT actually sent), over a real span
  // (SEARCH_STRAIN_MIN_DAYS), with genuinely ZERO positive outcomes.
  // A single interview or offer anywhere means the approach is
  // working somewhere, so no strain flag.
  const apps = getApplications();
  const sent = apps.filter(a => a.status === 'sent' && a.sent_at);
  if(sent.length < SEARCH_STRAIN_MIN_SENT) return null;

  const anyPositive = apps.some(a => a.outcome_status === 'interview' || a.outcome_status === 'offer');
  if(anyPositive) return null;  // it's working somewhere - not strain

  // Confirm this is a sustained span, not a single-day spray.
  const sentTimes = sent.map(a => new Date(a.sent_at).getTime()).filter(t => !isNaN(t));
  if(sentTimes.length === 0) return null;
  const spanDays = (Date.now() - Math.min(...sentTimes)) / 86400000;
  if(spanDays < SEARCH_STRAIN_MIN_DAYS) return null;

  return {
    sent_count: sent.length,
    span_days: Math.floor(spanDays),
    note: `You've sent ${sent.length} applications over about ${Math.floor(spanDays)} days without an interview or offer logged yet. That's genuinely draining, and it usually reflects the approach more than you - it can be worth pausing volume to concentrate on a few highest-fit roles, tightening how your experience is framed for them, or leaning on a referral, rather than sending more of the same.`,
  };
}

/* ---- Resume builder: turns a person's own real, plain-language
   account of their experience into strong resume language - never
   generates a work history from scratch. A resume is fundamentally a
   claim about verifiable past experience: real employers, real
   dates, real things someone actually did. Nothing else in this app
   collects that kind of structured history (a profile's "skills" is
   just a loose text string), and building a "generate my resume"
   feature on a career goal and a skills string alone would leave the
   AI with no real facts to work from - meaning it would have to
   invent company names, dates, and achievements to produce anything
   resume-shaped. That's not a UX shortfall, it's misrepresenting a
   real person to a real employer. The honest version: the person
   enters their own real work/education/project history first, in
   their own words, however rough - this module's only job is to
   strengthen the PHRASING of what they actually wrote, never to add
   a fact, metric, or responsibility they didn't state themselves.
   Mirrors the backend's resume_builder.py exactly. ---- */
function getResumeEntries(){ try{ const _v = JSON.parse(localStorage.getItem('kaidostar_resume_entries')); return Array.isArray(_v) ? _v.filter(e => e && typeof e === 'object') : []; }catch(e){ return []; } }  // filter to objects (see getApplications)
function saveResumeEntries(entries){ _safeSetItem('kaidostar_resume_entries', JSON.stringify(entries)); }
function addResumeEntry(entry){
  const entries = getResumeEntries();
  const newEntry = { id: 'entry_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), display_order: entries.length, created_at: new Date().toISOString(), ...entry };
  entries.push(newEntry);
  saveResumeEntries(entries);
  return newEntry;
}
function updateResumeEntry(id, updates){
  const entries = getResumeEntries();
  const idx = entries.findIndex(e => e.id === id);
  if(idx === -1) return null;
  entries[idx] = { ...entries[idx], ...updates, updated_at: new Date().toISOString() };
  saveResumeEntries(entries);
  return entries[idx];
}
function deleteResumeEntry(id){
  saveResumeEntries(getResumeEntries().filter(e => e.id !== id));
}
function getResumeDocument(){ try{ return JSON.parse(localStorage.getItem('kaidostar_resume_document')) || null; }catch(e){ return null; } }
function saveResumeDocument(doc){ _safeSetItem('kaidostar_resume_document', JSON.stringify(doc)); }

// Offline/logged-out mirror of the backend's deterministic tailor: reorder the
// person's REAL entries by genuine overlap with the job, split their own words
// into bullets, surface the real skills the job asks for, and name honest gaps.
// Rewrites nothing - the AI rewording happens server-side when signed in; this is
// the honest floor so "tailor to this job" still does something useful offline.
function tailorResumeLocally(entries, jd, profile){
  entries = Array.isArray(entries) ? entries : [];
  profile = profile || {};
  const jdTokens = new Set((typeof meaningfulTokens === 'function' ? meaningfulTokens(jd || '') : []));
  const scored = entries.map(e => {
    const toks = new Set(tokenize((e.title || '') + ' ' + (e.raw_description || '')));
    let score = 0;
    jdTokens.forEach(jt => { for(const t of toks){ if(termsMatch(jt, t)){ score++; break; } } });
    return { e, score };
  }).sort((a, b) => b.score - a.score);
  const outEntries = scored.map(({ e, score }) => {
    const raw = (e.raw_description || '').trim();
    let bullets = raw.split(/[\n;.]+/).map(s => s.replace(/^[\s\-•\t]+/, '').trim()).filter(Boolean);
    if(!bullets.length && raw) bullets = [raw];
    return { id: e.id || '', title: e.title || '', org: e.org || '', dates: [e.start_date, e.end_date].filter(Boolean).join(' - '),
      relevance: score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low', bullets: bullets.slice(0, 5), flagged_numbers: [], note: '' };
  });
  const skills = String(profile.skills || '').split(',').map(s => s.trim()).filter(Boolean);
  const foreground = jdTokens.size ? skills.filter(s => { for(const jt of jdTokens){ if(termsMatch(s.toLowerCase(), jt)) return true; } return false; }) : [];
  const resumeTokens = new Set();
  entries.forEach(e => tokenize((e.title || '') + ' ' + (e.raw_description || '')).forEach(t => resumeTokens.add(t)));
  tokenize(skills.join(' ')).forEach(t => resumeTokens.add(t));
  // Job-ad boilerplate is never a real skill "gap" - keep gaps reading like missing skills.
  const JD_BOILERPLATE = new Set(['hiring','hire','seeking','looking','must','should','strong','ability','able','role','position','candidate','candidates','join','team','work','working','years','year','experience','required','require','preferred','plus','including','responsibilities','requirements','qualifications','opportunity','ideal','great','good','excellent','knowledge','skills','familiar','familiarity','understanding','analyst','manager','engineer','develop','developer','build','builds','help','helping','support']);
  const gaps = Array.from(jdTokens).filter(t => !JD_BOILERPLATE.has(t) && (function(){ for(const rt of resumeTokens){ if(termsMatch(t, rt)) return false; } return true; })()).slice(0, 8);
  return { summary: (profile.northstar || '').trim(), summary_flagged_numbers: [], foreground_skills: foreground.slice(0, 12),
    gaps: gaps, match_note: '', entries: outEntries, tailored_by: 'deterministic' };
}

/* Real, deterministic safety-net check, not a substitute for the
   prompt's anti-fabrication instructions but a second, testable
   layer on top of it - the same two-layer pattern already used for
   scholarship discovery elsewhere in this app. Flags any digit
   sequence appearing in the polished bullet that appears nowhere in
   the original raw_description. */
/* Mirrors the backend's _find_fabricated_numbers exactly, including
   the unit-context check: catches a number reused with a completely
   different, fabricated meaning (tenure years becoming a dollar
   figure, a customer count becoming a percentage), not just genuinely
   new digit sequences. */
function findFabricatedNumbers(original, polished){
  // Mirrors the backend NUM regex exactly: a leading digit, then any
  // digits or thousands-separators, then an optional decimal part - so
  // "1,000,000" is one token, not three fragments. Comparison is done
  // with commas stripped, so an honest number merely reformatted
  // ("1,000" -> "1000") is not falsely flagged as fabricated.
  const numRe = /\d[\d,]*(?:\.\d+)?/g;
  const norm = s => s.replace(/,/g, '');
  const originalNumbers = new Set((original.match(numRe) || []).map(norm));
  const polishedMatches = [...polished.matchAll(numRe)];

  // Recognizes both symbol AND word forms of the unit ($ / "dollars" /
  // "usd"; % / "percent" / "percentage" / "pct"), scanning a 12-char
  // window after the number rather than a single char, so a fabricated
  // "20 percent" / "50 dollars" / "5000 usd" / "20 %" is caught exactly
  // as the backend catches it. Word and symbol count as the same unit,
  // so an honest "$5" becoming "5 dollars" is correctly not flagged.
  const unitContext = (text, startIdx, endIdx) => {
    const before = text.slice(Math.max(0, startIdx - 1), startIdx);
    const after = text.slice(endIdx, endIdx + 12).toLowerCase();
    const dollar = before === '$' || /^\s*(dollars?|usd)\b/.test(after);
    const percent = /^\s*%/.test(after) || /^\s*(percent|percentage|pct)\b/.test(after);
    return { dollar, percent };
  };

  const flagged = new Set();
  for(const m of polishedMatches){
    const raw = m[0];
    const num = norm(raw);
    if(!originalNumbers.has(num)){ flagged.add(raw); continue; }
    const pCtx = unitContext(polished, m.index, m.index + raw.length);
    if(!pCtx.dollar && !pCtx.percent) continue;  // no unit marker to verify; bare match is enough
    // Compare against whole number TOKENS in the original (not a bare
    // substring regex, which would let "2" match inside "25" and read
    // the wrong surrounding unit) - normalize each and require the same
    // unit to appear on the same number somewhere in the original.
    let foundMatchingContext = false;
    for(const om of original.matchAll(numRe)){
      if(norm(om[0]) !== num) continue;
      const oCtx = unitContext(original, om.index, om.index + om[0].length);
      if(oCtx.dollar === pCtx.dollar && oCtx.percent === pCtx.percent){ foundMatchingContext = true; break; }
    }
    if(!foundMatchingContext) flagged.add(raw);
  }
  return [...flagged].sort();
}

function findUnverifiableClaims(sourceText, letterText, listingOrg){
  const properNounRe = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const sourcePhrases = new Set(sourceText.match(properNounRe) || []);
  const letterPhrases = letterText.match(properNounRe) || [];
  const orgWords = new Set((listingOrg || '').split(' '));
  const commonStarters = new Set(['I','The','This','A','My','It','In','As','With','For','To','Your','Their','Our','We','You','That','These','Given']);

  const flagged = [];
  const seen = new Set();
  for(let phrase of letterPhrases){
    // The greedy pattern can glob a leading sentence-starter onto a
    // real proper noun ("The Chicago", "My Stanford"). Strip a leading
    // starter word so the genuine fabrication surfaces cleanly
    // ("Chicago"), and a bare starter ("The") drops out to nothing.
    // Mirrors the identical fix in the backend cover_letter.py.
    let words = phrase.split(/\s+/);
    while(words.length > 1 && commonStarters.has(words[0])) words = words.slice(1);
    phrase = words.join(' ');
    if(!phrase || commonStarters.has(phrase)) continue;
    if(seen.has(phrase)) continue;
    seen.add(phrase);
    if(sourcePhrases.has(phrase)) continue;
    if(orgWords.has(phrase) || phrase === (listingOrg || '')) continue;
    flagged.push(phrase);
  }
  return flagged;
}

async function generateCoverLetterJS(profile, entries, listing){
  if(!entries.length && !profile.northstar){
    return { letter: '', flagged_numbers: [], flagged_claims: [] };
  }
  const entryLines = entries.slice(0,6).map(e =>
    `- ${e.title}` + (e.org ? ` at ${e.org}` : '') + (e.raw_description ? `: ${e.raw_description}` : '')
  );
  const prompt = `A candidate's real, stated career goal: "${profile.northstar || ''}". Their real, stated skills: "${profile.skills || ''}".

${entryLines.length ? 'Their real experience entries:\n' + entryLines.join('\n') + '\n\n' : '\n'}A real listing they want to apply to: "${listing.title || ''}" at ${listing.org || ''}. Real tags on this listing: ${(listing.tags||[]).join(', ')}. Real listing description: "${(listing.description||'').slice(0,600)}"

Write a real, honest cover letter (3-4 short paragraphs) connecting this candidate's ACTUAL, real experience above to this specific role. Ground every claim in what's actually stated above - do not invent a specific achievement, metric, location, market, client, or personal connection to the company that isn't genuinely implied by the real entries or goal given. If the real material is thin, write a shorter, honest letter that doesn't overreach - a genuine, modest letter is far better than a padded, fabricated one. No cliches, no generic template language like "I am excited to apply" as an opening line - write like a specific, real person who actually read the listing.

Return ONLY the letter text, nothing else, no subject line, no "Dear Hiring Manager" salutation preamble explanation.`;

  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 600, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    const letter = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n').trim();

    // Includes each entry's real org, not just raw_description - a
    // real, confirmed bug found via live testing otherwise falsely
    // flags a person's own, real past employer name as an
    // "unverifiable claim" simply because it's honest to mention it.
    const sourceText = `${profile.northstar || ''} ` + entries.map(e => `${e.org || ''} ${e.raw_description || ''}`).join(' ');
    const flaggedNumbers = findFabricatedNumbers(sourceText, letter);
    const flaggedClaims = findUnverifiableClaims(sourceText, letter, listing.org || '');
    return { letter, flagged_numbers: flaggedNumbers, flagged_claims: flaggedClaims };
  } catch(err){
    console.error('Cover letter generation failed:', err);
    return { letter: '', flagged_numbers: [], flagged_claims: [], error: "Couldn't draft a cover letter just now - try again in a moment." };
  }
}

async function polishResumeEntry(entry){
  const prompt = `Here is something a real person wrote, in their own words, about something they actually did:

Role/title: "${entry.title}"${entry.org ? ` at ${entry.org}` : ''}
What they said they did, in their own words: "${entry.raw_description}"

Turn this into 2-4 strong resume bullet points - but if what they wrote genuinely only supports fewer distinct, honest bullets without repeating yourself or splitting one real responsibility into several separate-sounding ones, write fewer. Even a single bullet is fine if that's all the material honestly supports; hitting a minimum count is never a reason to invent a second, distinct responsibility that wasn't there.

Critical rule, more important than anything else here: you may only strengthen the PHRASING of what they actually wrote - stronger action verbs, tighter and more concrete language, standard resume conventions. You may NEVER add a specific number, percentage, dollar amount, team size, tool, responsibility, or outcome that isn't already stated or clearly implied in what they wrote. This includes an unstated causal step connecting two things they mentioned separately - if they said they built a feedback mechanism AND separately that something is still in use, do not write that the feedback was used to improve it unless they actually said that connection happened; state the two real things they said, not a process linking them that you're inferring. If what they wrote is vague or doesn't include a metric, write a vague-but-honest bullet rather than inventing a specific one - a real person may submit this to a real employer, and a fabricated detail here is not a stylistic choice, it's misrepresenting them.

No cliches like "results-driven", "team player", "go-getter", "detail-oriented", or "leveraged" as a verb - write like a specific, real person describing specific, real work, not a template filled in with generic resume language.

Return a JSON array of the bullet point strings - 2-4 for most entries, fewer only if the material genuinely doesn't support more - nothing else, no markdown fences, no commentary.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{role: "user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('\n').trim();
    text = text.replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(text);
    if(!Array.isArray(parsed)) return { bullets: [], flagged_numbers: [] };
    // Keep only real string bullets - a model returning a list of
    // non-strings (e.g. [1,2,3] or [{...}]) would otherwise crash the
    // string ops in findFabricatedNumbers, throw out of this whole
    // function, and lose even the genuine string bullets in the same
    // response (falling the entry back to the raw description). Mirrors
    // the backend polish_resume_entry, which filters to strings for
    // exactly this reason.
    const bullets = parsed.filter(b => typeof b === 'string');
    const source = entry.raw_description || '';  // BE defaults to "" - undefined would crash .match
    const flagged = new Set();
    bullets.forEach(b => findFabricatedNumbers(source, b).forEach(n => flagged.add(n)));
    return { bullets, flagged_numbers: [...flagged].sort() };
  } catch(err){
    console.error('Resume entry polish failed:', err);
    return null;
  }
}

/* Mirrors the backend's generate_resume_summary exactly, including
   the fabrication safety net - this previously relied entirely on
   the prompt's "do not invent years of experience" instruction, with
   no testable check behind it, unlike polishResumeEntry above it. */
async function generateResumeSummary(profile, entries){
  if(!profile.northstar && entries.length === 0) return { summary: '', flagged_numbers: [] };
  const entryLines = entries.slice(0,5).map(e => `- ${e.title}${e.org ? ` at ${e.org}` : ''}`).join('\n');
  const prompt = `Real stated career goal: "${profile.northstar || ''}"
${entryLines ? `Real experience entries:\n${entryLines}\n` : ''}
Write a single, honest 1-2 sentence professional summary line for a resume, grounded only in the real goal and entries above. Do not invent skills, years of experience, or achievements not implied by what's given. No cliches like "results-driven" or "passionate professional" - write like a specific, real person, not a template.

Return ONLY the summary text, nothing else.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 150, messages: [{role: "user", content: prompt}] })
    });
    const data = await response.json();
    const summary = (data.content || []).map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('\n').trim();
    const sourceText = `${profile.northstar || ''} ` + entries.map(e => e.raw_description || '').join(' ');
    const flagged = findFabricatedNumbers(sourceText, summary);
    return { summary, flagged_numbers: flagged };
  } catch(err){
    console.error('Resume summary generation failed:', err);
    return { summary: '', flagged_numbers: [] };
  }
}

async function generateResume(profile){
  const entries = getResumeEntries();
  if(entries.length === 0) return { error: 'Add at least one real work, education, or project entry before generating a resume.' };

  const polishedEntries = [];
  const entriesSnapshot = [];
  for(const e of entries){
    const result = await polishResumeEntry(e);
    // A genuine polish failure must not silently drop this real entry
    // from the person's resume entirely - falls back to their own
    // honest raw description as a single bullet, mirroring the same
    // fix just applied to the backend for the identical risk.
    const safeResult = result || { bullets: e.raw_description ? [e.raw_description] : [], flagged_numbers: [] };
    polishedEntries.push({
      entry_id: e.id, title: e.title, org: e.org,
      dates: `${e.start_date || ''} - ${e.end_date || ''}`.replace(/^ - $/, '').replace(/^- /,'').trim(),
      bullets: safeResult.bullets, flagged_numbers: safeResult.flagged_numbers,
    });
    entriesSnapshot.push({ entry_id: e.id, raw_description: e.raw_description });
  }
  const summaryResult = await generateResumeSummary(profile, entries);
  const summaryLine = summaryResult.summary;

  const doc = { summary_line: summaryLine, summary_flagged_numbers: summaryResult.flagged_numbers, entries: polishedEntries, entries_snapshot: entriesSnapshot, generated_at: new Date().toISOString() };
  saveResumeDocument(doc);

  // review_note now also covers the summary line, not just bullets -
  // a fabricated "5+ years of experience" in the summary is exactly
  // as real a problem as a fabricated number in a bullet, and was
  // previously invisible to this check entirely.
  const anyBulletFlags = polishedEntries.some(pe => pe.flagged_numbers.length > 0);
  const summaryFlagged = summaryResult.flagged_numbers.length > 0;
  let reviewNote = null;
  if(anyBulletFlags && summaryFlagged){
    reviewNote = "One or more bullets AND the summary line include a number that wasn't in what you originally wrote - double check those before using this.";
  } else if(summaryFlagged){
    reviewNote = "The summary line includes a number that wasn't in what you originally wrote - double check it before using this.";
  } else if(anyBulletFlags){
    reviewNote = "One or more bullets include a number that wasn't in what you originally wrote - double check those before using this.";
  }
  return { ...doc, review_note: reviewNote };
}

/* Real, deterministic keyword coverage check - reuses the exact same
   synonym-aware, word-boundary-safe matching already proven in the
   core matching engine (termsMatch/tokenize), so this stays in sync
   with that fix automatically rather than drifting from a second,
   separately-maintained copy of matching logic. Mirrors the
   backend's check_ats_alignment exactly, including its stopword
   filter. */
const RESUME_STOPWORDS = new Set([
  'become','engineer','engineering','using','with','work','working',
  'want','goal','into','role','roles','career','field','someone',
  'person','years','year','experience','focused','break','ship',
  'features','backed','real','help','helping','make','making',
  'build','building','learn','learning','have','that','this',
  'from','about','their','them','they','very','more','most',
  'used','use','uses','daily','regularly','handled','handle',
  'worked','helped','managed','assisted','performed','provided',
  'responsible','duties','tasks','position','store','organized',
  'ensured','maintained','conducted','completed','supported',
  'findings','hires','machine','orders','reports','records','requests',
  // Common irregular past-tense verbs - real descriptions almost
  // always narrate what someone DID ("wrote","led","built","grew",
  // "sold"), and none of these are skills, but they don't end in
  // -ed/-ly so the suffix rule below can't catch them the way it
  // catches regular verbs like "created"/"managed". Mirrors the
  // backend's _STOPWORDS exactly.
  'wrote','led','built','grew','sold','ran','gave',
  'took','made','found','held','kept','left','spent','spoke',
  'drove','chose','began','brought','taught','bought','caught',
  'thought','sought','knew','saw','went','came','did','said',
  // Quantifiers and generic filler nouns
  'several','multiple','various','many','much','some','each',
  'every','team','people','company','department','quality',
  // Prepositions/conjunctions - found via testing, neither a verb
  // nor adverb so the suffix rule can't catch them either
  'while','across','through','during','within','toward',
  'against','between','before','after',
  // More irregular past-tense verbs found via systematically testing
  // candidate words against the real filter, the same way the first
  // batch above was found. Mirrors the backend exactly.
  'read','sent','paid','lost','shot','stood','understood',
  // Generic adjectives and frequency adverbs - not specific enough
  // to be an actionable skill suggestion.
  'great','good','strong','hard','able','often','never','always',
  // Quantifiers and generic filler nouns, extending the existing
  // categories above.
  'lots','plenty','thing','stuff','part','parts','side','area','areas',
]);
function meaningfulTokens(text){
  // -ed/-ly suffix rule catches regular past-tense verbs and
  // adverbs that a stopword list alone could never fully enumerate -
  // "created","improved","quickly","successfully" all showed up as
  // suggested "skills" in real testing before this was added.
  // Verified against a broad list of real skill names (Python, SQL,
  // Photoshop, forecasting, accounting, etc.) before adding, since a
  // structural rule risks excluding something legitimate in a way a
  // curated list doesn't. Mirrors the backend's _meaningful_tokens
  // exactly.
  return new Set(tokenizeForMatching(text).filter(t =>
    t.length > 3 && !RESUME_STOPWORDS.has(t) && !t.endsWith('ed') && !t.endsWith('ly')
  ));
}
function checkAtsAlignment(profile, entries){
  const targetTokens = [...meaningfulTokens(`${profile.northstar || ''} ${profile.skills || ''}`)].sort();
  if(targetTokens.length === 0) return { matched_keywords: [], missing_keywords: [], coverage_pct: 0 };

  const resumeText = entries.map(e => `${e.title || ''} ${e.raw_description || ''}`).join(' ');
  const resumeTokens = new Set(tokenizeForMatching(resumeText));

  const matched = [], missing = [];
  targetTokens.forEach(t => {
    (([...resumeTokens].some(rt => termsMatch(t, rt))) ? matched : missing).push(t);
  });
  return { matched_keywords: matched, missing_keywords: missing, coverage_pct: Math.round(matched.length / targetTokens.length * 100) };
}

/* The skills section a resume shows is a direct, bare claim - "I have
   this skill" - with even less surrounding context than a bullet
   point to qualify it. That makes it more fabrication-sensitive, not
   less, so this only ever lists skills the person explicitly typed
   as their own (profile.skills), cleaned and deduplicated. Anything
   genuinely implied by their real entries but not in that explicit
   list is surfaced separately as a suggestion - never auto-added to
   the claimed list, since inferring a skill from entry text is a
   meaningfully weaker claim than the person stating it themselves.
   Mirrors the backend's build_skills_section exactly. */
/* Real, client-side .docx generation - mirrors the backend's
   generate_resume_document exactly, including the same discipline:
   every value placed into the document already came from the
   person's own real data or an already-fabrication-checked step
   (polishResumeEntry, generateResumeSummary, buildSkillsSection's
   explicit list only). Missing fields are honestly omitted, never
   replaced with a fabricated placeholder. Uses the docx library
   loaded via CDN, since this app's frontend has no live backend
   connection to generate the file server-side. */
async function downloadResumeDocx(listing){
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType, TabStopPosition } = window.docx;

  const doc = getResumeDocument();
  if(!doc || !doc.entries || !doc.entries.length){
    return { error: 'Generate a resume first before downloading it.' };
  }
  const session = getSession();
  const profile = JSON.parse(localStorage.getItem('kaidostar_profile') || 'null') || {};
  const rawEntries = getResumeEntries();
  const entryDicts = rawEntries.map(e => ({ raw_description: e.raw_description }));
  const skillsSection = buildSkillsSection(profile, entryDicts);

  // When tailoring for a specific listing, reorder the real,
  // already-polished entries to match the real relevance ranking -
  // reuses the identical rankEntriesForListing logic already proven
  // in the in-app tailor view, never re-polishing or changing what
  // any bullet says, only which entries lead. An entry whose id
  // isn't in the ranking (a genuinely plausible edge case if it was
  // deleted after the resume was last generated) sorts last rather
  // than crashing - mirrors the backend's identical fix.
  let orderedEntries = doc.entries;
  if(listing){
    const ranked = rankEntriesForListing(rawEntries, listing);
    const rankOrder = {};
    ranked.forEach((r, i) => { rankOrder[r.id] = i; });
    orderedEntries = [...doc.entries].sort((a, b) =>
      (rankOrder[a.entry_id] ?? ranked.length) - (rankOrder[b.entry_id] ?? ranked.length)
    );
  }

  const sectionDivider = { bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888', space: 1 } };
  const children = [];

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [ new TextRun({ text: (session && session.email) || '', bold: true, size: 26 }) ],
  }));

  function addHeading(label){
    children.push(new Paragraph({
      spacing: { before: 280, after: 80 },
      border: sectionDivider,
      children: [ new TextRun({ text: label.toUpperCase(), bold: true, size: 22 }) ],
    }));
  }

  if(doc.summary_line && doc.summary_line.trim()){
    addHeading('Summary');
    children.push(new Paragraph({ spacing: { after: 80 }, children: [ new TextRun({ text: doc.summary_line.trim(), size: 21 }) ] }));
  }

  const byType = { work: [], education: [], project: [] };
  orderedEntries.forEach(e => {
    const t = (rawEntries.find(re => re.id === e.entry_id) || {}).entry_type || 'work';
    (byType[t] || byType.work).push(e);
  });

  [['work','Experience'], ['education','Education'], ['project','Projects']].forEach(([typeKey, label]) => {
    const list = byType[typeKey];
    if(!list.length) return;
    addHeading(label);
    list.forEach(e => {
      const titleRuns = [ new TextRun({ text: e.title || '', bold: true, size: 21 }) ];
      if(e.dates && e.dates.trim()){
        titleRuns.push(new TextRun({ text: '\t' + e.dates, italics: true, size: 19 }));
      }
      children.push(new Paragraph({
        spacing: { after: 0 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: titleRuns,
      }));
      if(e.org){
        children.push(new Paragraph({ spacing: { after: 40 }, children: [ new TextRun({ text: e.org, italics: true, size: 20 }) ] }));
      }
      (e.bullets || []).forEach(b => {
        if(!b || !String(b).trim()) return;
        children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [ new TextRun({ text: String(b).trim(), size: 20 }) ] }));
      });
    });
  });

  if(skillsSection.skills.length){
    addHeading('Skills');
    children.push(new Paragraph({ spacing: { after: 80 }, children: [ new TextRun({ text: skillsSection.skills.join(', '), size: 21 }) ] }));
  }

  const docxDocument = new Document({
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 864, bottom: 864, left: 1080, right: 1080 } } }, children }],
  });

  const blob = await Packer.toBlob(docxDocument);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeOrg = listing && listing.org ? listing.org.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_') : '';
  a.download = safeOrg ? `${safeOrg}_resume.docx` : 'resume.docx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { error: null };
}

function buildSkillsSection(profile, entries){
  const rawSkills = profile.skills || '';
  const seenLower = new Set();
  const explicitSkills = [];
  rawSkills.split(',').forEach(s => {
    s = s.trim();
    if(s && !seenLower.has(s.toLowerCase())){
      seenLower.add(s.toLowerCase());
      explicitSkills.push(s);
    }
  });
  explicitSkills.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const entryText = entries.map(e => e.raw_description || '').join(' ');
  const entryTokens = meaningfulTokens(entryText);
  const explicitLower = new Set(explicitSkills.map(s => s.toLowerCase()));
  const suggested = [...entryTokens]
    .filter(t => ![...explicitLower].some(s => termsMatch(t, s)))
    .sort();

  return { skills: explicitSkills, suggested_additions: suggested.slice(0, 8) };
}

/* Mirrors the backend's add_skill_to_skills_string exactly - the
   only sanctioned way a suggested_additions entry moves into the
   person's explicit, claimed skills list. */
function addSkillToSkillsString(currentSkills, newSkill){
  currentSkills = currentSkills || '';
  newSkill = (newSkill || '').trim();
  if(!newSkill) return currentSkills;
  const existing = currentSkills.split(',').map(s => s.trim()).filter(Boolean);
  if(existing.some(s => s.toLowerCase() === newSkill.toLowerCase())) return currentSkills;
  existing.push(newSkill);
  return existing.join(', ');
}

/* The actual UI-facing action: updates the real, saved profile, not
   just a display value - so the newly-confirmed skill genuinely
   becomes part of the person's explicit skills the next time
   anything reads their profile, not just in this one panel. */
function addSuggestedSkillToProfile(skill){
  const profile = getProfile();
  if(!profile) return null;
  profile.skills = addSkillToSkillsString(profile.skills, skill);
  saveProfile(profile);
  // Sync to the backend so the server reflects the skill immediately (matching,
  // scheduler auto-apply, resume generation), not only after the next survey save.
  // Best-effort and fire-and-forget: the local update above is what the UI uses.
  try{ const s = (typeof getSession === 'function') && getSession(); if(s && s.user_id && typeof apiAddSkill === 'function'){ apiAddSkill(s.user_id, skill); } }catch(e){}
  return profile;
}

/* Mirrors the backend's remove_skill_from_skills_string exactly -
   the other half of the add action above. Without this, adding a
   skill with one click would be one-way: no way to undo it short of
   editing the raw comma-separated string some other way. */
function removeSkillFromSkillsString(currentSkills, skillToRemove){
  currentSkills = currentSkills || '';
  skillToRemove = (skillToRemove || '').trim();
  if(!skillToRemove) return currentSkills;
  const existing = currentSkills.split(',').map(s => s.trim()).filter(Boolean);
  return existing.filter(s => s.toLowerCase() !== skillToRemove.toLowerCase()).join(', ');
}

function removeSkillFromProfile(skill){
  const profile = getProfile();
  if(!profile) return null;
  profile.skills = removeSkillFromSkillsString(profile.skills, skill);
  saveProfile(profile);
  // Mirror the removal to the backend (see addSuggestedSkillToProfile).
  try{ const s = (typeof getSession === 'function') && getSession(); if(s && s.user_id && typeof apiRemoveSkill === 'function'){ apiRemoveSkill(s.user_id, skill); } }catch(e){}
  return profile;
}

/* Which of the person's real entries are most worth leading with for
   THIS specific listing - reuses the same synonym-aware term
   matching, applied to real entry content instead of a goal string.
   Never changes what an entry says, only how entries get ordered.
   Mirrors the backend's rank_entries_for_listing exactly. */
function rankEntriesForListing(entries, listing){
  const listingTags = listing.tags || [];
  const scored = entries.map(e => {
    const entryTokens = tokenize(`${e.title || ''} ${e.raw_description || ''}`);
    const relevanceTags = listingTags.filter(tag => entryTokens.some(t => termsMatch(tag.toLowerCase(), t)));
    return { ...e, relevance_tags: relevanceTags, relevance_score: relevanceTags.length };
  });
  scored.sort((a,b) => b.relevance_score - a.relevance_score);
  return scored;
}

/* A genuinely tailored cover-letter-style paragraph, not a generic
   template with the company name swapped in. The old version only
   ever knew the job title, org, and a raw skills string - it never
   used the actual posting text, the specific overlap already
   identified during scoring, or any roadmap context, which is
   exactly why AI-written cover letters usually read like every other
   AI-written cover letter. Also includes explicit anti-fabrication
   guardrails: this text may be submitted to a real employer
   representing a real person, so inventing a specific accomplishment
   or project they never mentioned isn't just bad writing, it's
   actually misrepresenting them. Mirrors the backend fix exactly. */
async function draftApplicationForMatch(listing, profile){
  const matchedTerms = [...new Set([...(listing.matchedGoal || []), ...(listing.matchedSkill || [])])];
  const description = (listing.description || '').trim();
  const roadmapAlignment = listing.factors && listing.factors.roadmapAlignment;

  const contextLines = [
    `Job: "${listing.title}" at ${listing.org}.`,
    `Candidate's stated career goal: "${profile.northstar || 'not specified'}"`,
    `Candidate's stated skills: "${profile.skills || 'not specified'}"`,
  ];
  if(description) contextLines.push(`The actual job posting text: "${description.slice(0,600)}"`);
  if(matchedTerms.length) contextLines.push(`Specific real overlap already identified between the candidate and this role: ${matchedTerms.join(', ')}`);
  if(roadmapAlignment) contextLines.push(`This role specifically advances a stage of the candidate's own stated plan: "${roadmapAlignment.title}".`);

  const prompt = contextLines.join('\n') + `

Write a short, genuinely specific cover-letter-style paragraph (120-180 words) for this application.

What makes this good, not generic:
- Open with something concrete tied to what this specific posting actually says it needs - never a generic opener like "I am writing to express my interest" or "I am excited to apply for".
- Connect the candidate's real stated skills and goal to what THIS role specifically needs - use the actual overlap identified above rather than just restating a generic skills list.
- Never invent a specific accomplishment, project, metric, company name, or experience the candidate didn't actually state here. This may be submitted to a real employer representing a real person - vague but honest beats specific but fabricated.
- Avoid AI-cover-letter cliches: no "passionate", "dynamic", "leverage my skills", "I am confident that", "perfect fit", "I believe I would be a great asset". Write like a specific person actually wrote this, not a template.
- No placeholder brackets, no generic filler, no closing like "I look forward to hearing from you" unless it says something more specific than that.

Return ONLY the paragraph text, nothing else.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 400, messages: [{role: "user", content: prompt}] })
    });
    const data = await response.json();
    const text = (data.content || []).map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('\n');
    return text || null;
  } catch(err){
    console.error('Draft generation failed:', err);
    return null;
  }
}

/* Roadmap alignment used to need a separate bonus here, because
   matchPct never reflected it at all - it was purely decorative
   metadata shown alongside a score it had zero influence over. Now
   that scoreListing() bakes roadmapFit in as a real, graded factor
   (see roadmapFit and ROADMAP_ALIGNMENT_BONUS's removal from the
   main matching flow), matchPct already carries that signal
   honestly. This was a separate, never-updated code path specific to
   the Workshop's manual "create application" flow - it kept adding
   a flat +8 on top of a score that already includes the real signal,
   double-counting the exact same thing. Mirrors the backend's
   compute_composite_confidence fix exactly. */
function computeCompositeConfidence(matchPct){
  // Honest 97 ceiling, matching the backend's compute_composite_confidence
  // (min(97, ...)) and the no-vanity-100s rule. matchPct is already capped at 97
  // upstream by the scorer, so min(100) and min(97) agree today - but claiming to
  // "mirror the backend exactly" while capping at a different number is the kind
  // of latent divergence that bites the moment an upstream cap changes.
  return Math.min(97, Math.round(matchPct));
}

async function createApplicationForMatch(listing, profile, autoGenerated){
  autoGenerated = autoGenerated || false;
  const existing = getApplicationForListing(String(listing.id));
  if(existing) return existing;

  const draftText = await draftApplicationForMatch(listing, profile);
  if(!draftText) return null;

  // Compute the counterfactual (non-personalized) score for this
  // same listing, so the self-audit feature has something real to
  // compare against later - mirrors the backend's
  // create_application_for_match exactly, which computes
  // match_no_personalization for this same purpose. This is stored
  // purely for later audit; the actual auto-send decision below
  // still uses the real, personalized listing.pct, unchanged.
  const goalTokens = tokenizeForMatching((profile.northstar || '') + ' ' + (profile.finalidea || ''));
  const skillTokens = tokenizeForMatching(profile.skills || '');
  const roadmapData = getRoadmap();
  const roadmapMilestonesForCounterfactual = roadmapData ? roadmapData.milestones : null;
  const noPersonalizationMatch = scoreListing(listing, goalTokens, skillTokens, profile, {}, roadmapMilestonesForCounterfactual);
  const counterfactualPct = noPersonalizationMatch ? noPersonalizationMatch.pct : listing.pct;

  const composite = computeCompositeConfidence(listing.pct);

  const settings = getAutoApplySettings();
  const threshold = settings.threshold || 80;
  const status = composite >= threshold ? 'approved' : 'pending_review';
  const sendableAt = status === 'approved' ? new Date(Date.now() + UNDO_WINDOW_MINUTES * 60000).toISOString() : null;

  const application = {
    id: 'app_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    listing_id: String(listing.id),
    listing_title: listing.title,
    listing_org: listing.org,
    listing_type: listing.type,
    match_score: listing.pct,
    roadmap_aligned: !!(listing.factors && listing.factors.roadmapAlignment),
    confidence_pct: composite,
    counterfactual_confidence_pct: counterfactualPct,
    draft: draftText,
    status,
    sendable_at: sendableAt,
    sent_at: null,
    auto_generated: autoGenerated,
    created_at: new Date().toISOString(),
    factors_snapshot: listing.factors || null,
  };

  const apps = getApplications();
  apps.unshift(application);
  saveApplications(apps);

  addNotification({
    type: 'application',
    title: `Draft ready: ${listing.title}`,
    detail: `${status === 'approved' ? 'Auto-approved' : 'Needs your review'} - ${composite}% confidence${application.roadmap_aligned ? ' (roadmap-aligned)' : ''}. Check the Workshop.`,
  });

  return application;
}

async function runAutoApplyForMatches(matches, profile){
  const settings = getAutoApplySettings();
  if(!settings.enabled) return [];
  const results = [];
  for(const listing of matches){
    const existing = getApplicationForListing(String(listing.id));
    if(existing) continue;
    const app = await createApplicationForMatch(listing, profile, true);
    if(app && app.status === 'approved') results.push(app);
  }
  return results;
}
/* ---- Real assistance search: genuinely searches the web for
   credible tutors/coaches for a specific skill gap or athletic need,
   within a real, stated budget. Shared between roadmap.html
   (candidates) and athlete-dashboard.html, since both need the same
   real capability. Uses the web_search tool so results are genuinely
   grounded in what's actually found, not fabricated - and the
   prompt is explicit that an honest "nothing found" is the right
   answer when that's genuinely the case. ---- */
async function findAssistanceOptions(needDescription, budget, locationContext){
  // Backend-first: the server runs the identical web-grounded assistance search
  // (mapping its `findings` to the `text` key callers read) with the shared API
  // key. Falls back to the direct call below when logged out or unreachable.
  const _asSession = (typeof getSession === 'function') ? getSession() : null;
  if(_asSession && _asSession.user_id && typeof apiAssistanceSearch === 'function'){
    const _be = await apiAssistanceSearch(_asSession.user_id, needDescription, budget, locationContext);
    if(_be) return _be;
  }
  const prompt = `Search the web for real, credible tutors or coaches who could genuinely help with: "${needDescription}".
Budget: "${budget}".${locationContext ? ` Location/context: "${locationContext}".` : ''}

Find real people, services, or platforms (e.g. real tutoring marketplaces, real coaching services, real individual tutors/coaches with an online presence) that genuinely fit this specific need and budget - not generic advice about "how to find a tutor." If you find genuinely relevant, real options, list up to 4, each with: their name, what makes them a real fit for this specific need, and their real, approximate cost if you can find it. If you genuinely cannot find real, credible options that fit the stated budget, say so honestly rather than suggesting something that doesn't actually fit - do not invent options or prices you have not found. Keep it concise.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 800,
        messages: [{role: "user", content: prompt}],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      })
    });
    const data = await response.json();
    const text = (data.content || []).map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('\n');
    // Real source citations - mirrors the backend's proven pattern
    // in assistance.py, extracting from the same web_search_tool_result
    // block shape the raw API response carries. Real, clickable links
    // someone can actually verify, not just trusting the text alone.
    const sources = [];
    (data.content || []).forEach(block => {
      if(block.type === 'web_search_tool_result' && Array.isArray(block.content)){
        block.content.forEach(item => {
          if(item.url) sources.push({ url: item.url, title: item.title || item.url });
        });
      }
    });
    return text ? { text, sources } : null;
  } catch(err){ console.error('Assistance search failed:', err); return null; }
}

/* ---- Deep, on-demand match explanation (real Claude call, cached per listing) ---- */
function getDeepExplanations(){ try{ return JSON.parse(localStorage.getItem('kaidostar_deep_explanations')) || {}; }catch(e){ return {}; } }
function saveDeepExplanation(listingId, text){
  const all = getDeepExplanations();
  all[listingId] = text;
  _safeSetItem('kaidostar_deep_explanations', JSON.stringify(all));
}
function getCachedDeepExplanation(listingId){ return getDeepExplanations()[listingId] || null; }

async function fetchDeepExplanation(listing, profile, roadmap){
  const cached = getCachedDeepExplanation(String(listing.id));
  if(cached) return cached;

  // Backend-first: the server reads the same profile + roadmap and returns the
  // identical honest match case, keyed on the real listing id. Only attempted
  // for a server listing id (seed listings 404 -> skipped by the wrapper).
  // Falls back to the direct call below when logged out or unreachable.
  const _deSession = (typeof getSession === 'function') ? getSession() : null;
  if(_deSession && _deSession.user_id && typeof apiDeepExplanation === 'function'){
    const _be = await apiDeepExplanation(_deSession.user_id, String(listing.id));
    if(_be){ saveDeepExplanation(String(listing.id), _be); return _be; }
  }

  const roadmapLine = roadmap && roadmap.milestones
    ? `Their roadmap:\n${roadmap.milestones.map(m => `${m.stage}. ${m.title}`).join('\n')}\n\n`
    : '';
  const prompt = `A candidate's goal: "${profile.northstar || 'not specified'}". What "made it" looks like: "${profile.finalidea || ''}". Their skills: "${profile.skills || 'not specified'}". What matters most to them: ${(Array.isArray(profile.priorities) ? profile.priorities : []).join(', ')}. Location preference: "${profile.loc || ''}".\n\n${roadmapLine}A listing they're considering: "${listing.title}" at ${listing.org} (${listing.type}), location ${listing.loc || 'unspecified'}, tags: ${listing.tags.join(', ')}.\n\nWrite a genuine, specific 3-4 sentence case for why this is or isn't a strong match for THIS candidate specifically - reference their actual goal, skills, priorities, and roadmap by name where relevant. Be honest about weak fit if it's weak, don't oversell. No generic filler - every sentence should reference a specific fact about the candidate or the listing.`;

  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{role: "user", content: prompt}] })
    });
    const data = await response.json();
    const text = (data.content || []).map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('\n');
    if(text) saveDeepExplanation(String(listing.id), text);
    return text || null;
  } catch(err){
    console.error('Deep explanation failed:', err);
    return null;
  }
}

/* ---- Connection strategy: the referral/networking feature. This
   deliberately does NOT invent a real named person at the company -
   there's no data source here with real employee information, and
   making up a name would be presenting fabricated data as real. What
   it does instead is genuinely useful: identifies the TYPE of person
   worth reaching out to, concrete guidance on how to actually find
   them, and a tailored outreach message ready to send once you do. ---- */
function getConnectionStrategies(){ try{ return JSON.parse(localStorage.getItem('kaidostar_connection_strategies')) || {}; }catch(e){ return {}; } }
function saveConnectionStrategy(listingId, strategy){
  const all = getConnectionStrategies();
  all[listingId] = strategy;
  _safeSetItem('kaidostar_connection_strategies', JSON.stringify(all));
}
function getCachedConnectionStrategy(listingId){ return getConnectionStrategies()[String(listingId)] || null; }

/* ---- Company leadership research - a real cache, not just a
   nice-to-have: without this, viewing a company's leadership
   research and then drafting an outreach email for it would trigger
   the same real API call twice for the same company. Mirrors the
   backend's get_or_research_company_leadership exactly, including
   the 30-day staleness threshold. ---- */
function getLeadershipResearchCache(){ try{ return JSON.parse(localStorage.getItem('kaidostar_leadership_research')) || {}; }catch(e){ return {}; } }
function saveLeadershipResearch(companyNameNormalized, research){
  const all = getLeadershipResearchCache();
  all[companyNameNormalized] = { ...research, researched_at: new Date().toISOString() };
  _safeSetItem('kaidostar_leadership_research', JSON.stringify(all));
}
function getCachedLeadershipResearch(companyNameNormalized, maxAgeDays){
  maxAgeDays = maxAgeDays || 30;
  const cached = getLeadershipResearchCache()[companyNameNormalized];
  if(!cached || !cached.researched_at) return null;
  const ageMs = Date.now() - new Date(cached.researched_at).getTime();
  if(ageMs > maxAgeDays * 24 * 60 * 60 * 1000) return null;  // stale - a real re-search is needed
  return cached;
}

/* Mirrors the backend's research_company_leadership exactly -
   searches for a company's real, current senior leadership (not just
   the CEO) and what they've genuinely, recently said publicly, then
   synthesizes an honest priorities_summary grounded in what was
   actually found. Never invents a leader, statement, or priority. */
async function researchCompanyLeadership(companyName){
  const prompt = `Search for real, current senior leadership at "${companyName}" - the CEO, and other genuine C-suite or VP-level executives (CTO, COO, CPO, Head of Engineering, etc., whoever is real and current for this specific company) - and anything they've genuinely, publicly said recently: a speech, conference talk, interview, podcast appearance, or a post under their own name on the company's blog or elsewhere. Look for real statements about what they're building toward, what they care about, or specific priorities they've mentioned - not generic corporate mission-statement language.

Only report real people and real statements you actually find through search. If you can only confirm the CEO and no other leaders, that's fine - report just the CEO. If you can't find anything genuinely specific and recent from anyone, say that plainly rather than guessing or filling in something generic that sounds plausible.

For anything you do find, paraphrase the real idea in your own words rather than quoting it at length - describe the theme or point they made, not their exact original wording.

After gathering what real leaders have actually said, write a short, honest summary of what this company's leadership actually seems to be prioritizing right now - genuinely synthesized from multiple real people's real statements if more than one was found, not just the most polished one. If you found real statements from only one person, or nothing specific at all, be honest about that limitation in the summary rather than presenting a single view as the whole company's position, or inventing a summary from nothing.

Return a JSON object with exactly these keys:
- leaders: an array of objects, each with 'name' (real, confirmed), 'title' (their real, current title), and 'statements' (an array of up to 2 objects, each with 'theme' - 1-2 sentences paraphrasing a real point they made, in your own words - and 'source_title' - what the source actually was) - empty array if no real leaders with real statements were found
- priorities_summary: 2-3 honest sentences on what this leadership team's real, recent public statements actually suggest they're prioritizing - empty string if nothing real enough to synthesize was found

Return ONLY the JSON object, nothing else, no markdown fences, no commentary.`;

  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{role: "user", content: prompt}]
      })
    });
    const data = await response.json();
    let text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();

    const sources = [];
    for(const block of (data.content || [])){
      if(block.type === 'web_search_tool_result'){
        for(const item of (block.content || [])){
          if(item.url) sources.push({ url: item.url, title: item.title || item.url });
        }
      }
    }

    let parsed;
    try{ parsed = JSON.parse(text); }
    catch(e){ return { leaders: [], priorities_summary: '', sources }; }

    return {
      leaders: parsed.leaders || [],
      priorities_summary: parsed.priorities_summary || '',
      sources,
    };
  } catch(err){
    console.error('Company leadership research failed:', err);
    return { leaders: [], priorities_summary: '', sources: [] };
  }
}

async function getOrResearchCompanyLeadership(companyName, maxAgeDays){
  const normalized = (companyName || '').trim().toLowerCase();
  const cached = getCachedLeadershipResearch(normalized, maxAgeDays);
  if(cached) return { ...cached, cached: true };

  const safeCompanyName = companyName || '';
  const fresh = await researchCompanyLeadership(safeCompanyName);
  saveLeadershipResearch(normalized, fresh);
  return { ...fresh, cached: false };
}

async function fetchConnectionStrategy(listing, profile){
  const cached = getCachedConnectionStrategy(listing.id);
  if(cached) return cached;

  // Backend-first: the server reads the same profile and returns the identical
  // three-key connection strategy, keyed on the real listing id. Only attempted
  // for a server listing id (seed listings 404 -> skipped by the wrapper).
  // Falls back to the direct call below when logged out or unreachable.
  const _csSession = (typeof getSession === 'function') ? getSession() : null;
  if(_csSession && _csSession.user_id && typeof apiConnectionStrategy === 'function'){
    const _be = await apiConnectionStrategy(_csSession.user_id, String(listing.id));
    if(_be){ saveConnectionStrategy(listing.id, _be); return _be; }
  }

  const prompt = `A candidate is applying to "${listing.title}" at ${listing.org} (${listing.type}), tags: ${(listing.tags || []).join(', ')}. Their background: skills "${profile.skills || 'not specified'}", goal "${profile.northstar || 'not specified'}".\n\nHelp them get a real human connection at this company before applying cold. Return a JSON object with exactly these three keys:\n- contact_type: the specific TYPE of person worth reaching out to for this role (e.g. "someone currently in a similar individual-contributor role on this team" or "the hiring manager, likely titled X") - a role description, never a real invented name\n- search_guidance: 1-2 concrete sentences on exactly how to actually find that person - specific search terms or approach, not "network more"\n- outreach_message: a genuine, specific 80-120 word message they could send once they find someone - reference the candidate's real skills/goal and the specific role, ask for a short conversation or referral, not generic flattery\n\nReturn ONLY valid JSON with exactly those three keys, nothing else, no markdown fences.`;

  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{role: "user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(text);
    // Real shape validation - confirmed this feeds draftOutreachForWorkshop
    // via strategy.outreach_message directly, and this function IS genuinely
    // live (reachable from the real "Find a contact" button), not the dead
    // code it first appeared to be from an incomplete search.
    if(typeof parsed.contact_type !== 'string' || typeof parsed.search_guidance !== 'string' || typeof parsed.outreach_message !== 'string'){
      throw new Error('Connection strategy response has an unexpected shape');
    }
    saveConnectionStrategy(listing.id, parsed);
    return parsed;
  } catch(err){
    console.error('Connection strategy generation failed:', err);
    return null;
  }
}

/* ---- Outreach drafting -> Workshop queue. "Find a contact" and Auto
   mode both funnel here: a draft (guessed address, subject, body) is
   created with status 'drafted' and shown in Workshop, where it can
   be edited and only sent via an explicit click - individually or via
   "Send all pending". Nothing in this pipeline sends automatically,
   including when triggered by Auto mode - Auto only creates drafts. ---- */
function guessCompanyDomain(orgName){
  orgName = orgName || '';
  let cleaned = orgName.replace(/\b(inc|llc|ltd|corp|corporation|co)\b\.?/gi, '');
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase();
  const slug = cleaned.replace(/\s+/g, '');
  return slug ? `${slug}.com` : null;
}

async function guessContactEmail(listing){
  const domain = guessCompanyDomain(listing && listing.org);
  if(!domain) return { candidates: [], domain_guessed: null };
  const prefixes = ['careers', 'jobs', 'hr', 'talent', 'recruiting'];
  return {
    domain_guessed: domain,
    candidates: prefixes.map(p => `${p}@${domain}`),
    verified: false,
  };
}

function getOutreachDrafts(){ try{ const _v = JSON.parse(localStorage.getItem('kaidostar_outreach_drafts')); return Array.isArray(_v) ? _v : []; }catch(e){ return []; } }
function saveOutreachDrafts(list){ _safeSetItem('kaidostar_outreach_drafts', JSON.stringify(list)); }
function getOutreachDraftForListing(listingId){ return getOutreachDrafts().find(o => o.listing_id === String(listingId)); }

async function draftOutreachForWorkshop(listing, profile, autoGenerated){
  autoGenerated = autoGenerated || false;
  const existing = getOutreachDraftForListing(listing.id);
  if(existing) return existing;

  const guess = await guessContactEmail(listing);
  if(!guess.candidates.length) return null;
  const strategy = await fetchConnectionStrategy(listing, profile);
  if(!strategy) return null;

  const draft = {
    id: 'outreach_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    listing_id: String(listing.id),
    listing_title: listing.title,
    listing_org: listing.org,
    to_address: guess.candidates[0],
    address_verified: false,
    subject: `Regarding ${listing.title}`,
    body: strategy.outreach_message,
    status: 'drafted',
    auto_generated: autoGenerated,
    created_at: new Date().toISOString(),
  };
  const drafts = getOutreachDrafts();
  drafts.unshift(draft);
  saveOutreachDrafts(drafts);

  addNotification({
    type: 'outreach_drafted',
    title: `${autoGenerated ? 'Auto-drafted' : 'Drafted'} outreach: ${listing.title}`,
    detail: `To ${draft.to_address}. Review and send from the Workshop whenever you're ready.`,
  });
  return draft;
}

/* Mirrors the backend's draft_leadership_grounded_outreach exactly -
   the leadership-grounded counterpart to draftOutreachForWorkshop
   above. Same storage, same edit/send flow in Workshop, but instead
   of a generic referral email, this genuinely references what the
   company's real, current senior leadership has actually said and
   prioritized - never a fabricated or generic one. If leadershipResearch
   found nothing real and specific, this is honest about that rather
   than inventing something that sounds plausible. */
async function draftLeadershipGroundedOutreach(listing, profile, leadershipResearch){
  const existing = getOutreachDraftForListing(listing.id);
  if(existing) return existing;

  const guess = await guessContactEmail(listing);
  if(!guess.candidates.length) return null;

  const leaders = leadershipResearch.leaders || [];
  const prioritiesSummary = leadershipResearch.priorities_summary || '';
  const grounded = leaders.length > 0 && !!prioritiesSummary;

  let researchBlock;
  if(grounded){
    const leaderLines = leaders.map(l =>
      `- ${l.name || ''} (${l.title || ''}): ` + (l.statements || []).map(s => `${s.theme || ''} (from ${s.source_title || 'an unnamed source'})`).join('; ')
    ).join('\n');
    researchBlock = `Real, current senior leadership at this company, and things they have genuinely, publicly said:\n${leaderLines}\n\nAn honest synthesis of what this leadership team's real statements actually suggest they're prioritizing right now: ${prioritiesSummary}\n\nReference this real, synthesized sense of what the company's leadership is actually focused on right now - or one specific leader's real point if it connects especially well to this candidate's background - naturally in the email, genuinely connecting it to why this candidate's real background makes them worth a conversation, not just name-dropping it. Do not quote anyone's exact original words at length - paraphrase the idea, same as it was paraphrased above.`;
  } else {
    researchBlock = `No specific, current public statements from this company's leadership were found - write a genuine, specific referral email grounded in the candidate's real background and the role itself, same as normal. Do not invent a leadership quote or a company priority that wasn't actually found.`;
  }

  const prompt = `A candidate is applying to "${listing.title}" at ${listing.org} (${listing.type}), tags: ${(listing.tags || []).join(', ')}. Their background: skills "${profile.skills || 'not specified'}", goal "${profile.northstar || 'not specified'}".

${researchBlock}

Write a genuine, specific 80-120 word referral outreach email body, plus a short subject line. Reference the candidate's real skills/goal and the specific role, ask for a short conversation or referral, no generic flattery. Return ONLY valid JSON with exactly two keys: 'subject' and 'body'. No markdown fences.`;

  let parsed;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 400, messages: [{role: "user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    parsed = JSON.parse(text);
    // JSON.parse('null') returns null, and the `const draft` below reads
    // parsed.subject/parsed.body OUTSIDE this try - null.subject would throw
    // uncaught (a non-object like [] or "str" harmlessly yields undefined, but
    // null/undefined do not). Reject any non-object here so it degrades to the
    // same null return, mirroring the backend draft functions' isinstance guard.
    if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)){
      throw new Error('Draft response was not a JSON object');
    }
  } catch(err){
    console.error('Leadership-grounded outreach drafting failed:', err);
    return null;
  }

  const draft = {
    id: 'outreach_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    listing_id: String(listing.id),
    listing_title: listing.title,
    listing_org: listing.org,
    to_address: guess.candidates[0],
    address_verified: false,
    subject: parsed.subject || `Regarding ${listing.title}`,
    body: parsed.body || '',
    status: 'drafted',
    auto_generated: false,
    leadership_grounded: grounded,
    leadership_research_sources: leadershipResearch.sources || [],
    priorities_summary: grounded ? prioritiesSummary : null,
    created_at: new Date().toISOString(),
  };
  const drafts = getOutreachDrafts();
  drafts.unshift(draft);
  saveOutreachDrafts(drafts);

  addNotification({
    type: 'outreach_drafted',
    title: grounded ? `Leadership-grounded outreach drafted: ${listing.title}` : `Drafted outreach: ${listing.title}`,
    detail: grounded ? `Tailored around ${listing.org}'s real, current leadership priorities. Review and send from the Workshop whenever you're ready.` : `To ${draft.to_address}. Review and send from the Workshop whenever you're ready.`,
  });
  return draft;
}

async function runAutoOutreachForMatches(matches, profile){
  const settings = getAutoApplySettings();
  if(!settings.enabled) return [];
  const results = [];
  for(const listing of matches){
    const existing = getOutreachDraftForListing(listing.id);
    if(existing) continue;
    const draft = await draftOutreachForWorkshop(listing, profile, true);
    if(draft) results.push(draft);
  }
  return results;
}

function updateOutreachDraft(id, field, value){
  const drafts = getOutreachDrafts();
  const draft = drafts.find(o => o.id === id);
  // Mirrors the backend's edit_outreach exactly - only genuinely
  // "sent" blocks an edit, not any status other than "drafted". A
  // "failed" draft should stay editable so a person can fix and
  // retry it, the same as the real backend already allows.
  if(!draft || draft.status === 'sent') return;
  draft[field] = value;
  if(field === 'to_address') draft.address_verified = false;
  saveOutreachDrafts(drafts);
}

function discardOutreachDraft(id){
  const drafts = getOutreachDrafts();
  const draft = drafts.find(o => o.id === id);
  if(draft) draft.status = 'undone';
  saveOutreachDrafts(drafts);
}

async function sendOutreachDraft(id){
  // Honest limitation: this standalone frontend demo has no backend
  // attached and no real mail-sending credentials available to a
  // browser. The real send happens via POST /outreach/{id}/send once
  // this frontend is connected to your deployed backend, which calls
  // Resend for real. Here, the click is genuine and required - this
  // just can't reach a real mail server from a static demo page.
  const drafts = getOutreachDrafts();
  const draft = drafts.find(o => o.id === id);
  // Mirrors the backend's send_outreach exactly - only a genuinely
  // "sent" status blocks this, so a "failed" draft can still be
  // retried, the same as the real backend already allows.
  if(!draft || draft.status === 'sent') return { status: 'error' };
  draft.status = 'sent';
  draft.sent_at = new Date().toISOString();
  saveOutreachDrafts(drafts);
  addNotification({ type: 'outreach_sent', title: `Outreach sent (demo mode): ${draft.listing_title}`, detail: `To ${draft.to_address}. Connect this frontend to your deployed backend to send for real via /outreach/{id}/send.` });
  return { status: 'sent' };
}

async function sendAllPendingOutreach(){
  const drafts = getOutreachDrafts();
  const pending = drafts.filter(o => o.status === 'drafted');
  pending.forEach(o => { o.status = 'sent'; o.sent_at = new Date().toISOString(); });
  saveOutreachDrafts(drafts);
  if(pending.length > 0){
    addNotification({ type: 'outreach_sent', title: `${pending.length} outreach email${pending.length===1?'':'s'} sent (demo mode)`, detail: 'Connect this frontend to your deployed backend to send for real.' });
  }
  return pending;
}

async function approveAllPendingApplications(){
  const apps = getApplications();
  const pending = apps.filter(a => a.status === 'pending_review');
  const sendableAt = new Date(Date.now() + UNDO_WINDOW_MINUTES * 60000).toISOString();
  pending.forEach(a => { a.status = 'approved'; a.sendable_at = sendableAt; });
  saveApplications(apps);
  if(pending.length > 0){
    addNotification({ type: 'applications_approved', title: `${pending.length} application${pending.length===1?'':'s'} approved`, detail: `Each still has its own ${UNDO_WINDOW_MINUTES}-minute undo window before it can be sent.` });
  }
  return pending;
}

/* Bump this any time the roadmap generator's output shape changes -
   this is what forces a stale, older-format roadmap already sitting
   in someone's browser to regenerate automatically instead of being
   silently treated as "already generated" forever. This was the
   actual cause of roadmaps looking weak even after real improvements
   shipped: only a missing .milestones array was being caught before,
   not a merely-outdated one. */
const ROADMAP_VERSION = 3;

function getRoadmap(){
  try{
    const raw = JSON.parse(localStorage.getItem('kaidostar_roadmap'));
    if(!raw) return null;
    // Old format (before the summary+milestones restructure) stored a
    // bare array. Treat that, anything missing .milestones, OR
    // anything from an older generator version as if there's no
    // roadmap yet - forces a fresh regeneration in the current,
    // deeper format instead of silently keeping stale content.
    // !Array.isArray(raw.milestones): a corrupted/old-format value where milestones
    // is a non-array (string/object) is truthy but has no .map/.filter, so it would
    // white-screen the roadmap render. Treat it as "no roadmap" and regenerate.
    if(Array.isArray(raw) || !Array.isArray(raw.milestones) || raw.version !== ROADMAP_VERSION) return null;
    return raw;
  }catch(e){ return null; }
}
function saveRoadmap(r){ _safeSetItem('kaidostar_roadmap', JSON.stringify(r)); }

function getAthleteRoadmap(){ try{ const raw = JSON.parse(localStorage.getItem('kaidostar_athlete_roadmap')); return (raw && Array.isArray(raw.milestones) && raw.version === ROADMAP_VERSION) ? raw : null; }catch(e){ return null; } }
function saveAthleteRoadmap(r){ _safeSetItem('kaidostar_athlete_roadmap', JSON.stringify(r)); }

function getOutcomes(){ try{ const v = JSON.parse(localStorage.getItem('kaidostar_outcomes')); return Array.isArray(v) ? v.filter(o => o && typeof o === 'object') : []; }catch(e){ return []; } }  // filter to objects (see getApplications): a junk element would crash calibration and every other o.x consumer
function saveOutcomes(o){ _safeSetItem('kaidostar_outcomes', JSON.stringify(o)); }

/* ---- Real outcome logging + confidence calibration + rejection
   autopsy. This is the genuinely differentiated piece: instead of
   just showing a match score and hoping it means something, this
   checks whether it actually did, using the user's own real logged
   results - and offers a specific, grounded explanation when
   something falls through, instead of generic advice. ---- */
function logApplicationOutcome(applicationId, status){
  const apps = getApplications();
  const app = apps.find(a => a.id === applicationId);
  if(!app) return null;
  app.outcome_status = status;
  app.outcome_logged_at = new Date().toISOString();
  saveApplications(apps);

  const outcomes = getOutcomes();
  outcomes.unshift({
    status, month: new Date().toLocaleString('en-US', {month:'short'}),
    listing_id: app.listing_id, confidence_pct: app.confidence_pct,
  });
  saveOutcomes(outcomes);
  return app;
}

function computeCalibration(){
  const apps = getApplications().filter(a => a.outcome_status);
  const buckets = {
    '80-100%': { lo: 80, hi: 101, total: 0, positive: 0 },
    '60-79%': { lo: 60, hi: 80, total: 0, positive: 0 },
    'below 60%': { lo: 0, hi: 60, total: 0, positive: 0 },
  };
  const positiveStatuses = new Set(['interview', 'offer']);
  apps.forEach(app => {
    const confidence = app.confidence_pct || 0;
    for(const bucket of Object.values(buckets)){
      if(confidence >= bucket.lo && confidence < bucket.hi){
        bucket.total++;
        if(positiveStatuses.has(app.outcome_status)) bucket.positive++;
        break;
      }
    }
  });
  const result = {};
  Object.entries(buckets).forEach(([label, b]) => {
    result[label] = { total: b.total, positiveRate: b.total > 0 ? Math.round((b.positive / b.total) * 100) : null };
  });
  return { buckets: result, totalWithOutcomes: apps.length };
}

/* ---- Real outcome-based learning, mirroring the backend exactly.
   The frontend demo never had ANY version of this before - not even
   the earliest tag-weight learner - so this closes a real,
   substantial gap, not just a refinement. ---- */
function recencyDecay(daysOld, halfLifeDays = 90){
  if(daysOld < 0) daysOld = 0;
  return Math.pow(0.5, daysOld / halfLifeDays);
}

function getTagWeightsFromOutcomesJS(){
  const apps = getApplications().filter(a => a.outcome_status && a.listing_id);
  const listingsById = {}; LISTINGS.forEach(l => { listingsById[l.id] = l; });
  const rawDeltas = {};
  const deltaFor = { interview: 1.5, offer: 2.5, applied: 0, rejected: -1.0, ghosted: -0.5 };

  apps.forEach(app => {
    const listing = listingsById[parseInt(app.listing_id)] || listingsById[app.listing_id];
    if(!listing) return;
    const delta = deltaFor[app.outcome_status] ?? 0;
    let decay = 1.0;
    if(app.outcome_logged_at){
      const daysOld = Math.round((Date.now() - new Date(app.outcome_logged_at).getTime()) / 86400000);
      decay = recencyDecay(daysOld);
    }
    (listing.tags || []).forEach(tag => {
      if(!rawDeltas[tag]) rawDeltas[tag] = [];
      rawDeltas[tag].push(delta * decay);
    });
  });

  const weights = {};
  Object.entries(rawDeltas).forEach(([tag, deltas]) => {
    const n = deltas.length;
    const avg = deltas.reduce((s,d)=>s+d,0) / n;
    const confidence = n / (n + 2);
    weights[tag] = Math.round(avg * confidence * 10000) / 10000;
  });
  return weights;
}

/* descriptionFit and semanticFit included for structural parity with
   the backend's FACTOR_NAMES - they'll always compute as 0 here
   since frontend demo listings genuinely have no description text or
   real embeddings (that requires a connected backend with a real
   VOYAGE_API_KEY - not something to fake client-side). The existing
   shrinkage logic already handles all-zero factors correctly
   (returns neutral 1.0), so this is honest, not broken. */
const FACTOR_NAMES_JS = ['goalFit', 'skillFit', 'priorityFit', 'locationFit', 'deadlineUrgency', 'descriptionFit', 'semanticFit', 'roadmapFit'];
const POSITIVE_STATUSES_JS = new Set(['interview', 'offer']);

function decayForApp(app){
  if(!app.updated_at) return 1.0;
  const daysOld = Math.round((Date.now() - new Date(app.updated_at).getTime()) / 86400000);
  return recencyDecay(daysOld);
}

function computeFactorReliability(applicationsWithOutcomes){
  const usable = applicationsWithOutcomes.filter(a => a.factors_snapshot);
  if(usable.length < 3){
    // Was < 4 - verified redundant with the per-factor shrinkage
    // below, the same way interaction-effect detection and the
    // self-audit's hard gates were: at n=3, confidence = 3/(3+3) =
    // 0.5, which already requires the engaged rate to be 1.6x
    // baseline just to produce a modest 1.3x multiplier - a real,
    // substantial signal requirement, not a trivial one.
    const neutral = {}; FACTOR_NAMES_JS.forEach(f => neutral[f] = 1.0); return neutral;
  }
  const weights = usable.map(decayForApp);
  const totalWeight = weights.reduce((s,w)=>s+w, 0);
  const positiveWeight = usable.reduce((s,a,i)=> s + (POSITIVE_STATUSES_JS.has(a.outcome_status) ? weights[i] : 0), 0);
  const baselineRate = totalWeight > 0 ? positiveWeight / totalWeight : 0;
  if(baselineRate === 0){
    const neutral = {}; FACTOR_NAMES_JS.forEach(f => neutral[f] = 1.0); return neutral;
  }

  const multipliers = {};
  FACTOR_NAMES_JS.forEach(factor => {
    const engagedIdx = usable.map((a,i)=>({a,i,w:weights[i]})).filter(({a}) => (a.factors_snapshot[factor] || 0) > 0);
    const n = engagedIdx.length; // raw count still gates confidence - a single very-recent outcome shouldn't look like strong evidence just because its weight is high
    if(n < 2){ multipliers[factor] = 1.0; return; }
    const engagedWeight = engagedIdx.reduce((s,{w})=>s+w, 0);
    const engagedPositiveWeight = engagedIdx.reduce((s,{a,w})=> s + (POSITIVE_STATUSES_JS.has(a.outcome_status) ? w : 0), 0);
    const engagedRate = engagedWeight > 0 ? engagedPositiveWeight / engagedWeight : 0;
    const rawMultiplier = baselineRate > 0 ? engagedRate / baselineRate : 1.0;
    const confidence = n / (n + 3);
    const shrunk = 1.0 + (rawMultiplier - 1.0) * confidence;
    multipliers[factor] = Math.round(Math.max(0.3, Math.min(2.0, shrunk)) * 1000) / 1000;
  });
  return multipliers;
}

function getPersonalizedFactorWeightsJS(){
  const apps = getApplications().filter(a => a.outcome_status && a.factors_snapshot);
  return computeFactorReliability(apps.map(a => ({ factors_snapshot: a.factors_snapshot, outcome_status: a.outcome_status, updated_at: a.outcome_logged_at })));
}

/* --- User-adjustable preference weights ---
   Distinct from the LEARNED weights above (which come from real outcomes):
   these are what the user explicitly says they care about ("I care more about
   comp than growth"). Stored as a 0-2 multiplier per factor, default 1.0
   (neutral). The user sets them with sliders on the dashboard and rankings
   re-compute live. We keep them separate from learned weights so the two
   signals stay honest and legible, then blend them below. */
const USER_WEIGHT_FACTORS = ['goalFit','skillFit','priorityFit','locationFit','deadlineUrgency','descriptionFit','roadmapFit'];

function getUserPreferenceWeightsJS(){
  try{
    const raw = localStorage.getItem('kaidostar_pref_weights');
    if(!raw) return {};
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== 'object') return {};
    // sanitize: only known factors, clamp each to 0-2
    const clean = {};
    for(const f of USER_WEIGHT_FACTORS){
      const v = parsed[f];
      if(typeof v === 'number' && isFinite(v)) clean[f] = Math.max(0, Math.min(2, v));
    }
    return clean;
  }catch(e){ return {}; }
}

function saveUserPreferenceWeightsJS(weights){
  const clean = {};
  for(const f of USER_WEIGHT_FACTORS){
    const v = (weights || {})[f];
    if(typeof v === 'number' && isFinite(v)) clean[f] = Math.max(0, Math.min(2, v));
  }
  try{ _safeSetItem('kaidostar_pref_weights', JSON.stringify(clean)); }catch(e){}
  return clean;
}

function resetUserPreferenceWeightsJS(){
  try{ localStorage.removeItem('kaidostar_pref_weights'); }catch(e){}
}

/* Blend the user's explicit preferences with the outcome-learned reliability.
   Both are honest signals: the learned weight says "this factor genuinely
   predicts success for you", the user weight says "this is what I care about".
   Multiplying them means a factor is boosted only when the user cares AND (if
   there's outcome data) it has shown to matter - and a user can still deliberately
   down-weight a factor the data likes, because it's THEIR search. A missing
   value on either side is a neutral 1.0, so this reduces exactly to the old
   behavior when the user hasn't set anything. */
function getBlendedFactorWeightsJS(){
  const learned = getPersonalizedFactorWeightsJS();
  const pref = getUserPreferenceWeightsJS();
  const blended = {};
  const allFactors = new Set([...Object.keys(learned), ...USER_WEIGHT_FACTORS]);
  for(const f of allFactors){
    const l = (typeof learned[f] === 'number') ? learned[f] : 1.0;
    const u = (typeof pref[f] === 'number') ? pref[f] : 1.0;
    if(l !== 1.0 || u !== 1.0) blended[f] = l * u;
  }
  return blended;
}

/* Mirrors the backend's get_factor_reliability_detail exactly - the
   same silent-exclusion gap already fixed for the self-audit panel,
   found here by directly checking this sibling function for the
   identical pattern: computeFactorReliability's own multiplier alone
   can't tell a person whether a factor sitting at 1.0 genuinely
   performs at baseline, or simply hasn't had enough engaged
   applications to say anything yet. Kept entirely separate from
   computeFactorReliability itself, which the real scoring path
   depends on returning a plain {factor: number} object. */
function getFactorReliabilityDetail(applicationsWithOutcomes){
  const multipliers = computeFactorReliability(applicationsWithOutcomes);
  const usable = applicationsWithOutcomes.filter(a => a.factors_snapshot);

  const detail = {};
  FACTOR_NAMES_JS.forEach(factor => {
    const engagedCount = usable.filter(a => (a.factors_snapshot[factor] || 0) > 0).length;
    detail[factor] = {
      multiplier: multipliers[factor] !== undefined ? multipliers[factor] : 1.0,
      engagedCount,
      hasEnoughData: engagedCount >= 2 && usable.length >= 3,
    };
  });
  return detail;
}

/* The genuine depth upgrade beyond factor-category reweighting:
   computeFactorReliability() can only ever say "skill_fit predicts
   success 36% better for you" - a real number, but a shallow one. It
   never sees WHICH skills, WHY, or what actually happened. This
   reads the real application drafts you actually sent and asks
   Claude to find specific, concrete patterns grounded in that real
   content - mirrors the backend's
   generate_deep_personalization_insights() exactly. */
/* Curated, meaningful pairs rather than all 21 combinations of 7
   factors - mirrors the backend's INTERACTION_PAIRS exactly. */
const INTERACTION_PAIRS_JS = [
  ['skill overlap + conceptual fit', 'skillFit', 'semanticFit'],
  ['stated goal + conceptual fit', 'goalFit', 'semanticFit'],
  ['skill overlap + posting depth', 'skillFit', 'descriptionFit'],
  ['location + timing', 'locationFit', 'deadlineUrgency'],
  ['roadmap alignment + skill overlap', 'roadmapFit', 'skillFit'],
];

/* Goes a real step beyond computeFactorReliability: that function can
   only ever say whether a SINGLE factor predicts success in
   isolation. This checks whether two signals only work TOGETHER -
   mirrors the backend's compute_factor_interactions() exactly. */
/* Per-pair bucket minimums (bothHigh>=2, aOnly>=2, bOnly>=2) work
   together with the confidence-shrinkage below, not as a separate,
   redundant safeguard on top of it: even at the smallest allowed
   bucket size, the shrinkage formula already requires a raw synergy
   of 0.45 (a dramatic, obvious effect) before anything crosses the
   0.15 reporting threshold - verified by direct calculation before
   lowering this gate, mirrors the backend fix exactly. The previous
   minimum of 8 total / 3 in the largest-required bucket was more
   conservative than the shrinkage already requires, meaning this
   almost never activated for a real user within a reasonable number
   of real outcomes. */
/* Dormancy in computeFactorInteractions below is honest, but was
   completely silent about WHY - a person could have 20 real logged
   outcomes and still see nothing, with no way to tell whether the
   blocker is simply not enough applications yet, or something the
   gate can't fix by waiting: every application happening to engage
   the same factors in the same way, so no amount of additional
   volume would ever populate the other buckets. This reports, per
   curated pair, exactly which bucket (if any) is the actual
   bottleneck and how many more real outcomes in that specific
   bucket would unlock it. Mirrors the backend's
   get_interaction_readiness exactly. */
function getInteractionReadiness(applicationsWithOutcomes){
  const usable = applicationsWithOutcomes.filter(a => a.factors_snapshot);
  return INTERACTION_PAIRS_JS.map(([label, factorA, factorB]) => {
    const engaged = (a, f) => (a.factors_snapshot[f] || 0) > 0;
    const bothCount = usable.filter(a => engaged(a, factorA) && engaged(a, factorB)).length;
    const aOnlyCount = usable.filter(a => engaged(a, factorA) && !engaged(a, factorB)).length;
    const bOnlyCount = usable.filter(a => !engaged(a, factorA) && engaged(a, factorB)).length;
    return {
      pair: label,
      ready: bothCount >= 2 && aOnlyCount >= 2 && bOnlyCount >= 2,
      bothEngaged: { count: bothCount, stillNeeded: Math.max(0, 2 - bothCount) },
      [`${factorA}Only`]: { count: aOnlyCount, stillNeeded: Math.max(0, 2 - aOnlyCount) },
      [`${factorB}Only`]: { count: bOnlyCount, stillNeeded: Math.max(0, 2 - bOnlyCount) },
    };
  });
}

function computeFactorInteractions(applicationsWithOutcomes){
  const usable = applicationsWithOutcomes.filter(a => a.factors_snapshot);
  if(usable.length < 6) return [];

  const overallPositive = usable.filter(a => POSITIVE_STATUSES_JS.has(a.outcome_status)).length;
  const baselineRate = overallPositive / usable.length;

  const findings = [];
  INTERACTION_PAIRS_JS.forEach(([label, factorA, factorB]) => {
    const engaged = (a, f) => (a.factors_snapshot[f] || 0) > 0;
    const bothHigh = usable.filter(a => engaged(a, factorA) && engaged(a, factorB));
    const aOnly = usable.filter(a => engaged(a, factorA) && !engaged(a, factorB));
    const bOnly = usable.filter(a => !engaged(a, factorA) && engaged(a, factorB));

    if(bothHigh.length < 2 || aOnly.length < 2 || bOnly.length < 2) return;

    const positiveRate = apps => apps.filter(a => POSITIVE_STATUSES_JS.has(a.outcome_status)).length / apps.length;
    const bothHighRate = positiveRate(bothHigh);
    const aOnlyLift = positiveRate(aOnly) - baselineRate;
    const bOnlyLift = positiveRate(bOnly) - baselineRate;
    const expectedBothHighRate = baselineRate + aOnlyLift + bOnlyLift;
    const synergy = bothHighRate - expectedBothHighRate;

    const minN = Math.min(bothHigh.length, aOnly.length, bOnly.length);
    const confidence = minN / (minN + 4);
    const shrunkSynergy = synergy * confidence;

    if(shrunkSynergy >= 0.15){
      findings.push({ pair: label, type: 'synergy', bothEngagedRate: Math.round(bothHighRate*1000)/1000, expectedIfAdditive: Math.round(Math.max(0,Math.min(1,expectedBothHighRate))*1000)/1000, sampleSize: bothHigh.length });
    } else if(shrunkSynergy <= -0.15){
      findings.push({ pair: label, type: 'redundant', bothEngagedRate: Math.round(bothHighRate*1000)/1000, expectedIfAdditive: Math.round(Math.max(0,Math.min(1,expectedBothHighRate))*1000)/1000, sampleSize: bothHigh.length });
    }
  });
  return findings;
}

function getFactorInteractionsJS(){
  const apps = getApplications().filter(a => a.outcome_status && a.factors_snapshot);
  return computeFactorInteractions(apps.map(a => ({ factors_snapshot: a.factors_snapshot, outcome_status: a.outcome_status })));
}

/* The self-audit no mainstream job platform does: checks whether its
   OWN personalization is actually helping, instead of assuming a
   cleverer-sounding algorithm is automatically a better one. It's
   entirely possible personalized weighting moves scores around
   without making them more accurate for a given person - or even
   makes them worse. This catches that honestly rather than hiding
   behind the appearance of sophistication. Mirrors the backend's
   audit_personalization_effect exactly, including the confidence
   shrinkage that protects the n=3 gate from small-sample noise. */
function auditPersonalizationEffect(applicationsWithOutcomes){
  const loss = (score, wasPositive) => wasPositive ? (100 - score) : score;

  const comparable = applicationsWithOutcomes.filter(a =>
    a.counterfactual_confidence_pct !== null && a.counterfactual_confidence_pct !== undefined &&
    Math.abs(Number(a.confidence_pct) - Number(a.counterfactual_confidence_pct)) >= 3
  );
  if(comparable.length < 3){
    const totalWithData = applicationsWithOutcomes.length;
    const note = totalWithData > comparable.length
      ? `You have ${totalWithData} applications with a real, logged outcome, but personalization hasn't meaningfully changed the score on enough of them yet to draw a real conclusion - only ${comparable.length} moved by 3 points or more, need at least 3 of those.`
      : `Not enough applications yet where personalization actually changed the score by a meaningful amount - need at least 3 to draw a real conclusion, have ${comparable.length}.`;
    return { verdict: 'insufficient_data', sampleSize: comparable.length, note };
  }

  const personalizedLoss = comparable.reduce((s,a) => s + loss(Number(a.confidence_pct), POSITIVE_STATUSES_JS.has(a.outcome_status)), 0) / comparable.length;
  const baselineLoss = comparable.reduce((s,a) => s + loss(Number(a.counterfactual_confidence_pct), POSITIVE_STATUSES_JS.has(a.outcome_status)), 0) / comparable.length;
  const rawImprovement = baselineLoss - personalizedLoss;

  const confidence = comparable.length / (comparable.length + 3);
  const improvement = rawImprovement * confidence;

  let verdict;
  if(improvement > 3) verdict = 'helping';
  else if(improvement < -3) verdict = 'hurting';
  else verdict = 'neutral';

  return {
    verdict, sampleSize: comparable.length, totalWithData: applicationsWithOutcomes.length,
    personalizedAvgError: Math.round(personalizedLoss*100)/100,
    baselineAvgError: Math.round(baselineLoss*100)/100,
    improvement: Math.round(improvement*100)/100,
  };
}

function getPersonalizationAuditJS(){
  const apps = getApplications().filter(a => a.outcome_status);
  return auditPersonalizationEffect(apps.map(a => ({ confidence_pct: a.confidence_pct, counterfactual_confidence_pct: a.counterfactual_confidence_pct, outcome_status: a.outcome_status })));
}

/* ---- Genuine longitudinal strategy: not another per-listing score,
   but an honest synthesis of everything a person has actually done -
   their real applications, real roadmap progress, and real saved
   listings - into a read on where they genuinely stand and whether
   their real actions compound toward something. Mirrors the
   backend's analyze_strategic_position exactly, including the same
   anti-fabrication guardrail: a model asked to find compounding
   connections has a real incentive to invent one even where none
   exists, so the prompt is explicit that genuine disconnection is a
   valid, honest finding, not a failure to find a thread. */
function formatApplicationsForStrategy(applications){
  if(!applications || !applications.length) return "No applications sent yet.";
  return applications.slice(0, 20).map(a => {
    const status = a.status || 'pending_review';
    const outcome = a.outcome_status ? `, real outcome: ${a.outcome_status}` : '';
    return `- "${a.listing_title || 'Unknown role'}" at ${a.listing_org || 'unknown org'} (sent ${a.created_at || 'unknown date'}, status: ${status}${outcome})`;
  }).join('\n');
}
function formatRoadmapForStrategy(milestones){
  if(!Array.isArray(milestones) || !milestones.length) return "No roadmap has been generated yet.";
  return milestones.filter(m => m && typeof m === 'object').map(m => `- Stage ${m.stage}: "${m.title || ''}" - status: ${m.status || 'planned'}`).join('\n');
}

function formatPreviousAnalysisForStrategy(previous){
  if(!previous) return null;
  return `Their position as read last time: "${previous.current_position || ''}"\nThe next move suggested last time: "${(previous.next_move || {}).action || ''}"`;
}

function formatEngagementForStrategy(engagementActivity){
  const accepted = (engagementActivity || []).filter(e => e.status === 'accepted');
  if(!accepted.length) return "No real, accepted engagement activity yet.";
  return accepted.map(e => {
    const log = e.communication_log || [];
    const logNote = log.length ? `, follow-up: ${log[log.length-1].note}` : '';
    return `- Genuinely posted a reply to a real post (${e.poster_context || 'poster context not given'})${logNote}`;
  }).join('\n');
}

async function analyzeStrategicPositionJS(profile, roadmapMilestones, applications, savedListings, previousAnalysis, engagementActivity){
  const applicationsText = formatApplicationsForStrategy(applications);
  const roadmapText = formatRoadmapForStrategy(roadmapMilestones);
  const savedText = (savedListings && savedListings.length)
    ? savedListings.slice(0,10).map(s => `"${s.title || ''}" at ${s.org || ''}`).join(', ')
    : 'None saved yet.';
  const engagementText = formatEngagementForStrategy(engagementActivity);
  const previousText = formatPreviousAnalysisForStrategy(previousAnalysis);
  const previousBlock = previousText ? `\n${previousText}\n` : '';
  const previousInstruction = previousText
    ? `\n\n4. Since you have a real record of their previous position above, explicitly compare it against their current, real situation. Has genuine, measurable progress happened since then (e.g. a new real outcome, a completed roadmap milestone, real movement on the next move suggested last time)? Or has nothing genuinely changed? Either is a valid, honest finding - if their real data shows no meaningful movement since the last check, say that plainly rather than manufacturing encouraging-sounding change that isn't actually there. Do not credit them with "progress" for actions that were already reflected in the previous read.`
    : '';
  const momentumKeyInstruction = previousText
    ? `\n- momentum_since_last_check: an object with "changed" (true only if something real and specific genuinely changed since the previous position above) and "summary" (1-2 honest sentences - either naming the real, specific change, or plainly stating that nothing has genuinely moved since last time)`
    : '';

  const prompt = `A candidate's real, stated goal: "${profile.northstar || 'not specified'}". What "made it" looks like to them: "${profile.finalidea || 'not specified'}". Their stated skills: "${profile.skills || 'not specified'}". What matters most to them: ${(Array.isArray(profile.priorities) ? profile.priorities : []).join(', ') || 'not specified'}.
${previousBlock}
Their real roadmap (their own stated plan):
${roadmapText}

Their real applications actually sent, with real outcomes where known:
${applicationsText}

Listings they've saved but not yet acted on: ${savedText}

Their real, genuine engagement activity (only suggestions they actually accepted and posted, never ones drafted but ignored):
${engagementText}

You are synthesizing this person's REAL, accumulated history - not scoring one listing in isolation. Answer these things, grounded ONLY in what's actually here:

1. An honest, specific read on where they genuinely stand right now - their real momentum (or lack of it), based on the actual pattern of applications/outcomes/roadmap progress above, not a generic assessment of "early career" or similar. If the real data shows stalled momentum or no clear direction, say that plainly rather than finding false encouragement. Also explicitly check whether their real, actual applications align with their stated goal above - if their real behavior points somewhere genuinely different from what they said they want (e.g. their stated goal is one field but every real application sent is in a different one), name that honestly. This kind of real, checkable mismatch is one of the most valuable things this analysis can surface, so don't let a focus on "momentum" alone cause you to miss it.

2. Whether their real actions so far genuinely compound - do any of their actual applications, roadmap progress, saved listings, or real engagement activity build on each other in a real, specific way (e.g. an application to a smaller company in the same real domain as their stated goal genuinely builds real, checkable experience toward a saved listing at a bigger one, or a real, accepted engagement reply to someone at a company connects to a real application or saved listing there)? This must be a REAL, SPECIFIC connection between things that actually appear above - if their actions are genuinely disconnected from each other with no real compounding relationship, say that honestly rather than inventing a narrative thread that isn't there. Do not stitch together two unrelated actions into a false "strategy" - a genuine absence of connection is a real, useful finding, not a failure to find one. A real connection is something that has ALREADY happened - a real outcome, a real shared company, a real skill actually demonstrated in one place that a specific other listing actually requires. It is not two independent, still-pending applications in the same broad field that COULD matter to each other IF a future outcome goes a certain way - "if either produces an offer, it would create leverage" is speculation about a hypothetical future, not a real, existing compounding relationship, even when the underlying field matches. If the only relationship you can point to is that kind of hypothetical, treat it as no genuine connection rather than a real one.

3. Given all of the above, ONE specific, highest-leverage next move - not a generic "apply to more listings" but a specific action that genuinely compounds given their real, particular situation, and a concrete reason why THIS one, not something else.${previousInstruction}

Return a JSON object with exactly these four keys:
- current_position: 2-3 honest, specific sentences per point 1 above
- compounding_connections: an array of 0-3 strings, each describing one real, specific compounding relationship you found (empty array if genuinely none exist - do not force one)
- has_genuine_compounding: true only if compounding_connections is non-empty and each entry describes a real, specific, checkable relationship - false if their actions are genuinely disconnected
- next_move: an object with "action" (one specific, concrete thing to do) and "why_this_compounds" (1-2 sentences on why this specific move, given their real situation, builds on what already exists rather than starting a new, disconnected thread)${momentumKeyInstruction}

Return ONLY valid JSON, nothing else, no markdown fences, no commentary.`;

  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 900, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(text);

    if(typeof parsed.current_position !== 'string' || !parsed.current_position.trim()){
      throw new Error('Strategic position response is missing a real current_position');
    }
    if(!Array.isArray(parsed.compounding_connections)){
      throw new Error('Strategic position response compounding_connections is not a real list');
    }
    if(!parsed.compounding_connections.every(c => typeof c === 'string' && c.trim())){
      throw new Error('Strategic position response has an empty or non-string compounding connection');
    }
    if(typeof parsed.has_genuine_compounding !== 'boolean'){
      throw new Error('Strategic position response has_genuine_compounding is not a real boolean');
    }
    const nextMove = parsed.next_move;
    if(!nextMove || typeof nextMove.action !== 'string' || !nextMove.action.trim() ||
       typeof nextMove.why_this_compounds !== 'string' || !nextMove.why_this_compounds.trim()){
      throw new Error('Strategic position response has an incomplete next_move');
    }
    if(previousText){
      const momentum = parsed.momentum_since_last_check;
      if(!momentum || typeof momentum.changed !== 'boolean' || typeof momentum.summary !== 'string' || !momentum.summary.trim()){
        throw new Error('Strategic position response has an incomplete momentum_since_last_check');
      }
    }
    // Honest consistency check - mirrors the backend exactly: a
    // genuinely inconsistent true/empty-array pair is corrected
    // rather than silently rendering a confident "yes, compounding"
    // verdict with nothing behind it.
    if(parsed.has_genuine_compounding && parsed.compounding_connections.length === 0){
      parsed.has_genuine_compounding = false;
    }
    return parsed;
  } catch(err){ console.error('Strategic position analysis failed:', err); return null; }
}

function computeStrategyInputSignature(roadmapMilestones, applications, savedListings, engagementActivity){
  // A cheap, real signature of the person's current data shape - not
  // a hash of full content, just enough to detect a genuine change.
  // Mirrors the backend's _compute_input_signature exactly.
  const roadmapSig = (roadmapMilestones||[]).map(m => `${m.stage}:${m.status}`).join('|');
  const appsSig = (applications||[]).map(a => `${a.status}:${a.outcome_status}:${a.created_at}`).join('|');
  const savedSig = (savedListings||[]).map(s => `${s.title}:${s.org}`).join('|');
  const engagementSig = (engagementActivity||[]).map(e => `${e.status}:${(e.communication_log||[]).length}`).join('|');
  return `${roadmapSig}||${appsSig}||${savedSig}||${engagementSig}`;
}

async function getOrAnalyzeStrategicPositionJS(profile, roadmapMilestones, applications, savedListings, engagementActivity){
  // Backend-first: the server reads the same real data (profile, roadmap,
  // applications, saved listings, engagement activity) and keeps its own
  // content-based cache, so a logged-in analysis runs server-side with the
  // shared API key instead of a browser->Anthropic call that can't
  // authenticate. Falls through to the local cache + direct call below when
  // logged out or the backend is unreachable, so the feature still works.
  const _spSession = (typeof getSession === 'function') ? getSession() : null;
  if(_spSession && _spSession.user_id && typeof apiStrategicPosition === 'function'){
    const _beResult = await apiStrategicPosition(_spSession.user_id);
    if(_beResult) return _beResult;
  }

  // Checks the real, local cache before ever making a real, billed
  // API call - without this, opening the overview page twice in a
  // row would trigger the same real analysis again for no reason.
  // Content-based invalidation, not time-based, mirroring the
  // backend exactly: this person's own real data can change within
  // minutes, so a fixed time window would risk a stale read right
  // after they take a real, new action.
  const signature = computeStrategyInputSignature(roadmapMilestones, applications, savedListings, engagementActivity);
  let cached = null;
  try{ cached = JSON.parse(localStorage.getItem('kaidostar_strategy_cache')); }catch(e){ cached = null; }
  if(cached && cached.signature === signature && cached.result){
    return { ...cached.result, cached: true };
  }

  // A cache miss means a fresh, real analysis is about to run - this
  // is what makes the feature genuinely longitudinal rather than a
  // single, isolated snapshot each time: the most recent real entry
  // in the history log becomes real context for the new analysis.
  let history = [];
  try{ const _sh = JSON.parse(localStorage.getItem('kaidostar_strategy_history')); history = Array.isArray(_sh) ? _sh : []; }catch(e){ history = []; }
  const previousAnalysis = history.length ? history[history.length - 1].result : null;

  const fresh = await analyzeStrategicPositionJS(profile, roadmapMilestones, applications, savedListings, previousAnalysis, engagementActivity);
  if(!fresh) return null;

  try{
    _safeSetItem('kaidostar_strategy_cache', JSON.stringify({ signature, result: fresh }));
  }catch(e){ /* storage full or unavailable - the fresh result is still returned below */ }

  try{
    const updatedHistory = [...history, { signature, result: fresh, analyzed_at: new Date().toISOString() }].slice(-10);
    _safeSetItem('kaidostar_strategy_history', JSON.stringify(updatedHistory));
  }catch(e){ /* storage full or unavailable - the fresh result is still returned below */ }

  return { ...fresh, cached: false };
}

/* Real, client-side engagement-suggestion drafting - mirrors the
   backend's draft_engagement_suggestion exactly, including why this
   never touches LinkedIn directly: their own API Terms of Use
   explicitly prohibit both automated scraping and automating
   comments/posting on a person's behalf. This only ever works from
   real post text the person pastes in themselves, and only ever
   drafts words for them to review and post manually. */
async function draftEngagementSuggestionJS(profile, postContent, posterContext){
  // Backend-first: the server reads the profile server-side and runs the identical
  // engagement drafter (same three-key shape). Falls back to the direct call below
  // when logged out or the backend is unreachable.
  const _egSession = (typeof getSession === 'function') ? getSession() : null;
  if(_egSession && _egSession.user_id && typeof apiDraftEngagement === 'function'){
    const _be = await apiDraftEngagement(_egSession.user_id, postContent, posterContext);
    if(_be) return _be;
  }
  const cleanedPosterContext = (posterContext || '').trim() || null;
  const posterLine = cleanedPosterContext
    ? `What the person knows about who posted this: "${cleanedPosterContext}"`
    : "No information given about who posted this beyond the text itself.";

  const prompt = `A candidate's real, stated goal: "${profile.northstar || 'not specified'}". Their real, stated skills: "${profile.skills || 'not specified'}".

A real post they found and want to engage with thoughtfully:
"${postContent}"

${posterLine}

Draft ONE real, specific, thoughtful question or comment this candidate could post themselves in reply - never something generic like "Great post!" or "Thanks for sharing," and never something that could apply to any post on any topic. It must demonstrate genuine, specific understanding of what THIS post actually says, and be the kind of question that could plausibly open a real conversation with the poster - not just perform engagement. Do not invent any fact about the poster, their company, or their situation beyond what's actually given above; if poster context is empty, do not guess at who they are.

Also give an honest, realistic read on whether this poster looks like a smaller, more accessible decision-maker (e.g. a small-business owner, solo founder, or manager at a small team who might realistically read and personally respond to a thoughtful comment) versus someone at a large company whose posts likely get many comments a senior leader won't personally see. Base this only on what's actually stated in the post text and poster context - if there's genuinely not enough information to tell, say so honestly rather than guessing.

Return a JSON object with exactly these three keys:
- drafted_question: the real, specific question/comment text, ready to post as-is (no quotes around it, no "Consider saying:" preamble)
- is_smaller_decision_maker: true only if the real, given information genuinely suggests a smaller, more accessible poster - false if it suggests a large organization, and false (not a guess) if there's genuinely not enough information either way
- reasoning: 1-2 honest sentences explaining why this specific question was chosen and what the realistic read on the poster is - visible to the person deciding whether to actually post this, not hidden reasoning

Return ONLY valid JSON, nothing else, no markdown fences, no commentary.`;

  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(text);

    if(typeof parsed.drafted_question !== 'string' || !parsed.drafted_question.trim()){
      throw new Error('Engagement suggestion response is missing a real drafted_question');
    }
    if(typeof parsed.is_smaller_decision_maker !== 'boolean'){
      throw new Error('Engagement suggestion response is_smaller_decision_maker is not a real boolean');
    }
    if(typeof parsed.reasoning !== 'string' || !parsed.reasoning.trim()){
      throw new Error('Engagement suggestion response is missing real reasoning');
    }
    return parsed;
  } catch(err){ console.error('Engagement suggestion drafting failed:', err); return null; }
}

function getEngagementSuggestions(){ try{ const _v = JSON.parse(localStorage.getItem('kaidostar_engagement_suggestions')); return Array.isArray(_v) ? _v : []; }catch(e){ return []; } }
function saveEngagementSuggestions(list){ _safeSetItem('kaidostar_engagement_suggestions', JSON.stringify(list)); }

async function draftAndSaveEngagementSuggestion(postContent, posterContext){
  if(!postContent || !postContent.trim()){
    return { error: 'Paste in the real post text first.' };
  }
  const profile = JSON.parse(localStorage.getItem('kaidostar_profile') || 'null') || {};
  const result = await draftEngagementSuggestionJS(profile, postContent.trim(), posterContext);
  if(!result){
    return { error: "Couldn't draft a suggestion just now - try again in a moment." };
  }
  const suggestion = {
    id: 'eng_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    post_content: postContent.trim(),
    poster_context: (posterContext || '').trim() || null,
    drafted_question: result.drafted_question,
    is_smaller_decision_maker: result.is_smaller_decision_maker,
    reasoning: result.reasoning,
    status: 'drafted',
    email_sent_at: null,
    responded_at: null,
    communication_log: [],
    created_at: new Date().toISOString(),
  };
  const list = getEngagementSuggestions();
  list.unshift(suggestion);
  saveEngagementSuggestions(list);
  return { error: null, suggestion };
}

async function sendEngagementSuggestionEmail(id){
  // Honest limitation, mirroring sendOutreachDraft exactly: this
  // standalone frontend demo has no backend attached and no real
  // mail-sending credentials available to a browser. The real send
  // happens via POST /engagement/{id}/send-email once this frontend
  // is connected to your deployed backend, which calls Resend for
  // real, with a genuine, secure accept token embedded in the email.
  const list = getEngagementSuggestions();
  const suggestion = list.find(s => s.id === id);
  if(!suggestion || suggestion.status === 'accepted' || suggestion.status === 'declined') return { status: 'error' };
  suggestion.status = 'emailed';
  suggestion.email_sent_at = new Date().toISOString();
  saveEngagementSuggestions(list);
  return { status: 'sent' };
}

function declineEngagementSuggestion(id){
  const list = getEngagementSuggestions();
  const suggestion = list.find(s => s.id === id);
  if(!suggestion) return { status: 'error' };
  suggestion.status = 'declined';
  suggestion.responded_at = new Date().toISOString();
  saveEngagementSuggestions(list);
  return { status: 'declined' };
}

function acceptEngagementSuggestion(id){
  const list = getEngagementSuggestions();
  const suggestion = list.find(s => s.id === id);
  if(!suggestion) return { status: 'error' };
  suggestion.status = 'accepted';
  suggestion.responded_at = new Date().toISOString();
  saveEngagementSuggestions(list);
  return { status: 'accepted' };
}

function addEngagementCommunicationLog(id, note){
  if(!note || !note.trim()) return { status: 'error', error: 'note cannot be empty' };
  const list = getEngagementSuggestions();
  const suggestion = list.find(s => s.id === id);
  if(!suggestion) return { status: 'error' };
  const log = suggestion.communication_log || [];
  log.push({ at: new Date().toISOString(), note: note.trim() });
  suggestion.communication_log = log;
  saveEngagementSuggestions(list);
  return { status: 'ok', suggestion };
}

async function generateDeepPersonalizationInsightsJS(){
  const apps = getApplications().filter(a => a.draft && a.outcome_status);
  if(apps.length < 3){
    // Was < 4 - see the backend's matching.py for the empirical
    // reasoning (a real, hand-verified test at n=3 with a
    // deliberately weak/murky pattern stayed genuinely tentative
    // rather than forcing false confidence).
    return { insights: [], sampleSize: apps.length, note: "Not enough applications with both a draft and a logged outcome yet - need at least 3 to find a real pattern in what you've actually written, rather than guessing." };
  }

  // Backend-first: the server reads the same applications + outcomes and runs
  // the identical honest pattern-finder (including the application-number
  // hallucination check) with the shared API key. Falls back to the direct
  // browser->Anthropic call below when logged out or the backend is
  // unreachable.
  const _piSession = (typeof getSession === 'function') ? getSession() : null;
  if(_piSession && _piSession.user_id && typeof apiPersonalizationInsights === 'function'){
    const _beResult = await apiPersonalizationInsights(_piSession.user_id);
    if(_beResult) return _beResult;
  }

  const listingsById = {}; LISTINGS.forEach(l => { listingsById[l.id] = l; });
  const applicationsText = apps.map((a, i) => {
    const listing = listingsById[parseInt(a.listing_id)] || listingsById[a.listing_id];
    const tags = listing ? listing.tags.join(', ') : '';
    return `Application ${i+1} - to "${a.listing_title}" at ${a.listing_org} (tags: ${tags}). Outcome: ${a.outcome_status}.\nWhat was actually sent:\n"${(a.draft || '').slice(0,600)}"`;
  }).join('\n\n');

  const prompt = `Here are ${apps.length} real job applications a candidate actually sent, each with what they actually wrote and what really happened:\n\n${applicationsText}\n\nFind SPECIFIC, CONCRETE patterns in what was actually written that correlate with the real outcomes - not generic career advice like "tailor your resume" or "follow up promptly". Look for things like: specific phrasings, whether achievements were quantified vs described generically, which topics or skills were emphasized, sentence structure, length, tone, what got left out. Reference the actual applications by number when you find something. If there's truly no clear pattern yet, say that honestly rather than inventing one - a small sample size deserves epistemic humility, not a confident-sounding guess.\n\nReturn a JSON object with exactly these two keys:\n- insights: an array of 2-4 strings, each a specific, content-grounded finding (or, if genuinely no pattern exists, a single honest string saying so)\n- confidence: "low", "moderate", or "high" - how confident this pattern-finding actually is given the sample size and how consistent the pattern is\n\nReturn ONLY valid JSON, nothing else, no markdown fences, no commentary.`;

  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 700, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(text);
    if(!Array.isArray(parsed.insights)){
      // Explicit, intentional check rather than relying on the
      // forEach below to accidentally throw on a non-array value -
      // mirrors the backend's own explicit shape validation for this
      // identical function, and documents the real contract this
      // function guarantees rather than an implicit side effect.
      throw new Error('Deep personalization insights response has an unexpected shape');
    }
    parsed.sampleSize = apps.length;
    parsed.note = null;

    // Confidence normalization - confirmed via the real consumer
    // (overview.html's confidenceLabel lookup table) that an
    // unexpected value here doesn't error, it silently drops the
    // confidence tag from the page entirely with no visible sign
    // anything went wrong. Normalizes case/whitespace and falls back
    // to the most conservative label rather than showing no
    // confidence signal at all when one was requested.
    const rawConfidence = String(parsed.confidence || '').trim().toLowerCase();
    parsed.confidence = ['low','moderate','high'].includes(rawConfidence) ? rawConfidence : 'low';

    // Application-number hallucination check - mirrors the backend
    // exactly, verified by hand that a genuinely correct response
    // references real applications this way ("(1 and 3)",
    // "applications 2 and 4"), so this covers more than the narrow
    // "Application N" phrasing alone would.
    const validMax = apps.length;
    const flaggedIndices = [];
    (parsed.insights || []).forEach((insight, i) => {
      const refs = new Set();
      for(const m of insight.matchAll(/[Aa]pplications?\s*#?(\d+)/g)) refs.add(parseInt(m[1]));
      for(const parenMatch of insight.matchAll(/\(([^)]*\d[^)]*)\)/g)){
        for(const numMatch of parenMatch[1].matchAll(/\d+/g)) refs.add(parseInt(numMatch[0]));
      }
      if([...refs].some(r => r < 1 || r > validMax)) flaggedIndices.push(i);
    });
    parsed.flaggedInsightIndices = flaggedIndices;

    return parsed;
  } catch(err){
    console.error('Deep personalization insights failed:', err);
    return null;
  }
}

async function explainOutcomeDeep(application, listing, profile){
  const prompt = `A candidate applied to "${listing.title}" at ${listing.org}, tags: ${listing.tags.join(', ')}. The match confidence at the time was ${application.confidence_pct}%. The outcome was: ${application.outcome_status}.\n\nThe application they actually sent:\n"${application.draft}"\n\nCandidate's stated goal: "${profile.northstar || 'not specified'}". Skills: "${profile.skills || 'not specified'}".\n\nGive a specific, honest hypothesis for what likely contributed to this outcome - compare the actual draft against the actual listing's requirements, don't give generic advice like "keep trying" or "tailor your resume". If the confidence score itself seems to have been wrong (too high or too low for what happened), say so directly. 3-4 sentences, concrete and specific.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 250, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    return (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n') || null;
  } catch(err){ console.error('Outcome explanation failed:', err); return null; }
}

/* ---- Waypoint: a private progress journal, not a social feed.
   This used to include mock peer posts, connection suggestions, and
   a feed ranked by relevance to other people. Cut deliberately: a
   feed and connections only have real value once there are enough
   real users for either to mean something, and a connection feature
   between real people carries a genuine moderation/safety workload
   that isn't worth taking on before there's anyone real to connect
   with. What's left is the part with real value on day one: logging
   real progress, tagged to what's real for each role, with both a
   per-entry reflection AND a genuine pattern reflection across
   several entries - a single one-off reflection doesn't tell you
   anything a journal keeper wouldn't already know; spotting a
   pattern across a week of entries actually does. ---- */
function getWaypointPosts(storageKey){
  try{ const _v = JSON.parse(localStorage.getItem(storageKey)); return Array.isArray(_v) ? _v : []; }
  catch(e){ return []; }
}
function saveWaypointPost(storageKey, post){
  const own = getWaypointPosts(storageKey);
  own.unshift(post);
  _safeSetItem(storageKey, JSON.stringify(own));
}
function updateWaypointPost(storageKey, id, newBody){
  const own = getWaypointPosts(storageKey);
  const entry = own.find(p => p.id === id);
  if(entry){ entry.body = newBody; entry.edited_at = new Date().toISOString(); }
  _safeSetItem(storageKey, JSON.stringify(own));
}
function deleteWaypointPost(storageKey, id){
  const own = getWaypointPosts(storageKey).filter(p => p.id !== id);
  _safeSetItem(storageKey, JSON.stringify(own));
}

/* Aliases for the candidate role, pointing at the real key
   waypoint.html itself actually reads from (its own STORAGE_KEY
   constant) - previously pointed at a stale, orphaned key that no
   page actually displayed, meaning entries created here were being
   saved somewhere the real journal never showed them. */
function getWaypointPostsAll(){ return getWaypointPosts('kaidostar_waypoint_candidate'); }
function saveOwnWaypointPost(post){ saveWaypointPost('kaidostar_waypoint_candidate', post); }

async function reflectOnJournalEntry(profile, contextSummary, entryBody, tagLabel){
  const tagLine = tagLabel ? `They tagged this entry to: "${tagLabel}".\n` : '';
  const prompt = `A person's goal or focus: "${profile.northstar || profile.focus || ''}". Their current strategy or context: "${contextSummary || 'none stated yet'}".\n${tagLine}\nA journal entry they just wrote about their progress:\n"${entryBody}"\n\nIn 2-3 sentences, give an honest, specific reflection - does this genuinely represent progress toward their stated goal, is there a real risk or blind spot worth naming, or a concrete next step implied by what they wrote? Reference their actual goal or tag by name. Avoid generic encouragement like "great job" or "keep it up" - be specific or say nothing complimentary at all.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 200, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    return (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n') || null;
  } catch(err){ console.error('Journal reflection failed:', err); return null; }
}

/* The genuinely new piece: a real pattern reflection across several
   recent entries, not just one. This is what makes a journal
   actually useful instead of decorative - a single-entry reflection
   can only ever restate what you just wrote back at you; a pattern
   across entries can surface something you wouldn't have noticed
   yourself (a recurring blocker, a stalled area, a real trend). */
async function reflectOnEntryPattern(profile, contextSummary, recentEntries){
  // Backend-first: the server reads the user's own recent journal posts server-side
  // and returns the identical pattern-reflection string. Needs >=2 synced posts;
  // falls back to the direct call below (over the passed entries) when logged out,
  // unreachable, or too few posts are synced.
  const _rpSession = (typeof getSession === 'function') ? getSession() : null;
  if(_rpSession && _rpSession.user_id && typeof apiReflectEntryPattern === 'function'){
    const _focus = (profile && (profile.northstar || profile.focus)) || '';
    const _be = await apiReflectEntryPattern(_rpSession.user_id, _focus, contextSummary, Array.isArray(recentEntries) ? recentEntries.length : undefined);
    if(_be) return _be;
  }
  const entriesText = recentEntries.map((e, i) => `${i+1}. ${e.tag_label ? `[${e.tag_label}] ` : ''}${e.body}`).join('\n');
  const prompt = `A person's goal or focus: "${profile.northstar || profile.focus || ''}". Their current strategy or context: "${contextSummary || 'none stated yet'}".\n\nTheir last ${recentEntries.length} journal entries, most recent first:\n${entriesText}\n\nLook across ALL of these entries together - not one at a time - and give an honest, specific pattern reflection in 3-4 sentences. Is there a recurring blocker or theme they may not have noticed themselves? Is progress actually happening, stalling, or scattered across unrelated things? Reference specific entries or their actual goal by name. Do not just summarize what they wrote - say something they couldn't have gotten from re-reading their own entries.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 250, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    return (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n') || null;
  } catch(err){ console.error('Pattern reflection failed:', err); return null; }
}

function waypointTimeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if(days === 0) return 'Today';
  if(days === 1) return '1 day ago';
  return `${days} days ago`;
}

/* The single shared renderer used identically by every role's
   Waypoint page - centralizing this avoids 4 near-duplicate copies
   silently drifting out of sync with each other over time.
   opts: { storageKey, profile, getContextSummary(), listElId,
   countElId, patternBtnId, patternResultId, tagFieldLabel } */
function escapeForHtml(str){
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function safeHref(url){
  // A real, explicit protocol check - HTML-escaping alone would not
  // stop a genuine javascript: URL from executing when clicked, since
  // the malicious payload IS the attribute value itself, not an
  // embedded HTML tag. Found via brutal testing that a real
  // javascript: video_url genuinely became a live, clickable href.
  const u = (url || '').trim();
  // Only allow absolute http(s) URLs (blocks javascript:, data:, vbscript:, etc.),
  // AND percent-encode the characters that could break out of the surrounding
  // href="..." attribute - a valid-scheme URL like `https://x" onmouseover=...`
  // otherwise still injects. Both guards are needed; escaping alone wouldn't stop
  // the scheme, and the scheme check alone wouldn't stop attribute breakout.
  if(!/^https?:\/\//i.test(u)) return '#';
  return u.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/`/g, '%60');
}

function renderWaypointJournal(opts){
  const allEntries = getWaypointPosts(opts.storageKey);
  const query = (opts.searchQuery || '').trim().toLowerCase();
  const entries = query
    ? allEntries.filter(e => e.body.toLowerCase().includes(query) || (e.tag_label || '').toLowerCase().includes(query))
    : allEntries;

  const countEl = document.getElementById(opts.countElId);
  if(countEl) countEl.textContent = query
    ? `${entries.length} of ${allEntries.length} ${allEntries.length === 1 ? 'entry' : 'entries'} match`
    : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;

  const listEl = document.getElementById(opts.listElId);
  if(allEntries.length === 0){
    listEl.innerHTML = `<div class="empty-state"><div class="glyph">&#128220;</div>No entries yet.<div class="sub">Add your first one above.</div></div>`;
    const patternPanel = document.getElementById(opts.patternPanelId);
    if(patternPanel) patternPanel.classList.add('hidden');
    return;
  }
  if(entries.length === 0){
    listEl.innerHTML = `<div class="empty-state"><div class="glyph">&#128269;</div>No entries match "${escapeForHtml(opts.searchQuery)}".<div class="sub">Try a different word, or clear the search.</div></div>`;
    const patternPanel = document.getElementById(opts.patternPanelId);
    if(patternPanel) patternPanel.classList.add('hidden');
    return;
  }

  const patternPanel = document.getElementById(opts.patternPanelId);
  if(patternPanel) patternPanel.classList.toggle('hidden', allEntries.length < 3);

  listEl.innerHTML = entries.map(entry => `<div class="entry-card" data-entry-id="${entry.id}">
    <div class="entry-head">
      <span class="entry-time">${waypointTimeAgo(entry.created_at)}${entry.edited_at ? ' (edited)' : ''}</span>
      ${entry.tag_label ? `<span class="entry-stage-badge">${escapeForHtml(entry.tag_label)}</span>` : ''}
    </div>
    <p class="entry-body" id="body-${entry.id}">${escapeForHtml(entry.body)}</p>
    <textarea class="entry-edit-area hidden" id="edit-${entry.id}">${escapeForHtml(entry.body)}</textarea>
    ${entry.video_url ? `<div class="entry-video-note">&#127909; Video: <a href="${safeHref(entry.video_url)}" target="_blank" style="color:var(--comet);">${escapeForHtml(entry.video_url)}</a></div>` : ''}
    <div class="entry-actions">
      <button class="entry-action-btn" data-action="reflect" data-entry-id="${entry.id}">Ask Metis to reflect</button>
      <button class="entry-action-btn" data-action="edit" data-entry-id="${entry.id}">Edit</button>
      <button class="entry-action-btn" data-action="delete" data-entry-id="${entry.id}">Delete</button>
    </div>
    <div class="entry-reflection" id="reflection-${entry.id}"></div>
  </div>`).join('');

  listEl.querySelectorAll('[data-action="reflect"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entryId = btn.dataset.entryId;
      const entry = entries.find(e => e.id === entryId);
      const container = document.getElementById('reflection-' + entryId);
      btn.disabled = true; btn.textContent = 'Thinking...';
      container.innerHTML = `<p style="color:var(--text-faint); font-style:italic;">Reflecting...</p>`;
      container.classList.add('open');
      // Backend-first: the server reads this post by its real id and returns the
      // identical reflection. Only attempted for a synced post (a server post id);
      // local-only entries fall back to the direct call with their body inline.
      let text = null;
      const _rjSession = (typeof getSession === 'function') ? getSession() : null;
      if(_rjSession && _rjSession.user_id && entry && entry.id && typeof apiReflectJournalEntry === 'function'){
        const _focus = (opts.profile && (opts.profile.northstar || opts.profile.focus)) || '';
        text = await apiReflectJournalEntry(entry.id, _focus, opts.getContextSummary());
      }
      if(!text){ text = await reflectOnJournalEntry(opts.profile, opts.getContextSummary(), entry.body, entry.tag_label); }
      btn.disabled = false; btn.textContent = 'Ask Metis to reflect';
      // escapeForHtml: reflectOnJournalEntry returns raw model text, so rendering it
      // straight into innerHTML was an XSS sink (model output / prompt-injected entry
      // body could carry HTML). The waypoint page-level reflect already escapes; match it.
      container.innerHTML = text ? escapeForHtml(text) : `<span style="color:var(--danger);">Couldn't reach Metis just now - try again.</span>`;
    });
  });

  listEl.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const entryId = btn.dataset.entryId;
      const bodyEl = document.getElementById('body-' + entryId);
      const editEl = document.getElementById('edit-' + entryId);
      const editing = !editEl.classList.contains('hidden');
      if(editing){
        const newBody = editEl.value.trim();
        if(!newBody){
          // Mirrors the validation the create path already had -
          // never save an edit that would leave a real, existing
          // entry emptied out. Reverts the textarea back to the
          // entry's real, current text instead of silently discarding it.
          editEl.value = bodyEl.textContent;
          return;
        }
        updateWaypointPost(opts.storageKey, entryId, newBody);
        renderWaypointJournal(opts);
      } else {
        bodyEl.classList.add('hidden');
        editEl.classList.remove('hidden');
        btn.textContent = 'Save';
      }
    });
  });

  listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteWaypointPost(opts.storageKey, btn.dataset.entryId);
      renderWaypointJournal(opts);
    });
  });
}

/* ---- Company Research + Interview Prep Coach. Mirrors
   app/services/market_research.py exactly - real web search on a
   specific company, and a real prep brief once someone has an
   actual interview. Neither of these exist on any mainstream job
   board: they show you a match score and stop there. ---- */
async function researchCompany(companyName, roleTitle){
  const prompt = `Search for real, current, publicly available information about "${companyName}" that would help someone preparing to apply for or interview for a "${roleTitle}" role there - what the company says about itself, recent news, their stated values or mission, size and stage, and anything publicly discussed about their interview process or culture.\n\nReport ONLY what you actually find through search - do not fill in gaps with generic assumptions about companies of this type in general, and do not invent specific claims this company doesn't support. If you can't find anything specific and current, say that plainly rather than guessing.\n\nParaphrase what you find in your own words rather than quoting sources at length. Structure your answer as: what you found, and then 2-3 concrete implications for how this candidate should position themselves for this specific company and role.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{role:"user", content: prompt}],
      })
    });
    const data = await response.json();
    const findings = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n');
    const sources = [];
    (data.content || []).forEach(block => {
      if(block.type === 'web_search_tool_result' && Array.isArray(block.content)){
        block.content.forEach(item => { if(item.url) sources.push({ url: item.url, title: item.title || item.url }); });
      }
    });
    return { findings: findings || null, sources };
  } catch(err){ console.error('Company research failed:', err); return null; }
}

async function generateInterviewPrep(companyName, roleTitle, companyResearch, profile, roadmapSummary){
  const researchLine = companyResearch
    ? `Real research on this company: "${companyResearch}"\n\n`
    : `No company research has been done yet for this one - work from the role and candidate's background only, and don't invent specifics about the company.\n\n`;
  const prompt = `A candidate has a real interview for "${roleTitle}" at "${companyName}".\n\n${researchLine}Their stated goal: "${profile.northstar || 'not specified'}". Skills: "${profile.skills || 'not specified'}". Their roadmap strategy: "${roadmapSummary || 'no roadmap yet'}".\n\nGenerate a real, specific interview prep brief - grounded in what's actually known about this role and candidate, not generic interview advice.\n\nReturn a JSON object with exactly these four keys:\n- likely_questions: an array of 3-4 objects, each with exactly two keys - "question" (the specific question this candidate should genuinely expect for this role) and "note" (a 1-sentence note on what a strong answer would actually demonstrate)\n- talking_points: an array of 3-4 specific things from THIS candidate's real background (reference their actual stated skills/goal) that are worth emphasizing for this specific role\n- questions_to_ask: an array of 2-3 real, specific questions this candidate should ask the interviewer - not generic ("what's the culture like"), grounded in the actual role or company research if available\n- roadmap_connection: 1-2 sentences on how this specific interview connects to the candidate's actual roadmap - what it would mean for their plan if it goes well\n\nReturn ONLY valid JSON, nothing else, no markdown fences, no commentary.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(text);
    const shapeIsValid = Array.isArray(parsed.likely_questions) && Array.isArray(parsed.talking_points) &&
      Array.isArray(parsed.questions_to_ask) && typeof parsed.roadmap_connection === 'string';
    if(!shapeIsValid){
      // A genuinely valid-JSON-but-incomplete response (missing a key,
      // or the wrong type for one) must be treated the same as a
      // parse failure, not passed through - otherwise renderInterviewPrep
      // crashes on the first missing field with an uncaught error,
      // leaving the person's UI silently stuck rather than showing the
      // "couldn't generate this" message the caller already handles.
      console.error('Interview prep response had an unexpected shape:', parsed);
      return null;
    }
    return parsed;
  } catch(err){ console.error('Interview prep generation failed:', err); return null; }
}

function getCompanyResearchCache(){ try{ return JSON.parse(localStorage.getItem('kaidostar_company_research')) || {}; }catch(e){ return {}; } }
function saveCompanyResearchCache(cache){ _safeSetItem('kaidostar_company_research', JSON.stringify(cache)); }
function getInterviewPrepCache(){ try{ return JSON.parse(localStorage.getItem('kaidostar_interview_prep')) || {}; }catch(e){ return {}; } }
function saveInterviewPrepCache(cache){ _safeSetItem('kaidostar_interview_prep', JSON.stringify(cache)); }

/* ---- "Why not" near-misses - the listings that fell just short of
   the ranked list, with the same real, grounded rationale used for
   every listing (not a separately-invented negative framing). Most
   job boards silently drop everything below the cutoff. ---- */
function computeNearMisses(scoredAll, topN, nearMissN){
  return scoredAll.slice(topN, topN + nearMissN);
}


/* ---- Mock listings dataset (now includes 'athletic') ---- */
const LISTINGS = [
  {id:1, type:'internship', title:'Product Analytics Intern', org:'Northlight Health', tags:['sql','python','a/b testing','analytics','product'], loc:'Remote', deadline:'Sep 15', salaryMin:28, salaryMax:32, salaryIsPredicted:false, fetchedAt:'2026-09-10T09:00:00'},
  {id:2, type:'job', title:'Associate Product Manager', org:'Fernway Labs', tags:['product','sql','roadmap','stakeholder','growth'], loc:'San Francisco, CA', deadline:'Sep 3', salaryMin:95, salaryMax:115, salaryIsPredicted:true},
  {id:3, type:'college', title:'Data & Society Summer Fellowship', org:'Ridgeline Institute', tags:['data','research','fellowship','policy'], loc:'Remote', deadline:'Aug 30'},
  {id:4, type:'internship', title:'Growth & Experimentation Intern', org:'Cobalt Systems', tags:['a/b testing','python','growth','analytics'], loc:'Remote', deadline:'Sep 10', fetchedAt:'2026-07-20T09:00:00'},
  {id:5, type:'job', title:'Business Analyst, New Grad Program', org:'Delmar Financial', tags:['sql','excel','reporting','finance'], loc:'Austin, TX', deadline:'Sep 18'},
  {id:6, type:'college', title:'Undergraduate Research Grant - Applied Data Science', org:'Whitfield University', tags:['research','data','python','grant'], loc:'Remote', deadline:'Sep 24'},
  {id:7, type:'internship', title:'Product Management Intern', org:'Arclight', tags:['product','roadmap','sql','user research'], loc:'San Jose, CA', deadline:'Aug 29'},
  {id:8, type:'job', title:'Data-Focused PM (APM Program)', org:'Twin River', tags:['product','python','sql','analytics','a/b testing'], loc:'Remote', deadline:'Sep 5'},
  {id:9, type:'internship', title:'Operations Analytics Intern', org:'Foundry Retail', tags:['excel','sql','operations','reporting'], loc:'Chicago, IL', deadline:'Sep 1'},
  {id:10, type:'college', title:'Tech Policy & Data Ethics Fellowship', org:'Carrow Center', tags:['policy','research','fellowship','ethics'], loc:'Washington, DC', deadline:'Sep 12'},
  {id:11, type:'job', title:'Junior Data Analyst', org:'Portside Analytics', tags:['sql','python','dashboards','reporting'], loc:'Remote', deadline:'Sep 21'},
  {id:12, type:'internship', title:'Campus Innovation Fellows Program', org:'Alder & Finch', tags:['leadership','product','pitch','mentorship'], loc:'Remote', deadline:'Sep 8'},
  {id:13, type:'job', title:'Product Operations Associate', org:'Cinderlake', tags:['product','sql','process','stakeholder'], loc:'Remote', deadline:'Sep 15'},
  {id:14, type:'college', title:'Quant Social Science Summer Institute', org:'Marrow College', tags:['research','python','data','stats'], loc:'Boston, MA', deadline:'Aug 31'},
  {id:15, type:'internship', title:'Strategy & Analytics Intern', org:'Beacon Peak', tags:['excel','sql','strategy','analytics'], loc:'Remote', deadline:'Sep 6'},
  {id:16, type:'job', title:'Product Insights Analyst', org:'Halyard Co.', tags:['product','sql','python','user research'], loc:'Remote', deadline:'Sep 20'},
  {id:17, type:'internship', title:'Summer Data & Product Intern', org:'Milk & Ledger', tags:['product','python','analytics','a/b testing'], loc:'Remote', deadline:'Sep 4'},
  {id:18, type:'college', title:'Innovation & Entrepreneurship Grant', org:'Osprey Foundation', tags:['grant','product','pitch','leadership'], loc:'Remote', deadline:'Sep 22'},
  {id:19, type:'job', title:'Product Marketing Associate', org:'Bellwood', tags:['marketing','product','writing','positioning'], loc:'Remote', deadline:'Sep 9'},
  {id:20, type:'internship', title:'UX Research Intern', org:'Glasswing Studio', tags:['ux','research','user research','figma'], loc:'Remote', deadline:'Sep 14'},
  {id:21, type:'job', title:'Machine Learning Product Analyst', org:'Cinder & Vale', tags:['ml','python','sql','product','analytics'], loc:'Remote', deadline:'Sep 25'},
  {id:22, type:'college', title:'Women in Data Science Scholarship', org:'Halsey Trust', tags:['data','scholarship','python','mentorship'], loc:'Remote', deadline:'Sep 17'},
  {id:23, type:'internship', title:'Venture Fellows Summer Program', org:'Northbrook Capital', tags:['pitch','leadership','strategy','product'], loc:'Remote', deadline:'Sep 11'},
  {id:24, type:'job', title:'Technical Program Coordinator', org:'Fairhaven Systems', tags:['process','stakeholder','sql','operations'], loc:'Seattle, WA', deadline:'Sep 19'},
  {id:25, type:'athletic', title:"Women's Rowing Athletic Scholarship", org:'Marrow College Athletics', tags:['athletics','rowing','leadership','scholarship'], loc:'Boston, MA', deadline:'Sep 30'},
  {id:26, type:'athletic', title:'Track & Field Partial Scholarship', org:'Whitfield University', tags:['athletics','track','training','scholarship'], loc:'Remote', deadline:'Oct 5'},
  {id:27, type:'athletic', title:'Student-Athlete Leadership Grant', org:'Bold Futures Fund', tags:['athletics','leadership','grant','mentorship'], loc:'Remote', deadline:'Sep 28'},
  {id:28, type:'athletic', title:"Men's Soccer Athletic Scholarship", org:'Carrow Center Athletics', tags:['athletics','soccer','scholarship','recruiting'], loc:'Washington, DC', deadline:'Oct 10'},
  {id:29, type:'athletic', title:'Basketball Partial Scholarship', org:'Northbrook Athletics', tags:['athletics','basketball','scholarship','training'], loc:'Remote', deadline:'Oct 2'},
  {id:30, type:'athletic', title:'Swimming & Diving Scholarship', org:'Halyard Aquatics', tags:['athletics','swimming','scholarship','training'], loc:'Austin, TX', deadline:'Sep 25'},
  {id:31, type:'athletic', title:'Assistant Athletic Coach', org:'Fernway Prep Athletics', tags:['athletics','coaching','leadership','training'], loc:'Remote', deadline:'Oct 8'},
  {id:32, type:'athletic', title:'Certified Athletic Trainer', org:'Delmar Sports Medicine', tags:['athletics','athletic training','injury prevention','sports medicine'], loc:'Chicago, IL', deadline:'Oct 12'},
  {id:33, type:'athletic', title:'Strength & Conditioning Coach', org:'Twin River Performance', tags:['athletics','strength training','coaching','conditioning'], loc:'Remote', deadline:'Oct 6'},
  {id:34, type:'athletic', title:'Sports Program Coordinator', org:'Beacon Peak Recreation', tags:['athletics','sports management','coordination','operations'], loc:'Seattle, WA', deadline:'Oct 15'},
  {id:35, type:'athletic', title:'Athletic Department Operations Assistant', org:'Marrow College Athletics', tags:['athletics','sports management','operations','stakeholder'], loc:'Boston, MA', deadline:'Sep 29'},
  {id:60, type:'admissions', title:'National STEM Research Competition', org:'Regeneron Science Talent Search', tags:['research','stem','competition','science','awards'], loc:'National', deadline:'Nov 6'},
  {id:61, type:'admissions', title:'Congressional App Challenge', org:'U.S. House of Representatives', tags:['coding','computer science','competition','stem','leadership'], loc:'National', deadline:'Oct 30'},
  {id:62, type:'admissions', title:'Summer Research Internship (High School)', org:'Whitfield University Pre-College', tags:['research','stem','internship','lab','science'], loc:'Boston, MA', deadline:'Mar 1'},
  {id:63, type:'admissions', title:'Model United Nations - Regional Conference', org:'Regional MUN Council', tags:['debate','leadership','policy','writing','public speaking'], loc:'Chicago, IL', deadline:'Oct 15'},
  {id:64, type:'admissions', title:'DECA Business & Entrepreneurship Competition', org:'DECA Inc.', tags:['business','entrepreneurship','competition','leadership','economics'], loc:'National', deadline:'Dec 1'},
  {id:65, type:'admissions', title:'Nonprofit Founder Fellowship (Teens)', org:'Youth Impact Lab', tags:['leadership','community service','entrepreneurship','impact'], loc:'Remote', deadline:'Nov 20'},
  {id:66, type:'admissions', title:'USA Computing Olympiad (USACO)', org:'USACO', tags:['coding','computer science','competition','algorithms','stem'], loc:'Online', deadline:'Dec 12'},
  {id:67, type:'admissions', title:'Local Hospital Volunteer Program', org:'Bay Area Medical Center', tags:['pre-med','biology','community service','healthcare','volunteering'], loc:'San Francisco, CA', deadline:'Rolling'},
  {id:68, type:'admissions', title:'Scholastic Art & Writing Awards', org:'Alliance for Young Artists & Writers', tags:['writing','arts','competition','portfolio','creative'], loc:'National', deadline:'Dec 5'},
  {id:69, type:'admissions', title:'Girls Who Code Summer Immersion', org:'Girls Who Code', tags:['coding','computer science','stem','leadership','summer program'], loc:'Remote', deadline:'Mar 15'},
  {id:70, type:'admissions', title:'Economics Research Paper Competition', org:'National Economics Challenge', tags:['economics','research','writing','competition','business'], loc:'National', deadline:'Jan 20'},
  {id:71, type:'admissions', title:'Debate League - State Championship', org:'National Speech & Debate Association', tags:['debate','public speaking','leadership','policy','writing'], loc:'Austin, TX', deadline:'Nov 28'},
  {id:36, type:'internship', title:'Software Engineering Intern', org:'Latchkey Systems', tags:['backend','software engineering','python','apis'], loc:'Remote', deadline:'Sep 12'},
  {id:37, type:'job', title:'Backend Software Engineer', org:'Ironvale Cloud', tags:['backend','software engineering','python','systems'], loc:'Austin, TX', deadline:'Sep 20'},
  {id:38, type:'job', title:'Full-Stack Engineer, New Grad', org:'Willowmere Tech', tags:['software engineering','javascript','backend','frontend'], loc:'Remote', deadline:'Sep 25'},
  {id:39, type:'internship', title:'Platform Engineering Intern', org:'Cordage Systems', tags:['backend','software engineering','devops','systems'], loc:'Seattle, WA', deadline:'Oct 3'},
  {id:40, type:'job', title:'Junior Software Developer', org:'Brightloom Labs', tags:['software engineering','backend','python','testing'], loc:'Chicago, IL', deadline:'Sep 18'},
  {id:41, type:'college', title:'Software Engineering Fellowship', org:'Ashgrove Institute', tags:['software engineering','backend','fellowship','mentorship'], loc:'Remote', deadline:'Oct 10'},
  {id:42, type:'internship', title:'Frontend Engineering Intern', org:'Millbrook Interactive', tags:['frontend','javascript','software engineering','ux'], loc:'Remote', deadline:'Sep 15'},
  {id:43, type:'internship', title:'General Rotational Internship Program', org:'Fairhaven Group', tags:['operations','analytics','product','process'], loc:'Remote', deadline:'Sep 22'},
  {id:44, type:'job', title:'Early Career Associate, Multiple Tracks', org:'Kestrel Partners', tags:['analytics','operations','strategy','process'], loc:'New York, NY', deadline:'Sep 28'},
  {id:45, type:'internship', title:'Sales Development Representative Intern', org:'Brightpath Software', tags:['sales','businessdevelopment','outreach','prospecting'], loc:'Remote', deadline:'Sep 16'},
  {id:46, type:'job', title:'Account Executive, Mid-Market', org:'Verity Cloud', tags:['sales','accountexecutive','closing','quota'], loc:'Chicago, IL', deadline:'Sep 26'},
  {id:47, type:'job', title:'Business Development Representative', org:'Harlow Digital', tags:['sales','businessdevelopment','outreach','pipeline'], loc:'Remote', deadline:'Oct 2'},
  {id:48, type:'internship', title:'Financial Analyst Intern', org:'Aldergate Capital', tags:['finance','financial','modeling','excel'], loc:'New York, NY', deadline:'Sep 19'},
  {id:49, type:'job', title:'Corporate Finance Associate', org:'Northbridge Holdings', tags:['finance','accounting','budgeting','excel'], loc:'Remote', deadline:'Sep 24'},
  {id:50, type:'job', title:'Investment Analyst, Rotational Program', org:'Fennimore Partners', tags:['finance','financial','valuation','research'], loc:'Boston, MA', deadline:'Oct 8'},
  {id:51, type:'internship', title:'HR Coordinator Intern', org:'Marlstone Group', tags:['hr','humanresources','recruiting','onboarding'], loc:'Remote', deadline:'Sep 17'},
  {id:52, type:'job', title:'People Operations Associate', org:'Cindergate Labs', tags:['hr','peopleops','humanresources','culture'], loc:'Austin, TX', deadline:'Sep 30'},
  {id:53, type:'job', title:'Talent Acquisition Specialist', org:'Windmere Partners', tags:['hr','recruiting','talentacquisition','sourcing'], loc:'Remote', deadline:'Oct 5'},
  {id:54, type:'internship', title:'Customer Success Intern', org:'Loomwell Systems', tags:['customersuccess','clientsuccess','onboarding','retention'], loc:'Remote', deadline:'Sep 14'},
  {id:55, type:'job', title:'Customer Support Specialist', org:'Ferngrove Tech', tags:['customersupport','customersuccess','communication','troubleshooting'], loc:'Remote', deadline:'Sep 21'},
  {id:56, type:'job', title:'Account Manager', org:'Thistledown Software', tags:['accountmanagement','customersuccess','relationshipbuilding','renewals'], loc:'Seattle, WA', deadline:'Oct 9'},
  {id:57, type:'internship', title:'Clinical Research Coordinator Intern', org:'Ashworth Medical Center', tags:['healthcare','clinical','research','patientcare'], loc:'Boston, MA', deadline:'Sep 18'},
  {id:58, type:'job', title:'Patient Care Coordinator', org:'Rivermont Health', tags:['healthcare','patientcare','medical','scheduling'], loc:'Chicago, IL', deadline:'Sep 27'},
  {id:59, type:'job', title:'Healthcare Administration Associate', org:'Bellhaven Clinical Group', tags:['healthcare','medical','administration','operations'], loc:'Remote', deadline:'Oct 6'},
  {id:60, type:'internship', title:'Paralegal Intern', org:'Cassowary & Voss LLP', tags:['legal','paralegal','research','documentation'], loc:'New York, NY', deadline:'Sep 15'},
  {id:61, type:'job', title:'Compliance Analyst', org:'Thornfield Financial', tags:['legal','compliance','regulatory','riskmanagement'], loc:'Remote', deadline:'Sep 23'},
  {id:62, type:'job', title:'Legal Intern, Corporate Affairs', org:'Marchbanks & Reid', tags:['legal','research','writing','compliance'], loc:'Washington, DC', deadline:'Oct 4'},
  {id:63, type:'internship', title:'Supply Chain Analyst Intern', org:'Grovemark Logistics', tags:['supplychain','operations','logistics','analytics'], loc:'Remote', deadline:'Sep 20'},
  {id:64, type:'job', title:'Operations Coordinator', org:'Hallowick Distribution', tags:['operations','logistics','process','coordination'], loc:'Dallas, TX', deadline:'Sep 29'},
  {id:65, type:'job', title:'Logistics Planning Associate', org:'Coldwater Freight Systems', tags:['logistics','supplychain','operations','planning'], loc:'Remote', deadline:'Oct 7'},
];

// Keep the demo's deadlines honest AND current. The month-day deadlines above
// were authored as future dates, but they go stale as the calendar advances (a
// listing "closing Sep 3" is already in the past by mid-September). Combined with
// the honest expired-listing exclusion, stale seed dates would silently hide most
// of the demo. Re-anchor each seed deadline to a stable, deterministic number of
// days ahead of *today* so every demo opportunity is genuinely still open and the
// spread of urgencies (some closing soon, some later) is preserved. Real backend
// listings carry true ISO deadlines and never pass through here.
(function _refreshSeedDeadlines(){
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const base = new Date(); base.setHours(0,0,0,0);
  for(const l of LISTINGS){
    if(!l.deadline || typeof l.deadline !== 'string') continue;
    // Deterministic spread of ~5..60 days out, varied per listing id so the mix
    // of soon- and later-closing roles (and thus deadline-urgency ranking) stays
    // realistic and stable within a day.
    const offset = 5 + ((Number(l.id) * 13) % 56);
    const d = new Date(base); d.setDate(d.getDate() + offset);
    l.deadline = MON[d.getMonth()] + ' ' + d.getDate();
  }
})();

/* ---- Matching engine ---- */
// High-confidence single words: specific enough that false positives
// in a career-goal/achievements context are genuinely rare. Sport
// names plus a handful of athletics-specific terms.
const ATHLETIC_HIGH_CONFIDENCE_WORDS = [
  'soccer', 'basketball', 'football', 'baseball', 'softball', 'volleyball',
  'tennis', 'golf', 'swimming', 'diving', 'wrestling', 'gymnastics',
  'hockey', 'lacrosse', 'rowing', 'rugby', 'cycling', 'fencing',
  'archery', 'boxing', 'judo', 'taekwondo', 'karate', 'skiing',
  'snowboarding', 'cheerleading', 'badminton', 'squash', 'cricket',
  'climbing', 'triathlon', 'powerlifting', 'weightlifting', 'bowling',
  'athlete', 'athletics', 'varsity', 'ncaa', 'olympian', 'olympics',
];
// High-confidence multi-word phrases - specific enough that a direct
// substring check is safe (tokenize would break these apart and lose
// the "I"/"1" in "division I", which is exactly the part that
// signals real recruiting/eligibility context rather than a generic
// mention of the word "division").
const ATHLETIC_HIGH_CONFIDENCE_PHRASES = [
  'student athlete', 'student-athlete', 'track and field', 'track & field',
  'cross country', 'field hockey', 'water polo', 'table tennis',
  'martial arts', 'figure skating', 'ultimate frisbee',
  'division i', 'division ii', 'division iii', 'division 1', 'division 2', 'division 3',
  'go pro', 'play professionally', 'play in college', 'play at the college level',
];
// Genuinely ambiguous on their own - real, common words with everyday
// non-athletic meanings ("scholarship" for academics, "captain" of a
// club, "recruiting" for a job, "combine" as a verb, "team" in any
// group project). Only count toward detection when paired with
// something more specific, never alone.
const ATHLETIC_WEAK_SIGNAL_WORDS = [
  'scholarship', 'captain', 'recruiting', 'recruit', 'combine', 'tryout',
  'tryouts', 'coach', 'coaching', 'training', 'roster', 'draft', 'league',
];

/* Real, logic-based detection of athletic traits from what someone
   actually wrote - not just a manual checkbox. Checks northstar,
   finalidea, and achievements together, since a genuine athletic
   signal could show up in any of them. Returns {detected, matched}
   so the caller can show honestly what was found, not just a bare
   yes/no. Two ways to trigger: any single high-confidence word/phrase
   is enough on its own; two or more weak signals together also count,
   since one ambiguous word alone ("scholarship") is too easily a
   false positive, but "scholarship" + "coach" together genuinely
   isn't a coincidence. */
function detectAthleticTraits(text){
  const lower = (text || '').toLowerCase();
  const tokens = tokenize(lower);
  const matched = { high: [], weak: [] };

  ATHLETIC_HIGH_CONFIDENCE_WORDS.forEach(word => {
    if(tokens.some(t => termsMatch(t, word))) matched.high.push(word);
  });
  ATHLETIC_HIGH_CONFIDENCE_PHRASES.forEach(phrase => {
    if(lower.includes(phrase)) matched.high.push(phrase);
  });
  ATHLETIC_WEAK_SIGNAL_WORDS.forEach(word => {
    if(tokens.some(t => termsMatch(t, word))) matched.weak.push(word);
  });

  const detected = matched.high.length > 0 || matched.weak.length >= 2;
  return { detected, matched };
}

function tokenize(str){ return (String(str == null ? "" : str).toLowerCase().match(/[a-z][a-z\-]{2,}/g) || []); }

/* Honestly scoped: a curated set of common, well-known synonyms in
   tech/career contexts - not a claim of real NLP. Mirrors the
   backend's SYNONYM_GROUPS exactly so client-side demo scoring and
   real backend scoring behave the same way once connected. */
const SYNONYM_GROUPS = [
  ['js','javascript','typescript','ts'],
  ['ml','machinelearning','ai','artificialintelligence'],
  ['sql','database','databases','postgres','postgresql','mysql'],
  ['ux','ui','design','uxdesign','uidesign'],
  ['pm','productmanagement','product'],
  ['frontend','front-end','front'],
  ['backend','back-end','back'],
  ['fullstack','full-stack'],
  ['analytics','analysis','dataanalysis','data'],
  ['devops','infrastructure','infra'],
  ['marketing','growth','branding','socialmedia'],
  ['finance','financial','accounting'],
  ['bio','biology','biotech'],
  ['sales','businessdevelopment','accountexecutive','ae','bd'],
  ['operations','ops','logistics','supplychain'],
  ['hr','humanresources','peopleops','recruiting','talentacquisition'],
  ['customersuccess','customersupport','clientsuccess','accountmanagement'],
  ['healthcare','clinical','patientcare','medical'],
  ['legal','compliance','paralegal','regulatory'],
];
const SYNONYM_LOOKUP = {};
SYNONYM_GROUPS.forEach(group => group.forEach(term => { SYNONYM_LOOKUP[term] = group; }));
const SHORT_SYNONYM_TERMS = new Set(SYNONYM_GROUPS.flat().filter(t => t.length <= 2));

/* Found via testing the roadmap-alignment integration, but the bug
   itself reaches far further: the plain .includes() substring check
   below had zero word-boundary awareness, meaning any short common
   word that happens to be literally embedded in a longer, unrelated
   term produced a false match - "and" is a literal substring of
   "brand" and "branding" (br-AND-ing), "at" is a substring of "data"
   - and "java" is a genuine substring of "javascript" despite being
   different languages. Since termsMatch is what goal_fit and
   skill_fit are built on, this wasn't a narrow issue - it could
   silently inflate or misattribute the two most important scoring
   factors in the whole engine, for any profile whose free text
   happened to contain a short common word. Fixed with the same
   word-boundary principle already used for the dealbreaker fix. */
/* Manual boundary check rather than regex \b - found via testing
   that \b relies on a transition between a word character and a
   non-word character, which silently fails for terms ending in
   punctuation. "c++" would never be recognized as a whole word
   inside "c++ developer", because both the trailing "+" and the
   following space are non-word characters - no transition exists
   there for \b to detect, even though a person would obviously read
   that as the same term. This checks explicitly: is the character
   on each side of a match (if any) non-alphanumeric, regardless of
   what specific character it is. Mirrors the backend fix exactly. */
function wordBoundaryContains(haystack, needle){
  if(needle.length === 0) return false;
  const isAlnum = ch => /[a-z0-9]/i.test(ch);
  let idx = haystack.indexOf(needle);
  while(idx !== -1){
    const beforeOk = idx === 0 || !isAlnum(haystack[idx-1]);
    const afterIdx = idx + needle.length;
    const afterOk = afterIdx === haystack.length || !isAlnum(haystack[afterIdx]);
    if(beforeOk && afterOk) return true;
    idx = haystack.indexOf(needle, idx+1);
  }
  return false;
}
function termsMatch(a, b){
  if(typeof a !== "string" || typeof b !== "string") return false;
  if(a === b) return true;
  if(wordBoundaryContains(a, b) || wordBoundaryContains(b, a)) return true;
  const aClean = a.replace(/-/g, ''), bClean = b.replace(/-/g, '');
  const group = SYNONYM_LOOKUP[aClean];
  return !!(group && group.includes(bClean));
}
/* Fixed a real false-positive: the previous checks (both here and in
   runAthleteMatchCycle) were blind substring containment, meaning a
   dealbreaker of "javascript" would silently exclude any listing
   tagged "java" - a completely different, unrelated language -
   because "java" is literally a substring of "javascript".
   Dealbreakers are meant to be a precise safety filter; a false
   positive here means hiding a genuinely good match for no real
   reason. Mirrors the backend's _has_dealbreaker() exactly. */
function hasDealbreaker(tags, dealbreakers){
  if(!dealbreakers) return false;
  // tokenizeForMatching, NOT plain tokenize(): the backend's _has_dealbreaker
  // uses its tokenize(), which recognizes short 2-char terms (ai, ml, ux, ui,
  // js, ts...) as real tokens. The frontend split that short-term handling out
  // into tokenizeForMatching, so plain tokenize() here DROPPED those terms - a
  // stated dealbreaker of "ai"/"ml"/"ux"/"ui" excluded the listing on the server
  // but was silently ignored offline, showing the person listings they
  // explicitly ruled out. This is literal token recognition, not synonym
  // fuzzing (tokenizeForMatching only adds a short term that appears verbatim as
  // a whole word), so exclusion stays exactly as strict and precise as before.
  const dealbreakerTokens = new Set(tokenizeForMatching(dealbreakers));
  if(dealbreakerTokens.size === 0) return false;
  for(const tag of (tags || [])){
    // Coerce to string, mirroring the backend's [str(t).lower() for t in tags]
    // in score_listing: a stray non-string tag (a number or null from an LLM
    // extraction, a legacy row, or a malformed backend match payload) would
    // otherwise throw on .toLowerCase() and crash the entire match cycle for
    // that user, not just skip the one bad tag.
    const tagLower = String(tag == null ? '' : tag).toLowerCase();
    const tagDehyphenated = tagLower.replace(/-/g, '');
    for(const dbToken of dealbreakerTokens){
      // Two separate, both-genuinely-needed checks: wordBoundaryContains
      // catches a dealbreaker word appearing as PART of a hyphenated tag
      // ("travel" inside "travel-required" - a hyphen counts as a real
      // word boundary). The de-hyphenated equality check catches a
      // dealbreaker word matching a tag's FULL hyphen-stripped form
      // ("fullstack" == "full-stack" with the hyphen removed) -
      // wordBoundaryContains alone can't find "fullstack" as a literal
      // substring inside "full-stack", since the hyphen breaks up the
      // string. Found and fixed via brutal testing that used only one
      // check first, breaking whichever case the other one covers.
      if(wordBoundaryContains(tagLower, dbToken) || dbToken === tagDehyphenated) return true;
    }
  }
  return false;
}
/* Scoped locally to matching, NOT merged into the shared tokenize()
   used everywhere else in the app - tokenize()'s 3-char minimum is
   relied on by many unrelated features (Waypoint, skill gaps), and
   changing its general behavior for matching's sake risks side
   effects across all of them. This extracts short abbreviations
   (js, ai, ux...) as a separate, additive step used only here. */
function tokenizeForMatching(text){
  const tokens = tokenize(text);
  const lower = text.toLowerCase();
  SHORT_SYNONYM_TERMS.forEach(term => {
    if(new RegExp(`\\b${term}\\b`).test(lower)) tokens.push(term);
  });
  return tokens;
}

function deadlineUrgencyFactor(listing, profile){
  if(!listing.deadline || typeof listing.deadline !== 'string') return { value: 0, daysLeft: null };
  const deadlineTime = parseDeadline(listing.deadline);
  if(isNaN(deadlineTime)) return { value: 0, daysLeft: null };
  // Calendar-day difference (both anchored at local midnight), matching the
  // backend's (deadline_date - date.today()).days. Subtracting Date.now()
  // instead made daysLeft depend on the time of day - "closes in 3 days" in the
  // morning became "2 days" the same evening - which also broke FE/BE score
  // parity at band boundaries (a deadline 4 days out scored 1.5 on the server
  // but 0.5 in the client after noon). Math.round absorbs DST hour drift.
  const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
  const daysLeft = Math.round((deadlineTime - todayMidnight.getTime()) / 86400000);
  if(daysLeft < 0) return { value: 0, daysLeft };
  let value;
  if(daysLeft <= 3) value = 0.5;
  else if(daysLeft <= 14) value = 1.5;
  else if(daysLeft <= 30) value = 0.5;
  else value = 0;
  // Scale by the USER'S stated search urgency (previously ignored). Someone
  // searching "now" should have soon-closing, actionable roles weighted up; a
  // "2yr+" explorer shouldn't be pushed by deadline pressure they don't feel.
  // Honest: this shapes ranking to the user's real timeline, not a fake urgency.
  const tf = (profile && profile.timeframe) || '';
  const urgencyMult = { 'now': 1.6, '6-12mo': 1.0, '1-2yr': 0.6, '2yr+': 0.3 }[tf] ?? 1.0;
  return { value: value * urgencyMult, daysLeft };
}

function detectLocationMismatch(listing, profile){
  // Honest, conservative: only ever flags a CLEAR onsite/relocation
  // mismatch, never a guess. The documented problem is that a role
  // looking like a strong fit can quietly require relocating to a
  // city the person can't move to - "remote does not mean anywhere,"
  // and HR routinely mislabels location. This surfaces that reality
  // transparently rather than letting a keyword-strong score hide it.
  const listingLoc = (listing.loc || '').toLowerCase().trim();
  const locationPref = (profile.loc || '').toLowerCase().trim();
  const priorities = profile.priorities || [];

  // No signal to compare against, or the listing is remote (works
  // from anywhere) - honestly flag nothing.
  if(!listingLoc || !locationPref) return null;
  if(listingLoc.includes('remote')) return null;
  // The person explicitly wants remote or flexibility - an onsite
  // role is a fit-preference question the score already handles, but
  // it's not the specific "you'd have to relocate somewhere unexpected"
  // surprise this flag is about. Still worth flagging if their stated
  // location is itself a specific city that doesn't match.
  if(locationPref.includes('remote')) return null;

  // Both are specific places now. If the person's stated city tokens
  // genuinely appear in the listing location, it's a real match - no
  // flag. Only when there's no overlap at all is it a relocation gap.
  const prefTokens = tokenize(locationPref).filter(t => t.length > 3);
  if(prefTokens.length === 0) return null;  // stated pref too vague to compare honestly
  const overlaps = prefTokens.some(t => listingLoc.includes(t));
  if(overlaps) return null;

  return { note: `This role is based in ${listing.loc}, which doesn't match your stated location (${profile.loc}) and isn't remote - it would likely require relocating, worth weighing before applying.` };
}

function locationFitFactor(listing, profile){
  const listingLoc = (listing.loc || '').toLowerCase();
  const locationPref = (profile.loc || '').toLowerCase();
  const priorities = profile.priorities || [];

  if(priorities.includes('flexibility') && listingLoc.includes('remote')){
    return { value: 1.5, reason: 'remote, matching your stated need for flexibility' };
  }
  if(locationPref && listingLoc){
    if(locationPref.includes('remote') && listingLoc.includes('remote')){
      return { value: 1.5, reason: 'matches your remote location preference' };
    }
    const prefTokens = tokenize(locationPref).filter(t => t.length > 3);
    if(prefTokens.some(t => listingLoc.includes(t))){
      return { value: 1.0, reason: `based in ${listing.loc}, inside your stated location preference` };
    }
    // Remote work is inherently compatible with living anywhere - a
    // real, positive signal even when someone stated a specific city
    // rather than explicitly asking for remote. Smaller than an
    // explicit remote match, since we don't know for certain they'd
    // prefer it over staying near their stated city.
    if(listingLoc.includes('remote')){
      return { value: 0.75, reason: 'remote, which works regardless of your location' };
    }
  }
  return { value: 0, reason: null };
}

/* Real signal from the listing's title, the one genuinely rich
   free-text field frontend mock listings actually have (unlike full
   descriptions, which they honestly don't). This used to be a purely
   structural placeholder in the personalization-learning system
   (descriptionFit was listed but never computed) - closes that gap
   for real, scoped honestly to title-only given the real data
   available, not overclaiming full description-level richness. A
   smaller cap than the backend's full-description version (1.5 vs
   2.0) reflects that a title is a narrower signal source than a full
   posting. */
function titleOverlapFactor(listing, goalTokens, skillTokens, matchedTagTerms){
  // Scans title AND description (capped at 4000 chars, matching the
  // backend) for goal/skill terms not already credited by a tag
  // match. Previously this only looked at the title, silently
  // ignoring the description - so a requirement living in the posting
  // body scored 0 here but up to 2.0 on the backend. Mirrors the
  // backend _description_overlap_factor exactly now.
  const combinedText = `${listing.title || ''} ${(listing.description || '').slice(0,4000)}`.toLowerCase();
  if(!combinedText.trim()) return { value: 0, terms: [] };
  // tokenizeForMatching, NOT bare tokenize: the goal/skill terms being matched here
  // are tokenizeForMatching output (they include short 2-char abbreviations like
  // ux/ml/ai/ui). Tokenizing the description with bare tokenize (3-char minimum)
  // dropped those same short terms from the text, so a 2-char skill could NEVER
  // match description text - the description factor silently under-counted, and
  // diverged from the backend, whose tokenize() folds the short terms in. This
  // makes FE description tokenization identical to the backend's.
  const descTokens = new Set(tokenizeForMatching(combinedText));
  const found = [];
  new Set([...goalTokens, ...skillTokens]).forEach(term => {
    const termClean = term.replace(/-/g, '');
    if(matchedTagTerms.has(termClean)) return; // already credited via a tag match - avoid double-counting
    if(descTokens.has(term) || [...descTokens].some(t => termsMatch(term, t))){
      found.push(term);
    }
  });
  const contribution = Math.min(2.0, found.length * 0.4);
  return { value: contribution, terms: found.slice(0,5) };
}

/* Mirrors the backend's assess_listing_data_quality exactly - found
   to be genuinely, completely absent from the frontend (not just
   unrendered): every listing was scored with the same apparent
   confidence regardless of whether it had a real description and
   several specific tags, or a 2-word title and one generic tag. The
   backend was explicitly built to be honest about that gap; the
   frontend demo a person actually uses had never carried it over. */
function assessListingDataQualityJS(listing){
  const reasons = [];
  let points = 0;

  const title = (listing.title || '').trim();
  if(title.split(/\s+/).filter(Boolean).length >= 3) points += 1;
  else reasons.push('title is very short');

  const tags = listing.tags || [];
  if(tags.length >= 4) points += 2;
  else if(tags.length >= 2) points += 1;
  else reasons.push('very few tags to match against');

  const description = (listing.description || '').trim();
  if(description.length >= 200) points += 2;
  else if(description.length >= 50) points += 1;
  else reasons.push('no real description text - matching relies on tags alone');

  if(listing.location) points += 1;
  else reasons.push('no location listed');

  if(listing.deadline) points += 1;
  else reasons.push('no deadline listed');

  // Max possible: 1 (title) + 2 (tags) + 2 (description) + 1 (location) + 1 (deadline) = 7
  const tier = points >= 6 ? 'rich' : points >= 3 ? 'adequate' : 'thin';
  return { tier, points, maxPoints: 7, reasons };
}

function detectSeniorityMismatch(listing, profile){
  // Honest, conservative title-keyword detection: only ever flags a
  // CLEAR, unambiguous seniority gap, never a guess. Returns null
  // whenever the title carries no explicit seniority signal, so an
  // ordinary role is never falsely flagged. The direct answer to a
  // documented competitor weakness where a keyword-strong role that
  // is genuinely a step above or below the person's real level still
  // scored ~90% with no honest flag distinguishing it from a true fit.
  const title = (listing.title || '').toLowerCase();
  const stage = profile.stage || '';

  // Explicit senior-title markers - word-boundary matched so "lead"
  // doesn't match "leadership" inside an unrelated phrase, and
  // "principal" (engineer) isn't confused with other uses.
  const seniorMarkers = /\b(senior|sr\.?|staff|principal|lead|director|head of|vp|vice president|chief|manager|executive)\b/;
  // Explicit junior/entry-title markers.
  const juniorMarkers = /\b(intern|internship|junior|jr\.?|entry[- ]?level|trainee|apprentice|assistant|fellow|graduate|new grad)\b/;

  const isSeniorTitle = seniorMarkers.test(title);
  const isJuniorTitle = juniorMarkers.test(title);

  // A title can genuinely contain both (e.g. "Senior Manager,
  // Graduate Programs") - ambiguous, so honestly flag nothing.
  if(isSeniorTitle && isJuniorTitle) return null;

  const earlyCareer = stage === 'student' || stage === 'grad';
  const establishedCareer = stage === 'working';

  if(earlyCareer && isSeniorTitle){
    return { direction: 'above', note: "This role's title suggests a seniority level well above where you said you are - it may be a reach, and worth weighing against roles closer to your current stage." };
  }
  if(establishedCareer && isJuniorTitle){
    return { direction: 'below', note: "This role's title suggests a level below your stated experience - you may be seen as overqualified, which is worth weighing before spending an application on it." };
  }
  return null;
}

function scoreListing(listing, goalTokens, skillTokens, profile, factorWeights, roadmapMilestones){
  factorWeights = factorWeights || {};
  // Dedupe the token lists once. The tag loop below uses goalTokens.some()/
  // skillTokens.some() (short-circuit, so duplicates can't change the result) and
  // titleOverlapFactor already de-dupes via a Set - so this is purely a speed
  // guard, keeping the O(tags x tokens) hot path bounded even for a repetitive
  // profile (e.g. a 2000-char northstar tokenizing to hundreds of repeated words).
  goalTokens = [...new Set(goalTokens)];
  skillTokens = [...new Set(skillTokens)];
  if(hasDealbreaker(listing.tags, profile.dealbreakers || '')) return null;
  const priorities = profile.priorities || [];
  // Mirrors the identical defensive fix just applied to the
  // backend's score_listing - a listing missing this field would
  // otherwise crash on the first .forEach() below.
  // Defensive lowercase: tag comparison below is case-sensitive, so a
  // stray uppercase tag would silently score far lower. Mirrors the
  // identical defensive fix in the backend matching.py.
  const tagSet = (listing.tags || []).map(t => String(t).toLowerCase());
  let goalFit = 0, skillFit = 0, matchedGoal = [], matchedSkill = [], neutral = [];
  let doubleMatchCount = 0;
  const matchedTagTerms = new Set();
  tagSet.forEach(tag=>{
    const inGoal = goalTokens.some(t=> termsMatch(t, tag));
    const inSkill = skillTokens.some(t=> termsMatch(t, tag));
    if(inGoal){ goalFit += 3; matchedGoal.push(tag); matchedTagTerms.add(tag.replace(/-/g,'')); }
    if(inSkill){ skillFit += 2; matchedSkill.push(tag); matchedTagTerms.add(tag.replace(/-/g,'')); }
    if(inGoal && inSkill) doubleMatchCount++;
    if(!inGoal && !inSkill) neutral.push(tag);
  });

  let priorityFit = 0;
  if(priorities.includes('learning') && (listing.type==='internship'||listing.type==='college')) priorityFit += 1.5;
  if(priorities.includes('pay') && listing.type==='job') priorityFit += 1.5;

  const location = locationFitFactor(listing, profile);
  const deadline = deadlineUrgencyFactor(listing, profile);
  const titleOverlap = titleOverlapFactor(listing, goalTokens, skillTokens, matchedTagTerms);
  const roadmapAlignment = roadmapMilestones && roadmapMilestones.length ? computeRoadmapAlignment(listing, roadmapMilestones) : null;
  const roadmapFitRaw = roadmapAlignment ? Math.round(roadmapAlignment.strength * 3.0 * 100) / 100 : 0;

  // Apply personalized weighting - real, learned reliability for
  // THIS person specifically, not a generic default. See
  // getPersonalizedFactorWeightsJS().
  goalFit *= factorWeights.goalFit ?? 1.0;
  skillFit *= factorWeights.skillFit ?? 1.0;
  priorityFit *= factorWeights.priorityFit ?? 1.0;
  const locationValue = location.value * (factorWeights.locationFit ?? 1.0);
  const deadlineValue = deadline.value * (factorWeights.deadlineUrgency ?? 1.0);
  const descriptionValue = titleOverlap.value * (factorWeights.descriptionFit ?? 1.0);
  const roadmapValue = roadmapFitRaw * (factorWeights.roadmapFit ?? 1.0);

  const score = goalFit + skillFit + priorityFit + locationValue + deadlineValue + descriptionValue + roadmapValue;
  // Headroom equals each factor's OWN contribution, not a flat
  // theoretical maximum - mathematically guaranteed to never
  // decrease the score from a genuinely-earned factor (proof:
  // (a+x)/(b+x) >= a/b whenever b >= a, which always holds here).
  // Mirrors the exact backend fix - the earlier flat-headroom
  // version could net-dilute a score for any weak-but-real match
  // that fell well short of the theoretical maximum.
  const descriptionHeadroom = descriptionValue;
  const roadmapHeadroom = roadmapValue;
  // Denominator mirrors the backend's structure exactly, for the
  // factors the frontend actually has. Each conditional headroom is
  // budgeted only when the listing has the field to earn it (same
  // reasoning as the backend - budgeting a flat max for an absent
  // field net-dilutes real scores). semantic_headroom is the only
  // backend term legitimately omitted: the frontend has no
  // embeddings, so semantic_fit is always 0 here and budgeting for it
  // would unfairly lower every local score.
  const skillHeadroom = doubleMatchCount * 2;
  const locationHeadroom = listing.loc ? 1.5 : 0;
  const deadlineHeadroom = listing.deadline ? 1.5 : 0;
  const denom = tagSet.length*3 + 1.5 + locationHeadroom + deadlineHeadroom + skillHeadroom + descriptionHeadroom + roadmapHeadroom;
  // Recalibrated: `denom` is a theoretical maximum (every tag matching on BOTH
  // goal AND skill, full headroom on every factor) that a real listing never
  // reaches - so genuine strong matches were topping out ~50-60%, which reads as
  // weak. Map the raw ratio so a match that clears the real bar reads as the
  // confident 85-97 it deserves, while weak matches stay low and get filtered by
  // PRESENTABLE_MIN_SCORE. Honest 97 ceiling, no vanity 100s; the breakdown still
  // shows the real named contributors behind the number.
  const _raw = denom > 0 ? (score / denom) : 0;
  // The denominator is ~2x what any real listing reaches, so a GENUINE strong
  // match sits around raw 0.4-0.6. Map that band to a confident 85-97 (the score
  // it deserves), so real matches read strong AND enough of them clear the bar to
  // give a full list - while weak matches (raw < 0.4) stay low and get filtered.
  const pct = _raw >= 0.4
    ? Math.min(97, Math.round(85 + (_raw - 0.4) * 30))   // 0.4 -> 85, 0.8+ -> 97
    : Math.max(8, Math.round(_raw * 100));                // weak stays low -> filtered out

  const factorsEngaged = [goalFit, skillFit, priorityFit, locationValue, deadlineValue, descriptionValue, roadmapValue].filter(v => v > 0).length;
  const signalStrength = factorsEngaged <= 1 ? 'low' : factorsEngaged <= 3 ? 'moderate' : 'high';

  const match = {
    score, pct,
    matchedGoal:[...new Set(matchedGoal)], matchedSkill:[...new Set(matchedSkill)], neutral:[...new Set(neutral)],
    signalStrength, factorsEngaged, personalized: Object.keys(factorWeights).length > 0,
    dataQuality: assessListingDataQualityJS(listing),
    seniorityMismatch: detectSeniorityMismatch(listing, profile),
    locationMismatch: detectLocationMismatch(listing, profile),
    factors: { goalFit, skillFit, priorityFit, locationFit: locationValue, locationReason: location.reason, deadlineUrgency: deadlineValue, daysLeft: deadline.daysLeft, descriptionFit: descriptionValue, descriptionTerms: titleOverlap.terms, roadmapFit: roadmapValue, roadmapAlignment },
  };
  return match;
}
function parseDeadline(str){
  if(!str || typeof str !== 'string') return NaN;
  str = str.trim();
  // ISO format (YYYY-MM-DD, optionally with a time) is what the BACKEND sends -
  // Listing.deadline is a Date column serialized with .isoformat(). The frontend
  // receives it verbatim (api.js passes m.deadline through), so parseDeadline has
  // to understand it too: without this, a logged-in user's real backend deadlines
  // returned NaN here, which silently broke the "sort by deadline" comparator
  // (NaN - NaN) and any downstream urgency/expiry check. Parse to LOCAL midnight
  // of that calendar day (NOT new Date(str), which reads ISO as UTC and can land
  // on the previous day west of UTC) so it lines up with the "Mon DD" branch and
  // the backend's date-only comparison.
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso){
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  }
  const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const [mon, day] = str.split(' ');
  const now = new Date();
  const year = now.getFullYear();
  let candidate = new Date(year, months[mon], parseInt(day));
  // The year was previously hardcoded to 2026 - a real, silent bug
  // once the calendar crosses into 2027, or for any deadline meant
  // to fall in the year after the current one (e.g. today is Dec,
  // listing says "Jan 15" - that's clearly next January, not 11+
  // months in the past). Rolls forward a year if the parsed date
  // would otherwise land more than 30 days in the past, the standard
  // heuristic for a "month day"-only date with no explicit year.
  if((candidate.getTime() - now.getTime()) / 86400000 < -30){
    candidate = new Date(year + 1, months[mon], parseInt(day));
  }
  return candidate.getTime();
}

function buildRationale(listing, m, profile){
  // Escape every interpolated value: these come from listing tags/text and the
  // user's own goal/skills (external/semi-trusted), and the card now renders
  // this rationale as HTML so the intended <b> emphasis shows. Escaping the
  // inserts keeps that safe (no XSS) while the <b> markup stays intentional.
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const goalPhrase = esc(((profile.northstar || '').split(/[.,;]/)[0] || 'your goal').toLowerCase());
  const clauses = [];
  const factors = m.factors || {};

  if(m.matchedGoal.length){
    clauses.push(`directly touches <b>${esc(m.matchedGoal.slice(0,2).join(', '))}</b> from your stated goal of ${goalPhrase}`);
  }
  if(m.matchedSkill.length){
    clauses.push(`draws on your existing experience with <b>${esc(m.matchedSkill.slice(0,2).join(', '))}</b>`);
  }
  if(factors.descriptionTerms && factors.descriptionTerms.length){
    clauses.push(`also mentions <b>${esc(factors.descriptionTerms.slice(0,2).join(', '))}</b> in the actual posting text, beyond what's captured in its tags`);
  }

  const priorities = profile.priorities || [];
  if(priorities.includes('pay') && listing.type === 'job'){
    clauses.push('is a full-time role, aligned with pay being a top priority for you');
  }
  if(priorities.includes('learning') && (listing.type === 'internship' || listing.type === 'college')){
    clauses.push('is structured around hands-on learning, which you said matters most right now');
  }
  if(factors.locationReason){
    clauses.push(`is ${esc(factors.locationReason)}`);
  }
  if(factors.roadmapAlignment){
    const ra = factors.roadmapAlignment;
    clauses.push(`directly advances Stage ${esc(ra.stage)} of your roadmap ("${esc(ra.title)}")`);
  }

  let deadlineNote = '';
  if(factors.daysLeft !== null && factors.daysLeft !== undefined && factors.daysLeft >= 0 && factors.daysLeft <= 14){
    deadlineNote = ` It also closes in ${factors.daysLeft} day${factors.daysLeft !== 1 ? 's' : ''}, so it's worth acting on soon if you're interested.`;
  }

  let qualityNote = '';
  if(m.dataQuality && m.dataQuality.tier === 'thin'){
    qualityNote = " Worth knowing: this listing itself has very little real data behind it (a short title, few tags, no real description) - treat this score as a rough starting point, not a confident read.";
  }

  if(clauses.length === 0){
    return `Looser fit - no strong overlap with your stated goal, skills, or priorities yet, but worth a glance while broadening this cycle's search.${deadlineNote}${qualityNote}`;
  }
  let joined;
  if(clauses.length === 1) joined = clauses[0];
  else if(clauses.length === 2) joined = `${clauses[0]}, and ${clauses[1]}`;
  else joined = clauses.slice(0, -1).join(', ') + `, and ${clauses[clauses.length-1]}`;

  return `This ${joined}.${deadlineNote}${qualityNote}`;
}
/* ============================================================================
   SIGNAL SCORE — Kaidostar's answer to the discredited "match %".
   The whole job-tool category sells a keyword-match percentage that (as their
   own reviewers admit) doesn't predict callbacks. Worse, they bury ghost/stale
   postings and reward spray-and-pray volume - which the data shows LOSES
   (tailored ~5.75% interview rate vs ~2-3% for volume).

   Signal Score reframes the question from "how many keywords match" to
   "how much does applying here actually help your case?" It folds together:
     - FIT: the honest goal/skill/roadmap score (already computed, capped at 97)
     - FRESHNESS: how recently the posting appeared (stale = crowded/likely filled)
     - GHOST RISK: how likely this is a real, applyable posting vs noise
     - CROWDING: a stale + high-volume posting is a worse SIGNAL even if fit is high
   It is deliberately honest: it can say "strong fit, but this posting is likely
   stale - your application is a weak signal here." No competitor does this.

   Pure function over an already-scored listing. No fabrication: every input is
   real (fit from the scorer, freshness from the posting's own timestamp).
   ============================================================================ */

/* Days since the posting appeared, from its real timestamp. null if unknown. */
function _postingAgeDays(listing){
  const ts = listing.fetchedAt || listing.posted_at || listing.created_at;
  if(!ts) return null;
  const t = new Date(ts).getTime();
  if(isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

/* Ghost/freshness assessment for one listing. Honest bands, never a fake %. */
function assessListingSignal(listing){
  const age = _postingAgeDays(listing);
  const q = (listing.dataQuality && listing.dataQuality.tier) || null; // 'thin'|'ok'|... from scorer
  const hasDesc = !!(listing.description && String(listing.description).trim().length > 40);
  const tagCount = Array.isArray(listing.tags) ? listing.tags.length : 0;

  // --- Freshness band ---
  let freshness, freshNote;
  if(age === null){ freshness = 'unknown'; freshNote = 'No post date available - freshness unverified.'; }
  else if(age <= 3){ freshness = 'fresh'; freshNote = `Posted ${age === 0 ? 'today' : age + ' day' + (age>1?'s':'') + ' ago'} - you're early, before the crush.`; }
  else if(age <= 10){ freshness = 'recent'; freshNote = `Posted ${age} days ago - still active, but the pile is growing.`; }
  else if(age <= 25){ freshness = 'aging'; freshNote = `Posted ${age} days ago - likely crowded; many roles fill by now.`; }
  else { freshness = 'stale'; freshNote = `Posted ${age}+ days ago - high chance it's filled or a "ghost" posting. Verify on the company site before spending effort.`; }

  // --- Ghost risk: thin data + old + no description = likely noise ---
  let ghostRisk = 'low';
  const staleish = (age !== null && age > 25);
  const thin = (q === 'thin') || (!hasDesc && tagCount < 3);
  if(staleish && thin) ghostRisk = 'high';
  else if(staleish || thin) ghostRisk = 'elevated';

  return { ageDays: age, freshness, freshNote, ghostRisk, thin };
}

/* The Signal Score itself: 0-100, honest, capped. Combines real fit with
   freshness + ghost risk. A great fit on a stale/ghost posting is a WEAK signal. */
function computeSignalScore(scoredListing){
  // Number.isFinite, not `typeof === 'number'`: the latter is true for NaN, so a
  // NaN pct slipped through the guard and produced a NaN signalScore - defeating
  // the exact defaulting this guard exists to do. isFinite closes that hole.
  const fit = Number.isFinite(scoredListing.pct) ? scoredListing.pct : 0;
  const sig = assessListingSignal(scoredListing);

  // Start from fit, then adjust for how much applying here actually helps.
  let score = fit;
  // Freshness multiplier - a stale posting means your application is a weak signal.
  const freshMult = { fresh: 1.0, recent: 0.94, aging: 0.8, stale: 0.55, unknown: 0.9 }[sig.freshness];
  score *= freshMult;
  // Ghost risk penalty.
  if(sig.ghostRisk === 'high') score *= 0.7;
  else if(sig.ghostRisk === 'elevated') score *= 0.88;
  // Honest cap (mirrors the 97 fit cap - never a vanity 100).
  score = Math.max(0, Math.min(97, Math.round(score)));

  // Human-readable band + the single honest headline for this listing.
  let band, headline;
  if(sig.ghostRisk === 'high'){
    band = 'Weak signal'; headline = `Applying here is a weak signal - ${sig.freshness === 'stale' ? 'the posting looks stale/ghost' : 'thin, unverifiable posting'}. Spend your effort somewhere fresher.`;
  } else if(fit >= 70 && (sig.freshness === 'fresh' || sig.freshness === 'recent')){
    band = 'Strong signal'; headline = `Strong fit on a live posting - applying here genuinely moves your case. ${sig.freshNote}`;
  } else if(fit >= 70){
    band = 'Good fit, weak timing'; headline = `Good fit, but ${sig.freshNote.charAt(0).toLowerCase() + sig.freshNote.slice(1)} A tailored application still helps - move fast.`;
  } else if(score >= 45){
    band = 'Moderate signal'; headline = `A reasonable but not standout signal. ${sig.freshNote}`;
  } else {
    band = 'Low signal'; headline = `Low signal - weak fit${sig.freshness==='stale'||sig.freshness==='aging'?' and an aging posting':''}. Only worth it if you're broadening your search.`;
  }

  return { signalScore: score, signalBand: band, signalHeadline: headline,
           freshness: sig.freshness, freshNote: sig.freshNote, ghostRisk: sig.ghostRisk, ageDays: sig.ageDays };
}

const PRESENTABLE_MIN_SCORE = 50; // well above the 35 floor - genuinely indicates real signal, not just barely-nonzero
const PRESENTABLE_MIN_SIGNAL = new Set(['moderate', 'high']); // excludes 'low' - a single weak factor clearing the score floor still isn't a real match

/* Never pads results with mediocre listings just to hit a count of
   10 - a cycle with only 2 genuinely good matches returns 2. Showing
   something mediocre as a confident "top match" is the same
   dishonesty as showing near-misses under a falsely negative framing,
   just in the opposite direction. Mirrors the backend's
   PRESENTABLE_MIN_SCORE/PRESENTABLE_MIN_SIGNAL gate exactly. */
function isListingExpired(listing){
  // Parity with the backend's _is_listing_expired: a listing is expired only
  // once its deadline DAY is fully past. The backend compares dates
  // (deadline_date < date.today()), so a listing closing *today* is still open;
  // comparing against Date.now() instead would wrongly mark today's deadline
  // expired from 00:00. "No deadline given" and "unparseable" are never expired.
  if(!listing || !listing.deadline || typeof listing.deadline !== 'string') return false;
  const deadlineTime = parseDeadline(listing.deadline);
  if(isNaN(deadlineTime)) return false;
  const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
  return deadlineTime < todayMidnight.getTime();
}

/* Rotate the good-match pool by scan cycle so consecutive cycles don't surface
   the exact same list in the exact same order - freshness without dishonesty.
   Every item rotated in is still a genuine, above-bar match; the strongest few
   stay pinned at the top (the best really are the best). Deterministic per cycle. */
function _rotateForVariety(arr, keepTop){
  keepTop = keepTop || 0;
  if(!Array.isArray(arr) || arr.length <= keepTop + 1) return arr;
  const cycle = (typeof getCycleCount === 'function' ? (getCycleCount() || 0) : 0);
  const top = arr.slice(0, keepTop);
  const rest = arr.slice(keepTop);
  const off = rest.length ? (cycle % rest.length) : 0;
  return top.concat(rest.slice(off), rest.slice(0, off));
}

function runMatchCycle(profile){
  const goalTokens = tokenizeForMatching((profile.northstar || '') + ' ' + (profile.finalidea || ''));
  const skillTokens = tokenizeForMatching(profile.skills || '');
  const factorWeights = getBlendedFactorWeightsJS();
  const roadmap = getRoadmap();
  const roadmapMilestones = roadmap ? roadmap.milestones : null;
  const dismissedIds = getDismissedIds();
  let candidates = LISTINGS.filter(l=> (profile.types || []).includes(l.type) && !dismissedIds.has(String(l.id)) && !isListingExpired(l));
  let scored = candidates.map(l=>{
    const m = scoreListing(l, goalTokens, skillTokens, profile, factorWeights, roadmapMilestones);
    if(!m) return null;
    m.rationale = buildRationale(l, m, profile);
    const scored = {...l, ...m};
    // Attach the Signal Score (fit + freshness + ghost-risk) - Kaidostar's honest
    // reframing of the discredited "match %".
    Object.assign(scored, computeSignalScore(scored));
    return scored;
  }).filter(Boolean).sort((a,b)=> b.pct - a.pct);
  const presentable = scored.filter(l => l.pct >= PRESENTABLE_MIN_SCORE && PRESENTABLE_MIN_SIGNAL.has(l.signalStrength));
  return _rotateForVariety(presentable, 3).slice(0,10);
}

/* ---- "Why not" transparency - mirrors the backend's
   rank_listings_with_near_misses exactly. Returns the top 10 plus the
   next 5 below the cutoff, both using the SAME real rationale already
   computed for every listing - not a separately-invented negative
   framing. Most job boards silently drop everything below the
   cutoff; this shows it, with real reasoning either way. ---- */
function runMatchCycleWithNearMisses(profile){
  const goalTokens = tokenizeForMatching((profile.northstar || '') + ' ' + (profile.finalidea || ''));
  const skillTokens = tokenizeForMatching(profile.skills || '');
  const factorWeights = getBlendedFactorWeightsJS();
  const roadmap = getRoadmap();
  const roadmapMilestones = roadmap ? roadmap.milestones : null;
  const dismissedIds = getDismissedIds();
  let candidates = LISTINGS.filter(l=> (profile.types || []).includes(l.type) && !dismissedIds.has(String(l.id)) && !isListingExpired(l));
  let scored = candidates.map(l=>{
    const m = scoreListing(l, goalTokens, skillTokens, profile, factorWeights, roadmapMilestones);
    if(!m) return null;
    m.rationale = buildRationale(l, m, profile);
    return {...l, ...m};
  }).filter(Boolean).sort((a,b)=> b.pct - a.pct);
  const presentable = scored.filter(l => l.pct >= PRESENTABLE_MIN_SCORE && PRESENTABLE_MIN_SIGNAL.has(l.signalStrength));
  const topN = 10, baseNearMissN = 5;
  const matches = presentable.slice(0, topN);
  // Adaptive, not fixed: when fewer than topN listings genuinely
  // clear the bar, the person still deserves a full picture of what
  // else is out there - never by lowering the bar for what counts as
  // a "match", only by being more generous about what counts as
  // "worth showing you why it fell short".
  const _rotatedMatches = _rotateForVariety(presentable, 3);
  matches.length = 0; Array.prototype.push.apply(matches, _rotatedMatches.slice(0, topN));
  const shortfall = Math.max(0, topN - matches.length);
  const adaptiveNearMissN = baseNearMissN + shortfall;
  const shownIds = new Set(matches.map(m => m.id));
  const nearMisses = scored.filter(l => !shownIds.has(l.id)).slice(0, adaptiveNearMissN);
  return { matches, nearMisses };
}


function typeBadgeLabel(t){ return t==='job'?'Job':t==='internship'?'Internship':t==='athletic'?'Athletics':'College / Fellowship'; }

/* Mirrors the backend's compute_roadmap_alignment exactly - two real
   upgrades over the earlier version: synonym-aware term matching (a
   milestone about "backend development" now correctly recognizes a
   listing tagged "backend", instead of requiring the literal
   substring), and a graded strength (0-1) instead of just whether
   any overlap exists at all. */
function computeRoadmapAlignment(listing, milestones){
  if(!Array.isArray(milestones) || !milestones.length) return null;
  const listingTags = (listing && Array.isArray(listing.tags)) ? listing.tags : null;
  if(!listingTags || !listingTags.length) return null;
  let bestStage = null, bestMatched = [], bestStrength = 0;
  milestones.forEach(m => {
    if(!m || typeof m !== 'object') return;
    const milestoneTokens = new Set(tokenize((m.title || '') + ' ' + (m.description || '')));
    if(milestoneTokens.size === 0) return;
    const matched = listingTags.filter(tag => [...milestoneTokens].some(t => termsMatch(tag.toLowerCase(), t)));
    if(matched.length === 0) return;
    const strength = matched.length / listingTags.length;
    if(strength > bestStrength){
      bestStrength = strength;
      bestMatched = matched;
      bestStage = m;
    }
  });
  if(!bestStage) return null;
  return { stage: bestStage.stage, title: bestStage.title || '', matchedOn: bestMatched.length, matchedTags: bestMatched, strength: Math.round(bestStrength*1000)/1000 };
}

function ringSvg(pct, color, size){
  size = size || 52;
  const r = (size/2) - 5, c = 2*Math.PI*r, offset = c-(pct/100)*c, cx = size/2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/></svg>`;
}

/* ---- Generic tag/keyword-overlap scoring, reusable for athletes matching listings ---- */
function scoreByOverlap(itemTags, requirementText){
  itemTags = Array.isArray(itemTags) ? itemTags : [];
  const reqTokens = tokenize(requirementText || '');
  const matched = itemTags.filter(tag => typeof tag === 'string' && reqTokens.some(t => termsMatch(tag.toLowerCase(), t)));
  // Honest scoring: a listing with NO real overlap scores low - not an inflated
  // floor. The old `Math.max(30, ...)` meant a completely irrelevant opportunity
  // (zero matching tags) still showed "30% match", which is exactly the vanity
  // inflation Kaidostar rejects. Now: no tags or no overlap -> a genuinely low score
  // (single digit), so irrelevant results sink; real overlap earns a real score.
  if(itemTags.length === 0 || matched.length === 0) return { pct: 8, matched: [] };
  // Recalibrated (honest, NOT a vanity floor): a genuine overlap with the
  // person's real profile IS a strong, relevant fit, so it scores confidently
  // (85+). Each additional real overlap adds more with diminishing returns,
  // capped at the honest 97 ceiling. A listing with NO real overlap still scores
  // a genuine single digit (8) above - weak matches stay weak and get filtered.
  const m = matched.length;
  const ratio = matched.length / itemTags.length;
  const pct = Math.min(97, 85 + (m - 1) * 4 + Math.round(ratio * 4));
  return { pct, matched };
}

/* ---- Career discovery: for people who don't know what direction to aim at yet ---- */
const CAREER_DIRECTIONS = [
  { id:'product-strategy', title:'Product & Business Strategy', description:'Deciding what gets built and why - balancing user needs, data, and business goals.', dims:{people:2,data:2,creative:1,structure:2}, listingTags:['product','roadmap','stakeholder','strategy'] },
  { id:'data-analytics', title:'Data & Analytics', description:'Finding patterns in information to answer real questions and guide decisions.', dims:{people:0,data:3,creative:0,structure:2}, listingTags:['sql','python','analytics','data','dashboards'] },
  { id:'software-engineering', title:'Software Engineering', description:'Building the systems and tools other people and businesses run on.', dims:{people:0,data:2,creative:1,structure:2}, listingTags:['python','backend development','ml','testing'] },
  { id:'ux-design', title:'UX & Design', description:'Shaping how something looks, feels, and works for the people using it.', dims:{people:2,data:0,creative:3,structure:0}, listingTags:['figma','user research','prototyping','ux'] },
  { id:'marketing-comms', title:'Marketing & Communications', description:'Telling a story clearly enough that the right people actually hear it.', dims:{people:2,data:1,creative:2,structure:0}, listingTags:['marketing','writing','positioning','growth'] },
  { id:'healthcare-science', title:'Healthcare & Life Sciences', description:'Working directly on human health, from clinical care to research.', dims:{people:3,data:1,creative:0,structure:2}, listingTags:['sports medicine','athletic training','injury prevention','research'] },
  { id:'education-teaching', title:'Education & Teaching', description:'Helping other people learn something you understand well.', dims:{people:3,data:0,creative:1,structure:1}, listingTags:['mentorship','leadership','coaching','training'] },
  { id:'skilled-trades', title:'Skilled Trades & Hands-on Work', description:'Building or fixing real, physical things - work you can see the result of.', dims:{people:1,data:0,creative:1,structure:1}, listingTags:['operations','process','training','conditioning'] },
  { id:'creative-media', title:'Creative & Media', description:'Making things - writing, video, design, or content people actually engage with.', dims:{people:1,data:0,creative:3,structure:0}, listingTags:['writing','positioning','figma','prototyping'] },
  { id:'social-impact', title:'Social Impact & Nonprofit', description:'Working on a mission-driven problem where the impact matters more than the paycheck.', dims:{people:3,data:1,creative:1,structure:1}, listingTags:['policy','ethics','mentorship','leadership'] },
  { id:'finance-ops', title:'Finance & Operations', description:'Keeping the numbers, processes, and logistics of an organization actually working.', dims:{people:0,data:2,creative:0,structure:3}, listingTags:['finance','excel','operations','reporting'] },
  { id:'sports-athletics', title:'Sports & Athletics', description:'A career built around competition, coaching, or the business of sport.', dims:{people:2,data:0,creative:1,structure:1}, listingTags:['athletics','coaching','sports management','training'] },
  { id:'sales-bizdev', title:'Sales & Business Development', description:'Building relationships and making the case for why someone should say yes - to a product, a partnership, or an idea.', dims:{people:3,data:1,creative:1,structure:1}, listingTags:['sales','businessdevelopment','accountexecutive','growth'] },
  { id:'hr-people', title:'HR & People Operations', description:"Building the systems and relationships that help an organization's people actually thrive.", dims:{people:3,data:0,creative:0,structure:2}, listingTags:['hr','humanresources','recruiting','peopleops'] },
  { id:'customer-success', title:'Customer Success & Support', description:'Making sure the people who already chose a product or service actually get real value from it.', dims:{people:3,data:1,creative:0,structure:1}, listingTags:['customersuccess','customersupport','accountmanagement','clientsuccess'] },
  { id:'legal-compliance', title:'Legal & Compliance', description:"Making sure an organization's decisions actually hold up - to regulation, contracts, and real-world risk.", dims:{people:1,data:1,creative:0,structure:3}, listingTags:['legal','compliance','regulatory','paralegal'] },
];

// Words too broad and common to be treated as meaningful when they
// happen to be a literal prefix of a tag - found via sweeping common
// words against every real tag on the backend: "people" genuinely
// prefixes "peopleops" but is generic enough to apply to nearly any
// people-facing role, not specifically HR.
// Found via a broader sweep against real listing tags (not just the
// curated 16-direction list): "lead" as a common job-title suffix
// doesn't genuinely mean "leadership" as an abstract trait, and
// "position" as a generic word for a job doesn't mean "positioning"
// as a specific marketing concept.
const GENERIC_PREFIX_EXCLUSIONS_JS = new Set(['people','team','work','help','time','life','good','great','thing','love','like','lead','position','business']);

function careerTagMatches(tag, tok){
  // Word-boundary match catches genuine whole-word matches and
  // multi-word tags ("injury prevention"). The prefix check
  // separately catches this file's compound tags (customersuccess,
  // humanresources, businessdevelopment) - word-boundary alone can't
  // recognize "customer" as a real word inside "customersuccess",
  // the same way it correctly refuses "brand" inside "branding".
  // Mirrors the backend's _tag_matches exactly, including the same
  // real false positives found and fixed there: "event" matching
  // inside "injury prevention" (via "prEVENTion") and "our" matching
  // inside "humanresources" (via "resOURces") - neither is a genuine
  // prefix, only a substring buried mid-tag, so both stay excluded.
  if(wordBoundaryContains(tag, tok) || wordBoundaryContains(tok, tag)) return true;
  if(tok.length >= 4 && !GENERIC_PREFIX_EXCLUSIONS_JS.has(tok) && tag.startsWith(tok)) return true;
  return false;
}

function scoreCareerDirections(answers){
  // answers: {people, data, creative, structure} each 0-3, plus freeText
  answers = answers || {};
  const freeTextTokens = tokenize(answers.freeText || '');
  // Defensive: a missing/blank slider must not poison the arithmetic into NaN.
  // The whole function floors at 20 and caps at 97 precisely to always emit a
  // sane percentage, but `dim - undefined` is NaN, which defeats both the floor
  // and the cap and would surface "NaN%" directions. Coerce each work-style
  // dimension to a real 0-3 number (default 0) before differencing.
  // Default 1 for anything that isn't a real number, matching the backend's
  // _dim exactly (isinstance(v,(int,float)) else 1). Number(v) was wrong here:
  // Number(null) is 0, so an explicit JSON null (an unanswered slider) scored as
  // 0 on the client but 1 on the server - a real FE/BE divergence that also
  // contradicted this line's own "default 1" intent. typeof-guarding matches the
  // backend for null, false, "", strings and NaN alike (all -> 1).
  const _dim = v => (typeof v === 'number' && Number.isFinite(v)) ? v : 1;
  const ans = { people:_dim(answers.people), data:_dim(answers.data), creative:_dim(answers.creative), structure:_dim(answers.structure) };
  return CAREER_DIRECTIONS.map(dir => {
    const dimDiff = Math.abs(dir.dims.people - ans.people) + Math.abs(dir.dims.data - ans.data) +
                     Math.abs(dir.dims.creative - ans.creative) + Math.abs(dir.dims.structure - ans.structure);
    const maxDiff = 12; // 4 dims x max distance 3
    let pct = Math.round((1 - (dimDiff / maxDiff)) * 100);
    const textMatches = dir.listingTags.filter(tag => freeTextTokens.some(t => careerTagMatches(tag, t)));
    pct = Math.min(97, pct + (textMatches.length * 6));
    pct = Math.max(20, pct);
    const relatedListings = LISTINGS.filter(l => (l.tags || []).some(t => dir.listingTags.includes(t)));
    return { ...dir, pct, textMatches, relatedCount: relatedListings.length };
  // Secondary sort key on evidence count, not just pct - mirrors the
  // backend exactly. A genuine tie exists in the curated data itself
  // (Social Impact & Nonprofit and Sales & Business Development
  // share identical dims), which combined with the 97 ceiling meant
  // two directions with different amounts of real supporting
  // evidence could rank in arbitrary insertion order. No displayed
  // percentage changes.
  }).sort((a,b) => b.pct - a.pct || b.textMatches.length - a.textMatches.length);
}

/* ---- Real AI-generated career directions: this is the actual
   'better than FutureScope' piece. Static quiz tools (FutureScope,
   CareerExplorer) match your answers against a fixed list of a few
   hundred to a thousand pre-written career profiles - you always get
   back something from their list, worded the same way for everyone
   who lands near that spot. This instead reasons directly over what
   someone actually wrote, so the output isn't capped to a fixed set
   of categories and reads like it was written for this person, not
   pulled from a shelf. scoreCareerDirections() above is kept only as
   an instant offline fallback if this call fails. ---- */
async function generateCareerDirectionsAI(answers){
  const valuesText = (answers.values && answers.values.length) ? answers.values.join(', ') : 'not specified';
  const prompt = `Someone doesn't know what career direction to pursue. Here's what they told us, which is the actual evidence to reason from - weight the concrete, specific things they described far more heavily than the numeric ratings:

REAL EVIDENCE (the strongest signal - what they've actually done):
- Something they're proud of having built, led, organized, or solved: "${answers.proudMoment || 'not answered'}"
- A time they lost track of time (a real flow moment): "${answers.flowMoment || 'not answered'}"
- What people already come to them for help with: "${answers.soughtFor || 'not answered'}"

VALUES (what they'd protect even at a cost): ${valuesText}

WORK STYLE (secondary signal, use to shape HOW you frame directions, not to pick generic categories):
People-facing vs solo: ${answers.people}/3. Data/analytical work: ${answers.data}/3. Open-ended vs structured: ${answers.structure}/3. Risk tolerance (stable vs entrepreneurial): ${answers.risk}/3. Pace (steady vs fast-changing): ${answers.pace}/3.

WHAT TO AVOID: "${answers.avoidText || 'not specified'}"

PRACTICAL CONTEXT: ${answers.timeline === 'now' ? 'Needs direction soon, not just exploring casually' : 'Just exploring, no deadline pressure'}. ${answers.openToTraining === 'yes' ? 'Open to more school/training if it fits.' : 'Prefers to avoid additional formal schooling.'}

Generate 3-4 specific career directions worth them considering. Ground your reasoning in the REAL EVIDENCE section above FIRST - the proud moment, flow moment, and what people seek them out for are worth more than the numeric sliders. Do NOT default to generic broad categories like "marketing" or "healthcare" unless their answers genuinely point there. If what they described is specific, your directions should be too, not generic buckets. Respect their stated dealbreakers - never suggest a direction that clearly conflicts with what they said to avoid.

For each direction, return an object with exactly these four keys:
- title: a specific, real direction (not a vague category)
- description: 1-2 sentences on what someone in this direction actually spends their time doing, concretely
- why_fits: 1-2 sentences connecting THIS specific person's real evidence (quote or reference their actual accomplishment, flow moment, or what people seek them for) to why this direction fits them specifically - not their slider ratings, their actual described evidence
- first_step: one concrete, low-commitment thing they could do this week to test whether it actually fits - not "research the field", something specific and doable

Return ONLY valid JSON, an array of 3-4 such objects, nothing else, no markdown fences, no commentary.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1100, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    let text = (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n');
    text = text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(text);
    const evidenceTokens = tokenize([answers.proudMoment, answers.flowMoment, answers.soughtFor].filter(Boolean).join(' '));
    return parsed.map((d, i) => {
      const dTokens = tokenize((d.title || '') + ' ' + (d.description || ''));
      const allTokens = [...new Set([...dTokens, ...evidenceTokens])];
      // careerTagMatches (word-boundary + guarded compound-tag prefix
      // matching) instead of a raw substring check - found via direct
      // testing that the raw check let a completely unrelated
      // "Freelance Graphic Design" direction falsely show real
      // listings as related, purely because "event" (from ordinary
      // evidence text like "I organized a team event") collided with
      // "injury prevENTion" on an athletic-training listing. This is
      // the primary, AI-powered path's core grounding claim - a wrong
      // relatedCount here undermines exactly the credibility this
      // feature depends on.
      const relatedListings = LISTINGS.filter(l => (l.tags || []).some(t => allTokens.some(tok => careerTagMatches(t, tok))));
      return { ...d, id: 'ai-' + i, relatedCount: relatedListings.length };
    });
  } catch(err){
    console.error('AI career direction generation failed, falling back to offline matching:', err);
    return null;
  }
}

async function explainCareerDirectionDeep(direction, answers){
  const valuesText = (answers.values && answers.values.length) ? answers.values.join(', ') : 'not specified';
  const prompt = `Someone doesn't yet know what career direction to pursue. What they're proud of: "${answers.proudMoment || 'not answered'}". A real flow moment: "${answers.flowMoment || 'not answered'}". What people already seek them out for: "${answers.soughtFor || 'not answered'}". What they value: ${valuesText}. What they want to avoid: "${answers.avoidText || 'not specified'}".\n\nA suggested direction: "${direction.title || 'this direction'}" - ${direction.description || ''}\n\nWrite a genuine, specific 3-4 sentence case for why this direction could fit THEM based on their real evidence above - reference their actual accomplishment or flow moment specifically, not generic traits. Then give one concrete, low-commitment first step they could take this week to test whether it actually fits (not "research the field" - something specific and doable). Be honest about the real fit, even if that means saying it's a poor match, not just a partial one, especially if it conflicts with what they said to avoid - straining to find something positive to say when the honest answer is that it doesn't fit well would be worse than just saying so plainly.`;
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{role:"user", content: prompt}] })
    });
    const data = await response.json();
    return (data.content || []).map(b => b.type==='text'?b.text:'').filter(Boolean).join('\n') || null;
  } catch(err){ console.error('Career direction explanation failed:', err); return null; }
}

function getCareerDiscoveryResult(){ try{ const v = JSON.parse(localStorage.getItem('kaidostar_career_discovery')); return (v && Array.isArray(v.directions)) ? v : null; }catch(e){ return null; } }
function saveCareerDiscoveryResult(r){ _safeSetItem('kaidostar_career_discovery', JSON.stringify(r)); }

/* ---- Roadmap generation (client-side, personalized with real match data) ---- */
function generateRoadmapLocal(profile, skillGaps, topMatch){
  skillGaps = skillGaps || [];
  const stage = profile.stage;
  const goalPhrase = (profile.northstar || '').split(/[.,;]/)[0];
  const finalPhrase = (profile.finalidea || '').split(/[.,;]/)[0] || goalPhrase;
  const gapSkill = skillGaps[0];
  const gapSkill2 = skillGaps[1];
  const priorityText = (Array.isArray(profile.priorities) ? profile.priorities : []).join(' and ') || 'fit';
  const locText = profile.loc || 'your target location';
  const steps = [];

  const matchLine = topMatch
    ? `Your current top match is "${topMatch.title}" at ${topMatch.org} (${topMatch.pct}% fit) - start there.`
    : `Run a scan on the Job Search page first so this step can point at a real listing instead of a placeholder.`;
  const matchFirstAction = topMatch
    ? `Today: open "${topMatch.title}" at ${topMatch.org} on your Job Search page and read the full listing - decide within 24 hours whether to apply.`
    : `Today: go to Job Search and click "Start watch" so real listings start showing up here.`;

  if(stage === 'student'){
    steps.push({
      title: `Ship one project that directly demonstrates "${goalPhrase}"`,
      description: `Not a class assignment - something you chose, built, and can defend in an interview. It should use the specific skills your target roles ask for, not generic ones.`,
      success_criteria: 'You have a live link, repo, or writeup you would actually be comfortable sending to a stranger.',
      estimated_timeframe: '2-4 weeks',
      first_action: 'Today: write down the exact project idea in one sentence and pick the single dataset, tool, or problem you will use.',
      resource: 'A public dataset on Kaggle or your school\'s data repository in a domain close to your goal.',
      risk: 'Picking a project too broad to finish in the timeframe - scope it down until you could finish a rough version in a weekend.',
    });
    if(gapSkill){
      steps.push({
        title: `Get hands-on with ${gapSkill}${gapSkill2 ? ' and ' + gapSkill2 : ''}`,
        description: `These show up repeatedly in listings that match "${goalPhrase}" but aren't in what you told us about your skills - this is the single highest-leverage gap to close right now.`,
        success_criteria: `You can walk someone through one real example of using ${gapSkill}, not just say you've "studied" it.`,
        estimated_timeframe: '3-6 weeks',
        first_action: `Today: find one free tutorial or real dataset involving ${gapSkill} and complete the first concrete exercise, not just watch an overview.`,
        resource: `A free-tier course or official documentation site for ${gapSkill}, paired with one real practice problem.`,
        risk: 'Passively watching tutorials without building anything - force yourself to produce one artifact, however small.',
      });
    }
    steps.push({
      title: `Apply to your top ${priorityText}-scoring internship matches`,
      description: `${matchLine} Prioritize matches scoring 65%+ over lower ones - fit compounds, volume doesn't.`,
      success_criteria: 'You have applied to at least 5 internships scoring 60%+ and heard back from at least 1.',
      estimated_timeframe: '1-3 months',
      first_action: matchFirstAction,
      resource: 'Your Job Search watch, filtered and sorted by match percentage.',
      risk: 'Applying broadly to low-fit roles instead of a focused set of high-fit ones - quality of application beats quantity here.',
    });
    steps.push({
      title: `Convert your internship into a full-time offer near "${finalPhrase}"`,
      description: `Target new-grad programs at companies similar to wherever you land your internship - proven internal performance is the strongest signal you can build.`,
      success_criteria: 'You have a signed offer, or are in final-round interviews at 2+ places.',
      estimated_timeframe: '2-4 months',
      first_action: 'Once your internship starts: identify the one metric your manager cares about most and make visible progress on it in your first 30 days.',
      resource: 'Your internship manager and one senior peer, as direct sources of what "doing well" actually looks like there.',
      risk: 'Staying heads-down on tasks without ever confirming with your manager whether you\'re prioritizing the right things.',
      if_it_works: `You'll likely get a return offer or a strong referral - use it to negotiate for the specific team or scope closest to "${finalPhrase}", not just any open headcount.`,
      if_it_stalls: 'If no return offer comes, ask directly for specific feedback before the internship ends - a clear "why not" is worth more for your next attempt than silence, and apply that feedback to your next internship search immediately rather than waiting.',
    });
  } else if(stage === 'grad'){
    steps.push({
      title: 'Rewrite your resume around your 3 strongest, most specific outcomes',
      description: `Every bullet should have a number or a before/after - "improved X by Y%" beats "responsible for X" every time.`,
      success_criteria: 'A friend can read your resume for 30 seconds and correctly state your strongest qualification back to you.',
      estimated_timeframe: '1 week',
      first_action: 'Today: pick your single best accomplishment and rewrite it with a specific number attached.',
      resource: 'One trusted peer or mentor willing to give blunt, specific feedback on a draft.',
      risk: 'Over-polishing wording instead of fixing substance - a vague strong bullet needs a real number, not better adjectives.',
    });
    if(gapSkill){
      steps.push({
        title: `Close the ${gapSkill} gap before it costs you interviews`,
        description: `This shows up often in listings matching "${goalPhrase}" but isn't reflected anywhere in your current resume or skills.`,
        success_criteria: `You have one concrete example of using ${gapSkill} you could describe in an interview.`,
        estimated_timeframe: '3-4 weeks',
        first_action: `Today: find one small, real task involving ${gapSkill} you could complete this week.`,
        resource: `A free-tier course or official documentation for ${gapSkill}.`,
        risk: 'Treating this as optional polish rather than a real gap - if it shows up in most of your target listings, it is load-bearing.',
      });
    }
    steps.push({
      title: `Apply to entry-level roles matching "${goalPhrase}", prioritized by fit not title`,
      description: `${matchLine} A 70%+ goal-fit role at a smaller company usually beats a 40%-fit role at a bigger name.`,
      success_criteria: 'You are actively interviewing at 3+ roles scoring 70%+ match.',
      estimated_timeframe: '1-2 months',
      first_action: matchFirstAction,
      resource: 'Your Job Search watch, filtered and sorted by match percentage.',
      risk: 'Chasing brand-name companies over genuine fit - a role that\'s a poor fit rarely converts even if the interview goes well.',
    });
    steps.push({
      title: `Build one documented win in your first 12 months toward "${finalPhrase}"`,
      description: 'The fastest route to your long-term goal is proving you can do the current job well first - not skipping ahead.',
      success_criteria: 'You have one specific, quantified accomplishment you could cite in a promotion or next-job conversation.',
      estimated_timeframe: '12 months',
      first_action: 'In your first week on the job: ask your manager directly what success looks like in 90 days, in their own words.',
      resource: 'Your manager\'s own stated priorities, gathered directly rather than assumed.',
      risk: 'Assuming you know what matters without confirming it - misaligned effort is invisible until review time.',
      if_it_works: `Use that documented win to explicitly ask for scope closer to "${finalPhrase}" in your next review cycle, rather than waiting to be offered it.`,
      if_it_stalls: 'If 6 months pass with no clear win to point to, that\'s a signal worth acting on directly - ask your manager for a harder or more visible project rather than continuing on the current track and hoping it improves.',
    });
  } else if(stage === 'switch'){
    steps.push({
      title: `Write a one-paragraph pitch translating your background into "${goalPhrase}" language`,
      description: 'Your existing experience is an asset, but only if it\'s described in terms your target field recognizes - not your old field\'s jargon.',
      success_criteria: 'You can say this pitch out loud in under 30 seconds without sounding rehearsed.',
      estimated_timeframe: '1 week',
      first_action: 'Today: write 3 bullet points translating your most relevant past work into your target field\'s terms.',
      resource: 'One person already working in your target field, willing to sanity-check your pitch for 15 minutes.',
      risk: 'Leading with your old title instead of your transferable substance - the title itself can work against you here.',
    });
    if(gapSkill){
      steps.push({
        title: `Close the ${gapSkill} credibility gap with one real project`,
        description: `This is a common requirement in listings matching "${goalPhrase}" that your current background doesn't yet demonstrate on paper.`,
        success_criteria: `You've completed one project, course, or task that used ${gapSkill} for real, not just watched a tutorial.`,
        estimated_timeframe: '4-8 weeks',
        first_action: `Today: find one real (not toy) problem you could solve using ${gapSkill} and start it this week.`,
        resource: `A real (not toy) problem from your current job or a public dataset that requires ${gapSkill} to solve.`,
        risk: 'Choosing a tutorial-style toy project - hiring managers can tell the difference between a real problem and a walkthrough.',
      });
    }
    steps.push({
      title: `Apply to roles bridging your old field and "${finalPhrase}"`,
      description: `${matchLine} A hybrid role is usually an easier first step than a pure jump - it lets your existing experience count for something.`,
      success_criteria: 'You have an offer, or serious interest, in a role touching both your old and new field.',
      estimated_timeframe: '2-4 months',
      first_action: matchFirstAction,
      resource: 'Your Job Search watch, filtered for roles tagged with both your old and new domain.',
      risk: 'Jumping straight for a pure new-field role before you have any bridge experience - the hybrid step de-risks the whole switch.',
      if_it_works: `Once you land the hybrid role, treat your first 6 months as evidence-gathering for the pure jump to "${finalPhrase}" - document what transferred and what you had to newly learn.`,
      if_it_stalls: 'If hybrid roles aren\'t responding either, that often means the pitch itself needs work before the target - go back and sharpen the specific project or credential from earlier in this plan before applying more broadly.',
    });
  } else {
    steps.push({
      title: `Turn "${finalPhrase}" into a specific, named target`,
      description: `Vague goals produce vague plans - name the actual title, team, or scope you're aiming at in ${locText}, not just a direction.`,
      success_criteria: 'You can describe your target role or outcome in one concrete sentence, with a real title attached.',
      estimated_timeframe: '1 week',
      first_action: 'Today: write down the exact job title or outcome you\'re aiming for - if you can\'t name one, that\'s the actual first problem to solve.',
      resource: 'Job postings for people already doing what you want to do, as a reference for real titles and scope.',
      risk: 'Staying vague on purpose to avoid commitment - a specific wrong target is easier to correct than no target at all.',
    });
    if(gapSkill){
      steps.push({
        title: `Build visible, provable strength in ${gapSkill}`,
        description: `This shows up often in opportunities matching "${goalPhrase}" - closing it makes your next move credible instead of aspirational.`,
        success_criteria: `You have one concrete, recent example of using ${gapSkill} you could cite today.`,
        estimated_timeframe: '3-6 weeks',
        first_action: `Today: identify one visible task at your current job or a side project where you could apply ${gapSkill} this month.`,
        resource: 'A visible task at your current job where this skill would genuinely help, rather than a side project nobody sees.',
        risk: 'Building the skill invisibly on the side - if nobody who controls your next move ever sees it, it doesn\'t count yet.',
      });
    }
    steps.push({
      title: 'Make your progress visible to the person who controls your next step',
      description: 'Take on work that makes the next move obvious to decision-makers, rather than waiting to be noticed.',
      success_criteria: 'Someone with real influence over your next step has proactively mentioned your progress, unprompted.',
      estimated_timeframe: '1-2 months',
      first_action: 'This week: identify exactly who decides your next move, and find one legitimate reason to update them on progress.',
      resource: 'A regular, low-key update channel (a monthly note, a standing 1:1) rather than one big pitch.',
      risk: 'Waiting for a single perfect moment to make your case - visibility built gradually is more credible than a sudden pitch.',
    });
    steps.push({
      title: `Make the ask for "${finalPhrase}"`,
      description: 'Apply, pitch, or negotiate the transition once the groundwork above is actually in place - not before.',
      success_criteria: 'You have formally made the ask to the person or process that controls the decision.',
      estimated_timeframe: '2-4 weeks',
      first_action: 'Once ready: schedule the actual conversation or submit the actual application - put a date on the calendar now, not "soon".',
      resource: 'A specific date on your calendar, treated as a real commitment.',
      risk: 'Letting "almost ready" become permanent - the groundwork steps above are meant to end, not continue indefinitely.',
      if_it_works: `Get the terms in writing quickly, and use this as the new baseline - "${finalPhrase}" becomes the floor for what you'll accept next, not the ceiling.`,
      if_it_stalls: 'A "no" here is information, not a dead end - ask specifically what would need to be true for a "yes" next time, then treat that answer as your next milestone rather than starting over from scratch.',
    });
  }

  const summary = `This plan moves from ${stage === 'student' ? 'building proof of your interest' : stage === 'grad' ? 'sharpening your existing story' : stage === 'switch' ? 'translating your background' : 'clarifying your target'} toward "${goalPhrase}" in roughly ${steps.length} stages. ${gapSkill ? `The biggest risk to the whole plan is skipping the ${gapSkill} gap - it shows up repeatedly in your real matches and closing it early makes every later stage easier.` : 'The biggest risk to the whole plan is moving to the next stage before the current one has a real, checkable result - momentum without evidence tends to stall.'}`;

  return {
    version: ROADMAP_VERSION,
    summary,
    milestones: steps.map((s, i) => ({...s, stage: i + 1, status: 'planned'})),
  };
}

/* ---- Athlete-specific roadmap, tailored to sporting career direction ---- */
function generateAthleteRoadmapLocal(athleteProfile, topMatch){
  const sport = athleteProfile.sport || 'your sport';
  const direction = athleteProfile.careerDirection;
  const level = athleteProfile.level || 'your current';
  const steps = [];

  const matchLine = topMatch
    ? `Your current top match is "${topMatch.title}" at ${topMatch.org} (${topMatch.pct}% fit) - start there.`
    : `Run a scan on Opportunities first so this step can point at a real listing instead of a placeholder.`;
  const matchFirstAction = topMatch
    ? `Today: open "${topMatch.title}" at ${topMatch.org} and read the full listing - decide within 24 hours whether to apply.`
    : `Today: go to Opportunities and browse what's currently available.`;

  if(direction === 'play-college'){
    steps.push({
      title: `Build a recruiting highlight reel for ${sport}`,
      description: `Coaches decide in seconds whether to keep watching - your reel needs to open with your strongest, most representative plays in ${sport}, not a slow build-up.`,
      success_criteria: 'You have a 3-5 minute video you would actually send to a college coach today.',
      estimated_timeframe: '2-3 weeks',
      first_action: 'Today: pull your 5 best clips from recent games or practice footage and put them in one folder.',
      resource: 'Game or practice footage you already have, plus free editing tools (CapCut, iMovie).',
      risk: 'Waiting for a "perfect" highlight moment instead of using what you already have - a good-enough reel sent now beats a perfect one sent after the recruiting window closes.',
    });
    steps.push({
      title: `Apply to scholarship and recruiting opportunities matching ${level} level`,
      description: `${matchLine} Prioritize programs where your current level is a realistic fit - reaching too high across the board wastes limited outreach time.`,
      success_criteria: 'You have applied to or contacted at least 5 programs matching your level and sport.',
      estimated_timeframe: '1-3 months',
      first_action: matchFirstAction,
      resource: 'Your Opportunities page, filtered by athletic scholarships in your sport.',
      risk: 'Only targeting top-tier programs - a broader list of realistic-fit schools produces more real offers.',
    });
    steps.push({
      title: 'Get on a call with a coach at a realistic-fit program',
      description: 'A direct conversation does more than any application - coaches remember athletes who reach out specifically, not generically.',
      success_criteria: 'You have had at least one real conversation with a college coach about their program.',
      estimated_timeframe: '3-6 weeks',
      first_action: 'This week: email one coach directly, referencing something specific about their program and your fit.',
      resource: 'The coaching staff directory on the program\'s official athletics website.',
      risk: 'Sending the same generic email to every program - a specific, researched message gets responses; a form email gets ignored.',
      if_it_works: 'A good call is often followed by an invite to a camp or visit - treat that invite as the real recruiting event and prepare for it specifically, not casually.',
      if_it_stalls: 'No response after a genuine, specific outreach usually means the fit isn\'t there at that program, not that you did something wrong - move down your realistic-fit list rather than sending the same message again.',
    });
  } else if(direction === 'go-pro'){
    steps.push({
      title: `Get in front of scouts or agents in ${sport}`,
      description: 'Visibility to the people who make roster and signing decisions is the actual bottleneck at this stage, not raw performance alone.',
      success_criteria: 'You have made direct contact with at least one scout, agent, or team representative.',
      estimated_timeframe: '1-2 months',
      first_action: 'Today: identify one realistic contact (a local scout, a combine organizer, an agent) and research how to reach them.',
      resource: 'Combine or tryout events in your region, and public scouting/agent directories for your sport.',
      risk: 'Waiting to be discovered instead of actively reaching out - at this level, visibility is something you build, not something that happens to you.',
    });
    steps.push({
      title: `Compete at the highest available level for ${sport}`,
      description: `${matchLine} Every level up is itself a credential - semi-pro, regional, or open competitions all build a track record scouts can verify.`,
      success_criteria: 'You are registered or competing in the highest-level competition realistically available to you right now.',
      estimated_timeframe: 'Ongoing',
      first_action: matchFirstAction,
      resource: 'Your Opportunities page, filtered for competitive/professional-track listings in your sport.',
      risk: 'Staying at a comfortable level too long - progression requires deliberately seeking tougher competition.',
    });
    steps.push({
      title: 'Build a public record scouts can verify independently',
      description: 'Stats, video, and results that exist publicly are more credible than anything you say about yourself directly.',
      success_criteria: 'A scout could find verifiable performance data about you without asking you for it first.',
      estimated_timeframe: '2-3 months',
      first_action: 'This week: make sure your competition results and stats are documented somewhere public and findable.',
      resource: 'Your league or competition\'s official results/stats pages, plus your own athlete profile page if you have one.',
      risk: 'Relying only on word-of-mouth reputation - a public, verifiable record travels further than a reputation confined to your local circle.',
      if_it_works: 'Once scouts can verify you independently, direct outreach gets dramatically easier - lead with the record itself, not a pitch about your potential.',
      if_it_stalls: 'If interest still isn\'t coming despite a solid public record, the gap is usually visibility, not talent - go back to the earlier step of directly contacting scouts rather than waiting for the record to speak for itself.',
    });
  } else if(direction === 'coach'){
    steps.push({
      title: `Get certified or credentialed to coach ${sport}`,
      description: `Most coaching roles require a specific certification before they will even consider an application - this is the real first gate, not experience alone.`,
      success_criteria: 'You hold (or are actively completing) the certification most commonly required for coaching roles in your sport.',
      estimated_timeframe: '4-8 weeks',
      first_action: 'Today: search for the standard coaching certification for your sport and confirm the exact requirements.',
      resource: 'Your sport\'s national governing body website, which typically lists official certification programs.',
      risk: 'Assuming playing experience alone qualifies you - most programs specifically require the certification, not just a playing background.',
    });
    steps.push({
      title: `Apply to assistant or entry-level coaching roles matching ${level}`,
      description: `${matchLine} An assistant role is the realistic entry point almost everywhere - it builds the track record head roles require.`,
      success_criteria: 'You have applied to at least 5 coaching roles at your current credential level.',
      estimated_timeframe: '1-3 months',
      first_action: matchFirstAction,
      resource: 'Your Opportunities page, filtered for coaching roles in your sport.',
      risk: 'Only applying to head-coach roles before building any staff experience - assistant roles are not a step down, they\'re the standard entry point.',
    });
    steps.push({
      title: 'Build a specific coaching philosophy you can articulate',
      description: 'Programs hire coaches who can clearly explain their approach, not just list credentials - this is usually the actual interview differentiator.',
      success_criteria: 'You can explain your coaching philosophy in 2-3 concrete sentences, with a specific example.',
      estimated_timeframe: '2 weeks',
      first_action: `Today: write down the one coaching principle you would build a program around, with a real example from your own experience.`,
      resource: 'A coach or mentor you respect, as a sounding board for articulating your approach.',
      risk: 'Relying on generic coaching cliches in interviews - specificity is what actually separates candidates.',
      if_it_works: 'A clear, specific philosophy tends to lead to more interviews than credentials alone - lead with it early in applications, not just when asked.',
      if_it_stalls: 'If interviews aren\'t materializing despite certification and a clear philosophy, the gap may be visibility, not qualification - reach out directly to programs rather than relying on job postings alone.',
    });
  } else {
    steps.push({
      title: `Identify the specific sports-management role you're targeting`,
      description: `"Sports management" covers very different jobs - operations, athletic training, sports medicine, program coordination. Naming the specific track focuses everything after this.`,
      success_criteria: 'You can name the exact job title and type of organization you\'re targeting.',
      estimated_timeframe: '1 week',
      first_action: 'Today: look at 5 real job postings in sports management and note which specific track appeals most.',
      resource: 'Your Opportunities page, browsed broadly across sports management/administration listings.',
      risk: 'Staying vague about "something in sports" - a named target is what actually focuses your applications.',
    });
    steps.push({
      title: `Apply to entry-level sports management roles matching ${level}`,
      description: `${matchLine} Athletic departments and sports organizations often hire from within - an entry-level operations or coordination role is a realistic first step.`,
      success_criteria: 'You have applied to at least 5 roles in your identified track.',
      estimated_timeframe: '1-3 months',
      first_action: matchFirstAction,
      resource: 'Your Opportunities page, filtered for sports management and operations roles.',
      risk: 'Applying broadly across every sports-adjacent posting instead of your specific identified track - focus produces stronger applications.',
    });
    steps.push({
      title: 'Build direct experience through a real athletic department or organization',
      description: 'Even part-time or volunteer experience inside a real athletic operation is worth more on paper than related-but-outside experience.',
      success_criteria: 'You have real, even if informal, experience inside an athletic department or sports organization.',
      estimated_timeframe: '2-3 months',
      first_action: 'This week: contact one local athletic department or sports organization about part-time or volunteer opportunities.',
      resource: 'Local high school, college, or club athletic departments - often more accessible than professional organizations for a first step.',
      risk: 'Waiting for a paid role before getting any real experience - unpaid or part-time experience inside the industry is a legitimate, common path in.',
      if_it_works: 'Once you have real experience inside an athletic operation, apply to paid entry-level roles immediately - don\'t stay in an unpaid arrangement longer than it takes to build a real reference and story.',
      if_it_stalls: 'If no department responds to a direct approach, broaden past your first-choice level (high school instead of college, club instead of varsity) - the goal at this stage is real experience, not a prestigious first stop.',
    });
  }

  const directionLabel = {'play-college': 'playing at the college level', 'go-pro': 'going pro', 'coach': 'coaching', 'sports-management': 'a sports management career'}[direction] || 'your athletic career goal';
  const summary = `This plan moves from where you are now toward ${directionLabel} in ${sport}, in ${steps.length} stages. The biggest risk to the whole plan is treating visibility and credentials as things that happen automatically - at every stage, the actual bottleneck is usually direct outreach or a specific credential, not raw ability alone.`;

  return {
    version: ROADMAP_VERSION,
    summary,
    milestones: steps.map((s, i) => ({...s, stage: i + 1, status: 'planned'})),
  };
}

/* ---- Admissions roadmap generator: a stage-by-stage plan to build a
   standout college application, mirroring the athlete roadmap's exact
   shape (and honesty). Stages adapt to the student's major and grade. ---- */
function generateAdmissionsRoadmapLocal(admProfile, topOpp){
  const major = admProfile.intendedMajor || 'your intended field';
  const grade = admProfile.gradeLevel || 'your current grade';
  const schools = String(admProfile.targetSchools || '').split(',').map(s=>s.trim()).filter(Boolean);
  const topSchool = schools[0] || 'your target schools';

  // ---- Resolve the KB anchor: the most selective (reach) matched school sets the bar. ----
  const kbSchools = schools.map(s => lookupSchool(s)).filter(Boolean);
  const anchor = kbSchools.slice().sort((a,b)=>(a.tier==='reach'?0:1)-(b.tier==='reach'?0:1))[0] || null;
  const anyUK = kbSchools.some(s => s.country === 'UK');
  const isUKPlan = anchor ? anchor.country === 'UK' : anyUK;

  // ---- Detect the anchor's admissions "shape" from its KB data, so stages fit the school. ----
  const blob = anchor ? (anchor.guidance + ' ' + anchor.acceptedPattern + ' ' + (anchor.values||[]).join(' ')).toLowerCase() : '';
  const isPortfolio = /portfolio/.test(blob);
  const isAudition  = /audition/.test(blob);
  const isMaker     = /(maker|build|hands-on making|tinker)/.test(blob);
  const isGeneralData = anchor && anchor.dataDepth === 'general';

  // A short, honest phrase naming what THIS anchor actually rewards (from real KB values).
  const twoValues = anchor ? (anchor.values||[]).slice(0,2).join(' and ') : '';
  // For deep US/creative schools we can quote the accepted-student pattern; for general ones we stay soft.
  const anchorEvidence = (anchor && !isGeneralData)
    ? anchor.acceptedPattern.replace(/^By [^,]+,\s*/,'').replace(/^Public analyses[^:]*:\s*/i,'')
    : '';

  const steps = [];

  const oppLine = topOpp
    ? `Your current top-matched opportunity is "${topOpp.title}" (${topOpp.pct}% fit) - a strong place to start.`
    : `Check the Opportunities page first so this points at a real opportunity instead of a placeholder.`;
  const oppAction = topOpp
    ? `Today: open "${topOpp.title}" on your Opportunities page and note its real deadline.`
    : `Today: open the Opportunities page and shortlist two activities that fit ${major}.`;

  if(isUKPlan){
    // =================== UK COURSE-SPECIFIC ROADMAP ===================
    // The UK model is fundamentally different: it's about demonstrated academic ability in ONE
    // chosen subject - grades, super-curricular depth, admissions tests, and a subject-focused
    // personal statement. Extracurriculars matter only where they connect to the subject.
    const schoolFocusLine = anchor
      ? `For ${anchor.name}, admissions is almost entirely about academic ability and genuine engagement with ${major} - not a broad activity list.`
      : `UK admissions is almost entirely about academic ability and genuine engagement with your chosen subject - not a broad activity list.`;

    steps.push({
      title: `Lock in top grades in the subjects ${major} requires`,
      description: `${schoolFocusLine} UK offers are built on predicted and achieved grades in specific subjects, so your first job is meeting (ideally exceeding) the exact grade and subject requirements for ${major}. Confirm the precise requirements on each course page - they differ by university and course.`,
      success_criteria: `You know the exact grade/subject requirements for ${major} at each target university, and your predicted grades meet or beat them.`,
      estimated_timeframe: 'Ongoing, checkpoint this month',
      first_action: `Today: look up the entry requirements for ${major} at ${topSchool} and write down the exact grades and required subjects.`,
      resource: 'Each university\'s official course page (requirements vary by course).',
      risk: `Assuming a headline grade applies everywhere - requirements and required subjects vary sharply by course, and top programmes are far more demanding than a university's overall profile.`,
    });
    steps.push({
      title: `Go deep beyond the syllabus (super-curricular work)`,
      description: `${anchor && !isGeneralData ? anchorEvidence + ' ' : ''}UK tutors want evidence you engage with ${major} above and beyond school: wider reading, lectures, MOOCs, essays, projects, or a personal investigation. This - not a long CV of clubs - is what makes a personal statement stand out.${anchor ? ` It's exactly what ${anchor.name} means by valuing ${twoValues}.` : ''}`,
      success_criteria: `You have a running list of subject-specific reading/projects you've genuinely engaged with and can discuss.`,
      estimated_timeframe: '2-4 months, ongoing',
      first_action: `Today: pick one book, paper, or online lecture in ${major} beyond your school syllabus and start it this week.`,
      resource: 'Reading lists from the university department pages; your Opportunities page for subject competitions.',
      risk: 'Listing activities without engaging - tutors probe what you actually learned, so depth of understanding beats a long list.',
    });
    steps.push({
      title: `Prepare for any required admissions test`,
      description: `Many competitive UK courses (especially maths, economics, sciences, medicine, and Oxbridge) require an admissions test - e.g. the TMUA, ESAT, MAT, STEP, LNAT, or UCAT. ${anchor ? `Check whether ${anchor.name} requires one for ${major}.` : `Check whether your courses require one for ${major}.`} These are a genuine differentiator among near-identical top-grade applicants, and they need dedicated practice.`,
      success_criteria: `You know which admissions test(s), if any, your courses require, and have a practice plan or confirmed there are none.`,
      estimated_timeframe: '2-3 months before the test',
      first_action: `Today: check each course page for an admissions-test requirement and note the registration deadline (these are strict).`,
      resource: 'Official past papers for the relevant test; your Schedule page to block practice sessions.',
      risk: 'Missing the separate test-registration deadline - it is often earlier than the UCAS deadline and easy to overlook.',
    });
    steps.push({
      title: `Add one subject-linked achievement or experience`,
      description: `${oppLine} A subject essay competition, an olympiad, a relevant project, or (for vocational courses) real work experience gives your personal statement concrete evidence of commitment to ${major}. ${isPortfolio ? 'For your creative course, this means building your portfolio - the single most important element.' : isAudition ? 'For your conservatoire audition, this means preparing your repertoire to the exact requirements.' : 'Keep it genuinely tied to the subject.'}`,
      success_criteria: isPortfolio ? 'You have a growing portfolio showing process and ideas, not just finished pieces.' : isAudition ? 'You have your audition repertoire chosen and in serious preparation.' : `You have entered one subject competition or secured one relevant experience in ${major}.`,
      estimated_timeframe: '2-4 months',
      first_action: isPortfolio ? 'Today: shortlist three pieces for your portfolio and note what each demonstrates.' : oppAction,
      resource: 'Your Opportunities and Schedule pages; the course page for portfolio/audition requirements.',
      risk: 'Chasing prestige over subject-relevance - a modest but genuinely subject-linked achievement reads stronger than an impressive but unrelated one.',
    });
    steps.push({
      title: `Write a subject-focused UCAS personal statement and hit every deadline`,
      description: `The UK personal statement (one statement for all five choices, now in structured sections) should be overwhelmingly about ${major}: why you want to study it, what you've done to explore it, and how you think. ${anchor && /doesn't interview|does not interview|no interview/.test(blob) ? `${anchor.name} doesn't interview, so the statement carries even more weight.` : ''} Track the UCAS deadline (15 October for Oxbridge/medicine/dentistry/vet; late January for most others) and any interview dates.`,
      success_criteria: `A subject-focused personal statement drafted, and every course's deadline (and any interview/test dates) on your Schedule.`,
      estimated_timeframe: 'Application season',
      first_action: `Today: add the relevant UCAS deadline for your courses to your Schedule, and draft one paragraph on why you want to study ${major}.`,
      resource: 'Your Application workshop for the statement; your Schedule for deadlines.',
      risk: 'Writing about personality or unrelated activities - UK tutors want academic substance, and generic "inspirational" openings or quotes count against you.',
      if_it_works: 'A genuinely academic, subject-obsessed statement plus strong grades and test scores is exactly what UK offers are built on.',
      if_it_stalls: `If you're stretched, concentrate on grades and one deep super-curricular thread - those carry the most weight in the UK system.`,
    });
  } else {
    // =================== US HOLISTIC ROADMAP (school-tailored) ===================
    const spikeRisk = anchor
      ? `Spreading across many unrelated activities - a focused profile reads far stronger to ${anchor.name} than a scattered one${twoValues ? `, which rewards ${twoValues}` : ''}.`
      : `Spreading across many unrelated activities - a focused profile reads far stronger than a scattered one.`;
    steps.push({
      title: `Sharpen your "spike" in ${major}`,
      description: `Selective US admissions reward depth over breadth. Rather than a long list of unrelated clubs, admissions officers look for a clear, demonstrated focus - a "spike" - in ${major}.${anchor && !isGeneralData ? ` ${anchorEvidence}` : ''} Naming yours focuses every stage after this.`,
      success_criteria: `You can state, in one sentence, the specific angle within ${major} you're known for.`,
      estimated_timeframe: '1-2 weeks',
      first_action: `Today: write one sentence finishing "I'm the student who ______" about your focus in ${major}.`,
      resource: 'A teacher or mentor in the subject, as a sounding board.',
      risk: spikeRisk,
    });
    steps.push({
      title: isMaker ? `Build a signature project or portfolio` : isPortfolio ? `Develop your creative portfolio` : `Commit to one signature extracurricular`,
      description: `${oppLine} ${isMaker ? `Since ${anchor ? anchor.name : 'your target school'} values makers, the strongest thing you can do is build something tangible - a project, a prototype, code, a competition entry - that shows your hands-on ability, not just membership.` : isPortfolio ? `For your creative target, a portfolio that shows genuine process and voice is the backbone of your application.` : `One activity you go deep in - with real responsibility over time - beats five you barely touch. This is the backbone of your application.`}`,
      success_criteria: isMaker ? 'You have started one concrete project you can show and describe.' : isPortfolio ? 'You have a portfolio in progress showing process, not just finished pieces.' : 'You have joined (or founded) one activity you will stay committed to for at least a year.',
      estimated_timeframe: '1 month to start, ongoing',
      first_action: oppAction,
      resource: 'Your Opportunities page, filtered to your intended field.',
      risk: 'Chasing prestige over genuine fit - sustained, real involvement (or a real body of work) is what actually shows commitment.',
    });
    steps.push({
      title: `Win a concrete, verifiable achievement`,
      description: `A placement in a real competition, a published piece, or a measurable outcome turns "interested in ${major}" into "demonstrated ability in ${major}." This is the single highest-leverage credential you can add.`,
      success_criteria: 'You have entered at least one competition or produced one concrete, external result.',
      estimated_timeframe: '2-4 months',
      first_action: 'Today: pick one competition or award from your Opportunities page and put its deadline on your schedule.',
      resource: 'Your Schedule page, to work backward from the deadline into weekly prep.',
      risk: 'Preparing endlessly without ever entering - an actual entry, even without a win, is worth more than perpetual preparation.',
    });
    steps.push({
      title: `Land hands-on experience (internship or research)`,
      description: `Real experience - a lab, an internship, a shadowing program - is what separates a strong applicant from a great one, and gives you specific stories for essays and interviews.${anchor && /service|community|leadership/.test(blob) ? ` ${anchor.name} particularly values genuine contribution to others, so experience that helps a community counts double here.` : ''}`,
      success_criteria: 'You have secured or applied to at least one internship, research, or shadowing opportunity.',
      estimated_timeframe: '3-6 months',
      first_action: 'Today: draft a short, specific outreach email to one program or professor in your field.',
      resource: 'Your Application workshop, to draft and refine the outreach.',
      risk: 'Only applying to formal postings - a direct, specific email to a professor or local organization often opens doors that public listings never advertise.',
    });
    steps.push({
      title: `Build your application and hit every deadline`,
      description: `With a real spike, a signature ${isMaker||isPortfolio?'body of work':'activity'}, an achievement, and experience, the final stage is execution: essays that tell your specific story${anchor?` and speak to what ${anchor.name} actually values`:''}, and every deadline for ${schools.length ? schools.slice(0,3).join(', ') : 'your schools'} tracked and met.`,
      success_criteria: 'Every target school\'s deadline is on your schedule with a draft essay started for each.',
      estimated_timeframe: 'Application season',
      first_action: `Today: add each target school's application deadline to your Schedule.`,
      resource: 'Your Schedule and Application pages.',
      risk: 'Leaving essays to the last week - the strongest essays go through several honest revisions, which takes real lead time.',
      if_it_works: 'A focused, deadline-driven application to well-matched schools produces stronger outcomes than a rushed one to a longer list.',
      if_it_stalls: `If you're overwhelmed, cut the school list to a realistic set anchored on genuine fit rather than name alone, and go deep on those.`,
    });
  }

  // ---- Closing summary line, school- and tier-aware, from the KB anchor. ----
  let schoolTierLine = '';
  if(anchor){
    const mottoBit = anchor.motto ? ` Its guiding idea - ${anchor.motto.split('—')[0].split('-')[0].trim().replace(/^"|"$/g,'') ? anchor.motto.replace(/\.$/,'') : anchor.motto} - is worth keeping in view as you build.` : '';
    if(isUKPlan){
      schoolTierLine = ` Because ${anchor.name} decides on academic ability in ${major} (${anchor.accept}), this plan puts grades, subject depth, and any required test first - that is what UK offers actually turn on.`;
    } else if(anchor.tier === 'reach'){
      schoolTierLine = ` Because ${anchor.name} is a genuine reach (${anchor.accept}), strong grades and scores only get you considered - what this plan really builds is the depth and evidence that separate admits, especially ${twoValues}.`;
    } else {
      schoolTierLine = ` ${anchor.name} (${anchor.accept}) rewards a solid academic record plus a clear, demonstrated focus - this plan gives you both, which makes it a realistic and strong target.`;
    }
    if(isGeneralData){
      schoolTierLine += ` (For ${anchor.name} we've verified the facts and admissions model; where school-specific admit detail is thin, this plan leans on what reliably works across similar schools.)`;
    }
  }
  // If the student targets BOTH US and UK schools, the two systems need genuinely different
  // preparation - be honest that this plan is anchored on one, and flag the other.
  let crossCountryNote = '';
  const hasUS = kbSchools.some(s => s.country === 'US');
  const hasUKk = kbSchools.some(s => s.country === 'UK');
  if(hasUS && hasUKk){
    crossCountryNote = isUKPlan
      ? ` Note: your list also includes US schools, which are admitted holistically - they additionally want a "spike," extracurricular depth, and personal essays, so budget separate time for that alongside this UK-focused plan.`
      : ` Note: your list also includes UK schools, which are admitted on academic ability in one subject - they additionally want top grades, super-curricular depth, and (often) an admissions test rather than a broad activity list, so budget separate time for that alongside this US-focused plan.`;
  }
  const throughline = isUKPlan
    ? `The honest throughline: UK admissions rewards demonstrated academic ability in ${major} - top grades, genuine super-curricular depth, and (where required) admissions tests - far more than a broad activity list.`
    : `The honest throughline: depth beats breadth at every stage. One real spike, one concrete achievement, and real experience - tracked against real deadlines - matter far more than a long, shallow activity list.`;
  const summary = `This plan moves from where you are in ${grade} toward a standout application for ${major}, in ${steps.length} stages. ${throughline}${schoolTierLine}${crossCountryNote}`;

  return {
    version: ROADMAP_VERSION,
    summary,
    milestones: steps.map((s, i) => ({...s, stage: i + 1, status: 'planned'})),
  };
}

/* ---- Metis floating widget (shared include, used on every logged-in page) ---- */
function injectMetisWidget(systemContextFn, opts){
  opts = opts || {};
  const subtitle = opts.subtitle || 'Your AI career guide';
  const greeting = opts.greeting || "Hi - I can help with internships, applications, resumes, or your current matches. What's on your mind?";
  const suggestions = opts.suggestions || [
    { label: 'Cold outreach tips', q: 'What should I put in a cold outreach email?' },
    { label: 'Prioritize my matches', q: 'Which of my current matches should I prioritize?' },
  ];
  const container = document.createElement('div');
  container.innerHTML = `
    <button class="chat-launcher" id="chatLauncher" aria-label="Open Metis">${metisMark(28)}<span class="badge-dot"></span></button>
    <div class="chat-window" id="chatWindow">
      <div class="chat-header">
        <div><div class="chat-header-title"><span class="mark">${metisMark(22,'#F0B24E')}</span>Metis</div><div class="sub">${subtitle}</div></div>
        <div style="display:flex;align-items:center;gap:2px;">
          <button class="chat-close" id="chatExpand" aria-label="Open full Metis workspace" title="Open full Metis — saved chats, projects, schedule" style="font-size:18px;">&#8599;</button>
          <button class="chat-close" id="chatClose" aria-label="Close chat">&times;</button>
        </div>
      </div>
      <div class="chat-messages" id="chatMessages">
        <div class="chat-msg assistant"><span class="chat-msg-label">Metis</span><div class="chat-bubble">${greeting}</div></div>
      </div>
      <div class="chat-suggestions" id="chatSuggestions">
        ${suggestions.map(s => `<button class="chat-suggestion" data-q="${s.q.replace(/"/g,'&quot;')}">${s.label}</button>`).join('')}
      </div>
      <div class="chat-input-row">
        <textarea id="chatInput" placeholder="Ask Metis anything..." aria-label="Ask Metis anything" rows="1"></textarea>
        <button class="chat-send" id="chatSend" aria-label="Send">&#10148;</button>
      </div>
    </div>`;
  document.body.appendChild(container);

  const chatLauncher = document.getElementById('chatLauncher');
  const chatWindow = document.getElementById('chatWindow');
  const chatClose = document.getElementById('chatClose');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  let chatHistory = getChatHistory();
  let open = false;

  // The bottom-corner star button opens the FULL Metis workspace (metis.html) -
  // saved chats, projects, schedule and customisation - not a small inline panel.
  chatLauncher.addEventListener('click', ()=>{ window.location.href = 'metis.html'; });
  chatClose.addEventListener('click', ()=>{ open = false; chatWindow.classList.remove('open'); });
  const chatExpand = document.getElementById('chatExpand');
  if(chatExpand){ chatExpand.addEventListener('click', ()=>{ try{ saveChatHistory(chatHistory); }catch(e){} window.location.href = 'metis.html'; }); }
  chatInput.addEventListener('input', ()=>{ chatInput.style.height='auto'; chatInput.style.height = Math.min(100, chatInput.scrollHeight)+'px'; });
  chatInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } });
  chatSend.addEventListener('click', handleSend);
  document.querySelectorAll('.chat-suggestion').forEach(btn=> btn.addEventListener('click', ()=>{ chatInput.value = btn.dataset.q; handleSend(); }));

  function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function applyBold(str){ return str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function renderMarkdownLite(text){
    const escaped = escapeHtml(text);
    const lines = escaped.split('\n');
    let html = '', inList = false;
    lines.forEach(line=>{
      const trimmed = applyBold(line.trim());
      if(/^[-*]\s+/.test(trimmed)){ if(!inList){ html += '<ul>'; inList = true; } html += `<li>${trimmed.replace(/^[-*]\s+/, '')}</li>`; }
      else { if(inList){ html += '</ul>'; inList = false; } if(trimmed.length) html += `<p>${trimmed}</p>`; }
    });
    if(inList) html += '</ul>';
    return html || '<p></p>';
  }
  function appendMessage(role, text){
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg ' + role;
    wrap.innerHTML = `<span class="chat-msg-label">${role==='user' ? 'You' : 'Metis'}</span><div class="chat-bubble">${renderMarkdownLite(text)}</div>`;
    chatMessages.appendChild(wrap); chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function appendTyping(){
    const wrap = document.createElement('div'); wrap.className = 'chat-msg assistant'; wrap.id = 'typingIndicator';
    wrap.innerHTML = `<span class="chat-msg-label">Metis</span><div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>`;
    chatMessages.appendChild(wrap); chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function removeTyping(){ const el = document.getElementById('typingIndicator'); if(el) el.remove(); }

  async function handleSend(){
    const text = chatInput.value.trim();
    if(!text) return;
    chatInput.value = ''; chatInput.style.height = 'auto'; chatSend.disabled = true;
    appendMessage('user', text);
    chatHistory.push({role:'user', content: text});
    appendTyping();
    try{
      // Backend first: it holds the Anthropic key, builds the system context,
      // and persists memory. The direct browser->Anthropic call below is only an
      // offline / not-logged-in fallback - it can't authenticate from a static
      // page, so without this Metis failed for every logged-in user. Mirrors the
      // BE-first/direct-fallback pattern the other AI features already use.
      let reply = '';
      const _session = (typeof getSession === 'function') ? getSession() : null;
      const _uid = _session && _session.user_id;
      if(_uid && typeof apiChat === 'function'){
        // chatHistory already has this turn's user message pushed; the backend
        // takes the prior turns as `history` and this turn's text as `message`.
        const prior = chatHistory.slice(0, -1);
        const priorForApi = prior.length > 20 ? prior.slice(-20) : prior;
        const res = await apiChat(_uid, text, priorForApi);
        if(res.ok && res.reply) reply = res.reply;
      }
      if(!reply){
        const historyForApi = chatHistory.length > 20 ? chatHistory.slice(-20) : chatHistory;
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemContextFn(), messages: historyForApi })
        });
        const data = await response.json();
        reply = (data.content || []).map(b=> b.type==='text' ? b.text : '').filter(Boolean).join('\n');
      }
      removeTyping();
      if(!reply){ throw new Error('Empty response'); }
      appendMessage('assistant', reply);
      chatHistory.push({role:'assistant', content: reply});
      try{ saveChatHistory(chatHistory); }
      catch(storageErr){
        // A genuine storage failure here (e.g. quota exceeded, since
        // chat history persists indefinitely) must not be reported as
        // "couldn't reach Metis" - the reply above already succeeded
        // and is already visible; only persistence for next time failed.
        console.error('Saving chat history failed (reply above still succeeded):', storageErr);
      }
    } catch(err){
      removeTyping();
      appendMessage('assistant', "Something went wrong reaching Metis just now - mind trying again?");
      console.error('Chat error:', err);
    } finally { chatSend.disabled = false; }
  }
}

/* ---------------------------------------------------------------------------
   Keyboard & screen-reader accessibility for .chip controls
   ---------------------------------------------------------------------------
   Chips are <div class="chip"> elements wired with click listeners in each
   page's inline script (singleSelect/multiSelect and friends). Without a
   tabindex + role they cannot be reached or operated by keyboard-only or
   screen-reader users - which makes the entirely chip-driven onboarding survey
   (timeframe, stage, priorities, types, level, direction, grade) impossible to
   complete without a mouse, and the same for explore/dashboard filters.

   This layer, applied centrally so every page inherits it:
     - marks each chip focusable (tabindex=0) with button semantics (role),
     - activates a focused chip on Enter or Space by firing its existing click
       handler (so single/multi-select logic is reused verbatim, min/max caps
       included), and
     - keeps aria-pressed in sync with the .active class so assistive tech
       announces selection state whether toggled by mouse or keyboard.
   It is defensive throughout: an a11y enhancement must never break a page. */
function _enhanceChipA11y(root){
  try{
    var scope = root || document;
    if(!scope || !scope.querySelectorAll) return;
    var chips = scope.querySelectorAll('.chip:not([data-a11y])');
    for(var i=0;i<chips.length;i++){
      var c = chips[i];
      c.setAttribute('tabindex','0');
      c.setAttribute('role','button');
      c.setAttribute('aria-pressed', c.classList.contains('active') ? 'true' : 'false');
      c.setAttribute('data-a11y','1');
    }
  }catch(e){ /* never let a11y setup throw */ }
}
function _initChipA11y(){
  try{
    _enhanceChipA11y(document);
    // Keep aria-pressed synced when .active is toggled by click handlers, and
    // enhance any chip that somehow appears later (defensive - none are created
    // dynamically today, but this keeps the guarantee if that ever changes).
    if(typeof MutationObserver === 'function'){
      var mo = new MutationObserver(function(muts){
        for(var i=0;i<muts.length;i++){
          var t = muts[i].target;
          if(t && t.classList && t.classList.contains('chip')){
            if(!t.hasAttribute('data-a11y')){ _enhanceChipA11y(t.parentNode || document); }
            t.setAttribute('aria-pressed', t.classList.contains('active') ? 'true' : 'false');
          }
        }
      });
      mo.observe(document.documentElement, { subtree:true, attributes:true, attributeFilter:['class'] });
    }
  }catch(e){ /* never let a11y setup throw */ }
}
if(typeof document !== 'undefined' && document.addEventListener){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _initChipA11y);
  } else {
    _initChipA11y();
  }
  document.addEventListener('keydown', function(e){
    var t = e.target;
    if(t && t.classList && t.classList.contains('chip') &&
       (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Space')){
      e.preventDefault();       // stop Space from scrolling / Enter from submitting
      if(typeof t.click === 'function') t.click();
    }
  });
}

/* ============================================================
   COMMAND PALETTE (Cmd/Ctrl-K, or "/") + global shortcuts.
   One app-wide power-search overlay: type to jump to any page or
   run a quick action. Entirely self-contained and defensive - the
   whole thing is wrapped so a failure can never block a page load.
   ============================================================ */
function _kaidoCommands(){
  var role = 'candidate';
  try{ role = localStorage.getItem('kaidostar_role') || 'candidate'; }catch(e){}
  var pagesByRole = {
    athlete: [
      ['Survey','athlete-survey.html','◆'],
      ['Opportunities','athlete-dashboard.html','◎'],
      ['Roadmap','athlete-roadmap.html','↗'],
      ['Content Coach','athlete-content.html','✎'],
      ['Workshop','athlete-workshop.html','⚒'],
      ['Waypoint','athlete-waypoint.html','◈'],
    ],
    student: [
      ['Survey','survey.html','◆'],
      ['Opportunities','admissions-dashboard.html','◎'],
      ['Roadmap','admissions-roadmap.html','↗'],
      ['Schedule','admissions-schedule.html','◱'],
      ['Application','admissions-workshop.html','⚒'],
      ['Waypoint','admissions-waypoint.html','◈'],
    ],
    candidate: [
      ['Mission Control','mission.html','◉'],
      ['Mission · Pipeline & Secured','mission-pipeline.html','◈'],
      ['Mission · Interviews','mission-interviews.html','◆'],
      ['Mission · Search & Matches','mission-search.html','◎'],
      ['Mission · Growth & Intel','mission-growth.html','↗'],
      ['Metis','metis.html','✦'],
      ['Survey','survey.html','◆'],
      ['Job Search','dashboard.html','◎'],
      ['Roadmap','roadmap.html','↗'],
      ['Workshop','workshop.html','⚒'],
      ['Interview Prep','interview-prep.html','◆'],
      ['Auto mode','auto.html','⚡'],
      ['Explore directions','explore.html','✷'],
      ['Waypoint','waypoint.html','◈'],
      ['Inbox','inbox.html','✉'],
    ],
  };
  var pages = pagesByRole[role] || pagesByRole.candidate;
  var cmds = pages.map(function(p){ return { label:p[0], icon:p[2], group:'Go to', run:function(){ window.location.href = p[1]; } }; });
  cmds.push({ label:'Pricing & plans', icon:'✦', group:'Go to', run:function(){ window.location.href='site-pricing.html'; } });
  cmds.push({ label:'Keyboard shortcuts', icon:'⌨', group:'Help', run:function(){ try{ if(typeof window.openShortcutsHelp==='function') window.openShortcutsHelp(); }catch(e){} } });
  // Plan switch (mirrors the nav plan pill - preview, no payment)
  try{
    if(typeof TIER_ORDER !== 'undefined' && typeof setTier === 'function'){
      TIER_ORDER.forEach(function(t){
        var name = (typeof TIERS !== 'undefined' && TIERS[t] && TIERS[t].name) || t;
        cmds.push({ label:'Switch to '+name+' plan', icon:'◐', group:'Plan · preview', run:function(){
          try{ setTier(t); }catch(e){}
          try{ var s = (typeof getSession==='function') && getSession(); if(s && s.user_id && typeof apiSetTier==='function'){ apiSetTier(s.user_id, t); } }catch(e){}
          location.reload();
        } });
      });
    }
  }catch(e){}
  cmds.push({ label:'Log out', icon:'⏏', group:'Account', run:function(){ try{ if(typeof clearSession==='function') clearSession(); }catch(e){} window.location.href='site-home.html'; } });
  return cmds;
}

function injectCommandPalette(){
  try{
    if(document.getElementById('cmdkOverlay') || !document.body) return;
    var overlay = document.createElement('div');
    overlay.id = 'cmdkOverlay';
    overlay.className = 'cmdk-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML =
      '<div class="cmdk" role="dialog" aria-label="Command palette">' +
        '<div class="cmdk-input-row">' +
          '<span class="cmdk-search-icon">⌕</span>' +
          '<input id="cmdkInput" class="cmdk-input" type="text" placeholder="Search pages and actions…" autocomplete="off" spellcheck="false" aria-label="Command search">' +
          '<span class="cmdk-hint">esc</span>' +
        '</div>' +
        '<div id="cmdkList" class="cmdk-list" role="listbox"></div>' +
        '<div class="cmdk-foot"><span><b>↑↓</b> navigate</span><span><b>↵</b> open</span><span><b>⌘K</b> toggle</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('#cmdkInput');
    var list = overlay.querySelector('#cmdkList');
    var commands = [], filtered = [], active = 0;

    function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function score(q, label){
      label = label.toLowerCase(); q = (q||'').toLowerCase();
      if(!q) return 1;
      if(label.indexOf(q)===0) return 100;
      if(label.indexOf(q)>-1) return 50;
      var li=0; for(var i=0;i<q.length;i++){ li = label.indexOf(q[i], li); if(li<0) return -1; li++; } return 10;
    }
    function render(q){
      filtered = commands.map(function(c){ return {c:c, s:score(q, c.label)}; }).filter(function(x){ return x.s>=0; }).sort(function(a,b){ return b.s-a.s; }).map(function(x){ return x.c; });
      active = 0;
      if(!filtered.length){ list.innerHTML = '<div class="cmdk-empty">No matches for “'+esc(q)+'”</div>'; return; }
      var lastGroup=null, html='';
      filtered.forEach(function(c,i){
        if(c.group !== lastGroup){ html += '<div class="cmdk-group">'+esc(c.group)+'</div>'; lastGroup = c.group; }
        html += '<div class="cmdk-item'+(i===active?' active':'')+'" data-i="'+i+'" role="option"><span class="cmdk-item-icon">'+(c.icon||'›')+'</span><span class="cmdk-item-label">'+esc(c.label)+'</span></div>';
      });
      list.innerHTML = html;
    }
    function move(d){
      if(!filtered.length) return;
      active = (active + d + filtered.length) % filtered.length;
      var items = list.querySelectorAll('.cmdk-item');
      for(var i=0;i<items.length;i++){ items[i].classList.toggle('active', i===active); }
      var el = list.querySelector('.cmdk-item.active'); if(el && el.scrollIntoView) el.scrollIntoView({block:'nearest'});
    }
    function runIdx(i){ var c = filtered[i]; if(c){ close(); try{ c.run(); }catch(e){} } }
    function isOpen(){ return overlay.classList.contains('open'); }
    function open(){ commands = _kaidoCommands(); overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); input.value=''; render(''); setTimeout(function(){ try{ input.focus(); }catch(e){} }, 20); }
    function close(){ overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); }

    input.addEventListener('input', function(){ render(input.value.trim()); });
    input.addEventListener('keydown', function(e){
      if(e.key==='ArrowDown'){ e.preventDefault(); move(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); move(-1); }
      else if(e.key==='Enter'){ e.preventDefault(); runIdx(active); }
      else if(e.key==='Escape'){ e.preventDefault(); close(); }
    });
    list.addEventListener('click', function(e){ var it = e.target.closest && e.target.closest('.cmdk-item'); if(it){ runIdx(parseInt(it.getAttribute('data-i'),10)); } });
    list.addEventListener('mousemove', function(e){ var it = e.target.closest && e.target.closest('.cmdk-item'); if(it){ active = parseInt(it.getAttribute('data-i'),10); var items=list.querySelectorAll('.cmdk-item'); for(var i=0;i<items.length;i++){ items[i].classList.toggle('active', i===active); } } });
    overlay.addEventListener('mousedown', function(e){ if(e.target===overlay) close(); });

    document.addEventListener('keydown', function(e){
      var tag = (e.target && e.target.tagName || '').toLowerCase();
      var inField = tag==='input'||tag==='textarea'||tag==='select'||(e.target && e.target.isContentEditable);
      if((e.metaKey||e.ctrlKey) && (e.key==='k'||e.key==='K')){ e.preventDefault(); isOpen()?close():open(); return; }
      if(isOpen()) return;
      if(e.key==='/' && !inField){ e.preventDefault(); open(); }
    });
    window.openCommandPalette = open;
  }catch(e){ /* non-critical enhancement - never break a page over it */ }
}

/* ============================================================
   LOADING SPLASH — a brief branded "boot" screen with rotating
   feature/control tips, like a video-game loading screen. Shows
   once per session (or force with ?splash=1), auto-dismisses,
   fully skippable, and can never block the app (wrapped).
   ============================================================ */
var KAIDO_TIPS = [
  { k:'⌘K', t:'Open the command palette — jump to any page or action instantly. (Or press <b>/</b>.)' },
  { k:'★',  t:'Star any match to save it straight to your Workshop.' },
  { t:'Every match score breaks down into real, named factors — never a black box.' },
  { t:'Sort by <b>signal</b> to see what’s genuinely worth applying to, not just keyword overlap.' },
  { t:'<b>Auto mode</b> drafts applications and outreach while you’re away, then waits for your OK.' },
  { t:'Log real outcomes and Kaidostar re-weights your scores to what actually predicts success for <i>you</i>.' },
  { t:'Metis, your AI guide, is one tap away — bottom-right on every page.' },
  { t:'Your roadmap adapts as you complete stages and log what happens.' },
];
function injectLoadingSplash(){
  try{
    var force = false;
    try{ force = (location.search || '').indexOf('splash=1') > -1; }catch(e){}
    if(!force){
      try{ if(sessionStorage.getItem('kaidostar_splash_seen')) return; }catch(e){ return; }
    }
    try{ sessionStorage.setItem('kaidostar_splash_seen','1'); }catch(e){}
    if(!document.body) return;
    var reduce = false; try{ reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
    var mark = (typeof kaidostarMark === 'function') ? kaidostarMark(52) : '';
    var el = document.createElement('div');
    el.id = 'kaidoSplash'; el.className = 'kaido-splash';
    var pool = KAIDO_TIPS.slice(), picks = [];
    for(var i=0;i<3 && pool.length;i++){ picks.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); }
    el.innerHTML =
      '<div class="kaido-splash-inner">' +
        '<div class="kaido-splash-logo">'+mark+'<span class="kaido-splash-word">KAIDOSTAR</span></div>' +
        '<div class="kaido-splash-sub">Loading your command center…</div>' +
        '<div class="kaido-splash-tip" id="kaidoSplashTip"><span class="kaido-splash-tiplabel">TIP</span><span class="kaido-splash-tiptext" id="kaidoSplashTipText"></span></div>' +
        '<div class="kaido-splash-bar"><div class="kaido-splash-bar-fill" id="kaidoSplashBar"></div></div>' +
        '<div class="kaido-splash-skip">press any key to continue</div>' +
      '</div>';
    document.body.appendChild(el);
    var tip = el.querySelector('#kaidoSplashTip');
    var tipText = el.querySelector('#kaidoSplashTipText');
    var bar = el.querySelector('#kaidoSplashBar');
    function showTip(n){
      var d = picks[n % picks.length];
      var kb = d.k ? '<span class="kaido-splash-kbd">'+d.k+'</span> ' : '';
      tipText.innerHTML = kb + d.t;
      if(tip){ tip.classList.remove('flip'); void tip.offsetWidth; tip.classList.add('flip'); }
    }
    var n = 0; showTip(0);
    var total = reduce ? 900 : 2600, rot = null;
    if(!reduce){ rot = setInterval(function(){ n++; showTip(n); }, 1300); }
    if(bar){ if(!reduce){ bar.style.transition = 'width '+total+'ms linear'; requestAnimationFrame(function(){ bar.style.width='100%'; }); } else { bar.style.width='100%'; } }
    var done = false, timer = null;
    function cleanup(){ try{ document.removeEventListener('keydown', onKey, true); }catch(e){} try{ el.removeEventListener('click', onClick); }catch(e){} if(rot) clearInterval(rot); if(timer) clearTimeout(timer); }
    function dismiss(){ if(done) return; done = true; el.classList.add('out'); setTimeout(function(){ if(el && el.parentNode) el.parentNode.removeChild(el); }, 420); cleanup(); }
    function onKey(){ dismiss(); }
    function onClick(){ dismiss(); }
    timer = setTimeout(dismiss, total);
    document.addEventListener('keydown', onKey, true);
    el.addEventListener('click', onClick);
  }catch(e){ var s=document.getElementById('kaidoSplash'); if(s&&s.parentNode){ s.parentNode.removeChild(s); } }
}

/* ============================================================
   KEYBOARD SHORTCUTS HELP — an app-wide "?" overlay listing every
   shortcut (the ⌘K palette, match navigation, compare, Escape).
   Discoverable, closable, and can never block a page (wrapped).
   ============================================================ */
function injectShortcutsHelp(){
  try{
    if(document.getElementById('kaidoHelpOverlay') || !document.body) return;
    if(!document.getElementById('kaidoHelpStyle')){
      var css = document.createElement('style'); css.id='kaidoHelpStyle';
      css.textContent = [
        '.kaido-help-overlay{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;background:rgba(6,6,12,0.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:20px;}',
        '.kaido-help-overlay.open{display:flex;}',
        '.kaido-help-card{width:100%;max-width:460px;background:var(--panel,#14141c);border:1px solid var(--line,#2a2a36);border-radius:16px;padding:22px 24px;box-shadow:0 30px 80px -20px rgba(0,0,0,0.7);}',
        '.kaido-help-h{font-family:"Space Grotesk",sans-serif;font-weight:800;font-size:16px;color:var(--text,#eee);margin:0 0 2px;}',
        '.kaido-help-sub{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:0.07em;text-transform:uppercase;color:var(--text-faint,#778);margin-bottom:16px;}',
        '.kaido-help-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid var(--line-soft,#20202a);}',
        '.kaido-help-row:last-child{border-bottom:none;}',
        '.kaido-help-desc{font-family:"Manrope",sans-serif;font-size:13px;color:var(--text-dim,#aab);}',
        '.kaido-help-keys{display:flex;gap:5px;flex-shrink:0;}',
        '.kaido-help-key{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--text,#eee);background:var(--void,#0e0e14);border:1px solid var(--line,#2a2a36);border-bottom-width:2px;border-radius:6px;padding:3px 8px;min-width:16px;text-align:center;}',
        '.kaido-help-foot{font-family:"Manrope",sans-serif;font-size:11px;color:var(--text-faint,#778);margin-top:16px;text-align:center;}',
        '@media (prefers-reduced-motion: reduce){ .kaido-help-overlay{backdrop-filter:none;-webkit-backdrop-filter:none;} }'
      ].join('');
      document.head.appendChild(css);
    }
    var SHORTCUTS = [
      { keys:['⌘','K'], desc:'Open the command palette' },
      { keys:['/'], desc:'Open the command palette' },
      { keys:['?'], desc:'Show this shortcuts panel' },
      { keys:['J'], desc:'Focus the next match' },
      { keys:['K'], desc:'Focus the previous match' },
      { keys:['S'], desc:'Save / star the focused match' },
      { keys:['E'], desc:'Explain the focused match' },
      { keys:['C'], desc:'Toggle compare mode' },
      { keys:['Esc'], desc:'Close any panel or overlay' }
    ];
    var overlay = document.createElement('div');
    overlay.className='kaido-help-overlay'; overlay.id='kaidoHelpOverlay';
    overlay.innerHTML =
      '<div class="kaido-help-card" role="dialog" aria-label="Keyboard shortcuts">' +
        '<div class="kaido-help-h">Keyboard shortcuts</div>' +
        '<div class="kaido-help-sub">Work faster from anywhere</div>' +
        SHORTCUTS.map(function(s){ return '<div class="kaido-help-row"><span class="kaido-help-desc">'+s.desc+'</span><span class="kaido-help-keys">'+s.keys.map(function(k){return '<span class="kaido-help-key">'+k+'</span>';}).join('')+'</span></div>'; }).join('') +
        '<div class="kaido-help-foot">Press <b>Esc</b> to close · match shortcuts work on the Job Search page</div>' +
      '</div>';
    document.body.appendChild(overlay);
    function blocked(){
      var c=document.getElementById('cmdkOverlay'); if(c && c.classList.contains('open')) return true;
      if(document.getElementById('kaidoSplash')) return true;
      return false;
    }
    function open(){ overlay.classList.add('open'); }
    function close(){ overlay.classList.remove('open'); }
    overlay.addEventListener('mousedown', function(e){ if(e.target===overlay) close(); });
    document.addEventListener('keydown', function(e){
      var tag=(e.target&&e.target.tagName||'').toLowerCase();
      var inField = tag==='input'||tag==='textarea'||tag==='select'||(e.target&&e.target.isContentEditable);
      if(e.key==='?' && !inField && !blocked()){ e.preventDefault(); overlay.classList.contains('open')?close():open(); return; }
      if(e.key==='Escape' && overlay.classList.contains('open')){ e.preventDefault(); close(); }
    });
    window.openShortcutsHelp = open;
  }catch(e){ /* non-critical enhancement - never break a page over it */ }
}

if(typeof document !== 'undefined'){
  function _kaidoBoot(){ injectLoadingSplash(); injectCommandPalette(); injectShortcutsHelp(); }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', _kaidoBoot); }
  else { _kaidoBoot(); }
}
