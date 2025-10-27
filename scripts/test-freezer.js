const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv(file) {
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) return
  const content = fs.readFileSync(abs, 'utf8')
  content.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#')) return
    const idx = line.indexOf('=')
    if (idx === -1) return
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key && !(key in process.env)) process.env[key] = value
  })
}

loadEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Prefer: 'return=representation' } },
})

async function run() {
  const { data, error } = await supabase
    .from('congeladores')
    .select(`
      id,
      nombre,
      cajones_congelador (
        id,
        nombre,
        posicion,
        descripcion,
        elementos_cajon (
          id,
          nombre
        )
      )
    `)
    .eq('usuario_id', 'c4ceafa2-f99f-49a6-8760-710f9ad7da9e')
  console.log('error:', error)
  console.log('data:', JSON.stringify(data, null, 2))
}
run()
