export type JobStatus = 'in_progress' | 'completed' | 'failed'

export type WorkflowCode = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7'

export type AiProviderType = 'gemini' | 'openai'

export interface ModelConnectionConfig {
  provider?: AiProviderType
  baseUrl: string
  modelId: string
  apiToken: string
  port?: number
}

export interface JobPdfReportMeta {
  reportCode: string
  title: string
  fileName: string
  downloadUrl: string
  generatedAt: string
  sizeBytes?: number
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
  reports?: JobPdfReportMeta[]
}

export interface SkillCatalogEntry {
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

export interface SkillCatalogSummary {
  skillsCount: number
  toolsCount: number
  skills: SkillCatalogEntry[]
}

