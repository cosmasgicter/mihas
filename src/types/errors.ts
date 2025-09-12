export interface AppError {
  message: string
  code?: string
  details?: unknown
}

export function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && error !== null && 'message' in error
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}