import { ApiError, ApiUnreachableError } from '../lib/api'

export function ErrorNotice({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const text =
    error instanceof ApiUnreachableError
      ? 'The API is not responding. On free hosting it sleeps when idle and can take up to a minute to start.'
      : error.message
  const correlationId = error instanceof ApiError ? error.correlationId : undefined
  return (
    <div className="notice notice-danger" role="alert">
      <span>{text}</span>
      {correlationId && <span className="mono muted-small"> Reference {correlationId}</span>}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm notice-action" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
