const assert = require("node:assert/strict")
const test = require("node:test")

const {
  buildAvatarObjectPath,
  buildProfileUpdate,
  classifyEmailChange,
  parseOwnedAvatarReference,
} = require("../../../lib/profile/domain")

const USER_ID = "8f14e45f-ea6f-4f4a-9f5a-c7c11d5f6a21"
const OTHER_USER_ID = "2c1d4e56-7a89-4bcd-8e01-23456789abcd"
const HOY = new Date("2026-10-25T10:20:30.456Z")

test("buildProfileUpdate keeps only profile fields, accepts empty values and derives full_name", () => {
  assert.deepEqual(
    buildProfileUpdate(
      {
        first_name: "  Ana ",
        last_name: " López  ",
        alias: "",
        phone: "  ",
        email: "ignored@example.com",
        role: "admin",
        avatar_url: "ignored",
      },
      HOY,
    ),
    {
      first_name: "Ana",
      last_name: "López",
      alias: null,
      phone: null,
      full_name: "Ana López",
      updated_at: "2026-10-25T10:20:30.456Z",
    },
  )

  assert.deepEqual(buildProfileUpdate({}, HOY), {
    first_name: null,
    last_name: null,
    alias: null,
    phone: null,
    full_name: null,
    updated_at: "2026-10-25T10:20:30.456Z",
  })
})

test("buildAvatarObjectPath creates a deterministic safe path below the exact user id", () => {
  assert.equal(
    buildAvatarObjectPath(USER_ID, " Mi foto (final).PNG ", HOY),
    `${USER_ID}/1792923630456-Mi-foto-final.PNG`,
  )

  for (const [userId, fileName] of [
    ["", "avatar.png"],
    ["not-a-uuid", "avatar.png"],
    [`${USER_ID}/other`, "avatar.png"],
    [USER_ID, ""],
    [USER_ID, "../avatar.png"],
    [USER_ID, "folder/avatar.png"],
    [USER_ID, String.raw`folder\avatar.png`],
    [USER_ID, "%2e%2e%2favatar.png"],
  ]) {
    assert.throws(() => buildAvatarObjectPath(userId, fileName, HOY), /invalid/i)
  }
})

test("parseOwnedAvatarReference accepts only canonical own private-bucket paths", () => {
  const path = `${USER_ID}/1761387630456-avatar.png`

  assert.equal(parseOwnedAvatarReference(path, USER_ID), path)
  assert.equal(parseOwnedAvatarReference(`avatars/${path}`, USER_ID), path)

  for (const reference of [
    "",
    `${OTHER_USER_ID}/avatar.png`,
    `avatars/${OTHER_USER_ID}/avatar.png`,
    `${USER_ID}/../${OTHER_USER_ID}/avatar.png`,
    `${USER_ID}/folder/../../avatar.png`,
    `${USER_ID}/%2e%2e/avatar.png`,
    `${USER_ID}//avatar.png`,
    `https://example.com/storage/v1/object/avatars/${path}`,
    `https://project.supabase.co/storage/v1/object/public/avatars/${path}`,
    `/avatars/${path}`,
    `other/${path}`,
  ]) {
    assert.equal(parseOwnedAvatarReference(reference, USER_ID), null)
  }
})

test("classifyEmailChange distinguishes rejected, pending and explicitly completed auth results", () => {
  assert.equal(classifyEmailChange({ error: { message: "rate limited" }, data: { user: null } }), "rejected")
  assert.equal(
    classifyEmailChange({
      error: null,
      data: { user: { email: "old@example.com", new_email: "new@example.com" } },
    }),
    "pending",
  )
  assert.equal(
    classifyEmailChange({
      error: null,
      data: { user: { email: "new@example.com", new_email: null } },
    }),
    "confirmed",
  )

  assert.equal(classifyEmailChange({ error: null, data: { user: null } }), "rejected")
  assert.equal(classifyEmailChange(null), "rejected")
})
