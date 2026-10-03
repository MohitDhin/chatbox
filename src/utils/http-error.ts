export class HttpError extends Error {
  public readonly statusCode: number;

  public constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const isHttpError = (error: unknown): error is HttpError =>
  error instanceof HttpError;
