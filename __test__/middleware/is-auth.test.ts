/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck

import httpStatus from 'http-status';
import type { NextFunction, Request, Response } from 'express';
import isAuth from 'src/middleware/is-auth';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import config from 'src/config/config';
import { HttpException } from 'src/utils/http-exception.util';

const { sign } = jwt;

describe('isAuth middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw HttpException with status 401 if no authorization header is present', () => {
    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(HttpException);
    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(expect.objectContaining({ status: httpStatus.UNAUTHORIZED }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw HttpException with status 401 if authorization header is empty', () => {
    req.headers = { authorization: '' };

    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(HttpException);
    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(expect.objectContaining({ status: httpStatus.UNAUTHORIZED }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw HttpException with status 401 if authorization header does not start with "Bearer "', () => {
    req.headers = { authorization: 'InvalidToken' };

    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(HttpException);
    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(expect.objectContaining({ status: httpStatus.UNAUTHORIZED }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw HttpException with status 401 if token is empty', () => {
    req.headers = { authorization: 'Bearer ' };

    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(HttpException);
    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(expect.objectContaining({ status: httpStatus.UNAUTHORIZED }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw HttpException with status 403 if token is invalid', () => {
    req.headers = { authorization: 'Bearer invalidtoken' };

    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(HttpException);
    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(expect.objectContaining({ status: httpStatus.FORBIDDEN }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw HttpException with status 403 if token is expired', () => {
    const expiredToken = sign(
      { userId: '123' },
      config.jwt.access_token.secret,
      { expiresIn: '0s' }
    );
    req.headers = { authorization: `Bearer ${expiredToken}` };

    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(HttpException);
    expect(() => {
      isAuth(req as Request, res as Response, next);
    }).toThrow(expect.objectContaining({ status: httpStatus.FORBIDDEN }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should set payload and call next() if token is valid', () => {
    const payload: JwtPayload = { userId: '123' };
    const token = sign(payload, config.jwt.access_token.secret);
    req.headers = { authorization: `Bearer ${token}` };

    isAuth(req as Request, res as Response, next);

    expect(req.payload).toEqual(expect.objectContaining(payload));
    expect(next).toHaveBeenCalledTimes(1);
  });
});
