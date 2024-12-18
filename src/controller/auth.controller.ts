import * as argon2 from 'argon2';
import type { NextFunction, Response } from 'express';
import httpStatus from 'http-status';
import { StatusCodes } from 'http-status-codes';
import { HttpException } from 'src/utils/http-exception.util';
import type { LoginDTO, SignUpDTO } from 'src/validations/auth.validation';
import prismaClient from '../config/prisma';
import type { ValidatedRequest } from '../types/types';
import { createAccessToken } from '../utils/generate-tokens.util';

/**
 * This function handles the signup process for new users.
 */
export const handleSignUp = async (
  req: ValidatedRequest<SignUpDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    const checkUserEmail = await prismaClient.user.findUnique({
      where: { email },
      select: { email: true }
    });

    if (checkUserEmail) {
      throw new HttpException(
        StatusCodes.CONFLICT,
        'Email already registered!'
      );
    }
    const hashedPassword = await argon2.hash(password);

    const user = await prismaClient.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      },
      select: {
        id: true
      }
    });

    const accessToken = createAccessToken(user.id);

    res.status(httpStatus.CREATED).json({
      message: 'Account created!',
      data: {
        name,
        email,
        access_token: accessToken
      }
    });
  } catch (error) {
    next();
  }
};

/**
 * This function handles the login process for users.
 */
export const handleLogin = async (
  req: ValidatedRequest<LoginDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await prismaClient.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true }
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

    return res.json({ data: { access_token: accessToken } });
  } catch (error) {
    next(error);
  }
};
