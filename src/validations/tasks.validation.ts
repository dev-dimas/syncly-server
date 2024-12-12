import { type TaskStatus } from '@prisma/client';
import Joi from 'joi';

export const projectIdParams = {
  params: Joi.object().keys({
    taskId: Joi.string().uuid().required()
  })
};

export interface CreateTaskDTO {
  title: string;
  description?: string;
  dueDate?: Date;
  projectId: string;
  status?: TaskStatus;
}
