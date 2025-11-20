/**
 * Error Utilities Tests
 * Tests for error classes, error handling, and error formatting
 */

import { Response } from 'express';
import {
    AppError,
    asyncHandler,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    createValidationError,
    DatabaseError,
    ErrorCode,
    isOperationalError,
    NotFoundError,
    sendErrorResponse,
    ValidationError,
} from '../../src/utils/errors';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError(
        'Test error',
        ErrorCode.INTERNAL_ERROR,
        500,
        { detail: 'test' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should mark error as non-operational when specified', () => {
      const error = new AppError(
        'Programming error',
        ErrorCode.INTERNAL_ERROR,
        500,
        undefined,
        false
      );

      expect(error.isOperational).toBe(false);
    });

    it('should inherit from Error', () => {
      const error = new AppError('Test', ErrorCode.INTERNAL_ERROR, 500);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with default status 400', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should include validation details', () => {
      const details = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is too short' },
      ];
      const error = new ValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('AuthenticationError', () => {
    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication failed');
      expect(error.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
      expect(error.statusCode).toBe(401);
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create AuthorizationError with default message', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe(ErrorCode.AUTHORIZATION_ERROR);
      expect(error.statusCode).toBe(403);
    });

    it('should accept custom message', () => {
      const error = new AuthorizationError('Admin access required');

      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with resource name only', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });

    it('should create NotFoundError with resource and identifier', () => {
      const error = new NotFoundError('Metric', 'METRIC-001');

      expect(error.message).toBe("Metric with identifier 'METRIC-001' not found");
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with message', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe(ErrorCode.CONFLICT);
      expect(error.statusCode).toBe(409);
    });

    it('should include conflict details', () => {
      const details = { existingId: 'METRIC-001', field: 'metric_id' };
      const error = new ConflictError('Duplicate metric ID', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('DatabaseError', () => {
    it('should create DatabaseError with message', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should include database error details', () => {
      const details = { code: 'ECONNREFUSED', host: 'localhost' };
      const error = new DatabaseError('Cannot connect to database', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('sendErrorResponse', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should send AppError response with correct status code', () => {
      const error = new ValidationError('Invalid data');
      sendErrorResponse(mockRes as Response, error, 'req-123');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid data',
          }),
          requestId: 'req-123',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle AuthenticationError', () => {
      const error = new AuthenticationError('Token expired');
      sendErrorResponse(mockRes as Response, error);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.AUTHENTICATION_ERROR,
            message: 'Token expired',
          }),
        })
      );
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('User', 'user-123');
      sendErrorResponse(mockRes as Response, error);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.NOT_FOUND,
          }),
        })
      );
    });

    it('should handle unknown errors with 500 status', () => {
      const error = new Error('Unexpected error');
      sendErrorResponse(mockRes as Response, error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.INTERNAL_ERROR,
          }),
        })
      );
    });

    it('should include details when VERBOSE_ERRORS is true', () => {
      const originalEnv = process.env.VERBOSE_ERRORS;
      process.env.VERBOSE_ERRORS = 'true';

      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Validation failed', details);
      sendErrorResponse(mockRes as Response, error);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details,
          }),
        })
      );

      process.env.VERBOSE_ERRORS = originalEnv;
    });

    it('should hide details when VERBOSE_ERRORS is false', () => {
      const originalEnv = process.env.VERBOSE_ERRORS;
      process.env.VERBOSE_ERRORS = 'false';

      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Validation failed', details);
      sendErrorResponse(mockRes as Response, error);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.not.objectContaining({
            details,
          }),
        })
      );

      process.env.VERBOSE_ERRORS = originalEnv;
    });

    it('should include timestamp in ISO format', () => {
      const error = new ValidationError('Test error');
      sendErrorResponse(mockRes as Response, error);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(call.timestamp).toBeDefined();
      expect(new Date(call.timestamp).toISOString()).toBe(call.timestamp);
    });
  });

  describe('createValidationError', () => {
    it('should create ValidationError from Joi error', () => {
      const joiError = {
        details: [
          {
            path: ['email'],
            message: '"email" is required',
            type: 'any.required',
          },
          {
            path: ['password', 'length'],
            message: '"password" must be at least 8 characters',
            type: 'string.min',
          },
        ],
      };

      const error = createValidationError(joiError);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual([
        {
          field: 'email',
          message: '"email" is required',
          type: 'any.required',
        },
        {
          field: 'password.length',
          message: '"password" must be at least 8 characters',
          type: 'string.min',
        },
      ]);
    });

    it('should handle single validation error', () => {
      const joiError = {
        details: [
          {
            path: ['username'],
            message: '"username" is required',
            type: 'any.required',
          },
        ],
      };

      const error = createValidationError(joiError);

      expect(error.details).toHaveLength(1);
      expect(error.details[0].field).toBe('username');
    });

    it('should handle nested field paths', () => {
      const joiError = {
        details: [
          {
            path: ['user', 'profile', 'email'],
            message: 'Invalid email',
            type: 'string.email',
          },
        ],
      };

      const error = createValidationError(joiError);

      expect(error.details[0].field).toBe('user.profile.email');
    });
  });

  describe('asyncHandler', () => {
    it('should wrap async function and catch errors', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const next = jest.fn();
      
      const wrapped = asyncHandler(asyncFn);
      await wrapped({}, {}, next);

      expect(asyncFn).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass successful result through', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const next = jest.fn();
      
      const wrapped = asyncHandler(asyncFn);
      await wrapped({}, {}, next);

      expect(asyncFn).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle async rejection', async () => {
      const asyncFn = jest.fn().mockImplementation(async () => {
        throw new Error('Async rejection');
      });
      const next = jest.fn();
      
      const wrapped = asyncHandler(asyncFn);
      await wrapped({}, {}, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Async rejection');
    });

    it('should pass req, res, next to wrapped function', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const req = { body: {} };
      const res = { json: jest.fn() };
      const next = jest.fn();
      
      const wrapped = asyncHandler(asyncFn);
      await wrapped(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
    });
  });

  describe('isOperationalError', () => {
    it('should return true for operational AppError', () => {
      const error = new ValidationError('Test error');
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for non-operational AppError', () => {
      const error = new AppError(
        'Programming error',
        ErrorCode.INTERNAL_ERROR,
        500,
        undefined,
        false
      );
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard error');
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return true for all standard error types', () => {
      expect(isOperationalError(new ValidationError('test'))).toBe(true);
      expect(isOperationalError(new AuthenticationError())).toBe(true);
      expect(isOperationalError(new AuthorizationError())).toBe(true);
      expect(isOperationalError(new NotFoundError('Resource'))).toBe(true);
      expect(isOperationalError(new ConflictError('test'))).toBe(true);
      expect(isOperationalError(new DatabaseError('test'))).toBe(true);
    });
  });
});
