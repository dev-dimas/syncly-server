/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { type NextFunction, type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import { HttpException } from 'src/utils/http-exception.util';
import isProjectMember from 'src/middleware/is-project-member';

jest.mock('src/config/prisma', () => ({
  __esModule: true,
  default: {
    projectMember: {
      findFirst: jest.fn()
    }
  }
}));

describe('isProjectMember Middleware', () => {
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
      },
      body: {}
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() when user is project member with projectId in params', async () => {
    (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValueOnce({
      userId: 'user-123'
    });

    await isProjectMember(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(prismaClient.projectMember.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: 'project-123',
        userId: 'user-123'
      },
      select: { userId: true }
    });
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should call next() when user is project member with projectId in body', async () => {
    mockRequest.params = {};
    mockRequest.body = { projectId: 'project-123' };

    (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValueOnce({
      userId: 'user-123'
    });

    await isProjectMember(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(prismaClient.projectMember.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: 'project-123',
        userId: 'user-123'
      },
      select: { userId: true }
    });
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when userId is missing', async () => {
    mockRequest.payload = {};

    await expect(
      isProjectMember(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.projectMember.findFirst).not.toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when projectId is missing', async () => {
    mockRequest.params = {};
    mockRequest.body = {};

    await expect(
      isProjectMember(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.projectMember.findFirst).not.toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when user is not a project member', async () => {
    (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValueOnce(
      null
    );

    await expect(
      isProjectMember(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.projectMember.findFirst).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
