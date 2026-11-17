const assert = require("node:assert/strict")
const { existsSync, readFileSync, readdirSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

// Spec 007 T2: registro de avisos del congelador. El test comprueba el SQL de
// la migración, no una base de datos: la aplicación y validación en local es T3.
const migrationsDir = resolve(__dirname, "../../supabase/migrations")
const migrationPath = resolve(
  migrationsDir,
  "20261117000000_crear_avisos_elementos_cajon.sql",
)
const TABLE = "public.avisos_elementos_cajon"

function migrationSql() {
  assert.ok(existsSync(migrationPath), `falta la migración: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

test("RF-7: la migración crea la tabla de avisos con nombre y columnas en castellano", () => {
  const sql = migrationSql()
  assert.match(sql, new RegExp(`CREATE TABLE[\\s\\S]*?${TABLE.replace(".", "\\.")}`))
  // Identificador del elemento avisado y fecha del último aviso.
  assert.match(sql, /elemento_id\s+uuid/i)
  assert.match(sql, /avisado_en\s+timestamptz/i)
  // Sin anglicismos en los identificadores declarados.
  assert.doesNotMatch(sql, /\b(notified_at|item_id|alerts?_log|notice)\b/i)
})

test("RF-10: el aviso se borra en cascada cuando desaparece el elemento", () => {
  const sql = migrationSql()
  assert.match(
    sql,
    /elemento_id[\s\S]{0,200}REFERENCES\s+public\.elementos_cajon\s*\(\s*id\s*\)[\s\S]{0,80}ON DELETE CASCADE/i,
    "la clave foránea debe apuntar a elementos_cajon(id) con borrado en cascada",
  )
})

test("RF-7/RF-9: un elemento no puede tener dos registros de aviso", () => {
  const sql = migrationSql()
  const unico =
    /PRIMARY KEY\s*\(\s*elemento_id\s*\)/i.test(sql) ||
    /elemento_id[^,]*PRIMARY KEY/i.test(sql) ||
    /CREATE UNIQUE INDEX[\s\S]*?\(\s*elemento_id\s*\)/i.test(sql)
  assert.ok(unico, "elemento_id debe ser único (clave primaria o índice único)")
})

test("RF-2: la tabla no es accesible por anon ni authenticated", () => {
  const sql = migrationSql()
  assert.match(sql, new RegExp(`REVOKE ALL ON TABLE ${TABLE.replace(".", "\\.")}[^;]*FROM[^;]*PUBLIC`, "i"))
  assert.match(sql, new RegExp(`REVOKE ALL ON TABLE ${TABLE.replace(".", "\\.")}[^;]*FROM[^;]*anon`, "i"))
  assert.match(sql, new RegExp(`REVOKE ALL ON TABLE ${TABLE.replace(".", "\\.")}[^;]*FROM[^;]*authenticated`, "i"))
  // Ningún GRANT sobre la tabla puede alcanzar a anon ni a authenticated.
  const grants = sql.match(new RegExp(`GRANT[^;]*ON TABLE ${TABLE.replace(".", "\\.")}[^;]*;`, "gi")) ?? []
  assert.ok(grants.length > 0, "debe concederse acceso explícito a service_role")
  for (const grant of grants) {
    // Solo interesan los roles destinatarios: el nombre del esquema `public`
    // aparece en el identificador de la tabla y no es un rol.
    const destinatarios = grant.slice(grant.toUpperCase().lastIndexOf(" TO ") + 4)
    assert.doesNotMatch(destinatarios, /\b(anon|authenticated|public)\b/i, `grant demasiado amplio: ${grant}`)
    assert.match(destinatarios, /service_role/i)
  }
})

test("RF-2: la tabla queda con RLS habilitado y sin políticas permisivas", () => {
  const sql = migrationSql()
  assert.match(sql, new RegExp(`ALTER TABLE ${TABLE.replace(".", "\\.")} ENABLE ROW LEVEL SECURITY`, "i"))
  assert.doesNotMatch(sql, new RegExp(`CREATE POLICY[\\s\\S]*ON ${TABLE.replace(".", "\\.")}`, "i"))
})

test("la migración es posterior al singleton y no altera migraciones existentes", () => {
  const sql = migrationSql()
  const nombres = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
  const version = "20261117000000"
  assert.ok(
    nombres.indexOf("20261117000000_crear_avisos_elementos_cajon.sql") === nombres.length - 1,
    "debe ser la última migración",
  )
  assert.ok(version > "20261025100000", "debe ser posterior al singleton del congelador")
  // No toca objetos preexistentes del congelador ni la baseline.
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|ALTER TABLE public\.(congeladores|cajones_congelador|elementos_cajon)\b(?![\s\S]{0,40}ENABLE ROW)/i)
  assert.doesNotMatch(sql, /DROP POLICY[\s\S]*congeladores|DROP INDEX[\s\S]*congeladores_singleton/i)
})
