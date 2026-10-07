import type { WorkflowCode } from '../../client/src/types/jobs.ts'
import {
  AI_TOOLS_METADATA,
  createDomainAiTools,
  type AiToolMetadata,
} from './tools-registry.ts'

export interface AiSkillDefinition {
  id: string
  slug: string
  name: string
  workflowCode: WorkflowCode
  ecsSystem: string
  reportTemplates: string[]
  boundToolNames: string[]
  description: string
  systemInstruction: string
}

export const AI_SKILLS_CATALOG: AiSkillDefinition[] = [
  {
    id: 'S1',
    slug: 'us-funding-capital-stack',
    name: 'U.S. Airport Funding, Capital Stack & Airline Rate-Making',
    workflowCode: 'W1',
    ecsSystem: 'FundingSystem',
    reportTemplates: ['R1', 'R2', 'R4', 'R9'],
    boundToolNames: [
      'queryUsAirportBaselineAndSources',
      'computeCapitalStackAndGap',
      'computeAipGrantAndPfcCapacity',
      'computeCreditAndAirlineRates',
      'evaluateGrantOutlayLifecycle',
    ],
    description:
      'Quantifies 5-year NPIAS/CIP capital gaps, 49 U.S.C. § 47109 AIP grant shares (75%–95%), 14 CFR Part 158 PFC bonding ($4.50 cap less $0.11 handling fee), Senior/All-In DSCR, Residual/Compensatory CPE, and DCOH.',
    systemInstruction: [
      'You are the U.S. Airport Funding & Capital Stack Specialist Agent (Skill S1 · Workflow W1 · FundingSystem).',
      'Enforce 49 U.S.C. § 47109 federal AIP shares (75% Large/Medium Hubs, 80% Part 150 Noise, 90%–95% Small/Reliever/GA).',
      'Enforce 14 CFR Part 158 PFC rules ($4.50/pax cap less $0.11 airline handling compensation = $4.39 net) and FAA Grant Assurance #25 (Revenue Diversion Prohibition unless approved under 49 U.S.C. § 47134 AIPP).',
      'Use FAA CATS Form 5100-127 and MSRB EMMA covenants (Senior DSCR ≥ 1.25x, DCOH ≥ 365 days) to produce Reports R1, R2, R4, and R9.',
    ].join(' '),
  },
  {
    id: 'S2',
    slug: 'capital-delivery-nepa-orat',
    name: 'Capital Project Delivery, NEPA/CSPP & ACRP 164 ORAT',
    workflowCode: 'W2',
    ecsSystem: 'ProjectLifecycleSystem',
    reportTemplates: ['R2', 'R3', 'R5', 'R6', 'R9'],
    boundToolNames: [
      'queryUsAirportBaselineAndSources',
      'evaluateDemandTriggerAndBca',
      'computeProjectEvmAndCsppWindow',
      'evaluateAcrypOratReadinessGate',
    ],
    description:
      'Governs FAA TAF/ASV capacity triggers, OMB Circular A-94 Benefit-Cost Analysis (NPV/BCR), DB/PDB/CMAR/DBFOM P3 delivery (LLCR ≥ 1.30x), Earned Value Management (SPI/CPI/CSI/EAC), AC 150/5370-2G CSPP closures, and ACRP 164 ORAT certification.',
    systemInstruction: [
      'You are the U.S. Capital Delivery, NEPA/CSPP & ORAT Agent (Skill S2 · Workflow W2 · ProjectLifecycleSystem).',
      'Verify FAA TAF/ASV capacity triggers (≥0.60 planning, ≥0.80 construction), OMB Circular A-94 BCA (BCR ≥ 1.0), and NEPA Order 1050.1F clearance.',
      'Enforce AC 150/5370-2G Construction Safety & Phasing Plan (CSPP) overnight closure efficiency (η) and ACRP Report 164 ORAT readiness (R ≥ 0.95, 0 critical defects, TSA PGDS, CBP ATDS, TSA Cyber Directive, ADA/ACAA).',
    ].join(' '),
  },
  {
    id: 'S3',
    slug: 'passenger-flow-tsa-cbp',
    name: 'Passenger Journey, TSA PGDS Checkpoint & CBP FIS Flow',
    workflowCode: 'W3',
    ecsSystem: 'PassengerFlowSystem',
    reportTemplates: ['R6', 'R7', 'R10'],
    boundToolNames: [
      'queryUsAirportBaselineAndSources',
      'computeErlangCQueueAndLaneTarget',
    ],
    description:
      'Models Curbside → Biometric Self-Bag-Drop → TSA PreCheck Touchless ID / CT Checkpoints → Boarding → CBP Simplified Arrival FIS using multi-server Erlang-C (M/M/c) queueing math and 95th-percentile wait budgets (W_q95).',
    systemInstruction: [
      'You are the U.S. Passenger Flow, TSA Checkpoint & CBP FIS Queueing Agent (Skill S3 · Workflow W3 · PassengerFlowSystem).',
      'Execute multi-server Erlang-C (M/M/c) queueing calculations to evaluate server utilization ρ = λ/(cμ), mean wait W_q, and 95th-percentile wait W_q95 against U.S. stage budgets (Biometric Bag Drop ≤ 70s, TSA PreCheck ≤ 5m, TSA Standard ≤ 10m, CBP FIS ≤ 15m).',
      'Solve for optimal active lanes/kiosks c* and verify ADA Title II / ACAA 14 CFR Part 382 accessibility and biometric opt-out compliance.',
    ].join(' '),
  },
  {
    id: 'S4',
    slug: 'nas-bnatcs-airfield-cutover',
    name: 'NAS / BNATCS & Airfield Modernization Deployment',
    workflowCode: 'W4',
    ecsSystem: 'ATCDeploymentSystem',
    reportTemplates: ['R3', 'R5', 'R10'],
    boundToolNames: [
      'queryUsAirportBaselineAndSources',
      'computeBnatcsCutoverRiskAndDelaySavings',
      'computeProjectEvmAndCsppWindow',
    ],
    description:
      'Tracks FAA BNATCS national & airport equipment lots (44 surface radars, 200 SAI, 89 TFDM, digital voice switches, fiber telecom), scores low-traffic cutover windows, and monetizes ASPM delay reductions via USDOT VTTS + ADOM.',
    systemInstruction: [
      'You are the U.S. NAS / BNATCS & Airfield Cutover Agent (Skill S4 · Workflow W4 · ATCDeploymentSystem).',
      'Track site-level deployment of BNATCS lots ($12.5B appropriated July 2025, Dec 2028 Phase-1 target under Peraton prime-integrator contract) and distinguish GAO-26-107992 confirmed figures from secondary reported shortfall figures (~$3.5B).',
      'Score overnight cutover windows against FAA SWIM traffic exposure and monetize ASPM equipment delay savings using USDOT VTTS ($57.20/hr) and aircraft direct operating cost per minute (ADOM).',
    ].join(' '),
  },
  {
    id: 'S5',
    slug: 'sustainability-vale-egrid',
    name: 'U.S. Airport Sustainability, VALE/ZEV & EPA eGRID Transition',
    workflowCode: 'W5',
    ecsSystem: 'SustainabilitySystem',
    reportTemplates: ['R8', 'R9'],
    boundToolNames: [
      'queryUsAirportBaselineAndSources',
      'computeEgridEmissionsAndGateElectrification',
    ],
    description:
      'Computes Scope 1+2 emissions using U.S. EPA eGRID subregional grid factors, quantifies FAA VALE/AEDT 400Hz GPU + PCA gate electrification APU savings, and evaluates geothermal HVAC & solar-storage microgrid EaaS P3s.',
    systemInstruction: [
      'You are the U.S. Airport Sustainability, VALE/ZEV & Energy Transition Agent (Skill S5 · Workflow W5 · SustainabilitySystem).',
      'Use official U.S. EPA eGRID subregional emission factors and FAA AEDT / VALE methodology to quantify Scope 1+2 inventories, gate electrification APU displacement ($327M FAA grant program), geothermal HVAC retrofits, and solar+battery microgrid EaaS P3s.',
    ].join(' '),
  },
  {
    id: 'S6',
    slug: 'infratech-maturity-roi',
    name: 'Smart-Tech Adoption & Infratech ROI Governance',
    workflowCode: 'W6',
    ecsSystem: 'MaturitySystem',
    reportTemplates: ['R3', 'R7'],
    boundToolNames: [
      'queryUsAirportBaselineAndSources',
      'evaluateInfratechAndCohortBenchmark',
    ],
    description:
      'Scores airport infratech maturity (0–4) using strictly primary operational evidence, enforces DataReadinessHold gates, quarantines unofficial vendor/consultancy claims, and computes risk-adjusted Infratech NPV.',
    systemInstruction: [
      'You are the U.S. Airport Infratech Maturity & ROI Governance Agent (Skill S6 · Workflow W6 · MaturitySystem).',
      'Score maturity (0–4) across AI flow management, BHS/HVAC predictive maintenance, digital twins, biometrics, and data platforms using primary telemetry only.',
      'Quarantine McKinsey 6–8% EBITDA uplift and vendor blog adoption claims as Unofficial (Credibility ≤ 3).',
    ].join(' '),
  },
  {
    id: 'S7',
    slug: 'us-data-hub-cohort-benchmark',
    name: 'U.S. Realtime Data Hub & FAA Hub Cohort Benchmarking',
    workflowCode: 'W7',
    ecsSystem: 'IngestionSystem',
    reportTemplates: ['R7', 'R9', 'R10'],
    boundToolNames: [
      'queryUsAirportBaselineAndSources',
      'evaluateInfratechAndCohortBenchmark',
    ],
    description:
      'Monitors U.S. NAS realtime feeds (FAA SWIM, NOTAM, NOAA METAR, AeroAPI, OpenSky, CBP Wait Times) and reconciles batch financial/ops datasets (FAA CATS 5100-127, MSRB EMMA, ASPM, TAF, BTS T-100) across FAA Hub Cohorts.',
    systemInstruction: [
      'You are the U.S. Realtime Data Hub & FAA Hub Cohort Benchmarking Agent (Skill S7 · Workflow W7 · IngestionSystem / BenchmarkSystem).',
      'Verify feed staleness (S ≤ 2×SLA) and completeness (C ≥ 0.95), resolve entities by FAA LID / ICAO / IATA, and compute standard (z) and robust (z_IQR) cohort benchmarks within FAA Statutory Hub Classifications.',
    ].join(' '),
  },
  {
    id: 'S8',
    slug: 'investment-report-synthesis',
    name: 'U.S. Standard Investment & Assessment Report Synthesizer (R1–R10)',
    workflowCode: 'W1',
    ecsSystem: 'ViewProjectionSystem',
    reportTemplates: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'],
    boundToolNames: AI_TOOLS_METADATA.map((t) => t.name),
    description:
      'Cross-cutting synthesis skill that compiles multi-workflow outputs into Standard U.S. Assessment Reports (R1–R10) with sealed Provenance blocks and confidence propagation.',
    systemInstruction: [
      'You are the U.S. Airport Investment Intelligence Report Synthesizer (Skill S8 · Reports R1–R10).',
      'Synthesize verified outputs from Skills S1–S7 into institutional-grade U.S. airport consultation and due diligence reports with mandatory Provenance citations (Credibility 1–5) and reproducible formulas.',
    ].join(' '),
  },
]

export function getSkillForWorkflow(code: WorkflowCode): AiSkillDefinition {
  return (
    AI_SKILLS_CATALOG.find((s) => s.workflowCode === code && s.id !== 'S8') ??
    AI_SKILLS_CATALOG[0]
  )
}

export function getToolsForWorkflow(code: WorkflowCode) {
  const skill = getSkillForWorkflow(code)
  const allTools = createDomainAiTools()
  const filtered: Record<string, unknown> = {}
  for (const name of skill.boundToolNames) {
    if (name in allTools) {
      filtered[name] = allTools[name as keyof typeof allTools]
    }
  }
  return filtered as ReturnType<typeof createDomainAiTools>
}

export function getCatalogSummary(): {
  skills: AiSkillDefinition[]
  tools: AiToolMetadata[]
} {
  return {
    skills: AI_SKILLS_CATALOG,
    tools: AI_TOOLS_METADATA,
  }
}
