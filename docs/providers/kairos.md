---
summary: "Use Kairos Zen and Go catalogs with OpenClaw"
read_when:
  - You want Kairos-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "Kairos"
---

Kairos exposes two hosted catalogs in OpenClaw:

| Catalog | Prefix            | Runtime provider |
| ------- | ----------------- | ---------------- |
| **Zen** | `kairos/...`    | `kairos`       |
| **Go**  | `kairos-go/...` | `kairos-go`    |

Both catalogs use the same Kairos API key. OpenClaw keeps the runtime provider ids
split so upstream per-model routing stays correct, but onboarding and docs treat them
as one Kairos setup.

## Getting started

<Tabs>
  <Tab title="Zen catalog">
    **Best for:** the curated Kairos multi-model proxy (kairos, GPT, Gemini).

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice kairos-zen
        ```

        Or pass the key directly:

        ```bash
        openclaw onboard --kairos-zen-api-key "$KAIROS_API_KEY"
        ```
      </Step>
      <Step title="Set a Zen model as the default">
        ```bash
        openclaw config set agents.defaults.model.primary "kairos/kairos-apple-4-6"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider kairos
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Go catalog">
    **Best for:** the Kairos-hosted Kimi, GLM, and MiniMax lineup.

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice kairos-go
        ```

        Or pass the key directly:

        ```bash
        openclaw onboard --kairos-go-api-key "$KAIROS_API_KEY"
        ```
      </Step>
      <Step title="Set a Go model as the default">
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
</Tabs>

## Config example

```json5
{
  env: { KAIROS_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "kairos/kairos-apple-4-6" } } },
}
```

## Built-in catalogs

### Zen

| Property         | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| Runtime provider | `kairos`                                                              |
| Example models   | `kairos/kairos-apple-4-6`, `kairos/gpt-5.5`, `kairos/gemini-3-pro` |

### Go

| Property         | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| Runtime provider | `kairos-go`                                                            |
| Example models   | `kairos-go/kimi-k2.6`, `kairos-go/glm-5`, `kairos-go/minimax-m2.5` |

## Advanced configuration

<AccordionGroup>
  <Accordion title="API key aliases">
    `KAIROS_ZEN_API_KEY` is also supported as an alias for `KAIROS_API_KEY`.
  </Accordion>

  <Accordion title="Shared credentials">
    Entering one Kairos key during setup stores credentials for both runtime
    providers. You do not need to onboard each catalog separately.
  </Accordion>

  <Accordion title="Billing and dashboard">
    You sign in to Kairos, add billing details, and copy your API key. Billing
    and catalog availability are managed from the Kairos dashboard.
  </Accordion>

  <Accordion title="Gemini replay behavior">
    Gemini-backed Kairos refs stay on the proxy-Gemini path, so OpenClaw keeps
    Gemini thought-signature sanitation there without enabling native Gemini
    replay validation or bootstrap rewrites.
  </Accordion>

  <Accordion title="Non-Gemini replay behavior">
    Non-Gemini Kairos refs keep the minimal OpenAI-compatible replay policy.
  </Accordion>
</AccordionGroup>

<Tip>
Entering one Kairos key during setup stores credentials for both the Zen and
Go runtime providers, so you only need to onboard once.
</Tip>

## Related

<CardGroup cols={2}>
  <Card title="Model selection" href="/concepts/model-providers" icon="layers">
    Choosing providers, model refs, and failover behavior.
  </Card>
  <Card title="Configuration reference" href="/gateway/configuration-reference" icon="gear">
    Full config reference for agents, models, and providers.
  </Card>
</CardGroup>
