# Arquivo de teste para desenvolvimento local

# 1. Inicie o backend:
cd back && bun run dev

# 2. Em outro terminal, inicie o frontend:
cd app && bun run dev

# 3. Acesse http://localhost:5173

# Fluxo de teste sugerido:
# - Crie uma conta (Register)
# - Faça login
# - Adicione entradas em "Minhas Entradas"
#   - Alimentação limpa: +10 pontos
#   - Alimentação suja: -10 pontos
#   - Exercício (20-30 min): +5 pontos
#   - Tabaco: -5 pontos
# - Veja o leaderboard
# - Vote em entradas de outros usuários na tela "Itens"
# - Clique em usuários no leaderboard para ver suas entradas

# Testar com Docker:
# docker-compose up --build
# Acesse http://localhost
