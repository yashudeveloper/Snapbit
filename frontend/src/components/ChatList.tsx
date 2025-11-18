import React from 'react'
import { MessageCircle, Camera } from 'lucide-react'
import { ChatRoom } from '../lib/supabase'

interface ChatListProps {
  rooms: ChatRoom[]
  onSelectRoom: (roomId: string) => void
  loading: boolean
}

export default function ChatList({ rooms, onSelectRoom, loading }: ChatListProps) {
  console.log('🎨 ChatList render:', { roomsCount: rooms.length, loading })
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-8">
        <MessageCircle size={48} className="text-snapchat-gray-500 mb-4" />
        <h3 className="text-white text-lg font-semibold mb-2">No chats yet</h3>
        <p className="text-snapchat-gray-400 text-center">
          Start a conversation with your friends!
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-2">
        {rooms.map((room) => {
          // For direct chats, use friend's info; for group chats, use room name
          const displayName = room.type === 'direct' && room.otherParticipant
            ? room.otherParticipant.display_name
            : room.name || 'Chat'
          
          const avatarUrl = room.type === 'direct' && room.otherParticipant
            ? room.otherParticipant.avatar_url
            : null
          
          const username = room.type === 'direct' && room.otherParticipant
            ? room.otherParticipant.username
            : null

          console.log(`🎨 Rendering room ${room.id}:`, {
            type: room.type,
            hasOtherParticipant: !!room.otherParticipant,
            displayName,
            username,
            otherParticipant: room.otherParticipant
          })

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-snapchat-gray-800 hover:bg-snapchat-gray-700 transition-colors"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-snapchat-yellow to-yellow-400 flex items-center justify-center overflow-hidden">
                {room.type === 'group' ? (
                  <MessageCircle size={20} className="text-black" />
                ) : avatarUrl ? (
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
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold">
                  {displayName}
                </h3>
                <p className="text-snapchat-gray-400 text-sm">
                  {username ? `@${username}` : 'Tap to view messages'}
                </p>
              </div>

              {/* Timestamp */}
              <div className="text-right">
                <div className="text-snapchat-gray-400 text-xs">
                  {new Date(room.updated_at).toLocaleDateString([], { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
