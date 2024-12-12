import { Router } from 'express';
import isAuth from 'src/middleware/is-auth';
import * as notificationController from 'src/controller/notification.controller';

const notificationRouter = Router();

notificationRouter.get(
  '/notifications/sse',
  isAuth,
  notificationController.handleSSENotification
);

notificationRouter.post(
  '/notifications',
  isAuth,
  notificationController.handleReadAllNotification
);

export default notificationRouter;
