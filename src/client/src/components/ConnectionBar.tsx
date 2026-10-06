import { createSignal, Show } from 'solid-js'

interface ConnectionBarProps {
  baseUrl: string
  modelId: string
  apiToken: string
  hasActiveToken: boolean
  savedNotice: string
  onBaseUrlChange: (val: string) => void
  onModelIdChange: (val: string) => void
  onApiTokenChange: (val: string) => void
  onSave: (e: SubmitEvent) => void
}

export function ConnectionBar(props: ConnectionBarProps) {
  const [showApiToken, setShowApiToken] = createSignal(false)

  return (
    <form
      class="connection-bar"
      aria-label="Model Connection Configuration"
      onSubmit={(e) => props.onSave(e)}
    >
      <div class="connection-grid">
        <div class="conn-field">
          <label for="conn-base-url">Model Endpoint / Base URL</label>
          <input
            id="conn-base-url"
            type="url"
            class="conn-input tabular-nums"
            placeholder="https://api.openai.com/v1"
            value={props.baseUrl}
            onInput={(e) => props.onBaseUrlChange(e.currentTarget.value)}
          />
        </div>

        <div class="conn-field">
          <label for="conn-model-id">Model Name</label>
          <input
            id="conn-model-id"
            type="text"
            class="conn-input tabular-nums"
            placeholder="gpt-4o-mini"
            value={props.modelId}
            onInput={(e) => props.onModelIdChange(e.currentTarget.value)}
          />
        </div>

        <div class="conn-field">
          <label for="conn-api-token">API Token</label>
          <div class="conn-input-group">
            <input
              id="conn-api-token"
              type={showApiToken() ? 'text' : 'password'}
              class="conn-input tabular-nums"
              placeholder="sk-..."
              value={props.apiToken}
              onInput={(e) => props.onApiTokenChange(e.currentTarget.value)}
            />
            <button
              type="button"
              class="btn-secondary"
              onClick={() => setShowApiToken((v) => !v)}
            >
              {showApiToken() ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button type="submit" class="btn-primary">
          Save Connection
        </button>
      </div>

      <div class="conn-status-row">
        <span>
          {props.hasActiveToken
            ? `Live LLM credentials synced with server for ${props.modelId || 'gpt-4o-mini'} via ${props.baseUrl || 'default endpoint'}.`
            : 'Provide your API token and endpoint above to connect the server to your LLM provider.'}
        </span>
        <Show when={props.savedNotice}>
          <span class="tabular-nums">{props.savedNotice}</span>
        </Show>
      </div>
    </form>
  )
}
