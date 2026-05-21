# extensions/

O diretório `extensions/` contém mais de 120 extensões do Kairos — providers de IA, canais de mensagens e ferramentas utilitárias. Cada subdiretório é um plugin auto-contido que pode ser carregado de forma independente pelo runtime do Kairos. Extensões internas de QA são privadas e não são publicadas no registro público.

## Providers de IA

Integram o Kairos com modelos e APIs de linguagem natural.

| Diretório | Descrição |
|---|---|
| `openai/` | Provider para a API da OpenAI (GPT-4, GPT-4o, etc.) |
| `anthropic/` | Provider para a API da Anthropic (Claude) |
| `google/` | Provider para a API do Google (Gemini) |
| `mistral/` | Provider para a API da Mistral AI |
| `deepseek/` | Provider para a API da DeepSeek |
| `ollama/` | Provider para modelos locais via Ollama |
| `groq/` | Provider para inferência de alta velocidade via Groq |
| `azure/` | Provider para o Azure OpenAI Service |
| `amazon-bedrock/` | Provider para modelos via Amazon Bedrock |

## Canais de Mensagem

Conectam o Kairos a plataformas de comunicação externas.

| Diretório | Descrição |
|---|---|
| `discord/` | Canal de mensagens via Discord |
| `telegram/` | Canal de mensagens via Telegram |
| `whatsapp/` | Canal de mensagens via WhatsApp |
| `slack/` | Canal de mensagens via Slack |
| `signal/` | Canal de mensagens via Signal |
| `matrix/` | Canal de mensagens via protocolo Matrix |
| `msteams/` | Canal de mensagens via Microsoft Teams |
| `imessage/` | Canal de mensagens via iMessage |

## Ferramentas e Utilitários

Expandem as capacidades do Kairos com funcionalidades auxiliares.

| Diretório | Descrição |
|---|---|
| `browser/` | Ferramenta de navegação e extração de conteúdo web |
| `diffs/` | Utilitário para geração e visualização de diffs |
| `memory-core/` | Módulo central de memória persistente entre sessões |
| `memory-lancedb/` | Backend de memória baseado em LanceDB (busca vetorial) |
| `document-extract/` | Extração de conteúdo de documentos (PDF, DOCX, etc.) |

## QA / Testes Internos

Extensões privadas usadas exclusivamente para validação interna. **Não são publicadas** no registro público de extensões.

| Diretório | Descrição |
|---|---|
| `qa-channel/` | Canal interno para cenários de QA automatizados |
| `qa-lab/` | Ambiente de laboratório para testes de integração |
| `qa-matrix/` | Matriz de cobertura e validação cruzada de plugins |
