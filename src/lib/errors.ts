/**
 * Extract a human-readable message from anything thrown. Supabase database
 * errors are plain objects (not Error instances), so `instanceof Error`
 * alone swallows the real reason.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error) return err.message || fallback
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message || fallback
  }
  return fallback
}
