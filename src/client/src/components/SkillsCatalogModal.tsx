import { createSignal, For, Show } from 'solid-js'
import type { SkillCatalogEntry, WorkflowCode } from '../types/jobs'

interface SkillsCatalogModalProps {
  skills: SkillCatalogEntry[]
  onClose: () => void
  onSelectSkill?: (skillId: string, workflowCode: WorkflowCode) => void
}

export function SkillsCatalogModal(props: SkillsCatalogModalProps) {
  const [selectedSkillId, setSelectedSkillId] = createSignal('S1')

  const activeSkill = () =>
    props.skills.find((s) => s.id === selectedSkillId()) ?? props.skills[0]

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
          Live domain AI Skills (S1–S8) and executable Vercel AI SDK Tools (T1–T13) served from <code>/api/skills</code>.
        </p>

        <Show
          when={activeSkill()}
          fallback={
            <div class="empty-state">
              <p>Loading live skills catalog from server…</p>
            </div>
          }
        >
          {(skill) => (
            <>
              <div class="segmented-filters" role="tablist" aria-label="Select AI Skill">
                <For each={props.skills}>
                  {(item) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selectedSkillId() === item.id}
                      class={`filter-tab ${selectedSkillId() === item.id ? 'is-active' : ''}`}
                      onClick={() => {
                        setSelectedSkillId(item.id)
                        props.onSelectSkill?.(item.id, item.workflowCode)
                      }}
                    >
                      {item.id} ({item.workflowCode})
                    </button>
                  )}
                </For>
              </div>

              <div class="job-details-collapse" style={{ 'margin-top': '8px' }}>
                <div class="job-details-grid tabular-nums">
                  <span>
                    <strong>
                      {skill().id} · {skill().slug}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>Workflow: {skill().workflowCode}</span>
                  <span>·</span>
                  <span>ECS: {skill().ecsSystem}</span>
                  <span>·</span>
                  <span>Reports: {skill().reportTemplates.join(', ')}</span>
                </div>

                <div class="job-purpose-box">
                  <span class="job-section-label">Skill Scope & Statutory Guardrails:</span>{' '}
                  <span>{skill().description}</span>
                </div>

                <div class="job-purpose-box">
                  <span class="job-section-label">
                    Bound Executable AI Tools ({skill().boundToolNames.length}):
                  </span>
                  <ul class="job-subchat-list" style={{ 'margin-top': '4px' }}>
                    <For each={skill().boundToolNames}>
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
              </div>
            </>
          )}
        </Show>
      </div>
    </div>
  )
}
