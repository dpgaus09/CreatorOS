import { Response } from 'express';
import { User } from './shared/schema';

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }

    interface Response {
      // Define better res.end overloads
      end(cb?: () => void): this;
      end(chunk: string | Buffer, cb?: () => void): this;
      end(chunk: string | Buffer, encoding: BufferEncoding, cb?: () => void): this;
    }
  }
}

// Define ServerError interface for better error handling
declare global {
  interface ServerError extends Error {
    status?: number;
    statusCode?: number;
  }
}