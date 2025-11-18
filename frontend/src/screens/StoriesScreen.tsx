import React, { useState } from 'react'
import { Search, Plus, Clock, Eye } from 'lucide-react'
import { useHabits } from '../contexts/HabitsContext'
import { useAuth } from '../contexts/AuthContext'

export default function StoriesScreen() {
  const { snaps, habits } = useHabits()
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  // Group snaps by habit for story-like display
  const storiesByHabit = habits.reduce((acc, habit) => {
    const habitSnaps = snaps.filter(snap => 
      snap.habit_id === habit.id && 
      snap.status === 'approved' &&
      habit.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    if (habitSnaps.length > 0) {
      acc[habit.id] = {
        habit,
        snaps: habitSnaps.slice(0, 10) // Limit to recent 10 snaps
      }
    }
    
    return acc
  }, {} as Record<string, { habit: any; snaps: any[] }>)

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Stories</h1>
            <button className="p-2 rounded-full bg-snapchat-gray-800 text-white">
              <Plus size={20} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400" />
            <input
              type="text"
              placeholder="Search habits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-snapchat-gray-800 text-white rounded-full border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.keys(storiesByHabit).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Eye size={48} className="text-snapchat-gray-500 mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">
              {searchQuery ? 'No stories found' : 'No stories yet'}
            </h3>
            <p className="text-snapchat-gray-400 text-center">
              {searchQuery 
                ? 'Try searching for a different habit'
                : 'Complete habits to create your first story!'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {Object.values(storiesByHabit).map(({ habit, snaps }) => (
              <div
                key={habit.id}
                className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-snapchat-gray-800 group cursor-pointer"
              >
                {/* Background Image (latest snap) */}
                {snaps[0]?.image_url && (
                  <img
                    src={snaps[0].image_url}
                    alt={habit.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                
                {/* Story Indicators */}
                <div className="absolute top-4 left-4 right-4 flex space-x-1">
                  {snaps.slice(0, 5).map((_, index) => (
                    <div
                      key={index}
                      className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                    >
                      <div className="w-full h-full bg-white rounded-full" />
                    </div>
                  ))}
                </div>

                {/* Habit Info */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-lg mb-1 text-shadow">
                    {habit.title}
                  </h3>
                  <div className="flex items-center space-x-3 text-white/80 text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{snaps.length} snaps</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye size={14} />
                      <span>
                        {new Date(snaps[0]?.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-snapchat-yellow/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
