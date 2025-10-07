export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const createNotFoundError = (message: string) =>
  new ApiError(404, 'not_found', message);
