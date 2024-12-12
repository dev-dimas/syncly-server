import { Router } from 'express';
import isAuth from 'src/middleware/is-auth';
import isProjectMember from 'src/middleware/is-project-member';
import isTaskAsignee from 'src/middleware/is-task-asignee';
import * as taskController from '../controller/task.controller';

const taskRouter = Router();

taskRouter.use(isAuth);

taskRouter.post('/tasks', isProjectMember, (_, res) => res.sendStatus(200));
taskRouter.put('/tasks/:taskId', isTaskAsignee, (_, res) =>
  res.sendStatus(200)
);
taskRouter.get(
  '/tasks/:taskId',
  isTaskAsignee,
  taskController.handleGetTaskDetail
);
taskRouter.delete(
  '/tasks/:taskId',
  isTaskAsignee,
  taskController.handleDeleteTask
);

// TASK ASSIGNE CRUD
taskRouter.get('/tasks/:taskId/assignee', (_, res) => res.sendStatus(200));
taskRouter.post('/tasks/:taskId/assignee', (_, res) => res.sendStatus(200));
taskRouter.delete('/tasks/:taskId/assignee', (_, res) => res.sendStatus(200));

export default taskRouter;
