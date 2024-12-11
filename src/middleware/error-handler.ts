import type { NextFunction, Request, Response } from 'express';
import { HttpException } from 'src/utils/http-exception.util';
import logger from './logger';

export const errorHandler = (
  err: unknown,
  _: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error((err as Error).message);

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).send({ status: 400, message: 'Bad Request' });
  }

  if (err instanceof HttpException) {
    return res.status(err.status).json({
      status: err.status,
      message: err.message
    });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      message: 'Invalid body format'
    });
  }

  res.status(500).json({ message: 'Internal Server Error' });
};
