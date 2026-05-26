import { Request, Response, NextFunction, RequestHandler } from 'express';

// Wrap async route handlers to forward errors to the error middleware
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
