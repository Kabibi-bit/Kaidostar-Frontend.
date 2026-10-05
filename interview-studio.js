/* ============================================================================
   INTERVIEW STUDIO - Kaidostar's interview prep (the Interview Prep page).

   Part 1 is the ENGINE: pure, deterministic functions (no DOM), unit-testable in
   Node - answer analytics, the built-in judge, JD parsing, interview planning,
   story coverage, consistency checks, delivery maths on raw audio frames,
   session verdicts, progress and readiness.
   Part 2 is the VOICE layer: the browser's speech recognition, speech synthesis
   and Web Audio, wrapped so every call is feature-detected and degrades to
   typing. Part 3 is the UI that mounts into interview-prep.html.

   Honest by construction: delivery numbers are measured, never guessed; every
   quote the AI judge attributes to you is re-checked against your transcript;
   AI rewrites run through the Resume Studio honesty engine so no figure you
   never gave can slip in; and readiness is capped until you've actually been
   judged.
   ========================================================================== */
(function(root){
'use strict';

function RSE(){ return (root && root.RESUME_STUDIO_ENGINE) || null; }

/* ------------------------------------------------------------------ utils */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
function clean(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function words(s){ var c = clean(s); return c ? c.split(' ') : []; }
function cap(s){ s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function uniq(a){ var seen = Object.create(null); return a.filter(function(x){ var k = String(x).toLowerCase(); if(seen[k]) return false; seen[k] = 1; return true; }); }
function uid(p){ return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function round1(n){ return Math.round(n * 10) / 10; }
function avg(a){ a = a.filter(function(x){ return typeof x === 'number' && isFinite(x); }); return a.length ? a.reduce(function(s, x){ return s + x; }, 0) / a.length : null; }
function fmtSecs(s){ s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
function escRe(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function str(v, n){ return (v == null || typeof v === 'object') ? '' : clean(v).slice(0, n || 400); }
function arr(v){ return Array.isArray(v) ? v : []; }
var MAXTXT = 20000;

/* A seeded PRNG so a plan is varied between sessions but reproducible in tests. */
function rng(seed){ var s = (seed >>> 0) || 1; return function(){ s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a, rand){ a = a.slice(); for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* Sentence split that also copes with unpunctuated speech-to-text. The recognizer hands back one run
   with no full stops ("...and sent it the same day the shipment arrived on thursday"), so a run-on is
   read as the thoughts it was spoken in: a new clause starts at a new subject ("I called...", "he now
   pays...", "the queue disappeared"), a jump in time ("two months later") or a question ("what does..."). */
var RUNON_VERB = "(?:\\w{3,}ed|went|came|grew|fell|rose|held|hit|beat|made|got|gave|took|kept|won|became|stayed|cut|met|sold|brought|found|wrote|told|left|paid|stood|ran|began|did|saw|said|was|were|is|are|has|had|now|still|never|always)";
var RUNON_SPLIT_RE = new RegExp(
  "\\s+(?=i\\s+(?!(?:mean|guess|think|suppose)\\b)[a-z])" +
  "|\\s+(?=(?:we|he|she|they)\\s+(?:\\w+ly\\s+|then\\s+|also\\s+|all\\s+|both\\s+)?" + RUNON_VERB + "\\b)" +
  "|\\s+(?=(?:the|our|my|his|her|their|its|everyone|nobody|both)\\s+(?:[\\w'-]+\\s+){0,3}?" + RUNON_VERB + "\\b)" +
  "|\\s+(?=(?:(?:a|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a few|a couple of|several|\\d+)\\s+(?:days?|weeks?|months?|years?)\\s+later|by the end|in the end|after that|since then|from then on|these days|today|now)\\b)" +
  "|\\s+(?=(?:what|how|why|who|where|when|which)(?:'s\\b|\\s+(?:does|do|did|is|are|was|were|would|will|can|could|should|makes|made|happens)\\b))", 'gi');
var RUNON_TIME_ONLY_RE = /^(?:(?:a|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a few|a couple of|several|\d+)\s+(?:days?|weeks?|months?|years?)\s+later|by the end(?: of (?:the |that |my )?\w+)?|in the end|after that|since then|these days|today|now)\W*$/i;
function splitRunOn(p){
  var out = [], last = 0, m, re = new RegExp(RUNON_SPLIT_RE.source, 'gi');
  while((m = re.exec(p))){
    if(m[0] === ''){ re.lastIndex++; continue; }
    // A question starts its own sentence even after a word or two ("yes, two - what does..."); a clause needs 4+ words before it.
    var n0 = words(p.slice(last, m.index)).length, isQ = /^\s+(?:what|how|why|who|where|when|which)\b/i.test(m[0] + p.slice(m.index + m[0].length, m.index + m[0].length + 8));
    if(n0 >= 4 || (isQ && n0 >= 1)){ out.push(p.slice(last, m.index).trim()); last = m.index + m[0].length; }
  }
  var tail = p.slice(last).trim();
  if(tail){ if(out.length && words(tail).length < 3) out[out.length - 1] += ' ' + tail; else out.push(tail); }
  // "...the jams were gone | a few days later": a time phrase that ends the thought belongs to it.
  for(var k = out.length - 1; k > 0; k--){ if(RUNON_TIME_ONLY_RE.test(out[k])){ out[k - 1] += ' ' + out[k]; out.splice(k, 1); } }
  return out;
}
function sentences(text){
  var t = String(text || '').slice(0, MAXTXT).replace(/\r/g, '');
  // A semicolon joins two complete thoughts: each is read as its own sentence.
  var parts = t.split(/(?<=[.!?;])\s+|\n+/).map(clean).filter(Boolean), out = [];
  var runOn = words(t).length >= 12 && !/[.!?;](?=\s+\S)/.test(t);
  function chunked(p){
    var w = words(p);
    if(w.length <= 45){ out.push(p); return; }
    var chunk = [];
    for(var i = 0; i < w.length; i++){
      var lw = w[i].toLowerCase().replace(/[^a-z']/g, '');
      if(chunk.length >= 12 && /^(and|but|so|then|because|which|after|until|once)$/.test(lw) && (w.length - i) >= 6){ out.push(chunk.join(' ')); chunk = []; }
      chunk.push(w[i]);
      if(chunk.length >= 40){ out.push(chunk.join(' ')); chunk = []; }
    }
    if(chunk.length) out.push(chunk.join(' '));
  }
  parts.forEach(function(p){ if(runOn) splitRunOn(p).forEach(chunked); else chunked(p); });
  return out.slice(0, 40);
}

/* ------------------------------------------------- quote verification
   An exact mirror of the backend (app/services/interview_coach.py: _toks,
   _find_seq, verify_quote, _quoted_spans, quotes_ok, scrub, scrub_result) - the
   word lists below are generated from it and parity tests run both on the same
   cases. Rule: words inside quotation marks must really be in the material,
   word for word. */
function mkSet(a){ var o = Object.create(null); a.forEach(function(k){ o[k] = 1; }); return o; }
function mkMap(m){ var o = Object.create(null); Object.keys(m).forEach(function(k){ o[k] = m[k]; }); return o; }
/* Separate pieces of material (two answers, two input fields) are joined with this
   mark: a quote can never run from one piece into the next. */
var SEP = String.fromCharCode(0x241e), BND = '.', HARD = SEP, LINE = String.fromCharCode(0xb6), NEGLEAD = String.fromCharCode(0xac);
// LINE: a line break - a pause a quote may cross, a negation never reaches past. NEGLEAD: a line break into a list
// item under a negated lead-in ("I have never:\n- missed ..."). Pauses rank "," < LINE < NEGLEAD.
var PAUSE_RANK = mkSet([',', LINE, NEGLEAD]); PAUSE_RANK[','] = 1; PAUSE_RANK[LINE] = 2; PAUSE_RANK[NEGLEAD] = 3;
/* One whitespace class for both layers (Python's \s and JS's \s differ at the edges). */
var WS_RE = new RegExp('[\\t\\n\\x0b\\x0c\\r \\x1c-\\x1f' + String.fromCharCode(0x85, 0xa0, 0x1680, 0x2000) + '-' + String.fromCharCode(0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff) + ']+', 'g');
var SENT_END = mkSet(['.', '!', '?', ';']);
var NUM_SMALL = mkMap({"eight": 8, "eighteen": 18, "eleven": 11, "fifteen": 15, "five": 5, "four": 4, "fourteen": 14, "nine": 9, "nineteen": 19, "one": 1, "seven": 7, "seventeen": 17, "six": 6, "sixteen": 16, "ten": 10, "thirteen": 13, "three": 3, "twelve": 12, "two": 2, "zero": 0});
var NUM_TENS = mkMap({"eighty": 80, "fifty": 50, "forty": 40, "ninety": 90, "seventy": 70, "sixty": 60, "thirty": 30, "twenty": 20});
var NUM_SCALES = mkMap({"billion": 1000000000, "million": 1000000, "thousand": 1000});
var NEGATIONS = mkSet(["cannot", "neither", "never", "no", "nobody", "none", "nor", "not", "nothing", "without"]);
var LOADED = mkSet(["accepted", "admitted", "agreed", "all", "allowed", "alone", "always", "angry", "approved", "argued", "awful", "bad", "blame", "blamed", "broke", "broken", "cheat", "cheated", "cost", "crashed", "cut", "deadline", "deadlines", "declined", "denied", "disagreed", "dropped", "ever", "every", "fail", "failed", "failing", "failure", "fake", "faked", "fault", "faults", "fire", "fired", "firing", "forged", "forgot", "fraud", "fudge", "fudged", "hate", "hated", "hates", "he", "her", "hid", "hide", "hiding", "hired", "his", "horrible", "i", "idiot", "idiots", "ignored", "illegal", "incompetent", "laid", "late", "layoff", "layoffs", "lazy", "lead", "least", "led", "less", "liar", "lie", "lied", "lies", "lose", "losing", "loss", "lost", "lying", "managed", "manager", "max", "maximise", "maximize", "maximum", "may", "me", "messed", "might", "min", "minimise", "minimize", "minimum", "missed", "more", "most", "must", "my", "never", "no", "none", "not", "only", "our", "out", "owe", "own", "quit", "quitting", "refused", "rejected", "saved", "screwed", "she", "sole", "solely", "spent", "steal", "stole", "stolen", "stupid", "sued", "terrible", "their", "them", "they", "us", "useless", "we", "won", "worse", "worst", "wrong", "yelled", "you", "your"]);
var GAP_STOP = mkSet(["accepted", "acting", "admitted", "agreed", "aimed", "all", "allegedly", "allowed", "almost", "alone", "although", "always", "angry", "apparently", "apprentice", "approved", "argued", "asked", "assistant", "assisted", "assisting", "associate", "attempt", "attempted", "awful", "bad", "barely", "blame", "blamed", "boss", "broke", "broken", "but", "cannot", "cheat", "cheated", "claimed", "co", "colleague", "colleagues", "cost", "could", "crashed", "cut", "deadline", "deadlines", "declined", "denied", "deputy", "disagreed", "dropped", "ever", "every", "except", "expected", "fail", "failed", "failing", "failure", "fake", "faked", "falsely", "fault", "faults", "fire", "fired", "firing", "forged", "forgot", "fraud", "fudge", "fudged", "hardly", "hate", "hated", "hates", "he", "help", "helped", "helping", "helps", "her", "hid", "hide", "hiding", "hired", "his", "hope", "hoped", "hopes", "horrible", "however", "i", "idiot", "idiots", "if", "ignored", "illegal", "incompetent", "instead", "intended", "interim", "intern", "interns", "jointly", "junior", "laid", "late", "layoff", "layoffs", "lazy", "lead", "least", "led", "less", "liar", "lie", "lied", "lies", "likely", "lose", "losing", "loss", "lost", "lying", "managed", "manager", "max", "maximise", "maximize", "maximum", "may", "maybe", "me", "meant", "messed", "might", "min", "minimise", "minimize", "minimum", "missed", "more", "most", "must", "my", "nearly", "neither", "never", "no", "nobody", "none", "nor", "not", "nothing", "only", "our", "out", "owe", "own", "partially", "partly", "perhaps", "plan", "planned", "plans", "possibly", "pretend", "pretended", "probably", "quit", "quitting", "rarely", "refused", "rejected", "reportedly", "said", "saved", "screwed", "seldom", "shadowed", "shadowing", "she", "should", "sole", "solely", "spent", "steal", "stole", "stolen", "stupid", "sub", "sued", "supported", "supposed", "supposedly", "team", "teammate", "teammates", "temp", "temporary", "terrible", "their", "them", "they", "told", "trainee", "tried", "tries", "try", "trying", "unless", "unlikely", "us", "useless", "vice", "want", "wanted", "wants", "we", "wish", "wished", "without", "won", "worse", "worst", "would", "wrong", "yelled", "you", "your"]);
var FILLER_TOKS = mkSet(["basically", "erm", "hmm", "literally", "mhm", "mm", "uh", "uhh", "uhm", "um", "umm"]);
var SOFT1 = mkSet(["actually", "like", "so"]);
var SOFT2 = mkSet(["i mean", "you know"]);
var LIKE_SUBJ = mkSet(["also", "always", "can", "could", "definitely", "did", "do", "does", "genuinely", "he", "i", "it", "just", "may", "might", "must", "never", "not", "really", "she", "should", "still", "they", "to", "totally", "truly", "we", "will", "would", "you"]);
var LIKE_OBJ = mkSet(["a", "all", "an", "any", "being", "both", "doing", "each", "every", "having", "her", "him", "his", "how", "it", "its", "me", "more", "most", "my", "our", "some", "that", "the", "their", "them", "these", "this", "those", "to", "us", "what", "when", "where", "working", "you", "your"]);
var ABBREV = mkSet(["approx", "apr", "aug", "co", "dec", "dept", "dr", "est", "etc", "feb", "fig", "fri", "inc", "jan", "jr", "jul", "jun", "ltd", "mar", "mon", "mr", "mrs", "ms", "nov", "oct", "sep", "sept", "sr", "st", "thu", "tue", "vs"]);
var CONTRACT_WORDS = mkMap({"aint": "is not", "arent": "are not", "cannot": "can not", "cant": "can not", "couldnt": "could not", "couldve": "could have", "didnt": "did not", "doesnt": "does not", "dont": "do not", "hadnt": "had not", "hasnt": "has not", "havent": "have not", "heres": "here is", "hes": "he is", "hows": "how is", "im": "i am", "isnt": "is not", "itll": "it will", "ive": "i have", "mustnt": "must not", "neednt": "need not", "okay": "ok", "shes": "she is", "shouldnt": "should not", "shouldve": "should have", "thats": "that is", "theres": "there is", "theyd": "they would", "theyll": "they will", "theyre": "they are", "theyve": "they have", "wasnt": "was not", "werent": "were not", "weve": "we have", "whats": "what is", "wheres": "where is", "whos": "who is", "wont": "will not", "wouldnt": "would not", "wouldve": "would have", "youd": "you would", "youll": "you will", "youre": "you are", "youve": "you have"});
var UNIT_TOKS = mkMap({"bucks": "usd", "dollar": "usd", "dollars": "usd", "pct": "pct", "percent": "pct", "usd": "usd"});
var DOLLAR_SCALE = mkMap({"b": " billion", "billion": " billion", "bn": " billion", "k": "k", "m": " million", "million": " million", "mm": " million", "thousand": " thousand"});
var SUFFIX_SCALE = mkMap({"bn": 1000000000, "k": 1000, "m": 1000000, "mm": 1000000});
var NON_ANSWER_FILLERS = mkSet(["ah", "eh", "er", "erm", "hm", "hmm", "mhm", "mm", "uh", "uhh", "uhm", "um", "umm"]);
var NON_ANSWERS = mkSet(["can we skip this", "can we skip this one", "dunno", "i am not sure", "i cannot answer that", "i cant answer that", "i do not know", "i dont have an answer", "i dont know", "i have no idea", "i pass", "i will pass", "idk", "ill pass", "im not sure", "lets skip this", "lets skip this one", "n a", "na", "next", "next one", "next one please", "next please", "next question", "next question please", "no answer", "no comment", "no idea", "not sure", "nothing", "pass", "pass please", "skip", "skip please", "skip this one", "skip this question", "sorry", "sorry i dont know"]);
var NON_ANSWER_SOFT = mkSet(["actually", "afraid", "but", "hmm", "honestly", "i", "id", "ill", "im", "it", "ive", "just", "oh", "ok", "okay", "one", "please", "really", "so", "sorry", "that", "this", "uh", "um", "well", "yeah"]), NON_ANSWER_CORES = mkSet(["can not answer", "can not think of", "can skip", "can we move on", "can we skip", "cannot answer", "cannot think of", "cant answer", "cant think of", "cant think of any", "do not have an example", "do not know", "dont have an example", "dont have any examples", "dont know", "dunno", "have no example", "have no examples", "idk", "lets move on", "move on", "nah", "next", "next please", "next question", "no", "no answer", "no comment", "no example", "no examples", "no idea", "nope", "not sure", "nothing", "nothing comes to mind", "pass", "pass on", "pass please", "rather not", "rather not answer", "rather not say", "skip", "skip question", "will pass", "would rather not answer", "would rather not say"]);
var LIT_OK = mkSet(["\u00a0", "\u00b7", "\u1680", "\u2000", "\u2001", "\u2002", "\u2003", "\u2004", "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200a", "\u200b", "\u200c", "\u200d", "\u2010", "\u2011", "\u2012", "\u2013", "\u2014", "\u2015", "\u2022", "\u2026", "\u202f", "\u205f", "\u2060", "\u2212", "\u241e", "\u3000", "\ufeff"]);
var DQ_RE = /[\u0022\u201c\u201d\u201e\u201f\u00ab\u00bb\u2033\uff02\u300c\u300d\u300e\u300f\u275d\u275e\u301d\u301e\u301f\u300a\u300b\uff62\uff63\u05f4\u3008\u3009\u27e8\u27e9\u2036\u2037\u02ba\u02dd\ufe41\ufe42\ufe43\ufe44\u2e42\u3003\u02ee\u2034\u2760\u2057]/g;
var DQ_ASTRAL_RE = /\ud83d\ude76|\ud83d\ude77|\ud83d\ude78/g;
var SQ_RE = /[\u2018\u2019\u201a\u201b\u2039\u203a\u2032\uff07\u0060\u275b\u275c\u02bb\u02bc\u00b4\u276e\u276f\u2035\uff40\u05f3\u2e0c\u2e0d\u2e02\u2e03\u02cb\u02ca\u02b9\u275f]/g;
var ATTRIB_RE = new RegExp("\\b(?:said|says|stated|states|wrote|writes|replied|replies|answered|mentioned|mentions|claimed|claims|admitted|admits|insisted|confessed|responded|explained|noted|added|argued|boasted|told(?:[ \\t\\n\\r\\f\\v]+[a-z]+){1,3}|kept saying|keep saying|quote|quoting|phrased?|called it|described it as|put it|used the words|in your (?:own )?words|said it yourself|heard|hear)(?:\\W+\\w+){0,5}\\W{0,12}$", 'i');
var SUGGEST_RE = new RegExp("\\b(?:say|saying|try|trying|instead(?: of)?|rather than|rephrase(?: it)?(?: as)?|reword(?: it)?(?: as)?|replace(?: it| that| this)?(?: with)?|swap(?: it| that| this)?(?: for| with)?|use|using|(?:lead|open|start|end|close|finish) with(?: (?:the|a|an|your|this|that|one) [a-z]+)?|frame it(?: as)?|phrase it(?: as)?|put it as|something like|eg|ie|for example|for instance|such as|like|like this|like so|this way|as follows|a line like|words like|aim for|go with|script|could say|might say|would say|can say|should say|avoid|drop|cut|lose|skip|remove|stop saying|don't say|never say|rewrite|rewritten|(?:better|stronger|tighter|cleaner|sharper|shorter|clearer|simpler)|(?:better|stronger|tighter|cleaner|sharper|shorter|clearer|simpler|honest|good|great) (?:answer|line|version|opener|close|closing|sentence|way to say it|phrasing)(?: (?:is|would be|could be|reads|goes))?)\\W{0,6}$", 'i');

var FIRST_PERSON_RE = new RegExp("^\\W*(?:i|i'm|i've|i'd|i'll|im|ive|my|me|we|we're|we've|our|us)\\b", 'i');
var SINGLE_SPAN_RE = new RegExp("(?<![a-z0-9])'((?:[^'\\n]|(?<=[a-z])'(?=[a-z]))+?)(?:'(?![a-z0-9])|(?=\\n)|$)", 'gi');

var WINDOW_RE = new RegExp("\\b(?:(?:in|within|over|during|for)[ \\t\\n\\r\\f\\v]+)?(?:(?:the|a|an)[ \\t\\n\\r\\f\\v]+(?:first|initial|opening)|(?:your|my)[ \\t\\n\\r\\f\\v]+(?:first|next|initial|opening|coming))[ \\t\\n\\r\\f\\v]+(?:few[ \\t\\n\\r\\f\\v]+)?(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|forty-five|fifty|sixty|ninety|hundred)(?:[ \\t\\n\\r\\f\\v]*(?:-|to|/|or)[ \\t\\n\\r\\f\\v]*(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|forty-five|fifty|sixty|ninety|hundred))*[ \\t\\n\\r\\f\\v]*-?[ \\t\\n\\r\\f\\v]*(?:days?|weeks?|months?|quarters?|years?)\\b(?![ \\t\\n\\r\\f\\v]+of\\b)|\\b\\d+(?:[ \\t\\n\\r\\f\\v]*[-/][ \\t\\n\\r\\f\\v]*\\d+)+[ \\t\\n\\r\\f\\v]*-?[ \\t\\n\\r\\f\\v]*days?(?:[ \\t\\n\\r\\f\\v]+plan)?\\b", 'gi');
var APOS = [[/\b(can)'t\b/g, '$1 not'], [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'], [/\bain't\b/g, 'is not'],
            [/n't\b/g, ' not'], [/'m\b/g, ' am'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'],
            // "it's" and "let's" only with the apostrophe: "its" and "lets" are words of their own
            [/\blet's\b/g, 'let us'], [/\b(it|that|what|there|here|who|how|where|he|she)'s\b/g, '$1 is']];
/* Letters (and their marks) of every script are word characters, so "culpó" is not
   "culpé" and "Renée" is one word the normal rules apply to. The classes are spelled
   out (generated from the server's Unicode 14 categories L* and M*) so both layers
   use exactly the same ones. Scripts written without spaces are matched literally. */
var LET = "\\u00aa\\u00b5\\u00ba\\u00c0-\\u00d6\\u00d8-\\u00f6\\u00f8-\\u02c1\\u02c6-\\u02d1\\u02e0-\\u02e4\\u02ec\\u02ee\\u0300-\\u0374\\u0376\\u0377\\u037a-\\u037d\\u037f\\u0386\\u0388-\\u038a\\u038c\\u038e-\\u03a1\\u03a3-\\u03f5\\u03f7-\\u0481\\u0483-\\u052f\\u0531-\\u0556\\u0559\\u0560-\\u0588\\u0591-\\u05bd\\u05bf\\u05c1\\u05c2\\u05c4\\u05c5\\u05c7\\u05d0-\\u05ea\\u05ef-\\u05f2\\u0610-\\u061a\\u0620-\\u065f\\u066e-\\u06d3\\u06d5-\\u06dc\\u06df-\\u06e8\\u06ea-\\u06ef\\u06fa-\\u06fc\\u06ff\\u0710-\\u074a\\u074d-\\u07b1\\u07ca-\\u07f5\\u07fa\\u07fd\\u0800-\\u082d\\u0840-\\u085b\\u0860-\\u086a\\u0870-\\u0887\\u0889-\\u088e\\u0898-\\u08e1\\u08e3-\\u0963\\u0971-\\u0983\\u0985-\\u098c\\u098f\\u0990\\u0993-\\u09a8\\u09aa-\\u09b0\\u09b2\\u09b6-\\u09b9\\u09bc-\\u09c4\\u09c7\\u09c8\\u09cb-\\u09ce\\u09d7\\u09dc\\u09dd\\u09df-\\u09e3\\u09f0\\u09f1\\u09fc\\u09fe\\u0a01-\\u0a03\\u0a05-\\u0a0a\\u0a0f\\u0a10\\u0a13-\\u0a28\\u0a2a-\\u0a30\\u0a32\\u0a33\\u0a35\\u0a36\\u0a38\\u0a39\\u0a3c\\u0a3e-\\u0a42\\u0a47\\u0a48\\u0a4b-\\u0a4d\\u0a51\\u0a59-\\u0a5c\\u0a5e\\u0a70-\\u0a75\\u0a81-\\u0a83\\u0a85-\\u0a8d\\u0a8f-\\u0a91\\u0a93-\\u0aa8\\u0aaa-\\u0ab0\\u0ab2\\u0ab3\\u0ab5-\\u0ab9\\u0abc-\\u0ac5\\u0ac7-\\u0ac9\\u0acb-\\u0acd\\u0ad0\\u0ae0-\\u0ae3\\u0af9-\\u0aff\\u0b01-\\u0b03\\u0b05-\\u0b0c\\u0b0f\\u0b10\\u0b13-\\u0b28\\u0b2a-\\u0b30\\u0b32\\u0b33\\u0b35-\\u0b39\\u0b3c-\\u0b44\\u0b47\\u0b48\\u0b4b-\\u0b4d\\u0b55-\\u0b57\\u0b5c\\u0b5d\\u0b5f-\\u0b63\\u0b71\\u0b82\\u0b83\\u0b85-\\u0b8a\\u0b8e-\\u0b90\\u0b92-\\u0b95\\u0b99\\u0b9a\\u0b9c\\u0b9e\\u0b9f\\u0ba3\\u0ba4\\u0ba8-\\u0baa\\u0bae-\\u0bb9\\u0bbe-\\u0bc2\\u0bc6-\\u0bc8\\u0bca-\\u0bcd\\u0bd0\\u0bd7\\u0c00-\\u0c0c\\u0c0e-\\u0c10\\u0c12-\\u0c28\\u0c2a-\\u0c39\\u0c3c-\\u0c44\\u0c46-\\u0c48\\u0c4a-\\u0c4d\\u0c55\\u0c56\\u0c58-\\u0c5a\\u0c5d\\u0c60-\\u0c63\\u0c80-\\u0c83\\u0c85-\\u0c8c\\u0c8e-\\u0c90\\u0c92-\\u0ca8\\u0caa-\\u0cb3\\u0cb5-\\u0cb9\\u0cbc-\\u0cc4\\u0cc6-\\u0cc8\\u0cca-\\u0ccd\\u0cd5\\u0cd6\\u0cdd\\u0cde\\u0ce0-\\u0ce3\\u0cf1\\u0cf2\\u0d00-\\u0d0c\\u0d0e-\\u0d10\\u0d12-\\u0d44\\u0d46-\\u0d48\\u0d4a-\\u0d4e\\u0d54-\\u0d57\\u0d5f-\\u0d63\\u0d7a-\\u0d7f\\u0d81-\\u0d83\\u0d85-\\u0d96\\u0d9a-\\u0db1\\u0db3-\\u0dbb\\u0dbd\\u0dc0-\\u0dc6\\u0dca\\u0dcf-\\u0dd4\\u0dd6\\u0dd8-\\u0ddf\\u0df2\\u0df3\\u0e01-\\u0e3a\\u0e40-\\u0e4e\\u0e81\\u0e82\\u0e84\\u0e86-\\u0e8a\\u0e8c-\\u0ea3\\u0ea5\\u0ea7-\\u0ebd\\u0ec0-\\u0ec4\\u0ec6\\u0ec8-\\u0ecd\\u0edc-\\u0edf\\u0f00\\u0f18\\u0f19\\u0f35\\u0f37\\u0f39\\u0f3e-\\u0f47\\u0f49-\\u0f6c\\u0f71-\\u0f84\\u0f86-\\u0f97\\u0f99-\\u0fbc\\u0fc6\\u1000-\\u103f\\u1050-\\u108f\\u109a-\\u109d\\u10a0-\\u10c5\\u10c7\\u10cd\\u10d0-\\u10fa\\u10fc-\\u1248\\u124a-\\u124d\\u1250-\\u1256\\u1258\\u125a-\\u125d\\u1260-\\u1288\\u128a-\\u128d\\u1290-\\u12b0\\u12b2-\\u12b5\\u12b8-\\u12be\\u12c0\\u12c2-\\u12c5\\u12c8-\\u12d6\\u12d8-\\u1310\\u1312-\\u1315\\u1318-\\u135a\\u135d-\\u135f\\u1380-\\u138f\\u13a0-\\u13f5\\u13f8-\\u13fd\\u1401-\\u166c\\u166f-\\u167f\\u1681-\\u169a\\u16a0-\\u16ea\\u16f1-\\u16f8\\u1700-\\u1715\\u171f-\\u1734\\u1740-\\u1753\\u1760-\\u176c\\u176e-\\u1770\\u1772\\u1773\\u1780-\\u17d3\\u17d7\\u17dc\\u17dd\\u180b-\\u180d\\u180f\\u1820-\\u1878\\u1880-\\u18aa\\u18b0-\\u18f5\\u1900-\\u191e\\u1920-\\u192b\\u1930-\\u193b\\u1950-\\u196d\\u1970-\\u1974\\u1980-\\u19ab\\u19b0-\\u19c9\\u1a00-\\u1a1b\\u1a20-\\u1a5e\\u1a60-\\u1a7c\\u1a7f\\u1aa7\\u1ab0-\\u1ace\\u1b00-\\u1b4c\\u1b6b-\\u1b73\\u1b80-\\u1baf\\u1bba-\\u1bf3\\u1c00-\\u1c37\\u1c4d-\\u1c4f\\u1c5a-\\u1c7d\\u1c80-\\u1c88\\u1c90-\\u1cba\\u1cbd-\\u1cbf\\u1cd0-\\u1cd2\\u1cd4-\\u1cfa\\u1d00-\\u1f15\\u1f18-\\u1f1d\\u1f20-\\u1f45\\u1f48-\\u1f4d\\u1f50-\\u1f57\\u1f59\\u1f5b\\u1f5d\\u1f5f-\\u1f7d\\u1f80-\\u1fb4\\u1fb6-\\u1fbc\\u1fbe\\u1fc2-\\u1fc4\\u1fc6-\\u1fcc\\u1fd0-\\u1fd3\\u1fd6-\\u1fdb\\u1fe0-\\u1fec\\u1ff2-\\u1ff4\\u1ff6-\\u1ffc\\u2071\\u207f\\u2090-\\u209c\\u20d0-\\u20f0\\u2102\\u2107\\u210a-\\u2113\\u2115\\u2119-\\u211d\\u2124\\u2126\\u2128\\u212a-\\u212d\\u212f-\\u2139\\u213c-\\u213f\\u2145-\\u2149\\u214e\\u2183\\u2184\\u2c00-\\u2ce4\\u2ceb-\\u2cf3\\u2d00-\\u2d25\\u2d27\\u2d2d\\u2d30-\\u2d67\\u2d6f\\u2d7f-\\u2d96\\u2da0-\\u2da6\\u2da8-\\u2dae\\u2db0-\\u2db6\\u2db8-\\u2dbe\\u2dc0-\\u2dc6\\u2dc8-\\u2dce\\u2dd0-\\u2dd6\\u2dd8-\\u2dde\\u2de0-\\u2dff\\u2e2f\\u3005\\u3006\\u302a-\\u302f\\u3031-\\u3035\\u303b\\u303c\\u3041-\\u3096\\u3099\\u309a\\u309d-\\u309f\\u30a1-\\u30fa\\u30fc-\\u30ff\\u3105-\\u312f\\u3131-\\u318e\\u31a0-\\u31bf\\u31f0-\\u31ff\\u3400-\\u4dbf\\u4e00-\\ua48c\\ua4d0-\\ua4fd\\ua500-\\ua60c\\ua610-\\ua61f\\ua62a\\ua62b\\ua640-\\ua672\\ua674-\\ua67d\\ua67f-\\ua6e5\\ua6f0\\ua6f1\\ua717-\\ua71f\\ua722-\\ua788\\ua78b-\\ua7ca\\ua7d0\\ua7d1\\ua7d3\\ua7d5-\\ua7d9\\ua7f2-\\ua827\\ua82c\\ua840-\\ua873\\ua880-\\ua8c5\\ua8e0-\\ua8f7\\ua8fb\\ua8fd-\\ua8ff\\ua90a-\\ua92d\\ua930-\\ua953\\ua960-\\ua97c\\ua980-\\ua9c0\\ua9cf\\ua9e0-\\ua9ef\\ua9fa-\\ua9fe\\uaa00-\\uaa36\\uaa40-\\uaa4d\\uaa60-\\uaa76\\uaa7a-\\uaac2\\uaadb-\\uaadd\\uaae0-\\uaaef\\uaaf2-\\uaaf6\\uab01-\\uab06\\uab09-\\uab0e\\uab11-\\uab16\\uab20-\\uab26\\uab28-\\uab2e\\uab30-\\uab5a\\uab5c-\\uab69\\uab70-\\uabea\\uabec\\uabed\\uac00-\\ud7a3\\ud7b0-\\ud7c6\\ud7cb-\\ud7fb\\uf900-\\ufa6d\\ufa70-\\ufad9\\ufb00-\\ufb06\\ufb13-\\ufb17\\ufb1d-\\ufb28\\ufb2a-\\ufb36\\ufb38-\\ufb3c\\ufb3e\\ufb40\\ufb41\\ufb43\\ufb44\\ufb46-\\ufbb1\\ufbd3-\\ufd3d\\ufd50-\\ufd8f\\ufd92-\\ufdc7\\ufdf0-\\ufdfb\\ufe00-\\ufe0f\\ufe20-\\ufe2f\\ufe70-\\ufe74\\ufe76-\\ufefc\\uff21-\\uff3a\\uff41-\\uff5a\\uff66-\\uffbe\\uffc2-\\uffc7\\uffca-\\uffcf\\uffd2-\\uffd7\\uffda-\\uffdc\\u{10000}-\\u{1000b}\\u{1000d}-\\u{10026}\\u{10028}-\\u{1003a}\\u{1003c}\\u{1003d}\\u{1003f}-\\u{1004d}\\u{10050}-\\u{1005d}\\u{10080}-\\u{100fa}\\u{101fd}\\u{10280}-\\u{1029c}\\u{102a0}-\\u{102d0}\\u{102e0}\\u{10300}-\\u{1031f}\\u{1032d}-\\u{10340}\\u{10342}-\\u{10349}\\u{10350}-\\u{1037a}\\u{10380}-\\u{1039d}\\u{103a0}-\\u{103c3}\\u{103c8}-\\u{103cf}\\u{10400}-\\u{1049d}\\u{104b0}-\\u{104d3}\\u{104d8}-\\u{104fb}\\u{10500}-\\u{10527}\\u{10530}-\\u{10563}\\u{10570}-\\u{1057a}\\u{1057c}-\\u{1058a}\\u{1058c}-\\u{10592}\\u{10594}\\u{10595}\\u{10597}-\\u{105a1}\\u{105a3}-\\u{105b1}\\u{105b3}-\\u{105b9}\\u{105bb}\\u{105bc}\\u{10600}-\\u{10736}\\u{10740}-\\u{10755}\\u{10760}-\\u{10767}\\u{10780}-\\u{10785}\\u{10787}-\\u{107b0}\\u{107b2}-\\u{107ba}\\u{10800}-\\u{10805}\\u{10808}\\u{1080a}-\\u{10835}\\u{10837}\\u{10838}\\u{1083c}\\u{1083f}-\\u{10855}\\u{10860}-\\u{10876}\\u{10880}-\\u{1089e}\\u{108e0}-\\u{108f2}\\u{108f4}\\u{108f5}\\u{10900}-\\u{10915}\\u{10920}-\\u{10939}\\u{10980}-\\u{109b7}\\u{109be}\\u{109bf}\\u{10a00}-\\u{10a03}\\u{10a05}\\u{10a06}\\u{10a0c}-\\u{10a13}\\u{10a15}-\\u{10a17}\\u{10a19}-\\u{10a35}\\u{10a38}-\\u{10a3a}\\u{10a3f}\\u{10a60}-\\u{10a7c}\\u{10a80}-\\u{10a9c}\\u{10ac0}-\\u{10ac7}\\u{10ac9}-\\u{10ae6}\\u{10b00}-\\u{10b35}\\u{10b40}-\\u{10b55}\\u{10b60}-\\u{10b72}\\u{10b80}-\\u{10b91}\\u{10c00}-\\u{10c48}\\u{10c80}-\\u{10cb2}\\u{10cc0}-\\u{10cf2}\\u{10d00}-\\u{10d27}\\u{10e80}-\\u{10ea9}\\u{10eab}\\u{10eac}\\u{10eb0}\\u{10eb1}\\u{10f00}-\\u{10f1c}\\u{10f27}\\u{10f30}-\\u{10f50}\\u{10f70}-\\u{10f85}\\u{10fb0}-\\u{10fc4}\\u{10fe0}-\\u{10ff6}\\u{11000}-\\u{11046}\\u{11070}-\\u{11075}\\u{1107f}-\\u{110ba}\\u{110c2}\\u{110d0}-\\u{110e8}\\u{11100}-\\u{11134}\\u{11144}-\\u{11147}\\u{11150}-\\u{11173}\\u{11176}\\u{11180}-\\u{111c4}\\u{111c9}-\\u{111cc}\\u{111ce}\\u{111cf}\\u{111da}\\u{111dc}\\u{11200}-\\u{11211}\\u{11213}-\\u{11237}\\u{1123e}\\u{11280}-\\u{11286}\\u{11288}\\u{1128a}-\\u{1128d}\\u{1128f}-\\u{1129d}\\u{1129f}-\\u{112a8}\\u{112b0}-\\u{112ea}\\u{11300}-\\u{11303}\\u{11305}-\\u{1130c}\\u{1130f}\\u{11310}\\u{11313}-\\u{11328}\\u{1132a}-\\u{11330}\\u{11332}\\u{11333}\\u{11335}-\\u{11339}\\u{1133b}-\\u{11344}\\u{11347}\\u{11348}\\u{1134b}-\\u{1134d}\\u{11350}\\u{11357}\\u{1135d}-\\u{11363}\\u{11366}-\\u{1136c}\\u{11370}-\\u{11374}\\u{11400}-\\u{1144a}\\u{1145e}-\\u{11461}\\u{11480}-\\u{114c5}\\u{114c7}\\u{11580}-\\u{115b5}\\u{115b8}-\\u{115c0}\\u{115d8}-\\u{115dd}\\u{11600}-\\u{11640}\\u{11644}\\u{11680}-\\u{116b8}\\u{11700}-\\u{1171a}\\u{1171d}-\\u{1172b}\\u{11740}-\\u{11746}\\u{11800}-\\u{1183a}\\u{118a0}-\\u{118df}\\u{118ff}-\\u{11906}\\u{11909}\\u{1190c}-\\u{11913}\\u{11915}\\u{11916}\\u{11918}-\\u{11935}\\u{11937}\\u{11938}\\u{1193b}-\\u{11943}\\u{119a0}-\\u{119a7}\\u{119aa}-\\u{119d7}\\u{119da}-\\u{119e1}\\u{119e3}\\u{119e4}\\u{11a00}-\\u{11a3e}\\u{11a47}\\u{11a50}-\\u{11a99}\\u{11a9d}\\u{11ab0}-\\u{11af8}\\u{11c00}-\\u{11c08}\\u{11c0a}-\\u{11c36}\\u{11c38}-\\u{11c40}\\u{11c72}-\\u{11c8f}\\u{11c92}-\\u{11ca7}\\u{11ca9}-\\u{11cb6}\\u{11d00}-\\u{11d06}\\u{11d08}\\u{11d09}\\u{11d0b}-\\u{11d36}\\u{11d3a}\\u{11d3c}\\u{11d3d}\\u{11d3f}-\\u{11d47}\\u{11d60}-\\u{11d65}\\u{11d67}\\u{11d68}\\u{11d6a}-\\u{11d8e}\\u{11d90}\\u{11d91}\\u{11d93}-\\u{11d98}\\u{11ee0}-\\u{11ef6}\\u{11fb0}\\u{12000}-\\u{12399}\\u{12480}-\\u{12543}\\u{12f90}-\\u{12ff0}\\u{13000}-\\u{1342e}\\u{14400}-\\u{14646}\\u{16800}-\\u{16a38}\\u{16a40}-\\u{16a5e}\\u{16a70}-\\u{16abe}\\u{16ad0}-\\u{16aed}\\u{16af0}-\\u{16af4}\\u{16b00}-\\u{16b36}\\u{16b40}-\\u{16b43}\\u{16b63}-\\u{16b77}\\u{16b7d}-\\u{16b8f}\\u{16e40}-\\u{16e7f}\\u{16f00}-\\u{16f4a}\\u{16f4f}-\\u{16f87}\\u{16f8f}-\\u{16f9f}\\u{16fe0}\\u{16fe1}\\u{16fe3}\\u{16fe4}\\u{16ff0}\\u{16ff1}\\u{17000}-\\u{187f7}\\u{18800}-\\u{18cd5}\\u{18d00}-\\u{18d08}\\u{1aff0}-\\u{1aff3}\\u{1aff5}-\\u{1affb}\\u{1affd}\\u{1affe}\\u{1b000}-\\u{1b122}\\u{1b150}-\\u{1b152}\\u{1b164}-\\u{1b167}\\u{1b170}-\\u{1b2fb}\\u{1bc00}-\\u{1bc6a}\\u{1bc70}-\\u{1bc7c}\\u{1bc80}-\\u{1bc88}\\u{1bc90}-\\u{1bc99}\\u{1bc9d}\\u{1bc9e}\\u{1cf00}-\\u{1cf2d}\\u{1cf30}-\\u{1cf46}\\u{1d165}-\\u{1d169}\\u{1d16d}-\\u{1d172}\\u{1d17b}-\\u{1d182}\\u{1d185}-\\u{1d18b}\\u{1d1aa}-\\u{1d1ad}\\u{1d242}-\\u{1d244}\\u{1d400}-\\u{1d454}\\u{1d456}-\\u{1d49c}\\u{1d49e}\\u{1d49f}\\u{1d4a2}\\u{1d4a5}\\u{1d4a6}\\u{1d4a9}-\\u{1d4ac}\\u{1d4ae}-\\u{1d4b9}\\u{1d4bb}\\u{1d4bd}-\\u{1d4c3}\\u{1d4c5}-\\u{1d505}\\u{1d507}-\\u{1d50a}\\u{1d50d}-\\u{1d514}\\u{1d516}-\\u{1d51c}\\u{1d51e}-\\u{1d539}\\u{1d53b}-\\u{1d53e}\\u{1d540}-\\u{1d544}\\u{1d546}\\u{1d54a}-\\u{1d550}\\u{1d552}-\\u{1d6a5}\\u{1d6a8}-\\u{1d6c0}\\u{1d6c2}-\\u{1d6da}\\u{1d6dc}-\\u{1d6fa}\\u{1d6fc}-\\u{1d714}\\u{1d716}-\\u{1d734}\\u{1d736}-\\u{1d74e}\\u{1d750}-\\u{1d76e}\\u{1d770}-\\u{1d788}\\u{1d78a}-\\u{1d7a8}\\u{1d7aa}-\\u{1d7c2}\\u{1d7c4}-\\u{1d7cb}\\u{1da00}-\\u{1da36}\\u{1da3b}-\\u{1da6c}\\u{1da75}\\u{1da84}\\u{1da9b}-\\u{1da9f}\\u{1daa1}-\\u{1daaf}\\u{1df00}-\\u{1df1e}\\u{1e000}-\\u{1e006}\\u{1e008}-\\u{1e018}\\u{1e01b}-\\u{1e021}\\u{1e023}\\u{1e024}\\u{1e026}-\\u{1e02a}\\u{1e100}-\\u{1e12c}\\u{1e130}-\\u{1e13d}\\u{1e14e}\\u{1e290}-\\u{1e2ae}\\u{1e2c0}-\\u{1e2ef}\\u{1e7e0}-\\u{1e7e6}\\u{1e7e8}-\\u{1e7eb}\\u{1e7ed}\\u{1e7ee}\\u{1e7f0}-\\u{1e7fe}\\u{1e800}-\\u{1e8c4}\\u{1e8d0}-\\u{1e8d6}\\u{1e900}-\\u{1e94b}\\u{1ee00}-\\u{1ee03}\\u{1ee05}-\\u{1ee1f}\\u{1ee21}\\u{1ee22}\\u{1ee24}\\u{1ee27}\\u{1ee29}-\\u{1ee32}\\u{1ee34}-\\u{1ee37}\\u{1ee39}\\u{1ee3b}\\u{1ee42}\\u{1ee47}\\u{1ee49}\\u{1ee4b}\\u{1ee4d}-\\u{1ee4f}\\u{1ee51}\\u{1ee52}\\u{1ee54}\\u{1ee57}\\u{1ee59}\\u{1ee5b}\\u{1ee5d}\\u{1ee5f}\\u{1ee61}\\u{1ee62}\\u{1ee64}\\u{1ee67}-\\u{1ee6a}\\u{1ee6c}-\\u{1ee72}\\u{1ee74}-\\u{1ee77}\\u{1ee79}-\\u{1ee7c}\\u{1ee7e}\\u{1ee80}-\\u{1ee89}\\u{1ee8b}-\\u{1ee9b}\\u{1eea1}-\\u{1eea3}\\u{1eea5}-\\u{1eea9}\\u{1eeab}-\\u{1eebb}\\u{20000}-\\u{2a6df}\\u{2a700}-\\u{2b738}\\u{2b740}-\\u{2b81d}\\u{2b820}-\\u{2cea1}\\u{2ceb0}-\\u{2ebe0}\\u{2f800}-\\u{2fa1d}\\u{30000}-\\u{3134a}\\u{e0100}-\\u{e01ef}";
var NOSPACE = "\\u0e00-\\u0e7f\\u0e80-\\u0eff\\u0f00-\\u0fff\\u1000-\\u109f\\u1780-\\u17ff\\u19e0-\\u19ff\\u2e80-\\u2fdf\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303c\\u3040-\\u30ff\\u3100-\\u312f\\u31a0-\\u31bf\\u31f0-\\u31ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\ua000-\\ua4cf\\uf900-\\ufaff\\uff66-\\uff9f\\u{16fe0}-\\u{16fff}\\u{17000}-\\u{18d8f}\\u{1b000}-\\u{1b16f}\\u{20000}-\\u{2fa1f}\\u{30000}-\\u{323af}";
var LETTER_RE = new RegExp('[' + LET + ']', 'u'), NOSPACE_RE = new RegExp('[' + NOSPACE + ']', 'u');
/* Numbers of every script (Unicode 14 N*), pinned like LET so both layers agree on what
   counts as a letter or digit whatever Unicode version the browser has. */
var NUM = "\\u00b2\\u00b3\\u00b9\\u00bc-\\u00be\\u0660-\\u0669\\u06f0-\\u06f9\\u07c0-\\u07c9\\u0966-\\u096f\\u09e6-\\u09ef\\u09f4-\\u09f9\\u0a66-\\u0a6f\\u0ae6-\\u0aef\\u0b66-\\u0b6f\\u0b72-\\u0b77\\u0be6-\\u0bf2\\u0c66-\\u0c6f\\u0c78-\\u0c7e\\u0ce6-\\u0cef\\u0d58-\\u0d5e\\u0d66-\\u0d78\\u0de6-\\u0def\\u0e50-\\u0e59\\u0ed0-\\u0ed9\\u0f20-\\u0f33\\u1040-\\u1049\\u1090-\\u1099\\u1369-\\u137c\\u16ee-\\u16f0\\u17e0-\\u17e9\\u17f0-\\u17f9\\u1810-\\u1819\\u1946-\\u194f\\u19d0-\\u19da\\u1a80-\\u1a89\\u1a90-\\u1a99\\u1b50-\\u1b59\\u1bb0-\\u1bb9\\u1c40-\\u1c49\\u1c50-\\u1c59\\u2070\\u2074-\\u2079\\u2080-\\u2089\\u2150-\\u2182\\u2185-\\u2189\\u2460-\\u249b\\u24ea-\\u24ff\\u2776-\\u2793\\u2cfd\\u3007\\u3021-\\u3029\\u3038-\\u303a\\u3192-\\u3195\\u3220-\\u3229\\u3248-\\u324f\\u3251-\\u325f\\u3280-\\u3289\\u32b1-\\u32bf\\ua620-\\ua629\\ua6e6-\\ua6ef\\ua830-\\ua835\\ua8d0-\\ua8d9\\ua900-\\ua909\\ua9d0-\\ua9d9\\ua9f0-\\ua9f9\\uaa50-\\uaa59\\uabf0-\\uabf9\\uff10-\\uff19\\u{10107}-\\u{10133}\\u{10140}-\\u{10178}\\u{1018a}\\u{1018b}\\u{102e1}-\\u{102fb}\\u{10320}-\\u{10323}\\u{10341}\\u{1034a}\\u{103d1}-\\u{103d5}\\u{104a0}-\\u{104a9}\\u{10858}-\\u{1085f}\\u{10879}-\\u{1087f}\\u{108a7}-\\u{108af}\\u{108fb}-\\u{108ff}\\u{10916}-\\u{1091b}\\u{109bc}\\u{109bd}\\u{109c0}-\\u{109cf}\\u{109d2}-\\u{109ff}\\u{10a40}-\\u{10a48}\\u{10a7d}\\u{10a7e}\\u{10a9d}-\\u{10a9f}\\u{10aeb}-\\u{10aef}\\u{10b58}-\\u{10b5f}\\u{10b78}-\\u{10b7f}\\u{10ba9}-\\u{10baf}\\u{10cfa}-\\u{10cff}\\u{10d30}-\\u{10d39}\\u{10e60}-\\u{10e7e}\\u{10f1d}-\\u{10f26}\\u{10f51}-\\u{10f54}\\u{10fc5}-\\u{10fcb}\\u{11052}-\\u{1106f}\\u{110f0}-\\u{110f9}\\u{11136}-\\u{1113f}\\u{111d0}-\\u{111d9}\\u{111e1}-\\u{111f4}\\u{112f0}-\\u{112f9}\\u{11450}-\\u{11459}\\u{114d0}-\\u{114d9}\\u{11650}-\\u{11659}\\u{116c0}-\\u{116c9}\\u{11730}-\\u{1173b}\\u{118e0}-\\u{118f2}\\u{11950}-\\u{11959}\\u{11c50}-\\u{11c6c}\\u{11d50}-\\u{11d59}\\u{11da0}-\\u{11da9}\\u{11fc0}-\\u{11fd4}\\u{12400}-\\u{1246e}\\u{16a60}-\\u{16a69}\\u{16ac0}-\\u{16ac9}\\u{16b50}-\\u{16b59}\\u{16b5b}-\\u{16b61}\\u{16e80}-\\u{16e96}\\u{1d2e0}-\\u{1d2f3}\\u{1d360}-\\u{1d378}\\u{1d7ce}-\\u{1d7ff}\\u{1e140}-\\u{1e149}\\u{1e2f0}-\\u{1e2f9}\\u{1e8c7}-\\u{1e8cf}\\u{1e950}-\\u{1e959}\\u{1ec71}-\\u{1ecab}\\u{1ecad}-\\u{1ecaf}\\u{1ecb1}-\\u{1ecb4}\\u{1ed01}-\\u{1ed2d}\\u{1ed2f}-\\u{1ed3d}\\u{1f100}-\\u{1f10c}\\u{1fbf0}-\\u{1fbf9}";
var CONTENT_RE = new RegExp('[A-Za-z0-9' + LET + NUM + ']', 'u'), WORD_RE = new RegExp('[A-Za-z0-9' + LET + NUM + ']+', 'gu');
function hasContent(s){ return CONTENT_RE.test(String(s == null ? '' : s)); }
var NEG_BEFORE = mkSet(["aucun", "aucune", "avoid", "avoided", "barely", "cannot", "declined", "fail", "failed", "fails", "forget", "forgot", "guère", "hardly", "jamais", "jamás", "kein", "keine", "keinem", "keinen", "keiner", "keines", "mai", "nada", "nadie", "neglected", "neither", "nem", "nenhum", "nenhuma", "nessuna", "nessuno", "never", "ni", "nicht", "nichts", "nie", "niemals", "niemand", "niente", "ninguna", "ninguno", "ninguém", "ningún", "no", "nobody", "non", "none", "nor", "not", "nothing", "nowhere", "nulla", "nunca", "não", "né", "pas", "rarely", "refuse", "refused", "refuses", "rien", "seldom", "tampoco", "unable", "without", "не", "нет", "никогда"]);
var REQUEST_VERBS = mkSet(["advised", "asked", "begged", "demanded", "encouraged", "expected", "forced", "instructed", "ordered", "pressed", "pressured", "pushed", "told", "urged", "wanted"]), OBJ_PRONOUNS = mkSet(["everybody", "everyone", "her", "him", "me", "somebody", "someone", "them", "us", "you"]);
var NO_REPLY = mkSet(["nah", "nein", "never", "no", "nope", "não", "нет"]);
var MILLION_NOUNS = mkSet(["a", "accounts", "arr", "budget", "clicks", "customers", "dollars", "downloads", "euros", "followers", "funding", "impressions", "in", "installs", "listeners", "members", "of", "orders", "patients", "pct", "people", "per", "players", "pounds", "readers", "records", "revenue", "rows", "sales", "sessions", "shares", "students", "subscribers", "transactions", "units", "usd", "users", "valuation", "views", "visitors"]);
var WORD_FIGS = mkMap({"doubled": 2.0, "doubles": 2.0, "doubling": 2.0, "eightfold": 8.0, "fivefold": 5.0, "fourfold": 4.0, "halved": 0.5, "halves": 0.5, "halving": 0.5, "hundredfold": 100.0, "ninefold": 9.0, "quadrupled": 4.0, "sevenfold": 7.0, "sixfold": 6.0, "tenfold": 10.0, "thousandfold": 1000.0, "threefold": 3.0, "tripled": 3.0, "triples": 3.0, "tripling": 3.0, "twentyfold": 20.0, "twofold": 2.0});
var FRAC_BEFORE = mkSet(["about", "almost", "around", "boosted", "by", "cut", "cutting", "down", "dropped", "fell", "grew", "lowered", "nearly", "of", "over", "raised", "reduced", "rose", "roughly", "saved", "slashed", "than", "up"]);
var YOU_MODAL = ["'ll", "can", "could", "have to", "may", "might", "must", "need to", "should", "want to", "will", "would"];
var NOT_VERB = mkSet(["a", "about", "all", "an", "and", "as", "at", "both", "but", "by", "can", "could", "for", "from", "get", "gotta", "guys", "here", "if", "in", "it", "know", "less", "may", "might", "more", "must", "need", "needs", "never", "not", "now", "on", "or", "ought", "shall", "should", "so", "that", "the", "there", "this", "to", "too", "tries", "try", "want", "wants", "will", "with", "would"]);
var INSTR_VERBS = mkSet(["add", "answer", "cite", "close", "describe", "drop", "end", "explain", "finish", "focus", "frame", "give", "go", "keep", "lead", "lean", "mention", "name", "open", "own", "pause", "put", "quantify", "quote", "replace", "say", "show", "skip", "start", "stop", "swap", "talk", "tell", "use", "write"]);
var SUGGEST_STRONG_RE = new RegExp("\\b(?:(?:better|best|stronger|tighter|cleaner|sharper|shorter|clearer|simpler|honest|good|great) (?:answer|line|version|opener|close|closing|sentence|way to say it|phrasing)(?: (?:is|would be|could be|reads|goes))?|try saying|instead say|say instead|could say|might say|would say|can say|should say|just say|then say|rephrase(?: it)? as|reword(?: it)? as|replace (?:it|that|this) with|swap (?:it|that|this) for|a line like|something like|aim for|go with|rewrite|rewritten)\\W{0,6}$", 'i');
var YOU_CORE_RE = new RegExp("\\byou((?:'ve|'d|'ll|'re| have| had| are| were| will| would| could| should| can| might| may| must| just| also| even| then| literally| actually| really| first| later| once| earlier| already| repeatedly| openly| proudly| yourself| basically| mostly| only| simply| clearly| apparently| need to| want to| have to| kept| keep)*)[ \\t\\n\\r\\f\\v]+([a-z]+)", 'gi');
var YOUR_CORE_RE = new RegExp("\\byour(?:[ \\t\\n\\r\\f\\v]+[a-z0-9'-]+){0,3}?[ \\t\\n\\r\\f\\v]+(?:was|were|is|are|reads|read|says|said|claims|claimed|states|stated|mentions|mentioned|lists|listed|includes|included|describes|described|calls|called|boiled down to|came down to|amounted to|sounded like|as)\\b|\\byour (?:own |exact |actual |very )?(?:words|quote|phrase|phrasing|line|lines|opener|opening line|closing line|sign-off|takeaway|pitch|title|tagline|catchphrase|claim|claims|exact words)\\b|\\bin your (?:own |first |second |third |fourth |fifth |last |opening |closing |final |[a-z0-9]+ )?(?:words|answer|answers|story|reply|response|opener|close|resume|cv|notes|pitch|intro)\\b|\\bas you (?:put|said|wrote|described|called) it|\\bwhat you(?:'re| are| were) (?:saying|telling me)|\\byou(?:'re| are| were| was)(?: (?:really|actually|basically|apparently|supposedly|officially))? (?:the|a|an|our|their|his|her|my|one of)\\b|\\bthe candidate(?:'s)?\\b|\\byour (?:[a-z0-9'-]+ )?(?:answer|answers|words|line|reply|response|opener|close|pitch|story|claim|quote)[ \\t\\n\\r\\f\\v]*:", 'gi');
var INSTR_BEFORE_RE = new RegExp("(?:\\bthen|\\bnext time|\\bnow|\\bso|\\bif|\\bwhen|\\bonce|\\bafter|\\bbefore|\\binstead|\\bfirst|\\bin the room|\\bthere)\\W*$", 'i');
var PAST_LIKE_RE = new RegExp("^(?:[a-z]+(?:ed|en)$|(?:said|told|wrote|made|took|got|gave|went|ran|led|built|kept|left|brought|thought|felt|held|put|set|cut|did|had|been|done|seen|known|begun|chosen|spoken|written)$)", 'i');
var CLAUSE_BREAK_RE = new RegExp("[ \\t\\n\\r\\f\\v]-+[ \\t\\n\\r\\f\\v]|[\\u2013\\u2014;:()\\\"]|(?<![a-z])'|'(?![a-z])|,[ \\t\\n\\r\\f\\v]*(?:and|but|so|then|yet|which|while|whereas)\\b|\\b(?:but|instead|rather|next time|so)\\b", 'i');
var ATTR_BREAK_RE = new RegExp("[ \\t\\n\\r\\f\\v]-+[ \\t\\n\\r\\f\\v]|[\\u2013\\u2014;()]|,[ \\t\\n\\r\\f\\v]*(?:and|but|so|then|yet|which|while|whereas)\\b|\\b(?:but|instead|rather|next time|however|though|although)\\b", 'i');
var POST_ATTR_RE = new RegExp("^\\W{0,4}(?:(?:as |like )?you(?:'ve|'d| have| had)? (?:just |also |even |yourself |already |then )?(?:said|wrote|told me|told us|told the panel|told them|told him|told her|claimed|admitted|put it|called it|answered|replied|kept saying|agreed|promised|mentioned|described|stated|offered|insisted|conceded|confirmed|proposed|suggested)|your (?:own |exact |very )?(?:words|answer|line|phrase|quote|claim|offer|number|proposal)|(?:(?:those|these|that|this|which|it) )?(?:was|were|is|are) (?:your|what you)|in your (?:own )?(?:words|answer)|(?:that|this|which)(?:'s| is| was) (?:exactly |word for word )?what you (?:said|told|wrote|claimed|admitted))\\b", 'i');
var POST_HYPO_RE = new RegExp("^\\W{0,3}(?:would|could|might|(?:lands|works|sounds|reads|is|comes across) (?:better|stronger|harder|clearer|tighter|sharper|more))\\b", 'i');
var OTHER_SPEAKER_RE = new RegExp("\\b(?:i|we)(?:'ve| have| had)?(?:[ \\t\\n\\r\\f\\v]+(?:just|also|already|clearly))?[ \\t\\n\\r\\f\\v]+(?:said|say|wrote|offered|mentioned|told you|put it|quoted|asked|noted|explained)\\b|\\b(?:like|as) i (?:said|mentioned|wrote|put it)\\b|\\bour (?:offer|policy|band|range|budget|number|position|terms|standard|written offer|final offer)\\b|\\bthe (?:question|offer|written offer|final offer|job description|posting|jd|ad|listing|recruiter|hiring manager|role description|prompt)\\b|\\byou were (?:asked|told)\\b|\\bmy (?:offer|number|last message|question)\\b", 'gi');
var CAND_SPEAKER_RE = new RegExp("\\byou(?:'ve|'d|'re|'ll)?\\b|\\byour\\b", 'gi');
/* ...but a "you" in a question or a hypothetical ("how would you approach '...'", "have you ever '...'",
   "you'll be '...'", "if you '...'") asks about the words, it doesn't pin them on them; and the role
   itself can be the speaker ("the role calls for '...'"). Mirrors of the server's. */
var HYPO_YOU_RE = new RegExp("\\b(?:would|will|could|can|should|might|must|do|does|did|are|were|have|has|if|whether)[ \\t\\n\\r\\f\\v]+you\\b|\\byou(?:'ll|'d(?![ \\t\\n\\r\\f\\v]+(?:said|told|written|wrote|mentioned|agreed|claimed|admitted|promised|stated|already|just|described|called|put))| would| will| could| can| should| might| must)\\b", 'gi');
var ROLE_SPEAKER_RE = new RegExp("\\b(?:the|this|that)[ \\t\\n\\r\\f\\v]+(?:role|job|position|team|company|posting|listing|ad|jd|job[ \\t\\n\\r\\f\\v]+description|opening|vacancy|hiring[ \\t\\n\\r\\f\\v]+manager|recruiter|interviewer|panel|question)(?:'s)?[ \\t\\n\\r\\f\\v]+(?:asks?|needs?|requires?|involves?|calls?[ \\t\\n\\r\\f\\v]+for|mentions?|says|lists?|wants?|expects?|demands?|describes?|includes?|emphasi[sz]es|stresses|highlights?|is[ \\t\\n\\r\\f\\v]+about|is[ \\t\\n\\r\\f\\v]+looking[ \\t\\n\\r\\f\\v]+for|looks[ \\t\\n\\r\\f\\v]+for|centers[ \\t\\n\\r\\f\\v]+on|centres[ \\t\\n\\r\\f\\v]+on|focuses[ \\t\\n\\r\\f\\v]+on)\\b", 'gi');
var ATTR_CLAUSE_RE = new RegExp("(?<!\\bif )(?<!\\bwhen )(?<!\\bonce )(?<!\\bunless )(?<!\\bwhether )(?<!\\bhave )(?<!\\bhad )(?<!\\bdid )(?<!\\bdo )(?<!\\bdoes )(?<!\\bcan )(?<!\\bcould )(?<!\\bwould )(?<!\\bwill )(?<!\\bshould )(?<!\\bmight )(?<!\\bsay )(?<!\\bsay\\ that )(?<!\\btell\\ them )(?<!\\btell\\ them\\ that )(?<!\\btell\\ the\\ panel )(?<!\\bmention\\ that )(?<!\\bmention\\ how )(?<!\\bexplain\\ how )(?<!\\bexplain\\ that )(?<!\\bshow\\ that )(?<!\\bshow\\ how )(?<!\\badd\\ that )(?<!\\bmake\\ clear )(?<!\\bmake\\ it\\ clear )(?<!\\bpoint\\ out\\ that )(?<!\\blead\\ with\\ how )(?<!\\bstress\\ that )(?<!\\bsaying )(?<!\\bthem\\ how )(?<!\\bpanel\\ how )(?<!\\bwith\\ how )(?<!\\btalk\\ about\\ how )(?<!\\bthem\\ about\\ how )(?<!\\bthem\\ through\\ how )(?<!\\bpanel\\ through\\ how )(?<!\\bdescribe\\ how )(?<!\\bshare\\ how )(?<!\\bhighlight\\ that )(?<!\\bemphasise\\ that )(?<!\\bemphasize\\ that )(?<!\\bclaim )(?<!\\bclaiming )(?<!\\bimply )(?<!\\bimplying )(?<!\\bpretend )(?<!\\bsuggest )(?<!\\bsure )(?<!\\bensure )(?<!\\btime )(?<!\\bbefore )(?<!\\buntil )(?<!\\bsay: )\\b(?:you(?:'ve|'re| have| had| are| were)?(?:[ \\t\\n\\r\\f\\v]+(?:just|also|even|then|literally|actually|really|basically|clearly|apparently|first|later|earlier|already|repeatedly))*[ \\t\\n\\r\\f\\v]+(?:said|say|says|claim|claims|claimed|explained|noted|described|highlighted|cited|shared|indicated|mentioned|stated|reported|admitted|wrote|answered|estimated|boasted|quoted|put it|told[ \\t\\n\\r\\f\\v]+[a-z]+|walked (?:me|us|the panel) through|talked about|brought up|pointed out|implied|recounted|recalled|framed|presented|argued|insisted|confirmed|added|emphasized|emphasised|stressed|maintained|suggested|calculated|measured|quantified|counted|figured|keep saying|kept saying|mention|mentions|mentioning|describe|describes|describing|cite|cites|citing|note|notes|noting|state|states|stating|report|reports|reporting|estimate|estimates|quote|quotes|quoting|list|lists|listing|reference|references|referencing|highlight|highlights|highlighting|credit|credits|crediting|claiming|telling|suggest|suggests|suggesting|recount|recounts|tout|touts|touting|boast|boasts|boasting|imply|implies|implying|point to|points to|talk about|talks about|bring up|brings up|saying|[a-z]+ed|ran|led|built|grew|made|took|got|sold|spent|won|lost|drove|wrote|brought|kept|left|paid|found|gave|cut|hit|set|shut|split|quit|rose|fell|became|began|did|had|went|saw|knew|thought|taught|bought|caught|felt|held|met|sent|stood|understood|overcame|beat|broke|chose|drew|flew|forgot|froze|hid|rode|shook|stole|threw|woke|tripled|doubled|halved)|you(?:'re| are| were)[ \\t\\n\\r\\f\\v]+(?:responsible[ \\t\\n\\r\\f\\v]+for|in[ \\t\\n\\r\\f\\v]+charge[ \\t\\n\\r\\f\\v]+of|managing|leading|running|overseeing|handling|heading|owning)|so you(?:[ \\t\\n\\r\\f\\v]+[a-z]+){1,2}|according to (?:you|your [a-z]+)|(?:per|in|from|by|on) your (?:own )?(?:answer|words|story|resume|cv|notes?|reply|response|account|telling)|your (?:own )?(?:answer|words|resume|cv|notes?|story|claim|profile)[ \\t\\n\\r\\f\\v]+(?:said|says|was|were|is|claims?|claimed|states?|stated|mentions?|mentioned|shows?|showed|suggests?|suggested|lists?|listed|credits?|credited|puts|put|has|had|includes?|included|highlights?|highlighted|notes?|noted|cites?|cited|references?|referenced|describes?|described|reads)|(?:the[ \\t\\n\\r\\f\\v]+)?candidate(?:'s)?[ \\t\\n\\r\\f\\v]+(?:claims?|claimed|cites?|cited|says|said|mentions?|mentioned|describes?|described|reports?|reported|states?|stated|notes?|noted|boasts?|boasted|lists?|listed|credits?|credited))\\b((?:(?!\\be\\.g\\.|\\bi\\.e\\.|\\bfor[ \\t\\n\\r\\f\\v]+(?:example|instance)\\b|\\bsuch[ \\t\\n\\r\\f\\v]+as\\b)(?:[^.;!?\\n]|(?<=[0-9])\\.(?=[0-9])|(?<=\\b[a-z])\\.|(?<=\\bvs)\\.|(?<=\\bapprox)\\.|(?<=\\bdr)\\.|(?<=\\bmr)\\.|(?<=\\bmrs)\\.|(?<=\\bms)\\.|(?<=\\bst)\\.|(?<=\\betc)\\.|(?<=\\binc)\\.|(?<=\\bltd)\\.|(?<=\\bjr)\\.|(?<=\\bsr)\\.|(?<=\\bdept)\\.|(?<=\\best)\\.|(?<=\\bfig)\\.|(?<=\\bno)\\.|(?<=\\bco)\\.)){0,160})", 'gi');
// ...and the figures in a noun phrase pinned on them: "your 40% churn reduction", "your team of 12 analysts",
// "the 25% cost cut you delivered", "...churn fell 40%, per your story" (mirrors of the server's).
var ATTR_POSS_RE = new RegExp("\\byour[ \\t\\n\\r\\f\\v]+(?:own[ \\t\\n\\r\\f\\v]+)?((?:(?:team|staff|group|budget|portfolio|book|pipeline|quota|territory)[ \\t\\n\\r\\f\\v]+of[ \\t\\n\\r\\f\\v]+)?(?:[$\u00a3\u20ac\u20b9\u00a5][ \\t\\n\\r\\f\\v]?)?(?:[0-9]|(?:three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|dozen|dozens|hundreds|thousands)\\b)(?:(?!\\be\\.g\\.|\\bi\\.e\\.|\\bfor[ \\t\\n\\r\\f\\v]+(?:example|instance)\\b|\\bsuch[ \\t\\n\\r\\f\\v]+as\\b)(?:[^.;!?\\n]|(?<=[0-9])\\.(?=[0-9])|(?<=\\b[a-z])\\.|(?<=\\bvs)\\.|(?<=\\bapprox)\\.|(?<=\\bdr)\\.|(?<=\\bmr)\\.|(?<=\\bmrs)\\.|(?<=\\bms)\\.|(?<=\\bst)\\.|(?<=\\betc)\\.|(?<=\\binc)\\.|(?<=\\bltd)\\.|(?<=\\bjr)\\.|(?<=\\bsr)\\.|(?<=\\bdept)\\.|(?<=\\best)\\.|(?<=\\bfig)\\.|(?<=\\bno)\\.|(?<=\\bco)\\.)){0,60})", 'gi');
var ATTR_POSTNP_RE = new RegExp("\\b(?:the|that|this|those|these)[ \\t\\n\\r\\f\\v]+((?:[^ \\t\\n\\r\\f\\v.;!?,]+[ \\t\\n\\r\\f\\v]+){0,5}?)(?:that[ \\t\\n\\r\\f\\v]+|which[ \\t\\n\\r\\f\\v]+)?you(?:'ve| have| had)?[ \\t\\n\\r\\f\\v]+(?:said|say|says|claim|claims|claimed|explained|noted|described|highlighted|cited|shared|indicated|mentioned|stated|reported|admitted|wrote|answered|estimated|boasted|quoted|put it|told[ \\t\\n\\r\\f\\v]+[a-z]+|walked (?:me|us|the panel) through|talked about|brought up|pointed out|implied|recounted|recalled|framed|presented|argued|insisted|confirmed|added|emphasized|emphasised|stressed|maintained|suggested|calculated|measured|quantified|counted|figured|keep saying|kept saying|mention|mentions|mentioning|describe|describes|describing|cite|cites|citing|note|notes|noting|state|states|stating|report|reports|reporting|estimate|estimates|quote|quotes|quoting|list|lists|listing|reference|references|referencing|highlight|highlights|highlighting|credit|credits|crediting|claiming|telling|suggest|suggests|suggesting|recount|recounts|tout|touts|touting|boast|boasts|boasting|imply|implies|implying|point to|points to|talk about|talks about|bring up|brings up|[a-z]+ed|ran|led|built|grew|made|took|got|sold|spent|won|lost|drove|wrote|brought|kept|left|paid|found|gave|cut|hit|set|shut|split|quit|rose|fell|became|began|did|had|went|saw|knew|thought|taught|bought|caught|felt|held|met|sent|stood|understood|overcame|beat|broke|chose|drew|flew|forgot|froze|hid|rode|shook|stole|threw|woke|tripled|doubled|halved)\\b", 'gi');
var ATTR_PER_RE = new RegExp("(?:^|(?<=[.;!?\\n]))[ \\t\\n\\r\\f\\v]*((?:(?!\\be\\.g\\.|\\bi\\.e\\.|\\bfor[ \\t\\n\\r\\f\\v]+(?:example|instance)\\b|\\bsuch[ \\t\\n\\r\\f\\v]+as\\b)(?:[^.;!?\\n]|(?<=[0-9])\\.(?=[0-9])|(?<=\\b[a-z])\\.|(?<=\\bvs)\\.|(?<=\\bapprox)\\.|(?<=\\bdr)\\.|(?<=\\bmr)\\.|(?<=\\bmrs)\\.|(?<=\\bms)\\.|(?<=\\bst)\\.|(?<=\\betc)\\.|(?<=\\binc)\\.|(?<=\\bltd)\\.|(?<=\\bjr)\\.|(?<=\\bsr)\\.|(?<=\\bdept)\\.|(?<=\\best)\\.|(?<=\\bfig)\\.|(?<=\\bno)\\.|(?<=\\bco)\\.)){0,160}?)(?:,[ \\t\\n\\r\\f\\v]*|[ \\t\\n\\r\\f\\v]+)(?:per|by|according to)[ \\t\\n\\r\\f\\v]+your[ \\t\\n\\r\\f\\v]+(?:own[ \\t\\n\\r\\f\\v]+)?(?:account|story|answer|words|telling|resume|cv|notes)\\b", 'gi');
var CLOSE_SINGLE_RE = /'(?![a-z0-9])/gi;
var NUM_TOK_RE = /^[0-9]+(?:\.[0-9]+)?$/;
// Only where a run of line breaks starts (no re-scan from inside a run: a long run stays linear).
var LINE_BREAK_RE = /(?<![\n\r\x0b\x0c\x85\u2028\u2029])[\n\r\x0b\x0c\x85\u2028\u2029]+(?=[ \t]*(?:[-*\u2022\u00b7\u25aa\u25cf\u25e6\u2023\u2043\u2013\u2014]|[0-9]|[A-Z]))/g;
// A list under a lead-in line ending in ":" - its items are the bulleted or numbered lines after it or, in a list
// without bullets, short lines (up to 15 words); a blank line ends it. Mirror of the server's _mark_lists.
var BREAK_SPLIT_RE = /(\r\n|[\n\r\x0b\x0c\x85\u2028\u2029])/;
var ITEM_START_RE = /^[ \t]*(?:[-*\u2022\u00b7\u25aa\u25cf\u25e6\u2023\u2043\u2013\u2014]|[0-9]{1,3}[.)])/;
var NEG_LEAD_LINE_RE = /\b(?:never|no(?![ \t]+(?:problem|doubt|question)\b)|none|nothing|nobody|neither|nor|cannot|without|not(?![ \t]+(?:only|just)\b))\b|n['\u2019]t\b/i;
// Spaced dashes, en and em dashes, and brackets are pauses, like a comma.
var DASH_PAUSE_RE = /[ \t\n\r\f\v][-\u2013\u2014]+[ \t\n\r\f\v]|[\u2013\u2014]|[()\[\]{}]/g;
function markLists(s){
  if(!BREAK_SPLIT_RE.test(s)) return s;
  var parts = s.split(BREAK_SPLIT_RE), out = [parts[0]], lead = null, first = false, bulleted = false;
  for(var k = 1; k < parts.length; k += 2){
    var prev = parts[k - 1], line = parts[k + 1];
    if(/:$/.test(prev.replace(/[ \t]+$/, ''))){ lead = NEG_LEAD_LINE_RE.test(prev); first = true; }
    var body = line.replace(/^[ \t]+|[ \t]+$/g, '');
    if(lead !== null && first && !body) out.push(parts[k]);   // a blank line before the first item
    else if(lead !== null && body && (first || ITEM_START_RE.test(line) || (!bulleted && body.split(/[ \t]+/).length <= 15))){
      if(first) bulleted = ITEM_START_RE.test(line);
      if(lead){ out.push(' ' + NEGLEAD + ' '); var m = line.match(ITEM_START_RE); if(m) line = line.slice(m[0].length); }   // "1." or "-" opens the item
      else out.push(parts[k]);
      first = false;
    } else { lead = null; out.push(parts[k]); }
    out.push(line);
  }
  return out.join('');
}
var TOK_RE = new RegExp('[0-9]+(?:\\.[0-9]+)?[a-z]*|[a-z' + LET + ']+|[.,;:!?]|' + SEP + '|' + LINE + '|' + NEGLEAD, 'gu');
function squash(v, n){
  if(v == null || typeof v === 'object') return '';
  var s = String(v).replace(WS_RE, ' ').replace(/^ +| +$/g, '');
  if(n == null) n = 6000;
  return s.length > n ? Array.from(s).slice(0, n).join('') : s;
}
/* One canonical text for a number, identical on the server: integers exactly,
   other values half-up to 6 decimals, huge ones in 12-digit exponent form. */
function numFmt(v){
  if(!isFinite(v)) return '0';
  if(v === Math.trunc(v) && Math.abs(v) < 9007199254740992) return String(v);
  if(Math.abs(v) >= 9007199254740992) return v.toExponential(12);
  var s = v.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return (s === '' || s === '-0') ? '0' : s;
}
function normMarks(s){ return String(s == null ? '' : s).replace(DQ_RE, '"').replace(DQ_ASTRAL_RE, '"').replace(SQ_RE, "'"); }
function smallDigit(w){ return (w in NUM_SMALL) && NUM_SMALL[w] < 10; }
/* The spelled-out number starting at toks[i]: { value, n tokens used } or null.
   Stops at punctuation ("twenty. Five of them" is 20 and 5); "a hundred and fifty
   thousand" is 150000; "two hundred and three hundred" and "between one thousand
   and two thousand" stay two numbers; "two point five" is 2.5. */
function composeOne(toks, i){
  i = i || 0;
  var n = toks.length, t = toks[i], nxt = i + 1 < n ? toks[i + 1] : '';
  if(t === 'half' && nxt === 'a' && i + 2 < n && (toks[i + 2] in NUM_SCALES)) return { value: 0.5 * NUM_SCALES[toks[i + 2]], n: 3 };
  if(!((t in NUM_SMALL) || (t in NUM_TENS) || (t === 'a' && (nxt === 'hundred' || nxt === 'dozen' || (nxt in NUM_SCALES))))) return null;
  var total = 0, cur = 0, j = i, last = 0;
  while(j < n){
    var w = toks[j];
    if(w in NUM_SMALL){ var sv = NUM_SMALL[w]; if(j === i || cur % 100 === 0 || (sv < 10 && cur % 10 === 0 && cur % 100 >= 20)) cur += sv; else break; }
    else if(w in NUM_TENS){ if(j === i || cur % 100 === 0) cur += NUM_TENS[w]; else break; }
    else if(w === 'a' && j === i) cur += 1;
    else if(w === 'hundred') cur = (cur || 1) * 100;
    else if(w === 'dozen') cur = (cur || 1) * 12;
    else if(w in NUM_SCALES){ total += (cur || 1) * NUM_SCALES[w]; cur = 0; last = NUM_SCALES[w]; }
    else if(w === 'and' && j + 2 < n && toks[j + 1] === 'a' && toks[j + 2] === 'half' && (cur || total)){
      if(cur) cur += 0.5;            // "two and a half (million)"
      else total += 0.5 * last;      // "a million and a half"
      j += 3; continue;
    }
    else if(w === 'point' && total === 0 && cur === Math.trunc(cur) && j + 1 < n && smallDigit(toks[j + 1])){
      var kd = j + 1, digits = '';
      while(kd < n && smallDigit(toks[kd])){ digits += String(NUM_SMALL[toks[kd]]); kd++; }
      cur = parseFloat(String(Math.trunc(cur)) + '.' + digits); j = kd; continue;
    }
    else if(w === 'and' && j + 1 < n && ((toks[j + 1] in NUM_SMALL) || (toks[j + 1] in NUM_TENS)) && (total || cur >= 100) && cur % 100 === 0){
      var k = j + 1; while(k < n && ((toks[k] in NUM_SMALL) || (toks[k] in NUM_TENS))) k++;
      var after = k < n ? toks[k] : '';
      if(after === 'dozen') break;
      if(after === 'hundred' && total === 0) break;   // "two hundred AND three hundred": a second number
      if((after in NUM_SCALES) && ((total === 0 && i > 0 && toks[i - 1] === 'between') || (total && NUM_SCALES[after] >= last))) break;
    }
    else break;
    j++;
  }
  if(j > i && toks[j - 1] === 'and') j--;
  return { value: total + cur, n: j - i };
}
function composeNumbers(toks){
  var out = [], i = 0, n = toks.length, m;
  while(i < n){
    var t = toks[i];
    if((m = /^([0-9]+(?:\.[0-9]+)?)(k|m|mm|bn|x)$/.exec(t))){
      if(m[2] === 'x'){ out.push(numFmt(parseFloat(m[1]))); out.push('times'); }
      else if((m[2] === 'm' || m[2] === 'mm') && !(i + 1 < n && (toks[i + 1] in MILLION_NOUNS))){ out.push(numFmt(parseFloat(m[1]))); out.push(m[2]); }   // "the job took 5m" is not five million
      else out.push(numFmt(parseFloat(m[1]) * SUFFIX_SCALE[m[2]]));
      i++; continue;
    }
    if(NUM_TOK_RE.test(t)){
      var v = parseFloat(t);
      if(toks[i + 1] === 'and' && toks[i + 2] === 'a' && toks[i + 3] === 'half'){ v += 0.5; i += 3; }   // "2 and a half million"
      if(i + 1 < n && (toks[i + 1] in NUM_SCALES)){ out.push(numFmt(v * NUM_SCALES[toks[i + 1]])); i += 2; continue; }
      if(i + 1 < n && toks[i + 1] === 'dozen'){ out.push(numFmt(v * 12)); i += 2; continue; }
      out.push(numFmt(v)); i++; continue;
    }
    var one = composeOne(toks, i);
    if(!one){ out.push(t); i++; continue; }
    out.push(numFmt(one.value)); i += one.n;
  }
  return out;
}
/* Normalised tokens for quote matching, sentence ends kept: case, apostrophes,
   contractions ("I'm" == "I am"), thousands separators, number words ("twenty
   five" == "25"), units ("40%" == "forty percent", "$5k" == "5000 dollars",
   "$2.5M" == "$2.5 million") and pure fillers stop mattering - the words that
   carry meaning, and where a sentence ends, still do. */
/* One normal form in both layers: composed accents (NFC), lower case, one sigma. */
/* Lower case as the server's Python (Unicode 14) does it: the characters a newer browser
   has a case for but Unicode 14 doesn't are left as they are, so both layers agree. */
var CASE_PIN = "\\u1c89\\ua7cb-\\ua7cc\\ua7ce\\ua7d2\\ua7d4\\ua7da\\ua7dc\\u{10d50}-\\u{10d65}\\u{16ea0}-\\u{16eb8}";
var CASE_PIN_TEST = new RegExp('[' + CASE_PIN + ']', 'u'), CASE_PIN_SPLIT = new RegExp('([' + CASE_PIN + '])', 'u');
function pyLower(s){ s = String(s == null ? '' : s); return CASE_PIN_TEST.test(s) ? s.split(CASE_PIN_SPLIT).map(function(p, i){ return i % 2 ? p : p.toLowerCase(); }).join('') : s.toLowerCase(); }
/* The server's _clip: no NUL, Python's whitespace trimmed, cut by characters (code points). */
var PY_SPACE = '\t\n\x0b\x0c\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000';
var PY_STRIP_RE = new RegExp('^[' + PY_SPACE + ']+|[' + PY_SPACE + ']+$', 'g');
function clipPy(v, n){ if(v == null) return ''; var s = (typeof v === 'string' ? v : String(v)).split('\0').join('').replace(PY_STRIP_RE, ''); return s.length <= n ? s : Array.from(s).slice(0, n).join(''); }
function normText(s){ return pyLower(String(s == null ? '' : s).normalize('NFC')).replace(/ς/g, 'σ'); }
function mtoks(s){
  // A line break before a new item - a bullet, a number or a capital - is a pause a quote may cross but a
  // negation never reaches past (a JD bullet's "without" stays in its bullet); one mid-sentence ("I have
  // never\nlied") is just a space. Decided before case is folded. Mirror of the server's _LINE_BREAK.
  s = String(s == null ? '' : s).split(LINE).join(' ').split(NEGLEAD).join(' ');   // never spoofed from the text itself
  s = markLists(s).replace(LINE_BREAK_RE, ' ' + LINE + ' ');
  s = normMarks(normText(s));
  s = s.replace(/(?<=[0-9]),(?=[0-9]{3}\b)/g, '');
  s = s.replace(/\$[ \t\n\r\f\v]?([0-9]+(?:\.[0-9]+)?)(?:[ \t\n\r\f\v]?(k|mm|m|bn|b|thousand|million|billion)\b)?/g, function(mm, n, suf){ suf = (suf || '').toLowerCase(); return ' ' + n + ((suf in DOLLAR_SCALE) ? DOLLAR_SCALE[suf] : '') + ' usd '; });
  s = s.replace(/\bper[ \t\n\r\f\v]+cent\b/g, ' pct ').replace(/%/g, ' pct ');
  APOS.forEach(function(p){ s = s.replace(p[0], p[1]); });
  s = s.replace(/'/g, '');
  s = s.replace(DASH_PAUSE_RE, ' , ');
  var raw = s.match(TOK_RE) || [], toks = [];
  raw.forEach(function(t, k){
    if(t in SENT_END){
      var prev = k ? raw[k - 1] : '';
      if(t === '.' && ((prev in ABBREV) || (/^[a-z]$/.test(prev) && prev !== 'i' && prev !== 'a'))) return;
      toks.push(BND);
    }
    else if(t === ',' || t === ':') toks.push(',');
    else if(t === LINE || t === NEGLEAD) toks.push(t);
    else {
      if(t in UNIT_TOKS) t = UNIT_TOKS[t];
      String(t in CONTRACT_WORDS ? CONTRACT_WORDS[t] : t).split(' ').forEach(function(x){ toks.push(x); });
    }
  });
  var out = [];
  composeNumbers(toks).forEach(function(t){
    if(t in FILLER_TOKS) return;
    var lastT = out.length ? out[out.length - 1] : null;
    if(t in PAUSE_RANK){ if(out.length && ((lastT !== BND && lastT !== HARD && !(lastT in PAUSE_RANK)) || (t === NEGLEAD && lastT === BND))) out.push(t); else if(out.length && (lastT in PAUSE_RANK) && PAUSE_RANK[t] > PAUSE_RANK[lastT]) out[out.length - 1] = t; return; }   // (a negated list item survives the sentence end before it)
    var mark = t === BND || t === HARD;
    if(mark && (lastT === ',' || lastT === LINE)){ out.pop(); lastT = out.length ? out[out.length - 1] : null; }
    if(mark && out.length && (lastT === BND || lastT === HARD)){ if(t === HARD) out[out.length - 1] = HARD; return; }
    if(t === BND && !out.length) return;
    out.push(t);
  });
  if(out.length && (out[out.length - 1] in PAUSE_RANK)) out.pop();
  return out;
}
/* The words of mtoks (no sentence or pause marks) - for figures, keys and coverage. */
function qtoks(s){ return mtoks(s).filter(function(t){ return t !== BND && t !== HARD && !(t in PAUSE_RANK); }); }
function stripBnd(t){ var a = 0, b = t.length; while(a < b && t[a] === BND) a++; while(b > a && t[b - 1] === BND) b--; return t.slice(a, b); }
/* A quote's tokens to look for: its words and sentence ends (a pause it adds or leaves out never matters). */
function needleOf(s){ return stripBnd(mtoks(s)).filter(function(t){ return !(t in PAUSE_RANK); }); }
/* Every word must match exactly; the quote may never run past a sentence end the
   speaker made (unless it has one there too) or into another piece of material;
   up to `skips` pure fillers in the transcript may be stepped over. An AI quoting a
   transcript copies it - a near-miss word is a changed quote, never noise. */
function matchAt(hay, k, needle, skips, budget){
  var j = 0, H = hay.length, n = needle.length;
  while(j < n){
    if(budget && --budget[0] < 0) return -2;   // the search budget ran out (mirror of _match_at)
    var w = needle[j];
    if(k < H && (hay[k] in PAUSE_RANK)){ k++; continue; }   // a pause (or line break) the quote leaves out
    if(w === BND){ if(k < H && hay[k] === BND) k++; j++; continue; }
    if(k >= H) return -1;
    var h = hay[k];
    if(h === w){ j++; k++; continue; }
    if(h === BND || h === HARD) return -1;
    if(j > 0 && skips > 0){
      var step = 0;
      if((h in SOFT1) && !(h === 'like' && k > 0 && (hay[k - 1] in LIKE_SUBJ) && k + 1 < H && ((hay[k + 1] in LIKE_OBJ) || (hay[k + 1].length > 4 && /ing$/.test(hay[k + 1]))))) step = 1;
      else if(k + 1 < H && ((h + ' ' + hay[k + 1]) in SOFT2)) step = 2;
      if(step){ var r = matchAt(hay, k + step, needle.slice(j), skips - 1, budget); if(r >= 0 || r === -2) return r; }
    }
    return -1;
  }
  return k;
}
/* A quote may not stop right before a negation the speaker said ("I did" cut from
   "I did not know"), nor start within three words after one in the same clause:
   "lied to my manager" from "I have never once lied to my manager", "hit the target"
   from "I failed to hit the target", "blaming the vendor" from "instead of blaming". */
var NEG_EDGE = mkSet(Object.keys(NEGATIONS).concat(['hardly', 'barely', 'rarely', 'seldom']));
/* Where a negation's reach ends, walking back from a quote (up to eight words): the verb's own subject ("...no
   budget, so I built it"), a clause-joining word, or a comma that opens a new clause ("Instead of blaming the vendor,
   I fixed it"; "No, the vendor lied"). It does reach across an aside ("I never, ever lied", "I did not, at any point,
   lie", "I never, the whole time, lied") - but a negation INSIDE a self-contained aside stays there ("My manager, who
   never liked the plan, approved it"); into a clause a verb or noun takes ("I don't think I've ever missed", "I can't
   recall a time I missed", "There's no way I would blame", "Neither my manager nor I blamed"); and into the items of
   a list under a negated lead-in ("I have never:\n- missed ..."). Mirror of the server. */
var NEG_SUBJ = mkSet(["ellas", "elles", "ellos", "eu", "he", "i", "ich", "ils", "je", "nosotros", "nous", "nós", "she", "they", "we", "wir", "yo", "мы", "он", "она", "они", "я"]);
var NEG_AUX = mkSet(["am", "are", "can", "could", "did", "do", "does", "had", "has", "have", "is", "may", "might", "must", "shall", "should", "was", "were", "will", "would"]);
var NEG_CONJ = mkSet(["although", "and", "because", "but", "however", "so", "then", "though", "whereas", "which", "while", "yet"]);
var NEG_CLAUSE_START = mkSet(["a", "although", "an", "and", "because", "but", "ellas", "elles", "ellos", "eu", "he", "her", "his", "however", "i", "ich", "ils", "it", "je", "my", "nosotros", "nous", "nós", "our", "she", "so", "that", "the", "their", "then", "these", "they", "this", "those", "though", "we", "whereas", "which", "while", "wir", "yet", "yo", "you", "мы", "он", "она", "они", "я"]);
var NEG_LINK = mkSet(["believe", "believed", "certain", "claim", "claimed", "doubt", "expect", "expected", "feel", "felt", "guess", "if", "imagine", "imagined", "knew", "know", "likely", "mean", "possible", "recall", "recalled", "remember", "remembered", "said", "say", "suppose", "supposed", "sure", "think", "thought", "true", "way", "whether"]);
var NEG_REL_HEAD = mkSet(["case", "day", "days", "instance", "job", "moment", "month", "months", "occasion", "one", "place", "point", "project", "projects", "quarter", "quarters", "situation", "team", "time", "times", "week", "weeks", "year", "years"]);
var NEG_ASIDE_SELF = mkSet(["which", "who", "whom", "whose"]);
var NEG_ADVERB_ASIDE = mkSet(["a", "all", "at", "even", "ever", "never", "not", "once", "one", "really", "single", "time"]);
var DENY_LEAD = mkSet(["absolutely", "certainly", "definitely", "honestly", "obviously"]);
function negLink(hay, p){
  if(p < 0) return false;
  var t = hay[p];
  if(t === 'that') return true;
  if(t === 'when' || t === 'where') return p > 0 && (hay[p - 1] in NEG_REL_HEAD);
  return (t in NEG_LINK) || (t in NEG_REL_HEAD) || (t in NEG_BEFORE);
}
function negatorAt(hay, k){
  var t = hay[k];
  return ((t in NEG_BEFORE) && !(t === 'not' && k + 1 < hay.length && (hay[k + 1] === 'only' || hay[k + 1] === 'just'))) || (t === 'of' && k > 0 && hay[k - 1] === 'instead');
}
function negatedBefore(hay, i){
  // ...or right after someone else's request: "asked me to fudge the numbers".
  if(i >= 2 && (hay[i - 1] === 'to' || hay[i - 1] === 'into') && ((hay[i - 2] in REQUEST_VERBS) || (i >= 3 && (hay[i - 2] in OBJ_PRONOUNS) && (hay[i - 3] in REQUEST_VERBS)))) return true;
  var n = hay.length;
  // A quote that starts with its own subject is a clause of its own, unless the word before it ties it to a negated clause.
  if((hay[i] in NEG_SUBJ) && !(i > 0 && (hay[i - 1] in NEG_AUX))){
    if(i > 0 && hay[i - 1] === NEGLEAD) return true;
    if(!negLink(hay, i - 1)) return false;
  }
  var seen = 0, k = i - 1, asideOpen = -1;
  while(k >= 0 && seen < 8){
    var t = hay[k];
    if(t === NEGLEAD) return true;
    if(t === BND || t === HARD || t === LINE) return false;
    if(t === ','){
      if(k === asideOpen){ k--; continue; }   // the opening comma of an aside already walked through
      var nxt = k + 1 < n ? hay[k + 1] : '';
      if((nxt in NEG_CLAUSE_START) && !(nxt === 'that' && k + 2 < n && (hay[k + 2] in NEG_SUBJ))) return false;
      var p = k - 1, m = 0;
      while(p >= 0 && m < 8 && hay[p] !== ',' && hay[p] !== BND && hay[p] !== HARD && hay[p] !== LINE && hay[p] !== NEGLEAD){ p--; m++; }
      if(p >= 0 && hay[p] === ','){
        var aside = hay.slice(p + 1, k);
        if(aside.length && aside.every(function(x){ return x in NEG_ADVERB_ASIDE; }) && aside.some(function(x){ return x in NEG_BEFORE; })) return true;   // "I have, not once, missed ..."
        if(aside.length && ((aside[0] in NEG_ASIDE_SELF) || (aside[0] in NEG_BEFORE))){ k = p - 1; continue; }   // a self-contained aside
        asideOpen = p;
      }
      k--; continue;
    }
    if(negatorAt(hay, k)) return true;
    if(t === 'than'){   // "I would rather quit than have lied"
      for(var r = k - 1; r >= 0 && r >= k - 4 && hay[r] !== ',' && hay[r] !== BND && hay[r] !== HARD && hay[r] !== LINE && hay[r] !== NEGLEAD; r--){ if(hay[r] === 'rather') return true; }
    }
    if(t in NEG_CONJ) return false;
    if((t in NEG_SUBJ) && !(k > 0 && (hay[k - 1] in NEG_AUX))){
      if(!negLink(hay, k - 1)) return false;
      k--; continue;
    }
    if(!((t in NEG_AUX) || (t in NEG_SUBJ) || t === 'that')) seen++;   // "...did I lie": the inverted subject and its auxiliary don't count
    k--;
  }
  return false;
}
/* A quote cut from "Did I fudge the numbers? No, never." (or "Nope, I reported it.", "Not once.", "Absolutely not.", "Of
   course not.") is the opposite of what was said. */
function answeredNo(hay, k){
  var H = hay.length;
  while(k < H && hay[k] !== BND && hay[k] !== HARD) k++;
  if(k >= H || hay[k] !== BND) return false;
  var j = k + 1;
  if(j >= H) return false;
  var t = hay[j];
  if(t in NO_REPLY){ var e = j + 1; return e >= H || hay[e] === BND || hay[e] === HARD || hay[e] === LINE || hay[e] === ',' || ['way', 'chance', 'never', 'not', 'once', 'ever'].indexOf(hay[e]) >= 0; }
  if(t === 'not') return true;
  if(t in DENY_LEAD) return j + 1 < H && hay[j + 1] === 'not';
  return t === 'of' && hay[j + 1] === 'course' && hay[j + 2] === 'not';
}
function findSeq(hay, needle, start, end, left, right, budget){
  var n = needle.length; if(!n) return [start, start];
  var last = end == null ? hay.length - 1 : Math.min(hay.length - 1, end);
  for(var i = start; i <= last; i++){
    if(hay[i] !== needle[0] || (left && negatedBefore(hay, i))) continue;
    var k = matchAt(hay, i, needle, 2, budget);
    if(k === -2) return null;   // near-miss input built to be slow fails closed
    if(k >= 0 && !(right && ((k < hay.length && (hay[k] in NEG_EDGE)) || answeredNo(hay, k)))) return [i, k];
  }
  return null;
}
/* The material, tokenised once and remembered - a result with many quoted fields
   checks them all against one corpus. */
/* The last few corpora, tokenised once (a result checks many fields against one corpus,
   and a turn alternates between the answer and the session). */
function memo(fn){ var m = new Map(); return function(c){ if(m.has(c)){ var v = m.get(c); m.delete(c); m.set(c, v); return v; } var r = fn(c); m.set(c, r); while(m.size > 4) m.delete(m.keys().next().value); return r; }; }
var hayMemo = memo(function(c){ return mtoks(c); }), figMemo = memo(function(c){ return figures(c); });
function flatCorpus(corpus){ return Array.isArray(corpus) ? corpus.map(String).join(' ') : String(corpus == null ? '' : corpus); }
function hayOf(corpus){ return hayMemo(flatCorpus(corpus)); }
/* Characters word matching can't compare (accents, other scripts, fullwidth or
   non-Latin digits, symbols): a quote holding one must appear literally. */
/* Characters word matching can't compare (fullwidth or non-Latin digits, symbols, a
   script written without spaces): the quote must then also appear literally. Letters
   of any script are words. */
function needsLiteral(q){ var t = normMarks(q); for(var c of t){ if(c.codePointAt(0) > 127 && !(c in LIT_OK) && (!LETTER_RE.test(c) || NOSPACE_RE.test(c))) return true; } return false; }
function litNorm(x){ return normMarks(normText(x)).replace(WS_RE, ' ').replace(/^ +| +$/g, ''); }
function literalIn(q, corpus){ return litNorm(flatCorpus(corpus)).indexOf(litNorm(q)) >= 0; }
/* True when the quote really appears in the corpus, word for word, inside one
   sentence of one piece of material (unless the quote itself spans sentences).
   '...' joins fragments that must each be 3+ words, in order, close together,
   within one sentence - and the words an ellipsis skips may not include a 'not',
   a pronoun, a 'tried to' or any word that changes who did what. A quote with
   accents, another script or unusual characters must appear literally. */
var MAX_QUOTE_TOKENS = 150, SEARCH_BUDGET = 400000;   // match steps one text's quotes may take in all: real text needs a few thousand each
function verifyQuote(quote, corpus, budget){
  var q = squash(quote, 6000).split(SEP).join(' '); if(!q) return false;
  if(needsLiteral(q)){
    // Symbols and other digits must be there literally - and the words around them
    // still pass every word rule below (a "never" before them, a sentence end).
    if(!literalIn(q, corpus)) return false;
    if(NOSPACE_RE.test(q) || !qtoks(q).length) return true;
  }
  if(!qtoks(q).length) return false;
  var frags = q.split(/\.\.\.|…/).filter(function(f){ return qtoks(f).length; });
  if(frags.length > 1 && frags.some(function(f){ return qtoks(f).length < 3; })) return false;
  var needles = frags.map(needleOf);
  if(needles.reduce(function(n, x){ return n + x.length; }, 0) > MAX_QUOTE_TOKENS) return false;   // nobody quotes 150 words verbatim
  var hay = hayOf(corpus), pos = 0, first = true;
  budget = budget || [SEARCH_BUDGET];
  for(var k = 0; k < frags.length; k++){
    var hit = findSeq(hay, needles[k], pos, first ? null : pos + 12, first, k === frags.length - 1, budget);
    if(!hit) return false;
    if(!first){ for(var g = pos; g < hit[0]; g++){ if((hay[g] in GAP_STOP) || hay[g] === BND || hay[g] === HARD) return false; } }
    pos = hit[1]; first = false;
  }
  return true;
}
/* The text before a quote, back to the start of its sentence (at most 100 characters). */
function windowBefore(t, start){
  var cps = Array.from(t.slice(0, Math.max(0, start))), w = cps.slice(Math.max(0, cps.length - 100)).join('');
  w = w.replace(/\b(e\.g|i\.e)\./gi, function(m, g){ return g.replace(/\./g, '') + ','; });
  var cut = Math.max(w.lastIndexOf('. '), w.lastIndexOf('! '), w.lastIndexOf('? '), w.lastIndexOf('\n'));
  return cut >= 0 ? w.slice(cut + 1) : w;
}
/* Single quotes are checked when the text presents them as someone's words: after
   an attribution (any subject), after a second-person one ("you confessed", "your
   resume claims", "as you put it in Q2:"), or when the span itself is in the first
   person - unless they're clearly a suggested line ("say 'I owned it'"). */
/* [start, end] of every phrase in the window that attributes words to the candidate:
   "you <verb>" ("you opened by saying", "you were the"), "your <thing> was/as", "in
   your second answer", "as you put it" - never advice ("you could say", "you'd say",
   "then you say", "next time you just say"). */
function attrCores(win){
  var out = [], m, re = new RegExp(YOU_CORE_RE.source, 'gi');
  while((m = re.exec(win))){
    if(m[0] === ''){ re.lastIndex++; continue; }
    var mods = m[1].toLowerCase(), verb = m[2].toLowerCase();
    if((verb in NOT_VERB) || YOU_MODAL.some(function(x){ return mods.indexOf(x) >= 0; })) continue;
    if(mods.indexOf("'d") >= 0 && !PAST_LIKE_RE.test(verb)) continue;   // "you'd say" suggests; "you'd said" attributes
    if((verb in INSTR_VERBS) && (mods.indexOf(' just') >= 0 || mods.indexOf(' simply') >= 0 || mods.indexOf(' then') >= 0 || INSTR_BEFORE_RE.test(win.slice(0, m.index)))) continue;
    out.push([m.index, m.index + m[0].length]);
  }
  var r2 = new RegExp(YOUR_CORE_RE.source, 'gi');
  while((m = r2.exec(win))){ if(m[0] === ''){ r2.lastIndex++; continue; } out.push([m.index, m.index + m[0].length]); }
  return out.sort(function(a, b){ return a[0] - b[0] || a[1] - b[1]; });
}
/* Is a single-quoted span presented as someone's words (so it must be real)? Decided
   by who it's attributed to: an attribution before it or after it ("- your words"),
   or a first-person span - unless the nearest cue makes it a suggested line ("say
   ...", "better:", "a stronger line would be", "... would land harder") with nothing
   tying it back to the candidate. */
/* "As 'Head of Analytics' at Northwind, how did you ..." presents a title as theirs. */
var AS_ROLE_RE = new RegExp("(?:^|[^a-z])as\\W{0,3}$", 'i'), YOU_AFTER_RE = new RegExp("^[^.!?\\n]{0,80}\\byour?\\b", 'i');
function singleChecked(win, span, after){
  after = after || '';
  if(POST_ATTR_RE.test(after) || (AS_ROLE_RE.test(win) && YOU_AFTER_RE.test(after))) return true;
  if(POST_HYPO_RE.test(after)) return false;
  var cores = attrCores(win), sug = SUGGEST_RE.exec(win);
  if(sug){
    var prior = cores.filter(function(c){ return c[0] < sug.index; });
    if(!prior.length) return false;
    var b = prior[prior.length - 1][1];
    if(b > sug.index) return true;                      // the cue is part of the attribution: "you kept saying"
    if(SUGGEST_STRONG_RE.test(win)) return false;       // "when you said you helped, a stronger line would be: 'I ...'"
    return !CLAUSE_BREAK_RE.test(win.slice(b, sug.index));
  }
  if(cores.length && !ATTR_BREAK_RE.test(win.slice(cores[cores.length - 1][1]))) return true;
  return !!(ATTRIB_RE.test(win) || FIRST_PERSON_RE.test(span));
}
/* [span, the text before it in its sentence] for every span a text presents as
   someone's words: double-style quotes in any script (TeX ``...'' too), an
   unclosed trailing one, and single quotes after an attribution or in the first
   person - including a plural possessive inside ("my teams' results") and an
   unclosed one. */
function quotedSpansAt(text){
  var t = normMarks(text).replace(/''/g, '"'), out = [], pos = 0, parts = t.split('"'), m;
  parts.forEach(function(part, k){
    if(k % 2 === 1 && part.replace(WS_RE, '') !== ''){ var e = pos + part.length + 1; out.push([part, windowBefore(t, pos - 1), k < parts.length - 1 ? Array.from(t.slice(e, e + 160)).slice(0, 80).join('') : '']); }
    pos += part.length + 1;
  });
  var re = new RegExp(SINGLE_SPAN_RE.source, 'gi');
  while((m = re.exec(t))){
    var span = m[1], end = m.index + m[0].length, win = windowBefore(t, m.index);
    if(m[0] === ''){ re.lastIndex++; continue; }
    if(!singleChecked(win, span, Array.from(t.slice(end, end + 160)).slice(0, 80).join(''))) continue;
    while(/s$/i.test(span) && / [a-z]/i.test(t.slice(end, end + 2))){
      var cs = new RegExp(CLOSE_SINGLE_RE.source, 'gi'); cs.lastIndex = end; var nx = cs.exec(t);
      if(!nx || nx.index - m.index > 2000) break;
      span = t.slice(m.index + 1, nx.index); end = nx.index + 1;
    }
    out.push([span, win, Array.from(t.slice(end, end + 160)).slice(0, 80).join('')]);
  }
  return out;
}
function quotedSpans(text){ return quotedSpansAt(text).map(function(p){ return p[0]; }); }
/* Is the nearest speaker before a quote the candidate? A "you"/"your" counts unless
   something later in the window hands the words to someone else - another speaker,
   the role, or a question or hypothetical put to them. */
function speakerIsCandidate(win){
  var o = null, c = null, m;
  [OTHER_SPEAKER_RE, ROLE_SPEAKER_RE, HYPO_YOU_RE].forEach(function(src){
    var r = new RegExp(src.source, 'gi');
    while((m = r.exec(win))){ if(m[0] === ''){ r.lastIndex++; continue; } if(o == null || m.index + m[0].length > o.index + o[0].length) o = m; }
  });
  var r2 = new RegExp(CAND_SPEAKER_RE.source, 'gi');
  while((m = r2.exec(win))){ if(m[0] === ''){ r2.lastIndex++; continue; } c = m; }
  if(c == null) return false;
  if(o == null) return true;
  return c.index >= o.index + o[0].length;   // "would you": the hypothetical covers the "you" itself
}
/* Every quoted span is really in the corpus (a span with no letters or digits is
   ignored). With `broad`, a span presented as the candidate's must be in `corpus` -
   by its nearest speaker before it ("you agreed ...", "your resume says ...") or by
   an attribution after it ('"..." you said', '"..." - those were your words'); any
   other may come from `broad`. Mirror of quotes_ok. */
function quotesOk(text, corpus, broad){
  var sp = quotedSpansAt(text), budget = [SEARCH_BUDGET];   // shared by every quote in the text
  for(var i = 0; i < sp.length; i++){
    if(!hasContent(sp[i][0])) continue;
    var c = broad == null || speakerIsCandidate(sp[i][1]) || POST_ATTR_RE.test(sp[i][2]) ? corpus : broad;
    if(!verifyQuote(sp[i][0], c, budget)) return false;
  }
  return true;
}
/* (value, unit, label) for every figure, after number words, $ and % are
   normalised; bare 0-2 without a unit aren't claims. Mirror of the server's _figures. */
/* Thousands grouped with spaces - "10 000", "250 000" - are one figure; "3 100-person teams" stays two. Mirror of _join_groups. */
var SPACE_GROUP_RE = /(?<![0-9.,$\u00a3\u20ac\u00a5\u20b9])([0-9]{1,3})((?:[ \u00a0\u202f\u2009][0-9]{3})+)(?![0-9.,]|[ \u00a0\u202f\u2009][0-9])/g;
function joinGroups(t){
  if(typeof t !== 'string') return t;
  return t.replace(SPACE_GROUP_RE, function(m, a, rest){ if(a.length < 2 && rest.match(/[0-9]{3}/g).length < 2 && !/[\u00a0\u202f\u2009]/.test(rest)) return m; return a + rest.replace(/[ \u00a0\u202f\u2009]/g, ','); });
}
function figures(text){
  var toks = qtoks(joinGroups(text)), out = [];
  for(var k = 0; k < toks.length; k++){
    var t = toks[k];
    if(t in WORD_FIGS){ out.push([WORD_FIGS[t], 'x', t]); continue; }   // "doubled", "tripled", "halved", "tenfold" are figures too
    if((t === 'in' || t === 'by') && toks[k + 1] === 'half'){ out.push([0.5, 'x', t + ' half']); continue; }
    if((t === 'order' || t === 'orders') && toks[k + 1] === 'of' && toks[k + 2] === 'magnitude'){ out.push([t === 'order' ? 10 : 100, 'x', t + ' of magnitude']); continue; }   // "an order of magnitude" is 10x
    if(!NUM_TOK_RE.test(t)) continue;
    var nx = k + 1 < toks.length ? toks[k + 1] : '', pv = k > 0 ? toks[k - 1] : '';
    if(nx === 'fold'){ out.push([parseFloat(t), 'x', t + '-fold']); continue; }   // "40-fold"
    if((nx === 'figure' || nx === 'figures') && /^[5-9]$/.test(t)){ out.push([parseFloat(t), 'figs', t + ' figures']); continue; }   // "six figures" is a size
    if((nx === 'thirds' && (t === '1' || t === '2')) || (nx === 'quarters' && (t === '1' || t === '2' || t === '3') && ((pv in FRAC_BEFORE) || toks[k + 2] === 'of'))){
      out.push([Math.round(parseFloat(t) / (nx === 'thirds' ? 3 : 4) * 1e6) / 1e6, 'x', t + ' ' + nx]); continue;   // a fraction, not a period of time
    }
    var unit = nx === 'usd' ? '$' : nx === 'pct' ? '%' : nx === 'times' ? 'x' : '';
    var v = parseFloat(t); if(!unit && v <= 2) continue;
    out.push([v, unit, unit === '$' ? '$' + t : t + unit]);
  }
  return out;
}
/* A figure is theirs when they gave it with the same unit (a bare number: any); "six
   figures" also when they gave an amount of that many digits. Mirror of _supported. */
function supported(f, vals, pairs, have){
  if(pairs[f[0] + '|' + f[1]] || (f[1] === '' && vals[String(f[0])])) return true;
  return f[1] === 'figs' && have.some(function(h){ return (h[1] === '$' || h[1] === '') && Math.pow(10, f[0] - 1) <= h[0] && h[0] < Math.pow(10, f[0]); });
}
/* Figures in `out` that aren't in `source` (a unit has to match). */
function unsupportedNumbers(source, out){
  var have = figMemo(flatCorpus(source));
  var vals = Object.create(null), pairs = Object.create(null);
  have.forEach(function(f){ vals[String(f[0])] = 1; pairs[f[0] + '|' + f[1]] = 1; });
  var bad = [];
  figures(out).forEach(function(f){ if(supported(f, vals, pairs, have)) return; if(bad.indexOf(f[2]) < 0) bad.push(f[2]); });
  return bad;
}
/* Advice about the ANSWER itself - "keep it under 90 seconds", "prepare 3 stories",
   "rehearse it 5 times", "spend 60% on the action" - isn't a fact about you, so it's
   never flagged as a figure you didn't give. Every other figure in "say this" text
   still is ("say you cut churn 40%"). Generated from the server's _ADVICE_FIGS (\s is
   ASCII whitespace there, so it is spelled out), applied in the same order. */
var ADVICE_FIG_RES = [
  new RegExp("(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*(?:sentences?|wpm|words?[ \\t\\n\\r\\f\\v]+(?:a|per)[ \\t\\n\\r\\f\\v]+minute|bullets?(?:[ \\t\\n\\r\\f\\v]+points?)?|beats?|breaths?)\\b", 'gi'),
  new RegExp("(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*(?:seconds?|secs?|minutes?|mins?|words?|lines?)\\b(?:[ \\t\\n\\r\\f\\v]|-)+(?:long[ \\t\\n\\r\\f\\v]+)?(?:answers?|responses?|versions?|story|stories|pitch|pitches|intros?|introductions?|summary|summaries|openers?|opening|closers?|closing|close|wrap-?ups?|wrap|recaps?|overviews?|explanations?|reply|replies|rundowns?|headlines?|hooks?|statements?|elevator|tmays)\\b", 'gi'),
  new RegExp("\\b(?:keep|kept|aim|spend|speak|talk|talking|pause|breathe|answer|answers|answering|respond|responses|responding|replying|speaking|point|finish|wrap|trim|rehearse|practi[cs]e|limit|cap|deliver|ramble|rambling|droning|drag|dragging|say[ \\t\\n\\r\\f\\v]+it|tell[ \\t\\n\\r\\f\\v]+it|get[ \\t\\n\\r\\f\\v]+it|cut[ \\t\\n\\r\\f\\v]+it|bring[ \\t\\n\\r\\f\\v]+it)\\b(?:[ \\t\\n\\r\\f\\v]+(?:it's|it|this|that|each|every|your|the|a|an|answer|answers|response|responses|story|stories|pitch|intro|introduction|summary|setup|set-up|situation|context|background|opener|opening|close|closing|whole|thing|reply|total|overall|all|to|under|within|below|around|about|roughly|approximately|at|for|in|max|maximum|no|more|than|less|over|past|beyond|longer|on|only|just|first|tight|short|brief|tops)\\b){0,5}[ \\t\\n\\r\\f\\v]+(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*(?:seconds?|secs?|minutes?|mins?|words?|lines?)\\b", 'gi'),
  new RegExp("\\b(?:answer|answers|response|responses|story|pitch|intro|introduction|opener|setup|set-up|summary)[ \\t\\n\\r\\f\\v]+(?:ran|runs|run|went|goes|lasted|lasts|took|takes|was|is|should[ \\t\\n\\r\\f\\v]+be|must[ \\t\\n\\r\\f\\v]+be|needs[ \\t\\n\\r\\f\\v]+to[ \\t\\n\\r\\f\\v]+be|has[ \\t\\n\\r\\f\\v]+to[ \\t\\n\\r\\f\\v]+be|can[ \\t\\n\\r\\f\\v]+be|stays?|fits?)(?:[ \\t\\n\\r\\f\\v]+(?:it's|it|this|that|each|every|your|the|a|an|answer|answers|response|responses|story|stories|pitch|intro|introduction|summary|setup|set-up|situation|context|background|opener|opening|close|closing|whole|thing|reply|total|overall|all|to|under|within|below|around|about|roughly|approximately|at|for|in|max|maximum|no|more|than|less|over|past|beyond|longer|on|only|just|first|tight|short|brief|tops)\\b){0,3}[ \\t\\n\\r\\f\\v]+(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*(?:seconds?|secs?|minutes?|mins?|words?|lines?)\\b", 'gi'),
  new RegExp("\\b(?:the|your)[ \\t\\n\\r\\f\\v]+(?:first|last|final|opening|closing)[ \\t\\n\\r\\f\\v]+(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*(?:(?:seconds?|secs?|minutes?|mins?|words?|lines?)\\b|sentences?\\b)", 'gi'),
  new RegExp("(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}[ \\t\\n\\r\\f\\v]*(?:%|percent\\b|per[ \\t\\n\\r\\f\\v]*cent\\b)?[ \\t\\n\\r\\f\\v]*(?:of[ \\t\\n\\r\\f\\v]+(?:your|the|each)[ \\t\\n\\r\\f\\v]+(?:answer|airtime|response|story|pitch)\\b|on[ \\t\\n\\r\\f\\v]+(?:the[ \\t\\n\\r\\f\\v]+|your[ \\t\\n\\r\\f\\v]+)?(?:actions?|situation|task|results?|context|setup|set-up)\\b)", 'gi'),
  new RegExp("(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}[ \\t\\n\\r\\f\\v]+(?:(?:seconds?|secs?)[ \\t\\n\\r\\f\\v]+)?on[ \\t\\n\\r\\f\\v]+(?:the[ \\t\\n\\r\\f\\v]+)?(?:context|situation|setup|set-up|task|actions?|results?)\\b", 'gi'),
  new RegExp("\\b(?:prepare|prep|bring|have|ask|pick|choose|give|list|name|share|offer|cite|use|mention|draft|write|jot|keep|include|add|cover|show|hit|land|make|weave[ \\t\\n\\r\\f\\v]+in|work[ \\t\\n\\r\\f\\v]+in|touch[ \\t\\n\\r\\f\\v]+on|highlight|feature|cut|drop|lose|skip|write[ \\t\\n\\r\\f\\v]+down|jot[ \\t\\n\\r\\f\\v]+down|write[ \\t\\n\\r\\f\\v]+out|note[ \\t\\n\\r\\f\\v]+down|line[ \\t\\n\\r\\f\\v]+up|map[ \\t\\n\\r\\f\\v]+out|lead[ \\t\\n\\r\\f\\v]+with|end[ \\t\\n\\r\\f\\v]+with|close[ \\t\\n\\r\\f\\v]+with|open[ \\t\\n\\r\\f\\v]+with|focus[ \\t\\n\\r\\f\\v]+on|stick[ \\t\\n\\r\\f\\v]+to|limit[ \\t\\n\\r\\f\\v]+(?:it|yourself)[ \\t\\n\\r\\f\\v]+to|cut[ \\t\\n\\r\\f\\v]+it[ \\t\\n\\r\\f\\v]+(?:down[ \\t\\n\\r\\f\\v]+)?to|trim[ \\t\\n\\r\\f\\v]+it[ \\t\\n\\r\\f\\v]+(?:down[ \\t\\n\\r\\f\\v]+)?to)[ \\t\\n\\r\\f\\v]+(?:(?:at[ \\t\\n\\r\\f\\v]+least|up[ \\t\\n\\r\\f\\v]+to|about|around|roughly|exactly|just|only|no[ \\t\\n\\r\\f\\v]+more[ \\t\\n\\r\\f\\v]+than|the|your|top|best|key|strongest|main|them|him|her|you|me|us)[ \\t\\n\\r\\f\\v]+){0,3}(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]+of[ \\t\\n\\r\\f\\v]+(?:the|your|these|those|them)(?:[ \\t\\n\\r\\f\\v]+(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3})?)?[ \\t\\n\\r\\f\\v]+(?:(?:short|strong|solid|specific|concrete|clear|good|great|sharp|smart|real|recent|different|key|main|crisp|quick|brief|relevant|tight|distinct|separate|true|honest|thoughtful|tailored|targeted|probing|follow-up|more|other|ready|go-to|strongest|best|top|star|biggest|proudest|filler|hard|measurable|big)[ \\t\\n\\r\\f\\v]+){0,3}(?:examples?|story|stories|questions?|reasons?|strengths?|takeaways?|highlights?|anecdotes?|specifics|details|facts|bullets?|sentences?|beats?|things|ideas|lessons|traits|qualities|answers|metrics?|numbers|figures|data[ \\t\\n\\r\\f\\v]+points?|messages|achievements|accomplishments|wins|results|skills|keywords|phrases|points)\\b", 'gi'),
  new RegExp("\\b(?:a|per|each|every)[ \\t\\n\\r\\f\\v]+(?:day|week)[ \\t\\n\\r\\f\\v]+for[ \\t\\n\\r\\f\\v]+(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}[ \\t\\n\\r\\f\\v]+(?:days?|weeks?)\\b", 'gi'),
  new RegExp("(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}[ \\t\\n\\r\\f\\v]+(?:(?:real|hard|honest|true)[ \\t\\n\\r\\f\\v]+)?(?:numbers?|figures?|metrics?|data[ \\t\\n\\r\\f\\v]+points?)[ \\t\\n\\r\\f\\v]+(?:that[ \\t\\n\\r\\f\\v]+)?(?:you[ \\t\\n\\r\\f\\v]+)?(?:really|actually|truly|honestly|can[ \\t\\n\\r\\f\\v]+(?:prove|back[ \\t\\n\\r\\f\\v]+up|defend|stand[ \\t\\n\\r\\f\\v]+behind))\\b", 'gi'),
  new RegExp("\\b(?:answer|answer[ \\t\\n\\r\\f\\v]+it|structure[ \\t\\n\\r\\f\\v]+it|split[ \\t\\n\\r\\f\\v]+it|break[ \\t\\n\\r\\f\\v]+it(?:[ \\t\\n\\r\\f\\v]+down)?|tell[ \\t\\n\\r\\f\\v]+it|frame[ \\t\\n\\r\\f\\v]+it|organi[sz]e[ \\t\\n\\r\\f\\v]+it)[ \\t\\n\\r\\f\\v]+(?:in|into)[ \\t\\n\\r\\f\\v]+(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}[ \\t\\n\\r\\f\\v]+(?:parts|steps|beats|chunks|sections|stages|points)\\b", 'gi'),
  new RegExp("\\b(?:practi[cs]e|rehearse|drill)\\b(?:[ \\t\\n\\r\\f\\v]+(?:it|this|that|them|each|every|one|the|your|answer|answers|story|stories|pitch|opening|opener|intro|introduction|close|closing|response|responses|version|line|lines|sentence|summary|aloud|out|loud|again|through|yourself|in|front|of|a|mirror|friend|with|mentor|partner|timer|camera|job|description|jd|posting|notes|card|list|plan|script|questions|role)\\b){0,6}[ \\t\\n\\r\\f\\v]+(?:(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}[ \\t\\n\\r\\f\\v]*(?:more[ \\t\\n\\r\\f\\v]+)?(?:times\\b|x\\b|reps\\b|takes\\b|run-throughs?\\b|tries\\b|attempts\\b)|twice\\b|thrice\\b)", 'gi'),
  new RegExp("\\b(?:run[ \\t\\n\\r\\f\\v]+through|run|say|repeat|record|read)(?:[ \\t\\n\\r\\f\\v]+(?:it|this|that|them|each|every|one|the|your|answer|answers|story|stories|pitch|opening|opener|intro|introduction|close|closing|response|responses|version|line|lines|sentence|summary|aloud|out|loud|again|through|yourself|in|front|of|a|mirror|friend|with|mentor|partner|timer|camera|job|description|jd|posting|notes|card|list|plan|script|questions|role)\\b){1,6}[ \\t\\n\\r\\f\\v]+(?:(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}[ \\t\\n\\r\\f\\v]*(?:more[ \\t\\n\\r\\f\\v]+)?(?:times\\b|x\\b|reps\\b|takes\\b|run-throughs?\\b|tries\\b|attempts\\b)|twice\\b|thrice\\b)", 'gi'),
  new RegExp("\\b(?:do|book|schedule|try|aim[ \\t\\n\\r\\f\\v]+for|get[ \\t\\n\\r\\f\\v]+in|fit[ \\t\\n\\r\\f\\v]+in|squeeze[ \\t\\n\\r\\f\\v]+in)[ \\t\\n\\r\\f\\v]+(?:(?:at[ \\t\\n\\r\\f\\v]+least|another|about|around|roughly|just|only)[ \\t\\n\\r\\f\\v]+)?(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}[ \\t\\n\\r\\f\\v]+(?:more[ \\t\\n\\r\\f\\v]+)?(?:mocks?|mock[ \\t\\n\\r\\f\\v]+interviews?|drills?|dry[ \\t\\n\\r\\f\\v]+runs?|run-throughs?|practice[ \\t\\n\\r\\f\\v]+(?:runs?|sessions?|rounds?|interviews?)|timed[ \\t\\n\\r\\f\\v]+(?:runs?|answers?|sessions?|rounds?)|hot[ \\t\\n\\r\\f\\v]+seat[ \\t\\n\\r\\f\\v]+(?:runs?|sessions?|rounds?|interviews?)|full[ \\t\\n\\r\\f\\v]+(?:mocks?|run-throughs?|runs?)|reps|takes|rounds)\\b", 'gi'),
  new RegExp("\\b(?:cut|trim|shorten)[ \\t\\n\\r\\f\\v]+(?:your|the)[ \\t\\n\\r\\f\\v]+(?:answer|story|setup|set-up|intro|pitch|preamble|context)[ \\t\\n\\r\\f\\v]+(?:down[ \\t\\n\\r\\f\\v]+)?(?:in|by)[ \\t\\n\\r\\f\\v]+half\\b", 'gi'),
  new RegExp("\\bhalve[ \\t\\n\\r\\f\\v]+(?:your|the)[ \\t\\n\\r\\f\\v]+(?:answer|story|setup|set-up|intro|pitch|preamble|context)\\b", 'gi'),
  new RegExp("\\b(?:shave|cut|trim|drop|lose)[ \\t\\n\\r\\f\\v]+(?:(?:about|around|roughly|at[ \\t\\n\\r\\f\\v]+least)[ \\t\\n\\r\\f\\v]+)?(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*(?:seconds?|secs?|minutes?|mins?|words?|lines?)\\b[ \\t\\n\\r\\f\\v]+(?:off|from|out[ \\t\\n\\r\\f\\v]+of)[ \\t\\n\\r\\f\\v]+(?:your[ \\t\\n\\r\\f\\v]+(?:answer|story|setup|set-up|intro|pitch|preamble|context|opener|opening|close|closing|situation|response|summary)|(?:the|this|that)[ \\t\\n\\r\\f\\v]+(?:answer|story|intro|pitch|preamble|opener|response|summary))\\b", 'gi'),
  new RegExp("(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*days?(?:[ \\t\\n\\r\\f\\v]|-)+plans?\\b", 'gi'),
  new RegExp("\\b(?:aim|target|shoot)[ \\t\\n\\r\\f\\v]+for[ \\t\\n\\r\\f\\v]+(?:(?:about|around|roughly|under|below|at[ \\t\\n\\r\\f\\v]+most|no[ \\t\\n\\r\\f\\v]+more[ \\t\\n\\r\\f\\v]+than|less[ \\t\\n\\r\\f\\v]+than)[ \\t\\n\\r\\f\\v]+)?(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?=[ \\t\\n\\r\\f\\v]*(?:[.,;:!?)\\n]|$))", 'gi')
];
/* ...and two that are advice only in a sentence with nothing about the work in it:
   "not a 6-minute one", "by the 2-minute mark", "cut it in half" ("say you cut it in
   half" is a claim). */
var ADVICE_PLAIN_RES = [
  new RegExp("(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*(?:seconds?|secs?|minutes?|mins?|words?|lines?)\\b(?:[ \\t\\n\\r\\f\\v]|-)+(?:long[ \\t\\n\\r\\f\\v]+)?(?:one|mark)\\b", 'gi'),
  new RegExp("\\b(?:cut|trim|shorten)[ \\t\\n\\r\\f\\v]+(?:it|this|that)[ \\t\\n\\r\\f\\v]+(?:down[ \\t\\n\\r\\f\\v]+)?(?:in|by)[ \\t\\n\\r\\f\\v]+half\\b|\\bhalve[ \\t\\n\\r\\f\\v]+(?:it|this|that)\\b", 'gi'),
  new RegExp("\\b(?:cut|trim|shorten|shrink)[ \\t\\n\\r\\f\\v]+(?:your[ \\t\\n\\r\\f\\v]+|the[ \\t\\n\\r\\f\\v]+)?(?:answers?|story|stories|setup|set-up|intro|introduction|context|background|opener)[ \\t\\n\\r\\f\\v]+(?:down[ \\t\\n\\r\\f\\v]+)?(?:in|by)[ \\t\\n\\r\\f\\v]+(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?(?:third|quarter|half)\\b|\\bhalve[ \\t\\n\\r\\f\\v]+(?:the|your)[ \\t\\n\\r\\f\\v]+(?:answers?|story|stories|setup|set-up|intro|introduction|context|background|opener)\\b", 'gi')
];
/* A sentence goes whole only when it is plainly about the answer (an answer cue), says
   nothing about an outcome, and every figure in it measures the answer. Anything else keeps
   its figures but the set phrases: a false "not in your answers" beats a missed invented
   figure. Mirrors of _SENT_SPLIT, _DELIVERY, _CLAIM_SIG, _ANSWER_CUE and _OUTCOME. */
var ADV_SENT_SPLIT = new RegExp("(?<=[.!?;])(?<!\\be\\.g\\.)(?<!\\bi\\.e\\.)[ \\t\\n\\r\\f\\v]+|\\n+", 'i');
var ADV_DELIVERY = new RegExp("(?:~[ \\t\\n\\r\\f\\v]*)?\\b(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)(?:[ \\t\\n\\r\\f\\v]*(?:-|\u2013|\u2014|/|to\\b|or\\b|and\\b)[ \\t\\n\\r\\f\\v]*(?:\\d+(?:\\.\\d+)?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:(?:[ \\t\\n\\r\\f\\v]|-)(?:one|two|three|four|five|six|seven|eight|nine))?\\b|(?:a[ \\t\\n\\r\\f\\v]+|one[ \\t\\n\\r\\f\\v]+)?hundred\\b)){0,3}(?:[ \\t\\n\\r\\f\\v]|-)*(?:[a-z]+(?:[ \\t\\n\\r\\f\\v]|-)+){0,2}?(?:seconds?|secs?|minutes?|mins?|words?|sentences?|lines?|bullets?|beats?|wpm|parts?|steps?|takes?|reps?|rounds?|runs?|run-throughs?|mocks?|drills?|sessions?|tries|attempts?|times|x|stories|story|examples?|questions?|reasons?|strengths?|takeaways?|anecdotes?|points?|things|ideas|details|specifics|metrics?|numbers|figures|messages|keywords|phrases|breaths?|versions?)\\b", 'i');
var ADV_CLAIM_SIG = new RegExp("[\\\"$\u00a3\u20ac\u00a5\u20b9%]|(?<![a-z0-9])'|'(?![a-z0-9])|\\b(?:per[ \\t\\n\\r\\f\\v]*cent|percent|usd|dollars?|euros?|pounds?|thousand|million|billion|k|m|bn)\\b|\\b(?:say|says|saying|said|mention|mentioning|quote|cite|claim|state|tell[ \\t\\n\\r\\f\\v]+them|tell[ \\t\\n\\r\\f\\v]+the|eg|for[ \\t\\n\\r\\f\\v]+example|for[ \\t\\n\\r\\f\\v]+instance|such[ \\t\\n\\r\\f\\v]+as)\\b|\\be\\.g\\.|\\b(?:you|i|we)[ \\t\\n\\r\\f\\v]+(?:[a-z]*[a-df-z]ed|led|grew|cut|ran|built|made|won|sold|brought|drove|took|saw|got|hit|beat|kept|set|met|did|had|have|has|was|were|own|run|lead|manage|handle)\\b|\\b(?:revenue|sales?|profits?|margins?|costs?|budgets?|savings?|churn|retention|conversions?|sign-?ups?|users?|customers?|clients?|accounts?|subscribers?|members?|tickets?|calls?|cases?|orders?|shipments?|deliveries|stockouts?|inventory|errors?|defects?|bugs?|incidents?|outages?|downtime|uptime|latency|traffic|leads?|deals?|pipeline|bookings?|nps|csat|accuracy|growth|engagement|teams?|people|staff|employees?|hires?|headcount|reports?|stores?|sites?|branches|locations?|projects?|products?|features?|releases?|deploys?|deployments?|builds?|tests?|experiments?|campaigns?|emails?|students?|patients?|volunteers?|events?|attendees?|requests?|transactions?|units?|items?|skus?|vendors?|suppliers?|partners?|stakeholders?|countries|markets?|regions?|code|codebase|services?|systems?|databases?|dashboards?|queries|process|processes|launch(?:es)?|kickoffs?|rollouts?|migrations?|timelines?|deadlines?)\\b|\\b(?:handle|load|wait|response|processing|resolution|turnaround|lead|cycle|build|onboarding|delivery|review|approval|checkout|page|query|render|boot|startup|run)[ \\t\\n\\r\\f\\v]+times?\\b", 'i');
var ADV_ANSWER_CUE = new RegExp("\\b(?:answer\\w*|respon(?:d|ding|se|ses)|results?|points|parts|structure\\w*|format|framework|think|thinking|story|stories|pitch|intros?|introduction|opener|openers|opening|closer|closing|setup|set-up|preamble|summary|headline|hook|star|interviews?|interviewer|panel|recruiter|mocks?|rehears\\w*|practi[cs]\\w*|drills?|timer|aloud|out[ \\t\\n\\r\\f\\v]+loud|notes?[ \\t\\n\\r\\f\\v]+card|cue[ \\t\\n\\r\\f\\v]+card|sentences?|bullets?|beats?|wpm|pace|pacing|pauses?|breaths?|breathe|takes|reps|run-throughs?|record|recording|recordings|speak|speaking|talk|talking|deliver|delivery|filler|fillers|examples?|questions?|reasons?|strengths?|takeaways?|anecdotes?|metrics?|numbers|figures|specifics|details|things|messages|keywords|phrases|competenc(?:y|ies)|job[ \\t\\n\\r\\f\\v]+description|jd|first|last|context|situation|action|actions|versions?|aim(?:[ \\t\\n\\r\\f\\v]+for)?|limit[ \\t\\n\\r\\f\\v]+(?:yourself|it|each|every)|wrap(?:[ \\t\\n\\r\\f\\v]+it)?[ \\t\\n\\r\\f\\v]+up|get[ \\t\\n\\r\\f\\v]+to[ \\t\\n\\r\\f\\v]+(?:the|your)|prepare|keep[ \\t\\n\\r\\f\\v]+(?:it|each|every)|stop[ \\t\\n\\r\\f\\v]+(?:at|after|before)|anything[ \\t\\n\\r\\f\\v]+(?:after|over|past|beyond|longer[ \\t\\n\\r\\f\\v]+than))\\b", 'i');
var ADV_OUTCOME = new RegExp("\\b(?:faster|slower|quicker|sooner|fewer|cheaper|lower|higher|bigger|smaller|better|worse)\\b|\\btwice[ \\t\\n\\r\\f\\v]+as\\b|\\b(?:more|less)[ \\t\\n\\r\\f\\v]+(?!than\\b)[a-z]|\\b(?:saved|saving|savings|instead[ \\t\\n\\r\\f\\v]+of|now|reduced|reduction|increased?|decreased?|dropped|fell|rose|grew|growth|jump(?:ed)?|improv(?:ed|ement)|boost(?:ed)?|gain(?:ed)?|speed|speed-?up|payoff|impact|outcome|before/after)\\b|\\b(?:up|down)[ \\t\\n\\r\\f\\v]+(?:by[ \\t\\n\\r\\f\\v]+|to[ \\t\\n\\r\\f\\v]+)?(?:about[ \\t\\n\\r\\f\\v]+|around[ \\t\\n\\r\\f\\v]+|roughly[ \\t\\n\\r\\f\\v]+|nearly[ \\t\\n\\r\\f\\v]+)?(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\\b|\\bfrom[ \\t\\n\\r\\f\\v]+(?:about[ \\t\\n\\r\\f\\v]+|around[ \\t\\n\\r\\f\\v]+|roughly[ \\t\\n\\r\\f\\v]+)?(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\\b[^.;!?\\n]{0,40}?\\bto[ \\t\\n\\r\\f\\v]+(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\\b|(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\\b[^.;!?\\n]{0,30}?\\b(?:cut|down|reduced)[ \\t\\n\\r\\f\\v]+to\\b|(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\\b(?:[ \\t\\n\\r\\f\\v]+[a-z]+){0,2}?[ \\t\\n\\r\\f\\v]+(?:back|saved|off[ \\t\\n\\r\\f\\v]+(?:the|each|every|per)|per[ \\t\\n\\r\\f\\v]+(?!(?:story|stories|answer|answers|question|questions|example|examples|point|points|part|parts|take|takes|rep|reps|round|rounds|mock|mocks|session|sessions|interview|interviews|response|responses|sentence|sentences|version|versions)\\b)[a-z]+|a[ \\t\\n\\r\\f\\v]+(?:shift|month|quarter|year)|each[ \\t\\n\\r\\f\\v]+(?:shift|month|quarter|year)|every[ \\t\\n\\r\\f\\v]+(?:shift|month|quarter|year))\\b|\\b(?:per|across)[ \\t\\n\\r\\f\\v]+(?:shift|agent|ticket|customer|user|order|call|employee|rep|store|office|region|team|person|case|request)s?\\b|(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\\b[ \\t\\n\\r\\f\\v]+of[ \\t\\n\\r\\f\\v]+(?:the[ \\t\\n\\r\\f\\v]+)?(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\\b|\\b[a-z]{3,}(?<!e)ed\\b", 'i');
var ADV_ELIDED = new RegExp("\\b(?:(?:not|than|or|vs\\.?|versus)[ \\t\\n\\r\\f\\v]+(?:about[ \\t\\n\\r\\f\\v]+|around[ \\t\\n\\r\\f\\v]+)?|(?:the[ \\t\\n\\r\\f\\v]+)?(?:best|top|strongest|first|last|other|remaining)[ \\t\\n\\r\\f\\v]+)(?:[0-9]+(?:[.,][0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\\b", 'i');
function allDelivery(x){ return ADV_DELIVERY.test(x) && !figures(x.replace(new RegExp(ADV_DELIVERY.source, 'gi'), ' ').replace(new RegExp(ADV_ELIDED.source, 'gi'), ' ')).length; }
function adviceText(s, span){
  return String(s == null ? '' : s).split(ADV_SENT_SPLIT).map(function(x){
    var claimy = ADV_CLAIM_SIG.test(normMarks(x));
    if(!claimy && allDelivery(x) && !ADV_OUTCOME.test(x) && (span || ADV_ANSWER_CUE.test(x))) return ' ';   // nothing in it is about the work
    (claimy ? ADVICE_FIG_RES : ADVICE_FIG_RES.concat(ADVICE_PLAIN_RES)).forEach(function(re){ re.lastIndex = 0; x = x.replace(re, ' '); });
    return x;
  }).join(' ');
}
/* The words a critique hands you to say: every quoted span in it, any quote style, that
   isn't already yours ("lead with 'cut stockouts 40%'"), and every unquoted line after a
   say-cue ("say ...", "tell them ...", "lead with ...", "A stronger line: ..."), each with
   its advice about the answer itself blanked. A critique's other numbers are its own
   reading of the answer, not lines to say. Mirrors of _SAY_CUE, _SAY_LEAD_RE, say_this. */
var SAY_CUE_RE = new RegExp("\\b(?:(?:just|then|now|instead|simply|next[ \\t\\n\\r\\f\\v]+time)[ \\t\\n\\r\\f\\v]+)?(?:say(?:[ \\t\\n\\r\\f\\v]+that)?|tell[ \\t\\n\\r\\f\\v]+(?:them|the[ \\t\\n\\r\\f\\v]+panel|the[ \\t\\n\\r\\f\\v]+interviewer|him|her)(?:[ \\t\\n\\r\\f\\v]+that|[ \\t\\n\\r\\f\\v]+how)?|mention(?:[ \\t\\n\\r\\f\\v]+that|[ \\t\\n\\r\\f\\v]+how)?|explain[ \\t\\n\\r\\f\\v]+(?:how|that)|show[ \\t\\n\\r\\f\\v]+(?:that|how)|add[ \\t\\n\\r\\f\\v]+that|make[ \\t\\n\\r\\f\\v]+(?:it[ \\t\\n\\r\\f\\v]+)?clear(?:[ \\t\\n\\r\\f\\v]+that)?|point[ \\t\\n\\r\\f\\v]+out[ \\t\\n\\r\\f\\v]+that|(?:lead|open|close|end|finish)[ \\t\\n\\r\\f\\v]+with(?:[ \\t\\n\\r\\f\\v]+how)?|highlight(?:[ \\t\\n\\r\\f\\v]+that)?|stress(?:[ \\t\\n\\r\\f\\v]+that)?|emphasi[sz]e(?:[ \\t\\n\\r\\f\\v]+that)?)\\b(?:[ \\t\\n\\r\\f\\v]*[:\\-\\u2013\\u2014])?[ \\t\\n\\r\\f\\v]+((?:[^.;!?\\n]|(?<=[0-9])\\.(?=[0-9])|(?<=\\b[a-z])\\.|(?<=\\bvs)\\.|(?<=\\bapprox)\\.|(?<=\\bdr)\\.|(?<=\\bmr)\\.|(?<=\\bmrs)\\.|(?<=\\bms)\\.|(?<=\\bst)\\.|(?<=\\betc)\\.|(?<=\\binc)\\.|(?<=\\bltd)\\.|(?<=\\bjr)\\.|(?<=\\bsr)\\.|(?<=\\bdept)\\.|(?<=\\best)\\.|(?<=\\bfig)\\.|(?<=\\bno)\\.|(?<=\\bco)\\.){1,160})", 'gi');
var SAY_LEAD_RE = new RegExp("(?:\\b(?:(?:a|the|your)[ \\t\\n\\r\\f\\v]+)?(?:stronger|better|tighter|cleaner|sharper|clearer|honest|good|great|best)[ \\t\\n\\r\\f\\v]+(?:line|version|answer|opener|close|sentence|phrasing)|\\btry(?:[ \\t\\n\\r\\f\\v]+saying)?|\\bsomething[ \\t\\n\\r\\f\\v]+like|\\binstead)[ \\t\\n\\r\\f\\v]*[:\\-\\u2013\\u2014][ \\t\\n\\r\\f\\v]*((?:[^.;!?\\n]|(?<=[0-9])\\.(?=[0-9])|(?<=\\b[a-z])\\.|(?<=\\bvs)\\.|(?<=\\bapprox)\\.|(?<=\\bdr)\\.|(?<=\\bmr)\\.|(?<=\\bmrs)\\.|(?<=\\bms)\\.|(?<=\\bst)\\.|(?<=\\betc)\\.|(?<=\\binc)\\.|(?<=\\bltd)\\.|(?<=\\bjr)\\.|(?<=\\bsr)\\.|(?<=\\bdept)\\.|(?<=\\best)\\.|(?<=\\bfig)\\.|(?<=\\bno)\\.|(?<=\\bco)\\.){1,160})", 'gi');
var QUOTE_CHARS_RE = new RegExp("\\\"|(?<![a-z])'|'(?![a-z])", 'gi');
function sayThis(texts, corpus){
  var out = [], budget = [SEARCH_BUDGET];   // one search budget for every span (built-to-be-slow input fails closed: flagged)
  arr(texts).forEach(function(text){
    var t = normMarks(text).replace(/''/g, '"'), spans = t.split('"').filter(function(p, k){ return k % 2 === 1; });
    var re = new RegExp(SINGLE_SPAN_RE.source, 'gi'), m;
    while((m = re.exec(t))){ if(m[0] === ''){ re.lastIndex++; continue; } spans.push(m[1]); }
    spans.slice(0, 20).forEach(function(sp){ if(sp.replace(WS_RE, '') !== '' && !verifyQuote(sp, corpus, budget)) out.push(adviceText(sp, true)); });
    [SAY_CUE_RE, SAY_LEAD_RE].forEach(function(src){
      var sc = new RegExp(src.source, 'gi'), k = 0;
      while(k < 20 && (m = sc.exec(t))){ if(m[0] === ''){ sc.lastIndex++; continue; } k++; out.push(adviceText(m[1].replace(new RegExp(QUOTE_CHARS_RE.source, 'gi'), ' '))); }
    });
  });
  return out.join(' ' + SEP + ' ');
}
/* An attribution without quote marks still puts words in their mouth: "You said
   you cut stockouts by 40%", "you mention a 40% drop", "your resume lists 12 reports",
   "your 40% churn reduction", "the 25% cut you delivered", "...fell 40%, per your
   story" - every figure pinned on them must be theirs (advice about the answer itself,
   "your 90-second pitch", aside). Mirror of _attributions_ok. */
/* "You cited three examples", "you gave 2 stories": a count of what the answer itself held,
   right after the verb - not a figure about their work (mirror of _COUNTED). */
var COUNTED_RE = new RegExp("^[ \\t\\n\\r\\f\\v]*(?:(?:only|just|about|around|roughly|exactly|at[ \\t\\n\\r\\f\\v]+least|over|nearly|almost)[ \\t\\n\\r\\f\\v]+)?(?:[0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a[ \\t\\n\\r\\f\\v]+couple[ \\t\\n\\r\\f\\v]+of|a[ \\t\\n\\r\\f\\v]+few|several)[ \\t\\n\\r\\f\\v]+(?:[a-z]+(?:-[a-z]+)?[ \\t\\n\\r\\f\\v]+){0,2}?(?:examples?|stories|story|points?|reasons?|things|details|specifics|metrics?|numbers|figures|data[ \\t\\n\\r\\f\\v]+points?|sentences?|takeaways?|beats|parts|steps|questions|answers|skills|tools|strengths|weaknesses|lessons|ideas|options|words|filler[ \\t\\n\\r\\f\\v]+words|hedges|bullets?|anecdotes?|highlights?|achievements|accomplishments|wins|results|outcomes|keywords|buzzwords|cliches)\\b", 'i');
function attributionsOk(text, corpus){
  var m, re = new RegExp(ATTR_CLAUSE_RE.source, 'gi');
  while((m = re.exec(text))){ if(m[0] === ''){ re.lastIndex++; continue; } if(unsupportedNumbers(corpus, m[1].replace(COUNTED_RE, ' ')).length) return false; }
  var nps = [ATTR_POSS_RE, ATTR_POSTNP_RE];
  for(var k = 0; k < nps.length; k++){
    var r = new RegExp(nps[k].source, 'gi');
    while((m = r.exec(text))){ if(m[0] === ''){ r.lastIndex++; continue; } if(unsupportedNumbers(corpus, adviceText(m[1])).length) return false; }
  }
  var rp = new RegExp(ATTR_PER_RE.source, 'gi');
  while((m = rp.exec(text))){ if(m[0] === ''){ rp.lastIndex++; continue; } if(unsupportedNumbers(corpus, m[1]).length) return false; }
  return true;
}
/* The text (single-spaced, trimmed to n) if every quote in it is real and every
   figure it attributes to them is theirs (in `figs` if given: their words plus what
   was measured on them); null if not, so the caller drops the item. Checked BEFORE
   trimming. */
function scrubText(text, corpus, n, broad, figs){
  var full = squash(text, 6000); if(!full) return '';
  if(!quotesOk(full, corpus, broad) || !attributionsOk(full, figs == null ? corpus : figs)) return null;
  n = n || 400;
  // Trimmed by characters (code points), like the server.
  var cps = Array.from(full), keep = cps.slice(0, n);
  if(cps.length > n){
    var marks = keep.map(function(c){ return c.replace(DQ_RE, '"').replace(DQ_ASTRAL_RE, '"'); }), cnt = marks.filter(function(c){ return c === '"'; }).length;
    if(cnt % 2) keep = keep.slice(0, marks.lastIndexOf('"')).join('').replace(/[ ,;:\-]+$/, '').split('');
  }
  return keep.join('');
}
var VERBATIM_KEYS = mkSet(['quote', 'jd_quote', 'trigger', 'source_quote', 'your_evidence', 'grounded_in', 'unsupported_numbers', 'evidence_quote', 'contradiction']);
function scrubValue(v, corpus, cnt, dropDicts, broad){
  if(typeof v === 'string'){ var o = scrubText(v, corpus, 6000, broad); if(o == null) cnt[0]++; return o; }
  if(Array.isArray(v)){ var kept = []; v.forEach(function(x){ var y = scrubValue(x, corpus, cnt, true, broad); if(y != null) kept.push(y); }); return kept; }
  if(v && typeof v === 'object'){
    var out = {}, keys = Object.keys(v);
    for(var i = 0; i < keys.length; i++){
      var k = keys[i], x = v[k];
      if(k in VERBATIM_KEYS){ out[k] = x; continue; }
      var y = scrubValue(x, corpus, cnt, true, broad);
      if(y == null && x != null){ if(dropDicts !== false) return null; out[k] = typeof x === 'string' ? '' : Array.isArray(x) ? [] : null; }
      else out[k] = y;
    }
    return out;
  }
  return v;
}
/* The quote rule over a whole AI tool result: a list item that misquotes is
   dropped whole, a plain field is blanked, every drop counted for disclosure.
   `broads` gives a field wider material for quotes not presented as the
   candidate's (the recruiter quoting the offer, a probe quoting the question). */
function scrubResult(result, corpus, broads){
  if(!result || typeof result !== 'object' || Array.isArray(result)) return result;
  var cnt = [0], out = {};
  Object.keys(result).forEach(function(k){
    var v = result[k];
    if((k in VERBATIM_KEYS) || !(typeof v === 'string' || (v && typeof v === 'object'))){ out[k] = v; return; }
    var has = function(key){ return broads && Object.prototype.hasOwnProperty.call(broads, key); };
    var b = has(k) ? broads[k] : has('*') ? broads['*'] : null;   // "*": wider material for every field
    var y = scrubValue(v, corpus, cnt, Array.isArray(v), b);
    out[k] = y != null ? y : (typeof v === 'string' ? '' : Array.isArray(v) ? [] : null);
  });
  out.unverified_quotes = (Number(result.unverified_quotes) || 0) + cnt[0];
  return out;
}
/* All the material a tool was given, as one text to check quotes against - each
   piece kept apart, so a quote can't run from one into the next. */
function corpusOf(){
  var parts = [];
  function walk(v, d){ if(d > 6) return; if(typeof v === 'string') parts.push(v); else if(typeof v === 'number' && isFinite(v)) parts.push(numFmt(v)); else if(Array.isArray(v)) v.slice(0, 200).forEach(function(x){ walk(x, d + 1); }); else if(v && typeof v === 'object') Object.keys(v).slice(0, 60).forEach(function(k){ walk(v[k], d + 1); }); }
  for(var i = 0; i < arguments.length; i++) walk(arguments[i], 0);
  return parts.join(' ' + SEP + ' ').slice(0, 80000);
}
/* "Your story changed" is only shown when it quotes two different real phrases,
   one from the latest answer and one from an earlier answer. */
function contradictionOk(text, latest, earlier){
  var spans = quotedSpans(text).filter(function(sp){ return qtoks(sp).length; }), both = String(latest || '') + ' ' + SEP + ' ' + String(earlier || '');
  if(spans.length < 2 || !quotesOk(text, both) || !attributionsOk(text, both)) return false;
  var inL = [], inE = [];
  spans.forEach(function(sp, k){ if(verifyQuote(sp, latest)) inL.push(k); if(verifyQuote(sp, earlier)) inE.push(k); });
  return inL.some(function(x){ return inE.some(function(y){ return x !== y && qtoks(spans[x]).join(' ') !== qtoks(spans[y]).join(' '); }); });
}
/* A question you'll ask can name a time window about the role ("the first 90
   days", "a 30-60-90 day plan") - not a claim about the company. Durations that
   state a company fact ("18 months of runway", "a 6-month delay") are checked. */
function claimText(q){ return String(q == null ? '' : q).replace(new RegExp(WINDOW_RE.source, 'gi'), ' '); }
/* A turn with no real answer: skipped, blank, or only fillers or a pass ("um",
   "next question", "I don't know"). An answer in any script is an answer. */
function unanswered(t){
  if(!t) return false;
  if(t.skipped === true) return true;
  var a = pyLower(clipPy(t.a, 2500)).replace(/['’]/g, '');
  var w = (a.match(WORD_RE) || []).filter(function(x){ return !(x in NON_ANSWER_FILLERS); });
  if(!w.length || (w.join(' ') in NON_ANSWERS)) return true;
  // Politeness around a non-answer ("Skip this one, please.", "I really don't know, sorry.").
  var core = w.filter(function(x){ return !(x in NON_ANSWER_SOFT); });
  return w.length <= 12 && (!core.length || (core.join(' ') in NON_ANSWER_CORES));
}

/* -------------------------------------------------------------- lexicons */
/* Typographic apostrophes (iPhone Smart Punctuation, Google Docs, Word) read as the plain one
   everywhere the built-in rules look - one character for one, so every index still matches. */
function apos(t){ return String(t == null ? '' : t).replace(/[\u2018\u2019\u02BC\u2032\uFF07]/g, "'"); }
var FILLER_RE = /\b(?:u+m+|u+h+|uhm+|erm+|err+|ah+|hmm+|mm+)\b|(?<!\b(?:as|if|do|did|don't|dont|would|will|what|let|you)\s)\byou know\b(?=\s*(?:[,.?!]|$|\s(?:like|um|uh|so|and|i|we|it|the)\b))|\bi mean\b(?=\s*[,]|\s(?:like|um|uh|i|we)\b)|\b(?:basically|literally|honestly|to be honest)\b|\b(?:so yeah|and yeah|yeah so|or something|or whatever|and stuff|stuff like that|things like that|et cetera)\b|(?:^|[,]\s*|\b(?:and|so|but|was|were|is|its|it's|just|um|uh|i'm|im|they're|we're)\s)like\b(?!\s+(?:i said|i mentioned|a|an|the|this|that|these|those|to|me|him|her|them|us|my|our|your|their|his|\d))/gi;
// "kind of"/"sort of" after a determiner is a noun phrase ("a different kind of report"),
// and "tried to" / "could have" are honest effort and reflection - none of them hedge.
/* General statements that stand in for what happened: "a lot of things", "some tensions", "it worked out". */
var VAGUE_RE = /\b(?:a lot of (?:things|stuff|projects|work|issues|problems|meetings|different)|lots of things|many (?:different )?things|various things|(?:some|certain) (?:issues|conflicts|tensions|problems|things|challenges|concerns|stuff)|something (?:with|about)|things (?:got|went|were) (?:much |a lot |way |so much )?(?:better|smoother|easier)|it (?:all )?worked out|worked out (?:well|fine|great|for everyone)|a big (?:transition|change|project|challenge)|there was (?:a lot|so much|lots) going on|and stuff|and so on|and things like that|stuff like that|the right people|made sure everyone (?:was|felt|got|knew)|everyone (?:was|felt) (?:happy|aligned|heard|on board)|(?:my manager|the client|the customer|everyone|the team) was (?:really |very |so )?(?:happy|pleased|satisfied)|in many ways|a bunch of|kind of a|sort of a|all sorts of|different personalities|(?:a|the) leader in (?:the|its|your) (?:industry|field|space|market)|(?:culture|values) (?:and (?:values|culture) )?align|align with (?:my|mine)|opportunity to (?:grow|learn|make an impact)|make an impact|grow and (?:contribute|learn|develop)|(?:a )?new challenge|experience in many areas|grown a lot|wear many hats|bring value|add value|take (?:it|things) to the next level)\b/gi;
var HEDGE_RE = /\b(?:i think|i guess|i suppose|i feel like|i'm not sure|im not sure|not sure|maybe|probably|perhaps|(?<!\b(?:a|an|the|this|that|what|which|any|some|every|each|one|same|different|new|other|another|right|wrong|first|best|similar|certain|specific|particular|whole|weird|odd|strange|special|unique|that)\s)(?:sort of|kind of)|kinda|sorta|hopefully|might have|may have|somewhat|a little bit|pretty much|more or less|i hope|possibly)\b/gi;
var MINIMIZER_RE = /\b(?:i just|just helped|only helped|helped with|assisted with|was involved in|was part of|participated in|a little)\b/gi;
var CLICHE_RE = /\b(?:team player|hard[- ]?worker|hard[- ]?working|passionate about|i'm passionate|im passionate|detail[- ]oriented|go above and beyond|went above and beyond|think outside the box|out of the box|synergy|fast[- ]paced environment|results[- ]driven|self[- ]starter|people person|perfectionist|wear many hats|go[- ]getter|move the needle|at the end of the day|give 110|team-oriented|strong work ethic|implemented (?:a|an|the) (?:\w+ )?solution|(?:optimi[sz]ed|improved) (?:the )?performance|took ownership|(?:drove|delivered|drive|deliver) results|added value|made an impact|make an impact|exceeded expectations|best practices|key stakeholders|cross-functionally|win-win|hit the ground running|track record)\b/gi;
// Blame is pointing at someone else. Owning it ("it was my fault", "I felt
// incompetent", "I hated letting them down") is the opposite and never matches.
var PEOPLE = '(?:boss|manager|team|coworkers?|co-workers?|colleagues?|teammates?|lead|supervisor|client|vendor|director|professor|teacher|engineers?|developers?|designers?|analysts?|staff|people|guys)';
var BLAME_RE = new RegExp('\\b(?:(?:my|our|the|his|her|their) (?:old |former |previous |last )?(?:[a-z]+ )?' + PEOPLE + 's? (?:was|were|is|are) (?:so |really |just |totally |completely |honestly )?(?:lazy|useless|incompetent|terrible|awful|clueless|toxic|stupid|annoying|the problem|horrible|hopeless|idiots?|(?:a nightmare|impossible)(?! to \\w))' +
  '|(?:it|that|this) (?:wasn\'t|wasnt|was not|isn\'t|isnt|is not) (?:really |even )?my fault|(?:not|never) my fault' +
  '|i hated? (?:my (?:boss|manager|team|coworkers?|colleagues?)|working (?:with|for) (?:him|her|them|my ' + PEOPLE + '|that (?:guy|person|team|manager|boss)|those people|(?:a|my|the) (?:toxic|terrible|awful|useless) ' + PEOPLE + '))' +
  '|(?:he|she|they|my ' + PEOPLE + ') (?:never|didn\'t|didnt|wouldn\'t|wouldnt) (?:listen(?:ed)? to (?:me|us|anyone|anybody)|help(?:ed)? (?:me|us)|do anything|do (?:their|his|her) (?:job|part))' +
  '|(?:he|she|they|those people|everyone else) (?:was|were|are|is) (?:so |just |totally )?(?:incompetent|idiots?|useless|lazy|clueless|stupid))\\b', 'gi');
/* "Even if it is not my fault, I would own the recovery" is ownership, not blame;
   "she didn't help me, which was expected - she was on leave" is a fact; and when the
   question asks about a difficult person, describing them is the answer - only an
   attack on their character or competence is blame. */
var BLAME_STRONG_RE = /\b(?:lazy|useless|incompetent|stupid|idiots?|clueless|toxic|hopeless|horrible|awful|terrible|annoying|the problem)\b/i;
var BLAME_SOFTENER_RE = /\b(?:which was (?:expected|fine|understandable|fair)|as expected|understandabl\w*|fair enough|to be fair|that was fine|which made sense|on (?:parental|maternity|paternity|sick|medical|annual) leave|(?:because|since|as|while) (?:she|he|they|everyone|everybody|the team|my \w+) (?:was|were|had been|'d been) (?:\w+ )?(?:busy|out|away|on leave|managing|swamped|stretched|new|off sick|out sick|sick|ill|in hospital|in the hospital|on holiday|on vacation|at a conference|travelling|traveling|rushing|moved (?:to|onto) another|on another|injured|tied up|focused on|working on|covering)|(?:was|were) (?:off|out) sick|(?:was|were) (?:ill|injured|in hospital|on (?:a |an |her |his |their )?(?:[\w-]+ )?(?:holiday|vacation|leave|break|sabbatical|course|trip)|at a conference|new too|new as well|moved (?:to|onto) (?:another|the) \w+)|left for (?:a |an )?(?:conference|trip|holiday|vacation|leave)|because i was (?:the )?(?:new|junior|most junior|youngest|newest)|the most junior)\b/i;
/* The sentence around a position - for a spoken run-on, the clause sentences() reads it as. */
function sentenceSpanAt(t, idx){
  // In a run-on the clause that gives the reason ("...because | he was off sick | so I took it over") follows the
  // blame clause: when a clause ends on "because", "so", "and"..., the span runs on into the next (two at most).
  var segs = sentences(t), cur = 0, runOn = !/[.!?;](?=\s+\S)/.test(t), pos = [];
  for(var j = 0; j < segs.length; j++){ var kk = t.indexOf(segs[j], cur); if(kk < 0) break; pos.push([kk, kk + segs[j].length]); cur = kk + segs[j].length; }
  for(var i = 0; i < pos.length; i++){
    if(!(idx >= pos[i][0] && idx < pos[i][1])) continue;
    var e = i, b = i, CONN = /\b(?:because|since|as|so|and|but|when|while|until|after|before|which|that|or|if|though|although|cause|cuz)\s*$/i;
    while(runOn && e < i + 2 && e + 1 < pos.length && CONN.test(t.slice(pos[e][0], pos[e][1]))) e++;
    // ...and "my lead was on holiday so | they never helped me": a reason that leads into it is part of it too.
    while(runOn && b > i - 2 && b > 0 && CONN.test(t.slice(pos[b - 1][0], pos[b - 1][1]))) b--;
    return [pos[b][0], pos[e][1]];
  }
  var a = Math.max(t.lastIndexOf('.', idx), t.lastIndexOf('!', idx), t.lastIndexOf('?', idx)) + 1, z = t.slice(idx).search(/[.!?]/);
  return [a, z < 0 ? t.length : idx + z];
}
function realBlame(t, m, question){
  var before = t.slice(Math.max(0, m.index - 40), m.index).toLowerCase(), sp = sentenceSpanAt(t, m.index);
  // "...didn't help me, so I built the checklist myself": an attack is blame; a plain fact followed by what you did is initiative.
  if(!BLAME_STRONG_RE.test(m.text) && !/fault/i.test(m.text)){
    if(/,?\s*(?:so|and so|which meant|that meant)\s+i\b/i.test(t.slice(m.index, Math.max(sp[1], m.index + m.text.length)))) return false;   // the same sentence goes on to what YOU did
  }
  if(/fault/i.test(m.text) && (/\b(?:even if|even though|whether or not|regardless of whether|if)\b[^.!?]*$/.test(before) || /not your fault/i.test(question || ''))) return false;
  if(BLAME_SOFTENER_RE.test(t.slice(sp[0], Math.max(sp[1], m.index + m.text.length)))) return false;
  if(/\b(?:difficult|conflict|disagree|tough|challenging|hard to work|didn't get along|did not get along|frustrat)/i.test(question || '') && !BLAME_STRONG_RE.test(m.text)) return false;
  return true;
}
var I_RE = /\b(?:i|i'm|im|i've|ive|i'd|i'll|me|my|mine|myself)\b/gi;
var WE_RE = /\b(?:we|we're|we've|we'd|we'll|our|ours|us|ourselves)\b/gi;
var ACTION_VERBS = 'built|created|designed|led|organi[sz]ed|wrote|set up|started|reached out|called|met|analy[sz]ed|proposed|decided|changed|fixed|launched|trained|asked|negotiated|prioriti[sz]ed|scheduled|automated|researched|presented|convinced|delegated|coordinated|implemented|developed|planned|rebuilt|ran|tested|cut|reduced|added|introduced|mapped|interviewed|drafted|pitched|took|made|focused|broke|owned|drove|managed|mentored|coached|hired|identified|spotted|noticed|found|figured|solved|resolved|redesigned|restructured|streamlined|persuaded|pushed|escalated|volunteered|stepped|learned|taught|shipped|delivered|recruited|raised|grew|saved|sold|closed|won|debugged|refactored|migrated|deployed|documented|surveyed|measured|tracked|compared|cleaned|merged|sent|emailed|followed up|booked|hosted|ran|split|assigned|reviewed|rewrote|simplified|trained|calculated|modeled|modelled|forecast|prototyped|sketched|interviewed|pulled|stayed|committed|chose|switched|checked|confirmed|talked|explained|showed|told|agreed|flagged|replaced|removed|paused|stopped|admitted|offered|suggested|recommended|sat down|walked|listened|apologi[sz]ed|insisted|pushed back|rolled out|turned down';
var I_ACTION_RE = new RegExp('\\b(?:i|i\'ve|ive)\\s+(?:\\w+ly\\s+|then\\s+|also\\s+|first\\s+|personally\\s+|quickly\\s+)?(?:' + ACTION_VERBS + ')\\b', 'gi');
var NUMBER_RE = /(?:[$£€]\s?)?\b\d[\d,]*(?:\.\d+)?\s*(?:%|percent|k\b|m\b|x\b|times\b)?|\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred|thousand|million|dozen|half|double|doubled|triple|tripled|halved)\b/gi;
var RESULT_RE = /\b(?:as a result|result(?:ed|s)? (?:in|was)|which (?:led|meant|resulted|helped|cut|saved|increased|reduced|got|let|made|brought)|that (?:led|meant|resulted|helped|cut|saved)|in the end|by the end|ultimately|end(?:ed)? up|outcome|so that|(?:we|i|it|they) (?:shipped|launched|won|hit|saved|cut|grew|increased|reduced|delivered|finished|exceeded|beat|got|kept)|increased|reduced|improved|saved|grew|boosted|doubled|tripled|halved|lowered|dropped|went (?:up|down|from)|fell|rose|on time|ahead of schedule|under budget|promoted|got the (?:offer|deal|contract|job)|feedback was|(?:they|she|he|the client|my manager) (?:said|told me|thanked)|now (?:it |they |we |the \w+ )?(?:takes?|saves?|runs?|costs?|gets?|has|uses?|handles?|serves?|ships?|happens?|lands?|reaches?|averages?|hits?|stays?)|(?:it|this|that|which|the (?:team|report|process|store|tool|sheet|dashboard|form|system)) now|(?:is|are|was|were|went|came) (?:now )?down to|saves? (?:the|us|our|me|them|him|her|about|around|roughly|nearly|over|\d)|rolled (?:it |them )?out|renewed|(?:stockouts?|complaints?|errors?|incidents?|churn|the (?:backlog|delays?|errors?|complaints?)) (?:stopped|disappeared|went away)|went live|(?:got|was|were) (?:adopted|approved|funded|promoted)|zero (?:complaints|errors|stockouts|incidents|defects)|never (?:ran out|missed a|happened) again|(?:it|that|this) (?:worked out|paid off)|worked out well|matched (?:finance|the books|the ledger|to the cent|exactly)|to the cent|reconciled|error[- ]free|zero (?:mistakes|discrepancies)|(?:no|zero) more (?:errors|complaints|stockouts|misses)|(?:they|she|he|the team|everyone) (?:now )?use[sd]? it|passed (?:it |the \w+ )?(?:the )?(?:second|third|next) time|passed (?:the|my|it) (?:\w+ )?(?:exam|test|audit|review|certification)|(?:still )?(?:hit|met|beat|made) (?:its|the|our|my|their) (?:\w+ )?(?:goal|target|number|quota|deadline)|(?:updated|changed|raised|bumped) (?:her|his|their|the) (?:review|rating|score)|(?:got|earned|received|won) (?:a|an|the|my) (?:offer|promotion|raise|award|bonus|five-star|5-star|contract)|(?:she|he|they) (?:agreed|signed|renewed|came back|stayed on)|(?:was|got) settled|closed (?:\w+ )?(?:the next|that|this) (?:quarter|month|week))\b/i;
// "How do you...?" answered with what you actually do every time is a method too.
var HABIT_RE = /\b(?:i|we) (?:always |usually |also |then |first |never |still |now )?(?:check|compare|write|keep|ask|sort|tell|repeat|sleep on|review|test|run|build|use|set|start|break|list|track|send|schedule|block|read|talk|meet|call|document|flag|hold|share|reconcile|walk|pull|split|plan|prioriti[sz]e|map|rank|note|confirm|double-check|verify|time|rehearse|draft|book|batch|label|log|measure|limit|cap|escalate|loop in|pair)\b|\bevery (?:number|report|change|release|deploy|project|week|morning|time) (?:i|we)\b/i;
var METHOD_RE = /\b(?:i (?:joined|enrolled|signed up)|so far|first(?:ly)?|then|next|after that|finally|i would|i'd|i will|i'll|start by|begin by|my first step|step one|the first thing|i(?:'ve| have) been \w+ing|i(?:'ve| have) (?:started|signed up|begun|learned to|joined|enrolled|taken|booked|asked for|set up)|i (?:now )?(?:volunteer|use|keep|prepare|make myself|practi[cs]e|rehearse|block|schedule|ask for)|i now \w+|i(?:'m| am) (?:now )?(?:working on|practi[cs]ing|learning|taking|doing)|these days i|what i do (?:now|instead) is|my fix (?:is|was))\b/i;
var FAILQ_RE = /\b(?:fail(?:ed|ure|ures)?|mistakes?|went wrong|regret|regrets|messed up|screwed up|setback|didn't go (?:well|to plan)|did not go (?:well|to plan))\b/i;
// A failure story can be told without the stock words: money ran out, a pilot was cancelled,
// you came last, got zero offers, were put on a performance plan.
var ADMIT_RE = /\b(?:suffered|had to (?:step in|roll (?:it |them )?back|redo|start over|apologi[sz]e|pull (?:it|the plug)|cancel|delay|scrap|rebuild|explain|cover)|roll(?:ed)? (?:it |them )?back|took (?:\w+ )?(?:longer|twice as long|instead of)|instead of (?:the )?(?:\w+ )?(?:weeks?|days?|months?)|humiliat|ran over|overran|missed (?:the|our|my) (?:deadline|date|target)|ran out|cancel+ed|rejected|turned (?:me|us|it) down|zero (?:offers|sales|users|sign-?ups|customers|interest|replies|responses)|flopped|flop|came (?:last|fourth|third|second|bottom)|out of (?:\w+ )?(?:candidates|applicants|teams)|performance (?:improvement )?plan|\bpip\b|shut (?:it |us )?down|laid off|let go|fired|went under|folded|bankrupt|(?:nobody|no one) (?:signed up|came|bought|showed up|opened|replied|read)|never (?:launched|took off|caught on|shipped)|scrapped|abandoned|pulled the plug|fell short|below (?:target|goal|plan|quota)|against a (?:target|goal|quota)|under-?delivered|struggled|over budget|behind schedule|embarrass|didn'?t (?:work|land|stick|sell|convert|pan out|get (?:the|any|a))|did not (?:work|land|stick|sell|get)|only (?:\d+|a few|two|three|four|five|six|seven|eight|nine|ten) (?:people|customers|users|of them) (?:were |was )?(?:opening|opened|used|signed|bought|came|read|replied)|wasted|bad (?:readings|reviews|data|feedback)|negative feedback|gave me feedback|lost (?:the|a|my|our) (?:deal|client|customer|account|job|race|election|vote|pitch|bid)|fail|mistake|wrong|should(?:n't| not)? have|could have|wish i had|missed|lost|my fault|my own fault|underestimat|overestimat|overpromis|overcommit|overlook|forgot|misjudg|assum|rushed|didn'?t|did not|hadn'?t|had not|wasn'?t|was not|couldn'?t|could not|weren'?t|backfired|regret|i was wrong|blew it|messed up|dropped the ball|let (?:the team|them|everyone|my \w+) down|slipped|late|delay|behind|error|bug|broke|crash|complain|cost (?:me|us)|nobody (?:used|opened)|no one (?:used|opened)|without (?:\w+ing))\w*/i;
// A "failure" told as a pure success: the classic dodge ("my weakness is I work too hard").
var SUCCESS_FRAME_RE = /\b(?:succeeded|it worked(?: out)?|went (?:really |very )?well|turned out (?:great|well|fine|to be a success)|was a (?:big |huge |great |massive )?success|proud(?:est)?|exceeded|praised|promoted|turned it (?:all )?around|everyone loved|in the end (?:it|we|everything) (?:was|went|worked) (?:well|great|fine|out)|best (?:result|outcome|quarter|year|release|launch)|(?:the client|the customer|they|she|he|my (?:boss|manager|director|lead)) (?:was|were) (?:thrilled|delighted|impressed)|on time and under budget|ahead of schedule|(?:delivered|shipped|finished|launched) (?:it |\w+ )?(?:early|on time)|top of (?:my|the) class|(?:hit|met|beat|exceeded|smashed) (?:every|all|100% of) (?:\w+ )?(?:targets?|deadlines?|goals?|quotas?))\b/i;
/* The spin that marks a humblebrag: praise, a perfect record, the hours put in ("never missed a deadline",
   "my manager praised me", "first in, last out"). */
var BRAG_RE = /\b(?:praised|promoted|thanked|appreciat\w+|loved (?:it|me|my|the)|reli(?:ed|es) on me|rely on me|count on me|(?:most|very|so|super) reliable|never (?:miss(?:ed)?|let|drop(?:ped)?) (?:a|one|a single|any)|(?:didn'?t|did not) (?:let|miss|drop) (?:a|one|a single|any)|(?:still )?(?:hit|met|beat|exceeded|smashed) (?:every|all|100% of|my|our|its|the) (?:\w+ )?(?:targets?|deadlines?|goals?|numbers?|quotas?)|on time and under budget|ahead of schedule|(?:huge|big|great|massive) success|top of (?:my|the) class|best (?:release|quarter|year|result|results|work|it can be|in the)|extra mile|give (?:it )?(?:everything|110|my all|100%)|(?:put|puts) (?:them|my team|others|customers|clients|the team|people|everyone) first|can'?t keep up|first (?:one )?in|last (?:one )?out|(?:didn'?t|did not|never) (?:go home|leave|take (?:a|any|one|a single) (?:day|days|break|holiday|vacation))|(?:step(?:ped)?|stepping) (?:in|up)(?: for)?|cover(?:ed|ing)? for|satisfaction|thrilled|delighted|flawless|zero (?:errors|mistakes|complaints|defects|typos)|best (?:[a-z]+ ){0,2}(?:they|she|he|we|anyone|the board|the client)(?:'d|'ve| had| have)? (?:ever )?(?:seen|had|read|received|heard)|(?:said|told me|told us) (?:it|this|that|my \w+) (?:was|is) (?:the best|great|excellent|amazing|outstanding|perfect)|broke (?:every|all|the|our) (?:\w+ )?records?|record[- ](?:breaking|sales|quarter|year|launch|numbers)|everyone loved|all of them renewed|(?:error|mistake|bug|typo)-free|nothing (?:leaves|left|goes|went) (?:my desk |out )?unchecked|always (?:deliver|on time|reliable|there))\b/i;
/* Dedication told as a cost isn't one: "I didn't let a single typo through", "I stayed late", "I had to
   step in for my manager", "I'm learning to slow down". These go before a cost is looked for. */
var DEDICATION_RE = /\b(?:(?:i |we )?(?:didn'?t|did not|never|wouldn'?t|would not)\s+(?:let|leave|go home|take|stop|rest|miss|switch off|log off|quit|give up|drop)\b[^.;,!?]{0,60}|stay(?:s|ed|ing)? (?:up )?late|work(?:s|ed|ing)? (?:late|weekends|every weekend|nights|overtime|long hours|through)|first (?:one )?in(?: and)? (?:the )?last (?:one )?out|(?:in the office|at (?:my|the) desk|working|worked|stayed|there) (?:until|till|past) (?:midnight|\d+\s*(?:am|pm)|late|the early hours)|had to (?:step in|cover)(?: for)?[^.;,!?]{0,40}|(?:error|mistake|bug|typo)-free|(?:learn|learning|learned|learnt|need|needed|have|try|trying|working on|started)\s+to\s+(?:slow down|relax|take (?:more )?breaks?|switch off|delegate|say no|balance|rest|let go|step back)[^.;,!?]{0,40})/gi;
/* Concrete costs, beyond the stock ones: work sent back, people who quit or churned, a customer
   overcharged, evenings lost, a deal lost to a competitor. "No errors" and "never late" are no cost. */
var NEG_OUTCOME_RE = /(?<!\bnever )(?<!\bnot )(?<!n't )(?<!\bno )(?<!\bzero )(?<!\bwithout )\b(?:sent (?:it |them |\w+ )?back|rework|redo|overcharg\w*|undercharg\w*|refund\w*|churn(?:ed|s)?|quit|resigned|(?:she|he|they|two|three|people|\w+ of them) (?:left|quit|resigned)|left (?:the company|the team|us|because)|cancel+ed|(?:not|wasn'?t|weren'?t) (?:happy|pleased|satisfied)|unhappy|upset|angry|furious|frustrat\w+|disappoint\w+|complain\w*|escalat\w+|lost (?:the|a|an|my|our|two|three|\w+)|careless|sloppy|errors?|mistakes?|bugs?|typos?|incidents?|outages?|crash\w*|rejected|turned (?:me |us |it )?down|exhaust\w*|stressed|nervous|anxious|overwhelm\w*|struggl\w+|(?:find it|found it|it'?s|it is|it was|have a|had a) hard (?:to|time)|hard time|\bi (?:\w+ )?(?:couldn'?t|could not|can'?t|cannot) (?:\w+ )?(?:keep up|finish|say no|delegate|focus|switch off|sleep)|(?:sales|revenue|traffic|sign-?ups|conversions?|bookings|profits?|margins?|retention|engagement|ratings?|scores?|morale|quality|attendance|numbers|nps|csat) (?:fell|dropped|declined|went down|decreased|shrank|collapsed|tanked|plunged)|(?:costs?|churn|complaints?|errors?|returns|tickets|turnover|wait times?|backlog) (?:rose|went up|increased|grew|doubled|tripled|spiked|jumped)|didn'?t get|never got|never had time|no time (?:for|to)|neglect\w*|ignor\w+|forgot|confus\w+|(?:a |the )?mess|chaos|conflict|argument|tension|embarrass\w*|went with (?:a|another|the other|someone|a competitor|a cheaper|their)|chose (?:another|someone else|a competitor)|pushed (?:to|into) (?:the )?(?:evenings?|weekends?|nights?)|evenings and weekends|at midnight|(?:waited|wait|waiting) (?:on me|for me|a week|weeks|days|\w+ (?:days|weeks))|lose track|lost track|get lost|got lost|wast\w+|cost (?:me|us|the team|my team|them|a|the)|at the expense of|the opposite|cop-?out|slow(?:s|ed)? (?:\w+ )?down|the winner|(?:someone else|another candidate|the other (?:team|candidate|side)|(?:she|he|they) (?:all )?) won|(?:they|competitors?|a competitor|our competitor|the competition|a rival) (?:took|won|got|stole|grabbed|beat us)|only (?:got|managed|won|reached|received|raised|sold)|got (?:only|just) |(?:didn'?t|did not) (?:win|make (?:it|the cut|the team)|get (?:in|the job|the role|the offer)))\b/i;
/* Questions about someone else's mistake, or how you'd handle one, aren't asking for your failure. */
var OTHERS_FAIL_Q_RE = /\b(?:teammate|colleague|co-?worker|someone|somebody|another person|other person|team member|direct report|peer|new (?:hire|analyst|starter)|your (?:manager|boss|team|report|colleague)|a (?:manager|client|customer))\b[^?]{0,60}\b(?:fail|mistake|wrong|messed|error)|\bhow (?:do|would|should|will|did) you (?:handle|deal|respond|react|approach|prevent|avoid)\b|\bwhat (?:do|would) you do (?:when|if)\b/i;
var FAIL_ECHO_RE = /\b(?:my|the|one) (?:biggest |greatest |main |worst |real |big )?(?:failure|mistake|weakness|regret|setback)s? (?:was|is|would be|has been|i'?ve made|i made|of mine)\b|\ba time (?:i|when i) (?:failed|made a mistake)\??|\bi'?d say\b|\bif i had to (?:pick|choose|name) (?:one|a failure|a mistake)\b/gi;
var HUMBLEBRAG_RE = /\b(?:work(?:s|ed|ing)? too (?:hard|much)|workaholic|car(?:e|es|ed|ing) too (?:much|deeply)|perfectionis\w*|too detail[- ]oriented|too (?:dedicated|committed|passionate|thorough|invested|hard-?working)|(?:say|says|said|saying) yes too (?:often|much)|(?:take|takes|took|taking|taken) on too much)\b/i;
// What turns a humblebrag into a real failure: an owned error or a cost someone paid ("so I missed the
// first deadline", "the team burned out", "two reports went out late"). Dedication ("I stayed late every
// night", "I checked every page three times") is the brag itself, and "never missed a deadline" is no cost.
var HB_SETBACK_RE = /(?<!\bnever )(?<!\bnot )(?<!n't )(?<!\bno )(?<!\bzero )(?<!\bwithout )\b(?:i\s+(?:had not|hadn'?t|did not|didn'?t|should(?:n'?t| not)? have|forgot|missed|assumed|underestimated|overestimated|overcommitted|overpromised|misjudged|rushed|ignored|skipped|was wrong|messed up|dropped the ball|failed|stayed (?:quiet|silent))|made (?:a|the) wrong (?:call|choice|decision|hire|assumption)|let (?:the team|them|everyone|my \w+|it|things) (?:down|slip)|missed (?:the|a|an|our|my|two|three|several|both|\w+) (?:\w+ )?(?:deadlines?|dates?|launch|handoff|milestones?|reviews?|targets?)|(?:ran|was|were|went out|came in|shipped|delivered|arrived|finished) (?:\w+ )?late|late by|behind schedule|over budget|fell behind|slipped|delayed|bottleneck|burn(?:ed|t) (?:out|myself out)|(?:was|were|got|felt) rushed|had to (?:apologi[sz]e|redo|cancel|delay|push (?:it )?(?:back|out)|hand (?:it|them|over))|(?:quality|my work|the work|my health|the \w+) suffered|(?:the team|everyone|others|people) (?:had to wait|waited|were blocked|was blocked)|(?:found|caught|spotted|made) (?:a|an|two|three|several|some|\d+) (?:\w+ )?(?:errors?|mistakes?|bugs?|typos?))\b/i;
// The same costs said about the present, as a weakness is: "which slows the team down", "I spend too
// long on slides", "I struggle to hand work off", "I take complaints personally".
var HB_COST_NOW_RE = /(?<!\bnever )(?<!\bnot )(?<!n't )(?<!\bno )(?<!\bzero )\b(?:(?:miss|misses|missing) (?:\w+ )?(?:\w+ )?(?:deadlines?|dates?|handoffs?|targets?)|slows? (?:\w+ )?(?:\w+ )?down|(?:delays?|delaying|holds? up|holding up) (?:the|my|our|other|everyone|people|projects?|launch|releases?|reviews?|work)|gets? stuck|(?:costs?|costing|cost) (?:me|us|the team|my team|time|hours|days|weeks)|bottleneck|burn(?:s|ing)? (?:out|myself out)|(?:i|and) (?:sometimes |often |still |tend to )?(?:over-?commit|over-?promise|struggle|procrastinate|put off|hesitate|freeze up|ramble|interrupt|avoid|micromanage|second-guess)|(?:spend|spent|spending) (?:far |way )?(?:too long|too much time|hours|days|ages) (?:on|polishing|fixing|tweaking|checking|rewriting|redoing)|(?:take|took|taking) (?:[\w']+ ){1,4}(?:too )?personally|(?:i'm|i am|i get|i got|i was|i can be) (?:too )?(?:slow|late|stuck|overwhelmed|defensive|scattered|disorganised|disorganized|impatient|blunt))\b/i;
function realCost(s){ return HB_SETBACK_RE.test(s) || HB_COST_NOW_RE.test(s); }
/* A cost anywhere once the dedication and the humblebrag words themselves are set aside. */
function hasCost(t){ var x = String(t).replace(DEDICATION_RE, ' ').replace(new RegExp(HUMBLEBRAG_RE.source, 'gi'), ' '); return realCost(x) || NEG_OUTCOME_RE.test(x); }
/* Humblebrag phrases that are really claimed: not "I'm not a perfectionist", not inside "my strength is...". */
function hbHits(t){
  var n = 0;
  sentences(t).forEach(function(sn){
    if(/\bstrength/i.test(sn)) return;
    matchesOf(new RegExp(HUMBLEBRAG_RE.source, 'gi'), sn).forEach(function(m){ if(!/(?:\b(?:not|never|hardly|no longer)\b|n't)(?:\s+[\w-]+){0,3}\s*$/i.test(sn.slice(Math.max(0, m.index - 30), m.index))) n++; });
  });
  return n;
}
// The bare words "fail", "mistake", "wrong" and a bare "didn't" admit nothing ("I didn't miss a single deadline").
// Words that end a story without saying whether it went well: "in the end they went with a competitor".
var RESULT_NEUTRAL_RE = /\b(?:in the end|by the end|ultimately|end(?:ed)? up|outcome|as a result|result(?:ed|s)? (?:in|was)|which (?:led|meant|resulted)|that (?:led|meant|resulted)|so that|feedback was|(?:they|she|he|the client|my manager) (?:said|told me))\b/gi;
var ADMIT_VAGUE_RE = /\b(?:fail\w*|mistakes?|wrong|didn'?t|did not|hadn'?t|had not|wasn'?t|was not|couldn'?t|could not|weren'?t|were not)\b/gi;
// A weakness question: the humblebrag is its classic dodge too ("my weakness is I care too much").
var WEAKQ_RE = /\bweakness(?:es)?\b|\bareas? (?:for|of) (?:improvement|development|growth)\b|\bdevelopment areas?\b|\bwhat (?:would|do|could) you (?:most )?(?:need to |like to |want to )?improve about yourself\b/i;
var LESSON_RE = /\b(?:learned|learnt|lesson|takeaway|next time|since then|ever since|since that (?:day|mistake|time|project)|from then on|from (?:that|this) (?:point|day|moment) on|after (?:this|that)(?:,)? i|afterwards(?:,)? i|these days(?:,)? i|i reali[sz]ed|i changed (?:my|how|the way)|made it a habit|my rule (?:now )?is|now i|now (?:every|each|all|my|our) \w+|today i|going forward|i now|i (?:always|never) [a-z]+(?: [a-z]+){0,6} (?:now|anymore|any more)|i [a-z]+(?: [a-z'-]+){0,8} now(?=\s*[.!]|\s*$)|what i(?:'d| would) do differently|in hindsight|looking back|taught me|which i am working on|i'm working on)\b/i;
var SITUATION_RE = /\b(?:when i was|while i was|at my (?:last|previous|current|old|first) (?:job|role|company|internship|school|team|position)|in my (?:role|job|internship|time|last|previous|first|second|final|current)\b|last (?:year|summer|semester|spring|fall|winter|quarter|month)|(?:a|one) (?:time|day|semester|summer|project|weekend)|the (?:situation|context|background|problem|issue|challenge) was|there was|we (?:had|were|faced)|our (?:team|company|store|club|class|project|group) (?:had|was|needed)|i was (?:working|leading|interning|studying|managing|running|the only))\b/i, AT_PLACE_RE = /\bat [A-Z][a-z]{2,}/;
var TASK_RE = /\b(?:my (?:job|role|task|goal|responsibility|assignment) was|i was (?:responsible|asked|tasked|in charge|assigned|supposed)|i (?:needed|had|wanted) to|the goal was|our goal was|we needed to|the task was|i had to (?:figure|find|fix|get|make|deliver))\b/i;
// What you do now: "I'm a / the ...", "I am an analyst at ...", "I'm Priya, a data analyst at ...", or a present-tense "I lead / run / own ...".
var PRESENT_RE = /\b(?:i[’']?m|i am)\s[a-z]+(?:\s[a-z]+)?,\s(?:a|an|the)\s[a-z][a-z -]{1,40}?\s(?:at|for|with)\s\b|\b(?:currently|right now|today i|nowadays|these days|at the moment|(?:i[’']?m|i am) (?:a|an|the|currently|now|working|responsible|part of|on|in|with|at|about to|finishing|studying|completing|pursuing|doing my|between roles|freelancing)|my current (?:role|job|position|title) is|i[’']?ve got (?:\w+ )?(?:years?|months?)|the (?:last|past) \w+(?: years?| months?)? as|i[’']?ve (?:worked|been working) (?:in|at|with|for) [^.]{0,60}?for (?:the )?(?:last |past )?\w+ (?:years?|months?)|(?:for the (?:last|past) \w+ (?:years?|months?),? )?i[’']?ve (?:run|led|managed|owned|been running|been leading|been managing)|i do (?:the|all|our|my)|i[’']?ve (?:spent|been)|i have (?:spent|been)|i (?:work|lead|run|manage|own|build|handle|support|teach|design|write|help|oversee|coordinate|analy[sz]e|develop|create|serve|sell|study|head|direct|operate|look after|take care of|care for|am responsible|turn|make|keep|solve|fix|ship|drive|grow|plan|deliver|test|train|coach|mentor|focus|speciali[sz]e|spend|translate|report|track|maintain|automate|research|advise|consult|organi[sz]e|negotiate|recruit))\b/i;
var PAST_RE = /\b(?:before that|previously|i started|i studied|i graduated|i spent|i used to|i began|my background|i've been|ive been|i grew up|growing up|in college|at university|before (?!(?:the|a|an|every|each|it|we|they|you|anything|any|lunch|noon|work|bed|i|my|our)\b)[a-z]+|i[’']?ve (?:worked|spent|done|had)|i have (?:worked|spent|done|had)|my career (?:started|began)|i (?:completed|finished|came to|came over|was hired|was promoted|started out)|after (?:university|uni|college|school|graduating|my (?:degree|phd|masters|studies))|i (?:joined|worked|trained|interned|came from|switched|moved (?:into|from|to|over)|got my start|got into|did my|worked my way|was (?:a|an|the|working|running|leading|managing|stacking|teaching|studying))|originally|earlier in my career|prior to|back in (?:\d{4}|the day|college|university|school)|in my (?:last|previous|first|old|early) (?:role|job|position|company|career|team)|(?:\w+|a few|a couple of) years ago|my first (?:job|role|position|career)|last (?:summer|year|spring|autumn|fall|winter) i)\b/i;
var FUTURE_RE = /\b(?:now i'm looking|now im looking|that's why|thats why|which is why|i'm excited|im excited|next step|this role|this position|this job|this one|your team|your company|here because|looking for|i want to|i'd love to|id love to|i'?d like to|i'?m (?:ready|hoping|keen|eager|looking) (?:for|to)|what draws me|what drew me|brought me (?:to you|here|to this)|brings me (?:to you|here|to this)|why i applied|why i'm applying|i'm applying|the reason i applied|this opportunity|the chance to|would (?:let|allow|give|help) me|my goal is|joining \w+|next step)\b/i;
var STOP = {};
'a an the and or but so to of in on at for with from by as is was were are be been being it its this that these those i you he she we they me my your our their his her them us do did does done have has had what which who whom when where why how can could would should will shall may might must about into over than then there here tell time describe give example walk through one some any all your yourself'.split(' ').forEach(function(w){ STOP[w] = 1; });
var PROPER_STOP = {};
'i im ive id ill so and but then the we my it that this when well yes no okay ok um uh also because after before monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december english'.split(' ').forEach(function(w){ PROPER_STOP[w] = 1; });
// Question words -> the families of words a relevant answer would use instead.
var SYN = {
  fix: 'fix|solv|repair|resolv|improv|automat|streamlin|rewr|rebuil|redesign|chang|cut|reduc',
  broken: 'broken|manual|slow|inefficien|problem|issue|bottleneck|backlog|messy|error|week-old|took',
  proces: 'process|workflow|system|procedur|step|report|pipeline|routine',
  disagre: 'disagre|conflict|pushback|pushed back|argu|differ|tension|didn',
  conflict: 'conflict|disagre|tension|argu|clash|upset',
  fail: 'fail|mistake|wrong|miss|lost|didn|should have',
  challeng: 'challeng|hard|difficult|problem|struggl|tough|issue',
  deadline: 'deadline|time|rush|crunch|due|late|days|hours|week|tight',
  goal: 'goal|target|aim|objective|plan|wanted',
  lead: 'lead|led|manag|team|guid|organi|coordinat',
  initiativ: 'initiativ|noticed|own|volunteer|without being asked|took it|on my own|proactiv|decided',
  feedback: 'feedback|critic|review|told me|said|pointed out',
  convinc: 'convinc|persuad|influenc|buy-in|agree|align|won over|changed (?:his|her|their) mind',
  customer: 'customer|client|user|guest|patient|complain|stakeholder|caller|buyer|shopper|owner|account|patron|tenant|resident|parent|member|subscriber|vendor|supplier',
  difficult: 'difficult|angry|upset|shout|yell|rude|frustrat|complain|demanding|hostile|furious|irate|unhappy|tough|hard|escalat',
  stakeholder: 'stakeholder|client|manager|team|partner|director',
  decision: 'decid|decision|chose|choice|call|went with',
  data: 'data|number|metric|analy|sql|excel|dashboard|measur|spreadsheet',
  instruction: 'instruction|unclear|ambigu|no guidance|figure out|on my own|nobody told',
  priorit: 'priorit|urgent|first|order|important|triage',
  strength: 'strength|good at|best at|strong|known for',
  weakness: 'weakness|work on|improv|struggl|not great|getting better',
  proud: 'proud|best|achiev|accomplish|favorite',
  pressur: 'pressur|stress|deadline|rush|crunch|tight',
  learn: 'learn|lesson|taught|realiz|since then',
  team: 'team|together|group|colleague|we',
  mistak: 'mistak|wrong|error|fail|missed|should have',
  colleague: 'colleague|coworker|co-worker|teammate|peer|them|they|him|her|person',
  corner: 'corner|shortcut|standard|rule|quality|sloppy|skip',
  notic: 'notic|saw|see|spot|found|realiz|if (?:it|they|i)'
};
function synFor(k){ var hit = null; Object.keys(SYN).some(function(s){ if(k.indexOf(s) === 0 || s.indexOf(k) === 0){ hit = SYN[s]; return true; } return false; }); return hit; }
function termHit(k, low, stems){
  var syn = synFor(k);
  if(syn && new RegExp('\\b(?:' + syn + ')', 'i').test(low)) return true;
  return stems.indexOf(k) >= 0 || (k.length >= 6 && low.indexOf(k.slice(0, 5)) >= 0);
}
function keyTerms(q){ return uniq((String(q || '').toLowerCase().match(/[a-z]{4,}/g) || []).filter(function(w){ return !STOP[w]; }).map(function(w){ return w.replace(/(ing|ed|es|s)$/, ''); })).slice(0, 8); }

/* Competencies: what interviewers test, and the words that signal each one. */
var COMPETENCIES = [
  { key: 'leadership', label: 'Leadership', re: /\b(?:lead(?:s|ing)? (?:a|the|teams?|projects?|initiatives?|efforts?|others|people)|led\b|mentor\w*|manag(?:e|ed|es|ing) (?:a |the )?(?:team|people|staff|others|interns)|people manag\w*|captain\w*|supervis\w*|head(?:ed)? (?:a|the) team|direct(?:ed)? (?:a|the) team|team lead\w*)/i },
  { key: 'collaboration', label: 'Collaboration', re: /\b(?:cross[- ]functional|collaborat|partner(?:ed|ing)? with|stakeholder|teamwork|team ?mates?|worked with|together)\w*/i },
  { key: 'communication', label: 'Communication', re: /\b(?:communicat\w*|present(?:s|ed|ing|ations?)?\b(?! (?:day|time|moment))|wrote|writing|written|explain\w*|storytell\w*|pitch\w*|report(?:ed|ing)? to)/i },
  { key: 'problem_solving', label: 'Problem solving', re: /\b(?:problem|solv|troubleshoot|debug|root cause|figure(?:d)? out|fix(?:ed)?|diagnos|analytical)\w*/i },
  { key: 'data', label: 'Data & analysis', re: /\b(?:data|sql|metrics?|analy[sz]|dashboard|spreadsheet|excel|a\/b|experiment|statistic|measur|kpi|forecast|tableau|python)\w*/i },
  { key: 'customer', label: 'Customer focus', re: /\b(?:customer|client|user|guest|patient|student|empathy|user research|feedback from|complain)\w*/i },
  { key: 'ownership', label: 'Ownership & initiative', re: /\b(?:initiative|ownership|proactiv|self[- ]starter|without being asked|took it on|volunteer|stepped up|on my own|autonom|own(?:ed|s)? (?:it|the|our|end))\w*/i },
  { key: 'ambiguity', label: 'Ambiguity & change', re: /\b(?:ambigu|fast[- ]paced|startup|changing priorities|uncertain|pivot|unclear|no playbook|from scratch|adapt)\w*/i },
  { key: 'execution', label: 'Execution & deadlines', re: /\b(?:deadline|deliver|ship(?:ped)?|execut|on time|prioriti|launch|multiple projects|juggl|under pressure|crunch)\w*/i },
  { key: 'influence', label: 'Influence', re: /\b(?:influenc|persuad|negotiat|without authority|align(?:ed|ment)?|buy-?in|convinc|win (?:over|support)|won (?:him|her|them|the team) over|propos(?:ed|al)|pitched|made the case|(?:he|she|they|my manager|my boss) agreed|changed (?:his|her|their) mind)\w*/i },
  { key: 'learning', label: 'Learning & growth', re: /\b(?:learn|curious|growth mindset|feedback|coachab|taught myself|upskill|new skill|course)\w*/i },
  { key: 'conflict', label: 'Conflict', re: /\b(?:conflict|disagree|pushback|pushed back|difficult (?:conversation|person|customer|coworker)|tension|argu)\w*/i },
  { key: 'resilience', label: 'Failure & resilience', re: /\b(?:fail|mistake|setback|resilien|went wrong|missed|lost|rejected|recover)\w*/i },
  { key: 'technical', label: 'Technical depth', re: /\b(?:architect|system design|code|coding|engineer|technical|algorithm|api|database|infrastructure|scal(?:e|ing|able))\w*/i },
  { key: 'motivation', label: 'Motivation & fit', re: /\b(?:why (?:this|us|here)|mission|passion|motivat|excite|values|culture|career goal)\w*/i },
  { key: 'integrity', label: 'Integrity', re: /\b(?:integrity|ethic|honest|complian|trust|confidential|right thing)\w*/i }
];
var COMP_BY_KEY = {}; COMPETENCIES.forEach(function(c){ COMP_BY_KEY[c.key] = c; });
var CORE_COMPS = ['leadership', 'collaboration', 'problem_solving', 'ownership', 'conflict', 'resilience', 'execution', 'influence'];
function compLabel(k){ return (COMP_BY_KEY[k] && COMP_BY_KEY[k].label) || cap(String(k || 'General').replace(/_/g, ' ')); }

/* ------------------------------------------------------- question bank */
var CATS = [
  { key: 'behavioral', label: 'Behavioral' }, { key: 'tell', label: 'Tell me about...' }, { key: 'motivation', label: 'Motivation' },
  { key: 'situational', label: 'Situational' }, { key: 'role', label: 'Role & strengths' }, { key: 'technical', label: 'Technical & problem-solving' }
];
// The original 25 keep their ids (saved answers stay linked); comp tags drive coverage + planning.
var BANK = [
  { id: 'b1', cat: 'behavioral', comp: ['resilience', 'problem_solving'], q: 'Tell me about a time you faced a significant challenge at work or school. How did you handle it?', tip: 'Use STAR. Make your specific actions the centre of the story.' },
  { id: 'b2', cat: 'behavioral', comp: ['conflict', 'collaboration'], q: 'Describe a time you disagreed with a teammate or manager. What happened?', tip: 'Show respect and a focus on the goal, not on winning.' },
  { id: 'b3', cat: 'behavioral', comp: ['execution', 'ownership'], q: 'Give an example of a goal you set and how you achieved it.', tip: 'Quantify the result if you can.' },
  { id: 'b4', cat: 'behavioral', comp: ['resilience', 'learning'], q: 'Tell me about a time you failed. What did you learn?', tip: 'Own it plainly, then focus on the change you made after.' },
  { id: 'b5', cat: 'behavioral', comp: ['execution'], q: 'Describe a time you had to work under a tight deadline.', tip: 'Show how you prioritised, not just that you worked hard.' },
  { id: 'b6', cat: 'behavioral', comp: ['ownership'], q: 'Tell me about a time you took initiative without being asked.', tip: 'Name the problem you noticed and the outcome you drove.' },
  { id: 'b7', cat: 'behavioral', comp: ['influence'], q: 'Tell me about a time you convinced someone to change their mind without having authority over them.', tip: 'Show how you understood their side before you made your case.' },
  { id: 'b8', cat: 'behavioral', comp: ['leadership'], q: 'Tell me about a time you led a group toward a goal.', tip: 'Leadership is what you did to move people - not your title.' },
  { id: 'b9', cat: 'behavioral', comp: ['customer'], q: 'Tell me about a time you dealt with a difficult customer or stakeholder.', tip: 'Show empathy first, then the fix, then the outcome.' },
  { id: 'b10', cat: 'behavioral', comp: ['data', 'problem_solving'], q: 'Tell me about a decision you made using data.', tip: 'What did the data say, what did you decide, and what happened?' },
  { id: 'b11', cat: 'behavioral', comp: ['ambiguity'], q: 'Tell me about a time you had to act without clear instructions.', tip: 'Show how you created clarity, not how lost you felt.' },
  { id: 'b12', cat: 'behavioral', comp: ['learning'], q: 'Tell me about a time you got critical feedback. What did you do with it?', tip: 'The change you made matters more than the feedback.' },
  { id: 't1', cat: 'tell', comp: ['motivation', 'communication'], q: 'Tell me about yourself.', tip: 'Present, then past, then why this role - about 60-90 seconds.' },
  { id: 't2', cat: 'tell', comp: ['communication'], q: 'Walk me through your resume.', tip: 'A narrative with a throughline, not a line-by-line reading.' },
  { id: 't3', cat: 'tell', comp: ['ownership'], q: 'What are you most proud of?', tip: 'Pick something that shows a strength this role needs.' },
  { id: 'm1', cat: 'motivation', comp: ['motivation'], q: 'Why do you want to work here?', tip: 'Be specific to them - reference something real about the company or role.' },
  { id: 'm2', cat: 'motivation', comp: ['motivation'], q: 'Why this role, and why now?', tip: 'Connect it to your actual direction, not just "growth".' },
  { id: 'm3', cat: 'motivation', comp: ['motivation'], q: 'Where do you see yourself in five years?', tip: 'Show ambition that this role plausibly feeds.' },
  { id: 'm4', cat: 'motivation', comp: ['motivation'], q: 'What are you looking for in your next position?', tip: 'Frame it as fit, not a wishlist.' },
  { id: 'm5', cat: 'motivation', comp: ['motivation', 'integrity'], q: 'Why are you leaving your current role?', tip: 'Forward-looking and never bitter about where you are.' },
  { id: 's1', cat: 'situational', comp: ['influence', 'execution'], q: 'How would you handle competing priorities from two stakeholders?', tip: 'Show a method: clarify, weigh impact, communicate the trade-off.' },
  { id: 's2', cat: 'situational', comp: ['execution', 'learning'], q: 'What would you do in your first 30/60/90 days?', tip: 'Learn, then contribute, then own - be concrete.' },
  { id: 's3', cat: 'situational', comp: ['ownership', 'communication'], q: 'A project is behind and it is not your fault. What do you do?', tip: 'Focus on the fix and the communication, not the blame.' },
  { id: 's4', cat: 'situational', comp: ['learning', 'conflict'], q: 'How do you handle feedback you disagree with?', tip: 'Show you can hold your view and still hear theirs.' },
  { id: 's5', cat: 'situational', comp: ['integrity'], q: 'What would you do if you noticed a colleague cutting corners?', tip: 'Direct and fair: talk to them first, escalate if it matters.' },
  { id: 'r1', cat: 'role', comp: ['ownership'], q: 'What is your greatest strength, and how would it show up here?', tip: 'Pick one relevant strength and prove it with an example.' },
  { id: 'r2', cat: 'role', comp: ['learning'], q: 'What is a weakness you are actively working on?', tip: 'A real one, plus the concrete steps you are taking.' },
  { id: 'r3', cat: 'role', comp: ['motivation'], q: 'Why should we hire you over other candidates?', tip: 'Your specific combination of strengths for their specific need.' },
  { id: 'r4', cat: 'role', comp: ['execution'], q: 'How do you prioritise when everything feels urgent?', tip: 'Name your actual system.' },
  { id: 'r5', cat: 'role', comp: ['collaboration'], q: 'What would your last manager say about you?', tip: 'Use something they actually said - review comments count.' },
  { id: 'x1', cat: 'technical', comp: ['problem_solving'], q: 'Walk me through how you would approach a problem you have never seen before.', tip: 'Think aloud: clarify, break down, check assumptions.' },
  { id: 'x2', cat: 'technical', comp: ['technical'], q: 'Tell me about a technical or analytical project you are proud of.', tip: 'Explain the why and the trade-offs, not just the how.' },
  { id: 'x3', cat: 'technical', comp: ['problem_solving', 'integrity'], q: 'How do you make sure your work is correct?', tip: 'Show a real habit - tests, review, checks against data.' },
  { id: 'x4', cat: 'technical', comp: ['communication'], q: 'Explain something complex from your field to a non-expert.', tip: 'Clarity over jargon is the whole point of the question.' }
];
var BANK_BY_ID = {}; BANK.forEach(function(q){ BANK_BY_ID[q.id] = q; });

/* Seconds a strong spoken answer takes, by question type. */
var TARGETS = { tell: [45, 120], behavioral: [45, 150], situational: [40, 120], explain: [30, 120], motivation: [25, 90], role: [25, 100], technical: [45, 180], followup: [15, 75], closing: [20, 90], negotiation: [5, 45], probe: [10, 75] };
function targetFor(qtype){ return TARGETS[qtype] || TARGETS.behavioral; }
function qtypeOf(q){
  var s = String(q || '').toLowerCase();
  if(/tell me about yourself|walk me through your (?:background|resume|cv)|introduce yourself/.test(s)) return 'tell';
  if(/why (?:did|do|would) you (?:want to )?leave|why are you leaving|why (?:did|do) you want to leave|what made you (?:apply|interested|want|decide)|why (?:are you )?interested|interested in (?:this|the|our|working)|what do you know about (?:us|our|the company|this company)|\bgap (?:in|on) your (?:resume|cv)|explain (?:the|this|your) (?:gap|move|switch|career)|career (?:change|switch|break)/.test(s)) return 'motivation';
  if(/how would (?:your|my) (?:coworkers|co-workers|colleagues|manager|boss|friends|team|teammates|direct reports) describe|what would (?:your|my) (?:manager|boss|coworkers|colleagues|team) say|describe yourself|in three words/.test(s)) return 'role';
  if(/\bexplain\b.*\b(?:to (?:a|an|someone|somebody|your|my|non)|non[- ]?(?:expert|technical)|in (?:simple|plain|layman'?s?) terms|like i'?m|layperson)/.test(s)) return 'explain';
  if(/questions? (?:for|do you have for) (?:me|us)|anything you(?:'d| would) like to ask/.test(s)) return 'closing';
  if(/tell me about a time|describe a time|give (?:me )?an example|have you ever|a situation where|walk me through a time/.test(s)) return 'behavioral';
  if(/why (?:do you want|this|us|here|are you leaving|now)|five years|motivat|looking for in|what draws/.test(s)) return 'motivation';
  if(/what would you do|how would you|how you would|imagine|suppose|if you (?:were|had)|first (?:30|90)|how do you (?:handle|deal with|approach|respond|react|make sure|decide|prioriti|stay|manage|keep)|what (?:do|would) you do\b|what is a weakness|weakness (?:you are|you're) (?:actively )?working on/.test(s)) return 'situational';
  if(/technical|design|architect|debug|code|sql|algorithm/.test(s)) return 'technical';
  if(/strength|weakness|why should we|manager say|prioriti/.test(s)) return 'role';
  return 'behavioral';
}

/* ======================================================= ANSWER ANALYTICS */
function matchesOf(re, text){ var out = [], m, r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g'); while((m = r.exec(text))){ out.push({ text: m[0], index: m.index }); if(m[0] === '') r.lastIndex++; if(out.length > 400) break; } return out; }
function tally(list){ var c = {}; list.forEach(function(m){ var k = clean(m.text).toLowerCase().replace(/^[, ]+/, '').replace(/^(?:and|so|but|was|were|is|its|it's|just|um|uh|i'm|im|they're|we're)\s+(?=like$)/, ''); c[k] = (c[k] || 0) + 1; }); return Object.keys(c).sort(function(a, b){ return c[b] - c[a]; }).map(function(k){ return [k, c[k]]; }); }
/* A verbatim fragment (<= ~12 words) around a match, so local evidence is always their real words. */
function fragmentAt(text, index, len){
  var start = index, end = index + (len || 0), t = String(text);
  var before = t.slice(0, start).split(/\s+/), after = t.slice(end).split(/\s+/);
  var pre = before.slice(Math.max(0, before.length - 5)).join(' '), post = after.slice(0, 6).join(' ');
  var frag = clean(pre + t.slice(start, end) + post);
  var cut = frag.split(/(?<=[.!?])\s+/); // keep it to one sentence where possible
  if(cut.length > 1){ var hit = clean(t.slice(start, end)).toLowerCase(); frag = cut.filter(function(c){ return c.toLowerCase().indexOf(hit) >= 0; })[0] || cut[0]; }
  return words(frag).slice(0, 14).join(' ').replace(/^[,.;:!?\s]+|[,;:\s]+$/g, '');
}

var HYPO_BEFORE_RE = /\b(?:suspect(?:ed|s)?|hypothes\w*|wonder(?:ed)?|theor(?:y|ies|ized)|(?:test|check|verify|see|find out|figure out|work out)(?:ed)? (?:whether|if)|rule[ds]? out|possibilit(?:y|ies)|culprit|candidates?|suspicion)\b/i;
var HYPO_AFTER_RE = /\b(?:so|then|and|which|first|next|i|we) (?:i |we )?(?:\w+ly )?(?:tested|checked|verified|confirmed|ruled|investigated|compared|traced|reproduced|isolated|looked into|measured|ran a test|ran the)\b/i;
function hypothesis(t, m){
  // Only the "might have / maybe / probably" family can be a hypothesis; "I think" and "kind of" are always hedges.
  if(!/^(?:might have|may have|maybe|probably|possibly|perhaps)$/i.test(clean(m.text))) return false;
  // "I suspect it maybe went up" is still a hedge: only a guess you then went and tested is a hypothesis.
  var rest = t.slice(m.index + m.text.length), s1 = rest.search(/[.!?]/), s2 = s1 < 0 ? -1 : rest.slice(s1 + 1).search(/[.!?]/);
  var after = s1 < 0 ? rest : s2 < 0 ? rest : rest.slice(0, s1 + 1 + s2);
  return HYPO_AFTER_RE.test(after);
}
/* "I hope to lead a team", "hopefully by then I'll have shipped..." - an aspiration about the future
   isn't a hedge about work you did. Only "hopefully it worked" doubts your own story. */
var FUTURE_SENT_RE = /\b(?:will|'ll|would|'d|going to|gonna|next (?:role|job|position|step|year)|looking (?:for|to)|(?:hope|want|plan|aim|like|love) to|in (?:\w+ )?(?:years?|months?) time|in (?:five|ten|two|three|\d+) years|one day|eventually|someday)\b/i;
var PAST_CLAIM_RE = /\b(?:i|we)\s+(?:\w+ly\s+)?(?:[a-z]{2,}ed|built|made|ran|led|took|cut|grew|won|wrote|got|did|sold|drove|brought|found|kept|gave|went|was|were|had)\b/i;
function aspiration(t, m){
  // Any hedge in a sentence about what they'd like next - "I'd probably like a bigger team" - softens a wish, not their work.
  var sent0 = sentenceAt(t, m.index);
  if(FUTURE_SENT_RE.test(sent0) && !PAST_CLAIM_RE.test(sent0) && !/^(?:i think|i guess|i suppose|i feel like|i'm not sure|im not sure|not sure)$/i.test(clean(m.text))) return true;
  if(!/^(?:i hope|hopefully)$/i.test(clean(m.text))) return false;
  var after = t.slice(m.index + m.text.length);
  if(/^\s+to\s+[a-z]/i.test(after)) return true;                                        // "I hope to lead..."
  if(/^\s*(?:,\s*)?(?:that\s+)?(?:i\s+|we\s+|it\s+|they\s+)?(?:[a-z]+ed|made|did|got|was|were|had)\b/i.test(after)) return false;   // "hopefully it worked", "I hope I helped"
  var sent = sentenceAt(t, m.index);
  return /\b(?:will|'ll|going to|gonna|can|could|by (?:then|day|month|year|the end|\d+)|in (?:\w+ )?(?:years?|months?)|(?:hope|want|plan|aim|like|love) to|would like|'d like|'d love|looking (?:for|to)|next (?:year|step|role)|one day|eventually|someday|future)\b/i.test(sent);
}
// "I + a past-tense verb": what they really did, for answers told from experience.
var PAST_I_RE = /\bi\s+(?:\w+ly\s+|then\s+|also\s+)?(?:(?!(?:need|feed|proceed|succeed|exceed|bleed|breed|speed|seed|heed|embed|shed)\b)(?:[a-z]+-)?\w{2,}ed|told|took|made|ran|got|went|gave|spoke|wrote|brought|set|put|found|led|met|kept|caught|chose|drew|held|sent|spent|built|taught|bought|sold|paid|said|sat|stood|began|did|read|cut|won|lost|left|hit|shut|split|quit|felt|thought|knew|saw|became|grew|drove|flew|broke|rewrote|rebuilt)\b/gi;
// Past-tense states, not actions: "I felt", "I thought", "I wanted" own nothing.
var PAST_STATE_RE = /\b(?:felt|thought|knew|saw|wanted|liked|loved|hated|hoped|wished|worried|wondered|believed|seemed|needed|tried|guessed|assumed|supposed|enjoyed|preferred|cared|feared|panicked|struggled|failed|was|were|had|got|became|did)$/i;
// The same past-tense verbs with "we" / "my team" as the subject: a team story is still a real event.
var PAST_WE_RE = /\b(?:we|my team|our team)\s+(?:\w+ly\s+|then\s+|also\s+)?(?:(?!(?:need|feed|proceed|succeed|exceed|bleed|breed|speed|seed|heed|embed|shed)\b)(?:[a-z]+-)?\w{2,}ed|told|took|made|ran|got|went|gave|spoke|wrote|brought|set|put|found|led|met|kept|caught|chose|drew|held|sent|spent|built|taught|bought|sold|paid|said|sat|stood|began|did|read|cut|won|lost|left|hit|shut|split|quit|felt|thought|knew|saw|became|grew|drove|flew|broke|rewrote|rebuilt)\b/gi;
// Owning a failure in the first person: "I had not checked", "I committed to...", "I underestimated".
var FAIL_OWN_RE = /\bi\s+(?:had not|hadn'?t|did not|didn'?t|should(?:n'?t| not)? have|forgot|missed|assumed|underestimated|overestimated|overcommitted|overpromised|committed|misjudged|rushed|ignored|skipped|chose|stayed|turned down|said yes|said no|made (?:a|the) (?:mistake|wrong call|call)|was wrong|messed up|dropped the ball|failed|let)\b/gi;
var NAME_TOK = "[A-Z][\\w.+#&'-]*(?:\\s+[A-Z][\\w.+#&'-]*){0,2}";
var NAME_LIST_RE = new RegExp('(?:' + NAME_TOK + '(?:\\s*,\\s*(?:and\\s+|or\\s+)?|\\s+(?:and|or)\\s+)){2,}' + NAME_TOK, 'g');
// Spoken answers come without commas: "Microsoft Amazon and Salesforce" is a list when an "and" closes a run of names.
var NAME_LIST_RUNON_RE = /(?:\b[A-Z][\w.+#&'-]*\s+){2,}(?:and|or)\s+[A-Z][\w.+#&'-]*/g;
function listedNames(t){
  t = String(t || '');
  if(!/,/.test(t)) return matchesOf(NAME_LIST_RUNON_RE, t).reduce(function(k, m){ return k + (m.text.match(/\b[A-Z][\w.+#&'-]*/g) || []).length; }, 0);
  return matchesOf(NAME_LIST_RE, t).reduce(function(k, m){ return k + m.text.split(/\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+/).length; }, 0);
}
var TEAM_SUBJ_RE = /\b(?:our|my|the)\s+(?:[a-z]+\s+)?(?:team|teams|engineers|designers|analysts|developers|devs|staff|colleagues|department|group|crew|squad|reps)\s+(?:\w+ly\s+|then\s+|also\s+)?(?:[a-z]{2,}ed|built|made|ran|took|cut|grew|won|led|wrote|set|got|did|sold|drove|brought|found|kept|gave|went|rebuilt|rewrote|shipped)\b/gi;
/* "I went through the data, built a forecast, and placed the orders a month earlier": one "I", three actions -
   but a stock phrase ("implemented the solution, optimised performance") is no action at all. */
var CHAIN_VERB_RE = null;
function chainedActs(sents){
  if(!CHAIN_VERB_RE) CHAIN_VERB_RE = new RegExp("(?:,\\s*(?:and\\s+|then\\s+)?|\\s+and\\s+(?:then\\s+)?)(?:\\w+ly\\s+)?(?:(?!(?:need|feed|proceed|succeed|exceed|bleed|breed|speed|seed|heed|embed|shed|tired|excited|interested|worried|scared|bored|surprised|pleased|confused)\\b)[a-z]{3,}ed|" + IRREG_PAST + ")\\b", 'gi');
  var k = 0, act = new RegExp(I_ACTION_RE.source + '|' + PAST_I_RE.source, 'i'), cl = new RegExp(CLICHE_RE.source, 'i');
  sents.forEach(function(sn){
    var m = act.exec(sn); if(!m) return;
    var rest = sn.slice(m.index + m[0].length);
    matchesOf(CHAIN_VERB_RE, rest).forEach(function(c){ if(!cl.test(rest.slice(c.index, c.index + c.text.length + 40).replace(/^[,\s]*(?:and|then)?\s*/i, ''))) k++; });
  });
  return Math.min(k, 6);
}
function analyzeAnswer(text, opts){
  opts = opts || {};
  var t = apos(String(text || '').slice(0, MAXTXT)), low = t.toLowerCase(), w = words(t), n = w.length;
  var qtype = opts.qtype || qtypeOf(opts.question), target = opts.target || targetFor(qtype);
  var voice = opts.mode === 'voice';
  // Duration: spoken seconds when measured, else a typed answer's speaking time at 150 wpm.
  // A measurement implying more than ~330 words a minute is a glitch (e.g. the mic opened
  // late) - never judge someone on a broken clock: fall back to the estimate and say so.
  var timingOk = voice && opts.seconds > 0 && !(n >= 8 && n / opts.seconds > 5.5);
  var seconds = timingOk ? opts.seconds : n / 150 * 60;
  var speakSecs = timingOk && opts.speakSeconds > 0 ? opts.speakSeconds : seconds;
  var wpm = timingOk && speakSecs >= 4 && n >= 8 ? Math.round(n / (speakSecs / 60)) : null;
  // "like" before a name or tool ("tools, like SQL") is an example, not a filler.
  var fillers = matchesOf(FILLER_RE, t).filter(function(m){ if(!/like$/i.test(m.text)) return true; var nx = t.slice(m.index + m.text.length).match(/^\s+(\S+)/); return !(nx && /^[A-Z]/.test(nx[1])); });
  var hedges = matchesOf(HEDGE_RE, t).filter(function(m){ return !hypothesis(t, m) && !aspiration(t, m); }), minimizers = matchesOf(MINIMIZER_RE, t);
  var cliches = matchesOf(CLICHE_RE, t), blame = matchesOf(BLAME_RE, t).filter(function(m){ return realBlame(t, m, opts.question); });
  var iCount = matchesOf(I_RE, t).length, weCount = matchesOf(WE_RE, t).length, iActs = matchesOf(I_ACTION_RE, t);
  var numbers = matchesOf(NUMBER_RE, t).filter(function(m){ return clean(m.text); });
  var sents = sentences(t);
  var star = { s: SITUATION_RE.test(t) || AT_PLACE_RE.test(t), t: TASK_RE.test(t), a: iActs.length > 0 || /\b(?:so i|then i|i decided|i started|i went|i put|i got)\b/i.test(t), r: RESULT_RE.test(t) || quantAfterAction(sents) || stateAfterAction(sents),
    lesson: LESSON_RE.test(t) || (FAILQ_RE.test(String(opts.question || '')) && sents.length >= 2 && HABIT_RE.test(sents[sents.length - 1])) };
  var ppf = { present: PRESENT_RE.test(t), past: PAST_RE.test(t), future: FUTURE_RE.test(t) };
  var longSents = sents.filter(function(s){ return words(s).length > 40; }).length;
  // Repetition: the same 4-word run said 3+ times means circling, not answering; an 8-word run said twice
  // is the answer pasted (or recited) again - never more evidence.
  var grams = {}, reps = [], g8 = {}, pasted = false;
  for(var i = 0; i + 4 <= n && i < 3000; i++){ var g = w.slice(i, i + 4).join(' ').toLowerCase().replace(/[^a-z0-9' ]/g, ''); if(g.split(' ').length === 4 && g.split(' ').every(Boolean)){ grams[g] = (grams[g] || 0) + 1; if(grams[g] === 3) reps.push(g); } }
  for(var j8 = 0; j8 + 8 <= n && j8 < 3000 && !pasted; j8++){ var k8 = w.slice(j8, j8 + 8).join(' ').toLowerCase().replace(/[^a-z0-9' ]/g, ''); if(!k8.split(' ').every(Boolean)) continue; if(g8[k8] != null && j8 - g8[k8] >= 8) pasted = true; else if(g8[k8] == null) g8[k8] = j8; }
  var vague = uniq(matchesOf(VAGUE_RE, t).map(function(m){ return clean(m.text).toLowerCase(); }));
  // Names, places, products: capitalised words that aren't just starting a sentence.
  var properish = 0;
  sents.forEach(function(s){ words(s).slice(1).forEach(function(x){ var wd = x.replace(/[^A-Za-z0-9]/g, ''); if(/^(?:[A-Z][a-z]{2,}|[A-Z]{2,}[a-z]*)$/.test(wd) && !PROPER_STOP[wd.toLowerCase()]) properish++; }); });
  var kt = keyTerms(opts.question), stems = (low.match(/[a-z]{4,}/g) || []).map(function(x){ return x.replace(/(ing|ed|es|s)$/, ''); });
  var hits = kt.filter(function(k){ return termHit(k, low, stems); });
  // Typed answers are written tighter than speech, so their floor is lower.
  var lo = voice ? target[0] : target[0] * 0.6;
  var lengthStatus = seconds < lo * 0.45 ? 'way-short' : seconds < lo ? 'short' : seconds <= target[1] ? 'ok' : seconds <= target[1] * 1.5 ? 'long' : 'way-long';
  var mins = Math.max(seconds, 1) / 60;
  // Names that stand in for what happened: lists of companies and tools ("Google, Meta, Amazon, Apple and
  // Netflix, using Agile, Scrum, Kanban...") with no figure anywhere. A hospital, a university and a job title
  // in a sentence each are a background, not name-dropping.
  if(listedNames(t) >= 5 && !numbers.length && n < 90) vague = vague.concat(['name-dropping']);
  // Who did it: "we" said in someone else's quoted words isn't the candidate's team story; "our team rebuilt it",
  // "the engineers cut..." is - told without a single "we".
  var unquoted = t.replace(/"[^"\n]{0,400}"|\u201c[^\u201d\n]{0,400}\u201d/g, ' ');
  var teamSubj = matchesOf(TEAM_SUBJ_RE, unquoted).length;
  // "My mistake was..." admits nothing; a humblebrag with no cost anywhere else is a dodge.
  var echoless = t.replace(FAIL_ECHO_RE, ' '), qtext = String(opts.question || '');
  // A humblebrag is a dodge when it comes with the spin (praise, a perfect record) and costs nothing - or it is all there is.
  var fakeBrag = hbHits(t) > 0 && !hasCost(echoless) && (BRAG_RE.test(echoless) || n < 25);
  // A success story is a dodge unless something actually went wrong once they were in it: an owned error,
  // or a concrete cost after their first action (the mess they walked into doesn't count).
  var actM = new RegExp(I_ACTION_RE.source + '|' + PAST_I_RE.source + '|' + PAST_WE_RE.source, 'i').exec(echoless), afterAct = actM ? echoless.slice(actM.index) : echoless;
  var owned = new RegExp(FAIL_OWN_RE.source, 'i').test(echoless.replace(DEDICATION_RE, ' ')) || hasCost(afterAct) || ADMIT_RE.test(afterAct.replace(DEDICATION_RE, ' ').replace(ADMIT_VAGUE_RE, ' '));
  var selfFailQ = FAILQ_RE.test(qtext) && !OTHERS_FAIL_Q_RE.test(qtext);
  var a = {
    text: t, words: n, sentences: sents, qtype: qtype, question: String(opts.question || '').slice(0, 1000), target: target, mode: voice ? 'voice' : 'text', timingEstimated: voice && !timingOk,
    method: METHOD_RE.test(t) || HABIT_RE.test(t), iWould: matchesOf(/\bi(?: would|'d| will|'ll)\s+\w+/gi, t).length, steps: matchesOf(/\b(?:first|then|next|after that|finally|i would|i'd|i will|i'll|if (?:it|they|that|he|she))\b/gi, t).length,
    // A dodge is a success story with no setback in it at all - told as a win or landing on a result. Echoing the
    // question ("My biggest failure was...") admits nothing; "I worked too hard" / "I care too much" is the classic
    // dodge unless a real owned error comes with it ("so I missed the first deadline").
    dodged: selfFailQ && (((SUCCESS_FRAME_RE.test(t) || RESULT_RE.test(t.replace(RESULT_NEUTRAL_RE, ' '))) && !owned) || fakeBrag),
    // ...and to a weakness question: a strength dressed up as a weakness, with nothing it has ever cost.
    fakeWeak: !FAILQ_RE.test(String(opts.question || '')) && WEAKQ_RE.test(String(opts.question || '')) && fakeBrag,
    jargon: n >= 15 && (low.match(/[a-z]{11,}/g) || []).length / n > 0.1, specificRatio: vacuity(t).ratio,
    pastI: matchesOf(PAST_I_RE, t).length, pastIActs: matchesOf(PAST_I_RE, t).filter(function(m){ return !PAST_STATE_RE.test(m.text); }).length + chainedActs(sents), pastWe: matchesOf(PAST_WE_RE, t).length, ownedFailures: FAILQ_RE.test(String(opts.question || '')) ? matchesOf(FAIL_OWN_RE, t).length : 0,
    nonAnswer: nonAnswer(t, opts.question, qtype),
    seconds: round1(seconds), wpm: wpm, pace: wpm == null ? null : wpm < 105 ? 'slow' : wpm > 175 ? 'fast' : 'good',
    fillers: { count: fillers.length, perMin: round1(fillers.length / mins), top: tally(fillers).slice(0, 4), list: fillers },
    hedges: { count: hedges.length, top: tally(hedges).slice(0, 4), list: hedges },
    minimizers: minimizers, cliches: uniq(cliches.map(function(m){ return clean(m.text).toLowerCase(); })), clicheList: cliches, blame: blame,
    // "I" and "we" as the one doing it: "our clients" and "with us" aren't team actions.
    iCount: iCount, weCount: weCount, iSubj: matchesOf(/\bi\b/gi, unquoted).length, weSubj: matchesOf(/\bwe\b/gi, unquoted).length + teamSubj, teamSubj: teamSubj, iActions: iActs.length, numbers: uniq(numbers.map(function(m){ return clean(m.text); })), quantified: numbers.length > 0,
    star: star, ppf: ppf, longSentences: longSents, repetition: reps, pasted: pasted, vague: vague, properNouns: properish,
    relevance: { terms: kt, hits: hits, ratio: kt.length ? hits.length / kt.length : null },
    length: { status: lengthStatus, target: target },
    latency: voice && typeof opts.latency === 'number' ? round1(opts.latency) : null,
    longestPause: voice && typeof opts.longestPause === 'number' ? round1(opts.longestPause) : null,
    pauses: voice && typeof opts.pauses === 'number' ? opts.pauses : null,
    pitchVar: voice && typeof opts.pitchVar === 'number' ? round1(opts.pitchVar) : null,
    interrupted: !!opts.interrupted
  };
  // A real one-off event counts: a past-tense "I" action, or a "we" story with a concrete detail
  // ("My first startup ran out of money after eight months. We spent most of it on ads...").
  a.example = a.star.s || (a.star.a && a.words >= 40) || a.properNouns >= 2 || (a.pastI >= 1 && a.words >= 15) ||
    (a.pastWe >= 1 && a.words >= 15 && (a.quantified || a.specificRatio >= 0.5));
  a.scores = scoreAnswer(a);
  return a;
}

/* Non-answers a word-counting judge would otherwise reward. */
/* Instructions aimed at the judge - never an honest answer that happens to mention a
   score, an AI product, a rating or a system prompt ("our CSAT was 7 out of 10", "as an
   AI product manager", "customers rate it 5 stars", "give me five ideas"). */
var GAMING_LEAD = String.raw`(?:^|[.!?]\s*|\b(?:please|just|so|now|then|you\s+(?:should|must|will|need\s+to|have\s+to)|i\s+(?:want|need)\s+you\s+to|make\s+sure\s+(?:you|to))\s+)`;
var GAMING_RE = new RegExp([
  String.raw`\b(?:ignore|disregard|forget|override)\s+(?:(?:your|the|all|any|previous|prior|above|these|those|earlier)\s+){1,3}(?:rules|instructions|rubric|guidelines|prompt|criteria)\b`,
  GAMING_LEAD + String.raw`(?:score|rate|grade|mark)\s+(?:this\s+answer|my\s+answer|this|me|it)\s+(?:a\s+|as\s+|at\s+)?(?:10|ten|perfect|full\s+marks|top\s+marks|excellent|strong\s+hire)(?:\s*(?:\/|out\s+of)\s*10)?\b`,
  GAMING_LEAD + String.raw`give\s+(?:me|this\s+answer|my\s+answer|this)\s+(?:a\s+|the\s+)?(?:10|ten|perfect\s+score|full\s+marks|top\s+marks|strong\s+hire)\b(?!\s+[a-z])`,
  String.raw`\bas\s+an\s+ai\b(?=\s*(?:model|assistant|language\s+model|,))`,
  String.raw`\bsystem\s+prompt\s+(?:says|instructs|tells\s+you|requires|overrides?)\b|\b(?:ignore|override|disregard)\s+(?:the\s+|your\s+)?system\s+prompt\b`,
  String.raw`\byou\s+(?:must|should|will|have\s+to|need\s+to)\s+(?:score|rate|give|grade|mark)\s+(?:me|this|it|my\s+answer|this\s+answer)\s+(?:a\s+)?(?:10|ten|perfect|full|top|strong|high)`,
  String.raw`\b(?:score|rate|give)\b[^.!?]{0,40}\bout\s+of\s+10\b[^.!?]{0,30}\b(?:please|now)\b`
].join('|'), 'i');
/* An answer in another language: the built-in judge's word lists are English, so it says so and scores
   nothing rather than calling a coherent story "word salad". */
var NON_EN_STOP = mkSet(('de la el que los las en y un una por con para es del al lo se su sus muy pero como también yo mi era fue estaba este esta nos ' +
  'je le les des et est une du dans pour sur avec au aux ce cette qui pas nous vous ils elle sont été mon ma mes était ai avons ' +
  'und der die das ist nicht ein eine mit auf für ich wir zu den dem sich auch wurde haben habe mein meine war ' +
  'il di che non per sono nel della delle degli gli anche ho abbiamo mio mia con una uno alla ' +
  'os não com uma um mais foi ao às pelo pela eu meu minha na da do das dos em ele ela nós estava isso ' +
  'het een van ik niet op voor zijn wij mijn er och att det som jag är på inte ett för med og af ikke jeg til ' +
  'się nie że jest był była było jak ale po od za moim mój moja przez aby w z ' +
  've bir bu için ile çok ben benim olarak ama sonra gibi daha her ' +
  'dan yang di ke dari saya kami untuk dengan ini itu tidak ada pada akan sudah juga karena ' +
  'și în cu pe este că nu mai din pentru care ' +
  'tôi và của có không là được một những cho với trong đã này người khi ' +
  'ang ng sa mga ako ko na ay siya namin hindi ito nang ' +
  'mein hai tha thi ka ki ke aur ko se ne bhi nahi kya yeh woh hum mujhe mera meri kaam kiya karna').split(' ').filter(function(w){ return !STOP[w] && ['a', 'i', 'to', 'do', 'on', 'in', 'an', 'am', 'be', 'me', 'no', 'so', 'or', 'us', 'at', 'as', 'he', 'we', 'it', 'is', 'by', 'up', 'main', 'die', 'den', 'war', 'van', 'pie', 'con', 'per', 'via', 'era', 'dan', 'ada', 'pe'].indexOf(w) < 0; }));
// Words that mark English and almost nothing else ("a", "in", "on", "me" are words in Romance languages too).
var ENG_STRONG = mkSet('the and of was were with that this my our we they he she it is for from have had but not which who what when i you your their been are will would could should did there'.split(' '));
function notEnglish(text){
  var t = String(text || '').slice(0, MAXTXT);
  // Another script: letters outside Latin (Cyrillic, Greek, Arabic, Hebrew, Devanagari, Bengali, Tamil, CJK, Hangul...).
  var letters = t.match(/\p{L}/gu) || [], other = letters.filter(function(ch){ return !/[A-Za-z\u00c0-\u024f\u1e00-\u1eff]/.test(ch); }).length;
  if(other >= 10 && other > (t.match(/[A-Za-z]/g) || []).length) return true;
  var w = t.toLowerCase().match(/[a-z\u00c0-\u024f\u1e00-\u1eff']+/g) || [];
  if(w.length < 8) return false;
  var en = w.filter(function(x){ return x in ENG_STRONG; }).length, fo = w.filter(function(x){ return x in NON_EN_STOP; }).length;
  var dia = w.filter(function(x){ return /[\u00c0-\u024f\u1e00-\u1eff]/.test(x); }).length;   // "işimde", "sürüyordu": accents on a fifth of the words
  return en / w.length < 0.11 && ((fo >= 3 && fo / w.length >= 0.12) || dia / w.length >= 0.2);
}
var FUNC_WORDS = mkSet('the a an to of and in on at for with that this it was is were be as by from or but so we i my our they their he she you your his her them me us there then when which who what how because if not no'.split(' '));
// Words that fit any answer to any question: an answer made only of these says nothing.
var GENERIC_WORDS = mkSet(('thing things stuff something anything everything nothing situation situations action actions step steps issue issues ' +
  'way ways process processes system systems goal goals quality trust customer customers safety risk risks protected important remaining necessary right ' +
  'good great best better more most lot lots people person place somewhere someone time times work job role position team company career future growth grow ' +
  'next level value values matter matters reason because really want wants love like think imagine example similar same means mean costs cost tradeoff trade off ' +
  'studied graduated started here excited looking look see myself yourself years year five first then finally make made take took get got go went ' +
  'assess evaluate handle deal follow appropriate met sure would could should done doing every also always never ever well much many some any other others ' +
  'kind sort type part whole new old big small high low hard easy able know knew help helped need needed try tried use used order plan plans approach ' +
  'result results outcome outcomes impact effective effectively proactive positive negative strong weak key main overall general specific certain different ' +
  'today now currently right before after during while until since why what which where there their everyone everybody anyone nobody ' +
  'involved problem problems solved solve happen happens happened again fix fixed learn contribute own owned understand break down prioritize prioritise prioritized ' +
  'think carefully properly communicate communicated listen ask review adjust improve deliver execute implement succeed succeeds reached reach handled rest check checked both stakeholders stakeholder based priorities priority ' +
  // template nouns and buzzwords: an answer built from these could be anyone's
  'challenge challenges project projects solution solutions leadership ownership efficiency expectations blockers opportunity opportunities initiative ' +
  'persistence resilience adaptability collaboration collaborated collaborating analyzed analysed implemented delegated motivated empowered empowering ' +
  'synergy synergies synthesize synthesise operationalize operationalise leverage leveraged socialize socialise ecosystem north-star landscape verticals ' +
  'alignment aligned cadence framework frameworks deliverables practices success successful task tasks clear research significant major lot learned learnt ' +
  'taught working handling resolved converge converges forward initially ultimately previous responsible leading toward towards end exceeded removed ' +
  'last big huge strategic holistic robust scalable innovative seamless stakeholder-driven data-driven outcome-driven mindset journey space ' +
  'client clients teammate teammates colleague colleagues coworker coworkers perspective perspectives reasoning compromise approach approaches seriously calm ' +
  'transparent transparently reflected reflect changes extra hours tasks task concern root cause cross-functionally functionally empathy relationship relationships ' +
  'successfully tight urgent critical difficult challenging complex simple various several regular toward manager boss praised showed showing').split(/\s+/));
var VAC_FUNC = mkSet("the a an to of and in on at for with that this it was is were be as by from or but so we i my our they their he she you your his her them me us there then when which who what how because if not no am are been being have has had do did does would could should will can just also very really about into than its it's im i'm i'd id ive i've that's thats way".split(' '));
function vacuity(text){
  var w = (String(text).toLowerCase().match(/[a-z']+/g) || []).map(function(x){ return x.replace(/'s$/, ''); });
  var content = w.filter(function(x){ return x.length >= 3 && !(x in VAC_FUNC); }), spec = content.filter(function(x){ return !(x in GENERIC_WORDS) && !(x in ANCHOR_SOFT); });
  return { n: w.length, content: content.length, ratio: content.length ? spec.length / content.length : 1, distinct: uniq(spec).length };
}
function nonAnswer(text, question, qtype){
  // A follow-up reply is answered short and straight - "Zero stockouts in December; 98% fill rate" is an answer there.
  var direct = qtype === 'followup' || qtype === 'probe';
  // Words are letters in any alphabet: "Nación" is one word, not "naci" + "n".
  var w = (String(text).toLowerCase().match(/[\p{L}']+/gu) || []), n = w.length, out = [];
  var vc = vacuity(text);
  // Mostly generic words AND hardly any specific ones ("analytics", "experimentation" and two more say something).
  // (Questions to ask are judged as questions - "what does success look like" is the point, not vague.)
  if(vc.n >= 15 && vc.content >= 8 && vc.ratio < 0.3 && vc.distinct < 4 && qtypeOf(question) !== 'closing') out.push('vacuous');
  if(GAMING_RE.test(text)) out.push('gaming');
  if(n >= 12){
    var qs = mkSet((String(question || '').toLowerCase().match(/[a-z']+/g) || []).filter(function(x){ return x.length > 3 && !(x in FUNC_WORDS); }));
    var content = w.filter(function(x){ return x.length > 3 && !(x in FUNC_WORDS); }), echo = content.filter(function(x){ return x in qs; }).length;
    if(content.length && echo / content.length > 0.45) out.push('echo');
    var fw = w.filter(function(x){ return x in FUNC_WORDS; }).length;
    // Few small words AND no told story: "I mapped every step... Approvals now take four days" at a bank with a
    // Spanish name is a story, however many proper nouns it has.
    if(!direct && fw / n < 0.2 && !(matchesOf(PAST_I_RE, text).length >= 1 && sentences(text).length >= 2)) out.push('salad');
    var verbs = matchesOf(new RegExp('\\b(?:' + ACTION_VERBS + ')\\b', 'gi'), text).length;
    if(verbs >= 6 && verbs / n > 0.18) out.push('list');
    // A string of figures across different things: one or two sentences that are mostly a list of numbers
    // ("improved things by 47%, saved $2M, grew revenue 300%...", "30% faster, 50% cheaper, 200 users"), with no
    // before-and-after anywhere. A real story with many figures has a problem, an action and a result.
    if(qtypeOf(question) === 'behavioral' && !fromTo(text).length){
      var ss = sentences(text).filter(function(x){ return words(x).length >= 4; });
      if(ss.length <= 2 && ss.some(function(x){
        var cl = numericClaims(x), units = uniq(cl.map(function(c){ return c.unit; }));
        var segs = x.split(/[,;:]|\band\b|\bwhile\b|\bwhich\b/i).filter(function(g){ return /\d|\b(?:two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|hundred|thousand|million|percent)\b/i.test(g); }).length;
        return cl.length >= 5 && (segs >= 5 || (cl.length >= 7 && units.length >= 4));
      })) out.push('numdump');
    }
  }
  return out;
}
/* A last sentence that describes how things stood after what they did is a result:
   "They still use it today.", "The bug never came back.", "The store managers loved it." */
var STATE_AFTER_RE = /\b(?:i (?:could|was able to|can now|managed to)|by the time|now|still|since|anymore|any more|again|today|never|stopped|became|become|loved|liked|happy|pleased|thrilled|satisfied|grateful|worked|went (?:well|live|smoothly|fine)|asked me|placed|signed|renewed|rolled|adopted|approved|kept|standard|default|go-to|on time|early|clean|fixed|solved|resolved|closed|won|passed|shipped|launched|landed|agreed|accepted|thanked|praised|promoted|returned|came back|stuck|uses?|opens?)\b/i;
function stateAfterAction(sents){
  if(sents.length < 2) return false;
  var act = new RegExp(I_ACTION_RE.source + '|' + PAST_I_RE.source + '|' + PAST_WE_RE.source, 'i');
  if(!sents.slice(0, -1).some(function(x){ return act.test(x); })) return false;
  var last = sents[sents.length - 1];
  if(/\b(?:i (?:don'?t|do not|didn'?t|did not) know|not sure|no idea)\b/i.test(last)) return false;
  return STATE_AFTER_RE.test(last) || OUTCOME_CLAUSE_RE.test(last);
}
/* How it ended, told about someone or something other than the narrator: "The shipment arrived on
   Thursday", "We reached the semi-finals", "The queue disappeared", "Nobody missed a delivery", "The
   fix held", "She hired me", "The wait list was gone", "Picking was faster". */
var OUTCOME_CLAUSE_RE = new RegExp('(?:^|[,;:]\\s*|\\b(?:and|so|then|but|after that|by then)\\s+)(?:(?!i\\b|i\'(?:ve|d|m)\\b)[a-z][\\w\'-]*\\s+){1,5}?' +
  '(?:(?!(?:need|want|start|plann|hop|tri)ed\\b)\\w{3,}ed|went|came|grew|fell|rose|held|hit|beat|made|got|gave|took|kept|won|became|stayed|cut|met|sold|brought|found|wrote|told|left|paid|stood|ran|' +
  '(?:was|were|is|are)\\s+(?:\\w+\\s+)?(?:\\w+er|gone|cleared|done|fixed|solved|resolved|over|back|on (?:time|schedule|track|budget)|clean|zero|empty|happy|happier|thrilled|pleased|reliable|stable|approved|adopted|accepted|signed|renewed|launched|shipped|live|finished|complete|completed|saved|kept|promoted|hired|chosen|selected|ahead)|' +
  'had\\s+(?:its|their|our|the|a|an|his|her)\\s+(?:best|biggest|first|highest|lowest|strongest|record|quietest|smoothest))\\b', 'i');
/* A sentence with a figure after the first thing they did is a result, even
   without a stock phrase ("It now saves the team 16 hours a week"). */
function quantAfterAction(sents){
  var acted = false, act = new RegExp(I_ACTION_RE.source + '|' + PAST_I_RE.source, 'i');
  var fig = function(s){ return matchesOf(NUMBER_RE, s).some(function(m){ var x = clean(m.text); return x && !/^(?:19|20)\d\d$/.test(x); }); };
  for(var i = 0; i < sents.length; i++){
    var s = sents[i];
    if(acted && fig(s)) return true;
    // ...or a figure after the action inside the same sentence: "I joined Toastmasters, gave 10 speeches, and by my next review I was at 4"
    var am = new RegExp(act.source, 'i').exec(s);
    if(am && i > 0 && fig(s.slice(am.index + am[0].length).replace(/^[^,;]*/, ''))) return true;
    if(am || /\b(?:so i|then i|i decided)\b/i.test(s)) acted = true;
  }
  return false;
}
// "What would your manager say about you?": a claim, backed by evidence.
var ROLE_CLAIM_RE = /\b(?:would say|would describe|i am|i'm|im|my (?:biggest |greatest |main |key |real )?(?:strength|weakness)|describe me as|i'd say|i would say|known for|good at|best at|great at)\b/i;
var ROLE_EVIDENCE_RE = /\b(?:for (?:example|instance)|in my (?:last |latest |annual |mid-?year )?review|(?:she|he|they|my manager|my boss|my team) (?:wrote|said|told me|asked me|trusted|picked|chose)|feedback|when i|last (?:year|quarter|month)|because i|which is why|that's why|the reason)\b/i;
// An explanation lands with an analogy or an example a non-expert can hold on to.
var EXPLAIN_AID_RE = /\b(?:it'?s like|is like|are like|think of|imagine|picture|for example|for instance|e\.g\.|say you|like the|like a|as if|the same way|similar to)\b/i;
/* The questions in a closing turn: sentences that end in "?" or open like one ("I'd like to know how..."). */
function closingQuestions(text){
  return sentences(apos(text)).filter(function(x){ return /\?\s*$/.test(x) || /^(?:(?:so|and|well|also|okay|ok|right|yes|yeah|first|firstly|second|secondly|finally|lastly|one more)[,]?\s+)?(?:(?:i'd|i would) (?:like|love) to (?:know|hear|understand|ask|learn)|i'm curious|i am curious|i'd be (?:interested|curious) to|i would be (?:interested|curious) to|i wonder|i was wondering|can you|could you|would you|what|how|who|why|where|when|which)\b/i.test(clean(x)); }).slice(0, 6);
}
function closingRead(text){
  var qs = closingQuestions(text), checks = qs.map(function(x){ return askCheck(x); });
  var good = checks.filter(function(c){ return c.ok; }).length, strong = checks.some(function(c){ return c.strong; }), flagged = checks.some(function(c){ return !c.ok; });
  return { n: qs.length, good: good, strong: strong, flagged: flagged, flags: [].concat.apply([], checks.map(function(c){ return c.flags.map(function(f){ return f.key; }); })),
    refers: /\b(?:you mentioned|you said|you described|earlier you|this role|the role|the team|in this job|day to day)\b/i.test(text) };
}
function scoreAnswer(a){
  var q = a.qtype, s = {};
  var example = a.example;
  if(q === 'closing'){
    // Judged as questions to ask: sharp, about the work, not me-first - the same reading as the Questions-to-ask tool.
    var cr = closingRead(a.text), L0 = a.length.status;
    if(!cr.n) s = { structure: 1, specificity: 1, ownership: 3, impact: 1, relevance: 2 };
    else s = { structure: 2 + Math.min(2, cr.good) + (cr.flagged ? 0 : 1), specificity: 1 + (cr.strong ? 2 : 0) + (cr.refers ? 1 : 0) + (cr.good >= 2 ? 1 : 0), ownership: 3,
      impact: 1 + Math.min(2, cr.good) + (cr.strong ? 1 : 0) + (cr.refers ? 1 : 0), relevance: cr.flagged ? 2 : 4 };
    if(cr.flagged) Object.keys(s).forEach(function(k){ s[k] = Math.min(s[k], 2); });
    s.concision = L0 === 'way-long' ? 2 : L0 === 'long' ? 3 : cr.n > 3 ? 3 : 5;
    a.closing = cr;
    Object.keys(s).forEach(function(k){ s[k] = clamp(Math.round(s[k]), 1, 5); });
    return s;
  }
  // structure
  if(q === 'tell') s.structure = 1 + (a.ppf.present ? 1 : 0) + (a.ppf.past ? 1 : 0) + (a.ppf.future ? 1 : 0) + (a.words >= 80 && a.longSentences === 0 ? 1 : 0);
  else if(q === 'motivation' || q === 'closing') s.structure = 1 + (/\b(?:because|since|so that|that's why|thats why|which is why|the reason)\b/i.test(a.text) ? 1 : 0) + (a.ppf.future ? 1 : 0) + (a.words >= 40 ? 1 : 0) + (a.longSentences === 0 && a.repetition.length === 0 ? 1 : 0);
  else if(q === 'role') s.structure = 1 + (ROLE_CLAIM_RE.test(a.text) ? 1 : 0) + (ROLE_EVIDENCE_RE.test(a.text) || a.pastI >= 1 ? 1 : 0) + (a.words >= 35 ? 1 : 0) + (a.longSentences === 0 && a.repetition.length === 0 ? 1 : 0);
  else if(q === 'followup') s.structure = 2 + (a.words >= 8 ? 1 : 0) + (a.longSentences === 0 && a.repetition.length === 0 ? 1 : 0) + (a.words <= 90 ? 1 : 0);
  else if(q === 'explain') s.structure = 1 + (EXPLAIN_AID_RE.test(a.text) ? 1 : 0) + (/\b(?:because|so|which is why|that's why|thats why|that means|which means|the reason)\b/i.test(a.text) ? 1 : 0) + (a.words >= 40 ? 1 : 0) + (a.longSentences === 0 && a.repetition.length === 0 ? 1 : 0);
  else if(q === 'situational') s.structure = 1 + (a.method ? 1 : 0) + (/\b(?:because|so that|which is why|the reason|to make sure|that way)\b/i.test(a.text) ? 1 : 0) + (a.words >= 40 ? 1 : 0) + (a.longSentences === 0 && a.repetition.length === 0 ? 1 : 0);
  else s.structure = 1 + (a.star.s ? 1 : 0) + (a.star.a ? 1 : 0) + (a.star.r || a.star.lesson ? 1 : 0) + ((a.star.t || a.star.lesson) && a.longSentences <= 1 ? 1 : 0);
  // specificity: no example and no number can't be specific - except a "what would you do",
  // where concrete steps are the specifics
  if(q === 'role') s.specificity = 1 + (a.quantified ? 1 : 0) + (a.pastI >= 1 || a.properNouns >= 1 || ROLE_EVIDENCE_RE.test(a.text) ? 1 : 0) + (a.specificRatio >= 0.5 ? 1 : 0) + (a.cliches.length === 0 && a.words >= 25 ? 1 : 0);
  else if(q === 'followup') s.specificity = 1 + (a.quantified ? 1 : 0) + (a.properNouns >= 1 || a.pastI >= 1 || a.iWould >= 1 ? 1 : 0) + (a.specificRatio >= 0.5 ? 1 : 0) + (a.cliches.length === 0 && a.words >= 10 ? 1 : 0);
  else if(q === 'explain') s.specificity = 1 + (EXPLAIN_AID_RE.test(a.text) ? 1 : 0) + (a.properNouns >= 1 || a.quantified ? 1 : 0) + (/\b(?:without|with|instead of|compared to|unlike|costs?|trade-?off)\b/i.test(a.text) ? 1 : 0) + (a.cliches.length === 0 && a.words >= 40 ? 1 : 0);
  else if(q === 'situational') s.specificity = 1 + (a.method ? 1 : 0) + (a.steps >= 2 ? 1 : 0) + (example || a.quantified || a.properNouns >= 1 ? 1 : 0) + (a.cliches.length === 0 && a.words >= 40 ? 1 : 0) - (a.cliches.length >= 2 ? 1 : 0);
  else {
    s.specificity = 1 + (a.quantified ? 1 : 0) + (a.properNouns >= 1 ? 1 : 0) + (example ? 1 : 0) + (a.cliches.length === 0 && a.words >= 40 ? 1 : 0) - (a.cliches.length >= 2 ? 1 : 0);
    if(!example && !a.quantified) s.specificity = Math.min(s.specificity, 2);
  }
  // ownership
  // A plan in "I would" terms is owned; backing it with something you really did is stronger.
  // An explanation isn't about who did what - the rule-based judge stays neutral there.
  var acts = Math.max(a.iActions, a.pastIActs || 0), direct = q === 'followup' || q === 'probe';
  s.ownership = q === 'explain' ? 3 : q === 'role' ? 3 + (a.iCount >= 2 ? 1 : 0) + (a.pastI >= 1 || a.iActions >= 1 ? 1 : 0) : q === 'followup' ? 2 + (a.iActions + a.pastI >= 1 || a.iWould >= 1 || a.iCount >= 1 ? 1 : 0) + (a.iActions + a.pastI >= 2 || a.iWould >= 2 ? 1 : 0) : q === 'situational' ? (Math.max(a.iWould, a.method ? 1 : 0, a.pastI >= 2 ? 2 : 0) >= 2 ? 4 : Math.max(a.iWould, a.method ? 1 : 0, a.pastI) >= 1 ? 3 : 2) + (a.star.s || a.iActions >= 1 ? 1 : 0) : (acts >= 3 ? 5 : acts === 2 ? 4 : acts === 1 ? 3 : 2);
  if(a.ownedFailures) s.ownership = Math.max(s.ownership, a.ownedFailures >= 2 ? 4 : 3);   // "I had not checked" owns the failure
  if(weHeavy(a)) s.ownership--;
  if(a.minimizers.length >= 2 && q !== 'explain') s.ownership--;   // "a little extra space" in an explanation isn't minimising your role
  if(a.blame.length) s.ownership = Math.min(s.ownership, 2);
  // A short main answer can't show ownership; a short, direct reply to "what did YOU do?" can.
  if(a.words < (direct ? 4 : 20)) s.ownership = Math.min(s.ownership, 2);
  // impact
  if(q === 'motivation' || q === 'closing') s.impact = 2 + (a.ppf.future ? 1 : 0) + (a.properNouns >= 1 || a.quantified ? 1 : 0);
  else if(q === 'tell') s.impact = 2 + (a.quantified ? 1 : 0) + (a.star.r ? 1 : 0) + (a.ppf.future ? 1 : 0);
  else if(q === 'role') s.impact = 2 + (ROLE_EVIDENCE_RE.test(a.text) ? 1 : 0) + (a.quantified || a.star.r ? 1 : 0) + (a.star.lesson ? 1 : 0);
  else if(q === 'followup') s.impact = 2 + (a.quantified ? 1 : 0) + (a.star.r || a.star.lesson ? 1 : 0) + (a.specificRatio >= 0.6 ? 1 : 0);
  else if(q === 'explain') s.impact = 2 + (/\b(?:which is why|that's why|thats why|so that|which means|that means|the trade-?off|costs?|matters? because)\b/i.test(a.text) ? 1 : 0) + (EXPLAIN_AID_RE.test(a.text) ? 1 : 0);
  else if(q === 'situational') s.impact = 2 + (/\b(?:so that|to make sure|that way|which means|the goal|outcome|protect|prevent|customers?|safety|quality|trust|deadline|risk)\b/i.test(a.text) ? 1 : 0) + (a.star.s ? 1 : 0) + (a.method ? 1 : 0);
  else s.impact = a.star.r ? (a.quantified ? (a.star.lesson || /\b(?:which meant|so that|that meant)\b/i.test(a.text) ? 5 : 4) : 3) : (a.star.lesson ? 3 : (a.words > 80 ? 2 : 1));
  // relevance (rule-based can't read meaning: capped at 4)
  var r = a.relevance.ratio;
  s.relevance = r == null ? 3 : r >= 0.5 ? 4 : r > 0 ? 3 : (a.words >= 60 && (a.star.s || a.star.a) ? 3 : 2);
  if(a.words < (direct ? 4 : 15)) s.relevance = Math.min(s.relevance, 2);
  if(a.dodged || a.fakeWeak) s.relevance = 1;   // asked for a failure (or a weakness), told a success
  // Echoes, verb lists, word salad and instructions to the judge aren't answers, however many keywords they hit.
  if(a.nonAnswer && a.nonAnswer.length){ s.relevance = 1; s.specificity = Math.min(s.specificity, 1); s.ownership = Math.min(s.ownership, 2); s.impact = Math.min(s.impact, 1); s.structure = Math.min(s.structure, 2); }
  if(q === 'explain' && a.jargon){ s.structure = Math.min(s.structure, 3); s.specificity = Math.min(s.specificity, 2); s.relevance = Math.min(s.relevance, 2); s.impact = Math.min(s.impact, 3); }
  // concision
  var L = a.length.status;
  s.concision = L === 'ok' ? (a.longSentences === 0 && a.fillers.perMin < 2 && !a.repetition.length ? 5 : 4) : L === 'short' ? 3 : L === 'long' ? 3 : L === 'way-short' ? 1 : 1;
  if(L === 'way-short' && a.words >= 12) s.concision = 2;
  // A follow-up is answered best short and straight: only rambling costs concision there.
  if(direct && (L === 'short' || L === 'way-short' || L === 'ok')) s.concision = a.words < 4 ? 2 : a.longSentences === 0 && a.fillers.perMin < 2 && !a.repetition.length ? 5 : 4;
  if(a.repetition.length) s.concision = Math.max(1, s.concision - 1);
  if(a.pasted) s.concision = 1;
  if(a.interrupted) s.concision = Math.min(s.concision, 2);
  // delivery (spoken only): pace, fillers, pauses, start
  if(a.mode === 'voice' && !a.timingEstimated){
    var dl = 5;
    if(a.pace && a.pace !== 'good') dl--;
    if(a.fillers.perMin >= 8) dl -= 2; else if(a.fillers.perMin >= 3) dl--;
    if(a.longestPause != null && a.longestPause >= 3.5) dl--;
    if(a.latency != null && a.latency >= 4) dl--;
    if(a.pitchVar != null && a.pitchVar < 2) dl--;
    s.delivery = dl;
  }
  Object.keys(s).forEach(function(k){ s[k] = clamp(Math.round(s[k]), 1, 5); });
  return s;
}
var DIMS = ['structure', 'specificity', 'ownership', 'impact', 'relevance', 'concision'];
var DIM_LABEL = { structure: 'Structure', specificity: 'Specificity', ownership: 'Ownership', impact: 'Impact', relevance: 'Relevance', concision: 'Concision', delivery: 'Delivery' };
var WEIGHTS = { structure: 0.18, specificity: 0.2, ownership: 0.18, impact: 0.2, relevance: 0.14, concision: 0.1 };
function overall10(scores){
  var tot = 0, wsum = 0;
  DIMS.forEach(function(d){ if(typeof scores[d] === 'number'){ tot += scores[d] * WEIGHTS[d]; wsum += WEIGHTS[d]; } });
  return wsum ? clamp(Math.round(tot / wsum * 2), 1, 10) : null;
}

/* ============================================================ BUILT-IN JUDGE
   Rule-based, never pretending to be the AI. Its harsh lines quote real words. */
var HARSH = {
  noexample: ['Give one specific example.', 'There\'s no real example here - this is an opinion, not evidence.', 'No example, no proof. A committee can\'t score an opinion.'],
  noresult: ['Finish with what happened in the end.', 'You never said how it ended. Without a result, the story doesn\'t count.', 'No result. As far as I can tell, nothing changed because of you.'],
  we: ['Say more about your own part.', 'It\'s all "we" - I still don\'t know what YOU did.', 'All "we". I\'d hire your team, not you.'],
  long: ['Tighten it - the point gets buried.', 'Too long. The point is buried under the setup.', 'You lost the room. Nobody will remember the point of that answer.'],
  short: ['Add more detail - this is thin.', 'Too thin to judge. Two sentences isn\'t an answer.', 'That\'s not an answer, it\'s a headline.'],
  hedge: ['Sound more certain about your own work.', 'You hedge your own work - it sounds like you aren\'t sure you did it.', 'You hedged so much I believe less of it than you said.'],
  blame: ['Avoid blaming others.', 'Blaming others is a red flag in any interview.', 'You blamed someone else. That alone can end an interview.'],
  cliche: ['Replace buzzwords with proof.', 'Buzzwords, no proof.', 'Pure buzzwords. Every candidate says that.'],
  offtopic: ['Answer the exact question asked.', 'This doesn\'t really answer the question I asked.', 'You answered a different question.'],
  good: ['Strong - specific, owned, and it lands.', 'Solid: specific, owned and it lands on a result.', 'That one would survive a committee: specific, owned, measured.'],
  goodplain: ['Strong - specific and owned.', 'Solid: specific and owned.', 'That one would survive a committee: specific and owned.'],
  goodexplain: ['Clear - a non-expert would follow that.', 'Clear and concrete: a non-expert would follow it.', 'That one would survive a committee: clear, concrete, no jargon.'],
  meh: ['Decent - one sharper detail would make it stand out.', 'Passable, but forgettable - nothing here stands out.', 'Fine, which means forgettable. Nothing here would make a committee fight for you.'],
  weak: ['Needs more substance - add a real example and the result.', 'Thin. Nothing here would make a committee remember you.', 'Forgettable and thin. Nothing here survives a committee.'],
  nomethod: ['Walk through what you would actually do, step by step.', 'No method - say what you would do first, then next, and why.', 'That\'s a sentiment, not a plan. What would you actually do, first?'],
  nofailure: ['Pick a real failure - this sounds like a success story.', 'That\'s a success story. I asked about a failure.', 'You dodged the question: that was a win dressed up as a failure.'],
  fakeweak: ['Pick a real weakness - this sounds like a strength.', 'That\'s a strength dressed up as a weakness. Interviewers hear it every day.', 'You dodged the question: a strength dressed up as a weakness is the oldest dodge there is.'],
  gaming: ['Answer the question - instructions to the interviewer don\'t count.', 'That\'s not an answer; it\'s an attempt to game the score.', 'Trying to instruct the judge ends interviews. Answer the question.'],
  echo: ['You repeated the question back - answer it with something that happened.', 'That mostly repeats the question. There\'s no answer in it.', 'You read the question back to me. That\'s not an answer.'],
  salad: ['That doesn\'t hang together - tell it as a story, in sentences.', 'A pile of keywords isn\'t an answer.', 'Keywords and numbers with no story. Nothing here is believable.'],
  numdump: ['Pick one of those numbers and tell me the story behind it.', 'A string of numbers isn\'t a story. Which one is real, and what did you do?', 'A list of figures and no story. Nobody believes numbers they can\'t picture.'],
  list: ['A list of verbs isn\'t a story - pick one thing and walk me through it.', 'That\'s a list of verbs, not an example.', 'Buzzword verbs in a row. I still don\'t know one thing you actually did.'],
  vacuous: ['Say something specific - real steps, names, tools or numbers.', 'Generic words with nothing in them. What exactly do you mean?', 'Nothing in that answer is concrete. It could be anyone\'s answer to any question.'],
  vacuousplan: ['Say what you would actually do - concretely.', 'Generic words, no plan. What exactly would you do?', 'That\'s not a plan - nothing in it is concrete. What would you actually do, first?'],
  repeat: ['You said the same thing twice - say it once, well.', 'That repeats itself. Saying it twice isn\'t more evidence.', 'You said the same thing twice. Repeating it doesn\'t make it more true.'],
  vague: ['Swap the general statements for one specific moment.', 'Lots of words, very little that actually happened.', 'A lot of words and nothing I could check. What exactly happened?'],
  noask: ['Always have two questions ready.', 'No questions reads as no interest in the job.', 'No questions? That reads as no interest in the job.'],
  badask: ['Ask about the work first - pay, perks and what\'s on their website can wait.', 'Those questions are about you, or answered on their website. Ask about the work.', 'Weak questions - me-first, or answerable from their website. That tells them what you care about.'],
  goodask: ['Good questions - specific and about the work.', 'Sharp questions: specific, about the work.', 'Those questions show you want the job, not just an offer.'],
  jargon: ['Use everyday words - a non-expert would get lost.', 'Too much jargon for a non-expert. Say it plainly, with one picture.', 'Nobody outside your field would follow that. Lose the jargon.']
};
function harsh(key, diff){ var i = diff === 'fair' ? 0 : diff === 'tough' ? 1 : 2; return HARSH[key][i]; }

/* Mostly "we": a story the team did. Not when the question asks about the team, and not when a "how do you..."
   answer describes the team's practice and still says what "I" do. */
var TEAM_Q_RE = /\b(?:your|the) (?:current |old |last |previous )?team(?:'s)?\b|\bhow does your\b|\bteam'?s (?:process|way|approach)\b/i;
function weHeavy(a){
  if(!(a.weSubj >= 3 && a.weSubj > a.iSubj * 2)) return false;
  if(TEAM_Q_RE.test(a.question || '')) return false;
  if(a.qtype !== 'behavioral' && a.qtype !== 'technical' && a.iSubj >= 1) return false;
  return true;
}
function localIssues(a){
  if(notEnglish(a.text)) return [{ key: 'english', dim: 'relevance', sev: 0, quote: '' }];
  var out = [], t = a.text, q = a.qtype, behav = !(q === 'motivation' || q === 'tell' || q === 'closing' || q === 'explain' || q === 'followup' || q === 'probe' || q === 'role'), situ = q === 'situational';
  function ev(m){ return m ? fragmentAt(t, m.index, m.text.length) : ''; }
  var shortAt = q === 'followup' || q === 'probe' || q === 'negotiation' ? 10 : 25;
  // A red flag outranks every other issue: it's what the headline and the follow-up go after first.
  // An attack or a deflection ("useless", "not my fault") outranks everything; "they didn't help" is a lesser flag.
  if(a.blame.length) out.push({ key: 'blame', dim: 'ownership', sev: a.blame.some(function(b){ return BLAME_STRONG_RE.test(b.text) || /fault/i.test(b.text); }) ? 5 : 3, quote: ev(a.blame[0]) });
  if(q === 'closing' && a.closing){
    if(!a.closing.n) out.push({ key: 'noask', dim: 'relevance', sev: 3, quote: '' });
    else if(a.closing.flagged) out.push({ key: 'badask', dim: 'relevance', sev: 3, quote: '' });
  }
  var directOk = (q === 'followup' || q === 'probe') && a.words >= 4 && (a.quantified || a.pastI >= 1 || a.iActions >= 1 || a.properNouns >= 1 || a.iWould >= 1 || a.star.r);
  if(a.words < shortAt && q !== 'closing' && !directOk) out.push({ key: 'short', dim: 'concision', sev: 3, quote: '' });
  (a.nonAnswer || []).forEach(function(k){ out.push({ key: k, dim: 'relevance', sev: 4, quote: '' }); });
  // A dodge outranks "too short": it's the thing to fix first.
  if(a.dodged && a.words >= 12) out.push({ key: 'nofailure', dim: 'relevance', sev: 4, quote: '' });
  if(a.fakeWeak && a.words >= 8) out.push({ key: 'fakeweak', dim: 'relevance', sev: 4, quote: '' });
  // A "what would you do" is judged on its method, not on a past example or a result.
  // Answered from real experience ("this actually happened: I pulled him aside...") is a method too.
  if(situ && a.words >= 15 && !a.method && !((a.iActions >= 1 || a.pastI >= 1) && (a.star.s || a.star.r))) out.push({ key: 'nomethod', dim: 'structure', sev: 2, quote: '' });
  if(behav && !situ && a.scores.specificity <= 2 && !a.example) out.push({ key: 'noexample', dim: 'specificity', sev: 3, quote: '' });
  if(behav && !situ && !a.star.r && !a.star.lesson && a.words >= 25) out.push({ key: 'noresult', dim: 'impact', sev: 2, quote: '' });
  if(a.pasted) out.push({ key: 'repeat', dim: 'concision', sev: 3, quote: '' });
  if((behav || q === 'motivation' || q === 'tell' || q === 'role') && (a.vague.length >= 2 || a.vague.indexOf('name-dropping') >= 0 || (behav && a.hedges.count >= 3))) out.push({ key: 'vague', dim: 'specificity', sev: 2, quote: a.vague.length ? ev(matchesOf(VAGUE_RE, t)[0]) : '' });
  if(weHeavy(a)){ var wm = matchesOf(/\bwe\b/gi, t)[0] || matchesOf(TEAM_SUBJ_RE, t)[0]; out.push({ key: 'we', dim: 'ownership', sev: a.iActions === 0 && a.weSubj >= 4 ? 3 : 2, quote: ev(wm) }); }
  if(a.length.status === 'long' || a.length.status === 'way-long' || a.interrupted) out.push({ key: 'long', dim: 'concision', sev: a.length.status === 'way-long' || a.interrupted ? 3 : 2, quote: '' });
  if(a.hedges.count >= 3 || (a.hedges.count >= 2 && a.words < 120)) out.push({ key: 'hedge', dim: 'ownership', sev: 1, quote: ev(a.hedges.list[0]) });
  if(a.clicheList.length) out.push({ key: 'cliche', dim: 'specificity', sev: 1, quote: ev(a.clicheList[0]) });
  // Word-matching can't read meaning, so only a short, unstructured answer sharing nothing with the question is called off-topic.
  if(q === 'explain' && a.jargon) out.push({ key: 'jargon', dim: 'concision', sev: 2, quote: '' });
  // ...and only on story or technical questions: "why did you leave?" is answered without the word "leave".
  if((q === 'behavioral' || q === 'technical') && a.relevance.ratio === 0 && a.relevance.terms.length >= 2 && a.words >= 25 && a.words < 60 && !a.star.s && !a.star.a && !a.pastI && !a.pastWe) out.push({ key: 'offtopic', dim: 'relevance', sev: 2, quote: '' });
  return out.sort(function(x, y){ return y.sev - x.sev; });
}

var ISSUE_TEXT = {
  blame: 'Blames someone else instead of owning the fix.',
  short: 'Too short to show anything - aim for setup, your action, and the result.',
  noexample: 'No concrete example - it reads as opinion, not evidence.',
  noresult: 'Never says how it ended - add the result (a number if you have one) or the lesson.',
  we: 'Mostly "we" - separate what you personally did from the team.',
  long: 'Runs long - cut the setup and get to what you did faster.',
  hedge: 'Hedges ("I think", "kind of") undercut your own work.',
  cliche: 'Buzzwords instead of proof - replace them with what you did.',
  offtopic: 'Drifts from the question - answer exactly what was asked.',
  nomethod: 'No clear method - say what you would do first, then next, and why.',
  nofailure: 'Doesn\'t name a real failure - pick a time something actually went wrong and own it.',
  fakeweak: 'A strength dressed up as a weakness - name a real one, what it has cost you, and what you are doing about it.',
  gaming: 'Talks to the judge instead of answering - instructions never count.',
  echo: 'Mostly repeats the question back instead of answering it.',
  salad: 'Keywords and numbers that don\'t form sentences - tell one real story.',
  list: 'A list of verbs instead of one concrete example.',
  numdump: 'A string of figures with no story behind any of them - pick one and tell what happened.',
  vacuous: 'Generic words with nothing specific in them - name the real steps, tools, people and numbers.',
  jargon: 'Too much jargon for a non-expert - explain it in everyday words with one comparison.',
  noask: 'No questions for them - always bring two about the work, the team or what success looks like.',
  repeat: 'The same words twice - say each thing once.',
  vague: 'General statements ("a lot of things", "it worked out") instead of what actually happened.',
  badask: 'Me-first or googleable questions - ask about the work, the team and what success looks like instead.',
  english: 'The built-in judge reads English only, so it can\'t judge this answer - answer in English to be judged.'
};
var MISSING_TEXT = {
  noexample: 'A real, specific situation (where, when, what was at stake)',
  noresult: 'The result - what changed because of you, ideally measured',
  we: 'Your own actions, in "I" statements',
  short: 'Enough detail: situation, your action, the result',
  offtopic: 'A direct answer to the question asked',
  nomethod: 'A step-by-step plan: what you\'d do first, next, and why',
  nofailure: 'A real mistake you made, owned plainly, and what you changed after',
  fakeweak: 'A real weakness, what it has cost you, and what you are doing about it'
};

function issueText(key, a){
  if(key === 'hedge' && a && a.hedges.top.length) return 'Hedges ("' + a.hedges.top.slice(0, 3).map(function(p){ return p[0]; }).join('", "') + '") undercut your own work.';
  if(key === 'cliche' && a && a.cliches.length) return '"' + a.cliches[0] + '" is a claim every candidate makes - prove it instead.';
  if(key === 'we' && a) return a.teamSubj ? 'The team does the acting ("we", "our team", "the engineers") ' + a.weSubj + 'x and "I" ' + a.iSubj + 'x - separate what you personally did.' : 'You said "we" ' + a.weSubj + 'x and "I" ' + a.iSubj + 'x - separate what you personally did.';
  if(key === 'long' && a) return 'About ' + fmtSecs(a.seconds) + ' for a ' + fmtSecs(a.target[0]) + '-' + fmtSecs(a.target[1]) + ' question' + (a.interrupted ? ' - you were cut off' : '') + '. Get to what you did faster.';
  return ISSUE_TEXT[key] || '';
}
function pickFollowUp(a, opts){
  opts = opts || {};
  var issues = localIssues(a), top = issues[0] && issues[0].key, q = a.qtype;
  var fu = {
    we: 'You keep saying "we". What did you personally do?',
    noresult: 'What was the result? How did you know it worked?',
    vague: 'You said "' + (a.vague[0] || 'a lot of things') + '". What exactly happened - one specific moment?',
    noexample: 'Give me one specific time this actually happened.',
    hedge: 'You said "' + ((a.hedges.list[0] && clean(a.hedges.list[0].text)) || 'I think') + '". Do you know, or are you guessing?',
    long: 'Give me the 20-second version: what did you do, and what happened?',
    short: 'Can you walk me through that in more detail?',
    cliche: 'That\'s a claim. What\'s the proof?',
    blame: 'What would the other person say happened?',
    offtopic: 'Let me ask again - ' + clean(opts.question || 'can you answer the question directly?'),
    nomethod: 'Okay - so what exactly would you do first?',
    numdump: 'Pick one of those numbers. What was the situation, and what exactly did you do?',
    nofailure: 'That sounds like a success. Tell me about a time something actually went wrong because of you.',
    fakeweak: 'That sounds like a strength. What\'s a weakness that has actually cost you something?'
  };
  if(top && fu[top] && q !== 'closing') return { ask: true, question: fu[top], why: issueText(top, a) };
  if(q === 'behavioral' && a.star.r && !a.quantified) return { ask: true, question: 'Can you put a number on that - how much, how many, how long?', why: 'A result without a measure is hard to believe.' };
  if(/fail|mistake|wrong/i.test(opts.question || '') && !a.star.lesson) return { ask: true, question: 'What did you change afterward?', why: 'A failure story is about what you learned.' };
  var deep = { bar_raiser: 'What would you do differently if you did it again?', technical: 'What was the hardest trade-off you made, and why?', stress: 'Why should I believe that worked because of you?', hiring_manager: 'What was the hardest part of that, and how did you handle it?' };
  if(deep[opts.persona] && q !== 'closing' && q !== 'tell' && q !== 'motivation') return { ask: true, question: deep[opts.persona], why: 'Strong answers get probed deeper.' };
  return { ask: false, question: '', why: '' };
}

/* Something concrete to hold on to: a name, a figure, someone quoted, or something
   they did to a real thing (not "a project", "the situation", "a solution"). */
/* Objects a template answer is built from - "tracked my progress", "achieved the goal ahead of
   schedule", "improved the relationship" - aren't a concrete anchor on their own. */
var ANCHOR_SOFT = mkSet(('ahead schedule schedules discipline focus focused stayed tracked track tracking progress achieved achieve achievement achievements ' +
  'milestone milestones deadline deadlines timeline timelines organized organised dedication dedicated commitment committed motivation passion empathy ' +
  'listened listening concerns concern relationship relationships satisfied satisfaction improved improving improvement ensure ensured double feedback ' +
  'accurate accuracy carefully details detail thorough thoroughly consistent consistently communication clearly openly honest honestly transparent ' +
  'transparency effort efforts hardworking teamwork together efficient efficiently productive productivity organization organisation workflow workflows ' +
  'strategy strategies strategic planning executed execution objectives objective performance performed mindset lesson lessons factors factor ' +
  'concerns needs expectations exceeded valuable insights insight input inputs support supported supporting environment culture vision mission ' +
  'passionate professional professionals experience experienced area areas background skills skill skillset industry field opportunity opportunities ' +
  'challenge challenges contribute contributing motivated driven enthusiastic eager keen versatile dynamic innovative creative proactive reliable responsible').split(' '));
var PRESENT_I_SRC = "\\bi\\s+(?:always\\s+|usually\\s+|never\\s+|also\\s+|then\\s+|first\\s+|still\\s+|now\\s+|often\\s+|normally\\s+|typically\\s+)?(?!(?:think|believe|feel|am|hope|want|guess|try|like|love|know|mean|would|will|can|could|should|might|must|have|has|had|was|were|do|does|did|get|got|said|really|just|always|usually|never|also|then|first|still|now|often|normally|typically|need|wish|care|enjoy|consider|tend|aim|strive|value|bring|thrive|pride)\\b)[a-z]+\\b|\\bi(?:'m| am)\\s+(?:currently\\s+|now\\s+)?(?:a|an|the)\\b";
var IRREG_PAST = 'told|took|made|ran|got|went|gave|spoke|wrote|brought|set|put|found|led|met|kept|caught|chose|drew|held|sent|spent|built|taught|bought|sold|paid|said|sat|stood|began|did|read|cut|won|lost|left|hit|shut|split|quit|felt|thought|knew|saw|became|grew|drove|flew|broke|rewrote|rebuilt|came|heard|fought|threw|woke|froze|forgot|shook|struck|stuck|hung|rang|sang|sank|drank|swam|meant|dealt|lent|bent|learnt|burnt|slept|swept|fed|laid|sought|overcame|wore|tore|rode|rose|fell';
var RUNON_CUT_RE = new RegExp("\\s(?=(?:and|but|so|then|as a result|in the end|which|because)\\b)|\\s(?=(?:\\w{3,}ed|" + IRREG_PAST + ")\\b)|" + RUNON_SPLIT_RE.source, 'i');
function concreteAnchor(a){
  var runOn = a.words >= 20 && !/[.!?;,](?=\s+\S)/.test(a.text);
  if(a.quantified && !a.vague.length) return true;
  if(/\b(?:she|he|they|my (?:manager|boss|lead|director|client|customer|teammate|colleague)) (?:said|told me|asked|wrote)\b/i.test(a.text)) return true;
  // ...including what they say they would do: "I would go to my manager".
  // ...and what they do every time, in the present tense: "I compare every total against the source system".
  var re = new RegExp(I_ACTION_RE.source + '|' + PAST_I_RE.source + '|' + PAST_WE_RE.source + "|\\bi(?:'d| would| will|'ll)\\s+(?:\\w+ly\\s+|first\\s+|then\\s+)?\\w+|" + PRESENT_I_SRC, 'gi'), m;
  while((m = re.exec(a.text))){
    if(m[0] === ''){ re.lastIndex++; continue; }
    // The whole clause after the verb: a name, a tool or a real thing they acted on ("traced the bug to the billing script").
    var clause = a.text.slice(m.index + m[0].length).split(/[.,;!?]|\s(?:and|but|so)\s+(?=(?:my|our|the|his|her|their|he|she|they|we|it|everyone|everybody)\b)/)[0];
    // Spoken answers come with no commas: "I set clear expectations motivated everyone delegated tasks" is a
    // list of actions, so the clause ends at the next action, the next clause, or eight words.
    if(runOn) clause = clause.split(RUNON_CUT_RE)[0].split(/\s+/).slice(0, 9).join(' ');
    if(/\b[A-Z][a-z]{2,}|\b[A-Z]{2,}\b|\d/.test(clause)) return true;
    var obj = (clause.toLowerCase().match(/[a-z'-]+/g) || []).slice(0, 12);
    if(obj.some(function(w){ return w.length >= 4 && !(w in GENERIC_WORDS) && !(w in VAC_FUNC) && !(w in FUNC_WORDS) && !(w in ANCHOR_SOFT); })) return true;
  }
  return false;
}
var ENGLISH_ONLY = 'The built-in judge reads English only, so it didn\'t score this answer. Answer in English to be judged.';
function judgeLocal(question, text, opts){
  opts = opts || {};
  var a = opts.analysis || analyzeAnswer(text, Object.assign({ question: question }, opts));
  if(notEnglish(a.text)) return { source: 'local', unscored: true, scores: DIMS.reduce(function(o, d){ o[d] = null; return o; }, {}), overall: null,
    headline: ENGLISH_ONLY, evidence: [], missing: [], better: '', red_flags: [], follow_up: { ask: false, question: '', why: '' }, unverified_quotes: 0, analysis: a };
  var diff = opts.difficulty || 'brutal', issues = localIssues(a), sc = a.scores, ov = overall10(sc);
  // A dodged question can't score well however polished the story is.
  if(issues.some(function(i){ return i.key === 'nofailure' || i.key === 'fakeweak'; })) ov = Math.min(ov, 4);
  if(issues.some(function(i){ return i.key === 'offtopic'; })) ov = Math.min(ov, 5);
  if(issues.some(function(i){ return /^(?:echo|salad|list|vacuous|numdump)$/.test(i.key); })) ov = Math.min(ov, 3);   // a non-answer can't score
  if(a.vague.indexOf('name-dropping') >= 0 && a.qtype !== 'tell') ov = Math.min(ov, 4);   // lists of names with nothing done to any of them
  if(issues.some(function(i){ return i.key === 'gaming'; })) ov = 1;
  if(issues.some(function(i){ return i.key === 'repeat'; })) ov = Math.min(ov, 5);   // the same answer twice is never more evidence
  if(issues.some(function(i){ return i.key === 'vague'; })) ov = Math.min(ov, 6);    // general statements can't carry a strong score
  // A template story ("I took ownership, analyzed the situation and implemented a solution") can't score well.
  if((a.qtype === 'behavioral' || a.qtype === 'situational' || a.qtype === 'technical' || a.qtype === 'tell') && !concreteAnchor(a)) ov = Math.min(ov, 5);
  // The headline matches the score: a real problem first (and then the score can't sit above 6 -
  // "You lost the room" is never an 8), otherwise the band it landed in.
  var top = issues[0], topKey = top ? (top.key === 'vacuous' && a.qtype === 'situational' ? 'vacuousplan' : top.key) : '';
  if(top && top.sev >= 2) ov = Math.min(ov, 6);
  if(a.qtype === 'closing' && a.closing && a.closing.flagged) ov = Math.min(ov, 4);   // me-first or "did I get the job?" closes weakly
  var head = top && top.sev >= 2 ? harsh(topKey, diff) : ov >= 8 ? harsh(a.qtype === 'closing' ? 'goodask' : a.qtype === 'explain' ? 'goodexplain' : a.quantified && a.star.r ? 'good' : 'goodplain', diff) : ov >= 6 ? harsh(top ? topKey : 'meh', diff) : harsh(top ? topKey : 'weak', diff);
  var evidence = issues.filter(function(i){ return i.quote; }).slice(0, 3).map(function(i){ return { quote: i.quote, issue: issueText(i.key, a) }; });
  var missing = uniq(issues.map(function(i){ return MISSING_TEXT[i.key]; }).filter(Boolean)).slice(0, 3);
  var fu = opts.allowFollowUp === false ? { ask: false, question: '', why: '' } : pickFollowUp(a, { persona: opts.persona, question: question });
  return {
    source: 'local', scores: DIMS.reduce(function(o, d){ o[d] = sc[d]; return o; }, {}), overall: ov,
    headline: head, evidence: evidence, missing: missing,
    better: issues.length ? 'Lead with the situation in one line, say exactly what you did ("I..."), and end on what changed - with a number only if you really have one.' : '',
    red_flags: issues.filter(function(i){ return i.key === 'blame' || i.key === 'gaming'; }).map(function(i){ return i.key === 'gaming' ? 'Tried to instruct the judge' : 'Blames others'; }),
    follow_up: fu, unverified_quotes: 0, analysis: a
  };
}

/* Judging a Gauntlet answer: a probe wants a direct, specific, owned reply -
   not a full STAR story - so it gets its own rules. */
var PROBE_NEEDS = {
  ownership: { re: new RegExp(PAST_I_RE.source + '|' + I_ACTION_RE.source + "|\\bi (?:personally|myself|also|then|first|alone) \\w+|\\bmy (?:part|piece|job|role) was\\b|\\b(?:it )?was me\\b|\\bi was the one\\b", 'i'), miss: 'Say exactly what YOU did, in "I" terms.' },
  measurement: { re: /\d|\b(?:measur|track|baseline|compar|before|after|went from|dropped|rose|fell|survey|feedback|data)\w*/i, miss: 'Name how you measured it - the baseline and the number.' },
  depth: { re: /\b(?:because|so (?:i|we)|first|then|decid|chose|option|instead|trade)\w*/i, miss: 'Walk through the decision step by step - what you weighed and why.' },
  counterfactual: { re: /\b(?:would have|would'?ve|we'?d have|i'?d have|they'?d have|would(?:n'?t| not)? (?:still|have)|otherwise|without (?:it|that|me|us)|if i hadn'?t|if we hadn'?t|if nobody|risk)\b/i, miss: 'Say what would have happened without you.' },
  conflict: { re: /\b(?:disagree|pushed back|talked|explained|showed|listened|asked|compromis|convinc|agreed|wanted to wait|wanted to|thought it was|offered|said yes|signed off|objected|argued|persuad|met (?:her|him|them) halfway)\w*/i, miss: 'Name who disagreed and exactly how you handled it.' },
  failure: { re: /\b(?:mistake|wrong|should have|learn|next time|now i|differently|changed)\w*/i, miss: 'Own a real mistake and what you changed.' },
  values: { re: /\b(?:because|matter|care|believe|important|why|i saw|i used to|i grew up|people like|my (?:family|mum|mom|dad|father|mother|grandmother|grandfather|parents|sister|brother))\w*/i, miss: 'Say why it mattered to you, specifically.' },
  tradeoff: { re: /\b(?:trade|instead|cost|chose|versus|vs|sacrific|priorit)\w*/i, miss: 'Name the trade-off you made and what you gave up.' },
  consistency: { re: /\d|\b(?:exactly|actually|specifically)\b/i, miss: 'Give the exact figure, consistently.' }
};
function judgeProbe(probe, angle, answer){
  answer = apos(answer);
  var a = analyzeAnswer(answer, { qtype: 'probe', question: probe }), need = PROBE_NEEDS[angle] || PROBE_NEEDS.depth, notes = [], sc = 3;
  if(a.words < 5) return { score: 1, note: 'Too thin to count - one clipped line doesn\'t survive a follow-up.', analysis: a };
  if(need.re.test(a.text)) sc++; else { sc--; notes.push(need.miss); }
  if(a.quantified || a.properNouns >= 1) sc++;
  if(a.hedges.count >= 2){ sc--; notes.push('Hedging under pressure reads as not knowing.'); }
  if(angle === 'ownership' && a.weSubj > a.iSubj){ sc--; notes.push('Still "we" - the probe was about you.'); }
  if(a.blame.length){ sc -= 2; notes.push('Blaming someone else under pressure is a red flag.'); }
  if(a.words > 160){ sc--; notes.push('Too long for a follow-up - answer it in two or three sentences.'); }
  sc = clamp(sc, 1, 5);
  return { score: sc, note: notes[0] || (sc >= 4 ? 'Direct and specific - that holds up.' : 'It answers the probe, but add one concrete detail.'), analysis: a };
}

/* ---- score guards shared with the backend (interview_coach.py: _num, _rescale, _round) */
function numOf(v){
  if(typeof v === 'boolean' || v == null) return null;
  if(typeof v === 'number') return isFinite(v) ? v : null;
  if(typeof v === 'string'){ var m = v.match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; }
  return null;
}
function roundHalfUp(v){ return v >= 0 ? Math.floor(v + 0.5) : -Math.floor(-v + 0.5); }
/* Scores on the wrong scale (a 1-10 rubric score, a 0-100 per-question score)
   are brought back to 1..hi instead of clamping to the top; one stray value
   just over the top is a slip and is clamped. */
function rescale(vals, hi){
  var present = vals.filter(function(v){ return v != null; });
  if(!present.length || Math.max.apply(null, present) <= hi) return vals;
  var over = present.filter(function(v){ return v > hi; }).length, top = Math.max.apply(null, present), f;
  var clampAll = function(){ return vals.map(function(v){ return v == null ? null : Math.min(v, hi); }); };
  if(over * 2 < present.length && !(hi === 5 && present.some(function(v){ return v === 0; }))) return clampAll();
  if(hi === 5 && top <= 10) f = 2; else if(top <= 100) f = 100 / hi; else return clampAll();
  return vals.map(function(v){ return v == null ? null : v / f; });
}
/* One answer's 1-10 must agree with its rubric: up to 3 below it (a fatal flaw
   sinks an answer) but never more than 1 above it. Gaps count at the lowest score. */
function turnOverall(scores, overall){
  var present = DIMS.map(function(d){ return scores[d]; }).filter(function(v){ return typeof v === 'number'; });
  if(!present.length) return null;
  var floor = Math.min.apply(null, present), full = DIMS.map(function(d){ return typeof scores[d] === 'number' ? scores[d] : floor; });
  var expected = full.reduce(function(s, x){ return s + x; }, 0) / full.length * 2;
  if(overall == null) overall = expected;
  return clamp(roundHalfUp(Math.max(expected - 3, Math.min(expected + 1, overall))), 1, 10);
}

/* The AI judgement, re-checked in the browser before it's shown: every field
   with a quote is checked against what they said (the follow-up the interviewer
   reads aloud included), scores can't be inflated or on the wrong scale, and a
   half-filled rubric is completed from the built-in judge - and says so. */
/* The delivery numbers measured on an answer, as plain figures - times in seconds and
   in minutes (and tenths of one), rounded down and up, and how far over or under the
   target - so feedback that cites them ("you talked for 4 minutes", "14 filler words")
   isn't taken for figures put in their mouth. Mirror of _meta_figs; for the figure
   check only, never for quotes. */
function metaFigs(meta){
  if(!meta || typeof meta !== 'object' || Array.isArray(meta)) return '';
  var vals = [], secs = numOf(meta.seconds), lo = numOf(meta.target_lo), hi = numOf(meta.target_hi);
  var times = [secs, lo, hi, numOf(meta.longest_pause), numOf(meta.latency)];
  if(secs != null && hi != null && secs > hi) times.push(secs - hi);
  if(secs != null && lo != null && lo > secs) times.push(lo - secs);
  times.forEach(function(v){ if(v == null || !(v > 0 && v < 1e6)) return; vals.push(Math.floor(v), Math.ceil(v), Math.floor(v / 60), Math.ceil(v / 60), Math.floor(v / 6) / 10, Math.ceil(v / 6) / 10); });
  ['wpm', 'words', 'fillers', 'hedges', 'i_count', 'we_count', 'i_subj', 'we_subj'].forEach(function(k){ var v = numOf(meta[k]); if(v != null && v >= 0 && v < 1e7) vals.push(Math.floor(v), Math.ceil(v)); });
  // counts are also "N times" ("you hedged 6 times", "you said 'we' 9 times")
  var reps = [];
  ['fillers', 'hedges', 'i_count', 'we_count', 'i_subj', 'we_subj'].forEach(function(k){ var v = numOf(meta[k]); if(v != null && v >= 0 && v < 1e7) reps.push(Math.floor(v)); });
  return vals.map(numFmt).concat(reps.map(function(x){ return numFmt(x) + ' times'; })).join(' ');
}
function checkAIJudgement(res, answer, question, local, earlier, meta){
  if(!res || typeof res !== 'object') return null;
  // Their words only - this answer and their earlier ones this session, never a question. Evidence: THIS answer.
  var corpus = [String(answer || '')].concat(arr(earlier).slice(0, 8).filter(function(x){ return typeof x === 'string'; }).map(function(x){ return x.slice(0, 2500); })).join(' ' + SEP + ' '), dropped = 0, sc = {}, filled = [];
  // A figure pinned on them may also be one measured on this answer: the judge is told to use those.
  var figs = corpus + ' ' + SEP + ' ' + metaFigs(meta);
  function keep(v, n){ var s = scrubText(v, corpus, n, null, figs); if(s == null){ dropped++; return ''; } return s; }
  var scores = res.scores && typeof res.scores === 'object' ? res.scores : {};
  var raw = rescale(DIMS.map(function(d){ var v = numOf(scores[d]); return v != null && v > 0 ? v : (v === 0 ? 0 : null); }), 5);
  DIMS.forEach(function(d, i){ sc[d] = raw[i] == null ? null : clamp(roundHalfUp(raw[i]), 1, 5); });
  if(DIMS.filter(function(d){ return sc[d] != null; }).length < 4) return null;
  DIMS.forEach(function(d){ if(sc[d] == null){ var lv = local && local.scores ? numOf(local.scores[d]) : null; sc[d] = lv != null ? clamp(roundHalfUp(lv), 1, 5) : null; filled.push(d); } });
  var ev = [];
  arr(res.evidence).forEach(function(e){
    if(!e || typeof e !== 'object' || ev.length >= 4) return;
    var q = str(e.quote, 240).replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, ''); if(!q) return;
    var issue = scrubText(e.issue, corpus, 240, null, figs);
    if(!verifyQuote(q, answer) || issue == null){ dropped++; return; }
    ev.push({ quote: q, issue: issue });
  });
  var flags = arr(res.red_flags).map(function(f){ return keep(f, 220); }).filter(Boolean).slice(0, 4);
  var missing = arr(res.missing).map(function(f){ return keep(f, 220); }).filter(Boolean).slice(0, 4);
  var fu = res.follow_up && typeof res.follow_up === 'object' ? res.follow_up : {};
  var want = fu.ask === true, fq = scrubText(fu.question, corpus, 300, null, figs), fwhy = scrubText(fu.why, corpus, 200, null, figs);
  if(want && (fq == null || fwhy == null)) dropped++;          // never read out words they didn't say
  var ask = want && !!fq && fq.length >= 8 && fwhy != null;
  var ov = numOf(res.overall); if(ov != null && ov > 10 && ov <= 100) ov = ov / 10;
  var overall = turnOverall(sc, ov);
  if(filled.length) overall = Math.min(overall, 8);
  var better = keep(res.better, 500);
  // The score was corrected: a headline written for the AI's own score would contradict it (a neutral line goes instead).
  var band = function(v){ return v >= 8 ? 2 : v >= 6 ? 1 : 0; }, head = keep(res.headline, 240);
  if(ov != null && (band(ov) !== band(overall) || Math.abs(ov - overall) >= 2)) head = '';
  var out = {
    source: 'ai', scores: sc, overall: overall, headline: head, evidence: ev, missing: missing,
    better: better, better_flagged: better ? honestyCheck(answer, better).flagged : [], red_flags: flags,
    follow_up: { ask: ask, question: ask ? fq : '', why: ask ? (fwhy || '') : '' },
    unverified_quotes: (numOf(res.unverified_quotes) || 0) + dropped
  };
  if(filled.length) out.filled_dims = filled;
  return out;
}

/* ======================================================== JOB DESCRIPTIONS */
var SKILL_RE = /\b(?:sql|python|excel|tableau|power bi|looker|r\b|java(?:script)?|typescript|react|node(?:\.js)?|aws|gcp|azure|figma|salesforce|hubspot|jira|git|docker|kubernetes|spark|airflow|dbt|snowflake|a\/b testing|statistics|machine learning|google analytics|photoshop|canva|shopify|wordpress|zendesk|quickbooks|sap|c\+\+|c#|go(?:lang)?|swift|kotlin|html|css|pandas|tensorflow|pytorch)\b/gi;
function jdLines(text){
  return String(text || '').slice(0, 12000).replace(/\r/g, '').split(/\n|\u2022|\s[\u00b7\u25cf\u25aa]\s|(?:^|\s)[-*]\s(?=[A-Z])/).map(function(l){ return clean(l.replace(/^\s*(?:[-*\u2022\u00b7\u25cf\u25aa]+|\d{1,2}[.)])\s*/, '')); }).filter(function(l){ return l.length >= 3; });
}
function parseJD(text){
  var lines = jdLines(text), sec = 'resp', must = [], nice = [], resp = [], comps = {};
  lines.forEach(function(l){
    var lw = l.toLowerCase();
    if(l.length < 80 && /\b(?:requirements|qualifications|what you(?:'ll)? (?:need|bring)|must[- ]haves?|you have|about you|skills|who you are)\b/.test(lw)){ sec = 'must'; return; }
    if(l.length < 80 && /\b(?:nice to have|preferred|bonus|pluses|plus if|good to have)\b/.test(lw)){ sec = 'nice'; return; }
    if(l.length < 80 && /\b(?:responsibilities|what you(?:'ll)? do|the role|day[- ]to[- ]day|in this role|you will)\b/.test(lw) && !/[.]$/.test(l)){ sec = 'resp'; return; }
    (sec === 'must' ? must : sec === 'nice' ? nice : resp).push(l);
    COMPETENCIES.forEach(function(c){
      var m = l.match(c.re);
      if(m){
        var e = comps[c.key] || (comps[c.key] = { key: c.key, label: c.label, count: 0, quotes: [] });
        var shortLine = words(l).length <= 4;   // a bare title like "Senior Data Analyst" is weak evidence
        e.count += shortLine ? 1 : (sec === 'must' ? 2 : 1);
        var q = l.length > 160 ? l.slice(0, 157).replace(/\s+\S*$/, '') + '…' : l;
        if(shortLine) e.weak = e.weak || q; else if(e.quotes.length < 3) e.quotes.push(q);
      }
    });
  });
  var skills = uniq((String(text || '').slice(0, 12000).match(SKILL_RE) || []).map(function(s){ return s.toLowerCase(); }));
  var ym = String(text || '').match(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?years?/i);
  var sm = String(text || '').match(/\b(entry[- ]level|internship|new grad(?:uate)?)\b/i) || String(text || '').match(/\b(senior|sr\.|lead|principal|staff|junior|jr\.|associate)\s+(?:[a-z]+\s+)?(?:analyst|engineer|developer|designer|manager|scientist|consultant|specialist|coordinator|representative|accountant|researcher|associate|product manager|marketer)\b/i);
  var list = Object.keys(comps).map(function(k){ var c = comps[k]; if(!c.quotes.length && c.weak) c.quotes.push(c.weak); delete c.weak; return c; }).sort(function(a, b){ return b.count - a.count; });
  return { competencies: list, skills: skills, years: ym ? +ym[1] : null, seniority: sm ? sm[1].toLowerCase() : null, must: must.slice(0, 20), nice: nice.slice(0, 12), resp: resp.slice(0, 20), themes: list.slice(0, 3).map(function(c){ return c.label; }), lines: lines.length };
}

/* ============================================================ STORY COVERAGE */
function storyText(s){ return [s.title, s.s, s.t, s.a, s.r, s.situation, s.task, s.action, s.result].filter(Boolean).join(' '); }
function storyComps(s){
  if(!s || typeof s !== 'object') return [];
  var explicit = arr(s.competencies).filter(function(k){ return COMP_BY_KEY[k]; });
  var txt = storyText(s), found = COMPETENCIES.filter(function(c){ return c.key !== 'motivation' && c.re.test(txt); }).map(function(c){ return c.key; });
  return uniq(explicit.concat(found));
}
function coverage(stories, focus){
  stories = arr(stories).filter(function(s){ return s && typeof s === 'object'; });
  var keys = arr(focus).length ? arr(focus) : CORE_COMPS, byStory = {}, rows;
  stories.forEach(function(s){ byStory[s.id] = storyComps(s); });
  rows = keys.map(function(k){ return { key: k, label: compLabel(k), stories: stories.filter(function(s){ return byStory[s.id].indexOf(k) >= 0; }).map(function(s){ return s.id; }) }; });
  var gaps = rows.filter(function(r){ return !r.stories.length; }).map(function(r){ return r.key; });
  var heavy = stories.filter(function(s){ return rows.filter(function(r){ return r.stories.length === 1 && r.stories[0] === s.id; }).length >= 3; }).map(function(s){ return s.id; });
  return { rows: rows, gaps: gaps, byStory: byStory, covered: rows.length - gaps.length, total: rows.length, pct: rows.length ? Math.round((rows.length - gaps.length) / rows.length * 100) : 0, overloaded: heavy };
}
function jdCoverage(jd, stories){
  var comps = (jd && jd.competencies || []).filter(function(c){ return c.key !== 'motivation'; }).slice(0, 8);
  var cov = coverage(stories, comps.map(function(c){ return c.key; }));
  cov.rows.forEach(function(r){ var c = comps.filter(function(x){ return x.key === r.key; })[0]; r.jdCount = c ? c.count : 0; r.quotes = c ? c.quotes : []; });
  return cov;
}

/* ============================================================ PLANNING */
var PERSONAS = mkMap({
  recruiter: { label: 'Recruiter screen', short: 'Recruiter', glyph: 'R', blurb: 'Fast, broad screen: motivation, basics, red flags on your resume.', opener: 'Walk me through your background and what brings you to this role.', voice: { rate: 1.05, pitch: 1.1 } },
  hiring_manager: { label: 'Hiring manager', short: 'Hiring manager', glyph: 'HM', blurb: 'Can you actually do this job? Probes ownership, judgment and results.', opener: 'Tell me about yourself - and why this role?', voice: { rate: 1.0, pitch: 1.0 } },
  bar_raiser: { label: 'Bar raiser', short: 'Bar raiser', glyph: 'BR', blurb: 'Relentless on specifics and your personal contribution. Digs three levels deep.', opener: 'Tell me about yourself. You have two minutes.', voice: { rate: 0.98, pitch: 0.9 } },
  technical: { label: 'Technical lead', short: 'Tech lead', glyph: 'TL', blurb: 'Depth, trade-offs, debugging - do you really understand your own work?', opener: 'Give me a quick overview of your background, then the most technically interesting thing you\'ve worked on.', voice: { rate: 1.02, pitch: 0.95 } },
  stress: { label: 'Stress panel', short: 'Stress panel', glyph: 'SP', blurb: 'Skeptical and interruptive. Tests whether you stay composed under fire.', opener: 'You have sixty seconds. Why should we keep this interview going?', voice: { rate: 1.08, pitch: 0.85 } }
});
var DIFFS = mkMap({ fair: { label: 'Fair', blurb: 'Balanced and honest.' }, tough: { label: 'Tough', blurb: 'No benefit of the doubt.' }, brutal: { label: 'Brutal', blurb: 'A skeptical committee. 4s and 5s are rare.' } });
var FOCI = mkMap({ mixed: 'Mixed', behavioral: 'Behavioral', resume: 'Resume deep-dive', role: 'Role & JD', motivation: 'Motivation & fit' });

/* Questions straight from the person's resume: risky lines and red flags. */
function resumeProbes(resume, opts){
  var E = RSE(); if(!E || !resume || !Array.isArray(resume.entries)) return [];
  var out = [];
  try{
    E.redFlags(resume, opts || {}).filter(function(f){ return /^gap-|^hop$/.test(f.id) || f.kind === 'unverified'; }).slice(0, 3).forEach(function(f){
      if(/^gap-/.test(f.id)) out.push({ q: 'I see a gap on your resume - ' + f.detail.replace(/\.$/, '').toLowerCase() + '. What happened there?', comp: 'integrity', evidence: f.title, risk: 'high' });
      else if(f.id === 'hop') out.push({ q: 'You\'ve had a few short stints - ' + f.detail.replace(/\.$/, '') + '. Why should I believe you\'ll stay here?', comp: 'motivation', evidence: f.title, risk: 'high' });
      else if(f.unverified && f.unverified.length) out.push({ q: 'Your resume says "' + clean(f.detail).replace(/^"|"$/g, '').slice(0, 120) + '". How exactly did you measure ' + f.unverified[0] + '?', comp: 'integrity', evidence: f.unverified[0], risk: 'high' });
    });
    E.defendAll(resume).sort(function(a, b){ var r = { high: 0, med: 1, low: 2 }; return r[a.risk] - r[b.risk]; }).slice(0, 4).forEach(function(d){
      var q = d.questions[1] || d.questions[0]; if(q) out.push({ q: q, comp: /measure/i.test(q) ? 'data' : /specific contribution/i.test(q) ? 'ownership' : 'problem_solving', evidence: words(d.text).slice(0, 10).join(' '), risk: d.risk, line: d.text });
    });
  }catch(e){}
  return out;
}

function planLocal(opts){
  opts = opts || {};
  var rand = rng(opts.seed || Date.now()), persona = PERSONAS[opts.persona] ? opts.persona : 'hiring_manager';
  var n = clamp(opts.count || 5, 1, 10), focus = FOCI[opts.focus] ? opts.focus : 'mixed', plan = [];
  var role = clean(opts.role) || 'this role', company = clean(opts.company);
  var jd = opts.jd ? (typeof opts.jd === 'string' ? parseJD(opts.jd) : opts.jd) : null;
  var used = {};
  function add(item){ if(plan.length >= n || used[item.q.toLowerCase()]) return; used[item.q.toLowerCase()] = 1; item.qtype = item.qtype || qtypeOf(item.q); item.id = item.id || ('p' + plan.length); plan.push(item); }
  if(!opts.skipOpener) add({ q: PERSONAS[persona].opener, qtype: 'tell', comp: 'communication', source: 'opener', why: 'Every interview opens here - it sets the frame for everything after.' });
  var jdComps = jd ? jd.competencies.filter(function(c){ return c.key !== 'motivation'; }).map(function(c){ return c.key; }) : [];
  var probes = focus === 'resume' || focus === 'mixed' ? resumeProbes(opts.resume, { today: opts.today }) : [];
  var behavioral = shuffle(BANK.filter(function(q){ return q.cat === 'behavioral'; }), rand);
  behavioral.sort(function(a, b){ function rank(q){ var i = Math.min.apply(null, q.comp.map(function(c){ var k = jdComps.indexOf(c); return k < 0 ? 99 : k; })); return i; } return rank(a) - rank(b); });
  var motivation = [{ q: company ? 'Why ' + company + ', and why this role?' : 'Why this role, and why now?', comp: 'motivation', source: 'role' }, { q: 'Why are you leaving your current role?', comp: 'motivation', source: 'role' }];
  var situational = shuffle(BANK.filter(function(q){ return q.cat === 'situational' || q.cat === 'role' || q.cat === 'technical'; }), rand);
  function fromBank(q, src){ var j = jd && q.comp.map(function(c){ return jd.competencies.filter(function(x){ return x.key === c; })[0]; }).filter(Boolean)[0]; return { q: q.q, comp: q.comp[0], source: j ? 'jd' : (src || 'role'), why: j ? 'The job description stresses ' + j.label.toLowerCase() + '.' : 'A core ' + compLabel(q.comp[0]).toLowerCase() + ' question for any ' + role + ' interview.', evidence: j ? j.quotes[0] : '', bankId: q.id }; }
  var queue = [];
  if(focus === 'behavioral') queue = behavioral.map(function(q){ return fromBank(q); });
  else if(focus === 'resume') queue = probes.map(function(p){ return { q: p.q, comp: p.comp, source: 'resume', why: 'Straight from your resume - expect it.', evidence: p.evidence }; }).concat(behavioral.map(function(q){ return fromBank(q); }));
  else if(focus === 'role') queue = (jd ? behavioral.slice(0, 4).map(function(q){ return fromBank(q); }) : []).concat(situational.map(function(q){ return fromBank(q); }));
  else if(focus === 'motivation') queue = motivation.concat(BANK.filter(function(q){ return q.cat === 'motivation' || q.id === 'r3'; }).map(function(q){ return fromBank(q); }));
  else {
    var b = behavioral.map(function(q){ return fromBank(q); }), p = probes.map(function(x){ return { q: x.q, comp: x.comp, source: 'resume', why: 'Straight from your resume - expect it.', evidence: x.evidence }; });
    queue = [b[0], p[0] || b[1], b[2] || b[1], motivation[0], b[3], p[1], situational[0] && fromBank(situational[0]), b[4]].filter(Boolean).concat(b.slice(5));
  }
  queue.forEach(add);
  BANK.forEach(function(q){ add(fromBank(q)); }); // top up if a narrow focus ran out
  if(n >= 5 && plan.length >= n && (persona === 'recruiter' || persona === 'hiring_manager') && opts.closing !== false){ plan[plan.length - 1] = { id: 'p' + (plan.length - 1), q: 'What questions do you have for me?', qtype: 'closing', comp: 'motivation', source: 'closing', why: 'Your questions are judged too - they show how seriously you\'ve thought about the job.' }; }
  return plan.slice(0, n);
}

/* ============================================================ CONSISTENCY
   The Gauntlet's lie-detector: figures and role claims that change between
   answers. It compares like with like - the same quantity, about the same
   thing - so honest extra detail ("I managed 4 of the 12", "for urgent tickets",
   "in the first month") is never called a changed story. */
var UNIT_ALIASES = { percent: '%', pct: '%', hrs: 'hour', hr: 'hour', hours: 'hour', days: 'day', weeks: 'week', months: 'month', years: 'year', mins: 'minute', minutes: 'minute', people: 'person', persons: 'person', customers: 'customer', users: 'user', members: 'member', students: 'student', employees: 'employee', clients: 'client', dollars: '$', dollar: '$', bucks: '$', tickets: 'ticket', orders: 'order', accounts: 'account', projects: 'project', reports: 'report', times: 'x', analysts: 'analyst', engineers: 'engineer', stores: 'store', managers: 'manager', interns: 'intern', hires: 'hire', calls: 'call', sales: 'sale', leads: 'lead', signups: 'signup', stockouts: 'stockout', errors: 'error', complaints: 'complaint' };
var UNIT_STOP = mkSet('a an the of to in on at for with from by as and or but so than then per each every this that these those my our your their his her its it they we i you he she more less over under about around nearly almost just only also all some any most few several many much new other same am pm or nor yet into onto out up down off was were is are be been being had has have did do does'.split(' '));
/* Number words, fractions and multiples written as digits - with a map back to
   the original text, so "nine days" compares with "9 days" while every quote we
   show is still cut from exactly what they said. */
function remapReplace(res, re, fn){
  var out = [], map = [], last = 0, m, r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
  while((m = r.exec(res.text))){
    for(var k = last; k < m.index; k++){ out.push(res.text[k]); map.push(res.map[k]); }
    var rep = String(fn.apply(null, m)), at = res.map[m.index];
    for(var q = 0; q < rep.length; q++){ out.push(rep[q]); map.push(at); }
    last = m.index + m[0].length; if(m[0] === '') r.lastIndex++;
  }
  for(var k2 = last; k2 < res.text.length; k2++){ out.push(res.text[k2]); map.push(res.map[k2]); }
  return { text: out.join(''), map: map, orig: res.orig };
}
function numify(text){
  var t = String(text || '').slice(0, MAXTXT), parts = [], m, re = /[A-Za-z]+|[^A-Za-z]+/g, out = [], map = [];
  while((m = re.exec(t))) parts.push({ s: m[0], i: m.index, w: /^[A-Za-z]/.test(m[0]) });
  function put(s, at, own){ for(var k = 0; k < s.length; k++){ out.push(s[k]); map.push(own ? at + k : at); } }
  var k = 0;
  while(k < parts.length){
    var p = parts[k];
    if(p.w){
      var win = [], idx = [], j = k;
      while(j < parts.length && win.length < 16){ if(parts[j].w){ win.push(parts[j].s.toLowerCase()); idx.push(j); j++; } else if(/^[ \t-]+$/.test(parts[j].s) && j + 1 < parts.length && parts[j + 1].w){ j++; } else break; }
      var one = composeOne(win);
      if(one && one.n){ put(numFmt(one.value), p.i, false); k = idx[one.n - 1] + 1; continue; }
    }
    put(p.s, p.i, true); k++;
  }
  var res = { text: out.join(''), map: map, orig: t };
  // "$2 million", "2.5bn", "40k" -> one figure. A bare "m"/"mm" only counts on a $ amount ("10m" can be minutes or metres).
  res = remapReplace(res, /\b([0-9][0-9,]*(?:\.[0-9]+)?) ?(thousand|million|billion|bn|k)\b|(\$ ?)([0-9][0-9,]*(?:\.[0-9]+)?) ?(mm|m)\b/gi, function(mm, n, sc, dol, n2, sc2){
    var SC = { thousand: 1e3, k: 1e3, million: 1e6, mm: 1e6, m: 1e6, billion: 1e9, bn: 1e9 };
    if(n != null) return numFmt(parseFloat(n.replace(/,/g, '')) * SC[sc.toLowerCase()]);
    return dol + numFmt(parseFloat(n2.replace(/,/g, '')) * SC[sc2.toLowerCase()]);
  });
  res = remapReplace(res, /\b(by|cut|reduced|increased|grew|of|than|about|roughly|nearly|almost|over|under|around) (?:a|1) (quarter|third)\b/gi, function(mm, w, f){ return w + ' ' + (/quarter/i.test(f) ? '25%' : '33%'); });
  res = remapReplace(res, /\b(in|by) half\b/gi, function(mm, w){ return w + ' 50%'; });
  // "lasted a year", "took a week": a duration said in words is a figure too.
  res = remapReplace(res, /(?<=\b(?:lasted|lasts|took|takes|for|spent|within|after|about|around|roughly|nearly|almost|over|under|only|just|waited|wait|waits|in) )(?:a|an)(?= (?:year|month|week|day|hour|minute|fortnight)\b)/gi, function(){ return '1'; });
  res = remapReplace(res, /\bdoubled\b/gi, function(){ return '2x'; });
  res = remapReplace(res, /\btripled\b/gi, function(){ return '3x'; });
  return res;
}
function origSpan(res, i, len){
  var a = i < res.map.length ? res.map[i] : res.orig.length, b = i + len < res.map.length ? res.map[i + len] : res.orig.length;
  return { index: a, text: res.orig.slice(a, Math.max(a, b)) };
}
/* Every figure with a unit: a symbol ($, %, x) or the noun right after it ("4 analysts"). */
var UNIT_ADJ = mkSet('new more additional extra full-time part-time senior junior big small large major key enterprise active paying unique monthly weekly daily total other different regional local national global international remote direct qualified open urgent critical'.split(' '));
var CLAIM_RE = /(\$\s?)?([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(%|percent\b|k\b|x\b|times\b))?(?:\s+([a-z][a-z'-]{1,24}))?/gi;
function unitWord(w){ w = String(w || '').toLowerCase().replace(/'s$/, ''); if(!w || (w in UNIT_STOP)) return ''; if(UNIT_ALIASES[w]) return UNIT_ALIASES[w]; return w.length > 3 ? w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1') : w; }
var YEAR_EVENT_RE = /\b(join|graduat|start|found|launch|move|moved|left|leave|finish|complet|hire|hired|promot|began|begin|open|close|ran|run|pilot|ship|releas|switch|quit|retire|enrol|qualif|certif)[a-z]*\b(?![\s\S]*\b(?:join|graduat|start|found|launch|move|left|leave|finish|complet|hire|promot|began|begin|open|close|ran|run|pilot|ship|releas|switch|quit|retire|enrol|qualif|certif)[a-z]*\b)/i;
var YEAR_EVENT_WORDS = { join: /^(?:join|start|began|begin|been|work)/, graduat: /^(?:graduat|finish|complet|degree|studi|earn|got)/,
  launch: /^(?:launch|live|went|releas|ship|roll)/, promot: /^(?:promot|became|made|named|appoint|lead)/ };
function yearEvent(pre){
  if(/\b(?:been|worked|working)\s+(?:at|with|for|in)\b[^.;,]{0,40}\bsince\s+$/i.test(pre)) return 'join';
  if(/\bstarted\s+(?:at|with|in)\s/i.test(pre) && !/\bstarted\s+\w+ing\b/i.test(pre)) return 'join';
  if(/\b(?:finished|completed|got|earned)\s+(?:my|a|the|his|her)\s+(?:\w+\s+)?(?:degree|diploma|bachelor'?s|master'?s|phd|doctorate|studies)\b/i.test(pre)) return 'graduat';
  if(/\b(?:went|gone|go)\s+live\b/i.test(pre)) return 'launch';
  if(/\b(?:became|was made|was named|was appointed|got promoted)\b/i.test(pre)) return 'promot';
  var ev = YEAR_EVENT_RE.exec(pre); if(!ev) return '';
  var w = ev[1].toLowerCase();
  return w === 'start' || w === 'began' || w === 'begin' ? 'start' : w === 'move' || w === 'moved' ? 'move' : w;
}
function numericClaims(text){
  var nf = numify(text), out = [], m, re = new RegExp(CLAIM_RE.source, 'gi');
  while((m = re.exec(nf.text))){
    var sym = (m[3] || '').toLowerCase(), u = m[1] ? '$' : sym === '%' || sym === 'percent' ? '%' : sym === 'x' || sym === 'times' ? 'x' : '';
    var w = unitWord(m[4]), adjEnd = 0;
    // "12 new hires", "40 full-time staff": the unit is the noun after one describing word.
    if(!w && m[4] && (m[4].toLowerCase() in UNIT_ADJ)){
      var nx = /^\s+([a-z][a-z'-]{1,24})/i.exec(nf.text.slice(m.index + m[0].length)), w2 = nx ? unitWord(nx[1]) : '';
      if(w2 && !(nx[1].toLowerCase() in UNIT_ADJ)){ w = w2; adjEnd = nx[0].length; }
    }
    if(!u && !w && !sym && !m[1]){
      var pre = nf.text.slice(Math.max(0, m.index - 24), m.index), post = nf.text.slice(m.index + m[2].length, m.index + m[2].length + 10);
      if(/\b(?:team|group|staff|crew|class|squad|department|unit|headcount) of\s*$/i.test(pre) || /^-(?:person|people|strong|member|man|woman)\b/i.test(post)) w = 'team-size';
    }
    if(!u && w === '$') u = '$';
    if(!u && w) u = w;
    if(sym === 'k' && !m[1] && w && w !== '$') u = w;
    // A year is a date, not a figure - but the year of one event ("joined", "graduated", "started") is a
    // claim of its own: "I joined Acme in 2019" then "in 2021" is a changed story.
    if(!m[1] && !sym && /^(?:19|20)\d\d$/.test(m[2])){
      var ev = yearEvent(clauseAt(nf.text, m.index).slice(0, Math.max(0, m.index - (nf.text.lastIndexOf(clauseAt(nf.text, m.index), m.index)))));
      if(ev && /\b(?:in|since|from|during|of|back in|early|late|mid|(?:january|february|march|april|may|june|july|august|september|october|november|december))\s+$/i.test(nf.text.slice(Math.max(0, m.index - 16), m.index))){
        var ysp = origSpan(nf, m.index, m[2].length);
        out.push({ unit: 'year-of:' + ev, value: parseFloat(m[2]), text: clean(ysp.text), index: ysp.index, lo: null, date: true });
      }
      continue;
    }
    if(!u) continue;
    var v = parseFloat(m[2].replace(/,/g, '')) * (sym === 'k' ? 1000 : 1);
    var usedWord = !!(m[4] && w && u === w), len = usedWord || !m[4] ? m[0].length + (usedWord ? adjEnd : 0) : m[0].length - m[0].match(/\s+[a-z][a-z'-]*$/i)[0].length;
    // "400 hours a year" is a rate, not how long something took: it is never compared with a duration.
    var per = (u in TIME_MIN) ? /^\s*(?:a|an|per|each|every)\s+(day|week|month|year|quarter|shift|night|sprint|hour)\b/i.exec(nf.text.slice(m.index + len)) : null;
    if(per) u = u + '/' + per[1].toLowerCase();
    var sp = origSpan(nf, m.index, len);
    // "between 200 and 300 patients": the claim is a range - 250 later is inside it.
    var rm = /(\d[\d,]*(?:\.\d+)?)\s*(?:and|to|-|\u2013)\s*\$?\s*$/.exec(nf.text.slice(Math.max(0, m.index - 30), m.index + (m[1] ? m[1].length : 0)));
    out.push({ unit: u, value: v, text: clean(sp.text), index: sp.index, lo: rm ? parseFloat(rm[1].replace(/,/g, '')) : null });
    if(out.length > 60) break;
  }
  return out;
}
/* The sentence around a position, and its content words - two figures only
   contradict each other when they're about the same thing. */
// A full stop between digits ("4.5 out of 5") is a decimal point, not the end of a sentence.
function sentenceAt(text, index){
  var t = String(text), a = 0, e = t.length, re = /[.!?\n]/g, m;
  while((m = re.exec(t))){
    if(m[0] === '.' && /\d/.test(t.charAt(m.index - 1)) && /\d/.test(t.charAt(m.index + 1))) continue;
    if(m.index < index) a = m.index + 1; else { e = m.index; break; }
  }
  return t.slice(a, e);
}
var UNIT_WORDS = /^(?:percent|hours?|days?|weeks?|months?|years?|minutes?|people|customers?|users?|members?|students?|employees?|clients?|dollars|tickets?|orders?|accounts?|projects?|reports?|times|from|went|about|around|roughly|nearly|over|under|then|than|after|before|more|less)$/;
// Number words ("eighteen months") and connectives ("since") say nothing about WHAT a figure is.
var CTX_SKIP_RE = /^(?:zero|three|four|five|seven|eight|nine|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen|dozens|half|quarter|since|until|while|still|once|twice|already|almost|nearly|about|around|roughly)$/;
function ctxWords(sentence){ return uniq((String(sentence).toLowerCase().match(/[a-z]{4,}/g) || []).filter(function(w){ return !STOP[w] && !UNIT_WORDS.test(w) && !CTX_SKIP_RE.test(w); }).map(function(w){ return w.replace(/(ing|ed|es|s)$/, ''); })); }
var CHANGE_WORDS = /^(?:grew|grow|rose|rise|fell|fall|drop|increas|decreas|reduc|improv|lift|boost|went|took|take|made|make|got|get|saved|save|doubl|tripl|halv|chang|move|jump|climb|declin|lower|rais|hit|reach|were|have|been|being|ended|end|about|around|nearly|almost|just|only|also|then|more|less|over|under|first|last|after|before|every|each|total)$/;
/* The clause a figure sits in - "QA took 2 days" and "the wait was 4 days" are
   different subjects even inside one sentence. */
function clauseAt(text, index){
  var sent = sentenceAt(text, index), t = String(text), off = t.lastIndexOf(sent, index);
  if(off < 0) off = index;
  // A comma inside a number ("2,000 users") doesn't end the clause.
  var rel = index - off, parts = sent.split(/((?<!\d),|,(?!\d)|;|\band\b|\bbut\b|\bthen\b|\bwhile\b|\bwhich\b|\bafter\b|\bbefore\b|\bbecause\b|\bwhen\b|\bso\b)/i), pos = 0;
  for(var i = 0; i < parts.length; i++){ if(rel >= pos && rel < pos + parts[i].length) return parts[i]; pos += parts[i].length; }
  return sent;
}
// "The project lasted a year": a countable noun is a unit after a number ("3 projects") but the SUBJECT after
// "the / our / my" - and the subject is what two figures must share.
var SUBJ_UNIT_RE = /\b(?:the|our|my|this|that|his|her|their|its|whole|entire) (people|customers?|users?|members?|students?|employees?|clients?|tickets?|orders?|accounts?|projects?|reports?)\b/gi;
function sentWords(text, index){ var c = sentenceAt(text, index), extra = (c.match(SUBJ_UNIT_RE) || []).map(function(x){ return x.split(' ')[1].toLowerCase().replace(/(ing|ed|es|s)$/, ''); }); return uniq(ctxWords(c).concat(extra)).filter(function(w){ return !CHANGE_WORDS.test(w); }); }
/* The describing words next to a shared word: "audit [prep]" vs "audit [itself]", "[mock] exam" vs "[real] exam". */
var MOD_SKIP_RE = /^(?:about|around|roughly|nearly|over|under|more|less|than|with|from|into|onto|their|there|these|those|this|that|which|while|when|where|what|have|been|were|will|would|could|should|also|just|only|really|very|some|much|many|each|every|other|another|same|then|after|before|because|until|since|both|they|them|your|mine|ours|theirs)$/;
function modsOf(clause, stem){
  var ws = String(clause || '').toLowerCase().match(/[a-z]+/g) || [], out = [];
  ws.forEach(function(w, i){
    if(w.replace(/(ing|ed|es|s)$/, '') !== stem) return;
    [ws[i - 1], ws[i + 1]].forEach(function(n){ if(n && n.length >= 4 && !STOP[n] && !UNIT_WORDS.test(n) && !MOD_SKIP_RE.test(n) && !CHANGE_WORDS.test(n.replace(/(ing|ed|es|s)$/, ''))) out.push(n.replace(/(ing|ed|es|s)$/, '')); });
  });
  return uniq(out);
}
function differentThing(a, b, stem){ var x = modsOf(a, stem), y = modsOf(b, stem); return x.length > 0 && y.length > 0 && !x.some(function(w){ return y.indexOf(w) >= 0; }); }
function overlapOk(x, y){ var ov = x.filter(function(w){ return y.indexOf(w) >= 0; }).length; return ov >= 2 || (ov >= 1 && ov >= Math.min(x.length, y.length)); }
/* Who the figure is about: "I", or the first person/thing named in the clause ("the whole team", "the desk"). */
var NEUTRAL_SUBJ_RE = /^(?:it|that|this|there|which|what)$/;
var GROUP_SUBJ_RE = /^(?:we|they|he|she|team|staff|desk|department|company|store|office|group|crew|shift|site|branch|floor|business|organi[sz]ation|manager|boss|colleague|teammate|director|engineer|analyst|agent|rep|partner|client|customer|vendor|supplier)$/;
var AGAIN_RE = /\b(?:again|back|another|this time|once more|rejoined|relaunched|returned|reopened|restarted)\b/i;
function subjOf(clause){
  var m = /\b(i|we|they|he|she|you|it|that|this|there|everyone|everybody|nobody|(?:the|our|my|their|his|her|its)\s+(?:whole\s+|entire\s+|same\s+)?[a-z]+)\b/i.exec(String(clause || ''));
  if(!m) return '';
  var x = m[1].toLowerCase().replace(/^(?:the|our|my|their|his|her|its)\s+/, '').replace(/^(?:whole|entire|same)\s+/, '');
  // "the whole QA team", "our night shift crew": the group noun a word or two later is who it is.
  var g = /^(?:[a-z]+\s+){0,2}?(team|staff|desk|department|company|crew|group|office|store|shift|site|branch|floor)s?\b/i.exec(String(clause).slice(m.index + m[0].length - x.length).toLowerCase());
  if(m[1].length > x.length && g) x = g[1];
  return x === 'we' || x === 'everyone' || x === 'everybody' ? 'we' : x.replace(/s$/, '');
}
function clauseWords(text, index){
  var c = clauseAt(text, index), extra = (c.match(SUBJ_UNIT_RE) || []).map(function(x){ return x.split(' ')[1].toLowerCase().replace(/(ing|ed|es|s)$/, ''); });
  return uniq(ctxWords(c).concat(extra)).filter(function(w){ return !CHANGE_WORDS.test(w); });
}
/* A figure about part of the whole: one team, one store, the first month, the urgent tickets. */
var SUBSET_RE = /\b(?:(?:on|in|of|from) (?:that|the|our|my|this) (?:team|group|class|department|store|crew|squad|project)|(?:of|out of) (?:them|those|these|the \d+)|directly|for (?:urgent|priority|critical|vip|enterprise|key|our (?:biggest|largest|top)|the (?:biggest|largest|top|urgent|priority|hardest|first))|at my (?:own )?(?:store|branch|site|location|shop|office|school|team)|in (?:the|my|our) (?:first|second|third|fourth|last|final|opening) (?:month|week|quarter|year|day|sprint|phase)s?|by the (?:first|second|third|fourth|end of the) (?:month|week|quarter|year)|on my own|personally|myself|alone|per (?:person|store|week|day|month|analyst|rep|head)|the (?:first|last|top|bottom|other|remaining|next|final|slowest|fastest|best|worst|biggest|largest|smallest) (?:\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|few|couple)|(?:at|during|over) (?:the |our |a )?(?:peak|holiday peak|holidays?|holiday rush|rush|busiest \w+|launch week|black friday)|(?:a|the|our) (?:record|peak|busiest|slowest|quietest|best|worst) (?:day|week|month|quarter|year|night|shift)|on (?:average|a good day|a bad day|busy days|quiet days)|at (?:most|least|best|worst|times)|(?:some|most|busy|quiet) days|that (?:day|week|month|night|shift)|on (?:a|my|our|the|one|their) (?:busy|busier|busiest|slow|slower|slowest|quiet|quieter|quietest|bad|good|best|worst|peak|record|heavy|light|big|biggest|crazy|hectic|mad) (?:day|days|week|weeks|shift|shifts|night|nights|month|months)|at (?:month|quarter|year|week)[- ]?end|(?:in|during|over|around) (?:january|february|march|april|may|june|july|august|september|october|november|december|the summer|the winter|the holidays|christmas)|on (?:mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays|weekends|weekdays|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:during|throughout|amid|amidst)(?: [a-z'-]+){1,3}|while (?:the|we|i|our|it|they)|in (?:peak|busy|high|low|slow|holiday|quiet) (?:season|seasons|periods?|weeks?|months?|times)|in (?:one|a single) (?:day|week|month|shift|night|hour)|when (?:the|our|a|an|we|it|they|there)\b|sometimes|occasionally|now and then|once in a while|on (?:peak|busy|slow|quiet|heavy|light|good|bad|big|record|long|short) (?:days|weeks|shifts|nights|months)|(?:last|this|next|that|same) (?:week|month|year|quarter|summer|winter|spring|autumn|fall|christmas|season|weekend|january|february|march|april|may|june|july|august|september|october|november|december)|q[1-4]|in the run-up to|the (?:week|month|day|year|quarter|weekend|night|morning) (?:after|before|of)|(?:before|after|until|since) (?:the|we|i|our|it|my|that|this|they|he|she|then|launch|go-live)|my (?:record|best|worst|personal best|highest|lowest)|record|(?:the )?(?:whole|entire) (?:[a-z]+ )?(?:team|department|company|office|store|desk|group|floor|site|branch)|itself|themselves|across|in total|combined|altogether|all (?:of )?(?:us|the|our|three|four|five|six|seven|eight|nine|ten)|again|this time|now|these days|nowadays|today|at the time|back then|at first|initially|eventually|later|(?:the|a|our|my) (?:real|actual|final|practice|mock|trial|test|second|third|next|previous|last|old|new) [a-z]+)\b/gi;
function scopesAt(text, index){ var c = clauseAt(text, index), s = sentenceAt(text, index); return uniq((String(c + ' ' + (s.length < 160 ? s : '')).match(SUBSET_RE) || []).map(function(x){ return x.toLowerCase(); })); }
function newScope(baseText, bIndex, ans, aIndex){ var bs = scopesAt(baseText, bIndex); return scopesAt(ans, aIndex).some(function(x){ return bs.indexOf(x) < 0; }); }
var FROMTO_RE = /\bfrom\s+(?:about\s+|around\s+|roughly\s+|over\s+)?(\$?\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:%|percent|k\b))?)((?:\s+[a-z]+){0,3}?)\s+(?:down\s+|up\s+|all the way\s+)?to\s+(?:about\s+|around\s+|just\s+|under\s+|only\s+)?(\$?\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:%|percent|k\b))?)((?:\s+[a-z]+){0,2})/gi;
var UNIT_WORD_RE = /^(?:%|percent|hours?|hrs?|days?|weeks?|months?|years?|minutes?|mins|people|persons|customers?|users?|members?|students?|employees?|clients?|dollars|tickets?|orders?|accounts?|projects?|reports?|times|stockouts?|errors?|complaints?|calls?|sales|signups?|leads?|items?|steps?|seconds?)$/;
function unitOf(group){ var ws = clean(group).toLowerCase().split(' ').filter(Boolean); for(var i = 0; i < ws.length; i++){ if(UNIT_WORD_RE.test(ws[i])) return UNIT_ALIASES[ws[i]] || ws[i].replace(/s$/, ''); } return ''; }
function fromTo(text){
  var nf = numify(text), out = [], m, re = new RegExp(FROMTO_RE.source, 'gi');
  while((m = re.exec(nf.text))){
    var u = unitOf(m[4]) || unitOf(m[2]); if(/%|percent/.test(m[1] + m[3])) u = '%'; if(/\$/.test(m[1] + m[3])) u = '$';
    var num = function(x){ var v = parseFloat(String(x).replace(/[$,\s%]/g, '').replace(/percent|k/gi, '')); return /k\b/i.test(x) ? v * 1000 : v; };
    var sp = origSpan(nf, m.index, m[0].length), uw = clean(m[4]).split(' ').filter(function(w){ return UNIT_WORD_RE.test(w.toLowerCase()); })[0];
    // toText / fromText are the figures as compared (digits); what's SHOWN is always a verbatim quote.
    var tu = /%|percent|\$/.test(m[1] + m[3]) ? u : (unitOf(m[4]) || u), fu = /%|percent|\$/.test(m[1] + m[3]) ? u : (unitOf(m[2]) || tu);
    out.push({ from: num(m[1]), to: num(m[3]), unit: u, fromUnit: fu, toUnit: tu, text: clean(sp.text), index: sp.index, toText: clean(m[3] + (uw ? ' ' + uw : '')), fromText: clean(m[1] + (m[2] || '')) });
    if(out.length > 20) break;
  }
  return out;
}
var CHANGE_TO_RE = /(?:\b(?:down|up|cut|grew|dropped|fell|rose|reduced|brought|got|went|climbed|increased|decreased|lowered|raised|improved|shrank|shrunk)\s+(?:it\s+|that\s+|them\s+|\w+\s+)?(?:all the way\s+)?(?:down\s+|up\s+)?to|\bnow\s+(?:at\s+|only\s+|just\s+|down\s+to\s+|up\s+to\s+)?)\s*(?:about\s+|around\s+|roughly\s+|just\s+|under\s+|over\s+)?\$?\s*$/i;
var TIME_MIN = Object.assign(Object.create(null), { second: 1 / 60, minute: 1, hour: 60, day: 1440, week: 10080, month: 43200, year: 525600 });
function inMinutes(v, unit){ return (unit in TIME_MIN) && typeof v === 'number' && isFinite(v) ? v * TIME_MIN[unit] : null; }
function mentions(text, value){ return qtoks(numify(text).text).indexOf(numFmt(value)) >= 0; }
/* Role claims. Leading is about people and the whole effort; building a piece of
   it isn't leading it. "I helped with the launch" -> "I led the launch" is what
   interviewers listen for - about the SAME thing. */
var LEAD_STRONG = /\b(?:was|is) my (?:project|baby|initiative|idea)\b|\bi (?:designed|built|created|wrote|ran|did|delivered|owned|made|launched|planned|organi[sz]ed)\b[^.!?]{0,40}?\b(?:myself|on my own|single-?handedly|end to end|end-to-end|alone|from start to finish)\b|\bi was the only (?:one|person|analyst|engineer|developer|designer|manager|lead|member)\b|\bthe only (?:analyst|engineer|developer|designer|person) (?:on|in) (?:it|the|that)\b|\bi (?:led(?! with)|lead(?! with| by example)|managed(?! to\b)|headed(?! (?:home|back|out|off|over|to)\b)|oversaw|directed|spearheaded|orchestrated|championed|drove(?![^.!?]{0,40}\b(?:airport|station|hotel|home|car|van|truck|bus|ride|rides|shuttle|miles)\b))\b|\bi was (?:in charge(?: of)?|leading|the (?:lead|leader|team lead|project lead|head|manager|one in charge|point person))\b|\bi single-?handedly \w+|\bi was the one (?:who|that) (?:led|ran|owned|designed|built|drove|managed|created|launched|decided)\b/gi;
var LEAD_RE = /\bi (?:planned|organi[sz]ed|led(?! with)|lead(?! with| by example)|managed(?! to\b)|headed(?! (?:home|back|out|off|over|to)\b)|oversaw|directed|spearheaded|orchestrated|championed|drove(?![^.!?]{0,40}\b(?:airport|station|hotel|home|car|van|truck|bus|ride|rides|shuttle|miles)\b)|owned|ran)\b|\bi was (?:in charge(?: of)?|leading|the (?:lead|leader|team lead|project lead|owner|head|manager|one in charge|point person|driver))\b|\bi was responsible for\b|\bi single-?handedly \w+|\bi was the one (?:who|that) (?:led|ran|owned|designed|built|drove|managed|created|launched|decided)\b/gi;
var LOW_ROLE = /\bi (?:helped|assisted|supported|contributed)\b|\bi was (?:part of|involved in|on the team|a member of|one of the|one of (?:\d+|two|three|four|five|six|seven|eight|nine|ten|several|many|a few|a handful of))\b|\bi participated\b|\bi (?:just|only) (?:helped|did|worked on)\b/gi;
var HIGH_ROLE = LEAD_RE;
function roleClaims(text, re){
  var out = [], m, r = new RegExp(re.source, 'gi'), t = String(text || '').slice(0, MAXTXT);
  while((m = r.exec(t))){
    var rest = t.slice(m.index + m[0].length), cut = rest.search(/[.;!?]|,\s|\s(?:and|but|so|then|which|because|while)\s/i);
    // What the claim is about: the words inside it ("I wrote the welcome emails myself") and the clause after it.
    var inner = ctxWords(m[0].replace(/^\s*\S+\s+\S+/, '')).filter(function(w){ return !/^(?:myself|alone|single|handedly|only)$/.test(w); });
    var obj = uniq(inner.concat(ctxWords(cut >= 0 ? rest.slice(0, cut) : rest.slice(0, 80)))).filter(function(w){ return !/^(?:whole|entire|every|thing|stuff)$/.test(w); });
    if(!obj.length) obj = ctxWords(sentenceAt(t, m.index));
    out.push({ index: m.index, text: m[0], obj: obj, whole: WHOLE_RE.test(t.slice(m.index, m.index + m[0].length + (cut >= 0 ? cut : 80))) });
    if(out.length > 20) break;
  }
  return out;
}
var APPROX_LEAD_RE = /^(?:about|roughly|around|approximately|nearly|almost|close to|some|~)\b/i;
function approxAt(t, i){ return /(?:\b(?:about|roughly|around|approximately|approx\.?|nearly|almost|close to|just over|just under|over|under|more than|less than|some)|~)\s*\$?\s*$/i.test(t.slice(Math.max(0, i - 24), i)); }
function sharesObj(a, b){ return a.obj.some(function(w){ return b.obj.indexOf(w) >= 0; }); }
// A lead claim over the whole effort ("I did the whole project myself", "everything", "the team") needs no shared object.
// "I led the redesign" (a bare effort noun) is the whole effort too; "I led the email workstream" is a piece of it.
var WHOLE_RE = /\b(?:the (?:whole|entire) (?:project|thing|effort|launch|migration|rollout|team|event|campaign|redesign)|everything|all of it|the (?:whole )?team|from start to finish|end to end)\b|\bthe (?:re)?(?:design|project|launch|migration|rollout|effort|initiative|overhaul|build|change|program|programme|campaign|transition|implementation|upgrade|move|event|work)(?=\s*(?:$|[.,;:!?)]|-|\s(?:of|for|at|in|with|on|and|from|to|that|which|while|when|so|but)\b))/i;
/* What a team did, said once ("I was on the team that rebuilt checkout", "I helped my manager plan the
   conference"), then claimed alone ("I rebuilt checkout", "I planned the whole conference"). */
var IRREG_STEM = mkMap({ built: 'build', rebuilt: 'rebuild', ran: 'run', led: 'lead', made: 'make', wrote: 'write', rewrote: 'rewrite', did: 'do', took: 'take', sold: 'sell', drove: 'drive', taught: 'teach', brought: 'bring', found: 'find', gave: 'give', kept: 'keep', set: 'set', cut: 'cut', grew: 'grow', won: 'win', began: 'begin', chose: 'choose', held: 'hold', sent: 'send', spent: 'spend', paid: 'pay', got: 'get', went: 'go' });
function vstem(w){ w = String(w).toLowerCase(); if(IRREG_STEM[w]) return IRREG_STEM[w]; w = w.replace(/(?:ing|ed|es|s|e)$/, ''); return w.length > 3 && /([b-df-hj-np-tv-z])\1$/.test(w) ? w.slice(0, -1) : w; }
var TEAM_ACT_RE = /\bi (?:was (?:on|part of|one of|a member of|in) (?:the|a|an|our|my) (?:[\w-]+ ){0,2}(?:team|group|crew|squad|committee)s? (?:that|who|which)|helped(?: (?:my|our|the|a|an) [\w-]+)?|assisted(?: (?:my|our|the|a|an) [\w-]+)?(?: (?:with|in|on))?|contributed to|supported)\s+([a-z][\w-]*)([^.;!?]{0,60})/gi;
function teamActs(text){
  var out = [], m, r = new RegExp(TEAM_ACT_RE.source, 'gi');
  while((m = r.exec(text)) && out.length < 12){ out.push({ verb: vstem(m[1]), obj: ctxWords(m[1] + ' ' + m[2]).map(vstem), index: m.index, text: m[0] }); }
  return out;
}
var I_VERB_RE = /\bi\s+(?:\w+ly\s+|then\s+|also\s+)?([a-z]{2,})\b([^.;!?]{0,60})/gi;
function soloClaim(text, act){
  var m, r = new RegExp(I_VERB_RE.source, 'gi');
  while((m = r.exec(text))){
    if(/^(?:was|am|had|have|helped|assisted|supported|contributed|think|thought|guess|mean|said|would|could|should|will|can)$/.test(m[1])) continue;
    var v = vstem(m[1]), obj = ctxWords(m[2]).map(vstem);
    if((v === act.verb || act.obj.indexOf(v) >= 0) && obj.some(function(w){ return w !== v && act.obj.indexOf(w) >= 0; })) return { index: m.index, text: m[0].slice(0, 60) };
  }
  return null;
}
function consistency(original, later){
  var baseText = apos(String(original || '').slice(0, MAXTXT)), base = numericClaims(baseText), baseFT = fromTo(baseText), flags = [];
  var baseLow = roleClaims(baseText, LOW_ROLE), baseLead = roleClaims(baseText, LEAD_RE);
  arr(later).forEach(function(ans, idx){
    ans = apos(String(ans || '').slice(0, MAXTXT));
    var claims = numericClaims(ans), ft = fromTo(ans);
    // 1. "from X to Y" results: the same change told twice must match.
    ft.forEach(function(f){
      baseFT.forEach(function(b){
        // Durations compare in minutes: "to 1 hour" and "to 60 minutes" agree; "to 10 minutes" doesn't.
        var bTo = inMinutes(b.to, b.toUnit), fTo = inMinutes(f.to, f.toUnit), bFrom = inMinutes(b.from, b.fromUnit), fFrom = inMinutes(f.from, f.fromUnit);
        var toDiff = bTo != null && fTo != null ? Math.abs(bTo - fTo) > 1e-9 : b.to !== f.to, fromDiff = bFrom != null && fFrom != null ? Math.abs(bFrom - fFrom) > 1e-9 : b.from !== f.from;
        var sameUnit = b.unit === f.unit || (bTo != null && fTo != null) || ((!b.unit || !f.unit) && !fromDiff);
        if(!sameUnit || (fromDiff && toDiff && !clauseWords(baseText, b.index).some(function(w){ return clauseWords(ans, f.index).indexOf(w) >= 0; }))) return;
        if(newScope(baseText, b.index, ans, f.index)) return;            // a subset: urgent tickets, the first month
        var changed = toDiff ? (mentions(ans, b.to) ? null : 'to') : fromDiff ? (mentions(ans, b.from) ? null : 'from') : null;
        if(changed) flags.push({ kind: 'number', answer: idx, unit: f.unit, before: changed === 'to' ? b.toText : b.fromText, after: changed === 'to' ? f.toText : f.fromText, beforeQuote: fragmentAt(baseText, b.index, b.text.length), afterQuote: fragmentAt(ans, f.index, f.text.length) });
      });
    });
    // 2. Any other figure: same unit, same subject, a new value, and the old value never restated.
    claims.forEach(function(c){
      if(ft.some(function(f){ return c.index >= f.index && c.index < f.index + f.text.length; })) return;
      var cMin = inMinutes(c.value, c.unit);
      var same = base.filter(function(b){ return b.unit === c.unit || (cMin != null && inMinutes(b.value, b.unit) != null); });
      // Durations compare in minutes, within 10%: "a year" is "twelve months", "a month" is "four weeks".
      var sameVal = function(b, x){ var bm = inMinutes(b.value, b.unit), xm = inMinutes(x.value, x.unit); return bm != null && xm != null ? Math.abs(bm - xm) <= 0.1 * Math.max(bm, xm) + 1e-9 : b.value === x.value; };
      if(!same.length || same.some(function(b){ return sameVal(b, c); }) || baseText.indexOf(c.text) >= 0) return;
      // "Our churn was 8%" then "I got churn down to 6%": the second is the result of their work, a new
      // measurement - unless the first was a result too ("down to 4%" then "down to 6%" is a changed story).
      var toNow = function(txt, i){ return CHANGE_TO_RE.test(txt.slice(Math.max(0, i - 40), i)); };
      // A figure takes its words from its own clause. A duration alone in its clause ("...after eighteen months") describes
      // the sentence's one event ("I was promoted to supervisor"), so it takes the sentence's words.
      var timed = cMin != null, ctxOf = function(txt, i){ var w = clauseWords(txt, i); return w.length || !timed || numericClaims(sentenceAt(txt, i)).length > 1 ? w : sentWords(txt, i); };
      var cctx = ctxOf(ans, c.index), cSubj = subjOf(clauseAt(ans, c.index));
      // The same thing, said twice: the two clauses share two words, or every word of the shorter one. For the year
      // of an event the event's own words don't count - "joined Acme" vs "joined the data team" are two events, a
      // bare "I graduated in" is one - and "again" or "back" makes it a second time.
      var sameCtx = function(b){
        var bw = ctxOf(baseText, b.index), bSubj = subjOf(clauseAt(baseText, b.index));
        // "I handled 40 calls" vs "the whole team handled 200": different people, different figures.
        if(bSubj && cSubj && bSubj !== cSubj && ((bSubj === 'i' && GROUP_SUBJ_RE.test(cSubj)) || (cSubj === 'i' && GROUP_SUBJ_RE.test(bSubj)))) return false;
        if(c.date){
          if(AGAIN_RE.test(clauseAt(ans, c.index)) || AGAIN_RE.test(clauseAt(baseText, b.index))) return false;
          var ew = YEAR_EVENT_WORDS[c.unit.slice(8)] || new RegExp('^' + c.unit.slice(8)), strip = function(ws){ return ws.filter(function(w){ return !ew.test(w) && !/^\d+$/.test(w); }); }, x = strip(bw), y = strip(cctx);
          var xs = x.filter(function(w){ return y.indexOf(w) >= 0; });
          return (!x.length && !y.length) || (xs.length > 0 && !xs.every(function(w){ return differentThing(clauseAt(baseText, b.index), clauseAt(ans, c.index), w); }));
        }
        // "Day to day I took 75 calls" names nothing but the unit: the same person's figure, unscoped, is the same claim.
        if(!cctx.length && bSubj === 'i' && cSubj === 'i') return true;
        var shared = bw.filter(function(w){ return cctx.indexOf(w) >= 0; });
        // "the audit prep" vs "the audit itself", "the mock exam" vs "the real exam": a shared word that is a different thing.
        return shared.length > 0 && !shared.every(function(w){ return differentThing(clauseAt(baseText, b.index), clauseAt(ans, c.index), w); });
      };
      var gone = same.filter(function(b){ return !claims.some(function(c2){ return sameVal(b, c2); }) && sameCtx(b); });
      if(!gone.length) return;
      var b0 = gone.slice().sort(function(x, y){ return Math.abs(x.value - c.value) - Math.abs(y.value - c.value); })[0];
      // A scope ("on a busy day", "in December") narrows a figure - never the year something happened.
      if(!c.date && newScope(baseText, b0.index, ans, c.index)) return;
      if(toNow(ans, c.index) && !toNow(baseText, b0.index)) return;
      // "38%" then "roughly 40%" is rounding, and "about 250" sits inside "between 200 and 300" - not a changed story.
      var approx = approxAt(ans, c.index) || approxAt(baseText, b0.index) || APPROX_LEAD_RE.test(c.text) || APPROX_LEAD_RE.test(b0.text);
      var cv = timed ? cMin : c.value, bv = timed ? inMinutes(b0.value, b0.unit) : b0.value;
      if(approx && Math.abs(cv - bv) <= Math.max(0.15 * Math.abs(bv), c.unit === '%' ? 5 : timed ? 0 : 1)) return;
      if(same.some(function(b){ return b.lo != null && Math.min(b.lo, b.value) <= c.value && c.value <= Math.max(b.lo, b.value); }) || (c.lo != null && Math.min(c.lo, c.value) <= b0.value && b0.value <= Math.max(c.lo, c.value))) return;
      flags.push({ kind: c.date ? 'date' : 'number', answer: idx, unit: c.date ? 'year' : c.unit, before: b0.text, after: c.text, beforeQuote: fragmentAt(baseText, b0.index, b0.text.length), afterQuote: fragmentAt(ans, c.index, c.text.length) });
    });
    // 3. Role claims. "I helped" -> "I led" with no lead claim before; or, when the
    //    story mixed both, a lead claim now about the same thing they only helped with.
    var nowLead = roleClaims(ans, LEAD_RE), nowLow = roleClaims(ans, LOW_ROLE), done = false;
    var nowStrong = roleClaims(ans, LEAD_STRONG);
    // (Only real leadership verbs count: "I managed to", "I drove them to the airport", "I lead with the data" don't.)
    // Owning one piece "myself" inside a team story is exactly what "what did YOU do?" asks for: only a
    // claim over the same thing they said they helped with (or over the whole effort) is a changed story.
    var upS = baseLead.length ? [] : nowStrong.filter(function(st){ return st.whole || baseLow.some(function(lo){ return sharesObj(st, lo); }); });
    if(baseLow.length && upS.length){ var lo0 = baseLow.filter(function(lo){ return upS[0].whole || sharesObj(upS[0], lo); })[0] || baseLow[0]; done = true; flags.push({ kind: 'inflation', answer: idx, before: lo0.text, after: upS[0].text, beforeQuote: fragmentAt(baseText, lo0.index, lo0.text.length), afterQuote: fragmentAt(ans, upS[0].index, upS[0].text.length) }); }
    // ...and what a team did, said once, then claimed alone: "on the team that rebuilt checkout" -> "I rebuilt checkout".
    if(!done) teamActs(baseText).some(function(act){ var solo = soloClaim(ans, act); if(!solo) return false; done = true; flags.push({ kind: 'inflation', answer: idx, before: act.text, after: solo.text, beforeQuote: fragmentAt(baseText, act.index, act.text.length), afterQuote: fragmentAt(ans, solo.index, solo.text.length) }); return true; });
    var baseStrong = roleClaims(baseText, LEAD_STRONG);
    var downL = nowLow.filter(function(l){ return baseStrong.some(function(h){ return sharesObj(l, h); }); });
    if(!done && baseStrong.length && !baseLow.length && downL.length && !nowLead.length){ var hi0 = baseStrong.filter(function(h){ return sharesObj(downL[0], h); })[0]; done = true; flags.push({ kind: 'walkback', answer: idx, before: hi0.text, after: downL[0].text, beforeQuote: fragmentAt(baseText, hi0.index, hi0.text.length), afterQuote: fragmentAt(ans, downL[0].index, downL[0].text.length) }); }
    baseLow.forEach(function(lo){
      if(done || baseLead.some(function(l){ return sharesObj(l, lo); })) return;
      var up = nowLead.filter(function(l){ return sharesObj(l, lo); })[0];
      if(up){ done = true; flags.push({ kind: 'inflation', answer: idx, before: lo.text, after: up.text, beforeQuote: fragmentAt(baseText, lo.index, lo.text.length), afterQuote: fragmentAt(ans, up.index, up.text.length) }); }
    });
    baseLead.forEach(function(hi){
      if(done || nowLead.some(function(l){ return sharesObj(l, hi); })) return;
      var down = nowLow.filter(function(l){ return sharesObj(l, hi); })[0];
      if(down){ done = true; flags.push({ kind: 'walkback', answer: idx, before: hi.text, after: down.text, beforeQuote: fragmentAt(baseText, hi.index, hi.text.length), afterQuote: fragmentAt(ans, down.index, down.text.length) }); }
    });
  });
  var seen = {};
  return flags.filter(function(f){ var k = f.kind + '|' + f.before + '|' + f.after; if(seen[k]) return false; seen[k] = 1; return true; });
}

/* ============================================================ HONESTY
   AI rewrites may not add a figure (or claim) you never gave - the Resume
   Studio's engine does the full check; a digits-only net is the fallback. */
function figLabel(f){ return clean(String(f == null ? '' : f)).replace(/^[(\[]+|[,.;:!?)\]]+$/g, ''); }
function figList(list){ return uniq(arr(list).map(figLabel).filter(Boolean)); }
function honestyCheck(source, out){
  var E = RSE();
  try{ if(E && typeof E.honesty === 'function'){ var h = E.honesty(String(source || ''), {}, String(out || '')); var fl = figList(h.flagged); return { ok: !!h.ok && !fl.length, flagged: fl.slice(0, 8) }; } }catch(e){}
  // Without the Resume Studio engine: the same figure check the server runs
  // (spelled-out numbers count, and a unit has to match).
  var bad = figList(unsupportedNumbers(String(source || ''), String(out || '')));
  return { ok: !bad.length, flagged: bad.slice(0, 8) };
}

/* ============================================================ DELIVERY (raw audio maths)
   Pure functions over measured frames, so they're testable with synthetic audio. */
function estimatePitch(buf, sampleRate){
  var n = buf.length, i, rms = 0;
  for(i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n); if(rms < 0.01) return 0;
  var minLag = Math.floor(sampleRate / 400), maxLag = Math.min(Math.floor(sampleRate / 70), n - 1), best = -1, bestCorr = 0;
  var corrs = [];
  for(var lag = minLag; lag <= maxLag; lag++){
    var c = 0, e1 = 0, e2 = 0;
    for(i = 0; i + lag < n; i++){ c += buf[i] * buf[i + lag]; e1 += buf[i] * buf[i]; e2 += buf[i + lag] * buf[i + lag]; }
    var nc = c / (Math.sqrt(e1 * e2) || 1); corrs.push(nc);
    if(nc > bestCorr){ bestCorr = nc; best = lag; }
  }
  if(best < 0 || bestCorr < 0.8) return 0;
  // Prefer the shortest lag whose correlation is near the best (avoids octave errors).
  for(var k = 0; k < corrs.length; k++){ if(corrs[k] >= bestCorr * 0.93 && k > 0 && corrs[k] >= corrs[k - 1] && (k + 1 >= corrs.length || corrs[k] >= corrs[k + 1])){ best = minLag + k; break; } }
  return sampleRate / best;
}
function analyzeFrames(frames, opts){
  opts = opts || {};
  frames = arr(frames).filter(function(f){ return f && typeof f.t === 'number' && typeof f.rms === 'number'; });
  if(frames.length < 5) return null;
  var sorted = frames.map(function(f){ return f.rms; }).sort(function(a, b){ return a - b; });
  // Voice threshold: 3x the noise floor - unless the take has no silence at all, then a share of the loud level.
  var floor = sorted[Math.floor(sorted.length * 0.15)] || 0, loud = sorted[Math.floor(sorted.length * 0.9)] || 0, thr = Math.max(opts.minRms || 0.012, Math.min(floor * 3, loud * 0.35));
  var gapMs = opts.gapMs || 700, speaking = false, runStart = 0, lastVoice = null, first = null, pauses = [], speakMs = 0;
  frames.forEach(function(f, i){
    var dt = i ? f.t - frames[i - 1].t : 0, v = f.rms > thr;
    if(v){
      if(first == null) first = f.t;
      if(lastVoice != null && f.t - lastVoice >= gapMs) pauses.push((f.t - lastVoice) / 1000);
      if(lastVoice != null && f.t - lastVoice < gapMs) speakMs += f.t - lastVoice;
      lastVoice = f.t;
    }
  });
  var voiced = frames.filter(function(f){ return f.rms > thr && f.f0 >= 70 && f.f0 <= 400; }).map(function(f){ return f.f0; });
  var pitchVar = null, median = null;
  if(voiced.length >= 30){
    var vs = voiced.slice().sort(function(a, b){ return a - b; }); median = vs[Math.floor(vs.length / 2)];
    var semis = voiced.map(function(f){ return 12 * Math.log(f / median) / Math.LN2; }).filter(function(s){ return Math.abs(s) < 12; });
    var m = avg(semis); pitchVar = Math.sqrt(avg(semis.map(function(s){ return (s - m) * (s - m); })) || 0);
  }
  var start = opts.startT != null ? opts.startT : frames[0].t;
  return {
    latency: first == null ? null : round1((first - start) / 1000), lastSpeech: lastVoice == null ? null : round1((lastVoice - start) / 1000), speakSeconds: round1(speakMs / 1000),
    pauses: pauses.length, longestPause: pauses.length ? round1(Math.max.apply(null, pauses)) : 0,
    pitchVar: pitchVar == null ? null : round1(pitchVar), pitchMedian: median == null ? null : Math.round(median),
    monotone: pitchVar != null && pitchVar < 2, threshold: thr, voicedFrames: voiced.length, silent: first == null
  };
}

/* ============================================================ SESSION VERDICT */
var DECISIONS = ['strong_no_hire', 'no_hire', 'lean_no_hire', 'lean_hire', 'hire', 'strong_hire'];
var DECISION_LABEL = mkMap({ strong_no_hire: 'Strong no hire', no_hire: 'No hire', lean_no_hire: 'Lean no hire', lean_hire: 'Lean hire', hire: 'Hire', strong_hire: 'Strong hire' });
function decisionFor(overall, difficulty){
  var shift = difficulty === 'brutal' ? 6 : difficulty === 'tough' ? 3 : 0, o = (overall || 0) - shift;
  return o >= 85 ? 'strong_hire' : o >= 72 ? 'hire' : o >= 60 ? 'lean_hire' : o >= 48 ? 'lean_no_hire' : o >= 35 ? 'no_hire' : 'strong_no_hire';
}
var DRILL_FOR = { structure: 'xray', specificity: 'forge', ownership: 'gauntlet', impact: 'xray', relevance: 'hot', concision: 'drill', delivery: 'hot' };
var FIX_FOR = {
  structure: 'Build every answer as a one-line situation -> what you did -> what changed.',
  specificity: 'Swap claims for one real, specific example - names, numbers you really have, what was at stake.',
  ownership: 'Say "I" for what you did. Separate your part from the team\'s every time.',
  impact: 'End every story on the result - measured if you truly have a number, otherwise the concrete change or lesson.',
  relevance: 'Answer the exact question in your first sentence, then support it.',
  concision: 'Cut the setup to one sentence. Aim for 60-120 seconds on stories.',
  delivery: 'Slow down, pause instead of filling, and start answering within a couple of seconds.'
};
// The session's dimensions come from the main answers: a one-line reply to "what did YOU do?" is
// judged on its own terms and never drags a dimension down (or props it up).
// Ownership means something in a story; in "tell me about yourself", "why us?", the closing questions or an
// explanation the built-in judge holds it at a neutral or structural value, so those turns don't drag it.
var DIM_SKIP_QTYPES = { ownership: ['tell', 'motivation', 'closing', 'explain'] };
function sessionDims(turns){
  var d = {}, mains = turns.filter(function(t){ return !t.follow; });
  if(mains.length) turns = mains;
  DIMS.concat(['delivery']).forEach(function(k){
    var skip = DIM_SKIP_QTYPES[k] || [], use = turns.filter(function(t){ var qt = t.qtype || (t.analysis && t.analysis.qtype); return skip.indexOf(qt) < 0; });
    if(!use.length) use = turns;
    var v = avg(use.map(function(t){ var s = (t.judge && t.judge.scores) || {}; return k === 'delivery' ? (t.analysis && t.analysis.scores && t.analysis.scores.delivery) : s[k]; })); if(v != null) d[k] = round1(v);
  });
  return d;
}
/* Which dimensions are really weakest. The built-in judge can't read meaning, so its relevance tops
   out at 4: it is compared out of 4, and only named weak when an off-topic answer, a dodge or a
   non-answer was actually seen. */
var RELEVANCE_ISSUES = ['offtopic', 'nofailure', 'fakeweak', 'echo', 'salad', 'list', 'vacuous', 'numdump', 'gaming', 'noask', 'badask'];
function dimMax(k, ruleBased){ return k === 'relevance' && ruleBased ? 4 : 5; }
function rankDims(dims, opts){
  opts = opts || {};
  return Object.keys(dims).filter(function(k){ return (k !== 'delivery' || opts.delivery) && (k !== 'relevance' || ((!opts.ruleBased || opts.relevanceSeen) && !opts.relevanceOff)); })
    .sort(function(a, b){ return dims[a] / dimMax(a, opts.ruleBased) - dims[b] / dimMax(b, opts.ruleBased); });
}
/* The fix points the way the answers actually went: short answers are told what to add, not to cut;
   all-"I" answers are told to name their actions, not to say "I". */
function fixFor(k, dir){
  dir = dir || {};
  if(k === 'concision' && dir.short) return 'Give each answer room - the situation in a line, what you did in detail, and how it ended. Aim for 60-120 seconds on stories.';
  if(k === 'ownership' && dir.iHeavy) return 'Name what you decided and did yourself - "I chose", "I built", "I told" - not just what happened around you.';
  return FIX_FOR[k];
}
function drillFor(k, dir){ return k === 'concision' && dir && dir.short ? 'xray' : DRILL_FOR[k]; }
/* Short or long overall: weighed by how far off each answer was ("one 4-minute ramble and two 15-second
   answers" ran long), from the seconds and the question's target. */
function lengthDeficits(items){
  var shortBy = 0, longBy = 0;
  items.forEach(function(x){ var tg = x.target || targetFor(x.qtype), sec = x.seconds; if(typeof sec !== 'number' || !tg) return; if(sec < tg[0]) shortBy += tg[0] - sec; else if(sec > tg[1]) longBy += sec - tg[1]; });
  return { short: shortBy, long: longBy };
}
function sessionDirection(turns){
  var m = turns.filter(function(t){ return !t.follow && t.analysis; });
  var dfc = lengthDeficits(m.map(function(t){ return { seconds: t.analysis.seconds, target: t.analysis.target, qtype: t.analysis.qtype }; }));
  var nShort = dfc.short, nLong = dfc.long;
  var I = m.reduce(function(n, t){ return n + (t.analysis.iSubj != null ? t.analysis.iSubj : t.analysis.iCount || 0); }, 0), W = m.reduce(function(n, t){ return n + (t.analysis.weSubj != null ? t.analysis.weSubj : t.analysis.weCount || 0); }, 0);
  return { short: nShort > nLong, iHeavy: I > 0 && I >= W };
}
function deliverySummary(turns){
  // Only answers whose timing was really measured - an estimated clock never feeds "measured" numbers.
  var spoken = turns.filter(function(t){ return t.analysis && t.analysis.mode === 'voice'; }).length;
  var sp = turns.filter(function(t){ return t.analysis && t.analysis.mode === 'voice' && !t.analysis.timingEstimated; }).map(function(t){ return t.analysis; });
  if(!sp.length) return null;
  var secs = sp.reduce(function(s, a){ return s + (a.seconds || 0); }, 0), fill = sp.reduce(function(s, a){ return s + a.fillers.count; }, 0);
  var topF = {}; sp.forEach(function(a){ a.fillers.top.forEach(function(p){ topF[p[0]] = (topF[p[0]] || 0) + p[1]; }); });
  return {
    answers: sp.length, spoken: spoken, wpm: avg(sp.map(function(a){ return a.wpm; })) == null ? null : Math.round(avg(sp.map(function(a){ return a.wpm; }))),
    fillers: fill, fillersPerMin: round1(fill / Math.max(secs / 60, 0.1)), topFillers: Object.keys(topF).sort(function(a, b){ return topF[b] - topF[a]; }).slice(0, 4).map(function(k){ return [k, topF[k]]; }),
    hedges: sp.reduce(function(s, a){ return s + a.hedges.count; }, 0), longestPause: Math.max.apply(null, sp.map(function(a){ return a.longestPause || 0; })),
    latency: avg(sp.map(function(a){ return a.latency; })) == null ? null : round1(avg(sp.map(function(a){ return a.latency; }))),
    overTime: sp.filter(function(a){ return a.length.status === 'long' || a.length.status === 'way-long' || a.interrupted; }).length,
    iCount: sp.reduce(function(s, a){ return s + a.iCount; }, 0), weCount: sp.reduce(function(s, a){ return s + a.weCount; }, 0),
    iSubj: sp.reduce(function(s, a){ return s + (a.iSubj || 0); }, 0), weSubj: sp.reduce(function(s, a){ return s + (a.weSubj || 0); }, 0),
    pitchVar: avg(sp.map(function(a){ return a.pitchVar; })) == null ? null : round1(avg(sp.map(function(a){ return a.pitchVar; }))), seconds: Math.round(secs)
  };
}
/* A turn the candidate skipped or left blank. It still counts: in a real
   interview a question you don't answer is a question you fail. */
var SKIP_NOTE = 'No answer given.', SKIP_FIX = 'Answer every question - even a short, honest answer beats silence.';
var NOT_REACHED_NOTE = 'Not reached - the interview was ended before this question.', NOT_REACHED_FIX = 'Finish the interview - a question you never reach counts as unanswered.';
function notReached(t){ return !!t && t.not_reached === true && unanswered(t); }
function skipReason(n, total, nr){
  var tail = ' - in a real interview, a question you don\'t answer is a question you fail.', of = n + ' of ' + total + ' question' + (total === 1 ? '' : 's');
  return nr ? 'Left ' + of + ' unanswered (' + nr + ' not reached - the interview was ended early)' + tail : 'Skipped ' + of + tail;
}
var SKIP_REASON_RE = /^(?:Skipped|Left) \d+ of \d+/;
function skipEntry(t, i){ var nr = notReached(t); return nr ? { i: i, score: 0, note: NOT_REACHED_NOTE, fix: NOT_REACHED_FIX, skipped: true, not_reached: true } : { i: i, score: 0, note: SKIP_NOTE, fix: SKIP_FIX, skipped: true }; }
/* Mirror of the backend's verdict_overall: within 10 of the per-question mean
   (x10, skipped answers scoring 0), and capped when questions were skipped. */
var THIN_SESSION = 3;   // fewer main answers than this and no committee goes past lean_hire
function verdictOverall(overall, scores, n, skipped, mains){
  if(scores.length){ var m10 = avg(scores) * 10; overall = overall == null ? m10 : Math.max(m10 - 10, Math.min(m10 + 10, overall)); }
  if(overall == null) return null;
  if(skipped && n) overall = Math.min(overall, skipped / n > 1 / 3 ? 47 : 59);
  if(mains != null && mains < THIN_SESSION) overall = Math.min(overall, 71);
  return clamp(roundHalfUp(overall), 0, 100);
}
function thinReason(mains){ return 'Only ' + mains + ' main question' + (mains === 1 ? '' : 's') + ' answered - no committee goes past \'lean hire\' on that little.'; }
function localVerdict(turns, opts){
  opts = opts || {};
  turns = arr(turns).filter(function(t){ return t && typeof t === 'object' && (t.judge || unanswered(t)); });
  var judged = turns.filter(function(t){ return t.judge && !unanswered(t) && !t.judge.unscored; }), skipped = turns.filter(unanswered), nr = turns.filter(notReached).length;
  if(!judged.length) return null;
  var w = turns.filter(function(t){ return unanswered(t) || !t.judge.unscored; }).map(function(t){ return { v: unanswered(t) ? 0 : (t.judge.overall || 5), w: t.follow ? 0.5 : 1 }; });
  var o = Math.round(w.reduce(function(s, x){ return s + x.v * x.w; }, 0) / w.reduce(function(s, x){ return s + x.w; }, 0) * 10);
  var rules = [];
  if(skipped.length){ rules.push('skipped answers score 0'); }
  var blame = judged.filter(function(t){ return (t.judge.red_flags || []).length; });
  if(blame.length){ o -= 8; rules.push('-8: a red flag (e.g. blaming others)'); }
  var thin = judged.filter(function(t){ return !t.follow && t.analysis && t.analysis.words < 25 && t.qtype !== 'closing'; });
  if(thin.length){ o -= 5; rules.push('-5: at least one answer under 25 words'); }
  var del = deliverySummary(judged);
  if(del && del.fillersPerMin > 6){ o -= 3; rules.push('-3: more than 6 filler words a minute'); }
  if(skipped.length){ var capV = skipped.length / turns.length > 1 / 3 ? 47 : 59; if(o > capV){ o = capV; rules.push('capped at ' + capV + ': ' + skipped.length + ' of ' + turns.length + ' questions ' + (nr ? 'unanswered (' + nr + ' not reached)' : 'skipped')); } }
  var mains = judged.filter(function(t){ return !t.follow; }).length, thinCap = 71, thin = false;
  if(mains < THIN_SESSION && o > thinCap){ o = thinCap; thin = true; rules.push('capped at lean hire: only ' + mains + ' main answer' + (mains === 1 ? '' : 's')); }
  o = clamp(o, 0, 100);
  var dims = sessionDims(judged), dir = sessionDirection(judged);
  var ruleBased = !judged.some(function(t){ return t.judge.source === 'ai'; });
  var relevanceSeen = judged.some(function(t){ return t.analysis && t.analysis.scores && localIssues(t.analysis).some(function(i){ return RELEVANCE_ISSUES.indexOf(i.key) >= 0; }); });
  var ranked = rankDims(dims, { delivery: !!del, ruleBased: ruleBased, relevanceSeen: relevanceSeen });
  // A dimension at 90%+ of its maximum isn't a weak spot, even when it's the lowest of a strong session.
  var weakest = ranked.filter(function(k){ return dims[k] / dimMax(k, ruleBased) < 0.9; }).slice(0, 2);
  if(!weakest.length) weakest = ranked.slice(0, 1);
  var strongest = ranked.slice().reverse().filter(function(k){ return dims[k] >= 3.5 && weakest.indexOf(k) < 0; }).slice(0, 2);
  var decision = decisionFor(o, opts.difficulty);
  var bar = [];
  turns.forEach(function(t, i){ if(!t.judge) return; (t.judge.evidence || []).slice(0, 1).forEach(function(e){ if(bar.length < 3 && e.quote) bar.push('Q' + (i + 1) + ': "' + e.quote + '" - ' + (e.issue || '').replace(/\.$/, '') + '.'); }); });
  var reasons = weakest.map(function(k){ var f = fixFor(k, dir); return DIM_LABEL[k] + ' averaged ' + dims[k] + '/' + dimMax(k, ruleBased) + ' - ' + f.charAt(0).toLowerCase() + f.slice(1); });
  if(blame.length) reasons.unshift('A red flag came up: ' + (blame[0].judge.red_flags[0] || 'blaming others') + '.');
  if(thin) reasons.unshift(thinReason(mains));
  if(skipped.length) reasons.unshift(skipReason(skipped.length, turns.length, nr));
  return {
    source: 'local', decision: decision, label: DECISION_LABEL[decision], overall: o, answered: turns.length - skipped.length, asked: turns.length,
    headline: skipped.length && skipped.length / turns.length > 1 / 3 ? 'Too many questions went unanswered to hire on this.' : decision === 'strong_hire' || decision === 'hire' ? 'Consistently specific and owned - this would get through.' : decision === 'lean_hire' ? 'Close. A committee would hesitate on ' + DIM_LABEL[weakest[0]].toLowerCase() + '.' : 'Not yet: ' + DIM_LABEL[weakest[0]].toLowerCase() + ' and ' + DIM_LABEL[weakest[1] || weakest[0]].toLowerCase() + ' would sink this in a real loop.',
    reasons: reasons, strengths: strongest.map(function(k){ return DIM_LABEL[k] + ' held up (' + dims[k] + '/5).'; }), bar_raiser: bar,
    per_question: turns.map(function(t, i){ return unanswered(t) ? skipEntry(t, i) : { i: i, score: t.judge.unscored ? null : t.judge.overall, note: t.judge.headline, fix: (t.judge.missing && t.judge.missing[0]) || '' }; }),
    top_fixes: weakest.map(function(k){ return { fix: fixFor(k, dir), drill: drillFor(k, dir) }; }), dims: dims, delivery: del, rules: rules
  };
}
/* The AI verdict, re-checked in the browser exactly as the server checks it:
   the number agrees with the per-question scores, skipped answers score 0 and
   cap the decision, the label may be harsher than the number but never kinder,
   and every quote is real. */
function checkAIVerdict(res, turns){
  if(!res || typeof res !== 'object') return null;
  turns = arr(turns).filter(function(t){ return t && typeof t === 'object'; });
  var n = turns.length, corpus = turns.map(function(t){ return String(t.a == null ? '' : t.a).slice(0, 2500); }).join(' ' + SEP + ' ');   // their answers only, never across two
  var figs = [corpus].concat(turns.map(function(t){ return metaFigs(t.meta); })).join(' ' + SEP + ' ');   // + what was measured on them
  var skipped = {}, nSkip = 0, dropped = 0, nr = turns.filter(notReached).length;
  turns.forEach(function(t, i){ if(unanswered(t)){ skipped[i] = 1; nSkip++; } });
  function keep(v, m){ var s = scrubText(v, corpus, m, null, figs); if(s == null){ dropped++; return ''; } return s; }
  var raw = arr(res.per_question).filter(function(p){ return p && typeof p === 'object' && !p.skipped; });
  var scored = rescale(raw.map(function(p){ return numOf(p.score); }), 10), perQ = {};
  raw.forEach(function(p, k){
    var i = numOf(p.i); if(i == null) return; i = Math.trunc(i);         // the server's normalized, 0-based index
    if(i < 0 || i >= n || perQ[i] || skipped[i]) return;
    perQ[i] = { i: i, score: scored[k] == null ? null : clamp(roundHalfUp(scored[k]), 1, 10), note: keep(p.note, 260), fix: keep(p.fix, 260) };
  });
  var committee = Object.keys(perQ).filter(function(k){ return perQ[k].score != null; }).length;
  Object.keys(skipped).forEach(function(i){ perQ[i] = skipEntry(turns[i], +i); });
  var means = [];
  turns.forEach(function(t, i){
    if(perQ[i] && perQ[i].score != null){ means.push(perQ[i].score); return; }
    var q = numOf(t.overall); if(q == null) return; q = clamp(roundHalfUp(q), 1, 10); means.push(q); if(perQ[i]) perQ[i].score = q;
  });
  var ov = numOf(res.overall);   // already on the 0-100 scale: the server normalised it
  if(ov == null && !committee) return null;
  var mains = turns.filter(function(t, i){ return !t.follow && !skipped[i]; }).length;
  var ovc = ov == null ? null : clamp(ov, 0, 100), o = verdictOverall(ovc, means, n, nSkip, mains);
  if(o == null) return null;
  var thin = o < (verdictOverall(ovc, means, n, nSkip) || 0);
  var want = decisionFor(o), dec = DECISIONS.indexOf(res.decision) >= 0 ? res.decision : want, gap = DECISIONS.indexOf(want) - DECISIONS.indexOf(dec);
  if(!(gap >= 0 && gap <= 1)) dec = want;   // one step harsher is allowed; kinder never
  // A decision or score corrected here: the headline was written for the other call.
  var corrected = dec !== res.decision || (ovc != null && decisionFor(ovc) !== decisionFor(o));
  var reasons = arr(res.reasons).map(function(x){ return keep(x, 300); }).filter(Boolean).slice(0, 5);
  if(thin && !reasons.some(function(r){ return /^Only \d+ main question/.test(r); })) reasons.unshift(thinReason(mains));
  if(nSkip && !reasons.some(function(r){ return SKIP_REASON_RE.test(r); })) reasons.unshift(skipReason(nSkip, n, nr));
  return {
    source: 'ai', decision: dec, label: DECISION_LABEL[dec], overall: o, headline: corrected ? '' : keep(res.headline, 260), answered: n - nSkip, asked: n,
    reasons: reasons.slice(0, 5), strengths: arr(res.strengths).map(function(x){ return keep(x, 260); }).filter(Boolean).slice(0, 4),
    bar_raiser: arr(res.bar_raiser).map(function(x){ return keep(x, 300); }).filter(Boolean).slice(0, 5),
    per_question: Object.keys(perQ).map(function(k){ return perQ[k]; }).sort(function(x, y){ return x.i - y.i; }),
    top_fixes: arr(res.top_fixes).map(function(f){ var t = f && typeof f === 'object' ? f.fix : f; var s = scrubText(t, corpus, 260, null, figs); if(s == null){ dropped++; return null; } return s ? { fix: s, drill: f && DRILL_TOOLS.indexOf(f.drill) >= 0 ? f.drill : 'hot' } : null; }).filter(Boolean).slice(0, 4),
    competencies: arr(res.competencies).filter(function(c){ return c && typeof c === 'object' && str(c.name, 40); }).map(function(c){ var nm = scrubText(c.name, corpus, 40, null, figs); if(nm == null){ dropped++; return null; } var r = numOf(c.rating); return { name: nm, rating: clamp(roundHalfUp(r == null ? 3 : r), 1, 5), evidence: keep(c.evidence, 200) }; }).filter(Boolean).slice(0, 8),
    unverified_quotes: (numOf(res.unverified_quotes) || 0) + dropped
  };
}
var DRILL_TOOLS = ['hot', 'xray', 'gauntlet', 'forge', 'tmays', 'grill', 'predict', 'drill', 'ask', 'dossier', 'neg'];

/* ============================================================ PROGRESS & READINESS */
function sessionScore(s){ return s && s.verdict && typeof s.verdict.overall === 'number' ? s.verdict.overall : null; }
function progress(sessions){
  var list = arr(sessions).filter(function(s){ return s && typeof s === 'object' && sessionScore(s) != null; }).sort(function(a, b){ return String(a.at).localeCompare(String(b.at)); });
  if(!list.length) return { count: 0 };
  var dims = {};
  DIMS.concat(['delivery']).forEach(function(k){
    var vals = list.map(function(s){ return s.dims && typeof s.dims[k] === 'number' ? s.dims[k] : null; }).filter(function(v){ return v != null; });
    if(vals.length) dims[k] = { first: vals[0], last: vals[vals.length - 1], avg: round1(avg(vals)), recent: round1(avg(vals.slice(-3))), delta: round1(vals[vals.length - 1] - vals[0]), n: vals.length };
  });
  // Ranked as the verdict ranks them: out of each dimension's real maximum, rule-based relevance only
  // when a relevance problem was seen - and the fix aimed the way the recent answers actually went.
  var recentS = list.slice(-3), ruleBased = !recentS.some(function(s){ return s.source === 'ai'; });
  var relevanceSeen = recentS.some(function(s){ return s.source === 'ai' || arr(s.issues).some(function(k){ return RELEVANCE_ISSUES.indexOf(k) >= 0; }); });
  var rd = {}; Object.keys(dims).forEach(function(k){ rd[k] = dims[k].recent; });
  // Ranking compares like with like: each session's relevance on a 5-point scale (a built-in one is out of 4).
  var relN = avg(recentS.map(function(s){ return s.dims && typeof s.dims.relevance === 'number' ? s.dims.relevance * (s.source === 'ai' ? 1 : 5 / 4) : null; }));
  if(relN != null) rd.relevance = relN;
  var keys = rankDims(rd, { delivery: true, ruleBased: false, relevanceOff: !relevanceSeen });
  var mt = [].concat.apply([], recentS.map(function(s){ return arr(s.turns).filter(function(t){ return t && typeof t === 'object' && !t.follow && !t.skipped && t.m && typeof t.m === 'object'; }); }));
  var dfc = lengthDeficits(mt.map(function(t){ return { seconds: t.m.seconds, qtype: t.qtype }; })), nShort = dfc.short, nLong = dfc.long;
  var nI = mt.reduce(function(n, t){ return n + (typeof t.m.is === 'number' ? t.m.is : typeof t.m.i === 'number' ? t.m.i : 0); }, 0), nW = mt.reduce(function(n, t){ return n + (typeof t.m.ws === 'number' ? t.m.ws : typeof t.m.we === 'number' ? t.m.we : 0); }, 0);
  var issueCount = {};
  list.forEach(function(s){ arr(s.issues).forEach(function(k){ issueCount[k] = (issueCount[k] || 0) + 1; }); });
  var days = uniq(list.map(function(s){ return String(s.at).slice(0, 10); }));
  var scores = list.map(sessionScore);
  return {
    count: list.length, last: list[list.length - 1], best: list.slice().sort(function(a, b){ return sessionScore(b) - sessionScore(a); })[0],
    trend: list.slice(-12).map(function(s){ return { at: s.at, overall: sessionScore(s), decision: s.verdict.decision, difficulty: s.difficulty }; }),
    dims: dims, weakest: keys[0] || null, strongest: keys[keys.length - 1] || null, ranked: keys, ruleBased: ruleBased, dir: { short: nShort > nLong, iHeavy: nI > 0 && nI >= nW },
    recurring: Object.keys(issueCount).sort(function(a, b){ return issueCount[b] - issueCount[a]; }).slice(0, 4).map(function(k){ return { key: k, count: issueCount[k], text: ISSUE_TEXT[k] || k }; }),
    days: days.length, recentAvg: Math.round(avg(scores.slice(-3))),
    // Improvement compares the earliest sessions with the latest (never the same ones twice).
    firstAvg: Math.round(avg(scores.slice(0, Math.max(1, Math.min(3, Math.floor(scores.length / 2)))))), delta: scores.length < 2 ? 0 : Math.round(avg(scores.slice(-Math.max(1, Math.min(3, Math.floor(scores.length / 2))))) - avg(scores.slice(0, Math.max(1, Math.min(3, Math.floor(scores.length / 2))))))
  };
}
function readiness(st){
  st = st || {};
  var p = progress(st.sessions), perf = p.count ? p.recentAvg : null;
  var jd = st.jd ? (typeof st.jd === 'string' ? parseJD(st.jd) : st.jd) : null;
  var cov = jd && jd.competencies.length ? jdCoverage(jd, st.stories) : coverage(st.stories);
  var checks = [
    { key: 'tmays', label: '"Tell me about yourself" ready', done: !!st.tmays, tool: 'tmays' },
    { key: 'asks', label: '3+ questions to ask them', done: arr(st.asks).length >= 3, tool: 'ask' },
    { key: 'stories', label: '3+ stories in your bank', done: arr(st.stories).length >= 3, tool: 'forge' },
    { key: 'mock', label: 'At least one judged mock', done: p.count > 0, tool: 'hot' }
  ];
  if(st.company) checks.splice(2, 0, { key: 'dossier', label: 'Researched ' + st.company, done: !!st.dossier, tool: 'dossier' });
  var prep = Math.round(checks.filter(function(c){ return c.done; }).length / checks.length * 100);
  var score = perf == null ? Math.min(60, Math.round(0.5 * cov.pct + 0.5 * prep)) : Math.round(0.5 * perf + 0.25 * cov.pct + 0.25 * prep);
  return { score: score, perf: perf, coverage: cov.pct, prep: prep, checks: checks, measured: perf != null, cov: cov, progress: p,
    note: perf == null ? 'Capped at 60% until you\'ve been judged - run a Hot Seat session to measure how you actually perform.' : 'Half of this is how you actually performed in your last ' + Math.min(3, p.count) + ' judged session' + (p.count === 1 ? '' : 's') + '.' };
}

/* ============================================================ TELL ME ABOUT YOURSELF */
var NAT_ADJ = 'Canadian|American|British|Irish|Scottish|Welsh|English|Australian|Indian|Nigerian|Kenyan|Ghanaian|Chinese|Japanese|Korean|French|German|Spanish|Italian|Portuguese|Brazilian|Mexican|Polish|Dutch|Swedish|Norwegian|Danish|Finnish|Russian|Ukrainian|Turkish|Greek|Egyptian|Pakistani|Bangladeshi|Filipino|Vietnamese|Thai|Malaysian|Singaporean|Indonesian|Jamaican|Colombian|Argentinian|Peruvian|Chilean|Lebanese|Iranian|Israeli|Saudi|Emirati|Swiss|Austrian|Belgian|Romanian|Hungarian|Czech|Slovak|Bulgarian|Serbian|Croatian|Nepali|Ethiopian|Kiwi|Texan|Londoner|Originally|Based|Bilingual|Fluent|Half|South|North|New|From|Here|Glad|Happy|Thrilled|Grateful|Delighted|Honoured|Honored';
// "Hi everyone, I'm Tom", "Good morning, I'm Tom Baker", "So, I'm Tom", "Myself Rahul Sharma", "I am Rahul Sharma from Pune",
// "This is Priya", "I'm José", "I'm Ana de la Cruz" - and never "I'm Canadian, and..." or "I'm Head of Data".
var TMAYS_NAME_RE = new RegExp("^(?:(?:[Hh]i|[Hh]ello|[Hh]ey|[Gg]ood (?:morning|afternoon|evening))(?: there| everyone| all| team| folks)?[,!.]?\\s+)?(?:(?:[Ss]o|[Ww]ell|[Oo]kay|OK|[Rr]ight)[,]?\\s+)?(?:I[’']?m|I am|[Tt]his is|[Mm]yself)\\s+(?!(?:Head|Director|Lead|Senior|Junior|Manager|Chief|Principal|Staff|Data|Product|Software|Vice|Associate|Assistant|Executive|Interim|Acting|Founder|Co-founder|Currently|Now|Very|Really|Passionate|Excited|" + NAT_ADJ + ")\\b)(?!\\p{Lu}[\\p{Ll}]*-born\\b)\\p{Lu}[\\p{Ll}'’-]+(?:\\s+(?:(?:de|la|del|da|di|van|von|der|le|bin|al|el|du|dos|das)\\s+){0,2}\\p{Lu}[\\p{Ll}'’-]+)?\\s*(?:,|\\.|-|–|—|and\\b|from\\b|$)", 'u');
function tmaysCheck(text, seconds){
  var a = analyzeAnswer(text, { qtype: 'tell', seconds: seconds, mode: seconds ? 'voice' : 'text' });
  // Opening with your name: "My name is ..." or "I'm Priya and / , ..." - not "I'm passionate and ..." or "I'm Head of Data".
  // A greeting on its own ("Hello!") isn't the opening line - the name test looks at what follows it.
  var first = a.sentences[0] || '';
  if(/^(?:hi|hello|hey|good (?:morning|afternoon|evening)|thanks?(?: you)?(?: (?:so|very) much)?(?: for (?:having me|the opportunity|inviting me|your time))?)(?: there| everyone| all| team| folks)?[\s,!.]*$/i.test(first) && a.sentences[1]) first = a.sentences[1];
  var wastes = /\b(?:my name(?: is|'s)|so,? um)\b/i.test(first) || TMAYS_NAME_RE.test(first);
  var tips = [];
  if(wastes) tips.push('Don\'t open with your name - they have your resume. Open with what you do now.');
  if(!a.ppf.present) tips.push('Start in the present: what you do now, in one line.');
  if(!a.ppf.past) tips.push('Add one or two past moments that explain how you got here.');
  if(!a.ppf.future) tips.push('Land on why THIS role is the obvious next step.');
  if(a.seconds > 120) tips.push('Too long - keep it under 90 seconds.'); else if(a.seconds < 40) tips.push('Too short - give them a story, not a headline (aim for 60-90 seconds).');
  if(!a.quantified && !a.properNouns) tips.push('One concrete detail (a place, a result) makes it memorable.');
  return { analysis: a, present: a.ppf.present, past: a.ppf.past, future: a.ppf.future, opensWithName: wastes, tips: tips, seconds: a.seconds,
    score: clamp((a.ppf.present ? 1 : 0) + (a.ppf.past ? 1 : 0) + (a.ppf.future ? 1 : 0) + (a.seconds >= 45 && a.seconds <= 110 ? 1 : 0) + (wastes ? 0 : 1), 0, 5) };
}

/* ============================================================ NEGOTIATION */
/* A real yes - not "a big deal for me", "not a deal-breaker", "I'll take it under
   consideration", "I can't accept that" or a conditional "if you can do X, deal". */
/* Asking for time: "get back to you by Friday", "think it over", "take it to my family". */
var TIME_ASK_RE = /\b(?:time to (?:think|consider|review|talk)|get back to you|come back to you|circle back|sleep on it|think (?:it|this|that) over|mull it over|review (?:it|this|the (?:offer|package|full package|paperwork|contract))|look (?:it|this|the offer) over|talk (?:it )?(?:over )?with my (?:partner|family|wife|husband|spouse)|take (?:it|this|that) (?:to|back to) my|a (?:few|couple of) days|over the weekend|this weekend|by (?:monday|tuesday|wednesday|thursday|friday|tomorrow|end of)|talk again)\b/i;
/* The figures in a negotiation line - "$95,000", "95k", "95 thousand", and a bare "95" when the
   offer is in the tens of thousands - leaving out a restated offer ("you offered 85,000", "the
   $85,000", "how you got to 85,000?"). */
function negNumbers(text, offer){
  var t = apos(text), out = [], m, re = /(\$\s?)?\b(\d[\d,]*(?:\.\d+)?)\s*(k\b|thousand\b|grand\b)?/gi;
  offer = Number(offer) || 0;
  while((m = re.exec(t))){
    var v = parseFloat(m[2].replace(/,/g, '')); if(!isFinite(v)) continue;
    if(m[3]) v *= 1000; else if(!m[1] && offer >= 10000 && v >= 50 && v < 1000 && !/^\s*(?:%|percent|days?|weeks?|months?|years?|hours?|people|minutes?)\b/i.test(t.slice(m.index + m[0].length))) v *= 1000;
    if(v < 1000) continue;
    var before = t.slice(Math.max(0, m.index - 30), m.index).toLowerCase(), after = t.slice(m.index + m[0].length, m.index + m[0].length + 6);
    if(offer && v === offer && (/\b(?:you offered|you said|your offer of|offer of|the)\s*\$?\s*$/.test(before) || /\b(?:to|at|from)\s*\$?\s*$/.test(before) && /^\s*\?/.test(after))) continue;   // their own offer, restated
    out.push(v);
  }
  return out;
}
function acceptedLine(text, ctx){
  var s = apos(text).trim(); ctx = ctx || {};
  // A line that asks for more time, or more money than is on the table, is never a yes - however it starts.
  if(TIME_ASK_RE.test(s)) return false;
  var cur = Number(ctx.current || ctx.offer) || 0;
  if(cur && negNumbers(s, cur).some(function(v){ return v > cur; })) return false;
  if(/\b(?:still|however|hoping|although|though)\b/i.test(s)) return false;
  // A yes, not a word that merely contains one: "No deal.", "a deal-breaker", "a better deal", "I accept that
  // budgets are tight, but...", "I accept your reasoning", "I'll take that into account" are not acceptances.
  if(!/(?:\bit's a deal\b(?![-\w])|(?:^|[.!?]\s*)deal[.!]*\s*(?=$|[A-Z])|\byou've got a deal\b(?![-\w])|\bwe (?:have|got) a deal\b|\bi accept\b(?!\s+(?:that|your|the (?:reasoning|point|constraints?|logic|argument|budget|limits?|situation|band|range))\b)(?!\s+[a-z]+\s+(?:reasoning|point|constraints?|logic))|\bi'll (?:accept|take) (?:it|the offer|that|this|the \$?\s?\d[\d,]*k?)\b(?!\s+(?:under|into)\s+(?:consideration|account))(?!\s+(?:back|to|home|from here|up with|on board))|\bi'd be (?:happy|glad|delighted|thrilled) to accept\b|\b(?:happy|glad|delighted|thrilled) to accept\b|\bi'm in\b(?!\s+[a-z])|\bi'll sign\b|\bsend (?:it|the (?:paperwork|offer|contract)) over\b|\bplease send (?:the|it) (?:paperwork|offer|contract|over)\b|\blet's (?:go with (?:that|it)|move forward|do (?:it|this)\s*[.!]*\s*$)|\bthat works for me\b(?!\s+as\s+a\s+time)|\bi can accept (?:that|it|the offer)\b(?!\s+[a-z])|\bsounds good,? (?:i'll|let's) (?:sign|take|accept|do)|\bi'm happy with (?:that|it|the offer)\b|\byes,? (?:i accept|let's do it|deal|i'll take it))/i.test(s)) return false;
  if(/\b(?:can't|cannot|won't|not|don't|unless|if you|only if|would|could|if we)\b[^.!?]{0,30}\b(?:accept|take (?:it|the offer|that)|deal|works)\b/i.test(s)) return false;
  // ...nor a conditional one: "That works for me only if the base gets to 95."
  if(/\b(?:accept|deal|works for me|take it|do it|i'm in|sign)\b[^.!?]{0,30}\b(?:but|only if|if|unless|provided|as long as|once)\b/i.test(s)) return false;
  return true;
}
function negotiationCheck(text, ctx){
  ctx = ctx || {};
  var t = apos(text), low = t.toLowerCase(), notes = [], good = [];
  var nums = negNumbers(t, ctx.offer || ctx.current);
  var enthusiasm = /\b(?:excited|thrilled|love (?:the|this)|really (?:want|like)|great fit|looking forward|appreciate)\b/i.test(t);
  var justified = /\b(?:because|based on|given (?:my|the)|my experience|the scope|the responsibilities|i bring|competing offer|other offer)\b/i.test(t);
  var timeAsk = TIME_ASK_RE.test(t);
  // Levers beyond base pay ("review" only as a pay review, never "review the offer").
  var levers = (low.match(/\b(?:signing bonus|sign-on|equity|stock|pto|vacation|start date|remote|hybrid|title|(?:performance|compensation|salary|pay) review|review in (?:\d+|three|six|twelve) months|relocation|bonus|education budget|learning budget)\b/g) || []);
  var accepted = acceptedLine(t, ctx);
  var apolog = /\b(?:sorry|i know it's a lot|if that's (?:ok|okay|alright)|i hope (?:that's|it's) not|don't want to be greedy|if possible)\b/i.test(t);
  // Disclosing is saying YOUR current number; declining to share it is the advice, and gets the credit.
  var declined = /\b(?:rather not|prefer not to|won't|will not|not going to|don't want to|do not want to|not comfortable)\s+(?:share|discuss|disclose|say|get into|talk about)\b|\b(?:current|my) (?:salary|pay|comp|compensation|base)\b[^.!?]{0,30}\b(?:isn't|is not|not really|not) (?:relevant|important|the point)\b/i.test(t);
  var disclosed = !declined && /(?:\bi(?:'m| am) (?:currently |now |being )?(?:making|paid|earning|getting|on)(?!\s+(?:board|the same page|track|it|that|a call|leave|holiday|vacation|the fence)\b)|\bi (?:currently |now )?(?:make|earn|get paid|take home)|\bmy (?:current )?(?:salary|pay|comp|compensation|base)(?: right now| today| currently)? (?:is|was|sits at|comes to|of))\b(?![^.!?]{0,40}?\b(?:need|want|hoping|asking|looking for)\b)[^.!?]{0,40}?\$?\s?\d/i.test(t);
  var dm = disclosed ? /(?:\bi(?:'m| am) (?:currently |now |being )?(?:making|paid|earning|getting|on)|\bi (?:currently |now )?(?:make|earn|get paid|take home)|\bmy (?:current )?(?:salary|pay|comp|compensation|base))[^.!?]*/i.exec(t) : null;
  var told = dm ? negNumbers(dm[0], ctx.offer || ctx.current) : [];
  var asks = nums.filter(function(v){ var k = told.indexOf(v); if(k >= 0){ told.splice(k, 1); return false; } return true; });   // what they ASKED for, not what they disclosed
  var target = Number(ctx.target) || null, anchored = target ? asks.some(function(v){ return v >= target; }) : asks.length > 0;
  if(enthusiasm) good.push('Showed enthusiasm - recruiters fight harder for people who clearly want the job.');
  if(justified) good.push('Justified the ask instead of just naming a number.');
  if(timeAsk) good.push('Asked for time - never decide on the spot.');
  if(declined) good.push('Kept your current pay to yourself - the number they anchor on stays theirs.');
  if(levers.length) good.push('Brought in other levers (' + uniq(levers).slice(0, 3).join(', ') + ').');
  if(anchored && target) good.push('Anchored at or above your target.');
  if(accepted && !ctx.final && !timeAsk) notes.push('You accepted too fast - there was probably more on the table.');
  if(apolog) notes.push('Apologising or hedging ("sorry", "if that\'s okay") invites a no.');
  if(disclosed) notes.push('You disclosed your current pay - that anchors them low. You can decline to share it.');
  if(asks.length && target && !anchored) notes.push('Your number was below your own target - you negotiated against yourself.');
  if(asks.length && !justified) notes.push('A number with no reason is easy to refuse - add the why.');
  return { score: clamp(2 + good.length - notes.length, 1, 5), good: good, notes: notes, numbers: nums, accepted: accepted };
}


/* ============================================================ OFFLINE HELPERS
   What the tools can still do with no AI: label sentences, check your
   questions-to-ask, plan drills from measured weak spots, play a recruiter. */
/* X-Ray's per-sentence read uses the same result tests as the judge: a figure after what you did, or a
   last line about how things stood afterwards, is the result - the labels never contradict the issues. */
function labelSentences(sents){
  sents = arr(sents);
  var iAct = new RegExp(I_ACTION_RE.source + '|' + PAST_I_RE.source, 'i'), weAct = new RegExp(PAST_WE_RE.source, 'i'), last = sents.length - 1;
  var fig = function(s){ return matchesOf(NUMBER_RE, s).some(function(m){ var x = clean(m.text); return x && !/^(?:19|20)\d\d$/.test(x); }); };
  var actedI = false, acted = false;
  return sents.map(function(s, i){
    var c = clean(s), w = words(c).length, part = 'context', note = '';
    var fill = matchesOf(FILLER_RE, c).length, hed = matchesOf(HEDGE_RE, c).length;
    var isAct = matchesOf(I_ACTION_RE, c).length > 0 || /^(?:so |then |and )?i (?:\w+ed|built|ran|made|took|wrote|led|set|got|went|put)\b/i.test(c);
    var isWe = !isAct && weAct.test(c);
    var after = !isAct && !isWe && ((actedI && fig(c)) || (i === last && i > 0 && acted && !/\b(?:i (?:don'?t|do not|didn'?t|did not) know|not sure|no idea)\b/i.test(c) && (STATE_AFTER_RE.test(c) || OUTCOME_CLAUSE_RE.test(c))));
    if(w <= 6 && (fill || /^(?:so yeah|yeah|and yeah|that'?s it|so that'?s|anyway)\b/i.test(c))) part = 'filler';
    else if(LESSON_RE.test(c)) part = 'lesson';
    else if(RESULT_RE.test(c) || (/\d/.test(c) && /\b(?:went|fell|rose|cut|grew|saved|from)\b/i.test(c)) || after) part = 'result';
    else if(TASK_RE.test(c)) part = 'task';
    else if(isAct) part = 'action';
    else if(i === 0) part = 'situation';
    else if(isWe) part = 'action';   // a team action is still an action - with the note below
    else if(SITUATION_RE.test(c) || AT_PLACE_RE.test(c)) part = 'situation';
    if(iAct.test(c) || /\b(?:so i|then i|i decided)\b/i.test(c)) actedI = true;
    if(iAct.test(c) || weAct.test(c)) acted = true;
    if(hed >= 2 || /^(?:i think|i guess|maybe|probably|i feel like)\b/i.test(c)){ note = 'Hedged - say it like you mean it.'; if(part === 'context') part = 'hedge'; }
    else if(fill >= 2) note = 'Filler-heavy.';
    if(!note && part === 'action' && /\bwe\b/i.test(c) && !/\bi\b/i.test(c)) note = 'Team action - what did YOU do?';
    if(!note && w > 40) note = 'Long sentence - split it.';
    return { i: i, part: part, note: note };
  });
}
function askCheck(q){
  var t = clean(q), low = t.toLowerCase(), flags = [];
  if(/\b(?:what does (?:the|your) company do\b(?!\s+(?:differently|now|next|to|about|when|if|better|well|for))|what do you (?:guys )?do\b(?!\s+(?:differently|when|if|to|about|for))|what is (?:the|your) mission|who are your competitors|how big is the company|how many (?:people|employees) work|when was the company founded)/.test(low)) flags.push({ key: 'googleable', text: 'Answerable from their website - ask what only an insider knows.' });
  if(/\b(?:salary|compensation|pay (?:range|band|scale|grade|rise)|(?:my|the) pay\b|how much (?:does|will|would) (?:it|this|the role) pay|vacation|pto|time off|benefits|work from home|wfh|bonus|(?:a|my|annual) raise|raises\b|how soon can i|perks)\b/.test(low)) flags.push({ key: 'mefirst', text: 'Comp and perks belong with the recruiter or at the offer - early, it reads as me-first.' });
  if(/^(?:do|does|did|is|are|can|will|would|have|has)\b/.test(low) && !/^(?:is there (?:anything|something)|are there any|do you have any (?:concerns|hesitations|reservations|doubts)|(?:can|could|would|will) you (?:please )?(?:tell|walk|describe|share|explain|talk|give|show|help me understand|paint|outline|run me through|take me through))\b/.test(low) && words(t).length < 12) flags.push({ key: 'yesno', text: 'Yes/no questions get yes/no answers - ask "how" or "what" instead.' });
  if(/\bdid i get (?:the|this) job\b|\bhow did i do\b/.test(low)) flags.push({ key: 'needy', text: 'Puts them on the spot. Ask "What would make someone great here in the first 90 days?" instead.' });
  var strong = /\b(?:success|first (?:30|60|90)|challenge|hardest|team|measure|look like|differently|trade-?off|priorit|why (?:is|did) this role|opened|decision)\b/.test(low) && words(t).length >= 7;
  return { ok: !flags.length, strong: strong && !flags.length, flags: flags };
}
var DRILL_PLANS = {
  structure: [{ title: 'X-Ray three answers', how: 'Paste three practice answers into the X-Ray. Rebuild each until every sentence is situation, action or result - cut the rest.', tool: 'xray', reps: '3 answers' }, { title: 'Rapid drill with a 90-second cap', how: 'Behavioral category, 90 seconds each. Say the situation in one sentence, then "So I...", then "The result was...".', tool: 'drill', reps: '6 questions' }],
  specificity: [{ title: 'Forge two real stories', how: 'In Story Forge, write two true stories with a name, a place and (only if you really have one) a number. No adjectives allowed.', tool: 'forge', reps: '2 stories' }, { title: 'Grill your own resume', how: 'Let the Resume Grill ask about your actual lines and answer each with one concrete example.', tool: 'grill', reps: '5 questions' }],
  ownership: [{ title: 'Run the Follow-up Gauntlet', how: 'Take your best story and survive five probes. Every answer must start with "I".', tool: 'gauntlet', reps: '1 story, 5 probes' }, { title: 'Hot Seat with a bar raiser', how: 'Bar raiser persona, Brutal. Count your "we"s on the replay - aim for more "I" than "we".', tool: 'hot', reps: '1 session' }],
  impact: [{ title: 'End every story on the result', how: 'X-Ray your answers and make sure the final sentence is labelled Result or Lesson. If you have no number, name the concrete change.', tool: 'xray', reps: '3 answers' }, { title: 'Gauntlet: measurement', how: 'Run the Gauntlet and answer "how did you know it worked?" without guessing.', tool: 'gauntlet', reps: '1 story' }],
  relevance: [{ title: 'Answer first, then prove it', how: 'Hot Seat, Tough. Your first sentence must directly answer the question asked.', tool: 'hot', reps: '1 session' }, { title: 'Predict, then rehearse', how: 'Run the Question Predictor on the job description and rehearse the top five out loud.', tool: 'predict', reps: '5 questions' }],
  concision: [{ title: 'Rapid drill at 60 seconds', how: 'Any category, 60 seconds per answer. Stop when the timer turns red, even mid-sentence.', tool: 'drill', reps: '8 questions' }, { title: 'Hot Seat with interruptions on', how: 'Brutal difficulty cuts you off at the time limit. Get every answer in under it.', tool: 'hot', reps: '1 session' }],
  delivery: [{ title: 'Replay and count', how: 'Hot Seat in voice mode, then replay each answer. Replace every filler with a one-beat pause.', tool: 'hot', reps: '1 session' }, { title: 'Tell me about yourself, timed', how: 'Rehearse your opener out loud until it lands in 60-90 seconds with no fillers.', tool: 'tmays', reps: '5 takes' }]
};
var MANTRAS = { structure: 'Situation. What I did. What changed.', specificity: 'Proof, not adjectives.', ownership: 'Say "I".', impact: 'Land the result.', relevance: 'Answer first.', concision: 'Shorter wins.', delivery: 'Pause, don\'t fill.' };
// The same weak dimension the other way round: answers too SHORT to be concise, or all "I" with no action in it.
var DRILL_PLANS_ALT = {
  concision: [{ title: 'X-Ray the missing piece', how: 'X-Ray three answers and add whatever is missing - the situation, what you did, or the result - until every answer has all three.', tool: 'xray', reps: '3 answers' }, { title: 'Forge one full story', how: 'Build one true story in Story Forge - where it was, what you did, how it ended - then say it out loud in 60-120 seconds.', tool: 'forge', reps: '1 story' }],
  ownership: [{ title: 'Run the Follow-up Gauntlet', how: 'Take your best story and survive five probes. Each answer must name a decision you made and why you made it.', tool: 'gauntlet', reps: '1 story, 5 probes' }, { title: 'X-Ray your actions', how: 'X-Ray two answers: every action sentence should say what you chose or did - not what happened around you.', tool: 'xray', reps: '2 answers' }]
};
var MANTRAS_ALT = { concision: 'Situation. Action. Result.', ownership: 'Name the decision.' };
function localDrills(p){
  var w = (p && p.weakest && DRILL_PLANS[p.weakest]) ? p.weakest : 'ownership', d = p && p.dims && p.dims[w], dir = (p && p.dir) || {};
  var alt = (w === 'concision' && dir.short) || (w === 'ownership' && dir.iHeavy);
  return { source: 'local', focus: DIM_LABEL[w], key: w, why: d ? 'Your ' + DIM_LABEL[w].toLowerCase() + ' has averaged ' + d.recent + '/' + dimMax(w, p.ruleBased) + ' in your recent judged sessions - your lowest dimension.' : 'Ownership is the most common reason strong candidates get a "no".', drills: alt ? DRILL_PLANS_ALT[w] : DRILL_PLANS[w], mantra: alt ? MANTRAS_ALT[w] : MANTRAS[w] };
}
/* The offline recruiter: a small, honest script. Concedes only when the
   candidate earns it, and never past the hidden practice budget. */
function localRecruiter(st, line){
  st.turn = (st.turn || 0) + 1;
  var fmt = function(n){ return '$' + Math.round(n).toLocaleString('en-US'); };
  if(!line) return { reply: 'Thanks for your time through the process - we\'d love to have you. We\'re offering ' + fmt(st.current) + ' base. How does that sound?', tactic: 'opening offer', offer_now: st.current, done: false };
  var chk = negotiationCheck(line, { target: st.target, offer: st.offer || st.current, current: st.current }), room = Math.max(0, st.ceiling - st.current);
  var step = (st.offer || st.current) >= 20000 ? 500 : 50;   // a $3,000 monthly offer moves in fifties, not five hundreds
  if(chk.accepted) return { reply: 'Wonderful - I\'ll send the written offer at ' + fmt(st.current) + ' today.', tactic: 'close', offer_now: st.current, done: true, coach: chk };
  if(st.turn >= 6) return { reply: 'I\'ve taken this as far as I can - ' + fmt(st.current) + ' is our final number. Shall I send it over?', tactic: 'final offer', offer_now: st.current, done: true, coach: chk };
  var earned = chk.good.length - chk.notes.length;
  if(chk.numbers.length && earned >= 2 && room > 0){ st.current = Math.min(st.ceiling, st.current + Math.max(step, Math.round(room * 0.55 / step) * step)); return { reply: 'That\'s a fair case. I went back to the team - we can do ' + fmt(st.current) + '.', tactic: 'concession', offer_now: st.current, done: false, coach: chk }; }
  if(chk.numbers.length && earned >= 1 && room > 0){ st.current = Math.min(st.ceiling, st.current + Math.max(step, Math.round(room * 0.25 / step) * step)); return { reply: 'I hear you. I can stretch a little, to ' + fmt(st.current) + ', but that\'s close to the top of the band.', tactic: 'small concession', offer_now: st.current, done: false, coach: chk }; }
  if(/\b(?:signing|sign-on|bonus|equity|pto|vacation|start date|remote|title|(?:performance|compensation|salary|pay) review)\b/i.test(line) && !st.lever){ st.lever = true; return { reply: 'Base is tight, but I may have flexibility elsewhere - would a signing bonus or an earlier compensation review help?', tactic: 'trade to non-salary', offer_now: st.current, done: false, coach: chk }; }
  if(chk.notes.some(function(n){ return /current pay/.test(n); })) return { reply: 'Thanks for sharing. Given your current pay, ' + fmt(st.current) + ' is already a nice step up.', tactic: 'anchor on current salary', offer_now: st.current, done: false, coach: chk };
  if(!st.pressured){ st.pressured = true; return { reply: 'I\'ll be candid - we have other finalists, and I\'d need an answer by Friday to hold this.', tactic: 'exploding deadline', offer_now: st.current, done: false, coach: chk }; }
  return { reply: 'This is the standard band for the role. Is there something specific that would get you to a yes?', tactic: 'standard band', offer_now: st.current, done: false, coach: chk };
}

/* ============================================================ misc helpers */
function parseJSONLoose(text){
  if(typeof text !== 'string') return null;
  var t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try{ return JSON.parse(t); }catch(e){}
  var i = Math.min.apply(null, [t.indexOf('{'), t.indexOf('[')].filter(function(x){ return x >= 0; }).concat([Infinity]));
  if(!isFinite(i)) return null;
  var open = t[i], close = open === '{' ? '}' : ']', depth = 0, inStr = false, escp = false;
  for(var k = i; k < t.length; k++){
    var c = t[k];
    if(inStr){ if(escp) escp = false; else if(c === '\\') escp = true; else if(c === '"') inStr = false; continue; }
    if(c === '"') inStr = true; else if(c === open) depth++; else if(c === close){ depth--; if(depth === 0){ try{ return JSON.parse(t.slice(i, k + 1)); }catch(e){ return null; } } }
  }
  return null;
}
/* A compact, honest summary of practice data for the AI drill coach. */
function practiceSummary(sessions){
  var p = progress(sessions); if(!p.count) return '';
  var lines = ['Judged sessions: ' + p.count + ' (recent average ' + p.recentAvg + '/100, change since first sessions ' + (p.delta >= 0 ? '+' : '') + p.delta + ').'];
  Object.keys(p.dims).forEach(function(k){ lines.push(DIM_LABEL[k] + ': recent ' + p.dims[k].recent + '/5 (first ' + p.dims[k].first + ').'); });
  p.recurring.forEach(function(r){ lines.push('Recurring issue (' + r.count + ' sessions): ' + r.text); });
  var last = p.last; if(last && last.delivery){ var d = last.delivery; lines.push('Last spoken session: ' + (d.wpm ? d.wpm + ' wpm, ' : '') + d.fillersPerMin + ' fillers/min, longest pause ' + d.longestPause + 's, ' + d.overTime + ' answers over time.'); }
  return lines.join('\n').slice(0, 2800);
}

root.INTERVIEW_STUDIO_ENGINE = {
  esc: esc, clean: clean, words: words, uniq: uniq, uid: uid, clamp: clamp, avg: avg, fmtSecs: fmtSecs, rng: rng, shuffle: shuffle,
  sentences: sentences, verifyQuote: verifyQuote, quotesOk: quotesOk, figList: figList, qtoks: qtoks, fragmentAt: fragmentAt,
  quotedSpans: quotedSpans, scrubText: scrubText, scrubResult: scrubResult, corpusOf: corpusOf, contradictionOk: contradictionOk,
  mtoks: mtoks, SEP: SEP, squash: squash, numFmt: numFmt, claimText: claimText, figures: figures, unsupportedNumbers: unsupportedNumbers, attributionsOk: attributionsOk, metaFigs: metaFigs, hasContent: hasContent, speakerIsCandidate: speakerIsCandidate,
  adviceText: adviceText, sayThis: sayThis, ADVICE_FIG_RES: ADVICE_FIG_RES, ADV_DELIVERY: ADV_DELIVERY, ADV_CLAIM_SIG: ADV_CLAIM_SIG, ADV_SENT_SPLIT: ADV_SENT_SPLIT, ADVICE_PLAIN_RES: ADVICE_PLAIN_RES, ADV_ANSWER_CUE: ADV_ANSWER_CUE, ADV_OUTCOME: ADV_OUTCOME, SAY_CUE_RE: SAY_CUE_RE, SAY_LEAD_RE: SAY_LEAD_RE,
  COMPETENCIES: COMPETENCIES, CORE_COMPS: CORE_COMPS, compLabel: compLabel, CATS: CATS, BANK: BANK, BANK_BY_ID: BANK_BY_ID, TARGETS: TARGETS, targetFor: targetFor, qtypeOf: qtypeOf,
  analyzeAnswer: analyzeAnswer, scoreAnswer: scoreAnswer, overall10: overall10, DIMS: DIMS, DIM_LABEL: DIM_LABEL, localIssues: localIssues, ISSUE_TEXT: ISSUE_TEXT,
  pickFollowUp: pickFollowUp, judgeLocal: judgeLocal, checkAIJudgement: checkAIJudgement, harsh: harsh, numOf: numOf, rescale: rescale, turnOverall: turnOverall,
  unanswered: unanswered, notReached: notReached, skipReason: skipReason, NOT_REACHED_NOTE: NOT_REACHED_NOTE, verdictOverall: verdictOverall, numify: numify, acceptedLine: acceptedLine, roundHalfUp: roundHalfUp, nonAnswer: nonAnswer,
  MEASURED_ISSUES: ['long', 'short', 'we', 'hedge', 'cliche'],
  parseJD: parseJD, storyComps: storyComps, coverage: coverage, jdCoverage: jdCoverage,
  PERSONAS: PERSONAS, DIFFS: DIFFS, FOCI: FOCI, resumeProbes: resumeProbes, planLocal: planLocal,
  numericClaims: numericClaims, consistency: consistency, honestyCheck: honestyCheck,
  estimatePitch: estimatePitch, analyzeFrames: analyzeFrames,
  DECISIONS: DECISIONS, DECISION_LABEL: DECISION_LABEL, decisionFor: decisionFor, sessionDims: sessionDims, deliverySummary: deliverySummary,
  localVerdict: localVerdict, checkAIVerdict: checkAIVerdict, FIX_FOR: FIX_FOR, DRILL_FOR: DRILL_FOR,
  progress: progress, readiness: readiness, tmaysCheck: tmaysCheck, negotiationCheck: negotiationCheck, parseJSONLoose: parseJSONLoose, practiceSummary: practiceSummary,
  labelSentences: labelSentences, askCheck: askCheck, judgeProbe: judgeProbe, fromTo: fromTo, concreteAnchor: concreteAnchor, notEnglish: notEnglish, localDrills: localDrills, DRILL_PLANS: DRILL_PLANS, DRILL_PLANS_ALT: DRILL_PLANS_ALT, fixFor: fixFor, drillFor: drillFor, dimMax: dimMax, rankDims: rankDims, localRecruiter: localRecruiter, issueText: issueText
};
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================================
   PART 2 - VOICE. The browser's own speech stack, wrapped so every call is
   feature-detected and the interview can always continue by typing.
   - Speech-to-text: SpeechRecognition (Chrome/Edge/Safari). Continuous, with
     interim captions, auto-restarted when the browser ends a session early.
   - Text-to-speech: speechSynthesis, with a timeout so an engine that never
     fires 'end' can't freeze the interview.
   - Mic: one getUserMedia stream feeds a Web Audio meter (loudness + pitch
     frames -> pauses, start latency, pitch variation) and a MediaRecorder
     (replay, kept in memory only).
   ========================================================================== */
(function(root){
'use strict';
var E = root.INTERVIEW_STUDIO_ENGINE;
function SR(){ return root.SpeechRecognition || root.webkitSpeechRecognition || null; }
function now(){ return (root.performance && typeof root.performance.now === 'function') ? root.performance.now() : Date.now(); }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

var V = {};
V.support = function(){
  var nav = root.navigator || {}, md = nav.mediaDevices;
  return {
    stt: !!SR(),
    tts: !!(root.speechSynthesis && root.SpeechSynthesisUtterance),
    mic: !!(md && typeof md.getUserMedia === 'function'),
    rec: typeof root.MediaRecorder !== 'undefined',
    audio: !!(root.AudioContext || root.webkitAudioContext)
  };
};

/* ------------------------------------------------------------- speaking */
V.voices = function(){
  try{ return (root.speechSynthesis.getVoices() || []).filter(function(v){ return /^en(-|_|$)/i.test(v.lang || ''); }); }catch(e){ return []; }
};
V.onVoices = function(cb){ try{ if(root.speechSynthesis && 'onvoiceschanged' in root.speechSynthesis) root.speechSynthesis.onvoiceschanged = cb; }catch(e){} };
function preferredVoice(vs){
  var order = [/Google US English/i, /Samantha/i, /Microsoft (Aria|Jenny|Guy) Online/i, /Daniel/i, /Alex/i, /en-US/i];
  for(var i = 0; i < order.length; i++){ var hit = vs.filter(function(v){ return order[i].test(v.name + ' ' + v.lang); })[0]; if(hit) return hit; }
  return vs[0] || null;
}
V.speaking = false;
V.speak = function(text, opts){
  opts = opts || {};
  return new Promise(function(resolve){
    var t = String(text || '').trim();
    if(!t || !V.support().tts){ resolve(false); return; }
    var done = false, timer = null;
    function fin(ok){ if(done) return; done = true; V.speaking = false; if(timer) clearTimeout(timer); resolve(ok); }
    try{
      root.speechSynthesis.cancel();
      var u = new root.SpeechSynthesisUtterance(t.slice(0, 700));
      var vs = V.voices(), pick = opts.voiceURI ? vs.filter(function(v){ return v.voiceURI === opts.voiceURI; })[0] : null;
      u.voice = pick || preferredVoice(vs) || null;
      u.lang = (u.voice && u.voice.lang) || 'en-US';
      u.rate = clamp(Number(opts.rate) || 1, 0.6, 1.5);
      u.pitch = clamp(Number(opts.pitch) || 1, 0.5, 1.5);
      u.onend = function(){ fin(true); };
      u.onerror = function(){ fin(false); };
      // Some engines never fire 'end': a generous length-based timeout keeps the interview moving.
      timer = setTimeout(function(){ fin(true); }, 2500 + t.split(/\s+/).length * 600 / u.rate);
      V.speaking = true;
      root.speechSynthesis.speak(u);
    }catch(e){ fin(false); }
  });
};
V.stopSpeaking = function(){ try{ if(root.speechSynthesis) root.speechSynthesis.cancel(); }catch(e){} V.speaking = false; };

/* ------------------------------------------------------------------ mic */
var micStream = null, micPending = null, ctx = null;
/* One mic at a time: a second request while the first is still opening (a permission
   prompt, a slow device) shares it - two streams would leave one recording forever. */
V.openMic = function(){
  if(micStream && micStream.active !== false) return Promise.resolve(micStream);
  if(micPending) return micPending;
  var md = root.navigator && root.navigator.mediaDevices;
  if(!md || typeof md.getUserMedia !== 'function') return Promise.reject(new Error('nomic'));
  var p = micPending = md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function(st){
    if(micPending === p) micPending = null;
    if(micStream && micStream !== st && micStream.active !== false){ try{ st.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} return micStream; }
    micStream = st; return st;
  }, function(e){ if(micPending === p) micPending = null; throw e; });
  return p;
};
V.closeMic = function(){
  if(micStream){ try{ micStream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} micStream = null; }
  if(ctx){ try{ ctx.close(); }catch(e){} ctx = null; }
};
function audioCtx(){
  if(ctx && ctx.state !== 'closed') return ctx;
  var C = root.AudioContext || root.webkitAudioContext; if(!C) return null;
  try{ ctx = new C(); }catch(e){ ctx = null; }
  return ctx;
}
/* Loudness + pitch frames every 50ms. Frames are the raw measurements the
   engine turns into latency, pauses and pitch variation - nothing estimated. */
V.meter = function(stream, onFrame){
  var c = audioCtx(); if(!c || !stream) return null;
  try{ if(c.state === 'suspended' && c.resume) c.resume(); }catch(e){}
  var src, an;
  try{ src = c.createMediaStreamSource(stream); an = c.createAnalyser(); an.fftSize = 2048; src.connect(an); }catch(e){ return null; }
  var buf = new Float32Array(an.fftSize), frames = [], t0 = now(), tick = 0, sr = c.sampleRate || 48000;
  var h = setInterval(function(){
    try{
      an.getFloatTimeDomainData(buf);
      var sum = 0; for(var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      var rms = Math.sqrt(sum / buf.length), f0 = 0;
      if((tick++ % 2) === 0 && rms > 0.01) f0 = E.estimatePitch(buf.subarray(0, 1024), sr);
      var fr = { t: now() - t0, rms: rms, f0: f0 };
      frames.push(fr); if(frames.length > 12000) frames.shift();
      if(onFrame) onFrame(fr);
    }catch(e){}
  }, 50);
  return { frames: frames, t0: t0, stop: function(){ clearInterval(h); try{ src.disconnect(); }catch(e){} return frames; } };
};
/* Replay of your own answer - a blob URL in memory, never uploaded or saved. */
V.record = function(stream){
  if(!stream || typeof root.MediaRecorder === 'undefined') return null;
  var chunks = [], mr;
  try{ mr = new root.MediaRecorder(stream); mr.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); }; mr.start(); }catch(e){ return null; }
  return { stop: function(){ return new Promise(function(res){
    if(!mr || mr.state === 'inactive'){ res(null); return; }
    var done = false; function fin(v){ if(!done){ done = true; res(v); } }
    mr.onstop = function(){ try{ var b = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); fin(b.size ? { blob: b, url: URL.createObjectURL(b) } : null); }catch(e){ fin(null); } };
    try{ mr.stop(); }catch(e){ fin(null); }
    setTimeout(function(){ fin(null); }, 2500);
  }); } };
};

/* ------------------------------------------------------------ listening */
V.listen = function(opts){
  opts = opts || {};
  var C = SR(); if(!C) return null;
  var rec = null, active = true, finals = [], sessFinal = '', interim = '', startedAt = now(), firstAt = null, lastAt = null, restarts = 0, fatal = null, ender = null;
  function clean(s){ return String(s || '').replace(/\s+/g, ' ').trim(); }
  function text(){ return clean(finals.join(' ') + ' ' + sessFinal + ' ' + interim); }
  function result(){ return { text: text(), finalText: clean(finals.join(' ') + ' ' + sessFinal), startedAt: startedAt, firstAt: firstAt, lastAt: lastAt, restarts: restarts, fatal: fatal }; }
  function make(){
    var r = new C();
    r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.lang = opts.lang || ((root.navigator && /^en/i.test(root.navigator.language || '')) ? root.navigator.language : 'en-US');
    r.onresult = function(ev){
      var t = now(); if(firstAt == null) firstAt = t; lastAt = t;
      var fin = '', it = '';
      for(var i = 0; i < ev.results.length; i++){ var x = ev.results[i], tr = (x && x[0] && x[0].transcript) || ''; if(x.isFinal) fin += tr + ' '; else it += tr + ' '; }
      sessFinal = clean(fin); interim = clean(it);
      if(opts.onUpdate) try{ opts.onUpdate(text(), interim); }catch(e){}
    };
    r.onerror = function(e){
      var er = (e && e.error) || 'unknown';
      if(/not-allowed|service-not-allowed|audio-capture|network|language-not-supported/.test(er)){ fatal = er; active = false; if(opts.onError) try{ opts.onError(er); }catch(x){} }
    };
    r.onend = function(){
      if(sessFinal) finals.push(sessFinal); else if(interim) finals.push(interim);
      sessFinal = ''; interim = '';
      if(active && restarts < 80){ restarts++; try{ rec = make(); }catch(e){ active = false; if(ender) ender(); } }
      else if(ender) ender();
    };
    r.start();
    return r;
  }
  try{ rec = make(); }catch(e){ return null; }
  return {
    text: text, result: result,
    stop: function(){ return new Promise(function(resolve){
      var done = false; function fin(){ if(!done){ done = true; resolve(result()); } }
      active = false; ender = fin;
      try{ rec.stop(); }catch(e){ fin(); }
      setTimeout(fin, 1600); // a recognizer that never ends can't hang the interview
    }); },
    abort: function(){ active = false; try{ rec.abort(); }catch(e){} }
  };
};

root.INTERVIEW_VOICE = V;
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================================
   PART 3 - UI. Mounts into interview-prep.html: a target bar, a 16-tool rail,
   and one section per tool. All model/user text is escaped or set as
   textContent. AI is optional everywhere: every tool says what the built-in
   (offline) version can do, and why the AI isn't available when it isn't.
   ========================================================================== */
(function(root){
'use strict';
var E = root.INTERVIEW_STUDIO_ENGINE, V = root.INTERVIEW_VOICE, D = root.document;
var esc = E.esc, clean = E.clean, words = E.words, uniq = E.uniq, fmtSecs = E.fmtSecs, clamp = E.clamp;
function $(id){ return D.getElementById(id); }
function now(){ return (root.performance && typeof root.performance.now === 'function') ? root.performance.now() : Date.now(); }
function str(v, n){ return (v == null || typeof v === 'object') ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, n || 400); }
function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
function nl2br(s){ return esc(s).replace(/\n/g, '<br>'); }
function fmtMoney(n){ return n == null || !isFinite(n) ? '' : '$' + Math.round(n).toLocaleString('en-US'); }

/* ------------------------------------------------------------- storage */
var K = { ANS: 'kaidostar_interview_answers', ASK: 'kaidostar_interview_asks', STAR: 'kaidostar_star_stories', MOCKDONE: 'kaidostar_interview_mock_done',
  NEGNOTES: 'kaidostar_interview_neg_notes', SESS: 'kaidostar_interview_sessions', TARGET: 'kaidostar_interview_target', TMAYS: 'kaidostar_interview_tmays',
  DOSSIER: 'kaidostar_interview_dossiers', DEBRIEF: 'kaidostar_interview_debriefs', PREFS: 'kaidostar_interview_prefs', PREDICT: 'kaidostar_interview_predicted' };
function lsGet(k, d){ try{ var v = JSON.parse(root.localStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }
function lsSet(k, v){ try{ root.localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function readArr(k){ var v = lsGet(k, []); return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object' && !Array.isArray(x); }) : []; }
function readObj(k){ var v = lsGet(k, {}); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
function userId(){ try{ var s = typeof root.getSession === 'function' ? root.getSession() : null; return (s && s.user_id) || null; }catch(e){ return null; } }
function quiet(p){ try{ if(p && typeof p.then === 'function') p.then(null, function(){}); }catch(e){} }
function syncPut(kind, key, item){
  var a = readArr(key), i = -1; for(var j = 0; j < a.length; j++){ if(a[j].id === item.id){ i = j; break; } }
  if(i >= 0) a[i] = item; else a.unshift(item);
  if(!lsSet(key, a)){ toast('Your browser storage is full - this wasn\'t saved. Delete some old practice first.'); return false; }
  var u = userId(); if(u && typeof root.apiCreateWorkshopItem === 'function') quiet(root.apiCreateWorkshopItem(u, kind, item.id, item));
  return true;
}
function syncRemove(kind, key, id){
  lsSet(key, readArr(key).filter(function(x){ return x.id !== id; }));
  var u = userId(); if(u && typeof root.apiDeleteWorkshopItem === 'function') quiet(root.apiDeleteWorkshopItem(u, id, kind));
}
function prefs(){ var p = readObj(K.PREFS); return p; }
function savePrefs(patch){ var p = prefs(); Object.keys(patch).forEach(function(k){ p[k] = patch[k]; }); lsSet(K.PREFS, p); }
function arr(v){ return Array.isArray(v) ? v : []; }
function isObj(x){ return !!x && typeof x === 'object' && !Array.isArray(x); }
/* Lookups keyed by stored or served text use maps with no prototype (or own-property
   reads), so a key like "constructor" or "__proto__" is just an unknown key. */
function nmap(m){ var o = Object.create(null); Object.keys(m).forEach(function(k){ o[k] = m[k]; }); return o; }
function own(o, k){ return o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; }
function putOwn(o, k, v){ Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true }); }
/* A finite number in [lo, hi], or null - every stored or served number shown on
   the page goes through this, so a corrupted record can't inject markup. */
function num(v, lo, hi){ var n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null; }
function strList(v, n, m){ return arr(v).map(function(x){ return str(x, m || 320); }).filter(Boolean).slice(0, n || 8); }
var DIMKEYS = E.DIMS.concat(['delivery']);
function cleanScores(o, hi){ var out = {}; if(isObj(o)) DIMKEYS.forEach(function(k){ var v = num(o[k], 0, hi); if(v != null) out[k] = v; }); return out; }
function pairs(v, n){ return arr(v).filter(Array.isArray).map(function(p){ return [str(p[0], 30), num(p[1], 0, 999) || 0]; }).filter(function(p){ return p[0]; }).slice(0, n); }
/* Stored and synced sessions are re-validated before anything renders them:
   wrong shapes are repaired or dropped, and only plain text and numbers survive. */
function sanitizeSession(s){
  if(!isObj(s) || !isObj(s.verdict)) return null;
  var v = s.verdict, ov = num(v.overall, 0, 100), id = str(s.id, 80);
  if(ov == null || !id) return null;
  var del = isObj(s.delivery) ? s.delivery : null;
  return {
    id: id, at: str(s.at, 40), role: str(s.role, 200), company: str(s.company, 200),
    persona: E.PERSONAS[s.persona] ? s.persona : 'hiring_manager', difficulty: E.DIFFS[s.difficulty] ? s.difficulty : 'brutal', focus: E.FOCI[s.focus] ? s.focus : 'mixed',
    mode: /^(?:voice|text|mixed)$/.test(s.mode) ? s.mode : 'text', feedback: s.feedback === 'end' ? 'end' : 'each', source: s.source === 'ai' ? 'ai' : 'local',
    note: str(s.note, 400), syncNote: str(s.syncNote, 240), flags: cleanFlags(s.flags),
    verdict: {
      // A stored label may be harsher than its number (the brutal built-in judge is), never kinder.
      decision: E.DECISIONS.indexOf(v.decision) >= 0 && E.DECISIONS.indexOf(v.decision) <= E.DECISIONS.indexOf(E.decisionFor(ov)) ? v.decision : E.decisionFor(ov), overall: Math.round(ov), headline: str(v.headline, 300),
      reasons: strList(v.reasons, 6), strengths: strList(v.strengths, 5), bar_raiser: strList(v.bar_raiser, 6), rules: strList(v.rules, 8, 200),
      top_fixes: arr(v.top_fixes).filter(isObj).map(function(f){ return { fix: str(f.fix, 300), drill: str(f.drill, 20) }; }).filter(function(f){ return f.fix; }).slice(0, 4),
      per_question: arr(v.per_question).filter(isObj).map(function(p){ var i = num(p.i, 0, 40); return i == null ? null : { i: Math.floor(i), score: num(p.score, 0, 10), note: str(p.note, 300), fix: str(p.fix, 300), skipped: p.skipped === true, not_reached: p.skipped === true && p.not_reached === true }; }).filter(Boolean),
      competencies: arr(v.competencies).filter(isObj).map(function(c){ return { name: str(c.name, 40), rating: num(c.rating, 1, 5) || 3, evidence: str(c.evidence, 200) }; }).filter(function(c){ return c.name; }).slice(0, 8),
      unverified_quotes: num(v.unverified_quotes, 0, 99) || 0, answered: num(v.answered, 0, 40), asked: num(v.asked, 0, 40)
    },
    dims: cleanScores(s.dims, 5),
    delivery: del ? { answers: num(del.answers, 0, 40) || 0, spoken: num(del.spoken, 0, 40), wpm: num(del.wpm, 0, 400), fillers: num(del.fillers, 0, 9999) || 0, fillersPerMin: num(del.fillersPerMin, 0, 999) || 0, topFillers: pairs(del.topFillers, 4), hedges: num(del.hedges, 0, 9999) || 0, longestPause: num(del.longestPause, 0, 600) || 0, latency: num(del.latency, 0, 600), overTime: num(del.overTime, 0, 40) || 0, iCount: num(del.iCount, 0, 99999) || 0, weCount: num(del.weCount, 0, 99999) || 0, iSubj: num(del.iSubj, 0, 99999), weSubj: num(del.weSubj, 0, 99999), pitchVar: num(del.pitchVar, 0, 48), seconds: num(del.seconds, 0, 99999) || 0 } : null,
    issues: arr(s.issues).filter(function(k){ return typeof k === 'string' && Object.prototype.hasOwnProperty.call(E.ISSUE_TEXT, k); }).slice(0, 12),
    turns: arr(s.turns).filter(isObj).slice(0, 30).map(function(t){
      var j = isObj(t.judge) ? t.judge : null, m = isObj(t.m) ? t.m : {};
      return { q: str(t.q, 600), a: str(t.a, 3000), qtype: str(t.qtype, 20), follow: t.follow === true, skipped: t.skipped === true, not_reached: t.skipped === true && t.not_reached === true,
        judge: j ? { source: j.source === 'ai' ? 'ai' : 'local', unscored: j.unscored === true, scores: cleanScores(j.scores, 5), overall: num(j.overall, 1, 10), headline: str(j.headline, 300), evidence: arr(j.evidence).filter(isObj).map(function(e){ return { quote: str(e.quote, 240), issue: str(e.issue, 240) }; }).filter(function(e){ return e.quote; }).slice(0, 4), missing: strList(j.missing, 4), better: str(j.better, 500) } : null,
        m: { seconds: num(m.seconds, 0, 9999), wpm: num(m.wpm, 0, 400), words: num(m.words, 0, 99999), fillers: num(m.fillers, 0, 9999), fillerTop: pairs(m.fillerTop, 3), hedges: num(m.hedges, 0, 9999), i: num(m.i, 0, 99999), we: num(m.we, 0, 99999), is: num(m.is, 0, 99999), ws: num(m.ws, 0, 99999), latency: num(m.latency, 0, 600), longestPause: num(m.longestPause, 0, 600), pitchVar: num(m.pitchVar, 0, 48), interrupted: m.interrupted === true, mode: m.mode === 'voice' ? 'voice' : 'text', status: str(m.status, 20) } };
    })
  };
}
function sanitizeDossier(d){
  if(!isObj(d)) return null;
  var p = isObj(d.position) ? d.position : null;
  return { company: str(d.company, 200), at: str(d.at, 40), role: str(d.role, 200), findings: typeof d.findings === 'string' ? d.findings.slice(0, 6000) : '', notes: typeof d.notes === 'string' ? d.notes.slice(0, 4000) : '',
    sources: arr(d.sources).filter(function(s){ return isObj(s) && /^https?:\/\//i.test(String(s.url || '')); }).map(function(s){ return { url: String(s.url).slice(0, 500), title: str(s.title, 200) }; }).slice(0, 12),
    position: p ? { care_about: arr(p.care_about).filter(isObj).map(function(c){ return { point: str(c.point, 220), source_quote: str(c.source_quote, 200) }; }).filter(function(c){ return c.point; }),
      connect: arr(p.connect).filter(isObj).map(function(c){ return { their_need: str(c.their_need, 200), your_evidence: str(c.your_evidence, 200), how_to_say_it: str(c.how_to_say_it, 300) }; }).filter(function(c){ return c.your_evidence; }),
      why_us: str(p.why_us, 1600), smart_questions: strList(p.smart_questions, 5, 220), watch_outs: strList(p.watch_outs, 4, 220), unknowns: strList(p.unknowns, 4, 220), unsupported_numbers: strList(p.unsupported_numbers, 8, 40), unverified_quotes: num(p.unverified_quotes, 0, 99) || 0 } : null };
}
/* The mic is released as soon as nothing is using it - the browser's recording
   light goes off after the verdict, when a tool is left, and between rehearsals. */
function micBusy(){ var h = S.hot; return !!((h && h.ans && (h.ans.stt || h.ans.meter || h.ans.opening)) || tmRec || S.dict || micTest); }
function releaseMic(){ setTimeout(function(){ if(!micBusy()) V.closeMic(); }, 0); }

/* --------------------------------------------------- the person's material */
function profile(){ try{ var p = typeof root.getProfile === 'function' ? root.getProfile() : null; return (p && typeof p === 'object') ? p : {}; }catch(e){ return {}; } }
function target(){ var t = readObj(K.TARGET), p = profile(); return { role: str(t.role, 200) || str(p.northstar, 200), company: str(t.company, 200), jd: String(t.jd || '').slice(0, 8000), date: str(t.date, 20), stage: str(t.stage, 40), roleSaved: !!str(t.role, 200) }; }
function stories(){ return readArr(K.STAR); }
function sessions(){ return readArr(K.SESS).map(sanitizeSession).filter(Boolean); }
function resumeModel(){
  var R = root.RESUME_STUDIO_ENGINE; if(!R) return null;
  try{
    var entries = typeof root.getResumeEntries === 'function' ? root.getResumeEntries() : [];
    var doc = typeof root.getResumeDocument === 'function' ? root.getResumeDocument() : null;
    if(!(entries && entries.length) && !(doc && doc.entries && doc.entries.length)) return null;
    return R.buildResume({ profile: profile(), entries: entries, doc: doc, session: (typeof root.getSession === 'function' && root.getSession()) || {} });
  }catch(e){ return null; }
}
function resumeText(R){
  if(!R || !Array.isArray(R.entries)) return '';
  return R.entries.map(function(e){ return [e.title, e.org].filter(Boolean).join(', ') + ((e.start || e.end) ? ' (' + [e.start, e.end].filter(Boolean).join(' - ') + ')' : '') + '\n' + (e.bullets || []).map(function(b){ return '- ' + b; }).join('\n'); }).join('\n').slice(0, 5000);
}
function storyLine(s){ return (s.title || 'Story') + ': ' + [s.s, s.t, s.a, s.r].filter(Boolean).join(' '); }
function background(){
  var p = profile(), parts = [];
  if(p.northstar) parts.push('Goal: ' + p.northstar);
  if(p.skills) parts.push('Skills: ' + p.skills);
  var rt = resumeText(resumeModel()); if(rt) parts.push('Resume:\n' + rt);
  stories().slice(0, 5).forEach(function(s){ parts.push('Story - ' + storyLine(s)); });
  return parts.join('\n').slice(0, 4800);
}
function dossierFor(company){ var c = str(company, 200).toLowerCase(); if(!c) return null; return sanitizeDossier(own(readObj(K.DOSSIER), c)); }

/* --------------------------------------------------------------- AI */
/* A hung AI call never holds the page: past its limit it resolves as a timeout and
   the built-in path takes over (a late reply is ignored). */
var AI_TIMEOUT = { tool: 60000, plan: 30000, turn: 30000, verdict: 60000, research: 90000 };
function aiCall(kind, a, b){
  var u = userId();
  if(!u) return Promise.resolve({ ok: false, status: -1 });
  var fn = { tool: root.apiInterviewTool, plan: root.apiInterviewPlan, turn: root.apiInterviewTurn, verdict: root.apiInterviewVerdict, research: root.apiResearchCompanyResult || root.apiResearchCompany }[kind];
  if(typeof fn !== 'function') return Promise.resolve({ ok: false, status: 0 });
  var p;
  try{ p = kind === 'tool' ? fn(u, a, b) : kind === 'research' ? fn(a, b) : fn(u, a); }catch(e){ return Promise.resolve({ ok: false, status: 0 }); }
  var call = Promise.resolve(p).then(function(r){
    if(kind === 'research'){
      if(root.apiResearchCompanyResult) return (r && typeof r === 'object') ? r : { ok: false, status: 0 };   // {ok, status, data, error}: the reason is shown
      return r && typeof r === 'object' ? { ok: true, data: r } : { ok: false, status: 0 };
    }
    return (r && typeof r === 'object') ? r : { ok: false, status: 0 };
  }, function(){ return { ok: false, status: 0 }; });
  var timer = null, limit = new Promise(function(res){ timer = setTimeout(function(){ res({ ok: false, status: 0, timeout: true }); }, AI_TIMEOUT[kind] || 60000); });
  return Promise.race([call, limit]).then(function(r){ clearTimeout(timer); return r; });
}
/* Mirror of the server's tool_corpus: where a tool talks TO the candidate about what
   they said, only their own words count - never the recruiter's or interviewer's. */
function toolCorpus(name, inputs){
  inputs = isObj(inputs) ? inputs : {};
  if(name === 'negotiate') return E.corpusOf(arr(inputs.history).filter(function(h){ return isObj(h) && str(h.who, 12) !== 'recruiter'; }).map(function(h){ return h.text; }));
  if(name === 'gauntlet') return E.corpusOf(inputs.original, arr(inputs.exchanges).filter(isObj).map(function(e){ return e.answer; }));
  if(name === 'xray') return arr(inputs.sentences).slice(0, 40).filter(function(x){ return typeof x === 'string'; }).map(function(x){ return x.slice(0, 500); }).join(' ');   // one answer: quotes may cross the page's own cuts
  var p = profile(), mine = { northstar: p.northstar, skills: p.skills };
  if(OWN_KEYS[name]){ var own = {}; OWN_KEYS[name].forEach(function(k){ own[k] = inputs[k]; }); return E.corpusOf(own, mine); }   // their part of mixed material
  return E.corpusOf(textInputs(inputs), mine);
}
// A tool's own settings ("count": 10) are never material (the server's _text_inputs).
function textInputs(inputs){
  var text = {};
  Object.keys(inputs).forEach(function(k){ var v = inputs[k]; if(!(k in SETTING_KEYS) && (typeof v === 'string' || (v && typeof v === 'object'))) text[k] = v; });
  return text;
}
/* Tools whose material mixes the candidate's own words with someone else's (the job
   description, research, the role): a quote or figure presented as theirs ("your resume
   says ...", "you led ...") must come from their part; anything else may quote it all. */
var OWN_KEYS = nmap({ grill: ['resume', 'risks', 'background'], predict: ['stories'], position: ['background'], brief: ['stories', 'story_titles', 'tmays', 'asks'] });
var SETTING_KEYS = nmap({"allow_follow_up": 1, "ceiling": 1, "count": 1, "difficulty": 1, "focus": 1, "interviewer": 1, "kind": 1, "lang": 1, "language": 1, "limit": 1, "mode": 1, "n": 1, "persona": 1, "seconds": 1, "skip_opener": 1, "style": 1, "tool": 1});
/* Mirror of the server's tool_broads: the recruiter's reply may quote the recruiter
   and the offer, a Gauntlet probe may quote the question - but anything presented
   as the candidate's words ("you said ...") must still be theirs. */
function toolBroads(name, inputs){
  inputs = isObj(inputs) ? inputs : {};
  if(name === 'negotiate'){
    // The offer as a figure ("85000") and as money ("$85,000"), so the recruiter can quote it.
    var off = typeof inputs.offer === 'string' ? inputs.offer.trim().slice(0, 40) : '';
    return { reply: E.corpusOf(arr(inputs.history).filter(isObj).map(function(h){ return h.text; }), off, off ? '$' + off : '', inputs.role, inputs.company) };
  }
  if(name === 'gauntlet'){ var ex = arr(inputs.exchanges).filter(isObj); return { probe: E.corpusOf(inputs.question, inputs.original, ex.map(function(e){ return e.probe; }), ex.map(function(e){ return e.answer; })) }; }
  if(OWN_KEYS[name]){ var p = profile(); return { '*': E.corpusOf(textInputs(inputs), { northstar: p.northstar, skills: p.skills }) }; }
  return {};
}
// The field(s) each tool can't be shown without, once the quote rule has run (the server's _TOOL_NEEDS).
var TOOL_NEEDS = nmap({ predict: ['questions'], forge: ['situation', 'action'], grill: ['questions'], position: ['care_about', 'why_us'], ask: ['groups'], xray: ['labels'], gauntlet: ['probe'], tmays: ['script'], negotiate: ['reply'], brief: ['one_liner', 'must_land'], debrief: ['read', 'thank_you'], drills: ['focus'] });
function filled(v){ return Array.isArray(v) ? v.length > 0 : isObj(v) ? Object.keys(v).length > 0 : !!v; }
function aiTool(name, inputs){
  return aiCall('tool', name, inputs).then(function(r){
    if(r.ok && r.data && r.data.result && typeof r.data.result === 'object'){
      // The quote rule again, in the browser: anything quoted must be in what this tool may quote.
      var res = E.scrubResult(r.data.result, toolCorpus(name, inputs), toolBroads(name, inputs)), need = TOOL_NEEDS[name];
      // A "questions to ask" group left with no questions is not a group (the server's run_tool does the same).
      if(name === 'ask' && Array.isArray(res.groups)) res.groups = res.groups.filter(function(g){ return isObj(g) && arr(g.questions).length; });
      if(need && !need.some(function(k){ return filled(res[k]); })) return { ok: false, status: 422, withheld: true };
      return { ok: true, data: res };
    }
    // The server withheld it for the same reason (everything usable misquoted): not an outage.
    if(!r.ok && r.status === 422 && /^withheld\b/i.test(String(r.error || ''))) return { ok: false, status: 422, withheld: true };
    return r.ok ? { ok: false, status: 502 } : r;
  });
}
/* A question you'll ask can name a time window ("the first 90 days", "a 30-60-90 day plan") -
   that's not a claim about the company. Percentages, money, counts and dates are, and get checked. */
function claimText(q){ return E.claimText(q); }
function dropNote(d){ var n = d ? (num(d.unverified_quotes, 0, 99) || 0) : 0; return n ? '<div class="fb-fine">' + n + ' AI line' + (n === 1 ? '' : 's') + ' with words or figures that aren\'t in your material ' + (n === 1 ? 'was' : 'were') + ' removed.</div>' : ''; }
function aiMsg(r, what){
  var s = r ? r.status : 0;
  if(r && r.timeout) return 'The AI ' + (what || 'coach') + ' took too long to answer.';
  if(r && r.withheld) return 'The AI ' + (what || 'coach') + ' used quotes or figures that aren\'t in your material, so its answer was withheld - try again.';
  if(s === -1) return 'Sign in to use the AI ' + (what || 'coach') + '.';
  if(s === 401) return 'Your session expired - sign in again to use the AI ' + (what || 'coach') + '.';
  if(s === 403) return 'The AI ' + (what || 'coach') + ' is part of Pro - your account doesn\'t include Interview Prep.';
  if(s === 429) return (r && r.error) || 'You\'ve reached today\'s limit for this AI tool.';
  if(s === 400) return (r && r.error) || 'That request wasn\'t valid - check your inputs.';
  if(s === 503) return 'The AI isn\'t configured on the server right now.';
  if(s === 0) return 'Couldn\'t reach the AI just now - check your connection and try again.';
  return 'The AI couldn\'t do this just now - try again in a moment.';
}
function busy(el, on, label){ if(!el) return; if(on){ el.dataset.label = el.dataset.label || el.textContent; el.disabled = true; el.textContent = label || 'Working…'; } else { el.disabled = false; if(el.dataset.label) el.textContent = el.dataset.label; } }
function note(cls, html){ return '<div class="is-note ' + (cls || '') + '">' + html + '</div>'; }
function aiBadge(src){ return src === 'ai' ? '<span class="is-src ai">AI</span>' : '<span class="is-src local">Built-in</span>'; }
function honestyBanner(flagged){ flagged = E.figList(flagged); return flagged.length ? note('warn', '<b>Not in your own words:</b> ' + flagged.map(function(f){ return '<code>' + esc(f) + '</code>'; }).join(' ') + ' - confirm these are true (and add them to your notes) or remove them before you use this.') : ''; }
/* "Say this" advice can't hand you a figure you never gave. Advice about the answer
   itself ("keep it under 90 seconds", "prepare 3 stories") isn't a claim; every other
   figure that isn't in your own material is flagged right beside the line. A critique
   (a headline, a red flag) is checked only for the lines it quotes for you to say. */
function sayFlags(source, texts, critique){
  texts = arr(texts).filter(function(x){ return typeof x === 'string' && x; });
  var t = critique ? E.sayThis(texts, source) : texts.map(function(x){ return E.adviceText(x); }).join(' ' + E.SEP + ' ');
  if(!t.replace(/[\s␞]+/g, '')) return [];
  // A bare 0-2 is "one thing" / "a couple", not a claim (the server's rule too) - in a line to say as in advice.
  return E.honestyCheck(source, t).flagged.filter(function(f){ return !/^(?:[0-2](?:\.\d+)?|zero|one|two)$/i.test(f); });
}
/* One line's figure warning, printed right under that line; a figure already warned
   about higher up isn't warned again. */
function lineWarn(flags, shown, where, other){
  var fresh = E.figList(flags).filter(function(f){ return !shown[f]; });
  fresh.forEach(function(f){ shown[f] = 1; });
  return figWarn(fresh, where, other);
}
/* The figure flags of a finished interview, worked out once against the FULL answers
   (the stored transcript is shortened) and kept with the session, line by line. */
function verdictFlags(v, turns){
  var mine = answersCorpus(turns), perQ = {};
  arr(v.per_question).forEach(function(p){ if(p) perQ[p.i] = p; });
  var crit = function(x){ return sayFlags(mine, [x], true); }, adv = function(x){ return sayFlags(mine, [x]); };
  return {
    headline: crit(v.headline), reasons: arr(v.reasons).map(crit), bar: arr(v.bar_raiser).map(crit),
    fixes: arr(v.top_fixes).map(function(f){ return adv(f && f.fix); }),
    q: arr(turns).map(function(t, i){
      var j = (t && t.judge) || {}, pq = perQ[i], fix = (pq && pq.fix) || (j.missing || [])[0] || '';
      return t && t.skipped ? { note: [], fix: [], live: [] } : { note: crit(pq && pq.note), fix: adv(fix), live: crit(j.headline) };
    })
  };
}
function cleanFlags(f){
  if(!isObj(f)) return null;
  var l = function(x){ return arr(x).filter(function(y){ return typeof y === 'string' && y; }).map(function(y){ return y.slice(0, 40); }).slice(0, 8); };
  var ll = function(x){ return arr(x).slice(0, 8).map(l); };
  return { headline: l(f.headline), reasons: ll(f.reasons), bar: ll(f.bar), fixes: ll(f.fixes),
    q: arr(f.q).slice(0, 30).map(function(x){ x = isObj(x) ? x : {}; return { note: l(x.note), fix: l(x.fix), live: l(x.live) }; }) };
}
function figWarn(flagged, where, other, otherName){
  flagged = E.figList(flagged);
  if(!flagged.length) return '';
  var codes = function(l){ return l.map(function(f){ return '<code>' + esc(f) + '</code>'; }).join(', '); };
  // A flagged figure the job description has is the role's requirement, not their fact: say where it came from.
  var role = other ? flagged.filter(function(f){ return !E.honestyCheck(other, f).flagged.length; }) : [];
  return '<span class="fig-warn"><b>Not in ' + esc(where || 'your answer') + ':</b> ' + codes(flagged) + ' - only say figures you really have.' +
    (role.length ? ' ' + codes(role) + ' ' + (role.length === 1 ? 'is' : 'are') + ' from ' + esc(otherName || 'the job description') + ', not from you.' : '') + '</span>';
}
/* Everything you've said this session - a figure from any of your answers is yours. */
function answersCorpus(turns, first){
  return [String(first || '')].concat(arr(turns).filter(function(t){ return t && !t.skipped && t.a && t.a !== first; }).map(function(t){ return String(t.a); })).filter(Boolean).join(' ' + E.SEP + ' ');
}

var toastT = null;
function toast(msg){
  var t = $('isToast'); if(!t){ t = D.createElement('div'); t.id = 'isToast'; t.className = 'is-toast'; t.setAttribute('role', 'status'); D.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove('on'); }, 3600);
}
function copyText(txt, btn){
  try{ var p = root.navigator.clipboard && root.navigator.clipboard.writeText(String(txt || '')); quiet(p); if(btn){ var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = o; }, 1300); } }catch(e){}
}

/* ------------------------------------------------------------- tools */
var TOOLS = [
  { key: 'overview', btn: 'ipOverviewBtn', sec: 'ovSection' },
  { key: 'hot', btn: 'ipMockBtn', sec: 'mockSection' },
  { key: 'drill', btn: 'ipDrillBtn', sec: 'drillSection' },
  { key: 'gauntlet', btn: 'ipGauntletBtn', sec: 'gauntletSection' },
  { key: 'predict', btn: 'ipPredictBtn', sec: 'predictSection' },
  { key: 'forge', btn: 'ipForgeBtn', sec: 'forgeSection' },
  { key: 'grill', btn: 'ipGrillBtn', sec: 'grillSection' },
  { key: 'dossier', btn: 'ipDossierBtn', sec: 'dossierSection' },
  { key: 'bank', btn: 'ipBankBtn', sec: 'bankSection' },
  { key: 'xray', btn: 'ipXrayBtn', sec: 'xraySection' },
  { key: 'tmays', btn: 'ipTmaysBtn', sec: 'tmaysSection' },
  { key: 'ask', btn: 'ipAskBtn', sec: 'askSection' },
  { key: 'brief', btn: 'ipBriefBtn', sec: 'briefSection' },
  { key: 'neg', btn: 'ipNegBtn', sec: 'negSection' },
  { key: 'debrief', btn: 'ipDebriefBtn', sec: 'debriefSection' },
  { key: 'progress', btn: 'ipProgressBtn', sec: 'progressSection' }
];
var TOOL = Object.create(null); TOOLS.forEach(function(t){ TOOL[t.key] = t; });
var DRILL_TOOL = nmap({ hot: 'hot', xray: 'xray', gauntlet: 'gauntlet', forge: 'forge', tmays: 'tmays', grill: 'grill', predict: 'predict', drill: 'drill', ask: 'ask', dossier: 'dossier', neg: 'neg' });
var TOOL_NAME = nmap({ hot: 'Hot Seat', xray: 'Answer X-Ray', gauntlet: 'Follow-up Gauntlet', forge: 'Story Forge', tmays: '"Tell me about yourself"', grill: 'Resume Grill', predict: 'Question Predictor', drill: 'Rapid drill', ask: 'Questions to ask', dossier: 'Company Dossier', neg: 'Negotiation', bank: 'Question bank', brief: 'Game plan', debrief: 'Debrief', progress: 'Progress', overview: 'Overview' });
var S = { tool: 'overview', hot: null, gauntlet: null, neg: null, drill: null, xray: null, bound: false, audio: {} };

function head(title, sub){ return '<div class="studio-toolhead"><h2>' + esc(title) + '</h2><p>' + sub + '</p></div>'; }
function stopToolAudio(leaving){
  try{
    if(leaving === 'hot'){ stopMicTest(); if(S.hot && S.hot.phase === 'live') pauseHot(); }
    if(leaving === 'tmays' && tmRec){ var r0 = tmRec; tmRec = null; if(r0.stt) r0.stt.abort(); if(r0.meter) r0.meter.stop(); if(r0.rec) quiet(Promise.resolve(r0.rec.stop()).then(releaseMic)); var b = $('tmRecBtn'); if(b) b.innerHTML = '&#127908; Rehearse out loud'; var c = $('tmCap'); if(c) c.classList.add('hidden'); }
    if(leaving === 'drill' && S.drill){ drillStopTimer(); drillAbort(); }
    stopDictation();
    V.stopSpeaking();
  }catch(e){}
  releaseMic();
}
function show(name){
  if(!TOOL[name]) name = 'overview';
  if(S.tool !== name) stopToolAudio(S.tool);
  S.tool = name;
  TOOLS.forEach(function(t){ var s = $(t.sec), b = $(t.btn); if(s) s.classList.toggle('hidden', t.key !== name); if(b){ b.classList.toggle('active', t.key === name); b.setAttribute('aria-current', t.key === name ? 'page' : 'false'); } });
  try{ RENDER[name](); }catch(e){ var s = $(TOOL[name].sec); if(s && !s.innerHTML) s.innerHTML = note('warn', 'This tool hit a problem loading. Your saved practice is safe - try reloading the page.'); if(root.console) root.console.error(e); }
  refreshCounts();
}
function refreshCounts(){
  function set(id, n){ var el = $(id); if(el) el.textContent = n; }
  set('ipAnsCount', readArr(K.ANS).length); set('ipAskCount', readArr(K.ASK).length); set('ipForgeCount', stories().length); set('ipHotCount', sessions().length);
}

/* ============================================================== TARGET BAR */
function daysUntil(d){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return null;
  var p = String(d).split('-'), when = new Date(+p[0], +p[1] - 1, +p[2]), today = new Date(); today.setHours(0, 0, 0, 0);
  if(isNaN(when)) return null;
  return Math.round((when - today) / 86400000);   // calendar days, not 24-hour blocks
}
function renderTargetBar(){
  var el = $('ipTarget'); if(!el) return;
  var t = target(), dd = daysUntil(t.date), jd = t.jd ? E.parseJD(t.jd) : null;
  var when = dd == null ? '' : dd < 0 ? '<span class="tg-when past">' + esc(t.date) + ' (past)</span>' : dd === 0 ? '<span class="tg-when hot">Today</span>' : '<span class="tg-when' + (dd <= 3 ? ' hot' : '') + '">in ' + dd + ' day' + (dd === 1 ? '' : 's') + '</span>';
  el.innerHTML = '<div class="tg-row"><span class="tg-lbl">Interviewing for</span><b>' + esc(t.role || 'a role you haven\'t named yet') + '</b>' + (t.company ? ' <span class="tg-at">at</span> <b>' + esc(t.company) + '</b>' : '') + when +
    '<span class="tg-jd ' + (jd ? 'ok' : '') + '">' + (jd ? 'JD added · ' + esc(jd.themes.join(', ') || 'parsed') : 'No job description yet') + '</span>' +
    '<button class="btn ghost tg-edit" data-act="tg-edit" id="tgEditBtn">' + (t.roleSaved || t.company || t.jd ? 'Edit' : 'Set your target') + '</button></div>' +
    '<div class="tg-form hidden" id="tgForm"><div class="ip-row"><div><span class="ip-label">Role</span><input class="ip-field" id="tgRole" maxlength="200" value="' + esc(t.role) + '" placeholder="e.g. Data Analyst"></div>' +
    '<div><span class="ip-label">Company</span><input class="ip-field" id="tgCompany" maxlength="200" value="' + esc(t.company) + '" placeholder="e.g. Northwind"></div>' +
    '<div style="flex:0 0 170px;"><span class="ip-label">Interview date</span><input class="ip-field" type="date" id="tgDate" value="' + esc(t.date) + '"></div></div>' +
    '<span class="ip-label">Job description (paste it - every tool uses it)</span><textarea class="ip-field body" id="tgJD" maxlength="8000" placeholder="Paste the full job posting...">' + esc(t.jd) + '</textarea>' +
    '<div class="is-actions"><button class="btn" data-act="tg-save" id="tgSaveBtn">Save target</button><button class="btn ghost" data-act="tg-edit">Cancel</button></div></div>';
}
function saveTargetFrom(prefix){
  var t = readObj(K.TARGET);
  function v(id, n){ var el = $(id); return el ? String(el.value || '').slice(0, n) : undefined; }
  var role = v(prefix + 'Role', 200), co = v(prefix + 'Company', 200), jd = v(prefix + 'JD', 8000), date = v(prefix + 'Date', 20);
  if(role !== undefined) t.role = clean(role); if(co !== undefined) t.company = clean(co); if(jd !== undefined) t.jd = jd.trim(); if(date !== undefined) t.date = date;
  lsSet(K.TARGET, t); renderTargetBar();
}

/* ============================================================== OVERVIEW */
function renderOverview(){
  var sec = $('ovSection'); if(!sec) return;
  var t = target(), ss = sessions(), st = stories(), asks = readArr(K.ASK), tm = readObj(K.TMAYS), ans = readArr(K.ANS);
  var r = E.readiness({ sessions: ss, stories: st, asks: asks, tmays: tm.script, company: t.company, dossier: dossierFor(t.company), jd: t.jd });
  var p = r.progress, dd = daysUntil(t.date);
  var next;
  if(!ss.length) next = { t: 'Take the Hot Seat', d: 'Five questions, out loud, judged by a skeptical interviewer. It\'s the only way to measure where you really are.', go: 'hot' };
  else if(dd != null && dd >= 0 && dd <= 2) next = { t: 'Build your game plan', d: 'Your interview is ' + (dd === 0 ? 'today' : 'in ' + dd + ' day' + (dd === 1 ? '' : 's')) + '. Lock in your stories, opener and questions on one page.', go: 'brief' };
  else if(p.weakest && p.dims[p.weakest] && p.dims[p.weakest].recent < 3.5) next = { t: 'Fix your weakest area: ' + E.DIM_LABEL[p.weakest], d: 'It has averaged ' + p.dims[p.weakest].recent + '/' + E.dimMax(p.weakest, p.ruleBased) + ' in your recent sessions. ' + E.fixFor(p.weakest, p.dir), go: E.drillFor(p.weakest, p.dir) || 'hot' };
  else if(!t.jd) next = { t: 'Add the job description', d: 'Paste it into your target (top of the page) - the Predictor, Story Forge and Hot Seat all aim at it.', go: 'predict' };
  else if(r.cov.gaps.length) next = { t: 'Forge a story for ' + E.compLabel(r.cov.gaps[0]).toLowerCase(), d: 'Your target role needs it and you have no story that shows it yet.', go: 'forge' };
  else next = { t: 'Raise the bar', d: 'Run a Brutal Hot Seat with the bar raiser - your recent average is ' + p.recentAvg + '/100.', go: 'hot' };
  var ringCol = r.score >= 75 ? 'var(--aurora)' : r.score >= 50 ? 'var(--gold)' : 'var(--danger)';
  var answers = ans, catsCovered = {}; answers.forEach(function(a){ if(a.category) catsCovered[a.category] = 1; });
  var bestS = p.best ? p.best.verdict : null;
  sec.innerHTML = head('Your interview readiness', 'How ready you are right now - measured from how you actually performed when judged, not from boxes ticked. Each item takes you to the tool that moves it.') +
    '<div class="home-hero"><div class="readiness-top"><div class="readiness-ring" id="ipRing" style="width:92px;height:92px;border-radius:50%;background:conic-gradient(' + ringCol + ' ' + r.score + '%, var(--line-soft) 0);display:flex;align-items:center;justify-content:center;"><div style="width:68px;height:68px;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center;font-family:\'Space Grotesk\',sans-serif;font-weight:800;font-size:18px;color:' + ringCol + ';">' + r.score + '%</div></div>' +
    '<div class="readiness-meta"><div class="readiness-pct" id="ipPct">' + r.score + '%</div><div class="readiness-label">Interview readiness' + (r.measured ? '' : ' · not yet measured') + '</div><div class="readiness-sub" id="ipSub">' + esc(r.note) + '</div></div></div>' +
    '<div class="rd-bars">' + rdBar('Performance', r.perf, r.measured ? 'Your last ' + Math.min(3, p.count) + ' judged sessions' : 'Not measured - no judged session yet') + rdBar('Story coverage', r.coverage, r.cov.covered + ' of ' + r.cov.total + ' competencies have a story') + rdBar('Preparation', r.prep, r.checks.filter(function(c){ return c.done; }).length + ' of ' + r.checks.length + ' done') + '</div></div>' +
    '<div class="is-next" data-go="' + next.go + '" role="button" tabindex="0"><div class="is-next-k">Next best move</div><div class="is-next-t">' + esc(next.t) + ' &rarr;</div><div class="is-next-d">' + esc(next.d) + '</div></div>' +
    '<div class="tool-card"><h3>Before the day</h3><div class="is-checks">' + r.checks.map(function(c){ return '<div class="is-check ' + (c.done ? 'done' : '') + '" data-go="' + c.tool + '" role="button" tabindex="0"><span class="ck">' + (c.done ? '&#10003;' : '') + '</span>' + esc(c.label) + '</div>'; }).join('') + '</div>' +
    '<h3 style="margin-top:18px;">Question bank coverage</h3><div class="cat-cover" id="ipCatCover">' + E.CATS.map(function(c){
      var total = E.BANK.filter(function(q){ return q.cat === c.key; }).length, got = answers.filter(function(a){ return a.category === c.key; }).length, w = total ? Math.round(Math.min(got, total) / total * 100) : 0;
      return '<div class="cat-cover-row"><span style="flex:0 0 170px;">' + esc(c.label) + '</span><span class="cat-cover-bar"><i style="width:' + w + '%;"></i></span><span class="cat-cover-n">' + got + '/' + total + '</span></div>'; }).join('') + '</div></div>' +
    '<div class="home-tiles" id="ipTiles">' + [
      { n: ss.length, label: 'Judged sessions', icon: '&#9679;', tool: 'hot' },
      { n: bestS ? esc(E.DECISION_LABEL[bestS.decision] || '-') : '-', label: 'Best verdict', icon: '&#9733;', tool: 'progress' },
      { n: st.length, label: 'Stories in your bank', icon: '&#9998;', tool: 'forge' },
      { n: answers.length, label: 'Answers drafted', icon: '&#9636;', tool: 'bank' },
      { n: asks.length, label: 'Questions to ask', icon: '&#10068;', tool: 'ask' },
      { n: p.count ? (p.delta >= 0 ? '+' : '') + p.delta : '-', label: 'Change since you started', icon: '&#8599;', tool: 'progress' }
    ].map(function(x){ return '<div class="home-tile" data-go="' + x.tool + '" role="button" tabindex="0"><div class="home-tile-icon">' + x.icon + '</div><div class="home-tile-num">' + x.n + '</div><div class="home-tile-label">' + esc(x.label) + '</div></div>'; }).join('') + '</div>' +
    (ss.length ? '<div class="tool-card"><h3>Recent sessions</h3>' + ss.slice(0, 4).map(sessionRow).join('') + '</div>' : '');
}
function rdBar(label, val, sub){
  return '<div class="rd-bar"><div class="rd-top"><span>' + esc(label) + '</span><b>' + (val == null ? '-' : val + '%') + '</b></div><div class="cat-cover-bar"><i style="width:' + (val || 0) + '%;"></i></div><div class="rd-sub">' + esc(sub) + '</div></div>';
}
function decisionClass(d){ return /strong_no|^no_hire/.test(d) ? 'bad' : /lean_no/.test(d) ? 'warn' : /lean_hire/.test(d) ? 'mid' : 'good'; }
function sessionRow(s){
  var v = s.verdict || {};
  return '<div class="is-sess" data-act="sess-open" data-id="' + esc(s.id) + '" role="button" tabindex="0"><span class="is-dec ' + decisionClass(v.decision) + '">' + esc(E.DECISION_LABEL[v.decision] || '-') + '</span><span class="is-sess-t">' + esc((s.role || 'Interview') + (s.company ? ' · ' + s.company : '')) + '</span><span class="is-sess-m">' + esc((E.PERSONAS[s.persona] || {}).short || '') + ' · ' + esc((E.DIFFS[s.difficulty] || {}).label || '') + ' · ' + (typeof v.overall === 'number' ? esc(v.overall) + '/100' : '') + ' · ' + esc(String(s.at || '').slice(0, 10)) + '</span></div>';
}

/* ================================================================ HOT SEAT */
function hotCfgDefaults(){
  var p = prefs(), sup = V.support(), t = target();
  return {
    role: t.role, company: t.company,
    persona: E.PERSONAS[p.persona] ? p.persona : 'hiring_manager',
    difficulty: E.DIFFS[p.difficulty] ? p.difficulty : 'brutal',
    focus: E.FOCI[p.focus] ? p.focus : 'mixed',
    count: [3, 5, 7].indexOf(p.count) >= 0 ? p.count : 5,
    mode: p.mode === 'text' || p.mode === 'voice' ? (p.mode === 'voice' && !sup.stt ? 'text' : p.mode) : (sup.stt && sup.mic ? 'voice' : 'text'),
    feedback: p.feedback === 'end' ? 'end' : 'each',
    tts: p.tts === false ? false : true, handsfree: p.handsfree === false ? false : true,
    interrupt: typeof p.interrupt === 'boolean' ? p.interrupt : true, speakVerdict: p.speakVerdict === false ? false : true,
    voiceURI: str(p.voiceURI, 300), rate: Number(p.rate) || 1, custom: null
  };
}
function chips(name, opts, cur){ return '<div class="pill-row" data-chipset="' + name + '" role="group">' + opts.map(function(o){ return '<button class="chip' + (String(o[0]) === String(cur) ? ' active' : '') + '" aria-pressed="' + (String(o[0]) === String(cur)) + '" data-act="hot-opt" data-k="' + name + '" data-v="' + esc(o[0]) + '"' + (o[2] ? ' title="' + esc(o[2]) + '"' : '') + (o[3] ? ' disabled' : '') + '>' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
/* An interview in progress (live or paused) and how far it got. */
function inProgress(){ var h = S.hot; return !!(h && ((h.phase === 'live' && !h.ending) || h.phase === 'judging')); }
/* Anything that would be lost: a submitted answer, or one being given right now (spoken or typed). */
function hasWork(h){
  if(!h) return false;
  if((h.turns || []).some(function(t){ return !t.skipped; })) return true;
  var said = h.ans && h.ans.forQ === h.current ? clean(((h.ans.kept || '') + ' ' + (h.ans.stt ? h.ans.stt.text() : '')).trim()) : '';
  var ta = $('mockAnswer');
  return !!said || !!(ta && clean(ta.value));
}
function inProgressNote(){
  var h = S.hot, n = (h.turns || []).filter(function(t){ return !t.skipped; }).length;
  if(h.phase === 'judging') return note('warn', '<b>The committee is deciding on your interview</b> (' + n + ' answer' + (n === 1 ? '' : 's') + ', ' + esc(h.cfg.role || 'no role') + '). It\'s saved either way - <button class="btn ghost is-xs" data-act="hot-back">Back to it</button>');
  return note('warn', '<b>You have an interview in progress</b> (' + n + ' answer' + (n === 1 ? '' : 's') + ' so far, ' + esc(h.cfg.role || 'no role') + '). It\'s paused and safe - <button class="btn ghost is-xs" data-act="hot-back">Back to it</button>');
}
function renderHot(){
  var sec = $('mockSection'); if(!sec) return;
  stopMicTest();   // a mic test belongs to the setup view only
  if(!S.hot) S.hot = { phase: 'setup', cfg: hotCfgDefaults(), run: 0 };
  if(inProgress() && S.hotView){ renderHotResults(S.hotView, false, true); return; }
  if(inProgress() && S.hotPending){
    var judging = S.hot.phase === 'judging', pend = S.hotPending;
    sec.innerHTML = head('The Hot Seat', pend.restart ? 'Start over?' : 'Practise a question') + inProgressNote() +
      (judging ? '<div class="tool-card"><p class="tc-sub">The committee is still deciding on your interview. It\'s saved either way - you\'ll find the verdict in your progress.</p>' +
        '<div class="is-actions"><button class="btn" data-act="hot-back">Wait for my verdict</button><button class="btn ghost" data-act="hot-practice-anyway">' + (pend.restart ? 'Start a new interview' : 'Practise this now') + '</button></div></div>'
      : pend.restart ? '<div class="tool-card"><p class="tc-sub">Restarting throws away the interview in progress - its answers would never get a verdict.</p>' +
        '<div class="is-actions"><button class="btn" data-act="hot-back">Keep my interview</button><button class="btn ghost" data-act="hot-end">End &amp; get my verdict</button><button class="btn ghost" data-act="hot-practice-anyway">Restart anyway</button></div></div>'
      : '<div class="tool-card"><p class="tc-sub">Practising <b>' + esc(pend.label || 'these questions') + '</b> starts a new interview. The one in progress would end without a verdict.</p>' +
        '<div class="is-actions"><button class="btn" data-act="hot-back">Keep my interview</button><button class="btn ghost" data-act="hot-practice-anyway">End it and practise this</button></div></div>');
    return;
  }
  S.hotView = null; S.hotPending = null;
  if(S.hot.phase === 'setup') renderHotSetup();
  else if(S.hot.phase === 'results') renderHotResults(S.hot.session);
  else if(!$('mockTranscript')) renderHotLive();
  resumeHot();
}
/* Back on the Hot Seat after a pause: a typed answer simply carries on (there's no
   mic to press); a spoken one waits for the mic so it never opens by surprise. */
function resumeHot(){
  var h = S.hot; if(!h || h.phase !== 'live' || !h.paused || h.finishing || h.ending || !h.current || h.current.answered) return;
  if(h.answerMode !== 'voice') startAnswer();
  else hotState('Paused - press the mic to pick up where you left off', '');
}
function renderHotSetup(){
  stopMicTest();   // the setup is redrawn: a running mic test stops instead of carrying on behind a reset button
  var sec = $('mockSection'), c = S.hot.cfg, sup = V.support(), t = target(), ss = sessions();
  var voices = sup.tts ? V.voices() : [];
  var voiceNote = !sup.stt ? 'Your browser can\'t transcribe speech (Chrome, Edge and Safari can) - typed mode is on. You can still have questions read aloud.' : !sup.mic ? 'No microphone access in this browser - typed mode is on.' : '';
  sec.innerHTML = head('The Hot Seat', 'A spoken mock interview against an AI interviewer that judges you like a skeptical hiring committee. It asks out loud, listens, cuts you off when you ramble, drills into weak answers - and gives you a verdict at the end. Your pace, fillers and pauses are measured from your mic, not guessed.') +
    '<div class="tool-card" id="mockSetup">' +
    '<div class="ip-row"><div><span class="ip-label">Role you\'re interviewing for</span><input class="ip-field" id="mockRole" maxlength="200" value="' + esc(c.role || t.role) + '" placeholder="e.g. Associate Product Manager"></div>' +
    '<div><span class="ip-label">Company (optional)</span><input class="ip-field" id="mockCompany" maxlength="200" value="' + esc(c.company || t.company) + '" placeholder="e.g. Fernway Labs"></div></div>' +
    '<span class="ip-label">Interviewer</span>' + chips('persona', Object.keys(E.PERSONAS).map(function(k){ return [k, E.PERSONAS[k].label, E.PERSONAS[k].blurb]; }), c.persona) +
    '<p class="tc-sub" id="hotPersonaBlurb">' + esc(E.PERSONAS[c.persona].blurb) + '</p>' +
    '<div class="ip-row"><div><span class="ip-label">How harsh</span>' + chips('difficulty', Object.keys(E.DIFFS).map(function(k){ return [k, E.DIFFS[k].label, E.DIFFS[k].blurb]; }), c.difficulty) + '</div>' +
    '<div><span class="ip-label">Focus</span>' + chips('focus', Object.keys(E.FOCI).map(function(k){ return [k, E.FOCI[k]]; }), c.focus) + '</div></div>' +
    '<div class="ip-row"><div><span class="ip-label">Questions</span>' + chips('count', [[3, '3 · ~6 min'], [5, '5 · ~12 min'], [7, '7 · ~18 min']], c.count) + '</div>' +
    '<div><span class="ip-label">Answer by</span>' + chips('mode', [['voice', 'Voice', 'Speak your answers', !(sup.stt && sup.mic)], ['text', 'Typing']], c.mode) + '</div>' +
    '<div><span class="ip-label">Feedback</span>' + chips('feedback', [['each', 'After every answer'], ['end', 'Only at the end (realistic)']], c.feedback) + '</div></div>' +
    (voiceNote ? note('', esc(voiceNote)) : '') +
    '<details class="is-more"><summary>Voice &amp; pressure settings</summary>' +
    '<label class="is-tog"><input type="checkbox" id="hotTts"' + (c.tts ? ' checked' : '') + (sup.tts ? '' : ' disabled') + '> The interviewer reads questions aloud' + (sup.tts ? '' : ' (not supported here)') + '</label>' +
    '<label class="is-tog"><input type="checkbox" id="hotHands"' + (c.handsfree ? ' checked' : '') + '> Hands-free: submit when I stop talking for ~3 seconds</label>' +
    '<label class="is-tog"><input type="checkbox" id="hotInterrupt"' + (c.interrupt ? ' checked' : '') + '> Cut me off if I run past the time limit</label>' +
    '<label class="is-tog"><input type="checkbox" id="hotSpeakV"' + (c.speakVerdict ? ' checked' : '') + '> The judge says its verdict out loud after each answer</label>' +
    (voices.length ? '<div class="ip-row" style="margin-top:8px;"><div><span class="ip-label">Interviewer voice</span><select class="ip-field" id="hotVoice"><option value="">Automatic</option>' + voices.map(function(v){ return '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === c.voiceURI ? ' selected' : '') + '>' + esc(v.name + ' (' + v.lang + ')') + '</option>'; }).join('') + '</select></div><div style="flex:0 0 160px;"><span class="ip-label">Speed</span><select class="ip-field" id="hotRate">' + [[0.9, 'Slower'], [1, 'Normal'], [1.15, 'Faster']].map(function(o){ return '<option value="' + o[0] + '"' + (Number(c.rate) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' : '') +
    '</details>' +
    (sup.mic ? '<div class="is-miccheck"><button class="btn ghost" data-act="hot-miccheck" id="hotMicTest">Test my mic</button><span class="is-meter"><i id="hotTestLevel"></i></span><span class="is-cap-mini" id="hotTestCap"></span></div>' : '') +
    (S.hot.customLabel ? note('info', 'Practising: <b>' + esc(S.hot.customLabel) + '</b> <button class="btn ghost is-xs" data-act="hot-clear-custom">Use a normal plan</button>') : '') +
    '<div class="is-actions"><button class="btn" data-act="hot-start" id="mockStartBtn">Start interview</button></div>' +
    '<p class="is-fine">Speech-to-text runs in your browser (Chrome sends your audio to Google\'s speech service to transcribe it; Kaidostar receives only the text). Replays stay in this tab and disappear when you leave. The judge scores your words; delivery numbers come from your own mic.</p>' +
    '</div>' +
    (ss.length ? '<div class="tool-card"><h3>Past sessions</h3>' + ss.slice(0, 6).map(sessionRow).join('') + '</div>' : '');
}
function readHotSetup(){
  var c = S.hot.cfg;
  c.role = clean(($('mockRole') || {}).value || '').slice(0, 200);
  c.company = clean(($('mockCompany') || {}).value || '').slice(0, 200);
  if($('hotTts')) c.tts = $('hotTts').checked; if($('hotHands')) c.handsfree = $('hotHands').checked;
  if($('hotInterrupt')) c.interrupt = $('hotInterrupt').checked; if($('hotSpeakV')) c.speakVerdict = $('hotSpeakV').checked;
  if($('hotVoice')) c.voiceURI = $('hotVoice').value; if($('hotRate')) c.rate = Number($('hotRate').value) || 1;
  savePrefs({ persona: c.persona, difficulty: c.difficulty, focus: c.focus, count: c.count, mode: c.mode, feedback: c.feedback, tts: c.tts, handsfree: c.handsfree, interrupt: c.interrupt, speakVerdict: c.speakVerdict, voiceURI: c.voiceURI, rate: c.rate });
}
var micTest = null;
function stopMicTest(){ if(!micTest) return; try{ micTest.meter && micTest.meter.stop(); }catch(e){} try{ micTest.stt && micTest.stt.abort(); }catch(e){} micTest = null; var b = $('hotMicTest'); if(b) b.textContent = 'Test my mic'; releaseMic(); }
function startMicTest(){
  if(micTest){ stopMicTest(); return; }
  var b = $('hotMicTest'), cap = $('hotTestCap'); if(b) b.textContent = 'Stop test';
  var mt = {}; micTest = mt;
  V.openMic().then(function(stream){
    if(micTest !== mt){ releaseMic(); return; }      // stopped (or restarted) while the mic was opening
    mt.meter = V.meter(stream, function(fr){ var lv = $('hotTestLevel'); if(lv) lv.style.width = Math.min(100, Math.round(fr.rms * 900)) + '%'; });
    mt.stt = V.listen({ onUpdate: function(t){ if(micTest === mt && cap) cap.textContent = 'Heard: "' + t.slice(-90) + '"'; }, onError: function(er){ if(micTest === mt && cap) cap.textContent = sttErrorText(er); } });
    if(cap) cap.textContent = V.support().stt ? 'Say "testing, one, two, three"...' : 'Mic works. (No speech-to-text in this browser.)';
    setTimeout(function(){ if(micTest === mt) stopMicTest(); }, 12000);
  }, function(){ if(micTest !== mt) return; if(cap) cap.textContent = 'Microphone blocked - allow mic access in your browser\'s address bar, or use typed mode.'; stopMicTest(); });
}
function sttErrorText(er){
  if(/not-allowed|service-not-allowed/.test(er)) return 'Speech recognition was blocked - allow the microphone for this site, or switch to typing.';
  if(/network/.test(er)) return 'The browser\'s speech service can\'t be reached (it needs a connection) - switch to typing or try again.';
  if(/audio-capture/.test(er)) return 'No microphone was found.';
  return 'Speech recognition stopped (' + er + ').';
}

/* ---- the live loop ----
   One question at a time. Every spoken question gets a sequence number: if
   anything happens while it's being read (Skip, Repeat, Done, leaving the
   tool), the stale read can never open the mic - so there is only ever one
   recognizer, one recorder and one level meter running. */
var ACKS = ['Okay.', 'Got it.', 'Mm-hm.', 'Alright.', 'Okay, noted.'];
function maxFollows(c){ return c.difficulty === 'brutal' ? 2 : 1; }
function startHot(){
  readHotSetup();
  var c = S.hot.cfg;
  if(!c.role){ var r = $('mockRole'); if(r){ r.focus(); r.classList.add('is-err'); } toast('Name the role you\'re interviewing for first.'); return; }
  stopMicTest();
  var t = target(), R = resumeModel();
  var seed = (Date.now() ^ (sessions().length * 7919)) >>> 0;
  var plan = S.hot.custom ? S.hot.custom.map(function(q, i){ return { id: 'c' + i, q: q.q || q, qtype: E.qtypeOf(q.q || q), comp: q.comp || 'general', source: q.source || 'custom', why: q.why || '', evidence: q.evidence || '' }; })
    : E.planLocal({ role: c.role, company: c.company, persona: c.persona, focus: c.focus, count: c.count, jd: t.jd || null, resume: R, seed: seed });
  var run = ++S.hot.run;
  S.hot = { phase: 'live', cfg: c, run: run, plan: plan, idx: 0, turns: [], follows: 0, followsTotal: 0, aiState: null, startedAt: new Date().toISOString(), id: E.uid('hs'), planSource: 'local', custom: S.hot.custom, customLabel: S.hot.customLabel, askSeq: 0, answerMode: c.mode, paused: false };
  try{ root.localStorage.setItem(K.MOCKDONE, '1'); }catch(e){}
  renderHotLive();
  // A tailored plan from the AI, while the opener is being asked (never blocks the start).
  if(userId() && !S.hot.custom && plan.length > 1){
    var resumeTxt = resumeText(R), storyTitles = stories().slice(0, 20).map(function(s){ return s.title; }).join('\n');
    // A question may quote any of this material; what it presents as theirs ("your resume says ...",
    // "you led ...") must be in their own resume and stories - the JD's requirements aren't their experience.
    var planCorpus = E.corpusOf(c.role, c.company, t.jd, resumeTxt, storyTitles), planOwn = E.corpusOf(resumeTxt, storyTitles);
    aiCall('plan', { role: c.role, company: c.company, jd: t.jd, resume: resumeTxt, stories: storyTitles, persona: c.persona, difficulty: c.difficulty, focus: c.focus, count: plan.length - 1, skip_opener: true }).then(function(r){
      var h = S.hot; if(!h || h.run !== run || !r.ok || !r.data || !Array.isArray(r.data.questions)) return;
      // A question that misquotes their resume or the JD is never read out.
      var qs = r.data.questions.filter(function(q){ return q && str(q.q, 300).length >= 8 && E.scrubText(q.q, planOwn, 300, planCorpus); }).slice(0, plan.length - 1);
      if(!qs.length) return;
      var keep = h.plan.slice(0, Math.max(1, h.idx + 1));
      var aiQs = qs.map(function(q, i){ return { id: 'a' + i, q: str(q.q, 300), qtype: E.qtypeOf(q.q), comp: q.competency || 'general', source: q.source || 'role', why: E.scrubText(q.why, planOwn, 200, planCorpus) || '', evidence: str(q.evidence, 200) }; });
      // Fewer AI questions survived the quote rule than you asked for: the built-in plan fills the rest,
      // so the interview is as long as you chose (and never "thin" because of the AI).
      var rest = h.plan.slice(keep.length).filter(function(p){ return !aiQs.some(function(a){ return a.q === p.q; }); });
      h.plan = keep.concat(aiQs, rest).slice(0, plan.length);
      h.planSource = 'ai'; updateHotHeader();
    });
  }
  askNext();
}
function renderHotLive(){
  var sec = $('mockSection'), h = S.hot, c = h.cfg, P = E.PERSONAS[c.persona];
  sec.innerHTML = head('The Hot Seat', esc(P.label) + ' · ' + esc(E.DIFFS[c.difficulty].label) + ' · ' + esc(c.role) + (c.company ? ' at ' + esc(c.company) : '')) +
    '<div class="hs-stage"><div class="hs-avatar ' + (c.difficulty) + '" id="hotAvatar"><span>' + esc(P.glyph) + '</span></div>' +
    '<div class="hs-who"><div class="hs-name">' + esc(P.label) + '</div><div class="hs-state" id="hotState" role="status" aria-live="polite">Getting ready…</div></div>' +
    '<div class="hs-meta"><div id="hotProgress" class="hs-prog"></div><div class="timer-big" id="hotTimer">0:00</div><div class="hs-target" id="hotTarget"></div></div></div>' +
    '<div id="mockBadge"></div>' +
    '<div class="mock-scroll" id="mockTranscript" aria-live="polite"></div>' +
    '<div class="tool-card hs-panel" id="hotVoicePanel">' +
    '<div class="hs-mic-row"><button class="hs-mic" data-act="hot-mic" id="hotMicBtn" aria-label="Microphone - start or finish your answer"><span class="hs-mic-dot"></span></button>' +
    '<div class="hs-cap-wrap"><div class="hs-cap" id="hotCaption" aria-live="polite">Your words will appear here as you speak.</div><div class="is-meter big"><i id="hotLevel"></i></div><div class="hs-live" id="hotLive"></div></div></div>' +
    '<div class="is-actions"><button class="btn" data-act="hot-done" id="hotDoneBtn">Done answering</button><button class="btn ghost" data-act="hot-repeat" id="hotRepeatBtn">Repeat question</button><button class="btn ghost" data-act="hot-type" id="hotTypeBtn">Type instead</button><button class="btn ghost" data-act="hot-skip" id="hotSkipBtn">Skip</button></div></div>' +
    '<div class="tool-card hs-panel" id="hotTypedPanel">' +
    '<span class="ip-label">Your answer</span><textarea class="ip-field body" id="mockAnswer" maxlength="12000" placeholder="Answer as you would out loud - full sentences, your real experience..."></textarea>' +
    '<div class="is-actions"><button class="btn" data-act="hot-submit" id="mockSubmitBtn">Submit answer</button><button class="btn ghost hidden" data-act="hot-voice" id="hotVoiceBtn">&#127908; Answer by voice</button><button class="btn ghost" data-act="hot-repeat">Repeat question</button><button class="btn ghost" data-act="hot-skip">Skip</button></div></div>' +
    '<div class="is-actions" id="hotEndRow"><button class="btn ghost" data-act="hot-end" id="hotEndBtn" aria-describedby="hotEndNote">End &amp; get my verdict</button><button class="btn ghost" data-act="hot-restart" id="mockRestartBtn">Restart</button><span class="is-fine" id="hotEndNote" style="margin:0; align-self:center;">Questions you don\'t reach count as unanswered.</span></div>';
  setBadge(); setAnswerPanels();
  var tr = $('mockTranscript'); (h.turns || []).forEach(function(tn){ addBubble('interviewer', tn.q, tn.follow); addBubble('you', tn.skipped ? '(skipped)' : tn.a); if(h.cfg.feedback === 'each' && tn.judge) renderJudgeCard(tn, tr); });
  if(h.current && !h.current.answered && h.phase === 'live') addBubble('interviewer', h.current.q, h.current.follow);
  updateHotHeader();
  if(h.phase === 'judging'){ ['hotVoicePanel', 'hotTypedPanel', 'hotEndRow'].forEach(function(id){ var el = $(id); if(el) el.classList.add('hidden'); }); hotState('The committee is deciding…', 'thinking'); }
}
/* The answer panel follows THIS answer's mode: a one-off switch to typing never
   turns voice off for the rest of the interview. */
function setAnswerPanels(){
  var h = S.hot; if(!h) return;
  var voice = h.answerMode === 'voice', vp = $('hotVoicePanel'), tp = $('hotTypedPanel'), vb = $('hotVoiceBtn');
  if(vp) vp.style.display = voice ? '' : 'none';
  if(tp) tp.style.display = voice ? 'none' : '';
  if(vb) vb.classList.toggle('hidden', voice || h.cfg.mode !== 'voice' || !!h.voiceBlocked || !V.support().stt);
}
function setBadge(){
  var b = $('mockBadge'), h = S.hot; if(!b || !h) return;
  b.innerHTML = h.aiState === 'ai' ? '<span class="mock-badge live">Live AI judge</span>'
    : h.aiNote ? '<span class="mock-badge local">Built-in judge (offline)</span><span class="is-badge-why">' + esc(h.aiNote) + '</span>'
    : userId() ? '<span class="mock-badge live">AI judge</span>'
    : '<span class="mock-badge local">Built-in judge (offline)</span><span class="is-badge-why">Sign in for the AI interviewer - this one is rule-based and says so.</span>';
}
function updateHotHeader(){
  var h = S.hot; if(!h || h.phase !== 'live') return;
  var main = h.turns.filter(function(t){ return !t.follow; }).length + (h.current && !h.current.follow && !h.current.answered ? 1 : 0);
  var el = $('hotProgress'); if(el) el.textContent = 'Question ' + Math.min(main || 1, h.plan.length) + ' of ' + h.plan.length + (h.current && h.current.follow ? ' · follow-up' : '') + (h.planSource === 'ai' ? ' · tailored' : '');
  var tg = $('hotTarget'); if(tg && h.current){ var T = E.targetFor(h.current.qtype); tg.textContent = 'Aim for ' + fmtSecs(T[0]) + '-' + fmtSecs(T[1]); }
}
function hotState(txt, cls){ var el = $('hotState'); if(el){ el.textContent = txt; el.className = 'hs-state ' + (cls || ''); } var av = $('hotAvatar'); if(av){ av.classList.toggle('speaking', cls === 'speaking'); av.classList.toggle('listening', cls === 'listening'); } }
/* Status lines in the caption are announced; the live transcript is not (it
   changes many times a second). */
function capMsg(text, err){ var cp = $('hotCaption'); if(!cp) return; cp.setAttribute('aria-live', 'polite'); cp.textContent = text; cp.classList.toggle('err', !!err); }
function addBubble(who, text, follow){
  var t = $('mockTranscript'); if(!t) return null;
  var d = D.createElement('div'); d.className = 'bubble ' + (who === 'you' ? 'you' : 'interviewer');
  d.innerHTML = '<div class="bubble-who">' + (who === 'you' ? 'You' : (follow ? 'Interviewer · follow-up' : 'Interviewer')) + '</div>' + esc(text);
  t.appendChild(d); try{ d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }catch(e){}
  return d;
}
async function askNext(){
  var h = S.hot; if(!h || h.phase !== 'live') return;
  var item = h.plan[h.idx];
  if(!item){ return finishSession(); }
  h.follows = 0;
  await ask(item.q, item.qtype, false, item);
}
/* On the live Hot Seat itself - not another tool, nor a past session or a question shown over it. */
function onLiveHot(){ return S.tool === 'hot' && !S.hotView && !S.hotPending && !(D && D.hidden); }
function askLive(run, seq){ var h = S.hot; return !!(h && h.run === run && h.phase === 'live' && h.askSeq === seq && !h.paused && !h.ending && onLiveHot()); }
async function ask(q, qtype, follow, item){
  var h = S.hot, run = h.run, c = h.cfg, seq = ++h.askSeq;
  h.current = { q: q, qtype: follow ? 'followup' : (qtype || E.qtypeOf(q)), follow: !!follow, item: item || null, answered: false };
  // A new question: voice comes back if it was only switched off for one answer.
  if(c.mode === 'voice' && !h.voiceBlocked) h.answerMode = 'voice';
  setAnswerPanels(); updateHotHeader(); addBubble('interviewer', q, follow);
  var ta = $('mockAnswer'); if(ta) ta.value = '';
  // Away from the Hot Seat: the question waits in the transcript - it's never read out to an empty room.
  if(!onLiveHot()){ h.paused = true; hotState(h.answerMode === 'voice' ? 'Paused - press the mic (or type) to answer' : 'Paused', ''); return; }
  h.paused = false;   // you're here: this question is asked normally
  if(c.tts && V.support().tts){ hotState('Speaking…', 'speaking'); await V.speak(q, { voiceURI: c.voiceURI, rate: c.rate, pitch: (E.PERSONAS[c.persona].voice || {}).pitch }); }
  if(!askLive(run, seq)) return;
  startAnswer();
}
function startAnswer(){
  var h = S.hot; if(!h || h.phase !== 'live' || !h.current || h.current.answered) return;
  var c = h.cfg, run = h.run;
  stopListening(true);                                   // never two recognizers at once
  var prev = h.ans, kept = prev && prev.forQ === h.current && prev.kept ? prev.kept : '';
  var ans = { startedAt: now(), run: run, words: words(kept).length, lastActivity: now(), interrupted: false, forQ: h.current, kept: kept, resumed: !!kept };
  h.ans = ans; h.finishing = false; h.paused = false;
  var lc = $('hotLive'); if(lc) lc.innerHTML = '';
  startTimer(); setAnswerPanels();
  if(h.answerMode !== 'voice'){ hotState('Your turn - type your answer', 'listening'); var ta = $('mockAnswer'); if(ta){ if(!ta.value && kept) ta.value = kept; try{ ta.focus({ preventScroll: true }); }catch(e){} } return; }
  // "Listening" only once the recognizer is really running - words said before that would be lost.
  hotState('Opening your mic…', 'thinking'); ans.opening = true;
  capMsg(kept ? 'Picking up where you left off…' : 'One moment…');
  function stillWanted(){ var hh = S.hot; return !!(hh && hh.ans === ans && !ans.cancelled && hh.phase === 'live' && !hh.paused && !hh.ending && !hh.finishing && hh.answerMode === 'voice' && onLiveHot() && hh.current === ans.forQ && !ans.forQ.answered); }
  V.openMic().then(function(stream){
    if(!stillWanted()){ ans.opening = false; releaseMic(); return; }
    ans.opening = false; ans.startedAt = now(); ans.lastActivity = now();
    // Voice activity against an adaptive noise floor, so a noisy room can't hold the answer open forever.
    var hist = [];
    ans.meter = V.meter(stream, function(fr){
      var lv = $('hotLevel'); if(lv) lv.style.width = Math.min(100, Math.round(fr.rms * 900)) + '%';
      hist.push(fr.rms); if(hist.length > 60) hist.shift();
      var floor = hist.slice().sort(function(x, y){ return x - y; })[Math.floor(hist.length * 0.2)] || 0;
      if(fr.rms > Math.max(0.015, floor * 3)) ans.lastVoice = now();
    });
    ans.rec = V.record(stream);
    ans.stt = V.listen({
      onUpdate: function(txt, interim){
        if(!S.hot || S.hot.ans !== ans) return;
        var full = clean((ans.kept ? ans.kept + ' ' : '') + txt); ans.words = words(full).length; ans.lastActivity = now();
        var cp = $('hotCaption'); if(cp){ cp.setAttribute('aria-live', 'off'); cp.classList.remove('err'); cp.innerHTML = esc(full.slice(0, full.length - (interim || '').length)) + '<span class="hs-interim">' + esc(interim || '') + '</span>'; }
        liveChips(full);
      },
      onError: function(er){
        if(!S.hot || S.hot.ans !== ans) return;
        // A blocked or missing mic won't come back mid-interview; a network blip will.
        var hard = /not-allowed|service-not-allowed|audio-capture|language-not-supported/.test(er);
        if(hard) S.hot.voiceBlocked = true;
        switchToTyped();
        var msg = sttErrorText(er) + (hard ? ' Switched to typing for the rest of this interview.' : ' Switched to typing for this answer - voice comes back on the next question.');
        capMsg(msg, true); toast(msg);
      }
    });
    if(!ans.stt){ S.hot.voiceBlocked = true; switchToTyped(); return; }
    hotState('Listening…', 'listening');
    if(ans.kept) capMsg(ans.kept); else capMsg('Listening… start whenever you\'re ready.');
  }, function(){
    if(!stillWanted()){ ans.opening = false; return; }
    ans.opening = false; S.hot.voiceBlocked = true; switchToTyped();
    var msg = 'Microphone blocked or missing - allow mic access in your browser, or keep going by typing.';
    capMsg(msg, true); toast(msg);
  });
}
function liveChips(txt){
  var el = $('hotLive'); if(!el || !S.hot || !S.hot.ans) return;
  var a = E.analyzeAnswer(txt, { qtype: S.hot.current.qtype, mode: 'voice', seconds: S.hot.ans.resumed ? 0 : (now() - S.hot.ans.startedAt) / 1000 });
  el.innerHTML = '<span>' + a.words + ' words</span>' + (a.wpm ? '<span class="' + (a.pace === 'good' ? '' : 'w') + '">' + a.wpm + ' wpm</span>' : '') + '<span class="' + (a.fillers.count >= 3 ? 'w' : '') + '">' + a.fillers.count + ' fillers</span><span class="' + (a.iSubj >= a.weSubj ? '' : 'w') + '">I ' + a.iSubj + ' · we ' + a.weSubj + '</span>';
}
/* Typing for THIS answer: whatever was already heard moves into the box. */
function switchToTyped(){
  var h = S.hot; if(!h) return;
  var heard = h.ans && h.ans.forQ === h.current ? clean(((h.ans.kept || '') + ' ' + (h.ans.stt ? h.ans.stt.text() : '')).trim()) : '';
  stopListening(true);
  h.answerMode = 'text'; setAnswerPanels();
  var ta = $('mockAnswer'); if(ta){ if(heard && !ta.value) ta.value = heard; try{ ta.focus({ preventScroll: true }); }catch(e){} }
  if(h.ans){ h.ans.kept = ''; }
  hotState('Your turn - type your answer', 'listening');
  releaseMic();
}
function switchToVoice(){
  var h = S.hot; if(!h || h.phase !== 'live' || !h.current || h.current.answered || h.finishing || h.voiceBlocked) return;
  var ta = $('mockAnswer'), typed = ta ? clean(ta.value) : '';
  h.askSeq++; V.stopSpeaking();
  h.answerMode = 'voice';
  if(typed){ h.ans = { forQ: h.current, kept: typed }; if(ta) ta.value = ''; }
  startAnswer();
}
var timerH = null, watchH = null;
function startTimer(){
  stopTimer();
  var h = S.hot, el = $('hotTimer'), T = E.targetFor(h.current.qtype);
  var cap = h.cfg.interrupt ? (h.cfg.difficulty === 'brutal' ? T[1] : T[1] + 20) : null;
  timerH = setInterval(function(){
    if(!S.hot || !S.hot.ans) return;
    var secs = (now() - S.hot.ans.startedAt) / 1000;
    if(el){ el.textContent = fmtSecs(secs); el.style.color = secs > T[1] ? 'var(--danger)' : secs > T[1] * 0.85 ? 'var(--gold)' : ''; }
  }, 250);
  watchH = setInterval(function(){
    var hh = S.hot; if(!hh || !hh.ans || hh.finishing || hh.phase !== 'live' || hh.paused || hh.ending) return;
    var a = hh.ans, secs = (now() - a.startedAt) / 1000;
    if(hh.answerMode !== 'voice' || a.opening || !a.stt) return;
    if(cap && secs >= cap && a.words >= 5){ a.interrupted = true; finishAnswer('cap'); return; }
    if(secs >= 300){ finishAnswer('max'); return; }
    var last = Math.max(a.lastActivity || 0, a.lastVoice || 0);
    if(hh.cfg.handsfree && a.words >= 4 && now() - last >= 3200) finishAnswer('silence');
  }, 250);
}
function stopTimer(){ if(timerH){ clearInterval(timerH); timerH = null; } if(watchH){ clearInterval(watchH); watchH = null; } }
function stopListening(abortOnly){
  var a = S.hot && S.hot.ans; if(!a) return null;
  if(a.opening){ a.cancelled = true; a.opening = false; }   // a mic still opening is never used once it arrives
  var out = { stt: null, frames: null, rec: null };
  if(a.stt){ if(abortOnly){ a.stt.abort(); } else out.stt = a.stt.stop(); a.stt = null; }
  if(a.meter){ out.frames = a.meter.stop(); a.meter = null; }
  if(a.rec){ out.rec = a.rec.stop(); a.rec = null; }
  return out;
}
/* Leaving the Hot Seat mid-question: nothing keeps listening in the background,
   what was already said is kept, and the mic is released. */
function pauseHot(){
  var h = S.hot; stopTimer(); V.stopSpeaking();
  if(h){
    h.askSeq++; h.paused = true;
    if(h.ans && h.ans.stt && h.ans.forQ === h.current){ var t = clean(h.ans.stt.text()); if(t) h.ans.kept = clean((h.ans.kept || '') + ' ' + t); h.ans.resumed = true; }
    // A typed answer in progress is kept too: the box is redrawn when you come back, and it's put back in.
    var ta = $('mockAnswer');
    if(h.phase === 'live' && h.current && !h.current.answered && h.answerMode !== 'voice' && ta && clean(ta.value)){
      if(!(h.ans && h.ans.forQ === h.current)) h.ans = { forQ: h.current, startedAt: now() };
      h.ans.kept = ta.value;
    }
  }
  stopListening(true);
  if(h && h.phase === 'live') hotState(h.current && !h.current.answered ? 'Paused - press the mic to pick up where you left off' : 'Paused', '');
  releaseMic();
}
function finishAnswer(reason, typedText){
  var h = S.hot; if(!h || h.phase !== 'live' || h.finishing || !h.current || h.current.answered) return Promise.resolve();
  var p = finishAnswerNow(reason, typedText); h.pendingFinish = p;
  return p;
}
async function finishAnswerNow(reason, typedText){
  var h = S.hot;
  h.finishing = true; stopTimer(); h.askSeq++;
  var run = h.run, a = h.ans && h.ans.forQ === h.current ? h.ans : { startedAt: now() }, c = h.cfg, cur = h.current;
  var mode = h.answerMode === 'voice' && typedText == null ? 'voice' : 'text';
  var elapsed = (now() - a.startedAt) / 1000, text = '';
  var got = mode === 'voice' ? stopListening(false) : (stopListening(true), null);
  var sttRes = null, frames = null, audio = null;
  if(got){ sttRes = got.stt ? await got.stt : null; frames = got.frames; audio = got.rec ? await got.rec : null; }
  if(!S.hot || S.hot.run !== run) return;
  text = typedText != null ? clean(typedText) : clean(((a.kept || '') + ' ' + (sttRes ? sttRes.text : '')).trim());
  if(!text){
    h.finishing = false;
    if(mode === 'voice'){ capMsg('I didn\'t catch anything. Press the mic and try again, or type your answer.', true); hotState('Didn\'t hear you', ''); var lv = $('hotLevel'); if(lv) lv.style.width = '0%'; releaseMic(); }
    return;
  }
  cur.answered = true;
  var fa = frames ? E.analyzeFrames(frames, { startT: 0 }) : null;
  var opts = { question: cur.q, qtype: cur.qtype, mode: mode, interrupted: !!a.interrupted };
  if(mode === 'voice'){
    var first = fa && fa.latency != null ? fa.latency : (sttRes && sttRes.firstAt ? Math.max(0, (sttRes.firstAt - a.startedAt) / 1000 - 0.7) : 0);
    var last = fa && fa.lastSpeech != null ? fa.lastSpeech : (sttRes && sttRes.lastAt ? (sttRes.lastAt - a.startedAt) / 1000 : elapsed);
    // An answer that was paused and picked up again has no single clock - its timing is estimated, never scored.
    opts.seconds = a.resumed ? 0 : Math.max(1, last - first); opts.latency = !a.resumed && fa && fa.latency != null ? fa.latency : null;
    opts.longestPause = !a.resumed && fa ? fa.longestPause : null; opts.pauses = fa ? fa.pauses : null; opts.pitchVar = fa ? fa.pitchVar : null;
  }
  var analysis = E.analyzeAnswer(text, opts);
  addBubble('you', text);
  var turn = { q: cur.q, a: text, qtype: cur.qtype, follow: cur.follow, comp: cur.item && cur.item.comp, analysis: analysis, audioUrl: audio && audio.url, reason: reason };
  if(audio && audio.url){
    S.audio[h.id + ':' + h.turns.length] = audio.url;
    var ids = []; Object.keys(S.audio).forEach(function(k){ var sid = k.split(':')[0]; if(ids.indexOf(sid) < 0) ids.push(sid); });
    ids.slice(0, Math.max(0, ids.length - 2)).forEach(function(old){ Object.keys(S.audio).forEach(function(k){ if(k.split(':')[0] === old){ try{ URL.revokeObjectURL(S.audio[k]); }catch(e){} delete S.audio[k]; } }); });
  }
  hotState(c.feedback === 'each' ? 'Judging your answer…' : 'Taking notes…', 'thinking');
  var lvl = $('hotLevel'); if(lvl) lvl.style.width = '0%';
  // Cut off at the time cap: the interviewer says so at once, like a real one - never "Okay." first.
  // Otherwise fill the silence while the judge works.
  var capped = reason === 'cap' && !!a.interrupted;
  if(capped) addBubble('interviewer', 'Let me stop you there.', true);
  var ackP = (mode === 'voice' && c.tts && !h.paused && !h.ending && (capped || c.feedback === 'end')) ? V.speak(capped ? 'Let me stop you there.' : ACKS[h.turns.length % ACKS.length], { voiceURI: c.voiceURI, rate: c.rate }) : null;
  turn.judge = await judgeTurn(turn);
  if(ackP) await ackP;
  if(!S.hot || S.hot.run !== run) return;
  h.turns.push(turn);
  var going = function(){ return S.hot && S.hot.run === run && S.hot.phase === 'live' && !h.ending; };
  if(c.feedback === 'each'){
    renderJudgeCard(turn, $('mockTranscript'));
    if(going() && !h.paused && onLiveHot() && mode === 'voice' && c.tts && c.speakVerdict && turn.judge.headline){
      // A headline that hands you a figure you never gave is never read out - the card shows it with its warning.
      var hl = turn.judge.headline, said = sayFlags(answersCorpus(h.turns), [hl], true).length ? spokenBand(turn.judge.overall) + ' The card has the details - one suggested figure there isn\'t from your answers.'
        : hl === neutralHeadline(turn.judge.overall) ? spokenBand(turn.judge.overall) : hl;   // "see the notes below" is for the page, not the ear
      hotState('Verdict', 'speaking'); await V.speak(turn.judge.unscored ? hl : turn.judge.overall + ' out of 10. ' + said, { voiceURI: c.voiceURI, rate: c.rate });
    }
  }
  h.finishing = false;
  // What comes next: a follow-up that drills the weak spot, or the next question.
  var fu = turn.judge.follow_up || {};
  var budget = h.followsTotal < h.plan.length && h.follows < maxFollows(c) && cur.qtype !== 'closing';
  var nextFollow = a.interrupted && budget ? (capped ? '' : 'Let me stop you there. ') + (analysis.star.r ? 'In one sentence - what\'s the one thing you want me to remember from that?' : 'In one sentence: what was the result?')
    : fu.ask && fu.question && budget && !askedBefore(fu.question) ? fu.question : '';
  if(!going()){
    // Ended while this answer was being judged: the follow-up the interviewer was about to
    // ask counts as unanswered - exactly as if it had been asked and the interview ended.
    if(S.hot === h && h.ending && nextFollow) h.pendingFollow = { q: nextFollow, qtype: 'followup', comp: cur.item && cur.item.comp };
    return;
  }
  if(nextFollow){ h.follows++; h.followsTotal++; return ask(nextFollow, 'followup', true, cur.item); }
  h.idx++;
  if(h.idx >= h.plan.length) return finishSession();
  return askNext();
}
/* Skip: the question still counts - as unanswered. */
function skipQuestion(){
  var h = S.hot; if(!h || h.phase !== 'live' || h.finishing || h.ending || !h.current || h.current.answered) return;
  h.askSeq++; stopTimer(); V.stopSpeaking(); stopListening(true);
  var cur = h.current; cur.answered = true; h.ans = null;
  h.turns.push({ q: cur.q, a: '', qtype: cur.qtype, follow: cur.follow, comp: cur.item && cur.item.comp, skipped: true, judge: null, analysis: null });
  addBubble('you', '(skipped)');
  var ta = $('mockAnswer'); if(ta) ta.value = '';
  h.idx++;
  if(h.idx >= h.plan.length) finishSession(); else askNext();
}
function repeatQuestion(){
  var h = S.hot; if(!h || h.phase !== 'live' || !h.current || h.current.answered || h.finishing || h.ending) return;
  var run = h.run, seq = ++h.askSeq, cq = h.current;
  if(h.ans && h.ans.stt && h.ans.forQ === cq){ var t = clean(h.ans.stt.text()); if(t) h.ans.kept = clean((h.ans.kept || '') + ' ' + t); h.ans.resumed = true; }
  stopListening(true); stopTimer(); h.paused = false;
  hotState('Speaking…', 'speaking');
  V.speak(cq.q, { voiceURI: h.cfg.voiceURI, rate: h.cfg.rate }).then(function(){ if(askLive(run, seq) && S.hot.current === cq && !cq.answered) startAnswer(); });
}
/* End: an answer in progress or still being judged is finished first - it
   counts in the verdict. */
async function endHot(){
  var h = S.hot; if(!h || h.phase !== 'live' || h.ending) return;
  h.ending = true; h.askSeq++; V.stopSpeaking(); stopTimer();
  if(!h.finishing && h.current && !h.current.answered){
    var ta = $('mockAnswer'), typed = h.answerMode !== 'voice' && ta ? clean(ta.value) : '';
    var mine = h.ans && h.ans.forQ === h.current ? h.ans : null;
    var spoken = h.answerMode === 'voice' && mine ? clean(((mine.kept || '') + ' ' + (mine.stt ? mine.stt.text() : '')).trim()) : '';
    if(words(typed).length >= 3){ if(ta) ta.value = ''; await finishAnswer('end', typed); }
    else if(words(spoken).length >= 3){ if(!mine.stt){ h.answerMode = 'text'; await finishAnswer('end', spoken); } else await finishAnswer('end'); }
  }
  if(h.pendingFinish){ hotState('Scoring your last answer…', 'thinking'); try{ await h.pendingFinish; }catch(e){} }
  if(S.hot !== h) return;
  h.ending = false;
  if(h.turns.some(function(t){ return !E.unanswered(t); })) recordUnreached(h);
  return finishSession();
}
/* Ending early is not a free pass: the question on the table counts as unanswered,
   and so does every planned question you never reached - exactly like skipping them. */
function recordUnreached(h){
  var cur = h.current;
  if(cur && !cur.answered){ cur.answered = true; h.turns.push({ q: cur.q, a: '', qtype: cur.qtype, follow: cur.follow, comp: cur.item && cur.item.comp, skipped: true, judge: null, analysis: null }); }
  if(h.pendingFollow){ var pf = h.pendingFollow; h.pendingFollow = null; h.turns.push({ q: pf.q, a: '', qtype: pf.qtype, follow: true, comp: pf.comp, skipped: true, not_reached: true, judge: null, analysis: null }); }
  h.plan.slice(h.idx + 1).forEach(function(item){ h.turns.push({ q: item.q, a: '', qtype: item.qtype, follow: false, comp: item.comp, skipped: true, not_reached: true, judge: null, analysis: null }); });
  h.idx = h.plan.length;
}
// A real interviewer never asks you the identical question twice in one sitting.
function qkey(q){ return E.qtoks(q).join(' '); }
function askedBefore(q){ var k = qkey(q), h = S.hot; return !!(h && (h.turns.some(function(t){ return qkey(t.q) === k; }) || (h.current && qkey(h.current.q) === k))); }
function historyText(){
  var h = S.hot; if(!h) return '';
  return h.turns.slice(-6).map(function(t, i){ return 'Q' + (i + 1) + (t.follow ? ' (follow-up)' : '') + ': ' + t.q + '\nA: ' + (t.skipped ? '(skipped)' : t.a.slice(0, 260) + (t.a.length > 260 ? '…' : '')) + '\nQuick score: ' + (t.judge ? (t.judge.unscored ? 'not scored (not in English)' : t.judge.overall + '/10') : 'none'); }).join('\n').slice(0, 3800);
}
function metaFor(a){
  return { mode: a.mode, seconds: a.timingEstimated ? null : a.seconds, target_lo: a.target[0], target_hi: a.target[1], wpm: a.wpm, words: a.words, fillers: a.fillers.count, filler_words: a.fillers.top.map(function(p){ return p[0]; }), hedges: a.hedges.count, hedge_words: a.hedges.top.map(function(p){ return p[0]; }), longest_pause: a.longestPause, latency: a.latency, i_count: a.iCount, we_count: a.weCount, i_subj: a.iSubj, we_subj: a.weSubj, interrupted: a.interrupted };
}
/* The score's band, said out loud. */
function spokenBand(ov){ ov = num(ov, 1, 10) || 0; return ov >= 8 ? 'Strong answer.' : ov >= 6 ? 'Solid, with room to sharpen.' : 'This answer needs work.'; }
/* A headline for the AI's score when its own line was withheld: neutral, never the built-in judge's reading. */
function neutralHeadline(ov){ ov = num(ov, 1, 10) || 0; return ov >= 8 ? 'Strong answer - the notes below say why.' : ov >= 6 ? 'Solid, with room to sharpen - see the notes below.' : 'This answer needs work - see the notes below.'; }
async function judgeTurn(turn){
  // The follow-up is decided even if End was pressed meanwhile: an unasked follow-up counts as unanswered then.
  var h = S.hot, c = h.cfg, allow = h.follows < maxFollows(c) && h.followsTotal < h.plan.length && turn.qtype !== 'closing';
  var local = E.judgeLocal(turn.q, turn.a, { analysis: turn.analysis, difficulty: c.difficulty, persona: c.persona, allowFollowUp: allow });
  if(!userId() || h.aiOff){ return local; }
  // Their earlier answers go along: the judge may quote them (contradictions) - and only them.
  var earlier = h.turns.filter(function(t){ return !t.skipped && t.a; }).slice(-8).map(function(t){ return t.a.slice(0, 2500); });
  var r = await aiCall('turn', { role: c.role, company: c.company, persona: c.persona, difficulty: c.difficulty, qtype: turn.qtype, question: turn.q.slice(0, 1000), answer: turn.a.slice(0, 12000), history: historyText(), earlier: earlier, meta: metaFor(turn.analysis), allow_follow_up: allow });
  var checked = r.ok ? E.checkAIJudgement(r.data, turn.a, turn.q, local, earlier, metaFor(turn.analysis)) : null;
  if(checked){
    if(!checked.headline) checked.headline = neutralHeadline(checked.overall);   // the AI's own line was dropped for an unverifiable quote
    if(!allow) checked.follow_up = { ask: false, question: '', why: '' };
    checked.analysis = turn.analysis; h.aiState = 'ai'; h.aiNote = ''; setBadge(); return checked;
  }
  // The AI didn't come through: say why, and let the built-in judge score this answer.
  h.aiState = 'local'; h.aiNote = aiMsg(r, 'interviewer') + ' The built-in judge scored this answer.';
  if(r.timeout){ h.aiTimeouts = (h.aiTimeouts || 0) + 1; if(h.aiTimeouts >= 2){ h.aiOff = true; h.aiNote = 'The AI interviewer is too slow right now - the built-in judge is running the rest of this interview.'; } }
  if(r.status === 401 || r.status === 403 || r.status === -1 || r.status === 503){ h.aiOff = true; h.aiNote = aiMsg(r, 'interviewer') + ' The built-in judge is running this interview.'; }
  setBadge();
  return local;
}
function scoreColor(o){ o = Number(o) || 0; return o >= 8 ? 'var(--aurora)' : o >= 5 ? 'var(--gold)' : 'var(--danger)'; }
function renderJudgeCard(turn, host){
  if(!host || !turn.judge) return;
  var j = turn.judge, a = turn.analysis, box = D.createElement('div'); box.className = 'fb-card';
  var filled = j.filled_dims || [];
  var dims = E.DIMS.map(function(d){ var v = j.scores[d], f = filled.indexOf(d) >= 0; return '<span class="fb-dim" title="' + esc(E.DIM_LABEL[d] + (f ? ' - scored by the built-in judge (the AI left it out)' : '')) + '"><i>' + esc(E.DIM_LABEL[d]) + (f ? '*' : '') + '</i>' + dots(v, E.DIM_LABEL[d]) + '</span>'; }).join('');
  var del = a.mode === 'voice' ? '<div class="fb-measured"><span class="fb-mk">Measured</span>' + [(a.timingEstimated ? '~' : '') + fmtSecs(a.seconds) + (a.timingEstimated ? ' (estimated)' : a.length.status === 'ok' ? '' : ' (' + a.length.status.replace('-', ' ') + ')'), a.wpm ? a.wpm + ' wpm' : '', a.fillers.count + ' fillers' + (a.fillers.top.length ? ' (' + a.fillers.top.slice(0, 2).map(function(p){ return p[0]; }).join(', ') + ')' : ''), a.longestPause ? 'longest pause ' + a.longestPause + 's' : '', a.latency != null ? 'started after ' + a.latency + 's' : '', 'I ' + a.iSubj + ' / we ' + a.weSubj].filter(Boolean).map(function(x){ return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '<div class="fb-measured"><span class="fb-mk">Measured</span><span>' + a.words + ' words (~' + fmtSecs(a.seconds) + ' spoken)</span><span>' + a.fillers.count + ' fillers</span><span>I ' + a.iSubj + ' / we ' + a.weSubj + '</span></div>';
  var bf = j.better_flagged || (j.better ? E.honestyCheck(turn.a, j.better).flagged : []);
  // Figures the Missing list (or a line the headline / a red flag quotes for you) hands you that you never gave.
  var mine = answersCorpus(S.hot && arr(S.hot.turns).indexOf(turn) >= 0 ? S.hot.turns : [], turn.a);
  // Each warning sits under the line that carries the figure, and each figure is warned once.
  var shown = Object.create(null), headW = lineWarn(sayFlags(mine, [j.headline], true), shown, 'your answers');
  var missW = j.missing.map(function(m){ return lineWarn(sayFlags(mine, [m]), shown, 'your answers'); });
  var bfx = E.figList(bf).filter(function(f){ return !shown[f]; }); bfx.forEach(function(f){ shown[f] = 1; });
  var flagW = (j.red_flags || []).map(function(f){ return lineWarn(sayFlags(mine, [f], true), shown, 'your answers'); });
  box.innerHTML = '<div class="fb-top"><span class="fb-score" style="color:' + (j.unscored ? 'var(--text-dim)' : scoreColor(j.overall)) + ';">' + (j.unscored ? 'Not scored' : esc(num(j.overall, 0, 10)) + '/10') + '</span>' + aiBadge(j.source) + '<span class="fb-head">' + esc(j.headline) + '</span></div>' + headW +
    '<div class="fb-dims">' + dims + '</div>' + (filled.length ? '<div class="fb-fine">* The AI left ' + filled.length + ' dimension' + (filled.length === 1 ? '' : 's') + ' unscored - filled in by the built-in judge.</div>' : '') +
    (j.evidence.length ? '<ul class="fb-list fb-ev">' + j.evidence.map(function(e){ return '<li><q>' + esc(e.quote) + '</q> ' + esc(e.issue) + '</li>'; }).join('') + '</ul>' : '') +
    (j.missing.length ? '<div class="fb-sub">Missing</div><ul class="fb-list fb-improve">' + j.missing.map(function(m, k){ return '<li>' + esc(m) + missW[k] + '</li>'; }).join('') + '</ul>' : '') +
    (j.better ? '<div class="fb-sub">A stronger answer</div><p class="fb-better">' + esc(j.better) + '</p>' + (bfx.length ? note('warn', '<b>Not in your answers:</b> ' + bfx.map(function(f){ return '<code>' + esc(f) + '</code>'; }).join(' ') + ' - only say figures you really have.') : '') : '') +
    (j.red_flags && j.red_flags.length ? '<div class="fb-flags">' + j.red_flags.map(function(f, k){ return '<span>&#9888; ' + esc(f) + flagW[k] + '</span>'; }).join('') + '</div>' : '') + del +
    (turn.audioUrl ? '<audio controls preload="none" src="' + esc(turn.audioUrl) + '"></audio>' : '') +
    (j.unverified_quotes ? '<div class="fb-fine">' + esc(j.unverified_quotes) + ' AI line' + (j.unverified_quotes === 1 ? '' : 's') + ' that credited you with words or figures you never gave ' + (j.unverified_quotes === 1 ? 'was' : 'were') + ' removed.</div>' : '');
  host.appendChild(box);
}
function dots(v, label){ var out = '<span class="rubric-dots" role="img" aria-label="' + esc((label ? label + ': ' : '') + (v ? v + ' out of 5' : 'not scored')) + '">'; for(var i = 1; i <= 5; i++) out += '<span class="rubric-dot' + (v && i <= v ? ' on' : '') + '"></span>'; return out + '</span>'; }
function submitTyped(){
  var h = S.hot; if(!h || h.phase !== 'live' || h.ending) return;
  var ta = $('mockAnswer'), v = ta ? ta.value.trim() : '';
  if(!v){ if(ta) ta.focus(); return; }
  if(h.finishing || !h.current || h.current.answered) return;
  var btn = $('mockSubmitBtn'); busy(btn, true, 'Judging…');
  if(ta) ta.value = '';
  Promise.resolve(finishAnswer('typed', v)).then(function(){ busy(btn, false); }, function(){ busy(btn, false); });
}
function sessionMode(turns){
  var modes = uniq(turns.filter(function(t){ return t.analysis; }).map(function(t){ return t.analysis.mode; }));
  return modes.length === 1 ? modes[0] : modes.length ? 'mixed' : 'text';
}
async function finishSession(){
  var h = S.hot; if(!h || h.phase !== 'live') return;
  var run = h.run, c = h.cfg; h.askSeq++; stopTimer(); stopListening(true);
  h.phase = 'judging';
  releaseMic();
  hotState('The committee is deciding…', 'thinking');
  ['hotVoicePanel', 'hotTypedPanel', 'hotEndRow'].forEach(function(id){ var el = $(id); if(el) el.classList.add('hidden'); });
  var answered = h.turns.filter(function(t){ return !E.unanswered(t); });   // "um" or "next question" isn't an answer
  if(c.mode === 'voice' && c.tts && answered.length && S.tool === 'hot'){ await V.speak('That\'s all from me. Thanks for your time.', { voiceURI: c.voiceURI, rate: c.rate }); }
  if(!answered.length){ h.phase = 'setup'; renderHot(); toast(h.turns.length ? 'No real answers to judge - every question was skipped or passed.' : 'No answers yet - nothing to judge.'); return; }
  var local = E.localVerdict(h.turns, { difficulty: c.difficulty }), verdict = null;
  if(userId() && !h.aiOff){
    var body = { role: c.role, company: c.company, persona: c.persona, difficulty: c.difficulty, turns: h.turns.map(function(t){ return t.skipped ? (t.not_reached ? { q: t.q, a: '', follow: !!t.follow, skipped: true, not_reached: true } : { q: t.q, a: '', follow: !!t.follow, skipped: true }) : { q: t.q, a: t.a.slice(0, 2400), follow: !!t.follow, overall: t.judge.overall, meta: metaFor(t.analysis) }; }) };
    var r = await aiCall('verdict', body);
    verdict = r.ok ? E.checkAIVerdict(r.data, body.turns) : null;
    if(!verdict) h.verdictNote = aiMsg(r, 'hiring committee') + ' The built-in judge gave the verdict.';
  }
  // The interview you just finished is ALWAYS saved - even if you opened a past session or
  // started another one while the committee was deciding. Only showing it depends on where you are.
  if(!verdict) verdict = local;
  // Every answer was in a language the built-in judge can't read: nothing is scored, nothing is made up.
  if(!verdict){ h.phase = 'setup'; renderHot(); toast('The built-in judge reads English only, so none of these answers could be scored. Answer in English to be judged.'); return; }
  if(!local) local = { dims: {}, delivery: E.deliverySummary(answered), rules: [], answered: answered.length, asked: h.turns.length };
  verdict.dims = local.dims; verdict.delivery = local.delivery; verdict.rules = local.rules;
  // Figure flags against the FULL answers: the transcript kept below is shortened, and a figure you
  // really said must never be flagged later just because it fell past the cut.
  var flags = verdictFlags(verdict, h.turns);
  var session = {
    id: h.id, at: h.startedAt, role: c.role, company: c.company, persona: c.persona, difficulty: c.difficulty, focus: c.focus, mode: sessionMode(h.turns), feedback: c.feedback, source: verdict.source, flags: flags,
    verdict: { decision: verdict.decision, overall: verdict.overall, headline: verdict.headline, reasons: verdict.reasons, strengths: verdict.strengths, bar_raiser: verdict.bar_raiser, top_fixes: verdict.top_fixes, per_question: verdict.per_question, competencies: verdict.competencies || [], unverified_quotes: (verdict.unverified_quotes || 0) + answered.reduce(function(n, t){ return n + ((t.judge && num(t.judge.unverified_quotes, 0, 99)) || 0); }, 0), rules: local.rules, answered: local.answered, asked: local.asked },
    dims: local.dims, delivery: local.delivery, note: h.verdictNote || '',
    issues: uniq([].concat.apply([], answered.map(function(t){ var ks = E.localIssues(t.analysis).map(function(i){ return i.key; }).filter(function(k){ return k !== 'english'; }); return t.judge && t.judge.source === 'ai' ? ks.filter(function(k){ return E.MEASURED_ISSUES.indexOf(k) >= 0; }) : ks; }))),
    turns: h.turns.map(function(t){
      if(t.skipped) return { q: t.q, a: '', qtype: t.qtype, follow: !!t.follow, skipped: true, not_reached: t.not_reached === true, judge: null, m: {} };
      var j = t.judge, a = t.analysis;
      return { q: t.q, a: t.a.slice(0, 1500), qtype: t.qtype, follow: !!t.follow, judge: { source: j.source, unscored: j.unscored === true, scores: j.scores, overall: j.overall, headline: j.headline, evidence: (j.evidence || []).slice(0, 2), missing: (j.missing || []).slice(0, 2), better: j.better || '' }, m: { seconds: a.seconds, wpm: a.wpm, words: a.words, fillers: a.fillers.count, fillerTop: a.fillers.top.slice(0, 3), hedges: a.hedges.count, i: a.iCount, we: a.weCount, is: a.iSubj, ws: a.weSubj, latency: a.latency, longestPause: a.longestPause, pitchVar: a.pitchVar, interrupted: a.interrupted, mode: a.mode, status: a.length.status } };
    })
  };
  var all = sessions(); all.unshift(session); var trimmed = all.slice(0, 40);
  if(!lsSet(K.SESS, trimmed)){ trimmed = all.slice(0, 15); if(!lsSet(K.SESS, trimmed)) toast('Storage is full - this session couldn\'t be saved, but here\'s your verdict.'); }
  syncSession(session);
  h.phase = 'results'; h.session = session;
  refreshCounts();
  var here = S.hot === h && S.hot.run === run;
  if(!here){ toast('Your last interview\'s verdict is in - it\'s saved in your progress.'); return; }
  if(S.hotView || S.hotPending){ toast('Your verdict is in - press "Back to it" to see it.'); return; }   // never pulled out from under what you're reading
  renderHotResults(session, h);
  // Never read out a line that hands you a figure you didn't give: the page shows it with its warning.
  if(c.mode === 'voice' && c.tts && onLiveHot()){ quiet(V.speak('The committee\'s decision: ' + E.DECISION_LABEL[verdict.decision] + '. ' + (flags.headline.length ? 'The details are on the page - one suggested figure there isn\'t from your answers.' : (verdict.headline || '')), { voiceURI: c.voiceURI, rate: c.rate })); }
}
/* Sync to the account under the server's size cap (it measures Python's JSON):
   trim the least useful detail first, and say so plainly when a session could
   only be saved on this device. */
function pyJsonLen(v){
  if(v === undefined || typeof v === 'function') return -1;
  if(v === null) return 4;
  if(typeof v === 'boolean') return v ? 4 : 5;
  if(typeof v === 'number') return isFinite(v) ? JSON.stringify(v).length : 4;
  if(typeof v === 'string'){ var n = JSON.stringify(v).length; for(var i = 0; i < v.length; i++) if(v.charCodeAt(i) >= 127) n += 5; return n; }
  if(Array.isArray(v)){ var t = 2; v.forEach(function(x, i){ var l = pyJsonLen(x); t += (l < 0 ? 4 : l) + (i ? 2 : 0); }); return t; }
  if(typeof v === 'object'){ var t2 = 2, k = 0; Object.keys(v).forEach(function(key){ var l = pyJsonLen(v[key]); if(l < 0) return; t2 += pyJsonLen(key) + 2 + l + (k++ ? 2 : 0); }); return t2; }
  return 4;
}
var SYNC_MAX = 19000;
function syncCopy(session){
  var s = JSON.parse(JSON.stringify(session));
  var tiers = [
    function(x){ x.turns.forEach(function(t){ t.a = String(t.a || '').slice(0, 900); }); },
    function(x){ x.turns.forEach(function(t){ if(t.judge){ t.judge.evidence = (t.judge.evidence || []).slice(0, 1); t.judge.missing = []; t.judge.better = ''; } }); },
    function(x){ x.turns.forEach(function(t){ t.a = String(t.a || '').slice(0, 400); if(t.m) delete t.m.fillerTop; if(t.judge) t.judge.evidence = []; }); },
    function(x){ x.turns.forEach(function(t){ t.a = String(t.a || '').slice(0, 150); if(t.judge) t.judge.headline = String(t.judge.headline || '').slice(0, 120); }); x.verdict.bar_raiser = []; x.verdict.strengths = []; x.verdict.competencies = []; },
    function(x){ x.turns.forEach(function(t){ t.a = ''; t.q = String(t.q || '').slice(0, 160); }); x.verdict.per_question.forEach(function(p){ p.note = ''; p.fix = ''; }); x.verdict.reasons = (x.verdict.reasons || []).slice(0, 2); }
  ];
  var long = s.turns.some(function(t){ return String(t.a || '').length > 900; });   // tier 0 itself shortens those
  for(var i = 0; i < tiers.length; i++){ tiers[i](s); if(pyJsonLen(s) <= SYNC_MAX) return { data: s, trimmed: i > 0 || long }; }
  return null;
}
function setSyncNote(id, text){
  var all = readArr(K.SESS); all.forEach(function(x){ if(x.id === id) x.syncNote = text; }); lsSet(K.SESS, all);
  if(S.hot && S.hot.session && S.hot.session.id === id){ S.hot.session.syncNote = text; var el = $('hotSyncNote'); if(el){ el.textContent = text; el.classList.remove('hidden'); } }
}
function syncSession(session){
  var u = userId(); if(!u || typeof root.apiCreateWorkshopItem !== 'function') return;
  var sc = syncCopy(session);
  if(!sc){ setSyncNote(session.id, 'Saved on this device only - this session is too large to sync to your account.'); return; }
  var p; try{ p = root.apiCreateWorkshopItem(u, 'interview_session', session.id, sc.data); }catch(e){ p = null; }
  Promise.resolve(p).then(function(r){
    if(r && r.ok === false) setSyncNote(session.id, 'Saved on this device only - it couldn\'t be synced to your account (' + (r.status === 0 ? 'no connection' : 'the server said no') + ').');
    else if(sc.trimmed) setSyncNote(session.id, 'Synced to your account with long answers shortened; the full transcript is on this device.');
  }, function(){ setSyncNote(session.id, 'Saved on this device only - it couldn\'t be synced to your account.'); });
}
function renderHotResults(session, live, overlay){
  var sec = $('mockSection'); session = sanitizeSession(session); if(!sec || !session) return;
  var v = session.verdict, d = session.delivery, dims = session.dims || {}, P = E.PERSONAS[session.persona] || E.PERSONAS.hiring_manager;
  var turns = session.turns || [], mine = answersCorpus(turns);
  var perQ = {}; (v.per_question || []).forEach(function(p){ perQ[p.i] = p; });
  // A line the committee hands you to say may not carry a figure you never gave. The flags were worked
  // out against your full answers when the interview ended; an older session works them out again here.
  var F = session.flags || verdictFlags(v, turns), shown = Object.create(null), fl = function(x){ return arr(x); };
  var headW = lineWarn(fl(F.headline), shown, 'your answers');
  var reasonW = (v.reasons || []).map(function(r, k){ return lineWarn(fl(F.reasons[k]), shown, 'your answers'); });
  var barW = (v.bar_raiser || []).map(function(r, k){ return lineWarn(fl(F.bar[k]), shown, 'your answers'); });
  var asked = v.asked != null ? v.asked : turns.length, answered = v.answered != null ? v.answered : turns.filter(function(t){ return !t.skipped; }).length;
  var html = head('The verdict', esc(P.label) + ' · ' + esc((E.DIFFS[session.difficulty] || {}).label || '') + ' · ' + esc(session.role || '') + (session.company ? ' at ' + esc(session.company) : '') + ' · ' + esc(String(session.at || '').slice(0, 10))) +
    '<div class="hs-verdict ' + decisionClass(v.decision) + '" id="hotVerdict" role="status" tabindex="-1"><div class="hv-k">' + (session.source === 'ai' ? 'Hiring committee (AI)' : 'Built-in judge') + '</div><div class="hv-dec">' + esc(E.DECISION_LABEL[v.decision] || '-') + '</div><div class="hv-score">' + esc(num(v.overall, 0, 100)) + '<span>/100</span></div>' +
    (v.headline ? '<div class="hv-head">' + esc(v.headline) + '</div>' + headW : '') +
    (asked ? '<div class="hv-k" id="hotAnswered">' + esc(answered) + ' of ' + esc(asked) + ' question' + (asked === 1 ? '' : 's') + ' answered</div>' : '') + '</div>' +
    (session.note ? note('', esc(session.note)) : '') +
    '<div class="is-note' + (session.syncNote ? '' : ' hidden') + '" id="hotSyncNote">' + esc(session.syncNote || '') + '</div>' +
    '<div class="hs-grid"><div class="tool-card"><h3>Why</h3><ul class="fb-list">' + (v.reasons || []).map(function(r, k){ return '<li>' + esc(r) + reasonW[k] + '</li>'; }).join('') + '</ul>' +
    ((v.bar_raiser || []).length ? '<h3 class="mt">Hard truths</h3><ul class="fb-list fb-improve">' + v.bar_raiser.map(function(r, k){ return '<li>' + esc(r) + barW[k] + '</li>'; }).join('') + '</ul>' : '') +
    ((v.strengths || []).length ? '<h3 class="mt">What worked</h3><ul class="fb-list fb-good">' + v.strengths.map(function(r){ return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' : '') +
    (v.unverified_quotes ? '<div class="fb-fine">' + esc(v.unverified_quotes) + ' AI line' + (v.unverified_quotes === 1 ? '' : 's') + ' that credited you with words or figures you never gave ' + (v.unverified_quotes === 1 ? 'was' : 'were') + ' removed.</div>' : '') +
    ((v.rules || []).length && session.source !== 'ai' ? '<div class="fb-fine">Built-in rules applied: ' + esc(v.rules.join('; ')) + '</div>' : '') + '</div>' +
    '<div class="tool-card"><h3>Scorecard</h3>' + Object.keys(E.DIM_LABEL).filter(function(k){ return typeof dims[k] === 'number'; }).map(function(k){ return '<div class="sc-row"><span>' + esc(E.DIM_LABEL[k]) + '</span><span class="cat-cover-bar"><i style="width:' + Math.round(dims[k] / 5 * 100) + '%;background:' + scoreColor(dims[k] * 2) + ';"></i></span><b>' + esc(dims[k]) + '</b></div>'; }).join('') +
    ((v.competencies || []).length ? '<h3 class="mt">Competencies</h3>' + v.competencies.map(function(cp){ return '<div class="sc-row"><span>' + esc(cp.name) + '</span>' + dots(cp.rating, cp.name) + '<i class="sc-ev">' + esc(cp.evidence || '') + '</i></div>'; }).join('') : '') + '</div></div>';
  var unmeasured = !d && turns.some(function(t){ return t.m && t.m.mode === 'voice'; });
  if(unmeasured) html += note('', 'Delivery numbers are left out: the timing of your spoken answers couldn\'t be measured reliably this time (for example, the mic opened late), and an estimate is never shown as a measurement.');
  if(d){
    html += '<div class="tool-card"><h3>Delivery - measured from your mic</h3>' + (d.spoken > d.answers ? '<p class="is-fine" id="hotDelCount">Based on ' + esc(d.answers) + ' of ' + esc(d.spoken) + ' spoken answers - the others\' timing couldn\'t be measured, so they\'re left out.</p>' : '') + '<div class="dl-grid">' + [
      ['Pace', d.wpm ? Math.round(d.wpm) + ' wpm' : '-', d.wpm ? (d.wpm < 105 ? 'Slow - pick it up a little' : d.wpm > 175 ? 'Rushing - slow down' : 'Good conversational pace') : ''],
      ['Fillers', d.fillersPerMin + '/min', d.topFillers.length ? 'Most: ' + d.topFillers.map(function(p){ return '"' + p[0] + '" x' + p[1]; }).join(', ') : 'None caught'],
      ['Longest pause', d.longestPause ? d.longestPause + 's' : '-', d.longestPause >= 3.5 ? 'Long silences read as lost' : 'Fine'],
      ['Time to start', d.latency != null ? d.latency + 's' : '-', d.latency >= 4 ? 'Slow to start - begin with one framing sentence' : 'Good'],
      ['Over time', d.overTime + ' of ' + d.answers, d.overTime ? 'Answers ran long or were cut off' : 'All within time'],
      (function(){ var iS = d.iSubj != null ? d.iSubj : d.iCount, wS = d.weSubj != null ? d.weSubj : d.weCount; return ['I vs we', iS + ' : ' + wS, wS > iS ? 'More "we" than "I"' : 'Owned']; })(),
      ['Pitch variation', d.pitchVar != null ? d.pitchVar + ' st' : '-', d.pitchVar != null ? (d.pitchVar < 2 ? 'Flat - vary your tone (approximate)' : 'Lively (approximate)') : 'Not enough voiced audio']
    ].map(function(x){ return '<div class="dl"><div class="dl-k">' + esc(x[0]) + '</div><div class="dl-v">' + esc(x[1]) + '</div><div class="dl-s">' + esc(x[2]) + '</div></div>'; }).join('') + '</div><p class="is-fine">Browser speech recognition often drops "um" and "uh", so the real filler count is likely higher than shown. Pitch is estimated from your mic and is approximate.</p></div>';
  }
  html += '<div class="tool-card"><h3>Answer by answer</h3>' + turns.map(function(t, i){
    var j = t.judge || {}, pq = perQ[i], audio = S.audio[session.id + ':' + i];
    if(t.skipped && t.not_reached) return '<details class="qa"' + (i === 0 ? ' open' : '') + '><summary><span class="qa-n">Q</span><span class="qa-q">' + esc(t.q) + '</span><span class="qa-s" style="color:var(--danger);">Not reached</span></summary><div class="qa-body"><p class="qa-note"><b>Not reached.</b> The interview was ended before this question - it counts as unanswered and scores zero.</p><p class="qa-fix"><b>Fix:</b> ' + esc(pq && pq.fix || 'Finish the interview - a question you never reach counts as unanswered.') + '</p></div></details>';
    if(t.skipped) return '<details class="qa"' + (i === 0 ? ' open' : '') + '><summary><span class="qa-n">' + (t.follow ? '&#8627;' : 'Q') + '</span><span class="qa-q">' + esc(t.q) + '</span><span class="qa-s" style="color:var(--danger);">Skipped</span></summary><div class="qa-body"><p class="qa-note"><b>No answer given.</b> In a real interview this scores zero.</p><p class="qa-fix"><b>Fix:</b> ' + esc(E.FIX_FOR && pq && pq.fix || 'Answer every question - even a short, honest answer beats silence.') + '</p></div></details>';
    var sc = pq && pq.score != null ? pq.score : j.overall, fix = (pq && pq.fix) || (j.missing || [])[0] || '';
    var qF = fl(F.q)[i] || {}, qShown = Object.create(null);   // each answer warns each figure once, under its own line
    var noteW = lineWarn(fl(qF.note), qShown, 'your answers'), liveW = lineWarn(fl(qF.live), qShown, 'your answers'), fixW = lineWarn(fl(qF.fix), qShown, 'your answers');
    return '<details class="qa"' + (i === 0 ? ' open' : '') + '><summary><span class="qa-n">' + (t.follow ? '&#8627;' : 'Q') + '</span><span class="qa-q">' + esc(t.q) + '</span><span class="qa-s" style="color:' + scoreColor(sc) + ';">' + (sc != null ? esc(sc) + '/10' : '-') + '</span></summary>' +
      '<div class="qa-body"><div class="qa-a">' + esc(t.a) + '</div>' + (audio ? '<audio controls preload="none" src="' + esc(audio) + '"></audio>' : '') +
      (pq && pq.note ? '<p class="qa-note"><b>Committee:</b> ' + esc(pq.note) + noteW + '</p>' : '') + (j.headline ? '<p class="qa-note"><b>Live read:</b> ' + esc(j.headline) + liveW + '</p>' : '') +
      ((j.evidence || []).length ? '<ul class="fb-list fb-ev">' + j.evidence.map(function(e){ return '<li><q>' + esc(e.quote) + '</q> ' + esc(e.issue) + '</li>'; }).join('') + '</ul>' : '') +
      (fix ? '<p class="qa-fix"><b>Fix:</b> ' + esc(fix) + fixW + '</p>' : '') +
      '<div class="is-actions"><button class="btn ghost is-xs" data-act="to-xray" data-i="' + i + '">X-Ray this answer</button><button class="btn ghost is-xs" data-act="to-gauntlet" data-i="' + i + '">Gauntlet this story</button></div></div></details>';
  }).join('') + '</div>';
  html += '<div class="tool-card"><h3>Your practice plan</h3>' + (v.top_fixes || []).map(function(f, k){ var tk = DRILL_TOOL[f.drill] || 'hot'; return '<div class="fix-row"><span>' + esc(f.fix) + figWarn(fl(F.fixes[k]), 'your answers') + '</span><button class="btn ghost is-xs" data-go="' + tk + '">' + esc(TOOL_NAME[tk]) + ' &rarr;</button></div>'; }).join('') + '</div>';
  if(overlay){
    // Looking back at a past session while an interview is in progress: that interview waits, untouched.
    html = inProgressNote() + html + '<div class="is-actions"><button class="btn" data-act="hot-back">Back to my interview in progress</button><button class="btn ghost" data-go="progress">See my progress</button></div>';
    sec.innerHTML = html;
    return;
  }
  html += '<div class="is-actions"><button class="btn" data-act="hot-again" id="hotAgainBtn">Run it again</button><button class="btn ghost" data-act="hot-new" id="hotNewBtn">New setup</button><button class="btn ghost" data-go="progress">See my progress</button></div>';
  sec.innerHTML = html;
  S.hot.viewing = session;
  try{ if(live){ sec.scrollIntoView({ block: 'start', behavior: 'smooth' }); var hv = $('hotVerdict'); if(hv) hv.focus({ preventScroll: true }); } }catch(e){}
}

/* ============================================================ RAPID DRILL */
function renderDrill(){
  var sec = $('drillSection'); if(!sec) return;
  if(!S.drill) S.drill = { cat: 'behavioral', pool: [], idx: 0, secsLeft: 0, h: null };
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    sec.innerHTML = head('Rapid drill', 'One question at a time, on a timer, like the real thing. No AI, no waiting - answer out loud before the clock runs out. Turn on listening to get a quick read on each answer.') +
      '<div class="tool-card"><div class="pill-row" id="drillCatRow"></div>' +
      '<div class="ip-row" style="align-items:flex-end;"><div style="flex:0 0 auto;"><span class="ip-label">Seconds per question</span><select class="ip-field" id="drillSecs" style="width:130px;"><option value="60">60</option><option value="90" selected>90</option><option value="120">120</option><option value="0">No timer</option></select></div>' +
      '<div style="flex:0 0 auto;"><label class="is-tog"><input type="checkbox" id="drillSpeak"> Read questions aloud</label>' + (V.support().stt ? '<label class="is-tog"><input type="checkbox" id="drillListen"> Listen &amp; score my delivery</label>' : '') + '</div>' +
      '<div style="flex:0 0 auto;"><button class="btn" data-act="drill-start" id="drillStartBtn">Start drill</button></div><div style="flex:1; text-align:right;"><span class="timer-big hidden" id="drillTimer">1:30</span></div></div>' +
      '<div id="drillArea" class="hidden" style="margin-top:16px;"><div class="bubble interviewer" id="drillQ" style="max-width:100%;"></div><div class="hs-cap hidden" id="drillCap"></div><div class="drill-read" id="drillRead"></div>' +
      '<div class="is-actions"><button class="btn" data-act="drill-next" id="drillNextBtn">Next question &rarr;</button><button class="btn ghost" data-act="drill-stop" id="drillStopBtn">Stop</button><span class="is-count" id="drillCount"></span></div></div></div>';
  }
  var row = $('drillCatRow');
  row.innerHTML = '<button class="chip' + (S.drill.cat === 'all' ? ' active' : '') + '" aria-pressed="' + (S.drill.cat === 'all') + '" data-act="drill-cat" data-v="all">All</button>' + E.CATS.map(function(c){ return '<button class="chip' + (c.key === S.drill.cat ? ' active' : '') + '" aria-pressed="' + (c.key === S.drill.cat) + '" data-act="drill-cat" data-v="' + c.key + '">' + esc(c.label) + '</button>'; }).join('');
}
function drillStopTimer(){ if(S.drill && S.drill.h){ clearInterval(S.drill.h); S.drill.h = null; } }
function drillListenStop(){
  var dr = S.drill; if(!dr || !dr.stt) return Promise.resolve(null);
  var stt = dr.stt, started = dr.listenAt, q = dr.curQ; dr.stt = null;
  return stt.stop().then(function(res){
    var txt = clean(res && res.text); if(!txt) return null;
    var a = E.analyzeAnswer(txt, { question: q && q.q, mode: 'voice', seconds: res.firstAt && res.lastAt ? Math.max(1, (res.lastAt - res.firstAt) / 1000 + 0.8) : (now() - started) / 1000 });
    var rd = $('drillRead'); if(rd) rd.innerHTML = '<b>Last answer:</b> ' + a.words + ' words · ' + (a.wpm ? a.wpm + ' wpm · ' : '') + (E.notEnglish(a.text) ? esc(E.ISSUE_TEXT.english) : a.fillers.count + ' fillers · structure ' + a.scores.structure + '/5 · ' + (a.star.r ? 'landed a result' : 'no clear result') + (a.weSubj > a.iSubj ? ' · more "we" than "I"' : ''));
    return a;
  });
}
function drillAbort(){ var dr = S.drill; if(!dr) return; dr.tok = (dr.tok || 0) + 1; if(dr.stt){ try{ dr.stt.abort(); }catch(e){} dr.stt = null; } }
function drillShow(){
  var dr = S.drill; if(!dr.pool.length) return;
  // A new question: anything still pending for the last one (a read-aloud, a listener) can't start.
  if(dr.stt){ try{ dr.stt.abort(); }catch(e){} dr.stt = null; }
  var tok = dr.tok = (dr.tok || 0) + 1;
  var q = dr.pool[dr.idx % dr.pool.length]; dr.curQ = q;
  $('drillQ').innerHTML = '<div class="bubble-who">Interviewer</div>' + esc(q.q);
  $('drillCount').textContent = (dr.idx + 1) + ' of ' + dr.pool.length;
  drillStopTimer();
  var secs = parseInt($('drillSecs').value, 10) || 0, tEl = $('drillTimer');
  function startClock(){
    if(S.drill !== dr || dr.tok !== tok || S.tool !== 'drill') return;
    if(secs > 0 && tEl){ tEl.classList.remove('hidden'); dr.secsLeft = secs; tEl.textContent = fmtSecs(dr.secsLeft); tEl.style.color = '';
      dr.h = setInterval(function(){ dr.secsLeft--; if(dr.secsLeft <= 0){ tEl.textContent = 'Time'; tEl.style.color = 'var(--danger)'; drillStopTimer(); return; } tEl.textContent = fmtSecs(dr.secsLeft); if(dr.secsLeft <= 10) tEl.style.color = 'var(--gold)'; }, 1000);
    } else if(tEl) tEl.classList.add('hidden');
    if($('drillListen') && $('drillListen').checked){
      var cap = $('drillCap'); if(cap){ cap.classList.remove('hidden'); cap.textContent = 'Listening…'; }
      dr.listenAt = now();
      if(dr.stt){ try{ dr.stt.abort(); }catch(e){} }
      dr.stt = V.listen({ onUpdate: function(t){ if(dr.tok === tok && cap) cap.textContent = t.slice(-200); }, onError: function(er){ if(dr.tok === tok && cap) cap.textContent = sttErrorText(er); } });
    }
  }
  if($('drillSpeak') && $('drillSpeak').checked) V.speak(q.q).then(startClock); else startClock();
}

/* ============================================================ QUESTION BANK */
var bankCat = 'behavioral';
function answerFor(qid){ var a = readArr(K.ANS); for(var i = 0; i < a.length; i++) if(a[i].id === qid) return a[i]; return null; }
function renderBank(){
  var sec = $('bankSection'); if(!sec) return;
  if(!$('bankChips')){
    sec.innerHTML = head('Question bank', 'Draft an answer to each classic question and save it - your progress feeds your readiness. A quick check runs as you save; X-Ray any answer for a sentence-by-sentence teardown, or drill it in the Hot Seat.') +
      '<div class="pill-row" id="bankChips"></div><div id="bankList"></div>';
  }
  $('bankChips').innerHTML = E.CATS.map(function(c){ return '<button class="chip' + (c.key === bankCat ? ' active' : '') + '" aria-pressed="' + (c.key === bankCat) + '" data-act="bank-cat" data-v="' + c.key + '">' + esc(c.label) + '</button>'; }).join('');
  renderBankList();
}
function renderBankList(){
  var list = $('bankList'); if(!list) return;
  var st = stories(), qs = E.BANK.filter(function(q){ return q.cat === bankCat; });
  list.innerHTML = qs.map(function(q){
    var saved = answerFor(q.id), sc = (saved && saved.score) || {};
    var starOpts = q.cat === 'behavioral' ? '<div class="star-attach"><span class="ip-label">Story you\'d tell</span><br><select data-star-for="' + q.id + '"><option value="">' + (st.length ? '- pick one -' : 'No stories yet (build them in Story Forge)') + '</option>' + st.map(function(s){ return '<option value="' + esc(s.id) + '"' + ((saved && saved.star_id === s.id) ? ' selected' : '') + '>' + esc(s.title || 'Untitled story') + '</option>'; }).join('') + '</select></div>' : '';
    function rd(dim){ var v = sc[dim] || 0, out = ''; for(var i = 1; i <= 5; i++) out += '<span class="rubric-dot' + (i <= v ? ' on' : '') + '" data-act="bank-rub" data-rub="' + q.id + '|' + dim + '|' + i + '" role="button" tabindex="0" aria-pressed="' + (i <= v) + '" aria-label="Rate ' + dim + ' ' + i + ' of 5"></span>'; return out; }
    var quick = saved && saved.answer ? quickCheck(saved.answer, q.q) : '';
    return '<div class="q-card" data-qid="' + q.id + '"><p class="q-text">' + esc(q.q) + '</p><p class="q-tip">' + esc(q.tip) + ' <span class="q-comp">' + q.comp.map(E.compLabel).map(esc).join(' · ') + '</span></p>' +
      '<textarea class="ip-field body" data-ans="' + q.id + '" maxlength="6000" placeholder="Draft your answer...">' + esc(saved ? saved.answer : '') + '</textarea>' + starOpts +
      '<div class="rubric"><span class="rubric-dim">Structure<span class="rubric-dots">' + rd('structure') + '</span></span><span class="rubric-dim">Specificity<span class="rubric-dots">' + rd('specificity') + '</span></span><span class="rubric-dim">Clarity<span class="rubric-dots">' + rd('clarity') + '</span></span></div>' +
      '<div class="is-actions"><button class="btn" data-act="bank-save" data-save-ans="' + q.id + '">Save answer</button><button class="ai-btn" data-act="bank-xray" data-ai-fb="' + q.id + '">X-Ray it</button><button class="btn ghost is-xs" data-act="bank-hot" data-v="' + q.id + '">Drill it in the Hot Seat</button>' + (saved ? '<span class="q-saved-badge">&#10003; Saved</span>' : '') + '</div>' +
      '<div class="ai-inline-box" id="qai-' + q.id + '">' + quick + '</div></div>';
  }).join('');
}
function quickCheck(text, q){
  var a = E.analyzeAnswer(text, { question: q }), issues = E.localIssues(a).slice(0, 2);
  return '<div class="qc"><span class="qc-k">Quick check</span><span>' + a.words + ' words (~' + fmtSecs(a.seconds) + ' spoken)</span><span>' + (a.star.s ? '&#10003;' : '&#10007;') + ' situation</span><span>' + (a.star.a ? '&#10003;' : '&#10007;') + ' your actions</span><span>' + (a.star.r ? '&#10003;' : '&#10007;') + ' result</span>' + issues.map(function(i){ return '<span class="w">' + esc(E.issueText(i.key, a)) + '</span>'; }).join('') + '</div>';
}

/* ======================================================= QUESTION PREDICTOR */
function renderPredict(){
  var sec = $('predictSection'); if(!sec) return;
  var t = target();
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    sec.innerHTML = head('Question Predictor', 'Paste the job description and see the questions this specific job will most likely ask - each one tied to the exact JD words that make it likely, mapped to the stories you already have, with the gaps you still need to fill.') +
      '<div class="tool-card"><div class="ip-row"><div><span class="ip-label">Role</span><input class="ip-field" id="predRole" maxlength="200" placeholder="e.g. Data Analyst"></div><div><span class="ip-label">Company</span><input class="ip-field" id="predCompany" maxlength="200" placeholder="optional"></div></div>' +
      '<span class="ip-label">Job description</span><textarea class="ip-field body" id="predJD" maxlength="8000" placeholder="Paste the full posting - responsibilities and requirements are what matter."></textarea>' +
      '<label class="is-tog"><input type="checkbox" id="predSave" checked> Save as my target interview</label>' +
      '<div class="is-actions"><button class="ai-btn" data-act="pred-run" id="predBtn">Predict my questions</button></div></div><div id="predLocal"></div><div id="predResult"></div>';
    $('predRole').value = t.role; $('predCompany').value = t.company; $('predJD').value = t.jd;
  }
  predLocal();
  var last = readObj(K.PREDICT); if(last && last.result && !$('predResult').innerHTML && last.jdSig === sig(($('predJD') || {}).value)) renderPredictResult(last.result, 'ai');
}
function sig(s){ s = String(s || ''); var h = 0; for(var i = 0; i < s.length; i++){ h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return String(h); }
function predLocal(){
  var box = $('predLocal'); if(!box) return;
  var jdText = ($('predJD') || {}).value || '';
  if(clean(jdText).length < 40){ box.innerHTML = note('', 'Paste the job description above - the analysis below fills in instantly, no AI needed.'); return; }
  var jd = E.parseJD(jdText), cov = E.jdCoverage(jd, stories()), st = stories();
  var byId = {}; st.forEach(function(s){ byId[s.id] = s; });
  box.innerHTML = '<div class="tool-card"><h3>What this job is really about <span class="is-src local">Read from the JD</span></h3>' +
    (jd.competencies.length ? '<div class="jd-themes">' + jd.competencies.slice(0, 6).map(function(c){ return '<div class="jd-theme"><b>' + esc(c.label) + '</b><span class="jd-w">weight ' + c.count + '</span><q>' + esc(c.quotes[0]) + '</q></div>'; }).join('') + '</div>' : note('', 'No clear competencies found - is this the full posting?')) +
    '<div class="jd-facts">' + (jd.skills.length ? '<span>Skills: ' + jd.skills.map(esc).join(', ') + '</span>' : '') + (jd.years ? '<span>' + jd.years + '+ years asked</span>' : '') + (jd.seniority ? '<span>Level: ' + esc(jd.seniority) + '</span>' : '') + '<span>' + jd.must.length + ' must-haves · ' + jd.nice.length + ' nice-to-haves</span></div>' +
    '<h3 class="mt">Your stories vs. this job</h3>' + (cov.rows.length ? cov.rows.map(function(r){
      return '<div class="cov-row ' + (r.stories.length ? '' : 'gap') + '"><span class="cov-k">' + esc(r.label) + '</span><span class="cov-v">' + (r.stories.length ? r.stories.map(function(id){ return '<span class="cov-chip">' + esc((byId[id] || {}).title || 'Story') + '</span>'; }).join('') : '<span class="cov-none">No story yet</span><button class="btn ghost is-xs" data-act="forge-for" data-v="' + esc(r.key) + '">Forge one</button>') + '</span></div>'; }).join('') : '') + '</div>';
}
function predictRun(){
  var role = clean($('predRole').value), company = clean($('predCompany').value), jd = ($('predJD').value || '').trim();
  if(jd.length < 40){ $('predJD').focus(); toast('Paste the job description first.'); return; }
  if($('predSave') && $('predSave').checked){ var t = readObj(K.TARGET); if(role) t.role = role; t.company = company; t.jd = jd.slice(0, 8000); lsSet(K.TARGET, t); renderTargetBar(); }
  var btn = $('predBtn'), box = $('predResult'); busy(btn, true, 'Reading the JD…');
  var st = stories().slice(0, 25).map(function(s){ return { id: s.id, title: s.title || storyLine(s).slice(0, 80) }; });
  aiTool('predict', { role: role, company: company, jd: jd.slice(0, 7900), stories: st, count: 10 }).then(function(r){
    busy(btn, false);
    if(r.ok){ lsSet(K.PREDICT, { at: new Date().toISOString(), jdSig: sig(jd), result: r.data }); renderPredictResult(r.data, 'ai'); return; }
    var plan = E.planLocal({ role: role || 'this role', company: company, jd: jd, focus: 'role', count: 8, seed: 11, closing: false }).concat(E.planLocal({ role: role || 'this role', company: company, jd: jd, focus: 'behavioral', count: 6, seed: 12, skipOpener: true, closing: false }));
    var KIND = nmap({ technical: 'technical', situational: 'situational', role: 'role', motivation: 'motivation', explain: 'communication' });
    var seen = {}, qs = plan.filter(function(p){ if(seen[p.q]) return false; seen[p.q] = 1; return p.source !== 'opener' && p.qtype !== 'closing'; }).slice(0, 10).map(function(p){ return { q: p.q, competency: p.comp, jd_quote: p.evidence || '', why: p.why, signal: '', story_id: '', kind: KIND[p.qtype] || 'behavioral' }; });
    box.innerHTML = note('warn', esc(aiMsg(r, 'predictor')) + ' Below is the built-in prediction: rule-based picks matched to the JD\'s themes.');
    renderPredictResult({ themes: E.parseJD(jd).themes, questions: qs, gaps: [] }, 'local', true);
  });
}
function renderPredictResult(res, src, append){
  var box = $('predResult'); if(!box || !res) return;
  var byId = {}; stories().forEach(function(s){ byId[s.id] = s; });
  var jd = ($('predJD') || {}).value || '';
  S.predicted = res.questions || [];
  var psrc = stories().map(storyLine).join(' ' + E.SEP + ' ');   // your own stories - the JD's figures are its requirements, not yours
  var html = '<div class="tool-card"><h3>Your most likely questions ' + aiBadge(src) + '</h3>' + (src === 'ai' ? dropNote(res) : '') + ((res.themes || []).length ? '<p class="tc-sub">This JD is about: ' + res.themes.map(esc).join(' · ') + '</p>' : '') +
    (res.questions || []).map(function(q, i){
      var verified = q.jd_quote && E.verifyQuote(q.jd_quote, jd);
      return '<div class="pq"><div class="pq-top"><span class="pq-n">' + (i + 1) + '</span><span class="pq-q">' + esc(q.q) + '</span><span class="pq-kind">' + esc(q.kind || '') + '</span></div>' +
        (verified ? '<div class="pq-why"><span class="pq-jd">From the JD</span> <q>' + esc(q.jd_quote) + '</q></div>' : '') +
        ((q.why || q.signal) ? '<div class="pq-sub">' + (q.why ? '<b>Testing:</b> ' + esc(q.why) + ' ' : '') + (q.signal ? '<b>Strong answer:</b> ' + esc(q.signal) : '') + figWarn(sayFlags(psrc, [q.signal]), 'your stories', jd) + '</div>' : '') +
        '<div class="pq-foot">' + (q.story_id && byId[q.story_id] ? '<span class="cov-chip">Use: ' + esc(byId[q.story_id].title || 'your story') + '</span>' : '<span class="cov-none">No story mapped</span>') +
        '<button class="btn ghost is-xs" data-act="pq-xray" data-i="' + i + '">X-Ray my answer</button><button class="btn ghost is-xs" data-act="pq-hot" data-i="' + i + '">Practice it</button></div></div>';
    }).join('') +
    ((res.questions || []).length ? '<div class="is-actions"><button class="btn" data-act="pq-hot-all">Practice all of these in the Hot Seat</button></div>' : '') + '</div>' +
    ((res.gaps || []).length ? '<div class="tool-card"><h3>Gaps to prepare for</h3>' + res.gaps.map(function(g){ return '<div class="cov-row gap"><span class="cov-k">' + esc(E.compLabel(g.competency)) + '</span><span class="cov-v">' + (g.jd_quote && E.verifyQuote(g.jd_quote, jd) ? '<q>' + esc(g.jd_quote) + '</q> ' : '') + esc(g.advice || '') + figWarn(sayFlags(psrc, [g.advice]), 'your stories', jd) + ' <button class="btn ghost is-xs" data-act="forge-for" data-v="' + esc(g.competency) + '">Forge a story</button></span></div>'; }).join('') + '</div>' : '');
  if(append) box.innerHTML += html; else box.innerHTML = html;
}

/* ================================================================= STORY FORGE */
function renderForge(){
  var sec = $('forgeSection'); if(!sec) return;
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    var R = resumeModel(), lines = [];
    if(R) R.entries.forEach(function(e){ (e.bullets || []).forEach(function(b){ lines.push({ t: b, w: (e.title || '') + (e.org ? ' · ' + e.org : '') }); }); });
    sec.innerHTML = head('Story Forge', 'Interviews are won with five or six true stories you can bend to any question. Dump the rough version of what happened - the AI shapes it into a tight STAR story using only your facts, flags anything you never said, and maps it to what interviewers test.') +
      '<div class="tool-card"><h3>Your coverage</h3><p class="tc-sub" id="forgeCovSub"></p><div id="forgeMatrix"></div></div>' +
      '<div class="tool-card" id="forgeForm"><h3>Forge a new story</h3>' +
      '<span class="ip-label">What happened? (rough is fine - your words)</span><textarea class="ip-field body" id="forgeNotes" maxlength="4000" placeholder="e.g. our cafe kept running out of oat milk on weekends, I started tracking it in a sheet, figured out the pattern, changed the order day, stockouts went from about 6 a month to 1"></textarea>' +
      '<div class="ip-row" style="margin-top:10px;"><div><span class="ip-label">Aim it at a question (optional)</span><input class="ip-field" id="forgeQ" maxlength="300" placeholder="e.g. Tell me about a time you used data"></div>' +
      (lines.length ? '<div><span class="ip-label">Start from a resume line (optional)</span><select class="ip-field" id="forgeLine"><option value="">-</option>' + lines.slice(0, 60).map(function(l, i){ return '<option value="' + i + '">' + esc(l.t.slice(0, 90)) + '</option>'; }).join('') + '</select></div>' : '') + '</div>' +
      '<div class="is-actions"><button class="ai-btn" data-act="forge-run" id="forgeBtn">Forge it with AI</button><button class="btn ghost" data-act="forge-manual">Write it myself (STAR form)</button></div></div>' +
      '<div id="forgeResult"></div><div class="tool-card"><h3>Your story bank <span class="is-count" id="forgeBankN"></span></h3><p class="tc-sub">Shared with the Workshop\'s STAR bank.</p><div id="forgeList"></div></div>';
    S.forgeLines = lines;
  }
  renderForgeMatrix(); renderForgeList();
}
function renderForgeMatrix(){
  var t = target(), jd = t.jd ? E.parseJD(t.jd) : null, st = stories(), byId = {}; st.forEach(function(s){ byId[s.id] = s; });
  var cov = jd && jd.competencies.length ? E.jdCoverage(jd, st) : E.coverage(st);
  var sub = $('forgeCovSub'); if(sub) sub.textContent = (jd && jd.competencies.length ? 'What your target job description asks for' : 'The eight things nearly every interviewer probes') + ' - ' + cov.covered + ' of ' + cov.total + ' covered.' + (cov.overloaded.length ? ' One story is carrying three or more areas alone - forge a backup.' : '');
  var m = $('forgeMatrix'); if(!m) return;
  m.innerHTML = cov.rows.map(function(r){ return '<div class="cov-row ' + (r.stories.length ? '' : 'gap') + '"><span class="cov-k">' + esc(r.label) + '</span><span class="cov-v">' + (r.stories.length ? r.stories.map(function(id){ return '<span class="cov-chip">' + esc((byId[id] || {}).title || 'Story') + '</span>'; }).join('') : '<span class="cov-none">No story</span><button class="btn ghost is-xs" data-act="forge-for" data-v="' + esc(r.key) + '">Forge one</button>') + '</span></div>'; }).join('');
}
function renderForgeList(){
  var list = $('forgeList'), st = stories(); if(!list) return;
  var n = $('forgeBankN'); if(n) n.textContent = st.length ? '(' + st.length + ')' : '';
  if(!st.length){ list.innerHTML = '<div class="empty-state"><div class="glyph">&#9998;</div>No stories yet.<div class="sub">Forge your first one above - aim for five that cover different areas.</div></div>'; return; }
  list.innerHTML = st.map(function(s){
    var comps = E.storyComps(s);
    return '<div class="crud-item" data-id="' + esc(s.id) + '"><p class="crud-item-title">' + esc(s.title || 'Untitled story') + '</p>' + (comps.length ? '<div class="cov-v">' + comps.slice(0, 5).map(function(k){ return '<span class="cov-chip">' + esc(E.compLabel(k)) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="star-lines">' + [['S', s.s], ['T', s.t], ['A', s.a], ['R', s.r]].filter(function(p){ return p[1]; }).map(function(p){ return '<div><b>' + p[0] + '</b> ' + esc(p[1]) + '</div>'; }).join('') + '</div>' +
      '<div class="crud-actions"><button class="btn ghost" data-act="story-gauntlet" data-id="' + esc(s.id) + '">Gauntlet it</button><button class="btn ghost" data-act="story-copy" data-id="' + esc(s.id) + '">Copy</button><button class="btn ghost" data-act="story-del" data-id="' + esc(s.id) + '">Delete</button></div></div>';
  }).join('');
}
function forgeRun(manual){
  var notes = ($('forgeNotes').value || '').trim(), q = clean($('forgeQ').value), li = $('forgeLine') ? $('forgeLine').value : '', line = li !== '' && S.forgeLines && S.forgeLines[+li] ? S.forgeLines[+li].t : '';
  var box = $('forgeResult');
  if(manual){ renderForgeEditor({ title: '', situation: '', task: '', action: line || '', result: '', competencies: [], answers: [], missing: [], spoken: '' }, 'manual', notes + ' ' + line); return; }
  if(!notes && !line){ $('forgeNotes').focus(); toast('Jot down what happened first - a few rough lines is enough.'); return; }
  var btn = $('forgeBtn'); busy(btn, true, 'Forging…');
  aiTool('forge', { notes: (notes || line).slice(0, 4000), resume_line: line, question: q, role: target().role }).then(function(r){
    busy(btn, false);
    if(r.ok){ renderForgeEditor(r.data, 'ai', notes + ' ' + E.SEP + ' ' + line); return; }
    box.innerHTML = note('warn', esc(aiMsg(r, 'Story Forge')) + ' You can still build it yourself below - your notes are kept.');
    renderForgeEditor({ title: '', situation: '', task: '', action: '', result: '', competencies: [], answers: [], missing: [], spoken: '' }, 'manual', notes + ' ' + line, true);
  });
}
function renderForgeEditor(d, src, sourceText, append){
  var box = $('forgeResult'); if(!box) return;
  S.forgeSource = sourceText || '';
  var html = '<div class="tool-card" id="forgeEditor"><h3>' + (src === 'ai' ? 'Your forged story ' + aiBadge('ai') : 'Build your story') + '</h3>' + (src === 'ai' ? dropNote(d) : '') +
    '<span class="ip-label">Title</span><input class="ip-field" id="fgTitle" maxlength="120" value="' + esc(d.title) + '" placeholder="Short and memorable">' +
    [['fgS', 'Situation', d.situation], ['fgT', 'Task', d.task], ['fgA', 'Action - what YOU did', d.action], ['fgR', 'Result', d.result]].map(function(f){ return '<span class="ip-label" style="margin-top:10px;display:block;">' + f[1] + '</span><textarea class="ip-field" id="' + f[0] + '" maxlength="900" style="min-height:58px;">' + esc(f[2]) + '</textarea>'; }).join('') +
    ((d.competencies || []).length ? '<div class="cov-v" style="margin-top:10px;">' + d.competencies.map(function(k){ return '<span class="cov-chip">' + esc(E.compLabel(k)) + '</span>'; }).join('') + '</div>' : '') +
    ((d.answers || []).length ? '<div class="fb-sub">Answers these questions</div><ul class="fb-list">' + d.answers.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
    ((d.missing || []).length ? '<div class="fb-sub">Make it stronger - answer these (then edit above)</div><ul class="fb-list fb-improve">' + d.missing.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
    (d.spoken ? '<div class="fb-sub">Spoken version (60-90 seconds)</div><p class="fb-better" id="fgSpoken">' + esc(d.spoken) + '</p>' : '') +
    '<div id="fgHonesty"></div><label class="is-tog hidden" id="fgConfirmWrap"><input type="checkbox" id="fgConfirm"> These figures are true - add them to my own notes</label>' +
    '<div class="is-actions"><button class="btn" data-act="forge-save" id="forgeSaveBtn">Save to my story bank</button>' + (d.spoken ? '<button class="btn ghost" data-act="forge-copy-spoken">Copy spoken version</button>' : '') + '</div></div>';
  if(append) box.innerHTML += html; else box.innerHTML = html;
  S.forgeDraft = { competencies: d.competencies || [], spoken: d.spoken || '', src: src, serverFlags: d.unsupported_numbers || [] };
  forgeHonesty();
}
function forgeFields(){ return { title: clean(($('fgTitle') || {}).value), s: clean(($('fgS') || {}).value), t: clean(($('fgT') || {}).value), a: clean(($('fgA') || {}).value), r: clean(($('fgR') || {}).value) }; }
function forgeHonesty(){
  var f = forgeFields(), out = [f.title, f.s, f.t, f.a, f.r].join(' '), src = S.forgeSource || '';
  var hb = $('fgHonesty'); if(!hb) return { ok: true, flagged: [] };   // the editor is gone (saved / replaced)
  if(!S.forgeDraft || S.forgeDraft.src === 'manual'){ hb.innerHTML = ''; return { ok: true, flagged: [] }; }
  var h = E.honestyCheck(src, out + ' ' + (S.forgeDraft.spoken || ''));
  var flagged = uniq(h.flagged.concat((S.forgeDraft.serverFlags || []).filter(function(n){ return (out + ' ' + (S.forgeDraft.spoken || '')).indexOf(n) >= 0 && src.indexOf(n) < 0; })));
  var el = $('fgHonesty'); if(el) el.innerHTML = honestyBanner(flagged);
  var w = $('fgConfirmWrap'); if(w) w.classList.toggle('hidden', !flagged.length);
  return { ok: !flagged.length, flagged: flagged };
}
function forgeSave(){
  var f = forgeFields(); if(!f.title && !f.s && !f.a){ toast('Give the story at least a title and what you did.'); return; }
  var h = forgeHonesty();
  if(!h.ok){
    if(!($('fgConfirm') && $('fgConfirm').checked)){ toast('Some figures aren\'t in your own notes - remove them, or tick the box if they\'re true.'); return; }
    var notesEl = $('forgeNotes'); if(notesEl){ notesEl.value = (notesEl.value + '\n(Confirmed by me: ' + h.flagged.join(', ') + ')').trim(); }
  }
  var item = { id: E.uid('st'), title: f.title || f.a.slice(0, 60), s: f.s, t: f.t, a: f.a, r: f.r, competencies: (S.forgeDraft && S.forgeDraft.competencies) || [], created_at: new Date().toISOString(), source: 'interview-studio' };
  if(!syncPut('star_story', K.STAR, item)) return;
  $('forgeResult').innerHTML = note('ok', 'Saved "' + esc(item.title) + '" to your story bank.');
  renderForgeMatrix(); renderForgeList(); refreshCounts();
}

/* =============================================================== RESUME GRILL */
function renderGrill(){
  var sec = $('grillSection'); if(!sec) return;
  var R = resumeModel(), RS = root.RESUME_STUDIO_ENGINE, risks = [], defends = [];
  if(R && RS){ try{ risks = RS.redFlags(R, {}).filter(function(f){ return /^gap-|^hop$|^nodate-|^future-/.test(f.id) || f.kind === 'unverified' || f.kind === 'unverified-summary'; }); defends = RS.defendAll(R).filter(function(d){ return d.risk !== 'low'; }).slice(0, 6); }catch(e){} }
  S.grillRisks = risks;
  var classics = [
    ['What\'s your greatest weakness?', 'A real one, named plainly, plus what you\'re doing about it - with proof it\'s working.'],
    ['Why are you leaving (or why did you leave) your last role?', 'Forward-looking and never bitter: what you\'re moving toward, not away from.'],
    ['What are your salary expectations?', 'Give a researched range late in the process, or ask for their budgeted range first.'],
    ['Why should we hire you over other candidates?', 'Your specific combination for their specific need - one proof point for each.'],
    ['Tell me about something on your resume you\'re not proud of.', 'Own it, show the lesson, show the change.']
  ];
  sec.innerHTML = head('Resume Grill', 'The hardest questions your actual resume invites - gaps, short stints, big numbers, team credit - and how to answer each truthfully. The risks below are read straight from your resume; the AI grills you on top of them.') +
    (R ? '<div class="tool-card"><h3>What a skeptical interviewer will spot <span class="is-src local">From your resume</span></h3>' + (risks.length ? risks.map(function(f){ return '<div class="gr-risk ' + esc(f.severity || 'med') + '"><b>' + esc(f.title) + '</b><span>' + esc(f.detail) + '</span><i>' + esc(f.fix) + '</i></div>'; }).join('') : note('ok', 'No gaps, date problems or unverified numbers found on your resume.')) +
      (defends.length ? '<h3 class="mt">Lines they\'ll probe</h3>' + defends.map(function(d){ return '<div class="gr-line"><div class="gr-text">"' + esc(d.text) + '"</div><ul class="fb-list">' + d.questions.slice(0, 3).map(function(q){ return '<li>' + esc(q) + '</li>'; }).join('') + '</ul>' + (d.risks[0] ? '<div class="gr-warn">' + esc(d.risks[0]) + '</div>' : '') + '</div>'; }).join('') : '') + '</div>'
      : '<div class="tool-card">' + note('', 'No resume found yet. Build it in the <a href="workshop.html">Workshop</a> (Resume Studio) - or paste it here and the AI will grill you on it.') + '<textarea class="ip-field body" id="grillPaste" maxlength="6000" placeholder="Paste your resume text..."></textarea></div>') +
    '<div class="tool-card"><div class="is-actions" style="margin-top:0;"><button class="ai-btn" data-act="grill-run" id="grillBtn">Grill me</button><button class="btn ghost" data-act="grill-hot">Practice these out loud</button></div><div id="grillResult"></div></div>' +
    '<div class="tool-card"><h3>The classic tough ones</h3>' + classics.map(function(c){ return '<div class="neg-prompt"><p class="np-q">' + esc(c[0]) + '</p><p class="np-tip">' + esc(c[1]) + '</p></div>'; }).join('') + '</div>';
}
/* Where a Grill trigger really comes from (checked here, like the server does):
   your resume, the app's own risk check, or the job description. */
var GRILL_LABEL = nmap({ resume: 'From your resume', risk: 'Flagged by the resume check', jd: 'From the job description' });
function grillSource(tr, inp){
  tr = str(tr, 200); if(!tr) return '';
  var order = [['resume', inp.resume], ['risk', inp.risks], ['jd', inp.jd]];
  for(var i = 0; i < order.length; i++) if(E.verifyQuote(tr, String(order[i][1] || '').slice(0, 5000))) return order[i][0];
  return '';
}
function grillRun(){
  var R = resumeModel(), text = R ? resumeText(R) : clean(($('grillPaste') || {}).value || '');
  if(!text){ var gp = $('grillPaste'); if(gp) gp.focus(); toast('Add your resume first.'); return; }
  var risks = (S.grillRisks || []).map(function(f){ return f.title + ': ' + f.detail; }).join('\n').slice(0, 2000);
  var btn = $('grillBtn'), box = $('grillResult'); busy(btn, true, 'Reading your resume…');
  aiTool('grill', { role: target().role, company: target().company, resume: text.slice(0, 5000), risks: risks, jd: target().jd.slice(0, 3000) }).then(function(r){
    busy(btn, false);
    if(!r.ok){ box.innerHTML = note('warn', esc(aiMsg(r, 'Resume Grill')) + ' The risks and line-by-line questions above come straight from your resume and work without AI.'); return; }
    var gin = { resume: text.slice(0, 5000), risks: risks, jd: target().jd.slice(0, 3000) };
    var gsrc = [gin.resume, gin.risks].join(' ' + E.SEP + ' ');   // what an honest answer can draw on: yours, never the JD's figures
    S.grillQs = arr(r.data.questions).filter(isObj).map(function(q){ var src = grillSource(q.trigger, gin); return Object.assign({}, q, { trigger: src ? q.trigger : '', trigger_source: src }); });
    box.innerHTML = '<h3 class="mt">Your grilling ' + aiBadge('ai') + '</h3>' + dropNote(r.data) + S.grillQs.map(function(q, i){ return '<div class="gr-q ' + esc(q.risk) + '"><div class="pq-top"><span class="pq-kind">' + esc(q.risk) + ' risk · ' + esc(q.kind) + '</span><span class="pq-q">' + esc(q.q) + '</span></div>' + (q.trigger ? '<div class="pq-why"><span class="pq-jd">' + esc(GRILL_LABEL[q.trigger_source]) + '</span> <q>' + esc(q.trigger) + '</q></div>' : '') + '<div class="pq-sub"><b>Answer it truthfully:</b> ' + esc(q.strategy) + (q.avoid ? '<br><b>Don\'t:</b> ' + esc(q.avoid) : '') + figWarn(sayFlags(gsrc, [q.strategy]), 'your resume', gin.jd) + '</div><div class="pq-foot"><button class="btn ghost is-xs" data-act="grill-one" data-i="' + i + '">Practice this one</button></div></div>'; }).join('');
  });
}

/* ============================================================ COMPANY DOSSIER */
function renderDossier(){
  var sec = $('dossierSection'); if(!sec) return;
  var t = target();
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    sec.innerHTML = head('Company Dossier', 'Live research on the company with every source linked, turned into positioning you can use in the room: what they care about, how your real background connects, a "why us" answer built only on facts found - and the gaps the research couldn\'t fill.') +
      '<div class="tool-card"><div class="ip-row"><div><span class="ip-label">Company</span><input class="ip-field" id="dosCompany" maxlength="200" placeholder="e.g. Northwind"></div><div><span class="ip-label">Role</span><input class="ip-field" id="dosRole" maxlength="200" placeholder="e.g. Data Analyst"></div></div>' +
      '<div class="is-actions"><button class="ai-btn" data-act="dos-run" id="dosBtn">Research it</button></div></div><div id="dosResult"></div>' +
      '<div class="tool-card"><h3>Your own notes</h3><p class="tc-sub">What to look up yourself: their mission in their words, the last 3 months of news, the product you\'d touch, who you\'re meeting (and what they\'ve posted), and how they describe their interview process.</p><textarea class="ip-field body" id="dosNotes" maxlength="4000" placeholder="Your research notes (saved on this device)..."></textarea></div>';
    $('dosCompany').value = t.company; $('dosRole').value = t.role;
  }
  var d = dossierFor(($('dosCompany') || {}).value);
  if(d) renderDossierResult(d); else if($('dosResult')) $('dosResult').innerHTML = '';
  var notesEl = $('dosNotes'); if(notesEl && d && typeof d.notes === 'string' && !notesEl.value) notesEl.value = d.notes;
}
function saveDossier(company, patch){ var all = readObj(K.DOSSIER), k = clean(company).toLowerCase(); if(!k) return; var prev = own(all, k); putOwn(all, k, Object.assign({}, isObj(prev) ? prev : {}, patch, { company: clean(company) })); var keys = Object.keys(all); if(keys.length > 20){ keys.sort(function(a, b){ return String((isObj(all[a]) && all[a].at) || '').localeCompare(String((isObj(all[b]) && all[b].at) || '')); }).slice(0, keys.length - 20).forEach(function(x){ delete all[x]; }); } lsSet(K.DOSSIER, all); }
async function dossierRun(){
  var company = clean($('dosCompany').value), role = clean($('dosRole').value) || target().role || 'this role';
  if(!company){ $('dosCompany').focus(); toast('Name the company first.'); return; }
  var btn = $('dosBtn'), box = $('dosResult'); busy(btn, true, 'Searching the web…');
  if(!userId()){ busy(btn, false); box.innerHTML = note('warn', 'Sign in to run live research. Use the notes box below in the meantime.'); return; }
  var res = await aiCall('research', company, role);
  if(!res.ok || !res.data || !res.data.findings){ busy(btn, false); box.innerHTML = note('warn', esc(res.ok ? 'The research came back empty for this company - try the full company name.' : aiMsg(res, 'research')) + ' Use the notes box below in the meantime.'); return; }
  var dos = { at: new Date().toISOString(), findings: str(res.data.findings, 6000), sources: (res.data.sources || []).filter(function(s){ return s && /^https?:\/\//i.test(String(s.url || '')); }).slice(0, 12), role: role };
  saveDossier(company, dos); renderDossierResult(dossierFor(company));
  busy(btn, true, 'Building your positioning…');
  var pr = await aiTool('position', { company: company, role: role, findings: dos.findings, background: background(), jd: target().jd.slice(0, 3000) });
  busy(btn, false);
  if(pr.ok){ saveDossier(company, { position: pr.data }); renderDossierResult(dossierFor(company)); }
  else box.insertAdjacentHTML('beforeend', note('warn', esc(aiMsg(pr, 'positioning'))));
}
function renderDossierResult(d){
  var box = $('dosResult'); if(!box || !d) return;
  d = sanitizeDossier(d); if(!d) return;
  var p = d.position, src = d.sources, hsrc = [d.findings, background(), target().jd].join(' \n ');
  var why = p && p.why_us ? p.why_us : '', flagged = p ? E.honestyCheck(hsrc, why).flagged : [];   // the note's own figures, whole - never a substring match
  box.innerHTML = '<div class="tool-card"><h3>' + esc(d.company || '') + ' <span class="is-count">researched ' + esc(String(d.at || '').slice(0, 10)) + '</span></h3>' +
    (p ? (p.care_about.length ? '<div class="fb-sub">What they evidently care about</div>' + p.care_about.map(function(c){ return '<div class="ds-item"><b>' + esc(c.point) + '</b>' + (c.source_quote ? ' <q>' + esc(c.source_quote) + '</q>' : ' <span class="cov-none">(not quoted from the research)</span>') + '</div>'; }).join('') : '') +
      (p.connect.length ? '<div class="fb-sub">Where your background connects</div>' + p.connect.map(function(c){ var cf = E.honestyCheck(hsrc, c.how_to_say_it).flagged; return '<div class="ds-item"><b>' + esc(c.their_need) + '</b> &larr; <q>' + esc(c.your_evidence) + '</q><div class="ds-say">' + esc(c.how_to_say_it) + '</div>' + (cf.length ? '<div class="fb-fine">Not in your background: ' + cf.map(esc).join(', ') + ' - only say figures you really have.</div>' : '') + '</div>'; }).join('') : '') +
      (why ? '<div class="fb-sub">"Why us?" - built only on what was found</div><p class="fb-better">' + esc(why) + '</p>' + honestyBanner(flagged) + '<button class="btn ghost is-xs" data-act="dos-copy">Copy</button>' : '') +
      (p.smart_questions.length ? '<div class="fb-sub">Questions that prove you did the homework</div>' + p.smart_questions.map(function(q){ var qf = E.honestyCheck(hsrc, claimText(q)).flagged; return '<div class="ds-q"><span>' + esc(q) + (qf.length ? '<i class="ds-why ds-warn">Not in the research: ' + qf.map(esc).join(', ') + ' - check it before you ask.</i>' : '') + '</span><button class="btn ghost is-xs" data-act="ask-add-text" data-v="' + esc(q) + '">+ Save</button></div>'; }).join('') : '') +
      (p.watch_outs.length ? '<div class="fb-sub">Be ready for</div><ul class="fb-list fb-improve">' + p.watch_outs.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (p.unknowns.length ? '<div class="fb-sub">The research couldn\'t establish</div><ul class="fb-list">' + p.unknowns.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '')
      : '<p class="tc-sub">Positioning will appear here once it\'s built.</p>') +
    (p ? dropNote(p) : '') + '<details class="is-more"><summary>Raw research findings</summary><p class="ds-raw">' + nl2br(d.findings || '') + '</p></details>' +
    (src.length ? '<div class="fb-sub">Sources</div><ul class="ds-src">' + src.map(function(s){ return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title || s.url) + '</a></li>'; }).join('') + '</ul>' : note('', 'No sources were returned - treat the findings with care.')) + '</div>';
}

/* ========================================================= QUESTIONS TO ASK */
var QTA_SUGGEST = ['What does success in this role look like in the first 6 months?', 'What are the biggest challenges the person in this role will face?', 'How would you describe the team I would be working with?', 'What do the strongest people on this team do differently?', 'How is feedback given, and how often?', 'What are the next steps in the process, and your timeline?', 'What is one thing you would change about how the team works today?'];
function renderAsk(){
  var sec = $('askSection'); if(!sec) return;
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    sec.innerHTML = head('Questions to ask them', 'Your questions get judged too. Keep a short list of sharp ones - each is checked as you save it (no Googleable, me-first or yes/no questions), and the AI writes questions tuned to who you\'re meeting.') +
      '<div class="tool-card"><span class="ip-label">Add your own</span><div style="display:flex; gap:10px; flex-wrap:wrap;"><input class="ip-field" id="askInput" maxlength="300" style="flex:1; min-width:200px;" placeholder="e.g. What does success in this role look like at 6 months?"><button class="btn" data-act="ask-add" id="askAddBtn">Save</button></div>' +
      '<div id="askLive" class="ask-live"></div><div style="margin-top:16px;"><span class="ip-label">Tap to save a suggestion</span><div id="askSuggest"></div></div></div>' +
      '<div class="tool-card"><h3>Generate sharp questions</h3><div class="ip-row"><div><span class="ip-label">Who are you meeting?</span><select class="ip-field" id="askWho"><option value="all">Everyone (grouped)</option><option value="recruiter">Recruiter</option><option value="hiring_manager">Hiring manager</option><option value="peer">Future teammate</option><option value="executive">Executive</option></select></div></div>' +
      '<div class="is-actions"><button class="ai-btn" data-act="ask-gen" id="askGenBtn">Write my questions</button></div><div id="askGenResult"></div></div><div id="askList"></div>';
  }
  $('askSuggest').innerHTML = QTA_SUGGEST.map(function(s){ return '<span class="ask-suggest" data-act="ask-add-text" data-v="' + esc(s) + '" role="button" tabindex="0">+ ' + esc(s) + '</span>'; }).join('');
  renderAskList();
}
function renderAskList(){
  var list = $('askList'); if(!list) return;
  var items = readArr(K.ASK).filter(function(a){ return typeof a.text === 'string'; });
  if(!items.length){ list.innerHTML = '<div class="empty-state"><div class="glyph">&#10068;</div>No questions saved yet.<div class="sub">Add your own above, or tap a suggestion.</div></div>'; refreshCounts(); return; }
  var t = target(), dd = dossierFor(t.company), asrc = E.corpusOf({ role: t.role, company: t.company, jd: t.jd, research: dd ? dd.findings : '' }, background());
  list.innerHTML = '<div class="tool-card"><span class="ip-label">Your list</span>' + items.map(function(a){ var ck = E.askCheck(a.text), fig = E.honestyCheck(asrc, claimText(a.text)).flagged; return '<div class="crud-item" data-id="' + esc(a.id) + '" style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;"><div><span class="ask-text">' + esc(a.text) + '</span>' + (fig.length ? '<div class="ask-flags"><span>&#9888; ' + esc('Unverified figure: ' + fig.join(', ') + ' - it isn\'t in the JD, your research or your background. Check it before you ask.') + '</span></div>' : '') + (ck.flags.length ? '<div class="ask-flags">' + ck.flags.map(function(f){ return '<span>&#9888; ' + esc(f.text) + '</span>'; }).join('') + '</div>' : ck.strong && !fig.length ? '<div class="ask-good">&#10003; Sharp question</div>' : '') + '</div><button class="btn ghost is-xs" data-act="ask-del" data-ask-del="' + esc(a.id) + '">Remove</button></div>'; }).join('') + '</div>';
  refreshCounts();
}
function askAdd(text){ var t = clean(text).slice(0, 300); if(!t) return false; if(readArr(K.ASK).some(function(a){ return clean(a.text).toLowerCase() === t.toLowerCase(); })){ toast('Already on your list.'); return false; } syncPut('interview_ask', K.ASK, { id: E.uid('q'), text: t }); renderAskList(); return true; }
function askGen(){
  var btn = $('askGenBtn'), box = $('askGenResult'), t = target(), d = dossierFor(t.company);
  if(!t.role){ toast('Set your target role first (top of the page).'); return; }
  busy(btn, true, 'Writing…');
  aiTool('ask', { role: t.role, company: t.company, jd: t.jd.slice(0, 3500), research: d ? str(d.findings, 3000) : '', interviewer: $('askWho').value }).then(function(r){
    busy(btn, false);
    if(!r.ok){ box.innerHTML = note('warn', esc(aiMsg(r, 'question writer')) + ' The suggestions above are always available.'); return; }
    var labels = nmap({ recruiter: 'Recruiter', hiring_manager: 'Hiring manager', peer: 'Future teammate', executive: 'Executive' });
    // Figures in a question you'll ask out loud must come from the JD, the research or your own background.
    // The server also returns unsupported_numbers, but it never sees your background, so the
    // browser checks the same figures here against the fuller source instead.
    var asrc = E.corpusOf({ role: t.role, company: t.company, jd: t.jd, research: d ? d.findings : '' }, background()), groups = arr(r.data.groups).filter(isObj);
    var aflag = uniq([].concat.apply([], groups.map(function(g){ return arr(g.questions).filter(isObj).map(function(q){ return E.honestyCheck(asrc, claimText(str(q.q, 300))).flagged; }); }).reduce(function(x, y){ return x.concat(y); }, [])));
    box.innerHTML = dropNote(r.data) + (aflag.length ? note('warn', '<b>Not in the JD or your research:</b> ' + aflag.map(function(f){ return '<code>' + esc(f) + '</code>'; }).join(' ') + ' - check these figures before you ask, or drop them.') : '') + groups.map(function(g){ return '<div class="fb-sub">' + esc(labels[g.interviewer] || g.interviewer) + '</div>' + arr(g.questions).filter(isObj).map(function(q){ var qf = E.honestyCheck(asrc, claimText(str(q.q, 300))).flagged; return '<div class="ds-q"><span>' + esc(q.q) + (q.why ? '<i class="ds-why">' + esc(q.why) + '</i>' : '') + (q.grounded_in ? '<i class="ds-why">Builds on: "' + esc(q.grounded_in) + '"</i>' : '') + (qf.length ? '<i class="ds-why ds-warn">Unverified figure: ' + qf.map(esc).join(', ') + '</i>' : '') + '</span><button class="btn ghost is-xs" data-act="ask-add-text" data-v="' + esc(q.q) + '">+ Save</button></div>'; }).join(''); }).join('') +
      (arr(r.data.avoid).length ? '<div class="fb-sub">Don\'t ask</div><ul class="fb-list fb-improve">' + r.data.avoid.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '');
  });
}

/* ================================================================= ANSWER X-RAY */
var PART_LABEL = { situation: 'Situation', task: 'Task', action: 'Action', result: 'Result', lesson: 'Lesson', filler: 'Filler', hedge: 'Hedge', off_topic: 'Off-topic', context: 'Context' };
function renderXray(){
  var sec = $('xraySection'); if(!sec) return;
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    sec.innerHTML = head('Answer X-Ray', 'Paste (or speak) any answer and see it the way an interviewer does: every sentence labelled - situation, action, result, filler, hedge - what to cut, what\'s missing, and a tighter rewrite that uses only your facts.') +
      '<div class="tool-card"><span class="ip-label">The question</span><input class="ip-field" id="xrQ" maxlength="600" placeholder="e.g. Tell me about a time you led under pressure">' +
      '<span class="ip-label" style="margin-top:10px; display:block;">Your answer</span><textarea class="ip-field body" id="xrA" maxlength="8000" placeholder="Type or paste your answer, or press Speak it and answer out loud..."></textarea>' +
      '<div class="is-actions">' + (V.support().stt ? '<button class="btn ghost" data-act="xr-mic" id="xrMic">&#127908; Speak it</button>' : '') + '<button class="ai-btn" data-act="xr-run" id="xrBtn">X-Ray it</button></div></div><div id="xrLocal"></div><div id="xrResult"></div>';
  }
  xrayLocal();
}
function xrayLocal(){
  var box = $('xrLocal'); if(!box) return;
  var a = ($('xrA') || {}).value || '', q = ($('xrQ') || {}).value || '';
  if(clean(a).length < 20){ box.innerHTML = ''; return; }
  var an = E.analyzeAnswer(a, { question: q, mode: S.xray && S.xray.voice ? 'voice' : 'text', seconds: S.xray && S.xray.voice ? S.xray.voice.seconds : undefined });
  var labels = E.labelSentences(an.sentences);
  box.innerHTML = '<div class="tool-card"><h3>Sentence by sentence <span class="is-src local">Instant, rule-based</span></h3>' + xrSentences(an.sentences, labels, []) +
    '<div class="fb-dims" style="margin-top:12px;">' + E.DIMS.map(function(d){ return '<span class="fb-dim"><i>' + esc(E.DIM_LABEL[d]) + '</i>' + dots(an.scores[d]) + '</span>'; }).join('') + '</div>' +
    '<div class="fb-measured"><span class="fb-mk">Measured</span><span>' + an.words + ' words (~' + fmtSecs(an.seconds) + ')</span><span>' + an.fillers.count + ' fillers</span><span>' + an.hedges.count + ' hedges</span><span>I ' + an.iSubj + ' / we ' + an.weSubj + '</span><span>' + (an.quantified ? 'has numbers' : 'no numbers') + '</span></div>' +
    E.localIssues(an).slice(0, 3).map(function(i){ return '<div class="xr-issue">' + esc(E.issueText(i.key, an)) + (i.quote ? ' <q>' + esc(i.quote) + '</q>' : '') + '</div>'; }).join('') + '</div>';
}
function xrSentences(sents, labels, cuts){
  var byI = {}; (labels || []).forEach(function(l){ byI[l.i] = l; });
  return '<div class="xr-sents">' + sents.map(function(s, i){ var l = byI[i] || { part: 'context' }; return '<div class="xr-s p-' + esc(l.part) + (cuts.indexOf(i) >= 0 ? ' cut' : '') + '"><span class="xr-tag">' + esc(PART_LABEL[l.part] || l.part) + '</span><span class="xr-t">' + esc(s) + '</span>' + (l.note ? '<span class="xr-note">' + esc(l.note) + '</span>' : '') + '</div>'; }).join('') + '</div>';
}
function xrayRun(){
  stopDictation();   // the answer is being sent: nothing keeps listening into it
  var q = clean($('xrQ').value), a = ($('xrA').value || '').trim();
  if(!q){ $('xrQ').focus(); toast('Add the question you were answering.'); return; }
  if(clean(a).length < 20){ $('xrA').focus(); toast('Type or paste your answer first.'); return; }
  var sents = E.sentences(a), btn = $('xrBtn'), box = $('xrResult');
  busy(btn, true, 'X-raying…');
  aiTool('xray', { question: q, sentences: sents, role: target().role, difficulty: prefs().difficulty || 'tough' }).then(function(r){
    busy(btn, false);
    if(!r.ok){ box.innerHTML = note('warn', esc(aiMsg(r, 'X-Ray')) + ' The sentence labels above are the built-in, rule-based read.'); return; }
    var d = r.data, verdictOk = !d.verdict || E.quotesOk(d.verdict, a + ' ' + q);
    var flagged = E.honestyCheck(a, d.rewrite || '').flagged, xs = Object.create(null);   // the rewrite's own figures, whole - never a substring match
    S.xray = S.xray || {}; S.xray.rewrite = d.rewrite || ''; S.xray.source = a;
    box.innerHTML = '<div class="tool-card"><h3>The interviewer\'s read ' + aiBadge('ai') + ' <span class="fb-score" style="color:' + scoreColor(d.score) + ';">' + esc(num(d.score, 1, 10) || '-') + '/10</span></h3>' + (verdictOk && d.verdict ? '<p class="fb-head">' + esc(d.verdict) + '</p>' + figWarn(sayFlags(a, [d.verdict], true), 'your answer') : '') +
      xrSentences(sents, arr(d.labels), arr(d.cuts)) + (arr(d.cuts).length ? '<p class="tc-sub">Struck-through sentences: cut them.</p>' : '') + (num(d.unverified_quotes, 0, 99) ? '<div class="fb-fine">' + esc(num(d.unverified_quotes, 0, 99)) + ' AI line' + (num(d.unverified_quotes, 0, 99) === 1 ? '' : 's') + ' that credited you with words or figures you never gave ' + (num(d.unverified_quotes, 0, 99) === 1 ? 'was' : 'were') + ' removed.</div>' : '') +
      ((d.missing || []).length ? '<div class="fb-sub">Missing</div><ul class="fb-list fb-improve">' + d.missing.map(function(m){ return '<li>' + esc(m) + lineWarn(sayFlags(a, [m]), xs, 'your answer') + '</li>'; }).join('') + '</ul>' : '') +
      (d.rewrite ? '<div class="fb-sub">Tighter version - your facts only</div><textarea class="ip-field body" id="xrRewrite" maxlength="3000">' + esc(d.rewrite) + '</textarea><div id="xrHonesty">' + honestyBanner(flagged) + '</div>' + (d.rewrite_notes ? '<p class="tc-sub">' + esc(d.rewrite_notes) + figWarn(sayFlags(a, [d.rewrite_notes]).filter(function(f){ return flagged.indexOf(f) < 0; }), 'your answer') + '</p>' : '') +
        '<div class="is-actions"><button class="btn" data-act="xr-use" id="xrUseBtn"' + (flagged.length ? ' disabled' : '') + '>Use this as my answer</button><button class="btn ghost" data-act="xr-copy">Copy</button></div>' : '') + '</div>';
  });
}

/* ============================================================ FOLLOW-UP GAUNTLET */
var LADDER = [
  ['ownership', 'What exactly did YOU do - not the team, not "we"?'],
  ['measurement', 'How do you know it worked? What did you measure, and against what baseline?'],
  ['depth', 'Walk me through the hardest decision in that, step by step.'],
  ['counterfactual', 'What would have happened if you hadn\'t stepped in?'],
  ['conflict', 'Who disagreed with you along the way, and how did you handle it?'],
  ['failure', 'What went wrong along the way, and what would you do differently now?'],
  ['values', 'Why did that matter to you personally?']
];
function renderGauntlet(){
  var sec = $('gauntletSection'); if(!sec) return;
  var g = S.gauntlet;
  if(!g || g.phase === 'setup'){
    var st = stories();
    sec.innerHTML = head('Follow-up Gauntlet', 'Real interviewers don\'t stop at your first answer - they probe until the story holds up or cracks. Pick a story and survive five escalating follow-ups. Every answer is checked against what you said before: changed numbers and inflated roles are caught.') +
      '<div class="tool-card"><div class="ip-row"><div><span class="ip-label">Pick a story</span><select class="ip-field" id="gtStory"><option value="">- or write the answer below -</option>' + st.map(function(s){ return '<option value="' + esc(s.id) + '"' + (g && g.storyId === s.id ? ' selected' : '') + '>' + esc(s.title || 'Untitled story') + '</option>'; }).join('') + '</select></div>' +
      '<div><span class="ip-label">How harsh</span>' + gtChips() + '</div></div>' +
      '<span class="ip-label">The question</span><input class="ip-field" id="gtQ" maxlength="600" placeholder="e.g. Tell me about a time you fixed a broken process" value="' + esc((g && g.q) || '') + '">' +
      '<span class="ip-label" style="margin-top:10px; display:block;">Your original answer</span><textarea class="ip-field body" id="gtOriginal" maxlength="5000" placeholder="The answer you\'d give the first time...">' + esc((g && g.original) || '') + '</textarea>' +
      '<div class="is-actions"><button class="btn" data-act="gt-start" id="gtStartBtn">Start the gauntlet</button></div></div>';
    return;
  }
  if(!$('gtThread')) renderGauntletLive();
}
function gtChips(){ var cur = (S.gauntlet && S.gauntlet.difficulty) || 'brutal'; return '<div class="pill-row" role="group">' + Object.keys(E.DIFFS).map(function(k){ return '<button class="chip' + (k === cur ? ' active' : '') + '" aria-pressed="' + (k === cur) + '" data-act="gt-diff" data-v="' + k + '">' + esc(E.DIFFS[k].label) + '</button>'; }).join('') + '</div>'; }
function renderGauntletLive(){
  var sec = $('gauntletSection'), g = S.gauntlet;
  sec.innerHTML = head('Follow-up Gauntlet', 'Probe ' + Math.min(g.rounds.length + 1, 5) + ' of 5 · ' + esc(E.DIFFS[g.difficulty].label)) +
    '<div class="tool-card"><div class="fb-sub">The question</div><p class="q-text">' + esc(g.q) + '</p><div class="fb-sub">Your original answer</div><p class="qa-a">' + esc(g.original) + '</p></div>' +
    '<div id="gtThread" aria-live="polite"></div><div class="tool-card" id="gtAnswerBox"><span class="ip-label">Your answer to the probe</span><textarea class="ip-field body" id="gtAnswer" maxlength="3000" placeholder="Answer it straight..."></textarea>' +
    '<div class="is-actions">' + (V.support().stt ? '<button class="btn ghost" data-act="gt-mic" id="gtMic">&#127908; Speak it</button>' : '') + '<button class="btn" data-act="gt-submit" id="gtSubmitBtn">Answer</button><button class="btn ghost" data-act="gt-end">End &amp; score it</button><button class="btn ghost" data-act="gt-reset">New story</button></div></div><div id="gtSummary"></div>';
  var th = $('gtThread');
  g.rounds.forEach(function(r){ th.insertAdjacentHTML('beforeend', gtRoundHTML(r)); });
  if(g.probe) th.insertAdjacentHTML('beforeend', '<div class="bubble interviewer gt-probe"><div class="bubble-who">Probe ' + (g.rounds.length + 1) + ' · ' + esc(g.angle || '') + '</div>' + esc(g.probe) + (g.probeWithheld ? GT_WITHHELD : '') + '</div>');
}
var GT_WITHHELD = '<div class="fb-fine">The AI\'s probe was withheld (it used quotes or figures that aren\'t in your material) - this one is from the built-in ladder. The AI is still on.</div>';
function gtRoundHTML(r){
  var a = r.assessment || {};
  return '<div class="bubble interviewer"><div class="bubble-who">Probe · ' + esc(r.angle || '') + '</div>' + esc(r.probe) + (r.probeWithheld ? GT_WITHHELD : '') + '</div><div class="bubble you"><div class="bubble-who">You</div>' + esc(r.answer) + '</div>' +
    '<div class="fb-card"><div class="fb-top"><span class="fb-score" style="color:' + scoreColor((num(a.score, 1, 5) || 3) * 2) + ';">' + esc(num(a.score, 1, 5) || '-') + '/5</span>' + aiBadge(r.src) + '<span class="fb-head">' + esc(a.note || '') + '</span></div>' +
    (a.contradiction ? '<div class="fb-flags"><span>&#9888; ' + esc(a.contradiction) + '</span></div>' : '') + dropNote({ unverified_quotes: r.dropped }) +
    (r.flags || []).map(function(f){ return '<div class="fb-flags"><span>&#9888; ' + (f.kind === 'number' ? 'Your figure changed: <q>' + esc(f.beforeQuote) + '</q> &rarr; <q>' + esc(f.afterQuote) + '</q>' : f.kind === 'date' ? 'Your date changed: <q>' + esc(f.beforeQuote) + '</q> &rarr; <q>' + esc(f.afterQuote) + '</q>' : f.kind === 'inflation' ? 'Your role grew: <q>' + esc(f.beforeQuote) + '</q> &rarr; <q>' + esc(f.afterQuote) + '</q>' : 'You walked your role back: <q>' + esc(f.beforeQuote) + '</q> &rarr; <q>' + esc(f.afterQuote) + '</q>') + '</span></div>'; }).join('') + '</div>';
}
async function gauntletStart(){
  var sid = $('gtStory').value, st = stories().filter(function(s){ return s.id === sid; })[0];
  var q = clean($('gtQ').value), orig = ($('gtOriginal').value || '').trim();
  if(st && !orig) orig = [st.s, st.t, st.a, st.r].filter(Boolean).join(' ');
  if(!q && st) q = 'Tell me about ' + (st.title ? 'the time: ' + st.title : 'a time you were proud of your work') + '.';
  if(clean(orig).length < 20){ $('gtOriginal').focus(); toast('Give the answer (or pick a story) you want to stress-test.'); return; }
  if(!q){ $('gtQ').focus(); toast('Add the question you were answering.'); return; }
  S.gauntlet = { phase: 'live', storyId: sid, q: q, original: orig, rounds: [], difficulty: (S.gauntlet && S.gauntlet.difficulty) || 'brutal', ladder: 0, run: (S.gauntlet && S.gauntlet.run || 0) + 1 };
  renderGauntletLive();
  await gauntletNext(null);
}
async function gauntletNext(lastAnswer){
  var g = S.gauntlet; if(!g || g.phase !== 'live' || g.pending) return;
  var run = g.run, btn = $('gtSubmitBtn');
  busy(btn, true, 'Thinking…');
  var work = (async function(){
    var ex = g.rounds.map(function(r){ return { probe: r.probe, answer: r.answer }; });
    if(lastAnswer != null) ex.push({ probe: g.probe, answer: lastAnswer });
    var res = null, probeWithheld = false;
    if(userId() && g.ai !== false){
      var r = await aiTool('gauntlet', { question: g.q, original: g.original, exchanges: ex, difficulty: g.difficulty, role: target().role });
      if(r.ok) res = r.data; else if(r.withheld) probeWithheld = true; else { g.ai = false; g.aiNote = aiMsg(r, 'Gauntlet'); }   // one withheld probe: the built-in ladder covers just that one
    }
    if(!S.gauntlet || S.gauntlet.run !== run || g.phase === 'done') return 'stale';
    if(lastAnswer != null){
      var earlier = [g.original].concat(g.rounds.map(function(r){ return r.answer; })).join(' ' + E.SEP + ' ');
      var flags = E.consistency(g.original, g.rounds.map(function(r){ return r.answer; }).concat([lastAnswer])).filter(function(f){ return f.answer === g.rounds.length; });
      var local = E.judgeProbe(g.probe, g.angle, lastAnswer);
      // "Your story changed" is shown only if it quotes real words from two different answers.
      var ra = res && res.assessment && typeof res.assessment === 'object' ? res.assessment : null;
      var contra = ra && ra.contradiction && E.contradictionOk(ra.contradiction, lastAnswer, earlier) ? str(ra.contradiction, 400) : '';
      var assess = ra ? { score: num(ra.score, 1, 5) || local.score, note: ra.note || local.note, contradiction: contra } : { score: local.score, note: local.note, contradiction: '' };
      var round = { probe: g.probe, angle: g.angle, probeWithheld: !!g.probeWithheld, answer: lastAnswer, assessment: assess, flags: flags, src: res ? 'ai' : 'local', dropped: res ? (num(res.unverified_quotes, 0, 99) || 0) + (ra && ra.contradiction && !contra ? 1 : 0) : 0 };
      g.rounds.push(round); var th0 = $('gtThread'); if(th0){ var pr = th0.querySelector('.gt-probe'); if(pr) pr.remove(); th0.insertAdjacentHTML('beforeend', gtRoundHTML(round)); }
    }
    if(g.rounds.length >= 5 || g.endRequested) return 'end';
    if(res && res.probe){ g.probe = res.probe; g.angle = res.angle; }
    else { if(res && (num(res.unverified_quotes, 0, 99) || 0) > 0) probeWithheld = true; var step = LADDER[g.ladder % LADDER.length]; g.ladder++; g.probe = step[1]; g.angle = step[0]; }
    g.probeWithheld = probeWithheld;
    var th = $('gtThread'); if(th) th.insertAdjacentHTML('beforeend', (g.aiNote && !g.aiNoteShown ? note('warn', esc(g.aiNote) + ' The built-in probe ladder takes over.') : '') + '<div class="bubble interviewer gt-probe"><div class="bubble-who">Probe ' + (g.rounds.length + 1) + ' · ' + esc(g.angle || '') + '</div>' + esc(g.probe) +
      (probeWithheld ? GT_WITHHELD : '') + '</div>');
    if(g.aiNote) g.aiNoteShown = true;
    var hd = $('gauntletSection').querySelector('.studio-toolhead p'); if(hd) hd.textContent = 'Probe ' + (g.rounds.length + 1) + ' of 5 · ' + E.DIFFS[g.difficulty].label;
    var ta = $('gtAnswer'); if(ta){ ta.value = ''; try{ ta.focus({ preventScroll: true }); }catch(e){} }
    return 'next';
  })();
  g.pending = work;
  var outcome = 'stale';
  try{ outcome = await work; }catch(e){ outcome = 'next'; }
  if(g.pending === work) g.pending = null;
  if(!S.gauntlet || S.gauntlet.run !== run || g.phase === 'done') return;
  busy(btn, false);
  if(outcome === 'end') gauntletEnd();
}
function gauntletEnd(){
  var g = S.gauntlet; if(!g || g.phase === 'done') return;
  stopDictation();
  var ab = $('gtAnswerBox');
  // An answer still being scored counts: finish it first.
  if(g.pending){ g.endRequested = true; var bx = $('gtSummary'); if(bx) bx.innerHTML = note('', 'Scoring your last answer…'); if(ab) ab.querySelectorAll('textarea,#gtSubmitBtn,#gtMic').forEach(function(x){ x.disabled = true; }); return; }
  var scores = g.rounds.map(function(r){ return r.assessment.score || 3; }), avgS = E.avg(scores) || 0;
  var flags = [].concat.apply([], g.rounds.map(function(r){ return r.flags || []; })), contra = g.rounds.filter(function(r){ return r.assessment.contradiction; }).length;
  var held = g.rounds.filter(function(r){ return (r.assessment.score || 0) >= 3 && !(r.flags || []).length && !r.assessment.contradiction; }).length;
  var verdict = !g.rounds.length ? 'No probes answered yet.' : flags.length + contra ? 'Cracked under pressure: your story changed between answers. Fix the facts before a real interviewer finds it.' : avgS >= 3.8 ? 'Held up. This story is real, owned and defensible.' : avgS >= 2.8 ? 'Mostly held, but thin under pressure - add specifics you can stand behind.' : 'Cracked: the follow-ups exposed how little detail is behind this story.';
  var box = $('gtSummary'); if(box) box.innerHTML = '<div class="tool-card"><h3>Gauntlet result</h3><div class="hs-verdict ' + (!g.rounds.length ? 'mid' : flags.length + contra ? 'bad' : avgS >= 3.8 ? 'good' : avgS >= 2.8 ? 'mid' : 'bad') + '"><div class="hv-dec">' + held + ' of ' + g.rounds.length + ' probes held</div><div class="hv-head">' + esc(verdict) + '</div></div>' +
    (flags.length ? '<div class="fb-sub">Inconsistencies caught</div>' + flags.map(function(f){ return '<div class="fb-flags"><span>&#9888; <q>' + esc(f.beforeQuote) + '</q> &rarr; <q>' + esc(f.afterQuote) + '</q></span></div>'; }).join('') : '') + '</div>';
  g.phase = 'done';
  var th = $('gtThread'); if(th){ var pr = th.querySelector('.gt-probe'); if(pr) pr.remove(); }
  if(ab) ab.querySelectorAll('textarea,button[data-act="gt-submit"],#gtMic').forEach(function(x){ x.disabled = true; });
}

/* ===================================================== TELL ME ABOUT YOURSELF */
function renderTmays(){
  var sec = $('tmaysSection'); if(!sec) return;
  var tm = readObj(K.TMAYS);
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    sec.innerHTML = head('"Tell me about yourself"', 'The question every interview opens with - and the one most people ramble through. Draft a tight present-past-future answer from your real background, then rehearse it out loud against the clock until it lands in 60-90 seconds.') +
      '<div class="tool-card"><span class="ip-label">Length</span><div class="pill-row" id="tmLen">' + [[30, '30 sec'], [60, '60 sec'], [90, '90 sec']].map(function(o){ return '<button class="chip' + ((tm.len || 60) === o[0] ? ' active' : '') + '" aria-pressed="' + ((tm.len || 60) === o[0]) + '" data-act="tm-len" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div class="is-actions" style="margin-top:4px;"><button class="ai-btn" data-act="tm-draft" id="tmaysBtn">Draft my answer</button></div><div id="tmaysResult"></div></div>' +
      '<div class="tool-card"><h3>Your script</h3><textarea class="ip-field body" id="tmScript" maxlength="3000" placeholder="Your answer - edit freely. It saves as you type.">' + esc(tm.script || '') + '</textarea><div id="tmCheck"></div>' +
      '<div class="is-actions">' + (V.support().stt ? '<button class="btn" data-act="tm-rehearse" id="tmRecBtn">&#127908; Rehearse out loud</button>' : '') + '<button class="btn ghost" data-act="tm-copy">Copy</button></div><div class="hs-cap hidden" id="tmCap"></div><div id="tmRehearsal"></div></div>';
  }
  tmaysScriptCheck();
}
function tmaysScriptCheck(){
  var el = $('tmCheck'), sc = ($('tmScript') || {}).value || ''; if(!el) return;
  if(clean(sc).length < 30){ el.innerHTML = ''; return; }
  var c = E.tmaysCheck(sc);
  el.innerHTML = '<div class="qc"><span class="qc-k">Script check</span><span>' + (c.present ? '&#10003;' : '&#10007;') + ' present</span><span>' + (c.past ? '&#10003;' : '&#10007;') + ' past</span><span>' + (c.future ? '&#10003;' : '&#10007;') + ' why this role</span><span>~' + fmtSecs(c.seconds) + ' spoken</span>' + c.tips.slice(0, 2).map(function(t){ return '<span class="w">' + esc(t) + '</span>'; }).join('') + '</div>';
}
function tmaysLocalDraft(len){
  var p = profile(), R = resumeModel(), w = R && E && root.RESUME_STUDIO_ENGINE ? root.RESUME_STUDIO_ENGINE.mostRecentWork(R) : null, t = target();
  var now1 = w ? 'Right now I\'m ' + (w.title ? 'a ' + w.title : 'working') + (w.org ? ' at ' + w.org : '') + ', where I [one thing you do or improved].' : 'Right now I\'m [what you do now, in one line].';
  var past = 'Before that, [the one or two past experiences that explain how you got here]' + (p.skills ? ' - which is where I built my ' + String(p.skills).split(',').slice(0, 2).map(clean).join(' and ') + ' skills' : '') + '.';
  var fut = 'That\'s why ' + (t.role ? 'this ' + t.role + ' role' : 'this role') + (t.company ? ' at ' + t.company : '') + ' is the obvious next step: [the specific thing about it that fits].';
  return [now1, past, fut].join(' ');
}
function tmaysDraft(){
  var box = $('tmaysResult'), btn = $('tmaysBtn'), len = readObj(K.TMAYS).len || 60, t = target(), bg = background();
  busy(btn, true, 'Drafting…');
  aiTool('tmays', { background: bg || 'Not much shared yet.', role: t.role, company: t.company, seconds: len }).then(function(r){
    busy(btn, false);
    if(!r.ok){
      var draft = tmaysLocalDraft(len);
      box.innerHTML = '<div class="ai-out ai-muted">' + esc(aiMsg(r, 'writer')) + '</div><div class="fb-sub">A built-in starting point from your profile - replace every [bracket] with something true:</div><p class="fb-better">' + esc(draft) + '</p><button class="btn ghost is-xs" data-act="tm-use" data-v="' + esc(draft) + '">Use as my script</button>';
      return;
    }
    var d = r.data;
    if(!d.script){ var dr0 = tmaysLocalDraft(len); box.innerHTML = note('warn', 'The AI draft used quotes or figures that aren\'t in your background, so it was withheld. Try again, or start from this built-in draft and replace every [bracket] with something true:') + '<p class="fb-better">' + esc(dr0) + '</p><button class="btn ghost is-xs" data-act="tm-use" data-v="' + esc(dr0) + '">Use as my script</button>'; return; }
    var shown = [d.hook, d.present, d.past, d.future, d.script, d.short].concat(d.bridges || []).join(' ');
    var h = E.honestyCheck(bg, shown), flagged = uniq(h.flagged.concat((d.unsupported_numbers || [])));
    S.tmDraft = d;
    box.innerHTML = '<div class="fb-sub">Draft ' + aiBadge('ai') + '</div>' + dropNote(d) + (d.hook ? '<p class="tm-hook">' + esc(d.hook) + '</p>' : '') + '<p class="fb-better">' + esc(d.script) + '</p>' + honestyBanner(flagged) +
      (d.short ? '<div class="fb-sub">30-second version</div><p class="fb-better">' + esc(d.short) + '</p>' : '') +
      ((d.bridges || []).length ? '<div class="fb-sub">Bridges to this role</div><ul class="fb-list">' + d.bridges.map(function(b){ return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="is-actions"><button class="btn" data-act="tm-use-ai"' + (flagged.length ? ' disabled title="Remove the figures you never gave first"' : '') + '>Use as my script</button></div>';
  });
}
var tmRec = null;
function tmaysRehearse(){
  var btn = $('tmRecBtn'), cap = $('tmCap'), out = $('tmRehearsal');
  if(tmRec){ var r0 = tmRec; tmRec = null; busy(btn, true, 'Scoring…'); var fr = r0.meter ? r0.meter.stop() : null;
    Promise.all([r0.stt ? r0.stt.stop() : null, r0.rec ? r0.rec.stop() : null]).then(function(res){
      releaseMic(); busy(btn, false); btn.innerHTML = '&#127908; Rehearse out loud'; var txt = clean(res[0] && res[0].text);
      if(!txt){ out.innerHTML = note('warn', 'I didn\'t catch anything - check your mic and try again.'); return; }
      var fa = fr ? E.analyzeFrames(fr, { startT: 0 }) : null, secs = fa && fa.lastSpeech ? fa.lastSpeech - (fa.latency || 0) : (now() - r0.at) / 1000;
      var c = E.tmaysCheck(txt, secs), a = c.analysis, script = ($('tmScript') || {}).value || '';
      var cover = script ? Math.round(E.qtoks(script).filter(function(w, i, arr){ return w.length > 4 && arr.indexOf(w) === i; }).filter(function(w){ return E.qtoks(txt).indexOf(w) >= 0; }).length / Math.max(1, E.qtoks(script).filter(function(w, i, arr){ return w.length > 4 && arr.indexOf(w) === i; }).length) * 100) : null;
      var takes = arr(readObj(K.TMAYS).takes).filter(isObj); takes.unshift({ at: new Date().toISOString(), seconds: Math.round(secs), wpm: a.wpm, fillers: a.fillers.count, score: c.score }); var tmo = readObj(K.TMAYS); tmo.takes = takes.slice(0, 12); lsSet(K.TMAYS, tmo);
      out.innerHTML = '<div class="fb-card"><div class="fb-top"><span class="fb-score" style="color:' + scoreColor(c.score * 2) + ';">' + c.score + '/5</span><span class="fb-head">' + fmtSecs(secs) + (secs > 95 ? ' - too long' : secs < 40 ? ' - too short' : ' - good length') + '</span></div>' +
        '<div class="fb-measured"><span class="fb-mk">Measured</span>' + (a.wpm ? '<span>' + a.wpm + ' wpm</span>' : '') + '<span>' + a.fillers.count + ' fillers</span>' + (fa && fa.latency != null ? '<span>started after ' + fa.latency + 's</span>' : '') + (cover != null ? '<span>' + cover + '% of your script\'s key words</span>' : '') + '<span>' + (c.present ? '&#10003;' : '&#10007;') + ' present ' + (c.past ? '&#10003;' : '&#10007;') + ' past ' + (c.future ? '&#10003;' : '&#10007;') + ' future</span></div>' +
        (c.tips.length ? '<ul class="fb-list fb-improve">' + c.tips.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="fb-better">That landed. Do it twice more so it\'s automatic.</p>') +
        (res[1] && res[1].url ? '<audio controls preload="none" src="' + esc(res[1].url) + '"></audio>' : '') +
        (takes.length > 1 ? '<div class="fb-fine">Takes: ' + takes.slice(0, 6).map(function(t){ var sc = num(t.score, 0, 5); return esc(fmtSecs(num(t.seconds, 0, 99999) || 0)) + ' (' + (sc == null ? '-' : esc(sc)) + '/5)'; }).join(' · ') + '</div>' : '') + '</div>';
      if(cap) cap.classList.add('hidden');
    });
    return;
  }
  out.innerHTML = '';
  var req = { at: now() }; tmRec = req;
  btn.innerHTML = '&#9632; Stop &amp; score';
  if(cap){ cap.classList.remove('hidden'); cap.textContent = 'Listening… go.'; }
  V.openMic().then(function(stream){
    if(tmRec !== req){ releaseMic(); return; }
    req.meter = V.meter(stream); req.rec = V.record(stream);
    req.stt = V.listen({ onUpdate: function(t){ if(tmRec === req && cap) cap.textContent = t.slice(-220); }, onError: function(er){
      if(tmRec !== req) return;
      // Speech recognition died for good: nothing can be scored, so nothing keeps recording or holding the mic.
      tmRec = null; btn.innerHTML = '&#127908; Rehearse out loud'; if(cap) cap.textContent = sttErrorText(er);
      try{ if(req.stt) req.stt.abort(); if(req.meter) req.meter.stop(); }catch(e){}
      quiet(Promise.resolve(req.rec ? req.rec.stop() : null).then(function(r){ if(r && r.url){ try{ URL.revokeObjectURL(r.url); }catch(e){} } releaseMic(); }, releaseMic));
    } });
  }, function(){ if(tmRec !== req) return; tmRec = null; btn.innerHTML = '&#127908; Rehearse out loud'; if(cap) cap.textContent = 'Microphone blocked - allow mic access to rehearse out loud.'; releaseMic(); });
}

/* ================================================================ NEGOTIATION */
var NEG_PLAYBOOK = [
  { q: '"What are your salary expectations?" (asked early)', tip: 'Deflect to their budgeted range, or give a researched range late in the process. Avoid naming a single low number first.' },
  { q: 'Responding to the first offer', tip: 'Thank them, show real enthusiasm, then ask for time to review. The first number is rarely the last.' },
  { q: 'Making a counter', tip: 'Anchor with a specific, justified number tied to the scope and your experience. Stay warm and concrete.' },
  { q: 'Negotiating beyond base pay', tip: 'Signing bonus, start date, PTO, remote flexibility, review timing, title - know which matter most to you before the call.' },
  { q: 'Handling "that is the best we can do"', tip: 'Ask what non-salary levers are open, or when the next review is and what it would take to move up.' },
  { q: 'Accepting well', tip: 'Get the final offer in writing before you resign anything, and check the details you negotiated are in it.' }
];
function parseMoney(s){ var t = String(s || '').replace(/,/g, '').trim(), m = t.match(/\d+(?:\.\d+)?/); if(!m) return null; var v = parseFloat(m[0]); if(/\d\s*k\b/i.test(t)) v *= 1000; return v >= 1000 ? v : null; }
function renderNeg(){
  var sec = $('negSection'); if(!sec) return;
  var n = S.neg;
  if(!n || n.phase === 'setup'){
    var t = target(), notes = readObj(K.NEGNOTES);
    sec.innerHTML = head('Negotiation simulator', 'Practise the offer call against a recruiter who uses real tactics - exploding deadlines, "standard bands", fishing for your current pay. You set the offer; the recruiter\'s budget ceiling is hidden and randomized for practice (it isn\'t market data). Every line you say is coached.') +
      '<div class="tool-card"><div class="ip-row"><div><span class="ip-label">Role</span><input class="ip-field" id="ngRole" maxlength="200" value="' + esc(t.role) + '"></div><div><span class="ip-label">Company</span><input class="ip-field" id="ngCompany" maxlength="200" value="' + esc(t.company) + '"></div></div>' +
      '<div class="ip-row"><div><span class="ip-label">The offer you\'re negotiating (base)</span><input class="ip-field" id="ngOffer" maxlength="40" placeholder="e.g. $85,000"></div><div><span class="ip-label">Your target</span><input class="ip-field" id="ngTarget" maxlength="40" placeholder="e.g. $95,000"></div></div>' +
      '<span class="ip-label">Recruiter style</span><div class="pill-row">' + [['friendly', 'Friendly'], ['firm', 'Firm'], ['lowball', 'Lowballer']].map(function(o){ return '<button class="chip' + (((n && n.style) || 'firm') === o[0] ? ' active' : '') + '" aria-pressed="' + (((n && n.style) || 'firm') === o[0]) + '" data-act="ng-style" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div class="is-actions"><button class="btn" data-act="ng-start" id="ngStartBtn">Start the call</button></div></div>' +
      '<div class="tool-card"><h3>Playbook</h3><p class="tc-sub">Jot your line for each moment so you\'re not improvising under pressure.</p><div id="negBody">' + NEG_PLAYBOOK.map(function(p, i){ return '<div class="neg-prompt"><p class="np-q">' + esc(p.q) + '</p><p class="np-tip">' + esc(p.tip) + '</p><textarea class="ip-field" data-neg="' + i + '" maxlength="600" placeholder="Your line for this..." style="margin-top:10px; min-height:60px;">' + esc(notes[i] || '') + '</textarea></div>'; }).join('') + '</div></div>';
    return;
  }
  if(!$('ngThread')) renderNegLive();
}
function renderNegLive(){
  var sec = $('negSection'), n = S.neg;
  sec.innerHTML = head('Negotiation simulator', esc(n.role || 'Offer call') + (n.company ? ' at ' + esc(n.company) : '') + ' · written offer ' + fmtMoney(n.offer) + ' · your target ' + fmtMoney(n.target)) +
    '<div class="ng-offer"><span>Offer on the table</span><b id="ngNow">' + fmtMoney(n.current) + '</b></div><div id="ngThread"></div>' +
    '<div class="tool-card" id="ngInputBox"><span class="ip-label">You</span><textarea class="ip-field" id="ngInput" maxlength="1000" style="min-height:70px;" placeholder="Say it the way you would on the call..."></textarea>' +
    '<div class="is-actions">' + (V.support().stt ? '<button class="btn ghost" data-act="ng-mic" id="ngMic">&#127908; Speak it</button>' : '') + '<button class="btn" data-act="ng-send" id="ngSendBtn">Send</button><button class="btn ghost" data-act="ng-end" id="ngEndBtn">End the call</button></div></div><div id="ngSummary"></div>';
  var th = $('ngThread'); n.history.forEach(function(m){ th.insertAdjacentHTML('beforeend', ngMsgHTML(m)); });
}
function ngMsgHTML(m){
  if(m.who === 'recruiter') return '<div class="bubble interviewer"><div class="bubble-who">Recruiter' + (m.tactic && m.tactic !== 'none' ? ' · tactic: ' + esc(m.tactic) : '') + '</div>' + esc(m.text) + '</div>' +
    (m.withheld ? '<div class="fb-fine">The AI\'s line was withheld (it used quotes or figures that aren\'t in your material) - the built-in recruiter answered this one. The AI is still on.</div>' : '') +
    (m.dropped ? dropNote({ unverified_quotes: m.dropped }) : '');
  var c = m.coach || {};
  return '<div class="bubble you"><div class="bubble-who">You</div>' + esc(m.text) + '</div>' + ((c.good && c.good.length) || (c.notes && c.notes.length) || c.ai ? '<div class="fb-card ng-coach"><div class="fb-top"><span class="fb-score" style="color:' + scoreColor((num(c.score, 1, 5) || 3) * 2) + ';">' + esc(num(c.score, 1, 5) || '-') + '/5</span><span class="fb-head">' + esc(c.ai || '') + '</span></div>' + (c.good && c.good.length ? '<ul class="fb-list fb-good">' + c.good.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + (c.notes && c.notes.length ? '<ul class="fb-list fb-improve">' + c.notes.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + '</div>' : '');
}
async function negStart(){
  var offer = parseMoney($('ngOffer').value), tgt = parseMoney($('ngTarget').value);
  if(!offer){ $('ngOffer').focus(); toast('Enter the base offer you\'re negotiating, e.g. $85,000.'); return; }
  var ceilMult = 1.04 + Math.random() * 0.1, step = offer >= 20000 ? 500 : 50, ceiling = Math.max(offer + step, Math.ceil(offer * ceilMult / step) * step);   // always above the written offer
  S.neg = { phase: 'live', role: clean($('ngRole').value), company: clean($('ngCompany').value), offer: offer, target: tgt || null, ceiling: ceiling, current: offer, style: (S.neg && S.neg.style) || 'firm', history: [], turn: 0, run: (S.neg && S.neg.run || 0) + 1 };
  renderNegLive();
  await negTurn(null);
}
async function negTurn(line){
  var n = S.neg, run = n.run, btn = $('ngSendBtn'); busy(btn, true, '…');
  var local = line != null ? E.negotiationCheck(line, { target: n.target, offer: n.offer, current: n.current }) : null;
  if(line != null){ n.history.push({ who: 'candidate', text: line, coach: local ? { score: local.score, good: local.good, notes: local.notes } : null }); }
  var reply = null, withheld = false;
  if(userId() && n.ai !== false){
    var r = await aiTool('negotiate', { role: n.role, company: n.company, offer: String(n.offer), ceiling: String(n.ceiling), style: n.style, history: n.history.slice(-24).map(function(m){ return { who: m.who, text: String(m.text || '').slice(0, 1000) }; }) });
    if(r.ok) reply = r.data; else if(r.withheld) withheld = true; else { n.ai = false; n.aiNote = aiMsg(r, 'recruiter'); }   // one withheld line: the built-in recruiter covers just that line
  }
  if(!S.neg || S.neg.run !== run) return;
  if(n.phase === 'done'){ busy(btn, false); if(btn) btn.disabled = true; var th0 = $('ngThread'); if(th0) th0.innerHTML = n.history.map(ngMsgHTML).join(''); return; }   // the call ended while this line was out
  if(reply && !str(reply.reply, 600)){ reply = null; withheld = true; }   // the AI line was withheld (it misquoted you)
  if(!reply){ reply = E.localRecruiter(n, line); reply.src = 'local'; }
  if(typeof reply.offer_now === 'number' && reply.offer_now >= n.offer) n.current = Math.max(n.offer, Math.min(n.ceiling, Math.max(n.current, reply.offer_now)));
  if(line != null && reply.coach && reply.coach.note){ var last = n.history[n.history.length - 1]; last.coach = last.coach || {}; last.coach.ai = reply.coach.note; var cs = num(reply.coach.score, 1, 5); if(cs) last.coach.score = Math.round((cs + (last.coach.score || cs)) / 2); }
  var rmsg = { who: 'recruiter', text: reply.reply, tactic: reply.tactic };
  if(withheld) rmsg.withheld = true;
  var dq = reply.src === 'local' ? 0 : (num(reply.unverified_quotes, 0, 99) || 0); if(dq) rmsg.dropped = dq;
  n.history.push(rmsg);
  busy(btn, false);
  var th = $('ngThread'); if(!th) return;
  th.innerHTML = (n.aiNote ? note('warn', esc(n.aiNote) + ' A built-in recruiter is playing the part.') : '') + n.history.map(ngMsgHTML).join('');
  var nowEl = $('ngNow'); if(nowEl) nowEl.textContent = fmtMoney(n.current);
  if(reply.done) negEnd();
}
function negEnd(){
  var n = S.neg; if(!n) return;
  stopDictation();
  var lines = n.history.filter(function(m){ return m.who === 'candidate'; }), scores = lines.map(function(m){ return (m.coach && m.coach.score) || 3; });
  var room = n.ceiling - n.offer, got = n.current - n.offer, pctRoom = room > 0 ? Math.round(got / room * 100) : 0;
  var box = $('ngSummary'); n.phase = 'done';
  if(box) box.innerHTML = '<div class="tool-card"><h3>How the call went</h3><div class="hs-verdict ' + (pctRoom >= 70 ? 'good' : pctRoom >= 35 ? 'mid' : 'bad') + '"><div class="hv-k">Final offer</div><div class="hv-dec">' + fmtMoney(n.current) + '</div><div class="hv-head">You captured ' + pctRoom + '% of the room. The hidden budget ceiling in this run was ' + fmtMoney(n.ceiling) + ' (randomized for practice, not market data).</div></div>' +
    (lines.length ? '<p class="tc-sub">Average coaching score: ' + (Math.round((E.avg(scores) || 0) * 10) / 10) + '/5 across ' + lines.length + ' line' + (lines.length === 1 ? '' : 's') + '.</p>' : '') + '<div class="is-actions"><button class="btn" data-act="ng-new">New call</button></div></div>';
  var ib = $('ngInputBox'); if(ib) ib.querySelectorAll('textarea,button[data-act="ng-send"],#ngMic').forEach(function(x){ x.disabled = true; });
}

/* ================================================================== GAME PLAN */
function renderBrief(){
  var sec = $('briefSection'); if(!sec) return;
  var t = target();
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    sec.innerHTML = head('Game plan', 'One page for the day itself: the stories to lead with, your opener, the points to land, your measured weak spots and the questions you\'ll ask. Built instantly from your own material - or have the AI tighten it into a car-park cheat sheet.') +
      '<div class="tool-card"><div class="ip-row"><div><span class="ip-label">Role</span><input class="ip-field" id="briefRole" maxlength="200" placeholder="e.g. Associate Product Manager"></div><div><span class="ip-label">Company (optional)</span><input class="ip-field" id="briefCompany" maxlength="200" placeholder="e.g. Fernway Labs"></div></div>' +
      '<div class="is-actions"><button class="btn" data-act="brief-gen" id="briefGenBtn">Build my plan</button><button class="ai-btn" data-act="brief-ai" id="briefAiBtn">AI cheat sheet</button></div></div><div id="briefResult"></div><div id="briefAi"></div>';
    $('briefRole').value = t.role; $('briefCompany').value = t.company;
  }
}
function briefMaterial(){
  var st = stories(), p = E.progress(sessions()), tm = readObj(K.TMAYS), asks = readArr(K.ASK).filter(isObj), t = target();
  tm = { script: typeof tm.script === 'string' ? tm.script : '', len: num(tm.len, 0, 600), takes: arr(tm.takes) };   // stored values are never trusted
  var jd = t.jd ? E.parseJD(t.jd) : null;
  var weak = p.count ? (p.ranked || []).slice(0, 2).map(function(k){ return E.DIM_LABEL[k] + ' (' + p.dims[k].recent + '/' + E.dimMax(k, p.ruleBased) + '): ' + E.fixFor(k, p.dir); }) : [];
  return { st: st, p: p, tm: tm, asks: asks, jd: jd, weak: weak, d: dossierFor(($('briefCompany') || {}).value || t.company) };
}
function briefGen(){
  var role = clean($('briefRole').value) || 'this role', company = clean($('briefCompany').value), m = briefMaterial(), prof = profile();
  var skills = String(prof.skills || '').split(',').map(clean).filter(Boolean);
  var cov = m.jd ? E.jdCoverage(m.jd, m.st) : E.coverage(m.st);
  var lead = m.st.slice().sort(function(a, b){ return E.storyComps(b).length - E.storyComps(a).length; }).slice(0, 3);
  var checklist = ['Confirm the time, format (video / in person) and who you\'re meeting', 'Test camera, mic and the link 10 minutes early', 'Resume, notepad and water within reach', 'Re-read the job description and your own application', 'Silence notifications; quiet, tidy background'];
  $('briefResult').innerHTML = '<div class="tool-card" id="briefCard"><h3>' + esc(role) + (company ? ' &middot; ' + esc(company) : '') + '</h3>' +
    '<div class="brief-block"><div class="bl">Open with</div><p>' + (m.tm.script ? esc(m.tm.script.slice(0, 400)) + (m.tm.script.length > 400 ? '…' : '') : 'No "tell me about yourself" script yet - <a href="#" data-go="tmays">write it</a>.') + '</p></div>' +
    '<div class="brief-block"><div class="bl">Stories to lead with</div><ul>' + (lead.length ? lead.map(function(s){ return '<li><b>' + esc(s.title || 'Story') + '</b> - ' + esc(E.storyComps(s).slice(0, 3).map(E.compLabel).join(', ') || 'general') + (s.r ? '. Lands on: ' + esc(s.r) : '') + '</li>'; }).join('') : '<li>No stories yet - forge 3 in Story Forge.</li>') + '</ul>' + (cov.gaps.length ? '<p class="tc-sub">No story yet for: ' + cov.gaps.map(E.compLabel).map(esc).join(', ') + '.</p>' : '') + '</div>' +
    (m.jd && m.jd.themes.length ? '<div class="brief-block"><div class="bl">What this job is about</div><p>' + m.jd.themes.map(esc).join(' · ') + '</p></div>' : '') +
    '<div class="brief-block"><div class="bl">Talking points from your background</div><ul>' + (skills.length ? skills.slice(0, 4).map(function(s){ return '<li>' + esc(s) + '</li>'; }).join('') : '<li>Add your skills in your profile so this can pull real talking points.</li>') + '</ul></div>' +
    (m.weak.length ? '<div class="brief-block"><div class="bl">Your measured weak spots</div><ul>' + m.weak.map(function(w){ return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div>' : '') +
    (function(){ var good = m.asks.filter(function(a){ return typeof a.text === 'string' && E.askCheck(a.text).ok; }).sort(function(x, y){ return E.askCheck(y.text).strong - E.askCheck(x.text).strong; }), weak = m.asks.length - good.length;
      return (good.length || weak) ? '<div class="brief-block"><div class="bl">Questions to ask them</div>' + (good.length ? '<ul>' + good.slice(0, 3).map(function(a){ return '<li>' + esc(a.text) + '</li>'; }).join('') + '</ul>' : '') + (weak ? '<p class="tc-sub">' + weak + ' of your saved questions need work first - <a href="#" data-go="ask">fix them</a>.</p>' : '') + '</div>' : ''; })() +
    '<div class="brief-block"><div class="bl">Before you join</div><ul>' + checklist.map(function(c){ return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>' +
    (prof.northstar ? '<div class="brief-block"><div class="bl">Your throughline</div><p>Tie answers back to: ' + esc(prof.northstar) + '.</p></div>' : '') +
    '<div class="is-actions"><button class="btn ghost" data-act="brief-copy" id="briefCopyBtn">Copy plan</button><button class="btn ghost" data-act="brief-print">Print</button></div></div>';
}
function briefAi(){
  var role = clean($('briefRole').value) || target().role, company = clean($('briefCompany').value), m = briefMaterial(), btn = $('briefAiBtn'), box = $('briefAi');
  if(!role){ $('briefRole').focus(); toast('Name the role first.'); return; }
  busy(btn, true, 'Writing…');
  var bin = { role: role, company: company, date: target().date, themes: m.jd ? m.jd.themes.join(', ') : '', stories: m.st.slice(0, 6).map(storyLine).join('\n').slice(0, 2500), story_titles: m.st.slice(0, 25).map(function(s){ return str(s.title, 120); }).filter(Boolean), tmays: str(m.tm.script, 1500), research: m.d ? str(m.d.findings, 2500) : '', asks: m.asks.slice(0, 5).map(function(a){ return a.text; }).join('\n'), weak: m.weak.join('\n') };
  aiTool('brief', bin).then(function(r){
    busy(btn, false);
    if(!r.ok){ box.innerHTML = note('warn', esc(aiMsg(r, 'game plan')) + ' Your built-in plan above uses the same material.'); return; }
    var d = r.data;
    // Figures in what you'd SAY must be yours: the one-liner and points to land are checked against your own material.
    var said = [d.one_liner].concat(arr(d.must_land), arr(d.watch_outs), arr(d.in_the_room), arr(d.questions_to_ask).map(claimText)).join(' ');
    var bh = E.honestyCheck(E.corpusOf(bin, m.st.map(storyLine)), said), bflag = uniq(bh.flagged.concat(arr(d.unsupported_numbers)));
    box.innerHTML = '<div class="tool-card"><h3>Cheat sheet ' + aiBadge('ai') + '</h3>' + dropNote(d) + (d.one_liner ? '<p class="tm-hook">' + esc(d.one_liner) + '</p>' : '') + honestyBanner(bflag) +
      [['Lead with', arr(d.lead_stories).map(function(s){ return esc(s.title) + (s.use_for ? ' - for ' + esc(s.use_for) : '') + (s.known ? '' : ' <span class="cov-none">(not a story in your bank)</span>'); })], ['Land no matter what', arr(d.must_land).map(esc)], ['Watch out for', arr(d.watch_outs).map(esc)], ['Ask them', arr(d.questions_to_ask).map(esc)], ['Tonight', arr(d.night_before).map(esc)], ['In the room', arr(d.in_the_room).map(esc)]]
        .filter(function(x){ return x[1].length; }).map(function(x){ return '<div class="brief-block"><div class="bl">' + x[0] + '</div><ul>' + x[1].map(function(i){ return '<li>' + i + '</li>'; }).join('') + '</ul></div>'; }).join('') + '</div>';
  });
}

/* ==================================================================== DEBRIEF */
function renderDebrief(){
  var sec = $('debriefSection'); if(!sec) return;
  var t = target();
  if(!sec.dataset.built){
    sec.dataset.built = '1';
    sec.innerHTML = head('Debrief & thank-you', 'Just had a real one? Log the questions they asked while they\'re fresh and get an honest read on what landed, what to shore up, and a thank-you note that references what actually happened. Real questions you were asked feed back into your Hot Seat practice.') +
      '<div class="tool-card"><div class="ip-row"><div><span class="ip-label">Role</span><input class="ip-field" id="dbRole" maxlength="200" placeholder="e.g. Associate PM"></div><div><span class="ip-label">Company (optional)</span><input class="ip-field" id="dbCompany" maxlength="200" placeholder="e.g. Fernway Labs"></div></div>' +
      '<div class="ip-row"><div><span class="ip-label">Stage</span><select class="ip-field" id="dbStage">' + ['Recruiter screen', 'Hiring manager', 'Technical', 'Panel', 'Final round', 'Other'].map(function(s){ return '<option>' + s + '</option>'; }).join('') + '</select></div><div><span class="ip-label">Interviewer name (optional)</span><input class="ip-field" id="dbWho" maxlength="80"></div><div style="flex:0 0 170px;"><span class="ip-label">Date</span><input class="ip-field" type="date" id="dbDate"></div></div>' +
      '<span class="ip-label">Questions they asked (one per line)</span><textarea class="ip-field" id="dbQs" maxlength="2000" style="min-height:80px;" placeholder="Tell me about yourself\nWhy did you leave...\n..."></textarea>' +
      '<span class="ip-label" style="margin-top:10px;display:block;">How did it go?</span><textarea class="ip-field body" id="dbNotes" maxlength="4000" placeholder="What felt strong, what felt shaky, anything they said..."></textarea>' +
      '<div class="is-actions"><button class="ai-btn" data-act="db-run" id="dbBtn">Debrief me</button></div></div><div id="dbResult"></div><div id="dbLog"></div>';
    $('dbRole').value = t.role; $('dbCompany').value = t.company; try{ $('dbDate').value = new Date().toISOString().slice(0, 10); }catch(e){}
  }
  renderDebriefLog();
}
function renderDebriefLog(){
  var box = $('dbLog'), logs = readArr(K.DEBRIEF); if(!box) return;
  if(!logs.length){ box.innerHTML = ''; return; }
  var allQs = uniq([].concat.apply([], logs.map(function(l){ return Array.isArray(l.questions) ? l.questions : []; }))).slice(0, 30);
  box.innerHTML = '<div class="tool-card"><h3>Your real interviews</h3>' + logs.slice(0, 10).map(function(l){ return '<div class="is-sess"><span class="is-dec mid">' + esc(str(l.stage, 40) || 'Interview') + '</span><span class="is-sess-t">' + esc((l.role || '') + (l.company ? ' · ' + l.company : '')) + '</span><span class="is-sess-m">' + esc(l.date || String(l.at || '').slice(0, 10)) + ' · ' + (Array.isArray(l.questions) ? l.questions.length : 0) + ' questions</span><button class="btn ghost is-xs" data-act="db-del" data-id="' + esc(l.id) + '">Delete</button></div>'; }).join('') +
    (allQs.length ? '<div class="fb-sub">Questions you\'ve really been asked (' + allQs.length + ')</div><ul class="fb-list">' + allQs.slice(0, 12).map(function(q){ return '<li>' + esc(q) + '</li>'; }).join('') + '</ul><div class="is-actions"><button class="btn" data-act="db-hot">Practice these in the Hot Seat</button></div>' : '') + '</div>';
}
function debriefRun(){
  var role = clean($('dbRole').value), notes = ($('dbNotes').value || '').trim(), qs = ($('dbQs').value || '').split(/\n+/).map(clean).filter(function(q){ return q.length >= 4; }).slice(0, 25);
  if(!role){ $('dbRole').focus(); toast('Name the role first.'); return; }
  if(!notes && !qs.length){ $('dbNotes').focus(); toast('Jot down how it went (or the questions they asked) first.'); return; }
  var entry = { id: E.uid('db'), at: new Date().toISOString(), role: role, company: clean($('dbCompany').value), stage: $('dbStage').value, interviewer: clean($('dbWho').value).slice(0, 80), date: $('dbDate').value, questions: qs, notes: notes.slice(0, 3000) };
  syncPut('interview_debrief', K.DEBRIEF, entry); renderDebriefLog();
  var btn = $('dbBtn'), box = $('dbResult'); busy(btn, true, 'Debriefing…');
  aiTool('debrief', { role: role, company: entry.company, stage: entry.stage, interviewer: entry.interviewer, notes: notes || 'No notes - only the questions.', questions: qs.join('\n') }).then(function(r){
    busy(btn, false);
    if(!r.ok){
      var tyName = entry.interviewer || 'there';
      var ty = 'Hi ' + tyName + ',\n\nThank you for taking the time to talk with me about the ' + role + ' role' + (entry.company ? ' at ' + entry.company : '') + '. [One specific thing you discussed that you enjoyed.] Our conversation made me even more excited about [something real about the role or team].\n\nLooking forward to hearing about next steps.\n\n[Your name]';
      box.innerHTML = note('warn', esc(aiMsg(r, 'debrief')) + ' Your interview is logged. A built-in thank-you to start from:') + '<div class="tool-card"><p class="fb-better" style="white-space:pre-wrap;">' + esc(ty) + '</p><button class="btn ghost is-xs" data-act="copy-prev">Copy</button></div>';
      return;
    }
    var d = r.data, dsrc = [notes, qs.join('\n'), role, entry.company, entry.stage, entry.interviewer].join(' \n ');
    var flagged = E.honestyCheck(dsrc, d.thank_you || '').flagged;   // the note's own figures, whole - never a substring match
    box.innerHTML = '<div class="tool-card"><h3>Debrief ' + aiBadge('ai') + '</h3>' + dropNote(d) + '<p class="fb-head">' + esc(d.read) + '</p>' +
      (arr(d.went_well).length ? '<div class="fb-sub">What likely landed</div><ul class="fb-list fb-good">' + d.went_well.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (arr(d.shore_up).length ? '<div class="fb-sub">Shore up before the next round</div><ul class="fb-list fb-improve">' + d.shore_up.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (arr(d.answer_fixes).length ? '<div class="fb-sub">Answers to fix</div>' + d.answer_fixes.map(function(f){ var ff = E.honestyCheck(dsrc, f.better || '').flagged; return '<div class="ds-item"><b>' + esc(f.question) + '</b><div class="ds-say">' + esc(f.better) + '</div>' + (ff.length ? '<div class="fb-fine">Not in your notes: ' + ff.map(esc).join(', ') + ' - only use figures you really have.</div>' : '') + '</div>'; }).join('') : '') +
      (d.thank_you ? '<div class="fb-sub">Thank-you note</div><p class="fb-better" style="white-space:pre-wrap;">' + esc(d.thank_you) + '</p>' + honestyBanner(flagged) + '<button class="btn ghost is-xs" data-act="copy-prev">Copy</button>' : '') +
      (d.follow_up ? '<p class="tc-sub"><b>Follow up:</b> ' + esc(d.follow_up) + '</p>' : '') + '</div>';
  });
}

/* =================================================================== PROGRESS */
function renderProgress(){
  var sec = $('progressSection'); if(!sec) return;
  var ss = sessions(), p = E.progress(ss);
  if(!p.count){ sec.innerHTML = head('Progress & weak spots', 'Every judged session is tracked here: your verdicts over time, each dimension\'s trend, your delivery, and the habits that keep coming back.') + '<div class="empty-state"><div class="glyph">&#8599;</div>No judged sessions yet.<div class="sub">Your first Hot Seat session sets the baseline.</div><button class="btn" data-go="hot">Take the Hot Seat</button></div>'; return; }
  var tr = p.trend, w = 560, hgt = 130, n = tr.length;
  var pts = tr.map(function(t, i){ return [n === 1 ? w / 2 : 20 + i * (w - 40) / (n - 1), hgt - 14 - (t.overall / 100) * (hgt - 28)]; });
  var svg = '<svg viewBox="0 0 ' + w + ' ' + hgt + '" class="pg-chart" role="img" aria-label="Verdict score per session"><line x1="0" x2="' + w + '" y1="' + (hgt - 14 - 0.6 * (hgt - 28)) + '" y2="' + (hgt - 14 - 0.6 * (hgt - 28)) + '" class="pg-grid"/><polyline points="' + pts.map(function(x){ return x.join(','); }).join(' ') + '" class="pg-line"/>' + pts.map(function(x, i){ return '<circle cx="' + x[0] + '" cy="' + x[1] + '" r="4" class="pg-dot ' + decisionClass(tr[i].decision) + '"><title>' + esc(String(tr[i].at).slice(0, 10) + ': ' + tr[i].overall + '/100') + '</title></circle>'; }).join('') + '</svg>';
  var voiceSess = ss.filter(function(s){ return s.delivery; }).slice(0, 8).reverse();
  sec.innerHTML = head('Progress & weak spots', 'Measured from ' + p.count + ' judged session' + (p.count === 1 ? '' : 's') + ' over ' + p.days + ' day' + (p.days === 1 ? '' : 's') + '. The dashed line is "lean hire" territory.') +
    '<div class="tool-card"><h3>Verdict score per session</h3>' + svg + '<p class="tc-sub">Recent average ' + p.recentAvg + '/100' + (p.count > 1 ? ' · ' + (p.delta >= 0 ? 'up ' : 'down ') + Math.abs(p.delta) + ' since your first sessions' : '') + '.</p></div>' +
    '<div class="hs-grid"><div class="tool-card"><h3>By dimension</h3>' + Object.keys(p.dims).map(function(k){ var d = p.dims[k]; return '<div class="sc-row"><span>' + esc(E.DIM_LABEL[k]) + '</span><span class="cat-cover-bar"><i style="width:' + Math.round(d.recent / 5 * 100) + '%;background:' + scoreColor(d.recent * 2) + ';"></i></span><b>' + d.recent + '</b><i class="sc-ev">' + (d.n > 1 ? (d.delta >= 0 ? '+' : '') + d.delta + ' since first' : '') + '</i></div>'; }).join('') + '</div>' +
    '<div class="tool-card"><h3>What keeps coming back</h3>' + (p.recurring.length ? '<ul class="fb-list fb-improve">' + p.recurring.map(function(r){ return '<li>' + esc(r.text) + ' <i class="sc-ev">(' + r.count + ' session' + (r.count === 1 ? '' : 's') + ')</i></li>'; }).join('') + '</ul>' : '<p class="tc-sub">No recurring problems - nice.</p>') +
    (voiceSess.length ? '<h3 class="mt">Delivery over time</h3>' + voiceSess.map(function(s){ var d = s.delivery; return '<div class="sc-row"><span>' + esc(String(s.at).slice(5, 10)) + '</span><i class="sc-ev">' + esc((d.wpm ? Math.round(d.wpm) + ' wpm · ' : '') + d.fillersPerMin + ' fillers/min · ' + d.overTime + ' over time') + '</i></div>'; }).join('') : '') + '</div></div>' +
    '<div class="tool-card"><h3>Train your weakest area</h3><div id="prDrills"></div><div class="is-actions"><button class="ai-btn" data-act="pr-drills" id="prDrillBtn">Build me an AI training plan</button></div></div>' +
    '<div class="tool-card"><h3>All sessions</h3>' + ss.slice(0, 20).map(sessionRow).join('') + '</div>';
  renderDrillPlan(E.localDrills(p));
}
function renderDrillPlan(d){
  var box = $('prDrills'); if(!box || !d) return;
  box.innerHTML = '<p class="fb-head"><b>' + esc(d.focus) + '</b> ' + aiBadge(d.source === 'local' ? 'local' : 'ai') + '</p>' + (d.source === 'local' ? '' : dropNote(d)) + '<p class="tc-sub">' + esc(d.why) + '</p>' + (d.drills || []).map(function(x){ var tk = DRILL_TOOL[x.tool] || 'hot'; return '<div class="fix-row"><span><b>' + esc(x.title) + '</b>' + (x.reps ? ' <i class="sc-ev">' + esc(x.reps) + '</i>' : '') + '<br>' + esc(x.how) + '</span><button class="btn ghost is-xs" data-go="' + tk + '">' + esc(TOOL_NAME[tk]) + ' &rarr;</button></div>'; }).join('') + (d.mantra ? '<p class="tm-hook">' + esc(d.mantra) + '</p>' : '');
}
function progressDrills(){
  var summary = E.practiceSummary(sessions()), btn = $('prDrillBtn');
  if(!summary){ toast('Do a judged session first.'); return; }
  busy(btn, true, 'Planning…');
  aiTool('drills', { summary: summary }).then(function(r){ busy(btn, false); if(r.ok){ var d = r.data; d.source = 'ai'; renderDrillPlan(d); } else { var bx = $('prDrills'); if(bx) bx.insertAdjacentHTML('afterbegin', note('warn', esc(aiMsg(r, 'coach')) + ' Here\'s the built-in plan for your weakest area.')); } });
}

/* =========================================================== cross-tool jumps */
function practiceInHot(qs, label, force){
  var oh = S.hot;
  // An interview with answers in it is never thrown away without asking.
  if(!force && inProgress() && hasWork(oh)){
    if(S.tool === 'hot') pauseHot();
    S.hotView = null; S.hotPending = { qs: qs, label: label }; show('hot'); return;
  }
  S.hotView = null; S.hotPending = null;
  // A new run: anything still pending for an interview in progress (a plan, a verdict) can't land on this one.
  if(oh && oh.phase === 'live'){ oh.askSeq = (oh.askSeq || 0) + 1; stopTimer(); stopListening(true); V.stopSpeaking(); }
  S.hot = { phase: 'setup', cfg: (oh && oh.cfg) || hotCfgDefaults(), run: ((oh && oh.run) || 0) + 1, customLabel: label,
    custom: arr(qs).slice(0, 10).map(function(q){ return isObj(q) ? Object.assign({}, q, { q: str(q.q, 600) }) : str(q, 600); }).filter(function(q){ return isObj(q) ? q.q : q; }) };
  releaseMic();
  show('hot');
}
/* Dictation into a box stops for good - nothing listens after the line is sent, the
   call or the Gauntlet ends, or the tool is reset - and the mic is released. */
function stopDictation(){
  S.dictStopping = null;   // a Stop still finishing must not write into the box after this
  var d = S.dict; if(!d) return;
  S.dict = null;
  try{ if(d.stt) d.stt.abort(); }catch(e){}
  try{ if(d.meter) d.meter.stop(); }catch(e){}
  ['xrMic', 'gtMic', 'ngMic'].forEach(function(id){ var b = $(id); if(b) b.innerHTML = '&#127908; Speak it'; });
  releaseMic();
}
function dictate(btnId, taId){
  var btn = $(btnId), ta = $(taId); if(!btn || !ta) return;
  if(S.dict){ var d = S.dict, snap = ta.value; S.dict = null; S.dictStopping = d; btn.innerHTML = '&#127908; Speak it'; var fr = d.meter ? d.meter.stop() : null; releaseMic(); if(d.stt) d.stt.stop().then(function(res){
      // Sent, cleared, edited or ended since Stop: the final words go nowhere.
      if(S.dictStopping !== d) return; S.dictStopping = null; if(!ta.isConnected || ta.value !== snap) return;
      var txt = clean(res && res.text); if(txt){ ta.value = (d.base ? d.base + ' ' : '') + txt; var fa = fr ? E.analyzeFrames(fr, { startT: 0 }) : null; if(taId === 'xrA'){ S.xray = S.xray || {}; S.xray.voice = { seconds: fa && fa.lastSpeech ? Math.max(1, fa.lastSpeech - (fa.latency || 0)) : (now() - d.at) / 1000 }; xrayLocal(); } } }); return; }
  btn.innerHTML = '&#9632; Stop';
  var req = { at: now(), base: clean(ta.value) }; S.dict = req;
  V.openMic().then(function(stream){
    if(S.dict !== req){ releaseMic(); return; }      // stopped (or restarted) while the mic was opening
    req.meter = V.meter(stream);
    req.stt = V.listen({ onUpdate: function(t){ if(S.dict === req) ta.value = (req.base ? req.base + ' ' : '') + t; }, onError: function(er){ if(S.dict === req){ toast(sttErrorText(er)); stopDictation(); } } });
  }, function(){ if(S.dict !== req) return; S.dict = null; btn.innerHTML = '&#127908; Speak it'; toast('Microphone blocked - allow mic access, or type.'); releaseMic(); });
}

/* ================================================================ EVENTS */
var RENDER = { overview: renderOverview, hot: renderHot, drill: renderDrill, bank: renderBank, predict: renderPredict, forge: renderForge, grill: renderGrill, dossier: renderDossier, ask: renderAsk, xray: renderXray, gauntlet: renderGauntlet, tmays: renderTmays, neg: renderNeg, brief: renderBrief, debrief: renderDebrief, progress: renderProgress };
function onClick(ev){
  var go = ev.target.closest && ev.target.closest('[data-go]');
  if(go){ ev.preventDefault(); show(go.getAttribute('data-go')); try{ $(TOOL[S.tool].sec).scrollIntoView({ block: 'start', behavior: 'smooth' }); }catch(e){} return; }
  var t = ev.target.closest && ev.target.closest('[data-act]'); if(!t || t.disabled) return;
  var act = t.getAttribute('data-act'), v = t.getAttribute('data-v');
  switch(act){
    case 'tg-edit': { var f = $('tgForm'); if(f) f.classList.toggle('hidden'); break; }
    case 'tg-save': saveTargetFrom('tg'); var tf = $('tgForm'); if(tf) tf.classList.add('hidden'); toast('Target saved - every tool now aims at it.'); ['predictSection', 'dossierSection', 'briefSection', 'debriefSection'].forEach(function(id){ var s = $(id); if(s){ s.dataset.built = ''; s.innerHTML = ''; } }); if(S.hot && S.hot.phase === 'setup'){ S.hot.cfg.role = target().role; S.hot.cfg.company = target().company; } show(S.tool); break;
    case 'hot-opt': { var k = t.getAttribute('data-k'), c = S.hot.cfg; readHotSetup(); c[k] = k === 'count' ? +v : v; if(k === 'difficulty' && v === 'fair') c.interrupt = false; if(k === 'difficulty' && v === 'brutal') c.interrupt = true; savePrefs({ persona: c.persona, difficulty: c.difficulty, focus: c.focus, count: c.count, mode: c.mode, feedback: c.feedback, interrupt: c.interrupt }); renderHotSetup(); break; }
    case 'hot-miccheck': startMicTest(); break;
    case 'hot-clear-custom': S.hot.custom = null; S.hot.customLabel = ''; renderHotSetup(); break;
    case 'hot-start': startHot(); break;
    case 'hot-submit': submitTyped(); break;
    case 'hot-done': case 'hot-mic': {
      var hh = S.hot; if(!hh || hh.phase !== 'live' || hh.answerMode !== 'voice' || hh.finishing || hh.ending) break;
      if(hh.ans && hh.ans.opening) break;                                   // mic still opening - nothing to submit yet
      if(hh.ans && hh.ans.forQ === hh.current && (hh.ans.stt || hh.ans.meter)) finishAnswer('done');      // listening -> submit
      else if(hh.current && !hh.current.answered){ hh.askSeq++; V.stopSpeaking(); startAnswer(); }   // still being asked, or paused -> listen now
      break; }
    case 'hot-repeat': repeatQuestion(); break;
    case 'hot-type': if(S.hot && S.hot.phase === 'live' && !S.hot.finishing){ S.hot.askSeq++; V.stopSpeaking(); switchToTyped(); } break;
    case 'hot-voice': switchToVoice(); break;
    case 'hot-skip': skipQuestion(); break;
    case 'hot-end': endHot(); break;
    case 'hot-restart': case 'hot-new': {
      // An interview with answers (or one being given) is never thrown away without asking.
      if(act === 'hot-restart' && S.hot && S.hot.phase === 'live' && !S.hot.ending && hasWork(S.hot)){ pauseHot(); S.hotView = null; S.hotPending = { restart: true }; renderHot(); break; }
      var oh = S.hot; if(oh) oh.askSeq = (oh.askSeq || 0) + 1; stopTimer(); stopListening(true); V.stopSpeaking(); S.hot = { phase: 'setup', cfg: (oh && oh.cfg) || hotCfgDefaults(), run: ((oh && oh.run) || 0) + 1 }; releaseMic(); renderHot(); break; }
    case 'hot-again': {
      // "Run it again" re-runs the session you're looking at - same interviewer, harshness, focus and role.
      var prevH = S.hot || {}, viewed = prevH.viewing || prevH.session, cfg = Object.assign({}, prevH.cfg || hotCfgDefaults());
      if(viewed){
        cfg.role = viewed.role || cfg.role; cfg.company = viewed.company || '';
        if(E.PERSONAS[viewed.persona]) cfg.persona = viewed.persona; if(E.DIFFS[viewed.difficulty]) cfg.difficulty = viewed.difficulty; if(E.FOCI[viewed.focus]) cfg.focus = viewed.focus;
        cfg.feedback = viewed.feedback === 'end' ? 'end' : 'each';
        var mains = arr(viewed.turns).filter(function(x){ return !x.follow; }).length;
        if(mains) cfg.count = [3, 5, 7].reduce(function(best, n){ return Math.abs(n - mains) < Math.abs(best - mains) ? n : best; }, 5);
        if(viewed.mode === 'text') cfg.mode = 'text'; else if(V.support().stt && V.support().mic) cfg.mode = 'voice';
      }
      S.hot = { phase: 'setup', cfg: cfg, run: (prevH.run || 0) + 1, custom: prevH.custom || null, customLabel: prevH.customLabel || '' }; renderHotSetup(); startHot(); break; }
    case 'sess-open': { var s = sessions().filter(function(x){ return x.id === t.getAttribute('data-id'); })[0]; if(!s) break;
      // An interview in progress stays as it is: the past session opens over it, with a way back.
      if(inProgress()){ if(S.tool === 'hot') pauseHot(); S.hotPending = null; S.hotView = s; show('hot'); break; }
      S.hot = { phase: 'results', cfg: (S.hot && S.hot.cfg) || hotCfgDefaults(), run: ((S.hot && S.hot.run) || 0) + 1, session: s }; show('hot'); break; }
    case 'hot-back': { S.hotView = null; S.hotPending = null; if(inProgress()){ renderHotLive(); if(S.hot.phase === 'live') resumeHot(); } else renderHot(); break; }
    case 'hot-practice-anyway': {
      var pp = S.hotPending; S.hotPending = null; if(!pp) break;
      if(pp.restart){ var rh = S.hot; if(rh){ rh.askSeq = (rh.askSeq || 0) + 1; } stopTimer(); stopListening(true); V.stopSpeaking(); S.hot = { phase: 'setup', cfg: (rh && rh.cfg) || hotCfgDefaults(), run: ((rh && rh.run) || 0) + 1 }; releaseMic(); renderHot(); break; }
      practiceInHot(pp.qs, pp.label, true); break;
    }
    case 'to-xray': case 'to-gauntlet': { var sess = (inProgress() && S.hotView) || (S.hot && (S.hot.session || S.hot.viewing)), tn = sess && sess.turns[+t.getAttribute('data-i')]; if(!tn) break; if(act === 'to-xray'){ show('xray'); $('xrQ').value = tn.q; $('xrA').value = tn.a; xrayLocal(); } else { S.gauntlet = { phase: 'setup', q: tn.q, original: tn.a, difficulty: 'brutal', run: (S.gauntlet && S.gauntlet.run) || 0 }; show('gauntlet'); } break; }
    case 'drill-cat': S.drill.cat = v; renderDrill(); break;
    case 'drill-start': { V.stopSpeaking(); var pool = S.drill.cat === 'all' ? E.BANK : E.BANK.filter(function(q){ return q.cat === S.drill.cat; }); S.drill.pool = E.shuffle(pool, E.rng(Date.now())); S.drill.idx = 0; if(!S.drill.pool.length) break; $('drillArea').classList.remove('hidden'); $('drillRead').innerHTML = ''; drillShow(); break; }
    case 'drill-next': drillListenStop(); S.drill.idx++; drillShow(); break;
    case 'drill-stop': drillListenStop(); drillAbort(); V.stopSpeaking(); drillStopTimer(); $('drillArea').classList.add('hidden'); if($('drillTimer')) $('drillTimer').classList.add('hidden'); var dc = $('drillCap'); if(dc) dc.classList.add('hidden'); break;
    case 'bank-cat': bankCat = v; renderBank(); break;
    case 'bank-rub': { var p = t.getAttribute('data-rub').split('|'), card = t.closest('.q-card'); card.setAttribute('data-' + p[1], p[2]); var row = t.parentNode; row.querySelectorAll('.rubric-dot').forEach(function(x, i){ x.classList.toggle('on', i + 1 <= +p[2]); x.setAttribute('aria-pressed', String(i + 1 <= +p[2])); }); break; }
    case 'bank-save': {
      var qid = t.getAttribute('data-save-ans'), card2 = t.closest('.q-card'), q = E.BANK_BY_ID[qid], ta = card2.querySelector('[data-ans="' + qid + '"]'), text = ta ? ta.value.trim() : '', prev = answerFor(qid) || {};
      var score = { structure: parseInt(card2.getAttribute('data-structure'), 10) || (prev.score && prev.score.structure) || 0, specificity: parseInt(card2.getAttribute('data-specificity'), 10) || (prev.score && prev.score.specificity) || 0, clarity: parseInt(card2.getAttribute('data-clarity'), 10) || (prev.score && prev.score.clarity) || 0 };
      var sel = card2.querySelector('[data-star-for="' + qid + '"]'), item = { id: qid, category: q ? q.cat : '', question: q ? q.q : '', answer: text.slice(0, 6000), score: score, star_id: sel ? sel.value : (prev.star_id || '') };
      if(!text && !score.structure && !score.specificity && !score.clarity && !item.star_id) break;
      syncPut('interview_answer', K.ANS, item); renderBankList(); refreshCounts(); break; }
    case 'bank-xray': { var q2 = E.BANK_BY_ID[t.getAttribute('data-ai-fb')], ta2 = t.closest('.q-card').querySelector('textarea[data-ans]'); show('xray'); $('xrQ').value = q2 ? q2.q : ''; $('xrA').value = ta2 ? ta2.value : ''; xrayLocal(); break; }
    case 'bank-hot': { var q3 = E.BANK_BY_ID[v]; if(q3) practiceInHot([{ q: q3.q, comp: q3.comp[0] }], 'one bank question'); break; }
    case 'pred-run': predictRun(); break;
    case 'pq-xray': { var pq = (S.predicted || [])[+t.getAttribute('data-i')]; if(pq){ show('xray'); $('xrQ').value = pq.q; } break; }
    case 'pq-hot': { var pq2 = (S.predicted || [])[+t.getAttribute('data-i')]; if(pq2) practiceInHot([{ q: pq2.q, comp: pq2.competency, source: 'jd', evidence: pq2.jd_quote }], 'a predicted question'); break; }
    case 'pq-hot-all': practiceInHot((S.predicted || []).map(function(q){ return { q: q.q, comp: q.competency, source: 'jd', evidence: q.jd_quote }; }), 'your predicted questions'); break;
    case 'forge-for': { show('forge'); var fq = $('forgeQ'), bq = E.BANK.filter(function(q){ return q.comp.indexOf(v) >= 0 && q.cat === 'behavioral'; })[0]; if(fq && bq) fq.value = bq.q; var fn = $('forgeNotes'); if(fn) fn.focus(); break; }
    case 'forge-run': forgeRun(false); break;
    case 'forge-manual': forgeRun(true); break;
    case 'forge-save': forgeSave(); break;
    case 'forge-copy-spoken': copyText((S.forgeDraft && S.forgeDraft.spoken) || '', t); break;
    case 'story-del': syncRemove('star_story', K.STAR, t.getAttribute('data-id')); renderForgeMatrix(); renderForgeList(); refreshCounts(); break;
    case 'story-copy': { var sc = stories().filter(function(s){ return s.id === t.getAttribute('data-id'); })[0]; if(sc) copyText([sc.s, sc.t, sc.a, sc.r].filter(Boolean).join(' '), t); break; }
    case 'story-gauntlet': { var sg = stories().filter(function(s){ return s.id === t.getAttribute('data-id'); })[0]; if(!sg) break; S.gauntlet = { phase: 'setup', storyId: sg.id, q: '', original: [sg.s, sg.t, sg.a, sg.r].filter(Boolean).join(' '), difficulty: 'brutal', run: (S.gauntlet && S.gauntlet.run) || 0 }; show('gauntlet'); break; }
    case 'grill-run': grillRun(); break;
    case 'grill-hot': { var gq = (S.grillQs || []).map(function(q){ return { q: q.q, comp: 'integrity', source: q.trigger_source === 'jd' ? 'jd' : 'resume', evidence: q.trigger }; }); if(!gq.length){ var R2 = resumeModel(); gq = E.resumeProbes(R2, {}).map(function(p){ return { q: p.q, comp: p.comp, source: 'resume', evidence: p.evidence }; }); } if(!gq.length) gq = [{ q: 'What\'s your greatest weakness?' }, { q: 'Why are you leaving your current role?' }, { q: 'Why should we hire you over other candidates?' }]; practiceInHot(gq, 'your resume\'s tough questions'); break; }
    case 'grill-one': { var g1 = (S.grillQs || [])[+t.getAttribute('data-i')]; if(g1) practiceInHot([{ q: g1.q, comp: 'integrity', source: g1.trigger_source === 'jd' ? 'jd' : 'resume', evidence: g1.trigger }], 'one resume question'); break; }
    case 'dos-run': dossierRun(); break;
    case 'dos-copy': { var dd = dossierFor(($('dosCompany') || {}).value); if(dd && dd.position) copyText(dd.position.why_us, t); break; }
    case 'ask-add': { var ai = $('askInput'); if(askAdd(ai.value)) ai.value = ''; var al = $('askLive'); if(al) al.innerHTML = ''; break; }
    case 'ask-add-text': if(askAdd(v)) toast('Saved to your questions to ask.'); break;
    case 'ask-del': syncRemove('interview_ask', K.ASK, t.getAttribute('data-ask-del')); renderAskList(); break;
    case 'ask-gen': askGen(); break;
    case 'xr-run': xrayRun(); break;
    case 'xr-mic': dictate('xrMic', 'xrA'); break;
    case 'xr-use': { stopDictation(); var rw = $('xrRewrite'); if(rw){ $('xrA').value = rw.value; xrayLocal(); toast('Rewrite moved into your answer - X-Ray it again to check.'); } break; }
    case 'xr-copy': { var rw2 = $('xrRewrite'); if(rw2) copyText(rw2.value, t); break; }
    case 'gt-diff': S.gauntlet = S.gauntlet || { phase: 'setup' }; S.gauntlet.difficulty = v; if(S.gauntlet.phase === 'setup' || !S.gauntlet.phase){ var keepQ = $('gtQ') ? $('gtQ').value : '', keepO = $('gtOriginal') ? $('gtOriginal').value : '', keepS = $('gtStory') ? $('gtStory').value : ''; S.gauntlet.q = keepQ; S.gauntlet.original = keepO; S.gauntlet.storyId = keepS; renderGauntlet(); } break;
    case 'gt-start': gauntletStart(); break;
    case 'gt-submit': { var ga = $('gtAnswer'), gv = ga ? ga.value.trim() : ''; if(!gv){ if(ga) ga.focus(); break; } if(S.gauntlet && S.gauntlet.phase === 'live' && !S.gauntlet.pending && !S.gauntlet.endRequested && !(t.disabled)){ stopDictation(); ga.value = ''; gauntletNext(gv.slice(0, 3000)); } break; }
    case 'gt-mic': dictate('gtMic', 'gtAnswer'); break;
    case 'gt-end': gauntletEnd(); break;
    case 'gt-reset': stopDictation(); S.gauntlet = { phase: 'setup', difficulty: (S.gauntlet && S.gauntlet.difficulty) || 'brutal', run: ((S.gauntlet && S.gauntlet.run) || 0) + 1 }; renderGauntlet(); break;
    case 'tm-len': { var tmo = readObj(K.TMAYS); tmo.len = +v; lsSet(K.TMAYS, tmo); var lenRow = $('tmLen'); if(lenRow) lenRow.querySelectorAll('.chip').forEach(function(c){ c.classList.toggle('active', c.getAttribute('data-v') === v); c.setAttribute('aria-pressed', String(c.getAttribute('data-v') === v)); }); break; }
    case 'tm-draft': tmaysDraft(); break;
    case 'tm-use': case 'tm-use-ai': { var txt = act === 'tm-use' ? v : (S.tmDraft && S.tmDraft.script) || ''; var scr = $('tmScript'); if(scr && txt){ scr.value = txt; var tm2 = readObj(K.TMAYS); tm2.script = txt; lsSet(K.TMAYS, tm2); tmaysScriptCheck(); toast('Saved as your script.'); } break; }
    case 'tm-rehearse': tmaysRehearse(); break;
    case 'tm-copy': copyText(($('tmScript') || {}).value, t); break;
    case 'ng-style': S.neg = S.neg || { phase: 'setup' }; S.neg.style = v; t.parentNode.querySelectorAll('.chip').forEach(function(c){ c.classList.toggle('active', c === t); c.setAttribute('aria-pressed', String(c === t)); }); break;
    case 'ng-start': negStart(); break;
    case 'ng-send': { var ni = $('ngInput'), nv = ni ? ni.value.trim() : ''; if(!nv){ if(ni) ni.focus(); break; } stopDictation(); ni.value = ''; negTurn(nv.slice(0, 1000)); break; }
    case 'ng-mic': dictate('ngMic', 'ngInput'); break;
    case 'ng-end': negEnd(); break;
    case 'ng-new': stopDictation(); S.neg = { phase: 'setup', style: S.neg && S.neg.style, run: ((S.neg && S.neg.run) || 0) + 1 }; renderNeg(); break;
    case 'brief-gen': briefGen(); break;
    case 'brief-ai': briefAi(); break;
    case 'brief-copy': { var bc = $('briefCard'); if(bc) copyText(bc.innerText || bc.textContent, t); break; }
    case 'brief-print': try{ root.print(); }catch(e){} break;
    case 'db-run': debriefRun(); break;
    case 'db-del': syncRemove('interview_debrief', K.DEBRIEF, t.getAttribute('data-id')); renderDebriefLog(); break;
    case 'db-hot': { var allQ = uniq([].concat.apply([], readArr(K.DEBRIEF).map(function(l){ return Array.isArray(l.questions) ? l.questions : []; }))); if(allQ.length) practiceInHot(allQ.slice(0, 7).map(function(q){ return { q: q, source: 'real' }; }), 'questions from your real interviews'); break; }
    case 'copy-prev': { var pv = t.previousElementSibling; while(pv && !/fb-better/.test(pv.className)) pv = pv.previousElementSibling; if(pv) copyText(pv.textContent, t); break; }
    case 'pr-drills': progressDrills(); break;
  }
}
function onKey(ev){
  if((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.getAttribute && ev.target.getAttribute('role') === 'button' && !/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)){ ev.preventDefault(); ev.target.click(); }
  if(ev.key === 'Enter' && ev.target && ev.target.id === 'askInput'){ ev.preventDefault(); var b = $('askAddBtn'); if(b) b.click(); }
  if(ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && ev.target && ev.target.id === 'mockAnswer'){ ev.preventDefault(); submitTyped(); }
}
var inputT = null;
function onInput(ev){
  var id = ev.target && ev.target.id;
  if(id === 'xrA' || id === 'xrQ'){ clearTimeout(inputT); inputT = setTimeout(xrayLocal, 250); }
  else if(id === 'predJD'){ clearTimeout(inputT); inputT = setTimeout(predLocal, 300); }
  else if(id === 'tmScript'){ var tm = readObj(K.TMAYS); tm.script = ev.target.value.slice(0, 3000); lsSet(K.TMAYS, tm); clearTimeout(inputT); inputT = setTimeout(tmaysScriptCheck, 250); }
  else if(id === 'askInput'){ var al = $('askLive'), ck = E.askCheck(ev.target.value); if(al) al.innerHTML = clean(ev.target.value).length > 8 ? (ck.flags.length ? ck.flags.map(function(f){ return '<span>&#9888; ' + esc(f.text) + '</span>'; }).join('') : ck.strong ? '<span class="ok">&#10003; Sharp question</span>' : '') : ''; }
  else if(/^fg[STAR]$|^fgTitle$/.test(id || '')){ clearTimeout(inputT); inputT = setTimeout(forgeHonesty, 200); }
  else if(id === 'xrRewrite'){ var h = E.honestyCheck(S.xray && S.xray.source, ev.target.value), hb = $('xrHonesty'), ub = $('xrUseBtn'); if(hb) hb.innerHTML = honestyBanner(h.flagged); if(ub) ub.disabled = !h.ok; }
  else if(ev.target && ev.target.hasAttribute && ev.target.hasAttribute('data-neg')){ var n = readObj(K.NEGNOTES); n[ev.target.getAttribute('data-neg')] = ev.target.value.slice(0, 600); lsSet(K.NEGNOTES, n); }
}
function onChange(ev){
  var id = ev.target && ev.target.id;
  if(id === 'dosCompany'){ var d = dossierFor(ev.target.value); var r = $('dosResult'); if(r) r.innerHTML = ''; if(d) renderDossierResult(d); }
  if(id === 'dosNotes'){ var co = ($('dosCompany') || {}).value; if(clean(co)) saveDossier(co, { notes: ev.target.value.slice(0, 4000) }); }
  if(id === 'gtStory'){ var st = stories().filter(function(s){ return s.id === ev.target.value; })[0]; if(st){ var o = $('gtOriginal'); if(o && !clean(o.value)) o.value = [st.s, st.t, st.a, st.r].filter(Boolean).join(' '); } }
  if(id === 'drillListen' && !ev.target.checked){
    var dr = S.drill; if(dr && dr.stt){ try{ dr.stt.abort(); }catch(e){} dr.stt = null; }
    var dc = $('drillCap'); if(dc){ dc.classList.add('hidden'); dc.textContent = ''; }
  }
  if(ev.target && ev.target.hasAttribute && ev.target.hasAttribute('data-star-for')){ /* saved with the answer */ }
}

/* ================================================================== HYDRATE */
function hydrate(){
  var u = userId(); if(!u || typeof root.apiListWorkshopItems !== 'function') return;
  quiet(Promise.resolve(root.apiListWorkshopItems(u)).then(function(items){
    if(!Array.isArray(items)) return;
    var by = nmap({ interview_answer: [], interview_ask: [], interview_session: [], interview_debrief: [] });
    items.forEach(function(it){ if(it && typeof it.kind === 'string' && by[it.kind] && it.data && typeof it.data === 'object') by[it.kind].push(Object.assign({}, it.data, { id: it.id })); });
    function merge(key, server){ if(!server.length) return; var local = readArr(key), ids = {}; local.forEach(function(x){ ids[x.id] = 1; }); var add = server.filter(function(x){ return !ids[x.id]; }); if(add.length) lsSet(key, local.concat(add)); }
    merge(K.ANS, by.interview_answer); merge(K.ASK, by.interview_ask); merge(K.DEBRIEF, by.interview_debrief);
    if(by.interview_session.length){ var ls = sessions(), ids2 = {}; ls.forEach(function(x){ ids2[x.id] = 1; }); var all = ls.concat(by.interview_session.map(sanitizeSession).filter(function(x){ return x && !ids2[x.id]; })); all.sort(function(a, b){ return String(b.at).localeCompare(String(a.at)); }); lsSet(K.SESS, all.slice(0, 40)); }
    refreshCounts(); if(S.tool === 'overview') renderOverview(); if(S.tool === 'progress') renderProgress();
  }));
}

/* ==================================================================== MOUNT */
function mount(){
  var studio = D.querySelector('.studio'); if(!studio) return;
  if(!S.bound){
    studio.addEventListener('click', onClick);
    studio.addEventListener('keydown', onKey);
    studio.addEventListener('input', onInput);
    studio.addEventListener('change', onChange);
    var tb = $('ipTarget'); if(tb){ tb.addEventListener('click', onClick); }
    TOOLS.forEach(function(t){ var b = $(t.btn); if(b) b.addEventListener('click', function(e){ e.stopPropagation(); show(t.key); }); });
    // Leaving with an interview in progress asks first (the browser's own prompt); anything else just closes.
    root.addEventListener('beforeunload', function(e){
      if(inProgress() && hasWork(S.hot)){ try{ e.preventDefault(); e.returnValue = ''; }catch(x){} return ''; }
      try{ V.stopSpeaking(); V.closeMic(); Object.keys(S.audio).forEach(function(k){ URL.revokeObjectURL(S.audio[k]); }); }catch(x){}
    });
    // A hidden page is a page you left: the Hot Seat pauses (what you said is kept, nothing is sent or read
    // out), and dictation, rehearsal and drill listening stop - the mic is released.
    D.addEventListener('visibilitychange', function(){
      if(D.hidden){ stopToolAudio(S.tool); return; }
      if(S.tool === 'hot' && S.hot && S.hot.phase === 'live' && !S.hotView && !S.hotPending) resumeHot();
    });
    root.addEventListener('pagehide', function(){ stopToolAudio(S.tool); try{ V.closeMic(); }catch(x){} });
    V.onVoices(function(){ if(S.tool === 'hot' && S.hot && S.hot.phase === 'setup') renderHotSetup(); });
    S.bound = true;
  }
  renderTargetBar();
  show('overview');
  hydrate();
}

root.INTERVIEW_STUDIO = { mount: mount, show: show, _S: S, _K: K, practiceInHot: practiceInHot, _AI_TIMEOUT: AI_TIMEOUT };
})(typeof window !== 'undefined' ? window : globalThis);
