import { createSignal, For } from 'solid-js'
import type { WorkflowCode } from '../types/jobs'

interface SkillItem {
  id: string
  slug: string
  name: string
  workflowCode: WorkflowCode
  ecsSystem: string
  reports: string
  tools: string[]
  description: string
  sampleAirport: string
  sampleTitle: string
  samplePurpose: string
}

const US_SKILLS_LIST: SkillItem[] = [
  {
    id: 'S1',
    slug: 'us-funding-capital-stack',
    name: 'U.S. Airport Funding, Capital Stack & Airline Rate-Making',
    workflowCode: 'W1',
    ecsSystem: 'FundingSystem',
    reports: 'R1, R2, R4, R9',
    tools: [
      'queryUsAirportBaselineAndSources',
      'computeCapitalStackAndGap',
      'computeAipGrantAndPfcCapacity',
      'computeCreditAndAirlineRates',
      'evaluateGrantOutlayLifecycle',
    ],
    description:
      '49 U.S.C. § 47109 AIP shares (75%–95%), 14 CFR Part 158 PFC bonding ($4.50 cap less $0.11 handling fee), FAA CATS Form 5100-127 CPE/DCOH, and MSRB EMMA Senior/All-In DSCR.',
    sampleAirport: 'ORD',
    sampleTitle: 'KORD 5-Year Capital Stack, PFC & GARB DSCR Audit',
    samplePurpose:
      'Execute Skill S1 (us-funding-capital-stack) using computeCapitalStackAndGap and computeCreditAndAirlineRates to verify KORD 5-year NPIAS gap, 75% AIP share, net $4.39 PFC capacity, and Senior DSCR ≥ 1.25x for Report R1.',
  },
  {
    id: 'S2',
    slug: 'capital-delivery-nepa-orat',
    name: 'Capital Project Delivery, NEPA/CSPP & ACRP 164 ORAT',
    workflowCode: 'W2',
    ecsSystem: 'ProjectLifecycleSystem',
    reports: 'R2, R3, R5, R6, R9',
    tools: [
      'queryUsAirportBaselineAndSources',
      'evaluateDemandTriggerAndBca',
      'computeProjectEvmAndCsppWindow',
      'evaluateAcrypOratReadinessGate',
    ],
    description:
      'FAA TAF/ASV capacity triggers, OMB Circular A-94 Benefit-Cost Analysis (NPV/BCR), P3 LLCR (≥1.30x), EVM (SPI/CPI/CSI/EAC), AC 150/5370-2G CSPP closures, and ACRP 164 ORAT gate (R ≥ 0.95).',
    sampleAirport: 'JFK',
    sampleTitle: 'JFK New Terminal One P3 BCA & ACRP 164 ORAT Audit',
    samplePurpose:
      'Execute Skill S2 (capital-delivery-nepa-orat) using evaluateDemandTriggerAndBca and evaluateAcrypOratReadinessGate for KJFK New Terminal One ($9.5B P3) to verify LLCR ≥ 1.30x, TSA PGDS/Cyber compliance, and ORAT R ≥ 0.95 for Report R6.',
  },
  {
    id: 'S3',
    slug: 'passenger-flow-tsa-cbp',
    name: 'Passenger Journey, TSA PGDS Checkpoint & CBP FIS Flow',
    workflowCode: 'W3',
    ecsSystem: 'PassengerFlowSystem',
    reports: 'R6, R7, R10',
    tools: [
      'queryUsAirportBaselineAndSources',
      'computeErlangCQueueAndLaneTarget',
    ],
    description:
      'Multi-server Erlang-C (M/M/c) queueing model computing utilization ρ, probability of delay P_wait, 95th-percentile wait W_q95, and optimal active lanes c* across Biometric Bag Drop, TSA Touchless ID, and CBP Simplified Arrival.',
    sampleAirport: 'ATL',
    sampleTitle: 'KATL TSA PreCheck Touchless ID & Bag-Drop Erlang-C Run',
    samplePurpose:
      'Execute Skill S3 (passenger-flow-tsa-cbp) using computeErlangCQueueAndLaneTarget at KATL to verify 95th-percentile wait W_q95 ≤ 70s across 36 biometric bag-drop kiosks and solve optimal active TSA lanes c* for Report R7.',
  },
  {
    id: 'S4',
    slug: 'nas-bnatcs-airfield-cutover',
    name: 'NAS / BNATCS & Airfield Modernization Deployment',
    workflowCode: 'W4',
    ecsSystem: 'ATCDeploymentSystem',
    reports: 'R3, R5, R10',
    tools: [
      'queryUsAirportBaselineAndSources',
      'computeBnatcsCutoverRiskAndDelaySavings',
      'computeProjectEvmAndCsppWindow',
    ],
    description:
      'Tracks FAA BNATCS national & airport lots (44 surface radars, 200 SAI, 89 TFDM, digital voice switches), overnight cutover window risk, and monetized ASPM delay savings via USDOT VTTS + ADOM.',
    sampleAirport: 'DEN',
    sampleTitle: 'KDEN BNATCS Surface Radar Cutover & ASPM VTTS Savings',
    samplePurpose:
      'Execute Skill S4 (nas-bnatcs-airfield-cutover) using computeBnatcsCutoverRiskAndDelaySavings at KDEN to quantify ASPM equipment delay reduction and annual USDOT VTTS + ADOM dollar savings for Report R10.',
  },
  {
    id: 'S5',
    slug: 'sustainability-vale-egrid',
    name: 'U.S. Airport Sustainability, VALE/ZEV & EPA eGRID Transition',
    workflowCode: 'W5',
    ecsSystem: 'SustainabilitySystem',
    reports: 'R8, R9',
    tools: [
      'queryUsAirportBaselineAndSources',
      'computeEgridEmissionsAndGateElectrification',
    ],
    description:
      'Scope 1+2 inventory using official U.S. EPA eGRID subregional emission factors, FAA VALE/AEDT 400Hz GPU + PCA gate electrification APU displacement, geothermal HVAC, and solar microgrid EaaS P3s.',
    sampleAirport: 'SDF',
    sampleTitle: 'KSDF Geothermal HVAC & EPA eGRID Gate Electrification Audit',
    samplePurpose:
      'Execute Skill S5 (sustainability-vale-egrid) using computeEgridEmissionsAndGateElectrification for KSDF (EPA eGRID subregion SRMW) to audit geothermal HVAC (>80% cut) and FAA VALE gate electrification for Report R8.',
  },
  {
    id: 'S6',
    slug: 'infratech-maturity-roi',
    name: 'Smart-Tech Adoption & Infratech ROI Governance',
    workflowCode: 'W6',
    ecsSystem: 'MaturitySystem',
    reports: 'R3, R7',
    tools: [
      'queryUsAirportBaselineAndSources',
      'evaluateInfratechAndCohortBenchmark',
    ],
    description:
      'Scores 5-dimension infratech maturity (0–4) using strictly primary operational telemetry, enforces DataReadinessHold gates, quarantines unofficial vendor/consultancy claims, and computes risk-adjusted NPV.',
    sampleAirport: 'DFW',
    sampleTitle: 'KDFW Digital Twin & Predictive BHS Maturity Gate Review',
    samplePurpose:
      'Execute Skill S6 (infratech-maturity-roi) using evaluateInfratechAndCohortBenchmark at KDFW to verify primary-evidence BHS predictive maintenance ROI and quarantine unofficial vendor claims for Report R3.',
  },
  {
    id: 'S7',
    slug: 'us-data-hub-cohort-benchmark',
    name: 'U.S. Realtime Data Hub & FAA Hub Cohort Benchmarking',
    workflowCode: 'W7',
    ecsSystem: 'IngestionSystem',
    reports: 'R7, R9, R10',
    tools: [
      'queryUsAirportBaselineAndSources',
      'evaluateInfratechAndCohortBenchmark',
    ],
    description:
      'Monitors U.S. NAS realtime feeds (FAA SWIM, NOTAM, METAR, AeroAPI, OpenSky, CBP Wait Times) and computes FAA Statutory Hub Cohort standard (z) and robust (z_IQR) benchmarks from Form 5100-127 & ASPM.',
    sampleAirport: 'LAX',
    sampleTitle: 'KLAX U.S. Large-Hub Cohort Z-Score & SWIM Feed Audit',
    samplePurpose:
      'Execute Skill S7 (us-data-hub-cohort-benchmark) using evaluateInfratechAndCohortBenchmark for KLAX to compute U.S. Large-Hub CPE/DSCR robust z-scores (z_IQR) and verify FAA SWIM feed SLA for Report R7.',
  },
]

interface SkillsCatalogModalProps {
  onClose: () => void
  onDispatchSkillJob: (payload: {
    code: WorkflowCode
    airportIata: string
    title: string
    purpose: string
  }) => void
}

export function SkillsCatalogModal(props: SkillsCatalogModalProps) {
  const [selectedSkillId, setSelectedSkillId] = createSignal('S1')

  const activeSkill = () =>
    US_SKILLS_LIST.find((s) => s.id === selectedSkillId()) ?? US_SKILLS_LIST[0]

  return (
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skills-modal-title"
    >
      <div class="modal-card" style={{ 'max-width': '680px' }}>
        <h2 id="skills-modal-title" class="modal-title">
          U.S. Airport Investment Intelligence — AI Skills & AI Tools
        </h2>
        <p class="modal-subtitle">
          Modular domain AI Skills (S1–S7) and deterministic Vercel AI SDK Tools (T1–T12) derived from the U.S. ECS Architecture and Standard Report Templates (R1–R10).
        </p>

        <div class="segmented-filters" role="tablist" aria-label="Select AI Skill">
          <For each={US_SKILLS_LIST}>
            {(skill) => (
              <button
                type="button"
                role="tab"
                aria-selected={selectedSkillId() === skill.id}
                class={`filter-tab ${selectedSkillId() === skill.id ? 'is-active' : ''}`}
                onClick={() => setSelectedSkillId(skill.id)}
              >
                {skill.id} ({skill.workflowCode})
              </button>
            )}
          </For>
        </div>

        <div class="job-details-collapse" style={{ 'margin-top': '8px' }}>
          <div class="job-details-grid tabular-nums">
            <span>
              <strong>
                {activeSkill().id} · {activeSkill().slug}
              </strong>
            </span>
            <span>·</span>
            <span>Workflow: {activeSkill().workflowCode}</span>
            <span>·</span>
            <span>ECS: {activeSkill().ecsSystem}</span>
            <span>·</span>
            <span>Reports: {activeSkill().reports}</span>
          </div>

          <div class="job-purpose-box">
            <span class="job-section-label">Skill Scope & Statutory Guardrails:</span>{' '}
            <span>{activeSkill().description}</span>
          </div>

          <div class="job-purpose-box">
            <span class="job-section-label">
              Bound Executable AI Tools ({activeSkill().tools.length}):
            </span>
            <ul class="job-subchat-list" style={{ 'margin-top': '4px' }}>
              <For each={activeSkill().tools}>
                {(toolName) => (
                  <li class="job-subchat-item role-assistant tabular-nums">
                    <code>{toolName}()</code>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-secondary"
            onClick={() => props.onClose()}
          >
            Close
          </button>
          <button
            type="button"
            class="btn-primary"
            onClick={() => {
              const s = activeSkill()
              props.onDispatchSkillJob({
                code: s.workflowCode,
                airportIata: s.sampleAirport,
                title: s.sampleTitle,
                purpose: s.samplePurpose,
              })
            }}
          >
            Dispatch {activeSkill().id} Job ({activeSkill().sampleAirport})
          </button>
        </div>
      </div>
    </div>
  )
}
