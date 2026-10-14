export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, 'bad_request', details);
  }
  static unauthorized(message = 'Not signed in') {
    return new AppError(401, message, 'unauthorized');
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new AppError(403, message, 'forbidden');
  }
  static notFound(message = 'Not found') {
    return new AppError(404, message, 'not_found');
  }
  static conflict(message: string, details?: unknown) {
    return new AppError(409, message, 'conflict', details);
  }
}

/** Throw if a Supabase call returned an error. */
export function unwrap<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error) throw result.error;
  return result.data;
}
