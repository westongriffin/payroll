/* Payroll Control Monitor: interface. Sample data only. */
(function(){
  "use strict";
  var P = window.PCM, TODAY = P.TODAY, DAY = P.DAY, JUR = P.JUR;

  /* ---------- Small DOM helper ---------- */
  function h(tag, attrs){
    var el = document.createElement(tag), k, i, c;
    for(k in (attrs || {})){
      var v = attrs[k];
      if(v == null || v === false) continue;
      if(k === "class") el.className = v;
      else if(k === "text") el.textContent = v;
      else if(k.indexOf("on") === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for(i = 2; i < arguments.length; i++){
      c = arguments[i];
      (Array.isArray(c) ? c : [c]).forEach(function(x){
        if(x == null || x === false) return;
        el.appendChild(typeof x === "string" ? document.createTextNode(x) : x);
      });
    }
    return el;
  }
  var $ = function(id){ return document.getElementById(id); };
  function swap(node, children){ node.textContent = ""; children.forEach(function(c){ if(c) node.appendChild(c); }); }
  function num(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function plural(n, one, many){ return num(n) + " " + (n === 1 ? one : many); }
  var reduce = false, narrowMQ = null;
  try{ reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; narrowMQ = window.matchMedia("(max-width: 999px)"); }catch(e){}
  function narrow(){ return !!(narrowMQ && narrowMQ.matches); }

  var LEVELNAME = {}; P.LEVELS.forEach(function(l){ LEVELNAME[l[0]] = l[1]; });
  var CATNAME = {}; P.CATS.forEach(function(c){ CATNAME[c[0]] = c[1]; });
  var EVIDENCE = {
    deposit:["Payment confirmation","Register total matched","Reviewer sign-off"],
    "return":["Filed copy","Agency acceptance","Tie-out to the payroll register"],
    yearend:["Filed copy","Agency acceptance","Reconciliation to the quarterly returns"],
    benefits:["Filed copy or notice","Proof of delivery"],
    report:["Submitted report","Confirmation"],
    notice:["Notice or intake record","Owner and due date","Proof of completion"]
  };

  /* ---------- Scenario dates (always relative to today) ---------- */
  var NEXT_FRI = TODAY; while(P.dow(NEXT_FRI) !== 5) NEXT_FRI = P.addDays(NEXT_FRI, 1);
  var NEXT_PAY = P.prevBiz(NEXT_FRI);
  var DEP_DUE = P.nextBiz(P.addDays(NEXT_PAY, 1));
  var PLACE_START = P.addDays(TODAY, 1); while(P.dow(PLACE_START) !== 1) PLACE_START = P.addDays(PLACE_START, 1);
  var FIRST_CHECK = P.prevBiz(P.addDays(PLACE_START, 11));

  /* ---------- Controls content (sample data) ---------- */
  var CONTROLS = [
    { id:"deposits", name:"Federal tax deposits", owner:"Payroll", cadence:"Every payroll run", ok:"Confirmed",
      risk:"A payroll run that accumulates $100,000 or more in tax is due the next business day. Late deposits cost 2% to 15%.",
      control:"Every deposit is matched to the payroll register and its confirmation saved, whether the company remits or a provider does.",
      evidence:["Payroll register total","Deposit confirmation","Reviewer sign-off"],
      ref:{ label:"IRS Topic 757, deposit schedules", url:"https://www.irs.gov/taxtopics/tc757" } },
    { id:"accounts", name:"State and local tax accounts", owner:"Payroll", cadence:"Every new state or city", ok:"Verified",
      risk:"A placement starts in a state or city where the company has no withholding or unemployment account.",
      control:"Every new work location is flagged at intake and its tax accounts are verified before the first paycheck. One register holds every account, ID, rate and filing frequency, and each verified account adds its deadlines to the calendar.",
      evidence:["Account register","Registration confirmations","Rate notices"] },
    { id:"notices", name:"Agency notices and garnishments", owner:"Head of HR and Payroll", cadence:"Daily", ok:"On track",
      risk:"A notice sits in one inbox. The IRS penalty rises to 15% when a deposit is still unpaid more than 10 days after the first notice.",
      control:"One shared log. Every notice gets an owner and a due date within one business day, and the due date goes on the calendar.",
      evidence:["Notice scan","Owner and due date","Response and proof of mailing"],
      ref:{ label:"IRS Failure to Deposit Penalty", url:"https://www.irs.gov/payments/failure-to-deposit-penalty" } },
    { id:"overtime", name:"Overtime and the regular rate", owner:"Payroll and HR", cadence:"Quarterly audit", ok:"Passed", metric:"Audit by pay code",
      risk:"Shift differentials, bonuses or multiple rates are left out of the regular rate, so overtime is underpaid. 2026 W-2s must also report the overtime premium in Box 12, code TT.",
      control:"Regular-rate audit by pay code. A separate earnings code for the premium, reconciled before W-2s go out.",
      evidence:["Pay code audit","Premium earnings code report","W-2 reconciliation"] },
    { id:"classification", name:"Worker classification", owner:"HR", cadence:"At onboarding, then yearly", ok:"Current", metric:"Checked at onboarding",
      risk:"Exempt or contractor status is set wrong at intake and repeated across placements.",
      control:"Classification check at onboarding and a yearly audit.",
      evidence:["Onboarding checklist","Yearly audit results"] },
    { id:"staterules", name:"State wage and hour rules", owner:"HR", cadence:"Reviewed quarterly", ok:"Current", metric:"Rules matrix for 50 states",
      risk:"Sick-leave accrual, pay frequency and final-pay deadlines differ by state.",
      control:"A state rules matrix built into the system, and a termination checklist that carries the final-pay deadline.",
      evidence:["State rules matrix","Termination checklists"] },
    { id:"yearend", name:"Year-end", owner:"Payroll and Finance", cadence:"Quarterly tie-out", ok:"On track", metric:"Third-quarter tie-out complete",
      risk:"W-2s, Form 940 and state reconciliations do not tie to the quarterly returns. California wages carry a 1.5% FUTA credit reduction for 2026.",
      control:"Quarterly tie-out of register, returns and general ledger, so year-end is a check and not a clean-up.",
      evidence:["Quarterly tie-out","Filed returns","General ledger extract"],
      ref:{ label:"PayrollOrg, 2026 FUTA credit reduction", url:"https://payroll.org/news-resources/news/news-detail/2026/11/13/california-faces-futa-credit-reduction-for-2026" } },
    { id:"international", name:"International payroll", owner:"Payroll", cadence:"Monthly", ok:"Confirmed", metric:"9 of 9 countries confirmed",
      risk:"Local vendors file and pay in each country and nobody confirms it.",
      control:"One calendar of statutory deadlines by country, with vendor confirmations collected monthly.",
      evidence:["Statutory deadline calendar","Vendor confirmations"] },
    { id:"coverage", name:"Review and backup", owner:"Head of HR and Payroll", cadence:"Every payroll run", ok:"Signed off", metric:"Second review on every run",
      risk:"One person holds the knowledge and the logins, so a miss goes unseen.",
      control:"Written procedures, a trained backup, and second-person review of every run.",
      evidence:["Written procedures","Backup training record","Review sign-offs"] }
  ];

  var SCENARIOS = {
    location: { control:"accounts", button:"A placement opens in a new city", flag:"Setup needed",
      title:"New work location: Columbus, OH",
      why:"A placement starts " + P.fmtShort(PLACE_START) + ". No city tax account is on file yet, and the first paycheck is " + P.fmtShort(FIRST_CHECK) + ".",
      trigger:"New work location detected: Columbus, OH",
      steps:[
        { act:"Flag the placement", done:"Placement flagged at intake", note:"Tax setup is due before the first paycheck.", log:"Columbus placement flagged: tax setup due before first paycheck" },
        { act:"Register the accounts", done:"State and city accounts registered", note:"Ohio withholding, unemployment and Columbus city tax.", log:"Ohio and Columbus tax accounts registered" },
        { act:"Request second-person review", done:"Second-person review complete", note:"IDs, rates and filing frequency added to the account register.", log:"Second reviewer verified the Columbus account setup" }
      ],
      resolved:"Verified before the first paycheck" },
    deposit: { control:"deposits", button:"A payroll run crosses $100,000 in tax", flag:"Due " + P.fmtShort(DEP_DUE),
      title:"The " + P.fmtShort(NEXT_PAY) + " payroll run crosses $100,000 in tax",
      why:"This run accumulated $118,400 in federal tax. At $100,000 or more, the deposit is due the next business day: " + P.fmtShort(DEP_DUE) + ".",
      trigger:P.fmtShort(NEXT_PAY) + " payroll run posted: $118,400 in federal tax",
      steps:[
        { act:"Schedule the deposit", done:"Deposit scheduled for " + P.fmtShort(DEP_DUE), note:"The next business day after the run.", log:"Federal deposit scheduled for " + P.fmtShort(DEP_DUE) + ", the next business day" },
        { act:"Match the confirmation", done:"Confirmation matched to the payroll register", note:"Register total and deposit agree, with $0 variance.", log:"Deposit confirmation matched to the register: $0 variance" },
        { act:"Request second-person review", done:"Second-person review complete", note:"Confirmation saved with the run.", log:"Second reviewer signed off on the federal deposit" }
      ],
      resolved:"Deposited on time, with the evidence saved" },
    notice: { control:"notices", button:"An IRS notice arrives", flag:"Response due",
      title:"An IRS notice arrives in the mail",
      why:"It concerns a federal tax deposit. If a deposit is still unpaid more than 10 days after the first notice, the penalty rises to 15%.",
      trigger:"IRS notice received in the mail",
      steps:[
        { act:"Log the notice", done:"Logged the day it arrived", note:"Scan attached to the shared notice log.", log:"IRS notice logged with its scan attached" },
        { act:"Assign an owner and a due date", done:"Owner and due date assigned", note:"Assigned within one business day. The due date is on the calendar.", log:"Notice assigned: owner and response date set" },
        { act:"Send the response", done:"Response sent", note:"Proof of mailing and a copy saved to the log.", log:"Notice response sent, proof of mailing saved" }
      ],
      resolved:"Closed inside the 10-day window" }
  };
  var ORDER = ["location","deposit","notice"];

  /* ---------- State ---------- */
  var state, cache = null;
  var ui;
  function freshUI(){
    return { level:"all", jur:"", cat:"", range:"next30", q:"", layout:"list", month:{ y:TODAY.getUTCFullYear(), m:TODAY.getUTCMonth() + 1 }, day:P.iso(TODAY), sel:null, showAll:false };
  }
  ui = freshUI();
  function fresh(){
    return {
      selected:"accounts",
      steps:{ location:0, deposit:null, notice:null },   /* null = not started, 0 to 2 = in progress, 3 = resolved */
      filed:{},
      log:[
        { text:SCENARIOS.location.trigger, when:"This morning" },
        { text:"Thursday payroll run second-reviewed and signed off", when:"Yesterday" },
        { text:"Third-quarter Form 941 tied to the payroll register: $0 variance", when:"Last week" },
        { text:"Vendor confirmations collected for 9 of 9 countries", when:"Last week" }
      ]
    };
  }
  function busy(k){ var s = state.steps[k]; return s !== null && s < 3; }
  function resolved(k){ return state.steps[k] === 3; }
  function flagged(){ return ORDER.filter(busy); }
  function scenarioFor(controlId){
    return ORDER.filter(function(k){ return SCENARIOS[k].control === controlId && state.steps[k] !== null; })[0] || null;
  }
  function addLog(text){ state.log.unshift({ text:text, when:"Just now", fresh:true }); state.log = state.log.slice(0, 7); }
  function say(text){ $("live").textContent = text; }
  var toastTimer = null;
  function toast(text){
    var t = $("toast"); t.textContent = text; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 2600);
  }

  /* ---------- The live calendar: computed rules plus whatever the scenarios add ---------- */
  function clone(o){ var c = {}, k; for(k in o) c[k] = o[k]; return c; }
  function items(){
    if(cache) return cache;
    var out = P.ITEMS.map(function(it){
      if(it.payday && P.same(it.payday, NEXT_PAY) && state.steps.deposit !== null){
        var c = clone(it);
        c.date = DEP_DUE; c.nominal = DEP_DUE; c.moved = false;
        c.title = "Federal tax deposit: $100,000 next-day rule";
        c.note = "This run accumulated $118,400 in federal tax, so the deposit moved up from the semiweekly date (" + P.fmtShort(it.date) + ") to the next business day.";
        if(busy("deposit")) c.flag = "Due " + P.fmtShort(DEP_DUE); else c.closed = "Deposited on time";
        return c;
      }
      return it;
    });
    if(state.steps.location !== null){
      out.push({ id:"L-COL|setup", jur:"L-COL", level:"local", jurName:"Columbus, OH", title:"New work location: tax accounts verified before the first paycheck",
        date:FIRST_CHECK, nominal:FIRST_CHECK, moved:false, cat:"notice", form:"Ohio and Columbus employer registrations", agency:JUR["L-COL"].agency,
        period:"Placement starting " + P.fmtShort(PLACE_START), owner:"Payroll", url:"", note:"",
        rule:"Every new work location is flagged at intake. Its state and city tax accounts are verified before the first paycheck, and its deadlines are then added to this calendar.",
        flag:busy("location") ? "Setup needed" : null, closed:resolved("location") ? "Verified" : null });
      if(resolved("location")) out = out.concat(P.COLUMBUS);
    }
    if(state.steps.notice !== null){
      var nd = P.prevBiz(P.addDays(TODAY, 10));
      out.push({ id:"US|notice", jur:"US", level:"federal", jurName:JUR.US.name, title:"IRS notice: response due inside the 10-day window",
        date:nd, nominal:nd, moved:false, cat:"notice", form:"Notice response with proof of mailing", agency:"IRS", period:"Notice received " + P.fmtShort(TODAY),
        owner:"Head of HR and Payroll", note:"", url:"https://www.irs.gov/payments/failure-to-deposit-penalty", urlLabel:"IRS Failure to Deposit Penalty",
        rule:"If a deposit is still unpaid more than 10 days after the first notice, the penalty rises to 15%. The response date is set the day the notice is logged.",
        flag:busy("notice") ? "Response due" : null, closed:resolved("notice") ? "Closed" : null });
    }
    out.sort(P.byDate);
    var byId = {}; out.forEach(function(it){ byId[it.id] = it; });
    cache = out; cache.byId = byId;
    return cache;
  }
  function daysOut(it){ return Math.round((it.date - TODAY) / DAY); }
  function isDeadline(it){ return it.cat !== "processing"; }
  function statusOf(it){
    if(it.cat === "processing") return { t:"Calendar note", c:"info" };
    if(it.flag) return { t:it.flag, c:"warn" };
    if(it.closed) return { t:it.closed, c:"ok" };
    if(state.filed[it.id]) return { t:"Filed early", c:"ok" };
    var n = daysOut(it);
    if(n < 0) return { t:"Filed", c:"ok" };
    if(n === 0) return { t:"Due today", c:"warn" };
    if(n <= 7) return { t:"Due in " + n + (n === 1 ? " day" : " days"), c:"soon" };
    return { t:"Scheduled", c:"plain" };
  }

  /* ---------- Filters ---------- */
  var RANGES = [
    ["next30","Next 30 days"], ["next90","Next 90 days"], ["year","Rest of " + TODAY.getUTCFullYear()], ["nextyear","All of " + (TODAY.getUTCFullYear() + 1)],
    ["past","Filed in the last 45 days"], ["all","Everything tracked"]
  ];
  function inRange(it){
    var d = it.date, r = ui.range, y = TODAY.getUTCFullYear();
    if(r === "next30") return d >= TODAY && d <= P.addDays(TODAY, 30);
    if(r === "next90") return d >= TODAY && d <= P.addDays(TODAY, 90);
    if(r === "year") return d >= TODAY && d.getUTCFullYear() === y;
    if(r === "nextyear") return d.getUTCFullYear() === y + 1;
    if(r === "past") return d < TODAY;
    return true;
  }
  function matches(it, skipLevel, skipRange){
    if(!skipLevel && ui.level !== "all" && it.level !== ui.level) return false;
    if(ui.jur && it.jur !== ui.jur) return false;
    if(ui.cat && it.cat !== ui.cat) return false;
    if(!skipRange && !inRange(it)) return false;
    if(ui.q){
      var hay = (it.title + " " + it.form + " " + it.agency + " " + it.jurName + " " + it.period + " " + LEVELNAME[it.level]).toLowerCase();
      var words = ui.q.toLowerCase().split(/\s+/), i;
      for(i = 0; i < words.length; i++){ if(words[i] && hay.indexOf(words[i]) < 0) return false; }
    }
    return true;
  }
  function visible(){
    if(ui.layout === "month"){
      return items().filter(function(it){ return matches(it, false, true) && it.date.getUTCFullYear() === ui.month.y && it.date.getUTCMonth() + 1 === ui.month.m; });
    }
    return items().filter(function(it){ return matches(it); });
  }

  /* ---------- Deadlines: tiles, toolbar, list, month, detail ---------- */
  function renderDTiles(){
    var all = items().filter(isDeadline), n7 = 0, n30 = 0, n365 = 0, past = 0, by7 = { federal:0, state:0, local:0, global:0 };
    all.forEach(function(it){
      var n = daysOut(it);
      if(n < 0){ past++; return; }
      if(n <= 7){ n7++; by7[it.level]++; }
      if(n <= 30) n30++;
      if(n <= 365) n365++;
    });
    var f = flagged().length;
    var counts = { state:0, local:0, global:0 };
    Object.keys(JUR).forEach(function(k){ var j = JUR[k]; if(j.level !== "federal" && !(j.pending && !resolved("location"))) counts[j.level]++; });
    var tiles = [
      { label:"Due in the next 7 days", value:num(n7), note:by7.federal + " federal, " + by7.state + " state, " + by7.local + " local, " + by7.global + " global" },
      { label:"Due in the next 30 days", value:num(n30), note:f ? plural(f, "item needs", "items need") + " attention" : "Each one has an owner", warn:f > 0 },
      { label:"Past due", value:"0", note:num(past) + " filed on time in the last 45 days" },
      { label:"Tracked over the next 12 months", value:num(n365), note:"Federal, " + counts.state + " states, " + counts.local + " localities, " + counts.global + " countries" }
    ];
    swap($("dtiles"), tiles.map(function(t){
      return h("div", { class:"tile" + (t.warn ? " warn" : "") },
        h("div", { class:"label", text:t.label }), h("div", { class:"value", text:t.value }), h("div", { class:"note", text:t.note }));
    }));
  }

  function renderLevels(){
    var mon = ui.layout === "month";
    var base = items().filter(function(it){
      return matches(it, true, mon) && (!mon || (it.date.getUTCFullYear() === ui.month.y && it.date.getUTCMonth() + 1 === ui.month.m));
    });
    var counts = { all:base.length, federal:0, state:0, local:0, global:0 };
    base.forEach(function(it){ counts[it.level]++; });
    var opts = [["all","All levels"]].concat(P.LEVELS);
    swap($("levels"), opts.map(function(o){
      return h("button", { class:"lvl lvl-" + o[0], type:"button", "aria-pressed":ui.level === o[0] ? "true" : "false",
          onclick:function(){ ui.level = o[0]; ui.showAll = false; renderDeadlines(); } },
        h("span", { class:"dot" }), o[1], h("span", { class:"c", text:num(counts[o[0]]) }));
    }));
  }

  function buildSelects(){
    var fj = $("fJur");
    swap(fj, [h("option", { value:"", text:"All jurisdictions" })]);
    P.LEVELS.forEach(function(l){
      var codes = Object.keys(JUR).filter(function(k){ return JUR[k].level === l[0]; });
      if(l[0] !== "federal") codes.sort(function(a, b){ return JUR[a].name < JUR[b].name ? -1 : 1; });
      fj.appendChild(h("optgroup", { label:l[0] === "state" ? "States and DC" : l[0] === "global" ? "Countries" : l[1] },
        codes.map(function(k){ return h("option", { value:k, text:JUR[k].name }); })));
    });
    swap($("fCat"), [h("option", { value:"", text:"All types" })].concat(P.CATS.map(function(c){ return h("option", { value:c[0], text:c[1] }); })));
    swap($("fRange"), RANGES.map(function(r){ return h("option", { value:r[0], text:r[1] }); }));
  }
  function syncControls(){
    $("fJur").value = ui.jur; $("fCat").value = ui.cat; $("fRange").value = ui.range; $("fRange").disabled = ui.layout === "month";
    if($("fSearch").value !== ui.q) $("fSearch").value = ui.q;
    $("layList").setAttribute("aria-pressed", ui.layout === "list" ? "true" : "false");
    $("layMonth").setAttribute("aria-pressed", ui.layout === "month" ? "true" : "false");
  }

  function row(it, first){
    var st = statusOf(it);
    var sub = it.jurName + (it.form ? " \u00b7 " + it.form : "") + (it.moved ? " \u00b7 moved from " + P.fmtShort(it.nominal) : "");
    return h("li", null, h("button", { class:"row" + (st.c === "warn" ? " flag" : "") + (it.cat === "processing" ? " info" : ""), type:"button",
        "aria-pressed":ui.sel === it.id ? "true" : "false", "data-id":it.id, onclick:function(){ pick(it.id); } },
      h("span", { class:"dt" + (first ? "" : " rep"), "aria-hidden":first ? null : "true" }, h("b", { text:String(it.date.getUTCDate()) }), h("i", { text:P.DOWS[P.dow(it.date)] })),
      h("span", { class:"main" }, h("span", { class:"ttl", text:it.title }), h("span", { class:"sub", text:sub })),
      h("span", { class:"lv lv-" + it.level, text:LEVELNAME[it.level] }),
      h("span", { class:"pill " + st.c, text:st.t })));
  }
  function rows(list){
    var prev = "";
    return list.map(function(it){ var k = P.iso(it.date), first = k !== prev; prev = k; return row(it, first); });
  }

  var LIMIT = 300;
  function renderList(){
    var list = visible(), box = $("dlist"), nodes = [];
    $("count").textContent = plural(list.filter(isDeadline).length, "deadline", "deadlines") + " shown";
    if(!list.length){
      swap(box, [h("div", { class:"empty panel" }, h("h3", { text:"Nothing matches these filters" }),
        h("p", { text:"Widen the date range or clear the search to see more of the calendar." }),
        h("button", { class:"btn", type:"button", onclick:clearFilters }, "Clear filters"))]);
      return;
    }
    var shown = ui.showAll ? list : list.slice(0, LIMIT), groups = [], cur = null;
    shown.forEach(function(it){
      var key = it.date.getUTCFullYear() + "-" + it.date.getUTCMonth();
      if(!cur || cur.key !== key){ cur = { key:key, label:P.MONTHS[it.date.getUTCMonth()] + " " + it.date.getUTCFullYear(), list:[] }; groups.push(cur); }
      cur.list.push(it);
    });
    groups.forEach(function(g){
      nodes.push(h("section", { class:"mgroup" },
        h("h3", { class:"mhead" }, g.label, h("span", { text:plural(g.list.filter(isDeadline).length, "deadline", "deadlines") })),
        h("ol", { class:"rows" }, rows(g.list))));
    });
    if(shown.length < list.length){
      nodes.push(h("button", { class:"btn more", type:"button", onclick:function(){ ui.showAll = true; renderList(); } }, "Show all " + num(list.length)));
    }
    swap(box, nodes);
  }

  function renderMonth(){
    var y = ui.month.y, m = ui.month.m, list = visible(), byDay = {};
    list.forEach(function(it){ var k = P.iso(it.date); (byDay[k] = byDay[k] || []).push(it); });
    $("count").textContent = plural(list.filter(isDeadline).length, "deadline", "deadlines") + " in " + P.MONTHS[m - 1];
    var first = P.D(y, m, 1), last = P.eom(y, m), cells = [], d, i;
    for(i = 0; i < P.dow(first); i++) cells.push(h("div", { class:"cell pad", "aria-hidden":"true" }));
    for(d = first; d <= last; d = P.addDays(d, 1)){
      (function(dt){
        var k = P.iso(dt), its = byDay[k] || [], c = { federal:0, state:0, local:0, global:0 }, hasFlag = false;
        its.forEach(function(it){ if(isDeadline(it)) c[it.level]++; if(it.flag) hasFlag = true; });
        var total = c.federal + c.state + c.local + c.global;
        var badges = P.LEVELS.filter(function(l){ return c[l[0]]; }).map(function(l){
          return h("span", { class:"cb lv-" + l[0], title:plural(c[l[0]], l[1].toLowerCase() + " deadline", l[1].toLowerCase() + " deadlines") }, h("span", { class:"sr", text:l[1] + " " }), String(c[l[0]]));
        });
        var cls = "cell" + (P.same(dt, TODAY) ? " today" : "") + (ui.day === k ? " on" : "") + (hasFlag ? " flag" : "") + (P.HOL[k] ? " hol" : "");
        var label = P.fmtLong(dt) + ": " + (total ? plural(total, "deadline", "deadlines") : "no deadlines");
        cells.push(its.length
          ? h("button", { class:cls, type:"button", "aria-pressed":ui.day === k ? "true" : "false", "aria-label":label, onclick:function(){ ui.day = k; renderMonth(); } },
              h("span", { class:"dn", text:String(dt.getUTCDate()) }), h("span", { class:"cbs" }, badges), P.HOL[k] ? h("span", { class:"hn", text:"Holiday" }) : null)
          : h("div", { class:cls + " none" }, h("span", { class:"dn", text:String(dt.getUTCDate()) })));
      })(d);
    }
    var minM = P.W0.getUTCFullYear() * 12 + P.W0.getUTCMonth(), maxM = P.W1.getUTCFullYear() * 12 + P.W1.getUTCMonth(), curM = y * 12 + (m - 1);
    function go(delta){ var t = curM + delta; ui.month = { y:Math.floor(t / 12), m:(t % 12) + 1 }; ui.day = null; renderDeadlines(); }
    var dayItems = ui.day && byDay[ui.day] ? byDay[ui.day] : null;
    var dayDate = ui.day ? new Date(ui.day + "T00:00:00Z") : null;
    swap($("dlist"), [
      h("div", { class:"panel cal" },
        h("div", { class:"calhead" },
          h("button", { class:"btn sq", type:"button", "aria-label":"Previous month", disabled:curM <= minM, onclick:function(){ go(-1); } }, "\u2039"),
          h("h3", { text:P.MONTHS[m - 1] + " " + y }),
          h("button", { class:"btn sq", type:"button", "aria-label":"Next month", disabled:curM >= maxM, onclick:function(){ go(1); } }, "\u203a"),
          h("button", { class:"btn", type:"button", onclick:function(){ ui.month = { y:TODAY.getUTCFullYear(), m:TODAY.getUTCMonth() + 1 }; ui.day = P.iso(TODAY); renderDeadlines(); } }, "Today")),
        h("div", { class:"dows", "aria-hidden":"true" }, P.DOWS.map(function(n){ return h("span", { text:n }); })),
        h("div", { class:"grid" }, cells)),
      dayItems
        ? h("section", { class:"mgroup" },
            h("h3", { class:"mhead" }, P.fmtLong(dayDate), h("span", { text:plural(dayItems.filter(isDeadline).length, "deadline", "deadlines") })),
            h("ol", { class:"rows" }, rows(dayItems)))
        : h("p", { class:"hint", text:"Select a day to list its deadlines." })
    ]);
  }

  function movedWhy(it){
    var w = P.dow(it.nominal), k = P.iso(it.nominal);
    return "Moved from " + P.fmtLong(it.nominal) + (w === 0 || w === 6 ? ", a weekend." : P.HOL[k] ? ", " + P.HOL[k] + "." : ".");
  }
  function detailNodes(it){
    if(!it){
      return [
        h("h2", { text:"How this calendar works" }),
        h("ul", { class:"how" },
          h("li", null, h("b", { text:"Computed, not typed in. " }), "Each date comes from the agency's published rule, so the calendar rolls forward on its own and never needs re-keying."),
          h("li", null, h("b", { text:"Weekends and holidays. " }), "A U.S. date that lands on a weekend or federal holiday moves to the next business day, and the original date stays visible."),
          h("li", null, h("b", { text:"Outside the U.S. " }), "Dates follow each country's weekend rule. Local public holidays are confirmed with the in-country vendor."),
          h("li", null, h("b", { text:"Tied to the controls. " }), "A new work location or an agency notice adds its own dates here the moment it is logged.")),
        h("div", { class:"blk" }, h("h3", { text:"Sample company profile" }),
          h("p", { text:"Weekly Friday payroll, semiweekly federal depositor, calendar-year benefit plans, offices in Texas, Massachusetts, Virginia and Arizona, and nine sample countries. Swap in the real account register and the calendar rebuilds itself." })),
        h("div", { class:"blk" }, h("h3", { text:"On the watch list, no date yet" }),
          h("ul", { class:"watch" },
            h("li", null, h("b", { text:"EEO-1. " }), "No collection window has opened for 2025 data, and the EEOC voted in July 2026 to propose ending the report."),
            h("li", null, h("b", { text:"Maryland paid leave. " }), "Contributions are scheduled to begin in 2027. The first quarterly report is added once the state confirms its date."))),
        h("p", { class:"hint", text:"Select any deadline to see its rule, owner and evidence." })
      ];
    }
    var st = statusOf(it), n = daysOut(it), dl = isDeadline(it);
    var when = n === 0 ? "Today" : n > 0 ? "In " + plural(n, "day", "days") : plural(-n, "day", "days") + " ago";
    var canFile = dl && n >= 0 && !it.flag && !it.closed;
    var meta = [["Jurisdiction", it.jurName], ["Agency", it.agency], ["Form", it.form], ["Period", it.period], ["Owner", dl ? it.owner : ""], ["Type", CATNAME[it.cat]]]
      .filter(function(r){ return r[1]; });
    var ev = EVIDENCE[it.cat], J = JUR[it.jur], src = it.url || J.url || "";
    return [
      h("div", { class:"dtop" }, h("span", { class:"lv lv-" + it.level, text:LEVELNAME[it.level] }), h("span", { class:"pill " + st.c, text:st.t })),
      h("h2", { text:it.title }),
      h("p", { class:"ddate" }, P.fmtLong(it.date), h("span", { text:when })),
      it.moved ? h("p", { class:"moved", text:movedWhy(it) }) : null,
      h("dl", { class:"dmeta" }, meta.map(function(r){ return h("div", null, h("dt", { text:r[0] }), h("dd", { text:r[1] })); })),
      it.rule ? h("div", { class:"blk" }, h("h3", { text:dl ? "How the date is set" : "What this means" }), h("p", { text:it.rule })) : null,
      it.note || J.note ? h("div", { class:"blk" }, h("h3", { text:"Worth knowing" }), it.note ? h("p", { text:it.note }) : null, J.note ? h("p", { text:J.note }) : null) : null,
      ev && dl ? h("div", { class:"blk" }, h("h3", { text:n < 0 || state.filed[it.id] || it.closed ? "Evidence saved" : "Evidence to save" }),
        h("div", { class:"chips" }, ev.map(function(e){ return h("span", { class:"chip", text:e }); }))) : null,
      it.flag ? h("p", { class:"callout" }, "This item is open in ", h("a", { href:"#controls", text:"Controls" }), ". Work its three steps there to close it.") : null,
      dl ? h("div", { class:"dacts" },
        canFile ? h("button", { class:"go", type:"button", onclick:function(){ toggleFiled(it); } }, state.filed[it.id] ? "Undo: mark as not filed" : "Mark as filed, attach confirmation") : null,
        h("button", { class:"btn", type:"button", onclick:function(){ exportICS([it], "deadline"); } }, "Add to my calendar")) : null,
      src ? h("p", { class:"ref" }, "Source: ", h("a", { href:src, target:"_blank", rel:"noopener", text:it.url ? (it.urlLabel || it.agency) : J.agency })) : null
    ];
  }
  function renderDetailPanel(){
    var it = ui.sel ? items().byId[ui.sel] : null;
    if(ui.sel && !it) ui.sel = null;
    swap($("ddetail"), detailNodes(it));
    var sheet = $("sheet");
    if(sheet.open) swap($("sheetbody"), detailNodes(it));
  }
  function pick(id){
    ui.sel = id;
    Array.prototype.forEach.call(document.querySelectorAll("#dlist .row"), function(b){ b.setAttribute("aria-pressed", b.getAttribute("data-id") === id ? "true" : "false"); });
    swap($("ddetail"), detailNodes(items().byId[id]));
    if(narrow()){
      var sheet = $("sheet");
      swap($("sheetbody"), detailNodes(items().byId[id]));
      if(!sheet.open){ if(sheet.showModal) sheet.showModal(); else sheet.setAttribute("open", ""); }
    }
  }
  function toggleFiled(it){
    if(state.filed[it.id]){ delete state.filed[it.id]; addLog("Reopened: " + it.title + " (" + it.jurName + ")"); say("Marked as not filed."); }
    else { state.filed[it.id] = true; addLog("Filed early with confirmation saved: " + it.title + " (" + it.jurName + ")"); say("Marked as filed."); }
    render();
  }
  function clearFilters(){ ui.level = "all"; ui.jur = ""; ui.cat = ""; ui.q = ""; ui.range = "next30"; ui.showAll = false; renderDeadlines(); }

  function renderDeadlines(){
    renderDTiles(); syncControls(); renderLevels();
    if(ui.layout === "month") renderMonth(); else renderList();
    renderDetailPanel();
  }

  /* ---------- Exports ---------- */
  function download(name, mime, text){
    var blob = new Blob([text], { type:mime }), url = URL.createObjectURL(blob), a = h("a", { href:url, download:name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  }
  function icsText(s){ return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function exportICS(list, name){
    var stamp = P.iso(TODAY).replace(/-/g, "") + "T000000Z";
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Payroll Control Monitor//Concept demo//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Payroll deadlines (sample)"];
    list.filter(isDeadline).forEach(function(it){
      lines.push("BEGIN:VEVENT", "UID:" + it.id.replace(/[^A-Za-z0-9]+/g, "-") + "@payroll.wes-griffin.com", "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + P.iso(it.date).replace(/-/g, ""), "DTEND;VALUE=DATE:" + P.iso(P.addDays(it.date, 1)).replace(/-/g, ""),
        "SUMMARY:" + icsText(it.title + " (" + it.jurName + ")"),
        "DESCRIPTION:" + icsText([it.form, it.agency, it.period, it.rule, "Owner: " + it.owner, "Sample data from a concept demo."].filter(Boolean).join("\n")),
        "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    download("payroll-" + name + ".ics", "text/calendar", lines.join("\r\n"));
    say("Calendar file downloaded.");
  }
  function exportCSV(list){
    function q(s){ return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; }
    var out = [["Due date","Original date","Level","Jurisdiction","Deadline","Form","Agency","Period","Type","Owner","Status"].map(q).join(",")];
    list.filter(isDeadline).forEach(function(it){
      out.push([P.iso(it.date), it.moved ? P.iso(it.nominal) : "", LEVELNAME[it.level], it.jurName, it.title, it.form, it.agency, it.period, CATNAME[it.cat], it.owner, statusOf(it).t].map(q).join(","));
    });
    download("payroll-deadlines.csv", "text/csv", out.join("\r\n"));
    say("Spreadsheet file downloaded.");
  }

  /* ---------- Jurisdictions ---------- */
  function renderJurisdictions(){
    var stats = {}, end = P.addDays(TODAY, 365);
    items().forEach(function(it){
      if(!isDeadline(it) || it.date < TODAY || it.date > end) return;
      var s = stats[it.jur] = stats[it.jur] || { n:0, next:null };
      s.n++; if(!s.next) s.next = it;
    });
    function open(code){ ui.jur = code; ui.level = "all"; ui.cat = ""; ui.q = ""; ui.range = "all"; ui.layout = "list"; ui.showAll = false; ui.sel = null; location.hash = "#deadlines"; renderDeadlines(); window.scrollTo(0, 0); }
    function card(code, extra){
      var j = JUR[code], s = stats[code] || { n:0, next:null }, pend = j.pending && !resolved("location");
      return h("button", { class:"jcard" + (j.office ? " office" : "") + (pend ? " flag" : ""), type:"button", onclick:function(){ open(code); } },
        h("span", { class:"jtop" }, j.abbr ? h("span", { class:"abbr", text:j.abbr }) : null, h("span", { class:"jn", text:j.name }),
          pend ? h("span", { class:"pill warn", text:"Setup needed" }) : j.pending ? h("span", { class:"pill ok", text:"Verified" }) : j.office ? h("span", { class:"pill soon", text:"Office" }) : null),
        extra ? h("span", { class:"jx", text:extra }) : null,
        h("span", { class:"jm", text:pend ? "Deadlines are added once the accounts are verified" : plural(s.n, "deadline", "deadlines") + " in 12 months" + (s.next ? " \u00b7 next " + P.fmtMD(s.next.date) : "") }));
    }
    var by = { federal:[], state:[], local:[], global:[] };
    Object.keys(JUR).forEach(function(k){ by[JUR[k].level].push(k); });
    ["state","local","global"].forEach(function(l){ by[l].sort(function(a, b){ return JUR[a].name < JUR[b].name ? -1 : 1; }); });
    swap($("jbody"), [
      h("h3", { class:"jh", text:"Federal" }),
      h("div", { class:"jgrid wide" }, card("US", "IRS, Social Security, Department of Labor, OSHA and CMS: deposits for every payroll run, quarterly and annual returns, year-end forms, benefit plan filings and workforce reports.")),
      h("h3", { class:"jh" }, "States and DC", h("span", { text:"51 jurisdictions" })),
      h("div", { class:"jgrid" }, by.state.map(function(k){
        var j = JUR[k];
        return card(k, j.office || (j.noTax ? "No state income tax. Unemployment: " + j.ui : (j.whr.charAt(0) === "C" ? "Combined return: " : "Withholding: ") + j.wh));
      })),
      h("h3", { class:"jh" }, "Local", h("span", { text:plural(by.local.length, "jurisdiction", "jurisdictions") })),
      h("div", { class:"jgrid" }, by.local.map(function(k){ return card(k, JUR[k].agency); })),
      h("h3", { class:"jh" }, "Global", h("span", { text:plural(by.global.length, "sample country", "sample countries") })),
      h("div", { class:"jgrid" }, by.global.map(function(k){ return card(k, JUR[k].agency); }))
    ]);
  }

  /* ---------- Controls (the original monitor) ---------- */
  function metricFor(c){
    if(c.id === "deposits"){
      var n = 58 + (resolved("deposit") ? 1 : 0);
      return n + " of " + n + " on time" + (busy("deposit") ? ", 1 due " + P.fmtShort(DEP_DUE) : "");
    }
    if(c.id === "accounts"){ return busy("location") ? "50 of 50 states, 1 city pending" : "50 of 50 states verified"; }
    if(c.id === "notices"){ return (2 + (busy("notice") ? 1 : 0)) + " open, 0 past due"; }
    return c.metric;
  }
  function select(id, scroll){
    state.selected = id; render();
    if(scroll && narrow()){ $("detail").scrollIntoView({ behavior:reduce ? "auto" : "smooth", block:"start" }); }
  }
  function runScenario(k){
    if(state.steps[k] === null){ state.steps[k] = 0; addLog(SCENARIOS[k].trigger); say(SCENARIOS[k].title + ". Needs attention."); }
    select(SCENARIOS[k].control, true);
  }
  function advance(k){
    var sc = SCENARIOS[k], i = state.steps[k];
    if(i === null || i >= 3) return;
    addLog(sc.steps[i].log);
    state.steps[k] = i + 1;
    if(state.steps[k] === 3 && k === "location") addLog("Columbus deadlines added to the calendar: " + P.COLUMBUS.length + " dates through " + P.fmtMDY(P.W1));
    say(sc.steps[i].done + "." + (state.steps[k] === 3 ? " " + sc.resolved + "." : ""));
    render();
    var next = document.querySelector("#detail .go") || document.querySelector("#detail .stamp");
    if(next) next.focus();
  }
  function renderTiles(){
    var f = flagged().length, loc = 4 + (resolved("location") ? 1 : 0);
    var dep = 58 + (resolved("deposit") ? 1 : 0), open = 2 + (busy("notice") ? 1 : 0);
    var tiles = [
      { label:"Controls on track", value:(9 - f) + " of 9", note:f ? (f === 1 ? "1 needs attention" : f + " need attention") : "Nothing needs attention", warn:f > 0 },
      { label:"Tax deposits on time", value:"100%", note:dep + " of " + dep + " this month" + (busy("deposit") ? ", 1 due " + P.fmtShort(DEP_DUE) : "") },
      { label:"Agency notices past due", value:"0", note:open + " open, each with an owner" },
      { label:"New locations set up before first paycheck", value:loc + " of 5", note:loc < 5 ? "1 in progress" : "All verified", warn:loc < 5 }
    ];
    swap($("tiles"), tiles.map(function(t){
      return h("div", { class:"tile" + (t.warn ? " warn" : "") },
        h("div", { class:"label", text:t.label }), h("div", { class:"value", text:t.value }), h("div", { class:"note", text:t.note }));
    }));
  }
  function renderStart(){
    var f = flagged().length, all = ORDER.every(resolved);
    $("startmsg").textContent = all
      ? "All three scenarios are closed, each with its evidence saved. Open Deadlines or Monthly report to see how they show up there."
      : f ? "Open a flagged item and work its three steps. Each one also sits on the Deadlines calendar."
          : "Everything is on track. Start another scenario to see how the monitor responds.";
    swap($("scns"), ORDER.map(function(k){
      var sc = SCENARIOS[k], s = state.steps[k];
      var label = s === null ? "Start" : s === 3 ? "Resolved" : "Step " + (s + 1) + " of 3";
      return h("button", { class:"scn" + (s === 3 ? " done" : s !== null ? " busy" : ""), type:"button", onclick:function(){ runScenario(k); } },
        h("span", { class:"t", text:sc.button }), h("span", { class:"s", text:label }));
    }));
  }
  function renderControls(){
    swap($("controls"), CONTROLS.map(function(c){
      var k = scenarioFor(c.id), isBusy = k && busy(k);
      return h("button", { class:"ctl" + (isBusy ? " flag" : ""), type:"button", "aria-pressed":state.selected === c.id ? "true" : "false",
          onclick:function(){ select(c.id, true); } },
        h("span", { class:"n", text:c.name }), h("span", { class:"m", text:metricFor(c) }),
        h("span", { class:"pill" + (isBusy ? " warn" : " ok"), text:isBusy ? SCENARIOS[k].flag : c.ok }));
    }));
  }
  function renderCase(k){
    var sc = SCENARIOS[k], cur = state.steps[k], done = cur === 3;
    var steps = sc.steps.map(function(st, i){
      var cls = i < cur ? "done" : i === cur ? "next" : "todo";
      return h("li", { class:"step " + cls },
        h("span", { class:"ck", "aria-hidden":"true", text:i < cur ? "\u2713" : "" }),
        h("div", null, h("div", { class:"st", text:i < cur ? st.done : st.act }), i < cur ? h("div", { class:"sn", text:st.note }) : null));
    });
    return h("div", { class:"case" + (done ? " closed" : "") },
      h("h3", { text:sc.title }), h("p", { class:"why", text:sc.why }), h("ol", { class:"steps" }, steps),
      done
        ? h("div", { class:"stamp", tabindex:"-1" }, h("span", { "aria-hidden":"true", text:"\u2713" }), sc.resolved)
        : h("button", { class:"go", type:"button", onclick:function(){ advance(k); } }, sc.steps[cur].act));
  }
  function renderDetail(){
    var c = CONTROLS.filter(function(x){ return x.id === state.selected; })[0];
    var k = scenarioFor(c.id), isBusy = k && busy(k);
    swap($("detail"), [
      h("div", { class:"dhead" }, h("h2", { text:c.name }), h("span", { class:"pill" + (isBusy ? " warn" : " ok"), text:isBusy ? SCENARIOS[k].flag : c.ok })),
      h("div", { class:"meta" },
        h("span", null, "Owner: ", h("b", { text:c.owner })), h("span", null, "Checked: ", h("b", { text:c.cadence })), h("span", null, "Now: ", h("b", { text:metricFor(c) }))),
      k ? renderCase(k) : null,
      h("div", { class:"blk" }, h("h3", { text:"How it goes wrong" }), h("p", { text:c.risk })),
      h("div", { class:"blk" }, h("h3", { text:"The control" }), h("p", { text:c.control })),
      h("div", { class:"blk" }, h("h3", { text:"Evidence kept" }), h("div", { class:"chips" }, c.evidence.map(function(e){ return h("span", { class:"chip", text:e }); }))),
      c.ref ? h("p", { class:"ref" }, "Rule: ", h("a", { href:c.ref.url, target:"_blank", rel:"noopener", text:c.ref.label })) : null
    ]);
  }
  function renderLog(){
    swap($("log"), state.log.map(function(e){
      var li = h("li", { class:e.fresh ? "new" : "" }, h("span", { text:e.text }), h("span", { class:"when", text:e.when }));
      e.fresh = false;
      return li;
    }));
  }

  /* ---------- Monthly report ---------- */
  function renderReport(){
    var dep = 58 + (resolved("deposit") ? 1 : 0), open = 2 + (busy("notice") ? 1 : 0), loc = 4 + (resolved("location") ? 1 : 0);
    var from = P.addDays(TODAY, -30), met = items().filter(function(it){ return isDeadline(it) && it.date >= from && it.date < TODAY; }).length;
    var f = flagged().length;
    var rows = [
      ["Statutory deadlines met, all jurisdictions", "100%", num(met) + " of " + num(met) + " in the last 30 days" + (f ? ", " + f + " open" : ""), f > 0, "Compliance calendar"],
      ["Tax deposits made on time (federal, state, local)", "100%", dep + " of " + dep + (busy("deposit") ? ", 1 due " + P.fmtShort(DEP_DUE) : ""), busy("deposit"), "Deposit confirmations"],
      ["Returns filed and confirmed accepted", "100%", "14 of 14", false, "Filing acceptances"],
      ["Payroll register vs. deposits", "$0 variance", "$0", false, "Register and bank records"],
      ["Agency notices", "0 past due", open + " open, 0 past due", busy("notice"), "Shared notice log"],
      ["States with active staff vs. verified tax accounts", "Match", "50 of 50", false, "Account register"],
      ["New work locations set up before first paycheck", "100%", loc + " of 5" + (loc < 5 ? ", 1 in progress" : ""), loc < 5, "Registration confirmations"],
      ["Corrected or off-cycle payments", "Trending down", "7, down from 11", false, "Correction log"],
      ["Hours paid vs. hours billed to clients", "Every variance explained", "3 variances, all explained", false, "Timesheet and invoice tie-out"],
      ["International statutory payments confirmed", "100%", "9 of 9 countries", false, "Vendor confirmations"]
    ];
    swap($("report"), rows.map(function(r){
      return h("tr", null,
        h("th", { scope:"row", text:r[0] }), h("td", { text:r[1] }), h("td", { class:"num", text:r[2] }),
        h("td", null, h("span", { class:"pill" + (r[3] ? " warn" : " ok"), text:r[3] ? "In progress" : "On target" })),
        h("td", { class:"ev", text:r[4] }));
    }));
  }

  function render(){
    cache = null;
    renderDeadlines(); renderJurisdictions();
    renderTiles(); renderStart(); renderControls(); renderDetail(); renderLog(); renderReport();
  }

  /* ---------- Views (one plain #name each) ---------- */
  var VIEWS = ["deadlines","controls","jurisdictions","monthly-report","first-90-days"];
  function showView(){
    var v = (location.hash || "").replace("#", "");
    if(v === "monitor") v = "controls";
    if(VIEWS.indexOf(v) < 0) v = "deadlines";
    VIEWS.forEach(function(name){ $("view-" + name).hidden = name !== v; });
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function(t){
      if(t.getAttribute("data-view") === v) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", showView);

  /* ---------- Wiring ---------- */
  $("asof").textContent = "As of " + P.fmtLong(TODAY);
  buildSelects();
  $("fJur").addEventListener("change", function(){ ui.jur = this.value; ui.showAll = false; renderDeadlines(); });
  $("fCat").addEventListener("change", function(){ ui.cat = this.value; ui.showAll = false; renderDeadlines(); });
  $("fRange").addEventListener("change", function(){ ui.range = this.value; ui.showAll = false; renderDeadlines(); });
  var searchTimer = null;
  $("fSearch").addEventListener("input", function(){
    var v = this.value; clearTimeout(searchTimer);
    searchTimer = setTimeout(function(){ ui.q = v.trim(); ui.showAll = false; renderDeadlines(); }, 140);
  });
  $("layList").addEventListener("click", function(){ ui.layout = "list"; renderDeadlines(); });
  $("layMonth").addEventListener("click", function(){ ui.layout = "month"; renderDeadlines(); });
  $("ics").addEventListener("click", function(){ exportICS(visible(), "deadlines"); });
  $("csv").addEventListener("click", function(){ exportCSV(visible()); });
  $("sheetclose").addEventListener("click", function(){ $("sheet").close(); });
  $("sheet").addEventListener("click", function(e){ if(e.target === this) this.close(); });
  if(narrowMQ){
    var onMQ = function(){ if(!narrow() && $("sheet").open) $("sheet").close(); };
    if(narrowMQ.addEventListener) narrowMQ.addEventListener("change", onMQ); else if(narrowMQ.addListener) narrowMQ.addListener(onMQ);
  }
  /* Reset restores everything: scenarios, activity, filed marks, and every Deadlines filter and layout */
  $("reset").addEventListener("click", function(){
    state = fresh(); ui = freshUI();
    clearTimeout(searchTimer);
    if($("sheet").open) $("sheet").close();
    render();
    window.scrollTo(0, 0);
    say("Demo reset."); toast("Demo reset to its starting point");
  });

  state = fresh();
  render();
  showView();
})();
