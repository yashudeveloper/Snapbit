import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import OnboardingScreen from './OnboardingScreen'

export default function LoginScreen() {
  const { signIn, loading } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')

  // Show onboarding screen if user wants to sign up
  if (showOnboarding) {
    return <OnboardingScreen onBack={() => setShowOnboarding(false)} />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

      const { error } = await signIn(formData.email, formData.password)
      
      if (error) {
        setError(error.message || 'Failed to sign in')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="mb-12">
          <div className="w-24 h-24 rounded-full bg-snapchat-yellow flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-black"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white text-center">SnapHabit</h1>
          <p className="text-snapchat-gray-400 text-center mt-2">
            AI-powered habit tracking through snaps
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-snapchat-gray-800 text-white rounded-2xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
              required
            />
          </div>


          {/* Password */}
          <div className="relative">
            <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-snapchat-gray-800 text-white rounded-2xl border border-snapchat-gray-700 focus:border-snapchat-yellow focus:outline-none transition-colors"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-snapchat-yellow text-black font-semibold rounded-2xl active:scale-95 transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Toggle Sign Up/Sign In */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setShowOnboarding(true)
              setError('')
            }}
            className="text-snapchat-gray-400 hover:text-white transition-colors"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-8 text-center">
        <p className="text-snapchat-gray-500 text-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
