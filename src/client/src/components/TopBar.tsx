interface TopBarProps {
  mobileView: 'split' | 'jobs' | 'chat'
  totalJobs: number
  showConnectionBar: boolean
  onSelectView: (view: 'split' | 'jobs' | 'chat') => void
  onToggleConnectionBar: () => void
  onOpenDispatchModal: () => void
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
      </nav>

      <div class="topbar-actions">
        <button
          type="button"
          class="btn-primary"
          onClick={() => props.onOpenDispatchModal()}
        >
          + Dispatch Job
        </button>
      </div>
    </header>
  )
}
