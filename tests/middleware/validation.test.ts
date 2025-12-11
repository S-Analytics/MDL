import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import {
    sanitize,
    validate,
    validateAll,
    validateAtLeastOne,
    validateBody,
    validateIf,
    validateParams,
    validateQuery,
} from '../../src/middleware/validation';
import { ValidationError } from '../../src/utils/errors';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/test',
      is: jest.fn(),
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('validate', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0).optional(),
    });

    it('should validate valid body data', () => {
      mockReq.body = { name: 'John', age: 30 };
      
      const middleware = validate(testSchema, { location: 'body' });
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ name: 'John', age: 30 });
    });

    it('should validate query params', () => {
      mockReq.query = { name: 'John' };
      
      const middleware = validate(testSchema, { location: 'query' });
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate path params', () => {
      mockReq.params = { name: 'John' };
      
      const middleware = validate(testSchema, { location: 'params' });
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw ValidationError on invalid data', () => {
      mockReq.body = { age: 30 }; // missing required 'name'
      
      const middleware = validate(testSchema, { location: 'body' });
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ValidationError);
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should strip unknown keys when stripUnknown is true', () => {
      mockReq.body = { name: 'John', unknown: 'value' };
      
      const middleware = validate(testSchema, { location: 'body', stripUnknown: true });
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body).toEqual({ name: 'John' });
    });

    it('should convert types when convert is true', () => {
      mockReq.body = { name: 'John', age: '30' };
      
      const middleware = validate(testSchema, { location: 'body', convert: true });
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.age).toBe(30);
    });

    it('should use request logger if available', () => {
      const mockLogger = { warn: jest.fn() };
      (mockReq as any).logger = mockLogger;
      mockReq.body = { age: 30 };
      
      const middleware = validate(testSchema, { location: 'body' });
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow();
      
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('validateAll', () => {
    const bodySchema = Joi.object({ name: Joi.string().required() });
    const querySchema = Joi.object({ page: Joi.number().min(1) });
    const paramsSchema = Joi.object({ id: Joi.string().required() });

    it('should validate multiple locations successfully', () => {
      mockReq.body = { name: 'John' };
      mockReq.query = { page: '2' };
      mockReq.params = { id: '123' };
      
      const middleware = validateAll({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
      });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query.page).toBe(2);
    });

    it('should throw ValidationError if any location fails', () => {
      mockReq.body = { name: 'John' };
      mockReq.query = { page: '-1' };
      mockReq.params = { id: '123' };
      
      const middleware = validateAll({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
      });
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ValidationError);
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should collect errors from all locations', () => {
      mockReq.body = {}; // missing name
      mockReq.query = { page: '-1' }; // invalid page
      
      const middleware = validateAll({
        body: bodySchema,
        query: querySchema,
      });
      
      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details).toHaveProperty('body');
        expect((error as ValidationError).details).toHaveProperty('query');
      }
    });

    it('should skip validation for null schemas', () => {
      mockReq.body = { name: 'John' };
      mockReq.query = { page: '2' };
      
      const middleware = validateAll({
        body: bodySchema,
        query: null as any, // Null schema should be skipped
        params: undefined as any, // Undefined schema should be skipped
      });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateBody', () => {
    it('should validate request body', () => {
      const schema = Joi.object({ name: Joi.string().required() });
      mockReq.body = { name: 'John' };
      
      const middleware = validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', () => {
      const schema = Joi.object({ search: Joi.string() });
      mockReq.query = { search: 'test' };
      
      const middleware = validateQuery(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('should validate path parameters', () => {
      const schema = Joi.object({ id: Joi.string().required() });
      mockReq.params = { id: '123' };
      
      const middleware = validateParams(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateIf', () => {
    const schema = Joi.object({ name: Joi.string().required() });

    it('should validate when condition is true', () => {
      mockReq.body = { name: 'John' };
      
      const middleware = validateIf(
        () => true,
        schema,
        { location: 'body' }
      );
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip validation when condition is false', () => {
      mockReq.body = {}; // invalid, but should be skipped
      
      const middleware = validateIf(
        () => false,
        schema,
        { location: 'body' }
      );
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use request in condition', () => {
      mockReq.body = { name: 'John' };
      (mockReq.is as jest.Mock).mockReturnValue(true);
      
      const middleware = validateIf(
        (req) => req.is('application/json') as boolean,
        schema,
        { location: 'body' }
      );
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.is).toHaveBeenCalledWith('application/json');
    });
  });

  describe('validateAtLeastOne', () => {
    it('should pass when at least one field exists', () => {
      mockReq.body = { email: 'test@example.com' };
      
      const middleware = validateAtLeastOne('body', ['email', 'phone']);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw when no fields exist', () => {
      mockReq.body = { name: 'John' };
      
      const middleware = validateAtLeastOne('body', ['email', 'phone']);
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ValidationError);
    });

    it('should throw when data is not an object', () => {
      mockReq.body = null;
      
      const middleware = validateAtLeastOne('body', ['email']);
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ValidationError);
    });

    it('should ignore empty string values', () => {
      mockReq.body = { email: '' };
      
      const middleware = validateAtLeastOne('body', ['email']);
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ValidationError);
    });

    it('should ignore null and undefined values', () => {
      mockReq.body = { email: null, phone: undefined };
      
      const middleware = validateAtLeastOne('body', ['email', 'phone']);
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ValidationError);
    });
  });

  describe('sanitize', () => {
    it('should sanitize string values in body', () => {
      mockReq.body = {
        name: '  <John>  ',
        description: 'Test <script>alert("xss")</script>',
      };
      
      const middleware = sanitize('body');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.description).toBe('Test scriptalert("xss")/script');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize nested objects', () => {
      mockReq.body = {
        user: {
          name: '<Admin>',
          email: '  admin@test.com  ',
        },
      };
      
      const middleware = sanitize('body');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.user.name).toBe('Admin');
      expect(mockReq.body.user.email).toBe('admin@test.com');
    });

    it('should sanitize arrays', () => {
      mockReq.body = {
        tags: ['<tag1>', '  tag2  ', '<tag3>'],
      };
      
      const middleware = sanitize('body');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should preserve non-string values', () => {
      mockReq.body = {
        name: 'John',
        age: 30,
        active: true,
        score: 3.14,
      };
      
      const middleware = sanitize('body');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.age).toBe(30);
      expect(mockReq.body.active).toBe(true);
      expect(mockReq.body.score).toBe(3.14);
    });

    it('should handle null and undefined', () => {
      mockReq.body = {
        name: 'John',
        email: null,
        phone: undefined,
      };
      
      const middleware = sanitize('body');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.email).toBeNull();
      expect(mockReq.body.phone).toBeUndefined();
    });

    it('should work with query params', () => {
      mockReq.query = { search: '  <test>  ' };
      
      const middleware = sanitize('query');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.query.search).toBe('test');
    });
  });
});
