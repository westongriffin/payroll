/* Payroll Control Monitor: wage and hour rules.
   Sources, each read in November 2026:
   - Minimum wage and overtime: U.S. Department of Labor, State Minimum Wage Laws (updated November 5, 2026)
   - January 1, 2027 rates: ADP, state minimum wage increases for January 1, 2027 (November 9, 2026)
   - Pay frequency: U.S. Department of Labor, State Payday Requirements (January 1, 2023)
   - Final pay: Nolo, Final Paycheck Laws by State (May 10, 2023)
   - Paid sick leave: Paycor, Paid Sick Leave Laws by State for 2026
   A rule matrix is a starting point. Each rule is confirmed with the state labor office before it is relied on. */
(function(){
  "use strict";
  var FED = "$7.25 (federal)", OT40 = "Weekly, over 40 hours", OTFED = "Federal rule: weekly, over 40 hours", PAY = "Next regular payday", NONE = "None required by the state";

  /* fd = how the discharge deadline is computed: imm, nbd (next business day), d:N calendar days, bd:N business days,
     pay (next payday), min:X (payday or X, whichever is sooner), max:X (whichever is later), none (no statute) */
  var S = {
    AL:{ mw:FED, ot:OTFED, pay:"Not specified", fired:"No state statute", quit:"No state statute", fd:"none", sick:NONE },
    AK:{ mw:"$14.00", ot:"Daily, over 8 hours; weekly, over 40", pay:"Semi-monthly or monthly", fired:"Within 3 working days", quit:"Next regular payday at least 3 days after notice", fd:"bd:3", sick:"1 hour per 30 worked, up to 56 hours a year (40 for employers under 15)" },
    AZ:{ mw:"$15.15", mw27:"$15.65", ot:OTFED, pay:"Two or more paydays a month, no more than 16 days apart", fired:"Within 7 working days or the next payday, whichever is sooner", quit:PAY, fd:"min:bd:7", sick:"1 hour per 30 worked, up to 40 hours a year (24 for employers under 15)" },
    AR:{ mw:"$11.00", ot:OT40, pay:"Semi-monthly", fired:PAY, quit:PAY, fd:"pay", sick:NONE },
    CA:{ mw:"$16.90", mw27:"$17.40", ot:"Daily, over 8 hours (double time over 12); weekly, over 40; seventh consecutive day", pay:"At least twice a month; weekly for some occupations", fired:"Immediately", quit:"Within 72 hours, or immediately with 72 hours' notice", fd:"imm", sick:"1 hour per 30 worked; 40 hours or 5 days a year" },
    CO:{ mw:"$15.16", mw27:"$15.71", ot:"Daily, over 12 hours; weekly, over 40", pay:"Monthly", fired:"Immediately", quit:"Next scheduled payday", fd:"imm", sick:"1 hour per 30 worked, up to 48 hours a year" },
    CT:{ mw:"$16.94", mw27:"$17.48", ot:OT40, pay:"Weekly, unless the labor commissioner approves longer", fired:"Next business day", quit:"Next scheduled payday", fd:"nbd", sick:"1 hour per 30 worked, up to 40 hours a year (employers with 11 or more)" },
    DE:{ mw:"$15.00", ot:OTFED, pay:"Monthly", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    DC:{ mw:"$18.40", ot:OT40, pay:"Semi-monthly", fired:"Next business day", quit:"Next scheduled payday or within 7 days, whichever is sooner", fd:"nbd", sick:"1 hour per 37 worked, up to 7 days a year (employers with 100 or more)" },
    FL:{ mw:"$15.00", ot:OTFED, pay:"Not specified", fired:"No state statute", quit:"No state statute", fd:"none", sick:NONE },
    GA:{ mw:FED, ot:OTFED, pay:"Semi-monthly", fired:"No state statute", quit:"No state statute", fd:"none", sick:NONE },
    HI:{ mw:"$16.00", ot:OT40, pay:"Semi-monthly; monthly by employee election", fired:"Immediately, or the next business day if conditions prevent it", quit:"Next scheduled payday, or immediately with one pay period's notice", fd:"imm", sick:NONE },
    ID:{ mw:"$7.25", ot:OTFED, pay:"Monthly", fired:"Next payday or within 10 business days, whichever is sooner", quit:"Next payday or within 10 business days, whichever is sooner", fd:"min:bd:10", sick:NONE },
    IL:{ mw:"$15.00", ot:OT40, pay:"Semi-monthly; monthly for exempt staff", fired:"At separation if possible, no later than the next payday", quit:"At separation if possible, no later than the next payday", fd:"pay", sick:"1 hour per 40 worked, up to 40 hours a year, for any reason" },
    IN:{ mw:"$7.25", ot:OT40, pay:"Bi-weekly or semi-monthly", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    IA:{ mw:"$7.25", ot:OTFED, pay:"At least monthly, on a regular schedule", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    KS:{ mw:"$7.25", ot:OTFED, pay:"Monthly", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    KY:{ mw:"$7.25", ot:"Weekly, over 40 hours; seventh day worked in a week", pay:"Semi-monthly", fired:"Next scheduled payday or within 14 days, whichever is later", quit:"Next scheduled payday or within 14 days, whichever is later", fd:"max:d:14", sick:NONE },
    LA:{ mw:FED, ot:OTFED, pay:"Bi-weekly or semi-monthly for certain employers", fired:"Next payday or within 15 days, whichever is earlier", quit:"Next payday or within 15 days, whichever is earlier", fd:"min:d:15", sick:NONE },
    ME:{ mw:"$15.10", mw27:"$15.70", ot:OT40, pay:"Regular intervals of no more than 16 days", fired:"Next scheduled payday or within 2 weeks of demand, whichever is earlier", quit:"Next scheduled payday or within 2 weeks of demand, whichever is earlier", fd:"pay", sick:"1 hour per 40 worked, up to 40 hours a year, for any reason (employers with 10 or more)" },
    MD:{ mw:"$15.00", ot:OT40, pay:"Bi-weekly or semi-monthly", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:"1 hour per 30 worked, up to 40 hours a year (employers with 15 or more)" },
    MA:{ mw:"$15.00", ot:OT40, pay:"Weekly or bi-weekly for hourly staff; semi-monthly for salaried", fired:"Day of discharge", quit:"Next payday", fd:"imm", sick:"1 hour per 30 worked, up to 40 hours a year" },
    MI:{ mw:"$13.73", mw27:"$15.00", ot:OT40, pay:"Depends on the occupation", fired:"Next payday", quit:"Next payday", fd:"pay", sick:"Up to 72 hours a year (40 for employers with 10 or fewer)" },
    MN:{ mw:"$11.41", mw27:"$11.87", ot:"Weekly, over 48 hours under state law", pay:"At least once every 31 days", fired:"Immediately upon the employee's demand", quit:"Next payday; later rules apply if it falls within 5 days", fd:"imm", sick:"1 hour per 30 worked, up to 48 hours a year" },
    MS:{ mw:FED, ot:OTFED, pay:"Bi-weekly or semi-monthly for certain employers", fired:"No state statute", quit:"No state statute", fd:"none", sick:NONE },
    MO:{ mw:"$15.00", ot:OT40, pay:"Semi-monthly", fired:"Day of discharge", quit:"No state deadline", fd:"imm", sick:"None required: the 2025 law was repealed on August 28, 2025" },
    MT:{ mw:"$10.85", mw27:"$11.20", ot:OT40, pay:"Not specified; semi-monthly is presumed", fired:"Immediately, unless a written policy extends it to the next payday or 15 days", quit:"Next payday or within 15 days, whichever is earlier", fd:"imm", sick:NONE },
    NE:{ mw:"$15.00", mw27:"$15.26", ot:OTFED, pay:"Payday designated by the employer", fired:"Next scheduled payday or within 2 weeks, whichever is earlier", quit:"Next payday or within 2 weeks, whichever is earlier", fd:"min:d:14", sick:"1 hour per 30 worked, up to 56 hours a year (40 for employers under 20)" },
    NV:{ mw:"$12.00", ot:"Daily, over 8 hours for employees paid under 1.5 times the minimum wage; weekly, over 40", pay:"Semi-monthly; monthly for exempt staff", fired:"Immediately", quit:"Next scheduled payday or within 7 days, whichever is earlier", fd:"imm", sick:"About 1 hour per 52 worked, up to 40 hours a year, for any reason (employers with 50 or more)" },
    NH:{ mw:"$7.25", ot:OT40, pay:"Weekly or bi-weekly; less often with state permission", fired:"Within 72 hours; next payday for a layoff", quit:"Next scheduled payday, or within 72 hours with one pay period's notice", fd:"d:3", sick:NONE },
    NJ:{ mw:"$15.92", mw27:"$16.48", ot:OT40, pay:"Semi-monthly; monthly for executives", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:"1 hour per 30 worked, up to 40 hours a year" },
    NM:{ mw:"$12.00", ot:OT40, pay:"Semi-monthly; monthly for exempt staff", fired:"Within 5 days", quit:"Next payday", fd:"d:5", sick:"1 hour per 30 worked, up to 64 hours a year" },
    NY:{ mw:"$17.00 in New York City, Long Island and Westchester; $16.00 elsewhere", ot:OT40, pay:"Weekly for manual workers; semi-monthly for others", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:"1 hour per 30 worked, up to 56 hours a year (40 for employers under 100)" },
    NC:{ mw:"$7.25", ot:OT40, pay:"Not specified; daily to monthly is allowed", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    ND:{ mw:"$7.25", ot:OT40, pay:"Monthly", fired:"Next payday", quit:"Next payday", fd:"pay", sick:NONE },
    OH:{ mw:"$11.00", mw27:"$11.40", ot:OT40, pay:"Semi-monthly", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    OK:{ mw:"$7.25", ot:OTFED, pay:"Semi-monthly", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    OR:{ mw:"$15.55 standard; $16.80 Portland metro; $14.55 non-urban counties", ot:"Weekly, over 40 hours; daily over 10 in mills and factories", pay:"Monthly", fired:"End of the first business day after termination", quit:"Immediately with 48 hours' notice; otherwise within 5 days or the next payday, whichever is first", fd:"nbd", sick:"1 hour per 30 worked, up to 40 hours a year (paid for employers with 10 or more)" },
    PA:{ mw:"$7.25", ot:OT40, pay:"Regular paydays set by the employer", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:"None statewide; Philadelphia, Pittsburgh and Allegheny County have local laws" },
    RI:{ mw:"$16.00", mw27:"$17.00", ot:OT40, pay:"Weekly; less often with state permission", fired:"Next scheduled payday; within 24 hours for a closure or relocation", quit:"Next scheduled payday", fd:"pay", sick:"1 hour per 35 worked, up to 40 hours a year (employers with 18 or more)" },
    SC:{ mw:FED, ot:OTFED, pay:"Set by the employer with written notice at hire", fired:"Within 48 hours or the next scheduled payday, not more than 30 days", quit:"Within 48 hours or the next scheduled payday, not more than 30 days", fd:"pay", sick:NONE },
    SD:{ mw:"$11.85", mw27:"$12.30", ot:OTFED, pay:"Monthly", fired:"Next payday, or when the employee returns the employer's property", quit:"Next payday, or when the employee returns the employer's property", fd:"pay", sick:NONE },
    TN:{ mw:FED, ot:OTFED, pay:"Semi-monthly", fired:"Next scheduled payday or within 21 days, whichever is later", quit:"Next scheduled payday or within 21 days, whichever is later", fd:"max:d:21", sick:NONE },
    TX:{ mw:"$7.25", ot:OTFED, pay:"Semi-monthly; monthly for exempt staff", fired:"Within 6 days", quit:"Next payday", fd:"d:6", sick:NONE },
    UT:{ mw:"$7.25", ot:OTFED, pay:"Semi-monthly; monthly for salaried staff", fired:"Within 24 hours", quit:"Next scheduled payday", fd:"d:1", sick:NONE },
    VT:{ mw:"$14.42", mw27:"$14.91", ot:OT40, pay:"Weekly; bi-weekly or semi-monthly with written notice", fired:"Within 72 hours", quit:"Next scheduled payday, or the next Friday if none", fd:"d:3", sick:"1 hour per 52 worked, up to 40 hours a year" },
    VA:{ mw:"$12.77", mw27:"$13.75", ot:OTFED, pay:"Bi-weekly or semi-monthly for hourly staff; monthly for salaried", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    WA:{ mw:"$17.13", mw27:"$17.73", ot:OT40, pay:"Monthly", fired:"End of the next pay period", quit:"End of the next pay period", fd:"pay", sick:"1 hour per 40 worked, with no annual cap" },
    WV:{ mw:"$8.75", ot:OT40, pay:"Bi-weekly", fired:"Next scheduled payday", quit:"Next scheduled payday", fd:"pay", sick:NONE },
    WI:{ mw:"$7.25", ot:OT40, pay:"Monthly", fired:"Next payday or within one month, whichever is earlier", quit:"Next payday", fd:"pay", sick:NONE },
    WY:{ mw:FED, ot:OTFED, pay:"Semi-monthly", fired:"Next payday", quit:"Next payday", fd:"pay", sick:NONE }
  };

  /* Nine sample countries. Figures were checked in November 2026 against current published rates. */
  var G = {
    "INT-AU":{ year:"July 1 to June 30", pay:"At least monthly", mw:"A$26.44 an hour, since July 1, 2026", hours:"38-hour week; overtime and penalty rates are set by awards", extra:"None; annual leave loading of 17.5% under many awards", leave:"4 weeks a year",
      cost:"Superannuation at 12%, paid within 7 business days of payday; state payroll tax", final:"Within 7 days after the employment ends" },
    "INT-CA":{ year:"Calendar year", pay:"A regular, recurring pay period set by the employer", mw:"Ontario: C$17.95 an hour, since October 1, 2026", hours:"Ontario: overtime at 1.5 times after 44 hours a week", extra:"None; vacation pay of at least 4%, or 6% after five years", leave:"Ontario: 2 weeks, or 3 after five years",
      cost:"Canada Pension Plan, Employment Insurance at 1.4 times the employee premium, Ontario Employer Health Tax and WSIB premiums", final:"Ontario: the later of 7 days after employment ends or the next regular pay day" },
    "INT-DE":{ year:"Calendar year", pay:"Monthly, by the end of the month", mw:"€13.90 an hour in 2026; €14.60 from January 1, 2027", hours:"8 hours a day, extendable to 10; overtime pay is set by contract or collective agreement", extra:"None by statute; often contractual", leave:"20 days a year on a five-day week",
      cost:"About half of pension, health, unemployment and long-term care insurance, plus accident insurance", final:"With the last regular payroll" },
    "INT-IN":{ year:"April 1 to March 31", pay:"Monthly, by the 7th of the following month", mw:"Set by each state, by skill level and zone", hours:"48-hour week; overtime at twice the ordinary rate", extra:"Statutory bonus of 8.33% to 20% for eligible employees; gratuity after five years", leave:"Earned leave under state law, typically 15 to 18 days",
      cost:"Provident fund at 12% and Employees' State Insurance at 3.25% of covered wages", final:"Within two working days of separation" },
    "INT-IE":{ year:"Calendar year", pay:"Per the contract; monthly is the norm", mw:"€14.15 an hour in 2026; €14.94 from January 1, 2027", hours:"48-hour average weekly limit; no statutory overtime premium", extra:"None required", leave:"4 working weeks a year",
      cost:"Employer PRSI, plus pension auto-enrolment contributions since January 2026", final:"With the final regular payroll, including untaken leave" },
    "INT-MX":{ year:"Calendar year", pay:"Weekly for manual work; otherwise at least every 15 days", mw:"MXN 315.04 a day; MXN 440.87 in the northern border zone (2026)", hours:"48-hour week; overtime at double pay for the first 9 hours a week, triple beyond", extra:"Year-end bonus of at least 15 days' pay by December 20; profit sharing by May 30; 25% vacation premium", leave:"12 days in the first year, rising with service",
      cost:"IMSS social security, INFONAVIT housing at 5%, retirement savings and state payroll tax", final:"Settlement is paid at separation" },
    "INT-PH":{ year:"Calendar year", pay:"At least twice a month, no more than 16 days apart", mw:"Metro Manila: ₱755 a day for non-agricultural work, since September 26, 2026", hours:"8 hours a day; overtime at 125%, or 130% on rest days and holidays", extra:"13th-month pay by December 24", leave:"5 days of service incentive leave after one year",
      cost:"SSS, PhilHealth and Pag-IBIG contributions", final:"Within 30 days of separation" },
    "INT-SG":{ year:"Calendar year", pay:"At least monthly, within 7 days after the salary period ends", mw:"No general minimum wage; sector-based Progressive Wage Model", hours:"44-hour week; overtime at 1.5 times for covered employees", extra:"None required; a 13th-month supplement is common by contract", leave:"7 days in the first year, rising to 14",
      cost:"CPF at 17% for employees up to age 55, plus the Skills Development Levy", final:"On the last day of work after dismissal or full notice; within 7 days if the employee leaves without notice" },
    "INT-UK":{ year:"April 6 to April 5", pay:"Per the contract; monthly is the norm", mw:"National Living Wage: £12.71 an hour for age 21 and over, since April 2026", hours:"48-hour average weekly limit unless the worker opts out; no statutory overtime premium", extra:"None required", leave:"5.6 weeks a year",
      cost:"Employer National Insurance at 15% above the secondary threshold; workplace pension of at least 3%", final:"With the final regular payroll, including pay for untaken holiday" }
  };

  var P = window.PCM, jan1 = P.D(2027, 1, 1);
  if(jan1 >= P.W0 && jan1 <= P.W1){
    Object.keys(S).forEach(function(c){
      var r = S[c], J = P.JUR["US-" + c];
      if(!r.mw27 || !J) return;
      P.ITEMS.push({ id:"US-" + c + "|mw|2027-01-01", jur:"US-" + c, level:"state", jurName:J.name, title:"Minimum wage rises to " + r.mw27, date:jan1, nominal:jan1, moved:false, cat:"processing",
        form:"", agency:J.name + " labor agency", period:"From January 1, 2027", owner:"Payroll", note:"", url:"", urlLabel:"",
        rule:"The state minimum wage moves from " + r.mw + " to " + r.mw27 + " an hour. Every hourly rate below the new minimum is raised before the first payroll of the year, and the workplace poster is replaced." });
    });
  }
  P.RULES = { states:S, global:G };
})();
