const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../../..")
const { buildPresentacionImpresion } = require("../../../lib/freezer/freezer-presentation")

const ITEM = {
  nombre: "Pechuga",
  cantidad: 1.5,
  unidad: "kg",
  estado: "fresco",
  categoria: "Carne",
  fecha_compra: "2026-10-20",
  fecha_congelacion: "2026-10-21",
  fecha_caducidad: "2026-12-31",
  notas: "Dos filetes",
  reservado: true,
}

test("la presentación de impresión conserva todos los campos y el formato visible", () => {
  assert.deepEqual(buildPresentacionImpresion(ITEM), {
    nombre: "Pechuga",
    cantidad: "1,5",
    unidad: "kg",
    estado: "fresco",
    categoria: "Carne",
    fechaCompra: "20/10/2026",
    fechaCongelacion: "21/10/2026",
    fechaCaducidad: "31/12/2026",
    notas: "Dos filetes",
    reservado: true,
  })
})

test("la impresión es una vista completa independiente de la búsqueda", () => {
  const source = fs.readFileSync(path.join(root, "components/freezer/freezer-print.tsx"), "utf8")
  assert.match(source, /credentials:\s*["']include["']/)
  assert.doesNotMatch(source, /Bearer|Authorization|search|busqueda|búsqueda/i)
  assert.match(source, /formatCantidadMostrada|buildPresentacionImpresion/)
  assert.match(source, /formatFechaMostrada|buildPresentacionImpresion/)
  assert.doesNotMatch(source, /const formatDate\s*=/)
  assert.match(source, /Sin elementos en este cajón/)
  assert.match(source, /bg-gray-100/)
  assert.match(source, /Generado el/)
  assert.match(source, /Guardar PDF/)
})

test("la vista impresa conserva el gate autoritativo y una tabla accesible", () => {
  const source = fs.readFileSync(path.join(root, "components/freezer/freezer-print.tsx"), "utf8")
  const page = fs.readFileSync(path.join(root, "app/freezer/print/page.tsx"), "utf8")

  assert.match(source, /payload\?\.isOwner !== true/)
  assert.match(source, /isAuthorized && !loading && !errorMessage/)
  assert.match(source, /border-l-4[^\n]*bg-gray-100[^\n]*print:bg-gray-200/)
  assert.match(source, /<th scope="col"/)
  assert.match(source, /<th scope="col"[^>]*>Notas<\/th>/)
  assert.match(page, /<FreezerPrintView \/>/)
  assert.doesNotMatch(page, /sharing|membership|Bearer|Authorization/i)
})

test("la presentación de impresión no depende de red, DOM ni reloj global", () => {
  const source = fs.readFileSync(path.join(root, "lib/freezer/freezer-presentation.js"), "utf8")
  assert.doesNotMatch(source, /fetch\(|document|window|new Date|Date\.now/)
})
