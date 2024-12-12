import { type NextFunction, type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import type { SSEClient } from 'src/types/types';
import { HttpException } from 'src/utils/http-exception.util';
import { sseClients } from 'src/utils/sse-notification.util';

/**
 * Handler for SSE notifications
 */
export const handleSSENotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.payload?.userId;

    if (!userId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const notifications = await prismaClient.notification.findMany({
      where: { users: { some: { userId } } },
      select: {
        title: true,
        description: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 75
    });

    const client: SSEClient = { id: userId, response: res };
    sseClients.push(client);

    res.write(`data: ${JSON.stringify(notifications)}\n\n`);
    res.flush();

    req.on('close', () => {
      res.end();
      const index = sseClients.findIndex((client) => client.id === userId);
      if (index !== -1) sseClients.splice(index, 1);
    });
  } catch (error) {
    next(error);
  }
};

export const handleReadAllNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.payload?.userId;

    if (!userId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    await prismaClient.notificationUser.updateMany({
      where: {
        userId,
        seen: false
      },
      data: {
        seen: true
      }
    });

    return res
      .status(200)
      .json({ message: 'All notifications successfully marked as read' });
  } catch (error) {
    next(error);
  }
};
