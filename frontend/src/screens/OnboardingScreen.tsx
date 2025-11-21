import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ChevronRight, Calendar, MapPin, ArrowLeft, Check, X, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Toast from '../components/Toast'
import { apiClient } from '../lib/api'

interface OnboardingData {
  // Step 1: Account Setup
  name: string
  username: string
  email: string
  password: string
  
  // Step 2: Personal Details
  dateOfBirth: string
  gender: 'male' | 'female' | 'other' | ''
  
  // Step 3: Habit Selection
  selectedHabit: string
  
  // Step 4: Profile Completion
  occupation: string
  location: string
}

const HABIT_OPTIONS = [
  'Coding',
  'Fitness', 
  'Reading',
  'Meditation',
  'Content Creation',
  'Language Learning'
]

const OCCUPATION_OPTIONS = [
  'Student',
  'Software Engineer',
  'Designer',
  'Teacher',
  'Entrepreneur',
  'Healthcare Worker',
  'Other'
]

interface OnboardingScreenProps {
  onBack?: () => void
}

export default function OnboardingScreen({ onBack }: OnboardingScreenProps) {
  const { signUp, loading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle')
  const [data, setData] = useState<OnboardingData>({
    name: '',
    username: '',
    email: '',
    password: '',
    dateOfBirth: '',
    gender: '',
    selectedHabit: '',
    occupation: 'Student',
    location: ''
  })

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
    
    // Auto-generate username from name if name field changes
    if (field === 'name' && !data.username) {
      const generatedUsername = value.toLowerCase().replace(/[^a-z0-9]/g, '')
      setData(prev => ({ ...prev, username: generatedUsername }))
      if (generatedUsername.length >= 3) {
        checkUsernameAvailability(generatedUsername)
      }
    }
    
    // Check username availability when username changes
    if (field === 'username' && value.length >= 3) {
      checkUsernameAvailability(value)
    }
  }

  // Debounced username availability check
  const checkUsernameAvailability = React.useCallback(
    debounce(async (username: string) => {
      if (username.length < 3) {
        setUsernameStatus('idle')
        return
      }

      setUsernameStatus('checking')
      try {
        console.log('🔍 Checking username availability:', username)
        const response = await apiClient.get<{ available: boolean; message?: string }>(`/profiles/username-available/${username}`)
        console.log('✅ Username check response:', response)
        setUsernameStatus(response.available ? 'available' : 'taken')
      } catch (error) {
        console.error('❌ Error checking username:', error)
        setUsernameStatus('error')
        // Don't show toast - error will be shown below the field
      }
    }, 300),
    []
  )

  // Debounce helper function
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
    let timeout: NodeJS.Timeout
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const validateCurrentStep = (): boolean => {
    setError('')
    
    switch (currentStep) {
      case 1:
        if (!data.name.trim()) {
          setError('Name is required')
          return false
        }
        if (!data.username.trim()) {
          setError('Username is required')
          return false
        }
        if (data.username.length < 3) {
          setError('Username must be at least 3 characters')
          return false
        }
        if (usernameStatus === 'taken') {
          setError('Username is already taken')
          return false
        }
        if (!data.email.trim()) {
          setError('Email is required')
          return false
        }
        if (!data.password || data.password.length < 6) {
          setError('Password must be at least 6 characters')
          return false
        }
        return true
        
      case 2:
        if (!data.dateOfBirth) {
          setError('Date of birth is required')
          return false
        }
        if (!data.gender) {
          setError('Please select your gender')
          return false
        }
        return true
        
      case 3:
        if (!data.selectedHabit) {
          setError('Please select a habit to track')
          return false
        }
        return true
        
      case 4:
        if (!data.location.trim()) {
          setError('Location is required')
          return false
        }
        return true
        
      default:
        return true
    }
  }

  const handleFinish = async () => {
    if (!validateCurrentStep()) return
    
    console.log('🚀 Starting signup process...', {
      email: data.email,
      username: data.username,
      name: data.name
    })
    
    setToast({ message: '⏳ Creating your account...', type: 'info' })
    
    try {
      const { error } = await signUp(
        data.email,
        data.password,
        data.username, // Use the username from the form
        data.name,
        {
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          occupation: data.occupation,
          location: data.location,
          selectedHabit: data.selectedHabit
        }
      )
      
      if (error) {
        console.error('❌ Signup error:', error)
        let errorMessage = error.message || 'Failed to create account'
        
        // Make error messages more user-friendly
        if (errorMessage.includes('already')) {
          errorMessage = '❌ This email or username is already registered. Please try logging in or use different credentials.'
        } else if (errorMessage.includes('Invalid')) {
          errorMessage = '❌ Please check your information and try again.'
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorMessage = '❌ Network error. Please check your connection and try again.'
        } else {
          errorMessage = `❌ ${errorMessage}`
        }
        
        setError(errorMessage)
        setToast({ message: errorMessage, type: 'error' })
      } else {
        console.log('✅ Signup successful!')
        // Success! Add vibration feedback and excitement
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }
        setToast({ message: '🎉 Account created successfully! Welcome to SnapHabit!', type: 'success' })
        // Wait a bit to show the success message before redirect
        setTimeout(() => {
          console.log('✅ Redirecting to app...')
        }, 2000) // Increased from 1500ms to 2000ms to ensure visibility
      }
    } catch (err: any) {
      console.error('💥 Signup exception:', err)
      let errorMessage = err.message || 'Something went wrong'
      
      // Make error messages more user-friendly
      if (errorMessage.includes('already')) {
        errorMessage = '❌ This email or username is already registered. Please try logging in.'
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = '❌ Network error. Please check your connection and try again.'
      } else {
        errorMessage = `❌ ${errorMessage}`
      }
      
      setError(errorMessage)
      setToast({ message: errorMessage, type: 'error' })
    }
  }

  const ProgressDots = () => (
    <div className="flex justify-center space-x-3 mb-12">
      {[1, 2, 3, 4].map((step) => (
        <div
          key={step}
          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
            step === currentStep 
              ? 'bg-snapchat-yellow' 
              : step < currentStep 
                ? 'bg-snapchat-yellow/60' 
                : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">CREATE ACCOUNT</h2>
            
            {/* Name Field */}
            <div>
              <input
                type="text"
                placeholder="Name"
                value={data.name}
                onChange={(e) => updateData('name', e.target.value)}
                className="w-full px-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors placeholder-gray-400"
                maxLength={50}
              />
            </div>
            
            {/* Username Field with Availability Check */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Username"
                  value={data.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                    updateData('username', value)
                  }}
                  className={`w-full px-6 py-4 pr-12 bg-white/10 text-white rounded-2xl border transition-colors placeholder-gray-400 focus:outline-none ${
                    usernameStatus === 'available' ? 'border-green-500' :
                    usernameStatus === 'taken' ? 'border-red-500' :
                    'border-gray-600 focus:border-snapchat-yellow'
                  }`}
                  maxLength={30}
                  minLength={3}
                />
                {/* Username Status Indicator */}
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check className="w-6 h-6 text-green-500" />
                  )}
                  {usernameStatus === 'taken' && (
                    <X className="w-6 h-6 text-red-500" />
                  )}
                  {usernameStatus === 'error' && (
                    <X className="w-6 h-6 text-orange-500" />
                  )}
                </div>
              </div>
              {/* Username Feedback - Compact, no extra space */}
              {data.username.length > 0 && (
                <div className="mt-2 px-2">
                  {data.username.length < 3 ? (
                    <p className="text-xs text-gray-400">
                      Username must be at least 3 characters
                    </p>
                  ) : usernameStatus === 'available' ? (
                    <p className="text-sm text-green-500 font-medium">
                      ✓ Username is available
                    </p>
                  ) : usernameStatus === 'taken' ? (
                    <p className="text-sm text-red-500 font-medium">
                      ✗ Username is already taken
                    </p>
                  ) : usernameStatus === 'error' ? (
                    <p className="text-sm text-orange-500 font-medium">
                      ⚠️ Could not check availability. Please try again.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            
            {/* Email Field */}
            <div>
              <input
                type="email"
                placeholder="Email"
                value={data.email}
                onChange={(e) => updateData('email', e.target.value)}
                className="w-full px-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors placeholder-gray-400"
              />
            </div>
            
            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={data.password}
                onChange={(e) => updateData('password', e.target.value)}
                className="w-full px-6 py-4 pr-12 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors placeholder-gray-400"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </motion.div>
        )
        
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">ABOUT YOU</h2>
            
            <div className="relative">
              <Calendar size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={data.dateOfBirth}
                onChange={(e) => updateData('dateOfBirth', e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors"
              />
            </div>
            
            <div className="space-y-4">
              <p className="text-white text-lg font-medium">Gender:</p>
              <div className="flex flex-col space-y-3">
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={option.value}
                      checked={data.gender === option.value}
                      onChange={(e) => updateData('gender', e.target.value)}
                      className="w-5 h-5 text-snapchat-yellow bg-transparent border-2 border-gray-600 focus:ring-snapchat-yellow focus:ring-2"
                    />
                    <span className="text-white text-lg">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )
        
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">SELECT YOUR HABIT</h2>
            
            <div className="space-y-4">
              {HABIT_OPTIONS.map((habit) => (
                <label key={habit} className="flex items-center space-x-3 cursor-pointer p-4 rounded-2xl border border-gray-600 hover:border-snapchat-yellow/50 transition-colors">
                  <input
                    type="radio"
                    name="habit"
                    value={habit}
                    checked={data.selectedHabit === habit}
                    onChange={(e) => updateData('selectedHabit', e.target.value)}
                    className="w-5 h-5 text-snapchat-yellow bg-transparent border-2 border-gray-600 focus:ring-snapchat-yellow focus:ring-2"
                  />
                  <span className="text-white text-lg">{habit}</span>
                </label>
              ))}
            </div>
            
            <p className="text-gray-400 text-sm text-center mt-6">
              * Only ONE habit can be selected at signup.
            </p>
          </motion.div>
        )
        
      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">FINAL STEP: YOUR PROFILE</h2>
            
            <div>
              <select
                value={data.occupation}
                onChange={(e) => updateData('occupation', e.target.value)}
                className="w-full px-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors"
              >
                {OCCUPATION_OPTIONS.map((occupation) => (
                  <option key={occupation} value={occupation} className="bg-gray-800">
                    {occupation}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <MapPin size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="City, Country"
                value={data.location}
                onChange={(e) => updateData('location', e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors placeholder-gray-400"
                maxLength={100}
              />
            </div>
          </motion.div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="w-full h-full bg-black flex flex-col pb-safe">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Back Button */}
      {onBack && currentStep === 1 && (
        <div className="absolute top-8 left-8 z-10">
          <button
            onClick={onBack}
            className="p-2 text-white hover:text-snapchat-yellow transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
      )}
      
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-snapchat-yellow flex items-center justify-center mb-4 mx-auto">
            <div className="w-12 h-12 rounded-full border-4 border-black flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-black"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center">SnapHabit</h1>
        </div>

        {/* Progress Dots */}
        <ProgressDots />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl max-w-sm w-full"
          >
            <p className="text-red-400 text-sm text-center">{error}</p>
          </motion.div>
        )}

        {/* Next/Finish Button */}
        <motion.button
          onClick={currentStep === 4 ? handleFinish : nextStep}
          disabled={loading}
          className="mt-8 px-8 py-4 bg-snapchat-yellow text-black font-bold rounded-2xl flex items-center space-x-2 active:scale-95 transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.95 }}
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <span>Creating Account...</span>
            </div>
          ) : (
            <>
              <span>{currentStep === 4 ? 'Finish & Start' : 'Next'}</span>
              {currentStep < 4 && <ChevronRight size={20} />}
            </>
          )}
        </motion.button>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-gray-500 text-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
