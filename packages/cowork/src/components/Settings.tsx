import { Component, createSignal } from "solid-js";
import { useSettings } from "../stores/settings";
import { testConnection } from "../lib/tauri-api";
import ModelSelector from "./ModelSelector";
import "./Settings.css";

const Settings: Component = () => {
  const { settings, updateSetting, toggleSettings } = useSettings();
  const [testing, setTesting] = createSignal(false);
  const [testResult, setTestResult] = createSignal<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection();
      setTestResult(result);
    } catch (e) {
      setTestResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setTesting(false);
  };

  return (
    <div class="settings">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="close-btn" onClick={toggleSettings}>
          Close
        </button>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <h3>Model Selection</h3>

          <ModelSelector
            value={settings().model}
            onChange={(modelId, baseUrl) => {
              updateSetting("model", modelId);
              if (baseUrl) {
                updateSetting("baseUrl", baseUrl);
              }
            }}
          />
        </div>

        <div class="settings-section">
          <h3>Connection</h3>

          <div class="form-group">
            <label for="maxTokens">Max Tokens</label>
            <input
              id="maxTokens"
              type="number"
              value={settings().maxTokens}
              onInput={(e) =>
                updateSetting("maxTokens", parseInt(e.currentTarget.value) || 4096)
              }
              min={1}
              max={200000}
            />
          </div>

          <div class="form-group">
            <button class="test-btn" onClick={handleTest} disabled={testing()}>
              {testing() ? "Testing..." : "Test Connection"}
            </button>
            {testResult() === "success" && (
              <span class="test-success">✓ Connection successful!</span>
            )}
            {testResult() && testResult() !== "success" && (
              <span class="test-error">{testResult()}</span>
            )}
          </div>
        </div>

        <div class="settings-section">
          <h3>Data Storage</h3>
          <p class="hint" style={{ margin: 0 }}>
            All data is stored locally on your computer.
            <br />
            Models run via GitHub Copilot — no API key required.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
