/* =========================================================================
   MISSION CONTROL — shared engine for the 5-page command centre.
   Pages: Command · Pipeline & Secured · Interviews · Search & Matches ·
          Growth & Intelligence. Each page is a thin shell that calls
          MISSION.page('<key>'); this file gathers all the real data once,
          renders that page's dense panel set, and adds a Metis Pilot at the
          bottom that simplifies the page into key points (instant, grounded
          in real numbers) with an AI "go deeper" read-out on demand.

   Depends on api.js, state.js, charts.js already being loaded.
   ========================================================================= */
(function(){
  var MISSION = {};
  var SUBNAV = [
    { id:'command',    label:'Command',        href:'mission.html' },
    { id:'pipeline',   label:'Pipeline & Secured', href:'mission-pipeline.html' },
    { id:'interviews', label:'Interviews',     href:'mission-interviews.html' },
    { id:'search',     label:'Search & Matches', href:'mission-search.html' },
    { id:'growth',     label:'Growth & Intel', href:'mission-growth.html' },
  ];

  function esc(s){ var d=document.createElement('div'); d.textContent=String(s==null?'':s); return d.innerHTML; }
  function pct(n){ return Math.max(0, Math.min(100, Math.round(n||0))); }
  function num(n){ return (n==null||isNaN(n))?0:n; }
  function rate(a,b){ return b>0 ? Math.round((a/b)*100) : 0; }

  // ------------------------------------------------------------------ styles
  function injectCss(){
    if(document.getElementById('missionCss')) return;
    var css = `
    .mc-subnav{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 22px; border-bottom:1px solid var(--line,#2a2a36); padding-bottom:14px; }
    .mc-tab{ font-family:'Manrope',sans-serif; font-size:13px; font-weight:600; color:var(--text-dim,#aab); text-decoration:none; padding:8px 14px; border-radius:9px; border:1px solid transparent; white-space:nowrap; }
    .mc-tab:hover{ color:var(--text,#eee); background:var(--void,#0e0e14); }
    .mc-tab.active{ color:#0b0b0f; background:var(--gold,#F0B24E); }
    .mc-kpis{ display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:24px; }
    .mc-kpi{ background:var(--surface,#16161f); border:1px solid var(--line,#2a2a36); border-radius:14px; padding:15px 16px; position:relative; overflow:hidden; }
    .mc-kpi .n{ font-family:'Space Grotesk',sans-serif; font-weight:800; font-size:28px; line-height:1; color:var(--text,#eee); }
    .mc-kpi .l{ font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--text-faint,#778); margin-top:7px; }
    .mc-kpi .d{ font-family:'Manrope',sans-serif; font-size:11px; color:var(--text-dim,#99a); margin-top:5px; }
    .mc-kpi.good .n{ color:var(--aurora,#40C0A0); } .mc-kpi.warn .n{ color:var(--gold,#F0B24E); } .mc-kpi.bad .n{ color:var(--danger,#D65A5A); }
    .mc-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px; margin-bottom:16px; align-items:start; }
    .mc-grid.wide{ grid-template-columns:repeat(auto-fit,minmax(440px,1fr)); }
    .mc-panel{ background:var(--surface,#16161f); border:1px solid var(--line,#2a2a36); border-radius:14px; padding:18px 20px; }
    .mc-panel.span2{ grid-column:1/-1; }
    .mc-panel h3{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:15px; color:var(--text,#eee); margin:0 0 3px; }
    .mc-panel .sub{ font-family:'Manrope',sans-serif; font-size:12px; color:var(--text-faint,#778); margin-bottom:14px; line-height:1.45; }
    .mc-bars{ display:flex; flex-direction:column; gap:11px; }
    .mc-bar-head{ display:flex; justify-content:space-between; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--text-dim,#aab); margin-bottom:5px; }
    .mc-bar-track{ height:8px; background:var(--void,#0e0e14); border-radius:999px; overflow:hidden; }
    .mc-bar-fill{ height:100%; border-radius:999px; transition:width .7s cubic-bezier(.2,.8,.2,1); }
    .mc-funnel{ display:flex; flex-direction:column; gap:8px; }
    .mc-frow{ display:grid; grid-template-columns:130px 1fr 46px; align-items:center; gap:10px; }
    .mc-flabel{ font-family:'Manrope',sans-serif; font-size:12.5px; color:var(--text-dim,#aab); }
    .mc-ftrack{ height:22px; background:var(--void,#0e0e14); border-radius:7px; overflow:hidden; }
    .mc-ffill{ height:100%; border-radius:7px; display:flex; align-items:center; }
    .mc-fval{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--text,#eee); text-align:right; }
    .mc-list{ display:flex; flex-direction:column; }
    .mc-lrow{ display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--line,#2a2a36); }
    .mc-lrow:last-child{ border-bottom:none; }
    .mc-lmain{ flex:1; min-width:0; }
    .mc-ltitle{ font-family:'Manrope',sans-serif; font-size:13px; color:var(--text,#eee); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .mc-lmeta{ font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--text-faint,#778); margin-top:2px; }
    .mc-pill{ font-family:'JetBrains Mono',monospace; font-size:10px; padding:3px 8px; border-radius:999px; white-space:nowrap; }
    .mc-tags{ display:flex; flex-wrap:wrap; gap:7px; }
    .mc-tag{ font-family:'Manrope',sans-serif; font-size:12px; color:var(--text-dim,#aab); background:var(--void,#0e0e14); border:1px solid var(--line,#2a2a36); border-radius:999px; padding:5px 11px; }
    .mc-tag b{ color:var(--gold,#F0B24E); }
    .mc-empty{ font-family:'Manrope',sans-serif; font-size:12.5px; color:var(--text-faint,#778); line-height:1.55; }
    .mc-empty a{ color:var(--gold,#F0B24E); }
    .mc-big{ font-family:'Space Grotesk',sans-serif; font-weight:800; font-size:40px; color:var(--text,#eee); line-height:1; }
    .mc-note{ font-family:'Manrope',sans-serif; font-size:12px; color:var(--text-dim,#99a); line-height:1.55; margin-top:8px; }
    .mc-shortcut{ display:block; text-decoration:none; }
    .mc-shortcut:hover .mc-panel{ border-color:var(--comet,#8B7CF6); }
    /* Metis Pilot */
    .mc-pilot{ background:linear-gradient(180deg, rgba(240,178,78,0.07), rgba(139,124,246,0.04)); border:1px solid var(--gold,#F0B24E); border-radius:16px; padding:20px 22px; margin-top:8px; }
    .mc-pilot-head{ display:flex; align-items:center; gap:10px; margin-bottom:6px; }
    .mc-pilot-head .mk{ display:inline-flex; }
    .mc-pilot-head h3{ font-family:'Space Grotesk',sans-serif; font-weight:800; font-size:16px; color:var(--text,#eee); margin:0; }
    .mc-pilot-head .tag{ font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--gold,#F0B24E); border:1px solid var(--gold,#F0B24E); border-radius:999px; padding:2px 8px; }
    .mc-pilot .status{ font-family:'Manrope',sans-serif; font-size:14px; color:var(--text,#eee); line-height:1.55; margin:8px 0 12px; }
    .mc-pilot .lbl{ font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--text-faint,#778); margin:12px 0 7px; }
    .mc-pilot ul{ margin:0; padding-left:18px; } .mc-pilot li{ font-family:'Manrope',sans-serif; font-size:13px; color:var(--text-dim,#bbc); line-height:1.55; margin-bottom:5px; }
    .mc-pilot li b{ color:var(--text,#eee); }
    .mc-pilot-actions{ margin-top:14px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    .mc-btn{ font-family:'Manrope',sans-serif; font-weight:700; font-size:12.5px; color:#0b0b0f; background:var(--gold,#F0B24E); border:none; border-radius:9px; padding:9px 15px; cursor:pointer; }
    .mc-btn.ghost{ color:var(--text-dim,#aab); background:var(--void,#0e0e14); border:1px solid var(--line,#2a2a36); }
    .mc-btn:disabled{ opacity:.55; cursor:default; }
    .mc-pilot-note{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--text-faint,#778); }
    @media (max-width:640px){ .mc-frow{ grid-template-columns:96px 1fr 40px; } .mc-big{ font-size:32px; } }
    `;
    var s=document.createElement('style'); s.id='missionCss'; s.textContent=css; document.head.appendChild(s);
  }

  // ------------------------------------------------------------------ gather
  var _cache = null;
  MISSION.gather = async function(){
    if(_cache) return _cache;
    var profile = (typeof getProfile==='function' && getProfile()) || {};
    var session = (typeof getSession==='function' && getSession()) || null;
    var uid = session && session.user_id;

    // best-effort backend hydration (apps, saved, roadmap, workshop items)
    var workshop = { star_story:[], interview_answer:[], interview_ask:[], target_role:[], contact:[], reference:[] };
    if(uid){
      try{
        var jobs = [ apiListApplications(uid), apiGetSavedIds(uid), apiGetRoadmap(uid), apiListWorkshopItems(uid) ];
        var r = await Promise.all(jobs.map(function(p){ return p.catch(function(){ return null; }); }));
        if(Array.isArray(r[0]) && r[0].length && typeof saveApplications==='function') saveApplications(r[0]);
        if(r[1] && r[1].size>0){ try{ localStorage.setItem('kaidostar_saved_ids', JSON.stringify([].concat.apply([],[Array.from(r[1])]))); }catch(e){} }
        if(r[2] && r[2].milestones && r[2].milestones.length && typeof saveRoadmap==='function') saveRoadmap(r[2]);
        if(Array.isArray(r[3])) r[3].forEach(function(it){ if(it && workshop[it.kind]) workshop[it.kind].push(it.data||it); });
      }catch(e){}
    }

    var matches = (typeof getMatches==='function' && getMatches()) || [];
    var trajectory = (typeof getTrajectory==='function' && getTrajectory()) || [];
    var cycles = (typeof getCycleCount==='function' && getCycleCount()) || 0;
    var savedIds = (typeof getSavedIds==='function' && getSavedIds()) || new Set();
    var apps = (typeof getApplications==='function' && getApplications()) || [];
    var outreach = (typeof getOutreachDrafts==='function' && getOutreachDrafts()) || [];
    var roadmap = (typeof getRoadmap==='function' && getRoadmap()) || null;
    var autos = (typeof getAutoApplySettings==='function' && getAutoApplySettings()) || { enabled:false, threshold:0 };
    var engagement = (typeof getEngagementSuggestions==='function' && getEngagementSuggestions()) || [];

    var milestones = (roadmap && roadmap.milestones) || [];
    var roadmapDone = milestones.filter(function(m){ return m.status==='done'; }).length;
    var roadmapProgress = milestones.length ? Math.round(roadmapDone/milestones.length*100) : 0;

    var skillTokens = (typeof tokenize==='function') ? tokenize(profile.skills||'') : String(profile.skills||'').split(/\s+/).filter(Boolean);
    var skillStrength = Math.min(100, skillTokens.length*8);
    var avgMatch = matches.length ? Math.round(matches.reduce(function(s,l){return s+num(l.pct);},0)/matches.length) : 0;
    var matchQuality = matches.length ? avgMatch : 40;
    var potential = Math.round((roadmapProgress*0.3)+(skillStrength*0.3)+(matchQuality*0.4));

    // application funnel & outcomes
    function st(s){ return apps.filter(function(a){ return a.status===s; }).length; }
    function oc(s){ return apps.filter(function(a){ return a.outcome_status===s; }).length; }
    var appsSent = st('sent'), pending = st('pending_review'), approved = st('approved');
    var offers = oc('offer'), interviews = oc('interview'), applied = oc('applied'), rejected = oc('rejected'), ghosted = oc('ghosted');
    var interviewsSecured = interviews + offers;             // reached interview or beyond
    var appsWithOutcome = apps.filter(function(a){ return a.outcome_status; }).length;
    var replied = offers + interviews + rejected;
    var responseRate = rate(replied, appsWithOutcome);
    var appliedToInterview = rate(interviewsSecured, appsSent);
    var interviewToOffer = rate(offers, interviewsSecured);

    // matches derived
    function daysLeft(m){ try{ if(m.deadline && typeof parseDeadline==='function'){ var dt=parseDeadline(m.deadline); if(!isNaN(dt)) return Math.round((dt-Date.now())/86400000); } }catch(e){} return null; }
    var highFit = matches.filter(function(m){ return num(m.pct)>=75; }).length;
    var closingSoon = matches.filter(function(m){ var d=daysLeft(m); return d!=null&&d>=0&&d<=14; }).length;
    var ghostRisk = matches.filter(function(m){ return m.ghostRisk==='high'; }).length;
    var byType = {};
    matches.forEach(function(m){ var t=m.type||'other'; byType[t]=(byType[t]||0)+1; });

    // skill gaps (same logic as legacy overview)
    var goalTokens = (typeof tokenize==='function') ? tokenize((profile.northstar||'')+' '+(profile.finalidea||profile.final_idea||'')) : [];
    var freq={};
    matches.slice(0,6).forEach(function(l){ (l.tags||[]).forEach(function(tag){
      var known = skillTokens.some(function(t){ return typeof termsMatch==='function' ? termsMatch(t,tag) : t===tag; }) || goalTokens.some(function(t){ return typeof termsMatch==='function' ? termsMatch(t,tag) : t===tag; });
      if(!known) freq[tag]=(freq[tag]||0)+1;
    }); });
    var skillGaps = Object.keys(freq).map(function(k){ return [k,freq[k]]; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,8);

    // intelligence (pure JS, safe defaults)
    var calibration = (typeof computeCalibration==='function') ? computeCalibration() : { totalWithOutcomes:0, buckets:{} };
    var audit = (typeof getPersonalizationAuditJS==='function') ? getPersonalizationAuditJS() : { verdict:'insufficient_data', note:'' };
    var appsWithBoth = apps.filter(function(a){ return a.outcome_status && a.factors_snapshot; });
    var reliability = (appsWithBoth.length>=3 && typeof getFactorReliabilityDetail==='function')
      ? getFactorReliabilityDetail(appsWithBoth.map(function(a){ return { factors_snapshot:a.factors_snapshot, outcome_status:a.outcome_status, updated_at:a.outcome_logged_at }; })) : null;
    var interactions = (appsWithBoth.length>=6 && typeof getFactorInteractionsJS==='function') ? getFactorInteractionsJS() : [];

    // interview prep readiness
    var starCount = workshop.star_story.length;
    var qPracticed = workshop.interview_answer.length;
    var qBank = workshop.interview_ask.length;
    var interviewingCompanies = {};
    apps.filter(function(a){ return a.outcome_status==='interview'||a.outcome_status==='offer'; }).forEach(function(a){ var o=a.org||a.company||a.listing_org; if(o) interviewingCompanies[o]=(interviewingCompanies[o]||0)+1; });

    // search health composite (0-100) - same formula as the backend
    // (app/services/mission.py) so the figure matches whether it's computed
    // server-side or here as the offline fallback.
    var health = pct((matchQuality*0.35) + (Math.min(100, appsSent*12)*0.30) + (responseRate*0.35));

    var D = {
      profile:profile, uid:uid, matches:matches, trajectory:trajectory, cycles:cycles,
      savedCount: savedIds.size||0, apps:apps, outreach:outreach, roadmap:roadmap, milestones:milestones,
      roadmapDone:roadmapDone, roadmapTotal:milestones.length, roadmapProgress:roadmapProgress, skillTokens:skillTokens, skillStrength:skillStrength, skillsListed:skillTokens.length,
      avgMatch:avgMatch, matchQuality:matchQuality, potential:potential,
      appsSent:appsSent, pending:pending, approved:approved,
      offers:offers, interviews:interviews, applied:applied, rejected:rejected, ghosted:ghosted,
      interviewsSecured:interviewsSecured, appsWithOutcome:appsWithOutcome, responseRate:responseRate,
      appliedToInterview:appliedToInterview, interviewToOffer:interviewToOffer,
      highFit:highFit, closingSoon:closingSoon, ghostRisk:ghostRisk, byType:byType,
      skillGaps:skillGaps, calibration:calibration, audit:audit, reliability:reliability,
      interactions:interactions, appsWithBoth:appsWithBoth,
      autos:autos, engagement:engagement, outreachDrafted: outreach.filter(function(o){return o.status==='drafted';}).length,
      outreachSent: outreach.filter(function(o){return o.status==='sent';}).length,
      workshop:workshop, starCount:starCount, qPracticed:qPracticed, qBank:qBank,
      interviewingCompanies:interviewingCompanies, health:health, daysLeft:daysLeft, server:false
    };

    // Prefer the server-computed snapshot when signed in: the backend owns these
    // numbers (it recomputes them from the DB), so the dashboard shows
    // authoritative, cross-device figures. Everything above is the offline
    // fallback, kept for logged-out use and if the request fails.
    if(uid && typeof apiMission === 'function'){
      try{
        var snap = await apiMission(uid);
        if(snap && snap.has_profile){
          ['appsSent','pending','approved','offers','interviews','applied','rejected','ghosted',
           'interviewsSecured','appsWithOutcome','responseRate','appliedToInterview','interviewToOffer',
           'avgMatch','highFit','closingSoon','ghostRisk','matchQuality','potential','health',
           'roadmapDone','roadmapTotal','roadmapProgress','skillStrength','skillsListed',
           'starCount','qPracticed','qBank','savedCount']
            .forEach(function(k){ if(snap[k]!=null) D[k]=snap[k]; });
          if(snap.byType) D.byType=snap.byType;
          if(snap.companies) D.interviewingCompanies=snap.companies;
          if(Array.isArray(snap.matches) && snap.matches.length){
            D.matches = snap.matches.map(function(m){ return { title:m.title, org:m.org, pct:m.score_pct, type:m.type, tags:m.tags||[], deadline:m.deadline, ghostRisk:m.ghost_risk, signalStrength:m.signal_strength }; });
          }
          D.server = true;
        }
      }catch(e){ /* offline - keep the local fallback values computed above */ }
    }
    _cache = D;
    return D;
  };

  // ------------------------------------------------------------------ builders
  function kpi(n, label, desc, cls){ return '<div class="mc-kpi '+(cls||'')+'"><div class="n">'+esc(n)+'</div><div class="l">'+esc(label)+'</div>'+(desc?'<div class="d">'+esc(desc)+'</div>':'')+'</div>'; }
  function kpis(tiles){ return '<div class="mc-kpis">'+tiles.join('')+'</div>'; }
  function panel(title, sub, body, span){ return '<div class="mc-panel'+(span?' span2':'')+'"><h3>'+esc(title)+'</h3>'+(sub?'<div class="sub">'+esc(sub)+'</div>':'')+body+'</div>'; }
  function bars(rows){ return '<div class="mc-bars">'+rows.map(function(r){
    return '<div><div class="mc-bar-head"><span>'+esc(r.label)+'</span><span>'+esc(r.right!=null?r.right:(pct(r.val)+'%'))+'</span></div><div class="mc-bar-track"><div class="mc-bar-fill" style="width:'+pct(r.val)+'%; background:'+(r.color||'var(--gold,#F0B24E)')+';"></div></div></div>';
  }).join('')+'</div>'; }
  function funnel(stages){ var max=Math.max.apply(null, stages.map(function(s){return s.value;}).concat([1]));
    return '<div class="mc-funnel">'+stages.map(function(s){ var w=Math.max(4, Math.round(s.value/max*100));
      return '<div class="mc-frow"><span class="mc-flabel">'+esc(s.label)+'</span><div class="mc-ftrack"><div class="mc-ffill" style="width:'+w+'%; background:'+(s.color||'var(--comet,#8B7CF6)')+';"></div></div><span class="mc-fval">'+num(s.value)+'</span></div>';
    }).join('')+'</div>'; }
  function list(rows){ if(!rows.length) return ''; return '<div class="mc-list">'+rows.map(function(r){
    return '<div class="mc-lrow"><div class="mc-lmain"><div class="mc-ltitle">'+esc(r.title)+'</div>'+(r.meta?'<div class="mc-lmeta">'+esc(r.meta)+'</div>':'')+'</div>'+(r.pill?'<span class="mc-pill" style="color:'+(r.pillColor||'var(--text-dim)')+'; border:1px solid '+(r.pillColor||'var(--line)')+';">'+esc(r.pill)+'</span>':'')+'</div>';
  }).join('')+'</div>'; }
  function tags(items){ if(!items.length) return ''; return '<div class="mc-tags">'+items.map(function(t){ return '<span class="mc-tag">'+t+'</span>'; }).join('')+'</div>'; }
  function emptyMsg(html){ return '<div class="mc-empty">'+html+'</div>'; }

  MISSION.subnav = function(active){
    return '<div class="mc-subnav">'+SUBNAV.map(function(t){ return '<a class="mc-tab'+(t.id===active?' active':'')+'" href="'+t.href+'">'+esc(t.label)+'</a>'; }).join('')+'</div>';
  };

  // ------------------------------------------------------------------ Metis Pilot
  function metisMk(){ return (typeof metisMark==='function') ? metisMark(20,'#F0B24E') : '&#10022;'; }

  // deterministic key points per area (always available, grounded in real numbers)
  function detPoints(area, D){
    var p=[];
    if(area==='command'){
      p.push('Overall search health is <b>'+D.health+'/100</b>, blending match quality, activity and responses.');
      p.push('<b>'+D.appsSent+'</b> applications sent · <b>'+D.interviewsSecured+'</b> interviews · <b>'+D.offers+'</b> offers.');
      p.push('You have <b>'+D.matches.length+'</b> live matches (avg <b>'+D.avgMatch+'%</b>), <b>'+D.highFit+'</b> of them high-fit.');
      if(D.pending) p.push('<b>'+D.pending+'</b> application'+(D.pending===1?'':'s')+' waiting on your review.');
      if(D.closingSoon) p.push('<b>'+D.closingSoon+'</b> match'+(D.closingSoon===1?'':'es')+' closing within 14 days.');
    } else if(area==='pipeline'){
      p.push('Funnel: <b>'+D.savedCount+'</b> saved → <b>'+D.appsSent+'</b> sent → <b>'+D.interviewsSecured+'</b> interviews → <b>'+D.offers+'</b> offers.');
      p.push('Response rate on decided applications is <b>'+D.responseRate+'%</b>.');
      if(D.appsSent) p.push('Applied → interview conversion is <b>'+D.appliedToInterview+'%</b>.');
      if(D.interviewsSecured) p.push('Interview → offer conversion is <b>'+D.interviewToOffer+'%</b>.');
      if(D.pending||D.approved) p.push('<b>'+(D.pending+D.approved)+'</b> in the queue ('+D.pending+' to review, '+D.approved+' approved).');
    } else if(area==='interviews'){
      p.push('<b>'+D.interviewsSecured+'</b> interview'+(D.interviewsSecured===1?'':'s')+' secured; <b>'+D.offers+'</b> converted to an offer.');
      p.push('Prep bank: <b>'+D.starCount+'</b> STAR stories, <b>'+D.qPracticed+'</b> answers practised.');
      var comp=Object.keys(D.interviewingCompanies).length; if(comp) p.push('Interviewing with <b>'+comp+'</b> compan'+(comp===1?'y':'ies')+'.');
      if(D.interviewsSecured && D.starCount<3) p.push('Thin prep for the interviews you have — build a few more STAR stories.');
    } else if(area==='search'){
      p.push('<b>'+D.matches.length+'</b> live matches at <b>'+D.avgMatch+'%</b> average fit; <b>'+D.highFit+'</b> are 75%+.');
      p.push('<b>'+D.cycles+'</b> scan cycle'+(D.cycles===1?'':'s')+' run · <b>'+D.savedCount+'</b> saved.');
      if(D.ghostRisk) p.push('<b>'+D.ghostRisk+'</b> match'+(D.ghostRisk===1?'':'es')+' flagged ghost-risk.');
      if(D.skillGaps.length) p.push('Top skill gap in your matches: <b>'+esc(D.skillGaps[0][0])+'</b>.');
    } else if(area==='growth'){
      p.push('Potential score <b>'+D.potential+'/100</b> (roadmap '+D.roadmapProgress+'%, skills '+D.skillStrength+'%, match '+D.matchQuality+'%).');
      p.push('Roadmap: <b>'+D.roadmapDone+'</b> of <b>'+D.roadmapTotal+'</b> stages complete.');
      if(D.calibration.totalWithOutcomes) p.push('Score calibration is based on <b>'+D.calibration.totalWithOutcomes+'</b> logged outcome'+(D.calibration.totalWithOutcomes===1?'':'s')+'.');
      if(D.audit.verdict && D.audit.verdict!=='insufficient_data') p.push('Personalisation is currently <b>'+esc(D.audit.verdict)+'</b> your score accuracy.');
    }
    return p.slice(0,5);
  }

  // build the snapshot text the AI read-out is grounded in
  function snapshot(area, D){
    var g = D;
    var base = 'AREA: '+area.toUpperCase()+'\nGoal: '+(g.profile.northstar||'(not set)')+'\n';
    base += 'Matches: '+g.matches.length+' (avg '+g.avgMatch+'%, '+g.highFit+' high-fit, '+g.closingSoon+' closing<=14d, '+g.ghostRisk+' ghost-risk)\n';
    base += 'Applications: '+g.appsSent+' sent, '+g.pending+' to review, '+g.approved+' approved\n';
    base += 'Outcomes: '+g.offers+' offers, '+g.interviews+' interviews, '+g.applied+' pending-applied, '+g.rejected+' rejected, '+g.ghosted+' ghosted (response rate '+g.responseRate+'%)\n';
    base += 'Conversions: applied->interview '+g.appliedToInterview+'%, interview->offer '+g.interviewToOffer+'%\n';
    base += 'Pipeline extras: outreach '+g.outreachDrafted+' drafted / '+g.outreachSent+' sent; auto-mode '+(g.autos.enabled?('ON @'+g.autos.threshold+'%'):'OFF')+'\n';
    base += 'Interview prep: '+g.starCount+' STAR stories, '+g.qPracticed+' answers practised, '+Object.keys(g.interviewingCompanies).length+' companies interviewing\n';
    base += 'Roadmap: '+g.roadmapDone+'/'+g.milestones.length+' stages ('+g.roadmapProgress+'%); skill strength '+g.skillStrength+'%; potential '+g.potential+'/100; search health '+g.health+'/100\n';
    base += 'Scan cycles: '+g.cycles+'; saved: '+g.savedCount+'\n';
    if(g.skillGaps.length) base += 'Skill gaps in matches: '+g.skillGaps.map(function(x){return x[0]+'('+x[1]+')';}).join(', ')+'\n';
    if(g.audit.verdict && g.audit.verdict!=='insufficient_data') base += 'Personalisation audit verdict: '+g.audit.verdict+'\n';
    return base;
  }

  function renderPoints(points){ return '<ul>'+points.map(function(t){ return '<li>'+t+'</li>'; }).join('')+'</ul>'; }

  // parse the AI STATUS / KEY POINTS / NEXT MOVES structure
  function parseBriefing(text){
    var out={ status:'', points:[], moves:[] }; if(!text) return out;
    var lines=String(text).split('\n'), mode='';
    lines.forEach(function(raw){
      var line=raw.trim(); if(!line) return;
      if(/^status\s*:/i.test(line)){ out.status=line.replace(/^status\s*:/i,'').trim(); mode='status'; return; }
      if(/^key points/i.test(line)){ mode='points'; return; }
      if(/^next moves/i.test(line)){ mode='moves'; return; }
      var m=line.match(/^[-*•]\s+(.*)$/);
      if(m){ if(mode==='moves') out.moves.push(m[1]); else out.points.push(m[1]); return; }
      if(mode==='status' && !out.status) out.status=line;
    });
    return out;
  }

  MISSION.pilot = function(area, D){
    var det = detPoints(area, D);
    var html = '<div class="mc-pilot" id="mcPilot">'
      + '<div class="mc-pilot-head"><span class="mk">'+metisMk()+'</span><h3>Metis Pilot</h3><span class="tag">simplified</span></div>'
      + '<div id="mcPilotBody">'
      + '<div class="lbl">Key points</div>'
      + renderPoints(det)
      + '</div>'
      + '<div class="mc-pilot-actions">'
      + '<button class="mc-btn" id="mcPilotAI">Go deeper with Metis &rarr;</button>'
      + '<span class="mc-pilot-note" id="mcPilotNote">Grounded in your real numbers on this page.</span>'
      + '</div></div>';
    return html;
  };

  function wirePilot(area, D){
    var btn=document.getElementById('mcPilotAI'); if(!btn) return;
    btn.addEventListener('click', async function(){
      var note=document.getElementById('mcPilotNote'), body=document.getElementById('mcPilotBody');
      if(!D.uid){ note.textContent='Sign in to get Metis’s AI read-out.'; return; }
      btn.disabled=true; var old=btn.textContent; btn.textContent='Metis is reading your dashboard…';
      try{
        var text = (typeof apiAiAssist==='function') ? await apiAiAssist(D.uid, 'overview_briefing', { snapshot: snapshot(area, D) }) : null;
        if(!text){ throw new Error('no result'); }
        var b=parseBriefing(text);
        var out='';
        if(b.status) out+='<div class="status">'+esc(b.status)+'</div>';
        if(b.points.length){ out+='<div class="lbl">Key points</div><ul>'+b.points.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>'; }
        else { out+='<div class="lbl">Key points</div>'+renderPoints(detPoints(area,D)); }
        if(b.moves.length){ out+='<div class="lbl">Next moves</div><ul>'+b.moves.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>'; }
        body.innerHTML=out;
        note.textContent='Read by Metis from this page’s real numbers.';
      }catch(e){
        note.textContent='Couldn’t reach Metis just now — the key points above are still live.';
      }finally{ btn.disabled=false; btn.textContent=old; }
    });
  }

  // ------------------------------------------------------------------ page renderers
  function noData(){ return '<div class="mc-panel span2">'+emptyMsg('No survey answers yet. <a href="survey.html">Complete the survey</a> so Mission Control has something to track.')+'</div>'; }

  function renderCommand(D){
    var statusColor = D.health>=66?'good':(D.health>=40?'warn':'bad');
    var h = kpis([
      kpi(D.potential, 'Potential', '', 'good'),
      kpi(D.health, 'Search health', '', statusColor),
      kpi(D.avgMatch+'%', 'Avg match'),
      kpi(D.matches.length, 'Live matches'),
      kpi(D.appsSent, 'Apps sent'),
      kpi(D.interviewsSecured, 'Interviews', '', D.interviewsSecured?'good':''),
      kpi(D.offers, 'Offers', '', D.offers?'good':''),
      kpi(D.responseRate+'%', 'Response rate')
    ]);
    // trajectory + funnel + focus
    var traj = D.trajectory.length ? (typeof trendArea==='function'? trendArea(D.trajectory, {width:280,height:90,color:'#F0B24E'}) : '') : emptyMsg('No scan cycles yet — run the watch on Job Search.');
    var funnelBody = funnel([
      { label:'Saved', value:D.savedCount, color:'#7BA9FF' },
      { label:'Applied', value:D.appsSent, color:'#F0B24E' },
      { label:'Interview', value:D.interviewsSecured, color:'#9B87F5' },
      { label:'Offer', value:D.offers, color:'#5FE0B8' },
    ]);
    var focus = [];
    if(D.pending) focus.push({title:'Review '+D.pending+' pending application'+(D.pending===1?'':'s'), meta:'They’re drafted and waiting on you', pill:'Do now', pillColor:'var(--gold)'});
    if(D.closingSoon) focus.push({title:D.closingSoon+' match'+(D.closingSoon===1?'':'es')+' closing within 14 days', meta:'Decide before the deadline passes', pill:'Time-sensitive', pillColor:'var(--danger)'});
    if(D.interviewsSecured && D.starCount<3) focus.push({title:'Build interview prep', meta:'You have interviews but only '+D.starCount+' STAR stories', pill:'Prep', pillColor:'var(--comet)'});
    if(D.outreachDrafted) focus.push({title:D.outreachDrafted+' outreach email'+(D.outreachDrafted===1?'':'s')+' drafted, unsent', meta:'Send them from the Workshop', pill:'Send', pillColor:'var(--aurora)'});
    if(!D.matches.length) focus.push({title:'Run your first scan', meta:'Start the watch on Job Search to populate everything here', pill:'Start', pillColor:'var(--gold)'});
    if(!focus.length) focus.push({title:'You’re on track', meta:'No urgent items — keep applying and logging outcomes', pill:'Steady', pillColor:'var(--aurora)'});

    var shortcuts = ''
      + '<a class="mc-shortcut" href="mission-pipeline.html">'+panel('Pipeline & Secured','Applications, offers & conversions', '<div class="mc-big">'+D.appsSent+'</div><div class="mc-note">apps sent · '+D.offers+' offers · '+D.responseRate+'% response</div>')+'</a>'
      + '<a class="mc-shortcut" href="mission-interviews.html">'+panel('Interviews','Secured, upcoming & prep', '<div class="mc-big">'+D.interviewsSecured+'</div><div class="mc-note">interviews · '+D.starCount+' STAR stories ready</div>')+'</a>'
      + '<a class="mc-shortcut" href="mission-search.html">'+panel('Search & Matches','Match quality & opportunities', '<div class="mc-big">'+D.matches.length+'</div><div class="mc-note">live matches · '+D.avgMatch+'% avg · '+D.highFit+' high-fit</div>')+'</a>'
      + '<a class="mc-shortcut" href="mission-growth.html">'+panel('Growth & Intel','Roadmap, skills & score learning', '<div class="mc-big">'+D.potential+'</div><div class="mc-note">potential · roadmap '+D.roadmapProgress+'%</div>')+'</a>';

    return h
      + '<div class="mc-grid wide">'
      + panel('Trajectory','Average match strength per scan cycle', traj)
      + panel('Your funnel right now','From saved to offer', funnelBody)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Focus now','The highest-leverage things to do', list(focus), true)
      + '</div>'
      + '<div class="mc-grid">'+shortcuts+'</div>';
  }

  function renderPipeline(D){
    var h = kpis([
      kpi(D.appsSent,'Apps sent'),
      kpi(D.interviewsSecured,'Interviews','', D.interviewsSecured?'good':''),
      kpi(D.offers,'Offers','', D.offers?'good':''),
      kpi(D.responseRate+'%','Response rate'),
      kpi(D.appliedToInterview+'%','Applied→interview'),
      kpi(D.interviewToOffer+'%','Interview→offer'),
      kpi(D.pending,'To review', '', D.pending?'warn':''),
      kpi(D.savedCount,'Saved')
    ]);
    var funnelBody = funnel([
      { label:'Saved', value:D.savedCount, color:'#7BA9FF' },
      { label:'Applied/sent', value:D.appsSent, color:'#F0B24E' },
      { label:'In review', value:D.pending+D.approved, color:'#C0A0F0' },
      { label:'Interview', value:D.interviewsSecured, color:'#9B87F5' },
      { label:'Offer', value:D.offers, color:'#5FE0B8' },
    ]);
    // outcomes donut
    var statusColors = { offer:'#5FE0B8', interview:'#7BA9FF', applied:'#F0B24E', rejected:'var(--danger)', ghosted:'var(--text-faint)' };
    var statusLabels = { offer:'Offers', interview:'Interviews', applied:'Applied (pending)', rejected:'Rejected', ghosted:'Ghosted' };
    var counts={ offer:D.offers, interview:D.interviews, applied:D.applied, rejected:D.rejected, ghosted:D.ghosted };
    var segs = Object.keys(statusLabels).filter(function(k){return counts[k];}).map(function(k){ return { label:statusLabels[k], value:counts[k], color:statusColors[k] }; });
    var donut = segs.length ? (donutChart(segs,130,18)+donutLegend(segs)) : emptyMsg('Log outcomes on your sent applications to see where they land.');
    // secured
    var offerRows = D.apps.filter(function(a){return a.outcome_status==='offer';}).slice(0,6).map(function(a){ return { title:(a.title||a.role||'Role')+(a.org?(' · '+a.org):''), meta:'Offer', pill:'Offer', pillColor:'#5FE0B8' }; });
    var interviewRows = D.apps.filter(function(a){return a.outcome_status==='interview';}).slice(0,6).map(function(a){ return { title:(a.title||a.role||'Role')+(a.org?(' · '+a.org):''), meta:'Interview stage', pill:'Interview', pillColor:'#7BA9FF' }; });
    var securedBody = (offerRows.length||interviewRows.length) ? list(offerRows.concat(interviewRows)) : emptyMsg('Nothing secured yet — interviews and offers you log will surface here.');
    // monthly pace
    var months=(typeof lastNMonths==='function')?lastNMonths(6):[]; var cutoff=(typeof monthWindowStart==='function')?monthWindowStart(6):new Date(0);
    var sentRecords=D.apps.filter(function(a){return a.status==='sent'&&a.sent_at;}).map(function(a){ var d=new Date(a.sent_at); return (isNaN(d.getTime())||d<cutoff)?null:{month:d.toLocaleString('en-US',{month:'short'})}; }).filter(Boolean);
    var monthly=(typeof monthlyTargetData==='function')?monthlyTargetData(sentRecords,8,months):[];
    var paceBody = monthly.length ? (barChart(monthly,{width:400,height:140})+'<div class="mc-note">'+monthly.reduce(function(s,m){return s+m.actual;},0)+' sent vs '+monthly.reduce(function(s,m){return s+m.target;},0)+' targeted over 6 months</div>') : emptyMsg('No sent applications yet.');
    // status + outreach bars
    var statusBars = bars([
      { label:'Sent', val: rate(D.appsSent, D.appsSent+D.pending+D.approved), right:D.appsSent, color:'#5FE0B8' },
      { label:'Approved, unsent', val: rate(D.approved, D.appsSent+D.pending+D.approved), right:D.approved, color:'#7BA9FF' },
      { label:'Needs review', val: rate(D.pending, D.appsSent+D.pending+D.approved), right:D.pending, color:'#F0B24E' },
    ]);
    var outreachBars = bars([
      { label:'Outreach drafted', val: D.outreachDrafted?100:0, right:D.outreachDrafted, color:'#F0B24E' },
      { label:'Outreach sent', val: D.outreachSent?100:0, right:D.outreachSent, color:'#5FE0B8' },
      { label:'Led to a reply', val:0, right:D.engagement.filter(function(s){return (s.communication_log||[]).length>0;}).length, color:'#9B87F5' },
    ]);
    var autoBody = '<div class="mc-big" style="color:'+(D.autos.enabled?'#5FE0B8':'var(--text-faint)')+';">'+(D.autos.enabled?'ON':'OFF')+'</div><div class="mc-note">'+(D.autos.enabled?('Auto-applying at '+D.autos.threshold+'%+ match'):'Auto mode is off — turn it on in Auto to apply while you’re away')+'</div>';
    // recent apps
    var recent = D.apps.slice(0,8).map(function(a){ var s=a.outcome_status||a.status||''; var col= s==='offer'?'#5FE0B8':(s==='interview'?'#7BA9FF':(s==='rejected'||s==='ghosted'?'var(--text-faint)':'var(--gold)')); return { title:(a.title||a.role||'Role')+(a.org?(' · '+a.org):''), meta:(a.sent_at?('Sent '+new Date(a.sent_at).toLocaleDateString()):(a.status||'')), pill:(s||'—'), pillColor:col }; });

    return h
      + '<div class="mc-grid wide">'
      + panel('Application funnel','Every stage from saved to offer', funnelBody)
      + panel('Where applications land','Outcomes across everything you’ve sent', donut)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Secured','Interviews and offers you’ve logged', securedBody)
      + panel('Monthly pace','Applications sent vs target, trailing 6 months', paceBody)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Application queue','Status of what’s in flight', statusBars)
      + panel('Outreach','Referral & cold outreach pipeline', outreachBars)
      + panel('Auto mode','Autonomous applying', autoBody)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Recent applications','Your latest activity', recent.length?list(recent):emptyMsg('No applications yet.'), true)
      + '</div>';
  }

  function renderInterviews(D){
    var comps=Object.keys(D.interviewingCompanies);
    var h = kpis([
      kpi(D.interviewsSecured,'Interviews','', D.interviewsSecured?'good':''),
      kpi(D.offers,'Offers','', D.offers?'good':''),
      kpi(D.interviewToOffer+'%','Interview→offer'),
      kpi(comps.length,'Companies'),
      kpi(D.starCount,'STAR stories', '', D.starCount>=3?'good':(D.interviewsSecured?'warn':'')),
      kpi(D.qPracticed,'Answers practised'),
      kpi(D.qBank,'Questions banked'),
      kpi((D.interviewsSecured?pct((D.starCount>=3?40:D.starCount*13)+(D.qPracticed>=5?40:D.qPracticed*8)+(comps.length?20:0)):0)+'%','Prep readiness')
    ]);
    var upcoming = D.apps.filter(function(a){return a.outcome_status==='interview';}).slice(0,8).map(function(a){ return { title:(a.title||a.role||'Role')+(a.org?(' · '+a.org):''), meta:'Interview stage — prep this one', pill:'Interview', pillColor:'#7BA9FF' }; });
    var upcomingBody = upcoming.length?list(upcoming):emptyMsg('No interviews logged yet. When you mark a sent application as “interview” in the Workshop, it shows here.');
    var readinessBars = bars([
      { label:'STAR stories (aim 3+)', val: Math.min(100,D.starCount*33), right:D.starCount, color:'#5FE0B8' },
      { label:'Answers practised (aim 5+)', val: Math.min(100,D.qPracticed*20), right:D.qPracticed, color:'#7BA9FF' },
      { label:'Questions banked', val: Math.min(100,D.qBank*20), right:D.qBank, color:'#9B87F5' },
    ]);
    var compBody = comps.length ? tags(comps.map(function(c){ return esc(c)+' <b>'+D.interviewingCompanies[c]+'</b>'; })) : emptyMsg('No companies at interview stage yet.');
    var stars = D.workshop.star_story.slice(0,6).map(function(s){ return { title:(s.title||s.situation||'STAR story'), meta:'Ready to use', pill:'STAR', pillColor:'#5FE0B8' }; });
    var starBody = stars.length?list(stars):emptyMsg('Build STAR stories in <a href="interview-prep.html">Interview Prep</a> so you walk in ready.');
    // practice gaps
    var covered = {}; D.workshop.interview_answer.forEach(function(a){ var t=(a.type||a.category||''); if(t) covered[t]=1; });
    var wantTypes=['Behavioral','Technical','Situational','Motivation','Culture-fit'];
    var gapTypes=wantTypes.filter(function(t){ return !covered[t.toLowerCase()] && !covered[t]; });
    var gapBody = gapTypes.length ? tags(gapTypes.map(function(t){ return esc(t); })) + '<div class="mc-note">Practise at least one of each before your next round.</div>' : emptyMsg('Good coverage across question types.');
    var debriefs = D.workshop.interview_answer.filter(function(a){ return a.debrief || a.kind==='debrief'; }).slice(0,5).map(function(a){ return { title:(a.title||'Interview debrief'), meta:(a.note||'') }; });

    return h
      + '<div class="mc-grid wide">'
      + panel('Interviews to prep','Everything at interview stage right now', upcomingBody)
      + panel('Prep readiness','How ready you are for the interviews you have', readinessBars)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Interviewing with','Companies you’re in process with', compBody)
      + panel('Your STAR stories','Reusable stories for behavioural questions', starBody)
      + panel('Practice gaps','Question types you haven’t practised yet', gapBody)
      + '</div>'
      + (debriefs.length? '<div class="mc-grid"><div class="mc-panel span2"><h3>Interview debriefs</h3><div class="sub">What you captured after each round</div>'+list(debriefs)+'</div></div>' : '')
      + '<div class="mc-grid"><div class="mc-panel span2">'+emptyMsg('Practise live with mock interviews and STAR coaching in <a href="interview-prep.html">Interview Prep &rarr;</a>')+'</div></div>';
  }

  function renderSearch(D){
    var h = kpis([
      kpi(D.matches.length,'Live matches'),
      kpi(D.avgMatch+'%','Avg fit'),
      kpi(D.highFit,'High-fit (75%+)','', D.highFit?'good':''),
      kpi(D.closingSoon,'Closing ≤14d','', D.closingSoon?'warn':''),
      kpi(D.ghostRisk,'Ghost-risk','', D.ghostRisk?'bad':''),
      kpi(D.cycles,'Scan cycles'),
      kpi(D.savedCount,'Saved'),
      kpi((D.autos.enabled?'ON':'OFF'),'Watch', '', D.autos.enabled?'good':'')
    ]);
    var traj = D.trajectory.length ? (trendArea(D.trajectory,{width:400,height:120,color:'#F0B24E'})+'<div class="mc-note">Latest cycle: '+D.trajectory[D.trajectory.length-1]+'% average fit</div>') : emptyMsg('Run scans on Job Search to build a trajectory.');
    var total=D.matches.length||1;
    var typeRows=[
      { label:'Jobs', val: rate(D.byType.job||0,total), color:'#F0B24E' },
      { label:'Internships', val: rate(D.byType.internship||0,total), color:'#5FE0B8' },
      { label:'College / Fellowship', val: rate(D.byType.college||0,total), color:'#7BA9FF' },
      { label:'Athletics', val: rate(D.byType.athletic||0,total), color:'#9B87F5' },
    ];
    var topMatches = D.matches.slice().sort(function(a,b){return num(b.pct)-num(a.pct);}).slice(0,8).map(function(m){ var col=num(m.pct)>=75?'#5FE0B8':(num(m.pct)>=60?'#F0B24E':'var(--text-faint)'); return { title:(m.title||'Role')+(m.org?(' · '+m.org):''), meta:(m.tags||[]).slice(0,4).join(', '), pill:num(m.pct)+'%', pillColor:col }; });
    var topBody = topMatches.length?list(topMatches):emptyMsg('No matches yet — run the watch on <a href="dashboard.html">Job Search</a>.');
    var gapBody = D.skillGaps.length ? tags(D.skillGaps.map(function(x){ return esc(x[0])+' <b>x'+x[1]+'</b>'; })) : emptyMsg(D.matches.length?'Your profile already covers what’s showing up.':'Run a scan to see skill gaps.');
    // quality distribution
    var buckets={ '85-100%':0,'70-84%':0,'55-69%':0,'below 55%':0 };
    D.matches.forEach(function(m){ var p=num(m.pct); if(p>=85)buckets['85-100%']++; else if(p>=70)buckets['70-84%']++; else if(p>=55)buckets['55-69%']++; else buckets['below 55%']++; });
    var distRows=Object.keys(buckets).map(function(k,i){ return { label:k, val: rate(buckets[k], total), right:buckets[k], color:['#5FE0B8','#F0B24E','#7BA9FF','var(--text-faint)'][i] }; });

    return h
      + '<div class="mc-grid wide">'
      + panel('Match trajectory','Average fit per scan cycle', traj)
      + panel('Match quality distribution','How your live matches are spread by fit', bars(distRows))
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Top matches','Your strongest live opportunities', topBody, true)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Opportunity mix','What kinds of opportunities you’re seeing', bars(typeRows))
      + panel('Skill gaps','Common in your top matches, not yet in your skills', gapBody)
      + '</div>';
  }

  function renderGrowth(D){
    var h = kpis([
      kpi(D.potential,'Potential','', 'good'),
      kpi(D.roadmapProgress+'%','Roadmap'),
      kpi(D.roadmapDone+'/'+D.roadmapTotal,'Stages done'),
      kpi(D.skillStrength+'%','Skill strength'),
      kpi(D.skillsListed,'Skills listed'),
      kpi(D.calibration.totalWithOutcomes||0,'Outcomes logged'),
      kpi(D.appsWithBoth.length,'Learning samples'),
      kpi((D.audit.verdict&&D.audit.verdict!=='insufficient_data')?D.audit.verdict:'—','Personalisation', '', D.audit.verdict==='helping'?'good':(D.audit.verdict==='hurting'?'bad':''))
    ]);
    var potBody = (typeof gaugeChart==='function'? gaugeChart(D.potential,120,'#F0B24E'):'') + bars([
      { label:'Roadmap progress', val:D.roadmapProgress, color:'#5FE0B8' },
      { label:'Skill strength', val:D.skillStrength, color:'#7BA9FF' },
      { label:'Match quality', val:D.matchQuality, color:'#F0B24E' },
    ]);
    var roadmapBody = D.roadmapTotal ? (bars([{ label:D.roadmapDone+' of '+D.roadmapTotal+' complete', val:D.roadmapProgress, right:D.roadmapProgress+'%', color:'#5FE0B8' }]) + '<div class="mc-note"><a href="roadmap.html" style="color:var(--gold);">Open your roadmap &rarr;</a></div>') : emptyMsg('No roadmap yet — <a href="roadmap.html">generate one</a>.');
    // calibration
    var calBody;
    if(!D.calibration.totalWithOutcomes){ calBody=emptyMsg('Log real outcomes on sent applications to check whether your match score is trustworthy.'); }
    else { var bc={'80-100%':'#5FE0B8','60-79%':'#F0B24E','below 60%':'var(--text-faint)'}; var rows=Object.keys(D.calibration.buckets||{}).map(function(k){ var b=D.calibration.buckets[k]; if(!b||!b.total) return { label:k, val:0, right:'—', color:bc[k] }; return { label:k, val:b.positiveRate, right:b.positiveRate+'% ('+b.total+')', color:bc[k] }; }); calBody=bars(rows)+'<div class="mc-note">Based on '+D.calibration.totalWithOutcomes+' logged outcome'+(D.calibration.totalWithOutcomes===1?'':'s')+'. Higher buckets should convert better.</div>'; }
    // intelligence (factor reliability)
    var intelBody;
    if(!D.reliability){ intelBody=emptyMsg('Log outcomes on 3+ sent applications and Metis learns which signals actually predict success for you. You have '+D.appsWithBoth.length+' of 3.'); }
    else {
      var labels={ goalFit:'your stated goal', skillFit:'your skill set', priorityFit:'your priorities', locationFit:'location fit', deadlineUrgency:'application timing', descriptionFit:'listing overlap', semanticFit:'conceptual fit', roadmapFit:'roadmap alignment' };
      var ins=[]; Object.keys(D.reliability).forEach(function(f){ var d=D.reliability[f]; var w=d.multiplier; if(w>=1.15) ins.push({ label:(labels[f]||f)+' ↑', val:Math.min(100,(w-1)*300), right:'+'+Math.round((w-1)*100)+'%', color:'#5FE0B8' }); else if(w<=0.85) ins.push({ label:(labels[f]||f)+' ↓', val:Math.min(100,(1-w)*300), right:'-'+Math.round((1-w)*100)+'%', color:'var(--text-faint)' }); });
      intelBody = ins.length ? bars(ins)+'<div class="mc-note">Unique to your account — learned from your own outcomes.</div>' : emptyMsg('Enough data, but no factor stands out yet — your scores are accurate as-is.');
    }
    // audit
    var auditBody;
    if(D.audit.verdict==='insufficient_data'){ auditBody=emptyMsg(D.audit.note||'Not enough outcomes yet to check whether personalisation is helping.'); }
    else { var copy={ helping:'Personalisation is measurably making your scores more accurate.', hurting:'Personalisation is currently making scores less accurate — it self-corrects as more outcomes come in.', neutral:'Personalisation hasn’t made a clear difference yet.' }; auditBody='<div class="mc-note" style="font-size:13px; color:var(--text);">'+esc(copy[D.audit.verdict]||'')+'</div><div class="mc-note">Personalised avg error '+esc(D.audit.personalizedAvgError)+' vs baseline '+esc(D.audit.baselineAvgError)+' (lower is better), across '+esc(D.audit.sampleSize)+' applications.</div>'; }
    // interactions
    var interBody;
    if(D.appsWithBoth.length<6){ interBody=emptyMsg('Signal-interaction learning needs 6+ logged outcomes. You have '+D.appsWithBoth.length+'.'); }
    else if(!D.interactions.length){ interBody=emptyMsg('No factor combinations stand out yet as working together beyond what each predicts alone.'); }
    else { interBody = D.interactions.map(function(f){ return '<div class="mc-note" style="color:var(--text);"><b>'+esc(f.pair)+'</b> — '+(f.type==='synergy'?'work together':'overlap')+': '+Math.round(f.bothEngagedRate*100)+'% real success vs '+Math.round(f.expectedIfAdditive*100)+'% expected.</div>'; }).join(''); }
    // AI on-demand deep panels (reuse existing engines)
    var strategicBody = '<button class="mc-btn ghost" id="mcStrategic">Analyse my real position &rarr;</button><div id="mcStrategicOut"></div>';
    var deepBody = (D.apps.filter(function(a){return a.draft&&a.outcome_status;}).length>=3)
      ? '<button class="mc-btn ghost" id="mcDeep">Find patterns in what I’ve written &rarr;</button><div id="mcDeepOut"></div>'
      : emptyMsg('Log outcomes on 3+ applications that have a real draft, and Metis can find patterns in what you actually wrote.');

    return h
      + '<div class="mc-grid wide">'
      + panel('Potential score','What’s driving your composite score', potBody)
      + panel('Roadmap progress','How far through your plan you are', roadmapBody)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Is your match score trustworthy?','Checked against your real outcomes', calBody)
      + panel('What Metis has learned','Which signals predict success for you', intelBody)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Is personalisation helping?','Whether the learning improves accuracy', auditBody)
      + panel('Signals that work together','Combinations that beat either alone', interBody)
      + '</div>'
      + '<div class="mc-grid">'
      + panel('Where you actually stand','An AI synthesis of everything you’ve done', strategicBody)
      + panel('What works in what you write','Patterns in your real applications', deepBody)
      + '</div>';
  }

  function wireGrowthAI(D){
    var sb=document.getElementById('mcStrategic');
    if(sb){ sb.addEventListener('click', async function(){
      var out=document.getElementById('mcStrategicOut'); sb.disabled=true; sb.textContent='Analysing…';
      try{
        var realApps=(typeof getApplications==='function')?getApplications():[];
        var savedListings=(typeof getSavedIds==='function' && typeof LISTINGS!=='undefined')?Array.from(getSavedIds()).map(function(id){return LISTINGS.find(function(l){return String(l.id)===String(id);});}).filter(Boolean):[];
        var res=(typeof getOrAnalyzeStrategicPositionJS==='function')?await getOrAnalyzeStrategicPositionJS(D.profile, D.milestones, realApps, savedListings, D.engagement):null;
        if(!res){ out.innerHTML='<div class="mc-note" style="color:var(--danger);">Couldn’t generate this just now.</div>'; }
        else { out.innerHTML='<div class="mc-note" style="color:var(--text); font-size:13px; margin-top:10px;">'+esc(res.current_position||'')+'</div>'+(res.next_move?('<div class="mc-note" style="margin-top:8px;"><b style="color:var(--text);">Next move:</b> '+esc(res.next_move.action||'')+'</div>'):''); }
      }catch(e){ out.innerHTML='<div class="mc-note" style="color:var(--danger);">Couldn’t generate this just now.</div>'; }
      finally{ sb.disabled=false; sb.textContent='Re-analyse my position →'; }
    }); }
    var db=document.getElementById('mcDeep');
    if(db){ db.addEventListener('click', async function(){
      var out=document.getElementById('mcDeepOut'); db.disabled=true; db.textContent='Reading your applications…';
      try{
        var res=(typeof generateDeepPersonalizationInsightsJS==='function')?await generateDeepPersonalizationInsightsJS():null;
        if(!res||!res.insights){ out.innerHTML='<div class="mc-note" style="color:var(--danger);">Couldn’t generate this just now.</div>'; }
        else out.innerHTML='<div style="margin-top:10px;">'+res.insights.map(function(t){return '<div class="mc-note" style="color:var(--text); font-size:13px; margin-bottom:6px;">'+esc(t)+'</div>';}).join('')+'</div>';
      }catch(e){ out.innerHTML='<div class="mc-note" style="color:var(--danger);">Couldn’t generate this just now.</div>'; }
      finally{ db.disabled=false; db.textContent='Find patterns in what I’ve written →'; }
    }); }
  }

  var RENDERERS = { command:renderCommand, pipeline:renderPipeline, interviews:renderInterviews, search:renderSearch, growth:renderGrowth };

  // ------------------------------------------------------------------ entry
  MISSION.page = async function(key){
    injectCss();
    var navEl=document.getElementById('missionNav'); if(navEl) navEl.innerHTML=MISSION.subnav(key);
    var root=document.getElementById('missionRoot'); if(!root) return;
    var profile=(typeof getProfile==='function' && getProfile());
    if(!profile){ root.innerHTML=noData(); return; }
    root.innerHTML='<div class="mc-empty" style="padding:40px 0;">Loading your mission control…</div>';
    var D;
    try{ D=await MISSION.gather(); }catch(e){ root.innerHTML='<div class="mc-panel span2">'+emptyMsg('Something went wrong loading your data. Refresh to try again.')+'</div>'; return; }
    var render=RENDERERS[key]||renderCommand;
    root.innerHTML = render(D) + MISSION.pilot(key, D);
    wirePilot(key, D);
    if(key==='growth') wireGrowthAI(D);
  };

  window.MISSION = MISSION;
})();
