export class AppError extends Error {
  public readonly statusCode: number;
  public readonly success: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name; // 'AppError'
    this.statusCode = statusCode;
    this.success = false;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Reusable throw helpers for clarity
export const throwBadRequest = (message: string) => {
  throw new AppError(message, 400);
};

export const throwUnauthorized = (message: string) => {
  throw new AppError(message, 401);
};

export const throwForbidden = (message: string) => {
  throw new AppError(message, 403);
};

export const throwNotFound = (message: string) => {
  throw new AppError(message, 404);
};

export const throwServerError = (message: string) => {
  throw new AppError(message, 500);
};
