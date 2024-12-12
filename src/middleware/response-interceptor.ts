import type { NextFunction, Request, Response } from 'express';

export const responseInterceptor = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json;

  res.json = function (body: Record<string, unknown>): Response {
    const modifiedJson = { status: this.statusCode, ...body };

    return originalJson.call(this, modifiedJson);
  };

  next();
};
