# U.S. Airport Investment Intelligence — Authoritative Sources & Epistemic Triage

This guide organizes the authoritative data and regulatory sources required to operate a **U.S. Airport Modernization Consultation & Investment Intelligence Platform**. All non-U.S. sources have been removed, and primary U.S. financial, regulatory, engineering, and operational databases have been added to close documentation gaps.

---

## 1. Domain & Regulatory Training Sources — How U.S. Airport Finance & Delivery Work

*Trains the consulting & investment engines on U.S. statutory grant rules, municipal bond/P3 structures, airline rate-making (Residual vs. Compensatory), design standards, and epistemic discipline (Official vs. Unofficial vs. Gap).*

| Source | Credibility | What It Trains & Governs |
|---|---|---|
| [FAA Airport Improvement Program (AIP) Overview](https://www.faa.gov/airports/aip/overview) | 5/5 | Statutory federal grant shares under **49 U.S.C. § 47109** (75%–80% for Large/Medium Primary Hubs; 90%–95% for Small Primary, Reliever, and GA airports), entitlement formulas, and eligible vs. ineligible project scopes. |
| [FAA IIJA Airport Terminal Program (ATP)](https://www.faa.gov/iija/airport-terminals) + [FY26 ATP NOFO](https://www.faa.gov/newsroom/FY26-ATP-NOFO-8DEC2025) | 5/5 | Terminal modernization grant mechanics ($15B total; final round closed Jan 2026), active grant drawdown compliance, and the post-2026 transition to bond/P3 capital. |
| [ACI-NA Airport Infrastructure Funding](https://airportscouncil.org/advocacy/airport-infrastructure-funding/) | 4/5 | The $173.9B 5-year U.S. capital need (~60% terminals), the **$4.50 PFC cap** ($0.11/pax airline handling fee deduction), Airline Use & Lease Agreements (AULAs), and the federal **Self-Sufficiency / Revenue Diversion Rule**. |
| [MSRB EMMA (Electronic Municipal Market Access)](https://emma.msrb.org/) | 5/5 | Primary U.S. municipal bond disclosures: General Airport Revenue Bonds (GARBs), PFC/CFC bonds, Private Activity Bonds (PABs), bond indentures, DSCR covenants, and **Independent Airport Consultant Feasibility Reports**. |
| [FAA Airport Investment Partnership Program (AIPP)](https://www.faa.gov/airports/aip/privatization) & [USDOT Build America Bureau (TIFIA)](https://www.transportation.gov/buildamerica) | 5/5 | U.S. airport privatization law (**49 U.S.C. § 47134**), terminal/ConRAC/EaaS **DBFOM P3** structuring, and low-interest federal **TIFIA / RRIF** credit assistance for airport ground access and ConRACs. |
| [FAA Advisory Circulars (AC 150/5300-13B, 150/5360-13A, 150/5370-2G)](https://www.faa.gov/airports/resources/advisory_circulars) | 5/5 | Mandatory U.S. geometric airfield design, terminal planning, **Construction Safety and Phasing Plans (CSPP)** during live operations, and **FAA Benefit-Cost Analysis (BCA)** guidance. |
| [TRB Airport Cooperative Research Program (ACRP)](https://www.trb.org/ACRP/ACRP.aspx) | 4/5 | U.S. National Academies practice standards for **ORAT (ACRP Report 164)**, airport cyber resilience, microgrid development, and financial risk modeling. |
| [TSA Planning Guidelines & Design Standards (PGDS)](https://www.tsa.gov/) & [CBP Airport Technical Design Standards (ATDS)](https://www.cbp.gov/) | 5/5 | Mandatory U.S. security checkpoint design (CT scanners, CAT-2), Checked Baggage Inspection Systems (CBIS), and Federal Inspection Services (FIS) biometric Simplified Arrival standards. |
| [FAA BNATCS Fact Sheet](https://www.faa.gov/newsroom/brand-new-air-traffic-control-system-bnatcs-fact-sheet) & [GAO-26-107992](https://www.gao.gov/products/gao-26-107992) | 5/5 | NAS air traffic control modernization scope ($12.5B appropriated, Dec 2028 Phase-1 target, Peraton prime-integrator contract) and GAO oversight discipline ("Confirmed vs. Reported"). |
| [U.S. Megaprogram Case Material: PANYNJ ($45B Plan / JFK NTO P3)](https://www.portauthoritybuilds.com/redevelopment/us/en/home.html), LAWA (LAX), DEN, ORD, MWAA | 4/5 | Real-world U.S. execution of terminal DBFOM P3s ($9.5B JFK New Terminal One, LGA Terminal B), ConRAC/APM P3s (LAX), and Progressive Design-Build programs. |
| [McKinsey Smart Airports](https://www.mckinsey.com/industries/travel/our-insights/smart-airports-clearing-the-runway-for-digital-takeoff) | 3/5 | Infratech maturity scoring framework (0–4 scale) — **calibration use only**; its 6–8% EBITDA claim remains quarantined as **Unofficial**. |

---

## 2. U.S. Realtime Operational Sources — Tactical Decision Inputs

*Live U.S. NAS and terminal feeds used for operational monitoring, construction closure window scheduling, queue rebalancing, and feed health alerts.*

| Source | Coverage | Realtime Decision & Consultation Use |
|---|---|---|
| [FAA SWIM (SFDPS, TFMS, STDDS)](https://www.faa.gov/air_traffic/technology/swim) | U.S. NAS | Live flight plans, terminal surface movement (ASDE-X/ASSC), traffic flow management, and low-traffic cutover window verification. |
| [FAA NOTAM Search / SWIM NOTAM Feed](https://notams.aim.faa.gov/notamSearch/) | U.S. NAS | Active runway/taxiway/apron closures, NAVAID outages, and construction window monitoring (AC 150/5370-2G compliance). |
| [AviationWeather.gov Data API](https://aviationweather.gov/data/api/) ([CheckWX](https://www.checkwxapi.com/), [AVWX](https://info.avwx.rest/)) | U.S. / NWS | Official NOAA/NWS METAR, TAF, SIGMET, and wind/visibility conditions for construction hold and cutover risk scoring. |
| [FlightAware AeroAPI / Firehose](https://www.flightaware.com/commercial/aeroapi/) & [OpenSky Network API](https://opensky-network.org/data/api) | U.S. NAS | Live ADS-B aircraft state vectors, predictive arrival/departure ETAs, and airport-level movement aggregation. |
| [CBP Airport Wait Times API (`awt.cbp.gov`)](https://awt.cbp.gov/) & U.S. Operator Live Feeds | U.S. Gateways | Hourly CBP Federal Inspection Services (FIS) wait times, booth counts, and airport-specific TSA checkpoint / parking telemetry. |

> **Epistemic Decision Rule**: Realtime feeds drive **tactical alerts, queue optimization, and overnight construction/cutover window scheduling only** — never capital underwriting, grant eligibility, or ORAT gate sign-off, which require primary batch/audited evidence.

---

## 3. U.S. Workflow, Financial & Engineering Calculation Sources — Investment Accuracy

*The primary quantitative datasets used to execute Workflows W1–W7, populate Standard Reports R1–R10, and verify every financial and operational formula.*

| Source | Workflow Role | Quantitative Inputs Supplied |
|---|---|---|
| **[FAA CATS (Form 5100-127 & 5100-126)](https://cats.airports.faa.gov/)** | W1, W2, W7 (R1–R5, R7, R9) | Operating revenues (aeronautical vs. non-aeronautical), O&M expenses, debt service, **CPE**, **DSCR**, **Unrestricted Days Cash on Hand (DCOH)**, and annual PFC collections. |
| **[FAA NPIAS](https://www.faa.gov/airports/planning_capacity/npias)** | W1 (R1, R2, R4) | 5-year eligible capital development need (`TotalNeed`), statutory hub classification (Large, Medium, Small, Nonhub, Reliever, GA), and federal share `s`. |
| **[MSRB EMMA Official Statements & Feasibility Reports](https://emma.msrb.org/)** | W1, W2 (R1, R3, R5, R9) | Bond amortization tables, Senior/Subordinate DSCR covenants ($\ge 1.25\times$ / $1.10\times$), AULA rate-making terms (Residual/Compensatory), and P3 financing stacks. |
| **[FAA AIP Grant Lists (2025/2026)](https://www.faa.gov/airports/aip/2026_aip_grants) & [USAspending.gov](https://www.usaspending.gov/)** | W1 (R1, R2, R4, R5) | Award-level federal grant obligations, outlay ratios (`OR = outlays / obligated`), and IIJA ATP/AIG drawdown status. |
| **[FAA Terminal Area Forecast (TAF)](https://taf.faa.gov/)** | W1, W2 (R1, R2, R3, R9) | 20-year official FAA enplanement and aircraft operations projections; denominator for ASV demand triggers (`Operations / ASV`). |
| **[BTS TranStats (T-100, DB1B)](https://www.transtats.bts.gov/data_elements.aspx)** | W1, W3, W7 (R1, R3, R7, R9) | Certified U.S. enplanements (PFC capacity), carrier market-share Herfindahl-Hirschman Index (**HHI**), O&D % vs. connecting hub traffic, and arrival rate $\lambda$. |
| **[FAA ASPM & OPSNET](https://aspm.faa.gov/)** | W2, W4, W7 (R3, R5, R7, R10) | Cause-specific NAS delay minutes (equipment, weather, volume, runway construction), Airport Arrival/Departure Rates (**AAR/ADR**), and taxi-in/out times. |
| **[FAA ADIP / Form 5010 Master Record](https://adip.faa.gov/)** | W1, W2, W4 (R1, R2, R6) | Runway/taxiway geometry, Pavement Condition Index (**PCI**), RSA status, and facility condition baselines. |
| **[U.S. EPA eGRID](https://www.epa.gov/egrid) & [FAA AEDT](https://aedt.faa.gov/)** | W5 (R8, R9) | Sub-regional U.S. electricity grid emission factors (`eGRID` $\text{tCO}_2\text{e}/\text{MWh}$), aircraft/APU fuel burn, and VALE/ZEV gate electrification emissions reductions. |
| **[ACI-NA Benchmarking](https://airportscouncil.org/) & [ACI ASQ](https://aci.aero/programs-and-services/asq/) / [Cirium OTP](https://www.cirium.com/resources/on-time-performance/)** | W3, W6, W7 (R6, R7) | U.S. hub cohort medians, percentiles, z-scores, live passenger satisfaction surveys, and on-time performance rankings. |
| **[OAG Biometrics Data](https://www.oag.com/blog/biometrics-airport-travelspheres-future-digital) & [IATA ADRM / Embodied Carbon](https://www.iata.org/en/programs/ops-infra/airport-infrastructure/airport-development/)** | W2, W3, W5 (R3, R6, R8) | Verified stage-time budgets ($\approx 70\text{ s}$ biometric bag drop), level-of-service space standards, and embodied carbon ($\text{kgCO}_2\text{e}/\text{m}^2$) benchmarks. |

---

## 4. Verification & Provenance Guarantee

Every quantitative metric produced by the ECS workflows or rendered in Reports R1–R10 carries a structured `Provenance` record:
1. **Primary Citation & Credibility (`1–5`)**: Traces to the exact U.S. statutory, financial, or operational source above.
2. **Confidence Propagation**: `confidence(output) = min(credibility of contributing inputs)`.
3. **Unofficial Quarantine**: Any input with `credibility ≤ 2` or `FeatureStatus == "unofficial"` is flagged in a warning callout and excluded from underwriting conclusions, DSCR/NPV calculations, and ORAT gate approvals.
