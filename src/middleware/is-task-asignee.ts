import type { NextFunction, Request, Response } from 'express';

import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import { HttpException } from 'src/utils/http-exception.util';

const isTaskAsignee = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const userId = req.payload?.userId;
  const { taskId } = req.params;

  if (!userId || !taskId) {
    throw new HttpException(StatusCodes.UNAUTHORIZED);
  }

  const task = await prismaClient.taskAssignee.findFirst({
    where: { userId, taskId }
  });

  if (!task) {
    throw new HttpException(StatusCodes.UNAUTHORIZED);
  }

  next();
};

export default isTaskAsignee;
