# Manual de usuario — ADMOSA

Plataforma web de gestión segura de archivos con control de acceso por **rol** y **área**.

## Acceso a la aplicación

| Entorno | URL |
|---------|-----|
| **Producción (frontend)** | https://ai-agent-builder-atom.web.app |
| **API (referencia)** | https://admosa-test.uversa.app |

## Inicio de sesión

1. Abre la URL del frontend.
2. Ingresa tu **correo electrónico** y **contraseña**.
3. Pulsa **Ingresar**.

Si las credenciales son incorrectas, verás un mensaje de error genérico (por seguridad no se indica si falló el email o la contraseña).

### Usuarios de demostración

Contraseña para todos: **`Admosa2025!`**

| Usuario | Email | Rol |
|---------|-------|-----|
| Ana Usuario | `user@admosa.test` | Usuario |
| Bruno Jefe | `chief@admosa.test` | Jefe de área |
| Carla Gerente | `manager@admosa.test` | Gerente |
| Diego Admin | `admin@admosa.test` | Administrador |

---

## Navegación

Tras iniciar sesión verás el menú lateral:

| Sección | Descripción |
|---------|-------------|
| **Archivos** | Listado, subida, descarga y eliminación de archivos según permisos |
| **Historial** | Auditoría de acciones (alcance según rol) |
| **Administración** | Solo visible para Administrador |

En la barra superior se muestra tu **nombre**, **área de trabajo** y **rol activo**.

---

## Archivos

### Qué puedes hacer según tu rol

| Acción | Usuario | Jefe | Gerente | Admin |
|--------|---------|------|---------|-------|
| Ver archivos | Solo los suyos | De su área | De áreas gestionadas | Todos |
| Descargar | Solo los suyos | De su área | De áreas gestionadas | Todos |
| Subir | Sí | Sí | Sí | Sí |
| Eliminar | Solo los suyos | **Solo los suyos** | De áreas gestionadas | Todos |

> El **Jefe de área** puede ver y descargar archivos de colegas de su área, pero solo eliminar los que él subió.

### Subir un archivo

1. Ve a **Archivos**.
2. Pulsa **Subir archivo**.
3. Selecciona el archivo en tu equipo.
4. Espera la confirmación.

### Descargar

Pulsa el icono de **descarga** en la fila del archivo.

### Eliminar

- Si tienes permiso: icono rojo **eliminar** activo.
- Si no tienes permiso: icono gris con tooltip explicando el motivo.

### Banner de permisos

Arriba de la tabla verás un texto que resume qué puedes hacer con tu rol actual.

---

## Historial de acciones

En **Historial** se registran operaciones como subida, descarga y eliminación de archivos.

### Filtros (Gerente, Jefe, Admin)

- **Usuario** — actividad de una persona concreta
- **Área** — eventos de archivos de un área (Gerente/Admin)
- **Tipo de acción** — subida, descarga, eliminación, etc.

### Alcance por rol

| Rol | Qué ve en el historial |
|-----|------------------------|
| Usuario | Solo sus propias acciones |
| Jefe | Acciones sobre archivos de su área |
| Gerente | Acciones sobre archivos de sus áreas gestionadas |
| Admin | Todo el historial del sistema |

---

## Administración (solo Admin)

Diego Admin (`admin@admosa.test`) puede:

### Crear usuarios

1. Ve a **Administración**.
2. Completa nombre, email, contraseña, rol y área.
3. **Usuario** y **Jefe de área** requieren área obligatoria.
4. **Administrador** no requiere área (acceso global).
5. Pulsa **Crear usuario**.

### Gestionar usuarios existentes

- Ver listado con rol, área y fecha de creación.
- Activar/desactivar con el interruptor **Activo/Inactivo**.

---

## Cerrar sesión

Pulsa el icono de **logout** (salir) en la barra superior derecha.

La sesión se invalida en el servidor de forma inmediata.

---

## Áreas del sistema

| Código | Nombre |
|--------|--------|
| OPS | Operaciones |
| FIN | Finanzas |
| COMM | Comercial |

---

## Escenarios de prueba sugeridos

1. **Aislamiento entre usuarios:** Ana sube un archivo → Eva (`user2@`) no lo ve.
2. **Jefe vs propietario:** Bruno ve archivos de Ana en OPS pero no puede eliminarlos.
3. **Gerente multi-área:** Carla ve OPS y FIN, no Comercial.
4. **Admin total:** Diego ve todo y accede a Administración.

---

## Soporte / incidencias

- Verifica que estés usando la URL oficial del frontend.
- Si la sesión expira, vuelve a iniciar sesión.
- Para demo técnica, consulta el [Manual técnico](./MANUAL_TECNICO.md).
