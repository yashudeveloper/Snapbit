import { useState, useEffect } from 'react'
import { X, Heart, MessageCircle, Send, Clock, Eye, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface ChatSnapViewerProps {
  snap: {
    id: string
    image_url: string
    caption?: string
    expires_at: string
    status: string
  }
  sender: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
  messageCaption?: string
  onClose: () => void
  onReact?: (reaction: string) => Promise<void>
}

const reactionEmojis = {
  like: '❤️',
  love: '😍',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
}

export default function ChatSnapViewer({ 
  snap, 
  sender, 
  messageCaption, 
  onClose, 
  onReact 
}: ChatSnapViewerProps) {
  const { user } = useAuth()
  const [showReactions, setShowReactions] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  // Calculate time until expiry
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date()
      const expiry = new Date(snap.expires_at)
      const diffInSeconds = Math.floor((expiry.getTime() - now.getTime()) / 1000)
      
      if (diffInSeconds <= 0) {
        setTimeLeft('Expired')
        return
      }
      
      const hours = Math.floor(diffInSeconds / 3600)
      const minutes = Math.floor((diffInSeconds % 3600) / 60)
      const seconds = diffInSeconds % 60
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s left`)
      } else {
        setTimeLeft(`${seconds}s left`)
      }
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)
    
    return () => clearInterval(interval)
  }, [snap.expires_at])

  const handleReaction = async (reaction: string) => {
    if (reacting || !onReact) return
    
    setReacting(true)
    try {
      await onReact(reaction)
      setShowReactions(false)
    } catch (error) {
      console.error('Failed to react:', error)
    } finally {
      setReacting(false)
    }
  }

  const handleComment = async () => {
    if (!comment.trim() || sending) return
    
    setSending(true)
    try {
      // TODO: Implement comment functionality
      console.log('Comment:', comment.trim())
      setComment('')
    } finally {
      setSending(false)
    }
  }

  const isExpired = new Date(snap.expires_at) < new Date()

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center space-x-3">
          {/* Sender Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-snapchat-yellow to-yellow-400 flex items-center justify-center">
            {sender.avatar_url ? (
              <img
                src={sender.avatar_url}
                alt={sender.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User size={20} className="text-black" />
            )}
          </div>
          
          {/* Sender Info */}
          <div>
            <h4 className="text-white font-semibold text-sm">
              {sender.display_name}
            </h4>
            <div className="flex items-center space-x-2 text-white text-xs opacity-80">
              <Clock size={12} />
              <span>{timeLeft}</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black bg-opacity-60 text-white hover:bg-opacity-80 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Snap Image */}
      <div className="flex-1 flex items-center justify-center relative">
        {isExpired ? (
          <div className="flex flex-col items-center justify-center text-white">
            <Clock size={48} className="text-snapchat-gray-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Snap Expired</h3>
            <p className="text-snapchat-gray-400 text-center">
              This snap is no longer available
            </p>
          </div>
        ) : (
          <img
            src={snap.image_url}
            alt="Snap"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              console.error('Failed to load snap image:', snap.image_url)
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        {/* Tap to close hint */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 rounded-full px-4 py-2">
          <span className="text-white text-sm">Tap anywhere to close</span>
        </div>
      </div>

      {/* Caption */}
      {(messageCaption || snap.caption) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-4 pb-20">
          <div className="text-white text-center">
            {messageCaption && (
              <p className="text-lg font-medium mb-1">{messageCaption}</p>
            )}
            {snap.caption && snap.caption !== messageCaption && (
              <p className="text-sm text-snapchat-gray-300">Original: {snap.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* Reaction Buttons */}
      {showReactions && onReact && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black bg-opacity-80 rounded-full px-6 py-3">
          {Object.entries(reactionEmojis).map(([reaction, emoji]) => (
            <button
              key={reaction}
              onClick={() => handleReaction(reaction)}
              disabled={reacting}
              className="text-3xl hover:scale-110 transition-transform disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50">
        <div className="flex items-center justify-center space-x-6">
          {/* React Button */}
          {onReact && (
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="flex items-center space-x-2 text-white hover:text-red-400 transition-colors"
            >
              <Heart size={24} />
              <span className="text-sm">React</span>
            </button>
          )}

          {/* Comment Button */}
          <button
            onClick={() => {
              // TODO: Open comment input
              console.log('Comment button clicked')
            }}
            className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
          >
            <MessageCircle size={24} />
            <span className="text-sm">Reply</span>
          </button>

          {/* View Count */}
          <div className="flex items-center space-x-2 text-snapchat-gray-400">
            <Eye size={20} />
            <span className="text-sm">Viewed</span>
          </div>
        </div>
      </div>

      {/* Tap to close overlay */}
      <div 
        className="absolute inset-0 z-0"
        onClick={onClose}
      />
    </div>
  )
}
