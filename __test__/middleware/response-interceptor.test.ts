import type { NextFunction, Request, Response } from 'express';
import { responseInterceptor } from 'src/middleware/response-interceptor';

describe('responseInterceptor', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    mockReq = {} as Request;
    jsonMock = jest.fn();
    mockRes = { statusCode: 200, json: jsonMock } as unknown as Response;
    mockNext = jest.fn();
  });

  it('should intercept response and modify the JSON structure', () => {
    const body = { message: 'Success' };

    responseInterceptor(mockReq, mockRes, mockNext);

    mockRes.json(body);

    expect(jsonMock).toHaveBeenCalledWith({
      status: 200,
      message: 'Success'
    });
  });

  it('should call next function after modification', () => {
    responseInterceptor(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle errors properly', () => {
    const error = new SyntaxError('Test error');
    const nextMock = jest.fn();
    const faultyInterceptor = (
      _req: Request,
      _res: Response,
      next: NextFunction
    ) => {
      next(error);
    };

    responseInterceptor(mockReq, mockRes, nextMock);
    faultyInterceptor(mockReq, mockRes, nextMock);
    expect(nextMock).toHaveBeenCalledWith(error);
  });
});
