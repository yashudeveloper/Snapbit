import React from 'react'
import { X, Target, Dumbbell, Apple, Brain, BookOpen, Users, Palette, Heart, Plus } from 'lucide-react'
import { Habit } from '../lib/supabase'

interface HabitSelectorProps {
  habits: Habit[]
  selectedHabit: string | null
  onSelect: (habitId: string) => void
  onClose: () => void
}

const categoryIcons = {
  fitness: Dumbbell,
  nutrition: Apple,
  mindfulness: Brain,
  productivity: Target,
  learning: BookOpen,
  social: Users,
  creativity: Palette,
  health: Heart,
  custom: Plus
}

const categoryColors = {
  fitness: 'bg-red-500',
  nutrition: 'bg-green-500',
  mindfulness: 'bg-purple-500',
  productivity: 'bg-blue-500',
  learning: 'bg-yellow-500',
  social: 'bg-pink-500',
  creativity: 'bg-indigo-500',
  health: 'bg-emerald-500',
  custom: 'bg-gray-500'
}

export default function HabitSelector({ habits, selectedHabit, onSelect, onClose }: HabitSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-snapchat-gray-900 rounded-t-3xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-snapchat-gray-800">
          <h2 className="text-xl font-bold text-white">Choose a Habit</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-snapchat-gray-800 text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Habits List */}
        <div className="max-h-96 overflow-y-auto p-6 space-y-3">
          {habits.length === 0 ? (
            <div className="text-center py-8">
              <Target size={48} className="mx-auto text-snapchat-gray-500 mb-4" />
              <p className="text-snapchat-gray-400 text-lg mb-2">No habits yet</p>
              <p className="text-snapchat-gray-500 text-sm">
                Create your first habit to start tracking!
              </p>
            </div>
          ) : (
            habits.map((habit) => {
              const IconComponent = categoryIcons[habit.category] || Target
              const colorClass = categoryColors[habit.category] || 'bg-gray-500'
              const isSelected = selectedHabit === habit.id

              return (
                <button
                  key={habit.id}
                  onClick={() => onSelect(habit.id)}
                  className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-snapchat-yellow text-black'
                      : 'bg-snapchat-gray-800 text-white hover:bg-snapchat-gray-700'
                  }`}
                >
                  <div className={`p-3 rounded-full ${isSelected ? 'bg-black/20' : colorClass}`}>
                    <IconComponent 
                      size={20} 
                      className={isSelected ? 'text-black' : 'text-white'} 
                    />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-lg">{habit.title}</h3>
                    {habit.description && (
                      <p className={`text-sm ${
                        isSelected ? 'text-black/70' : 'text-snapchat-gray-400'
                      }`}>
                        {habit.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isSelected 
                          ? 'bg-black/20 text-black' 
                          : 'bg-snapchat-gray-700 text-snapchat-gray-300'
                      }`}>
                        {habit.category === 'custom' ? habit.custom_category : habit.category}
                      </span>
                      <span className={`text-xs ${
                        isSelected ? 'text-black/70' : 'text-snapchat-gray-400'
                      }`}>
                        {habit.target_frequency}x daily
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="p-2 rounded-full bg-black/20">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-snapchat-gray-800">
          <button
            onClick={() => {/* Navigate to create habit */}}
            className="w-full flex items-center justify-center space-x-2 p-4 rounded-2xl border-2 border-dashed border-snapchat-gray-600 text-snapchat-gray-400 hover:border-snapchat-yellow hover:text-snapchat-yellow transition-colors"
          >
            <Plus size={20} />
            <span className="font-medium">Create New Habit</span>
          </button>
        </div>
      </div>
    </div>
  )
}
