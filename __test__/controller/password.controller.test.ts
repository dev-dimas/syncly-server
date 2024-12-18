/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { type Response } from 'express';
import prismaClient from 'src/config/prisma';
import {
  handleChangePassword,
  handleForgotPassword,
  handleResetPassword
} from 'src/controller/password.controller';
import type { ValidatedRequest } from 'src/types/types';
import * as argon2 from 'argon2';
import { sendResetEmail } from 'src/utils/send-email.util';
import type {
  ChangePasswordDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO
} from 'src/validations/password.validation';
import dayjs from 'dayjs';

jest.mock('src/config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  resetPassword: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  }
}));

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn()
}));

jest.mock('src/utils/send-email.util', () => ({
  sendResetEmail: jest.fn()
}));

describe('Password Controller', () => {
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendStatus: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleForgotPassword', () => {
    const mockReq: Partial<ValidatedRequest<ForgotPasswordDTO>> = {
      body: { email: 'test@example.com' }
    };

    it('should handle non-existent email gracefully', async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue(null);

      await handleForgotPassword(
        mockReq as ValidatedRequest<ForgotPasswordDTO>,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          'We will send you an email to reset your password if the email is registered'
      });
      expect(sendResetEmail).not.toHaveBeenCalled();
    });

    it('should create new reset token if none exists', async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1'
      });
      (prismaClient.resetPassword.findFirst as jest.Mock).mockResolvedValue(
        null
      );

      await handleForgotPassword(
        mockReq as ValidatedRequest<ForgotPasswordDTO>,
        mockRes as Response
      );

      expect(prismaClient.resetPassword.create).toHaveBeenCalled();
      expect(sendResetEmail).toHaveBeenCalled();
    });

    it('should reuse existing valid token', async () => {
      const mockToken = {
        token: 'valid-token',
        expiresAt: dayjs().add(30, 'minutes').toDate()
      };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1'
      });
      (prismaClient.resetPassword.findFirst as jest.Mock).mockResolvedValue(
        mockToken
      );

      await handleForgotPassword(
        mockReq as ValidatedRequest<ForgotPasswordDTO>,
        mockRes as Response
      );

      expect(sendResetEmail).toHaveBeenCalledWith(
        mockReq.body?.email,
        mockToken.token
      );
    });

    it('should delete expired token and create new one', async () => {
      const mockExpiredToken = {
        token: 'expired-token',
        expiresAt: dayjs().subtract(1, 'hour').toDate()
      };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1'
      });
      (prismaClient.resetPassword.findFirst as jest.Mock).mockResolvedValue(
        mockExpiredToken
      );

      await handleForgotPassword(
        mockReq as ValidatedRequest<ForgotPasswordDTO>,
        mockRes as Response
      );

      expect(prismaClient.resetPassword.deleteMany).toHaveBeenCalled();
      expect(prismaClient.resetPassword.create).toHaveBeenCalled();
      expect(sendResetEmail).toHaveBeenCalled();
    });
  });

  describe('handleResetPassword', () => {
    const mockReq: Partial<ValidatedRequest<ResetPasswordDTO>> = {
      params: { token: 'valid-token' },
      body: { newPassword: 'newPassword123' }
    };

    it('should successfully reset password with valid token', async () => {
      const mockUserId = '1';
      const mockHashedPassword = 'hashedPassword123';

      (prismaClient.resetPassword.findFirst as jest.Mock).mockResolvedValue({
        userId: mockUserId
      });
      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);

      await handleResetPassword(
        mockReq as ValidatedRequest<ResetPasswordDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { password: mockHashedPassword },
        select: { id: true }
      });
      expect(prismaClient.resetPassword.deleteMany).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle invalid token', async () => {
      (prismaClient.resetPassword.findFirst as jest.Mock).mockResolvedValue(
        null
      );

      await handleResetPassword(
        mockReq as ValidatedRequest<ResetPasswordDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.user.update).not.toHaveBeenCalled();
    });

    it('should handle missing token', async () => {
      const reqWithoutToken = {
        ...mockReq,
        params: {}
      };

      await handleResetPassword(
        reqWithoutToken as ValidatedRequest<ResetPasswordDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.sendStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('handleChangePassword', () => {
    const mockReq: Partial<ValidatedRequest<ChangePasswordDTO>> = {
      payload: { userId: '1' },
      body: {
        currentPassword: 'currentPass123',
        newPassword: 'newPass123'
      }
    };

    it('should successfully change password with correct credentials', async () => {
      const mockHashedPassword = 'hashedPassword123';
      const mockUser = { password: 'currentHashedPassword' };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);

      await handleChangePassword(
        mockReq as ValidatedRequest<ChangePasswordDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: mockReq.payload?.userId },
        data: { password: mockHashedPassword },
        select: { id: true }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle incorrect current password', async () => {
      const mockUser = { password: 'currentHashedPassword' };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await handleChangePassword(
        mockReq as ValidatedRequest<ChangePasswordDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.user.update).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue(null);

      await handleChangePassword(
        mockReq as ValidatedRequest<ChangePasswordDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(argon2.verify).not.toHaveBeenCalled();
    });

    it('should handle missing userId in payload', async () => {
      const reqWithoutUserId = {
        ...mockReq,
        payload: undefined
      };

      await handleChangePassword(
        reqWithoutUserId as ValidatedRequest<ChangePasswordDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
