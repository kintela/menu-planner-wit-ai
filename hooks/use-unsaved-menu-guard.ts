"use client"

import { useCallback, useEffect } from "react"
import {
  createBeforeUnloadHandler,
  createDocumentLinkHandler,
  createMenuExitRequestHandler,
  createPopStateHandler,
  runGuardedMenuAction,
} from "@/lib/weekly-menu/weekly-menu-unsaved-guard"

const DISCARD_MESSAGE = "Hay cambios pendientes. ¿Quieres descartarlos y continuar?"

interface UseUnsavedMenuGuardOptions {
  dirty: boolean
  discardDraft: () => void
}

export function useUnsavedMenuGuard({ dirty, discardDraft }: UseUnsavedMenuGuardOptions) {
  const runGuardedAction = useCallback((action: () => void) => runGuardedMenuAction({
    dirty,
    confirmDiscard: () => window.confirm(DISCARD_MESSAGE),
    discardDraft,
    action,
  }), [dirty, discardDraft])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = createBeforeUnloadHandler(() => dirty)
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    const confirmDiscard = () => window.confirm(DISCARD_MESSAGE)
    const documentLink = createDocumentLinkHandler({
      isDirty: () => dirty,
      confirmDiscard,
      discardDraft,
      currentOrigin: window.location.origin,
    })
    const requestedExit = createMenuExitRequestHandler({
      isDirty: () => dirty,
      confirmDiscard,
      discardDraft,
    })
    document.addEventListener("click", documentLink, true)
    window.addEventListener("weekly-menu:request-exit", requestedExit)
    return () => {
      document.removeEventListener("click", documentLink, true)
      window.removeEventListener("weekly-menu:request-exit", requestedExit)
    }
  }, [dirty, discardDraft])

  useEffect(() => {
    if (!dirty) return
    const popState = createPopStateHandler({
      isDirty: () => dirty,
      attemptTraversal: () => runGuardedAction(() => undefined),
      // A cancelled browser-back traversal is compensable while this entry
      // remains in the same document. The following popstate is suppressed.
      restoreTraversal: () => window.history.forward(),
    })
    window.addEventListener("popstate", popState)
    return () => window.removeEventListener("popstate", popState)
  }, [dirty, runGuardedAction])

  return { runGuardedAction }
}
