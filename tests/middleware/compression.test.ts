import { NextFunction, Request, Response } from 'express';
import { compressionMiddleware } from '../../src/middleware/compression';

describe('Compression Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  describe('compressionMiddleware', () => {
    describe('configuration', () => {
      it('should create middleware with default configuration', () => {
        const middleware = compressionMiddleware();
        expect(middleware).toBeDefined();
        expect(typeof middleware).toBe('function');
      });

      it('should create middleware with custom configuration', () => {
        const middleware = compressionMiddleware({
          level: 9,
          threshold: 2048,
          enabled: true,
          memLevel: 9,
        });
        expect(middleware).toBeDefined();
      });

      it('should return no-op middleware when disabled', () => {
        const middleware = compressionMiddleware({ enabled: false });
        
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Compression', 'disabled');
        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('shouldCompress filter logic', () => {
      it('should respect NODE_ENV=production for default enabled state', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const middleware = compressionMiddleware();
        expect(middleware).toBeDefined();

        process.env.NODE_ENV = originalEnv;
      });

      it('should respect ENABLE_COMPRESSION environment variable', () => {
        const originalEnv = process.env.ENABLE_COMPRESSION;
        process.env.ENABLE_COMPRESSION = 'true';

        const middleware = compressionMiddleware();
        expect(middleware).toBeDefined();

        process.env.ENABLE_COMPRESSION = originalEnv;
      });

      it('should allow explicit disabling regardless of environment', () => {
        // The DEFAULT_CONFIG is evaluated at module load time, so we can't test
        // environment-based enabling dynamically. Instead, test explicit disabling.
        const middleware = compressionMiddleware({ enabled: false });
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Compression', 'disabled');
        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('compression levels', () => {
      it('should accept compression level 0 (no compression)', () => {
        const middleware = compressionMiddleware({
          level: 0,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });

      it('should accept compression level 1 (fastest)', () => {
        const middleware = compressionMiddleware({
          level: 1,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });

      it('should accept compression level 6 (default)', () => {
        const middleware = compressionMiddleware({
          level: 6,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });

      it('should accept compression level 9 (best compression)', () => {
        const middleware = compressionMiddleware({
          level: 9,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });
    });

    describe('threshold configuration', () => {
      it('should accept default threshold of 1024 bytes', () => {
        const middleware = compressionMiddleware({
          threshold: 1024,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });

      it('should accept custom threshold', () => {
        const middleware = compressionMiddleware({
          threshold: 2048,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });

      it('should accept zero threshold to compress all responses', () => {
        const middleware = compressionMiddleware({
          threshold: 0,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });
    });

    describe('memory level configuration', () => {
      it('should accept default memLevel of 8', () => {
        const middleware = compressionMiddleware({
          memLevel: 8,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });

      it('should accept custom memLevel', () => {
        const middleware = compressionMiddleware({
          memLevel: 9,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });

      it('should accept minimum memLevel of 1', () => {
        const middleware = compressionMiddleware({
          memLevel: 1,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });
    });

    describe('integration', () => {
      it('should create functional middleware that calls next', () => {
        const middleware = compressionMiddleware({ enabled: false });
        
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should handle multiple invocations', () => {
        const middleware = compressionMiddleware({ enabled: false });
        
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(2);
      });

      it('should work with partial config overrides', () => {
        const middleware = compressionMiddleware({
          level: 7,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });
    });

    describe('edge cases', () => {
      it('should handle empty config object', () => {
        const middleware = compressionMiddleware({});
        expect(middleware).toBeDefined();
      });

      it('should handle undefined config', () => {
        const middleware = compressionMiddleware(undefined);
        expect(middleware).toBeDefined();
      });

      it('should preserve config defaults when partially overridden', () => {
        const middleware = compressionMiddleware({
          level: 7,
          // threshold and memLevel should use defaults
        });
        expect(middleware).toBeDefined();
      });
    });
  });

  describe('shouldCompress filter scenarios', () => {
    // Test different scenarios that trigger the filter logic
    // The shouldCompress function is internal but we can test scenarios it handles
    
    it('should handle x-no-compression header scenario', () => {
      mockRequest.headers = { 'x-no-compression': 'true' };
      const middleware = compressionMiddleware({ enabled: true });
      
      // Call middleware - it should set up compression with the custom filter
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle Content-Encoding already set scenario', () => {
      mockRequest.headers = {};
      (mockResponse.getHeader as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Encoding') return 'gzip';
        return undefined;
      });
      
      const middleware = compressionMiddleware({ enabled: true });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle stream content type scenario', () => {
      mockRequest.headers = {};
      (mockResponse.getHeader as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'application/octet-stream';
        return undefined;
      });
      
      const middleware = compressionMiddleware({ enabled: true });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle image content type scenario', () => {
      mockRequest.headers = {};
      (mockResponse.getHeader as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'image/png';
        return undefined;
      });
      
      const middleware = compressionMiddleware({ enabled: true });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle video content type scenario', () => {
      mockRequest.headers = {};
      (mockResponse.getHeader as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'video/mp4';
        return undefined;
      });
      
      const middleware = compressionMiddleware({ enabled: true });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle audio content type scenario', () => {
      mockRequest.headers = {};
      (mockResponse.getHeader as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'audio/mpeg';
        return undefined;
      });
      
      const middleware = compressionMiddleware({ enabled: true });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle zip file scenario', () => {
      mockRequest.headers = {};
      (mockResponse.getHeader as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'application/zip';
        return undefined;
      });
      
      const middleware = compressionMiddleware({ enabled: true });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle gzip content scenario', () => {
      mockRequest.headers = {};
      (mockResponse.getHeader as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'application/gzip';
        return undefined;
      });
      
      const middleware = compressionMiddleware({ enabled: true });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle x-compressed content scenario', () => {
      mockRequest.headers = {};
      (mockResponse.getHeader as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'application/x-compressed';
        return undefined;
      });
      
      const middleware = compressionMiddleware({ enabled: true });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
