import bcrypt from 'bcrypt';
import { pool, withTransaction } from '../config/db';

// Password único para todos los usuarios de prueba.
// En la entrega real se documenta en el README.
const TEST_PASSWORD = 'Admosa2025!';
const BCRYPT_ROUNDS = 12;

async function seed() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

  await withTransaction(async (c) => {
    // Limpiar en orden inverso de dependencias
    await c.query('TRUNCATE audit_log, sessions, files, area_management, users, areas, roles RESTART IDENTITY CASCADE');

    // -------- ROLES --------
    const roles = [
      { code: 'USER',    name: 'Usuario estándar', description: 'Gestiona únicamente sus propios archivos' },
      { code: 'CHIEF',   name: 'Jefe de área',     description: 'Visualiza archivos de su área; elimina solo los propios' },
      { code: 'MANAGER', name: 'Gerente',          description: 'Gestiona archivos de las áreas bajo su gestión' },
      { code: 'ADMIN',   name: 'Administrador',    description: 'Acceso total al sistema' },
    ];
    const roleIds: Record<string, string> = {};
    for (const r of roles) {
      const { rows } = await c.query(
        'INSERT INTO roles (code, name, description) VALUES ($1, $2, $3) RETURNING id',
        [r.code, r.name, r.description]
      );
      roleIds[r.code] = rows[0].id;
    }

    // -------- AREAS --------
    const areas = [
      { code: 'OPS',     name: 'Operaciones' },
      { code: 'FIN',     name: 'Finanzas' },
      { code: 'COMM',    name: 'Comercial' },
    ];
    const areaIds: Record<string, string> = {};
    for (const a of areas) {
      const { rows } = await c.query(
        'INSERT INTO areas (code, name) VALUES ($1, $2) RETURNING id',
        [a.code, a.name]
      );
      areaIds[a.code] = rows[0].id;
    }

    // -------- USERS (los 4 de prueba + algunos extras para validar scopes) --------
    const users = [
      // === Los 4 obligatorios del enunciado ===
      { email: 'user@admosa.test',    full_name: 'Ana Usuario',       role: 'USER',    area: 'OPS'  },
      { email: 'chief@admosa.test',   full_name: 'Bruno Jefe',        role: 'CHIEF',   area: 'OPS'  },
      { email: 'manager@admosa.test', full_name: 'Carla Gerente',     role: 'MANAGER', area: null   },
      { email: 'admin@admosa.test',   full_name: 'Diego Admin',       role: 'ADMIN',   area: null   },

      // === Usuarios adicionales para probar aislamiento entre áreas ===
      { email: 'user2@admosa.test',   full_name: 'Eva Usuario',       role: 'USER',    area: 'OPS'  },
      { email: 'user3@admosa.test',   full_name: 'Felipe Usuario',    role: 'USER',    area: 'FIN'  },
      { email: 'chief2@admosa.test',  full_name: 'Gabriela Jefe FIN', role: 'CHIEF',   area: 'FIN'  },
      { email: 'user4@admosa.test',   full_name: 'Hugo Usuario',      role: 'USER',    area: 'COMM' },
    ];

    const userIds: Record<string, string> = {};
    for (const u of users) {
      const { rows } = await c.query(
        `INSERT INTO users (email, password_hash, full_name, role_id, area_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [u.email, passwordHash, u.full_name, roleIds[u.role], u.area ? areaIds[u.area] : null]
      );
      userIds[u.email] = rows[0].id;
    }

    // -------- AREA MANAGEMENT --------
    // Carla (MANAGER) gestiona OPS y FIN. COMM queda sin gerente para probar
    // que el gerente NO ve archivos de áreas que no gestiona.
    const carlaMgmt = [
      { manager: 'manager@admosa.test', area: 'OPS' },
      { manager: 'manager@admosa.test', area: 'FIN' },
    ];
    for (const m of carlaMgmt) {
      await c.query(
        'INSERT INTO area_management (manager_id, area_id) VALUES ($1, $2)',
        [userIds[m.manager], areaIds[m.area]]
      );
    }

    console.log('✓ Seed complete');
    console.log('');
    console.log('Usuarios de prueba (password para todos: Admosa2025!):');
    console.log('  - user@admosa.test    → USER    (área OPS)');
    console.log('  - chief@admosa.test   → CHIEF   (área OPS)');
    console.log('  - manager@admosa.test → MANAGER (gestiona OPS, FIN)');
    console.log('  - admin@admosa.test   → ADMIN');
    console.log('');
    console.log('Usuarios extra para pruebas de aislamiento:');
    console.log('  - user2@admosa.test   → USER (OPS)  — mismo área que user@');
    console.log('  - user3@admosa.test   → USER (FIN)  — área distinta');
    console.log('  - chief2@admosa.test  → CHIEF (FIN) — jefe de otra área');
    console.log('  - user4@admosa.test   → USER (COMM) — área sin gerente asignado');
  });

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
