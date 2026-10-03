/* ============================================================================
   RESUME STUDIO - Kaidostar's resume intelligence layer (lives in the Workshop).

   Part 1 is the ENGINE: pure, deterministic functions with no DOM access, so
   every tool is unit-testable in Node (loaded into a vm sandbox next to the real
   state.js, exactly like the project's other *_fe tests). Part 2 is the UI that
   mounts into the Workshop's Resume section.

   Honest by construction. Nothing here invents a fact: every number in any
   suggestion must trace back to the person's own words or to answers they typed,
   and is checked with state.js findFabricatedNumbers before it can be applied.
   ========================================================================== */
(function(root){
'use strict';

function dep(n){ return (root && typeof root[n] === 'function') ? root[n] : null; }

/* ------------------------------------------------------------------ utils */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
function clean(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function words(s){ var c = clean(s); return c ? c.split(' ') : []; }
function cap(s){ s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function lowerFirst(s){ s = String(s || ''); return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function pct(n, d){ return d ? Math.round(n / d * 100) : 0; }
function uid(p){ return (p || 'v') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
function stripEnd(s){ return clean(s).replace(/[.;:,\s]+$/, ''); }
function escRe(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function uniq(a){ var seen = {}; return a.filter(function(x){ var k = String(x).toLowerCase(); if(seen[k]) return false; seen[k] = 1; return true; }); }
function tok(s){
  var f = dep('tokenizeForMatching') || dep('tokenize');
  var out = f ? f(String(s || '')) : (String(s || '').toLowerCase().match(/[a-z][a-z+#.\-]{1,}/g) || []);
  return Array.isArray(out) ? out : Array.from(out || []);
}
function tmatch(a, b){ var f = dep('termsMatch'); return f ? f(a, b) : a === b; }
function meaningful(s){ var f = dep('meaningfulTokens'); if(f) return Array.from(f(String(s || '')) || []); return tok(s).filter(function(t){ return t.length > 3; }); }
// The honesty net: numbers in `out` that never appear (with the same unit) in `orig`.
function fab(orig, out){
  var f = dep('findFabricatedNumbers');
  if(f) return f(String(orig || ''), String(out || ''));
  var o = (String(orig).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(function(n){ return n.replace(/,/g, ''); });
  return (String(out).match(/\d[\d,]*(?:\.\d+)?/g) || []).filter(function(n){ return o.indexOf(n.replace(/,/g, '')) < 0; });
}

/* ------------------------------------------------- strict honesty layer
   Every quantitative claim in a line is parsed into a comparable form: plain figures,
   money (with its currency), percentages, multipliers ("5x", "tripled", "five times
   faster", "tenfold"), floors ("50+", "over 100"), fractions ("a third", "½"), ratings
   ("4.8/5"), ranks ("#1"), vague magnitudes ("hundreds") - written in any numeral system.
   A claim belongs to the person only if their own words (or the answers they just typed)
   make the same claim, or an exactly equivalent one ("doubled" = "2x" = "up 100%",
   "$12,000" = "$12k", "four" = "4"). The shared findFabricatedNumbers net runs on top
   as a cross-check, so the studio is never looser than the rest of the app. */
var NUMERAL_MAP = (function(){
  var m = {}, i;
  function run(start, n, first){ for(var k = 0; k < n; k++) m[String.fromCharCode(start + k)] = String(first + k); }
  run(0x2080, 10, 0);                                                  // subscripts
  '⁰¹²³⁴⁵⁶⁷⁸⁹'.split('').forEach(function(c, k){ m[c] = String(k); }); // superscripts
  run(0x2460, 20, 1); run(0x2474, 20, 1); run(0x2488, 20, 1);          // circled, parenthesized, full-stop 1-20
  run(0x2776, 10, 1); run(0x2780, 10, 1); run(0x278A, 10, 1);          // dingbat circled 1-10
  run(0x24EB, 10, 11); run(0x24F5, 10, 1); m['⓪'] = '0'; m['⓿'] = '0'; // negative/double circled
  run(0x3251, 15, 21); run(0x32B1, 15, 36);                            // circled 21-50
  var roman = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 50, 100, 500, 1000];
  for(i = 0; i < 16; i++){ m[String.fromCharCode(0x2160 + i)] = String(roman[i]); m[String.fromCharCode(0x2170 + i)] = String(roman[i]); }
  var frac = { '½': '0.5', '⅓': '0.33', '⅔': '0.67', '¼': '0.25', '¾': '0.75', '⅕': '0.2', '⅖': '0.4', '⅗': '0.6', '⅘': '0.8', '⅙': '0.17', '⅚': '0.83', '⅛': '0.125', '⅜': '0.375', '⅝': '0.625', '⅞': '0.875', '⅐': '0.14', '⅑': '0.11', '⅒': '0.1' };
  Object.keys(frac).forEach(function(k){ m[k] = frac[k]; });
  m['％'] = '%'; m['＄'] = '$'; m['，'] = ','; m['．'] = '.'; m['×'] = 'x'; m['﹪'] = '%'; m['＃'] = '#';
  return m;
})();
var MAP_RE = new RegExp('[' + Object.keys(NUMERAL_MAP).join('').replace(/[\]\\^-]/g, '\\$&') + ']', 'g');
// First code point of every Unicode decimal-digit run, so any script's digits read as 0-9.
var ND_ZEROS = [0x0660, 0x06F0, 0x07C0, 0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66, 0x0DE6, 0x0E50, 0x0ED0, 0x0F20, 0x1040, 0x1090,
  0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0xFF10, 0x104A0,
  0x10D30, 0x11066, 0x110F0, 0x11136, 0x111D0, 0x112F0, 0x11450, 0x114D0, 0x11650, 0x116C0, 0x11730, 0x118E0, 0x11950, 0x11C50, 0x11D50, 0x11DA0, 0x16A60,
  0x16AC0, 0x16B50, 0x1D7CE, 0x1D7D8, 0x1D7E2, 0x1D7EC, 0x1D7F6, 0x1E140, 0x1E2F0, 0x1E950, 0x1FBF0,
  0x10D40, 0x116D0, 0x116DA, 0x11BF0, 0x11F50, 0x16130, 0x16D70, 0x1CCF0, 0x1E4F0, 0x1E5F1];   // Unicode 15-16: Garay, Pao, Eastern Pwo Karen, Sunuwar, Kawi, Gurung Khema, Kirat Rai, Outlined, Nag Mundari, Ol Onal
// Listed explicitly too, so digits newer than the browser's own Unicode tables still read as numbers.
var ND_LIST_RE = (function(){ try{ return new RegExp('[' + ND_ZEROS.map(function(z){ return '\\u{' + z.toString(16) + '}-\\u{' + (z + 9).toString(16) + '}'; }).join('') + ']', 'gu'); }catch(e){ return null; } })();
var ND_RE = (function(){ try{ return new RegExp('\\p{Nd}', 'gu'); }catch(e){ return null; } })();
var NOTHER_RE = (function(){ try{ return new RegExp('[\\p{No}\\p{Nl}]', 'gu'); }catch(e){ return null; } })();
function digitValue(cp){ for(var i = 0; i < ND_ZEROS.length; i++){ var z = ND_ZEROS[i]; if(cp >= z && cp < z + 10) return cp - z; } return -1; }
function normNumerals(s){
  var t = String(s == null ? '' : s).replace(MAP_RE, function(c){ var v = NUMERAL_MAP[c]; return (/\d/.test(v) && v.length > 1) ? ' ' + v + ' ' : v; });
  if(ND_LIST_RE) t = t.replace(ND_LIST_RE, function(c){ var v = digitValue(c.codePointAt(0)); return v >= 0 ? String(v) : c; });
  if(ND_RE) t = t.replace(ND_RE, function(c){ var cp = c.codePointAt(0); if(cp < 0x80) return c; var v = digitValue(cp); return v >= 0 ? String(v) : c; });
  return t.replace(/(?<![\dO])\d[\dO]*|(?<![\dO])O+(?=\d)/g, function(m){ return m.indexOf('O') >= 0 ? m.replace(/O/g, '0') : m; });   // a capital O typed for zero ("1OO") is still a number
}
var NUM_WORDS = { zero: 0, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80,
  ninety: 90, hundred: 100, thousand: 1000, million: 1000000, billion: 1000000000, dozen: 12 };
var ONES_W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
var MAG = { k: 1e3, thousand: 1e3, grand: 1e3, m: 1e6, mm: 1e6, mil: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9, lakh: 1e5, lakhs: 1e5, crore: 1e7, crores: 1e7 };
var CUR = { '$': 'usd', usd: 'usd', dollar: 'usd', dollars: 'usd', buck: 'usd', bucks: 'usd', '£': 'gbp', gbp: 'gbp', pound: 'gbp', pounds: 'gbp', quid: 'gbp', '€': 'eur', eur: 'eur', euro: 'eur', euros: 'eur',
  '₹': 'inr', inr: 'inr', rupee: 'inr', rupees: 'inr', rs: 'inr', 'rs.': 'inr', '¥': 'jpy', jpy: 'jpy', yen: 'jpy', '₩': 'krw', krw: 'krw', '₽': 'rub', rub: 'rub', rubles: 'rub', '₺': 'try', '₪': 'ils', '₦': 'ngn', '₱': 'php', '฿': 'thb', '₫': 'vnd',
  cad: 'cad', 'c$': 'cad', aud: 'aud', 'a$': 'aud', nzd: 'nzd', 'nz$': 'nzd', hkd: 'hkd', 'hk$': 'hkd', sgd: 'sgd', 's$': 'sgd', cny: 'cny', rmb: 'cny', yuan: 'cny', chf: 'chf', franc: 'chf', francs: 'chf',
  mxn: 'mxn', peso: 'mxn', pesos: 'mxn', brl: 'brl', 'r$': 'brl', reais: 'brl', zar: 'zar', rand: 'zar', sek: 'sek', nok: 'nok', dkk: 'dkk', pln: 'pln' };
var CUR_SYM = '(?:nz\\$|hk\\$|[cars]\\$|[$£€₹¥₩₽₺₪₦₱฿₫])';
var CUR_CODE_PRE = '(?:usd|cad|aud|nzd|eur|gbp|inr|jpy|cny|rmb|krw|sgd|hkd|chf|mxn|brl|zar|sek|nok|dkk|pln|rs\\.?)';
var CUR_WORD_POST = '(?:dollars?|bucks?|usd|cad|aud|nzd|hkd|sgd|euros?|eur|pounds?|quid|gbp|rupees?|inr|rs|yen|jpy|krw|rubles?|rub|yuan|rmb|cny|francs?|chf|pesos?|mxn|reais|brl|rand|zar|sek|nok|dkk|pln)';
// A vague magnitude is fair when the person gave a figure in its range ("300 customers" -> "hundreds of customers").
var VAGUE = { dozens: [24, 144], hundreds: [200, 2000], thousands: [2000, 2e6], millions: [2e6, 2e9], billions: [2e9, Infinity],
  'single-digit': [1, 10], 'double-digit': [10, 100], 'triple-digit': [100, 1000], 'five-figure': [1e4, 1e5], 'six-figure': [1e5, 1e6], 'seven-figure': [1e6, 1e7] };
var NUMW = 'zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen';
var ORDW = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
var NUMBERISH_RE = new RegExp('\\d|#|O\\d|\\b(?:' + NUMW + '|' + Object.keys(ORDW).join('|') + '|doubl|tripl|quadrupl|quintupl|sextupl|halv|twice|thrice|half|quarter|fourths|dozens|hundreds|thousands|millions|billions|countless|\\w+fold|magnitude|factor|decade|noon|midnight|midday|clock|covid|digits?|figures?|single-?handedly|record|award|top|best|highest|largest|biggest|fastest|honou?rs?|number|no\\.)', 'i');
// A figure starts at the start of its digits and groups its thousands properly - linear on any input (no
// backtracking through long runs like "1,2,3,..." or "111...").
var N_ = '(?<![\\d.,])(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
var WPHRASE = '(?:(?:' + NUMW + ')(?:[\\s-]+(?:and[\\s-]+)?(?:' + NUMW + ')){0,8})';   // bounded: no real number takes more than nine words
function numVal(n){ var v = parseFloat(String(n).replace(/,/g, '')); return isFinite(v) ? v : NaN; }
function canonNum(v){ return isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : 'nan'; }
// "twenty-five thousand" -> 25000, "two hundred and five" -> 205, "a dozen" -> 12
function phraseVal(p){
  var total = 0, cur = 0, any = false;
  String(p).toLowerCase().split(/[\s-]+/).forEach(function(w){
    if(w === 'and' || w === 'a') return;
    if(/^\d/.test(w)){ cur += numVal(w); any = true; return; }
    if(w === 'one'){ cur += 1; any = true; return; }
    var v = NUM_WORDS[w]; if(v == null) return; any = true;
    if(w === 'hundred') cur = (cur || 1) * 100;
    else if(w === 'dozen') cur = (cur || 1) * 12;
    else if(v >= 1000){ total += (cur || 1) * v; cur = 0; }
    else cur += v;
  });
  return any ? total + cur : NaN;
}
function wordVal(w){ w = String(w).toLowerCase(); return /^\d/.test(w) ? numVal(w) : ORDW[w] != null ? ORDW[w] : phraseVal(w); }
function stemKey(s){ return String(s).toLowerCase().replace(/[\s-]+/g, ' ').split(' ').map(function(w){ return w.length > 4 ? w.replace(/(ing|ers|er|ed|es|s)$/, '') : w; }).join(' '); }
var ND_OTHER_RE = (function(){ try{ return new RegExp('(?![0-9])\\p{Nd}', 'gu'); }catch(e){ return null; } })();
var ORD_ALT = Object.keys(ORDW).join('|');
// Nouns that make an ordinal a sequence ("2nd shift", "third year") rather than a standing ("2nd in the district").
var SEQ_AFTER = /^[\s-]+(?:shift|place|year|quarter|half|semester|term|round|floor|location|store|job|role|month|week|day|season|grade|period|cohort|hire|employee|edition|consecutive|straight|interview|tier|level)s?\b/;
// Time units in a comparable base - years and months as months, weeks and days as days, hours and minutes as
// minutes - so "3 years" = "36 months" and "2 weeks" = "14 days", but "2 days" is never "2 weeks".
var DUR_UNITS = { decade: ['mo', 120], year: ['mo', 12], yr: ['mo', 12], quarter: ['mo', 3], month: ['mo', 1], mo: ['mo', 1], week: ['d', 7], wk: ['d', 7], day: ['d', 1],
  hour: ['min', 60], hr: ['min', 60], minute: ['min', 1], min: ['min', 1], second: ['s', 1], sec: ['s', 1] };
var DUR_MODE = { over: '+', 'more than': '+', 'at least': '+', 'upwards of': '+', 'in excess of': '+', 'north of': '+', above: '+', beyond: '+',
  nearly: '~', almost: '~', about: '~', around: '~', roughly: '~', approximately: '~', approx: '~', 'approx.': '~', 'close to': '~', '~': '~',
  under: '-', 'less than': '-', 'fewer than': '-', below: '-', within: '-', 'no more than': '-' };
var DUR_QUAL = 'over|more than|at least|upwards of|in excess of|north of|above|beyond|nearly|almost|about|around|roughly|approximately|approx\\.?|close to|under|less than|fewer than|below|within|no more than';
function durUnit(u){ return DUR_UNITS[String(u).toLowerCase().replace(/s$/, '')] || null; }
// A 4-digit figure followed by a plural noun is a count ("2019 customers", "2019 new accounts"), unless the noun is about a year ("2023 targets").
var YEAR_NOUNS = /^\s+(?:targets?|goals?|budgets?|plans?|results?|projections?|forecasts?|seasons?|sales|earnings|numbers|figures|reviews?|campaigns?|events?|olympics|games|census|elections?|graduates?|cohorts?|class(?:es)?|holidays?|quotas?|audits?|reports?|filings?|returns?|taxes|rankings?|awards?|winners?|finals?|playoffs?|championships?|tournaments?|conferences?|summits?)\b/;
var COUNT_ADJ = /^\s+(?:(?:new|more|additional|total|extra|other|unique|active|different|separate|individual|returning|repeat|first-time|recurring|existing|incoming|potential|happy|satisfied|loyal|regular|daily|weekly|monthly|local|small|large|online|in-store|paying|qualified)\s+)+/;
function yearLike(after){ var a = String(after).replace(COUNT_ADJ, ' '); return !(/^\s+[a-z]+s\b/.test(a) && !YEAR_NOUNS.test(a)); }
var YR = '((?:19[5-9]|20\\d)\\d)(?![\\d]|[,.]\\d)';
var MONTH_ALT = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec';
var MONTHISH = MONTH_ALT + '|spring|summer|fall|autumn|winter';
// Test-score labels read as figures, not codes ("SAT 1450" is a score of 1450).
var SCORE_LABELS = /^(?:SAT|ACT|GPA|GRE|GMAT|LSAT|MCAT|DAT|TOEFL|IELTS|AP|IB|PSAT|HSK|JLPT|DELF|USMLE|NCLEX|CPA|FY)$/;
var CODE_PREFIX_STOP = /^(?:am|pm|a\.?m|p\.?m|top|over|under|mid|pre|post|non|anti|ultra|self|half|all|by|per|a|an|the|and|or|to|of|in|on|at|for|age|ages|aged|up|out|year|years|day|days|week|weeks|month|months|hour|hours|grade|level|tier|class|type|step|phase|stage|round|part|team|group|zone|no|number|ranked|rank|than|plus|x)$/i;
var WEIGHT_LB = { lb: 1, lbs: 1, pound: 1, pounds: 1, kg: 2.20462, kgs: 2.20462, kilo: 2.20462, kilos: 2.20462, kilogram: 2.20462, kilograms: 2.20462, oz: 0.0625, ounce: 0.0625, ounces: 0.0625,
  ton: 2000, tons: 2000, tonne: 2204.62, tonnes: 2204.62, gram: 0.00220462, grams: 0.00220462 };
function ordVal(w){ w = String(w).toLowerCase(); return /^\d/.test(w) ? numVal(w) : ORDW[w]; }
// Every quantitative claim in a piece of text: { kind, val, key, text, shown, index, end, word }.
// kinds: num | money | pct | bps | plus | mult | frac | ratio | rank | ord | qtr | date | time | year | dur | boast | vague | raw.
// `text` is lower-cased for comparison; `shown` keeps the person's own casing for display ("Q3", "$1.2M").
// o.source: the person's own words (there, "one" counts as 1 - in a candidate it's too often "one of the").
function numericClaims(text, o){
  o = o || {};
  var orig = normNumerals(text), t = orig.toLowerCase(), out = [];
  if(t.length > 60000){ t = t.slice(0, 60000); orig = orig.slice(0, 60000); }
  var sameLen = orig.length === t.length;
  if(!NUMBERISH_RE.test(t) && !(NOTHER_RE && NOTHER_RE.test(t)) && !(ND_OTHER_RE && ND_OTHER_RE.test(t))) return out;
  if(NOTHER_RE) NOTHER_RE.lastIndex = 0; if(ND_OTHER_RE) ND_OTHER_RE.lastIndex = 0;
  function add(kind, val, m, idx, word, key){
    var c = { kind: kind, val: val, key: key || (kind + ':' + canonNum(val)), text: clean(m), shown: clean(sameLen ? orig.slice(idx, idx + m.length) : m), index: idx, end: idx + m.length, word: !!word };
    out.push(c); return c;
  }
  function eat(re, fn){ t = t.replace(re, function(){ var a = arguments, m = a[0], idx = a[a.length - 2]; var keep = fn.apply(null, [m, idx].concat(Array.prototype.slice.call(a, 1, a.length - 2))); return keep === false ? m : m.replace(/\S/g, ' '); }); }   // consume, keeping positions
  function see(re, fn){ var r; re.lastIndex = 0; while((r = re.exec(t))){ fn.apply(null, [r[0], r.index].concat(r.slice(1))); if(!r[0]) re.lastIndex++; } }  // observe only
  function blank(a, b){ t = t.slice(0, a) + t.slice(a, b).replace(/\S/g, ' ') + t.slice(b); }
  function money(m, i, c, v){
    var code = CUR[String(c).toLowerCase()]; if(!code || !isFinite(v)) return;
    if(/^pounds?$/i.test(c) && !MONEY_BEFORE_RE.test(before(i, 32)) && !/^\s*(?:sterling|gbp)\b/.test(after(i, m))) return;   // "lifted 50 pounds" is a weight
    var floor = /^\s*\+/.test(t.slice(i + m.length, i + m.length + 3)) || /\b(?:over|more than|at least|upwards of|in excess of|north of|above|beyond)\s+$/.test(before(i, 24));   // "$3K+", "over $3,000"
    var mc = add('money', v, m, i, false, 'money' + (floor ? '+' : '') + ':' + code + ':' + canonNum(v)); mc.cur = code; mc.mode = floor ? '+' : '';
  }
  function after(i, m){ return t.slice(i + m.length, i + m.length + 40); }
  function before(i, n){ return t.slice(Math.max(0, i - (n || 40)), i); }
  var MAGS = '(?:\\s?(k|m|bn|b|mm|mil|thousand|million|billion|lakhs?|crores?)(?![a-z0-9]))?';
  var PCTW = '(\\s?%|\\s?percent\\b|\\s?per\\s?cent\\b)';
  // course and standard codes stay as written: "CS 101" = "CS101", "ISO 9001", "COVID-19", "K-12"
  if(sameLen){
    var codeRe = /\b([A-Z]{2,6})[  ]?(\d{2,5}[A-Z]?)\b|\b([A-Za-z]{1,6})[-–—](\d{1,5}[A-Za-z]?)\b/g, cm, spans = [];
    while((cm = codeRe.exec(orig))){
      var letters = cm[1] || cm[3], digits = cm[2] || cm[4];
      if(/^(?:19[5-9]|20\d)\d$/.test(digits) || (cm[1] && SCORE_LABELS.test(letters)) || (cm[3] && CODE_PREFIX_STOP.test(letters))) continue;
      if(cm[1] && /^\s+(?:[a-z]+s|hours?|hrs?|days?|weeks?|months?|years?|minutes?|mins?|percent|people|staff|per)\b/i.test(orig.slice(cm.index + cm[0].length, cm.index + cm[0].length + 24))) continue;   // "SQL 10 hours" is a count
      add('raw', null, t.slice(cm.index, cm.index + cm[0].length), cm.index, false, 'raw:' + (letters + digits).toLowerCase());
      spans.push([cm.index, cm.index + cm[0].length]);
    }
    spans.forEach(function(sp){ blank(sp[0], sp[1]); });
  }
  eat(/\bcovid(?:[\s-]?19)?\b/g, function(m, i){ add('raw', null, m, i, false, 'raw:covid19'); });   // "covid" = "COVID-19"
  // always open: "24/7" = "24 hours a day" = "around the clock"
  eat(/\b24\s*\/\s*7\b|\b24x7\b|\b(?:a)?round[\s-]the[\s-]clock\b|\b24\s*(?:hours?|hrs?)\s+a\s+day(?:,?\s*(?:7|seven)\s+days\s+a\s+week)?\b/g, function(m, i){ add('always', null, m, i, false, 'always:247'); });
  eat(/\b(noon|midday|midnight)\b/g, function(m, i, w){ add('time', null, m, i, true, w === 'midnight' ? 'time:12:00am' : 'time:12:00pm'); });
  // times of day are times, not counts: "6am" = "6:00 AM" = "at 6 every morning"; a range shares its AM/PM ("3–11 PM")
  eat(/\b(\d{1,2})(?::(\d{2}))?\s*(?:-|–|—|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s?(a\.?m\.?|p\.?m\.?)(?![a-z])/g, function(m, i, h1, m1, h2, m2, ap){
    if(+h1 > 12 || +h2 > 12) return false;
    add('time', null, h1 + (m1 ? ':' + m1 : ''), i, false, 'time:' + (+h1) + ':' + (m1 || '00'));
    var sep = m.search(/\s*(?:-|–|—|to|until|till)\s*\d/), off = sep + m.slice(sep).search(/\d/);
    add('time', null, m.slice(off), i + off, false, 'time:' + (+h2) + ':' + (m2 || '00') + ap.replace(/\./g, ''));
  });
  eat(/\b(\d{1,2})(?::(\d{2}))?\s?(a\.?m\.?|p\.?m\.?)(?![a-z])/g, function(m, i, h, mi, ap){ add('time', null, m, i, false, 'time:' + (+h) + ':' + (mi || '00') + ap.replace(/\./g, '')); });
  eat(/\b(\d{1,2}):(\d{2})\b/g, function(m, i, h, mi){ add('time', null, m, i, false, 'time:' + (+h) + ':' + mi); });
  eat(/\b(?:at|before|until|till)\s+(\d{1,2})(?=\s+(?:every|each|daily|nightly|sharp|o'?clock|in\s+the\s+(?:morning|evening|afternoon)|on\s+(?:weekdays|weekends|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays))\b)/g, function(m, i, h){
    if(+h < 1 || +h > 12) return false;
    var at = i + m.length - h.length; add('time', null, h, at, false, 'time:' + (+h) + ':00');
  });
  // observed: money, percent, basis points, floors (the figure inside is still read as a plain number too)
  see(new RegExp(CUR_SYM + '\\s?(' + N_ + ')' + MAGS, 'g'), function(m, i, n, u){ money(m, i, m.match(new RegExp('^' + CUR_SYM))[0], numVal(n) * (u ? MAG[u] : 1)); });
  see(new RegExp('\\b(' + CUR_CODE_PRE + ')\\s?(' + N_ + ')' + MAGS, 'g'), function(m, i, c, n, u){ money(m, i, c, numVal(n) * (u ? MAG[u] : 1)); });
  see(new RegExp('(' + N_ + ')' + MAGS + '\\s?(' + CUR_WORD_POST + ')\\b', 'g'), function(m, i, n, u, c){ money(m, i, c, numVal(n) * (u ? MAG[u] : 1)); });
  see(new RegExp('\\b(' + WPHRASE + ')\\s+(' + CUR_WORD_POST + ')\\b', 'g'), function(m, i, p, c){ money(m, i, c, phraseVal(p)); });
  see(new RegExp('(' + N_ + ')\\s?(?:%|percent\\b|per\\s?cent\\b|pct\\b|percentage points?\\b)', 'g'), function(m, i, n){ add('pct', numVal(n), m, i); });
  see(new RegExp('\\b(' + WPHRASE + ')[\\s-](?:percent|per\\s?cent)\\b', 'g'), function(m, i, p){ add('pct', phraseVal(p), m, i, true); });
  see(new RegExp('(' + N_ + ')\\s?(?:bps|basis points?)\\b', 'g'), function(m, i, n){ add('bps', numVal(n), m, i); });
  see(new RegExp('(' + N_ + ')(?:\\+|[\\s-]plus\\b)', 'g'), function(m, i, n){ add('plus', numVal(n), m, i); });
  see(new RegExp('\\b(?:over|more than|at least|upwards of|in excess of|north of|above|beyond)\\s+(?:a\\s+)?(' + N_ + '|' + WPHRASE + ')\\b', 'g'), function(m, i, n){ add('plus', wordVal(n), m, i, !/^\d/.test(n)); });
  // consumed
  eat(new RegExp('(?:#\\s?)?(' + N_ + ')\\s?(?:\\/|out of)\\s?(' + N_ + ')', 'g'), function(m, i, a, b){ add('ratio', null, m, i, false, 'ratio:' + canonNum(numVal(a)) + '/' + canonNum(numVal(b))); });
  // years as dates: "2018-2020", "2019-21", "in 2019", "Jan 2019", "(2021)", "class of 2024" - each year its own claim
  eat(new RegExp('\\b' + YR + '\\s*(?:-|–|—|to|through|until)\\s*(?:' + YR + '|present|now|current|today)\\b', 'g'), function(m, i, a, b){
    if(!yearLike(after(i, m))) return false;
    add('year', numVal(a), a, i, false, 'year:' + a);
    if(b){ var at = i + m.lastIndexOf(b); add('year', numVal(b), b, at, false, 'year:' + b); }
  });
  eat(new RegExp('\\b' + YR + '\\s*[-–—]\\s*(\\d{2})\\b(?![\\d,.])', 'g'), function(m, i, a, b){
    var full = Math.floor(numVal(a) / 100) * 100 + (+b); if(full <= numVal(a)) return false;
    add('year', numVal(a), a, i, false, 'year:' + a); add('year', full, b, i + m.length - b.length, false, 'year:' + full);
  });
  eat(new RegExp('\\b(?:in|since|from|during|by|until|till|through|thru|to|and|between|circa|of|fy|year|' + MONTHISH + ')\\.?,?\\s+' + YR, 'g'), function(m, i, y){
    if(!yearLike(after(i, m))) return false;
    add('year', numVal(y), y, i + m.length - y.length, false, 'year:' + y);
  });
  eat(new RegExp('\\(' + YR + '\\)', 'g'), function(m, i, y){ add('year', numVal(y), y, i + 1, false, 'year:' + y); });
  // calendar dates are dates, never standings: "May 1st", "1st of May", "the 15th of each month"
  eat(new RegExp('\\b(' + MONTH_ALT + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?![\\d,]\\d)(?!\\s*(?:%|percent|x\\b))', 'g'), function(m, i, mo, d){ if(+d < 1 || +d > 31) return false; add('date', null, m, i, false, 'date:' + mo.slice(0, 3) + ':' + (+d)); });
  eat(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(' + MONTH_ALT + ')\\b', 'g'), function(m, i, d, mo){ if(+d < 1 || +d > 31) return false; add('date', null, m, i, false, 'date:' + mo.slice(0, 3) + ':' + (+d)); });
  eat(/\b(\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|tenth|fifteenth|twentieth|last)\s+(?:day\s+)?of\s+(?:the|each|every|this|next|that|a)\s+(?:month|week|quarter|year|cycle|pay\s*period)\b/g, function(m, i, d){ add('date', null, m, i, false, 'date:dom:' + (d === 'last' ? 'last' : (ordVal(d) || (d === 'fifteenth' ? 15 : d === 'twentieth' ? 20 : d)))); });
  // quarters as periods: "Q3" = "third quarter" = "3rd-quarter"
  eat(/\bq([1-4])\b/g, function(m, i, n){ add('qtr', +n, m, i, false, 'qtr:' + n); });
  eat(/\b(first|second|third|fourth|1st|2nd|3rd|4th)[\s-]+quarter\b/g, function(m, i, w){ var v = ordVal(w); add('qtr', v, m, i, true, 'qtr:' + v); });
  // class levels aren't counts: "first-year students", "third-year law student"
  eat(/\b(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)[\s-]+year\s+(?:[a-z]+\s+){0,2}?(?:students?|undergrad\w*|college|university|seminars?|writing|composition|experience|programs?|cohorts?|teachers?|analysts?|associates?|residents?|nurses?|law|medical|med|phd|graduate|grad|engineering|class(?:es)?)\b/g, function(){});
  // school grades: "3rd grade" = "third-grade" = "grade 3"; "9th graders" = "grade 9 students"
  eat(new RegExp('\\b(' + ORD_ALT + '|\\d{1,2}(?:st|nd|rd|th))[\\s-]+grad(?:e|ers?)\\b', 'g'), function(m, i, w){ var v = ordVal(w); add('grade', v, m, i, !/^\d/.test(w), 'grade:' + v); });
  eat(/\bgrades?\s+(\d{1,2}|k)\b(?:\s*(?:-|–|—|to|through)\s*(\d{1,2})\b)?/g, function(m, i, a, b){ var va = a === 'k' ? 0 : +a; add('grade', va, m, i, false, 'grade:' + va); if(b) add('grade', +b, b, i + m.lastIndexOf(b), false, 'grade:' + (+b)); });
  // "two-time Employee of the Month" counts 2, as one claim
  eat(new RegExp('\\b(' + N_ + '|' + WPHRASE + ')-time\\b(?!r)', 'g'), function(m, i, n){ if(!o.source && n === 'one') return false; var v = wordVal(n); if(!isFinite(v)) return false; add('num', v, m, i, !/^\d/.test(n)); });
  // amount words that are exact: "half a dozen" = 6
  eat(/\bhalf\s+a\s+dozen\b/g, function(m, i){ add('num', 6, m, i, true); });
  eat(/\ba\s+dozen\s+and\s+a\s+half\b/g, function(m, i){ add('num', 18, m, i, true); });
  // "a year and a half" = "18 months", "two and a half weeks", "half a year"
  var durHalf = function(m, i, v, u, mode){ var du = durUnit(u); if(!du || !isFinite(v)) return false; mode = mode || ''; var c = add('dur', v * du[1], m, i, true, 'dur' + mode + ':' + du[0] + ':' + canonNum(v * du[1])); c.unit = du[0]; c.mode = mode; };
  eat(/\b(?:an?|one)\s+(year|month|week|day|hour)\s+and\s+a\s+half\b/g, function(m, i, u){ return durHalf(m, i, 1.5, u); });
  eat(new RegExp('\\b(' + N_ + '|' + WPHRASE + ')\\s+and\\s+a\\s+half\\s+(years?|months?|weeks?|days?|hours?)\\b', 'g'), function(m, i, n, u){ return durHalf(m, i, wordVal(n) + 0.5, u); });
  eat(/\bhalf\s+an?\s+(year|month|week|day|hour)\b/g, function(m, i, u){ return durHalf(m, i, 0.5, u); });
  eat(new RegExp('(?:\\b(' + DUR_QUAL + ')\\s+)?\\b(?:a|one)\\s+decade\\b', 'g'), function(m, i, q){ return durHalf(m, i, 1, 'decade', DUR_MODE[String(q || '').replace(/\s+/g, ' ')] || ''); });
  // weights in one base (pounds): "50 lbs" = "50 pounds", never "50 kg"
  eat(new RegExp('(?:\\b(' + DUR_QUAL + ')\\s+)?(' + N_ + '|' + WPHRASE + ')(\\s?\\+)?[\\s-]*(lbs?|pounds?|kgs?|kilos?|kilograms?|oz|ounces?|tons?|tonnes?|grams?)\\b', 'g'), function(m, i, q, n, plus, u){
    if(/^pound/.test(u) && (MONEY_BEFORE_RE.test(before(i, 32)) || /^\s*(?:sterling|gbp)\b/.test(after(i, m)))) return false;
    if(!o.source && n === 'one') return false;
    var v = wordVal(n), f = WEIGHT_LB[u]; if(!isFinite(v) || !f) return false;
    var mode = plus ? '+' : (DUR_MODE[String(q || '').replace(/\s+/g, ' ')] || ''), lb = Math.round(v * f * 100) / 100;
    var c = add('wt', lb, m, i, !/^\d/.test(n), 'wt' + mode + ':' + canonNum(lb)); c.unit = 'lb'; c.mode = mode;
  });
  // a range shares its unit: "from 20 to 10 minutes", "3-5 business days", "between 3 and 5 days", "20 minutes to 10"
  var DUR_UNIT_ALT = '(decades?|years?|yrs?|quarters?|months?|mos?|weeks?|wks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)';
  var durPart = function(n, u, idx, txt){ var du = durUnit(u), v = wordVal(n); if(!du || !isFinite(v)) return null; var c = add('dur', v * du[1], txt, idx, !/^\d/.test(n), 'dur:' + du[0] + ':' + canonNum(v * du[1])); c.unit = du[0]; c.mode = ''; return c; };
  eat(new RegExp('\\b(?:from\\s+|between\\s+)?(' + N_ + '|' + WPHRASE + ')\\s*(?:-|–|—|to|and)\\s*(' + N_ + '|' + WPHRASE + ')[\\s-]*(?:(?:business|working|work|calendar|school|full|consecutive|straight)\\s+)?' + DUR_UNIT_ALT + '\\b', 'g'), function(m, i, a, b, u){
    if(!durUnit(u) || !isFinite(wordVal(a)) || !isFinite(wordVal(b)) || (!o.source && (a === 'one' || b === 'one'))) return false;
    var ia = m.indexOf(a), ib = m.lastIndexOf(b);
    durPart(a, u, i + ia, a); durPart(b, u, i + ib, m.slice(ib));
  });
  eat(new RegExp('\\b(' + N_ + '|' + WPHRASE + ')[\\s-]*' + DUR_UNIT_ALT + '\\s*(?:-|–|—|to)\\s*(' + N_ + ')\\b(?![\\s-]*(?:decades?|years?|yrs?|quarters?|months?|mos?|weeks?|wks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|%|percent|x)\\b)(?!\\s+[a-z]+s\\b)', 'g'), function(m, i, a, u, b){
    if(!durUnit(u) || (!o.source && a === 'one')) return false;
    var ib = m.lastIndexOf(b); durPart(a, u, i, m.slice(0, m.indexOf(u) + u.length)); durPart(b, u, i + ib, b);
  });
  // durations: "3 years" = "36 months"; "over 3 years" / "3+ years" (at least), "about 4 years" (roughly), "within 2 weeks" (at most);
  // "3-5 business days" counts days; "3 quarters in a row" is nine months, "three quarters of the stock" is a fraction
  var FRAC_AMOUNT = /(?:\b(?:by|cut|cutting|reduced?|reducing|lowered?|lowering|decreased?|decreasing|increased?|increasing|grew|grow|growing|boosted?|boosting|raised?|raising|improved?|improving|slashed?|slashing|trimmed?|dropped|fell|rose|nearly|almost|about|more than|less than|than|roughly|around|at least|up to|saving|saved|eliminated|eliminating|recovered|only|over|under)\s+(?:a\s+|one\s+)?)$/;
  eat(new RegExp('(?:\\b(' + DUR_QUAL + ')\\s+|(~)\\s?)?(' + N_ + '|' + WPHRASE + ')(\\s?\\+|[\\s-]plus\\b)?[\\s-]*(?:(?:business|working|work|calendar|school|full|consecutive|straight)\\s+)?(decades?|years?|yrs?|quarters?|months?|mos?|weeks?|wks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)\\b', 'g'), function(m, i, q, tilde, n, plus, u){
    if(!o.source && n === 'one') return false;
    if(/^quarter/.test(u) && (FRAC_AMOUNT.test(before(i)) || /^\s+of\b/.test(after(i, m)))) return false;   // a fraction, not a period
    var du = durUnit(u), v = wordVal(n); if(!du || !isFinite(v)) return false;
    var mode = plus ? '+' : (DUR_MODE[String(q || tilde || '').replace(/\s+/g, ' ')] || '');
    var c = add('dur', v * du[1], m, i, !/^\d/.test(n), 'dur' + mode + ':' + du[0] + ':' + canonNum(v * du[1])); c.unit = du[0]; c.mode = mode;
  });
  // ranks and places: "#1" = "No. 1" = "number one" = "ranked first" = "came in 1st" = "first place"; "top 10" = "top-10"; "top 5%" = "top five percent"
  var TOPN = 'top[\\s-]*(\\d+)(?![\\d]|[.,]\\d)' + PCTW + '?|top[\\s-]+(two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|twenty-five|thirty|forty|fifty|hundred)\\b(?:[\\s-](percent|per\\s?cent)\\b)?';
  function topRank(m, i, n, tp, w, wp){ var v = n ? numVal(n) : wordVal(w); add('rank', v, m, i, !n, 'rank:top' + canonNum(v) + ((tp || wp) ? '%' : '')); }
  eat(new RegExp('\\b(?:ranked|ranking|placed|placing|finished|finishing|came|coming)\\s+(?:in\\s+)?(?:the\\s+)?(?:(' + ORD_ALT + '|\\d+(?:st|nd|rd|th))\\b(?:\\s+place\\b)?|' + TOPN + ')', 'g'), function(m, i, w, n, tp, ww, wp){
    if(w) add('rank', ordVal(w), m, i, !/^\d/.test(w)); else topRank(m, i, n, tp, ww, wp);
  });
  eat(new RegExp('\\b(?:won|winning|took|taking|earned|earning|named|voted|awarded|got|claimed|secured)\\s+(?:the\\s+)?(' + ORD_ALT + '|\\d+(?:st|nd|rd|th))[\\s-]+(?:place|prize|spot|position)\\b', 'g'), function(m, i, w){ add('rank', ordVal(w), m, i, !/^\d/.test(w)); });
  eat(new RegExp('\\b(' + ORD_ALT + '|\\d+(?:st|nd|rd|th))[\\s-]+place\\b', 'g'), function(m, i, w){ add('rank', ordVal(w), m, i, !/^\d/.test(w)); });
  eat(new RegExp('\\b(?:' + TOPN + ')', 'g'), function(m, i, n, tp, w, wp){ topRank(m, i, n, tp, w, wp); });
  eat(new RegExp('(?:#|\\bno\\.\\s?|\\bnumber\\s+)(' + N_ + '|one|two|three|four|five|six|seven|eight|nine|ten)\\b', 'g'), function(m, i, n){ add('rank', wordVal(n), m, i, !/^\d/.test(n)); });
  // a standing: "2nd in sales", "first among 40 stores", "3rd-highest sales", "2nd-ranked store"
  eat(new RegExp('\\b(' + ORD_ALT + '|\\d+(?:st|nd|rd|th))(?=[\\s-]+(?:highest|best|largest|biggest|busiest|most|fastest|strongest|top|ranked|rated)\\b|\\s+(?:in|among|across|out of|of)\\s+(?:(?:the|all|its|our|my|their|every|each)\\b|\\d|(?:' + NUMW + ')\\b|[a-z]+s\\b))', 'g'), function(m, i, w){ add('rank', ordVal(w), m, i, !/^\d/.test(w)); });
  // superlatives and sole-credit claims are claims too - they need the person's own words behind them
  eat(/\b(?:single-?handedly|first[- ]ever|record[- ](?:breaking|high|setting|sales|revenue|numbers|year|month|quarter|profits?|growth|time)|award[- ]winning|(?:top|best)[- ](?:perform\w*|sell\w*|produc\w*|rated|ranked|honou?rs?)|highest[- ](?:rated|ranked|grossing|selling|perform\w*)|(?:top|first) honou?rs?|best (?:in|of) (?:the )?(?:region|district|company|class|state|country|chain|network|area)|(?<=\bthe )(?:highest|best|top|largest|biggest|fastest)(?![- ]?\d|-))\b/g, function(m, i){ add('boast', null, m, i, true, 'boast:' + stemKey(m)); });
  // multipliers (verbs only: "double shifts" is not a doubling)
  [[/\b(?:doubl(?:ed|ing)|two-?fold)\b/g, 2], [/\b(?:tripl(?:ed|ing)|three-?fold)\b/g, 3], [/\b(?:quadrupl(?:ed|ing)|four-?fold)\b/g, 4], [/\bquintupl(?:ed|ing)\b/g, 5], [/\bsextupl(?:ed|ing)\b/g, 6], [/\b(?:halv(?:ed|ing)|in half|by half)\b/g, 0.5],
    [/\b(?:by\s+)?an?\s+order\s+of\s+magnitude\b/g, 10]].forEach(function(p){ eat(p[0], function(m, i){ add('mult', p[1], m, i, true); }); });
  eat(/\borders\s+of\s+magnitude\b/g, function(m, i){ add('vague', null, m, i, true, 'vague:orders of magnitude'); });
  eat(/\b(twice|thrice)\b(?=\s+(?:as|the|that|over|more|faster|higher|bigger|larger|better|what))/g, function(m, i, w){ add('mult', w === 'twice' ? 2 : 3, m, i, true); });
  eat(/\b(twice|thrice)\b/g, function(m, i, w){ add('num', w === 'twice' ? 2 : 3, m, i, true); });   // "twice a week" is a count: = "2 times" = "two occasions"
  eat(new RegExp('\\bby\\s+a\\s+factor\\s+of\\s+(' + N_ + '|' + WPHRASE + ')\\b', 'g'), function(m, i, n){ add('mult', wordVal(n), m, i, !/^\d/.test(n)); });
  eat(new RegExp('\\b(' + NUMW + ')-?fold\\b', 'g'), function(m, i, w){ add('mult', wordVal(w), m, i, true); });
  eat(new RegExp('(' + N_ + ')\\s?(?:x|-?\\s?fold)(?![a-z0-9])', 'g'), function(m, i, n){
    if(/x$/.test(m) && /^\s*(?:\/\s*|(?:a|an|per|each|every)\s+)?(?:day|week|month|year|night|shift|semester|quarter|daily|weekly|monthly|yearly|nightly|annually|hourly)\b/.test(after(i, m))){ add('num', numVal(n), m, i); return; }   // "3x weekly" = "3 times a week"
    add('mult', numVal(n), m, i);
  });
  eat(new RegExp('\\bx\\s?(' + N_ + ')(?![\\d.])', 'g'), function(m, i, n){ add('mult', numVal(n), m, i); });
  eat(new RegExp('\\b(' + N_ + '|' + WPHRASE + ')[\\s-]+times\\b(?=\\s+(?:faster|more|higher|better|larger|bigger|greater|quicker|longer|stronger|smaller|cheaper|as|the|over|what))', 'g'), function(m, i, n){ add('mult', wordVal(n), m, i, !/^\d/.test(n)); });
  // fractions - as amounts only: "second half of 2022", "half-day sessions" and "in a quarter" aren't 50% or 25%
  function fracCtx(i, m, isQuarter){
    var b = before(i), a = t.slice(i + m.length, i + m.length + 24);
    if(/^[\s-]*(?:day|time|hour|year|month|week|marathon|court|price|size|life|way|back|hearted|baked|mast|pipe|finals?|century|staff|shifts?|party|parties|person|world|wheel|rail|degree|base|string|tier|level|floor|generation|wave|round|cousin)\b/.test(a)) return false;
    if(/\b(?:first|second|third|fourth|1st|2nd|3rd|4th|latter|former|back|front|other|next|last|this|that|past|each|every|per|top|bottom)\s+$/.test(b)) return false;
    if(isQuarter) return FRAC_AMOUNT.test(b) || /^\s+(?:of|the)\b/.test(a);
    return true;
  }
  [[/\btwo[\s-]+thirds\b/g, 0.667], [/\bthree[\s-]+(?:quarters|fourths)\b/g, 0.75, 1], [/\b(?:a|one)[\s-]+half\b|\bhalf\b/g, 0.5], [/\b(?:a|one)[\s-]+quarter\b/g, 0.25, 1], [/\b(?:a|one)[\s-]+third\b/g, 0.333],
    [/\b(?:a|one)[\s-]+fifth\b/g, 0.2], [/\b(?:a|one)[\s-]+tenth\b/g, 0.1]].forEach(function(p){
    eat(p[0], function(m, i){
      if(fracCtx(i, m, !!p[2])){ add('frac', p[1], m, i, true); return; }
      if(p[2] && !/^\s+of\b/.test(after(i, m))){ var v = p[1] === 0.25 ? 3 : 9, c = add('dur', v, m, i, true, 'dur:mo:' + v); c.unit = 'mo'; c.mode = ''; return; }   // "in a quarter" = 3 months
      return;   // not a figure at all
    });
  });
  // ordinals that aren't standings: "2nd shift" = "second shift". A bare "first", "second" or "third" is usually
  // just English ("first point of contact", "a second language") - only a sequence noun makes it a figure.
  eat(/\b(\d+)(?:st|nd|rd|th)\b/g, function(m, i, n){ var c = add('ord', numVal(n), m, i); c.seq = SEQ_AFTER.test(after(i, m)); });
  eat(new RegExp('\\b(' + ORD_ALT + ')\\b', 'g'), function(m, i, w){
    var seq = SEQ_AFTER.test(after(i, m));
    if(!seq && ORDW[w] <= 3) return false;
    var c = add('ord', ORDW[w], m, i, true); c.seq = seq;
  });
  // a figure inside a word ("B2B", "iPhone12", "CS101") must match as written
  eat(/\b[a-z]+\d+[a-z\d]*\b/g, function(m, i){ add('raw', null, m, i, false, 'raw:' + m); });
  // magnitudes first ("15 thousand" = "15k"), then number-word phrases: "twenty-five thousand", "two hundred and five", "a dozen"
  eat(new RegExp('(' + N_ + ')\\s?(thousand|million|billion|mil|grand|lakhs?|crores?)\\b', 'g'), function(m, i, n, u){ add('num', numVal(n) * MAG[u], m, i); });
  eat(new RegExp('(' + N_ + ')\\s?(bn|mm|k|m|b)(?![a-z0-9])', 'g'), function(m, i, n, u){ add('num', numVal(n) * MAG[u], m, i); });
  eat(new RegExp('\\b' + WPHRASE + '\\b', 'g'), function(m, i){ if(m === 'one' && !o.source) return false; add('num', phraseVal(m), m, i, true); });
  eat(/(?<![\d,])\d+(?:,\d+)+(?:\.\d+)?/g, function(m, i){ if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(m)) add('num', numVal(m), m, i); else add('raw', null, m, i, false, 'raw:' + m); });
  eat(/\d+(?:\.\d+)?/g, function(m, i){ var c = add('num', numVal(m), m, i); if(/^(?:19[5-9]|20\d)\d$/.test(m)) c.yearish = yearLike(after(i, m)); });
  see(/\b(dozens|hundreds|thousands|millions|billions|countless)\b/g, function(m, i){ add('vague', null, m, i, true, 'vague:' + m); });
  see(/\b(single|double|triple|five|six|seven)[\s-](digits?|figures?)\b/g, function(m, i, a, b){ add('vague', null, m, i, true, 'vague:' + a + '-' + b.replace(/s$/, '')); });
  // what each figure counts, and how often ("15 rooms per shift"), so a figure can't quietly move to something else
  out.forEach(function(c){ if(c.kind === 'num' || c.kind === 'plus'){ c.noun = claimNoun(orig, c); c.rate = claimRate(orig, c); } });
  if(NOTHER_RE) see(NOTHER_RE, function(m, i){ add('raw', null, m, i, false, 'raw:' + m); });     // any numeral we couldn't read must match exactly
  if(ND_OTHER_RE) see(ND_OTHER_RE, function(m, i){ add('raw', null, m, i, false, 'raw:' + m); });
  return out.sort(function(a, b){ return a.index - b.index || (b.end - b.index) - (a.end - a.index); });   // reading order
}
// What the person's own words support, computed once per source text.
var _srcCache = {}, _srcCacheN = 0;
function srcInfo(src){
  var key = String(src || '');
  if(Object.prototype.hasOwnProperty.call(_srcCache, key)) return _srcCache[key];
  if(_srcCacheN > 1500){ _srcCache = {}; _srcCacheN = 0; }
  var norm = normNumerals(key), claims = numericClaims(norm, { source: true }), have = {}, vals = [], pvals = [], byKind = {}, fromTo = [], countIdx = {};
  claims.forEach(function(c){
    have[c.key] = 1;
    (byKind[c.kind] = byKind[c.kind] || []).push(c);
    if(c.val != null && isFinite(c.val) && (c.kind === 'num' || c.kind === 'plus' || c.kind === 'money')) vals.push(c.val);
    if(c.val != null && isFinite(c.val) && c.kind === 'pct') pvals.push(c.val);
    if(c.kind === 'num' || c.kind === 'plus'){
      var ck = canonNum(c.val); (countIdx[ck] = countIdx[ck] || []).push(c);
      c.moneyCtx = MONEY_BEFORE_RE.test(norm.slice(Math.max(0, c.index - 32), c.index)) || (!!c.noun && isMoneyNoun(c.noun));   // "raised 12k for...", "a 40k budget"
      c.ratingCtx = /\./.test(c.text) || /^(?:gpa|rat|star|scor|review|averag|grad|point|cgpa)$/.test(c.noun || '');           // "3.8 GPA", "4.8 rating"
    }
  });
  // "from 20 to 40 members" proves "doubled" and "up 100%"
  norm.replace(/\bfrom\s+[$£€₹¥]?(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b(?:\s+[a-z]+){0,3}?\s+to\s+[$£€₹¥]?(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b/gi, function(m, a, ua, b, ub){
    var x = numVal(a) * (ua ? MAG[ua.toLowerCase()] : 1), y = numVal(b) * (ub ? MAG[ub.toLowerCase()] : 1); if(x > 0 && y > 0) fromTo.push(y / x); return m;
  });
  _srcCacheN++;
  return (_srcCache[key] = { norm: norm, exp: expandMag(norm).text, claims: claims, have: have, vals: vals, pvals: pvals, byKind: byKind, fromTo: fromTo, countIdx: countIdx });
}
function multToPct(m){ return m >= 1 ? (m - 1) * 100 : (1 - m) * 100; }
function sameVal(list, v){ return (list || []).some(function(x){ return x.val != null && canonNum(x.val) === canonNum(v); }); }
// Things money is counted in: "raised 12k for the food bank" / "a 40k budget" can be written "$12,000" / "$40,000".
// Words that make a bare figure an amount of money: "raised 12k", "saved about 5,000", "a budget of 40k".
var MONEY_BEFORE_RE = /\b(?:raised|raising|raise|saved|saving|save|earned|earning|earn|generated|generating|generate|brought in|bringing in|collected|collecting|donated|spent|spending|grossed|netted|secured|budget of|budgets? of|worth|valued at|paid|salary of|revenue of|sales of|funding of|grant of|deals? worth|contracts? worth)\s+(?:about\s+|over\s+|nearly\s+|roughly\s+|around\s+|almost\s+|more than\s+|up to\s+)?$/i;
var MONEY_WORDS = 'budget budgets sale sales revenue income fund funds funding donation donations grant grants payroll cash deposit deposits profit profits saving savings cost costs fee fees tip tips scholarship prize prizes pipeline contract contracts deal deals earning earnings worth value spend spending', _moneyNouns = null;
function isMoneyNoun(n){
  if(!_moneyNouns){ _moneyNouns = {}; MONEY_WORDS.split(' ').forEach(function(w){ var st = cstem(w); _moneyNouns[SYNONYMS[st] || st] = 1; }); }
  return !!_moneyNouns[n];
}
// Is this claim the person's? Exact claim, or an exactly equivalent / strictly weaker one.
function durSupported(c, list){
  var same = (list || []).filter(function(d){ return d.unit === c.unit && d.val != null && isFinite(d.val); });
  if(c.mode === '+') return same.some(function(d){ return d.mode !== '-' && (d.mode === '~' ? d.val * 0.85 : d.val) >= c.val - 1e-9; });   // "over 3 years" needs at least 3
  if(c.mode === '-') return same.some(function(d){ return d.mode !== '+' && (d.mode === '~' ? d.val * 1.15 : d.val) <= c.val + 1e-9; });  // "within 2 weeks" needs at most 2
  if(c.mode === '~') return same.some(function(d){                                                                                         // "about 4 years" needs roughly 4
    var tol = Math.max(0.15 * Math.max(d.val, c.val), (c.val >= 6 && d.val >= 6) ? 1 : 0); return Math.abs(d.val - c.val) <= tol + 1e-9; });
  return same.some(function(d){ return d.mode !== '~' && canonNum(d.val) === canonNum(c.val); });   // exact: never from a hedge ("about 2 years" is not "2 years")
}
function timeBase(k){ return String(k).replace(/(?:am|pm)$/, ''); }
function claimSupported(c, info){
  if(info.have[c.key]) return true;
  var k = info.byKind;
  switch(c.kind){
    case 'num': return sameVal(k.num, c.val) || sameVal(k.plus, c.val) || sameVal(k.money, c.val) || sameVal(k.pct, c.val) || sameVal(k.rank, c.val)   // "50" from "$50", "50%", "50+", "#50"
      || (c.val === 0 && /\b(?:never|none|not (?:a|one) single|not one|without (?:a single|any))\b/i.test(info.norm))                                   // "zero shortages" from "never had a shortage"
      || (k.ratio || []).some(function(r){ return r.key.slice(6).split('/').indexOf(canonNum(c.val)) >= 0; })                                        // "4.8" from "4.8/5"
      || (!!c.yearish && sameVal(k.year, c.val));                                                                                                       // "2023 targets" from a 2023 date
    case 'money': var counts = (k.num || []).concat(k.plus || []);
      if(c.mode === '+') return (k.money || []).some(function(s){ return s.cur === c.cur && s.val >= c.val - 1e-9; })                                   // "over $3,000" from "$3,250"
        || counts.some(function(n){ return n.moneyCtx && n.val != null && n.val >= c.val - 1e-9; });
      return (k.money || []).some(function(s){ return s.cur === c.cur && canonNum(s.val) === canonNum(c.val); })                                         // "$3,000" from "over $3,000"
        || counts.some(function(n){ return n.val != null && canonNum(n.val) === canonNum(c.val) && n.moneyCtx; });                                       // "raised 12k for the food bank" -> "$12,000"
    case 'plus': return (k.num || []).concat(k.plus || []).some(function(s){ return s.val != null && s.val >= c.val - 1e-9 && nounsMatch(s, c); });   // "1,200+ customers" from "1,234 customers"
    case 'mult': return (k.pct || []).some(function(p){ return canonNum(multToPct(c.val)) === canonNum(p.val); })                                          // "2x" from "up 100%"
      || (info.fromTo || []).some(function(r){ return Math.abs(r - c.val) <= 0.02 * c.val; });                                                          // "doubled" from "from 20 to 40"
    case 'pct': return (k.mult || []).some(function(m){ return canonNum(multToPct(m.val)) === canonNum(c.val); })
      || (k.frac || []).some(function(f){ return Math.abs(f.val * 100 - c.val) <= 0.7; })                                                            // "33%" from "a third"
      || (k.ratio || []).some(function(r){ var p = r.key.slice(6).split('/'), a = +p[0], b = +p[1]; return b > 0 && Math.abs(a / b * 100 - c.val) < 0.5; })   // "95%" from "95 out of 100"
      || (info.fromTo || []).some(function(r){ return Math.abs(multToPct(r) - c.val) <= 1; });                                                       // "up 100%" from "from 20 to 40"
    case 'frac': return (k.pct || []).some(function(p){ return Math.abs(p.val - c.val * 100) <= 0.7; });
    case 'ratio': var rp = c.key.slice(6).split('/'), ra = +rp[0], rb = +rp[1];                                                                          // "3.8/4.0" from "a 3.8 GPA"
      return [4, 5, 10, 100].indexOf(rb) >= 0 && ra <= rb && (k.num || []).some(function(n){ return n.ratingCtx && n.val != null && canonNum(n.val) === canonNum(ra); });
    case 'vague': var vk = c.key.slice(6), r = VAGUE[vk]; return !!r && info.vals.concat(/-digit$/.test(vk) ? info.pvals || [] : []).some(function(x){ return x >= r[0] && x < r[1]; });
    case 'wt': return (k.wt || []).some(function(w){                                                                                                    // "50 lbs" = "50 pounds" = "22.7 kg"
      var tol = Math.max(0.5, 0.01 * c.val);
      if(c.mode === '+') return w.mode !== '-' && w.val >= c.val - tol;
      if(c.mode === '-') return w.mode !== '+' && w.val <= c.val + tol;
      if(c.mode === '~') return Math.abs(w.val - c.val) <= Math.max(tol, 0.15 * c.val);
      return w.mode !== '~' && Math.abs(w.val - c.val) <= tol; });
    case 'ord': return sameVal(k.ord, c.val) || sameVal(k.rank, c.val);                                                                                 // "second shift" from "2nd shift"
    case 'time': return (k.time || []).some(function(x){ var ap1 = /(?:am|pm)$/.test(x.key), ap2 = /(?:am|pm)$/.test(c.key); return (!ap1 || !ap2) && timeBase(x.key) === timeBase(c.key); });   // "at 6 every morning" -> "6 AM"
    case 'year': return sameVal(k.year, c.val) || sameVal(k.num, c.val);
    case 'dur': return durSupported(c, k.dur);
    default: return false;   // money in another currency, floors, ranks and standings, quarters, dates, unreadable numerals: the exact claim only
  }
}
// Unsupported claims, without double-reporting one figure ("$10k" also contains the number "10k").
function outermost(list){
  var keep = list.filter(function(c){ return !list.some(function(o){ return o !== c && o.index <= c.index && o.end >= c.end && (o.end - o.index) > (c.end - c.index); }); });
  var seen = {};
  return keep.filter(function(c){ if(seen[c.key]) return false; seen[c.key] = 1; return true; });
}
// Unsupported claims - but a figure inside a claim that IS supported is part of that claim ("50" in "50%" from "cut in half").
function badClaims(info, claims){
  var good = claims.filter(function(c){ return claimSupported(c, info); });
  return outermost(claims.filter(function(c){
    return !claimSupported(c, info) && !good.some(function(g){ return g.index <= c.index && g.end >= c.end && (g.end - g.index) > (c.end - c.index); });
  }));
}
function unsupportedClaims(info, candidate){ return badClaims(info, numericClaims(candidate)); }
function strictAgainst(info, candidate){ return unsupportedClaims(info, normNumerals(candidate)).map(function(c){ return c.shown || c.text; }); }
function strictFlags(source, candidate){ return strictAgainst(srcInfo(source), candidate); }
// "$12k" and "$12,000" are the same claim: spell magnitudes out (for the digit net only) and remember the original text.
function expandMag(t){
  var map = {};
  var out = String(t).replace(/(?<![\d.,])(\d[\d,]*(?:\.\d+)?)\s?(thousand|million|billion|mil|grand|lakhs?|crores?)\b|(?<![\d.,])(\d[\d,]*(?:\.\d+)?)\s?(bn|mm|k|m|b)(?![a-z0-9])/gi, function(m, n1, u1, n2, u2){
    var v = numVal(n1 || n2) * MAG[String(u1 || u2).toLowerCase()];
    if(!isFinite(v)) return m;
    var s = String(Math.round(v)); map[s] = m; return s;
  });
  return { text: out, map: map };
}
// The shared digit net, as a cross-check: a digit it flags counts unless it sits inside a claim already verified above.
function fabAgainst(info, candidate, supported){
  if(!/\d/.test(candidate)) return [];
  var ce = expandMag(candidate), out = [];
  fab(info.exp, ce.text).forEach(function(tok){
    var orig = ce.map[String(tok).replace(/,/g, '')] || tok, i = -1, covered = true, any = false;
    while((i = candidate.indexOf(orig, i + 1)) >= 0){ any = true; var at = i; if(!(supported || []).some(function(c){ return c.index <= at && c.end >= at + orig.length; })){ covered = false; break; } }
    if(!any || !covered) out.push(orig);
  });
  return out;
}

/* Taking a claim OUT of a line, honestly and readably. */
var STRIP_QUAL = '(?:\\b(?:(?:by|of|to|from|over|under|about|around|roughly|nearly|almost|approximately|approx\\.?|more than|less than|up to|at least|some)\\s+)+|~\\s?)?';
var STRIP_UNIT = '(?:\\s?(?:%|percent\\b|per\\s?cent\\b|pct\\b|x\\b|times\\b|k\\b|m\\b|bn\\b|\\+|-?fold\\b|dollars?\\b|usd\\b|euros?\\b|pounds?\\b|(?:mins?|minutes?|hrs?|hours?|days?|weeks?|months?|years?|yrs?|seconds?|secs?)\\b))?';
var RATE_TAIL = '(?:\\s(?:a|an|per|each|every)\\s(?:year|yr|month|week|day|night|shift|hour|hr|season|quarter|semester|term)\\b)?';
var OF_TAIL = '(?:\\s+of\\b)?';
// A figure that measures time takes its whole phrase with it: "in 6 months", "over 2 sprints", "for 3 years", "after a year and a half".
var TIME_QUAL = '\\b(?:in|within|during|over|for|after|across)\\s+(?:(?:about|around|roughly|nearly|almost|just|only|under|over|less than|more than)\\s+)?';
var TIME_NOUN = '\\s+(?:consecutive\\s+|straight\\s+|short\\s+)?(?:sprints?|quarters?|semesters?|seasons?|shifts?|terms?|years?|yrs?|months?|weeks?|days?|hours?|hrs?|minutes?|mins?|cycles?|rounds?|phases?)\\b';
// ...a time of day its "at", a year its "in" / "since" / "Fall" / "Class of", an ordinal its "-ranked".
var AT_QUAL = '(?:\\b(?:at|by|before|after|until|till|from|around|about|starting at|beginning at)\\s+)?';
var YEAR_QUAL = '(?:\\b(?:in|since|from|during|by|until|till|through|to|of|class of|fy)\\s+)?(?:(?:' + MONTHISH + ')\\.?,?\\s+)?';
var ORD_COMPOUND = '(?:-(?:ranked|rated|place|placed|best|largest|highest|biggest|busiest|fastest|ever))?';
var MULT_VERB_RE = /^(doubl|tripl|quadrupl|quintupl|sextupl|halv)/i;
var MULT_VERB_WORD = /^(?:doubl|tripl|quadrupl|quintupl|sextupl|halv)(?:ed|ing)$/i;
var STRIP_MARK = '\u0001';
function neutralVerb(w){
  var l = String(w).toLowerCase(), ing = /ing$/.test(l), down = /^halv/.test(l);
  var v = down ? (ing ? 'reducing' : 'reduced') : (ing ? 'increasing' : 'increased');
  return /^[A-Z]/.test(w) ? cap(v) : v;
}
// Where a figure came out, the words that only made sense with it go too:
// "Answered calls a day with a resolution rate" -> "Answered calls daily"; "goal 3 years in a row" -> "goal".
var RATE_ADV = { day: 'daily', night: 'nightly', week: 'weekly', month: 'monthly', year: 'annually', yr: 'annually', hour: 'hourly', hr: 'hourly', quarter: 'quarterly',
  shift: 'per shift', season: 'per season', semester: 'per semester', term: 'per term' };
function tidyMarks(t){
  var M = STRIP_MARK;
  if(t.indexOf(M) < 0) return t;
  t = t.replace(new RegExp(M + '\\s*((?:[A-Za-z-]+\\s+){0,2}?[A-Za-z-]+)\\s+(?:a|an|per|each|every)\\s+(day|night|week|month|year|yr|hour|hr|quarter|shift|season|semester|term)\\b', 'gi'),
    function(m, np, unit){ return M + ' ' + np + ' ' + RATE_ADV[unit.toLowerCase()]; });
  t = t.replace(new RegExp('(?<![\\s,])[\\s,]*\\b(?:with|at)\\s+(?:an?\\s+)?' + M + '\\s*(?:[A-Za-z-]+\\s+){0,2}?(?:rate|accuracy|score|rating|margin|ratio|uptime|retention|attendance|satisfaction|occupancy|completion|success|approval|conversion|growth|increase|reduction|improvement|average|precision)(?:\\s+(?:rate|score|rating|ratio|average|level))?\\b', 'gi'), ' ' + M + ' ');
  t = t.replace(new RegExp('(?<![\\s,])[\\s,]*\\bwith\\s+' + M + '\\s*[A-Za-z-]+(?:\\s+[A-Za-z-]+)?\\s+each\\b', 'gi'), ' ' + M + ' ');
  t = t.replace(new RegExp('\\b(?:for|over|across)\\s+' + M + '\\s*(?:consecutive\\s+|straight\\s+)?(?:years?|months?|weeks?|quarters?|semesters?|seasons?|days?|shifts?|terms?)\\b', 'gi'), ' ' + M + ' ');
  t = t.replace(new RegExp(M + '\\s*(?:in a row|straight|running|consecutively|back[- ]to[- ]back)\\b', 'gi'), M);
  t = t.replace(new RegExp('\\b(?:class|cohort)\\s+(?:of\\s+)?' + M, 'gi'), M);
  t = t.replace(new RegExp(M + '\\s*(?:-|–|—|to|through|until)\\s*' + M, 'gi'), M);
  t = t.replace(new RegExp('\\(\\s*' + M + '\\s*(?:\\/\\s*[A-Za-z]+|(?:a|an|per|each)\\s+[A-Za-z]+)?\\s*\\)', 'g'), M);   // "( /yr)"
  return t.replace(new RegExp('\\s*' + M + '\\s*', 'g'), ' ');
}
function tidyLine(t){
  t = tidyMarks(String(t));
  t = t.replace(/\(\s*\)/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/([,;:])(?:\s*[,;:])+/g, '$1').replace(/\s+/g, ' ').trim();
  t = t.replace(/^[,;:\-–—\s]+/, '');
  for(var i = 0; i < 4; i++) t = t.replace(/[\s,;:]*(?:\b(?:by|of|to|from|with|and|or|for|at|in|on|over|under|about|around|nearly|almost|roughly|than)|[–—-])\s*[.,;:]*$/i, '');
  t = t.replace(/^(generated|raised|sold|earned|brought in|drove|closed|secured|handled|processed|managed)\s+(?:in|of|worth of)\s+/i, '$1 ');   // "Generated in sales" -> "Generated sales" (never "Saved costs")
  return cap(t.replace(/[,;:\-–—\s]+$/, ''));
}
function figurePattern(s){
  if(/^[$£€₹¥]?\d/.test(s)) return '(?:[$£€₹¥]\\s?)?(?<![\\w.,])' + escRe(s.replace(/^[$£€₹¥]\s?/, '')) + '(?![\\d]|[.,]\\d)' + (/\d$/.test(s) ? STRIP_UNIT + '(?:/\\d+(?:\\.\\d+)?)?' : '');   // "15%" never takes the "year" of "year over year"
  return (/^\w/.test(s) ? '\\b' : '') + escRe(s) + (/\w$/.test(s) ? '\\b' : '');
}
function claimOf(n){ return numericClaims(n)[0] || {}; }
function stripOne(t, claim, kind){
  var s = clean(normNumerals(claim)).toLowerCase(); if(!s) return t;
  if(MULT_VERB_RE.test(s)) return t.replace(new RegExp('\\b' + escRe(s) + '\\b', 'i'), neutralVerb);   // "Tripled orders" -> "Increased orders": direction kept, magnitude gone
  kind = kind || claimOf(s).kind;
  var fp = figurePattern(s), mark = ' ' + STRIP_MARK + ' ';
  try{
    if(kind === 'time') return t.replace(new RegExp(AT_QUAL + fp, 'gi'), mark);
    if(kind === 'year') return t.replace(new RegExp(YEAR_QUAL + fp, 'gi'), mark);
    if(kind === 'ord' || kind === 'rank') fp += ORD_COMPOUND;
    var timed = new RegExp(TIME_QUAL + fp + (kind === 'dur' ? '' : TIME_NOUN), 'gi');
    if(timed.test(t)){ timed.lastIndex = 0; return t.replace(timed, mark); }
    return t.replace(new RegExp(STRIP_QUAL + fp + RATE_TAIL + OF_TAIL, 'gi'), mark);
  }catch(e){ return t; }
}
function outerClaims(cs){ return cs.filter(function(c){ return !cs.some(function(o){ return o !== c && o.index <= c.index && o.end >= c.end && (o.end - o.index) > (c.end - c.index); }); }); }
// Take claims out where they actually are: every other figure in the line is protected first, so removing "50"
// never touches a verified "50%", and a year range loses both ends together.
function stripProtected(t, list){
  var want = uniq((list || []).map(function(n){ return clean(normNumerals(n)).toLowerCase(); }).filter(Boolean));
  if(!want.length) return t;
  var cs = numericClaims(t), outer = outerClaims(cs), same = t.toLowerCase().length === t.length;
  var targets = outer.filter(function(c){ return want.indexOf(c.text) >= 0; }), done = {};
  // a figure listed by itself but written inside a bigger claim ("5" in "5 years"): the whole claim goes
  want.forEach(function(w){
    if(targets.some(function(c){ return c.text === w; })) return;
    cs.forEach(function(ic){ if(ic.text !== w) return; var box = outer.filter(function(o){ return o.index <= ic.index && o.end >= ic.end; })[0]; if(box){ done[w] = 1; if(targets.indexOf(box) < 0) targets.push(box); } });
    if(!done[w] && /^(?:~|about |around |roughly |nearly |approx\.? |approximately )\s*\d/.test(w)){ var w2 = w.replace(/^(?:~|about |around |roughly |nearly |approx\.? |approximately )\s*/, ''); cs.forEach(function(ic){ if(ic.text !== w2) return; var box = outer.filter(function(o){ return o.index <= ic.index && o.end >= ic.end; })[0]; if(box){ done[w] = 1; if(targets.indexOf(box) < 0) targets.push(box); } }); }
    if(!done[w] && /\d/.test(w)){ var tokRe = new RegExp('(?:^|[^\\d.,])' + escRe(w) + '(?![\\d]|[.,]\\d)'); outer.forEach(function(o){ if(tokRe.test(o.text)){ done[w] = 1; if(targets.indexOf(o) < 0) targets.push(o); } }); }
  });
  outer.forEach(function(c){
    if(c.kind !== 'year' || targets.indexOf(c) >= 0) return;
    if(targets.some(function(x){ return x.kind === 'year' && (x.end <= c.index || c.end <= x.index) && /^\s*(?:-|–|—|to|through|until)\s*$/.test(t.slice(Math.min(x.end, c.end), Math.max(x.index, c.index))); })) targets.push(c);
  });
  var saved = [];
  if(same) outer.filter(function(c){ return targets.indexOf(c) < 0; }).sort(function(a, b){ return b.index - a.index; }).forEach(function(c){
    saved.push(t.slice(c.index, c.end)); t = t.slice(0, c.index) + '\u0002' + String.fromCharCode(0xE000 + saved.length - 1) + '\u0003' + t.slice(c.end);
  });
  var did = {};
  targets.forEach(function(c){ if(did[c.text]) return; did[c.text] = done[c.text] = 1; t = stripOne(t, c.text, c.kind); });
  want.forEach(function(w){ if(!done[w]){ done[w] = 1; t = stripOne(t, w); } });
  return t.replace(/\u0002([-])\u0003/g, function(m, ch){ return saved[ch.charCodeAt(0) - 0xE000]; });
}
function stripClaims(text, list){ return tidyLine(stripProtected(normNumerals(text), list)); }
// Would removing the claim leave a real, readable line? If not, the studio asks for the figure instead of offering "Remove it".
var MONEY_IN_RE = /[$£€₹¥]|\b(?:dollars?|bucks|usd|euros?|pounds?|rupees?|gbp|eur|inr)\b/i;
var ORD_SEQ_RE = /\b(?:\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)[\s-]+(?:shift|floor|round|quarter|year|semester|term|place|grade|period|tier|level|team|string|line|chair|register)s?\b/i;
function stripOk(orig, s){
  var w = words(s), o = clean(orig);
  if(w.length < 3 || clean(s) === o) return false;
  if(/(?:^|\s)[#$£€₹¥%/](?:\s|$)|\(\s*\)|\b(\w+)\s+\1\b/i.test(s)) return false;
  if(/^(of|per|from|to|by|than|and|or|a|an|the)\b/i.test(s) || /\b(of|per|from|to|by|than|and|or|a|an|the|with)$/i.test(s)) return false;
  if(/^(ranked|placed|finished|rated|scored|came|graduated)\b/i.test(s) && !/\d/.test(s)) return false;   // "Ranked stores in sales" says nothing
  if(ORD_SEQ_RE.test(o) && !ORD_SEQ_RE.test(s)) return false;                                            // "Worked shift on weekends"
  // a phrase left without its figure: "at daily", "in a row", "(2019-)", "Class", "in Fall", "-ranked"
  if(/\b(?:at|after|before|until|since|by|from)\s+(?:daily|weekly|monthly|nightly|every|each|on)\b|\bin a row\b|\(\s*\d{4}\s*[-–—]\s*\)|\b(?:class|cohort)\s*$|\b(?:in|during|since)\s+(?:spring|summer|fall|autumn|winter)\s*$|(?:^|\s)-\s*(?:ranked|rated|place)\b/i.test(s)) return false;
  // a money verb that lost its amount: "Raised for the food bank", "Saved in supply costs", "Saved the company by..."
  if(MONEY_IN_RE.test(o) && !MONEY_IN_RE.test(s)){
    if(/^(?:saved|raised|earned|generated|brought in|secured|collected|donated|grossed|netted|won|made)\s+(?:for|in|on|from|to|through|across|by|of|with|at|during|per|over|under|annually|monthly|weekly|daily|a|an|each)\b/i.test(s)) return false;
    if(/^saved\b/i.test(s)) return false;
  }
  var f0 = firstWord(o), f1 = firstWord(s);
  return f1 === f0 || /^(increased|reduced|increasing|reducing)$/.test(f1) || isPastVerb(f1) || BASE_PRESENT.indexOf(f1) >= 0;
}
// The exact span of a figure in a line - the claim that says it, where it actually is ("50" in "trained 50 new
// hires", never the "50" inside "50%") - so it can be confirmed or corrected in place.
function figureSpan(text, n){
  var s = clean(normNumerals(n)); if(!s) return null;
  var t = normNumerals(text), want = s.toLowerCase(), cs = numericClaims(t), outer = outerClaims(cs);
  if(t.toLowerCase().length === t.length){
    for(var i = 0; i < outer.length; i++) if(outer[i].text === want) return { index: outer[i].index, text: t.slice(outer[i].index, outer[i].end), claim: outer[i] };
    for(var j = 0; j < cs.length; j++) if(cs[j].text === want) return { index: cs[j].index, text: t.slice(cs[j].index, cs[j].end), claim: cs[j] };   // a part of a bigger claim
    if(/\d/.test(want)){ var tokRe = new RegExp('(?:^|[^\\d.,])' + escRe(want) + '(?![\\d]|[.,]\\d)'); for(var k = 0; k < outer.length; k++) if(tokRe.test(outer[k].text)) return { index: outer[k].index, text: t.slice(outer[k].index, outer[k].end), claim: outer[k] }; }   // "5" written as "5 years"
  }
  try{ var m = t.match(new RegExp(figurePattern(s), 'i')); return m ? { index: m.index, text: m[0] } : null; }catch(e){ return null; }
}
var ORD_TOKEN_RE = /(\d+)(st|nd|rd|th)\b|\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i;
var ORD_WORDS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
function ordSuffix(n){ var v = Math.abs(n) % 100; return (v >= 11 && v <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[v % 10] || 'th'); }
var LEAD_VERB_RE = /^(?:ranked|ranking|placed|placing|finished|finishing|came|coming|won|took|earned|named|voted)\s+(?:in\s+)?(?:the\s+)?/i;
var QUAL_LEAD_RE = /^(?:within|over|under|about|around|nearly|almost|roughly|approximately|more than|less than|at least|up to|in excess of|north of|above|below|~)\s*/i;
// Their answer, written into the figure's place. A bare number takes only the figure's unit words - never its digits,
// never its floor: "40%" + "35" -> "35%", "5:30 AM" + "6" -> "6 AM", "200+" + "150" -> "150", "$10k" + "30" -> "$30k".
// A place keeps its verb and suffix ("Ranked 2nd" + "3" -> "Ranked 3rd"), a hedge stays ("within 2 weeks" + "10 days"
// -> "within 10 days"), "Top 5%" + "10%" stays a top, a fraction or "by half" reads as a percent ("by half" + "40" ->
// "by 40%"), and a verb answered for "4x" reads as a multiple ("tripled" -> "3x").
var UNIT_POST_RE = /^\s?(?:%|percent\b|per\s?cent\b|x\b|k\b|m\b|bn\b|\/\s?\d+(?:\.\d+)?|[\s-]*(?:(?:business|working|calendar)\s+)?(?:decades?|years?|yrs?|quarters?|months?|mos?|weeks?|wks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|lbs?|pounds?|kgs?|kilos?|kilograms?|oz|ounces?|tons?|tonnes?)\b)/i;
var FLOOR_WORDS_RE = /\b(?:over|more than|at least|upwards of|in excess of|north of|above|beyond)\s*/gi;
var MULT_VERB_X = { doubled: '2x', doubling: '2x', tripled: '3x', tripling: '3x', quadrupled: '4x', quadrupling: '4x', quintupled: '5x', quintupling: '5x', sextupled: '6x', sextupling: '6x', halved: 'by 50%', halving: 'by 50%' };
var NUM_LEAD_RE = /^(?:(?:about|around|roughly|nearly|almost|approximately|over|under|more than|less than|at least|up to|within)\s+|~)?[$£€₹¥]?\d/i;
function figureReplacement(span, ans, c){
  var a = clean(ans), num = span.match(/\d[\d,]*(?:\.\d+)?/), bare = /^[\d.,]+$/.test(a);
  var om = span.match(ORD_TOKEN_RE), an = a.match(/^#?(\d+)(?:st|nd|rd|th)?$/i), aw = a.match(/^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)$/i);
  if(om && (an || aw) && (!c || c.kind === 'rank' || c.kind === 'ord' || c.kind === 'qtr' || c.kind === 'grade')){
    var v = an ? +an[1] : ORD_WORDS.indexOf(aw[1].toLowerCase());
    var rep = (om[3] && v >= 1 && v <= 10) ? ORD_WORDS[v] : v + ordSuffix(v);
    if(om[3] && /^[A-Z]/.test(om[3])) rep = cap(rep);
    return span.replace(ORD_TOKEN_RE, rep);
  }
  if(c && c.kind === 'time' && /^\d{1,2}(?::\d{2})?$/.test(a)){ var ap = span.match(/([ap])\.?\s?m\.?\s*$/i); return a + (ap ? ' ' + ap[1].toUpperCase() + 'M' : ''); }
  if(c && c.kind === 'mult' && MULT_VERB_X[a.toLowerCase()]) a = MULT_VERB_X[a.toLowerCase()];
  if(c && (c.kind === 'frac' || (c.kind === 'mult' && !num)) && /^(?:(?:about|around|roughly|nearly|almost)\s+|~)?\d/i.test(a)){
    if(/^[\d.,]+$/.test(a)) a += (c.kind === 'mult' && c.val > 1 && numVal(a) <= 10 ? 'x' : '%');
    return (/^(?:by|in)\s/i.test(span) && !/^by\s/i.test(a) ? 'by ' : '') + a;
  }
  var at = num ? span.indexOf(num[0]) : -1;
  var pre = at >= 0 ? span.slice(0, at).replace(FLOOR_WORDS_RE, '') : '';   // "top ", "#", "No. ", "within " - never "over"
  var post = at >= 0 ? ((span.slice(at + num[0].length).match(UNIT_POST_RE) || [''])[0]) : '';
  if(bare && num) return pre + a + post;
  var lv = span.match(LEAD_VERB_RE); if(lv && !LEAD_VERB_RE.test(a)) a = lv[0].replace(/\s+$/, '') + ' ' + a;
  var keepPre = pre.replace(/[$£€₹¥]\s*$/, '');
  if(keepPre && NUM_LEAD_RE.test(a) && !QUAL_LEAD_RE.test(a) && !lv) a = keepPre + a;
  var q = span.match(QUAL_LEAD_RE); if(q && !QUAL_LEAD_RE.test(a) && !LEAD_VERB_RE.test(a)) a = q[0] + a;
  var cur = (span.match(/(?:^|[^\w])([$£€₹¥])\s?\d/) || ['', ''])[1];
  if(cur && !/[$£€₹¥]|dollar|usd|euro|pound|rupee|yen/i.test(a)) a = a.replace(/^((?:(?:top|about|around|roughly|nearly|almost|approximately|over|under|more than|less than|at least|up to|within)\s+|~)?)(\d)/i, function(m, q1, d){ return q1 + cur + d; });   // "roughly 4000" for "$5K" stays in dollars
  return a;
}
// "Tripled X" + "40" -> by 40%; + "2" -> 2x. "Halved X" + "40" -> by 40% (a reduction is never "3x").
function multMeasure(s, ans){
  var m = clean(ans).match(/^(?:(?:about|around|roughly|nearly|almost)\s+|~)?(\d+(?:\.\d+)?)\s*(x|%|percent)?$/i);
  if(!m) return ans;
  if(m[2]) return /^x$/i.test(m[2]) ? clean(ans).replace(/\s*x$/i, 'x') : ans;
  return (/^halv/i.test(s) || parseFloat(m[1]) > 10) ? clean(ans) + '%' : clean(ans) + 'x';
}
var YES_RE = /^(?:y|yes|yep|yeah|yup|true|correct|accurate|right|confirmed?|that'?s (?:right|correct|true|accurate)|it'?s (?:true|right|correct|accurate|real)|keep|keep it|real)[.!]*$/i;
function isYes(ans, s){ var a = clean(ans).toLowerCase(); return YES_RE.test(a) || a === s || a === s.replace(/^the\s+/, ''); }
// Answers that aren't a figure at all mean "take it out": "no", "not sure", "don't know", "n/a".
var NON_ANSWER_RE = /^(?:no|nope|nah|not sure|unsure|i'?m not sure|not certain|don'?t know|do not know|i don'?t know|dunno|idk|n\/?a|none|nothing|not really|not applicable|unknown|no idea|can'?t remember|cannot remember|don'?t remember|forgot|not true|false|wrong|incorrect|skip|pass|\?+|-+|x)[.!]*$/i;
var ANS_LEAD = /^(?:(?:y|yes|yep|yeah|yup|correct|right|true|no|nope|nah|not quite|not exactly)\b[\s,;:.!-]*)?(?:(?:but|and|so|well|um+|uh+|hmm+|actually|really|honestly|probably|maybe|more like|closer to|it was|it's|it is|that's|that was|roughly speaking|i think|i'd say|i would say|i guess|let's say|say)\b[\s,;:.!-]*)*/i;
var NUMBERISH_ANS = new RegExp('\\d|\\b(?:' + NUMW + '|' + ORD_ALT + '|half|third|thirds|quarter|quarters|dozen|doubled|tripled|quadrupled|halved|twice|thrice|decade)\\b|\\b(?:a|an)\\s+(?:year|month|week|day|hour|decade|quarter|semester|summer)\\b', 'i');
// The figure in a chatty answer ("honestly it was about 45 a day" -> "about 45").
var FIG_PHRASE_RE = /(?:(?:about|around|roughly|nearly|almost|approximately|over|under|more than|less than|at least|up to|within|~)\s*)?(?:#\s?|no\.\s?)?[$£€₹¥]?\d[\d,.]*(?:\s*(?:-|–|—|to)\s*[$£€₹¥]?\d[\d,.]*)?(?:\s*(?:%|percent\b|per\s?cent\b|x\b|k\b|m\b|bn\b|st\b|nd\b|rd\b|th\b|[ap]\.?m\.?|\/\s?\d+(?:\.\d+)?|\+))?(?:[\s-]*(?:(?:business|working)\s+)?(?:decades?|years?|yrs?|quarters?|months?|mos?|weeks?|wks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|lbs?|pounds?|kgs?)\b)?(?:\s+(?:of|out of)\s+\d[\d,.]*)?/i;
// What an answer means: '' (take the figure out), 'yes' (keep it - now it's theirs), or the figure to use.
function readAnswer(raw, kind, s){
  var a = clean(raw); if(!a) return '';
  if(isYes(a, s)) return 'yes';
  if(NON_ANSWER_RE.test(a)) return '';
  var rest = clean(a.replace(ANS_LEAD, ''));
  if(rest && rest !== a && (kind === 'boast' || NUMBERISH_ANS.test(rest))) a = rest;   // "yes, about 35%" -> "about 35%"; "no, it was 3rd" -> "3rd"
  if(kind !== 'boast' && !NUMBERISH_ANS.test(a)) return '';                                // "a lot", "not much" - not a figure, so the figure comes out
  if(kind !== 'boast' && /\d/.test(a) && !/^(?:(?:about|around|roughly|nearly|almost|approximately|over|under|more than|less than|at least|up to|within|from|by|to|up|down|top|~|#|no\.)\s*|[$£€₹¥]?\d)/i.test(a)){ var fm = a.match(FIG_PHRASE_RE); if(fm) a = clean(fm[0]); }
  return a;
}
var NOTE_LEAD = /^(?:with|alongside|as|in|on|for|by|among|across|at|after|while|through|via|using|from|during)\b/i;
// Confirm-or-correct for figures the person never gave (answers fig0, fig1, ...): "yes" keeps it (now it's theirs);
// another figure replaces it in place; a multiplier verb keeps its direction and takes their figure as the
// measurement ("Tripled X" + "40%" -> "Increased X by 40%"); a superlative they correct comes out, with what
// really happened added ("Single-handedly launched X" + "with 2 teammates" -> "Launched X with 2 teammates");
// a blank answer, or one that isn't a figure ("no", "not sure"), takes the figure out. Returns the line and any measurement to place.
function confirmFigures(text, unverified, answers){
  var t = normNumerals(text), ys = [], notes = [], drop = [];
  (unverified || []).forEach(function(n, i){
    var s = clean(normNumerals(n)).toLowerCase(), sp = figureSpan(t, n), c = (sp && sp.claim) || claimOf(n);
    var ans = readAnswer(answers && answers['fig' + i], c.kind, s);
    if(ans === 'yes') return;
    if(!ans){ drop.push(n); return; }
    if(c.kind === 'boast'){ drop.push(n); notes.push(ans.replace(/[.;]+$/, '')); return; }
    if(MULT_VERB_RE.test(s)){
      var asVerb = MULT_VERB_WORD.test(ans);   // "Tripled X" + "doubled" -> "Doubled X"
      t = t.replace(new RegExp('\\b' + escRe(s) + '\\b', 'i'), function(m){ return asVerb ? (/^[A-Z]/.test(m) ? cap(ans.toLowerCase()) : ans.toLowerCase()) : neutralVerb(m); });
      if(!asVerb) ys.push(multMeasure(s, ans));
      return;
    }
    if(!sp) return;
    var end = sp.index + sp.text.length, ofm = c.kind === 'vague' && t.slice(end).match(/^\s+of\b/i);
    if(ofm) end += ofm[0].length;                                       // "hundreds of customers" + "about 150" -> "about 150 customers"
    t = t.slice(0, sp.index) + figureReplacement(sp.text, ans, c) + t.slice(end);
  });
  if(drop.length) t = stripProtected(t, drop);
  var out = tidyLine(t);
  notes.forEach(function(a){ out = out.replace(/[.;]+$/, '') + (NOTE_LEAD.test(a) ? ' ' : ' – ') + a; });
  return { text: out, y: ys };
}
// What the person actually stated with each confirm-or-correct answer ("35" for "40%" states "35%"; "yes" states the
// figure; "not sure" states nothing).
function figureAnswers(text, unverified, answers){
  var out = Object.assign({}, answers || {});
  (unverified || []).forEach(function(n, i){
    if(!clean(out['fig' + i])) return;
    var s = clean(normNumerals(n)).toLowerCase(), sp = figureSpan(text, n), c = (sp && sp.claim) || claimOf(n), ans = readAnswer(out['fig' + i], c.kind, s);
    if(ans === 'yes'){ out['fig' + i] = sp ? sp.text : clean(n); return; }
    if(!ans){ out['fig' + i] = ''; return; }
    if(c.kind === 'boast'){ out['fig' + i] = ans; return; }
    if(MULT_VERB_RE.test(s)){ out['fig' + i] = MULT_VERB_WORD.test(ans) ? ans : multMeasure(s, ans); return; }
    out['fig' + i] = sp ? figureReplacement(sp.text, ans, c) : ans;
  });
  return out;
}

/* ------------------------------------------------------------------ dates */
var MONTHS = { jan:1, january:1, feb:2, february:2, mar:3, march:3, apr:4, april:4, may:5, jun:6, june:6, jul:7, july:7,
  aug:8, august:8, sep:9, sept:9, september:9, oct:10, october:10, nov:11, november:11, dec:12, december:12 };
var SEASONS = { spring:3, summer:6, fall:9, autumn:9, winter:12 };

function parseDate(raw){
  var s = clean(raw), low = s.toLowerCase().replace(/[’']/g, "'");
  if(!s) return { ok:false, empty:true, raw:s };
  if(/^(present|current|currently|now|today|ongoing|to date)$/.test(low)) return { ok:true, present:true, raw:s, fmt:'present' };
  var m;
  if((m = low.match(/^([a-z]{3,9})\.?,?\s+(\d{4})$/)) && MONTHS[m[1]]) return { ok:true, y:+m[2], m:MONTHS[m[1]], raw:s, fmt:'month-year' };
  if((m = low.match(/^(\d{1,2})\s*[\/.\-]\s*(\d{4})$/)) && +m[1] >= 1 && +m[1] <= 12) return { ok:true, y:+m[2], m:+m[1], raw:s, fmt:'numeric' };
  if((m = low.match(/^(\d{4})\s*[\/.\-]\s*(\d{1,2})$/)) && +m[2] >= 1 && +m[2] <= 12) return { ok:true, y:+m[1], m:+m[2], raw:s, fmt:'numeric' };
  if((m = low.match(/^(\d{4})$/))) return { ok:true, y:+m[1], m:null, raw:s, fmt:'year' };
  if((m = low.match(/^(spring|summer|fall|autumn|winter)\s+(\d{4})$/))) return { ok:true, y:+m[2], m:SEASONS[m[1]], raw:s, fmt:'season', fuzzy:true };
  return { ok:false, raw:s };
}
function monthIndex(d, today, isEnd){
  if(!d || !d.ok) return null;
  if(d.present){ var t = today || new Date(); return t.getFullYear() * 12 + t.getMonth(); }
  return d.y * 12 + ((d.m || (isEnd ? 12 : 1)) - 1);
}
function splitRange(dates){
  var s = clean(dates); if(!s) return ['', ''];
  var sp = s.split(/\s+(?:–|—|-|to|until)\s+/i);
  if(sp.length >= 2) return [clean(sp[0]), clean(sp.slice(1).join(' '))];
  var m = s.match(/^(\d{4})\s*[–—-]\s*(\d{4}|present|current|now)$/i);
  if(m) return [m[1], m[2]];
  return [s, ''];
}
function entryRange(en, today){
  var s = parseDate(en.start), e = parseDate(en.end);
  if(!clean(en.start) && !clean(en.end)) return { ok:false, missing:true, s:s, e:e };
  var si = monthIndex(s, today, false);
  var ei = clean(en.end) ? monthIndex(e, today, true) : (s.ok ? monthIndex(s, today, true) : null);
  return { ok: s.ok && (e.ok || !clean(en.end)), s:s, e:e, si:si, ei:ei, present: !!e.present, noEnd: !clean(en.end) };
}
function fmtSpan(months){
  if(months == null || months < 0) return '';
  if(months < 12) return months + ' mo';
  var y = Math.floor(months / 12), mo = months % 12;
  return y + ' yr' + (y > 1 ? 's' : '') + (mo >= 6 ? '+' : '');
}

/* ----------------------------------------------------------- resume model */
function stripSentence(x){ return clean(x).replace(/^[\-•*▪●>]+\s*/, '').replace(/[.;]+$/, ''); }
// Abbreviations a sentence never ends on ("ext. 4410", "approx. 30%", "No. 1", "Dr. Patel", "Jan. 2020", "U.S. Army").
var ABBREV = ('ext approx appx no nos num dr mr mrs ms mx prof rev hon sr jr st ave blvd rd mt ft inc ltd llc co corp dept est etc vs viz al fig ref ed eds vol pp ch sec apt '
  + 'jan feb mar apr jun jul aug sep sept oct nov dec mon tue tues wed thu thur thurs fri sat sun min max avg tel ph phd mba ba bs ms ma bsc msc gov univ assn intl natl dist').split(' ');
function sentenceSplit(line){
  var out = [], start = 0, re = /([.;!])\s+(?=[A-Z0-9"“(])/g, m;
  while((m = re.exec(line))){
    var before = line.slice(Math.max(start, m.index - 48), m.index), last = (before.match(/([A-Za-z.]+)$/) || ['', ''])[1].toLowerCase().replace(/\./g, '');   // only the tail matters
    var initials = /(^|[\s(])(?:[A-Za-z]\.){1,4}[A-Za-z]?$/.test(before + (m[1] === '.' ? '.' : ''));
    if(m[1] === '.' && (ABBREV.indexOf(last) >= 0 || initials || /^[A-Za-z]$/.test(last))) continue;   // "U.S. Army", "Dr. Patel", "J. Smith"
    out.push(line.slice(start, m.index + 1)); start = m.index + m[0].length;
  }
  out.push(line.slice(start));
  return out;
}
// "1. ", "2) ", "(3) ", "a. ", "iv. " at the start of a line are list markers, not words or figures.
var LIST_MARK_RE = /^\s*(?:\(?\d{1,2}[.)]|\(?[a-z][.)]|[ivx]{1,4}[.)])\s+/i;
function splitBullets(raw){
  // Lines first, then sentences inside each line - so a raw record that mixes a
  // paragraph with added lines still splits into the same bullets. A numbered list
  // ("1. Trained 5 new hires 2. Handled 50 orders") splits on its numbers.
  var s = String(raw || '').trim(), out = [];
  if(!s) return out;
  s.split(/\r?\n+/).forEach(function(line){
    if(!line.trim()) return;
    var parts = /^\s*\(?1[.)]\s+/.test(line) ? line.split(/\s+(?=\(?\d{1,2}[.)]\s+\S)/) : [line];
    parts.forEach(function(part){
      sentenceSplit(part.replace(LIST_MARK_RE, '')).forEach(function(x){ var y = stripSentence(x); if(y && !/^\(?\d{1,2}[.)]?$/.test(y)) out.push(y); });
    });
  });
  return out;
}
function isEdu(en){ return (en.type || '') === 'education'; }
function isProject(en){ return (en.type || '') === 'project'; }
function isWork(en){ return !isEdu(en) && !isProject(en); }
function isIntern(en){ return /\b(intern|internship|co-?op|apprentice|trainee)\b/i.test(en.title || ''); }
function isContract(en){ return /\b(contract|contractor|freelance|freelancer|temporary|temp|seasonal|summer|part[- ]time|volunteer|fellow|fellowship)\b/i.test((en.title || '') + ' ' + (en.org || '') + ' ' + (en.raw || '')); }

/* buildResume: one normalized resume every tool works on.
   src = { profile, session, entries (raw builder entries), doc (generated resume) }
   Each entry carries `source` - the person's OWN record (raw_description) - which is
   what every honesty check compares against. The polished document is never trusted
   as "their words": numbers it flagged as unverified are carried as `flagged`. */
function normLoose(s){ return clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function strField(v){ return (typeof v === 'string' || typeof v === 'number') ? clean(v) : ''; }
function numList(a){ return (Array.isArray(a) ? a : []).filter(function(n){ return n != null && (typeof n === 'string' || typeof n === 'number') && clean(n); }).map(function(n){ return clean(n); }); }
function buildResume(src){
  src = src || {};
  var profile = (src.profile && typeof src.profile === 'object') ? src.profile : {}, session = (src.session && typeof src.session === 'object') ? src.session : {};
  var raw = Array.isArray(src.entries) ? src.entries.filter(function(e){ return e && typeof e === 'object'; }) : [];
  var doc = (src.doc && typeof src.doc === 'object') ? src.doc : null;
  var docs = doc && Array.isArray(doc.entries) ? doc.entries : [];
  var seen = {}, docUsed = {}, docByBase = {};
  function uniqueId(base){ var id = base, n = 2; while(seen[id]){ id = base + '#' + n; n++; } seen[id] = 1; return id; }
  function hasId(d){ return d.entry_id != null && String(d.entry_id) !== ''; }
  docs.forEach(function(d, di){ if(d && typeof d === 'object' && hasId(d)) (docByBase[String(d.entry_id)] = docByBase[String(d.entry_id)] || []).push(di); });
  // Each raw entry claims ONE document entry: same id first (duplicates in order), then an id-less one with the same title + org.
  function takeDoc(base, title, org){
    var list = docByBase[base] || [], j;
    for(j = 0; j < list.length; j++) if(!docUsed[list[j]]){ docUsed[list[j]] = 1; return list[j]; }
    for(j = 0; j < docs.length; j++){
      var d = docs[j];
      if(docUsed[j] || !d || typeof d !== 'object' || hasId(d)) continue;
      if(normLoose(d.title) === normLoose(title) && normLoose(d.org) === normLoose(org)){ docUsed[j] = 1; return j; }
    }
    return -1;
  }
  var strList = function(a){ return (Array.isArray(a) ? a : []).filter(function(b){ return typeof b === 'string' && clean(b); }).map(clean); };
  var entries = raw.map(function(r, i){
    var base = (r.id != null && String(r.id) !== '') ? String(r.id) : ('e' + i);
    var id = uniqueId(base), title = strField(r.title), org = strField(r.org);
    var di = takeDoc(base, title, org), d = di >= 0 ? docs[di] : null;
    var rawText = typeof r.raw_description === 'string' ? r.raw_description : (r.raw_description == null ? '' : String(r.raw_description));
    var rawSplit = splitBullets(rawText), docBullets = d ? strList(d.bullets) : [];
    // An unpolished fallback (the whole description as ONE bullet) is just their own words - split it properly.
    if(docBullets.length === 1 && rawSplit.length > 1 && normLoose(docBullets[0]) === normLoose(rawText)) docBullets = rawSplit;
    return {
      id: id, rawId: (r.id != null && String(r.id) !== '') ? r.id : null, rawIndex: i, docIndex: di, type: String(r.entry_type || 'work').toLowerCase(),
      title: title, org: org, start: strField(r.start_date), end: strField(r.end_date),
      bullets: docBullets.length ? docBullets : rawSplit, raw: rawText, source: rawText,
      flagged: d ? numList(d.flagged_numbers) : []
    };
  });
  if(!raw.length && docs.length){
    entries = [];
    docs.forEach(function(d, i){
      if(!d || typeof d !== 'object') return;
      var sp = splitRange(d.dates), b = strList(d.bullets);
      entries.push({ id: uniqueId(hasId(d) ? String(d.entry_id) : ('d' + i)), rawId: null, rawIndex: -1, docIndex: i, type: String(d.entry_type || 'work').toLowerCase(), title: strField(d.title), org: strField(d.org),
        start: sp[0], end: sp[1], bullets: b, raw: b.join(' '), source: '', flagged: numList(d.flagged_numbers) });
    });
  }
  var skills = uniq(String(typeof profile.skills === 'string' ? profile.skills : Array.isArray(profile.skills) ? profile.skills.join(', ') : '').split(/[,;\n]/).map(clean).filter(Boolean));
  var summary = doc && typeof doc.summary_line === 'string' ? clean(doc.summary_line) : '';
  return {
    contact: { name: strField(profile.fullName), email: strField(session.email || profile.email), phone: strField(profile.phone), loc: strField(profile.loc) },
    summary: summary,
    summaryFlagged: summaryUnverified(summary, entries, profile, doc),
    target: clean([strField(profile.northstar), strField(profile.finalidea)].join(' ')),
    northstar: strField(profile.northstar),
    skills: skills,
    entries: entries
  };
}
// A summary is checked against EVERYTHING the person told us - every role's own words, their profile, and
// what their dates prove (the years, how long each role lasted, the months they actually worked - never school
// time or gaps as "experience") - and a count of roles or employers only where it is one ("held 3 roles",
// "across two cafés"), never as a number for anything else.
var ROLE_COUNT_AFTER = /^[\s-]*(?:different\s+|distinct\s+|separate\s+|previous\s+|prior\s+|past\s+|consecutive\s+|progressive\s+)?(?:roles?|positions?|jobs?|companies|employers|organi[sz]ations|workplaces|internships?|stints?|posts?)\b/i;
var EMPLOYER_COUNT = /^[\s-]*(?:different\s+|separate\s+|local\s+|independent\s+|busy\s+)?(?:companies|employers|organi[sz]ations|businesses|firms|agencies|caf[eé]s|coffee\s+shops|shops|restaurants|stores|schools|hospitals|clinics|hotels|bakeries|bars|retailers|brands|nonprofits|startups)\b/i;
function workedMonths(entries, today){
  var set = {}, n = 0;
  entries.forEach(function(e){ var r = entryRange(e, today); if(r.si == null || r.ei == null || r.ei < r.si || r.ei - r.si > 1200) return; for(var x = r.si; x <= r.ei; x++) if(!set[x]){ set[x] = 1; n++; } });
  return n;
}
function summaryUnverified(summary, entries, profile, doc){
  if(!clean(summary)) return [];
  var work = entries.filter(isWork), nonEdu = entries.filter(function(e){ return !isEdu(e); }), months = workedMonths(work);
  var facts = nonEdu.map(function(e){ return entryFactText(e); }).concat(entries.filter(isEdu).map(function(e){ return entryFactText(e, null, true); })).filter(Boolean);
  if(months) facts = facts.concat(durFacts(months));
  var src = entries.map(function(e){ return [sourceFor(e), e.title, e.org].join(' '); }).join(' \n ')
    + ' \n ' + ['northstar', 'finalidea', 'skills', 'stage', 'achievements', 'studentAchievements', 'gpa', 'testScores'].map(function(k){ return strField(profile[k]); }).join(' \n ') + ' \n ' + facts.join(' ; ');
  var t = normNumerals(summary), counts = uniq([work.length, nonEdu.length]), orgs = uniq(work.map(function(e){ return normLoose(e.org); }).filter(Boolean)).length;
  return badClaims(srcInfo(src), numericClaims(t)).filter(function(c){
    if(c.kind !== 'num' && c.kind !== 'plus') return true;
    var rest = t.slice(c.end), lead = t.slice(Math.max(0, c.index - 16), c.index);
    if(counts.indexOf(c.val) >= 0 && ROLE_COUNT_AFTER.test(rest)) return false;
    if((c.val === orgs || counts.indexOf(c.val) >= 0) && EMPLOYER_COUNT.test(rest) && /\b(?:across|at|in|for|with|between|among)\s+$/i.test(lead)) return false;
    return true;
  }).map(function(c){ return c.shown || c.text; });
}
function numberTokens(text){ return (normNumerals(text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(function(n){ return n.replace(/,/g, ''); }); }
// What counts as the person's own words for an entry: their raw record. With no raw
// record (a document-only resume), the bullets themselves minus any number the
// document already flagged as unverified.
// An entry from their builder whose description they cleared still has no number of theirs in it.
function hasRecord(en){ return !!en && ((en.rawIndex != null && en.rawIndex >= 0) || !!clean(en.source)); }
function sourceFor(en){
  if(!en) return '';
  if(hasRecord(en)) return String(en.source || '');
  return stripClaims((en.bullets || []).join(' \n '), en.flagged || []);
}
// Numbers in a line that the person never stated: flagged by the generated document, or
// simply absent from their own record for that role. These are never treated as theirs.
function unverifiedIn(text, en){
  if(!en || !clean(text)) return [];
  var c = en.__unv;
  if(!c || c.src !== en.source || c.fl !== en.flagged || c.st !== en.start || c.en !== en.end){
    c = { src: en.source, fl: en.flagged, st: en.start, en: en.end, map: {} };
    try{ Object.defineProperty(en, '__unv', { value: c, enumerable: false, configurable: true, writable: true }); }catch(e){ c = null; }
  }
  var key = String(text);
  if(c && Object.prototype.hasOwnProperty.call(c.map, key)) return c.map[key].slice();
  var res = computeUnverified(key, en);
  if(c) c.map[key] = res;
  return res.slice();
}
/* Per-LINE verification. A polished line is checked against the line(s) of their record it
   was written from - not the whole role - so a number moved from one line to another ("Managed
   3 stores" / "Coached 12 baristas" -> "Managed 12 stores") is caught. Lines pair by shared
   wording (numbers ignored); when no line clearly matches, the whole role is the source. */
var CONTENT_STOP = { the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, to: 1, for: 1, in: 1, on: 1, at: 1, with: 1, by: 1, from: 1, as: 1, into: 1, per: 1, each: 1, every: 1,
  our: 1, my: 1, their: 1, his: 1, her: 1, its: 1, this: 1, that: 1, these: 1, those: 1, was: 1, were: 1, is: 1, are: 1, be: 1, been: 1, it: 1, i: 1, we: 1,
  over: 1, under: 1, about: 1, around: 1, across: 1, during: 1, while: 1, through: 1, via: 1, using: 1, than: 1, more: 1, less: 1, up: 1, out: 1, new: 1 };
// Number words never decide which line a sentence came from - the figures are what's being checked.
var COUNT_WORDS = {};
(NUMW + '|' + ORD_ALT + '|dozens|hundreds|thousands|millions|billions|half|halves|twice|thrice|couple|single|percent|several|many|multiple|various|numerous').split('|').forEach(function(w){ COUNT_WORDS[w] = 1; });
// A light stemmer: "managed" = "manages" = "manage", "stores" = "store", "running" = "run".
var _stemCache = {}, _stemN = 0;
function cstem(w){
  var key = String(w);
  if(Object.prototype.hasOwnProperty.call(_stemCache, key)) return _stemCache[key];
  if(++_stemN > 20000){ _stemCache = {}; _stemN = 1; }
  return (_stemCache[key] = cstem0(key));
}
function cstem0(w){
  w = String(w).toLowerCase().replace(/[^a-z0-9]/g, '');
  var w0 = w;
  if(w.length > 4) w = w.replace(/(?:ing|ed|es|s)$/, '');
  else if(w.length > 3) w = w.replace(/s$/, '');
  if(w === w0 && w.length > 3) w = w.replace(/e$/, '');   // "employee" -> "employe" = "employees" -> "employe"
  if(w.length >= 4 && /([b-df-hj-np-tv-z])\1$/.test(w)) w = w.slice(0, -1);
  return w;
}
// Words a rewrite swaps freely ("Oversaw 12 locations" was written from "Managed 3 stores").
var SYNONYMS = {};
[['manage', 'manage managed managing oversee oversaw overseeing supervise supervised supervising lead led leading head headed'],
 ['run', 'run ran running operate operated operating'],
 ['store', 'store location branch site shop outlet'],
 ['staff', 'staff employee team crew worker hire hired associate personnel colleague coworker teammate'],
 ['customer', 'customer guest client patron shopper visitor'],
 ['session', 'class workshop session lesson seminar'],
 ['teach', 'teach taught train trained training coach coached mentor mentored tutor tutored instruct instructed educate educated onboard onboarded'],
 ['sale', 'sale sales sell sold selling revenue income'],
 ['cost', 'cost expense spend spending spent'],
 ['reduce', 'cut cutting reduce reduced lower lowered decrease decreased trim trimmed slash slashed shrink shrank'],
 ['increase', 'grow grew growing increase increased boost boosted expand expanded lift lifted'],
 ['build', 'build built create created launch launched develop developed start started establish established'],
 ['handle', 'handle handled process processed answer answered respond responded field fielded resolve resolved'],
 ['help', 'help helped assist assisted support supported aid aided'],
 ['make', 'make made prepare prepared craft crafted brew brewed cook cooked'],
 ['drink', 'drink beverage'],
 ['day', 'day daily'], ['night', 'night nightly'], ['week', 'week weekly'], ['month', 'month monthly'], ['year', 'year yearly annual annually'],
 ['region', 'district region area regionwide territory zone regional'],
 ['issue', 'complaint issue problem concern escalation'],
 ['greet', 'greet greeted welcome welcomed'],
 ['organize', 'organize organized arrange arranged coordinate coordinated plan planned schedule scheduled']
].forEach(function(g){ g[1].split(' ').forEach(function(w){ SYNONYMS[cstem(w)] = g[0]; }); });
// Memoized (read-only results): the same lines are compared many times while a resume is checked.
var _csCache = {}, _csN = 0;
function contentSet(text){
  var key = String(text);
  if(Object.prototype.hasOwnProperty.call(_csCache, key)) return _csCache[key];
  if(++_csN > 4000){ _csCache = {}; _csN = 1; }
  return (_csCache[key] = contentSet0(key));
}
function contentSet0(text){
  var set = {};
  words(String(text).toLowerCase()).forEach(function(w){
    var bare = w.replace(/[^a-z0-9-]/g, '');
    if(!/[a-z]/.test(bare) || CONTENT_STOP[bare] || COUNT_WORDS[bare]) return;
    bare.split('-').forEach(function(part){
      if(!part || COUNT_WORDS[part] || CONTENT_STOP[part] || /^\d/.test(part)) return;
      var st = cstem(part); if(!st || CONTENT_STOP[st] || /^\d/.test(st)) return;
      set[SYNONYMS[st] || st] = 1;
    });
  });
  return set;
}
function contentJaccard(a, b){ return setJaccard(contentSet(a), contentSet(b)); }
// How often a figure happens: "15 rooms per shift" -> shift, "40 calls daily" -> day, "3x weekly" -> week.
var RATE_WORD = { daily: 'day', nightly: 'night', weekly: 'week', monthly: 'month', yearly: 'year', annually: 'year', hourly: 'hour', quarterly: 'quarter', yr: 'year', hr: 'hour' };
function claimRate(t, c){
  var s = String(t).slice(c.end, c.end + 70).toLowerCase();
  var m = s.match(/^[\s-]*(?:[a-z][a-z'-]*\s+){0,3}?(?:(?:a|an|per|each|every)\s+|\/\s*)(day|night|week|month|year|yr|shift|hour|hr|session|class|game|weekend|semester|quarter|term|visit)s?\b/)
    || s.match(/^[\s-]*(?:[a-z][a-z'-]*\s+){0,3}?(daily|nightly|weekly|monthly|yearly|annually|hourly|quarterly)\b/);
  return m ? (RATE_WORD[m[1]] || m[1]) : null;
}
// Broad kinds of things a figure can count - a figure may move between words of one kind ("4 cashiers" -> "4 team
// members") but not between kinds ("4 cashiers" -> "4 stores").
var NOUN_CAT_WORDS = {
  worker: 'staff employee team crew worker hire associate personnel colleague coworker teammate cashier barista server waiter waitress intern volunteer rep representative agent nurse aide assistant tutor teacher coach leader manager supervisor trainee apprentice cook chef driver technician engineer analyst developer designer writer editor researcher specialist coordinator clerk bartender host hostess dishwasher housekeeper lifeguard counselor mentor player athlete guard officer salesperson stocker picker packer',
  client: 'customer guest client patron shopper visitor patient student learner kid child children camper resident family families user subscriber follower attendee participant caller applicant donor buyer tenant passenger reader viewer listener',
  place: 'store location branch site shop outlet department office restaurant cafe warehouse clinic school classroom campus facility plant hospital hotel venue city state country market region district area territory zone building',
  item: 'order ticket call request case delivery shipment package box pallet item product sku report dashboard project campaign event post article video account deal contract application document file record invoice transaction return exchange meal drink beverage table room task feature bug test release sprint page website app lesson session class workshop seminar course module email message letter form claim'
};
var _nounCat = null;
function nounCat(n){
  if(!_nounCat){ _nounCat = {}; Object.keys(NOUN_CAT_WORDS).forEach(function(cat){ NOUN_CAT_WORDS[cat].split(' ').forEach(function(w){ var st = cstem(w); _nounCat[SYNONYMS[st] || st] = cat; }); }); }
  return n ? (_nounCat[n] || null) : null;
}
// Do two figures count the same kind of thing? Same word, a shared word ("events" / "community events"), or one kind.
function nounsMatch(a, b){
  var na = a.nouns || [], nb = b.nouns || [];
  if(!na.length || !nb.length) return !na.length && !nb.length;
  if(na.some(function(x){ return nb.indexOf(x) >= 0; })) return true;
  var ca = nounCat(na[0]), cb = nounCat(nb[0]); return !!ca && ca === cb;
}
// The thing a figure counts: "5 new hires" -> staff, "50 orders" -> order, "12 across" -> nothing.
var BIND_SKIP = { new: 1, full: 1, part: 1, different: 1, unique: 1, regular: 1, total: 1, additional: 1, key: 1, major: 1, active: 1, other: 1, extra: 1,
  local: 1, small: 1, large: 1, senior: 1, junior: 1, returning: 1, repeat: 1, first: 1, 'full-time': 1, 'part-time': 1, recurring: 1, existing: 1, incoming: 1, potential: 1 };
function claimNoun(t, c){
  var m = String(t).slice(c.end, c.end + 80).toLowerCase().match(/^[\s-]*([a-z][a-z'-]*)(?:\s+([a-z][a-z'-]*))?(?:\s+([a-z][a-z'-]*))?(?:\s+([a-z][a-z'-]*))?/);
  c.nouns = [];
  if(!m) return null;
  for(var j = 1; j <= 4 && c.nouns.length < 2; j++){
    var w = m[j]; if(!w) break;
    if(BIND_SKIP[w]) continue;
    if(CONTENT_STOP[w] || COUNT_WORDS[w] || /^(?:a|an|per|each|every|percent|times|x)$/.test(w)) break;
    var st = cstem(w); if(!st) break;
    c.nouns.push(SYNONYMS[st] || st);
  }
  return c.nouns[0] || null;
}
// A figure moved to another thing within the same words: "Trained 5 new hires and handled 50 orders" ->
// "Trained 50 new hires". Their words tie this thing to a different figure, and tie this figure to something
// else - or leave it untied, in a line that never mentions this thing ("...latte art, 12 in total").
function swappedClaims(srcText, srcClaims, candText, candClaims){
  var byVal = {}, byNoun = {}, loose = {}, counted = function(c){ return (c.kind === 'num' || c.kind === 'plus') && c.val != null && isFinite(c.val); };
  var text = String(srcText), ctxCache = {};
  var lineCtx = function(i){   // the words of the line a figure sits in (a window of a very long line), computed once per line
    var a = text.lastIndexOf('\n', i - 1) + 1, b = text.indexOf('\n', i); if(b < 0) b = text.length;
    if(b - a > 900){ var w = a + Math.max(0, Math.floor((i - a) / 300) * 300 - 300); b = Math.min(b, w + 900); a = w; }
    var key = a + ':' + b; return ctxCache[key] || (ctxCache[key] = { key: key, set: contentSet(text.slice(a, b)) });
  };
  var merged = {};
  (srcClaims || []).forEach(function(c){
    if(!counted(c)) return; var n = claimNoun(text, c), v = canonNum(c.val);
    if(!n){ var ctx = lineCtx(c.index), mk = v + '|' + ctx.key; if(merged[mk]) return; merged[mk] = 1; loose[v] = loose[v] || {}; for(var k in ctx.set) loose[v][k] = 1; return; }
    (byVal[v] = byVal[v] || {})[n] = 1; (byNoun[n] = byNoun[n] || {})[v] = 1;
  });
  return (candClaims || []).filter(function(c){
    if(!counted(c)) return false;
    var n = claimNoun(candText, c), v = canonNum(c.val);
    if(!n || !byNoun[n] || byNoun[n][v]) return false;
    return (!!byVal[v] && !byVal[v][n]) || (!byVal[v] && !!loose[v] && !loose[v][n]);
  });
}
// A figure their words give for one kind of thing, now counting another kind ("Supervised 4 cashiers" -> "Supervised 4
// stores"), or at another rate ("15 rooms per shift" -> "per hour"). Only when every place they gave that figure disagrees.
function rebindClaims(info, claims){
  return (claims || []).filter(function(c){
    if((c.kind !== 'num' && c.kind !== 'plus') || c.val == null) return false;
    var same = (info.countIdx || {})[canonNum(c.val)] || [];
    if(!same.length) return false;
    var cc = nounCat(c.noun), nounClash = !!cc && same.every(function(s){ var sc = nounCat(s.noun); return !!sc && sc !== cc && !nounsMatch(s, c); });
    var rateClash = !!c.rate && same.every(function(s){ return !!s.rate && s.rate !== c.rate; });
    return nounClash || rateClash;
  });
}
function setJaccard(A, B){ var inter = 0, uni = 0, k; for(k in A){ uni++; if(B[k]) inter++; } for(k in B){ if(!A[k]) uni++; } return uni ? inter / uni : 0; }
function lineSegments(en){
  var c = en.__segs;
  if(!c || c.src !== en.source){
    c = { src: en.source, segs: splitBullets(en.source).map(function(x){ return { text: x, set: contentSet(x) }; }) };
    try{ Object.defineProperty(en, '__segs', { value: c, enumerable: false, configurable: true, writable: true }); }catch(e){}
  }
  return c.segs;
}
// The line(s) of their record a polished line was written from: the best match, any line nearly as close, and
// any other line it draws its own words from (a merge: "Managed the counter" + "Trained 4 cashiers"). A line whose
// words are all already covered adds nothing but a figure - that's a figure moving, not a merge. With no line
// clearly matching, the whole role - flagged as a fallback.
function lineMatch(text, en){
  var segs = lineSegments(en), cs = contentSet(text);
  if(!segs.length) return { text: String(en.source || ''), fallback: true };
  var scored = segs.map(function(sg){ return { sg: sg, sim: setJaccard(cs, sg.set) }; }).sort(function(a, b){ return b.sim - a.sim; });
  var best = scored[0].sim;
  if(best < 0.1) return { text: String(en.source), fallback: true };
  var th = Math.max(0.25, best - 0.2), covered = {}, inc = [];
  var take = function(x){ inc.push(x); for(var k in x.sg.set) if(cs[k]) covered[k] = 1; };
  scored.forEach(function(x, i){
    if(i === 0 || x.sim >= th){ take(x); return; }
    if(x.sim < 0.1) return;
    for(var k in x.sg.set) if(cs[k] && !covered[k]){ take(x); return; }
  });
  return { text: inc.map(function(x){ return x.sg.text; }).join(' \n '), fallback: false };
}
function lineSourceFor(text, en){ return lineMatch(text, en).text; }
// Facts their dates prove, written so they can only support dates and durations - never a count: the years a
// role spans ("in 2019") and how long it lasted ("for 3 years" = "for 36 months"). A length rounds up only within
// two months; otherwise the rounded figure is "about" ("18 months" is "about 2 years", never "2+ years").
function durFacts(m){
  var out = ['for ' + m + ' months']; if(m > 1) out.push('for ' + (m - 1) + ' months');
  if(m >= 12){ var fl = Math.floor(m / 12), ro = Math.round(m / 12); out.push('for ' + fl + ' years'); if(ro !== fl) out.push((ro * 12 - m <= 2 ? 'for ' : 'for about ') + ro + ' years'); }
  return out;
}
function entryFactText(en, today, yearsOnly){
  if(!en) return '';
  var r = entryRange(en, today), out = [];
  if(r.si != null && r.ei != null && r.ei >= r.si){
    for(var y = Math.floor(r.si / 12); y <= Math.floor(r.ei / 12) && out.length < 80; y++) out.push('in ' + y);
    if(!yearsOnly) out = out.concat(durFacts(r.ei - r.si + 1));
  } else {
    [r.s, r.e].forEach(function(d){ if(d && d.ok && d.y) out.push('in ' + d.y); });
  }
  return out.join(' ; ');
}
function dateFacts(en){ return entryFactText(en); }
function digitsIn(s){ return (String(s).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(function(d){ return d.replace(/,/g, ''); }); }
function computeUnverified(text, en){
  var t = normNumerals(text), claims = numericClaims(t);
  if(!claims.length) return [];
  var bad, flagged = (en.flagged || []).map(function(n){ return normNumerals(n).replace(/,/g, ''); });
  var byFlag = function(c){ return digitsIn(c.text).some(function(d){ return flagged.indexOf(d) >= 0; }); };
  if(hasRecord(en)){
    var lm = lineMatch(t, en), info = srcInfo(lm.text + ' \n ' + entryFactText(en) + ' \n ' + clean(en.title) + ' \n ' + clean(en.org));   // their title and employer are their words too ("7-Eleven", "Level 2 Support")
    bad = badClaims(info, claims);
    swappedClaims(info.norm, info.claims, t, claims).concat(rebindClaims(info, claims)).forEach(function(c){ if(bad.indexOf(c) < 0) bad.push(c); });
    // no line clearly matches, so the whole role stood in - but what the document flagged itself stays unverified
    if(lm.fallback && flagged.length) claims.forEach(function(c){ if(bad.indexOf(c) < 0 && byFlag(c)) bad.push(c); });
  } else {
    // a document-only resume: no record of their own words, so trust the document except what it flagged itself
    bad = claims.filter(byFlag);
  }
  return outermost(bad).map(function(c){ return c.shown || c.text; });
}
// What an honesty check may treat as the person's words for a line: the verified part of the line itself, the
// line(s) of their record it was clearly written from, and what their dates prove.
function bulletSource(b){
  if(!b) return '';
  var u = b.unverified || unverifiedIn(b.text, b.entry), own = u && u.length ? stripClaims(b.text, u) : String(b.text || '');
  if(!b.entry) return own;
  var facts = entryFactText(b.entry) + ' \n ' + clean(b.entry.title) + ' \n ' + clean(b.entry.org);
  if(!hasRecord(b.entry)) return own + (facts ? ' \n ' + facts : '');
  var lm = lineMatch(normNumerals(b.text), b.entry);
  return own + (lm.fallback ? '' : ' \n ' + lm.text) + (facts ? ' \n ' + facts : '');
}
function cloneResume(r){ return JSON.parse(JSON.stringify(r)); }
function allBullets(resume){
  var out = [];
  (resume.entries || []).forEach(function(en, ei){ (en.bullets || []).forEach(function(b, bi){ out.push({ entryId: en.id, ei: ei, idx: bi, text: b, entry: en, unverified: unverifiedIn(b, en) }); }); });
  return out;
}
function recencyOrder(resume, today){
  // most recent first: by end (present counts as now), then start; undated keep input order after dated
  var list = (resume.entries || []).map(function(en, i){ var r = entryRange(en, today); return { en: en, i: i, key: (r.ei != null ? r.ei : (r.si != null ? r.si : null)) }; });
  var dated = list.filter(function(x){ return x.key != null; }).sort(function(a, b){ return b.key - a.key || a.i - b.i; });
  var undated = list.filter(function(x){ return x.key == null; });
  var order = dated.concat(undated), rank = {};
  order.forEach(function(x, k){ rank[x.en.id] = k; });
  return { order: order.map(function(x){ return x.en; }), rank: rank };
}
function mostRecentWork(resume, today){
  var o = recencyOrder(resume, today).order;
  return o.filter(isWork)[0] || o[0] || null;
}

/* --------------------------------------------------------------- lexicons */
var STRONG = ('accelerated achieved analyzed analysed architected audited automated boosted built championed coached collaborated completed '
  + 'configured consolidated coordinated created cut debugged decreased defined delivered deployed designed developed directed doubled drove '
  + 'edited eliminated engineered established evaluated executed expanded facilitated forecasted founded generated grew guided halved headed '
  + 'hired identified implemented improved increased initiated integrated introduced investigated launched led lowered maintained managed mapped '
  + 'mentored migrated modeled negotiated onboarded optimized orchestrated organized organised oversaw partnered piloted planned presented prioritized '
  + 'produced programmed proposed prototyped published raised rebuilt recruited redesigned reduced refactored reorganized researched resolved '
  + 'restructured revamped saved scaled secured served shipped simplified sold solved spearheaded standardized streamlined strengthened supervised '
  + 'surpassed taught tested trained transformed translated tripled tutored upgraded won wrote ran exceeded converted retained cleaned processed '
  + 'answered handled greeted stocked tracked updated reviewed responded communicated operated scheduled posted hosted').split(' ');
var RESULT_VERBS = ('increased reduced grew saved cut boosted doubled tripled improved accelerated decreased eliminated generated raised won secured '
  + 'expanded scaled launched shipped delivered achieved exceeded surpassed lowered halved shortened converted retained').split(' ');
var WEAK = ['responsible for', 'helped to', 'helped with', 'helped', 'worked on', 'worked with', 'tasked with', 'duties included', 'duties',
  'assisted with', 'assisted in', 'assisted', 'involved in', 'participated in', 'was in charge of', 'in charge of', 'was responsible',
  'handled various', 'took part in', 'did'];
var FILLER = ['very', 'really', 'just', 'basically', 'actually', 'various', 'stuff', 'things', 'a lot of', 'lots of', 'several', 'etc',
  'successfully', 'effectively', 'efficiently', 'in order to'];
var CLICHES = ['results-driven', 'results driven', 'results-oriented', 'team player', 'go-getter', 'go getter', 'detail-oriented', 'detail oriented',
  'hard-working', 'hardworking', 'self-starter', 'self starter', 'synergy', 'think outside the box', 'outside the box', 'dynamic', 'passionate',
  'highly motivated', 'proactive', 'value-add', 'leveraged', 'leverage', 'guru', 'ninja', 'rockstar', 'rock star', 'thought leader',
  'proven track record', 'track record of success', 'excellent communication skills', 'strong work ethic', 'fast learner', 'quick learner',
  'above and beyond', 'wear many hats', 'wore many hats', 'best-in-class', 'world-class'];
var BASE_PRESENT = ('manage lead develop create build design handle support work coordinate train assist help maintain analyze analyse serve '
  + 'oversee run organize organise plan write prepare process provide ensure monitor conduct perform implement deliver drive own answer greet '
  + 'clean stock teach sell track update review respond resolve communicate collaborate partner mentor supervise schedule operate produce '
  + 'research test edit post').split(' ');
var IRREGULAR_PAST = ('led built ran won cut grew made wrote sold taught drove began brought held kept found gave got met paid put read sent set '
  + 'spoke spent stood took thought told understood oversaw undertook overcame became sought spun spread upheld').split(' ');
var RECOGNITION = /^(was|were)\s+(promoted|awarded|selected|elected|recognized|recognised|nominated|invited|chosen|hired|named|ranked|honored|honoured|accepted|admitted)\b/i;

function firstWord(t){ return (clean(t).split(' ')[0] || '').replace(/[^A-Za-z\-']/g, '').toLowerCase(); }
function isPastVerb(w){ return !!w && (/[a-z]ed$/.test(w) || IRREGULAR_PAST.indexOf(w) >= 0 || STRONG.indexOf(w) >= 0); }
// Words that open a line as a verb OR as a noun/adjective ("Lead trainer", "Work study position",
// "Support staff"). They only count as a present-tense verb when an object follows.
var AMBIG_OPENERS = ('work lead support plan design process research test review update schedule post train help run drive build clean stock '
  + 'track answer edit produce partner mentor monitor host own coach sell serve teach handle check').split(' ');
var OBJ_START = /^(the|a|an|our|my|their|his|her|its|this|that|these|those|all|every|each|new|existing|incoming|daily|weekly|monthly|multiple|several|various|both|over|more|up|out)$/;
// Nouns that turn the words before them into a title or a field ("Recruiting coordinator", "Support services manager").
var ROLE_NOUN = /^(coordinator|coordinators|assistant|manager|specialist|intern|internship|lead|leader|member|associate|representative|rep|technician|tech|analyst|officer|worker|staff|team|department|dept|clerk|supervisor|director|administrator|admin|consultant|engineer|developer|designer|position|role|duties|tasks|program|programs|software|systems|classes|coursework|degree|major|minor|club|committee|crew|desk)$/;
function nextWord(t, k){ return (words(t)[k || 1] || '').toLowerCase().replace(/[^a-z0-9$£€%+]/g, ''); }
function looksLikeObject(t, k){
  var nx = nextWord(t, k);
  if(!nx) return false;
  if(OBJ_START.test(nx) || /^[$£€\d]/.test(nx)) return true;
  return /^[a-z]{3,}s$/.test(nx) && !/(ss|us|is|ics)$/.test(nx) && !ROLE_NOUN.test(nx) && !ROLE_NOUN.test(nextWord(t, (k || 1) + 1));   // "Lead servers" yes; "Support services coordinator" no
}
function isPresentVerbOpener(text){
  var fw = firstWord(text);
  if(BASE_PRESENT.indexOf(fw) < 0) return false;
  if(AMBIG_OPENERS.indexOf(fw) < 0) return true;
  return looksLikeObject(text, 1);
}

var FILLER_RE = FILLER.map(function(f){ return { f: f, re: new RegExp('(^|[^a-z])' + escRe(f) + '([^a-z]|$)') }; });
var _abCache = {}, _abN = 0;
function analyzeBullet(text){
  var key = String(text == null ? '' : text);
  if(Object.prototype.hasOwnProperty.call(_abCache, key)) return _abCache[key];
  if(_abN > 4000){ _abCache = {}; _abN = 0; }
  _abN++;
  return (_abCache[key] = analyzeBulletRaw(key));
}
function analyzeBulletRaw(text){
  var t = clean(text), low = t.toLowerCase(), fw = firstWord(t);
  var r = { text: t, words: words(t).length, verb: fw, quantified: false, weakOpener: null, passive: false, filler: [],
    pronoun: false, cliches: [], resultVerb: false, opener: 'neutral', presentTense: false, score: 100, issues: [] };
  r.quantified = /\d/.test(t) || /\b(two|three|four|five|six|seven|eight|nine|ten|dozen|dozens|hundreds?|thousands?|millions?|half|halved|double[ds]?|triple[ds]?|quadrupled|twice)\b/i.test(t);
  for(var i = 0; i < WEAK.length; i++){ if(low === WEAK[i] || low.indexOf(WEAK[i] + ' ') === 0){ r.weakOpener = WEAK[i]; break; } }
  r.passive = !RECOGNITION.test(low) && /\b(was|were|been|being|is|are|got)\s+(\w+ed|built|made|done|given|taken|shown|run|written|chosen|sold|taught|held|kept)\b/.test(low);
  r.filler = FILLER_RE.filter(function(x){ return x.re.test(low); }).map(function(x){ return x.f; });
  r.pronoun = /(^|[\s(])(I|me|my|mine|we|our|ours|us|We|Our|My|Me)(?=[\s,.;:!?)]|$)/.test(t);
  r.cliches = CLICHES.filter(function(c){ return low.indexOf(c) >= 0; });
  r.resultVerb = RESULT_VERBS.indexOf(fw) >= 0 || (r.quantified && /\b(increas|reduc|grew|growth|sav|cut|boost|doubl|tripl|improv|accelerat|decreas|eliminat|generat|rais|exceed|surpass|lower|halv|shorten|convert|retain)\w*/.test(low));
  r.presentTense = isPresentVerbOpener(t);
  r.opener = r.weakOpener ? 'weak' : isPastVerb(fw) ? 'strong' : /ing$/.test(fw) ? 'gerund' : r.presentTense ? 'present' : 'neutral';

  var s = 100;
  if(r.weakOpener){ s -= 25; r.issues.push({ key: 'weak', text: 'Opens with "' + r.weakOpener + '" - lead with what you did.' }); }
  if(r.passive){ s -= 15; r.issues.push({ key: 'passive', text: 'Passive voice - make yourself the one acting.' }); }
  if(!r.quantified){ s -= 20; r.issues.push({ key: 'number', text: 'No number - how many, how much, how often?' }); }
  if(r.filler.length){ s -= Math.min(20, r.filler.length * 7); r.issues.push({ key: 'filler', text: 'Filler: ' + r.filler.join(', ') + '.' }); }
  if(r.words > 32){ s -= 10; r.issues.push({ key: 'long', text: 'Long (' + r.words + ' words) - aim for one line under ~25.' }); }
  else if(r.words < 4){ s -= 10; r.issues.push({ key: 'short', text: 'Very short - add what you did and what changed.' }); }
  if(r.pronoun){ s -= 10; r.issues.push({ key: 'pronoun', text: 'First-person pronoun - resumes drop "I/we/my".' }); }
  if(r.cliches.length){ s -= Math.min(15, r.cliches.length * 8); r.issues.push({ key: 'cliche', text: 'Cliché: ' + r.cliches.join(', ') + '.' }); }
  if(r.opener === 'gerund') s -= 5;
  if(r.opener === 'neutral') s -= 8;
  r.score = clamp(s, 0, 100);
  return r;
}

/* ============================================================== 1. SCORECARD
   Explainable 0-100 across six dimensions. Every point traces to a line. */
var TARGET_STOP = ('break into company companies role roles career careers work working become land want looking position team entry level junior '
  + 'senior start starting industry field path goal someday eventually future great good best leading small large make made '
  + 'getting doing within years year build building').split(' ');

function targetTokens(resume){
  return uniq(meaningful(resume.target || '').filter(function(t){ return TARGET_STOP.indexOf(t) < 0; }));
}
function resumeText(resume){
  return [resume.summary, resume.skills.join(' ')].concat((resume.entries || []).map(function(e){ return e.title + ' ' + e.org + ' ' + e.bullets.join(' '); })).join(' ');
}

function scoreResume(resume, opts){
  opts = opts || {};
  var today = opts.today;
  var bl = allBullets(resume), n = bl.length;
  var A = bl.map(function(b){ return { b: b, a: analyzeBullet(b.text) }; });
  var fixes = [], dims = [];
  function fix(dim, w, x, issue, tool){ fixes.push({ dim: dim, weight: w, entryId: x.b.entryId, idx: x.b.idx, text: x.b.text, issue: issue, tool: tool }); }

  // 1) Impact (25) - quantified share (15, full at 60%) + result-oriented share (10, full at 50%).
  // Only numbers the person actually gave count; one nobody verified is a liability, not impact.
  var unv = A.filter(function(x){ return x.b.unverified.length; });
  var quant = A.filter(function(x){ return x.a.quantified && !x.b.unverified.length; }).length;
  var result = A.filter(function(x){ return x.a.resultVerb && !x.b.unverified.length; }).length;
  var impact = n ? Math.round(Math.min(1, (quant / n) / 0.6) * 15 + Math.min(1, (result / n) / 0.5) * 10) : 0;
  unv.forEach(function(x){ fix('impact', 6, x, 'Uses ' + x.b.unverified.join(', ') + ', which you never gave - confirm the real figure or remove it.', 'metrics'); });
  A.filter(function(x){ return !x.a.quantified; }).forEach(function(x){ fix('impact', 3, x, 'No number - how many, how much, how often?', 'metrics'); });
  var impactChecks = [
    { ok: n && quant / n >= 0.5, text: quant + ' of ' + n + ' bullets carry a number' + (n && quant / n < 0.5 ? ' (aim for half or more)' : '') },
    { ok: n && result / n >= 0.4, text: result + ' of ' + n + ' bullets describe a result, not just a duty' }
  ];
  if(unv.length) impactChecks.unshift({ ok: false, text: unv.length + ' bullet' + (unv.length > 1 ? 's use a number' : ' uses a number') + ' that isn\'t in anything you wrote - not counted until you confirm it' });
  dims.push({ key: 'impact', label: 'Impact', score: impact, max: 25, checks: impactChecks });

  // 2) Clarity (20) - per-bullet clarity averaged
  var csum = 0, weakN = 0, passN = 0, fillN = 0, proN = 0, longN = 0, clicheN = 0;
  A.forEach(function(x){
    var c = 1;
    if(x.a.weakOpener){ c -= 0.35; weakN++; fix('clarity', 4, x, 'Weak opener "' + x.a.weakOpener + '" - lead with an action verb.', 'xyz'); }
    if(x.a.passive){ c -= 0.2; passN++; fix('clarity', 2, x, 'Passive voice - make yourself the actor.', 'xyz'); }
    if(x.a.filler.length){ c -= 0.1; fillN++; }
    if(x.a.pronoun){ c -= 0.2; proN++; fix('clarity', 2, x, 'Drop the first-person pronoun.', 'xyz'); }
    if(x.a.words > 32){ c -= 0.1; longN++; fix('clarity', 1, x, 'Too long - tighten to one line.', 'xyz'); }
    if(x.a.cliches.length){ c -= 0.15; clicheN++; fix('clarity', 2, x, 'Swap the cliché for a concrete fact.', 'xyz'); }
    if(x.a.opener === 'neutral' || x.a.opener === 'gerund') c -= 0.1;
    csum += clamp(c, 0, 1);
  });
  var clarity = n ? Math.round(csum / n * 20) : 0;
  dims.push({ key: 'clarity', label: 'Clarity', score: clarity, max: 20, checks: [
    { ok: weakN === 0, text: weakN ? weakN + ' bullet' + (weakN > 1 ? 's open' : ' opens') + ' weakly ("responsible for", "helped"...)' : 'Every bullet opens with an action' },
    { ok: passN === 0 && proN === 0, text: (passN + proN) ? (passN ? passN + ' passive' : '') + (passN && proN ? ', ' : '') + (proN ? proN + ' with I/we/my' : '') : 'Active voice, no first-person pronouns' },
    { ok: fillN + clicheN === 0, text: (fillN + clicheN) ? (fillN + clicheN) + ' bullet' + ((fillN + clicheN) > 1 ? 's use' : ' uses') + ' filler or clichés' : 'No filler or clichés' },
    { ok: longN === 0, text: longN ? longN + ' bullet' + (longN > 1 ? 's run' : ' runs') + ' over ~32 words' : 'Bullets are tight' }
  ]});

  // 3) ATS-safety (15)
  var c = resume.contact || {}, ats = 0, atsChecks = [];
  var emailOk = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c.email || '');
  var phoneOk = String(c.phone || '').replace(/\D/g, '').length >= 7;
  ats += c.name ? 2 : 0; ats += emailOk ? 2 : 0; ats += phoneOk ? 1 : 0;
  atsChecks.push({ ok: !!c.name && emailOk && phoneOk, text: 'Contact: ' + [c.name ? 'name' : null, emailOk ? 'email' : null, phoneOk ? 'phone' : null].filter(Boolean).join(', ') + ((!c.name || !emailOk || !phoneOk) ? ' - missing ' + [!c.name ? 'name' : null, !emailOk ? 'email' : null, !phoneOk ? 'phone' : null].filter(Boolean).join(', ') : '') });
  var titled = resume.entries.filter(function(e){ return e.title && (e.org || isProject(e)); }).length;
  ats += resume.entries.length ? Math.round(titled / resume.entries.length * 4) : 0;
  atsChecks.push({ ok: titled === resume.entries.length && resume.entries.length > 0, text: titled + ' of ' + resume.entries.length + ' entries have a clear title and organization' });
  var workish = resume.entries.filter(function(e){ return !isProject(e); });
  var dateOk = workish.filter(function(e){ var r = entryRange(e, today); return r.ok && !r.s.fuzzy && !(r.e && r.e.fuzzy); }).length;
  ats += workish.length ? Math.round(dateOk / workish.length * 3) : 3;
  atsChecks.push({ ok: dateOk === workish.length, text: dateOk + ' of ' + workish.length + ' roles have dates an ATS can read' });
  var glyphs = bl.filter(function(b){ return /[★☆✓✔➤►▶◆■□☐☑→⇒❤✨]|[\ud83c-\udbff][\udc00-\udfff]/.test(b.text); }).length;
  ats += glyphs ? 0 : 1;
  atsChecks.push({ ok: !glyphs, text: glyphs ? glyphs + ' bullet' + (glyphs > 1 ? 's contain' : ' contains') + ' symbols or emoji some ATS garble' : 'Plain text - no symbols an ATS might drop' });
  ats += resume.skills.length ? 2 : 0;
  atsChecks.push({ ok: resume.skills.length > 0, text: resume.skills.length ? resume.skills.length + ' skills listed for keyword matching' : 'No skills section - ATS keyword filters need one' });
  dims.push({ key: 'ats', label: 'ATS-safety', score: clamp(ats, 0, 15), max: 15, checks: atsChecks });

  // 4) Keyword fit to target (15)
  var tt = targetTokens(resume), kw, kwChecks;
  if(!tt.length){
    kw = 10; kwChecks = [{ ok: false, text: 'No target role set - add one in your profile to score keyword fit' }];
  } else {
    var rt = tok(resumeText(resume));
    var hit = tt.filter(function(t){ return rt.some(function(x){ return tmatch(t, x); }); });
    kw = Math.round(hit.length / tt.length * 15);
    var miss = tt.filter(function(t){ return hit.indexOf(t) < 0; });
    kwChecks = [{ ok: !miss.length, text: hit.length + ' of ' + tt.length + ' target keywords appear' + (miss.length ? ' - missing: ' + miss.slice(0, 6).join(', ') : '') }];
  }
  dims.push({ key: 'keywords', label: 'Keyword fit', score: kw, max: 15, checks: kwChecks, target: resume.target });

  // 5) Consistency (15) - date formats (5), tense on past roles (5), punctuation (3), capitalization (2)
  var fmts = {};
  resume.entries.forEach(function(e){ [parseDate(e.start), parseDate(e.end)].forEach(function(d){ if(d.ok && !d.present) fmts[d.fmt === 'year' ? 'year' : d.fmt] = 1; }); });
  var fmtKeys = Object.keys(fmts).filter(function(k){ return k !== 'year'; });
  var fmtScore = fmtKeys.length <= 1 ? 5 : 2;
  var tenseBad = 0, pastBullets = 0;
  resume.entries.forEach(function(e){
    var r = entryRange(e, today);
    if(!r.present && !r.noEnd && r.e && r.e.ok){ e.bullets.forEach(function(b){ pastBullets++; if(analyzeBullet(b).presentTense) tenseBad++; }); }
  });
  var tenseScore = pastBullets ? Math.round((1 - tenseBad / pastBullets) * 5) : 5;
  var dots = bl.filter(function(b){ return /\.\s*$/.test(b.text); }).length;
  var punctScore = !n || dots === 0 || dots === n || dots / n >= 0.85 || dots / n <= 0.15 ? 3 : 1;
  var lowerStart = bl.filter(function(b){ return /^[a-z]/.test(b.text); }).length;
  var capsScore = lowerStart ? 0 : 2;
  dims.push({ key: 'consistency', label: 'Consistency', score: fmtScore + tenseScore + punctScore + capsScore, max: 15, checks: [
    { ok: fmtScore === 5, text: fmtScore === 5 ? 'One date format throughout' : 'Mixed date formats (' + fmtKeys.join(' + ') + ') - pick one, e.g. "Jun 2024"' },
    { ok: tenseBad === 0, text: tenseBad ? tenseBad + ' bullet' + (tenseBad > 1 ? 's' : '') + ' on past roles in present tense' : 'Past roles in past tense' },
    { ok: punctScore === 3, text: punctScore === 3 ? 'Consistent bullet punctuation' : 'Some bullets end with a period, some don\'t' },
    { ok: capsScore === 2, text: capsScore === 2 ? 'Every bullet starts with a capital' : lowerStart + ' bullet' + (lowerStart > 1 ? 's start' : ' starts') + ' lowercase' }
  ]});

  // 6) Length & shape (10) - page fit (5), bullets per role (3), total words (2)
  var est = estimatePages(resume, 'classic', opts);
  var span = careerSpan(resume, today);
  var pageLimit = span >= 120 ? 2 : 1;
  var pageScore = est.pages <= pageLimit ? 5 : est.pages <= pageLimit + 0.35 ? 3 : 1;
  var roleShape = resume.entries.filter(function(e){ return !isEdu(e); });
  var goodShape = roleShape.filter(function(e){ return e.bullets.length >= 2 && e.bullets.length <= 6; }).length;
  var shapeScore = roleShape.length ? Math.round(goodShape / roleShape.length * 3) : 0;
  var totalWords = bl.reduce(function(s, b){ return s + words(b.text).length; }, 0) + words(resume.summary).length;
  var wordScore = totalWords >= 120 && totalWords <= 750 ? 2 : totalWords > 0 ? 1 : 0;
  dims.push({ key: 'length', label: 'Length & shape', score: pageScore + shapeScore + wordScore, max: 10, checks: [
    { ok: pageScore === 5, text: '~' + est.pages + ' page' + (est.pages === 1 ? '' : 's') + (pageScore === 5 ? ' - fits' : ' - over the ' + pageLimit + '-page norm for your experience') },
    { ok: shapeScore === 3, text: goodShape + ' of ' + roleShape.length + ' roles have 2-6 bullets' },
    { ok: wordScore === 2, text: totalWords + ' words of content' + (totalWords < 120 ? ' - thin; add detail to your strongest roles' : totalWords > 750 ? ' - dense; trim older roles' : '') }
  ]});

  var total = dims.reduce(function(s, d){ return s + d.score; }, 0);
  var grade = total >= 85 ? 'A' : total >= 72 ? 'B' : total >= 58 ? 'C' : total >= 40 ? 'D' : 'E';
  // highest-impact fixes first, one per bullet
  var seen = {}, top = [], rk = renderedOrder(resume, today).rank;
  fixes.sort(function(a, b){ return (b.weight - a.weight) || ((rk[a.entryId] || 0) - (rk[b.entryId] || 0)) || (a.idx - b.idx); }).forEach(function(f){ var k = f.entryId + ':' + f.idx; if(!seen[k]){ seen[k] = 1; top.push(f); } });
  return { total: total, grade: grade, dimensions: dims, topFixes: top.slice(0, 6), bulletCount: n, quantified: quant };
}

/* ===================================================== 2. 6-SECOND RECRUITER SCAN
   Models an F-pattern skim: attention decays down the page and across each line. */
function careerSpan(resume, today){
  var work = resume.entries.filter(isWork), lo = null, hi = null;
  work.forEach(function(e){ var r = entryRange(e, today); if(r.si != null){ lo = lo == null ? r.si : Math.min(lo, r.si); } if(r.ei != null){ hi = hi == null ? r.ei : Math.max(hi, r.ei); } });
  return (lo != null && hi != null && hi >= lo) ? hi - lo + 1 : 0;
}
// The order a reader actually meets entries in: Experience (newest first), then Projects, then Education.
function renderedOrder(resume, today){
  var g = groupEntries(resume, today), order = g.work.concat(g.project, g.education), rank = {};
  order.forEach(function(e, k){ rank[e.id] = k; });
  return { order: order, rank: rank };
}
function firstQuantified(resume, today){
  var order = renderedOrder(resume, today).order.slice(0, 2);
  for(var i = 0; i < order.length; i++){
    for(var j = 0; j < Math.min(2, order[i].bullets.length); j++){
      var bj = order[i].bullets[j];
      // a number the person never gave is never their "standout"
      if(/\d/.test(bj) && !unverifiedIn(bj, order[i]).length) return { entry: order[i], idx: j, text: bj };
    }
  }
  return null;
}
function recruiterScan(resume, opts){
  opts = opts || {};
  var today = opts.today, rec = renderedOrder(resume, today), first = mostRecentWork(resume, today);
  var heat = (resume.entries || []).map(function(en){
    var k = rec.rank[en.id], base = k === 0 ? 1 : k === 1 ? 0.75 : k === 2 ? 0.45 : 0.25;
    return { entryId: en.id, title: base, org: Math.round(base * 85) / 100, dates: Math.round(base * 70) / 100,
      bullets: en.bullets.map(function(b, j){ var h = base * (j === 0 ? 0.55 : j === 1 ? 0.3 : 0.12); return { idx: j, heat: Math.round(h * 100) / 100, lead: words(b).slice(0, 4).join(' '), rest: words(b).slice(4).join(' ') }; }) };
  });
  var roles = resume.entries.filter(isWork).length, span = careerSpan(resume, today), sq = firstQuantified(resume, today);
  var standout = sq ? stripEnd(words(sq.text).slice(0, 10).join(' ')) + (words(sq.text).length > 10 ? '…' : '') : '';
  var who = first ? (first.title || 'Untitled role') + (first.org ? ' at ' + first.org : '') : 'No role listed yet';
  var takeaway = who + (roles > 1 ? ' · ' + roles + ' roles' : '') + (span ? ' over ' + fmtSpan(span) : '') + (standout ? ' · standout: "' + standout + '"' : ' · no standout number in view');
  var issues = [];
  var tt = targetTokens(resume);
  if(!resume.summary) issues.push({ key: 'summary', text: 'No headline/summary at the top - the most-read spot on the page is empty. One line saying who you are and what you\'re aiming for anchors everything below.' });
  if(tt.length && first){
    var ft = tok(first.title + ' ' + resume.summary);
    var hits = tt.filter(function(t){ return ft.some(function(x){ return tmatch(t, x); }); });
    if(!hits.length) issues.push({ key: 'mismatch', text: 'Your top line reads "' + (first.title || 'untitled') + '", but you\'re targeting "' + resume.target + '". A recruiter judges fit in seconds - bridge the two in a summary line.' });
  }
  if(!sq) issues.push({ key: 'nonumber', text: 'No number appears in the first bullets of your top roles - the part that actually gets read. Lead with your strongest quantified result.' });
  if(first && first.bullets[0] && analyzeBullet(first.bullets[0]).weakOpener) issues.push({ key: 'weakfirst', text: 'Your single most-read bullet opens with "' + analyzeBullet(first.bullets[0]).weakOpener + '". Start it with what you did.' });
  if(first && !first.start) issues.push({ key: 'nodates', text: 'Your top role has no dates - recruiters scan dates to judge recency.' });
  var verdict = issues.length === 0 ? 'strong' : issues.length <= 2 ? 'mixed' : 'weak';
  return { takeaway: takeaway, verdict: verdict, issues: issues, heat: heat, readOrder: rec.order.map(function(e){ return e.id; }) };
}

/* ================================================================ 3. ATS X-RAY */
var GLYPH_RE = /[★☆✓✔➤►▶◆■□☐☑→⇒❤✨]|[\ud83c-\udbff][\udc00-\udfff]/;
function dateText(en){ var a = clean(en.start), b = clean(en.end); return a && b ? a + ' - ' + b : (a || b || ''); }
function atsXray(resume, opts){
  opts = opts || {};
  var today = opts.today, c = resume.contact || {}, lines = [], risks = [];
  var work = resume.entries.filter(function(e){ return !isEdu(e); }), edu = resume.entries.filter(isEdu);
  lines.push(c.name || '[NAME NOT FOUND]');
  lines.push([c.email, c.phone, c.loc].filter(Boolean).join(' | ') || '[NO CONTACT DETAILS FOUND]');
  if(resume.summary){ lines.push('', 'SUMMARY', resume.summary); }
  if(work.length){ lines.push('', 'EXPERIENCE'); work.forEach(function(e){ lines.push(e.title + (e.org ? ', ' + e.org : '')); var d = dateText(e); if(d) lines.push(d); e.bullets.forEach(function(b){ lines.push('- ' + b); }); }); }
  if(edu.length){ lines.push('', 'EDUCATION'); edu.forEach(function(e){ lines.push(e.title + (e.org ? ', ' + e.org : '')); var d = dateText(e); if(d) lines.push(d); e.bullets.forEach(function(b){ lines.push('- ' + b); }); }); }
  if(resume.skills.length){ lines.push('', 'SKILLS', resume.skills.join(', ')); }

  var emailOk = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c.email || '');
  var phoneOk = String(c.phone || '').replace(/\D/g, '').length >= 7;
  var first = mostRecentWork(resume, today);
  var datedRoles = work.filter(function(e){ return !isProject(e); });
  var parsable = datedRoles.filter(function(e){ var r = entryRange(e, today); return r.ok; }).length;
  var fields = [
    { field: 'Name', value: c.name || '', ok: !!c.name },
    { field: 'Email', value: c.email || '', ok: emailOk },
    { field: 'Phone', value: c.phone || '', ok: phoneOk },
    { field: 'Location', value: c.loc || '', ok: !!c.loc, optional: true },
    { field: 'Most recent title', value: first ? first.title : '', ok: !!(first && first.title) },
    { field: 'Most recent employer', value: first ? first.org : '', ok: !!(first && first.org) },
    { field: 'Dates on every role', value: parsable + ' / ' + datedRoles.length + ' parsed', ok: parsable === datedRoles.length },
    { field: 'Education', value: edu[0] ? (edu[0].title + (edu[0].org ? ', ' + edu[0].org : '')) : '', ok: edu.length > 0, optional: true },
    { field: 'Skills section', value: resume.skills.length ? resume.skills.length + ' skills' : '', ok: resume.skills.length > 0 }
  ];
  if(!c.name) risks.push({ level: 'high', text: 'No name found.', fix: 'Add your full name in your profile so it heads the resume.' });
  if(!emailOk) risks.push({ level: 'high', text: c.email ? 'Email "' + c.email + '" doesn\'t look valid.' : 'No email found - an ATS can\'t create your candidate record without it.', fix: 'Add a working email to your profile.' });
  if(!phoneOk) risks.push({ level: 'med', text: 'No phone number found.', fix: 'Add a phone number - many applicant systems require one.' });
  resume.entries.forEach(function(e){
    if(!e.title) risks.push({ level: 'high', text: 'An entry at ' + (e.org || 'an organization') + ' has no title.', fix: 'Give every role a clear job title - ATS search ranks on titles.' });
    if(isProject(e)) return;
    [['start', e.start], ['end', e.end]].forEach(function(p){
      if(!clean(p[1])) return;
      var d = parseDate(p[1]);
      if(!d.ok) risks.push({ level: 'high', text: '"' + p[1] + '" on ' + (e.title || 'a role') + ' isn\'t a date an ATS can parse.', fix: 'Use a standard format like "Jun 2024" or "06/2024".' });
      else if(d.fuzzy) risks.push({ level: 'med', text: '"' + p[1] + '" (a season) on ' + (e.title || 'a role') + ' parses as an estimated month.', fix: 'Use the actual month, e.g. "Jun 2023".' });
    });
    if(!clean(e.start) && !clean(e.end)) risks.push({ level: 'med', text: (e.title || 'A role') + ' has no dates.', fix: 'Add start and end dates - missing dates read as hiding something.' });
    if(/[\/|]/.test(e.title || '')) risks.push({ level: 'low', text: 'The title "' + e.title + '" packs several titles together.', fix: 'Use your one official title; mention the rest in a bullet.' });
  });
  allBullets(resume).forEach(function(b){
    if(GLYPH_RE.test(b.text)) risks.push({ level: 'med', text: 'Symbol or emoji in: "' + b.text.slice(0, 60) + '"', fix: 'Remove decorative symbols - some ATS drop or garble them.' });
    if(b.text.length > 300) risks.push({ level: 'low', text: 'A very long bullet (' + b.text.length + ' characters) under ' + (b.entry.title || 'a role') + '.', fix: 'Split or tighten it.' });
    if(/[A-Z]{6,}/.test(b.text) && !/\b(SQL|HTML|CSS|AWS|GCP|NASA|UNICEF|COVID)\b/.test(b.text)) risks.push({ level: 'low', text: 'ALL-CAPS text in: "' + b.text.slice(0, 50) + '"', fix: 'Use normal case - all caps can confuse parsing and reads as shouting.' });
  });
  if(!resume.skills.length) risks.push({ level: 'med', text: 'No skills section.', fix: 'List your real skills - ATS keyword filters look for a skills section.' });
  if(words(resume.summary).length > 60) risks.push({ level: 'low', text: 'Summary is ' + words(resume.summary).length + ' words.', fix: 'Keep it to 1-3 lines; long summaries get cut off in ATS previews.' });
  var high = risks.filter(function(r){ return r.level === 'high'; }).length, med = risks.filter(function(r){ return r.level === 'med'; }).length, low = risks.filter(function(r){ return r.level === 'low'; }).length;
  var missingFields = fields.filter(function(f){ return !f.ok && !f.optional; }).length;
  var parseScore = clamp(100 - high * 14 - med * 6 - low * 2 - missingFields * 4, 0, 100);
  return { plainText: lines.join('\n'), fields: fields, risks: risks, parseScore: parseScore };
}

/* ============================================================== 4. RED-FLAG RADAR */
var BIAS_RE = /date of birth|\bdob\b|marital status|\bnationality\b|\breligion\b|\bage:\s*\d|\bgender:|\bsocial security|\bssn\b|\bphoto(graph)? attached\b/i;
var BAD_EMAIL_RE = /(sexy|hott?ie|babe|princess|420|69|xx|lol|cutie|baller|killer|gangsta|thug|boo)/i;
function redFlags(resume, opts){
  opts = opts || {};
  var today = opts.today || new Date(), todayIdx = today.getFullYear() * 12 + today.getMonth(), flags = [];
  function add(f){ flags.push(f); }
  // timeline: work + education + projects all "cover" time for gap purposes.
  // An open-ended latest work role (start but no end) is read as current.
  var latestStart = null;
  resume.entries.forEach(function(e){ if(!isWork(e)) return; var r = entryRange(e, today); if(r.noEnd && r.si != null) latestStart = latestStart == null ? r.si : Math.max(latestStart, r.si); });
  var timeline = resume.entries.map(function(e){
    var r = entryRange(e, today), ei = r.ei;
    if(isWork(e) && r.noEnd && r.si != null && r.si === latestStart) ei = todayIdx;
    return { e: e, si: r.si, ei: ei, r: r };
  }).filter(function(x){ return x.si != null && x.ei != null; }).sort(function(a, b){ return a.si - b.si; });
  resume.entries.forEach(function(e){
    var r = entryRange(e, today);
    if(isWork(e) && r.noEnd && clean(e.start)) add({ id: 'noend-' + e.id, severity: 'low', title: 'No end date', detail: (e.title || 'A role') + ' has a start date but no end.', where: { entryId: e.id }, fix: 'If you still work there, write "Present"; otherwise add the month you left.' });
  });
  var maxEnd = null, prev = null;
  timeline.forEach(function(x){
    if(maxEnd != null && x.si - maxEnd > 6){
      var g = x.si - maxEnd - 1;
      add({ id: 'gap-' + x.e.id, severity: g >= 12 ? 'high' : 'med', title: 'Employment gap of ~' + fmtSpan(g), detail: 'Between ' + (prev && (prev.e.title || 'a role')) + ' and ' + (x.e.title || 'the next role') + '.', where: { entryId: x.e.id }, fix: 'Name it in one honest line (study, caregiving, health, travel, freelancing, a job search). Unexplained gaps hurt far more than explained ones.' });
    }
    if(maxEnd == null || x.ei > maxEnd){ maxEnd = x.ei; prev = x; }
  });
  // overlaps between full-time work roles
  var ft = timeline.filter(function(x){ return isWork(x.e) && !isIntern(x.e) && !isContract(x.e); });
  for(var i = 0; i < ft.length; i++) for(var j = i + 1; j < ft.length; j++){
    var ov = Math.min(ft[i].ei, ft[j].ei) - Math.max(ft[i].si, ft[j].si) + 1;
    if(ov >= 2) add({ id: 'overlap-' + ft[i].e.id + '-' + ft[j].e.id, severity: 'low', title: 'Overlapping roles', detail: (ft[i].e.title || 'One role') + ' and ' + (ft[j].e.title || 'another') + ' overlap by ~' + fmtSpan(ov) + '.', where: { entryId: ft[j].e.id }, fix: 'If one was part-time or concurrent, say so ("Part-time") so it doesn\'t read as a date error.' });
  }
  // short tenures
  var short = timeline.filter(function(x){ return isWork(x.e) && !isIntern(x.e) && !isContract(x.e) && !x.r.present && (x.ei - x.si + 1) < 9; });
  if(short.length >= 2) add({ id: 'hop', severity: short.length >= 3 ? 'high' : 'med', title: short.length + ' roles under 9 months', detail: short.map(function(x){ return (x.e.title || 'a role') + ' (' + fmtSpan(x.ei - x.si + 1) + ')'; }).join(', ') + '.', where: { entryId: short[0].e.id }, fix: 'If any were contract, seasonal or temporary, label them so - it reframes "job-hopping" as planned work. Consider grouping short related roles.' });
  // date problems
  resume.entries.forEach(function(e){
    var r = entryRange(e, today);
    if(isWork(e) && r.missing) add({ id: 'nodate-' + e.id, severity: 'med', title: 'Missing dates', detail: (e.title || 'A role') + ' has no dates.', where: { entryId: e.id }, fix: 'Add start and end months. Missing dates are a classic recruiter suspicion trigger.' });
    if(r.si != null && r.si > todayIdx + 1) add({ id: 'future-' + e.id, severity: 'high', title: 'Start date in the future', detail: (e.title || 'A role') + ' starts after today.', where: { entryId: e.id }, fix: 'Fix the date, or label it "Starting Jun 2027" if it\'s an accepted offer.' });
    if(r.si != null && r.ei != null && r.ei < r.si && !r.noEnd) add({ id: 'order-' + e.id, severity: 'high', title: 'End date before start date', detail: (e.title || 'A role') + ': ' + dateText(e) + '.', where: { entryId: e.id }, fix: 'Swap or correct the dates.' });
  });
  // numbers the person never gave - the one flag that can cost an offer after the interview
  var bl = allBullets(resume), verbs = {};
  bl.forEach(function(b){
    if(!b.unverified.length) return;
    add({ id: 'unv-' + b.entryId + '-' + b.idx, kind: 'unverified', severity: 'high', title: (b.unverified.some(function(n){ return !/\d/.test(n); }) && !b.unverified.some(function(n){ return /\d/.test(n); }) ? 'A claim you never made: ' : b.unverified.some(function(n){ return !/\d/.test(n); }) ? 'A number or claim you never gave: ' : 'A number you never gave: ') + b.unverified.join(', '), detail: '"' + b.text + '"', where: { entryId: b.entryId, idx: b.idx },
      fix: 'It isn\'t in anything you wrote for ' + (b.entry.title || 'this role') + '. If it\'s accurate, confirm the real figure and it becomes part of your own record. If not, take it out before an interviewer asks how you measured it.',
      strip: stripClaims(b.text, b.unverified), stripOk: stripOk(b.text, stripClaims(b.text, b.unverified)), unverified: b.unverified.slice() });
  });
  if(resume.summaryFlagged && resume.summaryFlagged.length && resume.summary) add({ id: 'unv-summary', kind: 'unverified-summary', severity: 'high', title: 'Your summary uses a number you never gave: ' + resume.summaryFlagged.join(', '), detail: '"' + resume.summary + '"', where: { summary: true },
    fix: 'Summaries get read first and probed hardest. Remove it, or rewrite the line with a figure you can stand behind.', strip: stripClaims(resume.summary, resume.summaryFlagged), stripOk: stripOk(resume.summary, stripClaims(resume.summary, resume.summaryFlagged)), unverified: resume.summaryFlagged.slice() });
  // language issues across bullets
  bl.forEach(function(b){
    var a = analyzeBullet(b.text);
    if(a.pronoun) add({ id: 'pro-' + b.entryId + '-' + b.idx, severity: 'low', title: 'First-person pronoun', detail: '"' + b.text + '"', where: { entryId: b.entryId, idx: b.idx }, fix: 'Drop "I/we/my" - resume bullets are written in implied first person.' });
    if(a.cliches.length) add({ id: 'cli-' + b.entryId + '-' + b.idx, severity: 'low', title: 'Cliché: ' + a.cliches[0], detail: '"' + b.text + '"', where: { entryId: b.entryId, idx: b.idx }, fix: 'Replace it with the concrete fact that proves it.' });
    if(a.passive) add({ id: 'pas-' + b.entryId + '-' + b.idx, severity: 'low', title: 'Passive voice', detail: '"' + b.text + '"', where: { entryId: b.entryId, idx: b.idx }, fix: 'Make yourself the subject: who did the thing?' });
    if(a.verb && a.verb.length > 2) verbs[a.verb] = (verbs[a.verb] || []).concat([b]);
  });
  Object.keys(verbs).forEach(function(v){ if(verbs[v].length >= 3) add({ id: 'rep-' + v, severity: 'low', title: '"' + cap(v) + '" opens ' + verbs[v].length + ' bullets', detail: 'Repetition makes every bullet blur together.', where: { entryId: verbs[v][1].entryId, idx: verbs[v][1].idx }, fix: 'Vary the verb to match what you actually did in each (built, led, cut, launched...).' }); });
  // tense on past roles
  resume.entries.forEach(function(e){
    var r = entryRange(e, today);
    if(r.present || r.noEnd || !(r.e && r.e.ok)) return;
    var bad = e.bullets.map(function(b, i){ return { b: b, i: i }; }).filter(function(x){ return analyzeBullet(x.b).presentTense; });
    if(bad.length) add({ id: 'tense-' + e.id, severity: 'low', title: 'Present tense on a past role', detail: (e.title || 'A past role') + ': "' + bad[0].b + '"', where: { entryId: e.id, idx: bad[0].i }, fix: 'Roles you\'ve left are written in past tense ("Managed", not "Manage").' });
  });
  // contact + personal info
  var em = (resume.contact && resume.contact.email) || '';
  var local = em.split('@')[0] || '';
  if(em && (BAD_EMAIL_RE.test(local) || (local.match(/\d/g) || []).length >= 5)) add({ id: 'email', severity: 'med', title: 'Email may read as unprofessional', detail: em, where: {}, fix: 'A simple firstname.lastname@ address is the safest choice.' });
  var allText = resumeText(resume);
  if(BIAS_RE.test(allText)) add({ id: 'bias', severity: 'med', title: 'Personal details that invite bias', detail: 'Age/date of birth, marital status, nationality, religion or similar appear on the page.', where: {}, fix: 'Leave these off - in the US and UK they aren\'t expected and can expose you to bias.' });
  // length
  var est = estimatePages(resume, 'classic', opts), span = careerSpan(resume, today);
  if(est.pages > (span >= 120 ? 2 : 1) + 0.35) add({ id: 'long', severity: 'med', title: 'Runs ~' + est.pages + ' pages', detail: 'Longer than the norm for your experience.', where: {}, fix: 'Use Preview → "Fit to one page" to see exactly which weakest bullets to cut.' });
  var totalWords = bl.reduce(function(s, b){ return s + words(b.text).length; }, 0);
  if(bl.length && totalWords < 80) add({ id: 'thin', severity: 'med', title: 'Very thin content', detail: totalWords + ' words across all bullets.', where: {}, fix: 'Add 2-4 bullets to your strongest roles - Metric Miner will help you find the numbers.' });
  if(resume.summary && CLICHES.some(function(c){ return resume.summary.toLowerCase().indexOf(c) >= 0; })) add({ id: 'sumcliche', severity: 'low', title: 'Summary leans on clichés', detail: '"' + resume.summary + '"', where: {}, fix: 'Say who you are, what you\'ve done, and what you want - in plain facts.' });
  var rank = { high: 0, med: 1, low: 2 };
  flags.sort(function(a, b){ return rank[a.severity] - rank[b.severity]; });
  return flags;
}

/* ======================================================== 5. SKILLS EVIDENCE MATRIX */
var SKILL_CUES = {
  'leadership': /\b(led (a |the )?(team|crew|group|staff|squad|\d+)|mentored|supervised|coached|directed|headed|oversaw|captained|chaired|founded|managed (a |the )?(team|crew|group|staff|\d+)|trained|training (new |the )?(hires|staff|employees|team|members|volunteers))\b/i,
  'communication': /\b(presented|wrote|explained|communicated|pitched|negotiated|published|spoke|briefed|documented|reported)\b/i,
  'teamwork': /\b(collaborated|partnered|cross-functional|cross functional|with (a|the|my)? ?team|teammates)\b/i,
  'problem solving': /\b(resolved|solved|troubleshot|troubleshooting|diagnosed|fixed|debugged|root cause)\b/i,
  'customer service': /\b(customers?|clients?|guests?|patrons?|front desk|complaints?)\b/i,
  'project management': /\b(planned|coordinated|delivered|timeline|roadmap|milestones?|on schedule|on budget)\b/i,
  'data analysis': /\b(analy[sz]ed|analysis|analytics|dashboards?|metrics|kpis?|insights?)\b/i,
  'training': /\b(trained|onboarded|taught|tutored|coached|instructed|training (new |the )?(hires|staff|employees|team|members|volunteers|students))\b/i,
  'sales': /\b(sold|sales|upsold|revenue|quota|closed deals?|prospect(ed|ing))\b/i,
  'organization': /\b(organized|organised|inventory|logistics|filing|scheduled)\b/i,
  'time management': /\b(deadlines?|fast-paced|prioritized|multitask(ed|ing)?|on time)\b/i,
  'cash handling': /\b(cash|register|point[- ]of[- ]sale|\bpos\b|till|reconcil\w*)\b/i,
  'research': /\b(researched|investigated|surveyed|literature review|interviewed)\b/i,
  'writing': /\b(wrote|written|authored|drafted|edited|copywriting|articles?|blog posts?)\b/i,
  'design': /\b(designed|mockups?|wireframes?|prototypes?|figma|user interface)\b/i,
  'excel': /\b(excel|spreadsheets?|pivot tables?|vlookup)\b/i,
  'python': /\bpython\b/i, 'sql': /\bsql\b/i, 'javascript': /\b(javascript|react|node\.?js|typescript)\b/i,
  'java': /\bjava\b/i, 'tableau': /\btableau\b/i, 'figma': /\bfigma\b/i, 'power bi': /\bpower ?bi\b/i,
  'social media': /\b(social media|instagram|tiktok|followers|linkedin posts?)\b/i,
  'event planning': /\b(events?|fundrais\w+|conference|hosted)\b/i,
  'conflict resolution': /\b(de-?escalat\w+|conflicts?|disputes?)\b/i,
  'public speaking': /\b(presented|spoke|keynote|talks?|workshops?|lectured)\b/i
};
var SKILL_ALIASES = { 'people management': 'leadership', 'team leadership': 'leadership', 'managing people': 'leadership', 'mentoring': 'leadership',
  'customer support': 'customer service', 'client relations': 'customer service', 'collaboration': 'teamwork', 'analytics': 'data analysis',
  'data analytics': 'data analysis', 'microsoft excel': 'excel', 'ms excel': 'excel', 'spreadsheets': 'excel', 'presentation': 'public speaking',
  'presenting': 'public speaking', 'organisation': 'organization', 'organizational skills': 'organization', 'problem-solving': 'problem solving',
  'critical thinking': 'problem solving', 'js': 'javascript', 'react': 'javascript', 'node': 'javascript', 'communication skills': 'communication',
  'written communication': 'writing', 'copywriting': 'writing', 'ux': 'design', 'ui': 'design', 'ux design': 'design', 'graphic design': 'design',
  'event management': 'event planning', 'events': 'event planning', 'negotiation': 'sales', 'business development': 'sales', 'pos': 'cash handling' };
var TOOL_SKILLS = ['excel', 'python', 'sql', 'javascript', 'java', 'tableau', 'figma', 'power bi'];
// A role title is evidence too: "Shift Lead" shows leadership, "Barista" shows customer service.
var TITLE_CUES = {
  'leadership': /\b(lead|leader|manager|supervisor|head|captain|president|director|chair|founder|foreman|team lead)\b/i,
  'customer service': /\b(barista|server|cashier|host|hostess|waiter|waitress|sales associate|customer service|front desk|receptionist|retail|bartender)\b/i,
  'sales': /\b(sales|account executive|business development)\b/i,
  'design': /\bdesigner\b/i, 'data analysis': /\b(analyst|data scientist)\b/i,
  'training': /\b(trainer|tutor|teacher|instructor|coach|teaching assistant)\b/i,
  'writing': /\b(writer|editor|journalist|copywriter)\b/i, 'research': /\b(researcher|research assistant)\b/i
};
function canonSkill(s){ var k = clean(s).toLowerCase(); return SKILL_ALIASES[k] || k; }
function titleEvidence(resume, key){
  var re = TITLE_CUES[key]; if(!re) return [];
  return (resume.entries || []).filter(function(e){ return e.title && re.test(e.title); }).map(function(e){ return { entryId: e.id, idx: -1, text: 'Role title: ' + e.title, where: e.title + (e.org ? ' · ' + e.org : ''), title: true }; });
}
function skillsEvidence(resume){
  var bl = allBullets(resume), rows = [];
  resume.skills.forEach(function(skill){
    var key = canonSkill(skill), cue = SKILL_CUES[key], ev = titleEvidence(resume, key);
    bl.forEach(function(b){
      var hit = cue ? cue.test(b.text) : (function(){ var st = tok(skill), bt = tok(b.text + ' ' + b.entry.title); return st.length > 0 && st.every(function(s){ return bt.some(function(x){ return tmatch(s, x); }); }); })();
      if(hit) ev.push({ entryId: b.entryId, idx: b.idx, text: b.text, where: b.entry.title + (b.entry.org ? ' · ' + b.entry.org : '') });
    });
    rows.push({ skill: skill, evidence: ev, status: ev.length >= 2 ? 'proven' : ev.length === 1 ? 'weak' : 'unproven' });
  });
  var claimed = resume.skills.map(canonSkill), hidden = [];
  Object.keys(SKILL_CUES).forEach(function(key){
    if(claimed.indexOf(key) >= 0) return;
    var hits = titleEvidence(resume, key).concat(bl.filter(function(b){ return SKILL_CUES[key].test(b.text); }).map(function(b){ return { entryId: b.entryId, idx: b.idx, text: b.text }; }));
    var need = TOOL_SKILLS.indexOf(key) >= 0 ? 1 : 2;
    if(hits.length >= need) hidden.push({ skill: key, label: key.split(' ').map(cap).join(' ').replace('Sql', 'SQL').replace('Power Bi', 'Power BI'), evidence: hits.slice(0, 3) });
  });
  hidden.sort(function(a, b){ return b.evidence.length - a.evidence.length; });
  var proven = rows.filter(function(r){ return r.status === 'proven'; }).length;
  return { rows: rows, unproven: rows.filter(function(r){ return r.status === 'unproven'; }).map(function(r){ return r.skill; }),
    hidden: hidden.slice(0, 8), coverage: pct(proven + rows.filter(function(r){ return r.status === 'weak'; }).length * 0.5, rows.length) };
}

/* ================================================================ 6. METRIC MINER
   Instead of inventing numbers (what most builders do), ask the person the
   questions that surface the real ones - then build the bullet from THEIR answers. */
var PEOPLE_OBJ = /\b(team|teams|staff|people|employees|hires|crew|volunteers|interns|students|members|reports|associates|cashiers|baristas|servers|tutees|mentees|trainees|direct reports|\d+\s+(people|staff|employees|members|volunteers))\b/i;
var VERB_CLASSES = [
  { key: 'people', re: /^(train|mentor|coach|onboard|hir(e|ed|ing)\b|recruit|teach|taught|tutor)/i, qs: [
    { id: 'count', q: 'How many people?', ph: 'e.g. 4' },
    { id: 'outcome', q: 'What changed for them? (ramp-up time, performance, retention)', ph: 'e.g. new hires worked independently within 1 week' } ] },
  { key: 'people', re: /^(led|lead|leading|manag|direct|supervis|oversaw|oversee|head|captain)/i, needsPeople: true, qs: [
    { id: 'count', q: 'How many people?', ph: 'e.g. a team of 6' },
    { id: 'outcome', q: 'What did the team achieve under you?', ph: 'e.g. hit every weekly target for 6 months' } ] },
  { key: 'improve', re: /^(improv|increas|reduc|cut\b|streamlin|optimi[sz]|boost|grew|grow|accelerat|sped|speed|decreas|lower|rais|sav|automat|simplif|fix)/i, qs: [
    { id: 'amount', q: 'By about how much? (%, hours, $ - or before → after)', ph: 'e.g. from 2 days to 4 hours' },
    { id: 'scope', q: 'For what or whom? (team, process, customers)', ph: 'e.g. the weekly sales report' } ] },
  { key: 'sales', re: /^(sold|sell|generat|negotiat|clos|secur|upsell|upsold|fundrais|won\b|win)/i, qs: [
    { id: 'amount', q: 'How much? ($, units, or deals)', ph: 'e.g. $12,000 in orders' },
    { id: 'compare', q: 'Compared to what? (target, average, last year)', ph: 'e.g. 120% of my target' } ] },
  { key: 'build', re: /^(built|build|creat|design|develop|launch|wrote|write|made|make|produc|program|engineer|implement|set up|establish|found|start|prototyp)/i, qs: [
    { id: 'reach', q: 'How many people used it, or how often?', ph: 'e.g. 30 staff used it daily' },
    { id: 'outcome', q: 'What did it replace, fix, or make possible?', ph: 'e.g. replaced a manual spreadsheet' } ] },
  { key: 'organize', re: /^(organi[sz]|plan|coordinat|host|schedul|arrang|facilitat)/i, qs: [
    { id: 'count', q: 'How many events, people, or attendees?', ph: 'e.g. 3 events, 150 attendees' },
    { id: 'outcome', q: 'What came of it?', ph: 'e.g. raised $2,400 for the club' } ] },
  { key: 'manage', re: /^(manag|own|oversaw|oversee|ran\b|run|head|direct|led\b|lead)/i, qs: [
    { id: 'amount', q: 'How much or how many? ($ handled, items, accounts, budget)', ph: 'e.g. $3,000 a day' },
    { id: 'outcome', q: 'What was the result? (accuracy, savings, errors avoided)', ph: 'e.g. zero cash discrepancies in 12 months' } ] },
  { key: 'volume', re: /^(serv|handl|process|answer|support|assist|resolv|respond|greet|check|took|take|ship|pack|deliver|clean|stock|sort|enter|book|prepar|mak)/i, qs: [
    { id: 'count', q: 'Roughly how many - per day, per week, or in total?', ph: 'e.g. 80 a day' },
    { id: 'outcome', q: 'Any result you know of? (ratings, speed, accuracy, repeat business)', ph: 'e.g. kept a 4.8/5 rating' } ] }
];
var DEFAULT_QS = [ { id: 'count', q: 'How many, how much, or how often?', ph: 'e.g. 25 a week' }, { id: 'outcome', q: 'What was the result?', ph: 'e.g. finished 2 weeks early' } ];
function contentStart(text){
  var t = clean(text), low = t.toLowerCase();
  for(var i = 0; i < WEAK.length; i++){ if(low.indexOf(WEAK[i] + ' ') === 0) return t.slice(WEAK[i].length).trim(); }
  return t;
}
function metricQuestions(text){
  var core = contentStart(text), rest = core.split(' ').slice(1).join(' ');
  for(var i = 0; i < VERB_CLASSES.length; i++){
    var c = VERB_CLASSES[i];
    if(!c.re.test(core)) continue;
    if(c.needsPeople && !PEOPLE_OBJ.test(rest)) continue;   // "Managed the register" is not people management
    return { cls: c.key, questions: c.qs.slice() };
  }
  return { cls: 'general', questions: DEFAULT_QS.slice() };
}

/* Honest phrasing helpers: change HOW something is said, never WHAT happened. */
var GERUND_IRREG = { leading: 'led', building: 'built', running: 'ran', writing: 'wrote', making: 'made', teaching: 'taught', selling: 'sold',
  bringing: 'brought', buying: 'bought', thinking: 'thought', keeping: 'kept', holding: 'held', finding: 'found', giving: 'gave', taking: 'took',
  speaking: 'spoke', sending: 'sent', spending: 'spent', meeting: 'met', paying: 'paid', putting: 'put', reading: 'read', setting: 'set',
  cutting: 'cut', growing: 'grew', driving: 'drove', winning: 'won', beginning: 'began', overseeing: 'oversaw', seeing: 'saw', doing: 'did',
  getting: 'got', telling: 'told', understanding: 'understood', standing: 'stood', having: 'had' };
// -ing words that aren't verbs in progress (or whose "-ed" form isn't a word).
var NOT_GERUND = ('being during morning evening nothing something anything everything ceiling wedding pudding clothing awning lightning herring '
  + 'icing siding railing frosting stuffing sibling darling viking duckling dumpling earring offspring').split(' ');
// -ing words that usually name a FIELD or department ("Accounting and payroll", "Marketing intern").
var FIELD_NOUNS = ('accounting marketing engineering nursing banking catering bookkeeping housekeeping landscaping plumbing merchandising purchasing '
  + 'receiving advertising publishing consulting packaging lighting staffing ticketing building programming').split(' ');
function gerundToPast(w){
  var l = String(w || '').toLowerCase();
  if(GERUND_IRREG[l]) return GERUND_IRREG[l];
  if(!/^[a-z]+ing$/.test(l) || l.length < 5 || NOT_GERUND.indexOf(l) >= 0) return null;
  var stem = l.slice(0, -3);
  if(!/[aeiouy]/.test(stem)) return null;              // "bring", "spring", "string", "thing" are not gerunds
  if(/[^aeiou]y$/.test(stem)) return stem.slice(0, -1) + 'ied';
  return stem + 'ed';
}
// Is the -ing word at position 0 of `rest` (e.g. "training new hires") a verb we can safely put in past tense?
// After "responsible for" a gerund is almost always the task itself; at the start of a line it is often a noun.
function gerundIsVerb(rest, afterResponsibility){
  var g = (words(rest)[0] || '').toLowerCase().replace(/[^a-z]/g, ''), nx = nextWord(rest, 1);
  if(!gerundToPast(g) || !nx) return false;
  if(/^(and|or|plus|&)$/.test(nx) || /^[,;&]/.test((words(rest)[1] || '')) || /[,;]$/.test(words(rest)[0] || '')) return false;   // "Accounting and payroll"
  if(ROLE_NOUN.test(nx)) return false;                                                     // "Recruiting coordinator duties"
  if(FIELD_NOUNS.indexOf(g) >= 0) return OBJ_START.test(nx) || /^[$£€\d]/.test(nx);       // "Marketing the new app" only
  return afterResponsibility ? true : looksLikeObject(rest, 1);
}
// "Responsible for training new hires" -> "Trained new hires"; "Responsible for the register" -> "Owned the register".
// Only meaning-preserving swaps: being responsible for X IS owning X; "helped with X" IS supporting X.
function strengthenOpener(text){
  var t = stripEnd(text);
  // "Being the point of contact" IS serving as it.
  var b = t.match(/^(?:(?:was\s+)?(?:responsible for|in charge of|tasked with)\s+)?being\s+(the|a|an|our|their)\s+(.+)$/i);
  if(b) return cap('Served as ' + b[1].toLowerCase() + ' ' + b[2]);
  // Owning a task means doing it: "Responsible for training X" -> "Trained X". But taking PART
  // in something is not doing all of it, so "Participated in organizing X" -> "Contributed to organizing X".
  var m = t.match(/^(?:was\s+)?(?:responsible for|in charge of|tasked with|duties included)\s+(\w+ing\b.*)$/i);
  if(m && gerundIsVerb(m[1], true)){ var mw = words(m[1]); return cap(gerundToPast(mw[0].replace(/[^A-Za-z]/g, '')) + (mw.length > 1 ? ' ' + mw.slice(1).join(' ') : '')); }
  var rules = [
    [/^(?:was\s+)?responsible\s+for\s+/i, 'Owned '], [/^(?:was\s+)?in charge of\s+/i, 'Managed '], [/^tasked with\s+/i, 'Handled '],
    [/^(?:helped|assisted)\s+(?:with|in)\s+(?!\w+ing\b)/i, 'Supported '], [/^(?:was\s+)?(?:involved|participated)\s+in\s+/i, 'Contributed to '],
    [/^took part in\s+/i, 'Contributed to '], [/^duties included\s+/i, '']
  ];
  for(var i = 0; i < rules.length; i++){ if(rules[i][0].test(t)) return cap(t.replace(rules[i][0], rules[i][1])); }
  if(/^\w+ing\b/i.test(t) && gerundIsVerb(t, false)){ var gw = words(t); return cap(gerundToPast(gw[0].replace(/[^A-Za-z]/g, '')) + (gw.length > 1 ? ' ' + gw.slice(1).join(' ') : '')); }
  return cap(t);
}
var DETERMINERS = /^(the|a|an|our|my|their|his|her|its|this|that|these|those|all|every|each)$/i;
var OBJ_STOP = /^(during|for|at|in|on|with|by|to|from|across|while|through|using|via|and|or|so|that|which|who|into|per|each|every|after|before|under|over)$/i;
// Slot a quantity the person gave into the sentence where it reads naturally; otherwise keep it, verbatim, in parentheses.
function insertQuantity(sentence, qty){
  var w = words(sentence), q = stripEnd(qty);
  if(w.length < 2 || !q) return sentence + (q ? ' (' + q + ')' : '');
  var verb = w[0], rest = w.slice(1), end = 0;
  while(end < rest.length){
    var bare = rest[end].replace(/[^A-Za-z]/g, '');
    if(OBJ_STOP.test(bare) || (/ly$/i.test(bare) && bare.length > 4)) break;
    end++;
    if(/[,;]$/.test(rest[end - 1])) break;
  }
  var obj = rest.slice(0, end), tail = rest.slice(end);
  var m = q.match(/^((?:about |around |roughly |over |nearly |almost |more than |~)?[$£€]?\d[\d,.]*\+?)\s*(.*)$/i);
  if(m && obj.length && !DETERMINERS.test(obj[0])){
    var num = m[1], after = clean(m[2]);
    var head = (obj[obj.length - 1] || '').toLowerCase().replace(/[^a-z]/g, '');
    var afterWords = after.toLowerCase().split(' ').map(function(x){ return x.replace(/[^a-z]/g, ''); });
    if(after && head && (afterWords.indexOf(head) >= 0 || afterWords.indexOf(head.replace(/s$/, '')) >= 0)) return [verb].concat(words(q), tail).join(' ');
    if(!after) return [verb, num].concat(obj, tail).join(' ');
    if(/^(a|an|per|each|every)\s+\w+$/i.test(after)) return [verb, num].concat(obj, words(after), tail).join(' ');
  }
  return sentence + ' (' + q + ')';
}
// A measurement the person typed, phrased to follow a verb: "30%" -> "by 30%", "from 2 days to 4 hours" stays.
function yPhrase(y){
  y = stripEnd(y);
  if(!y) return '';
  if(/^(by|of|from|to|for|across|in|at|with|over|under|within)\b/i.test(y)) return y;
  if(/^(?:about |around |roughly |nearly |almost |~)?\d[\d,.]*\s?x$/i.test(y)) return y.replace(/\s?x$/i, 'x');   // "2x" reads as is
  if(/^(?:about |around |roughly |over |nearly |almost |~)?[$£€]?\d[\d,.]*\s*(%|percent|x|times)$/i.test(y)) return 'by ' + y;
  if(/^(?:about |around |roughly |over |nearly |almost |~)?[$£€]?\d/.test(y)) return '(' + y + ')';
  return '– ' + y;
}
// Lines worth mining: no number yet - or a number the person never gave (that one comes out of the
// draft, and only a figure they type goes back in).
function metricTargets(resume, opts){
  var today = (opts || {}).today, rank = recencyOrder(resume, today).rank;
  return allBullets(resume).map(function(b){
    var a = analyzeBullet(b.text), unv = b.unverified, base = unv.length ? stripClaims(b.text, unv) : b.text, mq = metricQuestions(base);
    var figQs = unv.map(function(n, i){
      var sp = figureSpan(b.text, n), shown = sp ? clean(sp.text) : n, kind = (numericClaims(n)[0] || {}).kind;
      if(MULT_VERB_RE.test(clean(normNumerals(n)))) return { id: 'fig' + i, figure: shown, q: '“' + shown + '” isn’t in anything you wrote. By how much did it really change? (“yes” if it really did, blank keeps it general)', ph: 'e.g. 40%, 2x, or from 20 to 60 a day' };
      if(kind === 'boast') return { id: 'fig' + i, figure: shown, q: '“' + shown + '” isn’t in anything you wrote. Is it accurate? Type “yes” to keep it, or say what really happened (blank drops it)', ph: 'e.g. yes - or “with 2 teammates”, “#2 of 9 stores”' };
      if(kind === 'vague') return { id: 'fig' + i, figure: shown, q: '“' + shown + '” isn’t in anything you wrote. Roughly how many, really? (blank drops it)', ph: 'e.g. about 150' };
      return { id: 'fig' + i, figure: shown, q: '“' + shown + '” isn’t in anything you wrote. What’s the real figure? (“yes” if it’s right, blank drops it)',
        ph: kind === 'dur' ? 'e.g. 3 months' : kind === 'frac' || /%|percent/.test(shown) ? 'e.g. 25%' : /[$£€₹¥]/.test(shown) ? 'e.g. $5,000' : kind === 'rank' ? 'e.g. #2 of 9' : /^\D+$/.test(shown) ? 'what really happened' : 'e.g. 12' };
    });
    return { entryId: b.entryId, idx: b.idx, text: b.text, base: base, source: base, unverified: unv, where: b.entry.title + (b.entry.org ? ' · ' + b.entry.org : ''), cls: mq.cls, questions: figQs.concat(mq.questions),
      quantified: a.quantified && !unv.length, pastRole: isPastRole(b.entry, today),
      priority: (unv.length ? 20 : 0) + (a.quantified ? 0 : 10) + (mq.cls !== 'general' ? 3 : 0) + (3 - Math.min(3, rank[b.entryId] || 0)) + (b.idx === 0 ? 2 : 0) };
  })
    .filter(function(x){ return !x.quantified; })
    .sort(function(a, b){ return b.priority - a.priority; });
}
// Deterministic, honest composition from the person's own answers. The AI pass
// (when signed in) can make it more fluent; both go through the same honesty
// check before they can be applied.
// A role you've left reads in past tense: "Prepare drinks" -> "Prepared drinks". Grammar only.
function toPastIfPresent(sentence){
  if(!isPresentVerbOpener(sentence)) return sentence;
  var w = firstWord(sentence), rest = clean(sentence).split(' ').slice(1).join(' ');
  return cap(presentToPast(w) + (rest ? ' ' + rest : ''));
}
function isPastRole(en, today){ var r = entryRange(en, today); return !!(r.e && r.e.ok && !r.present && !r.noEnd); }
var JOINABLE = /^(cutting|reducing|saving|earning|keeping|helping|resulting|which|so|leading|raising|increasing|improving|making|bringing|freeing|lowering)\b/i;
// A measurement goes before the "how" ("Reduced wait times by 30% by redesigning the queue"), else at the end.
var HOW_RE = /\s(?:by\s+(?=\w+ing\b)|through\s|using\s|via\s)/i;
function insertMeasure(sentence, y){
  if(!y) return sentence;
  var probe = sentence.length > 400 ? sentence.slice(0, 400) : sentence, m = probe.match(HOW_RE);
  return (m && m.index > 0) ? sentence.slice(0, m.index) + ' ' + y + sentence.slice(m.index) : sentence + ' ' + y;
}
function composeQuantified(text, answers, opts){
  answers = answers || {};
  var ys = [];
  if(opts && opts.unverified && opts.unverified.length){ var cf = confirmFigures(text, opts.unverified, answers); text = cf.text; ys = cf.y; }
  var out = strengthenOpener(text);
  if(opts && opts.pastRole) out = toPastIfPresent(out);
  var qty = clean(answers.count || answers.reach || '');
  var amount = clean(answers.amount || '');
  var tail = stripEnd(answers.outcome || answers.compare || '');
  var scope = stripEnd(answers.scope || '');
  ys.concat(amount ? [amount] : []).forEach(function(m){ out = insertMeasure(out, yPhrase(m)); });
  if(qty) out = insertQuantity(out, qty);
  if(scope) out = out + ' for ' + lowerFirst(scope.replace(/^for\s+/i, ''));
  if(tail) out = out + (JOINABLE.test(tail) ? ', ' : ' – ') + lowerFirst(tail);
  return cap(clean(out));
}
// `source` is what the person actually said for this line (bulletSource / sourceFor), never a
// polished line that may carry a number nobody verified. Answers are what they typed just now.
function honesty(source, answers, candidate){
  var ans = (answers && typeof answers === 'object') ? Object.keys(answers).map(function(k){ var v = answers[k]; return v == null ? '' : String(v); }).join(' \n ') : '';
  var info = srcInfo(clean(source) + ' \n ' + ans), cand = normNumerals(candidate);
  var claims = numericClaims(cand), ok = claims.filter(function(c){ return claimSupported(c, info); });
  var bad = badClaims(info, claims);
  swappedClaims(info.norm, info.claims, cand, claims).concat(rebindClaims(info, claims)).forEach(function(c){ if(bad.indexOf(c) < 0) bad.push(c); });
  var flagged = bad.sort(function(a, b){ return a.index - b.index; }).map(function(c){ return c.shown || c.text; });
  flagged = uniq(flagged.concat(fabAgainst(info, cand, ok).filter(function(tok){ return !flagged.some(function(f){ return f.toLowerCase().indexOf(String(tok).toLowerCase()) >= 0; }); })));
  return { ok: flagged.length === 0, flagged: flagged };
}

/* ================================================================ 7. XYZ COACH
   Google's formula: "Accomplished [X] as measured by [Y], by doing [Z]." */
// Bounded on purpose: word-counted "from X to Y" keeps matching linear even on pathological input.
var Y_RE = /\b(?:by|of)\s+(?:about\s+|over\s+|nearly\s+|roughly\s+|almost\s+|more than\s+)?[$£€]?\d[\d,.]*\s*(?:%|percent|x\b|times|k\b|m\b|hours?|hrs?|days?|weeks?|months?|minutes?|mins?)?|\bfrom\s+(?:[^\s,;]{1,40}\s+){0,4}?[^\s,;]{0,20}\d[^\s,;]{0,20}(?:\s+[^\s,;]{1,40}){0,3}?\s+to\s+[^,;]{1,60}|[$£€]\d[\d,.]*\s*(?:k|m|b)?\b|\b\d[\d,.]*\s*(?:%|percent|x\b|\+)|\b\d[\d,.]*\s+(?:customers|clients|users|people|students|members|staff|employees|attendees|hours|days|weeks|projects|events|orders|tickets|calls|sales|accounts|reports|pages|followers|downloads|units|items|transactions|new hires|hires|guests|patients|volunteers|team members|a day|per day|a week|per week)\b/i;
var Z_RE = /\b(by|through|using|via|with|leveraging|utili[sz]ing)\s+(?!(?:about\s+|over\s+|nearly\s+|roughly\s+|almost\s+|more than\s+)?[$£€]?\d)([^,;.]+)/i;
function xyzBreakdown(text){
  var t = stripEnd(text), probe = t.length > 400 ? t.slice(0, 400) : t;   // a bullet's parts live in its first line or two
  var my = probe.match(Y_RE), mz = probe.match(Z_RE);
  var cut = Math.min(my ? my.index : t.length, mz ? mz.index : t.length);
  var x = stripEnd(t.slice(0, cut));
  var a = analyzeBullet(t);
  var xOk = !!x && !a.weakOpener && (a.opener === 'strong');
  var res = { text: t, x: { text: x, ok: xOk }, y: { text: my ? clean(my[0]) : '', ok: !!my }, z: { text: mz ? clean(mz[0]) : '', ok: !!mz }, missing: [] };
  if(!res.x.ok) res.missing.push('x'); if(!res.y.ok) res.missing.push('y'); if(!res.z.ok) res.missing.push('z');
  res.complete = 3 - res.missing.length;
  return res;
}
function xyzRebuild(original, parts, opts){
  parts = parts || {};
  var x = stripEnd(parts.x || '') || stripEnd(original);
  x = strengthenOpener(x);
  if(opts && opts.pastRole) x = toPastIfPresent(x);
  var y = parts.y ? yPhrase(parts.y) : '';
  var z = stripEnd(parts.z || '');
  if(z && !/^(by|through|using|via|with|leveraging|utili[sz]ing|after|while)\b/i.test(z)) z = (/^\w+ing\b/i.test(z) ? 'by ' : 'using ') + lowerFirst(z);
  return cap(clean([x, y, z].filter(Boolean).join(' ')));
}

/* ======================================================== 8. CAREER-SWITCH TRANSLATOR */
var FIELDS = {
  product: { label: 'Product management', re: /\bproduct\b|\bpm\b|product manag/i, roles: ['Associate Product Manager', 'Product Analyst', 'Product Operations'] },
  data: { label: 'Data & analytics', re: /\bdata\b|analyst|analytics|data scien/i, roles: ['Data Analyst', 'Business Analyst', 'Reporting Analyst'] },
  software: { label: 'Software engineering', re: /software|engineer|developer|coding|programm|web dev/i, roles: ['Junior Developer', 'QA Engineer', 'Technical Support Engineer'] },
  marketing: { label: 'Marketing', re: /marketing|brand|growth|content|social media/i, roles: ['Marketing Coordinator', 'Social Media Specialist', 'Content Associate'] },
  sales: { label: 'Sales & business development', re: /\bsales\b|business development|account exec|\bbdr\b|\bsdr\b/i, roles: ['Sales Development Rep', 'Account Executive', 'Business Development Associate'] },
  operations: { label: 'Operations', re: /operations|\bops\b|logistics|supply chain/i, roles: ['Operations Associate', 'Operations Coordinator', 'Logistics Coordinator'] },
  design: { label: 'UX & product design', re: /\bdesign|\bux\b|\bui\b/i, roles: ['Junior UX Designer', 'UX Researcher', 'Product Designer'] },
  customer_success: { label: 'Customer success', re: /customer success|customer support|account manag/i, roles: ['Customer Success Associate', 'Support Specialist', 'Account Manager'] },
  education: { label: 'Corporate training & L&D', re: /instructional|learning and development|l&d|corporate train/i, roles: ['Corporate Trainer', 'Instructional Designer', 'L&D Coordinator'] },
  finance: { label: 'Finance & accounting', re: /financ|accounting|accountant|bank/i, roles: ['Financial Analyst', 'Accounts Assistant', 'Finance Operations'] },
  hr: { label: 'People & HR', re: /\bhr\b|human resources|recruit|people ops|talent/i, roles: ['HR Coordinator', 'Recruiting Coordinator', 'People Operations Associate'] },
  consulting: { label: 'Consulting', re: /consult/i, roles: ['Business Analyst', 'Junior Consultant', 'Research Associate'] }
};
var BRIDGES = [
  { key: 'customers', cue: /\b(customers?|guests?|clients?|patrons?|shoppers?)\b/i, titleCue: /\b(barista|server|cashier|host|hostess|waiter|waitress|bartender|retail|sales associate|front desk|receptionist|customer service)\b/i, source: 'Serving customers', map: {
    product: ['User empathy & feedback', 'You hear what frustrates people firsthand - that is user research in the wild. Name one recurring problem you noticed.'],
    data: ['Customer behavior insight', 'You watched buying patterns every shift. Frame what you noticed as observations, not analysis you didn\'t do.'],
    marketing: ['Customer insight', 'You know what customers ask for and respond to - marketers pay for that knowledge.'],
    sales: ['Client relationship building', 'Repeat customers and upsells are relationship wins - name them.'],
    customer_success: ['Customer relationship management', 'This is the core of customer success - lead with it.'],
    '*': ['Customer-facing communication', 'Every field values people who handle the public well.'] } },
  { key: 'training', cue: /\b(trained|onboarded|taught|mentored|coached|tutored|training (new |the )?(hires|staff|employees|team|members|volunteers))\b/i, titleCue: /\b(trainer|tutor|coach|mentor)\b/i, source: 'Training others', map: {
    education: ['Instructional delivery', 'You\'ve already done the job - say how many people and what they could do after.'],
    hr: ['Onboarding & enablement', 'Onboarding is a core people-ops function.'],
    customer_success: ['Customer onboarding & enablement', 'Teaching people a system is what CS teams do daily.'],
    operations: ['Process training & SOP rollout', 'Training people on a process is operations work.'],
    '*': ['Onboarding & enablement', 'Teaching others is leadership evidence in any field.'] } },
  { key: 'cash', cue: /\b(register|cash|point[- ]of[- ]sale|\bpos\b|transactions?|till)\b/i, source: 'Handling cash & transactions', map: {
    finance: ['Transaction accuracy & reconciliation', 'Balancing a till is reconciliation - note how often and how accurately.'],
    operations: ['Point-of-sale operations', 'Name the system if you can.'],
    data: ['Transaction data accuracy', 'You handled raw transaction data before it became a dataset.'],
    '*': ['Financial accuracy & accountability', 'Being trusted with money signals reliability anywhere.'] } },
  { key: 'inventory', cue: /\b(inventory|stock(ed|ing)?|supplies|ordering|restock\w*)\b/i, source: 'Managing inventory', map: {
    operations: ['Inventory & supply management', 'Core operations skill - quantify the volume if you can.'],
    data: ['Demand tracking', 'Stock levels are demand data.'],
    '*': ['Resource planning', 'Keeping things stocked is planning under constraints.'] } },
  { key: 'scheduling', cue: /\b(schedul\w*|shifts?|rota|rosters?|calendar)\b/i, source: 'Scheduling', map: {
    operations: ['Workforce scheduling & capacity planning', 'Scheduling people is capacity planning.'],
    product: ['Prioritization & planning', 'Deciding what happens when, with limited people, is prioritization.'],
    '*': ['Planning & coordination', 'Every team needs someone who can coordinate time and people.'] } },
  { key: 'complaints', cue: /\b(complaints?|de-?escalat\w*|conflicts?|disputes?|difficult|upset)\b/i, source: 'Resolving complaints', map: {
    customer_success: ['Escalation management', 'Handling upset customers is escalation management.'],
    product: ['Understanding user pain points', 'Complaints are product feedback - what did people complain about most?'],
    sales: ['Objection handling', 'Turning around an unhappy person is objection handling.'],
    hr: ['Conflict resolution', 'Directly valued in people roles.'],
    '*': ['Conflict resolution', 'Calm under pressure is valued everywhere.'] } },
  { key: 'teaching', cue: /\b(lesson plans?|curriculum|classroom|students?|teach(ing)?|lectur\w*)\b/i, titleCue: /\b(teacher|instructor|teaching assistant|lecturer|professor|educator)\b/i, source: 'Teaching', map: {
    education: ['Curriculum & instructional design', 'Lesson planning is instructional design.'],
    product: ['Explaining complex ideas simply', 'PMs translate between people constantly.'],
    hr: ['Learning & development', 'L&D teams hire teachers.'],
    sales: ['Persuasive presentation', 'Holding a room is a sales skill.'],
    '*': ['Presenting & facilitation', 'You can stand up and explain things - rarer than you think.'] } },
  { key: 'assessing', cue: /\b(grad(ed|ing)|assess(ed|ment)?|evaluat\w+|feedback)\b/i, source: 'Assessing performance', map: {
    hr: ['Performance evaluation', 'Directly transferable to people roles.'], data: ['Measurement & evaluation', 'You measured outcomes - say how.'],
    '*': ['Evaluating outcomes', 'You judge quality against a standard.'] } },
  { key: 'social', cue: /\b(social media|instagram|tiktok|followers|posts?|content)\b/i, source: 'Running social media', map: {
    marketing: ['Content & community marketing', 'Bring the follower or engagement numbers.'],
    product: ['Growth & engagement experiments', 'What did you try, and what worked?'],
    data: ['Engagement analytics', 'Did you track what performed? Say so only if you did.'],
    '*': ['Digital communication', 'Writing for an audience online is a real skill.'] } },
  { key: 'events', cue: /\b(events?|fundrais\w+|hosted|conference|organi[sz]ed)\b/i, source: 'Organizing events', map: {
    marketing: ['Event marketing', 'Attendance numbers make this land.'], operations: ['Program & logistics management', 'Events are logistics projects.'],
    product: ['Launch coordination', 'Coordinating many moving parts toward one date is a launch.'],
    '*': ['Project coordination', 'An event is a project with a hard deadline.'] } },
  { key: 'spreadsheets', cue: /\b(spreadsheets?|excel|tracked|tracking|logs?|records)\b/i, source: 'Tracking things in spreadsheets', map: {
    data: ['Data collection & reporting', 'Tracking and reporting is where analytics starts.'], finance: ['Financial record-keeping', 'Accurate records are core finance hygiene.'],
    operations: ['Operational reporting', 'Ops runs on reports like these.'], '*': ['Data organization', 'Keeping clean records is valued everywhere.'] } },
  { key: 'leading', cue: /\b(supervised|captain(ed)?|headed|oversaw|shift lead|team lead|lead barista|lead server|(led|managed) (a |the )?(team|crew|group|staff|squad|shift|\d+))\b/i, titleCue: /\b(lead|leader|manager|supervisor|head|captain|president|director|foreman)\b/i, source: 'Leading people', map: {
    product: ['Leading without authority', 'PMs lead people who don\'t report to them - name who you rallied.'],
    operations: ['Team supervision', 'Directly transferable - say how many people.'],
    '*': ['Team leadership', 'Leadership transfers across every field.'] } },
  { key: 'military', cue: /\b(platoon|squad|troops|deployment|deployed|commanded|enlisted|battalion|regiment)\b/i, titleCue: /\b(sergeant|corporal|lieutenant|captain|specialist|petty officer|airman|marine|soldier|army|navy|air force)\b/i, source: 'Military service', map: {
    operations: ['Mission-critical operations', 'Translate ranks and units into team sizes and responsibilities.'],
    '*': ['Leadership under pressure', 'Say what you were responsible for, in civilian terms.'] } },
  { key: 'patients', cue: /\b(patients?|clinical|care plans?|charting|bedside)\b/i, titleCue: /\b(nurse|caregiver|cna|medical assistant|emt|paramedic|care assistant|pharmacy tech)\b/i, source: 'Patient care', map: {
    product: ['User advocacy (healthcare)', 'You know end users in high-stakes settings.'], customer_success: ['High-stakes client care', 'Patient care is the hardest kind of customer care.'],
    '*': ['Empathetic service under pressure', 'Calm, precise care for people is rare.'] } }
];
function detectField(text){ var t = String(text || ''); for(var k in FIELDS){ if(FIELDS.hasOwnProperty(k) && FIELDS[k].re.test(t)) return k; } return null; }
function careerBridges(resume, field){
  field = field && FIELDS[field] ? field : (detectField(resume.target) || null);
  var bl = allBullets(resume), rows = [];
  BRIDGES.forEach(function(br){
    var hits = bl.filter(function(b){ return br.cue.test(b.text); }).map(function(b){ return { entryId: b.entryId, idx: b.idx, text: b.text }; });
    // Titles only count through an explicit title cue ("Shift Lead" is leadership, not scheduling).
    (resume.entries || []).forEach(function(e){ if(e.title && br.titleCue && br.titleCue.test(e.title)) hits.unshift({ entryId: e.id, idx: -1, text: 'Role title: ' + e.title }); });
    if(!hits.length) return;
    var m = (field && br.map[field]) || br.map['*'];
    rows.push({ key: br.key, source: br.source, term: m[0], how: m[1], evidence: hits.slice(0, 2), count: hits.length, fieldSpecific: !!(field && br.map[field]) });
  });
  rows.sort(function(a, b){ return (b.fieldSpecific - a.fieldSpecific) || (b.count - a.count); });
  var first = mostRecentWork(resume);
  var top = rows.slice(0, 2).map(function(r){ return r.term.toLowerCase(); });
  var headline = field ? (first && first.title ? first.title + ' moving into ' : 'Moving into ') + FIELDS[field].label.toLowerCase() + (top.length ? ', bringing ' + top.join(' and ') : '') : '';
  return { field: field, fieldLabel: field ? FIELDS[field].label : '', roles: field ? FIELDS[field].roles.slice() : [], rows: rows, headline: headline ? cap(headline) : '' };
}
function parseTranslateJSON(text){
  if(!text) return null;
  var t = String(text).trim(), f = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(f) t = f[1].trim();
  var a0 = t.indexOf('['), a1 = t.lastIndexOf(']');
  if(a0 >= 0 && a1 > a0) t = t.slice(a0, a1 + 1);
  try{ var arr = JSON.parse(t); if(!Array.isArray(arr)) return null;
    return arr.filter(function(x){ return x && typeof x.original === 'string' && typeof x.translated === 'string'; })
      .map(function(x){ return { original: clean(x.original), translated: clean(x.translated), terms: Array.isArray(x.terms) ? x.terms.map(clean).filter(Boolean).slice(0, 6) : [] }; });
  }catch(e){ return null; }
}

/* ======================================================== 9. VERSIONS + WORD DIFF */
function snapshot(resume){
  return { contact: Object.assign({}, resume.contact), summary: resume.summary || '', skills: (resume.skills || []).slice(),
    entries: (resume.entries || []).map(function(e){ return { id: e.id, type: e.type, title: e.title, org: e.org, start: e.start, end: e.end, bullets: e.bullets.slice() }; }) };
}
// Saved versions come back from storage and other devices - repair anything malformed instead of crashing on it.
function normSnapshot(r){
  r = (r && typeof r === 'object' && !Array.isArray(r)) ? r : {};
  var c = (r.contact && typeof r.contact === 'object') ? r.contact : {};
  return { contact: { name: strField(c.name), email: strField(c.email), phone: strField(c.phone), loc: strField(c.loc) },
    summary: typeof r.summary === 'string' ? clean(r.summary) : '',
    skills: (Array.isArray(r.skills) ? r.skills : []).filter(function(s){ return typeof s === 'string' && clean(s); }).map(clean),
    entries: (Array.isArray(r.entries) ? r.entries : []).filter(function(e){ return e && typeof e === 'object'; }).map(function(e){
      return { id: e.id != null ? String(e.id) : '', type: String(e.type || 'work'), title: strField(e.title), org: strField(e.org), start: strField(e.start), end: strField(e.end),
        bullets: (Array.isArray(e.bullets) ? e.bullets : []).filter(function(b){ return typeof b === 'string' && clean(b); }).map(clean) };
    }) };
}
function sentToList(v){ var s = v && v.sent_to; return Array.isArray(s) ? uniq(s.filter(function(x){ return x != null && x !== ''; }).map(String)) : (s != null && s !== '' && typeof s !== 'object' ? [String(s)] : []); }
function normVersion(v){
  if(!v || typeof v !== 'object' || v.id == null || String(v.id) === '' || !v.resume || typeof v.resume !== 'object') return null;
  return { id: String(v.id), name: (typeof v.name === 'string' && clean(v.name)) ? clean(v.name).slice(0, 80) : 'Untitled version', created_at: typeof v.created_at === 'string' ? v.created_at : '',
    updated_at: typeof v.updated_at === 'string' ? v.updated_at : undefined, source: typeof v.source === 'string' ? v.source : 'manual', note: typeof v.note === 'string' ? clean(v.note).slice(0, 300) : '',
    sent_to: sentToList(v), resume: normSnapshot(v.resume) };
}
function makeVersion(name, resume, meta){
  meta = meta || {};
  return { id: meta.id || uid('rv'), name: clean(name).slice(0, 80) || 'Untitled version', created_at: meta.created_at || new Date().toISOString(),
    source: meta.source || 'manual', note: clean(meta.note || '').slice(0, 300), sent_to: Array.isArray(meta.sent_to) ? meta.sent_to.slice() : [], resume: snapshot(resume) };
}
function wordDiff(a, b){
  var A = words(a), B = words(b), n = A.length, m = B.length, out = [];
  function push(t, s){ if(out.length && out[out.length - 1].t === t) out[out.length - 1].s += ' ' + s; else out.push({ t: t, s: s }); }
  if(n * m > 250000){ if(n) out.push({ t: 'del', s: A.join(' ') }); if(m) out.push({ t: 'add', s: B.join(' ') }); return out; }
  var dp = [], i, j;
  for(i = 0; i <= n; i++){ dp.push(new Array(m + 1).fill(0)); }
  for(i = n - 1; i >= 0; i--) for(j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  i = 0; j = 0;
  while(i < n && j < m){ if(A[i] === B[j]){ push('same', A[i]); i++; j++; } else if(dp[i + 1][j] >= dp[i][j + 1]){ push('del', A[i]); i++; } else { push('add', B[j]); j++; } }
  while(i < n) push('del', A[i++]); while(j < m) push('add', B[j++]);
  return out;
}
function stemW(w){ w = String(w).toLowerCase().replace(/[^a-z0-9]/g, ''); return w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w; }
var DIFF_STOP = { the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, to: 1, for: 1, in: 1, on: 1, at: 1, with: 1, by: 1 };
function jaccard(a, b){
  var A = {}, B = {}, inter = 0, uni = 0, k;
  words(a).forEach(function(w){ var s = stemW(w); if(s && !DIFF_STOP[s]) A[s] = 1; });
  words(b).forEach(function(w){ var s = stemW(w); if(s && !DIFF_STOP[s]) B[s] = 1; });
  for(k in A){ uni++; if(B[k]) inter++; } for(k in B){ if(!A[k]) uni++; }
  return uni ? inter / uni : 0;
}
function diffVersions(va, vb){
  var ra = normSnapshot(va && va.resume), rb = normSnapshot(vb && vb.resume);
  var key = function(e){ return (clean(e.title) + '|' + clean(e.org)).toLowerCase(); };
  // Pair entries by id first, then by title + organization - each old entry pairs at most once,
  // so two stints with the same title and employer stay two stints.
  var usedA = {};
  function pairFor(eb){
    var i;
    if(eb.id) for(i = 0; i < ra.entries.length; i++) if(!usedA[i] && ra.entries[i].id === eb.id && key(ra.entries[i]) === key(eb)){ usedA[i] = 1; return ra.entries[i]; }
    for(i = 0; i < ra.entries.length; i++) if(!usedA[i] && key(ra.entries[i]) === key(eb)){ usedA[i] = 1; return ra.entries[i]; }
    return null;
  }
  var entries = [], added = 0, removed = 0;
  function countWords(d){ d.forEach(function(p){ if(p.t === 'add') added += words(p.s).length; if(p.t === 'del') removed += words(p.s).length; }); }
  rb.entries.forEach(function(eb){
    var ea = pairFor(eb);
    if(!ea){ entries.push({ title: eb.title, org: eb.org, status: 'added', bullets: eb.bullets.map(function(b){ var d = [{ t: 'add', s: b }]; countWords(d); return { status: 'added', diff: d }; }) }); return; }
    var aLeft = ea.bullets.map(function(b, i){ return { b: b, i: i, used: false }; }), rows = [];
    eb.bullets.forEach(function(b){
      var best = null, bestSim = 0;
      aLeft.forEach(function(x){ if(x.used) return; var s = jaccard(x.b, b); if(s > bestSim){ bestSim = s; best = x; } });
      if(best && bestSim >= 0.2){ best.used = true; var d = wordDiff(best.b, b); countWords(d); rows.push({ status: best.b === b ? 'same' : 'changed', diff: d }); }
      else { var d2 = [{ t: 'add', s: b }]; countWords(d2); rows.push({ status: 'added', diff: d2 }); }
    });
    aLeft.filter(function(x){ return !x.used; }).forEach(function(x){ var d = [{ t: 'del', s: x.b }]; countWords(d); rows.push({ status: 'removed', diff: d }); });
    var changed = rows.some(function(r){ return r.status !== 'same'; });
    entries.push({ title: eb.title, org: eb.org, status: changed ? 'changed' : 'same', bullets: rows });
  });
  ra.entries.forEach(function(ea, i){ if(usedA[i]) return; entries.push({ title: ea.title, org: ea.org, status: 'removed', bullets: ea.bullets.map(function(b){ var d = [{ t: 'del', s: b }]; countWords(d); return { status: 'removed', diff: d }; }) }); });
  var sd = wordDiff(ra.summary || '', rb.summary || ''); countWords(sd);
  var askills = (ra.skills || []).map(function(s){ return s.toLowerCase(); }), bskills = (rb.skills || []).map(function(s){ return s.toLowerCase(); });
  return { summary: sd, skills: { added: (rb.skills || []).filter(function(s){ return askills.indexOf(s.toLowerCase()) < 0; }), removed: (ra.skills || []).filter(function(s){ return bskills.indexOf(s.toLowerCase()) < 0; }) },
    entries: entries, stats: { wordsAdded: added, wordsRemoved: removed, changedEntries: entries.filter(function(e){ return e.status !== 'same'; }).length } };
}

/* ======================================================= 10. CALLBACK ANALYTICS
   Which version actually gets callbacks. Versions need MIN_SAMPLE tagged
   applications before they're ranked at all, then rank by the Wilson lower bound
   (a pessimistic estimate of the true interview rate), so a lucky 1-for-1 never
   outranks a solid 6-for-15. */
var MIN_SAMPLE = 3;
function wilsonLower(pos, n, z){
  if(!n) return 0; z = z || 1.96;
  var p = pos / n, z2 = z * z;
  return Math.max(0, (p + z2 / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / (1 + z2 / n));
}
var POSITIVE = { interview: 1, offer: 1 };
function callbackStats(versions, applications){
  var apps = Array.isArray(applications) ? applications : [], byId = {};
  apps.forEach(function(a){ if(a && a.id != null) byId[String(a.id)] = a; });
  var linked = {};
  var rows = (Array.isArray(versions) ? versions : []).filter(function(v){ return v && typeof v === 'object'; }).map(function(v){
    var list = sentToList(v).map(function(id){ linked[id] = 1; return byId[id]; }).filter(Boolean);
    var r = { id: v.id, name: v.name, source: v.source, sent: list.length, interviews: 0, offers: 0, rejected: 0, ghosted: 0, pending: 0, apps: list.map(function(a){ return { id: a.id, title: a.listing_title || a.title || '', org: a.listing_org || a.org || '', outcome: a.outcome_status || '' }; }) };
    list.forEach(function(a){ var o = String(a.outcome_status || '').toLowerCase(); if(o === 'interview') r.interviews++; else if(o === 'offer'){ r.offers++; } else if(o === 'rejected') r.rejected++; else if(o === 'ghosted') r.ghosted++; else r.pending++; });
    r.positive = r.interviews + r.offers;
    r.decided = r.sent - r.pending;
    r.rate = r.sent ? r.positive / r.sent : 0;
    r.lower = wilsonLower(r.positive, r.sent);
    r.enough = r.sent >= MIN_SAMPLE;
    return r;
  });
  rows.sort(function(a, b){ return (b.enough - a.enough) || (b.lower - a.lower) || (b.sent - a.sent); });
  var sentApps = apps.filter(function(a){ return a && a.id != null && (a.status === 'sent' || a.sent_at || a.outcome_status); });
  var unlinked = sentApps.filter(function(a){ return !linked[String(a.id)]; });
  var versionOf = {};
  (Array.isArray(versions) ? versions : []).forEach(function(v){ if(v && typeof v === 'object') sentToList(v).forEach(function(id){ if(!versionOf[id]) versionOf[id] = String(v.id); }); });
  var totalSent = rows.reduce(function(s, r){ return s + r.sent; }, 0), rec;
  var ranked = rows.filter(function(r){ return r.enough; });
  if(!rows.length) rec = { kind: 'empty', text: 'Save a version, then tag which applications you sent it to - this view will show which resume actually gets callbacks.' };
  else if(totalSent < 5 || !ranked.length) rec = { kind: 'early', text: 'Too early to call: ' + totalSent + ' tagged application' + (totalSent === 1 ? '' : 's') + '. A version needs ' + MIN_SAMPLE + '+ tagged applications before it\'s ranked - 5+ each before you trust a winner.' };
  else if(!rows.some(function(r){ return r.positive > 0; })) rec = { kind: 'none', text: 'No interviews yet across ' + totalSent + ' tagged applications. Work the Scorecard\'s top fixes and try a tailored version for your next batch.' };
  else if(ranked.length === 1) rec = { kind: 'only', text: '"' + ranked[0].name + '" is the only version with enough data: ' + ranked[0].positive + '/' + ranked[0].sent + ' got interviews (' + pct(ranked[0].positive, ranked[0].sent) + '%). Tag applications to your other versions to compare.' };
  else {
    var best = ranked[0], second = ranked[1];
    if(best.sent >= 4 && second.sent >= 4 && best.lower > second.rate + 0.05) rec = { kind: 'winner', text: '"' + best.name + '" is clearly ahead: ' + best.positive + '/' + best.sent + ' got interviews vs ' + second.positive + '/' + second.sent + ' for "' + second.name + '". Use it as your base.' };
    else rec = { kind: 'leading', text: '"' + best.name + '" leads so far (' + best.positive + '/' + best.sent + ' vs ' + second.positive + '/' + second.sent + '), but the gap isn\'t decisive yet - keep tagging.' };
  }
  var appRow = function(a){ return { id: String(a.id), title: strField(a.listing_title || a.title) || 'Application', org: strField(a.listing_org || a.org), outcome: strField(a.outcome_status).toLowerCase(), versionId: versionOf[String(a.id)] || '' }; };
  return { rows: rows, unlinked: unlinked.map(appRow), sent: sentApps.map(appRow), totalSent: totalSent, recommendation: rec };
}

/* ====================================================== 11. DEFEND EVERY LINE */
var TOOL_RE = /\b(python|sql|excel|tableau|figma|react|javascript|typescript|java|aws|salesforce|hubspot|jira|power bi|photoshop|canva|shopify|wordpress|google analytics)\b/i;
function defendLine(text, entry, unverified){
  var t = stripEnd(text), low = t.toLowerCase(), a = analyzeBullet(t), qs = [], risks = [];
  var unv = Array.isArray(unverified) ? unverified : (entry && (entry.source != null || entry.flagged) ? unverifiedIn(t, entry) : []);
  var w = words(t), lead = w.slice(0, 9).join(' ') + (w.length > 9 ? '…' : '');
  qs.push('Walk me through this: "' + lead + '"');
  var num = t.match(/[$£€]?\d[\d,.]*\s*(?:%|percent|x\b|k\b|m\b)?(?:\s+\w+)?/);
  if(num) qs.push('How did you measure "' + clean(num[0]) + '"? What was the baseline, and over what period?');
  if(/\b(led|lead|manag\w* (a |the )?(team|staff|crew|\d+)|supervis|mentor|train|coach|onboard|direct\w* (a |the )?team|head\w* (a |the )?team|oversaw|captain|teach|taught|tutor)/.test(low)) qs.push('How did you handle someone who wasn\'t keeping up, or who disagreed with you?');
  if(/\b(built|created|designed|developed|launched|wrote|programmed|engineered|implemented|prototyped)/.test(low)) qs.push('What trade-offs did you make, and what would you do differently now?');
  if(/\b(improv|increas|reduc|cut|streamlin|optimi|boost|grew|sav|decreas|automat)/.test(low)) qs.push('What was the root cause you found before you could improve it?');
  if(/\b(customers?|clients?|guests?|users?|patients?|students?)\b/.test(low)) qs.push('Tell me about the most difficult person you dealt with in this.');
  if(/\b(we|our|team|together|helped|assisted|supported)\b/.test(low)) qs.push('What was your specific contribution, versus the team\'s?');
  var tool = t.match(TOOL_RE);
  if(tool) qs.push('What was the hardest problem you hit using ' + tool[0] + '?');
  if(qs.length < 3) qs.push('What was the hardest part of this, and how did you handle it?');
  if(qs.length < 3) qs.push('What did you learn from this that you\'d bring to this role?');
  if(!a.quantified) risks.push('No number - expect "can you be more specific?". Have one concrete example ready.');
  var bigPct = (t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/gi) || []).some(function(p){ return parseFloat(p) >= 30; });
  var bigMoney = /[$£€]\s?\d[\d,]*(?:\.\d+)?\s*(k|m|b|million|billion)?/i.test(t) && (/(k|m|b|million|billion)\b/i.test(t) || /\d{2},\d{3}|\d{5,}/.test(t));
  if(bigPct || bigMoney || /\b(doubled|tripled|transformed|revolutioni[sz]ed|single-?handedly|spearheaded)\b/i.test(t)) risks.push('Big claim - recruiters probe these. Know exactly how it was measured and what your part was.');
  if(/\b(we|our)\b/i.test(t) || /\bteam\b/i.test(t)) risks.push('Team language - be ready to separate your part from the team\'s.');
  if(a.weakOpener) risks.push('Vague role ("' + a.weakOpener + '") - prepare exactly what you personally did.');
  if(unv.length) risks.unshift('Uses ' + unv.join(', ') + ', which isn\'t in anything you wrote for this role. If you can\'t say exactly how it was measured, confirm the real figure or cut it (Red Flags) before you send this.');
  var sres = (/\d/.test(t) && t.length <= 1200) ? t.match(/[^,;]*\d[^,;]*/) : null;
  return { text: t, questions: uniq(qs).slice(0, 5), risk: (unv.length || risks.length >= 2) ? 'high' : risks.length === 1 ? 'med' : 'low', risks: risks, unverified: unv,
    star: { s: 'Where were you and what was going on? (' + ((entry && (entry.org || entry.title)) || 'this role') + ')', t: 'What were you specifically responsible for?',
      a: 'What did you do, step by step?', r: a.quantified && sres && !unv.length ? 'Land the result: ' + clean(sres[0]) : 'What changed because of it? Use a figure you can stand behind.' } };
}
function defendAll(resume){
  return allBullets(resume).map(function(b){ var d = defendLine(b.text, b.entry, b.unverified); d.entryId = b.entryId; d.idx = b.idx; d.where = b.entry.title + (b.entry.org ? ' · ' + b.entry.org : ''); return d; });
}

/* ================================================= 12. PREVIEW + ONE-PAGE FIT */
/* Page model, in CSS pixels at 96dpi, measured from renderResumeHTML's own stylesheet: a Letter page is
   1056px tall with 0.55in (52.8px) margins, so 950.4px of content. Structure (headings, margins, line
   boxes) is exact; line wrapping uses the font's average character advance - a typical value per
   template, replaced by the advance the live preview MEASURES on this device (opts.calib[tpl].cw), so
   the estimate matches what actually prints here. */
var TEMPLATES = {
  classic: { label: 'Classic', lh: 18.9, cw: 6.3, h1: 36, h1mb: 2, ctmt: 0, ct: 17.1, h2: 21.9, h2mt: 12, h2mb: 6 },
  modern: { label: 'Modern', lh: 18.67, cw: 6.07, h1: 39.2, h1mb: 0, ctmt: 2, ct: 17.7, h2: 22.7, h2mt: 13, h2mb: 5 },
  compact: { label: 'Compact', lh: 15.33, cw: 5.58, h1: 26.7, h1mb: 0, ctmt: 1, ct: 14.3, h2: 16, h2mt: 8, h2mb: 3 }
};
var PAGE_H = 1056, PAGE_PAD = 105.6, TEXT_W = 710.4, BULLET_W = 694.4;
function groupEntries(resume, today){
  var g = { work: [], project: [], education: [] };
  recencyOrder(resume, today).order.forEach(function(e){ (isEdu(e) ? g.education : isProject(e) ? g.project : g.work).push(e); });
  return g;
}
// The measured character advance for a template on this device, or null to use the template's typical one.
var DEFAULT_CALIB = null;
function setDefaultCalib(c){ DEFAULT_CALIB = (c && typeof c === 'object') ? c : null; }
function calibFor(opts, tpl){
  var c = (opts && opts.calib) || DEFAULT_CALIB, v = (c && typeof c === 'object' && !(typeof c.cw === 'number')) ? c[tpl] : c;
  var cw = v && typeof v === 'object' ? v.cw : null;
  return (typeof cw === 'number' && isFinite(cw) && cw > 2 && cw < 14) ? { cw: cw } : null;
}
function tplMetrics(tpl, opts){ var T = TEMPLATES[tpl] || TEMPLATES.classic, c = calibFor(opts, tpl); return c ? Object.assign({}, T, { cw: c.cw }) : T; }
// Greedy word wrap with an average character advance - how many lines a block of text takes.
function wrapCount(text, W, cw){
  var ws = clean(text).split(' '), lines = 0, cur = 0;
  if(!ws[0]) return 0;
  for(var i = 0; i < ws.length; i++){
    var w = ws[i].length * cw;
    if(!lines){ lines = 1; cur = w; }
    else if(cur + cw + w <= W) cur += cw + w;
    else { lines++; cur = w; }
    while(cur > W){ lines++; cur -= W; }
  }
  return lines;
}
function bulletHeight(b, T){ return wrapCount(b, BULLET_W, T.cw) * T.lh; }
function estimateHeight(resume, T){
  var g = groupEntries(resume), H = T.h1 + T.h1mb + T.ctmt + T.ct, lastEntries = false;
  function section(){ H += T.h2mt + T.h2 + T.h2mb; }
  if(clean(resume.summary)){ section(); H += wrapCount(resume.summary, TEXT_W, T.cw) * T.lh; }
  ['work', 'project', 'education'].forEach(function(k){
    if(!g[k].length) return;
    section();
    g[k].forEach(function(en, i){
      var left = clean(en.title) + (en.org ? ' - ' + clean(en.org) : ''), dates = dateText(en);
      H += Math.max(1, wrapCount(left, Math.max(160, TEXT_W - (dates ? dates.length * T.cw + 12 : 0)), T.cw * 1.08)) * T.lh;
      var bs = (en.bullets || []).filter(function(b){ return clean(b); });
      if(bs.length){ H += 3; bs.forEach(function(b, j){ H += bulletHeight(b, T) + (j < bs.length - 1 ? 2 : 0); }); }
      if(i < g[k].length - 1) H += 7;
    });
    lastEntries = true;
  });
  if(resume.skills && resume.skills.length){ section(); H += wrapCount(resume.skills.join(', '), TEXT_W, T.cw) * T.lh; lastEntries = false; }
  if(lastEntries) H += 7;
  return H;
}
function estimatePages(resume, tpl, opts){
  var T = tplMetrics(tpl, opts);
  var content = estimateHeight(resume, T), H = PAGE_PAD + content, per = PAGE_H - PAGE_PAD;
  return { height: H, pages: Math.round(H / PAGE_H * 100) / 100, lines: Math.round(content / T.lh * 10) / 10, linesPerPage: Math.round(per / T.lh * 10) / 10,
    overflow: Math.max(0, Math.round((content - per) / T.lh * 10) / 10), calibrated: T !== TEMPLATES[tpl] && T !== TEMPLATES.classic };
}
function bulletValue(text, rank, target, unverified){
  var a = analyzeBullet(text), rel = 0, q = a.quantified && !(unverified && unverified.length);
  if(target.length){ var bt = tok(text), hits = target.filter(function(t){ return bt.some(function(x){ return tmatch(t, x); }); }).length; rel = Math.min(1, hits / 2); }
  var recency = rank === 0 ? 1 : rank === 1 ? 0.7 : rank === 2 ? 0.45 : 0.25;
  // Recency weighs heavily: standard practice is to trim older roles first and keep recent ones detailed.
  var base = a.score / 100 - (q ? 0 : (a.quantified ? 0.2 : 0));   // an unverified number is not worth keeping for its own sake
  return { v: base * 0.4 + rel * 0.25 + recency * 0.35, a: a, q: q, rel: rel, recency: recency };
}
// Which weakest lines to cut to reach the page limit. Values are computed once and the height is
// updated incrementally, so even a 40-role, 500-bullet resume plans in milliseconds.
function fitToOnePage(resume, tpl, opts){
  opts = opts || {};
  var T = tplMetrics(tpl, opts), limit = opts.pages || 1;
  var work = cloneResume(resume), target = targetTokens(resume);
  var H = PAGE_PAD + estimateHeight(work, T), maxH = PAGE_H * limit - T.lh;   // one line of headroom: a plan should land clearly inside the page
  var before = Math.round(H / PAGE_H * 100) / 100, cuts = [];
  var rank = renderedOrder(work, opts.today).rank, topWork = mostRecentWork(work, opts.today), left = {}, cands = [];
  work.entries.forEach(function(en){
    left[en.id] = en.bullets.length;
    en.bullets.forEach(function(b, bi){ cands.push({ en: en, bi: bi, text: b, bv: bulletValue(b, rank[en.id] || 0, target, unverifiedIn(b, en)), h: bulletHeight(b, T) + 2 }); });
  });
  cands.sort(function(x, y){ return (x.bv.v - y.bv.v) || (y.h - x.h); });
  var cutIdx = {};
  for(var i = 0; i < cands.length && H > maxH; i++){
    var c = cands[i], minKeep = (topWork && c.en.id === topWork.id) ? Math.min(2, c.en.bullets.length) : 1;
    if(left[c.en.id] <= minKeep) continue;
    left[c.en.id]--; H -= c.h;
    (cutIdx[c.en.id] = cutIdx[c.en.id] || []).push(c.bi);
    var why = [];
    if(!c.bv.q) why.push(c.bv.a.quantified ? 'number you never gave' : 'no number');
    if(c.bv.a.weakOpener || c.bv.a.opener !== 'strong') why.push('weak opener');
    if(target.length && c.bv.rel === 0) why.push('no target keywords');
    if(c.bv.recency <= 0.45) why.push('older role');
    cuts.push({ entryId: c.en.id, entryTitle: c.en.title, idx: c.bi, text: c.text, reason: why.length ? cap(why.join(', ')) : 'Lowest-value bullet left' });
  }
  work.entries.forEach(function(en){ var del = cutIdx[en.id]; if(del) en.bullets = en.bullets.filter(function(b, bi){ return del.indexOf(bi) < 0; }); });
  var after = estimatePages(work, tpl, opts).pages;
  return { before: before, after: after, fits: after <= limit, cuts: cuts, resume: work };
}
function renderResumeHTML(resume, tpl){
  tpl = TEMPLATES[tpl] ? tpl : 'classic';
  var c = resume.contact || {}, g = groupEntries(resume);
  var css = {
    classic: 'body{font-family:Georgia,"Times New Roman",serif;color:#111;font-size:10.5pt;line-height:1.35}h1{font-size:20pt;text-align:center;margin:0 0 2px;letter-spacing:.5px}.ct{text-align:center;font-size:9.5pt;color:#333;margin-bottom:10px}h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:1.2px;border-bottom:1px solid #111;margin:12px 0 6px;padding-bottom:2px}',
    modern: 'body{font-family:"Helvetica Neue",Arial,sans-serif;color:#1d1d1f;font-size:10pt;line-height:1.4}h1{font-size:21pt;margin:0;font-weight:700;letter-spacing:-.2px}.ct{font-size:9.5pt;color:#555;margin:2px 0 10px}h2{font-size:9.5pt;text-transform:uppercase;letter-spacing:1.5px;color:#2a4fd6;margin:13px 0 5px;padding-bottom:3px;border-bottom:2px solid #2a4fd6}',
    compact: 'body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:9.2pt;line-height:1.25}h1{font-size:16pt;margin:0}.ct{font-size:8.6pt;color:#333;margin:1px 0 6px}h2{font-size:9pt;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #999;margin:8px 0 3px}'
  }[tpl];
  var base = '@page{size:letter;margin:0.55in}*{box-sizing:border-box}body{margin:0;padding:0}.en{margin:0 0 7px}.eh{display:flex;justify-content:space-between;gap:12px;font-weight:700}.eo{font-weight:400;font-style:italic}.ed{font-weight:400;white-space:nowrap}ul{margin:3px 0 0 16px;padding:0}li{margin:0 0 2px}.sum{margin:0 0 4px}.sk{margin:0}';
  var h = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(c.name || 'Resume') + '</title><style>' + base + css + '</style></head><body>';
  h += '<h1>' + esc(c.name || 'Your Name') + '</h1><div class="ct">' + esc([c.email, c.phone, c.loc].filter(Boolean).join('  |  ')) + '</div>';
  if(resume.summary) h += '<h2>Summary</h2><p class="sum">' + esc(resume.summary) + '</p>';
  [['work', 'Experience'], ['project', 'Projects'], ['education', 'Education']].forEach(function(p){
    if(!g[p[0]].length) return;
    h += '<h2>' + p[1] + '</h2>';
    g[p[0]].forEach(function(en){
      h += '<div class="en"><div class="eh"><span>' + esc(en.title) + (en.org ? ' <span class="eo">- ' + esc(en.org) + '</span>' : '') + '</span><span class="ed">' + esc(dateText(en)) + '</span></div>';
      if(en.bullets.length) h += '<ul>' + en.bullets.map(function(b){ return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>';
      h += '</div>';
    });
  });
  if(resume.skills.length) h += '<h2>Skills</h2><p class="sk">' + esc(resume.skills.join(', ')) + '</p>';
  return h + '</body></html>';
}

/* ============================================== quick fixes (grammar only) */
var PRESENT_IRREG = { lead: 'led', run: 'ran', build: 'built', write: 'wrote', teach: 'taught', sell: 'sold', make: 'made', drive: 'drove',
  grow: 'grew', win: 'won', cut: 'cut', set: 'set', put: 'put', read: 'read', hold: 'held', keep: 'kept', find: 'found', give: 'gave',
  take: 'took', speak: 'spoke', send: 'sent', spend: 'spent', meet: 'met', pay: 'paid', oversee: 'oversaw', begin: 'began', bring: 'brought',
  buy: 'bought', think: 'thought', tell: 'told', understand: 'understood', stand: 'stood', see: 'saw', do: 'did', get: 'got', have: 'had' };
function presentToPast(w){
  var l = String(w || '').toLowerCase();
  if(PRESENT_IRREG[l]) return PRESENT_IRREG[l];
  if(/e$/.test(l)) return l + 'd';
  if(/[^aeiou]y$/.test(l)) return l.slice(0, -1) + 'ied';
  if(/^(plan|stop|ship|chat|drop|map|tag|log|scrap|step|prep|plot|trim|scan)$/.test(l)) return l + l.slice(-1) + 'ed';
  return l + 'ed';
}
// Mechanical fixes that change grammar only - never a fact or a number. null = needs a human.
function quickFix(kind, text){
  var t = clean(text);
  if(kind === 'pronoun'){ var m = t.match(/^(I|We)\s+([a-z]\w*)(.*)$/); return m && isPastVerb(m[2].toLowerCase()) ? cap(m[2] + m[3]) : null; }
  if(kind === 'tense'){ if(!isPresentVerbOpener(t)) return null; var w = firstWord(t), rest = t.split(' ').slice(1).join(' '); return cap(presentToPast(w) + (rest ? ' ' + rest : '')); }
  return null;
}

/* ================================================================== vitals */
function vitals(resume, opts){
  var sc = scoreResume(resume, opts), scan = recruiterScan(resume, opts), flags = redFlags(resume, opts), ev = skillsEvidence(resume), est = estimatePages(resume, 'classic', opts);
  return { score: sc.total, grade: sc.grade, takeaway: scan.takeaway, verdict: scan.verdict, quantified: sc.quantified, bullets: sc.bulletCount,
    flags: flags.length, highFlags: flags.filter(function(f){ return f.severity === 'high'; }).length, pages: est.pages, evidence: ev.coverage, skills: resume.skills.length };
}

root.RESUME_STUDIO_ENGINE = {
  // utils exposed for the UI + tests
  esc: esc, clean: clean, words: words, cap: cap, uniq: uniq, fab: fab, uid: uid,
  parseDate: parseDate, splitRange: splitRange, entryRange: entryRange, fmtSpan: fmtSpan, careerSpan: careerSpan,
  splitBullets: splitBullets, buildResume: buildResume, cloneResume: cloneResume, allBullets: allBullets, recencyOrder: recencyOrder, mostRecentWork: mostRecentWork,
  analyzeBullet: analyzeBullet, targetTokens: targetTokens,
  scoreResume: scoreResume, recruiterScan: recruiterScan, atsXray: atsXray, redFlags: redFlags, skillsEvidence: skillsEvidence,
  metricQuestions: metricQuestions, metricTargets: metricTargets, composeQuantified: composeQuantified, honesty: honesty,
  normNumerals: normNumerals, numericClaims: numericClaims, strictFlags: strictFlags, stripClaims: stripClaims, sourceFor: sourceFor, unverifiedIn: unverifiedIn,
  bulletSource: bulletSource, isPresentVerbOpener: isPresentVerbOpener, normSnapshot: normSnapshot, normVersion: normVersion, sentToList: sentToList,
  wrapCount: wrapCount, PAGE_H: PAGE_H, PAGE_PAD: PAGE_PAD, calibFor: calibFor, jaccard: jaccard,
  confirmFigures: confirmFigures, figureAnswers: figureAnswers, figureSpan: figureSpan, expandMag: expandMag, stripOk: stripOk, setDefaultCalib: setDefaultCalib, claimSupported: claimSupported, srcInfo: srcInfo, lineSourceFor: lineSourceFor, contentJaccard: contentJaccard,
  strengthenOpener: strengthenOpener, gerundToPast: gerundToPast, insertQuantity: insertQuantity, yPhrase: yPhrase, renderedOrder: renderedOrder,
  xyzBreakdown: xyzBreakdown, xyzRebuild: xyzRebuild,
  FIELDS: FIELDS, detectField: detectField, careerBridges: careerBridges, parseTranslateJSON: parseTranslateJSON,
  snapshot: snapshot, makeVersion: makeVersion, wordDiff: wordDiff, diffVersions: diffVersions,
  wilsonLower: wilsonLower, callbackStats: callbackStats,
  defendLine: defendLine, defendAll: defendAll,
  TEMPLATES: TEMPLATES, estimatePages: estimatePages, fitToOnePage: fitToOnePage, renderResumeHTML: renderResumeHTML,
  presentToPast: presentToPast, quickFix: quickFix, dateText: dateText, isEdu: isEdu, isProject: isProject, isPastRole: isPastRole, toPastIfPresent: toPastIfPresent,
  vitals: vitals, answerNoop: function(v){ v = clean(v); return !v || YES_RE.test(v) || NON_ANSWER_RE.test(v); }, sentenceSplit: sentenceSplit, lineMatch: lineMatch, entryFactText: entryFactText, contentSet: contentSet, swappedClaims: swappedClaims
};
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================================
   PART 2 - UI. Mounts into the Workshop's Resume section (#resumeSection):
   a vital-signs header + 13 tabs; the existing builder stays the "Build" tab.
   ========================================================================== */
(function(root){
'use strict';
var E = root.RESUME_STUDIO_ENGINE;
if(!E) return;
var D = root.document;
function dep(n){ return (root && typeof root[n] === 'function') ? root[n] : null; }
var esc = E.esc;
var S = { tab: 'build', xyzSel: null, xyzDraft: null, minerDrafts: {}, minerFocus: null, minerAll: false, field: null, tpl: 'classic', fitPlan: null,
  cmpA: null, cmpB: '__current', defendRisky: false, scanDim: false, today: null, ai: {}, aiBusy: {}, translate: null, toastTimer: null, bound: false, hydrated: false,
  calib: null, lastSave: null };
var CALIB_KEY = 'kaidostar_resume_studio_calib';
function calib(){ if(!S.calib){ var c = lsGet(CALIB_KEY, {}); S.calib = (c && typeof c === 'object' && !Array.isArray(c)) ? c : {}; E.setDefaultCalib(S.calib); } return S.calib; }
function opt(){ var o = { calib: calib() }; if(S.today) o.today = S.today; return o; }

/* ------------------------------------------------------------ data access */
function session(){ var f = dep('getSession'); try{ var s = f && f(); return (s && typeof s === 'object') ? s : {}; }catch(e){ return {}; } }
function loggedUid(){ return session().user_id || null; }
function profileRaw(){ var f = dep('getProfile'); try{ var p = f ? f() : null; return (p && typeof p === 'object' && !Array.isArray(p)) ? p : null; }catch(e){ return null; } }
function profile(){ return profileRaw() || {}; }
function rawEntries(){ var f = dep('getResumeEntries'); try{ var a = f ? f() : []; return Array.isArray(a) ? a : []; }catch(e){ return []; } }
function resumeDoc(){ var f = dep('getResumeDocument'); try{ var d = f ? f() : null; return (d && typeof d === 'object' && !Array.isArray(d)) ? d : null; }catch(e){ return null; } }
function current(){ return E.buildResume({ profile: profile(), session: session(), entries: rawEntries(), doc: resumeDoc() }); }
function lsGet(k, d){ try{ var v = JSON.parse(root.localStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }
// Write and VERIFY. Near the storage quota a write can silently fail - it must never be reported as done.
function lsSet(k, v){
  var s; try{ s = JSON.stringify(v); }catch(e){ return false; }
  try{ var f = dep('_safeSetItem'); if(f){ if(f(k, s) === false) return false; } else root.localStorage.setItem(k, s); }catch(e){ return false; }
  try{ return root.localStorage.getItem(k) === s; }catch(e){ return false; }
}
function lsRemove(k){ try{ root.localStorage.removeItem(k); }catch(e){} }
function quiet(p){ try{ if(p && typeof p.catch === 'function') p.catch(function(){}); }catch(e){} }
function applications(){ var f = dep('getApplications'); try{ var a = f ? f() : []; return Array.isArray(a) ? a.filter(function(x){ return x && typeof x === 'object'; }) : []; }catch(e){ return []; } }
var STORAGE_FULL = 'Couldn’t save - your browser storage is full, so nothing was changed. Deleting old versions (Versions tab) frees space.';
var BACKUP_FAILED = 'Your browser storage is full, so your current resume couldn’t be backed up first - nothing was ';
function writeDoc(d){ return lsSet('kaidostar_resume_document', d); }
function writeEntries(list){ return lsSet('kaidostar_resume_entries', list); }
function writeProfile(p){
  if(!lsSet('kaidostar_profile', p)) return false;
  var u = loggedUid(); if(u && typeof root.apiSaveProfile === 'function') quiet(root.apiSaveProfile(u, p));
  return true;
}
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Signed in: keep the backend copy of their own-words record in step, so a Generate there keeps what they confirmed here.
function syncEntry(e){
  var u = loggedUid();
  if(u && e && e.id != null && UUID_RE.test(String(e.id)) && typeof root.apiUpdateResumeEntry === 'function') quiet(root.apiUpdateResumeEntry(e.id, { raw_description: String(e.raw_description || '') }));
}
function sigOf(R){ try{ return JSON.stringify(E.snapshot(R)); }catch(e){ return String(Math.random()); } }

/* ---------------------------------------------------------------- versions */
var VKEY = 'kaidostar_resume_versions';
function versions(){ var v = lsGet(VKEY, []); return Array.isArray(v) ? v.map(E.normVersion).filter(Boolean) : []; }
function setVersions(list){ return lsSet(VKEY, list); }
function syncVersion(v){
  var u = loggedUid(); if(!u || typeof root.apiCreateWorkshopItem !== 'function') return;
  try{ if(JSON.stringify(v).length > 19000) return; }catch(e){ return; }   // backend caps each item; stays local-only if huge
  quiet(root.apiCreateWorkshopItem(u, 'resume_version', v.id, v));
}
// Returns the saved version, or null when it could not be stored (callers must not report success).
function saveVersion(name, resume, meta){
  var v = E.makeVersion(name, resume || current(), meta || {});
  var list = versions(); list.unshift(v);
  if(!setVersions(list)) return null;
  syncVersion(v); return v;
}
function deleteVersion(id){
  if(!setVersions(versions().filter(function(x){ return x.id !== id; }))) return false;
  var u = loggedUid(); if(u && typeof root.apiDeleteWorkshopItem === 'function') quiet(root.apiDeleteWorkshopItem(u, id, 'resume_version'));
  return true;
}
function hydrateVersions(){
  var u = loggedUid(); if(!u || typeof root.apiListWorkshopItems !== 'function' || S.hydrated) return;
  S.hydrated = true;
  quiet(Promise.resolve(root.apiListWorkshopItems(u, 'resume_version')).then(function(items){
    if(!Array.isArray(items) || !items.length) return;
    var list = versions(), have = {}, added = 0;
    list.forEach(function(v){ have[v.id] = 1; });
    items.forEach(function(it){ var d = E.normVersion(it && it.data); if(d && !have[d.id]){ list.push(d); have[d.id] = 1; added++; } });
    if(added){ list.sort(function(a, b){ return String(b.created_at).localeCompare(String(a.created_at)); }); if(setVersions(list)) refresh(); }
  }));
}

/* ------------------------------------------------- applying edits (+ undo) */
var UNDO_KEY = 'kaidostar_resume_studio_undo';
function undoStack(){ var st = lsGet(UNDO_KEY, []); return Array.isArray(st) ? st.filter(function(x){ return x && typeof x === 'object' && typeof x.label === 'string'; }) : []; }
// One undo step = the document before the change, plus ONLY the parts of the person's own record and profile
// the change touches - so undo never reverts something they did elsewhere in the meantime.
function pushUndo(label, extra){
  extra = extra || {};
  var doc = resumeDoc(), item = { label: String(label || 'edit'), at: Date.now(), hadDoc: !!doc, doc: doc };
  if(extra.rawIndex != null && extra.rawIndex >= 0){ var e = rawEntries()[extra.rawIndex]; if(e) item.raw = { index: extra.rawIndex, id: e.id != null ? e.id : null, raw_description: e.raw_description == null ? '' : String(e.raw_description) }; }
  var p = profileRaw();
  if(extra.skills && p) item.skills = { value: typeof p.skills === 'string' ? p.skills : (p.skills == null ? null : p.skills) };
  if(extra.contact && p) item.contact = { fullName: p.fullName, email: p.email, phone: p.phone, loc: p.loc };
  var st = undoStack(); st.push(item);
  while(st.length > 10) st.shift();
  while(st.length){ if(lsSet(UNDO_KEY, st)) return true; st.shift(); }   // near the quota keep fewer steps, never a broken stack
  return false;
}
function dropLastUndo(){ var st = undoStack(); st.pop(); lsSet(UNDO_KEY, st); }
function rawAt(list, ref){
  var e = list[ref.index];
  if(e && (ref.id == null ? (e.id == null || e.id === '') : String(e.id) === String(ref.id))) return e;
  if(ref.id != null) for(var i = 0; i < list.length; i++) if(list[i] && String(list[i].id) === String(ref.id)) return list[i];
  return null;
}
function undo(){
  var st = undoStack(); if(!st.length){ toast('Nothing to undo'); return; }
  var last = st.pop();
  if(last.hadDoc && last.doc && typeof last.doc === 'object'){ if(!writeDoc(last.doc)){ toast(STORAGE_FULL); return; } }
  else lsRemove('kaidostar_resume_document');
  if(last.raw){ var list = rawEntries(), e = rawAt(list, last.raw); if(e){ e.raw_description = last.raw.raw_description; e.updated_at = new Date().toISOString(); if(writeEntries(list)) syncEntry(e); } }
  var p = profileRaw();   // never creates a profile that didn't exist
  if(p && last.skills){ if(last.skills.value == null) delete p.skills; else p.skills = last.skills.value; writeProfile(p); }
  if(p && last.contact){ ['fullName', 'email', 'phone', 'loc'].forEach(function(k){ if(last.contact[k] == null) delete p[k]; else p[k] = last.contact[k]; }); writeProfile(p); }
  lsSet(UNDO_KEY, st);
  afterChange(); toast('Undid: ' + last.label);
}
// Legacy entries without an id get a real one before the studio writes anything, so a later reorder
// in Build can never attach these edits to a different role. Returns {oldId: newId} (or null on failure).
function ensureIds(){
  var list = rawEntries(), missing = [];
  list.forEach(function(e, i){ if(e && typeof e === 'object' && (e.id == null || String(e.id) === '')) missing.push(i); });
  if(!missing.length) return {};
  var R0 = current(), d = resumeDoc(), map = {}, docChanged = false;
  missing.forEach(function(i){
    var nid = 'entry_' + Date.now().toString(36) + '_' + i + Math.random().toString(36).slice(2, 6), en = R0.entries.filter(function(x){ return x.rawIndex === i; })[0];
    list[i].id = nid;
    if(!en) return;
    map[en.id] = nid;                                                         // the id the screen used for this role
    var de = d && Array.isArray(d.entries) && en.docIndex >= 0 ? d.entries[en.docIndex] : null;
    if(de && typeof de === 'object'){ de.entry_id = nid; docChanged = true; }   // its document entry, by position
  });
  if(!writeEntries(list)) return null;
  if(docChanged) writeDoc(d);
  return map;
}
function docFromResume(R){
  return { summary_line: R.summary || '', entries: R.entries.map(function(e){ return { entry_id: e.rawId != null ? e.rawId : e.id, entry_type: e.type, title: e.title, org: e.org, dates: [e.start, e.end].filter(Boolean).join(' - '), bullets: e.bullets.slice(), flagged_numbers: (e.flagged || []).slice() }; }) };
}
// The generated document to write into - created from what's on screen if there isn't one yet.
function loadDocFor(R){
  var d = resumeDoc();
  if(!d || !Array.isArray(d.entries)){ d = Object.assign({}, d || {}, docFromResume(R)); R.entries.forEach(function(e, i){ e.docIndex = i; }); }
  return d;
}
// The document entry an on-screen entry was read from (by position, resolved in buildResume), created if missing.
function docEntry(d, en){
  var de = en.docIndex >= 0 ? d.entries[en.docIndex] : null;
  if(!de || typeof de !== 'object'){
    de = { entry_id: en.rawId != null ? en.rawId : en.id, entry_type: en.type, title: en.title, org: en.org, dates: [en.start, en.end].filter(Boolean).join(' - '), bullets: en.bullets.slice(), flagged_numbers: (en.flagged || []).slice() };
    d.entries.push(de); en.docIndex = d.entries.length - 1;
  }
  if((de.entry_id == null || String(de.entry_id) === '') && en.rawId != null) de.entry_id = en.rawId;   // repair the link
  if(!Array.isArray(de.bullets) || de.bullets.length !== en.bullets.length || de.bullets.some(function(b, i){ return E.clean(b) !== en.bullets[i]; })) de.bullets = en.bullets.slice();
  return de;
}
function keepFlags(prev, bullets){ return (Array.isArray(prev) ? prev : []).filter(function(n){ return bullets.some(function(b){ return String(b).indexOf(String(n)) >= 0; }); }); }
function entryById(R, id){ return R.entries.filter(function(e){ return e.id === String(id); })[0] || null; }
function norm(s){ return E.clean(s).toLowerCase().replace(/[^a-z0-9 ]/g, ''); }
// Find the line or sentence in their own record that says the same thing ("I handled X" = "Handled X") and replace it.
// When the resume's lines are known (ctx.lines, ctx.idx), lines and sentences pair one-to-one first - so a line is
// never written over the sentence another line came from. A line merged from several sentences replaces all of
// them (no duplicated facts). Appends only for new facts (append=true); grammar-only fixes never add lines.
function replaceInRecord(raw, oldText, newText, append, ctx){
  var rawS = String(raw), eol = /\r\n/.test(rawS) ? '\r\n' : '\n', lines = rawS.split(/\r?\n/), segsAll = [], target = norm(oldText), nt = E.clean(newText).replace(/[.;!]+$/, '');
  lines.forEach(function(line, li){
    var pre = (line.match(/^(?:[\s\-•*▪●>]+|\s*\(?\d{1,2}[.)]\s+|\s*\(?[a-z][.)]\s+)+/i) || [''])[0], body = line.slice(pre.length);
    if(!body.trim()) return;
    var segs = E.sentenceSplit(body);
    segs.forEach(function(sg, si){ segsAll.push({ li: li, si: si, segs: segs, pre: pre, text: sg, n: norm(sg), set: E.contentSet(sg) }); });
  });
  var setJ = function(A, B){ var inter = 0, uni = 0, k; for(k in A){ uni++; if(B[k]) inter++; } for(k in B){ if(!A[k]) uni++; } return uni ? inter / uni : 0; };
  var oldSet = E.contentSet(oldText), best = null, second = 0, taken = {}, ntSet = E.contentSet(nt);
  if(ctx && Array.isArray(ctx.lines) && ctx.idx >= 0 && ctx.idx < ctx.lines.length && ctx.lines.length * segsAll.length <= 400000){
    // one-to-one pairing, strongest pairs first (ties go to the same position)
    var pairs = [], lineSets = ctx.lines.map(function(b){ return { n: norm(b), set: E.contentSet(b) }; });
    lineSets.forEach(function(b, bi){ segsAll.forEach(function(sg, k){ var sim = sg.n === b.n ? 1 : setJ(sg.set, b.set); if(sim >= 0.2) pairs.push({ bi: bi, k: k, sim: sim }); }); });
    pairs.sort(function(a, b){ return b.sim - a.sim || Math.abs(a.bi - a.k) - Math.abs(b.bi - b.k); });
    var usedB = {}, got = null;
    pairs.forEach(function(p){ if(usedB[p.bi] || taken[p.k] != null) return; usedB[p.bi] = 1; taken[p.k] = p.bi; if(p.bi === ctx.idx) got = p; });
    if(got && got.sim >= 0.3){ best = segsAll[got.k]; best.sim = got.sim; second = 0; }
  }
  if(!best){
    segsAll.forEach(function(sg, k){
      if(taken[k] != null && taken[k] !== (ctx && ctx.idx)) return;   // another line of the resume came from this sentence
      var sim = sg.n === target ? 1 : setJ(sg.set, oldSet);
      if(!best || sim > best.sim){ if(best) second = Math.max(second, best.sim); best = sg; best.sim = sim; }
      else second = Math.max(second, sim);
    });
  }
  var confident = best && (best.sim >= 0.6 || (best.sim >= 0.45 && best.sim - second >= 0.2) || (ctx && best.sim >= 0.3 && second === 0));
  // never lose a figure the old line holds: if the new text drops one, keep their line and add the new one beside it
  var ntInfo = E.srcInfo(nt), holds = function(text){ return E.numericClaims(text, { source: true }).every(function(c){ return E.claimSupported(c, ntInfo); }); };   // their sentence, read as their words ("one store" is a figure)
  if(confident && holds(best.text)){
    var tail = (best.text.match(/[.;!]+\s*$/) || [''])[0].trim();
    best.segs[best.si] = nt + (tail || (best.si < best.segs.length - 1 ? '.' : ''));
    // other sentences this line was merged from - no other resume line's, every word and figure now in the new text - go
    var gone = {};
    segsAll.forEach(function(sg, k){
      if(sg === best || (taken[k] != null && taken[k] !== (ctx && ctx.idx))) return;
      var ks = Object.keys(sg.set); if(!ks.length) return;
      if(ks.filter(function(w){ return ntSet[w]; }).length / ks.length >= 0.8 && holds(sg.text)) (gone[sg.li] = gone[sg.li] || {})[sg.si] = 1;
    });
    lines[best.li] = best.pre + best.segs.join(' ');
    var outLines = [];
    lines.forEach(function(line, li){
      if(!gone[li]){ outLines.push(line); return; }
      var seg0 = segsAll.filter(function(sg){ return sg.li === li; })[0], keep = seg0.segs.filter(function(x, si){ return !gone[li][si]; });
      if(keep.length) outLines.push(seg0.pre + keep.join(' '));
    });
    return outLines.join(eol);
  }
  if(!append) return null;
  return (rawS.trim() ? rawS.replace(/\s+$/, '') + eol : '') + nt;
}
// Keep the person's own record in step: facts they just typed become part of their entry, so a later
// "Generate resume" keeps them. Never writes a number that didn't come from their words or answers - every
// write is checked, including grammar-only fixes (a line with a figure they never gave stays out of their record).
// Did this edit bring anything new from the person - an answer the line didn't already say, a corrected figure?
// Removing a claim or confirming one adds nothing, so their own wording stays as they wrote it ("Helped launch X"
// is never overwritten by a polished "Launched X").
function addsFacts(oldText, answers){
  var oldSet = E.contentSet(oldText), oldDigits = (E.normNumerals(oldText).match(/\d[\d,.]*/g) || []).map(function(d){ return d.replace(/[,.]$/, ''); });
  return Object.keys(answers || {}).some(function(k){
    var v = E.clean(answers[k]); if(!v) return false;
    if(/^fig\d+$/.test(k)) return !E.answerNoop(v);
    var vs = E.contentSet(v), digits = (E.normNumerals(v).match(/\d[\d,.]*/g) || []).map(function(d){ return d.replace(/[,.]$/, ''); });
    return Object.keys(vs).some(function(w){ return !oldSet[w]; }) || digits.some(function(d){ return oldDigits.indexOf(d) < 0; });   // a word or a figure the line didn't already have
  });
}
function recordFacts(en, oldText, newText, o){
  o = o || {};
  if(!en || en.rawIndex < 0) return false;
  if(o.append && !addsFacts(oldText, o.answers)) return false;
  var source = o.source != null ? o.source : E.bulletSource({ text: oldText, entry: en, unverified: E.unverifiedIn(oldText, en) });
  if(!E.honesty(source, o.answers || {}, newText).ok) return false;
  var list = rawEntries(), e = list[en.rawIndex];
  if(!e || typeof e !== 'object') return false;
  var raw = typeof e.raw_description === 'string' ? e.raw_description : '';
  var next = replaceInRecord(raw, oldText, newText, !!o.append, o.lines ? { lines: o.lines, idx: o.idx } : null);
  if(next == null || next === raw) return false;
  e.raw_description = next; e.updated_at = new Date().toISOString();
  if(!writeEntries(list)) return false;
  syncEntry(e); return true;
}
// Apply one line. opts.expect = the exact line this edit was made for: if it moved or changed, nothing is applied.
function applyBullet(entryId, idx, text, label, opts){
  opts = opts || {};
  var map = ensureIds(); if(!map){ toast(STORAGE_FULL); return false; }
  var R = current(), en = entryById(R, map[entryId] || entryId), nt = E.clean(text);
  if(!en || !(idx >= 0) || idx >= en.bullets.length || !nt) return false;
  if(opts.expect != null && en.bullets[idx] !== opts.expect){ toast('That line changed since this was drafted - nothing was applied. Take another look.'); refresh(); return false; }
  var old = en.bullets[idx], touchesRecord = !!(opts.recordFacts || opts.recordGrammar);
  var undoOk = pushUndo(label || 'edit', { rawIndex: touchesRecord ? en.rawIndex : null });
  var d = loadDocFor(R), de = docEntry(d, en);
  de.bullets[idx] = nt;
  de.flagged_numbers = keepFlags(de.flagged_numbers, de.bullets);
  if(!writeDoc(d)){ if(undoOk) dropLastUndo(); toast(STORAGE_FULL); return false; }
  if(touchesRecord) recordFacts(en, old, nt, { append: !!opts.recordFacts, source: opts.source, answers: opts.answers, lines: en.bullets.slice(), idx: idx });
  afterChange();
  toast((opts.msg || 'Applied to your resume') + (undoOk ? '' : ' (undo unavailable - storage is nearly full)'), undoOk);
  return true;
}
// Write a whole resume (a restored version, a one-page plan, a new summary) onto the current one. Entries pair by
// id, then by title + organization in order - so two stints at the same place stay two stints.
function applyResume(R2, label, o){
  o = o || {};
  var map = ensureIds(); if(!map){ toast(STORAGE_FULL); return null; }
  var R = current(), report = { matched: 0, missing: 0, skills: false, skillsSkipped: false };
  var undoOk = pushUndo(label, { skills: !!o.skills });
  var d = loadDocFor(R), used = {};
  var key = function(e){ return (E.clean(e.title) + '|' + E.clean(e.org)).toLowerCase(); };
  (R2.entries || []).forEach(function(e2){
    if(!e2 || typeof e2 !== 'object') return;
    var id2 = map[e2.id] || e2.id, tgt = null;
    if(id2 != null && id2 !== '') R.entries.forEach(function(e){ if(!tgt && !used[e.id] && e.id === String(id2)) tgt = e; });
    if(!tgt) R.entries.forEach(function(e){ if(!tgt && !used[e.id] && key(e) === key(e2)) tgt = e; });
    if(!tgt){ report.missing++; return; }
    used[tgt.id] = 1; report.matched++;
    var de = docEntry(d, tgt), nb = (Array.isArray(e2.bullets) ? e2.bullets : []).filter(function(b){ return typeof b === 'string' && E.clean(b); }).map(E.clean);
    de.bullets = nb; de.flagged_numbers = keepFlags(de.flagged_numbers, nb);
  });
  if(typeof R2.summary === 'string' && o.summary !== false){ d.summary_line = E.clean(R2.summary); d.summary_flagged_numbers = keepFlags(d.summary_flagged_numbers, [d.summary_line]); }
  if(!writeDoc(d)){ if(undoOk) dropLastUndo(); toast(STORAGE_FULL); return null; }
  if(o.skills && Array.isArray(R2.skills)){
    var p = profileRaw();
    if(p){ p.skills = E.uniq(R2.skills.map(E.clean).filter(Boolean)).join(', '); report.skills = writeProfile(p); }
    else report.skillsSkipped = true;
  }
  report.undo = undoOk;
  afterChange();
  return report;
}
// Returns { undo } when saved, null when not (no profile yet, or storage full) - never creates a stub profile.
function setSkills(list, label){
  var p = profileRaw();
  if(!p){ toast('Set up your profile first (the Survey page) - your skills live there.'); return null; }
  var undoOk = pushUndo(label, { skills: true });
  p.skills = E.uniq(list.map(E.clean).filter(Boolean)).join(', ');
  if(!writeProfile(p)){ if(undoOk) dropLastUndo(); toast(STORAGE_FULL); return null; }
  afterChange();
  return { undo: undoOk };
}
function setContact(fields){
  var p = profileRaw();
  if(!p){ toast('Set up your profile first (the Survey page) - your contact details live there.'); return false; }
  var undoOk = pushUndo('contact details', { contact: true });
  Object.keys(fields).forEach(function(k){ if(E.clean(fields[k])) p[k] = E.clean(fields[k]); });
  if(!writeProfile(p)){ if(undoOk) dropLastUndo(); toast(STORAGE_FULL); return false; }
  afterChange();
  toast('Saved to your profile', undoOk);
  return true;
}
function afterChange(){
  // Re-render the whole Resume section through the Workshop's own renderer (Build panel:
  // entries, generated resume, ATS + skills panels), which re-mounts and refreshes the studio.
  if(typeof root.renderResumeWorkshop === 'function'){ try{ root.renderResumeWorkshop(); return; }catch(e){} }
  refresh();
}

/* ------------------------------------------------------------------ chrome */
function toast(msg, withUndo){
  var el = D.getElementById('rsToast');
  if(!el){ el = D.createElement('div'); el.id = 'rsToast'; el.className = 'rs-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); D.body.appendChild(el); }
  el.innerHTML = '<span>' + esc(msg) + '</span>' + (withUndo ? '<button type="button" data-rs-undo="1">Undo</button>' : '');
  el.classList.add('show');
  clearTimeout(S.toastTimer); S.toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 6000);
}
function ring(score, grade, size){
  size = size || 64; var r = size / 2 - 6, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  var col = /[AB]/.test(grade) ? 'var(--aurora)' : grade === 'C' ? 'var(--gold)' : 'var(--danger)';
  return '<svg class="rs-ringsvg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="5"/><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
}
function head(title, sub){ return '<div class="rs-toolhead"><h3>' + esc(title) + '</h3><p>' + sub + '</p></div>'; }
function pill(text, kind){ return '<span class="rs-pill ' + (kind || '') + '">' + esc(text) + '</span>'; }
function where(b){ return esc((b.entry && (b.entry.title + (b.entry.org ? ' · ' + b.entry.org : ''))) || b.where || ''); }
function honestyBadge(h){
  return h.ok ? '<div class="rs-honest ok">&#10003; Every number here comes from your own words</div>'
    : '<div class="rs-honest bad">&#9888; ' + esc(h.flagged.join(', ')) + ' isn’t in anything you told us – edit it out or add it to your answers</div>';
}
function aiBlock(kind, title, desc){
  var out = S.ai[kind], busy = S.aiBusy[kind];
  return '<div class="rs-card rs-ai"><div class="rs-ai-top"><div><h4><span class="rs-spark">&#10022;</span> ' + esc(title) + '</h4><p>' + esc(desc) + '</p></div>'
    + '<button type="button" class="rs-btn ai" data-rs="ai" data-kind="' + kind + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Working…' : 'Ask Metis') + '</button></div>'
    + (out ? '<div class="rs-ai-out" id="rsAiOut-' + kind + '"></div>' : '') + '</div>';
}
function fillAiOutputs(){
  Object.keys(S.ai).forEach(function(k){ var el = D.getElementById('rsAiOut-' + k); if(el) el.textContent = S.ai[k]; });   // model text rendered as text, never HTML
}
function emptyState(){
  return '<div class="rs-empty"><div class="rs-empty-glyph">&#9636;</div><h3>Your studio is waiting for a resume</h3>'
    + '<p>Add your experience in <b>Build</b> - or import your resume on the survey page and it lands here automatically. Every tool lights up the moment there’s something to read.</p>'
    + '<div class="rs-row"><button type="button" class="rs-btn" data-rs-tab="build">Go to Build</button><a class="rs-btn ghost" href="survey.html">Import a resume</a></div></div>';
}

var TABS = [
  { id: 'build', label: 'Build', group: 'Write' },
  { id: 'score', label: 'Score', group: 'Analyze' }, { id: 'scan', label: '6-Second Scan', group: 'Analyze' }, { id: 'ats', label: 'ATS X-Ray', group: 'Analyze' },
  { id: 'flags', label: 'Red Flags', group: 'Analyze' }, { id: 'evidence', label: 'Evidence', group: 'Analyze' },
  { id: 'miner', label: 'Metric Miner', group: 'Improve' }, { id: 'xyz', label: 'XYZ Coach', group: 'Improve' }, { id: 'switch', label: 'Career Switch', group: 'Improve' },
  { id: 'versions', label: 'Versions', group: 'Target' }, { id: 'callbacks', label: 'Callbacks', group: 'Target' },
  { id: 'defend', label: 'Defend', group: 'Ship' }, { id: 'preview', label: 'Preview & PDF', group: 'Ship' }
];

function renderHead(R){
  var has = R.entries.length > 0, v = has ? E.vitals(R, opt()) : null, nv = versions().length;
  var groups = [], last = null;
  TABS.forEach(function(t){ if(t.group !== last){ groups.push({ g: t.group, tabs: [] }); last = t.group; } groups[groups.length - 1].tabs.push(t); });
  var tabs = '<nav class="rs-tabs" aria-label="Resume Studio tools">' + groups.map(function(g){
    return '<div class="rs-tabgroup"><span class="rs-tg-label">' + esc(g.g) + '</span><div class="rs-tg-row">' + g.tabs.map(function(t){
      var badge = '';
      if(v && t.id === 'flags' && v.flags) badge = '<i class="' + (v.highFlags ? 'bad' : '') + '">' + v.flags + '</i>';
      if(v && t.id === 'miner' && v.bullets - v.quantified > 0) badge = '<i>' + (v.bullets - v.quantified) + '</i>';
      if(t.id === 'versions' && nv) badge = '<i class="n">' + nv + '</i>';
      return '<button type="button" class="rs-tab' + (S.tab === t.id ? ' on' : '') + '" data-rs-tab="' + t.id + '" aria-pressed="' + (S.tab === t.id) + '">' + esc(t.label) + badge + '</button>';
    }).join('') + '</div></div>';
  }).join('') + '</nav>';
  var vit = has
    ? '<div class="rs-vitals"><button type="button" class="rs-ringbtn" data-rs-tab="score" title="Open the Scorecard">' + ring(v.score, v.grade, 68) + '<span class="rs-ringnum"><b>' + v.score + '</b><em>' + v.grade + '</em></span></button>'
      + '<div class="rs-vbody"><button type="button" class="rs-takeaway" data-rs-tab="scan"><small>What a recruiter takes away in 6 seconds</small><span>“' + esc(v.takeaway) + '”</span></button>'
      + '<div class="rs-chips">'
      + '<button type="button" class="rs-chip ' + (v.bullets && v.quantified / v.bullets >= 0.5 ? 'ok' : 'warn') + '" data-rs-tab="miner">' + v.quantified + '/' + v.bullets + ' bullets quantified</button>'
      + '<button type="button" class="rs-chip ' + (v.highFlags ? 'bad' : v.flags ? 'warn' : 'ok') + '" data-rs-tab="flags">' + v.flags + ' red flag' + (v.flags === 1 ? '' : 's') + '</button>'
      + '<button type="button" class="rs-chip ' + (v.pages <= 1 ? 'ok' : 'warn') + '" data-rs-tab="preview">~' + v.pages + ' page' + (v.pages === 1 ? '' : 's') + '</button>'
      + (v.skills ? '<button type="button" class="rs-chip ' + (v.evidence >= 70 ? 'ok' : 'warn') + '" data-rs-tab="evidence">' + v.evidence + '% of skills proven</button>' : '')
      + '</div></div></div>'
    : '<div class="rs-vitals rs-vitals-empty"><p>Add or import your resume to see its vital signs: score, the 6-second takeaway, red flags, page length.</p></div>';
  return '<div class="rs-head"><div class="rs-title"><span class="rs-eyebrow">Resume Studio</span><h2>Read your resume the way a recruiter does - then fix it without inventing a thing.</h2></div>' + vit + tabs + '</div>';
}

/* ------------------------------------------------------------- 1. SCORE */
function gradeLine(t){
  return t >= 85 ? 'Interview-ready. Polish the last details below.' : t >= 72 ? 'Strong - a handful of fixes from great.'
    : t >= 58 ? 'A solid base, but recruiters will skim past your best work. Start with the fixes on the right.' : 'Needs work before it goes out. The fixes on the right are ordered by impact.';
}
function renderScore(R){
  var sc = E.scoreResume(R, opt());
  var dims = sc.dimensions.map(function(d){
    var p = Math.round(d.score / d.max * 100);
    return '<div class="rs-dim"><div class="rs-dim-top"><b>' + esc(d.label) + '</b><span>' + d.score + ' / ' + d.max + '</span></div><div class="rs-bar"><i class="' + (p >= 75 ? 'ok' : p >= 50 ? 'mid' : 'low') + '" style="width:' + p + '%"></i></div>'
      + d.checks.map(function(c){ return '<div class="rs-check ' + (c.ok ? 'ok' : 'no') + '"><span>' + (c.ok ? '&#10003;' : '&#10007;') + '</span>' + esc(c.text) + '</div>'; }).join('') + '</div>';
  }).join('');
  var fixes = sc.topFixes.map(function(f){
    return '<div class="rs-fix"><div class="rs-fix-body"><div class="rs-quote">“' + esc(f.text) + '”</div><div class="rs-fix-issue">' + esc(f.issue) + '</div></div>'
      + '<button type="button" class="rs-btn sm" data-rs="fix" data-tool="' + f.tool + '" data-entry="' + esc(f.entryId) + '" data-idx="' + f.idx + '">' + (f.tool === 'metrics' ? (/never gave/.test(f.issue) ? 'Confirm or fix' : 'Find the number') : 'Fix it') + ' &rarr;</button></div>';
  }).join('');
  return head('Scorecard', 'Six things recruiters and applicant-tracking systems actually weigh. Every point traces back to a specific line - nothing here is a black box.')
    + '<div class="rs-grid2"><div class="rs-card rs-scorebig"><div class="rs-bigring">' + ring(sc.total, sc.grade, 132) + '<span class="rs-ringnum big"><b>' + sc.total + '</b><em>/ 100</em></span></div>'
    + '<div><div class="rs-grade">Grade ' + sc.grade + '</div><p>' + gradeLine(sc.total) + '</p></div></div>'
    + '<div class="rs-card"><h4>Fix these first</h4>' + (fixes || '<p class="rs-muted">Nothing urgent - nicely done.</p>') + '</div></div>'
    + '<div class="rs-dims">' + dims + '</div>'
    + aiBlock('review', 'A recruiter’s honest read', 'Metis reads the whole resume the way a recruiter hiring for your target would: verdict, strengths, and the three changes that matter most.');
}

/* --------------------------------------------------------- 2. 6-SECOND SCAN */
function renderScan(R){
  var sc = E.recruiterScan(R, opt()), heat = {};
  sc.heat.forEach(function(h){ heat[h.entryId] = h; });
  var order = E.renderedOrder(R, S.today || undefined).order, last = '';
  var paper = '<div class="rs-scanpaper' + (S.scanDim ? ' dim' : '') + '">'
    + '<div class="sp-name sp-x" style="--h:1">' + esc(R.contact.name || 'Your Name') + '</div>'
    + '<div class="sp-contact sp-x" style="--h:.5">' + esc([R.contact.email, R.contact.phone, R.contact.loc].filter(Boolean).join('  ·  ') || 'contact details') + '</div>'
    + (R.summary ? '<div class="sp-sum sp-x" style="--h:.9">' + esc(R.summary) + '</div>' : '<div class="sp-sum sp-empty sp-x" style="--h:.9">No summary - the single most-read spot on the page is empty</div>');
  order.forEach(function(en){
    var g = E.isEdu(en) ? 'Education' : E.isProject(en) ? 'Projects' : 'Experience';
    if(g !== last){ paper += '<div class="sp-h">' + g + '</div>'; last = g; }
    var h = heat[en.id] || { title: .2, org: .2, dates: .2, bullets: [] };
    paper += '<div class="sp-entry"><div class="sp-row"><span class="sp-t sp-x" style="--h:' + h.title + '">' + esc(en.title || 'Untitled') + '</span>'
      + (en.org ? '<span class="sp-o sp-x" style="--h:' + h.org + '">' + esc(en.org) + '</span>' : '') + '<span class="sp-d sp-x" style="--h:' + h.dates + '">' + esc(E.dateText(en)) + '</span></div>'
      + h.bullets.map(function(b){ return '<div class="sp-b"><span class="sp-x" style="--h:' + b.heat + '">' + esc(b.lead) + '</span> <span class="sp-x" style="--h:' + (b.heat * 0.3).toFixed(2) + '">' + esc(b.rest) + '</span></div>'; }).join('') + '</div>';
  });
  if(R.skills.length) paper += '<div class="sp-h">Skills</div><div class="sp-b"><span class="sp-x" style="--h:.18">' + esc(R.skills.join(', ')) + '</span></div>';
  paper += '</div>';
  var vk = { strong: ['Lands in 6 seconds', 'ok'], mixed: ['Partly lands', 'warn'], weak: ['Gets skimmed past', 'bad'] }[sc.verdict];
  var issues = sc.issues.map(function(i){ return '<div class="rs-issue"><span>&#9888;</span><div>' + esc(i.text) + '</div></div>'; }).join('');
  return head('6-Second Recruiter Scan', 'Recruiters often skim a resume in about 6–8 seconds, in an F-shaped path: name, top titles and employers, dates, then the first few words of the top bullets. The glow shows where their eyes actually land.')
    + '<div class="rs-grid2 rs-scan"><div>' + '<div class="rs-row rs-between"><span class="rs-muted">Brighter = read; faded = skipped</span><button type="button" class="rs-btn ghost sm" data-rs="scan-dim">' + (S.scanDim ? 'Show everything' : 'Show only what gets read') + '</button></div>' + paper + '</div>'
    + '<div><div class="rs-card"><span class="rs-label">What they walk away with</span><div class="rs-takeaway-big">“' + esc(sc.takeaway) + '”</div>' + pill(vk[0], vk[1]) + '</div>'
    + '<div class="rs-card"><h4>Why it ' + (sc.verdict === 'strong' ? 'works' : 'doesn’t land yet') + '</h4>' + (issues || '<p class="rs-muted">Your top-of-page story is clear: role, employer, dates and a number all land in the first pass.</p>') + '</div></div></div>';
}

/* ------------------------------------------------------------- 3. ATS X-RAY */
var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
function contactEditor(R){
  var c = R.contact || {}, miss = [];
  if(!c.name) miss.push(['fullName', 'Full name', 'text', 'e.g. Jordan Lee', 'name']);
  if(!EMAIL_RE.test(c.email || '')) miss.push(['email', 'Email', 'email', 'you@example.com', 'email']);
  if(String(c.phone || '').replace(/\D/g, '').length < 7) miss.push(['phone', 'Phone', 'tel', 'e.g. 555-123-4567', 'tel']);
  if(!c.loc) miss.push(['loc', 'City, State', 'text', 'e.g. Austin, TX', 'address-level2']);
  if(!miss.length) return '';
  if(!profileRaw()) return '<div class="rs-card"><p class="rs-muted">Your contact details live in your profile - set it up on the <a href="survey.html">Survey page</a> and they’ll appear here.</p></div>';
  return '<div class="rs-card rs-contact"><h4>Add what’s missing</h4><p class="rs-muted">Saved to your profile and used on every version of your resume.'
    + (!loggedUid() && miss.some(function(m){ return m[0] === 'email'; }) ? ' You’re not signed in, so there’s no account email to use - add the one employers should reach you at.' : '') + '</p>'
    + '<div class="rs-qs">' + miss.map(function(m){ return '<label class="rs-q"><span>' + esc(m[1]) + '</span><input type="' + m[2] + '" data-rs-contact="' + m[0] + '" placeholder="' + esc(m[3]) + '" autocomplete="' + m[4] + '" maxlength="120"></label>'; }).join('') + '</div>'
    + '<div class="rs-row"><button type="button" class="rs-btn" data-rs="contact-save">Save to my profile</button></div></div>';
}
function renderAts(R){
  var x = E.atsXray(R, opt());
  var fields = x.fields.map(function(f){
    var cls = f.ok ? 'ok' : f.optional ? 'opt' : 'no';
    return '<div class="rs-field ' + cls + '"><span class="rs-fi">' + (f.ok ? '&#10003;' : f.optional ? '&ndash;' : '&#10007;') + '</span><b>' + esc(f.field) + '</b><em>' + esc(f.value || (f.optional ? 'optional - not found' : 'not found')) + '</em></div>';
  }).join('');
  var risks = x.risks.map(function(r){ return '<div class="rs-risk ' + r.level + '">' + pill(r.level === 'high' ? 'High' : r.level === 'med' ? 'Medium' : 'Low', r.level === 'high' ? 'bad' : r.level === 'med' ? 'warn' : '') + '<div><div>' + esc(r.text) + '</div><div class="rs-fixline">' + esc(r.fix) + '</div></div></div>'; }).join('');
  return head('ATS X-Ray', 'Applicant-tracking systems turn your resume into plain text and pull out fields before a human ever sees it. This is that text, and exactly what the robot could and couldn’t extract.')
    + contactEditor(R)
    + '<div class="rs-grid2"><div class="rs-card"><div class="rs-row rs-between"><h4>Parse confidence</h4><span class="rs-bignum ' + (x.parseScore >= 85 ? 'ok' : x.parseScore >= 65 ? 'warn' : 'bad') + '">' + x.parseScore + '%</span></div>' + fields + '</div>'
    + '<div class="rs-card"><h4>What the robot sees</h4><pre class="rs-pre">' + esc(x.plainText) + '</pre></div></div>'
    + '<div class="rs-card"><h4>Parse risks ' + (x.risks.length ? '(' + x.risks.length + ')' : '') + '</h4>' + (risks || '<p class="rs-muted">&#10003; Nothing here should trip a parser - clean, standard, readable.</p>') + '</div>';
}

/* ------------------------------------------------------------- 4. RED FLAGS */
function bulletAt(R, entryId, idx){ var e = entryById(R, entryId); return e && idx >= 0 && e.bullets[idx] != null ? e.bullets[idx] : null; }
function renderFlags(R){
  var fl = E.redFlags(R, opt());
  if(!fl.length) return head('Red-Flag Radar', 'The things recruiters penalize but rarely tell you about.') + '<div class="rs-card rs-allclear"><h4>&#10003; No red flags</h4><p>No gaps, date problems, unverified numbers, pronouns, clichés or tense slips. Clean.</p></div>';
  var groups = { high: [], med: [], low: [] };
  fl.forEach(function(f){ groups[f.severity].push(f); });
  var out = '';
  [['high', 'High - fix before you send', 'bad'], ['med', 'Medium - worth fixing', 'warn'], ['low', 'Low - polish', '']].forEach(function(g){
    if(!groups[g[0]].length) return;
    out += '<div class="rs-flaggroup"><span class="rs-label">' + g[1] + '</span>' + groups[g[0]].map(function(f){
      var w = f.where || {}, txt = (w.idx != null && w.idx >= 0) ? bulletAt(R, w.entryId, w.idx) : null, act = '';
      if(f.kind === 'unverified' && txt != null){
        act = '<div class="rs-qf">' + (f.stripOk ? '<span class="rs-label">Take it out</span><div class="rs-quote">“' + esc(f.strip) + '”</div>' : '<span class="rs-label">This line depends on that number</span><div class="rs-muted">Taking it out would leave a line that doesn’t say anything - give the real figure, or rewrite the line.</div>')
          + '<div class="rs-row">' + (f.stripOk ? '<button type="button" class="rs-btn sm" data-rs="unv-strip" data-entry="' + esc(w.entryId) + '" data-idx="' + w.idx + '" data-expect="' + esc(txt) + '" data-text="' + esc(f.strip) + '">Remove it</button>' : '<button type="button" class="rs-btn ghost sm" data-rs="fix" data-tool="xyz" data-entry="' + esc(w.entryId) + '" data-idx="' + w.idx + '">Rewrite in XYZ Coach &rarr;</button>')
          + '<button type="button" class="rs-btn ghost sm" data-rs="fix" data-tool="metrics" data-entry="' + esc(w.entryId) + '" data-idx="' + w.idx + '">It’s real - confirm the figure &rarr;</button></div></div>';
      } else if(f.kind === 'unverified-summary'){
        act = f.stripOk ? '<div class="rs-qf"><span class="rs-label">Take it out</span><div class="rs-quote">“' + esc(f.strip) + '”</div><div class="rs-row"><button type="button" class="rs-btn sm" data-rs="unv-summary" data-expect="' + esc(R.summary) + '" data-text="' + esc(f.strip) + '">Remove it</button></div></div>'
          : '<div class="rs-qf"><span class="rs-label">Rewrite it</span><div class="rs-muted">Taking the number out would leave a broken line - edit your summary in the Build tab, or use a Career Switch headline.</div></div>';
      } else {
        var kind = /^pro-/.test(f.id) ? 'pronoun' : /^tense-/.test(f.id) ? 'tense' : null;
        var qf = (kind && txt) ? E.quickFix(kind, txt) : null;
        act = qf ? '<div class="rs-qf"><span class="rs-label">Quick fix</span><div class="rs-quote">“' + esc(qf) + '”</div><button type="button" class="rs-btn sm" data-rs="qf" data-entry="' + esc(w.entryId) + '" data-idx="' + w.idx + '" data-expect="' + esc(txt) + '" data-text="' + esc(qf) + '">Apply</button></div>'
          : (txt != null ? '<button type="button" class="rs-btn ghost sm" data-rs="fix" data-tool="xyz" data-entry="' + esc(w.entryId) + '" data-idx="' + w.idx + '">Rewrite in XYZ Coach &rarr;</button>' : '');
      }
      return '<div class="rs-flag ' + f.severity + '"><div class="rs-flag-top">' + pill(g[0] === 'high' ? 'High' : g[0] === 'med' ? 'Medium' : 'Low', g[2]) + '<b>' + esc(f.title) + '</b></div><div class="rs-flag-detail">' + esc(f.detail) + '</div><div class="rs-fixline">' + esc(f.fix) + '</div>' + act + '</div>';
    }).join('') + '</div>';
  });
  return head('Red-Flag Radar', 'What recruiters silently penalize - numbers you never gave, gaps computed from your real dates, short tenures, date errors, pronouns, clichés, tense slips, details that invite bias. Each comes with the honest way to handle it.') + out;
}

/* -------------------------------------------------------------- 5. EVIDENCE */
function renderEvidence(R){
  var ev = E.skillsEvidence(R);
  if(!R.skills.length && !ev.hidden.length) return head('Skills Evidence Matrix', 'Every skill you claim, matched to the lines that prove it.') + '<div class="rs-card"><p class="rs-muted">You haven’t listed any skills yet. Add them in your profile (or survey) and this matrix shows which ones your resume actually proves.</p></div>';
  var rows = ev.rows.map(function(r){
    var st = { proven: ['Proven', 'ok'], weak: ['1 mention', 'warn'], unproven: ['Unproven', 'bad'] }[r.status];
    var evid = r.evidence.length ? '<details><summary>' + r.evidence.length + ' line' + (r.evidence.length === 1 ? '' : 's') + '</summary>' + r.evidence.map(function(e){ return '<div class="rs-evq">' + esc(e.text) + (e.where && !e.title ? ' <span class="rs-muted">· ' + esc(e.where) + '</span>' : '') + '</div>'; }).join('') + '</details>' : '<span class="rs-muted">Nothing on the page shows it</span>';
    var act = r.status === 'unproven' ? '<button type="button" class="rs-btn ghost sm" data-rs="skill-remove" data-skill="' + esc(r.skill) + '">Remove</button>' : '';
    return '<div class="rs-evrow"><b>' + esc(r.skill) + '</b>' + pill(st[0], st[1]) + '<div class="rs-ev">' + evid + '</div><div>' + act + '</div></div>';
  }).join('');
  var hidden = ev.hidden.map(function(h){ return '<div class="rs-hidden"><div><b>' + esc(h.label) + '</b><div class="rs-muted">' + h.evidence.slice(0, 2).map(function(e){ return '“' + esc(e.text) + '”'; }).join(' · ') + '</div></div><button type="button" class="rs-btn sm" data-rs="skill-add" data-skill="' + esc(h.label) + '">+ Add to skills</button></div>'; }).join('');
  return head('Skills Evidence Matrix', 'A skills list is only as good as the proof behind it. Every skill you claim, matched to the lines that show it - and the strengths your resume proves that you never listed.')
    + '<div class="rs-grid2"><div class="rs-card"><span class="rs-label">Proof coverage</span><div class="rs-bignum ' + (ev.coverage >= 70 ? 'ok' : ev.coverage >= 40 ? 'warn' : 'bad') + '">' + ev.coverage + '%</div><p class="rs-muted">of your listed skills are backed by something on the page.' + (ev.unproven.length ? ' A recruiter who asks about <b>' + esc(ev.unproven.join(', ')) + '</b> will find nothing to point to - add a line that shows it, or drop the claim.' : '') + '</p></div>'
    + '<div class="rs-card"><h4>Hidden strengths</h4>' + (hidden || '<p class="rs-muted">No unlisted strengths found - your skills list already matches what your bullets show.</p>') + '</div></div>'
    + '<div class="rs-card"><h4>Your claimed skills</h4>' + (rows || '<p class="rs-muted">No skills listed.</p>') + '</div>';
}

/* --------------------------------------------------------- 6. METRIC MINER */
function minerKey(t){ return t.entryId + ':' + t.idx; }
// Ids may themselves contain ":" - the index is always after the LAST one.
function parseKey(k){ k = String(k || ''); var i = k.lastIndexOf(':'); return i < 0 ? { entryId: k, idx: -1 } : { entryId: k.slice(0, i), idx: +k.slice(i + 1) }; }
function findLine(R, entryId, idx){ var e = entryById(R, entryId); if(!e || !(idx >= 0) || e.bullets[idx] == null) return null; var b = { entryId: e.id, idx: idx, text: e.bullets[idx], entry: e }; b.unverified = E.unverifiedIn(b.text, e); return b; }
function targetFor(R, k){ var p = parseKey(k); return E.metricTargets(R, opt()).filter(function(t){ return t.entryId === p.entryId && t.idx === p.idx; })[0] || null; }
// A draft remembers the exact line it was written for. If that line moved (a one-page fit removed one above it)
// the draft follows it; if it changed or disappeared, the draft is dropped - never applied to a different line.
function reconcileMinerDrafts(targets){
  var next = {}, claimed = {};
  Object.keys(S.minerDrafts).forEach(function(k){
    var d = S.minerDrafts[k], here = targets.filter(function(t){ return minerKey(t) === k; })[0];
    if(here && here.text === d.src && !claimed[k]){ next[k] = d; claimed[k] = 1; return; }
    var moved = targets.filter(function(t){ var kk = minerKey(t); return t.entryId === d.entryId && t.text === d.src && !claimed[kk] && !S.minerDrafts[kk]; })[0];
    if(moved){ var nk = minerKey(moved); next[nk] = d; claimed[nk] = 1; if(S.minerFocus === k) S.minerFocus = nk; }
  });
  S.minerDrafts = next;
}
function minerAnswers(t, d){ return E.figureAnswers(t.text, t.unverified, d.answers); }
function minerHonesty(t, d){ return E.honesty(t.source, minerAnswers(t, d), d.candidate); }
function minerCard(t){
  var k = minerKey(t), d = S.minerDrafts[k] || { answers: {} }, open = S.minerFocus === k || d.candidate != null;
  var qs = t.questions.map(function(q){ return '<label class="rs-q' + (/^fig/.test(q.id) ? ' rs-q-fig' : '') + '"><span>' + esc(q.q) + '</span><input type="text" data-rs-ans="' + esc(k) + '" data-q="' + q.id + '" placeholder="' + esc(q.ph) + '" value="' + esc(d.answers[q.id] || '') + '" maxlength="160"></label>'; }).join('');
  var unv = t.unverified.length ? '<div class="rs-unvnote">&#9888; This line uses ' + esc(t.unverified.join(', ')) + ', which isn’t in anything you wrote for this role. It stays out of your new bullet unless you give the real figure below.</div>' : '';
  var cand = d.candidate != null ? '<div class="rs-cand"><span class="rs-label">Your new bullet - edit freely</span><textarea data-rs-cand="' + esc(k) + '" rows="2" maxlength="600">' + esc(d.candidate) + '</textarea><div class="rs-honslot">' + honestyBadge(minerHonesty(t, d)) + '</div>'
    + (d.note ? '<div class="rs-muted rs-note">' + esc(d.note) + '</div>' : '')
    + '<div class="rs-row"><button type="button" class="rs-btn" data-rs="mine-apply" data-key="' + esc(k) + '">Apply to resume</button>' + (loggedUid() ? '<button type="button" class="rs-btn ai" data-rs="mine-ai" data-key="' + esc(k) + '"' + (d.busy ? ' disabled' : '') + '>' + (d.busy ? 'Polishing…' : '&#10022; Polish with Metis') + '</button>' : '') + '</div></div>' : '';
  return '<div class="rs-mine' + (open ? ' open' : '') + '" data-rs-minekey="' + esc(k) + '" data-src="' + esc(t.text) + '" data-entry="' + esc(t.entryId) + '"><div class="rs-mine-top"><span class="rs-where">' + where(t) + '</span><div class="rs-quote">“' + esc(t.text) + '”</div></div>'
    + unv + '<div class="rs-qs">' + qs + '</div><div class="rs-row"><button type="button" class="rs-btn sm" data-rs="mine-build" data-key="' + esc(k) + '">Build my bullet</button><span class="rs-muted">Only what you type here goes in.</span></div>' + cand + '</div>';
}
function renderMiner(R){
  var total = E.allBullets(R).length;
  if(!total) return head('Metric Miner', 'Finds your forgotten numbers.') + '<div class="rs-card"><p class="rs-muted">No bullets yet - add what you did in <b>Build</b>, and the Miner will find the numbers hiding in it.</p></div>';
  var targets = E.metricTargets(R, opt());
  reconcileMinerDrafts(targets);
  if(!targets.length) return head('Metric Miner', 'Finds your forgotten numbers.') + '<div class="rs-card rs-allclear"><h4>&#10003; Every bullet carries a number you gave</h4><p>Nothing left to mine. Check the Scorecard for what’s next.</p></div>';
  var LIMIT = 10, shown = S.minerAll ? targets.slice() : targets.slice(0, LIMIT);
  var focus = S.minerFocus && targets.filter(function(t){ return minerKey(t) === S.minerFocus; })[0];
  if(focus && shown.indexOf(focus) < 0) shown.unshift(focus);                                             // "Find the number" always lands on its card
  targets.forEach(function(t){ if(S.minerDrafts[minerKey(t)] && shown.indexOf(t) < 0) shown.push(t); });   // drafts in progress never vanish
  var unv = targets.filter(function(t){ return t.unverified.length; }).length, quantified = total - targets.length;
  var more = targets.length > shown.length ? '<div class="rs-row rs-more"><button type="button" class="rs-btn ghost" data-rs="miner-all">Show all ' + targets.length + ' lines</button></div>'
    : (S.minerAll && targets.length > LIMIT ? '<div class="rs-row rs-more"><button type="button" class="rs-btn ghost" data-rs="miner-all">Show the top ' + LIMIT + '</button></div>' : '');
  return head('Metric Miner', 'Most resume tools make numbers up. This one asks you the questions that surface the real ones you forgot - how many, how often, how much - then builds the bullet from your answers. Nothing you didn’t say can get in.')
    + '<div class="rs-minerbar"><b>' + quantified + ' of ' + total + '</b> bullets have a number you gave. ' + targets.length + ' could be stronger' + (unv ? ' - including ' + unv + ' with a number you never gave' : '') + ' - starting with the ones recruiters read first.</div>'
    + shown.map(minerCard).join('') + more;
}

/* ------------------------------------------------------------- 7. XYZ COACH */
function xyzKey(b){ return b.entryId + ':' + b.idx; }
function renderXyz(R){
  var bl = E.allBullets(R);
  if(!bl.length) return head('XYZ Impact Coach', 'Accomplished [X] as measured by [Y], by doing [Z].') + '<div class="rs-card"><p class="rs-muted">No bullets yet - add what you did in <b>Build</b>.</p></div>';
  var sel = null;
  if(S.xyzSel){
    sel = bl.filter(function(b){ return b.entryId === String(S.xyzSel.entryId) && b.idx === S.xyzSel.idx; })[0] || null;
    if(sel && S.xyzSel.src != null && sel.text !== S.xyzSel.src){   // the line moved or changed: follow it, or let it go
      sel = bl.filter(function(b){ return b.entryId === String(S.xyzSel.entryId) && b.text === S.xyzSel.src; })[0] || null;
      if(sel){ S.xyzSel = { entryId: sel.entryId, idx: sel.idx, src: sel.text }; if(S.xyzDraft && S.xyzDraft.src === sel.text) S.xyzDraft.key = xyzKey(sel); }   // the draft follows its line
    }
  }
  if(!sel){ sel = bl.filter(function(b){ return E.xyzBreakdown(b.text).complete < 3; })[0] || bl[0]; S.xyzSel = { entryId: sel.entryId, idx: sel.idx, src: sel.text }; }
  if(S.xyzDraft && (S.xyzDraft.key !== xyzKey(sel) || S.xyzDraft.src !== sel.text)) S.xyzDraft = null;
  var list = bl.map(function(b){
    var z = E.xyzBreakdown(b.text), dots = ['x', 'y', 'z'].map(function(p){ return '<i class="' + (z[p].ok ? 'on' : '') + '" title="' + p.toUpperCase() + '"></i>'; }).join('');
    return '<button type="button" class="rs-xyzitem' + (xyzKey(sel) === xyzKey(b) ? ' on' : '') + '" data-rs="xyz-pick" data-entry="' + esc(b.entryId) + '" data-idx="' + b.idx + '"><span class="rs-dots">' + dots + '</span><span>' + esc(b.text) + '</span></button>';
  }).join('');
  // A number the person never gave is left out of the pre-filled parts; only what they type goes back in.
  var base = sel.unverified.length ? E.stripClaims(sel.text, sel.unverified) : sel.text, baseOk = !sel.unverified.length || E.stripOk(sel.text, base);
  if(!baseOk) base = '';   // taking the figure out would leave a broken line ("Ranked # stores") - they write X themselves
  var z = E.xyzBreakdown(base), d = S.xyzDraft || { key: xyzKey(sel), src: sel.text, x: z.x.text || '', y: z.y.text, z: z.z.text };
  var suggestedX = base ? E.strengthenOpener(z.x.text || base) : '';
  var slot = function(p, label, desc, val, ph){ return '<label class="rs-slot ' + (z[p].ok ? 'ok' : 'miss') + '"><span class="rs-slot-tag">' + p.toUpperCase() + '</span><span class="rs-slot-body"><b>' + label + '</b><small>' + desc + '</small><input type="text" data-rs-xyz="' + p + '" value="' + esc(val || '') + '" placeholder="' + esc(ph) + '" maxlength="240"></span></label>'; };
  var detail = '<div class="rs-card"><span class="rs-label">' + where(sel) + '</span><div class="rs-quote">“' + esc(sel.text) + '”</div>'
    + (sel.unverified.length ? '<div class="rs-unvnote">&#9888; ' + esc(sel.unverified.join(', ')) + ' isn’t in anything you wrote for this role, so it’s left out below' + (baseOk ? '' : ' - and the line doesn’t stand without it, so write X in your own words') + '. If it’s accurate, type it into Y.</div>' : '')
    + (suggestedX && suggestedX !== E.cap(z.x.text || base) ? '<div class="rs-muted rs-note">Stronger, same meaning: <b>' + esc(suggestedX) + '</b></div>' : '')
    + slot('x', 'Accomplished', 'What you did - strong verb first', d.x || suggestedX, 'e.g. Reduced checkout time')
    + slot('y', 'As measured by', 'The number - only one you actually know', d.y, 'e.g. by 30%, or from 9 min to 4 min')
    + slot('z', 'By doing', 'How you did it', d.z, 'e.g. redesigning the queue')
    + '<div class="rs-row"><button type="button" class="rs-btn" data-rs="xyz-build" data-entry="' + esc(sel.entryId) + '" data-idx="' + sel.idx + '">Rebuild bullet</button></div>'
    + (d.candidate != null ? '<div class="rs-cand"><span class="rs-label">Rebuilt - edit freely</span><textarea data-rs-xyzcand="1" rows="2" maxlength="600">' + esc(d.candidate) + '</textarea><div class="rs-honslot">' + honestyBadge(E.honesty(E.bulletSource(sel), { x: d.x, y: d.y, z: d.z }, d.candidate)) + '</div>'
      + '<div class="rs-row"><button type="button" class="rs-btn" data-rs="xyz-apply" data-entry="' + esc(sel.entryId) + '" data-idx="' + sel.idx + '">Apply to resume</button></div></div>' : '')
    + '</div>';
  return head('XYZ Impact Coach', 'Google’s recruiters popularized one formula: <b>Accomplished [X] as measured by [Y], by doing [Z]</b>. Each bullet below shows which parts it has. Fill the gaps with what’s true and it rebuilds the line.')
    + '<div class="rs-grid2 rs-xyz"><div class="rs-card rs-xyzlist"><span class="rs-label">Your bullets &nbsp; <span class="rs-dots legend"><i class="on"></i>X <i class="on"></i>Y <i class="on"></i>Z</span></span>' + list + '</div><div>' + detail + '</div></div>';
}

/* ------------------------------------------------------- 8. CAREER SWITCH */
function renderSwitch(R){
  var auto = E.detectField(R.target), field = S.field || auto || '';
  var br = E.careerBridges(R, field || null);
  var opts = '<option value="">Pick a target field…</option>' + Object.keys(E.FIELDS).map(function(k){ return '<option value="' + k + '"' + (k === field ? ' selected' : '') + '>' + esc(E.FIELDS[k].label) + (k === auto ? ' (from your goal)' : '') + '</option>'; }).join('');
  var rows = br.rows.map(function(r){
    return '<div class="rs-bridge"><div class="rs-br-from"><span class="rs-label">You did</span><b>' + esc(r.source) + '</b><div class="rs-muted">' + r.evidence.map(function(e){ return e.idx === -1 ? esc(e.text.replace(/^Role title: /, 'As ')) : '“' + esc(e.text) + '”'; }).join('<br>') + '</div></div>'
      + '<div class="rs-br-arrow">&rarr;</div><div class="rs-br-to"><span class="rs-label">In ' + esc(br.fieldLabel || 'any field') + ' that’s</span><b>' + esc(r.term) + '</b><div class="rs-muted">' + esc(r.how) + '</div></div></div>';
  }).join('');
  var tr = S.translate && S.translate.field === field ? S.translate : null;
  var trHtml = '';
  if(tr && tr.rows){
    trHtml = '<div class="rs-card"><h4>Rewritten for ' + esc(br.fieldLabel) + '</h4>' + tr.rows.map(function(x, i){
      var badge = x.loc ? honestyBadge(x.honesty) : '<div class="rs-honest bad">&#9888; Couldn’t match this to a line on your resume, so it can’t be applied</div>';
      return '<div class="rs-tr"><div class="rs-muted">“' + esc(x.original) + '”</div><div class="rs-tr-new">' + esc(x.translated) + '</div>' + (x.terms.length ? '<div>' + x.terms.map(function(t){ return pill(t); }).join(' ') + '</div>' : '') + badge
        + (x.honesty.ok && x.loc && !x.applied ? '<button type="button" class="rs-btn sm" data-rs="tr-apply" data-i="' + i + '">Apply</button>' : (x.applied ? pill('Applied', 'ok') : '')) + '</div>';
    }).join('') + '</div>';
  } else if(tr && tr.error){ trHtml = '<div class="rs-card"><p class="rs-muted">' + esc(tr.error) + '</p></div>'; }
  return head('Career-Switch Translator', 'Switching fields? Your experience counts more than you think - it’s just written in the wrong language. This maps what you’ve actually done to the words your target field uses for the same thing. No experience is added; only the translation changes.')
    + '<div class="rs-card rs-row rs-between"><label class="rs-fieldpick"><span class="rs-label">Target field</span><select data-rs-field="1">' + opts + '</select></label>'
    + (br.roles.length ? '<div><span class="rs-label">Roles that value this mix</span><div>' + br.roles.map(function(r){ return pill(r, 'ok'); }).join(' ') + '</div></div>' : '') + '</div>'
    + (br.headline ? '<div class="rs-card"><span class="rs-label">Suggested headline</span><div class="rs-headline">' + esc(br.headline) + '</div><div class="rs-row"><button type="button" class="rs-btn sm" data-rs="use-headline" data-text="' + esc(br.headline) + '">Use as my summary line</button></div></div>' : '')
    + '<div class="rs-card"><h4>Your transferable experience</h4>' + (rows || '<p class="rs-muted">No transferable patterns detected yet - add more detail to your bullets.</p>') + '</div>'
    + (field ? (loggedUid() ? '<div class="rs-card rs-ai"><div class="rs-ai-top"><div><h4><span class="rs-spark">&#10022;</span> Rewrite my bullets for ' + esc(br.fieldLabel) + '</h4><p>Metis rewrites each bullet in ' + esc(br.fieldLabel.toLowerCase()) + '’s vocabulary. Every rewrite is checked against your actual line before you can apply it.</p></div><button type="button" class="rs-btn ai" data-rs="translate"' + (S.aiBusy.translate ? ' disabled' : '') + '>' + (S.aiBusy.translate ? 'Translating…' : 'Translate') + '</button></div></div>'
      : '<div class="rs-card"><p class="rs-muted">Sign in to have Metis rewrite every bullet in ' + esc(br.fieldLabel.toLowerCase()) + '’s language - the map above works without it.</p></div>') : '')
    + trHtml;
}
// Pair an AI row with the REAL line it came from: exact text, else same position and clearly the same line,
// else the clearly-closest unused line. Honesty is then judged against that real line, never the AI's copy of it.
function matchBullet(bl, original, i, used){
  var o = E.clean(original).toLowerCase().replace(/[.;\s]+$/, ''), k = function(b){ return b.entryId + ':' + b.idx; };
  var exact = bl.filter(function(b){ return !used[k(b)] && E.clean(b.text).toLowerCase().replace(/[.;\s]+$/, '') === o; })[0];
  if(exact) return exact;
  if(bl[i] && !used[k(bl[i])] && E.jaccard(bl[i].text, original) >= 0.6) return bl[i];
  var best = null, bs = 0;
  bl.forEach(function(b){ if(used[k(b)]) return; var s = E.jaccard(b.text, original); if(s > bs){ bs = s; best = b; } });
  return bs >= 0.75 ? best : null;
}

/* ------------------------------------------------------------- 9. VERSIONS */
function diffHtml(parts){ return parts.map(function(p){ return '<span class="rs-d-' + p.t + '">' + esc(p.s) + '</span>'; }).join(' '); }
function renderDiff(a, b){
  var d = E.diffVersions(a, b);
  var ents = d.entries.filter(function(e){ return e.status !== 'same'; }).map(function(e){
    var st = { added: ['Added', 'ok'], removed: ['Removed', 'bad'], changed: ['Changed', 'warn'] }[e.status];
    return '<div class="rs-dent"><div class="rs-row"><b>' + esc(e.title) + (e.org ? ' <span class="rs-muted">· ' + esc(e.org) + '</span>' : '') + '</b>' + pill(st[0], st[1]) + '</div>'
      + e.bullets.filter(function(x){ return x.status !== 'same'; }).map(function(x){ return '<div class="rs-dline">' + diffHtml(x.diff) + '</div>'; }).join('') + '</div>';
  }).join('');
  var sum = d.summary.some(function(p){ return p.t !== 'same'; }) ? '<div class="rs-dent"><b>Summary</b><div class="rs-dline">' + diffHtml(d.summary) + '</div></div>' : '';
  var sk = (d.skills.added.length || d.skills.removed.length) ? '<div class="rs-dent"><b>Skills</b><div class="rs-dline">' + d.skills.added.map(function(s){ return '<span class="rs-d-add">+ ' + esc(s) + '</span>'; }).join(' ') + ' ' + d.skills.removed.map(function(s){ return '<span class="rs-d-del">' + esc(s) + '</span>'; }).join(' ') + '</div></div>' : '';
  return '<div class="rs-diffstats">' + pill('+' + d.stats.wordsAdded + ' words', 'ok') + ' ' + pill('−' + d.stats.wordsRemoved + ' words', 'bad') + ' ' + pill(d.stats.changedEntries + ' section' + (d.stats.changedEntries === 1 ? '' : 's') + ' changed') + '</div>'
    + (sum + sk + ents || '<p class="rs-muted">These two are identical.</p>');
}
function fmtDate(iso){ try{ var d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }catch(e){ return ''; } }
function renderVersions(R){
  var vs = versions(), cur = E.makeVersion('Current resume', R, { id: '__current' });
  var all = [cur].concat(vs), find = function(id){ return all.filter(function(v){ return v.id === id; })[0]; };
  if(!S.cmpA || !find(S.cmpA)) S.cmpA = vs[0] ? vs[0].id : null;
  if(!find(S.cmpB)) S.cmpB = '__current';
  var srcPill = function(s){ return s === 'tailored' ? pill('Tailored', 'ok') : s === 'auto' ? pill('Auto-saved') : s === 'fit' ? pill('One-page fit', 'warn') : pill('Saved'); };
  var list = vs.map(function(v){
    var when = fmtDate(v.created_at);
    return '<div class="rs-ver"><div><b>' + esc(v.name) + '</b> ' + srcPill(v.source) + '<div class="rs-muted">' + (when ? when + ' · ' : '') + v.resume.entries.length + ' entries · sent to ' + v.sent_to.length + '</div>' + (v.note ? '<div class="rs-muted rs-note">' + esc(v.note) + '</div>' : '') + '</div>'
      + '<div class="rs-row"><button type="button" class="rs-btn ghost sm" data-rs="ver-compare" data-id="' + esc(v.id) + '">Compare</button><button type="button" class="rs-btn ghost sm" data-rs="ver-restore" data-id="' + esc(v.id) + '">Restore</button><button type="button" class="rs-btn ghost sm danger" data-rs="ver-del" data-id="' + esc(v.id) + '">Delete</button></div></div>';
  }).join('');
  var sel = function(name, val){ return '<select data-rs-cmp="' + name + '">' + all.map(function(v){ return '<option value="' + esc(v.id) + '"' + (v.id === val ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('') + '</select>'; };
  var cmp = (vs.length && S.cmpA) ? '<div class="rs-card"><div class="rs-row rs-between"><h4>Compare</h4><div class="rs-row rs-cmprow">' + sel('a', S.cmpA) + '<span class="rs-muted">&rarr;</span>' + sel('b', S.cmpB) + '</div></div>' + renderDiff(find(S.cmpA), find(S.cmpB)) + '</div>' : '';
  return head('Versions', 'Git for your resume. Save a version for each kind of role, compare any two word by word, restore any of them, and tag which one you sent where - so Callbacks can tell you which actually works.')
    + '<div class="rs-card rs-row"><input type="text" id="rsVerName" class="rs-input" placeholder="Name this version, e.g. Data analyst v1" maxlength="80"><button type="button" class="rs-btn" data-rs="ver-save">Save current resume as a version</button></div>'
    + (vs.length ? '<div class="rs-card">' + list + '</div>' : '<div class="rs-card"><p class="rs-muted">No versions yet. Save one now, then save another after you tailor - Tailor to a job can save straight into here.</p></div>') + cmp;
}

/* ------------------------------------------------------------ 10. CALLBACKS */
function renderCallbacks(R){
  var vs = versions(), apps = applications(), cb = E.callbackStats(vs, apps);
  var rkind = { winner: 'ok', leading: 'warn', only: 'warn', early: '', none: 'bad', empty: '' }[cb.recommendation.kind] || '';
  var rows = cb.rows.map(function(r, i){
    var rate = Math.round(r.rate * 100);
    return '<div class="rs-cbrow' + (i === 0 && r.enough && r.positive ? ' lead' : '') + '"><div class="rs-cbname"><b>' + esc(r.name) + '</b>' + (r.enough ? '' : ' ' + pill('needs ' + Math.max(0, 3 - r.sent) + ' more')) + '</div>'
      + '<div class="rs-cbnums"><span><b>' + r.sent + '</b> sent</span><span class="ok"><b>' + r.interviews + '</b> interview' + (r.interviews === 1 ? '' : 's') + '</span><span class="ok"><b>' + r.offers + '</b> offer' + (r.offers === 1 ? '' : 's') + '</span><span class="bad"><b>' + r.rejected + '</b> rejected</span><span><b>' + r.ghosted + '</b> ghosted</span><span><b>' + r.pending + '</b> waiting</span></div>'
      + '<div class="rs-cbrate"><div class="rs-bar"><i class="' + (rate >= 30 ? 'ok' : rate >= 10 ? 'mid' : 'low') + '" style="width:' + rate + '%"></i></div><span>' + rate + '% interview rate</span></div></div>';
  }).join('');
  // Every sent application, tagged or not - so a tag can always be changed or removed.
  var tagRow = function(a){
    var opts = '<option value="">Not tagged</option>' + vs.map(function(v){ return '<option value="' + esc(v.id) + '"' + (v.id === a.versionId ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('');
    return '<div class="rs-unl"><div><b>' + esc(a.title) + '</b>' + (a.org ? ' <span class="rs-muted">at ' + esc(a.org) + '</span>' : '') + (a.outcome ? ' ' + pill(a.outcome, /interview|offer/.test(a.outcome) ? 'ok' : /rejected/.test(a.outcome) ? 'bad' : '') : '') + '</div><label class="rs-row"><span class="rs-muted">Sent with</span><select data-rs-tag="' + esc(a.id) + '">' + opts + '</select></label></div>';
  };
  var untagged = cb.sent.filter(function(a){ return !a.versionId; }), tagged = cb.sent.filter(function(a){ return a.versionId; });
  var tagCard = vs.length && cb.sent.length ? '<div class="rs-card"><h4>Tag your sent applications' + (untagged.length ? ' (' + untagged.length + ' untagged)' : '') + '</h4>'
    + (untagged.length ? untagged.map(tagRow).join('') : '<p class="rs-muted">Every sent application is tagged. ✓</p>')
    + (tagged.length ? '<details class="rs-tagged"' + (untagged.length ? '' : ' open') + '><summary>Already tagged (' + tagged.length + ') - change or remove a tag</summary>' + tagged.map(tagRow).join('') + '</details>' : '') + '</div>' : '';
  return head('Callback Analytics', 'Which resume actually gets you interviews? Tag each application with the version you sent and this compares real outcomes - ranked with a statistical lower bound, so one lucky reply never beats a proven track record.')
    + '<div class="rs-card rs-reco ' + rkind + '">' + esc(cb.recommendation.text) + '</div>'
    + (rows ? '<div class="rs-card">' + rows + '</div>' : '') + tagCard
    + (vs.length && !cb.sent.length ? '<div class="rs-card"><p class="rs-muted">No sent applications yet - once you send some, tag each with the version you used.</p></div>' : '');
}

/* --------------------------------------------------------------- 11. DEFEND */
function renderDefend(R){
  var all = E.defendAll(R);
  if(!all.length) return head('Defend Every Line', 'Everything on your resume is fair game in an interview.') + '<div class="rs-card"><p class="rs-muted">No bullets to prepare yet - add what you did in <b>Build</b>.</p></div>';
  var list = S.defendRisky ? all.filter(function(d){ return d.risk !== 'low'; }) : all;
  var cnt = { high: 0, med: 0, low: 0 }; all.forEach(function(d){ cnt[d.risk]++; });
  var cards = list.map(function(d){
    var rk = { high: ['Prepare carefully', 'bad'], med: ['Have an example ready', 'warn'], low: ['Easy to defend', 'ok'] }[d.risk];
    return '<div class="rs-def"><div class="rs-row rs-between"><span class="rs-where">' + esc(d.where) + '</span>' + pill(rk[0], rk[1]) + '</div><div class="rs-quote">“' + esc(d.text) + '”</div>'
      + (d.risks.length ? '<div class="rs-defrisks">' + d.risks.map(function(r){ return '<div>&#9888; ' + esc(r) + '</div>'; }).join('') + '</div>' : '')
      + '<div class="rs-label">They’ll likely ask</div><ol class="rs-qlist">' + d.questions.map(function(q){ return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>'
      + '<details class="rs-star"><summary>STAR answer scaffold</summary><div><b>S</b> ' + esc(d.star.s) + '</div><div><b>T</b> ' + esc(d.star.t) + '</div><div><b>A</b> ' + esc(d.star.a) + '</div><div><b>R</b> ' + esc(d.star.r) + '</div></details>'
      + '<div class="rs-row"><button type="button" class="rs-btn ghost sm" data-rs="star" data-entry="' + esc(d.entryId) + '" data-idx="' + d.idx + '">Save as a STAR story draft</button></div></div>';
  }).join('');
  return head('Defend Every Line', 'Everything on your resume is fair game in an interview. For each bullet: the questions you’ll likely get, which claims will be probed hardest, and a STAR scaffold to prepare your answer.')
    + '<div class="rs-card rs-row rs-between"><div class="rs-row">' + pill(cnt.high + ' to prepare carefully', 'bad') + pill(cnt.med + ' need an example', 'warn') + pill(cnt.low + ' easy', 'ok') + '</div><label class="rs-row rs-toggle"><input type="checkbox" data-rs-risky="1"' + (S.defendRisky ? ' checked' : '') + '> Show only the risky ones</label></div>'
    + (cards || '<p class="rs-muted">Nothing risky - every line is easy to defend.</p>');
}

/* ------------------------------------------------------- 12. PREVIEW + PDF */
function previewHtml(R){ return E.renderResumeHTML(R, S.tpl).replace('</style>', '@media screen{html{background:#fff}body{padding:.55in}}</style>'); }
function estText(est){ return '~' + est.pages + ' page' + (est.pages === 1 ? '' : 's') + (est.calibrated ? '' : ' estimated'); }
function fitButton(est){ return est.pages > 1 ? '<button type="button" class="rs-btn sm" data-rs="fit">Fit to one page</button>' : ''; }
// After the preview calibrates, update the numbers IN PLACE - never re-render controls under a pointer mid-click.
function updatePageReadouts(R){
  var est = E.estimatePages(R, S.tpl, opt()), t = D.getElementById('rsEst'), slot = D.getElementById('rsFitSlot'), fill = D.getElementById('rsMeterFill');
  if(t) t.textContent = estText(est);
  if(fill){ fill.className = est.pages <= 1 ? 'ok' : 'warn'; fill.style.width = Math.min(100, est.pages / 2 * 100) + '%'; }
  if(slot && !!slot.querySelector('[data-rs="fit"]') !== (est.pages > 1)) slot.innerHTML = fitButton(est);
  var chip = D.querySelector('#resumeStudio .rs-chip[data-rs-tab="preview"]');
  if(chip){ var v = E.estimatePages(R, 'classic', opt()); chip.textContent = '~' + v.pages + ' page' + (v.pages === 1 ? '' : 's'); chip.className = 'rs-chip ' + (v.pages <= 1 ? 'ok' : 'warn'); }
}
function previewBar(R){
  var est = E.estimatePages(R, S.tpl, opt());
  var tpls = Object.keys(E.TEMPLATES).map(function(k){ return '<button type="button" class="rs-btn ' + (k === S.tpl ? '' : 'ghost') + ' sm" data-rs="tpl" data-tpl="' + k + '">' + esc(E.TEMPLATES[k].label) + '</button>'; }).join('');
  var meterPct = Math.min(100, est.pages / 2 * 100);
  return '<div class="rs-row"><span class="rs-label">Template</span>' + tpls + '</div>'
    + '<div class="rs-meter"><div class="rs-meterbar"><i id="rsMeterFill" class="' + (est.pages <= 1 ? 'ok' : 'warn') + '" style="width:' + meterPct + '%"></i><span class="rs-onepage" title="One page"></span></div><span><span id="rsEst">' + estText(est) + '</span> · <b id="rsMeasured">measuring…</b></span></div>'
    + '<div class="rs-row"><span id="rsFitSlot">' + fitButton(est) + '</span><button type="button" class="rs-btn ghost sm" data-rs="print">Print / Save as PDF</button></div>';
}
function renderPreview(R){
  var plan = S.fitPlan && S.fitPlan.tpl === S.tpl ? S.fitPlan : null, stale = '';
  if(plan && plan.sig !== sigOf(R)){ S.fitPlan = plan = null; stale = '<div class="rs-card"><p class="rs-muted">Your resume changed since the one-page plan was made, so that plan was cleared - run Fit to one page again for a fresh one.</p></div>'; }
  var SHOW = 40;
  var planHtml = plan ? '<div class="rs-card"><h4>One-page plan: ' + plan.before + ' &rarr; ' + plan.after + ' pages' + (plan.fits ? '' : ' (still over - try the Compact template, or remove older roles in Build)') + '</h4>'
    + (plan.cuts.length ? '<p class="rs-muted">Cutting the ' + plan.cuts.length + ' lowest-value bullet' + (plan.cuts.length === 1 ? '' : 's') + ' - older roles first, weakest lines first, never a role’s last bullet. Your current resume is saved as a version before anything changes.</p>'
      + plan.cuts.slice(0, SHOW).map(function(c){ return '<div class="rs-cut"><span class="rs-d-del">' + esc(c.text) + '</span><div class="rs-muted">' + esc(c.entryTitle) + ' · ' + esc(c.reason) + '</div></div>'; }).join('')
      + (plan.cuts.length > SHOW ? '<p class="rs-muted">…and ' + (plan.cuts.length - SHOW) + ' more.</p>' : '')
      + '<div class="rs-row"><button type="button" class="rs-btn" data-rs="fit-apply">Apply the plan</button><button type="button" class="rs-btn ghost" data-rs="fit-cancel">Cancel</button></div>' : '<p class="rs-muted">Already fits - nothing to cut.</p>') + '</div>' : '';
  return head('Preview & PDF', 'Your resume, typeset in clean, ATS-safe templates - single column, real text, standard headings. See the true page length, let the studio find the weakest lines to cut, then save it as a PDF.')
    + '<div class="rs-card rs-row rs-between rs-wrap" id="rsPrevBar">' + previewBar(R) + '</div>'
    + stale + planHtml
    + '<div class="rs-paperwrap" id="rsPaperWrap"><div class="rs-paperscale" id="rsPaperScale"><iframe id="rsPaper" title="Resume preview" tabindex="-1"></iframe></div></div>';
}
function mountPreviewFrame(R){
  var f = D.getElementById('rsPaper'), wrap = D.getElementById('rsPaperWrap'), scale = D.getElementById('rsPaperScale');
  if(!f || !wrap || !scale) return;
  var tpl = S.tpl;
  f.onload = function(){
    try{
      var body = f.contentDocument.body, docH = Math.ceil(body.getBoundingClientRect().height), pages = Math.round(docH / E.PAGE_H * 100) / 100;
      f.style.height = Math.max(E.PAGE_H, Math.ceil(docH / E.PAGE_H) * E.PAGE_H) + 'px';
      var ww = wrap.clientWidth || 816, k = Math.min(1, ww / 816);
      scale.style.transform = 'scale(' + k + ')'; scale.style.left = Math.max(0, Math.round((ww - 816 * k) / 2)) + 'px';
      wrap.style.height = (parseFloat(f.style.height) * k) + 'px';
      var lines = ''; for(var p = 1; p < Math.ceil(docH / E.PAGE_H); p++) lines += '<div class="rs-pagebreak" style="top:' + (p * E.PAGE_H) + 'px"><span>Page ' + (p + 1) + '</span></div>';
      var old = scale.querySelectorAll('.rs-pagebreak'); for(var i = 0; i < old.length; i++) old[i].remove();
      scale.insertAdjacentHTML('beforeend', lines);
      // Calibrate to the fonts on THIS device: measure the real average character advance of this resume's own
      // text, so every page estimate (header chip, Scorecard, one-page plan) matches what actually prints here.
      var cdoc = f.contentDocument, host = cdoc.querySelector('li') || cdoc.querySelector('.sum') || body;
      var sample = E.allBullets(R).map(function(b){ return b.text; }).join(' ').slice(0, 4000);
      if(host && sample.length >= 200){
        var span = cdoc.createElement('span'); span.style.whiteSpace = 'nowrap'; span.style.position = 'absolute'; span.style.visibility = 'hidden';
        span.textContent = sample; host.appendChild(span);
        var cw = span.getBoundingClientRect().width / sample.length; span.remove();
        var c = calib(), prev = c[tpl] && c[tpl].cw;
        if(isFinite(cw) && cw > 2 && cw < 14 && (!prev || Math.abs(prev - cw) / prev > 0.015)){
          c[tpl] = { cw: Math.round(cw * 1000) / 1000, via: 'preview' }; lsSet(CALIB_KEY, c);
          if(S.tab === 'preview' && tpl === S.tpl) updatePageReadouts(R);
        }
      }
      var m = D.getElementById('rsMeasured'); if(m) m.textContent = 'measured ' + pages + ' page' + (pages === 1 ? '' : 's');
    }catch(e){}
  };
  f.srcdoc = previewHtml(R);
}

/* ------------------------------------------------------------- dispatch */
function renderTool(R){
  if(S.tab === 'build') return '';
  if(!R.entries.length) return emptyState();
  try{
    switch(S.tab){
      case 'score': return renderScore(R); case 'scan': return renderScan(R); case 'ats': return renderAts(R);
      case 'flags': return renderFlags(R); case 'evidence': return renderEvidence(R); case 'miner': return renderMiner(R);
      case 'xyz': return renderXyz(R); case 'switch': return renderSwitch(R); case 'versions': return renderVersions(R);
      case 'callbacks': return renderCallbacks(R); case 'defend': return renderDefend(R); case 'preview': return renderPreview(R);
    }
  }catch(e){
    try{ root.console && root.console.error && root.console.error('[Resume Studio]', e); }catch(_){}
    return '<div class="rs-card"><h4>This tool tripped over something in your saved data</h4><p class="rs-muted">Every other tab still works, and nothing was changed. Re-saving the affected entry in Build usually clears it.</p></div>';
  }
  return '';
}
function refresh(){
  var root2 = D.getElementById('resumeStudio'); if(!root2) return;
  var R = current();
  try{ root2.innerHTML = renderHead(R); }
  catch(e){ root2.innerHTML = '<div class="rs-head"><div class="rs-title"><span class="rs-eyebrow">Resume Studio</span></div></div>'; try{ root.console.error('[Resume Studio]', e); }catch(_){} }
  var build = D.getElementById('rsBuildPanel'), tool = D.getElementById('rsToolPanel');
  if(build) build.classList.toggle('hidden', S.tab !== 'build');
  if(tool){
    tool.classList.toggle('hidden', S.tab === 'build');
    tool.innerHTML = S.tab === 'build' ? '' : '<div class="rs-panel" data-panel="' + S.tab + '">' + renderTool(R) + '</div>';
    fillAiOutputs();
    if(S.tab === 'preview' && R.entries.length) mountPreviewFrame(R);
  }
}
function setTab(t, keepScroll){
  if(!TABS.some(function(x){ return x.id === t; })) return;
  S.tab = t; refresh();
  if(!keepScroll){ var r = D.getElementById('resumeStudio'); if(r && r.scrollIntoView) try{ r.scrollIntoView({ block: 'start', behavior: 'smooth' }); }catch(e){} }
}
function scrollToMiner(k){
  var cards = D.querySelectorAll('[data-rs-minekey]');
  for(var i = 0; i < cards.length; i++) if(cards[i].getAttribute('data-rs-minekey') === k){ if(cards[i].scrollIntoView) try{ cards[i].scrollIntoView({ block: 'center' }); }catch(e){} return; }
}

/* ---------------------------------------------------------------- actions */
function answersText(t, a){
  var labels = {}; (t.questions || []).forEach(function(q){ labels[q.id] = /^fig/.test(q.id) ? 'real figure (instead of “' + q.figure + '”)' : q.id; });
  return Object.keys(a || {}).filter(function(k){ return E.clean(a[k]); }).map(function(k){ return (labels[k] || k) + ': ' + a[k]; }).join('\n');
}
function cleanAi(t){ return E.clean(String(t || '').replace(/^["“‘'`]+|["”’'`]+$/g, '').replace(/^[-•*]\s*/, '')); }

function onClick(ev){
  var t = ev.target.closest && ev.target.closest('[data-rs-tab],[data-rs]');
  var sec = D.getElementById('resumeSection');
  if(!t || !sec || !sec.contains(t)) return;
  if(t.hasAttribute('data-rs-tab')){ ev.preventDefault(); setTab(t.getAttribute('data-rs-tab')); return; }
  var a = t.getAttribute('data-rs'), R = current(), k, d;
  switch(a){
    case 'undo': undo(); break;
    case 'fix': {
      var en = t.getAttribute('data-entry'), ix = +t.getAttribute('data-idx');
      if(t.getAttribute('data-tool') === 'metrics'){ S.minerFocus = en + ':' + ix; setTab('miner'); scrollToMiner(S.minerFocus); }
      else { var ln = findLine(R, en, ix); S.xyzSel = { entryId: en, idx: ix, src: ln ? ln.text : null }; S.xyzDraft = null; setTab('xyz'); }
      break; }
    case 'scan-dim': S.scanDim = !S.scanDim; refresh(); break;
    case 'qf': applyBullet(t.getAttribute('data-entry'), +t.getAttribute('data-idx'), t.getAttribute('data-text'), 'Quick fix', { expect: t.getAttribute('data-expect'), recordGrammar: true }); break;
    case 'unv-strip': applyBullet(t.getAttribute('data-entry'), +t.getAttribute('data-idx'), t.getAttribute('data-text'), 'Removed a number you never gave', { expect: t.getAttribute('data-expect'), msg: 'Removed - that line now says only what you can stand behind' }); break;
    case 'unv-summary': {
      if(R.summary !== t.getAttribute('data-expect')){ toast('Your summary changed since this was suggested - nothing was applied.'); refresh(); break; }
      var R0 = E.cloneResume(R); R0.summary = t.getAttribute('data-text');
      var rep0 = applyResume({ entries: [], summary: R0.summary }, 'summary number'); if(rep0) toast('Removed it from your summary', rep0.undo); break; }
    case 'skill-add': { var sa = t.getAttribute('data-skill'), r1 = setSkills(R.skills.concat([sa]), 'add skill'); if(r1) toast('Added ' + sa + ' to your skills', r1.undo); break; }
    case 'skill-remove': { var sk = t.getAttribute('data-skill'), r2 = setSkills(R.skills.filter(function(x){ return x !== sk; }), 'remove skill'); if(r2) toast('Removed ' + sk + ' from your skills', r2.undo); break; }
    case 'contact-save': {
      var vals = {}, bad = '';
      var ins = D.querySelectorAll('#rsToolPanel [data-rs-contact]');
      for(var ci = 0; ci < ins.length; ci++) vals[ins[ci].getAttribute('data-rs-contact')] = E.clean(ins[ci].value);
      if(vals.email && !EMAIL_RE.test(vals.email)) bad = 'That email doesn’t look right - check it and save again.';
      else if(vals.phone && vals.phone.replace(/\D/g, '').length < 7) bad = 'That phone number looks too short.';
      if(bad){ toast(bad); break; }
      if(!Object.keys(vals).some(function(x){ return vals[x]; })){ toast('Fill in at least one field first'); break; }
      setContact(vals); break; }
    case 'miner-all': S.minerAll = !S.minerAll; refresh(); break;
    case 'mine-build': {
      k = t.getAttribute('data-key'); var tt = targetFor(R, k); if(!tt) break;
      d = S.minerDrafts[k] || (S.minerDrafts[k] = { answers: {}, src: tt.text, entryId: tt.entryId });
      if(d.src !== tt.text){ d = S.minerDrafts[k] = { answers: {}, src: tt.text, entryId: tt.entryId }; }
      var anyAns = Object.keys(d.answers).some(function(q){ return E.clean(d.answers[q]); });
      if(!anyAns && !tt.unverified.length){ toast('Answer at least one question first - only your answers go in'); break; }
      var dropped = tt.unverified.filter(function(n, i){ return !E.clean(d.answers['fig' + i]) && !/^(doubl|tripl|quadrupl|halv)/i.test(E.clean(n)); });
      if(dropped.length && !E.stripOk(tt.text, E.stripClaims(tt.text, dropped))){ toast('Taking ' + dropped.join(', ') + ' out would leave a broken line - give the real figure, or rewrite it in XYZ Coach'); break; }
      d.candidate = E.composeQuantified(tt.text, d.answers, { pastRole: E.isPastRole(tt.entry || entryById(R, tt.entryId), S.today || undefined), unverified: tt.unverified }); d.note = ''; S.minerFocus = k; refresh(); break; }
    case 'mine-apply': {
      k = t.getAttribute('data-key'); d = S.minerDrafts[k]; var t2 = targetFor(R, k);
      if(!d || d.candidate == null) break;
      if(!t2 || t2.text !== d.src){ delete S.minerDrafts[k]; toast('That line changed since you drafted this - nothing was applied.'); refresh(); break; }
      var h = minerHonesty(t2, d);
      if(!h.ok){ toast('Can’t apply: ' + h.flagged.join(', ') + ' isn’t in anything you told us'); break; }
      if(applyBullet(t2.entryId, t2.idx, d.candidate, 'Metric Miner', { expect: d.src, recordFacts: true, source: t2.source, answers: minerAnswers(t2, d), msg: 'Quantified bullet applied - your answers were saved to that entry too' })){ delete S.minerDrafts[k]; S.minerFocus = null; refresh(); }
      break; }
    case 'mine-ai': {
      k = t.getAttribute('data-key'); d = S.minerDrafts[k]; var t3 = targetFor(R, k), u = loggedUid();
      if(!d || !t3 || t3.text !== d.src || !u || typeof root.apiAiAssist !== 'function') break;
      d.busy = true; refresh();
      var src3 = d.src;
      quiet(Promise.resolve(root.apiAiAssist(u, 'metric_bullet', { bullet: d.candidate || t3.base, answers: answersText(t3, d.answers) })).then(function(text){
        d.busy = false;
        var out = cleanAi(text), tNow = targetFor(current(), k);
        if(!tNow || tNow.text !== src3){ refresh(); return; }
        if(!out){ d.note = 'Metis couldn’t be reached - your version is still here.'; }
        else { var hh = E.honesty(tNow.source, minerAnswers(tNow, d), out); if(hh.ok){ d.candidate = out; d.note = 'Polished by Metis - checked against your answers.'; } else { d.note = 'Metis added ' + hh.flagged.join(', ') + ', which you never gave - kept your version instead.'; } }
        refresh();
      }, function(){ d.busy = false; d.note = 'Metis couldn’t be reached - your version is still here.'; refresh(); }));
      break; }
    case 'xyz-pick': { var lp = findLine(R, t.getAttribute('data-entry'), +t.getAttribute('data-idx')); S.xyzSel = { entryId: t.getAttribute('data-entry'), idx: +t.getAttribute('data-idx'), src: lp ? lp.text : null }; S.xyzDraft = null; refresh(); break; }
    case 'xyz-build': {
      var t4 = findLine(R, t.getAttribute('data-entry'), +t.getAttribute('data-idx')); if(!t4) break;
      var panel = D.getElementById('rsToolPanel'), val = function(p){ var i = panel.querySelector('[data-rs-xyz="' + p + '"]'); return i ? i.value : ''; };
      var x = val('x'), y = val('y'), z = val('z'), base4 = t4.unverified.length ? E.stripClaims(t4.text, t4.unverified) : t4.text;
      if(t4.unverified.length && !E.stripOk(t4.text, base4)) base4 = '';
      if(!E.clean(x) && !base4){ toast('Write X first - what you did, in your own words.'); break; }
      S.xyzDraft = { key: t4.entryId + ':' + t4.idx, src: t4.text, x: x, y: y, z: z, candidate: E.xyzRebuild(base4, { x: x, y: y, z: z }, { pastRole: E.isPastRole(t4.entry, S.today || undefined) }) };
      refresh(); break; }
    case 'xyz-apply': {
      var t5 = findLine(R, t.getAttribute('data-entry'), +t.getAttribute('data-idx')), dr = S.xyzDraft; if(!t5 || !dr) break;
      if(dr.src !== t5.text){ S.xyzDraft = null; toast('That line changed since you drafted this - nothing was applied.'); refresh(); break; }
      var ans5 = { x: dr.x, y: dr.y, z: dr.z }, h5 = E.honesty(E.bulletSource(t5), ans5, dr.candidate);
      if(!h5.ok){ toast('Can’t apply: ' + h5.flagged.join(', ') + ' isn’t in anything you told us'); break; }
      if(applyBullet(t5.entryId, t5.idx, dr.candidate, 'XYZ Coach', { expect: dr.src, recordFacts: true, source: E.bulletSource(t5), answers: ans5 })){ S.xyzDraft = null; S.xyzSel = { entryId: t5.entryId, idx: t5.idx, src: E.clean(dr.candidate) }; refresh(); }
      break; }
    case 'use-headline': {
      var hd = t.getAttribute('data-text'), rep = applyResume({ entries: [], summary: hd }, 'summary line'); if(rep) toast('Set as your summary line', rep.undo); break; }
    case 'translate': {
      var u2 = loggedUid(), f2 = S.field || E.detectField(R.target); if(!u2 || !f2 || typeof root.apiAiAssist !== 'function') break;
      var bl = E.allBullets(R).slice(0, 18);
      S.aiBusy.translate = true; refresh();
      quiet(Promise.resolve(root.apiAiAssist(u2, 'career_translate', { target: E.FIELDS[f2].label, bullets: bl.map(function(b){ return b.text; }).join('\n') })).then(function(text){
        S.aiBusy.translate = false;
        var rows = E.parseTranslateJSON(text);
        if(!rows || !rows.length){ S.translate = { field: f2, error: 'Metis couldn’t translate just now - the map above still works.' }; refresh(); return; }
        var used = {};
        S.translate = { field: f2, rows: rows.map(function(x, i){
          var real = matchBullet(bl, x.original, i, used);
          if(real) used[real.entryId + ':' + real.idx] = 1;
          // judged against the person's REAL line (and only its verified part) - never the AI's copy of it
          return { original: real ? real.text : x.original, translated: x.translated, terms: x.terms, honesty: real ? E.honesty(E.bulletSource(real), {}, x.translated) : { ok: false, flagged: [] },
            loc: real ? { entryId: real.entryId, idx: real.idx, src: real.text } : null };
        }) };
        refresh();
      }, function(){ S.aiBusy.translate = false; S.translate = { field: f2, error: 'Metis couldn’t be reached.' }; refresh(); }));
      break; }
    case 'tr-apply': {
      var row = S.translate && S.translate.rows && S.translate.rows[+t.getAttribute('data-i')];
      if(row && row.loc && row.honesty.ok && !row.applied && applyBullet(row.loc.entryId, row.loc.idx, row.translated, 'Career translation', { expect: row.loc.src })){ row.applied = true; refresh(); }
      break; }
    case 'ai': {
      var kind = t.getAttribute('data-kind'), u3 = loggedUid();
      if(!u3 || typeof root.apiAiAssist !== 'function'){ S.ai[kind] = 'Sign in to get Metis’s read - everything else on this page works without it.'; refresh(); break; }
      S.aiBusy[kind] = true; refresh();
      quiet(Promise.resolve(root.apiAiAssist(u3, 'resume_review', { resume: E.atsXray(R, opt()).plainText, target: R.target || '' })).then(function(text){
        S.aiBusy[kind] = false; S.ai[kind] = text ? String(text) : 'Metis couldn’t be reached just now - try again in a moment.'; refresh();
      }, function(){ S.aiBusy[kind] = false; S.ai[kind] = 'Metis couldn’t be reached just now.'; refresh(); }));
      break; }
    case 'ver-save': {
      var inp = D.getElementById('rsVerName'), typed = E.clean(inp && inp.value), nm = typed || ('Version ' + (versions().length + 1)), sig = sigOf(R);
      if(S.lastSave && S.lastSave.sig === sig && Date.now() - S.lastSave.at < 2500 && (!typed || typed === S.lastSave.name)) break;   // a double (or triple) click saves once
      var v = saveVersion(nm, R, { source: 'manual' });
      if(!v){ toast(STORAGE_FULL); break; }
      S.lastSave = { sig: sig, at: Date.now(), name: typed }; S.cmpA = v.id; if(inp) inp.value = '';
      toast('Saved “' + v.name + '”'); refresh(); break; }
    case 'ver-compare': S.cmpA = t.getAttribute('data-id'); S.cmpB = '__current'; refresh(); break;
    case 'ver-restore': {
      var vr = versions().filter(function(x){ return x.id === t.getAttribute('data-id'); })[0]; if(!vr) break;
      if(!saveVersion('Before restoring “' + vr.name + '”', R, { source: 'auto' })){ toast(BACKUP_FAILED + 'restored.'); break; }
      var rr = applyResume(vr.resume, 'restore ' + vr.name, { skills: true });
      if(rr) toast('Restored “' + vr.name + '”' + (rr.missing ? ' - ' + rr.missing + ' role' + (rr.missing === 1 ? '' : 's') + ' in it no longer exist' + (rr.missing === 1 ? 's' : '') + ' in Build and stayed out' : '') + (rr.skillsSkipped ? ' (skills need a profile)' : '') + '. Your previous resume was auto-saved.', rr.undo);
      break; }
    case 'ver-del': { var vd = t.getAttribute('data-id'); if(!deleteVersion(vd)){ toast(STORAGE_FULL); break; } if(S.cmpA === vd) S.cmpA = null; toast('Version deleted'); refresh(); break; }
    case 'star': {
      var t6 = findLine(R, t.getAttribute('data-entry'), +t.getAttribute('data-idx')); if(!t6) break;
      var dd = E.defendLine(t6.text, t6.entry, t6.unverified), item = { id: 'star_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: E.words(t6.text).slice(0, 8).join(' '), s: '', t: '', a: t6.text, r: /^Land the result: /.test(dd.star.r) ? dd.star.r.replace(/^Land the result: /, '') : '', created_at: new Date().toISOString() };
      var arr = lsGet('kaidostar_star_stories', []); if(!Array.isArray(arr)) arr = []; arr.unshift(item);
      if(!lsSet('kaidostar_star_stories', arr)){ toast(STORAGE_FULL); break; }
      var u4 = loggedUid(); if(u4 && typeof root.apiCreateWorkshopItem === 'function') quiet(root.apiCreateWorkshopItem(u4, 'star_story', item.id, item));
      var cnt = D.getElementById('railStarCount'); if(cnt) cnt.textContent = arr.length;
      try{ if(typeof root.renderStar === 'function') root.renderStar(); }catch(e){}
      toast('Saved to your STAR story bank - fill in the Situation and Task there'); break; }
    case 'tpl': S.tpl = E.TEMPLATES[t.getAttribute('data-tpl')] ? t.getAttribute('data-tpl') : 'classic'; S.fitPlan = null; refresh(); break;
    case 'fit': { var plan = E.fitToOnePage(R, S.tpl, opt()); plan.tpl = S.tpl; plan.sig = sigOf(R); S.fitPlan = plan; refresh(); break; }
    case 'fit-cancel': S.fitPlan = null; refresh(); break;
    case 'fit-apply': {
      var fp = S.fitPlan; if(!fp || !fp.cuts.length) break;
      // Re-plan against the resume as it is NOW; apply only if that's exactly the plan on screen.
      var now = E.fitToOnePage(R, S.tpl, opt()); now.tpl = S.tpl; now.sig = sigOf(R);
      if(fp.sig !== now.sig || JSON.stringify(fp.cuts) !== JSON.stringify(now.cuts)){ S.fitPlan = now; refresh(); toast('Your resume changed since this plan was made - here’s the updated plan to review'); break; }
      if(!saveVersion('Before one-page fit', R, { source: 'auto' })){ toast(BACKUP_FAILED + 'cut.'); break; }
      var fr = applyResume(now.resume, 'one-page fit');
      if(!fr) break;
      var fitV = saveVersion('One page (' + E.TEMPLATES[S.tpl].label + ')', now.resume, { source: 'fit', note: now.cuts.length + ' lines cut' });
      S.fitPlan = null; refresh(); toast('Fitted to one page - the full version was saved first' + (fitV ? '' : ' (the one-page copy couldn’t be saved as a version: storage is full)'), fr.undo); break; }
    case 'print': {
      var frm = D.getElementById('rsPaper');
      try{ if(frm && frm.contentWindow){ frm.contentWindow.focus(); frm.contentWindow.print(); } }catch(e){ toast('Couldn’t open the print dialog'); }
      break; }
  }
}
function onInput(ev){
  var t = ev.target; if(!t || !t.getAttribute) return;
  var k = t.getAttribute('data-rs-ans');
  if(k){
    var card = t.closest && t.closest('[data-rs-minekey]');
    var d = S.minerDrafts[k];
    if(!d){ d = S.minerDrafts[k] = { answers: {}, src: card ? card.getAttribute('data-src') : null, entryId: card ? card.getAttribute('data-entry') : parseKey(k).entryId }; }
    d.answers[t.getAttribute('data-q')] = t.value;
    if(d.candidate != null && card){   // keep the badge honest as answers change
      var slot = card.querySelector('.rs-honslot'), tt = targetFor(current(), k);
      if(slot && tt && tt.text === d.src) slot.innerHTML = honestyBadge(minerHonesty(tt, d));
    }
    return;
  }
  k = t.getAttribute('data-rs-cand');
  if(k){
    var d2 = S.minerDrafts[k]; if(!d2) return; d2.candidate = t.value;
    var card2 = t.closest && t.closest('[data-rs-minekey]'), slot2 = card2 && card2.querySelector('.rs-honslot'), t2 = targetFor(current(), k);
    if(slot2 && t2 && t2.text === d2.src) slot2.innerHTML = honestyBadge(minerHonesty(t2, d2));
    return;
  }
  if(t.getAttribute('data-rs-xyzcand') && S.xyzDraft){
    S.xyzDraft.candidate = t.value;
    var p = parseKey(S.xyzDraft.key), t3 = findLine(current(), p.entryId, p.idx), box = t.closest && t.closest('.rs-cand'), s3 = box && box.querySelector('.rs-honslot');
    if(t3 && s3 && t3.text === S.xyzDraft.src) s3.innerHTML = honestyBadge(E.honesty(E.bulletSource(t3), { x: S.xyzDraft.x, y: S.xyzDraft.y, z: S.xyzDraft.z }, S.xyzDraft.candidate));
  }
}
function onChange(ev){
  var t = ev.target; if(!t || !t.getAttribute) return;
  if(t.getAttribute('data-rs-field')){ S.field = t.value || null; S.translate = null; refresh(); return; }
  var c = t.getAttribute('data-rs-cmp'); if(c){ if(c === 'a') S.cmpA = t.value; else S.cmpB = t.value; refresh(); return; }
  if(t.getAttribute('data-rs-risky')){ S.defendRisky = t.checked; refresh(); return; }
  var app = t.getAttribute('data-rs-tag');
  if(app != null){
    var vid = t.value, list = versions(), changed = [];
    list.forEach(function(v){
      var had = v.sent_to.indexOf(app) >= 0;
      v.sent_to = v.sent_to.filter(function(x){ return x !== app; });
      if(v.id === vid) v.sent_to.push(app);
      if(had !== (v.id === vid)){ v.updated_at = new Date().toISOString(); changed.push(v); }
    });
    if(!setVersions(list)){ toast(STORAGE_FULL); refresh(); return; }
    changed.forEach(syncVersion);
    toast(vid ? 'Tagged - Callbacks updated' : 'Untagged'); refresh();
  }
}

/* ----------------------------------------------- tailored -> version bridge */
function saveTailoredVersion(result, jd){
  var R = current(), R2 = E.cloneResume(R), byId = {};
  (result && Array.isArray(result.entries) ? result.entries : []).forEach(function(e){ if(e && e.id != null) byId[String(e.id)] = e; });
  if(result && typeof result.summary === 'string' && E.clean(result.summary)) R2.summary = E.clean(result.summary);
  R2.entries.forEach(function(e){ var x = byId[e.id] || (e.rawId != null && byId[String(e.rawId)]); if(x && Array.isArray(x.bullets) && x.bullets.length) e.bullets = x.bullets.filter(function(b){ return typeof b === 'string'; }).map(E.clean).filter(Boolean); });
  var m = String(jd || '').match(/\b(?:hiring|seeking|looking for)\s+(?:an?\s+)?([A-Za-z][A-Za-z /&-]{2,40}?)(?:[.,;:]|\s+(?:to|who|with|at|for|in)\b)/i);
  var v = saveVersion('Tailored: ' + (m ? E.cap(E.clean(m[1])) : 'job ' + (versions().length + 1)), R2, { source: 'tailored', note: E.clean(jd).slice(0, 200) });
  if(D.getElementById('resumeStudio')) refresh();
  return v;
}

/* -------------------------------------------------------------- styles */
var CSS = [
'.rs-head{background:linear-gradient(180deg,var(--panel),var(--panel-2));border:1px solid var(--line);border-radius:var(--radius);padding:22px 22px 14px;margin-bottom:18px}',
'.rs-eyebrow{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}',
'.rs-title h2{font-family:"Space Grotesk",sans-serif;font-size:20px;line-height:1.3;margin:6px 0 16px;color:var(--text);max-width:640px}',
'.rs-vitals{display:flex;gap:18px;align-items:center;padding:14px;border:1px solid var(--line-soft);border-radius:14px;background:var(--void);margin-bottom:14px}',
'.rs-vitals-empty p{margin:0;color:var(--text-dim);font-family:Manrope,sans-serif;font-size:13px}',
'.rs-ringbtn{position:relative;background:none;border:0;padding:0;cursor:pointer;flex:0 0 auto;width:68px;height:68px}',
'.rs-ringnum{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Space Grotesk",sans-serif;color:var(--text);line-height:1}',
'.rs-ringnum b{font-size:19px}.rs-ringnum em{font-style:normal;font-size:10px;color:var(--text-faint);margin-top:2px;font-family:"JetBrains Mono",monospace}',
'.rs-ringnum.big b{font-size:34px}.rs-ringnum.big em{font-size:11px}',
'.rs-vbody{flex:1;min-width:0}',
'.rs-takeaway{display:block;width:100%;text-align:left;background:none;border:0;padding:0;cursor:pointer;color:var(--text)}',
'.rs-takeaway small{display:block;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint);margin-bottom:3px}',
'.rs-takeaway span{font-family:Manrope,sans-serif;font-size:14px;font-style:italic;line-height:1.45}',
'.rs-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}',
'.rs-chip{font-family:"JetBrains Mono",monospace;font-size:11px;padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--text-dim);cursor:pointer}',
'.rs-chip.ok{color:var(--aurora);border-color:rgba(127,167,155,.45)}.rs-chip.warn{color:var(--gold);border-color:rgba(174,154,114,.5)}.rs-chip.bad{color:var(--danger);border-color:rgba(242,122,107,.5)}',
'.rs-tabs{display:flex;flex-wrap:wrap;gap:10px 14px;padding-bottom:2px}',
'.rs-tabgroup{flex:0 0 auto}.rs-tg-label{display:block;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-faint);margin:0 0 5px 2px}',
'.rs-tg-row{display:flex;gap:4px}',
'.rs-tab{position:relative;font-family:Manrope,sans-serif;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:9px;border:1px solid transparent;background:transparent;color:var(--text-dim);cursor:pointer;white-space:nowrap}',
'.rs-tab:hover{background:var(--void);color:var(--text)}.rs-tab.on{background:var(--gold-dim);border-color:var(--gold);color:var(--text)}',
'.rs-tab i{font-style:normal;font-family:"JetBrains Mono",monospace;font-size:9.5px;margin-left:6px;padding:1px 6px;border-radius:999px;background:rgba(174,154,114,.18);color:var(--gold)}.rs-tab i.bad{background:rgba(242,122,107,.16);color:var(--danger)}.rs-tab i.n{background:var(--line-soft);color:var(--text-dim)}',
'.rs-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;z-index:60;background:var(--panel-2);border:1px solid var(--gold);border-radius:12px;padding:10px 14px;display:flex;gap:12px;align-items:center;font-family:Manrope,sans-serif;font-size:13px;color:var(--text);box-shadow:0 18px 40px -18px rgba(0,0,0,.7);transition:all .2s;max-width:calc(100vw - 32px)}',
'.rs-toast.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}.rs-toast button{background:none;border:0;color:var(--gold);font-weight:700;cursor:pointer;font-family:Manrope,sans-serif}',
'.rs-toolhead{margin:4px 0 16px}.rs-toolhead h3{font-family:"Space Grotesk",sans-serif;font-size:19px;margin:0 0 6px;color:var(--text)}.rs-toolhead p{margin:0;font-family:Manrope,sans-serif;font-size:13px;line-height:1.55;color:var(--text-dim);max-width:760px}',
'.rs-card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:14px}',
'.rs-card h4{font-family:"Space Grotesk",sans-serif;font-size:14.5px;margin:0 0 10px;color:var(--text)}',
'.rs-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:14px;align-items:start}.rs-grid2>div>.rs-card:last-child{margin-bottom:0}.rs-grid2{margin-bottom:14px}',
'.rs-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rs-between{justify-content:space-between}.rs-wrap{flex-wrap:wrap;gap:12px}',
'.rs-label{display:block;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-faint);margin-bottom:5px}',
'.rs-muted{color:var(--text-faint);font-family:Manrope,sans-serif;font-size:12.5px;line-height:1.5}.rs-note{margin-top:6px}',
'.rs-quote{font-family:Manrope,sans-serif;font-size:13.5px;color:var(--text);line-height:1.5}',
'.rs-btn{font-family:Manrope,sans-serif;font-weight:700;font-size:12.5px;padding:8px 14px;border-radius:9px;border:1px solid var(--gold);background:var(--gold);color:#16130D;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}',
'.rs-btn:hover{filter:brightness(1.08)}.rs-btn:disabled{opacity:.55;cursor:default}.rs-btn.sm{padding:6px 11px;font-size:12px}',
'.rs-btn.ghost{background:transparent;color:var(--text);border-color:var(--line)}.rs-btn.ghost:hover{border-color:var(--gold)}.rs-btn.ghost.danger{color:var(--danger)}',
'.rs-btn.ai{background:linear-gradient(135deg,#B6A4FF,#8A72F0);border-color:transparent;color:#14102E}',
'.rs-pill{display:inline-block;font-family:"JetBrains Mono",monospace;font-size:10px;padding:3px 9px;border-radius:999px;border:1px solid var(--line);color:var(--text-dim);white-space:nowrap}',
'.rs-pill.ok{color:var(--aurora);border-color:rgba(127,167,155,.45);background:var(--aurora-dim)}.rs-pill.warn{color:var(--gold);border-color:rgba(174,154,114,.5);background:var(--gold-dim)}.rs-pill.bad{color:var(--danger);border-color:rgba(242,122,107,.5);background:rgba(242,122,107,.08)}',
'.rs-scorebig{display:flex;gap:18px;align-items:center}.rs-bigring{position:relative;width:132px;height:132px;flex:0 0 auto}.rs-grade{font-family:"Space Grotesk",sans-serif;font-size:22px;color:var(--text);margin-bottom:4px}.rs-scorebig p{font-family:Manrope,sans-serif;font-size:13px;color:var(--text-dim);margin:0;line-height:1.5}',
'.rs-dims{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:12px;margin-bottom:14px}',
'.rs-dim{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}.rs-dim-top{display:flex;justify-content:space-between;font-family:"Space Grotesk",sans-serif;font-size:14px;color:var(--text)}.rs-dim-top span{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--text-dim)}',
'.rs-bar{height:6px;border-radius:999px;background:var(--line-soft);overflow:hidden;margin:8px 0 10px}.rs-bar i{display:block;height:100%;border-radius:999px;background:var(--gold)}.rs-bar i.ok{background:var(--aurora)}.rs-bar i.low{background:var(--danger)}',
'.rs-check{display:flex;gap:8px;font-family:Manrope,sans-serif;font-size:12.5px;color:var(--text-dim);line-height:1.45;margin-top:5px}.rs-check span{flex:0 0 14px}.rs-check.ok span{color:var(--aurora)}.rs-check.no span{color:var(--danger)}',
'.rs-fix{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid var(--line-soft)}.rs-fix:first-of-type{border-top:0}.rs-fix-body{min-width:0}.rs-fix-issue{font-family:Manrope,sans-serif;font-size:12px;color:var(--gold);margin-top:3px}',
'.rs-ai-top{display:flex;gap:14px;justify-content:space-between;align-items:center;flex-wrap:wrap}.rs-ai p{font-family:Manrope,sans-serif;font-size:12.5px;color:var(--text-dim);margin:0;max-width:560px}.rs-spark{color:#B6A4FF}',
'.rs-ai-out{white-space:pre-wrap;font-family:Manrope,sans-serif;font-size:13px;line-height:1.6;color:var(--text);margin-top:12px;padding:12px 14px;border-radius:10px;background:var(--void);border:1px solid var(--line-soft)}',
'.rs-scanpaper{background:#F7F5F0;border-radius:10px;padding:22px 24px;color:#1b1b22;font-family:Georgia,serif;box-shadow:0 20px 50px -30px rgba(0,0,0,.8);min-height:300px}',
'.rs-scanpaper .sp-x{opacity:calc(.3 + var(--h) * .7);background:rgba(232,171,58,calc(var(--h) * .42));border-radius:3px;box-shadow:0 0 calc(var(--h) * 14px) rgba(232,171,58,calc(var(--h) * .5));transition:opacity .25s}',
'.rs-scanpaper.dim .sp-x{opacity:calc(var(--h) * 1.5 - .25)}',
'.sp-name{font-size:21px;font-weight:700;display:table}.sp-contact{font-size:11.5px;margin:4px 0 10px;display:table}.sp-sum{font-size:12.5px;font-style:italic;margin-bottom:6px}.sp-empty{color:#a33;font-family:Manrope,sans-serif}',
'.sp-h{font-family:Arial,sans-serif;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #bbb;margin:12px 0 6px;padding-bottom:2px;color:#444}',
'.sp-entry{margin-bottom:7px}.sp-row{display:flex;gap:8px;flex-wrap:wrap;font-size:12.5px;align-items:baseline}.sp-t{font-weight:700}.sp-o{font-style:italic}.sp-d{margin-left:auto;font-size:11px}',
'.sp-b{font-size:11.5px;line-height:1.55;padding-left:12px;position:relative}.sp-b:before{content:"\\2022";position:absolute;left:2px;color:#999}',
'.rs-takeaway-big{font-family:Manrope,sans-serif;font-size:16px;font-style:italic;line-height:1.5;color:var(--text);margin:4px 0 10px}',
'.rs-issue{display:flex;gap:10px;font-family:Manrope,sans-serif;font-size:13px;color:var(--text-dim);line-height:1.5;padding:9px 0;border-top:1px solid var(--line-soft)}.rs-issue:first-of-type{border-top:0}.rs-issue span{color:var(--gold)}',
'.rs-bignum{font-family:"Space Grotesk",sans-serif;font-size:28px;font-weight:700}.rs-bignum.ok{color:var(--aurora)}.rs-bignum.warn{color:var(--gold)}.rs-bignum.bad{color:var(--danger)}',
'.rs-field{display:grid;grid-template-columns:18px 150px minmax(0,1fr);gap:8px;align-items:baseline;font-family:Manrope,sans-serif;font-size:12.5px;padding:6px 0;border-top:1px solid var(--line-soft)}.rs-field b{color:var(--text);font-weight:600}.rs-field em{font-style:normal;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.rs-field.ok .rs-fi{color:var(--aurora)}.rs-field.no .rs-fi{color:var(--danger)}.rs-field.no em{color:var(--danger)}.rs-field.opt .rs-fi{color:var(--text-faint)}',
'.rs-pre{white-space:pre-wrap;font-family:"JetBrains Mono",monospace;font-size:11.5px;line-height:1.55;color:var(--text-dim);background:var(--void);border:1px solid var(--line-soft);border-radius:10px;padding:12px 14px;max-height:460px;overflow:auto;margin:0}',
'.rs-risk{display:flex;gap:10px;align-items:flex-start;font-family:Manrope,sans-serif;font-size:13px;color:var(--text);padding:9px 0;border-top:1px solid var(--line-soft)}.rs-fixline{font-family:Manrope,sans-serif;font-size:12.5px;color:var(--aurora);margin-top:3px;line-height:1.45}',
'.rs-flaggroup{margin-bottom:16px}.rs-flag{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px}.rs-flag.high{border-left-color:var(--danger)}.rs-flag.med{border-left-color:var(--gold)}',
'.rs-flag-top{display:flex;gap:10px;align-items:center;font-family:"Space Grotesk",sans-serif;font-size:14px;color:var(--text)}.rs-flag-detail{font-family:Manrope,sans-serif;font-size:12.5px;color:var(--text-dim);margin:6px 0 2px;line-height:1.45}',
'.rs-qf{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--aurora-dim);border:1px solid rgba(127,167,155,.35);display:grid;gap:6px}',
'.rs-allclear h4{color:var(--aurora)}.rs-allclear p{font-family:Manrope,sans-serif;font-size:13px;color:var(--text-dim);margin:0}',
'.rs-evrow{display:grid;grid-template-columns:150px 110px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 0;border-top:1px solid var(--line-soft);font-family:Manrope,sans-serif;font-size:13px;color:var(--text)}',
'.rs-evrow details summary{cursor:pointer;color:var(--text-dim);font-size:12.5px}.rs-evq{font-size:12.5px;color:var(--text-dim);margin-top:5px;line-height:1.45}',
'.rs-hidden{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid var(--line-soft);font-family:Manrope,sans-serif;font-size:13px;color:var(--text)}.rs-hidden:first-of-type{border-top:0}',
'.rs-minerbar{font-family:Manrope,sans-serif;font-size:13.5px;color:var(--text-dim);margin-bottom:12px}.rs-minerbar b{color:var(--text)}',
'.rs-mine{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:10px}.rs-mine.open{border-color:var(--gold)}',
'.rs-where{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-faint)}.rs-mine-top .rs-quote{margin:4px 0 10px}',
'.rs-qs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:10px;margin-bottom:10px}',
'.rs-q{display:flex;flex-direction:column;justify-content:flex-end;text-transform:none;letter-spacing:normal;font-weight:400;margin:0}.rs-q span{display:block;font-family:Manrope,sans-serif;font-size:12.5px;color:var(--text);margin-bottom:5px;text-transform:none;letter-spacing:normal;line-height:1.4}.rs-slot,.rs-fieldpick,.rs-toggle{text-transform:none;letter-spacing:normal;font-weight:400}.rs-q input,.rs-input,.rs-slot input,.rs-cand textarea,.rs-fieldpick select,[data-rs-cmp],[data-rs-tag],[data-rs-contact]{width:100%;max-width:100%;box-sizing:border-box;background:var(--void);border:1px solid var(--line);border-radius:9px;color:var(--text);font-family:Manrope,sans-serif;font-size:13px;padding:9px 11px}',
'.rs-input{flex:1;min-width:200px;width:auto}[data-rs-cmp],[data-rs-tag]{width:auto;max-width:100%}',
'#resumeStudio,#rsToolPanel,.rs-panel{min-width:0;max-width:100%}.rs-cmprow,.rs-unl>label,.rs-unl>div{min-width:0}',
'.rs-unvnote{font-family:Manrope,sans-serif;font-size:12.5px;line-height:1.5;color:var(--danger);background:rgba(242,122,107,.07);border:1px solid rgba(242,122,107,.28);border-radius:9px;padding:8px 11px;margin:0 0 10px}',
'.rs-q-fig span{color:var(--gold)}.rs-more{justify-content:center;margin:4px 0 14px}.rs-contact .rs-qs{margin-top:10px}',
'.rs-tagged{margin-top:10px;font-family:Manrope,sans-serif}.rs-tagged summary{cursor:pointer;color:var(--text-dim);font-size:12.5px;padding:6px 0}',
'.rs-cand{margin-top:12px;display:grid;gap:8px}.rs-cand textarea{resize:vertical;line-height:1.5}',
'.rs-honest{font-family:Manrope,sans-serif;font-size:12.5px;padding:7px 10px;border-radius:8px}.rs-honest.ok{color:var(--aurora);background:var(--aurora-dim)}.rs-honest.bad{color:var(--danger);background:rgba(242,122,107,.08)}',
'.rs-xyzlist{max-height:620px;overflow:auto}.rs-xyzitem{display:flex;gap:10px;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line-soft);padding:9px 4px;cursor:pointer;color:var(--text-dim);font-family:Manrope,sans-serif;font-size:12.5px;line-height:1.45}.rs-xyzitem:hover{color:var(--text)}.rs-xyzitem.on{color:var(--text);background:var(--gold-dim);border-radius:8px}',
'.rs-dots{display:inline-flex;gap:3px;flex:0 0 auto;padding-top:5px}.rs-dots i{width:7px;height:7px;border-radius:50%;background:var(--line)}.rs-dots i.on{background:var(--aurora)}.rs-dots.legend{padding:0;gap:4px;align-items:center;text-transform:none;letter-spacing:0}',
'.rs-slot{display:flex;gap:10px;margin-top:10px;padding:10px;border-radius:10px;border:1px solid var(--line-soft);background:var(--void)}.rs-slot.miss{border-color:rgba(174,154,114,.5)}.rs-slot.ok{border-color:rgba(127,167,155,.4)}',
'.rs-slot-tag{flex:0 0 28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:"Space Grotesk",sans-serif;font-weight:700;background:var(--line-soft);color:var(--text)}.rs-slot.ok .rs-slot-tag{background:var(--aurora-dim);color:var(--aurora)}.rs-slot.miss .rs-slot-tag{background:var(--gold-dim);color:var(--gold)}',
'.rs-slot-body{flex:1;display:grid;gap:3px;font-family:Manrope,sans-serif}.rs-slot-body b{font-size:13px;color:var(--text)}.rs-slot-body small{font-size:11.5px;color:var(--text-faint)}',
'.rs-fieldpick{min-width:260px}.rs-headline{font-family:"Space Grotesk",sans-serif;font-size:16px;color:var(--text);margin:2px 0 10px;line-height:1.4}',
'.rs-bridge{display:grid;grid-template-columns:1fr 26px 1fr;gap:10px;align-items:start;padding:12px 0;border-top:1px solid var(--line-soft);font-family:Manrope,sans-serif}.rs-bridge:first-of-type{border-top:0}.rs-bridge b{font-size:13.5px;color:var(--text);display:block;margin-bottom:3px}.rs-br-arrow{color:var(--gold);font-size:18px;text-align:center;padding-top:16px}.rs-br-to b{color:var(--aurora)}',
'.rs-tr{padding:10px 0;border-top:1px solid var(--line-soft);display:grid;gap:6px}.rs-tr-new{font-family:Manrope,sans-serif;font-size:13.5px;color:var(--text)}',
'.rs-ver{display:flex;gap:12px;justify-content:space-between;align-items:center;padding:11px 0;border-top:1px solid var(--line-soft);font-family:Manrope,sans-serif;font-size:13px;color:var(--text);flex-wrap:wrap}.rs-ver:first-child{border-top:0}',
'.rs-diffstats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.rs-dent{padding:10px 0;border-top:1px solid var(--line-soft);font-family:Manrope,sans-serif;font-size:13px;color:var(--text)}.rs-dline{margin-top:6px;line-height:1.7;font-size:13px}',
'.rs-d-same{color:var(--text-dim)}.rs-d-add{color:var(--aurora);background:var(--aurora-dim);border-radius:3px;padding:0 2px}.rs-d-del{color:var(--danger);text-decoration:line-through;background:rgba(242,122,107,.07);border-radius:3px;padding:0 2px}',
'.rs-reco{font-family:Manrope,sans-serif;font-size:14px;line-height:1.5;color:var(--text);border-left:3px solid var(--line)}.rs-reco.ok{border-left-color:var(--aurora)}.rs-reco.warn{border-left-color:var(--gold)}.rs-reco.bad{border-left-color:var(--danger)}',
'.rs-cbrow{padding:12px 0;border-top:1px solid var(--line-soft);display:grid;gap:6px;font-family:Manrope,sans-serif;font-size:13px;color:var(--text)}.rs-cbrow:first-child{border-top:0}.rs-cbrow.lead .rs-cbname b{color:var(--aurora)}',
'.rs-cbnums{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--text-dim)}.rs-cbnums b{color:var(--text)}.rs-cbnums .ok b{color:var(--aurora)}.rs-cbnums .bad b{color:var(--danger)}.rs-cbrate{display:flex;gap:10px;align-items:center}.rs-cbrate .rs-bar{flex:1;margin:0;max-width:280px}.rs-cbrate span{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--text-dim)}',
'.rs-unl{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid var(--line-soft);font-family:Manrope,sans-serif;font-size:13px;color:var(--text);flex-wrap:wrap}',
'.rs-def{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:10px;display:grid;gap:8px}.rs-defrisks{font-family:Manrope,sans-serif;font-size:12.5px;color:var(--gold);display:grid;gap:3px}',
'.rs-qlist{margin:0;padding-left:20px;font-family:Manrope,sans-serif;font-size:13px;color:var(--text);line-height:1.6}.rs-star{font-family:Manrope,sans-serif;font-size:12.5px;color:var(--text-dim);line-height:1.6}.rs-star summary{cursor:pointer;color:var(--text);font-weight:600}.rs-star b{color:var(--gold);display:inline-block;width:16px}',
'.rs-toggle{font-family:Manrope,sans-serif;font-size:12.5px;color:var(--text-dim);cursor:pointer}.rs-toggle input{width:auto}',
'.rs-meter{display:flex;gap:10px;align-items:center;font-family:Manrope,sans-serif;font-size:12.5px;color:var(--text-dim)}.rs-meterbar{position:relative;width:160px;height:8px;border-radius:999px;background:var(--line-soft)}.rs-meterbar i{display:block;height:100%;border-radius:999px;background:var(--gold)}.rs-meterbar i.ok{background:var(--aurora)}.rs-onepage{position:absolute;left:50%;top:-4px;width:2px;height:16px;background:var(--text-faint)}',
'.rs-cut{padding:7px 0;border-top:1px solid var(--line-soft);font-family:Manrope,sans-serif;font-size:12.5px}',
'.rs-paperwrap{position:relative;overflow:hidden;border-radius:12px;background:var(--void);border:1px solid var(--line-soft)}.rs-paperscale{position:absolute;left:0;top:0;width:816px;transform-origin:0 0}#rsPaper{width:816px;height:1056px;border:0;background:#fff;display:block}',
'.rs-pagebreak{position:absolute;left:0;right:0;border-top:2px dashed #E3A23B;pointer-events:none}.rs-pagebreak span{position:absolute;right:8px;top:4px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#B07A16;background:#fff8e8;padding:2px 6px;border-radius:4px}',
'.rs-empty{text-align:center;padding:40px 20px;background:var(--panel);border:1px dashed var(--line);border-radius:14px}.rs-empty-glyph{font-size:28px;color:var(--gold)}.rs-empty h3{font-family:"Space Grotesk",sans-serif;color:var(--text);margin:8px 0}.rs-empty p{font-family:Manrope,sans-serif;font-size:13.5px;color:var(--text-dim);max-width:520px;margin:0 auto 16px;line-height:1.55}.rs-empty .rs-row{justify-content:center}',
'@media (max-width:760px){.rs-tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin;contain:inline-size;max-width:100%}.rs-fieldpick{min-width:0;width:100%}.rs-input{min-width:0}.rs-cmprow select{flex:1 1 120px;min-width:0}.rs-ver>.rs-row,.rs-unl label{max-width:100%}.rs-unl select{min-width:0;flex:1 1 140px}.rs-vitals{flex-direction:column;align-items:flex-start}.rs-field{grid-template-columns:18px 110px minmax(0,1fr)}.rs-evrow{grid-template-columns:minmax(0,1fr) auto}.rs-evrow .rs-ev{grid-column:1/-1}.rs-bridge{grid-template-columns:1fr}.rs-br-arrow{display:none}.rs-scorebig{flex-direction:column;align-items:flex-start}.rs-title h2{font-size:17px}}'
].join('\n');
function injectCss(){ if(D.getElementById('rsStyles')) return; var st = D.createElement('style'); st.id = 'rsStyles'; st.textContent = CSS; D.head.appendChild(st); }

/* ------------------------------------------------------- font calibration */
var TPL_FONTS = { classic: '14px Georgia, "Times New Roman", serif', modern: '13.333px "Helvetica Neue", Arial, sans-serif', compact: '12.267px Arial, Helvetica, sans-serif' };
var DEFAULT_SAMPLE = 'Reduced weekly reporting time by 60% by automating SQL pipelines for the regional sales team, coordinated deliveries with vendors, and trained new hires on the register and the closing checklist.';
// Measure this device's real character advance for each template with a canvas, so page estimates are right from the
// very first render (no need to open Preview first). The live preview, when opened, refines it with the real layout.
function calibrateFonts(R){
  if(S.fontsCalibrated) return; S.fontsCalibrated = true;
  try{
    var cv = D.createElement('canvas'), ctx = cv.getContext && cv.getContext('2d');
    if(!ctx || typeof ctx.measureText !== 'function') return;
    var sample = E.allBullets(R).map(function(b){ return b.text; }).join(' ').slice(0, 4000);
    if(sample.length < 200) sample = DEFAULT_SAMPLE;
    var c = calib(), changed = false;
    Object.keys(TPL_FONTS).forEach(function(tpl){
      if(c[tpl] && c[tpl].via === 'preview') return;   // the real layout already measured it
      ctx.font = TPL_FONTS[tpl];
      var cw = ctx.measureText(sample).width / sample.length, prev = c[tpl] && c[tpl].cw;
      if(isFinite(cw) && cw > 2 && cw < 14 && (!prev || Math.abs(prev - cw) / prev > 0.015)){ c[tpl] = { cw: Math.round(cw * 1000) / 1000, via: 'canvas' }; changed = true; }
    });
    if(changed) lsSet(CALIB_KEY, c);
  }catch(e){}
}

/* ---------------------------------------------------------------- mount */
function mount(){
  var sec = D.getElementById('resumeSection'); if(!sec) return;
  injectCss();
  if(!D.getElementById('resumeStudio')){ var top = D.createElement('div'); top.id = 'resumeStudio'; sec.insertBefore(top, sec.firstChild); }
  if(!D.getElementById('rsToolPanel')){ var tp = D.createElement('div'); tp.id = 'rsToolPanel'; tp.className = 'hidden'; sec.appendChild(tp); }
  if(!S.bound){
    sec.addEventListener('click', onClick);
    sec.addEventListener('input', onInput);
    sec.addEventListener('change', onChange);
    D.addEventListener('click', function(ev){ var t = ev.target.closest && ev.target.closest('#rsToast [data-rs-undo]'); if(t){ ev.preventDefault(); t.disabled = true; undo(); } });   // undo() shows its own "Undid" toast
    S.bound = true;
  }
  hydrateVersions();
  calibrateFonts(current());
  refresh();
}

root.RESUME_STUDIO = {
  mount: mount, refresh: refresh, setTab: setTab, current: current,
  versions: versions, saveVersion: saveVersion, saveTailoredVersion: saveTailoredVersion, applyBullet: applyBullet, undo: undo,
  _state: S, _setToday: function(d){ S.today = d || null; }
};
})(typeof window !== 'undefined' ? window : globalThis);
