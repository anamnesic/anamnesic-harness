# apps/shared

Contém o kit Swift compartilhado entre as aplicações iOS e macOS do kairos. Todo o código aqui é agnóstico à plataforma de destino final (iOS ≥ 18, macOS ≥ 15) e é consumido como dependência local pelos apps nativos.

## Estrutura

| Caminho | Descrição |
|---|---|
| `OpenClawKit/` | Swift Package (`kairosKit`) com os três produtos distribuídos para iOS e macOS |
| `OpenClawKit/Package.swift` | Manifesto do pacote Swift (swift-tools-version 6.2) |
| `OpenClawKit/Sources/` | Código-fonte dos três targets do pacote |
| `OpenClawKit/Tests/` | Testes unitários do pacote (`kairosKitTests`) |
| `OpenClawKit/Tools/` | Ferramenta auxiliar `CanvasA2UI` (bundle JS para injeção em WebView) |

## Produtos do pacote

| Produto Swift | Target | Descrição |
|---|---|---|
| `kairosProtocol` | `Sources/OpenClawProtocol` | Modelos de gateway (GatewayModels), helpers de codificação e tipos AnyCodable compartilhados |
| `kairosKit` | `Sources/OpenClawKit` | Implementação central: canal de gateway, sessão de nó, TLS pinning, comandos de dispositivo (câmera, localização, calendário, contatos etc.) e autenticação |
| `kairosChatUI` | `Sources/OpenClawChatUI` | Componentes SwiftUI de chat (ChatView, ChatViewModel, compositor, renderizador de markdown e temas) |

## Dependências externas

- [`ElevenLabsKit`](https://github.com/steipete/ElevenLabsKit) `0.1.1` — síntese de voz (TTS)
- [`textual`](https://github.com/gonzalezreal/textual) `0.3.1` — renderização de markdown em SwiftUI (iOS e macOS)
