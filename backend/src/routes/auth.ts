import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { asyncHandler, createError } from '../middleware/errorHandler'

const router = express.Router()

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(50)
})

const signInSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1)
})

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', asyncHandler(async (req, res) => {
  const validationResult = signUpSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid request data', 'VALIDATION_ERROR')
  }

  const { email, password, username, displayName } = validationResult.data

  // Check if username is already taken
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username.toLowerCase())
    .single()

  if (existingUser) {
    throw createError(409, 'Username already taken')
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true // Auto-confirm for MVP
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw createError(409, 'Email already registered')
    }
    throw createError(400, authError.message)
  }

  if (!authData.user) {
    throw createError(500, 'Failed to create user')
  }

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      username: username.toLowerCase(),
      display_name: displayName,
      email,
      snap_score: 0,
      current_streak: 0,
      longest_streak: 0,
      ghost_mode: false,
      location_enabled: true
    })

  if (profileError) {
    // Clean up auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw createError(500, 'Failed to create user profile')
  }

  res.status(201).json({
    message: 'Account created successfully',
    user: {
      id: authData.user.id,
      email: authData.user.email,
      username: username.toLowerCase(),
      displayName
    }
  })
}))

/**
 * POST /api/auth/signin
 * Sign in with email/username and password
 */
router.post('/signin', asyncHandler(async (req, res) => {
  const validationResult = signInSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw createError(400, 'Invalid request data', 'VALIDATION_ERROR')
  }

  const { emailOrUsername, password } = validationResult.data
  
  let email = emailOrUsername

  // If input doesn't contain @, treat it as username and look up email
  if (!emailOrUsername.includes('@')) {
    console.log(`🔍 Looking up email for username: ${emailOrUsername}`)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', emailOrUsername.toLowerCase())
      .single()

    if (profileError || !profile) {
      console.log(`❌ Username not found: ${emailOrUsername}`)
      throw createError(401, 'Invalid username or password')
    }
    
    email = profile.email
    console.log(`✅ Found email for username: ${emailOrUsername}`)
  }

  console.log(`🔐 Attempting to sign in with email: ${email}`)
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    console.log(`❌ Sign in failed:`, error.message)
    if (error.message.includes('Invalid login credentials')) {
      throw createError(401, 'Invalid email/username or password')
    }
    throw createError(401, error.message)
  }

  if (!data.user || !data.session) {
    throw createError(401, 'Authentication failed')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    throw createError(500, 'Failed to fetch user profile')
  }

  console.log(`✅ Sign in successful for user: ${profile.username}`)

  res.json({
    message: 'Signed in successfully',
    user: data.user,
    session: data.session,
    profile
  })
}))

/**
 * POST /api/auth/signout
 * Sign out the current user
 */
router.post('/signout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    
    // Sign out with the token
    await supabase.auth.admin.signOut(token)
  }

  res.json({
    message: 'Signed out successfully'
  })
}))

/**
 * POST /api/auth/refresh
 * Refresh the access token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    throw createError(400, 'Refresh token is required')
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  })

  if (error) {
    throw createError(401, 'Invalid refresh token')
  }

  res.json({
    message: 'Token refreshed successfully',
    session: data.session
  })
}))

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError(401, 'Authorization token required')
  }

  const token = authHeader.substring(7)

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw createError(401, 'Invalid or expired token')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw createError(500, 'Failed to fetch user profile')
  }

  res.json({
    user,
    profile
  })
}))

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email || !z.string().email().safeParse(email).success) {
    throw createError(400, 'Valid email is required')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  })

  if (error) {
    // Don't expose whether email exists or not
    console.error('Password reset error:', error)
  }

  res.json({
    message: 'If an account with that email exists, a password reset link has been sent.'
  })
}))

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body

  if (!token || !password) {
    throw createError(400, 'Token and new password are required')
  }

  if (password.length < 6) {
    throw createError(400, 'Password must be at least 6 characters long')
  }

  const { data, error } = await supabase.auth.updateUser({
    password
  })

  if (error) {
    throw createError(400, 'Invalid or expired reset token')
  }

  res.json({
    message: 'Password reset successfully',
    user: data.user
  })
}))

export default router
