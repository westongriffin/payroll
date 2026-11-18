/* Payroll Control Monitor: deadline rules engine.
   Every date is computed from the agency's published rule, so the calendar rolls forward on its own.
   Company profile, footprint and statuses are sample data. */
(function(){
  "use strict";

  /* ---------- Dates (UTC, day precision) ---------- */
  var DAY = 86400000;
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DOWL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  var DOWS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  function D(y, m, d){ return new Date(Date.UTC(y, m - 1, d)); }           /* m is 1-based; overflow rolls into the next year */
  function eom(y, m){ return new Date(Date.UTC(y, m, 0)); }                /* last day of month m */
  function addDays(dt, n){ return new Date(dt.getTime() + n * DAY); }
  function dow(dt){ return dt.getUTCDay(); }
  function iso(dt){ return dt.toISOString().slice(0, 10); }
  function same(a, b){ return a.getTime() === b.getTime(); }
  function nthDow(y, m, n, wd){ var f = D(y, m, 1); return D(y, m, 1 + ((wd - dow(f) + 7) % 7) + (n - 1) * 7); }
  function lastDow(y, m, wd){ var l = eom(y, m); return addDays(l, -((dow(l) - wd + 7) % 7)); }
  function fmtLong(dt){ return DOWL[dow(dt)] + ", " + MONTHS[dt.getUTCMonth()] + " " + dt.getUTCDate() + ", " + dt.getUTCFullYear(); }
  function fmtShort(dt){ return DOWS[dow(dt)] + ", " + MON[dt.getUTCMonth()] + " " + dt.getUTCDate(); }
  function fmtMD(dt){ return MON[dt.getUTCMonth()] + " " + dt.getUTCDate(); }
  function fmtMDY(dt){ return MON[dt.getUTCMonth()] + " " + dt.getUTCDate() + ", " + dt.getUTCFullYear(); }

  var now = new Date();
  var TODAY = D(now.getFullYear(), now.getMonth() + 1, now.getDate());
  var W0 = addDays(TODAY, -45);                                             /* show the last 45 days as filed history */
  var W1 = eom(TODAY.getUTCFullYear(), TODAY.getUTCMonth() + 1 + 13);       /* through the end of the month 13 months out */
  var Y0 = W0.getUTCFullYear() - 1, Y1 = W1.getUTCFullYear() + 1;

  /* ---------- US federal holidays (as observed) ---------- */
  var HOL = {}, HOLSAT = {};
  function observed(dt){ var w = dow(dt); return w === 6 ? addDays(dt, -1) : w === 0 ? addDays(dt, 1) : dt; }
  (function(){
    for(var y = Y0 - 1; y <= Y1 + 1; y++){
      [[D(y,1,1),"New Year's Day",1],[nthDow(y,1,3,1),"Martin Luther King Jr. Day"],[nthDow(y,2,3,1),"Presidents' Day"],
       [lastDow(y,5,1),"Memorial Day"],[D(y,6,19),"Juneteenth",1],[D(y,7,4),"Independence Day",1],[nthDow(y,9,1,1),"Labor Day"],
       [nthDow(y,10,2,1),"Columbus Day"],[D(y,11,11),"Veterans Day",1],[nthDow(y,11,4,4),"Thanksgiving Day"],[D(y,12,25),"Christmas Day",1]
      ].forEach(function(h){
        var o = h[2] ? observed(h[0]) : h[0];
        HOL[iso(o)] = h[1];
        if(h[2] && dow(h[0]) === 6) HOLSAT[iso(o)] = true;                  /* Saturday holiday observed Friday: the Fed stays open */
      });
    }
  })();
  function isBiz(dt){ var w = dow(dt); return w !== 0 && w !== 6 && !HOL[iso(dt)]; }
  function nextBiz(dt){ while(!isBiz(dt)) dt = addDays(dt, 1); return dt; }
  function prevBiz(dt){ while(!isBiz(dt)) dt = addDays(dt, -1); return dt; }
  function addBiz(dt, n){ while(n > 0){ dt = addDays(dt, 1); if(isBiz(dt)) n--; } return dt; }
  function isWk(dt){ var w = dow(dt); return w !== 0 && w !== 6; }
  function nextWk(dt){ while(!isWk(dt)) dt = addDays(dt, 1); return dt; }
  function prevWk(dt){ while(!isWk(dt)) dt = addDays(dt, -1); return dt; }
  function addWk(dt, n){ while(n > 0){ dt = addDays(dt, 1); if(isWk(dt)) n--; } return dt; }

  /* Germany: nationwide bank working days (social insurance due dates count back from month-end) */
  function easter(y){
    var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
        h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    return D(y, Math.floor((h+l-7*m+114)/31), ((h+l-7*m+114)%31)+1);
  }
  var DEHOL = {};
  (function(){
    for(var y = Y0 - 1; y <= Y1 + 1; y++){
      var e = easter(y);
      [D(y,1,1), addDays(e,-2), addDays(e,1), D(y,5,1), addDays(e,39), addDays(e,50), D(y,10,3), D(y,12,24), D(y,12,25), D(y,12,26), D(y,12,31)]
        .forEach(function(x){ DEHOL[iso(x)] = true; });
    }
  })();
  function nthLastBankDE(y, m, n){ var dt = eom(y, m); for(;;){ if(isWk(dt) && !DEHOL[iso(dt)]){ n--; if(n === 0) return dt; } dt = addDays(dt, -1); } }

  /* ---------- Registry ---------- */
  var JUR = {}, ITEMS = [], COLUMBUS = [], OUT = ITEMS;
  var LEVELS = [["federal","Federal"],["state","State"],["local","Local"],["global","Global"]];
  var CATS = [["deposit","Deposits and payments"],["return","Returns and wage reports"],["yearend","Year-end forms"],
              ["benefits","Benefits and plans"],["report","Workforce reports"],["notice","Notices and setup"],["processing","Calendar notes"]];
  var OWNER = { deposit:"Payroll", "return":"Payroll", yearend:"Payroll and Finance", benefits:"HR and Benefits", report:"HR", notice:"Head of HR and Payroll", processing:"Payroll" };
  function jur(code, name, level, o){
    var j = { code:code, name:name, level:level }, k;
    for(k in (o || {})) j[k] = o[k];
    JUR[code] = j; return j;
  }
  function rolled(dt, mode){
    return mode === "next" ? nextBiz(dt) : mode === "prev" ? prevBiz(dt) : mode === "wknext" ? nextWk(dt) : mode === "wkprev" ? prevWk(dt) : dt;
  }
  /* put(jurisdiction, key, title, nominal date, roll mode, details) */
  function put(j, key, title, nominal, mode, o){
    var date = rolled(nominal, mode === undefined ? "next" : mode);
    if(date < W0 || date > W1) return null;
    var J = JUR[j], it = {
      id: j + "|" + key + "|" + iso(nominal), jur:j, level:J.level, jurName:J.name, title:title, date:date, nominal:nominal,
      moved: !same(date, nominal), cat:o.cat, form:o.form || "", agency:o.agency || J.agency || "", period:o.period || "",
      rule:o.rule || "", note:o.note || "", url:o.url || "", urlLabel:o.urlLabel || "", owner:o.owner || (J.level === "global" ? "Payroll, with the in-country vendor" : OWNER[o.cat])
    };
    if(o.payday) it.payday = o.payday;
    OUT.push(it); return it;
  }
  function eachYear(fn){ for(var y = Y0; y <= Y1; y++) fn(y); }
  function eachQuarter(fn){ eachYear(function(y){ for(var q = 1; q <= 4; q++) fn(y, q, "Q" + q + " " + y); }); }
  function eachMonth(fn){ eachYear(function(y){ for(var m = 1; m <= 12; m++) fn(y, m, MONTHS[m - 1] + " " + y); }); }
  /* Quarterly due date in the month after the quarter: "Q" = last day, "Q15" = the 15th, and so on */
  function qDue(y, q, rule){ var m = q * 3 + 1; return rule === "Q" ? eom(y, m) : D(y, m, +rule.slice(1)); }
  function qRule(rule){ return rule === "Q" ? "Due the last day of the month after the quarter ends." : "Due the " + rule.slice(1) + "th of the month after the quarter ends."; }
  /* Monthly due date in the month after the period: "E" = last day, otherwise the day number */
  function mDue(y, m, day){ return day === "E" ? eom(y, m + 1) : D(y, m + 1, day); }

  var IRS = "https://www.irs.gov/forms-pubs/";
  var FUTA_URL = "https://payroll.org/news-resources/news/news-detail/2026/11/13/california-faces-futa-credit-reduction-for-2026";

  /* =====================================================================
     FEDERAL
     ===================================================================== */
  jur("US", "United States (federal)", "federal", { short:"Federal", agency:"IRS" });
  (function(){
    var j = "US";
    /* Sample profile: weekly Friday payroll, semiweekly depositor */
    var fri = addDays(W0, -14); while(dow(fri) !== 5) fri = addDays(fri, 1);
    for(; fri <= W1; fri = addDays(fri, 7)){
      var pay = prevBiz(fri);
      put(j, "ftd", "Federal tax deposit: " + fmtMD(pay) + " payroll", addBiz(fri, 3), "none", { cat:"deposit", payday:pay,
        form:"EFTPS deposit of Form 941 taxes", period:"Payroll paid " + fmtShort(pay),
        rule:"Semiweekly schedule: pay dates on Wednesday, Thursday or Friday are deposited by the following Wednesday, with an extra day for each federal holiday in between. A run that accumulates $100,000 or more in tax is due the next business day.",
        url:"https://www.irs.gov/taxtopics/tc757", urlLabel:"IRS Topic 757, deposit schedules" });
    }
    eachQuarter(function(y, q, p){
      put(j, "941", "Form 941: quarterly federal tax return", qDue(y, q, "Q"), "next", { cat:"return", form:"Form 941", period:p,
        rule:"Due the last day of the month after the quarter ends. If every deposit for the quarter was made on time, the IRS allows 10 more days.",
        url:IRS + "about-form-941", urlLabel:"IRS, About Form 941" });
      put(j, "futa", "FUTA tax deposit", qDue(y, q, "Q"), "next", { cat:"deposit", form:"EFTPS deposit of Form 940 tax", period:p,
        rule:"Deposit by the last day of the month after any quarter in which accumulated FUTA tax is more than $500.",
        note:(q === 4 && y === 2026) ? "California wages carry a 1.5% FUTA credit reduction for 2026. The added tax is due with this deposit." : "",
        url:(q === 4 && y === 2026) ? FUTA_URL : "", urlLabel:"PayrollOrg, 2026 FUTA credit reduction" });
    });
    eachYear(function(y){
      var ty = y - 1, T = "Tax year " + ty, P = "Plan year " + ty;
      put(j, "rates", "New-year rates take effect", D(y,1,1), "none", { cat:"processing", period:"Calendar year " + y,
        rule:"Social Security wage base, retirement plan limits, state minimum wages and unemployment tax rates change on January 1. Rate notices are loaded and second-reviewed before the first payroll of the year." });
      put(j, "940", "Form 940: annual federal unemployment (FUTA) return", D(y,1,31), "next", { cat:"yearend", form:"Form 940", period:T,
        rule:"Due January 31. If every FUTA deposit was made on time, the IRS allows until February 10.",
        note:ty === 2026 ? "California wages carry a 1.5% FUTA credit reduction for 2026, reported on Schedule A." : "",
        url:ty === 2026 ? FUTA_URL : IRS + "about-form-940", urlLabel:ty === 2026 ? "PayrollOrg, 2026 FUTA credit reduction" : "IRS, About Form 940" });
      put(j, "w2ee", "Forms W-2 delivered to employees", D(y,1,31), "next", { cat:"yearend", form:"Form W-2, Copies B, C and 2", period:T,
        rule:"Due to employees by January 31.",
        note:ty >= 2026 ? "Starting with 2026 forms, the overtime premium is reported in Box 12 with code TT." : "",
        url:IRS + "about-form-w-2", urlLabel:"IRS, About Form W-2" });
      put(j, "w2ssa", "Forms W-2 and W-3 filed with Social Security", D(y,1,31), "next", { cat:"yearend", form:"Forms W-2 and W-3", agency:"Social Security Administration", period:T,
        rule:"Due to the SSA by January 31, on paper or electronically. The totals must tie to the four Forms 941.",
        url:"https://www.ssa.gov/employer/", urlLabel:"SSA, Employer W-2 Filing" });
      put(j, "1099nec", "Forms 1099-NEC to contractors and the IRS", D(y,1,31), "next", { cat:"yearend", form:"Form 1099-NEC", period:T,
        rule:"Due to recipients and to the IRS by January 31.", url:IRS + "about-form-1099-nec", urlLabel:"IRS, About Form 1099-NEC" });
      put(j, "1099misc", "Forms 1099-MISC to recipients", D(y,1,31), "next", { cat:"yearend", form:"Form 1099-MISC", period:T, rule:"Due to recipients by January 31." });
      put(j, "1099misc-irs", "Forms 1099-MISC e-filed with the IRS", D(y,3,31), "next", { cat:"yearend", form:"Form 1099-MISC", period:T, rule:"Electronic filing is due March 31." });
      put(j, "1099r", "Forms 1099-R for retirement plan distributions", D(y,1,31), "next", { cat:"benefits", form:"Form 1099-R", period:T, rule:"Due to recipients by January 31. The plan recordkeeper prepares them; the employer confirms delivery." });
      put(j, "945", "Form 945: annual return of nonpayroll withholding", D(y,1,31), "next", { cat:"yearend", form:"Form 945", period:T,
        rule:"Due January 31 when backup withholding or other nonpayroll income tax was withheld during the year." });
      put(j, "w4", "Form W-4 exemptions from withholding expire", D(y,2,15), "next", { cat:"report", form:"Form W-4", period:"Calendar year " + y,
        rule:"An employee who claimed exempt for " + ty + " must give a new Form W-4 by February 15, or withholding restarts as single with no adjustments." });
      put(j, "osha-post", "OSHA Form 300A summary posted", D(y,2,1), "none", { cat:"report", form:"OSHA Form 300A", agency:"OSHA", period:"Calendar year " + ty,
        rule:"The summary of work-related injuries and illnesses is posted from February 1 through April 30.", url:"https://www.osha.gov/injuryreporting", urlLabel:"OSHA, Injury Tracking Application" });
      put(j, "osha-ita", "OSHA injury data submitted electronically", D(y,3,2), "next", { cat:"report", form:"OSHA Form 300A, Injury Tracking Application", agency:"OSHA", period:"Calendar year " + ty,
        rule:"Covered establishments submit Form 300A data by March 2.", url:"https://www.osha.gov/injuryreporting", urlLabel:"OSHA, Injury Tracking Application" });
      put(j, "aca-ee", "Forms 1095-C furnished to employees", D(y,3,2), "next", { cat:"benefits", form:"Form 1095-C", period:T,
        rule:"Due 30 days after January 31, which is March 2.", url:IRS + "about-form-1095-c", urlLabel:"IRS, About Form 1095-C" });
      put(j, "aca-irs", "Forms 1094-C and 1095-C e-filed with the IRS", D(y,3,31), "next", { cat:"benefits", form:"Forms 1094-C and 1095-C", period:T,
        rule:"Electronic filing is due March 31.", url:IRS + "about-form-1095-c", urlLabel:"IRS, About Form 1095-C" });
      put(j, "cms", "Medicare Part D creditable coverage disclosure to CMS", D(y,3,1), "prev", { cat:"benefits", form:"Online disclosure to CMS", agency:"CMS", period:"Plan year " + y,
        rule:"Due within 60 days after the plan year starts, which is March 1 for a calendar-year plan." });
      put(j, "adp", "401(k) nondiscrimination test corrections", D(y,3,15), "next", { cat:"benefits", form:"ADP and ACP corrective distributions", agency:"IRS", period:P,
        rule:"Refunds for a failed ADP or ACP test are due March 15, two and a half months after the plan year ends, to avoid the 10% excise tax." });
      put(j, "1042", "Forms 1042 and 1042-S for payments to foreign persons", D(y,3,15), "next", { cat:"yearend", form:"Forms 1042 and 1042-S", period:T, rule:"Due March 15 when U.S.-source income was paid to foreign persons." });
      put(j, "402g", "401(k) excess deferrals refunded", D(y,4,15), "next", { cat:"benefits", form:"Section 402(g) corrective distributions", agency:"IRS", period:P, rule:"Deferrals over the annual limit are refunded by April 15." });
      put(j, "rxdc", "Prescription drug data collection (RxDC) report", D(y,6,1), "next", { cat:"benefits", form:"RxDC report", agency:"CMS", period:"Reference year " + ty, rule:"Group health plans report prescription drug and health care spending to CMS by June 1." });
      put(j, "5500", "Form 5500: annual benefit plan reports", D(y,7,31), "next", { cat:"benefits", form:"Form 5500", agency:"DOL and IRS", period:P,
        rule:"Due the last day of the seventh month after the plan year ends, which is July 31 for a calendar-year plan. Form 5558 extends it to October 15." });
      put(j, "pcori", "PCORI fee for self-insured health plans", D(y,7,31), "next", { cat:"benefits", form:"Form 720", period:P, rule:"Reported and paid on the second-quarter Form 720, due July 31." });
      put(j, "sar", "Summary annual report to plan participants", D(y,9,30), "next", { cat:"benefits", form:"Summary annual report", agency:"DOL", period:P,
        rule:"Due nine months after the plan year ends, or two months after an extended Form 5500 is filed." });
      put(j, "vets", "VETS-4212 federal contractor veterans report", D(y,9,30), "next", { cat:"report", form:"Form VETS-4212", agency:"DOL VETS", period:"Reporting cycle " + y,
        rule:"Federal contractors file between August 1 and September 30. This applies through the federal staffing practice." });
      put(j, "partd", "Medicare Part D creditable coverage notices to employees", D(y,10,14), "prev", { cat:"benefits", form:"Creditable coverage notice", agency:"CMS", period:"Plan year " + (y + 1),
        rule:"Delivered before October 15, the start of Medicare open enrollment." });
      put(j, "5500x", "Form 5500: extended due date", D(y,10,15), "next", { cat:"benefits", form:"Form 5500", agency:"DOL and IRS", period:P, rule:"October 15 applies only when Form 5558 was filed by July 31." });
      put(j, "sh", "401(k) safe harbor and default investment notices", D(y,12,1), "prev", { cat:"benefits", form:"Annual participant notices", agency:"IRS and DOL", period:"Plan year " + (y + 1),
        rule:"Delivered 30 to 90 days before the plan year starts, which is December 1 for a calendar-year plan." });
      put(j, "gag", "Gag clause prohibition attestation", D(y,12,31), "none", { cat:"benefits", form:"Gag Clause Prohibition Compliance Attestation", agency:"CMS", period:"Calendar year " + y, rule:"Group health plans attest by December 31 each year." });
    });
    /* Federal holidays: IRS closed, deadlines roll, ACH timing shifts */
    Object.keys(HOL).forEach(function(k){
      var dt = new Date(k + "T00:00:00Z");
      put(j, "hol", "Federal holiday: " + HOL[k], dt, "none", { cat:"processing", agency:"Federal Reserve and IRS", period:fmtLong(dt),
        rule:HOLSAT[k] ? "Observed today because the holiday falls on Saturday. The IRS is closed and deadlines landing here move to the next business day. The Federal Reserve stays open, so ACH settles normally."
                       : "Banks and the IRS are closed. Deadlines landing here move to the next business day, and payroll that settles today must be submitted one business day early." });
    });
  })();

  /* =====================================================================
     STATES (50 plus DC)
     [name, withholding form, withholding cadence, unemployment form, unemployment cadence, annual form, annual due "m-d"]
     Cadence: Q = quarterly, last day of the next month; Q15 and so on = that day of the next month; M15 = monthly; C = one combined return
     ===================================================================== */
  var ST = {
    AL:["Alabama","Form A-1","Q","Form UC-CR4","Q","Form A-3 and W-2s","1-31"],
    AK:["Alaska","","","Form TQ01C","Q","",""],
    AZ:["Arizona","Form A1-QRT","Q","Form UC-018","Q","Form A1-R and W-2s","1-31"],
    AR:["Arkansas","Form AR941M","M15","Form DWS-ARK-209B","Q","Form AR3MAR and W-2s","1-31"],
    CA:["California","Forms DE 9 and DE 9C","C","","","",""],
    CO:["Colorado","Form DR 1094","Q","Form UITR-1","Q","Form DR 1093 and W-2s","1-31"],
    CT:["Connecticut","Form CT-941","Q","Forms UC-2 and UC-5A","Q","Form CT-W3 and W-2s","1-31"],
    DE:["Delaware","Form WTH-TAX","Q","Forms UC-8 and UC-8A","Q","Form WTH-REC and W-2s","1-31"],
    DC:["District of Columbia","Form FR-900Q","Q","Form UC-30","Q","W-2s","1-31"],
    FL:["Florida","","","Form RT-6","Q","",""],
    GA:["Georgia","Form G-7","Q","Form DOL-4N","Q","Form G-1003 and W-2s","1-31"],
    HI:["Hawaii","Form HW-14","Q15","Form UC-B6","Q","Form HW-30 and W-2s","1-31"],
    ID:["Idaho","Form 910","Q","Form TAX020","Q","Form 967 and W-2s","1-31"],
    IL:["Illinois","Form IL-941","Q","Form UI-3/40","Q","W-2s","1-31"],
    IN:["Indiana","Form WH-1","M20","Forms UC-1 and UC-5A","Q","Form WH-3 and W-2s","1-31"],
    IA:["Iowa","Quarterly withholding return","Q","Form 65-5300","Q","Verified Summary of Payments and W-2s","2-15"],
    KS:["Kansas","Form KW-5","Q25","Form K-CNS 100","Q","Form KW-3 and W-2s","1-31"],
    KY:["Kentucky","Form K-1","Q","Form UI-3","Q","Form K-5 and W-2s","1-31"],
    LA:["Louisiana","Form L-1","Q","Form LWC ES-4","Q","Form L-3 and W-2s","1-31"],
    ME:["Maine","Form 941ME","Q","Form ME UC-1","Q","W-2s","1-31"],
    MD:["Maryland","Form MW506","Q15","Form DUI 15","Q","Form MW508 and W-2s","1-31"],
    MA:["Massachusetts","Form M-941","Q","Employment and Wage Detail Report","Q","Form M-3 and W-2s","1-31"],
    MI:["Michigan","Form 5080","Q20","Form UIA 1028","Q25","W-2s","1-31"],
    MN:["Minnesota","Quarterly withholding return","Q","Wage detail report","Q","W-2s","1-31"],
    MS:["Mississippi","Form 89-105","Q15","Form UI-2/3","Q","Form 89-140 and W-2s","1-31"],
    MO:["Missouri","Form MO-941","Q","Form MODES-4","Q","Form MO W-3 and W-2s","1-31"],
    MT:["Montana","Form MW-1","M15","Form UI-5","Q","Form MW-3 and W-2s","1-31"],
    NE:["Nebraska","Form 941N","Q","Forms UI 11T and UI 11W","Q","Form W-3N and W-2s","1-31"],
    NV:["Nevada","","","Form NUCS-4072","Q","",""],
    NH:["New Hampshire","","","Form DES 200","Q","",""],
    NJ:["New Jersey","Forms NJ-927 and WR-30","C30","","","Form NJ-W-3 and W-2s","2-15"],
    NM:["New Mexico","Form TRD-41414","M25","Form ES-903A","Q","W-2s","1-31"],
    NY:["New York","Form NYS-45","C","","","",""],
    NC:["North Carolina","Form NC-5Q","Q","Form NCUI 101","Q","Form NC-3 and W-2s","1-31"],
    ND:["North Dakota","Form 306","Q","Form SFN 41263","Q","Form 307 and W-2s","1-31"],
    OH:["Ohio","Form IT 501","Q","Quarterly wage report (JFS 20125)","Q","Forms IT 941 and IT 3 with W-2s","1-31"],
    OK:["Oklahoma","Form WTH 10001","Q20","Form OES-3","Q","W-2s","1-31"],
    OR:["Oregon","Form OQ","C","","","Form OR-WR and W-2s","1-31"],
    PA:["Pennsylvania","Form PA-W3","Q","Forms UC-2 and UC-2A","Q","Form REV-1667 and W-2s","1-31"],
    RI:["Rhode Island","Form RI-941","Q","Form TX-17","Q","Form RI-W3 and W-2s","1-31"],
    SC:["South Carolina","Form WH-1605 (WH-1606 for the fourth quarter)","Q","Form UCE-120","Q","Form WH-1606 and W-2s","1-31"],
    SD:["South Dakota","","","Form 21","Q","",""],
    TN:["Tennessee","","","Forms LB-0456 and LB-0851","Q","",""],
    TX:["Texas","","","Form C-3","Q","",""],
    UT:["Utah","Form TC-941E","Q","Form 33H","Q","Annual reconciliation and W-2s","1-31"],
    VT:["Vermont","Form WHT-436","Q25","Form C-101","Q","Form WHT-434 and W-2s","1-31"],
    VA:["Virginia","Form VA-5","Q","Forms FC-20 and FC-21","Q","Form VA-6 and W-2s","1-31"],
    WA:["Washington","","","Quarterly unemployment tax and wage report","Q","",""],
    WV:["West Virginia","Form IT-101Q","Q","Form WVUC-A-154","Q","Form IT-103 and W-2s","1-31"],
    WI:["Wisconsin","Form WT-6","Q","Form UCT-101","Q","Form WT-7 and W-2s","1-31"],
    WY:["Wyoming","","","Form WYO-056","Q","",""]
  };
  /* Named agencies for the office states and the combined-return states: [revenue, unemployment] */
  var AG = {
    TX:["","Texas Workforce Commission"], MA:["Massachusetts Department of Revenue","Massachusetts Department of Unemployment Assistance"],
    VA:["Virginia Tax","Virginia Employment Commission"], AZ:["Arizona Department of Revenue","Arizona Department of Economic Security"],
    CA:["California Employment Development Department"], NY:["New York State Department of Taxation and Finance"],
    NJ:["New Jersey Division of Revenue and Enterprise Services"], OR:["Oregon Department of Revenue and Oregon Employment Department"],
    FL:["","Florida Department of Revenue"], WA:["","Washington Employment Security Department"]
  };
  var COMBO = {
    CA:["Quarterly payroll tax return and wage report", "One filing covers income tax withholding, unemployment insurance, the Employment Training Tax and State Disability Insurance."],
    NY:["Quarterly combined withholding, wage reporting and unemployment return", "One filing covers state, New York City and Yonkers withholding plus unemployment insurance."],
    NJ:["Quarterly withholding, unemployment and wage report", "Also carries temporary disability and family leave insurance contributions."],
    OR:["Oregon quarterly combined tax report", "One filing covers withholding, unemployment, Paid Leave Oregon, the statewide transit tax and the Workers' Benefit Fund."]
  };
  var OFFICES = { TX:"Headquarters in Plano, office in Dallas", MA:"Office in Boston", VA:"Office in Herndon", AZ:"Office in Phoenix" };
  var FREQ = "Shown at this cadence for the sample profile. The state assigns each employer's deposit frequency from its withholding volume, and the assigned frequency is kept in the account register.";

  Object.keys(ST).forEach(function(c){
    var s = ST[c], j = "US-" + c, ag = AG[c] || [];
    var rev = ag[0] || s[0] + " revenue department", ui = ag[1] || ag[0] || s[0] + " unemployment insurance agency";
    jur(j, s[0], "state", { abbr:c, wh:s[1], whr:s[2], ui:s[3], office:OFFICES[c] || "", noTax:!s[1] });
    var whr = s[2];
    if(whr.charAt(0) === "C"){
      var cr = whr === "C30" ? "Q30" : "Q";
      eachQuarter(function(y, q, p){
        put(j, "combo", COMBO[c][0], qDue(y, q, cr), "next", { cat:"return", form:s[1], agency:rev, period:p, rule:qRule(cr), note:COMBO[c][1] });
      });
    } else if(whr.charAt(0) === "Q"){
      eachQuarter(function(y, q, p){
        put(j, "wh", "State income tax withholding return", qDue(y, q, whr), "next", { cat:"return", form:s[1], agency:rev, period:p, rule:qRule(whr), note:FREQ });
      });
    } else if(whr.charAt(0) === "M"){
      var md = +whr.slice(1);
      eachMonth(function(y, m, p){
        put(j, "wh", "State income tax withholding return and payment", mDue(y, m, md), "next", { cat:"deposit", form:s[1], agency:rev, period:p,
          rule:"Monthly: due the " + md + "th of the following month.", note:c === "IN" ? "Employers averaging more than $1,000 a month in withholding file by the 20th. Smaller filers have 30 days after month-end." : FREQ });
      });
    }
    if(s[3]){
      eachQuarter(function(y, q, p){
        put(j, "ui", "State unemployment tax and wage report", qDue(y, q, s[4]), "next", { cat:"return", form:s[3], agency:ui, period:p, rule:qRule(s[4]),
          note:c === "WY" ? "One report covers unemployment insurance and workers' compensation." : c === "RI" ? "Also carries Temporary Disability Insurance and the Job Development Fund." : c === "DC" ? "Paid Family Leave contributions are reported on the same schedule." : "" });
      });
    }
    if(s[5]){
      var md2 = s[6].split("-");
      eachYear(function(y){
        put(j, "ann", "Annual withholding reconciliation and state W-2 filing", D(y, +md2[0], +md2[1]), "next", { cat:"yearend", form:s[5], agency:rev, period:"Tax year " + (y - 1),
          rule:"Due " + MONTHS[+md2[0] - 1] + " " + md2[1] + ". State wage and withholding totals must tie to the quarterly returns." });
      });
    }
  });

  /* State programs beyond withholding and unemployment */
  (function(){
    function q(j, key, title, form, agency, rule, note){
      eachQuarter(function(y, qq, p){ put(j, key, title, qDue(y, qq, "Q"), "next", { cat:"return", form:form, agency:agency, period:p, rule:rule || qRule("Q"), note:note || "" }); });
    }
    q("US-WA", "pfml", "Paid Family and Medical Leave and WA Cares premiums", "Quarterly premium report", "Washington Employment Security Department");
    q("US-WA", "lni", "Workers' compensation quarterly report", "Quarterly report of hours and premiums", "Washington Department of Labor and Industries");
    q("US-MA", "pfml", "Paid Family and Medical Leave contributions", "Quarterly PFML return on MassTaxConnect", "Massachusetts Department of Revenue");
    q("US-CT", "pfml", "Paid Leave contributions", "Quarterly contribution report", "Connecticut Paid Leave Authority");
    q("US-CO", "famli", "FAMLI premiums and wage report", "Quarterly report on My FAMLI+ Employer", "Colorado FAMLI Division");
    q("US-DE", "pfml", "Paid Leave contributions and wage report", "Quarterly hours and wage submission", "Delaware Division of Paid Leave");
    q("US-MN", "pfml", "Paid Leave premiums", "Quarterly premium payment with the wage detail report", "Minnesota Department of Employment and Economic Development");
    q("US-ME", "pfml", "Paid Family and Medical Leave contributions", "Quarterly contribution report", "Maine Department of Labor");
    q("US-NV", "mbt", "Modified Business Tax return", "Form TXR-020.05", "Nevada Department of Taxation", "", "A payroll-based tax on gross wages, less health care deductions.");
    q("US-NM", "wc", "Workers' Compensation Fee", "Form WC-1", "New Mexico Taxation and Revenue Department");
    eachMonth(function(y, m, p){
      if(m % 3 === 0) return;
      put("US-IL", "uim", "Monthly unemployment wage report", mDue(y, m, "E"), "next", { cat:"return", form:"Form UI-3/40 monthly wage report", agency:"Illinois Department of Employment Security", period:p,
        rule:"Employers with 25 or more employees report wages monthly, due the last day of the following month. The third month is covered by the quarterly report." });
    });
    eachYear(function(y){
      put("US-MI", "5081", "Annual withholding return", eom(y, 2), "next", { cat:"yearend", form:"Form 5081", agency:"Michigan Department of Treasury", period:"Tax year " + (y - 1), rule:"Due February 28." });
      put("US-OH", "bwc", "Workers' compensation payroll true-up", D(y,8,15), "next", { cat:"report", form:"BWC payroll true-up report", agency:"Ohio Bureau of Workers' Compensation", period:"Policy year ended June 30, " + y,
        rule:"Actual payroll for the policy year is reported by August 15." });
      put("US-MA", "eeo", "Workforce demographic (EEO-1) report to the state", D(y,2,1), "next", { cat:"report", form:"Copy of the federal EEO-1 report", agency:"Secretary of the Commonwealth", period:"Prior-year report",
        rule:"Massachusetts employers with 100 or more employees submit their most recent EEO-1 report by February 1." });
      put("US-CA", "paydata", "California pay data report", nthDow(y,5,2,3), "none", { cat:"report", form:"Payroll employee and labor contractor employee reports", agency:"California Civil Rights Department", period:"Reporting year " + (y - 1),
        rule:"Employers with 100 or more employees, including workers hired through labor contractors, report by the second Wednesday of May." });
      [["US-TX",7,1],["US-MA",11,1],["US-VA",11,1],["US-AZ",11,1],["US-CA",11,1],["US-NY",3,10]].forEach(function(u){
        put(u[0], "ucp", "Unclaimed wages report (uncashed paychecks)", D(y, u[1], u[2]), "next", { cat:"report", form:"Annual unclaimed property holder report", agency:"State unclaimed property office", period:"Report year " + y,
          rule:"Uncashed paychecks past the dormancy period are reported to the state by " + MONTHS[u[1] - 1] + " " + u[2] + "." });
      });
    });
  })();

  /* =====================================================================
     LOCAL
     ===================================================================== */
  (function(){
    function ohio(code, name, agency, mForm, aForm){
      if(!JUR[code]) jur(code, name, "local", { state:"OH", agency:agency });
      eachMonth(function(y, m, p){
        put(code, "wh", "City income tax withholding", mDue(y, m, 15), "next", { cat:"deposit", form:mForm, period:p,
          rule:"Ohio's uniform municipal rule: monthly filers pay by the 15th of the following month. Smaller employers file quarterly by the last day of the next month." });
      });
      eachYear(function(y){
        put(code, "rec", "Annual city W-2 reconciliation", eom(y, 2), "next", { cat:"yearend", form:aForm, period:"Tax year " + (y - 1), rule:"Due the last day of February." });
      });
    }
    function quarterly(code, key, title, form, rule, note){
      eachQuarter(function(y, q, p){ put(code, key, title, qDue(y, q, "Q"), "next", { cat:"return", form:form, period:p, rule:rule || qRule("Q"), note:note || "" }); });
    }
    function annual(code, key, title, form, m, d, rule){
      eachYear(function(y){ put(code, key, title, d ? D(y, m, d) : eom(y, m), "next", { cat:"yearend", form:form, period:"Tax year " + (y - 1), rule:rule }); });
    }
    ohio("L-CLE", "Cleveland, OH", "Central Collection Agency (CCA)", "CCA monthly withholding deposit", "CCA Form W-3 reconciliation");
    ohio("L-CIN", "Cincinnati, OH", "City of Cincinnati Income Tax Division", "Monthly withholding return", "Form W-3 reconciliation");
    ohio("L-RITA", "RITA member municipalities, OH", "Regional Income Tax Agency (RITA)", "RITA Form 11", "RITA Form 17 reconciliation");
    /* Columbus is added to the live calendar when its accounts are verified in the Controls scenario */
    jur("L-COL", "Columbus, OH", "local", { state:"OH", agency:"Columbus City Auditor, Income Tax Division", pending:true });
    OUT = COLUMBUS; ohio("L-COL", "Columbus, OH", "", "Form IT-15", "Form IT-13 reconciliation"); OUT = ITEMS;

    jur("L-PA", "Pennsylvania municipalities (Act 32)", "local", { state:"PA", agency:"Local tax collector for each tax collection district" });
    quarterly("L-PA", "eit", "Local earned income tax return and payment", "Quarterly EIT return", "Due within 30 days after the quarter ends. Collectors publish April 30, July 31, October 31 and January 31.");
    quarterly("L-PA", "lst", "Local services tax return and payment", "Quarterly LST return", "Due within 30 days after the quarter ends, on the same dates as the earned income tax.");
    annual("L-PA", "rec", "Annual local W-2 reconciliation", "Form W2-R with W-2s", 2, 0, "Due the last day of February.");

    jur("L-PHL", "Philadelphia, PA", "local", { state:"PA", agency:"Philadelphia Department of Revenue" });
    quarterly("L-PHL", "wage", "Wage Tax quarterly return", "Quarterly Wage Tax return on the Philadelphia Tax Center", "", "The fourth-quarter return is the final reconciliation. Philadelphia no longer takes a separate annual return.");

    jur("L-NYC", "New York City and Yonkers, NY", "local", { state:"NY", agency:"New York State Department of Taxation and Finance" });
    quarterly("L-NYC", "wh", "City resident withholding reported", "Form NYS-45, Part B", "", "New York City and Yonkers withholding is reported on the state's combined quarterly return.");
    jur("L-MCTMT", "Metropolitan commuter district, NY", "local", { state:"NY", agency:"New York State Department of Taxation and Finance" });
    quarterly("L-MCTMT", "mctmt", "Metropolitan commuter transportation mobility tax", "Form MTA-305", "", "A payroll-expense tax on employers in New York City and the surrounding MCTD counties.");

    jur("L-LOU", "Louisville Metro, KY", "local", { state:"KY", agency:"Louisville Metro Revenue Commission" });
    quarterly("L-LOU", "ol", "Occupational license fee withholding", "Form OL-3");
    annual("L-LOU", "rec", "Annual occupational fee reconciliation", "Form W-3 with W-2s", 2, 0, "Due the last day of February.");
    jur("L-LEX", "Lexington-Fayette, KY", "local", { state:"KY", agency:"Lexington-Fayette Urban County Government, Division of Revenue" });
    quarterly("L-LEX", "ol", "Occupational license fee withholding", "Form 228");
    annual("L-LEX", "rec", "Annual occupational fee reconciliation", "Form 222 with W-2s", 2, 0, "Due the last day of February.");

    jur("L-KC", "Kansas City, MO", "local", { state:"MO", agency:"Kansas City Revenue Division" });
    quarterly("L-KC", "earn", "Earnings tax withheld", "Form RD-110", "", "Required every quarter, even when nothing was withheld.");
    annual("L-KC", "rec", "Annual earnings tax reconciliation", "Form RD-113 with W-2s", 1, 31, "Due January 31, filed electronically.");
    jur("L-STL", "St. Louis, MO", "local", { state:"MO", agency:"St. Louis Collector of Revenue" });
    quarterly("L-STL", "earn", "Earnings tax withheld", "Form W-10");
    quarterly("L-STL", "pet", "Payroll expense tax", "Form P-10", "", "An employer-paid tax of 0.5% of wages, filed with Form W-10.");
    annual("L-STL", "rec", "Annual earnings tax reconciliation", "Form W-3 with W-2s", 1, 31, "Due January 31.");

    jur("L-DEN", "Denver, CO", "local", { state:"CO", agency:"Denver Treasury Division" });
    eachMonth(function(y, m, p){
      put("L-DEN", "opt", "Occupational privilege tax", mDue(y, m, "E"), "next", { cat:"deposit", form:"Occupational Privilege Tax return", period:p,
        rule:"Due the last day of the month after the reporting period.", note:"A flat monthly tax per employee, part withheld and part employer-paid." });
    });

    jur("L-PDX", "Portland Metro and Multnomah County, OR", "local", { state:"OR", agency:"City of Portland Revenue Division" });
    quarterly("L-PDX", "shs", "Supportive Housing Services and Preschool for All withholding", "Quarterly withholding return", "", "An annual withholding reconciliation return follows after year-end.");
    jur("L-TRIMET", "TriMet transit district, OR", "local", { state:"OR", agency:"Oregon Department of Revenue" });
    quarterly("L-TRIMET", "transit", "Transit district payroll tax", "Form OQ", "", "Reported on Oregon's combined quarterly report.");

    jur("L-SEA", "Seattle, WA", "local", { state:"WA", agency:"Seattle Finance and Administrative Services" });
    quarterly("L-SEA", "pet", "Payroll expense tax", "Seattle payroll expense tax return", "", "Applies above the city's annual payroll threshold. The fourth-quarter return uses a separate form.");
  })();

  /* =====================================================================
     GLOBAL (nine sample countries)
     Dates adjust for weekends by each country's rule. Local public holidays are confirmed by the in-country vendor.
     ===================================================================== */
  (function(){
    var WK = "Adjusted for weekends. Local public holidays are confirmed with the in-country vendor.";
    function monthly(j, key, title, day, mode, o){
      eachMonth(function(y, m, p){ var x = {}, k; for(k in o) x[k] = o[k]; x.period = p; put(j, key, title, mDue(y, m, day), mode, x); });
    }
    function yearly(j, key, title, m, d, mode, o, periodFn){
      eachYear(function(y){ var x = {}, k; for(k in o) x[k] = o[k]; x.period = periodFn ? periodFn(y) : "Tax year " + (y - 1); put(j, key, title, d ? D(y, m, d) : eom(y, m), mode, x); });
    }

    /* Canada */
    jur("INT-CA", "Canada", "global", { abbr:"CA", agency:"Canada Revenue Agency", url:"https://www.canada.ca/en/revenue-agency.html", note:"Records of Employment are issued within five calendar days after an interruption of earnings." });
    monthly("INT-CA", "pd7a", "Payroll source deductions remitted", 15, "wknext", { cat:"deposit", form:"PD7A remittance of income tax, CPP and EI", rule:"Regular remitters pay by the 15th of the month after the pay month. " + WK });
    monthly("INT-CA", "eht", "Ontario Employer Health Tax instalment", 15, "wknext", { cat:"deposit", form:"EHT monthly instalment", agency:"Ontario Ministry of Finance", rule:"Due the 15th of the following month. " + WK });
    monthly("INT-CA", "wsib", "Ontario WSIB premiums", "E", "wknext", { cat:"deposit", form:"WSIB premium remittance", agency:"Workplace Safety and Insurance Board", rule:"Monthly reporters pay by the last day of the following month. " + WK });
    yearly("INT-CA", "t4", "T4 slips and T4 Summary", 2, 0, "wknext", { cat:"yearend", form:"T4 slips and T4 Summary", rule:"Due to employees and the CRA by the last day of February." });
    yearly("INT-CA", "ehta", "Ontario Employer Health Tax annual return", 3, 15, "wknext", { cat:"yearend", form:"EHT annual return", agency:"Ontario Ministry of Finance", rule:"Due March 15." });
    yearly("INT-CA", "wsiba", "Ontario WSIB annual reconciliation", 3, 31, "wknext", { cat:"yearend", form:"WSIB reconciliation", agency:"Workplace Safety and Insurance Board", rule:"Due March 31." });

    /* Mexico */
    jur("INT-MX", "Mexico", "global", { abbr:"MX", agency:"SAT and IMSS", url:"https://www.sat.gob.mx" });
    monthly("INT-MX", "isr", "Wage income tax (ISR) withholding remitted", 17, "wknext", { cat:"deposit", form:"Monthly ISR withholding return", agency:"SAT", rule:"Due the 17th of the following month. " + WK });
    monthly("INT-MX", "imss", "IMSS social security contributions", 17, "wknext", { cat:"deposit", form:"IMSS monthly contributions (SUA)", agency:"IMSS", rule:"Due the 17th of the following month. " + WK });
    monthly("INT-MX", "isn", "State payroll tax (Mexico City)", 17, "wknext", { cat:"deposit", form:"Impuesto sobre nóminas", agency:"Mexico City Secretariat of Finance", rule:"Due the 17th of the following month. " + WK });
    eachYear(function(y){
      [1,3,5,7,9,11].forEach(function(m){
        put("INT-MX", "infonavit", "INFONAVIT housing and retirement contributions", D(y, m, 17), "wknext", { cat:"deposit", form:"Bimonthly contributions (SUA)", agency:"INFONAVIT and IMSS", period:"Two months ended " + MONTHS[(m + 10) % 12],
          rule:"Paid every two months, by the 17th of the month after the period. " + WK });
      });
      [1,5,9].forEach(function(m){
        put("INT-MX", "repse", "REPSE specialized services reports", D(y, m, 17), "wknext", { cat:"report", form:"ICSOE to IMSS and SISUB to INFONAVIT", agency:"IMSS and INFONAVIT", period:"Four months ended " + MONTHS[(m + 10) % 12],
          rule:"Registered providers of specialized services report their contracts every four months, by the 17th of January, May and September." });
      });
      put("INT-MX", "prima", "Annual work-risk premium determination", eom(y, 2), "wknext", { cat:"yearend", form:"Determinación de la prima de riesgo", agency:"IMSS", period:"Calendar year " + (y - 1), rule:"Filed in February." });
      put("INT-MX", "ptu", "Employee profit sharing (PTU) paid", D(y,5,30), "wkprev", { cat:"deposit", form:"PTU payment", agency:"Federal Labor Law", period:"Fiscal year " + (y - 1), rule:"Companies pay profit sharing by May 30." });
      put("INT-MX", "aguinaldo", "Year-end bonus (aguinaldo) paid", D(y,12,20), "wkprev", { cat:"deposit", form:"Aguinaldo payment", agency:"Federal Labor Law", period:"Calendar year " + y, rule:"At least 15 days of pay, due by December 20." });
    });

    /* United Kingdom */
    jur("INT-UK", "United Kingdom", "global", { abbr:"UK", agency:"HM Revenue and Customs", url:"https://www.gov.uk/running-payroll" });
    eachMonth(function(y, m, p){
      var pay = prevWk(eom(y, m));
      put("INT-UK", "fps", "Full Payment Submission sent on or before payday", pay, "none", { cat:"return", form:"RTI Full Payment Submission", period:p, rule:"Sent to HMRC on or before each payday. The sample profile pays monthly on the last working day." });
      put("INT-UK", "paye", "PAYE and National Insurance paid", D(y, m + 1, 22), "wkprev", { cat:"deposit", form:"Electronic PAYE payment", period:"Tax month ended " + fmtMD(D(y, m + 1, 5)),
        rule:"Electronic payment must clear by the 22nd. When the 22nd falls on a weekend, it must clear by the last working day before." });
      put("INT-UK", "eps", "Employer Payment Summary", D(y, m + 1, 19), "none", { cat:"return", form:"RTI Employer Payment Summary", period:"Tax month ended " + fmtMD(D(y, m + 1, 5)), rule:"Sent by the 19th when there are statutory pay recoveries or no payments to report." });
      put("INT-UK", "pension", "Workplace pension contributions paid to the scheme", D(y, m + 1, 22), "wkprev", { cat:"deposit", form:"Auto-enrolment contributions", agency:"The Pensions Regulator", period:p, rule:"Deductions reach the scheme by the 22nd of the following month when paid electronically." });
    });
    eachYear(function(y){
      var TY = "Tax year ended April 5, " + y;
      put("INT-UK", "p60", "P60 certificates to employees", D(y,5,31), "wkprev", { cat:"yearend", form:"Form P60", period:TY, rule:"Due by May 31." });
      put("INT-UK", "p11d", "P11D and P11D(b) benefits returns", D(y,7,6), "none", { cat:"yearend", form:"Forms P11D and P11D(b)", period:TY, rule:"Due by July 6." });
      put("INT-UK", "c1a", "Class 1A National Insurance paid", D(y,7,22), "wkprev", { cat:"deposit", form:"Class 1A NIC payment", period:TY, rule:"Electronic payment clears by July 22." });
    });

    /* Ireland */
    jur("INT-IE", "Ireland", "global", { abbr:"IE", agency:"Revenue", url:"https://www.revenue.ie", note:"Pension auto-enrolment contributions run through payroll each pay date." });
    eachMonth(function(y, m, p){
      put("INT-IE", "psr", "Payroll submission sent on or before pay date", prevWk(eom(y, m)), "none", { cat:"return", form:"Payroll Submission Request", period:p, rule:"Reported to Revenue on or before each pay date. The sample profile pays monthly on the last working day." });
      put("INT-IE", "ros", "Monthly PAYE, PRSI and USC return and payment", D(y, m + 1, 23), "wkprev", { cat:"deposit", form:"Monthly statement accepted on ROS", period:p, rule:"Due the 23rd of the following month when filed and paid through ROS, or the 14th otherwise." });
    });

    /* Germany */
    jur("INT-DE", "Germany", "global", { abbr:"DE", agency:"Tax office and statutory health funds", url:"https://www.elster.de" });
    eachMonth(function(y, m, p){
      put("INT-DE", "lst", "Wage tax return and payment", D(y, m + 1, 10), "wknext", { cat:"deposit", form:"Lohnsteuer-Anmeldung", agency:"Tax office (Finanzamt)", period:p, rule:"Due the 10th of the following month. " + WK });
      put("INT-DE", "bn", "Social insurance contribution statement", nthLastBankDE(y, m, 5), "none", { cat:"return", form:"Beitragsnachweis", agency:"Statutory health funds", period:p, rule:"Must reach each health fund by the start of the fifth-last bank working day of the month." });
      put("INT-DE", "sv", "Social insurance contributions paid", nthLastBankDE(y, m, 3), "none", { cat:"deposit", form:"Sozialversicherungsbeiträge", agency:"Statutory health funds", period:p, rule:"Due the third-last bank working day of the current month, counted on nationwide bank holidays." });
    });
    eachYear(function(y){
      var CY = "Calendar year " + (y - 1);
      put("INT-DE", "jm", "Annual social insurance report", D(y,2,15), "wknext", { cat:"yearend", form:"DEÜV-Jahresmeldung", agency:"Statutory health funds", period:CY, rule:"Due February 15." });
      put("INT-DE", "uv", "Accident insurance wage report", D(y,2,16), "wknext", { cat:"yearend", form:"Digitaler Lohnnachweis", agency:"Berufsgenossenschaft", period:CY, rule:"Due February 16." });
      put("INT-DE", "lstb", "Annual wage tax certificates transmitted", eom(y, 2), "wknext", { cat:"yearend", form:"Lohnsteuerbescheinigung", agency:"Tax office (Finanzamt)", period:CY, rule:"Transmitted electronically by the last day of February." });
      put("INT-DE", "sb", "Disabled employment report", D(y,3,31), "wknext", { cat:"report", form:"Anzeige nach SGB IX", agency:"Federal Employment Agency", period:CY, rule:"Employers with 20 or more positions report by March 31." });
    });

    /* India */
    jur("INT-IN", "India", "global", { abbr:"IN", agency:"Income Tax Department, EPFO and ESIC", url:"https://www.incometax.gov.in" });
    eachMonth(function(y, m, p){
      put("INT-IN", "tds", "Salary tax (TDS) deposited", m === 3 ? D(y,4,30) : D(y, m + 1, 7), "wknext", { cat:"deposit", form:"TDS challan", agency:"Income Tax Department", period:p,
        rule:m === 3 ? "Tax deducted in March is deposited by April 30." : "Due the 7th of the following month. " + WK });
      put("INT-IN", "pf", "Provident fund contributions and return", D(y, m + 1, 15), "wknext", { cat:"deposit", form:"EPF Electronic Challan cum Return", agency:"EPFO", period:p, rule:"Due the 15th of the following month. " + WK });
      put("INT-IN", "esi", "Employees' State Insurance contributions", D(y, m + 1, 15), "wknext", { cat:"deposit", form:"ESI challan", agency:"ESIC", period:p, rule:"Due the 15th of the following month. " + WK });
      put("INT-IN", "pt", "Professional tax (Karnataka)", D(y, m + 1, 20), "wknext", { cat:"deposit", form:"Form 5-A monthly return", agency:"Karnataka Commercial Taxes Department", period:p, rule:"Due the 20th of the following month. " + WK });
    });
    eachYear(function(y){
      [[7,31,"April to June " + y],[10,31,"July to September " + y],[1,31,"October to December " + (y - 1)],[5,31,"January to March " + y]].forEach(function(s){
        put("INT-IN", "q", "Quarterly salary TDS statement", D(y, s[0], s[1]), "wknext", { cat:"return", form:"Form 138 (formerly Form 24Q)", agency:"Income Tax Department", period:s[2],
          rule:"Due July 31, October 31, January 31 and May 31. Form numbers changed on April 1, 2026 under the Income-tax Act, 2025." });
      });
      put("INT-IN", "f16", "Annual salary tax certificates to employees", D(y,6,15), "wknext", { cat:"yearend", form:"Form 130 (formerly Form 16)", agency:"Income Tax Department", period:"Tax year ended March 31, " + y, rule:"Issued by June 15." });
      put("INT-IN", "lwf", "Labour Welfare Fund contribution (Karnataka)", D(y,1,15), "wknext", { cat:"deposit", form:"Form D", agency:"Karnataka Labour Welfare Board", period:"Calendar year " + (y - 1), rule:"Paid once a year, by January 15." });
      put("INT-IN", "bonus", "Statutory bonus paid", D(y,11,30), "wkprev", { cat:"deposit", form:"Payment of Bonus Act", agency:"Labour Department", period:"Financial year ended March 31, " + y, rule:"Paid within eight months after the financial year closes." });
    });

    /* Philippines */
    jur("INT-PH", "Philippines", "global", { abbr:"PH", agency:"BIR, SSS, PhilHealth and Pag-IBIG", url:"https://www.bir.gov.ph" });
    eachMonth(function(y, m, p){
      put("INT-PH", "1601c", "Withholding tax on compensation remitted", m === 12 ? D(y + 1, 1, 15) : D(y, m + 1, 10), "wknext", { cat:"deposit", form:"BIR Form 1601-C", agency:"Bureau of Internal Revenue", period:p,
        rule:m === 12 ? "The December return is due January 15." : "Due the 10th of the following month. Electronic filers are staggered through the 15th by filer group." });
      put("INT-PH", "sss", "SSS contributions", mDue(y, m, "E"), "wkprev", { cat:"deposit", form:"SSS contribution payment", agency:"Social Security System", period:p, rule:"Due the last day of the following month." });
      put("INT-PH", "phic", "PhilHealth premiums", D(y, m + 1, 15), "wkprev", { cat:"deposit", form:"PhilHealth remittance (EPRS)", agency:"PhilHealth", period:p, rule:"The payment window is set by the last digit of the employer number: the 11th to 15th, or the 16th to 20th, of the following month. The sample profile uses the first window." });
      put("INT-PH", "hdmf", "Pag-IBIG contributions", D(y, m + 1, 14), "wkprev", { cat:"deposit", form:"Pag-IBIG remittance", agency:"Pag-IBIG Fund", period:p, rule:"The payment window is set by the first letter of the employer name. Names starting A to D pay by the 14th of the following month." });
    });
    eachYear(function(y){
      var CY = "Calendar year " + (y - 1);
      put("INT-PH", "13th", "13th-month pay", D(y,12,24), "wkprev", { cat:"deposit", form:"13th-month pay", agency:"Department of Labor and Employment", period:"Calendar year " + y, rule:"Paid on or before December 24." });
      put("INT-PH", "dole", "13th-month pay compliance report", D(y,1,15), "wknext", { cat:"report", form:"Compliance report", agency:"Department of Labor and Employment", period:CY, rule:"Due January 15." });
      put("INT-PH", "1604c", "Annual withholding return and employee list", D(y,1,31), "wknext", { cat:"yearend", form:"BIR Form 1604-C with alphalist", agency:"Bureau of Internal Revenue", period:CY, rule:"Due January 31." });
      put("INT-PH", "2316", "Certificates of compensation to employees", D(y,1,31), "wkprev", { cat:"yearend", form:"BIR Form 2316", agency:"Bureau of Internal Revenue", period:CY, rule:"Issued to employees by January 31." });
      put("INT-PH", "2316s", "Certificates of compensation submitted", D(y,2,28), "wknext", { cat:"yearend", form:"BIR Form 2316 duplicates", agency:"Bureau of Internal Revenue", period:CY, rule:"Signed duplicates are submitted by February 28." });
    });

    /* Singapore */
    jur("INT-SG", "Singapore", "global", { abbr:"SG", agency:"CPF Board, IRAS and Ministry of Manpower", url:"https://www.cpf.gov.sg" });
    monthly("INT-SG", "cpf", "CPF contributions and Skills Development Levy", 14, "wknext", { cat:"deposit", form:"CPF EZPay submission", agency:"CPF Board", rule:"Due the 14th of the following month, or the next working day when the 14th falls on a weekend or public holiday." });
    monthly("INT-SG", "fwl", "Foreign Worker Levy", 14, "wknext", { cat:"deposit", form:"Foreign Worker Levy payment", agency:"Ministry of Manpower", rule:"Due the 14th of the following month. GIRO deducts on the 17th." });
    yearly("INT-SG", "ir8a", "Employee income records submitted", 3, 1, "wknext", { cat:"yearend", form:"Form IR8A through the Auto-Inclusion Scheme", agency:"IRAS", rule:"Due March 1." }, function(y){ return "Calendar year " + (y - 1); });

    /* Australia */
    jur("INT-AU", "Australia", "global", { abbr:"AU", agency:"Australian Taxation Office", url:"https://www.ato.gov.au", note:"Payday Super began on July 1, 2026. Super now follows every payday instead of every quarter." });
    eachMonth(function(y, m, p){
      var pay = prevWk(D(y, m, 15));
      put("INT-AU", "stp", "Single Touch Payroll event sent on or before payday", pay, "none", { cat:"return", form:"STP pay event", period:p, rule:"Reported to the ATO on or before each payday. The sample profile pays monthly on the 15th." });
      put("INT-AU", "super", "Superannuation received by the funds", addWk(pay, 7), "none", { cat:"deposit", form:"Superannuation guarantee contributions", period:"Payday " + fmtMD(pay), rule:"Under Payday Super, contributions must reach each employee's fund within 7 business days of payday." });
      put("INT-AU", "payg", "PAYG withholding paid", D(y, m + 1, 21), "wknext", { cat:"deposit", form:"Activity statement, PAYG withholding", period:p, rule:"Medium withholders pay monthly, by the 21st of the following month. " + WK });
      put("INT-AU", "ptax", "Payroll tax (New South Wales)", m === 6 ? D(y,7,28) : D(y, m + 1, 7), "wknext", { cat:"deposit", form:m === 6 ? "Annual reconciliation" : "Monthly payroll tax return", agency:"Revenue NSW", period:m === 6 ? "Financial year ended June 30, " + y : p,
        rule:m === 6 ? "June is settled with the annual reconciliation, due July 28." : "Due the 7th of the following month. " + WK });
    });
    eachYear(function(y){
      put("INT-AU", "fbt", "Fringe benefits tax return", D(y,5,21), "wknext", { cat:"yearend", form:"FBT return", period:"FBT year ended March 31, " + y, rule:"Due May 21 when lodged directly." });
      put("INT-AU", "stpf", "Single Touch Payroll finalisation", D(y,7,14), "wknext", { cat:"yearend", form:"STP finalisation declaration", period:"Financial year ended June 30, " + y, rule:"Declared by July 14 so employees can lodge their tax returns." });
    });
  })();

  /* ---------- Sort and export ---------- */
  var LV = { federal:0, state:1, local:2, global:3 };
  function byDate(a, b){
    return a.date - b.date || LV[a.level] - LV[b.level] || (a.jurName < b.jurName ? -1 : a.jurName > b.jurName ? 1 : 0) || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);
  }
  ITEMS.sort(byDate); COLUMBUS.sort(byDate);

  window.PCM = {
    DAY:DAY, MONTHS:MONTHS, MON:MON, DOWS:DOWS, TODAY:TODAY, W0:W0, W1:W1,
    D:D, eom:eom, addDays:addDays, dow:dow, iso:iso, same:same, nextBiz:nextBiz, prevBiz:prevBiz, addBiz:addBiz,
    fmtLong:fmtLong, fmtShort:fmtShort, fmtMD:fmtMD, fmtMDY:fmtMDY,
    JUR:JUR, ITEMS:ITEMS, COLUMBUS:COLUMBUS, LEVELS:LEVELS, CATS:CATS, byDate:byDate, HOL:HOL
  };
})();
