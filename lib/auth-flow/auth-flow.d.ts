export type CallbackFailureCode = "recovery_expired" | "recovery_error" | "auth_error"

export const CALLBACK_NOTICES: Readonly<Record<CallbackFailureCode, string>>

export function classifyCallbackFailure(input?: {
  type?: string | null
  errorCode?: string | null
}): CallbackFailureCode

export function getCallbackNotice(code: string | null | undefined): string | null

export function runSignOut(deps: {
  requestServerSignOut: () => Promise<boolean>
  clearLocalSession: () => Promise<unknown>
  clearState: () => void
  navigateToLogin: () => void
}): Promise<boolean>
