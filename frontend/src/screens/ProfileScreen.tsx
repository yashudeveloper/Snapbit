import React, { useState, useRef } from 'react'
import { Settings, Trophy, Target, Calendar, Share, LogOut, Edit3, Check, X, Loader, Camera } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHabits } from '../contexts/HabitsContext'
import Toast from '../components/Toast'
import { apiClient } from '../lib/api'

export default function ProfileScreen() {
  const { profile, signOut, updateProfile } = useAuth()
  const { habits, snaps } = useHabits()
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    displayName: profile?.display_name || '',
    username: profile?.username || '',
    avatarUrl: profile?.avatar_url || '',
    dateOfBirth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
    occupation: profile?.occupation || '',
    location: profile?.location || ''
  })
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!profile) return null

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditData({ ...editData, avatarUrl: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  // Check username availability (debounced)
  const checkUsernameAvailability = async (username: string) => {
    if (username === profile.username || username.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    try {
      const response = await apiClient.get<{ available: boolean }>(`/profiles/username-available/${username}`)
      setUsernameStatus(response.available ? 'available' : 'taken')
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameStatus('idle')
    }
  }

  const handleSaveProfile = async () => {
    if (usernameStatus === 'taken') {
      setToast({ message: 'Username is already taken', type: 'error' })
      return
    }

    setIsSaving(true)
    try {
      const { error } = await updateProfile({
        display_name: editData.displayName,
        username: editData.username.toLowerCase(),
        avatar_url: editData.avatarUrl,
        date_of_birth: editData.dateOfBirth,
        gender: editData.gender as 'male' | 'female' | 'other' | undefined,
        occupation: editData.occupation,
        location: editData.location
      })

      if (error) {
        setToast({ message: error.message || 'Failed to update profile', type: 'error' })
      } else {
        setToast({ message: '✅ Profile updated successfully!', type: 'success' })
        setIsEditing(false)
      }
    } catch (error: any) {
      setToast({ message: error?.message || 'Failed to update profile', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditData({
      displayName: profile.display_name,
      username: profile.username,
      avatarUrl: profile.avatar_url || '',
      dateOfBirth: profile.date_of_birth || '',
      gender: profile.gender || '',
      occupation: profile.occupation || '',
      location: profile.location || ''
    })
    setIsEditing(false)
    setUsernameStatus('idle')
  }

  const approvedSnaps = snaps.filter(snap => snap.status === 'approved')
  const totalHabits = habits.length

  const stats = [
    { label: 'Snap Score', value: profile.snap_score, icon: Trophy, color: 'text-snapchat-yellow' },
    { label: 'Current Streak', value: profile.current_streak, icon: Target, color: 'text-snapchat-green' },
    { label: 'Longest Streak', value: profile.longest_streak, icon: Calendar, color: 'text-snapchat-blue' },
    { label: 'Total Habits', value: totalHabits, icon: Target, color: 'text-snapchat-purple' },
  ]

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Profile</h1>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors"
                  aria-label="Cancel editing"
                >
                  <X size={20} />
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving || usernameStatus === 'taken'}
                  className="p-2 rounded-full bg-snapchat-yellow text-black hover:bg-yellow-400 transition-colors disabled:opacity-50"
                  aria-label="Save changes"
                >
                  {isSaving ? <Loader size={20} className="animate-spin" /> : <Check size={20} />}
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors"
                aria-label="Open settings"
              >
                <Settings size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Profile Header */}
        <div className="p-4 sm:p-6 text-center border-b border-snapchat-gray-800">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-snapchat-yellow flex items-center justify-center overflow-hidden">
              {(isEditing ? editData.avatarUrl : profile.avatar_url) ? (
                <img
                  src={isEditing ? editData.avatarUrl : profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-black font-bold text-xl sm:text-2xl">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isEditing ? (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-2 rounded-full bg-snapchat-yellow text-black hover:bg-yellow-400 transition-colors shadow-lg"
                  aria-label="Change profile picture"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-snapchat-blue text-white hover:bg-blue-500 transition-colors"
                aria-label="Edit profile"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>

          {/* Name & Username - Editable */}
          {isEditing ? (
            <div className="space-y-3 max-w-sm mx-auto">
              {/* Display Name */}
              <input
                type="text"
                value={editData.displayName}
                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                className="w-full px-4 py-2 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none text-center font-bold text-lg sm:text-xl"
                placeholder="Display Name"
                maxLength={50}
              />
              
              {/* Username */}
              <div className="relative">
                <input
                  type="text"
                  value={editData.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                    setEditData({ ...editData, username: value })
                    if (value.length >= 3) {
                      checkUsernameAvailability(value)
                    }
                  }}
                  className="w-full px-4 py-2 pr-10 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none text-center"
                  placeholder="username"
                  maxLength={30}
                  minLength={3}
                />
                {/* Username Status Indicator */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {usernameStatus === 'taken' && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              {usernameStatus === 'taken' && (
                <p className="text-xs text-red-500">Username is already taken</p>
              )}
              
              {/* Date of Birth */}
              <input
                type="date"
                value={editData.dateOfBirth}
                onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none text-center"
                placeholder="Date of Birth"
              />
              
              {/* Gender */}
              <select
                value={editData.gender}
                onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                className="w-full px-4 py-2 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none text-center"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              
              {/* Occupation */}
              <select
                value={editData.occupation}
                onChange={(e) => setEditData({ ...editData, occupation: e.target.value })}
                className="w-full px-4 py-2 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none text-center"
              >
                <option value="">Select Occupation</option>
                <option value="Student">Student</option>
                <option value="Software Engineer">Software Engineer</option>
                <option value="Designer">Designer</option>
                <option value="Teacher">Teacher</option>
                <option value="Entrepreneur">Entrepreneur</option>
                <option value="Healthcare Worker">Healthcare Worker</option>
                <option value="Other">Other</option>
              </select>
              
              {/* Location */}
              <input
                type="text"
                value={editData.location}
                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                className="w-full px-4 py-2 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none text-center"
                placeholder="Location"
                maxLength={100}
              />
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{profile.display_name}</h2>
              <p className="text-snapchat-gray-400 mb-2">@{profile.username}</p>
              {/* Show additional profile info */}
              <div className="text-xs sm:text-sm text-snapchat-gray-500 space-y-1">
                {profile.occupation && <p>{profile.occupation}</p>}
                {profile.location && <p>📍 {profile.location}</p>}
              </div>
            </>
          )}

          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex justify-center space-x-3 mt-4">
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 sm:px-6 py-2 bg-snapchat-yellow text-black font-semibold rounded-full hover:bg-yellow-400 transition-colors text-sm sm:text-base"
              >
                Edit Profile
              </button>
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${profile.display_name} on SnapHabit`,
                      text: `Check out ${profile.display_name}'s profile on SnapHabit!`,
                      url: window.location.href
                    }).catch(err => console.log('Error sharing:', err))
                  } else {
                    // Fallback: copy profile URL to clipboard
                    navigator.clipboard.writeText(window.location.href)
                    setToast({ message: 'Profile link copied to clipboard!', type: 'success' })
                  }
                }}
                className="p-2 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors" 
                aria-label="Share profile"
              >
                <Share size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="p-4 sm:p-6 border-b border-snapchat-gray-800">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Statistics</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {stats.map((stat) => {
              const IconComponent = stat.icon
              return (
                <div
                  key={stat.label}
                  className="bg-snapchat-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover:bg-snapchat-gray-700 transition-colors"
                >
                  <IconComponent size={20} className={`mx-auto mb-2 ${stat.color} sm:w-6 sm:h-6`} />
                  <div className="text-xl sm:text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-snapchat-gray-400 text-xs sm:text-sm">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-4 sm:p-6 pb-8">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Recent Activity</h3>
          {approvedSnaps.length === 0 ? (
            <div className="text-center py-8">
              <Target size={40} className="mx-auto text-snapchat-gray-500 mb-4 sm:w-12 sm:h-12" />
              <p className="text-snapchat-gray-400 text-sm sm:text-base">No snaps yet</p>
              <p className="text-snapchat-gray-500 text-xs sm:text-sm">Start tracking habits to see your progress!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 pb-4">
              {approvedSnaps.slice(0, 9).map((snap) => (
                <div
                  key={snap.id}
                  className="aspect-square rounded-xl overflow-hidden bg-snapchat-gray-800 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <img
                    src={snap.image_url}
                    alt="Snap"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="w-full max-w-md bg-snapchat-gray-900 rounded-3xl animate-slide-up flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Sticky */}
            <div className="flex items-center justify-between p-4 border-b border-snapchat-gray-800 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors"
                aria-label="Close settings"
              >
                <X size={20} />
              </button>
            </div>

            {/* Settings Options - Scrollable */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <button 
                onClick={() => {
                  setShowSettings(false)
                  setIsEditing(true)
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors active:scale-95"
              >
                <Edit3 size={18} className="flex-shrink-0" />
                <span className="text-sm text-left">Edit Profile</span>
              </button>
              
              <button 
                onClick={() => {
                  setToast({ message: 'Privacy settings coming soon!', type: 'info' })
                  setShowSettings(false)
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors active:scale-95"
              >
                <Settings size={18} className="flex-shrink-0" />
                <span className="text-sm text-left">Privacy Settings</span>
              </button>
              
              <button 
                onClick={() => {
                  setShowSettings(false)
                  navigate('/habits')
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700 transition-colors active:scale-95"
              >
                <Target size={18} className="flex-shrink-0" />
                <span className="text-sm text-left">Habit Settings</span>
              </button>
              
              {/* Sign Out Button - Inside scroll area */}
              <button
                onClick={async () => {
                  try {
                    await signOut()
                    setShowSettings(false)
                    setToast({ message: '👋 Signed out successfully!', type: 'success' })
                  } catch (error) {
                    setToast({ message: 'Failed to sign out', type: 'error' })
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-red-500/20 text-red-400 border-2 border-red-500/50 hover:bg-red-500/30 hover:border-red-500 transition-all active:scale-95 font-semibold text-sm"
              >
                <LogOut size={18} className="flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
