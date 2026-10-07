# U.S. Airport Investment Intelligence — Standard Assessment Report Templates

The ten standard consultation and investment report templates generated for a **U.S. Airport Modernization Investment & Advisory Firm**, ordered across the investment intelligence lifecycle: **Needs & Capital Sizing → CIP Programming → Feasibility / BCA / P3 Structuring → Federal Grant Submission → EVM Delivery Monitoring → ACRP ORAT Commissioning → FAA Hub Cohort Benchmarking → EPA eGRID / VALE Decarbonization → Municipal / P3 Credit & Equity Due Diligence → Daily NAS Operations Brief**.

Every quantitative section carries a mandatory **Provenance Block** (`sourceId`, `url`, `credibility 1–5`, `retrievedAt`, `asOf`); unofficial vendor or consultancy claims are quarantined and excluded from financial underwriting and gate conclusions.

---

## R1 — U.S. Airport Infrastructure Needs, Capital Stack & Funding Gap Assessment

**Purpose:** Quantify a U.S. airport's (or multi-airport sponsor system's) 5-year capital need, eligible vs. ineligible federal share, debt/P3 capacity, Airline Use & Lease Agreement (AULA) rate impact, and net unfunded gap.
**Workflow:** W1 (`FundingSystem`). **Consumers:** Investment committee, Airport Authority Board, Municipal Bond Underwriters, FAA Airport District Office (ADO). **View:** V1.

1. **Executive Summary** — Total 5-year capital need, funded stack (AIP, IIJA AIG/ATP, PFC, CFC, GARB, PAB/P3, TIFIA), net unfunded gap, pro-forma Cost Per Enplaned Passenger (**CPE**), and top-3 deferral risks.
2. **Scope, Hub Classification & Rate-Making Regime** — FAA statutory hub class (`Large`, `Medium`, `Small`, `Nonhub`, `Reliever`), AULA structure (`Residual`, `Compensatory`, or `Hybrid`), Majority-in-Interest (**MII**) airline approval thresholds, and AULA expiration date.
3. **Physical Inventory & Pavement/Facility Condition** — Airfield geometry and Pavement Condition Index (**PCI**) from FAA ADIP / Form 5010; terminal/landside asset age and condition across categories A–J.
4. **Demand Forecast Reconciliation** — 20-year **FAA Terminal Area Forecast (TAF)** vs. Sponsor Master Plan forecast for enplanements, landed weight, and aircraft operations; Annual Service Volume (**ASV**) delay trigger check.
5. **5-Year Capital Needs by Category & Eligibility** — Breakdown by Airfield (`B`), Terminal (`C`), Security/CBP (`F`), Energy/VALE (`G`), and Landside/ConRAC (`H`), split by FAA AIP/ATP eligibility vs. local/private responsibility.
6. **Capital Stack & Debt/P3 Capacity Outlook** — AIP entitlement/discretionary shares, PFC Pay-Go and bonding capacity at the $4.50 cap, CFC ConRAC capacity, Senior/Subordinate GARB headroom, and DBFOM P3 / TIFIA eligibility.
7. **Funding Gap & Airline Rate Sensitivity Analysis** — Core funding gap matrix and pro-forma impact on CPE, Landing Fees, and Senior/All-In DSCR.
8. **Deferral Risk & Construction Cost Escalation** — Cost escalation modeling, ASV delay curve impact, and regulatory compliance exposure.
9. **Advisory Recommendations** — Optimal instrument mix, P3 carve-out candidates (Terminal, ConRAC, Central Utility Plant / Microgrid EaaS), and PFC/grant execution roadmap.

**Key Tables:** 5-Year Needs vs. Capital Stack by Category; Pro-Forma CPE, DSCR & DCOH Schedule; Per-Airport Gap Ranking.
**Refined Formulas:**
- $\text{Gap} = \text{TotalNeed}_{\text{NPIAS+CIP}} - \sum (\text{AIP} + \text{IIJA}_{\text{AIG+ATP}} + \text{PFC}_{\text{PayGo+Bond}} + \text{CFC} + \text{GARB} + \text{P3} + \text{TIFIA} + \text{SponsorCash})$
- $\text{PFC}_{\text{Annual}} = E_{\text{eligible}} \times (r_{\text{PFC}} - \$0.11)$ where $r_{\text{PFC}} \le \$4.50$ (14 CFR Part 158)
- $\text{DSCR}_{\text{Senior}} = (\text{OperatingRevenues} - \text{O\&M}_{\text{excl. depr}} + \text{RollingCoverage}_{\le 25\%} + \text{PFC}_{\text{pledged}}) / \text{SeniorDebtService} \ge 1.25\times$
- $\text{CPE} = \text{TotalAirlineAeronauticalRevenue} / \text{Enplanements}$; $\text{DCOH} = (\text{UnrestrictedCash} \times 365) / \text{AnnualO\&M} \ge 365\text{ days}$
**Primary U.S. Sources:** [FAA NPIAS](https://www.faa.gov/airports/planning_capacity/npias), [FAA CATS Form 5100-127](https://cats.airports.faa.gov/), [MSRB EMMA](https://emma.msrb.org/), [ACI-NA Infrastructure Needs Study](https://airportscouncil.org/advocacy/airport-infrastructure-funding/), [FAA TAF](https://taf.faa.gov/), [BTS TranStats](https://www.transtats.bts.gov/data_elements.aspx).

---

## R2 — FAA / Sponsor 5-Year Capital Improvement Plan (CIP)

**Purpose:** The airport sponsor's rolling 5-year project-by-project capital program synchronizing FAA Airport Capital Improvement Plan (ACIP) grant requests, municipal bond issuances, NEPA clearances, and MII airline consultations.
**Workflow:** W1 $\to$ W2. **Consumers:** FAA ADO, Sponsor CFO, Signatory Airlines (MII committee), Municipal Advisors. **View:** V1 / V2.

1. **Program Overview & Strategic Alignment** — Total 5-year CIP value, fiscal-year phasing, digital Airport Layout Plan (**eALP**) approval status, and NEPA readiness.
2. **Itemized Project Schedule (FY1–FY5)** — Project-by-project table with FAA priority rating, NEPA class (`CATEX`, `EA/FONSI`, `EIS/ROD`), and delivery method (`DBB`, `DB`, `PDB`, `CMAR`, `DBFOM P3`).
3. **Sources & Uses of Funds by Fiscal Year** — Annual cash-flow balancing across AIP Entitlement, AIP Discretionary, IIJA AIG/ATP, State Aviation Grants, PFC Pay-Go/Bonds, CFCs, GARBs, P3 Equity/PABs, and Sponsor Cash.
4. **FAA National Priority System (NPS) & Justification Matrix** — Project ranking (Safety $\succ$ Security $\succ$ Reconstruction/PCI $\succ$ Standards $\succ$ Capacity/Delay).
5. **Operational Phasing & Airline Agreement Coordination** — **FAA AC 150/5370-2G Construction Safety and Phasing Plan (CSPP)** windows, MII ballot schedule, and rate-base inclusion timing.

**Key Table:** `Project ID | Facility | Category (A–J) | NEPA Status | Delivery Model | Total Cost | Federal Share (s) | Sponsor/Bond/P3 Share | FY1–FY5 Phasing`.
**Refined Formulas:**
- Statutory Federal Share (49 U.S.C. § 47109): $s = 0.75$ (Large/Medium Hub), $s = 0.80$ (Part 150 Noise), $s \in [0.90, 0.95]$ (Small/Reliever/GA); $\text{SponsorMatch} = \text{EligibleCost} \times (1 - s) + \text{IneligibleCost}$
- Annual Sources-Uses Balance Check: $\sum \text{Sources}_t - \sum \text{Uses}_t = 0 \quad \forall t \in \{1..5\}$
**Primary U.S. Sources:** [FAA AIP Handbook (Order 5100.38D)](https://www.faa.gov/airports/aip), [FAA ADIP / eALP](https://adip.faa.gov/), [FAA AC 150/5370-2G](https://www.faa.gov/airports/resources/advisory_circulars), Sponsor Official Statements ([MSRB EMMA](https://emma.msrb.org/)).

---

## R3 — U.S. Investment Appraisal, FAA Benefit-Cost Analysis (BCA) & P3 Feasibility Study

**Purpose:** Institutional go/no-go investment case for major terminal rebuilds, airfield capacity projects, ConRAC/APM developments, or Energy-as-a-Service (EaaS) microgrids — satisfying both **FAA Discretionary Grant BCA rules** (OMB Circular A-94) and **Municipal Bond / P3 Equity Underwriting**.
**Workflow:** W2 (Entry Gate). **Consumers:** Investment Committee, Bond Rating Agencies (Moody's, S&P, Fitch), Signatory Airlines, FAA Headquarters. **View:** V2.

1. **Strategic & Demand Case** — FAA TAF forecast validation, ASV delay ratio ($\text{Ops}/\text{ASV} \ge 0.60$), O&D vs. connecting hub resilience, and carrier concentration (**HHI**).
2. **Economic Case & FAA Benefit-Cost Analysis (BCA)** — Base Case (Do-Minimum) vs. Build Options; monetized passenger travel time savings (**USDOT VTTS**), aircraft direct operating cost (**ADOM**) savings, and safety/reliability benefits discounted at the **OMB Circular A-94 real discount rate**.
3. **Commercial & Delivery Model Case** — Comparative value-for-money (**VfM**) analysis across `Design-Bid-Build`, `Progressive Design-Build / CMAR`, and `DBFOM P3` (Terminal Concession, Availability-Payment ConRAC/APM, or Microgrid EaaS); risk transfer matrix.
4. **Financial & Credit Case** — Capex draw curve, GARB / PAB / TIFIA / PFC financing stack, pro-forma CPE trajectory, Senior/Subordinate DSCR, and P3 Loan Life Coverage Ratio (**LLCR**) / Equity IRR.
5. **Environmental (NEPA) & Operational Readiness Governance** — NEPA pathway (`CATEX`/`EA`/`EIS`), AC 150/5370-2G CSPP phasing, and ACRP Report 164 ORAT governance.
6. **Sensitivity, Stress Testing & Investment Recommendation** — Tornado sensitivity (enplanement shock $-15\%$, capex overrun $+20\%$, interest rate $+150\text{ bps}$) and conditions precedent.

**Key Tables:** Options Appraisal & FAA BCA Summary (`NPV`, `BCR`, `IRR`); P3 Value-for-Money & Risk Allocation Matrix; Pro-Forma Debt Service & CPE Stress Table.
**Refined Formulas:**
- Capacity Trigger: $\text{DelayRatio} = \text{AnnualOperations}_{\text{TAF}} / \text{ASV} \ge 0.60$ (planning) / $0.80$ (construction)
- FAA Economic BCA: $\text{NPV}_{\text{BCA}} = \sum_{t=0}^{T} (B_t - C_t) / (1 + r_{\text{OMB}})^t$; $\text{BCR} = \text{PV}(B) / \text{PV}(C) \ge 1.0$
- Monetized Delay Benefit: $B_{\text{delay}, t} = \Delta D_{\text{min}, t} \times (\text{PaxPerOp} \times \text{VTTS}_{\$/\text{min}} + \text{ADOM}_{\$/\text{min}})$
- P3 & Credit Covenants: $\text{DSCR}_{\text{Senior}} \ge 1.25\times$; $\text{LLCR} = \text{PV}(\text{CFADS}) / \text{Debt}_{\text{outstanding}} \ge 1.30\times$; $\text{IRR}$ where $\text{NPV}_{\text{equity}} = 0$
**Primary U.S. Sources:** [FAA Airport Benefit-Cost Analysis Guidance](https://www.faa.gov/airports/aip), [FAA ASPM](https://aspm.faa.gov/), [FAA TAF](https://taf.faa.gov/), [MSRB EMMA Feasibility Reports](https://emma.msrb.org/), [USDOT Build America Bureau](https://www.transportation.gov/buildamerica).

---

## R4 — Federal Grant Application & PFC Amendment Submission (SF-424 / AIP / IIJA / Part 158)

**Purpose:** Formal federal funding submission package for FAA AIP Entitlement/Discretionary grants, IIJA AIG/ATP allocations, VALE/ZEV sustainability grants, or 14 CFR Part 158 PFC application/amendment approval.
**Workflow:** W1 (`InstrumentSelected` $\to$ `Applied`). **Consumers:** FAA Regional Airports Division / ADO, Signatory Airlines (Part 158 consultation). **View:** V1.

1. **Sponsor & Facility Identification** — Airport sponsor legal entity, FAA Location Identifier (LID), NPIAS role, UEI/SAM registration, and eALP sheet reference.
2. **Project Description & Statutory Eligibility** — Alignment with 49 U.S.C. Chapter 471 eligible categories (airfield safety/capacity, terminal multimodal/accessibility, VALE/ZEV gate electrification, or Part 150 noise).
3. **Aeronautical Demand & BCA Justification** — TAF demand basis, PCI or ASPM delay evidence, and BCA summary (mandatory for discretionary requests $> \$10\text{M}$).
4. **Engineer's Cost Estimate & Drawdown Schedule** — Itemized eligible vs. ineligible cost elements, quarterly outlay forecast (`OR` curve), and construction phasing.
5. **Federal Certifications & Assurances** — **FAA 39 Standard Grant Assurances** (including #25 Revenue Use / Self-Sufficiency), **NEPA determination** (`CATEX`/`FONSI`/`ROD`), **Buy American Preferences** (49 U.S.C. § 50101), **Davis-Bacon prevailing wage**, **DBE (49 CFR Part 26)**, and **Title VI / ADA / ACAA** compliance.
6. **Local Match & Part 158 PFC Linkage** — Calculation of federal share ($s$) and committed sponsor match (PFC Pay-Go, GARB proceeds, or unrestricted cash).

**Key Tables:** Eligible vs. Ineligible Cost Breakdown; Quarterly Outlay Schedule; Sponsor Match Verification Table.
**Refined Formulas:**
- $\text{FederalRequest} = s \times \text{EligibleCost}$; $\text{SponsorMatch} = (1 - s) \times \text{EligibleCost} + \text{IneligibleCost}$
- Target Outlay Trajectory: $\text{OR}(t) = \text{CumulativeOutlays}_t / \text{ObligatedAmount}$ (must exceed $0.50$ within 18 months)
**Primary U.S. Sources:** [FAA AIP Overview](https://www.faa.gov/airports/aip/overview), [FAA Order 5100.38D](https://www.faa.gov/airports/aip), [14 CFR Part 158 (PFC)](https://www.faa.gov/airports/pfc), [FAA NEPA Order 1050.1F](https://www.faa.gov/about/office_org/headquarters_offices/apl/environ_policy_guidance).

---

## R5 — Capital Program Delivery & Earned Value Status Report (Monthly / Quarterly)

**Purpose:** Standing executive and lender monitoring report tracking Earned Value Management (EVM), schedule milestones, federal grant/bond drawdowns, and live-airfield construction safety impacts across active U.S. airport projects.
**Workflow:** W2 (`UnderConstruction`). **Consumers:** Airport Board, P3 Lenders / Bond Trustee, Independent Engineer, FAA ADO. **View:** V2.

1. **Portfolio Executive Summary** — Aggregate BAC, Earned Value (`EV`), portfolio `SPI`, `CPI`, Cost-Schedule Index (`CSI`), Estimate at Completion (`EAC`), and projects on `ConstructionHold`.
2. **Initiative Stage-Gate & EVM Rollup Table** — Per-initiative lifecycle state chip, `% Complete`, `SPI`, `CPI`, `CSI`, `EAC vs. BAC`, `TCPI`, and NEPA/CSPP status.
3. **Critical Path Milestone Variance** — Planned vs. forecast completion dates, float consumption, and root-cause drivers (supply chain, TSA/FAA equipment delivery, weather).
4. **Grant & Bond Drawdown Position** — Cumulative obligations vs. outlays (`OR`), contingency drawdown curve, and 2 CFR Part 200 compliance status.
5. **Top-10 Risk & Change-Order Register** — Quantified P50/P80 cost and schedule contingency exposure with mitigation owners.
6. **AC 150/5370-2G Live-Operations Construction Impact** — Active runway/taxiway/apron NOTAM closures, overnight window efficiency ($\eta$), and ASPM arrival/departure delay exposure.
7. **Board / Lender Actions & Waivers Requested.**

**Key Tables:** Portfolio EVM & Contingency Ledger; Critical Path Milestone Variance Table; AC 150/5370-2G Overnight Closure Efficiency Log.
**Refined Formulas:**
- $\text{SPI} = \text{EV} / \text{PV}$; $\text{CPI} = \text{EV} / \text{AC}$; $\text{CSI} = \text{SPI} \times \text{CPI}$
- $\text{EAC}_{\text{composite}} = \text{AC} + (\text{BAC} - \text{EV}) / (0.8\,\text{CPI} + 0.2\,\text{SPI})$; $\text{TCPI} = (\text{BAC} - \text{EV}) / (\text{BAC} - \text{AC})$
- Closure Window Efficiency: $\eta = \text{ProductiveWorkHours} / (\text{NOTAMClosureHours} \times \text{CrewSize})$
**Primary U.S. Sources:** Project EVM Ledger, [FAA AIP/ATP Grant Drawdowns](https://www.faa.gov/airports/aip/2026_aip_grants), [FAA NOTAM Search](https://notams.aim.faa.gov/notamSearch/), [FAA ASPM](https://aspm.faa.gov/).

---

## R6 — ACRP Operational Readiness & Airport Transfer (ORAT) Certification Report

**Purpose:** Certify that a newly constructed or modernized U.S. terminal, concourse, ConRAC, or airfield facility has passed integrated systems testing, stakeholder trials, and statutory federal inspections (**TSA PGDS**, **CBP ATDS**, **ADA/ACAA**, **TSA Cybersecurity**) to open for live operations.
**Workflow:** W2 (`Commissioning` $\to$ `Operational`). **Consumers:** Airport CEO/COO, Signatory Airlines, TSA Federal Security Director, CBP Port Director, Municipal Bond Trustee / P3 Independent Certifier. **View:** V2 / V3.

1. **Executive Readiness Determination** — Weighted ORAT readiness ratio $R$ against the mandatory $R \ge 0.95$ gate; Critical Defect count (must equal `0`).
2. **Operational Trial Results (ACRP Report 164 Protocol)** — Results of end-to-end simulation trials (mass passenger/baggage stress test, irregular operations `IROPS` recovery, emergency evacuation, swing-gate turnarounds).
3. **Core Airport Systems Integration Status** — In-line Checked Baggage Inspection System (**CBIS / TSA PGDS**), TSA CT/CAT-2 checkpoint lanes, CBP Simplified Arrival FIS booths, FIDS/AODB, common-use passenger processing systems (CUPPS), and 400Hz GPU/PCA gate systems.
4. **Mandatory U.S. Statutory & Gap-Fill Certifications**:
   - **TSA Aviation Cybersecurity Directive Compliance**: OT/IT VLAN segmentation (BHS PLCs, HVAC/SCADA, airfield lighting), pen-test sign-off, and incident playbook.
   - **ADA Title II & ACAA (14 CFR Part 382) Accessibility Audit**: Step-free PRM routing, boarding bridge slopes, visual paging, accessible self-bag-drop/kiosks, and service-animal relief areas.
   - **Climate & Power Resilience Verification**: Microgrid / backup generator islanding test for life-safety, TSA screening, and FAA tower/surface feeds.
5. **Workforce Familiarization & Training Coverage** — Certified staff ratio across airline ground handlers, TSA officers, CBP officers, BHS maintenance, and ARFF.
6. **Snag / Punch-List Backlog & Day-1 Fallback Playbooks** — Severity-2/3 minor defects with closeout dates and manual contingency procedures.
7. **Formal Go-Live Authorization.**

**Key Tables:** ACRP 164 Trial Scenario Matrix; Statutory & Gap-Fill Certification Checklist; Severity-Ranked Defect Log.
**Refined Formulas:**
- Weighted ORAT Readiness: $R = (\sum_k w_k \cdot \text{PassedTrials}_k) / (\sum_k w_k \cdot \text{TotalTrials}_k) \ge 0.95 \land \text{CriticalDefects} = 0$
- Workforce Readiness Ratio: $\text{Coverage}_{\text{staff}} = \text{TrainedCertifiedStaff} / \text{RequiredDay1Roster} \ge 0.98$
- Stage Throughput Verification: Erlang-C $W_{q95}(\lambda_{\text{designPeak}}, c, \mu_{\text{trial}}) \le W_{\text{budget}}$
**Primary U.S. Sources:** [TRB ACRP Report 164 (ORAT)](https://www.trb.org/ACRP/ACRP.aspx), [TSA PGDS](https://www.tsa.gov/), [CBP ATDS](https://www.cbp.gov/), [FAA AC 150/5360-13A](https://www.faa.gov/airports/resources/advisory_circulars).

---

## R7 — U.S. Hub Cohort Benchmarking & Performance Assessment

**Purpose:** Position a U.S. airport against its statutory **FAA Hub Classification Cohort** (e.g., Large Hubs $\ge 1.0\%$ U.S. boardings, or Core 30 peers) across financial productivity, passenger experience, NAS operational reliability, and infratech maturity.
**Workflow:** W7 (`BenchmarkSystem`, feeding W1/W3/W6). **Consumers:** Investment Committee, Airport Executive Leadership, Rating Agencies, Airline Partners. **View:** V7 (with V3/V6 drill-downs).

1. **FAA Cohort Definition & Data Vintage** — Peer hub set (e.g., U.S. Large Hubs or Competing Regional Gateways), data as-of dates, and credibility weights.
2. **Traffic, Market Structure & Carrier Concentration** — Enplanements, landed weight, cargo tonnage, O&D vs. connecting split, and airline market-share **HHI** (from BTS TranStats T-100 / DB1B).
3. **Passenger Journey & Experience Benchmarks** — ACI ASQ satisfaction dimensions, TSA checkpoint 95th-percentile wait times ($W_{q95}$), biometric self-bag-drop stage times ($\le 70\text{ s}$ target), and **CBP FIS** international arrival wait times (`awt.cbp.gov`).
4. **Airfield & NAS Operational Performance** — **FAA ASPM** airport arrival/departure rates (`AAR`/`ADR`), unimpeded taxi-out/taxi-in times, cause-specific delay per operation, and **Cirium OTP** percentile.
5. **Financial Productivity & Credit Metrics (FAA Form 5100-127 & EMMA)** — Cost Per Enplaned Passenger (**CPE**), Non-Aeronautical Revenue per Enplaned Passenger (**NARE**), O&M cost per enplanement, Senior/All-In **DSCR**, and Unrestricted Days Cash on Hand (**DCOH**).
6. **Infratech & Digital Maturity** — 5-dimension maturity score ($0\text{–}4$) vs. cohort median and z-score.
7. **Bottom-Quartile Gap Diagnosis & Capital Linkage** — Prioritized remediation initiatives mapped directly to Workflows W1–W6.

**Key Table:** `Metric | Subject Airport | FAA Hub Cohort Median | Percentile (p) | Standard Z-Score (z) | Robust Z-Score (z_IQR) | Source & Credibility`.
**Refined Formulas:**
- Cohort Percentile: $p = |\{x' \in \text{Cohort} : x' < x\}| / n$
- Standard & Robust Z-Scores: $z = (x - \mu) / \sigma$; $z_{\text{robust}} = (x - \text{Median}) / (0.7413 \cdot \text{IQR})$
- Credibility-Weighted Composite Index: $I = \sum_j (w_j \cdot c_j \cdot \Phi(z_j)) / \sum_j (w_j \cdot c_j)$
**Primary U.S. Sources:** [FAA CATS Form 5100-127](https://cats.airports.faa.gov/), [BTS TranStats](https://www.transtats.bts.gov/data_elements.aspx), [FAA ASPM](https://aspm.faa.gov/), [CBP Wait Times](https://awt.cbp.gov/), [ACI-NA Benchmarking](https://airportscouncil.org/), [ACI ASQ](https://aci.aero/programs-and-services/asq/), [Cirium OTP](https://www.cirium.com/resources/on-time-performance/).

---

## R8 — U.S. Airport Sustainability, VALE/ZEV & Energy Transition Assessment

**Purpose:** Quantify Scope 1 and Scope 2 emissions using **U.S. EPA eGRID** and **FAA AEDT**, evaluate gate electrification (APU displacement), geothermal HVAC, and solar/battery microgrid **Energy-as-a-Service (EaaS)** projects, and audit FAA sustainability grant compliance.
**Workflow:** W5 (`SustainabilitySystem`). **Consumers:** Airport Board, EaaS / Green Bond Investors, FAA Office of Environment and Energy (AEE), ACI-NA ACA Verifiers. **View:** V5.

1. **Baseline Emissions & Energy Intensity Inventory** — Scope 1 (stationary heating, airport fleet, fire training) and Scope 2 (purchased electricity using the airport's specific **EPA eGRID subregion** factor), plus $\text{kWh/pax}$ and $\text{kgCO}_2\text{e/pax}$.
2. **Net-Zero Targets & Glidepath Trajectory** — Target net-zero year (e.g., DEN 2040, U.S. Aviation Climate Action Plan 2050), interim milestones, and Compound Annual Reduction Rate (**CARR**).
3. **Decarbonization & Resilience Capital Portfolio**:
   - **Gate Electrification (400Hz GPU & PCA)**: APU fuel-burn displacement modeled via **FAA AEDT / VALE** methodology ($327M FAA grant program).
   - **Zero-Emission Ground Fleet (eGSE & Electric Shuttles)**: Fleet transition ratio ($\text{ZEV}\%$) under the **FAA Airport ZEV** program.
   - **Low-Carbon Thermal & Microgrid EaaS P3s**: Geothermal heat-pump plants (e.g., Louisville `SDF` $>80\%$ HVAC emissions cut) and islandable solar + battery microgrids (e.g., JFK NTO 11.3 MW microgrid).
4. **Progress vs. Glidepath Determination** — `OnTrack` / `OffTrack` status chip with variance attribution (enplanement growth vs. grid decarbonization vs. project execution).
5. **Embodied Carbon & Sustainable Construction Audit** — $\text{kgCO}_2\text{e}/\text{m}^2$ of concrete, steel, and asphalt on active terminal/runway builds vs. IATA / Buy Clean federal benchmarks.
6. **FAA Grant & IRA Tax Credit Leverage** — FAA VALE, ZEV, and IIJA Net-Zero grant compliance + Inflation Reduction Act (IRA Direct Pay / 48E / 45Z SAF) monetization.
7. **Third-Party Assurance & Provenance Statement.**

**Key Tables:** EPA eGRID Scope 1+2 Inventory Table; Gate Electrification & EaaS Initiative Register; Annual Glidepath Verification Table.
**Refined Formulas:**
- $E_{\text{Scope 1+2}} = \sum (\text{Fuel}_f \times \text{EF}_{\text{EPA}, f}) + (\text{GridMWh} - \text{SolarMWh} - \text{PPA\_MWh}) \times \text{EF}_{\text{eGRID}}$
- APU Gate Displacement: $\Delta E_{\text{Gate}} = N_{\text{turns}} \times t_{\text{gate}} \times (\dot{m}_{\text{APU}} \times \text{EF}_{\text{JetA}} - P_{\text{GPU+PCA}} \times \text{EF}_{\text{eGRID}})$
- Glidepath Check: $E_{\text{glidepath}}(t) = E_{\text{base}} \times (1 - (t - t_{\text{base}}) / (t_{\text{target}} - t_{\text{base}}))$; $\text{GrantLeverage} = \text{ProgramCapex} / \text{FederalGrant}$
**Primary U.S. Sources:** [U.S. EPA eGRID](https://www.epa.gov/egrid), [FAA AEDT](https://aedt.faa.gov/), [FAA Net-Zero / VALE / ZEV Grants](https://www.faa.gov/newsroom/faa-invests-nearly-92-million-help-airports-reach-presidents-goal-net-zero-emissions-2050), [PMC Geothermal & Net-Zero Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12307590).

---

## R9 — U.S. Airport P3, Concession & Municipal Credit Due Diligence Report

**Purpose:** Institutional investor and lender due diligence report for **U.S. Airport Public-Private Partnerships (DBFOM Terminal Concessions, ConRACs, Automated People Movers, Central Utility Plant / Microgrid EaaS, Cargo/FBO Leases)**, **FAA Airport Investment Partnership Program (AIPP, 49 U.S.C. § 47134)** transactions, or **GARB / PAB / TIFIA Underwriting**.
**Workflow:** Cross-cutting (W1 + W2 + W5 + W7 primary evidence). **Consumers:** Infrastructure Private Equity Funds, Municipal Bond Institutional Buyers, TIFIA Credit Council, Rating Agencies. **View:** V1, V2, V5, V7.

1. **Transaction & Statutory Structure Overview** — U.S. asset perimeter (Terminal DBFOM, ConRAC/APM Availability P3, EaaS Microgrid, or full-airport AIPP lease under 49 U.S.C. § 47134), compliance with **FAA Grant Assurance #25 (Revenue Diversion Prohibition)**, and tax-exempt **Private Activity Bond (PAB)** / **GARB** / **TIFIA** eligibility.
2. **Catchment Area, Traffic & Carrier Concentration Risk** — 10-year historical BTS T-100 enplanements, 20-year FAA TAF forecast, O&D % vs. connecting hub exposure, anchor carrier market share (**HHI**), and signatory airline credit quality.
3. **Airline Use & Lease Agreement (AULA) & Commercial Revenue Mechanics** — `Residual` vs. `Compensatory` vs. `Hybrid` rate recovery, MII capital veto provisions, per-turn vs. preferential gate lease terms, and non-aeronautical concession revenue per enplaned passenger (**NARE**) upside.
4. **Physical Condition, CIP Backlog & Delivery Risk** — Airfield PCI (FAA ADIP), terminal renewal backlog (from R1/R2), NEPA clearance status, DB/P3 contractor EPC wrap, and liquidated damages.
5. **Financial Model Audit & Downside Stress Testing** — Historical and projected **CPE**, EBITDA / Net Revenue margin, Senior & All-In **DSCR**, P3 **LLCR**, Unrestricted **DCOH**, and severe downside stress cases (2008/2020-calibrated traffic shock, $+200\text{ bps}$ refinancing stress).
6. **Cybersecurity, Environmental & Climate Resilience Due Diligence** — TSA Aviation Cybersecurity Directive compliance, PFAS aqueous film-forming foam (AFFF) remediation liability, NEPA/Part 150 noise exposure, and physical climate/grid resilience.
7. **Key Value Drivers, Covenant Package & Deal Risks** — Ranked risk matrix with structural mitigants (rate covenant $\ge 1.25\times$, Debt Service Reserve Fund, O&M reserve, MII pre-approval).
8. **Valuation / Credit Pricing Range & Investment Committee Recommendation.**

**Key Tables:** Base vs. Downside Traffic & CPE Model; Sources & Uses (PABs / GARBs / TIFIA / P3 Equity); Annual DSCR, LLCR & DCOH Covenant Schedule.
**Refined Formulas:**
- Traffic-to-GDP Elasticity: $\varepsilon_{\text{pax}} = (\% \Delta \text{Enplanements}) / (\% \Delta \text{RegionalGDP})$
- Concession / Equity Valuation: $\text{NPV}_{\text{equity}} = \sum_{t=0}^{T_{\text{concession}}} \text{FCFE}_t / (1 + k_e)^t$; $\text{LLCR} = \text{PV}(\text{CFADS}) / \text{Debt}_{\text{outstanding}} \ge 1.30\times$
- Stress-Case DSCR Floor: $\min_{t} \text{DSCR}_{\text{stress}, t} \ge 1.10\times$ (Senior Covenant $\ge 1.25\times$ under base case)
**Primary U.S. Sources:** [MSRB EMMA Official Statements & Feasibility Reports](https://emma.msrb.org/), [FAA CATS Form 5100-127](https://cats.airports.faa.gov/), [FAA AIPP (49 U.S.C. § 47134)](https://www.faa.gov/airports/aip/privatization), [USDOT Build America Bureau (TIFIA)](https://www.transportation.gov/buildamerica), [BTS TranStats](https://www.transtats.bts.gov/data_elements.aspx), [PANYNJ / U.S. P3 Filings](https://www.panynj.gov/port-authority/en/annual-report.html).

---

## R10 — U.S. NAS & Airport Realtime Operations Intelligence Brief (Daily / Situational)

**Purpose:** Daily situational decision-support brief combining live U.S. NAS feeds (`FAA SWIM`, `NOTAM`, `NOAA METAR/TAF`, `AeroAPI`, `OpenSky`, `CBP Wait Times`) with active capital construction and BNATCS cutover windows.
**Workflow:** W7 (+ W2, W3, W4 tactical feeds). **Consumers:** Airport COO / Duty Director, Program Management Office (PMO), ORAT & BNATCS Cutover Teams. **View:** V7 (+ V2/V3/V4).

1. **U.S. Airport & NAS Operational Summary** — Hourly arrival/departure movements vs. **ASPM AAR/ADR** capacity, active FAA Ground Delay Programs (GDPs) / Ground Stops, NOAA METAR/TAF weather windows, and active runway/taxiway NOTAMs.
2. **Realtime Feed Health & Data Integrity** — Streaming status of all registered U.S. connectors, staleness ($S$), window completeness ($C$), and quarantined batches.
3. **Active Alert Digest** — Threshold breaches across EVM schedule/cost (`SPI < 0.90`), grant outlay stalls (`OR < 0.50`), TSA/CBP queue saturation ($\rho > 0.88$), and feed staleness.
4. **Tonight's AC 150/5370-2G Construction & BNATCS Cutover Watch** — Scheduled overnight runway/taxiway closures and BNATCS equipment cutover windows, SWIM traffic exposure score, and rollback readiness status.
5. **Terminal & CBP FIS Passenger Flow Exceptions** — Stages exceeding 95th-percentile wait budgets ($W_{q95}$) and Erlang-C dynamic lane rebalancing actions (`c*`) executed.
6. **7-Day ASPM Delay Attribution Trend** — Rolling 7-day equipment, weather, volume, and runway-construction delay minutes vs. U.S. hub cohort.
7. **Prioritized Tactical Actions** — Ranked actions with owner, confidence score, and primary feed citation.

**Key Tables:** Active Alert & Exception Queue; Tonight's CSPP Closure & BNATCS Cutover Window Schedule; Terminal Stage Erlang-C Exception Table.
**Refined Formulas:**
- Feed Health: $S = t_{\text{now}} - t_{\text{last}} > 2 \times \text{SLA} \Rightarrow \text{Degraded}$; $C = N_{\text{valid}} / N_{\text{expected}} < 0.95 \Rightarrow \text{Alert}$
- Queue Exception & Lane Target: $\rho = \lambda / (c\mu)$; $W_{q95} = \ln(20 \cdot P_{\text{wait}}) / (c\mu - \lambda)$; solve $c^*$ so $W_{q95} \le W_{\text{budget}}$
- Cutover Risk: $\text{Risk} = \text{Complexity} \times (\text{Traffic}_{\text{SWIM}} / \text{AAR}_{\text{ASPM}}) \times (t_{\text{rollback}} / t_{\text{window}})$
**Primary U.S. Sources:** [FAA SWIM](https://www.faa.gov/air_traffic/technology/swim), [FAA NOTAM Search](https://notams.aim.faa.gov/notamSearch/), [AviationWeather.gov API](https://aviationweather.gov/data/api/), [FlightAware AeroAPI](https://www.flightaware.com/commercial/aeroapi/), [OpenSky API](https://opensky-network.org/data/api), [CBP Wait Times (`awt.cbp.gov`)](https://awt.cbp.gov/), [FAA ASPM](https://aspm.faa.gov/).

---

## Common Epistemic & Governance Standards Across All U.S. Reports (R1–R10)

1. **Mandatory Provenance Block on Every Metric** — Every table cell and KPI card links to its `SourceCitation` (`sourceId`, `url`, `credibility 1–5`, `retrievedAt`), with composite confidence equal to $\min(\text{contributing credibilities})$.
2. **Unofficial Quarantine Rule** — Vendor and consultancy claims (e.g., McKinsey's 6–8% EBITDA estimate or uncorroborated biometric adoption percentages) are rendered with an explicit `Unofficial` warning badge and excluded from all underwriting cash flows, DSCR/CPE tables, and gate sign-offs.
3. **Lifecycle State Chips** — Every referenced `FundingInstrument`, `ModernizationInitiative`, `Asset`, `Capability`, and `DataSource` displays its current ECS state-machine chip.
4. **Confirmed vs. Reported Discipline (GAO Standard)** — Fast-moving federal program figures (such as BNATCS $12.5B appropriated vs. ~$16B reported Phase-1 cost) explicitly distinguish GAO/FAA confirmed statutory figures from secondary trade reporting.
5. **Reproducible Formula Appendix** — Every computed metric in R1–R10 outputs its exact parameterization from §6 of the ECS Architecture so independent financial and engineering auditors can reproduce the calculation.
6. **Batch Vintage vs. Realtime Separation** — Annual/quarterly batch filings (FAA Form 5100-127, NPIAS, BTS T-100, MSRB EMMA) anchor structural investment and grant decisions, while realtime feeds (SWIM, NOTAM, METAR, AeroAPI) drive tactical operations and cutover windows.
