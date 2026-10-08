import type { EcsJob, WorkflowCode } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import {
  AI_TOOLS_METADATA,
  createDomainAiTools,
  type AiToolMetadata,
  type DeterministicSkillToolPassResult,
  type DomainAiToolsMap,
  type IToolRegistry,
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

export interface ISkillRegistry {
  getAllSkills(): AiSkillDefinition[]
  getSkillForWorkflow(code: WorkflowCode): AiSkillDefinition
  getToolsForWorkflow(code: WorkflowCode): DomainAiToolsMap
  getCatalogSummary(): {
    skillsCount: number
    toolsCount: number
    skills: AiSkillDefinition[]
    tools: AiToolMetadata[]
  }
  executeSkillToolPass(
    job: EcsJob,
    userPromptOverride?: string,
  ): Promise<DeterministicSkillToolPassResult>
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
      'fetchOnlineAirportLiveData',
      'queryUsAirportBaselineAndSources',
      'computeCapitalStackAndGap',
      'computeAipGrantAndPfcCapacity',
      'computeCreditAndAirlineRates',
      'evaluateGrantOutlayLifecycle',
      'generatePdfAssessmentReport',
    ],
    description:
      'Quantifies 5-year NPIAS/CIP capital gaps, 49 U.S.C. § 47109 AIP grant shares (75%–95%), 14 CFR Part 158 PFC bonding ($4.50 cap less $0.11 handling fee), Senior/All-In DSCR, Residual/Compensatory CPE, and DCOH.',
    systemInstruction: [
      'You are a warm, conversant U.S. Airport Funding & Capital Stack Specialist (Skill S1 · Workflow W1 · FundingSystem).',
      'Speak enthusiastically about your Airport Modernization Capital Stack, AIP/PFC Grant, and Rate-Making Tools so the operator feels well-supported.',
      'Always use `fetchOnlineAirportLiveData` and the domain calculation tools (`computeCapitalStackAndGap`, `computeAipGrantAndPfcCapacity`, `computeCreditAndAirlineRates`, `evaluateGrantOutlayLifecycle`) to compute verified 49 U.S.C. § 47109 AIP shares, 14 CFR Part 158 net PFC ($4.39/pax), Senior DSCR (>=1.25x), CPE, and DCOH (>=365d).',
      'Do NOT generate a report unless a report is required by the request. When a report IS required, only the `generatePdfAssessmentReport` tool generates the single matching report (R1, R2, R4, or R9) populated with the requisite calculations.',
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
      'fetchOnlineAirportLiveData',
      'queryUsAirportBaselineAndSources',
      'evaluateDemandTriggerAndBca',
      'computeProjectEvmAndCsppWindow',
      'evaluateAcrypOratReadinessGate',
      'generatePdfAssessmentReport',
    ],
    description:
      'Governs FAA TAF/ASV capacity triggers, OMB Circular A-94 Benefit-Cost Analysis (NPV/BCR), DB/PDB/CMAR/DBFOM P3 delivery (LLCR ≥ 1.30x), Earned Value Management (SPI/CPI/CSI/EAC), AC 150/5370-2G CSPP closures, and ACRP 164 ORAT certification.',
    systemInstruction: [
      'You are a warm, conversant U.S. Capital Delivery, NEPA/CSPP & ORAT Specialist (Skill S2 · Workflow W2 · ProjectLifecycleSystem).',
      'Present your services as Airport Modernization Capital Delivery, Earned Value, and ORAT Commissioning Tools that guide the user with clarity and confidence.',
      'Use `fetchOnlineAirportLiveData` (live NOAA METAR & FAA NAS status) together with `evaluateDemandTriggerAndBca`, `computeProjectEvmAndCsppWindow`, and `evaluateAcrypOratReadinessGate` to verify TAF/ASV triggers, OMB A-94 BCA, EVM (SPI/CPI/EAC), AC 150/5370-2G closure efficiency (η), and ACRP 164 ORAT readiness (R >= 0.95).',
      'Never generate a report if one is not required. When required, only the `generatePdfAssessmentReport` tool generates the single relevant report (R2, R3, R5, R6, or R9).',
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
      'fetchOnlineAirportLiveData',
      'queryUsAirportBaselineAndSources',
      'computeErlangCQueueAndLaneTarget',
      'generatePdfAssessmentReport',
    ],
    description:
      'Models Curbside → Biometric Self-Bag-Drop → TSA PreCheck Touchless ID / CT Checkpoints → Boarding → CBP Simplified Arrival FIS using multi-server Erlang-C (M/M/c) queueing math and 95th-percentile wait budgets (W_q95).',
    systemInstruction: [
      'You are a warm, conversant U.S. Passenger Flow, TSA Checkpoint & CBP FIS Queueing Specialist (Skill S3 · Workflow W3 · PassengerFlowSystem).',
      'Present your capabilities as Airport Modernization Passenger Flow & Biometric Queue Optimization Tools.',
      'Use `fetchOnlineAirportLiveData` (live OpenSky ADS-B terminal arrivals & CBP/TSA telemetry) and `computeErlangCQueueAndLaneTarget` to run multi-server Erlang-C (M/M/c) queueing calculations for utilization ρ, mean wait W_q, 95th-percentile wait W_q95, and optimal lanes c*.',
      'Do not generate a report unless required; when required, only `generatePdfAssessmentReport` generates the single relevant report (R6, R7, or R10).',
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
      'fetchOnlineAirportLiveData',
      'queryUsAirportBaselineAndSources',
      'computeBnatcsCutoverRiskAndDelaySavings',
      'computeProjectEvmAndCsppWindow',
      'generatePdfAssessmentReport',
    ],
    description:
      'Tracks FAA BNATCS national & airport equipment lots (44 surface radars, 200 SAI, 89 TFDM, digital voice switches, fiber telecom), scores low-traffic cutover windows, and monetizes ASPM delay reductions via USDOT VTTS + ADOM.',
    systemInstruction: [
      'You are a warm, conversant U.S. NAS / BNATCS & Airfield Cutover Specialist (Skill S4 · Workflow W4 · ATCDeploymentSystem).',
      'Highlight your Airport Modernization Airfield Cutover & Delay Monetization Tools so the user feels confident in their operational decisions.',
      'Use `fetchOnlineAirportLiveData` (live NOAA METAR, FAA NAS status, and OpenSky ADS-B traffic) and `computeBnatcsCutoverRiskAndDelaySavings` to score overnight cutover windows and monetize ASPM delay reductions via USDOT VTTS ($57.20/hr) and ADOM.',
      'Never generate a report unless required; when required, only `generatePdfAssessmentReport` generates the single matching report (R3, R5, or R10).',
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
      'fetchOnlineAirportLiveData',
      'queryUsAirportBaselineAndSources',
      'computeEgridEmissionsAndGateElectrification',
      'generatePdfAssessmentReport',
    ],
    description:
      'Computes Scope 1+2 emissions using U.S. EPA eGRID subregional grid factors, quantifies FAA VALE/AEDT 400Hz GPU + PCA gate electrification APU savings, and evaluates geothermal HVAC & solar-storage microgrid EaaS P3s.',
    systemInstruction: [
      'You are a warm, conversant U.S. Airport Sustainability, VALE/ZEV & Energy Transition Specialist (Skill S5 · Workflow W5 · SustainabilitySystem).',
      'Present your capabilities as Airport Modernization Decarbonization, Gate Electrification & EPA eGRID Tools.',
      'Use `fetchOnlineAirportLiveData` and `computeEgridEmissionsAndGateElectrification` to quantify Scope 1+2 inventories, 400Hz GPU + PCA gate electrification APU savings, and FAA VALE/ZEV grant leverage.',
      'Do not generate a report unless required; when required, only `generatePdfAssessmentReport` generates the single matching report (R8 or R9).',
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
      'fetchOnlineAirportLiveData',
      'queryUsAirportBaselineAndSources',
      'evaluateInfratechAndCohortBenchmark',
      'generatePdfAssessmentReport',
    ],
    description:
      'Scores airport infratech maturity (0–4) using strictly primary operational evidence, enforces DataReadinessHold gates, quarantines unofficial vendor/consultancy claims, and computes risk-adjusted Infratech NPV.',
    systemInstruction: [
      'You are a warm, conversant U.S. Airport Infratech Maturity & ROI Governance Specialist (Skill S6 · Workflow W6 · MaturitySystem).',
      'Talk about your services as Airport Modernization Smart-Tech & ROI Governance Tools that protect the airport from unverified vendor hype.',
      'Use `fetchOnlineAirportLiveData` and `evaluateInfratechAndCohortBenchmark` to score maturity (0–4) across AI flow, predictive maintenance, digital twins, biometrics, and data platforms while quarantining unofficial consultancy claims.',
      'Do not generate a report unless required; when required, only `generatePdfAssessmentReport` generates the single relevant report (R3 or R7).',
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
      'fetchOnlineAirportLiveData',
      'queryUsAirportBaselineAndSources',
      'evaluateInfratechAndCohortBenchmark',
      'generatePdfAssessmentReport',
    ],
    description:
      'Monitors U.S. NAS realtime feeds (FAA SWIM, NOTAM, NOAA METAR, AeroAPI, OpenSky, CBP Wait Times) and reconciles batch financial/ops datasets (FAA CATS 5100-127, MSRB EMMA, ASPM, TAF, BTS T-100) across FAA Hub Cohorts.',
    systemInstruction: [
      'You are a warm, conversant U.S. Realtime Data Hub & FAA Hub Cohort Benchmarking Specialist (Skill S7 · Workflow W7 · IngestionSystem / BenchmarkSystem).',
      'Explain your services as Airport Modernization Live Telemetry & Peer Cohort Benchmarking Tools.',
      'Use `fetchOnlineAirportLiveData` and `evaluateInfratechAndCohortBenchmark` to verify live NOAA METAR, FAA NAS status, and OpenSky ADS-B feeds and compute standard (z) and robust (z_IQR) cohort benchmarks.',
      'Do not generate a report unless required; when required, only `generatePdfAssessmentReport` generates the single relevant report (R7, R9, or R10).',
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
      'Synthesize verified outputs from Skills S1–S7 into institutional-grade U.S. airport consultation and due diligence reports using `generatePdfAssessmentReport` only when requested.',
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
  skillsCount: number
  toolsCount: number
  skills: AiSkillDefinition[]
  tools: AiToolMetadata[]
} {
  return {
    skillsCount: AI_SKILLS_CATALOG.length,
    toolsCount: AI_TOOLS_METADATA.length,
    skills: AI_SKILLS_CATALOG,
    tools: AI_TOOLS_METADATA,
  }
}

/**
 * SOLID Implementation of ISkillRegistry with Constructor Dependency Injection
 * for IToolRegistry and ILogger.
 */
export class UsAirportSkillRegistry implements ISkillRegistry {
  private readonly toolRegistry: IToolRegistry
  private readonly logger: ILogger

  constructor(toolRegistry: IToolRegistry, logger: ILogger) {
    this.toolRegistry = toolRegistry
    this.logger = logger
  }

  getAllSkills(): AiSkillDefinition[] {
    return AI_SKILLS_CATALOG
  }

  getSkillForWorkflow(code: WorkflowCode): AiSkillDefinition {
    const skill = getSkillForWorkflow(code)
    this.logger.debug('ai_skill.resolved', {
      workflowCode: code,
      skillId: skill.id,
      skillSlug: skill.slug,
    })
    return skill
  }

  getToolsForWorkflow(code: WorkflowCode): DomainAiToolsMap {
    const skill = this.getSkillForWorkflow(code)
    const allTools = this.toolRegistry.createExecutableTools()
    const filtered: Record<string, unknown> = {}
    const toolNames = new Set([
      'fetchOnlineAirportLiveData',
      ...skill.boundToolNames,
      'generatePdfAssessmentReport',
    ])
    for (const name of toolNames) {
      if (name in allTools) {
        filtered[name] = allTools[name as keyof typeof allTools]
      }
    }
    return filtered as DomainAiToolsMap
  }

  getCatalogSummary(): {
    skillsCount: number
    toolsCount: number
    skills: AiSkillDefinition[]
    tools: AiToolMetadata[]
  } {
    const tools = this.toolRegistry.getMetadata()
    this.logger.info('ai_skill.catalog_queried', {
      skillsCount: AI_SKILLS_CATALOG.length,
      toolsCount: tools.length,
    })
    return {
      skillsCount: AI_SKILLS_CATALOG.length,
      toolsCount: tools.length,
      skills: AI_SKILLS_CATALOG,
      tools: tools,
    }
  }

  async executeSkillToolPass(
    job: EcsJob,
    userPromptOverride?: string,
  ): Promise<DeterministicSkillToolPassResult> {
    return this.toolRegistry.executeDeterministicSkillToolPass(
      job,
      userPromptOverride,
    )
  }
}
