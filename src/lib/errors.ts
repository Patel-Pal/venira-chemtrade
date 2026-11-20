/** Safe, typed application errors. `message` is always safe to show to clients. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'BAD_REQUEST',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  badRequest: (m = 'Invalid request', details?: unknown) => new AppError(m, 400, 'BAD_REQUEST', details),
  unauthorized: (m = 'Authentication required') => new AppError(m, 401, 'UNAUTHORIZED'),
  forbidden: (m = 'You do not have permission to perform this action') => new AppError(m, 403, 'FORBIDDEN'),
  notFound: (m = 'Resource not found') => new AppError(m, 404, 'NOT_FOUND'),
  conflict: (m = 'Conflict') => new AppError(m, 409, 'CONFLICT'),
  tooMany: (m = 'Too many requests. Please try again later.') => new AppError(m, 429, 'RATE_LIMITED'),
  unprocessable: (m = 'Unprocessable request', details?: unknown) => new AppError(m, 422, 'UNPROCESSABLE', details),
};
