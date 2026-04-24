import { Component, For, Show, createSignal, createMemo, onMount } from "solid-js";
import { AVAILABLE_MODELS } from "../stores/settings";
import "./ModelSelector.css";

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string, baseUrl?: string) => void;
}

interface LiveModel { id: string; name: string; }

const ModelSelector: Component<ModelSelectorProps> = (props) => {
  const [proxyUrl, setProxyUrl] = createSignal("http://localhost:3456");
  const [proxyModels, setProxyModels] = createSignal<LiveModel[]>([]);
  const [showOther, setShowOther] = createSignal(false);

  const fetchProxyModels = async (base: string) => {
    try {
      const url = base.replace(/\/$/, "");
      const res = await fetch(`${url}/v1/models`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data as { id: string; name?: string }[]) || [];
        setProxyModels(models.map((m) => ({ id: m.id, name: m.name || m.id })));
      } else {
        setProxyModels([]);
      }
    } catch {
      setProxyModels([]);
    }
  };

  onMount(() => fetchProxyModels(proxyUrl()));

  // Merge live IDs into the static model list for display
  const allModels = createMemo(() => {
    const live = proxyModels();
    if (!live.length) return AVAILABLE_MODELS;
    // Add any live models not in static list
    const staticIds = new Set(AVAILABLE_MODELS.map((m) => m.id));
    const extra = live
      .filter((m) => !staticIds.has(m.id))
      .map((m) => ({ id: m.id, name: m.name, description: "", provider: "vscode", baseUrl: proxyUrl(), group: "other" as const }));
    return [...AVAILABLE_MODELS, ...extra];
  });

  const autoModel   = createMemo(() => allModels().filter((m) => m.group === "auto"));
  const recommended = createMemo(() => allModels().filter((m) => m.group === "recommended"));
  const other       = createMemo(() => allModels().filter((m) => m.group === "other" || !m.group));

  const selectedName = createMemo(() => {
    const found = allModels().find((m) => m.id === props.value);
    return found ? found.name : props.value;
  });

  const handleSelect = (modelId: string) => {
    props.onChange(modelId, proxyUrl());
  };

  const ModelRow = (m: { id: string; name: string; description?: string }) => (
    <div
      class={`model-row${props.value === m.id ? " model-row--selected" : ""}`}
      onClick={() => handleSelect(m.id)}
    >
      <span class="model-row__name">{m.name}</span>
      <Show when={m.description}>
        <span class="model-row__desc">{m.description}</span>
      </Show>
      <Show when={props.value === m.id}>
        <span class="model-row__check">✓</span>
      </Show>
    </div>
  );

  return (
    <div class="model-selector">
      <div class="vscode-lm-header">
        <span class="tab-icon">🤖</span>
        <span class="tab-label">VS Code LLM · <strong>{selectedName()}</strong></span>
      </div>

      <div class="form-group" style={{ "margin-bottom": "0.5rem" }}>
        <label>Proxy URL</label>
        <input
          type="text"
          value={proxyUrl()}
          onInput={(e) => {
            setProxyUrl(e.currentTarget.value);
            props.onChange(props.value, e.currentTarget.value);
          }}
          onBlur={(e) => fetchProxyModels(e.currentTarget.value)}
          placeholder="http://localhost:3456"
        />
        <span class="hint">Endereço da extensão VS Code LLM Proxy</span>
      </div>

      <div class="model-list-section">
        {/* Auto */}
        <For each={autoModel()}>
          {(m) => <ModelRow {...m} />}
        </For>

        {/* Recommended */}
        <Show when={recommended().length > 0}>
          <div class="model-group-label">Recomendados</div>
          <For each={recommended()}>
            {(m) => <ModelRow {...m} />}
          </For>
        </Show>

        {/* Other Models (collapsible) */}
        <Show when={other().length > 0}>
          <button
            class="model-group-toggle"
            onClick={() => setShowOther((v) => !v)}
          >
            <span>{showOther() ? "▾" : "▸"} Outros modelos</span>
            <span class="model-group-count">{other().length}</span>
          </button>
          <Show when={showOther()}>
            <For each={other()}>
              {(m) => <ModelRow {...m} />}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  );
};

export default ModelSelector;
