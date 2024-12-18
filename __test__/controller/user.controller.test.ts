/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { type NextFunction, type Response } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import { type ValidatedRequest } from 'src/types/types';
import { HttpException } from 'src/utils/http-exception.util';
import {
  handleGetUser,
  handleUpdateUser
} from 'src/controller/user.controller';

jest.mock('src/config/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock('fs', () => ({
  unlink: jest.fn()
}));

describe('User Controller', () => {
  let mockRequest: Partial<ValidatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      payload: {
        userId: 'user-123'
      }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetUser', () => {
    it('should get user profile successfully', async () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'avatar.jpg'
      };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValueOnce(
        mockUser
      );

      await handleGetUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { name: true, email: true, avatar: true }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockUser });
    });

    it('should throw UNAUTHORIZED when userId is missing', async () => {
      mockRequest.payload = {};

      await handleGetUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        new HttpException(StatusCodes.UNAUTHORIZED)
      );
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await handleGetUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        new HttpException(StatusCodes.NOT_FOUND, 'User not found')
      );
    });
  });

  describe('handleUpdateUser', () => {
    beforeEach(() => {
      mockRequest.body = {};
    });

    it('should return early when no updates needed', async () => {
      await handleUpdateUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Nothing need to update'
      });
    });

    it('should update user name successfully', async () => {
      mockRequest.body = { name: 'New Name' };
      const mockUser = {
        name: 'Old Name',
        email: 'test@example.com',
        avatar: null
      };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValueOnce(
        mockUser
      );
      (prismaClient.user.update as jest.Mock).mockResolvedValueOnce({});

      await handleUpdateUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { ...mockUser, name: 'New Name' }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User updated successfully'
      });
    });

    it('should update user email successfully', async () => {
      mockRequest.body = { email: 'new@example.com' };
      const mockUser = {
        name: 'Test User',
        email: 'old@example.com',
        avatar: null
      };

      (prismaClient.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      (prismaClient.user.update as jest.Mock).mockResolvedValueOnce({});

      await handleUpdateUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { ...mockUser, email: 'new@example.com' }
      });
    });

    it('should throw BAD_REQUEST when email is already taken', async () => {
      mockRequest.body = { email: 'taken@example.com' };
      const mockUser = {
        name: 'Test User',
        email: 'old@example.com',
        avatar: null
      };

      (prismaClient.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ id: 'other-user' });

      await handleUpdateUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        new HttpException(StatusCodes.BAD_REQUEST, 'Email already taken!')
      );
    });

    it('should delete avatar successfully', async () => {
      mockRequest.body = { name: 'Test User', deleteAvatar: true };
      const mockUser = {
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'avatar.jpg'
      };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValueOnce(
        mockUser
      );
      (prismaClient.user.update as jest.Mock).mockResolvedValueOnce({});
      (fs.unlink as jest.Mock).mockImplementation((path, callback) =>
        callback(null)
      );

      await handleUpdateUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(fs.unlink).toHaveBeenCalled();
      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { ...mockUser, avatar: null }
      });
    });

    it('should handle avatar deletion error', async () => {
      mockRequest.body = { name: 'Test User', deleteAvatar: true };
      const mockUser = {
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'avatar.jpg'
      };

      (prismaClient.user.findUnique as jest.Mock).mockResolvedValueOnce(
        mockUser
      );
      (fs.unlink as jest.Mock).mockImplementation((path, callback) =>
        callback(new Error('Delete failed'))
      );

      await handleUpdateUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        new HttpException(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to delete avatar'
        )
      );
    });

    it('should throw UNAUTHORIZED when userId is missing', async () => {
      mockRequest.payload = {};
      mockRequest.body = { name: 'New Name' };

      await handleUpdateUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        new HttpException(StatusCodes.UNAUTHORIZED)
      );
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      mockRequest.body = { name: 'New Name' };
      mockRequest.payload = { userId: 'user-123' };
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await handleUpdateUser(
        mockRequest as ValidatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        new HttpException(StatusCodes.NOT_FOUND, 'User not found')
      );
    });
  });
});
