const { createClient } = require('@supabase/supabase-js')

const scriptName = 'check-freezer-200.js'
const userId = process.argv[2]
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

function getLocalUrl(value) {
  let parsed

  try {
    parsed = new URL(value)
  } catch {
    return null
  }

  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
  if (!['http:', 'https:'].includes(parsed.protocol) || !loopbackHosts.has(parsed.hostname)) {
    return null
  }

  return parsed.toString()
}

if (process.env.ALLOW_LOCAL_SUPABASE_CHECK !== '1') {
  fail('Refusing to run. Set ALLOW_LOCAL_SUPABASE_CHECK=1 to opt in to this local-only check.')
} else if (!userId || !uuidPattern.test(userId)) {
  fail(`Usage: node scripts/${scriptName} <user-id> (user-id must be a UUID)`)
} else {
  const url = getLocalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    fail('NEXT_PUBLIC_SUPABASE_URL must be an http(s) loopback URL.')
  } else if (!serviceKey) {
    fail('SUPABASE_SERVICE_ROLE_KEY must be provided in the process environment.')
  } else {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Prefer: 'return=representation', 'Accept-Encoding': 'gzip' } },
    })

    run(supabase, userId).catch(() => {
      fail('Check failed unexpectedly.')
    })
  }
}

async function run(supabase, requestedUserId) {
  const { count, error, status } = await supabase
    .from('congeladores')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', requestedUserId)

  if (error) {
    fail(`Check failed with HTTP status ${status}.`)
    return
  }

  console.log(`Check complete with HTTP status ${status}: ${count ?? 0} freezer(s).`)
}
