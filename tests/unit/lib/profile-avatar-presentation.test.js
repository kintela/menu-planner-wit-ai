const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const { mapAvatarUploadResult, presentOwnProfile } = require("../../../lib/profile/avatar-presentation")

const USER_ID = "8f14e45f-ea6f-4f4a-9f5a-c7c11d5f6a21"
const OWN_PATH = `${USER_ID}/1730000000000-avatar.png`

function storageMock(result) {
  const calls = []
  return {
    calls,
    client: {
      storage: {
        from(bucket) {
          calls.push(["from", bucket])
          return {
            async createSignedUrl(path, expiresIn) {
              calls.push(["createSignedUrl", path, expiresIn])
              return result
            },
          }
        },
      },
    },
  }
}

test("profile presentation replaces an owned canonical avatar reference with a short-lived signed URL", async () => {
  const { client, calls } = storageMock({
    data: { signedUrl: "https://storage.example.test/signed/avatar?token=short" },
    error: null,
  })

  const presented = await presentOwnProfile(client, { id: USER_ID, avatar_url: OWN_PATH }, USER_ID)

  assert.deepEqual(presented, {
    id: USER_ID,
    avatar_url: "https://storage.example.test/signed/avatar?token=short",
    has_custom_avatar: true,
  })
  assert.deepEqual(calls, [
    ["from", "avatars"],
    ["createSignedUrl", OWN_PATH, 300],
  ])
})

test("profile presentation never signs or exposes foreign, URL or ambiguous avatar references", async () => {
  for (const reference of [
    "2c1d4e56-7a89-4bcd-8e01-23456789abcd/avatar.png",
    "https://storage.example.test/public/avatar.png",
    `${USER_ID}/../avatar.png`,
  ]) {
    const { client, calls } = storageMock({ data: null, error: null })
    const presented = await presentOwnProfile(client, { id: USER_ID, avatar_url: reference }, USER_ID)
    assert.equal(presented.avatar_url, null)
    assert.equal(presented.has_custom_avatar, true)
    assert.deepEqual(calls, [])
  }
})

test("profile presentation falls back without exposing the canonical path when signing fails", async () => {
  const { client } = storageMock({ data: null, error: { message: "storage unavailable" } })
  const presented = await presentOwnProfile(client, { id: USER_ID, avatar_url: OWN_PATH }, USER_ID)
  assert.equal(presented.avatar_url, null)
  assert.equal(presented.has_custom_avatar, true)
})

test("profile presentation leaves a missing profile intact and does not access storage without an avatar", async () => {
  const { client, calls } = storageMock({ data: null, error: null })
  assert.equal(await presentOwnProfile(client, null, USER_ID), null)
  assert.deepEqual(await presentOwnProfile(client, { id: USER_ID, avatar_url: null }, USER_ID), {
    id: USER_ID,
    avatar_url: null,
    has_custom_avatar: false,
  })
  assert.deepEqual(calls, [])
})

test("avatar upload presentation treats failed association with failed cleanup as an overall failure", () => {
  assert.deepEqual(
    mapAvatarUploadResult({ state: "partial", code: "AVATAR_ASSOCIATION_FAILED_CLEANUP_FAILED" }, false),
    {
      outcome: {
        kind: "error",
        text: "No se pudo asociar el avatar nuevo; se conserva el anterior y queda pendiente limpiar el archivo nuevo.",
      },
      succeeded: false,
    },
  )
})

test("avatar upload presentation identifies partial cleanup only after a successful association", () => {
  assert.deepEqual(
    mapAvatarUploadResult({ state: "partial", code: "AVATAR_REPLACED_CLEANUP_FAILED" }, false),
    {
      outcome: {
        kind: "warning",
        text: "El avatar nuevo está activo, pero no se pudo eliminar el archivo anterior.",
      },
      succeeded: true,
    },
  )
  assert.deepEqual(
    mapAvatarUploadResult({ state: "partial", code: "AVATAR_REPLACED_PREVIOUS_UNVERIFIED" }, false),
    {
      outcome: {
        kind: "warning",
        text: "El avatar nuevo está activo, pero no se pudo verificar ni limpiar la referencia anterior.",
      },
      succeeded: true,
    },
  )
})

test("avatar upload presentation is conservative for unknown partial results", () => {
  const mapped = mapAvatarUploadResult({ state: "partial", code: "UNKNOWN_PARTIAL" }, false)

  assert.deepEqual(mapped, {
    outcome: {
      kind: "error",
      text: "La actualización del avatar quedó incompleta; no se puede confirmar que el avatar nuevo esté activo.",
    },
    succeeded: false,
  })
  assert.doesNotMatch(mapped.outcome.text, /avatar nuevo está activo/i)
})

test("avatar upload presentation only treats a complete successful response as complete", () => {
  assert.deepEqual(mapAvatarUploadResult({ state: "complete", code: "AVATAR_REPLACED" }, true), {
    outcome: { kind: "success", text: "Avatar actualizado correctamente." },
    succeeded: true,
  })
  assert.equal(mapAvatarUploadResult({ state: "complete", code: "AVATAR_REPLACED" }, false).succeeded, false)
})

test("an AI-created recipe is passed to the weekly menu instead of being dropped from the current list", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../components/recipe-selector.tsx"), "utf8")

  assert.match(source, /onSelect\(Number\(recipe\.id\),\s*\{[\s\S]*?name:\s*recipe\.name[\s\S]*?author_alias:\s*"Usuario"[\s\S]*?\}\s*,?\s*\)/)
  assert.doesNotMatch(source, /full_name|first_name|last_name|user_profiles/)
})
