#!/bin/bash
###############################################################################
# Script: run-e2e-tests.sh
# Descrição: Automatiza execução completa de testes E2E com reports
# Uso: ./scripts/run-e2e-tests.sh [opções]
###############################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK_DIR="$PROJECT_ROOT/back"
APP_DIR="$PROJECT_ROOT/app"
TEST_DB_PATH="$BACK_DIR/data/test.db"

# Flags
HEADED=false
DEBUG=false
UI_MODE=false
NO_OPEN=false
KEEP_RUNNING=false
CLEAN=true
SPEC_TEST=""
DOCKER_MODE=false

# PIDs dos processos em background
BACKEND_PID=""
FRONTEND_PID=""

###############################################################################
# Funções de Log
###############################################################################

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}📍 $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

###############################################################################
# Funções de Limpeza
###############################################################################

cleanup() {
    log_step "Limpando processos..."
    
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        log_info "Parando backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
        log_success "Backend parado"
    fi
    
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        log_info "Parando frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
        log_success "Frontend parado"
    fi
    
    # Para containers Docker se estiver no modo Docker
    if [ "$DOCKER_MODE" = true ]; then
        log_info "Parando containers Docker..."
        cd "$PROJECT_ROOT"
        docker-compose down > /dev/null 2>&1 || true
        log_success "Containers parados"
    fi
    
    # Limpa arquivos WAL do SQLite
    rm -f "$TEST_DB_PATH-wal" "$TEST_DB_PATH-shm" 2>/dev/null || true
}

clean_previous_results() {
    log_info "Limpando resultados anteriores..."
    cd "$APP_DIR"
    rm -rf e2e/test-results
    rm -rf e2e/screenshots/success/*.png 2>/dev/null || true
    rm -rf e2e/screenshots/error/*.png 2>/dev/null || true
    rm -rf playwright-report
    log_success "Resultados limpos"
}

###############################################################################
# Trap para cleanup ao sair
###############################################################################

trap cleanup EXIT
trap 'log_error "Script interrompido"; exit 1' INT TERM

###############################################################################
# Parse de Argumentos
###############################################################################

show_help() {
    cat << EOF
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${GREEN}🧪 MARCIO NATURAL - Testes E2E${NC}
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${YELLOW}USO:${NC}
    ./scripts/run-e2e-tests.sh [opções]

${YELLOW}OPÇÕES:${NC}
    ${GREEN}--headed${NC}      Roda testes com browser visível
    ${GREEN}--debug${NC}       Modo debug passo-a-passo
    ${GREEN}--ui${NC}          Interface interativa do Playwright
    ${GREEN}--no-open${NC}     Não abre relatório automaticamente
    ${GREEN}--keep-running${NC} Mantém serviços rodando após testes
    ${GREEN}--no-clean${NC}    Não limpa resultados anteriores
    ${GREEN}--spec${NC}        Roda apenas um arquivo específico
                    Ex: --spec=tests/auth.spec.ts
    ${GREEN}--help${NC}        Mostra esta ajuda

${YELLOW}EXEMPLOS:${NC}
    # Rodar todos os testes (headless) - Vite dev server (porta 5173)
    ./scripts/run-e2e-tests.sh

    # Rodar com Docker (produção, porta 9000)
    ./scripts/run-e2e-tests.sh --docker

    # Rodar com browser visível
    ./scripts/run-e2e-tests.sh --headed

    # Rodar apenas testes de autenticação
    ./scripts/run-e2e-tests.sh --spec=tests/auth.spec.ts

    # Modo debug interativo
    ./scripts/run-e2e-tests.sh --debug

    # Manter serviços rodando após testes (desenvolvimento)
    ./scripts/run-e2e-tests.sh --keep-running

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADED=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --ui)
            UI_MODE=true
            shift
            ;;
        --no-open)
            NO_OPEN=true
            shift
            ;;
        --keep-running)
            KEEP_RUNNING=true
            shift
            ;;
        --no-clean)
            CLEAN=false
            shift
            ;;
        --spec=*)
            SPEC_TEST="${1#*=}"
            shift
            ;;
        --docker)
            DOCKER_MODE=true
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

###############################################################################
# Verificações Preliminares
###############################################################################

log_step "Verificando pré-requisitos"

# Verifica bun
if ! command -v bun &> /dev/null; then
    log_error "bun não encontrado. Instale em: https://bun.sh/"
    exit 1
fi
log_success "bun encontrado: $(bun --version)"

# Verifica node
if ! command -v node &> /dev/null; then
    log_error "node não encontrado"
    exit 1
fi
log_success "node encontrado: $(node --version)"

# Verifica se está na raiz do projeto
if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    log_error "docker-compose.yml não encontrado. Execute este script da raiz do projeto."
    exit 1
fi
log_success "Diretório do projeto confirmado"

###############################################################################
# Limpeza (opcional)
###############################################################################

if [ "$CLEAN" = true ]; then
    log_step "Limpando resultados anteriores"
    clean_previous_results
fi

###############################################################################
# Seed E2E
###############################################################################

log_step "Executando Seed E2E"

cd "$BACK_DIR"
log_info "DATABASE_PATH: $TEST_DB_PATH"

# Exporta DATABASE_PATH antes de rodar seed
# Seed vai usar dbProvider.getDb() que lê DATABASE_PATH
export DATABASE_PATH="$TEST_DB_PATH"
DATABASE_PATH="$DATABASE_PATH" bun run seed-e2e

if [ $? -eq 0 ]; then
    log_success "Seed E2E executado com sucesso"
else
    log_error "Falha ao executar seed E2E"
    exit 1
fi

###############################################################################
# Iniciar Backend
###############################################################################

log_step "Iniciando Backend"

cd "$BACK_DIR"
log_info "Iniciando backend em background..."
log_info "DATABASE_PATH: $TEST_DB_PATH"
log_info "NODE_ENV: test"
log_info "SKIP_DB_INIT: true"

# Exporta variáveis para o processo filho
# NODE_ENV=test e SKIP_DB_INIT=true previnem initDatabase()
# Seed E2E já criou schema + migrations + seeds
export DATABASE_PATH="$TEST_DB_PATH"
export NODE_ENV=test
export SKIP_DB_INIT=true

DATABASE_PATH="$DATABASE_PATH" NODE_ENV="$NODE_ENV" SKIP_DB_INIT="$SKIP_DB_INIT" bun run dev > "$PROJECT_ROOT/backend.log" 2>&1 &
BACKEND_PID=$!
log_info "Backend iniciado (PID: $BACKEND_PID)"

# Aguarda backend estar pronto
log_info "Aguardando backend estar pronto..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Backend pronto!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    log_error "Backend não ficou pronto em $MAX_ATTEMPTS segundos"
    log_error "Verifique o log: $PROJECT_ROOT/e2e/backend.log"
    exit 1
fi

###############################################################################
# Iniciar Frontend
###############################################################################

log_step "Iniciando Frontend"

cd "$APP_DIR"

if [ "$DOCKER_MODE" = true ]; then
    # Modo Docker - usa containers na porta 9000
    log_info "Iniciando containers Docker..."
    cd "$PROJECT_ROOT"
    docker-compose up -d
    log_info "Aguardando containers estarem prontos..."
    sleep 10
    
    # Verifica se frontend está pronto na porta 9000
    for i in {1..30}; do
        if curl -s http://localhost:9000 > /dev/null 2>&1; then
            log_success "Frontend Docker pronto!"
            break
        fi
        sleep 1
    done
    
    # Exporta BASE_URL para testes
    export BASE_URL="http://localhost:9000"
    log_info "BASE_URL: $BASE_URL"
else
    # Modo Desenvolvimento - usa Vite na porta 5173
    log_info "Iniciando frontend em background (Vite)..."
    bun run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    log_info "Frontend iniciado (PID: $FRONTEND_PID)"

    # Aguarda frontend estar pronto
    log_info "Aguardando frontend estar pronto..."
    MAX_ATTEMPTS=30
    ATTEMPT=0
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            log_success "Frontend pronto!"
            break
        fi
        ATTEMPT=$((ATTEMPT + 1))
        sleep 1
    done

    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        log_error "Frontend não ficou pronto em $MAX_ATTEMPTS segundos"
        log_error "Verifique o log: $PROJECT_ROOT/frontend.log"
        exit 1
    fi
    
    # Exporta BASE_URL para testes
    export BASE_URL="http://localhost:5173"
    log_info "BASE_URL: $BASE_URL"
fi

###############################################################################
# Executar Testes E2E
###############################################################################

log_step "Executando Testes E2E"

cd "$APP_DIR"

# Monta comando baseado nas flags
PLAYWRIGHT_CMD="bun playwright test"

if [ "$HEADED" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
    log_info "Mode: ${YELLOW}Headed (browser visível)${NC}"
fi

if [ "$DEBUG" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
    log_info "Mode: ${YELLOW}Debug${NC}"
fi

if [ "$UI_MODE" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --ui"
    log_info "Mode: ${YELLOW}UI Interativa${NC}"
fi

if [ -n "$SPEC_TEST" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $SPEC_TEST"
    log_info "Especifico: ${YELLOW}$SPEC_TEST${NC}"
fi

log_info "Comando: $PLAYWRIGHT_CMD"
echo ""

# Executa testes
eval $PLAYWRIGHT_CMD
TEST_EXIT_CODE=$?

###############################################################################
# Gerar Relatório
###############################################################################

log_step "Gerando Relatório"

cd "$PROJECT_ROOT"
log_info "Gerando relatório HTML..."
cd "$APP_DIR"
bun playwright show-report playwright-report > /dev/null 2>&1 &
REPORT_PID=$!
sleep 2

if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "Todos os testes passaram! ✅"
else
    log_warning "Alguns testes falharam ❌"
fi

###############################################################################
# Resumo Final
###############################################################################

log_step "Resumo da Execução"

echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC} ${GREEN}📊 RESULTADOS DOS TESTES E2E${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────────┤${NC}"

# Conta resultados
cd "$APP_DIR"
if [ -d "e2e/test-results" ]; then
    TOTAL_TESTS=$(find e2e/test-results -name "*.png" | wc -l | tr -d ' ')
    log_info "Screenshots gerados: $TOTAL_TESTS"
fi

if [ -d "e2e/screenshots/success" ]; then
    SUCCESS_SCREENS=$(find e2e/screenshots/success -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
    log_info "Screenshots de sucesso: $SUCCESS_SCREENS"
fi

if [ -d "e2e/screenshots/error" ]; then
    ERROR_SCREENS=$(find e2e/screenshots/error -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
    log_info "Screenshots de erro: $ERROR_SCREENS"
fi

if [ -d "e2e/test-results" ]; then
    VIDEO_COUNT=$(find e2e/test-results -name "*.webm" 2>/dev/null | wc -l | tr -d ' ')
    log_info "Vídeos gerados: $VIDEO_COUNT"
fi

echo -e "${CYAN}├─────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC} ${BLUE}📁 ARQUIVOS GERADOS${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC} Relatório HTML: ${MAGENTA}$APP_DIR/playwright-report/index.html${NC}"
echo -e "${CYAN}│${NC} Screenshots:    ${MAGENTA}$APP_DIR/e2e/screenshots/${NC}"
echo -e "${CYAN}│${NC} Test Results:   ${MAGENTA}$APP_DIR/e2e/test-results/${NC}"
echo -e "${CYAN}│${NC} Backend Log:    ${MAGENTA}$PROJECT_ROOT/backend.log${NC}"
echo -e "${CYAN}│${NC} Frontend Log:   ${MAGENTA}$PROJECT_ROOT/frontend.log${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""

###############################################################################
# Abrir Relatório (opcional)
###############################################################################

if [ "$NO_OPEN" = false ] && [ "$UI_MODE" = false ]; then
    log_info "Abrindo relatório no browser..."
    
    # Tenta abrir baseado no OS
    if command -v xdg-open &> /dev/null; then
        xdg-open "$APP_DIR/playwright-report/index.html" &
    elif command -v open &> /dev/null; then
        open "$APP_DIR/playwright-report/index.html" &
    elif command -v start &> /dev/null; then
        start "$APP_DIR/playwright-report/index.html" &
    else
        log_warning "Não foi possível abrir o browser automaticamente"
    fi
    
    log_info "Relatório disponível em: file://$APP_DIR/playwright-report/index.html"
fi

###############################################################################
# Manter Serviços Rodando (opcional)
###############################################################################

if [ "$KEEP_RUNNING" = true ]; then
    log_step "Serviços Mantidos Rodando"
    log_info "Backend:  http://localhost:3000 (PID: $BACKEND_PID)"
    log_info "Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
    echo ""
    log_info "Pressione CTRL+C para parar os serviços"
    
    # Aguarda interrupt
    wait
else
    log_step "Finalizando"
    log_success "Script concluído!"
    echo ""
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log_success "Todos os testes passaram! 🎉"
    else
        log_error "Alguns testes falharam. Verifique o relatório."
    fi
fi

exit $TEST_EXIT_CODE
