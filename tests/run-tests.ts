#!/usr/bin/env node

/**
 * Script para ejecutar pruebas con reporte detallado
 * Uso: npm run test:detailed
 */

import { execSync } from "child_process"

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function runTests() {
  log("\n🧪 EJECUTANDO SUITE COMPLETA DE PRUEBAS", colors.bold + colors.blue)
  log("=".repeat(50), colors.blue)

  try {
    // Ejecutar pruebas con cobertura
    const result = execSync("npm run test:coverage", {
      encoding: "utf8",
      stdio: "pipe",
    })

    log("\n✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE", colors.bold + colors.green)

    // Extraer información de cobertura del resultado
    const coverageMatch = result.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/)

    if (coverageMatch) {
      const [, statements, branches, functions, lines] = coverageMatch
      log("\n📊 COBERTURA DE CÓDIGO:", colors.bold + colors.blue)
      log(`   Declaraciones: ${statements}%`, colors.green)
      log(`   Ramas: ${branches}%`, colors.green)
      log(`   Funciones: ${functions}%`, colors.green)
      log(`   Líneas: ${lines}%`, colors.green)
    }

    // Contar pruebas
    const testMatch = result.match(/(\d+) passing/)
    if (testMatch) {
      log(`\n🎯 TOTAL DE PRUEBAS: ${testMatch[1]} pruebas pasaron`, colors.green)
    }
  } catch (error: any) {
    log("\n❌ ALGUNAS PRUEBAS FALLARON", colors.bold + colors.red)

    // Mostrar detalles del error
    if (error.stdout) {
      const failedTests = error.stdout.match(/FAIL .*/g)
      if (failedTests) {
        log("\n💥 PRUEBAS QUE FALLARON:", colors.red)
        failedTests.forEach((test: string) => {
          log(`   ${test}`, colors.red)
        })
      }
    }

    process.exit(1)
  }
}

// Función para ejecutar pruebas específicas
function runSpecificTests(pattern: string) {
  log(`\n🔍 EJECUTANDO PRUEBAS: ${pattern}`, colors.bold + colors.yellow)

  try {
    execSync(`npm test -- --testPathPattern="${pattern}"`, { stdio: "inherit" })
    log("\n✅ PRUEBAS ESPECÍFICAS COMPLETADAS", colors.green)
  } catch (error) {
    log("\n❌ PRUEBAS ESPECÍFICAS FALLARON", colors.red)
    process.exit(1)
  }
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2)

if (args.length > 0) {
  runSpecificTests(args[0])
} else {
  runTests()
}
