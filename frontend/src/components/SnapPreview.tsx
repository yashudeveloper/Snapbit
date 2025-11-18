import React, { useState, useEffect } from 'react'
import { X, MessageCircle, Send, Check } from 'lucide-react'
import { Habit } from '../lib/supabase'
import { apiClient } from '../lib/api'

interface SnapPreviewProps {
  imageUrl: string
  selectedHabit: string | null
  habits: Habit[]
  onHabitSelect: (habitId: string) => void
  onRetake: () => void
  onSubmit: (selectedFriendIds: string[]) => Promise<void>
  isSubmitting: boolean
}

interface Friend {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  snap_score: number
  current_streak: number
}

export default function SnapPreview({
  imageUrl,
  selectedHabit,
  habits,
  onHabitSelect,
  onRetake,
  onSubmit,
  isSubmitting
}: SnapPreviewProps) {
  const [caption, setCaption] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set())
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [sending, setSending] = useState(false)

  const selectedHabitData = habits.find(h => h.id === selectedHabit)

  useEffect(() => {
    let isActive = true
    
    const loadFriends = async () => {
      if (isActive) {
        await fetchFriends()
      }
    }
    
    loadFriends()
    
    return () => {
      isActive = false
    }
  }, [])

  const fetchFriends = async () => {
    try {
      setLoadingFriends(true)
      console.log('🔍 Fetching friends from API...')
      const response = await apiClient.get<{ friends: Friend[] }>('/friends')
      console.log('📦 Friends response:', response)
      console.log('👥 Friends count:', response.friends?.length || 0)
      
      if (response.friends && Array.isArray(response.friends)) {
        setFriends(response.friends)
        console.log('✅ Friends loaded successfully:', response.friends.length)
      } else {
        console.warn('⚠️ Invalid friends response format:', response)
        setFriends([])
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch friends:', error)
      console.error('❌ Error details:', error.message)
      setFriends([])
    } finally {
      setLoadingFriends(false)
    }
  }

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends)
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId)
    } else {
      newSelected.add(friendId)
    }
    setSelectedFriends(newSelected)
  }

  const selectAll = () => {
    if (selectedFriends.size === friends.length) {
      setSelectedFriends(new Set())
    } else {
      setSelectedFriends(new Set(friends.map(f => f.id)))
    }
  }

  const handleSend = async () => {
    if (selectedFriends.size === 0) return
    
    setSending(true)
    try {
      await onSubmit(Array.from(selectedFriends))
    } catch (error) {
      console.error('Failed to send snap:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Preview Image */}
      <img
        src={imageUrl}
        alt="Snap preview"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top UI */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onRetake}
            className="p-3 rounded-full bg-black/50 text-white"
          >
            <X size={20} />
          </button>

          {selectedHabitData && (
            <div className="bg-black/70 rounded-full px-4 py-2">
              <span className="text-white font-medium text-sm">
                {selectedHabitData.title}
              </span>
            </div>
          )}

          <div className="w-12 h-12"></div> {/* Spacer for balance */}
        </div>
      </div>

      {/* Friends List */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/95 to-transparent pt-20 pb-6 safe-area-bottom">
        {/* Caption Input */}
        <div className="px-4 mb-4">
          <div className="bg-black/50 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
            <div className="flex items-center space-x-3">
              <MessageCircle size={18} className="text-white" />
              <input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-snapchat-gray-400 outline-none text-sm"
                maxLength={100}
              />
            </div>
          </div>
        </div>

        {/* Send To Section */}
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-sm">Send to:</h3>
            {friends.length > 0 && (
              <button
                onClick={selectAll}
                className="text-snapchat-yellow text-xs font-medium"
              >
                {selectedFriends.size === friends.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {loadingFriends ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-snapchat-gray-400 text-sm">No friends yet</p>
              <p className="text-snapchat-gray-500 text-xs mt-1">Add friends to send snaps!</p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/20">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => toggleFriend(friend.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all ${
                    selectedFriends.has(friend.id)
                      ? 'bg-snapchat-yellow/20 border-2 border-snapchat-yellow'
                      : 'bg-black/30 border-2 border-white/10'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedFriends.has(friend.id)
                      ? 'bg-snapchat-yellow text-black'
                      : 'bg-snapchat-blue text-white'
                  }`}>
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt={friend.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      friend.display_name[0].toUpperCase()
                    )}
                  </div>

                  {/* Friend Info */}
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium text-sm">{friend.display_name}</p>
                    <p className="text-snapchat-gray-400 text-xs">@{friend.username}</p>
                  </div>

                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedFriends.has(friend.id)
                      ? 'bg-snapchat-yellow border-snapchat-yellow'
                      : 'border-white/30'
                  }`}>
                    {selectedFriends.has(friend.id) && (
                      <Check size={14} className="text-black" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send Button */}
        <div className="px-4 mt-4">
          <button
            onClick={handleSend}
            disabled={sending || selectedFriends.size === 0}
            className={`w-full py-4 rounded-full font-semibold text-base flex items-center justify-center space-x-2 transition-all duration-200 ${
              sending || selectedFriends.size === 0
                ? 'bg-snapchat-gray-700 text-snapchat-gray-400 cursor-not-allowed'
                : 'bg-snapchat-yellow text-black active:scale-95'
            }`}
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Send to {selectedFriends.size} {selectedFriends.size === 1 ? 'friend' : 'friends'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
