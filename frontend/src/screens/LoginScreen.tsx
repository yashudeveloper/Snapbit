import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import OnboardingScreen from './OnboardingScreen'
import Toast from '../components/Toast'

export default function LoginScreen() {
  const { signIn, loading } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Show onboarding screen if user wants to sign up
  if (showOnboarding) {
    return <OnboardingScreen onBack={() => setShowOnboarding(false)} />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    console.log('🔐 Attempting login with:', formData.emailOrUsername)

    const { error } = await signIn(formData.emailOrUsername, formData.password)
      
    if (error) {
      console.error('❌ Login failed:', error)
      let errorMessage = 'Failed to sign in. Please check your credentials.'
      
      // Parse error message
      if (error.message.includes('Invalid')) {
        errorMessage = '❌ Invalid username/email or password. Please try again.'
      } else if (error.message.includes('not found')) {
        errorMessage = '❌ Account not found. Please check your username/email.'
      } else if (error.message) {
        errorMessage = `❌ ${error.message}`
      }
      
      setError(errorMessage)
      setToast({ message: errorMessage, type: 'error' })
    } else {
      console.log('✅ Login successful!')
      setToast({ message: '✨ Welcome back! Successfully signed in!', type: 'success' })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

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
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8">
        {/* Logo - Centered */}
        <div className="mb-8 sm:mb-12 flex flex-col items-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-snapchat-yellow flex items-center justify-center mb-4 sm:mb-6 mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-black flex items-center justify-center">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black"></div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">SnapHabit</h1>
          <p className="text-snapchat-gray-400 text-center mt-2 text-sm sm:text-base px-4">
            AI-powered habit tracking through snaps
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          {/* Email or Username */}
          <div className="relative">
            <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-snapchat-gray-400" />
            <input
              type="text"
              placeholder="Email or Username"
              value={formData.emailOrUsername}
              onChange={(e) => handleInputChange('emailOrUsername', e.target.value)}
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
