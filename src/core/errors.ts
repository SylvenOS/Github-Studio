export type ErrorCode = 'bad_request' | 'not_found' | 'rate_limited' | 'upstream' | 'internal';

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  rate_limited: 429,
  upstream: 502,
  internal: 500
};

export class ApiError extends Error {
  readonly status: number;
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
    this.status = STATUS[code];
  }
}

export const badRequest = (m: string) => new ApiError('bad_request', m);
export const notFound = (m: string) => new ApiError('not_found', m);
export const rateLimited = (m: string) => new ApiError('rate_limited', m);
export const upstream = (m: string) => new ApiError('upstream', m);

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  console.error(e);
  return new ApiError('internal', 'Unexpected error while generating the card');
}
