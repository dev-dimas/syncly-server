/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from 'src/middleware/logger';
import { errorHandler } from 'src/middleware/error-handler';
import { HttpException } from 'src/utils/http-exception.util';
import express, {
  type NextFunction,
  type Request,
  type Response
} from 'express';

jest.mock('src/middleware/logger', () => ({
  error: jest.fn()
}));

describe('errorHandler middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(errorHandler);
  });

  it('should handle HttpException and return correct status and message', async () => {
    const err = new HttpException(404, 'Not Found');
    const mockReq = {} as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Not Found' });
  });

  it('should handle invalid JSON and return 400 with Invalid body format message', async () => {
    const err = new SyntaxError('Unexpected token');
    (err as any).body = {};
    Object.assign(err, { body: {} });
    const mockReq = {} as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn()
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Invalid body format'
    });
  });

  it('should return 500 for any other error', async () => {
    const err = new Error('Some internal error');
    const mockReq = {} as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Internal Server Error'
    });
  });

  it('should log the error message', async () => {
    const err = new Error('Some internal error');
    const mockReq = {} as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith('Some internal error');
  });
});
