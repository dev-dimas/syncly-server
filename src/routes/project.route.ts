import { Router } from 'express';
import isAuth from 'src/middleware/is-auth';
import validate from 'src/middleware/validate';
import {
  addProjectMemberSchema,
  createProjectSchema,
  getProjectMembersSchema,
  projectIdParams,
  removeProjectMemberSchema,
  updateProjectSchema
} from 'src/validations/project.validation';
import * as projectController from '../controller/project.controller';
import isProjectMember from 'src/middleware/is-project-member';
import isProjectOwner from 'src/middleware/is-project-owner';

const projectRouter = Router();

// CRUD PROJECT
projectRouter.get('/projects', isAuth, projectController.handleGetAllProject);
projectRouter.post(
  '/projects',
  isAuth,
  validate(createProjectSchema),
  projectController.handleCreateProject
);
projectRouter.get(
  '/projects/:projectId',
  isAuth,
  validate(projectIdParams),
  isProjectMember,
  projectController.handleGetProjectDetail
);
projectRouter.put(
  '/projects/:projectId',
  isAuth,
  validate(updateProjectSchema),
  isProjectOwner,
  projectController.handleUpdateProjectName
);
projectRouter.delete(
  '/projects/:projectId',
  isAuth,
  validate(projectIdParams),
  isProjectMember,
  projectController.handleDeleteProject
);

// CRUD PROJECT MEMBERS
projectRouter.get(
  '/projects/:projectId/members',
  isAuth,
  validate(getProjectMembersSchema),
  isProjectMember,
  projectController.handleGetMembers
);
projectRouter.post(
  '/projects/:projectId/members',
  isAuth,
  validate(addProjectMemberSchema),
  isProjectOwner,
  projectController.handleAddMember
);
projectRouter.delete(
  '/projects/:projectId/members',
  isAuth,
  validate(removeProjectMemberSchema),
  isProjectOwner,
  projectController.handleRemoveMember
);

// FAVORITE AND ARCHIVE PROJECT HANDLERS
projectRouter.post(
  '/projects/:projectId/favorite',
  isAuth,
  validate(projectIdParams),
  isProjectMember,
  projectController.handleToggleProjectToFavorite
);
projectRouter.post(
  '/projects/:projectId/archive',
  isAuth,
  validate(projectIdParams),
  isProjectMember,
  projectController.handleToggleProjectToArchive
);

export default projectRouter;
