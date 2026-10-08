interface TopBarProps {
  mobileView: 'split' | 'jobs' | 'chat'
  totalJobs: number
  showConnectionBar: boolean
  onSelectView: (view: 'split' | 'jobs' | 'chat') => void
  onToggleConnectionBar: () => void
  onOpenSkillsModal: () => void
}

export function TopBar(props: TopBarProps) {
  return (
    <header class="topbar">
      <a href="#top" class="topbar-brand">
        Deloitte Airport Modernization
      </a>

      <nav class="topbar-nav" aria-label="Workspace navigation">
        <button
          type="button"
          class={`topbar-link ${props.mobileView === 'split' ? 'is-active' : ''}`}
          onClick={() => props.onSelectView('split')}
        >
          Workspace
        </button>
        <button
          type="button"
          class={`topbar-link ${props.mobileView === 'chat' ? 'is-active' : ''}`}
          onClick={() => props.onSelectView('chat')}
        >
          LLM Chat
        </button>
        <button
          type="button"
          class={`topbar-link ${props.mobileView === 'jobs' ? 'is-active' : ''}`}
          onClick={() => props.onSelectView('jobs')}
        >
          Ongoing Jobs ({props.totalJobs})
        </button>
        <button
          type="button"
          class={`topbar-link ${props.showConnectionBar ? 'is-active' : ''}`}
          onClick={() => props.onToggleConnectionBar()}
        >
          Model Connection
        </button>
        <button
          type="button"
          class="topbar-link"
          onClick={() => props.onOpenSkillsModal()}
        >
          AI Skills & Tools (S1–S8)
        </button>
      </nav>
    </header>
  )
}
