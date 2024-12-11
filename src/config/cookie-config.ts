import type { CookieOptions } from 'express';

export const accessTokenCookieConfig: CookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  maxAge: 24 * 60 * 60 * 1000
};

export const clearAccessTokenCookieConfig: CookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: true
};
