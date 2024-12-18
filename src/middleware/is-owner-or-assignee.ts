import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import { HttpException } from 'src/utils/http-exception.util';

const isOwnerOrAssignee = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const userId = req.payload?.userId;
  const { taskId } = req.params;

  if (!userId || !taskId) throw new HttpException(StatusCodes.UNAUTHORIZED);

  const isTaskAssignee = await prismaClient.taskAssignee.findFirst({
    where: { userId, taskId },
    select: { id: true }
  });

  if (isTaskAssignee) {
    next();
    return;
  }

  const isProjectOwner = await prismaClient.task.findFirst({
    where: { id: taskId, project: { ownerId: userId } },
    select: { id: true }
  });

  if (!isProjectOwner) throw new HttpException(StatusCodes.UNAUTHORIZED);

  next();
};

export default isOwnerOrAssignee;
