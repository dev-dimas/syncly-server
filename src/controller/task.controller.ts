import type { NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import type { ValidatedRequest } from 'src/types/types';
import { HttpException } from 'src/utils/http-exception.util';

/**
 * Handle get task detail
 */
export const handleGetTaskDetail = async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      throw new HttpException(StatusCodes.BAD_REQUEST);
    }

    const task = await prismaClient.task.findFirst({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        assignedTo: {
          select: {
            user: {
              select: { name: true, avatar: true }
            }
          }
        },
        createdAt: true
      }
    });

    if (!task) {
      throw new HttpException(StatusCodes.NOT_FOUND);
    }

    res.status(200).json({ data: { task } });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle delete task
 */
export const handleDeleteTask = async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const deletedTask = await prismaClient.task.delete({
      where: { id: taskId },
      select: {
        title: true
      }
    });

    if (!deletedTask) {
      throw new HttpException(StatusCodes.NOT_FOUND);
    }

    return res
      .status(200)
      .json({ message: `Task ${deletedTask.title} has been deleted` });
  } catch (error) {
    next(error);
  }
};
