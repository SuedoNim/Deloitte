1. Training Sources — What the Role Requires


*Teach the agent the domain: funding mechanics, program landscape, feature categories, and epistemic discipline (official vs. unofficial vs. gap).*


| Source                                                                                                                                                                                                                                                                         | What it trains                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [FAA AIP overview](https://www.faa.gov/airports/aip/overview)                                                                                                                                                                                                                  | Grant shares (75–95%), eligibility rules, eligible vs. ineligible projects                        |
| [FAA IIJA Airport Terminal Program](https://www.faa.gov/iija/airport-terminals) + [FY26 NOFO](https://www.faa.gov/newsroom/FY26-ATP-NOFO-8DEC2025)                                                                                                                             | Terminal funding mechanics, program lifecycle, application criteria                                |
| [ACI-NA Infrastructure Funding](https://airportscouncil.org/advocacy/airport-infrastructure-funding/)                                                                                                                                                                          | The three funding mechanisms, PFC cap issue, terminals ≈ 60% of need, self-sufficiency rule       |
| [IATA Airport Development / ADRM](https://www.iata.org/en/programs/ops-infra/airport-infrastructure/airport-development/)                                                                                                                                                      | Planning standards: master planning, demand triggers, terminal design, ORAT, embodied carbon       |
| [FAA BNATCS Fact Sheet](https://www.faa.gov/newsroom/brand-new-air-traffic-control-system-bnatcs-fact-sheet)                                                                                                                                                                   | The ATC modernization program scope, contracting model, deadlines                                  |
| [ACI World ASQ](https://aci.aero/programs-and-services/asq/)                                                                                                                                                                                                                   | Passenger-experience measurement discipline (live surveys, not claims)                             |
| [McKinsey Smart Airports](https://www.mckinsey.com/industries/travel/our-insights/smart-airports-clearing-the-runway-for-digital-takeoff)                                                                                                                                      | Infratech maturity benchmark framing —**calibration use only**; its EBITDA claim stays unofficial |
| Case material:[PANYNJ redevelopment](https://www.portauthoritybuilds.com/redevelopment/us/en/home.html), [India privatization (IBA)](https://www.ibanet.org/airport-privitisation-india-summary), [DWC $35B](https://www.aviationbusinessme.com/analysis/dwc-dubais-35bn-plan) | Delivery models in practice: P3, PPP, design-build, megaprogram structuring                        |

## 2. Realtime Sources — Decision Inputs

*Operational feeds for live decisions (queue rebalancing, closure windows, feed health, current airport state).*


| Source                                                                                                                                     | Realtime decision use                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [FAA SWIM / SFDPS](https://www.faa.gov/air_traffic/technology/swim)                                                                        | US flight plans, traffic, surveillance — cut-over windows, flow management   |
| [FAA NOTAM search](https://notams.aim.faa.gov/notamSearch/)                                                                                | Live closures/construction — construction-hold and closure-window scheduling |
| [AviationWeather.gov API](https://aviationweather.gov/data/api/) ([CheckWX](https://www.checkwxapi.com/), [AVWX](https://info.avwx.rest/)) | METAR/TAF — operational risk windows                                         |
| [OpenSky](https://opensky-network.org/data/api), [ADS-B Exchange](https://www.adsbexchange.com/)                                           | Global live positions — airport movement aggregation                         |
| [Flightradar24 API](https://fr24api.flightradar24.com/), [FlightAware AeroAPI](https://www.flightaware.com/commercial/aeroapi/)            | Flight status, predictive ETAs, airport delays                                |
| [AirLabs](https://airlabs.co/), [Aviationstack](https://aviationstack.com/), [Aviation Edge](https://aviation-edge.com/)                   | Schedules, routes, flight status — capacity and demand signals               |
| [EUROCONTROL NM](https://www.eurocontrol.int/network-manager)                                                                              | European ATFM delays, traffic flow                                            |
| Operator flight-status APIs (per airport)                                                                                                  | Terminal/gate assignment, local conditions                                    |

⚠️ Decision rule: realtime feeds drive **alerts and tactical decisions only** — never funding or gate decisions, which need primary/batch evidence.

## 3. Workflow & Calculation Sources — Accuracy of Decisions

*The procedural and computational grounding: how to run the seven workflows and verify the math.*


| Source                                                                                                                                                        | Workflow/calculation role                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **ECS Architecture canvas (§6–§8)** — [GAO-26-107992](https://www.gao.gov/products/gao-26-107992) as the oversight model                                  | The workflows themselves, formulas, state machines, and schemas live here; GAO is the template for independent verification discipline |
| [NPIAS](https://www.faa.gov/airports/planning_capacity/npias)                                                                                                 | Funding-gap numerator: 5-year cost estimates, roles, forecasts — W1's`TotalNeed`                                                      |
| [FAA AIP grant lists](https://www.faa.gov/airports/aip/2025_aip_grants) (2025/[2026](https://www.faa.gov/airports/aip/2026_aip_grants))                       | Award-level data to verify grant lifecycle and drawdown states                                                                         |
| [BTS TranStats](https://www.transtats.bts.gov/data_elements.aspx)                                                                                             | Enplanements, on-time data — PFC capacity, demand triggers, Little's Law λ                                                           |
| [ACI World Traffic Dataset](https://aci.aero/resources/data-center/)                                                                                          | Benchmark cohorts (2,817 airports) — percentile/z-score inputs                                                                        |
| [Cirium OTP](https://www.cirium.com/resources/on-time-performance/) / OAG                                                                                     | On-time performance — delay attribution baselines (W4)                                                                                |
| [ACI-NA benchmarking surveys](https://airportscouncil.org/advocacy/airport-infrastructure-funding/) (Infrastructure Needs, financial, environmental)          | Funding-gap denominator, DSCR cohort context, emissions benchmarking                                                                   |
| [FAA net-zero/electrification grants](https://www.faa.gov/newsroom/faa-invests-nearly-92-million-help-airports-reach-presidents-goal-net-zero-emissions-2050) | Sustainability portfolio parameters (W5)                                                                                               |
| [Peer-reviewed net-zero framework (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12307590)                                                                   | Emissions/energy methodology validation                                                                                                |
| [OAG biometrics data](https://www.oag.com/blog/biometrics-airport-travelspheres-future-digital)                                                               | Verified stage-time budgets (≈70 s bag drop) — W3 thresholds from primary data                                                       |

**One honest caveat on "100% accurate":** no source set guarantees that. The architecture's design goal is *verifiable* decisions — every number traceable to a credited source, every gate requiring primary evidence, unofficial claims quarantined, and confidence propagated as the minimum across contributing sources. Accuracy in this domain is a discipline, not a dataset.

Want me to add this triage as a section in the ECS architecture canvas so it lives with the agent's operating manual?
