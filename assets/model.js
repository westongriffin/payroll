/* Payroll Control Monitor: sample company model.
   Every dollar figure in the demo comes from here, so the calendar, the tie-out and the register agree with each other.
   All of it is invented sample data: one weekly U.S. payroll of about 312 people, plus nine sample countries. */
(function(){
  "use strict";
  var P = window.PCM, MONTHS = P.MONTHS;

  /* Deterministic pseudo-random numbers, so the sample figures are the same on every visit */
  function h32(s){ var h = 2166136261, i; for(i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(s){ return h32(s) / 4294967295; }
  function r2(n){ return Math.round(n * 100) / 100; }
  function money(n, cents){
    var neg = n < 0, v = Math.abs(n), s = cents ? v.toFixed(2) : String(Math.round(v));
    var parts = s.split("."); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-$" : "$") + parts.join(".");
  }

  var EMPLOYEES = 312, CONTRACTORS = 64;

  /* Share of U.S. wages by state: the four office states carry most of it */
  var WEIGHT = { TX:.30, MA:.12, VA:.10, AZ:.09, CA:.07, NY:.06, FL:.03, IL:.03, PA:.03, OH:.02, GA:.02, NC:.02, NJ:.02, CO:.015, WA:.015 };
  var STATES = Object.keys(P.JUR).filter(function(k){ return P.JUR[k].level === "state"; }).map(function(k){ return P.JUR[k].abbr; });
  (function(){
    var used = 0, rest = [];
    STATES.forEach(function(c){ if(WEIGHT[c]) used += WEIGHT[c]; else rest.push(c); });
    rest.forEach(function(c){ WEIGHT[c] = (1 - used) / rest.length; });
  })();
  function heads(c){ return Math.max(1, Math.round(WEIGHT[c] * EMPLOYEES)); }
  function suiRate(c){ return Math.round((0.9 + 3.7 * rnd("sui" + c)) * 10) / 10; }      /* percent, sample */
  function whRate(c){ return 0.032 + 0.022 * rnd("wh" + c); }
  var SUI_FRAC = { 1:0.82, 2:0.34, 3:0.13, 4:0.06 };                                       /* share of wages still under the wage base */

  /* One weekly payroll run, keyed by its Friday */
  function fridayOf(pay){ var d = pay; while(P.dow(d) !== 5) d = P.addDays(d, 1); return d; }
  var runCache = {};
  function run(fri){
    var k = P.iso(fri); if(runCache[k]) return runCache[k];
    var gross = r2(356400 * (0.95 + 0.10 * rnd("g" + k)));
    var fit = r2(gross * (0.098 + 0.012 * rnd("f" + k))), ss = r2(gross * 0.124 * 0.991), med = r2(gross * 0.029);
    return (runCache[k] = { fri:fri, pay:P.prevBiz(fri), gross:gross, fit:fit, ss:ss, med:med, liab:r2(fit + ss + med), due:P.addBiz(fri, 3) });
  }
  /* The Controls scenario run: $118,400 in federal tax */
  function bigRun(fri){
    var gross = 455600, ss = r2(gross * 0.124 * 0.991), med = r2(gross * 0.029), b = run(fri);
    return { fri:fri, pay:b.pay, gross:gross, fit:r2(118400 - ss - med), ss:ss, med:med, liab:118400, due:P.nextBiz(P.addDays(b.pay, 1)), big:true };
  }
  function runsIn(a, b){                                                                   /* runs whose pay date falls in [a, b] */
    var out = [], f = P.addDays(a, -7); while(P.dow(f) !== 5) f = P.addDays(f, 1);
    for(; f <= P.addDays(b, 7); f = P.addDays(f, 7)){ var r = run(f); if(r.pay >= a && r.pay <= b) out.push(r); }
    return out;
  }
  function qStart(y, q){ return P.D(y, q * 3 - 2, 1); }
  function qEnd(y, q){ return P.eom(y, q * 3); }
  function quarterRuns(y, q){ return runsIn(qStart(y, q), qEnd(y, q)); }
  function total(runs, key){ var t = 0; runs.forEach(function(r){ t += r[key]; }); return r2(t); }
  var wCache = {};
  function qWages(y, q){ var k = y + "q" + q; return wCache[k] || (wCache[k] = total(quarterRuns(y, q), "gross")); }
  function mWages(y, m){ var k = y + "m" + m; return wCache[k] || (wCache[k] = total(runsIn(P.D(y, m, 1), P.eom(y, m)), "gross")); }
  function qLiab(y, q){ return total(quarterRuns(y, q), "liab"); }
  function futaQ(y, q){ return r2([9820, 1904, 716, 388][q - 1] + (q === 4 && y === 2026 ? 0.015 * 7000 * heads("CA") : 0)); }
  function futaYear(y){ return r2(futaQ(y, 1) + futaQ(y, 2) + futaQ(y, 3) + futaQ(y, 4)); }

  /* Local and international sample sizes */
  var LOCAL = { "L-CLE":[.006,.025], "L-CIN":[.004,.018], "L-RITA":[.006,.02], "L-COL":[.004,.025], "L-PHL":[.008,.0343], "L-NYC":[.03,.035], "L-MCTMT":[.05,.0034],
                "L-LOU":[.004,.0145], "L-LEX":[.003,.0225], "L-KC":[.005,.01], "L-STL":[.005,.01], "L-PDX":[.006,.004], "L-TRIMET":[.008,.008], "L-SEA":[.01,.004], "L-PA":[.018,.012] };
  var COUNTRY = { "INT-CA":182000, "INT-MX":96000, "INT-UK":141000, "INT-IE":58000, "INT-DE":112000, "INT-IN":71000, "INT-PH":54000, "INT-SG":83000, "INT-AU":91000 };   /* monthly payroll, USD equivalent */
  var GRATE = { pd7a:.27, eht:.0195, wsib:.012, ehta:.0195, wsiba:.012, isr:.14, imss:.20, isn:.03, infonavit:.14, ptu:.40, aguinaldo:.50,
                paye:.31, pension:.08, c1a:.02, ros:.30, lst:.19, sv:.39, tds:.11, pf:.11, esi:.015, pt:.004, lwf:.0006, bonus:.70,
                "1601c":.09, sss:.13, phic:.05, hdmf:.02, "13th":1, cpf:.30, fwl:.03, "super":.12, payg:.24, ptax:.0545, fbt:.06 };

  function periodOf(it){
    var m = /^Q(\d) (\d{4})$/.exec(it.period); if(m) return { q:+m[1], y:+m[2] };
    m = /^([A-Z][a-z]+) (\d{4})$/.exec(it.period);
    if(m && MONTHS.indexOf(m[1]) >= 0) return { m:MONTHS.indexOf(m[1]) + 1, y:+m[2] };
    var d = it.nominal, pm = d.getUTCMonth(), y = d.getUTCFullYear();                      /* otherwise: the month before the due date */
    if(pm === 0){ pm = 12; y--; }
    return { m:pm, y:y };
  }
  function wagesFor(per){ return per.q ? qWages(per.y, per.q) : mWages(per.y, per.m); }

  P.ITEMS.concat(P.COLUMBUS).forEach(function(it){
    var key = it.id.split("|")[1], per = periodOf(it), a = null, kind = "pay", c, w;
    if(it.level === "federal"){
      if(key === "ftd") a = run(fridayOf(it.payday)).liab;
      else if(key === "futa" && per.q) a = futaQ(per.y, per.q);
      else if(key === "941" && per.q){ a = qLiab(per.y, per.q); kind = "reported"; }
      else if(key === "940"){ a = futaYear(it.nominal.getUTCFullYear() - 1); kind = "reported"; }
      else if(key === "w2ee" || key === "w2ssa") it.forms = EMPLOYEES + " Forms W-2";
      else if(key === "1099nec") it.forms = CONTRACTORS + " Forms 1099-NEC";
      else if(key === "aca-ee" || key === "aca-irs") it.forms = EMPLOYEES + " Forms 1095-C";
    } else if(it.level === "state"){
      c = P.JUR[it.jur].abbr; w = WEIGHT[c];
      if(key === "wh"){ a = w * wagesFor(per) * whRate(c); if(per.q) kind = "reported"; }
      else if(key === "ui" && per.q) a = w * qWages(per.y, per.q) * (suiRate(c) / 100) * SUI_FRAC[per.q];
      else if(key === "combo" && per.q){ a = w * qWages(per.y, per.q) * (whRate(c) + (suiRate(c) / 100) * SUI_FRAC[per.q]); kind = "reported"; }
      else if((key === "pfml" || key === "famli") && per.q) a = w * qWages(per.y, per.q) * 0.0088;
      else if(key === "lni" && per.q) a = w * qWages(per.y, per.q) * 0.011;
      else if(key === "mbt" && per.q) a = w * qWages(per.y, per.q) * 0.0117;
      else if(key === "wc") a = heads(c) * 4.30;
      else if(key === "ann" || key === "5081") it.forms = heads(c) + (heads(c) === 1 ? " Form W-2" : " Forms W-2");
    } else if(it.level === "local"){
      var L = LOCAL[it.jur];
      if(key === "rec") it.forms = Math.max(1, Math.round((L ? L[0] : .004) * EMPLOYEES)) + " Forms W-2";
      else if(key === "lst") a = Math.round(LOCAL["L-PA"][0] * EMPLOYEES) * 13;
      else if(key === "opt") a = Math.round(.012 * EMPLOYEES) * 9.75;
      else if(key === "pet" && it.jur === "L-STL") a = LOCAL["L-STL"][0] * wagesFor(per) * 0.005;
      else if(L) a = L[0] * wagesFor(per) * L[1];
    } else if(it.level === "global"){
      var mp = COUNTRY[it.jur], g = GRATE[key];
      if(mp && g) a = mp * g * (0.96 + 0.08 * rnd(it.id));
      if(it.jur === "INT-AU" && key === "ptax" && it.form === "Annual reconciliation") a = mp * g * 1.4;
    }
    if(a != null){ it.amt = r2(a); it.amtKind = kind; if(it.level === "global") it.usd = true; }
  });

  P.model = {
    EMPLOYEES:EMPLOYEES, CONTRACTORS:CONTRACTORS, WEIGHT:WEIGHT, heads:heads, suiRate:suiRate, rnd:rnd, r2:r2, money:money,
    run:run, bigRun:bigRun, fridayOf:fridayOf, runsIn:runsIn, quarterRuns:quarterRuns, total:total, qStart:qStart, qEnd:qEnd, qWages:qWages, COUNTRY:COUNTRY
  };
})();
