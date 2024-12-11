import * as argon2 from 'argon2';
import type { NextFunction, Response } from 'express';
import httpStatus from 'http-status';
import { StatusCodes } from 'http-status-codes';
import { HttpException } from 'src/utils/http-exception.util';
import type { LoginDTO, SignUpDTO } from 'src/validations/auth.validation';
import prismaClient from '../config/prisma';
import type { ValidatedRequest } from '../types/types';
import { createAccessToken } from '../utils/generate-tokens.util';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment

/**
 * This function handles the signup process for new users. It expects a request object with the following properties:
 *
 * @param {TypedRequest<UserSignUpCredentials>} req - The request object that includes user's username, email, and password.
 * @param {Response} res - The response object that will be used to send the HTTP response.
 *
 * @returns {Response} Returns an HTTP response that includes one of the following:
 *   - A 400 BAD REQUEST status code and an error message if the request body is missing any required parameters.
 *   - A 409 CONFLICT status code if the user email already exists in the database.
 *   - A 201 CREATED status code and a success message if the new user is successfully created and a verification email is sent.
 *   - A 500 INTERNAL SERVER ERROR status code if there is an error in the server.
 */
export const handleSignUp = async (
  req: ValidatedRequest<SignUpDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    const checkUserEmail = await prismaClient.user.findUnique({
      where: {
        email
      }
    });

    if (checkUserEmail) {
      throw new HttpException(
        StatusCodes.CONFLICT,
        'Email already registered!'
      );
    }
    const hashedPassword = await argon2.hash(password);

    await prismaClient.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    res.status(httpStatus.CREATED).json({
      message: 'Account created!',
      data: {
        name,
        email
      }
    });
  } catch (error) {
    next();
  }
};

/**
 * This function handles the login process for users. It expects a request object with the following properties:
 *
 * @param {TypedRequest<UserLoginCredentials>} req - The request object that includes user's email and password.
 * @param {Response} res - The response object that will be used to send the HTTP response.
 *
 * @returns {Response} Returns an HTTP response that includes one of the following:
 *   - A 400 BAD REQUEST status code and an error message if the request body is missing any required parameters.
 *   - A 401 UNAUTHORIZED status code if the user email does not exist in the database or the email is not verified or the password is incorrect.
 *   - A 200 OK status code and an access token if the login is successful and a new refresh token is stored in the database and a new refresh token cookie is set.
 *   - A 500 INTERNAL SERVER ERROR status code if there is an error in the server.
 */
export const handleLogin = async (
  req: ValidatedRequest<LoginDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await prismaClient.user.findUnique({
      where: {
        email
      }
    });

    if (!user) {
      throw new HttpException(
        StatusCodes.UNAUTHORIZED,
        'Invalid email or password!'
      );
    }

    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      throw new HttpException(
        StatusCodes.UNAUTHORIZED,
        'Invalid email or password!'
      );
    }

    const accessToken = createAccessToken(user.id);

    return res.json({ accessToken });
  } catch (error) {
    next(error);
  }
};
