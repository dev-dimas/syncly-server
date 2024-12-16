import type { NextFunction, Request, Response } from 'express';

import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import { HttpException } from 'src/utils/http-exception.util';

const isProjectOwner = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const userId = req.payload?.userId;
  const { projectId } = req.params;

  if (!userId || !projectId) throw new HttpException(StatusCodes.UNAUTHORIZED);

  const project = await prismaClient.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId
    },
    select: { id: true }
  });

  if (!project) throw new HttpException(StatusCodes.UNAUTHORIZED);

  next();
};

export default isProjectOwner;
