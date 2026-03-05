#!/bin/bash
###############################################################################
# Script: run-e2e-ci.sh
# Descrição: Roda testes E2E em modo CI/CD (headless, sem abrir relatório)
# Uso: ./scripts/run-e2e-ci.sh
###############################################################################

set -e
set -o pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK_DIR="$PROJECT_ROOT/back"
APP_DIR="$PROJECT_ROOT/app"
TEST_DB_PATH="$BACK_DIR/data/test.db"

# CI Mode flags
export CI=true
export PLAYWRIGHT_BROWSERS_PATH=/tmp/browsers

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📍 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

cleanup() {
    pkill -f "bun run dev" 2>/dev/null || true
    rm -f "$TEST_DB_PATH-wal" "$TEST_DB_PATH-shm" 2>/dev/null || true
}

trap cleanup EXIT

log_step "CI/CD Mode - Testes E2E"
log_info "Headless: true"
log_info "Workers: 1"
log_info "Retries: 2"

# Limpa resultados
log_info "Limpando resultados anteriores..."
cd "$APP_DIR"
rm -rf test-results
rm -rf playwright-report

# Seed E2E
log_step "Executando Seed E2E"
cd "$BACK_DIR"
DATABASE_PATH="$TEST_DB_PATH" bun run seed-e2e

# Iniciar Backend
log_step "Iniciando Backend"
cd "$BACK_DIR"
DATABASE_PATH="$TEST_DB_PATH" bun run dev > /dev/null 2>&1 &
BACKEND_PID=$!

# Aguarda backend
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Backend pronto"
        break
    fi
    sleep 1
done

# Iniciar Frontend
log_step "Iniciando Frontend"
cd "$APP_DIR"
bun run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

# Aguarda frontend
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        log_success "Frontend pronto"
        break
    fi
    sleep 1
done

# Rodar testes
log_step "Rodando Testes E2E"
cd "$APP_DIR"

bun playwright test \
    --reporter=list,junit \
    --workers=1 \
    --retries=2

TEST_EXIT_CODE=$?

# Gerar relatório JUnit para CI
log_step "Gerando Relatórios"
bun playwright show-report playwright-report > /dev/null 2>&1 || true

# Resumo
log_step "Resumo"
echo ""
echo -e "${BLUE}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│${NC} ${GREEN}📊 CI/CD TEST RESULTS${NC}"
echo -e "${BLUE}├─────────────────────────────────────────────────────────────────┤${NC}"

if [ -d "test-results" ]; then
    SCREENSHOTS=$(find test-results -name "*.png" | wc -l | tr -d ' ')
    log_info "Screenshots: $SCREENSHOTS"
    
    VIDEOS=$(find test-results -name "*.webm" | wc -l | tr -d ' ')
    log_info "Videos: $VIDEOS"
fi

echo -e "${BLUE}├─────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${BLUE}│${NC} Report: ${APP_DIR}/playwright-report"
echo -e "${BLUE}│${NC} JUnit:  ${APP_DIR}/junit.xml"
echo -e "${BLUE}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "All tests passed!"
else
    log_error "Some tests failed"
fi

exit $TEST_EXIT_CODE
