/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck

import { type NextFunction, type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import { HttpException } from 'src/utils/http-exception.util';
import isOwnerOrAssignee from 'src/middleware/is-owner-or-assignee';

jest.mock('src/config/prisma', () => ({
  __esModule: true,
  default: {
    taskAssignee: {
      findFirst: jest.fn()
    },
    task: {
      findFirst: jest.fn()
    }
  }
}));

describe('isOwnerOrAssignee Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      payload: {
        userId: 'user-123'
      },
      params: {
        taskId: 'task-123'
      }
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() when user is task assignee', async () => {
    (prismaClient.taskAssignee.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'assignee-123'
    });

    await isOwnerOrAssignee(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(prismaClient.taskAssignee.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        taskId: 'task-123'
      },
      select: { id: true }
    });
    expect(prismaClient.task.findFirst).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should call next() when user is project owner', async () => {
    (prismaClient.taskAssignee.findFirst as jest.Mock).mockResolvedValueOnce(
      null
    );
    (prismaClient.task.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'task-123'
    });

    await isOwnerOrAssignee(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(prismaClient.taskAssignee.findFirst).toHaveBeenCalled();
    expect(prismaClient.task.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'task-123',
        project: { ownerId: 'user-123' }
      },
      select: { id: true }
    });
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when userId is missing', async () => {
    mockRequest.payload = {};

    await expect(
      isOwnerOrAssignee(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.taskAssignee.findFirst).not.toHaveBeenCalled();
    expect(prismaClient.task.findFirst).not.toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when taskId is missing', async () => {
    mockRequest.params = {};

    await expect(
      isOwnerOrAssignee(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.taskAssignee.findFirst).not.toHaveBeenCalled();
    expect(prismaClient.task.findFirst).not.toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw UNAUTHORIZED when user is neither assignee nor owner', async () => {
    (prismaClient.taskAssignee.findFirst as jest.Mock).mockResolvedValueOnce(
      null
    );
    (prismaClient.task.findFirst as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      isOwnerOrAssignee(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )
    ).rejects.toThrow(new HttpException(StatusCodes.UNAUTHORIZED));

    expect(prismaClient.taskAssignee.findFirst).toHaveBeenCalled();
    expect(prismaClient.task.findFirst).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
