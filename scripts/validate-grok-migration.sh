#!/bin/bash

# ============================================================================
# Script de Validação da Migração Grok → GPT-4.1
# ============================================================================
# Executa testes unitários e de integração para validar a migração
# 
# Uso:
#   ./scripts/validate-grok-migration.sh
#
# Saída:
#   - Relatório de testes em stdout
#   - Arquivo de logs em ./reports/grok-migration-test.log
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="${PROJECT_ROOT}/reports"
LOG_FILE="${REPORTS_DIR}/grok-migration-test.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Validação da Migração: Grok → GPT-4.1                        ║${NC}"
echo -e "${BLUE}║  QA Validation Suite                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Criar diretório de reports
mkdir -p "$REPORTS_DIR"

# Inicializar log
echo "Validação iniciada em: $(date)" > "$LOG_FILE"
echo "" >> "$LOG_FILE"

# ============================================================================
# Função para executar testes
# ============================================================================
run_test() {
  local test_name=$1
  local test_file=$2
  
  echo -e "${YELLOW}→${NC} Executando: $test_name"
  echo "Teste: $test_name" >> "$LOG_FILE"
  echo "Arquivo: $test_file" >> "$LOG_FILE"
  echo "Timestamp: $(date)" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  
  if pnpm exec vitest run "$test_file" >> "$LOG_FILE" 2>&1; then
    echo -e "  ${GREEN}✓ PASSOU${NC}"
    return 0
  else
    echo -e "  ${RED}✗ FALHOU${NC}"
    return 1
  fi
}

# ============================================================================
# Verificação de dependências
# ============================================================================
echo -e "${BLUE}[1/5]${NC} Verificando dependências..."

if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}✗ pnpm não encontrado${NC}"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js não encontrado${NC}"
  exit 1
fi

echo -e "  ${GREEN}✓ pnpm encontrado${NC}"
echo -e "  ${GREEN}✓ Node.js encontrado${NC}"
echo ""

# ============================================================================
# Busca de referências Grok
# ============================================================================
echo -e "${BLUE}[2/5]${NC} Verificando se há referências a 'grok' na codebase..."

GROK_REFS=$(grep -r -i "grok-code-fast-1\|grok-code-fast\|grok-2\|grok-1" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  "${PROJECT_ROOT}/packages" 2>/dev/null || true)

if [ -z "$GROK_REFS" ]; then
  echo -e "  ${GREEN}✓ Nenhuma referência a 'grok-code-fast-1' encontrada${NC}"
else
  echo -e "  ${RED}✗ REFERÊNCIAS A GROK ENCONTRADAS:${NC}"
  echo "$GROK_REFS" | while read -r line; do
    echo "    $line"
    echo "    $line" >> "$LOG_FILE"
  done
fi
echo ""

# ============================================================================
# Teste unitário: Grok Migration
# ============================================================================
echo -e "${BLUE}[3/5]${NC} Testes Unitários - Validação de Configuração"

if run_test "grok-migration.test.ts" "packages/core/src/__tests__/grok-migration.test.ts"; then
  UNIT_RESULT=0
else
  UNIT_RESULT=1
fi
echo ""

# ============================================================================
# Teste de integração
# ============================================================================
echo -e "${BLUE}[4/5]${NC} Testes de Integração - Pipeline e Pipeline Service"

if run_test "grok-migration-integration.test.ts" "packages/core/src/__tests__/grok-migration-integration.test.ts"; then
  INTEGRATION_RESULT=0
else
  INTEGRATION_RESULT=1
fi
echo ""

# ============================================================================
# Verificação de arquivos críticos
# ============================================================================
echo -e "${BLUE}[5/5]${NC} Validação de Arquivos Críticos"

CRITICAL_FILES=(
  "packages/core/src/agent-config.ts"
  "packages/core/src/pipeline.ts"
)

CRITICAL_OK=1
for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "${PROJECT_ROOT}/$file" ]; then
    echo -e "  ${GREEN}✓ $file existe${NC}"
  else
    echo -e "  ${RED}✗ $file NÃO ENCONTRADO${NC}"
    CRITICAL_OK=0
  fi
done
echo ""

# ============================================================================
# Resumo
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}RESUMO DA VALIDAÇÃO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

TOTAL_PASS=0
TOTAL_TESTS=2

if [ "$UNIT_RESULT" -eq 0 ]; then
  echo -e "${GREEN}✓ Testes Unitários${NC} - PASSOU (grok-migration.test.ts)"
  ((TOTAL_PASS++))
else
  echo -e "${RED}✗ Testes Unitários${NC} - FALHOU"
fi

if [ "$INTEGRATION_RESULT" -eq 0 ]; then
  echo -e "${GREEN}✓ Testes Integração${NC} - PASSOU (grok-migration-integration.test.ts)"
  ((TOTAL_PASS++))
else
  echo -e "${RED}✗ Testes Integração${NC} - FALHOU"
fi

if [ "$GROK_REFS" = "" ]; then
  echo -e "${GREEN}✓ Code Scan${NC} - Nenhuma referência Grok encontrada"
else
  echo -e "${YELLOW}⚠ Code Scan${NC} - Referências Grok encontradas (veja acima)"
fi

if [ "$CRITICAL_OK" -eq 1 ]; then
  echo -e "${GREEN}✓ Arquivos Críticos${NC} - Todos presentes"
else
  echo -e "${RED}✗ Arquivos Críticos${NC} - Alguns não encontrados"
fi

echo ""
echo -e "${BLUE}Resultado: $TOTAL_PASS / $TOTAL_TESTS testes passaram${NC}"

# ============================================================================
# Relatório do Log
# ============================================================================
echo ""
echo -e "${YELLOW}Arquivo de log:${NC} $LOG_FILE"
echo "Tamanho do log: $(du -h "$LOG_FILE" | cut -f1)"
echo ""

# ============================================================================
# Status de Saída
# ============================================================================
if [ "$TOTAL_PASS" -eq "$TOTAL_TESTS" ] && [ "$GROK_REFS" = "" ] && [ "$CRITICAL_OK" -eq 1 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✓ VALIDAÇÃO CONCLUÍDA COM SUCESSO                            ║${NC}"
  echo -e "${GREEN}║  Migração Grok → GPT-4.1 validada e pronta para deploy       ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ✗ VALIDAÇÃO FALHOU                                            ║${NC}"
  echo -e "${RED}║  Revise os erros acima e os logs para detalhes               ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi
