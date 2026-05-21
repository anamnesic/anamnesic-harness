---
summary: "Use the Kairos Go catalog with the shared Kairos setup"
read_when:
  - You want the Kairos Go catalog
  - You need the runtime model refs for Go-hosted models
title: "Kairos Go"
---

Kairos Go is the Go catalog within [Kairos](/providers/kairos).
It uses the same `KAIROS_API_KEY` as the Zen catalog, but keeps the runtime
provider id `kairos-go` so upstream per-model routing stays correct.

| Property         | Value                           |
| ---------------- | ------------------------------- |
| Runtime provider | `kairos-go`                   |
| Auth             | `KAIROS_API_KEY`              |
| Parent setup     | [Kairos](/providers/kairos) |

## Built-in catalog

OpenClaw sources most Go catalog rows from the bundled pi model registry and
supplements current upstream rows while the registry catches up. Run
`openclaw models list --provider kairos-go` for the current model list.

The provider includes:

| Model ref                       | Name                  |
| ------------------------------- | --------------------- |
| `kairos-go/glm-5`             | GLM-5                 |
| `kairos-go/glm-5.1`           | GLM-5.1               |
| `kairos-go/kimi-k2.5`         | Kimi K2.5             |
| `kairos-go/kimi-k2.6`         | Kimi K2.6 (3x limits) |
| `kairos-go/deepseek-v4-pro`   | DeepSeek V4 Pro       |
| `kairos-go/deepseek-v4-flash` | DeepSeek V4 Flash     |
| `kairos-go/mimo-v2-omni`      | MiMo V2 Omni          |
| `kairos-go/mimo-v2-pro`       | MiMo V2 Pro           |
| `kairos-go/minimax-m2.5`      | MiniMax M2.5          |
| `kairos-go/minimax-m2.7`      | MiniMax M2.7          |
| `kairos-go/qwen3.5-plus`      | Qwen3.5 Plus          |
| `kairos-go/qwen3.6-plus`      | Qwen3.6 Plus          |

## Getting started

<Tabs>
  <Tab title="Interactive">
    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice kairos-go
        ```
      </Step>
      <Step title="Set a Go model as default">
        ```bash
        openclaw config set agents.defaults.model.primary "kairos-go/kimi-k2.6"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider kairos-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="Non-interactive">
    <Steps>
      <Step title="Pass the key directly">
        ```bash
        openclaw onboard --kairos-go-api-key "$KAIROS_API_KEY"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider kairos-go
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

## Config example

```json5
{
  env: { KAIROS_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "kairos-go/kimi-k2.6" } } },
}
```

## Advanced configuration

<AccordionGroup>
  <Accordion title="Routing behavior">
    OpenClaw handles per-model routing automatically when the model ref uses
    `kairos-go/...`. No additional provider config is required.
  </Accordion>

  <Accordion title="Runtime ref convention">
    Runtime refs stay explicit: `kairos/...` for Zen, `kairos-go/...` for Go.
    This keeps upstream per-model routing correct across both catalogs.
  </Accordion>

  <Accordion title="Shared credentials">
    The same `KAIROS_API_KEY` is used by both the Zen and Go catalogs. Entering
    the key during setup stores credentials for both runtime providers.
  </Accordion>
</AccordionGroup>

<Tip>
See [Kairos](/providers/kairos) for the shared onboarding overview and the full
Zen + Go catalog reference.
</Tip>

## Related

<CardGroup cols={2}>
  <Card title="Kairos (parent)" href="/providers/kairos" icon="server">
    Shared onboarding, catalog overview, and advanced notes.
  </Card>
  <Card title="Model selection" href="/concepts/model-providers" icon="layers">
    Choosing providers, model refs, and failover behavior.
  </Card>
</CardGroup>
