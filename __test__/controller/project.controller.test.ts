/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import type { Response } from 'express';
import prismaClient from 'src/config/prisma';
import {
  handleAddMember,
  handleCreateProject,
  handleDeleteProject,
  handleGetAllProject,
  handleGetMembers,
  handleGetProjectDetail,
  handleRemoveMember,
  handleToggleProjectToArchive,
  handleToggleProjectToFavorite,
  handleUpdateProjectName
} from 'src/controller/project.controller';
import type { TypedRequest, ValidatedRequest } from 'src/types/types';
import type {
  AddProjectMemberDTO,
  CreateProjectDTO,
  GetProjectMembersDTO,
  RemoveProjectMemberDTO,
  UpdateProjectDTO
} from 'src/validations/project.validation';
import { sendSSEMessage } from 'src/utils/sse-notification.util';

jest.mock('src/config/prisma', () => ({
  project: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  user: {
    findFirst: jest.fn()
  },
  favoriteProject: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
  },
  archiveProject: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
  },
  $transaction: jest.fn((callback) => callback(prismaClient)),
  projectMember: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn()
  },
  taskAssignee: {
    deleteMany: jest.fn()
  }
}));

jest.mock('src/utils/sse-notification.util', () => ({
  sendSSEMessage: jest.fn()
}));

describe('Project Controller', () => {
  let mockReq: Partial<TypedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      payload: {
        userId: '1'
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleCreateProject', () => {
    const createProjectReq: Partial<ValidatedRequest<CreateProjectDTO>> = {
      body: {
        name: 'New Project',
        isTeamProject: true
      },
      payload: {
        userId: '1'
      }
    };

    it('should create a new project successfully', async () => {
      const mockProject = {
        id: '1',
        name: 'New Project'
      };

      (prismaClient.project.create as jest.Mock).mockResolvedValue(mockProject);
      (prismaClient.projectMember.create as jest.Mock).mockResolvedValue({
        id: '1',
        projectId: '1',
        userId: '1'
      });

      await handleCreateProject(
        createProjectReq as ValidatedRequest<CreateProjectDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.project.create as jest.Mock).toHaveBeenCalledWith({
        data: {
          name: 'New Project',
          isTeamProject: true,
          ownerId: '1'
        },
        select: {
          id: true,
          name: true
        }
      });

      expect(prismaClient.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: '1',
          userId: '1'
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { project: mockProject }
      });
    });

    it('should throw unauthorized error when userId is missing', async () => {
      const reqWithoutUserId = {
        ...createProjectReq,
        payload: undefined
      };

      await handleCreateProject(
        reqWithoutUserId as unknown as ValidatedRequest<CreateProjectDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.project.create).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      (prismaClient.project.create as jest.Mock).mockRejectedValue(dbError);

      await handleCreateProject(
        createProjectReq as ValidatedRequest<CreateProjectDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle transaction errors', async () => {
      const transactionError = new Error('Transaction failed');
      (prismaClient.$transaction as jest.Mock).mockRejectedValue(
        transactionError
      );

      await handleCreateProject(
        createProjectReq as ValidatedRequest<CreateProjectDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleGetAllProject', () => {
    let mockReq: Partial<TypedRequest>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        payload: {
          userId: '1'
        }
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
      jest.clearAllMocks();
    });

    it('should return all projects for authenticated user', async () => {
      const mockProjects = [
        {
          id: '1',
          name: 'Team Project',
          isTeamProject: true,
          members: [{ userId: '1' }],
          ownerId: '2'
        },
        {
          id: '2',
          name: 'Personal Project',
          isTeamProject: false,
          members: [],
          ownerId: '1'
        }
      ];

      const mockFavorites = [{ projectId: '1' }];
      const mockArchived = [{ projectId: '2' }];

      (prismaClient.project.findMany as jest.Mock).mockResolvedValue(
        mockProjects
      );
      (prismaClient.favoriteProject.findMany as jest.Mock).mockResolvedValue(
        mockFavorites
      );
      (prismaClient.archiveProject.findMany as jest.Mock).mockResolvedValue(
        mockArchived
      );

      await handleGetAllProject(
        mockReq as TypedRequest,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.project.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              isTeamProject: true,
              members: { some: { userId: '1' } }
            },
            { isTeamProject: false, ownerId: '1' }
          ]
        },
        select: {
          id: true,
          name: true,
          isTeamProject: true,
          members: {
            where: { userId: '1' },
            select: { userId: true }
          },
          ownerId: true
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          team_projects: [
            {
              id: '1',
              name: 'Team Project',
              is_favorite: true,
              is_archived: false
            }
          ],
          personal_projects: [
            {
              id: '2',
              name: 'Personal Project',
              is_favorite: false,
              is_archived: true
            }
          ]
        }
      });
    });

    it('should throw unauthorized error when userId is missing', async () => {
      mockReq.payload = undefined as never;

      await handleGetAllProject(
        mockReq as TypedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      (prismaClient.project.findMany as jest.Mock).mockRejectedValue(dbError);

      await handleGetAllProject(
        mockReq as TypedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should handle empty project list', async () => {
      (prismaClient.project.findMany as jest.Mock).mockResolvedValue([]);
      (prismaClient.favoriteProject.findMany as jest.Mock).mockResolvedValue(
        []
      );
      (prismaClient.archiveProject.findMany as jest.Mock).mockResolvedValue([]);

      await handleGetAllProject(
        mockReq as TypedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          team_projects: [],
          personal_projects: []
        }
      });
    });
  });

  describe('handleGetProjectDetail', () => {
    const mockReq: Partial<ValidatedRequest> = {
      params: { projectId: '1' },
      payload: { userId: '1' }
    };

    it('should return project details for project owner', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        image: 'project.jpg',
        ownerId: '1',
        isTeamProject: true,
        createdAt: new Date(),
        members: [
          {
            user: {
              name: 'John Doe',
              avatar: 'avatar.jpg'
            }
          }
        ],
        tasks: [
          {
            id: '1',
            title: 'Test Task',
            description: 'Description',
            status: 'ACTIVE',
            dueDate: new Date(),
            assignedTo: [
              {
                user: {
                  name: 'John Doe',
                  avatar: 'avatar.jpg'
                }
              }
            ]
          }
        ]
      };

      (prismaClient.project.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValueOnce(mockProject);
      (prismaClient.projectMember.count as jest.Mock).mockResolvedValue(5);

      await handleGetProjectDetail(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          project: { ...mockProject, isProjectOwner: true },
          total_members: 5
        }
      });
    });

    it('should return project details for project member', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        image: 'project.jpg',
        ownerId: '2',
        isTeamProject: true,
        createdAt: new Date(),
        members: [],
        tasks: []
      };

      (prismaClient.project.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockProject);
      (prismaClient.projectMember.count as jest.Mock).mockResolvedValue(3);

      await handleGetProjectDetail(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          project: { ...mockProject, isProjectOwner: false },
          total_members: 3
        }
      });
    });

    it('should throw error if project not found', async () => {
      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(null);

      await handleGetProjectDetail(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should throw unauthorized error when userId or projectId missing', async () => {
      const invalidReq = { ...mockReq, payload: undefined };

      await handleGetProjectDetail(
        invalidReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleUpdateProjectName', () => {
    const mockReq: Partial<ValidatedRequest<UpdateProjectDTO>> = {
      params: { projectId: '1' },
      body: { name: 'Updated Project' },
      payload: { userId: '1' }
    };

    it('should update project name successfully', async () => {
      const mockProject = {
        id: '1',
        name: 'Old Name',
        members: [{ userId: '2' }]
      };

      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(
        mockProject
      );
      (prismaClient.project.update as jest.Mock).mockResolvedValue({ id: '1' });

      await handleUpdateProjectName(
        mockReq as ValidatedRequest<UpdateProjectDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.project.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated Project' },
        select: { id: true }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Project name has been updated'
      });
    });

    it('should throw unauthorized error when project not owned by user', async () => {
      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(null);

      await handleUpdateProjectName(
        mockReq as ValidatedRequest<UpdateProjectDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.project.update).not.toHaveBeenCalled();
    });

    it('should throw unauthorized error when userId or projectId missing', async () => {
      const invalidReq = { ...mockReq, payload: undefined };

      await handleUpdateProjectName(
        invalidReq as ValidatedRequest<UpdateProjectDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      (prismaClient.project.findFirst as jest.Mock).mockRejectedValue(dbError);

      await handleUpdateProjectName(
        mockReq as ValidatedRequest<UpdateProjectDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  describe('handleDeleteProject', () => {
    const mockReq: Partial<ValidatedRequest> = {
      params: { projectId: '1' },
      payload: { userId: '1' }
    };

    it('should delete project when user is owner', async () => {
      const mockProject = {
        name: 'Test Project',
        ownerId: '1',
        members: [{ userId: '2' }]
      };

      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(
        mockProject
      );
      (prismaClient.project.delete as jest.Mock).mockResolvedValue({ id: '1' });

      await handleDeleteProject(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.project.delete).toHaveBeenCalledWith({
        where: { id: '1' },
        select: { id: true }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Project has been deleted'
      });
    });

    it('should allow member to quit project', async () => {
      const mockProject = {
        name: 'Test Project',
        ownerId: '2',
        members: [{ userId: '1' }]
      };

      const mockUser = {
        name: 'Test User'
      };

      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(
        mockProject
      );
      (prismaClient.projectMember.delete as jest.Mock).mockResolvedValue({
        id: '1'
      });
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await handleDeleteProject(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.projectMember.delete).toHaveBeenCalledWith({
        where: {
          userId_projectId: {
            userId: '1',
            projectId: '1'
          }
        },
        select: { id: true }
      });

      expect(prismaClient.taskAssignee.deleteMany).toHaveBeenCalledWith({
        where: { projectId: '1', userId: '1' }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully quit from project Test Project'
      });
    });

    it('should throw error if project not found', async () => {
      (prismaClient.project.findFirst as jest.Mock).mockResolvedValue(null);

      await handleDeleteProject(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should throw unauthorized error when userId or projectId missing', async () => {
      const invalidReq = { ...mockReq, payload: undefined };

      await handleDeleteProject(
        invalidReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleGetMembers', () => {
    const mockReq: Partial<ValidatedRequest<void, GetProjectMembersDTO>> = {
      params: { projectId: '1' },
      query: { page: '1', limit: '10' }
    };

    it('should return paginated project members', async () => {
      const mockMembers = [
        {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            avatar: 'avatar.jpg'
          }
        }
      ];

      (prismaClient.projectMember.findMany as jest.Mock).mockResolvedValue(
        mockMembers
      );
      (prismaClient.projectMember.count as jest.Mock).mockResolvedValue(15);

      await handleGetMembers(
        mockReq as ValidatedRequest<void, GetProjectMembersDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.projectMember.findMany).toHaveBeenCalledWith({
        where: { projectId: '1' },
        skip: 0,
        take: 10,
        select: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          members: mockMembers,
          total_members: 15,
          total_pages: 2
        }
      });
    });

    it('should throw unauthorized error when projectId, page, or limit missing', async () => {
      const invalidReq = {
        params: {},
        query: {}
      };

      await handleGetMembers(
        invalidReq as ValidatedRequest<void, GetProjectMembersDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      (prismaClient.projectMember.findMany as jest.Mock).mockRejectedValue(
        dbError
      );

      await handleGetMembers(
        mockReq as ValidatedRequest<void, GetProjectMembersDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleAddMember', () => {
    const mockReq: Partial<ValidatedRequest<AddProjectMemberDTO>> = {
      params: { projectId: '1' },
      body: { email: 'newmember@example.com' }
    };

    it('should add new member successfully', async () => {
      const mockNewMember = { id: '2' };
      const mockProject = { name: 'Test Project' };

      (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValue(
        null
      );
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(
        mockNewMember
      );
      (prismaClient.projectMember.create as jest.Mock).mockResolvedValue({
        project: mockProject
      });

      await handleAddMember(
        mockReq as ValidatedRequest<AddProjectMemberDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: '1',
          userId: '2'
        },
        select: { project: { select: { name: true } } }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Member has been added'
      });
    });

    it('should throw error if member already exists', async () => {
      (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValue({
        id: '1'
      });

      await handleAddMember(
        mockReq as ValidatedRequest<AddProjectMemberDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(prismaClient.projectMember.create).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValue(
        null
      );
      (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null);

      await handleAddMember(
        mockReq as ValidatedRequest<AddProjectMemberDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error if projectId is missing', async () => {
      const invalidReq = {
        ...mockReq,
        params: {}
      };

      await handleAddMember(
        invalidReq as ValidatedRequest<AddProjectMemberDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleRemoveMember', () => {
    const mockReq: Partial<ValidatedRequest<RemoveProjectMemberDTO>> = {
      params: { projectId: '1' },
      body: { userId: '2' }
    };

    it('should remove member successfully', async () => {
      (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValue({
        id: '1'
      });
      (prismaClient.projectMember.delete as jest.Mock).mockResolvedValue({
        id: '1',
        project: { name: 'Test Project' }
      });

      await handleRemoveMember(
        mockReq as ValidatedRequest<RemoveProjectMemberDTO>,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.projectMember.delete).toHaveBeenCalledWith({
        where: {
          userId_projectId: {
            userId: '2',
            projectId: '1'
          }
        },
        select: { id: true, project: { select: { name: true } } }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Member has been removed'
      });
    });

    it('should throw error if member not found', async () => {
      (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValue(
        null
      );

      await handleRemoveMember(
        mockReq as ValidatedRequest<RemoveProjectMemberDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error if projectId is missing', async () => {
      const invalidReq = {
        ...mockReq,
        params: {}
      };

      await handleRemoveMember(
        invalidReq as ValidatedRequest<AddProjectMemberDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error if deletion fails', async () => {
      (prismaClient.projectMember.findFirst as jest.Mock).mockResolvedValue({
        id: '1'
      });
      (prismaClient.projectMember.delete as jest.Mock).mockResolvedValue(null);

      await handleRemoveMember(
        mockReq as ValidatedRequest<RemoveProjectMemberDTO>,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleToggleProjectToFavorite', () => {
    const mockReq: Partial<ValidatedRequest> = {
      params: { projectId: '1' },
      payload: { userId: '1' }
    };

    it('should add project to favorites', async () => {
      (prismaClient.favoriteProject.findFirst as jest.Mock).mockResolvedValue(
        null
      );
      (prismaClient.favoriteProject.create as jest.Mock).mockResolvedValue({
        id: '1'
      });

      await handleToggleProjectToFavorite(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.favoriteProject.create).toHaveBeenCalledWith({
        data: { projectId: '1', userId: '1' }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully added project to favorite'
      });
    });

    it('should remove project from favorites', async () => {
      (prismaClient.favoriteProject.findFirst as jest.Mock).mockResolvedValue({
        id: '1'
      });
      (prismaClient.favoriteProject.delete as jest.Mock).mockResolvedValue({
        id: '1'
      });

      await handleToggleProjectToFavorite(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.favoriteProject.delete).toHaveBeenCalledWith({
        where: { id: '1' },
        select: { id: true }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully removed project from favorite'
      });
    });

    it('should throw unauthorized error when userId or projectId missing', async () => {
      const invalidReq = { ...mockReq, payload: undefined };

      await handleToggleProjectToFavorite(
        invalidReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleToggleProjectToArchive', () => {
    const mockReq: Partial<ValidatedRequest> = {
      params: { projectId: '1' },
      payload: { userId: '1' }
    };

    it('should add project to archive', async () => {
      (prismaClient.archiveProject.findFirst as jest.Mock).mockResolvedValue(
        null
      );
      (prismaClient.archiveProject.create as jest.Mock).mockResolvedValue({
        id: '1'
      });

      await handleToggleProjectToArchive(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.archiveProject.create).toHaveBeenCalledWith({
        data: { projectId: '1', userId: '1' }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully added project to archive'
      });
    });

    it('should remove project from archive', async () => {
      (prismaClient.archiveProject.findFirst as jest.Mock).mockResolvedValue({
        id: '1'
      });
      (prismaClient.archiveProject.delete as jest.Mock).mockResolvedValue({
        id: '1'
      });

      await handleToggleProjectToArchive(
        mockReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(prismaClient.archiveProject.delete).toHaveBeenCalledWith({
        where: { id: '1' },
        select: { id: true }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully removed project from archive'
      });
    });

    it('should throw unauthorized error when userId or projectId missing', async () => {
      const invalidReq = { ...mockReq, payload: undefined };

      await handleToggleProjectToArchive(
        invalidReq as ValidatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
