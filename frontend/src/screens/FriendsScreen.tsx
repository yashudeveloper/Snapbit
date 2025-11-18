import { useState } from 'react'
import { Search, UserPlus, Users, MessageCircle, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../contexts/ChatContext'
import ChatRoom from '../components/ChatRoom'

export default function FriendsScreen() {
  const navigate = useNavigate()
  const { friends, loading, createDirectChat } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChatRoom, setSelectedChatRoom] = useState<string | null>(null)
  const [creatingChat, setCreatingChat] = useState<string | null>(null)
  // Removed activeTab since we only have friends list now

  const filteredFriends = friends.filter(friend =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenChat = async (friendId: string) => {
    console.log('🚀 Opening chat with friend:', friendId)
    setCreatingChat(friendId)
    
    try {
      const result = await createDirectChat(friendId)
      
      if (result.error) {
        console.error('❌ Failed to create chat:', result.error)
        alert('Failed to open chat. Please try again.')
      } else if (result.roomId) {
        console.log('✅ Chat created/found, opening room:', result.roomId)
        setSelectedChatRoom(result.roomId)
      }
    } catch (error) {
      console.error('💥 Exception opening chat:', error)
      alert('Failed to open chat. Please try again.')
    } finally {
      setCreatingChat(null)
    }
  }

  // If a chat room is selected, show the ChatRoom component
  if (selectedChatRoom) {
    return (
      <ChatRoom
        roomId={selectedChatRoom}
        onBack={() => setSelectedChatRoom(null)}
      />
    )
  }

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-white mb-4">Friends</h1>
          
          {/* Tab Selector */}
          <div className="flex space-x-2 mb-4">
            <button
              className="flex-1 py-3 rounded-full text-sm font-medium bg-snapchat-gray-800 text-white"
              disabled
            >
              <Users size={16} className="inline mr-2" />
              My Friends ({friends.length})
            </button>
            <button
              onClick={() => navigate('/friends/search')}
              className="flex-1 py-3 rounded-full text-sm font-medium transition-colors bg-snapchat-yellow text-black hover:bg-yellow-400"
            >
              <UserPlus size={16} className="inline mr-2" />
              Find Friends
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-snapchat-gray-800 text-white rounded-full border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Friends List */}
        <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Users size={48} className="text-snapchat-gray-500 mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </h3>
                <p className="text-snapchat-gray-400 text-center">
                  {searchQuery 
                    ? 'Try searching with a different name'
                    : 'Add friends to see their habit progress!'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => handleOpenChat(friend.id)}
                    className="flex items-center space-x-4 p-4 rounded-2xl bg-snapchat-gray-800 cursor-pointer hover:bg-snapchat-gray-700 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-snapchat-yellow flex items-center justify-center">
                      {friend.avatar_url ? (
                        <img
                          src={friend.avatar_url}
                          alt={friend.display_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-black font-bold text-lg">
                          {friend.display_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* Friend Info */}
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{friend.display_name}</h3>
                      <p className="text-snapchat-gray-400 text-sm">@{friend.username}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <Trophy size={14} className="text-snapchat-yellow" />
                          <span className="text-snapchat-yellow text-sm font-medium">
                            {friend.snap_score}
                          </span>
                        </div>
                        <div className="text-snapchat-gray-400 text-sm">
                          {friend.current_streak} day streak
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation() // Prevent card click
                        handleOpenChat(friend.id)
                      }}
                      disabled={creatingChat === friend.id}
                      className="p-3 rounded-full bg-snapchat-blue text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {creatingChat === friend.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MessageCircle size={20} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
