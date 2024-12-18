/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { type Response } from 'express';
import prismaClient from 'src/config/prisma';
import {
  handleAddTaskAssignee,
  handleCreateTask,
  handleDeleteTask,
  handleGetTaskDetail,
  handleGetTasksAssignee,
  handleRemoveTaskAssignee,
  handleUpdateTask
} from 'src/controller/task.controller';
import type { ValidatedRequest } from 'src/types/types';
import { sendSSEMessage } from 'src/utils/sse-notification.util';
import type {
  AddTaskAssigneeDTO,
  CreateTaskDTO,
  RemoveTaskAssigneeDTO,
  UpdateTaskDTO
} from 'src/validations/task.validation';

jest.mock('src/config/prisma', () => ({
  task: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  user: {
    findFirst: jest.fn()
  },
  project: {
    findFirst: jest.fn()
  },
  taskAssignee: {
    findFirst: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('src/utils/sse-notification.util', () => ({
  sendSSEMessage: jest.fn()
}));

describe('Task Controller', () => {
  let mockReq: Partial<ValidatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleCreateTask', () => {
    const createTaskReq: Partial<ValidatedRequest<CreateTaskDTO>> = {
      body: {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(),
        projectId: '1'
      },
      payload: {
        userId: '1'
      }
    };

    it('should create task successfully', async () => {
      const mockTask = {
        id: '1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'ACTIVE',
        assignedTo: [
          {
            user: {
              name: 'Test User',
              avatar: 'avatar.jpg'
            }
          }
        ],
        dueDate: new Date()
      };

      (prismaClient.task.create as jest.Mock).mockResolvedValue(mockTask);

      await handleCreateTask(
        createTaskReq as ValidatedRequest<CreateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.task.create).toHaveBeenCalledWith({
        data: {
          title: createTaskReq.body?.title,
          description: createTaskReq.body?.description,
          dueDate: createTaskReq.body?.dueDate,
          projectId: createTaskReq.body?.projectId,
          assignedTo: {
            create: {
              userId: createTaskReq.payload?.userId,
              projectId: createTaskReq.body?.projectId
            }
          }
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          assignedTo: {
            select: { user: { select: { name: true, avatar: true } } }
          },
          dueDate: true
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { task: mockTask }
      });
    });

    it('should throw unauthorized error when userId is missing', async () => {
      const reqWithoutUserId = {
        ...createTaskReq,
        payload: undefined
      };

      await handleCreateTask(
        reqWithoutUserId as ValidatedRequest<CreateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.create).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      (prismaClient.task.create as jest.Mock).mockRejectedValue(dbError);

      await handleCreateTask(
        createTaskReq as ValidatedRequest<CreateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should handle null description', async () => {
      const createTaskReqWithNullDesc: Partial<
        ValidatedRequest<CreateTaskDTO>
      > = {
        body: {
          title: 'Test Task',
          description: null,
          dueDate: new Date(),
          projectId: '1'
        },
        payload: {
          userId: '1'
        }
      };

      const mockTask = {
        id: '1',
        title: 'Test Task',
        description: null,
        status: 'ACTIVE',
        assignedTo: [],
        dueDate: new Date()
      };

      (prismaClient.task.create as jest.Mock).mockResolvedValue(mockTask);

      await handleCreateTask(
        createTaskReqWithNullDesc as ValidatedRequest<CreateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: null
          })
        })
      );
    });

    it('should handle error when description is undefined', async () => {
      const createTaskReqUndefinedDesc: Partial<
        ValidatedRequest<CreateTaskDTO>
      > = {
        body: {
          title: 'Test Task',
          dueDate: new Date(),
          projectId: '1'
        },
        payload: {
          userId: '1'
        }
      };

      const mockTask = {
        id: '1',
        title: 'Test Task',
        description: null,
        status: 'ACTIVE',
        assignedTo: [],
        dueDate: new Date()
      };

      (prismaClient.task.create as jest.Mock).mockResolvedValue(mockTask);

      await handleCreateTask(
        createTaskReqUndefinedDesc as ValidatedRequest<CreateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: null
          })
        })
      );
    });
  });

  describe('handleUpdateTask', () => {
    const updateTaskReq: Partial<ValidatedRequest<UpdateTaskDTO>> = {
      params: { taskId: '1' },
      body: {
        title: 'Updated Task',
        status: 'COMPLETED',
        dueDate: new Date()
      },
      payload: {
        userId: '1'
      }
    };

    const mockExistingTask = {
      id: '1',
      title: 'Original Task',
      description: 'Original Description',
      status: 'ACTIVE',
      dueDate: new Date('2024-01-01'),
      assignedTo: [{ userId: '2' }],
      project: { name: 'Test Project' }
    };

    it('should update task successfully', async () => {
      const mockUpdatedTask = {
        ...mockExistingTask,
        title: 'Updated Task',
        status: 'COMPLETED'
      };

      (prismaClient.task.findFirst as jest.Mock).mockResolvedValue(
        mockExistingTask
      );
      (prismaClient.task.update as jest.Mock).mockResolvedValue(
        mockUpdatedTask
      );
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue({
        name: 'Test User'
      });

      await handleUpdateTask(
        updateTaskReq as ValidatedRequest<UpdateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.task.update).toHaveBeenCalled();
      expect(sendSSEMessage).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { task: mockUpdatedTask }
      });
    });

    it('should throw error when no fields to update', async () => {
      const emptyUpdateReq = {
        ...updateTaskReq,
        body: {}
      };

      await handleUpdateTask(
        emptyUpdateReq as ValidatedRequest<UpdateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.update).not.toHaveBeenCalled();
    });

    it('should throw not found error when task does not exist', async () => {
      (prismaClient.task.findFirst as jest.Mock).mockResolvedValue(null);

      await handleUpdateTask(
        updateTaskReq as ValidatedRequest<UpdateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.update).not.toHaveBeenCalled();
    });

    it('should send notification when due date is changed', async () => {
      const originalDueDate = new Date('2024-01-01');
      const newDueDate = new Date('2024-02-01');

      const mockExistingTask = {
        id: '1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'ACTIVE',
        dueDate: originalDueDate,
        assignedTo: [{ userId: '2' }],
        project: { name: 'Test Project' }
      };

      const mockUpdatedTask = {
        ...mockExistingTask,
        dueDate: newDueDate
      };

      (prismaClient.task.findFirst as jest.Mock).mockResolvedValue(
        mockExistingTask
      );
      (prismaClient.task.update as jest.Mock).mockResolvedValue(
        mockUpdatedTask
      );
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue({
        name: 'Test User'
      });

      const updateDueDateReq: Partial<ValidatedRequest<UpdateTaskDTO>> = {
        params: { taskId: '1' },
        body: {
          dueDate: newDueDate
        },
        payload: {
          userId: '1'
        }
      };

      await handleUpdateTask(
        updateDueDateReq as ValidatedRequest<UpdateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(sendSSEMessage).toHaveBeenCalledWith(['2'], {
        type: 'TASK_DUEDATE_CHANGED',
        projectName: 'Test Project',
        taskName: 'Test Task',
        updatedData: expect.any(String),
        by: 'Test User'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { task: mockUpdatedTask }
      });
    });

    it('should send notification when task title is changed', async () => {
      const mockExistingTask = {
        id: '1',
        title: 'Original Title',
        description: 'Test Description',
        status: 'ACTIVE',
        dueDate: new Date(),
        assignedTo: [{ userId: '2' }],
        project: { name: 'Test Project' }
      };

      const mockUpdatedTask = {
        ...mockExistingTask,
        title: 'New Title'
      };

      (prismaClient.task.findFirst as jest.Mock).mockResolvedValue(
        mockExistingTask
      );
      (prismaClient.task.update as jest.Mock).mockResolvedValue(
        mockUpdatedTask
      );
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue({
        name: 'Test User'
      });

      const updateTitleReq: Partial<ValidatedRequest<UpdateTaskDTO>> = {
        params: { taskId: '1' },
        body: { title: 'New Title' },
        payload: { userId: '1' }
      };

      await handleUpdateTask(
        updateTitleReq as ValidatedRequest<UpdateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(sendSSEMessage).toHaveBeenCalledWith(['2'], {
        type: 'TASK_RENAMED',
        projectName: 'Test Project',
        oldName: 'Original Title',
        newName: 'New Title'
      });
    });

    it('should handle case when user is not found for notifications', async () => {
      const mockExistingTask = {
        id: '1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'ACTIVE',
        dueDate: new Date(),
        assignedTo: [{ userId: '2' }],
        project: { name: 'Test Project' }
      };

      const mockUpdatedTask = {
        ...mockExistingTask,
        status: 'COMPLETED'
      };

      (prismaClient.task.findFirst as jest.Mock).mockResolvedValue(
        mockExistingTask
      );
      (prismaClient.task.update as jest.Mock).mockResolvedValue(
        mockUpdatedTask
      );
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null);

      const updateStatusReq: Partial<ValidatedRequest<UpdateTaskDTO>> = {
        params: { taskId: '1' },
        body: { status: 'COMPLETED' },
        payload: { userId: '1' }
      };

      await handleUpdateTask(
        updateStatusReq as ValidatedRequest<UpdateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(sendSSEMessage).toHaveBeenCalledWith(['2'], {
        type: 'TASK_STATUS_CHANGED',
        projectName: 'Test Project',
        taskName: 'Test Task',
        updatedData: 'COMPLETED',
        by: '1'
      });
    });

    it('should throw unauthorized error when taskId is missing', async () => {
      const reqWithoutTaskId = {
        body: { title: 'Updated Task' },
        payload: { userId: '1' }
      };

      await handleUpdateTask(
        reqWithoutTaskId as ValidatedRequest<UpdateTaskDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.update).not.toHaveBeenCalled();
    });
  });

  describe('handleGetTaskDetail', () => {
    const getTaskDetailReq: Partial<ValidatedRequest> = {
      params: { taskId: '1' },
      payload: { userId: '1' }
    };

    it('should get task detail successfully', async () => {
      const mockTask = {
        id: '1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'ACTIVE',
        dueDate: new Date(),
        project: { ownerId: '1' },
        assignedTo: [
          {
            user: {
              name: 'Test User',
              avatar: 'avatar.jpg'
            }
          }
        ],
        createdAt: new Date()
      };

      (prismaClient.task.findFirst as jest.Mock).mockResolvedValue(mockTask);

      await handleGetTaskDetail(
        getTaskDetailReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { task: mockTask }
      });
    });

    it('should throw not found error when task does not exist', async () => {
      (prismaClient.task.findFirst as jest.Mock).mockResolvedValue(null);

      await handleGetTaskDetail(
        getTaskDetailReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw bad request when taskId is missing', async () => {
      const reqWithoutTaskId = {
        payload: { userId: '1' }
      };

      await handleGetTaskDetail(
        reqWithoutTaskId as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteTask', () => {
    const deleteTaskReq: Partial<ValidatedRequest> = {
      params: { taskId: '1' },
      payload: { userId: '1' }
    };

    it('should delete task successfully', async () => {
      const mockDeletedTask = {
        title: 'Test Task',
        assignedTo: [{ userId: '2' }],
        project: { name: 'Test Project' }
      };

      (prismaClient.task.delete as jest.Mock).mockResolvedValue(
        mockDeletedTask
      );
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue({
        name: 'Test User'
      });

      await handleDeleteTask(
        deleteTaskReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(sendSSEMessage).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: `Task ${mockDeletedTask.title} has been deleted`
      });
    });

    it('should throw unauthorized error when userId is missing', async () => {
      const reqWithoutUserId = {
        ...deleteTaskReq,
        payload: undefined
      };

      await handleDeleteTask(
        reqWithoutUserId as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.delete).not.toHaveBeenCalled();
    });

    it('should throw not found error when task does not exist', async () => {
      (prismaClient.task.delete as jest.Mock).mockRejectedValue({
        code: 'P2025'
      });

      await handleDeleteTask(
        deleteTaskReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle notification when user not found', async () => {
      const mockDeletedTask = {
        title: 'Test Task',
        assignedTo: [{ userId: '2' }],
        project: { name: 'Test Project' }
      };

      (prismaClient.task.delete as jest.Mock).mockResolvedValue(
        mockDeletedTask
      );
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null);

      await handleDeleteTask(
        {
          params: { taskId: '1' },
          payload: { userId: '1' }
        } as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(sendSSEMessage).toHaveBeenCalledWith(['2'], {
        type: 'TASK_DELETED',
        projectName: 'Test Project',
        taskName: 'Test Task',
        by: '1'
      });
    });
  });

  describe('handleAddTaskAssignee', () => {
    const addAssigneeReq: Partial<ValidatedRequest<AddTaskAssigneeDTO>> = {
      params: { taskId: '1' },
      body: { userId: '2' },
      payload: { userId: '1' }
    };

    it('should add assignee successfully', async () => {
      const mockTask = {
        title: 'Test Task',
        assignedTo: [
          {
            user: {
              name: 'New Assignee',
              avatar: 'avatar.jpg'
            }
          }
        ]
      };

      (prismaClient.task.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          projectId: '1',
          project: { name: 'Test Project' }
        });
      (prismaClient.task.update as jest.Mock).mockResolvedValue(mockTask);
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue({
        name: 'Test User'
      });

      await handleAddTaskAssignee(
        addAssigneeReq as ValidatedRequest<AddTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(sendSSEMessage).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { ...mockTask.assignedTo[0].user }
      });
    });

    it('should throw conflict error when user is already assigned', async () => {
      (prismaClient.task.findFirst as jest.Mock).mockResolvedValueOnce({
        id: '1'
      });

      await handleAddTaskAssignee(
        addAssigneeReq as ValidatedRequest<AddTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.update).not.toHaveBeenCalled();
    });

    it('should throw forbidden error when user is not a project member', async () => {
      (prismaClient.task.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await handleAddTaskAssignee(
        addAssigneeReq as ValidatedRequest<AddTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.update).not.toHaveBeenCalled();
    });

    it('should handle unauthorized error when taskId is missing', async () => {
      const reqWithoutTaskId: Partial<ValidatedRequest<AddTaskAssigneeDTO>> = {
        body: { userId: '2' },
        payload: { userId: '1' }
      };

      await handleAddTaskAssignee(
        reqWithoutTaskId as ValidatedRequest<AddTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.task.update).not.toHaveBeenCalled();
    });

    it('should handle error when project member check fails', async () => {
      const addAssigneeReq: Partial<ValidatedRequest<AddTaskAssigneeDTO>> = {
        params: { taskId: '1' },
        body: { userId: '2' },
        payload: { userId: '1' }
      };

      (prismaClient.task.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await handleAddTaskAssignee(
        addAssigneeReq as ValidatedRequest<AddTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 403,
          message: 'Cant assign task to member that not in your project'
        })
      );
    });
  });

  describe('handleRemoveTaskAssignee', () => {
    const removeAssigneeReq: Partial<ValidatedRequest<RemoveTaskAssigneeDTO>> =
      {
        params: { taskId: '1' },
        body: { userId: '2' }
      };

    it('should remove assignee successfully', async () => {
      (prismaClient.taskAssignee.findFirst as jest.Mock).mockResolvedValue({
        taskId: '1'
      });
      (prismaClient.taskAssignee.delete as jest.Mock).mockResolvedValue({
        taskId: '1'
      });

      await handleRemoveTaskAssignee(
        removeAssigneeReq as ValidatedRequest<RemoveTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Task assignee removed successfully'
      });
    });

    it('should throw not found error when assignee is not found', async () => {
      (prismaClient.taskAssignee.findFirst as jest.Mock).mockResolvedValue(
        null
      );

      await handleRemoveTaskAssignee(
        removeAssigneeReq as ValidatedRequest<RemoveTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.taskAssignee.delete).not.toHaveBeenCalled();
    });

    it('should throw unauthorized error when taskId is missing', async () => {
      const reqWithoutTaskId = {
        body: { userId: '2' }
      };

      await handleRemoveTaskAssignee(
        reqWithoutTaskId as ValidatedRequest<RemoveTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.taskAssignee.delete).not.toHaveBeenCalled();
    });

    it('should handle database error during delete', async () => {
      const mockError = new Error('Database error');
      (prismaClient.taskAssignee.findFirst as jest.Mock).mockResolvedValue({
        taskId: '1'
      });
      (prismaClient.taskAssignee.delete as jest.Mock).mockRejectedValue(
        mockError
      );

      await handleRemoveTaskAssignee(
        {
          params: { taskId: '1' },
          body: { userId: '2' }
        } as ValidatedRequest<RemoveTaskAssigneeDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('handleGetTasksAssignee', () => {
    const getTasksAssigneeReq: Partial<ValidatedRequest> = {
      params: { taskId: '1' },
      payload: { userId: '1' }
    };

    it('should get task assignees successfully', async () => {
      const mockProject = {
        members: [
          {
            user: {
              id: '1',
              name: 'Member 1'
            }
          },
          {
            user: {
              id: '2',
              name: 'Member 2'
            }
          }
        ],
        taskAssignee: [
          {
            user: {
              id: '1',
              name: 'Member 1'
            }
          }
        ]
      };

      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(
        mockProject
      );

      await handleGetTasksAssignee(
        getTasksAssigneeReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          userId: '1',
          availableAssignee: [
            {
              userId: '2',
              name: 'Member 2'
            }
          ],
          taskAssignee: [
            {
              userId: '1',
              name: 'Member 1'
            }
          ]
        }
      });
    });

    it('should throw not found error when project does not exist', async () => {
      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(null);

      await handleGetTasksAssignee(
        getTasksAssigneeReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw bad request error when taskId or userId is missing', async () => {
      const invalidReq = {
        params: {},
        payload: {}
      };

      await handleGetTasksAssignee(
        invalidReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty members and assignees', async () => {
      const mockProject = {
        members: [],
        taskAssignee: []
      };

      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(
        mockProject
      );

      await handleGetTasksAssignee(
        {
          params: { taskId: '1' },
          payload: { userId: '1' }
        } as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          userId: '1',
          availableAssignee: [],
          taskAssignee: []
        }
      });
    });

    it('should filter out existing assignees from available assignees', async () => {
      const mockProject = {
        members: [
          { user: { id: '1', name: 'User 1' } },
          { user: { id: '2', name: 'User 2' } },
          { user: { id: '3', name: 'User 3' } }
        ],
        taskAssignee: [
          { user: { id: '1', name: 'User 1' } },
          { user: { id: '2', name: 'User 2' } }
        ]
      };

      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(
        mockProject
      );

      await handleGetTasksAssignee(
        {
          params: { taskId: '1' },
          payload: { userId: '1' }
        } as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          userId: '1',
          availableAssignee: [{ userId: '3', name: 'User 3' }],
          taskAssignee: [
            { userId: '1', name: 'User 1' },
            { userId: '2', name: 'User 2' }
          ]
        }
      });
    });
  });
});
