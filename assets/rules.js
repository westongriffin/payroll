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


  /* Cities and counties with their own minimum wage or paid sick leave rules.
     [name, state, minimum wage now, rate from January 1, 2027 ("" = no January change, "TBD" = not yet announced), local paid sick leave ("" = the state rule applies)]
     Sources: ADP local minimum wage lists for January 1, 2026, July 1, 2026 and January 1, 2027; Paycor paid sick leave summary for 2026.
     General rates only. Hotel, airport and other industry rates are left out. */
  var J26 = ", since January 1, 2026", JL = ", since July 1, 2026";
  var L = [
    ["Flagstaff","AZ","$18.35" + J26,"$18.95",""], ["Tucson","AZ","$15.45" + J26,"$16.00",""],
    ["Alameda","CA","$17.76" + JL,"",""], ["Belmont","CA","$18.95" + J26,"$19.60",""],
    ["Berkeley","CA","$19.61" + JL,"","1 hour per 30 worked; cap of 72 hours (48 for employers under 25)"],
    ["Burlingame","CA","$17.86" + J26,"$18.47",""], ["Cupertino","CA","$18.70" + J26,"$19.25",""], ["Daly City","CA","$17.50" + J26,"$18.10",""],
    ["East Palo Alto","CA","$17.90" + J26,"TBD",""], ["El Cerrito","CA","$18.82" + J26,"$19.36",""],
    ["Emeryville","CA","$20.34" + JL,"","1 hour per 30 worked; up to 72 hours a year (48 for employers with 55 or fewer)"],
    ["Foster City","CA","$17.85" + J26,"$18.36",""], ["Fremont","CA","$18.05" + JL,"",""], ["Half Moon Bay","CA","$17.91" + J26,"$18.52",""],
    ["Hayward","CA","$17.79 for 26 or more employees; $16.90 for 25 or fewer" + J26,"$18.39 for 26 or more; $17.40 for 25 or fewer",""],
    ["Los Altos","CA","$18.70" + J26,"$19.25",""],
    ["Los Angeles","CA","$18.42" + JL,"","1 hour per 30 worked; up to 48 hours a year"],
    ["Los Angeles County, unincorporated","CA","$18.47" + JL,"",""], ["Malibu","CA","$17.91" + JL,"",""], ["Menlo Park","CA","$17.55" + J26,"$18.05",""],
    ["Milpitas","CA","$18.50" + JL,"",""], ["Mountain View","CA","$19.70" + J26,"$20.25",""],
    ["Novato","CA","$17.73 for 100 or more employees; $17.46 for 26 to 99; $16.90 for 25 or fewer" + J26,"$18.25 for 100 or more; $17.97 for 26 to 99; $17.40 for 25 or fewer",""],
    ["Oakland","CA","$17.34" + J26,"TBD","1 hour per 30 worked; cap of 72 hours (40 for employers under 10)"],
    ["Palo Alto","CA","$18.70" + J26,"$19.25",""], ["Pasadena","CA","$18.57" + JL,"",""], ["Petaluma","CA","$18.31" + J26,"$18.93",""],
    ["Redwood City","CA","$18.65" + J26,"$19.30",""],
    ["Richmond","CA","$19.18, or $17.68 when the employer pays $1.50 an hour toward medical benefits" + J26,"$19.61, or $18.11 with the medical benefit credit",""],
    ["San Carlos","CA","$17.75" + J26,"$18.35",""],
    ["San Diego","CA","$17.75" + J26,"$18.35","1 hour per 30 worked; 40 hours of use a year, cap of 80"],
    ["San Francisco","CA","$19.61" + JL,"","1 hour per 30 worked; cap of 72 hours (40 for employers under 10)"],
    ["San Jose","CA","$18.45" + J26,"$19.00",""], ["San Mateo","CA","$18.60" + J26,"$19.25",""],
    ["San Mateo County, unincorporated","CA","$17.95" + J26,"$18.58",""], ["Santa Clara","CA","$18.70" + J26,"$19.25",""],
    ["Santa Monica","CA","$18.47" + JL,"","1 hour per 30 worked; cap of 72 hours (40 for employers with 25 or fewer)"],
    ["Santa Rosa","CA","$18.21" + J26,"$18.83",""],
    ["Sonoma","CA","$18.47 for 26 or more employees; $17.38 for 25 or fewer" + J26,"$19.10 for 26 or more; $17.97 for 25 or fewer",""],
    ["South San Francisco","CA","$18.15" + J26,"$18.75",""], ["Sunnyvale","CA","$19.50" + J26,"$20.05",""],
    ["West Hollywood","CA","$20.25" + J26,"$20.94","96 paid hours a year for full-time staff, for sick leave, vacation or personal need"],
    ["Boulder","CO","$16.82" + J26,"$18.17",""], ["Boulder County, unincorporated","CO","$16.82" + J26,"$17.43",""],
    ["Denver","CO","$19.29" + J26,"$19.84",""], ["Edgewater","CO","$18.17" + J26,"$19.99",""],
    ["Chicago","IL","$17.05 for employers with 4 or more" + JL,"","1 hour per 35 worked; up to 40 hours a year"],
    ["Cook County","IL","$15.40" + JL,"","1 hour per 40 worked; up to 40 hours a year, for any reason"],
    ["Portland","ME","$16.75" + J26,"$17.75",""], ["Rockland","ME","$16.00" + J26,"TBD",""],
    ["Howard County","MD","$16.00 for employers with 14 or fewer" + JL,"$16.45",""],
    ["Montgomery County","MD","$18.00 for 51 or more employees; $16.50 for 11 to 50; $15.95 for 10 or fewer" + JL,"","1 hour per 30 worked; up to 56 hours a year for employers with 5 or more"],
    ["Bloomington","MN","State rate","","1 hour per 30 worked; up to 48 hours a year"],
    ["Minneapolis","MN","$16.37" + J26,"$17.02","1 hour per 30 worked; up to 48 hours a year"],
    ["St. Paul","MN","$16.37 for employers with 6 or more; $14.25 for 5 or fewer" + JL,"$17.02 for 101 or more","1 hour per 30 worked; up to 48 hours a year"],
    ["Albuquerque","NM","2026 rate not in the source list","$13.00, or $12.00 with qualifying benefits",""],
    ["Bernalillo County, unincorporated","NM","State rate","","1 hour per 32 worked; up to 56 hours a year for employers with 35 or more, for any reason"],
    ["Las Cruces","NM","$13.01" + J26,"$13.47",""], ["Santa Fe","NM","2026 rate not in the source list","$17.50",""],
    ["New York City","NY","$17.00, the state rate for the city","","1 hour per 30 worked; up to 40 paid hours a year (56 for employers with 100 or more), plus 32 unpaid hours since February 2026"],
    ["Westchester County","NY","$17.00, the state rate for the county","","1 hour per 30 worked; up to 40 hours a year"],
    ["Portland","OR","$16.80, the state's Portland metro rate" + JL,"","1 hour per 30 worked; up to 40 hours a year (employers with 6 or more)"],
    ["Allegheny County","PA","State rate","","1 hour per 35 worked; up to 40 hours a year (employers with 26 or more)"],
    ["Philadelphia","PA","State rate","","1 hour per 30 worked; up to 40 hours a year (paid for employers with 10 or more)"],
    ["Pittsburgh","PA","State rate","","1 hour per 30 worked; up to 72 hours a year (40 for employers under 15)"],
    ["Bellingham","WA","$19.13" + J26,"$19.73",""], ["Burien","WA","2026 rate not in the source list","$22.49 for 16 or more employees; $20.49 for 15 or fewer",""],
    ["Everett","WA","$19.77 for covered employers" + JL,"$20.52",""],
    ["King County, unincorporated","WA","$19.82 for most employers; $18.32 for the smallest" + J26,"$21.57 for most employers; $19.57 for the smallest",""],
    ["Renton","WA","$21.57 for covered employers" + JL,"$22.28",""],
    ["Seattle","WA","$21.30" + J26,"$22.14","1 hour per 40 worked, or per 30 for employers with 250 or more; no annual cap"],
    ["SeaTac","WA","$20.74 for hospitality and transportation employees" + J26,"$21.47",""],
    ["Tacoma","WA","State rate","","1 hour per 40 worked; no annual cap"],
    ["Tukwila","WA","$21.65" + J26,"$22.45",""]
  ];

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
  if(jan1 >= P.W0 && jan1 <= P.W1){
    var byState = {};
    L.forEach(function(x){ if(x[3] && x[3] !== "TBD") (byState[x[1]] = byState[x[1]] || []).push(x); });
    Object.keys(byState).forEach(function(c){
      var list = byState[c], J = P.JUR["US-" + c], n = list.length;
      P.ITEMS.push({ id:"US-" + c + "|lmw|2027-01-01", jur:"US-" + c, level:"state", jurName:J.name, title:"Local minimum wages rise in " + n + (n === 1 ? " city or county" : " cities and counties"), date:jan1, nominal:jan1, moved:false, cat:"processing",
        form:"", agency:"City and county labor offices", period:"From January 1, 2027", owner:"Payroll", note:"The full list, with sick leave rules, is in the Rules tab.", url:"", urlLabel:"",
        rule:"New local rates: " + list.map(function(x){ return x[0] + " " + x[3]; }).join("; ") + ". An employee is paid the highest of the federal, state and local rate where the work is done." });
    });
  }
  P.RULES = { states:S, global:G, local:L };
})();
