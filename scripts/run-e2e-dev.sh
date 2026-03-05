#!/bin/bash
###############################################################################
# Script: run-e2e-dev.sh
# Descrição: Roda testes E2E mantendo serviços rodando para desenvolvimento
# Uso: ./scripts/run-e2e-dev.sh [opções]
###############################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configurações
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK_DIR="$PROJECT_ROOT/back"
APP_DIR="$PROJECT_ROOT/app"
TEST_DB_PATH="$BACK_DIR/data/test.db"

# Flags
SPEC_TEST=""
CLEAN=true

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() {
    echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}📍 $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

cleanup() {
    log_step "Parando serviços..."
    pkill -f "bun run dev" 2>/dev/null || true
    rm -f "$TEST_DB_PATH-wal" "$TEST_DB_PATH-shm" 2>/dev/null || true
    log_success "Serviços parados"
}

trap cleanup EXIT
trap 'log_error "Script interrompido"; exit 1' INT TERM

show_help() {
    cat << EOF
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${GREEN}🧪 MARCIO NATURAL - Testes E2E (Dev Mode)${NC}
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${YELLOW}USO:${NC}
    ./scripts/run-e2e-dev.sh [opções]

${YELLOW}OPÇÕES:${NC}
    ${GREEN}--spec=${NC}         Roda apenas um arquivo específico
    ${GREEN}--no-clean${NC}      Não limpa resultados anteriores
    ${GREEN}--help${NC}          Mostra esta ajuda

${YELLOW}DESCRIÇÃO:${NC}
    Este script é ideal para desenvolvimento. Ele:
    - Inicia backend e frontend
    - Roda os testes
    - MANTÉM os serviços rodando após os testes
    
    Você pode então:
    - Fazer alterações no código
    - Rodar testes específicos rapidamente
    - Parar com CTRL+C quando terminar

${YELLOW}EXEMPLOS:${NC}
    # Rodar todos os testes e manter serviços
    ./scripts/run-e2e-dev.sh

    # Rodar apenas testes de autenticação
    ./scripts/run-e2e-dev.sh --spec=tests/auth.spec.ts

    # Não limpar resultados anteriores
    ./scripts/run-e2e-dev.sh --no-clean

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
EOF
}

# Parse de argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --spec=*)
            SPEC_TEST="${1#*=}"
            shift
            ;;
        --no-clean)
            CLEAN=false
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

log_step "Modo Desenvolvimento - Testes E2E"
log_info "Este script manterá os serviços rodando após os testes"

# Limpeza
if [ "$CLEAN" = true ]; then
    log_info "Limpando resultados anteriores..."
    cd "$APP_DIR"
    rm -rf e2e/test-results
    rm -rf e2e/screenshots/success/*.png 2>/dev/null || true
    rm -rf e2e/screenshots/error/*.png 2>/dev/null || true
fi

# Seed E2E
log_step "Executando Seed E2E"
cd "$BACK_DIR"
log_info "DATABASE_PATH: $TEST_DB_PATH"

# Exporta DATABASE_PATH antes de rodar seed
export DATABASE_PATH="$TEST_DB_PATH"
DATABASE_PATH="$DATABASE_PATH" bun run seed-e2e

# Iniciar Backend
log_step "Iniciando Backend"
cd "$BACK_DIR"
log_info "Backend: http://localhost:3000"
log_info "DATABASE_PATH: $TEST_DB_PATH"
log_info "NODE_ENV: test"
log_info "SKIP_DB_INIT: true"

# Exporta variáveis para o processo filho
export DATABASE_PATH="$TEST_DB_PATH"
export NODE_ENV=test
export SKIP_DB_INIT=true

DATABASE_PATH="$DATABASE_PATH" NODE_ENV="$NODE_ENV" SKIP_DB_INIT="$SKIP_DB_INIT" bun run dev > "$PROJECT_ROOT/e2e/backend.log" 2>&1 &
BACKEND_PID=$!
log_info "Backend PID: $BACKEND_PID"

# Aguarda backend
sleep 5
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Backend pronto!"
        break
    fi
    sleep 1
done

# Iniciar Frontend
log_step "Iniciando Frontend"
cd "$APP_DIR"
log_info "Frontend: http://localhost:5173"
bun run dev > "$PROJECT_ROOT/e2e/frontend.log" 2>&1 &
FRONTEND_PID=$!
log_info "Frontend PID: $FRONTEND_PID"

# Aguarda frontend
sleep 5
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        log_success "Frontend pronto!"
        break
    fi
    sleep 1
done

# Rodar testes
log_step "Rodando Testes"
cd "$APP_DIR"

if [ -n "$SPEC_TEST" ]; then
    log_info "Teste específico: $SPEC_TEST"
    bun playwright test "$SPEC_TEST"
else
    bun playwright test
fi

TEST_EXIT_CODE=$?

# Resumo
log_step "Testes Concluídos"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "Todos os testes passaram! ✅"
else
    log_warning "Alguns testes falharam ❌"
fi

echo ""
log_info "Relatório: file://$APP_DIR/playwright-report/index.html"

# Manter serviços rodando
log_step "Serviços Rodando"
echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC} ${GREEN}🔧 SERVIÇOS DE DESENVOLVIMENTO${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC} Backend:  ${BLUE}http://localhost:3000${NC} (PID: $BACKEND_PID)"
echo -e "${CYAN}│${NC} Frontend: ${BLUE}http://localhost:5173${NC} (PID: $FRONTEND_PID)"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC} ${YELLOW}💡 DICA:${NC}"
echo -e "${CYAN}│${NC} - Faça alterações no código e rode testes novamente"
echo -e "${CYAN}│${NC} - Use --spec para rodar testes específicos"
echo -e "${CYAN}│${NC} - Pressione CTRL+C para parar os serviços"
echo -e "${CYAN}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Mantém rodando
wait
