import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, Camera, Smile, Wifi, WifiOff, Image, Clock, Eye } from 'lucide-react'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'
import { useChatRoom } from '../contexts/ChatRoomContext'
import SnapPicker from './SnapPicker'
import ChatSnapViewer from './ChatSnapViewer'

interface ChatRoomProps {
  roomId: string
  onBack: () => void
}

export default function ChatRoom({ roomId, onBack }: ChatRoomProps) {
  const { 
    messages, 
    rooms,
    sendMessage, 
    sendSnapToChat,
    fetchMessages, 
    markAsRead, 
    joinRoom, 
    leaveRoom, 
    startTyping, 
    stopTyping, 
    typingUsers, 
    isConnected 
  } = useChat()
  const { user } = useAuth()
  const { setChatRoomOpen } = useChatRoom()
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSnapPicker, setShowSnapPicker] = useState(false)
  const [selectedSnapMessage, setSelectedSnapMessage] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const roomMessages = messages[roomId] || []
  const currentRoom = rooms.find(room => room.id === roomId)
  
  // Get display info for the chat
  const displayName = currentRoom?.type === 'direct' && currentRoom.otherParticipant
    ? currentRoom.otherParticipant.display_name
    : currentRoom?.name || 'Chat'
  
  const avatarUrl = currentRoom?.type === 'direct' && currentRoom.otherParticipant
    ? currentRoom.otherParticipant.avatar_url
    : null
  
  const username = currentRoom?.type === 'direct' && currentRoom.otherParticipant
    ? currentRoom.otherParticipant.username
    : null

  // Debug logging
  console.log('🎯 ChatRoom:', { roomId, messagesCount: roomMessages.length, isConnected, displayName })

  useEffect(() => {
    // Set ChatRoom as open when component mounts
    setChatRoomOpen(true)
    
    fetchMessages(roomId)
    markAsRead(roomId)
    
    // Join WebSocket room for real-time updates
    joinRoom(roomId)
    
    return () => {
      // Set ChatRoom as closed when component unmounts
      setChatRoomOpen(false)
      
      // Leave room and stop typing when component unmounts
      leaveRoom(roomId)
      if (isTyping) {
        stopTyping(roomId)
      }
    }
  }, [roomId, setChatRoomOpen])

  useEffect(() => {
    scrollToBottom()
  }, [roomMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      startTyping(roomId)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      stopTyping(roomId)
    }, 2000)
  }

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false)
      stopTyping(roomId)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')
    
    // Stop typing indicator when sending
    handleStopTyping()

    try {
      await sendMessage(roomId, messageText)
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageText) // Restore message on error
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleSendSnap = async (snapId: string, caption?: string) => {
    try {
      console.log('📸 Sending snap to chat room:', { roomId, snapId, caption })
      const result = await sendSnapToChat(roomId, snapId, caption)
      
      if (result.error) {
        console.error('❌ Failed to send snap:', result.error)
        alert('Failed to send snap. Please try again.')
      } else {
        console.log('✅ Snap sent successfully')
      }
    } catch (error) {
      console.error('💥 Exception sending snap:', error)
      alert('Failed to send snap. Please try again.')
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffInHours = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Expires soon'
    if (diffInHours < 24) return `${diffInHours}h left`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d left`
  }

  const renderMessage = (message: any, index: number) => {
    const isMyMessage = message.sender_id === user?.id
    const isSnapMessage = message.message_type === 'snap'
    const isExpired = message.snap?.expires_at && new Date(message.snap.expires_at) < new Date()

    return (
      <div
        key={message.id || index}
        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[70%] ${
            isSnapMessage ? 'p-2' : 'p-3'
          } rounded-lg ${
            isMyMessage
              ? 'bg-snapchat-blue text-white'
              : 'bg-snapchat-gray-700 text-white'
          }`}
        >
          {!isMyMessage && (
            <p className="text-snapchat-yellow text-xs font-semibold mb-1">
              {message.sender?.display_name || 'Unknown User'}
            </p>
          )}

          {isSnapMessage ? (
            <div className="space-y-2">
              {/* Snap Image */}
              <div className="relative rounded-lg overflow-hidden">
                {isExpired ? (
                  <div className="w-full h-32 bg-snapchat-gray-800 flex flex-col items-center justify-center">
                    <Clock size={24} className="text-snapchat-gray-500 mb-2" />
                    <span className="text-snapchat-gray-500 text-sm">Snap Expired</span>
                  </div>
                ) : (
                  <>
                    <img
                      src={message.snap?.image_url}
                      alt="Snap"
                      className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        console.log('Opening snap viewer for:', message.snap?.id)
                        setSelectedSnapMessage(message)
                      }}
                    />
                    
                    {/* Snap Overlay Info */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full px-2 py-1 flex items-center space-x-1">
                      <Clock size={12} className="text-white" />
                      <span className="text-white text-xs">
                        {getTimeUntilExpiry(message.snap?.expires_at)}
                      </span>
                    </div>

                    {/* View Indicator */}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 rounded-full px-2 py-1 flex items-center space-x-1">
                      <Eye size={12} className="text-white" />
                      <span className="text-white text-xs">Tap to view</span>
                    </div>
                  </>
                )}
              </div>

              {/* Snap Caption */}
              {message.content && (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          ) : (
            <p>{message.content}</p>
          )}

          <span className="text-xs text-snapchat-gray-400 block text-right mt-1">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="flex items-center space-x-4 p-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          {/* Friend Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-snapchat-yellow to-yellow-400 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-black font-bold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          {/* Chat Info */}
          <div className="flex-1">
            <h2 className="text-white font-semibold text-lg">{displayName}</h2>
            <div className="flex items-center space-x-2">
              {/* Username */}
              {username && (
                <p className="text-snapchat-gray-400 text-sm">
                  @{username}
                </p>
              )}
              
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                {isConnected ? (
                  <Wifi size={10} className="text-green-400" />
                ) : (
                  <WifiOff size={10} className="text-red-400" />
                )}
              </div>
              
              {/* Typing Indicator */}
              {typingUsers[roomId] && typingUsers[roomId].length > 0 && (
                <p className="text-snapchat-yellow text-xs">
                  typing...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {roomMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-snapchat-gray-800 flex items-center justify-center mb-4">
              <Camera size={24} className="text-snapchat-gray-400" />
            </div>
            <p className="text-snapchat-gray-400 text-center">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          roomMessages.map((message, index) => renderMessage(message, index))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-snapchat-gray-900 border-t border-snapchat-gray-800 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowSnapPicker(true)}
            className="p-3 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors"
          >
            <Image size={20} />
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onBlur={handleStopTyping}
              className="w-full px-4 py-3 bg-snapchat-gray-800 text-white rounded-full border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
              maxLength={500}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400"
            >
              <Smile size={20} />
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`p-3 rounded-full transition-colors ${
              newMessage.trim() && !sending
                ? 'bg-snapchat-blue text-white'
                : 'bg-snapchat-gray-800 text-snapchat-gray-400'
            }`}
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>

      {/* Snap Picker Modal */}
      {showSnapPicker && (
        <SnapPicker
          onClose={() => setShowSnapPicker(false)}
          onSelectSnap={handleSendSnap}
        />
      )}

      {/* Chat Snap Viewer Modal */}
      {selectedSnapMessage && selectedSnapMessage.snap && (
        <ChatSnapViewer
          snap={{
            id: selectedSnapMessage.snap.id,
            image_url: selectedSnapMessage.snap.image_url,
            caption: selectedSnapMessage.snap.caption,
            expires_at: selectedSnapMessage.snap.expires_at,
            status: selectedSnapMessage.snap.status
          }}
          sender={{
            id: selectedSnapMessage.sender?.id || selectedSnapMessage.sender_id,
            username: selectedSnapMessage.sender?.username || 'unknown',
            display_name: selectedSnapMessage.sender?.display_name || 'Unknown User',
            avatar_url: selectedSnapMessage.sender?.avatar_url
          }}
          messageCaption={selectedSnapMessage.content}
          onClose={() => setSelectedSnapMessage(null)}
          onReact={async (reaction: string) => {
            console.log('Reacting to snap:', reaction)
            // TODO: Implement snap reactions in chat
          }}
        />
      )}
    </div>
  )
}
