/* eslint-disable node/prefer-promises/fs */
/* eslint-disable security/detect-non-literal-fs-filename */
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sharp from 'sharp';
import prismaClient from 'src/config/prisma';
import { type ValidatedRequest } from 'src/types/types';
import { HttpException } from 'src/utils/http-exception.util';
import { pathUpload } from 'src/utils/path-upload.util';
import { type UpdateUserDTO } from 'src/validations/user.validation';
import path from 'path';
import fs from 'fs';

/**
 * Handles get user profile
 */
export const handleGetUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.payload?.userId;

    if (!userId) throw new HttpException(StatusCodes.UNAUTHORIZED);

    const allProjects = await prismaClient.project.findMany({
      where: {
        OR: [
          {
            isTeamProject: true,
            members: { some: { userId } }
          },
          { isTeamProject: false, ownerId: userId }
        ]
      },
      select: {
        id: true,
        name: true,
        isTeamProject: true,
        members: {
          where: { userId },
          select: { userId: true }
        },
        ownerId: true
      }
    });

    const favoriteProjectIdsSet = new Set(
      await prismaClient.favoriteProject
        .findMany({
          where: { userId },
          select: { projectId: true }
        })
        .then((results) => results.map((res) => res.projectId))
    );

    const archiveProjectIdsSet = new Set(
      await prismaClient.archiveProject
        .findMany({
          where: { userId },
          select: { projectId: true }
        })
        .then((results) => results.map((res) => res.projectId))
    );

    const teamProjects: Array<Record<string, string | boolean>> = [];
    const personalProjects: Array<Record<string, string | boolean>> = [];

    allProjects.forEach((project) => {
      const projectData = {
        id: project.id,
        name: project.name,
        is_favorite: favoriteProjectIdsSet.has(project.id),
        is_archived: archiveProjectIdsSet.has(project.id)
      };

      if (project.isTeamProject) {
        teamProjects.push(projectData);
      } else {
        personalProjects.push(projectData);
      }
    });

    return res.status(200).json({
      team_projects: teamProjects,
      personal_projects: personalProjects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * This function handles the process of updating a user's account.
 */
export const handleUpdateUser = async (
  req: ValidatedRequest<UpdateUserDTO>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, deleteAvatar } = req.body;

    if (!name && !email && !req.file) {
      return res.status(200).json({ message: 'Nothing need to update' });
    }

    if (!req.payload?.userId) throw new HttpException(StatusCodes.UNAUTHORIZED);

    const user = await prismaClient.user.findUnique({
      where: {
        id: req.payload.userId
      },
      select: {
        name: true,
        email: true,
        avatar: true
      }
    });

    if (!user) throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');

    if (name) {
      user.name = name;
    }

    if (email) {
      const checkUserEmail = await prismaClient.user.findUnique({
        where: { email },
        select: { id: true }
      });

      if (checkUserEmail) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Email already taken!'
        );
      }
      user.email = email;
    }

    if (deleteAvatar && user.avatar) {
      const avatarPath = path.resolve(process.cwd(), path.join(user.avatar));

      fs.unlink(avatarPath, (err) => {
        if (err) {
          throw new HttpException(
            StatusCodes.INTERNAL_SERVER_ERROR,
            'Failed to delete avatar'
          );
        }
      });

      user.avatar = null;
    }

    if (req.file) {
      const { outputPath, publicPath } = pathUpload({
        folder: '/users',
        filename: req.payload.userId
      });

      await sharp(req.file.buffer)
        .resize(1500)
        .webp({ quality: 80 })
        .toFile(outputPath);

      user.avatar = publicPath;
    }

    await prismaClient.user.update({
      where: { id: req.payload.userId },
      data: { ...user }
    });

    return res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};
