import { getReasonPhrase, type StatusCodes } from 'http-status-codes';

export class HttpException extends Error {
  public readonly status: number;

  constructor(status: StatusCodes, message?: string) {
    super(message ?? getReasonPhrase(status));
    this.status = status;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
