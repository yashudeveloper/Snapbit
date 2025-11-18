import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ChatRoomContextType {
  isChatRoomOpen: boolean
  setChatRoomOpen: (isOpen: boolean) => void
}

const ChatRoomContext = createContext<ChatRoomContextType | undefined>(undefined)

interface ChatRoomProviderProps {
  children: ReactNode
}

export function ChatRoomProvider({ children }: ChatRoomProviderProps) {
  const [isChatRoomOpen, setIsChatRoomOpen] = useState(false)

  const setChatRoomOpen = (isOpen: boolean) => {
    setIsChatRoomOpen(isOpen)
  }

  return (
    <ChatRoomContext.Provider value={{ isChatRoomOpen, setChatRoomOpen }}>
      {children}
    </ChatRoomContext.Provider>
  )
}

export function useChatRoom() {
  const context = useContext(ChatRoomContext)
  if (context === undefined) {
    throw new Error('useChatRoom must be used within a ChatRoomProvider')
  }
  return context
}

