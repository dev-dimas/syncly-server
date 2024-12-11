import { errorHandler } from '../../src/middleware/error-handler';
import logger from '../../src/middleware/logger';
import type { Request, Response } from 'express';

jest.mock('../../src/middleware/logger.ts', () => ({
  error: jest.fn()
}));

describe('errorHandler Middleware', () => {
  it('should log the error and respond with status 500 and the error message', () => {
    const mockReq = {} as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    const error = new Error('Something went wrong');

    errorHandler(error, mockReq, mockRes);

    expect(logger.error).toHaveBeenCalledWith(error);

    expect(mockRes.status).toHaveBeenCalledWith(500);

    expect(mockRes.json).toHaveBeenCalledWith({ message: error.message });
  });
});
