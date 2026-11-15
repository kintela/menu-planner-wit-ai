const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../../..")

test("guarded actions proceed directly when clean and cancel without side effects when dirty", () => {
  const { runGuardedMenuAction } = require("../../../lib/weekly-menu/weekly-menu-unsaved-guard")
  const events = []
  assert.equal(runGuardedMenuAction({
    dirty: false,
    confirmDiscard: () => { throw new Error("clean actions must not prompt") },
    discardDraft: () => events.push("discard"),
    action: () => events.push("action"),
  }), true)
  assert.deepEqual(events, ["action"])

  events.length = 0
  assert.equal(runGuardedMenuAction({
    dirty: true,
    confirmDiscard: () => false,
    discardDraft: () => events.push("discard"),
    action: () => events.push("action"),
  }), false)
  assert.deepEqual(events, [])
})

test("confirming discards only the draft before performing exactly one requested action", () => {
  const { runGuardedMenuAction } = require("../../../lib/weekly-menu/weekly-menu-unsaved-guard")
  const state = { week: "2026-10-26", target: "opaque", saved: [{ recipe_id: 1 }], draft: [{ recipe_id: 2 }] }
  const originalSaved = state.saved
  const events = []
  const proceeded = runGuardedMenuAction({
    dirty: true,
    confirmDiscard: () => { events.push("confirm"); return true },
    discardDraft: () => { events.push("discard"); state.draft = state.saved },
    action: () => events.push("action"),
  })
  assert.equal(proceeded, true)
  assert.deepEqual(events, ["confirm", "discard", "action"])
  assert.equal(state.week, "2026-10-26")
  assert.equal(state.target, "opaque")
  assert.equal(state.saved, originalSaved)
  assert.equal(state.draft, originalSaved)
})

test("beforeunload uses only the native contract while dirty", () => {
  const { createBeforeUnloadHandler } = require("../../../lib/weekly-menu/weekly-menu-unsaved-guard")
  let dirty = false
  const handler = createBeforeUnloadHandler(() => dirty)
  const cleanEvent = { preventDefault() { throw new Error("clean unload must not be blocked") } }
  assert.equal(handler(cleanEvent), undefined)

  dirty = true
  let prevented = 0
  const dirtyEvent = { returnValue: "not-custom", preventDefault() { prevented += 1 } }
  assert.equal(handler(dirtyEvent), "")
  assert.equal(prevented, 1)
  assert.equal(dirtyEvent.returnValue, "")
})

test("popstate adapter restores a cancelled traversal once and does not duplicate prompts", () => {
  const { createPopStateHandler } = require("../../../lib/weekly-menu/weekly-menu-unsaved-guard")
  let prompts = 0
  let restores = 0
  const handler = createPopStateHandler({
    isDirty: () => true,
    attemptTraversal: () => { prompts += 1; return false },
    restoreTraversal: () => { restores += 1 },
  })
  handler()
  handler() // compensating popstate caused by history.forward()
  handler()
  assert.equal(prompts, 2)
  assert.equal(restores, 2)
})

test("route links and non-link exits are cancelled before abandoning a dirty draft", () => {
  const {
    createDocumentLinkHandler,
    createMenuExitRequestHandler,
  } = require("../../../lib/weekly-menu/weekly-menu-unsaved-guard")
  const events = []
  const anchor = { href: "http://localhost/recipes", target: "", hasAttribute: () => false }
  const linkEvent = {
    button: 0,
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: { closest: () => anchor },
    preventDefault() { events.push("prevent-link") },
    stopImmediatePropagation() { events.push("stop-link") },
  }
  const linkHandler = createDocumentLinkHandler({
    isDirty: () => true,
    confirmDiscard: () => false,
    discardDraft: () => events.push("discard"),
    currentOrigin: "http://localhost",
  })
  assert.equal(linkHandler(linkEvent), false)
  assert.deepEqual(events, ["prevent-link", "stop-link"])

  const exitEvent = { preventDefault() { events.push("prevent-exit") } }
  const exitHandler = createMenuExitRequestHandler({
    isDirty: () => true,
    confirmDiscard: () => false,
    discardDraft: () => events.push("discard"),
  })
  assert.equal(exitHandler(exitEvent), false)
  assert.deepEqual(events, ["prevent-link", "stop-link", "prevent-exit"])
})

test("weekly planner routes every controlled draft-replacing or exit action through one guard", () => {
  const component = fs.readFileSync(path.join(root, "components/weekly-menu-view.tsx"), "utf8")
  const hook = fs.readFileSync(path.join(root, "hooks/use-unsaved-menu-guard.ts"), "utf8")

  assert.match(component, /useUnsavedMenuGuard/)
  for (const action of ["navigateToWeek", "navigateToCurrentWeek", "changeTarget", "copySource", "restoreDraft"]) {
    assert.match(component, new RegExp(`runGuardedAction\\([^)]*${action}|${action}[\\s\\S]{0,350}runGuardedAction`), action)
  }
  assert.match(hook, /addEventListener\(["']beforeunload["']/)
  assert.match(hook, /removeEventListener\(["']beforeunload["']/)
  assert.match(hook, /addEventListener\(["']popstate["']/)
  assert.match(hook, /removeEventListener\(["']popstate["']/)
  assert.match(hook, /addEventListener\(["']click["']/)
  assert.match(hook, /removeEventListener\(["']click["']/)
  assert.match(hook, /weekly-menu:request-exit/)
  assert.doesNotMatch(hook, /router\.(?:push|replace)\s*=|history\.(?:pushState|replaceState)\s*=/)
})

test("navigation sign-out asks the weekly-menu guard before destroying the session", () => {
  const navigation = fs.readFileSync(path.join(root, "components/simple-navigation.tsx"), "utf8")
  assert.match(navigation, /requestWeeklyMenuExit/)
  assert.match(navigation, /if \(!requestWeeklyMenuExit\(\)\) return/)
})

test("planner derives dirty canonically, resets only after successful save/empty, and requests copy only after guard", () => {
  const component = fs.readFileSync(path.join(root, "components/weekly-menu-view.tsx"), "utf8")
  assert.match(component, /editable\s*&&\s*hasUnsavedChanges\(savedSnapshot, draft,/)
  assert.match(component, /const payload = await responsePayload\(response\)[\s\S]{0,250}setSavedSnapshot\(persisted\.saved_snapshot\)[\s\S]{0,100}setDraft\(persisted\.saved_snapshot\)/)
  assert.match(component, /await responsePayload\(response\)[\s\S]{0,250}setSavedSnapshot\(\[\]\)[\s\S]{0,100}setDraft\(\[\]\)/)
  assert.match(component, /const copySource\s*=\s*\(\)\s*=>\s*{\s*runGuardedAction\(\(\)\s*=>\s*void performCopySource\(\)\)\s*}/)
  assert.match(component, /const performCopySource[\s\S]{0,350}fetch\(["']\/api\/weekly-menu\/copy["']/)
  assert.doesNotMatch(component, /catch\s*\([^)]*\)\s*{[^}]*setSavedSnapshot/)
})
