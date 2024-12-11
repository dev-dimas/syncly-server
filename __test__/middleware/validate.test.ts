import validate from '../../src/middleware/validate';
import httpStatus from 'http-status';
import Joi from 'joi';
import { type Request, type Response } from 'express';

jest.mock('express', () => ({
  Request: jest.fn(),
  Response: jest.fn(),
  NextFunction: jest.fn()
}));

describe('validate middleware', () => {
  const mockNext = jest.fn();
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as unknown as Response;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next if validation passes', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required()
      })
    };

    const req = {
      body: { name: 'John Doe' },
      query: {},
      params: {}
    } as unknown as Request;

    const middleware = validate(schema);

    middleware(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should return 400 with validation errors if validation fails', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required()
      })
    };

    const req = {
      body: {},
      query: {},
      params: {}
    } as unknown as Request;

    const middleware = validate(schema);

    middleware(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({
      errors: [
        {
          field: 'body.name',
          message: '"body.name" is required'
        }
      ]
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle multiple validation errors', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required(),
        age: Joi.number().min(18)
      })
    };

    const req = {
      body: { age: 16 },
      query: {},
      params: {}
    } as unknown as Request;

    const middleware = validate(schema);

    middleware(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({
      errors: [
        {
          field: 'body.name',
          message: '"body.name" is required'
        },
        {
          field: 'body.age',
          message: '"body.age" must be greater than or equal to 18'
        }
      ]
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should validate query and params as well', () => {
    const schema = {
      query: Joi.object({
        search: Joi.string().required()
      }),
      params: Joi.object({
        id: Joi.string().uuid().required()
      })
    };

    const req = {
      body: {},
      query: { search: 'test' },
      params: { id: 'invalid-uuid' }
    } as unknown as Request;

    const middleware = validate(schema);

    middleware(req, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({
      errors: [
        {
          field: 'params.id',
          message: '"params.id" must be a valid GUID'
        }
      ]
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
