import { config } from './config'

export class ApiError extends Error {
  status: number
  correlationId?: string
  fieldErrors?: Record<string, string[]>

  constructor(status: number, message: string, correlationId?: string, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.correlationId = correlationId
    this.fieldErrors = fieldErrors
  }
}

/** Thrown when the API cannot be reached at all, e.g. while the free Render host is waking up. */
export class ApiUnreachableError extends Error {}

type AuthHeaders = () => Promise<Record<string, string>>
let authHeaders: AuthHeaders = async () => ({})
let onUnauthorized: () => void = () => {}

export function configureApiAuth(headers: AuthHeaders, unauthorized: () => void) {
  authHeaders = headers
  onUnauthorized = unauthorized
}

interface ProblemDetails {
  title?: string
  detail?: string
  correlationId?: string
  errors?: Record<string, string[]>
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeaders()),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiUnreachableError('The API could not be reached.')
  }

  if (response.status === 401) onUnauthorized()

  if (!response.ok) {
    let problem: ProblemDetails = {}
    try {
      problem = await response.json()
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      response.status,
      problem.detail ?? problem.title ?? `Request failed (${response.status})`,
      problem.correlationId ?? response.headers.get('X-Correlation-ID') ?? undefined,
      problem.errors,
    )
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}
