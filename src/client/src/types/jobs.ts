export type JobStatus = 'in_progress' | 'completed' | 'failed'

export type WorkflowCode = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7'

export interface ModelConnectionConfig {
  baseUrl: string
  modelId: string
  apiToken: string
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
  code: WorkflowCode
  workflowName: string
  title: string
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
}

export const INITIAL_ECS_JOBS: EcsJob[] = [
  {
    id: 'JOB-4091',
    code: 'W4',
    workflowName: 'ATC & Airfield Modernization',
    title: 'BNATCS Surface Radar & Voice Switch Cutover',
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
      'Executing low-traffic window cutover for 2 replacement surface radars and 14 digital voice switches on Concourse B/C apron.',
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
  },
  {
    id: 'JOB-4094',
    code: 'W3',
    workflowName: 'Passenger Journey Modernization',
    title: 'Biometric Self-Bag-Drop Throughput Calibration',
    airportIata: 'DEL',
    airportIcao: 'VIDP',
    airportName: 'Indira Gandhi International (T3)',
    ecsSystem: 'PassengerFlowSystem',
    lifecycleState: 'Evaluating',
    status: 'in_progress',
    progress: 62,
    elapsed: '11m 05s',
    eta: '04m 50s',
    owner: 'Terminal Ops · DigiYatra',
    keyMetricLabel: 'Avg Bag-Drop Stage Time',
    keyMetricValue: '68.4s (target ≤ 70s)',
    summary:
      'Evaluating M/M/c checkpoint utilization (ρ = 0.78) and biometric photo-match latency across 36 self-bag-drop kiosks.',
    steps: [
      {
        id: 's1',
        timestamp: '00:56:12',
        stage: 'Realtime Queue Feed Ingestion',
        detail: 'Ingested 90-day stage observations across check-in, bag drop, and security',
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
  },
  {
    id: 'JOB-4096',
    code: 'W7',
    workflowName: 'Realtime Data Compilation & Benchmarking',
    title: 'FAA SWIM SFDPS + OpenSky ADS-B Entity Sync',
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
      'Aggregating aircraft-level ADS-B positions and FAA SWIM flight plans into airport-level arrival/departure delay observations.',
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
  },
  {
    id: 'JOB-4085',
    code: 'W1',
    workflowName: 'Funding & Grant Lifecycle',
    title: 'FY2026 AIP & IIJA ATP Grant Drawdown Audit',
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
      'Calculating NPIAS 5-year funding gap, 75% large-hub AIP federal share, and DSCR bond coverage for taxiway reconfiguration.',
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
  },
  {
    id: 'JOB-4079',
    code: 'W5',
    workflowName: 'Sustainability & Energy Transition',
    title: 'Gate Electrification & Geothermal Glidepath',
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
      'Verified $327M FAA gate electrification grant compliance and Net-Zero 2040 emissions glidepath across 90 domestic gates.',
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
  },
  {
    id: 'JOB-4088',
    code: 'W2',
    workflowName: 'Capital Project Delivery & ORAT',
    title: 'New Terminal One ORAT Gate & Cyber Audit',
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
      'ORAT gate halted at 91%: CyberResilienceCheck flagged 2 unsegmented baggage PLC VLAN trunks requiring remediation before sign-off.',
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
  },
]
