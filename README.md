# ADMOSA — Plataforma de gestión segura de archivos

Prueba técnica para perfil senior. Plataforma web que permite la gestión segura de archivos por usuario, aplicando control de acceso por roles y áreas.

## Stack

- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: PostgreSQL 16
- **Frontend**: Angular 17+ (en directorio separado)
- **Autenticación**: Sesiones server-side con cookies httpOnly
- **Almacenamiento**: Filesystem local con nombres UUID (fuera del webroot)

## Inicio rápido

### Opción 1: Todo en Docker⭐

**Pre-requisito**: Docker Desktop instalado.

```bash
# Un solo comando levanta todo:
docker compose up --build

# Cuando veas "ADMOSA Backend listening on :3000" → todo listo.
# Backend:  http://localhost:3000
# Adminer:  http://localhost:8080  (user: admosa, pass: admosa, db: admosa_test)
```

Para detener: `docker compose down`
Para resetear todo (borra DB y archivos): `docker compose down -v`

El stack arranca en orden automáticamente:
1. **postgres** (healthcheck)
2. **db-init** (corre migraciones + seeds, sale al terminar)
3. **backend** (espera a que db-init complete con éxito)

### Opción 2: Desarrollo local sin Docker

Pre-requisitos: Node.js 20+ y Postgres corriendo.

```bash
docker compose up -d postgres   # solo Postgres en contenedor
cd backend
cp .env.example .env
pnpm install
pnpm run db:reset
pnpm run dev                    # backend con hot reload
```

### Usuarios de prueba

Todos comparten password: **`Admosa2025!`**

| Email | Rol | Área | Notas |
|---|---|---|---|
| `user@admosa.test` | Usuario | OPS | Solo ve sus propios archivos |
| `chief@admosa.test` | Jefe de área | OPS | Ve archivos de OPS; elimina solo los suyos |
| `manager@admosa.test` | Gerente | — | Gestiona OPS y FIN (no COMM) |
| `admin@admosa.test` | Administrador | — | Acceso total |

**Usuarios adicionales** para verificar aislamiento: `user2@`, `user3@`, `chief2@`, `user4@` (ver `src/db/seed.ts`).

## Arquitectura

### Decisiones clave

#### 1. Sesiones server-side, no JWT
Para una app web con frontend propio, las sesiones con cookie `httpOnly` son superiores a JWT en este escenario:
- **Logout real**: invalidamos en DB, no esperamos a que expire un token.
- **Mitigación de XSS**: la cookie `httpOnly` no es accesible desde JavaScript.
- **Mitigación de CSRF**: `SameSite=Strict` bloquea cross-origin por defecto.
- **Simplicidad**: no necesitamos rotación de refresh tokens.

#### 2. Servicio de permisos centralizado
Toda decisión de acceso pasa por `src/services/permissionService.ts`. Este servicio retorna un *scope* (`own`, `area`, `areas`, `all`, `none`) que el repositorio traduce a una cláusula `WHERE` en SQL. **Nunca filtramos en memoria** — esto evita bugs de seguridad y es eficiente.

#### 3. Almacenamiento físico aislado
- Los archivos viven en `backend/storage/` (fuera del webroot, jamás expuesto vía Express static).
- El nombre en disco es un UUID (`{uuid}.bin`), nunca el nombre original.
- El acceso siempre pasa por el controlador, que valida permisos antes de hacer stream.
- Defensa contra path traversal en `FileStorage.resolvePath()`.

#### 4. Modelo de datos
Ver `docs/ARCHITECTURE.md` para el diagrama ER completo y justificaciones. Puntos relevantes:
- **`area_management` (N:M)**: un Gerente puede gestionar múltiples áreas.
- **`files.area_id` desnormalizado**: los archivos pertenecen al área *donde se cargaron*, no a la actual del usuario. Esto protege la visibilidad histórica del Jefe si el dueño cambia de área.
- **Soft delete**: `files.is_deleted` preserva la integridad referencial del historial.

#### 5. Auditoría inmutable
Cada acción relevante se registra en `audit_log` con metadata JSONB. El log es fire-and-forget: un fallo de auditoría nunca rompe la operación principal (se reporta a stderr para monitoreo).

### Matriz de permisos

| Acción | Usuario | Jefe de área | Gerente | Administrador |
|---|---|---|---|---|
| Cargar archivo | Propios | Propios | Propios | Propios |
| Visualizar | Propios | Su área | Áreas gestionadas | Todos |
| Descargar | Propios | Su área | Áreas gestionadas | Todos |
| **Eliminar** | Propios | **Solo propios** ⚠️ | Áreas gestionadas | Todos |
| Ver historial | Propios | Su área | Áreas gestionadas | Todos |
| Admin usuarios | — | — | — | Sí |

⚠️ Asimetría intencional: el Jefe VE archivos de su área pero solo ELIMINA los suyos (literal del enunciado).

## Endpoints

### Auth (`/api/auth`)
- `POST /login` — `{ email, password }` → cookie de sesión
- `POST /logout` — invalida la sesión
- `GET  /me` — datos del usuario autenticado

### Files (`/api/files`)
- `GET    /` — lista archivos según rol
- `POST   /` — multipart `file`, crea archivo
- `GET    /:id/download` — descarga (si está en scope)
- `DELETE /:id` — elimina (si está en scope)

### Audit (`/api/audit`)
- `GET /?limit=&offset=` — historial scoped

### Admin (`/api/admin`) — solo ADMIN
- `GET    /users`
- `POST   /users`
- `PATCH  /users/:id`
- `GET    /areas`
- `GET    /roles`

## Seguridad

- **Helmet** para headers HTTP de seguridad.
- **CORS** estricto con allowlist de un solo origen.
- **bcrypt** (cost 12) para hash de passwords.
- **Rate limiting** en `/auth/login` (10 intentos / 15 min).
- **Validación de inputs** con Zod en todos los endpoints.
- **Timing-attack mitigation** en login (siempre comparamos un hash, exista o no el usuario).
- **No information leakage** en errores: "Credenciales inválidas" sin distinguir email/password incorrecto.
- **Sesiones server-side**: el logout invalida realmente la sesión.

## Estructura del proyecto

```
backend/
├── src/
│   ├── config/          env y conexión DB
│   ├── db/
│   │   ├── migrations/  scripts SQL versionados
│   │   ├── migrate.ts   runner de migraciones
│   │   └── seed.ts      datos de prueba
│   ├── middleware/      auth, error handling
│   ├── modules/         auth, files, audit, users (admin)
│   ├── services/        permissionService, fileStorage, auditService
│   ├── utils/           errores tipados, asyncHandler
│   └── server.ts
├── storage/             archivos físicos (gitignored)
├── .env.example
├── package.json
└── tsconfig.json
```

## Scripts pnpm

| Comando | Descripción |
|---|---|
| `pnpm run dev` | Servidor con hot reload |
| `pnpm run build` | Compila TS a `dist/` |
| `pnpm start` | Corre el bundle compilado |
| `pnpm run db:migrate` | Crea/recrea schema |
| `pnpm run db:seed` | Inserta usuarios y datos de prueba |
| `pnpm run db:reset` | Migrate + seed (limpia todo) |

## Próximos pasos (no incluidos por scope)

- Tests automatizados (Vitest/Jest)
- Rotación periódica de sesiones expiradas (cron)
- Cifrado en reposo de archivos sensibles
- Multi-tenancy si se requiere
