/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { NextFunction, Request, Response } from 'express';

import { StatusCodes } from 'http-status-codes';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { HttpException } from 'src/utils/http-exception.util';
import config from '../config/config';

const { verify } = jwt;

const isAuth = (req: Request, _res: Response, next: NextFunction) => {
  // token looks like 'Bearer vnjaknvijdaknvikbnvreiudfnvriengviewjkdsbnvierj'

  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader?.startsWith('Bearer ')) {
    throw new HttpException(StatusCodes.UNAUTHORIZED);
  }

  const token: string | undefined = authHeader.split(' ')[1];

  if (!token) throw new HttpException(StatusCodes.UNAUTHORIZED);

  verify(
    token,
    config.jwt.access_token.secret,
    // @ts-expect-error
    (err: unknown, payload: JwtPayload) => {
      if (err) throw new HttpException(StatusCodes.FORBIDDEN);
      req.payload = payload;

      next();
    }
  );
};

export default isAuth;
