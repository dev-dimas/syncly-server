/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import type { NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import type { ValidatedRequest } from 'src/types/types';
import { HttpException } from 'src/utils/http-exception.util';
import { sendSSEMessage } from 'src/utils/sse-notification.util';
import type {
  AddTaskAssigneeDTO,
  CreateTaskDTO,
  RemoveTaskAssigneeDTO,
  UpdateTaskDTO
} from 'src/validations/task.validation';

/**
 * Handle create task
 */
export const handleCreateTask = async (
  req: ValidatedRequest<CreateTaskDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description, dueDate, projectId } = req.body;
    const userId = req.payload?.userId;

    if (!userId) throw new HttpException(StatusCodes.UNAUTHORIZED);

    const newTask = await prismaClient.task.create({
      data: {
        title,
        description: description || null,
        dueDate,
        projectId,
        assignedTo: { create: { userId, projectId } }
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

    res.status(201).json({ data: { task: newTask } });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle update task
 */
export const handleUpdateTask = async (
  req: ValidatedRequest<UpdateTaskDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, dueDate } = req.body;
    const userId = req.payload?.userId;

    if (!taskId || !userId) throw new HttpException(StatusCodes.UNAUTHORIZED);

    if (!title && !description && !status && !dueDate) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        'Please provide at least one field to update'
      );
    }

    const task = await prismaClient.task.findFirst({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        assignedTo: { select: { userId: true } },
        project: { select: { name: true } }
      }
    });

    if (!task) throw new HttpException(StatusCodes.NOT_FOUND);

    const updatedTask = await prismaClient.task.update({
      where: { id: taskId },
      data: {
        title: title || Prisma.skip,
        description: description || Prisma.skip,
        status: status || Prisma.skip,
        dueDate: dueDate || Prisma.skip
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        assignedTo: {
          select: { user: { select: { name: true, avatar: true } } },
          skip: 0,
          take: 4
        },
        dueDate: true
      }
    });

    const clientIds = task.assignedTo
      .filter((user) => user.userId !== userId)
      .map((user) => user.userId);

    const updatedBy = await prismaClient.user.findFirst({
      where: { id: userId },
      select: { name: true }
    });

    if (task.title !== updatedTask.title) {
      await sendSSEMessage(clientIds, {
        type: 'TASK_RENAMED',
        projectName: task.project.name,
        oldName: task.title,
        newName: updatedTask.title
      });
    }

    if (task.status !== updatedTask.status) {
      await sendSSEMessage(clientIds, {
        type: 'TASK_STATUS_CHANGED',
        projectName: task.project.name,
        taskName: updatedTask.title,
        updatedData: updatedTask.status,
        by: updatedBy?.name ?? userId
      });
    }

    if (task.dueDate !== updatedTask.dueDate) {
      await sendSSEMessage(clientIds, {
        type: 'TASK_DUEDATE_CHANGED',
        projectName: task.project.name,
        taskName: updatedTask.title,
        updatedData: dayjs(updatedTask.dueDate).format('DD MMM YYYY'),
        by: updatedBy?.name ?? userId
      });
    }

    res.status(200).json({ data: { task: updatedTask } });
  } catch (error) {
    next(error);
  }
};

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
    const userId = req.payload?.userId;

    if (!taskId || !userId) throw new HttpException(StatusCodes.BAD_REQUEST);

    const task = await prismaClient.task.findFirst({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        project: {
          select: {
            ownerId: true
          }
        },
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

    if (!task) throw new HttpException(StatusCodes.NOT_FOUND);

    return res.status(200).json({ data: { task } });
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
    const userId = req.payload?.userId;

    if (!taskId || !userId) throw new HttpException(StatusCodes.UNAUTHORIZED);

    const deletedTask = await prismaClient.task.delete({
      where: { id: taskId },
      select: {
        title: true,
        assignedTo: { select: { userId: true } },
        project: { select: { name: true } }
      }
    });

    if (!deletedTask) throw new HttpException(StatusCodes.NOT_FOUND);

    const deletedBy = await prismaClient.user.findFirst({
      where: { id: userId },
      select: { name: true }
    });

    await sendSSEMessage(
      deletedTask.assignedTo
        .filter((user) => user.userId)
        .map((user) => user.userId),
      {
        type: 'TASK_DELETED',
        projectName: deletedTask.project.name,
        taskName: deletedTask.title,
        by: deletedBy?.name ?? userId
      }
    );

    return res
      .status(200)
      .json({ message: `Task ${deletedTask.title} has been deleted` });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle get all tasks assignee
 */
export const handleGetTasksAssignee = async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params;
    const userId = req.payload?.userId;

    if (!taskId || !userId) throw new HttpException(StatusCodes.BAD_REQUEST);

    const task = await prismaClient.project.findFirst({
      where: {
        tasks: {
          some: { id: taskId }
        }
      },
      select: {
        members: {
          select: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        taskAssignee: {
          where: { taskId },
          select: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!task) throw new HttpException(StatusCodes.NOT_FOUND);

    const taskAssignee = task.taskAssignee.map(({ user }) => ({
      userId: user.id,
      name: user.name
    }));
    const availableAssignee = task.members
      .filter(
        (member) =>
          !taskAssignee.some((assignee) => assignee.userId === member.user.id)
      )
      .map((member) => ({
        userId: member.user.id,
        name: member.user.name
      }));

    res.status(200).json({ data: { userId, availableAssignee, taskAssignee } });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle add task assignee
 */
export const handleAddTaskAssignee = async (
  req: ValidatedRequest<AddTaskAssigneeDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params;
    const { userId: addedUserId } = req.body;
    const userId = req.payload?.userId;

    if (!userId || !taskId) throw new HttpException(StatusCodes.UNAUTHORIZED);

    const isAlreadyAssigned = await prismaClient.task.findFirst({
      where: {
        id: taskId,
        assignedTo: { some: { userId: addedUserId } }
      },
      select: { id: true }
    });

    if (isAlreadyAssigned) {
      throw new HttpException(
        StatusCodes.CONFLICT,
        'User is already assigned to this task'
      );
    }

    const isAssigneeFromMember = await prismaClient.task.findFirst({
      where: {
        id: taskId,
        project: { members: { some: { userId } } }
      },
      select: { projectId: true, project: { select: { name: true } } }
    });

    if (!isAssigneeFromMember) {
      throw new HttpException(
        StatusCodes.FORBIDDEN,
        'Cant assign task to member that not in your project'
      );
    }

    const addedUser = await prismaClient.task.update({
      where: { id: taskId },
      data: {
        assignedTo: {
          create: {
            userId: addedUserId,
            projectId: isAssigneeFromMember.projectId
          }
        }
      },
      select: {
        title: true,
        assignedTo: {
          select: { user: { select: { name: true, avatar: true } } },
          where: {
            taskId,
            userId: addedUserId,
            projectId: isAssigneeFromMember.projectId
          }
        }
      }
    });

    const assignedBy = await prismaClient.user.findFirst({
      where: { id: userId },
      select: { name: true }
    });

    await sendSSEMessage([addedUserId], {
      type: 'ASSIGNED_TO_TASK',
      projectName: isAssigneeFromMember.project.name,
      taskName: addedUser.title,
      by: assignedBy?.name ?? userId
    });

    res.status(200).json({ data: { ...addedUser.assignedTo[0]?.user } });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle remove task assignee
 */
export const handleRemoveTaskAssignee = async (
  req: ValidatedRequest<RemoveTaskAssigneeDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params;
    const { userId: removedUserId } = req.body;

    if (!taskId) throw new HttpException(StatusCodes.UNAUTHORIZED);

    const isTaskAssignee = await prismaClient.taskAssignee.findFirst({
      where: {
        taskId,
        userId: removedUserId
      },
      select: { taskId: true }
    });

    if (!isTaskAssignee) {
      throw new HttpException(
        StatusCodes.NOT_FOUND,
        'Cant remove assignee. This user is not assigned to this task'
      );
    }

    await prismaClient.taskAssignee.delete({
      where: {
        taskId_userId: {
          taskId,
          userId: removedUserId
        }
      },
      select: { taskId: true }
    });

    res.status(200).json({ message: 'Task assignee removed successfully' });
  } catch (error) {
    next(error);
  }
};
