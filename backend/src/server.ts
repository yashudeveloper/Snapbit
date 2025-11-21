// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cron from 'node-cron'

// Import routes
import authRoutes from './routes/auth'
import profileRoutes from './routes/profiles'
import habitRoutes from './routes/habits'
import snapRoutes from './routes/snaps'
import friendRoutes from './routes/friends'
import chatRoutes from './routes/chat'
import leaderboardRoutes from './routes/leaderboard'
import snapFeedRoutes from './routes/snapFeed'
import streakRoutes from './routes/streaks'

// Import services
import { applyDailyPenalties } from './services/scoring'
import { updateLeaderboardCache } from './services/leaderboard'
import WebSocketService from './services/websocket'

// Import middleware
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimiter'
import { authMiddleware } from './middleware/auth'

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3001

// Initialize WebSocket service
const wsService = new WebSocketService(server)

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}))

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'))

// Rate limiting
app.use(rateLimiter)

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Snapbit API',
    version: '1.0.0',
    description: 'Habit tracking with friends - Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout'
      },
      profiles: {
        me: 'GET /api/profiles/me',
        update: 'PUT /api/profiles/me',
        byUsername: 'GET /api/profiles/:username'
      },
      habits: {
        list: 'GET /api/habits',
        create: 'POST /api/habits',
        update: 'PUT /api/habits/:id',
        delete: 'DELETE /api/habits/:id'
      },
      snaps: {
        create: 'POST /api/snaps',
        list: 'GET /api/snaps',
        verify: 'POST /api/snaps/:id/verify'
      },
      friends: {
        list: 'GET /api/friends',
        request: 'POST /api/friends/request',
        accept: 'PUT /api/friends/:id/accept',
        streaks: 'GET /api/friends/streaks'
      },
      chat: {
        rooms: 'GET /api/chat/rooms',
        messages: 'GET /api/chat/:roomId/messages',
        send: 'POST /api/chat/:roomId/messages'
      },
      leaderboard: 'GET /api/leaderboard',
      snapFeed: 'GET /api/snap-feed',
      streaks: 'GET /api/streaks'
    },
    websocket: 'ws://localhost:' + PORT,
    docs: 'https://github.com/yashudeveloper/Snapbit'
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API routes
app.use('/api/auth', authRoutes)
// Public profile routes (username availability check)
app.get('/api/profiles/username-available/:username', profileRoutes)
// Protected profile routes
app.use('/api/profiles', authMiddleware, profileRoutes)
app.use('/api/habits', authMiddleware, habitRoutes)
app.use('/api/snaps', authMiddleware, snapRoutes)
app.use('/api/friends', authMiddleware, friendRoutes)
app.use('/api/chat', authMiddleware, chatRoutes)
app.use('/api/leaderboard', authMiddleware, leaderboardRoutes)
app.use('/api/snap-feed', authMiddleware, snapFeedRoutes)
app.use('/api/streaks', authMiddleware, streakRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware
app.use(errorHandler)

// Cron jobs
if (process.env.NODE_ENV === 'production') {
  // Run daily penalties at 1 AM UTC
  cron.schedule('0 1 * * *', async () => {
    console.log('Running daily penalties...')
    try {
      await applyDailyPenalties()
      console.log('Daily penalties applied successfully')
    } catch (error) {
      console.error('Error applying daily penalties:', error)
    }
  })

  // Update leaderboard cache every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Updating leaderboard cache...')
    try {
      await updateLeaderboardCache()
      console.log('Leaderboard cache updated successfully')
    } catch (error) {
      console.error('Error updating leaderboard cache:', error)
    }
  })
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Start server with WebSocket support
server.listen(PORT, () => {
  console.log(`🚀 SnapHabit API server running on port ${PORT}`)
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log(`🔌 WebSocket server ready for real-time chat`)
})

export default app
