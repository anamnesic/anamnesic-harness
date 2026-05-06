---
summary: "Infer-first CLI for provider-backed model, image, audio, TTS, video, web, and embedding workflows"
read_when:
  - Adding or modifying `kairos infer` commands
  - Designing stable headless capability automation
title: "Inference CLI"
---

`kairos infer` is the canonical headless surface for provider-backed inference workflows.

It intentionally exposes capability families, not raw gateway RPC names and not raw agent tool ids.

## Turn infer into a skill

Copy and paste this to an agent:

```text
Read https://docs.kairos.ai/cli/infer, then create a skill that routes my common workflows to `kairos infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

A good infer-based skill should:

- map common user intents to the correct infer subcommand
- include a few canonical infer examples for the workflows it covers
- prefer `kairos infer ...` in examples and suggestions
- avoid re-documenting the entire infer surface inside the skill body

Typical infer-focused skill coverage:

- `kairos infer model run`
- `kairos infer image generate`
- `kairos infer audio transcribe`
- `kairos infer tts convert`
- `kairos infer web search`
- `kairos infer embedding create`

## Why use infer

`kairos infer` provides one consistent CLI for provider-backed inference tasks inside kairos.

Benefits:

- Use the providers and models already configured in kairos instead of wiring up one-off wrappers for each backend.
- Keep model, image, audio transcription, TTS, video, web, and embedding workflows under one command tree.
- Use a stable `--json` output shape for scripts, automation, and agent-driven workflows.
- Prefer a first-party kairos surface when the task is fundamentally "run inference."
- Use the normal local path without requiring the gateway for most infer commands.

For end-to-end provider checks, prefer `kairos infer ...` once lower-level
provider tests are green. It exercises the shipped CLI, config loading,
default-agent resolution, bundled plugin activation, runtime-dependency repair,
and the shared capability runtime before the provider request is made.

## Command tree

```text
 kairos infer
  list
  inspect

  model
    run
    list
    inspect
    providers
    auth login
    auth logout
    auth status

  image
    generate
    edit
    describe
    describe-many
    providers

  audio
    transcribe
    providers

  tts
    convert
    voices
    providers
    status
    enable
    disable
    set-provider

  video
    generate
    describe
    providers

  web
    search
    fetch
    providers

  embedding
    create
    providers
```

## Common tasks

This table maps common inference tasks to the corresponding infer command.

| Task                         | Command                                                                                       | Notes                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Run a text/model prompt      | `kairos infer model run --prompt "..." --json`                                              | Uses the normal local path by default                 |
| Run a model prompt on images | `kairos infer model run --prompt "Describe this" --file ./image.png --model provider/model` | Repeat `--file` for multiple image inputs             |
| Generate an image            | `kairos infer image generate --prompt "..." --json`                                         | Use `image edit` when starting from an existing file  |
| Describe an image file       | `kairos infer image describe --file ./image.png --prompt "..." --json`                      | `--model` must be an image-capable `<provider/model>` |
| Transcribe audio             | `kairos infer audio transcribe --file ./memo.m4a --json`                                    | `--model` must be `<provider/model>`                  |
| Synthesize speech            | `kairos infer tts convert --text "..." --output ./speech.mp3 --json`                        | `tts status` is gateway-oriented                      |
| Generate a video             | `kairos infer video generate --prompt "..." --json`                                         | Supports provider hints such as `--resolution`        |
| Describe a video file        | `kairos infer video describe --file ./clip.mp4 --json`                                      | `--model` must be `<provider/model>`                  |
| Search the web               | `kairos infer web search --query "..." --json`                                              |                                                       |
| Fetch a web page             | `kairos infer web fetch --url https://example.com --json`                                   |                                                       |
| Create embeddings            | `kairos infer embedding create --text "..." --json`                                         |                                                       |

## Behavior

- `kairos infer ...` is the primary CLI surface for these workflows.
- Use `--json` when the output will be consumed by another command or script.
- Use `--provider` or `--model provider/model` when a specific backend is required.
- For `image describe`, `audio transcribe`, and `video describe`, `--model` must use the form `<provider/model>`.
- For `image describe`, an explicit `--model` runs that provider/model directly. The model must be image-capable in the model catalog or provider config. `codex/<model>` runs a bounded Codex app-server image-understanding turn; `openai-codex/<model>` uses the OpenAI Codex OAuth provider path.
- Stateless execution commands default to local.
- Gateway-managed state commands default to gateway.
- The normal local path does not require the gateway to be running.
- Local `model run` is a lean one-shot provider completion. It resolves the configured agent model and auth, but does not start a chat-agent turn, load tools, or open bundled MCP servers.
- `model run --file` accepts image files, detects their MIME type, and sends them with the supplied prompt to the selected model. Repeat `--file` for multiple images.
- `model run --file` rejects non-image inputs. Use `infer audio transcribe` for audio files and `infer video describe` for video files.
- `model run --gateway` exercises Gateway routing, saved auth, provider selection, and the embedded runtime, but still runs as a raw model probe: it sends the supplied prompt and any image attachments without prior session transcript, bootstrap/AGENTS context, context-engine assembly, tools, or bundled MCP servers.
- `model run --gateway --model <provider/model>` requires a trusted operator gateway credential because the request asks the Gateway to run a one-off provider/model override.

## Model

Use `model` for provider-backed text inference and model/provider inspection.

```bash
kairos infer model run --prompt "Reply with exactly: smoke-ok" --json
kairos infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
kairos infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
kairos infer model providers --json
kairos infer model inspect --name gpt-5.5 --json
```

Use full `<provider/model>` refs to smoke-test a specific provider without
starting the Gateway or loading the full agent tool surface:

```bash
kairos infer model run --local --model anthropic/kairos-orange-4-6 --prompt "Reply with exactly: pong" --json
kairos infer model run --local --model cerebras/zai-glm-4.7 --prompt "Reply with exactly: pong" --json
kairos infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
kairos infer model run --local --model groq/llama-3.1-8b-instant --prompt "Reply with exactly: pong" --json
kairos infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
kairos infer model run --local --model openai/gpt-4.1 --prompt "Reply with exactly: pong" --json
kairos infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

Notes:

- Local `model run` is the narrowest CLI smoke for provider/model/auth health because it sends only the supplied prompt to the selected model.
- Local `model run --file` keeps that lean path and attaches image content directly to the single user message. Common image files such as PNG, JPEG, and WebP work when their MIME type is detected as `image/*`; unsupported or unrecognized files fail before the provider is called.
- `model run --file` is best when you want to test the selected multimodal text model directly. Use `infer image describe` when you want kairos's image-understanding provider selection and default image-model routing.
- The selected model must support image input; text-only models may reject the request at the provider layer.
- `model run --prompt` must contain non-whitespace text; empty prompts are rejected before local providers or the Gateway are called.
- Local `model run` exits non-zero when the provider returns no text output, so unreachable local providers and empty completions do not look like successful probes.
- Use `model run --gateway` when you need to test Gateway routing, agent-runtime setup, or Gateway-managed provider state while keeping the model input raw. Use `kairos agent` or chat surfaces when you want the full agent context, tools, memory, and session transcript.
- `model auth login`, `model auth logout`, and `model auth status` manage saved provider auth state.

## Image

Use `image` for generation, edit, and description.

```bash
kairos infer image generate --prompt "friendly lobster illustration" --json
kairos infer image generate --prompt "cinematic product photo of headphones" --json
kairos infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
kairos infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
kairos infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
kairos infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
kairos infer image describe --file ./photo.jpg --json
kairos infer image describe --file ./receipt.jpg --prompt "Extract the merchant, date, and total" --json
kairos infer image describe-many --file ./before.png --file ./after.png --prompt "Compare the screenshots and list visible UI changes" --json
kairos infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
kairos infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "Describe the image in one sentence" --timeout-ms 300000 --json
```

Notes:

- Use `image edit` when starting from existing input files.
- Use `--size`, `--aspect-ratio`, or `--resolution` with `image edit` for
  providers/models that support geometry hints on reference-image edits.
- Use `--output-format png --background transparent` with
  `--model openai/gpt-image-1.5` for transparent-background OpenAI PNG output;
  `--openai-background` remains available as an OpenAI-specific alias. Providers
  that do not declare background support report the hint as an ignored override.
- Use `image providers --json` to verify which bundled image providers are
  discoverable, configured, selected, and which generation/edit capabilities
  each provider exposes.
- Use `image generate --model <provider/model> --json` as the narrowest live
  CLI smoke for image generation changes. Example:

  ```bash
  kairos infer image providers --json
  kairos infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./kairos-infer-image-smoke.png \
    --json
  ```

  The JSON response reports `ok`, `provider`, `model`, `attempts`, and written
  output paths. When `--output` is set, the final extension may follow the
  provider's returned MIME type.

- For `image describe` and `image describe-many`, use `--prompt` to give the vision model a task-specific instruction such as OCR, comparison, UI inspection, or concise captioning.
- Use `--timeout-ms` with slow local vision models or cold Ollama starts.
- For `image describe`, `--model` must be an image-capable `<provider/model>`.
- For local Ollama vision models, pull the model first and set `OLLAMA_API_KEY` to any placeholder value, for example `ollama-local`. See [Ollama](/providers/ollama#vision-and-image-description).

## Audio

Use `audio` for file transcription.

```bash
kairos infer audio transcribe --file ./memo.m4a --json
kairos infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
kairos infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

Notes:

- `audio transcribe` is for file transcription, not realtime session management.
- `--model` must be `<provider/model>`.

## TTS

Use `tts` for speech synthesis and TTS provider state.

```bash
kairos infer tts convert --text "hello from kairos" --output ./hello.mp3 --json
kairos infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
kairos infer tts providers --json
kairos infer tts status --json
```

Notes:

- `tts status` defaults to gateway because it reflects gateway-managed TTS state.
- Use `tts providers`, `tts voices`, and `tts set-provider` to inspect and configure TTS behavior.

## Video

Use `video` for generation and description.

```bash
kairos infer video generate --prompt "cinematic sunset over the ocean" --json
kairos infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
kairos infer video describe --file ./clip.mp4 --json
kairos infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

Notes:

- `video generate` accepts `--size`, `--aspect-ratio`, `--resolution`, `--duration`, `--audio`, `--watermark`, and `--timeout-ms` and forwards them to the video-generation runtime.
- `--model` must be `<provider/model>` for `video describe`.

## Web

Use `web` for search and fetch workflows.

```bash
kairos infer web search --query "kairos docs" --json
kairos infer web search --query "kairos infer web providers" --json
kairos infer web fetch --url https://docs.kairos.ai/cli/infer --json
kairos infer web providers --json
```

Notes:

- Use `web providers` to inspect available, configured, and selected providers.

## Embedding

Use `embedding` for vector creation and embedding provider inspection.

```bash
kairos infer embedding create --text "friendly lobster" --json
kairos infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
kairos infer embedding providers --json
```

## JSON output

Infer commands normalize JSON output under a shared envelope:

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-2",
  "attempts": [],
  "outputs": []
}
```

Top-level fields are stable:

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

For generated media commands, `outputs` contains files written by kairos. Use
the `path`, `mimeType`, `size`, and any media-specific dimensions in that array
for automation instead of parsing human-readable stdout.

## Common pitfalls

```bash
# Bad
kairos infer media image generate --prompt "friendly lobster"

# Good
kairos infer image generate --prompt "friendly lobster"
```

```bash
# Bad
kairos infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# Good
kairos infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## Notes

- `kairos capability ...` is an alias for `kairos infer ...`.

## Related

- [CLI reference](/cli)
- [Models](/concepts/models)
