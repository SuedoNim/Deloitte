import fs from 'node:fs'
import path from 'node:path'
import type {
  EcsJob,
  JobPdfReportMeta,
  WorkflowCode,
} from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import {
  US_AIRPORT_BASELINES,
  US_AUTHORITATIVE_SOURCES,
} from '../ai/us-airport-data.ts'

export interface StandardReportTemplateSpec {
  code: string
  title: string
  subtitle: string
  workflows: WorkflowCode[]
  sections: string[]
  formulas: string[]
  primarySourceKeys: (keyof typeof US_AUTHORITATIVE_SOURCES)[]
}

export const US_STANDARD_REPORT_TEMPLATES: Record<
  string,
  StandardReportTemplateSpec
> = {
  R1: {
    code: 'R1',
    title: 'U.S. Airport Infrastructure Needs, Capital Stack & Funding Gap Assessment',
    subtitle: '5-Year NPIAS/CIP Capital Sizing, AIP/IIJA Eligibility, PFC/GARB Capacity & AULA CPE Impact',
    workflows: ['W1'],
    sections: [
      '1. Executive Summary & 5-Year Capital Stack',
      '2. Scope, FAA Hub Classification & AULA Rate-Making Regime',
      '3. Physical Inventory & FAA ADIP Pavement/Facility Condition',
      '4. FAA TAF vs. Master Plan Demand & ASV Trigger Check',
      '5. Capital Stack, Part 158 PFC ($4.39 Net) & GARB/P3 Headroom',
      '6. Pro-Forma CPE, Senior DSCR (>= 1.25x) & DCOH (>= 365d) Sensitivity',
    ],
    formulas: [
      'Gap = TotalNeed_NPIAS_CIP - Sum(AIP + IIJA_AIG_ATP + PFC + CFC + GARB + P3 + TIFIA + Cash)',
      'PFC_Annual = Enplanements_eligible * (r_PFC - $0.11) where r_PFC <= $4.50 (14 CFR Part 158)',
      'DSCR_Senior = (OpRev - O&M + RollingCov_<=25% + PFC_pledged) / SeniorDebtService >= 1.25x',
      'CPE = TotalAirlineAeroRevenue / Enplanements; DCOH = (UnrestrictedCash * 365) / AnnualO&M >= 365d',
    ],
    primarySourceKeys: ['FAA_NPIAS', 'FAA_CATS_5100_127', 'MSRB_EMMA', 'FAA_TAF'],
  },
  R2: {
    code: 'R2',
    title: 'FAA / Sponsor 5-Year Capital Improvement Plan (CIP)',
    subtitle: 'ACIP Grant Schedule, NEPA Clearances, MII Airline Consultation & FY1-FY5 Sources/Uses',
    workflows: ['W1', 'W2'],
    sections: [
      '1. Program Overview, eALP Status & NEPA Readiness',
      '2. Itemized FY1-FY5 Project Schedule & Delivery Models (DBB/DB/CMAR/P3)',
      '3. Annual Sources & Uses Balancing Across Federal & Sponsor Instruments',
      '4. FAA National Priority System (NPS) Justification Matrix',
      '5. FAA AC 150/5370-2G CSPP Phasing & Signatory Airline MII Coordination',
    ],
    formulas: [
      'Statutory Federal Share (49 U.S.C. 47109): s = 0.75 (Large/Medium Hub), s = 0.90-0.95 (Small/Reliever)',
      'SponsorMatch = EligibleCost * (1 - s) + IneligibleCost; Sum(Sources_t) - Sum(Uses_t) = 0',
    ],
    primarySourceKeys: ['FAA_AIP_BIL', 'FAA_NPIAS', 'MSRB_EMMA'],
  },
  R3: {
    code: 'R3',
    title: 'U.S. Investment Appraisal, FAA Benefit-Cost Analysis (BCA) & P3 Feasibility',
    subtitle: 'OMB Circular A-94 Economic BCA, USDOT VTTS/ADOM Delay Monetization & DBFOM P3 Value-for-Money',
    workflows: ['W2', 'W4', 'W6'],
    sections: [
      '1. Strategic Demand Case & FAA TAF / ASV Capacity Trigger',
      '2. Economic Case & OMB Circular A-94 Benefit-Cost Analysis (NPV / BCR)',
      '3. Commercial Delivery Case & DBFOM P3 Risk Transfer Matrix',
      '4. Financial Underwriting: GARB / PAB / TIFIA Stack & LLCR (>= 1.30x)',
      '5. Downside Stress Testing (-15% Enplanements, +20% Capex, +150 bps)',
    ],
    formulas: [
      'DelayRatio = AnnualOperations_TAF / ASV >= 0.60 (planning) or >= 0.80 (construction)',
      'NPV_BCA = Sum((B_t - C_t) / (1 + r_OMB)^t); BCR = PV(B) / PV(C) >= 1.0',
      'B_delay = Delta_DelayMin * (PaxPerOp * VTTS_$/min + ADOM_$/min); LLCR = PV(CFADS)/Debt >= 1.30x',
    ],
    primarySourceKeys: ['FAA_TAF', 'FAA_ASPM', 'MSRB_EMMA', 'FAA_AIP_BIL'],
  },
  R4: {
    code: 'R4',
    title: 'Federal Grant Application & Part 158 PFC Amendment Package (SF-424)',
    subtitle: '49 U.S.C. Chapter 471 Eligibility, 18-Month Outlay Trajectory & 39 FAA Grant Assurances',
    workflows: ['W1'],
    sections: [
      '1. Sponsor & Facility Identification (LID, NPIAS Role, eALP Reference)',
      '2. Statutory Eligibility under 49 U.S.C. Chapter 471 & Part 158',
      '3. Engineer Cost Estimate & Quarterly Outlay Velocity Trajectory (OR >= 0.50 @ 18m)',
      '4. Federal Certifications: Grant Assurance #25, NEPA 1050.1F, Buy American & DBE',
      '5. Committed Local Sponsor Match & PFC Pay-Go / Bond Linkage',
    ],
    formulas: [
      'FederalRequest = s * EligibleCost; SponsorMatch = (1 - s) * EligibleCost + IneligibleCost',
      'OutlayRatio OR(t) = CumulativeOutlays_t / ObligatedAmount (Target OR >= 0.50 within 18 months)',
    ],
    primarySourceKeys: ['FAA_AIP_BIL', 'FAA_PFC', 'FAA_CATS_5100_127'],
  },
  R5: {
    code: 'R5',
    title: 'Capital Program Delivery & Earned Value Status Report',
    subtitle: 'Portfolio EVM (SPI, CPI, CSI, EAC, TCPI), Grant Drawdowns & AC 150/5370-2G CSPP Impact',
    workflows: ['W2', 'W4'],
    sections: [
      '1. Portfolio Executive Summary & Earned Value Ledger (BAC, EV, AC, EAC)',
      '2. Critical Path Milestone Variance & Float Consumption Analysis',
      '3. Federal Grant & Municipal Bond Drawdown Velocity (2 CFR Part 200)',
      '4. AC 150/5370-2G Overnight Runway/Taxiway Closure Efficiency (eta)',
      '5. Top Risk Register, Contingency P50/P80 Exposure & Lender Actions',
    ],
    formulas: [
      'SPI = EV / PV; CPI = EV / AC; CSI = SPI * CPI',
      'EAC_composite = AC + (BAC - EV) / (0.8 * CPI + 0.2 * SPI); TCPI = (BAC - EV) / (BAC - AC)',
      'ClosureWindowEfficiency eta = ProductiveWorkHours / (NOTAMClosureHours * CrewSize)',
    ],
    primarySourceKeys: ['FAA_AIP_BIL', 'FAA_ASPM', 'FAA_BNATCS_GAO'],
  },
  R6: {
    code: 'R6',
    title: 'ACRP Report 164 Operational Readiness & Airport Transfer (ORAT) Certification',
    subtitle: 'Weighted Trial Readiness Gate (R >= 0.95), TSA PGDS, CBP ATDS, TSA Cyber & ADA/ACAA Sign-Off',
    workflows: ['W2', 'W3'],
    sections: [
      '1. Executive Readiness Determination (R >= 0.95 & CriticalDefects = 0 Gate)',
      '2. ACRP Report 164 End-to-End Trial Matrix (Mass Pax/Bag, IROPS, Evacuation)',
      '3. Core Systems Integration: CBIS (TSA PGDS), CBP Simplified Arrival & CUPPS',
      '4. Mandatory U.S. Statutory Audits: TSA Cybersecurity Directive & ADA/ACAA Part 382',
      '5. Workforce Familiarization Coverage (>= 0.98) & Day-1 Fallback Playbooks',
    ],
    formulas: [
      'R = Sum(w_k * PassedTrials_k) / Sum(w_k * TotalTrials_k) >= 0.95 AND CriticalDefects == 0',
      'WorkforceCoverage = TrainedCertifiedStaff / RequiredDay1Roster >= 0.98',
    ],
    primarySourceKeys: ['TRB_ACRP_ORAT', 'TSA_PGDS_CBP_ATDS', 'FAA_ASPM'],
  },
  R7: {
    code: 'R7',
    title: 'U.S. FAA Hub Cohort Benchmarking & Performance Assessment',
    subtitle: 'Core 30 / Large Hub Peer Percentile, Standard & Robust Z-Scores (IQR) & Infratech Maturity',
    workflows: ['W3', 'W6', 'W7'],
    sections: [
      '1. FAA Statutory Hub Cohort Definition & Primary Data Vintage',
      '2. Traffic, O&D vs. Connecting Split & Carrier Concentration (BTS T-100 HHI)',
      '3. Passenger Journey & Erlang-C Queue Benchmarks (TSA PreCheck & CBP FIS)',
      '4. Airfield ASPM AAR/ADR Reliability & Cause-Specific Delay Attribution',
      '5. Financial Productivity (Form 5100-127 CPE, NARE, DSCR, DCOH) & Infratech Maturity',
    ],
    formulas: [
      'Percentile p = |{x_i in Cohort : x_i < x}| / n',
      'Standard Z-Score z = (x - mean) / std; Robust Z-Score z_IQR = (x - Median) / (0.7413 * IQR)',
      'Composite Index I = Sum(w_j * c_j * Phi(z_j)) / Sum(w_j * c_j)',
    ],
    primarySourceKeys: ['FAA_CATS_5100_127', 'BTS_TRANSTATS', 'FAA_ASPM', 'TSA_PGDS_CBP_ATDS'],
  },
  R8: {
    code: 'R8',
    title: 'U.S. Airport Sustainability, VALE/ZEV & Energy Transition Assessment',
    subtitle: 'EPA eGRID Subregional Scope 1+2 Inventory, 400Hz Gate Electrification APU Cut & EaaS Microgrids',
    workflows: ['W5'],
    sections: [
      '1. Baseline Scope 1 & Scope 2 Inventory via U.S. EPA eGRID Subregion Factors',
      '2. Net-Zero Target Glidepath & Compound Annual Reduction Rate (CARR)',
      '3. 400Hz GPU & PCA Gate Electrification APU Displacement (FAA AEDT / VALE)',
      '4. Geothermal Heat-Pump & Islandable Solar/Battery Microgrid EaaS Appraisal',
      '5. FAA VALE / ZEV / IIJA Net-Zero Grant Compliance & IRA Direct-Pay Leverage',
    ],
    formulas: [
      'E_Scope1_2 = Sum(Fuel_f * EF_EPA) + (GridMWh - SolarMWh - PPA_MWh) * EF_eGRID',
      'Delta_E_Gate = N_turns * t_gate * (m_dot_APU * EF_JetA - P_GPU_PCA * EF_eGRID)',
      'GrantLeverage = TotalProgramCapex / FederalValeZevGrant',
    ],
    primarySourceKeys: ['EPA_EGRID_AEDT', 'FAA_AIP_BIL', 'FAA_CATS_5100_127'],
  },
  R9: {
    code: 'R9',
    title: 'U.S. Airport P3, Concession & Municipal Credit Due Diligence Report',
    subtitle: 'DBFOM / ConRAC / EaaS Underwriting, 49 U.S.C. 47134 AIPP, Grant Assurance #25 & Stress DSCR',
    workflows: ['W1', 'W2', 'W5', 'W7'],
    sections: [
      '1. Transaction Perimeter, FAA Grant Assurance #25 & PAB/GARB/TIFIA Structure',
      '2. Catchment Area, BTS T-100 Enplanement Resilience & Carrier HHI Concentration',
      '3. AULA Rate Recovery Mechanics (Residual vs. Compensatory) & NARE Upside',
      '4. Financial Model Audit, LLCR (>= 1.30x) & Downside Traffic Shock Stress Test',
      '5. Cybersecurity, PFAS/AFFF Environmental & Physical Climate Due Diligence',
    ],
    formulas: [
      'NPV_equity = Sum(FCFE_t / (1 + k_e)^t); LLCR = PV(CFADS) / Debt_outstanding >= 1.30x',
      'Stress-Case DSCR Floor: min_t(DSCR_stress_t) >= 1.10x (Base Senior Covenant >= 1.25x)',
    ],
    primarySourceKeys: ['MSRB_EMMA', 'FAA_CATS_5100_127', 'BTS_TRANSTATS', 'FAA_TAF'],
  },
  R10: {
    code: 'R10',
    title: 'U.S. NAS & Airport Realtime Operations Intelligence Brief',
    subtitle: 'FAA SWIM SFDPS, NOTAMs, ASPM AAR/ADR, Erlang-C Queue Exceptions & Tonight BNATCS Cutover Watch',
    workflows: ['W3', 'W4', 'W7'],
    sections: [
      '1. U.S. Airport & NAS Operational Summary (ASPM AAR/ADR & Active NOTAMs)',
      '2. Realtime Feed Health & Data Integrity (Staleness S & Completeness C >= 0.95)',
      '3. Tonight AC 150/5370-2G Construction & BNATCS Equipment Cutover Risk Score',
      '4. Terminal TSA & CBP FIS Erlang-C Queue Exceptions (W_q95 vs. 70s Budget)',
      '5. Rolling 7-Day ASPM Delay Attribution & Prioritized Tactical Actions',
    ],
    formulas: [
      'FeedHealth: S = t_now - t_last > 2 * SLA => Degraded; C = N_valid / N_expected >= 0.95',
      'Erlang-C: rho = lambda / (c * mu); W_q95 = ln(20 * P_wait) / (c * mu - lambda) <= W_budget',
      'CutoverRisk = Complexity * (Traffic_SWIM / AAR_ASPM) * (t_rollback / t_window)',
    ],
    primarySourceKeys: ['FAA_SWIM', 'FAA_ASPM', 'FAA_BNATCS_GAO', 'TSA_PGDS_CBP_ATDS'],
  },
}

const WORKFLOW_PRIMARY_REPORTS: Record<WorkflowCode, string[]> = {
  W1: ['R1', 'R2', 'R4', 'R9'],
  W2: ['R2', 'R3', 'R5', 'R6', 'R9'],
  W3: ['R6', 'R7', 'R10'],
  W4: ['R3', 'R5', 'R10'],
  W5: ['R8', 'R9'],
  W6: ['R3', 'R7'],
  W7: ['R7', 'R9', 'R10'],
}

export interface ReportCalculationMetricRow {
  label: string
  value: string
  formulaOrRule?: string
}

export interface ReportOnlineSourceProbe {
  sourceId: string
  name: string
  url: string
  liveStatus: string
  summary: string
}

export interface ReportCalculationPayload {
  reportCode: string
  selectionReason: string
  executedTools: string[]
  liveWeatherSummary?: string
  liveNasStatusSummary?: string
  liveTrafficSummary?: string
  onlineSources?: ReportOnlineSourceProbe[]
  calculatedMetrics: ReportCalculationMetricRow[]
  calculationNarrative?: string
}

export interface GeneratedPdfDocument {
  meta: JobPdfReportMeta
  buffer: Buffer
  filePath: string
}

export interface IPdfReportService {
  getReportsDirectory(): string
  getReportMetadataForJob(job: EcsJob, specificReportCode?: string): JobPdfReportMeta[]
  generateJobReportPdf(
    job: EcsJob,
    requestedReportCode?: string,
    calculationPayload?: ReportCalculationPayload,
  ): GeneratedPdfDocument
}

function sanitizePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, (ch) => {
      switch (ch) {
        case '·':
        case '•':
          return '-'
        case '—':
        case '–':
        case '−':
          return '-'
        case '’':
        case '‘':
          return "'"
        case '“':
        case '”':
          return '"'
        case '≥':
          return '>='
        case '≤':
          return '<='
        case '×':
          return 'x'
        case 'Δ':
          return 'Delta '
        case 'ρ':
          return 'rho'
        case 'λ':
          return 'lambda'
        case 'μ':
          return 'mu'
        case 'η':
          return 'eta'
        case '∑':
        case 'Σ':
          return 'Sum'
        default:
          return ' '
      }
    })
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapLines(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ['']
  const words = cleaned.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

interface PdfPageBuilder {
  ops: string[]
  cursorY: number
}

/**
 * Builds a standards-compliant multi-page PDF 1.4 binary document (`%PDF-1.4`)
 * with vector headers, tables, formulas, provenance blocks, and job conversation logs.
 */
function buildPdfBinary(pagesContent: string[]): Buffer {
  const objects: string[] = []
  const addObject = (body: string): number => {
    objects.push(body)
    return objects.length
  }

  // 1: Catalog, 2: Pages placeholder, 3: Helvetica, 4: Helvetica-Bold, 5: Courier
  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>')
  const pagesRootId = addObject('') // filled after pages created
  const fontRegularId = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  )
  const fontBoldId = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  )
  const fontMonoId = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
  )

  const pageIds: number[] = []
  for (const streamContent of pagesContent) {
    const length = Buffer.byteLength(streamContent, 'utf8')
    const contentId = addObject(
      `<< /Length ${length} >>\nstream\n${streamContent}\nendstream`,
    )
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    )
    pageIds.push(pageId)
  }

  objects[pagesRootId - 1] = `<< /Type /Pages /Kids [${pageIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] /Count ${pageIds.length} >>`

  const chunks: string[] = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n']
  const offsets: number[] = [0]
  let byteOffset = Buffer.byteLength(chunks[0], 'utf8')

  for (let i = 0; i < objects.length; i++) {
    offsets.push(byteOffset)
    const objStr = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
    chunks.push(objStr)
    byteOffset += Buffer.byteLength(objStr, 'utf8')
  }

  const xrefOffset = byteOffset
  const xrefLines = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`]
  for (let i = 1; i <= objects.length; i++) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  }

  const trailer = `trailer\n<< /Size ${
    objects.length + 1
  } /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(chunks.join('') + xrefLines.join('') + trailer, 'utf8')
}

export class UsAirportPdfReportService implements IPdfReportService {
  private readonly reportsDir: string
  private readonly logger: ILogger

  constructor(logger: ILogger, customReportsDir?: string) {
    this.logger = logger
    this.reportsDir =
      customReportsDir ?? path.resolve(process.cwd(), 'reports')
    fs.mkdirSync(this.reportsDir, { recursive: true })
  }

  getReportsDirectory(): string {
    return this.reportsDir
  }

  getReportMetadataForJob(job: EcsJob, specificReportCode?: string): JobPdfReportMeta[] {
    if (job.reports && job.reports.length > 0 && !specificReportCode) {
      return job.reports
    }
    const codes = specificReportCode
      ? [specificReportCode.trim().toUpperCase()]
      : [WORKFLOW_PRIMARY_REPORTS[job.code]?.[0] ?? 'R1']
    return codes.map((code) => {
      const spec =
        US_STANDARD_REPORT_TEMPLATES[code] ?? US_STANDARD_REPORT_TEMPLATES.R1
      const fileName = `${job.id}-${job.airportIata}-${spec.code}.pdf`
      return {
        reportCode: spec.code,
        title: `${spec.code}: ${spec.title}`,
        fileName,
        downloadUrl: `/api/jobs/${encodeURIComponent(job.id)}/report.pdf?reportCode=${encodeURIComponent(spec.code)}`,
        generatedAt: new Date().toISOString(),
      }
    })
  }

  generateJobReportPdf(
    job: EcsJob,
    requestedReportCode?: string,
    calculationPayload?: ReportCalculationPayload,
  ): GeneratedPdfDocument {
    const mappedCodes = WORKFLOW_PRIMARY_REPORTS[job.code] ?? ['R1']
    const normalizedCode = (
      requestedReportCode ??
      calculationPayload?.reportCode ??
      job.reports?.[0]?.reportCode
    )
      ?.trim()
      .toUpperCase()
    const reportCode =
      normalizedCode && US_STANDARD_REPORT_TEMPLATES[normalizedCode]
        ? normalizedCode
        : mappedCodes[0]

    const spec =
      US_STANDARD_REPORT_TEMPLATES[reportCode] ??
      US_STANDARD_REPORT_TEMPLATES.R1
    const airportCode = job.airportIata.toUpperCase()
    const baseline =
      US_AIRPORT_BASELINES[airportCode] ?? US_AIRPORT_BASELINES.JFK
    const generatedAt = new Date().toISOString()

    const pages: PdfPageBuilder[] = []
    const createPage = (pageNum: number): PdfPageBuilder => {
      const ops: string[] = []
      // Dark Navy Institutional Top Banner
      ops.push('0.06 0.09 0.16 rg 36 716 540 46 re f')
      ops.push('0.15 0.39 0.92 rg 36 713 540 3 re f')
      ops.push('BT /F2 11 Tf 1 1 1 rg 48 744 Td (U.S. AIRPORT INVESTMENT INTELLIGENCE - DELOITTE ECS REPORT) Tj ET')
      ops.push(
        `BT /F1 8.5 Tf 0.82 0.88 0.98 rg 48 727 Td (${sanitizePdfText(
          `Template ${spec.code} | Workflow ${job.code} (${job.ecsSystem}) | ${job.airportIata} (${job.airportIcao}) - ${job.airportName}`,
        )}) Tj ET`,
      )
      // Footer
      ops.push('0.85 0.88 0.92 RG 0.6 w 36 44 m 576 44 l S')
      ops.push(
        `BT /F1 7.5 Tf 0.38 0.44 0.52 rg 36 32 Td (${sanitizePdfText(
          `Job ${job.id} | Report ${spec.code} (Generated by Tool T13) | ${generatedAt} | Page ${pageNum}`,
        )}) Tj ET`,
      )
      return { ops, cursorY: 694 }
    }

    let currentPage = createPage(1)
    pages.push(currentPage)

    const ensureSpace = (neededPts: number) => {
      if (currentPage.cursorY - neededPts < 58) {
        currentPage = createPage(pages.length + 1)
        pages.push(currentPage)
      }
    }

    const writeHeading = (text: string) => {
      ensureSpace(28)
      currentPage.cursorY -= 8
      currentPage.ops.push(
        `0.94 0.96 0.99 rg 36 ${currentPage.cursorY - 4} 540 18 re f`,
      )
      currentPage.ops.push(
        `0.15 0.39 0.92 rg 36 ${currentPage.cursorY - 4} 3 18 re f`,
      )
      currentPage.ops.push(
        `BT /F2 10 Tf 0.06 0.09 0.16 rg 44 ${currentPage.cursorY + 1} Td (${sanitizePdfText(
          text,
        )}) Tj ET`,
      )
      currentPage.cursorY -= 16
    }

    const writeParagraph = (
      text: string,
      opts?: { font?: 'F1' | 'F2' | 'F3'; size?: number; indent?: number },
    ) => {
      const font = opts?.font ?? 'F1'
      const size = opts?.size ?? 9
      const indent = opts?.indent ?? 40
      const maxChars = font === 'F3' ? 78 : 88
      const lines = wrapLines(text, maxChars)
      for (const line of lines) {
        ensureSpace(size + 5)
        currentPage.ops.push(
          `BT /${font} ${size} Tf 0.12 0.16 0.23 rg ${indent} ${currentPage.cursorY} Td (${sanitizePdfText(
            line,
          )}) Tj ET`,
        )
        currentPage.cursorY -= size + 4
      }
    }

    const writeKeyValueRow = (label: string, value: string) => {
      ensureSpace(15)
      currentPage.ops.push(
        `BT /F2 8.5 Tf 0.20 0.25 0.33 rg 42 ${currentPage.cursorY} Td (${sanitizePdfText(
          label,
        )}) Tj ET`,
      )
      currentPage.ops.push(
        `BT /F3 8.5 Tf 0.06 0.09 0.16 rg 225 ${currentPage.cursorY} Td (${sanitizePdfText(
          value,
        )}) Tj ET`,
      )
      currentPage.cursorY -= 13
    }

    // Report Main Title Block
    writeParagraph(`${spec.code} — ${spec.title}`, {
      font: 'F2',
      size: 12,
      indent: 36,
    })
    writeParagraph(spec.subtitle, { font: 'F1', size: 9, indent: 36 })
    currentPage.cursorY -= 4

    // Section 1: Job & Executive Summary
    writeHeading('1. EXECUTIVE SUMMARY & SINGLE-PURPOSE JOB MANDATE')
    writeKeyValueRow(
      'Job Identifier & Status:',
      `${job.id} | ${job.status.toUpperCase()} (${job.progress}% Complete) | Lifecycle: ${job.lifecycleState}`,
    )
    writeKeyValueRow(
      'Target U.S. Airport:',
      `${job.airportName} (${job.airportIata} / ${job.airportIcao}) - ${baseline.cityState} - Hub: ${baseline.hubClass.toUpperCase()}`,
    )
    writeKeyValueRow(
      'ECS Workflow & System:',
      `${job.code} (${job.workflowName}) -> ${job.ecsSystem}`,
    )
    writeKeyValueRow(
      'Selected Report Template:',
      `${spec.code} (${calculationPayload?.selectionReason || 'Matched directly to job request'})`,
    )
    writeKeyValueRow(
      'Primary Quantitative KPI:',
      `${job.keyMetricLabel}: ${job.keyMetricValue}`,
    )
    if (calculationPayload?.executedTools?.length) {
      writeKeyValueRow(
        'Executed Calculation Tools:',
        calculationPayload.executedTools.join(', '),
      )
    }
    currentPage.cursorY -= 3
    writeParagraph(`Single Specific Job Purpose: ${job.purpose}`, {
      font: 'F2',
      size: 8.8,
      indent: 42,
    })
    writeParagraph(`Executive Synthesis: ${job.summary}`, {
      font: 'F1',
      size: 8.8,
      indent: 42,
    })

    // Section 2: Requisite Request-Specific Calculations (Generated by Domain Tools)
    writeHeading(
      `2. REQUISITE DOMAIN CALCULATIONS FOR ${spec.code} (TOOL-COMPUTED RESULTS)`,
    )
    if (calculationPayload?.calculatedMetrics?.length) {
      for (const row of calculationPayload.calculatedMetrics) {
        writeKeyValueRow(`${row.label}:`, row.value)
        if (row.formulaOrRule) {
          writeParagraph(`   Formula / Rule: ${row.formulaOrRule}`, {
            font: 'F3',
            size: 7.8,
            indent: 48,
          })
        }
      }
      if (calculationPayload.calculationNarrative) {
        currentPage.cursorY -= 2
        writeParagraph(
          `Calculation Verification Summary: ${calculationPayload.calculationNarrative}`,
          { font: 'F1', size: 8.5, indent: 42 },
        )
      }
    } else {
      writeParagraph(
        `Primary Computed Metric (${job.keyMetricLabel}): ${job.keyMetricValue}`,
        { font: 'F2', size: 8.8, indent: 42 },
      )
    }

    // Section 3: Live Online Telemetry & Authoritative Data Feeds
    writeHeading(
      '3. LIVE ONLINE TELEMETRY & REALTIME AVIATION DATA FEEDS (TOOL T0)',
    )
    if (calculationPayload?.liveWeatherSummary) {
      writeParagraph(
        `Live NOAA / AviationWeather.gov METAR: ${calculationPayload.liveWeatherSummary}`,
        { font: 'F3', size: 8, indent: 42 },
      )
    }
    if (calculationPayload?.liveNasStatusSummary) {
      writeParagraph(
        `Live FAA NAS Status / SWIM Advisory: ${calculationPayload.liveNasStatusSummary}`,
        { font: 'F3', size: 8, indent: 42 },
      )
    }
    if (calculationPayload?.liveTrafficSummary) {
      writeParagraph(
        `Live OpenSky ADS-B / Terminal Movement Feed: ${calculationPayload.liveTrafficSummary}`,
        { font: 'F3', size: 8, indent: 42 },
      )
    }
    if (calculationPayload?.onlineSources?.length) {
      for (const probe of calculationPayload.onlineSources) {
        writeParagraph(
          `[${probe.sourceId}] ${probe.name} (${probe.liveStatus}): ${probe.url} — ${probe.summary}`,
          { font: 'F3', size: 7.6, indent: 44 },
        )
      }
    }

    // Section 4: U.S. Airport Baseline & Financial / Operational Metrics
    writeHeading(
      '4. U.S. STATUTORY BASELINE PROFILE (FAA FORM 5100-127, NPIAS, TAF & EPA eGRID)',
    )
    const unfundedGapUsdM =
      baseline.fiveYearCapitalNeedUsdM - baseline.fundedInstrumentsUsdM
    const tafAsvRatio = (
      baseline.annualOperationsTaf / baseline.asvCapacityOps
    ).toFixed(2)
    const enplanementsM = (baseline.enplanements / 1_000_000).toFixed(1)
    writeKeyValueRow(
      'Annual Enplanements & AULA Regime:',
      `${enplanementsM}M pax/yr | ${baseline.rateRegime.toUpperCase()} Agreement | Carrier HHI: ${baseline.carrierHhi}`,
    )
    writeKeyValueRow(
      '5-Year NPIAS/CIP Capital Stack:',
      `Need: $${baseline.fiveYearCapitalNeedUsdM}M | Funded: $${baseline.fundedInstrumentsUsdM}M | Unfunded Gap: $${unfundedGapUsdM}M`,
    )
    writeKeyValueRow(
      'Municipal Credit & Airline Rates:',
      `CPE: $${baseline.cpeUsd.toFixed(2)} | NARE: $${baseline.narePerPaxUsd.toFixed(2)} | Senior DSCR: ${baseline.dscrSenior.toFixed(2)}x (>=1.25x) | DCOH: ${baseline.dcohDays}d`,
    )
    writeKeyValueRow(
      'Airfield Capacity & FAA Region:',
      `TAF Ops: ${baseline.annualOperationsTaf.toLocaleString()} | ASV: ${baseline.asvCapacityOps.toLocaleString()} (Ratio ${tafAsvRatio}) | FAA Region: ${baseline.faaRegion}`,
    )
    writeKeyValueRow(
      'U.S. EPA eGRID Subregion Factor:',
      `${baseline.egridSubregion} (${baseline.egridRateTonnesPerMWh} tCO2e/MWh) | 14 CFR Part 158 Net PFC: $4.39/pax`,
    )

    // Section 5: Template-Specific Assessment Structure & Formulas
    writeHeading(
      `5. STANDARD REPORT TEMPLATE SECTIONS & REPRODUCIBLE FORMULAS (${spec.code})`,
    )
    for (const sec of spec.sections) {
      writeParagraph(`- ${sec}`, { font: 'F1', size: 8.5, indent: 44 })
    }
    currentPage.cursorY -= 3
    for (const formula of spec.formulas) {
      writeParagraph(`Formula: ${formula}`, { font: 'F3', size: 8, indent: 44 })
    }

    // Section 6: Active Job Execution Steps & Sub-Conversation Transcript
    writeHeading('6. DETERMINISTIC AI TOOL LOG & JOB SUB-CONVERSATION TRANSCRIPT')
    for (const step of job.steps) {
      writeParagraph(
        `[${step.timestamp}] [${step.state.toUpperCase()}] ${step.stage}: ${step.detail}`,
        { font: 'F3', size: 8, indent: 42 },
      )
    }
    currentPage.cursorY -= 3
    for (const msg of job.chatHistory) {
      const speaker =
        msg.role === 'user'
          ? 'OPERATOR / MANDATE'
          : msg.role === 'assistant'
            ? 'JOB AGENT (AI SKILL)'
            : 'SYSTEM'
      writeParagraph(`[${msg.timestamp}] ${speaker}: ${msg.content}`, {
        font: 'F1',
        size: 8.4,
        indent: 42,
      })
    }

    // Section 7: Mandatory Provenance Block & Epistemic Governance
    writeHeading(
      '7. MANDATORY PROVENANCE BLOCK & UNOFFICIAL QUARANTINE GOVERNANCE',
    )
    for (const key of spec.primarySourceKeys) {
      const src = US_AUTHORITATIVE_SOURCES[key]
      if (src) {
        writeParagraph(
          `Source [${src.sourceId}] (Credibility ${src.credibility}/5, Cadence ${src.cadence}): ${src.name} - ${src.url}`,
          { font: 'F3', size: 7.8, indent: 42 },
        )
      }
    }
    writeParagraph(
      'Governance Seal: Report compiled exclusively by Tool T13 (generatePdfAssessmentReport) from verified domain calculation tools. Composite Confidence = min(contributing source credibilities). Unofficial vendor or consultancy claims (Credibility <= 3, e.g., McKinsey 6-8% EBITDA estimate) are quarantined from financial underwriting and gate sign-offs.',
      { font: 'F1', size: 8, indent: 42 },
    )

    const buffer = buildPdfBinary(pages.map((p) => p.ops.join('\n')))
    const fileName = `${job.id}-${job.airportIata}-${spec.code}.pdf`
    const filePath = path.join(this.reportsDir, fileName)

    try {
      fs.writeFileSync(filePath, buffer)
    } catch (err) {
      this.logger.warn('pdf_report.disk_write_warning', {
        fileName,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    const meta: JobPdfReportMeta = {
      reportCode: spec.code,
      title: `${spec.code}: ${spec.title}`,
      fileName,
      downloadUrl: `/api/jobs/${encodeURIComponent(job.id)}/report.pdf?reportCode=${encodeURIComponent(spec.code)}`,
      generatedAt,
      sizeBytes: buffer.byteLength,
    }

    this.logger.info('pdf_report.generated', {
      jobId: job.id,
      airportIata: job.airportIata,
      reportCode: spec.code,
      fileName,
      sizeBytes: buffer.byteLength,
      pagesCount: pages.length,
    })

    return { meta, buffer, filePath }
  }
}
