/* Payroll Control Monitor: Pay runs, Tie-out, Company file, Notices and Clean-up.
   All figures are sample data from model.js. The Company file is editable and saves to this browser only. */
(function(){
  "use strict";
  var P = window.PCM, M = P.model, JUR = P.JUR, LINKS = P.LINKS, TODAY = P.TODAY, DAY = P.DAY, money = M.money;

  P.views = function(A){
    var h = A.h, $ = A.$, swap = A.swap, num = A.num, plural = A.plural;
    var LEVELNAME = { federal:"Federal", state:"State", local:"Local", global:"Global" };
    function tile(label, value, note, warn){
      return h("div", { class:"tile" + (warn ? " warn" : "") }, h("div", { class:"label", text:label }), h("div", { class:"value", text:value }), h("div", { class:"note", text:note }));
    }
    function pill(text, cls){ return h("span", { class:"pill " + (cls || "plain"), text:text }); }
    function td(text, cls){ return h("td", { class:cls || null, text:text }); }
    function bizBack(dt, n){ while(n > 0){ dt = P.prevBiz(P.addDays(dt, -1)); n--; } return dt; }
    function wkBack(dt, n){ while(n > 0){ dt = P.addDays(dt, -1); if(P.dow(dt) !== 0 && P.dow(dt) !== 6) n--; } return dt; }
    function wkFwd(dt, n){ while(n > 0){ dt = P.addDays(dt, 1); if(P.dow(dt) !== 0 && P.dow(dt) !== 6) n--; } return dt; }
    function ago(n){ return P.prevBiz(P.addDays(TODAY, -n)); }
    function ahead(n){ return P.prevBiz(P.addDays(TODAY, n)); }
    function days(a, b){ return Math.round((b - a) / DAY); }
    function scenarioRun(){ return A.state().steps.deposit !== null ? M.bigRun(A.dates.NEXT_FRI) : null; }

    /* =====================================================================
       PAY RUNS
       ===================================================================== */
    function cycle(fri){
      var big = scenarioRun(), r = big && P.same(big.fri, fri) ? big : M.run(fri);
      var submit = bizBack(r.pay, 2), fund = bizBack(r.pay, 1), ts = P.nextBiz(P.addDays(fri, -4));
      if(ts > submit) ts = submit;
      var review = P.nextBiz(P.addDays(ts, 1)); if(review > submit) review = submit;
      var shifted = !P.same(r.pay, fri) || !P.same(submit, P.addDays(fri, -2)) || !P.same(ts, P.addDays(fri, -4));
      return { r:r, fri:fri, pay:r.pay, submit:submit, fund:fund, ts:ts, review:review, shifted:shifted, weekEnd:P.addDays(fri, -5) };
    }
    function cycleStatus(c){
      if(c.pay < TODAY) return ["Paid", "ok"];
      if(P.same(c.pay, TODAY)) return ["Pay day", "soon"];
      if(TODAY < c.ts) return ["Timesheets due " + P.fmtShort(c.ts), "plain"];
      if(TODAY <= c.submit) return [P.same(c.submit, TODAY) ? "Submit today" : "Submit by " + P.fmtShort(c.submit), P.same(c.submit, TODAY) ? "warn" : "soon"];
      return ["Submitted, pays " + P.fmtShort(c.pay), "ok"];
    }
    function renderRuns(){
      var f = A.dates.NEXT_FRI, list = [], i;
      for(i = -2; i < 11; i++) list.push(cycle(P.addDays(f, i * 7)));
      var next = list.filter(function(c){ return c.pay >= TODAY; })[0];
      var soon = [], g = f; for(i = 0; i < 13; i++){ var cc = cycle(P.addDays(g, i * 7)); if(cc.shifted) soon.push(cc); }
      swap($("runtiles"), [
        tile("Next pay date", P.fmtShort(next.pay), "Week ended " + P.fmtShort(next.weekEnd)),
        tile("Submit deadline", P.fmtShort(next.submit), "Two business days before pay day", P.same(next.submit, TODAY)),
        tile("Funding for the next run", money(next.r.gross * 1.0765), "Wages plus employer taxes, sample estimate"),
        tile("Holiday weeks in the next 90 days", String(soon.length), soon.length ? "Next: pay date " + P.fmtShort(soon[0].pay) : "No shifted cutoffs", soon.length > 0)
      ]);
      swap($("runrows"), list.map(function(c){
        var st = cycleStatus(c);
        return h("tr", { class:c.shifted ? "hl" : null },
          h("th", { scope:"row" }, P.fmtShort(c.pay), c.shifted ? h("span", { class:"pill warn sm", text:"Holiday week" }) : null),
          td("Week ended " + P.fmtMD(c.weekEnd)), td(P.fmtShort(c.ts)), td(P.fmtShort(c.review)), td(P.fmtShort(c.submit)), td(P.fmtShort(c.fund)),
          td(money(c.r.gross), "num"), td(P.fmtShort(c.r.due)), h("td", null, pill(st[0], st[1])));
      }));
      /* International: monthly, run by in-country vendors */
      var y = TODAY.getUTCFullYear(), m = TODAY.getUTCMonth() + 1, intl = [];
      Object.keys(JUR).filter(function(k){ return JUR[k].level === "global"; }).sort(function(a, b){ return JUR[a].name < JUR[b].name ? -1 : 1; }).forEach(function(k){
        var pay = k === "INT-AU" ? P.D(y, m, 15) : P.eom(y, m);
        while(P.dow(pay) === 0 || P.dow(pay) === 6) pay = P.addDays(pay, -1);
        if(pay < TODAY){ pay = k === "INT-AU" ? P.D(y, m + 1, 15) : P.eom(y, m + 1); while(P.dow(pay) === 0 || P.dow(pay) === 6) pay = P.addDays(pay, -1); }
        var inputs = wkBack(pay, 8), approve = wkBack(pay, 3), confirm = wkFwd(pay, 5);
        var st = TODAY <= inputs ? ["Inputs due " + P.fmtShort(inputs), "plain"] : TODAY <= approve ? ["Approve by " + P.fmtShort(approve), "soon"] : ["Approved, pays " + P.fmtShort(pay), "ok"];
        intl.push(h("tr", null, h("th", { scope:"row", text:JUR[k].name }), td(P.fmtShort(inputs)), td(P.fmtShort(approve)), td(P.fmtShort(pay)), td(P.fmtShort(confirm)),
          td(money(M.COUNTRY[k]), "num"), h("td", null, pill(st[0], st[1]))));
      });
      swap($("intlrows"), intl);
    }

    /* =====================================================================
       TIE-OUT
       ===================================================================== */
    var tq = "cur";
    function quarterOf(which){
      var y = TODAY.getUTCFullYear(), q = Math.floor(TODAY.getUTCMonth() / 3) + 1;
      if(which === "prev"){ q--; if(q === 0){ q = 4; y--; } }
      return { y:y, q:q };
    }
    function depositStatus(r){
      if(r.big) return A.busy("deposit") ? ["Due " + P.fmtShort(r.due), "warn", false] : ["Deposited, matched", "ok", true];
      if(r.due < TODAY) return ["Deposited " + P.fmtMD(r.due), "ok", true];
      if(P.same(r.due, TODAY)) return ["Scheduled today", "soon", false];
      return ["Scheduled " + P.fmtMD(r.due), "plain", false];
    }
    function renderTie(){
      var Q = quarterOf(tq), cur = tq === "cur", big = scenarioRun();
      var runs = M.quarterRuns(Q.y, Q.q).filter(function(r){ return r.pay <= TODAY; });
      if(cur && big && big.pay > TODAY) runs.push(big);
      var label = "Q" + Q.q + " " + Q.y, due941 = P.nextBiz(P.eom(Q.y, Q.q * 3 + 1));
      $("tqcur").setAttribute("aria-pressed", cur ? "true" : "false"); $("tqprev").setAttribute("aria-pressed", cur ? "false" : "true");
      var c0 = quarterOf("cur"), p0 = quarterOf("prev");
      $("tqcur").textContent = "Q" + c0.q + " " + c0.y + ", in progress"; $("tqprev").textContent = "Q" + p0.q + " " + p0.y + ", filed";

      var lag = runs.filter(function(r){ return P.addDays(r.pay, 7) > TODAY; });          /* journal posts the Friday after pay day */
      var clears = lag.length ? P.fmtShort(P.addDays(lag[lag.length - 1].pay, 7)) : "";
      function T(k, list){ return M.total(list || runs, k); }
      var made = runs.filter(function(r){ return depositStatus(r)[2]; }), sched = runs.filter(function(r){ return !depositStatus(r)[2]; });
      var fica = M.r2(T("ss") + T("med")), ficaLag = M.r2(T("ss", lag) + T("med", lag));
      function line(check, reg, other, otherAmt, variance, status, cls){
        return h("tr", null, h("th", { scope:"row", text:check }), td(reg == null ? "" : money(reg, true), "num"), td(other),
          td(otherAmt == null ? "" : money(otherAmt, true), "num"), td(variance == null ? "" : money(variance, true), "num" + (variance ? " var" : "")), h("td", null, pill(status, cls)));
      }
      function gl(check, key, regAmt, lagAmt){
        return line(check, regAmt, "General ledger", M.r2(regAmt - lagAmt), lagAmt, lagAmt ? "Timing, clears " + clears : "Tied", lagAmt ? "soon" : "ok");
      }
      var rows = [
        gl("Gross wages", "gross", T("gross"), T("gross", lag)),
        gl("Federal income tax withheld", "fit", T("fit"), T("fit", lag)),
        gl("Social Security and Medicare, both halves", "fica", fica, ficaLag),
        line("Total federal tax liability", T("liab"), "EFTPS deposits, made and scheduled", T("liab"), 0,
          sched.length ? plural(made.length, "made", "made") + ", " + sched.length + " scheduled" : "Tied, " + made.length + " deposits", sched.some(function(r){ return depositStatus(r)[1] === "warn"; }) ? "warn" : "ok"),
        cur ? line("Form 941, total tax (line 12)", T("liab"), "Form 941", null, null, "Due " + P.fmtShort(due941), "plain")
            : line("Form 941, total tax (line 12)", T("liab"), "Form 941 as filed", T("liab"), 0, "Tied, filed " + P.fmtMD(bizBack(due941, 3)), "ok"),
        cur ? line("State wages", T("gross"), "51 state wage reports", null, null, "Due with the quarterly returns", "plain")
            : line("State wages", T("gross"), "51 state wage reports as filed", T("gross"), 0, "Tied", "ok")
      ];
      swap($("tierows"), rows);
      swap($("tietiles"), [
        tile("Payroll runs in " + label, String(runs.length), cur ? "Posted so far" : "All posted and reviewed"),
        tile("Gross wages", money(T("gross")), "Per the payroll register"),
        tile("Federal tax liability", money(T("liab")), plural(made.length, "deposit", "deposits") + " made" + (sched.length ? ", " + sched.length + " scheduled" : "")),
        tile("Unexplained variance", "$0", lag.length ? "1 timing item, clears " + clears : "Every source agrees", false)
      ]);
      swap($("tieruns"), runs.map(function(r){
        var st = depositStatus(r);
        return h("tr", { class:st[1] === "warn" ? "hl" : null },
          h("th", { scope:"row", text:P.fmtShort(r.pay) }), td(money(r.gross, true), "num"), td(money(r.liab, true), "num"), td(P.fmtShort(r.due)),
          h("td", null, pill(st[0], st[1])), td(st[2] ? "EFTPS ••••" + String(1000 + Math.floor(M.rnd("c" + P.iso(r.fri)) * 9000)) : ""),
          td(st[2] ? "$0.00" : "", "num"), td(r.pay <= TODAY || r.big ? "Controller" : ""));
      }));
      /* Year-end preview */
      var y = TODAY.getUTCFullYear(), cq = c0.q, filed = 0, qtd, q;
      for(q = 1; q < cq; q++) filed += M.total(M.quarterRuns(y, q), "gross");
      qtd = M.total(M.quarterRuns(y, cq).filter(function(r){ return r.pay <= TODAY; }), "gross");
      var ty = TODAY.getUTCMonth() < 2 ? y - 1 : y, lastFri = P.D(ty, 12, 31); while(P.dow(lastFri) !== 5) lastFri = P.addDays(lastFri, -1);
      var checks = [
        ["Names and Social Security numbers checked against SSA records", P.D(ty, 11, 13)],
        ["Employee addresses confirmed for W-2 delivery", P.D(ty, 11, 30)],
        ["Taxable fringe benefits loaded: group-term life over $50,000 and personal use of company vehicles", P.D(ty, 12, 4)],
        ["Overtime premium totals reviewed for W-2 Box 12, code TT", P.D(ty, 12, 11)],
        ["Third-party sick pay reports requested from the carrier", P.D(ty, 12, 11)],
        ["Bonus and off-cycle runs scheduled so the last deposit lands in the right year", P.D(ty, 12, 15)],
        ["Final payroll of the year posted", P.prevBiz(lastFri)],
        ["New-year rates loaded and second-reviewed: wage bases, unemployment rates and minimum wages", P.D(ty, 12, 28)],
        ["Fourth-quarter tie-out complete across every source", P.D(ty + 1, 1, 15)],
        ["W-2 preview checked by the outside reviewer", P.D(ty + 1, 1, 20)],
        ["Forms W-2 and W-3 filed and delivered", P.nextBiz(P.D(ty + 1, 1, 31))]
      ].map(function(c){ return { text:c[0], date:P.prevBiz(c[1]), done:P.prevBiz(c[1]) < TODAY }; });
      var doneN = checks.filter(function(c){ return c.done; }).length;
      $("yecount").textContent = doneN + " of " + checks.length + " done for tax year " + ty;
      swap($("yechecks"), checks.map(function(c){
        var n = days(TODAY, c.date);
        return h("li", { class:c.done ? "done" : "" }, h("span", { class:"ck", "aria-hidden":"true", text:c.done ? "\u2713" : "" }), h("span", { class:"ct", text:c.text }),
          pill(c.done ? "Done " + P.fmtMD(c.date) : n <= 7 ? "Due " + P.fmtShort(c.date) : "Due " + P.fmtMD(c.date), c.done ? "ok" : n <= 7 ? "soon" : "plain"));
      }));
      swap($("yepreview"), [
        h("div", null, h("span", { text:cq > 1 ? "Forms 941 filed, quarters 1 to " + (cq - 1) : "Forms 941 filed" }), h("b", { text:money(filed, true) })),
        h("div", null, h("span", { text:"Quarter " + cq + " to date, register" }), h("b", { text:money(qtd, true) })),
        h("div", null, h("span", { text:"W-2 preview, total wages" }), h("b", { text:money(M.r2(filed + qtd), true) })),
        h("div", null, h("span", { text:"Variance" }), h("b", { class:"okc", text:"$0.00" }))
      ]);
    }

    /* =====================================================================
       COMPANY FILE: entities, accounts, filing details, portals and logins
       ===================================================================== */
    var STORE_KEY = "pcm.companyfile.v1", store = { acct:{}, custom:[], ent:null, con:null };
    try{
      var raw = window.localStorage.getItem(STORE_KEY);
      if(raw){ var parsed = JSON.parse(raw); if(parsed && typeof parsed === "object"){ store.acct = parsed.acct || {}; store.custom = Array.isArray(parsed.custom) ? parsed.custom : []; store.ent = Array.isArray(parsed.ent) ? parsed.ent : null; store.con = Array.isArray(parsed.con) ? parsed.con : null; } }
    }catch(e){}
    function persist(){ try{ window.localStorage.setItem(STORE_KEY, JSON.stringify(store)); return true; }catch(e){ return false; } }
    function hasEdits(){ return Object.keys(store.acct).length > 0 || store.custom.length > 0 || !!store.ent || !!store.con; }
    function CONTACTS_DEFAULT(){
      return [
        { id:"c1", role:"Outside CPA, payroll tax review", name:"Name (sample)", org:"Firm (sample)", phone:"", email:"", notes:"Reviews each quarter's tie-out and the year-end filings before they go out." },
        { id:"c2", role:"Payroll provider account manager", name:"Name (sample)", org:"Provider (sample)", phone:"", email:"", notes:"First call for a failed file, a rejected return or a missed debit." },
        { id:"c3", role:"Bank, treasury services", name:"Name (sample)", org:"Bank (sample)", phone:"", email:"", notes:"Payroll funding, ACH limits and same-day wires." },
        { id:"c4", role:"Benefits broker", name:"Name (sample)", org:"Brokerage (sample)", phone:"", email:"", notes:"ACA reporting, Part D notices and plan filings." },
        { id:"c5", role:"401(k) recordkeeper", name:"Name (sample)", org:"Recordkeeper (sample)", phone:"", email:"", notes:"Testing, Form 5500 and participant notices." },
        { id:"c6", role:"Employment counsel", name:"Name (sample)", org:"Law firm (sample)", phone:"", email:"", notes:"Classification questions, garnishment disputes and agency audits." },
        { id:"c7", role:"International payroll vendors", name:"One lead per country (sample)", org:"In-country vendors (sample)", phone:"", email:"", notes:"Monthly confirmations of every statutory payment." }
      ];
    }
    function contacts(){ return store.con || CONTACTS_DEFAULT(); }

    var STANDING = { ok:["Good standing","ok"], notice:["Open notice","warn"], plan:["Payment plan","warn"], pending:["Request pending","soon"], setup:["Setup needed","warn"] };
    var FLAGS = {
      "US|emp":["pending","Two penalty abatement requests are pending. See Clean-up."],
      "US-CA|wh":["pending","Penalty waiver request pending for the fourth quarter of 2025."],
      "US-PA|wh":["notice","Withholding underpayment notice for the second quarter of 2025. See Notices."],
      "US-GA|ui":["notice","Wage report mismatch for the third quarter. See Notices."],
      "US-IL|wh":["plan","2025 balance on a 12-month payment plan. See Clean-up."],
      "US-MA|ui":["pending","Rate protest filed after late wage reports."]
    };
    var LOCALRATE = { "L-COL":"2.5%", "L-CLE":"2.5%", "L-CIN":"1.8%", "L-KC":"1%", "L-STL":"1% earnings tax, plus 0.5% payroll expense tax", "L-DEN":"$5.75 employee and $4.00 employer, per month" };
    function mask(seed){ return "•••" + String(1000 + Math.floor(M.rnd("id" + seed) * 9000)); }
    function verifiedOn(seed){ return P.iso(P.prevBiz(P.addDays(TODAY, -(3 + Math.floor(M.rnd("v" + seed) * 75))))); }
    function ENTITIES_DEFAULT(){
      return [
        { id:"us", legal:"Catapult Staffing LLC", dba:"Catapult Solutions Group", type:"Limited liability company", formed:"Texas (sample)", ein:"••-•••1846 (sample)",
          address:"4965 Preston Park Blvd, Suite 800E, Plano, TX 75093", fiscal:"December 31", provider:"Payroll provider name (sample)", bank:"Operating account ending 4471 (sample)", agent:"Registered agent (sample)",
          notes:"U.S. employer of record for internal and field staff. Legal name and address are from public sources; everything else is sample." },
        { id:"intl-ca", legal:"Sample entity: Canada", dba:"", type:"Subsidiary (sample)", formed:"Ontario, Canada", ein:"Business Number ••••7714 (sample)", address:"Toronto, Ontario (sample)",
          fiscal:"December 31", provider:"In-country payroll vendor (sample)", bank:"Local payroll account (sample)", agent:"", notes:"Placeholder showing how a foreign entity is recorded." },
        { id:"intl-in", legal:"Sample entity: India", dba:"", type:"Private limited company (sample)", formed:"Karnataka, India", ein:"TAN ••••0932 (sample)", address:"Bengaluru, Karnataka (sample)",
          fiscal:"March 31", provider:"In-country payroll vendor (sample)", bank:"Local payroll account (sample)", agent:"", notes:"Placeholder showing how a foreign entity is recorded." }
      ];
    }
    function entities(){ return store.ent || ENTITIES_DEFAULT(); }
    function entityName(id){ var e = entities().filter(function(x){ return x.id === id; })[0]; return e ? (e.dba || e.legal) : "Unassigned"; }

    var defCache = null;
    function defaults(){
      if(defCache) return defCache;
      var out = [];
      function add(key, jur, name, o){
        var r = { key:key, jur:jur, name:name, entity:"us", acctId:mask(key), forms:"", freq:"", rate:"", link:"", loginId:"Shared payroll tax mailbox (sample)", holder:"Payroll Manager", backup:"Controller",
          vault:"Company password vault, folder Payroll Tax", mfa:"Authenticator on the payroll phone", verified:verifiedOn(key), standing:"ok", standingNote:"", notes:"" }, k;
        for(k in o) r[k] = o[k];
        if(FLAGS[key]){ r.standing = FLAGS[key][0]; r.standingNote = FLAGS[key][1]; }
        r.idx = out.length;
        out.push(r);
      }
      add("US|emp", "US", "Federal employment taxes", { acctId:"EIN ••-•••1846", forms:"Forms 941, 940 and 945", freq:"Semiweekly deposits; next business day at $100,000", rate:"FUTA 0.6%, and 2.1% on California wages for 2026", link:"US|eftps" });
      add("US|irs", "US", "IRS business tax account", { acctId:"EIN ••-•••1846", forms:"Transcripts, notices and balances", freq:"Transcripts pulled every quarter", link:"US|bta" });
      add("US|ssa", "US", "Social Security wage reporting", { acctId:"BSO user " + mask("bso"), forms:"Forms W-2 and W-3", freq:"Annual, due January 31", link:"US|ssa" });
      add("US|iris", "US", "Information returns, Forms 1099", { acctId:"TCC " + mask("tcc1"), forms:"Forms 1099-NEC and 1099-MISC", freq:"Annual", link:"US|iris" });
      add("US|air", "US", "ACA information returns", { acctId:"TCC " + mask("tcc2"), forms:"Forms 1094-C and 1095-C", freq:"Annual, due March 31", link:"US|air", holder:"Benefits Manager", backup:"Payroll Manager" });
      add("US|efast", "US", "Benefit plan annual reports", { acctId:"EFAST2 user " + mask("efast"), forms:"Form 5500", freq:"Annual, due July 31", link:"US|efast", holder:"Benefits Manager", backup:"Controller" });
      add("US|osha", "US", "OSHA injury reporting", { acctId:"ITA account " + mask("osha"), forms:"Form 300A data", freq:"Annual, due March 2", link:"US|osha", holder:"HR Generalist", backup:"Head of HR and Payroll" });
      add("US|vets", "US", "Federal contractor veterans report", { acctId:"Company number " + mask("vets"), forms:"Form VETS-4212", freq:"Annual, due September 30", link:"US|vets", holder:"HR Generalist", backup:"Head of HR and Payroll" });
      add("US|cms", "US", "Medicare Part D disclosure", { acctId:"Plan sponsor " + mask("cms"), forms:"Creditable coverage disclosure", freq:"Annual, due March 1", link:"US|cms", holder:"Benefits Manager", backup:"HR Generalist" });
      add("US|everify", "US", "E-Verify", { acctId:"Company ID " + mask("ev"), forms:"Employment eligibility cases", freq:"Within 3 business days of each hire", link:"US|everify", holder:"HR Generalist", backup:"Head of HR and Payroll" });
      Object.keys(JUR).filter(function(k){ return JUR[k].level === "state"; }).forEach(function(j){
        var J = JUR[j], c = J.abbr, w = M.WEIGHT[c], sui = M.suiRate(c) + "% for 2026 (sample)";
        if(J.wh){
          var combo = J.whr.charAt(0) === "C", mo = J.whr.charAt(0) === "M";
          add(j + "|wh", j, combo ? "Combined payroll tax account" : "Income tax withholding", { forms:J.wh, link:j + "|rev",
            freq:combo ? "Quarterly combined return; deposits on the state schedule" : mo ? "Monthly return and payment" : w >= .06 ? "Semiweekly deposits; quarterly return" : w >= .015 ? "Monthly deposits; quarterly return" : "Quarterly return and payment",
            rate:combo ? "Unemployment " + sui : "" });
        }
        if(J.ui) add(j + "|ui", j, "Unemployment insurance", { forms:J.ui, freq:"Quarterly wage report and payment", rate:sui, link:j + "|ui" });
      });
      [["US-WA|pfml","US-WA","Paid Family and Medical Leave and WA Cares","Quarterly premium report"],["US-WA|lni","US-WA","Workers' compensation","Quarterly report"],
       ["US-CO|famli","US-CO","FAMLI paid leave","Quarterly premiums and wage report"],["US-CT|pfml","US-CT","Paid Leave","Quarterly contributions"],["US-DE|pfml","US-DE","Paid Leave","Quarterly contributions"],
       ["US-ME|pfml","US-ME","Paid Family and Medical Leave","Quarterly contributions"],["US-MN|pfml","US-MN","Paid Leave","Quarterly premiums"],["US-NV|mbt","US-NV","Modified Business Tax","Quarterly return"],
       ["US-OH|bwc","US-OH","Workers' compensation","Annual payroll true-up, due August 15"]
      ].forEach(function(x){ add(x[0], x[1], x[2], { forms:x[3], freq:x[3], link:x[0] }); });
      Object.keys(JUR).filter(function(k){ return JUR[k].level === "local"; }).forEach(function(j){
        add(j + "|tax", j, "Local payroll tax account", { forms:"Local withholding returns and annual reconciliation", freq:/^L-(CLE|CIN|RITA|COL|DEN)$/.test(j) ? "Monthly" : "Quarterly", rate:LOCALRATE[j] || "", link:j + "|tax" });
      });
      Object.keys(JUR).filter(function(k){ return JUR[k].level === "global"; }).forEach(function(j){
        add(j + "|main", j, "Employer payroll registrations", { entity:j === "INT-CA" ? "intl-ca" : j === "INT-IN" ? "intl-in" : "us", forms:"Monthly statutory filings and year-end certificates", freq:"Monthly, filed by the in-country vendor",
          link:j + "|main", loginId:"Vendor portal login (sample)", holder:"In-country vendor", backup:"Payroll Manager", vault:"Company password vault, folder International", mfa:"Vendor-managed" });
      });
      return (defCache = out);
    }
    function withPortal(r){
      var L = LINKS[r.link];
      if(!r.portalName && L) r.portalName = L[0];
      if(!r.portalUrl && L) r.portalUrl = L[1];
      return r;
    }
    function baseRecord(d){
      var r = {}, k;
      for(k in d) r[k] = d[k];
      if(d.key === "L-COL|tax"){ r.standing = A.resolved("location") ? "ok" : "setup"; r.standingNote = A.resolved("location") ? "" : "Registration in progress. Open Controls to finish it."; }
      return withPortal(r);
    }
    function accounts(){
      var out = defaults().map(function(d){
        var r = baseRecord(d), k, o = store.acct[d.key] || {};
        for(k in o) r[k] = o[k];
        return r;
      });
      store.custom.forEach(function(cu){ var r = {}, k; for(k in cu) r[k] = cu[k]; r.custom = true; out.push(withPortal(r)); });
      return out;
    }
    function safeUrl(u){ return /^https?:\/\/[^\s]+$/i.test(u || "") ? u : ""; }
    function portalLink(r, text){
      var u = safeUrl(r.portalUrl);
      return u ? h("a", { href:u, target:"_blank", rel:"noopener noreferrer", text:text || r.portalName || "Open portal" }) : null;
    }
    /* Which account record a calendar deadline belongs to */
    var FEDMAP = { ftd:["US|emp","US|eftps"], futa:["US|emp","US|eftps"], "941":["US|emp","US|irs"], "940":["US|emp","US|irs"], "945":["US|emp","US|irs"], "1042":["US|emp","US|irs"], notice:["US|irs","US|bta"],
      w2ee:["US|ssa"], w2ssa:["US|ssa"], "1099nec":["US|iris"], "1099misc":["US|iris"], "1099misc-irs":["US|iris"], "aca-ee":["US|air"], "aca-irs":["US|air"], "5500":["US|efast"], "5500x":["US|efast"],
      "osha-post":["US|osha"], "osha-ita":["US|osha"], vets:["US|vets"], cms:["US|cms"], partd:["US|cms"], pcori:[null,"US|720"] };
    function portalFor(it){
      if(it.ev || it.cat === "notice" && it.level !== "federal") return null;              /* event clocks and setup tasks have no single agency site */
      var key = it.id.split("|")[1], list = accounts(), ak = null, lk = null, r, L;
      function find(k){ return list.filter(function(x){ return x.key === k; })[0]; }
      if(it.level === "federal"){ var f = FEDMAP[key]; if(!f) return null; ak = f[0]; lk = f[1]; }
      else if(it.level === "state"){
        if(/^(eeo|paydata|ucp)$/.test(key)) return null;                                   /* filed with a different agency than the tax accounts */
        ak = /^(ui|uim)$/.test(key) ? it.jur + "|ui" : /^(pfml|famli|lni|mbt|bwc)$/.test(key) ? it.jur + "|" + key : it.jur + "|wh";
        if(!find(ak)) ak = find(it.jur + "|wh") ? it.jur + "|wh" : find(it.jur + "|ui") ? it.jur + "|ui" : null;
        if(key === "pfml" && it.jur === "US-MA") ak = "US-MA|wh";
      }
      else if(it.level === "local") ak = it.jur + "|tax";
      else {
        if(/^(eht|ehta|wsib|wsiba|isn|ptu|aguinaldo|pension|bn|sv|jm|uv|sb|esi|pt|lwf|bonus|sss|phic|hdmf|13th|dole|ptax)$/.test(key)) return null;   /* paid to a separate body or to employees */
        ak = it.jur + "|main";
        if(it.jur === "INT-MX" && /^(imss|infonavit|repse|prima)$/.test(key)) lk = "INT-MX|imss";
        if(it.jur === "INT-IN" && key === "pf") lk = "INT-IN|epf";
        if(it.jur === "INT-SG" && key === "ir8a") lk = "INT-SG|iras";
      }
      r = ak ? find(ak) : null;
      if(lk && LINKS[lk]){ L = LINKS[lk]; return { name:L[0], url:L[1], holder:r ? r.holder : "", backup:r ? r.backup : "", account:r ? r.name : "" }; }
      if(!r || !safeUrl(r.portalUrl)) return null;
      return { name:r.portalName, url:r.portalUrl, holder:r.holder, backup:r.backup, account:r.name };
    }

    /* ----- Editor ----- */
    var ACCT_FIELDS = [
      { k:"name", label:"Account" }, { k:"jur", label:"Jurisdiction", type:"jur" }, { k:"entity", label:"Entity", type:"entity" }, { k:"acctId", label:"Account ID" },
      { k:"forms", label:"Forms filed", wide:true }, { k:"freq", label:"Filing and deposit frequency", wide:true }, { k:"rate", label:"Rate" },
      { k:"verified", label:"Last verified", type:"date" }, { k:"portalName", label:"Portal name" }, { k:"portalUrl", label:"Portal address", type:"url" },
      { k:"loginId", label:"Login ID or username" }, { k:"holder", label:"Login held by" }, { k:"backup", label:"Backup" }, { k:"mfa", label:"Second factor held by" },
      { k:"vault", label:"Where the password is stored", wide:true }, { k:"standing", label:"Standing", type:"standing" }, { k:"standingNote", label:"Standing detail" },
      { k:"notes", label:"Notes", type:"area", wide:true }
    ];
    var ENT_FIELDS = [
      { k:"legal", label:"Legal name" }, { k:"dba", label:"Doing business as" }, { k:"type", label:"Entity type" }, { k:"formed", label:"Formed in" },
      { k:"ein", label:"EIN or tax number" }, { k:"fiscal", label:"Fiscal year end" }, { k:"address", label:"Address", wide:true }, { k:"provider", label:"Payroll provider" },
      { k:"bank", label:"Payroll bank account" }, { k:"agent", label:"Registered agent" }, { k:"notes", label:"Notes", type:"area", wide:true }
    ];
    function control(f, val){
      var id = "rec-" + f.k, el;
      if(f.type === "area") el = h("textarea", { id:id, rows:"3" });
      else if(f.type === "standing") el = h("select", { id:id }, Object.keys(STANDING).map(function(k){ return h("option", { value:k, text:STANDING[k][0] }); }));
      else if(f.type === "entity") el = h("select", { id:id }, entities().map(function(e){ return h("option", { value:e.id, text:e.dba || e.legal }); }));
      else if(f.type === "jur") el = h("select", { id:id }, Object.keys(JUR).sort(function(a, b){ return JUR[a].name < JUR[b].name ? -1 : 1; }).map(function(k){ return h("option", { value:k, text:JUR[k].name }); }));
      else el = h("input", { id:id, type:f.type === "date" ? "date" : f.type === "url" ? "url" : "text", autocomplete:"off", placeholder:f.type === "url" ? "https://" : null });
      el.value = val == null ? "" : val;
      return el;
    }
    var CON_FIELDS = [
      { k:"role", label:"Role", wide:true }, { k:"name", label:"Name" }, { k:"org", label:"Company" }, { k:"phone", label:"Phone" }, { k:"email", label:"Email" }, { k:"notes", label:"When to call", type:"area", wide:true }
    ];
    function openEditor(kind, rec, isNew){
      var dlg = $("recdlg"), fields = kind === "acct" ? ACCT_FIELDS : kind === "con" ? CON_FIELDS : ENT_FIELDS, inputs = {};
      var locked = kind === "acct" && !rec.custom && !isNew;                              /* built-in accounts keep their jurisdiction */
      var title = isNew ? (kind === "acct" ? "Add an account" : kind === "con" ? "Add a contact" : "Add an entity") : kind === "acct" ? rec.name + ", " + JUR[rec.jur].name : kind === "con" ? rec.role : (rec.dba || rec.legal);
      var grid = h("div", { class:"recgrid" }, fields.map(function(f){
        if(f.k === "jur" && locked) return null;
        inputs[f.k] = control(f, rec[f.k]);
        return h("label", { class:"field" + (f.wide ? " wide" : ""), "for":"rec-" + f.k }, f.label, inputs[f.k]);
      }));
      function close(){ dlg.close(); }
      function save(e){
        e.preventDefault();
        var vals = {}, k;
        for(k in inputs) vals[k] = inputs[k].value.trim();
        if(vals.portalUrl && !safeUrl(vals.portalUrl)){ inputs.portalUrl.setCustomValidity("Use a full address that starts with https://"); inputs.portalUrl.reportValidity(); return; }
        if(kind === "acct"){
          if(isNew){ vals.key = "custom|" + Date.now(); vals.link = ""; store.custom.push(vals); }
          else if(rec.custom){ store.custom = store.custom.map(function(c){ if(c.key !== rec.key) return c; vals.key = c.key; vals.link = ""; return vals; }); }
          else {
            var d = baseRecord(defaults().filter(function(q){ return q.key === rec.key; })[0]), diff = {};
            for(k in vals) if(vals[k] !== (d[k] == null ? "" : String(d[k]))) diff[k] = vals[k];
            if(Object.keys(diff).length) store.acct[rec.key] = diff; else delete store.acct[rec.key];
          }
        } else {
          var list = (kind === "con" ? contacts() : entities()).map(function(x){ var c = {}, kk; for(kk in x) c[kk] = x[kk]; return c; });
          if(isNew){ vals.id = kind + "-" + Date.now(); list.push(vals); }
          else list = list.map(function(x){ if(x.id !== rec.id) return x; vals.id = x.id; return vals; });
          if(kind === "con") store.con = list; else store.ent = list;
        }
        var ok = persist(); close(); A.render();
        A.toast(ok ? "Saved to this browser" : "Saved for this visit only: this browser blocks storage");
      }
      function remove(){
        if(kind === "acct") store.custom = store.custom.filter(function(c){ return c.key !== rec.key; });
        else if(kind === "con") store.con = contacts().filter(function(x){ return x.id !== rec.id; });
        else store.ent = entities().filter(function(x){ return x.id !== rec.id; });
        persist(); close(); A.render(); A.toast("Removed");
      }
      var canRemove = !isNew && (kind === "acct" ? rec.custom : kind === "con" ? true : entities().length > 1);
      swap($("recbody"), [h("form", { class:"recform", onsubmit:save },
        h("h2", { text:title }),
        kind === "acct" ? h("p", { class:"recnote" }, h("b", { text:"No passwords here. " }), "Record who holds the login and where the password is stored, so nothing sensitive sits on this page.") : null,
        grid,
        h("div", { class:"recacts" },
          h("button", { class:"go", type:"submit" }, "Save"),
          h("button", { class:"btn", type:"button", onclick:close }, "Cancel"),
          kind === "acct" && !isNew && safeUrl(rec.portalUrl) ? h("a", { class:"btn", href:rec.portalUrl, target:"_blank", rel:"noopener noreferrer", text:"Open portal ↗" }) : null,
          kind === "acct" && !isNew ? h("button", { class:"btn", type:"button", onclick:function(){ close(); A.openDeadlines(rec.jur); } }, "View deadlines") : null,
          canRemove ? h("button", { class:"btn danger", type:"button", onclick:remove }, "Remove") : null))]);
      if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    }

    var ff = { level:"all", q:"", attn:false };
    function renderFile(){
      var ents = entities(), list = accounts();
      swap($("entgrid"), ents.map(function(e){
        var n = list.filter(function(a){ return a.entity === e.id; }).length;
        return h("article", { class:"entcard" },
          h("div", { class:"enthead" }, h("h3", { text:e.legal }), h("button", { class:"btn", type:"button", onclick:function(){ openEditor("ent", e); } }, "Edit")),
          e.dba ? h("p", { class:"entdba", text:"Doing business as " + e.dba }) : null,
          h("dl", { class:"entmeta" }, [["Type", e.type], ["Formed in", e.formed], ["EIN or tax number", e.ein], ["Fiscal year end", e.fiscal], ["Address", e.address], ["Payroll provider", e.provider], ["Payroll bank account", e.bank], ["Registered agent", e.agent]]
            .filter(function(r){ return r[1]; }).map(function(r){ return h("div", null, h("dt", { text:r[0] }), h("dd", { text:r[1] })); })),
          e.notes ? h("p", { class:"entnote", text:e.notes }) : null,
          h("p", { class:"entcount", text:plural(n, "tax account", "tax accounts") + " on file" }));
      }));
      swap($("contactrows"), contacts().map(function(c){
        return h("tr", null, h("th", { scope:"row", text:c.role }), h("td", null, c.name, c.org ? h("small", { text:c.org }) : null),
          h("td", null, c.phone || "Not recorded", c.email ? h("small", { text:c.email }) : null), td(c.notes),
          h("td", null, h("button", { class:"btn sm", type:"button", "aria-label":"Edit " + c.role, onclick:function(){ openEditor("con", c); } }, "Edit")));
      }));
      var attn = list.filter(function(a){ return a.standing !== "ok"; }), cutoff = P.iso(P.addDays(TODAY, -90));
      var fresh = list.filter(function(a){ return a.verified && a.verified >= cutoff; }).length, backed = list.filter(function(a){ return a.holder && a.backup; }).length;
      swap($("filetiles"), [
        tile("Tax accounts on file", num(list.length), "Across " + plural(ents.length, "entity", "entities")),
        tile("Need attention", String(attn.length), attn.length ? "Open notices, plans or pending requests" : "Every account in good standing", attn.length > 0),
        tile("Verified in the last 90 days", fresh + " of " + list.length, "Logged in and status confirmed"),
        tile("Logins with a named backup", backed + " of " + list.length, "No account depends on one person")
      ]);
      var counts = { all:0, federal:0, state:0, local:0, global:0 };
      function hit(a, skipLevel){
        var lv = JUR[a.jur] ? JUR[a.jur].level : "federal";
        if(!skipLevel && ff.level !== "all" && lv !== ff.level) return false;
        if(ff.attn && a.standing === "ok") return false;
        if(ff.q){
          var hay = [a.name, JUR[a.jur] ? JUR[a.jur].name : "", a.forms, a.acctId, a.portalName, a.holder, a.backup, a.freq, a.rate, a.notes, entityName(a.entity)].join(" ").toLowerCase(), w = ff.q.toLowerCase().split(/\s+/), i;
          for(i = 0; i < w.length; i++) if(w[i] && hay.indexOf(w[i]) < 0) return false;
        }
        return true;
      }
      list.forEach(function(a){ if(hit(a, true)){ counts.all++; counts[JUR[a.jur] ? JUR[a.jur].level : "federal"]++; } });
      swap($("filelevels"), [["all","All levels"]].concat(P.LEVELS).map(function(o){
        return h("button", { class:"lvl lvl-" + o[0], type:"button", "aria-pressed":ff.level === o[0] ? "true" : "false", onclick:function(){ ff.level = o[0]; renderFile(); } },
          h("span", { class:"dot" }), o[1], h("span", { class:"c", text:num(counts[o[0]]) }));
      }));
      $("fileattn").checked = ff.attn;
      if($("filesearch").value !== ff.q) $("filesearch").value = ff.q;
      var shown = list.filter(function(a){ return hit(a); });
      $("filecount").textContent = plural(shown.length, "account", "accounts") + " shown" + (hasEdits() ? " · includes your saved edits" : "");
      $("filerestore").hidden = !hasEdits();
      var order = { federal:0, state:1, local:2, global:3 };
      shown.sort(function(a, b){
        var ja = JUR[a.jur], jb = JUR[b.jur];
        return order[ja.level] - order[jb.level] || (ja.name < jb.name ? -1 : ja.name > jb.name ? 1 : 0) || ((a.idx == null ? 1e6 : a.idx) - (b.idx == null ? 1e6 : b.idx));
      });
      swap($("filerows"), shown.length ? shown.map(function(a){
        var J = JUR[a.jur], st = STANDING[a.standing] || STANDING.ok, link = portalLink(a);
        return h("tr", { class:a.standing !== "ok" ? "hl" : null },
          h("th", { scope:"row" }, h("span", { class:"lv lv-" + J.level, text:LEVELNAME[J.level] }), h("span", { class:"jn2", text:J.name }), J.office ? h("span", { class:"pill soon sm", text:"Office" }) : null),
          h("td", null, h("b", { text:a.name }), a.forms ? h("small", { text:a.forms }) : null, h("small", { text:entityName(a.entity) })),
          td(a.acctId, "mono"),
          h("td", null, a.freq, a.rate ? h("small", { text:a.rate }) : null),
          h("td", null, link || "Not recorded"),
          h("td", null, a.holder || "Not recorded", a.backup ? h("small", { text:"Backup: " + a.backup }) : h("small", { class:"warnc", text:"No backup named" })),
          td(a.verified ? P.fmtMDY(new Date(a.verified + "T00:00:00Z")) : "Not recorded"),
          h("td", null, pill(st[0], st[1]), a.standingNote ? h("small", { text:a.standingNote }) : null),
          h("td", null, h("button", { class:"btn sm", type:"button", "aria-label":"Open " + a.name + ", " + J.name, onclick:function(){ openEditor("acct", a); } }, "Open")));
      }) : [h("tr", null, h("td", { colspan:"9", class:"none", text:"No accounts match. Clear the search or the filters." }))]);
    }
    function exportAccounts(){
      function q(s){ return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; }
      var cols = [["Level"],["Jurisdiction"],["name","Account"],["Entity"],["acctId","Account ID"],["forms","Forms filed"],["freq","Frequency"],["rate","Rate"],["portalName","Portal"],["portalUrl","Portal address"],
        ["loginId","Login ID"],["holder","Login held by"],["backup","Backup"],["mfa","Second factor held by"],["vault","Password stored in"],["verified","Last verified"],["Standing"],["standingNote","Standing detail"],["notes","Notes"]];
      var out = [cols.map(function(c){ return q(c[1] || c[0]); }).join(",")];
      accounts().forEach(function(a){
        var J = JUR[a.jur];
        out.push(cols.map(function(c){
          return q(c[0] === "Level" ? LEVELNAME[J.level] : c[0] === "Jurisdiction" ? J.name : c[0] === "Entity" ? entityName(a.entity) : c[0] === "Standing" ? (STANDING[a.standing] || STANDING.ok)[0] : a[c[0]]);
        }).join(","));
      });
      A.download("payroll-company-file.csv", "text/csv", out.join("\r\n"));
    }
    function wireFile(){
      $("fileattn").addEventListener("change", function(){ ff.attn = this.checked; renderFile(); });
      var t = null;
      $("filesearch").addEventListener("input", function(){ var v = this.value; clearTimeout(t); t = setTimeout(function(){ ff.q = v.trim(); renderFile(); }, 140); });
      $("fileadd").addEventListener("click", function(){ openEditor("acct", { jur:"US", entity:"us", standing:"ok", custom:true, verified:P.iso(TODAY) }, true); });
      $("entadd").addEventListener("click", function(){ openEditor("ent", {}, true); });
      $("conadd").addEventListener("click", function(){ openEditor("con", {}, true); });
      $("filecsv").addEventListener("click", exportAccounts);
      $("filebackup").addEventListener("click", function(){ A.download("payroll-company-file-backup.json", "application/json", JSON.stringify({ app:"Payroll Control Monitor", saved:P.iso(TODAY), data:store }, null, 2)); });
      $("fileimport").addEventListener("click", function(){ $("filepick").click(); });
      $("filepick").addEventListener("change", function(){
        var f = this.files && this.files[0], self = this; if(!f) return;
        var rd = new FileReader();
        rd.onload = function(){
          try{
            var d = JSON.parse(String(rd.result)).data;
            if(!d || typeof d !== "object") throw new Error("shape");
            store = { acct:d.acct && typeof d.acct === "object" ? d.acct : {}, custom:Array.isArray(d.custom) ? d.custom : [], ent:Array.isArray(d.ent) ? d.ent : null, con:Array.isArray(d.con) ? d.con : null };
            persist(); A.render(); A.toast("Backup restored");
          }catch(e){ A.toast("That file is not a Company file backup"); }
          self.value = "";
        };
        rd.readAsText(f);
      });
      $("filerestore").addEventListener("click", function(){
        store = { acct:{}, custom:[], ent:null, con:null };
        try{ window.localStorage.removeItem(STORE_KEY); }catch(e){}
        A.render(); A.toast("Sample data restored");
      });
      $("recclose").addEventListener("click", function(){ $("recdlg").close(); });
    }

    /* =====================================================================
       NOTICES
       ===================================================================== */
    function noticeList(){
      var s = A.state().steps.notice, out = [];
      if(s !== null){
        var due = P.prevBiz(P.addDays(TODAY, 10));
        out.push({ recv:TODAY, agency:"IRS", what:"Notice about a federal tax deposit", amt:1830.40, owner:s >= 2 ? "Head of HR and Payroll" : "Not assigned yet", due:due, open:s < 3, closed:s === 3 ? TODAY : null, flag:s < 3,
          status:["Received, not yet logged", "Logged with its scan; needs an owner", "Owner assigned; response due " + P.fmtShort(due), "Response sent, proof of mailing saved"][s] });
      }
      return out.concat([
        { recv:ago(12), agency:"Pennsylvania Department of Revenue", what:"Withholding underpayment, second quarter of 2025", amt:4318.22, owner:"Head of HR and Payroll", due:ahead(18), open:true, status:"Abatement request filed; tracked in Clean-up" },
        { recv:ago(6), agency:"Georgia Department of Labor", what:"Wage report does not match tax paid, third quarter", amt:1240.18, owner:"Payroll Manager", due:ahead(24), open:true, status:"Response drafted, in second review" },
        { recv:ago(21), agency:"Texas Office of the Attorney General", what:"Income withholding order for child support, new hire", amt:null, owner:"Payroll Manager", closed:ago(19), status:"Set up in payroll before the next run" },
        { recv:ago(33), agency:"Massachusetts Department of Unemployment Assistance", what:"Unemployment rate recalculated after late wage reports", amt:null, owner:"Head of HR and Payroll", closed:ago(26), status:"Rate protest filed; tracked in Clean-up" },
        { recv:ago(47), agency:"California Employment Development Department", what:"Late filing penalty, fourth quarter of 2025", amt:10484, owner:"Head of HR and Payroll", closed:ago(41), status:"Paid; penalty waiver requested" },
        { recv:ago(58), agency:"Arizona Department of Economic Security", what:"Wage verification for a former employee's claim", amt:null, owner:"HR Generalist", closed:ago(55), status:"Answered" },
        { recv:ago(72), agency:"Virginia Department of Social Services", what:"Child support order amended", amt:null, owner:"Payroll Manager", closed:ago(70), status:"Updated in payroll before the next run" }
      ]);
    }
    function renderNotices(){
      var list = noticeList(), open = list.filter(function(n){ return n.open; }), closed = list.filter(function(n){ return !n.open; });
      var dollars = 0; open.forEach(function(n){ dollars += n.amt || 0; });
      var avg = closed.length ? Math.round(closed.reduce(function(t, n){ return t + days(n.recv, n.closed); }, 0) / closed.length) : 0;
      var flag = open.some(function(n){ return n.flag; });
      swap($("noticetiles"), [
        tile("Open notices", String(open.length), flag ? "1 just arrived and needs logging" : "Each one has an owner and a date", flag),
        tile("Past due", "0", "Nothing has missed its response date"),
        tile("Dollars in open notices", money(dollars, true), "Assessed or proposed, not yet resolved"),
        tile("Average days to close", String(avg), "Across the last " + closed.length + " closed")
      ]);
      swap($("noticerows"), list.map(function(n){
        return h("tr", { class:n.flag ? "hl" : null },
          td(P.fmtMDY(n.recv)), h("th", { scope:"row", text:n.agency }), td(n.what), td(n.amt == null ? "" : money(n.amt, true), "num"), td(n.owner),
          td(n.open ? "Due " + P.fmtShort(n.due) : "Closed " + P.fmtMD(n.closed)), td(n.open ? plural(days(n.recv, TODAY), "day", "days") + " open" : "Closed in " + plural(Math.max(1, days(n.recv, n.closed)), "day", "days")),
          h("td", null, pill(n.open ? (n.flag ? "Needs action" : "Open") : "Closed", n.open ? (n.flag ? "warn" : "soon") : "ok"), h("small", { text:n.status })));
      }));
    }

    /* =====================================================================
       CLEAN-UP AND RECOVERY
       ===================================================================== */
    function cleanupList(){
      return [
        { agency:"IRS", period:"Fourth quarter 2025", issue:"Failure-to-deposit penalty", assessed:38420, paid:38420, asked:38420, got:0, st:"pending", next:"First-time abatement requested. IRS reply expected", when:ahead(35), owner:"Head of HR and Payroll" },
        { agency:"IRS", period:"First quarter 2026", issue:"Failure-to-deposit penalty and interest", assessed:21906.40, paid:21906.40, asked:20180, got:0, st:"pending", next:"Reasonable-cause request being written with the outside CPA", when:ahead(12), owner:"Head of HR and Payroll" },
        { agency:"IRS", period:"Third quarter 2025", issue:"Form 941-X filed to correct reported wages", assessed:0, paid:0, asked:6112, got:0, st:"pending", next:"Amended return in processing; refund expected", when:ahead(60), owner:"Payroll Manager" },
        { agency:"California Employment Development Department", period:"Fourth quarter 2025", issue:"Late filing penalty and interest", assessed:10484, paid:10484, asked:9870, got:0, st:"pending", next:"Penalty waiver request filed", when:ahead(28), owner:"Head of HR and Payroll" },
        { agency:"Illinois Department of Revenue", period:"Calendar year 2025", issue:"Withholding balance on a 12-month payment plan", assessed:18400, paid:9200, asked:0, got:0, st:"open", next:"Payment 7 of 12 due", when:ahead(9), owner:"Controller" },
        { agency:"City of Cincinnati", period:"Calendar year 2025", issue:"Unregistered work location; back returns filed", assessed:9154, paid:7960, asked:1194, got:0, st:"pending", next:"Penalty abatement requested with the back returns", when:ahead(21), owner:"Payroll Manager" },
        { agency:"Pennsylvania Department of Revenue", period:"Second quarter 2025", issue:"Withholding underpayment", assessed:4318.22, paid:0, asked:612.40, got:0, st:"open", next:"Notice response due", when:ahead(18), owner:"Head of HR and Payroll" },
        { agency:"Massachusetts Department of Unemployment Assistance", period:"2026 rate year", issue:"Unemployment rate raised after late wage reports", assessed:0, paid:0, asked:11300, got:0, st:"pending", next:"Rate protest filed; decision pending", when:ahead(45), owner:"Head of HR and Payroll" },
        { agency:"Georgia Department of Labor", period:"Third quarter 2026", issue:"Wage report does not match tax paid", assessed:1240.18, paid:0, asked:1240.18, got:0, st:"open", next:"Notice response due", when:ahead(24), owner:"Payroll Manager" },
        { agency:"New York State Department of Taxation and Finance", period:"First quarter 2026", issue:"Late payment penalty", assessed:4205, paid:4205, asked:4205, got:4205, st:"closed", next:"Abated in full; refund received", when:ago(16), owner:"Head of HR and Payroll" },
        { agency:"Texas Workforce Commission", period:"Third quarter 2025", issue:"Late wage report penalty", assessed:1150, paid:1150, asked:0, got:0, st:"closed", next:"Paid; no relief available", when:ago(40), owner:"Payroll Manager" }
      ];
    }
    function renderCleanup(){
      var list = cleanupList(), assessed = 0, paid = 0, asked = 0, got = 0, open = 0;
      list.forEach(function(c){ assessed += c.assessed; paid += c.paid; got += c.got; if(c.st !== "closed"){ asked += c.asked; open++; } });
      swap($("cleantiles"), [
        tile("Open items", String(open), plural(list.length - open, "item", "items") + " already closed", open > 0),
        tile("Assessed in tax, penalties and interest", money(assessed), money(paid) + " paid so far"),
        tile("Relief requested, pending", money(asked), "Requested, not promised"),
        tile("Recovered so far", money(got), "Abated or refunded")
      ]);
      var ST = { open:["Open", "warn"], pending:["Request pending", "soon"], closed:["Closed", "ok"] };
      swap($("cleanrows"), list.map(function(c){
        return h("tr", { class:c.st === "open" ? "hl" : null },
          h("th", { scope:"row" }, c.agency, h("small", { text:c.period })), td(c.issue),
          td(c.assessed ? money(c.assessed, true) : "", "num"), td(c.paid ? money(c.paid, true) : "", "num"), td(c.asked ? money(c.asked, true) : "", "num"), td(c.got ? money(c.got, true) : "", "num"),
          h("td", null, pill(ST[c.st][0], ST[c.st][1])),
          h("td", null, c.next + (c.st === "closed" ? "" : " by " + P.fmtShort(c.when)) + ".", h("small", { text:"Owner: " + c.owner })));
      }));
    }

    /* ----- one-time wiring ----- */
    $("tqcur").addEventListener("click", function(){ tq = "cur"; renderTie(); });
    $("tqprev").addEventListener("click", function(){ tq = "prev"; renderTie(); });
    wireFile();

    return {
      render:[renderRuns, renderTie, renderFile, renderNotices, renderCleanup],
      reset:function(){ tq = "cur"; ff = { level:"all", q:"", attn:false }; if($("recdlg").open) $("recdlg").close(); },
      portalFor:portalFor
    };
  };
})();
