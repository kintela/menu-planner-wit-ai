const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { test } = require('node:test')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..', '..')
const scripts = ['check-freezer.js', 'check-freezer-200.js']
const fixtureUserId = '00000000-0000-4000-8000-000000000001'
const fixtureKey = 'not-a-real-service-key'

function runScript(script, args = [], env = {}) {
  return spawnSync(process.execPath, [path.join(projectRoot, 'scripts', script), ...args], {
    cwd: projectRoot,
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8',
    timeout: 5_000,
  })
}

for (const script of scripts) {
  test(`${script} requires explicit opt-in`, () => {
    const result = runScript(script, [fixtureUserId])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /ALLOW_LOCAL_SUPABASE_CHECK=1/)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(fixtureUserId))
  })

  test(`${script} rejects remote URLs before making a request`, () => {
    const result = runScript(script, [fixtureUserId], {
      ALLOW_LOCAL_SUPABASE_CHECK: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.com',
      SUPABASE_SERVICE_ROLE_KEY: fixtureKey,
    })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /loopback/)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(fixtureKey))
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(fixtureUserId))
  })

  test(`${script} requires a UUID CLI argument`, () => {
    const result = runScript(script, [], {
      ALLOW_LOCAL_SUPABASE_CHECK: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: fixtureKey,
    })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, new RegExp(`Usage: node scripts/${script} <user-id>`))
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(fixtureKey))
  })
}
