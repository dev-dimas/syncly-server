/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { type NextFunction, type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import { HttpException } from 'src/utils/http-exception.util';
import isProjectOwner from 'src/middleware/is-project-owner';

jest.mock('src/config/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      findFirst: jest.fn()
    }
  }
}));

describe('isProjectOwner Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      payload: {
        userId: 'user-123'
      },
      params: {
        projectId: 'project-123'
      }
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() when user is project owner', async () => {
    (prismaClient.project.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'project-123'
    });

    await isProjectOwner(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(prismaClient.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        ownerId: 'user-123'
      },
      select: { id: true }
    });
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when userId is missing', async () => {
    mockRequest.payload = {};

    await expect(
      isProjectOwner(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.project.findFirst).not.toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when projectId is missing', async () => {
    mockRequest.params = {};

    await expect(
      isProjectOwner(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.project.findFirst).not.toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when project is not found', async () => {
    (prismaClient.project.findFirst as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      isProjectOwner(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.project.findFirst).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
