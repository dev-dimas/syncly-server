import {
  accessTokenCookieConfig,
  clearAccessTokenCookieConfig
} from 'src/config/cookie-config';

describe('Cookie Configuration', () => {
  test('accessTokenCookieConfig should have correct values', () => {
    expect(accessTokenCookieConfig).toEqual({
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 24 * 60 * 60 * 1000
    });
  });

  test('clearAccessTokenCookieConfig should have correct values', () => {
    expect(clearAccessTokenCookieConfig).toEqual({
      httpOnly: true,
      sameSite: 'none',
      secure: true
    });
  });
});
