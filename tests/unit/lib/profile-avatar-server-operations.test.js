const assert = require("node:assert/strict")
const test = require("node:test")

const {
  MAX_AVATAR_FILE_BYTES,
  deleteOwnAvatar,
  replaceOwnAvatar,
  validateAvatarFile,
} = require("../../../lib/profile/avatar-server-operations")

const USER_ID = "8f14e45f-ea6f-4f4a-9f5a-c7c11d5f6a21"
const OTHER_USER_ID = "2c1d4e56-7a89-4bcd-8e01-23456789abcd"
const HOY = new Date("2026-10-25T10:20:30.456Z")
const NEW_PATH = `${USER_ID}/${HOY.getTime()}-portrait.png`

function avatarFile(overrides = {}) {
  return {
    name: "portrait.png",
    type: "image/png",
    size: 128,
    ...overrides,
  }
}

function createAvatarClient({
  user = { id: USER_ID, role: "user_restricted" },
  authError = null,
  currentReference = null,
  profileReadError = null,
  associationError = null,
  clearError = null,
  uploadError = null,
  removeErrors = [],
} = {}) {
  const calls = []
  let updateValue
  let removeIndex = 0

  const query = {
    select(columns) {
      calls.push(["select", columns])
      return this
    },
    update(value) {
      updateValue = value
      calls.push(["update", value])
      return this
    },
    eq(column, value) {
      calls.push(["eq", column, value])
      return this
    },
    maybeSingle() {
      calls.push(["maybeSingle"])
      return Promise.resolve({
        data: profileReadError ? null : { avatar_url: currentReference },
        error: profileReadError,
      })
    },
    single() {
      calls.push(["single"])
      const error = updateValue?.avatar_url === null ? clearError : associationError
      return Promise.resolve({ data: error ? null : { avatar_url: updateValue.avatar_url }, error })
    },
  }

  return {
    calls,
    client: {
      auth: {
        async getUser() {
          calls.push(["getUser"])
          return { data: { user }, error: authError }
        },
      },
      from(table) {
        calls.push(["from", table])
        return query
      },
      storage: {
        from(bucket) {
          calls.push(["storage.from", bucket])
          return {
            async upload(path, file, options) {
              calls.push(["upload", path, file, options])
              return { data: uploadError ? null : { path }, error: uploadError }
            },
            async remove(paths) {
              calls.push(["remove", paths])
              const error = removeErrors[removeIndex++] ?? null
              return { data: error ? null : paths, error }
            },
          }
        },
      },
    },
  }
}

test("avatar files are limited to safe image uploads of at most 5 MB", () => {
  assert.deepEqual(validateAvatarFile(avatarFile()), { ok: true, value: avatarFile() })
  assert.deepEqual(validateAvatarFile(avatarFile({ size: MAX_AVATAR_FILE_BYTES + 1 })), { ok: false })
  assert.deepEqual(validateAvatarFile(avatarFile({ type: "application/pdf" })), { ok: false })
  assert.deepEqual(validateAvatarFile(avatarFile({ type: "image/svg+xml" })), { ok: false })
  assert.deepEqual(validateAvatarFile(avatarFile({ name: "../portrait.png" })), { ok: false })
})

test("avatar operations require auth and never inspect profile or storage without it", async () => {
  const { client, calls } = createAvatarClient({ user: null, authError: { message: "invalid jwt" } })

  assert.equal((await replaceOwnAvatar(client, avatarFile(), HOY)).status, 401)
  assert.deepEqual(calls, [["getUser"]])
})

test("upload failure leaves the current profile and object untouched", async () => {
  const oldPath = `${USER_ID}/old.png`
  const { client, calls } = createAvatarClient({
    currentReference: oldPath,
    uploadError: { message: "storage internals" },
  })

  assert.deepEqual(await replaceOwnAvatar(client, avatarFile(), HOY), {
    status: 500,
    body: { avatar: { state: "failed", code: "AVATAR_UPLOAD_FAILED" } },
  })
  assert.equal(calls.some(([method]) => method === "update" || method === "remove"), false)
})

test("association failure preserves old avatar and compensates only the new own object", async () => {
  const oldPath = `${USER_ID}/old.png`
  const { client, calls } = createAvatarClient({
    currentReference: oldPath,
    associationError: { message: "RLS detail" },
  })

  assert.deepEqual(await replaceOwnAvatar(client, avatarFile(), HOY), {
    status: 500,
    body: {
      avatar: { state: "failed", code: "AVATAR_ASSOCIATION_FAILED", cleanup: "complete" },
    },
  })
  assert.deepEqual(calls.filter(([method]) => method === "remove"), [["remove", [NEW_PATH]]])
  assert.equal(calls.some((call) => call[0] === "remove" && call[1][0] === oldPath), false)
})

test("failed compensation after association failure is reported as partial without deleting old", async () => {
  const oldPath = `${USER_ID}/old.png`
  const { client, calls } = createAvatarClient({
    currentReference: oldPath,
    associationError: { message: "RLS detail" },
    removeErrors: [{ message: "cleanup failed" }],
  })

  assert.deepEqual(await replaceOwnAvatar(client, avatarFile(), HOY), {
    status: 207,
    body: {
      avatar: { state: "partial", code: "AVATAR_ASSOCIATION_FAILED_CLEANUP_FAILED", cleanup: "failed" },
    },
  })
  assert.deepEqual(calls.filter(([method]) => method === "remove"), [["remove", [NEW_PATH]]])
})

test("successful replacement associates the canonical path before deleting the previous own object", async () => {
  const oldPath = `${USER_ID}/old.png`
  const { client, calls } = createAvatarClient({ currentReference: oldPath })

  assert.deepEqual(await replaceOwnAvatar(client, avatarFile(), HOY), {
    status: 200,
    body: {
      avatar: { state: "complete", code: "AVATAR_REPLACED", reference: NEW_PATH, cleanup: "complete" },
    },
  })
  const uploadAt = calls.findIndex(([method]) => method === "upload")
  const associateAt = calls.findIndex(([method, value]) => method === "update" && value.avatar_url === NEW_PATH)
  const removeAt = calls.findIndex(([method, paths]) => method === "remove" && paths[0] === oldPath)
  assert.ok(uploadAt < associateAt && associateAt < removeAt)
})

test("old cleanup failure keeps the new association and reports a partial result", async () => {
  const { client } = createAvatarClient({
    currentReference: `${USER_ID}/old.png`,
    removeErrors: [{ message: "remove failed" }],
  })

  assert.deepEqual(await replaceOwnAvatar(client, avatarFile(), HOY), {
    status: 207,
    body: {
      avatar: { state: "partial", code: "AVATAR_REPLACED_CLEANUP_FAILED", reference: NEW_PATH, cleanup: "failed" },
    },
  })
})

test("historical URLs and foreign paths are never accessed or removed during replacement", async () => {
  for (const reference of [
    "https://example.test/storage/v1/object/public/avatars/foreign/file.png",
    `${OTHER_USER_ID}/foreign.png`,
  ]) {
    const { client, calls } = createAvatarClient({ currentReference: reference })
    const result = await replaceOwnAvatar(client, avatarFile(), HOY)

    assert.equal(result.status, 207)
    assert.equal(result.body.avatar.code, "AVATAR_REPLACED_PREVIOUS_UNVERIFIED")
    assert.equal(calls.some(([method]) => method === "remove"), false)
  }
})

test("deletion removes an accredited own object before clearing its profile reference", async () => {
  const oldPath = `${USER_ID}/old.png`
  const { client, calls } = createAvatarClient({ currentReference: oldPath })

  assert.deepEqual(await deleteOwnAvatar(client), {
    status: 200,
    body: { avatar: { state: "complete", code: "AVATAR_RESET", reference: null } },
  })
  const removeAt = calls.findIndex(([method]) => method === "remove")
  const clearAt = calls.findIndex(([method, value]) => method === "update" && value.avatar_url === null)
  assert.ok(removeAt < clearAt)
})

test("deletion reports each partial safely and never removes an unaccredited reference", async () => {
  const deleteFailure = createAvatarClient({
    currentReference: `${USER_ID}/old.png`,
    removeErrors: [{ message: "remove failed" }],
  })
  assert.equal((await deleteOwnAvatar(deleteFailure.client)).body.avatar.code, "AVATAR_DELETE_FAILED")
  assert.equal(deleteFailure.calls.some(([method]) => method === "update"), false)

  const clearFailure = createAvatarClient({
    currentReference: `${USER_ID}/old.png`,
    clearError: { message: "profile failed" },
  })
  assert.deepEqual(await deleteOwnAvatar(clearFailure.client), {
    status: 207,
    body: { avatar: { state: "partial", code: "AVATAR_DELETED_PROFILE_CLEAR_FAILED" } },
  })

  const foreign = createAvatarClient({ currentReference: `${OTHER_USER_ID}/foreign.png` })
  assert.equal((await deleteOwnAvatar(foreign.client)).status, 409)
  assert.equal(foreign.calls.some(([method]) => method === "remove" || method === "update"), false)
})

test("reset without an avatar is idempotent and user_restricted is not denied", async () => {
  const { client, calls } = createAvatarClient({ currentReference: null })

  assert.deepEqual(await deleteOwnAvatar(client), {
    status: 200,
    body: { avatar: { state: "complete", code: "AVATAR_ALREADY_RESET", reference: null } },
  })
  assert.equal(calls.some(([method]) => method === "remove" || method === "update"), false)
})
