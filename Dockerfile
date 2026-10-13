# ---------- Estágio 1: dependências de produção ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Copia só os manifests primeiro para aproveitar o cache de camadas
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Estágio 2: runtime ----------
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Usuário sem privilégios (já existe na imagem oficial do Node)
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/health | grep -q '"status":"UP"' || exit 1

CMD ["node", "src/server.js"]
