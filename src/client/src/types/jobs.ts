export type JobStatus = 'in_progress' | 'completed' | 'failed'

export type WorkflowCode = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7'

export interface ModelConnectionConfig {
  baseUrl: string
  modelId: string
  apiToken: string
}

interface JobChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface JobSubChatUpdate {
  id: string
  jobId: string
  code: WorkflowCode
  airportIata: string
  title: string
  status: JobStatus
  progress: number
  subConversationMessage: string
  timestamp: string
}

interface JobStepLog {
  id: string
  timestamp: string
  stage: string
  detail: string
  state: 'done' | 'active' | 'pending' | 'warning'
}

export interface EcsJob {
  id: string
  pgBossJobId?: string
  code: WorkflowCode
  workflowName: string
  title: string
  purpose: string
  airportIata: string
  airportIcao: string
  airportName: string
  ecsSystem: string
  lifecycleState: string
  status: JobStatus
  progress: number
  elapsed: string
  eta: string
  owner: string
  keyMetricLabel: string
  keyMetricValue: string
  summary: string
  steps: JobStepLog[]
  chatHistory: JobChatMessage[]
}

export const INITIAL_ECS_JOBS: EcsJob[] = [
  {
    id: 'JOB-4091',
    code: 'W4',
    workflowName: 'ATC & Airfield Modernization',
    title: 'BNATCS Surface Radar & Voice Switch Cutover',
    purpose:
      'Verify low-traffic cutover readiness and calculate NAS delay attribution delta for 2 replacement surface radars and 14 digital voice switches at KDEN.',
    airportIata: 'DEN',
    airportIcao: 'KDEN',
    airportName: 'Denver International',
    ecsSystem: 'ATCDeploymentSystem',
    lifecycleState: 'CutoverScheduled',
    status: 'in_progress',
    progress: 74,
    elapsed: '18m 40s',
    eta: '06m 15s',
    owner: 'FAA Program Office · Peraton',
    keyMetricLabel: 'Delay Attribution Delta',
    keyMetricValue: '-28.4% vs baseline',
    summary:
      'Single-purpose LLM job auditing TDM-to-IP trunks and ADS-B surface fusion for Concourse B/C apron cutover.',
    steps: [
      {
        id: 's1',
        timestamp: '01:02:10',
        stage: 'Telecom & Fiber Verification',
        detail: 'Redundant TDM-to-IP trunks validated across TRACON ring (0% packet loss)',
        state: 'done',
      },
      {
        id: 's2',
        timestamp: '01:04:45',
        stage: 'Surface Awareness Initiative Sync',
        detail: 'ADS-B surface target fusion calibrated on Runway 16R/34L',
        state: 'done',
      },
      {
        id: 's3',
        timestamp: '01:06:30',
        stage: 'Voice Switch Shadow Cutover',
        detail: 'Migrating tower positions 4–9 to BNATCS digital voice bus',
        state: 'active',
      },
    ],
    chatHistory: [
      {
        id: 'm1',
        role: 'user',
        content:
          'Verify low-traffic cutover readiness and calculate NAS delay attribution delta for 2 replacement surface radars and 14 digital voice switches at KDEN.',
        timestamp: '01:02:00',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          'Validated TDM-to-IP fiber trunks (0% packet loss) and Runway 16R/34L ADS-B fusion. Currently migrating tower positions 4–9 (-28.4% delay delta vs baseline).',
        timestamp: '01:06:30',
      },
    ],
  },
  {
    id: 'JOB-4094',
    code: 'W3',
    workflowName: 'Passenger Journey Modernization',
    title: 'TSA Touchless ID & Biometric Bag-Drop Calibration',
    purpose:
      'Evaluate Erlang-C (M/M/c) checkpoint utilization (ρ = λ / cμ), 95th-percentile wait (W_q95), and biometric photo-match latency across 36 self-bag-drop kiosks at KATL Domestic South against the 70-second budget.',
    airportIata: 'ATL',
    airportIcao: 'KATL',
    airportName: 'Hartsfield-Jackson Atlanta International',
    ecsSystem: 'PassengerFlowSystem',
    lifecycleState: 'Evaluating',
    status: 'in_progress',
    progress: 62,
    elapsed: '11m 05s',
    eta: '04m 50s',
    owner: 'Terminal Ops · TSA PGDS',
    keyMetricLabel: 'Avg Bag-Drop Stage Time',
    keyMetricValue: '68.4s (target ≤ 70s)',
    summary:
      'Single-purpose LLM job evaluating Erlang-C (M/M/c) checkpoint utilization (ρ = 0.78) and biometric photo-match latency across 36 kiosks at KATL.',
    steps: [
      {
        id: 's1',
        timestamp: '00:56:12',
        stage: 'Realtime Queue Feed Ingestion',
        detail: 'Ingested 90-day stage observations across check-in, bag drop, and TSA PreCheck Touchless ID',
        state: 'done',
      },
      {
        id: 's2',
        timestamp: '01:01:40',
        stage: 'Biometric Photo-Match Verification',
        detail: 'Stage time reduced from 99s manual baseline to 68.4s (-30.9%)',
        state: 'active',
      },
    ],
    chatHistory: [
      {
        id: 'm1',
        role: 'user',
        content:
          'Evaluate Erlang-C (M/M/c) checkpoint utilization and biometric photo-match latency across 36 self-bag-drop kiosks at KATL Domestic South against the 70-second budget.',
        timestamp: '00:56:00',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          '90-day stage observations ingested at KATL. Mean bag-drop stage time is 68.4s (down 30.9% from 99s manual baseline) with utilization ρ = 0.78 and W_q95 within TSA PGDS threshold.',
        timestamp: '01:01:40',
      },
    ],
  },
  {
    id: 'JOB-4096',
    code: 'W7',
    workflowName: 'Realtime Data Compilation & Benchmarking',
    title: 'FAA SWIM SFDPS + OpenSky ADS-B Entity Sync',
    purpose:
      'Resolve aircraft-level OpenSky ADS-B callsign vectors and FAA SWIM SFDPS flight plans into airport-level arrival/departure delay observations for KLAX.',
    airportIata: 'LAX',
    airportIcao: 'KLAX',
    airportName: 'Los Angeles International',
    ecsSystem: 'IngestionSystem',
    lifecycleState: 'Streaming',
    status: 'in_progress',
    progress: 48,
    elapsed: '09m 20s',
    eta: '08m 00s',
    owner: 'Data Engineering',
    keyMetricLabel: 'Feed Latency SLA',
    keyMetricValue: '3.2s (RT ≤ 10s)',
    summary:
      'Single-purpose LLM job aggregating aircraft-level ADS-B positions and FAA SWIM flight plans into KLAX delay observations.',
    steps: [
      {
        id: 's1',
        timestamp: '00:58:00',
        stage: 'SWIM SFDPS & NOTAM Stream Connect',
        detail: 'Connected to US NAS terminal flight data and active runway closure NOTAMs',
        state: 'done',
      },
      {
        id: 's2',
        timestamp: '01:03:15',
        stage: 'IATA/ICAO Entity Resolution',
        detail: 'Reconciling 2,817 ACI airport records with live OpenSky callsign vectors',
        state: 'active',
      },
    ],
    chatHistory: [
      {
        id: 'm1',
        role: 'user',
        content:
          'Resolve aircraft-level OpenSky ADS-B callsign vectors and FAA SWIM SFDPS flight plans into airport-level arrival/departure delay observations for KLAX.',
        timestamp: '00:58:00',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          'Connected to SWIM SFDPS feed at 3.2s latency SLA. Reconciling live callsign vectors against KLAX gate and runway assignments.',
        timestamp: '01:03:15',
      },
    ],
  },
  {
    id: 'JOB-4085',
    code: 'W1',
    workflowName: 'Funding & Grant Lifecycle',
    title: 'FY2026 AIP & IIJA ATP Grant Drawdown Audit',
    purpose:
      'Compute the NPIAS 5-year funding gap, 75% large-hub AIP federal share, and DSCR bond coverage ratio (≥ 1.25) for KORD taxiway reconfiguration.',
    airportIata: 'ORD',
    airportIcao: 'KORD',
    airportName: 'Chicago O’Hare International',
    ecsSystem: 'FundingSystem',
    lifecycleState: 'DrawdownActive',
    status: 'in_progress',
    progress: 31,
    elapsed: '05m 14s',
    eta: '12m 00s',
    owner: 'Sponsor CFO · FAA Grants',
    keyMetricLabel: 'Outlay Ratio (OR)',
    keyMetricValue: '0.64 ($412M / $640M)',
    summary:
      'Single-purpose LLM job calculating NPIAS 5-year funding gap, 75% large-hub AIP share, and DSCR bond coverage for KORD.',
    steps: [
      {
        id: 's1',
        timestamp: '00:49:00',
        stage: 'NPIAS & ACI-NA Need Aggregation',
        detail: 'Loaded $173.9B national 5-year need benchmark and ORD capital ledger',
        state: 'done',
      },
      {
        id: 's2',
        timestamp: '00:53:10',
        stage: 'Sponsor Share & DSCR Verification',
        detail: 'Validating DSCR ≥ 1.25 and PFC collection authority linkage',
        state: 'active',
      },
    ],
    chatHistory: [
      {
        id: 'm1',
        role: 'user',
        content:
          'Compute the NPIAS 5-year funding gap, 75% large-hub AIP federal share, and DSCR bond coverage ratio (≥ 1.25) for KORD taxiway reconfiguration.',
        timestamp: '00:49:00',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          'Ingested KORD capital ledger: $412M cumulative outlays of $640M obligated (OR = 0.64). Verifying sponsor 25% share and DSCR ≥ 1.25.',
        timestamp: '00:53:10',
      },
    ],
  },
  {
    id: 'JOB-4079',
    code: 'W5',
    workflowName: 'Sustainability & Energy Transition',
    title: 'Gate Electrification & Geothermal Glidepath',
    purpose:
      'Audit $327M FAA gate electrification grant compliance and Net-Zero 2040 Scope 1+2 emissions glidepath across 90 domestic gates at KDEN.',
    airportIata: 'DEN',
    airportIcao: 'KDEN',
    airportName: 'Denver International',
    ecsSystem: 'SustainabilitySystem',
    lifecycleState: 'Completed',
    status: 'completed',
    progress: 100,
    elapsed: '24m 10s',
    eta: '00m 00s',
    owner: 'Sustainability Lead',
    keyMetricLabel: 'Scope 1+2 Intensity',
    keyMetricValue: '-19.2% kgCO2e/pax',
    summary:
      'Single-purpose LLM job verifying $327M FAA gate electrification compliance and Net-Zero 2040 glidepath across 90 gates.',
    steps: [
      {
        id: 's1',
        timestamp: '00:15:00',
        stage: 'Baseline Emissions Inventory',
        detail: 'Audited Scope 1, 2, and APU ground burn across concourses A–C',
        state: 'done',
      },
      {
        id: 's2',
        timestamp: '00:39:10',
        stage: 'Provenance & Glidepath Seal',
        detail: 'Emitted verified SustainabilityProfile component update (credibility 5/5)',
        state: 'done',
      },
    ],
    chatHistory: [
      {
        id: 'm1',
        role: 'user',
        content:
          'Audit $327M FAA gate electrification grant compliance and Net-Zero 2040 Scope 1+2 emissions glidepath across 90 domestic gates at KDEN.',
        timestamp: '00:15:00',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          'Audit complete: Scope 1+2 intensity reduced by -19.2% kgCO2e/pax across Concourses A–C. Provenance sealed at credibility 5/5.',
        timestamp: '00:39:10',
      },
    ],
  },
  {
    id: 'JOB-4088',
    code: 'W2',
    workflowName: 'Capital Project Delivery & ORAT',
    title: 'New Terminal One ORAT Gate & Cyber Audit',
    purpose:
      'Verify ORAT readiness gate (R ≥ 0.95) and execute CyberResilienceCheck and AccessibilityAudit for JFK New Terminal One Phase A opening.',
    airportIata: 'JFK',
    airportIcao: 'KJFK',
    airportName: 'John F. Kennedy International',
    ecsSystem: 'ProjectLifecycleSystem',
    lifecycleState: 'ORATGateFailed',
    status: 'failed',
    progress: 91,
    elapsed: '42m 12s',
    eta: 'Halted',
    owner: 'PANYNJ ORAT Team',
    keyMetricLabel: 'ORAT Readiness (R)',
    keyMetricValue: '0.93 / 0.95 gate failure',
    summary:
      'Single-purpose LLM job halted at 91%: CyberResilienceCheck flagged 2 unsegmented baggage PLC VLAN trunks requiring remediation.',
    steps: [
      {
        id: 's1',
        timestamp: '00:25:00',
        stage: 'EVM & Schedule Baseline Check',
        detail: 'SPI 0.98 · CPI 1.01 · $9.5B P3 phase envelope verified',
        state: 'done',
      },
      {
        id: 's2',
        timestamp: '00:58:04',
        stage: 'CyberResilienceCheck (Gate Failure)',
        detail: '2 baggage PLC VLAN segmentation rules failed R ≥ 0.95 security threshold',
        state: 'warning',
      },
    ],
    chatHistory: [
      {
        id: 'm1',
        role: 'user',
        content:
          'Verify ORAT readiness gate (R ≥ 0.95) and execute CyberResilienceCheck and AccessibilityAudit for JFK New Terminal One Phase A opening.',
        timestamp: '00:25:00',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          'ORAT gate halted at R = 0.93 (threshold ≥ 0.95): 2 baggage handling PLC VLAN trunks lacked OT/IT firewall isolation.',
        timestamp: '00:58:04',
      },
    ],
  },
]
