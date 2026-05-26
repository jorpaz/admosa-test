# =====================================================================
# Stage 1: build — compila TypeScript a JavaScript
# =====================================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

# Copiar manifests primero para cachear `pnpm install` cuando no cambian
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile

# Copiar fuente y compilar
COPY src ./src
RUN pnpm run build

# Limpiar devDependencies para producción
RUN pnpm prune --prod

# =====================================================================
# Stage 2: runtime — imagen mínima, no-root, solo lo necesario
# =====================================================================
FROM node:22-alpine AS runtime

WORKDIR /app

# Crear usuario no-root para correr el proceso
RUN addgroup -S admosa && adduser -S admosa -G admosa

# Copiar solo lo compilado + node_modules de producción
COPY --from=builder --chown=admosa:admosa /app/node_modules ./node_modules
COPY --from=builder --chown=admosa:admosa /app/dist ./dist
COPY --from=builder --chown=admosa:admosa /app/package.json ./package.json

# Copiar también las migraciones SQL (son archivos, no se compilan)
COPY --from=builder --chown=admosa:admosa /app/dist/db/migrations ./dist/db/migrations

# Crear directorio de storage con permisos del usuario admosa
RUN mkdir -p /app/storage && chown admosa:admosa /app/storage

USER admosa

EXPOSE 3000

# Healthcheck para que docker compose sepa cuando está listo
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
