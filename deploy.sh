#!/bin/bash

# ===========================================
# Marcio Natural - Script de Deploy
# ===========================================
# Uso: ./deploy.sh [deploy|restart|stop|logs|status]
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOY_DIR="$HOME/deploys/marcionatural"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCESSO]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[ATENÇÃO]${NC} $1"; }
log_error() { echo -e "${RED}[ERRO]${NC} $1"; }

deploy() {
    log_info "Iniciando deploy..."
    
    cd "$SCRIPT_DIR"
    git pull
    
    mkdir -p "$DEPLOY_DIR"
    
    log_info "Sincronizando arquivos..."
    rsync -avz \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.qwen' \
        --exclude='*.log' \
        "$SCRIPT_DIR/" "$DEPLOY_DIR/"
    
    log_info "Build e deploy..."
    cd "$DEPLOY_DIR"
    
    if [ ! -f ".env" ]; then
        log_warning ".env não encontrado!"
        log_info "Copie .env.example para .env e configure:"
        echo "  cp .env.example .env && nano .env"
        exit 1
    fi
    
    log_info "Build do frontend (com containers antigos rodando)..."
    sudo docker compose build --no-cache frontend

    log_info "Build do backend (com containers antigos rodando)..."
    sudo docker compose build --no-cache backend

    log_info "Subindo serviços com novas imagens..."
    sudo docker compose up -d

    log_info "Verificando status dos containers..."
    sudo docker compose ps
    
    log_success "Deploy concluído!"
    log_info "Para ver logs: ./deploy.sh logs"
}

restart() {
    cd "$DEPLOY_DIR" && sudo docker compose restart
    log_success "Containers reiniciados!"
}

stop() {
    cd "$DEPLOY_DIR" && sudo docker compose down
    log_success "Containers parados!"
}

logs() {
    cd "$DEPLOY_DIR" && sudo docker compose logs -f
}

status() {
    cd "$DEPLOY_DIR" && sudo docker compose ps
}

case "${1:-}" in
    deploy) deploy ;;
    restart) restart ;;
    stop) stop ;;
    logs) logs ;;
    status) status ;;
    *)
        echo "Uso: ./deploy.sh [deploy|restart|stop|logs|status]"
        echo ""
        echo "  deploy   - Deploy completo"
        echo "  restart  - Reinicia containers"
        echo "  stop     - Para containers"
        echo "  logs     - Logs em tempo real"
        echo "  status   - Status dos containers"
        ;;
esac
