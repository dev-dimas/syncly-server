import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import type { Response } from 'express';
import httpStatus from 'http-status';
import {
  type ForgotPasswordDTO,
  type ResetPasswordDTO
} from 'src/validations/password.validation';
import prismaClient from '../config/prisma';
import type { ValidatedRequest } from '../types/types';
import { sendResetEmail } from '../utils/send-email.util';

/**
 * Sends Forgot password email
 * @param req
 * @param res
 * @returns
 */
export const handleForgotPassword = async (
  req: ValidatedRequest<ForgotPasswordDTO>,
  res: Response
) => {
  const { email } = req.body;

  const user = await prismaClient.user.findUnique({
    where: { email },
    select: {
      id: true
    }
  });

  if (!user) {
    return res.status(200).json({
      message:
        'We will send you an email to reset your password if the email is registered'
    });
  }

  const resetTokenExist = await prismaClient.resetPassword.findFirst({
    where: {
      userId: user.id
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      token: true,
      expiresAt: true
    }
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
 * @param req
 * @param res
 * @returns
 */
export const handleResetPassword = async (
  req: ValidatedRequest<ResetPasswordDTO>,
  res: Response
) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token) return res.sendStatus(400);

  const resetToken = await prismaClient.resetPassword.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true }
  });

  if (!resetToken) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const hashedPassword = await argon2.hash(newPassword);
  await prismaClient.user.update({
    where: { id: resetToken.userId },
    data: { password: hashedPassword }
  });

  await prismaClient.resetPassword.deleteMany({
    where: { userId: resetToken.userId }
  });

  return res
    .status(httpStatus.OK)
    .json({ message: 'Password reset successful' });
};
