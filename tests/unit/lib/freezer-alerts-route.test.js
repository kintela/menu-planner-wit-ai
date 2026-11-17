const test = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

// Spec 007 T6: comprobaciones estáticas de que la ruta es un adaptador fino.
// El comportamiento se prueba en los módulos de dominio y de operaciones; en
// ejecución se demuestra en T8.
const ruta = readFileSync(resolve(__dirname, "../../../app/api/cron/freezer-alerts/route.ts"), "utf8")
const sinComentarios = ruta.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")

test("RF-12: la ruta no contiene direcciones de correo ni el fallback antiguo de destinatarios", () => {
  assert.doesNotMatch(sinComentarios, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
  assert.doesNotMatch(ruta, /DEFAULT_RECIPIENTS/)
})

test("la ruta es un adaptador fino: delega en los módulos de lib/freezer y es corta", () => {
  assert.match(ruta, /ejecutarAlertas/)
  assert.match(ruta, /leerConfiguracionAlertas/)
  assert.match(ruta, /decidirAutorizacion/)
  // El tope acota el pegamento de Supabase y SMTP (consultas, reclamo atómico y
  // liberación), no la lógica: esa está fuera y se comprueba justo debajo. La
  // ruta original tenía 413 líneas con todo mezclado.
  assert.ok(ruta.split("\n").length <= 200, `la ruta tiene ${ruta.split("\n").length} líneas`)
  // La lógica de presentación y de decisión ya no vive en la ruta.
  assert.doesNotMatch(ruta, /buildEmailContent|escapeHtml|formatHumanDate|<table|<tr>/)
})

test("se conserva el contrato de la ruta: GET y POST, runtime nodejs y respuesta dinámica", () => {
  assert.match(ruta, /export async function GET/)
  assert.match(ruta, /export async function POST/)
  assert.match(ruta, /export const runtime = "nodejs"/)
  assert.match(ruta, /export const dynamic = "force-dynamic"/)
  assert.match(ruta, /dryRun/)
  assert.match(ruta, /testEmail/)
})

test("RF-14: los fallos se registran solo con un código, nunca con el error completo ni su mensaje", () => {
  assert.doesNotMatch(sinComentarios, /console\.\w+\([^)]*\b(error|err|e)\s*\)/)
  assert.doesNotMatch(sinComentarios, /console\.\w+\([^)]*\.message/)
  assert.doesNotMatch(sinComentarios, /console\.\w+\([^)]*(password|secret|smtp)/i)
})

test("la clave de servicio de Supabase se usa solo en servidor y nunca con prefijo público", () => {
  assert.match(ruta, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(ruta, /NEXT_PUBLIC_[A-Z_]*SERVICE/)
})

test("el registro de avisos se escribe con upsert y se descarta con borrado por identificador", () => {
  assert.match(ruta, /avisos_elementos_cajon/)
  assert.match(ruta, /\.upsert\(/)
  assert.match(ruta, /\.delete\(\)/)
})

test("la consulta ya no trae el propietario del congelador", () => {
  assert.doesNotMatch(ruta, /usuario_id/)
})

// ---------- T7: congelador único y reclamo atómico de avisos ----------

test("RF-5: el congelador único se resuelve y un resultado ambiguo falla en lugar de elegir uno", () => {
  assert.match(ruta, /from\("congeladores"\)/)
  assert.match(ruta, /\.limit\(2\)/)
  assert.match(ruta, /CONGELADOR_AMBIGUO/)
})

test("RF-5: los elementos se consultan limitados a los cajones del congelador único", () => {
  assert.match(ruta, /cajones_congelador!inner/)
  assert.match(ruta, /\.eq\("cajones_congelador\.congelador_id",\s*congeladorId\)/)
})

test("concurrencia: los elementos nuevos se reclaman insertando solo si no existen", () => {
  assert.match(ruta, /ignoreDuplicates:\s*true/)
  assert.match(ruta, /\.select\("elemento_id"\)/)
})

test("concurrencia: un recordatorio se reclama solo si su fecha sigue siendo la leída", () => {
  assert.match(ruta, /\.eq\("avisado_en",\s*\w+\.anterior\)/)
})

test("concurrencia: la liberación solo toca filas aún marcadas con el instante propio", () => {
  assert.match(ruta, /liberarAvisos/)
  assert.match(ruta, /\.eq\("avisado_en",\s*instante\)/)
})

test("la ruta no usa el antiguo contrato de registro posterior al envío", () => {
  assert.doesNotMatch(ruta, /registrarAvisos/)
})
