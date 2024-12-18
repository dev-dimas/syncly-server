/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { type Request, type Response } from 'express';
import prismaClient from 'src/config/prisma';
import {
  handleReadAllNotification,
  handleSSENotification
} from 'src/controller/notification.controller';
import { sseClients } from 'src/utils/sse-notification.util';

jest.mock('src/config/prisma', () => ({
  notificationUser: {
    findMany: jest.fn(),
    updateMany: jest.fn()
  }
}));

describe('Notification Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRes = {
      setHeader: jest.fn(),
      write: jest.fn(),
      flush: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleSSENotification', () => {
    beforeEach(() => {
      mockReq = {
        payload: { userId: '1' },
        on: jest.fn()
      };
    });

    it('should set up SSE connection and send notifications', async () => {
      const mockNotifications = [
        {
          notification: {
            title: 'Test Notification',
            description: 'Test Description',
            createdAt: new Date()
          },
          seen: false
        }
      ];

      (prismaClient.notificationUser.findMany as jest.Mock).mockResolvedValue(
        mockNotifications
      );

      await handleSSENotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream'
      );
      expect(mockRes.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(
          mockNotifications.map((notif) => ({
            ...notif.notification,
            seen: notif.seen
          }))
        )}\n\n`
      );
      expect(sseClients).toContainEqual({
        id: mockReq.payload?.userId,
        response: mockRes
      });
    });

    it('should handle unauthorized request', async () => {
      mockReq.payload = undefined;

      await handleSSENotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.write).not.toHaveBeenCalled();
    });

    it('should clean up client on connection close', async () => {
      const mockNotifications = [];
      (prismaClient.notificationUser.findMany as jest.Mock).mockResolvedValue(
        mockNotifications
      );

      await handleSSENotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Simulate connection close
      const closeHandler = (mockReq.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'close'
      )[1];
      closeHandler();

      expect(mockRes.end).toHaveBeenCalled();
      expect(
        sseClients.find((client) => client.id === mockReq.payload?.userId)
      ).toBeUndefined();
    });

    it('should not add duplicate client connections', async () => {
      const mockNotifications = [];
      (prismaClient.notificationUser.findMany as jest.Mock).mockResolvedValue(
        mockNotifications
      );

      // Add client first time
      await handleSSENotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      const initialClientsCount = sseClients.length;

      // Try to add same client again
      await handleSSENotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sseClients.length).toBe(initialClientsCount);
    });
  });

  describe('handleReadAllNotification', () => {
    beforeEach(() => {
      mockReq = {
        payload: { userId: '1' }
      };
    });

    it('should mark all notifications as read', async () => {
      await handleReadAllNotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.notificationUser.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockReq.payload?.userId,
          seen: false
        },
        data: {
          seen: true
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'All notifications successfully marked as read'
      });
    });

    it('should handle unauthorized request', async () => {
      mockReq.payload = undefined;

      await handleReadAllNotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.notificationUser.updateMany).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      (prismaClient.notificationUser.updateMany as jest.Mock).mockRejectedValue(
        dbError
      );

      await handleReadAllNotification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });
});
