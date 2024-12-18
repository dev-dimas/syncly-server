import { TaskStatus } from '@prisma/client';
import dayjs from 'dayjs';
import Joi from 'joi';

const notBeforeToday: Joi.CustomValidator = (value, helpers) => {
  const today = dayjs().startOf('day');
  const inputDate = dayjs(value);

  if (inputDate.isBefore(today)) {
    return helpers.error('date.notBeforeToday', {
      message: 'Date cannot be before today'
    });
  }

  return value;
};

export const taskIdParams = {
  params: Joi.object().keys({
    taskId: Joi.string().required()
  })
};

export interface CreateTaskDTO {
  title: string;
  description?: string;
  dueDate: Date;
  projectId: string;
}
export const createTaskSchema = {
  body: Joi.object<CreateTaskDTO>().keys({
    title: Joi.string().required().min(3).max(100),
    description: Joi.string().min(3).max(1000),
    dueDate: Joi.date().required().custom(notBeforeToday),
    projectId: Joi.string().required()
  })
};

export type UpdateTaskDTO = {
  status?: TaskStatus;
} & Partial<Omit<CreateTaskDTO, 'projectId'>>;
export const updateTaskSchema = {
  body: Joi.object<UpdateTaskDTO>().keys({
    title: Joi.string().min(3).max(100),
    description: Joi.string().min(3).max(1000),
    status: Joi.string().valid(
      TaskStatus.ACTIVE,
      TaskStatus.PAUSED,
      TaskStatus.COMPLETED
    ),
    dueDate: Joi.date().custom(notBeforeToday)
  }),
  ...taskIdParams
};

export interface AddTaskAssigneeDTO {
  userId: string;
}
export const addTaskAssigneeSchema = {
  body: Joi.object<AddTaskAssigneeDTO>().keys({
    userId: Joi.string().required()
  }),
  ...taskIdParams
};

export type RemoveTaskAssigneeDTO = AddTaskAssigneeDTO;
export const removeTaskAssigneeSchema = addTaskAssigneeSchema;
