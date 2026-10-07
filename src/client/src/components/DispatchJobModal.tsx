import { createSignal } from 'solid-js'
import type { WorkflowCode } from '../types/jobs'

interface DispatchJobModalProps {
  onClose: () => void
  onSubmit: (payload: {
    code: WorkflowCode
    airportIata: string
    title: string
    purpose: string
  }) => void
}

export function DispatchJobModal(props: DispatchJobModalProps) {
  const [code, setCode] = createSignal<WorkflowCode>('W4')
  const [airportIata, setAirportIata] = createSignal('JFK')
  const [title, setTitle] = createSignal('')
  const [purpose, setPurpose] = createSignal('')

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault()
    const resolvedTitle =
      title().trim() || `${code()} Modernization Pipeline (${airportIata()})`
    const resolvedPurpose =
      purpose().trim() ||
      `Execute ${code()} single-purpose LLM analysis and verification for ${airportIata()}: ${resolvedTitle}.`

    props.onSubmit({
      code: code(),
      airportIata: airportIata(),
      title: resolvedTitle,
      purpose: resolvedPurpose,
    })
  }

  return (
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-modal-title"
    >
      <form class="modal-card" onSubmit={handleSubmit}>
        <h2 id="dispatch-modal-title" class="modal-title">
          Dispatch Single-Purpose LLM Job
        </h2>
        <p class="modal-subtitle">
          Enqueue a single-purpose LLM chat job into PGlite and pg-boss.
        </p>

        <div class="form-field">
          <label for="job-workflow-select">ECS Workflow (W1–W7)</label>
          <select
            id="job-workflow-select"
            value={code()}
            onChange={(e) => setCode(e.currentTarget.value as WorkflowCode)}
          >
            <option value="W1">W1 · Funding & Grant Lifecycle (FundingSystem)</option>
            <option value="W2">
              W2 · Capital Project Delivery & ORAT (ProjectLifecycleSystem)
            </option>
            <option value="W3">
              W3 · Passenger Journey Modernization (PassengerFlowSystem)
            </option>
            <option value="W4">
              W4 · ATC & Airfield Modernization (ATCDeploymentSystem)
            </option>
            <option value="W5">
              W5 · Sustainability & Energy Transition (SustainabilitySystem)
            </option>
            <option value="W6">
              W6 · Smart-Tech Adoption Maturity (MaturitySystem)
            </option>
            <option value="W7">
              W7 · Realtime Data Compilation (IngestionSystem)
            </option>
          </select>
        </div>

        <div class="form-field">
          <label for="job-airport-select">Target Airport Entity (IATA)</label>
          <select
            id="job-airport-select"
            value={airportIata()}
            onChange={(e) => setAirportIata(e.currentTarget.value)}
          >
            <option value="JFK">JFK · John F. Kennedy International (KJFK)</option>
            <option value="DEN">DEN · Denver International (KDEN)</option>
            <option value="LAX">LAX · Los Angeles International (KLAX)</option>
            <option value="ORD">ORD · Chicago O’Hare International (KORD)</option>
            <option value="ATL">ATL · Hartsfield-Jackson Atlanta International (KATL)</option>
          </select>
        </div>

        <div class="form-field">
          <label for="job-title-input">Job Title</label>
          <input
            id="job-title-input"
            type="text"
            placeholder="e.g. Surface Awareness Initiative ADS-B Cutover Check"
            value={title()}
            onInput={(e) => setTitle(e.currentTarget.value)}
          />
        </div>

        <div class="form-field">
          <label for="job-purpose-input">Single Specific Purpose (Sub-Chat Prompt)</label>
          <input
            id="job-purpose-input"
            type="text"
            placeholder="e.g. Verify Runway 16R ADS-B fusion latency and calculate delay delta"
            value={purpose()}
            onInput={(e) => setPurpose(e.currentTarget.value)}
          />
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-secondary"
            onClick={() => props.onClose()}
          >
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Dispatch Job
          </button>
        </div>
      </form>
    </div>
  )
}
