import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Camera as CameraIcon, FlipHorizontal, Flashlight, X, Check, RotateCcw } from 'lucide-react'
import { useHabits } from '../contexts/HabitsContext'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'
import { useChatRoom } from '../contexts/ChatRoomContext'
import { apiClient } from '../lib/api'
import SnapPreview from '../components/SnapPreview'

export default function CameraScreen() {
  const { habits, createSnap } = useHabits()
  const { profile } = useAuth()
  const { fetchChatRooms } = useChat()
  const { setChatRoomOpen } = useChatRoom()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [createdSnapId, setCreatedSnapId] = useState<string | null>(null)
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null)
  const [defaultHabitId, setDefaultHabitId] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [facingMode])

  useEffect(() => {
    fetchDefaultHabit()
  }, [])

  // Fallback to first habit if no default habit is set and habits are available
  useEffect(() => {
    if (!selectedHabit && !defaultHabitId && habits.length > 0) {
      console.log('⚠️ No default habit, using first available:', habits[0].id)
      setDefaultHabitId(habits[0].id)
      setSelectedHabit(habits[0].id)
    }
  }, [habits, selectedHabit, defaultHabitId])

  const fetchDefaultHabit = async () => {
    try {
      console.log('🎯 Fetching default habit...')
      const response = await apiClient.get<{ habit: any }>('/profiles/me/default-habit')
      if (response.habit) {
        console.log('✅ Default habit found:', response.habit.id)
        setDefaultHabitId(response.habit.id)
        setSelectedHabit(response.habit.id)
      }
    } catch (error) {
      console.error('❌ Failed to fetch default habit:', error)
      // Fallback to first habit if available
      if (habits.length > 0) {
        console.log('⚠️ Using first available habit as fallback:', habits[0].id)
        setDefaultHabitId(habits[0].id)
        setSelectedHabit(habits[0].id)
      } else {
        console.warn('⚠️ No habits available!')
      }
    }
  }

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: false
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      // Handle camera permission denied
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Apply flash effect
    if (flashEnabled) {
      document.body.style.backgroundColor = 'white'
      setTimeout(() => {
        document.body.style.backgroundColor = 'black'
      }, 100)
    }

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob and create URL
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob)
        setCapturedImage(imageUrl)
        setCapturedBlob(blob)
        stopCamera()
        // Don't show habit selector - go directly to preview
        // Hide bottom navigation when snap is captured
        setChatRoomOpen(true)
      }
    }, 'image/jpeg', 0.9)
  }, [flashEnabled, setChatRoomOpen])

  const retakePhoto = () => {
    setCapturedImage(null)
    setCapturedBlob(null)
    setCreatedSnapId(null)
    setSelectedHabit(defaultHabitId)
    // Show bottom navigation when returning to camera
    setChatRoomOpen(false)
    startCamera()
  }

  const submitSnap = async (selectedFriendIds: string[]) => {
    if (!capturedBlob) {
      console.error('Missing captured image')
      alert('No image captured. Please try again.')
      return
    }

    // Use selectedHabit, defaultHabitId, or first available habit (optional)
    const habitToUse = selectedHabit || defaultHabitId || (habits.length > 0 ? habits[0].id : null)
    
    console.log('📸 Submitting snap', habitToUse ? `with habit: ${habitToUse}` : 'without habit (backend will use default)')
    setIsSubmitting(true)
    
    try {
      // Step 1: Create snap with image upload to backend
      const formData = new FormData()
      formData.append('image', capturedBlob, 'snap.jpg')
      
      // Only add habitId if we have one, otherwise backend will use default from user's signup
      if (habitToUse) {
        formData.append('habitId', habitToUse)
      }
      
      formData.append('caption', '') // Caption can be added later if needed

      console.log('📤 Uploading snap to backend...')
      const createResponse = await apiClient.upload<{ snap: { id: string } }>('/snaps', formData)
      
      if (!createResponse.snap?.id) {
        throw new Error('Failed to create snap')
      }

      const snapId = createResponse.snap.id
      console.log('✅ Snap created:', snapId)

      // Step 2: Send snap to selected friends
      if (selectedFriendIds.length > 0) {
        console.log('📨 Sending snap to friends:', selectedFriendIds)
        const sendResponse = await apiClient.post<{
          success: boolean
          sent: number
          failed: number
          scoreIncrease: number
          newSnapScore: number
        }>(`/snaps/${snapId}/send`, {
          friendIds: selectedFriendIds
        })
        console.log('✅ Snap sent:', sendResponse)
        
        // Step 3: Refresh chat rooms to get updated rooms with friend details
        console.log('🔄 Refreshing chat rooms after snap send...')
        await fetchChatRooms()
        console.log('✅ Chat rooms refreshed!')
        
        // Step 4: Show success message with snap score and streak updates
        const { sent, scoreIncrease, newSnapScore, results } = sendResponse
        
        // Check for streak increases
        const streakIncreases = results?.filter((r: any) => r.streak?.increased) || []
        
        let message = `🎉 Snap sent to ${sent} friend${sent === 1 ? '' : 's'}!`
        
        if (scoreIncrease && scoreIncrease > 0) {
          console.log(`🏆 Snap score increased by ${scoreIncrease}! New score: ${newSnapScore}`)
          message += `\n🏆 +${scoreIncrease} Snap Score!`
          message += `\n📊 Total Score: ${newSnapScore}`
        }
        
        if (streakIncreases.length > 0) {
          console.log(`🔥 ${streakIncreases.length} streak(s) increased!`)
          streakIncreases.forEach((result: any) => {
            message += `\n🔥 Streak: ${result.streak.current} days!`
          })
        }
        
        alert(message)
      } else {
        alert('Snap created! Select friends to send it.')
      }

      // Success - reset state and return to camera
      setCapturedImage(null)
      setCapturedBlob(null)
      setCreatedSnapId(null)
      setSelectedHabit(defaultHabitId)
      setChatRoomOpen(false)
      startCamera()
    } catch (error) {
      console.error('Error submitting snap:', error)
      alert('Failed to send snap. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  if (capturedImage) {
    return (
      <SnapPreview
        imageUrl={capturedImage}
        selectedHabit={selectedHabit}
        habits={habits}
        onHabitSelect={setSelectedHabit}
        onRetake={retakePhoto}
        onSubmit={submitSnap}
        isSubmitting={isSubmitting}
      />
    )
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Canvas for capturing */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* Top UI */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-top">
        <div className="flex items-center justify-between p-4">
          {/* Flash Toggle */}
          <button
            onClick={() => setFlashEnabled(!flashEnabled)}
            className={`p-3 rounded-full transition-colors ${
              flashEnabled 
                ? 'bg-snapchat-yellow text-black' 
                : 'bg-black/30 text-white'
            }`}
          >
            <Flashlight size={20} />
          </button>

          {/* Streak Display */}
          {profile && (
            <div className="bg-black/50 rounded-full px-4 py-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-snapchat-yellow rounded-full"></div>
              <span className="text-white font-semibold text-sm">
                {profile.current_streak} day streak
              </span>
            </div>
          )}

          {/* Camera Switch */}
          <button
            onClick={switchCamera}
            className="p-3 rounded-full bg-black/30 text-white"
          >
            <FlipHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Bottom UI */}
      <div className="absolute bottom-0 left-0 right-0 z-10 safe-area-bottom">
        <div className="flex items-center justify-center pb-32 px-8">
          {/* Capture Button */}
          <button
            onClick={capturePhoto}
            disabled={!stream}
            className="capture-button"
          >
            <CameraIcon size={32} className="text-white" />
          </button>
        </div>
      </div>

    </div>
  )
}