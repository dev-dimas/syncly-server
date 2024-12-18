// /* eslint-disable node/no-unpublished-import */
// import type { Request, Response } from 'express';
// import { StatusCodes } from 'http-status-codes';
// import prismaClient from 'src/config/prisma';
// import isProjectOwner from 'src/middleware/is-project-owner';
// import { HttpException } from 'src';

// import { PrismockClient } from 'prismock';

// const prismock = new PrismockClient();
// const app = createApp(prismock);

// async function checkOwnership(id: string, ownerId: string) {
//   return await prismaClient.project.findFirst({
//     where: {
//       id,
//       ownerId
//     },
//     select: { id: true }
//   });
// }

// describe('isProjectOwner middleware', () => {
//   let mockReq: Partial<Request>;
//   let mockRes: Partial<Response>;
//   let mockNext: jest.Mock;

//   beforeEach(() => {
//     mockReq = {
//       payload: { userId: '123' },
//       params: { projectId: '456' }
//     };
//     mockRes = {};
//     mockNext = jest.fn();
//   });

//   it('should call next() if user is the owner of the project', async () => {
//     const mockProject = { id: '456', ownerId: '123' };

//     prismaMock.project.findFirst.mockResolvedValue(mockProject);
//     prismaClient.project.findFirst = jest.fn().mockResolvedValue(mockProject);

//     await isProjectOwner(mockReq as Request, mockRes as Response, mockNext);

//     expect(mockNext).toHaveBeenCalled();
//   });

//   it('should throw HttpException with StatusCodes.UNAUTHORIZED if userId or projectId is missing', async () => {
//     const error = new HttpException(StatusCodes.UNAUTHORIZED);

//     mockReq.payload = {} as never;
//     await isProjectOwner(mockReq as Request, mockRes as Response, mockNext);
//     expect(mockNext).toHaveBeenCalledWith(error);

//     mockReq.payload = { userId: '123' };
//     mockReq.params = {};
//     await isProjectOwner(mockReq as Request, mockRes as Response, mockNext);
//     expect(mockNext).toHaveBeenCalledWith(error);
//   });

//   it('should throw HttpException with StatusCodes.UNAUTHORIZED if project does not exist or user is not the owner', async () => {
//     const error = new HttpException(StatusCodes.UNAUTHORIZED);
//     prismaClient.project.findFirst = jest.fn().mockResolvedValue(null); // Simulate project not found

//     await isProjectOwner(mockReq as Request, mockRes as Response, mockNext);

//     expect(mockNext).toHaveBeenCalledWith(error);
//   });

//   it('should call next() if project is found and user is the owner', async () => {
//     const mockProject = { id: '456' };
//     prismaClient.project.findFirst = jest.fn().mockResolvedValue(mockProject);

//     await isProjectOwner(mockReq as Request, mockRes as Response, mockNext);

//     expect(mockNext).toHaveBeenCalled(); // Should call next() since project and user match
//   });

//   it('should call next(error) if any error occurs', async () => {
//     const error = new Error('Some unexpected error');
//     prismaClient.project.findFirst = jest.fn().mockRejectedValue(error);

//     await isProjectOwner(mockReq as Request, mockRes as Response, mockNext);

//     expect(mockNext).toHaveBeenCalledWith(error);
//   });
// });
