import { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role?: string
  }
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authorization token provided'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      })
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication verification failed'
    })
  }
}

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email || '',
          role: user.role
        }
      }
    }

    next()
  } catch (error) {
    // For optional auth, we don't fail on errors
    next()
  }
}
