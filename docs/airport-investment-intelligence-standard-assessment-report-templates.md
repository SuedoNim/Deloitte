# Airport Investment Intelligence — Standard Assessment Report Templates

The ten standard report types generated in this field, in the order of the intelligence lifecycle: context → justification → funding → delivery → readiness → performance → compliance. Each template lists: purpose, triggering workflow (W1–W7, from the ECS Architecture), consumers, standard outline with section content, key tables, embedded formulas, required data sources, and the view (V1–V7) that renders it. Every quantitative section carries a **Provenance** block (source, credibility 1–5, retrieval date) per the ECS `Provenance` schema; unofficial inputs are flagged and excluded from conclusions.

## R1 — Airport Infrastructure Needs & Funding Gap Assessment

**Purpose:** quantify what an airport (or system) needs, what is funded, and what the gap is. The field's foundational assessment (modeled on NPIAS 5-year estimates and ACI-NA Infrastructure Needs Study).
**Workflow:** W1. **Consumers:** board/authority, FAA, legislators, bond underwriters. **View:** V1.

1. **Executive Summary** — total 5-year need, funded amount, gap, top-3 unfunded risks.
2. **Scope & Methodology** — airports included, cost-estimate basis (NPIAS categories), inflation assumptions.
3. **Inventory & Condition** — facilities by category (A–J tags), age, condition ratings.
4. **Demand Forecast** — enplanements, movements (NPIAS 5-yr forecasts; ACI traffic data).
5. **Needs by Category** — table: category | 5-yr cost | safety/capacity/standard-driven split.
6. **Funding Outlook** — AIP entitlement/discretionary, PFC capacity, bonds, P3 pipeline.
7. **Funding Gap Analysis** — the core table (below).
8. **Risk of Deferral** — cost escalation of delayed projects, capacity shortfalls.
9. **Recommendations** — instrument strategy per category; advocacy items (PFC cap).

**Key tables:** Needs vs. funded by category; per-airport gap ranking.
**Formulas:** `Gap = TotalNeed − Σ FundedInstruments`; `PFC_annual = enplanements × rate`; `DSCR = netRevenues / debtService` (bond capacity).
**Sources:** [NPIAS](https://www.faa.gov/airports/planning_capacity/npias), [ACI-NA needs](https://airportscouncil.org/advocacy/airport-infrastructure-funding/), [BTS enplanements](https://www.transtats.bts.gov/data_elements.aspx), AIP grant lists.

## R2 — Capital Improvement Plan (CIP)

**Purpose:** the airport's multi-year (typically 5-year) rolling program of projects with costs, timing, and funding sources. Standard sponsor document for FAA planning (AIP CIP requirement).
**Workflow:** W1→W2. **Consumers:** FAA Airports Office, board, finance. **View:** V1/V2.

1. **Program Summary** — total program value, phasing, funding mix.
2. **Project Listings by Year** — one row per project (table below).
3. **Funding Plan** — per-year sources: AIP, PFC, bonds, internal cash, grants.
4. **Prioritization Justification** — ranking method (safety > standards > capacity > renewal).
5. **Coordination Notes** — construction sequencing, airline agreements, operating impact.

**Key table:** `Airport | Project | Category | Justification (safety/capacity/standard) | Cost | Fiscal years | Funding source(s)`.
**Formulas:** sponsor share `= Cost × (1 − s)` per AIP share rules; annual funding balance check (sources = uses per year).
**Sources:** AIP eligibility rules, PFC approved-project list, master plan.

## R3 — Investment Appraisal / Business Case (Feasibility Study)

**Purpose:** decide whether a major initiative should proceed (go/no-go). Required for terminal megaprojects, P3s, PPP bids.
**Workflow:** W2 (entry gate). **Consumers:** board, investors, lenders, airline partners. **View:** V2.

1. **Strategic Case** — demand drivers, alignment with master plan, competition (hub strategy).
2. **Economic Case** — options appraisal (do-minimum vs. options), NPV/BCR.
3. **Commercial Case** — delivery model (DBB/DB/P3/prime integrator), market sounding.
4. **Financial Case** — capex phasing, funding stack, affordability, sensitivity.
5. **Management Case** — governance, ORAT, risk allocation.
6. **Conclusion & Conditions**.

**Key tables:** options comparison matrix; funding stack; sensitivity/tornado table.
**Formulas:** demand trigger `forecastPax / designCapacity ≥ threshold`; `NPV = Σ CF_t / (1+r)^t`; `BCR = PV(benefits) / PV(costs)`; `IRR` where NPV = 0; DSCR per year ≥ 1.25 covenant.
**Sources:** IATA ADRM (demand-led, fit-for-purpose), ACI traffic forecasts, operator financials (e.g., PANYNJ annual report), bond docs.

## R4 — Grant Application & Funding Submission

**Purpose:** the formal ask. AIP application / ATP NOFO response / state program submission.
**Workflow:** W1 (InstrumentSelected → Applied). **Consumers:** FAA grants office. **View:** V1.

1. **Applicant & Project Identification** — sponsor, airport NPIAS ID, location.
2. **Project Description & Scope** — tied to eligible categories (safety, capacity, security, noise; ATP: terminals).
3. **Justification** — aeronautical demand basis (AIP requirement), benefit narrative.
4. **Cost Estimate & Schedule** — breakdown by element, fiscal-year phasing.
5. **Sponsor Certifications** — grant assurances, procurement, environmental compliance (NEPA).
6. **Funding Composition** — federal share request, sponsor match source.

**Key tables:** itemized cost estimate; milestone schedule; match-source table.
**Formulas:** federal share `= s × eligibleCost`; sponsor match remainder with PFC/bond eligibility check.
**Sources:** [AIP overview](https://www.faa.gov/airports/aip/overview), [ATP NOFO](https://www.faa.gov/newsroom/FY26-ATP-NOFO-8DEC2025), environmental review requirements.

## R5 — Program Delivery Status Report (Monthly/Quarterly)

**Purpose:** the standing capital-program report: EVM, milestones, risks, funds drawn. What boards and funders receive monthly.
**Workflow:** W2 (UnderConstruction steady-state). **Consumers:** program board, CFO, funder. **View:** V2.

1. **Executive Dashboard** — portfolio SPI/CPI, at-risk projects, cash drawn.
2. **Project Status Table** — per initiative: state chip, % complete, SPI, CPI, EAC vs. BAC, next milestone.
3. **Milestone Variance** — due vs. actual, variance days, driver.
4. **Financial Position** — obligations, outlays, outlay rate, projected closeout.
5. **Risk & Issue Register** — top-10 with mitigation owners.
6. **Construction Impact on Operations** — active closures, traffic exposure, night-work windows.
7. **Period Actions & Decisions Requested.**

**Key tables:** EVM rollup; risk register; closure calendar.
**Formulas:** `SPI = EV/PV`, `CPI = EV/AC`, `EAC = BAC/CPI`, `SV = EV − PV`; `OR = outlays/obligated`; `η = workHours / (closureHours × crew)` per window.
**Sources:** internal EVM ledger, funding events (W1), NOTAM/closure data (V7 feeds).

## R6 — ORAT / Operational Readiness Assessment

**Purpose:** certify a new/renovated facility is ready for live operations. The commissioning gate report (IATA ORAT best practice).
**Workflow:** W2 (Commissioning → Operational). **Consumers:** airport ops, airlines, regulators, insurers. **View:** V2/V3.

1. **Readiness Summary** — `R = passed/total` against the ≥ 0.95 gate; critical-defect count (must be 0).
2. **Trial Results** — full-scale operational trials (dry runs, live pax trials) by scenario.
3. **Systems Integration Status** — BHS, security screening, FIDS, gates, IT/cyber.
4. **Gap-fill Certifications** — cyber resilience check, climate resilience check, accessibility (PRM) audit.
5. **Staffing & Training** — trained-staff ratio per position, roster readiness.
6. **Defect & Snag List** — severity-ranked, owners, close-out dates.
7. **Gate Recommendation** — open / conditional / deferred.

**Key tables:** trial scenario results; defect backlog with severity classes.
**Formulas:** readiness ratio; training coverage `= trainedStaff / requiredStaff`; throughput verification vs. design `μ` per process stage.
**Sources:** trial logs, design capacity specs (ADRM), TSA/authority acceptance records.

## R7 — Airport Benchmarking & Performance Assessment

**Purpose:** position an airport against its cohort (passenger experience, cost, productivity, on-time). Annual or quarterly (ACI ASQ / traffic / financial benchmarking pattern).
**Workflow:** W7 (BenchmarkSystem output). **Consumers:** executive team, board, ACI submissions. **View:** V7 (and V3/V6).

1. **Cohort Definition** — peer set (size class, region, hub role) and data vintage.
2. **Traffic & Market** — pax, cargo, movements, YoY, rank and percentile (ACI dataset).
3. **Passenger Experience** — ASQ dimension scores, live-survey basis; satisfaction trend vs. traffic load.
4. **Operational Performance** — OTP percentile (Cirium/OAG), delay attribution, slot utilization.
5. **Financial Productivity** — cost per passenger (CPR), aeronautical vs. non-aeronautical revenue mix, ROCE.
6. **Technology Maturity** — infratech dimension scores vs. cohort z-scores.
7. **Gap Analysis & Priorities** — bottom-quartile metrics with remediation linkage to W3/W6.

**Key tables:** metric | airport | cohort median | percentile | z | trend.
**Formulas:** percentile `p = |{x′<x}|/n`; `z = (x − μ)/σ`; composite `I = Σ wⱼ·norm(metricⱼ)` with credibility weights.
**Sources:** [ACI Data Center](https://aci.aero/resources/data-center/), [ASQ](https://aci.aero/programs-and-services/asq/), [Cirium OTP](https://www.cirium.com/resources/on-time-performance/), ACI-NA benchmarking surveys.

## R8 — Sustainability & Energy Transition Assessment

**Purpose:** baseline emissions, target glidepath, portfolio plan, verification status. The report behind net-zero commitments (Denver-type plans, ACI environmental benchmarking).
**Workflow:** W5. **Consumers:** board, authorities, ACI ACRE/CDP submissions, grantors. **View:** V5.

1. **Baseline Inventory** — Scope 1+2 by source, base year, kWh/pax intensity.
2. **Targets & Glidepath** — net-zero year, interim milestones, fleet ZEV%.
3. **Portfolio & Initiatives** — each with tCO2e impact, cost, funding, status chips.
4. **Progress vs. Glidepath** — OnTrack/OffTrack determination with driver analysis.
5. **Embodied Carbon** — kgCO2e/m² of new builds vs. IATA benchmarks.
6. **Grant Compliance** — electrification/SAF grant milestones (e.g., FAA $327M program reporting).
7. **Verification Statement** — internal/third-party assurance level.

**Key tables:** inventory table by emission source; initiative register; glidepath table (year, target, actual).
**Formulas:** `E = Σ(fuel×EF) + electricity×gridEF`; `ZEV% = ZEV/fleet`; `annualΔ = (E_t − E_target)/yearsRemaining`; `kWh/pax`.
**Sources:** [FAA net-zero grants](https://www.faa.gov/newsroom/faa-invests-nearly-92-million-help-airports-reach-presidents-goal-net-zero-emissions-2050), [IATA embodied carbon tools](https://www.iata.org/en/programs/ops-infra/airport-infrastructure/airport-development/), [peer-reviewed net-zero framework](https://pmc.ncbi.nlm.nih.gov/articles/PMC12307590), metered energy data (W7).

## R9 — Investment Due Diligence Report (Privatization / P3 / Acquisition)

**Purpose:** the acquirer/lender-side assessment for PPP bids, concessions, secondary stakes. Common in the India/PPP and Gulf markets.
**Workflow:** cross-cutting (W1+W2+W5+W7 evidence). **Consumers:** investors, lenders, rating agencies. **View:** all, projected via V7 hub.

1. **Asset Overview** — traffic history & forecast, regulatory status, slot/charge regime.
2. **Infrastructure Condition** — asset age, renewal backlog (R1-derived), capex obligations (CIP).
3. **Traffic Risk** — airline concentration, volatility scenarios, O&D basis.
4. **Financial Model Review** — revenue per pax, EBITDA margin, DSCR headroom, concession-life NPV.
5. **Regulatory & Concession Terms** — tariff resets, performance penalties, PRI compliance.
6. **ESG & Climate Risk** — transition risk on charges, physical risk (heat/flood) to assets.
7. **Key Value Drivers & Deal Risks** — ranked with mitigants.
8. **Valuation Range & Recommendation.**

**Key tables:** scenario traffic model; capex obligations vs. concession cash flow; DSCR per year.
**Formulas:** revenue CAGR; traffic elasticity to GDP; `NPV`, `IRR` over concession term; stress-case DSCR floor; grant leverage `= programCost / grant`.
**Sources:** operator disclosures ([PANYNJ](https://www.panynj.gov/port-authority/en/annual-report.html) pattern), [privatization history (IBA)](https://www.ibanet.org/airport-privitisation-india-summary), ACI financial benchmarking, bond/concession documents.

## R10 — Realtime Operations Intelligence Brief (Daily/Situational)

**Purpose:** the daily decision-support product of the realtime data hub — current state, exceptions, and recommended actions. The operational complement to all investment assessments.
**Workflow:** W7. **Consumers:** ops directors, program managers, duty officers. **View:** V7 (+V3/V4 drill-downs).

1. **Airport Status Summary** — movements YTD/hour, arrivals/departures boards, weather (METAR/TAF), active NOTAMs.
2. **Feed Health** — staleness, completeness, degraded/quarantined feeds with credibility notes.
3. **Alert Digest** — budget/schedule/queue/emissions/staleness alerts raised, with severity and owner.
4. **Construction & Cutover Watch** — tonight's closure windows, traffic exposure, rollback readiness.
5. **Passenger Flow Exceptions** — stages over budget (ρ > 0.9), optimization actions taken.
6. **Trend Watch** — 7-day delay attribution, OTP movement vs. cohort.
7. **Recommended Actions** — ranked, each with source and confidence.

**Key tables:** alert queue; closure/cutover calendar; stage-budget exceptions.
**Formulas:** staleness `S > 2×SLA → Degraded`; completeness `C < 0.95 → alert`; `movements(airport,hour)`; `ρ = λ/(cμ)` per stage.
**Sources:** [SWIM](https://www.faa.gov/air_traffic/technology/swim), [NOTAM](https://notams.aim.faa.gov/notamSearch/), [METAR API](https://aviationweather.gov/data/api/), [AeroAPI](https://www.flightaware.com/commercial/aeroapi/), [FR24](https://fr24api.flightradar24.com/), [OpenSky](https://opensky-network.org/data/api) — the full V7 catalog.

## Common Standards Across All Templates

1. **Provenance block on every number** — source, credibility (1–5), retrieved date; confidence = min across contributing sources.
2. **Unofficial quarantine** — vendor/consultancy claims appear flagged, never in conclusions.
3. **State chips** — every asset/initiative/grant referenced carries its lifecycle state.
4. **Version & as-of discipline** — fast-moving figures (BNATCS status, traffic) state their as-of date; GAO-style "reported vs. confirmed" distinction.
5. **Formula appendix** — every computed figure lists its formula (from the ECS workflow specs) so results are reproducible.
6. **Data vintage warning** — batch sources (ACI annual, BTS quarterly) must not be presented as current; pair with realtime feeds where freshness matters.