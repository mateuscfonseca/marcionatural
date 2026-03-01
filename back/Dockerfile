FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Define ambiente de produção
ENV NODE_ENV=production

# Cria diretórios para dados persistentes
RUN mkdir -p /app/data /app/uploads/images

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
