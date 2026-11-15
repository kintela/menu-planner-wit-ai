function runGuardedMenuAction({ dirty, confirmDiscard, discardDraft, action }) {
  if (!dirty) {
    action()
    return true
  }
  if (!confirmDiscard()) return false
  discardDraft()
  action()
  return true
}

function createBeforeUnloadHandler(isDirty) {
  return function beforeUnload(event) {
    if (!isDirty()) return undefined
    event.preventDefault()
    // Browsers intentionally control the message shown by the native dialog.
    event.returnValue = ""
    return ""
  }
}

function createPopStateHandler({ isDirty, attemptTraversal, restoreTraversal }) {
  let ignoreCompensatingTraversal = false
  return function popState() {
    if (ignoreCompensatingTraversal) {
      ignoreCompensatingTraversal = false
      return
    }
    if (!isDirty()) return
    if (!attemptTraversal()) {
      ignoreCompensatingTraversal = true
      restoreTraversal()
    }
  }
}

function createDocumentLinkHandler({ isDirty, confirmDiscard, discardDraft, currentOrigin }) {
  return function documentLinkClick(event) {
    if (!isDirty() || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return undefined
    const anchor = event.target?.closest?.("a[href]")
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute?.("download")) return undefined
    let destination
    try {
      destination = new URL(anchor.href)
    } catch {
      return undefined
    }
    if (destination.origin !== currentOrigin || destination.hash &&
        destination.pathname === globalThis.location?.pathname &&
        destination.search === globalThis.location?.search) return undefined
    if (!confirmDiscard()) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return false
    }
    discardDraft()
    return true
  }
}

function createMenuExitRequestHandler({ isDirty, confirmDiscard, discardDraft }) {
  return function menuExitRequest(event) {
    if (!isDirty()) return true
    if (!confirmDiscard()) {
      event.preventDefault()
      return false
    }
    discardDraft()
    return true
  }
}

function requestWeeklyMenuExit() {
  if (typeof window === "undefined") return true
  return window.dispatchEvent(new CustomEvent("weekly-menu:request-exit", { cancelable: true }))
}

module.exports = {
  createBeforeUnloadHandler,
  createDocumentLinkHandler,
  createMenuExitRequestHandler,
  createPopStateHandler,
  requestWeeklyMenuExit,
  runGuardedMenuAction,
}
