import { Request, Response, NextFunction } from 'express'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Increase limits for development (React Strict Mode doubles requests)
const isDevelopment = process.env.NODE_ENV === 'development'
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (isDevelopment ? '1000' : '100'))

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip || 'unknown'
  const now = Date.now()
  
  // Clean up expired entries
  Object.keys(store).forEach(k => {
    if (store[k]!.resetTime < now) {
      delete store[k]
    }
  })

  // Initialize or get current count
  if (!store[key]) {
    store[key] = {
      count: 0,
      resetTime: now + WINDOW_MS
    }
  }

  const current = store[key]!

  // Reset if window has expired
  if (current.resetTime < now) {
    current.count = 0
    current.resetTime = now + WINDOW_MS
  }

  // Increment count
  current.count++

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS - current.count).toString(),
    'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
  })

  // Check if limit exceeded
  if (current.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    })
  }

  next()
}

// Special rate limiter for file uploads (more restrictive)
export const uploadRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = `upload:${req.ip || 'unknown'}`
  const now = Date.now()
  const uploadWindowMs = 60000 // 1 minute
  const maxUploads = 10 // 10 uploads per minute

  if (!store[key]) {
    store[key] = {
      count: 0,
      resetTime: now + uploadWindowMs
    }
  }

  const current = store[key]!

  if (current.resetTime < now) {
    current.count = 0
    current.resetTime = now + uploadWindowMs
  }

  current.count++

  res.set({
    'X-Upload-RateLimit-Limit': maxUploads.toString(),
    'X-Upload-RateLimit-Remaining': Math.max(0, maxUploads - current.count).toString(),
    'X-Upload-RateLimit-Reset': new Date(current.resetTime).toISOString()
  })

  if (current.count > maxUploads) {
    return res.status(429).json({
      error: 'Upload Rate Limit Exceeded',
      message: 'Too many uploads. Please wait before uploading again.',
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    })
  }

  next()
}
