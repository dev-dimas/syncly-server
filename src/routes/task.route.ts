import { Router } from 'express';
import isAuth from 'src/middleware/is-auth';
import isOwnerOrAssignee from 'src/middleware/is-owner-or-assignee';
import isProjectMember from 'src/middleware/is-project-member';
import * as taskController from '../controller/task.controller';
import validate from 'src/middleware/validate';
import {
  addTaskAssigneeSchema,
  createTaskSchema,
  removeTaskAssigneeSchema,
  taskIdParams,
  updateTaskSchema
} from 'src/validations/task.validation';

const taskRouter = Router();

taskRouter.post(
  '/tasks',
  isAuth,
  validate(createTaskSchema),
  isProjectMember,
  taskController.handleCreateTask
);
taskRouter.put(
  '/tasks/:taskId',
  isAuth,
  validate(updateTaskSchema),
  isOwnerOrAssignee,
  taskController.handleUpdateTask
);
taskRouter.get(
  '/tasks/:taskId',
  isAuth,
  validate(taskIdParams),
  isOwnerOrAssignee,
  taskController.handleGetTaskDetail
);
taskRouter.delete(
  '/tasks/:taskId',
  isAuth,
  validate(taskIdParams),
  isOwnerOrAssignee,
  taskController.handleDeleteTask
);

// TASK ASSIGNE CRUD
taskRouter.get(
  '/tasks/:taskId/assignee',
  isAuth,
  validate(taskIdParams),
  isOwnerOrAssignee,
  taskController.handleGetTasksAssignee
);
taskRouter.post(
  '/tasks/:taskId/assignee',
  isAuth,
  validate(addTaskAssigneeSchema),
  isOwnerOrAssignee,
  taskController.handleAddTaskAssignee
);
taskRouter.delete(
  '/tasks/:taskId/assignee',
  isAuth,
  validate(removeTaskAssigneeSchema),
  isOwnerOrAssignee,
  taskController.handleRemoveTaskAssignee
);

export default taskRouter;
