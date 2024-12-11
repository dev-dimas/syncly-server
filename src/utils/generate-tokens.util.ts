import jwt from 'jsonwebtoken';
import config from '../config/config';

const { sign } = jwt;

/**
 * This functions generates a valid access token
 *
 * @param {number | string} userId - The user id of the user that owns this jwt
 * @returns Returns a valid access token
 */
export const createAccessToken = (userId: number | string): string => {
  return sign({ userID: userId }, config.jwt.access_token.secret, {
    expiresIn: config.jwt.access_token.expire
  });
};
