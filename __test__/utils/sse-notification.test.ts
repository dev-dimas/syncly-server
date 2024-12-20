/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { type Response } from 'express';
import prismaClient from 'src/config/prisma';
import { sendSSEMessage, sseClients } from 'src/utils/sse-notification.util';

jest.mock('src/config/prisma', () => ({
  __esModule: true,
  default: {
    notification: {
      create: jest.fn()
    }
  }
}));

describe('SSE Notification Utility', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      write: jest.fn(),
      flush: jest.fn()
    };
    sseClients.length = 0;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should do not create any notification if no clientIds passed', async () => {
    const result = await sendSSEMessage([], {
      type: 'ADDED_TO_PROJECT',
      projectName: 'Test Project'
    });
    expect(result).toBeUndefined();
  });

  it('should create and send ADDED_TO_PROJECT notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'You have been added to project Test Project',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'ADDED_TO_PROJECT',
      projectName: 'Test Project'
    });

    expect(prismaClient.notification.create).toHaveBeenCalledWith({
      data: {
        title: 'Test Project',
        description: 'You have been added to project Test Project',
        users: {
          createMany: {
            data: [{ userId: 'user-1' }],
            skipDuplicates: true
          }
        }
      },
      select: {
        title: true,
        description: true,
        createdAt: true
      }
    });

    expect(mockResponse.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ ...mockNotification, seen: false })}\n\n`
    );
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send KICKED_FROM_PROJECT notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'You have been removed from project Test Project',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'KICKED_FROM_PROJECT',
      projectName: 'Test Project'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send MEMBER_QUIT notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'John has quit or left your project project Test Project',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'MEMBER_QUIT',
      projectName: 'Test Project',
      memberName: 'John'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send PROJECT_RENAMED notification', async () => {
    const mockNotification = {
      title: 'New Project',
      description: 'Project Old Project has been renamed to New Project',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'PROJECT_RENAMED',
      oldName: 'Old Project',
      newName: 'New Project'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send PROJECT_DELETED notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'Project Test Project has been deleted by the owner',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'PROJECT_DELETED',
      projectName: 'Test Project'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send ASSIGNED_TO_TASK notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'You have been assigned to task Test Task by John',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'ASSIGNED_TO_TASK',
      projectName: 'Test Project',
      taskName: 'Test Task',
      by: 'John'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send TASK_RENAMED notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'Task Old Task has been renamed to New Task',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'TASK_RENAMED',
      projectName: 'Test Project',
      oldName: 'Old Task',
      newName: 'New Task'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send TASK_DELETED notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'Task Test Task has been deleted by John',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'TASK_DELETED',
      projectName: 'Test Project',
      taskName: 'Test Task',
      by: 'John'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send TASK_STATUS_CHANGED notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'Task Test Task has been marked as completed by John',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'TASK_STATUS_CHANGED',
      projectName: 'Test Project',
      taskName: 'Test Task',
      by: 'John',
      updatedData: 'completed'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should create and send TASK_DUEDATE_CHANGED notification', async () => {
    const mockNotification = {
      title: 'Test Project',
      description:
        'Task Test Task due date has been changed to 2024-01-01 by John',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await sendSSEMessage(['user-1'], {
      type: 'TASK_DUEDATE_CHANGED',
      projectName: 'Test Project',
      taskName: 'Test Task',
      by: 'John',
      updatedData: '2024-01-01'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse.flush).toHaveBeenCalled();
  });

  it('should throw error for invalid notification type', async () => {
    sseClients.push({ id: 'user-1', response: mockResponse as Response });

    await expect(
      sendSSEMessage(['user-1'], {
        type: 'INVALID_TYPE' as never,
        projectName: 'Test Project'
      })
    ).rejects.toThrow('Invalid notification type: INVALID_TYPE');
  });

  it('should not send notification when no clients found', async () => {
    const mockNotification = {
      title: 'Test Project',
      description: 'Test notification',
      createdAt: new Date()
    };

    (prismaClient.notification.create as jest.Mock).mockResolvedValueOnce(
      mockNotification
    );

    await sendSSEMessage(['non-existent-user'], {
      type: 'ADDED_TO_PROJECT',
      projectName: 'Test Project'
    });

    expect(prismaClient.notification.create).toHaveBeenCalled();
    expect(mockResponse.write).not.toHaveBeenCalled();
    expect(mockResponse.flush).not.toHaveBeenCalled();
  });
});
