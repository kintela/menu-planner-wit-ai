const assert = require("node:assert/strict")
const test = require("node:test")

const {
  changeOwnEmail,
  parseEmailChangeRequestBody,
} = require("../../../lib/profile/server-operations")

const USER_ID = "8f14e45f-ea6f-4f4a-9f5a-c7c11d5f6a21"

function createEmailClient({
  user = { id: USER_ID, role: "user_restricted", email: "old@example.com" },
  getUserError = null,
  authResult = {
    data: { user: { id: USER_ID, email: "old@example.com", new_email: "new@example.com" } },
    error: null,
  },
  profileError = null,
} = {}) {
  const calls = []
  const query = {
    update(values) {
      calls.push(["update", values])
      return this
    },
    eq(column, value) {
      calls.push(["eq", column, value])
      return Promise.resolve({ data: null, error: profileError })
    },
  }

  return {
    calls,
    client: {
      auth: {
        async getUser() {
          calls.push(["getUser"])
          return { data: { user }, error: getUserError }
        },
        async updateUser(values) {
          calls.push(["updateUser", values])
          return authResult
        },
      },
      from(table) {
        calls.push(["from", table])
        return query
      },
    },
  }
}

test("email change requires a session and performs no update without one", async () => {
  const { client, calls } = createEmailClient({ user: null, getUserError: { message: "invalid jwt" } })

  assert.deepEqual(await changeOwnEmail(client, { email: "new@example.com" }), {
    status: 401,
    body: {
      emailChange: {
        state: "rejected",
        code: "NOT_AUTHENTICATED",
        message: "Authentication is required",
      },
    },
  })
  assert.deepEqual(calls, [["getUser"]])
})

test("email request accepts only one reasonably sized, valid email", async () => {
  assert.deepEqual(parseEmailChangeRequestBody('{"email":" New@Example.COM "}'), {
    ok: true,
    value: { email: "new@example.com" },
  })

  for (const text of [
    "{}",
    '{"email":"not-an-email"}',
    '{"email":"new@example.com","id":"other"}',
    '{"email":"new@example.com","first_name":"Changed"}',
    JSON.stringify({ email: `${"a".repeat(245)}@example.com` }),
  ]) {
    assert.deepEqual(parseEmailChangeRequestBody(text), { ok: false })
  }

  const { client, calls } = createEmailClient()
  assert.equal((await changeOwnEmail(client, { email: "invalid" })).status, 400)
  assert.deepEqual(calls, [])
})

test("accepted email requiring confirmation stays pending and does not sync profile email", async () => {
  const { client, calls } = createEmailClient()

  assert.deepEqual(await changeOwnEmail(client, { email: " New@Example.COM " }), {
    status: 202,
    body: {
      emailChange: {
        state: "pending",
        code: "EMAIL_CONFIRMATION_REQUIRED",
        message: "Email change accepted; confirmation is pending",
        email: "new@example.com",
        profileSync: "not_applicable",
      },
    },
  })
  assert.deepEqual(calls, [
    ["getUser"],
    ["updateUser", { email: "new@example.com" }],
  ])
})

test("genuinely confirmed email is synced only to the authenticated profile", async () => {
  const { client, calls } = createEmailClient({
    authResult: { data: { user: { id: USER_ID, email: "new@example.com", new_email: null } }, error: null },
  })

  assert.deepEqual(await changeOwnEmail(client, { email: "new@example.com" }), {
    status: 200,
    body: {
      emailChange: {
        state: "confirmed",
        code: "EMAIL_CHANGE_CONFIRMED",
        message: "Email changed and profile synchronized",
        email: "new@example.com",
        profileSync: "complete",
      },
    },
  })
  assert.deepEqual(calls, [
    ["getUser"],
    ["updateUser", { email: "new@example.com" }],
    ["from", "user_profiles"],
    ["update", { email: "new@example.com" }],
    ["eq", "id", USER_ID],
  ])
})

test("provider rejection is safe and leaves all persisted profile fields untouched", async () => {
  const { client, calls } = createEmailClient({
    authResult: { data: { user: null }, error: { message: "email address already in use", status: 422 } },
  })

  assert.deepEqual(await changeOwnEmail(client, { email: "used@example.com" }), {
    status: 422,
    body: {
      emailChange: {
        state: "rejected",
        code: "EMAIL_CHANGE_REJECTED",
        message: "Email change was rejected",
      },
    },
  })
  assert.deepEqual(calls, [
    ["getUser"],
    ["updateUser", { email: "used@example.com" }],
  ])
})

test("confirmed auth with failed profile sync reports a safe partial result", async () => {
  const { client } = createEmailClient({
    authResult: { data: { user: { id: USER_ID, email: "new@example.com" } }, error: null },
    profileError: { message: "internal RLS detail" },
  })

  assert.deepEqual(await changeOwnEmail(client, { email: "new@example.com" }), {
    status: 207,
    body: {
      emailChange: {
        state: "confirmed",
        code: "EMAIL_CONFIRMED_PROFILE_SYNC_FAILED",
        message: "Email changed, but profile synchronization failed",
        email: "new@example.com",
        profileSync: "failed",
      },
    },
  })
})

test("user_restricted is allowed and no role or target user id is sent to Auth", async () => {
  const { client, calls } = createEmailClient()

  assert.equal((await changeOwnEmail(client, { email: "new@example.com" })).status, 202)
  assert.deepEqual(calls[1], ["updateUser", { email: "new@example.com" }])
})
