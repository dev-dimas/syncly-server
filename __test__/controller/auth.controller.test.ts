/* eslint-disable @typescript-eslint/no-explicit-any */
import { handleLogin, handleSignUp } from 'src/controller/auth.controller';
import prismaClient from 'src/config/prisma';
import * as argon2 from 'argon2';
import { createAccessToken } from 'src/utils/generate-tokens.util';
import type { Response } from 'express';
import httpStatus from 'http-status';

jest.mock('src/config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn()
}));

jest.mock('src/utils/generate-tokens.util', () => ({
  createAccessToken: jest.fn()
}));

describe('Auth Controller', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleSignUp', () => {
    it('should create a new user and return access token', async () => {
      const mockHashedPassword = 'hashedPassword123';
      const mockUserId = 1;
      const mockAccessToken = 'mockAccessToken';

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      (prismaClient.user.create as jest.Mock).mockResolvedValue({
        id: mockUserId
      });
      (createAccessToken as jest.Mock).mockReturnValue(mockAccessToken);

      await handleSignUp(mockReq, mockRes as Response, mockNext);

      expect(prismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockReq.body.email },
        select: { email: true }
      });
      expect(argon2.hash).toHaveBeenCalledWith(mockReq.body.password);
      expect(prismaClient.user.create).toHaveBeenCalledWith({
        data: {
          name: mockReq.body.name,
          email: mockReq.body.email,
          password: mockHashedPassword
        },
        select: { id: true }
      });
      expect(createAccessToken).toHaveBeenCalledWith(mockUserId);
      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Account created!',
        data: {
          name: mockReq.body.name,
          email: mockReq.body.email,
          access_token: mockAccessToken
        }
      });
    });

    it('should throw error if email already exists', async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue({
        email: mockReq.body.email
      });

      await handleSignUp(mockReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.user.create).not.toHaveBeenCalled();
    });

    it('should call next with error on database failure', async () => {
      (prismaClient.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('DB Error')
      );

      await handleSignUp(mockReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleLogin', () => {
    it('should login user and return access token', async () => {
      const mockUserId = 1;
      const mockAccessToken = 'mockAccessToken';
      const mockUser = {
        id: mockUserId,
        email: mockReq.body.email,
        password: 'hashedPassword'
      };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (createAccessToken as jest.Mock).mockReturnValue(mockAccessToken);

      await handleLogin(mockReq, mockRes as Response, mockNext);

      expect(prismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockReq.body.email },
        select: { id: true, email: true, password: true }
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.password,
        mockReq.body.password
      );
      expect(createAccessToken).toHaveBeenCalledWith(mockUserId);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { access_token: mockAccessToken }
      });
    });

    it('should throw error if user not found', async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue(null);

      await handleLogin(mockReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(argon2.verify).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      const mockUser = {
        id: 1,
        email: mockReq.body.email,
        password: 'hashedPassword'
      };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await handleLogin(mockReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(createAccessToken).not.toHaveBeenCalled();
    });

    it('should call next with error on database failure', async () => {
      (prismaClient.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('DB Error')
      );

      await handleLogin(mockReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
