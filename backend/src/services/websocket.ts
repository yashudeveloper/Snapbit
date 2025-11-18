import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase'

interface AuthenticatedSocket extends SocketIOServer {
  userId?: string
  userProfile?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'snap'
  snap_id?: string
  created_at: string
  sender?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface JoinRoomData {
  roomId: string
}

interface SendMessageData {
  roomId: string
  content: string
  messageType: 'text' | 'snap'
  snapId?: string
}

interface SendSnapData {
  roomId: string
  snapId: string
  caption?: string
}

export class WebSocketService {
  private io: SocketIOServer
  private connectedUsers: Map<string, string> = new Map() // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.setupMiddleware()
    this.setupEventHandlers()
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
        
        if (!token) {
          return next(new Error('Authentication token required'))
        }

        console.log('🔐 Authenticating WebSocket connection with token:', token.substring(0, 20) + '...')

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token)

        if (error || !user) {
          console.error('❌ WebSocket auth failed:', error)
          return next(new Error('Invalid or expired token'))
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('❌ Failed to fetch user profile:', profileError)
          return next(new Error('User profile not found'))
        }

        // Attach user info to socket
        socket.userId = user.id
        socket.userProfile = profile

        console.log('✅ WebSocket authenticated for user:', profile.username)
        next()
      } catch (error) {
        console.error('💥 WebSocket auth error:', error)
        next(new Error('Authentication failed'))
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: any) => {
      console.log('🔌 User connected:', socket.userProfile?.username, 'Socket ID:', socket.id)
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id)

      // Handle joining chat rooms
      socket.on('join_room', async (data: JoinRoomData) => {
        try {
          await this.handleJoinRoom(socket, data)
        } catch (error) {
          console.error('❌ Error joining room:', error)
          socket.emit('error', { message: 'Failed to join room' })
        }
      })

      // Handle leaving chat rooms
      socket.on('leave_room', (data: JoinRoomData) => {
        try {
          this.handleLeaveRoom(socket, data)
        } catch (error) {
          console.error('❌ Error leaving room:', error)
        }
      })

      // Handle sending messages
      socket.on('send_message', async (data: SendMessageData) => {
        try {
          await this.handleSendMessage(socket, data)
        } catch (error) {
          console.error('❌ Error sending message:', error)
          socket.emit('error', { message: 'Failed to send message' })
        }
      })

      // Handle sending snaps
      socket.on('send_snap', async (data: SendSnapData) => {
        try {
          await this.handleSendSnap(socket, data)
        } catch (error) {
          console.error('❌ Error sending snap:', error)
          socket.emit('error', { message: 'Failed to send snap' })
        }
      })

      // Handle typing indicators
      socket.on('typing_start', (data: { roomId: string }) => {
        socket.to(data.roomId).emit('user_typing', {
          userId: socket.userId,
          username: socket.userProfile?.username,
          isTyping: true
        })
      })

      socket.on('typing_stop', (data: { roomId: string }) => {
        socket.to(data.roomId).emit('user_typing', {
          userId: socket.userId,
          username: socket.userProfile?.username,
          isTyping: false
        })
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.userProfile?.username)
        this.connectedUsers.delete(socket.userId)
      })
    })
  }

  private async handleJoinRoom(socket: any, data: JoinRoomData) {
    const { roomId } = data

    console.log('🏠 User joining room:', socket.userProfile?.username, '→', roomId)

    // Verify user has access to this room
    const { data: participant, error } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', socket.userId)
      .single()

    if (error || !participant) {
      console.error('❌ User not authorized for room:', roomId)
      socket.emit('error', { message: 'Not authorized to join this room' })
      return
    }

    // Join the socket room
    socket.join(roomId)
    
    // Notify others in the room
    socket.to(roomId).emit('user_joined', {
      userId: socket.userId,
      username: socket.userProfile?.username,
      displayName: socket.userProfile?.display_name
    })

    // Send confirmation to user
    socket.emit('room_joined', { roomId })

    console.log('✅ User joined room successfully:', socket.userProfile?.username, '→', roomId)
  }

  private handleLeaveRoom(socket: any, data: JoinRoomData) {
    const { roomId } = data

    console.log('🚪 User leaving room:', socket.userProfile?.username, '←', roomId)

    socket.leave(roomId)
    
    // Notify others in the room
    socket.to(roomId).emit('user_left', {
      userId: socket.userId,
      username: socket.userProfile?.username
    })
  }

  private async handleSendMessage(socket: any, data: SendMessageData) {
    const { roomId, content, messageType, snapId } = data

    console.log('💬 Sending message:', socket.userProfile?.username, '→', roomId, ':', content?.substring(0, 50))

    try {
      // Save message to database (without foreign key join to avoid PGRST200 error)
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: socket.userId,
          content: content || null,
          message_type: messageType,
          snap_id: snapId || null
        })
        .select('*')
        .single()

      if (error) {
        console.error('❌ Failed to save message:', error)
        socket.emit('error', { message: 'Failed to save message' })
        return
      }

      // Fetch sender profile separately to avoid foreign key issues
      const { data: senderProfile, error: senderError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', socket.userId)
        .single()

      if (senderError) {
        console.error('❌ Failed to fetch sender profile:', senderError)
        // Continue without sender info rather than failing completely
      }

      // Prepare message for broadcast
      const messageData: ChatMessage = {
        id: message.id,
        room_id: message.room_id,
        sender_id: message.sender_id,
        content: message.content,
        message_type: message.message_type,
        snap_id: message.snap_id,
        created_at: message.created_at,
        sender: senderProfile || socket.userProfile || {
          id: socket.userId,
          username: socket.userProfile?.username || 'Unknown',
          display_name: socket.userProfile?.display_name || 'Unknown User',
          avatar_url: socket.userProfile?.avatar_url
        }
      }

      // Broadcast message to all users in the room
      this.io.to(roomId).emit('new_message', messageData)

      console.log('✅ Message sent successfully:', message.id)

    } catch (error) {
      console.error('💥 Error handling message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  }

  private async handleSendSnap(socket: any, data: SendSnapData) {
    const { roomId, snapId, caption } = data

    console.log('📸 Sending snap via WebSocket:', socket.userProfile?.username, '→', roomId, 'snap:', snapId)

    try {
      // Verify user is participant in the room
      const { data: participant, error: participantError } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', socket.userId)
        .single()

      if (participantError || !participant) {
        console.error('❌ User not participant in room:', participantError)
        socket.emit('error', { message: 'Not a participant in this chat room' })
        return
      }

      // Verify snap belongs to user and is accessible
      const { data: snap, error: snapError } = await supabase
        .from('snaps')
        .select('*')
        .eq('id', snapId)
        .eq('user_id', socket.userId)
        .eq('status', 'approved')
        .gt('expires_at', new Date().toISOString())
        .single()

      if (snapError || !snap) {
        console.error('❌ Snap verification failed:', snapError)
        socket.emit('error', { message: 'Snap not found or not accessible' })
        return
      }

      // Save snap message to database
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: socket.userId,
          content: caption || null,
          message_type: 'snap',
          snap_id: snapId
        })
        .select('*')
        .single()

      if (error) {
        console.error('❌ Failed to save snap message:', error)
        socket.emit('error', { message: 'Failed to save snap message' })
        return
      }

      // Prepare message for broadcast with snap details
      const messageData: ChatMessage = {
        id: message.id,
        room_id: message.room_id,
        sender_id: message.sender_id,
        content: message.content,
        message_type: message.message_type,
        snap_id: message.snap_id,
        created_at: message.created_at,
        sender: socket.userProfile || {
          id: socket.userId,
          username: socket.userProfile?.username || 'Unknown',
          display_name: socket.userProfile?.display_name || 'Unknown User',
          avatar_url: socket.userProfile?.avatar_url
        },
        snap: {
          id: snap.id,
          image_url: snap.image_url,
          caption: snap.caption,
          expires_at: snap.expires_at,
          status: snap.status
        }
      }

      // Broadcast snap message to all users in the room
      this.io.to(roomId).emit('new_message', messageData)

      console.log('✅ Snap sent successfully:', message.id)

    } catch (error) {
      console.error('💥 Error handling snap:', error)
      socket.emit('error', { message: 'Failed to send snap' })
    }
  }

  // Public method to send system messages
  public async sendSystemMessage(roomId: string, content: string) {
    const systemMessage = {
      id: `system_${Date.now()}`,
      room_id: roomId,
      sender_id: 'system',
      content,
      message_type: 'text' as const,
      created_at: new Date().toISOString(),
      sender: {
        id: 'system',
        username: 'system',
        display_name: 'System',
        avatar_url: undefined
      }
    }

    this.io.to(roomId).emit('new_message', systemMessage)
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId)
  }

  // Send direct message to specific user
  public sendDirectMessage(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId)
    if (socketId) {
      this.io.to(socketId).emit(event, data)
      return true
    }
    return false
  }
}

export default WebSocketService
