import React, { useState } from 'react'
import { Settings, Trophy, Target, Calendar, Share, LogOut, Edit3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHabits } from '../contexts/HabitsContext'

export default function ProfileScreen() {
  const { profile, signOut } = useAuth()
  const { habits, snaps, streaks } = useHabits()
  const [showSettings, setShowSettings] = useState(false)

  if (!profile) return null

  const approvedSnaps = snaps.filter(snap => snap.status === 'approved')
  const totalHabits = habits.length
  const activeStreaks = habits.filter(habit => {
    const todayStreak = streaks.find(s => 
      s.habit_id === habit.id && 
      s.date === new Date().toISOString().split('T')[0] &&
      s.completed
    )
    return todayStreak
  }).length

  const stats = [
    { label: 'Snap Score', value: profile.snap_score, icon: Trophy, color: 'text-snapchat-yellow' },
    { label: 'Current Streak', value: profile.current_streak, icon: Target, color: 'text-snapchat-green' },
    { label: 'Longest Streak', value: profile.longest_streak, icon: Calendar, color: 'text-snapchat-blue' },
    { label: 'Total Habits', value: totalHabits, icon: Target, color: 'text-snapchat-purple' },
  ]

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full bg-snapchat-gray-800 text-white"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="p-6 text-center border-b border-snapchat-gray-800">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-snapchat-yellow flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-black font-bold text-2xl">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 p-2 rounded-full bg-snapchat-blue text-white">
              <Edit3 size={14} />
            </button>
          </div>

          {/* Name & Username */}
          <h2 className="text-2xl font-bold text-white mb-1">{profile.display_name}</h2>
          <p className="text-snapchat-gray-400 mb-4">@{profile.username}</p>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            <button className="px-6 py-2 bg-snapchat-yellow text-black font-semibold rounded-full">
              Edit Profile
            </button>
            <button className="p-2 rounded-full bg-snapchat-gray-800 text-white">
              <Share size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 border-b border-snapchat-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => {
              const IconComponent = stat.icon
              return (
                <div
                  key={stat.label}
                  className="bg-snapchat-gray-800 rounded-2xl p-4 text-center"
                >
                  <IconComponent size={24} className={`mx-auto mb-2 ${stat.color}`} />
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-snapchat-gray-400 text-sm">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          {approvedSnaps.length === 0 ? (
            <div className="text-center py-8">
              <Target size={48} className="mx-auto text-snapchat-gray-500 mb-4" />
              <p className="text-snapchat-gray-400">No snaps yet</p>
              <p className="text-snapchat-gray-500 text-sm">Start tracking habits to see your progress!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {approvedSnaps.slice(0, 9).map((snap) => (
                <div
                  key={snap.id}
                  className="aspect-square rounded-xl overflow-hidden bg-snapchat-gray-800"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-snapchat-gray-900 rounded-t-3xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-snapchat-gray-800">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full bg-snapchat-gray-800 text-white"
              >
                ×
              </button>
            </div>

            {/* Settings Options */}
            <div className="p-6 space-y-4">
              <button className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-snapchat-gray-800 text-white">
                <Edit3 size={20} />
                <span>Edit Profile</span>
              </button>
              
              <button className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-snapchat-gray-800 text-white">
                <Settings size={20} />
                <span>Privacy Settings</span>
              </button>
              
              <button className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-snapchat-gray-800 text-white">
                <Target size={20} />
                <span>Habit Settings</span>
              </button>
              
              <button
                onClick={signOut}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
