import jwt from 'jsonwebtoken';
import config from 'src/config/config';
import { createAccessToken } from 'src/utils/generate-tokens.util';

jest.mock('jsonwebtoken');

const mockedSign = jwt.sign as jest.Mock<string>;

describe('createAccessToken', () => {
  it('should generate a valid access token with a numeric userId', () => {
    mockedSign.mockReturnValue('mocked-token');

    const userId = 123;
    const token = createAccessToken(userId);

    expect(mockedSign).toHaveBeenCalledWith(
      { userId },
      config.jwt.access_token.secret,
      { expiresIn: config.jwt.access_token.expire }
    );
    expect(token).toBe('mocked-token');
  });

  it('should generate a valid access token with a string userId', () => {
    mockedSign.mockReturnValue('mocked-token');

    const userId = 'user123';
    const token = createAccessToken(userId);

    expect(mockedSign).toHaveBeenCalledWith(
      { userId },
      config.jwt.access_token.secret,
      { expiresIn: config.jwt.access_token.expire }
    );
    expect(token).toBe('mocked-token');
  });

  it('should throw an error if jwt.sign fails', () => {
    mockedSign.mockImplementation(() => {
      throw new Error('Sign error');
    });

    expect(() => createAccessToken(123)).toThrow('Sign error');
  });
});
