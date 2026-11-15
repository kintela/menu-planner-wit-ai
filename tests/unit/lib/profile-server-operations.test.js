const assert = require("node:assert/strict")
const test = require("node:test")

const {
  getOwnProfile,
  parseProfileUpdateRequestBody,
  updateOwnProfile,
  validateProfileUpdateInput,
} = require("../../../lib/profile/server-operations")

const USER_ID = "8f14e45f-ea6f-4f4a-9f5a-c7c11d5f6a21"
const OTHER_USER_ID = "2c1d4e56-7a89-4bcd-8e01-23456789abcd"
const HOY = new Date("2026-10-25T10:20:30.456Z")

function createSupabaseMock({ user = { id: USER_ID, role: "user_restricted" }, authError = null, profile, queryError = null }) {
  const calls = []
  const query = {
    select(columns) {
      calls.push(["select", columns])
      return this
    },
    update(values) {
      calls.push(["update", values])
      return this
    },
    eq(column, value) {
      calls.push(["eq", column, value])
      return this
    },
    maybeSingle() {
      calls.push(["maybeSingle"])
      return Promise.resolve({ data: profile ?? null, error: queryError })
    },
    single() {
      calls.push(["single"])
      return Promise.resolve({ data: profile ?? null, error: queryError })
    },
  }

  return {
    calls,
    client: {
      auth: {
        getUser: async () => ({ data: { user }, error: authError }),
      },
      from(table) {
        calls.push(["from", table])
        return query
      },
    },
  }
}

test("profile operations return 401 without a valid session and do not query profiles", async () => {
  const { client, calls } = createSupabaseMock({ user: null, authError: { message: "invalid jwt" } })

  assert.deepEqual(await getOwnProfile(client), {
    status: 401,
    body: { error: "Not authenticated" },
  })
  assert.deepEqual(calls, [])
})

test("profile reads are scoped only to the authenticated owner and do not deny user_restricted", async () => {
  const profile = { id: USER_ID, role: "user_restricted", first_name: "Ana" }
  const { client, calls } = createSupabaseMock({ profile })

  assert.deepEqual(await getOwnProfile(client), { status: 200, body: { profile } })
  assert.deepEqual(calls, [
    ["from", "user_profiles"],
    ["select", "*"],
    ["eq", "id", USER_ID],
    ["maybeSingle"],
  ])
})

test("profile reads present the confirmed Auth identity email instead of a stale stored email", async () => {
  const profile = { id: USER_ID, email: "stale@example.com", first_name: "Ana" }
  const { client } = createSupabaseMock({
    user: { id: USER_ID, role: "user_restricted", email: "confirmed@example.com" },
    profile,
  })

  assert.deepEqual(await getOwnProfile(client), {
    status: 200,
    body: { profile: { ...profile, email: "confirmed@example.com" } },
  })
})

test("profile update input rejects target ids, protected fields and arbitrary fields", () => {
  assert.deepEqual(
    validateProfileUpdateInput({ first_name: "Ana", last_name: null, alias: "anita", phone: "" }),
    { ok: true, value: { first_name: "Ana", last_name: null, alias: "anita", phone: "" } },
  )

  for (const body of [
    null,
    [],
    { id: OTHER_USER_ID, first_name: "Mallory" },
    { role: "admin" },
    { avatar_url: "avatars/other/file.png" },
    { email: "other@example.com" },
    { arbitrary: "value" },
    { first_name: { nested: true } },
  ]) {
    assert.deepEqual(validateProfileUpdateInput(body), { ok: false })
  }
})

test("profile update request parsing rejects malformed or oversized JSON", () => {
  assert.deepEqual(parseProfileUpdateRequestBody('{"first_name":"Ana"}'), {
    ok: true,
    value: { first_name: "Ana" },
  })
  assert.deepEqual(parseProfileUpdateRequestBody("{"), { ok: false })
  assert.deepEqual(parseProfileUpdateRequestBody(JSON.stringify({ first_name: "a".repeat(20_000) })), {
    ok: false,
  })
})

test("profile updates use buildProfileUpdate, scope by auth user and return the updated profile", async () => {
  const profile = { id: USER_ID, role: "user_restricted", first_name: "Ana", full_name: "Ana López" }
  const { client, calls } = createSupabaseMock({ profile })
  const input = { first_name: " Ana ", last_name: "López", alias: "", phone: null }

  assert.deepEqual(await updateOwnProfile(client, input, HOY), { status: 200, body: { profile } })
  assert.deepEqual(calls, [
    ["from", "user_profiles"],
    [
      "update",
      {
        first_name: "Ana",
        last_name: "López",
        alias: null,
        phone: null,
        full_name: "Ana López",
        updated_at: "2026-10-25T10:20:30.456Z",
      },
    ],
    ["eq", "id", USER_ID],
    ["select", "*"],
    ["single"],
  ])
})

test("profile operations never expose database or thrown internal errors", async () => {
  const readMock = createSupabaseMock({ queryError: { message: "relation user_profiles secret detail" } })
  assert.deepEqual(await getOwnProfile(readMock.client), {
    status: 500,
    body: { error: "Unable to fetch profile" },
  })

  const updateMock = createSupabaseMock({ queryError: { message: "violates internal policy" } })
  assert.deepEqual(await updateOwnProfile(updateMock.client, { first_name: "Ana" }, HOY), {
    status: 500,
    body: { error: "Unable to update profile" },
  })

  const throwingClient = {
    auth: { getUser: async () => { throw new Error("token internals") } },
  }
  assert.deepEqual(await getOwnProfile(throwingClient), {
    status: 500,
    body: { error: "Unable to fetch profile" },
  })
})
