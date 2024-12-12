import type { NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prismaClient from 'src/config/prisma';
import type { ValidatedRequest } from 'src/types/types';
import { HttpException } from 'src/utils/http-exception.util';
import type {
  AddProjectMemberDTO,
  CreateProjectDTO,
  GetProjectMembersDTO,
  RemoveProjectMemberDTO,
  UpdateProjectDTO
} from 'src/validations/project.validation';

/**
 * Handle create new project
 */
export const handleCreateProject = async (
  req: ValidatedRequest<CreateProjectDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isTeamProject } = req.body;
    const userId = req.payload?.userId;

    if (!userId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const newProject = await prismaClient.$transaction(async (prisma) => {
      const project = await prisma.project.create({
        data: {
          name,
          isTeamProject,
          ownerId: userId
        },
        select: {
          id: true,
          name: true
        }
      });

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId
        }
      });

      return project;
    });

    res.status(201).json({ data: { project: newProject } });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle get all task by project id
 */
export const handleGetProjectDetail = async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.payload?.userId;

    if (!userId || !projectId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const project = await prismaClient.project.findFirst({
      where: {
        id: projectId,
        members: { some: { userId } }
      },
      select: {
        id: true,
        name: true,
        image: true,
        ownerId: true,
        members: {
          skip: 0,
          take: 4,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            user: {
              select: {
                name: true,
                avatar: true
              }
            }
          }
        },
        TaskAssignee: {
          where: {
            userId
          },
          orderBy: {
            task: {
              dueDate: 'asc'
            }
          },
          select: {
            task: {
              select: {
                title: true,
                description: true,
                status: true,
                assignedTo: {
                  select: { user: { select: { name: true, avatar: true } } }
                },
                dueDate: true
              }
            }
          }
        }
      }
    });

    const members = await prismaClient.projectMember.count({
      where: { projectId }
    });

    if (!project) {
      throw new HttpException(StatusCodes.NOT_FOUND);
    }

    return res.status(200).json({ data: { project, total_members: members } });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle update project name
 */
export const handleUpdateProjectName = async (
  req: ValidatedRequest<UpdateProjectDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;
    const { projectId } = req.params;
    const userId = req.payload?.userId;

    if (!userId || !projectId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const isProjectExist = await prismaClient.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId
      }
    });

    if (!isProjectExist) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    await prismaClient.project.update({
      where: {
        id: projectId
      },
      data: { name }
    });

    return res.status(200).json({ message: 'Project name has been updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle delete project
 */
export const handleDeleteProject = async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.payload?.userId;

    if (!userId || !projectId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const project = await prismaClient.project.findFirst({
      where: {
        id: projectId
      },
      select: {
        name: true,
        ownerId: true
      }
    });

    if (!project) {
      throw new HttpException(StatusCodes.NOT_FOUND);
    }

    if (project.ownerId === userId) {
      const deletedProject = await prismaClient.project.delete({
        where: {
          id: projectId
        }
      });

      if (!deletedProject) {
        throw new HttpException(StatusCodes.NOT_FOUND);
      }

      return res.status(200).json({ message: 'Project has been deleted' });
    }

    const quitProject = await prismaClient.projectMember.delete({
      where: {
        userId_projectId: {
          userId,
          projectId
        }
      }
    });

    if (!quitProject) {
      throw new HttpException(StatusCodes.NOT_FOUND);
    }

    return res
      .status(200)
      .json({ message: `Successfully quit from project ${project.name}` });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle get project member
 */
export const handleGetMembers = async (
  req: ValidatedRequest<GetProjectMembersDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = req.body.page ?? 1;
    const limit = req.body.limit ?? 10;
    const { projectId } = req.params;

    if (!projectId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const members = await prismaClient.projectMember.findMany({
      where: {
        projectId
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        user: {
          select: {
            name: true,
            avatar: true
          }
        }
      }
    });

    const totalMembers = await prismaClient.projectMember.count({
      where: { projectId }
    });

    return res
      .status(200)
      .json({ data: { members, total_members: totalMembers } });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle add project member
 */
export const handleAddMember = async (
  req: ValidatedRequest<AddProjectMemberDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const { email } = req.body;

    if (!projectId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const isAlreadyMember = await prismaClient.projectMember.findFirst({
      where: {
        projectId,
        user: {
          email
        }
      },
      select: { userId: true }
    });

    if (isAlreadyMember) {
      throw new HttpException(StatusCodes.CONFLICT);
    }

    const newMember = await prismaClient.user.findFirst({
      where: {
        email
      },
      select: {
        id: true
      }
    });

    if (!newMember) {
      throw new HttpException(StatusCodes.NOT_FOUND);
    }

    await prismaClient.projectMember.create({
      data: {
        projectId,
        userId: newMember.id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle remove project member
 */
export const handleRemoveMember = async (
  req: ValidatedRequest<RemoveProjectMemberDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    if (!projectId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const deletedMember = await prismaClient.projectMember.delete({
      where: {
        userId_projectId: {
          userId,
          projectId
        }
      }
    });

    if (!deletedMember) {
      throw new HttpException(StatusCodes.NOT_FOUND);
    }

    return res.status(200).json({ message: 'Member has been removed' });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle toggle project to Favorite
 */
export const handleToggleProjectToFavorite = async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.payload?.userId;
    const { projectId } = req.params;

    if (!userId || !projectId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const isInFavorite = await prismaClient.favoriteProject.findFirst({
      where: {
        projectId,
        userId
      },
      select: { id: true }
    });

    if (!isInFavorite) {
      await prismaClient.favoriteProject.create({
        data: { projectId, userId }
      });

      return res
        .status(200)
        .json({ message: 'Successfully added project to favorite' });
    }

    await prismaClient.favoriteProject.delete({
      where: {
        id: isInFavorite.id
      }
    });

    return res
      .status(200)
      .json({ message: 'Successfully removed project from favorite' });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle toggle project to archive
 */
export const handleToggleProjectToArchive = async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.payload?.userId;
    const { projectId } = req.params;

    if (!userId || !projectId) {
      throw new HttpException(StatusCodes.UNAUTHORIZED);
    }

    const isInArchive = await prismaClient.archiveProject.findFirst({
      where: { projectId, userId },
      select: { id: true }
    });

    if (!isInArchive) {
      await prismaClient.archiveProject.create({
        data: { projectId, userId }
      });

      return res
        .status(200)
        .json({ message: 'Successfully added project to archive' });
    }

    await prismaClient.archiveProject.delete({
      where: {
        id: isInArchive.id
      }
    });

    return res
      .status(200)
      .json({ message: 'Successfully removed project from archive' });
  } catch (error) {
    next(error);
  }
};