import { useState, useEffect } from 'react'
import { X, Send, Clock, Image } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Snap {
  id: string
  image_url: string
  caption?: string
  created_at: string
  expires_at: string
  status: string
}

interface SnapPickerProps {
  onClose: () => void
  onSelectSnap: (snapId: string, caption?: string) => Promise<void>
}

export default function SnapPicker({ onClose, onSelectSnap }: SnapPickerProps) {
  const { session } = useAuth()
  const [snaps, setSnaps] = useState<Snap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSnap, setSelectedSnap] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchMySnaps()
  }, [])

  const fetchMySnaps = async () => {
    if (!session?.access_token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    try {
      console.log('📸 Fetching user snaps for picker...')
      
      const response = await fetch('http://localhost:3001/api/snaps?status=approved&limit=20', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch snaps')
      }

      const data = await response.json()
      console.log('✅ User snaps fetched:', data.snaps?.length || 0)

      // Filter out expired snaps
      const activeSnaps = (data.snaps || []).filter((snap: Snap) => 
        new Date(snap.expires_at) > new Date()
      )

      setSnaps(activeSnaps)
    } catch (err: any) {
      console.error('❌ Error fetching snaps:', err)
      setError(err.message || 'Failed to fetch snaps')
    } finally {
      setLoading(false)
    }
  }

  const handleSendSnap = async () => {
    if (!selectedSnap || sending) return

    setSending(true)
    try {
      await onSelectSnap(selectedSnap, caption.trim() || undefined)
      onClose()
    } catch (error) {
      console.error('Failed to send snap:', error)
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
      <div className="w-full h-full max-w-md mx-auto bg-snapchat-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-snapchat-gray-800">
          <h2 className="text-xl font-bold text-white">Send a Snap</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-snapchat-yellow border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 px-8">
              <div className="text-red-400 text-center mb-4">{error}</div>
              <button
                onClick={fetchMySnaps}
                className="px-4 py-2 bg-snapchat-yellow text-black rounded-full font-medium"
              >
                Try Again
              </button>
            </div>
          ) : snaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-8">
              <Image size={48} className="text-snapchat-gray-500 mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">No Snaps Available</h3>
              <p className="text-snapchat-gray-400 text-center">
                Take some photos first to share them in chat!
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {snaps.map((snap) => (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnap(snap.id)}
                    className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                      selectedSnap === snap.id
                        ? 'border-snapchat-yellow scale-105'
                        : 'border-transparent hover:border-snapchat-gray-600'
                    }`}
                  >
                    <img
                      src={snap.image_url}
                      alt={snap.caption || 'Snap'}
                      className="w-full h-32 object-cover"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex flex-col justify-between p-2">
                      {/* Expiry Timer */}
                      <div className="flex items-center space-x-1 bg-black bg-opacity-60 rounded-full px-2 py-1 self-start">
                        <Clock size={12} className="text-white" />
                        <span className="text-white text-xs">{getTimeUntilExpiry(snap.expires_at)}</span>
                      </div>

                      {/* Created Time */}
                      <div className="text-white text-xs bg-black bg-opacity-60 rounded px-2 py-1 self-end">
                        {formatTimeAgo(snap.created_at)}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {selectedSnap === snap.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-snapchat-yellow rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-black rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Caption Input & Send Button */}
        {selectedSnap && (
          <div className="p-4 border-t border-snapchat-gray-800">
            <div className="mb-3">
              <input
                type="text"
                placeholder="Add a caption (optional)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-3 bg-snapchat-gray-800 text-white rounded-full border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
                maxLength={500}
              />
            </div>
            
            <button
              onClick={handleSendSnap}
              disabled={sending}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-snapchat-blue hover:bg-blue-600 disabled:bg-snapchat-gray-700 text-white rounded-full font-medium transition-colors"
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Send Snap</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
