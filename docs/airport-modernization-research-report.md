# US Airport Modernization & Investment Intelligence — Research Report

## Purpose & Scope

This research report establishes the domain foundation, source hierarchy, feature taxonomy, documentation gap analysis, and data-compilation strategy for a firm providing **consultation, capital advisory, and investment intelligence on airport modernization projects in the United States**. All non-US datasets and foreign project references have been removed so that regulatory rules, financial structures, and operational benchmarks strictly reflect the **U.S. National Airspace System (NAS)** and U.S. municipal/public-private airport finance.

---

## Executive Summary

1. **U.S. airport modernization is a ~$174B+ five-year capital wave (2025–2029) shifting from federal stimulus to private/municipal capital.** According to ACI-NA and FAA NPIAS data, U.S. airports require ~$173.9B–$174B over five years, with **terminal projects representing ~42%–60% of total capital need**. Because the $15B IIJA Airport Terminal Program (ATP) completed its final FY2026 NOFO round in January 2026, U.S. airport sponsors are pivoting toward **General Airport Revenue Bonds (GARBs), Passenger Facility Charge (PFC) bonds, Customer Facility Charge (CFC) bonds, Private Activity Bonds (PABs), USDOT TIFIA credit assistance, and Design-Build-Finance-Operate-Maintain (DBFOM) P3 concessions**.
2. **Investment viability in U.S. airports is governed by a unique federal-local financial architecture.** Unlike foreign privatized airports, U.S. airports must comply with **FAA Grant Assurances** (including the strict prohibition on off-airport revenue diversion under 49 U.S.C. § 47107), airline **Use and Lease Agreements (AULAs)** structured as **Residual, Compensatory, or Hybrid** rate-making regimes, and **Majority-in-Interest (MII)** airline capital approval clauses.
3. **The FAA's Brand New Air Traffic Control System (BNATCS) is the largest single federal NAS modernization program ($12.5B appropriated July 2025; Phase 1 target Dec 2028).** Executed via a performance-incentivized prime-integrator contract (Peraton), BNATCS replaces 612 radars, 27,625 radios, 462 digital voice switches, and 5,170 telecom connections across the NAS, while deploying replacement surface radars at 44 U.S. airports, Surface Awareness Initiative (SAI) surveillance at 200 airports, and Terminal Flight Data Manager (TFDM) at 89 airports. However, **GAO-26-107992** flags cost/schedule planning weaknesses and secondary reporting notes a potential ~$3.5B Phase-1 funding shortfall.
4. **Critical documentation gaps in initial public literature have been identified and closed with primary U.S. regulatory/financial sources.** Public trade summaries omit standardized U.S. airport financial disclosures (**FAA Form 5100-127 / CATS** and **MSRB EMMA** bond feasibility reports), **FAA Terminal Area Forecast (TAF)** and **ASPM/OPSNET** delay attribution databases, **NEPA environmental review bottlenecks**, **TSA PGDS / CBP ATDS** terminal design mandates, and **TRB ACRP** operational readiness standards.
5. **Digital "smart airport" features (TSA Touchless ID / CBP biometric facial comparison, AI flow management, predictive maintenance, digital twins) require strict epistemic quarantine.** Most ROI claims (such as McKinsey's estimated 6–8% EBITDA uplift or vendor biometric adoption forecasts) originate from consultancies or technology vendors rather than audited FAA/airport financial statements and are flagged **Unofficial** unless corroborated by primary operational telemetry.
6. **Decarbonization and energy resilience are increasingly tied to federal grant eligibility and EaaS P3s.** The FAA has committed $327M for gate electrification (400Hz GPU and preconditioned air) and zero-emission ground fleets alongside the statutory **FAA VALE** and **ZEV** programs. U.S. hubs (e.g., Denver Net-Zero 2040, Louisville geothermal HVAC cutting facility emissions >80%) pair federal grants with microgrid/solar **Energy-as-a-Service (EaaS)** agreements evaluated using **U.S. EPA eGRID** subregional emission factors and **FAA AEDT**.

---

## Methodology & Epistemic Discipline

- **Geographic Scope**: Strictly **United States** public-use airports within the FAA National Plan of Integrated Airport Systems (**NPIAS**, ~3,300 airports, with primary investment focus on the **U.S. Core 30**, **Large Hubs** $\ge 1.0\%$ of U.S. enplanements, and **Medium Hubs** $0.25\%–0.999\%$).
- **Source Triage & Credibility Tiering (1–5)**:
  - **5/5 (Primary Federal Statutory / Regulatory / Audited Data)**: FAA (AIP, IIJA ATP/AIG, NPIAS, TAF, ASPM/OPSNET, ADIP/5010, CATS Form 5100-127, BNATCS, Advisory Circulars), U.S. GAO, BTS TranStats, MSRB EMMA Official Statements, USDOT Build America Bureau, U.S. EPA eGRID, TSA, CBP.
  - **4/5 (Authoritative Industry Bodies, Research Programs & U.S. Operator Filings)**: TRB Airport Cooperative Research Program (ACRP), ACI-NA (North American Infrastructure Needs & Benchmarking), PANYNJ / LAWA / CDA / DFW / DEN official capital programs, Cirium OTP, peer-reviewed studies (PMC).
  - **3/5 (Specialist Legal/Management Consultancies & Technical Trade Press)**: Holland & Knight, McKinsey (calibration only), Aviation Week, Engineering News-Record (ENR), OAG, Embry-Riddle Aeronautical University (ERAU) research.
  - **1–2/5 (Vendor Blogs & Procurement Aggregators — Quarantined as Unofficial)**: Govly, Colony Construction, GovMarket News, Omniflights, Regula, vendor marketing decks.

---

## Part 1 — Authoritative U.S. Sources and What They Document

### 1.1 Federal Capital, Regulatory & Oversight Sources (FAA, USDOT, GAO)

- **FAA — National Plan of Integrated Airport Systems (NPIAS)** ([faa.gov/airports/planning_capacity/npias](https://www.faa.gov/airports/planning_capacity/npias)): Biennial report to Congress covering ~3,300 U.S. public-use airports, statutory hub classifications, 5-year activity forecasts, and eligible 5-year capital development cost estimates by project category.
- **FAA — Airport Improvement Program (AIP)** ([faa.gov/airports/aip](https://www.faa.gov/airports/aip), [overview](https://www.faa.gov/airports/aip/overview)): Core federal entitlement and discretionary grant program under 49 U.S.C. Chapter 471. Covers **75%–80%** of eligible costs at Large and Medium Primary Hubs and **90%–95%** at Small Primary, Reliever, and General Aviation airports for airfield safety, capacity, security, and noise projects. Award-level datasets are published for [FY2025](https://www.faa.gov/airports/aip/2025_aip_grants) and [FY2026](https://www.faa.gov/airports/aip/2026_aip_grants).
- **FAA — IIJA Airport Terminal Program (ATP) & Airport Infrastructure Grants (AIG)** ([faa.gov/iija/airport-terminals](https://www.faa.gov/iija/airport-terminals), [FY26 ATP NOFO](https://www.faa.gov/newsroom/FY26-ATP-NOFO-8DEC2025), [USDOT Grants](https://www.transportation.gov/tags/airport-infrastructure-grants)): The Bipartisan Infrastructure Law (IIJA) provided **$15B in competitive ATP grants** specifically for terminal development, multimodal connections, and sponsor-owned towers, plus **$15B in formula AIG funds**. The final FY2026 ATP round closed in January 2026, creating a major post-2026 shift toward municipal bonds and P3 capital.
- **FAA — Brand New Air Traffic Control System (BNATCS)** ([faa.gov fact sheet](https://www.faa.gov/newsroom/brand-new-air-traffic-control-system-bnatcs-fact-sheet)) & **U.S. GAO — GAO-26-107992** ([gao.gov/products/gao-26-107992](https://www.gao.gov/products/gao-26-107992)): Documents the NAS-wide overhaul of communications, surveillance, automation, and facilities by end-2028 under a prime-integrator contract (Peraton) with $12.5B appropriated in July 2025. GAO provides independent oversight of cost, schedule, and performance risks.
- **FAA — Net-Zero, Gate Electrification, VALE & ZEV Grants** ([faa.gov sustainability grants](https://www.faa.gov/newsroom/faa-invests-nearly-92-million-help-airports-reach-presidents-goal-net-zero-emissions-2050)): $327M for airport gate electrification (400Hz GPU, PCA) and zero-emission ground support vehicles, $100M for fuel-saving/noise research, and $35M for U.S. university SAF supply-chain development, complementing the Voluntary Airport Low Emissions (**VALE**) and **Airport ZEV** programs.

### 1.2 Better Primary U.S. Financial, Operational & Engineering Sources (Added to Close Gaps)

To provide institutional-grade investment consultation in the U.S., the following primary sources supersede generic global or trade-press summaries:

| Source Added | URL / Portal | Why It Is Superior for U.S. Airport Investment Intelligence |
|---|---|---|
| **FAA CATS (Form 5100-127 & 5100-126)** | [cats.airports.faa.gov](https://cats.airports.faa.gov/) | Mandatory annual financial filings for every U.S. commercial service airport: aeronautical vs. non-aeronautical revenue, O&M expenses, debt service, CPE inputs, unrestricted cash, and PFC collections. |
| **MSRB EMMA (Municipal Bond Disclosures)** | [emma.msrb.org](https://emma.msrb.org/) | Primary repository for U.S. airport Official Statements, continuing disclosures, debt service schedules, bond covenants, and **Independent Airport Consultant Feasibility Reports** (GARBs, PFC/CFC bonds, PABs). |
| **FAA ASPM & OPSNET** | [aspm.faa.gov](https://aspm.faa.gov/) | Official FAA operational performance database for U.S. Core 30 and ASPM 77 airports: unimpeded taxi times, Airport Arrival/Departure Rates (AAR/ADR), and cause-specific NAS delay attribution. |
| **FAA Terminal Area Forecast (TAF)** | [taf.faa.gov](https://taf.faa.gov/) | Official 20-year FAA enplanement and aircraft operations forecast per U.S. airport; required baseline for FAA Benefit-Cost Analysis (BCA), CIP approval, and NEPA review. |
| **FAA ADIP & Form 5010 Master Record** | [adip.faa.gov](https://adip.faa.gov/) | Authoritative physical inventory of U.S. runways, taxiways, aprons, navigational aids, Pavement Condition Index (PCI), and digital Airport Layout Plans (eALP). |
| **FAA Airport Investment Partnership Program (AIPP) & USDOT Build America Bureau** | [faa.gov/airports/aip/privatization](https://www.faa.gov/airports/aip/privatization) / [transportation.gov/buildamerica](https://www.transportation.gov/buildamerica) | Statutory U.S. airport privatization framework (**49 U.S.C. § 47134**) and federal low-interest **TIFIA / RRIF** credit assistance for airport landside, ConRAC, and transit projects. |
| **TRB Airport Cooperative Research Program (ACRP)** | [trb.org/ACRP](https://www.trb.org/ACRP/ACRP.aspx) | U.S. National Academies practice guides on ORAT (ACRP Report 164), financial risk modeling, terminal planning, cybersecurity, and microgrid resilience. |
| **FAA Advisory Circulars (Design, Terminal, CSPP, BCA)** | [faa.gov/airports/resources/advisory_circulars](https://www.faa.gov/airports/resources/advisory_circulars) | Mandatory U.S. standards: **AC 150/5300-13B** (Airport Design), **AC 150/5360-13A** (Terminal Planning), **AC 150/5370-2G** (Construction Safety & Phasing Plans), and FAA BCA guidance. |
| **TSA PGDS & CBP ATDS / CBP Wait Times** | [tsa.gov](https://www.tsa.gov/) / [awt.cbp.gov](https://awt.cbp.gov/) | Mandatory U.S. design standards for security checkpoints (CT/CAT-2), Checked Baggage Inspection Systems (CBIS), and Federal Inspection Services (FIS), plus historical CBP arrival wait-time data. |
| **U.S. EPA eGRID & FAA AEDT** | [epa.gov/egrid](https://www.epa.gov/egrid) / [aedt.faa.gov](https://aedt.faa.gov/) | Official U.S. sub-regional power grid emission factors (`eGRID`) for Scope 2 accounting and FAA's Aviation Environmental Design Tool (`AEDT`) for NEPA noise/emissions modeling. |

### 1.3 U.S. Industry Associations & Major Domestic Operator Programs

- **ACI-NA (Airports Council International – North America)** ([airportscouncil.org](https://airportscouncil.org/advocacy/airport-infrastructure-funding/)): Publishes the U.S. *Airport Infrastructure Needs Study* ($173.9B five-year need), annual financial/concessions/compensation benchmarking surveys, and policy analysis on the federal **$4.50 PFC cap** (unchanged since 2000) and the **Self-Sufficiency / Revenue Diversion Rule**. Documents that U.S. airports generate **$1.8T in annual economic output** and support **12.8M U.S. jobs**.
- **Port Authority of NY & NJ (PANYNJ)**: Official documentation for the **$19B JFK Transformation** (including the **$9.5B JFK New Terminal One P3** and **$4.2B Terminal 6 P3**), the **$8B LaGuardia Transformation** (Terminal B DBFOM P3 and Delta Terminal C), the **Newark Liberty (EWR) Terminal A & Vision Plan**, the proposed [record $45B 2026–2035 Capital Plan](https://www.panynj.gov/port-authority/en/press-room/press-release-archives/2025-press-releases/port-authority-proposes-record--45-billion-capital-plan-for-2026.html), and the [PANYNJ Annual Report 2025](https://www.panynj.gov/port-authority/en/annual-report.html).
- **Other Benchmark U.S. Airport Megaprograms**:
  - **Los Angeles World Airports (LAWA — LAX)**: ~$30B capital program featuring the Automated People Mover (APM) DBFOM P3, Consolidated Rent-A-Car (ConRAC) facility, and Midfield Satellite Concourse.
  - **Chicago O'Hare (ORD — O'Hare 21 / Terminal Area Plan)**: Global Terminal and satellite concourses, airfield runway/taxiway reconfiguration, and GARB/PFC financing.
  - **Metropolitan Washington Airports Authority (MWAA — DCA & IAD)**: DCA Project Journey / Terminal 1 (~$835M) and Dulles Concourse E.
  - **Denver International Airport (DEN — Vision 100 / Great Hall & Gate Expansion)**: 39-gate expansion, Great Hall P3 transition, $327M FAA-backed gate electrification, and Net-Zero 2040 energy glidepath.
  - **Dallas/Fort Worth (DFW Forward) & Hartsfield-Jackson Atlanta (ATL Next)**: Modular/prefabricated concourse expansion, digital twin operations, and TSA PreCheck Touchless ID / biometric boarding deployments.
  - **Louisville Muhammad Ali International (SDF)** & **Spokane International (GEG)**: SDF geothermal HVAC retrofit cutting terminal heating/cooling emissions >80% ([PMC study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12307590)); GEG Terminal Renovation & Expansion (TREX) and $48M design-build parking/landside expansion.

---

## Part 2 — U.S. Feature Taxonomy, Resolved Gaps, and Unofficial Claims (Categories A–J)

### A. U.S. Funding, Capital Stack & Rate-Making Models
- **FAA AIP Entitlement & Discretionary Grants**: 75%–80% federal share at Large/Medium Hubs; 90%–95% at Small/Reliever/GA airports (49 U.S.C. § 47109).
- **IIJA Airport Terminal Program (ATP, $15B) & Airport Infrastructure Grants (AIG, $15B)**: Final ATP round closed January 2026; active drawdown and single-audit compliance under 2 CFR Part 200 through FY2030.
- **Passenger Facility Charges (PFCs — 14 CFR Part 158)**: Federally capped at **$4.50 per enplaned passenger** (max $18.00 round-trip) less **$0.11/pax airline collection compensation**. Used for Pay-Go capital or pledged to stand-alone PFC bonds / hybrid GARBs.
- **General Airport Revenue Bonds (GARBs) & Private Activity Bonds (PABs)**: Tax-exempt Non-AMT (governmental) and AMT (private activity) municipal bonds, Special Facility Revenue Bonds, and Customer Facility Charge (CFC) bonds for ConRACs.
- **U.S. Airport P3 & Concession Structures**:
  - *Terminal DBFOM Concessions* (e.g., JFK New Terminal One, LGA Terminal B) financed via private equity + PABs/bank debt.
  - *Landside / ConRAC / People Mover Availability-Payment DBFOMs* (e.g., LAX APM & ConRAC) backed by CFCs, airport revenues, and **USDOT TIFIA loans**.
  - *Full-Airport Lease under FAA AIPP (49 U.S.C. § 47134)*: Requires supermajority (65%) airline approval to waive the federal revenue-diversion prohibition (e.g., San Juan `SJU`).
- **Resolved Gap — Airline Use & Lease Agreement (AULA) Rate-Making & MII Governance**:
  - **Residual** (airlines guarantee net cost recovery; lower airport revenue risk, stricter MII capital vetoes), **Compensatory** (airport assumes non-aeronautical volume risk and retains commercial upside), and **Hybrid** revenue-sharing models.
  - **Cost Per Enplaned Passenger (CPE)** and **Unrestricted Days Cash on Hand (DCOH)** are primary underwriting metrics alongside **DSCR**.

### B. Airfield Infrastructure (Runways, Taxiways, Aprons)
- Runway rehabilitation, slab replacement, extensions, and Runway Safety Area (RSA) / Engineered Materials Arresting System (EMAS) upgrades per **FAA AC 150/5300-13B**.
- Taxiway geometry modernization (eliminating high-energy intersections and direct runway crossings under the FAA Runway Incursion Mitigation `RIM` program).
- Digital Airport Layout Plan (**eALP**) updates in FAA ADIP.
- **Resolved Gap — Live-Operations Construction Safety & Phasing Plans (CSPP)**: Governed by **FAA AC 150/5370-2G**, Safety Risk Management (SRM) panels, and FAA quarterly Airport Construction Impact Reports utilizing overnight/low-AAR closure windows.
- **Resolved Gap — Airspace & PBN/RNP Procedure Integration**: NextGen Performance-Based Navigation (RNAV/RNP, EoR — Established on RNP) procedure design synchronized with new runway/taxiway commissioning.

### C. Terminal & Passenger Experience
- New terminal construction, concourse expansions, and headhouse reconfigurations (JFK NTO/T6, LGA Terminal B/C, EWR Terminal A/B, ORD Global Terminal, DCA Terminal 1, DEN Gate Expansion).
- Non-aeronautical concession redevelopment (food & beverage, duty-free, specialty retail, common-use lounges) driving non-airline revenue per enplaned passenger (**NARE**).
- **Resolved Gap — U.S. Accessibility Mandate (ADA Title II & ACAA 14 CFR Part 382)**: Mandatory compliance with the Americans with Disabilities Act (ADA), Air Carrier Access Act (ACAA), and FAA AIP Civil Rights assurances (boarding bridges, adult changing stations, visual paging, PRM wayfinding, and accessible self-service kiosks).
- **Resolved Gap — Domestic/International Swing Gates & Sterile Corridor Design**: Flexible swing-gate apron/corridor configurations feeding U.S. CBP Federal Inspection Services (FIS) facilities.

### D. Digital & Smart-Airport Technology (Infratech)
- AI-driven real-time gate, counter, and lane allocation — *McKinsey benchmark framing*.
- Predictive maintenance via IoT vibration/thermal sensors on baggage handling systems (BHS), passenger boarding bridges (PBBs), escalators, and central utility plants.
- Airport Digital Twins and Building Information Modeling (BIM) handover for lifecycle asset management.
- Biometric self-bag-drop (~70 s/passenger stage budget, ~30% faster than manual agent check-in per OAG) and **TSA PreCheck Touchless ID / CBP Simplified Arrival facial comparison** at U.S. checkpoints and departure gates.
- **Unofficial Claims Quarantined**:
  - *"6–8% EBITDA boost from smart-airport infratech"* (McKinsey consultancy estimate — treat as aspirational benchmark, never as audited underwriting cash flow).
  - *"Nearly half of airports will implement biometric identity management by end-2026"* (uncorroborated vendor blog claim).
- **Resolved Gap — U.S. Aviation Cybersecurity (TSA Security Directives & NIST CSF 2.0)**: Mandatory OT/IT network segmentation (especially BHS PLCs, airfield lighting control, and fuel farm SCADA), zero-trust architecture, and incident response plans required under TSA Aviation Cybersecurity Security Directives.
- **Resolved Gap — Biometric Privacy & Opt-Out Governance**: Compliance with CBP/TSA privacy impact assessments (immediate deletion of U.S. citizen photos within 12 hours, clear physical signage for mandatory manual ID opt-out lanes, and state biometric privacy statutes).

### E. Air Traffic Control & NAS Modernization (BNATCS)
- Five BNATCS pillars: communications, surveillance, automation, facilities, and Alaska aviation safety.
- Telecom backbone priority: 5,170 high-speed fiber/satellite/wireless connections replacing legacy TDM copper trunks.
- National hardware lots: 612 radars, 27,625 radios, 462 digital voice switches, 1 new consolidated ARTCC, 1 new consolidated TRACON.
- Airport-specific NAS deployments:
  - **44 U.S. airports** receiving replacement Airport Surface Detection Equipment (ASDE-X / ASR replacements).
  - **200 U.S. airports** receiving Surface Awareness Initiative (SAI) ADS-B surface surveillance.
  - **89 U.S. airports** receiving Terminal Flight Data Manager (TFDM) electronic flight strips and surface metering.
  - **435 ATCT towers** receiving Enterprise Information Display Systems (EIDS) and **113 towers** receiving Tower Simulation Systems (TSS).
- **Oversight Caveat**: $12.5B appropriated July 2025 with Dec 2028 Phase-1 target; **GAO-26-107992** documents cost/schedule planning risks, and secondary sources report a potential ~$16B cost / ~$3.5B funding gap (*reported, not confirmed*).
- **Resolved Gap — FAA Controller Staffing (CRWG Targets) & Remote/Digital Towers**: FAA Certified Professional Controller (CPC) staffing levels per facility (FAA Air Traffic Controller Workforce Plan) and FAA systems safety certification of U.S. remote/digital towers for non-towered/small-hub airports.

### F. Security (TSA) & Baggage Handling Systems (CBIS)
- **Resolved Gap — TSA Planning Guidelines and Design Standards (PGDS)**: In-line Checked Baggage Inspection Systems (CBIS) with high-speed Explosives Detection Systems (EDS) and Individual Carrier System (ICS) totes.
- **TSA Checkpoint Modernization**: Computed Tomography (CT) 3D carry-on scanners, Automated Screening Lanes (ASLs), and Credential Authentication Technology (**CAT-2** with biometric camera).
- **U.S. CBP Federal Inspection Services (FIS)**: Compliant with **CBP Airport Technical Design Standards (ATDS)**, Simplified Arrival facial biometrics, Mobile Passport Control (MPC), and Global Entry kiosks.

### G. Sustainability, Electrification & Climate Resilience
- **Gate Electrification & Preconditioned Air (PCA)**: 400Hz solid-state ground power units (GPUs) and electric PCA units allowing aircraft to shut down auxiliary power units (APUs) at the gate ($327M FAA grants + FAA **VALE** program).
- **Zero-Emission Ground Support Equipment (eGSE) & Shuttle Fleets**: Electric airside buses and GSE charging infrastructure (FAA **ZEV** program; deployed at LAX, DEN, JFK, SFO, BOS).
- **Low-Carbon Thermal Plants**: Geothermal HVAC heat-pump retrofits (e.g., Louisville `SDF` >80% facility emissions reduction) and electrified Central Utility Plants (CUPs).
- **Sustainable Aviation Fuel (SAF) Infrastructure**: Hydrant fuel system compatibility and blending facilities ($35M FAA university supply-chain program + IRA/45Z tax credit ecosystems).
- **Resolved Gap — On-Airport Solar, Battery Storage & Microgrid EaaS P3s**: Islandable solar + battery microgrids (e.g., JFK New Terminal One 11.3 MW rooftop solar microgrid, Chattanooga `CHA`, Fresno `FAT`) procured via **Energy-as-a-Service (EaaS)** P3s to guarantee backup power for critical FAA/terminal loads and cut Scope 2 emissions.

### H. Ground Access, ConRAC & Intermodal Landside
- Automated People Movers (APMs) and direct rail connections (LAX APM, EWR AirTrain replacement, JFK AirTrain, DCA/IAD WMATA Metrorail, DEN RTD commuter rail).
- Consolidated Rent-A-Car (**ConRAC**) facilities financed via Customer Facility Charges (**CFCs**) and DBFOM P3s.
- Curbside congestion management, TNC (Uber/Lyft) geofenced staging lots, and commercial vehicle access fees.

### I. Air Cargo & E-Commerce Logistics Modernization
- U.S. air cargo hub modernization (MEM, SDF, ANC, MIA, ORD,LAX, CVG, RFD): automated multi-story air cargo sortation facilities, cold-chain pharmaceutical facilities, and widebody freighter apron expansions.
- **Resolved Gap — Cargo Community Systems (CCS) & Ground Handler Automation**: Digital dock scheduling (slot booking to eliminate landside truck queuing), ULD tracking, and private industrial REIT / developer ground-lease concessions on airport property.

### J. U.S. Project Delivery & Program Management Models
- **Design-Bid-Build (DBB)**: Traditional delivery for standard AIP-funded airfield paving where design is 100% prescribed by FAA Advisory Circulars.
- **Design-Build (DB) & Progressive Design-Build (PDB)** / **CMAR (Construction Manager at Risk)**: Dominant delivery models for U.S. terminal and parking expansions (per state enabling statutes and ACI-NA / Design-Build Institute of America airport guidelines).
- **DBFOM Public-Private Partnerships (P3s)**: Terminal concessions (JFK NTO, JFK T6, LGA Terminal B), ConRAC/APM availability-payment P3s (LAX), and Central Utility Plant / Microgrid EaaS P3s.
- **Performance-Incentivized Prime Integrator**: FAA BNATCS (Peraton) model tying fee recovery to site cutover milestones.
- **Resolved Gap — ACRP Operational Readiness and Airport Transfer (ORAT)**: Structured commissioning, integrated systems testing, and live stakeholder trials per **TRB ACRP Report 164** and IATA ORAT standards.

---

## Part 3 — Master Source Matrix for Compiling U.S. Airport Data

| Analytical / Investment Need | Primary U.S. Source | Data Provided & Cadence | Credibility |
|---|---|---|---|
| **5-Year Capital Needs & Hub Roles** | [FAA NPIAS](https://www.faa.gov/airports/planning_capacity/npias) & [ACI-NA Infrastructure Needs Study](https://airportscouncil.org/advocacy/airport-infrastructure-funding/) | ~3,300 U.S. airports, hub classifications, 5-year AIP/ATP eligible and total capital needs (Biennial) | 5/5 (FAA) · 4/5 (ACI-NA) |
| **Airport Audited Financials, CPE & Cash** | [FAA CATS (Form 5100-127 / 5100-126)](https://cats.airports.faa.gov/) | Aeronautical/non-aeronautical revenues, O&M, debt service, PFC collections, unrestricted cash, CPE (Annual) | 5/5 |
| **Municipal Bond Covenants & Feasibility** | [MSRB EMMA](https://emma.msrb.org/) | Official Statements, Consultant Feasibility Reports, DSCR projections, AULA terms (Event/Annual) | 5/5 |
| **Federal Grant Awards & Drawdowns** | [FAA AIP Grants (2025/2026)](https://www.faa.gov/airports/aip/2026_aip_grants), [IIJA ATP](https://www.faa.gov/iija/airport-terminals), [USAspending.gov](https://www.usaspending.gov/) | Project-level federal grant obligations, outlay ratios, and remaining balances (Monthly/Annual) | 5/5 |
| **20-Year Demand Forecasts & Capacity** | [FAA Terminal Area Forecast (TAF)](https://taf.faa.gov/) | Historical and 20-year projected enplanements and operations per U.S. airport (Annual) | 5/5 |
| **Enplanements, Carrier Share & Fares** | [BTS TranStats (T-100, DB1B)](https://www.transtats.bts.gov/data_elements.aspx) | Airline market share concentration (HHI), O&D vs. connecting traffic ratio, domestic/international pax (Monthly/Quarterly) | 5/5 |
| **NAS Delays, Taxi Times & AAR/ADR** | [FAA ASPM & OPSNET](https://aspm.faa.gov/) | Facility-level delay causes (equipment, weather, volume, runway construction), unimpeded taxi times, hourly capacity (Daily/Monthly) | 5/5 |
| **Physical Airfield & Pavement Inventory** | [FAA ADIP / Form 5010](https://adip.faa.gov/) | Runway/taxiway dimensions, Pavement Condition Index (PCI), eALP geometry (Continuous) | 5/5 |
| **Realtime NAS Traffic, Closures & Weather** | [FAA SWIM (SFDPS/STDDS)](https://www.faa.gov/air_traffic/technology/swim), [FAA NOTAM](https://notams.aim.faa.gov/notamSearch/), [AviationWeather.gov](https://aviationweather.gov/data/api/) | Live NAS flight plans, surface movement, active runway/taxiway construction NOTAMs, METAR/TAF (Realtime) | 5/5 |
| **Security & Customs Wait Times** | [CBP Airport Wait Times (`awt.cbp.gov`)](https://awt.cbp.gov/) & TSA Checkpoint Data | Hourly international arrival FIS processing times, booth utilization, checkpoint throughput (Daily/Hourly) | 5/5 |
| **Emissions Factors & Environmental Model** | [U.S. EPA eGRID](https://www.epa.gov/egrid) & [FAA AEDT](https://aedt.faa.gov/) | Sub-regional electricity grid $\text{CO}_2\text{e}$ intensity (`lb/MWh`) and aircraft/APU emissions inventory (Annual) | 5/5 |
| **Passenger Satisfaction & Peer Benchmarks** | [ACI-NA Benchmarking](https://airportscouncil.org/) & [ACI ASQ](https://aci.aero/programs-and-services/asq/) | In-airport passenger experience scores, concession sales/sq ft, and O&M cost benchmarks (Quarterly/Annual) | 4/5 |
| **BNATCS NAS Modernization Oversight** | [FAA BNATCS](https://www.faa.gov/newsroom/brand-new-air-traffic-control-system-bnatcs-fact-sheet) & [GAO-26-107992](https://www.gao.gov/products/gao-26-107992) | National lot progress, appropriations ($12.5B), schedule risk, and audit findings (Periodic) | 5/5 |

---

## Conflicts, Caveats & Epistemic Rules

1. **BNATCS Phase-1 Cost ($12.5B Appropriated vs. ~$16B Reported)**: Official FAA and GAO-26-107992 documentation confirms $12.5B appropriated in July 2025 with a December 2028 Phase-1 target, while GAO warns of cost and schedule estimation weaknesses. Secondary trade reporting (Omniflights) cites a ~$16B Phase-1 cost and ~$3.5B shortfall; this figure is flagged **Reported, Not Confirmed** until verified by an official GAO or DOT Inspector General audit.
2. **Aggregated "National Plan" Framing**: Vendor/procurement intelligence claims of a "$40B U.S. World Cup Modernization Plan" (Govly) simply aggregate independent local capital programs at DFW, ORD, JFK, SEA, and BNA; it is not a federal appropriation.
3. **Smart-Airport EBITDA & Biometric Adoption Claims**: Consultancy estimates ("6–8% EBITDA uplift") and vendor blog projections ("50% biometric adoption by end-2026") are quarantined as **Unofficial** (`Credibility ≤ 3`) and excluded from financial model cash flows unless backed by audited airport pilot telemetry.
