import { useState } from 'react'
import { X, Heart, MessageCircle, Send, User, Clock, Eye, Laugh, ThumbsUp } from 'lucide-react'

interface SnapViewerProps {
  snap: {
    id: string
    imageUrl: string
    caption?: string
    createdAt: string
    expiresAt: string
    creator: {
      id: string
      username: string
      displayName: string
      avatarUrl?: string
    } | null
    habit: {
      id: string
      name: string
      category: string
      icon: string
    } | null
    reactions: any[]
    comments: any[]
    viewCount: number
    isExpired: boolean
  }
  onClose: () => void
  onReact: (snapId: string, reaction?: string, comment?: string) => Promise<{ error?: string }>
}

const reactionEmojis = {
  like: '❤️',
  love: '😍',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
}

export default function SnapViewer({ snap, onClose, onReact }: SnapViewerProps) {
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [reacting, setReacting] = useState(false)

  const handleReaction = async (reaction: string) => {
    if (reacting) return
    
    setReacting(true)
    try {
      const result = await onReact(snap.id, reaction)
      if (result.error) {
        console.error('Failed to react:', result.error)
      }
    } finally {
      setReacting(false)
      setShowReactions(false)
    }
  }

  const handleComment = async () => {
    if (!comment.trim() || sending) return
    
    setSending(true)
    try {
      const result = await onReact(snap.id, undefined, comment.trim())
      if (result.error) {
        console.error('Failed to comment:', result.error)
      } else {
        setComment('')
      }
    } finally {
      setSending(false)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="w-full h-full max-w-md mx-auto bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-snapchat-gray-800">
          <div className="flex items-center space-x-3">
            {/* Creator Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-snapchat-yellow to-yellow-400 flex items-center justify-center">
              {snap.creator?.avatarUrl ? (
                <img
                  src={snap.creator.avatarUrl}
                  alt={snap.creator.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={20} className="text-black" />
              )}
            </div>
            
            {/* Creator Info */}
            <div>
              <h4 className="text-white font-semibold">
                {snap.creator?.displayName || 'Unknown User'}
              </h4>
              <div className="flex items-center space-x-2 text-snapchat-gray-400 text-sm">
                <span>{formatTimeAgo(snap.createdAt)}</span>
                {snap.habit && (
                  <>
                    <span>•</span>
                    <span>{snap.habit.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Snap Image */}
        <div className="flex-1 relative">
          <img
            src={snap.imageUrl}
            alt={snap.caption || 'Snap'}
            className="w-full h-full object-contain"
          />
          
          {/* Expiry Timer Overlay */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-60 rounded-full px-3 py-1 flex items-center space-x-1">
            <Clock size={14} className="text-white" />
            <span className="text-white text-sm">{getTimeUntilExpiry(snap.expiresAt)}</span>
          </div>

          {/* View Count */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-60 rounded-full px-3 py-1 flex items-center space-x-1">
            <Eye size={14} className="text-white" />
            <span className="text-white text-sm">{snap.viewCount}</span>
          </div>
        </div>

        {/* Caption */}
        {snap.caption && (
          <div className="px-4 py-2 border-b border-snapchat-gray-800">
            <p className="text-white">{snap.caption}</p>
          </div>
        )}

        {/* Reactions Display */}
        {snap.reactions.length > 0 && (
          <div className="px-4 py-2 border-b border-snapchat-gray-800">
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                snap.reactions.reduce((acc: Record<string, any[]>, reaction: any) => {
                  if (!acc[reaction.reaction]) acc[reaction.reaction] = []
                  acc[reaction.reaction].push(reaction)
                  return acc
                }, {})
              ).map(([reactionType, reactions]) => (
                <div
                  key={reactionType}
                  className="flex items-center space-x-1 bg-snapchat-gray-800 rounded-full px-2 py-1"
                >
                  <span>{reactionEmojis[reactionType as keyof typeof reactionEmojis]}</span>
                  <span className="text-white text-sm">{reactions.length}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        {snap.comments.length > 0 && (
          <div className="px-4 py-2 max-h-32 overflow-y-auto border-b border-snapchat-gray-800">
            <div className="space-y-2">
              {snap.comments.map((comment: any) => (
                <div key={comment.id} className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-snapchat-yellow to-yellow-400 flex items-center justify-center flex-shrink-0">
                    {comment.profiles?.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={12} className="text-black" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-white text-sm font-medium">
                        {comment.profiles?.display_name || 'Unknown'}
                      </span>
                      <span className="text-snapchat-gray-400 text-xs">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-white text-sm">{comment.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="p-4 border-t border-snapchat-gray-800">
          {/* Reaction Buttons */}
          {showReactions && (
            <div className="mb-3 flex items-center justify-center space-x-3 bg-snapchat-gray-800 rounded-full py-2">
              {Object.entries(reactionEmojis).map(([reaction, emoji]) => (
                <button
                  key={reaction}
                  onClick={() => handleReaction(reaction)}
                  disabled={reacting}
                  className="text-2xl hover:scale-110 transition-transform disabled:opacity-50"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-3">
            {/* React Button */}
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="flex items-center space-x-1 text-snapchat-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart size={20} />
            </button>

            {/* Comment Input */}
            <div className="flex-1 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                className="flex-1 px-3 py-2 bg-snapchat-gray-800 text-white rounded-full border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors text-sm"
                maxLength={500}
              />
              <button
                onClick={handleComment}
                disabled={!comment.trim() || sending}
                className={`p-2 rounded-full transition-colors ${
                  comment.trim() && !sending
                    ? 'bg-snapchat-blue text-white'
                    : 'bg-snapchat-gray-800 text-snapchat-gray-400'
                }`}
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
