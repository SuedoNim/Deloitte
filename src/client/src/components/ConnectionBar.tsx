import { Show } from 'solid-js'
import type { AiProviderType } from '../types/jobs'

interface ConnectionBarProps {
  port: number
  configFile: string
  provider: AiProviderType
  baseUrl: string
  modelId: string
  hasActiveToken: boolean
  savedNotice: string
  onPortChange: (val: number) => void
  onProviderChange: (val: AiProviderType) => void
  onBaseUrlChange: (val: string) => void
  onModelIdChange: (val: string) => void
  onSave: (e?: SubmitEvent) => void
}

export function ConnectionBar(props: ConnectionBarProps) {
  const handleSelectProvider = (next: AiProviderType) => {
    props.onProviderChange(next)
    if (next === 'gemini') {
      props.onBaseUrlChange('https://generativelanguage.googleapis.com')
      if (!props.modelId.toLowerCase().startsWith('gemini')) {
        props.onModelIdChange('gemini-3.8-flash')
      }
    } else {
      props.onBaseUrlChange('https://api.openai.com/v1')
      if (props.modelId.toLowerCase().startsWith('gemini')) {
        props.onModelIdChange('gpt-4o-mini')
      }
    }
  }

  return (
    <form
      class="connection-bar"
      aria-label="Service Port & AI Model Connection Configuration"
      onSubmit={(e) => props.onSave(e)}
    >
      <div class="connection-grid">
        <div class="conn-field conn-field-port">
          <label for="conn-server-port">Service Port ({props.configFile})</label>
          <input
            id="conn-server-port"
            type="number"
            min="1"
            max="65535"
            class="conn-input tabular-nums"
            placeholder="3000"
            value={props.port}
            onInput={(e) => {
              const parsed = Number(e.currentTarget.value)
              if (Number.isFinite(parsed) && parsed > 0) {
                props.onPortChange(parsed)
              }
            }}
          />
        </div>

        <div class="conn-field">
          <label for="conn-provider">AI Model Provider</label>
          <select
            id="conn-provider"
            class="conn-input"
            value={props.provider}
            onChange={(e) =>
              handleSelectProvider(e.currentTarget.value as AiProviderType)
            }
          >
            <option value="gemini">Google Gemini (@google/genai)</option>
            <option value="openai">OpenAI-Compatible Endpoint</option>
          </select>
        </div>

        <div class="conn-field">
          <label for="conn-model-id">Model Name</label>
          <div class="conn-input-group">
            <input
              id="conn-model-id"
              type="text"
              list="conn-model-presets"
              class="conn-input tabular-nums"
              placeholder={
                props.provider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini'
              }
              value={props.modelId}
              onInput={(e) => props.onModelIdChange(e.currentTarget.value)}
            />
            <datalist id="conn-model-presets">
              <option value="gemini-3.8-flash">
                Google Gemini 3.8 Flash (Default)
              </option>
              <option value="gemini-flash-latest">
                Google Gemini Flash Latest
              </option>
              <option value="gemini-3.1-flash-lite">
                Google Gemini 3.1 Flash Lite
              </option>
              <option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
            </datalist>
            <button
              type="button"
              class="btn-secondary"
              onClick={() => {
                handleSelectProvider('gemini')
                props.onModelIdChange('gemini-3.8-flash')
                props.onSave()
              }}
            >
              Use Gemini
            </button>
          </div>
        </div>

        <div class="conn-field">
          <label for="conn-base-url">Model Endpoint / Base URL</label>
          <input
            id="conn-base-url"
            type="url"
            class="conn-input tabular-nums"
            placeholder="https://generativelanguage.googleapis.com"
            value={props.baseUrl}
            onInput={(e) => props.onBaseUrlChange(e.currentTarget.value)}
          />
        </div>

        <button type="submit" class="btn-primary">
          Sync to {props.configFile}
        </button>
      </div>

      <div class="conn-status-row">
        <span class="tabular-nums">
          Synchronized with {props.configFile} · Port {props.port} · Provider:{' '}
          {props.provider === 'gemini'
            ? 'Google Gemini (@google/genai)'
            : 'OpenAI-Compatible'}{' '}
          · Model: {props.modelId || 'gemini-3.8-flash'} · Endpoint:{' '}
          {props.baseUrl || 'https://generativelanguage.googleapis.com'} ·{' '}
          {props.hasActiveToken
            ? 'Server API credential active'
            : 'Server environment credential (GEMINI_API_KEY)'}
        </span>
        <Show when={props.savedNotice}>
          <span class="tabular-nums">{props.savedNotice}</span>
        </Show>
      </div>
    </form>
  )
}
