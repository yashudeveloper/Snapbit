import React, { useState } from 'react'
import { Plus, Target, Edit3, Trash2, Calendar, TrendingUp } from 'lucide-react'
import { useHabits } from '../contexts/HabitsContext'

export default function HabitsScreen() {
  const { habits, loading, createHabit, updateHabit, deleteHabit } = useHabits()
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-white">My Habits</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 rounded-full bg-snapchat-yellow text-black"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Target size={64} className="text-snapchat-gray-500 mb-6" />
            <h2 className="text-xl font-bold text-white mb-4">No habits yet</h2>
            <p className="text-snapchat-gray-400 text-center mb-6">
              Create your first habit to start tracking your progress with AI-powered snaps!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-snapchat-yellow text-black font-semibold rounded-full"
            >
              Create Your First Habit
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="bg-snapchat-gray-800 rounded-2xl p-6 border border-snapchat-gray-700"
              >
                {/* Habit Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{habit.title}</h3>
                    {habit.description && (
                      <p className="text-snapchat-gray-400 text-sm mb-2">{habit.description}</p>
                    )}
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 bg-snapchat-gray-700 text-snapchat-gray-300 text-xs rounded-full">
                        {habit.category === 'custom' ? habit.custom_category : habit.category}
                      </span>
                      <span className="text-snapchat-gray-400 text-xs">
                        {habit.target_frequency}x daily
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="p-2 rounded-full bg-snapchat-gray-700 text-snapchat-gray-300 hover:text-white">
                      <Edit3 size={16} />
                    </button>
                    <button className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Habit Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-snapchat-gray-700">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">7</div>
                    <div className="text-xs text-snapchat-gray-400">Current Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">15</div>
                    <div className="text-xs text-snapchat-gray-400">Best Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">89%</div>
                    <div className="text-xs text-snapchat-gray-400">Success Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Habit Modal */}
      {showCreateModal && (
        <CreateHabitModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createHabit}
        />
      )}
    </div>
  )
}

interface CreateHabitModalProps {
  onClose: () => void
  onCreate: (habit: any) => Promise<{ error?: any }>
}

function CreateHabitModal({ onClose, onCreate }: CreateHabitModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'fitness' as const,
    custom_category: '',
    target_frequency: 1
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = [
    { key: 'fitness', label: 'Fitness', icon: '💪' },
    { key: 'nutrition', label: 'Nutrition', icon: '🥗' },
    { key: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
    { key: 'productivity', label: 'Productivity', icon: '⚡' },
    { key: 'learning', label: 'Learning', icon: '📚' },
    { key: 'social', label: 'Social', icon: '👥' },
    { key: 'creativity', label: 'Creativity', icon: '🎨' },
    { key: 'health', label: 'Health', icon: '❤️' },
    { key: 'custom', label: 'Custom', icon: '✨' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) return
    if (formData.category === 'custom' && !formData.custom_category.trim()) return

    setIsSubmitting(true)
    
    try {
      const { error } = await onCreate({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        custom_category: formData.category === 'custom' ? formData.custom_category.trim() : null,
        target_frequency: formData.target_frequency,
        is_active: true
      })

      if (!error) {
        onClose()
      }
    } catch (error) {
      console.error('Error creating habit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-snapchat-gray-900 rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-snapchat-gray-800">
          <h2 className="text-xl font-bold text-white">Create New Habit</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-snapchat-gray-800 text-white"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-white font-medium mb-2">Habit Title</label>
            <input
              type="text"
              placeholder="e.g., Morning Workout"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-white font-medium mb-2">Description (Optional)</label>
            <textarea
              placeholder="Describe your habit..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors resize-none"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-white font-medium mb-3">Category</label>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: category.key as any }))}
                  className={`p-3 rounded-xl border transition-colors ${
                    formData.category === category.key
                      ? 'border-snapchat-yellow bg-snapchat-yellow/20 text-snapchat-yellow'
                      : 'border-snapchat-gray-700 bg-snapchat-gray-800 text-white hover:border-snapchat-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-xs font-medium">{category.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Category */}
          {formData.category === 'custom' && (
            <div>
              <label className="block text-white font-medium mb-2">Custom Category</label>
              <input
                type="text"
                placeholder="e.g., Music Practice"
                value={formData.custom_category}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_category: e.target.value }))}
                className="w-full px-4 py-3 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
                maxLength={50}
                required
              />
            </div>
          )}

          {/* Target Frequency */}
          <div>
            <label className="block text-white font-medium mb-2">Target Frequency</label>
            <select
              value={formData.target_frequency}
              onChange={(e) => setFormData(prev => ({ ...prev, target_frequency: parseInt(e.target.value) }))}
              className="w-full px-4 py-3 bg-snapchat-gray-800 text-white rounded-xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
            >
              <option value={1}>Once per day</option>
              <option value={2}>Twice per day</option>
              <option value={3}>Three times per day</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!formData.title.trim() || isSubmitting}
            className="w-full py-4 bg-snapchat-yellow text-black font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isSubmitting ? 'Creating...' : 'Create Habit'}
          </button>
        </form>
      </div>
    </div>
  )
}
