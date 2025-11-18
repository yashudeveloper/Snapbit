import React, { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, Clock, Check, X, Users } from 'lucide-react'
import { useChat } from '../contexts/ChatContext'

interface FriendSearchProps {
  onClose?: () => void
}

export default function FriendSearch({ onClose }: FriendSearchProps) {
  const { 
    searchResults, 
    searchLoading, 
    searchUsers, 
    addFriend 
  } = useChat()
  
  const [query, setQuery] = useState('')
  const [addingFriend, setAddingFriend] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Debug: Check if functions are available
  console.log('🔍 FriendSearch component loaded')
  console.log('📦 Available functions:', { 
    searchUsers: !!searchUsers, 
    addFriend: !!addFriend,
    searchResults: searchResults?.length || 0,
    searchLoading 
  })

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim()) {
        const result = await searchUsers(searchQuery)
        if (result.error) {
          setError(result.error)
        } else {
          setError('')
        }
      }
    }, 300),
    [searchUsers]
  )

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const handleAddFriend = async (username: string) => {
    console.log('🔄 Starting add friend process for:', username)
    setAddingFriend(username)
    setError('')
    setSuccess('')

    try {
      console.log('📞 Calling addFriend function...')
      const result = await addFriend(username)
      console.log('📦 AddFriend result:', result)
      
      if (result.error) {
        console.error('❌ AddFriend error:', result.error)
        setError(result.error)
      } else {
        console.log('✅ Friend request sent successfully!')
        setSuccess(`Friend request sent to ${username}!`)
        // Refresh search to update status
        if (query.trim()) {
          console.log('🔄 Refreshing search results...')
          await searchUsers(query)
        }
      }
    } catch (err: any) {
      console.error('💥 Exception in handleAddFriend:', err)
      setError(err.message || 'Failed to send friend request')
    } finally {
      console.log('🏁 AddFriend process completed')
      setAddingFriend(null)
    }
  }

  const getStatusButton = (result: any) => {
    switch (result.friendshipStatus) {
      case 'accepted':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <Check size={16} />
            Friends
          </div>
        )
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
            <Clock size={16} />
            Pending
          </div>
        )
      case 'blocked':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
            <X size={16} />
            Blocked
          </div>
        )
      default:
        return (
          <button
            onClick={() => handleAddFriend(result.username)}
            disabled={addingFriend === result.username}
            className="flex items-center gap-2 px-3 py-1 bg-snapchat-yellow hover:bg-yellow-400 text-black rounded-full text-sm font-medium transition-colors disabled:opacity-50"
          >
            {addingFriend === result.username ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Add Friend
              </>
            )}
          </button>
        )
    }
  }

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-snapchat-yellow" />
          <h1 className="text-xl font-bold">Find Friends</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by username or display name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-snapchat-yellow focus:ring-1 focus:ring-snapchat-yellow"
          />
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mx-4 mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
          {success}
        </div>
      )}

      {/* Search Results */}
      <div className="px-4">
        {searchLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin" />
          </div>
        ) : query.trim() && searchResults.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No users found matching "{query}"</p>
            <p className="text-sm mt-2">Try searching by username or display name</p>
          </div>
        ) : (
          <div className="space-y-3">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-snapchat-yellow to-yellow-400 rounded-full flex items-center justify-center">
                    {result.avatarUrl ? (
                      <img
                        src={result.avatarUrl}
                        alt={result.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-black font-bold text-lg">
                        {result.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div>
                    <h3 className="font-semibold text-white">{result.displayName}</h3>
                    <p className="text-gray-400 text-sm">@{result.username}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>🔥 {result.snapScore} points</span>
                      <span>⚡ {result.currentStreak} day streak</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {getStatusButton(result)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Test Button */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-4">
          <button
            onClick={() => {
              console.log('🧪 Testing addFriend function...')
              handleAddFriend('testuser')
            }}
            className="w-full py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            🧪 Test Add Friend (Dev Only)
          </button>
        </div>
      )}

      {/* Instructions */}
      {!query.trim() && (
        <div className="p-4 mt-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="font-semibold text-white mb-3">How to find friends:</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-snapchat-yellow rounded-full" />
                Search by username (e.g., @johndoe)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-snapchat-yellow rounded-full" />
                Search by display name (e.g., John Doe)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-snapchat-yellow rounded-full" />
                Users in ghost mode won't appear in search
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}
