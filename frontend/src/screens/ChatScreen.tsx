import React, { useState, useEffect } from 'react'
import { Search, Plus, MessageCircle, Users, Camera, X, UserPlus, Check, Clock, Bell } from 'lucide-react'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'
import ChatList from '../components/ChatList'
import ChatRoom from '../components/ChatRoom'

export default function ChatScreen() {
  const { 
    rooms, 
    friends, 
    loading, 
    searchUsers, 
    addFriend, 
    searchResults, 
    searchLoading,
    friendRequests,
    requestsLoading,
    acceptFriendRequest,
    rejectFriendRequest,
    fetchFriendRequests,
    createDirectChat
  } = useChat()
  const { profile } = useAuth()
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFriends, setShowFriends] = useState(false)
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  const [addingFriend, setAddingFriend] = useState<string | null>(null)
  const [addFriendError, setAddFriendError] = useState('')
  const [addFriendSuccess, setAddFriendSuccess] = useState('')
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [creatingChat, setCreatingChat] = useState<string | null>(null)

  const filteredRooms = rooms.filter(room => 
    room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    searchQuery === ''
  )

  const filteredFriends = friends.filter(friend =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Debounced search for add friend
  useEffect(() => {
    const timer = setTimeout(() => {
      if (friendSearchQuery.trim() && showAddFriend) {
        handleSearchUsers(friendSearchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [friendSearchQuery, showAddFriend])

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) return
    
    const result = await searchUsers(query)
    if (result.error) {
      setAddFriendError(result.error)
    } else {
      setAddFriendError('')
    }
  }

  const handleAddFriend = async (username: string) => {
    setAddingFriend(username)
    setAddFriendError('')
    setAddFriendSuccess('')

    try {
      const result = await addFriend(username)
      if (result.error) {
        setAddFriendError(result.error)
      } else {
        setAddFriendSuccess(`Friend request sent to ${username}!`)
        // Refresh search results
        if (friendSearchQuery.trim()) {
          await handleSearchUsers(friendSearchQuery)
        }
        // Auto-close modal after 2 seconds
        setTimeout(() => {
          setShowAddFriend(false)
          setFriendSearchQuery('')
          setAddFriendSuccess('')
        }, 2000)
      }
    } catch (err: any) {
      setAddFriendError(err.message || 'Failed to send friend request')
    } finally {
      setAddingFriend(null)
    }
  }

  const getStatusButton = (result: any) => {
    switch (result.friendshipStatus) {
      case 'accepted':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-900/50 text-green-300 rounded-full text-xs">
            <Check size={12} />
            Friends
          </div>
        )
      case 'pending':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded-full text-xs">
            <Clock size={12} />
            Pending
          </div>
        )
      case 'blocked':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-900/50 text-red-300 rounded-full text-xs">
            <X size={12} />
            Blocked
          </div>
        )
      default:
        return (
          <button
            onClick={() => handleAddFriend(result.username)}
            disabled={addingFriend === result.username}
            className="flex items-center gap-1 px-2 py-1 bg-snapchat-yellow hover:bg-yellow-400 text-black rounded-full text-xs font-medium transition-colors disabled:opacity-50"
          >
            {addingFriend === result.username ? (
              <>
                <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus size={12} />
                Add
              </>
            )}
          </button>
        )
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequest(requestId)
    try {
      const result = await acceptFriendRequest(requestId)
      if (result.error) {
        console.error('Failed to accept request:', result.error)
      }
    } catch (err) {
      console.error('Exception accepting request:', err)
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId)
    try {
      const result = await rejectFriendRequest(requestId)
      if (result.error) {
        console.error('Failed to reject request:', result.error)
      }
    } catch (err) {
      console.error('Exception rejecting request:', err)
    } finally {
      setProcessingRequest(null)
    }
  }

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
        setSelectedRoom(result.roomId)
        setShowFriends(false) // Close friends view
      }
    } catch (error) {
      console.error('💥 Exception opening chat:', error)
      alert('Failed to open chat. Please try again.')
    } finally {
      setCreatingChat(null)
    }
  }

  if (selectedRoom) {
    return (
      <ChatRoom
        roomId={selectedRoom}
        onBack={() => setSelectedRoom(null)}
      />
    )
  }

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Chat</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFriends(!showFriends)}
                className={`p-2 rounded-full transition-colors ${
                  showFriends ? 'bg-snapchat-yellow text-black' : 'bg-snapchat-gray-800 text-white'
                }`}
              >
                <Users size={20} />
              </button>
              <button 
                onClick={() => setShowRequests(!showRequests)}
                className={`relative p-2 rounded-full transition-colors ${
                  showRequests ? 'bg-snapchat-yellow text-black' : 'bg-snapchat-gray-800 text-white'
                }`}
              >
                <Bell size={20} />
                {friendRequests.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {friendRequests.length}
                  </div>
                )}
              </button>
              <button 
                onClick={() => setShowAddFriend(!showAddFriend)}
                className={`p-2 rounded-full transition-colors ${
                  showAddFriend ? 'bg-snapchat-yellow text-black' : 'bg-snapchat-gray-800 text-white'
                }`}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400" />
            <input
              type="text"
              placeholder={showFriends ? "Search friends..." : "Search chats..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-snapchat-gray-800 text-white rounded-full border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
            />
          </div>

          {/* Add Friend Modal */}
          {showAddFriend && (
            <div className="mt-4 bg-snapchat-gray-800 rounded-xl border border-snapchat-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Add Friend</h3>
                <button
                  onClick={() => setShowAddFriend(false)}
                  className="p-1 hover:bg-snapchat-gray-700 rounded-full transition-colors"
                >
                  <X size={16} className="text-snapchat-gray-400" />
                </button>
              </div>

              {/* Friend Search Input */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400" />
                <input
                  type="text"
                  placeholder="Search by username or display name..."
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-snapchat-gray-700 text-white rounded-lg border border-snapchat-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Error/Success Messages */}
              {addFriendError && (
                <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                  {addFriendError}
                </div>
              )}
              
              {addFriendSuccess && (
                <div className="mb-3 p-2 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
                  {addFriendSuccess}
                </div>
              )}

              {/* Search Results */}
              <div className="max-h-60 overflow-y-auto">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : friendSearchQuery.trim() && searchResults.length === 0 ? (
                  <div className="text-center py-4 text-snapchat-gray-400 text-sm">
                    No users found matching "{friendSearchQuery}"
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 bg-snapchat-gray-700 rounded-lg hover:bg-snapchat-gray-600 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-8 h-8 bg-gradient-to-br from-snapchat-yellow to-yellow-400 rounded-full flex items-center justify-center">
                            {result.avatarUrl ? (
                              <img
                                src={result.avatarUrl}
                                alt={result.displayName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-black font-bold text-sm">
                                {result.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* User Info */}
                          <div>
                            <h4 className="font-medium text-white text-sm">{result.displayName}</h4>
                            <p className="text-snapchat-gray-400 text-xs">@{result.username}</p>
                          </div>
                        </div>

                        {/* Action Button */}
                        {getStatusButton(result)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Friend Requests Modal */}
          {showRequests && (
            <div className="mt-4 bg-snapchat-gray-800 rounded-xl border border-snapchat-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Friend Requests ({friendRequests.length})</h3>
                <button
                  onClick={() => setShowRequests(false)}
                  className="p-1 hover:bg-snapchat-gray-700 rounded-full transition-colors"
                >
                  <X size={16} className="text-snapchat-gray-400" />
                </button>
              </div>

              {/* Requests List */}
              <div className="max-h-60 overflow-y-auto">
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : friendRequests.length === 0 ? (
                  <div className="text-center py-4 text-snapchat-gray-400 text-sm">
                    No pending friend requests
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friendRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 bg-snapchat-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 bg-gradient-to-br from-snapchat-yellow to-yellow-400 rounded-full flex items-center justify-center">
                            {request.requester.avatar_url ? (
                              <img
                                src={request.requester.avatar_url}
                                alt={request.requester.display_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-black font-bold">
                                {request.requester.display_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* User Info */}
                          <div>
                            <h4 className="font-medium text-white">{request.requester.display_name}</h4>
                            <p className="text-snapchat-gray-400 text-sm">@{request.requester.username}</p>
                            <p className="text-snapchat-gray-500 text-xs">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={processingRequest === request.id}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {processingRequest === request.id ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingRequest === request.id}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showFriends ? (
          /* Friends List */
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-8">
                <Users size={48} className="text-snapchat-gray-500 mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </h3>
                <p className="text-snapchat-gray-400 text-center">
                  {searchQuery 
                    ? 'Try searching with a different name'
                    : 'Add friends to start chatting!'
                  }
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => handleOpenChat(friend.id)}
                    disabled={creatingChat === friend.id}
                    className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-snapchat-gray-800 hover:bg-snapchat-gray-700 transition-colors disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-full bg-snapchat-yellow flex items-center justify-center">
                      {creatingChat === friend.id ? (
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-black font-bold text-lg">
                          {friend.display_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <h3 className="text-white font-semibold">{friend.display_name}</h3>
                      <p className="text-snapchat-gray-400 text-sm">@{friend.username}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-snapchat-yellow text-sm font-semibold">
                        {friend.snap_score}
                      </div>
                      <div className="text-snapchat-gray-400 text-xs">
                        {friend.current_streak} day streak
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Chat Rooms List */
          <ChatList
            rooms={filteredRooms}
            onSelectRoom={setSelectedRoom}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
