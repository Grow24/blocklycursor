/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * NFR: production error handling
 */

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const payload = {
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }
  if (status >= 500) {
    console.error('[PBMP LMS]', err);
  }
  res.status(status).json(payload);
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
