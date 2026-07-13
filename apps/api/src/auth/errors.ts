export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const forbidden = (message = 'You do not have access to this action') =>
  new AppError(403, message);

export const unauthorized = (message = 'Please log in to continue') => new AppError(401, message);
