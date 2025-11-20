/**
 * Validation middleware using Joi
 * Validates request body, query params, and path params against Joi schemas
 */

import { NextFunction, Request, Response } from 'express';
import { ValidationError as JoiValidationError, Schema } from 'joi';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Schema location in the request object
 */
export type SchemaLocation = 'body' | 'query' | 'params';

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Location of the data to validate
   */
  location: SchemaLocation;
  
  /**
   * Whether to strip unknown keys from the validated data
   * @default true
   */
  stripUnknown?: boolean;
  
  /**
   * Whether to abort validation on first error
   * @default false
   */
  abortEarly?: boolean;
  
  /**
   * Whether to convert values to the correct type
   * @default true
   */
  convert?: boolean;
}

/**
 * Creates a validation middleware for a Joi schema
 * 
 * @param schema - Joi schema to validate against
 * @param options - Validation options
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * import { validate } from './middleware/validation';
 * import { metricDefinitionSchema } from './validation/schemas';
 * 
 * app.post('/api/metrics',
 *   validate(metricDefinitionSchema, { location: 'body' }),
 *   async (req, res) => {
 *     // req.body is now validated and typed
 *   }
 * );
 * ```
 */
export function validate(
  schema: Schema,
  options: ValidationOptions = { location: 'body' }
) {
  const {
    location,
    stripUnknown = true,
    abortEarly = false,
    convert = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[location];
    
    // Get request logger if available
    const reqLogger = (req as any).logger || logger;
    
    const { error, value } = schema.validate(data, {
      abortEarly,
      stripUnknown,
      convert,
      // Don't force all fields to be required - let schema define requirements
      presence: 'optional',
      errors: {
        wrap: {
          label: '',
        },
      },
    });

    if (error) {
      const validationDetails = formatValidationError(error);
      
      reqLogger.warn(
        {
          location,
          errors: validationDetails,
          path: req.path,
        },
        'Validation failed'
      );
      
      throw new ValidationError(
        `Validation failed for ${location}`,
        validationDetails
      );
    }

    // Replace request data with validated and converted values
    (req as any)[location] = value;
    
    next();
  };
}

/**
 * Validates multiple locations in a single middleware
 * 
 * @param schemas - Object with schemas for different locations
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.get('/api/metrics/:id',
 *   validateAll({
 *     params: metricIdParamSchema,
 *     query: metricQuerySchema
 *   }),
 *   async (req, res) => {
 *     // Both params and query are validated
 *   }
 * );
 * ```
 */
export function validateAll(schemas: Partial<Record<SchemaLocation, Schema>>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, any[]> = {};
    const reqLogger = (req as any).logger || logger;
    
    // Validate each location
    for (const [location, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      
      const data = req[location as SchemaLocation];
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        // Don't force all fields to be required - let schema define requirements
        presence: 'optional',
        errors: {
          wrap: {
            label: '',
          },
        },
      });

      if (error) {
        errors[location] = formatValidationError(error);
      } else {
        // Replace with validated values
        (req as any)[location] = value;
      }
    }

    // If any errors occurred, throw validation error
    if (Object.keys(errors).length > 0) {
      reqLogger.warn(
        {
          errors,
          path: req.path,
        },
        'Multi-location validation failed'
      );
      
      throw new ValidationError(
        'Validation failed',
        errors
      );
    }

    next();
  };
}

/**
 * Formats Joi validation error into a structured format
 * 
 * @param error - Joi validation error
 * @returns Array of validation error details
 */
function formatValidationError(error: JoiValidationError): any[] {
  return error.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type,
    value: detail.context?.value,
  }));
}

/**
 * Validates request body against a schema
 * Convenience wrapper around validate()
 * 
 * @param schema - Joi schema to validate against
 * @returns Express middleware function
 */
export function validateBody(schema: Schema) {
  return validate(schema, { location: 'body' });
}

/**
 * Validates query parameters against a schema
 * Convenience wrapper around validate()
 * 
 * @param schema - Joi schema to validate against
 * @returns Express middleware function
 */
export function validateQuery(schema: Schema) {
  return validate(schema, { location: 'query' });
}

/**
 * Validates path parameters against a schema
 * Convenience wrapper around validate()
 * 
 * @param schema - Joi schema to validate against
 * @returns Express middleware function
 */
export function validateParams(schema: Schema) {
  return validate(schema, { location: 'params' });
}

/**
 * Creates a conditional validation middleware
 * Only validates if the condition function returns true
 * 
 * @param condition - Function that determines if validation should occur
 * @param schema - Joi schema to validate against
 * @param options - Validation options
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * // Only validate body if request has Content-Type: application/json
 * app.post('/api/metrics',
 *   validateIf(
 *     (req) => req.is('application/json'),
 *     metricDefinitionSchema,
 *     { location: 'body' }
 *   ),
 *   handler
 * );
 * ```
 */
export function validateIf(
  condition: (req: Request) => boolean,
  schema: Schema,
  options: ValidationOptions = { location: 'body' }
) {
  const validator = validate(schema, options);
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      validator(req, res, next);
    } else {
      next();
    }
  };
}

/**
 * Validates that at least one of the specified fields exists in the request data
 * 
 * @param location - Location to check
 * @param fields - Array of field names
 * @returns Express middleware function
 */
export function validateAtLeastOne(location: SchemaLocation, fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[location] as any;
    const reqLogger = (req as any).logger || logger;
    
    if (!data || typeof data !== 'object') {
      reqLogger.warn(
        { location, fields },
        'At-least-one validation failed: no data'
      );
      throw new ValidationError(
        `${location} must be an object`,
        []
      );
    }

    const hasAtLeastOne = fields.some((field) => {
      const value = data[field];
      return value !== undefined && value !== null && value !== '';
    });

    if (!hasAtLeastOne) {
      reqLogger.warn(
        { location, fields },
        'At-least-one validation failed: no required fields present'
      );
      throw new ValidationError(
        `At least one of the following fields is required in ${location}: ${fields.join(', ')}`,
        fields.map((field) => ({
          field,
          message: 'This field is required when others are not provided',
          type: 'any.required',
        }))
      );
    }

    next();
  };
}

/**
 * Sanitizes string values in request data to prevent injection attacks
 * Should be used after validation
 * 
 * @param location - Location to sanitize
 * @returns Express middleware function
 */
export function sanitize(location: SchemaLocation) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[location];
    
    if (data && typeof data === 'object') {
      req[location] = sanitizeObject(data);
    }
    
    next();
  };
}

/**
 * Recursively sanitizes an object's string values
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
function sanitizeObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
}

/**
 * Sanitizes a string value
 * Removes potentially dangerous characters
 * 
 * @param str - String to sanitize
 * @returns Sanitized string
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove angle brackets (basic XSS prevention)
    .trim();
}
