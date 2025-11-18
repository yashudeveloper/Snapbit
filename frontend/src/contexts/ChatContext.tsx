import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, ChatRoom, ChatMessage, Profile } from '../lib/supabase'
import { useAuth } from './AuthContext'
import wsService from '../services/websocket'

interface SearchResult {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  snapScore: number
  currentStreak: number
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'blocked'
}

interface FriendRequest {
  id: string
  status: string
  created_at: string
  requester: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
  addressee: {
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

interface ChatContextType {
  rooms: ChatRoom[]
  messages: { [roomId: string]: ChatMessage[] }
  friends: Profile[]
  loading: boolean
  searchResults: SearchResult[]
  searchLoading: boolean
  friendRequests: FriendRequest[]
  requestsLoading: boolean
  typingUsers: { [roomId: string]: TypingUser[] }
  isConnected: boolean
  sendMessage: (roomId: string, content: string, snapId?: string) => Promise<{ error?: any }>
  sendSnapToChat: (roomId: string, snapId: string, caption?: string) => Promise<{ error?: any }>
  createDirectChat: (friendId: string) => Promise<{ roomId?: string; error?: any }>
  fetchMessages: (roomId: string) => Promise<void>
  fetchChatRooms: () => Promise<void>
  markAsRead: (roomId: string) => Promise<void>
  searchUsers: (query: string) => Promise<{ error?: any }>
  addFriend: (username: string) => Promise<{ error?: any }>
  acceptFriendRequest: (requestId: string) => Promise<{ error?: any }>
  rejectFriendRequest: (requestId: string) => Promise<{ error?: any }>
  fetchFriendRequests: () => Promise<{ error?: any }>
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
  startTyping: (roomId: string) => void
  stopTyping: (roomId: string) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: React.ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user, session } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<{ [roomId: string]: ChatMessage[] }>({})
  const [friends, setFriends] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<{ [roomId: string]: TypingUser[] }>({})
  const [isConnected, setIsConnected] = useState(false)

  // WebSocket event handlers
  const handleNewMessage = useCallback((message: ChatMessage) => {
    console.log('📨 Received new message:', message)
    setMessages(prev => ({
      ...prev,
      [message.room_id]: [...(prev[message.room_id] || []), message]
    }))
  }, [])

  const handleUserTyping = useCallback((data: TypingUser) => {
    setTypingUsers(prev => {
      const roomTyping = prev[data.userId] || []
      
      if (data.isTyping) {
        // Add user to typing list if not already there
        const existingIndex = roomTyping.findIndex(u => u.userId === data.userId)
        if (existingIndex === -1) {
          return {
            ...prev,
            [data.userId]: [...roomTyping, data]
          }
        }
      } else {
        // Remove user from typing list
        return {
          ...prev,
          [data.userId]: roomTyping.filter(u => u.userId !== data.userId)
        }
      }
      
      return prev
    })
  }, [])

  const handleConnect = useCallback(() => {
    console.log('🔌 WebSocket connected')
    setIsConnected(true)
  }, [])

  const handleDisconnect = useCallback(() => {
    console.log('🔌 WebSocket disconnected')
    setIsConnected(false)
  }, [])

  const handleError = useCallback((error: { message: string }) => {
    console.error('❌ WebSocket error:', error)
  }, [])

  // Initialize WebSocket when user and session are available
  useEffect(() => {
    if (user && session?.access_token) {
      console.log('🚀 Initializing WebSocket connection...')
      
      wsService.connect(session.access_token, {
        onMessage: handleNewMessage,
        onUserTyping: handleUserTyping,
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onError: handleError,
        onUserJoined: (data) => console.log('👋 User joined:', data),
        onUserLeft: (data) => console.log('👋 User left:', data),
        onRoomJoined: (data) => console.log('🏠 Room joined:', data)
      })

      fetchChatRooms()
      fetchFriends()
      fetchFriendRequests()
      subscribeToMessages()
    }

    return () => {
      // Cleanup subscriptions and WebSocket
      supabase.removeAllChannels()
      wsService.disconnect()
    }
  }, [user, session?.access_token, handleNewMessage, handleUserTyping, handleConnect, handleDisconnect, handleError])

  const fetchChatRooms = async () => {
    if (!user) return

    try {
      console.log('📥 Fetching chat rooms for user:', user.id)
      
      // First, get user's chat participations
      const { data: participationsData, error: participationsError } = await supabase
        .from('chat_participants')
        .select('room_id, joined_at, last_read_at')
        .eq('user_id', user.id)

      if (participationsError) {
        console.error('❌ Error fetching chat participations:', participationsError)
        return
      }

      console.log('✅ Participations fetched:', participationsData?.length || 0)

      if (!participationsData || participationsData.length === 0) {
        setRooms([])
        return
      }

      // Get room IDs
      const roomIds = participationsData.map(p => p.room_id)

      // Fetch room details separately
      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('id, type, name, created_at, updated_at')
        .in('id', roomIds)
        .order('updated_at', { ascending: false })

      if (roomsError) {
        console.error('❌ Error fetching chat rooms:', roomsError)
        return
      }

      console.log('✅ Chat rooms fetched:', roomsData?.length || 0)

      // OPTIMIZED: Fetch all participants and profiles in bulk to avoid rate limits
      console.log('🔍 Enriching rooms with participant details (BULK)...')
      
      // Get all participants for all rooms in ONE query
      const { data: allParticipants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('room_id, user_id')
        .in('room_id', roomIds)
        .neq('user_id', user.id)

      if (participantsError) {
        console.error('❌ Error fetching all participants:', participantsError)
        setRooms(roomsData as ChatRoom[])
        return
      }

      console.log('✅ All participants fetched:', allParticipants?.length || 0)

      // Get unique user IDs
      const otherUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])]
      
      if (otherUserIds.length === 0) {
        console.warn('⚠️ No other participants found')
        setRooms(roomsData as ChatRoom[])
        return
      }

      // Fetch all profiles in ONE query
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', otherUserIds)

      if (profilesError) {
        console.error('❌ Error fetching all profiles:', profilesError)
        setRooms(roomsData as ChatRoom[])
        return
      }

      console.log('✅ All profiles fetched:', allProfiles?.length || 0)

      // Create lookup maps for fast access
      const participantsByRoom = new Map<string, string>()
      allParticipants?.forEach(p => {
        participantsByRoom.set(p.room_id, p.user_id)
      })

      const profilesById = new Map<string, any>()
      allProfiles?.forEach(p => {
        profilesById.set(p.id, p)
      })

      // Enrich rooms with participant data
      const enrichedRooms = roomsData.map(room => {
        if (room.type === 'direct') {
          const otherUserId = participantsByRoom.get(room.id)
          if (otherUserId) {
            const otherUserProfile = profilesById.get(otherUserId)
            if (otherUserProfile) {
              console.log(`✅ Enriched room ${room.id} with:`, otherUserProfile.display_name)
              return {
                ...room,
                otherParticipant: otherUserProfile
              }
            }
          }
          console.warn(`⚠️ No participant/profile found for room ${room.id}`)
        }
        return room
      })

      console.log('✅ Chat rooms enriched (BULK):', enrichedRooms.length)
      setRooms(enrichedRooms as ChatRoom[])
    } catch (error) {
      console.error('💥 Exception fetching chat rooms:', error)
    }
  }

  const fetchFriends = async () => {
    if (!user) return

    try {
      // SIMPLIFIED QUERY - NO FOREIGN KEY JOINS
      console.log('🔍 Fetching friendships for user:', user.id)
      
      const { data: friendshipsData, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      if (error) {
        console.error('❌ Error fetching friendships:', error)
        return
      }

      console.log('📦 Friendships data:', friendshipsData)

      // Get friend IDs
      const friendIds = friendshipsData?.map(friendship => {
        return friendship.requester_id === user.id 
          ? friendship.addressee_id 
          : friendship.requester_id
      }).filter(Boolean) || []

      console.log('👥 Friend IDs:', friendIds)

      if (friendIds.length === 0) {
        console.log('❌ No friends found')
        setFriends([])
        return
      }

      // Fetch friend profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, snap_score, current_streak')
        .in('id', friendIds)

      if (profilesError) {
        console.error('❌ Error fetching friend profiles:', profilesError)
        return
      }

      console.log('✅ Friend profiles loaded:', profilesData)
      setFriends(profilesData as Profile[])
    } catch (error) {
      console.error('Error fetching friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (roomId: string) => {
    try {
      console.log('📥 Fetching messages for room:', roomId)
      
      // First, fetch messages without foreign key joins to avoid PGRST200 error
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError)
        return
      }

      console.log('✅ Messages fetched:', messagesData?.length || 0)

      // If no messages, set empty array
      if (!messagesData || messagesData.length === 0) {
        setMessages(prev => ({
          ...prev,
          [roomId]: []
        }))
        return
      }

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))]
      
      // Fetch sender profiles separately
      const { data: sendersData, error: sendersError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', senderIds)

      if (sendersError) {
        console.error('❌ Error fetching senders:', sendersError)
        // Still set messages without sender info
        setMessages(prev => ({
          ...prev,
          [roomId]: messagesData
        }))
        return
      }

      // Get unique snap IDs (if any)
      const snapIds = messagesData
        .map(msg => msg.snap_id)
        .filter(Boolean)

      let snapsData: any[] = []
      if (snapIds.length > 0) {
        const { data: snapsResult, error: snapsError } = await supabase
          .from('snaps')
          .select('id, image_url, caption, expires_at, status, created_at')
          .in('id', snapIds)

        if (!snapsError) {
          snapsData = snapsResult || []
        }
      }

      // Combine messages with sender and snap data
      const enrichedMessages = messagesData.map(message => ({
        ...message,
        sender: sendersData?.find(sender => sender.id === message.sender_id),
        snap: message.snap_id ? snapsData.find(snap => snap.id === message.snap_id) : null
      }))

      console.log('✅ Messages enriched with sender data')

      setMessages(prev => ({
        ...prev,
        [roomId]: enrichedMessages
      }))
    } catch (error) {
      console.error('💥 Exception fetching messages:', error)
    }
  }

  const subscribeToMessages = () => {
    if (!user) return

    // Subscribe to new messages in user's chat rooms
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages(prev => ({
            ...prev,
            [newMessage.room_id]: [
              ...(prev[newMessage.room_id] || []),
              newMessage
            ]
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async (roomId: string, content: string, snapId?: string) => {
    if (!user) return { error: 'No user logged in' }

    try {
      // Use WebSocket for real-time messaging
      const messageType = snapId ? 'snap' : 'text'
      const success = wsService.sendMessage(roomId, content, messageType, snapId)
      
      if (!success) {
        // Fallback to HTTP API if WebSocket is not connected
        console.log('📡 WebSocket not connected, using HTTP API fallback')
        
        const response = await fetch(`http://localhost:3001/api/chat/rooms/${roomId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            snapId,
            messageType
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ HTTP message send failed:', errorData)
          return { error: errorData.message || 'Failed to send message' }
        }

        const data = await response.json()
        
        // Add message to local state for HTTP fallback
        setMessages(prev => ({
          ...prev,
          [roomId]: [...(prev[roomId] || []), data.message]
        }))
      }

      return { error: null }
    } catch (error: any) {
      console.error('💥 Error sending message:', error)
      return { error: error.message || 'Failed to send message' }
    }
  }

  const sendSnapToChat = async (roomId: string, snapId: string, caption?: string) => {
    if (!user) return { error: 'No user logged in' }

    try {
      console.log('📸 Sending snap to chat:', { roomId, snapId, caption })

      // Try WebSocket first
      const success = wsService.sendSnap(roomId, snapId, caption)
      
      if (!success) {
        // Fallback to HTTP API if WebSocket is not connected
        console.log('📡 WebSocket not connected, using HTTP API fallback for snap')
        
        const response = await fetch(`http://localhost:3001/api/chat/rooms/${roomId}/send-snap`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snapId,
            caption
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ HTTP snap send failed:', errorData)
          return { error: errorData.message || 'Failed to send snap' }
        }

        const data = await response.json()
        
        // Add snap message to local state for HTTP fallback
        setMessages(prev => ({
          ...prev,
          [roomId]: [...(prev[roomId] || []), data.message]
        }))
      }

      console.log('✅ Snap sent to chat successfully')
      return { error: null }
    } catch (error: any) {
      console.error('💥 Error sending snap to chat:', error)
      return { error: error.message || 'Failed to send snap' }
    }
  }

  const createDirectChat = async (friendId: string) => {
    if (!user || !session?.access_token) {
      return { error: 'No user logged in or no session' }
    }

    try {
      console.log('🔍 Creating/finding direct chat with friend:', friendId)

      // Use backend API to find or create direct chat
      const response = await fetch('http://localhost:3001/api/chat/rooms/direct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Direct chat API error:', errorData)
        return { error: errorData.message || 'Failed to create/find chat room' }
      }

      const data = await response.json()
      console.log('✅ Direct chat response:', data)

      // If it's a new room, add to local state with friend details
      if (data.isNew && data.room) {
        console.log('🆕 New room created, enriching with friend details...')
        
        // Fetch friend's profile to enrich the room
        const { data: friendProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', friendId)
          .single()

        if (profileError) {
          console.error('❌ Error fetching friend profile:', profileError)
        }

        const enrichedRoom = friendProfile ? {
          ...data.room,
          otherParticipant: friendProfile
        } : data.room

        console.log('✅ Enriched new room:', enrichedRoom)

        setRooms(prev => {
          // Check if room already exists in local state
          const exists = prev.some(room => room.id === data.room.id)
          if (!exists) {
            return [...prev, enrichedRoom]
          }
          return prev
        })
      } else {
        // If room already exists, refresh all rooms to ensure we have latest data
        console.log('♻️ Existing room, refreshing all rooms...')
        await fetchChatRooms()
      }

      return { 
        roomId: data.room.id,
        isNew: data.isNew,
        error: null 
      }
    } catch (error: any) {
      console.error('💥 Exception in createDirectChat:', error)
      return { error: error.message || 'Failed to create/find chat room' }
    }
  }

  const markAsRead = async (roomId: string) => {
    if (!user) return

    try {
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const searchUsers = async (query: string) => {
    console.log('🔍 Search function called with query:', query)
    console.log('🔐 Session check for search:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length || 0
    })

    if (!session?.access_token || !query.trim()) {
      console.log('❌ No session/token or empty query, clearing results')
      setSearchResults([])
      return { error: null }
    }

    try {
      setSearchLoading(true)
      console.log('🔍 Searching users via backend API:', query)
      console.log('🔑 Using token for search:', session.access_token.substring(0, 20) + '...')

      const response = await fetch(`http://localhost:3001/api/friends/search?q=${encodeURIComponent(query)}&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Search API error:', errorData)
        return { error: errorData.message || 'Search failed' }
      }

      const data = await response.json()
      console.log('✅ Search results:', data)

      setSearchResults(data.results || [])
      return { error: null }
    } catch (error: any) {
      console.error('💥 Search exception:', error)
      return { error: error.message || 'Search failed' }
    } finally {
      setSearchLoading(false)
    }
  }

  const addFriend = async (username: string) => {
    console.log('🔐 Session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length || 0
    })

    if (!session?.access_token) {
      console.error('❌ No session or access token available')
      return { error: 'Not authenticated - please log in again' }
    }

    try {
      console.log('👥 Adding friend via backend API:', username)
      console.log('🔑 Using token:', session.access_token.substring(0, 20) + '...')

      const response = await fetch('http://localhost:3001/api/friends/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Add friend API error:', data)
        return { error: data.message || 'Failed to add friend' }
      }

      console.log('✅ Friend request sent:', data)

      return { error: null }
    } catch (error: any) {
      console.error('💥 Add friend exception:', error)
      return { error: error.message || 'Failed to add friend' }
    }
  }

  const fetchFriendRequests = async () => {
    if (!session?.access_token) {
      return { error: 'Not authenticated' }
    }

    try {
      setRequestsLoading(true)
      console.log('📥 Fetching friend requests...')

      const response = await fetch('http://localhost:3001/api/friends/requests?type=received', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Fetch requests API error:', errorData)
        return { error: errorData.message || 'Failed to fetch friend requests' }
      }

      const data = await response.json()
      console.log('✅ Friend requests fetched:', data)

      setFriendRequests(data.requests || [])
      return { error: null }
    } catch (error: any) {
      console.error('💥 Fetch requests exception:', error)
      return { error: error.message || 'Failed to fetch friend requests' }
    } finally {
      setRequestsLoading(false)
    }
  }

  const acceptFriendRequest = async (requestId: string) => {
    if (!session?.access_token) {
      return { error: 'Not authenticated' }
    }

    try {
      console.log('✅ Accepting friend request:', requestId)

      const response = await fetch(`http://localhost:3001/api/friends/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'accept' }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Accept request API error:', data)
        return { error: data.message || 'Failed to accept friend request' }
      }

      console.log('✅ Friend request accepted:', data)

      // Refresh friends list and requests
      await fetchFriends()
      await fetchFriendRequests()

      return { error: null }
    } catch (error: any) {
      console.error('💥 Accept request exception:', error)
      return { error: error.message || 'Failed to accept friend request' }
    }
  }

  const rejectFriendRequest = async (requestId: string) => {
    if (!session?.access_token) {
      return { error: 'Not authenticated' }
    }

    try {
      console.log('❌ Rejecting friend request:', requestId)

      const response = await fetch(`http://localhost:3001/api/friends/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reject' }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Reject request API error:', data)
        return { error: data.message || 'Failed to reject friend request' }
      }

      console.log('✅ Friend request rejected:', data)

      // Refresh requests list
      await fetchFriendRequests()

      return { error: null }
    } catch (error: any) {
      console.error('💥 Reject request exception:', error)
      return { error: error.message || 'Failed to reject friend request' }
    }
  }

  // WebSocket room management functions
  const joinRoom = (roomId: string) => {
    wsService.joinRoom(roomId)
  }

  const leaveRoom = (roomId: string) => {
    wsService.leaveRoom(roomId)
  }

  const startTyping = (roomId: string) => {
    wsService.startTyping(roomId)
  }

  const stopTyping = (roomId: string) => {
    wsService.stopTyping(roomId)
  }

  const value = {
    rooms,
    messages,
    friends,
    loading,
    searchResults,
    searchLoading,
    friendRequests,
    requestsLoading,
    typingUsers,
    isConnected,
    sendMessage,
    sendSnapToChat,
    createDirectChat,
    fetchMessages,
    fetchChatRooms,
    markAsRead,
    searchUsers,
    addFriend,
    acceptFriendRequest,
    rejectFriendRequest,
    fetchFriendRequests,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
