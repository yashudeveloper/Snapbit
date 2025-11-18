import { io, Socket } from 'socket.io-client'

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

interface TypingUser {
  userId: string
  username: string
  isTyping: boolean
}

interface WebSocketCallbacks {
  onMessage: (message: ChatMessage) => void
  onUserJoined: (data: { userId: string; username: string; displayName: string }) => void
  onUserLeft: (data: { userId: string; username: string }) => void
  onUserTyping: (data: TypingUser) => void
  onRoomJoined: (data: { roomId: string }) => void
  onError: (error: { message: string }) => void
  onConnect: () => void
  onDisconnect: () => void
}

export class WebSocketService {
  private socket: Socket | null = null
  private callbacks: Partial<WebSocketCallbacks> = {}
  private currentRooms: Set<string> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor() {
    // Initialize with empty callbacks
  }

  public connect(token: string, callbacks: Partial<WebSocketCallbacks> = {}) {
    if (this.socket?.connected) {
      console.log('🔌 WebSocket already connected')
      return
    }

    this.callbacks = callbacks
    
    console.log('🔌 Connecting to WebSocket server...')

    this.socket = io('http://localhost:3001', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id)
      this.reconnectAttempts = 0
      this.callbacks.onConnect?.()
      
      // Rejoin rooms after reconnection
      this.rejoinRooms()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
      this.callbacks.onDisconnect?.()
      
      // Attempt to reconnect if not manually disconnected
      if (reason !== 'io client disconnect') {
        this.attemptReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('💥 WebSocket connection error:', error)
      this.callbacks.onError?.({ message: `Connection failed: ${error.message}` })
      this.attemptReconnect()
    })

    // Chat events
    this.socket.on('new_message', (message: ChatMessage) => {
      console.log('💬 New message received:', message)
      this.callbacks.onMessage?.(message)
    })

    this.socket.on('user_joined', (data) => {
      console.log('👋 User joined:', data)
      this.callbacks.onUserJoined?.(data)
    })

    this.socket.on('user_left', (data) => {
      console.log('👋 User left:', data)
      this.callbacks.onUserLeft?.(data)
    })

    this.socket.on('user_typing', (data: TypingUser) => {
      console.log('⌨️ User typing:', data)
      this.callbacks.onUserTyping?.(data)
    })

    this.socket.on('room_joined', (data) => {
      console.log('🏠 Room joined:', data)
      this.currentRooms.add(data.roomId)
      this.callbacks.onRoomJoined?.(data)
    })

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error)
      this.callbacks.onError?.(error)
    })
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      this.callbacks.onError?.({ message: 'Connection lost. Please refresh the page.' })
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`)

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect()
      }
    }, delay)
  }

  private rejoinRooms() {
    // Rejoin all previously joined rooms
    this.currentRooms.forEach(roomId => {
      console.log('🔄 Rejoining room:', roomId)
      this.joinRoom(roomId)
    })
  }

  public joinRoom(roomId: string) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot join room: WebSocket not connected')
      return
    }

    console.log('🏠 Joining room:', roomId)
    this.socket.emit('join_room', { roomId })
    this.currentRooms.add(roomId)
  }

  public leaveRoom(roomId: string) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot leave room: WebSocket not connected')
      return
    }

    console.log('🚪 Leaving room:', roomId)
    this.socket.emit('leave_room', { roomId })
    this.currentRooms.delete(roomId)
  }

  public sendMessage(roomId: string, content: string, messageType: 'text' | 'snap' = 'text', snapId?: string) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot send message: WebSocket not connected')
      return false
    }

    console.log('💬 Sending message to room:', roomId, content?.substring(0, 50))
    this.socket.emit('send_message', {
      roomId,
      content,
      messageType,
      snapId
    })
    return true
  }

  public sendSnap(roomId: string, snapId: string, caption?: string) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot send snap: WebSocket not connected')
      return false
    }

    console.log('📸 Sending snap to room:', roomId, 'snap:', snapId)
    this.socket.emit('send_snap', {
      roomId,
      snapId,
      caption
    })
    return true
  }

  public startTyping(roomId: string) {
    if (!this.socket?.connected) return

    this.socket.emit('typing_start', { roomId })
  }

  public stopTyping(roomId: string) {
    if (!this.socket?.connected) return

    this.socket.emit('typing_stop', { roomId })
  }

  public updateCallbacks(callbacks: Partial<WebSocketCallbacks>) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  public disconnect() {
    if (this.socket) {
      console.log('🔌 Manually disconnecting WebSocket')
      this.currentRooms.clear()
      this.socket.disconnect()
      this.socket = null
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false
  }

  public getConnectionId(): string | undefined {
    return this.socket?.id
  }

  public getCurrentRooms(): string[] {
    return Array.from(this.currentRooms)
  }
}

// Singleton instance
export const wsService = new WebSocketService()
export default wsService
