# Diagrama entidad-relación — ADMOSA

Base de datos: **PostgreSQL 16**  
Schema: `backend/src/db/migrations/001_initial_schema.sql`

## Diagrama ER (Mermaid)

```mermaid
erDiagram
  roles ||--o{ users : "asigna rol"
  areas ||--o{ users : "area personal (opcional)"
  users ||--o{ area_management : "manager_id"
  areas ||--o{ area_management : "area_id"
  users ||--o{ files : "owner_id"
  areas ||--o{ files : "area_id al cargar"
  users ||--o{ files : "deleted_by"
  users ||--o{ audit_log : "user_id"
  files ||--o{ audit_log : "file_id"
  users ||--o{ sessions : "user_id"

  roles {
    uuid id PK "gen_random_uuid()"
    varchar code UK "USER, CHIEF, MANAGER, ADMIN"
    varchar name
    text description
    timestamptz created_at
  }

  areas {
    uuid id PK
    varchar code UK "OPS, FIN, COMM"
    varchar name
    timestamptz created_at
  }

  users {
    uuid id PK
    varchar email UK
    varchar password_hash "bcrypt"
    varchar full_name
    uuid role_id FK "NOT NULL"
    uuid area_id FK "nullable"
    boolean is_active "default true"
    timestamptz created_at
    timestamptz updated_at
  }

  area_management {
    uuid manager_id PK_FK "users.id"
    uuid area_id PK_FK "areas.id"
    timestamptz assigned_at
  }

  files {
    uuid id PK
    varchar original_name "nombre visible"
    varchar storage_name UK "UUID.bin en disco"
    varchar mime_type
    bigint size_bytes
    uuid owner_id FK
    uuid area_id FK "desnormalizado"
    timestamptz uploaded_at
    boolean is_deleted "soft delete"
    timestamptz deleted_at
    uuid deleted_by FK
  }

  audit_log {
    uuid id PK
    uuid user_id FK
    uuid file_id FK "nullable"
    varchar action "FILE_UPLOAD, etc."
    jsonb metadata
    inet ip_address
    timestamptz occurred_at
  }

  sessions {
    uuid id PK
    uuid user_id FK
    timestamptz expires_at
    timestamptz created_at
    inet ip_address
    text user_agent
  }
```

## Relaciones clave

| Relación | Cardinalidad | Notas |
|----------|--------------|-------|
| roles → users | 1:N | Cada usuario tiene un rol |
| areas → users | 1:N | Área personal opcional (Gerente/Admin suelen no tener) |
| users ↔ areas (area_management) | N:M | Gerentes y áreas que gestionan |
| users → files | 1:N | Propietario del archivo |
| areas → files | 1:N | Área donde se subió el archivo |
| users → audit_log | 1:N | Quién ejecutó la acción |
| files → audit_log | 1:N | Archivo afectado (si aplica) |
| users → sessions | 1:N | Sesiones activas/históricas |

## Índices principales

| Tabla | Índice | Propósito |
|-------|--------|-----------|
| users | email | Login |
| files | owner_id, area_id (parcial `is_deleted=false`) | Listados por rol |
| audit_log | user_id, file_id, occurred_at | Historial filtrado |
| sessions | user_id, expires_at | Validación de sesión |

## Acciones de auditoría registradas

| Código | Descripción |
|--------|-------------|
| `FILE_UPLOAD` | Archivo subido |
| `FILE_DOWNLOAD` | Descarga |
| `FILE_DELETE` | Eliminación |
| `FILE_VIEW_LIST` | Listado de archivos |
| `FILE_ACCESS_DENIED` | Intento denegado |
| `LOGIN_SUCCESS` / `LOGIN_FAILURE` / `LOGOUT` | Auth (solo Admin ve login en historial) |
| `USER_CREATE` / `USER_UPDATE` | Admin |

## Vista lógica por rol (no es tabla)

Los permisos no se modelan en tablas adicionales; se calculan en aplicación (`permissionService.ts`) a partir de:

- `users.role_id`
- `users.area_id`
- `area_management` (para MANAGER)
