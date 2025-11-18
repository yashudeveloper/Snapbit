import { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // Default error response
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal Server Error'
  let code = error.code || 'INTERNAL_ERROR'

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400
    code = 'VALIDATION_ERROR'
  } else if (error.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
    code = 'INVALID_ID'
  } else if (error.message.includes('duplicate key')) {
    statusCode = 409
    message = 'Resource already exists'
    code = 'DUPLICATE_RESOURCE'
  } else if (error.message.includes('not found')) {
    statusCode = 404
    message = 'Resource not found'
    code = 'NOT_FOUND'
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error'
  }

  res.status(statusCode).json({
    error: code,
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const createError = (statusCode: number, message: string, code?: string): ApiError => {
  const error = new Error(message) as ApiError
  error.statusCode = statusCode
  error.code = code
  return error
}
