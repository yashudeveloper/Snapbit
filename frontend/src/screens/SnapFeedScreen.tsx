import { useState } from 'react'
import { Heart, MessageCircle, Eye, Clock, User, Zap } from 'lucide-react'
import { useSnapFeed } from '../contexts/SnapFeedContext'
import SnapViewer from '../components/SnapViewer'

export default function SnapFeedScreen() {
  const { 
    snaps, 
    loading, 
    error, 
    selectedSnap, 
    viewSnap, 
    reactToSnap, 
    getSnapDetails, 
    clearSelectedSnap,
    refreshFeed 
  } = useSnapFeed()
  
  const [reactingToSnap, setReactingToSnap] = useState<string | null>(null)

  const handleSnapClick = async (snapId: string) => {
    console.log('📱 Opening snap:', snapId)
    
    // Mark as viewed and get details
    await viewSnap(snapId)
    await getSnapDetails(snapId)
  }

  const handleQuickReaction = async (snapId: string, reaction: string) => {
    if (reactingToSnap === snapId) return
    
    setReactingToSnap(snapId)
    try {
      await reactToSnap(snapId, reaction)
    } finally {
      setReactingToSnap(null)
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

  if (loading && snaps.length === 0) {
    return (
      <div className="w-full h-full bg-black flex flex-col">
        <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
          <div className="p-4">
            <h1 className="text-2xl font-bold text-white">Friend Snaps</h1>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-snapchat-yellow border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Friend Snaps</h1>
            <button
              onClick={refreshFeed}
              className="p-2 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors"
            >
              <Zap size={20} />
            </button>
          </div>
          
          {error && (
            <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Snap Feed */}
      <div className="flex-1 overflow-y-auto">
        {snaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-8">
            <Eye size={48} className="text-snapchat-gray-500 mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">No Snaps Yet</h3>
            <p className="text-snapchat-gray-400 text-center">
              Your friends haven't shared any snaps yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {snaps.map((snap) => (
              <div
                key={snap.id}
                className="bg-snapchat-gray-800 rounded-2xl overflow-hidden border border-snapchat-gray-700"
              >
                {/* Snap Header */}
                <div className="p-4 flex items-center justify-between">
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

                  {/* Expiry Timer */}
                  <div className="flex items-center space-x-1 text-snapchat-gray-400 text-sm">
                    <Clock size={14} />
                    <span>{getTimeUntilExpiry(snap.expiresAt)}</span>
                  </div>
                </div>

                {/* Snap Image */}
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => handleSnapClick(snap.id)}
                >
                  <img
                    src={snap.imageUrl}
                    alt={snap.caption || 'Snap'}
                    className="w-full h-64 object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    {!snap.isViewed && (
                      <div className="bg-snapchat-yellow text-black px-3 py-1 rounded-full text-sm font-medium">
                        Tap to view
                      </div>
                    )}
                  </div>

                  {/* View Indicator */}
                  {snap.isViewed && (
                    <div className="absolute top-2 right-2 bg-green-500 w-3 h-3 rounded-full"></div>
                  )}
                </div>

                {/* Caption */}
                {snap.caption && (
                  <div className="px-4 py-2">
                    <p className="text-white text-sm">{snap.caption}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 py-3 flex items-center justify-between border-t border-snapchat-gray-700">
                  <div className="flex items-center space-x-4">
                    {/* Like Button */}
                    <button
                      onClick={() => handleQuickReaction(snap.id, 'like')}
                      disabled={reactingToSnap === snap.id}
                      className={`flex items-center space-x-1 transition-colors ${
                        snap.reactions.userReaction === 'like'
                          ? 'text-red-500'
                          : 'text-snapchat-gray-400 hover:text-red-500'
                      }`}
                    >
                      {reactingToSnap === snap.id ? (
                        <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Heart size={18} fill={snap.reactions.userReaction === 'like' ? 'currentColor' : 'none'} />
                      )}
                      <span className="text-sm">{snap.reactions.counts.like || 0}</span>
                    </button>

                    {/* Comment Button */}
                    <button
                      onClick={() => handleSnapClick(snap.id)}
                      className="flex items-center space-x-1 text-snapchat-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle size={18} />
                      <span className="text-sm">Comment</span>
                    </button>
                  </div>

                  {/* Total Reactions */}
                  {snap.reactions.total > 0 && (
                    <div className="text-snapchat-gray-400 text-sm">
                      {snap.reactions.total} reaction{snap.reactions.total !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading More */}
            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Snap Viewer Modal */}
      {selectedSnap && (
        <SnapViewer
          snap={selectedSnap}
          onClose={clearSelectedSnap}
          onReact={reactToSnap}
        />
      )}
    </div>
  )
}
