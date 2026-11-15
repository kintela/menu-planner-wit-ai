export interface GuardedMenuActionOptions {
  dirty: boolean
  confirmDiscard: () => boolean
  discardDraft: () => void
  action: () => void
}

export function runGuardedMenuAction(options: GuardedMenuActionOptions): boolean
export function createBeforeUnloadHandler(isDirty: () => boolean): (event: BeforeUnloadEvent) => string | undefined
export function createDocumentLinkHandler(options: {
  isDirty: () => boolean
  confirmDiscard: () => boolean
  discardDraft: () => void
  currentOrigin: string
}): (event: MouseEvent) => boolean | undefined
export function createMenuExitRequestHandler(options: {
  isDirty: () => boolean
  confirmDiscard: () => boolean
  discardDraft: () => void
}): (event: Event) => boolean
export function createPopStateHandler(options: {
  isDirty: () => boolean
  attemptTraversal: () => boolean
  restoreTraversal: () => void
}): () => void
export function requestWeeklyMenuExit(): boolean
