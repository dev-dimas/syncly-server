import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import type { NextFunction, Response } from 'express';
import httpStatus from 'http-status';
import { HttpException } from 'src/utils/http-exception.util';
import type {
  ChangePasswordDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO
} from 'src/validations/password.validation';
import prismaClient from '../config/prisma';
import type { ValidatedRequest } from '../types/types';
import { sendResetEmail } from '../utils/send-email.util';

/**
 * Sends Forgot password email
 */
export const handleForgotPassword = async (
  req: ValidatedRequest<ForgotPasswordDTO>,
  res: Response
) => {
  const { email } = req.body;

  const user = await prismaClient.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (!user) {
    return res.status(200).json({
      message:
        'We will send you an email to reset your password if the email is registered'
    });
  }

  const resetTokenExist = await prismaClient.resetPassword.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { token: true, expiresAt: true }
  });

  if (resetTokenExist) {
    if (dayjs(resetTokenExist.expiresAt).isBefore(dayjs())) {
      sendResetEmail(email, resetTokenExist.token);
      return res.status(200).json({
        message:
          'We will send you an email to reset your password if the email is registered'
      });
    } else {
      await prismaClient.resetPassword.deleteMany({
        where: {
          userId: user.id
        }
      });
    }
  }

  const resetToken = randomUUID();
  const expiresAt = dayjs().add(1, 'hour').toDate();
  await prismaClient.resetPassword.create({
    data: {
      token: resetToken,
      expiresAt,
      userId: user.id
    }
  });

  sendResetEmail(email, resetToken);

  return res.status(200).json({
    message:
      'We will send you an email to reset your password if the email is registered'
  });
};

/**
 * Handles Password reset
 */
export const handleResetPassword = async (
  req: ValidatedRequest<ResetPasswordDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) return res.sendStatus(400);

    const resetToken = await prismaClient.resetPassword.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      select: { userId: true }
    });

    if (!resetToken) {
      throw new HttpException(
        httpStatus.UNAUTHORIZED,
        'Invalid or expired token'
      );
    }

    const hashedPassword = await argon2.hash(newPassword);
    await prismaClient.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
      select: { id: true }
    });

    await prismaClient.resetPassword.deleteMany({
      where: { userId: resetToken.userId }
    });

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles Password change
 */

export const handleChangePassword = async (
  req: ValidatedRequest<ChangePasswordDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.payload?.userId) throw new HttpException(httpStatus.UNAUTHORIZED);

    const { currentPassword, newPassword } = req.body;

    const user = await prismaClient.user.findUnique({
      where: { id: req.payload.userId },
      select: { password: true }
    });

    if (!user) throw new HttpException(httpStatus.UNAUTHORIZED);

    const isCurrentPasswordMatch = await argon2.verify(
      user.password,
      currentPassword
    );

    if (!isCurrentPasswordMatch) {
      throw new HttpException(
        httpStatus.UNAUTHORIZED,
        'Current password is incorrect'
      );
    }

    const hashedPassword = await argon2.hash(newPassword);
    await prismaClient.user.update({
      where: { id: req.payload.userId },
      data: { password: hashedPassword },
      select: { id: true }
    });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
