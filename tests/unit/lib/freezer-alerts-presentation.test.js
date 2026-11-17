const test = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

const {
  escaparHtml,
  formatearFechaHumana,
  formatearCantidad,
  formatearTiempoCongelado,
  construirCorreoAviso,
  construirCorreoPrueba,
} = require("../../../lib/freezer/freezer-alerts-presentation")

// Spec 007 T6. Todo texto dirigido a personas va en castellano (RF-17).
const hoy = new Date("2026-11-17T08:00:00Z")

const elemento = (extra = {}) => ({
  id: "e1",
  nombre: "Albóndigas veganas",
  cantidad: 2,
  unidad: "kg",
  categoria: "Platos",
  fecha_congelacion: "2025-12-18",
  cajon: { nombre: "Cajón 1", posicion: 1 },
  ...extra,
})

test("escaparHtml neutraliza los cinco caracteres peligrosos", () => {
  assert.equal(escaparHtml(`<b a="1" b='2'>&</b>`), "&lt;b a=&quot;1&quot; b=&#39;2&#39;&gt;&amp;&lt;/b&gt;")
  assert.equal(escaparHtml(undefined), "")
  assert.equal(escaparHtml(null), "")
})

test("formatearFechaHumana da una fecha corta en castellano y '-' si no hay fecha válida", () => {
  assert.match(formatearFechaHumana("2025-12-18"), /^18 dic\.? 2025$/)
  for (const invalida of [null, undefined, "", "basura"]) {
    assert.equal(formatearFechaHumana(invalida), "-")
  }
})

test("formatearCantidad une cantidad y unidad, y usa '-' sin cantidad", () => {
  assert.equal(formatearCantidad(2, "kg"), "2 kg")
  assert.equal(formatearCantidad(1.5, null), "1.5")
  assert.equal(formatearCantidad(null, "kg"), "-")
  assert.equal(formatearCantidad(undefined, undefined), "-")
})

test("RF-13: el tiempo congelado se redacta en castellano con singular y plural correctos", () => {
  assert.equal(formatearTiempoCongelado({ dias: 0, meses: 0, diasResto: 0 }), "0 días")
  assert.equal(formatearTiempoCongelado({ dias: 1, meses: 0, diasResto: 1 }), "1 día")
  assert.equal(formatearTiempoCongelado({ dias: 7, meses: 0, diasResto: 7 }), "7 días")
  assert.equal(formatearTiempoCongelado({ dias: 30, meses: 1, diasResto: 0 }), "1 mes")
  assert.equal(formatearTiempoCongelado({ dias: 61, meses: 2, diasResto: 0 }), "2 meses")
  assert.equal(formatearTiempoCongelado({ dias: 335, meses: 11, diasResto: 1 }), "11 meses y 1 día")
  assert.equal(formatearTiempoCongelado({ dias: 334, meses: 10, diasResto: 30 }), "10 meses y 30 días")
  assert.equal(formatearTiempoCongelado(null), "-")
})

test("RF-13/RF-17: el aviso incluye por elemento nombre, fecha, tiempo congelado, cajón, cantidad y categoría", () => {
  const { subject, text, html } = construirCorreoAviso({ elementos: [elemento()], hoy, meses: 2, baseUrl: "https://app.example.test" })
  for (const parte of ["Albóndigas veganas", "Cajón 1", "pos. 1", "2 kg", "Platos", "10 meses y 30 días"]) {
    assert.ok(text.includes(parte), `texto sin «${parte}»`)
    assert.ok(html.includes(parte), `html sin «${parte}»`)
  }
  assert.match(text, /18 dic\.? 2025/)
  assert.match(subject, /^\[Congelador\] 1 elemento con 2\+ meses$/)
})

test("RF-17: asunto, título e introducción en castellano con concordancia de número", () => {
  const varios = construirCorreoAviso({ elementos: [elemento({ id: "a" }), elemento({ id: "b" })], hoy, meses: 2, baseUrl: "" })
  assert.equal(varios.subject, "[Congelador] 2 elementos con 2+ meses")
  assert.match(varios.text, /Elementos congelados 2 meses o más/)
  assert.match(varios.text, /Se encontraron 2 elementos que llevan 2 meses o más congelados\./)

  const uno = construirCorreoAviso({ elementos: [elemento()], hoy, meses: 1, baseUrl: "" })
  assert.match(uno.text, /Elementos congelados 1 mes o más/)
  assert.match(uno.text, /Se encontró 1 elemento que lleva 1 mes o más congelado\./)
  // Sin anglicismos de plantilla.
  assert.doesNotMatch(uno.text + uno.html, /\b(items?|drawer|frozen|threshold)\b/i)
})

test("RF-18: una lista única, en el orden recibido, sin distinguir primer aviso de recordatorio", () => {
  const { text } = construirCorreoAviso({
    elementos: [elemento({ id: "a", nombre: "Primero" }), elemento({ id: "b", nombre: "Segundo" })],
    hoy,
    meses: 2,
    baseUrl: "",
  })
  assert.ok(text.indexOf("Primero") < text.indexOf("Segundo"))
  assert.doesNotMatch(text, /recordatorio|nuevo|reaviso/i)
})

test("el contenido variable se escapa en el HTML y no puede inyectar marcado", () => {
  const { html } = construirCorreoAviso({
    elementos: [elemento({ nombre: `<img src=x onerror="alert(1)">`, categoria: `"><script>x</script>`, cajon: { nombre: "<b>c</b>", posicion: null } })],
    hoy,
    meses: 2,
    baseUrl: "",
  })
  assert.doesNotMatch(html, /<img |<script|<b>c<\/b>/)
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/)
})

test("elementos con datos ausentes se muestran con '-' sin fallar", () => {
  const { text, html } = construirCorreoAviso({
    elementos: [{ id: "x", nombre: "Sin datos", fecha_congelacion: "2025-01-01" }],
    hoy,
    meses: 2,
    baseUrl: "",
  })
  assert.match(text, /Sin datos/)
  assert.match(text, /Cajón: -/)
  assert.match(text, /Cantidad: -/)
  assert.match(text, /Categoría: -/)
  assert.ok(html.includes("<td"))
})

test("el enlace a la aplicación solo se incluye para URLs http(s) y se escapa", () => {
  const ok = construirCorreoAviso({ elementos: [elemento()], hoy, meses: 2, baseUrl: "https://app.example.test/" })
  assert.match(ok.text, /MenuPlanner: https:\/\/app\.example\.test$/)
  assert.match(ok.html, /href="https:\/\/app\.example\.test"/)

  for (const peligrosa of ["javascript:alert(1)", "data:text/html,x", "ftp://x.test", `https://x.test/"onmouseover="y`]) {
    const r = construirCorreoAviso({ elementos: [elemento()], hoy, meses: 2, baseUrl: peligrosa })
    assert.doesNotMatch(r.html, /javascript:|data:text|ftp:/i, peligrosa)
    assert.doesNotMatch(r.html, /onmouseover="y/, peligrosa)
  }
  const sin = construirCorreoAviso({ elementos: [elemento()], hoy, meses: 2, baseUrl: "" })
  assert.doesNotMatch(sin.text, /MenuPlanner: http/)
})

test("el correo de prueba está en castellano e incluye la hora recibida", () => {
  const { subject, text, html } = construirCorreoPrueba({ hoy, baseUrl: "" })
  assert.equal(subject, "[Congelador] Correo de prueba")
  assert.match(text, /Correo de prueba enviado correctamente/)
  assert.ok(text.includes("2026-11-17T08:00:00.000Z"))
  assert.match(html, /configuración de correo funciona/)
})

test("RF-12: el módulo no contiene direcciones de correo escritas", () => {
  const codigo = readFileSync(resolve(__dirname, "../../../lib/freezer/freezer-alerts-presentation.js"), "utf8")
  const sinComentarios = codigo.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
  assert.doesNotMatch(sinComentarios, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
})

test("no lee el reloj global: la hora del correo de prueba sale del parámetro", () => {
  const a = construirCorreoPrueba({ hoy: new Date("2030-01-01T00:00:00Z"), baseUrl: "" })
  assert.ok(a.text.includes("2030-01-01T00:00:00.000Z"))
})
