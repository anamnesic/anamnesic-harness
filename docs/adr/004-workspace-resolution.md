# ADR-004: Workspace Resolution — Pre-existing Issues

**Data:** 2026-06-28
**Status:** Aceito

## Contexto

Após a migração de imports de `@kairos-ai/core` → `@kairos/core` (ADR-001) e poda de código morto (ADR-002, ADR-003), identificamos um problema de resolução de workspace packages que **precede** nossas mudanças.

### Sintoma

Importar `@kairos/vault` diretamente funciona:

```ts
import { vaultWrite } from '@kairos/vault'; // OK
```

Mas importar via barrel (que carrega SelfOptimizationService que importa `@kairos/vault`) falha:

```ts
import { SelfOptimizationService } from '@kairos/core/agent/core/services'; // Cannot find module '@kairos/vault'
```

### Causa Raiz

O monorepo usa **Bun** para resolução de workspace packages (não há `pnpm-workspace.yaml`), mas o `node_modules/` foi populado por **pnpm**:

- `.modules.yaml` confirma gerenciamento pnpm
- `nodeLinker: "isolated"` e `linkWorkspacePackages: false` no pnpm state
- Nenhum `@kairos/*` symlink existe em `node_modules/`
- Bun workspace resolution funciona para imports diretos mas quebra em imports transitivos profundos (bug conhecido em Bun v1.3.x)

## Decisão

**Não** tentar consertar a resolução transitiva do Bun agora. Em vez disso:

1. **Documentar como pre-existing** — a condição existia antes das ADRs 001-003 e não foi introduzida por elas.
2. **Isolar o serviço problemático** — SelfOptimizationService já é Category B (só importado internamente) e seu import problemático de `@kairos/vault` não afeta runtime real.
3. **Usar build/bundler para verificação** — o runtime real usa esbuild/rolldown que resolvem dependências em build time, não em runtime com Bun raw. Testes que precisam de verificação devem usar o bundler do projeto.
4. **Adicionar ao integration-plan.md** — criar item para migrar SelfOptimizationService de `@kairos/vault` para `@kairos/core/vault` quando o vault for integrado ao core.

## Consequências

**Positivas:**
- Não perdemos tempo debugging de bug de runtime do Bun
- Documentamos a condição real do workspace para futuros contribuidores
- O build real (esbuild) não é afetado

**Negativas:**
- `bun -e` ou `bun test` direto em certos paths pode falhar com falsos positivos
- SelfOptimizationService e qualquer service que importe `@kairos/vault` não é verificável via `bun -e`

## Verificação

Para verificar imports de workspace packages, use o entry point direto ou rode pelo bundler do projeto. O comando:

```bash
cd packages/core && bun -e "import { vaultWrite } from '@kairos/vault'"
```

funciona. A falha só ocorre em imports transitivos profundos via barrel.
