# Instruções do Workspace — Kairos

## Ferramentas preferidas

### Resolver problemas de código → use o opencode CLI

- **Binário:** `C:\Users\luann\AppData\Roaming\npm\opencode.cmd` (já disponível no `PATH` via `cmd`).
- **Invocação a partir do PowerShell** (sempre via `cmd /c` para garantir resolução do `.cmd`):

  ```powershell
  cmd /c "opencode run --dangerously-skip-permissions -m <provider/model> '<prompt>'"
  ```

- Use sempre `--dangerously-skip-permissions` para execução **não-interativa** (caso contrário o agente trava aguardando input).
- **Listar modelos disponíveis:**

  ```powershell
  cmd /c "opencode models"
  ```

### Regra de delegação

Quando o usuário pedir para **corrigir erros de build/compilação/lint** ou **resolver problemas em arquivos de código**, **delegue a correção ao opencode CLI** em vez de editar manualmente os arquivos — salvo instrução explícita em contrário do usuário.

Fluxo padrão:

1. Identificar o(s) arquivo(s) e a natureza do erro (build, lint, type-check, teste).
2. Montar um prompt objetivo descrevendo o problema e o resultado esperado.
3. Executar `cmd /c "opencode run --dangerously-skip-permissions -m <provider/model> '<prompt>'"`.
4. **Verificar o resultado** rodando o comando relevante (`pnpm build`, `pnpm lint`, `pnpm test`, `tsc --noEmit`, etc.) **antes de declarar a tarefa concluída**.
5. Só reportar conclusão depois que a verificação passar.

### Quando NÃO delegar

- O usuário pede explicitamente para você editar manualmente.
- Mudança trivial de configuração / texto / documentação que não envolve lógica de código.
- Tarefas de exploração, leitura ou explicação (não há "fix" a delegar).
